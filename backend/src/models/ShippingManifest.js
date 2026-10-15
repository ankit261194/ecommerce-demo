const mongoose = require('mongoose');

const manifestParcelSchema = new mongoose.Schema({
  subOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubOrder',
  },
  orderNumber: {
    type: String,
    required: true,
  },
  trackingNumber: {
    type: String,
    required: true,
  },
  barcode: {
    type: String,
    required: true,
  },
  customerName: {
    type: String,
    required: true,
  },
  customerPhone: {
    type: String,
    default: '',
  },
  destinationCity: {
    type: String,
    default: 'Delhi',
  },
  destinationPincode: {
    type: String,
    required: true,
  },
  weightKg: {
    type: Number,
    default: 0.5,
  },
  declaredValue: {
    type: Number,
    default: 0,
  },
  paymentMode: {
    type: String,
    enum: ['COD', 'PREPAID'],
    default: 'PREPAID',
  },
  collectibleAmount: {
    type: Number,
    default: 0,
  },
  itemsCount: {
    type: Number,
    default: 1,
  },
});

const shippingManifestSchema = new mongoose.Schema(
  {
    manifestNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    courierPartner: {
      type: String,
      required: true,
      trim: true,
    },
    dispatchDate: {
      type: Date,
      default: Date.now,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      default: null,
    },
    pickupHub: {
      hubName: { type: String, default: 'AuraMarket Central Fulfillment Hub #1' },
      address: { type: String, default: 'Plot 42, Okhla Industrial Area Phase III' },
      city: { type: String, default: 'New Delhi' },
      state: { type: String, default: 'Delhi' },
      pincode: { type: String, default: '110020' },
      phone: { type: String, default: '+91 11 4982 0000' },
    },
    parcels: [manifestParcelSchema],
    totalParcels: {
      type: Number,
      default: 0,
    },
    totalWeightKg: {
      type: Number,
      default: 0,
    },
    totalCodAmount: {
      type: Number,
      default: 0,
    },
    totalDeclaredValue: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['GENERATED', 'HANDED_OVER', 'CANCELLED'],
      default: 'GENERATED',
    },
    handedOverAt: {
      type: Date,
      default: null,
    },
    courierDriverName: {
      type: String,
      default: '',
    },
    courierDriverPhone: {
      type: String,
      default: '',
    },
    courierVehicleNumber: {
      type: String,
      default: '',
    },
    courierSignatureNote: {
      type: String,
      default: '',
    },
    supervisorName: {
      type: String,
      default: 'Dispatch Manager',
    },
    supervisorSignatureNote: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ShippingManifest', shippingManifestSchema);
