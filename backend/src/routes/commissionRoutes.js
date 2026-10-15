const express = require('express');
const router = express.Router();
const {
  getAllRules,
  createRule,
  updateRule,
  deleteRule,
  simulateCommission,
  seedRulesEndpoint,
} = require('../controllers/commissionController');
const { protect, authorize } = require('../middlewares/auth');

// Super Admin endpoints for Category & Dynamic Commission Rules
router.use(protect, authorize('superadmin'));

router.get('/rules', getAllRules);
router.post('/rules', createRule);
router.post('/seed', seedRulesEndpoint);
router.put('/rules/:id', updateRule);
router.delete('/rules/:id', deleteRule);
router.post('/simulate', simulateCommission);

module.exports = router;
