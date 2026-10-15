const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['customer', 'vendor'],
    required: true,
  },
  senderUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  senderName: {
    type: String,
    required: true,
    trim: true,
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  read: {
    type: Boolean,
    default: false,
  },
});

const chatInquirySchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      index: true,
    },
    productSnapshot: {
      title: { type: String, default: 'General Store Inquiry' },
      image: { type: String, default: '' },
      price: { type: Number, default: 0 },
      sku: { type: String, default: '' },
      category: { type: String, default: 'General' },
    },
    subject: {
      type: String,
      default: 'Product & Order Inquiry',
      trim: true,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    priority: {
      type: String,
      enum: ['normal', 'urgent', 'low'],
      default: 'normal',
    },
    messages: [messageSchema],
    lastMessage: {
      type: String,
      default: '',
    },
    lastMessageSender: {
      type: String,
      enum: ['customer', 'vendor'],
      default: 'customer',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    unreadByVendor: {
      type: Number,
      default: 1,
      min: 0,
    },
    unreadByCustomer: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

chatInquirySchema.index({ customer: 1, vendor: 1, product: 1 });
chatInquirySchema.index({ vendor: 1, status: 1 });

module.exports = mongoose.model('ChatInquiry', chatInquirySchema);
