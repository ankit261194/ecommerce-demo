const mongoose = require('mongoose');

const cronJobSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    cronExpression: {
      type: String,
      required: true,
      default: '*/15 * * * *',
    },
    intervalText: {
      type: String,
      default: 'Every 15 minutes',
    },
    category: {
      type: String,
      enum: ['SYSTEM', 'MARKETING', 'ORDERS', 'LOGISTICS', 'MAINTENANCE'],
      default: 'SYSTEM',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['IDLE', 'RUNNING', 'COMPLETED', 'FAILED'],
      default: 'IDLE',
    },
    lastRunAt: {
      type: Date,
      default: null,
    },
    lastRunDurationMs: {
      type: Number,
      default: 0,
    },
    lastRunStatus: {
      type: String,
      enum: ['SUCCESS', 'FAILURE', 'SKIPPED', 'NEVER_RUN'],
      default: 'NEVER_RUN',
    },
    lastError: {
      type: String,
      default: null,
    },
    nextRunAt: {
      type: Date,
      default: null,
    },
    runCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('CronJob', cronJobSchema);
