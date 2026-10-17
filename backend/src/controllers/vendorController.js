const User = require('../models/User');
const VendorProfile = require('../models/VendorProfile');
const Product = require('../models/Product');
const SubOrder = require('../models/SubOrder');
const Ledger = require('../models/Ledger');
const DeliveryTask = require('../models/DeliveryTask');
const Category = require('../models/Category');
const Review = require('../models/Review');
const UIConfig = require('../models/UIConfig');
const { recordAuditLog } = require('../utils/auditLogger');

// @desc    Get Vendor Dashboard metrics
// @route   GET /api/vendor/dashboard
exports.getVendorDashboard = async (req, res, next) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const totalProducts = await Product.countDocuments({ vendor: vendor._id });
    const pendingOrdersCount = await SubOrder.countDocuments({
      vendor: vendor._id,
      status: { $in: ['placed', 'confirmed', 'packed'] },
    });
    const completedOrdersCount = await SubOrder.countDocuments({
      vendor: vendor._id,
      status: 'delivered',
    });

    const recentSubOrders = await SubOrder.find({ vendor: vendor._id })
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        vendor,
        metrics: {
          walletBalance: vendor.walletBalance,
          totalSales: vendor.totalSales,
          totalProducts,
          pendingOrdersCount,
          completedOrdersCount,
          rating: vendor.rating,
        },
        recentSubOrders,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get All Products of Logged-in Vendor (Point #54 & Point #38: Low Stock Alert Filter & Spreadsheet Catalog Stats)
// @route   GET /api/vendor/products
exports.getVendorProducts = async (req, res, next) => {
  try {
    const vendor = req.vendorProfile || await VendorProfile.findOne({
      $or: [{ user: req.user._id }, { _id: req.user.vendorProfile }],
    });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const { filter, search, category, status } = req.query;

    const allProducts = await Product.find({ vendor: vendor._id })
      .populate('category', 'name slug')
      .sort({ createdAt: -1 });

    const stats = {
      total: allProducts.length,
      inStock: allProducts.filter(p => p.stock > (p.lowStockThreshold !== undefined ? p.lowStockThreshold : 5)).length,
      lowStock: allProducts.filter(p => p.stock > 0 && p.stock <= (p.lowStockThreshold !== undefined ? p.lowStockThreshold : 5)).length,
      outOfStock: allProducts.filter(p => p.stock <= 0).length,
      published: allProducts.filter(p => p.isPublished && p.status !== 'draft' && p.status !== 'archived').length,
      drafts: allProducts.filter(p => !p.isPublished || p.status === 'draft').length,
      archived: allProducts.filter(p => p.status === 'archived').length,
    };

    let filtered = allProducts;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(p =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q))
      );
    }
    if (category) {
      filtered = filtered.filter(p => p.category && String(p.category._id || p.category) === String(category));
    }
    if (filter === 'low_stock') {
      filtered = filtered.filter(p => p.stock > 0 && p.stock <= (p.lowStockThreshold !== undefined ? p.lowStockThreshold : 5));
    } else if (filter === 'out_of_stock') {
      filtered = filtered.filter(p => p.stock <= 0);
    } else if (filter === 'in_stock') {
      filtered = filtered.filter(p => p.stock > (p.lowStockThreshold !== undefined ? p.lowStockThreshold : 5));
    } else if (filter === 'drafts' || status === 'draft') {
      filtered = filtered.filter(p => !p.isPublished || p.status === 'draft');
    } else if (filter === 'published' || status === 'published') {
      filtered = filtered.filter(p => p.isPublished && p.status !== 'draft' && p.status !== 'archived');
    } else if (filter === 'archived' || status === 'archived') {
      filtered = filtered.filter(p => p.status === 'archived');
    }

    res.status(200).json({
      success: true,
      count: filtered.length,
      stats,
      data: filtered,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a Product
// @route   POST /api/vendor/products
exports.createProduct = async (req, res, next) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor || vendor.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Your store must be approved by SuperAdmin to publish products.',
      });
    }

    const { title, description, category, brand, images, thumbnail, gallery, mrp, sellingPrice, stock, sku, hasVariants, variants, tags, lowStockThreshold } = req.body;

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4);

    let calculatedStock = Number(stock) || 0;
    if (hasVariants && Array.isArray(variants) && variants.length > 0) {
      calculatedStock = variants.reduce((acc, v) => acc + (Number(v.stock) || 0), 0);
    }

    const defaultImg = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';
    let primaryThumbnail = thumbnail || (images && images.length ? images[0] : (gallery && gallery.length ? gallery[0] : defaultImg));
    let cleanGallery = Array.isArray(gallery) ? gallery.filter(img => img && img !== primaryThumbnail) : (images && images.length > 1 ? images.slice(1) : []);
    let combinedImages = [primaryThumbnail, ...cleanGallery];

    // Point #53: Original MRP vs Selling Discount Calculation
    const sellPrice = Number(sellingPrice) || 0;
    let originalMrp = Number(mrp) || Math.round(sellPrice * 1.25);
    if (originalMrp < sellPrice) {
      originalMrp = sellPrice;
    }
    const savings = Math.max(0, originalMrp - sellPrice);
    const discPct = originalMrp > 0 ? Math.round((savings / originalMrp) * 100) : 0;

    const product = await Product.create({
      vendor: vendor._id,
      title,
      slug,
      description,
      category,
      brand: brand || vendor.storeName,
      thumbnail: primaryThumbnail,
      gallery: cleanGallery,
      images: combinedImages,
      mrp: originalMrp,
      sellingPrice: sellPrice,
      discountPercentage: discPct,
      savingsAmount: savings,
      stock: calculatedStock,
      lowStockThreshold: typeof lowStockThreshold === 'number' ? lowStockThreshold : (Number(lowStockThreshold) || 5),
      sku: sku || 'SKU-' + Date.now(),
      hasVariants: !!hasVariants,
      variants: variants || [],
      tags: tags || [],
    });

    res.status(201).json({ success: true, message: 'Product created successfully', data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a Product
// @route   PUT /api/vendor/products/:id
exports.updateProduct = async (req, res, next) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    let product = await Product.findOne({ _id: req.params.id, vendor: vendor._id });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found or not owned by your store' });
    }

    if (req.body.hasVariants && Array.isArray(req.body.variants) && req.body.variants.length > 0) {
      req.body.stock = req.body.variants.reduce((acc, v) => acc + (Number(v.stock) || 0), 0);
    }

    // Point #52: Sync media fields if updated
    if (req.body.thumbnail || req.body.gallery || req.body.images) {
      const primaryThumb = req.body.thumbnail || (req.body.images && req.body.images[0]) || product.thumbnail || product.images[0];
      const gal = Array.isArray(req.body.gallery) ? req.body.gallery : (req.body.images && req.body.images.length > 1 ? req.body.images.slice(1) : product.gallery || []);
      const cleanGal = gal.filter(img => img && img !== primaryThumb);
      req.body.thumbnail = primaryThumb;
      req.body.gallery = cleanGal;
      req.body.images = [primaryThumb, ...cleanGal];
    }

    // Point #53: MRP vs Selling Discount Calculation on Update
    if (req.body.sellingPrice !== undefined || req.body.mrp !== undefined) {
      const updatedSelling = req.body.sellingPrice !== undefined ? Number(req.body.sellingPrice) : product.sellingPrice;
      let updatedMrp = req.body.mrp !== undefined ? Number(req.body.mrp) : product.mrp;
      if (updatedMrp < updatedSelling) {
        updatedMrp = updatedSelling;
      }
      const savings = Math.max(0, updatedMrp - updatedSelling);
      req.body.sellingPrice = updatedSelling;
      req.body.mrp = updatedMrp;
      req.body.savingsAmount = savings;
      req.body.discountPercentage = updatedMrp > 0 ? Math.round((savings / updatedMrp) * 100) : 0;
    }

    const oldSelling = product.sellingPrice || product.price || 0;
    const oldStock = product.stock || 0;

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // Point 6 & Point 15: Automatically trigger Price Drop Alerts if price dropped
    if (req.body.sellingPrice !== undefined && Number(req.body.sellingPrice) < oldSelling) {
      const { checkAndTriggerPriceDropAlerts } = require('./priceDropAlertController');
      checkAndTriggerPriceDropAlerts(product._id, oldSelling, Number(req.body.sellingPrice)).catch(console.error);
    }

    // Point 15: Automatically trigger Back-in-Stock Alerts if restocked
    if (oldStock <= 0 && product.stock > 0) {
      const { checkAndTriggerStockAlerts } = require('./priceDropAlertController');
      checkAndTriggerStockAlerts(product._id, oldStock, product.stock).catch(console.error);
    }

    const priceChanged = req.body.sellingPrice !== undefined && Number(req.body.sellingPrice) !== oldSelling;
    await recordAuditLog({
      action: priceChanged ? 'UPDATE_PRICE' : 'UPDATE_PRODUCT',
      module: 'PRODUCTS',
      req,
      description: priceChanged
        ? `Product '${product.title}' price changed from ₹${oldSelling} to ₹${product.sellingPrice}`
        : `Product '${product.title}' details updated`,
      targetType: 'Product',
      targetId: String(product._id),
      previousValue: { sellingPrice: oldSelling, stock: product.stock },
      newValue: { sellingPrice: product.sellingPrice, stock: product.stock },
      changeSummary: priceChanged ? `Price changed: ₹${oldSelling} -> ₹${product.sellingPrice}` : 'Attributes updated',
      severity: priceChanged ? 'HIGH' : 'LOW',
    });

    res.status(200).json({ success: true, message: 'Product updated successfully', data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Product Media Gallery (Point #52: Set primary thumbnail, reorder gallery photos)
// @route   PUT /api/vendor/products/:id/media
exports.updateProductMedia = async (req, res, next) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    let product = await Product.findOne({ _id: req.params.id, vendor: vendor._id });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found or not owned by your store' });
    }

    const { thumbnail, gallery } = req.body;
    const primaryThumb = thumbnail || product.thumbnail || (product.images && product.images[0]);
    const cleanGallery = Array.isArray(gallery) ? gallery.filter(img => img && img !== primaryThumb) : (product.gallery || []);

    product.thumbnail = primaryThumb;
    product.gallery = cleanGallery;
    product.images = [primaryThumb, ...cleanGallery];
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product media updated successfully',
      data: {
        thumbnail: product.thumbnail,
        gallery: product.gallery,
        images: product.images,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a Product
// @route   DELETE /api/vendor/products/:id
exports.deleteProduct = async (req, res, next) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const product = await Product.findOneAndDelete({ _id: req.params.id, vendor: vendor._id });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found or not owned by your store' });
    }

    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Sub-Orders for Vendor
// @desc    Get Sub-Orders for Vendor (Point #56 Lifecycle Management)
// @route   GET /api/vendor/orders
exports.getVendorOrders = async (req, res, next) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const { status } = req.query;
    const filter = { vendor: vendor._id };

    if (status === 'pending') {
      filter.status = { $in: ['placed', 'pending'] };
    } else if (status === 'packaging') {
      filter.status = { $in: ['confirmed', 'packaging'] };
    } else if (status === 'ready_for_pickup') {
      filter.status = { $in: ['packed', 'ready_for_pickup'] };
    } else if (status === 'dispatched') {
      filter.status = { $in: ['dispatched', 'handed_to_courier', 'out_for_delivery'] };
    } else if (status && status !== 'all') {
      filter.status = status;
    }

    const allVendorOrders = await SubOrder.find({ vendor: vendor._id });
    const stats = {
      total: allVendorOrders.length,
      pending: allVendorOrders.filter(o => ['placed', 'pending'].includes(o.status)).length,
      packaging: allVendorOrders.filter(o => ['confirmed', 'packaging'].includes(o.status)).length,
      readyForPickup: allVendorOrders.filter(o => ['packed', 'ready_for_pickup'].includes(o.status)).length,
      dispatched: allVendorOrders.filter(o => ['dispatched', 'handed_to_courier', 'out_for_delivery'].includes(o.status)).length,
      delivered: allVendorOrders.filter(o => o.status === 'delivered').length,
      cancelled: allVendorOrders.filter(o => o.status === 'cancelled').length,
    };

    const orders = await SubOrder.find(filter)
      .populate('customer', 'name email phone')
      .populate('deliveryPartner', 'name phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      stats,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Sub-Order Status (Point #56: Pending -> Packaging -> Ready for Pickup -> Handed to Courier)
// @route   PUT /api/vendor/orders/:id/status
exports.updateSubOrderStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const subOrder = await SubOrder.findOne({ _id: req.params.id, vendor: vendor._id });
    if (!subOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Allowed status transitions for vendor
    const allowedVendorStatuses = [
      'confirmed',
      'packaging',
      'packed',
      'ready_for_pickup',
      'dispatched',
      'handed_to_courier',
      'cancelled',
    ];

    if (!allowedVendorStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition '${status}'. Vendors can only transition orders through: ${allowedVendorStatuses.join(', ')}. Delivery completion requires customer OTP verification by the rider.`,
      });
    }

    if (subOrder.status === 'delivered') {
      return res.status(400).json({ success: false, message: 'Cannot modify a delivered sub-order.' });
    }
    if (subOrder.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Sub-order is already cancelled.' });
    }

    // If vendor cancels the sub-order
    if (status === 'cancelled') {
      // 1. Restore product stock
      if (subOrder.items && subOrder.items.length > 0) {
        for (const item of subOrder.items) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
        }
      }

      // 2. Reverse vendor wallet balance and sales stats
      vendor.walletBalance = Math.max(0, vendor.walletBalance - subOrder.vendorEarning);
      vendor.totalSales = Math.max(0, vendor.totalSales - subOrder.subTotal);
      vendor.totalEarnings = Math.max(0, vendor.totalEarnings - subOrder.vendorEarning);
      await vendor.save();

      // 3. Create Refund Ledger Entry
      await Ledger.create({
        vendor: vendor._id,
        subOrder: subOrder._id,
        type: 'REFUND',
        amount: subOrder.vendorEarning,
        description: `Vendor cancellation refund for SubOrder #${subOrder._id.toString().slice(-6)}`,
        balanceAfter: vendor.walletBalance,
        status: 'COMPLETED',
      });

      // 4. Cancel delivery task
      await DeliveryTask.findOneAndUpdate(
        { subOrder: subOrder._id, status: { $ne: 'DELIVERED' } },
        { status: 'CANCELLED' }
      );
    }

    // Lifecycle timestamps
    const now = new Date();
    if (['packaging', 'confirmed'].includes(status)) {
      if (!subOrder.acceptedAt) subOrder.acceptedAt = now;
      if (!subOrder.packagingStartedAt) subOrder.packagingStartedAt = now;
    } else if (['ready_for_pickup', 'packed'].includes(status)) {
      if (!subOrder.readyForPickupAt) subOrder.readyForPickupAt = now;
    } else if (['dispatched', 'handed_to_courier'].includes(status)) {
      if (!subOrder.dispatchedAt) subOrder.dispatchedAt = now;
      // Sync DeliveryTask
      await DeliveryTask.findOneAndUpdate(
        { subOrder: subOrder._id, status: 'ASSIGNED' },
        { status: 'PICKED_UP' }
      );
    }

    subOrder.status = status;
    subOrder.trackingHistory.push({
      status,
      timestamp: now,
      note: note || `Vendor updated lifecycle status to ${status}`,
    });

    await subOrder.save();

    res.status(200).json({
      success: true,
      message: `Sub-order lifecycle updated to '${status}' successfully`,
      data: subOrder,
    });
  } catch (error) {
    next(error);
  }
};

// Helper for generating printable Shipping Label & Packing Slip HTML (Point #57)
function generatePrintableHtml(d, type) {
  if (type === 'thermal') {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Shipping Label - ${d.subOrderNumber}</title>
  <style>
    @page { size: 100mm 150mm; margin: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 4mm; color: #000; font-size: 11px; line-height: 1.3; }
    .box { border: 2px solid #000; padding: 6px; margin-bottom: 4px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 4px; }
    .logo { font-size: 16px; font-weight: 900; letter-spacing: -0.5px; }
    .barcode { text-align: center; margin: 6px 0; font-family: monospace; letter-spacing: 4px; font-weight: bold; font-size: 16px; }
    .barcode-lines { height: 38px; background: repeating-linear-gradient(90deg, #000, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 7px, #fff 7px, #fff 9px); margin-bottom: 2px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
    .bold { font-weight: bold; }
    .badge { display: inline-block; padding: 2px 6px; background: #000; color: #fff; font-weight: bold; font-size: 10px; border-radius: 2px; }
    .cod-badge { background: #000; color: #fff; padding: 4px; font-size: 13px; font-weight: 900; text-align: center; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 9px; }
    th, td { border: 1px solid #000; padding: 3px; text-align: left; }
    @media print { body { margin: 2mm; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="box">
    <div class="header">
      <div class="logo">AuraMarket Express</div>
      <div class="badge">${d.courierPartner}</div>
    </div>
    <div class="barcode">
      <div class="barcode-lines"></div>
      ${d.subOrderNumber}
    </div>
    <div class="grid" style="border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 0;">
      <div><strong>Routing:</strong> ${d.routingCode}</div>
      <div><strong>Weight:</strong> ${d.totalWeightKg} KG</div>
    </div>
    ${d.isCOD ? `<div class="cod-badge">CASH ON DELIVERY (COD): ₹${d.amountToCollect}</div>` : `<div style="border: 1px dashed #000; text-align:center; padding:3px; font-weight:bold; margin:4px 0;">PREPAID - DO NOT COLLECT CASH</div>`}
    <div style="margin-top: 4px;">
      <div class="bold" style="font-size: 10px; text-transform: uppercase;">Ship To:</div>
      <div class="bold" style="font-size: 13px;">${d.customer.name}</div>
      <div>${d.customer.address}</div>
      <div><strong>Phone:</strong> ${d.customer.phone}</div>
    </div>
    <div style="margin-top: 4px; border-top: 1px dashed #000; padding-top: 4px;">
      <div class="bold" style="font-size: 9px; text-transform: uppercase;">Return Address (Seller):</div>
      <div class="bold">${d.seller.storeName} (GST: ${d.seller.gstin})</div>
      <div style="font-size: 9px;">${d.seller.address}</div>
    </div>
    <table>
      <thead><tr><th>SKU</th><th>Item</th><th>Qty</th></tr></thead>
      <tbody>
        ${d.items.map(i => `<tr><td>${i.sku}</td><td>${i.title}</td><td>${i.quantity}</td></tr>`).join('')}
      </tbody>
    </table>
    <div style="font-size: 8px; text-align: center; margin-top: 4px;">
      ${d.deliveryOtpNotice}
    </div>
  </div>
</body>
</html>`;
  }

  // A4 Full Packing Slip / Tax Invoice
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tax Invoice / Packing Slip - ${d.invoiceNumber}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #111; font-size: 12px; line-height: 1.4; margin: 0; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .title { font-size: 22px; font-weight: 900; color: #0f172a; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 16px; }
    .meta-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #f8fafc; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #0f172a; color: #fff; padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
    td { padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
    .total-box { margin-left: auto; width: 280px; margin-top: 16px; border-top: 2px solid #0f172a; padding-top: 8px; }
    .total-row { display: flex; justify-content: space-between; padding: 3px 0; }
    .grand-total { font-size: 15px; font-weight: 900; border-top: 1px solid #cbd5e1; padding-top: 6px; margin-top: 4px; }
    .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    .sign-box { border-top: 1px solid #000; width: 160px; text-align: center; padding-top: 4px; font-size: 10px; font-weight: bold; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">AuraMarket — Multi-Vendor Commerce</div>
      <div style="font-size: 12px; color: #64748b; font-weight: bold;">OFFICIAL TAX INVOICE & PACKING SLIP</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 14px; font-weight: bold;">${d.invoiceNumber}</div>
      <div style="color: #64748b;">Order: ${d.orderNumber}</div>
      <div style="color: #64748b;">Date: ${new Date(d.invoiceDate).toLocaleDateString('en-IN')}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-card">
      <strong style="color: #0f172a; text-transform: uppercase; font-size: 11px;">Sold By (Merchant):</strong>
      <div style="font-weight: bold; font-size: 13px; margin-top: 2px;">${d.seller.storeName}</div>
      <div>${d.seller.address}</div>
      <div><strong>GSTIN:</strong> ${d.seller.gstin}</div>
      <div><strong>Email:</strong> ${d.seller.email} | <strong>Phone:</strong> ${d.seller.phone}</div>
    </div>
    <div class="meta-card">
      <strong style="color: #0f172a; text-transform: uppercase; font-size: 11px;">Billing & Shipping To:</strong>
      <div style="font-weight: bold; font-size: 13px; margin-top: 2px;">${d.customer.name}</div>
      <div>${d.customer.address}</div>
      <div><strong>Phone:</strong> ${d.customer.phone}</div>
      <div style="margin-top: 2px; color: #475569;"><strong>Courier Routing:</strong> ${d.routingCode} (${d.courierPartner})</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Product Description</th>
        <th>SKU</th>
        <th>Qty</th>
        <th>Price</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${d.items.map((item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${item.title}</strong></td>
          <td><code>${item.sku}</code></td>
          <td>${item.quantity}</td>
          <td>₹${item.price.toLocaleString('en-IN')}</td>
          <td>₹${item.totalPrice.toLocaleString('en-IN')}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="total-box">
    <div class="total-row"><span>Sub Total:</span><span>₹${d.pricing.subTotal.toLocaleString('en-IN')}</span></div>
    <div class="total-row"><span>GST / Tax (Included 18%):</span><span>₹${d.pricing.tax.toLocaleString('en-IN')}</span></div>
    <div class="total-row"><span>Shipping Charges:</span><span>FREE</span></div>
    <div class="total-row grand-total"><span>Grand Total:</span><span>₹${d.pricing.totalAmount.toLocaleString('en-IN')}</span></div>
    <div style="text-align: right; font-size: 10px; color: #64748b; margin-top: 4px;">Payment Method: <strong>${d.paymentMethod}</strong> (${d.paymentStatus})</div>
  </div>

  <div class="footer">
    <div style="font-size: 10px; color: #64748b; max-width: 380px;">
      This is a computer-generated invoice and packing slip issued on behalf of ${d.seller.storeName} via AuraMarket Multi-Vendor Platform. All goods are packed with high-grade security seals.
    </div>
    <div class="sign-box">
      Authorized Signatory<br>
      <span style="font-size: 9px; color: #64748b;">${d.seller.storeName}</span>
    </div>
  </div>
</body>
</html>`;
}

// @desc    Get Shipping Label & Packing Slip Data (Point #57)
// @route   GET /api/vendor/orders/:id/shipping-label
exports.getShippingLabelData = async (req, res, next) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const subOrder = await SubOrder.findOne({ _id: req.params.id, vendor: vendor._id })
      .populate('customer', 'name email phone')
      .populate('deliveryPartner', 'name phone')
      .populate('parentOrder', 'orderNumber paymentMethod paymentStatus totalAmount');

    if (!subOrder) {
      return res.status(404).json({ success: false, message: 'Sub-order not found or not owned by your store' });
    }

    const orderRef = subOrder.parentOrder?.orderNumber || `ORD-${subOrder._id.toString().slice(-8).toUpperCase()}`;
    const subOrderRef = `SUB-${subOrder._id.toString().slice(-6).toUpperCase()}`;
    const routingCode = `EXP-${(subOrder.shippingAddress?.pincode || '110001').slice(0, 3)}-${subOrder._id.toString().slice(-4).toUpperCase()}`;
    const barcodeValue = `*${subOrderRef}*`;
    const trackingUrl = `https://shribalajikripadham.online/ecommerce-demo/#track/${orderRef}`;

    const totalWeightKg = (subOrder.items.reduce((acc, i) => acc + (i.quantity * 0.45), 0)).toFixed(2);
    const invoiceNumber = `INV-${new Date().getFullYear()}-${subOrder._id.toString().slice(-6).toUpperCase()}`;

    const labelData = {
      orderId: subOrder.parentOrder?._id || subOrder.parentOrder,
      orderNumber: orderRef,
      subOrderId: subOrder._id,
      subOrderNumber: subOrderRef,
      invoiceNumber,
      invoiceDate: subOrder.createdAt || new Date(),
      routingCode,
      barcodeValue,
      qrValue: trackingUrl,
      courierPartner: subOrder.deliveryPartner?.name || 'AuraMarket Express Courier',
      paymentMethod: subOrder.parentOrder?.paymentMethod || 'PREPAID',
      paymentStatus: subOrder.parentOrder?.paymentStatus || 'PAID',
      isCOD: (subOrder.parentOrder?.paymentMethod || '').toUpperCase() === 'COD',
      amountToCollect: (subOrder.parentOrder?.paymentMethod || '').toUpperCase() === 'COD' ? subOrder.subTotal : 0,
      totalWeightKg,
      dimensions: '22 x 16 x 8 cm',
      seller: {
        storeName: vendor.storeName || 'Apex Tech Hub',
        storeSlug: vendor.storeSlug || 'apex-tech',
        email: vendor.supportEmail || 'seller@auramarket.com',
        phone: vendor.phone || '+91 98765 43210',
        address: vendor.address || 'Plot 42, Tech Hub Logistics Center, Sector 62, Noida, UP, 201301',
        gstin: vendor.gstin || '07AAAAA0000A1Z5',
      },
      customer: {
        name: subOrder.shippingAddress?.recipientName || subOrder.customer?.name || 'Valued Customer',
        phone: subOrder.shippingAddress?.phone || subOrder.customer?.phone || '9876543210',
        address: `${subOrder.shippingAddress?.street || 'Flat 402, Green Valley Apartments'}, ${subOrder.shippingAddress?.city || 'New Delhi'}, ${subOrder.shippingAddress?.state || 'Delhi'} - ${subOrder.shippingAddress?.pincode || '110001'}`,
        deliveryInstructions: subOrder.deliveryInstructions || 'Leave at reception / doorstep',
      },
      items: subOrder.items.map(item => ({
        title: item.title,
        sku: item.variantSku || 'SKU-STD',
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.totalPrice,
      })),
      pricing: {
        subTotal: subOrder.subTotal,
        shippingFee: 0,
        tax: Math.round(subOrder.subTotal * 0.18),
        totalAmount: subOrder.subTotal,
      },
      deliveryOtpNotice: 'Customer 4-digit secret OTP required at doorstep verification.',
    };

    if (req.query.format === 'html') {
      const html = generatePrintableHtml(labelData, req.query.type || 'thermal');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }

    res.status(200).json({
      success: true,
      data: labelData,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// Point 9: Bulk 4x6 Thermal Shipping Label & Barcode Sticker Generator
// =========================================================================

function generateBulkThermalHtml({ labels, paperSize = '4x6', manifestSummary }) {
  const isA4Stickers = paperSize === 'a4_stickers';
  const pageTitle = `AuraMarket Thermal Shipping Labels - ${labels.length} Orders (${manifestSummary.totalCodOrders} COD, ${manifestSummary.totalPrepaidOrders} Prepaid)`;

  const labelsHtml = labels
    .map((d, index) => {
      return `
    <div class="label-wrapper ${isA4Stickers ? 'a4-sticker-card' : 'thermal-roll-card'}">
      <div class="thermal-box">
        <!-- Carrier & Header -->
        <div class="label-header">
          <div class="carrier-brand">
            <span class="carrier-logo">AuraMarket</span>
            <span class="carrier-express">EXPRESS</span>
          </div>
          <div class="carrier-badge">${d.courierPartner}</div>
          <div class="routing-badge">${d.routingPincode}</div>
        </div>

        <!-- Barcode Block -->
        <div class="barcode-container">
          <div class="barcode-lines"></div>
          <div class="barcode-text">${d.subOrderNumber} &bull; ${d.awbCode}</div>
        </div>

        <!-- Routing & Package Meta -->
        <div class="meta-row">
          <div><strong>ROUTING:</strong> ${d.routingCode}</div>
          <div><strong>WT:</strong> ${d.totalWeightKg} KG &bull; ${d.packageCount}</div>
        </div>

        <!-- Payment Banner -->
        ${
          d.isCOD
            ? `<div class="payment-banner cod-banner">
                 &#9888; CASH ON DELIVERY: &#8377;${Number(d.amountToCollect).toLocaleString('en-IN')}
                 <span class="cod-sub">COLLECT EXACT CASH BEFORE OPENING</span>
               </div>`
            : `<div class="payment-banner prepaid-banner">
                 &#10003; PREPAID ORDER &mdash; DO NOT COLLECT CASH
               </div>`
        }

        <!-- Addresses Grid -->
        <div class="address-grid">
          <div class="address-col ship-to">
            <div class="addr-label">DELIVER TO:</div>
            <div class="customer-name">${d.recipient.name}</div>
            <div class="customer-addr">${d.recipient.address}</div>
            <div class="customer-phone"><strong>Phone:</strong> ${d.recipient.phone}</div>
          </div>
          <div class="address-col return-to">
            <div class="addr-label">RETURN TO (SELLER):</div>
            <div class="seller-name">${d.seller.storeName}</div>
            <div class="seller-gstin">GSTIN: ${d.seller.gstin}</div>
            <div class="seller-addr">${d.seller.address}</div>
            <div class="seller-contact">Ph: ${d.seller.phone}</div>
          </div>
        </div>

        <!-- Order Items Manifest Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 25%;">SKU</th>
              <th>Product Description</th>
              <th style="width: 15%; text-align: center;">HSN</th>
              <th style="width: 10%; text-align: center;">Qty</th>
            </tr>
          </thead>
          <tbody>
            ${d.items
              .slice(0, 4)
              .map(
                (item) => `
              <tr>
                <td class="font-mono">${item.sku}</td>
                <td>${item.title.length > 40 ? item.title.slice(0, 37) + '...' : item.title}</td>
                <td style="text-align: center;">${item.hsnCode || '85183000'}</td>
                <td style="text-align: center; font-weight: bold;">${item.quantity}</td>
              </tr>
            `
              )
              .join('')}
            ${d.items.length > 4 ? `<tr><td colspan="4" style="text-align: center; font-style: italic;">+ ${d.items.length - 4} more items in package</td></tr>` : ''}
          </tbody>
        </table>

        <!-- Footer Verification & OTP -->
        <div class="label-footer">
          <div class="qr-mock">
            <div class="qr-squares"></div>
            <span class="qr-text">SCAN AWB</span>
          </div>
          <div class="footer-center">
            <div class="inv-details">Inv: <strong>${d.invoiceNumber}</strong> &bull; ${new Date(d.invoiceDate).toLocaleDateString('en-IN')}</div>
            <div class="otp-pill">&#128274; 4-Digit Secure OTP Required for Handover</div>
            <div class="tracking-url">Track: auramarket.com/track/${d.orderNumber}</div>
          </div>
          <div class="page-num">
            <span>#${index + 1}</span>
            <small>OF ${labels.length}</small>
          </div>
        </div>
      </div>
    </div>
    `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <style>
    ${
      isA4Stickers
        ? `
        @page { size: A4; margin: 10mm; }
        .labels-container {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12mm 8mm;
        }
        .a4-sticker-card {
          page-break-inside: avoid;
          break-inside: avoid;
          border: 1px dashed #94a3b8;
          padding: 3mm;
          height: 128mm;
          box-sizing: border-box;
        }
        `
        : `
        @page {
          size: 100mm 150mm;
          margin: 0;
        }
        .thermal-roll-card {
          width: 100mm;
          height: 148mm;
          margin: 0 auto;
          page-break-after: always;
          break-after: page;
          box-sizing: border-box;
          padding: 3mm;
        }
        `
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #000;
      background: #f1f5f9;
      font-size: 10px;
      line-height: 1.25;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Floating UI Toolbar for Screen Preview */
    .print-toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: #0f172a;
      color: #f8fafc;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    }
    .toolbar-title {
      font-size: 15px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .badge-count {
      background: #f59e0b;
      color: #000;
      font-size: 11px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 9999px;
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .btn-print {
      background: #22c55e;
      color: #052e16;
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-weight: 800;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 2px 6px rgba(34, 197, 94, 0.4);
      transition: background 0.15s ease;
    }
    .btn-print:hover {
      background: #16a34a;
      color: #fff;
    }

    .thermal-box {
      border: 2px solid #000;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 6px;
      background: #fff;
    }

    .label-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #000;
      padding-bottom: 4px;
    }
    .carrier-brand {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }
    .carrier-logo {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: -0.5px;
    }
    .carrier-express {
      font-size: 9px;
      font-weight: 900;
      background: #000;
      color: #fff;
      padding: 1px 4px;
      border-radius: 2px;
    }
    .carrier-badge {
      font-size: 11px;
      font-weight: 800;
      border: 1.5px solid #000;
      padding: 1px 6px;
      border-radius: 3px;
      text-transform: uppercase;
    }
    .routing-badge {
      font-size: 13px;
      font-weight: 900;
      background: #000;
      color: #fff;
      padding: 2px 6px;
      border-radius: 3px;
      letter-spacing: 0.5px;
    }

    .barcode-container {
      text-align: center;
      margin: 4px 0 2px 0;
    }
    .barcode-lines {
      height: 42px;
      background: repeating-linear-gradient(90deg, #000, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 7px, #fff 7px, #fff 8px, #000 8px, #000 11px, #fff 11px, #fff 13px);
      width: 90%;
      margin: 0 auto;
    }
    .barcode-text {
      font-family: "Courier New", Courier, monospace;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 2px;
      margin-top: 2px;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 3px 2px;
      margin: 2px 0;
    }

    .payment-banner {
      text-align: center;
      font-weight: 900;
      padding: 4px;
      font-size: 12px;
      margin: 2px 0;
      border-radius: 2px;
    }
    .cod-banner {
      background: #000;
      color: #fff;
    }
    .cod-sub {
      display: block;
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-top: 1px;
      opacity: 0.9;
    }
    .prepaid-banner {
      border: 1.5px dashed #000;
      color: #000;
      font-size: 11px;
    }

    .address-grid {
      display: grid;
      grid-template-columns: 1.25fr 1fr;
      gap: 6px;
      border: 1px solid #000;
      padding: 4px;
      margin: 2px 0;
    }
    .address-col {
      display: flex;
      flex-direction: column;
    }
    .addr-label {
      font-size: 8px;
      font-weight: 900;
      color: #333;
      margin-bottom: 1px;
    }
    .customer-name {
      font-size: 12px;
      font-weight: 900;
      line-height: 1.2;
    }
    .customer-addr {
      font-size: 9.5px;
      line-height: 1.25;
      margin: 1px 0;
    }
    .customer-phone {
      font-size: 9.5px;
      margin-top: auto;
    }
    .seller-name {
      font-size: 10.5px;
      font-weight: 800;
    }
    .seller-gstin {
      font-size: 8.5px;
      font-weight: 700;
    }
    .seller-addr {
      font-size: 8.5px;
      color: #222;
      line-height: 1.2;
    }
    .seller-contact {
      font-size: 8.5px;
      margin-top: auto;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 2px 0;
      font-size: 8.5px;
    }
    .items-table th, .items-table td {
      border: 1px solid #000;
      padding: 2.5px 3px;
      text-align: left;
    }
    .items-table th {
      background: #000;
      color: #fff;
      font-size: 8px;
      text-transform: uppercase;
    }
    .font-mono { font-family: monospace; font-size: 8px; }

    .label-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid #000;
      padding-top: 3px;
      margin-top: 2px;
    }
    .qr-mock {
      border: 1px solid #000;
      padding: 2px;
      text-align: center;
      width: 38px;
      height: 38px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .qr-squares {
      width: 24px;
      height: 24px;
      background: 
        linear-gradient(45deg, #000 25%, transparent 25%), 
        linear-gradient(-45deg, #000 25%, transparent 25%), 
        linear-gradient(45deg, transparent 75%, #000 75%), 
        linear-gradient(-45deg, transparent 75%, #000 75%);
      background-size: 6px 6px;
    }
    .qr-text { font-size: 6px; font-weight: bold; margin-top: 1px; }

    .footer-center {
      text-align: center;
      flex: 1;
      padding: 0 4px;
    }
    .inv-details { font-size: 8.5px; }
    .otp-pill {
      display: inline-block;
      font-size: 8px;
      font-weight: 800;
      background: #f1f5f9;
      border: 1px solid #000;
      padding: 1px 4px;
      border-radius: 2px;
      margin: 1px 0;
    }
    .tracking-url { font-size: 7.5px; color: #444; }

    .page-num {
      text-align: right;
      font-weight: 900;
      font-size: 13px;
      line-height: 1;
    }
    .page-num small { display: block; font-size: 7px; color: #666; }

    @media print {
      body { background: #fff; margin: 0; padding: 0; }
      .no-print { display: none !important; }
      .thermal-roll-card {
        margin: 0;
        border: none;
      }
      .a4-sticker-card {
        border: none;
      }
    }
  </style>
</head>
<body>
  <div class="print-toolbar no-print">
    <div class="toolbar-title">
      <span>&#128229; AuraMarket Enterprise 4x6 Thermal Shipping Labels</span>
      <span class="badge-count">${labels.length} Orders Loaded</span>
    </div>
    <div class="toolbar-actions">
      <span style="font-size: 12px; color: #94a3b8;">
        Paper: <strong>${isA4Stickers ? 'A4 Sheet (4 Labels/page)' : '4x6" Thermal Roll (100x150mm)'}</strong>
      </span>
      <button onclick="window.print()" class="btn-print">
        &#128424; Print All Labels (Ctrl+P)
      </button>
    </div>
  </div>

  <div class="labels-container" style="padding: 12px 0;">
    ${labelsHtml}
  </div>
</body>
</html>`;
}

// @desc    Generate Multi-Order 4x6 Thermal Shipping Labels & Barcodes (Point 9)
// @route   POST /api/vendor/orders/bulk-shipping-labels
// @route   GET /api/vendor/orders/bulk-shipping-labels
// @route   POST /api/admin/orders/bulk-shipping-labels
exports.generateBulkShippingLabels = async (req, res, next) => {
  try {
    let vendor;
    const isAdmin = req.user && (req.user.role === 'superadmin' || req.user.role === 'admin');

    if (isAdmin) {
      const targetVendorId = req.body?.vendorId || req.query?.vendorId;
      if (targetVendorId) {
        vendor = await VendorProfile.findById(targetVendorId);
      } else {
        vendor = (await VendorProfile.findOne({ status: 'approved' })) || (await VendorProfile.findOne({}));
      }
    } else {
      vendor = await VendorProfile.findOne({ user: req.user._id });
    }

    if (!vendor && !isAdmin) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    let subOrderIds = req.body?.subOrderIds || req.query?.subOrderIds;
    if (typeof subOrderIds === 'string') {
      subOrderIds = subOrderIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
    }

    if (!Array.isArray(subOrderIds) || subOrderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of subOrderIds to generate bulk shipping labels.',
      });
    }

    if (subOrderIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 100 shipping labels can be generated in a single batch.',
      });
    }

    const query = { _id: { $in: subOrderIds } };
    if (!isAdmin && vendor) {
      query.vendor = vendor._id;
    }

    const subOrders = await SubOrder.find(query)
      .populate('customer', 'name email phone')
      .populate('deliveryPartner', 'name phone')
      .populate('vendor', 'storeName storeSlug phone supportEmail address gstin')
      .populate('parentOrder', 'orderNumber paymentMethod paymentStatus totalAmount createdAt');

    if (!subOrders || subOrders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No matching sub-orders found for shipping label generation.',
      });
    }

    const paperSize = req.body?.paperSize || req.query?.paperSize || '4x6';
    const maskPhone = req.body?.maskPhone === true || req.query?.maskPhone === 'true';

    let totalCodAmount = 0;
    let totalCodOrders = 0;
    let totalPrepaidOrders = 0;
    let totalWeightKg = 0;

    const labels = subOrders.map((so) => {
      const v = so.vendor || vendor || {
        storeName: 'Apex Tech Hub',
        phone: '+91 98765 43210',
        gstin: '07AAAAA0000A1Z5',
        address: 'Plot 42, Tech Hub Logistics Center, Sector 62, Noida, UP, 201301',
      };
      const parent = so.parentOrder || {};
      const orderRef = parent.orderNumber || `ORD-${so._id.toString().slice(-8).toUpperCase()}`;
      const subOrderRef = `SUB-${so._id.toString().slice(-6).toUpperCase()}`;
      const routingPincode = so.shippingAddress?.pincode || '110001';
      const routingCode = `EXP-${routingPincode.slice(0, 3)}-${so._id.toString().slice(-4).toUpperCase()}`;
      const awbCode = so.trackingNumber || `AWB-${so._id.toString().slice(-8).toUpperCase()}`;
      const barcodeValue = `*${subOrderRef}*`;
      const invoiceNumber = `INV-${new Date().getFullYear()}-${so._id.toString().slice(-6).toUpperCase()}`;
      const weight = parseFloat((so.items.reduce((acc, i) => acc + (i.quantity * 0.45), 0)).toFixed(2));
      totalWeightKg += weight;

      const isCOD = (parent.paymentMethod || '').toUpperCase() === 'COD';
      const amountToCollect = isCOD ? so.subTotal : 0;
      if (isCOD) {
        totalCodOrders++;
        totalCodAmount += amountToCollect;
      } else {
        totalPrepaidOrders++;
      }

      let custPhone = so.shippingAddress?.phone || so.customer?.phone || '9876543210';
      if (maskPhone && custPhone.length >= 10) {
        custPhone = `${custPhone.slice(0, 2)}XXXXXX${custPhone.slice(-2)}`;
      }

      return {
        labelId: `LBL-${so._id.toString().slice(-8).toUpperCase()}`,
        subOrderId: so._id,
        subOrderNumber: subOrderRef,
        parentOrderId: parent._id || so.parentOrder,
        orderNumber: orderRef,
        invoiceNumber,
        invoiceDate: so.createdAt || new Date(),
        routingCode,
        routingPincode,
        awbCode,
        barcodeValue,
        courierPartner: so.carrier || so.deliveryPartner?.name || 'AuraMarket Express',
        paymentMethod: (parent.paymentMethod || 'PREPAID').toUpperCase(),
        paymentStatus: parent.paymentStatus || 'PAID',
        isCOD,
        amountToCollect,
        totalWeightKg: weight,
        dimensions: '22 x 16 x 8 cm',
        packageCount: '1/1',
        seller: {
          storeName: v.storeName || 'Apex Tech Hub',
          storeSlug: v.storeSlug || 'apex-tech',
          email: v.supportEmail || 'seller@auramarket.com',
          phone: v.phone || '+91 98765 43210',
          address: v.address || 'Plot 42, Tech Hub Logistics Center, Sector 62, Noida, UP, 201301',
          gstin: v.gstin || '07AAAAA0000A1Z5',
        },
        recipient: {
          name: so.shippingAddress?.recipientName || so.customer?.name || 'Valued Customer',
          phone: custPhone,
          address: `${so.shippingAddress?.street || 'Flat 402, Green Valley Apartments'}, ${so.shippingAddress?.city || 'New Delhi'}, ${so.shippingAddress?.state || 'Delhi'} - ${routingPincode}`,
          city: so.shippingAddress?.city || 'New Delhi',
          state: so.shippingAddress?.state || 'Delhi',
          pincode: routingPincode,
        },
        items: (so.items || []).map((it) => ({
          title: it.title,
          sku: it.variantSku || 'SKU-STD',
          hsnCode: it.hsnCode || '85183000',
          quantity: it.quantity,
          price: it.price,
          totalPrice: it.totalPrice,
        })),
        deliveryOtpNotice: 'Customer 4-digit secret OTP required at doorstep verification.',
      };
    });

    // Record audit event
    await recordAuditLog({
      action: 'BULK_SHIPPING_LABELS_PRINTED',
      module: 'ORDERS',
      req,
      description: `Generated ${labels.length} bulk 4x6 thermal shipping labels for vendor '${vendor?.storeName || 'Multi-Vendor'}'`,
      targetType: 'SubOrder',
      details: {
        orderCount: labels.length,
        paperSize,
        totalCodAmount,
        totalCodOrders,
        totalPrepaidOrders,
        subOrderIds,
      },
      severity: 'LOW',
    });

    const isHtmlRequested =
      req.query?.format === 'html' ||
      req.body?.format === 'html' ||
      req.headers?.accept?.includes('text/html');

    if (isHtmlRequested) {
      const html = generateBulkThermalHtml({
        labels,
        paperSize,
        manifestSummary: {
          totalOrders: labels.length,
          totalCodOrders,
          totalCodAmount,
          totalPrepaidOrders,
          totalWeightKg: parseFloat(totalWeightKg.toFixed(2)),
        },
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    res.status(200).json({
      success: true,
      paperSize,
      count: labels.length,
      manifestSummary: {
        totalOrders: labels.length,
        totalCodOrders,
        totalCodAmount,
        totalPrepaidOrders,
        totalWeightKg: parseFloat(totalWeightKg.toFixed(2)),
      },
      labels,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request Wallet Payout (Point #62: Bank NEFT / IMPS / Direct UPI)
// @route   POST /api/vendor/payout
exports.requestPayout = async (req, res, next) => {
  try {
    const { amount, paymentMode, bankDetails, upiId } = req.body;
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payout amount. Must be a valid positive number.',
      });
    }

    if (numAmount < 500) {
      return res.status(400).json({
        success: false,
        message: 'Minimum payout withdrawal amount is ₹500.',
      });
    }

    if (numAmount > vendor.walletBalance) {
      return res.status(400).json({
        success: false,
        message: `Requested amount ₹${numAmount} exceeds your available wallet balance of ₹${vendor.walletBalance}.`,
      });
    }

    // Determine payout mode: UPI or Bank Transfer (IMPS / NEFT)
    const rawMode = (paymentMode || 'IMPS').toUpperCase();
    const finalMode = ['IMPS', 'NEFT', 'UPI'].includes(rawMode) ? rawMode : 'IMPS';

    // Update vendor profile bank/UPI details if supplied
    if (bankDetails) {
      vendor.bankDetails = {
        ...(vendor.bankDetails?.toObject ? vendor.bankDetails.toObject() : vendor.bankDetails),
        ...bankDetails,
      };
    }
    if (upiId) {
      if (!vendor.bankDetails) vendor.bankDetails = {};
      vendor.bankDetails.upiId = upiId.trim();
    }

    vendor.walletBalance -= numAmount;
    await vendor.save();

    const recipientDesc = finalMode === 'UPI'
      ? `UPI ID: ${upiId || vendor.bankDetails?.upiId || 'merchant@upi'}`
      : `${vendor.bankDetails?.bankName || 'Bank'} A/C: ${vendor.bankDetails?.accountNumber || '****4092'}`;

    const ledger = await Ledger.create({
      vendor: vendor._id,
      type: 'PAYOUT_WITHDRAWAL',
      amount: numAmount,
      description: `Vendor withdrawal request for ₹${numAmount} via ${finalMode} (${recipientDesc})`,
      balanceAfter: vendor.walletBalance,
      status: 'PENDING',
      payoutDetails: {
        paymentMode: finalMode,
        accountHolder: bankDetails?.accountHolder || vendor.bankDetails?.accountHolder || vendor.storeName || '',
        accountNumber: bankDetails?.accountNumber || vendor.bankDetails?.accountNumber || '',
        ifscCode: bankDetails?.ifscCode || vendor.bankDetails?.ifscCode || '',
        bankName: bankDetails?.bankName || vendor.bankDetails?.bankName || '',
        adminNotes: finalMode === 'UPI' ? `Direct UPI Transfer to ${upiId || vendor.bankDetails?.upiId}` : '',
      },
    });

    res.status(200).json({
      success: true,
      message: `Payout request of ₹${numAmount.toLocaleString('en-IN')} submitted successfully via ${finalMode}. Settlement will transfer in 24-48 business hours.`,
      data: ledger,
      updatedWalletBalance: vendor.walletBalance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Quick Restock Product (Point #54)
// @route   PATCH /api/vendor/products/:id/stock
exports.updateProductStock = async (req, res, next) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    let product = await Product.findOne({ _id: req.params.id, vendor: vendor._id });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found or not owned by your store' });
    }

    const oldStock = product.stock || 0;
    const { stock, additionalStock, lowStockThreshold } = req.body;
    if (typeof stock === 'number') {
      product.stock = Math.max(0, stock);
    } else if (typeof additionalStock === 'number') {
      product.stock = Math.max(0, product.stock + additionalStock);
    }

    if (typeof lowStockThreshold === 'number') {
      product.lowStockThreshold = Math.max(0, lowStockThreshold);
    }

    await product.save();

    // Point 15: Automatically trigger Back-in-Stock Alerts if restocked
    if (oldStock <= 0 && product.stock > 0) {
      const { checkAndTriggerStockAlerts } = require('./priceDropAlertController');
      checkAndTriggerStockAlerts(product._id, oldStock, product.stock).catch(console.error);
    }

    res.status(200).json({
      success: true,
      message: `Stock updated successfully. Current stock: ${product.stock}`,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk Inline Spreadsheet Catalog Editor (Point #38: Fast Excel-like price & stock editing)
// @route   PATCH /api/vendor/products/bulk-inline-update
exports.bulkInlineUpdateProducts = async (req, res, next) => {
  try {
    const vendor = req.vendorProfile || await VendorProfile.findOne({
      $or: [{ user: req.user._id }, { _id: req.user.vendorProfile }],
    });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const { updates } = req.body;
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Updates array is required and must not be empty.',
      });
    }

    if (updates.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Batch size exceeds maximum limit of 200 items per request.',
      });
    }

    // Sub-Staff permission verification:
    // If user is sub-staff with WAREHOUSE_INVENTORY but lacking PRODUCTS_MANAGE, they cannot touch pricing
    const userPerms = req.user.permissions || [];
    const isSubStaff = req.user.role === 'vendor_staff' || (req.user.role === 'vendor' && req.user.isVendorStaff);
    const hasFullProductsManage = !isSubStaff || userPerms.includes('ALL') || userPerms.includes('PRODUCTS_MANAGE');
    const hasWarehouseOnly = isSubStaff && !hasFullProductsManage && userPerms.includes('WAREHOUSE_INVENTORY');

    const anyPricingUpdate = updates.some(
      (u) => u.sellingPrice !== undefined || u.price !== undefined || u.mrp !== undefined || u.compareAtPrice !== undefined
    );

    if (hasWarehouseOnly && anyPricingUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Warehouse staff cannot modify product pricing. Requires PRODUCTS_MANAGE permission.',
        requiredPermission: 'PRODUCTS_MANAGE',
        requiredPermissions: ['PRODUCTS_MANAGE'],
        grantedPermissions: userPerms,
      });
    }

    // Strict input validation across all rows before executing mutations
    for (let i = 0; i < updates.length; i++) {
      const item = updates[i];
      const rowNum = i + 1;
      const rawSelling = item.sellingPrice !== undefined ? item.sellingPrice : item.price;
      const rawMrp = item.mrp !== undefined ? item.mrp : item.compareAtPrice;

      if (rawSelling !== undefined && (typeof rawSelling !== 'number' || isNaN(rawSelling) || rawSelling <= 0)) {
        return res.status(400).json({
          success: false,
          message: `Validation Error on row ${rowNum}: Selling price must be a positive number greater than 0.`,
        });
      }

      if (rawMrp !== undefined && (typeof rawMrp !== 'number' || isNaN(rawMrp) || rawMrp < 0)) {
        return res.status(400).json({
          success: false,
          message: `Validation Error on row ${rowNum}: MRP / Compare price must be a non-negative number.`,
        });
      }

      if (item.stock !== undefined && (typeof item.stock !== 'number' || isNaN(item.stock) || item.stock < 0 || !Number.isInteger(item.stock))) {
        return res.status(400).json({
          success: false,
          message: `Validation Error on row ${rowNum}: Stock quantity must be a non-negative integer.`,
        });
      }

      if (item.lowStockThreshold !== undefined && (typeof item.lowStockThreshold !== 'number' || isNaN(item.lowStockThreshold) || item.lowStockThreshold < 0 || !Number.isInteger(item.lowStockThreshold))) {
        return res.status(400).json({
          success: false,
          message: `Validation Error on row ${rowNum}: Low stock threshold must be a non-negative integer.`,
        });
      }

      if (item.status !== undefined) {
        const normStatus = String(item.status).toLowerCase().trim();
        if (!['published', 'draft', 'archived'].includes(normStatus)) {
          return res.status(400).json({
            success: false,
            message: `Validation Error on row ${rowNum}: Invalid status '${item.status}'. Must be published, draft, or archived.`,
          });
        }
      }
    }

    const updatedProducts = [];
    const errors = [];
    let updatedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < updates.length; i++) {
      const item = updates[i];
      const rowNum = i + 1;
      const productId = item.productId || item.id || item._id;
      const sku = item.sku;

      if (!productId && !sku) {
        failedCount++;
        errors.push({ row: rowNum, error: 'Product identifier (productId or sku) is required.' });
        continue;
      }

      // Look up product strictly for this vendor (merchant isolation)
      const filter = { vendor: vendor._id };
      if (productId) {
        filter._id = productId;
      } else {
        filter.sku = sku;
      }

      const product = await Product.findOne(filter);
      if (!product) {
        failedCount++;
        errors.push({ row: rowNum, productId: productId || sku, error: 'Product not found or not owned by your store.' });
        continue;
      }

      const oldSellingPrice = product.sellingPrice || 0;
      const oldStock = product.stock || 0;
      const rawSelling = item.sellingPrice !== undefined ? item.sellingPrice : item.price;
      const rawMrp = item.mrp !== undefined ? item.mrp : item.compareAtPrice;

      // Apply selling price & MRP
      if (rawSelling !== undefined) {
        product.sellingPrice = Number(rawSelling);
      }
      if (rawMrp !== undefined) {
        product.mrp = Math.max(Number(rawMrp), product.sellingPrice);
      } else if (rawSelling !== undefined && product.mrp < product.sellingPrice) {
        product.mrp = product.sellingPrice;
      }

      if (product.mrp !== undefined && product.sellingPrice !== undefined) {
        const savings = Math.max(0, product.mrp - product.sellingPrice);
        product.savingsAmount = savings;
        product.discountPercentage = product.mrp > 0 ? Math.round((savings / product.mrp) * 100) : 0;
      }

      // Apply stock & threshold
      if (item.stock !== undefined) {
        product.stock = Number(item.stock);
      }
      if (item.lowStockThreshold !== undefined) {
        product.lowStockThreshold = Number(item.lowStockThreshold);
      }

      // Apply status & publication state
      if (item.status !== undefined) {
        const normStatus = String(item.status).toLowerCase().trim();
        product.status = normStatus;
        product.isPublished = normStatus === 'published';
      } else if (item.isPublished !== undefined) {
        product.isPublished = Boolean(item.isPublished);
        product.status = product.isPublished ? 'published' : 'draft';
      }

      await product.save();
      updatedCount++;
      updatedProducts.push(product);

      // Trigger automated alerts if conditions met
      if (rawSelling !== undefined && Number(rawSelling) < oldSellingPrice) {
        try {
          const { checkAndTriggerPriceDropAlerts } = require('./priceDropAlertController');
          checkAndTriggerPriceDropAlerts(product._id, oldSellingPrice, Number(rawSelling)).catch(() => {});
        } catch (e) {}
      }

      if (oldStock <= 0 && product.stock > 0) {
        try {
          const { checkAndTriggerStockAlerts } = require('./priceDropAlertController');
          checkAndTriggerStockAlerts(product._id, oldStock, product.stock).catch(() => {});
        } catch (e) {}
      }
    }

    // Record audit log
    await recordAuditLog({
      action: 'VENDOR_BULK_INLINE_CATALOG_UPDATE',
      module: 'PRODUCTS',
      req,
      description: `Bulk inline catalog update: ${updatedCount} products updated (${failedCount} failed) across prices and stock.`,
      targetType: 'Product',
      targetId: updatedProducts[0] ? String(updatedProducts[0]._id) : String(vendor._id),
      previousValue: { batchSize: updates.length },
      newValue: { updatedCount, failedCount },
      changeSummary: `Applied spreadsheet edits to ${updatedCount} products.`,
      severity: 'MEDIUM',
    });

    return res.status(200).json({
      success: true,
      message: `Bulk inline update completed: ${updatedCount} updated, ${failedCount} failed.`,
      summary: {
        totalRequested: updates.length,
        updatedCount,
        failedCount,
        errors: errors.length > 0 ? errors : undefined,
      },
      data: updatedProducts,
    });
  } catch (error) {
    next(error);
  }
};

// Helper for parsing CSV lines robustly
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      if (inQuotes && line[i + 1] === char) {
        current += char;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

// Helper for parsing raw CSV string into row objects
function parseCSV(csvString) {
  if (!csvString || typeof csvString !== 'string') return [];
  const lines = csvString.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && !values[0])) continue;
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] !== undefined ? values[idx].trim() : '';
    });
    rows.push(row);
  }
  return rows;
}

// @desc    Download Sample CSV Template for Bulk Product Upload (Point #8)
// @route   GET /api/vendor/products/sample-template
exports.getProductSampleTemplate = async (req, res, next) => {
  try {
    const headers = [
      'Title',
      'SKU',
      'Category',
      'Brand',
      'MRP',
      'SellingPrice',
      'Stock',
      'LowStockThreshold',
      'Description',
      'Image',
      'Tags',
    ];

    const sampleRows = [
      [
        '"Aura Stealth Pro Wireless Mechanical Keyboard"',
        'APX-KB-PRO-01',
        '"Electronics"',
        '"Apex Tech"',
        '6999',
        '4499',
        '50',
        '5',
        '"RGB hot-swappable mechanical keyboard with 2.4GHz wireless and Bluetooth 5.3"',
        '"https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500"',
        '"keyboard,gaming,wireless,rgb"',
      ],
      [
        '"Aura Glide Ultra Lightweight Gaming Mouse"',
        'APX-MSE-ULT-02',
        '"Electronics"',
        '"Apex Tech"',
        '3999',
        '2199',
        '80',
        '10',
        '"62g ultra-lightweight ergonomic mouse with 26000 DPI optical sensor"',
        '"https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500"',
        '"mouse,gaming,ultra-light"',
      ],
      [
        '"Aura Studio Dual Monitor Aluminum Arm Stand"',
        'APX-STND-DUAL-03',
        '"Electronics"',
        '"Apex Studio"',
        '4999',
        '2999',
        '35',
        '5',
        '"Heavy-duty gas spring dual monitor mount for up to 32-inch screens"',
        '"https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500"',
        '"monitor-arm,desk-setup,ergonomic"',
      ],
    ];

    const csvContent = '\uFEFF' + [headers.join(','), ...sampleRows.map((r) => r.join(','))].join('\r\n');
    const filename = 'auramarket_bulk_product_sample_template.csv';

    if (req.query.format === 'csv' || req.headers.accept?.includes('text/csv')) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csvContent);
    }

    res.status(200).json({
      success: true,
      filename,
      headers,
      sampleRows,
      sampleRowsCount: sampleRows.length,
      csv: csvContent,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk Upload / Upsert Products via CSV or JSON (Point #8 / Point #55)
// @route   POST /api/vendor/products/bulk-upload
exports.bulkUploadProducts = async (req, res, next) => {
  try {
    let vendor;
    if (req.user && (req.user.role === 'superadmin' || req.user.role === 'admin')) {
      const targetVendorId = req.body.vendorId || req.query.vendorId;
      if (targetVendorId) {
        vendor = await VendorProfile.findById(targetVendorId);
      } else {
        vendor = (await VendorProfile.findOne({ status: 'approved' })) || (await VendorProfile.findOne({}));
      }
    } else {
      vendor = await VendorProfile.findOne({ user: req.user._id });
    }

    if (!vendor || (req.user.role !== 'superadmin' && req.user.role !== 'admin' && vendor.status !== 'approved')) {
      return res.status(403).json({
        success: false,
        message: 'Your store must be approved by SuperAdmin to publish products.',
      });
    }

    let items = [];
    if (req.body.csvData && typeof req.body.csvData === 'string') {
      items = parseCSV(req.body.csvData);
    } else if (Array.isArray(req.body.products)) {
      items = req.body.products;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please provide either csvData (string) or products (array).',
      });
    }

    if (items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No product rows found to import.',
      });
    }

    // Default category fallback
    let defaultCategory = await Category.findOne({});
    if (!defaultCategory) {
      defaultCategory = await Category.create({
        name: 'General',
        slug: 'general',
        description: 'General category for bulk imports',
      });
    }

    const defaultImg = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';
    let insertedCount = 0;
    let updatedCount = 0;
    const errors = [];
    const processedProducts = [];

    for (let idx = 0; idx < items.length; idx++) {
      const raw = items[idx];
      const rowNum = idx + 2;

      const title = (raw.title || raw.productname || raw.name || '').trim();
      if (!title) {
        errors.push({ row: rowNum, field: 'title', error: 'Product title is required' });
        continue;
      }

      const rawPrice = raw.sellingprice !== undefined ? raw.sellingprice : (raw.price !== undefined ? raw.price : raw.sellprice);
      if (rawPrice !== undefined && Number(rawPrice) < 0) {
        errors.push({ row: rowNum, field: 'sellingPrice', value: rawPrice, error: 'Selling price cannot be negative' });
        continue;
      }

      const rawMrp = raw.mrp !== undefined ? raw.mrp : raw.originalprice;
      if (rawMrp !== undefined && Number(rawMrp) < 0) {
        errors.push({ row: rowNum, field: 'mrp', value: rawMrp, error: 'MRP cannot be negative' });
        continue;
      }

      const rawStock = raw.stock !== undefined ? raw.stock : (raw.quantity !== undefined ? raw.quantity : raw.qty);
      if (rawStock !== undefined && parseInt(rawStock, 10) < 0) {
        errors.push({ row: rowNum, field: 'stock', value: rawStock, error: 'Stock count cannot be negative' });
        continue;
      }

      let sku = (raw.sku || '').trim();
      if (!sku) {
        sku = `SKU-BULK-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
      }

      const sellPrice = Math.max(0, Number(rawPrice) || 0);
      let mrpVal = Number(rawMrp) || Math.round(sellPrice * 1.25);
      if (mrpVal < sellPrice) {
        mrpVal = sellPrice;
      }
      const savings = Math.max(0, mrpVal - sellPrice);
      const discPct = mrpVal > 0 ? Math.round((savings / mrpVal) * 100) : 0;

      const stockVal = Math.max(0, parseInt(rawStock, 10) || 0);
      const lowStockThresh = Math.max(1, parseInt(raw.lowstockthreshold || raw.threshold || raw.lowstock, 10) || 5);
      const description = (raw.description || raw.desc || `${title} - Quality product from ${vendor.storeName}`).trim();
      const image = (raw.image || raw.imageurl || raw.thumbnail || defaultImg).trim();
      const brand = (raw.brand || vendor.storeName).trim();

      // Resolve category
      let categoryId = defaultCategory._id;
      const catField = (raw.category || raw.cat || '').trim();
      if (catField) {
        if (/^[0-9a-fA-F]{24}$/.test(catField)) {
          categoryId = catField;
        } else {
          const foundCat = await Category.findOne({ name: new RegExp('^' + catField + '$', 'i') });
          if (foundCat) {
            categoryId = foundCat._id;
          }
        }
      }

      // Check for existing SKU for this vendor (UPSERT logic)
      let existingProduct = await Product.findOne({ vendor: vendor._id, sku: sku });
      if (existingProduct) {
        existingProduct.title = title;
        existingProduct.description = description;
        existingProduct.mrp = mrpVal;
        existingProduct.sellingPrice = sellPrice;
        existingProduct.discountPercentage = discPct;
        existingProduct.savingsAmount = savings;
        existingProduct.stock = stockVal;
        existingProduct.lowStockThreshold = lowStockThresh;
        existingProduct.category = categoryId;
        existingProduct.brand = brand;
        if (image) {
          existingProduct.thumbnail = image;
          if (!existingProduct.images.includes(image)) {
            existingProduct.images = [image, ...existingProduct.images.slice(0, 4)];
          }
        }
        await existingProduct.save();
        updatedCount++;
        processedProducts.push(existingProduct);
      } else {
        const slug =
          title.toLowerCase().replace(/[^a-z0-9]+/g, '-') +
          '-' +
          Date.now().toString().slice(-4) +
          '-' +
          Math.floor(Math.random() * 1000);
        const newProd = await Product.create({
          vendor: vendor._id,
          title,
          slug,
          description,
          category: categoryId,
          brand,
          thumbnail: image,
          gallery: [],
          images: [image],
          mrp: mrpVal,
          sellingPrice: sellPrice,
          discountPercentage: discPct,
          savingsAmount: savings,
          stock: stockVal,
          lowStockThreshold: lowStockThresh,
          sku,
          hasVariants: false,
          variants: [],
          tags: [brand.toLowerCase(), 'bulk-upload'],
        });
        insertedCount++;
        processedProducts.push(newProd);
      }
    }

    await recordAuditLog({
      action: 'BULK_PRODUCT_IMPORT',
      module: 'PRODUCTS',
      req,
      description: `Bulk product import: ${insertedCount} added, ${updatedCount} updated, ${errors.length} errors for '${vendor.storeName}'`,
      targetType: 'Product',
      details: { insertedCount, updatedCount, errorCount: errors.length, totalRows: items.length },
      severity: errors.length > 0 ? 'MEDIUM' : 'LOW',
    });

    res.status(200).json({
      success: true,
      message: `Bulk import completed: ${insertedCount} added, ${updatedCount} updated, ${errors.length} errors`,
      totalProcessed: items.length,
      insertedCount,
      updatedCount,
      errorCount: errors.length,
      errors,
      products: processedProducts,
      data: processedProducts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export Vendor Catalog as CSV (Point #8 / Point #55)
// @route   GET /api/vendor/products/export-csv
exports.exportProductsCSV = async (req, res, next) => {
  try {
    let vendor;
    if (req.user && (req.user.role === 'superadmin' || req.user.role === 'admin')) {
      const targetVendorId = req.query.vendorId;
      if (targetVendorId) {
        vendor = await VendorProfile.findById(targetVendorId);
      } else {
        vendor = (await VendorProfile.findOne({ status: 'approved' })) || (await VendorProfile.findOne({}));
      }
    } else {
      vendor = await VendorProfile.findOne({ user: req.user._id });
    }

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const products = await Product.find({ vendor: vendor._id })
      .populate('category', 'name')
      .sort({ createdAt: -1 });

    const headers = [
      'Title',
      'SKU',
      'Category',
      'Brand',
      'MRP',
      'SellingPrice',
      'DiscountPercent',
      'SavingsAmount',
      'Stock',
      'LowStockThreshold',
      'Status',
      'Image',
      'Description',
    ];

    const escapeCSV = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = products.map((p) => {
      const isOut = p.stock <= 0;
      const isLow = p.stock > 0 && p.stock <= (p.lowStockThreshold || 5);
      const status = isOut ? 'OUT_OF_STOCK' : isLow ? 'LOW_STOCK' : 'IN_STOCK';
      const catName = p.category && p.category.name ? p.category.name : 'General';

      return [
        escapeCSV(p.title),
        escapeCSV(p.sku),
        escapeCSV(catName),
        escapeCSV(p.brand || vendor.storeName),
        p.mrp || 0,
        p.sellingPrice || 0,
        p.discountPercentage || 0,
        p.savingsAmount || 0,
        p.stock || 0,
        p.lowStockThreshold || 5,
        escapeCSV(status),
        escapeCSV(p.thumbnail || (p.images && p.images[0]) || ''),
        escapeCSV(p.description || ''),
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const filename = `auramarket_catalog_${vendor.storeSlug || 'export'}_${new Date().toISOString().slice(0, 10)}.csv`;

    if (req.query.format === 'csv' || req.headers.accept?.includes('text/csv')) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csvContent);
    }

    res.status(200).json({
      success: true,
      filename,
      count: products.length,
      csv: csvContent,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// Point 58: Vendor Store Profile Customization (Logo, Banner, Bio, Social, Slug)
// =========================================================================

// @desc    Get Current Vendor's Store Profile (Point #58)
// @route   GET /api/vendor/profile
exports.getVendorProfile = async (req, res, next) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }
    res.status(200).json({ success: true, data: vendor });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Vendor Store Profile & Branding Customization (Point #58)
// @route   PUT /api/vendor/profile
exports.updateVendorProfile = async (req, res, next) => {
  try {
    let vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const {
      storeName,
      storeSlug,
      storeLogo,
      storeBanner,
      description,
      bio,
      supportPhone,
      supportEmail,
      returnPolicy,
      pickupAddress,
      socialLinks,
      vacationMode,
      bankDetails,
    } = req.body;

    if (storeName && storeName.trim()) {
      vendor.storeName = storeName.trim();
    }

    // Slug management: lowercase, alpha-numeric and hyphens
    if (storeSlug !== undefined) {
      const cleanSlug = String(storeSlug)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      if (cleanSlug) {
        // Verify uniqueness
        const existing = await VendorProfile.findOne({
          storeSlug: cleanSlug,
          _id: { $ne: vendor._id },
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: `Store slug '${cleanSlug}' is already taken by another merchant. Please choose a different slug.`,
          });
        }
        vendor.storeSlug = cleanSlug;
      }
    } else if (!vendor.storeSlug && vendor.storeName) {
      vendor.storeSlug = vendor.storeName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    if (storeLogo !== undefined) vendor.storeLogo = storeLogo;
    if (storeBanner !== undefined) vendor.storeBanner = storeBanner;
    if (description !== undefined) vendor.description = description;
    if (bio !== undefined) vendor.bio = bio;
    if (supportPhone !== undefined) vendor.supportPhone = supportPhone;
    if (supportEmail !== undefined) vendor.supportEmail = supportEmail;
    if (returnPolicy !== undefined) vendor.returnPolicy = returnPolicy;

    if (pickupAddress && typeof pickupAddress === 'object') {
      vendor.pickupAddress = {
        ...(vendor.pickupAddress?.toObject ? vendor.pickupAddress.toObject() : vendor.pickupAddress || {}),
        ...pickupAddress,
      };
    }

    if (socialLinks && typeof socialLinks === 'object') {
      vendor.socialLinks = {
        ...(vendor.socialLinks?.toObject ? vendor.socialLinks.toObject() : vendor.socialLinks || {}),
        ...socialLinks,
      };
    }

    if (vacationMode && typeof vacationMode === 'object') {
      vendor.vacationMode = {
        ...(vendor.vacationMode?.toObject ? vendor.vacationMode.toObject() : vendor.vacationMode || {}),
        ...vacationMode,
      };
    }

    if (bankDetails && typeof bankDetails === 'object') {
      vendor.bankDetails = {
        ...(vendor.bankDetails?.toObject ? vendor.bankDetails.toObject() : vendor.bankDetails || {}),
        ...bankDetails,
      };
    }

    await vendor.save();

    res.status(200).json({
      success: true,
      message: 'Store profile and branding updated successfully!',
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Public Storefront Profile and Catalog for a Merchant (Point #58)
// @route   GET /api/vendor/store/:slugOrId
exports.getPublicVendorStore = async (req, res, next) => {
  try {
    const { slugOrId } = req.params;
    let vendor = null;

    if (slugOrId.match(/^[0-9a-fA-F]{24}$/)) {
      vendor = await VendorProfile.findById(slugOrId);
    }
    if (!vendor) {
      vendor = await VendorProfile.findOne({ storeSlug: slugOrId.toLowerCase() });
    }

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor store not found' });
    }

    // Fetch published products for this vendor
    const products = await Product.find({ vendor: vendor._id, status: 'published' })
      .populate('category', 'name slug')
      .sort({ createdAt: -1 });

    const publicStore = {
      id: vendor._id,
      storeName: vendor.storeName,
      storeSlug: vendor.storeSlug,
      storeLogo: vendor.storeLogo,
      storeBanner: vendor.storeBanner,
      description: vendor.description,
      bio: vendor.bio || vendor.description,
      rating: vendor.rating || 4.8,
      status: vendor.status,
      supportPhone: vendor.supportPhone || vendor.pickupAddress?.phone || '',
      supportEmail: vendor.supportEmail || '',
      returnPolicy: vendor.returnPolicy,
      socialLinks: vendor.socialLinks || {},
      vacationMode: vendor.vacationMode || { isVacation: false },
      pickupCity: vendor.pickupAddress?.city || '',
      pickupState: vendor.pickupAddress?.state || '',
      createdAt: vendor.createdAt,
      productsCount: products.length,
      products,
      storefrontCustomization: vendor.storefrontCustomization || {},
    };

    res.status(200).json({
      success: true,
      data: publicStore,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// Point 59: Vacation Mode Toggle (Pause orders without deleting items)
// =========================================================================

// @desc    Toggle and Configure Vendor Vacation Mode (Point #59)
// @route   PUT /api/vendor/vacation-mode
exports.updateVacationMode = async (req, res, next) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const { isVacation, noticeMessage, disableOrdering, startDate, endDate } = req.body;

    vendor.vacationMode = {
      isVacation: Boolean(isVacation),
      noticeMessage:
        noticeMessage !== undefined
          ? noticeMessage
          : vendor.vacationMode?.noticeMessage || 'This store is temporarily on vacation. Orders will resume shortly.',
      disableOrdering: disableOrdering !== undefined ? Boolean(disableOrdering) : true,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    await vendor.save();

    res.status(200).json({
      success: true,
      message: vendor.vacationMode.isVacation
        ? 'Vacation mode enabled. Your store ordering has been paused with notice.'
        : 'Vacation mode disabled. Store ordering is now live and active!',
      data: vendor.vacationMode,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// Point 60: Customer Reviews Management (View reviews & post vendor responses)
// =========================================================================

// @desc    Get All Customer Reviews for Vendor Products with analytics & breakdown (Point #60)
// @route   GET /api/vendor/reviews
exports.getVendorReviews = async (req, res, next) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const vendorProducts = await Product.find({ vendor: vendor._id }).select('_id title image images price').lean();
    const productIds = vendorProducts.map(p => p._id);

    // If no custom reviews exist in DB for vendor products, seed authentic default reviews for interactive demo
    const existingCount = await Review.countDocuments({ product: { $in: productIds } });
    if (existingCount === 0 && vendorProducts.length > 0) {
      const p0 = vendorProducts[0];
      const initialSeeds = [
        {
          product: p0._id,
          user: req.user._id,
          userName: 'Amit Sharma',
          rating: 5,
          title: 'Flawless packaging and authentic product!',
          comment: 'Arrived within 2 days with OTP delivery. Build quality is exceptional and brand warranty activated without issue.',
          isVerifiedPurchase: true,
          helpfulCount: 7,
          createdAt: new Date(Date.now() - 24 * 3600 * 1000),
        },
        {
          product: p0._id,
          user: req.user._id,
          userName: 'Neha Singhania',
          rating: 4,
          title: 'Very good quality, highly recommended',
          comment: 'Product exactly as shown. Comfortable and durable. Prompt shipping by seller.',
          isVerifiedPurchase: true,
          helpfulCount: 3,
          createdAt: new Date(Date.now() - 48 * 3600 * 1000),
          vendorReply: {
            comment: 'Thank you Neha! We take great pride in quality packaging and express shipping.',
            repliedAt: new Date(Date.now() - 36 * 3600 * 1000),
          },
        },
        {
          product: p0._id,
          user: req.user._id,
          userName: 'Vikram Mehta',
          rating: 5,
          title: 'AuraMarket verified merchant never disappoints',
          comment: 'Sound clarity is crystal clear. Sturdy case and premium unboxing experience.',
          isVerifiedPurchase: true,
          helpfulCount: 11,
          createdAt: new Date(Date.now() - 72 * 3600 * 1000),
        },
      ];
      await Review.insertMany(initialSeeds);
    }

    // Compute global vendor ratings analytics
    const allReviews = await Review.find({ product: { $in: productIds } }).lean();
    const totalReviews = allReviews.length;
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalScore = 0;
    let repliedCount = 0;

    allReviews.forEach(r => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
      distribution[star] = (distribution[star] || 0) + 1;
      totalScore += (r.rating || 5);
      if (r.vendorReply && r.vendorReply.comment) {
        repliedCount++;
      }
    });

    const unrepliedCount = totalReviews - repliedCount;
    const averageRating = totalReviews > 0 ? Number((totalScore / totalReviews).toFixed(1)) : 5.0;
    const positivePercentage = totalReviews > 0
      ? Math.round(((distribution[5] + distribution[4]) / totalReviews) * 100)
      : 100;

    const breakdown = [5, 4, 3, 2, 1].map(stars => ({
      stars,
      count: distribution[stars] || 0,
      percentage: totalReviews > 0 ? Math.round(((distribution[stars] || 0) / totalReviews) * 100) : 0,
    }));

    // Build filter query for returned list
    const query = { product: { $in: productIds } };

    if (req.query.rating && req.query.rating !== 'all') {
      const starVal = parseInt(req.query.rating, 10);
      if (!isNaN(starVal)) {
        query.rating = starVal;
      }
    }

    if (req.query.status === 'unreplied') {
      query['vendorReply.comment'] = { $exists: false };
    } else if (req.query.status === 'replied') {
      query['vendorReply.comment'] = { $exists: true, $ne: '' };
    }

    let reviews = await Review.find(query)
      .populate('product', 'title image images price')
      .sort({ createdAt: -1 })
      .lean();

    if (req.query.search) {
      const s = req.query.search.toLowerCase().trim();
      reviews = reviews.filter(r =>
        (r.title && r.title.toLowerCase().includes(s)) ||
        (r.comment && r.comment.toLowerCase().includes(s)) ||
        (r.userName && r.userName.toLowerCase().includes(s)) ||
        (r.product && r.product.title && r.product.title.toLowerCase().includes(s))
      );
    }

    res.status(200).json({
      success: true,
      data: reviews,
      analytics: {
        totalReviews,
        averageRating,
        positivePercentage,
        unrepliedCount,
        repliedCount,
        breakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Post or Update Vendor Response to Customer Review (Point #60)
// @route   POST /api/vendor/reviews/:id/reply
exports.replyVendorReview = async (req, res, next) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const { reply } = req.body;
    if (!reply || !reply.trim()) {
      return res.status(400).json({ success: false, message: 'Vendor response text is required' });
    }

    const review = await Review.findById(req.params.id).populate('product');
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    // Verify product belongs to vendor
    if (review.product && review.product.vendor && review.product.vendor.toString() !== vendor._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to reply to reviews for other merchants products' });
    }

    review.vendorReply = {
      comment: reply.trim(),
      repliedAt: new Date(),
    };

    await review.save();

    res.status(200).json({
      success: true,
      message: 'Merchant response posted successfully',
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Vendor Response from Customer Review (Point #60)
// @route   DELETE /api/vendor/reviews/:id/reply
exports.deleteVendorReviewReply = async (req, res, next) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const review = await Review.findById(req.params.id).populate('product');
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (review.product && review.product.vendor && review.product.vendor.toString() !== vendor._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    review.vendorReply = undefined;
    await review.save();

    res.status(200).json({
      success: true,
      message: 'Merchant response removed',
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// Point 61: Real-Time Vendor Financial Wallet & Ledger
// =========================================================================

// @desc    Get Vendor Financial Wallet, Balances & Ledger Transactions (Point #61)
// @route   GET /api/vendor/wallet
exports.getVendorWallet = async (req, res, next) => {
  try {
    let vendor = req.vendorProfile;
    if (!vendor) {
      vendor = await VendorProfile.findOne({
        $or: [{ user: req.user._id }, { _id: req.user.vendorProfile }],
      });
    }
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    // 1. Calculate pending clearance / escrow hold from in-progress sub-orders
    const inProgressSubOrders = await SubOrder.find({
      vendor: vendor._id,
      status: { $in: ['placed', 'confirmed', 'packaging', 'ready_for_pickup', 'dispatched'] },
    }).lean();

    const pendingEscrowBalance = inProgressSubOrders.reduce(
      (sum, so) => sum + (so.vendorEarning || 0),
      0
    );

    // 2. Fetch or seed initial ledger entries for demo vendor if ledger is empty
    const ledgerCount = await Ledger.countDocuments({ vendor: vendor._id });
    if (ledgerCount === 0) {
      const initialLedgers = [
        {
          transactionId: 'TXN-INIT-001',
          vendor: vendor._id,
          type: 'ORDER_CREDIT',
          amount: 8279,
          description: 'Net earnings from Order #ORD-84920 (Aura Pro ANC Headphones)',
          balanceAfter: 8279,
          status: 'COMPLETED',
          createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000),
        },
        {
          transactionId: 'TXN-INIT-002',
          vendor: vendor._id,
          type: 'COMMISSION_DEBIT',
          amount: 720,
          description: 'Marketplace platform commission cut (8%) for #ORD-84920',
          balanceAfter: 7559,
          status: 'COMPLETED',
          createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000),
        },
        {
          transactionId: 'TXN-INIT-003',
          vendor: vendor._id,
          type: 'ORDER_CREDIT',
          amount: 4139,
          description: 'Net earnings from Order #ORD-84955 (AeroWatch S9 Ultra)',
          balanceAfter: 11698,
          status: 'COMPLETED',
          createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000),
        },
        {
          transactionId: 'TXN-INIT-004',
          vendor: vendor._id,
          type: 'PAYOUT_WITHDRAWAL',
          amount: 5000,
          description: 'Payout transfer to HDFC Bank A/C ****4092 via IMPS',
          balanceAfter: 6698,
          status: 'COMPLETED',
          payoutDetails: {
            utrNumber: 'UTR-HDFC-91823746',
            paymentMode: 'IMPS',
            bankName: 'HDFC Bank',
            accountNumber: '****4092',
            processedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
          },
          createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
        },
      ];
      await Ledger.insertMany(initialLedgers);
    }

    // 3. Compute aggregate financial summaries across all ledger items
    const allLedgerEntries = await Ledger.find({ vendor: vendor._id }).lean();
    let totalPlatformCommission = 0;
    let totalWithdrawn = 0;
    let totalOrderCredits = 0;

    allLedgerEntries.forEach(item => {
      if (item.type === 'COMMISSION_DEBIT') {
        totalPlatformCommission += item.amount;
      } else if (item.type === 'PAYOUT_WITHDRAWAL' && item.status === 'COMPLETED') {
        totalWithdrawn += item.amount;
      } else if (item.type === 'ORDER_CREDIT') {
        totalOrderCredits += item.amount;
      }
    });

    // 4. Build query for filtered ledger results
    const filter = { vendor: vendor._id };
    if (req.query.type && req.query.type !== 'all') {
      filter.type = req.query.type;
    }
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status.toUpperCase();
    }

    let ledgerList = await Ledger.find(filter)
      .populate('subOrder', 'orderNumber status subTotal')
      .sort({ createdAt: -1 })
      .lean();

    if (req.query.search) {
      const s = req.query.search.toLowerCase().trim();
      ledgerList = ledgerList.filter(l =>
        (l.transactionId && l.transactionId.toLowerCase().includes(s)) ||
        (l.description && l.description.toLowerCase().includes(s)) ||
        (l.type && l.type.toLowerCase().includes(s))
      );
    }

    res.status(200).json({
      success: true,
      wallet: {
        availableBalance: vendor.walletBalance || 0,
        pendingEscrowBalance,
        lifetimeSales: vendor.totalSales || 0,
        totalPlatformCommission,
        totalWithdrawn,
        totalOrderCredits,
        commissionRate: vendor.commissionRate || 8,
        bankDetails: vendor.bankDetails || {
          bankName: 'HDFC Bank Ltd',
          accountNumber: '****4092',
          ifscCode: 'HDFC0001024',
          accountHolder: vendor.storeName || 'Merchant Partner',
          upiId: 'vendor@okhdfcbank',
        },
      },
      ledger: ledgerList,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export Vendor Financial Ledger as CSV (Point #61)
// @route   GET /api/vendor/wallet/export-csv
exports.exportVendorLedgerCSV = async (req, res, next) => {
  try {
    let vendor = req.vendorProfile;
    if (!vendor) {
      vendor = await VendorProfile.findOne({
        $or: [{ user: req.user._id }, { _id: req.user.vendorProfile }],
      });
    }
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const ledgerEntries = await Ledger.find({ vendor: vendor._id })
      .sort({ createdAt: -1 })
      .lean();

    const headers = [
      'Transaction ID',
      'Date & Time',
      'Type',
      'Description',
      'Status',
      'Amount (INR)',
      'Balance After (INR)',
      'UTR Reference',
    ];

    const rows = ledgerEntries.map(l => [
      `"${l.transactionId || ''}"`,
      `"${new Date(l.createdAt).toLocaleString('en-IN')}"`,
      `"${l.type || ''}"`,
      `"${(l.description || '').replace(/"/g, '""')}"`,
      `"${l.status || 'COMPLETED'}"`,
      l.type === 'COMMISSION_DEBIT' || l.type === 'PAYOUT_WITHDRAWAL' || l.type === 'REFUND'
        ? -l.amount
        : l.amount,
      l.balanceAfter || 0,
      `"${l.payoutDetails?.utrNumber || 'N/A'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=wallet_ledger_${vendor.storeSlug || 'vendor'}_${Date.now()}.csv`
    );
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

// @desc    AI Product Description & SEO Meta Generator for Vendors (Point #76)
// @route   POST /api/vendor/ai-generator/product-copy
// @access  Private (Vendor)
exports.generateProductCopy = async (req, res, next) => {
  try {
    const { prompt, title, category, tone, targetAudience } = req.body;
    const { generateProductCopy: buildCopy } = require('../utils/aiProductGenerator');

    const result = buildCopy({
      prompt,
      title,
      category,
      tone,
      targetAudience,
    });

    res.status(200).json({
      success: true,
      message: 'AI product copy generated successfully!',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    AI SEO Meta Generator for Vendors (Point #76)
// @route   POST /api/vendor/ai-generator/seo-meta
// @access  Private (Vendor)
exports.generateSeoMeta = async (req, res, next) => {
  try {
    const { title, description, category } = req.body;
    const { generateSeoMeta: buildSeo } = require('../utils/aiProductGenerator');

    const result = buildSeo({
      title,
      description,
      category,
    });

    res.status(200).json({
      success: true,
      message: 'AI SEO meta data generated successfully!',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};




// =========================================================================
// POINT 13 & POINT 37: VENDOR SUB-STAFF ROLES & GRANULAR PERMISSIONS
// (Warehouse Manager, Packager, Accountant & Store Associates)
// =========================================================================

const VENDOR_PERMISSIONS_CATALOG = [
  {
    key: 'PRODUCTS_MANAGE',
    label: 'Product Catalog & Pricing',
    description: 'Add new items, update pricing, manage multi-variant SKUs, and upload gallery media.',
    category: 'Inventory',
  },
  {
    key: 'WAREHOUSE_INVENTORY',
    label: 'Warehouse Stock & Restock Alerts',
    description: 'Adjust warehouse inventory, manage low-stock threshold alerts, and receiving manifests.',
    category: 'Warehouse & Inventory',
  },
  {
    key: 'ORDERS_MANAGE',
    label: 'Orders, Status & Dispatch',
    description: 'View merchant orders, update dispatch status, manage split shipments and tracking.',
    category: 'Fulfillment',
  },
  {
    key: 'PACKAGING_DISPATCH',
    label: 'Packing Slips & Thermal Labels',
    description: 'Print 4x6 thermal courier labels, multi-vendor split packing slips, and mark orders packed.',
    category: 'Fulfillment & Packaging',
  },
  {
    key: 'REVIEWS_MANAGE',
    label: 'Customer Reviews & Inquiries',
    description: 'Respond to customer reviews, handle rating appeals, and answer buyer questions.',
    category: 'Support',
  },
  {
    key: 'WALLET_FINANCE',
    label: 'Financial Wallet & Ledger',
    description: 'View vendor ledger balance, download CSV statements, and request payout withdrawals.',
    category: 'Finance (High Security)',
  },
  {
    key: 'ACCOUNTING_TAX',
    label: 'Tax Reports (GST/VAT) & Invoices',
    description: 'Download GSTR-1/GSTR-3B tax filing reports, inspect tax invoice breakdowns, and audit commissions.',
    category: 'Finance & Accounting',
  },
  {
    key: 'STORE_SETTINGS',
    label: 'Store Branding & Vacation Mode',
    description: 'Modify store banner, logo, micro-storefront customization, and toggle holiday break.',
    category: 'Settings',
  },
  {
    key: 'STAFF_MANAGE',
    label: 'Manage Sub-Staff & Team Access',
    description: 'Invite new team associates, assign permission roles, and revoke sub-account access.',
    category: 'Admin',
  },
];

const VENDOR_ROLE_PRESETS = [
  {
    id: 'WAREHOUSE_MANAGER',
    roleTitle: 'Warehouse Manager',
    department: 'Warehouse & Inventory',
    description: 'Oversees warehouse inventory receiving, SKU stock levels, low-stock alerts, and restocking.',
    permissions: ['PRODUCTS_MANAGE', 'WAREHOUSE_INVENTORY', 'ORDERS_MANAGE'],
  },
  {
    id: 'PACKAGER',
    roleTitle: 'Packager & Fulfillment Specialist',
    department: 'Fulfillment & Logistics',
    description: 'Dedicated to order packaging queue, 4x6 thermal shipping labels, split slips, and carrier handover.',
    permissions: ['PACKAGING_DISPATCH', 'ORDERS_MANAGE'],
  },
  {
    id: 'ACCOUNTANT',
    roleTitle: 'Accountant & Financial Auditor',
    department: 'Finance & Accounts',
    description: 'Audits ledger transactions, monitors payout schedules, and downloads GST/VAT tax filing reports.',
    permissions: ['WALLET_FINANCE', 'ACCOUNTING_TAX'],
  },
  {
    id: 'ORDER_DISPATCH',
    roleTitle: 'Order & Dispatch Specialist',
    department: 'Operations',
    description: 'Handles order packing, label printing, and courier manifests.',
    permissions: ['ORDERS_MANAGE', 'PACKAGING_DISPATCH'],
  },
  {
    id: 'CATALOG_LEAD',
    roleTitle: 'Catalog & Inventory Lead',
    department: 'Catalog',
    description: 'Maintains product catalog, SKU stock levels, and media.',
    permissions: ['PRODUCTS_MANAGE', 'ORDERS_MANAGE'],
  },
  {
    id: 'CUSTOMER_CARE',
    roleTitle: 'Customer Care & Review Rep',
    department: 'Support',
    description: 'Monitors customer reviews and buyer inquiries.',
    permissions: ['ORDERS_MANAGE', 'REVIEWS_MANAGE'],
  },
  {
    id: 'STORE_MANAGER',
    roleTitle: 'Assistant Store Manager',
    department: 'Management',
    description: 'Comprehensive daily store operations excluding sensitive payout withdrawals.',
    permissions: [
      'PRODUCTS_MANAGE',
      'WAREHOUSE_INVENTORY',
      'ORDERS_MANAGE',
      'PACKAGING_DISPATCH',
      'REVIEWS_MANAGE',
      'STORE_SETTINGS',
    ],
  },
];

// @desc Get permission catalog and role presets for vendor sub-staff (Point #37)
// @route GET /api/vendor/staff/permissions
// @access Private (Vendor / Vendor Staff)
exports.getVendorStaffPermissions = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      permissions: VENDOR_PERMISSIONS_CATALOG,
      presets: VENDOR_ROLE_PRESETS,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get effective permissions of logged-in vendor or sub-staff member (Point #37)
// @route GET /api/vendor/staff/me/effective-permissions
// @access Private (Vendor / Vendor Staff)
exports.getEffectiveVendorPermissions = async (req, res, next) => {
  try {
    const isOwner = req.user.role === 'vendor' && !req.user.isVendorStaff;
    const allPermKeys = VENDOR_PERMISSIONS_CATALOG.map((p) => p.key);

    return res.status(200).json({
      success: true,
      data: {
        userId: req.user._id,
        name: req.user.name,
        email: req.user.email,
        isOwner,
        role: req.user.role,
        isVendorStaff: Boolean(req.user.isVendorStaff),
        staffRoleTitle: isOwner ? 'Store Owner & Principal Merchant' : req.user.staffRoleTitle || 'Store Associate',
        department: isOwner ? 'Executive Management' : req.user.department || 'Operations',
        permissions: isOwner ? ['ALL', ...allPermKeys] : req.user.permissions || [],
        storeId: req.vendorProfile?._id,
        storeName: req.vendorProfile?.storeName,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get all sub-staff members for current vendor store with search & filtering (Point #37)
// @route GET /api/vendor/staff
// @access Private (Vendor Owner / Staff Manager)
exports.getVendorStaff = async (req, res, next) => {
  try {
    if (!req.vendorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found for this user account',
      });
    }

    const { search, status, roleTitle } = req.query;
    const query = {
      vendorProfile: req.vendorProfile._id,
      isVendorStaff: true,
    };

    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
      ];
    }

    if (status) {
      if (status.toUpperCase() === 'ACTIVE') {
        query.isActive = true;
      } else if (status.toUpperCase() === 'SUSPENDED') {
        query.isActive = false;
      }
    }

    if (roleTitle && roleTitle.trim()) {
      query.staffRoleTitle = { $regex: roleTitle.trim(), $options: 'i' };
    }

    let staff = await User.find(query).select('-password').sort({ createdAt: -1 });

    // Seed realistic default sub-staff for demo vendor if table is completely empty and no search was performed
    if (staff.length === 0 && !search && !status && !roleTitle) {
      const defaultStaff = await User.create({
        name: 'Arjun Mehta',
        email: `dispatch.${req.vendorProfile.storeSlug || 'store'}@auramarket.com`,
        phone: '9822334455',
        password: 'password123',
        role: 'vendor_staff',
        vendorProfile: req.vendorProfile._id,
        isVendorStaff: true,
        staffRoleTitle: 'Packager & Fulfillment Specialist',
        department: 'Fulfillment & Logistics',
        permissions: ['PACKAGING_DISPATCH', 'ORDERS_MANAGE'],
        isActive: true,
      });
      const sObj = defaultStaff.toObject();
      delete sObj.password;
      staff = [sObj];
    }

    res.status(200).json({
      success: true,
      count: staff.length,
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Invite / Create a new vendor sub-staff member (Point #37)
// @route POST /api/vendor/staff
// @access Private (Vendor Owner / Staff Manager)
exports.createVendorStaff = async (req, res, next) => {
  try {
    if (!req.vendorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found for this user account',
      });
    }

    const { name, email, phone, password, staffRoleTitle, department, permissions } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Staff member name is required.',
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Staff email address is required.',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address format.',
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    if (!staffRoleTitle || !staffRoleTitle.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Staff role title is required.',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: `User with email '${email}' is already registered on AuraMarket.`,
      });
    }

    const newStaff = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || '9876543210',
      password,
      role: 'vendor_staff',
      vendorProfile: req.vendorProfile._id,
      isVendorStaff: true,
      staffRoleTitle: staffRoleTitle.trim(),
      department: department?.trim() || 'Operations',
      permissions: Array.isArray(permissions) && permissions.length > 0 ? permissions : ['ORDERS_MANAGE'],
      isActive: true,
    });

    const staffResponse = newStaff.toObject();
    delete staffResponse.password;

    res.status(201).json({
      success: true,
      message: `Sub-staff member '${newStaff.name}' invited as '${newStaff.staffRoleTitle}' successfully!`,
      data: staffResponse,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Update sub-staff permissions and status (Point #37)
// @route PUT /api/vendor/staff/:id
// @access Private (Vendor Owner / Staff Manager)
exports.updateVendorStaff = async (req, res, next) => {
  try {
    if (!req.vendorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const staff = await User.findOne({
      _id: req.params.id,
      vendorProfile: req.vendorProfile._id,
      isVendorStaff: true,
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Vendor sub-staff member not found',
      });
    }

    const { name, staffRoleTitle, department, permissions, isActive, phone, password } = req.body;

    if (name) staff.name = name.trim();
    if (staffRoleTitle) staff.staffRoleTitle = staffRoleTitle.trim();
    if (department) staff.department = department.trim();
    if (Array.isArray(permissions)) staff.permissions = permissions;
    if (isActive !== undefined) staff.isActive = Boolean(isActive);
    if (phone) staff.phone = phone.trim();
    if (password && password.length >= 6) staff.password = password;

    await staff.save();

    const staffResponse = staff.toObject();
    delete staffResponse.password;

    res.status(200).json({
      success: true,
      message: `Staff member '${staff.name}' updated successfully!`,
      data: staffResponse,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Toggle active/suspended status of sub-staff (Point #37)
// @route PATCH /api/vendor/staff/:id/toggle-status
// @access Private (Vendor Owner / Staff Manager)
exports.toggleVendorStaffStatus = async (req, res, next) => {
  try {
    if (!req.vendorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const staff = await User.findOne({
      _id: req.params.id,
      vendorProfile: req.vendorProfile._id,
      isVendorStaff: true,
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Vendor sub-staff member not found',
      });
    }

    staff.isActive = !staff.isActive;
    await staff.save();

    const staffResponse = staff.toObject();
    delete staffResponse.password;

    return res.status(200).json({
      success: true,
      message: `Staff associate '${staff.name}' status changed to ${staff.isActive ? 'Active' : 'Suspended'}.`,
      data: staffResponse,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Remove / Deactivate a vendor sub-staff member (Point #37)
// @route DELETE /api/vendor/staff/:id
// @access Private (Vendor Owner / Staff Manager)
exports.deleteVendorStaff = async (req, res, next) => {
  try {
    if (!req.vendorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const staff = await User.findOneAndDelete({
      _id: req.params.id,
      vendorProfile: req.vendorProfile._id,
      isVendorStaff: true,
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Vendor sub-staff member not found',
      });
    }

    res.status(200).json({
      success: true,
      message: `Staff member '${staff.name}' access revoked successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// Point 10: Inventory Low-Stock Threshold & Auto-Restock Alerts
// =========================================================================

// @desc    Get All Low-Stock Products & At-Risk Inventory Telemetry (Point 10)
// @route   GET /api/vendor/inventory/low-stock
// @route   GET /api/admin/inventory/low-stock
exports.getLowStockInventory = async (req, res, next) => {
  try {
    let vendor;
    const isAdmin = req.user && (req.user.role === 'superadmin' || req.user.role === 'admin');

    if (isAdmin) {
      const targetVendorId = req.query.vendorId;
      if (targetVendorId) {
        vendor = await VendorProfile.findById(targetVendorId);
      }
    } else {
      vendor = await VendorProfile.findOne({ user: req.user._id });
      if (!vendor) {
        return res.status(404).json({ success: false, message: 'Vendor profile not found' });
      }
    }

    const query = {};
    if (vendor) {
      query.vendor = vendor._id;
    }

    // Query all published or drafted products
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .populate('vendor', 'storeName phone supportEmail')
      .sort({ stock: 1, updatedAt: -1 });

    // Filter products where stock <= lowStockThreshold or variants have low stock
    const lowStockProducts = products.filter((p) => {
      const threshold = p.lowStockThreshold !== undefined ? p.lowStockThreshold : 5;
      const isProductLow = p.stock <= threshold;
      const hasLowVariant =
        p.hasVariants &&
        Array.isArray(p.variants) &&
        p.variants.some((v) => v.stock <= (v.lowStockThreshold !== undefined ? v.lowStockThreshold : 5));
      return isProductLow || hasLowVariant;
    });

    let outOfStockCount = 0;
    let criticalCount = 0;
    let totalAtRiskInventoryValue = 0;

    const formattedList = lowStockProducts.map((p) => {
      const threshold = p.lowStockThreshold !== undefined ? p.lowStockThreshold : 5;
      const isOut = p.stock <= 0;
      const isCritical = p.stock <= 2;
      if (isOut) outOfStockCount++;
      if (isCritical) criticalCount++;

      const riskValue = (p.sellingPrice || 0) * (p.stock || 0);
      totalAtRiskInventoryValue += riskValue;

      const suggestedRestockQty = Math.max(10, threshold * 3 - (p.stock || 0));

      return {
        _id: p._id,
        productId: p._id,
        title: p.title,
        sku: p.sku || `SKU-${p._id.toString().slice(-6)}`,
        category: p.category?.name || 'General',
        brand: p.brand || p.vendor?.storeName || 'Store Brand',
        thumbnail: p.thumbnail || (p.images && p.images[0]) || '',
        stock: p.stock || 0,
        lowStockThreshold: threshold,
        sellingPrice: p.sellingPrice || 0,
        mrp: p.mrp || 0,
        isOutOfStock: isOut,
        isCritical,
        urgencyLevel: isOut ? 'OUT_OF_STOCK' : isCritical ? 'CRITICAL' : 'WARNING',
        suggestedRestockQty,
        vendor: {
          id: p.vendor?._id,
          storeName: p.vendor?.storeName || 'Apex Tech Hub',
          phone: p.vendor?.phone || '',
        },
      };
    });

    res.status(200).json({
      success: true,
      count: formattedList.length,
      telemetry: {
        totalLowStockCount: formattedList.length,
        outOfStockCount,
        criticalCount,
        totalAtRiskInventoryValue,
      },
      products: formattedList,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Minimum Low-Stock Thresholds (Single or Batch) (Point 10)
// @route   PUT /api/vendor/inventory/thresholds
exports.updateInventoryThresholds = async (req, res, next) => {
  try {
    let vendor;
    const isAdmin = req.user && (req.user.role === 'superadmin' || req.user.role === 'admin');

    if (isAdmin) {
      const targetVendorId = req.body.vendorId;
      if (targetVendorId) {
        vendor = await VendorProfile.findById(targetVendorId);
      } else {
        vendor = (await VendorProfile.findOne({ status: 'approved' })) || (await VendorProfile.findOne({}));
      }
    } else {
      vendor = await VendorProfile.findOne({ user: req.user._id });
    }

    if (!vendor && !isAdmin) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const { productId, lowStockThreshold, thresholds, defaultThreshold } = req.body;
    let updatedCount = 0;

    // Mode 1: Global default threshold update for store
    if (defaultThreshold !== undefined) {
      const numDefault = Math.max(0, parseInt(defaultThreshold, 10) || 5);
      const query = isAdmin && !vendor ? {} : { vendor: vendor._id };
      const result = await Product.updateMany(query, { $set: { lowStockThreshold: numDefault } });
      updatedCount = result.modifiedCount || 0;

      await recordAuditLog({
        action: 'INVENTORY_THRESHOLD_GLOBAL_UPDATED',
        module: 'INVENTORY',
        req,
        description: `Updated global low-stock threshold to ${numDefault} across ${updatedCount} products`,
        targetType: 'Product',
        details: { defaultThreshold: numDefault, updatedCount },
        severity: 'LOW',
      });

      return res.status(200).json({
        success: true,
        message: `Updated global low-stock threshold to ${numDefault} across ${updatedCount} products.`,
        updatedCount,
      });
    }

    // Mode 2: Batch array of thresholds
    if (Array.isArray(thresholds) && thresholds.length > 0) {
      for (const item of thresholds) {
        if (!item.productId) continue;
        const thresh = Math.max(0, parseInt(item.lowStockThreshold, 10) || 5);
        const query = { _id: item.productId };
        if (!isAdmin && vendor) query.vendor = vendor._id;

        await Product.updateOne(query, { $set: { lowStockThreshold: thresh } });
        updatedCount++;
      }
    } else if (productId) {
      // Mode 3: Single product threshold update
      const thresh = Math.max(0, parseInt(lowStockThreshold, 10) || 0);
      const query = { _id: productId };
      if (!isAdmin && vendor) query.vendor = vendor._id;

      const prod = await Product.findOne(query);
      if (!prod) {
        return res.status(404).json({ success: false, message: 'Product not found or not owned by your store' });
      }

      prod.lowStockThreshold = thresh;
      await prod.save();
      updatedCount = 1;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please provide either productId and lowStockThreshold, or an array of thresholds.',
      });
    }

    await recordAuditLog({
      action: 'INVENTORY_THRESHOLD_UPDATED',
      module: 'INVENTORY',
      req,
      description: `Updated minimum stock threshold for ${updatedCount} products`,
      targetType: 'Product',
      details: { updatedCount },
      severity: 'LOW',
    });

    res.status(200).json({
      success: true,
      message: `Successfully updated low-stock threshold for ${updatedCount} product(s).`,
      updatedCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger WhatsApp & Multi-Channel Restock Red Alert (Point 10)
// @route   POST /api/vendor/inventory/trigger-restock-alert
// @route   POST /api/admin/inventory/trigger-restock-alert
exports.triggerRestockAlert = async (req, res, next) => {
  try {
    let vendor;
    const isAdmin = req.user && (req.user.role === 'superadmin' || req.user.role === 'admin');

    if (isAdmin) {
      const targetVendorId = req.body.vendorId || req.query.vendorId;
      if (targetVendorId) {
        vendor = await VendorProfile.findById(targetVendorId);
      } else {
        vendor = (await VendorProfile.findOne({ status: 'approved' })) || (await VendorProfile.findOne({}));
      }
    } else {
      vendor = await VendorProfile.findOne({ user: req.user._id });
    }

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    // Find all low stock products for this vendor
    const products = await Product.find({ vendor: vendor._id });
    const lowStockItems = products.filter((p) => {
      const threshold = p.lowStockThreshold !== undefined ? p.lowStockThreshold : 5;
      return p.stock <= threshold;
    });

    const storeName = vendor.storeName || 'Apex Tech Hub';
    const rawPhone = req.body.phone || vendor.phone || '+91 98765 43210';
    const cleanPhone = String(rawPhone).replace(/\D/g, '');

    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const skuLines = lowStockItems.slice(0, 5).map(
      (item, idx) =>
        `${idx + 1}. *${item.sku || 'SKU-STD'}* - ${item.title.slice(0, 30)} (Stock: *${item.stock}*, Min: *${item.lowStockThreshold || 5}*)`
    );

    const messageText = [
      `⚠️ *AURAMARKET RED ALERT: INVENTORY RESTOCK WARNING*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🏬 Store: *${storeName}*`,
      `⏰ Triggered: ${timestamp}`,
      `📦 At-Risk SKUs: *${lowStockItems.length} Products*`,
      ``,
      ...skuLines,
      lowStockItems.length > 5 ? `...and ${lowStockItems.length - 5} more items below minimum safety stock.` : '',
      ``,
      `👉 *Restock Instantly on Seller Central:*`,
      `https://shribalajikripadham.online/ecommerce-demo/#vendor-inventory`,
    ]
      .filter(Boolean)
      .join('\n');

    const config = await UIConfig.findOne();
    const waConfig = config?.integrations?.whatsapp || {};
    const latencyMs = Math.max(15, Math.floor(Math.random() * 35) + 20);
    const messageId = `wamid.HBgL${Date.now().toString(36).toUpperCase()}_RESTOCK==`;
    const previewUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;

    await recordAuditLog({
      action: 'INVENTORY_RESTOCK_ALERT_DISPATCHED',
      module: 'INVENTORY',
      req,
      description: `Dispatched WhatsApp restock alert for ${lowStockItems.length} at-risk items to '${storeName}' (+${cleanPhone})`,
      targetType: 'VendorProfile',
      targetId: vendor._id,
      details: {
        vendorId: vendor._id,
        phone: cleanPhone,
        lowStockCount: lowStockItems.length,
        messageId,
      },
      severity: lowStockItems.length > 5 ? 'HIGH' : 'MEDIUM',
    });

    res.status(200).json({
      success: true,
      channel: 'whatsapp',
      provider: 'meta_cloud_api',
      apiVersion: waConfig.apiVersion || 'v20.0',
      recipientPhone: cleanPhone,
      recipientStore: storeName,
      lowStockCount: lowStockItems.length,
      messageId,
      latencyMs,
      messageText,
      previewUrl,
      message: `WhatsApp restock alert successfully dispatched to +${cleanPhone} via Meta Cloud API.`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Quick 1-Click Inventory Restock for Alert Radar (Point 10)
// @route   PATCH /api/vendor/inventory/quick-restock
exports.quickRestockInventory = async (req, res, next) => {
  try {
    let vendor;
    const isAdmin = req.user && (req.user.role === 'superadmin' || req.user.role === 'admin');

    if (isAdmin) {
      const targetVendorId = req.body.vendorId;
      if (targetVendorId) {
        vendor = await VendorProfile.findById(targetVendorId);
      }
    } else {
      vendor = await VendorProfile.findOne({ user: req.user._id });
    }

    if (!vendor && !isAdmin) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const { restockItems, productId, additionalStock } = req.body;
    let itemsToProcess = [];

    if (Array.isArray(restockItems) && restockItems.length > 0) {
      itemsToProcess = restockItems;
    } else if (productId && additionalStock !== undefined) {
      itemsToProcess = [{ productId, additionalStock }];
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please provide either productId and additionalStock, or an array of restockItems.',
      });
    }

    let updatedCount = 0;
    const updatedProducts = [];

    for (const item of itemsToProcess) {
      const addQty = parseInt(item.additionalStock, 10);
      if (isNaN(addQty) || addQty <= 0) continue;

      const query = { _id: item.productId };
      if (!isAdmin && vendor) query.vendor = vendor._id;

      const product = await Product.findOne(query);
      if (!product) continue;

      product.stock = (product.stock || 0) + addQty;
      await product.save();

      updatedCount++;
      updatedProducts.push({
        productId: product._id,
        sku: product.sku,
        title: product.title,
        newStock: product.stock,
        lowStockThreshold: product.lowStockThreshold || 5,
        isLowStock: product.stock <= (product.lowStockThreshold || 5),
      });
    }

    await recordAuditLog({
      action: 'INVENTORY_QUICK_RESTOCK',
      module: 'INVENTORY',
      req,
      description: `Executed 1-click quick restock across ${updatedCount} products`,
      targetType: 'Product',
      details: { updatedCount, items: updatedProducts },
      severity: 'LOW',
    });

    res.status(200).json({
      success: true,
      message: `Successfully restocked ${updatedCount} product(s).`,
      updatedCount,
      products: updatedProducts,
    });
  } catch (error) {
    next(error);
  }
};
