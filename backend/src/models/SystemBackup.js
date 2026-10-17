const mongoose = require('mongoose');

const systemBackupSchema = new mongoose.Schema(
  {
    backupId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSizeBytes: {
      type: Number,
      default: 0,
    },
    fileSizeFormatted: {
      type: String,
      default: '0 KB',
    },
    totalRecords: {
      type: Number,
      default: 0,
    },
    collectionsCount: {
      type: Number,
      default: 0,
    },
    type: {
      type: String,
      enum: ['MANUAL', 'SCHEDULED_DAILY', 'SCHEDULED_WEEKLY', 'AUTOMATED'],
      default: 'MANUAL',
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'IN_PROGRESS', 'FAILED'],
      default: 'SUCCESS',
    },
    checksum: {
      type: String,
      default: '',
    },
    backupData: {
      type: mongoose.Schema.Types.Mixed,
      select: false,
    },
    retentionDays: {
      type: Number,
      default: 30,
    },
    cloudSyncStatus: {
      type: String,
      enum: ['LOCAL_ONLY', 'SYNCED', 'PENDING', 'FAILED'],
      default: 'LOCAL_ONLY',
    },
    cloudProvider: {
      type: String,
      enum: ['NONE', 'AWS_S3', 'GOOGLE_DRIVE', 'CLOUDFLARE_R2'],
      default: 'NONE',
    },
    cloudUrl: {
      type: String,
      default: '',
    },
    syncedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: String,
      default: 'SYSTEM',
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    collectionsIncluded: [
      {
        type: String,
        trim: true,
      },
    ],
    restoreHistory: [
      {
        restoredAt: { type: Date, default: Date.now },
        restoredBy: String,
        recordsRestored: Number,
        durationMs: Number,
        isDryRun: Boolean,
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SystemBackup', systemBackupSchema);
