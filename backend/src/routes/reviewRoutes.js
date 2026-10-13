const express = require('express');
const router = express.Router();
const {
  getProductReviews,
  createReview,
  voteHelpful,
} = require('../controllers/reviewController');

router.get('/product/:productId', getProductReviews);
router.post('/product/:productId', createReview);
router.post('/:reviewId/helpful', voteHelpful);

module.exports = router;
