const https = require('https');

https.get('https://shribalajikripadham.online/ecommerce-demo/', (res) => {
  console.log('Root HTTP Status:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('HTML Length:', data.length);
    const scriptMatches = data.match(/src="([^"]+)"/g);
    console.log('Assets in index.html:', scriptMatches);
  });
});
