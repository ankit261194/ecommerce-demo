const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('./backend/node_modules/ws');

async function testPortals() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const port = 9333;
  
  console.log('Spawning headless Edge on port', port);
  const browser = spawn(edgePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--user-data-dir=C:\\temp\\edge_dev_profile',
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
  console.log('Target Page WS URL:', page.webSocketDebuggerUrl);

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
    console.log('WS Connected');
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Console.enable');

    console.log('Navigating to https://shribalajikripadham.online/ecommerce-demo/ ...');
    await send('Page.navigate', { url: 'https://shribalajikripadham.online/ecommerce-demo/' });
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.id && callbacks.has(msg.id)) {
      callbacks.get(msg.id)(msg.result);
      callbacks.delete(msg.id);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('*** CDP RUNTIME EXCEPTION ***:', msg.params.exceptionDetails);
      errors.push(msg.params.exceptionDetails);
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map(a => a.value || JSON.stringify(a)).join(' ');
      logs.push(text);
      if (msg.params.type === 'error') {
        console.error('*** CDP CONSOLE ERROR ***:', text);
      }
    }
  });

  // Wait 5 seconds for page load
  await new Promise(r => setTimeout(r, 5000));

  console.log('--- Step 1: Check DemoHub Title ---');
  let titleRes = await send('Runtime.evaluate', {
    expression: 'document.title'
  });
  console.log('Title:', titleRes.result?.value);

  let bodyText = await send('Runtime.evaluate', {
    expression: 'document.body.innerText.substring(0, 300)'
  });
  console.log('Body start:', bodyText.result?.value?.replace(/\n/g, ' '));

  console.log('--- Step 2: Click on "Customer Web Storefront & PWA" / Launch Storefront Demo ---');
  let clickRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const customerBtn = buttons.find(b => b.innerText && (b.innerText.includes('Launch Storefront Demo') || b.innerText.includes('Storefront')));
        if (customerBtn) {
          customerBtn.click();
          return 'Clicked: ' + customerBtn.innerText;
        }
        return 'Not found';
      })()
    `
  });
  console.log('Customer Click Result:', clickRes.result?.value);

  await new Promise(r => setTimeout(r, 3000));

  let storefrontCheck = await send('Runtime.evaluate', {
    expression: `
      (() => {
        return {
          textSnippet: document.body.innerText.substring(0, 400).replace(/\\n/g, ' '),
          productCount: document.querySelectorAll('[data-product-card], .group').length,
          hasErrorBoundary: !!document.querySelector('.text-rose-500, [role="alert"]'),
          innerHtmlLength: document.getElementById('root')?.innerHTML?.length
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Storefront State after click:', storefrontCheck.result?.value);

  console.log('--- Step 3: Switch to Super Admin Dashboard ---');
  let adminClickRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const adminBtn = buttons.find(b => b.innerText && b.innerText.includes('Super Admin'));
        if (adminBtn) {
          adminBtn.click();
          return 'Clicked Super Admin: ' + adminBtn.innerText;
        }
        return 'Admin button not found';
      })()
    `
  });
  console.log('Admin Click Result:', adminClickRes.result?.value);

  await new Promise(r => setTimeout(r, 3000));

  let adminCheck = await send('Runtime.evaluate', {
    expression: `
      (() => {
        return {
          textSnippet: document.body.innerText.substring(0, 400).replace(/\\n/g, ' '),
          innerHtmlLength: document.getElementById('root')?.innerHTML?.length
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Admin State after click:', adminCheck.result?.value);

  console.log('--- Step 4: Switch to Vendor Portal ---');
  let vendorClickRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const vendorBtn = buttons.find(b => b.innerText && b.innerText.includes('Vendor Portal'));
        if (vendorBtn) {
          vendorBtn.click();
          return 'Clicked Vendor: ' + vendorBtn.innerText;
        }
        return 'Vendor button not found';
      })()
    `
  });
  console.log('Vendor Click Result:', vendorClickRes.result?.value);

  await new Promise(r => setTimeout(r, 3000));

  let vendorCheck = await send('Runtime.evaluate', {
    expression: `
      (() => {
        return {
          textSnippet: document.body.innerText.substring(0, 400).replace(/\\n/g, ' '),
          innerHtmlLength: document.getElementById('root')?.innerHTML?.length
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Vendor State after click:', vendorCheck.result?.value);

  console.log('\n--- Final Exceptions Caught:', errors.length);
  errors.forEach(e => console.log('EXC:', e.text, e.exception?.description));

  ws.close();
  browser.kill();
  process.exit(0);
}

testPortals().catch(err => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
