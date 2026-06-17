const LeaveRequest = require('../models/LeaveRequest');
const Regularization = require('../models/Regularization');
const Employee = require('../models/Employee');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/v1/approvals/pending
 * MSS one-stop inbox (PRD 6.5: a manager can act on all pending team requests
 * from one place). HR sees everything in the tenant.
 */
exports.pendingApprovals = asyncHandler(async (req, res) => {
  let employeeFilter = {};
  if (req.user.role === 'manager') {
    const team = await Employee.find({ tenantId: req.tenantId, reportingManager: req.user.employee }).select('_id');
    employeeFilter = { employee: { $in: team.map((t) => t._id) } };
  }

  const [leaves, regularizations] = await Promise.all([
    LeaveRequest.find({ tenantId: req.tenantId, status: 'pending', ...employeeFilter })
      .populate('employee', 'firstName lastName employeeId')
      .populate('leaveType', 'name code')
      .sort({ createdAt: 1 }),
    Regularization.find({ tenantId: req.tenantId, status: 'pending', ...employeeFilter })
      .populate('employee', 'firstName lastName employeeId')
      .sort({ createdAt: 1 }),
  ]);

  res.json({
    success: true,
    data: {
      leaves, regularizations,
      total: leaves.length + regularizations.length,
    },
  });
});
