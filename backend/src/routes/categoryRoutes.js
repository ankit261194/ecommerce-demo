const express = require('express');
const router = express.Router();
const {
  getCategories,
  getCategoryByIdOrSlug,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middlewares/auth');

// Public Category Endpoints
router.get('/', getCategories);
router.get('/:idOrSlug', getCategoryByIdOrSlug);

// Admin Category Tree Management Endpoints
router.post('/', protect, authorize('superadmin'), createCategory);
router.put('/reorder', protect, authorize('superadmin'), reorderCategories);
router.put('/:id', protect, authorize('superadmin'), updateCategory);
router.delete('/:id', protect, authorize('superadmin'), deleteCategory);

module.exports = router;
