const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  sku: { type: String, required: true },
  name: { type: String, required: true }, // e.g., 'Medium / Midnight Black'
  attributes: {
    size: String,
    color: String,
    colorCode: String,
    ram: String,
    storage: String,
  },
  colorCode: { type: String, default: '#000000' },
  image: { type: String, default: '' },
  additionalPrice: { type: Number, default: 0 },
  mrp: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  stock: { type: Number, required: true, default: 10, min: 0 },
  lowStockThreshold: { type: Number, default: 5 },
});


const productSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    brand: {
      type: String,
      default: 'Generic',
      trim: true,
    },
    images: {
      type: [String],
      validate: [array => array.length > 0, 'At least one product image is required'],
    },
    mrp: {
      type: Number,
      required: [true, 'Maximum Retail Price (MRP) is required'],
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling Price is required'],
    },
    stock: {
      type: Number,
      required: [true, 'Total product stock is required'],
      default: 0,
      min: 0,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    hasVariants: {
      type: Boolean,
      default: false,
    },
    variants: [variantSchema],
    specifications: [
      {
        key: String,
        value: String,
      },
    ],
    ratingsAverage: {
      type: Number,
      default: 4.6,
      min: 1,
      max: 5,
    },
    ratingsQuantity: {
      type: Number,
      default: 12,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isFlashDeal: {
      type: Boolean,
      default: false,
    },
    recentPurchases24h: {
      type: Number,
      default: 18,
    },
    recentViewsPerHour: {
      type: Number,
      default: 85,
    },
    tags: [String],
  },
  { timestamps: true }
);

// Point #51: Auto-calculate total product stock from variants when present
productSchema.pre('save', function (next) {
  if (this.hasVariants && Array.isArray(this.variants) && this.variants.length > 0) {
    this.stock = this.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  }
  next();
});

// Search text index
productSchema.index({ title: 'text', description: 'text', brand: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema);

