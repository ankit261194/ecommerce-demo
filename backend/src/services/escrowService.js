const SubOrder = require('../models/SubOrder');
const VendorProfile = require('../models/VendorProfile');
const WalletTransaction = require('../models/WalletTransaction');
const Ledger = require('../models/Ledger');
const AuditLog = require('../models/AuditLog');
const EscrowConfig = require('../models/EscrowConfig');
const User = require('../models/User');

/**
 * Get or initialize system-wide escrow configuration
 */
exports.getOrCreateEscrowConfig = async () => {
  let config = await EscrowConfig.findOne();
  if (!config) {
    config = await EscrowConfig.create({
      defaultHoldDays: 7,
      minimumPayoutThreshold: 500,
      powerSellerEarlyRelease: {
        enabled: true,
        minVendorRating: 4.8,
        minCompletedOrders: 50,
        reducedHoldDays: 2,
        maxReturnRatePercent: 2.0,
      },
      payoutSchedules: ['DAILY', 'WEEKLY_MONDAY', 'BIWEEKLY', 'MONTHLY_FIRST'],
      autoReleaseEnabled: true,
      autoReleaseScheduleCron: '0 2 * * *',
      disputeFreezeWindowDays: 14,
    });
  }
  return config;
};

/**
 * Hook invoked when a SubOrder is successfully delivered to customer.
 * Initializes return-window escrow hold and computes release due date.
 *
 * @param {string|ObjectId} subOrderId
 * @param {Date} [deliveredAt=new Date()]
 * @returns {Promise<Object>}
 */
exports.onSubOrderDelivered = async (subOrderId, deliveredAt = new Date()) => {
  try {
    const subOrder = await SubOrder.findById(subOrderId);
    if (!subOrder) {
      return { success: false, message: `SubOrder ${subOrderId} not found` };
    }

    if (subOrder.status === 'cancelled') {
      return { success: false, message: 'Cannot initialize escrow hold for a cancelled sub-order.' };
    }

    // Guard against terminal or frozen states (webhook retries / duplicate callbacks)
    if (['RELEASED_TO_WALLET', 'REFUNDED_TO_CUSTOMER', 'DISPUTED_HOLD'].includes(subOrder.escrowDetails?.escrowStatus)) {
      return {
        success: true,
        alreadyProcessed: true,
        escrowStatus: subOrder.escrowDetails.escrowStatus,
        subOrder,
      };
    }

    const config = await exports.getOrCreateEscrowConfig();
    let vendor = await VendorProfile.findById(subOrder.vendor);
    if (!vendor) {
      vendor = await VendorProfile.findOne({ user: subOrder.vendor });
    }

    // Determine effective hold period (days)
    let holdDays = config.defaultHoldDays || 7;
    if (vendor) {
      if (typeof vendor.customHoldDays === 'number' && vendor.customHoldDays >= 0) {
        holdDays = vendor.customHoldDays;
      }
      // Check Power-Seller Early Release Qualification
      if (
        config.powerSellerEarlyRelease?.enabled &&
        (vendor.earlyReleaseEligible ||
          (vendor.rating >= (config.powerSellerEarlyRelease.minVendorRating || 4.8) &&
            (vendor.totalSales || 0) > 0))
      ) {
        holdDays = Math.min(holdDays, config.powerSellerEarlyRelease.reducedHoldDays || 2);
      }
    }

    const deliveryDate = deliveredAt instanceof Date ? deliveredAt : new Date(deliveredAt);
    const releaseDueDate = new Date(deliveryDate.getTime() + holdDays * 24 * 60 * 60 * 1000);
    const escrowAmount = Number(subOrder.vendorEarning || 0);
    const platformCommissionHeld = Number(subOrder.platformCommissionAmount || 0);

    // Initialize or update escrowDetails
    if (!subOrder.escrowDetails) {
      subOrder.escrowDetails = {};
    }

    const wasAlreadyHeld = subOrder.escrowDetails.isEscrowAccounted === true;

    subOrder.escrowDetails.escrowStatus = 'HOLD_IN_RETURN_WINDOW';
    subOrder.escrowDetails.escrowHoldDays = holdDays;
    subOrder.escrowDetails.deliveredAt = deliveryDate;
    subOrder.escrowDetails.escrowReleaseDueDate = releaseDueDate;
    subOrder.escrowDetails.escrowAmount = escrowAmount;
    subOrder.escrowDetails.platformCommissionHeld = platformCommissionHeld;
    subOrder.escrowDetails.isEscrowAccounted = true;
    subOrder.deliveredAt = deliveryDate;

    await subOrder.save();

    // Increment vendor's escrowBalance if not already accounted for
    if (vendor && !wasAlreadyHeld && escrowAmount > 0) {
      vendor.escrowBalance = (vendor.escrowBalance || 0) + escrowAmount;
      await vendor.save();
    }

    return {
      success: true,
      subOrder,
      holdDays,
      escrowReleaseDueDate: releaseDueDate,
      escrowAmount,
    };
  } catch (error) {
    console.error('Error in onSubOrderDelivered escrow trigger:', error);
    throw error;
  }
};

/**
 * Safely releases a single matured SubOrder's escrow funds to vendor wallet
 * Idempotent, generates WalletTransaction, Ledger, and AuditLog
 *
 * @param {Object} subOrder - SubOrder document (or ID)
 * @param {Object} vendor - VendorProfile document
 * @param {Object} userRef - Performer User document
 * @param {string} [releaseChannel='MANUAL_VENDOR'] - 'MANUAL_VENDOR' | 'ADMIN_BATCH' | 'CRON_AUTO'
 * @returns {Promise<Object>}
 */
exports.executeSubOrderEscrowRelease = async (subOrder, vendor, userRef, releaseChannel = 'MANUAL_VENDOR') => {
  // Idempotency check: Already released?
  if (subOrder.escrowDetails?.escrowStatus === 'RELEASED_TO_WALLET') {
    return {
      success: true,
      alreadyReleased: true,
      message: 'Escrow funds already released to vendor wallet.',
      amount: subOrder.escrowDetails.escrowAmount,
    };
  }

  // Active dispute check
  if (subOrder.escrowDetails?.isDisputed || subOrder.escrowDetails?.escrowStatus === 'DISPUTED_HOLD') {
    throw new Error('Cannot release escrow funds: SubOrder is currently frozen under active dispute.');
  }

  // Maturity check: Hold period active?
  const now = new Date();
  const dueDate = subOrder.escrowDetails?.escrowReleaseDueDate
    ? new Date(subOrder.escrowDetails.escrowReleaseDueDate)
    : null;

  if (dueDate && now < dueDate) {
    throw new Error(`Hold period active. Escrow funds will mature on ${dueDate.toISOString()}.`);
  }

  const releaseAmount = Number(subOrder.escrowDetails?.escrowAmount || subOrder.vendorEarning || 0);

  // Mark SubOrder escrow status
  if (!subOrder.escrowDetails) {
    subOrder.escrowDetails = {};
  }
  subOrder.escrowDetails.escrowStatus = 'RELEASED_TO_WALLET';
  subOrder.escrowDetails.escrowReleasedAt = now;
  await subOrder.save();

  // Atomically update vendor balances
  vendor.walletBalance = (vendor.walletBalance || 0) + releaseAmount;
  vendor.escrowBalance = Math.max(0, (vendor.escrowBalance || 0) - releaseAmount);
  await vendor.save();

  // 1. Create WalletTransaction & sync vendor user wallet
  const vendorUserId = vendor.user?._id || vendor.user;
  let walletTx = null;
  if (vendorUserId) {
    try {
      await User.findByIdAndUpdate(vendorUserId, {
        $inc: { walletBalance: releaseAmount },
      });
    } catch (e) {
      // User update best effort
    }

    walletTx = await WalletTransaction.create({
      user: vendorUserId,
      type: 'CREDIT',
      currency: 'INR',
      amount: releaseAmount,
      category: 'ESCROW_RELEASE',
      paymentMethod: 'SYSTEM',
      transactionReference: `ESCROW-REL-${subOrder._id.toString().slice(-8).toUpperCase()}`,
      title: `Escrow Released: SubOrder #${subOrder._id.toString().slice(-6)}`,
      description: `Matured return-window escrow payout released to vendor wallet (${releaseChannel})`,
      order: subOrder.parentOrder,
      balanceAfter: vendor.walletBalance,
      status: 'SUCCESS',
    });
  }

  // 2. Create Ledger entry
  const ledgerEntry = await Ledger.create({
    vendor: vendor._id,
    subOrder: subOrder._id,
    type: 'ESCROW_RELEASE',
    amount: releaseAmount,
    description: `Matured escrow release credited to wallet for SubOrder #${subOrder._id.toString().slice(-6)}`,
    balanceAfter: vendor.walletBalance,
    status: 'COMPLETED',
  });

  // 3. Create AuditLog entry
  const auditLog = await AuditLog.create({
    action: 'RELEASE_ESCROW_PAYOUT',
    module: 'FINANCE',
    performedBy: userRef?._id || null,
    userName: userRef?.name || vendor.storeName || 'System Automated Engine',
    userEmail: userRef?.email || 'finance@auramarket.com',
    userRole: userRef?.role || 'system',
    targetId: subOrder._id.toString(),
    targetType: 'SubOrder',
    description: `Released matured escrow amount of ₹${releaseAmount} to vendor wallet for SubOrder #${subOrder._id} (${releaseChannel}).`,
    severity: 'LOW',
    status: 'SUCCESS',
    details: {
      subOrderId: subOrder._id,
      vendorId: vendor._id,
      storeName: vendor.storeName,
      releaseAmount,
      walletBalanceAfter: vendor.walletBalance,
      escrowBalanceAfter: vendor.escrowBalance,
      releaseChannel,
    },
  });

  return {
    success: true,
    alreadyReleased: false,
    amount: releaseAmount,
    walletBalance: vendor.walletBalance,
    escrowBalance: vendor.escrowBalance,
    walletTx,
    ledgerEntry,
    auditLog,
  };
};
