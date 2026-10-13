const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');

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
