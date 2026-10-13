const express = require('express');
const router = express.Router();
const { getProducts, getProductBySlug, getCategories, getCategoryTree, getBrands, getSearchSuggestions, getFlashDeals, getSocialProofActivities, compareProducts, getProductBundle, getProductRecommendations } = require('../controllers/productController');

router.get('/', getProducts);
router.post('/compare', compareProducts);
router.get('/flash-deals', getFlashDeals);
router.get('/social-proof/recent-activities', getSocialProofActivities);
router.get('/search/suggestions', getSearchSuggestions);
router.get('/brands', getBrands);
router.get('/categories/tree', getCategoryTree);
router.get('/categories', getCategories);
router.get('/categories/all', getCategories);
router.get('/:identifier/bundle', getProductBundle);
router.get('/:identifier/recommendations', getProductRecommendations);
router.get('/:slug', getProductBySlug);

module.exports = router;
