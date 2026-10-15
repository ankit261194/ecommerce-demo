const mongoose = require('mongoose');

const posOrderSchema = new mongoose.Schema(
  {
    posInvoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      required: true,
      index: true,
    },
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    cashierName: {
      type: String,
      default: 'Cashier',
    },
    customer: {
      name: { type: String, default: 'Walk-in Customer' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        title: { type: String, required: true },
        sku: { type: String, default: '' },
        barcode: { type: String, default: '' },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
        subtotal: { type: Number, required: true },
        taxRate: { type: Number, default: 18 },
        taxAmount: { type: Number, default: 0 },
        hsn: { type: String, default: '8518' },
      },
    ],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    taxTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'UPI', 'CARD', 'SPLIT'],
      default: 'CASH',
    },
    paymentDetails: {
      cashTendered: { type: Number, default: 0 },
      cashChangeDue: { type: Number, default: 0 },
      upiTransactionRef: { type: String, default: '' },
      cardLast4: { type: String, default: '' },
      splitCashAmount: { type: Number, default: 0 },
      splitDigitalAmount: { type: Number, default: 0 },
    },
    paperSize: {
      type: String,
      enum: ['80mm', '58mm'],
      default: '80mm',
    },
    status: {
      type: String,
      enum: ['COMPLETED', 'PARKED', 'CANCELLED'],
      default: 'COMPLETED',
      index: true,
    },
    parkedNotes: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PosOrder', posOrderSchema);
