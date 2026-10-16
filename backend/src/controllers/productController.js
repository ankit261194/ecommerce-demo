const Product = require('../models/Product');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const fuzzySearchService = require('../services/fuzzySearchService');
const visualSearchService = require('../services/visualSearchService');

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
    const {
      category,
      subCategory,
      brand,
      minRating,
      rating,
      search,
      minPrice,
      maxPrice,
      inStock,
      onSale,
      featured,
      sort,
      page = 1,
      limit = 20,
      // Point 14: Dynamic Multi-Facet Attribute Filtering
      ram,
      storage,
      color,
      size,
      fabric,
      battery,
    } = req.query;

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

    // Point 14: Dynamic Multi-Facet Attribute Filtering Conditions
    const andConditions = [];

    if (ram) {
      const ramList = ram.split(',').map(r => r.trim()).filter(Boolean);
      const ramRegexes = ramList.map(r => new RegExp(r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
      andConditions.push({
        $or: [
          { 'variants.attributes.ram': { $in: ramRegexes } },
          {
            specifications: {
              $elemMatch: {
                key: { $regex: /ram|memory/i },
                value: { $in: ramRegexes },
              },
            },
          },
          { title: { $in: ramRegexes } },
          { description: { $in: ramRegexes } },
        ],
      });
    }

    if (storage) {
      const storageList = storage.split(',').map(s => s.trim()).filter(Boolean);
      const storageRegexes = storageList.map(s => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
      andConditions.push({
        $or: [
          { 'variants.attributes.storage': { $in: storageRegexes } },
          {
            specifications: {
              $elemMatch: {
                key: { $regex: /storage|rom|capacity/i },
                value: { $in: storageRegexes },
              },
            },
          },
          { title: { $in: storageRegexes } },
          { description: { $in: storageRegexes } },
        ],
      });
    }

    if (color) {
      const colorList = color.split(',').map(c => c.trim()).filter(Boolean);
      const colorRegexes = colorList.map(c => new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
      andConditions.push({
        $or: [
          { 'variants.attributes.color': { $in: colorRegexes } },
          { 'variants.name': { $in: colorRegexes } },
          {
            specifications: {
              $elemMatch: {
                key: { $regex: /color/i },
                value: { $in: colorRegexes },
              },
            },
          },
          { title: { $in: colorRegexes } },
        ],
      });
    }

    if (size) {
      const sizeList = size.split(',').map(s => s.trim()).filter(Boolean);
      const sizeRegexes = sizeList.map(s => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
      andConditions.push({
        $or: [
          { 'variants.attributes.size': { $in: sizeRegexes } },
          { 'variants.name': { $in: sizeRegexes } },
          {
            specifications: {
              $elemMatch: {
                key: { $regex: /size/i },
                value: { $in: sizeRegexes },
              },
            },
          },
        ],
      });
    }

    if (fabric) {
      const fabricList = fabric.split(',').map(f => f.trim()).filter(Boolean);
      const fabricRegexes = fabricList.map(f => new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
      andConditions.push({
        $or: [
          {
            specifications: {
              $elemMatch: {
                key: { $regex: /fabric|material/i },
                value: { $in: fabricRegexes },
              },
            },
          },
          { description: { $in: fabricRegexes } },
          { tags: { $in: fabricRegexes } },
        ],
      });
    }

    if (battery) {
      const batteryList = battery.split(',').map(b => b.trim()).filter(Boolean);
      const batteryRegexes = batteryList.map(b => new RegExp(b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
      andConditions.push({
        $or: [
          {
            specifications: {
              $elemMatch: {
                key: { $regex: /battery/i },
                value: { $in: batteryRegexes },
              },
            },
          },
          { description: { $in: batteryRegexes } },
        ],
      });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
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

    // Point #20: Interactive Color & Image Swatches with Dynamic SKU Switch
    const requestedSku = req.query.sku ? req.query.sku.trim() : null;
    let activeVariant = null;

    if (Array.isArray(pObj.variants) && pObj.variants.length > 0) {
      if (requestedSku) {
        activeVariant = pObj.variants.find(v => v.sku.toLowerCase() === requestedSku.toLowerCase()) || null;
      }
      if (!activeVariant) {
        activeVariant = pObj.variants[0];
      }
    }

    if (activeVariant) {
      pObj.activeSku = activeVariant.sku;
      pObj.activeVariant = activeVariant;
      pObj.activePrice = (pObj.sellingPrice || 0) + (activeVariant.additionalPrice || 0);
      pObj.activeMrp = (pObj.mrp || Math.round((pObj.sellingPrice || 0) * 1.5)) + (activeVariant.additionalPrice || 0);
      pObj.activeStock = activeVariant.stock;
      pObj.activeImage = activeVariant.image || pObj.images?.[0] || '';
      pObj.activeStockUrgency = calculateStockUrgency(activeVariant.stock);
    } else {
      pObj.activeSku = pObj.sku;
      pObj.activeVariant = null;
      pObj.activePrice = pObj.sellingPrice || 0;
      pObj.activeMrp = pObj.mrp || Math.round((pObj.sellingPrice || 0) * 1.5);
      pObj.activeStock = pObj.stock || 0;
      pObj.activeImage = pObj.images?.[0] || '';
      pObj.activeStockUrgency = calculateStockUrgency(pObj.stock);
    }

    // Color hex helper
    const resolveColorHex = (colName, colCode) => {
      if (colCode && colCode.startsWith('#')) return colCode;
      const c = (colName || '').toLowerCase();
      if (c.includes('black') || c.includes('obsidian') || c.includes('charcoal')) return '#0f172a';
      if (c.includes('silver') || c.includes('grey') || c.includes('gray')) return '#94a3b8';
      if (c.includes('white') || c.includes('ivory')) return '#f8fafc';
      if (c.includes('red') || c.includes('crimson') || c.includes('ruby')) return '#ef4444';
      if (c.includes('blue') || c.includes('navy') || c.includes('sapphire')) return '#3b82f6';
      if (c.includes('green') || c.includes('olive') || c.includes('emerald')) return '#10b981';
      if (c.includes('gold') || c.includes('yellow') || c.includes('amber')) return '#f59e0b';
      if (c.includes('purple') || c.includes('violet')) return '#8b5cf6';
      if (c.includes('pink') || c.includes('rose')) return '#ec4899';
      return '#64748b';
    };

    // Extract structured Swatch Matrix
    const colorSwatchesMap = new Map();
    const sizeSwatchesMap = new Map();
    const imageThumbnails = [];

    if (Array.isArray(pObj.variants)) {
      pObj.variants.forEach(v => {
        const colorName = v.attributes?.color || (v.name && v.name.includes('/') ? v.name.split('/')[1]?.trim() : v.name);
        if (colorName && !colorSwatchesMap.has(colorName.toLowerCase())) {
          colorSwatchesMap.set(colorName.toLowerCase(), {
            sku: v.sku,
            name: colorName,
            colorCode: resolveColorHex(colorName, v.colorCode || v.attributes?.colorCode),
            image: v.image || pObj.images?.[0] || '',
            additionalPrice: v.additionalPrice || 0,
            sellingPrice: (pObj.sellingPrice || 0) + (v.additionalPrice || 0),
            stock: v.stock,
            isAvailable: v.stock > 0,
            isSelected: activeVariant ? activeVariant.sku === v.sku : false,
          });
        }

        const sizeName = v.attributes?.size || v.attributes?.storage;
        if (sizeName && !sizeSwatchesMap.has(sizeName.toLowerCase())) {
          sizeSwatchesMap.set(sizeName.toLowerCase(), {
            sku: v.sku,
            size: sizeName,
            additionalPrice: v.additionalPrice || 0,
            sellingPrice: (pObj.sellingPrice || 0) + (v.additionalPrice || 0),
            stock: v.stock,
            isAvailable: v.stock > 0,
            isSelected: activeVariant ? activeVariant.sku === v.sku : false,
          });
        }

        if (v.image) {
          imageThumbnails.push({
            sku: v.sku,
            name: v.name,
            image: v.image,
            colorName: colorName || v.name,
            colorCode: resolveColorHex(colorName || v.name, v.colorCode),
            sellingPrice: (pObj.sellingPrice || 0) + (v.additionalPrice || 0),
            stock: v.stock,
            isAvailable: v.stock > 0,
            isSelected: activeVariant ? activeVariant.sku === v.sku : false,
          });
        }
      });
    }

    pObj.swatchMatrix = {
      colors: Array.from(colorSwatchesMap.values()),
      sizes: Array.from(sizeSwatchesMap.values()),
      imageThumbnails,
    };

    res.status(200).json({ success: true, data: pObj });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Product & Variant state by SKU (Global SKU Lookup)
// @route   GET /api/products/sku/:sku
exports.getProductBySku = async (req, res, next) => {
  try {
    const rawSku = req.params.sku ? req.params.sku.trim() : '';
    if (!rawSku) {
      return res.status(400).json({ success: false, message: 'SKU parameter is required' });
    }

    const skuRegex = new RegExp(`^${rawSku}$`, 'i');
    const product = await Product.findOne({
      $or: [{ sku: skuRegex }, { 'variants.sku': skuRegex }],
      isPublished: true,
    })
      .populate('category', 'name slug')
      .populate('vendor', 'storeName storeLogo rating');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product with SKU '${rawSku}' not found in catalog`,
      });
    }

    const pObj = product.toObject ? product.toObject() : product;
    let matchedVariant = null;
    if (Array.isArray(pObj.variants)) {
      matchedVariant = pObj.variants.find(v => v.sku.toLowerCase() === rawSku.toLowerCase()) || null;
    }

    const currentSellingPrice = matchedVariant
      ? (pObj.sellingPrice || 0) + (matchedVariant.additionalPrice || 0)
      : pObj.sellingPrice || 0;
    const currentMrp = matchedVariant
      ? (pObj.mrp || Math.round((pObj.sellingPrice || 0) * 1.5)) + (matchedVariant.additionalPrice || 0)
      : pObj.mrp || Math.round((pObj.sellingPrice || 0) * 1.5);
    const currentStock = matchedVariant ? matchedVariant.stock : pObj.stock;
    const currentImage = (matchedVariant && matchedVariant.image) ? matchedVariant.image : (pObj.images?.[0] || '');
    const stockUrgency = calculateStockUrgency(currentStock);

    res.status(200).json({
      success: true,
      data: {
        product: pObj,
        activeSku: rawSku,
        isVariant: Boolean(matchedVariant),
        matchedVariant,
        currentSellingPrice,
        currentMrp,
        currentStock,
        currentImage,
        stockUrgency,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add or Update Product Variants with Swatches (Color, Image, SKU)
// @route   PUT /api/products/:id/variants
exports.updateProductVariants = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { variants } = req.body;

    if (!Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({ success: false, message: 'Variants array is required' });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Role check: Admin or product vendor owner
    const isAdmin = ['superadmin', 'admin'].includes(req.user?.role);
    const isVendorOwner = req.vendorProfile && product.vendor?.toString() === req.vendorProfile._id?.toString();
    if (!isAdmin && !isVendorOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized to modify variants for this product' });
    }

    // Validate SKU uniqueness within the list
    const seenSkus = new Set();
    for (const v of variants) {
      if (!v.sku || !v.name) {
        return res.status(400).json({ success: false, message: 'Each variant must have a valid SKU and name' });
      }
      const lower = v.sku.trim().toLowerCase();
      if (seenSkus.has(lower)) {
        return res.status(400).json({ success: false, message: `Duplicate SKU '${v.sku}' found in variants` });
      }
      seenSkus.add(lower);
    }

    product.hasVariants = true;
    product.variants = variants.map(v => ({
      sku: v.sku.trim(),
      name: v.name.trim(),
      attributes: v.attributes || {
        color: v.color || '',
        size: v.size || '',
        colorCode: v.colorCode || '#000000',
      },
      colorCode: v.colorCode || '#000000',
      image: v.image || '',
      additionalPrice: Number(v.additionalPrice || 0),
      mrp: Number(v.mrp || 0),
      sellingPrice: Number(v.sellingPrice || 0),
      stock: Math.max(0, Number(v.stock || 0)),
      lowStockThreshold: Number(v.lowStockThreshold || 5),
    }));

    // Update total product stock to be at least sum of variant stocks
    const totalVariantStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
    product.stock = totalVariantStock;

    await product.save();

    res.status(200).json({
      success: true,
      message: `Successfully updated ${product.variants.length} variant swatches`,
      data: product,
    });
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

// @desc    Typo-Tolerant Instant Fuzzy Search Engine (Point 7)
// @route   GET /api/products/search/fuzzy
exports.fuzzySearchProducts = async (req, res, next) => {
  try {
    const rawQuery = (req.query.q || req.query.query || '').trim();
    const limit = parseInt(req.query.limit, 10) || 20;
    const categoryFilter = req.query.category || null;
    const brandFilter = req.query.brand || null;

    if (!rawQuery) {
      return res.status(200).json({
        success: true,
        query: '',
        correctedQuery: '',
        hasCorrection: false,
        didYouMean: null,
        results: [],
        totalCount: 0,
      });
    }

    const searchOutput = await fuzzySearchService.performFuzzySearch({
      query: rawQuery,
      ProductModel: Product,
      CategoryModel: Category,
      BrandModel: Brand,
      limit,
      categoryFilter,
      brandFilter,
    });

    res.status(200).json({
      success: true,
      ...searchOutput,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Visual Image Search ("Upload photo/screenshot to find similar products") (Point 8)
// @route   POST /api/products/search/visual
exports.visualSearchProducts = async (req, res, next) => {
  try {
    const { image, categoryFilter, minConfidence, limit } = req.body;

    if (!image || typeof image !== 'string' || image.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Image payload is required (Base64 data URI, image URL, or sample preset ID)',
      });
    }

    // 1. Extract visual characteristics (dominant colors, detected category, visual tags)
    const detectedFeatures = visualSearchService.extractVisualFeatures(image, {
      category: categoryFilter,
    });

    // 2. Fetch published products
    const products = await Product.find({ isPublished: true })
      .populate('category', 'name slug')
      .populate('vendor', 'storeName storeLogo rating');

    // 3. Score and rank visual similarity
    const matchedProducts = visualSearchService.searchSimilarProducts(detectedFeatures, products, {
      minConfidence: minConfidence !== undefined ? Number(minConfidence) : 0.30,
      categoryFilter,
      limit: limit ? Number(limit) : 20,
    });

    res.status(200).json({
      success: true,
      count: matchedProducts.length,
      detectedFeatures,
      products: matchedProducts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Curated Visual Search Samples & Presets (Point 8)
// @route   GET /api/products/search/visual/samples
exports.getVisualSearchSamples = async (req, res, next) => {
  try {
    const samples = visualSearchService.getSampleVisualQueries();
    res.status(200).json({
      success: true,
      count: samples.length,
      samples,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Product 3D Model & WebXR / AR configuration (Point 10)
// @route   GET /api/products/:identifier/3d-model
exports.getProduct3DModel = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.identifier);
    const query = isObjectId
      ? { $or: [{ slug: req.params.identifier }, { _id: req.params.identifier }] }
      : { slug: req.params.identifier };

    const product = await Product.findOne(query)
      .populate('category', 'name slug')
      .populate('vendor', 'storeName rating');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const title = product.title || 'Product';
    const catName = (product.category?.name || product.categoryLabel || '').toLowerCase();

    // Determine intuitive default tryOnType based on category if not explicitly set
    let defaultTryOn = 'generic_360';
    if (catName.includes('watch') || title.toLowerCase().includes('watch')) {
      defaultTryOn = 'wrist';
    } else if (catName.includes('audio') || title.toLowerCase().includes('headphone')) {
      defaultTryOn = 'head';
    } else if (catName.includes('glass') || title.toLowerCase().includes('eyewear')) {
      defaultTryOn = 'face';
    } else if (catName.includes('furniture') || catName.includes('home') || title.toLowerCase().includes('lamp')) {
      defaultTryOn = 'floor_plane';
    }

    const arConfig = product.ar3dModel || {};
    const tryOnType = arConfig.tryOnType && arConfig.tryOnType !== 'generic_360' ? arConfig.tryOnType : defaultTryOn;
    const glbUrl = arConfig.glbUrl || `https://modelviewer.dev/shared-assets/models/Astronaut.glb`;
    const usdzUrl = arConfig.usdzUrl || '';

    // Mobile WebXR Deep Links:
    // Android Scene Viewer Intent
    const sceneViewerIntent = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(glbUrl)}&mode=ar_preferred&title=${encodeURIComponent(title)}#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=https://developers.google.com/ar;end;`;
    
    // WebXR universal launch QR link
    const webxrViewerUrl = `https://shribalajikripadham.online/ecommerce-demo/#ar-view?id=${product._id}&type=${tryOnType}`;

    res.status(200).json({
      success: true,
      productId: product._id,
      title: product.title,
      slug: product.slug,
      brand: product.brand,
      thumbnail: product.thumbnail || product.images?.[0] || '',
      sellingPrice: product.sellingPrice,
      mrp: product.mrp,
      ar3dModel: {
        enabled: arConfig.enabled !== false,
        modelType: arConfig.modelType || 'procedural',
        glbUrl,
        usdzUrl,
        tryOnType,
        scale: arConfig.scale || 1.0,
        dimensions: arConfig.dimensions || { widthCm: 15, heightCm: 18, depthCm: 8 },
        features: {
          supportsARQuickLook: true,
          supportsSceneViewer: true,
          supportsWebcamTryOn: true,
        },
        deepLinks: {
          sceneViewerIntent,
          webxrViewerUrl,
          qrPayload: webxrViewerUrl,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Product 3D Model Configuration (Point 10)
// @route   PUT /api/products/:id/3d-model
exports.updateProduct3DModel = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const { enabled, modelType, glbUrl, usdzUrl, tryOnType, scale, dimensions } = req.body;

    product.ar3dModel = {
      ...(product.ar3dModel?.toObject ? product.ar3dModel.toObject() : product.ar3dModel),
      ...(enabled !== undefined && { enabled: Boolean(enabled) }),
      ...(modelType && { modelType }),
      ...(glbUrl !== undefined && { glbUrl }),
      ...(usdzUrl !== undefined && { usdzUrl }),
      ...(tryOnType && { tryOnType }),
      ...(scale !== undefined && { scale: Number(scale) }),
      ...(dimensions && { dimensions }),
    };

    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product 3D/AR model settings updated successfully',
      data: product.ar3dModel,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Real-Time Stock Scarcity & Fast Delivery Countdown ("Order within X mins") (Point 11)
// @route   GET /api/products/:identifier/delivery-countdown
exports.getDeliveryCountdown = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.identifier);
    const query = isObjectId
      ? { $or: [{ slug: req.params.identifier }, { _id: req.params.identifier }] }
      : { slug: req.params.identifier };

    const product = await Product.findOne(query);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const rawPincode = (req.query.pincode || req.query.pin || '110001').trim();
    const pincode = /^[1-9][0-9]{5}$/.test(rawPincode) ? rawPincode : '110001';

    // Metro Pincode prefix lookup for express next-day delivery
    const metroPrefixes = ['11', '12', '20', '40', '56', '70', '50', '60', '38', '41'];
    const isMetro = metroPrefixes.some(prefix => pincode.startsWith(prefix));

    // Time calculations in IST (UTC + 5:30)
    const nowUtc = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowIst = new Date(nowUtc.getTime() + istOffset);

    // Daily dispatch cutoff: 19:00 IST (7:00 PM)
    const cutoffHour = 19;
    const cutoffDate = new Date(nowIst);
    cutoffDate.setUTCHours(cutoffHour, 0, 0, 0);

    let isBeforeCutoff = true;
    if (nowIst.getUTCHours() >= cutoffHour) {
      isBeforeCutoff = false;
      // Cutoff moves to tomorrow 19:00 IST
      cutoffDate.setUTCDate(cutoffDate.getUTCDate() + 1);
    }

    const remainingMs = Math.max(1000, cutoffDate.getTime() - nowIst.getTime());
    const remainingSeconds = Math.floor(remainingMs / 1000);
    const hoursLeft = Math.floor(remainingSeconds / 3600);
    const minutesLeft = Math.floor((remainingSeconds % 3600) / 60);
    const secondsLeft = remainingSeconds % 60;

    const formattedCountdown = `${String(hoursLeft).padStart(2, '0')}h ${String(minutesLeft).padStart(2, '0')}m ${String(secondsLeft).padStart(2, '0')}s`;

    // Calculate Estimated Delivery Date
    const deliveryDays = isMetro ? (isBeforeCutoff ? 1 : 2) : (isBeforeCutoff ? 2 : 3);
    const estDelivery = new Date(nowIst);
    estDelivery.setUTCDate(estDelivery.getUTCDate() + deliveryDays);

    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const deliveryDayName = weekdays[estDelivery.getUTCDay()];
    const formattedDeliveryDate = deliveryDays === 1
      ? `Tomorrow (${deliveryDayName}) by 2:00 PM`
      : `${deliveryDayName} by 5:00 PM`;

    // Dynamic Live Cart Holders (Social Scarcity)
    const stock = product.stock !== undefined ? product.stock : 10;
    const liveCartHolders = stock > 0 ? Math.min(18, Math.max(3, (stock % 7) + 5)) : 0;

    res.status(200).json({
      success: true,
      productId: product._id,
      title: product.title,
      pincode,
      isMetro,
      isNextDayEligible: isMetro && isBeforeCutoff,
      cutoffTime: '19:00:00 IST',
      remainingSeconds,
      hoursLeft,
      minutesLeft,
      secondsLeft,
      formattedCountdown,
      deliveryDays,
      estimatedDeliveryDate: estDelivery.toISOString(),
      formattedDeliveryDate,
      courierPartner: isMetro ? 'Bluedart Air Express' : 'Delhivery Surface Plus',
      liveCartHolders,
      stockUrgency: {
        stock,
        isLowStock: stock <= 10,
        isCritical: stock <= 5,
        stockMessage: stock <= 0
          ? 'Out of Stock'
          : stock <= 5
          ? `Hurry! Only ${stock} left in stock!`
          : stock <= 10
          ? `Low stock: ${stock} units remaining`
          : 'In Stock — Ready to ship',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Live Search with Autocomplete suggestions (Products, Categories, Brands & Popular Searches) (Point #9 & Point 7)
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
        didYouMean: null,
        correctedQuery: null,
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
    let products = await Product.find({
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
    let categories = await Category.find({
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
    let brands = brandAgg.map(b => ({ name: b._id, count: b.count }));

    // 4. Point 7: Typo-Tolerance & Auto-Correction Fallback
    let didYouMean = null;
    let correctedQuery = null;

    if (products.length < 3) {
      try {
        const fuzzyOutput = await fuzzySearchService.performFuzzySearch({
          query: rawQuery,
          ProductModel: Product,
          CategoryModel: Category,
          BrandModel: Brand,
          limit: 6,
        });

        if (fuzzyOutput.hasCorrection) {
          didYouMean = fuzzyOutput.didYouMean;
          correctedQuery = fuzzyOutput.correctedQuery;
        }

        if (products.length === 0 && fuzzyOutput.results.length > 0) {
          products = fuzzyOutput.results;
        }
      } catch (fErr) {
        console.warn('[FuzzySearch] Suggestion fallback warning:', fErr.message);
      }
    }

    // 5. Matched Trending Searches
    const matchedTrending = trendingSearches.filter(t => anyWordRegex.test(t));

    res.status(200).json({
      success: true,
      query: rawQuery,
      products,
      categories,
      brands,
      didYouMean,
      correctedQuery,
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
        if (Array.isArray(prod.specifications)) {
          prod.specifications.forEach(spec => {
            if (spec && spec.key) specKeysSet.add(spec.key);
          });
        } else if (prod.specifications instanceof Map) {
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
          if (Array.isArray(prod.specifications)) {
            const found = prod.specifications.find(s => s && (s.key === key || s.name === key));
            if (found) val = found.value;
          } else if (prod.specifications instanceof Map) {
            val = prod.specifications.get(key);
          } else if (typeof prod.specifications === 'object') {
            val = prod.specifications[key];
          }
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

// ============================================================================
// Point 14: Dynamic Multi-Facet Attribute Filtering Grid Aggregator
// @desc    Get dynamic attribute facets (RAM, Storage, Color, Size, Fabric, Battery, Price Bounds, Ratings)
// @route   GET /api/products/facets
// @access  Public
// ============================================================================
exports.getProductFacets = async (req, res, next) => {
  try {
    const { category, subCategory, brand, search } = req.query;
    const scopeQuery = { isPublished: true };

    if (brand && brand !== 'all') {
      const brandList = brand.split(',').map(b => b.trim()).filter(Boolean);
      scopeQuery.brand =
        brandList.length === 1
          ? new RegExp(`^${brandList[0]}$`, 'i')
          : { $in: brandList.map(b => new RegExp(`^${b}$`, 'i')) };
    }

    if (subCategory) {
      const subCat = await Category.findOne({
        $or: [
          { slug: subCategory },
          { _id: require('mongoose').Types.ObjectId.isValid(subCategory) ? subCategory : null },
        ],
      });
      if (subCat) {
        scopeQuery.$or = [{ subCategory: subCat._id }, { category: subCat._id }];
      }
    } else if (category && category !== 'all') {
      const cat = await Category.findOne({
        $or: [
          { slug: category },
          { _id: require('mongoose').Types.ObjectId.isValid(category) ? category : null },
        ],
      });
      if (cat) {
        const childCats = await Category.find({ parentCategory: cat._id }).select('_id');
        const childIds = childCats.map(c => c._id);
        scopeQuery.$or = [
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
        const allWordsPattern = words.map(w => `(?=.*${w})`).join('');
        const allWordsRegex = new RegExp(allWordsPattern, 'i');
        const anyWordRegex = new RegExp(words.join('|'), 'i');
        scopeQuery.$or = [
          { title: allWordsRegex },
          { description: allWordsRegex },
          { brand: anyWordRegex },
          { tags: anyWordRegex },
        ];
      }
    }

    const allProducts = await Product.find(scopeQuery).lean();

    const ramMap = {};
    const storageMap = {};
    const colorMap = {};
    const sizeMap = {};
    const fabricMap = {};
    const batteryMap = {};
    const brandMap = {};

    let minPrice = Infinity;
    let maxPrice = -Infinity;

    allProducts.forEach(p => {
      const price = Number(p.sellingPrice) || 0;
      if (price < minPrice) minPrice = price;
      if (price > maxPrice) maxPrice = price;

      if (p.brand) {
        const b = p.brand.trim();
        brandMap[b] = (brandMap[b] || 0) + 1;
      }

      // Check specifications
      (p.specifications || []).forEach(spec => {
        const k = (spec.key || '').trim().toLowerCase();
        const v = (spec.value || '').trim();
        if (!v) return;

        if (k.includes('ram') || k.includes('memory')) {
          ramMap[v] = (ramMap[v] || 0) + 1;
        }
        if (k.includes('storage') || k.includes('rom') || k.includes('capacity')) {
          storageMap[v] = (storageMap[v] || 0) + 1;
        }
        if (k.includes('color')) {
          colorMap[v] = (colorMap[v] || 0) + 1;
        }
        if (k.includes('size')) {
          sizeMap[v] = (sizeMap[v] || 0) + 1;
        }
        if (k.includes('fabric') || k.includes('material')) {
          fabricMap[v] = (fabricMap[v] || 0) + 1;
        }
        if (k.includes('battery')) {
          batteryMap[v] = (batteryMap[v] || 0) + 1;
        }
      });

      // Check variants
      (p.variants || []).forEach(variant => {
        const attrs = variant.attributes || {};
        if (attrs.ram) ramMap[attrs.ram] = (ramMap[attrs.ram] || 0) + 1;
        if (attrs.storage) storageMap[attrs.storage] = (storageMap[attrs.storage] || 0) + 1;
        if (attrs.color) {
          colorMap[attrs.color] = (colorMap[attrs.color] || 0) + 1;
        }
        if (attrs.size) sizeMap[attrs.size] = (sizeMap[attrs.size] || 0) + 1;
      });
    });

    const standardColors = [
      { name: 'Midnight Black', hex: '#111827' },
      { name: 'Obsidian', hex: '#1E293B' },
      { name: 'Silver Slate', hex: '#94A3B8' },
      { name: 'Navy Blue', hex: '#1E3A8A' },
      { name: 'Rose Gold', hex: '#FB7185' },
      { name: 'Forest Green', hex: '#059669' },
    ];

    res.status(200).json({
      success: true,
      facets: {
        priceRange: {
          min: minPrice !== Infinity ? minPrice : 299,
          max: maxPrice !== -Infinity ? maxPrice : 49999,
        },
        ram: Object.entries(ramMap).map(([value, count]) => ({ value, count })),
        storage: Object.entries(storageMap).map(([value, count]) => ({ value, count })),
        color: Object.entries(colorMap).map(([value, count]) => ({
          value,
          colorCode:
            standardColors.find(c => c.name.toLowerCase().includes(value.toLowerCase()))?.hex ||
            '#475569',
          count,
        })),
        size: Object.entries(sizeMap).map(([value, count]) => ({ value, count })),
        fabric: Object.entries(fabricMap).map(([value, count]) => ({ value, count })),
        battery: Object.entries(batteryMap).map(([value, count]) => ({ value, count })),
        brands: Object.entries(brandMap).map(([name, count]) => ({ name, count })),
        ratings: [
          { minRating: 4.5, label: '4.5★ & up', count: allProducts.filter(p => p.ratingsAverage >= 4.5).length },
          { minRating: 4.0, label: '4.0★ & up', count: allProducts.filter(p => p.ratingsAverage >= 4.0).length },
          { minRating: 3.5, label: '3.5★ & up', count: allProducts.filter(p => p.ratingsAverage >= 3.5).length },
          { minRating: 3.0, label: '3.0★ & up', count: allProducts.filter(p => p.ratingsAverage >= 3.0).length },
        ],
      },
      totalProducts: allProducts.length,
    });
  } catch (error) {
    next(error);
  }
};





