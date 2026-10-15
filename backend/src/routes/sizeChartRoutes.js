const express = require('express');
const router = express.Router();
const sizeChartController = require('../controllers/sizeChartController');
const { protect, authorize } = require('../middlewares/auth');

// Public routes
router.get('/', sizeChartController.getAllSizeCharts);
router.post('/recommend', sizeChartController.recommendSize);
router.get('/:categoryKey', sizeChartController.getSizeChartByKey);

// Superadmin routes
router.post('/', protect, authorize('superadmin'), sizeChartController.createOrUpdateSizeChart);

module.exports = router;
