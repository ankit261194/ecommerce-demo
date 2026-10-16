const Product = require('../models/Product');
const SocialShareConfig = require('../models/SocialShareConfig');
const AuditLog = require('../models/AuditLog');

/**
 * Fetch or seed default SocialShareConfig document
 */
const getOrSeedSocialConfig = async () => {
  let config = await SocialShareConfig.findOne();
  if (!config) {
    config = await SocialShareConfig.create({});
  }
  return config;
};

/**
 * Helper to build safe XML/HTML strings
 */
const escapeXml = (unsafe) => {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * GET /api/share/product/:id/meta
 * Returns complete OpenGraph, Twitter Card, and Schema.org JSON-LD microdata
 */
exports.getPublicSocialMetadata = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await getOrSeedSocialConfig();

    let product = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(id).populate('category', 'name').populate('vendor', 'storeName');
    } else {
      product = await Product.findOne({ slug: id }).populate('category', 'name').populate('vendor', 'storeName');
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found for OpenGraph metadata generation.',
      });
    }

    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    const sellingPrice = product.price ?? 0;
    const mrp = product.originalPrice ?? product.mrp ?? sellingPrice;
    const discount = mrp > sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;
    const rating = product.ratingsAverage || 4.8;
    const reviews = product.ratingsQuantity || 24;

    const productImage = product.images?.[0] || product.image || config.defaultImage;
    const dynamicCardUrl = `${baseUrl}/api/share/product/${product._id}/card.svg`;
    const canonicalShareUrl = `${baseUrl}/p/${product._id}?${config.referralTrackingParam}`;

    // Format WhatsApp pre-filled message
    let whatsappText = config.whatsappMessageTemplate
      .replace(/%productTitle%/g, product.title)
      .replace(/%price%/g, sellingPrice.toLocaleString('en-IN'))
      .replace(/%discount%/g, `${discount}%`)
      .replace(/%rating%/g, rating.toString())
      .replace(/%shareUrl%/g, canonicalShareUrl);

    // Schema.org JSON-LD structured data
    const schemaOrgJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      image: [productImage],
      description: product.description?.slice(0, 250) || config.defaultDescription,
      sku: product.sku || product._id,
      brand: {
        '@type': 'Brand',
        name: product.brand || product.vendor?.storeName || config.siteName,
      },
      offers: {
        '@type': 'Offer',
        url: canonicalShareUrl,
        priceCurrency: config.currency,
        price: sellingPrice,
        priceValidUntil: '2028-12-31',
        itemCondition: 'https://schema.org/NewCondition',
        availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        seller: {
          '@type': 'Organization',
          name: product.vendor?.storeName || config.siteName,
        },
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: rating,
        reviewCount: reviews,
      },
    };

    return res.status(200).json({
      success: true,
      productId: product._id,
      productTitle: product.title,
      price: sellingPrice,
      mrp,
      discount,
      rating,
      reviews,
      canonicalShareUrl,
      dynamicCardUrl,
      metaTags: {
        openGraph: {
          'og:title': `${product.title} - Only ₹${sellingPrice.toLocaleString('en-IN')} | ${config.siteName}`,
          'og:description': product.description?.slice(0, 160) || config.defaultDescription,
          'og:image': dynamicCardUrl,
          'og:image:secure_url': dynamicCardUrl,
          'og:image:type': 'image/svg+xml',
          'og:image:width': '1200',
          'og:image:height': '630',
          'og:url': canonicalShareUrl,
          'og:type': 'product',
          'og:site_name': config.siteName,
          'product:price:amount': sellingPrice.toString(),
          'product:price:currency': config.currency,
          'product:availability': product.stock > 0 ? 'instock' : 'outofstock',
          'product:condition': 'new',
        },
        twitter: {
          'twitter:card': 'summary_large_image',
          'twitter:site': config.twitterHandle,
          'twitter:creator': config.twitterHandle,
          'twitter:title': `${product.title} - ₹${sellingPrice.toLocaleString('en-IN')}`,
          'twitter:description': product.description?.slice(0, 150) || config.defaultDescription,
          'twitter:image': dynamicCardUrl,
        },
      },
      jsonLd: schemaOrgJsonLd,
      sharingChannels: {
        whatsapp: {
          shareUrl: `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappText)}`,
          messageText: whatsappText,
        },
        telegram: {
          shareUrl: `https://t.me/share/url?url=${encodeURIComponent(canonicalShareUrl)}&text=${encodeURIComponent(
            `🔥 Check out ${product.title} on AuraMarket at ₹${sellingPrice.toLocaleString('en-IN')}!`
          )}`,
        },
        twitter: {
          shareUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
            `Check out ${product.title} on AuraMarket for ₹${sellingPrice.toLocaleString('en-IN')}!`
          )}&url=${encodeURIComponent(canonicalShareUrl)}`,
        },
        facebook: {
          shareUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonicalShareUrl)}`,
        },
        linkedin: {
          shareUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonicalShareUrl)}`,
        },
        email: {
          shareUrl: `mailto:?subject=${encodeURIComponent(`Check out ${product.title} on AuraMarket`)}&body=${encodeURIComponent(
            `Hi,\n\nI found this great product on AuraMarket: ${product.title} at ₹${sellingPrice.toLocaleString('en-IN')}.\n\nView product here: ${canonicalShareUrl}`
          )}`,
        },
      },
    });
  } catch (error) {
    console.error('Error in getPublicSocialMetadata:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/share/product/:id (and GET /p/:id)
 * Renders complete Semantic HTML with OpenGraph tags for social crawlers
 * and instant JavaScript redirection for human buyers
 */
exports.renderOpenGraphHtml = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await getOrSeedSocialConfig();

    let product = null;
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(id).populate('vendor', 'storeName');
    } else if (id) {
      product = await Product.findOne({ slug: id }).populate('vendor', 'storeName');
    }

    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    if (!product) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <title>Product Not Found - ${escapeXml(config.siteName)}</title>
            <meta property="og:title" content="Product Not Found - ${escapeXml(config.siteName)}">
            <meta property="og:description" content="${escapeXml(config.defaultDescription)}">
            <meta property="og:image" content="${escapeXml(config.defaultImage)}">
          </head>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h2>Product Not Found</h2>
            <p>The product you are looking for may have expired or moved.</p>
            <a href="/" style="color: #f59e0b; font-weight: bold;">Return to AuraMarket Storefront</a>
          </body>
        </html>
      `);
    }

    const sellingPrice = product.price ?? 0;
    const mrp = product.originalPrice ?? product.mrp ?? sellingPrice;
    const discount = mrp > sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;
    const dynamicCardUrl = `${baseUrl}/api/share/product/${product._id}/card.svg`;
    const canonicalUrl = `${baseUrl}/p/${product._id}`;
    const destinationUrl = `/?product=${product._id}`;
    const rating = product.ratingsAverage || 4.8;
    const reviews = product.ratingsQuantity || 24;

    const pageTitle = `${product.title} - Only ₹${sellingPrice.toLocaleString('en-IN')} | ${config.siteName}`;
    const pageDesc = `${product.title} at ₹${sellingPrice.toLocaleString('en-IN')} (${discount}% OFF). Rated ${rating}/5. 100% genuine verified with free express shipping on AuraMarket.`;

    const html = `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns# product: https://ogp.me/ns/product#">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeXml(pageTitle)}</title>
  <meta name="description" content="${escapeXml(pageDesc)}">
  <link rel="canonical" href="${escapeXml(canonicalUrl)}">

  <!-- OpenGraph / Facebook / WhatsApp / LinkedIn / Telegram -->
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="${escapeXml(config.siteName)}">
  <meta property="og:title" content="${escapeXml(pageTitle)}">
  <meta property="og:description" content="${escapeXml(pageDesc)}">
  <meta property="og:url" content="${escapeXml(canonicalUrl)}">
  <meta property="og:image" content="${escapeXml(dynamicCardUrl)}">
  <meta property="og:image:secure_url" content="${escapeXml(dynamicCardUrl)}">
  <meta property="og:image:type" content="image/svg+xml">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="product:price:amount" content="${sellingPrice}">
  <meta property="product:price:currency" content="${escapeXml(config.currency)}">
  <meta property="product:availability" content="${product.stock > 0 ? 'instock' : 'outofstock'}">
  <meta property="product:condition" content="new">
  <meta property="product:retailer_item_id" content="${escapeXml(product._id.toString())}">

  <!-- Twitter / X Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="${escapeXml(config.twitterHandle)}">
  <meta name="twitter:creator" content="${escapeXml(config.twitterHandle)}">
  <meta name="twitter:title" content="${escapeXml(product.title)} - ₹${sellingPrice.toLocaleString('en-IN')}">
  <meta name="twitter:description" content="${escapeXml(pageDesc)}">
  <meta name="twitter:image" content="${escapeXml(dynamicCardUrl)}">

  <!-- Schema.org JSON-LD Microdata -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "${escapeXml(product.title)}",
    "image": ["${escapeXml(dynamicCardUrl)}"],
    "description": "${escapeXml(pageDesc)}",
    "sku": "${escapeXml(product.sku || product._id.toString())}",
    "offers": {
      "@type": "Offer",
      "priceCurrency": "${escapeXml(config.currency)}",
      "price": "${sellingPrice}",
      "availability": "${product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'}",
      "url": "${escapeXml(canonicalUrl)}"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "${rating}",
      "reviewCount": "${reviews}"
    }
  }
  </script>

  <!-- Instant Redirection for Human Browsers -->
  <script>
    if (typeof window !== 'undefined') {
      window.location.replace("${destinationUrl}");
    }
  </script>
</head>
<body style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px;">
  <div style="max-width: 500px; width: 100%; background: #1e293b; border: 1px solid #334155; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); text-align: center; padding: 24px;">
    <img src="${escapeXml(dynamicCardUrl)}" alt="${escapeXml(product.title)}" style="width: 100%; border-radius: 12px; margin-bottom: 16px;">
    <h2 style="font-size: 18px; margin: 0 0 8px 0; color: #ffffff;">${escapeXml(product.title)}</h2>
    <p style="font-size: 24px; font-weight: 900; color: #f59e0b; margin: 0 0 16px 0;">₹${sellingPrice.toLocaleString('en-IN')}</p>
    <a href="${destinationUrl}" style="display: inline-block; background: #f59e0b; color: #0f172a; font-weight: 800; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 12px; transition: transform 0.2s;">
      View Product on AuraMarket 🛍️
    </a>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (error) {
    console.error('Error in renderOpenGraphHtml:', error);
    return res.status(500).send('Internal Server Error rendering OpenGraph metadata.');
  }
};

/**
 * GET /api/share/product/:id/card.svg
 * Generates dynamic high-res 1200x630 SVG social preview card
 */
exports.renderDynamicSocialCardSvg = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await getOrSeedSocialConfig();

    let product = null;
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(id).populate('vendor', 'storeName');
    } else if (id) {
      product = await Product.findOne({ slug: id }).populate('vendor', 'storeName');
    }

    const title = product?.title || config.defaultTitle;
    const price = product?.price || 2499;
    const mrp = product?.originalPrice || product?.mrp || Math.round(price * 1.35);
    const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 25;
    const rating = product?.ratingsAverage || 4.8;
    const reviews = product?.ratingsQuantity || 48;
    const brand = product?.brand || product?.vendor?.storeName || 'AuraMarket Direct';

    // Truncate title safely
    const truncatedTitle = title.length > 55 ? title.slice(0, 52) + '...' : title;

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Background with Obsidian & Amber Glow -->
  <rect width="1200" height="630" fill="#0f172a"/>
  <circle cx="1100" cy="100" r="350" fill="#f59e0b" fill-opacity="0.12"/>
  <circle cx="100" cy="550" r="280" fill="#f59e0b" fill-opacity="0.08"/>

  <!-- Border Card Frame -->
  <rect x="24" y="24" width="1152" height="582" rx="28" stroke="#334155" stroke-width="2" fill="#1e293b" fill-opacity="0.85"/>

  <!-- Header: AuraMarket Logo & Verified Badge -->
  <g transform="translate(64, 60)">
    <!-- Brand Icon -->
    <rect width="52" height="52" rx="14" fill="#f59e0b"/>
    <path d="M16 36L26 16L36 36H16Z" fill="#0f172a"/>
    
    <!-- Brand Text -->
    <text x="68" y="36" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" fill="#ffffff" letter-spacing="-0.5">
      AuraMarket
    </text>
    <text x="236" y="36" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" fill="#f59e0b" letter-spacing="1.5">
      ENTERPRISE VERIFIED
    </text>

    <!-- Verified Pill -->
    <rect x="940" y="4" width="148" height="36" rx="18" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-width="1.5"/>
    <text x="968" y="27" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#34d399">
      100% GENUINE
    </text>
  </g>

  <!-- Horizontal Divider -->
  <line x1="64" y1="135" x2="1136" y2="135" stroke="#334155" stroke-width="1"/>

  <!-- Brand / Seller Tag -->
  <text x="64" y="185" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="800" fill="#94a3b8" letter-spacing="1">
    OFFICIAL STORE • ${escapeXml(brand.toUpperCase())}
  </text>

  <!-- Product Title -->
  <text x="64" y="240" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="900" fill="#ffffff" letter-spacing="-1">
    ${escapeXml(truncatedTitle)}
  </text>

  <!-- Star Rating & Review Badge -->
  <g transform="translate(64, 275)">
    <rect width="180" height="38" rx="10" fill="#f59e0b" fill-opacity="0.2" stroke="#f59e0b" stroke-width="1"/>
    <text x="16" y="24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="900" fill="#fbbf24">
      ★ ${rating} / 5.0
    </text>
    <text x="96" y="24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" fill="#cbd5e1">
      (${reviews} Reviews)
    </text>
  </g>

  <!-- Pricing Showcase Box -->
  <g transform="translate(64, 340)">
    <rect width="1072" height="135" rx="20" fill="#0f172a" stroke="#f59e0b" stroke-width="1.5" stroke-opacity="0.4"/>
    
    <!-- Selling Price -->
    <text x="36" y="85" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="64" font-weight="900" fill="#f59e0b" letter-spacing="-1">
      ₹${price.toLocaleString('en-IN')}
    </text>

    <!-- MRP Strikethrough -->
    <text x="360" y="80" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="30" font-weight="700" fill="#64748b" text-decoration="line-through">
      ₹${mrp.toLocaleString('en-IN')}
    </text>

    <!-- Discount Pill -->
    <rect x="520" y="50" width="130" height="42" rx="12" fill="#ef4444"/>
    <text x="545" y="77" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="900" fill="#ffffff">
      ${discount}% OFF
    </text>

    <!-- EMI Highlight Tag -->
    <text x="700" y="78" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="800" fill="#38bdf8">
      ⚡ No Cost EMI from ₹${Math.round(price / 6).toLocaleString('en-IN')}/mo
    </text>
  </g>

  <!-- Trust Badges Footer -->
  <g transform="translate(64, 525)">
    <!-- Badge 1: Express Delivery -->
    <rect width="280" height="42" rx="12" fill="#334155" fill-opacity="0.5"/>
    <text x="24" y="27" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" fill="#e2e8f0">
      🚀 Free Express Doorstep Delivery
    </text>

    <!-- Badge 2: Easy Returns -->
    <rect x="300" y="0" width="220" height="42" rx="12" fill="#334155" fill-opacity="0.5"/>
    <text x="324" y="27" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" fill="#e2e8f0">
      🔄 7-Day Hassle-Free Returns
    </text>

    <!-- Badge 3: Buyer Protection -->
    <rect x="540" y="0" width="230" height="42" rx="12" fill="#334155" fill-opacity="0.5"/>
    <text x="564" y="27" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" fill="#e2e8f0">
      🛡️ 100% Buyer Protection
    </text>

    <!-- Call to action button on right -->
    <rect x="880" y="-5" width="192" height="52" rx="16" fill="#f59e0b"/>
    <text x="918" y="28" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="900" fill="#0f172a">
      Shop Now 🛍️
    </text>
  </g>
</svg>`;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    return res.status(200).send(svg);
  } catch (error) {
    console.error('Error rendering dynamic social card SVG:', error);
    return res.status(500).send('<svg><text>Error generating card</text></svg>');
  }
};

/**
 * GET /api/share/admin/config
 * Super Admin get OpenGraph & Social Sharing settings
 */
exports.getAdminConfig = async (req, res) => {
  try {
    const config = await getOrSeedSocialConfig();
    return res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error in getAdminConfig:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/share/admin/config
 * Super Admin update OpenGraph & Social Sharing settings with AuditLog
 */
exports.updateAdminConfig = async (req, res) => {
  try {
    const {
      defaultTitle,
      defaultDescription,
      defaultImage,
      siteName,
      twitterHandle,
      facebookAppId,
      currency,
      enableDynamicCards,
      brandTagline,
      whatsappMessageTemplate,
      referralTrackingParam,
      cardThemeColor,
      cardBgColor,
    } = req.body;

    let config = await getOrSeedSocialConfig();

    const previousSnapshot = {
      defaultTitle: config.defaultTitle,
      siteName: config.siteName,
      twitterHandle: config.twitterHandle,
    };

    if (defaultTitle !== undefined) config.defaultTitle = defaultTitle;
    if (defaultDescription !== undefined) config.defaultDescription = defaultDescription;
    if (defaultImage !== undefined) config.defaultImage = defaultImage;
    if (siteName !== undefined) config.siteName = siteName;
    if (twitterHandle !== undefined) config.twitterHandle = twitterHandle;
    if (facebookAppId !== undefined) config.facebookAppId = facebookAppId;
    if (currency !== undefined) config.currency = currency;
    if (enableDynamicCards !== undefined) config.enableDynamicCards = enableDynamicCards;
    if (brandTagline !== undefined) config.brandTagline = brandTagline;
    if (whatsappMessageTemplate !== undefined) config.whatsappMessageTemplate = whatsappMessageTemplate;
    if (referralTrackingParam !== undefined) config.referralTrackingParam = referralTrackingParam;
    if (cardThemeColor !== undefined) config.cardThemeColor = cardThemeColor;
    if (cardBgColor !== undefined) config.cardBgColor = cardBgColor;

    config.updatedBy = req.user?._id;
    await config.save();

    // Log to immutable AuditLog
    await AuditLog.create({
      action: 'UPDATE_SETTINGS',
      module: 'SETTINGS',
      targetId: config._id.toString(),
      targetType: 'SocialShareConfig',
      description: `Super Admin updated Platform OpenGraph & Social Sharing rules (Site: ${config.siteName}, Twitter: ${config.twitterHandle})`,
      changeSummary: `Updated from Title "${previousSnapshot.defaultTitle}" to "${config.defaultTitle}"`,
      details: {
        previous: previousSnapshot,
        updated: {
          defaultTitle: config.defaultTitle,
          siteName: config.siteName,
          twitterHandle: config.twitterHandle,
        },
      },
      performedBy: req.user?._id,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
    });

    return res.status(200).json({
      success: true,
      message: 'OpenGraph & Social Sharing settings successfully updated.',
      data: config,
    });
  } catch (error) {
    console.error('Error in updateAdminConfig:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/share/admin/test-url
 * Super Admin test tool for OpenGraph verification
 */
exports.testSocialUrl = async (req, res) => {
  try {
    const { productId, customTitle, customPrice } = req.body;
    const config = await getOrSeedSocialConfig();

    let product = null;
    if (productId && productId.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(productId);
    }

    const title = customTitle || product?.title || config.defaultTitle;
    const price = customPrice || product?.price || 1999;
    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    const cardUrl = product
      ? `${baseUrl}/api/share/product/${product._id}/card.svg`
      : `${baseUrl}/api/share/product/preview/card.svg`;

    return res.status(200).json({
      success: true,
      testResult: {
        title,
        price,
        siteName: config.siteName,
        twitterHandle: config.twitterHandle,
        ogImageUrl: cardUrl,
        metaTagsPreview: {
          'og:title': `${title} - Only ₹${price.toLocaleString('en-IN')} | ${config.siteName}`,
          'og:image': cardUrl,
          'twitter:card': 'summary_large_image',
          'twitter:title': title,
        },
      },
    });
  } catch (error) {
    console.error('Error in testSocialUrl:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
