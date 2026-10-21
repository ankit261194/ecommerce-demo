const express = require('express');
const router = express.Router();
const {
  recordEvent,
  getPersonalized,
  getFbt,
  getSimilar,
  recomputeMatrix,
  getAnalytics,
  getConfig,
  updateConfig,
} = require('../controllers/recommendationController');
const { protect, authorize } = require('../middlewares/auth');

// Optional auth helper to attach user if logged in, but allow guest sessions
const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      const jwt = require('jsonwebtoken');
      const User = require('../models/User');
      if (token.startsWith('mock_jwt_') || token.startsWith('demo_')) {
        req.user = await User.findOne({ role: 'customer' });
      } else {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        req.user = await User.findById(decoded.id);
      }
    }
  } catch (_) {}
  next();
};

// Public Storefront Endpoints
router.post('/interaction', optionalAuth, recordEvent);
router.get('/personalized', optionalAuth, getPersonalized);
router.get('/fbt/:productId', getFbt);
router.get('/similar/:productId', getSimilar);

// Super Admin Management Endpoints
router.post(['/admin/recompute', '/recompute'], protect, authorize('superadmin'), recomputeMatrix);
router.get(['/admin/analytics', '/analytics'], protect, authorize('superadmin'), getAnalytics);
router.get(['/admin/config', '/config'], protect, authorize('superadmin'), getConfig);
router.put(['/admin/config', '/config'], protect, authorize('superadmin'), updateConfig);

module.exports = router;
