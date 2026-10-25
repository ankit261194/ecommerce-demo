const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('./backend/node_modules/ws');

async function testCustomerClick() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const port = 9444;
  
  const browser = spawn(edgePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--user-data-dir=C:\\temp\\edge_customer_profile',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const listRes = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}/json/list`, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

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
  const logs = [];

  ws.on('open', async () => {
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Console.enable');
    await send('Page.navigate', { url: 'https://shribalajikripadham.online/ecommerce-demo/' });
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.id && callbacks.has(msg.id)) {
      callbacks.get(msg.id)(msg.result);
      callbacks.delete(msg.id);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('*** RUNTIME EXCEPTION ***:', msg.params.exceptionDetails?.text, msg.params.exceptionDetails?.exception?.description);
      errors.push(msg.params.exceptionDetails);
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map(a => a.value || JSON.stringify(a)).join(' ');
      logs.push(text);
      if (msg.params.type === 'error') {
        console.error('*** CONSOLE ERROR ***:', text);
      }
    }
  });

  // Wait 4 seconds for page load
  await new Promise(r => setTimeout(r, 4000));

  // Find all buttons on page
  const buttonList = await send('Runtime.evaluate', {
    expression: `
      Array.from(document.querySelectorAll('button')).map((b, i) => ({
        index: i,
        text: b.innerText.trim(),
        className: b.className
      }))
    `,
    returnByValue: true
  });
  console.log('Found buttons:', buttonList.result?.value?.filter(b => b.text.includes('Store') || b.text.includes('Customer') || b.text.includes('Buyer') || b.text.includes('Launch')));

  // Click the customer launch button
  const clickRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => 
          b.innerText.includes('1-Click Launch Store') || 
          b.innerText.includes('Launch Storefront Demo') ||
          (b.innerText.includes('Storefront') && b.closest('.bg-white'))
        );
        if (btn) {
          btn.click();
          return 'Clicked button: ' + btn.innerText;
        }
        return 'Not found';
      })()
    `,
    returnByValue: true
  });
  console.log('Click execution:', clickRes.result?.value);

  // Wait 4 seconds for Customer Storefront to load and mount
  await new Promise(r => setTimeout(r, 4000));

  const pageSnapshot = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const h1s = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.innerText);
        const products = Array.from(document.querySelectorAll('h3, h4, p')).map(p => p.innerText).filter(t => t.includes('Aura') || t.includes('₹') || t.includes('Cart'));
        return {
          h1s: h1s.slice(0, 10),
          productsFound: products.slice(0, 10),
          rootChildCount: document.getElementById('root')?.children.length,
          bodySnippet: document.body.innerText.substring(0, 500).replace(/\\n/g, ' ')
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Page Snapshot after Customer click:', JSON.stringify(pageSnapshot.result?.value, null, 2));
  console.log('Total Runtime Exceptions caught:', errors.length);

  ws.close();
  browser.kill();
  process.exit(0);
}

testCustomerClick().catch(console.error);
