const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('./backend/node_modules/ws');

async function testStorefrontClick() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const port = 9777;
  const browser = spawn(edgePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--user-data-dir=C:\\temp\\edge_storefront_profile',
    'about:blank'
  ]);
  await new Promise(r => setTimeout(r, 2000));
  const listRes = await new Promise(res => http.get(`http://127.0.0.1:${port}/json/list`, r => {
    let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
  }));
  const page = listRes.find(p => p.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 1;
  const callbacks = new Map();
  function send(method, params = {}) {
    return new Promise(resolve => {
      const msgId = id++;
      callbacks.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  const errors = [];
  ws.on('open', async () => {
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Page.navigate', { url: 'https://shribalajikripadham.online/ecommerce-demo/' });
  });

  ws.on('message', data => {
    const msg = JSON.parse(data);
    if (msg.id && callbacks.has(msg.id)) {
      callbacks.get(msg.id)(msg.result);
      callbacks.delete(msg.id);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('*** RUNTIME EXCEPTION ***:', msg.params.exceptionDetails?.text, msg.params.exceptionDetails?.exception?.description);
      errors.push(msg.params.exceptionDetails);
    }
  });

  await new Promise(r => setTimeout(r, 4000));

  // 1. First go to Admin or directly click customer in DemoHub
  console.log('--- Step 1: Navigating to Super Admin first to get DemoToolbar ---');
  const clickAdmin = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Super Admin'));
        if (btn) { btn.click(); return 'Admin clicked: ' + btn.innerText; }
        return 'Not found';
      })()
    `,
    returnByValue: true
  });
  console.log(clickAdmin.result?.value);

  await new Promise(r => setTimeout(r, 3000));

  // 2. Now click 'Storefront' in the DemoToolbar
  console.log('--- Step 2: Clicking Storefront in DemoToolbar ---');
  const clickStorefront = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.trim() === 'Storefront');
        if (btn) { btn.click(); return 'Storefront button clicked!'; }
        return 'Storefront button not found';
      })()
    `,
    returnByValue: true
  });
  console.log(clickStorefront.result?.value);

  await new Promise(r => setTimeout(r, 4000));

  // 3. Inspect the DOM of CustomerStorefront
  const storefrontDOM = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const products = Array.from(document.querySelectorAll('h3, h4, p, span'))
          .map(el => el.innerText.trim())
          .filter(t => t.includes('Aura') || t.includes('Smartwatch') || t.includes('Hoodie') || t.includes('Blazer') || t.includes('₹8,999') || t.includes('₹4,499'));
        return {
          currentTitle: document.title,
          textStart: document.body.innerText.substring(0, 400).replace(/\\n/g, ' '),
          matchedProducts: products.slice(0, 10),
          htmlLength: document.getElementById('root')?.innerHTML?.length
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Storefront DOM Result:', JSON.stringify(storefrontDOM.result?.value, null, 2));
  console.log('Total Runtime Exceptions caught:', errors.length);

  ws.close();
  browser.kill();
  process.exit(0);
}

testStorefrontClick().catch(console.error);
