const express = require('express');
const router = express.Router();
const {
  getSponsoredProducts,
  recordAdClick,
  getKeywordSuggestions,
} = require('../controllers/sponsoredAdController');

// Public ad delivery & click endpoints (Storefront & search)
router.get('/sponsored-products', getSponsoredProducts);
router.post('/click', recordAdClick);
router.get('/keyword-suggestions', getKeywordSuggestions);

module.exports = router;
