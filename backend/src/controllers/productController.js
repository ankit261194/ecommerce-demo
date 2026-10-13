const Product = require('../models/Product');
const Category = require('../models/Category');

// @desc    Get All Public Products with filtering, search & sorting
// @route   GET /api/products
exports.getProducts = async (req, res, next) => {
  try {
    const { category, subCategory, brand, search, minPrice, maxPrice, featured, sort, page = 1, limit = 20 } = req.query;

    const query = { isPublished: true };

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
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { brand: searchRegex },
        { tags: searchRegex },
      ];
    }

    if (minPrice || maxPrice) {
      query.sellingPrice = {};
      if (minPrice) query.sellingPrice.$gte = Number(minPrice);
      if (maxPrice) query.sellingPrice.$lte = Number(maxPrice);
    }

    if (featured === 'true') {
      query.isFeatured = true;
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { sellingPrice: 1 };
    if (sort === 'price_desc') sortOption = { sellingPrice: -1 };
    if (sort === 'rating') sortOption = { ratingsAverage: -1 };

    const skip = (Number(page) - 1) * Number(limit);

    const products = await Product.find(query)
      .populate('category', 'name slug icon image')
      .populate('subCategory', 'name slug icon image')
      .populate('vendor', 'storeName storeLogo rating')
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: products,
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

    res.status(200).json({ success: true, data: product });
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


