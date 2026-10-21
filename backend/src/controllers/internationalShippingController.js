const InternationalShippingZone = require('../models/InternationalShippingZone');
const Order = require('../models/Order');
const { convertAmount } = require('../services/currencyService');
const AuditLog = require('../models/AuditLog');

const DEFAULT_ZONES = [
  {
    zoneName: 'North America (USA & Canada)',
    zoneCode: 'ZONE_NA',
    destinationCountries: ['US', 'CA', 'MX'],
    carrierOptions: [
      { carrierName: 'DHL Express Worldwide', serviceCode: 'EXPRESS', estimatedDaysMin: 3, estimatedDaysMax: 5, baseRate: 1500, perKgRate: 600, fuelSurchargePercent: 7.5 },
      { carrierName: 'FedEx International Economy', serviceCode: 'STANDARD', estimatedDaysMin: 6, estimatedDaysMax: 10, baseRate: 950, perKgRate: 400, fuelSurchargePercent: 5.0 },
      { carrierName: 'India Post EMS Global', serviceCode: 'ECONOMY', estimatedDaysMin: 12, estimatedDaysMax: 20, baseRate: 550, perKgRate: 250, fuelSurchargePercent: 0 },
    ],
    customsDutyRule: {
      calculationMode: 'DDP',
      deMinimisThreshold: 65000, // ~USD 800
      standardDutyPercent: 6.5,
      importVatPercent: 0.0,
      hsCodeOverrides: [
        { hsPrefix: '8518', dutyPercent: 0.0, description: 'Headphones and audio equipment' },
        { hsPrefix: '6109', dutyPercent: 12.0, description: 'Cotton apparel and t-shirts' },
      ],
    },
    documentationRequired: ['COMMERCIAL_INVOICE', 'CN22_DECLARATION'],
  },
  {
    zoneName: 'Middle East GCC (UAE, Saudi Arabia, Qatar)',
    zoneCode: 'ZONE_GCC',
    destinationCountries: ['AE', 'SA', 'QA', 'KW', 'BH', 'OM'],
    carrierOptions: [
      { carrierName: 'Aramex Priority Express', serviceCode: 'EXPRESS', estimatedDaysMin: 2, estimatedDaysMax: 4, baseRate: 1100, perKgRate: 450, fuelSurchargePercent: 6.0 },
      { carrierName: 'DHL Express Gulf', serviceCode: 'STANDARD', estimatedDaysMin: 4, estimatedDaysMax: 7, baseRate: 850, perKgRate: 350, fuelSurchargePercent: 5.0 },
    ],
    customsDutyRule: {
      calculationMode: 'DDP',
      deMinimisThreshold: 6000, // ~USD 75
      standardDutyPercent: 5.0,
      importVatPercent: 5.0, // 5% GCC VAT
      hsCodeOverrides: [],
    },
    documentationRequired: ['COMMERCIAL_INVOICE', 'CERTIFICATE_OF_ORIGIN'],
  },
  {
    zoneName: 'European Union & United Kingdom',
    zoneCode: 'ZONE_EUROPE',
    destinationCountries: ['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'PL'],
    carrierOptions: [
      { carrierName: 'UPS Worldwide Saver', serviceCode: 'EXPRESS', estimatedDaysMin: 3, estimatedDaysMax: 6, baseRate: 1600, perKgRate: 650, fuelSurchargePercent: 8.0 },
      { carrierName: 'Deutsche Post DHL Parcel', serviceCode: 'STANDARD', estimatedDaysMin: 7, estimatedDaysMax: 12, baseRate: 1050, perKgRate: 420, fuelSurchargePercent: 4.5 },
    ],
    customsDutyRule: {
      calculationMode: 'DDP',
      deMinimisThreshold: 13500, // ~EUR 150
      standardDutyPercent: 4.5,
      importVatPercent: 20.0, // Standard European VAT
      hsCodeOverrides: [],
    },
    documentationRequired: ['COMMERCIAL_INVOICE', 'CN23_DECLARATION'],
  },
];

/**
 * Initializes default international shipping zones if empty
 */
const ensureDefaultZones = async () => {
  try {
    const count = await InternationalShippingZone.countDocuments();
    if (count === 0) {
      console.log('[InternationalShipping] Seeding default cross-border shipping zones...');
      for (const zone of DEFAULT_ZONES) {
        await InternationalShippingZone.create(zone);
      }
    }
  } catch (err) {
    console.warn('[InternationalShipping] Seed zones failed:', err.message);
  }
};

/**
 * POST /api/shipping/international/quotes
 * Calculates live carrier options, transit times, and estimated customs duty (DDP / DDU)
 */
const getShippingQuotes = async (req, res) => {
  try {
    await ensureDefaultZones();
    const { destinationCountry, weightKg, cartTotal, hsCodes, currency } = req.body;

    if (!destinationCountry) {
      return res.status(400).json({
        success: false,
        message: 'Destination country code (ISO 2-letter, e.g. US, AE, GB) is required.',
      });
    }

    const countryClean = destinationCountry.trim().toUpperCase();
    const targetCurrency = (currency || 'INR').trim().toUpperCase();
    const weight = Math.max(Number(weightKg || 0.5), 0.1);
    const orderTotalBase = Math.max(Number(cartTotal || 0), 0);

    // 1. Locate matching zone
    const zone = await InternationalShippingZone.findOne({
      destinationCountries: countryClean,
      isActive: true,
    });

    if (!zone) {
      return res.status(404).json({
        success: false,
        message: `Cross-border international shipping is currently not serviced for country code '${countryClean}'.`,
      });
    }

    // 2. Customs Duty & Import Tax Calculation
    const customsRule = zone.customsDutyRule || {};
    const deMinimis = customsRule.deMinimisThreshold || 0;
    let dutyPercent = customsRule.standardDutyPercent || 5.0;

    // Check HS code overrides if product HS prefix provided
    if (Array.isArray(hsCodes) && hsCodes.length > 0 && Array.isArray(customsRule.hsCodeOverrides)) {
      for (const code of hsCodes) {
        const override = customsRule.hsCodeOverrides.find(o => code.startsWith(o.hsPrefix));
        if (override) {
          dutyPercent = override.dutyPercent;
          break;
        }
      }
    }

    let estimatedDutyBase = 0;
    let estimatedVatBase = 0;
    let isDutyExempt = false;

    if (deMinimis > 0 && orderTotalBase <= deMinimis) {
      isDutyExempt = true;
    } else {
      estimatedDutyBase = Number(((orderTotalBase * dutyPercent) / 100).toFixed(2));
      const vatBase = orderTotalBase + estimatedDutyBase;
      estimatedVatBase = Number(((vatBase * (customsRule.importVatPercent || 0)) / 100).toFixed(2));
    }

    const totalCustomsTaxesBase = Number((estimatedDutyBase + estimatedVatBase).toFixed(2));

    // 3. Compute quotes for each carrier option
    const activeCarriers = zone.carrierOptions.filter(c => c.isActive);
    const quotes = [];

    for (const carrier of activeCarriers) {
      const baseShipping = carrier.baseRate + (weight * carrier.perKgRate);
      const fuelSurcharge = (baseShipping * (carrier.fuelSurchargePercent || 0)) / 100;
      const totalShippingBase = Number((baseShipping + fuelSurcharge).toFixed(2));

      // Currency conversion
      let displayShipping = totalShippingBase;
      let displayDuty = totalCustomsTaxesBase;
      let exchangeRate = 1.0;

      if (targetCurrency !== 'INR') {
        try {
          const convShipping = await convertAmount(totalShippingBase, 'INR', targetCurrency);
          const convDuty = await convertAmount(totalCustomsTaxesBase, 'INR', targetCurrency);
          displayShipping = convShipping.convertedAmount;
          displayDuty = convDuty.convertedAmount;
          exchangeRate = convShipping.exchangeRate;
        } catch (_) {}
      }

      quotes.push({
        carrierName: carrier.carrierName,
        serviceCode: carrier.serviceCode,
        estimatedDeliveryDays: `${carrier.estimatedDaysMin} - ${carrier.estimatedDaysMax} business days`,
        shippingFee: displayShipping,
        shippingFeeBase: totalShippingBase,
        customsDutyAndTax: displayDuty,
        customsDutyAndTaxBase: totalCustomsTaxesBase,
        totalLandedCost: Number((displayShipping + displayDuty).toFixed(2)),
        currency: targetCurrency,
        calculationMode: customsRule.calculationMode || 'DDP',
        trackingSupported: carrier.trackingSupported,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        destinationCountry: countryClean,
        zoneName: zone.zoneName,
        zoneCode: zone.zoneCode,
        calculationMode: customsRule.calculationMode || 'DDP',
        isDutyExempt,
        dutyPercent,
        importVatPercent: customsRule.importVatPercent || 0,
        currency: targetCurrency,
        quotes,
        documentationRequired: zone.documentationRequired,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate international shipping quotes: ' + error.message,
    });
  }
};

/**
 * GET /api/shipping/international/zones
 * List all active international shipping zones
 */
const getShippingZones = async (req, res) => {
  try {
    await ensureDefaultZones();
    const zones = await InternationalShippingZone.find({ isActive: true });
    return res.status(200).json({
      success: true,
      data: zones,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch shipping zones: ' + error.message,
    });
  }
};

/**
 * POST /api/admin/shipping/international/zones
 * Super Admin create international zone
 */
const createShippingZone = async (req, res) => {
  try {
    const { zoneName, zoneCode, destinationCountries, carrierOptions, customsDutyRule } = req.body;
    if (!zoneName || !zoneCode || !destinationCountries || destinationCountries.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'zoneName, zoneCode, and at least one destination country are required.',
      });
    }

    const cleanCode = zoneCode.trim().toUpperCase();
    const existing = await InternationalShippingZone.findOne({ zoneCode: cleanCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Zone code '${cleanCode}' already exists.`,
      });
    }

    const newZone = await InternationalShippingZone.create({
      zoneName: zoneName.trim(),
      zoneCode: cleanCode,
      destinationCountries: destinationCountries.map(c => c.trim().toUpperCase()),
      carrierOptions: carrierOptions || [],
      customsDutyRule: customsDutyRule || {},
      isActive: true,
    });

    try {
      await AuditLog.create({
        user: req.user?._id,
        action: 'CREATE_SHIPPING_ZONE',
        module: 'LOGISTICS',
        details: `Created cross-border shipping zone ${cleanCode} (${zoneName})`,
      });
    } catch (_) {}

    return res.status(201).json({
      success: true,
      message: 'International shipping zone created successfully.',
      data: newZone,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create international shipping zone: ' + error.message,
    });
  }
};

/**
 * GET /api/shipping/international/declaration/:orderId
 * Generates official CN22 / CN23 international customs declaration and commercial export invoice
 */
const generateCustomsDeclaration = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId)
      .populate('customer', 'name email phone')
      .populate('items.product', 'title sku price weight hsnCode')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    const countryCode = order.shippingAddress?.countryCode || order.shippingAddress?.country || 'US';
    const totalWeightKg = order.items.reduce((acc, item) => acc + (item.quantity * 0.35), 0.2);

    const declaration = {
      declarationType: 'CN22',
      declarationNumber: `DEC-${order.orderNumber}`,
      exporterDetails: {
        companyName: 'AuraMarket Global Export Logistics',
        exporterCode: 'IEC-0508198700',
        countryOfOrigin: 'IN',
        hubAddress: 'Terminal 3 Air Cargo Complex, New Delhi, India 110037',
      },
      consigneeDetails: {
        recipientName: order.shippingAddress?.recipientName || order.customer?.name || 'Customer',
        address: order.shippingAddress?.street || '123 Cross Border Way',
        city: order.shippingAddress?.city || 'New York',
        state: order.shippingAddress?.state || 'NY',
        postalCode: order.shippingAddress?.pincode || '10001',
        country: countryCode.toUpperCase(),
      },
      lineItems: order.items.map(item => ({
        description: item.title || item.product?.title || 'E-Commerce Merchandise',
        hsCode: item.product?.hsnCode || '8518.30.00',
        quantity: item.quantity,
        netWeightKg: 0.35,
        declaredValue: item.price,
        currency: 'INR',
      })),
      totalGrossWeightKg: Number(totalWeightKg.toFixed(2)),
      totalDeclaredValue: order.totalAmount,
      invoiceDate: order.createdAt || new Date(),
      exportStatement: 'I, the undersigned, certify that the particulars given in this declaration are correct and that this item does not contain any dangerous articles or prohibited contents.',
    };

    return res.status(200).json({
      success: true,
      data: declaration,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate customs declaration: ' + error.message,
    });
  }
};

module.exports = {
  getShippingQuotes,
  getShippingZones,
  createShippingZone,
  generateCustomsDeclaration,
  ensureDefaultZones,
};
