const express = require('express');
const router = express.Router();
const {
  createReturnRequest,
  createExchangeRequest,
  getMyReturns,
  getReturnByOrder,
  updateReturnStatus,
  updateReversePickupStatus,
} = require('../controllers/returnController');
const { protect } = require('../middlewares/auth');

router.use(protect);

router.post('/', createReturnRequest);
router.post('/exchange', createExchangeRequest);
router.get('/my', getMyReturns);
router.get('/order/:orderId', getReturnByOrder);
router.put('/:id/status', updateReturnStatus);
router.put('/:id/reverse-pickup', updateReversePickupStatus);

module.exports = router;
