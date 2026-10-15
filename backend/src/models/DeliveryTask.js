const mongoose = require('mongoose');

const deliveryTaskSchema = new mongoose.Schema(
  {
    subOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubOrder',
      required: true,
      unique: true,
    },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    pickupLocation: {
      storeName: String,
      phone: String,
      address: String,
      city: String,
      pincode: String,
    },
    dropLocation: {
      recipientName: String,
      phone: String,
      address: String,
      city: String,
      pincode: String,
      landmark: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
      mapUrl: String,
    },
    status: {
      type: String,
      enum: ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED'],
      default: 'ASSIGNED',
    },
    isCod: {
      type: Boolean,
      default: false,
    },
    amountToCollect: {
      type: Number,
      default: 0,
    },
    amountCollected: {
      type: Number,
      default: 0,
    },
    otpVerified: {
      type: Boolean,
      default: false,
    },
    otpVerificationLog: {
      attempts: { type: Number, default: 0 },
      lastAttemptAt: Date,
      verifiedAt: Date,
      method: { type: String, default: 'PINPAD' },
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    // Point #25: Order Delivery Instructions / Rider Notes
    deliveryInstructions: {
      type: String,
      default: '',
      trim: true,
    },
    // Point #67: Digital Customer Signature Pad on screen
    customerSignature: {
      type: String,
      default: null,
    },
    signatureDetails: {
      signerName: { type: String, default: '' },
      signerRelation: { type: String, default: 'Self' },
      signedAt: { type: Date, default: null },
      ipAddress: { type: String, default: '' },
    },
    // Point #68: Doorstep Photo Proof of Delivery upload
    proofPhoto: {
      type: String,
      default: null,
    },
    proofPhotoDetails: {
      uploadedAt: { type: Date, default: null },
      notes: { type: String, default: '' },
      fileSize: { type: String, default: '' },
      tag: { type: String, default: 'DOORSTEP_DROP' },
      geoTag: {
        lat: Number,
        lng: Number,
      },
    },
    // Point #69: Cash on Delivery (COD) Cash Collection Reconciliation
    codReconciliation: {
      status: {
        type: String,
        enum: ['PENDING', 'SUBMITTED', 'VERIFIED'],
        default: 'PENDING',
      },
      submittedAt: Date,
      reconciledAt: Date,
      referenceCode: String,
      notes: String,
    },
    // Point #70: Delivery Failure Workflow (Reason & reschedule)
    failureLog: {
      reason: String,
      attemptCount: { type: Number, default: 0 },
      rescheduledFor: Date,
      timeSlot: { type: String, default: 'ANYTIME' },
      reportedAt: Date,
      notes: String,
      isRto: { type: Boolean, default: false },
      history: [
        {
          reason: String,
          notes: String,
          attemptNumber: Number,
          rescheduledFor: Date,
          timeSlot: String,
          reportedAt: { type: Date, default: Date.now },
          riderName: String,
        },
      ],
    },
    // Point #65: Instant WhatsApp / Direct Call to Customer contact attempts audit
    contactLogs: [
      {
        channel: {
          type: String,
          enum: ['CALL', 'WHATSAPP'],
          required: true,
        },
        templateId: String,
        messageSnippet: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        riderName: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeliveryTask', deliveryTaskSchema);
