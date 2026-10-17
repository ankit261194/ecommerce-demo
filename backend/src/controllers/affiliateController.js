const AffiliatePartner = require('../models/AffiliatePartner');
const AffiliateReferral = require('../models/AffiliateReferral');
const AffiliatePayout = require('../models/AffiliatePayout');
const AffiliateProgramSetting = require('../models/AffiliateProgramSetting');
const User = require('../models/User');

// =========================================================================
// SUPER ADMIN OPERATIONS
// =========================================================================

// @desc    Get Affiliate Program Analytics Summary
// @route   GET /api/admin/affiliates/analytics
exports.getAffiliateAnalytics = async (req, res) => {
  try {
    const [totalPartners, activePartners, pendingPartners, partners] = await Promise.all([
      AffiliatePartner.countDocuments(),
      AffiliatePartner.countDocuments({ status: 'ACTIVE' }),
      AffiliatePartner.countDocuments({ status: 'PENDING' }),
      AffiliatePartner.find().lean(),
    ]);

    let totalGmv = 0;
    let totalCommissions = 0;
    let totalPaid = 0;
    let pendingLiability = 0;
    let totalClicks = 0;
    let totalConversions = 0;

    for (const p of partners) {
      totalGmv += p.stats?.totalRevenue || 0;
      totalCommissions += p.stats?.totalCommission || 0;
      totalPaid += p.stats?.paidCommission || 0;
      pendingLiability += p.stats?.pendingBalance || 0;
      totalClicks += p.stats?.clicks || 0;
      totalConversions += p.stats?.conversions || 0;
    }

    const conversionRate = totalClicks > 0 ? Number(((totalConversions / totalClicks) * 100).toFixed(2)) : 0;

    // Top 5 influencers by revenue
    const topPerformers = await AffiliatePartner.find({ status: 'ACTIVE' })
      .sort({ 'stats.totalRevenue': -1 })
      .limit(5)
      .select('name affiliateCode tier commissionRate stats')
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        totalPartners,
        activePartners,
        pendingPartners,
        totalGmv: Math.round(totalGmv),
        totalCommissions: Math.round(totalCommissions),
        totalPaid: Math.round(totalPaid),
        pendingLiability: Math.round(pendingLiability),
        totalClicks,
        totalConversions,
        conversionRate,
        topPerformers,
      },
    });
  } catch (err) {
    console.error('[AffiliateController] getAffiliateAnalytics error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch affiliate analytics' });
  }
};

// @desc    List all affiliate partners with filters & pagination
// @route   GET /api/admin/affiliates
exports.getPartners = async (req, res) => {
  try {
    const { search, status, tier, page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query = {};
    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (tier && tier !== 'ALL') {
      query.tier = tier;
    }
    if (search && search.trim()) {
      const cleanSearch = search.trim();
      query.$or = [
        { name: { $regex: cleanSearch, $options: 'i' } },
        { email: { $regex: cleanSearch, $options: 'i' } },
        { affiliateCode: { $regex: cleanSearch, $options: 'i' } },
        { phone: { $regex: cleanSearch, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortField = sortBy.startsWith('stats.') ? sortBy : sortBy;
    const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    const [partners, total] = await Promise.all([
      AffiliatePartner.find(query).sort(sort).skip(skip).limit(Number(limit)).lean(),
      AffiliatePartner.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: partners,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (err) {
    console.error('[AffiliateController] getPartners error:', err);
    return res.status(500).json({ success: false, message: 'Failed to list affiliate partners' });
  }
};

// @desc    Create new affiliate partner (Admin onboard)
// @route   POST /api/admin/affiliates
exports.createPartner = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      affiliateCode,
      tier = 'STANDARD',
      commissionType = 'PERCENTAGE',
      commissionRate,
      payoutDetails,
      socialChannels,
      notes,
      status = 'ACTIVE',
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await AffiliatePartner.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: 'An affiliate partner with this email already exists' });
    }

    // Generate or validate affiliateCode
    let code = (affiliateCode || '').trim().toUpperCase();
    if (!code) {
      const base = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'AFF';
      code = `${base}${Math.floor(100 + Math.random() * 900)}`;
    }

    const existingCode = await AffiliatePartner.findOne({ affiliateCode: code });
    if (existingCode) {
      code = `${code}${Math.floor(10 + Math.random() * 90)}`;
    }

    // Default commission rate from tier if not explicitly provided
    let rate = Number(commissionRate);
    if (isNaN(rate) || rate <= 0) {
      const settings = await AffiliateProgramSetting.getOrCreateSettings();
      const tierDef = settings.tiers?.find((t) => t.name === tier);
      rate = tierDef ? tierDef.defaultRate : 10;
    }

    const partner = await AffiliatePartner.create({
      name: name.trim(),
      email: cleanEmail,
      phone: phone || '',
      affiliateCode: code,
      tier,
      commissionType,
      commissionRate: rate,
      status,
      payoutDetails: payoutDetails || {
        method: 'UPI',
        upiId: '',
        accountHolderName: '',
        bankAccountNumber: '',
        bankIfsc: '',
        bankName: '',
      },
      socialChannels: socialChannels || {},
      notes: notes || '',
      approvedAt: status === 'ACTIVE' ? new Date() : null,
      approvedBy: status === 'ACTIVE' ? req.user?._id : null,
    });

    return res.status(201).json({
      success: true,
      message: 'Affiliate partner created successfully',
      data: partner,
    });
  } catch (err) {
    console.error('[AffiliateController] createPartner error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to create affiliate partner' });
  }
};

// @desc    Get single affiliate partner with referral breakdown
// @route   GET /api/admin/affiliates/:id
exports.getPartnerById = async (req, res) => {
  try {
    const partner = await AffiliatePartner.findById(req.params.id).lean();
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Affiliate partner not found' });
    }

    const [recentReferrals, recentPayouts] = await Promise.all([
      AffiliateReferral.find({ affiliate: partner._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('order', 'orderNumber totalAmount status createdAt')
        .lean(),
      AffiliatePayout.find({ affiliate: partner._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        ...partner,
        recentReferrals,
        recentPayouts,
      },
    });
  } catch (err) {
    console.error('[AffiliateController] getPartnerById error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve affiliate details' });
  }
};

// @desc    Update affiliate partner profile, tier, and commission rate
// @route   PUT /api/admin/affiliates/:id
exports.updatePartner = async (req, res) => {
  try {
    const {
      name,
      phone,
      tier,
      commissionType,
      commissionRate,
      payoutDetails,
      socialChannels,
      notes,
      status,
    } = req.body;

    const partner = await AffiliatePartner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Affiliate partner not found' });
    }

    if (name) partner.name = name.trim();
    if (phone !== undefined) partner.phone = phone;
    if (tier) partner.tier = tier;
    if (commissionType) partner.commissionType = commissionType;
    if (commissionRate !== undefined) partner.commissionRate = Number(commissionRate);
    if (payoutDetails) partner.payoutDetails = { ...partner.payoutDetails.toObject(), ...payoutDetails };
    if (socialChannels) partner.socialChannels = { ...partner.socialChannels.toObject(), ...socialChannels };
    if (notes !== undefined) partner.notes = notes;
    if (status) {
      partner.status = status;
      if (status === 'ACTIVE' && !partner.approvedAt) {
        partner.approvedAt = new Date();
        partner.approvedBy = req.user?._id;
      }
    }

    await partner.save();

    return res.status(200).json({
      success: true,
      message: 'Affiliate partner updated successfully',
      data: partner,
    });
  } catch (err) {
    console.error('[AffiliateController] updatePartner error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update affiliate partner' });
  }
};

// @desc    Update partner status (Approve / Suspend / Reject)
// @route   PUT /api/admin/affiliates/:id/status
exports.updatePartnerStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    if (!['ACTIVE', 'PENDING', 'SUSPENDED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const partner = await AffiliatePartner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Affiliate partner not found' });
    }

    partner.status = status;
    if (notes) partner.notes = `${partner.notes ? partner.notes + '\n' : ''}[${new Date().toISOString()}] ${notes}`;
    if (status === 'ACTIVE') {
      partner.approvedAt = new Date();
      partner.approvedBy = req.user?._id;
    }

    await partner.save();

    return res.status(200).json({
      success: true,
      message: `Partner status changed to ${status}`,
      data: partner,
    });
  } catch (err) {
    console.error('[AffiliateController] updatePartnerStatus error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update partner status' });
  }
};

// @desc    List all referral orders with filters
// @route   GET /api/admin/affiliates/referrals
exports.getReferrals = async (req, res) => {
  try {
    const { affiliateId, status, page = 1, limit = 50 } = req.query;
    const query = {};

    if (affiliateId) query.affiliate = affiliateId;
    if (status && status !== 'ALL') query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [referrals, total] = await Promise.all([
      AffiliateReferral.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('affiliate', 'name affiliateCode tier commissionRate')
        .populate('order', 'orderNumber status totalAmount createdAt')
        .lean(),
      AffiliateReferral.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: referrals,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (err) {
    console.error('[AffiliateController] getReferrals error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve referrals' });
  }
};

// @desc    List all payout requests and settlement history
// @route   GET /api/admin/affiliates/payouts
exports.getPayouts = async (req, res) => {
  try {
    const { status, affiliateId, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status && status !== 'ALL') query.status = status;
    if (affiliateId) query.affiliate = affiliateId;

    const skip = (Number(page) - 1) * Number(limit);

    const [payouts, total] = await Promise.all([
      AffiliatePayout.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('affiliate', 'name email affiliateCode payoutDetails stats tier')
        .lean(),
      AffiliatePayout.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: payouts,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (err) {
    console.error('[AffiliateController] getPayouts error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve payouts' });
  }
};

// @desc    Process & record an affiliate commission payout (Settlement)
// @route   POST /api/admin/affiliates/payouts
exports.createPayout = async (req, res) => {
  try {
    const { affiliateId, amount, payoutMethod = 'UPI', transactionReference, adminNotes } = req.body;

    if (!affiliateId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Affiliate ID and valid amount are required' });
    }

    const partner = await AffiliatePartner.findById(affiliateId);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Affiliate partner not found' });
    }

    const payoutAmount = Number(amount);
    if (payoutAmount > (partner.stats?.pendingBalance || 0)) {
      return res.status(400).json({
        success: false,
        message: `Payout amount (₹${payoutAmount}) exceeds pending balance (₹${partner.stats?.pendingBalance || 0})`,
      });
    }

    // Find pending referrals to mark as paid
    const pendingReferrals = await AffiliateReferral.find({
      affiliate: partner._id,
      status: { $in: ['PENDING', 'APPROVED'] },
    }).sort({ createdAt: 1 });

    const referralIds = pendingReferrals.map((r) => r._id);

    const payout = await AffiliatePayout.create({
      affiliate: partner._id,
      amount: payoutAmount,
      currency: 'INR',
      payoutMethod: payoutMethod || partner.payoutDetails?.method || 'UPI',
      beneficiary: {
        upiId: partner.payoutDetails?.upiId || '',
        accountHolderName: partner.payoutDetails?.accountHolderName || partner.name,
        bankAccountNumber: partner.payoutDetails?.bankAccountNumber || '',
        bankIfsc: partner.payoutDetails?.bankIfsc || '',
        bankName: partner.payoutDetails?.bankName || '',
      },
      status: 'PAID',
      transactionReference: transactionReference || `UTR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      adminNotes: adminNotes || 'Admin direct settlement',
      processedBy: req.user?._id,
      processedAt: new Date(),
      referrals: referralIds,
    });

    // Deduct pending balance and increment paidCommission
    partner.stats.pendingBalance = Math.max(0, (partner.stats.pendingBalance || 0) - payoutAmount);
    partner.stats.paidCommission = (partner.stats.paidCommission || 0) + payoutAmount;
    await partner.save();

    // Update referrals status to PAID
    if (referralIds.length > 0) {
      await AffiliateReferral.updateMany(
        { _id: { $in: referralIds } },
        { $set: { status: 'PAID', payout: payout._id, paidAt: new Date() } }
      );
    }

    return res.status(201).json({
      success: true,
      message: `Payout of ₹${payoutAmount} successfully recorded for ${partner.name}`,
      data: payout,
    });
  } catch (err) {
    console.error('[AffiliateController] createPayout error:', err);
    return res.status(500).json({ success: false, message: 'Failed to record payout settlement' });
  }
};

// @desc    Get affiliate program configuration settings
// @route   GET /api/admin/affiliates/settings
exports.getProgramSettings = async (req, res) => {
  try {
    const settings = await AffiliateProgramSetting.getOrCreateSettings();
    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (err) {
    console.error('[AffiliateController] getProgramSettings error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve program settings' });
  }
};

// @desc    Update affiliate program configuration settings & tier rules
// @route   PUT /api/admin/affiliates/settings
exports.updateProgramSettings = async (req, res) => {
  try {
    const { programEnabled, cookieDurationDays, minPayoutThreshold, autoApproveNewPartners, tiers } = req.body;

    const settings = await AffiliateProgramSetting.getOrCreateSettings();

    if (programEnabled !== undefined) settings.programEnabled = Boolean(programEnabled);
    if (cookieDurationDays !== undefined) settings.cookieDurationDays = Math.max(1, Number(cookieDurationDays));
    if (minPayoutThreshold !== undefined) settings.minPayoutThreshold = Math.max(0, Number(minPayoutThreshold));
    if (autoApproveNewPartners !== undefined) settings.autoApproveNewPartners = Boolean(autoApproveNewPartners);
    if (Array.isArray(tiers) && tiers.length > 0) settings.tiers = tiers;

    await settings.save();

    return res.status(200).json({
      success: true,
      message: 'Affiliate program settings updated successfully',
      data: settings,
    });
  } catch (err) {
    console.error('[AffiliateController] updateProgramSettings error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update program settings' });
  }
};

// =========================================================================
// PUBLIC & STOREFRONT OPERATIONS
// =========================================================================

// @desc    Validate referral code & increment click tracking counter
// @route   GET /api/affiliates/validate/:code
exports.validateCode = async (req, res) => {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Affiliate code is required' });
    }

    const cleanCode = code.trim().toUpperCase();
    const partner = await AffiliatePartner.findOne({ affiliateCode: cleanCode });

    if (!partner) {
      return res.status(404).json({ success: false, message: 'Invalid referral code', valid: false });
    }

    if (partner.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'This affiliate partner is not currently active',
        valid: false,
      });
    }

    // Increment click counter asynchronously
    partner.stats.clicks = (partner.stats.clicks || 0) + 1;
    await partner.save();

    return res.status(200).json({
      success: true,
      valid: true,
      data: {
        partnerName: partner.name,
        affiliateCode: partner.affiliateCode,
        tier: partner.tier,
      },
    });
  } catch (err) {
    console.error('[AffiliateController] validateCode error:', err);
    return res.status(500).json({ success: false, message: 'Failed to validate referral code' });
  }
};

// @desc    Public Application to join Affiliate / Influencer Program
// @route   POST /api/affiliates/apply
exports.applyAsPartner = async (req, res) => {
  try {
    const { name, email, phone, socialChannels, preferredCode, notes } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await AffiliatePartner.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already applied or registered with this email' });
    }

    const settings = await AffiliateProgramSetting.getOrCreateSettings();

    let code = (preferredCode || '').trim().toUpperCase();
    if (!code) {
      const base = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'CREATOR';
      code = `${base}${Math.floor(100 + Math.random() * 900)}`;
    }

    const existingCode = await AffiliatePartner.findOne({ affiliateCode: code });
    if (existingCode) {
      code = `${code}${Math.floor(10 + Math.random() * 90)}`;
    }

    const autoApprove = Boolean(settings.autoApproveNewPartners);
    const standardTier = settings.tiers?.find((t) => t.name === 'STANDARD');
    const rate = standardTier ? standardTier.defaultRate : 5;

    const partner = await AffiliatePartner.create({
      name: name.trim(),
      email: cleanEmail,
      phone: phone || '',
      user: req.user?._id || null,
      affiliateCode: code,
      tier: 'STANDARD',
      commissionType: 'PERCENTAGE',
      commissionRate: rate,
      status: autoApprove ? 'ACTIVE' : 'PENDING',
      socialChannels: socialChannels || {},
      notes: notes || '',
      approvedAt: autoApprove ? new Date() : null,
    });

    return res.status(201).json({
      success: true,
      message: autoApprove
        ? 'Welcome to the AuraMarket Influencer Program! Your account is active.'
        : 'Your affiliate application has been submitted and is pending approval.',
      data: {
        name: partner.name,
        affiliateCode: partner.affiliateCode,
        status: partner.status,
      },
    });
  } catch (err) {
    console.error('[AffiliateController] applyAsPartner error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit affiliate application' });
  }
};

// @desc    Get current authenticated user's affiliate portal dashboard
// @route   GET /api/affiliates/me
exports.getMyAffiliateDashboard = async (req, res) => {
  try {
    const partner = await AffiliatePartner.findOne({
      $or: [{ user: req.user._id }, { email: req.user.email }],
    }).lean();

    if (!partner) {
      return res.status(404).json({ success: false, message: 'You are not enrolled as an affiliate partner' });
    }

    const [recentReferrals, payouts] = await Promise.all([
      AffiliateReferral.find({ affiliate: partner._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('order', 'orderNumber status totalAmount createdAt')
        .lean(),
      AffiliatePayout.find({ affiliate: partner._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        ...partner,
        recentReferrals,
        payouts,
      },
    });
  } catch (err) {
    console.error('[AffiliateController] getMyAffiliateDashboard error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load affiliate dashboard' });
  }
};
