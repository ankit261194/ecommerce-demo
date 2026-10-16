const express = require('express');
const router = express.Router();
const {
  generateSmartListing,
  optimizeExistingProduct,
  suggestHsnCode,
  getListingPresets,
} = require('../controllers/aiProductListingController');
const { protect } = require('../middlewares/auth');

// Public presets and benchmarks
router.get('/presets', getListingPresets);

// Protected routes (Vendors and Admins)
router.use(protect);
router.post('/generate', generateSmartListing);
router.post('/optimize-existing/:productId', optimizeExistingProduct);
router.post('/suggest-hsn', suggestHsnCode);

module.exports = router;
