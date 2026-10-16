const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductBySlug,
  getCategories,
  getCategoryTree,
  getBrands,
  getSearchSuggestions,
  fuzzySearchProducts,
  getFlashDeals,
  getSocialProofActivities,
  compareProducts,
  getProductBundle,
  getProductRecommendations,
  getProductFacets,
  getProductBySku,
  updateProductVariants,
} = require('../controllers/productController');
const { protect, authorize } = require('../middlewares/auth');

router.get('/', getProducts);
router.get('/facets', getProductFacets);
router.post('/compare', compareProducts);
router.get('/flash-deals', getFlashDeals);
router.get('/social-proof/recent-activities', getSocialProofActivities);
router.get('/search/fuzzy', fuzzySearchProducts);
router.get('/search/suggestions', getSearchSuggestions);
router.get('/brands', getBrands);
router.get('/categories/tree', getCategoryTree);
router.get('/categories', getCategories);
router.get('/categories/all', getCategories);
router.get('/sku/:sku', getProductBySku);
router.put('/:id/variants', protect, authorize('superadmin', 'admin', 'vendor'), updateProductVariants);
router.get('/:identifier/bundle', getProductBundle);
router.get('/:identifier/recommendations', getProductRecommendations);
router.get('/:slug', getProductBySlug);

module.exports = router;
