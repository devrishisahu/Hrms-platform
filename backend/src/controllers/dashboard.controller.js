const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Regularization = require('../models/Regularization');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/v1/dashboard — role-scoped widgets (PRD 6.5/6.8).
 */
exports.dashboard = asyncHandler(async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const data = { role: req.user.role };

  // Everyone: own attendance today + pending requests
  if (req.user.employee) {
    data.myToday = await Attendance.findOne({ tenantId: req.tenantId, employee: req.user.employee, date: today });
    data.myPendingLeaves = await LeaveRequest.countDocuments({
      tenantId: req.tenantId, employee: req.user.employee, status: 'pending',
    });
  }

  // Manager: team snapshot
  if (['manager', 'hr', 'leadership'].includes(req.user.role)) {
    const team = await Employee.find({ tenantId: req.tenantId, reportingManager: req.user.employee }).select('_id');
    const teamIds = team.map((t) => t._id);
    data.team = {
      size: teamIds.length,
      presentToday: await Attendance.countDocuments({
        tenantId: req.tenantId, date: today, employee: { $in: teamIds },
        status: { $in: ['present', 'late', 'half-day'] },
      }),
      pendingApprovals:
        (await LeaveRequest.countDocuments({ tenantId: req.tenantId, status: 'pending', employee: { $in: teamIds } })) +
        (await Regularization.countDocuments({ tenantId: req.tenantId, status: 'pending', employee: { $in: teamIds } })),
    };
  }

  // HR / Leadership: org-wide numbers
  if (['hr', 'leadership'].includes(req.user.role)) {
    data.org = {
      headcount: await Employee.countDocuments({ tenantId: req.tenantId, status: { $ne: 'exited' } }),
      presentToday: await Attendance.countDocuments({
        tenantId: req.tenantId, date: today, status: { $in: ['present', 'late', 'half-day'] },
      }),
      onLeaveToday: await Attendance.countDocuments({ tenantId: req.tenantId, date: today, status: 'on-leave' }),
      pendingLeaves: await LeaveRequest.countDocuments({ tenantId: req.tenantId, status: 'pending' }),
      onboarding: await Employee.countDocuments({ tenantId: req.tenantId, status: 'onboarding' }),
    };
  }

  res.json({ success: true, data });
});
