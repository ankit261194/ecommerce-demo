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
      type: Number, // totalCounted - totalExpected
      default: 0,
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
      enum: ['PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED'],
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
  },
  { timestamps: true }
);

module.exports = mongoose.model('CodReconciliation', codReconciliationSchema);
