const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Banner title is required'],
      trim: true,
    },
    subtitle: {
      type: String,
      default: '',
      trim: true,
    },
    badgeText: {
      type: String,
      default: 'Trending Now',
      trim: true,
    },
    imageUrl: {
      type: String,
      required: [true, 'Banner image URL is required'],
      trim: true,
    },
    actionLink: {
      type: String,
      default: '/products',
      trim: true,
    },
    buttonText: {
      type: String,
      default: 'Shop Now',
      trim: true,
    },
    position: {
      type: String,
      enum: ['hero_slider', 'promo_banner_top', 'promo_banner_middle', 'sidebar_banner'],
      default: 'hero_slider',
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    backgroundColor: {
      type: String,
      default: '#0B0F17',
    },
    textColor: {
      type: String,
      default: '#FFFFFF',
    },
  },
  {
    timestamps: true,
  }
);

// Index for performant querying of active banners by position
bannerSchema.index({ position: 1, isActive: 1, displayOrder: 1 });

module.exports = mongoose.model('Banner', bannerSchema);
