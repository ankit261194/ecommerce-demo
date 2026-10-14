const mongoose = require('mongoose');

const dealProductSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  dealPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  discountPercentage: {
    type: Number,
    required: true,
    min: 1,
    max: 99,
  },
  allocatedStock: {
    type: Number,
    default: 50,
    min: 1,
  },
  soldCount: {
    type: Number,
    default: 0,
    min: 0,
  },
});

const flashDealSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Flash deal title is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    badgeText: {
      type: String,
      default: '⚡ FLASH SALE',
      trim: true,
    },
    bannerImage: {
      type: String,
      default: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80',
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    status: {
      type: String,
      enum: ['UPCOMING', 'ACTIVE', 'EXPIRED', 'PAUSED'],
      default: 'ACTIVE',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    backgroundColor: {
      type: String,
      default: '#DC2626',
    },
    textColor: {
      type: String,
      default: '#FFFFFF',
    },
    products: [dealProductSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('FlashDeal', flashDealSchema);
