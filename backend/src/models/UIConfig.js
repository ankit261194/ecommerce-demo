const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  imageUrl: { type: String, required: true },
  actionLink: { type: String, default: '/products' },
  badgeText: { type: String, default: 'Trending Now' },
  isActive: { type: Boolean, default: true },
});

const uiConfigSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      default: 'AuraMarket',
    },
    tagline: {
      type: String,
      default: 'The Next-Gen Multi-Vendor Commerce Platform',
    },
    primaryColor: {
      type: String,
      default: '#F59E0B', // High-Contrast Electric Amber
    },
    secondaryColor: {
      type: String,
      default: '#0B0F17', // Obsidian Slate
    },
    announcementText: {
      type: String,
      default: '🔥 Festive Sale Live! Get up to 40% OFF with code FESTIVE2026',
    },
    showAnnouncement: {
      type: Boolean,
      default: true,
    },
    heroBanners: [bannerSchema],
    featuredCategoryIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    demoModeActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UIConfig', uiConfigSchema);
