require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const errorHandler = require('./middlewares/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const uiRoutes = require('./routes/uiRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const questionRoutes = require('./routes/questionRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const couponRoutes = require('./routes/couponRoutes');
const returnRoutes = require('./routes/returnRoutes');
const walletRoutes = require('./routes/walletRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const brandRoutes = require('./routes/brandRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const flashDealRoutes = require('./routes/flashDealRoutes');
const abandonedCartRoutes = require('./routes/abandonedCartRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const localizationRoutes = require('./routes/localizationRoutes');
const pincodeRoutes = require('./routes/pincodeRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const sizeChartRoutes = require('./routes/sizeChartRoutes');
const priceDropAlertRoutes = require('./routes/priceDropAlertRoutes');
const cmsRoutes = require('./routes/cmsRoutes');
const faqRoutes = require('./routes/faqRoutes');
const commissionRoutes = require('./routes/commissionRoutes');
const telemetryRoutes = require('./routes/telemetryRoutes');
const manifestRoutes = require('./routes/manifestRoutes');
const chatRoutes = require('./routes/chatRoutes');
const posRoutes = require('./routes/posRoutes');
const scannerRoutes = require('./routes/scannerRoutes');
const voiceAssistantRoutes = require('./routes/voiceAssistantRoutes');
const payoutSplitRoutes = require('./routes/payoutSplitRoutes');
const paymentGatewayRoutes = require('./routes/paymentGatewayRoutes');
const messagingConfigRoutes = require('./routes/messagingConfigRoutes');
const emailConfigRoutes = require('./routes/emailConfigRoutes');
const storageConfigRoutes = require('./routes/storageConfigRoutes');
const backupRoutes = require('./routes/backupRoutes');
const taxRoutes = require('./routes/taxRoutes');
const courierRoutes = require('./routes/courierRoutes');
const globalSettingsRoutes = require('./routes/globalSettingsRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const pushNotificationRoutes = require('./routes/pushNotificationRoutes');
const emiRoutes = require('./routes/emiRoutes');
const socialShareRoutes = require('./routes/socialShareRoutes');
const giftWrapRoutes = require('./routes/giftWrapRoutes');
const hyperlocalRoutes = require('./routes/hyperlocalRoutes');
const codVaultRoutes = require('./routes/codVaultRoutes');

const app = express();

// Security Headers (Helmet) - configured for cross-origin API and embedded showroom previews
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Rate Limiting to prevent brute-force attacks and abuse
const isTestEnv = process.env.NODE_ENV === 'test';
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestEnv ? 10000 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestEnv ? 10000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Robust Cross-Origin Resource Sharing (CORS)
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
  })
);

// Request body size limits (prevents payload flood DoS)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  const { getDbStatus } = require('./config/db');
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    service: 'Amazon-Style Multi-Vendor E-Commerce API Gateway',
    database: getDbStatus(),
  });
});

// API Routes Mounting
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/ui', uiRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/promotions', couponRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/flash-deals', flashDealRoutes);
app.use('/api/abandoned-carts', abandonedCartRoutes);
app.use('/api/admin/abandoned-carts', abandonedCartRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/localization', localizationRoutes);
app.use('/api/admin/localization', localizationRoutes);
app.use('/api/pincodes', pincodeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/size-charts', sizeChartRoutes);
app.use('/api/price-drop-alerts', priceDropAlertRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/commission', commissionRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/manifests', manifestRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/scanner', scannerRoutes);
app.use('/api/ai', voiceAssistantRoutes);
app.use('/api/payout-splits', payoutSplitRoutes);
app.use('/api/payments', paymentGatewayRoutes);
app.use('/api/admin/payments', paymentGatewayRoutes);
app.use('/api/admin/messaging', messagingConfigRoutes);
app.use('/api/admin/email', emailConfigRoutes);
app.use('/api/admin/storage', storageConfigRoutes);
app.use('/api/admin/backup', backupRoutes);
app.use('/api/tax', taxRoutes);
app.use('/api/admin/tax', taxRoutes);
app.use('/api/courier', courierRoutes);
app.use('/api/admin/courier', courierRoutes);
app.use('/api/global-settings', globalSettingsRoutes);
app.use('/api/admin/global-settings', globalSettingsRoutes);
app.use('/api/admin/audit-logs', auditLogRoutes);
app.use('/api/push-notifications', pushNotificationRoutes);
app.use('/api/emi', emiRoutes);
app.use('/api/admin/emi', emiRoutes);
app.use('/api/share', socialShareRoutes);
const { renderOpenGraphHtml } = require('./controllers/socialShareController');
app.get('/p/:id', renderOpenGraphHtml);
app.get('/api/p/:id', renderOpenGraphHtml);
app.use('/api/gift-wrap', giftWrapRoutes);
app.use('/api/hyperlocal', hyperlocalRoutes);
app.use('/api/cod-vault', codVaultRoutes);

// Dynamic Technical SEO Endpoints
const generateSitemap = async (req, res) => {
  try {
    const UIConfig = require('./models/UIConfig');
    const Product = require('./models/Product');
    const Category = require('./models/Category');

    const config = await UIConfig.findOne();
    const rawCanonical = config?.seo?.canonicalUrl;
    const baseUrl = (rawCanonical && rawCanonical.trim() !== '')
      ? rawCanonical.replace(/\/+$/, '')
      : `${req.protocol}://${req.get('host')}`;

    const nowIso = new Date().toISOString().split('T')[0];

    const staticUrls = [
      { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily', lastmod: nowIso },
      { loc: `${baseUrl}/products`, priority: '0.9', changefreq: 'daily', lastmod: nowIso },
    ];

    let categoryUrls = [];
    try {
      const categories = await Category.find({}).select('slug updatedAt').lean();
      categoryUrls = categories.map(cat => ({
        loc: `${baseUrl}/category/${cat.slug}`,
        priority: '0.8',
        changefreq: 'weekly',
        lastmod: (cat.updatedAt ? new Date(cat.updatedAt) : new Date()).toISOString().split('T')[0],
      }));
    } catch (_) {}

    let productUrls = [];
    try {
      const products = await Product.find({ isPublished: { $ne: false } }).select('slug updatedAt').lean();
      productUrls = products.map(prod => ({
        loc: `${baseUrl}/product/${prod.slug}`,
        priority: '0.8',
        changefreq: 'weekly',
        lastmod: (prod.updatedAt ? new Date(prod.updatedAt) : new Date()).toISOString().split('T')[0],
      }));
    } catch (_) {}

    const escapeXml = unsafe => {
      if (unsafe == null) return '';
      return String(unsafe).replace(/[<>&'"]/g, c => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
          default: return c;
        }
      });
    };

    const allUrls = [...staticUrls, ...categoryUrls, ...productUrls];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    u => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${escapeXml(u.lastmod)}</lastmod>
    <changefreq>${escapeXml(u.changefreq)}</changefreq>
    <priority>${escapeXml(u.priority)}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch (error) {
    res.status(500).header('Content-Type', 'application/xml').send('<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate sitemap</error>');
  }
};

const generateRobotsTxt = async (req, res) => {
  try {
    const UIConfig = require('./models/UIConfig');
    const config = await UIConfig.findOne();
    const rawCanonical = config?.seo?.canonicalUrl;
    const baseUrl = (rawCanonical && rawCanonical.trim() !== '')
      ? rawCanonical.replace(/\/+$/, '')
      : `${req.protocol}://${req.get('host')}`;

    const robotsContent = `User-agent: *
Allow: /
Disallow: /api/admin
Disallow: /admin

Sitemap: ${baseUrl}/sitemap.xml
`;
    res.header('Content-Type', 'text/plain');
    res.status(200).send(robotsContent);
  } catch (error) {
    res.header('Content-Type', 'text/plain');
    res.status(200).send("User-agent: *\nAllow: /\nDisallow: /api/admin\nDisallow: /admin\n");
  }
};

app.get('/sitemap.xml', generateSitemap);
app.get('/api/sitemap.xml', generateSitemap);
app.get('/robots.txt', generateRobotsTxt);
app.get('/api/robots.txt', generateRobotsTxt);

// 404 handler for unknown API routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.method} ${req.originalUrl}' not found. Check documentation for available routes.`,
  });
});

// Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Start server if executed directly (e.g., node src/server.js or npm start)
if (require.main === module) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 Multi-Vendor API Gateway running on port ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🎨 Design Theme: Obsidian Slate & Electric Amber`);
      console.log(`====================================================`);
    });
  }).catch(err => {
    console.error('Fatal initialization error:', err.message);
    process.exit(1);
  });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`[Unhandled Error]: ${err.message}`);
});

module.exports = app;
