const mongoose = require('mongoose');

const deliveryTaskSchema = new mongoose.Schema(
  {
    subOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubOrder',
      required: false,
      sparse: true,
    },
    taskType: {
      type: String,
      enum: ['FORWARD_DELIVERY', 'REVERSE_PICKUP'],
      default: 'FORWARD_DELIVERY',
    },
    returnRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReturnRequest',
    },
    reversePickupDetails: {
      pickupOtp: { type: String, default: '' },
      requestedSize: { type: String, default: '' },
      requestedColor: { type: String, default: '' },
      itemTitle: { type: String, default: '' },
      customerNotes: { type: String, default: '' },
    },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
    },
    // Point 42: Dispatch Scheduler & Order Reference
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    dispatchType: {
      type: String,
      enum: ['1_HOUR_HYPERLOCAL', 'SCHEDULED_SLOT', 'STANDARD', 'FORWARD_DELIVERY', 'REVERSE_PICKUP'],
      default: 'FORWARD_DELIVERY',
    },
    deliverySlot: {
      slotKey: { type: String, default: 'standard' },
      title: { type: String, default: 'Standard Delivery' },
      type: { type: String, default: 'STANDARD' },
      date: { type: String, default: '' },
      startTime: { type: String, default: '' },
      endTime: { type: String, default: '' },
      fee: { type: Number, default: 0 },
      is1HourHyperlocal: { type: Boolean, default: false },
    },
    targetDeliveryTime: {
      type: Date,
      default: null,
    },
    slaExpiresAt: {
      type: Date,
      default: null,
    },
    dispatchStatus: {
      type: String,
      enum: ['UNASSIGNED', 'ASSIGNED', 'ACCEPTED', 'EN_ROUTE_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED'],
      default: 'ASSIGNED',
    },
    autoAssigned: {
      type: Boolean,
      default: false,
    },
    assignmentLog: [
      {
        rider: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        riderName: { type: String, default: '' },
        assignedAt: { type: Date, default: Date.now },
        method: { type: String, enum: ['AUTO', 'MANUAL'], default: 'AUTO' },
        reason: { type: String, default: '' },
      },
    ],
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
    // Point 16: Live Interactive Moving Rider Map & Telemetry
    riderLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      speed: { type: Number, default: 0 },
      heading: { type: Number, default: 0 },
      accuracy: { type: Number, default: 5 },
      batteryLevel: { type: Number, default: 100 },
      isMoving: { type: Boolean, default: false },
      lastUpdatedAt: { type: Date, default: null },
    },
    telemetryHistory: [
      {
        lat: Number,
        lng: Number,
        speed: Number,
        heading: Number,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    simulationState: {
      isSimulating: { type: Boolean, default: false },
      currentWaypointIndex: { type: Number, default: 0 },
      totalWaypoints: { type: Number, default: 8 },
      lastSimulatedAt: { type: Date, default: null },
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
    // Point 14: Delivery Rider Tipping
    tipAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tipPaidOut: {
      type: Boolean,
      default: false,
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
