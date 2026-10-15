const mongoose = require('mongoose');

const backupScheduleSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: true,
    },
    frequency: {
      type: String,
      enum: ['HOURLY', 'DAILY', 'WEEKLY'],
      default: 'DAILY',
    },
    scheduledTime: {
      type: String,
      default: '02:00',
    },
    retentionDays: {
      type: Number,
      default: 14,
      min: 1,
      max: 365,
    },
    storageDestination: {
      type: String,
      enum: ['LOCAL_DISK', 'S3_SECURE', 'GCS_COLDLINE'],
      default: 'LOCAL_DISK',
    },
    notifyOnSuccess: {
      type: Boolean,
      default: true,
    },
    notifyOnFailure: {
      type: Boolean,
      default: true,
    },
    lastAutomatedBackupAt: {
      type: Date,
      default: null,
    },
    lastAutomatedBackupStatus: {
      type: String,
      enum: ['SUCCESS', 'FAILURE', 'PENDING'],
      default: 'SUCCESS',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('BackupSchedule', backupScheduleSchema);
