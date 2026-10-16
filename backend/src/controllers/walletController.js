const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const ScratchCardReward = require('../models/ScratchCardReward');
const AuditLog = require('../models/AuditLog');

// @desc    Get Customer Wallet Balance, Coins, & Transaction History
// @route   GET /api/wallet
// @access  Customer / Authenticated
exports.getWallet = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Default fallback values if fields uninitialized
    if (typeof user.walletBalance !== 'number') {
      user.walletBalance = 250;
    }
    if (typeof user.walletCoins !== 'number') {
      user.walletCoins = 500;
    }

    // Fetch existing transactions
    let transactions = await WalletTransaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50);

    // If zero transactions exist, bootstrap initial welcome transactions
    if (transactions.length === 0) {
      const welcomeBonus = await WalletTransaction.create({
        user: userId,
        type: 'CREDIT',
        currency: 'COINS',
        amount: user.walletCoins || 500,
        category: 'WELCOME_BONUS',
        title: '🎉 Welcome Reward Coins',
        description: 'Joined AuraMarket platform rewards club',
        balanceAfter: user.walletBalance || 250,
        coinsAfter: user.walletCoins || 500,
      });

      const welcomeWallet = await WalletTransaction.create({
        user: userId,
        type: 'CREDIT',
        currency: 'INR',
        amount: user.walletBalance || 250,
        category: 'WELCOME_BONUS',
        title: '💵 Welcome Wallet Credit',
        description: 'Complimentary starter balance for first purchase',
        balanceAfter: user.walletBalance || 250,
        coinsAfter: user.walletCoins || 500,
      });

      transactions = [welcomeBonus, welcomeWallet];
      await user.save();
    }

    // Telemetry aggregations
    const unclaimedScratchCardsCount = await ScratchCardReward.countDocuments({
      user: userId,
      isClaimed: false,
      expiresAt: { $gt: new Date() },
    });

    const aggregates = await WalletTransaction.aggregate([
      { $match: { user: user._id, status: 'SUCCESS' } },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
        },
      },
    ]);

    let totalLoaded = 0;
    let totalSpent = 0;
    let totalRewardsEarned = 0;

    for (const agg of aggregates) {
      if (agg._id === 'WALLET_TOPUP' || agg._id === 'ADMIN_CREDIT') totalLoaded += agg.total;
      if (agg._id === 'WALLET_PAYMENT') totalSpent += agg.total;
      if (agg._id === 'SCRATCH_CARD' || agg._id === 'CASHBACK') totalRewardsEarned += agg.total;
    }

    res.status(200).json({
      success: true,
      data: {
        walletBalance: user.walletBalance,
        walletCoins: user.walletCoins,
        coinValueRatio: 1, // 1 Coin = ₹1
        cashbackRate: 5, // 5% cashback on purchases
        unclaimedScratchCardsCount,
        totalLoaded,
        totalSpent,
        totalRewardsEarned,
        transactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Daily Check-in Reward Coins (+50 Coins)
// @route   POST /api/wallet/daily-checkin
// @access  Customer / Authenticated
exports.claimDailyCheckin = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if claimed in last 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCheckin = await WalletTransaction.findOne({
      user: userId,
      category: 'DAILY_CHECKIN',
      createdAt: { $gte: oneDayAgo },
    });

    if (recentCheckin) {
      return res.status(400).json({
        success: false,
        message: 'You have already claimed today’s check-in bonus! Check back tomorrow for more coins.',
      });
    }

    const checkinCoins = 50;
    user.walletCoins = (user.walletCoins || 0) + checkinCoins;
    await user.save();

    const txn = await WalletTransaction.create({
      user: userId,
      type: 'CREDIT',
      currency: 'COINS',
      amount: checkinCoins,
      category: 'DAILY_CHECKIN',
      title: '🌟 Daily Check-In Bonus',
      description: 'Daily streak reward coins credited',
      balanceAfter: user.walletBalance || 0,
      coinsAfter: user.walletCoins,
    });

    res.status(200).json({
      success: true,
      message: `🎉 Success! +${checkinCoins} Reward Coins added to your wallet!`,
      data: {
        walletCoins: user.walletCoins,
        walletBalance: user.walletBalance,
        transaction: txn,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Convert / Redeem Coins into Wallet Balance (INR)
// @route   POST /api/wallet/redeem-coins
// @access  Customer / Authenticated
exports.redeemCoins = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { coins } = req.body;
    const coinsToRedeem = Number(coins);

    if (!coinsToRedeem || coinsToRedeem < 10) {
      return res.status(400).json({
        success: false,
        message: 'Minimum 10 coins required for direct conversion into wallet cash.',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if ((user.walletCoins || 0) < coinsToRedeem) {
      return res.status(400).json({
        success: false,
        message: `Insufficient coins. You currently have ${user.walletCoins || 0} coins.`,
      });
    }

    // 1 Coin = ₹1 cash conversion
    const cashValue = coinsToRedeem;
    user.walletCoins -= coinsToRedeem;
    user.walletBalance = (user.walletBalance || 0) + cashValue;
    await user.save();

    // Debit Coins Transaction
    await WalletTransaction.create({
      user: userId,
      type: 'DEBIT',
      currency: 'COINS',
      amount: coinsToRedeem,
      category: 'COIN_REDEMPTION',
      title: '🔄 Coins Converted to Wallet Cash',
      description: `Converted ${coinsToRedeem} coins to ₹${cashValue} spendable cash`,
      balanceAfter: user.walletBalance,
      coinsAfter: user.walletCoins,
    });

    // Credit INR Transaction
    const creditTxn = await WalletTransaction.create({
      user: userId,
      type: 'CREDIT',
      currency: 'INR',
      amount: cashValue,
      category: 'COIN_REDEMPTION',
      title: `💵 Converted from ${coinsToRedeem} Coins`,
      description: `Instant wallet balance top-up via reward coins`,
      balanceAfter: user.walletBalance,
      coinsAfter: user.walletCoins,
    });

    res.status(200).json({
      success: true,
      message: `🎉 Successfully converted ${coinsToRedeem} coins into ₹${cashValue} wallet cash!`,
      data: {
        walletCoins: user.walletCoins,
        walletBalance: user.walletBalance,
        transaction: creditTxn,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Active Top-Up Recharge Preset Packs & Bonuses
// @route   GET /api/wallet/topup/preset-packs
// @access  Customer / Authenticated
exports.getPresetPacks = async (req, res, next) => {
  try {
    const packs = [
      {
        id: 'pack_500',
        amount: 500,
        bonusCash: 25,
        bonusCoins: 50,
        bonusPercent: 5,
        badge: 'POPULAR',
        tag: '+₹25 Bonus',
        description: 'Ideal for daily essentials & quick purchases',
      },
      {
        id: 'pack_1000',
        amount: 1000,
        bonusCash: 75,
        bonusCoins: 150,
        bonusPercent: 7.5,
        badge: 'BEST VALUE',
        tag: '+₹75 Bonus',
        description: 'Extra ₹75 bonus cash + 150 loyalty coins',
      },
      {
        id: 'pack_2000',
        amount: 2000,
        bonusCash: 200,
        bonusCoins: 400,
        bonusPercent: 10,
        badge: 'HOT DEAL',
        tag: '+₹200 Bonus',
        description: 'Instant 10% cash booster + 400 loyalty coins',
      },
      {
        id: 'pack_5000',
        amount: 5000,
        bonusCash: 600,
        bonusCoins: 1200,
        bonusPercent: 12,
        badge: 'VIP CLUB',
        tag: '+₹600 Bonus',
        description: 'Massive 12% cash booster + 1,200 VIP coins',
      },
    ];

    res.status(200).json({
      success: true,
      data: {
        packs,
        minTopup: 10,
        maxTopup: 50000,
        activePromos: [
          { code: 'WALLET10', description: '10% Extra Cashback on topups ₹500+ (Max ₹150)' },
          { code: 'WELCOME50', description: 'Flat ₹50 Extra Bonus on first recharge ₹500+' },
          { code: 'COINBOOST', description: 'Instant +250 Reward Coins booster' },
        ],
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Top-Up Customer Wallet via UPI, Cards, or Netbanking with Tier Bonuses & Promo Codes
// @route   POST /api/wallet/topup
// @access  Customer / Authenticated
exports.topUpWallet = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { amount, paymentMethod = 'UPI', promoCode, transactionReference } = req.body;
    const topUpAmount = Number(amount);

    if (!topUpAmount || isNaN(topUpAmount) || topUpAmount < 10) {
      return res.status(400).json({
        success: false,
        message: 'Minimum top-up amount is ₹10.',
      });
    }

    if (topUpAmount > 50000) {
      return res.status(400).json({
        success: false,
        message: 'Maximum single top-up amount cannot exceed ₹50,000.',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Tier-based cashback bonus calculation
    let bonusCash = 0;
    let bonusCoins = 0;

    if (topUpAmount >= 5000) {
      bonusCash = Math.round(topUpAmount * 0.12);
      bonusCoins = 1200;
    } else if (topUpAmount >= 2000) {
      bonusCash = Math.round(topUpAmount * 0.10);
      bonusCoins = 400;
    } else if (topUpAmount >= 1000) {
      bonusCash = Math.round(topUpAmount * 0.075);
      bonusCoins = 150;
    } else if (topUpAmount >= 500) {
      bonusCash = Math.round(topUpAmount * 0.05);
      bonusCoins = 50;
    }

    // Promo code bonus evaluation
    let promoBonusCash = 0;
    let promoBonusCoins = 0;
    const cleanPromo = promoCode ? promoCode.toString().trim().toUpperCase() : null;

    if (cleanPromo === 'WALLET10' && topUpAmount >= 500) {
      promoBonusCash = Math.min(150, Math.round(topUpAmount * 0.10));
    } else if (cleanPromo === 'WELCOME50' && topUpAmount >= 500) {
      promoBonusCash = 50;
    } else if (cleanPromo === 'COINBOOST') {
      promoBonusCoins = 250;
    }

    const totalBonusCash = bonusCash + promoBonusCash;
    const totalBonusCoins = bonusCoins + promoBonusCoins;
    const totalCreditedAmount = topUpAmount + totalBonusCash;

    user.walletBalance = (user.walletBalance || 0) + totalCreditedAmount;
    if (totalBonusCoins > 0) {
      user.walletCoins = (user.walletCoins || 0) + totalBonusCoins;
    }
    await user.save();

    const txnRef = transactionReference || `TXN_TOPUP_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const txn = await WalletTransaction.create({
      user: userId,
      type: 'CREDIT',
      currency: 'INR',
      amount: totalCreditedAmount,
      category: 'WALLET_TOPUP',
      paymentMethod: ['UPI', 'CARD', 'NETBANKING', 'RAZORPAY', 'STRIPE', 'PHONEPE'].includes(paymentMethod)
        ? paymentMethod
        : 'UPI',
      transactionReference: txnRef,
      status: 'SUCCESS',
      bonusAmount: totalBonusCash,
      bonusCoins: totalBonusCoins,
      promoCode: cleanPromo,
      title: `💳 Wallet Recharge via ${paymentMethod}`,
      description: `Loaded ₹${topUpAmount}${totalBonusCash > 0 ? ` (+₹${totalBonusCash} Bonus)` : ''} successfully`,
      balanceAfter: user.walletBalance,
      coinsAfter: user.walletCoins || 0,
    });

    res.status(200).json({
      success: true,
      message: `🎉 ₹${topUpAmount} added to your wallet successfully!${
        totalBonusCash > 0 ? ` You received ₹${totalBonusCash} extra bonus cash!` : ''
      }`,
      data: {
        amountAdded: topUpAmount,
        bonusCash: totalBonusCash,
        bonusCoins: totalBonusCoins,
        walletBalance: user.walletBalance,
        walletCoins: user.walletCoins,
        transaction: txn,
      },
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// Point #72: Gamified Post-Purchase Scratch Card Reward System
// =========================================================================

// @desc    Generate / Unlock a Post-Purchase Scratch Card for an Order (Point #72)
// @route   POST /api/wallet/scratch-card/generate
// @access  Customer / Authenticated
exports.generateScratchCard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId is required to generate a scratch card.' });
    }

    // Lookup order by MongoDB ObjectId or orderNumber
    let order;
    if (orderId.toString().match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(orderId);
    }
    if (!order) {
      order = await Order.findOne({ orderNumber: orderId });
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found for scratch card reward.' });
    }

    // Point #72 Security & Authorization: Order must belong to the requesting customer (unless admin)
    if (
      order.customer &&
      order.customer.toString() !== userId.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to unlock rewards for this order.',
      });
    }

    // Point #72 Status Validation: Cancelled or failed orders cannot earn post-purchase rewards
    if (order.status === 'CANCELLED' || order.paymentStatus === 'FAILED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot generate scratch card for cancelled or failed orders.',
      });
    }

    // Check if card already exists for this order
    let existingCard = await ScratchCardReward.findOne({ order: order._id });
    if (existingCard) {
      return res.status(200).json({
        success: true,
        message: 'Existing scratch card retrieved for order.',
        card: existingCard,
      });
    }

    // Reward Pool generator
    const rewardOptions = [
      {
        rewardType: 'WALLET_COINS',
        amount: 250,
        title: '🎉 Jackpot: 250 Reward Coins!',
        description: 'Instant +250 Coins credited to your digital rewards wallet.',
        badgeText: '+250 COINS',
      },
      {
        rewardType: 'WALLET_COINS',
        amount: 150,
        title: '🪙 Lucky Draw: 150 Coins!',
        description: 'Earned 150 loyalty coins for your shopping!',
        badgeText: '+150 COINS',
      },
      {
        rewardType: 'WALLET_CASH',
        amount: 100,
        title: '💵 Cash Drop: ₹100 Wallet Cash!',
        description: 'Instant ₹100 direct shopping credit added to your balance.',
        badgeText: '₹100 CASH',
      },
      {
        rewardType: 'COUPON_DISCOUNT',
        amount: 25,
        couponCode: `LUCKY25-${order.orderNumber ? order.orderNumber.slice(-4) : '2026'}`,
        title: '🎁 VIP Voucher: 25% OFF!',
        description: 'Unlock 25% off up to ₹1,000 on your next order!',
        badgeText: '25% OFF',
      },
    ];

    let chosen = rewardOptions.find(r => req.body.rewardType && r.rewardType === req.body.rewardType);
    if (!chosen) {
      chosen = rewardOptions[Math.floor(Math.random() * rewardOptions.length)];
    }

    let card;
    try {
      card = await ScratchCardReward.create({
        user: userId,
        order: order._id,
        orderNumber: order.orderNumber,
        rewardType: chosen.rewardType,
        amount: chosen.amount,
        couponCode: chosen.couponCode || null,
        badgeText: chosen.badgeText || '',
        title: chosen.title,
        description: chosen.description,
        isScratched: false,
        isClaimed: false,
      });
    } catch (createErr) {
      if (createErr.code === 11000) {
        existingCard = await ScratchCardReward.findOne({ order: order._id });
        if (existingCard) {
          return res.status(200).json({
            success: true,
            message: 'Existing scratch card retrieved for order.',
            card: existingCard,
          });
        }
      }
      throw createErr;
    }

    res.status(201).json({
      success: true,
      message: 'Post-purchase mystery scratch card unlocked!',
      card,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark Scratch Card as Scratched / Revealed (Point #72 & Point #16)
// @route   POST /api/wallet/scratch-card/:id/scratch
// @access  Customer / Authenticated
exports.scratchCard = async (req, res, next) => {
  try {
    const card = await ScratchCardReward.findOne({ _id: req.params.id, user: req.user._id });
    if (!card) {
      return res.status(404).json({ success: false, message: 'Scratch card not found.' });
    }

    const { scratchPercentage = 100 } = req.body;
    card.isScratched = true;
    card.scratchPercentage = Math.min(100, Math.max(Number(scratchPercentage) || 100, card.scratchPercentage || 0));
    if (!card.scratchedAt) {
      card.scratchedAt = new Date();
    }
    await card.save();

    res.status(200).json({
      success: true,
      message: 'Scratch card revealed!',
      card,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Claim Scratch Card Reward (Credit coins/cash to wallet or coupon) (Point #72)
// @route   POST /api/wallet/scratch-card/:id/claim
// @access  Customer / Authenticated
exports.claimScratchCard = async (req, res, next) => {
  try {
    const card = await ScratchCardReward.findOne({ _id: req.params.id, user: req.user._id });
    if (!card) {
      return res.status(404).json({ success: false, message: 'Scratch card not found.' });
    }

    if (card.isClaimed) {
      return res.status(400).json({ success: false, message: 'Scratch card reward has already been claimed.' });
    }

    // Expiry verification: Disallow claims after expiration date
    if (card.expiresAt && new Date(card.expiresAt) < new Date()) {
      return res.status(400).json({ success: false, message: 'This scratch card reward has expired.' });
    }

    // Atomic claim lock: Prevents concurrent race conditions and double claiming
    const updatedCard = await ScratchCardReward.findOneAndUpdate(
      { _id: card._id, user: req.user._id, isClaimed: false },
      { $set: { isClaimed: true, isScratched: true, claimedAt: new Date() } },
      { new: true }
    );

    if (!updatedCard) {
      return res.status(400).json({ success: false, message: 'Scratch card reward has already been claimed.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    let txn = null;

    if (updatedCard.rewardType === 'WALLET_COINS') {
      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { $inc: { walletCoins: updatedCard.amount } },
        { new: true }
      );

      txn = await WalletTransaction.create({
        user: updatedUser._id,
        type: 'CREDIT',
        currency: 'COINS',
        amount: updatedCard.amount,
        category: 'SCRATCH_CARD',
        title: updatedCard.title || '🎁 Post-Purchase Mystery Scratch Card',
        description: `Won +${updatedCard.amount} Coins from Order #${updatedCard.orderNumber}`,
        order: updatedCard.order,
        orderNumber: updatedCard.orderNumber,
        balanceAfter: updatedUser.walletBalance || 0,
        coinsAfter: updatedUser.walletCoins,
      });

      return res.status(200).json({
        success: true,
        message: `🎉 Reward claimed successfully!`,
        data: {
          card: updatedCard,
          walletBalance: updatedUser.walletBalance,
          walletCoins: updatedUser.walletCoins,
          transaction: txn,
        },
      });
    } else if (updatedCard.rewardType === 'WALLET_CASH') {
      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { $inc: { walletBalance: updatedCard.amount } },
        { new: true }
      );

      txn = await WalletTransaction.create({
        user: updatedUser._id,
        type: 'CREDIT',
        currency: 'INR',
        amount: updatedCard.amount,
        category: 'SCRATCH_CARD',
        title: updatedCard.title || '🎁 Post-Purchase Cash Drop',
        description: `Won ₹${updatedCard.amount} Wallet Cash from Order #${updatedCard.orderNumber}`,
        order: updatedCard.order,
        orderNumber: updatedCard.orderNumber,
        balanceAfter: updatedUser.walletBalance,
        coinsAfter: updatedUser.walletCoins || 0,
      });

      return res.status(200).json({
        success: true,
        message: `🎉 Reward claimed successfully!`,
        data: {
          card: updatedCard,
          walletBalance: updatedUser.walletBalance,
          walletCoins: updatedUser.walletCoins,
          transaction: txn,
        },
      });
    } else if (updatedCard.rewardType === 'COUPON_DISCOUNT') {
      // Ensure active Coupon exists
      let coupon = await Coupon.findOne({ code: updatedCard.couponCode });
      if (!coupon) {
        coupon = await Coupon.create({
          code: updatedCard.couponCode,
          title: updatedCard.title,
          description: updatedCard.description,
          discountType: 'PERCENTAGE',
          discountValue: updatedCard.amount,
          maxDiscountAmount: 1000,
          minOrderAmount: 499,
          isActive: true,
          expiryDate: updatedCard.expiresAt,
        });
      }

      return res.status(200).json({
        success: true,
        message: `🎉 Reward claimed successfully!`,
        data: {
          card: updatedCard,
          walletBalance: user.walletBalance || 0,
          walletCoins: user.walletCoins || 0,
          coupon,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: `🎉 Reward claimed successfully!`,
      data: {
        card: updatedCard,
        walletBalance: user.walletBalance,
        walletCoins: user.walletCoins,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get All Unlocked Scratch Cards for Logged-In User (Point #72)
// @route   GET /api/wallet/scratch-cards
// @access  Customer / Authenticated
exports.getMyScratchCards = async (req, res, next) => {
  try {
    const { orderId } = req.query;
    const filter = { user: req.user._id };

    if (orderId) {
      if (orderId.toString().match(/^[0-9a-fA-F]{24}$/)) {
        filter.$or = [{ order: orderId }, { orderNumber: orderId }];
      } else {
        filter.orderNumber = orderId;
      }
    }

    const cards = await ScratchCardReward.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: cards.length,
      cards,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// POINT 16: SUPER ADMIN WALLET & REWARDS COMMAND CENTER
// =========================================================================

// @desc    Super Admin Wallet & Liabilities Command Center
// @route   GET /api/wallet/admin/overview
// @access  Super Admin / Sub-admin
exports.getAdminWalletOverview = async (req, res, next) => {
  try {
    const userAggregate = await User.aggregate([
      {
        $group: {
          _id: null,
          totalWalletLiability: { $sum: '$walletBalance' },
          totalCoinsCirculation: { $sum: '$walletCoins' },
          totalUsersWithBalance: {
            $sum: {
              $cond: [{ $gt: ['$walletBalance', 0] }, 1, 0],
            },
          },
        },
      },
    ]);

    const stats = userAggregate[0] || {
      totalWalletLiability: 0,
      totalCoinsCirculation: 0,
      totalUsersWithBalance: 0,
    };

    const topUpAggregate = await WalletTransaction.aggregate([
      { $match: { category: 'WALLET_TOPUP', status: 'SUCCESS' } },
      {
        $group: {
          _id: null,
          totalTopUpVolume: { $sum: '$amount' },
          topUpCount: { $sum: 1 },
          totalBonusDisbursed: { $sum: '$bonusAmount' },
        },
      },
    ]);

    const topUpStats = topUpAggregate[0] || {
      totalTopUpVolume: 0,
      topUpCount: 0,
      totalBonusDisbursed: 0,
    };

    const scratchStats = {
      totalIssued: await ScratchCardReward.countDocuments(),
      totalScratched: await ScratchCardReward.countDocuments({ isScratched: true }),
      totalClaimed: await ScratchCardReward.countDocuments({ isClaimed: true }),
      unclaimedPending: await ScratchCardReward.countDocuments({ isClaimed: false, expiresAt: { $gt: new Date() } }),
    };

    const recentTransactions = await WalletTransaction.find()
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(30);

    res.status(200).json({
      success: true,
      data: {
        totalWalletLiability: stats.totalWalletLiability,
        totalCoinsCirculation: stats.totalCoinsCirculation,
        totalUsersWithBalance: stats.totalUsersWithBalance,
        totalTopUpVolume: topUpStats.totalTopUpVolume,
        topUpCount: topUpStats.topUpCount,
        totalBonusDisbursed: topUpStats.totalBonusDisbursed,
        scratchStats,
        recentTransactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Super Admin Manual Customer Wallet Adjustment (Credit or Debit)
// @route   POST /api/wallet/admin/adjust
// @access  Super Admin
exports.adminAdjustCustomerWallet = async (req, res, next) => {
  try {
    const { userId, type, currency = 'INR', amount, reason } = req.body;
    const adjustAmount = Number(amount);

    if (!userId) {
      return res.status(400).json({ success: false, message: 'Customer userId is required.' });
    }
    if (!adjustAmount || isNaN(adjustAmount) || adjustAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive adjustment amount required.' });
    }
    if (!['CREDIT', 'DEBIT'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Adjustment type must be CREDIT or DEBIT.' });
    }
    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'Adjustment reason must be at least 5 characters.' });
    }

    const customer = await User.findById(userId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    if (type === 'DEBIT') {
      if (currency === 'INR' && (customer.walletBalance || 0) < adjustAmount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient wallet cash. Customer only has ₹${customer.walletBalance || 0}.`,
        });
      }
      if (currency === 'COINS' && (customer.walletCoins || 0) < adjustAmount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient coins. Customer only has ${customer.walletCoins || 0} coins.`,
        });
      }
    }

    if (currency === 'INR') {
      customer.walletBalance = type === 'CREDIT'
        ? (customer.walletBalance || 0) + adjustAmount
        : Math.max(0, (customer.walletBalance || 0) - adjustAmount);
    } else {
      customer.walletCoins = type === 'CREDIT'
        ? (customer.walletCoins || 0) + adjustAmount
        : Math.max(0, (customer.walletCoins || 0) - adjustAmount);
    }

    await customer.save();

    const category = type === 'CREDIT' ? 'ADMIN_CREDIT' : 'ADMIN_DEBIT';
    const txn = await WalletTransaction.create({
      user: customer._id,
      type,
      currency,
      amount: adjustAmount,
      category,
      paymentMethod: 'SYSTEM',
      transactionReference: `ADJ_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      status: 'SUCCESS',
      title: type === 'CREDIT' ? '⚖️ Admin Wallet Credit' : '⚖️ Admin Wallet Debit',
      description: reason.trim(),
      balanceAfter: customer.walletBalance || 0,
      coinsAfter: customer.walletCoins || 0,
    });

    // Immutable Audit Log
    try {
      await AuditLog.create({
        action: 'ADJUST_WALLET',
        module: 'FINANCE',
        performedBy: req.user._id,
        userName: req.user.name || 'Super Admin',
        userEmail: req.user.email || 'admin@auramarket.com',
        userRole: req.user.role || 'superadmin',
        targetId: customer._id.toString(),
        targetType: 'CustomerWallet',
        description: `Manual wallet ${type.toLowerCase()} of ${currency === 'INR' ? '₹' : ''}${adjustAmount} ${currency === 'COINS' ? 'coins' : ''}: ${reason}`,
        changeSummary: `${type} ${currency} ${adjustAmount}`,
        details: {
          customerEmail: customer.email,
          adjustmentType: type,
          currency,
          amount: adjustAmount,
          reason,
          balanceAfter: customer.walletBalance,
        },
        ipAddress: req.ip || '',
      });
    } catch (auditErr) {
      console.warn('AuditLog note:', auditErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Successfully ${type.toLowerCase()}ed ${currency === 'INR' ? '₹' : ''}${adjustAmount} ${currency === 'COINS' ? 'coins ' : ''}to ${customer.name}'s wallet.`,
      data: {
        customer: {
          _id: customer._id,
          name: customer.name,
          email: customer.email,
          walletBalance: customer.walletBalance,
          walletCoins: customer.walletCoins,
        },
        transaction: txn,
      },
    });
  } catch (error) {
    next(error);
  }
};


