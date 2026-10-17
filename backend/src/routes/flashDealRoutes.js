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
  createMegaCampaign,
  getMegaCampaigns,
  triggerSchedulerNow,
  registerReminder,
  getDailySlots,
  getCampaignAnalytics,
  purchaseFlashDealItem,
} = require('../controllers/flashDealController');
const { protect, authorize } = require('../middlewares/auth');

// Public Storefront routes
router.get('/active', getActiveFlashDeal);
router.get('/slots/today', getDailySlots);
router.post('/:id/remind', registerReminder);
router.post('/:id/purchase', protect, purchaseFlashDealItem);

// Super Admin Mega Campaign Builder & Scheduler routes (mounted via /api/flash-deals/admin/* or /api/admin/flash-deals/*)
router.get('/admin/mega/analytics', protect, authorize('superadmin', 'admin'), getCampaignAnalytics);
router.get('/mega/analytics', protect, authorize('superadmin', 'admin'), getCampaignAnalytics);

router.get('/admin/mega', protect, authorize('superadmin', 'admin'), getMegaCampaigns);
router.get('/mega', protect, authorize('superadmin', 'admin'), getMegaCampaigns);

router.post('/admin/mega', protect, authorize('superadmin', 'admin'), createMegaCampaign);
router.post('/mega', protect, authorize('superadmin', 'admin'), createMegaCampaign);

router.post('/admin/trigger-scheduler', protect, authorize('superadmin', 'admin'), triggerSchedulerNow);
router.post('/trigger-scheduler', protect, authorize('superadmin', 'admin'), triggerSchedulerNow);

// Standard Admin Flash Deal routes
router.get('/admin/all', protect, authorize('superadmin', 'admin'), getAdminFlashDeals);
router.get('/all', protect, authorize('superadmin', 'admin'), getAdminFlashDeals);

router.post('/admin', protect, authorize('superadmin', 'admin'), createFlashDeal);
router.put('/admin/:id', protect, authorize('superadmin', 'admin'), updateFlashDeal);
router.patch('/admin/:id/toggle', protect, authorize('superadmin', 'admin'), toggleFlashDealStatus);
router.delete('/admin/:id', protect, authorize('superadmin', 'admin'), deleteFlashDeal);

// Single deal lookup (by Mongo ID or slug - must be placed after specific routes)
router.get('/:id', getFlashDealById);

module.exports = router;

