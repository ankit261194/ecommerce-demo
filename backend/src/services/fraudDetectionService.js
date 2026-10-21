const crypto = require('crypto');
const FraudIncident = require('../models/FraudIncident');
const FraudRule = require('../models/FraudRule');
const FraudConfig = require('../models/FraudConfig');
const User = require('../models/User');
const Order = require('../models/Order');

const DEFAULT_SYSTEM_RULES = [
  {
    code: 'RULE_IP_BLACKLIST',
    name: 'Blacklisted IP Address',
    description: 'IP address matches an enterprise security blacklist or known botnet.',
    category: 'NETWORK',
    scoreWeight: 85,
    threshold: 1,
    severity: 'CRITICAL',
    action: 'BLOCK_TRANSACTION',
    isEnabled: true,
  },
  {
    code: 'RULE_DEVICE_BLACKLIST',
    name: 'Blacklisted Hardware Device ID',
    description: 'Hardware fingerprint is flagged for repeat payment fraud or scraping.',
    category: 'DEVICE',
    scoreWeight: 90,
    threshold: 1,
    severity: 'CRITICAL',
    action: 'SHADOW_BAN',
    isEnabled: true,
  },
  {
    code: 'RULE_VPN_PROXY',
    name: 'VPN / Proxy / Tor Gateway Detected',
    description: 'Request originated from an anonymous proxy, VPN service, or Tor exit relay.',
    category: 'NETWORK',
    scoreWeight: 35,
    threshold: 1,
    severity: 'HIGH',
    action: 'CHALLENGE_OTP',
    isEnabled: true,
  },
  {
    code: 'RULE_VELOCITY_HOURLY',
    name: 'Hourly Order Velocity Spike',
    description: 'More than 3 orders placed within a 60-minute window from same user/device/IP.',
    category: 'VELOCITY',
    scoreWeight: 40,
    threshold: 3,
    severity: 'HIGH',
    action: 'FORCE_PREPAID',
    isEnabled: true,
  },
  {
    code: 'RULE_VELOCITY_DAILY',
    name: 'Daily Order Velocity Limit',
    description: 'More than 8 orders placed within 24 hours, exceeding normal consumer activity.',
    category: 'VELOCITY',
    scoreWeight: 30,
    threshold: 8,
    severity: 'MEDIUM',
    action: 'FORCE_PREPAID',
    isEnabled: true,
  },
  {
    code: 'RULE_DEVICE_MULTI_ACCOUNT',
    name: 'Device Account Multiplexing',
    description: 'Same browser/device fingerprint used by more than 2 distinct customer accounts.',
    category: 'DEVICE',
    scoreWeight: 45,
    threshold: 2,
    severity: 'HIGH',
    action: 'FORCE_PREPAID',
    isEnabled: true,
  },
  {
    code: 'RULE_GEO_MISMATCH',
    name: 'Extreme Geolocation Mismatch',
    description: 'Distance between client IP location and shipping delivery address exceeds 1,000 km.',
    category: 'GEOLOCATION',
    scoreWeight: 30,
    threshold: 1000,
    severity: 'MEDIUM',
    action: 'CHALLENGE_OTP',
    isEnabled: true,
  },
  {
    code: 'RULE_HIGH_VALUE_FIRST_ORDER',
    name: 'High-Value First Purchase',
    description: 'First order value exceeds ₹15,000 on an unseasoned account with no delivery history.',
    category: 'TRANSACTION',
    scoreWeight: 25,
    threshold: 15000,
    severity: 'MEDIUM',
    action: 'FORCE_PREPAID',
    isEnabled: true,
  },
  {
    code: 'RULE_DISPOSABLE_EMAIL',
    name: 'Disposable / Burner Email Domain',
    description: 'Account registered with a temporary or throwaway email inbox provider.',
    category: 'ACCOUNT',
    scoreWeight: 35,
    threshold: 1,
    severity: 'HIGH',
    action: 'CHALLENGE_OTP',
    isEnabled: true,
  },
  {
    code: 'RULE_SUSPICIOUS_PHONE',
    name: 'Suspicious Phone Pattern',
    description: 'Phone number consists of all identical digits, mock test numbers, or illegal format.',
    category: 'ACCOUNT',
    scoreWeight: 30,
    threshold: 1,
    severity: 'MEDIUM',
    action: 'CHALLENGE_OTP',
    isEnabled: true,
  },
];

/**
 * Ensure default system fraud rules exist
 */
const seedDefaultRules = async () => {
  for (const rule of DEFAULT_SYSTEM_RULES) {
    const existing = await FraudRule.findOne({ code: rule.code });
    if (!existing) {
      await FraudRule.create({ ...rule, isSystemRule: true });
    }
  }
};

/**
 * Get or create singleton FraudConfig
 */
const getFraudConfig = async () => {
  let config = await FraudConfig.findOne({ singletonKey: 'GLOBAL_FRAUD_CONFIG' });
  if (!config) {
    config = await FraudConfig.create({
      singletonKey: 'GLOBAL_FRAUD_CONFIG',
    });
  }
  return config;
};

/**
 * Haversine formula to calculate distance between two coordinates in kilometers
 */
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

/**
 * Extract client hardware, browser, and network fingerprint from incoming request
 */
const extractClientTelemetry = (req = {}) => {
  const headers = req.headers || {};
  
  // Clean client IP extraction
  let rawIp =
    headers['cf-connecting-ip'] ||
    headers['x-client-ip'] ||
    (headers['x-forwarded-for'] ? headers['x-forwarded-for'].split(',')[0].trim() : '') ||
    req.ip ||
    req.socket?.remoteAddress ||
    '127.0.0.1';

  if (rawIp.startsWith('::ffff:')) {
    rawIp = rawIp.replace('::ffff:', '');
  }

  const userAgent = headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0';

  // Device Fingerprint extraction / deterministic hashing
  let deviceId = headers['x-device-fingerprint'] || headers['x-device-id'];
  if (!deviceId) {
    deviceId =
      'DEV-' +
      crypto
        .createHash('sha256')
        .update(`${rawIp}-${userAgent}-${headers['accept-language'] || 'en'}`)
        .digest('hex')
        .substring(0, 16)
        .toUpperCase();
  }

  // Detect VPN / Proxy / Tor signatures
  const vpnHeader = headers['x-vpn-detected'] === 'true' || headers['x-proxy-detected'] === 'true';
  const torHeader = headers['x-tor-node'] === 'true';
  const viaHeader = !!headers['via'] || (headers['forwarded'] && headers['forwarded'].includes('proto'));
  const isVpnOrProxy = vpnHeader || viaHeader || false;

  // Browser & OS parser
  let browser = 'Chrome';
  if (/firefox/i.test(userAgent)) browser = 'Firefox';
  else if (/edg/i.test(userAgent)) browser = 'Edge';
  else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Safari';

  let os = 'Windows';
  if (/macintosh|mac os x/i.test(userAgent)) os = 'macOS';
  else if (/android/i.test(userAgent)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(userAgent)) os = 'iOS';
  else if (/linux/i.test(userAgent)) os = 'Linux';

  let deviceType = 'DESKTOP';
  if (/mobile/i.test(userAgent)) deviceType = 'MOBILE';
  else if (/tablet|ipad/i.test(userAgent)) deviceType = 'TABLET';
  else if (/bot|crawler|spider/i.test(userAgent)) deviceType = 'BOT';

  // Geo-location estimation (Headers or Indian defaults)
  const ipCountry = headers['cf-ipcountry'] || headers['x-country-code'] || 'India';
  const ipCity = headers['x-city'] || 'New Delhi';
  const ipRegion = headers['x-region'] || 'Delhi';
  const ipLat = parseFloat(headers['x-latitude']) || 28.6139;
  const ipLng = parseFloat(headers['x-longitude']) || 77.2090;

  return {
    ipAddress: rawIp,
    deviceId,
    fingerprint: {
      userAgent,
      browser,
      os,
      deviceType,
      screenResolution: headers['x-screen-resolution'] || '1920x1080',
      timezone: headers['x-timezone'] || 'Asia/Kolkata',
      language: headers['accept-language'] ? headers['accept-language'].split(',')[0] : 'en-US',
      canvasHash: headers['x-canvas-hash'] || crypto.createHash('md5').update(deviceId).digest('hex'),
    },
    network: {
      vpnOrProxy: isVpnOrProxy,
      torNode: torHeader,
      datacenterIp: /aws|digitalocean|ovh|google|azure|linode/i.test(headers['x-isp'] || ''),
      isp: headers['x-isp'] || 'Airtel Broadband India',
    },
    geolocation: {
      ipCountry,
      ipCity,
      ipRegion,
      ipLat,
      ipLng,
    },
  };
};

/**
 * Core Fraud Risk Assessment Engine
 * Evaluates orders against dynamic rules, blacklists, velocity metrics, and AI heuristics
 */
const evaluateOrderRisk = async ({ user, orderData = {}, req = {} }) => {
  await seedDefaultRules();
  const config = await getFraudConfig();
  const activeRules = await FraudRule.find({ isEnabled: true });
  const rulesMap = new Map(activeRules.map(r => [r.code, r]));

  const telemetry = extractClientTelemetry(req);
  const triggeredRules = [];
  let calculatedScore = 0;

  const shippingAddress = orderData.shippingAddress || {};
  const cartAmount = orderData.totalAmount || orderData.totalPrice || 0;
  const paymentMethod = orderData.paymentMethod || 'COD';

  // 1. IP Blacklist Rule
  if (config.blacklists.ipAddresses.includes(telemetry.ipAddress)) {
    const rule = rulesMap.get('RULE_IP_BLACKLIST') || DEFAULT_SYSTEM_RULES[0];
    triggeredRules.push({
      ruleCode: rule.code,
      ruleName: rule.name,
      scoreAdded: rule.scoreWeight,
      severity: rule.severity,
      reason: `Client IP ${telemetry.ipAddress} is present in the enterprise blacklist.`,
    });
    calculatedScore += rule.scoreWeight;
  }

  // 2. Device ID Blacklist Rule
  if (config.blacklists.deviceIds.includes(telemetry.deviceId)) {
    const rule = rulesMap.get('RULE_DEVICE_BLACKLIST') || DEFAULT_SYSTEM_RULES[1];
    triggeredRules.push({
      ruleCode: rule.code,
      ruleName: rule.name,
      scoreAdded: rule.scoreWeight,
      severity: rule.severity,
      reason: `Hardware Device ID ${telemetry.deviceId} is blacklisted for fraudulent activity.`,
    });
    calculatedScore += rule.scoreWeight;
  }

  // 3. VPN / Proxy / Tor Detection Rule
  if (telemetry.network.vpnOrProxy || telemetry.network.torNode || telemetry.network.datacenterIp) {
    const rule = rulesMap.get('RULE_VPN_PROXY') || DEFAULT_SYSTEM_RULES[2];
    triggeredRules.push({
      ruleCode: rule.code,
      ruleName: rule.name,
      scoreAdded: rule.scoreWeight,
      severity: rule.severity,
      reason: 'Transaction originated from an anonymous VPN, datacenter proxy, or Tor gateway.',
    });
    calculatedScore += rule.scoreWeight;
  }

  // 4. Velocity Checks (Hourly & Daily)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [ordersLastHour, ordersLastDay] = await Promise.all([
    Order.countDocuments({
      $or: [
        { customer: user?._id },
        { user: user?._id },
        { 'shippingAddress.phone': shippingAddress.phone || user?.phone },
      ],
      createdAt: { $gte: oneHourAgo },
    }),
    Order.countDocuments({
      $or: [
        { customer: user?._id },
        { user: user?._id },
        { 'shippingAddress.phone': shippingAddress.phone || user?.phone },
      ],
      createdAt: { $gte: twentyFourHoursAgo },
    }),
  ]);

  const hourlyRule = rulesMap.get('RULE_VELOCITY_HOURLY') || DEFAULT_SYSTEM_RULES[3];
  if (ordersLastHour >= (hourlyRule.threshold || config.automatedMitigations.maxOrdersPerHour)) {
    triggeredRules.push({
      ruleCode: hourlyRule.code,
      ruleName: hourlyRule.name,
      scoreAdded: hourlyRule.scoreWeight,
      severity: hourlyRule.severity,
      reason: `High velocity burst: ${ordersLastHour} orders placed within the last 60 minutes.`,
    });
    calculatedScore += hourlyRule.scoreWeight;
  }

  const dailyRule = rulesMap.get('RULE_VELOCITY_DAILY') || DEFAULT_SYSTEM_RULES[4];
  if (ordersLastDay >= (dailyRule.threshold || config.automatedMitigations.maxOrdersPerDay)) {
    triggeredRules.push({
      ruleCode: dailyRule.code,
      ruleName: dailyRule.name,
      scoreAdded: dailyRule.scoreWeight,
      severity: dailyRule.severity,
      reason: `Daily quota exceeded: ${ordersLastDay} orders placed within 24 hours.`,
    });
    calculatedScore += dailyRule.scoreWeight;
  }

  // 5. Multi-Account Device Multiplexing
  const distinctAccountsOnDevice = await User.countDocuments({
    deviceFingerprints: telemetry.deviceId,
  });

  const deviceRule = rulesMap.get('RULE_DEVICE_MULTI_ACCOUNT') || DEFAULT_SYSTEM_RULES[5];
  if (distinctAccountsOnDevice >= (deviceRule.threshold || config.automatedMitigations.maxAccountsPerDevice)) {
    triggeredRules.push({
      ruleCode: deviceRule.code,
      ruleName: deviceRule.name,
      scoreAdded: deviceRule.scoreWeight,
      severity: deviceRule.severity,
      reason: `Device fingerprint ${telemetry.deviceId} is linked to ${distinctAccountsOnDevice} separate accounts.`,
    });
    calculatedScore += deviceRule.scoreWeight;
  }

  // 6. Geolocation Mismatch Calculation
  let shippingLat = shippingAddress.coordinates?.lat || 0;
  let shippingLng = shippingAddress.coordinates?.lng || 0;

  // Resolve standard Indian cities if coordinates missing
  if (!shippingLat && shippingAddress.city) {
    const cityLower = (shippingAddress.city || '').toLowerCase();
    if (cityLower.includes('delhi')) { shippingLat = 28.6139; shippingLng = 77.2090; }
    else if (cityLower.includes('mumbai')) { shippingLat = 19.0760; shippingLng = 72.8777; }
    else if (cityLower.includes('bangalore') || cityLower.includes('bengaluru')) { shippingLat = 12.9716; shippingLng = 77.5946; }
    else if (cityLower.includes('chennai')) { shippingLat = 13.0827; shippingLng = 80.2707; }
    else if (cityLower.includes('kolkata')) { shippingLat = 22.5726; shippingLng = 88.3639; }
    else if (cityLower.includes('guwahati')) { shippingLat = 26.1445; shippingLng = 91.7362; }
    else { shippingLat = 28.6139; shippingLng = 77.2090; }
  }

  const distanceKm = calculateDistanceKm(
    telemetry.geolocation.ipLat,
    telemetry.geolocation.ipLng,
    shippingLat,
    shippingLng
  );

  const geoRule = rulesMap.get('RULE_GEO_MISMATCH') || DEFAULT_SYSTEM_RULES[6];
  const isGeoMismatch = distanceKm > (geoRule.threshold || config.automatedMitigations.maxGeoMismatchKm);
  if (isGeoMismatch) {
    triggeredRules.push({
      ruleCode: geoRule.code,
      ruleName: geoRule.name,
      scoreAdded: geoRule.scoreWeight,
      severity: geoRule.severity,
      reason: `Distance of ${distanceKm} km between IP (${telemetry.geolocation.ipCity}) and shipping address (${shippingAddress.city || 'Destination'}) exceeds anomaly threshold.`,
    });
    calculatedScore += geoRule.scoreWeight;
  }

  // 7. High-Value First-Time Order
  const previousDeliveredOrders = user?._id
    ? await Order.countDocuments({ user: user._id, status: 'DELIVERED' })
    : 0;

  const highValueRule = rulesMap.get('RULE_HIGH_VALUE_FIRST_ORDER') || DEFAULT_SYSTEM_RULES[7];
  if (cartAmount >= highValueRule.threshold && previousDeliveredOrders === 0) {
    triggeredRules.push({
      ruleCode: highValueRule.code,
      ruleName: highValueRule.name,
      scoreAdded: highValueRule.scoreWeight,
      severity: highValueRule.severity,
      reason: `First-time purchase value of ₹${cartAmount.toLocaleString('en-IN')} exceeds unseasoned account threshold.`,
    });
    calculatedScore += highValueRule.scoreWeight;
  }

  // 8. Disposable Email Check
  const emailDomain = (user?.email || '').split('@')[1]?.toLowerCase();
  if (emailDomain && config.blacklists.disposableEmailDomains.includes(emailDomain)) {
    const emailRule = rulesMap.get('RULE_DISPOSABLE_EMAIL') || DEFAULT_SYSTEM_RULES[8];
    triggeredRules.push({
      ruleCode: emailRule.code,
      ruleName: emailRule.name,
      scoreAdded: emailRule.scoreWeight,
      severity: emailRule.severity,
      reason: `Customer email domain (@${emailDomain}) is flagged as a disposable inbox provider.`,
    });
    calculatedScore += emailRule.scoreWeight;
  }

  // 9. Suspicious Phone Patterns (e.g. 9999999999, 1111111111, repeating digits)
  const phone = (shippingAddress.phone || user?.phone || '').replace(/[^0-9]/g, '');
  const isRepeatedDigits = /^(\d)\1{9}$/.test(phone);
  if (isRepeatedDigits || (phone.length === 10 && phone.startsWith('000'))) {
    const phoneRule = rulesMap.get('RULE_SUSPICIOUS_PHONE') || DEFAULT_SYSTEM_RULES[9];
    triggeredRules.push({
      ruleCode: phoneRule.code,
      ruleName: phoneRule.name,
      scoreAdded: phoneRule.scoreWeight,
      severity: phoneRule.severity,
      reason: `Phone number ${phone} contains repeating or invalid dummy sequences.`,
    });
    calculatedScore += phoneRule.scoreWeight;
  }

  // 10. Existing User Shadow-Ban Status
  if (user?.isShadowBanned) {
    calculatedScore = Math.max(calculatedScore, 95);
    triggeredRules.push({
      ruleCode: 'RULE_USER_SHADOW_BANNED',
      ruleName: 'Pre-Existing Shadow Ban',
      scoreAdded: 50,
      severity: 'CRITICAL',
      reason: 'User account has previously been placed under administrative shadow-ban.',
    });
  }

  // Whitelist discount: If IP is whitelisted (and no critical device/IP blacklist was triggered)
  const isBlacklisted =
    (telemetry.ipAddress && config.blacklists.ipAddresses.includes(telemetry.ipAddress)) ||
    (telemetry.deviceId && config.blacklists.deviceIds.includes(telemetry.deviceId));

  if (config.whitelists.ipAddresses.includes(telemetry.ipAddress) && !isBlacklisted) {
    calculatedScore = Math.min(calculatedScore, 20);
  }

  // Final Risk Score calculation (0 - 100)
  const riskScore = Math.min(100, Math.max(0, calculatedScore));

  // Determine Risk Level
  let riskLevel = 'LOW';
  if (riskScore >= config.globalThresholds.criticalRiskThreshold) {
    riskLevel = 'CRITICAL';
  } else if (riskScore >= config.globalThresholds.highRiskThreshold) {
    riskLevel = 'HIGH';
  } else if (riskScore >= config.globalThresholds.mediumRiskThreshold) {
    riskLevel = 'MEDIUM';
  }

  // Determine Automated Action
  let actionTaken = 'ALLOW';
  let isBlocked = false;
  let forcePrepaid = false;
  let requiresOtp = false;
  let shadowBanned = user?.isShadowBanned || false;

  if (riskLevel === 'CRITICAL') {
    actionTaken = config.automatedMitigations.autoShadowBanCriticalRisk ? 'SHADOW_BAN' : 'BLOCK_TRANSACTION';
    isBlocked = true;
    forcePrepaid = true;
    requiresOtp = true;
    shadowBanned = true;
  } else if (riskLevel === 'HIGH') {
    actionTaken = config.automatedMitigations.disableCodForHighRisk ? 'FORCE_PREPAID' : 'CHALLENGE_OTP';
    forcePrepaid = true;
    requiresOtp = true;
  } else if (riskLevel === 'MEDIUM') {
    actionTaken = config.automatedMitigations.requireOtpForMediumRisk ? 'CHALLENGE_OTP' : 'ALLOW';
    requiresOtp = true;
  }

  // Persist device ID to user's registered fingerprints if valid user
  if (user?._id) {
    await User.findByIdAndUpdate(user._id, {
      $addToSet: { deviceFingerprints: telemetry.deviceId },
      $set: {
        fraudRiskScore: riskScore,
        lastRiskAssessment: new Date(),
        ...(shadowBanned && !user.isShadowBanned
          ? {
              isShadowBanned: true,
              shadowBannedAt: new Date(),
              shadowBanReason: triggeredRules.map(r => r.ruleName).join(', ') || 'Critical Risk Velocity & Anomaly Spike',
            }
          : {}),
      },
    });
  }

  // Increment triggered rules counters
  for (const tr of triggeredRules) {
    await FraudRule.updateOne(
      { code: tr.ruleCode },
      { $inc: { triggersCount: 1 }, $set: { lastTriggeredAt: new Date() } }
    );
  }

  // Create Fraud Incident Record
  const incidentNumber = `FRD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const incident = await FraudIncident.create({
    incidentNumber,
    user: user?._id || null,
    order: orderData._id || null,
    ipAddress: telemetry.ipAddress,
    deviceId: telemetry.deviceId,
    fingerprint: telemetry.fingerprint,
    network: telemetry.network,
    geolocation: {
      ...telemetry.geolocation,
      shippingCity: shippingAddress.city || '',
      shippingState: shippingAddress.state || '',
      shippingPincode: shippingAddress.pincode || '',
      shippingLat,
      shippingLng,
      distanceKm,
      isGeoMismatch,
    },
    riskScore,
    riskLevel,
    actionTaken,
    triggeredRules,
    velocity: {
      ordersLast1Hour: ordersLastHour,
      ordersLast24Hours: ordersLastDay,
      accountsPerDevice: distinctAccountsOnDevice,
      failedPaymentsCount: 0,
    },
    cartAmount,
    resolution: {
      status: riskLevel === 'LOW' ? 'RESOLVED' : 'PENDING_REVIEW',
      resolutionNotes: riskLevel === 'LOW' ? 'Automatically cleared by baseline fraud heuristics.' : '',
    },
  });

  return {
    isBlocked,
    requiresOtp,
    forcePrepaid,
    shadowBanned,
    riskScore,
    riskLevel,
    actionTaken,
    incidentId: incident._id,
    incidentNumber: incident.incidentNumber,
    triggeredRules,
    telemetry,
    distanceKm,
  };
};

module.exports = {
  seedDefaultRules,
  getFraudConfig,
  extractClientTelemetry,
  calculateDistanceKm,
  evaluateOrderRisk,
  DEFAULT_SYSTEM_RULES,
};
