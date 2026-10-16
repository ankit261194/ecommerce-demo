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
    },
    paymentMethod: {
      type: String,
      enum: ['COD', 'RAZORPAY', 'STRIPE', 'UPI', 'WALLET'],
      default: 'COD',
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
