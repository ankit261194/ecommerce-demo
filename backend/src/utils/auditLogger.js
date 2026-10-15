const AuditLog = require('../models/AuditLog');

/**
 * Record an administrative activity or critical security event
 * @param {Object} options
 */
const recordAuditLog = async ({
  action,
  module = 'SYSTEM',
  req = null,
  user = null,
  targetId = '',
  targetType = '',
  description,
  details = {},
  status = 'SUCCESS',
}) => {
  try {
    const actor = user || req?.user || null;
    const ip = req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '127.0.0.1';

    await AuditLog.create({
      action,
      module,
      performedBy: actor?._id || null,
      userName: actor?.name || 'System / Automated',
      userEmail: actor?.email || 'system@auramarket.com',
      userRole: actor?.role || 'system',
      targetId: String(targetId || ''),
      targetType: String(targetType || ''),
      description: description || action,
      details,
      ipAddress: String(ip),
      status,
    });
  } catch (error) {
    // Non-blocking fallback
    console.warn('[AuditLogger] Failed to record audit log:', error.message);
  }
};

module.exports = { recordAuditLog };
