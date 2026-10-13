const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorProfile',
    required: true,
  },
  title: String,
  image: String,
  variantSku: String,
  variantName: String,
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
      default: () => 'ORD-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900),
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [orderItemSchema],
    subOrders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubOrder',
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    totalCommission: {
      type: Number,
      required: true,
      default: 0,
    },
    shippingAddress: {
      recipientName: { type: String, required: true },
      phone: { type: String, required: true },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      enum: ['COD', 'RAZORPAY', 'WALLET'],
      default: 'COD',
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
    },
    status: {
      type: String,
      enum: ['PLACED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED', 'PARTIALLY_DELIVERED'],
      default: 'PLACED',
    },
    paymentId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
