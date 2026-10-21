const FraudIncident = require('../models/FraudIncident');
const FraudRule = require('../models/FraudRule');
const FraudConfig = require('../models/FraudConfig');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const fraudService = require('../services/fraudDetectionService');

/**
 * Run pre-flight risk evaluation preview for checkout
 * POST /api/fraud/evaluate-preview
 */
const evaluatePreview = async (req, res) => {
  try {
    const { orderData = {} } = req.body;
    const user = req.user;

    const evaluation = await fraudService.evaluateOrderRisk({
      user,
      orderData,
      req,
    });

    res.json({
      success: true,
      data: evaluation,
    });
  } catch (err) {
    console.error('Error evaluating fraud preview:', err);
    res.status(500).json({ success: false, message: err.message || 'Fraud evaluation failed' });
  }
};

/**
 * Super Admin Fraud Analytics & Threat Intelligence Dashboard
 * GET /api/admin/fraud/dashboard
 */
const getFraudDashboard = async (req, res) => {
  try {
    const [
      totalScanned,
      pendingReviewCount,
      confirmedFraudCount,
      falsePositiveCount,
      shadowBannedUsersCount,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      recentIncidents,
      topRules,
    ] = await Promise.all([
      FraudIncident.countDocuments(),
      FraudIncident.countDocuments({ 'resolution.status': 'PENDING_REVIEW' }),
      FraudIncident.countDocuments({ 'resolution.status': 'CONFIRMED_FRAUD' }),
      FraudIncident.countDocuments({ 'resolution.status': 'FALSE_POSITIVE' }),
      User.countDocuments({ isShadowBanned: true }),
      FraudIncident.countDocuments({ riskLevel: 'CRITICAL' }),
      FraudIncident.countDocuments({ riskLevel: 'HIGH' }),
      FraudIncident.countDocuments({ riskLevel: 'MEDIUM' }),
      FraudIncident.countDocuments({ riskLevel: 'LOW' }),
      FraudIncident.find()
        .populate('user', 'name email phone isShadowBanned')
        .sort({ createdAt: -1 })
        .limit(10),
      FraudRule.find().sort({ triggersCount: -1 }).limit(6),
    ]);

    // Calculate estimated fraud loss averted (sum of cartAmount of blocked/high-risk orders)
    const lossAgg = await FraudIncident.aggregate([
      {
        $match: {
          riskLevel: { $in: ['HIGH', 'CRITICAL'] },
        },
      },
      {
        $group: {
          _id: null,
          totalAverted: { $sum: '$cartAmount' },
        },
      },
    ]);
    const estimatedLossAverted = lossAgg[0]?.totalAverted || 0;

    res.json({
      success: true,
      data: {
        kpis: {
          totalScanned,
          pendingReviewCount,
          confirmedFraudCount,
          falsePositiveCount,
          shadowBannedUsersCount,
          blockedAttacksCount: criticalCount,
          estimatedLossAverted,
        },
        riskDistribution: {
          critical: criticalCount,
          high: highCount,
          medium: mediumCount,
          low: lowCount,
        },
        topRules,
        recentIncidents,
      },
    });
  } catch (err) {
    console.error('Error fetching fraud dashboard:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch dashboard' });
  }
};

/**
 * List paginated fraud incidents with multi-facet filters
 * GET /api/admin/fraud/incidents
 */
const getFraudIncidents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      riskLevel,
      status,
      actionTaken,
      search,
    } = req.query;

    const query = {};
    if (riskLevel && riskLevel !== 'ALL') query.riskLevel = riskLevel;
    if (status && status !== 'ALL') query['resolution.status'] = status;
    if (actionTaken && actionTaken !== 'ALL') query.actionTaken = actionTaken;

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { incidentNumber: searchRegex },
        { ipAddress: searchRegex },
        { deviceId: searchRegex },
        { 'geolocation.ipCity': searchRegex },
        { 'geolocation.shippingCity': searchRegex },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [incidents, total] = await Promise.all([
      FraudIncident.find(query)
        .populate('user', 'name email phone isShadowBanned fraudRiskScore')
        .populate('order', 'orderNumber totalPrice paymentMethod status')
        .populate('resolution.resolvedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      FraudIncident.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        incidents,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (err) {
    console.error('Error fetching fraud incidents:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch incidents' });
  }
};

/**
 * Get single fraud incident details
 * GET /api/admin/fraud/incidents/:id
 */
const getFraudIncidentById = async (req, res) => {
  try {
    const incident = await FraudIncident.findById(req.params.id)
      .populate('user', 'name email phone isShadowBanned shadowBanReason fraudRiskScore')
      .populate('order')
      .populate('resolution.resolvedBy', 'name email');

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Fraud incident not found' });
    }

    res.json({
      success: true,
      data: incident,
    });
  } catch (err) {
    console.error('Error fetching fraud incident by id:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch incident' });
  }
};

/**
 * Resolve or update forensic status of an incident
 * POST /api/admin/fraud/incidents/:id/resolve
 */
const resolveFraudIncident = async (req, res) => {
  try {
    const { status, notes, unbanUser = false } = req.body;
    if (!['CONFIRMED_FRAUD', 'FALSE_POSITIVE', 'RESOLVED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be CONFIRMED_FRAUD, FALSE_POSITIVE, or RESOLVED',
      });
    }

    const incident = await FraudIncident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    incident.resolution = {
      status,
      resolvedBy: req.user._id,
      resolvedAt: new Date(),
      resolutionNotes: notes || '',
    };
    await incident.save();

    // If marked FALSE_POSITIVE or requested unban, lift shadow ban
    if ((status === 'FALSE_POSITIVE' || unbanUser) && incident.user) {
      await User.findByIdAndUpdate(incident.user, {
        isShadowBanned: false,
        shadowBanReason: '',
        fraudRiskScore: Math.min(incident.riskScore, 20),
      });
    }

    // If CONFIRMED_FRAUD, ensure user is shadow-banned and device/IP added to blacklist if critical
    if (status === 'CONFIRMED_FRAUD' && incident.user) {
      await User.findByIdAndUpdate(incident.user, {
        isShadowBanned: true,
        shadowBannedAt: new Date(),
        shadowBanReason: `Confirmed fraud on incident ${incident.incidentNumber}: ${notes || 'Malicious activity'}`,
      });
    }

    // Audit Log
    await AuditLog.create({
      action: 'RESOLVE_FRAUD_INCIDENT',
      module: 'FRAUD',
      performedBy: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      description: `Resolved fraud incident ${incident.incidentNumber} as ${status}. Notes: ${notes || 'N/A'}`,
    });

    res.json({
      success: true,
      message: `Incident marked as ${status} successfully`,
      data: incident,
    });
  } catch (err) {
    console.error('Error resolving fraud incident:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to resolve incident' });
  }
};

/**
 * Get all fraud rules
 * GET /api/admin/fraud/rules
 */
const getFraudRules = async (req, res) => {
  try {
    await fraudService.seedDefaultRules();
    const rules = await FraudRule.find().sort({ scoreWeight: -1 });
    res.json({
      success: true,
      data: rules,
    });
  } catch (err) {
    console.error('Error fetching fraud rules:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch rules' });
  }
};

/**
 * Update fraud rule configuration
 * PUT /api/admin/fraud/rules/:id
 */
const updateFraudRule = async (req, res) => {
  try {
    const { scoreWeight, threshold, isEnabled, action, severity } = req.body;
    const rule = await FraudRule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Fraud rule not found' });
    }

    if (scoreWeight !== undefined) rule.scoreWeight = Number(scoreWeight);
    if (threshold !== undefined) rule.threshold = Number(threshold);
    if (isEnabled !== undefined) rule.isEnabled = Boolean(isEnabled);
    if (action !== undefined) rule.action = action;
    if (severity !== undefined) rule.severity = severity;

    await rule.save();

    // Audit Log
    await AuditLog.create({
      action: 'UPDATE_FRAUD_RULE',
      module: 'FRAUD',
      performedBy: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      description: `Updated fraud rule ${rule.code}: weight=${rule.scoreWeight}, enabled=${rule.isEnabled}`,
    });

    res.json({
      success: true,
      message: `Rule ${rule.code} updated successfully`,
      data: rule,
    });
  } catch (err) {
    console.error('Error updating fraud rule:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to update rule' });
  }
};

/**
 * Get system fraud configuration and blacklists
 * GET /api/admin/fraud/settings
 */
const getFraudSettings = async (req, res) => {
  try {
    const config = await fraudService.getFraudConfig();
    res.json({
      success: true,
      data: config,
    });
  } catch (err) {
    console.error('Error fetching fraud settings:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch settings' });
  }
};

/**
 * Update system fraud configuration and blacklists
 * PUT /api/admin/fraud/settings
 */
const updateFraudSettings = async (req, res) => {
  try {
    const { globalThresholds, automatedMitigations, blacklists, whitelists } = req.body;
    const config = await fraudService.getFraudConfig();

    if (globalThresholds) {
      config.globalThresholds = { ...config.globalThresholds.toObject(), ...globalThresholds };
    }
    if (automatedMitigations) {
      config.automatedMitigations = { ...config.automatedMitigations.toObject(), ...automatedMitigations };
    }
    if (blacklists) {
      if (blacklists.ipAddresses) config.blacklists.ipAddresses = blacklists.ipAddresses;
      if (blacklists.deviceIds) config.blacklists.deviceIds = blacklists.deviceIds;
      if (blacklists.disposableEmailDomains) config.blacklists.disposableEmailDomains = blacklists.disposableEmailDomains;
      if (blacklists.blockedPincodes) config.blacklists.blockedPincodes = blacklists.blockedPincodes;
    }
    if (whitelists) {
      if (whitelists.ipAddresses) config.whitelists.ipAddresses = whitelists.ipAddresses;
    }

    await config.save();

    // Audit Log
    await AuditLog.create({
      action: 'UPDATE_FRAUD_SETTINGS',
      module: 'FRAUD',
      performedBy: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      description: 'Updated enterprise fraud detection thresholds and security blacklists.',
    });

    res.json({
      success: true,
      message: 'Fraud detection settings updated successfully',
      data: config,
    });
  } catch (err) {
    console.error('Error updating fraud settings:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to update settings' });
  }
};

/**
 * 1-Click Toggle Shadow Ban on Customer
 * POST /api/admin/fraud/users/:userId/shadow-ban
 */
const toggleShadowBan = async (req, res) => {
  try {
    const { reason = 'Administrative shadow-ban enforced by security team' } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isShadowBanned = !user.isShadowBanned;
    if (user.isShadowBanned) {
      user.shadowBannedAt = new Date();
      user.shadowBanReason = reason;
      user.fraudRiskScore = 95;
    } else {
      user.shadowBanReason = '';
      user.fraudRiskScore = 15;
    }

    await user.save();

    // Audit Log
    await AuditLog.create({
      action: user.isShadowBanned ? 'SHADOW_BAN_USER' : 'UNBAN_USER',
      module: 'FRAUD',
      performedBy: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      description: `${user.isShadowBanned ? 'Shadow-banned' : 'Unbanned'} user ${user.email}. Reason: ${reason}`,
    });

    res.json({
      success: true,
      message: `User ${user.email} is now ${user.isShadowBanned ? 'SHADOW-BANNED' : 'UNBANNED'}`,
      data: {
        userId: user._id,
        isShadowBanned: user.isShadowBanned,
        shadowBanReason: user.shadowBanReason,
      },
    });
  } catch (err) {
    console.error('Error toggling shadow ban:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to toggle shadow ban' });
  }
};

/**
 * Export Fraud Incidents RFC-4180 CSV with UTF-8 BOM
 * GET /api/admin/fraud/export-csv
 */
const exportFraudReportCsv = async (req, res) => {
  try {
    const incidents = await FraudIncident.find()
      .populate('user', 'name email phone')
      .populate('order', 'orderNumber')
      .sort({ createdAt: -1 })
      .limit(1000);

    const headers = [
      'Incident Number',
      'Date & Time',
      'User Name',
      'User Email',
      'Order Number',
      'IP Address',
      'Device ID',
      'Browser',
      'OS',
      'Country',
      'City',
      'Distance (KM)',
      'Risk Score',
      'Risk Level',
      'Action Taken',
      'Resolution Status',
      'Cart Amount (INR)',
      'Triggered Rules',
    ];

    const escapeCsv = field => {
      if (field === null || field === undefined) return '""';
      const str = String(field).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = incidents.map(inc => [
      escapeCsv(inc.incidentNumber),
      escapeCsv(inc.createdAt ? new Date(inc.createdAt).toISOString() : ''),
      escapeCsv(inc.user?.name || 'Guest / Unassigned'),
      escapeCsv(inc.user?.email || 'N/A'),
      escapeCsv(inc.order?.orderNumber || 'N/A'),
      escapeCsv(inc.ipAddress),
      escapeCsv(inc.deviceId),
      escapeCsv(inc.fingerprint?.browser || 'Unknown'),
      escapeCsv(inc.fingerprint?.os || 'Unknown'),
      escapeCsv(inc.geolocation?.ipCountry || 'India'),
      escapeCsv(inc.geolocation?.ipCity || 'N/A'),
      escapeCsv(inc.geolocation?.distanceKm || 0),
      escapeCsv(inc.riskScore),
      escapeCsv(inc.riskLevel),
      escapeCsv(inc.actionTaken),
      escapeCsv(inc.resolution?.status || 'PENDING_REVIEW'),
      escapeCsv(inc.cartAmount || 0),
      escapeCsv((inc.triggeredRules || []).map(r => r.ruleCode).join('; ')),
    ]);

    const csvString = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const csvBuffer = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(csvString, 'utf8')]);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Fraud_Incidents_Report_${Date.now()}.csv"`
    );
    res.status(200).send(csvBuffer);
  } catch (err) {
    console.error('Error exporting fraud CSV:', err);
    res.status(500).json({ success: false, message: 'Failed to export fraud report' });
  }
};

module.exports = {
  evaluatePreview,
  getFraudDashboard,
  getFraudIncidents,
  getFraudIncidentById,
  resolveFraudIncident,
  getFraudRules,
  updateFraudRule,
  getFraudSettings,
  updateFraudSettings,
  toggleShadowBan,
  exportFraudReportCsv,
};
