const express = require('express');
const router = express.Router();
const { getProducts, getProductBySlug, getCategories, getCategoryTree, getBrands, getSearchSuggestions } = require('../controllers/productController');

router.get('/', getProducts);
router.get('/search/suggestions', getSearchSuggestions);
router.get('/brands', getBrands);
router.get('/categories/tree', getCategoryTree);
router.get('/categories', getCategories);
router.get('/categories/all', getCategories);
router.get('/:slug', getProductBySlug);

module.exports = router;
