const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      default: () => 'TXN-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000),
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      required: false, // null if purely platform transaction
    },
    subOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubOrder',
      required: false,
    },
    type: {
      type: String,
      enum: ['ORDER_CREDIT', 'COMMISSION_DEBIT', 'PAYOUT_WITHDRAWAL', 'REFUND', 'AD_SPEND', 'SPF_COMPENSATION'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['COMPLETED', 'PENDING', 'REJECTED'],
      default: 'COMPLETED',
    },
    payoutDetails: {
      utrNumber: { type: String, default: '' },
      paymentMode: {
        type: String,
        enum: ['IMPS', 'NEFT', 'RTGS', 'UPI', 'MANUAL_BANK_TRANSFER'],
        default: 'IMPS',
      },
      accountHolder: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      bankName: { type: String, default: '' },
      adminNotes: { type: String, default: '' },
      rejectionReason: { type: String, default: '' },
      processedAt: { type: Date },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ledger', ledgerSchema);
