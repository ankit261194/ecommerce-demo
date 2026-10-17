const mongoose = require('mongoose');

const affiliatePayoutSchema = new mongoose.Schema(
  {
    payoutNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => 'AFF-PAY-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900),
    },
    affiliate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AffiliatePartner',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    payoutMethod: {
      type: String,
      enum: ['UPI', 'BANK_TRANSFER', 'WALLET'],
      default: 'UPI',
    },
    beneficiary: {
      upiId: { type: String, default: '' },
      accountHolderName: { type: String, default: '' },
      bankAccountNumber: { type: String, default: '' },
      bankIfsc: { type: String, default: '' },
      bankName: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['REQUESTED', 'APPROVED', 'PROCESSING', 'PAID', 'REJECTED'],
      default: 'REQUESTED',
      index: true,
    },
    transactionReference: {
      type: String,
      default: '',
      trim: true,
    },
    adminNotes: {
      type: String,
      default: '',
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    referrals: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AffiliateReferral',
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AffiliatePayout', affiliatePayoutSchema);
