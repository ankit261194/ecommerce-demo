const mongoose = require('mongoose');

const loyaltyActivityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'EARN_ORDER',
        'REDEEM_ORDER',
        'DAILY_CHECKIN',
        'WELCOME_BONUS',
        'TIER_UPGRADE',
        'ADMIN_ADJUSTMENT',
        'BIRTHDAY_BONUS',
        'REFUND_RESTORE',
      ],
      required: true,
      index: true,
    },
    points: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    tier: {
      type: String,
      enum: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'],
      required: true,
      default: 'BRONZE',
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    orderNumber: {
      type: String,
      default: '',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

loyaltyActivityLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('LoyaltyActivityLog', loyaltyActivityLogSchema);
