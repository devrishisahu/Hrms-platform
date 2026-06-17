const LeaveType = require('../models/LeaveType');
const LeaveBalance = require('../models/LeaveBalance');
const LeaveRequest = require('../models/LeaveRequest');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Holiday = require('../models/Holiday');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const notify = require('../utils/notify');
const logAudit = require('../utils/audit');

// ---------- helpers ----------

const dateRange = (from, to) => {
  const days = [];
  const d = new Date(from);
  const end = new Date(to);
  while (d <= end) {
    days.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
};

/** Working days = calendar days minus weekly offs and holidays (PRD 6.4). */
const countWorkingDays = async (tenantId, from, to, weeklyOffs = [0, 6]) => {
  const holidays = await Holiday.find({ tenantId, date: { $gte: new Date(from), $lte: new Date(to) } });
  const holidaySet = new Set(holidays.map((h) => h.date.toISOString().slice(0, 10)));
  return dateRange(from, to).filter((d) => {
    const dow = new Date(d).getUTCDay();
    return !weeklyOffs.includes(dow) && !holidaySet.has(d);
  });
};

const getBalance = async (tenantId, employee, leaveType, year) =>
  LeaveBalance.findOneAndUpdate(
    { tenantId, employee, leaveType, year },
    { $setOnInsert: { allocated: (await LeaveType.findById(leaveType))?.annualQuota || 0 } },
    { upsert: true, new: true }
  );

// ---------- leave types (HR) ----------

exports.createLeaveType = asyncHandler(async (req, res) => {
  const type = await LeaveType.create({ ...req.body, tenantId: req.tenantId });
  res.status(201).json({ success: true, message: 'Leave type created', data: type });
});

exports.listLeaveTypes = asyncHandler(async (req, res) => {
  const types = await LeaveType.find({ tenantId: req.tenantId });
  res.json({ success: true, data: types });
});

exports.updateLeaveType = asyncHandler(async (req, res) => {
  delete req.body.tenantId;
  const type = await LeaveType.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId }, req.body, { new: true, runValidators: true });
  if (!type) throw ApiError.notFound('Leave type not found');
  res.json({ success: true, message: 'Leave type updated', data: type });
});

// ---------- balances ----------

exports.myBalances = asyncHandler(async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const types = await LeaveType.find({ tenantId: req.tenantId });
  const balances = [];
  for (const t of types) {
    const b = await getBalance(req.tenantId, req.user.employee, t._id, year);
    balances.push({ ...b.toJSON(), leaveType: t });
  }
  res.json({ success: true, data: { balances, year } });
});

/** HR override (PRD 6.4: HR can override balances when needed) — audit-logged. */
exports.adjustBalance = asyncHandler(async (req, res) => {
  const { employee, leaveType, year = new Date().getFullYear(), allocated, carriedForward } = req.body;
  if (!employee || !leaveType) throw ApiError.badRequest('employee and leaveType are required');

  const balance = await getBalance(req.tenantId, employee, leaveType, year);
  if (allocated !== undefined) balance.allocated = allocated;
  if (carriedForward !== undefined) balance.carriedForward = carriedForward;
  await balance.save();

  await logAudit({ tenantId: req.tenantId, user: req.user, action: 'LEAVE_BALANCE_ADJUSTED',
    entity: 'LeaveBalance', entityId: balance._id, details: req.body, ip: req.ip });
  res.json({ success: true, message: 'Balance adjusted', data: balance });
});

// ---------- requests ----------

/**
 * POST /api/v1/leave/apply
 * Body: { leaveType, from, to, isHalfDay?, reason }
 * Rules: balance check (unless LOP), overlap block, max-consecutive, working-day count.
 */
exports.applyLeave = asyncHandler(async (req, res) => {
  const { leaveType, from, to, isHalfDay = false, reason } = req.body;
  if (!leaveType || !from || !to || !reason) throw ApiError.badRequest('leaveType, from, to and reason are required');
  if (new Date(from) > new Date(to)) throw ApiError.badRequest('from must be on or before to');

  const type = await LeaveType.findOne({ _id: leaveType, tenantId: req.tenantId });
  if (!type) throw ApiError.notFound('Leave type not found');
  if (isHalfDay && !type.allowHalfDay) throw ApiError.badRequest(`${type.name} does not allow half-days`);

  // Overlap block (PRD 6.4 edge case)
  const overlap = await LeaveRequest.findOne({
    tenantId: req.tenantId, employee: req.user.employee,
    status: { $in: ['pending', 'approved'] },
    from: { $lte: to }, to: { $gte: from },
  });
  if (overlap) throw ApiError.conflict(`Overlaps an existing ${overlap.status} leave (${overlap.from} → ${overlap.to})`);

  const workingDays = await countWorkingDays(req.tenantId, from, to);
  if (workingDays.length === 0) throw ApiError.badRequest('Selected range has no working days');
  const days = isHalfDay ? 0.5 : workingDays.length;

  if (type.maxConsecutiveDays > 0 && days > type.maxConsecutiveDays) {
    throw ApiError.badRequest(`${type.name} allows at most ${type.maxConsecutiveDays} consecutive days`);
  }

  // Balance check — LOP types bypass it (PRD: cannot exceed balance unless LOP permitted)
  if (!type.isLOP) {
    const balance = await getBalance(req.tenantId, req.user.employee, type._id, new Date(from).getFullYear());
    const available = balance.allocated + balance.carriedForward - balance.used;
    if (days > available) {
      throw ApiError.badRequest(`Insufficient balance: ${available} day(s) available, ${days} requested. Apply LOP if permitted.`);
    }
  }

  const request = await LeaveRequest.create({
    tenantId: req.tenantId, employee: req.user.employee,
    leaveType, from, to, isHalfDay, days, reason, isLOP: type.isLOP,
  });

  // Route to reporting manager (single-level chain; HR can also act)
  const emp = await Employee.findById(req.user.employee).populate('reportingManager');
  if (emp?.reportingManager) {
    const mgrUser = await User.findOne({ tenantId: req.tenantId, employee: emp.reportingManager._id });
    if (mgrUser) {
      notify({
        tenantId: req.tenantId, user: mgrUser._id, type: 'approval',
        title: 'Leave request pending',
        message: `${emp.firstName} applied for ${type.name}: ${from} → ${to} (${days} day(s)).`,
        email: mgrUser.email,
      });
    }
  }

  res.status(201).json({ success: true, message: 'Leave applied', data: { request } });
});

/**
 * GET /api/v1/leave/my — own history
 */
exports.myLeaves = asyncHandler(async (req, res) => {
  const requests = await LeaveRequest.find({ tenantId: req.tenantId, employee: req.user.employee })
    .populate('leaveType', 'name code isPaid')
    .populate('approver', 'firstName lastName')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: { requests } });
});

/**
 * GET /api/v1/leave/requests?status= — manager: team; HR: all
 */
exports.listRequests = asyncHandler(async (req, res) => {
  const { status = 'pending' } = req.query;
  const filter = { tenantId: req.tenantId, status };

  if (req.user.role === 'manager') {
    const team = await Employee.find({ tenantId: req.tenantId, reportingManager: req.user.employee }).select('_id');
    filter.employee = { $in: team.map((t) => t._id) };
  }

  const requests = await LeaveRequest.find(filter)
    .populate('employee', 'firstName lastName employeeId')
    .populate('leaveType', 'name code')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: { requests } });
});

/**
 * PATCH /api/v1/leave/requests/:id  Body: { action:'approve'|'reject', comment? }
 * Approval updates balance + attendance, and flags LOP for payroll (PRD 6.4).
 */
exports.actOnLeave = asyncHandler(async (req, res) => {
  const { action, comment = '' } = req.body;
  if (!['approve', 'reject'].includes(action)) throw ApiError.badRequest("action must be 'approve' or 'reject'");

  const request = await LeaveRequest.findOne({ _id: req.params.id, tenantId: req.tenantId, status: 'pending' })
    .populate('leaveType');
  if (!request) throw ApiError.notFound('Pending leave request not found');

  if (req.user.role !== 'hr') {
    const emp = await Employee.findById(request.employee).select('reportingManager');
    if (String(emp?.reportingManager) !== String(req.user.employee)) throw ApiError.forbidden();
  }

  request.status = action === 'approve' ? 'approved' : 'rejected';
  request.approver = req.user.employee;
  request.approverComment = comment;
  request.actedAt = new Date();
  await request.save();

  if (action === 'approve') {
    // 1) Deduct balance (skip for LOP)
    if (!request.isLOP) {
      await LeaveBalance.updateOne(
        { tenantId: req.tenantId, employee: request.employee, leaveType: request.leaveType._id, year: new Date(request.from).getFullYear() },
        { $inc: { used: request.days } }
      );
    }
    // 2) Leave–attendance coupling: mark days as on-leave
    const days = await countWorkingDays(req.tenantId, request.from, request.to);
    for (const date of days) {
      await Attendance.findOneAndUpdate(
        { tenantId: req.tenantId, employee: request.employee, date },
        { $set: { status: 'on-leave', remarks: `${request.leaveType.name}${request.isLOP ? ' (LOP — payroll impact)' : ''}` } },
        { upsert: true }
      );
    }
  }

  const empUser = await User.findOne({ tenantId: req.tenantId, employee: request.employee });
  if (empUser) {
    notify({
      tenantId: req.tenantId, user: empUser._id,
      type: action === 'approve' ? 'success' : 'warning',
      title: `Leave ${request.status}`,
      message: `Your ${request.leaveType.name} (${request.from} → ${request.to}) was ${request.status}. ${comment}`,
      email: empUser.email,
    });
  }

  res.json({ success: true, message: `Leave ${request.status}`, data: { request } });
});

/**
 * PATCH /api/v1/leave/requests/:id/cancel
 * Cancelling an approved leave restores the balance (PRD 6.4 acceptance criteria).
 */
exports.cancelLeave = asyncHandler(async (req, res) => {
  const request = await LeaveRequest.findOne({
    _id: req.params.id, tenantId: req.tenantId,
    employee: req.user.employee, status: { $in: ['pending', 'approved'] },
  }).populate('leaveType');
  if (!request) throw ApiError.notFound('Cancellable leave request not found');

  const wasApproved = request.status === 'approved';
  request.status = 'cancelled';
  await request.save();

  if (wasApproved) {
    if (!request.isLOP) {
      await LeaveBalance.updateOne(
        { tenantId: req.tenantId, employee: request.employee, leaveType: request.leaveType._id, year: new Date(request.from).getFullYear() },
        { $inc: { used: -request.days } }
      );
    }
    const days = await countWorkingDays(req.tenantId, request.from, request.to);
    await Attendance.deleteMany({
      tenantId: req.tenantId, employee: request.employee,
      date: { $in: days }, status: 'on-leave', punchIn: { $exists: false },
    });
  }

  res.json({ success: true, message: 'Leave cancelled and balance restored', data: { request } });
});
