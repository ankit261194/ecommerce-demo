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
      enum: ['ORDER_CREDIT', 'COMMISSION_DEBIT', 'PAYOUT_WITHDRAWAL', 'REFUND'],
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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ledger', ledgerSchema);
