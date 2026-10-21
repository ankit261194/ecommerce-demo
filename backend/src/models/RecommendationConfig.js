const mongoose = require('mongoose');

const recommendationConfigSchema = new mongoose.Schema(
  {
    algorithmWeights: {
      collaborative: { type: Number, default: 0.40, min: 0, max: 1 },
      contentSimilarity: { type: Number, default: 0.30, min: 0, max: 1 },
      salesVelocity: { type: Number, default: 0.20, min: 0, max: 1 },
      userRecency: { type: Number, default: 0.10, min: 0, max: 1 },
    },
    bundleDiscountPercent: {
      type: Number,
      default: 10.0,
      min: 0,
      max: 50,
    },
    minCoOccurrenceForBundle: {
      type: Number,
      default: 1,
      min: 1,
    },
    maxRecommendationsPerShelf: {
      type: Number,
      default: 12,
      min: 4,
      max: 50,
    },
    isAutoRecalculationEnabled: {
      type: Boolean,
      default: true,
    },
    lastRecalculatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('RecommendationConfig', recommendationConfigSchema);
