const PayoutSplit = require('../models/PayoutSplit');
const SubOrder = require('../models/SubOrder');
const VendorProfile = require('../models/VendorProfile');
const { executeVendorPayoutSplit } = require('../services/payoutSplitService');

// @desc    Get Logged-in Vendor's Automated Payout Splits & Telemetry
// @route   GET /api/payout-splits/vendor
// @access  Private (Vendor)
exports.getVendorPayoutSplits = async (req, res, next) => {
  try {
    let vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      vendor = await VendorProfile.findById(req.user._id);
    }

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found for authenticated user',
      });
    }

    const splits = await PayoutSplit.find({ vendor: vendor._id })
      .populate('subOrder', 'status items shippingAddress')
      .sort({ settledAt: -1 });

    const totalGrossSales = splits.reduce((acc, s) => acc + (s.grossAmount || 0), 0);
    const totalCommissionDeducted = splits.reduce((acc, s) => acc + (s.adminCommission || 0), 0);
    const totalNetCredited = splits.reduce((acc, s) => acc + (s.vendorNetPayout || 0), 0);

    res.status(200).json({
      success: true,
      count: splits.length,
      stats: {
        totalSettlements: splits.length,
        totalGrossSales,
        totalCommissionDeducted,
        totalNetCredited,
        currentWalletBalance: vendor.walletBalance || 0,
        commissionRate: vendor.commissionRate || 10,
      },
      data: splits,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Platform-Wide Automated Payout Splits for Super Admin
// @route   GET /api/payout-splits/admin
// @access  Private (Super Admin)
exports.getAllAdminPayoutSplits = async (req, res, next) => {
  try {
    const { vendorId, status } = req.query;
    const filter = {};

    if (vendorId) filter.vendor = vendorId;
    if (status) filter.status = status.toUpperCase();

    const splits = await PayoutSplit.find(filter)
      .populate('vendor', 'storeName storeLogo supportPhone')
      .populate('subOrder', 'status orderNumber')
      .sort({ settledAt: -1 });

    const allSplits = await PayoutSplit.find();
    const platformTotalGross = allSplits.reduce((acc, s) => acc + (s.grossAmount || 0), 0);
    const platformCommissionRevenue = allSplits.reduce((acc, s) => acc + (s.adminCommission || 0), 0);
    const vendorDisbursements = allSplits.reduce((acc, s) => acc + (s.vendorNetPayout || 0), 0);

    res.status(200).json({
      success: true,
      count: splits.length,
      platformStats: {
        totalSettlements: allSplits.length,
        platformTotalGross,
        platformCommissionRevenue,
        vendorDisbursements,
      },
      data: splits,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Manually / Programmatically Trigger Instant Vendor Payout Split
// @route   POST /api/payout-splits/admin/settle/:subOrderId
// @access  Private (Super Admin)
exports.triggerPayoutSplit = async (req, res, next) => {
  try {
    const { subOrderId } = req.params;
    const result = await executeVendorPayoutSplit(subOrderId, {
      notes: req.body.notes || 'Admin-triggered instant escrow payout split release.',
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Simulate Delivery Payout Split Breakdown
// @route   POST /api/payout-splits/simulate
// @access  Public / Authenticated
exports.simulatePayoutSplit = (req, res) => {
  const { amount = 0, commissionRate = 10, category = 'General' } = req.body;

  const grossAmount = Math.max(0, Number(amount) || 0);
  const rate = Math.max(0, Math.min(100, Number(commissionRate) || 10));

  const adminCommission = Math.round((grossAmount * (rate / 100)) * 100) / 100;
  const vendorNetPayout = Math.round((grossAmount - adminCommission) * 100) / 100;

  res.status(200).json({
    success: true,
    category,
    grossAmount,
    commissionRate: rate,
    adminCommission,
    vendorNetPayout,
    breakdown: {
      grossTotal: grossAmount,
      platformCommission: adminCommission,
      netCreditedToVendor: vendorNetPayout,
      instantSettlementFee: 0,
    },
  });
};
