const mongoose = require('mongoose');

const affiliateTierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  minSales: {
    type: Number,
    required: true,
    default: 0,
  },
  defaultRate: {
    type: Number,
    required: true,
    default: 5,
  },
  perkDescription: {
    type: String,
    default: '',
  },
});

const affiliateProgramSettingSchema = new mongoose.Schema(
  {
    programEnabled: {
      type: Boolean,
      default: true,
    },
    cookieDurationDays: {
      type: Number,
      default: 30,
      min: 1,
      max: 365,
    },
    minPayoutThreshold: {
      type: Number,
      default: 500,
      min: 0,
    },
    autoApproveNewPartners: {
      type: Boolean,
      default: false,
    },
    tiers: {
      type: [affiliateTierSchema],
      default: () => [
        { name: 'STANDARD', minSales: 0, defaultRate: 5, perkDescription: 'Standard 5% commission on all referred items' },
        { name: 'SILVER', minSales: 25000, defaultRate: 7.5, perkDescription: 'Silver 7.5% commission + monthly creator shoutout' },
        { name: 'GOLD', minSales: 100000, defaultRate: 10, perkDescription: 'Gold 10% commission + priority review approval' },
        { name: 'PLATINUM', minSales: 250000, defaultRate: 12.5, perkDescription: 'Platinum 12.5% commission + exclusive new launch kits' },
        { name: 'VIP_INFLUENCER', minSales: 500000, defaultRate: 15, perkDescription: 'VIP 15% commission + dedicated affiliate manager' },
      ],
    },
  },
  {
    timestamps: true,
  }
);

affiliateProgramSettingSchema.statics.getOrCreateSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('AffiliateProgramSetting', affiliateProgramSettingSchema);
