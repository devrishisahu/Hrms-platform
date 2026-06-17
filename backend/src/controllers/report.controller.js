const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');

const toCSV = (rows) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
};

const maybeCSV = (res, rows, name) => {
  res.header('Content-Type', 'text/csv');
  res.attachment(`${name}.csv`);
  res.send(toCSV(rows));
};

/**
 * GET /api/v1/reports/headcount?format=csv
 * Headcount by department + status breakdown (PRD 6.8).
 */
exports.headcount = asyncHandler(async (req, res) => {
  const byDepartment = await Employee.aggregate([
    { $match: { tenantId: req.tenantId, status: { $ne: 'exited' } } },
    { $lookup: { from: 'departments', localField: 'department', foreignField: '_id', as: 'dept' } },
    { $group: { _id: { $ifNull: [{ $arrayElemAt: ['$dept.name', 0] }, 'Unassigned'] }, count: { $sum: 1 } } },
    { $project: { department: '$_id', count: 1, _id: 0 } },
    { $sort: { count: -1 } },
  ]);
  const byStatus = await Employee.aggregate([
    { $match: { tenantId: req.tenantId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $project: { status: '$_id', count: 1, _id: 0 } },
  ]);

  if (req.query.format === 'csv') return maybeCSV(res, byDepartment, 'headcount');
  res.json({ success: true, data: { byDepartment, byStatus, total: byStatus.reduce((s, x) => s + x.count, 0) } });
});

/**
 * GET /api/v1/reports/attendance-summary?month=YYYY-MM&format=csv
 */
exports.attendanceSummary = asyncHandler(async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const rows = await Attendance.aggregate([
    { $match: { tenantId: req.tenantId, date: { $regex: `^${month}` } } },
    { $group: {
      _id: '$employee',
      present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
      late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
      halfDay: { $sum: { $cond: [{ $eq: ['$status', 'half-day'] }, 1, 0] } },
      absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
      onLeave: { $sum: { $cond: [{ $eq: ['$status', 'on-leave'] }, 1, 0] } },
      overtimeMinutes: { $sum: '$overtimeMinutes' },
    } },
    { $lookup: { from: 'employees', localField: '_id', foreignField: '_id', as: 'emp' } },
    { $unwind: '$emp' },
    { $project: {
      _id: 0,
      employeeId: '$emp.employeeId',
      name: { $concat: ['$emp.firstName', ' ', { $ifNull: ['$emp.lastName', ''] }] },
      present: 1, late: 1, halfDay: 1, absent: 1, onLeave: 1, overtimeMinutes: 1,
    } },
    { $sort: { employeeId: 1 } },
  ]);

  if (req.query.format === 'csv') return maybeCSV(res, rows, `attendance-${month}`);
  res.json({ success: true, data: { rows, month } });
});

/**
 * GET /api/v1/reports/leave-usage?year=&format=csv
 */
exports.leaveUsage = asyncHandler(async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const rows = await LeaveBalance.aggregate([
    { $match: { tenantId: req.tenantId, year } },
    { $lookup: { from: 'employees', localField: 'employee', foreignField: '_id', as: 'emp' } },
    { $lookup: { from: 'leavetypes', localField: 'leaveType', foreignField: '_id', as: 'type' } },
    { $unwind: '$emp' }, { $unwind: '$type' },
    { $project: {
      _id: 0,
      employeeId: '$emp.employeeId',
      name: { $concat: ['$emp.firstName', ' ', { $ifNull: ['$emp.lastName', ''] }] },
      leaveType: '$type.name',
      allocated: 1, used: 1, carriedForward: 1,
      available: { $subtract: [{ $add: ['$allocated', '$carriedForward'] }, '$used'] },
    } },
    { $sort: { employeeId: 1, leaveType: 1 } },
  ]);

  if (req.query.format === 'csv') return maybeCSV(res, rows, `leave-usage-${year}`);
  res.json({ success: true, data: { rows, year } });
});

/**
 * GET /api/v1/reports/lop?month=YYYY-MM — LOP days that feed payroll (PRD 6.4).
 */
exports.lopReport = asyncHandler(async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const requests = await LeaveRequest.find({
    tenantId: req.tenantId, status: 'approved', isLOP: true,
    from: { $regex: `^${month.slice(0, 4)}` },
  }).populate('employee', 'firstName lastName employeeId');

  const rows = requests
    .filter((r) => r.from.startsWith(month) || r.to.startsWith(month))
    .map((r) => ({
      employeeId: r.employee?.employeeId,
      name: `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.trim(),
      from: r.from, to: r.to, lopDays: r.days,
    }));

  if (req.query.format === 'csv') return maybeCSV(res, rows, `lop-${month}`);
  res.json({ success: true, data: { rows, month } });
});

/**
 * GET /api/v1/reports/audit-logs — HR-only view of the immutable trail.
 */
exports.auditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    AuditLog.find({ tenantId: req.tenantId })
      .populate('user', 'email role')
      .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    AuditLog.countDocuments({ tenantId: req.tenantId }),
  ]);
  res.json({ success: true, data: { items, total, page: Number(page), pages: Math.ceil(total / limit) } });
});
