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

// ==========================================
// POINT 28: MEGA CAMPAIGN BUILDER & SCHEDULER
// ==========================================

// @desc    Create Scheduled Mega Flash Sale Campaign (Point 28)
// @route   POST /api/admin/flash-deals/mega
// @access  Private (Super Admin)
exports.createMegaCampaign = async (req, res, next) => {
  try {
    const {
      title,
      badgeText,
      bannerImage,
      campaignType = 'MEGA_CAMPAIGN',
      slotName = 'Mega Flash Drop',
      startDate,
      endDate,
      vipEarlyAccessMinutes = 0,
      maxUnitsPerCustomer = 2,
      backgroundColor = '#DC2626',
      textColor = '#FFFFFF',
      products = [],
      isActive = true,
    } = req.body;

    if (!title || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Campaign title and End Date are required',
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

    const now = new Date();
    let initialStatus = 'UPCOMING';
    let autoActivatedAt = null;
    if (start <= now && end > now) {
      initialStatus = isActive ? 'ACTIVE' : 'PAUSED';
      autoActivatedAt = now;
    } else if (end <= now) {
      initialStatus = 'CONCLUDED';
    }

    let slug = slugify(`${title}-${slotName || 'drop'}`);
    const existing = await FlashDeal.findOne({ slug });
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    let totalAllocatedStock = 0;
    const processedProducts = [];

    for (const item of products) {
      const prodId = item.product?._id || item.product || item._id;
      if (!prodId) continue;
      const productDoc = await Product.findById(prodId);
      if (productDoc) {
        const discountPct = Number(item.discountPercentage) || 30;
        const dealPrice =
          item.dealPrice !== undefined
            ? Number(item.dealPrice)
            : Math.round(productDoc.sellingPrice * (1 - discountPct / 100));
        const stockAlloc = Number(item.allocatedStock) || 50;
        const maxPerCust = Number(item.maxPerCustomer) || Number(maxUnitsPerCustomer) || 2;

        totalAllocatedStock += stockAlloc;

        processedProducts.push({
          product: productDoc._id,
          discountPercentage: discountPct,
          dealPrice,
          allocatedStock: stockAlloc,
          soldCount: Number(item.soldCount) || 0,
          maxPerCustomer: maxPerCust,
          isSoldOut: false,
        });

        if (initialStatus === 'ACTIVE') {
          productDoc.isFlashDeal = true;
          await productDoc.save();
        }
      }
    }

    const megaCampaign = await FlashDeal.create({
      title,
      slug,
      badgeText: badgeText || '⚡ MEGA FLASH SALE',
      bannerImage:
        bannerImage ||
        'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80',
      campaignType,
      slotName,
      startDate: start,
      endDate: end,
      vipEarlyAccessMinutes: Number(vipEarlyAccessMinutes) || 0,
      maxUnitsPerCustomer: Number(maxUnitsPerCustomer) || 2,
      totalAllocatedStock,
      totalSoldUnits: 0,
      totalRevenue: 0,
      backgroundColor,
      textColor,
      products: processedProducts,
      isActive,
      status: initialStatus,
      autoActivatedAt,
    });

    const populatedCampaign = await FlashDeal.findById(megaCampaign._id).populate('products.product');

    res.status(201).json({
      success: true,
      message: 'Mega Flash Sale Campaign scheduled successfully',
      data: populatedCampaign,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Scheduled Mega Campaigns for Super Admin (Point 28)
// @route   GET /api/admin/flash-deals/mega
// @access  Private (Super Admin)
exports.getMegaCampaigns = async (req, res, next) => {
  try {
    const { status, campaignType, slotName, search } = req.query;
    const now = new Date();

    const query = {};

    if (campaignType && campaignType !== 'all') {
      query.campaignType = campaignType;
    }

    if (slotName && slotName.trim() !== '') {
      query.slotName = { $regex: slotName.trim(), $options: 'i' };
    }

    if (status && status !== 'all') {
      const lowerStatus = status.toLowerCase();
      if (lowerStatus === 'active') {
        query.isActive = true;
        query.status = 'ACTIVE';
        query.startDate = { $lte: now };
        query.endDate = { $gt: now };
      } else if (lowerStatus === 'upcoming') {
        query.status = { $in: ['UPCOMING', 'ACTIVE'] };
        query.startDate = { $gt: now };
      } else if (lowerStatus === 'expired' || lowerStatus === 'concluded') {
        query.$or = [{ status: { $in: ['EXPIRED', 'CONCLUDED'] } }, { endDate: { $lte: now } }];
      } else if (lowerStatus === 'paused') {
        query.$or = [{ status: 'PAUSED' }, { isActive: false }];
      }
    }

    if (search && search.trim() !== '') {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { slotName: { $regex: search.trim(), $options: 'i' } },
        { badgeText: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const campaigns = await FlashDeal.find(query)
      .populate({
        path: 'products.product',
        select: 'title slug mrp sellingPrice images stock brand ratingsAverage',
      })
      .sort({ startDate: 1, createdAt: -1 });

    const allDeals = await FlashDeal.find({});
    let totalStockAllocated = 0;
    let totalSoldUnits = 0;
    let totalRevenue = 0;
    let totalSubscribers = 0;

    let activeCount = 0;
    let upcomingCount = 0;
    let concludedCount = 0;
    let pausedCount = 0;

    allDeals.forEach((d) => {
      totalStockAllocated += d.totalAllocatedStock || d.products?.reduce((acc, p) => acc + (p.allocatedStock || 0), 0) || 0;
      totalSoldUnits += d.totalSoldUnits || d.products?.reduce((acc, p) => acc + (p.soldCount || 0), 0) || 0;
      totalRevenue += d.totalRevenue || 0;
      totalSubscribers += d.notifyMeSubscribers?.length || 0;

      if (!d.isActive || d.status === 'PAUSED') {
        pausedCount++;
      } else if (new Date(d.endDate) <= now || d.status === 'EXPIRED' || d.status === 'CONCLUDED') {
        concludedCount++;
      } else if (new Date(d.startDate) <= now && new Date(d.endDate) > now) {
        activeCount++;
      } else if (new Date(d.startDate) > now) {
        upcomingCount++;
      }
    });

    res.status(200).json({
      success: true,
      count: campaigns.length,
      stats: {
        total: allDeals.length,
        active: activeCount,
        upcoming: upcomingCount,
        concluded: concludedCount,
        paused: pausedCount,
        totalStockAllocated,
        totalSoldUnits,
        totalRevenue,
        totalSubscribers,
      },
      data: campaigns,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger Automated Time-Based Flash Sale Scheduler Engine (Point 28)
// @route   POST /api/admin/flash-deals/trigger-scheduler
// @access  Private (Super Admin)
exports.triggerSchedulerNow = async (req, res, next) => {
  try {
    const now = new Date();
    const activatedDeals = [];
    const concludedDeals = [];

    // 1. Auto-launch scheduled UPCOMING campaigns whose startDate <= now
    const eligibleUpcoming = await FlashDeal.find({
      isActive: true,
      status: { $in: ['UPCOMING', 'PAUSED'] },
      startDate: { $lte: now },
      endDate: { $gt: now },
    }).populate('products.product');

    for (const deal of eligibleUpcoming) {
      deal.status = 'ACTIVE';
      deal.isActive = true;
      deal.autoActivatedAt = deal.autoActivatedAt || now;
      deal.schedulerTriggered = true;
      await deal.save();

      // Flag participating products as active flash deals
      if (deal.products && deal.products.length > 0) {
        for (const p of deal.products) {
          const prodId = p.product?._id || p.product;
          if (prodId) {
            await Product.findByIdAndUpdate(prodId, { isFlashDeal: true });
          }
        }
      }

      activatedDeals.push({
        id: deal._id,
        title: deal.title,
        slotName: deal.slotName,
        activatedAt: now,
      });
    }

    // 2. Auto-conclude expired ACTIVE campaigns whose endDate <= now
    const expiredActive = await FlashDeal.find({
      status: 'ACTIVE',
      endDate: { $lte: now },
    }).populate('products.product');

    for (const deal of expiredActive) {
      deal.status = 'CONCLUDED';
      deal.autoConcludedAt = now;
      deal.schedulerTriggered = true;
      await deal.save();

      // Unflag products unless participating in another active deal
      if (deal.products && deal.products.length > 0) {
        for (const p of deal.products) {
          const prodId = p.product?._id || p.product;
          if (prodId) {
            const otherActiveDeal = await FlashDeal.findOne({
              _id: { $ne: deal._id },
              isActive: true,
              status: 'ACTIVE',
              startDate: { $lte: now },
              endDate: { $gt: now },
              'products.product': prodId,
            });
            if (!otherActiveDeal) {
              await Product.findByIdAndUpdate(prodId, { isFlashDeal: false });
            }
          }
        }
      }

      concludedDeals.push({
        id: deal._id,
        title: deal.title,
        slotName: deal.slotName,
        concludedAt: now,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Automated flash sale time-based scheduler executed successfully',
      activatedCount: activatedDeals.length,
      concludedCount: concludedDeals.length,
      activatedDeals,
      concludedDeals,
      executionTimestamp: now.toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register Customer "Notify Me" Reminder for Upcoming Flash Drop (Point 28)
// @route   POST /api/flash-deals/:id/remind
// @access  Public / Customer
exports.registerReminder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, phone } = req.body;

    const isObjectId = id.match(/^[0-9a-fA-F]{24}$/);
    const deal = isObjectId
      ? await FlashDeal.findById(id)
      : await FlashDeal.findOne({ slug: id });

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'Flash deal campaign not found',
      });
    }

    const subscriberEmail = (email || req.user?.email || '').trim().toLowerCase();
    const subscriberPhone = (phone || req.user?.phone || '').trim();

    if (!subscriberEmail && !subscriberPhone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either an email or phone number for drop reminders',
      });
    }

    // Check if already subscribed
    const alreadySubscribed = deal.notifyMeSubscribers.some(
      (sub) =>
        (subscriberEmail && sub.email?.toLowerCase() === subscriberEmail) ||
        (subscriberPhone && sub.phone === subscriberPhone) ||
        (req.user?._id && sub.user?.toString() === req.user._id.toString())
    );

    if (alreadySubscribed) {
      return res.status(200).json({
        success: true,
        message: 'You are already registered for reminders on this flash drop!',
        dealTitle: deal.title,
        totalSubscribers: deal.notifyMeSubscribers.length,
      });
    }

    deal.notifyMeSubscribers.push({
      user: req.user?._id || null,
      email: subscriberEmail,
      phone: subscriberPhone,
      registeredAt: new Date(),
    });

    await deal.save();

    res.status(200).json({
      success: true,
      message: `Drop reminder set! You'll be alerted ${deal.vipEarlyAccessMinutes > 0 ? `${deal.vipEarlyAccessMinutes}m early` : 'as soon as this drop goes live'}.`,
      dealTitle: deal.title,
      totalSubscribers: deal.notifyMeSubscribers.length,
      earlyAccessMinutes: deal.vipEarlyAccessMinutes,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Today's Flash Drop Slots Timeline for Customer Storefront (Point 28)
// @route   GET /api/flash-deals/slots/today
// @access  Public
exports.getDailySlots = async (req, res, next) => {
  try {
    const now = new Date();
    // Return all deals active today or upcoming
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfTomorrow = new Date(now);
    endOfTomorrow.setHours(23, 59, 59, 999);
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);

    const deals = await FlashDeal.find({
      isActive: true,
      endDate: { $gt: startOfToday },
      startDate: { $lte: endOfTomorrow },
    })
      .populate({
        path: 'products.product',
        select: 'title slug images mrp sellingPrice brand ratingsAverage ratingsQuantity stock',
      })
      .sort({ startDate: 1 });

    const slots = deals.map((d) => {
      const start = new Date(d.startDate);
      const end = new Date(d.endDate);
      let slotStatus = 'UPCOMING';
      let secondsToStart = Math.max(0, Math.floor((start - now) / 1000));
      let secondsRemaining = Math.max(0, Math.floor((end - now) / 1000));

      if (now >= start && now < end) {
        slotStatus = 'LIVE';
      } else if (now >= end) {
        slotStatus = 'CONCLUDED';
      }

      // Check VIP Early Access
      let isVipEarlyAccessActive = false;
      if (d.vipEarlyAccessMinutes > 0 && now < start) {
        const vipStartTime = new Date(start.getTime() - d.vipEarlyAccessMinutes * 60000);
        if (now >= vipStartTime) {
          isVipEarlyAccessActive = true;
        }
      }

      return {
        _id: d._id,
        title: d.title,
        slug: d.slug,
        slotName: d.slotName,
        campaignType: d.campaignType,
        badgeText: d.badgeText,
        bannerImage: d.bannerImage,
        startDate: d.startDate,
        endDate: d.endDate,
        status: slotStatus,
        isVipEarlyAccessActive,
        vipEarlyAccessMinutes: d.vipEarlyAccessMinutes,
        maxUnitsPerCustomer: d.maxUnitsPerCustomer,
        secondsToStart,
        secondsRemaining,
        productCount: d.products?.length || 0,
        products: d.products,
        subscribersCount: d.notifyMeSubscribers?.length || 0,
      };
    });

    res.status(200).json({
      success: true,
      count: slots.length,
      timestamp: now.toISOString(),
      slots,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Flash Mega Sale Performance Analytics for Super Admin (Point 28)
// @route   GET /api/admin/flash-deals/mega/analytics
// @access  Private (Super Admin)
exports.getCampaignAnalytics = async (req, res, next) => {
  try {
    const deals = await FlashDeal.find({}).populate('products.product');
    const now = new Date();

    let totalAllocatedStock = 0;
    let totalSoldUnits = 0;
    let totalRevenue = 0;
    let totalSubscribers = 0;
    let totalDiscountSum = 0;
    let totalProductEntries = 0;

    const productPerformanceMap = {};

    deals.forEach((deal) => {
      totalSubscribers += deal.notifyMeSubscribers?.length || 0;
      totalRevenue += deal.totalRevenue || 0;

      (deal.products || []).forEach((item) => {
        const stockAlloc = item.allocatedStock || 0;
        const sold = item.soldCount || 0;
        const dealPrice = item.dealPrice || 0;
        const discPct = item.discountPercentage || 0;

        totalAllocatedStock += stockAlloc;
        totalSoldUnits += sold;
        totalDiscountSum += discPct;
        totalProductEntries++;

        const prodId = (item.product?._id || item.product || 'unknown').toString();
        const prodTitle = item.product?.title || 'Flash Product';

        if (!productPerformanceMap[prodId]) {
          productPerformanceMap[prodId] = {
            productId: prodId,
            title: prodTitle,
            unitsSold: 0,
            revenue: 0,
            allocatedStock: 0,
          };
        }
        productPerformanceMap[prodId].unitsSold += sold;
        productPerformanceMap[prodId].allocatedStock += stockAlloc;
        productPerformanceMap[prodId].revenue += sold * dealPrice;
      });
    });

    const topSellingProducts = Object.values(productPerformanceMap)
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5);

    const stockDepletionRate =
      totalAllocatedStock > 0 ? Math.round((totalSoldUnits / totalAllocatedStock) * 100) : 0;

    const averageDiscount =
      totalProductEntries > 0 ? Math.round(totalDiscountSum / totalProductEntries) : 0;

    const activeDeals = deals.filter(
      (d) => d.isActive && new Date(d.startDate) <= now && new Date(d.endDate) > now
    );
    const upcomingDeals = deals.filter((d) => d.isActive && new Date(d.startDate) > now);
    const concludedDeals = deals.filter(
      (d) => new Date(d.endDate) <= now || d.status === 'CONCLUDED'
    );

    res.status(200).json({
      success: true,
      analytics: {
        totalRevenue,
        totalAllocatedStock,
        totalSoldUnits,
        stockDepletionRate,
        averageDiscount,
        totalSubscribers,
        totalCampaigns: deals.length,
        activeCampaignsCount: activeDeals.length,
        upcomingCampaignsCount: upcomingDeals.length,
        concludedCampaignsCount: concludedDeals.length,
        topSellingProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Purchase / Claim Flash Deal Unit with Anti-Hoarding & VIP Access Checks (Point 28)
// @route   POST /api/flash-deals/:id/purchase
// @access  Private (Customer)
exports.purchaseFlashDealItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { productId, quantity = 1 } = req.body;
    const qty = Number(quantity);

    if (!qty || qty < 1) {
      return res.status(400).json({ success: false, message: 'Valid quantity is required' });
    }

    const deal = await FlashDeal.findById(id).populate('products.product');
    if (!deal) {
      return res.status(404).json({ success: false, message: 'Flash deal not found' });
    }

    const now = new Date();
    const start = new Date(deal.startDate);
    const end = new Date(deal.endDate);

    // Check VIP early access
    let isVipEarlyAccess = false;
    if (deal.vipEarlyAccessMinutes > 0 && now < start) {
      const vipStartTime = new Date(start.getTime() - deal.vipEarlyAccessMinutes * 60000);
      if (now >= vipStartTime) {
        isVipEarlyAccess = true;
      }
    }

    if (now < start && !isVipEarlyAccess) {
      return res.status(400).json({
        success: false,
        message: 'This flash drop has not started yet. Sign up for alerts!',
      });
    }

    if (isVipEarlyAccess && (!req.user || (req.user.loyaltyTier === 'BRONZE' && !req.user.isVip))) {
      return res.status(403).json({
        success: false,
        message: 'Exclusive VIP Early Access window active. Upgrade your tier to shop now!',
      });
    }

    if (now >= end || !deal.isActive || deal.status === 'CONCLUDED' || deal.status === 'EXPIRED') {
      return res.status(400).json({ success: false, message: 'This flash deal has concluded' });
    }

    const item = deal.products.find(
      (p) => (p.product?._id || p.product).toString() === productId.toString()
    );

    if (!item) {
      return res.status(404).json({ success: false, message: 'Product is not part of this flash drop' });
    }

    // Anti-hoarding limit check
    const maxAllowed = item.maxPerCustomer || deal.maxUnitsPerCustomer || 2;
    if (qty > maxAllowed) {
      return res.status(400).json({
        success: false,
        message: `Anti-hoarding protection: Maximum ${maxAllowed} unit(s) permitted per customer for this drop`,
      });
    }

    // Stock availability check
    const available = item.allocatedStock - item.soldCount;
    if (available < qty) {
      return res.status(400).json({
        success: false,
        message: `Only ${available} unit(s) remaining in this flash drop!`,
      });
    }

    item.soldCount += qty;
    if (item.soldCount >= item.allocatedStock) {
      item.isSoldOut = true;
    }

    deal.totalSoldUnits = (deal.totalSoldUnits || 0) + qty;
    deal.totalRevenue = (deal.totalRevenue || 0) + item.dealPrice * qty;

    await deal.save();

    res.status(200).json({
      success: true,
      message: 'Flash deal item successfully reserved at special deal price!',
      data: {
        dealId: deal._id,
        productId: item.product?._id,
        dealPrice: item.dealPrice,
        discountPercentage: item.discountPercentage,
        purchasedQuantity: qty,
        remainingStock: item.allocatedStock - item.soldCount,
        isSoldOut: item.isSoldOut,
      },
    });
  } catch (error) {
    next(error);
  }
};
