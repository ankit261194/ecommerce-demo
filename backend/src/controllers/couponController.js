const Coupon = require('../models/Coupon');

// @desc    Validate Promo Code / Coupon at Checkout
// @route   POST /api/coupons/validate
exports.validateCoupon = async (req, res, next) => {
  try {
    const { code, cartTotal = 0 } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Please provide a valid promo code',
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: cleanCode, isActive: true });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: `Promo code "${cleanCode}" is invalid or does not exist.`,
      });
    }

    // Check expiration date
    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: `Promo code "${cleanCode}" has expired.`,
      });
    }

    // Check total redemptions limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: `Promo code "${cleanCode}" maximum redemption limit has been reached.`,
      });
    }

    const numericTotal = Number(cartTotal) || 0;

    // Check minimum order amount requirement
    if (coupon.minOrderAmount && numericTotal < coupon.minOrderAmount) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: `Minimum cart value of ₹${coupon.minOrderAmount.toLocaleString('en-IN')} required to apply code "${cleanCode}". Add ₹${(coupon.minOrderAmount - numericTotal).toLocaleString('en-IN')} more to your cart!`,
        minOrderAmount: coupon.minOrderAmount,
        shortfall: coupon.minOrderAmount - numericTotal,
      });
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = Math.round((numericTotal * coupon.discountValue) / 100);
      if (coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
      }
    } else {
      // FLAT discount
      discountAmount = Math.min(coupon.discountValue, numericTotal);
    }

    const newTotal = Math.max(0, numericTotal - discountAmount);

    res.status(200).json({
      success: true,
      valid: true,
      message: `Promo code "${cleanCode}" applied successfully!`,
      coupon: {
        _id: coupon._id,
        code: coupon.code,
        title: coupon.title,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscountAmount: coupon.maxDiscountAmount,
        minOrderAmount: coupon.minOrderAmount,
        discountAmount,
        originalTotal: numericTotal,
        newTotal,
        savingsText: `Saved ₹${discountAmount.toLocaleString('en-IN')}!`,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Public Available Coupons for Storefront
// @route   GET /api/coupons
exports.getCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find({
      isActive: true,
      $or: [
        { expiryDate: null },
        { expiryDate: { $gt: new Date() } },
      ],
    }).sort({ isFeatured: -1, discountValue: -1 });

    res.status(200).json({
      success: true,
      count: coupons.length,
      data: coupons,
    });
  } catch (error) {
    next(error);
  }
};

// Point #23: Gamified Scratch Card Reward Engine
// @route   GET /api/coupons/scratch-card
exports.getScratchCardCoupon = async (req, res, next) => {
  try {
    const pool = [
      {
        code: 'SCRATCH15',
        title: 'Lucky Scratch 15% OFF',
        description: 'Congratulations! You revealed 15% off up to ₹750 on your cart.',
        discountType: 'PERCENTAGE',
        discountValue: 15,
        maxDiscountAmount: 750,
        minOrderAmount: 499,
      },
      {
        code: 'SCRATCH25',
        title: 'Super Scratch 25% OFF',
        description: 'Jackpot! You revealed an exclusive 25% discount up to ₹1,200.',
        discountType: 'PERCENTAGE',
        discountValue: 25,
        maxDiscountAmount: 1200,
        minOrderAmount: 999,
      },
      {
        code: 'SCRATCH300',
        title: 'Mega Cash ₹300 OFF',
        description: 'Instant ₹300 cash discount on any order above ₹1,499.',
        discountType: 'FLAT',
        discountValue: 300,
        minOrderAmount: 1499,
      },
    ];

    const reward = pool[Math.floor(Math.random() * pool.length)];

    let coupon = await Coupon.findOne({ code: reward.code });
    if (!coupon) {
      coupon = await Coupon.create({
        ...reward,
        isFeatured: false,
        isActive: true,
      });
    }

    res.status(200).json({
      success: true,
      card: {
        code: coupon.code,
        title: coupon.title,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderAmount: coupon.minOrderAmount,
        maxDiscountAmount: coupon.maxDiscountAmount,
        badgeText: coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`,
        expiresInHours: 48,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new Coupon (Admin / Manager)
// @route   POST /api/coupons
exports.createCoupon = async (req, res, next) => {
  try {
    const {
      code,
      title,
      description,
      discountType,
      discountValue,
      maxDiscountAmount,
      minOrderAmount,
      expiryDate,
      usageLimit,
      isFeatured,
      isActive,
    } = req.body;

    if (!code || !title || discountValue === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Code, title, and discount value are required',
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await Coupon.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Coupon code "${cleanCode}" already exists`,
      });
    }

    const coupon = await Coupon.create({
      code: cleanCode,
      title,
      description: description || '',
      discountType: discountType || 'PERCENTAGE',
      discountValue: Number(discountValue),
      maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      isFeatured: isFeatured !== undefined ? isFeatured : true,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Coupon
// @route   PUT /api/coupons/:id
exports.updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Coupon updated successfully',
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Coupon
// @route   DELETE /api/coupons/:id
exports.deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully',
      deletedId: req.params.id,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get All Coupons for Super Admin with detailed stats
// @route   GET /api/admin/coupons
// @access  Private (Super Admin)
exports.getAdminCoupons = async (req, res, next) => {
  try {
    const { search, discountType, status } = req.query;

    const query = {};

    if (discountType && discountType !== 'all') {
      query.discountType = discountType.toUpperCase();
    }

    if (status === 'active') {
      query.isActive = true;
      query.$or = [{ expiryDate: null }, { expiryDate: { $gt: new Date() } }];
    } else if (status === 'expired') {
      query.expiryDate = { $lte: new Date() };
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    if (search && search.trim() !== '') {
      query.$or = [
        { code: { $regex: search.trim(), $options: 'i' } },
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const coupons = await Coupon.find(query).sort({ createdAt: -1 });

    const totalCoupons = await Coupon.countDocuments();
    const activeCoupons = await Coupon.countDocuments({
      isActive: true,
      $or: [{ expiryDate: null }, { expiryDate: { $gt: new Date() } }],
    });
    const expiredCoupons = await Coupon.countDocuments({
      expiryDate: { $lte: new Date() },
    });
    const percentageCount = await Coupon.countDocuments({ discountType: 'PERCENTAGE' });
    const flatCount = await Coupon.countDocuments({ discountType: 'FLAT' });

    res.status(200).json({
      success: true,
      count: coupons.length,
      stats: {
        total: totalCoupons,
        active: activeCoupons,
        expired: expiredCoupons,
        percentageCount,
        flatCount,
      },
      data: coupons,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single coupon by ID
// @route   GET /api/coupons/:id
// @access  Public / Admin
exports.getCouponById = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    res.status(200).json({
      success: true,
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle coupon active status
// @route   PATCH /api/admin/coupons/:id/toggle
// @access  Private (Super Admin)
exports.toggleCouponStatus = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.status(200).json({
      success: true,
      message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'} successfully`,
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};
