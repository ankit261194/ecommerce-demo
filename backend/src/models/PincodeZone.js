const mongoose = require('mongoose');

const pincodeZoneSchema = new mongoose.Schema(
  {
    pincode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^\d{6}$/, 'Pincode must be exactly 6 digits'],
      index: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    district: {
      type: String,
      trim: true,
      default: '',
    },
    zone: {
      type: String,
      enum: ['METRO', 'TIER_1', 'TIER_2', 'REMOTE', 'SPECIAL'],
      default: 'TIER_1',
    },
    isDeliverable: {
      type: Boolean,
      default: true,
    },
    isCodAvailable: {
      type: Boolean,
      default: true,
    },
    estimatedDays: {
      type: Number,
      default: 3,
      min: 0,
      max: 30,
    },
    estimatedDeliveryText: {
      type: String,
      default: '2-3 Business Days',
    },
    standardShippingFee: {
      type: Number,
      default: 49,
      min: 0,
    },
    expressShippingFee: {
      type: Number,
      default: 99,
      min: 0,
    },
    expressAvailable: {
      type: Boolean,
      default: true,
    },
    minOrderForFreeShipping: {
      type: Number,
      default: 999,
      min: 0,
    },
    remarks: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Helper to calculate estimated delivery date from current timestamp
pincodeZoneSchema.methods.calculateETA = function () {
  const days = this.estimatedDays || 3;
  const etaDate = new Date();
  etaDate.setDate(etaDate.getDate() + days);
  return {
    etaDate: etaDate.toISOString().split('T')[0],
    etaFormatted: etaDate.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    days,
    text: this.estimatedDeliveryText || `${days} Business Days`,
  };
};

module.exports = mongoose.model('PincodeZone', pincodeZoneSchema);
