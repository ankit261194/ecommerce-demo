const mongoose = require('mongoose');

const WrapDesignSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    default: 49,
  },
  color: {
    type: String,
    default: '#f59e0b',
  },
  previewImage: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

const CardThemeSchema = new mongoose.Schema({
  theme: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    default: '🎁',
  },
  defaultMessage: {
    type: String,
    default: 'Wishing you joy and wonderful moments!',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

const GiftWrapConfigSchema = new mongoose.Schema(
  {
    isEnabled: {
      type: Boolean,
      default: true,
    },
    basePrice: {
      type: Number,
      default: 49,
      min: 0,
    },
    freeThreshold: {
      type: Number,
      default: 1999, // Orders above ₹1,999 get free gift wrapping
      min: 0,
    },
    allowHidePrice: {
      type: Boolean,
      default: true,
    },
    maxMessageLength: {
      type: Number,
      default: 250,
      min: 50,
      max: 1000,
    },
    designs: [WrapDesignSchema],
    cardThemes: [CardThemeSchema],
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('GiftWrapConfig', GiftWrapConfigSchema);
