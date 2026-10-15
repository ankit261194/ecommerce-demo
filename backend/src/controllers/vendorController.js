const VendorProfile = require('../models/VendorProfile');
const Product = require('../models/Product');
const SubOrder = require('../models/SubOrder');
const Ledger = require('../models/Ledger');
const DeliveryTask = require('../models/DeliveryTask');
const Category = require('../models/Category');
const Review = require('../models/Review');

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

// @desc    Get All Products of Logged-in Vendor (Point #54: Low Stock Alert Filter & Inventory Stats)
// @route   GET /api/vendor/products
exports.getVendorProducts = async (req, res, next) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const allProducts = await Product.find({ vendor: vendor._id })
      .populate('category', 'name slug')
      .sort({ createdAt: -1 });

    const stats = {
      total: allProducts.length,
      inStock: allProducts.filter(p => p.stock > (p.lowStockThreshold !== undefined ? p.lowStockThreshold : 5)).length,
      lowStock: allProducts.filter(p => p.stock > 0 && p.stock <= (p.lowStockThreshold !== undefined ? p.lowStockThreshold : 5)).length,
      outOfStock: allProducts.filter(p => p.stock <= 0).length,
    };

    let filtered = allProducts;
    if (req.query.filter === 'low_stock') {
      filtered = allProducts.filter(p => p.stock > 0 && p.stock <= (p.lowStockThreshold !== undefined ? p.lowStockThreshold : 5));
    } else if (req.query.filter === 'out_of_stock') {
      filtered = allProducts.filter(p => p.stock <= 0);
    } else if (req.query.filter === 'in_stock') {
      filtered = allProducts.filter(p => p.stock > (p.lowStockThreshold !== undefined ? p.lowStockThreshold : 5));
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

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
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

    res.status(200).json({
      success: true,
      message: `Stock updated successfully. Current stock: ${product.stock}`,
      data: product,
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

// @desc    Bulk Upload / Upsert Products via CSV or JSON (Point #55)
// @route   POST /api/vendor/products/bulk-upload
exports.bulkUploadProducts = async (req, res, next) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor || vendor.status !== 'approved') {
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
        errors.push({ row: rowNum, error: 'Product title is required' });
        continue;
      }

      let sku = (raw.sku || '').trim();
      if (!sku) {
        sku = `SKU-BULK-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
      }

      const sellPrice = Math.max(0, Number(raw.sellingprice || raw.price || raw.sellprice) || 0);
      let mrpVal = Number(raw.mrp || raw.originalprice) || Math.round(sellPrice * 1.25);
      if (mrpVal < sellPrice) {
        mrpVal = sellPrice;
      }
      const savings = Math.max(0, mrpVal - sellPrice);
      const discPct = mrpVal > 0 ? Math.round((savings / mrpVal) * 100) : 0;

      const stockVal = Math.max(0, parseInt(raw.stock || raw.quantity || raw.qty, 10) || 0);
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

      // Check for existing SKU for this vendor
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
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4) + '-' + Math.floor(Math.random() * 1000);
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

    res.status(200).json({
      success: true,
      message: `Bulk import completed: ${insertedCount} added, ${updatedCount} updated, ${errors.length} errors`,
      totalProcessed: items.length,
      insertedCount,
      updatedCount,
      errorCount: errors.length,
      errors,
      data: processedProducts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export Vendor Catalog as CSV (Point #55)
// @route   GET /api/vendor/products/export-csv
exports.exportProductsCSV = async (req, res, next) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user._id });
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

    const csvContent = [headers.join(','), ...rows].join('\r\n');
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
    const vendor = await VendorProfile.findOne({ user: req.user._id });
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
    const vendor = await VendorProfile.findOne({ user: req.user._id });
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

