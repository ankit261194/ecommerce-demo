const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
      // e.g., 'UPDATE_PRODUCT', 'UPDATE_PRICE', 'CHANGE_VENDOR_STATUS', 'UPDATE_SETTINGS', 'TOGGLE_MAINTENANCE', 'GENERATE_AWB', 'SETTLE_PAYOUT', 'EXPORT_DATA', 'DATABASE_BACKUP_EXPORTED'
    },
    module: {
      type: String,
      required: true,
      enum: [
        'ORDERS',
        'VENDORS',
        'FINANCE',
        'CATALOG',
        'PRODUCTS',
        'CUSTOMERS',
        'MARKETING',
        'SETTINGS',
        'STAFF',
        'SYSTEM',
        'SECURITY',
        'INVENTORY',
        'SHIPPING_LOGISTICS',
      ],
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
    changeSummary: {
      type: String,
      default: '',
    },
    previousValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
    userAgent: {
      type: String,
      default: '',
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'LOW',
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

// High-speed compound indexes for audit filtering & compliance reporting
auditLogSchema.index({ module: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ userEmail: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
