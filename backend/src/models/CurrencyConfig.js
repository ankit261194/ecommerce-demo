const mongoose = require('mongoose');

const currencyConfigSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    symbol: {
      type: String,
      required: true,
      trim: true,
    },
    isBaseCurrency: {
      type: Boolean,
      default: false,
    },
    // Multiplier: 1 Base Currency unit * rateAgainstBase = Currency amount
    rateAgainstBase: {
      type: Number,
      required: true,
      min: 0.000001,
      default: 1.0,
    },
    // Safety markup percentage (e.g. 1.5% FX risk buffer)
    rateMarkupPercent: {
      type: Number,
      default: 0.0,
      min: 0,
      max: 20,
    },
    decimalPlaces: {
      type: Number,
      default: 2,
      min: 0,
      max: 4,
    },
    symbolPlacement: {
      type: String,
      enum: ['BEFORE', 'AFTER'],
      default: 'BEFORE',
    },
    thousandsSeparator: {
      type: String,
      default: ',',
    },
    decimalSeparator: {
      type: String,
      default: '.',
    },
    autoUpdate: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

currencyConfigSchema.index({ code: 1, isActive: 1 });

module.exports = mongoose.model('CurrencyConfig', currencyConfigSchema);
