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
  visualSearchProducts,
  getVisualSearchSamples,
  getFlashDeals,
  getSocialProofActivities,
  compareProducts,
  getProductBundle,
  getProductRecommendations,
  getProductFacets,
  getProductBySku,
  updateProductVariants,
  getProduct3DModel,
  updateProduct3DModel,
} = require('../controllers/productController');
const { protect, authorize } = require('../middlewares/auth');

router.get('/', getProducts);
router.get('/facets', getProductFacets);
router.post('/compare', compareProducts);
router.get('/flash-deals', getFlashDeals);
router.get('/social-proof/recent-activities', getSocialProofActivities);
router.get('/search/fuzzy', fuzzySearchProducts);
router.post('/search/visual', visualSearchProducts);
router.get('/search/visual/samples', getVisualSearchSamples);
router.get('/search/suggestions', getSearchSuggestions);
router.get('/brands', getBrands);
router.get('/categories/tree', getCategoryTree);
router.get('/categories', getCategories);
router.get('/categories/all', getCategories);
router.get('/sku/:sku', getProductBySku);
router.put('/:id/variants', protect, authorize('superadmin', 'admin', 'vendor'), updateProductVariants);
router.get('/:identifier/bundle', getProductBundle);
router.get('/:identifier/recommendations', getProductRecommendations);
router.get('/:identifier/3d-model', getProduct3DModel);
router.put('/:id/3d-model', protect, authorize('superadmin', 'admin', 'vendor'), updateProduct3DModel);
router.get('/:slug', getProductBySlug);

module.exports = router;
