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
        enum: ['mock', 'fast2sms', 'msg91', 'twilio'],
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
    },
    payments: {
      cod: {
        enabled: { type: Boolean, default: true },
        label: { type: String, default: 'Cash on Delivery (COD)' },
      },
      razorpay: {
        enabled: { type: Boolean, default: true },
        keyId: { type: String, default: 'rzp_test_AuraMarket2026' },
        keySecret: { type: String, default: 'rzp_sec_mock_key_secret_2026' },
      },
      stripe: {
        enabled: { type: Boolean, default: true },
        publishableKey: { type: String, default: 'pk_test_51MockStripeAuraMarket2026' },
        secretKey: { type: String, default: 'sk_test_51MockStripeSecretKey2026' },
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
        enum: ['mock', 'smtp', 'sendgrid'],
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
  },
  { timestamps: true }
);

module.exports = mongoose.model('UIConfig', uiConfigSchema);
