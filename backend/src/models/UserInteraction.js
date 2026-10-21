const mongoose = require('mongoose');

const userInteractionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    interactionType: {
      type: String,
      enum: ['VIEW', 'ADD_TO_CART', 'WISHLIST', 'PURCHASE', 'SEARCH_CLICK'],
      required: true,
    },
    weight: {
      type: Number,
      required: true,
      default: 1, // VIEW=1, SEARCH_CLICK=2, WISHLIST=3, ADD_TO_CART=4, PURCHASE=5
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

userInteractionSchema.index({ user: 1, timestamp: -1 });
userInteractionSchema.index({ sessionId: 1, timestamp: -1 });
userInteractionSchema.index({ product: 1, interactionType: 1 });

module.exports = mongoose.model('UserInteraction', userInteractionSchema);
