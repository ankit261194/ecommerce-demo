const mongoose = require('mongoose');

const scratchCardRewardSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
    },
    rewardType: {
      type: String,
      enum: ['WALLET_COINS', 'WALLET_CASH', 'COUPON_DISCOUNT'],
      default: 'WALLET_COINS',
    },
    amount: {
      type: Number,
      required: true,
    },
    couponCode: {
      type: String,
      default: null,
    },
    badgeText: {
      type: String,
      default: '',
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    isScratched: {
      type: Boolean,
      default: false,
    },
    isClaimed: {
      type: Boolean,
      default: false,
    },
    scratchedAt: {
      type: Date,
      default: null,
    },
    claimedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiry
    },
    scratchPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    deliveryTrigger: {
      type: String,
      enum: ['ORDER_DELIVERED', 'POST_PURCHASE', 'PROMOTIONAL', 'ADMIN_GIFT'],
      default: 'ORDER_DELIVERED',
    },
    celebrationTheme: {
      type: String,
      enum: ['GOLD', 'NEON_PURPLE', 'FESTIVE_DIWALI', 'EMERALD'],
      default: 'GOLD',
    },
  },
  { timestamps: true }
);

scratchCardRewardSchema.index({ order: 1 }, { unique: true });
scratchCardRewardSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ScratchCardReward', scratchCardRewardSchema);
