const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
      // e.g., 'ORDER_STATUS_UPDATED', 'VENDOR_KYC_APPROVED', 'PAYOUT_DISBURSED', 'SETTINGS_UPDATED', 'STAFF_CREATED', 'DATABASE_BACKUP_EXPORTED'
    },
    module: {
      type: String,
      required: true,
      enum: ['ORDERS', 'VENDORS', 'FINANCE', 'CATALOG', 'CUSTOMERS', 'MARKETING', 'SETTINGS', 'STAFF', 'SYSTEM'],
      default: 'SYSTEM',
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    userName: {
      type: String,
      default: 'Super Admin',
    },
    userEmail: {
      type: String,
      default: 'admin@auramarket.com',
    },
    userRole: {
      type: String,
      default: 'superadmin',
    },
    targetId: {
      type: String,
      default: '',
    },
    targetType: {
      type: String,
      default: '', // 'Order', 'VendorProfile', 'User', 'Product', 'UIConfig', 'Ledger'
    },
    description: {
      type: String,
      required: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'WARNING', 'FAILED'],
      default: 'SUCCESS',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookup
auditLogSchema.index({ module: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ userEmail: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
