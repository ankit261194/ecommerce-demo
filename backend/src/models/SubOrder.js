const mongoose = require('mongoose');

const subOrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  title: String,
  image: String,
  variantSku: String,
  variantName: String,
  categorySlug: { type: String, default: 'all' },
  hsnCode: {
    type: String,
    default: '85183000',
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
});

const subOrderSchema = new mongoose.Schema(
  {
    parentOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [subOrderItemSchema],
    subTotal: {
      type: Number,
      required: true,
    },
    platformCommissionRate: {
      type: Number,
      required: true,
      default: 10,
    },
    platformCommissionAmount: {
      type: Number,
      required: true,
    },
    vendorEarning: {
      type: Number,
      required: true,
    },
    // Point 11: Vendor-Funded Custom Promotions & BOGO Attribution
    vendorDiscount: {
      type: Number,
      default: 0,
    },
    promotionApplied: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
      default: null,
    },
    bogoSavings: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: [
        'placed',
        'pending',
        'confirmed',
        'packaging',
        'packed',
        'ready_for_pickup',
        'dispatched',
        'shipped',
        'handed_to_courier',
        'out_for_delivery',
        'delivered',
        'cancelled',
      ],
      default: 'placed',
    },
    // Point #56: Lifecycle Transition Timestamps
    acceptedAt: { type: Date, default: null },
    packagingStartedAt: { type: Date, default: null },
    readyForPickupAt: { type: Date, default: null },
    dispatchedAt: { type: Date, default: null },
    shippedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    trackingNumber: { type: String, default: '' },
    carrier: { type: String, default: '' },
    shippingAddress: {
      recipientName: String,
      phone: String,
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
    deliveryOtp: {
      type: String,
      default: () => Math.floor(1000 + Math.random() * 9000).toString(), // 4 digit OTP
    },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    trackingHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],
    // Point #25: Order Delivery Instructions / Rider Notes
    deliveryInstructions: {
      type: String,
      default: '',
      trim: true,
    },
    // Point 21: Digital Proof of Delivery (POD) Customer Signature & Timestamp
    proofOfDelivery: {
      hasSignature: { type: Boolean, default: false },
      signature: { type: String, default: null },
      signerName: { type: String, default: null },
      signerRelation: {
        type: String,
        enum: ['Self', 'Family Member', 'Colleague', 'Neighbor', 'Security / Reception', 'Other'],
        default: 'Self',
      },
      gpsLocation: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
        accuracy: { type: Number, default: null },
      },
      deviceInfo: { type: String, default: '' },
      signedAt: { type: Date, default: null },
      ipAddress: { type: String, default: '' },
      verificationCode: { type: String, default: null },
      deliveredBy: { type: String, default: 'AuraMarket Express Courier' },
      riderPhone: { type: String, default: '+919876543210' },
      podNotes: { type: String, default: '' },
      certificateId: { type: String, default: null },
      proofHash: { type: String, default: null },
      geoFenceVerified: { type: Boolean, default: true },
      distanceFromDropoffMeters: { type: Number, default: null },
      geoFenceStatus: { type: String, default: 'VERIFIED_DOORSTEP' },
      photos: [{ type: String }],
    },
    // Point #28: 1-Click Self-Cancel SubOrder Reason
    cancellationReason: {
      type: String,
      default: '',
      trim: true,
    },
    // Point 48: Multi-Vendor Automated Escrow Payout Engine & Hold Periods
    escrowDetails: {
      escrowStatus: {
        type: String,
        enum: [
          'HOLD_PENDING_DELIVERY',
          'HOLD_IN_RETURN_WINDOW',
          'ELIGIBLE_FOR_RELEASE',
          'RELEASED_TO_WALLET',
          'REFUNDED_TO_CUSTOMER',
          'DISPUTED_HOLD',
        ],
        default: 'HOLD_PENDING_DELIVERY',
      },
      escrowHoldDays: {
        type: Number,
        default: 7,
      },
      deliveredAt: {
        type: Date,
        default: null,
      },
      escrowReleaseDueDate: {
        type: Date,
        default: null,
      },
      escrowReleasedAt: {
        type: Date,
        default: null,
      },
      escrowAmount: {
        type: Number,
        default: 0,
      },
      platformCommissionHeld: {
        type: Number,
        default: 0,
      },
      isDisputed: {
        type: Boolean,
        default: false,
      },
      disputeReason: {
        type: String,
        default: '',
      },
      disputedAt: {
        type: Date,
        default: null,
      },
      disputedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      disputeResolution: {
        type: String,
        enum: ['', 'RELEASE_TO_VENDOR', 'REFUND_TO_CUSTOMER'],
        default: '',
      },
      disputeResolvedAt: {
        type: Date,
        default: null,
      },
      disputeNotes: {
        type: String,
        default: '',
      },
      isEscrowAccounted: {
        type: Boolean,
        default: false,
      },
    },
  },
  { timestamps: true }
);

// Point 48: Automatic escrow lifecycle pre-save trigger
subOrderSchema.pre('save', function (next) {
  if (!this.escrowDetails) {
    this.escrowDetails = {};
  }
  if (!this.escrowDetails.escrowStatus) {
    this.escrowDetails.escrowStatus = this.status === 'delivered' ? 'HOLD_IN_RETURN_WINDOW' : 'HOLD_PENDING_DELIVERY';
  }
  if (!this.escrowDetails.escrowHoldDays) {
    this.escrowDetails.escrowHoldDays = 7;
  }
  if ((!this.escrowDetails.escrowAmount || this.escrowDetails.escrowAmount === 0) && this.vendorEarning) {
    this.escrowDetails.escrowAmount = this.vendorEarning;
  }
  if ((!this.escrowDetails.platformCommissionHeld || this.escrowDetails.platformCommissionHeld === 0) && this.platformCommissionAmount) {
    this.escrowDetails.platformCommissionHeld = this.platformCommissionAmount;
  }

  // If status is transitioned to delivered or already delivered
  if (this.status === 'delivered') {
    const deliveryDate = this.deliveredAt || this.escrowDetails.deliveredAt || new Date();
    if (!this.deliveredAt) {
      this.deliveredAt = deliveryDate;
    }
    if (!this.escrowDetails.deliveredAt) {
      this.escrowDetails.deliveredAt = deliveryDate;
    }
    if (this.escrowDetails.escrowStatus === 'HOLD_PENDING_DELIVERY') {
      this.escrowDetails.escrowStatus = 'HOLD_IN_RETURN_WINDOW';
    }
    if (!this.escrowDetails.escrowReleaseDueDate && this.escrowDetails.deliveredAt) {
      const holdDays = this.escrowDetails.escrowHoldDays || 7;
      this.escrowDetails.escrowReleaseDueDate = new Date(this.escrowDetails.deliveredAt.getTime() + holdDays * 24 * 60 * 60 * 1000);
    }
  }
  next();
});

module.exports = mongoose.model('SubOrder', subOrderSchema);
