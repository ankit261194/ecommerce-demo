const mongoose = require('mongoose');

const EmiTenureSchema = new mongoose.Schema({
  months: {
    type: Number,
    required: true,
    enum: [1, 2, 3, 4, 6, 9, 12, 18, 24, 36],
  },
  annualInterestRate: {
    type: Number,
    required: true,
    min: 0,
    max: 48,
    default: 15.0, // e.g. 15% per annum
  },
  isNoCost: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  minAmount: {
    type: Number,
    default: 2500,
  },
  description: {
    type: String,
    default: '',
  },
});

const BankConfigSchema = new mongoose.Schema({
  bankCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  bankName: {
    type: String,
    required: true,
  },
  logoUrl: {
    type: String,
    default: '',
  },
  color: {
    type: String,
    default: '#1e293b',
  },
  cardTypes: {
    type: [String],
    enum: ['CREDIT_CARD', 'DEBIT_CARD'],
    default: ['CREDIT_CARD'],
  },
  minAmount: {
    type: Number,
    default: 2500,
  },
  processingFee: {
    type: Number,
    default: 199,
  },
  processingFeeGst: {
    type: Number,
    default: 18, // 18% GST
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  binPrefixes: {
    type: [String],
    default: [], // First 6 digits of card BIN for auto-detection
  },
  tenures: [EmiTenureSchema],
});

const BnplProviderSchema = new mongoose.Schema({
  providerCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  providerName: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['CARDLESS_EMI', 'PAY_LATER', 'PAY_IN_3', 'PAY_IN_4'],
    default: 'CARDLESS_EMI',
  },
  logoUrl: {
    type: String,
    default: '',
  },
  color: {
    type: String,
    default: '#2563eb',
  },
  minAmount: {
    type: Number,
    default: 1500,
  },
  maxAmount: {
    type: Number,
    default: 100000,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  processingFee: {
    type: Number,
    default: 0,
  },
  tenures: [EmiTenureSchema],
});

const EmiConfigSchema = new mongoose.Schema(
  {
    isEnabled: {
      type: Boolean,
      default: true,
    },
    minOrderAmount: {
      type: Number,
      default: 2500,
      min: 100,
    },
    noCostEmiEnabled: {
      type: Boolean,
      default: true,
    },
    subsidizedBy: {
      type: String,
      enum: ['PLATFORM', 'VENDOR', 'SHARED'],
      default: 'PLATFORM',
    },
    subventionPlatformShare: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    defaultProcessingFee: {
      type: Number,
      default: 199,
    },
    processingFeeGstRate: {
      type: Number,
      default: 18,
    },
    banks: [BankConfigSchema],
    bnplProviders: [BnplProviderSchema],
    bannerMessage: {
      type: String,
      default: 'No Cost EMI available on major Credit Cards & Bajaj Finserv. Starting at ₹%minEmi%/mo!',
    },
    faqItems: [
      {
        question: String,
        answer: String,
      },
    ],
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('EmiConfig', EmiConfigSchema);
