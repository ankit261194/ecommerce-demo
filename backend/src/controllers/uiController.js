const UIConfig = require('../models/UIConfig');

// @desc    Get Current Public UI Configuration (Storefront & Mobile Safe)
// @route   GET /api/ui/config
exports.getUIConfig = async (req, res, next) => {
  try {
    let config = await UIConfig.findOne().populate('featuredCategoryIds');
    if (!config) {
      config = await UIConfig.create({
        storeName: 'AuraMarket',
        tagline: 'The Next-Gen Multi-Vendor Commerce Platform',
        primaryColor: '#F59E0B',
        secondaryColor: '#0B0F17',
        heroBanners: [],
        announcementText: '✨ Welcome to AuraMarket! Exclusive launch deals available.',
        showAnnouncement: true,
      });
    }

    const configObj = config.toObject();

    // Sanitize sensitive credentials for public storefront callers
    if (configObj.integrations) {
      if (configObj.integrations.payments?.razorpay) {
        delete configObj.integrations.payments.razorpay.keySecret;
      }
      if (configObj.integrations.payments?.stripe) {
        delete configObj.integrations.payments.stripe.secretKey;
      }
      if (configObj.integrations.email?.smtp) {
        delete configObj.integrations.email.smtp.password;
        delete configObj.integrations.email.smtp.username;
      }
      if (configObj.integrations.email?.sendgrid) {
        delete configObj.integrations.email.sendgrid.apiKey;
      }
      if (configObj.integrations.sms?.twilio) {
        delete configObj.integrations.sms.twilio.authToken;
        delete configObj.integrations.sms.twilio.accountSid;
      }
      if (configObj.integrations.sms?.fast2sms) {
        delete configObj.integrations.sms.fast2sms.apiKey;
      }
      if (configObj.integrations.sms?.msg91) {
        delete configObj.integrations.sms.msg91.authKey;
      }
      if (configObj.integrations.storage?.cloudinary) {
        delete configObj.integrations.storage.cloudinary.apiKey;
        delete configObj.integrations.storage.cloudinary.apiSecret;
      }
      if (configObj.integrations.storage?.s3) {
        delete configObj.integrations.storage.s3.accessKey;
        delete configObj.integrations.storage.s3.secretKey;
      }
    }

    res.status(200).json({ success: true, data: configObj });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Dynamic UI Settings (Super Admin Only)
// @route   PUT /api/ui/config
exports.updateUIConfig = async (req, res, next) => {
  try {
    const {
      storeName,
      tagline,
      primaryColor,
      secondaryColor,
      heroBanners,
      announcementText,
      showAnnouncement,
      announcement,
      footerText,
      supportPhone,
      supportEmail,
      showDemoNotice,
      demoModeActive,
      demoNoticeContact,
      demoWhatsAppUrl,
      integrations,
      seo,
    } = req.body;

    let config = await UIConfig.findOne();
    if (!config) {
      config = new UIConfig();
    }

    if (storeName) config.storeName = storeName;
    if (tagline) config.tagline = tagline;
    if (primaryColor) config.primaryColor = primaryColor;
    if (secondaryColor) config.secondaryColor = secondaryColor;
    if (heroBanners) config.heroBanners = heroBanners;
    if (announcementText !== undefined) config.announcementText = announcementText;
    if (showAnnouncement !== undefined) config.showAnnouncement = showAnnouncement;
    if (footerText !== undefined) config.footerText = footerText;
    if (supportPhone !== undefined) config.supportPhone = supportPhone;
    if (supportEmail !== undefined) config.supportEmail = supportEmail;
    if (showDemoNotice !== undefined) config.showDemoNotice = showDemoNotice;
    if (demoModeActive !== undefined) config.demoModeActive = demoModeActive;
    if (demoNoticeContact !== undefined) config.demoNoticeContact = demoNoticeContact;
    if (demoWhatsAppUrl !== undefined) config.demoWhatsAppUrl = demoWhatsAppUrl;

    if (announcement) {
      const curAnn = config.announcement ? (config.announcement.toObject ? config.announcement.toObject() : config.announcement) : {};
      config.announcement = {
        ...curAnn,
        ...announcement,
      };
      if (announcement.text !== undefined) config.announcementText = announcement.text;
      if (announcement.enabled !== undefined) config.showAnnouncement = announcement.enabled;
      config.markModified('announcement');
    }

    if (seo) {
      const curSeo = config.seo ? (config.seo.toObject ? config.seo.toObject() : config.seo) : {};
      config.seo = {
        ...curSeo,
        ...seo,
      };
      config.markModified('seo');
    }

    if (integrations) {
      const cur = config.integrations ? (config.integrations.toObject ? config.integrations.toObject() : config.integrations) : {};
      config.integrations = {
        ...cur,
        sms: { ...(cur.sms || {}), ...(integrations.sms || {}) },
        payments: { ...(cur.payments || {}), ...(integrations.payments || {}) },
        email: { ...(cur.email || {}), ...(integrations.email || {}) },
        storage: { ...(cur.storage || {}), ...(integrations.storage || {}) },
      };
      config.markModified('integrations');
    }

    await config.save();

    res.status(200).json({
      success: true,
      message: 'UI Configuration updated successfully! Changes are live across Web and Mobile apps.',
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Current Announcement Bar Settings
// @route   GET /api/ui/announcement
// @access  Public
exports.getAnnouncement = async (req, res, next) => {
  try {
    let config = await UIConfig.findOne();
    if (!config) {
      config = await UIConfig.create({});
    }

    const ann = config.announcement || {
      enabled: config.showAnnouncement ?? true,
      text: config.announcementText || '🔥 Festive Sale Live! Get up to 40% OFF with code FESTIVE2026',
      bgColor: '#F59E0B',
      textColor: '#0B0F17',
      couponCode: 'FESTIVE2026',
      actionLink: '/products',
      buttonText: 'Shop Now',
      isDismissible: true,
      countdownEnd: null,
    };

    res.status(200).json({
      success: true,
      data: ann,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Announcement Bar Settings (Super Admin Only)
// @route   PUT /api/admin/announcement
// @access  Private (Super Admin)
exports.updateAnnouncement = async (req, res, next) => {
  try {
    let config = await UIConfig.findOne();
    if (!config) {
      config = new UIConfig();
    }

    const updatePayload = req.body;
    const curAnn = config.announcement ? (config.announcement.toObject ? config.announcement.toObject() : config.announcement) : {};

    config.announcement = {
      ...curAnn,
      ...updatePayload,
    };

    if (updatePayload.text !== undefined) config.announcementText = updatePayload.text;
    if (updatePayload.enabled !== undefined) config.showAnnouncement = updatePayload.enabled;

    config.markModified('announcement');
    await config.save();

    res.status(200).json({
      success: true,
      message: 'Top announcement bar updated successfully!',
      data: config.announcement,
    });
  } catch (error) {
    next(error);
  }
};
