const express = require('express');
const router = express.Router();
const {
  getAllPages,
  getPageBySlug,
  createPage,
  updatePage,
  deletePage,
} = require('../controllers/cmsController');
const { protect, authorize, optionalAuth } = require('../middlewares/auth');

// Public routes with optional auth (so superadmin can preview unpublished pages)
router.get('/pages', optionalAuth, getAllPages);
router.get('/pages/:slug', optionalAuth, getPageBySlug);

// Super Admin Management routes
router.post('/pages', protect, authorize('superadmin'), createPage);
router.put('/pages/:slug', protect, authorize('superadmin'), updatePage);
router.delete('/pages/:slug', protect, authorize('superadmin'), deletePage);

module.exports = router;
