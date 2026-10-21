const mongoose = require('mongoose');

const vendorSubscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    badge: {
      type: String,
      default: '', // e.g. 'MOST POPULAR', 'ENTERPRISE', 'BEST VALUE'
    },
    pricing: {
      monthly: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      yearly: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      currency: {
        type: String,
        default: 'INR',
      },
    },
    features: {
      maxProducts: {
        type: Number,
        default: 50, // -1 means unlimited
      },
      commissionRatePercent: {
        type: Number,
        default: 12.0, // Platform commission cut
        min: 0,
        max: 100,
      },
      featuredStoreBadge: {
        type: Boolean,
        default: false,
      },
      prioritySupport24x7: {
        type: Boolean,
        default: false,
      },
      customDomainAllowed: {
        type: Boolean,
        default: false,
      },
      analyticsRetentionDays: {
        type: Number,
        default: 30,
      },
      posTerminalsIncluded: {
        type: Number,
        default: 1,
      },
      bulkCsvImportLimit: {
        type: Number,
        default: 100,
      },
      marketingCampaignsPerMonth: {
        type: Number,
        default: 1,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    orderIndex: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('VendorSubscriptionPlan', vendorSubscriptionPlanSchema);
