const express = require('express');
const router = express.Router();
const { getProducts, getProductBySlug, getCategories } = require('../controllers/productController');

router.get('/', getProducts);
router.get('/categories', getCategories);
router.get('/categories/all', getCategories);
router.get('/:slug', getProductBySlug);

module.exports = router;
