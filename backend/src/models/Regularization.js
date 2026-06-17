const mongoose = require('mongoose');

// PRD 6.3 — employees request corrections for missed/incorrect punches.
const regularizationSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD"
    requestedPunchIn: { type: Date, required: true },
    requestedPunchOut: { type: Date, required: true },
    reason: { type: String, required: [true, 'Reason is required'] },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approver: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    approverComment: String,
    actedAt: Date,
  },
  { timestamps: true }
);

regularizationSchema.index({ tenantId: 1, employee: 1, date: 1 });
regularizationSchema.index({ tenantId: 1, status: 1 });

module.exports = mongoose.model('Regularization', regularizationSchema);
