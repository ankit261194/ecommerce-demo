const mongoose = require('mongoose');

const affiliateReferralSchema = new mongoose.Schema(
  {
    affiliate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AffiliatePartner',
      required: true,
      index: true,
    },
    affiliateCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    orderTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    commissionRate: {
      type: Number,
      required: true,
      min: 0,
    },
    commissionType: {
      type: String,
      enum: ['PERCENTAGE', 'FLAT'],
      default: 'PERCENTAGE',
    },
    commissionAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'PAID', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    clickSource: {
      type: String,
      default: 'direct_link',
    },
    payout: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AffiliatePayout',
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AffiliateReferral', affiliateReferralSchema);
