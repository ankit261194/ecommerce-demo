/**
 * Point 5: Interactive Google Maps Pin-Drop Address Picker with Reverse Geocoding
 * Routes for map services, geocoding, places search, and pin address persistence
 */

const express = require('express');
const router = express.Router();
const mapController = require('../controllers/mapController');
const { protect } = require('../middlewares/auth');

// Public geocoding & config endpoints
router.get('/reverse-geocode', mapController.reverseGeocode);
router.post('/reverse-geocode', mapController.reverseGeocode);
router.get('/search-places', mapController.searchPlaces);
router.post('/search-places', mapController.searchPlaces);
router.get('/config', mapController.getMapConfig);

// Authenticated map address saving endpoint
router.post('/save-address', protect, mapController.saveMapAddress);

module.exports = router;
