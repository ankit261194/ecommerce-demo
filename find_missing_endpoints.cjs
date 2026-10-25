const fs = require('fs');
const path = require('path');

function walk(dir) {
  let files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) files = files.concat(walk(full));
    else if (full.endsWith('.jsx') || full.endsWith('.js')) files.push(full);
  }
  return files;
}

const files = walk('frontend/src');
const apiCalls = new Set();
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const re = /api\.(get|post|put|delete|patch)\((['"`])([^'"`]+)\2/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    let route = m[3].split('?')[0];
    apiCalls.add(route);
  }
});

console.log('Total unique API routes called by frontend:', apiCalls.size);
const phpContent = fs.readFileSync('ecommerce-demo/api/index.php', 'utf8');
const missing = [];
for (const r of apiCalls) {
  let clean = r.replace(/\$\{[^}]+\}/g, '').trim();
  if (clean && !phpContent.includes(clean)) {
    missing.push(clean);
  }
}

console.log('Routes called by frontend but NOT explicitly handled in index.php (' + missing.length + '):');
missing.sort().forEach((m, i) => console.log((i + 1) + '. ' + m));
