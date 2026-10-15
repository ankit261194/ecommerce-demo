const mongoose = require('mongoose');

const sizeMeasurementSchema = new mongoose.Schema({
  size: { type: String, required: true }, // e.g. XS, S, M, L, XL, 2XL, UK 7, etc.
  chest_cm: { type: String, default: '-' },
  chest_in: { type: String, default: '-' },
  waist_cm: { type: String, default: '-' },
  waist_in: { type: String, default: '-' },
  hip_cm: { type: String, default: '-' },
  hip_in: { type: String, default: '-' },
  length_cm: { type: String, default: '-' },
  length_in: { type: String, default: '-' },
  foot_cm: { type: String, default: '-' },
  foot_in: { type: String, default: '-' },
  us_size: { type: String, default: '-' },
  eu_size: { type: String, default: '-' },
  uk_size: { type: String, default: '-' },
}, { _id: false });

const sizeChartSchema = new mongoose.Schema({
  categoryKey: {
    type: String,
    required: true,
    unique: true,
    index: true,
  }, // e.g. 'men-shirts', 'men-pants', 'women-dresses', 'women-pants', 'shoes', 'kids'
  title: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    enum: ['men', 'women', 'kids', 'unisex'],
    default: 'unisex',
  },
  type: {
    type: String,
    enum: ['apparel-top', 'apparel-bottom', 'footwear', 'kids'],
    default: 'apparel-top',
  },
  measurements: [sizeMeasurementSchema],
  howToMeasure: [{
    part: { type: String, required: true },
    tip: { type: String, required: true },
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('SizeChart', sizeChartSchema);
