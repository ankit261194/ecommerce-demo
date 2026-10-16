const mongoose = require('mongoose');

const shoppableReelSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Reel title is required'],
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    videoUrl: {
      type: String,
      required: [true, 'Video URL is required'],
      trim: true,
    },
    thumbnailUrl: {
      type: String,
      trim: true,
      default: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600',
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      default: null,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        tagX: {
          type: Number,
          default: 50, // percentage from left
        },
        tagY: {
          type: Number,
          default: 70, // percentage from top
        },
        customPrice: {
          type: Number,
          default: null,
        },
        isFeatured: {
          type: Boolean,
          default: true,
        },
      },
    ],
    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    viewsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null,
        },
        userName: {
          type: String,
          default: 'Valued Shopper',
        },
        text: {
          type: String,
          required: true,
          trim: true,
          maxlength: 300,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    status: {
      type: String,
      enum: ['ACTIVE', 'SCHEDULED', 'ARCHIVED'],
      default: 'ACTIVE',
    },
    isLive: {
      type: Boolean,
      default: false,
    },
    liveViewerCount: {
      type: Number,
      default: 0,
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

shoppableReelSchema.index({ status: 1, isLive: 1, createdAt: -1 });

module.exports = mongoose.model('ShoppableReel', shoppableReelSchema);
