const mongoose = require('mongoose');

const eInvoiceConfigSchema = new mongoose.Schema(
  {
    isEnabled: {
      type: Boolean,
      default: true,
    },
    environment: {
      type: String,
      enum: ['SANDBOX', 'PRODUCTION'],
      default: 'SANDBOX',
    },
    irpProvider: {
      type: String,
      enum: ['NIC', 'CLEAR', 'MASTERCARD', 'EY'],
      default: 'NIC',
    },
    gspClientId: {
      type: String,
      default: 'NIC_GSP_AURAMARKET_CLIENT',
      trim: true,
    },
    gspClientSecret: {
      type: String,
      default: 'NIC_GSP_PROD_SEC_88914',
      trim: true,
    },
    sellerGstin: {
      type: String,
      default: '07AAAAA0000A1Z5',
      trim: true,
      uppercase: true,
    },
    legalName: {
      type: String,
      default: 'AuraMarket E-Commerce Solutions Pvt Ltd',
      trim: true,
    },
    tradeName: {
      type: String,
      default: 'AuraMarket Official',
      trim: true,
    },
    stateCode: {
      type: String,
      default: '07',
      trim: true,
    },
    stateName: {
      type: String,
      default: 'Delhi',
      trim: true,
    },
    address: {
      type: String,
      default: 'Suite 402, Technology Tower, Nehru Place',
      trim: true,
    },
    city: {
      type: String,
      default: 'New Delhi',
      trim: true,
    },
    pincode: {
      type: String,
      default: '110019',
      trim: true,
    },
    phone: {
      type: String,
      default: '+91 11 4567 8900',
    },
    email: {
      type: String,
      default: 'tax-compliance@auramarket.com',
    },
    autoGenerateOnOrder: {
      type: Boolean,
      default: true,
    },
    autoGenerateOnDispatch: {
      type: Boolean,
      default: true,
    },
    ewayBillThreshold: {
      type: Number,
      default: 50000,
    },
    tds194ORatePercent: {
      type: Number,
      default: 1.0,
    },
    tcs52RatePercent: {
      type: Number,
      default: 1.0,
    },
    cancellationWindowHours: {
      type: Number,
      default: 24,
    },
    nicAuthToken: {
      type: String,
      default: 'NIC_BEARER_AUTH_TOKEN_ACTIVE_2026',
    },
    nicTokenExpiry: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 3600 * 1000),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.EInvoiceConfig || mongoose.model('EInvoiceConfig', eInvoiceConfigSchema);
