const ShippingConfig = require('../models/ShippingConfig');
const PincodeZone = require('../models/PincodeZone');
const UIConfig = require('../models/UIConfig');

// Helper to get or create ShippingConfig singleton
const getOrCreateShippingConfig = async () => {
  let config = await ShippingConfig.findOne();
  if (!config) {
    config = await ShippingConfig.create({});
  }
  return config;
};

// @desc    Get Dynamic Shipping Settings
// @route   GET /api/shipping/settings or GET /api/admin/shipping/settings
// @access  Public / Super Admin
exports.getShippingSettings = async (req, res, next) => {
  try {
    const config = await getOrCreateShippingConfig();
    res.status(200).json({
      success: true,
      data: config,
      config,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Dynamic Shipping Rules & Thresholds
// @route   PUT /api/admin/shipping/settings
// @access  Private (Super Admin)
exports.updateShippingSettings = async (req, res, next) => {
  try {
    const config = await getOrCreateShippingConfig();

    const {
      enabled,
      freeShippingThreshold,
      defaultShippingFee,
      expressShippingFee,
      hyperlocalShippingFee,
      codFee,
      estimatedStandardDays,
      estimatedExpressDays,
      estimatedHyperlocalDays,
      weightTiers,
      zoneSurcharges,
    } = req.body;

    if (enabled !== undefined) config.enabled = Boolean(enabled);
    if (freeShippingThreshold !== undefined) {
      if (Number(freeShippingThreshold) < 0) {
        return res.status(400).json({ success: false, message: 'Free shipping threshold cannot be negative' });
      }
      config.freeShippingThreshold = Number(freeShippingThreshold);
    }
    if (defaultShippingFee !== undefined) {
      if (Number(defaultShippingFee) < 0) {
        return res.status(400).json({ success: false, message: 'Default shipping fee cannot be negative' });
      }
      config.defaultShippingFee = Number(defaultShippingFee);
    }
    if (expressShippingFee !== undefined) {
      if (Number(expressShippingFee) < 0) {
        return res.status(400).json({ success: false, message: 'Express shipping fee cannot be negative' });
      }
      config.expressShippingFee = Number(expressShippingFee);
    }
    if (hyperlocalShippingFee !== undefined) {
      if (Number(hyperlocalShippingFee) < 0) {
        return res.status(400).json({ success: false, message: 'Hyperlocal shipping fee cannot be negative' });
      }
      config.hyperlocalShippingFee = Number(hyperlocalShippingFee);
    }
    if (codFee !== undefined) {
      if (Number(codFee) < 0) {
        return res.status(400).json({ success: false, message: 'COD fee cannot be negative' });
      }
      config.codFee = Number(codFee);
    }
    if (estimatedStandardDays) config.estimatedStandardDays = String(estimatedStandardDays).trim();
    if (estimatedExpressDays) config.estimatedExpressDays = String(estimatedExpressDays).trim();
    if (estimatedHyperlocalDays) config.estimatedHyperlocalDays = String(estimatedHyperlocalDays).trim();

    if (Array.isArray(weightTiers)) {
      config.weightTiers = weightTiers;
    }
    if (Array.isArray(zoneSurcharges)) {
      config.zoneSurcharges = zoneSurcharges;
    }

    await config.save();

    // Synchronize UIConfig.shipping for legacy backward compatibility
    try {
      let uiDoc = await UIConfig.findOne();
      if (!uiDoc) uiDoc = await UIConfig.create({});
      if (!uiDoc.shipping) uiDoc.shipping = {};
      uiDoc.shipping.freeShippingThreshold = config.freeShippingThreshold;
      uiDoc.shipping.defaultShippingFee = config.defaultShippingFee;
      uiDoc.shipping.expressShippingFee = config.expressShippingFee;
      uiDoc.shipping.codFee = config.codFee;
      uiDoc.shipping.enabled = config.enabled;
      await uiDoc.save();
    } catch (syncErr) {
      console.warn('[ShippingController] UIConfig sync warning:', syncErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Dynamic shipping engine rules and weight tiers updated successfully!',
      data: config,
      config,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Calculate Dynamic Shipping Quote based on Cart Value, Pincode & Weight
// @route   POST /api/shipping/calculate-quote
// @access  Public
exports.calculateShippingQuote = async (req, res, next) => {
  try {
    const {
      cartTotal = 0,
      destinationPincode,
      totalWeightGrams = 500,
      paymentMethod = 'PREPAID',
      selectedMethod = 'STANDARD',
    } = req.body;

    if (destinationPincode === undefined || destinationPincode === null || String(destinationPincode).trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Destination pincode is required for shipping calculation',
      });
    }

    const cleanPincode = String(destinationPincode).trim();
    if (!/^\d{6}$/.test(cleanPincode)) {
      return res.status(400).json({
        success: false,
        message: 'Destination pincode must be a valid 6-digit postal code',
      });
    }

    const parsedCartTotal = Math.max(0, Number(cartTotal) || 0);
    const parsedWeight = Math.max(0, Number(totalWeightGrams) || 500);
    const isCod = String(paymentMethod).toUpperCase() === 'COD';

    const config = await getOrCreateShippingConfig();

    // Look up destination Pincode Zone
    const pincodeRecord = await PincodeZone.findOne({ pincode: cleanPincode });

    // Check serviceability
    if (pincodeRecord && pincodeRecord.isDeliverable === false) {
      return res.status(200).json({
        success: true,
        isDeliverable: false,
        serviceable: false,
        message: `Delivery is currently not available for pincode ${cleanPincode}.`,
        pincode: cleanPincode,
        city: pincodeRecord.city,
        state: pincodeRecord.state,
        quotes: [],
      });
    }

    const zone = pincodeRecord ? pincodeRecord.zone : 'TIER_1';
    const city = pincodeRecord ? pincodeRecord.city : 'Standard Delivery Area';
    const state = pincodeRecord ? pincodeRecord.state : 'Domestic';
    const isCodPermitted = pincodeRecord ? pincodeRecord.isCodAvailable !== false : true;
    const baseEstimatedDays = pincodeRecord ? pincodeRecord.estimatedDays || 3 : 3;

    if (isCod && !isCodPermitted) {
      return res.status(400).json({
        success: false,
        message: `Cash on Delivery (COD) is not available for pincode ${cleanPincode}. Please select an online payment option.`,
      });
    }

    // 1. Free Shipping Check
    const minFreeOrder = pincodeRecord?.minOrderForFreeShipping ?? config.freeShippingThreshold;
    const isFreeStandard = config.enabled && parsedCartTotal >= minFreeOrder;

    // 2. Weight Surcharge Calculation
    let weightSurcharge = 0;
    let weightTierName = 'Lightweight';
    if (Array.isArray(config.weightTiers) && config.weightTiers.length > 0) {
      const matchedTier = config.weightTiers.find(
        (t) => parsedWeight >= t.minGrams && parsedWeight <= t.maxGrams
      );
      if (matchedTier) {
        weightSurcharge = matchedTier.surcharge || 0;
        weightTierName = matchedTier.name;
      } else {
        // Exceeds max weight tier: apply highest tier + 20 per extra kg
        const highestTier = config.weightTiers[config.weightTiers.length - 1];
        const extraKg = Math.ceil((parsedWeight - highestTier.maxGrams) / 1000);
        weightSurcharge = highestTier.surcharge + Math.max(0, extraKg * 25);
        weightTierName = `Heavy Freight (${parsedWeight}g)`;
      }
    }

    // 3. Zone Surcharge Calculation
    let zoneSurcharge = 0;
    let transitAdjustmentDays = 0;
    if (Array.isArray(config.zoneSurcharges)) {
      const matchedZone = config.zoneSurcharges.find((z) => z.zone === zone);
      if (matchedZone) {
        zoneSurcharge = matchedZone.surcharge || 0;
        transitAdjustmentDays = matchedZone.transitDaysAdjustment || 0;
      }
    }

    // 4. COD Fee
    const codHandlingFee = isCod ? config.codFee : 0;

    // 5. Construct Delivery Quotes
    const totalTransitDays = baseEstimatedDays + transitAdjustmentDays;
    const standardBase = pincodeRecord?.standardShippingFee ?? config.defaultShippingFee;
    const expressBase = pincodeRecord?.expressShippingFee ?? config.expressShippingFee;
    const hyperlocalBase = config.hyperlocalShippingFee;

    // Standard Quote
    const standardShippingNet = isFreeStandard ? 0 : standardBase + weightSurcharge + zoneSurcharge;
    const standardTotal = standardShippingNet + codHandlingFee;
    const standardEtaDate = new Date();
    standardEtaDate.setDate(standardEtaDate.getDate() + totalTransitDays);

    const quotes = [
      {
        method: 'STANDARD',
        name: 'Standard Surface Shipping',
        description: `${totalTransitDays} business days via trusted logistics partner`,
        baseFee: standardBase,
        weightSurcharge,
        zoneSurcharge,
        codFee: codHandlingFee,
        discount: isFreeStandard ? standardBase : 0,
        shippingFee: standardShippingNet,
        totalPayableShipping: standardTotal,
        isFree: isFreeStandard,
        estimatedDays: totalTransitDays,
        estimatedDeliveryDate: standardEtaDate.toISOString().split('T')[0],
        estimatedDeliveryText: `${totalTransitDays} Business Days`,
      },
    ];

    // Express Quote (if express is available for pincode)
    const isExpressAllowed = pincodeRecord ? pincodeRecord.expressAvailable !== false : true;
    if (isExpressAllowed) {
      const expressTransitDays = Math.max(1, Math.ceil(totalTransitDays / 2));
      const expressShippingNet = expressBase + weightSurcharge + zoneSurcharge;
      const expressTotal = expressShippingNet + codHandlingFee;
      const expressEtaDate = new Date();
      expressEtaDate.setDate(expressEtaDate.getDate() + expressTransitDays);

      quotes.push({
        method: 'EXPRESS',
        name: 'Express Priority Air',
        description: `Delivered in ${expressTransitDays}-${expressTransitDays + 1} days with priority air dispatch`,
        baseFee: expressBase,
        weightSurcharge,
        zoneSurcharge,
        codFee: codHandlingFee,
        discount: 0,
        shippingFee: expressShippingNet,
        totalPayableShipping: expressTotal,
        isFree: false,
        estimatedDays: expressTransitDays,
        estimatedDeliveryDate: expressEtaDate.toISOString().split('T')[0],
        estimatedDeliveryText: `${expressTransitDays} Business Days (Air Express)`,
      });
    }

    // Hyperlocal Same-Day Quote (available for METRO zones or local hub)
    if (zone === 'METRO') {
      const hyperlocalShippingNet = hyperlocalBase + weightSurcharge;
      const hyperlocalTotal = hyperlocalShippingNet + codHandlingFee;
      quotes.push({
        method: 'HYPERLOCAL',
        name: 'Same-Day Hyperlocal Express',
        description: 'Delivered in 4 to 6 hours via dedicated on-demand rider',
        baseFee: hyperlocalBase,
        weightSurcharge,
        zoneSurcharge: 0,
        codFee: codHandlingFee,
        discount: 0,
        shippingFee: hyperlocalShippingNet,
        totalPayableShipping: hyperlocalTotal,
        isFree: false,
        estimatedDays: 0,
        estimatedDeliveryDate: new Date().toISOString().split('T')[0],
        estimatedDeliveryText: 'Today (4-6 Hours)',
      });
    }

    const selectedQuote =
      quotes.find((q) => q.method === String(selectedMethod).toUpperCase()) || quotes[0];

    res.status(200).json({
      success: true,
      isDeliverable: true,
      serviceable: true,
      destination: {
        pincode: cleanPincode,
        city,
        state,
        zone,
        isCodAvailable: isCodPermitted,
      },
      cartSummary: {
        cartTotal: parsedCartTotal,
        totalWeightGrams: parsedWeight,
        weightTier: weightTierName,
        paymentMethod: isCod ? 'COD' : 'PREPAID',
        freeShippingThreshold: minFreeOrder,
        isFreeShippingQualified: isFreeStandard,
      },
      selectedQuote,
      quotes,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin Simulator for Dynamic Shipping Engine
// @route   POST /api/admin/shipping/test-quote
// @access  Private (Super Admin)
exports.testShippingQuote = async (req, res, next) => {
  try {
    const {
      cartTotal = 1200,
      destinationPincode = '110001',
      totalWeightGrams = 850,
      paymentMethod = 'PREPAID',
      selectedMethod = 'STANDARD',
    } = req.body;

    const reqSim = {
      body: {
        cartTotal,
        destinationPincode,
        totalWeightGrams,
        paymentMethod,
        selectedMethod,
      },
    };

    let result = null;
    const resSim = {
      status: () => ({
        json: (payload) => {
          result = payload;
        },
      }),
    };

    await exports.calculateShippingQuote(reqSim, resSim, next);

    res.status(200).json({
      success: true,
      message: `Dynamic shipping simulation generated for pincode ${destinationPincode} (Weight: ${totalWeightGrams}g, Cart: ₹${cartTotal})`,
      simulation: result,
    });
  } catch (error) {
    next(error);
  }
};
