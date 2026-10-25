const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('./backend/node_modules/ws');

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

async function testStorefrontModals() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const port = 9444;
  const userDataDir = 'C:\\temp\\edge_storefront_modals_profile';

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
        console.error(' [EXCEPTION]:', desc);
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

  // Switch to Storefront
  await evalJs(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Storefront') && !b.innerText.includes('Vendor'));
      if (btn) btn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 3500));

  // 1. Test Category filters
  console.log('Testing category buttons...');
  const catRes = await evalJs(`
    (() => {
      const catButtons = Array.from(document.querySelectorAll('button')).filter(b => {
        const t = b.innerText.trim();
        return ['Electronics & Audio', 'Fashion & Apparel', 'Watches & Wearables', 'Home & Kitchen'].includes(t);
      });
      let clicked = 0;
      for (const cb of catButtons) {
        cb.click();
        clicked++;
      }
      return { foundCount: catButtons.length, clicked };
    })()
  `);
  console.log('Category buttons:', catRes);

  // 2. Click All Products reset
  await evalJs(`
    (() => {
      const allBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'All Products');
      if (allBtn) allBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 800));

  // 3. Test Brand filter buttons
  console.log('Testing brand filters...');
  const brandRes = await evalJs(`
    (() => {
      const brandButtons = Array.from(document.querySelectorAll('button')).filter(b => {
        const t = b.innerText.trim();
        return ['AuraAudio', 'AeroTech', 'Vogue Urban', 'AuraHome'].includes(t);
      });
      return { foundCount: brandButtons.length };
    })()
  `);
  console.log('Brand filters:', brandRes);

  // 4. Test Wishlist toggle on first card
  console.log('Testing wishlist toggle...');
  const wishlistRes = await evalJs(`
    (() => {
      const heartBtn = document.querySelector('button[title*="Wishlist" i], button:has(svg.lucide-heart)');
      if (heartBtn) {
        heartBtn.click();
        return { clickedHeart: true };
      }
      return { clickedHeart: false };
    })()
  `);
  console.log('Wishlist toggle:', wishlistRes);

  // 5. Open Product Detail Modal
  console.log('Testing ProductDetailModal...');
  const openModal = await evalJs(`
    (() => {
      const firstCard = document.querySelector('.group');
      if (firstCard) {
        firstCard.click();
        return { clickedCard: true };
      }
      return { clickedCard: false };
    })()
  `);
  await new Promise(r => setTimeout(r, 1500));

  // Check detail modal contents
  const modalInspection = await evalJs(`
    (() => {
      const modal = document.querySelector('[role="dialog"], .fixed.inset-0');
      if (!modal) return { modalFound: false };
      const text = modal.innerText;
      return {
        modalFound: true,
        hasPincodeChecker: text.includes('Delivery & Pincode') || text.includes('Check Pincode') || text.includes('110001'),
        hasReviewsTab: text.includes('Reviews') || text.includes('Customer Reviews'),
        hasSpecsTab: text.includes('Specifications') || text.includes('Specs'),
        hasEmiBtn: text.includes('EMI') || text.includes('No Cost EMI'),
        hasVariants: text.includes('Color:') || text.includes('Size:') || text.includes('Variant')
      };
    })()
  `);
  console.log('Product Detail Modal Inspection:', modalInspection);

  // Close modal
  await evalJs(`
    (() => {
      const closeBtn = document.querySelector('[role="dialog"] button:has(svg.lucide-x), .fixed.inset-0 button:has(svg.lucide-x)');
      if (closeBtn) closeBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 800));

  console.log('\nStorefront Modals Test Complete! Exceptions:', exceptions.length);
  ws.close();
  browser.kill();
  process.exit(0);
}

testStorefrontModals().catch(err => {
  console.error(err);
  process.exit(1);
});
