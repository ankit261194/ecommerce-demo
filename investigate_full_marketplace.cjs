const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('./backend/node_modules/ws');
const fs = require('fs');

async function waitPort(port, retries = 15, delay = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      const data = await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}/json/list`, res => {
          let buf = '';
          res.on('data', d => buf += d);
          res.on('end', () => resolve(JSON.parse(buf)));
        });
        req.on('error', reject);
      });
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (e) {
      // wait and retry
    }
    await new Promise(r => setTimeout(r, delay));
  }
  throw new Error(`Port ${port} did not respond within ${retries * delay}ms`);
}

async function runComprehensiveAudit() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const port = 9654;
  const userDataDir = 'C:\\temp\\edge_comprehensive_audit_profile';

  console.log('================================================================');
  console.log('AURAMARKET ENTERPRISE MULTI-VENDOR LIVE INVESTIGATION AUDIT');
  console.log('Live Target: https://shribalajikripadham.online/ecommerce-demo/');
  console.log('Headless Edge Port:', port);
  console.log('================================================================\n');

  const browser = spawn(edgePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions',
    '--window-size=1920,1080',
    'about:blank'
  ]);

  const pageList = await waitPort(port);
  const page = pageList.find(p => p.type === 'page') || pageList[0];
  console.log('Target Page Debugger WS:', page.webSocketDebuggerUrl);

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let msgId = 1;
  const callbacks = new Map();

  function cdp(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      callbacks.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  const exceptions = [];
  const consoleErrors = [];

  ws.on('message', data => {
    try {
      const msg = JSON.parse(data);
      if (msg.id && callbacks.has(msg.id)) {
        const { resolve } = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        resolve(msg.result);
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        const desc = msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text;
        console.error(' [EXCEPTION THROWN]:', desc);
        exceptions.push({
          text: msg.params.exceptionDetails?.text,
          description: desc,
          line: msg.params.exceptionDetails?.lineNumber,
          column: msg.params.exceptionDetails?.columnNumber,
          url: msg.params.exceptionDetails?.url
        });
      }
      if (msg.method === 'Runtime.consoleAPICalled') {
        const type = msg.params.type;
        const text = msg.params.args.map(a => a.value || JSON.stringify(a)).join(' ');
        if (type === 'error') {
          console.error(' [CONSOLE ERROR]:', text);
          consoleErrors.push(text);
        }
      }
    } catch (e) {
      console.error('WS Error:', e);
    }
  });

  await new Promise(r => ws.on('open', r));
  console.log('WebSocket Connected. Enabling domains...');
  await cdp('Runtime.enable');
  await cdp('Page.enable');
  await cdp('Console.enable');

  async function evalJs(expr) {
    const res = await cdp('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true
    });
    return res?.result?.value;
  }

  console.log('Navigating to live URL...');
  await cdp('Page.navigate', { url: 'https://shribalajikripadham.online/ecommerce-demo/' });
  await new Promise(r => setTimeout(r, 5000));

  const auditReport = {
    timestamp: new Date().toISOString(),
    liveUrl: 'https://shribalajikripadham.online/ecommerce-demo/',
    sections: {}
  };

  // -------------------------------------------------------------
  // SUITE 1: DEMO HUB
  // -------------------------------------------------------------
  console.log('\n>>> [1/6] AUDITING DEMO HUB (/ecommerce-demo/) <<<');
  const hubData = await evalJs(`
    (() => {
      const title = document.title;
      const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean);
      const cards = Array.from(document.querySelectorAll('h3')).map(h => h.innerText.trim());
      const hasNotice = document.body.innerText.includes('Ankit Chaudhary (8533955333)');
      const hasInstallerBadge = document.body.innerText.includes('Web Installer (/install)');
      return {
        title,
        cards,
        buttonCount: buttons.length,
        hasAuthorNotice: hasNotice,
        hasInstallerBadge,
        bodyPreview: document.body.innerText.substring(0, 300).replace(/\\n/g, ' ')
      };
    })()
  `);
  console.log('Demo Hub Check:', JSON.stringify(hubData, null, 2));
  auditReport.sections.demoHub = hubData;

  // Test OTP Simulator
  console.log('-> Testing OTP Simulator tab & OTP Generation...');
  const otpResult = await evalJs(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const otpTab = buttons.find(b => b.innerText.includes('OTP Instant Login') || b.innerText.includes('OTP Login'));
      if (otpTab) otpTab.click();
      return { clickedOtpTab: !!otpTab };
    })()
  `);
  await new Promise(r => setTimeout(r, 1000));

  await evalJs(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const genBtn = buttons.find(b => b.innerText.includes('Generate & Send Demo OTP'));
      if (genBtn) genBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 1000));

  const otpStatus = await evalJs(`
    (() => {
      const text = document.body.innerText;
      return {
        otpFound: text.includes('Simulated SMS Gateway Sent') || text.includes('OTP:'),
        otpSnippet: text.includes('Simulated SMS Gateway') ? text.substring(text.indexOf('Simulated SMS Gateway'), text.indexOf('Simulated SMS Gateway') + 120).replace(/\\n/g, ' ') : null
      };
    })()
  `);
  console.log('-> OTP Simulator Result:', otpStatus);
  auditReport.sections.demoHub.otpSimulator = otpStatus;

  // Test Device Switcher & Guide Modal
  console.log('-> Testing Setup Guide Modal...');
  await evalJs(`
    (() => {
      const docBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Setup Guide') || b.innerText.includes('कैसे यूज़ करें'));
      if (docBtn) docBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 1200));

  const modalCheck = await evalJs(`
    (() => {
      const modal = document.querySelector('[role="dialog"], .fixed.inset-0');
      const text = modal?.innerText || '';
      // Close modal
      const closeBtn = modal?.querySelector('button');
      if (closeBtn) closeBtn.click();
      return {
        modalOpened: !!modal,
        textSnippet: text.substring(0, 200).replace(/\\n/g, ' ')
      };
    })()
  `);
  console.log('-> Setup Guide Modal Result:', modalCheck);
  auditReport.sections.demoHub.setupGuideModal = modalCheck;

  // -------------------------------------------------------------
  // SUITE 2: CUSTOMER STOREFRONT & PWA
  // -------------------------------------------------------------
  console.log('\n>>> [2/6] AUDITING CUSTOMER STOREFRONT & PWA <<<');
  // Click Launch Customer Storefront
  await evalJs(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText.includes('Storefront') && !b.innerText.includes('Vendor'));
      if (btn) btn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 4000));

  const storefrontData = await evalJs(`
    (() => {
      const isErrorBoundary = document.body.innerText.includes('Portal Display Notice') || document.body.innerText.includes('Reload Portal View');
      const productCards = document.querySelectorAll('.group, [data-product-id]');
      const searchInput = !!document.querySelector('input[type="text"], input[placeholder*="Search"]');
      const cartButton = !!document.querySelector('button[aria-label*="cart" i], button:has(svg)');
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(h => h.innerText.trim()).filter(Boolean);
      return {
        isErrorBoundary,
        productCount: productCards.length,
        hasSearchInput: searchInput,
        hasCartButton: cartButton,
        headingsSample: headings.slice(0, 10),
        bodySnippet: document.body.innerText.substring(0, 300).replace(/\\n/g, ' ')
      };
    })()
  `);
  console.log('Storefront Initial State:', JSON.stringify(storefrontData, null, 2));
  auditReport.sections.customerStorefront = storefrontData;

  // Click on first product card to test ProductDetailModal & Variants
  console.log('-> Opening Product Detail Modal & testing variants...');
  await evalJs(`
    (() => {
      const firstCard = document.querySelector('.group');
      if (firstCard) {
        const btn = firstCard.querySelector('button') || firstCard;
        btn.click();
      }
    })()
  `);
  await new Promise(r => setTimeout(r, 2000));

  const modalProductState = await evalJs(`
    (() => {
      const modal = document.querySelector('[role="dialog"], .fixed.inset-0');
      const addCartBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Add to Cart') || b.innerText.includes('Buy Now'));
      const swatches = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('Color:') || b.innerText.includes('Size:') || b.innerText.includes('RAM'));
      let clickedAdd = false;
      if (addCartBtn) {
        addCartBtn.click();
        clickedAdd = true;
      }
      return {
        modalOpened: !!modal,
        swatchesCount: swatches.length,
        hasAddCartButton: !!addCartBtn,
        clickedAddCart: clickedAdd,
        modalSnippet: modal?.innerText?.substring(0, 200).replace(/\\n/g, ' ')
      };
    })()
  `);
  console.log('-> Product Modal State:', modalProductState);
  auditReport.sections.customerStorefront.productDetailModal = modalProductState;
  await new Promise(r => setTimeout(r, 2000));

  // Check Cart Drawer & Proceed to Checkout
  console.log('-> Checking Cart Drawer & Proceeding to Checkout...');
  const cartDrawerState = await evalJs(`
    (() => {
      const checkoutBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Proceed to Checkout') || b.innerText.includes('Checkout'));
      let clickedCheckout = false;
      if (checkoutBtn) {
        checkoutBtn.click();
        clickedCheckout = true;
      }
      return {
        hasCheckoutBtn: !!checkoutBtn,
        clickedCheckout,
        bodyTextSnippet: document.body.innerText.substring(0, 300).replace(/\\n/g, ' ')
      };
    })()
  `);
  console.log('-> Cart Drawer State:', cartDrawerState);
  auditReport.sections.customerStorefront.cartDrawer = cartDrawerState;
  await new Promise(r => setTimeout(r, 3000));

  // Place Order (COD) to test 4-Digit Delivery Handover OTP
  console.log('-> Placing Order via COD to test 4-Digit Handover Delivery OTP...');
  const checkoutAction = await evalJs(`
    (() => {
      const placeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Place Order') || b.innerText.includes('Confirm Order') || b.innerText.includes('Complete Purchase'));
      if (placeBtn) {
        placeBtn.click();
        return { clickedPlaceOrder: true, btnText: placeBtn.innerText };
      }
      return { clickedPlaceOrder: false };
    })()
  `);
  console.log('-> Place Order Action:', checkoutAction);
  await new Promise(r => setTimeout(r, 3500));

  const orderConfirmationState = await evalJs(`
    (() => {
      const text = document.body.innerText;
      const hasOrderPlaced = text.includes('Order Confirmed') || text.includes('Order Placed') || text.includes('Delivery OTP') || text.includes('Handover');
      // Extract 4 digit OTP if shown
      const match = text.match(/OTP[:\s]+([0-9]{4})/i) || text.match(/([0-9]{4})\s*(delivery otp|secret otp|handover otp)/i);
      return {
        hasOrderPlaced,
        otpMatched: match ? match[0] : null,
        confirmationSnippet: text.substring(0, 400).replace(/\\n/g, ' ')
      };
    })()
  `);
  console.log('-> Order Confirmation & Handover OTP:', orderConfirmationState);
  auditReport.sections.customerStorefront.orderConfirmation = orderConfirmationState;

  // -------------------------------------------------------------
  // SUITE 3: SUPER ADMIN CONTROL CENTER (39+ MANAGEMENT TABS)
  // -------------------------------------------------------------
  console.log('\n>>> [3/6] AUDITING SUPER ADMIN DASHBOARD (ALL 54 TABS) <<<');
  // Navigate to Super Admin via DemoToolbar
  await evalJs(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const adminBtn = buttons.find(b => b.innerText.includes('Super Admin'));
      if (adminBtn) adminBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 4000));

  const adminOverview = await evalJs(`
    (() => {
      const isErrorBoundary = document.body.innerText.includes('Portal Display Notice') || document.body.innerText.includes('Reload Portal View');
      const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.innerText.trim()).filter(Boolean);
      const kpis = Array.from(document.querySelectorAll('.font-black, .text-2xl, .text-3xl')).map(el => el.innerText.trim()).filter(t => t.includes('₹') || t.includes('%') || !isNaN(t) && t.length > 0);
      return {
        isErrorBoundary,
        headings: headings.slice(0, 10),
        kpis: kpis.slice(0, 10),
        bodySnippet: document.body.innerText.substring(0, 250).replace(/\\n/g, ' ')
      };
    })()
  `);
  console.log('Super Admin Overview:', adminOverview);
  auditReport.sections.superAdminDashboard = {
    overview: adminOverview,
    tabsAudited: []
  };

  // List of all management tabs in SuperAdminDashboard
  const allTabs = [
    { id: 'overview', name: 'Overview Bento Grid' },
    { id: 'orders', name: 'Orders & Fulfillment' },
    { id: 'categories', name: 'Category Tree Manager' },
    { id: 'brands', name: 'Brand Directory' },
    { id: 'banners', name: 'Banner Manager' },
    { id: 'announcement', name: 'Announcement Bar Manager' },
    { id: 'coupons', name: 'Coupons & Discounts' },
    { id: 'flash-deals', name: 'Flash Deals' },
    { id: 'abandoned-carts', name: 'Abandoned Carts' },
    { id: 'customers', name: 'Customer CRM' },
    { id: 'vendors', name: 'Vendor KYC & Storefronts' },
    { id: 'payouts', name: 'Vendor Payouts' },
    { id: 'tax-shipping', name: 'Tax & Shipping Zones' },
    { id: 'staff-roles', name: 'Staff Roles & Permissions' },
    { id: 'audit-backup', name: 'System Audit & Backups' },
    { id: 'rto-guard', name: 'RTO Guard Engine' },
    { id: 'localization', name: 'Localization & Multi-Currency' },
    { id: 'global-settings', name: 'Global Settings' },
    { id: 'audit-trail', name: 'Audit Trail Manager' },
    { id: 'push-notifications', name: 'Web Push Notifications' },
    { id: 'wallet-vault', name: 'Admin Wallet Vault' },
    { id: 'emi-engine', name: 'EMI Breakdown Manager' },
    { id: 'social-og', name: 'Social Share & OpenGraph Hub' },
    { id: 'gift-wrap', name: 'Gift Wrap Manager' },
    { id: 'hyperlocal', name: 'Hyperlocal Geofence' },
    { id: 'cod-vault', name: 'COD Reconciliation Vault' },
    { id: 'ai-studio', name: 'AI Smart Product Studio' },
    { id: 'whatsapp-bot', name: 'WhatsApp Shopping Bot' },
    { id: 'group-buy', name: 'Group Buying Engine' },
    { id: 'video-shopping', name: 'Live Video Shopping' },
    { id: 'rto-predictor', name: 'AI Smart RTO Predictor' },
    { id: 'cms-pages', name: 'CMS Page Builder' },
    { id: 'faqs', name: 'FAQ Manager' },
    { id: 'commission-rules', name: 'Commission Rule Engine' },
    { id: 'logistics-zones', name: 'Pincode Zone Logistics' },
    { id: 'telemetry-health', name: 'Server Telemetry Health' },
    { id: 'vendor-verification', name: 'Vendor Verification Hub' },
    { id: 'shipping-manifest', name: 'Shipping Manifest Hub' },
    { id: 'job-queues', name: 'Job Queue Monitor' },
    { id: 'multi-warehouse', name: 'Multi-Warehouse Routing' },
    { id: 'stock-transfers', name: 'Stock Transfer Orders' },
    { id: 'affiliates', name: 'Affiliate Program Manager' },
    { id: 'loyalty', name: 'Loyalty Tier Manager' },
    { id: 'flash-sales-mega', name: 'Flash Mega Campaigns' },
    { id: 'cart-recovery-drip', name: 'Cart Recovery Drip' },
    { id: 'hyperlocal-dispatch', name: 'Hyperlocal Dispatch' },
    { id: 'fleet-live-map', name: 'Fleet Live Map Radar' },
    { id: 'reverse-logistics', name: 'Reverse Logistics Hub' },
    { id: 'escrow', name: 'Admin Escrow Engine' },
    { id: 'tax-compliance', name: 'Tax Compliance Dashboard' },
    { id: 'fraud-prevention', name: 'Fraud Prevention' },
    { id: 'layout', name: 'Homepage Layout Builder' },
    { id: 'integrations', name: 'Integrations Hub' },
    { id: 'seo', name: 'SEO Engine' }
  ];

  console.log(`Auditing all ${allTabs.length} Super Admin tabs sequentially...`);
  let tabsPassed = 0;
  let tabsFailed = 0;

  for (const t of allTabs) {
    const excBefore = exceptions.length;
    // Click the sidebar button corresponding to this tab
    await evalJs(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('aside button, nav button, div[class*="sidebar"] button, div[class*="overflow"] button, button'));
        // Normalize comparison
        const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const target = norm('${t.id}');
        const targetName = norm('${t.name}');

        let btn = buttons.find(b => {
          const text = norm(b.innerText || '');
          return text.includes(target) || text.includes(targetName) || target.includes(text);
        });

        // If not found by direct text, search in all buttons
        if (!btn) {
          btn = buttons.find(b => (b.innerText || '').toLowerCase().includes('${t.id}'.replace(/-/g, ' ')));
        }

        if (btn) {
          btn.click();
          return { found: true, text: btn.innerText.trim() };
        }
        return { found: false };
      })()
    `);

    // Allow component to mount and render
    await new Promise(r => setTimeout(r, 600));

    const checkTab = await evalJs(`
      (() => {
        const isErrorBoundary = document.body.innerText.includes('Portal Display Notice') || document.body.innerText.includes('Reload Portal View');
        const root = document.getElementById('root');
        return {
          isErrorBoundary,
          htmlLength: root?.innerHTML?.length || 0,
          bodySnippet: document.body.innerText.substring(0, 200).replace(/\\n/g, ' ')
        };
      })()
    `);

    const newExceptions = exceptions.length - excBefore;
    const passed = !checkTab.isErrorBoundary && newExceptions === 0 && checkTab.htmlLength > 500;

    if (passed) tabsPassed++; else tabsFailed++;
    console.log(` [Tab ${t.id}] -> ${passed ? '✅ PASS' : '❌ FAIL'} (Size: ${checkTab.htmlLength} bytes, Exc: ${newExceptions})`);

    auditReport.sections.superAdminDashboard.tabsAudited.push({
      tabId: t.id,
      tabName: t.name,
      status: passed ? 'PASS' : 'FAIL',
      htmlLength: checkTab.htmlLength,
      newExceptions,
      snippet: checkTab.bodySnippet.substring(0, 80)
    });
  }

  console.log(`Super Admin Tabs Summary: ${tabsPassed}/${allTabs.length} PASSED (${tabsFailed} failed)`);

  // -------------------------------------------------------------
  // SUITE 4: VENDOR / SELLER MANAGEMENT PORTAL
  // -------------------------------------------------------------
  console.log('\n>>> [4/6] AUDITING VENDOR / SELLER PORTAL <<<');
  await evalJs(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const vendorBtn = buttons.find(b => b.innerText.includes('Vendor Portal'));
      if (vendorBtn) vendorBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 4000));

  const vendorData = await evalJs(`
    (() => {
      const isErrorBoundary = document.body.innerText.includes('Portal Display Notice') || document.body.innerText.includes('Reload Portal View');
      const body = document.body.innerText;
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(h => h.innerText.trim()).filter(Boolean);
      const actionBtns = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean);
      return {
        isErrorBoundary,
        hasStoreName: body.includes('Apex Tech Hub') || body.includes('Merchant') || body.includes('Vendor'),
        headingsSample: headings.slice(0, 10),
        actionButtonsSample: actionBtns.slice(0, 15),
        bodySnippet: body.substring(0, 300).replace(/\\n/g, ' ')
      };
    })()
  `);
  console.log('Vendor Portal State:', JSON.stringify(vendorData, null, 2));
  auditReport.sections.vendorPortal = vendorData;

  // -------------------------------------------------------------
  // SUITE 5: COURIER & LOGISTICS HUB
  // -------------------------------------------------------------
  console.log('\n>>> [5/6] AUDITING COURIER & LOGISTICS HUB <<<');
  await evalJs(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const courierBtn = buttons.find(b => b.innerText.includes('Courier Hub') || b.innerText.includes('Courier'));
      if (courierBtn) courierBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 4000));

  const courierData = await evalJs(`
    (() => {
      const isErrorBoundary = document.body.innerText.includes('Portal Display Notice') || document.body.innerText.includes('Reload Portal View');
      const body = document.body.innerText;
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(h => h.innerText.trim()).filter(Boolean);
      const verifyBtns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('OTP') || b.innerText.includes('Handover') || b.innerText.includes('Deliver'));
      return {
        isErrorBoundary,
        hasRider: body.includes('Vikram Singh') || body.includes('Rider') || body.includes('Assigned Route'),
        headingsSample: headings.slice(0, 10),
        verifyBtnsCount: verifyBtns.length,
        bodySnippet: body.substring(0, 300).replace(/\\n/g, ' ')
      };
    })()
  `);
  console.log('Courier Hub State:', JSON.stringify(courierData, null, 2));
  auditReport.sections.courierHub = courierData;

  // Test Courier OTP modal open
  console.log('-> Opening Courier OTP Modal...');
  await evalJs(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('OTP') || b.innerText.includes('Verify'));
      if (btn) btn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 1500));

  const courierModalCheck = await evalJs(`
    (() => {
      const modal = document.querySelector('[role="dialog"], .fixed.inset-0');
      const body = modal ? modal.innerText : '';
      const closeBtn = modal?.querySelector('button');
      if (closeBtn) closeBtn.click();
      return {
        modalOpened: !!modal,
        snippet: body.substring(0, 200).replace(/\\n/g, ' ')
      };
    })()
  `);
  console.log('-> Courier OTP Modal Check:', courierModalCheck);
  auditReport.sections.courierHub.otpModal = courierModalCheck;

  // -------------------------------------------------------------
  // SUITE 6: 1-CLICK WEB GUI INSTALLER (?tab=install)
  // -------------------------------------------------------------
  console.log('\n>>> [6/6] AUDITING 1-CLICK WEB GUI INSTALLER <<<');
  await evalJs(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const installBtn = buttons.find(b => b.innerText.includes('Web Installer') || b.innerText.includes('Installer'));
      if (installBtn) installBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 4000));

  const installStep1 = await evalJs(`
    (() => {
      const isErrorBoundary = document.body.innerText.includes('Portal Display Notice') || document.body.innerText.includes('Reload Portal View');
      const body = document.body.innerText;
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(h => h.innerText.trim()).filter(Boolean);
      const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Next') || b.innerText.includes('Continue'));
      return {
        isErrorBoundary,
        hasInstallerTitle: body.includes('Installation Wizard') || body.includes('Step 1') || body.includes('License Agreement'),
        headingsSample: headings.slice(0, 10),
        hasNextButton: !!nextBtn,
        bodySnippet: body.substring(0, 300).replace(/\\n/g, ' ')
      };
    })()
  `);
  console.log('Installer Step 1 State:', JSON.stringify(installStep1, null, 2));
  auditReport.sections.installWizard = { step1: installStep1 };

  // Click Next to Step 2
  console.log('-> Advancing to Installer Step 2...');
  await evalJs(`
    (() => {
      const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Next') || b.innerText.includes('Continue'));
      if (nextBtn) nextBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 2000));

  const installStep2 = await evalJs(`
    (() => {
      const body = document.body.innerText;
      return {
        hasPrerequisites: body.includes('System Requirements') || body.includes('Prerequisites') || body.includes('PHP') || body.includes('Node'),
        bodySnippet: body.substring(0, 300).replace(/\\n/g, ' ')
      };
    })()
  `);
  console.log('Installer Step 2 State:', JSON.stringify(installStep2, null, 2));
  auditReport.sections.installWizard.step2 = installStep2;

  // -------------------------------------------------------------
  // FINAL EXCEPTION & SUMMARY AUDIT
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log('EXHAUSTIVE LIVE AUDIT FINISHED');
  console.log('Total Unhandled Runtime Exceptions Caught:', exceptions.length);
  console.log('Total Console Errors Caught:', consoleErrors.length);
  console.log('================================================================');

  auditReport.summary = {
    totalExceptions: exceptions.length,
    totalConsoleErrors: consoleErrors.length,
    exceptionsList: exceptions,
    consoleErrorsList: consoleErrors
  };

  fs.writeFileSync('live_audit_report.json', JSON.stringify(auditReport, null, 2), 'utf8');
  console.log('Audit results saved to live_audit_report.json');

  ws.close();
  browser.kill();
  process.exit(0);
}

runComprehensiveAudit().catch(err => {
  console.error('Fatal Audit Error:', err);
  process.exit(1);
});
