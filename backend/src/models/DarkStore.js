const mongoose = require('mongoose');

// Haversine distance formula between two GPS coordinates in kilometers
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Ray-Casting Point-in-Polygon algorithm
function isPointInPolygon(point, polygon) {
  if (!polygon || polygon.length < 3) return false;
  const x = point.longitude;
  const y = point.latitude;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

const darkStoreSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Dark store name is required'],
      trim: true,
    },
    hubCode: {
      type: String,
      required: [true, 'Unique hub code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
    },
    contactPhone: {
      type: String,
      required: true,
      default: '+919876543210',
    },
    managerName: {
      type: String,
      default: 'Fulfillment Supervisor',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SURGE', 'PAUSED', 'CLOSED'],
      default: 'ACTIVE',
    },
    operatingHours: {
      openTime: { type: String, default: '06:00' },
      closeTime: { type: String, default: '23:30' },
      isOpen24x7: { type: Boolean, default: false },
    },
    geofenceType: {
      type: String,
      enum: ['RADIUS_CIRCLE', 'POLYGON'],
      default: 'RADIUS_CIRCLE',
    },
    centerLocation: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    radiusKm: {
      type: Number,
      default: 5,
      min: 0.5,
      max: 50,
    },
    polygonCoordinates: [
      {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
      },
    ],
    deliveryPromise: {
      minMinutes: { type: Number, default: 15 },
      maxMinutes: { type: Number, default: 30 },
      badgeText: { type: String, default: '⚡ 15-30 Mins Hyperlocal Delivery' },
    },
    pricing: {
      baseDeliveryFee: { type: Number, default: 29 },
      freeDeliveryThreshold: { type: Number, default: 499 },
      isSurgeActive: { type: Boolean, default: false },
      surgeFee: { type: Number, default: 20 },
      surgeReason: { type: String, default: 'High Demand / Rain Surge' },
    },
    capacity: {
      maxOrdersPerHour: { type: Number, default: 120 },
      currentActiveRiders: { type: Number, default: 14 },
    },
    assignedVendors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VendorProfile',
      },
    ],
    allocatedProducts: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        stock: { type: Number, default: 50 },
        isQuickCommerceOnly: { type: Boolean, default: false },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Method to test if given GPS coordinates fall inside this Dark Store geofence
darkStoreSchema.methods.validateGps = function (latitude, longitude) {
  const point = { latitude: Number(latitude), longitude: Number(longitude) };
  const dist = haversineDistanceKm(
    this.centerLocation.latitude,
    this.centerLocation.longitude,
    point.latitude,
    point.longitude
  );

  let isInside = false;

  if (this.geofenceType === 'POLYGON' && this.polygonCoordinates && this.polygonCoordinates.length >= 3) {
    isInside = isPointInPolygon(point, this.polygonCoordinates);
  } else {
    // Radius circle check
    isInside = dist <= (this.radiusKm || 5);
  }

  const effectiveSurge = Boolean(this.status === 'SURGE' || this.pricing?.isSurgeActive);
  const surgeAmount = effectiveSurge ? (this.pricing?.surgeFee || 0) : 0;
  const deliveryFee = (this.pricing?.baseDeliveryFee || 29) + surgeAmount;

  return {
    isDeliverable: isInside && this.status !== 'CLOSED' && this.status !== 'PAUSED',
    isInsideGeofence: isInside,
    distanceKm: Number(dist.toFixed(2)),
    distanceMeters: Math.round(dist * 1000),
    hubId: this._id,
    hubCode: this.hubCode,
    hubName: this.name,
    status: this.status,
    deliveryPromise: this.deliveryPromise,
    deliveryFee,
    isSurgeActive: effectiveSurge,
    surgeFee: surgeAmount,
    surgeReason: effectiveSurge ? this.pricing?.surgeReason : null,
  };
};

module.exports = mongoose.model('DarkStore', darkStoreSchema);
