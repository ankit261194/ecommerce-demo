const mongoose = require('mongoose');

const recoveryStageSchema = new mongoose.Schema({
  stageNumber: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  delayHours: {
    type: Number,
    required: true,
    min: 0,
  },
  channels: [
    {
      type: String,
      enum: ['EMAIL', 'WHATSAPP', 'SMS'],
      default: ['EMAIL', 'WHATSAPP'],
    },
  ],
  offerDiscount: {
    type: Boolean,
    default: false,
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 90,
  },
  freeShippingOffer: {
    type: Boolean,
    default: false,
  },
  emailSubject: {
    type: String,
    required: true,
    trim: true,
  },
  emailBodyTemplate: {
    type: String,
    required: true,
  },
  whatsappTemplate: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

const abandonedCartRecoveryConfigSchema = new mongoose.Schema(
  {
    isEnabled: {
      type: Boolean,
      default: true,
    },
    emailEnabled: {
      type: Boolean,
      default: true,
    },
    whatsappEnabled: {
      type: Boolean,
      default: true,
    },
    smsEnabled: {
      type: Boolean,
      default: true,
    },
    minCartValue: {
      type: Number,
      default: 299,
      min: 0,
    },
    maxRemindersPerCart: {
      type: Number,
      default: 3,
      min: 1,
      max: 10,
    },
    autoExpireDays: {
      type: Number,
      default: 7,
      min: 1,
    },
    stages: [recoveryStageSchema],
    lastSchedulerRunAt: {
      type: Date,
      default: null,
    },
    totalAutomatedDispatches: {
      type: Number,
      default: 0,
    },
    totalRecoveredViaDrip: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Static method to get or initialize default configuration
abandonedCartRecoveryConfigSchema.statics.getOrCreateDefault = async function () {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({
      isEnabled: true,
      emailEnabled: true,
      whatsappEnabled: true,
      smsEnabled: true,
      minCartValue: 299,
      maxRemindersPerCart: 3,
      autoExpireDays: 7,
      stages: [
        {
          stageNumber: 1,
          name: 'Stage 1: 1-Hour Gentle Nudge',
          delayHours: 1,
          channels: ['EMAIL', 'WHATSAPP'],
          offerDiscount: false,
          discountPercentage: 0,
          freeShippingOffer: false,
          emailSubject: 'Did you forget something, {customerName}? Your cart is waiting!',
          emailBodyTemplate:
            'Hi {customerName}, you left items totaling ₹{cartTotal} in your AuraMarket cart! Complete your order before items sell out: {recoveryLink}',
          whatsappTemplate:
            'Hi {customerName}! 🛒 You left items in your AuraMarket cart (Total: ₹{cartTotal}). Tap here to restore and finish your order in 1 click: {recoveryLink}',
          isActive: true,
        },
        {
          stageNumber: 2,
          name: 'Stage 2: 24-Hour Sweetener Incentive',
          delayHours: 24,
          channels: ['EMAIL', 'WHATSAPP'],
          offerDiscount: true,
          discountPercentage: 15,
          freeShippingOffer: true,
          emailSubject: '🎁 Extra 15% OFF + Free Delivery: Complete your cart now, {customerName}!',
          emailBodyTemplate:
            'Hi {customerName}, we unlocked an exclusive {discountPercent}% OFF coupon ({couponCode}) for your cart! Claim it here: {recoveryLink}',
          whatsappTemplate:
            'Hey {customerName}! 🎁 Special surprise: Take an extra {discountPercent}% OFF with code *{couponCode}* + FREE Shipping! Click to checkout: {recoveryLink}',
          isActive: true,
        },
        {
          stageNumber: 3,
          name: 'Stage 3: 72-Hour Final Urgency Warning',
          delayHours: 72,
          channels: ['EMAIL', 'WHATSAPP', 'SMS'],
          offerDiscount: true,
          discountPercentage: 10,
          freeShippingOffer: false,
          emailSubject: '⚠️ Final Notice: Your reserved cart items will be released today!',
          emailBodyTemplate:
            'Hi {customerName}, this is our final reminder. Your reserved items totaling ₹{cartTotal} will be returned to public inventory in 6 hours: {recoveryLink}',
          whatsappTemplate:
            '⚠️ AuraMarket Final Call: Reserved items in your cart will expire and return to inventory today. Save them now with code *{couponCode}*: {recoveryLink}',
          isActive: true,
        },
      ],
    });
  }
  return config;
};

module.exports = mongoose.model('AbandonedCartRecoveryConfig', abandonedCartRecoveryConfigSchema);
