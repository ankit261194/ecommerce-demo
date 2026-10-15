const mongoose = require('mongoose');

const TieredSlabSchema = new mongoose.Schema(
  {
    minAmount: { type: Number, required: true, default: 0 },
    maxAmount: { type: Number, required: true, default: 999999 },
    percentage: { type: Number, required: true, default: 10 },
  },
  { _id: false }
);

const CommissionRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Rule name is required'],
      trim: true,
      maxlength: 120,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    categorySlug: {
      type: String,
      trim: true,
      lowercase: true,
      default: 'all', // 'all' or specific slug like 'electronics', 'fashion', 'groceries'
      index: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      default: null,
      index: true,
    },
    ruleType: {
      type: String,
      enum: ['PERCENTAGE', 'FIXED_PER_ORDER', 'TIERED_SLAB'],
      default: 'PERCENTAGE',
    },
    percentage: {
      type: Number,
      default: 10,
      min: [0, 'Percentage cannot be negative'],
      max: [100, 'Percentage cannot exceed 100%'],
    },
    fixedFee: {
      type: Number,
      default: 0,
      min: [0, 'Fixed fee cannot be negative'],
    },
    tieredSlabs: {
      type: [TieredSlabSchema],
      default: [],
    },
    minCommission: {
      type: Number,
      default: 0,
      min: [0, 'Minimum commission cannot be negative'],
    },
    maxCommission: {
      type: Number,
      default: 0, // 0 = uncapped
      min: [0, 'Maximum commission cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    priority: {
      type: Number,
      default: 1, // Higher priority matches first
      index: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

CommissionRuleSchema.index({ priority: -1, isActive: 1 });

module.exports = mongoose.model('CommissionRule', CommissionRuleSchema);
