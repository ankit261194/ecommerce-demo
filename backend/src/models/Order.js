const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorProfile',
    required: true,
  },
  title: String,
  image: String,
  variantSku: String,
  variantName: String,
  hsnCode: { type: String, default: '85183000' },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
      default: () => 'ORD-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900),
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [orderItemSchema],
    subOrders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubOrder',
      },
    ],
    subtotal: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    coupon: {
      code: { type: String, default: null },
      title: { type: String, default: null },
      discountAmount: { type: Number, default: 0 },
      discountType: { type: String, default: null },
    },
    // Point 27: VIP Loyalty Points & Customer Tier Matrix
    loyalty: {
      tier: { type: String, default: 'BRONZE' },
      tierDiscountAmount: { type: Number, default: 0 },
      freeShippingGranted: { type: Boolean, default: false },
      cashbackMultiplier: { type: Number, default: 1.0 },
      cashbackCoinsEarned: { type: Number, default: 0 },
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    totalCommission: {
      type: Number,
      required: true,
      default: 0,
    },
    shippingFee: {
      type: Number,
      default: 0,
    },
    // Point 14: Customer Delivery Rider Tipping
    tipAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tipPaidToRider: {
      type: Boolean,
      default: false,
    },
    tipCreditedAt: {
      type: Date,
      default: null,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    taxDetails: {
      rate: { type: Number, default: 18 },
      mode: { type: String, enum: ['INCLUSIVE', 'EXCLUSIVE'], default: 'INCLUSIVE' },
      cgst: { type: Number, default: 0 },
      sgst: { type: Number, default: 0 },
      igst: { type: Number, default: 0 },
    },
    giftWrap: {
      isGift: { type: Boolean, default: false },
      wrapId: { type: String, default: null },
      wrapName: { type: String, default: null },
      wrapPrice: { type: Number, default: 0 },
      cardTheme: { type: String, default: null },
      recipientName: { type: String, default: null },
      senderName: { type: String, default: null },
      message: { type: String, default: null },
      hideInvoicePrice: { type: Boolean, default: false },
    },
    shippingAddress: {
      recipientName: { type: String, required: true },
      phone: { type: String, required: true },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      coordinates: {
        lat: { type: Number, default: 28.6139 },
        lng: { type: Number, default: 77.2090 },
      },
      formattedAddress: { type: String, default: '' },
      placeId: { type: String, default: '' },
    },
    paymentMethod: {
      type: String,
      enum: ['COD', 'RAZORPAY', 'STRIPE', 'UPI', 'WALLET', 'SPLIT_WALLET_ONLINE', 'PARTIAL_COD', 'ONLINE', 'PREPAID', 'REPLACEMENT_FREE'],
      default: 'COD',
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'PARTIALLY_PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
    },
    // Point 12: Split Payment Engine & Partial Advance for COD
    splitPayment: {
      isSplit: { type: Boolean, default: false },
      walletAmount: { type: Number, default: 0 },
      onlineAmount: { type: Number, default: 0 },
      onlineMethod: { type: String, default: null },
      onlinePaymentId: { type: String, default: null },
      walletTransactionId: { type: String, default: null },
      advancePayment: {
        isPartialCod: { type: Boolean, default: false },
        advanceAmount: { type: Number, default: 0 },
        remainingCodDue: { type: Number, default: 0 },
        advancePaidAt: { type: Date, default: null },
        advancePaymentId: { type: String, default: null },
        advanceMethod: { type: String, default: null },
      },
    },
    status: {
      type: String,
      enum: ['PLACED', 'CONFIRMED', 'IN_PROGRESS', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'PARTIALLY_DELIVERED'],
      default: 'PLACED',
    },
    paymentId: {
      type: String,
      default: null,
    },
    // Point #26: Multi-Gateway Dynamic Payment Details
    paymentDetails: {
      gateway: { type: String, default: null },
      transactionId: { type: String, default: null },
      upiUtr: { type: String, default: null },
      cardLast4: { type: String, default: null },
      paidAt: { type: Date, default: null },
    },
    // Point #25: Order Delivery Instructions / Rider Notes
    deliveryInstructions: {
      type: String,
      default: '',
      trim: true,
    },
    // Point #66 & Point #75: Secure Delivery Handover OTP
    deliveryOtp: {
      type: String,
      default: '4821',
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
    // Point 4: Guest Checkout with Instant Background Account Creation
    isGuestOrder: {
      type: Boolean,
      default: false,
    },
    guestCredentialsSent: {
      type: Boolean,
      default: false,
    },
    guestPhone: {
      type: String,
      default: '',
    },
    guestEmail: {
      type: String,
      default: '',
    },
    // Point #28: 1-Click Self-Cancel Order Reason & Audit
    cancellationReason: {
      type: String,
      default: '',
      trim: true,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    // Point 17: 1-Click Instant Wallet Refund on Order Cancellation
    instantWalletRefund: {
      isRefunded: { type: Boolean, default: false },
      refundAmount: { type: Number, default: 0 },
      walletBalanceAfter: { type: Number, default: 0 },
      refundedAt: { type: Date, default: null },
      transactionId: { type: String, default: null },
    },
    // Point #31: Wallet / Coins Payment Details & Cashback
    walletCoinsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    walletAmountDebited: {
      type: Number,
      default: 0,
      min: 0,
    },
    cashbackEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Point #74: Fake / Spam Order Prevention (RTO Guard for high-risk COD)
    rtoRiskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    rtoRiskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'LOW',
    },
    rtoRiskReasons: {
      type: [String],
      default: [],
    },
    rtoVerificationRequired: {
      type: Boolean,
      default: false,
    },
    rtoVerificationStatus: {
      type: String,
      enum: ['NONE', 'PENDING', 'VERIFIED', 'OVERRIDDEN_BY_ADMIN', 'REJECTED'],
      default: 'NONE',
    },
    rtoVerificationOtp: {
      type: String,
      default: null,
    },
    rtoVerificationOtpExpires: {
      type: Date,
      default: null,
    },
    flaggedForRtoRisk: {
      type: Boolean,
      default: false,
    },
    // Point 18: Automated Return & Replacement Flow
    isReplacementOrder: {
      type: Boolean,
      default: false,
    },
    originalOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    returnRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReturnRequest',
      default: null,
    },
    // Point 26: Full-Fledged Affiliate & Influencer Tracking
    affiliate: {
      partner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AffiliatePartner',
        default: null,
      },
      code: {
        type: String,
        default: null,
      },
      commissionRate: {
        type: Number,
        default: 0,
      },
      commissionAmount: {
        type: Number,
        default: 0,
      },
      status: {
        type: String,
        enum: ['NONE', 'PENDING', 'APPROVED', 'PAID', 'CANCELLED'],
        default: 'NONE',
      },
    },
    // Point 42: Dynamic Delivery Slot & 1-Hour Hyperlocal Dispatch
    deliverySlot: {
      slotKey: { type: String, default: 'standard' },
      title: { type: String, default: 'Standard Delivery' },
      type: {
        type: String,
        enum: ['HYPERLOCAL_1HR', 'SAME_DAY', 'SCHEDULED_SLOT', 'STANDARD'],
        default: 'STANDARD',
      },
      date: { type: String, default: '' }, // YYYY-MM-DD
      startTime: { type: String, default: '' },
      endTime: { type: String, default: '' },
      fee: { type: Number, default: 0 },
      isHyperlocal1Hour: { type: Boolean, default: false },
      targetDeliveryTime: { type: Date, default: null },
      bookedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
