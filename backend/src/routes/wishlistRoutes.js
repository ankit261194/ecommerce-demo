const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { optionalAuth } = require('../middlewares/auth');

// Support both authenticated users and guest shoppers
router.get('/', optionalAuth, wishlistController.getWishlist);
router.post('/toggle', optionalAuth, wishlistController.toggleWishlist);
router.delete('/item/:productId', optionalAuth, wishlistController.removeWishlistItem);
router.delete('/clear', optionalAuth, wishlistController.clearWishlist);

module.exports = router;
