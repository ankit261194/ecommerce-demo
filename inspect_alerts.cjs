const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('./backend/node_modules/ws');

async function inspectAlerts() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const port = 9234;
  const browser = spawn(edgePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--user-data-dir=C:\\temp\\edge_alerts_profile',
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
  });

  await new Promise(r => setTimeout(r, 5000));

  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('1-Click Launch Store'));
        if (btn) btn.click();
      })()
    `
  });

  await new Promise(r => setTimeout(r, 5000));

  const alertCheck = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const alerts = Array.from(document.querySelectorAll('[role="alert"], .text-rose-500, div[class*="ErrorBoundary"]')).map(el => ({
          tag: el.tagName,
          className: el.className,
          text: el.innerText.trim()
        }));
        return {
          alerts,
          isFullPageError: !!document.querySelector('h3')?.innerText?.includes('Portal Display Notice')
        };
      })()
    `,
    returnByValue: true
  });

  console.log('ALERT CHECK RESULT:', JSON.stringify(alertCheck.result?.value, null, 2));

  ws.close();
  browser.kill();
  process.exit(0);
}

inspectAlerts().catch(console.error);
