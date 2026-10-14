const express = require('express');
const router = express.Router();
const {
  validateCoupon,
  getCoupons,
  getScratchCardCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getAdminCoupons,
  getCouponById,
  toggleCouponStatus,
} = require('../controllers/couponController');
const { protect, authorize } = require('../middlewares/auth');

// Public storefront routes
router.post('/validate', validateCoupon);
router.get('/scratch-card', getScratchCardCoupon);
router.get('/', getCoupons);

// Admin management routes
router.get('/admin/all', protect, authorize('superadmin', 'admin'), getAdminCoupons);
router.post('/', protect, authorize('superadmin', 'admin'), createCoupon);
router.get('/:id', getCouponById);
router.put('/:id', protect, authorize('superadmin', 'admin'), updateCoupon);
router.delete('/:id', protect, authorize('superadmin', 'admin'), deleteCoupon);
router.patch('/:id/toggle', protect, authorize('superadmin', 'admin'), toggleCouponStatus);

module.exports = router;
