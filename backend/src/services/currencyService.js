const CurrencyConfig = require('../models/CurrencyConfig');

// Standard reference rates against Base Currency (INR)
const DEFAULT_CURRENCIES = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', isBaseCurrency: true, rateAgainstBase: 1.0, decimalPlaces: 2, symbolPlacement: 'BEFORE' },
  { code: 'USD', name: 'US Dollar', symbol: '$', isBaseCurrency: false, rateAgainstBase: 0.012, decimalPlaces: 2, symbolPlacement: 'BEFORE' },
  { code: 'EUR', name: 'Euro', symbol: '€', isBaseCurrency: false, rateAgainstBase: 0.011, decimalPlaces: 2, symbolPlacement: 'BEFORE' },
  { code: 'GBP', name: 'British Pound', symbol: '£', isBaseCurrency: false, rateAgainstBase: 0.0094, decimalPlaces: 2, symbolPlacement: 'BEFORE' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', isBaseCurrency: false, rateAgainstBase: 0.044, decimalPlaces: 2, symbolPlacement: 'BEFORE' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', isBaseCurrency: false, rateAgainstBase: 0.045, decimalPlaces: 2, symbolPlacement: 'BEFORE' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', isBaseCurrency: false, rateAgainstBase: 0.0163, decimalPlaces: 2, symbolPlacement: 'BEFORE' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', isBaseCurrency: false, rateAgainstBase: 0.0182, decimalPlaces: 2, symbolPlacement: 'BEFORE' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', isBaseCurrency: false, rateAgainstBase: 0.0161, decimalPlaces: 2, symbolPlacement: 'BEFORE' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', isBaseCurrency: false, rateAgainstBase: 1.85, decimalPlaces: 0, symbolPlacement: 'BEFORE' },
];

/**
 * Initializes default global currency matrix if empty
 */
const ensureDefaultCurrencies = async () => {
  try {
    const count = await CurrencyConfig.countDocuments();
    if (count === 0) {
      console.log('[CurrencyService] Initializing standard global FX currency matrix...');
      for (const curr of DEFAULT_CURRENCIES) {
        await CurrencyConfig.create(curr);
      }
    }
  } catch (err) {
    console.warn('[CurrencyService] Failed to seed default currencies:', err.message);
  }
};

/**
 * Converts an amount from one currency to another
 */
const convertAmount = async (amount, fromCode = 'INR', toCode = 'USD') => {
  const fromClean = (fromCode || 'INR').trim().toUpperCase();
  const toClean = (toCode || 'INR').trim().toUpperCase();

  if (fromClean === toClean) {
    return {
      convertedAmount: Number(amount),
      rate: 1.0,
      from: fromClean,
      to: toClean,
    };
  }

  await ensureDefaultCurrencies();

  const [fromConfig, toConfig] = await Promise.all([
    CurrencyConfig.findOne({ code: fromClean, isActive: true }),
    CurrencyConfig.findOne({ code: toClean, isActive: true }),
  ]);

  if (!fromConfig) {
    throw new Error(`Source currency '${fromClean}' is not supported or active.`);
  }
  if (!toConfig) {
    throw new Error(`Target currency '${toClean}' is not supported or active.`);
  }

  // 1. Convert source amount to base currency (INR)
  // If base is INR: amountBase = amount / fromConfig.rateAgainstBase
  const amountInBase = Number(amount) / fromConfig.rateAgainstBase;

  // 2. Convert base amount to target currency including markup buffer
  const markupFactor = 1 + (toConfig.rateMarkupPercent || 0) / 100;
  const targetRate = toConfig.rateAgainstBase * markupFactor;
  const converted = amountInBase * targetRate;

  const decimals = toConfig.decimalPlaces !== undefined ? toConfig.decimalPlaces : 2;
  const roundedAmount = Number(converted.toFixed(decimals));
  const effectiveExchangeRate = Number((targetRate / fromConfig.rateAgainstBase).toFixed(6));

  return {
    originalAmount: Number(amount),
    from: fromClean,
    to: toClean,
    convertedAmount: roundedAmount,
    exchangeRate: effectiveExchangeRate,
    symbol: toConfig.symbol,
    decimalPlaces: decimals,
  };
};

/**
 * Formats a currency amount into localized human-readable string
 */
const formatPrice = (amount, currencyConfig) => {
  const val = Number(amount || 0);
  const decimals = currencyConfig?.decimalPlaces ?? 2;
  const formattedVal = val.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const symbol = currencyConfig?.symbol || '₹';
  return currencyConfig?.symbolPlacement === 'AFTER'
    ? `${formattedVal} ${symbol}`
    : `${symbol}${formattedVal}`;
};

module.exports = {
  ensureDefaultCurrencies,
  convertAmount,
  formatPrice,
  DEFAULT_CURRENCIES,
};
