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
  getThermalReceipt,
  saveOrderPodSignature,
  getOrderPod,
  getOrderPodSlip,
} = require('../controllers/orderController');
const { protect } = require('../middlewares/auth');

// Public live order tracking, 1-click tax invoice and POD slip
router.get('/track/:identifier', trackOrder);
router.get('/:id/invoice', getTaxInvoice);
router.get('/:id/pod-slip', getOrderPodSlip);
router.get('/:id/split-packing-slips', protect, getSplitPackingSlips);
router.get('/:id/thermal-receipt', protect, getThermalReceipt);

router.use(protect);

router.post('/', createOrder);
router.get('/my', getMyOrders);
router.get('/:id', getOrderById);
router.get('/:id/pod', getOrderPod);
router.post('/:id/pod-signature', saveOrderPodSignature);
router.post('/:id/cancel', cancelOrder);
router.post('/:id/advance-step', simulateOrderStep);
router.post('/:id/verify-rto-risk', verifyRtoRisk);
router.post('/:id/resend-rto-otp', resendRtoOtp);

module.exports = router;
