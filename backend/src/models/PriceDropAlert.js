const mongoose = require('mongoose');

const priceDropAlertSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
    customerName: {
      type: String,
      default: 'Valued Shopper',
    },
    currentPrice: {
      type: Number,
      required: true,
    },
    targetPrice: {
      type: Number,
      required: true,
    },
    channel: {
      type: String,
      enum: ['EMAIL', 'WHATSAPP', 'BOTH'],
      default: 'BOTH',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ALERTED', 'EXPIRED', 'CANCELLED'],
      default: 'ACTIVE',
      index: true,
    },
    alertedAt: {
      type: Date,
      default: null,
    },
    alertedPrice: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PriceDropAlert', priceDropAlertSchema);
