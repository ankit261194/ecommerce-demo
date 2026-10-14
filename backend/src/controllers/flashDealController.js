const FlashDeal = require('../models/FlashDeal');
const Product = require('../models/Product');

// Helper to generate URL slug
const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');

// @desc    Get Current Active Flash Deal for Storefront with Live Countdown
// @route   GET /api/flash-deals/active
// @access  Public
exports.getActiveFlashDeal = async (req, res, next) => {
  try {
    const now = new Date();

    const flashDeal = await FlashDeal.findOne({
      isActive: true,
      status: 'ACTIVE',
      startDate: { $lte: now },
      endDate: { $gt: now },
    })
      .populate({
        path: 'products.product',
        select: 'title slug images mrp sellingPrice brand ratingsAverage ratingsQuantity stock',
      })
      .sort({ createdAt: -1 });

    if (!flashDeal) {
      return res.status(200).json({
        success: true,
        hasActiveDeal: false,
        data: null,
      });
    }

    const secondsRemaining = Math.max(0, Math.floor((new Date(flashDeal.endDate) - now) / 1000));

    res.status(200).json({
      success: true,
      hasActiveDeal: true,
      secondsRemaining,
      data: flashDeal,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get All Flash Deals for Super Admin with Detailed Analytics
// @route   GET /api/admin/flash-deals
// @access  Private (Super Admin)
exports.getAdminFlashDeals = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const now = new Date();

    const query = {};

    if (status && status !== 'all') {
      if (status === 'active') {
        query.isActive = true;
        query.status = 'ACTIVE';
        query.startDate = { $lte: now };
        query.endDate = { $gt: now };
      } else if (status === 'upcoming') {
        query.startDate = { $gt: now };
      } else if (status === 'expired') {
        query.endDate = { $lte: now };
      } else if (status === 'paused') {
        query.isActive = false;
      }
    }

    if (search && search.trim() !== '') {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { badgeText: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const deals = await FlashDeal.find(query)
      .populate({
        path: 'products.product',
        select: 'title slug mrp sellingPrice images',
      })
      .sort({ createdAt: -1 });

    const totalDeals = await FlashDeal.countDocuments();
    const activeDeals = await FlashDeal.countDocuments({
      isActive: true,
      status: 'ACTIVE',
      startDate: { $lte: now },
      endDate: { $gt: now },
    });
    const upcomingDeals = await FlashDeal.countDocuments({
      startDate: { $gt: now },
    });
    const expiredDeals = await FlashDeal.countDocuments({
      endDate: { $lte: now },
    });

    let totalProductsInDeals = 0;
    deals.forEach((d) => {
      totalProductsInDeals += d.products?.length || 0;
    });

    res.status(200).json({
      success: true,
      count: deals.length,
      stats: {
        total: totalDeals,
        active: activeDeals,
        upcoming: upcomingDeals,
        expired: expiredDeals,
        totalProductsInDeals,
      },
      data: deals,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Single Flash Deal by ID or Slug
// @route   GET /api/flash-deals/:id
// @access  Public
exports.getFlashDealById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = id.match(/^[0-9a-fA-F]{24}$/);

    const deal = isObjectId
      ? await FlashDeal.findById(id).populate('products.product')
      : await FlashDeal.findOne({ slug: id }).populate('products.product');

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'Flash deal not found',
      });
    }

    res.status(200).json({
      success: true,
      data: deal,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create Flash Deal Campaign
// @route   POST /api/admin/flash-deals
// @access  Private (Super Admin)
exports.createFlashDeal = async (req, res, next) => {
  try {
    const {
      title,
      badgeText,
      bannerImage,
      startDate,
      endDate,
      backgroundColor,
      textColor,
      products = [],
      isActive = true,
    } = req.body;

    if (!title || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Title and End Date are required',
      });
    }

    const start = startDate ? new Date(startDate) : new Date();
    const end = new Date(endDate);

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date',
      });
    }

    let slug = slugify(title);
    const existing = await FlashDeal.findOne({ slug });
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    // Process products with default dealPrice and discount percentage if not explicitly provided
    const processedProducts = [];
    for (const item of products) {
      const prodId = item.product || item._id;
      const productDoc = await Product.findById(prodId);
      if (productDoc) {
        const discountPct = item.discountPercentage || 30;
        const dealPrice =
          item.dealPrice !== undefined
            ? Number(item.dealPrice)
            : Math.round(productDoc.sellingPrice * (1 - discountPct / 100));

        processedProducts.push({
          product: productDoc._id,
          discountPercentage: discountPct,
          dealPrice,
          allocatedStock: item.allocatedStock || 50,
          soldCount: item.soldCount || 0,
        });

        // Mark product as flash deal
        productDoc.isFlashDeal = true;
        await productDoc.save();
      }
    }

    const flashDeal = await FlashDeal.create({
      title,
      slug,
      badgeText: badgeText || '⚡ FLASH SALE',
      bannerImage:
        bannerImage ||
        'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80',
      startDate: start,
      endDate: end,
      backgroundColor: backgroundColor || '#DC2626',
      textColor: textColor || '#FFFFFF',
      products: processedProducts,
      isActive,
      status: 'ACTIVE',
    });

    const populatedDeal = await FlashDeal.findById(flashDeal._id).populate('products.product');

    res.status(201).json({
      success: true,
      message: 'Flash Deal campaign created successfully',
      data: populatedDeal,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Flash Deal Campaign
// @route   PUT /api/admin/flash-deals/:id
// @access  Private (Super Admin)
exports.updateFlashDeal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      badgeText,
      bannerImage,
      startDate,
      endDate,
      backgroundColor,
      textColor,
      products,
      isActive,
      status,
    } = req.body;

    const deal = await FlashDeal.findById(id);
    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'Flash deal not found',
      });
    }

    if (title) deal.title = title;
    if (badgeText !== undefined) deal.badgeText = badgeText;
    if (bannerImage) deal.bannerImage = bannerImage;
    if (startDate) deal.startDate = new Date(startDate);
    if (endDate) deal.endDate = new Date(endDate);
    if (backgroundColor) deal.backgroundColor = backgroundColor;
    if (textColor) deal.textColor = textColor;
    if (isActive !== undefined) deal.isActive = isActive;
    if (status) deal.status = status;

    if (products && Array.isArray(products)) {
      const processedProducts = [];
      for (const item of products) {
        const prodId = item.product?._id || item.product || item._id;
        const productDoc = await Product.findById(prodId);
        if (productDoc) {
          const discountPct = item.discountPercentage || 30;
          const dealPrice =
            item.dealPrice !== undefined
              ? Number(item.dealPrice)
              : Math.round(productDoc.sellingPrice * (1 - discountPct / 100));

          processedProducts.push({
            product: productDoc._id,
            discountPercentage: discountPct,
            dealPrice,
            allocatedStock: item.allocatedStock || 50,
            soldCount: item.soldCount || 0,
          });

          productDoc.isFlashDeal = true;
          await productDoc.save();
        }
      }
      deal.products = processedProducts;
    }

    await deal.save();

    const populatedDeal = await FlashDeal.findById(deal._id).populate('products.product');

    res.status(200).json({
      success: true,
      message: 'Flash deal updated successfully',
      data: populatedDeal,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle Flash Deal Active Status
// @route   PATCH /api/admin/flash-deals/:id/toggle
// @access  Private (Super Admin)
exports.toggleFlashDealStatus = async (req, res, next) => {
  try {
    const deal = await FlashDeal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'Flash deal not found',
      });
    }

    deal.isActive = !deal.isActive;
    deal.status = deal.isActive ? 'ACTIVE' : 'PAUSED';
    await deal.save();

    res.status(200).json({
      success: true,
      message: `Flash deal ${deal.isActive ? 'activated' : 'paused'} successfully`,
      data: deal,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Flash Deal Campaign
// @route   DELETE /api/admin/flash-deals/:id
// @access  Private (Super Admin)
exports.deleteFlashDeal = async (req, res, next) => {
  try {
    const deal = await FlashDeal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'Flash deal not found',
      });
    }

    // Unflag products
    if (deal.products && deal.products.length > 0) {
      for (const item of deal.products) {
        await Product.findByIdAndUpdate(item.product, { isFlashDeal: false });
      }
    }

    await FlashDeal.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Flash deal campaign deleted successfully',
      deletedId: req.params.id,
    });
  } catch (error) {
    next(error);
  }
};
