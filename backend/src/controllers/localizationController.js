const LocalizationConfig = require('../models/LocalizationConfig');
const translations = require('../utils/translations');

// Helper: Get or initialize singleton config document
const getOrSeedConfig = async () => {
  let config = await LocalizationConfig.findOne();
  if (!config) {
    config = await LocalizationConfig.create({});
  }
  return config;
};

// @desc    Get Supported Currencies & Live Exchange Rates
// @route   GET /api/localization/currencies
// @access  Public
exports.getCurrenciesAndRates = async (req, res, next) => {
  try {
    const config = await getOrSeedConfig();

    res.status(200).json({
      success: true,
      baseCurrency: config.baseCurrency || 'INR',
      currencies: config.currencies.filter((c) => c.isActive),
      allCurrencies: config.currencies,
      lastRatesUpdated: config.lastRatesUpdated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Real-Time Currency Conversion Utility
// @route   GET /api/localization/convert
// @access  Public
exports.convertCurrency = async (req, res, next) => {
  try {
    const { amount, from = 'INR', to = 'USD' } = req.query;

    if (amount === undefined || isNaN(Number(amount))) {
      return res.status(400).json({
        success: false,
        message: 'Valid numeric amount is required for currency conversion',
      });
    }

    const config = await getOrSeedConfig();
    const fromCode = from.toUpperCase();
    const toCode = to.toUpperCase();

    const fromCurr = config.currencies.find((c) => c.code === fromCode && c.isActive);
    const toCurr = config.currencies.find((c) => c.code === toCode && c.isActive);

    if (!fromCurr) {
      return res.status(400).json({
        success: false,
        message: `Unsupported or inactive source currency: ${fromCode}`,
      });
    }

    if (!toCurr) {
      return res.status(400).json({
        success: false,
        message: `Unsupported or inactive target currency: ${toCode}`,
      });
    }

    const numericAmount = Number(amount);

    // Convert from source currency to base INR, then from base INR to target currency
    // rate is defined as target units per 1 INR (e.g. INR=1, USD=0.012, EUR=0.011, AED=0.044)
    const amountInINR = fromCurr.code === 'INR' ? numericAmount : numericAmount / fromCurr.rate;
    const targetRaw = toCurr.code === 'INR' ? amountInINR : amountInINR * toCurr.rate;

    const decimals = toCurr.decimals !== undefined ? toCurr.decimals : 2;
    const roundedTarget = Number(targetRaw.toFixed(decimals));

    // Formatted string with clean negative sign placement
    const isNegative = roundedTarget < 0;
    const absVal = Math.abs(roundedTarget).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    let formatted = '';
    if (toCurr.position === 'after') {
      formatted = `${isNegative ? '-' : ''}${absVal} ${toCurr.symbol}`;
    } else {
      formatted = `${isNegative ? '-' : ''}${toCurr.symbol}${absVal}`;
    }

    const effectiveRate = Number((targetRaw / numericAmount).toFixed(6));

    res.status(200).json({
      success: true,
      originalAmount: numericAmount,
      fromCurrency: fromCurr.code,
      targetAmount: roundedTarget,
      targetCurrency: toCurr.code,
      formatted,
      symbol: toCurr.symbol,
      rate: effectiveRate,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Supported Languages & Translation Dictionaries
// @route   GET /api/localization/languages
// @access  Public
exports.getLanguages = async (req, res, next) => {
  try {
    const config = await getOrSeedConfig();

    res.status(200).json({
      success: true,
      defaultLanguage: config.defaultLanguage || 'en',
      languages: config.languages.filter((l) => l.isActive),
      allLanguages: config.languages,
      translations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Specific Locale Translations
// @route   GET /api/localization/translations/:lang
// @access  Public
exports.getLocaleTranslations = async (req, res, next) => {
  try {
    const lang = (req.params.lang || 'en').toLowerCase();
    const dictionary = translations[lang] || translations.en;

    res.status(200).json({
      success: true,
      language: lang,
      translations: dictionary,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Exchange Rates (Super Admin)
// @route   PUT /api/admin/localization/rates
// @access  Private (Super Admin)
exports.updateRates = async (req, res, next) => {
  try {
    const { rates } = req.body; // e.g. { USD: 0.0125, EUR: 0.0115, AED: 0.045 }

    if (!rates || typeof rates !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Object containing currency rates is required',
      });
    }

    const config = await getOrSeedConfig();

    const baseCode = (config.baseCurrency || 'INR').toUpperCase();
    for (const [code, rateVal] of Object.entries(rates)) {
      const numRate = Number(rateVal);
      const upperCode = code.toUpperCase();
      // Base currency rate is anchored at 1.0 and cannot be altered
      if (upperCode === baseCode) {
        continue;
      }
      if (numRate > 0) {
        const curr = config.currencies.find((c) => c.code === upperCode);
        if (curr) {
          curr.rate = numRate;
        }
      }
    }

    config.lastRatesUpdated = new Date();
    await config.save();

    res.status(200).json({
      success: true,
      message: 'Currency exchange rates updated successfully!',
      currencies: config.currencies,
      lastRatesUpdated: config.lastRatesUpdated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Localization Settings & Supported Languages (Super Admin)
// @route   PUT /api/admin/localization/settings
// @access  Private (Super Admin)
exports.updateSettings = async (req, res, next) => {
  try {
    const { defaultLanguage, baseCurrency, currencies, languages } = req.body;

    const config = await getOrSeedConfig();

    if (defaultLanguage) config.defaultLanguage = defaultLanguage;
    if (baseCurrency) config.baseCurrency = baseCurrency.toUpperCase();
    if (Array.isArray(currencies)) config.currencies = currencies;
    if (Array.isArray(languages)) config.languages = languages;

    await config.save();

    res.status(200).json({
      success: true,
      message: 'Localization settings updated successfully!',
      data: config,
    });
  } catch (error) {
    next(error);
  }
};
