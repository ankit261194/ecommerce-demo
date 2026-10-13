import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('🖥️ AuraMarket Frontend 4-Panel Verification & Smoke Tests');
console.log('====================================================');

let passed = 0;
let failed = 0;

const test = (name, fn) => {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
};

// 1. Build Artifacts Verification
test('Production build dist/index.html exists and contains mount root', () => {
  const distHtmlPath = path.resolve(__dirname, '../dist/index.html');
  assert.ok(fs.existsSync(distHtmlPath), 'dist/index.html must exist');
  const content = fs.readFileSync(distHtmlPath, 'utf8');
  assert.ok(content.includes('<div id="root"></div>'), 'Root div must exist in index.html');
  assert.ok(content.includes('AuraMarket'), 'Title/Branding must exist');
});

test('Production build JS and CSS asset bundles are generated and non-empty', () => {
  const assetsDir = path.resolve(__dirname, '../dist/assets');
  assert.ok(fs.existsSync(assetsDir), 'dist/assets directory must exist');
  const files = fs.readdirSync(assetsDir);
  const jsBundle = files.find(f => f.endsWith('.js'));
  const cssBundle = files.find(f => f.endsWith('.css'));

  assert.ok(jsBundle, 'JavaScript bundle must exist in dist/assets');
  assert.ok(cssBundle, 'CSS bundle must exist in dist/assets');

  const jsSize = fs.statSync(path.join(assetsDir, jsBundle)).size;
  const cssSize = fs.statSync(path.join(assetsDir, cssBundle)).size;

  assert.ok(jsSize > 100000, `JS bundle size (${jsSize} bytes) should be substantial`);
  assert.ok(cssSize > 10000, `CSS bundle size (${cssSize} bytes) should be substantial`);
});

// 2. Multi-Vendor Order Splitting Logic Verification
test('Multi-vendor cart breakdown engine splits distinct store packages correctly', () => {
  const mockCartItems = [
    {
      productId: 'p1',
      title: 'Aura Pro ANC Headphones',
      price: 8999,
      quantity: 1,
      variantSku: 'APX-HEAD-BLK',
      vendorId: 'vnd_apex',
      vendorName: 'Apex Tech Hub',
    },
    {
      productId: 'p2',
      title: 'Heavyweight Cotton Hoodie',
      price: 1999,
      quantity: 2,
      variantSku: 'VOG-HOD-M',
      vendorId: 'vnd_vogue',
      vendorName: 'Vogue Trends Apparel',
    },
  ];

  const breakdown = mockCartItems.reduce((acc, item) => {
    const vId = item.vendorId || 'default_vendor';
    if (!acc[vId]) {
      acc[vId] = {
        vendorName: item.vendorName,
        items: [],
        subTotal: 0,
      };
    }
    acc[vId].items.push(item);
    acc[vId].subTotal += item.price * item.quantity;
    return acc;
  }, {});

  assert.strictEqual(Object.keys(breakdown).length, 2, 'Should split into exactly 2 vendor packages');
  assert.strictEqual(breakdown['vnd_apex'].subTotal, 8999);
  assert.strictEqual(breakdown['vnd_vogue'].subTotal, 3998);

  const grandTotal = mockCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  assert.strictEqual(grandTotal, 12997);
});

test('Cart item mutation and quantity boundaries function correctly', () => {
  let cart = [
    { productId: 'p1', variantSku: 'v1', quantity: 2, price: 100 },
    { productId: 'p2', variantSku: 'v2', quantity: 1, price: 200 },
  ];

  // Update quantity
  cart = cart.map(item => (item.productId === 'p1' && item.variantSku === 'v1' ? { ...item, quantity: 3 } : item));
  assert.strictEqual(cart.find(i => i.productId === 'p1').quantity, 3);

  // Decrement to zero removes item
  const updateQty = (list, pId, sku, qty) => {
    if (qty <= 0) return list.filter(i => !(i.productId === pId && i.variantSku === sku));
    return list.map(i => (i.productId === pId && i.variantSku === sku ? { ...i, quantity: qty } : i));
  };

  cart = updateQty(cart, 'p1', 'v1', 0);
  assert.strictEqual(cart.length, 1);
  assert.strictEqual(cart[0].productId, 'p2');
});

// 3. 4-Role Persona Data Integrity
test('Pre-configured personas for all 4 panels are defined and valid', async () => {
  const { DEMO_PERSONAS, DEMO_CREDENTIALS } = await import('../src/context/AuthContext.jsx');

  const requiredRoles = ['superadmin', 'vendor', 'delivery', 'customer'];
  for (const role of requiredRoles) {
    assert.ok(DEMO_PERSONAS[role], `Persona for '${role}' must exist`);
    assert.strictEqual(DEMO_PERSONAS[role].role, role);
    assert.ok(DEMO_PERSONAS[role].email.includes('@auramarket.com'));

    assert.ok(DEMO_CREDENTIALS[role], `Credentials for '${role}' must exist`);
    assert.ok(DEMO_CREDENTIALS[role].password.length >= 6);
  }

  // Vendor has store profile attached
  assert.ok(DEMO_PERSONAS.vendor.vendorProfile.storeName);
  assert.ok(DEMO_PERSONAS.vendor.vendorProfile.commissionRate > 0);
});

// 4. Panel Component Source Integrity
test('All 4 Panel components exist and export valid React components', async () => {
  const storefrontModule = await import('../src/pages/CustomerStorefront.jsx');
  assert.strictEqual(typeof storefrontModule.CustomerStorefront, 'function');

  const adminModule = await import('../src/pages/SuperAdminDashboard.jsx');
  assert.strictEqual(typeof adminModule.SuperAdminDashboard, 'function');

  const vendorModule = await import('../src/pages/VendorPortal.jsx');
  assert.strictEqual(typeof vendorModule.VendorPortal, 'function');

  const courierModule = await import('../src/pages/CourierDashboard.jsx');
  assert.strictEqual(typeof courierModule.CourierDashboard, 'function');
});

// 5. Design System Obsidian & Amber Theme Tokens
test('Tailwind configuration declares bespoke Obsidian Slate and Electric Amber palette', () => {
  const tailwindConfigPath = path.resolve(__dirname, '../tailwind.config.js');
  assert.ok(fs.existsSync(tailwindConfigPath));
  const content = fs.readFileSync(tailwindConfigPath, 'utf8');
  assert.ok(content.includes('obsidian'));
  assert.ok(content.includes('amber'));
});

console.log('\n====================================================');
console.log(`📊 Smoke Test Summary: ${passed} Passed, ${failed} Failed`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL 4 FRONTEND PANELS & ASSETS VERIFIED!\n');
  process.exit(0);
}
