const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    variantSku: {
      type: String,
      default: null,
    },
    variantName: {
      type: String,
      default: 'Standard',
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    frequency: {
      type: String,
      enum: ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'],
      default: 'MONTHLY',
    },
    frequencyDays: {
      type: Number,
      default: 30,
    },
    discountPercentage: {
      type: Number,
      default: 10,
      min: 0,
      max: 50,
    },
    unitPrice: {
      type: Number,
      required: true,
    },
    discountedUnitPrice: {
      type: Number,
      required: true,
    },
    cycleTotal: {
      type: Number,
      required: true,
    },
    deliveryTimeSlot: {
      type: String,
      enum: ['MORNING_6_8', 'AFTERNOON_12_2', 'EVENING_6_8', 'ANYTIME'],
      default: 'MORNING_6_8',
    },
    shippingAddress: {
      recipientName: { type: String, required: true },
      phone: { type: String, required: true },
      street: { type: String, required: true },
      city: { type: String, default: 'New Delhi' },
      state: { type: String, default: 'Delhi' },
      pincode: { type: String, required: true },
      landmark: { type: String, default: '' },
      coordinates: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
      },
    },
    paymentMethod: {
      type: String,
      enum: ['WALLET_AUTO_DEBIT', 'UPI_AUTOPAY', 'COD_PER_DELIVERY'],
      default: 'WALLET_AUTO_DEBIT',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'PAUSED', 'CANCELLED'],
      default: 'ACTIVE',
      index: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    nextDeliveryDate: {
      type: Date,
      required: true,
      index: true,
    },
    lastDeliveredDate: {
      type: Date,
      default: null,
    },
    totalDeliveriesCount: {
      type: Number,
      default: 0,
    },
    skippedDeliveryDates: [
      {
        type: Date,
      },
    ],
    deliveryHistory: [
      {
        deliveryDate: { type: Date, default: Date.now },
        order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
        orderNumber: { type: String, default: null },
        status: { type: String, enum: ['PLACED', 'DELIVERED', 'SKIPPED', 'FAILED'], default: 'PLACED' },
        amountCharged: { type: Number, default: 0 },
        note: { type: String, default: '' },
      },
    ],
    pauseReason: {
      type: String,
      default: null,
    },
    pausedAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
