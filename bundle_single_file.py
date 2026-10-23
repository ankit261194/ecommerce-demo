import os
import shutil

root_dir = os.path.dirname(os.path.abspath(__file__))
dist_dir = os.path.join(root_dir, 'frontend', 'dist')
demo_dir = os.path.join(root_dir, 'ecommerce-demo')
demo_assets_dir = os.path.join(demo_dir, 'assets')

if not os.path.exists(dist_dir):
    raise RuntimeError("frontend/dist does not exist! Please run 'npm run build' in frontend first.")

os.makedirs(demo_dir, exist_ok=True)

# Copy all built assets from frontend/dist to ecommerce-demo
if os.path.exists(demo_assets_dir):
    shutil.rmtree(demo_assets_dir)

dist_assets_dir = os.path.join(dist_dir, 'assets')
if os.path.exists(dist_assets_dir):
    shutil.copytree(dist_assets_dir, demo_assets_dir)

# Copy root dist files (index.html, manifest.json, sw.js, etc.)
for fname in os.listdir(dist_dir):
    src_path = os.path.join(dist_dir, fname)
    if os.path.isfile(src_path):
        shutil.copy2(src_path, os.path.join(demo_dir, fname))

# Generate static sitemap.xml and robots.txt in demo and root
sitemap_xml = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://shribalajikripadham.online/ecommerce-demo/</loc>
    <lastmod>2026-10-23</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://shribalajikripadham.online/ecommerce-demo/products</loc>
    <lastmod>2026-10-23</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://shribalajikripadham.online/ecommerce-demo/category/electronics-audio</loc>
    <lastmod>2026-10-23</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://shribalajikripadham.online/ecommerce-demo/category/watches-accessories</loc>
    <lastmod>2026-10-23</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://shribalajikripadham.online/ecommerce-demo/category/fashion-apparel</loc>
    <lastmod>2026-10-23</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://shribalajikripadham.online/ecommerce-demo/category/home-living</loc>
    <lastmod>2026-10-23</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://shribalajikripadham.online/ecommerce-demo/product/aura-pro-anc-headphones</loc>
    <lastmod>2026-10-23</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://shribalajikripadham.online/ecommerce-demo/product/aerowatch-s9-ultra</loc>
    <lastmod>2026-10-23</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>"""

robots_txt = """User-agent: *
Allow: /
Disallow: /api/admin
Disallow: /admin

Sitemap: https://shribalajikripadham.online/ecommerce-demo/sitemap.xml
"""

with open(os.path.join(demo_dir, 'sitemap.xml'), 'w', encoding='utf-8') as f:
    f.write(sitemap_xml)

with open(os.path.join(demo_dir, 'robots.txt'), 'w', encoding='utf-8') as f:
    f.write(robots_txt)

with open(os.path.join(root_dir, 'sitemap.xml'), 'w', encoding='utf-8') as f:
    f.write(sitemap_xml)

with open(os.path.join(root_dir, 'robots.txt'), 'w', encoding='utf-8') as f:
    f.write(robots_txt)

copied_chunks = len(os.listdir(demo_assets_dir)) if os.path.exists(demo_assets_dir) else 0
print(f"[OK] Full production build synced to ecommerce-demo with {copied_chunks} asset chunks!")
