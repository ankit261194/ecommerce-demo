const mongoose = require('mongoose');

const fraudRuleSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      enum: ['VELOCITY', 'NETWORK', 'DEVICE', 'GEOLOCATION', 'ACCOUNT', 'TRANSACTION'],
      default: 'VELOCITY',
    },
    scoreWeight: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 20,
    },
    threshold: {
      type: Number,
      default: 1,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    action: {
      type: String,
      enum: ['FLAG', 'CHALLENGE_OTP', 'FORCE_PREPAID', 'BLOCK_TRANSACTION', 'SHADOW_BAN'],
      default: 'FLAG',
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
    isSystemRule: {
      type: Boolean,
      default: true,
    },
    triggersCount: {
      type: Number,
      default: 0,
    },
    lastTriggeredAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

fraudRuleSchema.index({ isEnabled: 1, category: 1 });

module.exports = mongoose.model('FraudRule', fraudRuleSchema);
