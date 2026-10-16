const mongoose = require('mongoose');

const subOrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  title: String,
  image: String,
  variantSku: String,
  variantName: String,
  categorySlug: { type: String, default: 'all' },
  hsnCode: {
    type: String,
    default: '85183000',
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
});

const subOrderSchema = new mongoose.Schema(
  {
    parentOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [subOrderItemSchema],
    subTotal: {
      type: Number,
      required: true,
    },
    platformCommissionRate: {
      type: Number,
      required: true,
      default: 10,
    },
    platformCommissionAmount: {
      type: Number,
      required: true,
    },
    vendorEarning: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: [
        'placed',
        'pending',
        'confirmed',
        'packaging',
        'packed',
        'ready_for_pickup',
        'dispatched',
        'shipped',
        'handed_to_courier',
        'out_for_delivery',
        'delivered',
        'cancelled',
      ],
      default: 'placed',
    },
    // Point #56: Lifecycle Transition Timestamps
    acceptedAt: { type: Date, default: null },
    packagingStartedAt: { type: Date, default: null },
    readyForPickupAt: { type: Date, default: null },
    dispatchedAt: { type: Date, default: null },
    shippedAt: { type: Date, default: null },
    trackingNumber: { type: String, default: '' },
    carrier: { type: String, default: '' },
    shippingAddress: {
      recipientName: String,
      phone: String,
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
    deliveryOtp: {
      type: String,
      default: () => Math.floor(1000 + Math.random() * 9000).toString(), // 4 digit OTP
    },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    trackingHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],
    // Point #25: Order Delivery Instructions / Rider Notes
    deliveryInstructions: {
      type: String,
      default: '',
      trim: true,
    },
    // Point #28: 1-Click Self-Cancel SubOrder Reason
    cancellationReason: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SubOrder', subOrderSchema);
