const mongoose = require('mongoose');

const keywordTargetSchema = new mongoose.Schema({
  keyword: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  matchType: {
    type: String,
    enum: ['EXACT', 'PHRASE', 'BROAD'],
    default: 'BROAD',
  },
  bidCpc: {
    type: Number,
    required: true,
    min: [0.5, 'Minimum CPC bid is ₹0.50'],
    default: 2.0,
  },
  impressions: {
    type: Number,
    default: 0,
    min: 0,
  },
  clicks: {
    type: Number,
    default: 0,
    min: 0,
  },
  spent: {
    type: Number,
    default: 0,
    min: 0,
  },
  sales: {
    type: Number,
    default: 0,
    min: 0,
  },
  negative: {
    type: Boolean,
    default: false,
  },
});

const adCampaignSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      required: true,
      index: true,
    },
    campaignName: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Sponsored product target is required'],
      index: true,
    },
    targetType: {
      type: String,
      enum: ['PRODUCT', 'CATEGORY', 'BRAND'],
      default: 'PRODUCT',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'],
      default: 'ACTIVE',
      index: true,
    },
    dailyBudget: {
      type: Number,
      required: [true, 'Daily budget is required'],
      min: [50, 'Minimum daily budget is ₹50'],
    },
    totalBudget: {
      type: Number,
      default: 0,
      min: 0,
    },
    spentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    todaySpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastSpentReset: {
      type: Date,
      default: Date.now,
    },
    bidStrategy: {
      type: String,
      enum: ['MANUAL_CPC', 'AUTO_OPTIMIZED'],
      default: 'MANUAL_CPC',
    },
    defaultBidCpc: {
      type: Number,
      required: [true, 'Default CPC bid is required'],
      min: [0.5, 'Minimum CPC bid is ₹0.50'],
      default: 2.0,
    },
    keywords: [keywordTargetSchema],
    placement: {
      type: String,
      enum: ['SEARCH_TOP', 'PRODUCT_DETAIL', 'HOMEPAGE_FEATURED', 'ALL'],
      default: 'ALL',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    metrics: {
      impressions: { type: Number, default: 0, min: 0 },
      clicks: { type: Number, default: 0, min: 0 },
      conversions: { type: Number, default: 0, min: 0 },
      salesRevenue: { type: Number, default: 0, min: 0 },
      ctr: { type: Number, default: 0, min: 0 }, // Click-Through Rate (%)
      roas: { type: Number, default: 0, min: 0 }, // Return On Ad Spend (salesRevenue / spentAmount)
      acos: { type: Number, default: 0, min: 0 }, // Advertising Cost of Sales (%)
    },
  },
  {
    timestamps: true,
  }
);

// Auto-reset daily spent if day changed
adCampaignSchema.methods.checkAndResetDailySpent = function () {
  const now = new Date();
  const lastReset = this.lastSpentReset ? new Date(this.lastSpentReset) : new Date(0);
  const isSameDay =
    now.getFullYear() === lastReset.getFullYear() &&
    now.getMonth() === lastReset.getMonth() &&
    now.getDate() === lastReset.getDate();

  if (!isSameDay) {
    this.todaySpent = 0;
    this.lastSpentReset = now;
  }
};

// Recompute CTR, ROAS, and ACOS
adCampaignSchema.methods.recalculateMetrics = function () {
  const impressions = this.metrics?.impressions || 0;
  const clicks = this.metrics?.clicks || 0;
  const spent = this.spentAmount || 0;
  const sales = this.metrics?.salesRevenue || 0;

  this.metrics.ctr = impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(2)) : 0;
  this.metrics.roas = spent > 0 ? parseFloat((sales / spent).toFixed(2)) : 0;
  this.metrics.acos = sales > 0 ? parseFloat(((spent / sales) * 100).toFixed(2)) : 0;
};

module.exports = mongoose.model('AdCampaign', adCampaignSchema);
