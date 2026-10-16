const mongoose = require('mongoose');

const SocialShareConfigSchema = new mongoose.Schema(
  {
    defaultTitle: {
      type: String,
      default: 'AuraMarket - Premium Multi-Vendor Marketplace',
      trim: true,
    },
    defaultDescription: {
      type: String,
      default:
        'Discover verified authentic products with express doorstep delivery, 100% genuine guarantee, No Cost EMI, and member rewards on AuraMarket.',
      trim: true,
    },
    defaultImage: {
      type: String,
      default: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=630&fit=crop&q=80',
    },
    siteName: {
      type: String,
      default: 'AuraMarket',
    },
    twitterHandle: {
      type: String,
      default: '@AuraMarket',
    },
    facebookAppId: {
      type: String,
      default: '',
    },
    currency: {
      type: String,
      default: 'INR',
    },
    enableDynamicCards: {
      type: Boolean,
      default: true,
    },
    brandTagline: {
      type: String,
      default: 'India\'s Most Trusted Multi-Vendor E-Commerce Destination',
    },
    whatsappMessageTemplate: {
      type: String,
      default: '🔥 *%productTitle%* is now available on AuraMarket for only *₹%price%* (%discount% OFF)!\n⭐ Rated %rating%/5 by verified buyers.\n\n👉 Buy now before stock runs out: %shareUrl%',
    },
    referralTrackingParam: {
      type: String,
      default: 'ref=share_social',
    },
    cardThemeColor: {
      type: String,
      default: '#f59e0b', // Amber
    },
    cardBgColor: {
      type: String,
      default: '#0f172a', // Slate 900
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SocialShareConfig', SocialShareConfigSchema);
