const mongoose = require('mongoose');

const stockTransferOrderSchema = new mongoose.Schema(
  {
    transferNumber: {
      type: String,
      required: [true, 'Transfer order number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    sourceWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Source warehouse is required'],
      index: true,
    },
    destinationWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Destination warehouse is required'],
      index: true,
    },
    status: {
      type: String,
      enum: [
        'DRAFT',
        'REQUESTED',
        'APPROVED',
        'DISPATCHED',
        'IN_TRANSIT',
        'PARTIALLY_RECEIVED',
        'RECEIVED',
        'CANCELLED',
      ],
      default: 'REQUESTED',
      index: true,
    },
    priority: {
      type: String,
      enum: ['STANDARD', 'URGENT', 'STOCKOUT_PREVENTION'],
      default: 'STANDARD',
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        sku: { type: String, trim: true, default: '' },
        title: { type: String, trim: true, default: 'Inventory Item' },
        requestedQuantity: { type: Number, required: true, min: 1 },
        dispatchedQuantity: { type: Number, default: 0, min: 0 },
        receivedQuantity: { type: Number, default: 0, min: 0 },
        damagedQuantity: { type: Number, default: 0, min: 0 },
        unitCost: { type: Number, default: 0, min: 0 },
        binLocation: { type: String, default: '' },
      },
    ],
    totalUnitsRequested: { type: Number, default: 0 },
    totalUnitsDispatched: { type: Number, default: 0 },
    totalUnitsReceived: { type: Number, default: 0 },
    transitDetails: {
      courierPartner: { type: String, trim: true, default: 'BlueDart Surface Logistics' },
      trackingNumber: { type: String, trim: true, default: '' },
      vehicleNumber: { type: String, trim: true, default: '' },
      driverName: { type: String, trim: true, default: '' },
      driverPhone: { type: String, trim: true, default: '' },
      dispatchedAt: { type: Date },
      estimatedArrival: { type: Date },
      receivedAt: { type: Date },
      dispatchedBy: { type: String, default: '' },
      receivedBy: { type: String, default: '' },
    },
    notes: { type: String, default: '' },
    manifestPdfUrl: { type: String, default: '' },
    activityTimeline: [
      {
        status: { type: String, required: true },
        note: { type: String, default: '' },
        performedBy: { type: String, default: 'SYSTEM' },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    createdBy: { type: String, default: 'SUPER_ADMIN' },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('StockTransferOrder', stockTransferOrderSchema);
