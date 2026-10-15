const express = require('express');
const router = express.Router();
const {
  checkServiceability,
  getAllPincodes,
  createPincode,
  updatePincode,
  deletePincode,
  seedDefaultPincodes,
} = require('../controllers/pincodeController');
const { protect, authorize } = require('../middlewares/auth');

// Public endpoints
router.get('/check/:pincode', checkServiceability);
router.post('/check', checkServiceability);

// Admin endpoints
router.get('/', protect, authorize('superadmin'), getAllPincodes);
router.post('/', protect, authorize('superadmin'), createPincode);
router.put('/:id', protect, authorize('superadmin'), updatePincode);
router.delete('/:id', protect, authorize('superadmin'), deletePincode);
router.post('/seed-defaults', protect, authorize('superadmin'), seedDefaultPincodes);

module.exports = router;
