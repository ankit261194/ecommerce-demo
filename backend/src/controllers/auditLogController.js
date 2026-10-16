const AuditLog = require('../models/AuditLog');
const { recordAuditLog } = require('../utils/auditLogger');

// @desc    Get activity audit logs with filters, pagination and summary metrics
// @route   GET /api/admin/audit-logs
// @access  Private (Super Admin, Admin)
exports.getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;

    const { module, status, severity, search, action, startDate, endDate, performerEmail } = req.query;
    let query = {};

    if (module && module !== 'ALL') {
      query.module = module.toUpperCase();
    }
    if (status && status !== 'ALL') {
      query.status = status.toUpperCase();
    }
    if (severity && severity !== 'ALL') {
      query.severity = severity.toUpperCase();
    }
    if (action && action !== 'ALL') {
      query.action = action.toUpperCase();
    }
    if (performerEmail) {
      query.userEmail = { $regex: performerEmail.trim(), $options: 'i' };
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Full-text / Multi-field search
    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { description: { $regex: s, $options: 'i' } },
        { changeSummary: { $regex: s, $options: 'i' } },
        { userName: { $regex: s, $options: 'i' } },
        { userEmail: { $regex: s, $options: 'i' } },
        { action: { $regex: s, $options: 'i' } },
        { targetId: { $regex: s, $options: 'i' } },
        { ipAddress: { $regex: s, $options: 'i' } },
      ];
    }

    const [logs, total, totalAllEvents, warningEvents, criticalEvents] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(query),
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ status: { $in: ['WARNING', 'FAILED'] } }),
      AuditLog.countDocuments({ severity: 'CRITICAL' }),
    ]);

    // Calculate today's events count
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayEvents = await AuditLog.countDocuments({ createdAt: { $gte: startOfToday } });

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit) || 1,
          limit,
        },
        metrics: {
          totalAllEvents,
          todayEvents,
          warningEvents,
          criticalEvents,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Detailed Security Audit Trail Analytics & Top Actors
// @route   GET /api/admin/audit-logs/stats
// @access  Private (Super Admin, Admin)
exports.getAuditLogStats = async (req, res, next) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalEvents,
      todayEvents,
      severityCounts,
      moduleCounts,
      topActions,
      uniqueAdmins,
    ] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ createdAt: { $gte: startOfToday } }),
      AuditLog.aggregate([
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      AuditLog.aggregate([
        { $group: { _id: '$module', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLog.aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      AuditLog.distinct('userEmail'),
    ]);

    const severities = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };
    severityCounts.forEach((s) => {
      if (s._id && severities[s._id] !== undefined) {
        severities[s._id] = s.count;
      }
    });

    res.status(200).json({
      success: true,
      stats: {
        totalEvents,
        todayEvents,
        criticalEvents: severities.CRITICAL,
        highEvents: severities.HIGH,
        mediumEvents: severities.MEDIUM,
        lowEvents: severities.LOW,
        uniqueAdminsCount: uniqueAdmins.length,
        breakdownByModule: moduleCounts.map((m) => ({ module: m._id, count: m.count })),
        topActions: topActions.map((a) => ({ action: a._id, count: a.count })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export Audit Trail to CSV Format
// @route   GET /api/admin/audit-logs/export
// @access  Private (Super Admin)
exports.exportAuditLogs = async (req, res, next) => {
  try {
    const { module, severity, status, startDate, endDate } = req.query;
    let query = {};

    if (module && module !== 'ALL') query.module = module.toUpperCase();
    if (severity && severity !== 'ALL') query.severity = severity.toUpperCase();
    if (status && status !== 'ALL') query.status = status.toUpperCase();

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Fetch up to 2000 most recent logs for export
    const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(2000).lean();

    // Escape CSV cell helper
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      let str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      'Log ID',
      'Timestamp (ISO)',
      'Performer Name',
      'Performer Email',
      'Role',
      'Module',
      'Action',
      'Target Type',
      'Target ID',
      'Description',
      'Change Summary',
      'Previous Value',
      'New Value',
      'IP Address',
      'User Agent',
      'Severity',
      'Status',
    ];

    const rows = logs.map((log) => [
      escapeCsv(log._id),
      escapeCsv(log.createdAt ? new Date(log.createdAt).toISOString() : ''),
      escapeCsv(log.userName),
      escapeCsv(log.userEmail),
      escapeCsv(log.userRole),
      escapeCsv(log.module),
      escapeCsv(log.action),
      escapeCsv(log.targetType),
      escapeCsv(log.targetId),
      escapeCsv(log.description),
      escapeCsv(log.changeSummary),
      escapeCsv(log.previousValue),
      escapeCsv(log.newValue),
      escapeCsv(log.ipAddress),
      escapeCsv(log.userAgent),
      escapeCsv(log.severity),
      escapeCsv(log.status),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="AuraMarket_Security_Audit_Trail_${Date.now()}.csv"`
    );
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

// @desc    Prune / Retention Cleanup for Old Logs (Super Admin Only)
// @route   DELETE /api/admin/audit-logs/prune
// @access  Private (Super Admin)
exports.pruneAuditLogs = async (req, res, next) => {
  try {
    const retentionDays = parseInt(req.body.retentionDays || req.query.retentionDays) || 90;

    // Strict compliance safeguard: Logs cannot be pruned if newer than 30 days
    if (retentionDays < 30) {
      return res.status(400).json({
        success: false,
        message: 'Security compliance violation: Audit logs retention cannot be set to less than 30 days!',
      });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const deleteResult = await AuditLog.deleteMany({
      createdAt: { $lt: cutoffDate },
      // Preserve CRITICAL severity events permanently unless explicitly requested
      severity: { $ne: 'CRITICAL' },
    });

    // Record an audit log entry for this cleanup action
    await recordAuditLog({
      action: 'PRUNE_AUDIT_LOGS',
      module: 'SECURITY',
      req,
      description: `Pruned ${deleteResult.deletedCount} non-critical audit records older than ${retentionDays} days (before ${cutoffDate.toISOString().split('T')[0]})`,
      details: { retentionDays, cutoffDate, deletedCount: deleteResult.deletedCount },
      severity: 'CRITICAL',
    });

    res.status(200).json({
      success: true,
      message: `Successfully pruned ${deleteResult.deletedCount} audit records older than ${retentionDays} days!`,
      deletedCount: deleteResult.deletedCount,
      cutoffDate,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log Custom Administrative / Security Inspection Event
// @route   POST /api/admin/audit-logs/log-custom-event
// @access  Private (Super Admin, Admin)
exports.logCustomEvent = async (req, res, next) => {
  try {
    const { action, module, description, changeSummary, previousValue, newValue, severity, status } = req.body;

    if (!action || !description) {
      return res.status(400).json({
        success: false,
        message: 'Action and description are required for recording an audit event.',
      });
    }

    const entry = await recordAuditLog({
      action,
      module: module || 'SYSTEM',
      req,
      description,
      changeSummary,
      previousValue,
      newValue,
      severity,
      status: status || 'SUCCESS',
    });

    res.status(201).json({
      success: true,
      message: 'Audit event recorded successfully in immutable log trail!',
      log: entry,
    });
  } catch (error) {
    next(error);
  }
};
