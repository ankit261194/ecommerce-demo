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
      trim: true,
      lowercase: true,
      default: '',
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
    // Point 15: Automated Price Drop & Back-in-Stock Alerts
    alertType: {
      type: String,
      enum: ['PRICE_DROP', 'BACK_IN_STOCK', 'BOTH'],
      default: 'PRICE_DROP',
      index: true,
    },
    currentPrice: {
      type: Number,
      default: 0,
    },
    targetPrice: {
      type: Number,
      default: 0,
    },
    initialStock: {
      type: Number,
      default: 0,
    },
    restockedUnits: {
      type: Number,
      default: null,
    },
    channel: {
      type: String,
      enum: ['EMAIL', 'WHATSAPP', 'SMS', 'ALL', 'BOTH'],
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
