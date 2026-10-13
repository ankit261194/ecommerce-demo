const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  trackOrder,
  simulateOrderStep,
} = require('../controllers/orderController');
const { protect } = require('../middlewares/auth');

// Public live order tracking (accessible via SMS/order link without forced re-login)
router.get('/track/:identifier', trackOrder);

router.use(protect);

router.post('/', createOrder);
router.get('/my', getMyOrders);
router.get('/:id', getOrderById);
router.post('/:id/cancel', cancelOrder);
router.post('/:id/advance-step', simulateOrderStep);

module.exports = router;
