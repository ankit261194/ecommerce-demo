const User = require('../models/User');
const VendorProfile = require('../models/VendorProfile');
const Product = require('../models/Product');
const Order = require('../models/Order');
const SubOrder = require('../models/SubOrder');
const Ledger = require('../models/Ledger');
const UIConfig = require('../models/UIConfig');
const smsService = require('../services/smsService');
const mailService = require('../services/mailService');
const { wipeDemoData, seedDemoData } = require('../utils/demoManager');

// @desc    Get Master Super Admin Analytics
// @route   GET /api/admin/analytics
exports.getDashboardAnalytics = async (req, res, next) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalVendors = await VendorProfile.countDocuments();
    const approvedVendors = await VendorProfile.countDocuments({ status: 'approved' });
    const pendingVendors = await VendorProfile.countDocuments({ status: 'pending' });
    const totalProducts = await Product.countDocuments();
    const totalCustomers = await User.countDocuments({ role: 'customer' });

    // Financial aggregates
    const financialStats = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalGrossSales: { $sum: '$totalAmount' },
          totalPlatformCommission: { $sum: '$totalCommission' },
        },
      },
    ]);

    const grossSales = financialStats.length > 0 ? financialStats[0].totalGrossSales : 0;
    const platformCommission = financialStats.length > 0 ? financialStats[0].totalPlatformCommission : 0;

    // Recent 5 orders
    const recentOrders = await Order.find()
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        grossSales,
        platformCommission,
        totalOrders,
        totalVendors,
        approvedVendors,
        pendingVendors,
        totalProducts,
        totalCustomers,
        recentOrders,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get All Vendors with Status & KYC Filters, Search, and Aggregated Stats (Point #44)
// @route   GET /api/admin/vendors
exports.getAllVendors = async (req, res, next) => {
  try {
    const { status, kycStatus, search } = req.query;
    const filter = {};

    if (status && status !== 'ALL') {
      filter.status = status.toLowerCase();
    }
    if (kycStatus && kycStatus !== 'ALL') {
      filter.kycStatus = kycStatus.toUpperCase();
    }

    if (search && search.trim()) {
      const term = search.trim();
      const userMatches = await User.find({
        $or: [
          { name: { $regex: term, $options: 'i' } },
          { email: { $regex: term, $options: 'i' } },
          { phone: { $regex: term, $options: 'i' } },
        ],
      }).select('_id');
      const userIds = userMatches.map((u) => u._id);

      filter.$or = [
        { storeName: { $regex: term, $options: 'i' } },
        { gstNumber: { $regex: term, $options: 'i' } },
        { panNumber: { $regex: term, $options: 'i' } },
        { user: { $in: userIds } },
      ];
    }

    const vendors = await VendorProfile.find(filter)
      .populate('user', 'name email phone createdAt isVerified')
      .sort({ createdAt: -1 });

    const allVendors = await VendorProfile.find({});
    const stats = {
      totalVendors: allVendors.length,
      pendingApproval: allVendors.filter((v) => v.status === 'pending' || v.kycStatus === 'PENDING').length,
      approvedVendors: allVendors.filter((v) => v.status === 'approved').length,
      rejectedVendors: allVendors.filter((v) => v.status === 'rejected' || v.kycStatus === 'REJECTED').length,
      kycVerified: allVendors.filter((v) => v.kycStatus === 'VERIFIED').length,
    };

    res.status(200).json({
      success: true,
      count: vendors.length,
      stats,
      data: vendors,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Single Vendor Full Profile with KYC Docs & Store Performance
// @route   GET /api/admin/vendors/:id
exports.getVendorDetails = async (req, res, next) => {
  try {
    const vendor = await VendorProfile.findById(req.params.id).populate(
      'user',
      'name email phone createdAt isVerified'
    );
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }
    res.status(200).json({ success: true, data: vendor });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve / Reject / Suspend Vendor & Update Commission (Point #44)
// @route   PUT /api/admin/vendors/:id/status
exports.updateVendorStatus = async (req, res, next) => {
  try {
    const { status, commissionRate, rejectionReason, adminNotes } = req.body;
    const vendor = await VendorProfile.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    if (status) {
      vendor.status = status.toLowerCase();
      if (status.toLowerCase() === 'approved') {
        vendor.kycStatus = 'VERIFIED';
        vendor.kycVerifiedAt = new Date();
      } else if (status.toLowerCase() === 'rejected') {
        vendor.kycStatus = 'REJECTED';
        if (rejectionReason) vendor.kycRejectionReason = rejectionReason;
      }
    }

    if (commissionRate !== undefined) {
      const parsedRate = Number(commissionRate);
      if (parsedRate < 0 || parsedRate > 100) {
        return res.status(400).json({ success: false, message: 'Commission rate must be between 0 and 100%' });
      }
      vendor.commissionRate = parsedRate;
    }

    if (rejectionReason !== undefined) vendor.kycRejectionReason = rejectionReason;
    if (adminNotes !== undefined) vendor.adminNotes = adminNotes;

    await vendor.save();

    res.status(200).json({
      success: true,
      message: `Vendor status updated to ${vendor.status}`,
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Review and Approve / Reject Vendor KYC Documents (Point #44)
// @route   PUT /api/admin/vendors/:id/kyc
exports.updateVendorKYC = async (req, res, next) => {
  try {
    const { kycStatus, rejectionReason, adminNotes } = req.body;
    const vendor = await VendorProfile.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    if (!['VERIFIED', 'REJECTED', 'PENDING'].includes(kycStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid KYC status' });
    }

    vendor.kycStatus = kycStatus;
    if (kycStatus === 'VERIFIED') {
      vendor.status = 'approved';
      vendor.kycVerifiedAt = new Date();
      vendor.kycRejectionReason = '';
    } else if (kycStatus === 'REJECTED') {
      vendor.status = 'rejected';
      vendor.kycRejectionReason = rejectionReason || 'KYC documents did not meet verification criteria';
    }

    if (adminNotes !== undefined) vendor.adminNotes = adminNotes;

    await vendor.save();

    res.status(200).json({
      success: true,
      message: `Vendor KYC set to ${vendor.kycStatus}`,
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Set Custom Commission Rate for a specific Vendor (Point #44)
// @route   PUT /api/admin/vendors/:id/commission
exports.updateVendorCommission = async (req, res, next) => {
  try {
    const { commissionRate } = req.body;
    const rate = Number(commissionRate);

    if (isNaN(rate) || rate < 0 || rate > 100) {
      return res.status(400).json({
        success: false,
        message: 'Commission rate must be a valid number between 0% and 100%',
      });
    }

    const vendor = await VendorProfile.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    vendor.commissionRate = rate;
    await vendor.save();

    res.status(200).json({
      success: true,
      message: `Custom commission rate updated to ${vendor.commissionRate}%`,
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get All Orders across all vendors with multi-status filters, search, and counts
// @route   GET /api/admin/orders
exports.getAllOrders = async (req, res, next) => {
  try {
    const { status, paymentStatus, paymentMethod, search, dateRange } = req.query;
    const query = {};

    // 1. Status Filter
    if (status && status !== 'ALL') {
      if (status === 'IN_PROGRESS') {
        query.status = { $in: ['IN_PROGRESS', 'PARTIALLY_DELIVERED'] };
      } else {
        query.status = status.toUpperCase();
      }
    }

    // 2. Payment Status Filter
    if (paymentStatus && paymentStatus !== 'ALL') {
      query.paymentStatus = paymentStatus.toUpperCase();
    }

    // 3. Payment Method Filter
    if (paymentMethod && paymentMethod !== 'ALL') {
      query.paymentMethod = paymentMethod.toUpperCase();
    }

    // 4. Date Range Filter
    if (dateRange && dateRange !== 'ALL') {
      const now = new Date();
      if (dateRange === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        query.createdAt = { $gte: startOfDay };
      } else if (dateRange === 'yesterday') {
        const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        query.createdAt = { $gte: startOfYesterday, $lt: endOfYesterday };
      } else if (dateRange === 'this_week') {
        const startOfWeek = new Date(now.setDate(now.getDate() - 7));
        query.createdAt = { $gte: startOfWeek };
      } else if (dateRange === 'this_month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        query.createdAt = { $gte: startOfMonth };
      }
    }

    // 5. Search by Order Number or Customer
    if (search && search.trim()) {
      const term = search.trim();
      const customerMatches = await User.find({
        $or: [
          { name: { $regex: term, $options: 'i' } },
          { phone: { $regex: term, $options: 'i' } },
          { email: { $regex: term, $options: 'i' } },
        ],
      }).select('_id');

      const customerIds = customerMatches.map(c => c._id);
      query.$or = [
        { orderNumber: { $regex: term, $options: 'i' } },
        { customer: { $in: customerIds } },
      ];
    }

    const orders = await Order.find(query)
      .populate('customer', 'name email phone')
      .populate({
        path: 'subOrders',
        populate: { path: 'vendor', select: 'storeName storeLogo' },
      })
      .sort({ createdAt: -1 });

    // Aggregate real-time Status Counts for Super Admin tabs
    const [allCount, placedCount, inProgressCount, deliveredCount, cancelledCount] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: 'PLACED' }),
      Order.countDocuments({ status: { $in: ['IN_PROGRESS', 'PARTIALLY_DELIVERED'] } }),
      Order.countDocuments({ status: 'DELIVERED' }),
      Order.countDocuments({ status: 'CANCELLED' }),
    ]);

    res.status(200).json({
      success: true,
      count: orders.length,
      statusCounts: {
        all: allCount,
        placed: placedCount,
        in_progress: inProgressCount,
        delivered: deliveredCount,
        cancelled: cancelledCount,
      },
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Order Status from Super Admin Command Center (Point #32)
// @route   PUT /api/admin/orders/:id/status
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus, note } = req.body;

    const order = await Order.findById(id).populate('subOrders');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const previousStatus = order.status;
    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    // If marked DELIVERED, advance sub-orders and mark PAID
    if (status === 'DELIVERED') {
      order.paymentStatus = 'PAID';
      for (const sub of order.subOrders || []) {
        sub.status = 'delivered';
        await sub.save();
      }
    }

    // If marked CANCELLED and was not previously cancelled, auto-restore stock
    if (status === 'CANCELLED' && previousStatus !== 'CANCELLED') {
      const Product = require('../models/Product');
      for (const item of order.items || []) {
        if (item.variantSku) {
          await Product.findOneAndUpdate(
            { _id: item.product, 'variants.sku': item.variantSku },
            { $inc: { stock: item.quantity, 'variants.$.stock': item.quantity } }
          );
        } else {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
        }
      }
      order.cancellationReason = note || 'Admin Order Cancellation';
      order.cancelledAt = new Date();
    }

    await order.save();

    const updated = await Order.findById(order._id)
      .populate('customer', 'name email phone')
      .populate({
        path: 'subOrders',
        populate: { path: 'vendor', select: 'storeName storeLogo' },
      });

    res.status(200).json({
      success: true,
      message: `Order #${order.orderNumber} status updated to ${order.status}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Multi-Vendor Commission Split Inspector per Order (Point #33)
// @route   GET /api/admin/orders/:id/commission-split
exports.getOrderCommissionSplit = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Search by Mongo ObjectId or Order Number
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId ? { _id: id } : { orderNumber: id };

    const order = await Order.findOne(query)
      .populate('customer', 'name email phone')
      .populate({
        path: 'subOrders',
        populate: { path: 'vendor', select: 'storeName storeLogo commissionRate user walletBalance' },
      });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found for commission inspection' });
    }

    const vendorSplits = [];
    for (const sub of order.subOrders || []) {
      const vendorSubtotal = sub.subTotal || 0;
      const commissionRate = sub.platformCommissionRate || (sub.vendor && sub.vendor.commissionRate) || 10;
      const platformCommissionCut = sub.platformCommissionAmount !== undefined
        ? sub.platformCommissionAmount
        : Math.round((vendorSubtotal * commissionRate) / 100);
      const netVendorPayable = sub.vendorEarning !== undefined
        ? sub.vendorEarning
        : vendorSubtotal - platformCommissionCut;

      const ledgerEntries = await Ledger.find({ subOrder: sub._id }).select('transactionId type amount balanceAfter status createdAt');

      vendorSplits.push({
        subOrderId: sub._id,
        subOrderStatus: sub.status,
        vendorId: sub.vendor?._id,
        storeName: sub.vendor?.storeName || 'Partner Store',
        storeLogo: sub.vendor?.storeLogo || '',
        commissionRatePercent: commissionRate,
        vendorSubtotal,
        platformCommissionCut,
        netVendorPayable,
        items: sub.items || [],
        deliveryOtp: sub.deliveryOtp,
        payoutStatus:
          sub.status === 'delivered'
            ? 'SETTLED_TO_WALLET'
            : sub.status === 'cancelled'
            ? 'CANCELLED_REVERSED'
            : 'ESCROW_PENDING_DELIVERY',
        ledgerEntries,
      });
    }

    const grossOrderAmount = (order.totalAmount || 0) + (order.discountAmount || 0);
    const discountAmount = order.discountAmount || 0;
    const netCustomerPaid = order.totalAmount || 0;
    const totalVendorPayouts = vendorSplits.reduce((sum, s) => sum + s.netVendorPayable, 0);
    const totalPlatformCommissions = vendorSplits.reduce((sum, s) => sum + s.platformCommissionCut, 0);
    const reconciliationDelta = Math.abs((totalVendorPayouts + totalPlatformCommissions) - grossOrderAmount);
    const isPennyPerfectReconciled = reconciliationDelta <= 1;

    res.status(200).json({
      success: true,
      message: `Commission split breakdown for Order #${order.orderNumber}`,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        customer: order.customer,
        financials: {
          grossOrderAmount,
          discountAmount,
          netCustomerPaid,
          totalVendorPayouts,
          totalPlatformCommissions,
          reconciliationDelta,
          isPennyPerfectReconciled,
        },
        vendorSplits,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Platform Financial Ledger
// @route   GET /api/admin/ledger
exports.getPlatformLedger = async (req, res, next) => {
  try {
    const ledgerEntries = await Ledger.find()
      .populate('vendor', 'storeName')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ success: true, data: ledgerEntries });
  } catch (error) {
    next(error);
  }
};

// @desc    1-Click Wipe Demo Data (Clean Production Reset)
// @route   POST /api/admin/wipe-demo
exports.triggerWipeDemo = async (req, res, next) => {
  try {
    const result = await wipeDemoData();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    1-Click Seed Demo Data (Showcase Mode)
// @route   POST /api/admin/seed-demo
exports.triggerSeedDemo = async (req, res, next) => {
  try {
    const result = await seedDemoData();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Get All External Integrations Settings (Super Admin Only)
// @route   GET /api/admin/integrations
exports.getIntegrations = async (req, res, next) => {
  try {
    let config = await UIConfig.findOne();
    if (!config) {
      config = await UIConfig.create({});
    }
    res.status(200).json({
      success: true,
      data: config.integrations || {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update External Integrations Settings (Super Admin Only)
// @route   PUT /api/admin/integrations
exports.updateIntegrations = async (req, res, next) => {
  try {
    let config = await UIConfig.findOne();
    if (!config) {
      config = new UIConfig({});
    }

    if (!config.integrations) {
      config.integrations = {};
    }

    const { sms, payments, email, storage } = req.body;
    const cur = config.integrations.toObject ? config.integrations.toObject() : config.integrations;

    if (sms) {
      config.integrations.sms = {
        ...(cur.sms || {}),
        ...sms,
        fast2sms: { ...(cur.sms?.fast2sms || {}), ...(sms.fast2sms || {}) },
        msg91: { ...(cur.sms?.msg91 || {}), ...(sms.msg91 || {}) },
        twilio: { ...(cur.sms?.twilio || {}), ...(sms.twilio || {}) },
      };
    }
    if (payments) {
      config.integrations.payments = {
        ...(cur.payments || {}),
        ...payments,
        cod: { ...(cur.payments?.cod || {}), ...(payments.cod || {}) },
        razorpay: { ...(cur.payments?.razorpay || {}), ...(payments.razorpay || {}) },
        stripe: { ...(cur.payments?.stripe || {}), ...(payments.stripe || {}) },
        upi: { ...(cur.payments?.upi || {}), ...(payments.upi || {}) },
      };
    }
    if (email) {
      config.integrations.email = {
        ...(cur.email || {}),
        ...email,
        smtp: { ...(cur.email?.smtp || {}), ...(email.smtp || {}) },
        sendgrid: { ...(cur.email?.sendgrid || {}), ...(email.sendgrid || {}) },
      };
    }
    if (storage) {
      config.integrations.storage = {
        ...(cur.storage || {}),
        ...storage,
        local: { ...(cur.storage?.local || {}), ...(storage.local || {}) },
        cloudinary: { ...(cur.storage?.cloudinary || {}), ...(storage.cloudinary || {}) },
        s3: { ...(cur.storage?.s3 || {}), ...(storage.s3 || {}) },
      };
    }

    await config.save();

    res.status(200).json({
      success: true,
      message: 'Integrations updated successfully! Changes are active immediately.',
      data: config.integrations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Live Test SMS Gateway
// @route   POST /api/admin/integrations/test-sms
exports.testSMSIntegration = async (req, res, next) => {
  try {
    const { phone, message, provider, config } = req.body;
    const result = await smsService.sendSMS({
      to: phone || '+918533955333',
      message: message || 'Live test verification message from AuraMarket Master Integrations Hub.',
      provider,
      config,
    });

    res.status(200).json({
      success: result.success,
      message: result.note || (result.success ? 'Test SMS processed successfully' : result.error),
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Live Test Email / SMTP Gateway
// @route   POST /api/admin/integrations/test-email
exports.testEmailIntegration = async (req, res, next) => {
  try {
    const { to, email, subject, message, provider, config } = req.body;
    const recipient = email || to || 'admin@auramarket.com';
    const result = await mailService.sendMail({
      to: recipient,
      subject: subject || 'AuraMarket Live SMTP Test Verification',
      text: message || 'Your SMTP credentials have been successfully connected to AuraMarket Multi-Vendor Marketplace!',
      provider,
      config,
    });

    res.status(200).json({
      success: result.success,
      message: result.note || (result.success ? 'Test Email processed successfully' : result.error),
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk Update Order Status (Point #35)
// @route   POST /api/admin/orders/bulk-status
exports.bulkUpdateOrderStatus = async (req, res, next) => {
  try {
    const { orderIds, status, paymentStatus, note } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of orderIds to update' });
    }

    if (!status && !paymentStatus) {
      return res.status(400).json({ success: false, message: 'Please provide a valid status or paymentStatus to apply' });
    }

    const Product = require('../models/Product');
    const updatedIds = [];

    for (const id of orderIds) {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
      const query = isObjectId ? { _id: id } : { orderNumber: id };
      const order = await Order.findOne(query).populate('subOrders');
      if (!order) continue;

      const previousStatus = order.status;
      if (status) order.status = status;
      if (paymentStatus) order.paymentStatus = paymentStatus;

      if (status === 'DELIVERED') {
        order.paymentStatus = 'PAID';
        for (const sub of order.subOrders || []) {
          sub.status = 'delivered';
          await sub.save();
        }
      }

      if (status === 'CANCELLED' && previousStatus !== 'CANCELLED') {
        for (const item of order.items || []) {
          if (item.variantSku) {
            await Product.findOneAndUpdate(
              { _id: item.product, 'variants.sku': item.variantSku },
              { $inc: { stock: item.quantity, 'variants.$.stock': item.quantity } }
            );
          } else {
            await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
          }
        }
        order.cancellationReason = note || 'Admin Bulk Order Cancellation';
        order.cancelledAt = new Date();
      }

      await order.save();
      updatedIds.push(order._id);
    }

    res.status(200).json({
      success: true,
      message: `Successfully updated ${updatedIds.length} orders to ${status || paymentStatus}`,
      updatedCount: updatedIds.length,
      updatedIds,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export Orders as RFC-4180 CSV (Point #35)
// @route   GET /api/admin/orders/export-csv
// @route   POST /api/admin/orders/export-csv
exports.exportOrdersCSV = async (req, res, next) => {
  try {
    const params = req.method === 'POST' ? req.body : req.query;
    const { status, paymentStatus, paymentMethod, search, orderIds } = params;

    const filter = {};

    if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
      filter.$or = [
        { _id: { $in: orderIds.filter(id => /^[0-9a-fA-F]{24}$/.test(id)) } },
        { orderNumber: { $in: orderIds } },
      ];
    } else {
      if (status && status !== 'all') {
        filter.status = status.toUpperCase();
      }
      if (paymentStatus && paymentStatus !== 'all') {
        filter.paymentStatus = paymentStatus.toUpperCase();
      }
      if (paymentMethod && paymentMethod !== 'all') {
        filter.paymentMethod = paymentMethod.toUpperCase();
      }
      if (search && search.trim()) {
        const regex = new RegExp(search.trim(), 'i');
        filter.$or = [
          { orderNumber: regex },
          { 'shippingAddress.recipientName': regex },
          { 'shippingAddress.city': regex },
          { 'shippingAddress.phone': regex },
        ];
      }
    }

    const orders = await Order.find(filter)
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 });

    const escapeCsv = (val) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      'Order ID',
      'Date',
      'Customer Name',
      'Phone',
      'Email',
      'Total Amount (INR)',
      'Payment Status',
      'Payment Method',
      'Order Status',
      'Items Count',
      'Shipping City',
      'Shipping State',
      'Pincode',
      'Delivery Address',
    ];

    const rows = orders.map((ord) => {
      const custName = ord.customer?.name || ord.shippingAddress?.recipientName || 'Valued Customer';
      const custPhone = ord.shippingAddress?.phone || ord.customer?.phone || 'N/A';
      const custEmail = ord.customer?.email || 'N/A';
      const itemsCount = (ord.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0);
      const fullAddress = `${ord.shippingAddress?.street || ''}, ${ord.shippingAddress?.city || ''}, ${ord.shippingAddress?.state || ''} - ${ord.shippingAddress?.pincode || ''}`;

      return [
        escapeCsv(ord.orderNumber || ord._id),
        escapeCsv(ord.createdAt ? new Date(ord.createdAt).toISOString().split('T')[0] : ''),
        escapeCsv(custName),
        escapeCsv(custPhone),
        escapeCsv(custEmail),
        escapeCsv(ord.totalAmount || 0),
        escapeCsv(ord.paymentStatus),
        escapeCsv(ord.paymentMethod),
        escapeCsv(ord.status),
        escapeCsv(itemsCount),
        escapeCsv(ord.shippingAddress?.city || ''),
        escapeCsv(ord.shippingAddress?.state || ''),
        escapeCsv(ord.shippingAddress?.pincode || ''),
        escapeCsv(fullAddress),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const dateStr = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="AuraMarket_Orders_${dateStr}.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

// @desc    Consolidated Invoices for Bulk Orders (Point #35)
// @route   POST /api/admin/orders/bulk-invoices
exports.getBulkInvoices = async (req, res, next) => {
  try {
    const { orderIds, format } = req.body;
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of orderIds' });
    }

    const invoices = [];
    for (const id of orderIds) {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
      const query = isObjectId ? { _id: id } : { orderNumber: id };
      const order = await Order.findOne(query)
        .populate('customer', 'name email phone')
        .populate('items.product', 'title hsnCode price');
      if (!order) continue;

      invoices.push({
        orderId: order._id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        totalAmount: order.totalAmount,
        status: order.status,
        customerName: order.customer?.name || order.shippingAddress?.recipientName || 'Valued Customer',
        itemCount: (order.items || []).reduce((s, it) => s + (it.quantity || 1), 0),
      });
    }

    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// POINT #43: CUSTOMER CRM DIRECTORY CONTROLLERS
// =========================================================================

// @desc    Get All Customers with CRM Lifetime Value & Order History Stats
// @route   GET /api/admin/customers
// @access  Private (Super Admin)
exports.getAllCustomers = async (req, res, next) => {
  try {
    const { search, status, sort = 'createdAt' } = req.query;

    const query = { role: 'customer' };

    if (status && status !== 'all') {
      if (status === 'active') {
        query.isActive = true;
        query.status = 'ACTIVE';
      } else if (status === 'blocked') {
        query.status = 'BLOCKED';
      } else if (status === 'verified') {
        query.isVerified = true;
      }
    }

    if (search && search.trim() !== '') {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
        { phone: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const customers = await User.find(query).sort({ createdAt: -1 });

    // Aggregate lifetime orders & spending per customer
    const enrichedCustomers = await Promise.all(
      customers.map(async (cust) => {
        const orders = await Order.find({ customer: cust._id });
        const validOrders = orders.filter((o) => o.status !== 'CANCELLED');
        const lifetimeSpend = validOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const lastOrder = orders.length > 0 ? orders[0].createdAt : null;

        return {
          _id: cust._id,
          name: cust.name,
          email: cust.email,
          phone: cust.phone,
          role: cust.role,
          isActive: cust.isActive,
          status: cust.status || 'ACTIVE',
          isVerified: cust.isVerified !== undefined ? cust.isVerified : true,
          tags: cust.tags || ['Verified Shopper'],
          adminNotes: cust.adminNotes || '',
          walletBalance: cust.walletBalance || 0,
          walletCoins: cust.walletCoins || 0,
          addresses: cust.addresses || [],
          ordersCount: orders.length,
          lifetimeSpend,
          lastOrderDate: lastOrder,
          createdAt: cust.createdAt,
        };
      })
    );

    // Global CRM Metrics
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const activeCustomers = await User.countDocuments({ role: 'customer', isActive: true });
    const blockedCustomers = await User.countDocuments({ role: 'customer', status: 'BLOCKED' });
    const verifiedCustomers = await User.countDocuments({ role: 'customer', isVerified: true });
    const totalCustomerLTV = enrichedCustomers.reduce((acc, c) => acc + c.lifetimeSpend, 0);

    res.status(200).json({
      success: true,
      count: enrichedCustomers.length,
      stats: {
        totalCustomers,
        activeCustomers,
        blockedCustomers,
        verifiedCustomers,
        totalCustomerLTV,
        averageCustomerLTV:
          totalCustomers > 0 ? Math.round(totalCustomerLTV / totalCustomers) : 0,
      },
      data: enrichedCustomers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Single Customer Full CRM Profile with Order History
// @route   GET /api/admin/customers/:id
// @access  Private (Super Admin)
exports.getCustomerDetails = async (req, res, next) => {
  try {
    const customer = await User.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    const orders = await Order.find({ customer: customer._id }).sort({ createdAt: -1 });
    const validOrders = orders.filter((o) => o.status !== 'CANCELLED');
    const lifetimeSpend = validOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        customer,
        ordersCount: orders.length,
        lifetimeSpend,
        orders,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle Customer Active / Blocked Status
// @route   PATCH /api/admin/customers/:id/status
// @access  Private (Super Admin)
exports.toggleCustomerStatus = async (req, res, next) => {
  try {
    const customer = await User.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    const isCurrentlyBlocked = customer.status === 'BLOCKED' || !customer.isActive;
    customer.status = isCurrentlyBlocked ? 'ACTIVE' : 'BLOCKED';
    customer.isActive = isCurrentlyBlocked ? true : false;
    await customer.save();

    res.status(200).json({
      success: true,
      message: `Customer account ${customer.status === 'ACTIVE' ? 'activated' : 'blocked'} successfully`,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle Customer Verification Badge
// @route   PATCH /api/admin/customers/:id/verify
// @access  Private (Super Admin)
exports.toggleCustomerVerification = async (req, res, next) => {
  try {
    const customer = await User.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    customer.isVerified = !customer.isVerified;
    await customer.save();

    res.status(200).json({
      success: true,
      message: `Customer ${customer.isVerified ? 'marked as verified' : 'unverified'}`,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Customer Admin Notes & Tags
// @route   PUT /api/admin/customers/:id/notes
// @access  Private (Super Admin)
exports.updateCustomerNotes = async (req, res, next) => {
  try {
    const { adminNotes, tags } = req.body;
    const customer = await User.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    if (adminNotes !== undefined) customer.adminNotes = adminNotes;
    if (tags !== undefined) customer.tags = tags;
    await customer.save();

    res.status(200).json({
      success: true,
      message: 'Customer CRM notes updated successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};


