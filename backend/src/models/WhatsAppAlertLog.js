const mongoose = require('mongoose');

const whatsAppAlertLogSchema = new mongoose.Schema(
  {
    recipientPhone: {
      type: String,
      required: true,
      index: true,
    },
    recipientName: {
      type: String,
      default: 'Customer',
    },
    alertType: {
      type: String,
      enum: ['ORDER_CONFIRMATION', 'OUT_FOR_DELIVERY', 'ORDER_DELIVERED', 'CART_RECOVERY', 'MANUAL_TEST', 'LOW_STOCK'],
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    orderNumber: {
      type: String,
      default: '',
      index: true,
    },
    messageBody: {
      type: String,
      required: true,
    },
    deliveryStatus: {
      type: String,
      enum: ['SENT', 'DELIVERED', 'READ', 'FAILED'],
      default: 'DELIVERED',
      index: true,
    },
    providerUsed: {
      type: String,
      default: 'meta_cloud_api',
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('WhatsAppAlertLog', whatsAppAlertLogSchema);
