const mongoose = require('mongoose');

const liveChatMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    userAvatar: {
      type: String,
      default: '',
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    isVendor: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const liveStreamSessionSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      required: true,
      index: true,
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
    streamKey: {
      type: String,
      required: true,
      unique: true,
    },
    playbackUrl: {
      type: String,
      default: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-listening-to-music-with-headphones-40994-large.mp4',
    },
    thumbnailUrl: {
      type: String,
      default: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'LIVE', 'ENDED'],
      default: 'LIVE',
      index: true,
    },
    scheduledStartTime: {
      type: Date,
      default: Date.now,
    },
    actualStartTime: {
      type: Date,
      default: Date.now,
    },
    actualEndTime: {
      type: Date,
      default: null,
    },
    pinnedProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    catalogProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    exclusiveDiscountPercent: {
      type: Number,
      default: 15, // 15% discount during live broadcast
      min: 0,
      max: 90,
    },
    couponCode: {
      type: String,
      default: 'LIVESTREAM15',
      trim: true,
      uppercase: true,
    },
    metrics: {
      concurrentViewers: { type: Number, default: 42 },
      peakViewers: { type: Number, default: 85 },
      totalLikes: { type: Number, default: 312 },
      ordersPlaced: { type: Number, default: 0 },
      totalGmv: { type: Number, default: 0 },
    },
    liveChatMessages: [liveChatMessageSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('LiveStreamSession', liveStreamSessionSchema);
