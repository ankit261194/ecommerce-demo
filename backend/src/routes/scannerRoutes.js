const express = require('express');
const router = express.Router();
const {
  lookupScannedCode,
  getSupportedFormats,
} = require('../controllers/scannerController');
const { protect } = require('../middlewares/auth');

// Public capabilities check
router.get('/supported-formats', getSupportedFormats);

// Authenticated universal barcode & QR lookup
router.post('/lookup', protect, lookupScannedCode);

module.exports = router;
