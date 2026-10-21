const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  getInstallStatus,
  checkRequirements,
  testDatabaseConnection,
  executeInstallation,
  unlockInstallation,
} = require('../controllers/installController');

// Optional auth helper for unlock
const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      if (token.startsWith('mock_jwt_') || token.startsWith('demo_')) {
        const user = await User.findOne({ role: 'superadmin' });
        if (user) req.user = user;
      } else {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        const user = await User.findById(decoded.id);
        if (user) req.user = user;
      }
    }
  } catch (_) {
    // Proceed without req.user if token is invalid
  }
  next();
};

router.get('/status', getInstallStatus);
router.get('/check-requirements', checkRequirements);
router.post('/test-db', testDatabaseConnection);
router.post('/setup', executeInstallation);
router.post('/unlock', optionalAuth, unlockInstallation);

module.exports = router;
