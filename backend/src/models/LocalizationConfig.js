const mongoose = require('mongoose');

const currencyItemSchema = new mongoose.Schema({
  code: { type: String, required: true, uppercase: true, trim: true },
  name: { type: String, required: true },
  symbol: { type: String, required: true },
  flag: { type: String, default: '' },
  rate: { type: Number, required: true, min: 0.000001 },
  decimals: { type: Number, default: 2 },
  position: { type: String, enum: ['before', 'after'], default: 'before' },
  isActive: { type: Boolean, default: true },
});

const languageItemSchema = new mongoose.Schema({
  code: { type: String, required: true, lowercase: true, trim: true },
  name: { type: String, required: true },
  nativeName: { type: String, required: true },
  flag: { type: String, default: '' },
  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
});

const localizationConfigSchema = new mongoose.Schema(
  {
    baseCurrency: { type: String, default: 'INR' },
    defaultLanguage: { type: String, default: 'en' },
    currencies: {
      type: [currencyItemSchema],
      default: [
        {
          code: 'INR',
          name: 'Indian Rupee',
          symbol: '₹',
          flag: '🇮🇳',
          rate: 1.0,
          decimals: 0,
          position: 'before',
          isActive: true,
        },
        {
          code: 'USD',
          name: 'US Dollar',
          symbol: '$',
          flag: '🇺🇸',
          rate: 0.012,
          decimals: 2,
          position: 'before',
          isActive: true,
        },
        {
          code: 'EUR',
          name: 'Euro',
          symbol: '€',
          flag: '🇪🇺',
          rate: 0.011,
          decimals: 2,
          position: 'before',
          isActive: true,
        },
        {
          code: 'AED',
          name: 'UAE Dirham',
          symbol: 'AED ',
          flag: '🇦🇪',
          rate: 0.044,
          decimals: 2,
          position: 'before',
          isActive: true,
        },
      ],
    },
    languages: {
      type: [languageItemSchema],
      default: [
        {
          code: 'en',
          name: 'English',
          nativeName: 'English',
          flag: '🇺🇸',
          isDefault: true,
          isActive: true,
        },
        {
          code: 'hi',
          name: 'Hindi',
          nativeName: 'हिन्दी',
          flag: '🇮🇳',
          isDefault: false,
          isActive: true,
        },
      ],
    },
    lastRatesUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LocalizationConfig', localizationConfigSchema);
