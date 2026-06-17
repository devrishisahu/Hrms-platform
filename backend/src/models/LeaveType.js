const mongoose = require('mongoose');

// PRD 6.4 — leave types + policy in one place (casual, sick, earned, LOP, custom…).
const leaveTypeSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true }, // CL, SL, EL, LOP…
    annualQuota: { type: Number, default: 12 },
    accrualFrequency: { type: String, enum: ['yearly', 'monthly'], default: 'yearly' },
    carryForwardLimit: { type: Number, default: 0 },
    maxConsecutiveDays: { type: Number, default: 0 }, // 0 = no limit
    noticeDays: { type: Number, default: 0 },
    isPaid: { type: Boolean, default: true },
    isLOP: { type: Boolean, default: false }, // loss-of-pay → feeds payroll
    allowHalfDay: { type: Boolean, default: true },
  },
  { timestamps: true }
);

leaveTypeSchema.index({ tenantId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('LeaveType', leaveTypeSchema);
