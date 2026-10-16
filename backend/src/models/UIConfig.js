const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  imageUrl: { type: String, required: true },
  actionLink: { type: String, default: '/products' },
  badgeText: { type: String, default: 'Trending Now' },
  isActive: { type: Boolean, default: true },
});

const integrationsSchema = new mongoose.Schema(
  {
    sms: {
      activeProvider: {
        type: String,
        enum: ['mock', 'fast2sms', 'msg91', 'twilio', 'gupshup'],
        default: 'mock',
      },
      fast2sms: {
        apiKey: { type: String, default: '' },
        senderId: { type: String, default: 'FSTSMS' },
        route: { type: String, default: 'q' },
      },
      msg91: {
        authKey: { type: String, default: '' },
        senderId: { type: String, default: 'AURAMK' },
        dltTemplateId: { type: String, default: '' },
      },
      twilio: {
        accountSid: { type: String, default: '' },
        authToken: { type: String, default: '' },
        fromPhone: { type: String, default: '' },
      },
      gupshup: {
        appId: { type: String, default: '' },
        apiKey: { type: String, default: '' },
        sourcePhone: { type: String, default: '' },
      },
      dltTemplates: {
        otpTemplateId: { type: String, default: '1107161829381928' },
        orderPlacedTemplateId: { type: String, default: '1107161829381929' },
        orderDispatchedTemplateId: { type: String, default: '1107161829381930' },
        orderDeliveredTemplateId: { type: String, default: '1107161829381931' },
      },
    },
    whatsapp: {
      enabled: { type: Boolean, default: false },
      provider: { type: String, default: 'meta_cloud_api' },
      phoneNumberId: { type: String, default: '' },
      businessAccountId: { type: String, default: '' },
      accessToken: { type: String, default: '' },
      templateNamespace: { type: String, default: 'auramarket_commerce_alerts' },
      apiVersion: { type: String, default: 'v20.0' },
      webhookVerifyToken: { type: String, default: 'auramarket_wa_verify_2026' },
      automatedAlerts: {
        orderConfirmation: { type: Boolean, default: true },
        outForDelivery: { type: Boolean, default: true },
        deliveryConfirmation: { type: Boolean, default: true },
        cartRecovery: { type: Boolean, default: true },
      },
    },
    payments: {
      cod: {
        enabled: { type: Boolean, default: true },
        label: { type: String, default: 'Cash on Delivery (COD)' },
        minOrderAmount: { type: Number, default: 0 },
        maxOrderAmount: { type: Number, default: 50000 },
      },
      razorpay: {
        enabled: { type: Boolean, default: true },
        mode: { type: String, enum: ['test', 'live'], default: 'test' },
        keyId: { type: String, default: 'rzp_test_AuraMarket2026' },
        keySecret: { type: String, default: 'rzp_sec_mock_key_secret_2026' },
        webhookSecret: { type: String, default: '' },
      },
      stripe: {
        enabled: { type: Boolean, default: true },
        mode: { type: String, enum: ['test', 'live'], default: 'test' },
        publishableKey: { type: String, default: 'pk_test_51MockStripeAuraMarket2026' },
        secretKey: { type: String, default: 'sk_test_51MockStripeSecretKey2026' },
        webhookSecret: { type: String, default: '' },
      },
      cashfree: {
        enabled: { type: Boolean, default: false },
        mode: { type: String, enum: ['test', 'live'], default: 'test' },
        appId: { type: String, default: '' },
        secretKey: { type: String, default: '' },
        apiVersion: { type: String, default: '2023-08-01' },
      },
      paypal: {
        enabled: { type: Boolean, default: false },
        mode: { type: String, enum: ['sandbox', 'live'], default: 'sandbox' },
        clientId: { type: String, default: '' },
        clientSecret: { type: String, default: '' },
      },
      phonepe: {
        enabled: { type: Boolean, default: false },
        mode: { type: String, enum: ['uat', 'live'], default: 'uat' },
        merchantId: { type: String, default: '' },
        saltKey: { type: String, default: '' },
        saltIndex: { type: Number, default: 1 },
      },
      paytm: {
        enabled: { type: Boolean, default: false },
        mode: { type: String, enum: ['staging', 'live'], default: 'staging' },
        merchantId: { type: String, default: '' },
        merchantKey: { type: String, default: '' },
        website: { type: String, default: 'DEFAULT' },
      },
      upi: {
        enabled: { type: Boolean, default: true },
        upiId: { type: String, default: '8533955333@paytm' },
        merchantName: { type: String, default: 'AuraMarket Store' },
      },
    },
    email: {
      activeProvider: {
        type: String,
        enum: ['mock', 'smtp', 'gmail', 'sendgrid', 'ses', 'brevo', 'mailgun'],
        default: 'mock',
      },
      smtp: {
        host: { type: String, default: 'smtp.gmail.com' },
        port: { type: Number, default: 587 },
        secure: { type: Boolean, default: false },
        username: { type: String, default: 'notifications@auramarket.com' },
        password: { type: String, default: '' },
        fromEmail: { type: String, default: 'notifications@auramarket.com' },
        fromName: { type: String, default: 'AuraMarket Store' },
      },
      sendgrid: {
        apiKey: { type: String, default: '' },
        fromEmail: { type: String, default: 'notifications@auramarket.com' },
        fromName: { type: String, default: 'AuraMarket Store' },
      },
      ses: {
        accessKeyId: { type: String, default: '' },
        secretAccessKey: { type: String, default: '' },
        region: { type: String, default: 'ap-south-1' },
        fromEmail: { type: String, default: 'notifications@auramarket.com' },
        fromName: { type: String, default: 'AuraMarket Store' },
      },
      brevo: {
        apiKey: { type: String, default: '' },
        fromEmail: { type: String, default: 'notifications@auramarket.com' },
        fromName: { type: String, default: 'AuraMarket Store' },
      },
      mailgun: {
        apiKey: { type: String, default: '' },
        domain: { type: String, default: 'mg.auramarket.com' },
        fromEmail: { type: String, default: 'notifications@auramarket.com' },
        fromName: { type: String, default: 'AuraMarket Store' },
      },
      templates: [
        {
          templateKey: { type: String, required: true },
          name: { type: String, required: true },
          subject: { type: String, required: true },
          bodyHtml: { type: String, required: true },
          variables: [{ type: String }],
          enabled: { type: Boolean, default: true },
          updatedAt: { type: Date, default: Date.now },
        },
      ],
    },
    storage: {
      activeProvider: {
        type: String,
        enum: ['local', 'cloudinary', 's3'],
        default: 'local',
      },
      local: {
        uploadPath: { type: String, default: '/uploads' },
      },
      cloudinary: {
        cloudName: { type: String, default: 'auramarket' },
        apiKey: { type: String, default: '' },
        apiSecret: { type: String, default: '' },
      },
      s3: {
        bucket: { type: String, default: 'auramarket-media' },
        region: { type: String, default: 'ap-south-1' },
        accessKey: { type: String, default: '' },
        secretKey: { type: String, default: '' },
      },
    },
  },
  { _id: false }
);

const uiConfigSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      default: 'AuraMarket',
    },
    tagline: {
      type: String,
      default: 'The Next-Gen Multi-Vendor Commerce Platform',
    },
    primaryColor: {
      type: String,
      default: '#F59E0B', // High-Contrast Electric Amber
    },
    secondaryColor: {
      type: String,
      default: '#0B0F17', // Obsidian Slate
    },
    announcementText: {
      type: String,
      default: '🔥 Festive Sale Live! Get up to 40% OFF with code FESTIVE2026',
    },
    showAnnouncement: {
      type: Boolean,
      default: true,
    },
    announcement: {
      enabled: {
        type: Boolean,
        default: true,
      },
      text: {
        type: String,
        default: '🔥 Festive Sale Live! Get up to 40% OFF with code FESTIVE2026',
      },
      bgColor: {
        type: String,
        default: '#F59E0B',
      },
      textColor: {
        type: String,
        default: '#0B0F17',
      },
      couponCode: {
        type: String,
        default: 'FESTIVE2026',
      },
      actionLink: {
        type: String,
        default: '/products',
      },
      buttonText: {
        type: String,
        default: 'Shop Now',
      },
      isDismissible: {
        type: Boolean,
        default: true,
      },
      countdownEnd: {
        type: Date,
        default: null,
      },
    },
    heroBanners: [bannerSchema],
    featuredCategoryIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    demoModeActive: {
      type: Boolean,
      default: true,
    },
    footerText: {
      type: String,
      default: '© 2026 AuraMarket — Enterprise Multi-Vendor Marketplace Platform. All rights reserved.',
    },
    supportPhone: {
      type: String,
      default: '+1 (800) 555-0199',
    },
    supportEmail: {
      type: String,
      default: 'support@auramarket.com',
    },
    showDemoNotice: {
      type: Boolean,
      default: false,
    },
    demoNoticeContact: {
      type: String,
      default: '+91 8533955333',
    },
    demoWhatsAppUrl: {
      type: String,
      default: 'https://wa.me/918533955333?text=Hi%20Ankit,%20I%20want%20to%20purchase%20AuraMarket%20E-Commerce%20Platform',
    },
    shipping: {
      freeShippingThreshold: {
        type: Number,
        default: 999,
      },
      defaultShippingFee: {
        type: Number,
        default: 99,
      },
      expressShippingFee: {
        type: Number,
        default: 149,
      },
      codFee: {
        type: Number,
        default: 0,
      },
      estimatedStandardDays: {
        type: String,
        default: '2-4 business days',
      },
      estimatedExpressDays: {
        type: String,
        default: '24-48 hours',
      },
      enabled: {
        type: Boolean,
        default: true,
      },
    },
    integrations: {
      type: integrationsSchema,
      default: () => ({}),
    },
    seo: {
      metaTitle: {
        type: String,
        default: 'AuraMarket — The Next-Gen Multi-Vendor Commerce Platform',
      },
      metaDescription: {
        type: String,
        default: 'Discover top electronics, audio, fashion, and lifestyle brands from verified merchants with express delivery and OTP verification.',
      },
      metaKeywords: {
        type: String,
        default: 'ecommerce, multi-vendor marketplace, online shopping, electronics, fashion, split orders',
      },
      ogImage: {
        type: String,
        default: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80',
      },
      canonicalUrl: {
        type: String,
        default: 'https://shribalajikripadham.online/ecommerce-demo/',
      },
      googleSiteVerification: {
        type: String,
        default: '',
      },
      googleAnalyticsId: {
        type: String,
        default: '',
      },
      facebookPixelId: {
        type: String,
        default: '',
      },
      enableRichSnippets: {
        type: Boolean,
        default: true,
      },
    },
    taxSettings: {
      enabled: {
        type: Boolean,
        default: true,
      },
      defaultGSTRate: {
        type: Number,
        default: 18,
      },
      calculationMode: {
        type: String,
        enum: ['INCLUSIVE', 'EXCLUSIVE'],
        default: 'INCLUSIVE',
      },
      companyName: {
        type: String,
        default: 'AuraMarket E-Commerce Private Limited',
      },
      gstin: {
        type: String,
        default: '07AAAAA0000A1Z5',
      },
      pan: {
        type: String,
        default: 'AAAAA0000A',
      },
      cin: {
        type: String,
        default: 'U72900DL2026PTC389102',
      },
      defaultHsn: {
        type: String,
        default: '85183000',
      },
      authorizedSignatory: {
        type: String,
        default: 'Authorized Signatory • Taxation Cell',
      },
      corporateAddress: {
        type: String,
        default: 'Fulfillment Center B-42, Okhla Industrial Area Phase-III, New Delhi, Delhi 110020',
      },
      state: {
        type: String,
        default: 'Delhi',
      },
      stateCode: {
        type: String,
        default: '07',
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UIConfig', uiConfigSchema);
