const express = require('express');
const { protect, authorize } = require('../middlewares/auth');
const loyaltyController = require('../controllers/loyaltyController');

const publicRouter = express.Router();
const adminRouter = express.Router();

// ==========================================
// CUSTOMER & PUBLIC LOYALTY ROUTES
// ==========================================
publicRouter.get('/tiers', loyaltyController.getTierConfig);
publicRouter.get('/my-status', protect, loyaltyController.getMyLoyaltyStatus);
publicRouter.post('/check-in', protect, loyaltyController.dailyCheckIn);

// ==========================================
// SUPER ADMIN LOYALTY PROGRAM MANAGEMENT ROUTES
// ==========================================
adminRouter.use(protect);
adminRouter.use(authorize('superadmin', 'admin'));

adminRouter.get('/config', loyaltyController.getTierConfig);
adminRouter.put('/config', loyaltyController.updateTierConfig);
adminRouter.get('/analytics', loyaltyController.getLoyaltyAnalytics);
adminRouter.get('/customers', loyaltyController.getAdminLoyaltyCustomers);
adminRouter.post('/adjust-points', loyaltyController.adjustCustomerPoints);
adminRouter.post('/override-tier', loyaltyController.overrideCustomerTier);
adminRouter.get('/logs', loyaltyController.getLoyaltyLedger);

module.exports = {
  publicRouter,
  adminRouter,
};
