const mongoose = require('mongoose');

const leaveBalanceSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    leaveType: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
    year: { type: Number, required: true },
    allocated: { type: Number, default: 0 },
    used: { type: Number, default: 0 },
    carriedForward: { type: Number, default: 0 },
  },
  { timestamps: true }
);

leaveBalanceSchema.virtual('available').get(function () {
  return this.allocated + this.carriedForward - this.used;
});
leaveBalanceSchema.set('toJSON', { virtuals: true });

leaveBalanceSchema.index({ tenantId: 1, employee: 1, leaveType: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('LeaveBalance', leaveBalanceSchema);
