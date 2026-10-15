const mongoose = require('mongoose');

const vendorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    storeName: {
      type: String,
      required: [true, 'Please provide store name'],
      trim: true,
    },
    storeSlug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    storeLogo: {
      type: String,
      default: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=150',
    },
    storeBanner: {
      type: String,
      default: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
    },
    description: {
      type: String,
      default: 'Official verified brand on our platform.',
    },
    bio: {
      type: String,
      default: '',
    },
    supportPhone: {
      type: String,
      default: '',
    },
    supportEmail: {
      type: String,
      default: '',
    },
    returnPolicy: {
      type: String,
      default: 'Standard 7-day return and replacement policy for damaged or defective items.',
    },
    socialLinks: {
      instagram: { type: String, default: '' },
      twitter: { type: String, default: '' },
      facebook: { type: String, default: '' },
      youtube: { type: String, default: '' },
      website: { type: String, default: '' },
    },
    vacationMode: {
      isVacation: { type: Boolean, default: false },
      noticeMessage: { type: String, default: 'This store is temporarily on vacation. Orders will resume shortly.' },
      disableOrdering: { type: Boolean, default: true },
      startDate: { type: Date },
      endDate: { type: Date },
    },
    gstNumber: {
      type: String,
      trim: true,
    },
    panNumber: {
      type: String,
      trim: true,
    },
    pickupAddress: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      phone: String,
    },
    bankDetails: {
      accountHolder: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
    },
    commissionRate: {
      type: Number,
      default: 10, // Platform cut in percentage
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
    },
    kycStatus: {
      type: String,
      enum: ['NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
    },
    businessType: {
      type: String,
      enum: ['Proprietorship', 'Partnership', 'Private Limited', 'Individual'],
      default: 'Proprietorship',
    },
    kycDocuments: {
      businessRegistrationProof: { type: String, default: '' },
      gstCertificate: { type: String, default: '' },
      panCard: { type: String, default: '' },
      bankProof: { type: String, default: '' },
      idProof: { type: String, default: '' },
    },
    kycRejectionReason: {
      type: String,
      default: '',
    },
    kycVerifiedAt: {
      type: Date,
    },
    adminNotes: {
      type: String,
      default: '',
    },
    walletBalance: {
      type: Number,
      default: 0,
    },
    totalSales: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 4.8,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VendorProfile', vendorProfileSchema);
