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
      enum: ['LOCAL', 'GOOGLE', 'PHONE_OTP'],
      default: 'LOCAL',
    },
    googleId: {
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
      enum: ['superadmin', 'subadmin', 'vendor', 'customer', 'delivery'],
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
        recipientName: { type: String, required: true },
        phone: { type: String, required: true },
        alternatePhone: { type: String, default: '' },
        street: { type: String, required: true },
        landmark: { type: String, default: '' },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        type: {
          type: String,
          enum: ['HOME', 'WORK', 'OTHER'],
          default: 'HOME',
        },
        isDefault: { type: Boolean, default: false },
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
