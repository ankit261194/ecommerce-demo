const mongoose = require('mongoose');

const abandonedCartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: false,
  },
  productId: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
  },
  image: {
    type: String,
    default: '',
  },
  variant: {
    type: String,
    default: '',
  },
});

const abandonedCartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    customerPhone: {
      type: String,
      trim: true,
      default: '',
    },
    items: [abandonedCartItemSchema],
    cartTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    abandonedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['ABANDONED', 'REMINDER_SENT', 'RECOVERED', 'EXPIRED'],
      default: 'ABANDONED',
    },
    reminderCount: {
      type: Number,
      default: 0,
    },
    lastReminderSentAt: {
      type: Date,
      default: null,
    },
    recoveryCoupon: {
      type: String,
      default: 'RECOVER10',
      trim: true,
    },
    recoveredOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AbandonedCart', abandonedCartSchema);
