const express = require('express');
const router = express.Router();
const {
  getPlans,
  getCurrentSubscription,
  subscribe,
  cancel,
  getInvoices,
  getInvoiceHtml,
  adminGetAnalytics,
  adminGetSubscriptions,
  adminCreatePlan,
  adminUpdatePlan,
} = require('../controllers/vendorSubscriptionController');
const { protect, authorize } = require('../middlewares/auth');

// Public & Vendor endpoints
router.get('/plans', getPlans);
router.get('/current', protect, authorize('vendor'), getCurrentSubscription);
router.post('/subscribe', protect, authorize('vendor'), subscribe);
router.post('/cancel', protect, authorize('vendor'), cancel);
router.get('/invoices', protect, authorize('vendor'), getInvoices);
router.get('/invoices/:id/print', getInvoiceHtml);

// Super Admin Management endpoints
router.get(['/admin/analytics', '/analytics'], protect, authorize('superadmin'), adminGetAnalytics);
router.get(['/admin/subscriptions', '/subscriptions'], protect, authorize('superadmin'), adminGetSubscriptions);
router.post(['/admin/plans', '/plans'], protect, authorize('superadmin'), adminCreatePlan);
router.put(['/admin/plans/:id', '/plans/:id'], protect, authorize('superadmin'), adminUpdatePlan);

module.exports = router;
