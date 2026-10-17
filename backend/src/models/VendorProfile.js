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
    logo: {
      type: String,
      default: '',
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
    // Point 49: GST / TDS E-Invoicing & Automated Government Tax Compliance
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
        },
        message: 'Invalid GSTIN format. Must be 15 alphanumeric characters conforming to GST standard.',
      },
    },
    legalBusinessName: {
      type: String,
      trim: true,
      default: '',
    },
    stateCode: {
      type: String,
      trim: true,
      default: '07',
    },
    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v);
        },
        message: 'Invalid PAN format. Must be 10 alphanumeric characters conforming to Income Tax standard (e.g., ABCDE1234F).',
      },
    },
    // Point 34: Self-Service 4-Step Vendor Registration & Onboarding Wizard
    onboardingStep: {
      type: Number,
      default: 1,
      min: 1,
      max: 4,
    },
    onboardingStatus: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'],
      default: 'DRAFT',
    },
    onboardingSubmittedAt: {
      type: Date,
    },
    businessDetails: {
      legalName: { type: String, trim: true, default: '' },
      tradeName: { type: String, trim: true, default: '' },
      entityType: {
        type: String,
        enum: ['Proprietorship', 'Partnership', 'Private Limited', 'Public Limited', 'Individual', 'LLP'],
        default: 'Proprietorship',
      },
      authorizedSignatoryName: { type: String, trim: true, default: '' },
      authorizedSignatoryPhone: { type: String, trim: true, default: '' },
      authorizedSignatoryEmail: { type: String, trim: true, default: '' },
    },
    pickupAddress: {
      warehouseName: { type: String, default: 'Primary Fulfillment Hub' },
      contactPerson: { type: String, default: '' },
      street: String,
      city: String,
      state: String,
      pincode: String,
      phone: String,
      isServiceable: { type: Boolean, default: true },
    },
    bankDetails: {
      accountHolder: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      branchName: String,
      accountType: {
        type: String,
        enum: ['CURRENT', 'SAVINGS'],
        default: 'CURRENT',
      },
      upiId: { type: String, default: '' },
      isPennyDropVerified: { type: Boolean, default: false },
    },
    agreedToTerms: {
      type: Boolean,
      default: false,
    },
    agreedToTermsAt: {
      type: Date,
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
      cancelledCheque: { type: String, default: '' },
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
    // Point 48: Multi-Vendor Automated Escrow Payout Engine & Hold Periods
    escrowBalance: {
      type: Number,
      default: 0,
    },
    customHoldDays: {
      type: Number,
      default: 7,
    },
    payoutSchedule: {
      type: String,
      enum: ['DAILY', 'WEEKLY_MONDAY', 'BIWEEKLY', 'MONTHLY_FIRST'],
      default: 'WEEKLY_MONDAY',
    },
    autoReleaseEnabled: {
      type: Boolean,
      default: true,
    },
    earlyReleaseEligible: {
      type: Boolean,
      default: false,
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
    // Point 12: Seller Health & SLA Performance Scorecard
    slaMetrics: {
      score: { type: Number, default: 100, min: 0, max: 100 },
      badgeTier: {
        type: String,
        enum: ['PLATINUM', 'GOLD', 'SILVER', 'AT_RISK', 'PROBATION', 'SUSPENDED'],
        default: 'SILVER',
      },
      lateShipmentRate: { type: Number, default: 0 },
      cancellationRate: { type: Number, default: 0 },
      returnRate: { type: Number, default: 0 },
      onTimeDeliveryRate: { type: Number, default: 100 },
      averageRating: { type: Number, default: 4.8 },
      totalOrdersEvaluated: { type: Number, default: 0 },
      lateOrdersCount: { type: Number, default: 0 },
      cancelledOrdersCount: { type: Number, default: 0 },
      returnedOrdersCount: { type: Number, default: 0 },
      dailyOrderCap: { type: Number, default: null },
      payoutHoldDays: { type: Number, default: 0 },
      penaltyStatus: {
        type: String,
        enum: ['GOOD_STANDING', 'WARNING', 'RESTRICTED', 'PROBATION', 'SUSPENDED'],
        default: 'GOOD_STANDING',
      },
      commissionDiscountPercent: { type: Number, default: 0 },
      searchRankBoost: { type: Number, default: 1.0 },
      warningNotes: { type: String, default: '' },
      isManualOverride: { type: Boolean, default: false },
      overrideReason: { type: String, default: '' },
      lastCalculatedAt: { type: Date, default: Date.now },
    },
    slaAppeals: [
      {
        reason: { type: String, required: true },
        actionPlan: { type: String, required: true },
        metricContested: { type: String, default: 'OVERALL_SCORE' },
        status: {
          type: String,
          enum: ['PENDING', 'APPROVED', 'REJECTED'],
          default: 'PENDING',
        },
        submittedAt: { type: Date, default: Date.now },
        reviewedAt: { type: Date },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        adminFeedback: { type: String, default: '' },
      },
    ],
    // Point 35: Real-Time Government GSTIN & Bank Penny-Drop Account Verification
    gstinVerification: {
      status: {
        type: String,
        enum: ['UNVERIFIED', 'PENDING', 'VERIFIED', 'FAILED'],
        default: 'UNVERIFIED',
      },
      gstin: { type: String, default: '' },
      legalName: { type: String, default: '' },
      tradeName: { type: String, default: '' },
      taxpayerType: { type: String, default: '' },
      gstStatus: { type: String, default: '' },
      stateJurisdiction: { type: String, default: '' },
      centerJurisdiction: { type: String, default: '' },
      dateOfRegistration: { type: String, default: '' },
      principalAddress: { type: String, default: '' },
      constitutionOfBusiness: { type: String, default: '' },
      nameMatchScore: { type: Number, default: 0 },
      nameMatchStatus: {
        type: String,
        enum: ['NOT_CHECKED', 'MATCHED', 'PARTIAL', 'MISMATCH'],
        default: 'NOT_CHECKED',
      },
      verifiedAt: { type: Date },
      failureReason: { type: String, default: '' },
      rawResponse: { type: mongoose.Schema.Types.Mixed },
    },
    bankVerification: {
      status: {
        type: String,
        enum: ['UNVERIFIED', 'PENDING', 'VERIFIED', 'FAILED'],
        default: 'UNVERIFIED',
      },
      accountHolder: { type: String, default: '' },
      accountNumberMasked: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      beneficiaryName: { type: String, default: '' },
      bankName: { type: String, default: '' },
      branchName: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      micr: { type: String, default: '' },
      utr: { type: String, default: '' },
      pennyAmount: { type: Number, default: 1.0 },
      upiEnabled: { type: Boolean, default: true },
      neftEnabled: { type: Boolean, default: true },
      rtgsEnabled: { type: Boolean, default: true },
      nameMatchScore: { type: Number, default: 0 },
      nameMatchStatus: {
        type: String,
        enum: ['NOT_CHECKED', 'MATCHED', 'PARTIAL', 'MISMATCH'],
        default: 'NOT_CHECKED',
      },
      verifiedAt: { type: Date },
      failureReason: { type: String, default: '' },
      rawResponse: { type: mongoose.Schema.Types.Mixed },
    },
    complianceReview: {
      status: {
        type: String,
        enum: ['PENDING', 'AUTO_VERIFIED', 'MANUAL_VERIFIED', 'REJECTED', 'ACTION_REQUIRED'],
        default: 'PENDING',
      },
      overallScore: { type: Number, default: 0 },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: { type: Date },
      adminRemarks: { type: String, default: '' },
      reviewHistory: [
        {
          action: { type: String, default: 'STATUS_UPDATE' },
          reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          reviewedAt: { type: Date, default: Date.now },
          remarks: { type: String, default: '' },
          status: { type: String, default: '' },
        },
      ],
    },
    // Point 36: Vendor Custom Micro-Storefront Builder (Custom banners, stories & showcase)
    storefrontCustomization: {
      themeColor: { type: String, default: '#4F46E5' },
      accentColor: { type: String, default: '#F59E0B' },
      layoutStyle: {
        type: String,
        enum: ['GRID', 'EDITORIAL', 'MINIMAL', 'BOUTIQUE'],
        default: 'GRID',
      },
      heroBanners: [
        {
          id: { type: String, default: () => `banner_${Date.now()}_${Math.random().toString(36).substr(2, 6)}` },
          title: { type: String, default: '' },
          subtitle: { type: String, default: '' },
          imageUrl: { type: String, required: true },
          targetUrl: { type: String, default: '' },
          buttonText: { type: String, default: 'Shop Collection' },
          isActive: { type: Boolean, default: true },
          sortOrder: { type: Number, default: 0 },
        },
      ],
      announcementBar: {
        isEnabled: { type: Boolean, default: false },
        text: { type: String, default: '' },
        link: { type: String, default: '' },
        bgColor: { type: String, default: '#1E1B4B' },
        textColor: { type: String, default: '#E0E7FF' },
      },
      brandStory: {
        title: { type: String, default: 'Our Craft & Heritage' },
        storyText: { type: String, default: '' },
        founderName: { type: String, default: '' },
        founderPhoto: { type: String, default: '' },
        foundedYear: { type: Number, default: null },
        videoUrl: { type: String, default: '' },
        badges: [{ type: String }],
      },
      featuredSections: [
        {
          id: { type: String, default: () => `sec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}` },
          sectionTitle: { type: String, default: 'Featured Creations' },
          type: {
            type: String,
            enum: ['PRODUCTS', 'CATEGORIES', 'BANNER_GRID', 'VIDEO'],
            default: 'PRODUCTS',
          },
          itemIds: [{ type: String }],
          isActive: { type: Boolean, default: true },
          sortOrder: { type: Number, default: 0 },
        },
      ],
      isPublished: { type: Boolean, default: true },
      lastPublishedAt: { type: Date, default: Date.now },
    },
    inventoryVelocitySettings: {
      holdingCostMonthlyRate: { type: Number, default: 2.0 }, // 2.0% of inventory value per month
      freshThresholdDays: { type: Number, default: 30 },
      slowMovingThresholdDays: { type: Number, default: 60 },
      deadStockThresholdDays: { type: Number, default: 90 },
      autoNudgeEnabled: { type: Boolean, default: false },
      slowMovingDiscountPercent: { type: Number, default: 15 },
      deadStockDiscountPercent: { type: Number, default: 35 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VendorProfile', vendorProfileSchema);
