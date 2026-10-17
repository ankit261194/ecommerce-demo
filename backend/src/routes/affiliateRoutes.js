const express = require('express');
const router = express.Router();
const affiliateController = require('../controllers/affiliateController');
const { protect, authorize } = require('../middlewares/auth');

// =========================================================================
// ADMIN ROUTES (Mounted at /api/admin/affiliates)
// =========================================================================
const adminRouter = express.Router();
adminRouter.use(protect, authorize('superadmin', 'admin'));

adminRouter.get('/analytics', affiliateController.getAffiliateAnalytics);
adminRouter.get('/settings', affiliateController.getProgramSettings);
adminRouter.put('/settings', affiliateController.updateProgramSettings);
adminRouter.get('/referrals', affiliateController.getReferrals);
adminRouter.get('/payouts', affiliateController.getPayouts);
adminRouter.post('/payouts', affiliateController.createPayout);
adminRouter.get('/', affiliateController.getPartners);
adminRouter.post('/', affiliateController.createPartner);
adminRouter.get('/:id', affiliateController.getPartnerById);
adminRouter.put('/:id', affiliateController.updatePartner);
adminRouter.put('/:id/status', affiliateController.updatePartnerStatus);

// =========================================================================
// PUBLIC & STOREFRONT ROUTES (Mounted at /api/affiliates)
// =========================================================================
const publicRouter = express.Router();

publicRouter.get('/validate/:code', affiliateController.validateCode);
publicRouter.post('/apply', affiliateController.applyAsPartner);
publicRouter.get('/me', protect, affiliateController.getMyAffiliateDashboard);

module.exports = {
  adminRouter,
  publicRouter,
};
