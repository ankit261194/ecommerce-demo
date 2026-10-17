const jobQueueService = require('../services/jobQueueService');
const JobQueue = require('../models/JobQueue');

/**
 * GET /api/admin/queues
 * Fetch queues overview, metrics, worker counts, and Redis status
 */
exports.getQueuesOverview = async (req, res) => {
  try {
    const stats = await jobQueueService.getStats();
    res.json({
      success: true,
      message: 'Queue overview retrieved successfully',
      data: stats,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve queue metrics',
      error: err.message,
    });
  }
};

/**
 * GET /api/admin/queues/:queueName/jobs
 * List jobs in a queue with status filtering, search, and pagination
 */
exports.getQueueJobs = async (req, res) => {
  try {
    const { queueName } = req.params;
    const result = await jobQueueService.getJobs(queueName, req.query);
    res.json({
      success: true,
      message: `Jobs for queue "${queueName}" retrieved successfully`,
      data: result.jobs,
      pagination: result.pagination,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve jobs for queue',
      error: err.message,
    });
  }
};

/**
 * GET /api/admin/queues/jobs/:jobId
 * Retrieve detailed job execution record, logs, and stack trace
 */
exports.getJobDetails = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await JobQueue.findOne({ jobId }).lean();
    if (!job) {
      return res.status(404).json({
        success: false,
        message: `Job ${jobId} not found`,
      });
    }

    res.json({
      success: true,
      data: job,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job details',
      error: err.message,
    });
  }
};

/**
 * POST /api/admin/queues/dispatch
 * Dispatch a new job or test job to a queue
 */
exports.dispatchJob = async (req, res) => {
  try {
    const {
      queueName = 'default',
      name,
      data = {},
      priority = 5,
      delay = 0,
      maxAttempts = 3,
      tags = [],
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Job action name is required (e.g., test_job, send_email, generate_report)',
      });
    }

    const job = await jobQueueService.dispatch(queueName, name.trim(), data, {
      priority: Number(priority) || 5,
      delay: Number(delay) || 0,
      maxAttempts: Number(maxAttempts) || 3,
      tags: Array.isArray(tags) ? tags : [],
    });

    res.status(201).json({
      success: true,
      message: `Job ${job.jobId} successfully dispatched to queue "${job.queueName}"`,
      data: job,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to dispatch background job',
      error: err.message,
    });
  }
};

/**
 * POST /api/admin/queues/jobs/:jobId/retry
 * Re-queue a failed job or Dead-Letter Queue (DLQ) item
 */
exports.retryJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await jobQueueService.retryJob(jobId);
    res.json({
      success: true,
      message: `Job ${jobId} successfully re-queued for execution`,
      data: job,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to retry job',
    });
  }
};

/**
 * DELETE /api/admin/queues/jobs/:jobId
 * Permanently remove a job from queue or DLQ
 */
exports.deleteJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await jobQueueService.deleteJob(jobId);
    res.json({
      success: true,
      message: `Job ${jobId} permanently deleted`,
      data: job,
    });
  } catch (err) {
    res.status(404).json({
      success: false,
      message: err.message || 'Failed to delete job',
    });
  }
};

/**
 * POST /api/admin/queues/:queueName/pause
 * Pause processing for a queue
 */
exports.pauseQueue = async (req, res) => {
  try {
    const { queueName } = req.params;
    jobQueueService.pauseQueue(queueName);
    res.json({
      success: true,
      message: `Queue "${queueName}" has been paused. Pending jobs will not be processed until resumed.`,
      queueName,
      isPaused: true,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * POST /api/admin/queues/:queueName/resume
 * Resume processing for a paused queue
 */
exports.resumeQueue = async (req, res) => {
  try {
    const { queueName } = req.params;
    jobQueueService.resumeQueue(queueName);
    res.json({
      success: true,
      message: `Queue "${queueName}" has been resumed. Workers will now process pending jobs.`,
      queueName,
      isPaused: false,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * POST /api/admin/queues/:queueName/clean
 * Purge completed or failed jobs from a queue
 */
exports.cleanQueue = async (req, res) => {
  try {
    const { queueName } = req.params;
    const { type = 'completed' } = req.body;
    const result = await jobQueueService.cleanQueue(queueName, type);
    res.json({
      success: true,
      message: `Purged ${result.purgedCount} ${type} jobs from queue "${queueName}"`,
      data: result,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to clean queue',
      error: err.message,
    });
  }
};

/**
 * GET /api/admin/queues/settings
 * Retrieve background worker and queue settings with masked Redis password
 */
exports.getQueueSettings = async (req, res) => {
  try {
    const settings = jobQueueService.settings;
    const maskedSettings = {
      ...settings,
      redis: {
        ...settings.redis,
        password: settings.redis.password ? '••••••••' : '',
      },
    };
    res.json({
      success: true,
      data: maskedSettings,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to get queue settings',
      error: err.message,
    });
  }
};

/**
 * PUT /api/admin/queues/settings
 * Update worker concurrency, polling interval, retries, and Redis config
 */
exports.updateQueueSettings = async (req, res) => {
  try {
    const { concurrency, pollIntervalMs, maxRetries, autoCleanCompletedDays, redis } = req.body;
    const updatePayload = {};

    if (concurrency !== undefined) updatePayload.concurrency = concurrency;
    if (pollIntervalMs !== undefined) updatePayload.pollIntervalMs = pollIntervalMs;
    if (maxRetries !== undefined) updatePayload.maxRetries = maxRetries;
    if (autoCleanCompletedDays !== undefined) updatePayload.autoCleanCompletedDays = autoCleanCompletedDays;

    if (redis && typeof redis === 'object') {
      updatePayload.redis = {};
      if (redis.enabled !== undefined) updatePayload.redis.enabled = Boolean(redis.enabled);
      if (redis.host) updatePayload.redis.host = String(redis.host).trim();
      if (redis.port) updatePayload.redis.port = Number(redis.port) || 6379;
      if (redis.db !== undefined) updatePayload.redis.db = Number(redis.db) || 0;
      if (redis.password && redis.password !== '••••••••') {
        updatePayload.redis.password = String(redis.password).trim();
      }
    }

    const updated = jobQueueService.updateSettings(updatePayload);
    res.json({
      success: true,
      message: 'Queue and worker settings updated successfully',
      data: {
        ...updated,
        redis: {
          ...updated.redis,
          password: updated.redis.password ? '••••••••' : '',
        },
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to update queue settings',
      error: err.message,
    });
  }
};
