const SubOrder = require('../models/SubOrder');
const VendorProfile = require('../models/VendorProfile');
const WalletTransaction = require('../models/WalletTransaction');
const Ledger = require('../models/Ledger');
const AuditLog = require('../models/AuditLog');
const EscrowConfig = require('../models/EscrowConfig');
const User = require('../models/User');
const {
  getOrCreateEscrowConfig,
  executeSubOrderEscrowRelease,
} = require('../services/escrowService');

/**
 * GET /api/vendor/escrow/summary
 * Returns vendor's locked escrow balance, matured ready for release balance,
 * upcoming releases calendar/countdown per order, and list of sub-orders in escrow.
 */
exports.getVendorEscrowSummary = async (req, res, next) => {
  try {
    let vendor = null;
    if (req.user.role === 'superadmin' && req.query.vendorId) {
      vendor = await VendorProfile.findById(req.query.vendorId);
    } else {
      vendor = await VendorProfile.findOne({ user: req.user._id });
    }

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found for authenticated user.',
      });
    }

    const config = await getOrCreateEscrowConfig();
    const subOrders = await SubOrder.find({ vendor: vendor._id })
      .populate('items.product', 'title name images price')
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 });

    const now = new Date();
    let lockedEscrowBalance = 0;
    let maturedReadyBalance = 0;
    let disputedEscrowBalance = 0;
    let totalSettledBalance = 0;
    let totalRefundedBalance = 0;

    const upcomingReleases = [];

    for (const sub of subOrders) {
      const details = sub.escrowDetails || {};
      const status = details.escrowStatus || (sub.status === 'delivered' ? 'HOLD_IN_RETURN_WINDOW' : 'HOLD_PENDING_DELIVERY');
      const amount = Number(details.escrowAmount || sub.vendorEarning || 0);
      const isDisputed = details.isDisputed === true || status === 'DISPUTED_HOLD';
      const dueDate = details.escrowReleaseDueDate ? new Date(details.escrowReleaseDueDate) : null;
      const isMatured = dueDate ? now >= dueDate : false;

      if (status === 'RELEASED_TO_WALLET') {
        totalSettledBalance += amount;
      } else if (status === 'REFUNDED_TO_CUSTOMER') {
        totalRefundedBalance += amount;
      } else if (isDisputed) {
        disputedEscrowBalance += amount;
      } else if (status === 'ELIGIBLE_FOR_RELEASE' || (status === 'HOLD_IN_RETURN_WINDOW' && isMatured)) {
        maturedReadyBalance += amount;
      } else {
        // HOLD_PENDING_DELIVERY or active HOLD_IN_RETURN_WINDOW
        lockedEscrowBalance += amount;
      }

      // Add to upcoming or active releases schedule if not yet released/refunded
      if (!['RELEASED_TO_WALLET', 'REFUNDED_TO_CUSTOMER'].includes(status)) {
        const msRemaining = dueDate ? Math.max(0, dueDate.getTime() - now.getTime()) : null;
        const daysRemaining = msRemaining !== null ? Math.ceil(msRemaining / (1000 * 60 * 60 * 24)) : null;
        const hoursRemaining = msRemaining !== null ? Math.ceil(msRemaining / (1000 * 60 * 60)) : null;

        upcomingReleases.push({
          subOrderId: sub._id,
          orderNumber: sub.trackingNumber || `SO-${sub._id.toString().slice(-6).toUpperCase()}`,
          itemsCount: sub.items?.length || 0,
          grossAmount: sub.subTotal || 0,
          escrowAmount: amount,
          platformCommissionHeld: Number(details.platformCommissionHeld || sub.platformCommissionAmount || 0),
          subOrderStatus: sub.status,
          escrowStatus: status,
          isDisputed,
          disputeReason: details.disputeReason || '',
          deliveredAt: details.deliveredAt || sub.deliveredAt || null,
          escrowReleaseDueDate: dueDate,
          escrowHoldDays: details.escrowHoldDays || vendor.customHoldDays || 7,
          isMatured: isMatured && !isDisputed,
          msRemaining,
          daysRemaining,
          hoursRemaining,
          customerName: sub.customer?.name || 'Customer',
        });
      }
    }

    // Sort upcoming releases: matured first, then closest due date
    upcomingReleases.sort((a, b) => {
      if (a.isMatured && !b.isMatured) return -1;
      if (!a.isMatured && b.isMatured) return 1;
      const dateA = a.escrowReleaseDueDate ? new Date(a.escrowReleaseDueDate).getTime() : 9999999999999;
      const dateB = b.escrowReleaseDueDate ? new Date(b.escrowReleaseDueDate).getTime() : 9999999999999;
      return dateA - dateB;
    });

    const calculatedEscrow = lockedEscrowBalance + maturedReadyBalance + disputedEscrowBalance;
    if (vendor.escrowBalance !== calculatedEscrow) {
      vendor.escrowBalance = calculatedEscrow;
      await vendor.save();
    }

    res.status(200).json({
      success: true,
      data: {
        vendor: {
          id: vendor._id,
          storeName: vendor.storeName,
          walletBalance: vendor.walletBalance || 0,
          escrowBalance: vendor.escrowBalance || 0,
          customHoldDays: vendor.customHoldDays || 7,
          payoutSchedule: vendor.payoutSchedule || 'WEEKLY_MONDAY',
          autoReleaseEnabled: vendor.autoReleaseEnabled !== false,
          earlyReleaseEligible: !!vendor.earlyReleaseEligible,
          rating: vendor.rating || 4.8,
        },
        summary: {
          lockedEscrowBalance,
          maturedReadyBalance,
          disputedEscrowBalance,
          totalSettledBalance,
          totalRefundedBalance,
          totalPendingSubOrders: upcomingReleases.length,
          maturedReadyCount: upcomingReleases.filter(u => u.isMatured).length,
          disputedCount: upcomingReleases.filter(u => u.isDisputed).length,
        },
        upcomingReleases,
        subOrders: subOrders.slice(0, 30),
        config: {
          defaultHoldDays: config.defaultHoldDays,
          minimumPayoutThreshold: config.minimumPayoutThreshold,
          powerSellerEarlyRelease: config.powerSellerEarlyRelease,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/vendor/escrow/release-matured
 * Releases matured escrow funds to vendor wallet.
 * Supports self-service for single subOrder or bulk release of all matured funds.
 * Idempotent: safe against double clicks or repeated invocations.
 */
exports.releaseMaturedEscrowFunds = async (req, res, next) => {
  try {
    let vendor = null;
    if (req.user.role === 'superadmin' && req.body.vendorId) {
      vendor = await VendorProfile.findById(req.body.vendorId);
    } else {
      vendor = await VendorProfile.findOne({ user: req.user._id });
    }

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found.',
      });
    }

    const { subOrderId, subOrderIds } = req.body;
    const now = new Date();

    // Case 1: Targeted single SubOrder release
    if (subOrderId) {
      const subOrder = await SubOrder.findOne({
        _id: subOrderId,
        vendor: vendor._id,
      });

      if (!subOrder) {
        return res.status(404).json({
          success: false,
          message: `SubOrder #${subOrderId} not found for this vendor.`,
        });
      }

      // Idempotency: Already released?
      if (subOrder.escrowDetails?.escrowStatus === 'RELEASED_TO_WALLET') {
        return res.status(200).json({
          success: true,
          alreadyReleased: true,
          message: 'Escrow funds already released to wallet.',
          releasedCount: 0,
          releasedAmount: 0,
          currentWalletBalance: vendor.walletBalance || 0,
          currentEscrowBalance: vendor.escrowBalance || 0,
          subOrder,
        });
      }

      // Active dispute check
      if (subOrder.escrowDetails?.isDisputed || subOrder.escrowDetails?.escrowStatus === 'DISPUTED_HOLD') {
        return res.status(400).json({
          success: false,
          message: 'Cannot release escrow funds: SubOrder payout is currently frozen under active dispute.',
        });
      }

      // Maturity check
      const dueDate = subOrder.escrowDetails?.escrowReleaseDueDate
        ? new Date(subOrder.escrowDetails.escrowReleaseDueDate)
        : null;

      if (dueDate && now < dueDate) {
        return res.status(400).json({
          success: false,
          message: `Hold period active. Escrow funds will mature on ${dueDate.toISOString()}.`,
          dueDate,
        });
      }

      const releaseResult = await executeSubOrderEscrowRelease(
        subOrder,
        vendor,
        req.user,
        'MANUAL_VENDOR_SINGLE'
      );

      return res.status(200).json({
        success: true,
        message: `Successfully released ₹${releaseResult.amount} from escrow to wallet.`,
        releasedCount: 1,
        releasedAmount: releaseResult.amount,
        currentWalletBalance: releaseResult.walletBalance,
        currentEscrowBalance: releaseResult.escrowBalance,
        subOrder,
      });
    }

    // Case 2: Batch release of all matured suborders for this vendor
    const filter = {
      vendor: vendor._id,
      'escrowDetails.isDisputed': { $ne: true },
      'escrowDetails.escrowStatus': { $in: ['HOLD_IN_RETURN_WINDOW', 'ELIGIBLE_FOR_RELEASE'] },
      'escrowDetails.escrowReleaseDueDate': { $lte: now },
    };

    if (Array.isArray(subOrderIds) && subOrderIds.length > 0) {
      filter._id = { $in: subOrderIds };
    }

    const maturedSubOrders = await SubOrder.find(filter);

    if (!maturedSubOrders || maturedSubOrders.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No matured escrow funds pending release at this time.',
        releasedCount: 0,
        releasedAmount: 0,
        currentWalletBalance: vendor.walletBalance || 0,
        currentEscrowBalance: vendor.escrowBalance || 0,
      });
    }

    let totalReleased = 0;
    let releasedCount = 0;

    for (const sub of maturedSubOrders) {
      try {
        const result = await executeSubOrderEscrowRelease(
          sub,
          vendor,
          req.user,
          'MANUAL_VENDOR_BATCH'
        );
        if (!result.alreadyReleased) {
          totalReleased += result.amount;
          releasedCount++;
        }
      } catch (err) {
        console.warn(`Skipping release for subOrder ${sub._id}:`, err.message);
      }
    }

    res.status(200).json({
      success: true,
      message: `Successfully released ₹${totalReleased} to vendor wallet across ${releasedCount} order(s).`,
      releasedCount,
      releasedAmount: totalReleased,
      currentWalletBalance: vendor.walletBalance || 0,
      currentEscrowBalance: vendor.escrowBalance || 0,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/escrow/radar
 * Super Admin command dashboard returning total platform escrow locked GMV,
 * matured pending release, active dispute holds, and upcoming release forecasts.
 */
exports.getAdminEscrowRadar = async (req, res, next) => {
  try {
    const config = await getOrCreateEscrowConfig();
    const now = new Date();

    const allSubOrders = await SubOrder.find()
      .populate('vendor', 'storeName storeLogo rating customHoldDays walletBalance escrowBalance user')
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 });

    let totalPlatformEscrowLockedGMV = 0;
    let maturedPendingReleaseGMV = 0;
    let activeDisputedGMV = 0;
    let totalSettledGMV = 0;
    let totalRefundedGMV = 0;
    let activeDisputeCount = 0;
    let maturedCount = 0;

    const vendorMaturedMap = {};
    const forecastMap = {}; // Day buckets (YYYY-MM-DD)

    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      forecastMap[key] = { date: key, amount: 0, count: 0 };
    }

    const recentEscrowSubOrders = [];

    for (const sub of allSubOrders) {
      const details = sub.escrowDetails || {};
      const status = details.escrowStatus || (sub.status === 'delivered' ? 'HOLD_IN_RETURN_WINDOW' : 'HOLD_PENDING_DELIVERY');
      const amount = Number(details.escrowAmount || sub.vendorEarning || 0);
      const isDisputed = details.isDisputed === true || status === 'DISPUTED_HOLD';
      const dueDate = details.escrowReleaseDueDate ? new Date(details.escrowReleaseDueDate) : null;
      const isMatured = dueDate ? now >= dueDate : false;

      if (status === 'RELEASED_TO_WALLET') {
        totalSettledGMV += amount;
      } else if (status === 'REFUNDED_TO_CUSTOMER') {
        totalRefundedGMV += amount;
      } else if (isDisputed) {
        activeDisputedGMV += amount;
        activeDisputeCount++;
      } else if (status === 'ELIGIBLE_FOR_RELEASE' || (status === 'HOLD_IN_RETURN_WINDOW' && isMatured)) {
        maturedPendingReleaseGMV += amount;
        maturedCount++;

        const vendorId = sub.vendor?._id?.toString() || 'unknown';
        if (!vendorMaturedMap[vendorId]) {
          vendorMaturedMap[vendorId] = {
            vendorId: sub.vendor?._id,
            storeName: sub.vendor?.storeName || 'Vendor',
            walletBalance: sub.vendor?.walletBalance || 0,
            escrowBalance: sub.vendor?.escrowBalance || 0,
            maturedAmount: 0,
            maturedCount: 0,
            subOrderIds: [],
          };
        }
        vendorMaturedMap[vendorId].maturedAmount += amount;
        vendorMaturedMap[vendorId].maturedCount += 1;
        vendorMaturedMap[vendorId].subOrderIds.push(sub._id);
      } else {
        totalPlatformEscrowLockedGMV += amount;
      }

      // Populate forecast for active return window
      if (!isDisputed && !['RELEASED_TO_WALLET', 'REFUNDED_TO_CUSTOMER'].includes(status) && dueDate && dueDate >= now) {
        const dateKey = dueDate.toISOString().split('T')[0];
        if (forecastMap[dateKey]) {
          forecastMap[dateKey].amount += amount;
          forecastMap[dateKey].count += 1;
        }
      }

      if (recentEscrowSubOrders.length < 50) {
        recentEscrowSubOrders.push({
          subOrderId: sub._id,
          orderNumber: sub.trackingNumber || `SO-${sub._id.toString().slice(-6).toUpperCase()}`,
          vendor: {
            id: sub.vendor?._id,
            storeName: sub.vendor?.storeName || 'Vendor',
            logo: sub.vendor?.storeLogo || '',
          },
          customer: {
            name: sub.customer?.name || 'Customer',
            email: sub.customer?.email || '',
          },
          escrowAmount: amount,
          platformCommissionHeld: Number(details.platformCommissionHeld || sub.platformCommissionAmount || 0),
          escrowStatus: status,
          isDisputed,
          disputeReason: details.disputeReason || '',
          deliveredAt: details.deliveredAt || sub.deliveredAt,
          escrowReleaseDueDate: dueDate,
          isMatured: isMatured && !isDisputed,
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        platformTreasury: {
          totalPlatformEscrowLockedGMV,
          maturedPendingReleaseGMV,
          activeDisputedGMV,
          totalSettledGMV,
          totalRefundedGMV,
          activeDisputeCount,
          maturedCount,
          totalActiveEscrowPool: totalPlatformEscrowLockedGMV + maturedPendingReleaseGMV + activeDisputedGMV,
        },
        forecast: Object.values(forecastMap),
        vendorsWithMaturedEscrow: Object.values(vendorMaturedMap),
        recentEscrowSubOrders,
        config,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/escrow/batch-release
 * Super Admin 1-click batch release of all eligible matured vendor escrow balances.
 */
exports.adminBatchReleaseEscrow = async (req, res, next) => {
  try {
    const { vendorIds, subOrderIds } = req.body;
    const now = new Date();

    const query = {
      'escrowDetails.isDisputed': { $ne: true },
      'escrowDetails.escrowStatus': { $in: ['HOLD_IN_RETURN_WINDOW', 'ELIGIBLE_FOR_RELEASE'] },
      'escrowDetails.escrowReleaseDueDate': { $lte: now },
    };

    if (Array.isArray(vendorIds) && vendorIds.length > 0) {
      query.vendor = { $in: vendorIds };
    }
    if (Array.isArray(subOrderIds) && subOrderIds.length > 0) {
      query._id = { $in: subOrderIds };
    }

    const eligibleSubOrders = await SubOrder.find(query).populate('vendor');

    if (!eligibleSubOrders || eligibleSubOrders.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No eligible matured escrow balances found for batch release.',
        totalReleased: 0,
        releasedOrdersCount: 0,
        vendorCount: 0,
      });
    }

    let totalReleased = 0;
    let releasedOrdersCount = 0;
    const affectedVendors = new Set();

    for (const sub of eligibleSubOrders) {
      let vendor = sub.vendor;
      if (!vendor || !vendor.storeName) {
        vendor = await VendorProfile.findById(sub.vendor);
      }
      if (!vendor) continue;

      try {
        const result = await executeSubOrderEscrowRelease(
          sub,
          vendor,
          req.user,
          'ADMIN_PLATFORM_BATCH'
        );
        if (!result.alreadyReleased) {
          totalReleased += result.amount;
          releasedOrdersCount++;
          affectedVendors.add(vendor._id.toString());
        }
      } catch (err) {
        console.warn(`Admin batch release skipped SubOrder #${sub._id}:`, err.message);
      }
    }

    // Log administrative action
    await AuditLog.create({
      action: 'ADMIN_BATCH_ESCROW_RELEASE',
      module: 'FINANCE',
      performedBy: req.user._id,
      userName: req.user.name || 'Super Admin',
      userEmail: req.user.email || 'admin@auramarket.com',
      userRole: req.user.role || 'superadmin',
      targetType: 'EscrowTreasury',
      description: `Executed platform batch release of ₹${totalReleased} across ${releasedOrdersCount} sub-orders for ${affectedVendors.size} vendors.`,
      severity: 'MEDIUM',
      status: 'SUCCESS',
      details: {
        totalReleased,
        releasedOrdersCount,
        vendorCount: affectedVendors.size,
      },
    });

    res.status(200).json({
      success: true,
      message: `Batch escrow release completed. ₹${totalReleased} released across ${releasedOrdersCount} sub-order(s) for ${affectedVendors.size} vendor(s).`,
      totalReleased,
      releasedOrdersCount,
      vendorCount: affectedVendors.size,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/escrow/:subOrderId/dispute
 * Administrative freeze on escrow payout (e.g. pending customer fraud/RTO investigation).
 */
exports.disputeEscrowHold = async (req, res, next) => {
  try {
    const { subOrderId } = req.params;
    const { reason, notes } = req.body;

    const subOrder = await SubOrder.findById(subOrderId).populate('vendor');
    if (!subOrder) {
      return res.status(404).json({
        success: false,
        message: `SubOrder #${subOrderId} not found.`,
      });
    }

    if (subOrder.escrowDetails?.escrowStatus === 'RELEASED_TO_WALLET') {
      return res.status(400).json({
        success: false,
        message: 'Cannot dispute an escrow hold that has already been released to vendor wallet.',
      });
    }

    if (!subOrder.escrowDetails) {
      subOrder.escrowDetails = {};
    }

    const previousStatus = subOrder.escrowDetails.escrowStatus;
    subOrder.escrowDetails.isDisputed = true;
    subOrder.escrowDetails.escrowStatus = 'DISPUTED_HOLD';
    subOrder.escrowDetails.disputeReason = reason || 'Administrative freeze pending investigation';
    subOrder.escrowDetails.disputedAt = new Date();
    subOrder.escrowDetails.disputedBy = req.user._id;
    subOrder.escrowDetails.disputeNotes = notes || '';
    await subOrder.save();

    await AuditLog.create({
      action: 'DISPUTE_ESCROW_HOLD',
      module: 'FINANCE',
      performedBy: req.user._id,
      userName: req.user.name || 'Super Admin',
      userEmail: req.user.email || 'admin@auramarket.com',
      userRole: req.user.role || 'superadmin',
      targetId: subOrder._id.toString(),
      targetType: 'SubOrder',
      description: `Administrative escrow hold placed on SubOrder #${subOrder._id}: ${reason || 'Investigation freeze'}`,
      severity: 'HIGH',
      status: 'SUCCESS',
      previousValue: { escrowStatus: previousStatus },
      newValue: { escrowStatus: 'DISPUTED_HOLD', disputeReason: subOrder.escrowDetails.disputeReason },
    });

    res.status(200).json({
      success: true,
      message: `Escrow payout for SubOrder #${subOrderId} has been frozen under dispute.`,
      subOrder,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/escrow/:subOrderId/resolve-dispute
 * Resolve hold (decision: RELEASE_TO_VENDOR or REFUND_TO_CUSTOMER).
 */
exports.resolveEscrowDispute = async (req, res, next) => {
  try {
    const { subOrderId } = req.params;
    const { decision, notes } = req.body;

    if (!['RELEASE_TO_VENDOR', 'REFUND_TO_CUSTOMER'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resolution decision. Must be 'RELEASE_TO_VENDOR' or 'REFUND_TO_CUSTOMER'.",
      });
    }

    const subOrder = await SubOrder.findById(subOrderId)
      .populate('vendor')
      .populate('customer');

    if (!subOrder) {
      return res.status(404).json({
        success: false,
        message: `SubOrder #${subOrderId} not found.`,
      });
    }

    if (
      !subOrder.escrowDetails?.isDisputed &&
      subOrder.escrowDetails?.escrowStatus !== 'DISPUTED_HOLD'
    ) {
      return res.status(400).json({
        success: false,
        message: 'SubOrder is not currently in disputed hold status.',
      });
    }

    let vendor = subOrder.vendor;
    if (!vendor || !vendor.storeName) {
      vendor = await VendorProfile.findById(subOrder.vendor);
    }

    const now = new Date();
    const vendorEarning = Number(subOrder.escrowDetails?.escrowAmount || subOrder.vendorEarning || 0);
    const refundAmount = Number(subOrder.subTotal || vendorEarning);

    if (decision === 'RELEASE_TO_VENDOR') {
      // Release escrow to vendor wallet
      if (vendor) {
        vendor.walletBalance = (vendor.walletBalance || 0) + vendorEarning;
        vendor.escrowBalance = Math.max(0, (vendor.escrowBalance || 0) - vendorEarning);
        await vendor.save();

        const vendorUser = vendor.user?._id ? vendor.user : await User.findById(vendor.user);
        if (vendorUser) {
          await WalletTransaction.create({
            user: vendorUser._id || vendor.user,
            type: 'CREDIT',
            currency: 'INR',
            amount: vendorEarning,
            category: 'ESCROW_RELEASE',
            paymentMethod: 'SYSTEM',
            transactionReference: `ESCROW-DISP-REL-${subOrder._id.toString().slice(-8).toUpperCase()}`,
            title: `Dispute Resolved: Escrow Released (#${subOrder._id.toString().slice(-6)})`,
            description: `Adjudication decision: Released disputed escrow to vendor wallet. ${notes || ''}`.trim(),
            order: subOrder.parentOrder,
            balanceAfter: vendor.walletBalance,
            status: 'SUCCESS',
          });
        }

        await Ledger.create({
          vendor: vendor._id,
          subOrder: subOrder._id,
          type: 'ESCROW_RELEASE',
          amount: vendorEarning,
          description: `Dispute resolved in vendor's favor: ₹${vendorEarning} released from escrow`,
          balanceAfter: vendor.walletBalance,
          status: 'COMPLETED',
        });
      }

      subOrder.escrowDetails.isDisputed = false;
      subOrder.escrowDetails.escrowStatus = 'RELEASED_TO_WALLET';
      subOrder.escrowDetails.disputeResolution = 'RELEASE_TO_VENDOR';
      subOrder.escrowDetails.disputeResolvedAt = now;
      subOrder.escrowDetails.disputeNotes = notes || '';
      subOrder.escrowDetails.escrowReleasedAt = now;
      await subOrder.save();

      await AuditLog.create({
        action: 'RESOLVE_ESCROW_DISPUTE_VENDOR',
        module: 'FINANCE',
        performedBy: req.user._id,
        userName: req.user.name || 'Super Admin',
        userEmail: req.user.email || 'admin@auramarket.com',
        userRole: req.user.role || 'superadmin',
        targetId: subOrder._id.toString(),
        targetType: 'SubOrder',
        description: `Dispute resolved for SubOrder #${subOrder._id}: Released ₹${vendorEarning} to vendor wallet.`,
        severity: 'MEDIUM',
        status: 'SUCCESS',
        details: { decision, notes, vendorEarning, vendorId: vendor?._id },
      });
    } else {
      // REFUND_TO_CUSTOMER
      if (vendor) {
        vendor.escrowBalance = Math.max(0, (vendor.escrowBalance || 0) - vendorEarning);
        await vendor.save();
      }

      // Credit customer wallet with refund
      const customerUser = subOrder.customer?._id ? subOrder.customer : await User.findById(subOrder.customer);
      if (customerUser) {
        customerUser.walletBalance = (customerUser.walletBalance || 0) + refundAmount;
        await customerUser.save();

        await WalletTransaction.create({
          user: customerUser._id,
          type: 'CREDIT',
          currency: 'INR',
          amount: refundAmount,
          category: 'ORDER_REFUND',
          paymentMethod: 'WALLET',
          transactionReference: `ESCROW-REFUND-${subOrder._id.toString().slice(-8).toUpperCase()}`,
          title: `Refund Credited: SubOrder #${subOrder._id.toString().slice(-6)}`,
          description: `Dispute resolution refund for returned/disputed order. ${notes || ''}`.trim(),
          order: subOrder.parentOrder,
          balanceAfter: customerUser.walletBalance,
          status: 'SUCCESS',
        });
      }

      subOrder.escrowDetails.isDisputed = false;
      subOrder.escrowDetails.escrowStatus = 'REFUNDED_TO_CUSTOMER';
      subOrder.escrowDetails.disputeResolution = 'REFUND_TO_CUSTOMER';
      subOrder.escrowDetails.disputeResolvedAt = now;
      subOrder.escrowDetails.disputeNotes = notes || '';
      await subOrder.save();

      await AuditLog.create({
        action: 'RESOLVE_ESCROW_DISPUTE_CUSTOMER',
        module: 'FINANCE',
        performedBy: req.user._id,
        userName: req.user.name || 'Super Admin',
        userEmail: req.user.email || 'admin@auramarket.com',
        userRole: req.user.role || 'superadmin',
        targetId: subOrder._id.toString(),
        targetType: 'SubOrder',
        description: `Dispute resolved for SubOrder #${subOrder._id}: Refunded ₹${refundAmount} to customer.`,
        severity: 'MEDIUM',
        status: 'SUCCESS',
        details: { decision, notes, refundAmount, customerId: customerUser?._id },
      });
    }

    res.status(200).json({
      success: true,
      message: `Dispute on SubOrder #${subOrderId} resolved with decision: ${decision}.`,
      decision,
      subOrder,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/escrow/config
 * Retrieve system-wide escrow configuration
 */
exports.getEscrowConfig = async (req, res, next) => {
  try {
    const config = await getOrCreateEscrowConfig();
    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/escrow/config
 * Update system-wide hold period, minimum payout threshold, power-seller rules
 */
exports.updateEscrowConfig = async (req, res, next) => {
  try {
    const config = await getOrCreateEscrowConfig();
    const {
      defaultHoldDays,
      minimumPayoutThreshold,
      powerSellerEarlyRelease,
      payoutSchedules,
      autoReleaseEnabled,
      disputeFreezeWindowDays,
      notes,
    } = req.body;

    const previousConfig = config.toObject();

    if (typeof defaultHoldDays === 'number' && defaultHoldDays >= 0) {
      config.defaultHoldDays = defaultHoldDays;
    }
    if (typeof minimumPayoutThreshold === 'number' && minimumPayoutThreshold >= 0) {
      config.minimumPayoutThreshold = minimumPayoutThreshold;
    }
    if (powerSellerEarlyRelease && typeof powerSellerEarlyRelease === 'object') {
      config.powerSellerEarlyRelease = {
        ...config.powerSellerEarlyRelease,
        ...powerSellerEarlyRelease,
      };
    }
    if (Array.isArray(payoutSchedules)) {
      config.payoutSchedules = payoutSchedules;
    }
    if (typeof autoReleaseEnabled === 'boolean') {
      config.autoReleaseEnabled = autoReleaseEnabled;
    }
    if (typeof disputeFreezeWindowDays === 'number' && disputeFreezeWindowDays > 0) {
      config.disputeFreezeWindowDays = disputeFreezeWindowDays;
    }
    if (typeof notes === 'string') {
      config.notes = notes;
    }

    await config.save();

    await AuditLog.create({
      action: 'UPDATE_ESCROW_CONFIG',
      module: 'FINANCE',
      performedBy: req.user._id,
      userName: req.user.name || 'Super Admin',
      userEmail: req.user.email || 'admin@auramarket.com',
      userRole: req.user.role || 'superadmin',
      targetType: 'EscrowConfig',
      description: `Updated platform escrow configuration: Hold period ${config.defaultHoldDays} days, Min payout ₹${config.minimumPayoutThreshold}.`,
      severity: 'HIGH',
      status: 'SUCCESS',
      previousValue: previousConfig,
      newValue: config.toObject(),
    });

    res.status(200).json({
      success: true,
      message: 'Escrow configuration updated successfully.',
      data: config,
    });
  } catch (error) {
    next(error);
  }
};
