const express = require('express');
const router = express.Router();
const {
  getMyDeliveries,
  updateDeliveryStatus,
  verifyOtpAndCompleteDelivery,
  getTaskNavigationDetails,
  getTaskContactTemplates,
  logContactAttempt,
} = require('../controllers/deliveryController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);
router.use(authorize('delivery', 'superadmin'));

router.get('/tasks', getMyDeliveries);
router.get('/tasks/:id/navigation', getTaskNavigationDetails);
router.get('/tasks/:id/contact-templates', getTaskContactTemplates);
router.post('/tasks/:id/contact-log', logContactAttempt);
router.put('/tasks/:id/status', updateDeliveryStatus);
router.post('/tasks/:id/verify-otp', verifyOtpAndCompleteDelivery);

module.exports = router;
