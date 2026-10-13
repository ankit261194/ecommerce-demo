const express = require('express');
const router = express.Router();
const {
  createReturnRequest,
  getMyReturns,
  getReturnByOrder,
  updateReturnStatus,
} = require('../controllers/returnController');
const { protect } = require('../middlewares/auth');

router.use(protect);

router.post('/', createReturnRequest);
router.get('/my', getMyReturns);
router.get('/order/:orderId', getReturnByOrder);
router.put('/:id/status', updateReturnStatus);

module.exports = router;
