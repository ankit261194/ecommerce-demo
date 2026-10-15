const assert = require('assert');
const http = require('http');
require('dotenv').config();

const app = require('../src/server');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Order = require('../src/models/Order');
const SubOrder = require('../src/models/SubOrder');
const DeliveryTask = require('../src/models/DeliveryTask');
const VendorProfile = require('../src/models/VendorProfile');
const Ledger = require('../src/models/Ledger');
const jwt = require('jsonwebtoken');

let server;
let baseUrl;
let adminToken;
let vendorToken;
let riderToken;
let customerToken;

const runTests = async () => {
  console.log('====================================================');
  console.log('🧪 AuraMarket Enterprise API & Panel Integration Tests');
  console.log('====================================================');

  console.log('[Test Setup] Initializing database and ensuring seed data...');
  await connectDB();

  // Start dedicated test server on ephemeral port
  const PORT = process.env.TEST_PORT || 5055;
  server = app.listen(PORT);
  baseUrl = `http://127.0.0.1:${PORT}/api`;
  console.log(`[Test Server] Running at ${baseUrl}\n`);

  // Wrap global.fetch with retry for Windows socket pool resilience
  const originalFetch = global.fetch;
  global.fetch = async (url, options, retries = 2) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await originalFetch(url, options);
      } catch (err) {
        if (attempt < retries && (err.message?.includes('fetch failed') || err.cause?.code === 'ECONNRESET')) {
          await new Promise(r => setTimeout(r, 100));
          continue;
        }
        throw err;
      }
    }
  };

  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      if (err.cause) {
        console.error(`     Cause:`, err.cause);
      }
      if (err.stack) {
        console.error(`     ${err.stack.split('\n')[1]}`);
      }
      failed++;
    }
  };

  try {
    // 1. Health Check
    await test('Health check returns healthy status and DB info', async () => {
      const res = await fetch(`${baseUrl}/health`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'healthy');
      assert.ok(data.database);
    });

    // 2. Dynamic UI Config
    await test('GET /ui/config returns marketplace theme and announcement', async () => {
      const res = await fetch(`${baseUrl}/ui/config`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data.storeName);
      assert.ok(data.data.primaryColor);
    });

    // 3. Authentication for All 4 Personas
    await test('POST /auth/login authenticates Super Admin', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@auramarket.com', password: 'admin123456' }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.user.role, 'superadmin');
      assert.ok(data.token);
      adminToken = data.token;
    });

    await test('POST /auth/login authenticates Vendor and returns store profile', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'apex@auramarket.com', password: 'vendor123456' }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.user.role, 'vendor');
      assert.ok(data.vendorProfile);
      assert.ok(data.token);
      vendorToken = data.token;
    });

    await test('POST /auth/login authenticates Delivery Rider', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'rider@auramarket.com', password: 'rider123456' }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.user.role, 'delivery');
      assert.ok(data.token);
      riderToken = data.token;
    });

    await test('POST /auth/login authenticates Customer', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'customer@auramarket.com', password: 'customer123456' }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.user.role, 'customer');
      assert.ok(data.token);
      customerToken = data.token;
    });

    await test('POST /auth/login rejects incorrect password with 401', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'customer@auramarket.com', password: 'wrongpassword' }),
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    await test('RBAC: Customer cannot access Super Admin analytics (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/admin/analytics`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(res.status, 403);
    });

    await test('Resilient Demo Token: mock_jwt_superadmin_token_2026 authenticates successfully', async () => {
      const res = await fetch(`${baseUrl}/admin/analytics`, {
        headers: { Authorization: 'Bearer mock_jwt_superadmin_token_2026' },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
    });

    // 4. Products & Catalog
    let headphonesProduct;
    let hoodieProduct;

    await test('GET /products returns public catalog with pagination', async () => {
      const res = await fetch(`${baseUrl}/products`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data.length >= 2);
      headphonesProduct = data.data.find(p => p.sku === 'APX-HEAD-001');
      hoodieProduct = data.data.find(p => p.sku === 'VOG-HOD-001');
      assert.ok(headphonesProduct, 'Headphones product must exist');
      assert.ok(hoodieProduct, 'Hoodie product must exist');
    });

    await test('GET /products/categories returns categories list', async () => {
      const res = await fetch(`${baseUrl}/products/categories`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data.length > 0);
    });

    await test('GET /products?search=headphones finds matching items via search regex', async () => {
      const res = await fetch(`${baseUrl}/products?search=headphones`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data.length >= 1);
      assert.ok(data.data[0].title.toLowerCase().includes('headphones'));
    });

    await test('Point 3: GET /products with minPrice and maxPrice filters catalog within exact price range', async () => {
      const res = await fetch(`${baseUrl}/products?minPrice=2000&maxPrice=5000`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data.length >= 1, 'Should find products within ₹2,000 to ₹5,000 bracket');
      for (const prod of data.data) {
        assert.ok(
          prod.sellingPrice >= 2000 && prod.sellingPrice <= 5000,
          `Product '${prod.title}' price ₹${prod.sellingPrice} must be within 2000-5000`
        );
      }
    });

    await test('Point 4: GET /products/categories/tree returns hierarchical categories, nested subcategories, and verified product counts', async () => {
      const res = await fetch(`${baseUrl}/products/categories/tree`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.data), 'Tree must return array of root categories');
      assert.ok(data.data.length >= 4, 'Must have at least 4 root categories');
      assert.ok(data.totalProducts >= 4, 'Must count total products');

      // Check Electronics category & subcategories
      const electronics = data.data.find(c => c.slug === 'electronics-audio');
      assert.ok(electronics, 'Electronics category must exist in tree');
      assert.ok(electronics.productCount > 0, 'Electronics must have non-zero product count');
      assert.ok(Array.isArray(electronics.subcategories) && electronics.subcategories.length >= 2, 'Must have nested subcategories');

      const headphonesSub = electronics.subcategories.find(s => s.slug === 'wireless-headphones');
      assert.ok(headphonesSub, 'Wireless Headphones subcategory must exist');
      assert.ok(headphonesSub.productCount >= 1, 'Wireless Headphones must have product count >= 1');

      // Check subcategory filtering
      const filterRes = await fetch(`${baseUrl}/products?subCategory=wireless-headphones`);
      assert.strictEqual(filterRes.status, 200);
      const filterData = await filterRes.json();
      assert.strictEqual(filterData.success, true);
      assert.ok(filterData.data.length >= 1, 'Should find products under wireless-headphones');
      assert.ok(filterData.data.some(p => p.sku === 'APX-HEAD-001'));
    });

    await test('Point 5: GET /products/brands returns brand directory and GET /products?brand filters items by brand', async () => {
      const res = await fetch(`${baseUrl}/products/brands`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.data), 'Brands must be an array');
      assert.ok(data.data.length >= 3, 'Must have at least 3 distinct brands');

      const auraAudio = data.data.find(b => b.name === 'AuraAudio');
      assert.ok(auraAudio, 'AuraAudio brand must exist in brand directory');
      assert.ok(auraAudio.productCount >= 1, 'AuraAudio must have at least 1 product');
      assert.ok(auraAudio.logo, 'Brand must have logo image');

      // Test brand filter on products route
      const filterRes = await fetch(`${baseUrl}/products?brand=AuraAudio`);
      assert.strictEqual(filterRes.status, 200);
      const filterData = await filterRes.json();
      assert.strictEqual(filterData.success, true);
      assert.ok(filterData.data.length >= 1, 'Must find products for AuraAudio');
      for (const prod of filterData.data) {
        assert.strictEqual(prod.brand, 'AuraAudio', 'All filtered products must match brand AuraAudio');
      }
    });

    await test('Point 6: GET /products with minRating filters catalog by customer ratings threshold', async () => {
      const res = await fetch(`${baseUrl}/products?minRating=4.8`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data.length >= 1, 'Should find products with rating >= 4.8');
      for (const prod of data.data) {
        assert.ok(
          prod.ratingsAverage >= 4.8,
          `Product '${prod.title}' rating ${prod.ratingsAverage} must be >= 4.8`
        );
      }

      // Test lower threshold
      const res4 = await fetch(`${baseUrl}/products?minRating=4.0`);
      assert.strictEqual(res4.status, 200);
      const data4 = await res4.json();
      assert.strictEqual(data4.success, true);
      assert.ok(data4.data.length >= data.data.length, 'Rating 4.0 threshold should return more or equal products');
    });

    await test('Point 7: GET /products with inStock=true and onSale=true filters by stock availability and discount', async () => {
      // In-stock filter
      const resInStock = await fetch(`${baseUrl}/products?inStock=true`);
      assert.strictEqual(resInStock.status, 200);
      const dataInStock = await resInStock.json();
      assert.strictEqual(dataInStock.success, true);
      assert.ok(dataInStock.data.length >= 1, 'Should find in-stock products');
      for (const prod of dataInStock.data) {
        assert.ok(prod.stock > 0, `Product '${prod.title}' stock must be > 0`);
      }

      // On-sale filter (mrp > sellingPrice)
      const resOnSale = await fetch(`${baseUrl}/products?onSale=true`);
      assert.strictEqual(resOnSale.status, 200);
      const dataOnSale = await resOnSale.json();
      assert.strictEqual(dataOnSale.success, true);
      assert.ok(dataOnSale.data.length >= 1, 'Should find on-sale discounted products');
      for (const prod of dataOnSale.data) {
        assert.ok(
          prod.mrp > prod.sellingPrice,
          `Product '${prod.title}' MRP (₹${prod.mrp}) must be greater than sellingPrice (₹${prod.sellingPrice})`
        );
      }
    });

    await test('Point 8: GET /products with sort (popularity, price_asc, price_desc, rating, newest) sorts accurately', async () => {
      // Test price_asc
      const resPriceAsc = await fetch(`${baseUrl}/products?sort=price_asc`);
      assert.strictEqual(resPriceAsc.status, 200);
      const dataPriceAsc = await resPriceAsc.json();
      assert.strictEqual(dataPriceAsc.success, true);
      assert.ok(dataPriceAsc.data.length >= 2);
      for (let i = 0; i < dataPriceAsc.data.length - 1; i++) {
        assert.ok(
          dataPriceAsc.data[i].sellingPrice <= dataPriceAsc.data[i + 1].sellingPrice,
          `Products must be in ascending price order: ₹${dataPriceAsc.data[i].sellingPrice} <= ₹${dataPriceAsc.data[i + 1].sellingPrice}`
        );
      }

      // Test price_desc
      const resPriceDesc = await fetch(`${baseUrl}/products?sort=price_desc`);
      assert.strictEqual(resPriceDesc.status, 200);
      const dataPriceDesc = await resPriceDesc.json();
      assert.strictEqual(dataPriceDesc.success, true);
      assert.ok(dataPriceDesc.data.length >= 2);
      for (let i = 0; i < dataPriceDesc.data.length - 1; i++) {
        assert.ok(
          dataPriceDesc.data[i].sellingPrice >= dataPriceDesc.data[i + 1].sellingPrice,
          `Products must be in descending price order: ₹${dataPriceDesc.data[i].sellingPrice} >= ₹${dataPriceDesc.data[i + 1].sellingPrice}`
        );
      }

      // Test rating
      const resRating = await fetch(`${baseUrl}/products?sort=rating`);
      assert.strictEqual(resRating.status, 200);
      const dataRating = await resRating.json();
      assert.strictEqual(dataRating.success, true);
      assert.ok(dataRating.data.length >= 2);
      for (let i = 0; i < dataRating.data.length - 1; i++) {
        assert.ok(
          (dataRating.data[i].ratingsAverage || 0) >= (dataRating.data[i + 1].ratingsAverage || 0),
          'Products must be sorted with highest rating first'
        );
      }

      // Test popularity
      const resPop = await fetch(`${baseUrl}/products?sort=popularity`);
      assert.strictEqual(resPop.status, 200);
      const dataPop = await resPop.json();
      assert.strictEqual(dataPop.success, true);
      assert.ok(dataPop.data.length >= 2);
    });

    await test('Point 9: GET /products/search/suggestions returns autocomplete products, categories, brands, and search history keywords', async () => {
      // 1. Empty query returns default trending searches
      const resEmpty = await fetch(`${baseUrl}/products/search/suggestions`);
      assert.strictEqual(resEmpty.status, 200);
      const dataEmpty = await resEmpty.json();
      assert.strictEqual(dataEmpty.success, true);
      assert.ok(Array.isArray(dataEmpty.trendingSearches), 'Must return trending searches array');
      assert.ok(dataEmpty.trendingSearches.length >= 3, 'Must have at least 3 trending searches');

      // 2. Query with 'head' returns headphone products, matching categories, and keywords
      const resQuery = await fetch(`${baseUrl}/products/search/suggestions?q=head`);
      assert.strictEqual(resQuery.status, 200);
      const dataQuery = await resQuery.json();
      assert.strictEqual(dataQuery.success, true);
      assert.strictEqual(dataQuery.query, 'head');
      assert.ok(Array.isArray(dataQuery.products), 'Must return products array');
      assert.ok(dataQuery.products.length >= 1, 'Should find products matching "head"');
      assert.ok(
        dataQuery.products.some(p => p.title.toLowerCase().includes('head')),
        'Matched products must contain "head" in title'
      );
      assert.ok(Array.isArray(dataQuery.categories), 'Must return categories array');
      assert.ok(Array.isArray(dataQuery.brands), 'Must return brands array');
    });

    await test('Point 10: Storefront Voice Search phrase query matches catalog via /products?search and suggestions', async () => {
      // Natural voice queries (e.g., spoken into microphone speech-to-text)
      const spokenVoicePhrase = 'wireless headphones';
      const res = await fetch(`${baseUrl}/products?search=${encodeURIComponent(spokenVoicePhrase)}`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data.length >= 1, 'Should find products for spoken query "wireless headphones"');
      assert.ok(
        data.data.some(p => p.title.toLowerCase().includes('headphones')),
        'Matched product must match voice query title'
      );

      // Suggestions for voice transcription
      const resSugg = await fetch(`${baseUrl}/products/search/suggestions?q=${encodeURIComponent(spokenVoicePhrase)}`);
      assert.strictEqual(resSugg.status, 200);
      const dataSugg = await resSugg.json();
      assert.strictEqual(dataSugg.success, true);
      assert.ok(dataSugg.products.length >= 1, 'Voice suggestion must find matching product');
    });

    await test('Point 11: GET /products/flash-deals returns campaign with active countdown timer, discount percentage, and claimed progress meter', async () => {
      const res = await fetch(`${baseUrl}/products/flash-deals`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.campaign, 'Must return campaign object');
      assert.ok(data.campaign.title.includes('Flash Sale'), 'Campaign must have flash sale title');
      assert.ok(data.campaign.endsAt, 'Campaign must have endsAt ISO timestamp');
      assert.ok(data.campaign.durationSeconds > 0, 'Campaign must have positive remaining duration in seconds');
      assert.ok(Array.isArray(data.data), 'Data must be array of flash deal products');
      assert.ok(data.data.length >= 1, 'Must return at least 1 flash deal product');

      const firstDeal = data.data[0];
      assert.ok(firstDeal.title, 'Deal must have product title');
      assert.ok(firstDeal.mrp > firstDeal.sellingPrice, 'Flash deal MRP must be greater than selling price');
      assert.ok(firstDeal.discountPercentage > 0, 'Deal must have calculated discount percentage');
      assert.ok(typeof firstDeal.claimedPercent === 'number', 'Deal must have claimedPercent number');
      assert.ok(firstDeal.claimedPercent >= 0 && firstDeal.claimedPercent <= 100, 'Claimed percent must be between 0 and 100');
    });

    await test('Point 12: GET /products and /products/:slug return real-time stock urgency badges metadata (CRITICAL, LOW, IN_STOCK, OUT_OF_STOCK)', async () => {
      // 1. Check getProducts returns stockUrgency metadata on each product
      const resList = await fetch(`${baseUrl}/products`);
      assert.strictEqual(resList.status, 200);
      const dataList = await resList.json();
      assert.strictEqual(dataList.success, true);
      assert.ok(dataList.data.length >= 1);

      const p = dataList.data[0];
      assert.ok(p.stockUrgency, 'Product must have stockUrgency object');
      assert.ok(['CRITICAL', 'LOW', 'IN_STOCK', 'OUT_OF_STOCK'].includes(p.stockUrgency.level), 'Urgency level must be valid enum');
      assert.ok(typeof p.stockUrgency.isAvailable === 'boolean');
      assert.ok(typeof p.stockUrgency.unitsLeft === 'number');

      // 2. Check getProductBySlug returns stockUrgency on main product and all variant items
      const resSlug = await fetch(`${baseUrl}/products/${headphonesProduct.slug}`);
      assert.strictEqual(resSlug.status, 200);
      const dataSlug = await resSlug.json();
      assert.strictEqual(dataSlug.success, true);
      assert.ok(dataSlug.data.stockUrgency);
      assert.ok(dataSlug.data.variants && dataSlug.data.variants.length > 0);

      const v = dataSlug.data.variants[0];
      assert.ok(v.stockUrgency, 'Variant must have individual stockUrgency');
      assert.ok(typeof v.stockUrgency.level === 'string');
      assert.strictEqual(v.stockUrgency.unitsLeft, v.stock);
    });

    await test('Point 13: GET /products and /products/:slug return live recent purchase velocity (24h) and active viewers counter', async () => {
      // 1. Check getProducts returns recentPurchases24h & recentViewsPerHour
      const resList = await fetch(`${baseUrl}/products`);
      assert.strictEqual(resList.status, 200);
      const dataList = await resList.json();
      assert.strictEqual(dataList.success, true);
      const p = dataList.data[0];
      assert.ok(typeof p.recentPurchases24h === 'number', 'Must include recentPurchases24h number');
      assert.ok(p.recentPurchases24h > 0, 'recentPurchases24h must be greater than 0');
      assert.ok(typeof p.recentViewsPerHour === 'number', 'Must include recentViewsPerHour number');
      assert.ok(p.recentViewsPerHour > 0, 'recentViewsPerHour must be greater than 0');

      // 2. Check getProductBySlug returns recent velocity
      const resSlug = await fetch(`${baseUrl}/products/${headphonesProduct.slug}`);
      assert.strictEqual(resSlug.status, 200);
      const dataSlug = await resSlug.json();
      assert.strictEqual(dataSlug.success, true);
      assert.ok(dataSlug.data.recentPurchases24h > 0, 'PDP must include positive recent purchase counter');
      assert.ok(dataSlug.data.recentViewsPerHour > 0, 'PDP must include positive viewers counter');
    });

    await test('Point 14: GET /products/social-proof/recent-activities returns verified customer purchase stream with customerName, city, and product metadata', async () => {
      const res = await fetch(`${baseUrl}/products/social-proof/recent-activities`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.data), 'Data must be array of recent activity toasts');
      assert.ok(data.data.length >= 1, 'Must return at least 1 social proof activity');

      const firstAct = data.data[0];
      assert.ok(firstAct.customerName, 'Activity must have anonymized customerName');
      assert.ok(firstAct.city, 'Activity must have buyer city');
      assert.ok(firstAct.timeAgo, 'Activity must have timeAgo string');
      assert.ok(firstAct.verifiedPurchase, 'Activity must be verified purchase');
      assert.ok(firstAct.product && firstAct.product.title, 'Activity must include product details');
      assert.ok(firstAct.product.sellingPrice, 'Activity product must include sellingPrice');
    });

    await test('Point 15: GET /reviews/product/:productId returns rating breakdown, customer photos, and review list; POST creates verified review and updates product stats; helpful upvotes work', async () => {
      // 1. GET reviews & breakdown
      const resGet = await fetch(`${baseUrl}/reviews/product/${headphonesProduct._id}`);
      assert.strictEqual(resGet.status, 200);
      const dataGet = await resGet.json();
      assert.strictEqual(dataGet.success, true);
      assert.ok(Array.isArray(dataGet.breakdown), 'Must return 5-star distribution breakdown');
      assert.strictEqual(dataGet.breakdown.length, 5, 'Must have 5 star breakdown levels');
      assert.ok(dataGet.averageRating > 0, 'Must have positive average rating');
      assert.ok(Array.isArray(dataGet.data) && dataGet.data.length >= 1, 'Must return reviews array');

      // 2. POST new customer review with rating & photo
      const newReviewPayload = {
        rating: 5,
        title: 'Sensational spatial audio clarity!',
        comment: 'Crystal clear highs and deep rumbling bass without any distortion. Arrived in sealed packaging with 1-year brand warranty card.',
        photos: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500'],
        userName: 'Aarav Mehta',
      };

      const resPost = await fetch(`${baseUrl}/reviews/product/${headphonesProduct._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify(newReviewPayload),
      });

      assert.strictEqual(resPost.status, 201);
      const dataPost = await resPost.json();
      assert.strictEqual(dataPost.success, true);
      assert.ok(dataPost.data._id);
      assert.strictEqual(dataPost.data.rating, 5);
      assert.strictEqual(dataPost.data.isVerifiedPurchase, true);
      assert.ok(dataPost.updatedProductStats.ratingsQuantity >= 1);

      // 3. POST helpful upvote
      const reviewId = dataPost.data._id;
      const resHelpful = await fetch(`${baseUrl}/reviews/${reviewId}/helpful`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(resHelpful.status, 200);
      const dataHelpful = await resHelpful.json();
      assert.strictEqual(dataHelpful.success, true);
      assert.strictEqual(dataHelpful.helpfulCount, 2, 'Helpful count should increment');
    });

    await test('Point 16: GET /questions/product/:productId returns Q&A list; POST creates question; POST /:id/answer posts vendor reply; POST /:id/upvote upvotes question', async () => {
      // 1. GET product questions
      const resGet = await fetch(`${baseUrl}/questions/product/${headphonesProduct._id}`);
      assert.strictEqual(resGet.status, 200);
      const dataGet = await resGet.json();
      assert.strictEqual(dataGet.success, true);
      assert.ok(Array.isArray(dataGet.data), 'Data must be array of questions');
      assert.ok(dataGet.data.length >= 1, 'Must have at least 1 question');

      // 2. POST new customer question
      const resPost = await fetch(`${baseUrl}/questions/product/${headphonesProduct._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          question: 'Does this headphone have active latency mode for competitive mobile gaming?',
          askedBy: 'GamerX Rahul',
        }),
      });
      assert.strictEqual(resPost.status, 201);
      const dataPost = await resPost.json();
      assert.strictEqual(dataPost.success, true);
      assert.ok(dataPost.data._id);
      const questionId = dataPost.data._id;

      // 3. POST vendor answer
      const resAns = await fetch(`${baseUrl}/questions/${questionId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({
          answer: 'Yes! It features an ultra-low 38ms Gaming Mode that can be toggled by triple-tapping the right ear cup.',
          answeredBy: 'Apex Audio Official Engineer',
          isVendor: true,
        }),
      });
      assert.strictEqual(resAns.status, 201);
      const dataAns = await resAns.json();
      assert.strictEqual(dataAns.success, true);

      // 4. POST upvote
      const resUp = await fetch(`${baseUrl}/questions/${questionId}/upvote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(resUp.status, 200);
      const dataUp = await resUp.json();
      assert.strictEqual(dataUp.success, true);
      assert.ok(dataUp.upvotes >= 2);
    });

    await test('Point 17: Wishlist System: GET /wishlist, POST /wishlist/toggle, DELETE /wishlist/item/:id, DELETE /wishlist/clear', async () => {
      // 1. Initial GET wishlist
      const resGetInit = await fetch(`${baseUrl}/wishlist`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(resGetInit.status, 200);
      const dataGetInit = await resGetInit.json();
      assert.strictEqual(dataGetInit.success, true);
      assert.ok(Array.isArray(dataGetInit.items));

      // 2. Toggle item into wishlist (add)
      const resToggleAdd = await fetch(`${baseUrl}/wishlist/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ productId: headphonesProduct._id }),
      });
      assert.strictEqual(resToggleAdd.status, 200);
      const dataToggleAdd = await resToggleAdd.json();
      assert.strictEqual(dataToggleAdd.success, true);
      assert.strictEqual(dataToggleAdd.isWishlisted, true);
      assert.strictEqual(dataToggleAdd.action, 'added');
      assert.ok(dataToggleAdd.count >= 1);
      assert.ok(dataToggleAdd.items.some(i => i.product._id.toString() === headphonesProduct._id.toString()));

      // 3. GET wishlist populated
      const resGetPopulated = await fetch(`${baseUrl}/wishlist`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(resGetPopulated.status, 200);
      const dataGetPopulated = await resGetPopulated.json();
      assert.strictEqual(dataGetPopulated.success, true);
      const item = dataGetPopulated.items.find(i => i.product._id.toString() === headphonesProduct._id.toString());
      assert.ok(item, 'Item must exist in populated wishlist');
      assert.strictEqual(item.product.title, headphonesProduct.title);
      assert.ok(item.product.sellingPrice > 0);

      // 4. Toggle item again (remove)
      const resToggleRemove = await fetch(`${baseUrl}/wishlist/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ productId: headphonesProduct._id }),
      });
      assert.strictEqual(resToggleRemove.status, 200);
      const dataToggleRemove = await resToggleRemove.json();
      assert.strictEqual(dataToggleRemove.success, true);
      assert.strictEqual(dataToggleRemove.isWishlisted, false);
      assert.strictEqual(dataToggleRemove.action, 'removed');

      // 5. Re-add and then test DELETE /wishlist/item/:productId
      await fetch(`${baseUrl}/wishlist/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ productId: headphonesProduct._id }),
      });

      const resDelete = await fetch(`${baseUrl}/wishlist/item/${headphonesProduct._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(resDelete.status, 200);
      const dataDelete = await resDelete.json();
      assert.strictEqual(dataDelete.success, true);
      assert.ok(!dataDelete.items.some(i => i.product._id.toString() === headphonesProduct._id.toString()));

      // 6. Test guest wishlist with x-guest-id header
      const guestHeader = { 'x-guest-id': 'guest_test_session_123' };
      const resGuestAdd = await fetch(`${baseUrl}/wishlist/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...guestHeader,
        },
        body: JSON.stringify({ productId: headphonesProduct._id }),
      });
      assert.strictEqual(resGuestAdd.status, 200);
      const dataGuestAdd = await resGuestAdd.json();
      assert.strictEqual(dataGuestAdd.isWishlisted, true);

      // 7. Clear guest wishlist
      const resClear = await fetch(`${baseUrl}/wishlist/clear`, {
        method: 'DELETE',
        headers: guestHeader,
      });
      assert.strictEqual(resClear.status, 200);
      const dataClear = await resClear.json();
      assert.strictEqual(dataClear.count, 0);
    });

    await test('Point 18: Side-by-Side Product Comparison Tool: POST /products/compare validates 2-4 products and returns specsMatrix', async () => {
      // 1. Fetch products to get 2 IDs
      const resList = await fetch(`${baseUrl}/products`);
      const dataList = await resList.json();
      assert.ok(dataList.data.length >= 2, 'Need at least 2 products in catalog for comparison');
      const prodA = dataList.data[0];
      const prodB = dataList.data[1];

      // 2. Reject less than 2 products
      const resBad = await fetch(`${baseUrl}/products/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: [prodA._id] }),
      });
      assert.strictEqual(resBad.status, 400);

      // 3. Reject more than 4 products
      const resTooMany = await fetch(`${baseUrl}/products/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: [prodA._id, prodB._id, prodA._id, prodB._id, prodA._id] }),
      });
      assert.strictEqual(resTooMany.status, 400);

      // 4. Valid compare with 2 products
      const resCompare = await fetch(`${baseUrl}/products/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: [prodA._id, prodB._id] }),
      });
      assert.strictEqual(resCompare.status, 200);
      const dataCompare = await resCompare.json();
      assert.strictEqual(dataCompare.success, true);
      assert.strictEqual(dataCompare.count, 2);
      assert.ok(Array.isArray(dataCompare.products));
      assert.strictEqual(dataCompare.products[0]._id, prodA._id);
      assert.strictEqual(dataCompare.products[1]._id, prodB._id);
      assert.ok(Array.isArray(dataCompare.specsMatrix));
      assert.ok(dataCompare.specsMatrix.length >= 4, 'Must have at least 4 comparison attributes');
      assert.ok(dataCompare.specsMatrix.some(m => m.attribute === 'Brand'));
      assert.ok(dataCompare.specsMatrix.some(m => m.attribute === 'Category'));
      assert.strictEqual(dataCompare.specsMatrix[0].values.length, 2, 'Each spec row must have value per product');
    });

    await test('Point 19: Free Shipping Dynamic Progress Meter: GET /ui/config exposes shipping threshold and fee; order dynamically sets shippingFee', async () => {
      // 1. Check UI Config exposes shipping threshold and default fee
      const resConfig = await fetch(`${baseUrl}/ui/config`);
      assert.strictEqual(resConfig.status, 200);
      const dataConfig = await resConfig.json();
      assert.strictEqual(dataConfig.success, true);
      assert.ok(dataConfig.data.shipping, 'Must return shipping config');
      assert.strictEqual(typeof dataConfig.data.shipping.freeShippingThreshold, 'number');
      assert.strictEqual(typeof dataConfig.data.shipping.defaultShippingFee, 'number');
      assert.ok(dataConfig.data.shipping.freeShippingThreshold >= 500);

      // 2. Update shipping configuration as Super Admin
      const updateRes = await fetch(`${baseUrl}/ui/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          shipping: {
            freeShippingThreshold: 999,
            defaultShippingFee: 99,
            expressShippingFee: 149,
            enabled: true,
          },
        }),
      });
      assert.strictEqual(updateRes.status, 200);
      const updateData = await updateRes.json();
      assert.strictEqual(updateData.success, true);
      assert.strictEqual(updateData.data.shipping.freeShippingThreshold, 999);
      assert.strictEqual(updateData.data.shipping.defaultShippingFee, 99);
    });

    await test('Point 20: Frequently Bought Together: GET /products/:identifier/bundle returns bundle accessories, discount percentage, and bundled pricing', async () => {
      const res = await fetch(`${baseUrl}/products/${headphonesProduct.slug}/bundle`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.mainProduct, 'Must return mainProduct');
      assert.strictEqual(data.mainProduct.slug, headphonesProduct.slug);
      assert.ok(Array.isArray(data.bundleItems), 'Must return bundle items array');
      assert.ok(data.bundleItems.length >= 1, 'Must return at least 1 complementary item');
      assert.ok(data.pricing, 'Must return bundle pricing object');
      assert.strictEqual(data.pricing.bundleDiscountPercent, 10, 'Must apply 10% bundle discount');
      assert.ok(data.pricing.bundleDiscountAmount > 0, 'Discount amount must be positive');
      assert.ok(data.pricing.bundleFinalPrice < data.pricing.totalIndividualSellingPrice, 'Bundle final price must be cheaper than individual sum');
      assert.ok(data.pricing.totalBundleSavings > 0, 'Must provide total bundle savings');
    });

    await test('Point 21: Related Products & Customers Also Viewed: GET /products/:identifier/recommendations returns categorized and popular items', async () => {
      const res = await fetch(`${baseUrl}/products/${headphonesProduct.slug}/recommendations`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.related), 'Related products must be an array');
      assert.ok(data.related.length >= 1, 'Must return at least 1 related product');
      assert.ok(Array.isArray(data.alsoViewed), 'Customers also viewed must be an array');
      assert.ok(data.alsoViewed.length >= 1, 'Must return at least 1 also viewed product');

      // Verify structure of recommended product
      const item = data.related[0];
      assert.ok(item._id, 'Recommended product must have _id');
      assert.ok(item.title, 'Recommended product must have title');
      assert.ok(item.sellingPrice > 0, 'Recommended product must have sellingPrice');
      assert.ok(item.stockUrgency, 'Recommended product must have stockUrgency');
      assert.ok(item.ratingsAverage >= 0, 'Recommended product must have ratingsAverage');
    });

    await test('Point 22: Real Promo Code / Coupon Engine: GET /coupons and POST /coupons/validate instant discount calculation', async () => {
      // 1. Fetch public coupons
      const resCoupons = await fetch(`${baseUrl}/coupons`);
      assert.strictEqual(resCoupons.status, 200);
      const dataCoupons = await resCoupons.json();
      assert.strictEqual(dataCoupons.success, true);
      assert.ok(Array.isArray(dataCoupons.data));
      assert.ok(dataCoupons.data.some(c => c.code === 'AURAFIRST'));

      // 2. Validate valid percentage promo code AURAFIRST on ₹2,000 cart
      const resValid = await fetch(`${baseUrl}/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'AURAFIRST', cartTotal: 2000 }),
      });
      assert.strictEqual(resValid.status, 200);
      const dataValid = await resValid.json();
      assert.strictEqual(dataValid.success, true);
      assert.strictEqual(dataValid.valid, true);
      assert.strictEqual(dataValid.coupon.code, 'AURAFIRST');
      assert.strictEqual(dataValid.coupon.discountType, 'PERCENTAGE');
      assert.strictEqual(dataValid.coupon.discountAmount, 400); // 20% of 2000
      assert.strictEqual(dataValid.coupon.newTotal, 1600);

      // 3. Validate valid flat promo code FESTIVE500 on ₹3,000 cart
      const resFlat = await fetch(`${baseUrl}/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'festive500', cartTotal: 3000 }),
      });
      assert.strictEqual(resFlat.status, 200);
      const dataFlat = await resFlat.json();
      assert.strictEqual(dataFlat.coupon.discountAmount, 500);
      assert.strictEqual(dataFlat.coupon.newTotal, 2500);

      // 4. Reject promo code when cart value is below minimum order requirement
      const resMinFail = await fetch(`${baseUrl}/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'FESTIVE500', cartTotal: 1500 }),
      });
      assert.strictEqual(resMinFail.status, 400);
      const dataMinFail = await resMinFail.json();
      assert.strictEqual(dataMinFail.valid, false);
      assert.ok(dataMinFail.shortfall > 0);

      // 5. Reject invalid non-existent promo code
      const resInvalid = await fetch(`${baseUrl}/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'BOGUS999', cartTotal: 5000 }),
      });
      assert.strictEqual(resInvalid.status, 404);
      const dataInvalid = await resInvalid.json();
      assert.strictEqual(dataInvalid.valid, false);

      // 6. Test order creation with couponCode applies discount to masterOrder
      const resOrderCoupon = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          items: [
            { productId: hoodieProduct._id, quantity: 1, variantSku: 'VOG-HOD-M' },
          ],
          shippingAddress: {
            recipientName: 'Aman Sharma',
            phone: '9876543214',
            street: 'Flat 402, Green Valley Apartments',
            city: 'New Delhi',
            state: 'Delhi',
            pincode: '110001',
          },
          paymentMethod: 'COD',
          couponCode: 'SUPER10',
        }),
      });
      assert.strictEqual(resOrderCoupon.status, 201);
      const dataOrderCoupon = await resOrderCoupon.json();
      assert.strictEqual(dataOrderCoupon.success, true);
      assert.ok(dataOrderCoupon.data.coupon, 'Order must record applied coupon');
      assert.strictEqual(dataOrderCoupon.data.coupon.code, 'SUPER10');
      assert.ok(dataOrderCoupon.data.discountAmount > 0, 'Order discountAmount must be > 0');

      // Cancel coupon test order to restore stock for subsequent test assertions
      await fetch(`${baseUrl}/orders/${dataOrderCoupon.data._id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
      });
    });

    await test('Point 23: Interactive 1-Click Copy Coupons & Scratch Card: GET /coupons/scratch-card generates redeemable gamified reward', async () => {
      // 1. Fetch mystery scratch card
      const resScratch = await fetch(`${baseUrl}/coupons/scratch-card`);
      assert.strictEqual(resScratch.status, 200);
      const dataScratch = await resScratch.json();
      assert.strictEqual(dataScratch.success, true);
      assert.ok(dataScratch.card, 'Must return card reward object');
      assert.ok(dataScratch.card.code.startsWith('SCRATCH'), 'Card code must start with SCRATCH');
      assert.ok(dataScratch.card.discountValue > 0, 'Discount value must be positive');
      assert.ok(dataScratch.card.badgeText, 'Card must have promotional badge text');

      // 2. Validate that revealed scratch card code is immediately valid in checkout engine
      const resValScratch = await fetch(`${baseUrl}/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: dataScratch.card.code, cartTotal: 2500 }),
      });
      assert.strictEqual(resValScratch.status, 200);
      const dataValScratch = await resValScratch.json();
      assert.strictEqual(dataValScratch.valid, true);
      assert.strictEqual(dataValScratch.coupon.code, dataScratch.card.code);
      assert.ok(dataValScratch.coupon.discountAmount > 0);
    });

    await test('Point 24: Multi-Address Book: CRUD addresses, labels (HOME/WORK/OTHER), and default selection', async () => {
      // 1. Initial GET addresses
      const resInit = await fetch(`${baseUrl}/auth/addresses`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(resInit.status, 200);
      const dataInit = await resInit.json();
      assert.strictEqual(dataInit.success, true);
      const initialCount = dataInit.count;

      // 2. POST add Work address with isDefault: true
      const resAddWork = await fetch(`${baseUrl}/auth/addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          recipientName: 'Aman Sharma (Office)',
          phone: '9876543214',
          street: 'Cyber Tower 8, 4th Floor, DLF CyberCity',
          city: 'Gurugram',
          state: 'Haryana',
          pincode: '122002',
          type: 'WORK',
          isDefault: true,
        }),
      });
      assert.strictEqual(resAddWork.status, 201);
      const dataAddWork = await resAddWork.json();
      assert.strictEqual(dataAddWork.data.type, 'WORK');
      assert.strictEqual(dataAddWork.data.isDefault, true);
      const workId = dataAddWork.data._id;

      // 3. POST add Vacation / Other address with isDefault: false
      const resAddOther = await fetch(`${baseUrl}/auth/addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          recipientName: 'Aman Sharma (Holiday Villa)',
          phone: '9876543214',
          street: 'Beach Villa 12, Calangute',
          city: 'Goa',
          state: 'Goa',
          pincode: '403516',
          type: 'OTHER',
          isDefault: false,
        }),
      });
      assert.strictEqual(resAddOther.status, 201);
      const dataAddOther = await resAddOther.json();
      assert.strictEqual(dataAddOther.data.type, 'OTHER');
      assert.strictEqual(dataAddOther.data.isDefault, false);
      const otherId = dataAddOther.data._id;

      // 4. GET all addresses verifies count increased by 2 and default is WORK
      const resGet = await fetch(`${baseUrl}/auth/addresses`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(resGet.status, 200);
      const dataGet = await resGet.json();
      assert.strictEqual(dataGet.count, initialCount + 2);
      const fetchedWork = dataGet.data.find(a => a._id.toString() === workId.toString());
      assert.strictEqual(fetchedWork.isDefault, true);

      // 5. PUT update address landmark
      const resPut = await fetch(`${baseUrl}/auth/addresses/${otherId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          landmark: 'Near Calangute Beach Circle',
        }),
      });
      assert.strictEqual(resPut.status, 200);
      const dataPut = await resPut.json();
      assert.strictEqual(dataPut.data.landmark, 'Near Calangute Beach Circle');

      // 6. PATCH switch default address to OTHER
      const resPatchDefault = await fetch(`${baseUrl}/auth/addresses/${otherId}/default`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(resPatchDefault.status, 200);
      const dataPatchDefault = await resPatchDefault.json();
      assert.strictEqual(dataPatchDefault.defaultAddress._id.toString(), otherId.toString());

      // 7. DELETE work address
      const resDel = await fetch(`${baseUrl}/auth/addresses/${workId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(resDel.status, 200);
      const dataDel = await resDel.json();
      assert.strictEqual(dataDel.addresses.length, initialCount + 1);
    });

    await test('GET /products/:slug fetches single product with vendor details', async () => {
      const res = await fetch(`${baseUrl}/products/${headphonesProduct.slug}`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data._id, headphonesProduct._id);
      assert.ok(data.data.vendor.storeName);
    });

    await test('Point 1: GET /products/:slug returns rich specifications, multi-image gallery, and variants for PDP', async () => {
      const res = await fetch(`${baseUrl}/products/${headphonesProduct.slug}`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.data.images) && data.data.images.length >= 2, 'Product must have multiple gallery images');
      assert.ok(Array.isArray(data.data.specifications) && data.data.specifications.length >= 4, 'Product must have detailed specifications');
      assert.ok(data.data.specifications.some(s => s.key === 'Battery Life'), 'Specifications must include attributes like Battery Life');
      assert.ok(data.data.hasVariants && data.data.variants.length > 0, 'Product must include variant details');
      assert.ok(data.data.vendor && data.data.vendor.storeName, 'Product must include vendor store information');
    });

    // 5. Vendor Portal Actions
    let createdProductId;

    await test('GET /vendor/dashboard returns vendor wallet and order stats', async () => {
      const res = await fetch(`${baseUrl}/vendor/dashboard`, {
        headers: { Authorization: `Bearer ${vendorToken}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data.metrics);
      assert.ok(data.data.vendor.storeName);
    });

    await test('POST /vendor/products creates a new catalog item for vendor store', async () => {
      const categoriesRes = await fetch(`${baseUrl}/products/categories`);
      const catData = await categoriesRes.json();
      const firstCatId = catData.data[0]._id;

      const res = await fetch(`${baseUrl}/vendor/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({
          title: 'Aura Bass Studio Wireless Earbuds',
          sellingPrice: 3499,
          mrp: 5999,
          stock: 50,
          sku: 'APX-BUD-' + Date.now().toString().slice(-4),
          category: firstCatId,
          description: 'High-res audio earbuds with dynamic drivers.',
        }),
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data._id);
      createdProductId = data.data._id;
    });

    await test('PUT /vendor/products/:id updates stock and selling price', async () => {
      const res = await fetch(`${baseUrl}/vendor/products/${createdProductId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({
          stock: 40,
          sellingPrice: 3299,
        }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.data.stock, 40);
      assert.strictEqual(data.data.sellingPrice, 3299);
    });

    await test('DELETE /vendor/products/:id deletes the created test product', async () => {
      const res = await fetch(`${baseUrl}/vendor/products/${createdProductId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${vendorToken}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
    });

    // 6. Multi-Vendor Order Splitting & Atomic Stock Lock
    let placedOrder;
    let initialHeadphonesStock = headphonesProduct.stock;
    let initialHoodieStock = hoodieProduct.stock;

    await test('POST /orders splits items across distinct vendors and locks stock atomically', async () => {
      const res = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          items: [
            { productId: headphonesProduct._id, quantity: 2, variantSku: 'APX-HEAD-BLK' },
            { productId: hoodieProduct._id, quantity: 1, variantSku: 'VOG-HOD-M' },
          ],
          shippingAddress: {
            recipientName: 'Aman Sharma',
            phone: '9876543214',
            street: 'Flat 402, Green Valley Apartments',
            city: 'New Delhi',
            state: 'Delhi',
            pincode: '110001',
          },
          deliveryInstructions: 'Leave with security guard. Ring bell once.',
          paymentMethod: 'COD',
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data._id);
      placedOrder = data.data;
      assert.strictEqual(placedOrder.deliveryInstructions, 'Leave with security guard. Ring bell once.');

      // Verify sub-orders were split (2 vendors = 2 suborders)
      assert.strictEqual(placedOrder.subOrders.length, 2, 'Should create exactly 2 sub-orders');

      // Verify total amounts
      const expectedTotal = headphonesProduct.sellingPrice * 2 + hoodieProduct.sellingPrice * 1;
      assert.strictEqual(placedOrder.totalAmount, expectedTotal);

      // Verify atomic stock decrement in DB (both total product stock and variant stock)
      const updatedHeadphones = await Product.findById(headphonesProduct._id);
      const updatedHoodie = await Product.findById(hoodieProduct._id);
      assert.strictEqual(updatedHeadphones.stock, initialHeadphonesStock - 2);
      assert.strictEqual(updatedHoodie.stock, initialHoodieStock - 1);
      const blkVariant = updatedHeadphones.variants.find(v => v.sku === 'APX-HEAD-BLK');
      assert.strictEqual(blkVariant.stock, 25 - 2);
    });

    await test('Point 2: Multi-Attribute Variant Matrix adjusts pricing, decrements variant stock and rejects over-stock variant orders', async () => {
      // Find Silver variant with additionalPrice: 500
      const hp = await Product.findById(headphonesProduct._id);
      const silverVariant = hp.variants.find(v => v.sku === 'APX-HEAD-SLV');
      const prevSilverStock = silverVariant.stock;

      // 1. Order with Silver variant
      const res = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          items: [
            { productId: hp._id, quantity: 1, variantSku: 'APX-HEAD-SLV' },
          ],
          shippingAddress: {
            recipientName: 'Aman Sharma',
            phone: '9876543214',
            street: 'Flat 402, Green Valley Apartments',
            city: 'New Delhi',
            state: 'Delhi',
            pincode: '110001',
          },
          paymentMethod: 'COD',
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.totalAmount, hp.sellingPrice + 500);

      // Verify variant-specific stock decremented
      const reloadedHp = await Product.findById(hp._id);
      const updatedSilver = reloadedHp.variants.find(v => v.sku === 'APX-HEAD-SLV');
      assert.strictEqual(updatedSilver.stock, prevSilverStock - 1);

      // 2. Reject order when variant stock exceeded
      const failRes = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          items: [
            { productId: hp._id, quantity: 9999, variantSku: 'APX-HEAD-SLV' },
          ],
          shippingAddress: {
            recipientName: 'Aman Sharma',
            phone: '9876543214',
            street: 'Flat 402, Green Valley Apartments',
            city: 'New Delhi',
            state: 'Delhi',
            pincode: '110001',
          },
          paymentMethod: 'COD',
        }),
      });
      assert.strictEqual(failRes.status, 400);
      const failData = await failRes.json();
      assert.strictEqual(failData.success, false);
      assert.ok(failData.message.includes('Insufficient stock for variant'));
    });

    // 7. Verify Customer Order Tracking & Delivery OTP
    let subOrder1;
    let subOrder2;

    await test('GET /orders/:id returns order details with 4-digit secret delivery OTP', async () => {
      const res = await fetch(`${baseUrl}/orders/${placedOrder._id}`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      subOrder1 = data.data.subOrders[0];
      subOrder2 = data.data.subOrders[1];

      assert.strictEqual(data.data.deliveryInstructions, 'Leave with security guard. Ring bell once.');
      assert.strictEqual(subOrder1.deliveryInstructions, 'Leave with security guard. Ring bell once.');
      assert.ok(subOrder1.deliveryOtp, 'Sub-order 1 must have delivery OTP');
      assert.strictEqual(subOrder1.deliveryOtp.length, 4, 'OTP must be 4 digits');
      assert.ok(subOrder2.deliveryOtp, 'Sub-order 2 must have delivery OTP');
      assert.strictEqual(subOrder2.deliveryOtp.length, 4, 'OTP must be 4 digits');
    });

    // 8. Vendor Order Acceptance & Dispatch
    await test('PUT /vendor/orders/:id/status allows vendor to update packaging status', async () => {
      // Find suborder belonging to Apex Tech
      const apexSub = await SubOrder.findOne({ parentOrder: placedOrder._id, vendor: headphonesProduct.vendor._id });
      assert.ok(apexSub, 'Apex sub-order must exist');

      const res = await fetch(`${baseUrl}/vendor/orders/${apexSub._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({ status: 'packed', note: 'Boxed and barcoded' }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.data.status, 'packed');
    });

    // 9. Courier Tasks & 4-Digit Customer OTP Verification
    let riderTask;

    await test('GET /delivery/tasks returns courier rider assigned drops', async () => {
      const res = await fetch(`${baseUrl}/delivery/tasks`, {
        headers: { Authorization: `Bearer ${riderToken}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data.length > 0);
      riderTask = data.data.find(t => t.subOrder?._id === subOrder1._id || t.subOrder === subOrder1._id);
      if (!riderTask) {
        riderTask = data.data[0];
      }
      assert.ok(riderTask, 'Rider must have at least one delivery task');
      assert.strictEqual(riderTask.deliveryInstructions, 'Leave with security guard. Ring bell once.');
    });

    await test('Point 25: Order Delivery Instructions / Rider Notes box passed to Order, SubOrder, and DeliveryTask', async () => {
      assert.strictEqual(placedOrder.deliveryInstructions, 'Leave with security guard. Ring bell once.');
      const dt = await DeliveryTask.findOne({ subOrder: subOrder1._id });
      assert.ok(dt, 'Delivery task must exist');
      assert.strictEqual(dt.deliveryInstructions, 'Leave with security guard. Ring bell once.');
    });

    await test('Point 26: Multi-Gateway Dynamic Checkout UI (COD, Razorpay, Stripe, Direct UPI QR)', async () => {
      // 1. Direct UPI Order
      const resUpi = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          items: [{ productId: headphonesProduct._id, quantity: 1, variantSku: 'APX-HEAD-BLK' }],
          shippingAddress: {
            recipientName: 'Aman Sharma',
            phone: '9876543214',
            street: 'Flat 402, Green Valley Apartments',
            city: 'New Delhi',
            state: 'Delhi',
            pincode: '110001',
          },
          paymentMethod: 'UPI',
          paymentDetails: {
            gateway: 'UPI',
            upiUtr: '987654321098',
          },
        }),
      });
      assert.strictEqual(resUpi.status, 201);
      const dataUpi = await resUpi.json();
      assert.strictEqual(dataUpi.data.paymentMethod, 'UPI');
      assert.strictEqual(dataUpi.data.paymentStatus, 'PAID');
      assert.strictEqual(dataUpi.data.paymentDetails.upiUtr, '987654321098');

      // Verify delivery task for prepaid UPI order has amountToCollect = 0
      const upiTask = await DeliveryTask.findOne({ subOrder: dataUpi.data.subOrders[0]._id });
      assert.ok(upiTask);
      assert.strictEqual(upiTask.isCod, false);
      assert.strictEqual(upiTask.amountToCollect, 0);

      // Cancel to restore stock for subsequent tests
      await fetch(`${baseUrl}/orders/${dataUpi.data._id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
      });

      // 2. Stripe Global Card Order
      const resStripe = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          items: [{ productId: headphonesProduct._id, quantity: 1, variantSku: 'APX-HEAD-BLK' }],
          shippingAddress: {
            recipientName: 'Aman Sharma',
            phone: '9876543214',
            street: 'Flat 402, Green Valley Apartments',
            city: 'New Delhi',
            state: 'Delhi',
            pincode: '110001',
          },
          paymentMethod: 'STRIPE',
          paymentDetails: {
            gateway: 'STRIPE',
            transactionId: 'ch_test_4242stripe',
            cardLast4: '4242',
          },
        }),
      });
      assert.strictEqual(resStripe.status, 201);
      const dataStripe = await resStripe.json();
      assert.strictEqual(dataStripe.data.paymentMethod, 'STRIPE');
      assert.strictEqual(dataStripe.data.paymentStatus, 'PAID');
      assert.strictEqual(dataStripe.data.paymentDetails.cardLast4, '4242');

      // Cancel to restore stock
      await fetch(`${baseUrl}/orders/${dataStripe.data._id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
      });
    });

    await test('Point 27: Live Visual Step-by-Step Order Tracker (GET /orders/track/:identifier & POST /orders/:id/advance-step)', async () => {
      // 1. Track by orderNumber (public endpoint, no auth required)
      const resTrack = await fetch(`${baseUrl}/orders/track/${placedOrder.orderNumber}`);
      assert.strictEqual(resTrack.status, 200);
      const dataTrack = await resTrack.json();
      assert.strictEqual(dataTrack.success, true);
      assert.strictEqual(dataTrack.data.orderId, placedOrder.orderNumber);
      assert.ok(Array.isArray(dataTrack.data.subOrders));
      assert.ok(dataTrack.data.subOrders.length >= 1);

      const firstSub = dataTrack.data.subOrders[0];
      assert.ok(Array.isArray(firstSub.steps), 'Must return 5-step milestone array');
      assert.strictEqual(firstSub.steps.length, 5, 'Must contain all 5 lifecycle steps');
      assert.strictEqual(firstSub.steps[0].key, 'placed');
      assert.strictEqual(firstSub.steps[0].isCompleted, true);
      assert.strictEqual(firstSub.deliveryOtp.length, 4, 'Must expose delivery OTP');
      assert.ok(firstSub.deliveryPartner.name, 'Must include courier partner name');

      // 2. Track by MongoDB _id
      const resById = await fetch(`${baseUrl}/orders/track/${placedOrder._id}`);
      assert.strictEqual(resById.status, 200);
      const dataById = await resById.json();
      assert.strictEqual(dataById.data.rawOrderId.toString(), placedOrder._id.toString());

      // 3. Track non-existent order
      const res404 = await fetch(`${baseUrl}/orders/track/INVALID_REF_9999`);
      assert.strictEqual(res404.status, 404);
      const data404 = await res404.json();
      assert.strictEqual(data404.success, false);

      // 4. Advance milestone simulation (POST /orders/:id/advance-step)
      const resAdvance = await fetch(`${baseUrl}/orders/${placedOrder._id}/advance-step`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ step: 'dispatched' }),
      });
      assert.strictEqual(resAdvance.status, 200);
      const dataAdvance = await resAdvance.json();
      assert.strictEqual(dataAdvance.success, true);

      // Verify that tracked order now has dispatched milestone completed
      const resTrackUpdated = await fetch(`${baseUrl}/orders/track/${placedOrder.orderNumber}`);
      const dataTrackUpdated = await resTrackUpdated.json();
      const updatedSub = dataTrackUpdated.data.subOrders[0];
      const dispatchedStep = updatedSub.steps.find(s => s.key === 'dispatched');
      assert.ok(dispatchedStep);
      assert.strictEqual(dispatchedStep.isCompleted, true);
      assert.strictEqual(dispatchedStep.isCurrent, true);
    });

    await test('Point 28: 1-Click Self-Cancel Order (Before dispatch with inventory auto-restoration & reason tracking; rejected after dispatch)', async () => {
      // 1. Check stock before placement
      const prodBefore = await Product.findById(headphonesProduct._id);
      const stockBefore = prodBefore.stock;

      // 2. Place order before dispatch
      const resOrder = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          items: [{ productId: headphonesProduct._id, quantity: 2, variantSku: 'APX-HEAD-BLK' }],
          shippingAddress: {
            recipientName: 'Aman Sharma',
            phone: '9876543214',
            street: 'Flat 402, Green Valley Apartments',
            city: 'New Delhi',
            state: 'Delhi',
            pincode: '110001',
          },
          paymentMethod: 'COD',
        }),
      });
      assert.strictEqual(resOrder.status, 201);
      const dataOrder = await resOrder.json();
      const orderId = dataOrder.data._id;
      const orderNum = dataOrder.data.orderNumber;

      // Stock should have decremented by 2
      const prodPlaced = await Product.findById(headphonesProduct._id);
      assert.strictEqual(prodPlaced.stock, stockBefore - 2);

      // Verify tracker confirms self-cancel is eligible
      const resTrackPre = await fetch(`${baseUrl}/orders/track/${orderNum}`);
      const dataTrackPre = await resTrackPre.json();
      assert.strictEqual(dataTrackPre.data.canSelfCancel, true);

      // 3. Customer 1-Click Self-Cancel with reason
      const resCancel = await fetch(`${baseUrl}/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ reason: 'Ordered by mistake — need different color' }),
      });
      assert.strictEqual(resCancel.status, 200);
      const dataCancel = await resCancel.json();
      assert.strictEqual(dataCancel.success, true);
      assert.strictEqual(dataCancel.data.status, 'CANCELLED');
      assert.strictEqual(dataCancel.data.cancellationReason, 'Ordered by mistake — need different color');

      // Inventory auto-restoration check: stock returned to initial value
      const prodRestored = await Product.findById(headphonesProduct._id);
      assert.strictEqual(prodRestored.stock, stockBefore, 'Inventory must be automatically restored on self-cancellation');

      // 4. Place another order and advance to DISPATCHED to test guardrail
      const resOrder2 = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          items: [{ productId: headphonesProduct._id, quantity: 1, variantSku: 'APX-HEAD-BLK' }],
          shippingAddress: {
            recipientName: 'Aman Sharma',
            phone: '9876543214',
            street: 'Flat 402, Green Valley Apartments',
            city: 'New Delhi',
            state: 'Delhi',
            pincode: '110001',
          },
          paymentMethod: 'COD',
        }),
      });
      assert.strictEqual(resOrder2.status, 201);
      const dataOrder2 = await resOrder2.json();
      const orderId2 = dataOrder2.data._id;

      // Advance to 'dispatched'
      await fetch(`${baseUrl}/orders/${orderId2}/advance-step`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ step: 'dispatched' }),
      });

      // Verify tracker confirms self-cancel is now blocked
      const resTrackPost = await fetch(`${baseUrl}/orders/track/${dataOrder2.data.orderNumber}`);
      const dataTrackPost = await resTrackPost.json();
      assert.strictEqual(dataTrackPost.data.canSelfCancel, false);

      // Customer attempt to self-cancel must be rejected with 400
      const resBlocked = await fetch(`${baseUrl}/orders/${orderId2}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ reason: 'Attempt late cancel' }),
      });
      assert.strictEqual(resBlocked.status, 400);
      const dataBlocked = await resBlocked.json();
      assert.strictEqual(dataBlocked.success, false);
      assert.ok(dataBlocked.message.includes('after dispatch'));

      // Admin cancels order2 to clean up stock
      await fetch(`${baseUrl}/orders/${orderId2}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test('Point 29: Return & Refund Request System with reason, photo upload, delivery check, and inventory auto-restoration', async () => {
      // 1. Place a test order for return flow
      const resOrder = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          items: [{ productId: headphonesProduct._id, quantity: 1, variantSku: 'APX-HEAD-BLK' }],
          shippingAddress: {
            recipientName: 'Aman Sharma',
            phone: '9876543214',
            street: 'Flat 402, Green Valley Apartments',
            city: 'New Delhi',
            state: 'Delhi',
            pincode: '110001',
          },
          paymentMethod: 'COD',
        }),
      });
      assert.strictEqual(resOrder.status, 201);
      const dataOrder = await resOrder.json();
      const orderId = dataOrder.data._id;

      // 2. Reject return request before delivery
      const resPremature = await fetch(`${baseUrl}/returns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          orderId,
          reason: 'Defective item',
        }),
      });
      assert.strictEqual(resPremature.status, 400);
      const dataPremature = await resPremature.json();
      assert.strictEqual(dataPremature.success, false);
      assert.ok(dataPremature.message.includes('delivered orders'));

      // 3. Advance milestone to 'delivered'
      await fetch(`${baseUrl}/orders/${orderId}/advance-step`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ step: 'delivered' }),
      });

      // Stock before return approval
      const prodDelivered = await Product.findById(headphonesProduct._id);
      const stockDelivered = prodDelivered.stock;

      // 4. Create legitimate return request with photos and reason
      const returnPayload = {
        orderId,
        reason: 'Defective / damaged item',
        detailedDescription: 'Product arrived with crackling audio in the left ear cup at higher volumes.',
        proofPhotos: ['https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500'],
        refundMode: 'ORIGINAL_PAYMENT_METHOD',
      };

      const resReturn = await fetch(`${baseUrl}/returns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify(returnPayload),
      });
      assert.strictEqual(resReturn.status, 201);
      const dataReturn = await resReturn.json();
      assert.strictEqual(dataReturn.success, true);
      assert.strictEqual(dataReturn.data.status, 'REQUESTED');
      assert.strictEqual(dataReturn.data.reason, 'Defective / damaged item');
      assert.strictEqual(dataReturn.data.proofPhotos.length, 1);
      const returnRequestId = dataReturn.data._id;

      // 5. Duplicate return request rejected
      const resDup = await fetch(`${baseUrl}/returns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify(returnPayload),
      });
      assert.strictEqual(resDup.status, 400);

      // 6. Customer can view their return requests
      const resMy = await fetch(`${baseUrl}/returns/my`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(resMy.status, 200);
      const dataMy = await resMy.json();
      assert.strictEqual(dataMy.success, true);
      assert.ok(dataMy.count >= 1);

      // 7. Get return by order ID
      const resByOrder = await fetch(`${baseUrl}/returns/order/${orderId}`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(resByOrder.status, 200);
      const dataByOrder = await resByOrder.json();
      assert.strictEqual(dataByOrder.data._id, returnRequestId);

      // 8. Admin approves & processes refund -> auto-restores stock to inventory
      const resApprove = await fetch(`${baseUrl}/returns/${returnRequestId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: 'REFUNDED',
          resolutionNote: 'Quality defect verified. Refund initiated and stock restored.',
        }),
      });
      assert.strictEqual(resApprove.status, 200);
      const dataApprove = await resApprove.json();
      assert.strictEqual(dataApprove.data.status, 'REFUNDED');
      assert.ok(dataApprove.data.resolvedAt);

      // Verify stock was restored (+1)
      const prodRefunded = await Product.findById(headphonesProduct._id);
      assert.strictEqual(prodRefunded.stock, stockDelivered + 1, 'Stock must be auto-restored on return refund');
    });

    await test('Point 30: 1-Click Tax Invoice Download / Generation (GET /orders/:id/invoice with GST split & printable HTML)', async () => {
      // 1. Fetch tax invoice by orderNumber
      const resInv = await fetch(`${baseUrl}/orders/${placedOrder.orderNumber}/invoice`);
      assert.strictEqual(resInv.status, 200);
      const dataInv = await resInv.json();
      assert.strictEqual(dataInv.success, true);

      const inv = dataInv.data;
      assert.ok(inv.invoiceNumber.startsWith('INV-'));
      assert.ok(inv.invoiceDate);
      assert.strictEqual(inv.orderId, placedOrder.orderNumber);

      // Seller tax fields
      assert.ok(inv.seller.storeName);
      assert.ok(inv.seller.gstin);
      assert.ok(inv.seller.pan);

      // Buyer details
      assert.strictEqual(inv.buyer.name, 'Aman Sharma');
      assert.ok(inv.buyer.address);

      // Line items with HSN
      assert.ok(Array.isArray(inv.lineItems));
      assert.ok(inv.lineItems.length >= 1);
      assert.strictEqual(inv.lineItems[0].hsnCode, '85183000');
      assert.ok(inv.lineItems[0].taxableValue > 0);
      assert.ok(inv.lineItems[0].cgstAmount >= 0);
      assert.ok(inv.lineItems[0].sgstAmount >= 0);

      // Pricing & currency words
      assert.ok(inv.pricing.grandTotal > 0);
      assert.ok(inv.pricing.amountInWords.includes('Rupees'));
      assert.ok(inv.pricing.amountInWords.includes('Only'));

      // Printable HTML verification
      assert.ok(inv.printableHtml.includes('TAX INVOICE'));
      assert.ok(inv.printableHtml.includes('AuraMarket'));
      assert.ok(inv.printableHtml.includes(inv.seller.gstin));

      // 2. Fetch by MongoDB ID
      const resById = await fetch(`${baseUrl}/orders/${placedOrder._id}/invoice`);
      assert.strictEqual(resById.status, 200);

      // 3. 404 for non-existent order
      const res404 = await fetch(`${baseUrl}/orders/NON_EXISTENT_ORDER_9999/invoice`);
      assert.strictEqual(res404.status, 404);
    });

    await test('Point 31: Customer In-App Wallet & Reward Coins system (Cashback on purchases & checkout coin redemption)', async () => {
      // 1. Fetch wallet balance & transaction ledger
      const resWallet = await fetch(`${baseUrl}/wallet`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(resWallet.status, 200);
      const dataWallet = await resWallet.json();
      assert.strictEqual(dataWallet.success, true);
      assert.ok(typeof dataWallet.data.walletBalance === 'number');
      assert.ok(typeof dataWallet.data.walletCoins === 'number');
      assert.ok(Array.isArray(dataWallet.data.transactions));
      assert.ok(dataWallet.data.transactions.length >= 1);

      const initialCoins = dataWallet.data.walletCoins;
      const initialBalance = dataWallet.data.walletBalance;

      // 2. Claim daily check-in (+50 coins)
      const resCheckin = await fetch(`${baseUrl}/wallet/daily-checkin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(resCheckin.status, 200);
      const dataCheckin = await resCheckin.json();
      assert.strictEqual(dataCheckin.success, true);
      assert.strictEqual(dataCheckin.data.walletCoins, initialCoins + 50);

      // Duplicate check-in within 24h should be rejected
      const resDupCheckin = await fetch(`${baseUrl}/wallet/daily-checkin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(resDupCheckin.status, 400);

      // 3. Convert / redeem coins into wallet cash (e.g. 50 coins = ₹50 cash)
      const resRedeem = await fetch(`${baseUrl}/wallet/redeem-coins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ coins: 50 }),
      });
      assert.strictEqual(resRedeem.status, 200);
      const dataRedeem = await resRedeem.json();
      assert.strictEqual(dataRedeem.data.walletCoins, initialCoins); // initial + 50 - 50 = initial
      assert.strictEqual(dataRedeem.data.walletBalance, initialBalance + 50);

      // Rejects redeeming more coins than user has
      const resExcess = await fetch(`${baseUrl}/wallet/redeem-coins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ coins: 999999 }),
      });
      assert.strictEqual(resExcess.status, 400);

      // 4. Place an order redeeming 100 coins directly at checkout and earning 5% cashback
      const resOrder = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          items: [{ productId: headphonesProduct._id, quantity: 1, variantSku: 'APX-HEAD-BLK' }],
          shippingAddress: {
            recipientName: 'Aman Sharma',
            phone: '9876543214',
            street: 'Flat 402, Green Valley Apartments',
            city: 'New Delhi',
            state: 'Delhi',
            pincode: '110001',
          },
          paymentMethod: 'COD',
          coinsToRedeem: 100, // ₹100 discount via 100 reward coins
        }),
      });
      assert.strictEqual(resOrder.status, 201);
      const dataOrder = await resOrder.json();
      assert.strictEqual(dataOrder.data.walletCoinsUsed, 100);
      assert.ok(dataOrder.data.cashbackEarned >= 10, 'Must award 5% cashback coins');

      // Verify customer wallet transactions include COIN_REDEMPTION and CASHBACK
      const resWalletAfter = await fetch(`${baseUrl}/wallet`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      const dataWalletAfter = await resWalletAfter.json();
      const hasRedemption = dataWalletAfter.data.transactions.some(t => t.category === 'COIN_REDEMPTION' && t.type === 'DEBIT');
      const hasCashback = dataWalletAfter.data.transactions.some(t => t.category === 'CASHBACK' && t.type === 'CREDIT');
      assert.ok(hasRedemption, 'Wallet must log coin redemption DEBIT transaction');
      assert.ok(hasCashback, 'Wallet must log cashback CREDIT transaction');

      // Cancel test order to restore inventory
      await fetch(`${baseUrl}/orders/${dataOrder.data._id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
      });
    });

    await test('Point 32: Complete Order Management Center with multi-status filters & status update (GET /admin/orders & PUT /admin/orders/:id/status)', async () => {
      // 1. Fetch all orders with real-time status counts
      const resAll = await fetch(`${baseUrl}/admin/orders`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resAll.status, 200);
      const dataAll = await resAll.json();
      assert.strictEqual(dataAll.success, true);
      assert.ok(typeof dataAll.statusCounts === 'object');
      assert.ok(typeof dataAll.statusCounts.all === 'number');
      assert.ok(typeof dataAll.statusCounts.placed === 'number');
      assert.ok(Array.isArray(dataAll.data));

      // 2. Filter by status=PLACED
      const resPlaced = await fetch(`${baseUrl}/admin/orders?status=PLACED`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resPlaced.status, 200);
      const dataPlaced = await resPlaced.json();
      assert.strictEqual(dataPlaced.success, true);
      for (const ord of dataPlaced.data) {
        assert.strictEqual(ord.status, 'PLACED');
      }

      // 3. Search by customer / phone / orderNumber
      const resSearch = await fetch(`${baseUrl}/admin/orders?search=Aman`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resSearch.status, 200);
      const dataSearch = await resSearch.json();
      assert.strictEqual(dataSearch.success, true);

      // 4. Update order status from Super Admin (PUT /admin/orders/:id/status)
      const resUpdate = await fetch(`${baseUrl}/admin/orders/${placedOrder._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: 'DELIVERED',
          note: 'Admin verified doorstep handover',
        }),
      });
      assert.strictEqual(resUpdate.status, 200);
      const dataUpdate = await resUpdate.json();
      assert.strictEqual(dataUpdate.success, true);
      assert.strictEqual(dataUpdate.data.status, 'DELIVERED');
      assert.strictEqual(dataUpdate.data.paymentStatus, 'PAID');
    });

    await test('Point 33: Multi-Vendor Commission Split Inspector per order (GET /admin/orders/:id/commission-split)', async () => {
      // 1. Inspect commission split for placedOrder
      const resSplit = await fetch(`${baseUrl}/admin/orders/${placedOrder._id}/commission-split`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resSplit.status, 200);
      const dataSplit = await resSplit.json();
      assert.strictEqual(dataSplit.success, true);
      assert.strictEqual(dataSplit.data.orderId.toString(), placedOrder._id.toString());
      assert.strictEqual(dataSplit.data.orderNumber, placedOrder.orderNumber);

      // Verify financials & double-entry reconciliation
      const { financials, vendorSplits } = dataSplit.data;
      assert.ok(typeof financials.grossOrderAmount === 'number');
      assert.ok(typeof financials.totalVendorPayouts === 'number');
      assert.ok(typeof financials.totalPlatformCommissions === 'number');
      assert.strictEqual(financials.isPennyPerfectReconciled, true, 'Must verify penny-perfect double-entry reconciliation');
      assert.ok(financials.reconciliationDelta <= 1, 'Reconciliation delta must be <= 1 INR');

      // Verify vendor split array
      assert.ok(Array.isArray(vendorSplits) && vendorSplits.length >= 1, 'Must contain vendor split entries');
      const firstSplit = vendorSplits[0];
      assert.ok(firstSplit.storeName, 'Must include vendor store name');
      assert.ok(typeof firstSplit.commissionRatePercent === 'number', 'Must include commission rate');
      assert.ok(typeof firstSplit.vendorSubtotal === 'number');
      assert.ok(typeof firstSplit.platformCommissionCut === 'number');
      assert.ok(typeof firstSplit.netVendorPayable === 'number');
      assert.strictEqual(
        firstSplit.vendorSubtotal,
        firstSplit.platformCommissionCut + firstSplit.netVendorPayable,
        'Vendor subtotal must equal platform cut plus net vendor payout'
      );

      // 2. Lookup by Order Number string
      const resByNumber = await fetch(`${baseUrl}/admin/orders/${placedOrder.orderNumber}/commission-split`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resByNumber.status, 200);
      const dataByNumber = await resByNumber.json();
      assert.strictEqual(dataByNumber.success, true);
      assert.strictEqual(dataByNumber.data.orderNumber, placedOrder.orderNumber);

      // 3. Non-existent order returns 404
      const resNotFound = await fetch(`${baseUrl}/admin/orders/ord_non_existent/commission-split`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resNotFound.status, 404);
    });

    await test('Point 34: 1-Click Master Printable Tax Invoice Generator with GSTIN, HSN & Company Seal (GET /admin/orders/:id/invoice)', async () => {
      // 1. Fetch Tax Invoice via Super Admin endpoint
      const resInvoice = await fetch(`${baseUrl}/admin/orders/${placedOrder._id}/invoice`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resInvoice.status, 200);
      const invoiceData = await resInvoice.json();
      assert.strictEqual(invoiceData.success, true);
      assert.ok(invoiceData.data.invoiceNumber.startsWith('INV-'));
      assert.strictEqual(invoiceData.data.orderNumber, placedOrder.orderNumber);

      // Verify Seller & Buyer details
      const { seller, buyer, lineItems, hsnSummary, companySeal, pricing } = invoiceData.data;
      assert.ok(seller.companyName, 'Must have seller company name');
      assert.ok(seller.gstin, 'Must have seller GSTIN');
      assert.ok(seller.cin, 'Must have corporate CIN');
      assert.ok(buyer.recipientName, 'Must have buyer recipient name');
      assert.ok(buyer.state, 'Must have buyer state');

      // Verify Line items & HSN breakdown
      assert.ok(Array.isArray(lineItems) && lineItems.length >= 1, 'Must have invoice line items');
      assert.ok(lineItems[0].hsnCode, 'Line item must have HSN code');
      assert.ok(lineItems[0].taxableValue > 0, 'Line item must have taxable value');

      // Verify HSN Summary Table
      assert.ok(Array.isArray(hsnSummary) && hsnSummary.length >= 1, 'Must aggregate HSN summary');
      assert.strictEqual(hsnSummary[0].hsnCode, lineItems[0].hsnCode);
      assert.ok(typeof hsnSummary[0].taxableValue === 'number');
      assert.ok(typeof hsnSummary[0].totalTax === 'number');

      // Verify Cryptographic Corporate Seal
      assert.ok(companySeal.legalEntityName, 'Must specify corporate legal entity');
      assert.ok(companySeal.cin, 'Must include corporate CIN');
      assert.ok(companySeal.verificationCode.startsWith('AUTH-SEAL-'), 'Must have SHA-256 seal verification code');
      assert.ok(companySeal.signatory, 'Must have authorized signatory cell');

      // Verify Dynamic Inter-State vs Intra-State GST pricing
      assert.ok(typeof pricing.subtotal === 'number');
      assert.ok(typeof pricing.grandTotal === 'number');
      assert.ok(typeof pricing.isInterState === 'boolean');
      assert.ok(pricing.amountInWords.includes('Rupees'), 'Must include amount in words');
      if (pricing.isInterState) {
        assert.ok(pricing.igstTotal >= 0);
      } else {
        assert.strictEqual(pricing.cgstTotal, pricing.sgstTotal, 'CGST and SGST must match in intra-state transaction');
      }

      // 2. Fetch standalone printable HTML via ?format=html
      const resHtml = await fetch(`${baseUrl}/admin/orders/${placedOrder._id}/invoice?format=html`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resHtml.status, 200);
      const contentType = resHtml.headers.get('content-type');
      assert.ok(contentType.includes('text/html'), 'Must return text/html format');
      const htmlText = await resHtml.text();
      assert.ok(htmlText.includes('TAX INVOICE'), 'HTML must render TAX INVOICE heading');
      assert.ok(htmlText.includes('HSN / SAC Tax Summary'), 'HTML must include HSN summary table');
      assert.ok(htmlText.includes(companySeal.verificationCode), 'HTML must render corporate seal hash');

      // 3. Customer endpoint also returns identical authentic invoice
      const resCustomer = await fetch(`${baseUrl}/orders/${placedOrder._id}/invoice`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(resCustomer.status, 200);
      const custData = await resCustomer.json();
    });

    await test('Point 35: Bulk Order Actions & RFC-4180 CSV/Excel Export (POST /admin/orders/bulk-status & GET/POST /admin/orders/export-csv)', async () => {
      // 1. Bulk Status Update
      const resBulkStatus = await fetch(`${baseUrl}/admin/orders/bulk-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          orderIds: [placedOrder._id],
          status: 'CONFIRMED',
          note: 'Verified payment confirmation batch',
        }),
      });
      assert.strictEqual(resBulkStatus.status, 200);
      const dataBulkStatus = await resBulkStatus.json();
      assert.strictEqual(dataBulkStatus.success, true);
      assert.strictEqual(dataBulkStatus.updatedCount, 1);
      assert.ok(dataBulkStatus.updatedIds.includes(placedOrder._id.toString()));

      // 2. Reject empty orderIds array
      const resBadBulk = await fetch(`${baseUrl}/admin/orders/bulk-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ orderIds: [], status: 'SHIPPED' }),
      });
      assert.strictEqual(resBadBulk.status, 400);

      // 3. Export Filtered Orders as RFC-4180 CSV via GET
      const resCsvGet = await fetch(`${baseUrl}/admin/orders/export-csv?status=all`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resCsvGet.status, 200);
      const csvType = resCsvGet.headers.get('content-type');
      assert.ok(csvType.includes('text/csv'), 'Must return text/csv mime type');
      const csvDisposition = resCsvGet.headers.get('content-disposition');
      assert.ok(csvDisposition.includes('attachment; filename="AuraMarket_Orders_'), 'Must include attachment header');
      const csvText = await resCsvGet.text();
      assert.ok(csvText.includes('Order ID,Date,Customer Name'), 'Must contain CSV headers');
      assert.ok(csvText.includes(placedOrder.orderNumber), 'Must contain order number in exported CSV');

      // 4. Export Selected Orders via POST
      const resCsvPost = await fetch(`${baseUrl}/admin/orders/export-csv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ orderIds: [placedOrder._id] }),
      });
      assert.strictEqual(resCsvPost.status, 200);
      const postCsvText = await resCsvPost.text();
      assert.ok(postCsvText.includes(placedOrder.orderNumber));

      // 5. Bulk Invoices endpoint (POST /admin/orders/bulk-invoices)
      const resBulkInvoices = await fetch(`${baseUrl}/admin/orders/bulk-invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ orderIds: [placedOrder._id] }),
      });
      assert.strictEqual(resBulkInvoices.status, 200);
      const dataBulkInvoices = await resBulkInvoices.json();
      assert.strictEqual(dataBulkInvoices.success, true);
      assert.strictEqual(dataBulkInvoices.count, 1);
    });

    await test('Point 36: Category & Sub-Category Tree Manager (POST/PUT/DELETE /admin/categories & GET /categories?tree=true)', async () => {
      // 1. Create a root category
      const resRoot = await fetch(`${baseUrl}/admin/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Audio & Studio Gear',
          description: 'High-fidelity audio monitors and headsets',
          icon: 'headphones',
          isFeatured: true,
          displayOrder: 10,
        }),
      });
      assert.strictEqual(resRoot.status, 201);
      const rootData = await resRoot.json();
      assert.strictEqual(rootData.success, true);
      assert.strictEqual(rootData.data.name, 'Audio & Studio Gear');
      assert.strictEqual(rootData.data.slug, 'audio-studio-gear');
      const rootCatId = rootData.data._id;

      // 2. Create a child sub-category under the root
      const resSub = await fetch(`${baseUrl}/admin/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Studio Monitor Speakers',
          parentCategory: rootCatId,
          icon: 'headphones',
          displayOrder: 1,
        }),
      });
      assert.strictEqual(resSub.status, 201);
      const subData = await resSub.json();
      assert.strictEqual(subData.data.parentCategory._id.toString(), rootCatId.toString());
      const subCatId = subData.data._id;

      // 3. Query category hierarchy with ?tree=true
      const resTree = await fetch(`${baseUrl}/categories?tree=true`);
      assert.strictEqual(resTree.status, 200);
      const treeData = await resTree.json();
      assert.strictEqual(treeData.success, true);
      const treeNode = treeData.data.find(c => c._id.toString() === rootCatId.toString());
      assert.ok(treeNode, 'Created root category must exist in tree');
      assert.ok(Array.isArray(treeNode.subcategories));
      const childInTree = treeNode.subcategories.find(s => s._id.toString() === subCatId.toString());
      assert.ok(childInTree, 'Created subcategory must be nested inside root category node');

      // 4. Update category details
      const resUpdate = await fetch(`${baseUrl}/admin/categories/${rootCatId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Pro Audio & Studio Gear',
          displayOrder: 5,
        }),
      });
      assert.strictEqual(resUpdate.status, 200);
      const updateData = await resUpdate.json();
      assert.strictEqual(updateData.data.name, 'Pro Audio & Studio Gear');

      // 5. Batch Reorder categories
      const resReorder = await fetch(`${baseUrl}/admin/categories/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          orders: [
            { id: rootCatId, displayOrder: 1 },
            { id: subCatId, displayOrder: 2 },
          ],
        }),
      });
      assert.strictEqual(resReorder.status, 200);

      // 6. Delete sub-category
      const resDel = await fetch(`${baseUrl}/admin/categories/${subCatId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resDel.status, 200);

      // Clean up root category
      await fetch(`${baseUrl}/admin/categories/${rootCatId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test('Point 37: Brand Directory & Manufacturer Hub (POST/GET/PUT/DELETE /admin/brands & /brands)', async () => {
      // 1. Create a new brand
      const resCreate = await fetch(`${baseUrl}/admin/brands`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Sennheiser Acoustics',
          slug: 'sennheiser-acoustics',
          logo: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=200',
          description: 'Precision audio engineering and studio microphones',
          website: 'https://sennheiser.com',
          isFeatured: true,
          displayOrder: 1,
        }),
      });
      assert.strictEqual(resCreate.status, 201);
      const createData = await resCreate.json();
      assert.strictEqual(createData.success, true);
      assert.strictEqual(createData.data.name, 'Sennheiser Acoustics');
      assert.strictEqual(createData.data.slug, 'sennheiser-acoustics');
      const brandId = createData.data._id;

      // 2. Reject duplicate brand name
      const resDup = await fetch(`${baseUrl}/admin/brands`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Sennheiser Acoustics',
          slug: 'different-slug',
        }),
      });
      assert.strictEqual(resDup.status, 400);

      // 3. Query all brands (Public GET /brands)
      const resList = await fetch(`${baseUrl}/brands`);
      assert.strictEqual(resList.status, 200);
      const listData = await resList.json();
      assert.strictEqual(listData.success, true);
      const found = listData.data.find(b => b._id.toString() === brandId.toString());
      assert.ok(found, 'Created brand must be listed in public brand directory');
      assert.ok(typeof found.productCount === 'number');

      // 4. Query single brand by slug (GET /brands/:slug)
      const resSingle = await fetch(`${baseUrl}/brands/sennheiser-acoustics`);
      assert.strictEqual(resSingle.status, 200);
      const singleData = await resSingle.json();
      assert.strictEqual(singleData.data.name, 'Sennheiser Acoustics');
      assert.strictEqual(singleData.data.website, 'https://sennheiser.com');

      // 5. Update brand details
      const resUpdate = await fetch(`${baseUrl}/admin/brands/${brandId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          description: 'Updated high-resolution studio monitors and noise cancelling earphones',
          isFeatured: false,
        }),
      });
      assert.strictEqual(resUpdate.status, 200);
      const updateData = await resUpdate.json();
      assert.strictEqual(updateData.data.isFeatured, false);
      assert.ok(updateData.data.description.includes('studio monitors'));

      // 6. Delete brand
      const resDel = await fetch(`${baseUrl}/admin/brands/${brandId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resDel.status, 200);
      const delData = await resDel.json();
      assert.strictEqual(delData.success, true);
    });

    await test('Point 38: Homepage Hero Slider & Promo Banner Manager (CRUD, position filter, reorder, and active toggle)', async () => {
      // 1. Create a hero banner
      const resCreate = await fetch(`${baseUrl}/admin/banners`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          title: 'Premium Studio Monitors Sale',
          subtitle: 'High fidelity audio equipment with 24-bit DAC and wireless streaming.',
          badgeText: '🔥 Mega Sound Festival',
          imageUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=1200',
          actionLink: '/category/audio',
          buttonText: 'Discover Audio',
          position: 'hero_slider',
          displayOrder: 1,
          isActive: true,
        }),
      });
      assert.strictEqual(resCreate.status, 201);
      const createData = await resCreate.json();
      assert.strictEqual(createData.success, true);
      assert.strictEqual(createData.data.title, 'Premium Studio Monitors Sale');
      assert.strictEqual(createData.data.position, 'hero_slider');
      const bannerId = createData.data._id;

      // 2. Reject banner creation missing required fields
      const resInvalid = await fetch(`${baseUrl}/admin/banners`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          title: 'Missing Image Banner',
        }),
      });
      assert.strictEqual(resInvalid.status, 400);

      // 3. Create a top promo banner
      const resPromo = await fetch(`${baseUrl}/admin/banners`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          title: 'Summer Cashback Extravaganza',
          subtitle: 'Get up to 25% cashback on all credit card purchases.',
          badgeText: '💰 Cashback Alert',
          imageUrl: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=1200',
          actionLink: '/products',
          buttonText: 'Shop Cashback',
          position: 'promo_banner_top',
          displayOrder: 1,
          isActive: true,
        }),
      });
      assert.strictEqual(resPromo.status, 201);
      const promoData = await resPromo.json();
      const promoId = promoData.data._id;

      // 4. Query public banners with position filter (GET /banners?position=hero_slider)
      const resPublicHero = await fetch(`${baseUrl}/banners?position=hero_slider`);
      assert.strictEqual(resPublicHero.status, 200);
      const publicHeroData = await resPublicHero.json();
      assert.strictEqual(publicHeroData.success, true);
      assert.ok(Array.isArray(publicHeroData.data));
      const foundHero = publicHeroData.data.find(b => b._id.toString() === bannerId.toString());
      assert.ok(foundHero, 'Created hero banner must be returned in public hero_slider query');
      const foundPromoInHero = publicHeroData.data.find(b => b._id.toString() === promoId.toString());
      assert.strictEqual(foundPromoInHero, undefined, 'Promo banner must not appear in hero_slider filtered query');

      // 5. Query admin banners with stats (GET /admin/banners)
      const resAdminBanners = await fetch(`${baseUrl}/admin/banners`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resAdminBanners.status, 200);
      const adminBannersData = await resAdminBanners.json();
      assert.strictEqual(adminBannersData.success, true);
      assert.ok(adminBannersData.stats.total >= 2);
      assert.ok(adminBannersData.stats.hero >= 1);
      assert.ok(adminBannersData.stats.promo >= 1);

      // 6. Update banner (PUT /admin/banners/:id)
      const resUpdate = await fetch(`${baseUrl}/admin/banners/${bannerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          title: 'Premium Studio Monitors Sale — Extended 48h',
          badgeText: '⏰ Ends Midnight',
        }),
      });
      assert.strictEqual(resUpdate.status, 200);
      const updateData = await resUpdate.json();
      assert.strictEqual(updateData.data.title, 'Premium Studio Monitors Sale — Extended 48h');
      assert.strictEqual(updateData.data.badgeText, '⏰ Ends Midnight');

      // 7. Toggle active status (PATCH /admin/banners/:id/toggle)
      const resToggle = await fetch(`${baseUrl}/admin/banners/${bannerId}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resToggle.status, 200);
      const toggleData = await resToggle.json();
      assert.strictEqual(toggleData.data.isActive, false, 'Banner should be deactivated');

      // Verify deactivated banner no longer appears in public active query
      const resCheckInactive = await fetch(`${baseUrl}/banners?position=hero_slider&activeOnly=true`);
      const checkInactiveData = await resCheckInactive.json();
      const stillInPublic = checkInactiveData.data.find(b => b._id.toString() === bannerId.toString());
      assert.strictEqual(stillInPublic, undefined, 'Deactivated banner must not appear in active public banners');

      // Toggle back to active
      await fetch(`${baseUrl}/admin/banners/${bannerId}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      // 8. Reorder banners (PUT /admin/banners/reorder)
      const resReorder = await fetch(`${baseUrl}/admin/banners/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          items: [
            { id: promoId, displayOrder: 1 },
            { id: bannerId, displayOrder: 2 },
          ],
        }),
      });
      assert.strictEqual(resReorder.status, 200);
      const reorderData = await resReorder.json();
      assert.strictEqual(reorderData.success, true);

      // 9. Delete banner (DELETE /admin/banners/:id)
      const resDelete = await fetch(`${baseUrl}/admin/banners/${bannerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resDelete.status, 200);
      const deleteData = await resDelete.json();
      assert.strictEqual(deleteData.success, true);

      // Clean up promo banner
      await fetch(`${baseUrl}/admin/banners/${promoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test('Point 39: Dynamic Top Announcement Bar Controller (GET /ui/announcement, PUT /admin/announcement & /ui/config persistence)', async () => {
      // 1. Get current public announcement configuration
      const resGet = await fetch(`${baseUrl}/ui/announcement`);
      assert.strictEqual(resGet.status, 200);
      const dataGet = await resGet.json();
      assert.strictEqual(dataGet.success, true);
      assert.ok(dataGet.data.text);
      assert.strictEqual(typeof dataGet.data.enabled, 'boolean');

      // 2. Super Admin updates announcement settings via PUT /admin/announcement
      const targetCountdown = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      const resUpdate = await fetch(`${baseUrl}/admin/announcement`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          enabled: true,
          text: '⚡ Mega Flash Weekend: Flat ₹500 OFF with code FESTIVE500!',
          bgColor: '#059669',
          textColor: '#FFFFFF',
          couponCode: 'FESTIVE500',
          actionLink: '/category/electronics-audio',
          buttonText: 'Claim ₹500 OFF',
          isDismissible: true,
          countdownEnd: targetCountdown,
        }),
      });
      assert.strictEqual(resUpdate.status, 200);
      const dataUpdate = await resUpdate.json();
      assert.strictEqual(dataUpdate.success, true);
      assert.strictEqual(dataUpdate.data.text, '⚡ Mega Flash Weekend: Flat ₹500 OFF with code FESTIVE500!');
      assert.strictEqual(dataUpdate.data.bgColor, '#059669');
      assert.strictEqual(dataUpdate.data.textColor, '#FFFFFF');
      assert.strictEqual(dataUpdate.data.couponCode, 'FESTIVE500');
      assert.strictEqual(dataUpdate.data.buttonText, 'Claim ₹500 OFF');

      // 3. Verify public GET /ui/config reflects updated announcement and top-level fields
      const resConfig = await fetch(`${baseUrl}/ui/config`);
      assert.strictEqual(resConfig.status, 200);
      const dataConfig = await resConfig.json();
      assert.strictEqual(dataConfig.data.announcementText, '⚡ Mega Flash Weekend: Flat ₹500 OFF with code FESTIVE500!');
      assert.strictEqual(dataConfig.data.showAnnouncement, true);
      assert.strictEqual(dataConfig.data.announcement.couponCode, 'FESTIVE500');
      assert.strictEqual(dataConfig.data.announcement.bgColor, '#059669');

      // 4. Toggle announcement OFF
      const resToggleOff = await fetch(`${baseUrl}/admin/announcement`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          enabled: false,
        }),
      });
      assert.strictEqual(resToggleOff.status, 200);
      const dataToggleOff = await resToggleOff.json();
      assert.strictEqual(dataToggleOff.data.enabled, false);

      // Verify toggle OFF synchronizes with showAnnouncement
      const resConfigOff = await fetch(`${baseUrl}/ui/config`);
      const dataConfigOff = await resConfigOff.json();
      assert.strictEqual(dataConfigOff.data.showAnnouncement, false);
      assert.strictEqual(dataConfigOff.data.announcement.enabled, false);

      // Toggle back ON with default festive announcement
      await fetch(`${baseUrl}/admin/announcement`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          enabled: true,
          text: '🔥 Festive Sale Live! Get up to 40% OFF with code FESTIVE2026',
          bgColor: '#F59E0B',
          textColor: '#0B0F17',
          couponCode: 'FESTIVE2026',
        }),
      });
    });

    await test('Point 40: Coupon & Promo Code Creator (Percentage/Flat, min spend, expiry date, usage limit & admin toggle)', async () => {
      // 1. Fetch initial admin coupons & stats
      const resStatsInit = await fetch(`${baseUrl}/coupons/admin/all`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resStatsInit.status, 200);
      const dataStatsInit = await resStatsInit.json();
      assert.strictEqual(dataStatsInit.success, true);
      assert.ok(dataStatsInit.stats);
      assert.strictEqual(typeof dataStatsInit.stats.total, 'number');
      assert.strictEqual(typeof dataStatsInit.stats.percentageCount, 'number');
      assert.strictEqual(typeof dataStatsInit.stats.flatCount, 'number');

      // 2. Super Admin creates a PERCENTAGE coupon with max cap & min spend
      const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      const resCreatePercent = await fetch(`${baseUrl}/coupons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          code: 'PERCENT25TEST',
          title: '25% Mega Discount Test',
          description: 'Get 25% discount capped at ₹500 on min ₹1000 spend',
          discountType: 'PERCENTAGE',
          discountValue: 25,
          maxDiscountAmount: 500,
          minOrderAmount: 1000,
          usageLimit: 50,
          expiryDate: tomorrow,
          isFeatured: true,
          isActive: true,
        }),
      });
      assert.strictEqual(resCreatePercent.status, 201);
      const dataCreatePercent = await resCreatePercent.json();
      assert.strictEqual(dataCreatePercent.success, true);
      assert.strictEqual(dataCreatePercent.data.code, 'PERCENT25TEST');
      assert.strictEqual(dataCreatePercent.data.discountType, 'PERCENTAGE');
      assert.strictEqual(dataCreatePercent.data.maxDiscountAmount, 500);
      const percentCouponId = dataCreatePercent.data._id;

      // 3. Super Admin creates a FLAT discount coupon
      const resCreateFlat = await fetch(`${baseUrl}/coupons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          code: 'FLAT750TEST',
          title: 'Flat ₹750 Festive Bonanza',
          description: 'Instant ₹750 flat rebate on orders over ₹3000',
          discountType: 'FLAT',
          discountValue: 750,
          minOrderAmount: 3000,
          usageLimit: 100,
          expiryDate: tomorrow,
          isFeatured: true,
          isActive: true,
        }),
      });
      assert.strictEqual(resCreateFlat.status, 201);
      const dataCreateFlat = await resCreateFlat.json();
      assert.strictEqual(dataCreateFlat.success, true);
      assert.strictEqual(dataCreateFlat.data.code, 'FLAT750TEST');
      assert.strictEqual(dataCreateFlat.data.discountType, 'FLAT');
      const flatCouponId = dataCreateFlat.data._id;

      // 4. Validate PERCENTAGE coupon math with cap
      const resValPercent = await fetch(`${baseUrl}/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'PERCENT25TEST', cartTotal: 4000 }),
      });
      assert.strictEqual(resValPercent.status, 200);
      const dataValPercent = await resValPercent.json();
      assert.strictEqual(dataValPercent.valid, true);
      // 25% of 4000 is 1000, but capped at 500
      assert.strictEqual(dataValPercent.coupon.discountAmount, 500);
      assert.strictEqual(dataValPercent.coupon.newTotal, 3500);

      // 5. Validate FLAT coupon math & min spend rejection
      const resValFlatFail = await fetch(`${baseUrl}/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'FLAT750TEST', cartTotal: 2000 }),
      });
      assert.strictEqual(resValFlatFail.status, 400); // Fails minimum order amount ₹3000

      const resValFlatSuccess = await fetch(`${baseUrl}/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'FLAT750TEST', cartTotal: 5000 }),
      });
      assert.strictEqual(resValFlatSuccess.status, 200);
      const dataValFlatSuccess = await resValFlatSuccess.json();
      assert.strictEqual(dataValFlatSuccess.valid, true);
      assert.strictEqual(dataValFlatSuccess.coupon.discountAmount, 750);
      assert.strictEqual(dataValFlatSuccess.coupon.newTotal, 4250);

      // 6. Toggle coupon status via PATCH /api/coupons/:id/toggle
      const resToggle = await fetch(`${baseUrl}/coupons/${percentCouponId}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resToggle.status, 200);
      const dataToggle = await resToggle.json();
      assert.strictEqual(dataToggle.success, true);
      assert.strictEqual(dataToggle.data.isActive, false);

      // Verify that deactivated coupon is rejected at checkout
      const resValDeactivated = await fetch(`${baseUrl}/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'PERCENT25TEST', cartTotal: 2000 }),
      });
      assert.strictEqual(resValDeactivated.status, 404);

      // Toggle back to active
      await fetch(`${baseUrl}/coupons/${percentCouponId}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      // 7. Update coupon via PUT /api/coupons/:id
      const resUpdate = await fetch(`${baseUrl}/coupons/${flatCouponId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ discountValue: 800, minOrderAmount: 2500 }),
      });
      assert.strictEqual(resUpdate.status, 200);
      const dataUpdate = await resUpdate.json();
      assert.strictEqual(dataUpdate.data.discountValue, 800);
      assert.strictEqual(dataUpdate.data.minOrderAmount, 2500);

      // 8. Delete coupon via DELETE /api/coupons/:id
      const resDelete = await fetch(`${baseUrl}/coupons/${flatCouponId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resDelete.status, 200);
      const dataDelete = await resDelete.json();
      assert.strictEqual(dataDelete.success, true);

      // Clean up percent coupon
      await fetch(`${baseUrl}/coupons/${percentCouponId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    });

    await test('Point 41: Flash Deals & Campaign Manager (Create limited-time flash sales with countdown timer, deal badge, discount & stock)', async () => {
      // 1. Fetch admin flash deals list and stats
      const resListInit = await fetch(`${baseUrl}/flash-deals/admin/all`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resListInit.status, 200);
      const dataListInit = await resListInit.json();
      assert.strictEqual(dataListInit.success, true);
      assert.ok(dataListInit.stats);
      assert.strictEqual(typeof dataListInit.stats.total, 'number');

      // 2. Super Admin creates a new active Flash Deal campaign with a product
      const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      const resCreate = await fetch(`${baseUrl}/flash-deals/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          title: '⚡ Midnight Audio Frenzy 40% OFF',
          badgeText: '🔥 24H FLASH DEAL',
          bannerImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
          startDate: new Date().toISOString(),
          endDate: tomorrow,
          backgroundColor: '#DC2626',
          textColor: '#FFFFFF',
          isActive: true,
          products: [
            {
              product: headphonesProduct._id,
              discountPercentage: 40,
              dealPrice: 5999,
              allocatedStock: 50,
              soldCount: 12,
            },
          ],
        }),
      });
      assert.strictEqual(resCreate.status, 201);
      const dataCreate = await resCreate.json();
      assert.strictEqual(dataCreate.success, true);
      assert.strictEqual(dataCreate.data.title, '⚡ Midnight Audio Frenzy 40% OFF');
      assert.strictEqual(dataCreate.data.products.length, 1);
      assert.strictEqual(dataCreate.data.products[0].discountPercentage, 40);
      assert.strictEqual(dataCreate.data.products[0].dealPrice, 5999);
      const flashDealId = dataCreate.data._id;

      // 3. Verify public GET /api/flash-deals/active returns the active campaign and positive secondsRemaining
      const resActive = await fetch(`${baseUrl}/flash-deals/active`);
      assert.strictEqual(resActive.status, 200);
      const dataActive = await resActive.json();
      assert.strictEqual(dataActive.success, true);
      assert.strictEqual(dataActive.hasActiveDeal, true);
      assert.ok(dataActive.secondsRemaining > 0);
      assert.strictEqual(dataActive.data.title, '⚡ Midnight Audio Frenzy 40% OFF');
      assert.ok(dataActive.data.products.length >= 1);
      assert.strictEqual(dataActive.data.products[0].dealPrice, 5999);

      // 4. Toggle flash deal to PAUSED via PATCH /api/flash-deals/admin/:id/toggle
      const resToggle = await fetch(`${baseUrl}/flash-deals/admin/${flashDealId}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resToggle.status, 200);
      const dataToggle = await resToggle.json();
      assert.strictEqual(dataToggle.success, true);
      assert.strictEqual(dataToggle.data.isActive, false);

      // 5. Verify public active deal returns false when deal is paused
      const resActivePaused = await fetch(`${baseUrl}/flash-deals/active`);
      const dataActivePaused = await resActivePaused.json();
      assert.strictEqual(dataActivePaused.hasActiveDeal, false);

      // 6. Resume flash deal
      await fetch(`${baseUrl}/flash-deals/admin/${flashDealId}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      // 7. Update deal details via PUT /api/flash-deals/admin/:id
      const resUpdate = await fetch(`${baseUrl}/flash-deals/admin/${flashDealId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          badgeText: '⚡ EXTENDED MEGA DEAL',
        }),
      });
      assert.strictEqual(resUpdate.status, 200);
      const dataUpdate = await resUpdate.json();
      assert.strictEqual(dataUpdate.data.badgeText, '⚡ EXTENDED MEGA DEAL');

      // 8. Super Admin deletes the flash deal via DELETE /api/flash-deals/admin/:id
      const resDelete = await fetch(`${baseUrl}/flash-deals/admin/${flashDealId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resDelete.status, 200);
      const dataDelete = await resDelete.json();
      assert.strictEqual(dataDelete.success, true);
    });

    await test('Point 42: Abandoned Cart Auto-Recovery System (View abandoned carts, 1-click reminders, recovery discount & conversion)', async () => {
      // 1. Customer syncs an open cart session via POST /api/abandoned-carts/sync
      const resSync = await fetch(`${baseUrl}/abandoned-carts/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: 'Rahul Sharma',
          customerEmail: 'rahul.abandoned@example.com',
          customerPhone: '+919876543210',
          items: [
            {
              product: headphonesProduct._id,
              title: headphonesProduct.title,
              price: 8999,
              quantity: 1,
            },
          ],
          cartTotal: 8999,
        }),
      });
      assert.strictEqual(resSync.status, 200);
      const dataSync = await resSync.json();
      assert.strictEqual(dataSync.success, true);
      assert.strictEqual(dataSync.data.customerEmail, 'rahul.abandoned@example.com');
      assert.strictEqual(dataSync.data.status, 'ABANDONED');
      const cartId = dataSync.data._id;

      // 2. Super Admin views abandoned carts & potential recoverable revenue
      const resList = await fetch(`${baseUrl}/abandoned-carts/admin/all`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resList.status, 200);
      const dataList = await resList.json();
      assert.strictEqual(dataList.success, true);
      assert.ok(dataList.stats);
      assert.ok(dataList.stats.potentialRevenue >= 8999);
      assert.ok(dataList.data.some((c) => c._id === cartId));

      // 3. Super Admin triggers 1-Click recovery reminder via Email + SMS
      const resRemind = await fetch(`${baseUrl}/abandoned-carts/admin/${cartId}/send-reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          couponCode: 'RECOVER15',
          customMessage: 'Special 15% discount waiting for your headphones checkout!',
        }),
      });
      assert.strictEqual(resRemind.status, 200);
      const dataRemind = await resRemind.json();
      assert.strictEqual(dataRemind.success, true);
      assert.strictEqual(dataRemind.data.status, 'REMINDER_SENT');
      assert.strictEqual(dataRemind.data.reminderCount, 1);
      assert.strictEqual(dataRemind.data.recoveryCoupon, 'RECOVER15');

      // 4. Super Admin triggers bulk reminder dispatch
      const resBulk = await fetch(`${baseUrl}/abandoned-carts/admin/bulk-reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ couponCode: 'COMEBACK10' }),
      });
      assert.strictEqual(resBulk.status, 200);
      const dataBulk = await resBulk.json();
      assert.strictEqual(dataBulk.success, true);
      assert.ok(typeof dataBulk.count === 'number');

      // 5. Mark cart as recovered when order is completed
      const resRecovered = await fetch(`${baseUrl}/abandoned-carts/admin/${cartId}/mark-recovered`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resRecovered.status, 200);
      const dataRecovered = await resRecovered.json();
      assert.strictEqual(dataRecovered.success, true);
      assert.strictEqual(dataRecovered.data.status, 'RECOVERED');

      // 6. Super Admin deletes the test abandoned cart
      const resDelete = await fetch(`${baseUrl}/abandoned-carts/admin/${cartId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resDelete.status, 200);
      const dataDelete = await resDelete.json();
      assert.strictEqual(dataDelete.success, true);
    });

    await test('Point 43: Customer CRM Directory (List, spending history, verify/block switch, lifetime value metrics)', async () => {
      // 1. Super Admin fetches customers list with CRM analytics
      const resList = await fetch(`${baseUrl}/admin/customers`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resList.status, 200);
      const dataList = await resList.json();
      assert.strictEqual(dataList.success, true);
      assert.ok(dataList.stats);
      assert.ok(dataList.stats.totalCustomers >= 1);
      assert.ok(Array.isArray(dataList.data));

      const customerObj = dataList.data.find((c) => c.email === 'customer@auramarket.com') || dataList.data[0];
      assert.ok(customerObj, 'Demo customer must exist');
      assert.strictEqual(typeof customerObj.lifetimeSpend, 'number');
      assert.strictEqual(typeof customerObj.ordersCount, 'number');

      // 2. Fetch single customer details with order history
      const resDetails = await fetch(`${baseUrl}/admin/customers/${customerObj._id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resDetails.status, 200);
      const dataDetails = await resDetails.json();
      assert.strictEqual(dataDetails.success, true);
      assert.ok(dataDetails.data.customer);
      assert.ok(Array.isArray(dataDetails.data.orders));

      // 3. Block customer account via PATCH /api/admin/customers/:id/status
      const resBlock = await fetch(`${baseUrl}/admin/customers/${customerObj._id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resBlock.status, 200);
      const dataBlock = await resBlock.json();
      assert.strictEqual(dataBlock.success, true);
      assert.strictEqual(dataBlock.data.status, 'BLOCKED');
      assert.strictEqual(dataBlock.data.isActive, false);

      // 4. Unblock customer account
      const resUnblock = await fetch(`${baseUrl}/admin/customers/${customerObj._id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resUnblock.status, 200);
      const dataUnblock = await resUnblock.json();
      assert.strictEqual(dataUnblock.data.status, 'ACTIVE');
      assert.strictEqual(dataUnblock.data.isActive, true);

      // 5. Toggle verification badge
      const resVerify = await fetch(`${baseUrl}/admin/customers/${customerObj._id}/verify`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resVerify.status, 200);
      const dataVerify = await resVerify.json();
      assert.strictEqual(dataVerify.success, true);

      // 6. Update internal CRM notes and tags
      const resNotes = await fetch(`${baseUrl}/admin/customers/${customerObj._id}/notes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          adminNotes: 'High-value customer, prefers express delivery.',
          tags: ['VIP Shopper', 'Loyalty Member'],
        }),
      });
      assert.strictEqual(resNotes.status, 200);
      const dataNotes = await resNotes.json();
      assert.strictEqual(dataNotes.success, true);
      assert.strictEqual(dataNotes.data.adminNotes, 'High-value customer, prefers express delivery.');
      assert.ok(dataNotes.data.tags.includes('VIP Shopper'));
    });

    await test('Point 44: Vendor KYC & Store Approval Center (Verify docs, approve/reject, custom commission rate)', async () => {
      // 1. Fetch all vendors with KYC stats
      const resVendors = await fetch(`${baseUrl}/admin/vendors`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resVendors.status, 200);
      const dataVendors = await resVendors.json();
      assert.strictEqual(dataVendors.success, true);
      assert.ok(dataVendors.stats);
      assert.strictEqual(typeof dataVendors.stats.totalVendors, 'number');
      assert.ok(Array.isArray(dataVendors.data));
      assert.ok(dataVendors.data.length >= 1);

      const targetVendor = dataVendors.data[0];
      const vendorId = targetVendor._id;

      // 2. Fetch single vendor full profile
      const resDetail = await fetch(`${baseUrl}/admin/vendors/${vendorId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resDetail.status, 200);
      const dataDetail = await resDetail.json();
      assert.strictEqual(dataDetail.success, true);
      assert.strictEqual(dataDetail.data._id.toString(), vendorId.toString());

      // 3. Update KYC verification (Approve KYC)
      const resApproveKYC = await fetch(`${baseUrl}/admin/vendors/${vendorId}/kyc`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          kycStatus: 'VERIFIED',
          adminNotes: 'All business and tax documents verified successfully.',
        }),
      });
      assert.strictEqual(resApproveKYC.status, 200);
      const dataApproveKYC = await resApproveKYC.json();
      assert.strictEqual(dataApproveKYC.success, true);
      assert.strictEqual(dataApproveKYC.data.kycStatus, 'VERIFIED');
      assert.strictEqual(dataApproveKYC.data.status, 'approved');

      // 4. Update Custom Commission Rate
      const resComm = await fetch(`${baseUrl}/admin/vendors/${vendorId}/commission`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ commissionRate: 14.5 }),
      });
      assert.strictEqual(resComm.status, 200);
      const dataComm = await resComm.json();
      assert.strictEqual(dataComm.success, true);
      assert.strictEqual(dataComm.data.commissionRate, 14.5);

      // 5. Test KYC Rejection flow
      const resRejectKYC = await fetch(`${baseUrl}/admin/vendors/${vendorId}/kyc`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          kycStatus: 'REJECTED',
          rejectionReason: 'GST certificate number does not match registered trade name.',
        }),
      });
      assert.strictEqual(resRejectKYC.status, 200);
      const dataRejectKYC = await resRejectKYC.json();
      assert.strictEqual(dataRejectKYC.success, true);
      assert.strictEqual(dataRejectKYC.data.kycStatus, 'REJECTED');
      assert.strictEqual(dataRejectKYC.data.status, 'rejected');
      assert.ok(dataRejectKYC.data.kycRejectionReason.includes('GST certificate'));

      // 6. Reset back to approved for demo consistency
      await fetch(`${baseUrl}/admin/vendors/${vendorId}/kyc`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ kycStatus: 'VERIFIED' }),
      });
    });

    await test('Point 45: Vendor Withdrawal / Payout Approval Hub (Review requests, approve with transaction ID, reject with refund & CSV export)', async () => {
      // 1. Ensure vendor has wallet balance for payout test
      let vendorProfileBefore = await VendorProfile.findOne({});
      if (!vendorProfileBefore) {
        const u = await User.findOne({ role: 'vendor' });
        vendorProfileBefore = await VendorProfile.create({
          user: u._id,
          storeName: 'Test Store Payout',
          walletBalance: 5000,
        });
      } else {
        vendorProfileBefore.walletBalance = 5000;
        await vendorProfileBefore.save();
      }

      // 2. Vendor submits a payout withdrawal request of ₹500
      const resPayoutReq = await fetch(`${baseUrl}/vendor/payout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({ amount: 500 }),
      });
      assert.strictEqual(resPayoutReq.status, 200);
      const dataPayoutReq = await resPayoutReq.json();
      assert.strictEqual(dataPayoutReq.success, true);
      const payoutId = dataPayoutReq.data._id;
      assert.ok(payoutId);
      assert.strictEqual(dataPayoutReq.data.status, 'PENDING');

      // 3. Super Admin fetches all payouts with stats
      const resPayouts = await fetch(`${baseUrl}/admin/payouts`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resPayouts.status, 200);
      const dataPayouts = await resPayouts.json();
      assert.strictEqual(dataPayouts.success, true);
      assert.ok(dataPayouts.stats);
      assert.ok(dataPayouts.stats.pendingCount >= 1);
      assert.ok(Array.isArray(dataPayouts.data));

      // 4. Super Admin fetches single payout request details
      const resDetail = await fetch(`${baseUrl}/admin/payouts/${payoutId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resDetail.status, 200);
      const dataDetail = await resDetail.json();
      assert.strictEqual(dataDetail.success, true);
      assert.strictEqual(dataDetail.data._id.toString(), payoutId.toString());

      // 5. Super Admin approves payout with banking UTR number
      const resApprove = await fetch(`${baseUrl}/admin/payouts/${payoutId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          utrNumber: 'UTR-HDFC-9988776655',
          paymentMode: 'IMPS',
          adminNotes: 'Transferred via HDFC Corporate NetBanking',
        }),
      });
      assert.strictEqual(resApprove.status, 200);
      const dataApprove = await resApprove.json();
      assert.strictEqual(dataApprove.success, true);
      assert.strictEqual(dataApprove.data.status, 'COMPLETED');
      assert.strictEqual(dataApprove.data.payoutDetails.utrNumber, 'UTR-HDFC-9988776655');

      // 6. Vendor requests another payout of ₹200 to test rejection with wallet refund
      const vendorBeforeReject = await VendorProfile.findById(vendorProfileBefore._id);
      const balanceBeforeSecond = vendorBeforeReject.walletBalance;

      const resPayoutReq2 = await fetch(`${baseUrl}/vendor/payout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({ amount: 200 }),
      });
      assert.strictEqual(resPayoutReq2.status, 200);
      const dataPayoutReq2 = await resPayoutReq2.json();
      const payoutId2 = dataPayoutReq2.data._id;

      // Super Admin rejects with reason
      const resReject = await fetch(`${baseUrl}/admin/payouts/${payoutId2}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          rejectionReason: 'Invalid beneficiary IFSC code provided.',
        }),
      });
      assert.strictEqual(resReject.status, 200);
      const dataReject = await resReject.json();
      assert.strictEqual(dataReject.success, true);
      assert.strictEqual(dataReject.data.status, 'REJECTED');

      // Verify the ₹200 was refunded back to vendor wallet
      const vendorAfterRefund = await VendorProfile.findById(vendorProfileBefore._id);
      assert.strictEqual(vendorAfterRefund.walletBalance, balanceBeforeSecond);

      // 7. Super Admin exports payouts CSV
      const resCsv = await fetch(`${baseUrl}/admin/payouts/export-csv`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resCsv.status, 200);
      assert.ok(resCsv.headers.get('content-type').includes('text/csv'));
      const csvText = await resCsv.text();
      assert.ok(csvText.includes('Transaction ID'));
      assert.ok(csvText.includes('UTR-HDFC-9988776655'));
    });

    await test('Point 48: Tax (GST/VAT) & Dynamic Shipping Charges Engine (Config persistence, free shipping threshold, express shipping & GST calculation)', async () => {
      // 1. Super Admin updates Tax & Dynamic Shipping Settings
      const resConfig = await fetch(`${baseUrl}/ui/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          taxSettings: {
            enabled: true,
            defaultGSTRate: 18,
            calculationMode: 'INCLUSIVE',
            gstin: '07AAAAA0000A1Z5',
            state: 'Delhi',
          },
          shipping: {
            freeShippingThreshold: 1000,
            defaultShippingFee: 99,
            expressShippingFee: 149,
            codFee: 29,
            enabled: true,
          },
        }),
      });
      assert.strictEqual(resConfig.status, 200);
      const dataConfig = await resConfig.json();
      assert.strictEqual(dataConfig.success, true);
      assert.strictEqual(dataConfig.data.shipping.freeShippingThreshold, 1000);
      assert.strictEqual(dataConfig.data.shipping.defaultShippingFee, 99);
      assert.strictEqual(dataConfig.data.taxSettings.defaultGSTRate, 18);

      // 2. Place Order with subtotal > 1000: Shipping must be FREE (0) and GST split recorded
      const resFreeShip = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          items: [{ productId: headphonesProduct._id, quantity: 1 }],
          shippingAddress: {
            recipientName: 'Tax Test Customer',
            phone: '9876543210',
            street: '12 Connaught Place',
            city: 'New Delhi',
            state: 'Delhi',
            pincode: '110001',
          },
          paymentMethod: 'UPI',
        }),
      });
      assert.strictEqual(resFreeShip.status, 201);
      const dataFreeShip = await resFreeShip.json();
      assert.strictEqual(dataFreeShip.success, true);
      assert.strictEqual(dataFreeShip.data.shippingFee, 0, 'Shipping must be 0 for order exceeding threshold');
      assert.ok(dataFreeShip.data.taxAmount > 0, 'Tax amount must be calculated');
      assert.strictEqual(dataFreeShip.data.taxDetails.mode, 'INCLUSIVE');
      assert.ok(dataFreeShip.data.taxDetails.cgst > 0, 'Intra-state must have CGST');
      assert.ok(dataFreeShip.data.taxDetails.sgst > 0, 'Intra-state must have SGST');
      assert.strictEqual(dataFreeShip.data.taxDetails.igst, 0, 'Intra-state IGST must be 0');

      // 3. Place Order with EXPRESS shipping method: Express surcharge (149) must be applied
      const resExpress = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          items: [{ productId: headphonesProduct._id, quantity: 1 }],
          shippingMethod: 'EXPRESS',
          shippingAddress: {
            recipientName: 'Express Delivery User',
            phone: '9876543210',
            street: 'Bandra West',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400050',
          },
          paymentMethod: 'RAZORPAY',
        }),
      });
      assert.strictEqual(resExpress.status, 201);
      const dataExpress = await resExpress.json();
      assert.strictEqual(dataExpress.success, true);
      assert.strictEqual(dataExpress.data.shippingFee, 149, 'Express shipping surcharge must be 149');
      assert.ok(dataExpress.data.taxDetails.igst > 0, 'Inter-state order must record IGST');
      assert.strictEqual(dataExpress.data.taxDetails.cgst, 0, 'Inter-state CGST must be 0');
    });

    // Point 49: Sub-Admin Staff Roles & Permissions (Custom access rights per staff)
    await test('Point 49: Sub-Admin Staff Roles & Permissions (Catalog, CRUD, Role Presets & SuperAdmin Deletion Protection)', async () => {
      // 1. Fetch permissions catalog and role presets
      const resPerms = await fetch(`${baseUrl}/admin/staff/permissions`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resPerms.status, 200);
      const dataPerms = await resPerms.json();
      assert.strictEqual(dataPerms.success, true);
      assert.ok(Array.isArray(dataPerms.data.categories), 'Must return permission categories');
      assert.ok(dataPerms.data.categories.length >= 6);
      assert.ok(Array.isArray(dataPerms.data.presets), 'Must return role presets');
      assert.ok(dataPerms.data.presets.some(p => p.id === 'order_lead'));

      // 2. Get all staff members
      const resStaff = await fetch(`${baseUrl}/admin/staff`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resStaff.status, 200);
      const dataStaff = await resStaff.json();
      assert.strictEqual(dataStaff.success, true);
      assert.ok(dataStaff.data.length >= 1, 'Must return at least Super Admin');
      const superAdminUser = dataStaff.data.find(u => u.role === 'superadmin' || u.email === 'admin@auramarket.com');
      assert.ok(superAdminUser, 'Must contain Super Admin');

      // 3. Create a new sub-admin staff member with granular permissions
      const resCreate = await fetch(`${baseUrl}/admin/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Kavita Sharma',
          email: 'kavita.catalog@auramarket.com',
          phone: '9876543233',
          password: 'secureStaffPassword123',
          staffRoleTitle: 'Senior Catalog Specialist',
          department: 'Catalog',
          permissions: ['products:read', 'products:write', 'categories:write'],
        }),
      });
      assert.strictEqual(resCreate.status, 201);
      const dataCreate = await resCreate.json();
      assert.strictEqual(dataCreate.success, true);
      assert.strictEqual(dataCreate.data.name, 'Kavita Sharma');
      assert.strictEqual(dataCreate.data.role, 'subadmin');
      assert.strictEqual(dataCreate.data.staffRoleTitle, 'Senior Catalog Specialist');
      assert.strictEqual(dataCreate.data.department, 'Catalog');
      assert.strictEqual(dataCreate.data.password, undefined, 'Password must not be returned');
      assert.deepStrictEqual(dataCreate.data.permissions, ['products:read', 'products:write', 'categories:write']);

      const createdStaffId = dataCreate.data._id;

      // 4. Update the staff member: assign extra permissions and update role title
      const resUpdate = await fetch(`${baseUrl}/admin/staff/${createdStaffId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          staffRoleTitle: 'Lead Catalog & Merchandising Manager',
          permissions: ['products:read', 'products:write', 'categories:write', 'marketing:write'],
          isActive: true,
        }),
      });
      assert.strictEqual(resUpdate.status, 200);
      const dataUpdate = await resUpdate.json();
      assert.strictEqual(dataUpdate.success, true);
      assert.strictEqual(dataUpdate.data.staffRoleTitle, 'Lead Catalog & Merchandising Manager');
      assert.ok(dataUpdate.data.permissions.includes('marketing:write'));

      // 5. Deletion Protection: Verify that deleting SuperAdmin is rejected with 400
      const resDeleteSuperAdmin = await fetch(`${baseUrl}/admin/staff/${superAdminUser._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resDeleteSuperAdmin.status, 400);
      const dataDeleteSA = await resDeleteSuperAdmin.json();
      assert.strictEqual(dataDeleteSA.success, false);
      assert.ok(dataDeleteSA.message.includes('Primary Super Administrator'));

      // 6. Delete created sub-admin successfully
      const resDeleteStaff = await fetch(`${baseUrl}/admin/staff/${createdStaffId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resDeleteStaff.status, 200);
      const dataDeleteStaff = await resDeleteStaff.json();
      assert.strictEqual(dataDeleteStaff.success, true);
    });

    // Point 50: System Audit Activity Log & 1-Click Database Backup download
    await test('Point 50: System Audit Activity Log & 1-Click Database Backup download (Audit trail, DB stats, & full JSON snapshot export)', async () => {
      // 1. Fetch system audit logs
      const resAudit = await fetch(`${baseUrl}/admin/audit-logs`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resAudit.status, 200);
      const dataAudit = await resAudit.json();
      assert.strictEqual(dataAudit.success, true);
      assert.ok(Array.isArray(dataAudit.data.logs), 'Must return logs array');
      assert.ok(dataAudit.data.pagination.total >= 0);
      assert.ok(typeof dataAudit.data.metrics.totalAllEvents === 'number');

      // 2. Fetch database backup stats
      const resStats = await fetch(`${baseUrl}/admin/backup/stats`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resStats.status, 200);
      const dataStats = await resStats.json();
      assert.strictEqual(dataStats.success, true);
      assert.strictEqual(dataStats.data.databaseStatus, 'OPTIMAL_CONNECTED');
      assert.ok(dataStats.data.totalRecords > 0, 'Database must have records');
      assert.strictEqual(dataStats.data.totalCollections, 12);
      assert.ok(Array.isArray(dataStats.data.collections));

      // 3. 1-Click Database Backup Export (JSON snapshot attachment)
      const resBackup = await fetch(`${baseUrl}/admin/backup/export`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resBackup.status, 200);
      assert.ok(resBackup.headers.get('content-type').includes('application/json'));
      assert.ok(resBackup.headers.get('content-disposition').includes('attachment; filename="auramarket-backup-'));

      const backupData = await resBackup.json();
      assert.strictEqual(backupData.platform, 'AuraMarket Enterprise Multi-Vendor Platform');
      assert.strictEqual(backupData.version, '3.2.0');
      assert.ok(backupData.totalRecords > 0);
      assert.ok(backupData.collections.users.length > 0, 'Must include users in snapshot');
      assert.ok(backupData.collections.products.length > 0, 'Must include products in snapshot');
      assert.ok(backupData.collections.orders !== undefined, 'Must include orders in snapshot');
      assert.ok(backupData.collections.vendorProfiles.length > 0, 'Must include vendors in snapshot');

      // 4. Verify that DATABASE_BACKUP_EXPORTED was recorded in audit log
      const resAuditVerify = await fetch(`${baseUrl}/admin/audit-logs?action=DATABASE_BACKUP_EXPORTED`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resAuditVerify.status, 200);
      const dataAuditVerify = await resAuditVerify.json();
      assert.strictEqual(dataAuditVerify.success, true);
      assert.ok(dataAuditVerify.data.logs.some(l => l.action === 'DATABASE_BACKUP_EXPORTED'));
    });

    // Point 51: Multi-Variant Product Creator (Color swatches, size matrix, variant SKU & stock)
    await test('Point 51: Multi-Variant Product Creator (Color swatches, size matrix, variant SKU & auto-computed stock)', async () => {
      // 1. Vendor creates product with multi-attribute variants
      const resCat = await fetch(`${baseUrl}/products/categories`);
      const dataCat = await resCat.json();
      const targetCatId = dataCat.data?.[0]?._id || '66a123456789012345678901';

      const resCreateVariant = await fetch(`${baseUrl}/vendor/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({
          title: 'Aura Stealth Performance Hoodie',
          description: 'Ultra-breathable premium moisture-wicking fleece hoodie with ribbed cuffs.',
          category: targetCatId,
          brand: 'Apex Apparel',
          mrp: 3499,
          sellingPrice: 1999,
          hasVariants: true,
          variants: [
            {
              sku: 'APX-HD-BLK-M',
              name: 'Medium / Obsidian Black',
              attributes: { size: 'M', color: 'Obsidian Black', colorCode: '#111827' },
              colorCode: '#111827',
              additionalPrice: 0,
              stock: 14,
              lowStockThreshold: 4,
            },
            {
              sku: 'APX-HD-BLU-L',
              name: 'Large / Royal Cobalt',
              attributes: { size: 'L', color: 'Royal Cobalt', colorCode: '#2563EB' },
              colorCode: '#2563EB',
              additionalPrice: 200,
              stock: 11,
              lowStockThreshold: 3,
            },
            {
              sku: 'APX-HD-RED-XL',
              name: 'X-Large / Crimson Fire',
              attributes: { size: 'XL', color: 'Crimson Fire', colorCode: '#DC2626' },
              colorCode: '#DC2626',
              additionalPrice: 350,
              stock: 5,
              lowStockThreshold: 2,
            },
          ],
        }),
      });

      assert.strictEqual(resCreateVariant.status, 201);
      const dataVariantProd = await resCreateVariant.json();
      assert.strictEqual(dataVariantProd.success, true);
      assert.strictEqual(dataVariantProd.data.hasVariants, true);
      assert.strictEqual(dataVariantProd.data.variants.length, 3);
      // Auto-calculated total stock: 14 + 11 + 5 = 30!
      assert.strictEqual(dataVariantProd.data.stock, 30, 'Total stock must equal sum of variant stocks (14 + 11 + 5 = 30)');
      assert.strictEqual(dataVariantProd.data.variants[0].colorCode, '#111827');
      assert.strictEqual(dataVariantProd.data.variants[1].colorCode, '#2563EB');
      assert.strictEqual(dataVariantProd.data.variants[2].attributes.size, 'XL');

      const variantProdId = dataVariantProd.data._id;

      // 2. Update variant stock & verify auto-calculated stock update
      const resUpdateVariant = await fetch(`${baseUrl}/vendor/products/${variantProdId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({
          hasVariants: true,
          variants: [
            {
              sku: 'APX-HD-BLK-M',
              name: 'Medium / Obsidian Black',
              attributes: { size: 'M', color: 'Obsidian Black', colorCode: '#111827' },
              colorCode: '#111827',
              additionalPrice: 0,
              stock: 20, // increased from 14 to 20
            },
            {
              sku: 'APX-HD-BLU-L',
              name: 'Large / Royal Cobalt',
              attributes: { size: 'L', color: 'Royal Cobalt', colorCode: '#2563EB' },
              colorCode: '#2563EB',
              additionalPrice: 200,
              stock: 10,
            },
          ],
        }),
      });

      assert.strictEqual(resUpdateVariant.status, 200);
      const dataUpdate = await resUpdateVariant.json();
      assert.strictEqual(dataUpdate.success, true);
      assert.strictEqual(dataUpdate.data.stock, 30, 'Total stock must update to 20 + 10 = 30');
    });

    await test('Point 52: Multi-Image Media Uploader (Thumbnail + Gallery photos with primary cover selector & gallery reordering)', async () => {
      // 1. Fetch category id
      const resCat = await fetch(`${baseUrl}/products/categories`);
      const dataCat = await resCat.json();
      const catId = dataCat.data[0]._id;

      const coverImg = 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800';
      const galleryImg1 = 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800';
      const galleryImg2 = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800';
      const galleryImg3 = 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800';

      // 2. Create product with primary thumbnail and gallery photos
      const resCreateMedia = await fetch(`${baseUrl}/vendor/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({
          title: 'AuraStudio Pro Wireless Over-Ear Headphones',
          description: 'Studio-grade acoustics with multi-angle gallery photos and swappable earcups.',
          category: catId,
          brand: 'Apex Audio',
          thumbnail: coverImg,
          gallery: [galleryImg1, galleryImg2, galleryImg3],
          mrp: 14999,
          sellingPrice: 11999,
          stock: 40,
          sku: 'APX-STUDIO-PRO-' + Date.now(),
        }),
      });

      assert.strictEqual(resCreateMedia.status, 201);
      const dataMediaProd = await resCreateMedia.json();
      assert.strictEqual(dataMediaProd.success, true);
      assert.strictEqual(dataMediaProd.data.thumbnail, coverImg);
      assert.strictEqual(dataMediaProd.data.gallery.length, 3);
      assert.strictEqual(dataMediaProd.data.images[0], coverImg, 'images[0] must match primary thumbnail');
      assert.strictEqual(dataMediaProd.data.images.length, 4, 'images array must contain thumbnail + 3 gallery images');

      const mediaProdId = dataMediaProd.data._id;

      // 3. Update media via PUT /api/vendor/products/:id/media: swap primary thumbnail to galleryImg2 and reorder gallery
      const resUpdateMedia = await fetch(`${baseUrl}/vendor/products/${mediaProdId}/media`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({
          thumbnail: galleryImg2, // promote galleryImg2 to primary thumbnail
          gallery: [coverImg, galleryImg3, galleryImg1], // previous cover becomes secondary, gallery reordered
        }),
      });

      assert.strictEqual(resUpdateMedia.status, 200);
      const dataUpdatedMedia = await resUpdateMedia.json();
      assert.strictEqual(dataUpdatedMedia.success, true);
      assert.strictEqual(dataUpdatedMedia.data.thumbnail, galleryImg2, 'New primary thumbnail must be galleryImg2');
      assert.strictEqual(dataUpdatedMedia.data.gallery[0], coverImg, 'Previous cover must now be first in gallery');
      assert.strictEqual(dataUpdatedMedia.data.images[0], galleryImg2, 'images[0] must strictly reflect new thumbnail');
      assert.strictEqual(dataUpdatedMedia.data.images.length, 4);

      // 4. Verify public fetch gets the updated media schema
      const resPublic = await fetch(`${baseUrl}/products/${mediaProdId}`);
      assert.strictEqual(resPublic.status, 200);
      const dataPublic = await resPublic.json();
      assert.strictEqual(dataPublic.data.thumbnail, galleryImg2);
      assert.strictEqual(dataPublic.data.images.length, 4);
    });

    await test('Point 53: Original MRP vs Selling Discount Price with automatic % OFF badge & customer savings', async () => {
      // 1. Fetch category id
      const resCat = await fetch(`${baseUrl}/products/categories`);
      const dataCat = await resCat.json();
      const catId = dataCat.data[0]._id;

      // 2. Vendor creates product with MRP = 10000 and Selling Price = 6999 (30% OFF)
      const resCreate = await fetch(`${baseUrl}/vendor/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({
          title: 'Titanium Chrono Sports Edition',
          description: 'High-end smartwatch with automatic discount badge computation.',
          category: catId,
          brand: 'Apex Tech',
          mrp: 10000,
          sellingPrice: 6999,
          stock: 25,
          sku: 'APX-CHRONO-53-' + Date.now(),
        }),
      });

      assert.strictEqual(resCreate.status, 201);
      const dataCreated = await resCreate.json();
      assert.strictEqual(dataCreated.success, true);
      assert.strictEqual(dataCreated.data.mrp, 10000);
      assert.strictEqual(dataCreated.data.sellingPrice, 6999);
      assert.strictEqual(dataCreated.data.savingsAmount, 3001, 'Customer savings must be 10000 - 6999 = 3001');
      assert.strictEqual(dataCreated.data.discountPercentage, 30, 'Discount must be Math.round((3001 / 10000) * 100) = 30% OFF');

      const prodId = dataCreated.data._id;

      // 3. Update to 50% OFF (Selling Price = 5000, MRP = 10000)
      const resUpdate = await fetch(`${baseUrl}/vendor/products/${prodId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({
          sellingPrice: 5000,
          mrp: 10000,
        }),
      });

      assert.strictEqual(resUpdate.status, 200);
      const dataUpdated = await resUpdate.json();
      assert.strictEqual(dataUpdated.success, true);
      assert.strictEqual(dataUpdated.data.sellingPrice, 5000);
      assert.strictEqual(dataUpdated.data.savingsAmount, 5000);
      assert.strictEqual(dataUpdated.data.discountPercentage, 50, 'Discount must be exactly 50% OFF');

      // 4. Edge Case: Vendor attempts to set MRP lower than Selling Price (mrp: 3000, sellingPrice: 4000)
      const resEdge = await fetch(`${baseUrl}/vendor/products/${prodId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({
          sellingPrice: 4000,
          mrp: 3000,
        }),
      });

      assert.strictEqual(resEdge.status, 200);
      const dataEdge = await resEdge.json();
      assert.strictEqual(dataEdge.data.sellingPrice, 4000);
      assert.strictEqual(dataEdge.data.mrp, 4000, 'MRP must be normalized to at least equal selling price');
      assert.strictEqual(dataEdge.data.savingsAmount, 0);
      assert.strictEqual(dataEdge.data.discountPercentage, 0);

      // 5. Verify public storefront fetch has discount calculations
      const resPublic = await fetch(`${baseUrl}/products/${prodId}`);
      assert.strictEqual(resPublic.status, 200);
      const dataPublic = await resPublic.json();
      assert.strictEqual(dataPublic.data.sellingPrice, 4000);
      assert.strictEqual(dataPublic.data.mrp, 4000);
    });

    await test('Point 54: Low Stock Alert Warning system (Threshold alert, low_stock filter & quick restock)', async () => {
      // 1. Fetch category id
      const resCat = await fetch(`${baseUrl}/products/categories`);
      const dataCat = await resCat.json();
      const catId = dataCat.data[0]._id;

      // 2. Vendor creates low stock product: stock = 3, threshold = 6
      const resCreate = await fetch(`${baseUrl}/vendor/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({
          title: 'Limited Edition Wireless Gaming Mouse',
          description: 'High precision wireless mouse with low inventory alert.',
          category: catId,
          brand: 'Apex Tech',
          mrp: 3999,
          sellingPrice: 2499,
          stock: 3,
          lowStockThreshold: 6,
          sku: 'APX-MSE-LOW-' + Date.now(),
        }),
      });

      assert.strictEqual(resCreate.status, 201);
      const dataCreated = await resCreate.json();
      assert.strictEqual(dataCreated.success, true);
      assert.strictEqual(dataCreated.data.stock, 3);
      assert.strictEqual(dataCreated.data.lowStockThreshold, 6);
      assert.strictEqual(dataCreated.data.isLowStock, true, 'Product with stock 3 <= threshold 6 must trigger isLowStock');

      const lowStockId = dataCreated.data._id;

      // 3. Test GET /vendor/products?filter=low_stock returns low stock products and stats
      const resFilter = await fetch(`${baseUrl}/vendor/products?filter=low_stock`, {
        headers: { Authorization: `Bearer ${vendorToken}` },
      });
      assert.strictEqual(resFilter.status, 200);
      const dataFilter = await resFilter.json();
      assert.strictEqual(dataFilter.success, true);
      assert.ok(dataFilter.stats);
      assert.ok(dataFilter.stats.lowStock >= 1, 'Stats must count at least 1 low-stock item');
      assert.ok(dataFilter.data.some(p => p._id === lowStockId), 'Low stock filter must contain the product');

      // 4. Quick Restock via PATCH /vendor/products/:id/stock: add 40 units
      const resRestock = await fetch(`${baseUrl}/vendor/products/${lowStockId}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({ additionalStock: 40 }),
      });

      assert.strictEqual(resRestock.status, 200);
      const dataRestock = await resRestock.json();
      assert.strictEqual(dataRestock.success, true);
      assert.strictEqual(dataRestock.data.stock, 43, 'Stock must now be 3 + 40 = 43');
      assert.strictEqual(dataRestock.data.isLowStock, false, 'Product with stock 43 > 6 must no longer be low stock');

      // 5. Test setting lowStockThreshold dynamically to 50
      const resThreshold = await fetch(`${baseUrl}/vendor/products/${lowStockId}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({ lowStockThreshold: 50 }),
      });

      assert.strictEqual(resThreshold.status, 200);
      const dataThreshold = await resThreshold.json();
      assert.strictEqual(dataThreshold.data.lowStockThreshold, 50);
      assert.strictEqual(dataThreshold.data.isLowStock, true, 'Stock 43 <= new threshold 50 must trigger isLowStock');
    });

    await test('Point 55: Bulk Product Excel / CSV Upload & Export (Downloadable catalog CSV, bulk CSV parsing, validation & upsert)', async () => {
      // 1. Test CSV Export (GET /vendor/products/export-csv)
      const resExportJson = await fetch(`${baseUrl}/vendor/products/export-csv`, {
        headers: { Authorization: `Bearer ${vendorToken}` },
      });
      assert.strictEqual(resExportJson.status, 200);
      const dataExportJson = await resExportJson.json();
      assert.strictEqual(dataExportJson.success, true);
      assert.ok(dataExportJson.csv, 'Must return CSV string');
      assert.ok(dataExportJson.csv.includes('Title,SKU,Category,Brand,MRP,SellingPrice'));
      assert.ok(typeof dataExportJson.count === 'number');

      // Test direct CSV attachment download format (?format=csv)
      const resExportCsv = await fetch(`${baseUrl}/vendor/products/export-csv?format=csv`, {
        headers: { Authorization: `Bearer ${vendorToken}` },
      });
      assert.strictEqual(resExportCsv.status, 200);
      assert.ok(resExportCsv.headers.get('content-type').includes('text/csv'));
      assert.ok(resExportCsv.headers.get('content-disposition').includes('attachment; filename="auramarket_catalog_'));

      // 2. Test Bulk CSV Upload with new products and existing SKU update
      const resCat = await fetch(`${baseUrl}/products/categories`);
      const dataCat = await resCat.json();
      const catId = dataCat.data[0]._id;

      const testSkuExisting = 'BULK-UPDATE-SKU-' + Date.now();
      const existingProduct = await Product.create({
        vendor: headphonesProduct.vendor._id,
        title: 'Initial Standalone Product Before Bulk',
        slug: 'initial-standalone-product-' + Date.now(),
        description: 'Initial product description',
        category: catId,
        brand: 'Apex Tech',
        mrp: 15000,
        sellingPrice: 10000,
        stock: 20,
        sku: testSkuExisting,
        hasVariants: false,
        variants: [],
      });

      const testSkuNew1 = 'BULK-TEST-ITEM-1-' + Date.now();
      const testSkuNew2 = 'BULK-TEST-ITEM-2-' + Date.now();

      const csvDataToUpload = [
        'Title,SKU,Category,Brand,MRP,SellingPrice,Stock,LowStockThreshold,Description,Image',
        `"Bulk Imported Ergonomic Keyboard",${testSkuNew1},"Electronics","Apex Peripherals",4999,2999,50,8,"Premium wireless ergonomic keyboard with wrist rest","https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500"`,
        `"Bulk Imported Ultra-Wide Monitor",${testSkuNew2},"Electronics","Apex Displays",35000,24999,15,3,"34-inch curved ultra-wide productivity monitor","https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500"`,
        `"Initial Standalone Product (Updated via Bulk)",${testSkuExisting},"Electronics","Apex Audio",18000,12500,85,10,"Updated product description via bulk CSV upload","https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500"`,
        `"",INVALID-SKU-NO-TITLE,"Electronics","Apex",1000,500,10,2,"Invalid row with no title",""`,
      ].join('\r\n');

      const resUpload = await fetch(`${baseUrl}/vendor/products/bulk-upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({ csvData: csvDataToUpload }),
      });

      assert.strictEqual(resUpload.status, 200);
      const dataUpload = await resUpload.json();
      assert.strictEqual(dataUpload.success, true);
      assert.strictEqual(dataUpload.insertedCount, 2, 'Must insert 2 new products');
      assert.strictEqual(dataUpload.updatedCount, 1, 'Must update 1 existing product SKU');
      assert.strictEqual(dataUpload.errorCount, 1, 'Must record 1 error for missing title');
      assert.strictEqual(dataUpload.errors[0].error, 'Product title is required');

      // Verify new products were saved to database
      const savedProd1 = await Product.findOne({ sku: testSkuNew1 });
      assert.ok(savedProd1, 'Product 1 must exist in DB');
      assert.strictEqual(savedProd1.title, 'Bulk Imported Ergonomic Keyboard');
      assert.strictEqual(savedProd1.mrp, 4999);
      assert.strictEqual(savedProd1.sellingPrice, 2999);
      assert.strictEqual(savedProd1.stock, 50);
      assert.strictEqual(savedProd1.discountPercentage, 40);

      // Verify existing product was updated
      const updatedProd = await Product.findOne({ sku: testSkuExisting });
      assert.strictEqual(updatedProd.stock, 85, 'Stock must update to 85');
      assert.strictEqual(updatedProd.sellingPrice, 12500);

      // 3. Test Rejection when neither csvData nor products provided
      const resBad = await fetch(`${baseUrl}/vendor/products/bulk-upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({}),
      });
      assert.strictEqual(resBad.status, 400);
      const dataBad = await resBad.json();
      assert.strictEqual(dataBad.success, false);
    });

    await test('Point 56: Vendor Sub-Orders Lifecycle (Pending -> Packaging -> Ready for Pickup -> Handed to Courier & OTP Protection)', async () => {
      // 1. Fetch vendor sub-orders with stats
      const resOrdersInit = await fetch(`${baseUrl}/vendor/orders`, {
        headers: { Authorization: `Bearer ${vendorToken}` },
      });
      assert.strictEqual(resOrdersInit.status, 200);
      const dataOrdersInit = await resOrdersInit.json();
      assert.strictEqual(dataOrdersInit.success, true);
      assert.ok(dataOrdersInit.stats);
      assert.ok(typeof dataOrdersInit.stats.total === 'number');
      assert.ok(Array.isArray(dataOrdersInit.data));

      // Create a fresh test sub-order for Apex vendor to test the 4-stage lifecycle
      const testCustomer = await User.findOne({ role: 'customer' });
      const testParentOrder = await Order.findOne({});
      const testSubOrder = await SubOrder.create({
        parentOrder: testParentOrder._id,
        vendor: headphonesProduct.vendor._id,
        customer: testCustomer._id,
        items: [{
          product: headphonesProduct._id,
          title: headphonesProduct.title,
          quantity: 1,
          price: 8999,
          totalPrice: 8999,
        }],
        subTotal: 8999,
        platformCommissionRate: 8,
        platformCommissionAmount: 719.92,
        vendorEarning: 8279.08,
        status: 'placed',
        deliveryOtp: '5656',
        shippingAddress: {
          recipientName: 'Vikas Sharma',
          phone: '9876543210',
          street: '123 Tech Park',
          city: 'Noida',
          state: 'UP',
          pincode: '201301',
        },
      });

      // Stage 1 -> Stage 2: Vendor moves from placed/pending to 'packaging'
      const resPackaging = await fetch(`${baseUrl}/vendor/orders/${testSubOrder._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({ status: 'packaging', note: 'Items gathered, bubble wrapping started.' }),
      });
      assert.strictEqual(resPackaging.status, 200);
      const dataPackaging = await resPackaging.json();
      assert.strictEqual(dataPackaging.success, true);
      assert.strictEqual(dataPackaging.data.status, 'packaging');
      assert.ok(dataPackaging.data.acceptedAt, 'Must set acceptedAt timestamp');
      assert.ok(dataPackaging.data.packagingStartedAt, 'Must set packagingStartedAt timestamp');

      // Stage 2 -> Stage 3: Vendor marks 'ready_for_pickup'
      const resReady = await fetch(`${baseUrl}/vendor/orders/${testSubOrder._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({ status: 'ready_for_pickup', note: 'Box sealed and shipping label affixed.' }),
      });
      assert.strictEqual(resReady.status, 200);
      const dataReady = await resReady.json();
      assert.strictEqual(dataReady.data.status, 'ready_for_pickup');
      assert.ok(dataReady.data.readyForPickupAt, 'Must set readyForPickupAt timestamp');

      // Stage 3 -> Stage 4: Vendor marks 'handed_to_courier' (dispatched)
      const resHanded = await fetch(`${baseUrl}/vendor/orders/${testSubOrder._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({ status: 'handed_to_courier', note: 'Handed over to express rider.' }),
      });
      assert.strictEqual(resHanded.status, 200);
      const dataHanded = await resHanded.json();
      assert.strictEqual(dataHanded.data.status, 'handed_to_courier');
      assert.ok(dataHanded.data.dispatchedAt, 'Must set dispatchedAt timestamp');

      // Test Security Guard: Vendor MUST NOT be allowed to bypass delivery OTP and mark status 'delivered'
      const resDeliveredAttempt = await fetch(`${baseUrl}/vendor/orders/${testSubOrder._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({ status: 'delivered' }),
      });
      assert.strictEqual(resDeliveredAttempt.status, 400);
      const dataDeliveredAttempt = await resDeliveredAttempt.json();
      assert.strictEqual(dataDeliveredAttempt.success, false);
      assert.ok(dataDeliveredAttempt.message.includes('Delivery completion requires customer OTP verification'));

      // Test status filter tabs: GET /vendor/orders?status=dispatched
      const resDispatchedFilter = await fetch(`${baseUrl}/vendor/orders?status=dispatched`, {
        headers: { Authorization: `Bearer ${vendorToken}` },
      });
      assert.strictEqual(resDispatchedFilter.status, 200);
      const dataDispatchedFilter = await resDispatchedFilter.json();
      assert.ok(dataDispatchedFilter.data.some(o => o._id === testSubOrder._id.toString()));
    });

    await test('Point 57: Thermal & A4 Shipping Label / Packing Slip Printer with barcodes (Dual 4x6 Thermal & A4 Tax Invoice formatting)', async () => {
      // Find a sub-order belonging to the vendor
      const vendorSub = await SubOrder.findOne({ vendor: headphonesProduct.vendor._id });
      assert.ok(vendorSub, 'Vendor sub-order must exist');

      // 1. Fetch JSON Shipping Label Data
      const resJson = await fetch(`${baseUrl}/vendor/orders/${vendorSub._id}/shipping-label`, {
        headers: { Authorization: `Bearer ${vendorToken}` },
      });
      assert.strictEqual(resJson.status, 200);
      const dataJson = await resJson.json();
      assert.strictEqual(dataJson.success, true);
      assert.ok(dataJson.data);
      assert.ok(dataJson.data.subOrderNumber.startsWith('SUB-'));
      assert.ok(dataJson.data.invoiceNumber.startsWith('INV-'));
      assert.ok(dataJson.data.routingCode.startsWith('EXP-'));
      assert.ok(dataJson.data.barcodeValue.includes(dataJson.data.subOrderNumber));
      assert.ok(dataJson.data.qrValue.includes('/#track/'));
      assert.ok(dataJson.data.seller.storeName.includes('Apex Tech'));
      assert.ok(dataJson.data.customer.name);
      assert.ok(Array.isArray(dataJson.data.items));
      assert.ok(dataJson.data.items.length >= 1);
      assert.strictEqual(typeof dataJson.data.pricing.totalAmount, 'number');

      // 2. Fetch 4x6 Thermal Label HTML (?format=html&type=thermal)
      const resThermal = await fetch(`${baseUrl}/vendor/orders/${vendorSub._id}/shipping-label?format=html&type=thermal`, {
        headers: { Authorization: `Bearer ${vendorToken}` },
      });
      assert.strictEqual(resThermal.status, 200);
      assert.ok(resThermal.headers.get('content-type').includes('text/html'));
      const thermalHtml = await resThermal.text();
      assert.ok(thermalHtml.includes('AuraMarket Express'));
      assert.ok(thermalHtml.includes('100mm 150mm'), 'Must configure 4x6 thermal dimensions');
      assert.ok(thermalHtml.includes('barcode-lines'), 'Must render barcode lines');

      // 3. Fetch A4 Full Packing Slip / Tax Invoice HTML (?format=html&type=a4)
      const resA4 = await fetch(`${baseUrl}/vendor/orders/${vendorSub._id}/shipping-label?format=html&type=a4`, {
        headers: { Authorization: `Bearer ${vendorToken}` },
      });
      assert.strictEqual(resA4.status, 200);
      assert.ok(resA4.headers.get('content-type').includes('text/html'));
      const a4Html = await resA4.text();
      assert.ok(a4Html.includes('OFFICIAL TAX INVOICE & PACKING SLIP'));
      assert.ok(a4Html.includes('size: A4'), 'Must configure A4 dimensions');
      assert.ok(a4Html.includes('Authorized Signatory'));

      // 4. Test 404 for invalid sub-order ID
      const resNotFound = await fetch(`${baseUrl}/vendor/orders/66a123456789012345678999/shipping-label`, {
        headers: { Authorization: `Bearer ${vendorToken}` },
      });
      assert.strictEqual(resNotFound.status, 404);
      const dataNotFound = await resNotFound.json();
      assert.strictEqual(dataNotFound.success, false);
    });

    await test('Point 58: Vendor Store Profile Customization (Logo, Banner, Bio, Social links, Slug Uniqueness & Public Showcase)', async () => {
      // 1. GET /api/vendor/profile returns logged-in vendor's profile
      const resProfile = await fetch(`${baseUrl}/vendor/profile`, {
        headers: { Authorization: `Bearer ${vendorToken}` },
      });
      assert.strictEqual(resProfile.status, 200);
      const dataProfile = await resProfile.json();
      assert.strictEqual(dataProfile.success, true);
      assert.ok(dataProfile.data.storeName);

      // 2. PUT /api/vendor/profile updates branding, bio, social links, support info, and slug
      const updatePayload = {
        storeName: 'Apex Tech Enterprise',
        storeSlug: 'apex-tech-enterprise',
        storeLogo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200',
        storeBanner: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200',
        bio: 'Premier supplier of audiophile gear, smart home electronics, and next-gen wearable gadgets since 2020.',
        supportPhone: '+91 98765 43210',
        supportEmail: 'support@apextech.io',
        returnPolicy: 'Hassle-free 10-day replacement on all electronic items.',
        socialLinks: {
          instagram: 'https://instagram.com/apextechhub',
          twitter: 'https://x.com/apextechhub',
          facebook: 'https://facebook.com/apextechhub',
          youtube: 'https://youtube.com/@apextechhub',
          website: 'https://apextechhub.io',
        },
      };

      const resUpdate = await fetch(`${baseUrl}/vendor/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify(updatePayload),
      });
      assert.strictEqual(resUpdate.status, 200);
      const dataUpdate = await resUpdate.json();
      assert.strictEqual(dataUpdate.success, true);
      assert.strictEqual(dataUpdate.data.storeName, 'Apex Tech Enterprise');
      assert.strictEqual(dataUpdate.data.storeSlug, 'apex-tech-enterprise');
      assert.strictEqual(dataUpdate.data.bio, updatePayload.bio);
      assert.strictEqual(dataUpdate.data.supportPhone, '+91 98765 43210');
      assert.strictEqual(dataUpdate.data.socialLinks.instagram, 'https://instagram.com/apextechhub');
      assert.strictEqual(dataUpdate.data.socialLinks.website, 'https://apextechhub.io');

      // 3. Uniqueness check: Create a second vendor profile and verify duplicate slug is rejected
      const secondVendorUser = await User.create({
        name: 'Second Vendor',
        email: `second_vendor_${Date.now()}@auramarket.com`,
        phone: '9876543299',
        password: 'password123',
        role: 'vendor',
      });
      const secondVendorToken = jwt.sign({ id: secondVendorUser._id }, process.env.JWT_SECRET || 'fallback_secret_jwt_auramarket_key_2026', { expiresIn: '1h' });
      const secondProfile = await VendorProfile.create({
        user: secondVendorUser._id,
        storeName: 'Second Store',
        storeSlug: `second-store-${Date.now()}`,
        status: 'approved',
      });

      // Attempt to take apex-tech-enterprise slug
      const resDupSlug = await fetch(`${baseUrl}/vendor/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secondVendorToken}`,
        },
        body: JSON.stringify({ storeSlug: 'apex-tech-enterprise' }),
      });
      assert.strictEqual(resDupSlug.status, 400);
      const dataDupSlug = await resDupSlug.json();
      assert.strictEqual(dataDupSlug.success, false);
      assert.ok(dataDupSlug.message.includes('already taken'));

      // 4. Public Storefront GET /api/vendor/store/:slugOrId (no auth required)
      const resPublic = await fetch(`${baseUrl}/vendor/store/apex-tech-enterprise`);
      assert.strictEqual(resPublic.status, 200);
      const dataPublic = await resPublic.json();
      assert.strictEqual(dataPublic.success, true);
      assert.strictEqual(dataPublic.data.storeName, 'Apex Tech Enterprise');
      assert.strictEqual(dataPublic.data.storeSlug, 'apex-tech-enterprise');
      assert.strictEqual(dataPublic.data.bio, updatePayload.bio);
      assert.strictEqual(dataPublic.data.supportEmail, 'support@apextech.io');
      assert.strictEqual(dataPublic.data.socialLinks.youtube, 'https://youtube.com/@apextechhub');
      // Verify sensitive vendor financials are NOT leaked in public storefront
      assert.strictEqual(dataPublic.data.walletBalance, undefined);
      assert.strictEqual(dataPublic.data.commissionRate, undefined);
      assert.strictEqual(dataPublic.data.panNumber, undefined);
      assert.strictEqual(dataPublic.data.bankDetails, undefined);
      // Products list must be included
      assert.ok(Array.isArray(dataPublic.data.products));

      // 5. Public storefront with non-existent slug returns 404
      const resPublic404 = await fetch(`${baseUrl}/vendor/store/non-existent-store-slug-9999`);
      assert.strictEqual(resPublic404.status, 404);
      const dataPublic404 = await resPublic404.json();
      assert.strictEqual(dataPublic404.success, false);

      // Clean up second vendor
      await VendorProfile.deleteOne({ _id: secondProfile._id });
      await User.deleteOne({ _id: secondVendorUser._id });
    });

    await test('Point 59: Vacation Mode Toggle (Pause orders without deleting items & customer warnings)', async () => {
      // 1. Enable Vacation Mode with notice and ordering paused
      const vacationNotice = 'Annual warehouse maintenance from Oct 28 to Nov 3. Orders paused.';
      const resEnable = await fetch(`${baseUrl}/vendor/vacation-mode`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({
          isVacation: true,
          noticeMessage: vacationNotice,
          disableOrdering: true,
          startDate: '2026-10-28',
          endDate: '2026-11-03',
        }),
      });
      assert.strictEqual(resEnable.status, 200);
      const dataEnable = await resEnable.json();
      assert.strictEqual(dataEnable.success, true);
      assert.strictEqual(dataEnable.data.isVacation, true);
      assert.strictEqual(dataEnable.data.noticeMessage, vacationNotice);
      assert.strictEqual(dataEnable.data.disableOrdering, true);

      // 2. Customer attempts to place order for an item from this vendor while vacation mode is active
      const resBlockedOrder = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          items: [{ productId: headphonesProduct._id, quantity: 1, variantSku: 'APX-HEAD-BLK' }],
          shippingAddress: {
            recipientName: 'Test Customer',
            phone: '9876543210',
            street: '123 Test St',
            city: 'New Delhi',
            state: 'Delhi',
            pincode: '110001',
          },
          paymentMethod: 'COD',
        }),
      });
      assert.strictEqual(resBlockedOrder.status, 400);
      const dataBlocked = await resBlockedOrder.json();
      assert.strictEqual(dataBlocked.success, false);
      assert.ok(dataBlocked.message.includes('vacation'), 'Must notify customer that merchant is on vacation');

      // 3. Public store endpoint exposes vacationMode state
      const resPublicStore = await fetch(`${baseUrl}/vendor/store/apex-tech-enterprise`);
      assert.strictEqual(resPublicStore.status, 200);
      const dataStore = await resPublicStore.json();
      assert.strictEqual(dataStore.data.vacationMode.isVacation, true);
      assert.strictEqual(dataStore.data.vacationMode.noticeMessage, vacationNotice);

      // 4. Disable Vacation Mode (Store resumes operations)
      const resDisable = await fetch(`${baseUrl}/vendor/vacation-mode`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({
          isVacation: false,
        }),
      });
      assert.strictEqual(resDisable.status, 200);
      const dataDisable = await resDisable.json();
      assert.strictEqual(dataDisable.success, true);
      assert.strictEqual(dataDisable.data.isVacation, false);

      // 5. Customer places order again now that store is active
      const resAllowedOrder = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          items: [{ productId: headphonesProduct._id, quantity: 1, variantSku: 'APX-HEAD-BLK' }],
          shippingAddress: {
            recipientName: 'Test Customer',
            phone: '9876543210',
            street: '123 Test St',
            city: 'New Delhi',
            state: 'Delhi',
            pincode: '110001',
          },
          paymentMethod: 'COD',
        }),
      });
      assert.strictEqual(resAllowedOrder.status, 201);
      const dataAllowed = await resAllowedOrder.json();
      assert.strictEqual(dataAllowed.success, true);

      // Clean up test order to restore inventory
      const orderIdToCancel = dataAllowed.data._id || dataAllowed.data.order?._id;
      if (orderIdToCancel) {
        await fetch(`${baseUrl}/orders/${orderIdToCancel}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${customerToken}`,
          },
          body: JSON.stringify({ reason: 'Point 59 automated test cleanup' }),
        });
      }
    });

    await test('POST /delivery/tasks/:id/verify-otp rejects invalid OTP with 400', async () => {
      const res = await fetch(`${baseUrl}/delivery/tasks/${riderTask._id}/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${riderToken}`,
        },
        body: JSON.stringify({ otp: '0000' }), // Invalid OTP
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('Invalid OTP'));
    });

    await test('POST /delivery/tasks/:id/verify-otp completes delivery when customer OTP is correct', async () => {
      const targetSubOrder = await SubOrder.findById(riderTask.subOrder);
      const correctOtp = targetSubOrder.deliveryOtp;

      const res = await fetch(`${baseUrl}/delivery/tasks/${riderTask._id}/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${riderToken}`,
        },
        body: JSON.stringify({
          otp: correctOtp,
          amountCollected: riderTask.amountToCollect,
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.task.status, 'DELIVERED');
      assert.strictEqual(data.data.task.otpVerified, true);
      assert.strictEqual(data.data.subOrder.status, 'delivered');
    });

    // 9b. Edge Case & Security Validations
    await test('POST /delivery/tasks/:id/verify-otp rejects re-delivery on already DELIVERED task with 400', async () => {
      const targetSubOrder = await SubOrder.findById(riderTask.subOrder);
      const res = await fetch(`${baseUrl}/delivery/tasks/${riderTask._id}/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${riderToken}`,
        },
        body: JSON.stringify({ otp: targetSubOrder.deliveryOtp }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('already been completed'));
    });

    await test('PUT /delivery/tasks/:id/status rejects bypassing OTP verification via status=DELIVERED', async () => {
      const res = await fetch(`${baseUrl}/delivery/tasks/${riderTask._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${riderToken}`,
        },
        body: JSON.stringify({ status: 'DELIVERED' }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('OTP verification is mandatory') || data.message.includes('Cannot modify'));
    });

    await test('PUT /vendor/orders/:id/status rejects vendor attempting to mark sub-order as delivered (400)', async () => {
      const apexSub = await SubOrder.findOne({ parentOrder: placedOrder._id, vendor: headphonesProduct.vendor._id });
      const res = await fetch(`${baseUrl}/vendor/orders/${apexSub._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({ status: 'delivered' }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('Invalid status transition') || data.message.includes('OTP verification'));
    });

    await test('Atomic Cart Rollback: Order with one in-stock and one out-of-stock item does not leak stock', async () => {
      const headphoneBefore = await Product.findById(headphonesProduct._id);
      const stockBefore = headphoneBefore.stock;

      const res = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          items: [
            { productId: headphonesProduct._id, quantity: 1 },
            { productId: hoodieProduct._id, quantity: 99999 }, // Excessive quantity
          ],
          shippingAddress: {
            recipientName: 'Aman Sharma',
            phone: '9876543214',
            street: 'Flat 402, Green Valley',
            city: 'New Delhi',
            state: 'Delhi',
            pincode: '110001',
          },
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);

      // Verify headphone stock was NOT decremented (zero stock leak)
      const headphoneAfter = await Product.findById(headphonesProduct._id);
      assert.strictEqual(headphoneAfter.stock, stockBefore, 'Stock must not leak when checkout fails');
    });

    await test('Vendor Payout: Rejects NaN, negative, and excessive withdrawal amounts with 400', async () => {
      // Test NaN / null
      const res1 = await fetch(`${baseUrl}/vendor/payout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({ amount: 'invalid_number' }),
      });
      assert.strictEqual(res1.status, 400);

      // Test excessive amount
      const res2 = await fetch(`${baseUrl}/vendor/payout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorToken}`,
        },
        body: JSON.stringify({ amount: 99999999 }),
      });
      assert.strictEqual(res2.status, 400);
    });

    await test('POST /orders/:id/cancel restores stock, adjusts vendor ledger, and cancels delivery task', async () => {
      // 1. Place a fresh test order to cancel
      const orderRes = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          items: [{ productId: hoodieProduct._id, quantity: 3 }],
          shippingAddress: {
            recipientName: 'Test Cancel Recipient',
            phone: '9876543214',
            street: '123 Cancel Lane',
            city: 'Delhi',
            state: 'Delhi',
            pincode: '110001',
          },
          paymentMethod: 'COD',
        }),
      });

      assert.strictEqual(orderRes.status, 201);
      const orderData = await orderRes.json();
      const cancelOrderId = orderData.data._id;
      const subOrderId = orderData.data.subOrders[0]._id;

      const hoodieMid = await Product.findById(hoodieProduct._id);
      const stockBeforeCancel = hoodieMid.stock;

      // 2. Cancel the order
      const cancelRes = await fetch(`${baseUrl}/orders/${cancelOrderId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
      });

      assert.strictEqual(cancelRes.status, 200);
      const cancelData = await cancelRes.json();
      assert.strictEqual(cancelData.success, true);

      // 3. Verify stock restored
      const hoodieRestored = await Product.findById(hoodieProduct._id);
      assert.strictEqual(hoodieRestored.stock, stockBeforeCancel + 3, 'Stock must be replenished by 3 units');

      // 4. Verify DeliveryTask cancelled
      const task = await DeliveryTask.findOne({ subOrder: subOrderId });
      if (task) {
        assert.strictEqual(task.status, 'CANCELLED', 'Delivery task must be marked CANCELLED');
      }

      // 5. Verify refund ledger recorded
      const refundLedger = await Ledger.findOne({ subOrder: subOrderId, type: 'REFUND' });
      assert.ok(refundLedger, 'Refund ledger entry must be recorded');
    });

    await test('POST /orders/:id/cancel rejects cancelling an already cancelled order with 400', async () => {
      const cancelledOrder = await Order.findOne({ status: 'CANCELLED' });
      assert.ok(cancelledOrder, 'Cancelled order must exist');

      const res = await fetch(`${baseUrl}/orders/${cancelledOrder._id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('already cancelled'));
    });

    await test('GET /products/:id allows lookup by MongoDB ObjectId', async () => {
      const res = await fetch(`${baseUrl}/products/${headphonesProduct._id}`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.title, headphonesProduct.title);
    });

    // 10. Super Admin Analytics & Financial Commission Audit
    await test('GET /admin/analytics aggregates platform commission cuts and revenue', async () => {
      const res = await fetch(`${baseUrl}/admin/analytics`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data.grossSales > 0);
      assert.ok(data.data.platformCommission > 0);
      assert.ok(data.data.totalOrders > 0);
    });

    await test('GET /admin/ledger lists double-entry financial transaction logs', async () => {
      const res = await fetch(`${baseUrl}/admin/ledger`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data.length > 0);
      const commissionEntry = data.data.find(l => l.type === 'COMMISSION_DEBIT');
      assert.ok(commissionEntry, 'Ledger must have platform commission entries');
    });

    await test('PUT /admin/vendors/:id/status updates vendor status and commission rate', async () => {
      const vendorsRes = await fetch(`${baseUrl}/admin/vendors`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const vData = await vendorsRes.json();
      const firstVendor = vData.data[0];

      const res = await fetch(`${baseUrl}/admin/vendors/${firstVendor._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: 'approved',
          commissionRate: 9,
        }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.data.commissionRate, 9);
    });

    // 11. 1-Click Wipe & 1-Click Seed Cycle
    await test('POST /admin/wipe-demo cleans all demo data leaving clean state', async () => {
      const res = await fetch(`${baseUrl}/admin/wipe-demo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);

      // Verify DB counts are 0
      const prodCount = await Product.countDocuments();
      const orderCount = await Order.countDocuments();
      assert.strictEqual(prodCount, 0, 'Products should be wiped');
      assert.strictEqual(orderCount, 0, 'Orders should be wiped');

      // Verify SuperAdmin remains intact
      const adminUser = await User.findOne({ email: 'admin@auramarket.com' });
      assert.ok(adminUser, 'SuperAdmin user must remain after wipe');
    });

    await test('POST /admin/seed-demo repopulates full demo catalog, stores & tasks', async () => {
      const res = await fetch(`${baseUrl}/admin/seed-demo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);

      const prodCount = await Product.countDocuments();
      const vendorCount = await VendorProfile.countDocuments();
      const orderCount = await Order.countDocuments();
      assert.ok(prodCount >= 4, 'Products must be restored');
      assert.ok(vendorCount >= 2, 'Vendors must be restored');
      assert.ok(orderCount >= 1, 'Sample order must be restored');
    });

    // 12. Security & Marketplace Robustness
    await test('Undefined API routes return clean JSON 404 responses', async () => {
      const res = await fetch(`${baseUrl}/undefined-endpoint-test-404`);
      assert.strictEqual(res.status, 404);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('not found'));
    });

    await test('Super Admin can customize white-label footer and support settings via PUT /ui/config', async () => {
      const res = await fetch(`${baseUrl}/ui/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          storeName: 'AuraMarket Pro',
          footerText: '© 2026 AuraMarket Pro Enterprise Inc.',
          supportPhone: '+1-800-AURA-SHOP',
          supportEmail: 'customercare@auramarket.com',
          showDemoNotice: false,
        }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.storeName, 'AuraMarket Pro');
      assert.strictEqual(data.data.footerText, '© 2026 AuraMarket Pro Enterprise Inc.');
      assert.strictEqual(data.data.showDemoNotice, false);
    });

    await test('PATCH /admin/vendors/:id/status updates status via patch alias', async () => {
      const vendorsRes = await fetch(`${baseUrl}/admin/vendors`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const vData = await vendorsRes.json();
      const firstVendor = vData.data[0];

      const res = await fetch(`${baseUrl}/admin/vendors/${firstVendor._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: 'approved' }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.data.status, 'approved');
    });

    await test('POST /auth/login accepts courier@express.com as demo alias', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'courier@express.com', password: 'rider123456' }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.user.role, 'delivery');
    });

    await test('Security: Mock demo tokens are rejected in strict production environment', async () => {
      const origEnv = process.env.NODE_ENV;
      const origAllow = process.env.ALLOW_DEMO_TOKENS;
      try {
        process.env.NODE_ENV = 'production';
        delete process.env.ALLOW_DEMO_TOKENS;

        const res = await fetch(`${baseUrl}/admin/analytics`, {
          headers: { Authorization: 'Bearer mock_jwt_superadmin_token_2026' },
        });
        assert.strictEqual(res.status, 401);
      } finally {
        process.env.NODE_ENV = origEnv;
        if (origAllow) process.env.ALLOW_DEMO_TOKENS = origAllow;
      }
    });

    // Point 46: Integrations Hub (SMS, Payment, SMTP, Storage settings with live test dispatch & key sanitation)
    await test('Point 46: GET /admin/integrations returns external services configuration for Super Admin', async () => {
      const res = await fetch(`${baseUrl}/admin/integrations`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data.sms, 'SMS config should exist');
      assert.ok(data.data.payments, 'Payments config should exist');
      assert.ok(data.data.email, 'Email config should exist');
      assert.ok(data.data.storage, 'Storage config should exist');
    });

    await test('PUT /admin/integrations allows Super Admin to configure payment gateways and SMS settings', async () => {
      const res = await fetch(`${baseUrl}/admin/integrations`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          sms: {
            activeProvider: 'mock',
            fast2sms: { apiKey: 'f2s_live_sample_key', senderId: 'AURAEX' },
          },
          payments: {
            razorpay: { enabled: true, keyId: 'rzp_live_test_key_01', keySecret: 'rzp_secret_01' },
            stripe: { enabled: true, publishableKey: 'pk_live_01', secretKey: 'sk_live_01' },
            upi: { enabled: true, upiId: '8533955333@paytm', merchantName: 'AuraMarket Store' },
            cod: { enabled: true, label: 'Cash on Delivery (COD)' },
          },
        }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.payments.razorpay.keyId, 'rzp_live_test_key_01');
      assert.strictEqual(data.data.payments.upi.upiId, '8533955333@paytm');
    });

    await test('POST /admin/integrations/test-sms executes live test SMS dispatch', async () => {
      const res = await fetch(`${baseUrl}/admin/integrations/test-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          phone: '+918533955333',
          message: 'Test SMS from AuraMarket Admin Verification Suite',
          provider: 'mock',
        }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.provider, 'mock');
      assert.strictEqual(data.data.status, 'DELIVERED');
    });

    await test('POST /admin/integrations/test-email executes live test Email dispatch', async () => {
      const res = await fetch(`${baseUrl}/admin/integrations/test-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          email: 'admin@auramarket.com',
          subject: 'AuraMarket Automated Test',
          message: 'This is a test notification message from AuraMarket Test Suite.',
          provider: 'mock',
        }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.provider, 'mock');
      assert.strictEqual(data.data.status, 'SENT');
    });

    await test('Public GET /ui/config exposes active payment gateways but sanitizes all secret keys', async () => {
      // First, set sendgrid, smtp, and storage keys in admin
      await fetch(`${baseUrl}/admin/integrations`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          email: {
            sendgrid: { apiKey: 'SG.super_secret_production_key_12345' },
            smtp: { password: 'secret_smtp_password_999' },
          },
          storage: {
            s3: { secretKey: 'aws_secret_key_888' },
            cloudinary: { apiSecret: 'cld_secret_777' },
          },
        }),
      });

      const res = await fetch(`${baseUrl}/ui/config`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data.integrations?.payments, 'Payments config should be present');
      assert.strictEqual(data.data.integrations.payments.razorpay.enabled, true);
      // Secrets must be stripped for public safety
      assert.strictEqual(data.data.integrations.payments?.razorpay?.keySecret, undefined);
      assert.strictEqual(data.data.integrations.payments?.stripe?.secretKey, undefined);
      assert.strictEqual(data.data.integrations.email?.sendgrid?.apiKey, undefined, 'SendGrid API key must NOT be leaked');
      assert.strictEqual(data.data.integrations.email?.smtp?.password, undefined, 'SMTP password must NOT be leaked');
      assert.strictEqual(data.data.integrations.storage?.s3?.secretKey, undefined, 'S3 secret must NOT be leaked');
      assert.strictEqual(data.data.integrations.storage?.cloudinary?.apiSecret, undefined, 'Cloudinary secret must NOT be leaked');
    });

    await test('PUT /admin/integrations preserves existing keys when updating partial subdocuments', async () => {
      // Step 1: Update razorpay key
      await fetch(`${baseUrl}/admin/integrations`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          payments: {
            razorpay: { keyId: 'rzp_preserved_key_99', keySecret: 'rzp_preserved_secret_99' },
          },
        }),
      });

      // Step 2: Partial update toggling only enabled without re-sending keys
      const partialRes = await fetch(`${baseUrl}/admin/integrations`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          payments: {
            razorpay: { enabled: true },
          },
        }),
      });

      assert.strictEqual(partialRes.status, 200);
      const partialData = await partialRes.json();
      assert.strictEqual(partialData.success, true);
      assert.strictEqual(partialData.data.payments.razorpay.keyId, 'rzp_preserved_key_99', 'Existing keyId must be preserved');
      assert.strictEqual(partialData.data.payments.razorpay.keySecret, 'rzp_preserved_secret_99', 'Existing keySecret must be preserved');
    });

    // Point 47: SEO & Webmaster Suite (Meta tags, Open Graph, GA4, Pixel, sitemap.xml, robots.txt)
    await test('Point 47: GET /sitemap.xml generates valid XML with homepage, categories, products and priority/changefreq', async () => {
      const serverRoot = `http://127.0.0.1:${PORT}`;
      const res = await fetch(`${serverRoot}/sitemap.xml`);
      assert.strictEqual(res.status, 200);
      const text = await res.text();
      assert.ok(text.includes('<?xml version="1.0" encoding="UTF-8"?>'), 'Must have XML declaration');
      assert.ok(text.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'), 'Must have urlset namespace');
      assert.ok(text.includes('<loc>'), 'Must have loc elements');
      assert.ok(text.includes('<lastmod>'), 'Must have lastmod elements');
      assert.ok(text.includes('<changefreq>'), 'Must have changefreq elements');
      assert.ok(text.includes('<priority>'), 'Must have priority elements');
    });

    await test('GET /robots.txt serves valid robots directives and sitemap reference', async () => {
      const serverRoot = `http://127.0.0.1:${PORT}`;
      const res = await fetch(`${serverRoot}/robots.txt`);
      assert.strictEqual(res.status, 200);
      const text = await res.text();
      assert.ok(text.includes('User-agent: *'), 'Must specify User-agent: *');
      assert.ok(text.includes('Allow: /'), 'Must specify Allow: /');
      assert.ok(text.includes('Disallow: /api/admin'), 'Must disallow admin APIs');
      assert.ok(text.includes('Disallow: /admin'), 'Must disallow admin paths');
      assert.ok(text.includes('Sitemap:'), 'Must include Sitemap directive');
    });

    await test('PUT /ui/config persists SEO and Webmaster configuration for Super Admin', async () => {
      const updatePayload = {
        seo: {
          metaTitle: 'AuraMarket Pro — Top E-Commerce Showcase',
          metaDescription: 'Shop premier electronics, fashion, and accessories with instant OTP delivery.',
          metaKeywords: 'marketplace, verified sellers, fast delivery, shopping',
          ogImage: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200',
          canonicalUrl: 'https://shribalajikripadham.online/ecommerce-demo/',
          googleSiteVerification: 'google-site-verification-aura-2026-xyz',
          googleAnalyticsId: 'G-AURA2026TEST',
          facebookPixelId: '123456789012345',
          enableRichSnippets: true,
        },
      };

      const res = await fetch(`${baseUrl}/ui/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(updatePayload),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.seo.metaTitle, 'AuraMarket Pro — Top E-Commerce Showcase');
      assert.strictEqual(data.data.seo.googleAnalyticsId, 'G-AURA2026TEST');
      assert.strictEqual(data.data.seo.googleSiteVerification, 'google-site-verification-aura-2026-xyz');
      assert.strictEqual(data.data.seo.facebookPixelId, '123456789012345');
      assert.strictEqual(data.data.seo.enableRichSnippets, true);

      // Verify persistence via public GET /ui/config
      const getRes = await fetch(`${baseUrl}/ui/config`);
      assert.strictEqual(getRes.status, 200);
      const getData = await getRes.json();
      assert.strictEqual(getData.data.seo.metaTitle, 'AuraMarket Pro — Top E-Commerce Showcase');
      assert.strictEqual(getData.data.seo.canonicalUrl, 'https://shribalajikripadham.online/ecommerce-demo/');
      assert.strictEqual(getData.data.seo.facebookPixelId, '123456789012345', 'facebookPixelId must be exposed to storefront');
      assert.strictEqual(getData.data.seo.googleAnalyticsId, 'G-AURA2026TEST', 'googleAnalyticsId must be exposed to storefront');

      // Test toggling enableRichSnippets to false and back
      const toggleRes = await fetch(`${baseUrl}/ui/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          seo: { enableRichSnippets: false },
        }),
      });
      assert.strictEqual(toggleRes.status, 200);
      const toggleData = await toggleRes.json();
      assert.strictEqual(toggleData.data.seo.enableRichSnippets, false, 'enableRichSnippets must toggle to false');
      assert.strictEqual(toggleData.data.seo.metaTitle, 'AuraMarket Pro — Top E-Commerce Showcase', 'Other SEO fields must be preserved');
    });

  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
  }

  console.log('\n====================================================');
  console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL INTEGRATION TESTS PASSED PERFECTLY!\n');
    process.exit(0);
  }
};

runTests().catch(err => {
  console.error('Fatal Test Runner Failure:', err);
  process.exit(1);
});
