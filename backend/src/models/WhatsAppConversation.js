const mongoose = require('mongoose');

const messageItemSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ['user', 'bot', 'system'],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    intent: {
      type: String,
      enum: ['GREETING', 'SEARCH', 'PRODUCT_DETAIL', 'CART', 'CHECKOUT_COD', 'TRACK_ORDER', 'SUPPORT', 'UNKNOWN'],
      default: 'UNKNOWN',
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    title: { type: String, required: true },
    quantity: { type: Number, default: 1, min: 1 },
    price: { type: Number, required: true },
    sku: { type: String, default: '' },
  },
  { _id: true }
);

const whatsAppConversationSchema = new mongoose.Schema(
  {
    customerPhone: {
      type: String,
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      default: 'Valued Shopper',
    },
    messages: [messageItemSchema],
    activeCart: [cartItemSchema],
    lastIntent: {
      type: String,
      default: 'GREETING',
    },
    lastInteractionAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ORDER_PLACED', 'IDLE', 'SUPPORT_REQUESTED'],
      default: 'ACTIVE',
    },
    ordersPlacedCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('WhatsAppConversation', whatsAppConversationSchema);
