const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');

// Helper to resolve user or guest identifier
const getWishlistFilter = (req) => {
  if (req.user && req.user._id) {
    return { userId: req.user._id };
  }
  const guestId = req.headers['x-guest-id'] || req.query.guestId || req.body.guestId || 'guest_default';
  return { guestId };
};

// GET /api/wishlist
exports.getWishlist = async (req, res) => {
  try {
    const filter = getWishlistFilter(req);
    let wishlist = await Wishlist.findOne(filter).populate({
      path: 'items.product',
      select: 'title slug price sellingPrice mrp image images stock inStock category brand ratingsAverage ratingsQuantity vendor'
    });

    if (!wishlist) {
      wishlist = await Wishlist.create({ ...filter, items: [] });
    } else {
      // Clean up items whose product was deleted
      const initialLength = wishlist.items.length;
      wishlist.items = wishlist.items.filter(item => item.product !== null);
      if (wishlist.items.length !== initialLength) {
        await wishlist.save();
      }
    }

    res.status(200).json({
      success: true,
      count: wishlist.items.length,
      items: wishlist.items,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve wishlist',
      error: err.message,
    });
  }
};

// POST /api/wishlist/toggle
exports.toggleWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const filter = getWishlistFilter(req);
    let wishlist = await Wishlist.findOne(filter);

    if (!wishlist) {
      wishlist = new Wishlist({ ...filter, items: [] });
    }

    const existingIndex = wishlist.items.findIndex(
      item => item.product.toString() === productId.toString()
    );

    let isWishlisted = false;
    let action = 'removed';

    if (existingIndex > -1) {
      wishlist.items.splice(existingIndex, 1);
      isWishlisted = false;
      action = 'removed';
    } else {
      wishlist.items.unshift({ product: productId, addedAt: new Date() });
      isWishlisted = true;
      action = 'added';
    }

    await wishlist.save();

    await wishlist.populate({
      path: 'items.product',
      select: 'title slug price sellingPrice mrp image images stock inStock category brand ratingsAverage ratingsQuantity vendor'
    });

    res.status(200).json({
      success: true,
      action,
      isWishlisted,
      count: wishlist.items.length,
      items: wishlist.items,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to toggle wishlist item',
      error: err.message,
    });
  }
};

// DELETE /api/wishlist/item/:productId
exports.removeWishlistItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const filter = getWishlistFilter(req);
    let wishlist = await Wishlist.findOne(filter);

    if (!wishlist) {
      return res.status(200).json({ success: true, count: 0, items: [] });
    }

    wishlist.items = wishlist.items.filter(
      item => item.product.toString() !== productId.toString()
    );

    await wishlist.save();

    await wishlist.populate({
      path: 'items.product',
      select: 'title slug price sellingPrice mrp image images stock inStock category brand ratingsAverage ratingsQuantity vendor'
    });

    res.status(200).json({
      success: true,
      message: 'Item removed from wishlist',
      count: wishlist.items.length,
      items: wishlist.items,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove wishlist item',
      error: err.message,
    });
  }
};

// DELETE /api/wishlist/clear
exports.clearWishlist = async (req, res) => {
  try {
    const filter = getWishlistFilter(req);
    let wishlist = await Wishlist.findOne(filter);

    if (wishlist) {
      wishlist.items = [];
      await wishlist.save();
    }

    res.status(200).json({
      success: true,
      message: 'Wishlist cleared successfully',
      count: 0,
      items: [],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to clear wishlist',
      error: err.message,
    });
  }
};
