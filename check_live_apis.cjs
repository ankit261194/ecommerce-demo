const https = require('https');

async function testApi(name, url, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`[${name}] HTTP ${res.statusCode}: Success: ${json.success}, Type: ${typeof json.data}, IsArray: ${Array.isArray(json.data)}, Sample: ${JSON.stringify(json.data).slice(0, 140)}`);
        } catch(e) {
          console.log(`[${name}] Parse Error: ${data.slice(0, 200)}`);
        }
        resolve();
      });
    });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  await testApi('tax/settings', 'https://shribalajikripadham.online/ecommerce-demo/api/admin/tax/settings');
  await testApi('cod-vault/summary', 'https://shribalajikripadham.online/ecommerce-demo/api/cod-vault/summary');
  await testApi('commission/simulate', 'https://shribalajikripadham.online/ecommerce-demo/api/commission/simulate', 'POST', { amount: 5000 });
  await testApi('escrow/radar', 'https://shribalajikripadham.online/ecommerce-demo/api/admin/escrow/radar');
  await testApi('install/check-requirements', 'https://shribalajikripadham.online/ecommerce-demo/api/install/check-requirements');
  await testApi('delivery/tasks', 'https://shribalajikripadham.online/ecommerce-demo/api/delivery/tasks');
})();
