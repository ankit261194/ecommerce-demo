const Coupon = require('../models/Coupon');
const VendorProfile = require('../models/VendorProfile');
const Product = require('../models/Product');
const { recordAuditLog } = require('../utils/auditLogger');

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
        fundingSource: coupon.fundingSource || 'PLATFORM',
        vendor: coupon.vendor || null,
        promotionType: coupon.promotionType || 'DISCOUNT_CODE',
        bogoConfig: coupon.bogoConfig,
        bannerBadge: coupon.bannerBadge,
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

// =========================================================================
// POINT 11: VENDOR-FUNDED CUSTOM PROMOTIONS & BOGO ENGINE
// =========================================================================

// @desc    Get all promotions created and funded by vendor
// @route   GET /api/vendor/promotions
exports.getVendorPromotions = async (req, res, next) => {
  try {
    let vendor;
    const isAdmin = req.user && (req.user.role === 'superadmin' || req.user.role === 'admin');

    if (isAdmin && req.query.vendorId) {
      vendor = await VendorProfile.findById(req.query.vendorId);
    } else {
      vendor = await VendorProfile.findOne({ user: req.user._id });
    }

    if (!vendor && !isAdmin) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const query = { fundingSource: 'VENDOR' };
    if (vendor) {
      query.vendor = vendor._id;
    }

    const promotions = await Coupon.find(query)
      .populate('bogoConfig.applicableProducts', 'title sku sellingPrice thumbnail')
      .sort({ createdAt: -1 });

    let totalActive = 0;
    let bogoCount = 0;
    let voucherCount = 0;
    let totalDiscountFunded = 0;
    let totalOrdersDriven = 0;

    promotions.forEach((p) => {
      if (p.isActive) totalActive++;
      if (['BOGO', 'BUY_X_GET_Y'].includes(p.promotionType)) bogoCount++;
      if (p.promotionType === 'STORE_VOUCHER' || p.promotionType === 'DISCOUNT_CODE') voucherCount++;
      totalDiscountFunded += p.totalDiscountGiven || 0;
      totalOrdersDriven += p.ordersDrivenCount || 0;
    });

    res.status(200).json({
      success: true,
      count: promotions.length,
      telemetry: {
        totalPromotions: promotions.length,
        totalActive,
        bogoCount,
        voucherCount,
        totalDiscountFunded,
        totalOrdersDriven,
      },
      promotions,
      data: promotions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a Vendor-Funded Promotion or BOGO Deal
// @route   POST /api/vendor/promotions
exports.createVendorPromotion = async (req, res, next) => {
  try {
    let vendor;
    const isAdmin = req.user && (req.user.role === 'superadmin' || req.user.role === 'admin');

    if (isAdmin && req.body.vendorId) {
      vendor = await VendorProfile.findById(req.body.vendorId);
    } else {
      vendor = await VendorProfile.findOne({ user: req.user._id });
    }

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const {
      code,
      title,
      description,
      promotionType = 'DISCOUNT_CODE',
      discountType = 'PERCENTAGE',
      discountValue,
      discountAmount,
      maxDiscountAmount,
      minOrderAmount = 0,
      expiryDate,
      endDate,
      usageLimit,
      perUserLimit = 1,
      storeWide = false,
      bogoConfig = {},
      bannerBadge = {},
    } = req.body;

    const cleanCode = code
      ? code.trim().toUpperCase()
      : `VND-${vendor.storeName ? vendor.storeName.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase() : 'DEAL'}-${Date.now().toString(36).slice(-4).toUpperCase()}`;

    const finalTitle = (title || bannerBadge?.badgeText || `${cleanCode} Special Offer`).trim();
    const finalDiscountValue = Number(
      discountValue !== undefined && discountValue !== 0
        ? discountValue
        : (discountAmount !== undefined ? discountAmount : (promotionType === 'BOGO' ? 100 : 0))
    ) || 0;
    const finalExpiryDate = expiryDate ? new Date(expiryDate) : (endDate ? new Date(endDate) : null);

    // Verify code uniqueness
    const existing = await Coupon.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Promotion code "${cleanCode}" already exists. Please choose a unique code.`,
      });
    }

    const newPromotion = await Coupon.create({
      code: cleanCode,
      title: finalTitle,
      description: description || `Vendor sponsored deal by ${vendor.storeName}`,
      fundingSource: 'VENDOR',
      vendor: vendor._id,
      applicableVendors: [vendor._id],
      promotionType,
      discountType,
      discountValue: finalDiscountValue,
      maxDiscountAmount: maxDiscountAmount !== undefined && maxDiscountAmount !== '' ? Number(maxDiscountAmount) : null,
      minOrderAmount: Number(minOrderAmount) || 0,
      expiryDate: finalExpiryDate,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      perUserLimit: Number(perUserLimit) || 1,
      storeWide: Boolean(storeWide),
      bogoConfig: {
        buyQty: Math.max(1, Number(bogoConfig.buyQty) || 1),
        getQty: Math.max(1, Number(bogoConfig.getQty) || 1),
        discountPercentage: bogoConfig.discountPercentage !== undefined ? Number(bogoConfig.discountPercentage) : 100,
        applicableProducts: Array.isArray(bogoConfig.applicableProducts) ? bogoConfig.applicableProducts : [],
      },
      bannerBadge: {
        enabled: bannerBadge.enabled !== undefined ? Boolean(bannerBadge.enabled) : true,
        badgeText: bannerBadge.badgeText || (promotionType === 'BOGO' ? 'BUY 1 GET 1 FREE' : 'VENDOR PROMO'),
        badgeColor: bannerBadge.badgeColor || (promotionType === 'BOGO' ? '#e11d48' : '#DC2626'),
        bannerMessage: bannerBadge.bannerMessage || `${finalTitle} — Special Vendor Offer!`,
      },
      isActive: true,
      isFeatured: true,
    });

    await recordAuditLog({
      action: 'VENDOR_PROMOTION_CREATED',
      module: 'MARKETING',
      req,
      description: `Created vendor-funded promotion "${cleanCode}" (${promotionType}) for store "${vendor.storeName}"`,
      targetType: 'Coupon',
      targetId: newPromotion._id,
      details: {
        code: cleanCode,
        promotionType,
        fundingSource: 'VENDOR',
        vendorId: vendor._id,
      },
      severity: 'LOW',
    });

    res.status(201).json({
      success: true,
      message: `Vendor promotion "${cleanCode}" created successfully!`,
      data: newPromotion,
      promotion: newPromotion,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a Vendor Promotion
// @route   PUT /api/vendor/promotions/:id
exports.updateVendorPromotion = async (req, res, next) => {
  try {
    let vendor;
    const isAdmin = req.user && (req.user.role === 'superadmin' || req.user.role === 'admin');

    if (!isAdmin) {
      vendor = await VendorProfile.findOne({ user: req.user._id });
      if (!vendor) {
        return res.status(404).json({ success: false, message: 'Vendor profile not found' });
      }
    }

    const promoQuery = { _id: req.params.id, fundingSource: 'VENDOR' };
    if (!isAdmin && vendor) {
      promoQuery.vendor = vendor._id;
    }

    const promotion = await Coupon.findOne(promoQuery);
    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promotion not found or you do not have permission to modify it',
      });
    }

    const {
      title,
      description,
      promotionType,
      discountType,
      discountValue,
      discountAmount,
      maxDiscountAmount,
      minOrderAmount,
      expiryDate,
      endDate,
      usageLimit,
      perUserLimit,
      storeWide,
      bogoConfig,
      bannerBadge,
    } = req.body;

    if (title) promotion.title = title;
    if (description !== undefined) promotion.description = description;
    if (promotionType) promotion.promotionType = promotionType;
    if (discountType) promotion.discountType = discountType;
    if (discountValue !== undefined) {
      promotion.discountValue = Number(discountValue);
    } else if (discountAmount !== undefined) {
      promotion.discountValue = Number(discountAmount);
    }
    if (maxDiscountAmount !== undefined) {
      promotion.maxDiscountAmount = maxDiscountAmount === '' ? null : Number(maxDiscountAmount);
    }
    if (minOrderAmount !== undefined) promotion.minOrderAmount = Number(minOrderAmount);
    if (expiryDate !== undefined) promotion.expiryDate = expiryDate ? new Date(expiryDate) : null;
    if (endDate !== undefined) promotion.expiryDate = endDate ? new Date(endDate) : null;
    if (usageLimit !== undefined) promotion.usageLimit = usageLimit ? Number(usageLimit) : null;
    if (perUserLimit !== undefined) promotion.perUserLimit = Number(perUserLimit);
    if (storeWide !== undefined) promotion.storeWide = Boolean(storeWide);

    if (bogoConfig) {
      promotion.bogoConfig = {
        buyQty: Math.max(1, Number(bogoConfig.buyQty) || promotion.bogoConfig?.buyQty || 1),
        getQty: Math.max(1, Number(bogoConfig.getQty) || promotion.bogoConfig?.getQty || 1),
        discountPercentage:
          bogoConfig.discountPercentage !== undefined
            ? Number(bogoConfig.discountPercentage)
            : promotion.bogoConfig?.discountPercentage ?? 100,
        applicableProducts: Array.isArray(bogoConfig.applicableProducts)
          ? bogoConfig.applicableProducts
          : promotion.bogoConfig?.applicableProducts || [],
      };
    }

    if (bannerBadge) {
      promotion.bannerBadge = {
        enabled: bannerBadge.enabled !== undefined ? Boolean(bannerBadge.enabled) : promotion.bannerBadge?.enabled,
        badgeText: bannerBadge.badgeText || promotion.bannerBadge?.badgeText || 'PROMO',
        badgeColor: bannerBadge.badgeColor || promotion.bannerBadge?.badgeColor || '#DC2626',
        bannerMessage: bannerBadge.bannerMessage || promotion.bannerBadge?.bannerMessage || '',
      };
    }

    await promotion.save();

    await recordAuditLog({
      action: 'VENDOR_PROMOTION_UPDATED',
      module: 'MARKETING',
      req,
      description: `Updated vendor promotion "${promotion.code}"`,
      targetType: 'Coupon',
      targetId: promotion._id,
      severity: 'LOW',
    });

    res.status(200).json({
      success: true,
      message: 'Promotion updated successfully',
      data: promotion,
      promotion,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle Vendor Promotion Active Status
// @route   PATCH /api/vendor/promotions/:id/toggle
exports.toggleVendorPromotion = async (req, res, next) => {
  try {
    let vendor;
    const isAdmin = req.user && (req.user.role === 'superadmin' || req.user.role === 'admin');

    if (!isAdmin) {
      vendor = await VendorProfile.findOne({ user: req.user._id });
      if (!vendor) {
        return res.status(404).json({ success: false, message: 'Vendor profile not found' });
      }
    }

    const promoQuery = { _id: req.params.id, fundingSource: 'VENDOR' };
    if (!isAdmin && vendor) {
      promoQuery.vendor = vendor._id;
    }

    const promotion = await Coupon.findOne(promoQuery);
    if (!promotion) {
      return res.status(404).json({ success: false, message: 'Promotion not found' });
    }

    promotion.isActive = !promotion.isActive;
    await promotion.save();

    await recordAuditLog({
      action: 'VENDOR_PROMOTION_STATUS_TOGGLED',
      module: 'MARKETING',
      req,
      description: `Toggled vendor promotion "${promotion.code}" to ${promotion.isActive ? 'ACTIVE' : 'PAUSED'}`,
      targetType: 'Coupon',
      targetId: promotion._id,
      severity: 'LOW',
    });

    res.status(200).json({
      success: true,
      message: `Promotion is now ${promotion.isActive ? 'active' : 'paused'}`,
      data: promotion,
      promotion,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Vendor Promotion
// @route   DELETE /api/vendor/promotions/:id
exports.deleteVendorPromotion = async (req, res, next) => {
  try {
    let vendor;
    const isAdmin = req.user && (req.user.role === 'superadmin' || req.user.role === 'admin');

    if (!isAdmin) {
      vendor = await VendorProfile.findOne({ user: req.user._id });
      if (!vendor) {
        return res.status(404).json({ success: false, message: 'Vendor profile not found' });
      }
    }

    const promoQuery = { _id: req.params.id, fundingSource: 'VENDOR' };
    if (!isAdmin && vendor) {
      promoQuery.vendor = vendor._id;
    }

    const promotion = await Coupon.findOneAndDelete(promoQuery);
    if (!promotion) {
      return res.status(404).json({ success: false, message: 'Promotion not found' });
    }

    await recordAuditLog({
      action: 'VENDOR_PROMOTION_DELETED',
      module: 'MARKETING',
      req,
      description: `Deleted vendor promotion "${promotion.code}"`,
      targetType: 'Coupon',
      targetId: req.params.id,
      details: {
        code: promotion.code,
        promotionType: promotion.promotionType,
        fundingSource: 'VENDOR',
      },
      severity: 'MEDIUM',
    });

    res.status(200).json({
      success: true,
      message: 'Promotion deleted successfully',
      deletedId: req.params.id,
      data: promotion,
      promotion,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Calculate BOGO & Tiered Promotions on Cart Items
// @route   POST /api/promotions/bogo/calculate
exports.calculateBogoSavings = async (req, res, next) => {
  try {
    const rawItems = req.body.cartItems || req.body.items || [];
    const code = req.body.code ? req.body.code.trim().toUpperCase() : null;

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(200).json({
        success: true,
        bogoApplied: false,
        totalBogoDiscount: 0,
        bogoSavings: 0,
        freeUnitsCount: 0,
        summaryText: 'No BOGO applied',
        deals: [],
        message: 'No items in cart for promotion calculation',
      });
    }

    const promoQuery = {
      isActive: true,
      promotionType: { $in: ['BOGO', 'BUY_X_GET_Y'] },
      $or: [{ expiryDate: null }, { expiryDate: { $gt: new Date() } }],
    };
    if (code) {
      promoQuery.code = code;
    }

    const activePromos = await Coupon.find(promoQuery);

    let totalBogoDiscount = 0;
    let totalFreeUnits = 0;
    const appliedDeals = [];

    for (const promo of activePromos) {
      const bogo = promo.bogoConfig || {};
      const buyQty = Math.max(1, bogo.buyQty || 1);
      const getQty = Math.max(1, bogo.getQty || 1);
      const discountPct = bogo.discountPercentage !== undefined ? bogo.discountPercentage : 100;
      const bundleSize = buyQty + getQty;

      const applicableProductIds = (bogo.applicableProducts || []).map((id) => id.toString());

      for (const item of rawItems) {
        const pId = item.productId || item.product || item._id;
        if (!pId) continue;

        const isApplicableProduct =
          (applicableProductIds.length === 0 && promo.storeWide) ||
          applicableProductIds.includes(pId.toString()) ||
          (promo.storeWide && promo.vendor && promo.vendor.toString() === String(item.vendorId));

        if (!isApplicableProduct) continue;

        const qty = parseInt(item.quantity, 10) || 0;
        const itemPrice = Number(item.price) || 0;

        if (qty >= bundleSize) {
          const numBundles = Math.floor(qty / bundleSize);
          const freeUnits = numBundles * getQty;
          const dealDiscount = Math.round(freeUnits * itemPrice * (discountPct / 100));

          if (dealDiscount > 0) {
            totalBogoDiscount += dealDiscount;
            totalFreeUnits += freeUnits;
            appliedDeals.push({
              promoId: promo._id,
              code: promo.code,
              title: promo.title,
              promotionType: promo.promotionType,
              fundingSource: promo.fundingSource,
              vendorId: promo.vendor,
              productId: pId,
              productTitle: item.title || 'Eligible Item',
              bundlesQualified: numBundles,
              freeUnits,
              discountPercentage: discountPct,
              discountAmount: dealDiscount,
              savingsText:
                discountPct === 100
                  ? `Buy ${buyQty} Get ${getQty} FREE (${freeUnits} Free Units)`
                  : `Buy ${buyQty} Get ${getQty} at ${discountPct}% OFF`,
            });
          }
        }
      }
    }

    const summaryText =
      appliedDeals.length > 0
        ? `Buy 1 Get 1: ${totalFreeUnits} items free ($${totalBogoDiscount} saved)`
        : 'No BOGO applied';

    res.status(200).json({
      success: true,
      bogoApplied: appliedDeals.length > 0,
      totalBogoDiscount,
      bogoSavings: totalBogoDiscount,
      freeUnitsCount: totalFreeUnits,
      dealCount: appliedDeals.length,
      deals: appliedDeals,
      summaryText,
      savingsSummary:
        appliedDeals.length > 0
          ? `🎉 BOGO Deals Active! Saved ₹${totalBogoDiscount.toLocaleString('en-IN')} across ${appliedDeals.length} item(s).`
          : 'No BOGO promotions applicable to current cart items.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Active Storefront Promo Banners & Badges for a Vendor Store
// @route   GET /api/promotions/store/:vendorId
exports.getStorefrontPromotions = async (req, res, next) => {
  try {
    const { vendorId } = req.params;

    // Resolve vendor profile
    let vendor;
    if (vendorId.match(/^[0-9a-fA-F]{24}$/)) {
      vendor = await VendorProfile.findById(vendorId);
    } else {
      vendor = await VendorProfile.findOne({ storeSlug: vendorId });
    }

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor store not found' });
    }

    const activePromos = await Coupon.find({
      vendor: vendor._id,
      fundingSource: 'VENDOR',
      isActive: true,
      $or: [{ expiryDate: null }, { expiryDate: { $gt: new Date() } }],
    }).populate('bogoConfig.applicableProducts', 'title sku sellingPrice thumbnail');

    const banners = activePromos
      .filter((p) => p.bannerBadge && p.bannerBadge.enabled)
      .map((p) => ({
        id: p._id,
        code: p.code,
        title: p.title,
        badgeText: p.bannerBadge.badgeText,
        badgeColor: p.bannerBadge.badgeColor,
        bannerMessage: p.bannerBadge.bannerMessage,
        promotionType: p.promotionType,
        bogoConfig: p.bogoConfig,
      }));

    res.status(200).json({
      success: true,
      storeName: vendor.storeName,
      activePromosCount: activePromos.length,
      count: activePromos.length,
      promotions: activePromos,
      banners,
      displayBanners: banners,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Platform-Wide Vendor-Funded Promotions (Super Admin)
// @route   GET /api/admin/promotions/vendor-funded
exports.getAdminVendorFundedPromotions = async (req, res, next) => {
  try {
    const promotions = await Coupon.find({ fundingSource: 'VENDOR' })
      .populate('vendor', 'storeName phone status')
      .populate('bogoConfig.applicableProducts', 'title sku sellingPrice')
      .sort({ createdAt: -1 });

    const totalFunded = promotions.reduce((acc, p) => acc + (p.totalDiscountGiven || 0), 0);
    const totalOrders = promotions.reduce((acc, p) => acc + (p.ordersDrivenCount || 0), 0);

    res.status(200).json({
      success: true,
      count: promotions.length,
      telemetry: {
        totalVendorFundedDeals: promotions.length,
        vendorFundedCount: promotions.length,
        totalActive: promotions.filter((p) => p.isActive).length,
        totalFundedDiscountAmount: totalFunded,
        totalOrdersDriven: totalOrders,
      },
      promotions,
      data: promotions,
    });
  } catch (error) {
    next(error);
  }
};

