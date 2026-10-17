const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Product = require('../models/Product');
const VendorProfile = require('../models/VendorProfile');
const Order = require('../models/Order');
const SubOrder = require('../models/SubOrder');
const DeliveryTask = require('../models/DeliveryTask');
const Ledger = require('../models/Ledger');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const GiftWrapConfig = require('../models/GiftWrapConfig');
const smsService = require('../services/smsService');
const mailService = require('../services/mailService');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret_auramarket_jwt_2026', {
    expiresIn: '30d',
  });

// @desc    Checkout and Create Multi-Vendor Split Orders
// @route   POST /api/orders
exports.createOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, paymentMethod, couponCode, deliveryInstructions, paymentDetails, giftWrap, tipAmount: rawTipAmount } = req.body;
    const tipAmount = Math.max(0, Number(rawTipAmount !== undefined ? rawTipAmount : (req.body.tip || 0)));

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items are required to place an order' });
    }

    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.pincode) {
      return res.status(400).json({ success: false, message: 'Complete shipping address is required' });
    }

    // Point 4: Guest Checkout with Instant Background Account Creation & SMS credentials
    let accountCreated = false;
    let tempPassword = '';
    const rawPhone = shippingAddress.phone || req.body.guestInfo?.phone;

    if (!req.user) {
      if (!rawPhone) {
        return res.status(400).json({ success: false, message: 'Valid mobile number is required for checkout' });
      }
      const cleanPhone = String(rawPhone).replace(/\D/g, '').slice(-10);
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid 10-digit Indian mobile number for order notifications and account credentials',
        });
      }

      const recipientName = (shippingAddress.recipientName || req.body.guestInfo?.name || `Shopper ${cleanPhone.slice(-4)}`).trim();
      const cleanEmail = (shippingAddress.email || req.body.guestInfo?.email || `${cleanPhone}@guest.auramarket.com`).toLowerCase().trim();

      let guestUser = await User.findOne({
        $or: [{ phone: cleanPhone }, { email: cleanEmail }],
      });

      if (!guestUser) {
        tempPassword = `Aura#${Math.floor(1000 + Math.random() * 9000)}!`;
        guestUser = await User.create({
          name: recipientName,
          phone: cleanPhone,
          email: cleanEmail,
          password: tempPassword,
          authProvider: 'GUEST_CHECKOUT',
          isGuestCreated: true,
          isVerified: true,
          role: 'customer',
          walletBalance: 250,
          walletCoins: 500,
          addresses: [
            {
              recipientName,
              phone: cleanPhone,
              street: shippingAddress.street,
              landmark: shippingAddress.landmark || '',
              city: shippingAddress.city,
              state: shippingAddress.state || 'Delhi',
              pincode: shippingAddress.pincode,
              type: 'HOME',
              isDefault: true,
            },
          ],
        });
        accountCreated = true;
      }
      req.user = guestUser;
    }

    // Step 1: Validate all items exist and have sufficient stock before decrementing
    let validatedItems = [];
    let totalOrderAmount = 0;
    const vendorItemsMap = {}; // Group items by vendorId for sub-order splitting
    const productsToDecrement = [];

    for (const item of items) {
      const rawProductId = item.productId || item.product;
      if (!rawProductId) {
        return res.status(400).json({ success: false, message: 'Product ID is required for each cart item' });
      }
      const qty = Number(item.quantity);
      if (!qty || qty < 1) {
        return res.status(400).json({ success: false, message: 'Valid positive quantity is required' });
      }

      const product = await Product.findById(rawProductId).populate('vendor').populate('category');
      if (!product || !product.isPublished) {
        return res.status(404).json({ success: false, message: `Product '${item.title || rawProductId}' is no longer available` });
      }

      // Point 59: Vacation Mode Protection
      if (product.vendor && product.vendor.vacationMode?.isVacation && product.vendor.vacationMode?.disableOrdering) {
        const vendorMsg = product.vendor.vacationMode.noticeMessage || 'This store is temporarily on vacation.';
        return res.status(400).json({
          success: false,
          message: `Cannot order '${product.title}'. Merchant '${product.vendor.storeName}' is currently on vacation: ${vendorMsg}`,
        });
      }

      let variantMatch = null;
      let itemPrice = product.sellingPrice;
      let variantName = item.variantName || 'Standard';

      if (product.hasVariants && product.variants?.length > 0) {
        if (item.variantSku) {
          variantMatch = product.variants.find(v => v.sku === item.variantSku);
        }
        if (!variantMatch) {
          variantMatch = product.variants[0];
        }

        if (variantMatch) {
          if (variantMatch.stock < qty) {
            return res.status(400).json({
              success: false,
              message: `Insufficient stock for variant '${variantMatch.name}' of '${product.title}'. Only ${variantMatch.stock} units remaining.`,
            });
          }
          itemPrice = product.sellingPrice + (variantMatch.additionalPrice || 0);
          variantName = variantMatch.name;
        }
      }

      // Check general stock
      if (product.stock < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for '${product.title}'. Only ${product.stock} units remaining.`,
        });
      }

      const itemTotalPrice = itemPrice * qty;
      totalOrderAmount += itemTotalPrice;

      productsToDecrement.push({
        product,
        variantSku: variantMatch ? variantMatch.sku : null,
        quantity: qty,
      });

      const validatedItem = {
        product: product._id,
        vendor: product.vendor._id,
        title: product.title,
        image: product.images[0] || '',
        categorySlug: product.category?.slug || 'all',
        variantSku: variantMatch ? variantMatch.sku : (item.variantSku || product.sku),
        variantName: variantName,
        hsnCode: product.hsnCode || '85183000',
        quantity: qty,
        price: itemPrice,
        totalPrice: itemTotalPrice,
      };

      validatedItems.push(validatedItem);

      // Group by vendor
      const vendorIdStr = product.vendor._id.toString();
      if (!vendorItemsMap[vendorIdStr]) {
        vendorItemsMap[vendorIdStr] = {
          vendor: product.vendor,
          items: [],
          subTotal: 0,
        };
      }
      vendorItemsMap[vendorIdStr].items.push(validatedItem);
      vendorItemsMap[vendorIdStr].subTotal += itemTotalPrice;
    }

    // Step 1b: Execute atomic stock decrements with rollback protection
    const decrementedList = [];
    for (const entry of productsToDecrement) {
      let updated;
      if (entry.variantSku && entry.product.hasVariants) {
        updated = await Product.findOneAndUpdate(
          {
            _id: entry.product._id,
            stock: { $gte: entry.quantity },
            variants: {
              $elemMatch: {
                sku: entry.variantSku,
                stock: { $gte: entry.quantity },
              },
            },
            isPublished: true,
          },
          {
            $inc: {
              stock: -entry.quantity,
              'variants.$.stock': -entry.quantity,
            },
          },
          { new: true }
        );
      } else {
        updated = await Product.findOneAndUpdate(
          { _id: entry.product._id, stock: { $gte: entry.quantity }, isPublished: true },
          { $inc: { stock: -entry.quantity } },
          { new: true }
        );
      }

      if (!updated) {
        // Rollback already decremented products to avoid stock leak
        for (const prev of decrementedList) {
          if (prev.variantSku) {
            await Product.findOneAndUpdate(
              { _id: prev.productId, variants: { $elemMatch: { sku: prev.variantSku } } },
              { $inc: { stock: prev.quantity, 'variants.$.stock': prev.quantity } }
            );
          } else {
            await Product.findByIdAndUpdate(prev.productId, { $inc: { stock: prev.quantity } });
          }
        }
        return res.status(400).json({
          success: false,
          message: `Stock ran out for '${entry.product.title}' due to concurrent orders. Please try again.`,
        });
      }

      decrementedList.push({
        productId: entry.product._id,
        variantSku: entry.variantSku,
        quantity: entry.quantity,
      });
    }

    // Step 2: Point #22 Real Promo Code / Coupon Engine validation & calculation
    let appliedCoupon = null;
    let couponDiscountAmount = 0;

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const Coupon = require('../models/Coupon');
      const cleanCode = couponCode.trim().toUpperCase();
      const couponDoc = await Coupon.findOne({ code: cleanCode, isActive: true });

      if (couponDoc) {
        const notExpired = !couponDoc.expiryDate || new Date(couponDoc.expiryDate) >= new Date();
        const limitNotReached = !couponDoc.usageLimit || couponDoc.usedCount < couponDoc.usageLimit;
        const minOrderMet = !couponDoc.minOrderAmount || totalOrderAmount >= couponDoc.minOrderAmount;

        if (notExpired && limitNotReached && minOrderMet) {
          if (couponDoc.discountType === 'PERCENTAGE') {
            couponDiscountAmount = Math.round((totalOrderAmount * couponDoc.discountValue) / 100);
            if (couponDoc.maxDiscountAmount && couponDoc.maxDiscountAmount > 0) {
              couponDiscountAmount = Math.min(couponDiscountAmount, couponDoc.maxDiscountAmount);
            }
          } else {
            couponDiscountAmount = Math.min(couponDoc.discountValue, totalOrderAmount);
          }

          appliedCoupon = {
            code: couponDoc.code,
            title: couponDoc.title,
            discountAmount: couponDiscountAmount,
            discountType: couponDoc.discountType,
          };

          // Increment usage count atomically
          await Coupon.findByIdAndUpdate(couponDoc._id, { $inc: { usedCount: 1 } });
        }
      }
    }

    // Point #48: Dynamic Tax (GST/VAT) & Shipping Charges Engine
    const UIConfig = require('../models/UIConfig');
    let uiConfigDoc = null;
    try {
      uiConfigDoc = await UIConfig.findOne();
    } catch (e) {}

    // Point 27: VIP Customer Loyalty Tier Perks Check
    let customerUser = await User.findById(req.user._id);
    const LoyaltyTierConfig = require('../models/LoyaltyTierConfig');
    let loyaltyConfigDoc = null;
    let customerTierDef = null;
    try {
      loyaltyConfigDoc = await LoyaltyTierConfig.getOrCreateConfig();
      if (customerUser && loyaltyConfigDoc?.tiers) {
        const userTier = customerUser.loyalty?.tier || 'BRONZE';
        customerTierDef = loyaltyConfigDoc.tiers.find((t) => t.tier === userTier && t.isActive !== false);
      }
    } catch (_) {}

    const isVipFreeShipping = Boolean(customerTierDef?.freeShippingAlways);

    const freeThreshold = uiConfigDoc?.shipping?.freeShippingThreshold ?? 999;
    const defaultFee = uiConfigDoc?.shipping?.defaultShippingFee ?? 99;
    const expressFee = uiConfigDoc?.shipping?.expressShippingFee ?? 149;
    const codHandlingFee = paymentMethod === 'COD' ? (uiConfigDoc?.shipping?.codFee ?? 0) : 0;

    let baseShippingFee = 0;
    if (req.body.shippingMethod === 'EXPRESS') {
      baseShippingFee = expressFee;
    } else if (isVipFreeShipping || totalOrderAmount >= freeThreshold) {
      baseShippingFee = 0;
    } else {
      baseShippingFee = defaultFee;
    }
    const shippingFee = req.body.shippingMethod === 'EXPRESS'
      ? (expressFee + codHandlingFee)
      : (isVipFreeShipping ? 0 : (baseShippingFee + codHandlingFee));

    // VIP Permanent Tier Discount Check
    let tierDiscountAmount = 0;
    if (req.body.applyTierDiscount || req.body.useVipDiscount) {
      const tierDiscountPct = Math.max(
        customerTierDef?.discountPercentage || 0,
        customerUser?.loyalty?.customDiscountPercentage || 0
      );
      if (tierDiscountPct > 0) {
        tierDiscountAmount = Math.round((totalOrderAmount * tierDiscountPct) / 100);
      }
    }

    // Tax Engine: GST Calculation
    const taxSettings = uiConfigDoc?.taxSettings;
    const isTaxEnabled = taxSettings?.enabled !== false;
    const gstRate = isTaxEnabled ? (taxSettings?.defaultGSTRate ?? 18) : 0;
    const calculationMode = taxSettings?.calculationMode || 'INCLUSIVE';

    let taxAmount = 0;
    if (isTaxEnabled && gstRate > 0) {
      if (calculationMode === 'EXCLUSIVE') {
        taxAmount = Math.round((totalOrderAmount * gstRate) / 100);
      } else {
        taxAmount = Math.round(totalOrderAmount - totalOrderAmount / (1 + gstRate / 100));
      }
    }

    // Tax Split: Intra-state (CGST+SGST) vs Inter-state (IGST)
    const storeState = (taxSettings?.state || 'Delhi').toLowerCase();
    const destState = (shippingAddress?.state || '').toLowerCase();
    const isIntraState = storeState === destState;
    const taxDetails = {
      rate: gstRate,
      mode: calculationMode,
      cgst: isIntraState ? Math.round(taxAmount / 2) : 0,
      sgst: isIntraState ? Math.round(taxAmount / 2) : 0,
      igst: !isIntraState ? taxAmount : 0,
    };

    // Point #31: Customer In-App Wallet & Reward Coins Redemption
    const coinsToRedeem = Number(req.body.coinsToRedeem || req.body.walletCoinsUsed || 0);
    let coinDiscount = 0;

    if (coinsToRedeem > 0 && customerUser) {
      const availableCoins = customerUser.walletCoins || 0;
      if (coinsToRedeem > availableCoins) {
        return res.status(400).json({
          success: false,
          message: `Cannot redeem ${coinsToRedeem} coins. You only have ${availableCoins} reward coins available.`,
        });
      }
      // 1 Coin = ₹1 discount (cannot exceed net payable order total)
      const maxRedeemable = Math.max(0, totalOrderAmount - couponDiscountAmount - tierDiscountAmount + shippingFee);
      coinDiscount = Math.min(coinsToRedeem, maxRedeemable);
    }

    // Point #19: Gift Wrapping & Personalized Greeting Card calculation
    let giftWrapPrice = 0;
    const isGift = Boolean(giftWrap?.isGift);

    if (isGift) {
      let wrapConfigDoc = null;
      try {
        wrapConfigDoc = await GiftWrapConfig.findOne().lean();
      } catch (_) {}
      const freeGiftThreshold = wrapConfigDoc?.freeThreshold ?? 1999;
      const configuredBasePrice = wrapConfigDoc?.basePrice ?? 49;
      const requestedWrapPrice = Number(giftWrap?.wrapPrice ?? configuredBasePrice);
      // Free gift wrap if order subtotal >= free threshold
      giftWrapPrice = totalOrderAmount >= freeGiftThreshold ? 0 : requestedWrapPrice;
    }

    const netTaxAdd = calculationMode === 'EXCLUSIVE' ? taxAmount : 0;
    const finalTotalAmount = Math.max(
      0,
      totalOrderAmount + netTaxAdd + giftWrapPrice - couponDiscountAmount - tierDiscountAmount + shippingFee - coinDiscount + tipAmount
    );

    // Point #26 & Point 12: Resolve Payment Gateway, Split Payment Engine & Verification
    const validMethods = ['COD', 'RAZORPAY', 'STRIPE', 'UPI', 'WALLET', 'SPLIT_WALLET_ONLINE', 'PARTIAL_COD'];
    const activePaymentMethod = validMethods.includes(paymentMethod) ? paymentMethod : 'COD';

    let walletAmountDebited = 0;
    const WalletTransaction = require('../models/WalletTransaction');
    let walletTxnRecord = null;

    const splitPaymentData = {
      isSplit: false,
      walletAmount: 0,
      onlineAmount: 0,
      onlineMethod: null,
      onlinePaymentId: null,
      walletTransactionId: null,
      advancePayment: {
        isPartialCod: false,
        advanceAmount: 0,
        remainingCodDue: 0,
        advancePaidAt: null,
        advancePaymentId: null,
        advanceMethod: null,
      },
    };

    if (activePaymentMethod === 'WALLET' && customerUser) {
      if ((customerUser.walletBalance || 0) < finalTotalAmount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient in-app wallet balance. You have ₹${customerUser.walletBalance || 0}, but order total is ₹${finalTotalAmount}.`,
        });
      }
      walletAmountDebited = finalTotalAmount;
      customerUser.walletBalance = Math.max(0, (customerUser.walletBalance || 0) - walletAmountDebited);
    } else if (activePaymentMethod === 'SPLIT_WALLET_ONLINE' && customerUser) {
      const splitReq = req.body.splitPayment || {};
      const requestedWallet = Number(splitReq.walletAmount !== undefined ? splitReq.walletAmount : (req.body.walletAmount || 0));
      const requestedOnline = Number(splitReq.onlineAmount !== undefined ? splitReq.onlineAmount : (req.body.onlineAmount || 0));

      if (requestedWallet <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Wallet amount must be greater than ₹0 for split payment.',
        });
      }

      if ((customerUser.walletBalance || 0) < requestedWallet) {
        return res.status(400).json({
          success: false,
          message: `Insufficient wallet balance for split payment. Available: ₹${customerUser.walletBalance || 0}, requested: ₹${requestedWallet}.`,
        });
      }

      const effectiveOnline = requestedOnline > 0 ? requestedOnline : Math.max(0, finalTotalAmount - requestedWallet);
      const totalSplitPaid = requestedWallet + effectiveOnline;
      if (totalSplitPaid < finalTotalAmount) {
        return res.status(400).json({
          success: false,
          message: `Split payment total (₹${totalSplitPaid}) does not cover final order amount of ₹${finalTotalAmount}.`,
        });
      }

      walletAmountDebited = requestedWallet;
      customerUser.walletBalance = Math.max(0, (customerUser.walletBalance || 0) - walletAmountDebited);

      const splitOnlineMethod = splitReq.onlineMethod || req.body.onlineMethod || 'UPI';
      const splitOnlinePaymentId = splitReq.onlinePaymentId || req.body.onlinePaymentId || `ONLINE-SPLIT-${Date.now()}`;
      const splitWalletTxnId = `WTXN-SPLIT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      splitPaymentData.isSplit = true;
      splitPaymentData.walletAmount = requestedWallet;
      splitPaymentData.onlineAmount = effectiveOnline;
      splitPaymentData.onlineMethod = splitOnlineMethod;
      splitPaymentData.onlinePaymentId = splitOnlinePaymentId;
      splitPaymentData.walletTransactionId = splitWalletTxnId;

      walletTxnRecord = {
        user: customerUser._id,
        type: 'DEBIT',
        currency: 'INR',
        amount: requestedWallet,
        category: 'SPLIT_PAYMENT',
        paymentMethod: 'SYSTEM',
        transactionReference: splitWalletTxnId,
        title: 'Split Wallet Payment for Order',
        description: `Split payment: ₹${requestedWallet} from wallet + ₹${effectiveOnline} via ${splitOnlineMethod}`,
        balanceAfter: customerUser.walletBalance,
      };
    } else if (activePaymentMethod === 'PARTIAL_COD') {
      const advReq = req.body.splitPayment?.advancePayment || req.body.advancePayment || {};
      const requestedAdvance = Number(advReq.advanceAmount !== undefined ? advReq.advanceAmount : (req.body.advanceAmount || Math.min(200, finalTotalAmount)));
      const advanceMethod = advReq.advanceMethod || req.body.advanceMethod || 'UPI';

      if (requestedAdvance <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Advance payment amount must be greater than ₹0 for partial COD.',
        });
      }

      if (requestedAdvance >= finalTotalAmount) {
        return res.status(400).json({
          success: false,
          message: `Advance payment (₹${requestedAdvance}) cannot be greater than or equal to total order amount (₹${finalTotalAmount}). Use prepaid payment instead.`,
        });
      }

      let advanceTxnId = advReq.advancePaymentId || req.body.advancePaymentId || `ADV-COD-${Date.now()}`;

      if (advanceMethod === 'WALLET' && customerUser) {
        if ((customerUser.walletBalance || 0) < requestedAdvance) {
          return res.status(400).json({
            success: false,
            message: `Insufficient wallet balance to pay partial COD advance. Available: ₹${customerUser.walletBalance || 0}, required: ₹${requestedAdvance}.`,
          });
        }
        walletAmountDebited = requestedAdvance;
        customerUser.walletBalance = Math.max(0, (customerUser.walletBalance || 0) - requestedAdvance);
        advanceTxnId = `WTXN-ADV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

        walletTxnRecord = {
          user: customerUser._id,
          type: 'DEBIT',
          currency: 'INR',
          amount: requestedAdvance,
          category: 'PARTIAL_COD_ADVANCE',
          paymentMethod: 'SYSTEM',
          transactionReference: advanceTxnId,
          title: 'Partial COD Advance Payment',
          description: `Advance commitment ₹${requestedAdvance} paid from wallet for COD order`,
          balanceAfter: customerUser.walletBalance,
        };
      }

      const remainingCodDue = finalTotalAmount - requestedAdvance;
      splitPaymentData.advancePayment = {
        isPartialCod: true,
        advanceAmount: requestedAdvance,
        remainingCodDue,
        advancePaidAt: new Date(),
        advancePaymentId: advanceTxnId,
        advanceMethod,
      };
    }

    if (coinDiscount > 0 && customerUser) {
      customerUser.walletCoins = Math.max(0, (customerUser.walletCoins || 0) - coinDiscount);
    }

    // Point 27 & Point #31: Loyalty Tier Cashback Multiplier
    const cashbackMultiplier = customerTierDef?.cashbackMultiplier || 1.0;
    const baseCashback = Math.max(10, Math.round(finalTotalAmount * 0.05));
    const cashbackEarned = Math.max(10, Math.round(baseCashback * cashbackMultiplier));

    if (customerUser) {
      customerUser.walletCoins = (customerUser.walletCoins || 0) + cashbackEarned;

      // Update customer loyalty metrics
      if (!customerUser.loyalty) {
        customerUser.loyalty = {
          tier: 'BRONZE',
          pointsBalance: customerUser.walletCoins,
          lifetimeSpend: 0,
          lifetimeOrdersCount: 0,
        };
      }
      customerUser.loyalty.pointsBalance = customerUser.walletCoins;
      customerUser.loyalty.lifetimeSpend = (customerUser.loyalty.lifetimeSpend || 0) + finalTotalAmount;
      customerUser.loyalty.lifetimeOrdersCount = (customerUser.loyalty.lifetimeOrdersCount || 0) + 1;

      // Auto tier upgrade evaluation
      if (loyaltyConfigDoc?.autoPromoteEnabled !== false && !customerUser.loyalty.tierLock) {
        const { evaluateTier } = require('./loyaltyController');
        const eligibleTier = evaluateTier(
          loyaltyConfigDoc,
          customerUser.loyalty.lifetimeSpend,
          customerUser.loyalty.lifetimeOrdersCount
        );
        const tierRank = { BRONZE: 1, SILVER: 2, GOLD: 3, PLATINUM: 4, DIAMOND: 5 };
        const currentTier = customerUser.loyalty.tier || 'BRONZE';
        if (eligibleTier && (tierRank[eligibleTier] || 0) > (tierRank[currentTier] || 0)) {
          customerUser.loyalty.tier = eligibleTier;
          customerUser.loyalty.tierAchievedAt = new Date();

          // Log tier upgrade in LoyaltyActivityLog
          const LoyaltyActivityLog = require('../models/LoyaltyActivityLog');
          await LoyaltyActivityLog.create({
            user: customerUser._id,
            type: 'TIER_UPGRADE',
            points: 0,
            balanceAfter: customerUser.walletCoins,
            tier: eligibleTier,
            title: `🎉 VIP Tier Promoted: ${currentTier} ➔ ${eligibleTier}`,
            description: `Auto-promoted to ${eligibleTier} after reaching ₹${customerUser.loyalty.lifetimeSpend} lifetime spend.`,
            metadata: { previousTier: currentTier, newTier: eligibleTier },
          }).catch(() => {});
        }
      }

      await customerUser.save();
    }

    const isPrepaid = ['RAZORPAY', 'STRIPE', 'UPI', 'WALLET', 'SPLIT_WALLET_ONLINE'].includes(activePaymentMethod);
    let resolvedPaymentStatus = 'PENDING';
    if (isPrepaid) {
      resolvedPaymentStatus = 'PAID';
    } else if (activePaymentMethod === 'PARTIAL_COD') {
      resolvedPaymentStatus = 'PARTIALLY_PAID';
    }

    const resolvedPaymentId =
      paymentDetails?.transactionId ||
      paymentDetails?.upiUtr ||
      splitPaymentData.onlinePaymentId ||
      splitPaymentData.advancePayment?.advancePaymentId ||
      (isPrepaid ? `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}` : null);

    // Point #74: Fake / Spam Order Prevention (RTO Guard for high-risk COD)
    const { calculateRtoRisk } = require('../utils/rtoRiskScorer');
    let pastCustomerOrders = [];
    try {
      pastCustomerOrders = await Order.find({ customer: req.user._id }).select('status deliveryAttempts').lean();
    } catch (_) {}

    const rtoAssessment = calculateRtoRisk({
      customer: req.user,
      shippingAddress,
      totalAmount: finalTotalAmount,
      paymentMethod: activePaymentMethod,
      pastOrders: pastCustomerOrders,
    });

    let rtoOtp = null;
    let rtoOtpExpires = null;
    let rtoStatus = 'NONE';
    if (rtoAssessment.verificationRequired) {
      rtoOtp = Math.floor(100000 + Math.random() * 900000).toString();
      rtoOtpExpires = new Date(Date.now() + 30 * 60 * 1000);
      rtoStatus = 'PENDING';
    }

    // Point 26: Full-Fledged Affiliate & Influencer Tracking
    const rawAffiliateCode = req.body.affiliateCode || req.headers['x-affiliate-code'] || req.query.ref || null;
    let affiliateData = {
      partner: null,
      code: null,
      commissionRate: 0,
      commissionAmount: 0,
      status: 'NONE',
    };
    let affiliatePartnerDoc = null;

    if (rawAffiliateCode) {
      const cleanCode = String(rawAffiliateCode).trim().toUpperCase();
      try {
        const AffiliatePartner = require('../models/AffiliatePartner');
        affiliatePartnerDoc = await AffiliatePartner.findOne({
          affiliateCode: cleanCode,
          status: 'ACTIVE',
        });
        if (affiliatePartnerDoc) {
          const rate = affiliatePartnerDoc.commissionRate || 10;
          const commAmt =
            affiliatePartnerDoc.commissionType === 'FLAT'
              ? rate
              : Math.round(((totalOrderAmount * rate) / 100) * 100) / 100;

          affiliateData = {
            partner: affiliatePartnerDoc._id,
            code: cleanCode,
            commissionRate: rate,
            commissionAmount: commAmt,
            status: 'PENDING',
          };
        }
      } catch (err) {
        console.error('[Affiliate] Error resolving affiliate partner on checkout:', err.message);
      }
    }

    const masterOrder = await Order.create({
      customer: req.user._id,
      items: validatedItems,
      subtotal: totalOrderAmount,
      discountAmount: couponDiscountAmount + coinDiscount + tierDiscountAmount,
      coupon: appliedCoupon,
      walletCoinsUsed: coinDiscount,
      walletAmountDebited,
      cashbackEarned,
      loyalty: {
        tier: customerUser?.loyalty?.tier || 'BRONZE',
        tierDiscountAmount,
        freeShippingGranted: isVipFreeShipping,
        cashbackMultiplier,
        cashbackCoinsEarned: cashbackEarned,
      },
      totalAmount: finalTotalAmount,
      shippingFee,
      // Point 14: Customer Delivery Rider Tipping
      tipAmount,
      tipPaidToRider: false,
      tipCreditedAt: null,
      taxAmount,
      taxDetails,
      giftWrap: isGift
        ? {
            isGift: true,
            wrapId: giftWrap?.wrapId || 'wrap-gold',
            wrapName: giftWrap?.wrapName || 'Royal Gold & Satin Ribbon',
            wrapPrice: giftWrapPrice,
            cardTheme: giftWrap?.cardTheme || 'Best Wishes',
            recipientName: giftWrap?.recipientName || '',
            senderName: giftWrap?.senderName || '',
            message: giftWrap?.message || '',
            hideInvoicePrice: Boolean(giftWrap?.hideInvoicePrice),
          }
        : {
            isGift: false,
            wrapId: null,
            wrapName: '',
            wrapPrice: 0,
            cardTheme: '',
            recipientName: '',
            senderName: '',
            message: '',
            hideInvoicePrice: false,
          },
      shippingAddress,
      deliveryInstructions: deliveryInstructions || '',
      deliveryOtp: req.body.deliveryOtp || '4821',
      paymentMethod: activePaymentMethod,
      paymentStatus: resolvedPaymentStatus,
      paymentId: resolvedPaymentId,
      paymentDetails: {
        gateway: activePaymentMethod,
        transactionId: resolvedPaymentId,
        upiUtr: paymentDetails?.upiUtr || null,
        cardLast4: paymentDetails?.cardLast4 || null,
        paidAt: isPrepaid ? new Date() : null,
      },
      rtoRiskScore: rtoAssessment.score,
      rtoRiskLevel: rtoAssessment.level,
      rtoRiskReasons: rtoAssessment.reasons,
      rtoVerificationRequired: rtoAssessment.verificationRequired,
      rtoVerificationStatus: rtoStatus,
      rtoVerificationOtp: rtoOtp,
      rtoVerificationOtpExpires: rtoOtpExpires,
      flaggedForRtoRisk: rtoAssessment.isHighRisk,
      // Point 4: Guest Checkout Metadata
      isGuestOrder: Boolean(accountCreated || req.user.isGuestCreated || req.body.isGuestCheckout),
      guestCredentialsSent: Boolean(accountCreated),
      guestPhone: shippingAddress.phone || req.user.phone || '',
      guestEmail: shippingAddress.email || req.user.email || '',
      // Point 12: Split Payment & Partial COD Advance Details
      splitPayment: splitPaymentData,
      // Point 26: Affiliate Attribution
      affiliate: affiliateData,
      // Point 42: Dynamic Delivery Slot & 1-Hour Hyperlocal Dispatch
      deliverySlot: req.body.deliverySlot ? {
        slotKey: req.body.deliverySlot.slotKey || 'standard',
        title: req.body.deliverySlot.title || 'Standard Delivery',
        type: req.body.deliverySlot.type || (req.body.deliverySlot.isHyperlocal1Hour ? 'HYPERLOCAL_1HR' : 'STANDARD'),
        date: req.body.deliverySlot.date || new Date().toISOString().split('T')[0],
        startTime: req.body.deliverySlot.startTime || '',
        endTime: req.body.deliverySlot.endTime || '',
        fee: Number(req.body.deliverySlot.fee) || 0,
        isHyperlocal1Hour: Boolean(req.body.deliverySlot.isHyperlocal1Hour || req.body.deliverySlot.slotKey === 'hyperlocal_1hr'),
        targetDeliveryTime: req.body.deliverySlot.targetDeliveryTime || (req.body.deliverySlot.isHyperlocal1Hour ? new Date(Date.now() + 60 * 60 * 1000) : null),
        bookedAt: new Date(),
      } : {
        slotKey: 'standard',
        title: 'Standard Delivery',
        type: 'STANDARD',
        date: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        fee: 0,
        isHyperlocal1Hour: false,
        targetDeliveryTime: null,
        bookedAt: new Date(),
      },
    });

    if (affiliatePartnerDoc && affiliateData.partner) {
      try {
        const AffiliateReferral = require('../models/AffiliateReferral');
        await AffiliateReferral.create({
          affiliate: affiliatePartnerDoc._id,
          affiliateCode: affiliatePartnerDoc.affiliateCode,
          order: masterOrder._id,
          orderNumber: masterOrder.orderNumber,
          customer: req.user?._id || null,
          orderTotal: totalOrderAmount,
          commissionRate: affiliateData.commissionRate,
          commissionType: affiliatePartnerDoc.commissionType,
          commissionAmount: affiliateData.commissionAmount,
          status: 'PENDING',
          clickSource: req.body.affiliateSource || 'checkout_referral',
        });

        // Update partner aggregate stats
        affiliatePartnerDoc.stats.conversions = (affiliatePartnerDoc.stats.conversions || 0) + 1;
        affiliatePartnerDoc.stats.totalRevenue = (affiliatePartnerDoc.stats.totalRevenue || 0) + totalOrderAmount;
        affiliatePartnerDoc.stats.totalCommission =
          (affiliatePartnerDoc.stats.totalCommission || 0) + affiliateData.commissionAmount;
        affiliatePartnerDoc.stats.pendingBalance =
          (affiliatePartnerDoc.stats.pendingBalance || 0) + affiliateData.commissionAmount;

        // Auto tier upgrade check (promotions only, no downgrades)
        const AffiliateProgramSetting = require('../models/AffiliateProgramSetting');
        const settings = await AffiliateProgramSetting.getOrCreateSettings();
        if (settings && settings.tiers) {
          const tierRank = { STANDARD: 1, SILVER: 2, GOLD: 3, PLATINUM: 4, VIP_INFLUENCER: 5 };
          const sortedTiers = [...settings.tiers].sort((a, b) => b.minSales - a.minSales);
          const eligibleTier = sortedTiers.find((t) => affiliatePartnerDoc.stats.totalRevenue >= t.minSales);
          if (eligibleTier && (tierRank[eligibleTier.name] || 0) > (tierRank[affiliatePartnerDoc.tier] || 0)) {
            affiliatePartnerDoc.tier = eligibleTier.name;
          }
        }
        await affiliatePartnerDoc.save();
      } catch (err) {
        console.error('[Affiliate] Failed to log affiliate referral:', err.message);
      }
    }

    if (walletTxnRecord) {
      walletTxnRecord.order = masterOrder._id;
      walletTxnRecord.orderNumber = masterOrder.orderNumber;
      await WalletTransaction.create(walletTxnRecord).catch(err => console.error('Failed to create WalletTransaction record:', err));
    }

    if (rtoAssessment.verificationRequired && shippingAddress?.phone) {
      smsService
        .sendSMS({
          to: shippingAddress.phone,
          message: `AuraMarket RTO Guard: High-risk COD security verification code is ${rtoOtp}. Verify your order at checkout to confirm shipment.`,
        })
        .catch(() => {});
    }

    // Step 3: Create Sub-Orders per Vendor (Order Splitting)
    const createdSubOrders = [];
    let totalPlatformCommission = 0;

    // Pick an available delivery partner to assign (if any exists)
    let deliveryPartner = await User.findOne({ role: 'delivery', isActive: true });
    if (!deliveryPartner) {
      deliveryPartner = await User.findOne({ email: 'rider@auramarket.com' });
    }

    let isTipAssigned = false;
    for (const vendorIdStr in vendorItemsMap) {
      const vendorGroup = vendorItemsMap[vendorIdStr];
      const vendor = vendorGroup.vendor;
      const { calculateCommission } = require('../utils/commissionEngine');

      // Point 9: Category-Wise & Dynamic Commission Rules with Ledger Sync
      let calculatedCommissionTotal = 0;
      for (const itm of vendorGroup.items) {
        const commCalc = await calculateCommission({
          vendorId: vendor._id,
          categorySlug: itm.categorySlug || 'all',
          subTotal: itm.totalPrice,
          defaultVendorRate: vendor.commissionRate,
        });
        calculatedCommissionTotal += commCalc.amount;
      }

      const commissionAmount = calculatedCommissionTotal;
      const vendorEarning = Math.max(0, vendorGroup.subTotal - commissionAmount);
      const commissionRate = vendorGroup.subTotal > 0
        ? Number(((commissionAmount / vendorGroup.subTotal) * 100).toFixed(2))
        : (vendor.commissionRate || 10);

      totalPlatformCommission += commissionAmount;

      const subOrder = await SubOrder.create({
        parentOrder: masterOrder._id,
        vendor: vendor._id,
        customer: req.user._id,
        items: vendorGroup.items,
        subTotal: vendorGroup.subTotal,
        platformCommissionRate: commissionRate,
        platformCommissionAmount: commissionAmount,
        vendorEarning,
        shippingAddress,
        deliveryInstructions: deliveryInstructions || '',
        deliveryPartner: deliveryPartner ? deliveryPartner._id : null,
        trackingHistory: [
          {
            status: 'placed',
            timestamp: new Date(),
            note: 'Order successfully placed by customer',
          },
        ],
      });

      createdSubOrders.push(subOrder._id);

      // Update Vendor Balance & Stats
      vendor.walletBalance += vendorEarning;
      vendor.totalSales += vendorGroup.subTotal;
      vendor.totalEarnings += vendorEarning;
      await vendor.save();

      // Create Financial Ledger Entry for Vendor
      await Ledger.create({
        vendor: vendor._id,
        subOrder: subOrder._id,
        type: 'ORDER_CREDIT',
        amount: vendorEarning,
        description: `Credit for SubOrder #${subOrder._id.toString().slice(-6)} (SubTotal ₹${vendorGroup.subTotal} - Commission ₹${commissionAmount})`,
        balanceAfter: vendor.walletBalance,
        status: 'COMPLETED',
      });

      // Create Delivery Task for courier partner / dispatch fleet
      const allocatedTip = !isTipAssigned ? tipAmount : 0;
      isTipAssigned = true;

      let taskDispatchType = 'FORWARD_DELIVERY';
      if (masterOrder.deliverySlot?.isHyperlocal1Hour || masterOrder.deliverySlot?.type === 'HYPERLOCAL_1HR') {
        taskDispatchType = '1_HOUR_HYPERLOCAL';
      } else if (masterOrder.deliverySlot?.type === 'SCHEDULED_SLOT' || masterOrder.deliverySlot?.type === 'SAME_DAY') {
        taskDispatchType = 'SCHEDULED_SLOT';
      }

      const isDynamicScheduled = taskDispatchType === '1_HOUR_HYPERLOCAL' || taskDispatchType === 'SCHEDULED_SLOT';
      const assignedPartner = isDynamicScheduled ? null : deliveryPartner;

      await DeliveryTask.create({
        order: masterOrder._id,
        subOrder: subOrder._id,
        deliveryPartner: assignedPartner ? assignedPartner._id : null,
        deliveryInstructions: deliveryInstructions || '',
        tipAmount: allocatedTip,
        tipPaidOut: false,
        dispatchType: taskDispatchType,
        deliverySlot: masterOrder.deliverySlot,
        targetDeliveryTime: masterOrder.deliverySlot?.targetDeliveryTime || null,
        slaExpiresAt: masterOrder.deliverySlot?.targetDeliveryTime || null,
        dispatchStatus: assignedPartner ? 'ASSIGNED' : 'UNASSIGNED',
        autoAssigned: false,
        pickupLocation: {
          storeName: vendor.storeName,
          phone: vendor.pickupAddress?.phone || '9876543210',
          address: `${vendor.pickupAddress?.street || 'Shop 101'}, ${vendor.pickupAddress?.city || 'Delhi'}`,
          city: vendor.pickupAddress?.city || 'Delhi',
          pincode: vendor.pickupAddress?.pincode || '',
        },
        dropLocation: {
          recipientName: shippingAddress.recipientName,
          phone: shippingAddress.phone,
          address: `${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state}`,
          city: shippingAddress.city || '',
          pincode: shippingAddress.pincode,
          mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.pincode}`)}`,
        },
        isCod: activePaymentMethod === 'COD',
        amountToCollect: activePaymentMethod === 'COD' ? vendorGroup.subTotal : 0,
      });
    }

    // Step 4: Update Master Order with Sub-Order references and total commission
    masterOrder.subOrders = createdSubOrders;
    masterOrder.totalCommission = totalPlatformCommission;
    await masterOrder.save();

    // Create Platform Commission Ledger Entry
    await Ledger.create({
      type: 'COMMISSION_DEBIT',
      amount: totalPlatformCommission,
      description: `Platform Commission cut on Master Order #${masterOrder.orderNumber}`,
      balanceAfter: totalPlatformCommission,
      status: 'COMPLETED',
    });

    // Point #31 & Point 27: Record Wallet & Coin Transactions + Loyalty Activity Logs
    if (customerUser) {
      const LoyaltyActivityLog = require('../models/LoyaltyActivityLog');

      if (coinDiscount > 0) {
        await WalletTransaction.create({
          user: customerUser._id,
          type: 'DEBIT',
          currency: 'COINS',
          amount: coinDiscount,
          category: 'COIN_REDEMPTION',
          title: '🪙 Coins Redeemed at Checkout',
          description: `Applied ${coinDiscount} coins discount on Order #${masterOrder.orderNumber}`,
          order: masterOrder._id,
          orderNumber: masterOrder.orderNumber,
          balanceAfter: customerUser.walletBalance || 0,
          coinsAfter: customerUser.walletCoins || 0,
        });

        await LoyaltyActivityLog.create({
          user: customerUser._id,
          type: 'REDEEM_ORDER',
          points: -coinDiscount,
          balanceAfter: customerUser.walletCoins || 0,
          tier: customerUser.loyalty?.tier || 'BRONZE',
          order: masterOrder._id,
          orderNumber: masterOrder.orderNumber,
          title: '🪙 Coins Redeemed at Checkout',
          description: `Redeemed ${coinDiscount} coins for ₹${coinDiscount} discount on Order #${masterOrder.orderNumber}`,
        }).catch(() => {});
      }

      if (walletAmountDebited > 0) {
        await WalletTransaction.create({
          user: customerUser._id,
          type: 'DEBIT',
          currency: 'INR',
          amount: walletAmountDebited,
          category: 'WALLET_PAYMENT',
          title: '💵 In-App Wallet Payment',
          description: `Paid ₹${walletAmountDebited} for Order #${masterOrder.orderNumber}`,
          order: masterOrder._id,
          orderNumber: masterOrder.orderNumber,
          balanceAfter: customerUser.walletBalance || 0,
          coinsAfter: customerUser.walletCoins || 0,
        });
      }

      if (cashbackEarned > 0) {
        await WalletTransaction.create({
          user: customerUser._id,
          type: 'CREDIT',
          currency: 'COINS',
          amount: cashbackEarned,
          category: 'CASHBACK',
          title: `🎁 ${Math.round(5 * (cashbackMultiplier || 1))}% Cashback Reward Coins`,
          description: `Earned ${cashbackEarned} cashback coins on Order #${masterOrder.orderNumber} (${cashbackMultiplier || 1}x multiplier)`,
          order: masterOrder._id,
          orderNumber: masterOrder.orderNumber,
          balanceAfter: customerUser.walletBalance || 0,
          coinsAfter: customerUser.walletCoins || 0,
        });

        await LoyaltyActivityLog.create({
          user: customerUser._id,
          type: 'EARN_ORDER',
          points: cashbackEarned,
          balanceAfter: customerUser.walletCoins || 0,
          tier: customerUser.loyalty?.tier || 'BRONZE',
          order: masterOrder._id,
          orderNumber: masterOrder.orderNumber,
          title: `🛍️ Order Cashback (${customerUser.loyalty?.tier || 'BRONZE'} Tier)`,
          description: `Earned ${cashbackEarned} coins on Order #${masterOrder.orderNumber} with ${cashbackMultiplier}x multiplier`,
        }).catch(() => {});
      }
    }

    const populatedOrder = await Order.findById(masterOrder._id).populate({
      path: 'subOrders',
      populate: { path: 'vendor', select: 'storeName storeLogo pickupAddress' },
    });

    // Asynchronously dispatch Order Confirmation SMS & Email notifications
    const customerPhone = shippingAddress?.phone || req.user?.phone || '9876543210';
    const customerEmail = req.user?.email || 'customer@auramarket.com';

    smsService
      .sendOrderSMS({ order: populatedOrder, phone: customerPhone })
      .catch(err => console.log('[SMS Warning] Could not dispatch order SMS:', err.message));

    mailService
      .sendOrderEmail({ order: populatedOrder, email: customerEmail })
      .catch(err => console.log('[Email Warning] Could not dispatch order email:', err.message));

    // Point 2: In-App Order Confirmation Notification
    try {
      const Notification = require('../models/Notification');
      await Notification.create({
        recipient: req.user._id,
        role: 'customer',
        title: `🛍️ Order Placed #${populatedOrder.orderNumber}`,
        message: `Your order for ₹${populatedOrder.totalAmount} has been confirmed. Secret delivery OTP is ${populatedOrder.deliveryOtp}.`,
        type: 'ORDER_PLACED',
        orderId: populatedOrder._id,
        orderNumber: populatedOrder.orderNumber,
        actionUrl: '/orders',
      });
    } catch (notifErr) {
      console.warn('[Notification] Could not record in-app order notification:', notifErr.message);
    }

    // Point #77: Automatically mark customer's open abandoned carts as RECOVERED
    try {
      const AbandonedCart = require('../models/AbandonedCart');
      await AbandonedCart.updateMany(
        {
          $or: [
            { user: req.user._id },
            { customerEmail: customerEmail.toLowerCase() },
            ...(customerPhone ? [{ customerPhone }] : []),
          ],
          status: { $in: ['ABANDONED', 'REMINDER_SENT'] },
        },
        {
          $set: {
            status: 'RECOVERED',
            recoveredOrder: masterOrder._id,
          },
        }
      );
    } catch (abandonedErr) {
      console.warn('[AbandonedCart] Auto-recovery link warning:', abandonedErr.message);
    }

    // Point 4: Dispatch instant SMS credentials for background created guest accounts
    if (accountCreated && tempPassword) {
      const credSms = `Welcome to AuraMarket! Your Order #${populatedOrder.orderNumber} is confirmed. A customer account was created for you! Phone: +91${customerPhone}, Temp Password: ${tempPassword}. Track your delivery: https://shribalajikripadham.online/ecommerce-demo/#track/${populatedOrder.orderNumber}`;
      smsService
        .sendSMS({ to: customerPhone, message: credSms })
        .catch(err => console.log('[SMS Warning] Could not dispatch guest credentials SMS:', err.message));
    }

    const token = req.user ? generateToken(req.user._id) : null;

    res.status(201).json({
      success: true,
      message: accountCreated
        ? 'Guest order placed successfully! Shopper account created and login credentials dispatched via SMS.'
        : 'Order placed successfully! Sub-orders generated for vendors.',
      data: populatedOrder,
      accountCreated,
      guestCredentials: accountCreated
        ? {
            phone: customerPhone,
            tempPassword,
            smsDispatched: true,
          }
        : null,
      token,
      user: req.user
        ? {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            phone: req.user.phone,
            role: req.user.role,
            isGuestCreated: req.user.isGuestCreated,
            authProvider: req.user.authProvider,
            walletBalance: req.user.walletBalance,
            walletCoins: req.user.walletCoins,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
};

// Point 4: Guest Checkout with Instant Background Account Creation & SMS credentials
// @route   POST /api/orders/guest-checkout
exports.guestCheckout = exports.createOrder;

// @desc    Get Customer's Order History
// @route   GET /api/orders/my
exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate({
        path: 'subOrders',
        populate: { path: 'vendor', select: 'storeName storeLogo' },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Single Order Details
// @route   GET /api/orders/:id
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate({
        path: 'subOrders',
        populate: [
          { path: 'vendor', select: 'storeName storeLogo pickupAddress' },
          { path: 'deliveryPartner', select: 'name phone' },
        ],
      });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Allow only owner or admin to view
    if (order.customer._id.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel an order (Point #28: 1-Click Self-Cancel Order Before Dispatch)
// @route   POST /api/orders/:id/cancel
exports.cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('subOrders');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.customer.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this order' });
    }

    // Check if order was already cancelled or all sub-orders are delivered
    const allDelivered = order.subOrders.length > 0 && order.subOrders.every(sub => sub.status === 'delivered');
    if (allDelivered) {
      return res.status(400).json({ success: false, message: 'Cannot cancel an order that has already been delivered' });
    }

    const allCancelled = order.subOrders.length > 0 && order.subOrders.every(sub => sub.status === 'cancelled');
    if (allCancelled) {
      return res.status(400).json({ success: false, message: 'Order is already cancelled' });
    }

    // Point #28 Guardrail: Before-dispatch verification for customer self-cancellation
    if (req.user.role !== 'superadmin') {
      const isAlreadyDispatched = order.subOrders.some(sub =>
        ['dispatched', 'out_for_delivery', 'delivered'].includes(sub.status)
      );
      if (isAlreadyDispatched) {
        return res.status(400).json({
          success: false,
          message: 'Order cannot be self-cancelled after dispatch. The shipment is already in transit with courier partner. Please initiate a Return after delivery.',
        });
      }
    }

    const reason = req.body.reason || (req.user.role === 'superadmin' ? 'Cancelled by platform admin' : 'Cancelled by customer before dispatch');
    order.cancellationReason = reason;
    order.cancelledAt = new Date();

    for (const sub of order.subOrders) {
      if (sub.status !== 'delivered' && sub.status !== 'cancelled') {
        sub.status = 'cancelled';
        sub.cancellationReason = reason;
        sub.trackingHistory.push({
          status: 'cancelled',
          timestamp: new Date(),
          note: `Order cancelled: ${reason}`,
        });
        await sub.save();

        // 1. Restore stock for each item in the suborder (both product and variant stock)
        if (sub.items && sub.items.length > 0) {
          for (const item of sub.items) {
            if (item.variantSku) {
              const res = await Product.findOneAndUpdate(
                { _id: item.product, variants: { $elemMatch: { sku: item.variantSku } } },
                { $inc: { stock: item.quantity, 'variants.$.stock': item.quantity } }
              );
              if (!res) {
                await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
              }
            } else {
              await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
            }
          }
        }

        // 2. Reverse vendor wallet balance & sales stats
        const vendor = await VendorProfile.findById(sub.vendor);
        if (vendor) {
          vendor.walletBalance = Math.max(0, vendor.walletBalance - sub.vendorEarning);
          vendor.totalSales = Math.max(0, vendor.totalSales - sub.subTotal);
          vendor.totalEarnings = Math.max(0, vendor.totalEarnings - sub.vendorEarning);
          await vendor.save();

          // 3. Create Refund Ledger Entry
          await Ledger.create({
            vendor: vendor._id,
            subOrder: sub._id,
            type: 'REFUND',
            amount: sub.vendorEarning,
            description: `Refund/Reversal for cancelled SubOrder #${sub._id.toString().slice(-6)}: ${reason}`,
            balanceAfter: vendor.walletBalance,
            status: 'COMPLETED',
          });
        }

        // 4. Cancel delivery task so rider does not deliver a cancelled order
        await DeliveryTask.findOneAndUpdate(
          { subOrder: sub._id, status: { $ne: 'DELIVERED' } },
          { status: 'CANCELLED' }
        );
      }
    }

    // Update master order status and calculate instant wallet refund
    order.status = 'CANCELLED';

    let refundableAmount = 0;
    if (order.paymentStatus === 'PAID') {
      refundableAmount = order.totalAmount || 0;
    } else if (order.paymentMethod === 'WALLET') {
      refundableAmount = order.walletAmountDebited || order.totalAmount || 0;
    } else if (order.splitPayment?.isSplit) {
      refundableAmount = (order.splitPayment.walletAmount || 0) + (order.splitPayment.onlineAmount || 0);
    } else if (order.splitPayment?.advancePayment?.isPartialCod) {
      refundableAmount = order.splitPayment.advancePayment.advanceAmount || 0;
    } else if (order.walletAmountDebited > 0) {
      refundableAmount = order.walletAmountDebited;
    }

    let newWalletBalance = 0;
    let refundTx = null;

    if (refundableAmount > 0) {
      const customer = await User.findById(order.customer);
      if (customer) {
        customer.walletBalance = Math.round(((customer.walletBalance || 0) + refundableAmount) * 100) / 100;
        newWalletBalance = customer.walletBalance;
        await customer.save();

        refundTx = await WalletTransaction.create({
          user: customer._id,
          type: 'CREDIT',
          currency: 'INR',
          amount: refundableAmount,
          category: 'ORDER_REFUND',
          paymentMethod: 'WALLET',
          title: 'Instant Order Cancellation Refund',
          description: `Instant refund of ₹${refundableAmount} for cancelled order #${order.orderNumber}: ${reason}`,
          order: order._id,
          orderNumber: order.orderNumber,
          balanceAfter: newWalletBalance,
          status: 'SUCCESS',
        });

        order.instantWalletRefund = {
          isRefunded: true,
          refundAmount: refundableAmount,
          walletBalanceAfter: newWalletBalance,
          refundedAt: new Date(),
          transactionId: refundTx?._id ? refundTx._id.toString() : null,
        };

        if (customer.phone) {
          smsService
            .sendSMS(
              customer.phone,
              `AuraMarket: Order #${order.orderNumber} cancelled. Instant refund of ₹${refundableAmount} has been credited to your Aura Wallet! Balance: ₹${newWalletBalance}.`
            )
            .catch(() => {});
        }

        if (customer.email) {
          mailService
            .sendEmail({
              to: customer.email,
              subject: `Instant Refund Credited - Order #${order.orderNumber}`,
              text: `Hello ${customer.name || 'Customer'},\n\nYour order #${order.orderNumber} has been cancelled.\nAn instant refund of ₹${refundableAmount} has been credited to your Aura In-App Wallet.\nYour new balance is ₹${newWalletBalance}.\n\nThank you,\nAuraMarket Team`,
            })
            .catch(() => {});
        }
      }
      order.paymentStatus = 'REFUNDED';
    }

    await order.save();

    // Broadcast status change via Socket.io
    const socketService = require('../services/socketService');
    socketService.emitOrderStatus(order.orderNumber, {
      status: 'CANCELLED',
      cancellationReason: reason,
      instantRefund: order.instantWalletRefund,
    });

    res.status(200).json({
      success: true,
      message: refundableAmount > 0
        ? `Order cancelled successfully! Instant refund of ₹${refundableAmount} credited to your Aura Wallet.`
        : 'Order cancelled successfully! Stock restored to inventory and vendor ledgers adjusted.',
      data: order,
      refundSummary: {
        refundableAmount,
        walletBalanceAfter: newWalletBalance,
        creditedToWallet: refundableAmount > 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Order Cancellation & Instant Wallet Refund Preview
// @route   GET /api/orders/:id/cancel-preview
exports.getCancelPreview = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('subOrders');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.customer.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
    }

    const isAlreadyDispatched = order.subOrders.some(sub =>
      ['dispatched', 'out_for_delivery', 'delivered'].includes(sub.status)
    );

    let refundableAmount = 0;
    if (order.paymentStatus === 'PAID') {
      refundableAmount = order.totalAmount || 0;
    } else if (order.paymentMethod === 'WALLET') {
      refundableAmount = order.walletAmountDebited || order.totalAmount || 0;
    } else if (order.splitPayment?.isSplit) {
      refundableAmount = (order.splitPayment.walletAmount || 0) + (order.splitPayment.onlineAmount || 0);
    } else if (order.splitPayment?.advancePayment?.isPartialCod) {
      refundableAmount = order.splitPayment.advancePayment.advanceAmount || 0;
    } else if (order.walletAmountDebited > 0) {
      refundableAmount = order.walletAmountDebited;
    }

    res.status(200).json({
      success: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        canCancel: !isAlreadyDispatched && order.status !== 'CANCELLED' && order.status !== 'DELIVERED',
        isAlreadyDispatched,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        refundableAmount,
        refundDestination: refundableAmount > 0 ? 'Aura In-App Wallet (Instant Credit)' : 'None (Cash on Delivery without advance)',
        cancellationReasons: [
          'Ordered by mistake',
          'Found a better price elsewhere',
          'Need to change delivery address or phone',
          'Need different size / color / variant',
          'Delivery time is too long',
          'Other reason',
        ],
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Track Order Step-by-Step (Point #27 Live Visual Stepper)
// @route   GET /api/orders/track/:identifier
exports.trackOrder = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const mongoose = require('mongoose');
    let order = null;

    // 1. Try finding by MongoDB ObjectId or orderNumber
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      order = await Order.findById(identifier);
    }
    if (!order) {
      order = await Order.findOne({ orderNumber: identifier });
    }
    if (!order) {
      // 2. Try finding by SubOrder ID
      const sub = mongoose.Types.ObjectId.isValid(identifier)
        ? await SubOrder.findById(identifier)
        : null;
      if (sub) {
        order = await Order.findById(sub.parentOrder);
      }
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `No active order found with tracking reference '${identifier}'`,
      });
    }

    // Populate sub-orders with vendor and courier partner details
    await order.populate([
      { path: 'customer', select: 'name phone' },
      {
        path: 'subOrders',
        populate: [
          { path: 'vendor', select: 'storeName storeLogo pickupAddress phone' },
          { path: 'deliveryPartner', select: 'name phone' },
        ],
      },
    ]);

    // Standard 5-step lifecycle stages:
    // 1. placed (Ordered)
    // 2. packed (Packaging)
    // 3. dispatched (In Transit / Shipped)
    // 4. out_for_delivery (Out for Delivery)
    // 5. delivered (Delivered)
    const stageOrder = ['placed', 'packed', 'dispatched', 'out_for_delivery', 'delivered'];
    const stageLabels = {
      placed: { title: 'Order Confirmed', desc: 'Order received and verified by AuraMarket' },
      packed: { title: 'Packed & Barcoded', desc: 'Merchant prepared parcel with shipping slip' },
      dispatched: { title: 'Handed to Express Courier', desc: 'Parcel left fulfillment hub and is in transit' },
      out_for_delivery: { title: 'Out for Doorstep Delivery', desc: 'Courier rider is on the way to your destination' },
      delivered: { title: 'Delivered Successfully', desc: 'Handed over at doorstep with verified OTP' },
    };

    const subOrdersTracking = (order.subOrders || []).map(sub => {
      const currentStatus = sub.status || 'placed';
      const isCancelled = currentStatus === 'cancelled';
      const currentIndex = stageOrder.indexOf(currentStatus);

      const steps = stageOrder.map((stageKey, idx) => {
        const histItem = (sub.trackingHistory || []).find(h => h.status === stageKey);
        const isCompleted = !isCancelled && (currentIndex >= idx);
        const isCurrent = !isCancelled && (currentIndex === idx);

        return {
          stepIndex: idx + 1,
          key: stageKey,
          label: stageLabels[stageKey].title,
          description: histItem?.note || stageLabels[stageKey].desc,
          isCompleted,
          isCurrent,
          timestamp: histItem?.timestamp || (isCompleted ? sub.createdAt : null),
        };
      });

      return {
        subOrderId: sub._id ? `SUB-${sub._id.toString().slice(-4)}` : 'SUB-001',
        rawSubOrderId: sub._id,
        vendor: sub.vendor,
        items: sub.items,
        subTotal: sub.subTotal,
        status: currentStatus,
        isCancelled,
        deliveryOtp: sub.deliveryOtp || '4821',
        deliveryPartner: sub.deliveryPartner || { name: 'Vikram Singh', phone: '9876543210' },
        steps,
        deliveryInstructions: sub.deliveryInstructions || order.deliveryInstructions || '',
      };
    });

    const canSelfCancel = !['DELIVERED', 'CANCELLED'].includes(order.status) &&
      !order.subOrders.some(sub => ['dispatched', 'out_for_delivery', 'delivered'].includes(sub.status));

    res.status(200).json({
      success: true,
      data: {
        orderId: order.orderNumber || order._id,
        rawOrderId: order._id,
        createdAt: order.createdAt,
        totalAmount: order.totalAmount,
        status: order.status,
        shippingAddress: order.shippingAddress,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        paymentDetails: order.paymentDetails,
        splitPayment: order.splitPayment || null,
        deliveryInstructions: order.deliveryInstructions,
        canSelfCancel,
        cancellationReason: order.cancellationReason || null,
        cancelledAt: order.cancelledAt || null,
        instantWalletRefund: order.instantWalletRefund || null,
        proofOfDelivery: order.proofOfDelivery || { hasSignature: false },
        subOrders: subOrdersTracking,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Simulate/Advance Order Milestone for Demo/Testing
// @route   POST /api/orders/:id/advance-step
exports.simulateOrderStep = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { step } = req.body; // 'packed' | 'dispatched' | 'out_for_delivery' | 'delivered'
    const order = await Order.findById(id).populate('subOrders');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const nextStep = step || 'packed';
    for (const sub of order.subOrders) {
      sub.status = nextStep;
      sub.trackingHistory.push({
        status: nextStep,
        timestamp: new Date(),
        note: `Milestone advanced to ${nextStep}`,
      });
      await sub.save();
    }

    if (nextStep === 'delivered') {
      order.status = 'DELIVERED';
      order.paymentStatus = 'PAID';
    } else {
      order.status = 'IN_PROGRESS';
    }
    await order.save();

    res.status(200).json({ success: true, message: `Order milestone advanced to ${nextStep}` });
  } catch (error) {
    next(error);
  }
};

// Helper: Convert number to English currency words
function numberToWords(amount) {
  const num = Math.round(Number(amount) || 0);
  if (num === 0) return 'Zero Rupees Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  function inWords(n) {
    if (n < 20) return a[n];
    const digit = n % 10;
    return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : ' ');
  }
  
  let str = '';
  let n = num;
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = Math.floor(n / 100);
  const remaining = Math.floor(n % 100);
  
  if (crore) str += inWords(crore) + 'Crore ';
  if (lakh) str += inWords(lakh) + 'Lakh ';
  if (thousand) str += inWords(thousand) + 'Thousand ';
  if (hundred) str += inWords(hundred) + 'Hundred ';
  if (remaining) str += inWords(remaining);
  
  return 'Rupees ' + str.trim() + ' Only';
}

// @desc    1-Click Tax Invoice Download / Preview (Point #30)
// @route   GET /api/orders/:id/invoice
// @access  Public / Customer / Admin
exports.getTaxInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const mongoose = require('mongoose');
    let order = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await Order.findById(id);
    }
    if (!order) {
      order = await Order.findOne({ orderNumber: id });
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found for invoice generation' });
    }

    await order.populate([
      { path: 'customer', select: 'name email phone role' },
      {
        path: 'subOrders',
        populate: [{ path: 'vendor', select: 'storeName pickupAddress phone businessEmail gstin pan state' }],
      },
    ]);

    // Role Security: Unauthorized customer cannot view another user's invoice (Point #20)
    if (req.user) {
      const isOwner = order.customer && (
        (order.customer._id && order.customer._id.toString() === req.user._id.toString()) ||
        order.customer.toString() === req.user._id.toString()
      );
      const isAdmin = req.user.role === 'superadmin' || req.user.role === 'admin';
      const isVendor = req.user.role === 'vendor' && (
        order.subOrders?.some(sub => {
          const vId = sub.vendor?._id ? sub.vendor._id.toString() : sub.vendor?.toString();
          const uVId = req.vendorProfile?._id?.toString() || req.user.vendorProfile?.toString();
          return vId && (vId === uVId || vId === req.user._id.toString());
        })
      );

      if (!isOwner && !isAdmin && !isVendor) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You are not authorized to access this invoice.',
        });
      }
    }

    const UIConfig = require('../models/UIConfig');
    const uiConfig = await UIConfig.findOne();
    const taxCfg = uiConfig?.taxSettings || {};

    const primaryVendor = order.subOrders?.[0]?.vendor;
    const seller = {
      companyName: taxCfg.companyName || 'AuraMarket E-Commerce Private Limited',
      storeName: taxCfg.companyName || primaryVendor?.storeName || 'AuraMarket E-Commerce Private Limited',
      legalEntity: taxCfg.companyName || 'AuraMarket E-Commerce Private Limited',
      address: taxCfg.corporateAddress || primaryVendor?.pickupAddress || 'Fulfillment Center B-42, Okhla Industrial Area Phase-III, New Delhi, Delhi 110020',
      phone: uiConfig?.supportPhone || primaryVendor?.phone || '+91 8533955333',
      email: uiConfig?.supportEmail || primaryVendor?.businessEmail || 'billing@auramarket.com',
      gstin: taxCfg.gstin || primaryVendor?.gstin || '07AAAAA0000A1Z5',
      pan: taxCfg.pan || primaryVendor?.pan || 'AAAAA0000A',
      cin: taxCfg.cin || 'U72900DL2026PTC389102',
      state: taxCfg.state || 'Delhi',
      stateCode: taxCfg.stateCode || '07',
    };

    const buyer = {
      recipientName: order.shippingAddress?.recipientName || order.shippingAddress?.fullName || order.customer?.name || 'Valued Customer',
      name: order.shippingAddress?.recipientName || order.shippingAddress?.fullName || order.customer?.name || 'Valued Customer',
      phone: order.shippingAddress?.phone || order.customer?.phone || 'N/A',
      email: order.customer?.email || 'customer@auramarket.com',
      address: `${order.shippingAddress?.street}, ${order.shippingAddress?.city}, ${order.shippingAddress?.state} - ${order.shippingAddress?.pincode}`,
      state: order.shippingAddress?.state || 'Delhi',
      pincode: order.shippingAddress?.pincode || '110001',
    };

    const isInterState = seller.state.trim().toLowerCase() !== buyer.state.trim().toLowerCase();

    const invoiceNumber = `INV-${order.orderNumber || order._id.toString().slice(-8).toUpperCase()}`;
    const invoiceDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN');
    const orderDate = invoiceDate;

    // Line items breakdown with 18% GST (9% CGST + 9% SGST for same-state, 18% IGST for inter-state)
    let totalTaxableValue = 0;
    let totalTaxAmount = 0;
    const hsnMap = {};

    const lineItems = (order.items || []).map((item, idx) => {
      const grossTotal = (item.price || 0) * (item.quantity || 1);
      // Assuming prices are inclusive of 18% GST
      const taxable = Math.round((grossTotal / 1.18) * 100) / 100;
      const tax = Math.round((grossTotal - taxable) * 100) / 100;
      
      const cgst = isInterState ? 0 : Math.round((tax / 2) * 100) / 100;
      const sgst = isInterState ? 0 : Math.round((tax / 2) * 100) / 100;
      const igst = isInterState ? tax : 0;

      totalTaxableValue += taxable;
      totalTaxAmount += tax;

      // Assign category-specific HSN code if available
      const hsnCode = item.hsnCode || '85183000';
      if (!hsnMap[hsnCode]) {
        hsnMap[hsnCode] = {
          hsnCode,
          taxableValue: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          totalTax: 0,
        };
      }
      hsnMap[hsnCode].taxableValue += taxable;
      hsnMap[hsnCode].cgstAmount += cgst;
      hsnMap[hsnCode].sgstAmount += sgst;
      hsnMap[hsnCode].igstAmount += igst;
      hsnMap[hsnCode].totalTax += tax;

      return {
        itemNo: idx + 1,
        title: item.title || 'Product Item',
        variantSku: item.variantSku || 'STD-SKU',
        hsnCode,
        quantity: item.quantity || 1,
        unitGrossPrice: item.price || 0,
        taxableValue: taxable,
        taxRate: '18%',
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        totalAmount: grossTotal,
      };
    });

    const subtotal = Math.round(totalTaxableValue * 100) / 100;
    const cgstTotal = isInterState ? 0 : Math.round((totalTaxAmount / 2) * 100) / 100;
    const sgstTotal = isInterState ? 0 : Math.round((totalTaxAmount / 2) * 100) / 100;
    const igstTotal = isInterState ? Math.round(totalTaxAmount * 100) / 100 : 0;
    const totalTax = Math.round(totalTaxAmount * 100) / 100;
    const shippingFee = order.shippingFee || 0;
    const discount = order.discountAmount || 0;
    const grandTotal = order.totalAmount || Math.round((subtotal + totalTax + shippingFee - discount) * 100) / 100;
    const amountInWords = numberToWords(grandTotal);

    const hsnSummary = Object.values(hsnMap).map(h => ({
      hsnCode: h.hsnCode,
      taxableValue: Math.round(h.taxableValue * 100) / 100,
      cgstAmount: Math.round(h.cgstAmount * 100) / 100,
      sgstAmount: Math.round(h.sgstAmount * 100) / 100,
      igstAmount: Math.round(h.igstAmount * 100) / 100,
      totalTax: Math.round(h.totalTax * 100) / 100,
    }));

    const crypto = require('crypto');
    const verificationDigest = crypto
      .createHash('sha256')
      .update(`${invoiceNumber}:${grandTotal}:${order.createdAt || ''}`)
      .digest('hex')
      .slice(0, 16)
      .toUpperCase();

    const companySeal = {
      legalEntityName: seller.legalEntity,
      cin: seller.cin,
      gstin: seller.gstin,
      pan: seller.pan,
      signatory: taxCfg.authorizedSignatory || 'Authorized Signatory • Taxation Cell',
      verificationCode: `AUTH-SEAL-${verificationDigest}`,
      signedAt: new Date().toISOString(),
    };

    // Generate standalone printable HTML with Master Corporate Seal & HSN Summary
    const printableHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Master Tax Invoice - ${invoiceNumber}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.4; font-size: 12px; margin: 0; padding: 20px; }
    .invoice-card { max-width: 820px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 30px; border-radius: 8px; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f2444; padding-bottom: 15px; margin-bottom: 20px; }
    .brand-title { font-size: 24px; font-weight: 900; color: #0f2444; margin: 0; letter-spacing: -0.5px; }
    .badge { display: inline-block; background: #fef3c7; color: #92400e; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; margin-left: 6px; }
    .inv-title { font-size: 18px; font-weight: 800; text-align: right; color: #0f2444; margin: 0; }
    .inv-meta { text-align: right; font-size: 11px; color: #64748b; margin-top: 4px; }
    .party-row { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
    .party-box { flex: 1; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
    .party-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
    .party-name { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    th { background: #0f2444; color: #ffffff; font-weight: 700; text-align: left; padding: 8px; font-size: 11px; }
    td { padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .totals-table { width: 340px; margin-left: auto; margin-bottom: 15px; }
    .totals-table td { padding: 4px 8px; }
    .grand-total-row { background: #f1f5f9; font-weight: 800; font-size: 13px; border-top: 2px solid #0f2444; }
    .words-box { padding: 10px; background: #f8fafc; border-left: 3px solid #0f2444; font-size: 11px; margin-bottom: 15px; }
    .hsn-box { margin-bottom: 20px; }
    .hsn-box th { background: #334155; font-size: 10px; }
    .footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 10px; color: #64748b; }
    .seal-box { text-align: center; border: 2px dashed #0f2444; padding: 10px 18px; border-radius: 8px; background: #f8fafc; min-width: 220px; }
    @media print {
      body { padding: 0; }
      .invoice-card { border: none; padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div>
        <h1 class="brand-title">AuraMarket<span class="badge">ORIGINAL MASTER TAX INVOICE</span></h1>
        <p style="margin: 2px 0 0; color: #64748b; font-size: 11px;">GST & HSN Compliant Corporate Invoice • Enterprise Commerce Suite</p>
      </div>
      <div>
        <h2 class="inv-title">TAX INVOICE</h2>
        <div class="inv-meta">
          <strong>Invoice #:</strong> ${invoiceNumber}<br>
          <strong>Invoice Date:</strong> ${invoiceDate}<br>
          <strong>Order Reference:</strong> ${order.orderNumber || order._id}<br>
          <strong>Supply Type:</strong> ${isInterState ? 'Inter-State (IGST 18%)' : 'Intra-State (CGST 9% + SGST 9%)'}<br>
          <strong>Payment Mode:</strong> ${order.paymentMethod || 'COD'} (${order.paymentStatus || 'PAID'})
        </div>
      </div>
    </div>

    <div class="party-row">
      <div class="party-box">
        <div class="party-title">Sold & Invoiced By (Corporate Seller)</div>
        <div class="party-name">${seller.storeName}</div>
        <div>${seller.address}</div>
        <div><strong>GSTIN:</strong> ${seller.gstin} | <strong>PAN:</strong> ${seller.pan}</div>
        <div><strong>CIN:</strong> ${seller.cin}</div>
        <div><strong>State:</strong> ${seller.state} (Code: ${seller.stateCode})</div>
      </div>
      <div class="party-box">
        <div class="party-title">Billed & Shipped To (Customer)</div>
        <div class="party-name">${buyer.name}</div>
        <div>${buyer.address}</div>
        <div><strong>Phone:</strong> ${buyer.phone}</div>
        <div><strong>Place of Supply:</strong> ${buyer.state}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 30px;">#</th>
          <th>Item Description</th>
          <th>HSN</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">Taxable</th>
          ${isInterState ? `<th class="text-right">IGST (18%)</th>` : `<th class="text-right">CGST (9%)</th><th class="text-right">SGST (9%)</th>`}
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${lineItems.map(item => `
          <tr>
            <td>${item.itemNo}</td>
            <td><strong>${item.title}</strong><br><span style="color:#64748b; font-size:10px;">SKU: ${item.variantSku}</span></td>
            <td>${item.hsnCode}</td>
            <td class="text-right">${item.quantity}</td>
            <td class="text-right">₹${item.unitGrossPrice.toLocaleString('en-IN')}</td>
            <td class="text-right">₹${item.taxableValue.toLocaleString('en-IN')}</td>
            ${isInterState ? `<td class="text-right">₹${item.igstAmount.toLocaleString('en-IN')}</td>` : `<td class="text-right">₹${item.cgstAmount.toLocaleString('en-IN')}</td><td class="text-right">₹${item.sgstAmount.toLocaleString('en-IN')}</td>`}
            <td class="text-right font-bold">₹${item.totalAmount.toLocaleString('en-IN')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- HSN Summary Table -->
    <div class="hsn-box">
      <h4 style="margin: 0 0 6px; font-size: 11px; text-transform: uppercase; color: #475569;">HSN / SAC Tax Summary</h4>
      <table>
        <thead>
          <tr>
            <th>HSN / SAC</th>
            <th class="text-right">Taxable Amount</th>
            ${isInterState ? `<th class="text-right">IGST Amount</th>` : `<th class="text-right">CGST Amount</th><th class="text-right">SGST Amount</th>`}
            <th class="text-right">Total Tax Amount</th>
          </tr>
        </thead>
        <tbody>
          ${hsnSummary.map(h => `
            <tr>
              <td><strong>${h.hsnCode}</strong></td>
              <td class="text-right">₹${h.taxableValue.toLocaleString('en-IN')}</td>
              ${isInterState ? `<td class="text-right">₹${h.igstAmount.toLocaleString('en-IN')}</td>` : `<td class="text-right">₹${h.cgstAmount.toLocaleString('en-IN')}</td><td class="text-right">₹${h.sgstAmount.toLocaleString('en-IN')}</td>`}
              <td class="text-right font-bold">₹${h.totalTax.toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <table class="totals-table">
      <tr>
        <td>Taxable Amount:</td>
        <td class="text-right font-bold">₹${subtotal.toLocaleString('en-IN')}</td>
      </tr>
      ${isInterState ? `
      <tr>
        <td>Integrated Tax (IGST 18%):</td>
        <td class="text-right font-bold">₹${igstTotal.toLocaleString('en-IN')}</td>
      </tr>` : `
      <tr>
        <td>Central Tax (CGST 9.0%):</td>
        <td class="text-right font-bold">₹${cgstTotal.toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td>State Tax (SGST 9.0%):</td>
        <td class="text-right font-bold">₹${sgstTotal.toLocaleString('en-IN')}</td>
      </tr>`}
      <tr>
        <td>Shipping & Delivery:</td>
        <td class="text-right font-bold">${shippingFee === 0 ? 'FREE' : '₹' + shippingFee}</td>
      </tr>
      ${discount > 0 ? `
      <tr>
        <td style="color: #059669;">Reward Coins Redeemed:</td>
        <td class="text-right font-bold" style="color: #059669;">-₹${discount.toLocaleString('en-IN')}</td>
      </tr>` : ''}
      <tr class="grand-total-row">
        <td>Grand Total (INR):</td>
        <td class="text-right">₹${grandTotal.toLocaleString('en-IN')}</td>
      </tr>
    </table>

    <div class="words-box">
      <strong>Amount in Words:</strong> ${amountInWords}
    </div>

    <div class="footer">
      <div>
        <p style="margin: 0 0 2px;">• This is an authentic computer generated electronic invoice issued under Section 31 of CGST Act.</p>
        <p style="margin: 0 0 2px;">• Retain this document for official warranty and business taxation credits.</p>
        <p style="margin: 0;">• Subject to ${seller.state} Jurisdiction. Support: ${seller.email}</p>
      </div>
      <div class="seal-box">
        <strong style="color: #0f2444; font-size: 11px;">${companySeal.legalEntityName}</strong><br>
        <span style="color: #059669; font-weight: 800; font-size: 11px;">✓ DIGITALLY AUTHENTICATED</span><br>
        <span style="font-size: 9px; color: #64748b; font-family: monospace;">${companySeal.verificationCode}</span><br>
        <span style="font-size: 9px; color: #475569; font-weight: 700;">${companySeal.signatory}</span>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const { getInvoiceData } = require('../services/invoicePdfService');
    const invoiceServiceData = await getInvoiceData(order, taxCfg);

    const pdfDownloadUrl = `/api/orders/${order.orderNumber || order._id}/invoice/pdf?download=true`;
    const qrCodeDataUrl = invoiceServiceData.qrCodeDataUrl;
    const digitalSeal = invoiceServiceData.digitalSeal;
    const gstSummary = invoiceServiceData.gstSummary;

    if (req.query.format === 'html') {
      return res.type('html').send(printableHtml);
    }

    res.status(200).json({
      success: true,
      pdfDownloadUrl,
      qrCodeDataUrl,
      digitalSeal,
      gstSummary,
      data: {
        invoiceNumber,
        invoiceDate,
        orderId: order.orderNumber || order._id,
        orderNumber: order.orderNumber || order._id.toString(),
        rawOrderId: order._id,
        orderDate,
        pdfDownloadUrl,
        qrCodeDataUrl,
        digitalSeal,
        gstSummary,
        seller,
        buyer,
        lineItems,
        hsnSummary,
        companySeal: {
          ...companySeal,
          ...digitalSeal,
        },
        pricing: {
          subtotal,
          cgstTotal,
          sgstTotal,
          igstTotal,
          isInterState,
          totalTax,
          shippingFee,
          discount,
          grandTotal,
          amountInWords,
        },
        payment: {
          method: order.paymentMethod,
          status: order.paymentStatus,
          transactionRef: order.paymentDetails?.transactionId || order.paymentDetails?.upiUtr || 'N/A',
        },
        printableHtml,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download Official GST Tax Invoice PDF with QR code & Digital Seal (Point #20)
// @route   GET /api/orders/:id/invoice/pdf
// @route   GET /api/admin/orders/:id/invoice/pdf
// @access  Public (Guest/Tracker) / Private (Customer Owner, SuperAdmin, Vendor)
exports.getInvoicePdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const download = req.query.download === 'true' || req.query.download === '1';

    let order = null;
    const mongoose = require('mongoose');
    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await Order.findById(id);
    }
    if (!order) {
      order = await Order.findOne({ orderNumber: id });
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found for PDF invoice generation' });
    }

    await order.populate([
      { path: 'customer', select: 'name email phone role' },
      {
        path: 'subOrders',
        populate: [{ path: 'vendor', select: 'storeName pickupAddress phone businessEmail gstin pan state' }],
      },
    ]);

    // Role Security: Unauthorized customer cannot download another user's invoice (Point #20)
    if (req.user) {
      const isOwner = order.customer && (
        (order.customer._id && order.customer._id.toString() === req.user._id.toString()) ||
        order.customer.toString() === req.user._id.toString()
      );
      const isAdmin = req.user.role === 'superadmin' || req.user.role === 'admin';
      const isVendor = req.user.role === 'vendor' && (
        order.subOrders?.some(sub => {
          const vId = sub.vendor?._id ? sub.vendor._id.toString() : sub.vendor?.toString();
          const uVId = req.vendorProfile?._id?.toString() || req.user.vendorProfile?.toString();
          return vId && (vId === uVId || vId === req.user._id.toString());
        })
      );

      if (!isOwner && !isAdmin && !isVendor) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You are not authorized to download this invoice.',
        });
      }
    }

    const { generateInvoicePdf } = require('../services/invoicePdfService');
    await generateInvoicePdf(order, res, { download });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Multi-Vendor Split Packing Slips with Dynamic QR Codes (Point #73)
// @route   GET /api/orders/:id/split-packing-slips
// @route   GET /api/admin/orders/:id/split-packing-slips
// @access  Private (Admin, Vendor, Customer)
exports.getSplitPackingSlips = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { format, type, vendorId } = req.query;

    const isMongoId = mongoose.Types.ObjectId.isValid(id);
    const query = isMongoId ? { _id: id } : { orderNumber: id };

    let order = await Order.findOne(query)
      .populate('customer', 'name email phone')
      .populate({
        path: 'items.product',
        select: 'title sku hsnCode category images mrp sellingPrice',
      });

    let matchedSubOrderId = null;
    if (!order && isMongoId) {
      // Allow looking up by SubOrder._id if :id matches a sub-order
      const subOrderDoc = await SubOrder.findById(id);
      if (subOrderDoc && subOrderDoc.parentOrder) {
        matchedSubOrderId = subOrderDoc._id;
        order = await Order.findById(subOrderDoc.parentOrder)
          .populate('customer', 'name email phone')
          .populate({
            path: 'items.product',
            select: 'title sku hsnCode category images mrp sellingPrice',
          });
      }
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found for split packing slips' });
    }

    // Role-based authorization
    const userRole = req.user?.role;
    let allowedVendorId = null;

    if (userRole === 'customer') {
      if (!order.customer._id.equals(req.user._id)) {
        return res.status(403).json({ success: false, message: 'Unauthorized to view packing slips for this order' });
      }
    } else if (userRole === 'vendor' || userRole === 'vendor_staff' || req.user?.isVendorStaff) {
      const vendorProfile = req.vendorProfile || await VendorProfile.findOne({
        $or: [{ user: req.user._id }, { _id: req.user.vendorProfile }],
      });
      if (!vendorProfile) {
        return res.status(403).json({ success: false, message: 'Vendor profile not found' });
      }
      allowedVendorId = vendorProfile._id.toString();
    }

    // Fetch all SubOrders for this order
    const subOrderFilter = { parentOrder: order._id };
    if (matchedSubOrderId) {
      subOrderFilter._id = matchedSubOrderId;
    }
    let subOrders = await SubOrder.find(subOrderFilter)
      .populate('vendor')
      .populate('customer', 'name email phone')
      .populate('deliveryPartner', 'name phone');

    const { buildSplitPackingSlipData, renderPrintableSplitSlipHtml } = require('../utils/packingSlipHelper');

    let slips = [];

    if (subOrders && subOrders.length > 0) {
      for (const so of subOrders) {
        const vId = so.vendor?._id?.toString();
        if (allowedVendorId && vId !== allowedVendorId) continue;
        if (vendorId && vId !== vendorId.toString()) continue;

        const slip = buildSplitPackingSlipData({
          order,
          subOrder: so,
          vendor: so.vendor || {},
          customer: so.customer || order.customer,
          items: so.items || [],
        });
        slips.push(slip);
      }
    } else {
      // Fallback: Group items by vendor from parent order
      const vendorGroups = {};
      for (const item of order.items) {
        const vId = item.vendor?.toString();
        if (!vendorGroups[vId]) {
          vendorGroups[vId] = [];
        }
        vendorGroups[vId].push(item);
      }

      for (const vId in vendorGroups) {
        if (allowedVendorId && vId !== allowedVendorId) continue;
        if (vendorId && vId !== vendorId.toString()) continue;

        const vendorDoc = await VendorProfile.findById(vId);
        const slip = buildSplitPackingSlipData({
          order,
          subOrder: null,
          vendor: vendorDoc || { _id: vId, storeName: 'AuraMarket Merchant' },
          customer: order.customer,
          items: vendorGroups[vId],
        });
        slips.push(slip);
      }
    }

    if (slips.length === 0) {
      return res.status(404).json({ success: false, message: 'No split packing slips found for the specified criteria' });
    }

    if (format === 'html' || req.headers.accept?.includes('text/html')) {
      const html = renderPrintableSplitSlipHtml(slips, { format: type || 'a4' });
      return res.type('html').send(html);
    }

    res.status(200).json({
      success: true,
      count: slips.length,
      data: slips,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// Point 74: Fake / Spam Order Prevention (RTO Guard for high-risk COD)
// ============================================================================

// @desc    Verify High-Risk COD Order via OTP
// @route   POST /api/orders/:id/verify-rto-risk
// @access  Private (Customer / Admin)
exports.verifyRtoRisk = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;

    const isMongoId = mongoose.Types.ObjectId.isValid(id);
    const query = isMongoId ? { _id: id } : { orderNumber: id };

    const order = await Order.findOne(query).populate('customer', 'name email phone');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found for RTO verification' });
    }

    // Role verification
    if (req.user?.role === 'customer' && !order.customer._id.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to verify this order' });
    }

    if (order.rtoVerificationStatus === 'VERIFIED') {
      return res.status(200).json({
        success: true,
        message: 'Order is already verified',
        data: order,
      });
    }

    if (!order.rtoVerificationRequired && order.rtoVerificationStatus !== 'PENDING') {
      return res.status(200).json({
        success: true,
        message: 'No RTO verification required for this order',
        data: order,
      });
    }

    if (!otp || String(otp).trim() !== (order.rtoVerificationOtp || '').trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid RTO verification security code',
      });
    }

    if (order.rtoVerificationOtpExpires && new Date() > new Date(order.rtoVerificationOtpExpires)) {
      return res.status(400).json({
        success: false,
        message: 'RTO verification code has expired. Please request a new code.',
      });
    }

    order.rtoVerificationStatus = 'VERIFIED';
    order.rtoVerificationRequired = false;
    order.flaggedForRtoRisk = false;
    await order.save();

    // Dispatch verified SMS
    if (order.shippingAddress?.phone) {
      smsService
        .sendSMS({
          to: order.shippingAddress.phone,
          message: `AuraMarket: Order #${order.orderNumber} security verification completed. Merchant will now pack your order.`,
        })
        .catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: 'Order security verification completed successfully! Confirmed for merchant dispatch.',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend High-Risk COD Security Verification OTP
// @route   POST /api/orders/:id/resend-rto-otp
// @access  Private (Customer / Admin)
exports.resendRtoOtp = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isMongoId = mongoose.Types.ObjectId.isValid(id);
    const query = isMongoId ? { _id: id } : { orderNumber: id };

    const order = await Order.findOne(query);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    order.rtoVerificationOtp = newOtp;
    order.rtoVerificationOtpExpires = new Date(Date.now() + 30 * 60 * 1000);
    order.rtoVerificationStatus = 'PENDING';
    await order.save();

    const phone = order.shippingAddress?.phone || req.user?.phone;
    if (phone) {
      await smsService.sendSMS({
        to: phone,
        message: `AuraMarket RTO Guard: Your new security verification code is ${newOtp}. Valid for 30 minutes.`,
      });
    }

    res.status(200).json({
      success: true,
      message: 'New security verification OTP sent to your registered phone number.',
      expiresAt: order.rtoVerificationOtpExpires,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Super Admin RTO Guard Overview & Risk Dashboard
// @route   GET /api/admin/rto-guard/overview
// @access  Private (Super Admin)
exports.getRtoGuardOverview = async (req, res, next) => {
  try {
    const totalEvaluated = await Order.countDocuments();
    const totalFlagged = await Order.countDocuments({
      $or: [{ flaggedForRtoRisk: true }, { rtoRiskLevel: 'HIGH' }],
    });
    const highRiskCount = await Order.countDocuments({ rtoRiskLevel: 'HIGH' });
    const mediumRiskCount = await Order.countDocuments({ rtoRiskLevel: 'MEDIUM' });
    const pendingVerification = await Order.countDocuments({ rtoVerificationStatus: 'PENDING' });
    const verifiedCount = await Order.countDocuments({ rtoVerificationStatus: 'VERIFIED' });
    const overriddenCount = await Order.countDocuments({ rtoVerificationStatus: 'OVERRIDDEN_BY_ADMIN' });
    const rejectedCount = await Order.countDocuments({ rtoVerificationStatus: 'REJECTED' });

    const flaggedOrders = await Order.find({
      $or: [
        { flaggedForRtoRisk: true },
        { rtoRiskLevel: 'HIGH' },
        { rtoVerificationStatus: { $in: ['PENDING', 'OVERRIDDEN_BY_ADMIN', 'REJECTED'] } },
      ],
    })
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      stats: {
        totalEvaluated,
        totalFlagged,
        highRiskCount,
        mediumRiskCount,
        pendingVerification,
        verifiedCount,
        overriddenCount,
        rejectedCount,
      },
      data: flaggedOrders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Super Admin Override for High-Risk COD Orders
// @route   POST /api/admin/rto-guard/override
// @access  Private (Super Admin)
exports.overrideRtoGuard = async (req, res, next) => {
  try {
    const { orderId, action, notes } = req.body;

    if (!orderId || !['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "orderId and valid action ('APPROVE' or 'REJECT') are required",
      });
    }

    const isMongoId = mongoose.Types.ObjectId.isValid(orderId);
    const query = isMongoId ? { _id: orderId } : { orderNumber: orderId };

    const order = await Order.findOne(query);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found for RTO override' });
    }

    if (action === 'APPROVE') {
      order.rtoVerificationStatus = 'OVERRIDDEN_BY_ADMIN';
      order.rtoVerificationRequired = false;
      order.flaggedForRtoRisk = false;
    } else {
      order.rtoVerificationStatus = 'REJECTED';
      order.status = 'CANCELLED';
      order.cancellationReason = notes || 'Blocked by Super Admin via RTO Guard Anti-Fraud Suite';
      order.cancelledAt = new Date();
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: `Order #${order.orderNumber} successfully ${action === 'APPROVE' ? 'approved & cleared for dispatch' : 'rejected & cancelled'}`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get In-Browser Direct Thermal Receipt (ESC/POS 80mm & 58mm emulation)
// @route   GET /api/orders/:id/thermal-receipt
// @access  Private (Customer, Vendor, Admin)
exports.getThermalReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { width = '80mm', format = 'json', vendorId } = req.query;

    const paperWidth = width === '58mm' ? '58mm' : '80mm';

    const isMongoId = mongoose.Types.ObjectId.isValid(id);
    const query = isMongoId ? { _id: id } : { orderNumber: id };

    const order = await Order.findOne(query)
      .populate('customer', 'name email phone')
      .populate('items.product', 'title sku images hsnCode')
      .populate('items.vendor', 'storeName contactEmail phone');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Authorization check
    let targetVendor = null;
    if (req.user?.role === 'customer' && order.customer?._id?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to access receipt for this order' });
    }

    if (req.user?.role === 'vendor') {
      const vendorProfile = await VendorProfile.findOne({ user: req.user._id });
      if (!vendorProfile) {
        return res.status(403).json({ success: false, message: 'Vendor profile not found' });
      }
      targetVendor = vendorProfile;
    } else if (vendorId) {
      targetVendor = await VendorProfile.findById(vendorId);
    }

    const { generateThermalReceipt } = require('../utils/escPosGenerator');
    const UIConfig = require('../models/UIConfig');
    let uiConfig = null;
    try {
      uiConfig = await UIConfig.findOne();
    } catch (_) {}

    const storeName = uiConfig?.platformName || 'AuraMarket Store';

    const receipt = generateThermalReceipt({
      order,
      vendorProfile: targetVendor,
      paperWidth,
      storeName,
    });

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(receipt.html);
    }

    if (format === 'raw') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(receipt.rawText);
    }

    res.status(200).json({
      success: true,
      data: receipt,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// POINT 21: DIGITAL PROOF OF DELIVERY (POD)
// ==========================================

// @desc    Save Customer Digital Proof of Delivery (POD) Signature & Mark Delivered (Point 21)
// @route   POST /api/orders/:id/pod-signature
exports.saveOrderPodSignature = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      signature,
      signerName,
      signerRelation,
      gpsLocation,
      deviceInfo,
      riderPhone,
      podNotes,
    } = req.body;

    if (!signature || typeof signature !== 'string' || !signature.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Customer digital signature image (base64 data URL) is required for Proof of Delivery.',
      });
    }

    const mongoose = require('mongoose');
    let order = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await Order.findById(id).populate('subOrders');
    }
    if (!order) {
      order = await Order.findOne({ orderNumber: id }).populate('subOrders');
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found for POD signature capture' });
    }

    if (order.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Cannot attach POD signature to a cancelled order.' });
    }

    // Role check: Customer can only sign their own order unless superadmin/delivery/vendor
    if (
      req.user.role === 'customer' &&
      order.customer &&
      order.customer.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Unauthorized to sign POD for another customer order.' });
    }

    const resolvedSigner = (signerName && signerName.trim()) || order.shippingAddress?.recipientName || 'Customer';
    const resolvedRelation = (signerRelation && signerRelation.trim()) || 'Self';
    const now = new Date();
    const verificationCode = `POD-${order.orderNumber || order._id.toString().slice(-8).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const podData = {
      hasSignature: true,
      signature: signature.trim(),
      signerName: resolvedSigner,
      signerRelation: resolvedRelation,
      gpsLocation: {
        latitude: gpsLocation?.latitude || null,
        longitude: gpsLocation?.longitude || null,
        accuracy: gpsLocation?.accuracy || null,
      },
      deviceInfo: (deviceInfo && deviceInfo.trim()) || req.headers['user-agent'] || 'Mobile Handheld',
      signedAt: now,
      ipAddress: req.ip || '',
      verificationCode,
      deliveredBy: req.user.role === 'delivery' ? (req.user.name || 'Express Rider') : 'AuraMarket Express Courier',
      riderPhone: (riderPhone && riderPhone.trim()) || (req.user.role === 'delivery' ? req.user.phone : '+919876543210'),
      podNotes: (podNotes && podNotes.trim()) || '',
    };

    order.proofOfDelivery = podData;
    order.status = 'DELIVERED';
    await order.save();

    // Cascade to subOrders
    if (order.subOrders && order.subOrders.length > 0) {
      for (const sub of order.subOrders) {
        sub.status = 'delivered';
        sub.proofOfDelivery = podData;
        sub.trackingHistory.push({
          status: 'delivered',
          timestamp: now,
          note: `Digital Proof of Delivery (POD) signature captured from ${resolvedSigner} (${resolvedRelation}) [Code: ${verificationCode}]`,
        });
        await sub.save();

        // Also update DeliveryTask if one exists
        const DeliveryTask = mongoose.models.DeliveryTask || require('../models/DeliveryTask');
        if (DeliveryTask) {
          const task = await DeliveryTask.findOne({ subOrder: sub._id });
          if (task) {
            task.customerSignature = signature.trim();
            task.signatureDetails = {
              signerName: resolvedSigner,
              signerRelation: resolvedRelation,
              signedAt: now,
              ipAddress: req.ip || '',
            };
            task.status = 'DELIVERED';
            task.deliveredAt = now;
            await task.save();
          }
        }
      }
    }

    // Log to AuditLog
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      user: req.user._id,
      action: 'ORDER_POD_SIGNATURE_CAPTURED',
      entity: 'Order',
      entityId: order._id,
      details: {
        orderNumber: order.orderNumber,
        signerName: resolvedSigner,
        signerRelation: resolvedRelation,
        verificationCode,
        gpsLocation: podData.gpsLocation,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: 'Proof of Delivery (POD) signature recorded and order marked delivered successfully.',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        proofOfDelivery: order.proofOfDelivery,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Order Proof of Delivery (POD) Data & Verification Code (Point 21)
// @route   GET /api/orders/:id/pod
exports.getOrderPod = async (req, res, next) => {
  try {
    const { id } = req.params;
    const mongoose = require('mongoose');
    let order = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await Order.findById(id).populate([
        { path: 'customer', select: 'name email phone' },
        { path: 'subOrders', populate: { path: 'vendor', select: 'storeName phone' } },
      ]);
    }
    if (!order) {
      order = await Order.findOne({ orderNumber: id }).populate([
        { path: 'customer', select: 'name email phone' },
        { path: 'subOrders', populate: { path: 'vendor', select: 'storeName phone' } },
      ]);
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found for POD verification' });
    }

    res.status(200).json({
      success: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: order.createdAt,
        totalAmount: order.totalAmount,
        shippingAddress: order.shippingAddress,
        items: order.items,
        hasSignature: Boolean(order.proofOfDelivery?.hasSignature),
        proofOfDelivery: order.proofOfDelivery || { hasSignature: false },
        verifiableStatus: order.proofOfDelivery?.hasSignature ? 'VERIFIED_DIGITAL_POD' : 'PENDING_DELIVERY_SIGNATURE',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate Printable 4x6 / A4 Official Proof of Delivery (POD) Slip (Point 21)
// @route   GET /api/orders/:id/pod-slip
exports.getOrderPodSlip = async (req, res, next) => {
  try {
    const { id } = req.params;
    const mongoose = require('mongoose');
    let order = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await Order.findById(id).populate([
        { path: 'customer', select: 'name email phone' },
        { path: 'subOrders', populate: { path: 'vendor', select: 'storeName phone pickupAddress' } },
      ]);
    }
    if (!order) {
      order = await Order.findOne({ orderNumber: id }).populate([
        { path: 'customer', select: 'name email phone' },
        { path: 'subOrders', populate: { path: 'vendor', select: 'storeName phone pickupAddress' } },
      ]);
    }

    if (!order) {
      return res.status(404).send('<h3>Proof of Delivery Slip: Order not found</h3>');
    }

    const pod = order.proofOfDelivery || {};
    const hasSig = Boolean(pod.hasSignature && pod.signature);
    const orderNum = order.orderNumber || order._id.toString().slice(-8).toUpperCase();
    const formattedDate = pod.signedAt
      ? new Date(pod.signedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
      : new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    const gpsCoord = pod.gpsLocation?.latitude && pod.gpsLocation?.longitude
      ? `${Number(pod.gpsLocation.latitude).toFixed(6)}° N, ${Number(pod.gpsLocation.longitude).toFixed(6)}° E (±${pod.gpsLocation.accuracy || 10}m)`
      : 'Captured via Handheld Geolocation (Standard Doorstep Accuracy)';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Proof of Delivery (POD) - ${orderNum}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; background: #f8fafc; }
    .slip-container { max-width: 800px; margin: 0 auto; background: #ffffff; border: 2px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); position: relative; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
    .brand-title { font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
    .brand-sub { font-size: 11px; text-transform: uppercase; font-weight: 800; color: #d97706; letter-spacing: 1px; }
    .badge { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 6px 12px; border-radius: 9999px; font-size: 12px; font-weight: 800; text-transform: uppercase; display: inline-flex; align-items: center; gap: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; }
    .box-title { font-size: 11px; text-transform: uppercase; font-weight: 800; color: #64748b; margin-bottom: 6px; letter-spacing: 0.5px; }
    .box-val { font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.4; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
    th { background: #0f172a; color: #ffffff; text-align: left; padding: 10px 12px; font-weight: 700; }
    th:first-child { border-top-left-radius: 8px; }
    th:last-child { border-top-right-radius: 8px; text-align: right; }
    td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
    td:last-child { text-align: right; font-weight: 700; }
    .sig-section { border: 2px dashed #cbd5e1; border-radius: 14px; padding: 20px; background: #ffffff; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: center; }
    .sig-box { text-align: center; }
    .sig-img { max-height: 120px; max-width: 100%; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 8px; background: #fafafa; padding: 8px; }
    .legal-notice { font-size: 11px; color: #64748b; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 12px; text-align: center; }
    .print-btn { background: #0f172a; color: white; border: none; padding: 10px 20px; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 8px; }
  </style>
</head>
<body>
  <div class="slip-container">
    <div class="header">
      <div>
        <div class="brand-title">AuraMarket Express</div>
        <div class="brand-sub">Official Digital Proof of Delivery (POD)</div>
      </div>
      <div>
        <div class="badge">✓ Doorstep Verified Handover</div>
      </div>
    </div>

    <div class="grid">
      <div class="box">
        <div class="box-title">Order Information</div>
        <div class="box-val">Order ID: <strong>#${orderNum}</strong></div>
        <div class="box-val">Verification Code: <strong>${pod.verificationCode || 'POD-PENDING'}</strong></div>
        <div class="box-val">Handover Timestamp: ${formattedDate}</div>
        <div class="box-val">Payment Method: ${order.paymentMethod} (${order.paymentStatus})</div>
      </div>
      <div class="box">
        <div class="box-title">Delivery Destination</div>
        <div class="box-val">Recipient: <strong>${order.shippingAddress?.recipientName}</strong></div>
        <div class="box-val">Phone: ${order.shippingAddress?.phone}</div>
        <div class="box-val">${order.shippingAddress?.street}, ${order.shippingAddress?.city}, ${order.shippingAddress?.state} - ${order.shippingAddress?.pincode}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Item Description</th>
          <th style="text-align: center;">Qty</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${(order.items || []).map(item => `
          <tr>
            <td><strong>${item.title}</strong>${item.variantName ? `<br><small style="color: #64748b;">Variant: ${item.variantName}</small>` : ''}</td>
            <td style="text-align: center;">${item.quantity}</td>
            <td>₹${item.price?.toLocaleString('en-IN')}</td>
            <td>₹${((item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="sig-section">
      <div class="sig-box">
        <div class="box-title">Customer Digital Signature</div>
        ${hasSig ? `<img src="${pod.signature}" alt="Customer Signature" class="sig-img" />` : '<div style="padding: 30px; color: #94a3b8; font-style: italic;">[No Signature Captured]</div>'}
        <div style="font-size: 12px; font-weight: 800; margin-top: 6px;">Signer: ${pod.signerName || order.shippingAddress?.recipientName}</div>
        <div style="font-size: 11px; color: #64748b;">Relationship: ${pod.signerRelation || 'Self'}</div>
      </div>
      <div>
        <div class="box-title">Handover & Geolocation Telemetry</div>
        <div style="font-size: 12px; margin-bottom: 6px;"><strong>GPS Stamp:</strong> ${gpsCoord}</div>
        <div style="font-size: 12px; margin-bottom: 6px;"><strong>Delivered By:</strong> ${pod.deliveredBy || 'Express Courier Agent'}</div>
        <div style="font-size: 12px; margin-bottom: 6px;"><strong>Courier Phone:</strong> ${pod.riderPhone || '+91 9876543210'}</div>
        <div style="font-size: 12px; margin-bottom: 6px;"><strong>Client Device:</strong> ${pod.deviceInfo || 'Standard Web Client'}</div>
        ${pod.podNotes ? `<div style="font-size: 12px; margin-top: 6px; padding: 6px 10px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; color: #92400e;"><strong>Rider Note:</strong> ${pod.podNotes}</div>` : ''}
      </div>
    </div>

    <div class="legal-notice">
      This document certifies the successful physical handover of items listed above under AuraMarket Express verified doorstep protocol. The digital signature and timestamp above constitute legally binding proof of receipt under Indian Information Technology Act, 2000.
    </div>

    <div class="no-print" style="margin-top: 24px; text-align: center;">
      <button class="print-btn" onclick="window.print()">🖨️ Print Proof of Delivery (POD)</button>
    </div>
  </div>
</body>
</html>`;

    res.status(200).send(html);
  } catch (error) {
    next(error);
  }
};

// @desc    Point 12: Calculate Split Payment & Partial COD Breakdown
// @route   POST /api/orders/calculate-split
exports.calculateSplitPayment = async (req, res, next) => {
  try {
    const totalAmount = Number(req.body.totalAmount || 0);
    if (totalAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid totalAmount greater than 0 is required' });
    }

    const User = require('../models/User');
    const user = await User.findById(req.user._id).select('walletBalance');
    const walletBalance = user ? (user.walletBalance || 0) : 0;

    const maxWalletApplicable = Math.min(walletBalance, totalAmount);
    let selectedWallet = Number(req.body.walletAmount !== undefined ? req.body.walletAmount : maxWalletApplicable);
    selectedWallet = Math.max(0, Math.min(selectedWallet, maxWalletApplicable));

    const remainingOnlinePayable = Math.max(0, totalAmount - selectedWallet);

    // Partial COD advance calculation
    const advancePercentage = Number(req.body.advancePercentage || 15);
    const calculatedAdvance = Math.max(100, Math.round((totalAmount * advancePercentage) / 100));
    const customAdvance = req.body.customAdvanceAmount !== undefined ? Number(req.body.customAdvanceAmount) : calculatedAdvance;
    const finalAdvance = Math.min(totalAmount - 1, Math.max(50, customAdvance));
    const remainingCodDue = Math.max(0, totalAmount - finalAdvance);

    return res.status(200).json({
      success: true,
      totalAmount,
      walletBalance,
      splitSummary: {
        walletAmount: selectedWallet,
        onlineAmount: remainingOnlinePayable,
        isSplitFeasible: walletBalance > 0,
        fullyCoveredByWallet: selectedWallet >= totalAmount,
      },
      partialCodSummary: {
        eligible: totalAmount >= 300,
        advanceAmount: finalAdvance,
        remainingCodDue,
        advancePercentage,
        walletCanCoverAdvance: walletBalance >= finalAdvance,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add or Update Rider Tip for an existing order (Point 14)
// @route   POST /api/orders/:id/tip
// @access  Private
exports.addOrderTip = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tipAmount = Number(req.body.tipAmount);
    const paymentMethod = req.body.paymentMethod || 'WALLET';

    if (!tipAmount || tipAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid tip amount greater than 0 is required.',
      });
    }

    const order = await Order.findById(id).populate('subOrders');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    // Security check: Only the customer who placed the order or admin can tip
    if (req.user.role !== 'superadmin' && order.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add a tip to this order.',
      });
    }

    // If paid via wallet, check balance and deduct
    if (paymentMethod === 'WALLET') {
      const user = await User.findById(req.user._id);
      if (!user || (user.walletBalance || 0) < tipAmount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient wallet balance. You have ₹${user?.walletBalance || 0}, but tip amount is ₹${tipAmount}.`,
        });
      }
      user.walletBalance = Math.max(0, user.walletBalance - tipAmount);
      await user.save();

      const WalletTransaction = require('../models/WalletTransaction');
      await WalletTransaction.create({
        user: user._id,
        order: order._id,
        orderNumber: order.orderNumber,
        type: 'DEBIT',
        category: 'RIDER_TIP',
        amount: tipAmount,
        currency: 'INR',
        paymentMethod: 'WALLET',
        title: 'Delivery Rider Tip',
        description: `₹${tipAmount} tip added for delivery rider on Order #${order.orderNumber}`,
        balanceAfter: user.walletBalance,
      }).catch(err => console.error('Failed to log wallet tip txn:', err));
    }

    // Update Order tipAmount
    order.tipAmount = (order.tipAmount || 0) + tipAmount;

    // Find assigned delivery partner through DeliveryTask or SubOrder
    const DeliveryTask = mongoose.models.DeliveryTask || require('../models/DeliveryTask');
    let task = null;
    if (order.subOrders && order.subOrders.length > 0) {
      const subOrderIds = order.subOrders.map(s => s._id || s);
      task = await DeliveryTask.findOne({ subOrder: { $in: subOrderIds } });
    }

    let riderCredited = false;
    let riderName = 'Delivery Partner';

    if (task && task.deliveryPartner) {
      const rider = await User.findById(task.deliveryPartner);
      if (rider) {
        rider.tipEarnings = (rider.tipEarnings || 0) + tipAmount;
        rider.walletBalance = (rider.walletBalance || 0) + tipAmount;
        await rider.save();
        riderCredited = true;
        riderName = rider.name || 'Delivery Partner';
      }
      task.tipAmount = (task.tipAmount || 0) + tipAmount;
      task.tipPaidOut = true;
      await task.save();
    }

    if (riderCredited) {
      order.tipPaidToRider = true;
      order.tipCreditedAt = new Date();
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: `Thank you! ₹${tipAmount} tip added successfully. 100% of this tip goes directly to ${riderName}.`,
      tipAmount: order.tipAmount,
      tipPaidToRider: order.tipPaidToRider,
      riderName: riderCredited ? riderName : null,
      order,
    });
  } catch (error) {
    next(error);
  }
};

