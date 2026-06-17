const Attendance = require('../models/Attendance');
const Regularization = require('../models/Regularization');
const Employee = require('../models/Employee');
const Shift = require('../models/Shift');
const Holiday = require('../models/Holiday');
const Tenant = require('../models/Tenant');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const notify = require('../utils/notify');
const User = require('../models/User');

// ---------- helpers ----------

const todayStr = (d = new Date(), timeZone = 'Asia/Kolkata') => {
  const localDateStr = d.toLocaleDateString('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const [m, day, y] = localDateStr.split('/');
  return `${y}-${m}-${day}`;
};

const minutesFromHHmm = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
};

const minutesOfDay = (date, timeZone = 'Asia/Kolkata') => {
  const localStr = date.toLocaleString('en-US', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false });
  const match = localStr.match(/(\d{2}):(\d{2})/);
  if (match) {
    const h = Number(match[1]);
    const m = Number(match[2]);
    return h * 60 + m;
  }
  return date.getUTCHours() * 60 + date.getUTCMinutes();
};

/**
 * PRD 6.3 rules engine: grace period → late mark; beyond threshold → half-day;
 * worked hours decide present/half-day; extra time → overtime.
 */
const computeStatus = ({ shift, punchIn, punchOut, timeZone = 'Asia/Kolkata' }) => {
  const result = { status: 'present', isLate: false, workedMinutes: 0, overtimeMinutes: 0 };
  if (!shift || !punchIn) return result;

  const shiftStart = minutesFromHHmm(shift.startTime);
  const inMins = minutesOfDay(punchIn, timeZone);
  const lateBy = inMins - shiftStart;

  if (lateBy > shift.graceMinutes) result.isLate = true;
  if (lateBy > shift.halfDayAfterMinutes) result.status = 'half-day';
  else if (result.isLate) result.status = 'late';

  if (punchOut) {
    result.workedMinutes = Math.max(0, Math.round((punchOut - punchIn) / 60000));
    const workedHours = result.workedMinutes / 60;
    if (workedHours < shift.minHalfDayHours) result.status = 'absent';
    else if (workedHours < shift.minFullDayHours && result.status !== 'half-day') result.status = 'half-day';
    const expected = shift.minFullDayHours * 60;
    if (result.workedMinutes > expected) result.overtimeMinutes = result.workedMinutes - expected;
  }
  return result;
};

const getEmployeeShift = async (tenantId, employeeId) => {
  const emp = await Employee.findOne({ _id: employeeId, tenantId }).populate('shift');
  if (emp?.shift) return emp.shift;
  return Shift.findOne({ tenantId }); // tenant default
};

// ---------- endpoints ----------

/**
 * POST /api/v1/attendance/punch  Body: { type:'in'|'out', mode?, location?{lat,lng} }
 * Upsert per (employee, day) → bursts of duplicate punches stay idempotent.
 */
exports.punch = asyncHandler(async (req, res) => {
  const { type, mode = 'web', location } = req.body;
  if (!['in', 'out'].includes(type)) throw ApiError.badRequest("type must be 'in' or 'out'");
  if (!req.user.employee) throw ApiError.badRequest('No employee profile linked to this account');

  const tenant = await Tenant.findById(req.tenantId);
  const timeZone = tenant?.settings?.timezone || 'Asia/Kolkata';

  const date = todayStr(new Date(), timeZone);
  const now = new Date();

  let record = await Attendance.findOne({ tenantId: req.tenantId, employee: req.user.employee, date });
  if (!record) {
    record = new Attendance({ tenantId: req.tenantId, employee: req.user.employee, date });
  }

  if (type === 'in') {
    if (record.punchIn) throw ApiError.conflict('Already punched in today');
    if (record.punchOut) throw ApiError.conflict('Already punched out today');
    record.punchIn = now;
  } else {
    if (!record.punchIn) throw ApiError.badRequest('Punch in first');
    if (record.punchOut) throw ApiError.conflict('Already punched out today');
    record.punchOut = now;
  }

  record.punches.push({ type, time: now, mode, location, ip: req.ip });

  const shift = await getEmployeeShift(req.tenantId, req.user.employee);
  Object.assign(record, computeStatus({ shift, punchIn: record.punchIn, punchOut: record.punchOut, timeZone }));
  await record.save();

  res.json({ success: true, message: `Punched ${type}`, data: { attendance: record } });
});

/**
 * GET /api/v1/attendance/my?month=YYYY-MM
 */
exports.myAttendance = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findById(req.tenantId);
  const timeZone = tenant?.settings?.timezone || 'Asia/Kolkata';
  const month = req.query.month || todayStr(new Date(), timeZone).slice(0, 7);
  const records = await Attendance.find({
    tenantId: req.tenantId,
    employee: req.user.employee,
    date: { $regex: `^${month}` },
  }).sort({ date: 1 });

  const summary = records.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
  res.json({ success: true, data: { records, summary, month } });
});

/**
 * GET /api/v1/attendance/team?date=YYYY-MM-DD (manager)  |  /all (HR)
 */
exports.teamAttendance = asyncHandler(async (req, res) => {
  const date = req.query.date || todayStr();
  const team = await Employee.find({ tenantId: req.tenantId, reportingManager: req.user.employee }).select('_id');
  const records = await Attendance.find({ tenantId: req.tenantId, date, employee: { $in: team.map((t) => t._id) } })
    .populate('employee', 'firstName lastName employeeId');
  res.json({ success: true, data: { records, date } });
});

exports.allAttendance = asyncHandler(async (req, res) => {
  const date = req.query.date || todayStr();
  const records = await Attendance.find({ tenantId: req.tenantId, date })
    .populate('employee', 'firstName lastName employeeId department');
  res.json({ success: true, data: { records, date } });
});

/**
 * POST /api/v1/attendance/regularize
 * Body: { date, requestedPunchIn, requestedPunchOut, reason }
 * Window-checked per tenant settings (PRD 6.3 edge case).
 */
exports.requestRegularization = asyncHandler(async (req, res) => {
  const { date, requestedPunchIn, requestedPunchOut, reason } = req.body;
  if (!date || !requestedPunchIn || !requestedPunchOut || !reason) {
    throw ApiError.badRequest('date, requestedPunchIn, requestedPunchOut and reason are required');
  }

  const tenant = await Tenant.findById(req.tenantId);
  const windowDays = tenant?.settings?.regularizationWindowDays ?? 60;
  const ageDays = (Date.now() - new Date(date).getTime()) / 86400000;
  if (ageDays > windowDays) throw ApiError.badRequest(`Regularization window is ${windowDays} days — this date is too old`);
  if (new Date(date) > new Date()) throw ApiError.badRequest('Cannot regularize a future date');

  const reqDoc = await Regularization.create({
    tenantId: req.tenantId,
    employee: req.user.employee,
    date,
    requestedPunchIn,
    requestedPunchOut,
    reason,
  });

  // Notify the reporting manager
  const emp = await Employee.findById(req.user.employee).populate('reportingManager');
  if (emp?.reportingManager) {
    const mgrUser = await User.findOne({ tenantId: req.tenantId, employee: emp.reportingManager._id });
    if (mgrUser) {
      notify({
        tenantId: req.tenantId, user: mgrUser._id, type: 'approval',
        title: 'Regularization request pending',
        message: `${emp.firstName} requested attendance regularization for ${date}.`,
        email: mgrUser.email,
      });
    }
  }

  res.status(201).json({ success: true, message: 'Regularization requested', data: { request: reqDoc } });
});

/**
 * GET /api/v1/attendance/regularizations?status=pending
 * Manager sees own team's; HR sees all.
 */
exports.listRegularizations = asyncHandler(async (req, res) => {
  const { status = 'pending' } = req.query;
  const filter = { tenantId: req.tenantId, status };

  if (req.user.role === 'manager') {
    const team = await Employee.find({ tenantId: req.tenantId, reportingManager: req.user.employee }).select('_id');
    filter.employee = { $in: team.map((t) => t._id) };
  } else if (req.user.role === 'employee') {
    filter.employee = req.user.employee;
  }

  const requests = await Regularization.find(filter)
    .populate('employee', 'firstName lastName employeeId')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: { requests } });
});

/**
 * PATCH /api/v1/attendance/regularizations/:id  Body: { action:'approve'|'reject', comment? }
 * On approval the attendance record is recomputed (PRD 6.3 acceptance criteria).
 */
exports.actOnRegularization = asyncHandler(async (req, res) => {
  const { action, comment = '' } = req.body;
  if (!['approve', 'reject'].includes(action)) throw ApiError.badRequest("action must be 'approve' or 'reject'");

  const reqDoc = await Regularization.findOne({ _id: req.params.id, tenantId: req.tenantId, status: 'pending' });
  if (!reqDoc) throw ApiError.notFound('Pending regularization not found');

  // Authorization: HR or the employee's reporting manager
  if (req.user.role !== 'hr') {
    const emp = await Employee.findById(reqDoc.employee).select('reportingManager');
    if (String(emp?.reportingManager) !== String(req.user.employee)) throw ApiError.forbidden();
  }

  reqDoc.status = action === 'approve' ? 'approved' : 'rejected';
  reqDoc.approver = req.user.employee;
  reqDoc.approverComment = comment;
  reqDoc.actedAt = new Date();
  await reqDoc.save();

  if (action === 'approve') {
    const punchIn = new Date(reqDoc.requestedPunchIn);
    const punchOut = new Date(reqDoc.requestedPunchOut);
    const shift = await getEmployeeShift(req.tenantId, reqDoc.employee);
    const computed = computeStatus({ shift, punchIn, punchOut });

    await Attendance.findOneAndUpdate(
      { tenantId: req.tenantId, employee: reqDoc.employee, date: reqDoc.date },
      {
        $set: { punchIn, punchOut, isRegularized: true, remarks: `Regularized: ${reqDoc.reason}`, ...computed },
        $push: { punches: { type: 'in', time: punchIn, mode: 'regularized' } },
      },
      { upsert: true, new: true }
    );
  }

  const empUser = await User.findOne({ tenantId: req.tenantId, employee: reqDoc.employee });
  if (empUser) {
    notify({
      tenantId: req.tenantId, user: empUser._id,
      type: action === 'approve' ? 'success' : 'warning',
      title: `Regularization ${reqDoc.status}`,
      message: `Your regularization for ${reqDoc.date} was ${reqDoc.status}. ${comment}`,
      email: empUser.email,
    });
  }

  res.json({ success: true, message: `Regularization ${reqDoc.status}`, data: { request: reqDoc } });
});
