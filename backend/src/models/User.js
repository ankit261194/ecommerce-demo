const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide full name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Please provide phone number'],
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.authProvider || this.authProvider === 'LOCAL';
      },
      minlength: 6,
      select: false,
    },
    authProvider: {
      type: String,
      enum: ['LOCAL', 'GOOGLE', 'APPLE', 'PHONE_OTP', 'WHATSAPP', 'WEB_OTP', 'GUEST_CHECKOUT'],
      default: 'LOCAL',
    },
    webOtpVerified: {
      type: Boolean,
      default: false,
    },
    isGuestCreated: {
      type: Boolean,
      default: false,
    },
    googleId: {
      type: String,
      default: '',
      index: true,
    },
    appleId: {
      type: String,
      default: '',
      index: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    otp: {
      code: { type: String, default: '' },
      expiresAt: { type: Date, default: null },
    },
    role: {
      type: String,
      enum: ['superadmin', 'admin', 'subadmin', 'agent', 'vendor', 'vendor_staff', 'customer', 'delivery'],
      default: 'customer',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Point #49: Sub-Admin Staff Roles & Permissions
    staffRoleTitle: {
      type: String,
      default: '',
    },
    department: {
      type: String,
      default: 'Operations',
    },
    permissions: {
      type: [String],
      default: [],
    },
    // Point #43: Customer CRM Directory & Verification
    status: {
      type: String,
      enum: ['ACTIVE', 'BLOCKED', 'SUSPENDED'],
      default: 'ACTIVE',
    },
    vendorProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      default: null,
    },
    isVendorStaff: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    tags: {
      type: [String],
      default: ['Verified Shopper'],
    },
    adminNotes: {
      type: String,
      default: '',
    },
    addresses: [
      {
        recipientName: { type: String, default: 'Customer' },
        phone: { type: String, default: '9876543210' },
        alternatePhone: { type: String, default: '' },
        street: { type: String, required: true },
        landmark: { type: String, default: '' },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        type: {
          type: String,
          default: 'HOME',
        },
        isDefault: { type: Boolean, default: false },
        coordinates: {
          lat: { type: Number, default: 28.6139 },
          lng: { type: Number, default: 77.2090 },
        },
        formattedAddress: { type: String, default: '' },
        placeId: { type: String, default: '' },
      },
    ],
    // Point #31: In-App Wallet Balance & Reward Coins
    walletBalance: {
      type: Number,
      default: 250, // INR Welcome wallet balance
      min: 0,
    },
    walletCoins: {
      type: Number,
      default: 500, // Welcome reward coins (1 coin = ₹1 discount)
      min: 0,
    },
    // Point 14: Delivery Rider Tipping
    tipEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Point 42: Courier Logistics Fleet Rider Duty & Location Telemetry
    dutyStatus: {
      type: String,
      enum: ['ON_DUTY', 'OFF_DUTY'],
      default: 'ON_DUTY',
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    assignedZone: {
      type: String,
      default: '',
    },
    lastLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      speed: { type: Number, default: 0 },
      heading: { type: Number, default: 0 },
      batteryLevel: { type: Number, default: 100 },
      updatedAt: { type: Date, default: null },
    },
    maxConcurrentOrders: {
      type: Number,
      default: 3,
      min: 1,
      max: 10,
    },
    // Point 45: Automated Cash on Delivery (COD) Reconciliation & Cash Remittance Vault
    cashInHandLimit: {
      type: Number,
      default: 10000, // ₹10,000 threshold for riders
      min: 0,
    },
    isCashLimitLocked: {
      type: Boolean,
      default: false,
    },
    cashLimitLockedAt: {
      type: Date,
      default: null,
    },
    // Point 27: VIP Loyalty Points & Customer Tier Matrix
    loyalty: {
      tier: {
        type: String,
        enum: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'],
        default: 'BRONZE',
      },
      tierAchievedAt: {
        type: Date,
        default: Date.now,
      },
      lifetimeSpend: {
        type: Number,
        default: 0,
        min: 0,
      },
      lifetimeOrdersCount: {
        type: Number,
        default: 0,
        min: 0,
      },
      pointsBalance: {
        type: Number,
        default: 500, // kept in sync with walletCoins
        min: 0,
      },
      tierLock: {
        type: Boolean,
        default: false,
      },
      lastCheckInDate: {
        type: Date,
        default: null,
      },
      checkInStreak: {
        type: Number,
        default: 0,
      },
      customDiscountPercentage: {
        type: Number,
        default: 0,
      },
    },
    // Point 50: Fraud Detection, Risk Scoring & Shadow-Ban
    isShadowBanned: {
      type: Boolean,
      default: false,
      index: true,
    },
    shadowBannedAt: {
      type: Date,
      default: null,
    },
    shadowBanReason: {
      type: String,
      default: '',
    },
    deviceFingerprints: {
      type: [String],
      default: [],
    },
    fraudRiskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    lastRiskAssessment: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
