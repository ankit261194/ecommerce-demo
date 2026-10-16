const mongoose = require('mongoose');

const GstSlabSchema = new mongoose.Schema(
  {
    rate: {
      type: Number,
      required: true,
      enum: [0, 5, 12, 18, 28],
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const HsnMappingSchema = new mongoose.Schema(
  {
    hsnCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    gstRate: {
      type: Number,
      required: true,
      enum: [0, 5, 12, 18, 28],
      default: 18,
    },
    cessRate: {
      type: Number,
      default: 0,
    },
    isExempt: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const TaxMatrixSchema = new mongoose.Schema(
  {
    isGstEnabled: {
      type: Boolean,
      default: true,
    },
    calculationMode: {
      type: String,
      enum: ['INCLUSIVE', 'EXCLUSIVE'],
      default: 'INCLUSIVE',
    },
    adminBusinessState: {
      type: String,
      default: 'Delhi',
      trim: true,
    },
    adminStateCode: {
      type: String,
      default: '07',
      trim: true,
    },
    adminGstin: {
      type: String,
      default: '07AAAAA0000A1Z5',
      trim: true,
    },
    panNumber: {
      type: String,
      default: 'AAAAA0000A',
      trim: true,
    },
    autoInterstateIgst: {
      type: Boolean,
      default: true,
    },
    reverseChargeMechanism: {
      type: Boolean,
      default: false,
    },
    slabs: {
      type: [GstSlabSchema],
      default: [
        { rate: 0, name: 'Nil / Exempt (0%)', description: 'Essential fresh groceries, unprocessed foods, books, grains', isActive: true, isDefault: false },
        { rate: 5, name: 'Essential Goods (5%)', description: 'Packaged food staples, footwear under ₹1,000, cotton apparel, edible oils', isActive: true, isDefault: false },
        { rate: 12, name: 'Standard Low (12%)', description: 'Processed foods, business computers, mobile accessories, dairy products', isActive: true, isDefault: false },
        { rate: 18, name: 'Standard Standard (18%)', description: 'Electronics, headphones, IT hardware, footwear > ₹1,000, industrial components', isActive: true, isDefault: true },
        { rate: 28, name: 'Luxury & Sin (28%)', description: 'High-end luxury smart electronics, automobiles, air conditioners, aerated drinks', isActive: true, isDefault: false },
      ],
    },
    hsnMappings: {
      type: [HsnMappingSchema],
      default: [
        { hsnCode: '85183000', category: 'Electronics', description: 'Headphones, earphones and acoustic sound headsets', gstRate: 18, cessRate: 0, isExempt: false },
        { hsnCode: '85176290', category: 'Wearables', description: 'Smartwatches, wireless communicators & wearable gadgets', gstRate: 18, cessRate: 0, isExempt: false },
        { hsnCode: '85044090', category: 'Accessories', description: 'Power banks, fast chargers and static converters', gstRate: 18, cessRate: 0, isExempt: false },
        { hsnCode: '61091000', category: 'Fashion & Apparel', description: 'T-shirts, singlets and vests of cotton, knitted or crocheted', gstRate: 5, cessRate: 0, isExempt: false },
        { hsnCode: '64039990', category: 'Footwear', description: 'Footwear with outer soles of rubber/plastic and leather upper', gstRate: 12, cessRate: 0, isExempt: false },
        { hsnCode: '91021100', category: 'Watches', description: 'Wrist-watches with mechanical or electronic display', gstRate: 18, cessRate: 0, isExempt: false },
        { hsnCode: '85287219', category: 'Home Entertainment', description: '4K Ultra-HD Smart televisions and smart displays', gstRate: 28, cessRate: 0, isExempt: false },
        { hsnCode: '04090000', category: 'Organic Foods', description: 'Natural organic honey and unprocessed farm goods', gstRate: 0, cessRate: 0, isExempt: true },
      ],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.TaxMatrix || mongoose.model('TaxMatrix', TaxMatrixSchema);
