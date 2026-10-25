const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('./backend/node_modules/ws');

async function testAdminView() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const port = 9999;
  const browser = spawn(edgePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--user-data-dir=C:\\temp\\edge_admin_inspect_profile',
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

  // Wait 5 seconds for DemoHub to load
  await new Promise(r => setTimeout(r, 5000));

  // Click 1-Click Launch Admin
  const clickRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.innerText.includes('1-Click Launch Admin'));
        if (btn) {
          btn.click();
          return 'Clicked 1-Click Launch Admin!';
        }
        return 'Not found';
      })()
    `,
    returnByValue: true
  });
  console.log(clickRes.result?.value);

  // Wait 4 seconds for SuperAdminDashboard to load and render
  await new Promise(r => setTimeout(r, 4000));

  const adminDOM = await send('Runtime.evaluate', {
    expression: `
      (() => {
        // Collect all sidebar navigation items or tabs
        const navButtons = Array.from(document.querySelectorAll('button, a, nav *')).map(el => el.innerText?.trim()).filter(Boolean);
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(el => el.innerText?.trim()).filter(Boolean);
        return {
          headings: headings.slice(0, 15),
          navSample: navButtons.slice(0, 25),
          bodySnippet: document.body.innerText.substring(0, 600).replace(/\\n/g, ' ')
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Super Admin Rendered Content:', JSON.stringify(adminDOM.result?.value, null, 2));

  ws.close();
  browser.kill();
  process.exit(0);
}

testAdminView().catch(console.error);
