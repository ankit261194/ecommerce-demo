const VendorProfile = require('../models/VendorProfile');

/**
 * Helper to validate hex color code
 */
function isValidHexColor(hex) {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
}

/**
 * @desc Get current vendor micro-storefront customization settings
 * @route GET /api/vendor/storefront/customization
 * @access Private (Vendor / Vendor Staff with STORE_SETTINGS)
 */
exports.getStorefrontCustomization = async (req, res) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    if (!vendor.storefrontCustomization) {
      vendor.storefrontCustomization = {
        themeColor: '#4F46E5',
        accentColor: '#F59E0B',
        layoutStyle: 'GRID',
        heroBanners: [],
        announcementBar: { isEnabled: false, text: '', link: '', bgColor: '#1E1B4B', textColor: '#E0E7FF' },
        brandStory: { title: 'Our Craft & Heritage', storyText: '', badges: [] },
        featuredSections: [],
        isPublished: true,
      };
      await vendor.save();
    }

    return res.status(200).json({
      success: true,
      data: {
        storeName: vendor.storeName,
        storeSlug: vendor.storeSlug,
        storeLogo: vendor.storeLogo,
        storeBanner: vendor.storeBanner,
        customization: vendor.storefrontCustomization,
      },
    });
  } catch (error) {
    console.error('getStorefrontCustomization error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving micro-storefront configuration' });
  }
};

/**
 * @desc Update micro-storefront customization settings (theme, layout, announcement, etc.)
 * @route PUT /api/vendor/storefront/customization
 * @access Private (Vendor / Vendor Staff with STORE_SETTINGS)
 */
exports.updateStorefrontCustomization = async (req, res) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const {
      themeColor,
      accentColor,
      layoutStyle,
      heroBanners,
      announcementBar,
      brandStory,
      featuredSections,
      isPublished,
    } = req.body;

    if (!vendor.storefrontCustomization) {
      vendor.storefrontCustomization = {};
    }

    // Validate theme colors if provided
    if (themeColor) {
      if (!isValidHexColor(themeColor)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid theme color. Must be a valid 3 or 6 digit hex code (e.g. #4F46E5).',
        });
      }
      vendor.storefrontCustomization.themeColor = themeColor;
    }

    if (accentColor) {
      if (!isValidHexColor(accentColor)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid accent color. Must be a valid 3 or 6 digit hex code (e.g. #F59E0B).',
        });
      }
      vendor.storefrontCustomization.accentColor = accentColor;
    }

    // Validate layoutStyle
    if (layoutStyle) {
      const allowedLayouts = ['GRID', 'EDITORIAL', 'MINIMAL', 'BOUTIQUE'];
      if (!allowedLayouts.includes(layoutStyle)) {
        return res.status(400).json({
          success: false,
          message: `Invalid layout style. Allowed styles: ${allowedLayouts.join(', ')}.`,
        });
      }
      vendor.storefrontCustomization.layoutStyle = layoutStyle;
    }

    if (heroBanners && Array.isArray(heroBanners)) {
      vendor.storefrontCustomization.heroBanners = heroBanners;
    }

    if (announcementBar && typeof announcementBar === 'object') {
      vendor.storefrontCustomization.announcementBar = {
        isEnabled: Boolean(announcementBar.isEnabled),
        text: announcementBar.text || '',
        link: announcementBar.link || '',
        bgColor: announcementBar.bgColor || '#1E1B4B',
        textColor: announcementBar.textColor || '#E0E7FF',
      };
    }

    if (brandStory && typeof brandStory === 'object') {
      vendor.storefrontCustomization.brandStory = {
        title: brandStory.title || 'Our Craft & Heritage',
        storyText: brandStory.storyText || '',
        founderName: brandStory.founderName || '',
        founderPhoto: brandStory.founderPhoto || '',
        foundedYear: brandStory.foundedYear ? parseInt(brandStory.foundedYear, 10) : null,
        videoUrl: brandStory.videoUrl || '',
        badges: Array.isArray(brandStory.badges) ? brandStory.badges : [],
      };
    }

    if (featuredSections && Array.isArray(featuredSections)) {
      vendor.storefrontCustomization.featuredSections = featuredSections;
    }

    if (isPublished !== undefined) {
      vendor.storefrontCustomization.isPublished = Boolean(isPublished);
    }

    vendor.storefrontCustomization.lastPublishedAt = new Date();
    await vendor.save();

    return res.status(200).json({
      success: true,
      message: 'Micro-storefront customization saved and published successfully!',
      data: vendor.storefrontCustomization,
    });
  } catch (error) {
    console.error('updateStorefrontCustomization error:', error);
    return res.status(500).json({ success: false, message: 'Server error saving storefront customization' });
  }
};

/**
 * @desc Add a new hero promotional banner to the micro-storefront
 * @route POST /api/vendor/storefront/banner
 * @access Private (Vendor / Vendor Staff with STORE_SETTINGS)
 */
exports.addHeroBanner = async (req, res) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const { title = '', subtitle = '', imageUrl, targetUrl = '', buttonText = 'Shop Collection', sortOrder = 0 } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Banner image URL is required.',
      });
    }

    if (!vendor.storefrontCustomization) {
      vendor.storefrontCustomization = { heroBanners: [] };
    }
    if (!vendor.storefrontCustomization.heroBanners) {
      vendor.storefrontCustomization.heroBanners = [];
    }

    const newBanner = {
      id: `banner_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      title,
      subtitle,
      imageUrl,
      targetUrl,
      buttonText,
      isActive: true,
      sortOrder: parseInt(sortOrder, 10) || vendor.storefrontCustomization.heroBanners.length,
    };

    vendor.storefrontCustomization.heroBanners.push(newBanner);
    await vendor.save();

    return res.status(201).json({
      success: true,
      message: 'Hero banner added to micro-storefront successfully!',
      data: newBanner,
    });
  } catch (error) {
    console.error('addHeroBanner error:', error);
    return res.status(500).json({ success: false, message: 'Server error adding hero banner' });
  }
};

/**
 * @desc Delete a hero banner from the micro-storefront
 * @route DELETE /api/vendor/storefront/banner/:id
 * @access Private (Vendor / Vendor Staff with STORE_SETTINGS)
 */
exports.deleteHeroBanner = async (req, res) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const { id } = req.params;
    if (!vendor.storefrontCustomization?.heroBanners) {
      return res.status(404).json({ success: false, message: 'No hero banners found' });
    }

    const initialCount = vendor.storefrontCustomization.heroBanners.length;
    vendor.storefrontCustomization.heroBanners = vendor.storefrontCustomization.heroBanners.filter(
      (b) => b.id !== id && b._id?.toString() !== id
    );

    if (vendor.storefrontCustomization.heroBanners.length === initialCount) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    await vendor.save();

    return res.status(200).json({
      success: true,
      message: 'Hero banner deleted successfully!',
      data: vendor.storefrontCustomization.heroBanners,
    });
  } catch (error) {
    console.error('deleteHeroBanner error:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting hero banner' });
  }
};

/**
 * @desc Reorder hero banners
 * @route PATCH /api/vendor/storefront/banners/reorder
 * @access Private (Vendor / Vendor Staff with STORE_SETTINGS)
 */
exports.reorderHeroBanners = async (req, res) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const { bannerIds } = req.body;
    if (!Array.isArray(bannerIds)) {
      return res.status(400).json({ success: false, message: 'bannerIds must be an array of IDs' });
    }

    const banners = vendor.storefrontCustomization?.heroBanners || [];
    const bannerMap = new Map();
    banners.forEach((b) => bannerMap.set(b.id || b._id?.toString(), b));

    const reordered = [];
    bannerIds.forEach((id, index) => {
      const found = bannerMap.get(id);
      if (found) {
        found.sortOrder = index;
        reordered.push(found);
        bannerMap.delete(id);
      }
    });

    // Append any unreferenced banners
    bannerMap.forEach((b) => reordered.push(b));

    vendor.storefrontCustomization.heroBanners = reordered;
    await vendor.save();

    return res.status(200).json({
      success: true,
      message: 'Hero banners reordered successfully!',
      data: vendor.storefrontCustomization.heroBanners,
    });
  } catch (error) {
    console.error('reorderHeroBanners error:', error);
    return res.status(500).json({ success: false, message: 'Server error reordering banners' });
  }
};

/**
 * @desc Update brand story and founder craft journey
 * @route PUT /api/vendor/storefront/brand-story
 * @access Private (Vendor / Vendor Staff with STORE_SETTINGS)
 */
exports.updateBrandStory = async (req, res) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const { title, storyText, founderName, founderPhoto, foundedYear, videoUrl, badges } = req.body;

    if (!vendor.storefrontCustomization) {
      vendor.storefrontCustomization = {};
    }

    vendor.storefrontCustomization.brandStory = {
      title: title || 'Our Craft & Heritage',
      storyText: storyText || '',
      founderName: founderName || '',
      founderPhoto: founderPhoto || '',
      foundedYear: foundedYear ? parseInt(foundedYear, 10) : null,
      videoUrl: videoUrl || '',
      badges: Array.isArray(badges) ? badges : [],
    };

    await vendor.save();

    return res.status(200).json({
      success: true,
      message: 'Brand story updated successfully!',
      data: vendor.storefrontCustomization.brandStory,
    });
  } catch (error) {
    console.error('updateBrandStory error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating brand story' });
  }
};
