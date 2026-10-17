const express = require('express');
const router = express.Router();
const {
  getQueuesOverview,
  getQueueJobs,
  getJobDetails,
  dispatchJob,
  retryJob,
  deleteJob,
  pauseQueue,
  resumeQueue,
  cleanQueue,
  getQueueSettings,
  updateQueueSettings,
} = require('../controllers/jobQueueController');
const { protect, authorize } = require('../middlewares/auth');

// All queue administration endpoints require superadmin or admin authorization
router.use(protect, authorize('superadmin', 'admin'));

// Queue Metrics & Settings
router.get('/', getQueuesOverview);
router.get('/settings', getQueueSettings);
router.put('/settings', updateQueueSettings);

// Dispatch & Management
router.post('/dispatch', dispatchJob);
router.get('/jobs/:jobId', getJobDetails);
router.post('/jobs/:jobId/retry', retryJob);
router.delete('/jobs/:jobId', deleteJob);

// Queue-Level Controls
router.get('/:queueName/jobs', getQueueJobs);
router.post('/:queueName/pause', pauseQueue);
router.post('/:queueName/resume', resumeQueue);
router.post('/:queueName/clean', cleanQueue);

module.exports = router;
