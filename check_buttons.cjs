const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('./backend/node_modules/ws');

async function checkButtons() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const port = 9555;
  
  const browser = spawn(edgePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--user-data-dir=C:\\temp\\edge_btn_profile',
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

  ws.on('open', async () => {
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Page.navigate', { url: 'https://shribalajikripadham.online/ecommerce-demo/' });
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.id && callbacks.has(msg.id)) {
      callbacks.get(msg.id)(msg.result);
      callbacks.delete(msg.id);
    }
  });

  await new Promise(r => setTimeout(r, 4000));

  const allButtons = await send('Runtime.evaluate', {
    expression: `
      Array.from(document.querySelectorAll('button, a')).map(el => ({
        tag: el.tagName,
        text: el.innerText.trim(),
        onclick: !!el.onclick
      }))
    `,
    returnByValue: true
  });

  console.log('ALL BUTTONS/LINKS:', allButtons.result?.value);

  // Now trigger onSelectPortal('customer', 'desktop') or click the first button inside Customer card
  const clickCustomerCard = await send('Runtime.evaluate', {
    expression: `
      (() => {
        // Find the portal card for Customer Web Storefront & PWA
        const headings = Array.from(document.querySelectorAll('h2, h3, h4'));
        const customerHeading = headings.find(h => h.innerText.includes('Customer Web Storefront'));
        if (customerHeading) {
          const card = customerHeading.closest('.rounded-3xl, .rounded-2xl, div[class*="rounded"]');
          const btn = card?.querySelector('button');
          if (btn) {
            btn.click();
            return 'Clicked button inside Customer Card: ' + btn.innerText;
          }
        }
        return 'Card or button not found';
      })()
    `,
    returnByValue: true
  });

  console.log('Click Customer Card Result:', clickCustomerCard.result?.value);

  await new Promise(r => setTimeout(r, 4000));

  const afterClick = await send('Runtime.evaluate', {
    expression: `
      (() => {
        return {
          h1s: Array.from(document.querySelectorAll('h1, h2')).map(h => h.innerText.trim()),
          textPreview: document.body.innerText.substring(0, 400).replace(/\\n/g, ' '),
          productTitles: Array.from(document.querySelectorAll('h3, h4')).map(h => h.innerText.trim()).filter(t => t.includes('Aura') || t.includes('Smartwatch') || t.includes('Hoodie'))
        };
      })()
    `,
    returnByValue: true
  });

  console.log('After Customer Click Snapshot:', afterClick.result?.value);

  ws.close();
  browser.kill();
  process.exit(0);
}

checkButtons().catch(console.error);
