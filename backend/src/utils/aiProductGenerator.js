/**
 * Point 76: AI Product Description & SEO Meta Generator for Vendors
 * Intelligent Commercial Copywriting & SERP Optimization Engine
 */

const HSN_DATABASE = {
  electronics: { code: '85183000', rate: 18, desc: 'Audio devices, headphones, earphones & accessories' },
  audio: { code: '85183000', rate: 18, desc: 'Microphones, loudspeakers, headphones & earphones' },
  computers: { code: '84713010', rate: 18, desc: 'Personal computers, laptops, tablets and peripherals' },
  mobile: { code: '85171300', rate: 18, desc: 'Smartphones and handheld wireless devices' },
  fashion: { code: '61091000', rate: 12, desc: 'T-shirts, singlets and other vests, knitted or crocheted' },
  apparel: { code: '62034200', rate: 12, desc: 'Men or boys trousers, bib, breeches and shorts of cotton' },
  footwear: { code: '64041100', rate: 12, desc: 'Sports footwear with outer soles of rubber or plastics' },
  home: { code: '94036000', rate: 18, desc: 'Other wooden furniture for home, bedroom & living room' },
  kitchen: { code: '73239390', rate: 12, desc: 'Table, kitchen or other household articles of stainless steel' },
  beauty: { code: '33049990', rate: 18, desc: 'Cosmetics or skin care preparations & personal grooming' },
  default: { code: '85183000', rate: 18, desc: 'General consumer merchandise' },
};

function resolveHsnDetails(category = '', prompt = '') {
  const combined = `${category} ${prompt}`.toLowerCase();
  for (const [key, details] of Object.entries(HSN_DATABASE)) {
    if (key !== 'default' && combined.includes(key)) {
      return details;
    }
  }
  return HSN_DATABASE.default;
}

function generateProductCopy({
  prompt = '',
  title = '',
  category = 'Electronics',
  tone = 'persuasive',
  targetAudience = 'general',
}) {
  const cleanTitle = (title || prompt || 'Premium Multi-Vendor Product').trim();
  const cleanCategory = (category || 'Electronics').trim();
  const hsn = resolveHsnDetails(cleanCategory, prompt);

  // 1. Generate Catchy Titles (3 Variations)
  const titles = [
    `${cleanTitle} — High Performance Series with 1-Year Brand Warranty`,
    `Next-Gen ${cleanTitle} with Smart Ergonomic Design`,
    `Aura Exclusive: ${cleanTitle} (Certified Genuine & Express Dispatch)`,
  ];

  // 2. Generate Compelling Commercial Product Description
  let toneIntro = '';
  if (tone === 'luxury') {
    toneIntro = `Crafted with meticulous attention to detail and premium materials, the **${cleanTitle}** sets an elite standard in modern elegance and timeless durability.`;
  } else if (tone === 'technical') {
    toneIntro = `Engineered for rigorous performance and unmatched reliability, the **${cleanTitle}** features precision-calibrated architecture built specifically for heavy everyday utility.`;
  } else if (tone === 'festive') {
    toneIntro = `Celebrate this festive season with the all-new **${cleanTitle}**! Designed to bring joy, unbeatable convenience, and extraordinary value to your loved ones.`;
  } else {
    toneIntro = `Elevate your lifestyle with the all-new **${cleanTitle}**. Engineered for demanding daily use, it delivers unparalleled comfort, seamless functionality, and dependable performance.`;
  }

  const description = `${toneIntro}

Designed specifically for **${targetAudience}**, every aspect of this ${cleanCategory.toLowerCase()} piece has been optimized for supreme user satisfaction. From durable housing to streamlined intuitive controls, experience perfection right out of the box.

### Why Choose AuraMarket Verified:
- **100% Genuine Certified**: Sourced directly from authenticated brand merchants with official invoice.
- **Express Doorstep Dispatch**: Inspected and packed with anti-tamper security seal within 24 hours.
- **7-Day Hassle-Free Returns**: Complete peace of mind with 1-click doorstep pickup and instant wallet refund.`;

  // 3. Feature Bullet Points (5-6 high impact selling points)
  const bullets = [
    `✨ **Ultra-Durable Craftsmanship**: Built with aerospace-grade durability and high-tensile components for extended longevity.`,
    `⚡ **Lightning Performance**: Optimized for instant responsiveness and peak efficiency throughout continuous use.`,
    `🛡️ **Safety & Certified Standard**: Certified for international safety standards with overheat and surge surge protection.`,
    `🎯 **Ergonomic Design**: Carefully contoured form factor ensures zero fatigue during extended everyday handling.`,
    `📦 **Complete Retail Box**: Includes user quick-start manual, warranty registration card, and factory-sealed accessories.`,
    `🇮🇳 **All-India Express Delivery**: Backed by secure 4-digit OTP handover and live GPS step-by-step courier tracking.`,
  ];

  // 4. Generate SEO Meta Data
  const metaTitle = `${cleanTitle} | Buy Online at Best Price on AuraMarket`.slice(0, 60);
  const metaDescription = `Buy ${cleanTitle} online at the best price in India on AuraMarket. Enjoy verified merchant warranty, secure OTP delivery, and express 24h dispatch.`
    .slice(0, 155);

  const rawTags = [
    cleanTitle.toLowerCase(),
    cleanCategory.toLowerCase(),
    `${cleanCategory.toLowerCase()} deals`,
    'buy online',
    'best price india',
    'verified merchant',
    'auramarket exclusive',
    'express delivery',
  ];
  const searchTags = Array.from(new Set(rawTags.map((t) => t.replace(/[^\w\s]/g, '').trim()))).filter(Boolean);

  return {
    titles,
    selectedTitle: titles[0],
    description,
    bullets,
    seoMeta: {
      metaTitle,
      metaDescription,
      searchTags,
    },
    suggestedHsnCode: hsn.code,
    suggestedGstRate: hsn.rate,
    hsnDescription: hsn.desc,
  };
}

function generateSeoMeta({
  title = '',
  description = '',
  category = 'Electronics',
}) {
  const cleanTitle = (title || 'Premium Product').trim();
  const cleanCat = (category || 'Electronics').trim();

  const metaTitle = `${cleanTitle} — Best Price Deals | AuraMarket`.slice(0, 60);
  const metaDescription = `Shop genuine ${cleanTitle} on AuraMarket ${cleanCat} Store. Get exclusive promo discounts, verified merchant warranty, and fast COD delivery.`
    .slice(0, 155);

  const keywords = cleanTitle
    .toLowerCase()
    .split(/\s+/)
    .concat([cleanCat.toLowerCase(), 'online shopping', 'auramarket', 'best price', 'express shipping'])
    .filter((w) => w.length > 2);

  const searchTags = Array.from(new Set(keywords));

  return {
    metaTitle,
    metaDescription,
    searchTags,
    ogTitle: metaTitle,
    ogDescription: metaDescription,
  };
}

module.exports = {
  generateProductCopy,
  generateSeoMeta,
  resolveHsnDetails,
  HSN_DATABASE,
};
