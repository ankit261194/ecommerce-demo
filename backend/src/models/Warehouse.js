const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Warehouse name is required'],
      trim: true,
    },
    warehouseCode: {
      type: String,
      required: [true, 'Unique warehouse code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['CENTRAL_HUB', 'REGIONAL_DC', 'DARK_STORE', 'RETURN_FACILITY'],
      default: 'REGIONAL_DC',
    },
    address: {
      street: { type: String, trim: true, default: '' },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      pincode: {
        type: String,
        required: [true, 'Pincode is required'],
        trim: true,
        match: [/^\d{6}$/, 'Pincode must be exactly 6 digits'],
        index: true,
      },
      country: { type: String, default: 'India', trim: true },
      location: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          default: [77.2090, 28.6139], // Default Delhi
        },
      },
    },
    contact: {
      managerName: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, lowercase: true, default: '' },
    },
    servicedPincodes: [
      {
        type: String,
        trim: true,
        match: [/^\d{6}$/, 'Serviced pincode must be exactly 6 digits'],
      },
    ],
    servicedZones: [
      {
        type: String,
        enum: ['NORTH', 'SOUTH', 'EAST', 'WEST', 'CENTRAL', 'NORTH_EAST'],
      },
    ],
    status: {
      type: String,
      enum: ['ACTIVE', 'MAINTENANCE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
    capacity: {
      maxDailyShipments: { type: Number, default: 5000, min: 0 },
      currentDailyShipments: { type: Number, default: 0, min: 0 },
      totalPalletCapacity: { type: Number, default: 1200, min: 0 },
      usedPalletCapacity: { type: Number, default: 450, min: 0 },
    },
    dispatchCutoffTime: {
      type: String,
      default: '18:00',
      trim: true,
    },
    slaHours: {
      type: Number,
      default: 24,
      min: 1,
    },
    isPrimaryDefault: {
      type: Boolean,
      default: false,
    },
    operatingHours: {
      type: String,
      default: '08:00 - 22:00',
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for geo queries
warehouseSchema.index({ 'address.location': '2dsphere' });

module.exports = mongoose.model('Warehouse', warehouseSchema);
