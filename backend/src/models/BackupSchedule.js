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
    cronExpression: {
      type: String,
      default: '0 2 * * *', // Daily at 02:00
      trim: true,
    },
    retentionDays: {
      type: Number,
      default: 14,
      min: 1,
      max: 365,
    },
    autoPruneOldBackups: {
      type: Boolean,
      default: true,
    },
    keepPinnedIndefinitely: {
      type: Boolean,
      default: true,
    },
    storageDestination: {
      type: String,
      enum: ['LOCAL_DISK', 'S3_SECURE', 'GOOGLE_DRIVE', 'CLOUDFLARE_R2', 'GCS_COLDLINE'],
      default: 'LOCAL_DISK',
    },
    s3Bucket: {
      type: String,
      default: 'auramarket-backups',
    },
    gdriveFolderId: {
      type: String,
      default: '',
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
