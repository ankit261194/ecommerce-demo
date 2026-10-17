const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  title: String,
  image: String,
  variantSku: String,
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
  },
  reason: String,
});

const returnRequestSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    subOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubOrder',
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      required: true,
    },
    items: [returnItemSchema],
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    detailedDescription: {
      type: String,
      default: '',
      trim: true,
    },
    proofPhotos: [
      {
        type: String,
        trim: true,
      },
    ],
    // Point 18: Unboxing Video Proof
    unboxingVideo: {
      url: { type: String, default: '', trim: true },
      fileName: { type: String, default: '' },
      durationSeconds: { type: Number, default: 0 },
      fileSize: { type: Number, default: 0 },
      verified: { type: Boolean, default: false },
    },
    reasonCode: {
      type: String,
      enum: [
        'DAMAGED_IN_TRANSIT',
        'DEFECTIVE_PRODUCT',
        'WRONG_ITEM_DELIVERED',
        'MISSING_ACCESSORIES',
        'SIZE_FIT_MISMATCH',
        'QUALITY_NOT_AS_EXPECTED',
        'PACKAGE_TAMPERED',
        'OTHER',
      ],
      default: 'DAMAGED_IN_TRANSIT',
    },
    resolutionType: {
      type: String,
      enum: ['REPLACEMENT', 'REFUND_WALLET', 'REFUND_SOURCE'],
      default: 'REPLACEMENT',
    },
    pickupSchedule: {
      scheduledDate: { type: Date, default: null },
      timeSlot: {
        type: String,
        enum: ['09:00 - 13:00', '13:00 - 17:00', '17:00 - 20:00', 'ANYTIME'],
        default: '09:00 - 13:00',
      },
      pickupAddress: {
        street: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        pincode: { type: String, default: '' },
        landmark: { type: String, default: '' },
        phone: { type: String, default: '' },
      },
    },
    // Point 18: Automated 48-Hour Vendor Inspection SLA
    inspectionSLA: {
      deadline: { type: Date, default: null },
      vendorInspectedAt: { type: Date, default: null },
      isAutoApproved: { type: Boolean, default: false },
      autoApprovalReason: { type: String, default: '' },
      status: {
        type: String,
        enum: ['PENDING_INSPECTION', 'APPROVED', 'REJECTED', 'AUTO_APPROVED', 'COMPLETED'],
        default: 'PENDING_INSPECTION',
      },
      inspectionNotes: { type: String, default: '' },
      inspectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
    },
    // Point 18: Automated Replacement Order Reference
    replacementOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    replacementOrderNumber: {
      type: String,
      default: '',
    },
    requestType: {
      type: String,
      enum: ['RETURN_REFUND', 'EXCHANGE', 'REPLACEMENT'],
      default: 'RETURN_REFUND',
    },
    exchangeDetails: {
      requestedSize: { type: String, default: '' },
      requestedColor: { type: String, default: '' },
      replacementVariantSku: { type: String, default: '' },
      exchangeReason: { type: String, default: '' },
      customerNote: { type: String, default: '' },
    },
    reversePickupTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryTask',
    },
    reversePickupOtp: {
      type: String,
      default: '',
    },
    reversePickupStatus: {
      type: String,
      enum: ['NOT_SCHEDULED', 'SCHEDULED', 'OUT_FOR_PICKUP', 'PICKED_UP', 'COMPLETED', 'FAILED'],
      default: 'NOT_SCHEDULED',
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    refundMode: {
      type: String,
      enum: ['ORIGINAL_PAYMENT_METHOD', 'WALLET_COINS', 'BANK_TRANSFER'],
      default: 'ORIGINAL_PAYMENT_METHOD',
    },
    status: {
      type: String,
      enum: [
        'REQUESTED',
        'INSPECTION_PENDING',
        'APPROVED',
        'AUTO_APPROVED',
        'PICKUP_SCHEDULED',
        'INSPECTED',
        'REFUNDED',
        'REJECTED',
        'EXCHANGE_REQUESTED',
        'EXCHANGE_APPROVED',
        'REVERSE_PICKUP_ASSIGNED',
        'REVERSE_PICKUP_COMPLETED',
        'REPLACEMENT_CREATED',
        'REPLACEMENT_DISPATCHED',
        'REPLACEMENT_DELIVERED',
        'EXCHANGE_COMPLETED',
      ],
      default: 'REQUESTED',
    },
    resolutionNote: {
      type: String,
      default: '',
      trim: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReturnRequest', returnRequestSchema);
