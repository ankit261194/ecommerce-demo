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
