const mongoose = require('mongoose');

const hsnItemSummarySchema = new mongoose.Schema(
  {
    hsnCode: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    taxableAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    gstRate: {
      type: Number,
      required: true,
      default: 18,
    },
    cgstAmount: {
      type: Number,
      default: 0,
    },
    sgstAmount: {
      type: Number,
      default: 0,
    },
    igstAmount: {
      type: Number,
      default: 0,
    },
    cessAmount: {
      type: Number,
      default: 0,
    },
    totalTax: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const eInvoiceSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    subOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubOrder',
      default: null,
      index: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    invoiceDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // 64-character SHA-256 Invoice Reference Number
    irn: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    ackNo: {
      type: String,
      required: true,
      trim: true,
    },
    ackDate: {
      type: Date,
      default: Date.now,
    },
    signedQrCode: {
      type: String,
      required: true,
    },
    signedInvoiceJwt: {
      type: String,
      default: '',
    },
    supplyType: {
      type: String,
      enum: ['B2B', 'B2C', 'EXPORT'],
      default: 'B2C',
      index: true,
    },
    taxType: {
      type: String,
      enum: ['INTRA_STATE', 'INTER_STATE'],
      default: 'INTRA_STATE',
      index: true,
    },
    eWayBill: {
      ewayBillNo: { type: String, default: null },
      ewayBillDate: { type: Date, default: null },
      validUpto: { type: Date, default: null },
      vehicleNumber: { type: String, default: null },
      distanceKm: { type: Number, default: 0 },
      status: { type: String, enum: ['ACTIVE', 'CANCELLED', 'EXPIRED'], default: 'ACTIVE' },
    },
    hsnSummary: [hsnItemSummarySchema],
    totalTaxableAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    totalCgst: {
      type: Number,
      default: 0,
    },
    totalSgst: {
      type: Number,
      default: 0,
    },
    totalIgst: {
      type: Number,
      default: 0,
    },
    totalCess: {
      type: Number,
      default: 0,
    },
    roundOff: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      default: 0,
    },
    tdsSection194O: {
      applicable: { type: Boolean, default: true },
      ratePercent: { type: Number, default: 1.0 },
      tdsAmount: { type: Number, default: 0 },
    },
    tcsSection52: {
      applicable: { type: Boolean, default: true },
      ratePercent: { type: Number, default: 1.0 },
      tcsAmount: { type: Number, default: 0 },
      cgstTcs: { type: Number, default: 0 },
      sgstTcs: { type: Number, default: 0 },
      igstTcs: { type: Number, default: 0 },
    },
    supplierDetails: {
      legalName: { type: String, default: '' },
      tradeName: { type: String, default: '' },
      gstin: { type: String, default: '' },
      address: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      stateCode: { type: String, default: '07' },
      pincode: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    buyerDetails: {
      legalName: { type: String, default: '' },
      gstin: { type: String, default: 'URP' },
      address: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      stateCode: { type: String, default: '07' },
      pincode: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      isB2B: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: ['GENERATED', 'CANCELLED', 'FAILED'],
      default: 'GENERATED',
      index: true,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      enum: ['', 'DUPLICATE', 'DATA_ENTRY_MISTAKE', 'ORDER_CANCELLED', 'OTHER'],
      default: '',
    },
    cancellationRemarks: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.EInvoice || mongoose.model('EInvoice', eInvoiceSchema);
