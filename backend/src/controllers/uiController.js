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
      }
      if (configObj.integrations.sms?.twilio) {
        delete configObj.integrations.sms.twilio.authToken;
      }
      if (configObj.integrations.sms?.fast2sms) {
        delete configObj.integrations.sms.fast2sms.apiKey;
      }
      if (configObj.integrations.sms?.msg91) {
        delete configObj.integrations.sms.msg91.authKey;
      }
      if (configObj.integrations.storage?.cloudinary) {
        delete configObj.integrations.storage.cloudinary.apiSecret;
      }
      if (configObj.integrations.storage?.s3) {
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
      footerText,
      supportPhone,
      supportEmail,
      showDemoNotice,
      demoModeActive,
      demoNoticeContact,
      demoWhatsAppUrl,
      integrations,
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

    if (integrations) {
      config.integrations = {
        ...((config.integrations && config.integrations.toObject) ? config.integrations.toObject() : (config.integrations || {})),
        ...integrations,
      };
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
