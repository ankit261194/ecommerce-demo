const Product = require('../models/Product');
const Category = require('../models/Category');

// @desc    Get All Public Products with filtering, search & sorting
// @route   GET /api/products
exports.getProducts = async (req, res, next) => {
  try {
    const { category, search, minPrice, maxPrice, featured, sort, page = 1, limit = 20 } = req.query;

    const query = { isPublished: true };

    if (category) {
      const cat = await Category.findOne({ slug: category });
      if (cat) query.category = cat._id;
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
      .populate('category', 'name slug')
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
