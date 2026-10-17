const mongoose = require('mongoose');

const affiliatePartnerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    affiliateCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    customSlug: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    tier: {
      type: String,
      enum: ['STANDARD', 'SILVER', 'GOLD', 'PLATINUM', 'VIP_INFLUENCER'],
      default: 'STANDARD',
    },
    commissionType: {
      type: String,
      enum: ['PERCENTAGE', 'FLAT'],
      default: 'PERCENTAGE',
    },
    commissionRate: {
      type: Number,
      required: true,
      default: 10,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'PENDING', 'SUSPENDED', 'REJECTED'],
      default: 'ACTIVE',
    },
    payoutDetails: {
      method: {
        type: String,
        enum: ['UPI', 'BANK_TRANSFER', 'WALLET'],
        default: 'UPI',
      },
      upiId: { type: String, default: '', trim: true },
      accountHolderName: { type: String, default: '', trim: true },
      bankAccountNumber: { type: String, default: '', trim: true },
      bankIfsc: { type: String, default: '', trim: true, uppercase: true },
      bankName: { type: String, default: '', trim: true },
    },
    socialChannels: {
      instagram: { type: String, default: '', trim: true },
      youtube: { type: String, default: '', trim: true },
      website: { type: String, default: '', trim: true },
    },
    stats: {
      clicks: { type: Number, default: 0, min: 0 },
      conversions: { type: Number, default: 0, min: 0 },
      totalRevenue: { type: Number, default: 0, min: 0 },
      totalCommission: { type: Number, default: 0, min: 0 },
      paidCommission: { type: Number, default: 0, min: 0 },
      pendingBalance: { type: Number, default: 0, min: 0 },
    },
    notes: {
      type: String,
      default: '',
    },
    approvedAt: {
      type: Date,
      default: Date.now,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
affiliatePartnerSchema.index({ status: 1 });
affiliatePartnerSchema.index({ tier: 1 });

module.exports = mongoose.model('AffiliatePartner', affiliatePartnerSchema);
