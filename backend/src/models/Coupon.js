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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);
