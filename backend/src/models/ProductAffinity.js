const mongoose = require('mongoose');

const productAffinitySchema = new mongoose.Schema(
  {
    productA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    productB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    coOccurrenceCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    affinityScore: {
      type: Number,
      default: 0.0,
      min: 0.0,
      max: 1.0,
    },
    affinityType: {
      type: String,
      enum: ['BOUGHT_TOGETHER', 'VIEWED_TOGETHER', 'SIMILAR_ATTRIBUTES'],
      default: 'BOUGHT_TOGETHER',
    },
    bundledDiscountPercent: {
      type: Number,
      default: 10.0,
      min: 0.0,
      max: 50.0,
    },
    lastCalculated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

productAffinitySchema.index({ productA: 1, productB: 1, affinityType: 1 }, { unique: true });
productAffinitySchema.index({ productA: 1, affinityScore: -1 });

module.exports = mongoose.model('ProductAffinity', productAffinitySchema);
