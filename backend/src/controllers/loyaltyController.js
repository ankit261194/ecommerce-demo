const User = require('../models/User');
const LoyaltyTierConfig = require('../models/LoyaltyTierConfig');
const LoyaltyActivityLog = require('../models/LoyaltyActivityLog');
const WalletTransaction = require('../models/WalletTransaction');

/**
 * Helper to determine eligible tier for a given spend & orders count
 */
const evaluateTier = (config, lifetimeSpend, lifetimeOrdersCount) => {
  if (!config || !config.tiers || !config.tiers.length) {
    return 'BRONZE';
  }
  const tierRank = { BRONZE: 1, SILVER: 2, GOLD: 3, PLATINUM: 4, DIAMOND: 5 };
  const sortedTiers = [...config.tiers]
    .filter((t) => t.isActive !== false)
    .sort((a, b) => (tierRank[b.tier] || 0) - (tierRank[a.tier] || 0));

  for (const t of sortedTiers) {
    if (lifetimeSpend >= t.minSpend || (t.minOrders > 0 && lifetimeOrdersCount >= t.minOrders)) {
      return t.tier;
    }
  }
  return 'BRONZE';
};

/**
 * Public & Admin: Get Loyalty Program Configuration & Perks Matrix
 */
exports.getTierConfig = async (req, res) => {
  try {
    const config = await LoyaltyTierConfig.getOrCreateConfig();
    return res.status(200).json({
      success: true,
      data: config,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve loyalty configuration',
      error: err.message,
    });
  }
};

/**
 * Admin: Update Loyalty Program Configuration & Tier Thresholds
 */
exports.updateTierConfig = async (req, res) => {
  try {
    let config = await LoyaltyTierConfig.getOrCreateConfig();

    const {
      programEnabled,
      pointsToRupeeRatio,
      minRedeemPoints,
      maxRedeemPercentagePerOrder,
      dailyCheckInBasePoints,
      dailyCheckInStreakBonus,
      welcomeBonusPoints,
      autoPromoteEnabled,
      tiers,
    } = req.body;

    if (programEnabled !== undefined) config.programEnabled = !!programEnabled;
    if (pointsToRupeeRatio !== undefined) {
      if (Number(pointsToRupeeRatio) <= 0) {
        return res.status(400).json({ success: false, message: 'Points to rupee ratio must be greater than 0' });
      }
      config.pointsToRupeeRatio = Number(pointsToRupeeRatio);
    }
    if (minRedeemPoints !== undefined) config.minRedeemPoints = Math.max(0, Number(minRedeemPoints));
    if (maxRedeemPercentagePerOrder !== undefined) {
      const pct = Number(maxRedeemPercentagePerOrder);
      if (pct < 1 || pct > 100) {
        return res.status(400).json({ success: false, message: 'Max redeem percentage must be between 1 and 100' });
      }
      config.maxRedeemPercentagePerOrder = pct;
    }
    if (dailyCheckInBasePoints !== undefined) config.dailyCheckInBasePoints = Math.max(0, Number(dailyCheckInBasePoints));
    if (dailyCheckInStreakBonus !== undefined) config.dailyCheckInStreakBonus = Math.max(0, Number(dailyCheckInStreakBonus));
    if (welcomeBonusPoints !== undefined) config.welcomeBonusPoints = Math.max(0, Number(welcomeBonusPoints));
    if (autoPromoteEnabled !== undefined) config.autoPromoteEnabled = !!autoPromoteEnabled;

    if (Array.isArray(tiers) && tiers.length > 0) {
      // Validate each tier
      for (const t of tiers) {
        if (!['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'].includes(t.tier)) {
          return res.status(400).json({ success: false, message: `Invalid tier identifier: ${t.tier}` });
        }
        if (!t.name || !t.name.trim()) {
          return res.status(400).json({ success: false, message: `Tier ${t.tier} requires a name` });
        }
        if (t.minSpend < 0 || t.minOrders < 0) {
          return res.status(400).json({ success: false, message: `Minimum spend and orders cannot be negative` });
        }
      }
      config.tiers = tiers;
    }

    await config.save();

    return res.status(200).json({
      success: true,
      message: 'Loyalty program configuration updated successfully',
      data: config,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update loyalty configuration',
      error: err.message,
    });
  }
};

/**
 * Customer: Get My Loyalty Profile, Tier Progression & Recent Activity
 */
exports.getMyLoyaltyStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const config = await LoyaltyTierConfig.getOrCreateConfig();

    const currentTierName = (user.loyalty && user.loyalty.tier) || 'BRONZE';
    const currentTierDef = config.tiers.find((t) => t.tier === currentTierName) || config.tiers[0];

    // Determine next tier in ladder
    const tierLadder = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
    const currentIndex = tierLadder.indexOf(currentTierName);
    let nextTierDef = null;
    let spendNeededForNextTier = 0;
    let ordersNeededForNextTier = 0;
    let progressPercentage = 100;

    const lifetimeSpend = (user.loyalty && user.loyalty.lifetimeSpend) || 0;
    const lifetimeOrders = (user.loyalty && user.loyalty.lifetimeOrdersCount) || 0;

    if (currentIndex < tierLadder.length - 1) {
      const nextTierName = tierLadder[currentIndex + 1];
      nextTierDef = config.tiers.find((t) => t.tier === nextTierName);
      if (nextTierDef) {
        spendNeededForNextTier = Math.max(0, nextTierDef.minSpend - lifetimeSpend);
        ordersNeededForNextTier = Math.max(0, nextTierDef.minOrders - lifetimeOrders);

        const currentFloor = currentTierDef ? currentTierDef.minSpend : 0;
        const targetDiff = nextTierDef.minSpend - currentFloor;
        const achievedDiff = Math.max(0, lifetimeSpend - currentFloor);
        progressPercentage = targetDiff > 0 ? Math.min(100, Math.round((achievedDiff / targetDiff) * 100)) : 100;
      }
    }

    // Check daily check-in eligibility
    let canCheckInToday = true;
    const lastCheckIn = user.loyalty && user.loyalty.lastCheckInDate;
    if (lastCheckIn) {
      const lastDate = new Date(lastCheckIn).toISOString().slice(0, 10);
      const todayDate = new Date().toISOString().slice(0, 10);
      if (lastDate === todayDate) {
        canCheckInToday = false;
      }
    }

    // Fetch recent 10 activity logs
    const recentLogs = await LoyaltyActivityLog.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    return res.status(200).json({
      success: true,
      data: {
        currentTier: currentTierDef,
        nextTier: nextTierDef,
        spendNeededForNextTier,
        ordersNeededForNextTier,
        progressPercentage,
        pointsBalance: user.walletCoins || (user.loyalty && user.loyalty.pointsBalance) || 0,
        lifetimeSpend,
        lifetimeOrdersCount: lifetimeOrders,
        tierAchievedAt: (user.loyalty && user.loyalty.tierAchievedAt) || user.createdAt,
        canCheckInToday,
        checkInStreak: (user.loyalty && user.loyalty.checkInStreak) || 0,
        recentLogs,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve loyalty status',
      error: err.message,
    });
  }
};

/**
 * Customer: Gamified Daily Check-in with Streak Bonus
 */
exports.dailyCheckIn = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.loyalty) {
      user.loyalty = {
        tier: 'BRONZE',
        pointsBalance: user.walletCoins || 500,
        lifetimeSpend: 0,
        lifetimeOrdersCount: 0,
        checkInStreak: 0,
      };
    }

    const config = await LoyaltyTierConfig.getOrCreateConfig();
    if (!config.programEnabled) {
      return res.status(400).json({ success: false, message: 'Loyalty program is currently paused' });
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (user.loyalty.lastCheckInDate) {
      const lastCheckInStr = new Date(user.loyalty.lastCheckInDate).toISOString().slice(0, 10);
      if (lastCheckInStr === todayStr) {
        return res.status(400).json({
          success: false,
          message: 'Already checked in today! Come back tomorrow to continue your streak.',
        });
      }

      // Check if yesterday
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      if (lastCheckInStr === yesterdayStr) {
        user.loyalty.checkInStreak = (user.loyalty.checkInStreak || 0) + 1;
      } else {
        // Broken streak, reset to 1
        user.loyalty.checkInStreak = 1;
      }
    } else {
      user.loyalty.checkInStreak = 1;
    }

    const streak = user.loyalty.checkInStreak;
    // Streak multiplier bonus capped at 7 days
    const cappedStreak = Math.min(streak, 7);
    const pointsAwarded = config.dailyCheckInBasePoints + (cappedStreak - 1) * config.dailyCheckInStreakBonus;

    // Update user balance
    const currentCoins = user.walletCoins || 0;
    const newBalance = currentCoins + pointsAwarded;
    user.walletCoins = newBalance;
    user.loyalty.pointsBalance = newBalance;
    user.loyalty.lastCheckInDate = now;

    await user.save();

    // Create Loyalty Activity Log
    await LoyaltyActivityLog.create({
      user: user._id,
      type: 'DAILY_CHECKIN',
      points: pointsAwarded,
      balanceAfter: newBalance,
      tier: user.loyalty.tier || 'BRONZE',
      title: `Daily Check-In Reward (Day ${streak})`,
      description: `Claimed ${pointsAwarded} loyalty reward coins with a ${streak}-day check-in streak.`,
      metadata: { streak, basePoints: config.dailyCheckInBasePoints, streakBonus: pointsAwarded - config.dailyCheckInBasePoints },
    });

    // Create Wallet Transaction
    await WalletTransaction.create({
      user: user._id,
      type: 'CREDIT',
      currency: 'COINS',
      amount: pointsAwarded,
      category: 'DAILY_CHECKIN',
      paymentMethod: 'SYSTEM',
      title: `🪙 Daily Check-in Day ${streak}`,
      description: `Earned ${pointsAwarded} reward coins for daily attendance!`,
      balanceAfter: user.walletBalance || 0,
      coinsAfter: newBalance,
    });

    return res.status(200).json({
      success: true,
      message: `Successfully claimed ${pointsAwarded} coins! Current streak: ${streak} day(s).`,
      data: {
        pointsAwarded,
        streak,
        newPointsBalance: newBalance,
        lastCheckInDate: now,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to complete daily check-in',
      error: err.message,
    });
  }
};

/**
 * Admin: Get Paginated Customer Loyalty Directory
 */
exports.getAdminLoyaltyCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const { search, tier, sortBy } = req.query;

    const query = { role: 'customer' };

    if (tier && ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'].includes(tier)) {
      query['loyalty.tier'] = tier;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    let sortOption = { 'loyalty.lifetimeSpend': -1 };
    if (sortBy === 'pointsBalance') sortOption = { walletCoins: -1 };
    if (sortBy === 'lifetimeOrdersCount') sortOption = { 'loyalty.lifetimeOrdersCount': -1 };
    if (sortBy === 'createdAt') sortOption = { createdAt: -1 };

    const total = await User.countDocuments(query);
    const customers = await User.find(query)
      .select('name email phone role loyalty walletCoins walletBalance createdAt')
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      data: {
        customers,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch loyalty customers',
      error: err.message,
    });
  }
};

/**
 * Admin: Manually Adjust Customer Points (Credit / Debit with Audit Note)
 */
exports.adjustCustomerPoints = async (req, res) => {
  try {
    const { userId, points, type, reason } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }
    const numPoints = parseInt(points);
    if (isNaN(numPoints) || numPoints <= 0) {
      return res.status(400).json({ success: false, message: 'Points must be a positive integer' });
    }
    if (!['CREDIT', 'DEBIT'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be CREDIT or DEBIT' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Mandatory audit reason is required for points adjustment' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (!user.loyalty) {
      user.loyalty = {
        tier: 'BRONZE',
        pointsBalance: user.walletCoins || 500,
        lifetimeSpend: 0,
        lifetimeOrdersCount: 0,
      };
    }

    const currentBalance = user.walletCoins || 0;
    if (type === 'DEBIT' && currentBalance < numPoints) {
      return res.status(400).json({
        success: false,
        message: `Cannot debit ${numPoints} points. Customer only has ${currentBalance} points available.`,
      });
    }

    const balanceChange = type === 'CREDIT' ? numPoints : -numPoints;
    const newBalance = currentBalance + balanceChange;

    user.walletCoins = newBalance;
    user.loyalty.pointsBalance = newBalance;
    await user.save();

    // Log Activity
    const log = await LoyaltyActivityLog.create({
      user: user._id,
      type: 'ADMIN_ADJUSTMENT',
      points: balanceChange,
      balanceAfter: newBalance,
      tier: user.loyalty.tier || 'BRONZE',
      title: `Admin Adjustment: ${type === 'CREDIT' ? '+' : '-'}${numPoints} Points`,
      description: reason.trim(),
      performedBy: req.user._id,
      metadata: { adminEmail: req.user.email, type, reason },
    });

    // Log Wallet Transaction
    await WalletTransaction.create({
      user: user._id,
      type: type,
      currency: 'COINS',
      amount: numPoints,
      category: type === 'CREDIT' ? 'ADMIN_CREDIT' : 'ADMIN_DEBIT',
      paymentMethod: 'SYSTEM',
      title: `🛠️ Admin Points ${type === 'CREDIT' ? 'Credit' : 'Debit'}`,
      description: reason.trim(),
      balanceAfter: user.walletBalance || 0,
      coinsAfter: newBalance,
    });

    return res.status(200).json({
      success: true,
      message: `Successfully ${type.toLowerCase()}ed ${numPoints} points. New balance: ${newBalance}.`,
      data: {
        userId: user._id,
        pointsBalance: newBalance,
        log,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to adjust customer points',
      error: err.message,
    });
  }
};

/**
 * Admin: Override Customer VIP Tier (with optional tier lock)
 */
exports.overrideCustomerTier = async (req, res) => {
  try {
    const { userId, tier, tierLock, customDiscountPercentage, reason } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }
    if (!['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'].includes(tier)) {
      return res.status(400).json({ success: false, message: `Invalid tier: ${tier}` });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (!user.loyalty) {
      user.loyalty = {
        tier: 'BRONZE',
        pointsBalance: user.walletCoins || 500,
        lifetimeSpend: 0,
        lifetimeOrdersCount: 0,
      };
    }

    const previousTier = user.loyalty.tier || 'BRONZE';
    user.loyalty.tier = tier;
    user.loyalty.tierAchievedAt = new Date();
    if (tierLock !== undefined) user.loyalty.tierLock = !!tierLock;
    if (customDiscountPercentage !== undefined) {
      user.loyalty.customDiscountPercentage = Math.max(0, Math.min(100, Number(customDiscountPercentage)));
    }

    await user.save();

    // Log Activity
    const log = await LoyaltyActivityLog.create({
      user: user._id,
      type: 'TIER_UPGRADE',
      points: 0,
      balanceAfter: user.walletCoins || 0,
      tier: tier,
      title: `VIP Tier Override: ${previousTier} ➔ ${tier}`,
      description: reason || `Admin manual tier override to ${tier}. Tier Lock: ${user.loyalty.tierLock ? 'ENABLED' : 'DISABLED'}`,
      performedBy: req.user._id,
      metadata: { previousTier, newTier: tier, tierLock: user.loyalty.tierLock, adminEmail: req.user.email },
    });

    return res.status(200).json({
      success: true,
      message: `Customer VIP tier updated to ${tier} successfully.`,
      data: {
        userId: user._id,
        loyalty: user.loyalty,
        log,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to override customer tier',
      error: err.message,
    });
  }
};

/**
 * Admin: Comprehensive Loyalty Analytics & VIP Breakdown
 */
exports.getLoyaltyAnalytics = async (req, res) => {
  try {
    const config = await LoyaltyTierConfig.getOrCreateConfig();

    const totalCustomers = await User.countDocuments({ role: 'customer' });

    // Tier distribution aggregation
    const tierCounts = await User.aggregate([
      { $match: { role: 'customer' } },
      {
        $group: {
          _id: { $ifNull: ['$loyalty.tier', 'BRONZE'] },
          count: { $sum: 1 },
          totalSpend: { $sum: { $ifNull: ['$loyalty.lifetimeSpend', 0] } },
        },
      },
    ]);

    const distribution = {
      BRONZE: 0,
      SILVER: 0,
      GOLD: 0,
      PLATINUM: 0,
      DIAMOND: 0,
    };
    tierCounts.forEach((t) => {
      if (distribution[t._id] !== undefined) {
        distribution[t._id] = t.count;
      }
    });

    // Total points currently held by customers
    const pointsAggregation = await User.aggregate([
      { $match: { role: 'customer' } },
      {
        $group: {
          _id: null,
          totalPointsInCirculation: { $sum: { $ifNull: ['$walletCoins', 0] } },
          totalLifetimeSpend: { $sum: { $ifNull: ['$loyalty.lifetimeSpend', 0] } },
        },
      },
    ]);

    const totalPointsInCirculation = pointsAggregation[0] ? pointsAggregation[0].totalPointsInCirculation : 0;
    const totalLifetimeSpend = pointsAggregation[0] ? pointsAggregation[0].totalLifetimeSpend : 0;

    // Total points earned and redeemed from logs
    const pointsLogsAgg = await LoyaltyActivityLog.aggregate([
      {
        $group: {
          _id: {
            $cond: [{ $gt: ['$points', 0] }, 'EARNED', 'REDEEMED'],
          },
          total: { $sum: '$points' },
        },
      },
    ]);

    let totalPointsEarned = 0;
    let totalPointsRedeemed = 0;
    pointsLogsAgg.forEach((item) => {
      if (item._id === 'EARNED') totalPointsEarned = item.total;
      if (item._id === 'REDEEMED') totalPointsRedeemed = Math.abs(item.total);
    });

    // Top VIP customers
    const topVipCustomers = await User.find({ role: 'customer' })
      .select('name email phone loyalty walletCoins createdAt')
      .sort({ 'loyalty.lifetimeSpend': -1 })
      .limit(5);

    const financialLiabilityInr = Math.round(totalPointsInCirculation * (config.pointsToRupeeRatio || 1));

    return res.status(200).json({
      success: true,
      data: {
        totalCustomers,
        distribution,
        totalPointsInCirculation,
        financialLiabilityInr,
        totalLifetimeSpend,
        totalPointsEarned,
        totalPointsRedeemed,
        topVipCustomers,
        config: {
          programEnabled: config.programEnabled,
          pointsToRupeeRatio: config.pointsToRupeeRatio,
          minRedeemPoints: config.minRedeemPoints,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to aggregate loyalty analytics',
      error: err.message,
    });
  }
};

/**
 * Admin: Get Audit Activity Logs (Ledger)
 */
exports.getLoyaltyLedger = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const { type, tier, userId } = req.query;
    const query = {};

    if (type) query.type = type;
    if (tier) query.tier = tier;
    if (userId) query.user = userId;

    const total = await LoyaltyActivityLog.countDocuments(query);
    const logs = await LoyaltyActivityLog.find(query)
      .populate('user', 'name email phone loyalty')
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve loyalty ledger',
      error: err.message,
    });
  }
};

exports.evaluateTier = evaluateTier;
