const VendorProfile = require('../models/VendorProfile');
const User = require('../models/User');
const {
  verifyGstin,
  verifyBankPennyDrop,
  computeNameMatchScore,
} = require('../services/verificationService');

/**
 * Helper to auto-evaluate compliance review state
 */
function evaluateComplianceState(vendor) {
  const gstinVerified = vendor.gstinVerification && vendor.gstinVerification.status === 'VERIFIED';
  const bankVerified = vendor.bankVerification && vendor.bankVerification.status === 'VERIFIED';

  const gstinScore = vendor.gstinVerification?.nameMatchScore || 0;
  const bankScore = vendor.bankVerification?.nameMatchScore || 0;
  const avgScore = Math.round((gstinScore + bankScore) / 2);
  vendor.complianceReview.overallScore = avgScore;

  if (gstinVerified && bankVerified) {
    if (gstinScore >= 60 && bankScore >= 60) {
      vendor.complianceReview.status = 'AUTO_VERIFIED';
      vendor.kycStatus = 'VERIFIED';
      vendor.kycVerifiedAt = new Date();
      if (vendor.status === 'pending') {
        vendor.status = 'approved';
      }
    } else {
      vendor.complianceReview.status = 'ACTION_REQUIRED';
    }
  } else if (vendor.gstinVerification?.status === 'FAILED' || vendor.bankVerification?.status === 'FAILED') {
    vendor.complianceReview.status = 'ACTION_REQUIRED';
  } else {
    vendor.complianceReview.status = 'PENDING';
  }
}

/**
 * @desc Get current vendor verification status (GSTIN & Bank Penny-Drop)
 * @route GET /api/vendor/verification/status
 * @access Private (Vendor)
 */
exports.getVendorVerificationStatus = async (req, res) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    return res.status(200).json({
      success: true,
      data: {
        vendorId: vendor._id,
        storeName: vendor.storeName,
        legalName: vendor.businessDetails?.legalName || vendor.storeName,
        gstinVerification: vendor.gstinVerification,
        bankVerification: vendor.bankVerification,
        complianceReview: vendor.complianceReview,
        kycStatus: vendor.kycStatus,
        status: vendor.status,
      },
    });
  } catch (error) {
    console.error('getVendorVerificationStatus error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving verification status' });
  }
};

/**
 * @desc Verify Vendor GSTIN in real-time
 * @route POST /api/vendor/verification/gstin
 * @access Private (Vendor)
 */
exports.verifyVendorGstin = async (req, res) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const gstin = req.body.gstin || vendor.businessDetails?.gstNumber || vendor.gstNumber;
    if (!gstin) {
      return res.status(400).json({
        success: false,
        message: 'GSTIN is required. Please provide a 15-character GST number.',
      });
    }

    const legalName = req.body.legalName || vendor.businessDetails?.legalName || vendor.storeName;
    const storeName = vendor.storeName;

    const result = await verifyGstin(gstin, { legalName, storeName });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
        code: result.code,
      });
    }

    if (result.verified === false) {
      vendor.gstinVerification = {
        status: 'FAILED',
        gstin: result.gstin,
        failureReason: result.failureReason || 'GSTIN verification failed or status inactive',
        stateJurisdiction: result.stateJurisdiction || '',
        verifiedAt: new Date(),
        rawResponse: result,
      };
      evaluateComplianceState(vendor);
      await vendor.save();

      return res.status(200).json({
        success: true,
        verified: false,
        message: result.failureReason,
        data: vendor.gstinVerification,
      });
    }

    // Successfully verified
    vendor.gstinVerification = {
      status: 'VERIFIED',
      gstin: result.gstin,
      legalName: result.legalName,
      tradeName: result.tradeName,
      taxpayerType: result.taxpayerType,
      gstStatus: result.gstStatus,
      stateJurisdiction: result.stateJurisdiction,
      centerJurisdiction: result.centerJurisdiction,
      dateOfRegistration: result.dateOfRegistration,
      principalAddress: result.principalAddress,
      constitutionOfBusiness: result.constitutionOfBusiness,
      nameMatchScore: result.nameMatchScore,
      nameMatchStatus: result.nameMatchStatus,
      verifiedAt: result.verifiedAt,
      rawResponse: result.rawResponse,
    };

    // Sync to businessDetails
    if (!vendor.businessDetails) vendor.businessDetails = {};
    vendor.businessDetails.gstNumber = result.gstin;
    vendor.gstNumber = result.gstin;
    if (!vendor.businessDetails.legalName) {
      vendor.businessDetails.legalName = result.legalName;
    }

    evaluateComplianceState(vendor);
    await vendor.save();

    return res.status(200).json({
      success: true,
      verified: true,
      message: 'Government GSTIN verified successfully!',
      data: vendor.gstinVerification,
    });
  } catch (error) {
    console.error('verifyVendorGstin error:', error);
    return res.status(500).json({ success: false, message: 'Server error processing GSTIN verification' });
  }
};

/**
 * @desc Verify Vendor Bank Account via ₹1.00 IMPS Penny-Drop
 * @route POST /api/vendor/verification/bank-penny-drop
 * @access Private (Vendor)
 */
exports.verifyVendorBankPennyDrop = async (req, res) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const accountNumber = req.body.accountNumber || vendor.bankDetails?.accountNumber;
    const ifscCode = req.body.ifscCode || vendor.bankDetails?.ifscCode;
    const accountHolder = req.body.accountHolder || vendor.bankDetails?.accountHolder || vendor.businessDetails?.legalName || vendor.storeName;

    if (!accountNumber) {
      return res.status(400).json({
        success: false,
        message: 'Bank account number is required for penny-drop verification.',
      });
    }

    if (!ifscCode) {
      return res.status(400).json({
        success: false,
        message: 'IFSC code is required for bank account verification.',
      });
    }

    const legalName = vendor.businessDetails?.legalName || vendor.storeName;

    const result = await verifyBankPennyDrop(accountNumber, ifscCode, {
      accountHolder,
      legalName,
      storeName: vendor.storeName,
    });

    if (!result.success) {
      vendor.bankVerification = {
        status: 'FAILED',
        accountHolder,
        accountNumberMasked: accountNumber.slice(-4),
        ifscCode,
        failureReason: result.error || 'Penny-drop transfer rejected by bank',
        verifiedAt: new Date(),
        rawResponse: result,
      };
      evaluateComplianceState(vendor);
      await vendor.save();

      return res.status(400).json({
        success: false,
        message: result.error,
        code: result.code,
      });
    }

    // Success
    vendor.bankVerification = {
      status: 'VERIFIED',
      accountHolder: result.accountHolder,
      accountNumberMasked: result.accountNumberMasked,
      ifscCode: result.ifscCode,
      beneficiaryName: result.beneficiaryName,
      bankName: result.bankName,
      branchName: result.branchName,
      city: result.city,
      state: result.state,
      micr: result.micr,
      utr: result.utr,
      pennyAmount: result.pennyAmount,
      upiEnabled: result.upiEnabled,
      neftEnabled: result.neftEnabled,
      rtgsEnabled: result.rtgsEnabled,
      nameMatchScore: result.nameMatchScore,
      nameMatchStatus: result.nameMatchStatus,
      verifiedAt: result.verifiedAt,
      rawResponse: result.rawResponse,
    };

    // Update bankDetails
    if (!vendor.bankDetails) vendor.bankDetails = {};
    vendor.bankDetails.isPennyDropVerified = true;
    vendor.bankDetails.accountHolder = result.beneficiaryName;
    vendor.bankDetails.bankName = result.bankName;
    vendor.bankDetails.branchName = result.branchName;
    vendor.bankDetails.ifscCode = result.ifscCode;
    vendor.bankDetails.accountNumber = accountNumber;

    evaluateComplianceState(vendor);
    await vendor.save();

    return res.status(200).json({
      success: true,
      verified: true,
      message: 'Bank account verified via ₹1.00 IMPS penny-drop successfully!',
      data: vendor.bankVerification,
    });
  } catch (error) {
    console.error('verifyVendorBankPennyDrop error:', error);
    return res.status(500).json({ success: false, message: 'Server error processing bank penny-drop verification' });
  }
};

/**
 * @desc Get Admin List of Vendor Verifications & Compliance Dossiers
 * @route GET /api/admin/vendor-verification
 * @access Private (Super Admin / Sub-Admin)
 */
exports.getAdminVendorVerificationList = async (req, res) => {
  try {
    const { status = 'ALL', search = '', page = 1, limit = 20 } = req.query;

    const query = {};

    if (status !== 'ALL') {
      query['complianceReview.status'] = status;
    }

    if (search) {
      query.$or = [
        { storeName: { $regex: search, $options: 'i' } },
        { 'businessDetails.legalName': { $regex: search, $options: 'i' } },
        { 'businessDetails.gstNumber': { $regex: search, $options: 'i' } },
        { gstNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await VendorProfile.countDocuments(query);

    const vendors = await VendorProfile.find(query)
      .populate('user', 'name email phone avatar')
      .populate('complianceReview.reviewedBy', 'name email')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    // Summary counts
    const [totalVendors, autoVerified, manualVerified, actionRequired, pendingReview] = await Promise.all([
      VendorProfile.countDocuments(),
      VendorProfile.countDocuments({ 'complianceReview.status': 'AUTO_VERIFIED' }),
      VendorProfile.countDocuments({ 'complianceReview.status': 'MANUAL_VERIFIED' }),
      VendorProfile.countDocuments({ 'complianceReview.status': 'ACTION_REQUIRED' }),
      VendorProfile.countDocuments({ 'complianceReview.status': 'PENDING' }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        vendors,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: Math.ceil(total / parseInt(limit, 10)),
        },
        stats: {
          total: totalVendors,
          verified: autoVerified + manualVerified,
          autoVerified,
          manualVerified,
          actionRequired,
          pending: pendingReview,
        },
      },
    });
  } catch (error) {
    console.error('getAdminVendorVerificationList error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving verification list' });
  }
};

/**
 * @desc Get Admin Vendor Verification Details Dossier
 * @route GET /api/admin/vendor-verification/:id
 * @access Private (Super Admin / Sub-Admin)
 */
exports.getAdminVendorVerificationDetails = async (req, res) => {
  try {
    const { id } = req.params;

    let vendor = await VendorProfile.findById(id)
      .populate('user', 'name email phone avatar')
      .populate('complianceReview.reviewedBy', 'name email')
      .populate('complianceReview.reviewHistory.reviewedBy', 'name email');

    if (!vendor) {
      vendor = await VendorProfile.findOne({ user: id })
        .populate('user', 'name email phone avatar')
        .populate('complianceReview.reviewedBy', 'name email')
        .populate('complianceReview.reviewHistory.reviewedBy', 'name email');
    }

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    return res.status(200).json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    console.error('getAdminVendorVerificationDetails error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving verification details' });
  }
};

/**
 * @desc Super Admin Review & Approval / Rejection of Vendor Verification
 * @route POST /api/admin/vendor-verification/:id/review
 * @access Private (Super Admin / Sub-Admin)
 */
exports.reviewAdminVendorVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, remarks = '' } = req.body;

    if (!['APPROVE', 'REJECT', 'REQUEST_INFO'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be APPROVE, REJECT, or REQUEST_INFO.',
      });
    }

    let vendor = await VendorProfile.findById(id);
    if (!vendor) {
      vendor = await VendorProfile.findOne({ user: id });
    }

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    if (!vendor.complianceReview) {
      vendor.complianceReview = { reviewHistory: [] };
    }

    const previousStatus = vendor.complianceReview.status;

    if (action === 'APPROVE') {
      vendor.complianceReview.status = 'MANUAL_VERIFIED';
      vendor.kycStatus = 'VERIFIED';
      vendor.kycVerifiedAt = new Date();
      vendor.status = 'approved';
      vendor.kycRejectionReason = '';
    } else if (action === 'REJECT') {
      vendor.complianceReview.status = 'REJECTED';
      vendor.kycStatus = 'REJECTED';
      vendor.status = 'rejected';
      vendor.kycRejectionReason = remarks || 'Compliance verification rejected by administrator';
    } else if (action === 'REQUEST_INFO') {
      vendor.complianceReview.status = 'ACTION_REQUIRED';
    }

    vendor.complianceReview.adminRemarks = remarks;
    vendor.complianceReview.reviewedBy = req.user._id;
    vendor.complianceReview.reviewedAt = new Date();

    vendor.complianceReview.reviewHistory.push({
      action,
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      remarks,
      status: vendor.complianceReview.status,
    });

    await vendor.save();

    return res.status(200).json({
      success: true,
      message: `Vendor verification ${action === 'APPROVE' ? 'approved' : action === 'REJECT' ? 'rejected' : 'updated to action required'} successfully!`,
      data: {
        vendorId: vendor._id,
        complianceStatus: vendor.complianceReview.status,
        kycStatus: vendor.kycStatus,
        status: vendor.status,
        adminRemarks: remarks,
      },
    });
  } catch (error) {
    console.error('reviewAdminVendorVerification error:', error);
    return res.status(500).json({ success: false, message: 'Server error reviewing vendor verification' });
  }
};

/**
 * @desc Re-trigger verification check for a vendor (Super Admin)
 * @route POST /api/admin/vendor-verification/:id/reverify
 * @access Private (Super Admin)
 */
exports.reverifyAdminVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { verifyGst = true, verifyBank = true } = req.body;

    let vendor = await VendorProfile.findById(id);
    if (!vendor) {
      vendor = await VendorProfile.findOne({ user: id });
    }

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const results = {};

    if (verifyGst && (vendor.businessDetails?.gstNumber || vendor.gstNumber)) {
      const gstin = vendor.businessDetails?.gstNumber || vendor.gstNumber;
      const gstRes = await verifyGstin(gstin, {
        legalName: vendor.businessDetails?.legalName || vendor.storeName,
        storeName: vendor.storeName,
      });
      if (gstRes.success && gstRes.verified) {
        vendor.gstinVerification = {
          status: 'VERIFIED',
          gstin: gstRes.gstin,
          legalName: gstRes.legalName,
          tradeName: gstRes.tradeName,
          taxpayerType: gstRes.taxpayerType,
          gstStatus: gstRes.gstStatus,
          stateJurisdiction: gstRes.stateJurisdiction,
          centerJurisdiction: gstRes.centerJurisdiction,
          dateOfRegistration: gstRes.dateOfRegistration,
          principalAddress: gstRes.principalAddress,
          constitutionOfBusiness: gstRes.constitutionOfBusiness,
          nameMatchScore: gstRes.nameMatchScore,
          nameMatchStatus: gstRes.nameMatchStatus,
          verifiedAt: gstRes.verifiedAt,
          rawResponse: gstRes.rawResponse,
        };
      }
      results.gstin = gstRes;
    }

    if (verifyBank && vendor.bankDetails?.accountNumber && vendor.bankDetails?.ifscCode) {
      const bankRes = await verifyBankPennyDrop(vendor.bankDetails.accountNumber, vendor.bankDetails.ifscCode, {
        accountHolder: vendor.bankDetails.accountHolder,
        legalName: vendor.businessDetails?.legalName || vendor.storeName,
        storeName: vendor.storeName,
      });
      if (bankRes.success && bankRes.verified) {
        vendor.bankVerification = {
          status: 'VERIFIED',
          accountHolder: bankRes.accountHolder,
          accountNumberMasked: bankRes.accountNumberMasked,
          ifscCode: bankRes.ifscCode,
          beneficiaryName: bankRes.beneficiaryName,
          bankName: bankRes.bankName,
          branchName: bankRes.branchName,
          city: bankRes.city,
          state: bankRes.state,
          micr: bankRes.micr,
          utr: bankRes.utr,
          pennyAmount: bankRes.pennyAmount,
          upiEnabled: bankRes.upiEnabled,
          neftEnabled: bankRes.neftEnabled,
          rtgsEnabled: bankRes.rtgsEnabled,
          nameMatchScore: bankRes.nameMatchScore,
          nameMatchStatus: bankRes.nameMatchStatus,
          verifiedAt: bankRes.verifiedAt,
          rawResponse: bankRes.rawResponse,
        };
        vendor.bankDetails.isPennyDropVerified = true;
      }
      results.bank = bankRes;
    }

    evaluateComplianceState(vendor);
    await vendor.save();

    return res.status(200).json({
      success: true,
      message: 'Re-verification completed successfully',
      data: {
        vendorId: vendor._id,
        gstinVerification: vendor.gstinVerification,
        bankVerification: vendor.bankVerification,
        complianceReview: vendor.complianceReview,
      },
    });
  } catch (error) {
    console.error('reverifyAdminVendor error:', error);
    return res.status(500).json({ success: false, message: 'Server error during vendor re-verification' });
  }
};
