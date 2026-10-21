const mongoose = require('mongoose');

const carrierOptionSchema = new mongoose.Schema(
  {
    carrierName: {
      type: String,
      required: true,
      trim: true,
    },
    serviceCode: {
      type: String,
      enum: ['EXPRESS', 'STANDARD', 'ECONOMY'],
      default: 'STANDARD',
    },
    estimatedDaysMin: {
      type: Number,
      required: true,
      min: 1,
    },
    estimatedDaysMax: {
      type: Number,
      required: true,
      min: 1,
    },
    baseRate: {
      type: Number,
      required: true,
      min: 0,
    },
    perKgRate: {
      type: Number,
      required: true,
      min: 0,
    },
    fuelSurchargePercent: {
      type: Number,
      default: 0,
      min: 0,
    },
    trackingSupported: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const hsCodeOverrideSchema = new mongoose.Schema(
  {
    hsPrefix: {
      type: String,
      required: true,
      trim: true,
    },
    dutyPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    description: String,
  },
  { _id: false }
);

const customsDutyRuleSchema = new mongoose.Schema(
  {
    calculationMode: {
      type: String,
      enum: ['DDP', 'DDU'],
      default: 'DDP', // Delivered Duty Paid (standard e-commerce customer experience)
    },
    deMinimisThreshold: {
      type: Number,
      default: 0, // Value under which customs duty is waived (in base currency or USD equivalent)
    },
    standardDutyPercent: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 100,
    },
    importVatPercent: {
      type: Number,
      default: 0.0,
      min: 0,
      max: 100,
    },
    hsCodeOverrides: [hsCodeOverrideSchema],
  },
  { _id: false }
);

const internationalShippingZoneSchema = new mongoose.Schema(
  {
    zoneName: {
      type: String,
      required: true,
      trim: true,
    },
    zoneCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    destinationCountries: {
      type: [String],
      required: true,
      validate: {
        validator: v => Array.isArray(v) && v.length > 0,
        message: 'At least one destination country code must be specified.',
      },
    },
    carrierOptions: [carrierOptionSchema],
    customsDutyRule: {
      type: customsDutyRuleSchema,
      default: () => ({}),
    },
    documentationRequired: {
      type: [String],
      default: ['COMMERCIAL_INVOICE', 'CN22_DECLARATION'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

internationalShippingZoneSchema.index({ zoneCode: 1, isActive: 1 });
internationalShippingZoneSchema.index({ destinationCountries: 1 });

module.exports = mongoose.model('InternationalShippingZone', internationalShippingZoneSchema);
