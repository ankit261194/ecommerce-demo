/**
 * Point 24: AI Smart Product Listing & SEO Description Generator
 * Commercial Copywriting, Multi-Tone Generation & Google SERP Optimization Engine
 */

const HSN_DATABASE = {
  electronics: { code: '85183000', rate: 18, desc: 'Audio devices, headphones, earphones & acoustic gear' },
  audio: { code: '85183000', rate: 18, desc: 'Microphones, loudspeakers, headphones & earphones' },
  computers: { code: '84713010', rate: 18, desc: 'Personal computers, laptops, tablets and peripherals' },
  mobile: { code: '85171300', rate: 18, desc: 'Smartphones, cellular terminals & handheld wireless devices' },
  watches: { code: '91021100', rate: 18, desc: 'Wristwatches, smart wearable devices & chronographs' },
  fashion: { code: '61091000', rate: 12, desc: 'T-shirts, knitted shirts and everyday apparel of cotton' },
  apparel: { code: '62034200', rate: 12, desc: 'Trousers, jackets, blazers, and woven fashion garments' },
  footwear: { code: '64041100', rate: 12, desc: 'Sports sneakers, boots and casual footwear with rubber soles' },
  home: { code: '94036000', rate: 18, desc: 'Wooden furniture, room accents, lighting & home decor' },
  kitchen: { code: '73239390', rate: 12, desc: 'Stainless steel cookware, utensils & kitchen appliances' },
  beauty: { code: '33049990', rate: 18, desc: 'Cosmetics, skin care preparations & personal grooming' },
  jewelry: { code: '71131900', rate: 3, desc: 'Articles of jewelry and precious metal accessories' },
  sports: { code: '95069990', rate: 18, desc: 'Gymnasium equipment, fitness accessories & outdoor gear' },
  default: { code: '85183000', rate: 18, desc: 'General consumer retail merchandise' },
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

/**
 * Intelligent Smart Listing Generator
 */
function generateProductCopy({
  prompt = '',
  title = '',
  category = 'Electronics',
  subCategory = '',
  tone = 'persuasive',
  targetAudience = 'general',
  language = 'en',
  brand = '',
}) {
  const titleStr = typeof title === 'string' ? title : (typeof prompt === 'string' ? prompt : (title ? String(title) : 'Premium Multi-Vendor Product'));
  const cleanTitle = titleStr.trim();
  const categoryStr = typeof category === 'string' ? category : (category?.name || (category ? String(category) : 'Electronics'));
  const cleanCategory = categoryStr.trim();
  const brandStr = typeof brand === 'string' ? brand : (brand ? String(brand) : 'AuraMarket Verified');
  const cleanBrand = brandStr.trim();
  const hsn = resolveHsnDetails(cleanCategory, `${cleanTitle} ${prompt}`);

  // 1. Generate Catchy Titles (3 Variants)
  const isHindi = language === 'hi';
  let titles = [];

  if (isHindi) {
    titles = [
      `${cleanTitle} — Best Quality & Express Delivery (1-Year Warranty)`,
      `Dhamaka Offer: ${cleanTitle} — Premium Quality Lowest Price Guaranteed`,
      `${cleanBrand} ${cleanTitle} (Original & 100% Genuine Certified)`,
    ];
  } else {
    titles = [
      `${cleanTitle} — Premium Performance Edition with 1-Year Brand Warranty`,
      `Next-Gen ${cleanTitle} by ${cleanBrand} with Smart Ergonomic Design`,
      `${cleanBrand} Exclusive: ${cleanTitle} (Certified Genuine & Express Dispatch)`,
    ];
  }

  // 2. Short Summary
  const shortSummary = isHindi
    ? `${cleanTitle} ab uplabdh hai AuraMarket par special discount ke sath! 100% genuine verified seller warranty aur express doorstep delivery.`
    : `Experience peak everyday performance with the all-new ${cleanTitle}. Built with premium materials, verified merchant warranty, and fast doorstep delivery.`;

  // 3. Multi-Paragraph Rich Description by Tone
  let toneLead = '';
  if (isHindi) {
    toneLead = `Aapke rozmarra ke lifestyle ko behtar banane ke liye pesh hai **${cleanTitle}**! Yeh product high durability, behtareen design aur shandar performance ka perfect combination hai.`;
  } else {
    switch (tone) {
      case 'luxury':
        toneLead = `Meticulously sculpted with artisanal finesse and hand-finished materials, the **${cleanTitle}** redefines modern luxury. Designed for discerning individuals who accept nothing less than uncompromising elegance, every curve and surface reflects elite craftsmanship.`;
        break;
      case 'technical':
        toneLead = `Engineered for demanding workloads and zero-tolerance precision, the **${cleanTitle}** integrates advanced hardware architecture with thermal-balanced efficiency. Built to withstand rigorous continuous duty while maintaining ultra-low latency response.`;
        break;
      case 'minimalist':
        toneLead = `Essential form meets effortless function. The **${cleanTitle}** removes all distractions to deliver pure, uninterrupted performance. Uncluttered aesthetics, premium tactile feedback, and intuitive day-to-day usability.`;
        break;
      case 'playful':
        toneLead = `Ready to level up your everyday vibes? Meet the **${cleanTitle}**! Super fresh, insanely capable, and built to stand out in any crowd. Unpack the excitement and let the good times roll!`;
        break;
      case 'persuasive':
      default:
        toneLead = `Upgrade your daily routine with the all-new **${cleanTitle}**. Engineered to outperform expectations, this standout piece delivers the perfect equilibrium of enduring durability, user-first ergonomics, and remarkable value for money.`;
        break;
    }
  }

  const detailedDescription = `${toneLead}

### Key Architectural Highlights:
Tailored specifically for **${targetAudience || 'Modern Consumers'}**, this ${cleanCategory.toLowerCase()} benchmark sets an elevated bar in its segment. Whether for heavy daily use or special moments, enjoy dependable performance straight out of the box.

### AuraMarket Trust Promise:
- 🛡️ **100% Genuine & Brand Sealed**: Authenticated directly from certified manufacturers with official tax invoice.
- ⚡ **Express 24-Hour Dispatch**: Carefully bubble-wrapped with tamper-proof security holographic seals.
- 🔄 **7-Day Hassle-Free Doorstep Returns**: Instant wallet or bank refund upon doorstep package pickup.
- 📞 **Dedicated 24/7 Buyer Support**: Real human phone and WhatsApp concierge assistance.`;

  // 4. Feature Bullet Points
  const bullets = isHindi
    ? [
        `✨ **High Quality Material**: Lambi umar aur mazboot packaging ke sath certified durability.`,
        `⚡ **Fast & Responsive**: Har use me super smooth performance aur zero lag experience.`,
        `🛡️ **Safety Certified**: International safety standards aur electrical surge protection compliant.`,
        `📦 **Complete Retail Box**: Box me authentic product, user quick guide aur warranty card shaamil hai.`,
        `🇮🇳 **All-India Express Delivery**: 4-digit secret delivery OTP aur live GPS tracking ke sath deliver hota hai.`,
      ]
    : [
        `✨ **Aerospace-Grade Durability**: Precision-machined housing ensures maximum structural longevity and impact resistance.`,
        `⚡ **Optimized Performance Architecture**: Delivers instantaneous response times and power-efficient operation throughout the day.`,
        `🎯 **Human-Centric Ergonomics**: Sculpted contouring eliminates operational fatigue during extended everyday handling.`,
        `🛡️ **Multi-Stage Safety Compliance**: Certified under strict regulatory standards with thermal overload and short-circuit protection.`,
        `📦 **Complete Retail Presentation Box**: Ships with quick-start documentation, warranty registration card, and factory accessories.`,
        `🇮🇳 **Verified Doorstep Handover**: Protected by 4-digit handover OTP security and step-by-step courier transit milestones.`,
      ];

  // 5. SEO Meta & SERP Preview
  const metaTitle = `${cleanTitle} — Best Price Deals Online | AuraMarket`.slice(0, 60);
  const metaDescription = `Buy genuine ${cleanTitle} online at the best price in India on AuraMarket. Enjoy verified merchant warranty, secure OTP delivery, and express 24h dispatch.`
    .slice(0, 155);

  const rawTags = [
    cleanTitle.toLowerCase(),
    cleanCategory.toLowerCase(),
    cleanBrand.toLowerCase(),
    `${cleanCategory.toLowerCase()} deals`,
    'buy online india',
    'best price online',
    'express dispatch',
    'verified merchant',
    'auramarket',
    'cash on delivery',
  ];
  const searchTags = Array.from(new Set(rawTags.map((t) => t.replace(/[^\w\s]/g, '').trim()))).filter(Boolean);

  const serpPreview = {
    title: metaTitle,
    snippet: metaDescription,
    url: `https://shribalajikripadham.online/ecommerce-demo/product/${cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    displayUrl: `shribalajikripadham.online › ecommerce-demo › ${cleanCategory.toLowerCase()} › ${cleanTitle.slice(0, 20)}`,
    rating: '4.8 ★★★★★ (142 reviews)',
  };

  // 6. Frequently Asked Questions (3 FAQs)
  const faqs = [
    {
      question: `Is the ${cleanTitle} genuine and covered by warranty?`,
      answer: `Yes, 100%! Every item is sourced directly from verified brand distributors, ships in factory-sealed packaging, and includes a minimum 1-Year Official Manufacturer Warranty.`,
    },
    {
      question: `What are the payment options and is Cash on Delivery (COD) available?`,
      answer: `We support Cash on Delivery (COD), Direct UPI QR, Debit/Credit Cards, and flexible No-Cost EMI plans. You only share the 4-digit delivery OTP once the package is in your hands.`,
    },
    {
      question: `What is the estimated delivery timeframe?`,
      answer: `Orders within hyperlocal quick commerce dark store hubs are delivered in 15-30 minutes. Across all other major Indian pin codes, dispatch takes under 24 hours with delivery in 2-3 business days.`,
    },
  ];

  // 7. Recommended Marketing Badges
  const marketingBadges = [
    '⚡ 24h Express Dispatch',
    '🔥 Trending Choice',
    '⭐ Verified Merchant',
    '🛡️ 1-Year Warranty',
  ];

  return {
    seoTitle: titles[0],
    titleVariations: titles,
    titles: titles,
    shortSummary,
    detailedDescription,
    description: detailedDescription,
    bulletPoints: bullets,
    bullets: bullets,
    seoMeta: {
      metaTitle,
      metaDescription,
      metaKeywords: searchTags.join(', '),
      searchTags,
      ogTitle: metaTitle,
      ogDescription: metaDescription,
      serpPreview,
    },
    suggestedCategory: cleanCategory,
    suggestedSubCategory: subCategory || `${cleanCategory} Accessories`,
    suggestedHsnCode: hsn.code,
    suggestedGstRate: hsn.rate,
    hsnDescription: hsn.desc,
    marketingBadges,
    faqs,
    toneUsed: tone,
    languageUsed: language,
  };
}

/**
 * Real Gemini LLM Integration with graceful fallback
 */
async function generateWithGeminiOrFallback(params) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && typeof fetch !== 'undefined') {
    try {
      const promptText = `You are a world-class e-commerce copywriter and SEO specialist for AuraMarket, a premier multi-vendor marketplace in India.
Generate a complete, high-converting product listing in JSON format for the following product:
- Product Title: ${params.title || params.prompt}
- Category: ${params.category}
- Tone: ${params.tone}
- Target Audience: ${params.targetAudience}
- Language: ${params.language}

Respond STRICTLY with a valid JSON object matching this structure:
{
  "seoTitle": "catchy title <= 70 chars",
  "titleVariations": ["v1", "v2", "v3"],
  "shortSummary": "2-sentence punchy summary",
  "detailedDescription": "markdown description with headers, benefits and warranty",
  "bulletPoints": ["bullet 1 with emoji", "bullet 2", "bullet 3", "bullet 4", "bullet 5"],
  "metaTitle": "SEO title <= 60 chars",
  "metaDescription": "SEO description <= 155 chars",
  "searchTags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"]
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );

      if (res.ok) {
        const json = await res.json();
        const rawContent = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawContent) {
          const parsed = JSON.parse(rawContent);
          const base = generateProductCopy(params);
          return {
            ...base,
            seoTitle: parsed.seoTitle || base.seoTitle,
            titleVariations: parsed.titleVariations || base.titleVariations,
            titles: parsed.titleVariations || base.titles,
            shortSummary: parsed.shortSummary || base.shortSummary,
            detailedDescription: parsed.detailedDescription || base.detailedDescription,
            description: parsed.detailedDescription || base.description,
            bulletPoints: parsed.bulletPoints || base.bulletPoints,
            bullets: parsed.bulletPoints || base.bullets,
            seoMeta: {
              ...base.seoMeta,
              metaTitle: parsed.metaTitle || base.seoMeta.metaTitle,
              metaDescription: parsed.metaDescription || base.seoMeta.metaDescription,
              searchTags: parsed.searchTags || base.seoMeta.searchTags,
            },
            isAiModelGenerated: true,
          };
        }
      }
    } catch (_) {
      // Graceful fallback to rich deterministic engine
    }
  }

  // Fallback to high-fidelity deterministic engine
  const result = generateProductCopy(params);
  result.isAiModelGenerated = false;
  return result;
}

function generateSeoMeta({
  title = '',
  description = '',
  category = 'Electronics',
}) {
  const cleanTitle = (typeof title === 'string' ? title : (title ? String(title) : 'Premium Product')).trim();
  const cleanCat = (typeof category === 'string' ? category : (category?.name || (category ? String(category) : 'Electronics'))).trim();

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
  generateWithGeminiOrFallback,
  resolveHsnDetails,
  HSN_DATABASE,
};
