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
  maxPerCustomer: {
    type: Number,
    default: 2,
    min: 1,
  },
  isSoldOut: {
    type: Boolean,
    default: false,
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
      enum: ['UPCOMING', 'ACTIVE', 'EXPIRED', 'PAUSED', 'CONCLUDED'],
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
    // Point 28: Scheduled Flash Sale Mega Campaign Builder Fields
    campaignType: {
      type: String,
      enum: ['STANDARD', 'MEGA_CAMPAIGN', 'HOURLY_SLOT', 'MIDNIGHT_DROP', 'FESTIVAL_SPECIAL'],
      default: 'MEGA_CAMPAIGN',
    },
    slotName: {
      type: String,
      default: 'Mega Flash Drop',
      trim: true,
    },
    vipEarlyAccessMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxUnitsPerCustomer: {
      type: Number,
      default: 2,
      min: 1,
    },
    totalAllocatedStock: {
      type: Number,
      default: 0,
    },
    totalSoldUnits: {
      type: Number,
      default: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
    notifyMeSubscribers: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        email: { type: String, default: '' },
        phone: { type: String, default: '' },
        registeredAt: { type: Date, default: Date.now },
      },
    ],
    autoActivatedAt: {
      type: Date,
      default: null,
    },
    autoConcludedAt: {
      type: Date,
      default: null,
    },
    schedulerTriggered: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FlashDeal', flashDealSchema);
