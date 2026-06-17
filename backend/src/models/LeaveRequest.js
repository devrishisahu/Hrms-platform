const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    leaveType: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
    from: { type: String, required: true },  // "YYYY-MM-DD"
    to: { type: String, required: true },
    isHalfDay: { type: Boolean, default: false },
    days: { type: Number, required: true }, // working days excluding weekly offs & holidays
    reason: { type: String, required: [true, 'Reason is required'] },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
    approver: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    approverComment: String,
    actedAt: Date,
    isLOP: { type: Boolean, default: false }, // PRD: LOP days feed payroll
  },
  { timestamps: true }
);

leaveRequestSchema.index({ tenantId: 1, employee: 1, status: 1 });
leaveRequestSchema.index({ tenantId: 1, status: 1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
