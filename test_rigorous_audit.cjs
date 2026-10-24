const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('./backend/node_modules/ws');
const fs = require('fs');

async function waitPort(port, retries = 20, delay = 500) {
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
    } catch (e) {}
    await new Promise(r => setTimeout(r, delay));
  }
  throw new Error(`Port ${port} did not respond within ${retries * delay}ms`);
}

async function runRigorousAudit() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const port = 9777;
  const userDataDir = 'C:\\temp\\edge_rigorous_audit_profile';

  console.log('Spawning Headless Edge on Port:', port);
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
        console.error(' [EXCEPTION]:', desc);
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
    } catch (e) {}
  });

  await new Promise(r => ws.on('open', r));
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
  await new Promise(r => setTimeout(r, 4500));

  const results = {
    demoHub: {},
    otpSimulator: {},
    customerStorefront: {},
    superAdminTabs: [],
    vendorPortal: {},
    courierPortal: {},
    installerWizard: {},
    totalExceptions: 0,
    totalConsoleErrors: 0
  };

  // TEST 1: DEMO HUB OTP SIMULATOR
  console.log('\n=== TEST 1: DEMO HUB & OTP SIMULATOR ===');
  const otpSimRes = await evalJs(`
    (() => {
      // Find "Login with OTP" button
      const buttons = Array.from(document.querySelectorAll('button'));
      const otpTab = buttons.find(b => b.innerText.includes('Login with OTP'));
      if (!otpTab) return { error: 'Login with OTP button not found' };
      otpTab.click();
      return { clickedOtpTab: true };
    })()
  `);
  await new Promise(r => setTimeout(r, 800));

  const otpGetRes = await evalJs(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const getOtpBtn = buttons.find(b => b.innerText.trim() === 'Get OTP');
      if (!getOtpBtn) return { error: 'Get OTP button not found' };
      getOtpBtn.click();
      return { clickedGetOtp: true };
    })()
  `);
  await new Promise(r => setTimeout(r, 800));

  const otpVerifyRes = await evalJs(`
    (() => {
      const text = document.body.innerText;
      const verifyBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Verify OTP & Sign In'));
      return {
        hasDispatchedNotice: text.includes('OTP Dispatched via connected SMS Gateway'),
        codeRendered: text.includes('4821'),
        hasVerifyBtn: !!verifyBtn
      };
    })()
  `);
  results.otpSimulator = { otpSimRes, otpGetRes, otpVerifyRes };
  console.log('OTP Simulator Results:', results.otpSimulator);

  // TEST 2: SWITCH TO SUPER ADMIN & TEST ALL 54 TABS RIGOROUSLY
  console.log('\n=== TEST 2: SUPER ADMIN DASHBOARD ALL 54 TABS ===');
  // Click on "Super Admin" in DemoToolbar
  await evalJs(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText.includes('Super Admin') && b.closest('.sticky, [class*="DemoToolbar"]'));
      if (btn) btn.click();
      else {
        const anyAdmin = buttons.find(b => b.innerText.includes('1-Click Launch Admin') || b.innerText.includes('Super Admin'));
        if (anyAdmin) anyAdmin.click();
      }
    })()
  `);
  await new Promise(r => setTimeout(r, 3500));

  // Verify Super Admin is mounted
  const adminMountCheck = await evalJs(`
    (() => {
      const text = document.body.innerText;
      const hasHeading = text.includes('Super Admin Control Center') || text.includes('Marketplace Overview');
      return { hasHeading, bodyStart: text.substring(0, 300).replace(/\\n/g, ' ') };
    })()
  `);
  console.log('Admin Mount Check:', adminMountCheck);

  // Tab definitions from SuperAdminDashboard.jsx
  const tabDefs = [
    { id: 'overview', span: 'Marketplace Overview' },
    { id: 'orders', span: 'Orders Command Center' },
    { id: 'categories', span: 'Categories Tree' },
    { id: 'brands', span: 'Brands Directory' },
    { id: 'banners', span: 'Hero & Promo Banners' },
    { id: 'announcement', span: 'Top Announcement' },
    { id: 'coupons', span: 'Coupons & Promo Codes' },
    { id: 'flash-deals', span: 'Flash Deals & Sales' },
    { id: 'abandoned-carts', span: 'Abandoned Carts' },
    { id: 'customers', span: 'Customer CRM Directory' },
    { id: 'vendors', span: 'Vendor KYC & Stores' },
    { id: 'payouts', span: 'Vendor Payouts & Withdrawals' },
    { id: 'layout', span: 'Homepage Layout' },
    { id: 'integrations', span: 'Integrations & API Hub' },
    { id: 'seo', span: 'SEO & Webmaster Hub' },
    { id: 'tax-shipping', span: 'Tax & Shipping Engine' },
    { id: 'staff-roles', span: 'Staff Roles & Permissions' },
    { id: 'audit-backup', span: 'Audit Trail & DB Backup' },
    { id: 'rto-guard', span: 'RTO Guard Anti-Fraud' },
    { id: 'localization', span: 'Currency & Language' },
    { id: 'global-settings', span: 'Site Maintenance & Global Settings' },
    { id: 'audit-trail', span: 'Activity & Security Audit Trail' },
    { id: 'push-notifications', span: 'Web Push Broadcast Studio' },
    { id: 'wallet-vault', span: 'Wallet & Scratch Rewards Vault' },
    { id: 'emi-engine', span: 'EMI & BNPL Studio' },
    { id: 'social-og', span: 'Social & OpenGraph Cards' },
    { id: 'gift-wrap', span: 'Gift Wrap & Greeting Studio' },
    { id: 'hyperlocal', span: 'Hyperlocal Geofence & Hubs' },
    { id: 'cod-vault', span: 'COD Vault & Remittance' },
    { id: 'ai-studio', span: 'AI Listing & SEO Studio' },
    { id: 'whatsapp-bot', span: 'WhatsApp Shopping Bot' },
    { id: 'group-buy', span: 'Group Buying (Team Purchase)' },
    { id: 'video-shopping', span: 'Live Video Shopping & Reels' },
    { id: 'rto-predictor', span: 'Smart RTO Fraud Predictor' },
    { id: 'cms-pages', span: 'CMS & Legal Pages' },
    { id: 'faqs', span: 'FAQ Builder' },
    { id: 'commission-rules', span: 'Commission Rules' },
    { id: 'logistics-zones', span: 'Zone Logistics' },
    { id: 'telemetry-health', span: 'Server Health & Telemetry' },
    { id: 'vendor-verification', span: 'Vendor KYC & Penny-Drop' },
    { id: 'shipping-manifest', span: 'Courier Manifests' },
    { id: 'job-queues', span: 'Job Queues & Workers' },
    { id: 'multi-warehouse', span: 'Multi-Warehouse Hub' },
    { id: 'stock-transfers', span: 'Stock Transfers (STO)' },
    { id: 'affiliates', span: 'Affiliate & Influencers' },
    { id: 'loyalty', span: 'VIP Loyalty & Tiers' },
    { id: 'flash-sales-mega', span: 'Mega Flash Sales' },
    { id: 'cart-recovery-drip', span: 'Cart Recovery Drip' },
    { id: 'hyperlocal-dispatch', span: 'Hyperlocal Dispatch Radar' },
    { id: 'fleet-live-map', span: 'Fleet Live Map Radar' },
    { id: 'reverse-logistics', span: 'Reverse Logistics & SPF' },
    { id: 'escrow', span: 'Escrow Settlement Engine' },
    { id: 'tax-compliance', span: 'GST & TDS E-Invoicing' },
    { id: 'fraud-prevention', span: 'Fraud Prevention & Risk Radar' }
  ];

  for (let i = 0; i < tabDefs.length; i++) {
    const t = tabDefs[i];
    const excBefore = exceptions.length;

    // Click the specific tab button
    const clickTab = await evalJs(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => {
          const s = b.querySelector('span');
          return s && s.innerText.trim().toLowerCase() === '${t.span.toLowerCase()}';
        }) || buttons.find(b => b.innerText.toLowerCase().includes('${t.span.toLowerCase()}'));
        if (btn) {
          btn.click();
          return { found: true, text: btn.innerText.replace(/\\n/g, ' ').substring(0, 50) };
        }
        return { found: false };
      })()
    `);

    await new Promise(r => setTimeout(r, 600));

    // Inspect content rendered
    const tabState = await evalJs(`
      (() => {
        const isErrorBoundary = document.body.innerText.includes('Portal Display Notice') || document.body.innerText.includes('Reload Portal View');
        const main = document.querySelector('main');
        const mainText = main ? main.innerText.substring(0, 300).replace(/\\n/g, ' ') : '';
        const modal = document.querySelector('[role="dialog"], .fixed.inset-0');
        const modalText = modal ? modal.innerText.substring(0, 200).replace(/\\n/g, ' ') : '';

        // If it was a modal tab (e.g. hyperlocal-dispatch, fleet-live-map, reverse-logistics), close it so next tabs can be clicked!
        if (modal) {
          const allModalBtns = Array.from(modal.querySelectorAll('button'));
          const xBtn = allModalBtns.find(b => b.innerText.includes('Close') || b.innerText.includes('✕') || b.querySelector('svg'));
          if (xBtn) {
            xBtn.click();
          }
        }

        return {
          isErrorBoundary,
          mainTextSnippet: mainText,
          modalTextSnippet: modalText
        };
      })()
    `);

    const newExc = exceptions.length - excBefore;
    const pass = clickTab.found && !tabState.isErrorBoundary && newExc === 0;

    console.log('[Tab ' + (i + 1) + '/' + tabDefs.length + '] ' + t.id + ' ("' + t.span + '") -> ' + (pass ? '✅ PASS' : '❌ FAIL') + (clickTab.found ? '' : ' (NOT FOUND)') + ' (Exc: ' + newExc + ')');

    results.superAdminTabs.push({
      id: t.id,
      span: t.span,
      found: clickTab.found,
      pass,
      newExc,
      contentSnippet: tabState.modalTextSnippet || tabState.mainTextSnippet
    });
  }

  // TEST 3: VENDOR PORTAL
  console.log('\n=== TEST 3: VENDOR PORTAL ===');
  await evalJs(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Vendor Portal') && b.closest('.sticky, [class*="DemoToolbar"]'));
      if (btn) btn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 3500));

  const vendorCheck = await evalJs(`
    (() => {
      const text = document.body.innerText;
      return {
        hasApexHeading: text.includes('Apex Tech Hub') || text.includes('VERIFIED PARTNER'),
        hasSalesKpi: text.includes('1,85,000') || text.includes('₹'),
        hasWalletKpi: text.includes('24,500'),
        hasActiveOrders: text.includes('Active Orders') || text.includes('Order'),
        snippet: text.substring(0, 300).replace(/\\n/g, ' ')
      };
    })()
  `);
  results.vendorPortal = vendorCheck;
  console.log('Vendor Portal Results:', vendorCheck);

  // TEST 4: COURIER HUB
  console.log('\n=== TEST 4: COURIER DELIVERY HUB ===');
  await evalJs(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Courier Hub') && b.closest('.sticky, [class*="DemoToolbar"]'));
      if (btn) btn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 3500));

  const courierCheck = await evalJs(`
    (() => {
      const text = document.body.innerText;
      const verifyOtpBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Verify Delivery OTP') || b.innerText.includes('Verify OTP') || b.innerText.includes('OTP'));
      return {
        hasVikram: text.includes('Vikram Singh') || text.includes('Delivery Partner') || text.includes('Courier'),
        hasTasks: text.includes('DELIVERY') || text.includes('Pickup') || text.includes('Order'),
        hasOtpBtn: !!verifyOtpBtn,
        snippet: text.substring(0, 300).replace(/\\n/g, ' ')
      };
    })()
  `);
  results.courierPortal = courierCheck;
  console.log('Courier Portal Results:', courierCheck);

  // TEST 5: CUSTOMER STOREFRONT DEEP FLOW
  console.log('\n=== TEST 5: CUSTOMER STOREFRONT DEEP FLOW ===');
  await evalJs(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Storefront') && b.closest('.sticky, [class*="DemoToolbar"]'));
      if (btn) btn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 3500));

  // Search test
  const searchTest = await evalJs(`
    (() => {
      const searchInput = document.querySelector('input[type="text"], input[placeholder*="Search"]');
      if (searchInput) {
        searchInput.value = 'Headphones';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        return { searched: true };
      }
      return { searched: false };
    })()
  `);
  await new Promise(r => setTimeout(r, 1000));

  // Clear search
  await evalJs(`
    (() => {
      const searchInput = document.querySelector('input[type="text"], input[placeholder*="Search"]');
      if (searchInput) {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()
  `);
  await new Promise(r => setTimeout(r, 1000));

  // Open first product detail modal
  const productModalRes = await evalJs(`
    (() => {
      const cards = document.querySelectorAll('.group');
      if (cards.length > 0) {
        const titleEl = cards[0].querySelector('h3, h4, p');
        const cardTitle = titleEl ? titleEl.innerText : 'Unknown Product';
        const img = cards[0].querySelector('img') || cards[0];
        img.click();
        return { openedProductModal: true, productTitle: cardTitle };
      }
      return { openedProductModal: false };
    })()
  `);
  await new Promise(r => setTimeout(r, 1500));

  // Click Add to Cart
  const modalAddCartRes = await evalJs(`
    (() => {
      const modal = document.querySelector('[role="dialog"], .fixed.inset-0');
      if (!modal) return { modalFound: false };
      const addBtn = Array.from(modal.querySelectorAll('button')).find(b => b.innerText.includes('Add to Cart'));
      if (addBtn) {
        addBtn.click();
        return { modalFound: true, clickedAdd: true };
      }
      return { modalFound: true, clickedAdd: false };
    })()
  `);
  await new Promise(r => setTimeout(r, 1500));

  // Click Checkout in cart drawer
  const checkoutBtnRes = await evalJs(`
    (() => {
      const checkoutBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Proceed to Checkout') || b.innerText.includes('Checkout'));
      if (checkoutBtn) {
        checkoutBtn.click();
        return { clickedCheckout: true };
      }
      return { clickedCheckout: false };
    })()
  `);
  await new Promise(r => setTimeout(r, 2500));

  // Place Order button
  const placeOrderRes = await evalJs(`
    (() => {
      const placeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Place Order & Book Delivery') || b.innerText.includes('Place Order'));
      if (placeBtn) {
        placeBtn.click();
        return { clickedPlaceOrder: true };
      }
      return { clickedPlaceOrder: false };
    })()
  `);
  await new Promise(r => setTimeout(r, 3500));

  // Check Order Confirmation & Delivery OTP
  const orderConfirmRes = await evalJs(`
    (() => {
      const text = document.body.innerText;
      return {
        hasOrderConfirmed: text.includes('Order Confirmed') || text.includes('Order Placed Successfully'),
        hasOtp4821: text.includes('4821'),
        hasRiderVikram: text.includes('Vikram Singh'),
        hasGstInvoiceBtn: text.includes('GST Invoice (PDF)'),
        hasScratchCard: text.includes('Scratch Card') || text.includes('🪙'),
        snippet: text.substring(text.indexOf('Order Confirmed') !== -1 ? text.indexOf('Order Confirmed') : 0, 400).replace(/\\n/g, ' ')
      };
    })()
  `);
  results.customerStorefront = {
    searchTest,
    productModalRes,
    modalAddCartRes,
    checkoutBtnRes,
    placeOrderRes,
    orderConfirmRes
  };
  console.log('Customer Storefront Flow Results:', results.customerStorefront);

  // TEST 6: 1-CLICK WEB INSTALLER WIZARD
  console.log('\n=== TEST 6: 1-CLICK WEB INSTALLER WIZARD ===');
  await evalJs(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Web Installer') && b.closest('.sticky, [class*="DemoToolbar"]'));
      if (btn) btn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 3500));

  // Step 1: Check requirements advance
  const installerStep1 = await evalJs(`
    (() => {
      const text = document.body.innerText;
      const step1Title = text.includes('Welcome to AuraMarket Installation');
      const checkReqBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Check Server Requirements'));
      if (checkReqBtn) {
        checkReqBtn.click();
        return { step1Title, clickedCheckReq: true };
      }
      return { step1Title, clickedCheckReq: false };
    })()
  `);
  await new Promise(r => setTimeout(r, 2000));

  // Step 2: Check server audit & configure database button status
  const installerStep2 = await evalJs(`
    (() => {
      const text = document.body.innerText;
      const hasServerAudit = text.includes('Server Environment & Compatibility Audit');
      const configureDbBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Configure Database'));
      return {
        hasServerAudit,
        configureDbBtnFound: !!configureDbBtn,
        configureDbBtnDisabled: configureDbBtn ? configureDbBtn.disabled : null,
        buttonClasses: configureDbBtn ? configureDbBtn.className : ''
      };
    })()
  `);
  results.installerWizard = { installerStep1, installerStep2 };
  console.log('Installer Wizard Results:', results.installerWizard);

  // Summary
  results.totalExceptions = exceptions.length;
  results.totalConsoleErrors = consoleErrors.length;
  console.log('\n======================================================');
  console.log('RIGOROUS LIVE AUDIT COMPLETE');
  console.log('Total Exceptions Caught: ' + exceptions.length);
  console.log('Total Console Errors Caught: ' + consoleErrors.length);
  console.log('======================================================\n');

  fs.writeFileSync('rigorous_audit_results.json', JSON.stringify(results, null, 2));

  ws.close();
  browser.kill();
  process.exit(0);
}

runRigorousAudit().catch(err => {
  console.error('Fatal Audit Error:', err);
  process.exit(1);
});
