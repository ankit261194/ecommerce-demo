import os
import shutil

root_dir = os.path.dirname(os.path.abspath(__file__))
dist_assets_dir = os.path.join(root_dir, 'frontend', 'dist', 'assets')
demo_dir = os.path.join(root_dir, 'ecommerce-demo')
demo_assets_dir = os.path.join(demo_dir, 'assets')

os.makedirs(demo_assets_dir, exist_ok=True)

# Clean old demo assets
for fname in os.listdir(demo_assets_dir):
    try:
        os.remove(os.path.join(demo_assets_dir, fname))
    except Exception:
        pass

files = os.listdir(dist_assets_dir)
js_file = next((f for f in files if f.endswith('.js')), None)
css_file = next((f for f in files if f.endswith('.css')), None)

if not js_file or not css_file:
    raise RuntimeError("JS or CSS bundle missing in frontend/dist/assets!")

# Copy assets to demo
shutil.copy2(os.path.join(dist_assets_dir, js_file), os.path.join(demo_assets_dir, js_file))
shutil.copy2(os.path.join(dist_assets_dir, css_file), os.path.join(demo_assets_dir, css_file))

with open(os.path.join(dist_assets_dir, js_file), 'r', encoding='utf-8') as f:
    js_content = f.read()

with open(os.path.join(dist_assets_dir, css_file), 'r', encoding='utf-8') as f:
    css_content = f.read()

html_content = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23F59E0B'><path d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'/></svg>" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AuraMarket — The Next-Gen Multi-Vendor Commerce Platform</title>
    <meta name="description" content="Discover top electronics, audio, fashion, and lifestyle brands from verified merchants with express delivery and OTP verification." />
    <meta name="keywords" content="ecommerce, multi-vendor marketplace, online shopping, electronics, fashion, split orders" />
    <link rel="canonical" href="https://shribalajikripadham.online/ecommerce-demo/" />

    <!-- Open Graph Social Media Previews (WhatsApp, Facebook, LinkedIn) -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content="AuraMarket — The Next-Gen Multi-Vendor Commerce Platform" />
    <meta property="og:description" content="Discover top electronics, audio, fashion, and lifestyle brands from verified merchants with express delivery and OTP verification." />
    <meta property="og:image" content="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80" />
    <meta property="og:url" content="https://shribalajikripadham.online/ecommerce-demo/" />
    <meta property="og:site_name" content="AuraMarket" />

    <!-- Twitter / X Card Tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="AuraMarket — The Next-Gen Multi-Vendor Commerce Platform" />
    <meta name="twitter:description" content="Discover top electronics, audio, fashion, and lifestyle brands from verified merchants with express delivery and OTP verification." />
    <meta name="twitter:image" content="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80" />

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <script type="module">
{js_content}
    </script>
    <style>
{css_content}
    </style>
  </head>
  <body class="bg-slate-50 text-slate-900 antialiased min-h-screen">
    <div id="root"></div>
  </body>
</html>
"""

with open(os.path.join(demo_dir, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(html_content)

# Generate static sitemap.xml and robots.txt in demo and root
sitemap_xml = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://shribalajikripadham.online/ecommerce-demo/</loc>
    <lastmod>2026-10-13</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://shribalajikripadham.online/ecommerce-demo/products</loc>
    <lastmod>2026-10-13</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://shribalajikripadham.online/ecommerce-demo/category/electronics-audio</loc>
    <lastmod>2026-10-13</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://shribalajikripadham.online/ecommerce-demo/category/watches-accessories</loc>
    <lastmod>2026-10-13</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://shribalajikripadham.online/ecommerce-demo/category/fashion-apparel</loc>
    <lastmod>2026-10-13</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://shribalajikripadham.online/ecommerce-demo/category/home-living</loc>
    <lastmod>2026-10-13</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://shribalajikripadham.online/ecommerce-demo/product/aura-pro-anc-headphones</loc>
    <lastmod>2026-10-13</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://shribalajikripadham.online/ecommerce-demo/product/aerowatch-s9-ultra</loc>
    <lastmod>2026-10-13</lastmod>
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

print("[OK] Single-file bundle and SEO assets created successfully!")
