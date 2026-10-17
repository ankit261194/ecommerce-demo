const express = require('express');
const router = express.Router();
const {
  getTransferOrders,
  getTransferOrderById,
  createTransferOrder,
  approveTransferOrder,
  dispatchTransferOrder,
  receiveTransferOrder,
  cancelTransferOrder,
  getTransferAnalytics,
} = require('../controllers/stockTransferController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);
router.use(authorize('superadmin', 'admin'));

router.route('/')
  .get(getTransferOrders)
  .post(createTransferOrder);

router.get('/analytics', getTransferAnalytics);

router.route('/:id')
  .get(getTransferOrderById);

router.post('/:id/approve', approveTransferOrder);
router.post('/:id/dispatch', dispatchTransferOrder);
router.post('/:id/receive', receiveTransferOrder);
router.post('/:id/cancel', cancelTransferOrder);

module.exports = router;
