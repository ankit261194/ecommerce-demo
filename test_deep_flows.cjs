const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('./backend/node_modules/ws');

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
    } catch (e) {}
    await new Promise(r => setTimeout(r, delay));
  }
  throw new Error(`Port ${port} did not respond`);
}

async function testDeepFlows() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const port = 9556;
  const userDataDir = 'C:\\temp\\edge_deep_flow_profile';

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
        console.error(' [EXCEPTION THROWN]:', desc);
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

  // --- 1. Test DemoHub OTP flow ---
  console.log('\n--- 1. Testing DemoHub OTP Flow ---');
  const otpFlowResult = await evalJs(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const otpTab = buttons.find(b => b.innerText.includes('OTP Instant Login') || b.innerText.includes('OTP Login'));
      if (otpTab) otpTab.click();
      return { clickedOtpTab: !!otpTab };
    })()
  `);
  await new Promise(r => setTimeout(r, 800));

  const clickGetOtp = await evalJs(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const getOtpBtn = buttons.find(b => b.innerText.trim() === 'Get OTP');
      if (getOtpBtn) {
        getOtpBtn.click();
        return { clickedGetOtp: true };
      }
      return { clickedGetOtp: false };
    })()
  `);
  await new Promise(r => setTimeout(r, 800));

  const otpStatus = await evalJs(`
    (() => {
      const body = document.body.innerText;
      const verifyBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Verify OTP & Sign In'));
      return {
        hasSmsMessage: body.includes('OTP Dispatched via connected SMS Gateway') || body.includes('4821'),
        hasVerifyButton: !!verifyBtn
      };
    })()
  `);
  console.log('DemoHub OTP Flow Result:', { otpFlowResult, clickGetOtp, otpStatus });

  // --- 2. Test Customer Storefront Checkout & OTP Handover Flow ---
  console.log('\n--- 2. Testing Customer Storefront Checkout & 4-Digit Handover OTP ---');
  // Click Storefront
  await evalJs(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Storefront') && !b.innerText.includes('Vendor'));
      if (btn) btn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 3500));

  // Add first product to cart directly
  const addCartAction = await evalJs(`
    (() => {
      // Find the first Add to Cart button on the product grid
      const addBtns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('Add to Cart') || b.innerText.includes('Add'));
      if (addBtns.length > 0) {
        addBtns[0].click();
        return { clickedAdd: true, text: addBtns[0].innerText };
      }
      return { clickedAdd: false };
    })()
  `);
  console.log('Add to cart action:', addCartAction);
  await new Promise(r => setTimeout(r, 2000));

  // Check Cart & Proceed to Checkout
  const clickCheckout = await evalJs(`
    (() => {
      const checkoutBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Proceed to Checkout') || b.innerText.includes('Checkout'));
      if (checkoutBtn) {
        checkoutBtn.click();
        return { clickedCheckout: true };
      }
      return { clickedCheckout: false };
    })()
  `);
  console.log('Click Checkout:', clickCheckout);
  await new Promise(r => setTimeout(r, 3000));

  // Place Order
  const placeOrder = await evalJs(`
    (() => {
      const placeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Place Order') || b.innerText.includes('Confirm Order') || b.innerText.includes('Book Delivery'));
      if (placeBtn) {
        placeBtn.click();
        return { clickedPlace: true, text: placeBtn.innerText };
      }
      return { clickedPlace: false };
    })()
  `);
  console.log('Place Order:', placeOrder);
  await new Promise(r => setTimeout(r, 3500));

  // Inspect confirmation modal
  const confirmationCheck = await evalJs(`
    (() => {
      const body = document.body.innerText;
      const hasOrderPlaced = body.includes('Order Placed Successfully!') || body.includes('Order Confirmed');
      const hasOtp = body.includes('4821');
      const hasVikram = body.includes('Vikram Singh');
      const hasScratchCard = body.includes('Scratch Card');
      const hasInvoicePdf = body.includes('GST Invoice (PDF)');
      return {
        hasOrderPlaced,
        hasOtp,
        hasVikram,
        hasScratchCard,
        hasInvoicePdf,
        snippet: body.substring(body.indexOf('Order Placed') !== -1 ? body.indexOf('Order Placed') : 0, 500).replace(/\\n/g, ' ')
      };
    })()
  `);
  console.log('Order Confirmation Check:', confirmationCheck);

  // --- 3. Test 1-Click Web GUI Installer Steps 1-4 ---
  console.log('\n--- 3. Testing 1-Click Web GUI Installer Steps 1 to 4 ---');
  await evalJs(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Web Installer') || b.innerText.includes('Installer'));
      if (btn) btn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 3500));

  // Step 1: Click "Check Server Requirements"
  const step1Adv = await evalJs(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Check Server Requirements'));
      if (btn) {
        btn.click();
        return { clickedStep1: true };
      }
      return { clickedStep1: false };
    })()
  `);
  console.log('Installer Step 1 -> Step 2:', step1Adv);
  await new Promise(r => setTimeout(r, 2000));

  // Step 2: Check server audit & click "Configure Database"
  const step2Adv = await evalJs(`
    (() => {
      const body = document.body.innerText;
      const hasAudit = body.includes('Server Environment & Compatibility Audit') || body.includes('Node.js Runtime');
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Configure Database'));
      let clicked = false;
      if (btn && !btn.disabled) {
        btn.click();
        clicked = true;
      }
      return { hasAudit, hasConfigureDbBtn: !!btn, clicked };
    })()
  `);
  console.log('Installer Step 2 -> Step 3:', step2Adv);
  await new Promise(r => setTimeout(r, 2000));

  // Step 3: Database Configuration & Test Connection
  const step3Check = await evalJs(`
    (() => {
      const body = document.body.innerText;
      const hasDbScreen = body.includes('Database Configuration & Connection Test');
      const testDbBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Test Database Connection'));
      let clickedDb = false;
      if (testDbBtn) {
        testDbBtn.click();
        clickedDb = true;
      }
      return { hasDbScreen, hasTestDbBtn: !!testDbBtn, clickedDb };
    })()
  `);
  console.log('Installer Step 3 Test DB:', step3Check);
  await new Promise(r => setTimeout(r, 2500));

  const dbTestResult = await evalJs(`
    (() => {
      const body = document.body.innerText;
      return {
        dbOutput: body.includes('Connection Successful') || body.includes('Database Connected') || body.includes('Latency') || body.includes('Fallback'),
        snippet: body.substring(0, 300).replace(/\\n/g, ' ')
      };
    })()
  `);
  console.log('Installer DB Test Result:', dbTestResult);

  // --- 4. Final Verification Check ---
  console.log('\n======================================================');
  console.log('DEEP FLOW TESTS COMPLETED');
  console.log('Total Unhandled Runtime Exceptions Caught:', exceptions.length);
  if (exceptions.length > 0) {
    exceptions.forEach((e, i) => console.log(` [${i+1}] ${e}`));
  } else {
    console.log('ZERO EXCEPTIONS ENCOUNTERED ACROSS ALL FLOWS!');
  }
  console.log('======================================================');

  ws.close();
  browser.kill();
  process.exit(0);
}

testDeepFlows().catch(console.error);
