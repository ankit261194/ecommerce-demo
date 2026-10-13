const User = require('../models/User');
const VendorProfile = require('../models/VendorProfile');
const Product = require('../models/Product');
const Order = require('../models/Order');
const SubOrder = require('../models/SubOrder');
const Ledger = require('../models/Ledger');
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

// @desc    Get All Orders across all vendors
// @route   GET /api/admin/orders
exports.getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('customer', 'name email phone')
      .populate({
        path: 'subOrders',
        populate: { path: 'vendor', select: 'storeName' },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: orders.length, data: orders });
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
