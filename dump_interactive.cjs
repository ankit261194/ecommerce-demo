const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('./backend/node_modules/ws');

async function dumpInteractive() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const port = 9888;
  const browser = spawn(edgePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--user-data-dir=C:\\temp\\edge_interactive_profile',
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

  await new Promise(r => setTimeout(r, 4000));

  const result = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const root = document.getElementById('root');
        const buttons = Array.from(root.getElementsByTagName('button')).map((b, i) => ({
          i,
          text: b.textContent.trim().replace(/\\s+/g, ' '),
          classes: b.className
        }));
        return {
          buttonCount: buttons.length,
          sampleButtons: buttons.slice(0, 15)
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Buttons Dump:', JSON.stringify(result.result?.value, null, 2));

  // Click the first button that has 'Launch' or 'Storefront'
  const clickTest = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const root = document.getElementById('root');
        const buttons = Array.from(root.getElementsByTagName('button'));
        // Find button containing Launch
        const btn = buttons.find(b => b.textContent.includes('Launch') || b.textContent.includes('Store'));
        if (btn) {
          btn.click();
          return 'Clicked button: ' + btn.textContent.trim().replace(/\\s+/g, ' ');
        }
        return 'No button with Launch or Store found';
      })()
    `,
    returnByValue: true
  });

  console.log('Click Test:', clickTest.result?.value);

  await new Promise(r => setTimeout(r, 4000));

  const afterClickDump = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const root = document.getElementById('root');
        const buttons = Array.from(root.getElementsByTagName('button')).map(b => b.textContent.trim().replace(/\\s+/g, ' '));
        return {
          buttonsAfterClick: buttons.slice(0, 15),
          bodySnippet: document.body.innerText.substring(0, 300).replace(/\\n/g, ' ')
        };
      })()
    `,
    returnByValue: true
  });

  console.log('After Click:', JSON.stringify(afterClickDump.result?.value, null, 2));

  ws.close();
  browser.kill();
  process.exit(0);
}

dumpInteractive().catch(console.error);
