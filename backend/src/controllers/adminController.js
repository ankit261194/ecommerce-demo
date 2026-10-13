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

// @desc    Get All Vendors with Status Filter
// @route   GET /api/admin/vendors
exports.getAllVendors = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const vendors = await VendorProfile.find(filter)
      .populate('user', 'name email phone createdAt')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: vendors.length, data: vendors });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve / Reject / Suspend Vendor & Update Commission
// @route   PUT /api/admin/vendors/:id/status
exports.updateVendorStatus = async (req, res, next) => {
  try {
    const { status, commissionRate } = req.body;
    const vendor = await VendorProfile.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    if (status) vendor.status = status;
    if (commissionRate !== undefined) vendor.commissionRate = Number(commissionRate);

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

