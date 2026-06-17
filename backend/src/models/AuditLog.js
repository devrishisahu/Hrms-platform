const mongoose = require('mongoose');

// PRD 6.1 — audit log entries are immutable.
const auditLogSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true }, // LOGIN, LOGIN_FAILED, EMPLOYEE_UPDATED…
    entity: String,
    entityId: mongoose.Schema.Types.ObjectId,
    details: mongoose.Schema.Types.Mixed,
    ip: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ tenantId: 1, createdAt: -1 });

// Immutability: block updates/deletes at the model layer.
const blocked = ['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete'];
blocked.forEach((op) =>
  auditLogSchema.pre(op, function (next) { next(new Error('Audit logs are immutable')); })
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
