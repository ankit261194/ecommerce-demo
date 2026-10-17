const mongoose = require('mongoose');
const VendorProfile = require('../models/VendorProfile');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

/**
 * @desc Check Store Slug Availability
 * @route GET /api/vendor/onboarding/check-slug
 * @access Public / Authenticated
 */
exports.checkStoreSlugAvailability = async (req, res, next) => {
  try {
    const rawSlug = req.query.slug || '';
    const cleanSlug = rawSlug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-');

    if (!cleanSlug || cleanSlug.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Store slug must be at least 3 alphanumeric characters',
      });
    }

    const currentVendorId = req.user ? req.user._id : null;
    const query = { storeSlug: cleanSlug };
    if (currentVendorId) {
      query.user = { $ne: currentVendorId };
    }

    const existing = await VendorProfile.findOne(query);

    res.status(200).json({
      success: true,
      slug: cleanSlug,
      isAvailable: !existing,
      message: existing ? 'Store URL slug is already taken' : 'Store URL slug is available',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get Vendor Onboarding State & Progress
 * @route GET /api/vendor/onboarding
 * @access Private (Vendor)
 */
exports.getOnboardingState = async (req, res, next) => {
  try {
    let profile = await VendorProfile.findOne({ user: req.user._id });

    if (!profile) {
      // Auto-create initial draft profile if not found for authenticated vendor
      const defaultSlug = (req.user.name || 'Store').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4);
      profile = await VendorProfile.create({
        user: req.user._id,
        storeName: `${req.user.name}'s Store`,
        storeSlug: defaultSlug,
        status: 'pending',
        onboardingStep: 1,
        onboardingStatus: 'DRAFT',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        step: profile.onboardingStep || 1,
        status: profile.onboardingStatus || 'DRAFT',
        vendorStatus: profile.status,
        kycStatus: profile.kycStatus,
        submittedAt: profile.onboardingSubmittedAt,
        rejectionReason: profile.kycRejectionReason,
        store: {
          storeName: profile.storeName,
          storeSlug: profile.storeSlug,
          storeLogo: profile.storeLogo,
          storeBanner: profile.storeBanner,
          description: profile.description,
          supportPhone: profile.supportPhone,
          supportEmail: profile.supportEmail,
        },
        businessDetails: profile.businessDetails || {},
        gstNumber: profile.gstNumber || '',
        panNumber: profile.panNumber || '',
        pickupAddress: profile.pickupAddress || {},
        bankDetails: profile.bankDetails || {},
        kycDocuments: profile.kycDocuments || {},
        agreedToTerms: profile.agreedToTerms || false,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Save Step 1: Store Identity & Branding
 * @route POST /api/vendor/onboarding/step/1
 * @access Private (Vendor)
 */
exports.saveStep1 = async (req, res, next) => {
  try {
    const { storeName, storeSlug, description, storeLogo, storeBanner, supportPhone, supportEmail } = req.body;

    if (!storeName || storeName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Store name is required (minimum 2 characters)',
      });
    }

    const cleanSlug = (storeSlug || storeName).toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-');
    const duplicate = await VendorProfile.findOne({
      storeSlug: cleanSlug,
      user: { $ne: req.user._id },
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: `Store slug '${cleanSlug}' is already taken by another merchant`,
      });
    }

    let profile = await VendorProfile.findOne({ user: req.user._id });
    if (!profile) {
      profile = new VendorProfile({ user: req.user._id });
    }

    profile.storeName = storeName.trim();
    profile.storeSlug = cleanSlug;
    if (description !== undefined) profile.description = description;
    if (storeLogo) profile.storeLogo = storeLogo;
    if (storeBanner) profile.storeBanner = storeBanner;
    if (supportPhone) profile.supportPhone = supportPhone;
    if (supportEmail) profile.supportEmail = supportEmail;

    // Advance step pointer
    if (profile.onboardingStep < 2) {
      profile.onboardingStep = 2;
    }

    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Step 1: Store identity saved successfully',
      data: {
        step: profile.onboardingStep,
        storeName: profile.storeName,
        storeSlug: profile.storeSlug,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Save Step 2: Legal Business Entity & Tax Compliance (GST/PAN)
 * @route POST /api/vendor/onboarding/step/2
 * @access Private (Vendor)
 */
exports.saveStep2 = async (req, res, next) => {
  try {
    const {
      legalName,
      entityType,
      gstNumber,
      panNumber,
      authorizedSignatoryName,
      authorizedSignatoryPhone,
      authorizedSignatoryEmail,
    } = req.body;

    if (!legalName || legalName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Registered legal entity name is required',
      });
    }

    // Validate PAN (10 alphanumeric characters)
    const cleanPan = (panNumber || '').toUpperCase().trim();
    if (cleanPan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid PAN format. Must be 10 characters (e.g., ABCDE1234F)',
      });
    }

    // Validate GSTIN (15 alphanumeric characters) if provided
    const cleanGst = (gstNumber || '').toUpperCase().trim();
    if (cleanGst && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(cleanGst)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid GSTIN format. Must be a valid 15-character GSTIN (e.g., 29ABCDE1234F1Z5)',
      });
    }

    let profile = await VendorProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    profile.businessDetails = {
      legalName: legalName.trim(),
      tradeName: profile.storeName,
      entityType: entityType || profile.businessDetails?.entityType || 'Proprietorship',
      authorizedSignatoryName: authorizedSignatoryName || '',
      authorizedSignatoryPhone: authorizedSignatoryPhone || req.user.phone || '',
      authorizedSignatoryEmail: authorizedSignatoryEmail || req.user.email || '',
    };
    profile.businessType = entityType || profile.businessType;
    if (cleanPan) profile.panNumber = cleanPan;
    if (cleanGst) profile.gstNumber = cleanGst;

    if (profile.onboardingStep < 3) {
      profile.onboardingStep = 3;
    }

    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Step 2: Business details and tax compliance saved',
      data: {
        step: profile.onboardingStep,
        businessDetails: profile.businessDetails,
        panNumber: profile.panNumber,
        gstNumber: profile.gstNumber,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Save Step 3: Warehouse & Pickup Address
 * @route POST /api/vendor/onboarding/step/3
 * @access Private (Vendor)
 */
exports.saveStep3 = async (req, res, next) => {
  try {
    const { warehouseName, contactPerson, street, city, state, pincode, phone } = req.body;

    if (!street || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'Complete street, city, state, and 6-digit pincode are required for courier dispatch',
      });
    }

    const cleanPincode = String(pincode).trim();
    if (!/^[1-9][0-9]{5}$/.test(cleanPincode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Indian postal pincode. Must be a 6-digit numeric code',
      });
    }

    let profile = await VendorProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    profile.pickupAddress = {
      warehouseName: warehouseName || 'Primary Fulfillment Warehouse',
      contactPerson: contactPerson || profile.businessDetails?.authorizedSignatoryName || req.user.name,
      street: street.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: cleanPincode,
      phone: phone || req.user.phone || '',
      isServiceable: true,
    };

    if (profile.onboardingStep < 4) {
      profile.onboardingStep = 4;
    }

    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Step 3: Dispatch & pickup warehouse saved',
      data: {
        step: profile.onboardingStep,
        pickupAddress: profile.pickupAddress,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Save Step 4: Bank Details & KYC Document Vault
 * @route POST /api/vendor/onboarding/step/4
 * @access Private (Vendor)
 */
exports.saveStep4 = async (req, res, next) => {
  try {
    const {
      accountHolder,
      accountNumber,
      ifscCode,
      bankName,
      branchName,
      accountType,
      upiId,
      kycDocuments,
    } = req.body;

    if (!accountHolder || !accountNumber || !ifscCode) {
      return res.status(400).json({
        success: false,
        message: 'Bank account holder name, account number, and IFSC code are required',
      });
    }

    const cleanIfsc = String(ifscCode).toUpperCase().trim();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid IFSC code format (e.g., HDFC0001234)',
      });
    }

    let profile = await VendorProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    profile.bankDetails = {
      accountHolder: accountHolder.trim(),
      accountNumber: String(accountNumber).trim(),
      ifscCode: cleanIfsc,
      bankName: bankName || 'Standard Bank',
      branchName: branchName || '',
      accountType: accountType === 'SAVINGS' ? 'SAVINGS' : 'CURRENT',
      upiId: upiId || '',
      isPennyDropVerified: profile.bankDetails?.isPennyDropVerified || false,
    };

    if (kycDocuments) {
      profile.kycDocuments = {
        ...profile.kycDocuments,
        gstCertificate: kycDocuments.gstCertificate || profile.kycDocuments?.gstCertificate || '',
        panCard: kycDocuments.panCard || profile.kycDocuments?.panCard || '',
        cancelledCheque: kycDocuments.cancelledCheque || profile.kycDocuments?.cancelledCheque || '',
        businessRegistrationProof: kycDocuments.businessRegistrationProof || profile.kycDocuments?.businessRegistrationProof || '',
        idProof: kycDocuments.idProof || profile.kycDocuments?.idProof || '',
      };
    }

    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Step 4: Bank disbursement details and KYC vault updated',
      data: {
        step: profile.onboardingStep,
        bankDetails: profile.bankDetails,
        kycDocuments: profile.kycDocuments,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Finalize & Submit 4-Step Onboarding Application for Verification
 * @route POST /api/vendor/onboarding/submit
 * @access Private (Vendor)
 */
exports.submitOnboarding = async (req, res, next) => {
  try {
    const { agreedToTerms } = req.body;

    if (!agreedToTerms) {
      return res.status(400).json({
        success: false,
        message: 'You must accept the Marketplace Vendor Terms & SLA Agreement to submit your application',
      });
    }

    const profile = await VendorProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    // Verify all 4 steps have mandatory essentials
    if (!profile.storeName || profile.storeName.length < 2) {
      return res.status(400).json({ success: false, message: 'Step 1 incomplete: Store name is required' });
    }
    if (!profile.businessDetails?.legalName) {
      return res.status(400).json({ success: false, message: 'Step 2 incomplete: Legal business name is required' });
    }
    if (!profile.pickupAddress?.pincode || !profile.pickupAddress?.street) {
      return res.status(400).json({ success: false, message: 'Step 3 incomplete: Warehouse dispatch address is required' });
    }
    if (!profile.bankDetails?.accountNumber || !profile.bankDetails?.ifscCode) {
      return res.status(400).json({ success: false, message: 'Step 4 incomplete: Bank disbursement details are required' });
    }

    profile.agreedToTerms = true;
    profile.agreedToTermsAt = new Date();
    profile.onboardingStatus = 'SUBMITTED';
    profile.status = 'pending';
    profile.kycStatus = 'PENDING';
    profile.onboardingSubmittedAt = new Date();
    profile.onboardingStep = 4;

    await profile.save();

    // Log operational audit trail
    await AuditLog.create({
      action: 'VENDOR_ONBOARDING_SUBMITTED',
      module: 'VENDOR',
      description: `Vendor '${profile.storeName}' submitted self-service 4-step onboarding application`,
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      ipAddress: req.ip || '127.0.0.1',
      severity: 'MEDIUM',
      status: 'SUCCESS',
      newValue: {
        storeName: profile.storeName,
        legalName: profile.businessDetails?.legalName,
        gstNumber: profile.gstNumber,
        panNumber: profile.panNumber,
        onboardingStatus: 'SUBMITTED',
      },
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: 'Vendor onboarding application submitted successfully! Your account is now under review.',
      data: {
        storeName: profile.storeName,
        onboardingStatus: profile.onboardingStatus,
        status: profile.status,
        kycStatus: profile.kycStatus,
        submittedAt: profile.onboardingSubmittedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
