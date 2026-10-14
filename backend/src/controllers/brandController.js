const Brand = require('../models/Brand');
const Product = require('../models/Product');

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');

// @desc    Get All Brands (Point #37)
// @route   GET /api/brands
// @access  Public
exports.getBrands = async (req, res, next) => {
  try {
    const { includeInactive, featured } = req.query;

    const query = {};
    if (!includeInactive) {
      query.isActive = { $ne: false };
    }
    if (featured === 'true') {
      query.isFeatured = true;
    }

    const brands = await Brand.find(query)
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    // Attach product count for each brand
    const brandsWithCounts = await Promise.all(
      brands.map(async (b) => {
        const productCount = await Product.countDocuments({
          brand: new RegExp('^' + b.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'),
        });
        return { ...b, productCount };
      })
    );

    res.status(200).json({
      success: true,
      count: brandsWithCounts.length,
      data: brandsWithCounts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Single Brand by ID or Slug
// @route   GET /api/brands/:idOrSlug
// @access  Public
exports.getBrandByIdOrSlug = async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);
    const query = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug.toLowerCase() };

    const brand = await Brand.findOne(query);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    const productCount = await Product.countDocuments({
      brand: new RegExp('^' + brand.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'),
    });

    res.status(200).json({
      success: true,
      data: {
        ...brand.toObject(),
        productCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create Brand (Point #37)
// @route   POST /api/admin/brands
// @access  Private (Super Admin)
exports.createBrand = async (req, res, next) => {
  try {
    const { name, slug, logo, description, website, isFeatured, isActive, displayOrder } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Brand name is required' });
    }

    const brandSlug = slug ? slugify(slug) : slugify(name);

    const exists = await Brand.findOne({
      $or: [{ name: name.trim() }, { slug: brandSlug }],
    });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: `Brand with name '${name}' or slug '${brandSlug}' already exists`,
      });
    }

    const brand = await Brand.create({
      name: name.trim(),
      slug: brandSlug,
      logo: logo || 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200',
      description: description || '',
      website: website || '',
      isFeatured: Boolean(isFeatured),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      displayOrder: typeof displayOrder === 'number' ? displayOrder : 0,
    });

    res.status(201).json({
      success: true,
      message: `Brand '${brand.name}' registered successfully`,
      data: brand,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Brand (Point #37)
// @route   PUT /api/admin/brands/:id
// @access  Private (Super Admin)
exports.updateBrand = async (req, res, next) => {
  try {
    const { id } = req.params;
    const brand = await Brand.findById(id);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    const { name, slug, logo, description, website, isFeatured, isActive, displayOrder } = req.body;

    if (name) {
      const conflictName = await Brand.findOne({ name: name.trim(), _id: { $ne: brand._id } });
      if (conflictName) {
        return res.status(400).json({ success: false, message: `Brand name '${name}' is already taken` });
      }
      brand.name = name.trim();
    }

    if (slug) {
      const newSlug = slugify(slug);
      const conflictSlug = await Brand.findOne({ slug: newSlug, _id: { $ne: brand._id } });
      if (conflictSlug) {
        return res.status(400).json({ success: false, message: `Brand slug '${newSlug}' is already taken` });
      }
      brand.slug = newSlug;
    }

    if (logo !== undefined) brand.logo = logo;
    if (description !== undefined) brand.description = description;
    if (website !== undefined) brand.website = website;
    if (isFeatured !== undefined) brand.isFeatured = Boolean(isFeatured);
    if (isActive !== undefined) brand.isActive = Boolean(isActive);
    if (displayOrder !== undefined) brand.displayOrder = Number(displayOrder);

    await brand.save();

    res.status(200).json({
      success: true,
      message: `Brand '${brand.name}' updated successfully`,
      data: brand,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Brand (Point #37)
// @route   DELETE /api/admin/brands/:id
// @access  Private (Super Admin)
exports.deleteBrand = async (req, res, next) => {
  try {
    const { id } = req.params;
    const brand = await Brand.findById(id);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    // Protection: Prevent deletion if products exist for this brand
    const productCount = await Product.countDocuments({
      brand: new RegExp('^' + brand.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'),
    });

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete brand '${brand.name}': ${productCount} products are currently linked to this brand. Please reassign them first.`,
        productCount,
      });
    }

    await Brand.findByIdAndDelete(brand._id);

    res.status(200).json({
      success: true,
      message: `Brand '${brand.name}' deleted successfully`,
      deletedId: brand._id,
    });
  } catch (error) {
    next(error);
  }
};
