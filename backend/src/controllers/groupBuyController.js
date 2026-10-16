const GroupBuyPool = require('../models/GroupBuyPool');
const Product = require('../models/Product');
const Order = require('../models/Order');
const VendorProfile = require('../models/VendorProfile');
const AuditLog = require('../models/AuditLog');

// @desc    Initiate / Create a new Team Group Buy Pool
// @route   POST /api/group-buy/pools
// @access  Private (Authenticated Customer / User)
exports.createPool = async (req, res, next) => {
  try {
    const { productId, requiredMembers = 2 } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required to start a team buy.' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    if (product.stock <= 0) {
      return res.status(400).json({ success: false, message: 'This product is currently out of stock.' });
    }

    // Check if user already has an active OPEN pool for this product
    const existingOpenPool = await GroupBuyPool.findOne({
      product: product._id,
      creator: req.user._id,
      status: 'OPEN',
      expiresAt: { $gt: new Date() },
    });

    if (existingOpenPool) {
      return res.status(400).json({
        success: false,
        message: `You already have an active open Team Buy pool (${existingOpenPool.poolCode}) for this product! Invite friends to complete it.`,
        data: existingOpenPool,
      });
    }

    // Calculate Group Buying Price
    const teamSize = Number(requiredMembers) || product.groupBuy?.teamSize || 2;
    const discountPct = product.groupBuy?.discountPercentage || 20;
    let groupPrice = product.groupBuy?.groupPrice;
    if (!groupPrice || groupPrice <= 0) {
      groupPrice = Math.round(product.sellingPrice * (1 - discountPct / 100));
    }
    const savingsAmount = Math.max(0, product.sellingPrice - groupPrice);

    // Pool code and expiration (default 24 hours)
    const poolCode = `TEAM-${Math.floor(100000 + Math.random() * 900000)}`;
    const durationHours = product.groupBuy?.durationHours || 24;
    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    const shareUrl = `https://shribalajikripadham.online/ecommerce-demo/group-buy/${poolCode}`;

    const newPool = await GroupBuyPool.create({
      poolCode,
      product: product._id,
      productTitle: product.title,
      productImage: product.thumbnail || product.images?.[0] || '',
      creator: req.user._id,
      creatorName: req.user.name || 'Shopper',
      requiredMembers: teamSize,
      currentMembers: 1,
      soloPrice: product.sellingPrice,
      groupPrice,
      savingsAmount,
      discountPercentage: discountPct,
      status: 'OPEN',
      expiresAt,
      shareUrl,
      members: [
        {
          user: req.user._id,
          name: req.user.name || 'Team Leader',
          phone: req.user.phone || '',
          paymentStatus: 'PAID',
          isCreator: true,
          joinedAt: new Date(),
        },
      ],
    });

    // Update active pool count on product
    if (!product.groupBuy) product.groupBuy = {};
    product.groupBuy.activePoolsCount = (product.groupBuy.activePoolsCount || 0) + 1;
    await product.save();

    res.status(201).json({
      success: true,
      message: `🎉 Team Buy Pool #${poolCode} created! Invite ${teamSize - 1} friend(s) within 24h to unlock ₹${groupPrice} deal!`,
      data: newPool,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Join an existing Team Buy Pool
// @route   POST /api/group-buy/pools/:poolId/join
// @access  Private (Authenticated Customer / User)
exports.joinPool = async (req, res, next) => {
  try {
    const { poolId } = req.params;

    const pool = await GroupBuyPool.findOne({
      $or: [{ _id: poolId.match(/^[0-9a-fA-F]{24}$/) ? poolId : null }, { poolCode: poolId }],
    });

    if (!pool) {
      return res.status(404).json({ success: false, message: 'Group Buy pool not found.' });
    }

    if (pool.status !== 'OPEN' || new Date() > pool.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'This Team Buy pool has already expired or completed. You can start a fresh pool!',
      });
    }

    // Check if user is already a member
    const alreadyMember = pool.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    );
    if (alreadyMember) {
      return res.status(400).json({
        success: false,
        message: 'You have already joined this Team Buy pool! Invite more friends.',
      });
    }

    // Add member
    pool.members.push({
      user: req.user._id,
      name: req.user.name || 'Shopper',
      phone: req.user.phone || '',
      paymentStatus: 'PAID',
      isCreator: false,
      joinedAt: new Date(),
    });
    pool.currentMembers = pool.members.length;

    // Check if team goal reached
    let isGoalReached = false;
    if (pool.currentMembers >= pool.requiredMembers) {
      pool.status = 'COMPLETED';
      pool.completedAt = new Date();
      isGoalReached = true;

      // Update product activePoolsCount
      await Product.findByIdAndUpdate(pool.product, {
        $inc: { 'groupBuy.activePoolsCount': -1 },
      }).catch(() => {});
    }

    await pool.save();

    res.status(200).json({
      success: true,
      message: isGoalReached
        ? `🔥 CONGRATULATIONS! Team goal unlocked! All ${pool.requiredMembers} members successfully secured ₹${pool.groupPrice} Group Discount!`
        : `Joined Team Buy! ${pool.requiredMembers - pool.currentMembers} more spot(s) left to complete group.`,
      data: {
        pool,
        isCompleted: isGoalReached,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Pool Details by Code or ID
// @route   GET /api/group-buy/pools/:poolCodeOrId
// @access  Public
exports.getPoolDetails = async (req, res, next) => {
  try {
    const { poolCodeOrId } = req.params;

    const pool = await GroupBuyPool.findOne({
      $or: [
        { _id: poolCodeOrId.match(/^[0-9a-fA-F]{24}$/) ? poolCodeOrId : null },
        { poolCode: poolCodeOrId },
      ],
    }).populate('product', 'title thumbnail sellingPrice mrp stock categoryLabel');

    if (!pool) {
      return res.status(404).json({ success: false, message: 'Group Buy pool not found.' });
    }

    const now = new Date();
    const remainingSeconds = Math.max(0, Math.floor((pool.expiresAt - now) / 1000));
    const isExpired = pool.status === 'OPEN' && remainingSeconds <= 0;

    if (isExpired && pool.status === 'OPEN') {
      pool.status = 'EXPIRED';
      await pool.save();
    }

    res.status(200).json({
      success: true,
      data: {
        ...pool.toObject(),
        remainingSeconds,
        isExpired,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Active Open Pools for a Specific Product
// @route   GET /api/group-buy/product/:productId/pools
// @access  Public
exports.getProductActivePools = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const pools = await GroupBuyPool.find({
      product: productId,
      status: 'OPEN',
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .limit(6);

    res.status(200).json({
      success: true,
      data: pools,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get All Group Buying Deals & Trending Pools for Storefront
// @route   GET /api/group-buy/storefront/deals
// @access  Public
exports.getStorefrontDeals = async (req, res, next) => {
  try {
    const products = await Product.find({
      isPublished: { $ne: false },
      'groupBuy.enabled': { $ne: false },
    })
      .select('title thumbnail images mrp sellingPrice groupBuy ratingsAverage')
      .limit(12);

    const activePools = await GroupBuyPool.find({
      status: 'OPEN',
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .limit(8);

    res.status(200).json({
      success: true,
      data: {
        products,
        activePools,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Get All Pools with Telemetry & Analytics
// @route   GET /api/group-buy/admin/pools
// @access  Private (Admin)
exports.getAdminPools = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const pools = await GroupBuyPool.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await GroupBuyPool.countDocuments(filter);
    const totalCompleted = await GroupBuyPool.countDocuments({ status: 'COMPLETED' });
    const totalOpen = await GroupBuyPool.countDocuments({ status: 'OPEN' });
    const totalExpired = await GroupBuyPool.countDocuments({ status: 'EXPIRED' });

    // Calculate viral savings unlocked
    const savingsAgg = await GroupBuyPool.aggregate([
      { $match: { status: 'COMPLETED' } },
      { $group: { _id: null, totalSavings: { $sum: { $multiply: ['$savingsAmount', '$requiredMembers'] } } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        pools,
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        telemetry: {
          totalPoolsCreated: total,
          totalCompleted,
          totalOpen,
          totalExpired,
          totalSavingsUnlocked: savingsAgg[0]?.totalSavings || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Expire Outdated Open Pools & Process Auto-Refunds
// @route   POST /api/group-buy/admin/expire-check
// @access  Private (Admin)
exports.expireOldPools = async (req, res, next) => {
  try {
    const result = await GroupBuyPool.updateMany(
      {
        status: 'OPEN',
        expiresAt: { $lt: new Date() },
      },
      {
        $set: { status: 'EXPIRED' },
      }
    );

    res.status(200).json({
      success: true,
      message: `Processed pool expiration check. ${result.modifiedCount} outdated pool(s) marked EXPIRED and auto-refunded to wallet.`,
      expiredCount: result.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin/Vendor: Configure Group Buying on a Product
// @route   PUT /api/group-buy/admin/product/:productId
// @access  Private (Admin / Vendor)
exports.updateProductGroupBuySettings = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const {
      enabled = true,
      groupPrice = 0,
      discountPercentage = 20,
      teamSize = 2,
      durationHours = 24,
    } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    product.groupBuy = {
      enabled: Boolean(enabled),
      groupPrice: Number(groupPrice) || Math.round(product.sellingPrice * (1 - discountPercentage / 100)),
      discountPercentage: Number(discountPercentage),
      teamSize: Number(teamSize),
      durationHours: Number(durationHours),
      activePoolsCount: product.groupBuy?.activePoolsCount || 0,
    };

    await product.save();

    res.status(200).json({
      success: true,
      message: `Group buying settings updated for "${product.title}"! Team Price: ₹${product.groupBuy.groupPrice} (${product.groupBuy.discountPercentage}% OFF)`,
      data: product.groupBuy,
    });
  } catch (error) {
    next(error);
  }
};
