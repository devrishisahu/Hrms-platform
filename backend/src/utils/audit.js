const AuditLog = require('../models/AuditLog');

/**
 * Immutable audit trail (PRD 6.1: every login & sensitive action is recorded).
 * Fire-and-forget — auditing must never break the main flow.
 */
const logAudit = async ({ tenantId, user, action, entity, entityId, details, ip }) => {
  try {
    await AuditLog.create({
      tenantId,
      user: user?._id || user || null,
      action,
      entity,
      entityId,
      details,
      ip,
    });
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

module.exports = logAudit;
