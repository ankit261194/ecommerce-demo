const mongoose = require('mongoose');

const fraudConfigSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      default: 'GLOBAL_FRAUD_CONFIG',
      unique: true,
      required: true,
    },
    globalThresholds: {
      mediumRiskThreshold: { type: Number, default: 40, min: 0, max: 100 },
      highRiskThreshold: { type: Number, default: 70, min: 0, max: 100 },
      criticalRiskThreshold: { type: Number, default: 85, min: 0, max: 100 },
    },
    automatedMitigations: {
      requireOtpForMediumRisk: { type: Boolean, default: true },
      disableCodForHighRisk: { type: Boolean, default: true },
      autoShadowBanCriticalRisk: { type: Boolean, default: true },
      maxAccountsPerDevice: { type: Number, default: 2 },
      maxOrdersPerHour: { type: Number, default: 3 },
      maxOrdersPerDay: { type: Number, default: 8 },
      maxGeoMismatchKm: { type: Number, default: 1000 },
    },
    blacklists: {
      ipAddresses: { type: [String], default: ['198.51.100.1', '203.0.113.195'] },
      deviceIds: { type: [String], default: ['DEV-BLOCKED-EMULATOR-001'] },
      disposableEmailDomains: {
        type: [String],
        default: [
          'tempmail.com',
          'guerrillamail.com',
          'mailinator.com',
          'throwawaymail.com',
          '10minutemail.com',
          'yopmail.com',
          'dispostable.com',
        ],
      },
      blockedPincodes: { type: [String], default: [] },
    },
    whitelists: {
      ipAddresses: { type: [String], default: ['127.0.0.1', '::1', '10.0.0.1'] },
      userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('FraudConfig', fraudConfigSchema);
