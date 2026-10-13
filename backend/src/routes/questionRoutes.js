const express = require('express');
const router = express.Router();
const {
  getProductQuestions,
  createQuestion,
  createAnswer,
  upvoteQuestion,
} = require('../controllers/questionController');

router.get('/product/:productId', getProductQuestions);
router.post('/product/:productId', createQuestion);
router.post('/:questionId/answer', createAnswer);
router.post('/:questionId/upvote', upvoteQuestion);

module.exports = router;
