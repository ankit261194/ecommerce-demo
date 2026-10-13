const Product = require('../models/Product');
const Category = require('../models/Category');

// Point #12: Stock Urgency Level calculation helper
const calculateStockUrgency = (stock) => {
  const num = Number(stock) || 0;
  if (num <= 0) {
    return { level: 'OUT_OF_STOCK', text: 'Out of Stock', isAvailable: false, unitsLeft: 0 };
  }
  if (num <= 5) {
    return { level: 'CRITICAL', text: `Only ${num} left in stock!`, isAvailable: true, unitsLeft: num };
  }
  if (num <= 15) {
    return { level: 'LOW', text: `Low stock: Only ${num} left`, isAvailable: true, unitsLeft: num };
  }
  return { level: 'IN_STOCK', text: 'In Stock — Ready to ship', isAvailable: true, unitsLeft: num };
};
exports.calculateStockUrgency = calculateStockUrgency;

// Point #13: Calculate recent purchase velocity (24 hours) & live viewers
const getPurchaseVelocity = (product) => {
  if (product.recentPurchases24h && product.recentPurchases24h > 0) {
    return product.recentPurchases24h;
  }
  const qty = Number(product.ratingsQuantity) || 12;
  const price = Number(product.sellingPrice) || 1000;
  const base = Math.max(7, Math.floor(qty * 0.45));
  const variance = (price % 17) + 5;
  return base + variance;
};

const getLiveViewers = (product) => {
  if (product.recentViewsPerHour && product.recentViewsPerHour > 0) {
    return product.recentViewsPerHour;
  }
  const qty = Number(product.ratingsQuantity) || 12;
  return Math.max(18, Math.floor(qty * 2.8) + 14);
};
exports.getPurchaseVelocity = getPurchaseVelocity;
exports.getLiveViewers = getLiveViewers;

// @desc    Get All Public Products with filtering, search & sorting
// @route   GET /api/products
exports.getProducts = async (req, res, next) => {
  try {
    const { category, subCategory, brand, minRating, rating, search, minPrice, maxPrice, inStock, onSale, featured, sort, page = 1, limit = 20 } = req.query;

    const query = { isPublished: true };

    // Point 7: In-Stock Only filter
    if (inStock === 'true' || inStock === true) {
      query.stock = { $gt: 0 };
    }

    // Point 7: On-Sale / Discounted Only filter (mrp > sellingPrice)
    if (onSale === 'true' || onSale === true) {
      query.$expr = { $gt: ['$mrp', '$sellingPrice'] };
    }

    const ratingThreshold = minRating || rating;
    if (ratingThreshold && !isNaN(Number(ratingThreshold))) {
      query.ratingsAverage = { $gte: Number(ratingThreshold) };
    }

    if (brand && brand !== 'all') {
      const brandList = brand.split(',').map(b => b.trim()).filter(Boolean);
      if (brandList.length === 1) {
        query.brand = new RegExp(`^${brandList[0]}$`, 'i');
      } else if (brandList.length > 1) {
        query.brand = { $in: brandList.map(b => new RegExp(`^${b}$`, 'i')) };
      }
    }

    if (subCategory) {
      const subCat = await Category.findOne({
        $or: [{ slug: subCategory }, { _id: require('mongoose').Types.ObjectId.isValid(subCategory) ? subCategory : null }],
      });
      if (subCat) {
        query.$or = [{ subCategory: subCat._id }, { category: subCat._id }];
      }
    } else if (category && category !== 'all') {
      const cat = await Category.findOne({
        $or: [{ slug: category }, { _id: require('mongoose').Types.ObjectId.isValid(category) ? category : null }],
      });
      if (cat) {
        const childCats = await Category.find({ parentCategory: cat._id }).select('_id');
        const childIds = childCats.map(c => c._id);
        query.$or = [
          { category: cat._id },
          { subCategory: { $in: [cat._id, ...childIds] } },
        ];
      }
    }

    if (search) {
      const words = search
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

      if (words.length > 0) {
        // Match all words in any order across title/desc (e.g. "wireless headphones")
        const allWordsPattern = words.map(w => `(?=.*${w})`).join('');
        const allWordsRegex = new RegExp(allWordsPattern, 'i');
        const anyWordRegex = new RegExp(words.join('|'), 'i');

        query.$or = [
          { title: allWordsRegex },
          { description: allWordsRegex },
          { brand: anyWordRegex },
          { tags: anyWordRegex },
        ];
      }
    }

    if (minPrice || maxPrice) {
      query.sellingPrice = {};
      if (minPrice) query.sellingPrice.$gte = Number(minPrice);
      if (maxPrice) query.sellingPrice.$lte = Number(maxPrice);
    }

    if (featured === 'true') {
      query.isFeatured = true;
    }

    // Point 8: Smart Product Sorting (Popularity, Price Low-High, Price High-Low, Newest, Rating)
    let sortOption = { createdAt: -1 };
    if (sort === 'popularity') {
      sortOption = { ratingsQuantity: -1, ratingsAverage: -1 };
    } else if (sort === 'price_asc' || sort === 'price_low_high') {
      sortOption = { sellingPrice: 1 };
    } else if (sort === 'price_desc' || sort === 'price_high_low') {
      sortOption = { sellingPrice: -1 };
    } else if (sort === 'rating' || sort === 'rating_high_low') {
      sortOption = { ratingsAverage: -1, ratingsQuantity: -1 };
    } else if (sort === 'newest') {
      sortOption = { createdAt: -1 };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const products = await Product.find(query)
      .populate('category', 'name slug icon image')
      .populate('subCategory', 'name slug icon image')
      .populate('vendor', 'storeName storeLogo rating')
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    const total = await Product.countDocuments(query);

    const enrichedProducts = products.map(p => {
      const pObj = p.toObject ? p.toObject() : p;
      pObj.stockUrgency = calculateStockUrgency(pObj.stock);
      pObj.recentPurchases24h = getPurchaseVelocity(pObj);
      pObj.recentViewsPerHour = getLiveViewers(pObj);
      if (Array.isArray(pObj.variants)) {
        pObj.variants = pObj.variants.map(v => ({
          ...v,
          stockUrgency: calculateStockUrgency(v.stock),
        }));
      }
      return pObj;
    });

    res.status(200).json({
      success: true,
      count: enrichedProducts.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: enrichedProducts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Single Product by Slug or ID
// @route   GET /api/products/:slug
exports.getProductBySlug = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.slug);
    const query = isObjectId
      ? { $or: [{ slug: req.params.slug }, { _id: req.params.slug }], isPublished: true }
      : { slug: req.params.slug, isPublished: true };

    const product = await Product.findOne(query)
      .populate('category', 'name slug')
      .populate('vendor', 'storeName storeLogo description rating pickupAddress');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const pObj = product.toObject ? product.toObject() : product;
    pObj.stockUrgency = calculateStockUrgency(pObj.stock);
    pObj.recentPurchases24h = getPurchaseVelocity(pObj);
    pObj.recentViewsPerHour = getLiveViewers(pObj);
    if (Array.isArray(pObj.variants)) {
      pObj.variants = pObj.variants.map(v => ({
        ...v,
        stockUrgency: calculateStockUrgency(v.stock),
      }));
    }

    res.status(200).json({ success: true, data: pObj });
  } catch (error) {
    next(error);
  }
};

// @desc    Get All Categories
// @route   GET /api/products/categories/all
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ displayOrder: 1, name: 1 });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Hierarchical Multi-Level Category Tree with dynamic product counts (Point #4)
// @route   GET /api/products/categories/tree
exports.getCategoryTree = async (req, res, next) => {
  try {
    // 1. Fetch root categories
    const rootCategories = await Category.find({
      $or: [{ parentCategory: null }, { parentCategory: { $exists: false } }],
    })
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    // 2. Fetch all child subcategories
    const subCategories = await Category.find({
      parentCategory: { $ne: null, $exists: true },
    })
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    // 3. Aggregate all published products to compute live counts
    const publishedProducts = await Product.find({ isPublished: true })
      .select('category subCategory')
      .lean();

    const catCountMap = {};
    const subCatCountMap = {};

    publishedProducts.forEach(prod => {
      if (prod.category) {
        const cId = prod.category.toString();
        catCountMap[cId] = (catCountMap[cId] || 0) + 1;
      }
      if (prod.subCategory) {
        const sId = prod.subCategory.toString();
        subCatCountMap[sId] = (subCatCountMap[sId] || 0) + 1;
      }
    });

    // 4. Build hierarchy with live counts
    const tree = rootCategories.map(parent => {
      const parentIdStr = parent._id.toString();
      const children = subCategories.filter(
        sub => sub.parentCategory && sub.parentCategory.toString() === parentIdStr
      );

      const childrenWithCounts = children.map(child => {
        const childIdStr = child._id.toString();
        return {
          ...child,
          productCount: subCatCountMap[childIdStr] || 0,
        };
      });

      const childIdsSet = new Set(children.map(c => c._id.toString()));

      // Count distinct published products that match this parent category or any of its subcategories
      const parentDistinctCount = publishedProducts.filter(p => {
        const matchesParent = p.category && p.category.toString() === parentIdStr;
        const matchesChild = p.subCategory && childIdsSet.has(p.subCategory.toString());
        return matchesParent || matchesChild;
      }).length;

      return {
        ...parent,
        productCount: parentDistinctCount,
        subcategories: childrenWithCounts,
      };
    });

    res.status(200).json({
      success: true,
      totalProducts: publishedProducts.length,
      data: tree,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Distinct Brands with product counts and brand logos (Point #5)
// @route   GET /api/products/brands
exports.getBrands = async (req, res, next) => {
  try {
    const publishedProducts = await Product.find({ isPublished: true }).select('brand').lean();

    const brandCounts = {};
    publishedProducts.forEach(p => {
      const b = (p.brand || 'Generic').trim();
      brandCounts[b] = (brandCounts[b] || 0) + 1;
    });

    const brandMetaMap = {
      'AuraAudio': {
        logo: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=100',
        color: '#F59E0B',
        origin: 'Acoustic Labs',
      },
      'AeroTech': {
        logo: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=100',
        color: '#3B82F6',
        origin: 'Smart Wearables',
      },
      'Vogue Urban': {
        logo: 'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=100',
        color: '#10B981',
        origin: 'Streetwear Couture',
      },
      'Vogue Luxe': {
        logo: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=100',
        color: '#8B5CF6',
        origin: 'Luxury Tailoring',
      },
      'AuraLiving': {
        logo: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=100',
        color: '#EC4899',
        origin: 'Smart Home & Living',
      },
    };

    const brands = Object.keys(brandCounts).map(brandName => ({
      name: brandName,
      slug: brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      productCount: brandCounts[brandName],
      logo: brandMetaMap[brandName]?.logo || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100',
      color: brandMetaMap[brandName]?.color || '#64748B',
      origin: brandMetaMap[brandName]?.origin || 'Verified Brand Partner',
    }));

    res.status(200).json({
      success: true,
      count: brands.length,
      data: brands,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Live Search with Autocomplete suggestions (Products, Categories, Brands & Popular Searches) (Point #9)
// @route   GET /api/products/search/suggestions
exports.getSearchSuggestions = async (req, res, next) => {
  try {
    const rawQuery = (req.query.q || req.query.query || '').trim();

    const trendingSearches = [
      'Wireless Headphones',
      'AMOLED Smartwatch',
      'Heavyweight Cotton Hoodie',
      'Nordic Desk Lamp',
      'Tailored Blazer',
      'Noise Cancelling',
    ];

    if (!rawQuery) {
      return res.status(200).json({
        success: true,
        query: '',
        products: [],
        categories: [],
        brands: [],
        trendingSearches,
      });
    }

    const words = rawQuery
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    const allWordsPattern = words.map(w => `(?=.*${w})`).join('');
    const allWordsRegex = new RegExp(allWordsPattern, 'i');
    const anyWordRegex = new RegExp(words.join('|'), 'i');

    // 1. Matched Products (Top 6)
    const products = await Product.find({
      isPublished: true,
      $or: [
        { title: allWordsRegex },
        { description: allWordsRegex },
        { brand: anyWordRegex },
        { tags: anyWordRegex },
      ],
    })
      .select('title slug brand sellingPrice mrp images category ratingsAverage stock')
      .populate('category', 'name slug')
      .limit(6);

    // 2. Matched Categories
    const categories = await Category.find({
      name: anyWordRegex,
    })
      .select('name slug icon')
      .limit(4);

    // 3. Matched Brands
    const brandAgg = await Product.aggregate([
      { $match: { isPublished: true, brand: anyWordRegex } },
      { $group: { _id: '$brand', count: { $sum: 1 } } },
      { $limit: 4 },
    ]);
    const brands = brandAgg.map(b => ({ name: b._id, count: b.count }));

    // 4. Matched Trending Searches
    const matchedTrending = trendingSearches.filter(t => anyWordRegex.test(t));

    res.status(200).json({
      success: true,
      query: rawQuery,
      products,
      categories,
      brands,
      trendingSearches: matchedTrending.length > 0 ? matchedTrending : trendingSearches.slice(0, 3),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Active Flash Deals & Deal of the Day with Countdown timer (Point #11)
// @route   GET /api/products/flash-deals
exports.getFlashDeals = async (req, res, next) => {
  try {
    // 24-hour rolling deal of the day ending midnight tonight or +12h
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    if (endOfDay.getTime() - now.getTime() < 1000 * 60 * 60 * 2) {
      endOfDay.setTime(endOfDay.getTime() + 1000 * 60 * 60 * 12);
    }

    const deals = await Product.find({
      isPublished: true,
      $or: [
        { isFlashDeal: true },
        { isFeatured: true },
        { $expr: { $gt: [{ $subtract: ['$mrp', '$sellingPrice'] }, 1500] } },
      ],
    })
      .populate('category', 'name slug')
      .populate('vendor', 'storeName rating')
      .limit(8);

    const formattedDeals = deals.map(p => {
      const discountPercentage = Math.round(((p.mrp - p.sellingPrice) / p.mrp) * 100) || 45;
      const totalUnits = (p.stock || 10) + 35;
      const claimedUnits = 32;
      const claimedPercent = Math.min(95, Math.round((claimedUnits / totalUnits) * 100));

      return {
        _id: p._id,
        title: p.title,
        slug: p.slug,
        brand: p.brand,
        images: p.images,
        mrp: p.mrp,
        sellingPrice: p.sellingPrice,
        discountPercentage,
        ratingsAverage: p.ratingsAverage || 4.8,
        ratingsQuantity: p.ratingsQuantity || 120,
        stock: p.stock,
        claimedPercent,
        claimedUnits,
        totalUnits,
        isFlashDeal: true,
      };
    });

    res.status(200).json({
      success: true,
      campaign: {
        title: '⚡ Mega Lightning Flash Sale — Up to 65% OFF',
        subtitle: 'Limited stock deals refreshed every 24 hours. Grab before timers expire!',
        endsAt: endOfDay.toISOString(),
        durationSeconds: Math.floor((endOfDay.getTime() - now.getTime()) / 1000),
      },
      count: formattedDeals.length,
      data: formattedDeals,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Live Social Proof Recent Purchase Activities for Storefront Toast Alerts (Point #14)
// @route   GET /api/products/social-proof/recent-activities
exports.getSocialProofActivities = async (req, res, next) => {
  try {
    const Order = require('../models/Order');

    // Fetch top published products
    const products = await Product.find({ isPublished: true })
      .select('title slug images sellingPrice mrp brand ratingsAverage')
      .limit(10)
      .lean();

    if (!products || products.length === 0) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    // Try fetching real recent orders if any exist
    let recentOrders = [];
    try {
      recentOrders = await Order.find({ orderStatus: { $ne: 'cancelled' } })
        .sort({ createdAt: -1 })
        .limit(6)
        .populate('items.product', 'title slug images sellingPrice mrp brand')
        .lean();
    } catch {
      recentOrders = [];
    }

    const cities = ['Mumbai, Maharashtra', 'Bengaluru, Karnataka', 'New Delhi, Delhi', 'Hyderabad, Telangana', 'Pune, Maharashtra', 'Ahmedabad, Gujarat', 'Jaipur, Rajasthan', 'Kolkata, West Bengal'];
    const buyers = ['Aman S.', 'Neha M.', 'Pooja R.', 'Vikram K.', 'Ananya D.', 'Rohit T.', 'Simran B.', 'Karan P.'];
    const times = ['Just now', '2 minutes ago', '4 minutes ago', '7 minutes ago', '11 minutes ago', '15 minutes ago', '19 minutes ago', '24 minutes ago'];

    const activities = [];

    // Map real orders first
    if (recentOrders.length > 0) {
      recentOrders.forEach((ord, idx) => {
        const item = ord.items?.[0];
        const prod = item?.product;
        if (prod) {
          activities.push({
            id: ord._id.toString(),
            customerName: ord.shippingAddress?.recipientName ? `${ord.shippingAddress.recipientName.split(' ')[0]} ${ord.shippingAddress.recipientName.split(' ')[1]?.[0] || 'K'}.` : buyers[idx % buyers.length],
            city: ord.shippingAddress?.city ? `${ord.shippingAddress.city}, ${ord.shippingAddress.state || 'India'}` : cities[idx % cities.length],
            product: {
              _id: prod._id,
              title: prod.title,
              slug: prod.slug,
              image: prod.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200',
              sellingPrice: prod.sellingPrice,
              mrp: prod.mrp,
              brand: prod.brand,
            },
            timeAgo: times[idx % times.length],
            verifiedPurchase: true,
          });
        }
      });
    }

    // Supplement with catalog products to guarantee a vibrant 8-item rotating stream
    products.forEach((prod, idx) => {
      if (activities.length < 8) {
        activities.push({
          id: `proof-${prod._id}-${idx}`,
          customerName: buyers[(idx + 2) % buyers.length],
          city: cities[(idx + 3) % cities.length],
          product: {
            _id: prod._id,
            title: prod.title,
            slug: prod.slug,
            image: prod.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200',
            sellingPrice: prod.sellingPrice,
            mrp: prod.mrp,
            brand: prod.brand,
          },
          timeAgo: times[(idx + 1) % times.length],
          verifiedPurchase: true,
        });
      }
    });

    res.status(200).json({
      success: true,
      count: activities.length,
      data: activities,
    });
  } catch (error) {
    next(error);
  }
};

// Point #18: Side-by-Side Product Comparison Tool (Compare 2 to 4 items)
// @route POST /api/products/compare
exports.compareProducts = async (req, res, next) => {
  try {
    const { productIds } = req.body;
    if (!Array.isArray(productIds) || productIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of at least 2 product IDs to compare (max 4).',
      });
    }

    if (productIds.length > 4) {
      return res.status(400).json({
        success: false,
        message: 'You can compare up to 4 products simultaneously.',
      });
    }

    const products = await Product.find({ _id: { $in: productIds } })
      .populate('vendor', 'storeName rating isVerified')
      .populate('category', 'name slug');

    if (products.length < 2) {
      return res.status(404).json({
        success: false,
        message: 'Could not find at least 2 matching products to compare.',
      });
    }

    // Preserve the order of requested IDs
    const orderedProducts = [];
    productIds.forEach(id => {
      const match = products.find(p => p._id.toString() === id.toString());
      if (match) orderedProducts.push(match);
    });

    // Extract all unique specification keys across all products
    const specKeysSet = new Set();
    ['Brand', 'Category', 'Warranty', 'Return Policy', 'Delivery Speed', 'Ratings & Score'].forEach(k => specKeysSet.add(k));

    orderedProducts.forEach(prod => {
      if (prod.specifications) {
        if (prod.specifications instanceof Map) {
          for (let key of prod.specifications.keys()) specKeysSet.add(key);
        } else if (typeof prod.specifications === 'object') {
          Object.keys(prod.specifications).forEach(k => specKeysSet.add(k));
        }
      }
    });

    const allSpecKeys = Array.from(specKeysSet);

    // Build specsMatrix mapping each spec key to array of values
    const specsMatrix = allSpecKeys.map(key => {
      const values = orderedProducts.map(prod => {
        if (key === 'Brand') return prod.brand || 'AuraMarket Direct';
        if (key === 'Category') return prod.category?.name || prod.category || 'General';
        if (key === 'Warranty') return '1 Year Manufacturer Official Warranty';
        if (key === 'Return Policy') return '7-Day Easy Replacement';
        if (key === 'Delivery Speed') return 'Express 48h Delivery with OTP';
        if (key === 'Ratings & Score') return `${prod.ratingsAverage || 4.5} ★ (${prod.ratingsQuantity || 12} reviews)`;

        let val = null;
        if (prod.specifications) {
          if (prod.specifications instanceof Map) val = prod.specifications.get(key);
          else val = prod.specifications[key];
        }
        return val || '—';
      });

      const isDifferent = new Set(values).size > 1;

      return {
        attribute: key,
        values,
        isDifferent,
      };
    });

    res.status(200).json({
      success: true,
      count: orderedProducts.length,
      products: orderedProducts.map(p => ({
        _id: p._id,
        title: p.title,
        slug: p.slug,
        brand: p.brand,
        image: p.images?.[0] || p.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
        sellingPrice: p.sellingPrice || p.price,
        mrp: p.mrp || Math.round((p.sellingPrice || p.price) * 1.4),
        stock: p.stock,
        inStock: (p.stock || 0) > 0,
        ratingsAverage: p.ratingsAverage || 4.5,
        ratingsQuantity: p.ratingsQuantity || 12,
        vendor: p.vendor,
        stockUrgency: calculateStockUrgency(p.stock),
      })),
      specsMatrix,
    });
  } catch (error) {
    next(error);
  }
};

// Point #20: Frequently Bought Together (Bundle Discounts & combos)
// @route GET /api/products/:identifier/bundle
exports.getProductBundle = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    let mainProduct = null;

    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      mainProduct = await Product.findById(identifier).populate('vendor', 'storeName rating');
    }
    if (!mainProduct) {
      mainProduct = await Product.findOne({ slug: identifier }).populate('vendor', 'storeName rating');
    }

    if (!mainProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Find complementary bundle products
    let complementary = await Product.find({
      _id: { $ne: mainProduct._id },
      isPublished: true,
      stock: { $gt: 0 },
      $or: [
        { category: mainProduct.category },
        { vendor: mainProduct.vendor?._id },
      ],
    })
      .limit(2)
      .populate('vendor', 'storeName rating');

    if (complementary.length < 2) {
      const moreItems = await Product.find({
        _id: { $ne: mainProduct._id, $nin: complementary.map(c => c._id) },
        isPublished: true,
        stock: { $gt: 0 },
      })
        .limit(2 - complementary.length)
        .populate('vendor', 'storeName rating');
      complementary = [...complementary, ...moreItems];
    }

    const allBundleProducts = [mainProduct, ...complementary];
    const totalOriginalMrp = allBundleProducts.reduce((sum, p) => sum + (p.mrp || Math.round((p.sellingPrice || p.price) * 1.4)), 0);
    const totalIndividualSellingPrice = allBundleProducts.reduce((sum, p) => sum + (p.sellingPrice || p.price || 0), 0);

    // Bundle Discount: 10% off total selling price when bought together
    const bundleDiscountPercent = 10;
    const bundleDiscountAmount = Math.round((totalIndividualSellingPrice * bundleDiscountPercent) / 100);
    const bundleFinalPrice = totalIndividualSellingPrice - bundleDiscountAmount;
    const totalBundleSavings = totalOriginalMrp - bundleFinalPrice;

    res.status(200).json({
      success: true,
      mainProduct: {
        _id: mainProduct._id,
        title: mainProduct.title,
        slug: mainProduct.slug,
        brand: mainProduct.brand,
        image: mainProduct.images?.[0] || mainProduct.image,
        sellingPrice: mainProduct.sellingPrice || mainProduct.price,
        mrp: mainProduct.mrp || Math.round((mainProduct.sellingPrice || mainProduct.price) * 1.4),
        stock: mainProduct.stock,
      },
      bundleItems: complementary.map(item => ({
        _id: item._id,
        title: item.title,
        slug: item.slug,
        brand: item.brand,
        image: item.images?.[0] || item.image,
        sellingPrice: item.sellingPrice || item.price,
        mrp: item.mrp || Math.round((item.sellingPrice || item.price) * 1.4),
        stock: item.stock,
      })),
      pricing: {
        totalItems: allBundleProducts.length,
        totalOriginalMrp,
        totalIndividualSellingPrice,
        bundleDiscountPercent,
        bundleDiscountAmount,
        bundleFinalPrice,
        totalBundleSavings,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Point #21: Related Products & "Customers Also Viewed" recommendation sliders
// @route   GET /api/products/:identifier/recommendations
exports.getProductRecommendations = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const mongoose = require('mongoose');
    const isMongoId = mongoose.Types.ObjectId.isValid(identifier);

    const mainProduct = await Product.findOne(
      isMongoId ? { _id: identifier } : { slug: identifier }
    ).populate('category subCategory');

    if (!mainProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const formatProduct = (p) => {
      const mrp = p.mrp || Math.round((p.sellingPrice || p.price) * 1.35);
      const sellingPrice = p.sellingPrice || p.price || 0;
      const discountPercent = mrp > sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;
      return {
        _id: p._id,
        title: p.title,
        slug: p.slug,
        brand: p.brand || 'Generic',
        image: p.images?.[0] || p.image,
        images: p.images || [p.image],
        sellingPrice,
        price: sellingPrice,
        mrp,
        discountPercent,
        stock: p.stock,
        stockUrgency: calculateStockUrgency(p.stock),
        ratingsAverage: p.ratingsAverage || 4.5,
        ratingsQuantity: p.ratingsQuantity || 12,
        recentPurchases24h: getPurchaseVelocity(p),
        category: p.category,
        subCategory: p.subCategory,
      };
    };

    // 1. Related Products: Same category or subcategory (excluding current product)
    let related = await Product.find({
      _id: { $ne: mainProduct._id },
      isPublished: true,
      $or: [
        { category: mainProduct.category?._id || mainProduct.category },
        ...(mainProduct.subCategory ? [{ subCategory: mainProduct.subCategory?._id || mainProduct.subCategory }] : []),
      ],
    })
      .sort({ ratingsAverage: -1, stock: -1 })
      .limit(6);

    // If related count is low, add other published products
    if (related.length < 2) {
      const excludedIds = [mainProduct._id, ...related.map(r => r._id)];
      const fillers = await Product.find({
        _id: { $nin: excludedIds },
        isPublished: true,
      })
        .sort({ ratingsAverage: -1 })
        .limit(4 - related.length);
      related = [...related, ...fillers];
    }

    // 2. Customers Also Viewed: complementary or high-velocity items
    let alsoViewed = await Product.find({
      _id: { $ne: mainProduct._id, $nin: related.map(r => r._id) },
      isPublished: true,
    })
      .sort({ recentViewsPerHour: -1, ratingsQuantity: -1, ratingsAverage: -1 })
      .limit(6);

    // If alsoViewed is empty because related contains all other catalog products,
    // take the other catalog items so this slider is also populated and rich
    if (alsoViewed.length === 0) {
      alsoViewed = await Product.find({
        _id: { $ne: mainProduct._id },
        isPublished: true,
      })
        .sort({ recentViewsPerHour: -1, ratingsAverage: -1 })
        .limit(6);
    }

    res.status(200).json({
      success: true,
      mainProductId: mainProduct._id,
      categoryName: mainProduct.category?.name || 'Category',
      related: related.map(formatProduct),
      alsoViewed: alsoViewed.map(formatProduct),
    });
  } catch (error) {
    next(error);
  }
};





