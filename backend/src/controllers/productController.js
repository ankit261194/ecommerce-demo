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


