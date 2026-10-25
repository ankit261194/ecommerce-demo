const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('./backend/node_modules/ws');

async function testStorefrontLive() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const port = 9123;
  const browser = spawn(edgePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--user-data-dir=C:\\temp\\edge_storefront_live_test',
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

  console.log('--- Waiting for "1-Click Launch Store" button to appear ---');
  let clickStore = null;
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));
    clickStore = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const btn = buttons.find(b => b.textContent.includes('1-Click Launch Store') || b.textContent.includes('Launch Storefront Demo'));
          if (btn) {
            btn.click();
            return 'Found and clicked: ' + btn.textContent.trim().replace(/\\s+/g, ' ');
          }
          return null;
        })()
      `,
      returnByValue: true
    });
    if (clickStore.result?.value) {
      console.log(`[Attempt ${i+1}] ${clickStore.result.value}`);
      break;
    }
  }

  // Wait 6s for CustomerStorefront to load & render
  await new Promise(r => setTimeout(r, 6000));

  const pageSnapshot = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5')).map(h => h.textContent.trim()).filter(Boolean);
        const productTitles = Array.from(document.querySelectorAll('h3')).map(h => h.textContent.trim()).filter(t => t.includes('Aura') || t.includes('AeroWatch') || t.includes('Hoodie') || t.includes('Blazer') || t.includes('Titanium'));
        const prices = Array.from(document.querySelectorAll('span, p, div')).map(e => e.textContent.trim()).filter(t => t.startsWith('₹') && t.length < 15);
        return {
          currentTitle: document.title,
          headings: headings.slice(0, 15),
          productTitles: productTitles,
          samplePrices: prices.slice(0, 10),
          htmlLength: document.getElementById('root')?.innerHTML?.length,
          hasErrorBoundaryMessage: !!document.querySelector('.text-rose-500, [role="alert"]')
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Storefront DOM Snapshot:', JSON.stringify(pageSnapshot.result?.value, null, 2));
  console.log('Total Runtime Exceptions caught:', errors.length);

  ws.close();
  browser.kill();
  process.exit(0);
}

testStorefrontLive().catch(console.error);
