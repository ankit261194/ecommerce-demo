const mongoose = require('mongoose');

const tierDefinitionSchema = new mongoose.Schema(
  {
    tier: {
      type: String,
      enum: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
      default: 'Award',
    },
    badgeColor: {
      type: String,
      default: 'amber',
    },
    minSpend: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    minOrders: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    cashbackMultiplier: {
      type: Number,
      default: 1.0,
      min: 0.5,
    },
    pointsPerHundred: {
      type: Number,
      default: 5,
      min: 0,
    },
    freeShippingAlways: {
      type: Boolean,
      default: false,
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    prioritySupport: {
      type: Boolean,
      default: false,
    },
    exclusiveEarlyAccess: {
      type: Boolean,
      default: false,
    },
    birthdayBonusCoins: {
      type: Number,
      default: 50,
      min: 0,
    },
    perks: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const loyaltyTierConfigSchema = new mongoose.Schema(
  {
    programEnabled: {
      type: Boolean,
      default: true,
    },
    pointsToRupeeRatio: {
      type: Number,
      default: 1, // 1 Point = 1 INR discount
      min: 0.01,
    },
    minRedeemPoints: {
      type: Number,
      default: 50,
      min: 0,
    },
    maxRedeemPercentagePerOrder: {
      type: Number,
      default: 50, // Max 50% of payable amount
      min: 1,
      max: 100,
    },
    dailyCheckInBasePoints: {
      type: Number,
      default: 10,
      min: 0,
    },
    dailyCheckInStreakBonus: {
      type: Number,
      default: 5, // +5 points each consecutive day up to day 7
      min: 0,
    },
    welcomeBonusPoints: {
      type: Number,
      default: 200,
      min: 0,
    },
    autoPromoteEnabled: {
      type: Boolean,
      default: true,
    },
    tiers: {
      type: [tierDefinitionSchema],
      default: [
        {
          tier: 'BRONZE',
          name: 'Bronze Explorer',
          icon: 'Award',
          badgeColor: 'amber',
          minSpend: 0,
          minOrders: 0,
          cashbackMultiplier: 1.0,
          pointsPerHundred: 5,
          freeShippingAlways: false,
          discountPercentage: 0,
          prioritySupport: false,
          exclusiveEarlyAccess: false,
          birthdayBonusCoins: 50,
          perks: ['Earn 5 reward points per ₹100', '1x standard cashback on all orders', 'Access to member-only coupons'],
          isActive: true,
        },
        {
          tier: 'SILVER',
          name: 'Silver Patron',
          icon: 'ShieldCheck',
          badgeColor: 'slate',
          minSpend: 5000,
          minOrders: 3,
          cashbackMultiplier: 1.25,
          pointsPerHundred: 7,
          freeShippingAlways: false,
          discountPercentage: 2,
          prioritySupport: false,
          exclusiveEarlyAccess: true,
          birthdayBonusCoins: 100,
          perks: ['2% permanent cart discount', '1.25x cashback multiplier', 'Early access to festive flash sales', '₹100 birthday bonus coins'],
          isActive: true,
        },
        {
          tier: 'GOLD',
          name: 'Gold Premier',
          icon: 'Crown',
          badgeColor: 'yellow',
          minSpend: 20000,
          minOrders: 10,
          cashbackMultiplier: 1.5,
          pointsPerHundred: 10,
          freeShippingAlways: true,
          discountPercentage: 5,
          prioritySupport: true,
          exclusiveEarlyAccess: true,
          birthdayBonusCoins: 250,
          perks: ['Free doorstep shipping on all orders', '5% permanent cart discount', '1.5x cashback multiplier', 'Priority ticket resolution SLA', '₹250 birthday gift coins'],
          isActive: true,
        },
        {
          tier: 'PLATINUM',
          name: 'Platinum Elite',
          icon: 'Sparkles',
          badgeColor: 'purple',
          minSpend: 50000,
          minOrders: 25,
          cashbackMultiplier: 2.0,
          pointsPerHundred: 15,
          freeShippingAlways: true,
          discountPercentage: 8,
          prioritySupport: true,
          exclusiveEarlyAccess: true,
          birthdayBonusCoins: 500,
          perks: ['Unconditional Free Delivery', '8% VIP cart discount', '2.0x Double cashback multiplier', 'Dedicated WhatsApp Concierge', 'Exclusive preview access to new drops', '₹500 birthday bonus coins'],
          isActive: true,
        },
        {
          tier: 'DIAMOND',
          name: 'Diamond Royalty',
          icon: 'Gem',
          badgeColor: 'cyan',
          minSpend: 100000,
          minOrders: 50,
          cashbackMultiplier: 2.5,
          pointsPerHundred: 20,
          freeShippingAlways: true,
          discountPercentage: 12,
          prioritySupport: true,
          exclusiveEarlyAccess: true,
          birthdayBonusCoins: 1000,
          perks: ['VIP Lifetime Diamond Status', '12% flat cart discount across all stores', '2.5x Ultra cashback multiplier', 'Instant zero-wait ticket dispatch', 'Free premium gift wrapping on every gift', '₹1000 birthday festival gift coins'],
          isActive: true,
        },
      ],
    },
  },
  { timestamps: true }
);

// Static method to ensure singleton configuration is retrieved or initialized
loyaltyTierConfigSchema.statics.getOrCreateConfig = async function () {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({});
  }
  return config;
};

module.exports = mongoose.model('LoyaltyTierConfig', loyaltyTierConfigSchema);
