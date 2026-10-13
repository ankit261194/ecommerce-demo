const express = require('express');
const router = express.Router();
const {
  validateCoupon,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} = require('../controllers/couponController');
const { protect, authorize } = require('../middlewares/auth');

// Public storefront routes
router.post('/validate', validateCoupon);
router.get('/', getCoupons);

// Admin management routes
router.post('/', protect, authorize('superadmin', 'admin'), createCoupon);
router.put('/:id', protect, authorize('superadmin', 'admin'), updateCoupon);
router.delete('/:id', protect, authorize('superadmin', 'admin'), deleteCoupon);

module.exports = router;
