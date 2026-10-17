const mongoose = require('mongoose');

const jobLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
  },
  message: {
    type: String,
    required: true,
  },
  level: {
    type: String,
    enum: ['info', 'warn', 'error', 'debug'],
    default: 'info',
  },
});

const jobQueueSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    queueName: {
      type: String,
      required: true,
      trim: true,
      index: true,
      enum: ['email', 'notifications', 'reports', 'maintenance', 'webhooks', 'default'],
      default: 'default',
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    priority: {
      type: Number,
      default: 5, // 1 = Highest, 5 = Normal, 10 = Low
      min: 1,
      max: 10,
      index: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused'],
      default: 'waiting',
      index: true,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    attemptsMade: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
      min: 1,
    },
    backoff: {
      type: {
        type: String,
        enum: ['fixed', 'exponential'],
        default: 'exponential',
      },
      delay: {
        type: Number,
        default: 1000, // ms
      },
    },
    delay: {
      type: Number,
      default: 0, // ms
    },
    runAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
    },
    error: {
      message: String,
      stack: String,
      code: String,
    },
    logs: [jobLogSchema],
    isDeadLetter: {
      type: Boolean,
      default: false,
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound index for queue polling optimization
jobQueueSchema.index({ queueName: 1, status: 1, runAt: 1, priority: 1 });

module.exports = mongoose.model('JobQueue', jobQueueSchema);
