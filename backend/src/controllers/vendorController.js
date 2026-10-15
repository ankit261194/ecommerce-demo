const VendorProfile = require('../models/VendorProfile');
const Product = require('../models/Product');
const SubOrder = require('../models/SubOrder');
const Ledger = require('../models/Ledger');
const DeliveryTask = require('../models/DeliveryTask');

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

// @desc    Get All Products of Logged-in Vendor
// @route   GET /api/vendor/products
exports.getVendorProducts = async (req, res, next) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const products = await Product.find({ vendor: vendor._id })
      .populate('category', 'name slug')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: products.length, data: products });
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

    const { title, description, category, brand, images, thumbnail, gallery, mrp, sellingPrice, stock, sku, hasVariants, variants, tags } = req.body;

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4);

    let calculatedStock = Number(stock) || 0;
    if (hasVariants && Array.isArray(variants) && variants.length > 0) {
      calculatedStock = variants.reduce((acc, v) => acc + (Number(v.stock) || 0), 0);
    }

    const defaultImg = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';
    let primaryThumbnail = thumbnail || (images && images.length ? images[0] : (gallery && gallery.length ? gallery[0] : defaultImg));
    let cleanGallery = Array.isArray(gallery) ? gallery.filter(img => img && img !== primaryThumbnail) : (images && images.length > 1 ? images.slice(1) : []);
    let combinedImages = [primaryThumbnail, ...cleanGallery];

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
      mrp,
      sellingPrice,
      stock: calculatedStock,
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
// @route   GET /api/vendor/orders
exports.getVendorOrders = async (req, res, next) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const { status } = req.query;
    const filter = { vendor: vendor._id };
    if (status) filter.status = status;

    const orders = await SubOrder.find(filter)
      .populate('customer', 'name email phone')
      .populate('deliveryPartner', 'name phone')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Sub-Order Status (e.g., packed, dispatched, cancelled)
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
    const allowedVendorStatuses = ['confirmed', 'packed', 'dispatched', 'cancelled'];
    if (!allowedVendorStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition '${status}'. Vendors can only update status to: ${allowedVendorStatuses.join(', ')}. Delivery completion requires customer OTP verification.`,
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

    // If dispatched, sync DeliveryTask
    if (status === 'dispatched') {
      await DeliveryTask.findOneAndUpdate(
        { subOrder: subOrder._id, status: 'ASSIGNED' },
        { status: 'PICKED_UP' }
      );
    }

    subOrder.status = status;
    subOrder.trackingHistory.push({
      status,
      timestamp: new Date(),
      note: note || `Vendor updated status to ${status}`,
    });

    await subOrder.save();

    res.status(200).json({ success: true, message: `Order updated to ${status}`, data: subOrder });
  } catch (error) {
    next(error);
  }
};

// @desc    Request Wallet Payout
// @route   POST /api/vendor/payout
exports.requestPayout = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0 || numAmount > vendor.walletBalance) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payout amount. Must be a valid positive number not exceeding available wallet balance.',
      });
    }

    vendor.walletBalance -= numAmount;
    await vendor.save();

    const ledger = await Ledger.create({
      vendor: vendor._id,
      type: 'PAYOUT_WITHDRAWAL',
      amount: numAmount,
      description: `Vendor payout request for ₹${numAmount} to bank ${vendor.bankDetails?.bankName || 'Default'}`,
      balanceAfter: vendor.walletBalance,
      status: 'PENDING',
      payoutDetails: {
        accountHolder: vendor.bankDetails?.accountHolder || '',
        accountNumber: vendor.bankDetails?.accountNumber || '',
        ifscCode: vendor.bankDetails?.ifscCode || '',
        bankName: vendor.bankDetails?.bankName || '',
      },
    });

    res.status(200).json({
      success: true,
      message: 'Payout request submitted successfully. Funds will transfer in 24-48 hours.',
      data: ledger,
    });
  } catch (error) {
    next(error);
  }
};
