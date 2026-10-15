const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  title: String,
  image: String,
  variantSku: String,
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
  },
  reason: String,
});

const returnRequestSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    subOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubOrder',
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      required: true,
    },
    items: [returnItemSchema],
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    detailedDescription: {
      type: String,
      default: '',
      trim: true,
    },
    proofPhotos: [
      {
        type: String,
        trim: true,
      },
    ],
    requestType: {
      type: String,
      enum: ['RETURN_REFUND', 'EXCHANGE'],
      default: 'RETURN_REFUND',
    },
    exchangeDetails: {
      requestedSize: { type: String, default: '' },
      requestedColor: { type: String, default: '' },
      replacementVariantSku: { type: String, default: '' },
      exchangeReason: { type: String, default: '' },
      customerNote: { type: String, default: '' },
    },
    reversePickupTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryTask',
    },
    reversePickupOtp: {
      type: String,
      default: '',
    },
    reversePickupStatus: {
      type: String,
      enum: ['NOT_SCHEDULED', 'SCHEDULED', 'OUT_FOR_PICKUP', 'PICKED_UP', 'COMPLETED', 'FAILED'],
      default: 'NOT_SCHEDULED',
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    refundMode: {
      type: String,
      enum: ['ORIGINAL_PAYMENT_METHOD', 'WALLET_COINS', 'BANK_TRANSFER'],
      default: 'ORIGINAL_PAYMENT_METHOD',
    },
    status: {
      type: String,
      enum: [
        'REQUESTED',
        'APPROVED',
        'PICKUP_SCHEDULED',
        'INSPECTED',
        'REFUNDED',
        'REJECTED',
        'EXCHANGE_REQUESTED',
        'EXCHANGE_APPROVED',
        'REVERSE_PICKUP_ASSIGNED',
        'REVERSE_PICKUP_COMPLETED',
        'REPLACEMENT_DISPATCHED',
        'EXCHANGE_COMPLETED',
      ],
      default: 'REQUESTED',
    },
    resolutionNote: {
      type: String,
      default: '',
      trim: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReturnRequest', returnRequestSchema);
