const mongoose = require('mongoose');

const CourierIntegrationSchema = new mongoose.Schema(
  {
    defaultCourier: {
      type: String,
      enum: ['SHIPROCKET', 'DELHIVERY', 'BLUEDART'],
      default: 'SHIPROCKET',
    },
    autoGenerateAwb: {
      type: Boolean,
      default: true,
    },
    autoSchedulePickup: {
      type: Boolean,
      default: true,
    },
    shiprocket: {
      enabled: { type: Boolean, default: true },
      mode: { type: String, enum: ['sandbox', 'live'], default: 'sandbox' },
      email: { type: String, default: 'dispatch@auramarket.com', trim: true },
      password: { type: String, default: 'ShiprocketSecure2026!', select: false },
      apiKey: { type: String, default: 'sr_api_992149182348', trim: true },
      defaultPickupLocation: { type: String, default: 'Primary Warehouse - Delhi NCR Hub' },
      token: { type: String, default: '', select: false },
    },
    delhivery: {
      enabled: { type: Boolean, default: true },
      mode: { type: String, enum: ['sandbox', 'live'], default: 'sandbox' },
      apiToken: { type: String, default: 'delhivery_tok_881923841029', select: false },
      clientName: { type: String, default: 'AURAMARKET_EXPRESS', trim: true },
      pickupLocation: { type: String, default: 'Delhivery Surface Hub - Bhiwandi / Gurugram' },
    },
    bluedart: {
      enabled: { type: Boolean, default: false },
      mode: { type: String, enum: ['sandbox', 'live'], default: 'sandbox' },
      loginId: { type: String, default: 'BLUEDART_DELHI', trim: true },
      licenseKey: { type: String, default: 'bd_lic_481920', select: false },
    },
    webhookSecret: {
      type: String,
      default: 'whsec_courier_webhook_secret_2026',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.CourierIntegration || mongoose.model('CourierIntegration', CourierIntegrationSchema);
