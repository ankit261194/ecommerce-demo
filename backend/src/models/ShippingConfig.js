const mongoose = require('mongoose');

const WeightTierSchema = new mongoose.Schema(
  {
    minGrams: {
      type: Number,
      required: true,
      min: 0,
    },
    maxGrams: {
      type: Number,
      required: true,
      min: 0,
    },
    surcharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const ZoneSurchargeSchema = new mongoose.Schema(
  {
    zone: {
      type: String,
      enum: ['METRO', 'TIER_1', 'TIER_2', 'REMOTE', 'SPECIAL'],
      required: true,
    },
    surcharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    transitDaysAdjustment: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const ShippingConfigSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: true,
    },
    freeShippingThreshold: {
      type: Number,
      default: 999,
      min: 0,
    },
    defaultShippingFee: {
      type: Number,
      default: 99,
      min: 0,
    },
    expressShippingFee: {
      type: Number,
      default: 149,
      min: 0,
    },
    hyperlocalShippingFee: {
      type: Number,
      default: 199,
      min: 0,
    },
    codFee: {
      type: Number,
      default: 29,
      min: 0,
    },
    estimatedStandardDays: {
      type: String,
      default: '2-4 business days',
      trim: true,
    },
    estimatedExpressDays: {
      type: String,
      default: '24-48 hours',
      trim: true,
    },
    estimatedHyperlocalDays: {
      type: String,
      default: '4-6 hours',
      trim: true,
    },
    weightTiers: {
      type: [WeightTierSchema],
      default: [
        { minGrams: 0, maxGrams: 500, surcharge: 0, name: 'Lightweight (0-500g)' },
        { minGrams: 501, maxGrams: 2000, surcharge: 30, name: 'Standard Parcel (0.5-2kg)' },
        { minGrams: 2001, maxGrams: 5000, surcharge: 60, name: 'Medium Parcel (2-5kg)' },
        { minGrams: 5001, maxGrams: 20000, surcharge: 120, name: 'Heavy Freight (5-20kg)' },
      ],
    },
    zoneSurcharges: {
      type: [ZoneSurchargeSchema],
      default: [
        { zone: 'METRO', surcharge: 0, transitDaysAdjustment: 0 },
        { zone: 'TIER_1', surcharge: 15, transitDaysAdjustment: 1 },
        { zone: 'TIER_2', surcharge: 30, transitDaysAdjustment: 2 },
        { zone: 'REMOTE', surcharge: 60, transitDaysAdjustment: 3 },
        { zone: 'SPECIAL', surcharge: 90, transitDaysAdjustment: 4 },
      ],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.ShippingConfig || mongoose.model('ShippingConfig', ShippingConfigSchema);
