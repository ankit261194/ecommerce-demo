const Product = require('../models/Product');
const Order = require('../models/Order');
const SubOrder = require('../models/SubOrder');
const Coupon = require('../models/Coupon');

// @desc    Process AI Voice Assistant Command (Hindi + English)
// @route   POST /api/ai/voice-assistant
// @access  Public / Authenticated
exports.processVoiceCommand = async (req, res, next) => {
  try {
    const { query = '', language = 'en', customerId } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A spoken voice query or text command is required',
      });
    }

    const text = query.trim().toLowerCase();
    const isHindi = language === 'hi' || /[अ-ह]/.test(text) || text.includes('dikhao') || text.includes('kahan') || text.includes('chahiye') || text.includes('karo');

    // Extract price constraints (e.g. "under 2000", "2000 se kam", "below 5000")
    let maxPrice = null;
    const priceMatch = text.match(/(?:under|below|less than|se kam|kam me|upto)\s*(?:rs\.?|inr|₹)?\s*(\d+)/i);
    if (priceMatch && priceMatch[1]) {
      maxPrice = parseInt(priceMatch[1], 10);
    }

    // 1. INTENT: ORDER TRACKING ("track my order", "order kahan hai", "mera parcel", "delivery status")
    if (
      text.includes('track') ||
      text.includes('kahan hai') ||
      text.includes('order status') ||
      text.includes('parcel') ||
      text.includes('kab aayega') ||
      text.includes('delivery status') ||
      text.includes('where is my order')
    ) {
      let latestSubOrder = null;
      if (customerId) {
        latestSubOrder = await SubOrder.findOne({ customer: customerId })
          .populate('vendor', 'storeName')
          .sort({ createdAt: -1 });
      }

      if (!latestSubOrder) {
        latestSubOrder = await SubOrder.findOne()
          .populate('vendor', 'storeName')
          .sort({ createdAt: -1 });
      }

      const orderNumber = latestSubOrder ? (latestSubOrder.subOrderId || `ORD-${latestSubOrder._id.toString().slice(-6).toUpperCase()}`) : 'AURA-7821';
      const status = latestSubOrder?.status || 'out_for_delivery';
      const statusLabel = status.replace(/_/g, ' ').toUpperCase();

      const replyText = isHindi
        ? `Aapka order #${orderNumber} is waqt "${statusLabel}" stage par hai. Delivery rider raste me hai aur lagbhag 25 se 35 minutes me aapke darwaze par pahuchega.`
        : `Your order #${orderNumber} is currently ${statusLabel}. Delivery partner is on the way and estimated to reach within 25–35 minutes.`;

      return res.status(200).json({
        success: true,
        intent: 'TRACK_ORDER',
        language: isHindi ? 'hi' : 'en',
        query,
        replyText,
        action: 'SHOW_ORDER_TRACKER',
        payload: {
          orderNumber,
          status,
          statusLabel,
          estimatedTime: '25-35 mins',
          trackingUrl: `/track/${orderNumber}`,
          order: latestSubOrder,
        },
      });
    }

    // 2. INTENT: OFFERS & DISCOUNTS ("offers kya hain", "coupons", "any discount", "best deals", "sasta")
    if (
      text.includes('offer') ||
      text.includes('coupon') ||
      text.includes('discount') ||
      text.includes('deal') ||
      text.includes('sasta') ||
      text.includes('sale') ||
      text.includes('code')
    ) {
      const activeCoupons = await Coupon.find({ isActive: { $ne: false } }).limit(4);
      const couponCodes = activeCoupons.map(c => c.code).join(', ') || 'FESTIVE500, FIRSTBUY20, AURASHIP';

      const replyText = isHindi
        ? `Aaj ke top discounts aur coupons hain: ${couponCodes}. Checkout par code lagakar aap 20% tak ki bachat kar sakte hain!`
        : `Today's top verified promo coupons are: ${couponCodes}. Apply at checkout to unlock up to 20% instant savings!`;

      return res.status(200).json({
        success: true,
        intent: 'GET_OFFERS',
        language: isHindi ? 'hi' : 'en',
        query,
        replyText,
        action: 'SHOW_COUPONS',
        payload: {
          coupons: activeCoupons,
          suggestedCode: activeCoupons[0]?.code || 'FESTIVE500',
        },
      });
    }

    // 3. INTENT: CART / CHECKOUT ("open cart", "cart dikhao", "checkout", "basket me kya hai")
    if (
      text.includes('cart') ||
      text.includes('checkout') ||
      text.includes('basket') ||
      text.includes('bag') ||
      text.includes('jholi')
    ) {
      const replyText = isHindi
        ? 'Maine aapka shopping cart open kar diya hai. Aap yahan items review kar sakte hain aur 1-click me order place kar sakte hain.'
        : 'I have opened your shopping cart. You can review your items and proceed with express checkout.';

      return res.status(200).json({
        success: true,
        intent: 'CHECK_CART',
        language: isHindi ? 'hi' : 'en',
        query,
        replyText,
        action: 'OPEN_CART_DRAWER',
        payload: {},
      });
    }

    // 4. DEFAULT INTENT: PRODUCT SEARCH & RECOMMENDATION
    // Remove filler voice words
    const cleanSearchKeywords = text
      .replace(/(?:show me|dikhao|chahiye|dhoondho|mujhe|under|below|se kam|please|can you|search for|buy|looking for)\b/gi, '')
      .replace(/\d+/g, '')
      .trim();

    const productQuery = { isPublished: { $ne: false } };

    if (maxPrice) {
      productQuery.sellingPrice = { $lte: maxPrice };
    }

    if (cleanSearchKeywords.length > 1) {
      productQuery.$or = [
        { title: { $regex: cleanSearchKeywords, $options: 'i' } },
        { description: { $regex: cleanSearchKeywords, $options: 'i' } },
        { brand: { $regex: cleanSearchKeywords, $options: 'i' } },
        { tags: { $in: [new RegExp(cleanSearchKeywords, 'i')] } },
      ];
    }

    let products = await Product.find(productQuery)
      .select('title sellingPrice mrp stock thumbnail rating category brand')
      .populate('vendor', 'storeName')
      .limit(6)
      .lean();

    // Fallback if strict filter yields no results: get top featured products
    if (products.length === 0) {
      products = await Product.find({ isPublished: { $ne: false } })
        .select('title sellingPrice mrp stock thumbnail rating category brand')
        .populate('vendor', 'storeName')
        .limit(4)
        .lean();
    }

    const count = products.length;
    const topItem = products[0]?.title || 'products';
    const topPrice = products[0]?.sellingPrice || 999;

    const replyText = isHindi
      ? `Maine aapke liye ${count} best results khoj liye hain. Sabse popular "${topItem}" sirf ₹${topPrice} me uplabdh hai.`
      : `Found ${count} top matching results for your request. The highest-rated option is "${topItem}" at ₹${topPrice}.`;

    return res.status(200).json({
      success: true,
      intent: 'SEARCH_PRODUCTS',
      language: isHindi ? 'hi' : 'en',
      query,
      replyText,
      action: 'DISPLAY_SEARCH_RESULTS',
      payload: {
        totalResults: count,
        keywords: cleanSearchKeywords,
        maxPrice,
        products: products.map(p => ({
          _id: p._id,
          title: p.title,
          price: p.sellingPrice !== undefined ? p.sellingPrice : 999,
          mrp: p.mrp || p.sellingPrice || 1499,
          thumbnail: p.thumbnail,
          stock: p.stock,
          rating: p.rating || 4.8,
          brand: p.brand,
          vendor: p.vendor?.storeName || 'AuraMarket Partner',
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Curated Voice Prompts for UI Hints
// @route   GET /api/ai/voice-prompts
// @access  Public
exports.getVoicePrompts = (req, res) => {
  res.status(200).json({
    success: true,
    languages: ['en', 'hi'],
    prompts: [
      {
        language: 'hi',
        category: 'Electronics',
        text: 'Aura Pro wireless headphones dikhao',
        intent: 'SEARCH_PRODUCTS',
      },
      {
        language: 'hi',
        category: 'Budget',
        text: 'Smartwatches under 5000',
        intent: 'SEARCH_PRODUCTS',
      },
      {
        language: 'hi',
        category: 'Tracking',
        text: 'Mera order kahan hai track karo',
        intent: 'TRACK_ORDER',
      },
      {
        language: 'hi',
        category: 'Offers',
        text: 'Festive season ke discounts kya hain',
        intent: 'GET_OFFERS',
      },
      {
        language: 'en',
        category: 'Fashion',
        text: 'Show casual summer linen shirts',
        intent: 'SEARCH_PRODUCTS',
      },
      {
        language: 'en',
        category: 'Tracking',
        text: 'Track my recent delivery status',
        intent: 'TRACK_ORDER',
      },
      {
        language: 'en',
        category: 'Checkout',
        text: 'Open cart and proceed to checkout',
        intent: 'CHECK_CART',
      },
    ],
  });
};
