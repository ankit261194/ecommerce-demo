const express = require('express');
const router = express.Router();
const {
  checkServiceability,
  getAllPincodes,
  createPincode,
  updatePincode,
  deletePincode,
  seedDefaultPincodes,
  getZoneLogisticsSummary,
  updateZoneLogisticsConfig,
  togglePincodeCod,
  togglePincodeDelivery,
} = require('../controllers/pincodeController');
const { protect, authorize } = require('../middlewares/auth');

// Public endpoints
router.get('/check/:pincode', checkServiceability);
router.post('/check', checkServiceability);

// Admin endpoints (Point 1 & Point 10)
router.get('/zones/summary', protect, authorize('superadmin'), getZoneLogisticsSummary);
router.put('/zones/:zone/config', protect, authorize('superadmin'), updateZoneLogisticsConfig);

router.get('/', protect, authorize('superadmin'), getAllPincodes);
router.post('/', protect, authorize('superadmin'), createPincode);
router.patch('/:id/toggle-cod', protect, authorize('superadmin'), togglePincodeCod);
router.patch('/:id/toggle-delivery', protect, authorize('superadmin'), togglePincodeDelivery);
router.put('/:id', protect, authorize('superadmin'), updatePincode);
router.delete('/:id', protect, authorize('superadmin'), deletePincode);
router.post('/seed-defaults', protect, authorize('superadmin'), seedDefaultPincodes);

module.exports = router;
