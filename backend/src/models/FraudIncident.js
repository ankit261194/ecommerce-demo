const mongoose = require('mongoose');

const triggeredRuleSchema = new mongoose.Schema(
  {
    ruleCode: {
      type: String,
      required: true,
      trim: true,
    },
    ruleName: {
      type: String,
      required: true,
      trim: true,
    },
    scoreAdded: {
      type: Number,
      required: true,
      default: 0,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    reason: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const fraudIncidentSchema = new mongoose.Schema(
  {
    incidentNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      index: true,
    },
    ipAddress: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    deviceId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    fingerprint: {
      userAgent: { type: String, default: '' },
      browser: { type: String, default: 'Chrome' },
      os: { type: String, default: 'Windows' },
      deviceType: {
        type: String,
        enum: ['DESKTOP', 'MOBILE', 'TABLET', 'BOT', 'UNKNOWN'],
        default: 'DESKTOP',
      },
      screenResolution: { type: String, default: '1920x1080' },
      timezone: { type: String, default: 'Asia/Kolkata' },
      language: { type: String, default: 'en-US' },
      canvasHash: { type: String, default: '' },
    },
    network: {
      vpnOrProxy: { type: Boolean, default: false },
      torNode: { type: Boolean, default: false },
      datacenterIp: { type: Boolean, default: false },
      isp: { type: String, default: 'Airtel Broadband' },
    },
    geolocation: {
      ipCountry: { type: String, default: 'India' },
      ipCity: { type: String, default: 'New Delhi' },
      ipRegion: { type: String, default: 'Delhi' },
      ipLat: { type: Number, default: 28.6139 },
      ipLng: { type: Number, default: 77.2090 },
      shippingCity: { type: String, default: '' },
      shippingState: { type: String, default: '' },
      shippingPincode: { type: String, default: '' },
      shippingLat: { type: Number, default: 0 },
      shippingLng: { type: Number, default: 0 },
      distanceKm: { type: Number, default: 0 },
      isGeoMismatch: { type: Boolean, default: false },
    },
    riskScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
      index: true,
    },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'LOW',
      index: true,
    },
    actionTaken: {
      type: String,
      enum: ['ALLOW', 'CHALLENGE_OTP', 'FORCE_PREPAID', 'BLOCK_TRANSACTION', 'SHADOW_BAN'],
      default: 'ALLOW',
      index: true,
    },
    triggeredRules: {
      type: [triggeredRuleSchema],
      default: [],
    },
    velocity: {
      ordersLast1Hour: { type: Number, default: 0 },
      ordersLast24Hours: { type: Number, default: 0 },
      accountsPerDevice: { type: Number, default: 1 },
      failedPaymentsCount: { type: Number, default: 0 },
    },
    cartAmount: {
      type: Number,
      default: 0,
    },
    resolution: {
      status: {
        type: String,
        enum: ['PENDING_REVIEW', 'CONFIRMED_FRAUD', 'FALSE_POSITIVE', 'RESOLVED'],
        default: 'PENDING_REVIEW',
        index: true,
      },
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      resolvedAt: {
        type: Date,
        default: null,
      },
      resolutionNotes: {
        type: String,
        default: '',
        trim: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

fraudIncidentSchema.index({ createdAt: -1 });
fraudIncidentSchema.index({ riskScore: -1 });
fraudIncidentSchema.index({ 'resolution.status': 1, riskLevel: 1 });

module.exports = mongoose.model('FraudIncident', fraudIncidentSchema);
