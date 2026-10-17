const mongoose = require('mongoose');

const adClickLogSchema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdCampaign',
      required: true,
      index: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    cpcCharged: {
      type: Number,
      required: true,
      min: 0,
    },
    keywordMatched: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isFraudulent: {
      type: Boolean,
      default: false,
      index: true,
    },
    fraudReason: {
      type: String,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: { expires: '90d' },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AdClickLog', adClickLogSchema);
