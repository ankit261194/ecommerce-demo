const express = require('express');
const router = express.Router();
const {
  getEligibleParcels,
  generateManifest,
  getManifests,
  getManifestById,
  recordHandover,
  getPrintableManifestHtml,
} = require('../controllers/manifestController');
const { protect, authorize } = require('../middlewares/auth');

// Manifest endpoints require Super Admin, Sub-Admin, or Vendor authentication
router.use(protect);
router.use(authorize('superadmin', 'subadmin', 'vendor'));

router.get('/eligible-parcels', getEligibleParcels);
router.post('/generate', generateManifest);
router.get('/', getManifests);
router.get('/:id', getManifestById);
router.patch('/:id/handover', recordHandover);
router.get('/:id/print', getPrintableManifestHtml);

module.exports = router;
