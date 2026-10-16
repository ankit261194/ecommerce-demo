const mongoose = require('mongoose');

const payoutSplitSchema = new mongoose.Schema(
  {
    subOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubOrder',
      required: true,
      unique: true,
      index: true,
    },
    parentOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
    },
    grossAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    commissionRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    adminCommission: {
      type: Number,
      required: true,
      min: 0,
    },
    vendorNetPayout: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['SETTLED', 'PENDING', 'HELD', 'REVERSED'],
      default: 'SETTLED',
    },
    settlementMethod: {
      type: String,
      default: 'INSTANT_WALLET_ESCROW_RELEASE',
    },
    settledAt: {
      type: Date,
      default: Date.now,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    notes: {
      type: String,
      default: 'Automated instant payout split upon delivery OTP verification.',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PayoutSplit', payoutSplitSchema);
