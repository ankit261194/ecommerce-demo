const mongoose = require('mongoose');
const crypto = require('crypto');

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
    recoveryToken: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    whatsappSentCount: {
      type: Number,
      default: 0,
    },
    lastWhatsappSentAt: {
      type: Date,
      default: null,
    },
    recoveredOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    // Point 13: Customer Abandoned Cart Automated Recovery Sequences
    sequenceStage: {
      type: Number,
      default: 0, // 0 = uncontacted, 1 = 1-hour nudge, 2 = 24-hour dynamic voucher, 3 = 72-hour final warning
    },
    dynamicCoupon: {
      type: String,
      default: '',
      trim: true,
    },
    discountPercentage: {
      type: Number,
      default: 10,
    },
    exitIntentTriggered: {
      type: Boolean,
      default: false,
    },
    exitIntentConverted: {
      type: Boolean,
      default: false,
    },
    channelAttribution: {
      type: String,
      enum: ['EMAIL', 'WHATSAPP', 'SMS', 'EXIT_INTENT', 'DIRECT', 'NONE'],
      default: 'NONE',
    },
    recoveryLogs: [
      {
        stage: Number,
        channel: String, // 'EMAIL' | 'WHATSAPP' | 'SMS' | 'EXIT_INTENT'
        dispatchedAt: { type: Date, default: Date.now },
        recipient: String,
        couponOffered: String,
        status: { type: String, default: 'DELIVERED' },
      },
    ],
  },
  { timestamps: true }
);

abandonedCartSchema.pre('save', function (next) {
  if (!this.recoveryToken) {
    this.recoveryToken = `rec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }
  next();
});

module.exports = mongoose.model('AbandonedCart', abandonedCartSchema);
