const TaxMatrix = require('../models/TaxMatrix');

const STATE_CODE_MAP = {
  'jammu and kashmir': '01',
  'himachal pradesh': '02',
  'punjab': '03',
  'chandigarh': '04',
  'uttarakhand': '05',
  'haryana': '06',
  'delhi': '07',
  'rajasthan': '08',
  'uttar pradesh': '09',
  'bihar': '10',
  'sikkim': '11',
  'arunachal pradesh': '12',
  'nagaland': '13',
  'manipur': '14',
  'mizoram': '15',
  'tripura': '16',
  'meghalaya': '17',
  'assam': '18',
  'west bengal': '19',
  'jharkhand': '20',
  'odisha': '21',
  'chhattisgarh': '22',
  'madhya pradesh': '23',
  'gujarat': '24',
  'dadra and nagar haveli': '26',
  'maharashtra': '27',
  'andhra pradesh': '37',
  'karnataka': '29',
  'goa': '30',
  'lakshadweep': '31',
  'kerala': '32',
  'tamil nadu': '33',
  'puducherry': '34',
  'andamans': '35',
  'telangana': '36',
  'ladakh': '38',
};

const getStateCode = (stateName) => {
  if (!stateName) return '07';
  const clean = stateName.toString().trim().toLowerCase();
  return STATE_CODE_MAP[clean] || '07';
};

// Helper to get or create TaxMatrix singleton
const getOrCreateTaxMatrix = async () => {
  let matrix = await TaxMatrix.findOne();
  if (!matrix) {
    matrix = await TaxMatrix.create({});
  }
  return matrix;
};

// @desc    Get Tax Matrix Settings, Slabs & HSN Directory
// @route   GET /api/admin/tax/settings
// @access  Private (Super Admin)
exports.getTaxSettings = async (req, res, next) => {
  try {
    const matrix = await getOrCreateTaxMatrix();
    res.status(200).json({
      success: true,
      data: matrix,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Tax Matrix Settings & Slabs
// @route   PUT /api/admin/tax/settings
// @access  Private (Super Admin)
exports.updateTaxSettings = async (req, res, next) => {
  try {
    const matrix = await getOrCreateTaxMatrix();

    const {
      isGstEnabled,
      calculationMode,
      adminBusinessState,
      adminStateCode,
      adminGstin,
      panNumber,
      autoInterstateIgst,
      reverseChargeMechanism,
      slabs,
      hsnMappings,
    } = req.body;

    if (isGstEnabled !== undefined) matrix.isGstEnabled = Boolean(isGstEnabled);
    if (calculationMode) matrix.calculationMode = calculationMode;
    if (adminBusinessState) {
      matrix.adminBusinessState = adminBusinessState.trim();
      matrix.adminStateCode = getStateCode(adminBusinessState);
    }
    if (adminStateCode) matrix.adminStateCode = adminStateCode.trim();
    if (adminGstin) matrix.adminGstin = adminGstin.trim().toUpperCase();
    if (panNumber) matrix.panNumber = panNumber.trim().toUpperCase();
    if (autoInterstateIgst !== undefined) matrix.autoInterstateIgst = Boolean(autoInterstateIgst);
    if (reverseChargeMechanism !== undefined) matrix.reverseChargeMechanism = Boolean(reverseChargeMechanism);

    if (Array.isArray(slabs)) {
      matrix.slabs = slabs;
    }

    if (Array.isArray(hsnMappings)) {
      matrix.hsnMappings = hsnMappings;
    }

    await matrix.save();

    res.status(200).json({
      success: true,
      message: 'GST Tax Matrix settings and slabs updated successfully!',
      data: matrix,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Calculate Dynamic Tax for Basket (Intra-State CGST+SGST vs Inter-State IGST)
// @route   POST /api/tax/calculate
// @access  Public
exports.calculateTax = async (req, res, next) => {
  try {
    const {
      items = [],
      originState,
      destinationState,
    } = req.body;

    const matrix = await getOrCreateTaxMatrix();

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one item is required for tax calculation.',
      });
    }

    const sellerState = (originState || matrix.adminBusinessState || 'Delhi').trim();
    const buyerState = (destinationState || matrix.adminBusinessState || 'Delhi').trim();

    const sellerStateCode = getStateCode(sellerState);
    const buyerStateCode = getStateCode(buyerState);

    const isIntraState = sellerStateCode === buyerStateCode;
    const supplyType = isIntraState ? 'INTRA_STATE' : 'INTER_STATE';

    // Map HSN to rate for quick lookup
    const hsnRateMap = new Map();
    matrix.hsnMappings.forEach((m) => {
      hsnRateMap.set(m.hsnCode, { rate: m.gstRate, cess: m.cessRate, desc: m.description, exempt: m.isExempt });
    });

    let subTotal = 0;
    let totalTaxableAmount = 0;
    let totalTax = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    const itemized = items.map((item, idx) => {
      const price = Number(item.price) || 0;
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const itemGross = Math.round(price * quantity * 100) / 100;
      subTotal += itemGross;

      // Determine GST rate for this item
      let rate = 18; // platform default
      let cessRate = 0;
      let hsnDescription = 'Standard Commercial Goods';

      if (!matrix.isGstEnabled) {
        rate = 0;
      } else if (item.hsnCode && hsnRateMap.has(item.hsnCode)) {
        const found = hsnRateMap.get(item.hsnCode);
        rate = found.exempt ? 0 : found.rate;
        cessRate = found.cess;
        hsnDescription = found.desc;
      } else if (item.gstRate !== undefined) {
        rate = Number(item.gstRate);
      }

      let taxable = 0;
      let tax = 0;

      if (!matrix.isGstEnabled || rate === 0) {
        taxable = itemGross;
        tax = 0;
      } else if (matrix.calculationMode === 'EXCLUSIVE') {
        taxable = itemGross;
        tax = Math.round((itemGross * (rate / 100)) * 100) / 100;
      } else {
        // INCLUSIVE: itemGross already contains GST
        taxable = Math.round((itemGross / (1 + rate / 100)) * 100) / 100;
        tax = Math.round((itemGross - taxable) * 100) / 100;
      }

      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isIntraState) {
        cgst = Math.round((tax / 2) * 100) / 100;
        sgst = Math.round((tax - cgst) * 100) / 100;
        igst = 0;
        totalCgst += cgst;
        totalSgst += sgst;
      } else {
        cgst = 0;
        sgst = 0;
        igst = tax;
        totalIgst += igst;
      }

      totalTaxableAmount += taxable;
      totalTax += tax;

      return {
        itemIndex: idx,
        name: item.name || `Item #${idx + 1}`,
        hsnCode: item.hsnCode || '85183000',
        hsnDescription,
        price,
        quantity,
        grossTotal: itemGross,
        taxableAmount: taxable,
        gstRate: rate,
        cessRate,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        totalTaxAmount: tax,
        supplyType,
      };
    });

    totalTaxableAmount = Math.round(totalTaxableAmount * 100) / 100;
    totalTax = Math.round(totalTax * 100) / 100;
    totalCgst = Math.round(totalCgst * 100) / 100;
    totalSgst = Math.round(totalSgst * 100) / 100;
    totalIgst = Math.round(totalIgst * 100) / 100;
    const grandTotal = matrix.calculationMode === 'EXCLUSIVE'
      ? Math.round((subTotal + totalTax) * 100) / 100
      : subTotal;

    res.status(200).json({
      success: true,
      summary: {
        sellerState,
        sellerStateCode,
        buyerState,
        buyerStateCode,
        supplyType,
        calculationMode: matrix.calculationMode,
        isGstEnabled: matrix.isGstEnabled,
        subTotal,
        totalTaxableAmount,
        totalCgst,
        totalSgst,
        totalIgst,
        totalTax,
        grandTotal,
      },
      itemized,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Standard HSN Directory with Pre-configured Slabs
// @route   GET /api/tax/hsn-directory
// @access  Public
exports.getHsnDirectory = async (req, res, next) => {
  try {
    const matrix = await getOrCreateTaxMatrix();
    res.status(200).json({
      success: true,
      count: matrix.hsnMappings.length,
      data: matrix.hsnMappings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Test Tax Matrix Simulator (Admin Sandbox)
// @route   POST /api/admin/tax/test-matrix
// @access  Private (Super Admin)
exports.testTaxMatrix = async (req, res, next) => {
  try {
    const {
      amount = 1000,
      hsnCode = '85183000',
      originState = 'Delhi',
      destinationState = 'Maharashtra',
    } = req.body;

    const matrix = await getOrCreateTaxMatrix();

    // Call calculateTax internal logic
    const reqSim = {
      body: {
        items: [{ price: amount, quantity: 1, hsnCode, name: 'Tax Simulator Test Item' }],
        originState,
        destinationState,
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

    await exports.calculateTax(reqSim, resSim, next);

    res.status(200).json({
      success: true,
      message: `Tax simulation executed for ₹${amount} from ${originState} to ${destinationState}!`,
      simulation: result,
    });
  } catch (error) {
    next(error);
  }
};
