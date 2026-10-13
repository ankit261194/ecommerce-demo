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

    await test('GET /products/:slug fetches single product with vendor details', async () => {
      const res = await fetch(`${baseUrl}/products/${headphonesProduct.slug}`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data._id, headphonesProduct._id);
      assert.ok(data.data.vendor.storeName);
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

      // Verify atomic stock decrement in DB
      const updatedHeadphones = await Product.findById(headphonesProduct._id);
      const updatedHoodie = await Product.findById(hoodieProduct._id);
      assert.strictEqual(updatedHeadphones.stock, initialHeadphonesStock - 2);
      assert.strictEqual(updatedHoodie.stock, initialHoodieStock - 1);
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
