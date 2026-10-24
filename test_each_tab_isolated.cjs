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

async function testAllTabsIsolated() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const port = 9888;
  const userDataDir = 'C:\\temp\\edge_tabs_isolated_profile';

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
        exceptions.push(desc);
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

  // Switch to Super Admin
  await evalJs(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const adminBtn = buttons.find(b => b.innerText.includes('Super Admin'));
      if (adminBtn) adminBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 3500));

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

  const tabResults = [];

  for (let i = 0; i < tabDefs.length; i++) {
    const t = tabDefs[i];

    // Check if error boundary is currently active; if so, reload page and re-enter admin
    const isCurrentlyCrashed = await evalJs(`
      document.body.innerText.includes('Portal Display Notice') || document.body.innerText.includes('Reload Portal View')
    `);

    if (isCurrentlyCrashed) {
      console.log('-> Recovering from ErrorBoundary crash before testing tab ' + t.id + '...');
      await cdp('Page.navigate', { url: 'https://shribalajikripadham.online/ecommerce-demo/' });
      await new Promise(r => setTimeout(r, 3500));
      await evalJs(`
        (() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const adminBtn = buttons.find(b => b.innerText.includes('Super Admin'));
          if (adminBtn) adminBtn.click();
        })()
      `);
      await new Promise(r => setTimeout(r, 2500));
    }

    const excCountBefore = exceptions.length;

    // Click the tab button
    const clickRes = await evalJs(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => {
          const s = b.querySelector('span');
          return s && s.innerText.trim().toLowerCase() === '${t.span.toLowerCase()}';
        }) || buttons.find(b => b.innerText.toLowerCase().includes('${t.span.toLowerCase()}'));
        if (btn) {
          btn.click();
          return { found: true };
        }
        return { found: false };
      })()
    `);

    // Wait for render
    await new Promise(r => setTimeout(r, 800));

    const state = await evalJs(`
      (() => {
        const isErrorBoundary = document.body.innerText.includes('Portal Display Notice') || document.body.innerText.includes('Reload Portal View');
        const main = document.querySelector('main');
        const text = main ? main.innerText.substring(0, 300).replace(/\\n/g, ' ') : '';
        const modal = document.querySelector('[role="dialog"], .fixed.inset-0');
        const modalText = modal ? modal.innerText.substring(0, 200).replace(/\\n/g, ' ') : '';

        // If modal was opened, close it
        if (modal) {
          const xBtn = Array.from(modal.querySelectorAll('button')).find(b => b.innerText.includes('Close') || b.innerText.includes('✕') || b.querySelector('svg'));
          if (xBtn) xBtn.click();
        }

        return {
          isErrorBoundary,
          content: modalText || text
        };
      })()
    `);

    const newExcs = exceptions.length - excCountBefore;
    const passed = clickRes.found && !state.isErrorBoundary && newExcs === 0;

    console.log('[Tab ' + (i + 1) + '/54] ' + t.id + ' -> ' + (passed ? '✅ PASS' : '❌ FAIL') + (state.isErrorBoundary ? ' (ERROR BOUNDARY CRASH)' : '') + (!clickRes.found ? ' (BTN NOT FOUND)' : '') + ' [Exc: ' + newExcs + ']');

    tabResults.push({
      tabNumber: i + 1,
      id: t.id,
      span: t.span,
      found: clickRes.found,
      passed,
      crashed: state.isErrorBoundary,
      newExceptions: newExcs,
      contentSnippet: state.content.substring(0, 150)
    });
  }

  fs.writeFileSync('isolated_tab_audit_results.json', JSON.stringify(tabResults, null, 2));

  const totalPassed = tabResults.filter(t => t.passed).length;
  const totalCrashed = tabResults.filter(t => t.crashed).length;
  const totalNotFound = tabResults.filter(t => !t.found).length;

  console.log('\n======================================================');
  console.log('ISOLATED TAB AUDIT COMPLETE');
  console.log('Passed: ' + totalPassed + ' / 54');
  console.log('Crashed (ErrorBoundary): ' + totalCrashed);
  console.log('Not Found: ' + totalNotFound);
  console.log('Total Exceptions: ' + exceptions.length);
  console.log('======================================================\n');

  ws.close();
  browser.kill();
  process.exit(0);
}

testAllTabsIsolated().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
