const mongoose = require('mongoose');

const warehouseInventorySchema = new mongoose.Schema(
  {
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Warehouse reference is required'],
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
      index: true,
    },
    sku: {
      type: String,
      trim: true,
      default: '',
    },
    title: {
      type: String,
      trim: true,
      default: '',
    },
    variantAttributes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    availableStock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Available stock cannot be negative'],
    },
    reservedStock: {
      type: Number,
      default: 0,
      min: [0, 'Reserved stock cannot be negative'],
    },
    safetyStock: {
      type: Number,
      default: 5,
      min: 0,
    },
    binLocation: {
      type: String,
      trim: true,
      default: 'A-01-01',
    },
    reorderThreshold: {
      type: Number,
      default: 10,
      min: 0,
    },
    lastRestockedAt: {
      type: Date,
      default: Date.now,
    },
    auditLog: [
      {
        action: {
          type: String,
          enum: [
            'INITIAL_IMPORT',
            'MANUAL_ADJUSTMENT',
            'ORDER_ALLOCATION',
            'ORDER_CANCELLATION',
            'TRANSFER_IN',
            'TRANSFER_OUT',
            'RESTOCK',
          ],
          required: true,
        },
        quantityDelta: {
          type: Number,
          required: true,
        },
        balanceAfter: {
          type: Number,
          required: true,
        },
        reason: {
          type: String,
          default: '',
        },
        performedBy: {
          type: String,
          default: 'SYSTEM',
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound unique index for warehouse + product + sku
warehouseInventorySchema.index({ warehouse: 1, product: 1, sku: 1 }, { unique: true });

module.exports = mongoose.model('WarehouseInventory', warehouseInventorySchema);
