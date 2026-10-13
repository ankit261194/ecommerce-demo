const express = require('express');
const router = express.Router();
const { createOrder, getMyOrders, getOrderById, cancelOrder } = require('../controllers/orderController');
const { protect } = require('../middlewares/auth');

router.use(protect);

router.post('/', createOrder);
router.get('/my', getMyOrders);
router.get('/:id', getOrderById);
router.post('/:id/cancel', cancelOrder);

module.exports = router;
