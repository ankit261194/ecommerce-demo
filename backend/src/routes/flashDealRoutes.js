const express = require('express');
const router = express.Router();
const {
  getActiveFlashDeal,
  getAdminFlashDeals,
  getFlashDealById,
  createFlashDeal,
  updateFlashDeal,
  toggleFlashDealStatus,
  deleteFlashDeal,
} = require('../controllers/flashDealController');
const { protect, authorize } = require('../middlewares/auth');

// Public route for Storefront (must come before parameterized /:id)
router.get('/active', getActiveFlashDeal);

// Super Admin Management routes
router.get('/admin/all', protect, authorize('superadmin', 'admin'), getAdminFlashDeals);
router.post('/admin', protect, authorize('superadmin', 'admin'), createFlashDeal);
router.put('/admin/:id', protect, authorize('superadmin', 'admin'), updateFlashDeal);
router.patch('/admin/:id/toggle', protect, authorize('superadmin', 'admin'), toggleFlashDealStatus);
router.delete('/admin/:id', protect, authorize('superadmin', 'admin'), deleteFlashDeal);

// Single deal lookup (by Mongo ID or slug)
router.get('/:id', getFlashDealById);

module.exports = router;
