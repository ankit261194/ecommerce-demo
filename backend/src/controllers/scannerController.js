const Product = require('../models/Product');
const SubOrder = require('../models/SubOrder');
const DeliveryTask = require('../models/DeliveryTask');
const ShippingManifest = require('../models/ShippingManifest');
const PosOrder = require('../models/PosOrder');
const mongoose = require('mongoose');

// @desc    Universal Optical Barcode & QR Code Lookup
// @route   POST /api/scanner/lookup
// @access  Private / Authenticated
exports.lookupScannedCode = async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A valid scanned barcode or QR code string is required',
      });
    }

    const cleanCode = code.trim();

    // 1. Check Product by barcode or SKU
    const product = await Product.findOne({
      $or: [
        { barcode: cleanCode },
        { sku: { $regex: `^${cleanCode}$`, $options: 'i' } },
      ],
      isPublished: { $ne: false },
    })
      .select('title sellingPrice price stock sku barcode thumbnail category brand taxRate hsnCode')
      .populate('vendor', 'storeName');

    if (product) {
      return res.status(200).json({
        success: true,
        type: 'PRODUCT',
        message: `Recognized product: "${product.title}"`,
        data: {
          _id: product._id,
          title: product.title,
          price: product.sellingPrice !== undefined ? product.sellingPrice : (product.price || 0),
          stock: product.stock,
          sku: product.sku,
          barcode: product.barcode,
          thumbnail: product.thumbnail,
          category: product.category,
          vendor: product.vendor,
          taxRate: product.taxRate || 18,
          hsnCode: product.hsnCode || '8518',
        },
      });
    }

    // 2. Check SubOrder by trackingNumber, subOrderId, deliveryOtp or _id
    const subOrderConditions = [
      { trackingNumber: cleanCode },
      { subOrderId: cleanCode },
      { deliveryOtp: cleanCode },
    ];
    if (mongoose.Types.ObjectId.isValid(cleanCode)) {
      subOrderConditions.unshift({ _id: cleanCode });
    }

    const subOrder = await SubOrder.findOne({ $or: subOrderConditions })
      .select('subOrderId trackingNumber status grandTotal shippingAddress deliveryOtp vendor customer items')
      .populate('vendor', 'storeName phone')
      .populate('customer', 'name phone email');

    if (subOrder) {
      return res.status(200).json({
        success: true,
        type: 'SUB_ORDER',
        message: `Recognized shipment #${subOrder.subOrderId} (${subOrder.status})`,
        data: subOrder,
      });
    }

    // 3. Check DeliveryTask by ID
    if (mongoose.Types.ObjectId.isValid(cleanCode)) {
      const task = await DeliveryTask.findById(cleanCode)
        .populate('subOrder')
        .populate('deliveryPartner', 'name phone');

      if (task) {
        return res.status(200).json({
          success: true,
          type: 'DELIVERY_TASK',
          message: `Recognized delivery task: ${task.status}`,
          data: task,
        });
      }
    }

    // 4. Check ShippingManifest by manifestNumber or barcode
    const manifest = await ShippingManifest.findOne({
      $or: [
        { manifestNumber: cleanCode },
        { barcode: cleanCode },
      ],
    }).populate('vendor', 'storeName');

    if (manifest) {
      return res.status(200).json({
        success: true,
        type: 'MANIFEST',
        message: `Recognized shipping manifest #${manifest.manifestNumber}`,
        data: manifest,
      });
    }

    // 5. Check POS Invoice
    const posOrder = await PosOrder.findOne({ posInvoiceNumber: cleanCode })
      .populate('vendor', 'storeName');

    if (posOrder) {
      return res.status(200).json({
        success: true,
        type: 'POS_ORDER',
        message: `Recognized POS Receipt #${posOrder.posInvoiceNumber}`,
        data: posOrder,
      });
    }

    // 6. Generic payload fallback (e.g. UPI QR code or external URL)
    if (cleanCode.startsWith('upi://')) {
      return res.status(200).json({
        success: true,
        type: 'UPI_PAYMENT',
        message: 'Recognized UPI Payment QR Code',
        data: { upiUri: cleanCode },
      });
    }

    if (cleanCode.startsWith('http://') || cleanCode.startsWith('https://')) {
      return res.status(200).json({
        success: true,
        type: 'WEB_URL',
        message: 'Recognized Web Link QR Code',
        data: { url: cleanCode },
      });
    }

    return res.status(404).json({
      success: false,
      type: 'NOT_FOUND',
      message: `Barcode / QR Code "${cleanCode}" could not be resolved to any system record`,
      code: cleanCode,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Supported Barcode & QR Formats Catalog
// @route   GET /api/scanner/supported-formats
// @access  Public
exports.getSupportedFormats = (req, res) => {
  res.status(200).json({
    success: true,
    supportedFormats: [
      { format: 'qr_code', name: 'QR Code', type: '2D Matrix', standard: 'ISO/IEC 18004' },
      { format: 'ean_13', name: 'EAN-13 (GS1 Retail)', type: '1D Linear', standard: 'ISO/IEC 15420' },
      { format: 'code_128', name: 'Code 128 (Logistics & Shipping)', type: '1D Linear', standard: 'ISO/IEC 15417' },
      { format: 'upc_a', name: 'UPC-A (Consumer Products)', type: '1D Linear', standard: 'ANSI X3.182' },
      { format: 'data_matrix', name: 'Data Matrix (Industrial & Pharma)', type: '2D Matrix', standard: 'ISO/IEC 16022' },
    ],
    browserSupport: {
      hasBarcodeDetectorApi: true,
      hasGetUserMedia: true,
      torchHardwareSupport: true,
      laserReticleTracking: true,
    },
  });
};
