const mongoose = require('mongoose');

const pushCampaignSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
      default: '/favicon.ico',
    },
    badge: {
      type: String,
      default: '',
    },
    image: {
      type: String,
      default: '',
    },
    targetUrl: {
      type: String,
      default: '/',
    },
    targetAudience: {
      type: String,
      enum: ['all', 'customers', 'vendors', 'active_orders', 'abandoned_cart'],
      default: 'all',
    },
    actions: [
      {
        action: { type: String, default: 'open' },
        title: { type: String, default: 'View Deal' },
        icon: { type: String, default: '' },
      },
    ],
    sentCount: {
      type: Number,
      default: 0,
    },
    successCount: {
      type: Number,
      default: 0,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    clickCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'partial_failure', 'failed'],
      default: 'sent',
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

pushCampaignSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PushCampaign', pushCampaignSchema);
