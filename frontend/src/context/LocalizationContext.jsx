import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import api from '../api/client';

const LocalizationContext = createContext();

const defaultRates = {
  INR: 1.0,
  USD: 0.012,
  EUR: 0.011,
  AED: 0.044,
};

const defaultCurrencies = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', rate: 1.0, decimals: 0, position: 'before' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', rate: 0.012, decimals: 2, position: 'before' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', rate: 0.011, decimals: 2, position: 'before' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED ', flag: '🇦🇪', rate: 0.044, decimals: 2, position: 'before' },
];

const defaultLanguages = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
];

const fallbackTranslations = {
  en: {
    brandName: 'AuraMarket',
    brandTagline: 'Next-Gen Multi-Vendor Commerce Platform',
    home: 'Home',
    explore: 'Explore',
    categories: 'Categories',
    stores: 'Verified Stores',
    orders: 'My Orders',
    trackOrder: 'Track Order',
    cart: 'Cart',
    wallet: 'Wallet',
    deals: 'Flash Deals',
    searchPlaceholder: 'Search 10,000+ luxury electronics, watches, audio & apparel...',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    myAccount: 'My Account',
    adminPanel: 'Super Admin',
    vendorPortal: 'Vendor Portal',
    riderHub: 'Delivery Rider',
    currency: 'Currency',
    language: 'Language',
    shopNow: 'Shop Trending Deals',
    exploreCategories: 'Browse Categories',
    featuredProducts: 'Featured Products',
    topVendors: 'Verified Merchant Partners',
    flashSales: 'Live Flash Deals',
    endingSoon: 'Ending Soon',
    freeShippingBanner: 'Free express shipping on all orders over ₹999!',
    addToCart: 'Add to Cart',
    buyNow: 'Buy Now',
    addedToCart: 'Added to Cart!',
    inStock: 'In Stock',
    outOfStock: 'Out of Stock',
    off: 'OFF',
    save: 'Save',
    rating: 'Rating',
    reviews: 'Reviews',
    seller: 'Sold By',
    hsnCode: 'HSN Code',
    taxInclusive: 'Inclusive of all taxes',
    yourCart: 'Your Shopping Cart',
    itemsInCart: 'items in cart',
    emptyCart: 'Your cart is empty',
    startShopping: 'Start Shopping',
    splitByVendor: 'Order automatically split by verified merchant store',
    subtotal: 'Cart Subtotal',
    shippingFee: 'Shipping & Delivery',
    free: 'FREE',
    estimatedTax: 'Estimated Tax (GST/VAT)',
    discount: 'Discount Applied',
    totalPayable: 'Grand Total Payable',
    proceedToCheckout: 'Proceed to Secure Checkout',
    remove: 'Remove',
    quantity: 'Qty',
    deliveryAddress: 'Delivery Address',
    changeAddress: 'Change Address',
    recipientName: 'Recipient Full Name',
    phoneNumber: 'Phone Number',
    deliveryInstructions: 'Rider Delivery Notes (Optional)',
    paymentMethod: 'Select Payment Gateway',
    cashOnDelivery: 'Cash on Delivery (COD)',
    payWithRazorpay: 'Razorpay UPI & Cards',
    payWithStripe: 'Stripe Global Card',
    directUpiQr: 'Direct UPI Instant QR (0% Fee)',
    applyCoupon: 'Apply Promo Coupon',
    apply: 'Apply',
    placeOrder: 'Place Order & Book Delivery',
    orderConfirmed: 'Order Confirmed!',
    orderNumber: 'Order Number',
    secretDeliveryOtp: 'Secret Delivery OTP',
    trackShipment: 'Track Live Shipment',
    viewInvoice: 'Download Tax Invoice',
    authentic: '100% Genuine',
    securePayment: '256-Bit SSL Secure',
    expressDelivery: 'Express 24H Dispatch',
    easyReturns: '7-Day Easy Returns',
    close: 'Close',
  },
  hi: {
    brandName: 'ऑरा मार्केट',
    brandTagline: 'नेक्स्ट-जेन मल्टी-वेंडर ई-कॉमर्स प्लेटफॉर्म',
    home: 'होम',
    explore: 'एक्सप्लोर',
    categories: 'श्रेणियां',
    stores: 'सत्यापित दुकानें',
    orders: 'मेरे ऑर्डर्स',
    trackOrder: 'ऑर्डर ट्रैक करें',
    cart: 'कार्ट',
    wallet: 'वॉलेट',
    deals: 'फ्लैश डील्स',
    searchPlaceholder: '10,000+ प्रीमियम इलेक्ट्रॉनिक्स, घड़ियां, ऑडियो एवं फैशन खोजें...',
    signIn: 'साइन इन',
    signOut: 'लॉग आउट',
    myAccount: 'मेरा खाता',
    adminPanel: 'सुपर एडमिन',
    vendorPortal: 'विक्रेता पोर्टल',
    riderHub: 'डिलीवरी राइडर',
    currency: 'मुद्रा',
    language: 'भाषा',
    shopNow: 'ट्रेंडिंग डील्स खरीदें',
    exploreCategories: 'श्रेणियां देखें',
    featuredProducts: 'विशेष उत्पाद',
    topVendors: 'सत्यापित मर्चेंट पार्टनर्स',
    flashSales: 'लाइव फ्लैश डील्स',
    endingSoon: 'जल्द समाप्त',
    freeShippingBanner: '₹999 से अधिक के सभी ऑर्डर पर मुफ्त एक्सप्रेस डिलीवरी!',
    addToCart: 'कार्ट में जोड़ें',
    buyNow: 'अभी खरीदें',
    addedToCart: 'कार्ट में जोड़ा गया!',
    inStock: 'उपलब्ध है',
    outOfStock: 'स्टॉक समाप्त',
    off: 'छूट',
    save: 'बचत',
    rating: 'रेटिंग',
    reviews: 'समीक्षाएं',
    seller: 'विक्रेता',
    hsnCode: 'एचएसएन कोड',
    taxInclusive: 'सभी कर सहित',
    yourCart: 'आपकी शॉपिंग कार्ट',
    itemsInCart: 'कार्ट में सामान',
    emptyCart: 'आपकी कार्ट खाली है',
    startShopping: 'खरीदारी शुरू करें',
    splitByVendor: 'ऑर्डर स्वचालित रूप से विक्रेता के अनुसार विभाजित',
    subtotal: 'कार्ट उप-कुल',
    shippingFee: 'शिपिंग एवं डिलीवरी',
    free: 'मुफ़्त',
    estimatedTax: 'अनुमानित कर (जीएसटी)',
    discount: 'लागू छूट',
    totalPayable: 'कुल देय राशि',
    proceedToCheckout: 'चेकआउट के लिए आगे बढ़ें',
    remove: 'हटाएं',
    quantity: 'मात्रा',
    deliveryAddress: 'डिलीवरी का पता',
    changeAddress: 'पता बदलें',
    recipientName: 'प्राप्तकर्ता का नाम',
    phoneNumber: 'मोबाइल नंबर',
    deliveryInstructions: 'राइडर के लिए निर्देश (वैकल्पिक)',
    paymentMethod: 'भुगतान विकल्प चुनें',
    cashOnDelivery: 'कैश ऑन डिलीवरी (सीओडी)',
    payWithRazorpay: 'रेज़रपे यूपीआई और कार्ड',
    payWithStripe: 'स्ट्राइप इंटरनेशनल कार्ड',
    directUpiQr: 'डायरेक्ट यूपीआई क्यूआर (0% शुल्क)',
    applyCoupon: 'प्रोमो कूपन लागू करें',
    apply: 'लागू करें',
    placeOrder: 'ऑर्डर बुक करें',
    orderConfirmed: 'ऑर्डर सफलतापूर्वक दर्ज हुआ!',
    orderNumber: 'ऑर्डर संख्या',
    secretDeliveryOtp: 'गोपनीय डिलीवरी ओटीपी',
    trackShipment: 'लाइव शिपमेंट ट्रैक करें',
    viewInvoice: 'टैक्स इनवॉइस डाउनलोड करें',
    authentic: '100% असली उत्पाद',
    securePayment: '256-बिट सुरक्षित भुगतान',
    expressDelivery: 'एक्सप्रेस 24 घंटे में डिस्पैच',
    easyReturns: '7 दिनों में आसान वापसी',
    close: 'बंद करें',
  },
};

export const LocalizationProvider = ({ children }) => {
  const [currency, setCurrencyState] = useState(() => {
    return localStorage.getItem('auramarket_currency') || 'INR';
  });

  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('auramarket_language') || 'en';
  });

  const [currencies, setCurrencies] = useState(defaultCurrencies);
  const [languages, setLanguages] = useState(defaultLanguages);
  const [translationsDict, setTranslationsDict] = useState(fallbackTranslations);

  // Sync with backend on mount
  useEffect(() => {
    api
      .get('/localization/currencies')
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.currencies)) {
          setCurrencies(res.data.currencies);
        }
      })
      .catch(() => {});

    api
      .get('/localization/languages')
      .then((res) => {
        if (res.data?.success) {
          if (Array.isArray(res.data.languages)) {
            setLanguages(res.data.languages);
          }
          if (res.data.translations) {
            setTranslationsDict(res.data.translations);
          }
        }
      })
      .catch(() => {});
  }, []);

  const setCurrency = (code) => {
    const upper = code.toUpperCase();
    setCurrencyState(upper);
    localStorage.setItem('auramarket_currency', upper);
  };

  const setLanguage = (code) => {
    const lower = code.toLowerCase();
    setLanguageState(lower);
    localStorage.setItem('auramarket_language', lower);
  };

  const activeCurrencyConfig = useMemo(() => {
    return currencies.find((c) => c.code === currency) || currencies[0] || defaultCurrencies[0];
  }, [currencies, currency]);

  // Real-time Price Formatter converts from Base INR to Active Currency
  const formatPrice = (amountInINR, showCode = false) => {
    if (amountInINR === undefined || amountInINR === null || isNaN(Number(amountInINR))) {
      return `${activeCurrencyConfig.symbol}0`;
    }

    const num = Number(amountInINR);
    const rate = activeCurrencyConfig.rate || 1.0;
    const converted = activeCurrencyConfig.code === 'INR' ? num : num * rate;
    const decimals = activeCurrencyConfig.decimals !== undefined ? activeCurrencyConfig.decimals : 2;

    const isNegative = converted < 0;
    const absConverted = Math.abs(converted);

    const formattedNum = absConverted.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    let display = '';
    if (activeCurrencyConfig.position === 'after') {
      display = `${isNegative ? '-' : ''}${formattedNum} ${activeCurrencyConfig.symbol}`;
    } else {
      display = `${isNegative ? '-' : ''}${activeCurrencyConfig.symbol}${formattedNum}`;
    }

    if (showCode && activeCurrencyConfig.code !== 'INR') {
      display += ` (${activeCurrencyConfig.code})`;
    }

    return display;
  };

  // Translation Function with parameter interpolation support
  const t = (key, fallback = '', params = {}) => {
    const dict = translationsDict[language] || translationsDict.en || fallbackTranslations.en;
    let result = '';
    if (dict && dict[key] !== undefined) {
      result = dict[key];
    } else {
      const enDict = translationsDict.en || fallbackTranslations.en;
      if (enDict && enDict[key] !== undefined) {
        result = enDict[key];
      } else {
        result = fallback || key;
      }
    }

    if (params && typeof params === 'object') {
      for (const [pKey, pVal] of Object.entries(params)) {
        result = result.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
      }
    }

    return result;
  };

  return (
    <LocalizationContext.Provider
      value={{
        currency,
        setCurrency,
        language,
        setLanguage,
        currencies,
        languages,
        activeCurrencyConfig,
        formatPrice,
        t,
      }}
    >
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = () => useContext(LocalizationContext);
export default LocalizationContext;
