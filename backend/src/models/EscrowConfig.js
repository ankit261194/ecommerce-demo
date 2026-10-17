const mongoose = require('mongoose');

const escrowConfigSchema = new mongoose.Schema(
  {
    defaultHoldDays: {
      type: Number,
      default: 7,
      min: 0,
      max: 60,
    },
    minimumPayoutThreshold: {
      type: Number,
      default: 500,
      min: 0,
    },
    powerSellerEarlyRelease: {
      enabled: { type: Boolean, default: true },
      minVendorRating: { type: Number, default: 4.8, min: 1, max: 5 },
      minCompletedOrders: { type: Number, default: 50, min: 0 },
      reducedHoldDays: { type: Number, default: 2, min: 0 },
      maxReturnRatePercent: { type: Number, default: 2.0, min: 0, max: 100 },
    },
    payoutSchedules: {
      type: [String],
      default: ['DAILY', 'WEEKLY_MONDAY', 'BIWEEKLY', 'MONTHLY_FIRST'],
    },
    autoReleaseEnabled: {
      type: Boolean,
      default: true,
    },
    autoReleaseScheduleCron: {
      type: String,
      default: '0 2 * * *',
    },
    disputeFreezeWindowDays: {
      type: Number,
      default: 14,
      min: 1,
    },
    platformCommissionEscrowHandling: {
      type: String,
      enum: ['HELD_IN_ESCROW', 'IMMEDIATE_SPLIT'],
      default: 'HELD_IN_ESCROW',
    },
    notes: {
      type: String,
      default: 'Standard AuraMarket automated escrow policy with 7-day return window guarantee.',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.EscrowConfig || mongoose.model('EscrowConfig', escrowConfigSchema);
