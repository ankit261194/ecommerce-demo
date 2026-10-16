const PayoutSplit = require('../models/PayoutSplit');
const SubOrder = require('../models/SubOrder');
const VendorProfile = require('../models/VendorProfile');
const Order = require('../models/Order');
const smsService = require('./smsService');

/**
 * Execute Automated Instant Vendor Payout Split upon SubOrder delivery verification
 * Point #22: Killer & Unique Weapon
 *
 * @param {string|ObjectId} subOrderId - The ID of the delivered SubOrder
 * @param {Object} options - Additional metadata / notes
 * @returns {Promise<Object>} Execution result with payout split breakdown
 */
exports.executeVendorPayoutSplit = async (subOrderId, options = {}) => {
  try {
    const subOrder = await SubOrder.findById(subOrderId).populate('vendor');
    if (!subOrder) {
      return {
        success: false,
        message: `SubOrder ${subOrderId} not found`,
      };
    }

    // 1. Idempotency Check: Avoid double-splitting or double-crediting
    const existingSplit = await PayoutSplit.findOne({ subOrder: subOrder._id });
    if (existingSplit) {
      return {
        success: true,
        alreadySettled: true,
        message: 'Payout split already settled for this suborder',
        payoutSplit: existingSplit,
      };
    }

    // 2. Identify Vendor Profile
    let vendor = subOrder.vendor;
    if (!vendor || !vendor._id) {
      vendor = await VendorProfile.findOne({
        $or: [{ _id: subOrder.vendor }, { user: subOrder.vendor }],
      });
    }

    if (!vendor) {
      return {
        success: false,
        message: `Vendor profile not found for suborder ${subOrderId}`,
      };
    }

    // 3. Determine dynamic commission rate
    let commissionRate = 10;
    if (typeof subOrder.platformCommissionRate === 'number' && subOrder.platformCommissionRate >= 0) {
      commissionRate = subOrder.platformCommissionRate;
    } else if (typeof vendor.commissionRate === 'number' && vendor.commissionRate >= 0) {
      commissionRate = vendor.commissionRate;
    }

    // 4. Calculate Gross, Admin Commission, and Net Vendor Credited Amount
    const grossAmount = Number(subOrder.subTotal || 0);
    const adminCommission = Math.round((grossAmount * (commissionRate / 100)) * 100) / 100;
    const vendorNetPayout = Math.round((grossAmount - adminCommission) * 100) / 100;

    // 5. Atomic Vendor Wallet Credit
    const updatedVendor = await VendorProfile.findByIdAndUpdate(
      vendor._id,
      {
        $inc: {
          walletBalance: vendorNetPayout,
          totalEarnings: vendorNetPayout,
          totalSales: grossAmount,
        },
      },
      { new: true }
    );

    // 6. Record Immutable Payout Split Transaction
    const orderNumber =
      subOrder.subOrderId ||
      `ORD-${subOrder._id.toString().slice(-6).toUpperCase()}`;

    const payoutSplit = await PayoutSplit.create({
      subOrder: subOrder._id,
      parentOrder: subOrder.parentOrder,
      vendor: vendor._id,
      orderNumber,
      grossAmount,
      commissionRate,
      adminCommission,
      vendorNetPayout,
      status: 'SETTLED',
      settledAt: new Date(),
      settlementMethod: options.settlementMethod || 'INSTANT_WALLET_ESCROW_RELEASE',
      notes:
        options.notes ||
        `Automated instant payout split upon delivery OTP verification for Order #${orderNumber}.`,
    });

    // 7. Dispatch Vendor SMS Notification
    const recipientPhone = vendor.supportPhone || vendor.pickupAddress?.phone;
    if (recipientPhone) {
      try {
        await smsService.sendSMS({
          to: recipientPhone,
          message: `AuraMarket: Order #${orderNumber} delivered! ₹${vendorNetPayout.toLocaleString(
            'en-IN'
          )} has been automatically credited to your wallet (Admin Commission: ₹${adminCommission}).`,
        });
      } catch (smsErr) {
        console.warn('Vendor SMS notification skipped:', smsErr.message);
      }
    }

    return {
      success: true,
      alreadySettled: false,
      message: `Instant payout split completed! ₹${vendorNetPayout} credited to ${vendor.storeName}.`,
      payoutSplit,
      updatedBalance: updatedVendor?.walletBalance || 0,
    };
  } catch (error) {
    console.error('Error executing instant vendor payout split:', error);
    throw error;
  }
};
