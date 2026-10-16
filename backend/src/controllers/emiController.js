const EmiConfig = require('../models/EmiConfig');
const AuditLog = require('../models/AuditLog');

/**
 * Seed default EMI & BNPL configuration if not present in database
 */
const getDefaultConfigData = () => {
  return {
    isEnabled: true,
    minOrderAmount: 2500,
    noCostEmiEnabled: true,
    subsidizedBy: 'PLATFORM',
    subventionPlatformShare: 100,
    defaultProcessingFee: 199,
    processingFeeGstRate: 18,
    bannerMessage: 'No Cost EMI available on major Credit Cards & Bajaj Finserv. Starting at ₹%minEmi%/mo!',
    faqItems: [
      {
        question: 'What is No Cost EMI?',
        answer: 'No Cost EMI is an easy financing option where the total interest charged by the bank is provided as an upfront instant discount at checkout. You pay only the original price of the product split equally across your chosen tenure, with 0% extra interest.',
      },
      {
        question: 'How does the bank charge interest if it is No Cost?',
        answer: 'Your bank card statement will show the standard EMI schedule including interest, but because AuraMarket provides an instant upfront discount equal to the total interest on your product invoice, your net effective outflow equals the original item price.',
      },
      {
        question: 'Are there any processing fees for EMI?',
        answer: 'Most banks charge a one-time nominal processing fee (typically ₹199 + 18% GST = ₹234.82) on your first credit card statement. Bajaj Finserv Insta EMI card charges ₹117 one-time fee.',
      },
      {
        question: 'Which debit cards are eligible for EMI?',
        answer: 'Pre-approved debit cards from HDFC Bank, ICICI Bank, Axis Bank, and State Bank of India support EMI. To check eligibility, SMS DCEMI <last 4 digits> to your bank.',
      },
      {
        question: 'How does Buy Now Pay Later (BNPL) work?',
        answer: 'BNPL partners like Simpl, LazyPay, and Snapmint allow you to split purchases into 3 or 4 interest-free installments, or pay the full amount after 30 days without needing a credit card.',
      },
    ],
    banks: [
      {
        bankCode: 'HDFC',
        bankName: 'HDFC Bank',
        color: '#004c8f',
        logoUrl: 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=64&q=80',
        cardTypes: ['CREDIT_CARD', 'DEBIT_CARD'],
        minAmount: 2500,
        processingFee: 199,
        processingFeeGst: 18,
        isActive: true,
        binPrefixes: ['401200', '454321', '405282', '524365'],
        tenures: [
          { months: 3, annualInterestRate: 15.0, isNoCost: true, isActive: true },
          { months: 6, annualInterestRate: 15.0, isNoCost: true, isActive: true },
          { months: 9, annualInterestRate: 16.0, isNoCost: false, isActive: true },
          { months: 12, annualInterestRate: 16.0, isNoCost: false, isActive: true },
          { months: 18, annualInterestRate: 16.5, isNoCost: false, isActive: true },
          { months: 24, annualInterestRate: 16.5, isNoCost: false, isActive: true },
        ],
      },
      {
        bankCode: 'ICICI',
        bankName: 'ICICI Bank',
        color: '#b02a30',
        logoUrl: 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=64&q=80',
        cardTypes: ['CREDIT_CARD', 'DEBIT_CARD'],
        minAmount: 2500,
        processingFee: 199,
        processingFeeGst: 18,
        isActive: true,
        binPrefixes: ['402400', '431581', '512845'],
        tenures: [
          { months: 3, annualInterestRate: 14.5, isNoCost: true, isActive: true },
          { months: 6, annualInterestRate: 14.5, isNoCost: true, isActive: true },
          { months: 9, annualInterestRate: 15.5, isNoCost: false, isActive: true },
          { months: 12, annualInterestRate: 15.5, isNoCost: false, isActive: true },
          { months: 18, annualInterestRate: 16.0, isNoCost: false, isActive: true },
        ],
      },
      {
        bankCode: 'SBI',
        bankName: 'SBI Card',
        color: '#1b6ca8',
        logoUrl: 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=64&q=80',
        cardTypes: ['CREDIT_CARD'],
        minAmount: 2500,
        processingFee: 199,
        processingFeeGst: 18,
        isActive: true,
        binPrefixes: ['472642', '524193', '416640'],
        tenures: [
          { months: 3, annualInterestRate: 15.0, isNoCost: true, isActive: true },
          { months: 6, annualInterestRate: 15.0, isNoCost: true, isActive: true },
          { months: 9, annualInterestRate: 15.5, isNoCost: false, isActive: true },
          { months: 12, annualInterestRate: 15.5, isNoCost: false, isActive: true },
          { months: 24, annualInterestRate: 16.0, isNoCost: false, isActive: true },
        ],
      },
      {
        bankCode: 'AXIS',
        bankName: 'Axis Bank',
        color: '#97144d',
        logoUrl: 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=64&q=80',
        cardTypes: ['CREDIT_CARD', 'DEBIT_CARD'],
        minAmount: 2500,
        processingFee: 199,
        processingFeeGst: 18,
        isActive: true,
        binPrefixes: ['464214', '512068', '607063'],
        tenures: [
          { months: 3, annualInterestRate: 15.0, isNoCost: true, isActive: true },
          { months: 6, annualInterestRate: 15.0, isNoCost: true, isActive: true },
          { months: 9, annualInterestRate: 15.5, isNoCost: false, isActive: true },
          { months: 12, annualInterestRate: 16.0, isNoCost: false, isActive: true },
        ],
      },
      {
        bankCode: 'KOTAK',
        bankName: 'Kotak Mahindra Bank',
        color: '#e41f26',
        logoUrl: 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=64&q=80',
        cardTypes: ['CREDIT_CARD'],
        minAmount: 2500,
        processingFee: 199,
        processingFeeGst: 18,
        isActive: true,
        binPrefixes: ['416621', '527552'],
        tenures: [
          { months: 3, annualInterestRate: 15.0, isNoCost: true, isActive: true },
          { months: 6, annualInterestRate: 15.0, isNoCost: false, isActive: true },
          { months: 9, annualInterestRate: 16.0, isNoCost: false, isActive: true },
          { months: 12, annualInterestRate: 16.0, isNoCost: false, isActive: true },
        ],
      },
    ],
    bnplProviders: [
      {
        providerCode: 'BAJAJ_FINSERV',
        providerName: 'Bajaj Finserv Insta EMI',
        type: 'CARDLESS_EMI',
        color: '#005baa',
        minAmount: 1500,
        maxAmount: 200000,
        processingFee: 117,
        isActive: true,
        tenures: [
          { months: 3, annualInterestRate: 0, isNoCost: true, isActive: true, description: 'Pay in 3 equal monthly installments, 0% interest' },
          { months: 6, annualInterestRate: 0, isNoCost: true, isActive: true, description: 'Zero down payment, 0% interest' },
          { months: 9, annualInterestRate: 0, isNoCost: true, isActive: true, description: 'Flexible 9-month tenure with 0% interest' },
          { months: 12, annualInterestRate: 0, isNoCost: true, isActive: true, description: 'Annual 12-month tenure with 0% interest' },
        ],
      },
      {
        providerCode: 'SNAPMINT',
        providerName: 'Snapmint Cardless EMI',
        type: 'CARDLESS_EMI',
        color: '#059669',
        minAmount: 1000,
        maxAmount: 50000,
        processingFee: 0,
        isActive: true,
        tenures: [
          { months: 3, annualInterestRate: 0, isNoCost: true, isActive: true, description: 'Instant approval via PAN Card, 0% interest' },
          { months: 6, annualInterestRate: 0, isNoCost: true, isActive: true, description: 'Pay in 6 installments with no credit card' },
        ],
      },
      {
        providerCode: 'SIMPL',
        providerName: 'Simpl Pay Later',
        type: 'PAY_LATER',
        color: '#00d09c',
        minAmount: 500,
        maxAmount: 25000,
        processingFee: 0,
        isActive: true,
        tenures: [
          { months: 1, annualInterestRate: 0, isNoCost: true, isActive: true, billingCycleDays: 30, description: '100% Bill payment after 30 days' },
          { months: 3, annualInterestRate: 0, isNoCost: true, isActive: true, description: 'Pay in 3 monthly installments, 0% interest' },
        ],
      },
      {
        providerCode: 'LAZYPAY',
        providerName: 'LazyPay Pay in 4',
        type: 'PAY_IN_4',
        color: '#ff5722',
        minAmount: 1000,
        maxAmount: 40000,
        processingFee: 0,
        isActive: true,
        tenures: [
          { months: 1, annualInterestRate: 0, isNoCost: true, isActive: true, billingCycleDays: 30, description: 'Pay next month via LazyPay Credit' },
          { months: 4, annualInterestRate: 0, isNoCost: true, isActive: true, description: 'Pay in 4 equal parts over 60 days, 0% interest' },
        ],
      },
    ],
  };
};

/**
 * Fetch or initialize the single EmiConfig document
 */
const getOrSeedEmiConfig = async () => {
  let config = await EmiConfig.findOne();
  if (!config) {
    config = await EmiConfig.create(getDefaultConfigData());
  }
  return config;
};

/**
 * Mathematical Calculation Helpers
 */
const calculateStandardEmi = (principal, annualRate, months) => {
  if (annualRate <= 0) {
    const emi = Math.round(principal / months);
    return {
      monthlyEmi: emi,
      totalInterest: 0,
      totalPayable: principal,
      upfrontDiscount: 0,
      effectivePrincipal: principal,
    };
  }
  const r = annualRate / 12 / 100;
  const emi = Math.round((principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1));
  const totalPayable = emi * months;
  const totalInterest = Math.max(0, totalPayable - principal);
  return {
    monthlyEmi: emi,
    totalInterest,
    totalPayable,
    upfrontDiscount: 0,
    effectivePrincipal: principal,
  };
};

const calculateNoCostEmi = (principal, annualRate, months) => {
  const targetMonthlyEmi = Math.round(principal / months);
  if (annualRate <= 0) {
    return {
      monthlyEmi: targetMonthlyEmi,
      totalInterest: 0,
      totalPayable: principal,
      upfrontDiscount: 0,
      effectivePrincipal: principal,
    };
  }
  const r = annualRate / 12 / 100;
  const factor = (Math.pow(1 + r, months) - 1) / (r * Math.pow(1 + r, months));
  const netPrincipal = Math.round(targetMonthlyEmi * factor);
  const upfrontDiscount = Math.max(0, principal - netPrincipal);
  return {
    monthlyEmi: targetMonthlyEmi,
    totalInterest: upfrontDiscount,
    totalPayable: principal,
    upfrontDiscount,
    effectivePrincipal: netPrincipal,
  };
};

/**
 * GET /api/emi/config
 * Public configuration for frontend display
 */
exports.getEmiConfig = async (req, res) => {
  try {
    const config = await getOrSeedEmiConfig();
    return res.status(200).json({
      success: true,
      data: {
        isEnabled: config.isEnabled,
        minOrderAmount: config.minOrderAmount,
        noCostEmiEnabled: config.noCostEmiEnabled,
        bannerMessage: config.bannerMessage,
        faqItems: config.faqItems || [],
        banks: (config.banks || []).filter(b => b.isActive).map(b => ({
          bankCode: b.bankCode,
          bankName: b.bankName,
          color: b.color,
          cardTypes: b.cardTypes,
          minAmount: b.minAmount,
          processingFee: b.processingFee,
          processingFeeGst: b.processingFeeGst,
          binPrefixes: b.binPrefixes,
        })),
        bnplProviders: (config.bnplProviders || []).filter(p => p.isActive).map(p => ({
          providerCode: p.providerCode,
          providerName: p.providerName,
          type: p.type,
          color: p.color,
          minAmount: p.minAmount,
          maxAmount: p.maxAmount,
          processingFee: p.processingFee,
        })),
      },
    });
  } catch (error) {
    console.error('Error in getEmiConfig:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST or GET /api/emi/calculate
 * Calculate full breakdown of EMI & BNPL plans for a given price
 */
exports.calculateEmiPlans = async (req, res) => {
  try {
    const price = Number(req.body.price ?? req.query.price);

    if (isNaN(price) || price === undefined || price === null || price === 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid numeric product or cart price is required to calculate EMI plans.',
      });
    }

    if (price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price cannot be negative.',
      });
    }

    const config = await getOrSeedEmiConfig();

    if (!config.isEnabled) {
      return res.status(200).json({
        success: true,
        isEligible: false,
        message: 'EMI option is currently paused by platform administration.',
        plans: [],
      });
    }

    const isEligible = price >= config.minOrderAmount;
    let minMonthlyEmi = null;

    // 1. Process Credit & Debit Card EMI Plans
    const creditCardPlans = [];
    const debitCardPlans = [];

    for (const bank of config.banks || []) {
      if (!bank.isActive) continue;

      const feeWithGst = Math.round(bank.processingFee * (1 + (bank.processingFeeGst || 18) / 100));

      // Build tenures for this bank
      const calculatedTenures = [];
      for (const t of bank.tenures || []) {
        if (!t.isActive) continue;
        if (price < (t.minAmount || bank.minAmount || config.minOrderAmount)) continue;

        const isNoCost = config.noCostEmiEnabled && t.isNoCost;
        const calc = isNoCost
          ? calculateNoCostEmi(price, t.annualInterestRate, t.months)
          : calculateStandardEmi(price, t.annualInterestRate, t.months);

        if (minMonthlyEmi === null || calc.monthlyEmi < minMonthlyEmi) {
          minMonthlyEmi = calc.monthlyEmi;
        }

        calculatedTenures.push({
          months: t.months,
          annualInterestRate: t.annualInterestRate,
          isNoCost,
          monthlyEmi: calc.monthlyEmi,
          totalInterest: calc.totalInterest,
          upfrontDiscount: calc.upfrontDiscount,
          effectivePrincipal: calc.effectivePrincipal,
          totalPayable: calc.totalPayable,
          processingFee: bank.processingFee,
          processingFeeWithGst: feeWithGst,
          totalCostWithFee: calc.totalPayable + feeWithGst,
          description: isNoCost
            ? `0% Interest • ₹${calc.upfrontDiscount.toLocaleString('en-IN')} upfront seller discount`
            : `${t.annualInterestRate}% p.a. standard bank interest`,
        });
      }

      if (calculatedTenures.length > 0) {
        // Sort tenures by months ascending
        calculatedTenures.sort((a, b) => a.months - b.months);

        const bankPayload = {
          bankCode: bank.bankCode,
          bankName: bank.bankName,
          color: bank.color,
          logoUrl: bank.logoUrl,
          processingFee: bank.processingFee,
          processingFeeWithGst: feeWithGst,
          binPrefixes: bank.binPrefixes || [],
          hasNoCostOption: calculatedTenures.some(t => t.isNoCost),
          tenures: calculatedTenures,
        };

        if (bank.cardTypes.includes('CREDIT_CARD')) {
          creditCardPlans.push({ ...bankPayload, cardType: 'CREDIT_CARD' });
        }
        if (bank.cardTypes.includes('DEBIT_CARD')) {
          debitCardPlans.push({ ...bankPayload, cardType: 'DEBIT_CARD' });
        }
      }
    }

    // 2. Process Cardless NBFC & BNPL Providers
    const cardlessPlans = [];
    const payLaterPlans = [];

    for (const provider of config.bnplProviders || []) {
      if (!provider.isActive) continue;
      if (price < provider.minAmount || (provider.maxAmount && price > provider.maxAmount)) continue;

      const calculatedTenures = [];
      for (const t of provider.tenures || []) {
        if (!t.isActive) continue;

        const isNoCost = t.isNoCost || t.annualInterestRate === 0;
        const calc = isNoCost
          ? calculateNoCostEmi(price, t.annualInterestRate, t.months)
          : calculateStandardEmi(price, t.annualInterestRate, t.months);

        if (minMonthlyEmi === null || calc.monthlyEmi < minMonthlyEmi) {
          minMonthlyEmi = calc.monthlyEmi;
        }

        calculatedTenures.push({
          months: t.months,
          annualInterestRate: t.annualInterestRate,
          isNoCost,
          monthlyEmi: calc.monthlyEmi,
          totalInterest: calc.totalInterest,
          upfrontDiscount: calc.upfrontDiscount,
          totalPayable: calc.totalPayable,
          processingFee: provider.processingFee || 0,
          totalCostWithFee: calc.totalPayable + (provider.processingFee || 0),
          billingCycleDays: t.billingCycleDays || 30,
          description: t.description || (isNoCost ? '0% Interest Cardless EMI' : 'Flexible installment'),
        });
      }

      if (calculatedTenures.length > 0) {
        calculatedTenures.sort((a, b) => a.months - b.months);

        const providerPayload = {
          providerCode: provider.providerCode,
          providerName: provider.providerName,
          type: provider.type,
          color: provider.color,
          logoUrl: provider.logoUrl,
          processingFee: provider.processingFee,
          hasNoCostOption: calculatedTenures.some(t => t.isNoCost),
          tenures: calculatedTenures,
        };

        if (provider.type === 'CARDLESS_EMI') {
          cardlessPlans.push(providerPayload);
        } else {
          payLaterPlans.push(providerPayload);
        }
      }
    }

    // Banner message formatted
    const banner = config.bannerMessage.replace(
      '%minEmi%',
      minMonthlyEmi ? minMonthlyEmi.toLocaleString('en-IN') : '0'
    );

    return res.status(200).json({
      success: true,
      price,
      isEligible,
      minOrderAmount: config.minOrderAmount,
      minMonthlyEmi,
      bannerMessage: banner,
      breakdown: {
        creditCards: creditCardPlans,
        debitCards: debitCardPlans,
        cardlessEmi: cardlessPlans,
        payLater: payLaterPlans,
      },
      faqItems: config.faqItems || [],
    });
  } catch (error) {
    console.error('Error in calculateEmiPlans:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/emi/admin/config
 * Super Admin full configuration with edit privileges
 */
exports.getAdminEmiConfig = async (req, res) => {
  try {
    const config = await getOrSeedEmiConfig();
    return res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error in getAdminEmiConfig:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/emi/admin/config
 * Super Admin update EMI configuration with immutable AuditLog
 */
exports.updateAdminEmiConfig = async (req, res) => {
  try {
    const {
      isEnabled,
      minOrderAmount,
      noCostEmiEnabled,
      subsidizedBy,
      subventionPlatformShare,
      defaultProcessingFee,
      processingFeeGstRate,
      banks,
      bnplProviders,
      bannerMessage,
      faqItems,
    } = req.body;

    let config = await getOrSeedEmiConfig();

    if (minOrderAmount !== undefined && (isNaN(minOrderAmount) || Number(minOrderAmount) < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Minimum order amount must be a positive number.',
      });
    }

    const previousSnapshot = {
      isEnabled: config.isEnabled,
      minOrderAmount: config.minOrderAmount,
      noCostEmiEnabled: config.noCostEmiEnabled,
      banksCount: config.banks?.length || 0,
    };

    if (isEnabled !== undefined) config.isEnabled = isEnabled;
    if (minOrderAmount !== undefined) config.minOrderAmount = Number(minOrderAmount);
    if (noCostEmiEnabled !== undefined) config.noCostEmiEnabled = noCostEmiEnabled;
    if (subsidizedBy !== undefined) config.subsidizedBy = subsidizedBy;
    if (subventionPlatformShare !== undefined) config.subventionPlatformShare = Number(subventionPlatformShare);
    if (defaultProcessingFee !== undefined) config.defaultProcessingFee = Number(defaultProcessingFee);
    if (processingFeeGstRate !== undefined) config.processingFeeGstRate = Number(processingFeeGstRate);
    if (bannerMessage !== undefined) config.bannerMessage = bannerMessage;
    if (Array.isArray(banks)) config.banks = banks;
    if (Array.isArray(bnplProviders)) config.bnplProviders = bnplProviders;
    if (Array.isArray(faqItems)) config.faqItems = faqItems;

    config.updatedBy = req.user?._id;
    await config.save();

    // Log to immutable AuditLog
    await AuditLog.create({
      action: 'UPDATE_SETTINGS',
      module: 'FINANCE',
      targetId: config._id.toString(),
      targetType: 'EmiConfig',
      description: `Super Admin updated Platform EMI & BNPL rules (Min Amount: ₹${config.minOrderAmount}, No-Cost EMI: ${config.noCostEmiEnabled ? 'ENABLED' : 'PAUSED'})`,
      changeSummary: `Updated from Min ₹${previousSnapshot.minOrderAmount} to ₹${config.minOrderAmount}`,
      details: {
        previous: previousSnapshot,
        updated: {
          isEnabled: config.isEnabled,
          minOrderAmount: config.minOrderAmount,
          noCostEmiEnabled: config.noCostEmiEnabled,
          banksCount: config.banks?.length || 0,
        },
      },
      performedBy: req.user?._id,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
    });

    return res.status(200).json({
      success: true,
      message: 'Platform EMI & BNPL configuration successfully updated.',
      data: config,
    });
  } catch (error) {
    console.error('Error in updateAdminEmiConfig:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
