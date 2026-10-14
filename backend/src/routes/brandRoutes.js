const express = require('express');
const router = express.Router();
const {
  getBrands,
  getBrandByIdOrSlug,
  createBrand,
  updateBrand,
  deleteBrand,
} = require('../controllers/brandController');
const { protect, authorize } = require('../middlewares/auth');

// Public Brand Endpoints
router.get('/', getBrands);
router.get('/:idOrSlug', getBrandByIdOrSlug);

// Admin Brand Directory Management
router.post('/', protect, authorize('superadmin'), createBrand);
router.put('/:id', protect, authorize('superadmin'), updateBrand);
router.delete('/:id', protect, authorize('superadmin'), deleteBrand);

module.exports = router;
