const mongoose = require('mongoose');

const DeliverySlotTemplateSchema = new mongoose.Schema(
  {
    slotKey: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: {
      type: String, // HH:mm (e.g. '09:00')
      required: true,
      trim: true,
    },
    endTime: {
      type: String, // HH:mm (e.g. '12:00')
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['HYPERLOCAL_1HR', 'SAME_DAY', 'SCHEDULED_SLOT', 'STANDARD'],
      default: 'SCHEDULED_SLOT',
    },
    cutoffMinutesBeforeStart: {
      type: Number,
      default: 60,
      min: 0,
    },
    maxCapacity: {
      type: Number,
      default: 30,
      min: 1,
    },
    fee: {
      type: Number,
      default: 29,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const DeliverySlotConfigSchema = new mongoose.Schema(
  {
    hyperlocal1Hour: {
      enabled: {
        type: Boolean,
        default: true,
      },
      fee: {
        type: Number,
        default: 49,
        min: 0,
      },
      maxOrdersPerHour: {
        type: Number,
        default: 20,
        min: 1,
      },
      operatingStart: {
        type: String,
        default: '07:00', // 7:00 AM
        trim: true,
      },
      operatingEnd: {
        type: String,
        default: '22:00', // 10:00 PM
        trim: true,
      },
      slaMinutes: {
        type: Number,
        default: 60,
        min: 15,
      },
      badgeText: {
        type: String,
        default: '⚡ 1-Hour Hyperlocal Express',
        trim: true,
      },
      maxDistanceKm: {
        type: Number,
        default: 15,
        min: 1,
      },
    },
    autoAssignment: {
      enabled: {
        type: Boolean,
        default: true,
      },
      maxConcurrentTasksPerRider: {
        type: Number,
        default: 3,
        min: 1,
        max: 10,
      },
      maxRiderSearchRadiusKm: {
        type: Number,
        default: 20,
        min: 1,
      },
      prioritizeProximity: {
        type: Boolean,
        default: true,
      },
      fallbackToManual: {
        type: Boolean,
        default: true,
      },
      reassignOnRejectMinutes: {
        type: Number,
        default: 10,
        min: 1,
      },
    },
    slots: {
      type: [DeliverySlotTemplateSchema],
      default: [
        {
          slotKey: 'morning_09_12',
          title: 'Morning Slot (9:00 AM - 12:00 PM)',
          startTime: '09:00',
          endTime: '12:00',
          type: 'SCHEDULED_SLOT',
          cutoffMinutesBeforeStart: 60,
          maxCapacity: 30,
          fee: 29,
          isActive: true,
        },
        {
          slotKey: 'afternoon_13_16',
          title: 'Afternoon Slot (1:00 PM - 4:00 PM)',
          startTime: '13:00',
          endTime: '16:00',
          type: 'SCHEDULED_SLOT',
          cutoffMinutesBeforeStart: 60,
          maxCapacity: 30,
          fee: 29,
          isActive: true,
        },
        {
          slotKey: 'evening_17_20',
          title: 'Evening Slot (5:00 PM - 8:00 PM)',
          startTime: '17:00',
          endTime: '20:00',
          type: 'SCHEDULED_SLOT',
          cutoffMinutesBeforeStart: 60,
          maxCapacity: 35,
          fee: 29,
          isActive: true,
        },
        {
          slotKey: 'night_20_23',
          title: 'Late Night Express (8:00 PM - 11:00 PM)',
          startTime: '20:00',
          endTime: '23:00',
          type: 'SAME_DAY',
          cutoffMinutesBeforeStart: 45,
          maxCapacity: 25,
          fee: 39,
          isActive: true,
        },
      ],
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.DeliverySlotConfig ||
  mongoose.model('DeliverySlotConfig', DeliverySlotConfigSchema);
