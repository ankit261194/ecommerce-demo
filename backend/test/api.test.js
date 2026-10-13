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
          paymentMethod: 'COD',
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data._id);
      placedOrder = data.data;

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

    // 13. Master Integrations Hub Tests (Non-Developer Plug-and-Play Architecture)
    await test('GET /admin/integrations returns external services configuration for Super Admin', async () => {
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

    // 14. E-Commerce SEO Engine & Webmaster System Tests
    await test('GET /sitemap.xml generates valid XML with homepage, categories, products and priority/changefreq', async () => {
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
