const Category = require('../models/Category');
const Product = require('../models/Product');

// Helper to slugify
const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');

// @desc    Get All Categories (Flat or Hierarchical Tree)
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res, next) => {
  try {
    const { tree, includeInactive, featured } = req.query;

    const query = {};
    if (!includeInactive) {
      query.isActive = { $ne: false };
    }
    if (featured === 'true') {
      query.isFeatured = true;
    }

    const categories = await Category.find(query)
      .populate('parentCategory', 'name slug icon')
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    // Attach product count to each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (cat) => {
        const productCount = await Product.countDocuments({ category: cat._id });
        return { ...cat, productCount };
      })
    );

    // If tree view requested, build parent-children hierarchy
    if (tree === 'true') {
      const categoryMap = {};
      const rootCategories = [];

      categoriesWithCounts.forEach((cat) => {
        categoryMap[cat._id.toString()] = { ...cat, subcategories: [] };
      });

      categoriesWithCounts.forEach((cat) => {
        const catId = cat._id.toString();
        const parentId = cat.parentCategory?._id
          ? cat.parentCategory._id.toString()
          : cat.parentCategory?.toString();

        if (parentId && categoryMap[parentId]) {
          categoryMap[parentId].subcategories.push(categoryMap[catId]);
        } else {
          rootCategories.push(categoryMap[catId]);
        }
      });

      return res.status(200).json({
        success: true,
        count: rootCategories.length,
        total: categories.length,
        data: rootCategories,
      });
    }

    res.status(200).json({
      success: true,
      count: categoriesWithCounts.length,
      data: categoriesWithCounts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Single Category by ID or Slug
// @route   GET /api/categories/:idOrSlug
// @access  Public
exports.getCategoryByIdOrSlug = async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);
    const query = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug.toLowerCase() };

    const category = await Category.findOne(query).populate('parentCategory', 'name slug icon image');
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const subcategories = await Category.find({ parentCategory: category._id, isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    const productCount = await Product.countDocuments({ category: category._id });

    res.status(200).json({
      success: true,
      data: {
        ...category.toObject(),
        productCount,
        subcategories,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create Category or Subcategory (Point #36)
// @route   POST /api/admin/categories
// @access  Private (Super Admin)
exports.createCategory = async (req, res, next) => {
  try {
    const { name, slug, description, image, icon, parentCategory, isFeatured, displayOrder, isActive } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const generatedSlug = slug ? slugify(slug) : slugify(name);

    const existingSlug = await Category.findOne({ slug: generatedSlug });
    if (existingSlug) {
      return res.status(400).json({ success: false, message: `Category slug '${generatedSlug}' is already in use` });
    }

    let validParentId = null;
    if (parentCategory && parentCategory !== 'none') {
      const parent = await Category.findById(parentCategory);
      if (!parent) {
        return res.status(400).json({ success: false, message: 'Parent category not found' });
      }
      validParentId = parent._id;
    }

    const category = await Category.create({
      name: name.trim(),
      slug: generatedSlug,
      description: description || '',
      image: image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300',
      icon: icon || 'tag',
      parentCategory: validParentId,
      isFeatured: Boolean(isFeatured),
      displayOrder: typeof displayOrder === 'number' ? displayOrder : 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    const populated = await Category.findById(category._id).populate('parentCategory', 'name slug');

    res.status(201).json({
      success: true,
      message: `Category '${category.name}' created successfully`,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Category or Subcategory (Point #36)
// @route   PUT /api/admin/categories/:id
// @access  Private (Super Admin)
exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const { name, slug, description, image, icon, parentCategory, isFeatured, displayOrder, isActive } = req.body;

    if (name) category.name = name.trim();
    if (slug) {
      const newSlug = slugify(slug);
      const conflict = await Category.findOne({ slug: newSlug, _id: { $ne: category._id } });
      if (conflict) {
        return res.status(400).json({ success: false, message: `Slug '${newSlug}' is already taken` });
      }
      category.slug = newSlug;
    }
    if (description !== undefined) category.description = description;
    if (image !== undefined) category.image = image;
    if (icon !== undefined) category.icon = icon;
    if (isFeatured !== undefined) category.isFeatured = Boolean(isFeatured);
    if (displayOrder !== undefined) category.displayOrder = Number(displayOrder);
    if (isActive !== undefined) category.isActive = Boolean(isActive);

    if (parentCategory !== undefined) {
      if (!parentCategory || parentCategory === 'none' || parentCategory === '') {
        category.parentCategory = null;
      } else {
        if (parentCategory.toString() === category._id.toString()) {
          return res.status(400).json({ success: false, message: 'A category cannot be its own parent' });
        }
        const parent = await Category.findById(parentCategory);
        if (!parent) {
          return res.status(400).json({ success: false, message: 'Specified parent category does not exist' });
        }
        category.parentCategory = parent._id;
      }
    }

    await category.save();

    const updated = await Category.findById(category._id).populate('parentCategory', 'name slug');

    res.status(200).json({
      success: true,
      message: `Category '${category.name}' updated successfully`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Category (Point #36)
// @route   DELETE /api/admin/categories/:id
// @access  Private (Super Admin)
exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Safety Check: Check if products belong to this category
    const productCount = await Product.countDocuments({ category: category._id });

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category '${category.name}': ${productCount} active products belong to this category. Please reassign them first.`,
        productCount,
      });
    }

    // Check if subcategories exist, reassign them to root (null parent)
    await Category.updateMany({ parentCategory: category._id }, { $set: { parentCategory: null } });

    await Category.findByIdAndDelete(category._id);

    res.status(200).json({
      success: true,
      message: `Category '${category.name}' deleted successfully. Subcategories (if any) promoted to root.`,
      deletedId: category._id,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Batch Reorder Categories (Point #36)
// @route   PUT /api/admin/categories/reorder
// @access  Private (Super Admin)
exports.reorderCategories = async (req, res, next) => {
  try {
    const { orders } = req.body; // Array of { id, displayOrder }
    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of { id, displayOrder }' });
    }

    for (const item of orders) {
      if (item.id && typeof item.displayOrder === 'number') {
        await Category.findByIdAndUpdate(item.id, { displayOrder: item.displayOrder });
      }
    }

    const updatedList = await Category.find().sort({ displayOrder: 1, name: 1 });

    res.status(200).json({
      success: true,
      message: 'Category display order updated successfully',
      data: updatedList,
    });
  } catch (error) {
    next(error);
  }
};
