const Banner = require('../models/Banner');

// @desc    Get public active banners (Hero Sliders, Promo Banners)
// @route   GET /api/banners
// @access  Public
exports.getPublicBanners = async (req, res, next) => {
  try {
    const { position, activeOnly = 'true' } = req.query;

    const query = {};
    if (position) {
      query.position = position;
    }

    if (activeOnly === 'true') {
      query.isActive = true;

      const now = new Date();
      query.$and = [
        {
          $or: [{ startDate: null }, { startDate: { $exists: false } }, { startDate: { $lte: now } }],
        },
        {
          $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gte: now } }],
        },
      ];
    }

    const banners = await Banner.find(query).sort({ displayOrder: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: banners.length,
      data: banners,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single banner by ID
// @route   GET /api/banners/:id
// @access  Public
exports.getBannerById = async (req, res, next) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found',
      });
    }

    res.status(200).json({
      success: true,
      data: banner,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all banners for Super Admin with stats
// @route   GET /api/admin/banners
// @access  Private (Super Admin)
exports.getAdminBanners = async (req, res, next) => {
  try {
    const { position, search } = req.query;

    const query = {};
    if (position && position !== 'all') {
      query.position = position;
    }

    if (search && search.trim() !== '') {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { subtitle: { $regex: search.trim(), $options: 'i' } },
        { badgeText: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const banners = await Banner.find(query).sort({ displayOrder: 1, createdAt: -1 });

    const totalBanners = await Banner.countDocuments();
    const activeBanners = await Banner.countDocuments({ isActive: true });
    const heroBanners = await Banner.countDocuments({ position: 'hero_slider' });
    const promoBanners = await Banner.countDocuments({
      position: { $in: ['promo_banner_top', 'promo_banner_middle', 'sidebar_banner'] },
    });

    res.status(200).json({
      success: true,
      count: banners.length,
      stats: {
        total: totalBanners,
        active: activeBanners,
        hero: heroBanners,
        promo: promoBanners,
      },
      data: banners,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new banner
// @route   POST /api/admin/banners
// @access  Private (Super Admin)
exports.createBanner = async (req, res, next) => {
  try {
    const {
      title,
      subtitle,
      badgeText,
      imageUrl,
      actionLink,
      buttonText,
      position = 'hero_slider',
      displayOrder,
      isActive = true,
      startDate,
      endDate,
      backgroundColor,
      textColor,
    } = req.body;

    if (!title || !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Title and image URL are required for a banner',
      });
    }

    let calculatedOrder = displayOrder;
    if (calculatedOrder === undefined || calculatedOrder === null) {
      const highestBanner = await Banner.findOne({ position }).sort({ displayOrder: -1 });
      calculatedOrder = highestBanner ? highestBanner.displayOrder + 1 : 1;
    }

    const banner = await Banner.create({
      title,
      subtitle: subtitle || '',
      badgeText: badgeText || 'Trending Now',
      imageUrl,
      actionLink: actionLink || '/products',
      buttonText: buttonText || 'Shop Now',
      position,
      displayOrder: Number(calculatedOrder),
      isActive: Boolean(isActive),
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      backgroundColor: backgroundColor || '#0B0F17',
      textColor: textColor || '#FFFFFF',
    });

    res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      data: banner,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an existing banner
// @route   PUT /api/admin/banners/:id
// @access  Private (Super Admin)
exports.updateBanner = async (req, res, next) => {
  try {
    let banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found',
      });
    }

    const updateData = { ...req.body };
    if (updateData.startDate === '') updateData.startDate = null;
    if (updateData.endDate === '') updateData.endDate = null;

    banner = await Banner.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Banner updated successfully',
      data: banner,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a banner
// @route   DELETE /api/admin/banners/:id
// @access  Private (Super Admin)
exports.deleteBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found',
      });
    }

    await banner.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Banner deleted successfully',
      deletedId: req.params.id,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle active status of a banner
// @route   PATCH /api/admin/banners/:id/toggle
// @access  Private (Super Admin)
exports.toggleBannerStatus = async (req, res, next) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found',
      });
    }

    banner.isActive = !banner.isActive;
    await banner.save();

    res.status(200).json({
      success: true,
      message: `Banner ${banner.isActive ? 'activated' : 'deactivated'} successfully`,
      data: banner,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reorder banners in bulk
// @route   PUT /api/admin/banners/reorder
// @access  Private (Super Admin)
exports.reorderBanners = async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload: items array required',
      });
    }

    const updates = items.map((item, index) =>
      Banner.findByIdAndUpdate(item.id || item._id, {
        displayOrder: item.displayOrder !== undefined ? item.displayOrder : index + 1,
      })
    );

    await Promise.all(updates);

    const updatedBanners = await Banner.find({}).sort({ displayOrder: 1 });

    res.status(200).json({
      success: true,
      message: 'Banners reordered successfully',
      data: updatedBanners,
    });
  } catch (error) {
    next(error);
  }
};
