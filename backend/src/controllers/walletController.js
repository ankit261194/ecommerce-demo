const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const ScratchCardReward = require('../models/ScratchCardReward');

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

    res.status(200).json({
      success: true,
      data: {
        walletBalance: user.walletBalance,
        walletCoins: user.walletCoins,
        coinValueRatio: 1, // 1 Coin = ₹1
        cashbackRate: 5, // 5% cashback on purchases
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

// @desc    Add Test Funds / Top-Up Wallet (Instant simulation for demo/testing)
// @route   POST /api/wallet/topup
// @access  Customer / Authenticated
exports.topUpWallet = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { amount } = req.body;
    const topUpAmount = Number(amount);

    if (!topUpAmount || topUpAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive top-up amount required.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.walletBalance = (user.walletBalance || 0) + topUpAmount;
    await user.save();

    const txn = await WalletTransaction.create({
      user: userId,
      type: 'CREDIT',
      currency: 'INR',
      amount: topUpAmount,
      category: 'ADMIN_CREDIT',
      title: '💳 Wallet Top-Up via UPI',
      description: `Added ₹${topUpAmount} via Instant UPI payment`,
      balanceAfter: user.walletBalance,
      coinsAfter: user.walletCoins || 0,
    });

    res.status(200).json({
      success: true,
      message: `₹${topUpAmount} added to your wallet successfully!`,
      data: {
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

    // Check if card already exists for this order
    let existingCard = await ScratchCardReward.findOne({ order: order._id, user: userId });
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

    const card = await ScratchCardReward.create({
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

    res.status(201).json({
      success: true,
      message: 'Post-purchase mystery scratch card unlocked!',
      card,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark Scratch Card as Scratched / Revealed (Point #72)
// @route   POST /api/wallet/scratch-card/:id/scratch
// @access  Customer / Authenticated
exports.scratchCard = async (req, res, next) => {
  try {
    const card = await ScratchCardReward.findOne({ _id: req.params.id, user: req.user._id });
    if (!card) {
      return res.status(404).json({ success: false, message: 'Scratch card not found.' });
    }

    card.isScratched = true;
    card.scratchedAt = new Date();
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

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    let txn = null;

    if (card.rewardType === 'WALLET_COINS') {
      user.walletCoins = (user.walletCoins || 0) + card.amount;
      await user.save();

      txn = await WalletTransaction.create({
        user: user._id,
        type: 'CREDIT',
        currency: 'COINS',
        amount: card.amount,
        category: 'SCRATCH_CARD',
        title: card.title || '🎁 Post-Purchase Mystery Scratch Card',
        description: `Won +${card.amount} Coins from Order #${card.orderNumber}`,
        order: card.order,
        orderNumber: card.orderNumber,
        balanceAfter: user.walletBalance || 0,
        coinsAfter: user.walletCoins,
      });
    } else if (card.rewardType === 'WALLET_CASH') {
      user.walletBalance = (user.walletBalance || 0) + card.amount;
      await user.save();

      txn = await WalletTransaction.create({
        user: user._id,
        type: 'CREDIT',
        currency: 'INR',
        amount: card.amount,
        category: 'SCRATCH_CARD',
        title: card.title || '🎁 Post-Purchase Cash Drop',
        description: `Won ₹${card.amount} Wallet Cash from Order #${card.orderNumber}`,
        order: card.order,
        orderNumber: card.orderNumber,
        balanceAfter: user.walletBalance,
        coinsAfter: user.walletCoins || 0,
      });
    } else if (card.rewardType === 'COUPON_DISCOUNT') {
      // Ensure active Coupon exists
      let coupon = await Coupon.findOne({ code: card.couponCode });
      if (!coupon) {
        coupon = await Coupon.create({
          code: card.couponCode,
          title: card.title,
          description: card.description,
          discountType: 'PERCENTAGE',
          discountValue: card.amount,
          maxDiscountAmount: 1000,
          minOrderAmount: 499,
          isActive: true,
          expiryDate: card.expiresAt,
        });
      }
    }

    card.isScratched = true;
    card.isClaimed = true;
    card.claimedAt = new Date();
    await card.save();

    res.status(200).json({
      success: true,
      message: `🎉 Reward claimed successfully!`,
      data: {
        card,
        walletBalance: user.walletBalance,
        walletCoins: user.walletCoins,
        transaction: txn,
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

