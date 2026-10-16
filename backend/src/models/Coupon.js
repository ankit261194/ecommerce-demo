const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Coupon title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    discountType: {
      type: String,
      enum: ['PERCENTAGE', 'FLAT'],
      default: 'PERCENTAGE',
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Discount value must be positive'],
    },
    maxDiscountAmount: {
      type: Number,
      default: null, // Cap for percentage discounts
    },
    minOrderAmount: {
      type: Number,
      default: 0,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    usageLimit: {
      type: Number,
      default: null, // Total maximum usages allowed across all customers
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    perUserLimit: {
      type: Number,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: true,
    },
    applicableVendors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VendorProfile',
      },
    ],
    applicableCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    // Point 11: Vendor-Funded Custom Promotions & BOGO Engine
    fundingSource: {
      type: String,
      enum: ['PLATFORM', 'VENDOR'],
      default: 'PLATFORM',
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      default: null,
    },
    promotionType: {
      type: String,
      enum: ['DISCOUNT_CODE', 'BOGO', 'BUY_X_GET_Y', 'STORE_VOUCHER'],
      default: 'DISCOUNT_CODE',
    },
    bogoConfig: {
      buyQty: { type: Number, default: 1, min: 1 },
      getQty: { type: Number, default: 1, min: 1 },
      discountPercentage: { type: Number, default: 100, min: 0, max: 100 },
      applicableProducts: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
      ],
    },
    storeWide: {
      type: Boolean,
      default: false,
    },
    totalDiscountGiven: {
      type: Number,
      default: 0,
    },
    ordersDrivenCount: {
      type: Number,
      default: 0,
    },
    bannerBadge: {
      enabled: { type: Boolean, default: false },
      badgeText: { type: String, default: '' },
      badgeColor: { type: String, default: '#DC2626' },
      bannerMessage: { type: String, default: '' },
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

couponSchema.virtual('discountAmount').get(function () {
  return this.discountValue;
});

module.exports = mongoose.model('Coupon', couponSchema);
