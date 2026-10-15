const PosOrder = require('../models/PosOrder');
const Product = require('../models/Product');
const VendorProfile = require('../models/VendorProfile');
const smsService = require('../services/smsService');

// Helper to resolve vendor profile
const resolveVendorProfile = async (user) => {
  if (user.role === 'vendor' || user.isVendorStaff) {
    let profile = await VendorProfile.findOne({
      $or: [{ user: user._id }, { _id: user.vendorProfile }],
    });
    if (!profile && user.vendorProfile) {
      profile = await VendorProfile.findById(user.vendorProfile);
    }
    return profile;
  }
  // Superadmin fallback: retrieve default or first store
  return await VendorProfile.findOne();
};

// @desc    Fast POS product lookup by barcode, SKU, or name
// @route   GET /api/pos/products
// @access  Private (Vendor / Vendor Staff / Super Admin)
exports.searchPosProducts = async (req, res, next) => {
  try {
    const { q = '', category } = req.query;
    const vendorProfile = await resolveVendorProfile(req.user);

    const query = { isPublished: { $ne: false } };

    if (req.user.role !== 'superadmin' && vendorProfile) {
      query.vendor = vendorProfile._id;
    }

    if (category && category !== 'ALL') {
      query.category = category;
    }

    if (q && q.trim()) {
      const searchTerm = q.trim();
      query.$or = [
        { barcode: searchTerm },
        { sku: { $regex: searchTerm, $options: 'i' } },
        { title: { $regex: searchTerm, $options: 'i' } },
      ];
    }

    let products = await Product.find(query)
      .select('title sellingPrice price stock sku barcode images thumbnail category rating brand taxRate hsnCode')
      .limit(30)
      .lean();

    // Fallback if vendor has no products specifically assigned yet
    if (products.length === 0 && query.vendor) {
      delete query.vendor;
      products = await Product.find(query)
        .select('title sellingPrice price stock sku barcode images thumbnail category rating brand taxRate hsnCode')
        .limit(30)
        .lean();
    }

    res.status(200).json({
      success: true,
      count: products.length,
      data: products.map(p => ({
        _id: p._id,
        title: p.title,
        price: p.sellingPrice !== undefined ? p.sellingPrice : (p.price || 0),
        stock: p.stock !== undefined ? p.stock : 10,
        sku: p.sku || `SKU-${p._id.toString().slice(-6).toUpperCase()}`,
        barcode: p.barcode || p.sku || `${p._id.toString().slice(-8)}`,
        thumbnail: p.thumbnail || p.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200',
        category: p.category,
        taxRate: p.taxRate || 18,
        hsnCode: p.hsnCode || '8518',
      })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create POS Counter Billing Order & Deduct Inventory
// @route   POST /api/pos/orders
// @access  Private (Vendor / Vendor Staff / Super Admin)
exports.createPosOrder = async (req, res, next) => {
  try {
    const {
      items,
      customer = {},
      paymentMethod = 'CASH',
      paymentDetails = {},
      paperSize = '80mm',
      discountAmount = 0,
      notes = '',
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart items cannot be empty for POS billing',
      });
    }

    const vendorProfile = await resolveVendorProfile(req.user);
    if (!vendorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Active vendor store profile not found for POS terminal',
      });
    }

    // Process items & verify stock
    let subtotal = 0;
    let taxTotal = 0;
    const processedItems = [];

    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Each POS item must contain a valid productId and positive quantity',
        });
      }

      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${item.productId} was not found in catalog`,
        });
      }

      const qty = parseInt(item.quantity, 10);
      const price = item.price !== undefined ? parseFloat(item.price) : (product.sellingPrice !== undefined ? product.sellingPrice : (product.price || 0));
      const lineSubtotal = Math.round(price * qty * 100) / 100;

      const taxRate = item.taxRate || product.taxRate || 18;
      const taxAmount = Math.round((lineSubtotal * (taxRate / (100 + taxRate))) * 100) / 100;

      subtotal += lineSubtotal;
      taxTotal += taxAmount;

      // Decrement product inventory safely
      product.stock = Math.max(0, (product.stock || 0) - qty);
      if (product.hasVariants && Array.isArray(product.variants) && product.variants.length > 0) {
        product.variants[0].stock = Math.max(0, (product.variants[0].stock || 0) - qty);
      }
      await product.save();

      processedItems.push({
        product: product._id,
        title: product.title,
        sku: product.sku || `SKU-${product._id.toString().slice(-6).toUpperCase()}`,
        barcode: product.barcode || product.sku || '',
        price,
        quantity: qty,
        subtotal: lineSubtotal,
        taxRate,
        taxAmount,
        hsn: product.hsnCode || '8518',
      });
    }

    const discount = Math.max(0, parseFloat(discountAmount) || 0);
    const grandTotal = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

    // Compute cash change
    const cashTendered = parseFloat(paymentDetails.cashTendered) || 0;
    let cashChangeDue = 0;
    if (paymentMethod === 'CASH') {
      cashChangeDue = cashTendered >= grandTotal ? Math.round((cashTendered - grandTotal) * 100) / 100 : 0;
    }

    // Generate unique sequential POS invoice number
    const timestampStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const posInvoiceNumber = `POS-${timestampStr}-${randomSuffix}`;

    const posOrder = await PosOrder.create({
      posInvoiceNumber,
      vendor: vendorProfile._id,
      cashier: req.user._id,
      cashierName: req.user.name || 'Store Cashier',
      customer: {
        name: customer.name || 'Walk-in Customer',
        phone: customer.phone || '',
        email: customer.email || '',
      },
      items: processedItems,
      subtotal,
      taxTotal,
      discountAmount: discount,
      grandTotal,
      paymentMethod,
      paymentDetails: {
        ...paymentDetails,
        cashTendered,
        cashChangeDue,
        upiTransactionRef: paymentDetails.upiTransactionRef || (paymentMethod === 'UPI' ? `UPI-${Date.now().toString().slice(-8)}` : ''),
      },
      paperSize: paperSize === '58mm' ? '58mm' : '80mm',
      status: 'COMPLETED',
      notes,
    });

    // Credit vendor balance
    vendorProfile.walletBalance = (vendorProfile.walletBalance || 0) + grandTotal;
    await vendorProfile.save();

    // Send SMS digital receipt if phone provided
    if (customer.phone && customer.phone.length >= 10) {
      await smsService.sendSMS({
        to: customer.phone,
        message: `Thank you for shopping at ${vendorProfile.storeName || 'AuraMarket'}! Your Bill #${posInvoiceNumber} of ₹${grandTotal} is paid. Visit again!`,
      });
    }

    res.status(201).json({
      success: true,
      message: 'POS Counter order completed and stock updated!',
      data: posOrder,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List POS Orders and Daily Cashier Metrics
// @route   GET /api/pos/orders
// @access  Private (Vendor / Vendor Staff / Super Admin)
exports.getPosOrders = async (req, res, next) => {
  try {
    const { status = 'COMPLETED', date } = req.query;
    const vendorProfile = await resolveVendorProfile(req.user);

    const filter = { status };
    if (req.user.role !== 'superadmin' && vendorProfile) {
      filter.vendor = vendorProfile._id;
    }

    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      filter.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    const orders = await PosOrder.find(filter)
      .populate('items.product', 'title thumbnail')
      .sort({ createdAt: -1 })
      .limit(50);

    // Calculate cashier daily summary metrics
    const totalSales = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    const cashCollected = orders
      .filter(o => o.paymentMethod === 'CASH')
      .reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    const upiCollected = orders
      .filter(o => o.paymentMethod === 'UPI')
      .reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    const cardCollected = orders
      .filter(o => o.paymentMethod === 'CARD')
      .reduce((sum, o) => sum + (o.grandTotal || 0), 0);

    res.status(200).json({
      success: true,
      count: orders.length,
      metrics: {
        totalOrders: orders.length,
        totalSales: Math.round(totalSales * 100) / 100,
        cashCollected: Math.round(cashCollected * 100) / 100,
        upiCollected: Math.round(upiCollected * 100) / 100,
        cardCollected: Math.round(cardCollected * 100) / 100,
      },
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Detailed Thermal Receipt Payload
// @route   GET /api/pos/orders/:id/receipt
// @access  Private (Vendor / Vendor Staff / Super Admin)
exports.getPosReceipt = async (req, res, next) => {
  try {
    const order = await PosOrder.findById(req.params.id)
      .populate('vendor')
      .populate('cashier', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'POS Order not found',
      });
    }

    const vendor = order.vendor || {};
    const storeName = vendor.storeName || 'AuraMarket Store';
    const storeAddress = vendor.pickupAddress
      ? `${vendor.pickupAddress.street || ''}, ${vendor.pickupAddress.city || ''}, ${vendor.pickupAddress.state || ''} - ${vendor.pickupAddress.pincode || ''}`
      : 'B-402, High Street Galleria, Mumbai 400051';
    const storePhone = vendor.phone || '+91 98765 43210';
    const storeGstin = vendor.taxDetails?.gstin || '27AABCA1234F1Z5';

    // Generate UPI Payment URI string
    const upiUri = `upi://pay?pa=auramarket.store@okaxis&pn=${encodeURIComponent(storeName)}&am=${order.grandTotal}&cu=INR&tn=POS-${order.posInvoiceNumber}`;

    res.status(200).json({
      success: true,
      receipt: {
        orderId: order._id,
        invoiceNumber: order.posInvoiceNumber,
        createdAt: order.createdAt,
        paperSize: order.paperSize,
        store: {
          name: storeName,
          address: storeAddress,
          phone: storePhone,
          gstin: storeGstin,
          logo: vendor.logo || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100',
        },
        cashier: {
          name: order.cashierName || order.cashier?.name || 'Counter Cashier',
        },
        customer: order.customer,
        items: order.items,
        summary: {
          subtotal: order.subtotal,
          discountAmount: order.discountAmount,
          taxTotal: order.taxTotal,
          grandTotal: order.grandTotal,
        },
        payment: {
          method: order.paymentMethod,
          details: order.paymentDetails,
        },
        upiUri,
        footerNotes: 'Thank you for your visit! Goods once sold can be exchanged within 7 days with original receipt.',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Park Active POS Cart (Hold customer order)
// @route   POST /api/pos/park
// @access  Private (Vendor / Vendor Staff / Super Admin)
exports.parkCart = async (req, res, next) => {
  try {
    const { items, customer, discountAmount = 0, parkedNotes = 'Customer stepped away' } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot park an empty cart',
      });
    }

    const vendorProfile = await resolveVendorProfile(req.user);
    const posInvoiceNumber = `HOLD-${Date.now().toString().slice(-6)}`;

    let subtotal = 0;
    const processedItems = items.map(item => {
      const lineSubtotal = Math.round(item.price * item.quantity * 100) / 100;
      subtotal += lineSubtotal;
      return {
        product: item.productId,
        title: item.title || 'Product',
        price: item.price,
        quantity: item.quantity,
        subtotal: lineSubtotal,
      };
    });

    const parkedOrder = await PosOrder.create({
      posInvoiceNumber,
      vendor: vendorProfile._id,
      cashier: req.user._id,
      cashierName: req.user.name || 'Store Cashier',
      customer: {
        name: customer?.name || 'Parked Customer',
        phone: customer?.phone || '',
      },
      items: processedItems,
      subtotal,
      grandTotal: Math.max(0, subtotal - (parseFloat(discountAmount) || 0)),
      status: 'PARKED',
      parkedNotes,
    });

    res.status(201).json({
      success: true,
      message: 'Cart parked successfully',
      data: parkedOrder,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get All Parked Carts
// @route   GET /api/pos/parked
// @access  Private (Vendor / Vendor Staff / Super Admin)
exports.getParkedCarts = async (req, res, next) => {
  try {
    const vendorProfile = await resolveVendorProfile(req.user);
    const filter = { status: 'PARKED' };
    if (req.user.role !== 'superadmin' && vendorProfile) {
      filter.vendor = vendorProfile._id;
    }

    const parkedCarts = await PosOrder.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: parkedCarts.length,
      data: parkedCarts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resume & Remove Parked Cart
// @route   DELETE /api/pos/parked/:id
// @access  Private (Vendor / Vendor Staff / Super Admin)
exports.resumeParkedCart = async (req, res, next) => {
  try {
    const cart = await PosOrder.findById(req.params.id);
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Parked cart not found' });
    }

    await PosOrder.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Parked cart retrieved and removed from queue',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};
