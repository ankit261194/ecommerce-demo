const mongoose = require('mongoose');

const codReconciliationSchema = new mongoose.Schema(
  {
    reconciliationId: {
      type: String,
      required: true,
      unique: true,
    },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DeliveryTask',
      },
    ],
    shiftDate: {
      type: Date,
      default: Date.now,
    },
    denominations: {
      d2000: { type: Number, default: 0 },
      d500: { type: Number, default: 0 },
      d200: { type: Number, default: 0 },
      d100: { type: Number, default: 0 },
      d50: { type: Number, default: 0 },
      d20: { type: Number, default: 0 },
      d10: { type: Number, default: 0 },
      coins: { type: Number, default: 0 },
    },
    totalExpected: {
      type: Number,
      required: true,
      default: 0,
    },
    totalCounted: {
      type: Number,
      required: true,
      default: 0,
    },
    discrepancy: {
      type: Number, // totalCounted - totalExpected (negative = shortage, positive = excess)
      default: 0,
    },
    handoverOtp: {
      type: String,
      default: () => Math.floor(1000 + Math.random() * 9000).toString(),
    },
    depositMethod: {
      type: String,
      enum: ['BANK_DEPOSIT', 'UPI_TRANSFER', 'HUB_CASH_DESK'],
      default: 'HUB_CASH_DESK',
    },
    depositSlipNumber: {
      type: String,
      default: '',
    },
    depositSlipImage: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED', 'DEPOSITED_TO_BANK'],
      default: 'SUBMITTED',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    adminRemarks: {
      type: String,
      default: '',
    },
    bankDeposit: {
      isDeposited: { type: Boolean, default: false },
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      transactionReference: { type: String, default: '' },
      depositedAt: { type: Date, default: null },
      depositedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    ordersAudit: [
      {
        orderNumber: { type: String, default: '' },
        subOrderNumber: { type: String, default: '' },
        amount: { type: Number, default: 0 },
        customerName: { type: String, default: '' },
        deliveredAt: { type: Date, default: Date.now },
      },
    ],
    hubCode: {
      type: String,
      default: 'CENTRAL-VAULT',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CodReconciliation', codReconciliationSchema);
