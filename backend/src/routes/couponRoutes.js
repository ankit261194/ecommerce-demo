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
  calculateBogoSavings,
  getStorefrontPromotions,
  getVendorPromotions,
  createVendorPromotion,
  updateVendorPromotion,
  toggleVendorPromotion,
  deleteVendorPromotion,
  getAdminVendorFundedPromotions,
} = require('../controllers/couponController');
const { protect, authorize } = require('../middlewares/auth');

// Public storefront routes
router.post('/validate', validateCoupon);
router.get('/scratch-card', getScratchCardCoupon);
router.get('/', getCoupons);

// Point 11: Public BOGO & Storefront Promotions
router.post('/bogo/calculate', calculateBogoSavings);
router.get('/store/:vendorId', getStorefrontPromotions);

// Point 11: Admin vendor-funded promotions overview
router.get('/admin/vendor-funded', protect, authorize('superadmin', 'admin'), getAdminVendorFundedPromotions);

// Admin management routes
router.get('/admin/all', protect, authorize('superadmin', 'admin'), getAdminCoupons);
router.post('/', protect, authorize('superadmin', 'admin'), createCoupon);
router.get('/:id', getCouponById);
router.put('/:id', protect, authorize('superadmin', 'admin'), updateCoupon);
router.delete('/:id', protect, authorize('superadmin', 'admin'), deleteCoupon);
router.patch('/:id/toggle', protect, authorize('superadmin', 'admin'), toggleCouponStatus);

module.exports = router;
