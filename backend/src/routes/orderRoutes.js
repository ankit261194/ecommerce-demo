const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  trackOrder,
  simulateOrderStep,
  getTaxInvoice,
  getSplitPackingSlips,
  verifyRtoRisk,
  resendRtoOtp,
} = require('../controllers/orderController');
const { protect } = require('../middlewares/auth');

// Public live order tracking and 1-click tax invoice download
router.get('/track/:identifier', trackOrder);
router.get('/:id/invoice', getTaxInvoice);
router.get('/:id/split-packing-slips', protect, getSplitPackingSlips);

router.use(protect);

router.post('/', createOrder);
router.get('/my', getMyOrders);
router.get('/:id', getOrderById);
router.post('/:id/cancel', cancelOrder);
router.post('/:id/advance-step', simulateOrderStep);
router.post('/:id/verify-rto-risk', verifyRtoRisk);
router.post('/:id/resend-rto-otp', resendRtoOtp);

module.exports = router;
