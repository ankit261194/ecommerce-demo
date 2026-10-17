const express = require('express');
const router = express.Router();
const {
  createOrder,
  guestCheckout,
  getMyOrders,
  getOrderById,
  cancelOrder,
  trackOrder,
  simulateOrderStep,
  getTaxInvoice,
  getInvoicePdf,
  getSplitPackingSlips,
  verifyRtoRisk,
  resendRtoOtp,
  getThermalReceipt,
  saveOrderPodSignature,
  getOrderPod,
  getOrderPodSlip,
  calculateSplitPayment,
  addOrderTip,
  getCancelPreview,
} = require('../controllers/orderController');
const { protect, optionalAuth } = require('../middlewares/auth');

// Public live order tracking, 1-click tax invoice, downloadable PDF and POD slip
router.get('/track/:identifier', trackOrder);
router.get('/:id/invoice', optionalAuth, getTaxInvoice);
router.get('/:id/invoice/pdf', optionalAuth, getInvoicePdf);
router.get('/:id/pod-slip', getOrderPodSlip);
router.get('/:id/split-packing-slips', protect, getSplitPackingSlips);
router.get('/:id/thermal-receipt', protect, getThermalReceipt);

// Point 4: Guest Checkout with Instant Background Account Creation & SMS credentials
router.post('/guest-checkout', guestCheckout);

router.use(protect);

router.post('/', createOrder);
router.post('/calculate-split', calculateSplitPayment);
router.get('/my', getMyOrders);
router.get('/:id', getOrderById);
router.get('/:id/pod', getOrderPod);
router.post('/:id/pod-signature', saveOrderPodSignature);
// Point 17: 1-Click Instant Self-Cancel & Instant Wallet Refund
router.get('/:id/cancel-preview', getCancelPreview);
router.post('/:id/cancel', cancelOrder);
router.put('/:id/cancel', cancelOrder);
router.post('/:id/advance-step', simulateOrderStep);
router.post('/:id/tip', addOrderTip);
router.post('/:id/verify-rto-risk', verifyRtoRisk);
router.post('/:id/resend-rto-otp', resendRtoOtp);

module.exports = router;

