const express = require('express');
const router = express.Router();
const {
  getFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  voteFaq,
} = require('../controllers/faqController');
const { protect, authorize, optionalAuth } = require('../middlewares/auth');

// Public FAQ viewing and voting
router.get('/', optionalAuth, getFaqs);
router.post('/:id/vote', voteFaq);

// Super Admin CRUD
router.post('/', protect, authorize('superadmin'), createFaq);
router.put('/:id', protect, authorize('superadmin'), updateFaq);
router.delete('/:id', protect, authorize('superadmin'), deleteFaq);

module.exports = router;
