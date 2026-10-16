const mongoose = require('mongoose');

const TrackingEventSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now },
    status: { type: String, required: true },
    location: { type: String, default: '' },
    activity: { type: String, required: true },
  },
  { _id: false }
);

const CourierShipmentSchema = new mongoose.Schema(
  {
    shipmentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    subOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubOrder',
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
    },
    orderNumber: {
      type: String,
      default: '',
    },
    courierPartner: {
      type: String,
      enum: ['SHIPROCKET', 'DELHIVERY', 'BLUEDART', 'LOCAL_FLEET'],
      default: 'SHIPROCKET',
    },
    awbCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    shipmentStatus: {
      type: String,
      enum: [
        'MANIFESTED',
        'AWB_ASSIGNED',
        'PICKUP_SCHEDULED',
        'PICKED_UP',
        'IN_TRANSIT',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'RTO_INITIATED',
        'CANCELLED',
      ],
      default: 'AWB_ASSIGNED',
      index: true,
    },
    pickupLocation: {
      type: String,
      default: 'Primary Warehouse - Delhi Central Hub',
    },
    pickupScheduledAt: {
      type: Date,
      default: null,
    },
    pickedUpAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    estimatedDeliveryDate: {
      type: Date,
      default: null,
    },
    labelUrl: {
      type: String,
      default: '',
    },
    manifestUrl: {
      type: String,
      default: '',
    },
    customerDetails: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
      address: { type: String, default: '' },
    },
    packageDetails: {
      weightKg: { type: Number, default: 0.5 },
      lengthCm: { type: Number, default: 15 },
      widthCm: { type: Number, default: 10 },
      heightCm: { type: Number, default: 5 },
      declaredValue: { type: Number, default: 0 },
      isCod: { type: Boolean, default: false },
      codAmount: { type: Number, default: 0 },
    },
    trackingHistory: [TrackingEventSchema],
  },
  {
    timestamps: true,
  }
);

CourierShipmentSchema.index({ createdAt: -1 });

module.exports = mongoose.models.CourierShipment || mongoose.model('CourierShipment', CourierShipmentSchema);
