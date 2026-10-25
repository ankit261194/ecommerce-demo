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

async function testOtp() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const port = 9557;
  const browser = spawn(edgePath, ['--remote-debugging-port=' + port, '--headless=new', '--user-data-dir=C:\\temp\\edge_otp_prof', 'about:blank']);

  const list = await waitPort(port);
  const ws = new WebSocket(list[0].webSocketDebuggerUrl);
  let id = 1;
  const callbacks = new Map();
  function send(m, p = {}) {
    return new Promise(r => { const i = id++; callbacks.set(i, r); ws.send(JSON.stringify({id: i, method: m, params: p})); });
  }
  ws.on('message', d => { const m = JSON.parse(d); if (m.id && callbacks.has(m.id)) callbacks.get(m.id)(m.result); });
  await new Promise(r => ws.on('open', r));
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: 'https://shribalajikripadham.online/ecommerce-demo/' });
  await new Promise(r => setTimeout(r, 4000));

  // Click '📱 Login with OTP'
  const c1 = await send('Runtime.evaluate', {
    expression: `(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('Login with OTP')); if (b) { b.click(); return 'Clicked: ' + b.innerText; } return 'Not found'; })()`,
    returnByValue: true
  });
  console.log('OTP Tab click:', c1.result?.value);
  await new Promise(r => setTimeout(r, 1000));

  // Click 'Get OTP'
  const c2 = await send('Runtime.evaluate', {
    expression: `(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.trim() === 'Get OTP'); if (b) { b.click(); return 'Clicked Get OTP'; } return 'Not found'; })()`,
    returnByValue: true
  });
  console.log('Get OTP click:', c2.result?.value);
  await new Promise(r => setTimeout(r, 1000));

  // Check state
  const c3 = await send('Runtime.evaluate', {
    expression: `(() => { return { hasCode: document.body.innerText.includes('4821'), hasVerifyBtn: Array.from(document.querySelectorAll('button')).some(x => x.innerText.includes('Verify OTP')) }; })()`,
    returnByValue: true
  });
  console.log('OTP UI state:', c3.result?.value);

  // Click 'Verify OTP & Sign In →'
  const c4 = await send('Runtime.evaluate', {
    expression: `(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('Verify OTP')); if (b) { b.click(); return 'Clicked Verify'; } return 'Not found'; })()`,
    returnByValue: true
  });
  console.log('Verify click:', c4.result?.value);
  await new Promise(r => setTimeout(r, 2000));

  const c5 = await send('Runtime.evaluate', {
    expression: `(() => { return { title: document.title, currentViewHeading: document.querySelector('h1, h2')?.innerText }; })()`,
    returnByValue: true
  });
  console.log('After OTP Login View:', c5.result?.value);

  ws.close();
  browser.kill();
  process.exit(0);
}
testOtp().catch(console.error);
