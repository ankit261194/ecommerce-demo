const AuditLog = require('../models/AuditLog');

/**
 * Automatically determine security severity based on action keywords
 */
const inferSeverity = (action = '', status = 'SUCCESS') => {
  if (status === 'FAILED') return 'HIGH';
  const act = action.toUpperCase();
  if (
    act.includes('DELETE') ||
    act.includes('MAINTENANCE') ||
    act.includes('SUSPEND') ||
    act.includes('PRUNE') ||
    act.includes('KEY_REGEN') ||
    act.includes('SECURITY_BREACH')
  ) {
    return 'CRITICAL';
  }
  if (
    act.includes('PRICE') ||
    act.includes('GATEWAY') ||
    act.includes('SETTINGS') ||
    act.includes('PAYOUT') ||
    act.includes('TAX') ||
    act.includes('COURIER') ||
    act.includes('STATUS_CHANGE') ||
    act.includes('PASSWORD')
  ) {
    return 'HIGH';
  }
  if (
    act.includes('UPDATE') ||
    act.includes('CREATE') ||
    act.includes('ASSIGN') ||
    act.includes('DISPATCH') ||
    act.includes('AWB')
  ) {
    return 'MEDIUM';
  }
  return 'LOW';
};

/**
 * Record an administrative activity or critical security event with audit trail
 * @param {Object} options
 */
const recordAuditLog = async ({
  action,
  module = 'SYSTEM',
  req = null,
  user = null,
  targetId = '',
  targetType = '',
  description = '',
  changeSummary = '',
  previousValue = null,
  newValue = null,
  details = {},
  severity = null,
  status = 'SUCCESS',
}) => {
  try {
    const actor = user || req?.user || null;
    const ip =
      req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req?.socket?.remoteAddress ||
      req?.ip ||
      '127.0.0.1';
    const userAgent = req?.headers?.['user-agent'] || 'Platform Management Client / API';

    const computedSeverity = severity || inferSeverity(action, status);

    const logEntry = await AuditLog.create({
      action: String(action || 'UNKNOWN_ACTION').toUpperCase(),
      module: String(module || 'SYSTEM').toUpperCase(),
      performedBy: actor?._id || null,
      userName: actor?.name || 'Super Admin',
      userEmail: actor?.email || 'admin@auramarket.com',
      userRole: actor?.role || 'superadmin',
      targetId: String(targetId || ''),
      targetType: String(targetType || ''),
      description: description || action,
      changeSummary: changeSummary || (previousValue && newValue ? 'Modified state properties' : ''),
      previousValue,
      newValue,
      details: details || {},
      ipAddress: String(ip),
      userAgent: String(userAgent),
      severity: computedSeverity,
      status,
    });

    return logEntry;
  } catch (error) {
    // Non-blocking fallback
    console.warn('[AuditLogger] Failed to record audit log:', error.message);
    return null;
  }
};

module.exports = { recordAuditLog, inferSeverity };
