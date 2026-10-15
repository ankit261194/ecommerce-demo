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
    thumbnail: {
      type: String,
      default: '',
    },
    gallery: {
      type: [String],
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
    mrp: {
      type: Number,
      required: [true, 'Maximum Retail Price (MRP) is required'],
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling Price is required'],
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    savingsAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    stock: {
      type: Number,
      required: [true, 'Total product stock is required'],
      default: 0,
      min: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
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
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Point #53: Virtuals for dynamic discount calculations
productSchema.virtual('calculatedDiscountPercentage').get(function () {
  if (!this.mrp || this.mrp <= this.sellingPrice) return 0;
  return Math.round(((this.mrp - this.sellingPrice) / this.mrp) * 100);
});

productSchema.virtual('calculatedSavings').get(function () {
  if (!this.mrp || this.mrp <= this.sellingPrice) return 0;
  return Math.max(0, this.mrp - this.sellingPrice);
});

// Point #54: Low Stock Alert Virtuals
productSchema.virtual('isLowStock').get(function () {
  return this.stock > 0 && this.stock <= (this.lowStockThreshold !== undefined ? this.lowStockThreshold : 5);
});

productSchema.virtual('isOutOfStock').get(function () {
  return this.stock <= 0;
});

// Point #51: Auto-calculate total product stock from variants when present
// Point #52: Synchronize primary thumbnail & gallery photos
// Point #53: Auto-calculate discount percentage & customer savings
productSchema.pre('save', function (next) {
  if (this.hasVariants && Array.isArray(this.variants) && this.variants.length > 0) {
    this.stock = this.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  }

  // Point #52: Thumbnail & Gallery Sync
  if (this.thumbnail && typeof this.thumbnail === 'string' && this.thumbnail.trim()) {
    const cleanGallery = Array.isArray(this.gallery) ? this.gallery.filter(img => img && img.trim() && img !== this.thumbnail) : [];
    this.gallery = cleanGallery;
    this.images = [this.thumbnail, ...cleanGallery];
  } else if (Array.isArray(this.images) && this.images.length > 0) {
    this.thumbnail = this.images[0];
    this.gallery = this.images.slice(1);
  } else if (Array.isArray(this.gallery) && this.gallery.length > 0) {
    this.thumbnail = this.gallery[0];
    this.gallery = this.gallery.slice(1);
    this.images = [this.thumbnail, ...this.gallery];
  } else {
    this.thumbnail = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';
    this.gallery = [];
    this.images = [this.thumbnail];
  }

  // Point #53: MRP vs Selling Discount Calculation
  if (typeof this.sellingPrice === 'number') {
    if (!this.mrp || this.mrp < this.sellingPrice) {
      this.mrp = this.sellingPrice;
    }
    const savings = Math.max(0, this.mrp - this.sellingPrice);
    this.savingsAmount = savings;
    this.discountPercentage = this.mrp > 0 ? Math.round((savings / this.mrp) * 100) : 0;
  }

  next();
});

// Search text index
productSchema.index({ title: 'text', description: 'text', brand: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema);

