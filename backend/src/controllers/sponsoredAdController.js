const mongoose = require('mongoose');
const AdCampaign = require('../models/AdCampaign');
const AdClickLog = require('../models/AdClickLog');
const Product = require('../models/Product');
const VendorProfile = require('../models/VendorProfile');
const Ledger = require('../models/Ledger');
const { recordAuditLog } = require('../utils/auditLogger');

// Helper to resolve vendor profile for vendor owners or sub-staff
async function resolveVendorProfile(req) {
  if (req.vendorProfile) return req.vendorProfile;
  if (!req.user) return null;
  return await VendorProfile.findOne({
    $or: [{ user: req.user._id }, { _id: req.user.vendorProfile }],
  });
}

// @desc    Get all ad campaigns for vendor with KPI analytics
// @route   GET /api/vendor/ads/campaigns
// @access  Private (Vendor / Vendor Staff with MARKETING_ADS)
exports.getVendorCampaigns = async (req, res, next) => {
  try {
    const vendor = await resolveVendorProfile(req);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const { status, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query = { vendor: vendor._id };
    if (status && status !== 'ALL') {
      query.status = status;
    } else {
      query.status = { $ne: 'ARCHIVED' };
    }

    if (search && search.trim()) {
      query.campaignName = { $regex: search.trim(), $options: 'i' };
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const campaigns = await AdCampaign.find(query)
      .populate('product', 'title images mrp sellingPrice stock category isPublished')
      .sort(sortOptions);

    // Auto-reset daily budgets if date changed and recalculate metrics
    for (const c of campaigns) {
      c.checkAndResetDailySpent();
      c.recalculateMetrics();
      await c.save();
    }

    // Compute aggregate portfolio KPIs
    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalSalesRevenue = 0;
    let totalDailyBudget = 0;
    let activeCampaigns = 0;

    for (const c of campaigns) {
      if (c.status === 'ACTIVE') activeCampaigns++;
      totalDailyBudget += c.dailyBudget || 0;
      totalSpend += c.spentAmount || 0;
      totalImpressions += c.metrics?.impressions || 0;
      totalClicks += c.metrics?.clicks || 0;
      totalSalesRevenue += c.metrics?.salesRevenue || 0;
    }

    const averageCtr = totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;
    const averageRoas = totalSpend > 0 ? parseFloat((totalSalesRevenue / totalSpend).toFixed(2)) : 0;
    const averageAcos = totalSalesRevenue > 0 ? parseFloat(((totalSpend / totalSalesRevenue) * 100).toFixed(2)) : 0;

    res.status(200).json({
      success: true,
      data: {
        campaigns,
        summary: {
          totalCampaigns: campaigns.length,
          activeCampaigns,
          totalDailyBudget: Math.round(totalDailyBudget * 100) / 100,
          totalSpend: Math.round(totalSpend * 100) / 100,
          totalImpressions,
          totalClicks,
          totalSalesRevenue: Math.round(totalSalesRevenue * 100) / 100,
          averageCtr,
          averageRoas,
          averageAcos,
          walletBalance: vendor.walletBalance || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single campaign by ID
// @route   GET /api/vendor/ads/campaigns/:id
// @access  Private (Vendor / Vendor Staff)
exports.getCampaignById = async (req, res, next) => {
  try {
    const vendor = await resolveVendorProfile(req);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const campaign = await AdCampaign.findOne({ _id: req.params.id, vendor: vendor._id }).populate(
      'product',
      'title images mrp sellingPrice stock category isPublished'
    );

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Sponsored ad campaign not found' });
    }

    campaign.checkAndResetDailySpent();
    campaign.recalculateMetrics();

    res.status(200).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new Sponsored Product Ad Campaign with CPC Keywords
// @route   POST /api/vendor/ads/campaigns
// @access  Private (Vendor / Vendor Staff)
exports.createCampaign = async (req, res, next) => {
  try {
    const vendor = await resolveVendorProfile(req);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const {
      campaignName,
      productId,
      dailyBudget,
      totalBudget,
      defaultBidCpc = 2.0,
      bidStrategy = 'MANUAL_CPC',
      keywords = [],
      placement = 'ALL',
      startDate,
      endDate,
    } = req.body;

    if (!campaignName || !campaignName.trim()) {
      return res.status(400).json({ success: false, message: 'Campaign name is required.' });
    }

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required for sponsored campaign.' });
    }

    const numDailyBudget = Number(dailyBudget);
    if (isNaN(numDailyBudget) || numDailyBudget < 50) {
      return res.status(400).json({
        success: false,
        message: 'Minimum daily advertising budget is ₹50.00.',
      });
    }

    const numDefaultBid = Number(defaultBidCpc);
    if (isNaN(numDefaultBid) || numDefaultBid < 0.5) {
      return res.status(400).json({
        success: false,
        message: 'Minimum default CPC bid is ₹0.50 per click.',
      });
    }

    // Merchant Isolation & Product Validation
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Target product not found.' });
    }

    const productVendorId = product.vendor?._id ? product.vendor._id.toString() : product.vendor?.toString();
    if (productVendorId !== vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Merchant Isolation: You cannot sponsor products owned by a different merchant store.',
      });
    }

    // Process keywords or auto-generate if none provided
    let processedKeywords = [];
    if (Array.isArray(keywords) && keywords.length > 0) {
      for (const kw of keywords) {
        if (!kw.keyword || !kw.keyword.trim()) continue;
        const bid = Number(kw.bidCpc) || numDefaultBid;
        if (bid < 0.5) {
          return res.status(400).json({
            success: false,
            message: `Keyword '${kw.keyword}' bid must be at least ₹0.50.`,
          });
        }
        processedKeywords.push({
          keyword: kw.keyword.trim().toLowerCase(),
          matchType: kw.matchType || 'BROAD',
          bidCpc: Math.round(bid * 100) / 100,
          negative: Boolean(kw.negative),
        });
      }
    }

    // Fallback: If no keywords provided, extract search terms from product title & category
    if (processedKeywords.length === 0) {
      const tokens = (product.title || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2)
        .slice(0, 4);

      if (tokens.length > 0) {
        processedKeywords = tokens.map((tok) => ({
          keyword: tok,
          matchType: 'BROAD',
          bidCpc: numDefaultBid,
          negative: false,
        }));
      } else {
        processedKeywords = [
          {
            keyword: (product.category || 'general').toLowerCase(),
            matchType: 'BROAD',
            bidCpc: numDefaultBid,
            negative: false,
          },
        ];
      }
    }

    const newCampaign = await AdCampaign.create({
      vendor: vendor._id,
      campaignName: campaignName.trim(),
      product: product._id,
      targetType: 'PRODUCT',
      status: 'ACTIVE',
      dailyBudget: numDailyBudget,
      totalBudget: Number(totalBudget) || 0,
      defaultBidCpc: numDefaultBid,
      bidStrategy,
      keywords: processedKeywords,
      placement,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : undefined,
    });

    await recordAuditLog({
      action: 'SPONSORED_AD_CAMPAIGN_CREATED',
      module: 'MARKETING_ADS',
      req,
      description: `Created sponsored ad campaign '${newCampaign.campaignName}' with ${processedKeywords.length} keyword targets`,
      targetType: 'AdCampaign',
      details: {
        campaignId: newCampaign._id,
        dailyBudget: numDailyBudget,
        defaultBidCpc: numDefaultBid,
        keywordCount: processedKeywords.length,
      },
      severity: 'LOW',
    });

    res.status(201).json({
      success: true,
      message: `Sponsored ad campaign '${newCampaign.campaignName}' launched successfully!`,
      data: newCampaign,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update campaign settings (Budget, CPC Bids, Keywords)
// @route   PUT /api/vendor/ads/campaigns/:id
// @access  Private (Vendor / Vendor Staff)
exports.updateCampaign = async (req, res, next) => {
  try {
    const vendor = await resolveVendorProfile(req);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const campaign = await AdCampaign.findOne({ _id: req.params.id, vendor: vendor._id });
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Sponsored ad campaign not found.' });
    }

    const { campaignName, dailyBudget, totalBudget, defaultBidCpc, keywords, placement, status, endDate } = req.body;

    if (campaignName && campaignName.trim()) {
      campaign.campaignName = campaignName.trim();
    }

    if (dailyBudget !== undefined) {
      const numDaily = Number(dailyBudget);
      if (isNaN(numDaily) || numDaily < 50) {
        return res.status(400).json({ success: false, message: 'Minimum daily budget is ₹50.00.' });
      }
      campaign.dailyBudget = numDaily;
    }

    if (totalBudget !== undefined) {
      campaign.totalBudget = Number(totalBudget) || 0;
    }

    if (defaultBidCpc !== undefined) {
      const numBid = Number(defaultBidCpc);
      if (isNaN(numBid) || numBid < 0.5) {
        return res.status(400).json({ success: false, message: 'Minimum default CPC bid is ₹0.50.' });
      }
      campaign.defaultBidCpc = numBid;
    }

    if (Array.isArray(keywords)) {
      const updatedKw = [];
      for (const kw of keywords) {
        if (!kw.keyword || !kw.keyword.trim()) continue;
        const bid = Number(kw.bidCpc) || campaign.defaultBidCpc;
        if (bid < 0.5) {
          return res.status(400).json({
            success: false,
            message: `Keyword '${kw.keyword}' bid must be at least ₹0.50.`,
          });
        }
        updatedKw.push({
          keyword: kw.keyword.trim().toLowerCase(),
          matchType: kw.matchType || 'BROAD',
          bidCpc: Math.round(bid * 100) / 100,
          negative: Boolean(kw.negative),
          impressions: kw.impressions || 0,
          clicks: kw.clicks || 0,
          spent: kw.spent || 0,
          sales: kw.sales || 0,
        });
      }
      campaign.keywords = updatedKw;
    }

    if (placement) campaign.placement = placement;
    if (status && ['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'].includes(status)) {
      campaign.status = status;
    }
    if (endDate !== undefined) {
      campaign.endDate = endDate ? new Date(endDate) : undefined;
    }

    campaign.recalculateMetrics();
    await campaign.save();

    res.status(200).json({
      success: true,
      message: 'Sponsored campaign updated successfully.',
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle campaign status (ACTIVE <-> PAUSED)
// @route   PATCH /api/vendor/ads/campaigns/:id/toggle
// @access  Private (Vendor / Vendor Staff)
exports.toggleCampaignStatus = async (req, res, next) => {
  try {
    const vendor = await resolveVendorProfile(req);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const campaign = await AdCampaign.findOne({ _id: req.params.id, vendor: vendor._id });
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found.' });
    }

    campaign.status = campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    await campaign.save();

    res.status(200).json({
      success: true,
      message: `Campaign '${campaign.campaignName}' is now ${campaign.status}.`,
      data: {
        id: campaign._id,
        status: campaign.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Archive / Delete ad campaign
// @route   DELETE /api/vendor/ads/campaigns/:id
// @access  Private (Vendor / Vendor Staff)
exports.deleteCampaign = async (req, res, next) => {
  try {
    const vendor = await resolveVendorProfile(req);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const campaign = await AdCampaign.findOne({ _id: req.params.id, vendor: vendor._id });
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found.' });
    }

    campaign.status = 'ARCHIVED';
    await campaign.save();

    res.status(200).json({
      success: true,
      message: `Campaign '${campaign.campaignName}' archived successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get keyword suggestions with estimated search volumes & recommended bids
// @route   GET /api/vendor/ads/keyword-suggestions
// @access  Private (Vendor / Vendor Staff)
exports.getKeywordSuggestions = async (req, res, next) => {
  try {
    const { productId, query } = req.query;

    let keywordsList = [];
    if (productId) {
      const product = await Product.findById(productId).populate('category');
      if (product) {
        const titleTokens = (product.title || '')
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter((w) => w.length > 2);

        const categoryToken = (
          product.category?.name ||
          product.category?.title ||
          (typeof product.category === 'string' ? product.category : '') ||
          ''
        ).toLowerCase();

        const baseKws = [categoryToken, ...titleTokens].filter(Boolean);
        if (categoryToken) {
          baseKws.push(`${categoryToken} online`, `best ${categoryToken}`);
        }
        keywordsList = Array.from(new Set(baseKws));
      }
    } else if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      keywordsList = [q, `${q} online`, `best ${q}`, `buy ${q}`, `${q} sale`];
    } else {
      keywordsList = ['wireless earbuds', 'bluetooth headphones', 'smartwatch', 'fast charger', 'phone case'];
    }

    const suggestions = keywordsList.slice(0, 10).map((kw, idx) => {
      const baseSearches = 2500 + ((idx * 1793) % 18000);
      const suggestedBid = parseFloat((1.5 + ((idx * 0.85) % 4.5)).toFixed(2));
      const competition = idx % 3 === 0 ? 'HIGH' : idx % 2 === 0 ? 'MEDIUM' : 'LOW';

      return {
        keyword: kw,
        matchType: 'BROAD',
        estimatedMonthlySearches: baseSearches,
        competition,
        suggestedBid,
        bidRange: {
          min: Math.max(0.5, parseFloat((suggestedBid * 0.6).toFixed(2))),
          suggested: suggestedBid,
          max: parseFloat((suggestedBid * 1.8).toFixed(2)),
        },
      };
    });

    res.status(200).json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Auction Engine: Retrieve sponsored products matching search or category
// @route   GET /api/ads/sponsored-products
// @access  Public
exports.getSponsoredProducts = async (req, res, next) => {
  try {
    const { keyword, category, limit = 4 } = req.query;

    const activeCampaigns = await AdCampaign.find({ status: 'ACTIVE' })
      .populate('product', 'title images mrp sellingPrice stock category isPublished rating reviewsCount')
      .populate('vendor', 'storeName storeSlug logo isVerified');

    const searchKeyword = (keyword || '').trim().toLowerCase();
    const searchCategory = (category || '').trim().toLowerCase();

    const candidateAds = [];

    for (const c of activeCampaigns) {
      c.checkAndResetDailySpent();
      // Skip if daily budget exhausted
      if (c.todaySpent >= c.dailyBudget) continue;
      // Skip if product not published or out of stock
      if (!c.product || !c.product.isPublished || c.product.stock <= 0) continue;

      let matchedKeyword = null;
      let winningBid = c.defaultBidCpc;

      if (searchKeyword && c.keywords && c.keywords.length > 0) {
        for (const kw of c.keywords) {
          if (kw.negative) continue;
          const kText = kw.keyword.toLowerCase();

          let isMatch = false;
          if (kw.matchType === 'EXACT') {
            isMatch = searchKeyword === kText;
          } else if (kw.matchType === 'PHRASE') {
            isMatch = searchKeyword.includes(kText) || kText.includes(searchKeyword);
          } else {
            // BROAD match
            const words = kText.split(/\s+/);
            isMatch = words.some((w) => searchKeyword.includes(w)) || searchKeyword.includes(kText);
          }

          if (isMatch) {
            matchedKeyword = kw;
            winningBid = Math.max(winningBid, kw.bidCpc);
            break;
          }
        }
      } else if (searchCategory && c.product.category) {
        if (c.product.category.toLowerCase().includes(searchCategory)) {
          matchedKeyword = { keyword: searchCategory, bidCpc: c.defaultBidCpc };
        }
      } else if (!searchKeyword && !searchCategory) {
        // Generic homepage/placement feed
        matchedKeyword = { keyword: 'general', bidCpc: c.defaultBidCpc };
      }

      if (matchedKeyword || !searchKeyword) {
        // Quality score based on product rating & historical CTR
        const qualityScore = 1.0 + ((c.product.rating || 4.0) / 10.0);
        const auctionScore = winningBid * qualityScore;

        candidateAds.push({
          campaign: c,
          product: c.product,
          vendor: c.vendor,
          matchedKeyword: matchedKeyword?.keyword || 'general',
          bidCpc: winningBid,
          auctionScore,
        });
      }
    }

    // Rank by auctionScore descending
    candidateAds.sort((a, b) => b.auctionScore - a.auctionScore);
    const winningAds = candidateAds.slice(0, Number(limit) || 4);

    // Record impressions asynchronously
    for (const ad of winningAds) {
      ad.campaign.metrics.impressions += 1;
      if (ad.campaign.keywords) {
        const kwObj = ad.campaign.keywords.find((k) => k.keyword === ad.matchedKeyword);
        if (kwObj) kwObj.impressions += 1;
      }
      ad.campaign.recalculateMetrics();
      await ad.campaign.save();
    }

    const responseData = winningAds.map((ad) => {
      const pObj = ad.product.toObject();
      pObj.isSponsored = true;
      pObj.adCampaignId = ad.campaign._id;
      pObj.adKeywordMatched = ad.matchedKeyword;
      pObj.adBidCpc = ad.bidCpc;
      pObj.sponsoredStoreName = ad.vendor?.storeName || 'Verified Merchant';
      return pObj;
    });

    res.status(200).json({
      success: true,
      count: responseData.length,
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record ad click with Anti-Click Fraud engine and CPC billing
// @route   POST /api/ads/click
// @access  Public
exports.recordAdClick = async (req, res, next) => {
  try {
    const { campaignId, productId, keywordMatched } = req.body;

    if (!campaignId) {
      return res.status(400).json({ success: false, message: 'Campaign ID is required for ad click recording.' });
    }

    const campaign = await AdCampaign.findById(campaignId).populate('vendor');
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Ad campaign not found.' });
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const userId = req.user?._id;

    // Anti-Click Fraud Engine: Rate-limit duplicate clicks within 5 minutes (300,000 ms)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingClick = await AdClickLog.findOne({
      campaign: campaign._id,
      ipAddress,
      createdAt: { $gte: fiveMinutesAgo },
    });

    if (existingClick) {
      // Mark as duplicate click to protect merchant wallet
      await AdClickLog.create({
        campaign: campaign._id,
        vendor: campaign.vendor._id,
        product: productId || campaign.product,
        cpcCharged: 0,
        keywordMatched: keywordMatched || '',
        ipAddress,
        userAgent,
        user: userId,
        isFraudulent: true,
        fraudReason: 'DUPLICATE_CLICK_RATE_LIMIT',
      });

      return res.status(200).json({
        success: true,
        charged: false,
        message: 'Click verified (Deduplicated under anti-click fraud policy).',
        fraudProtected: true,
      });
    }

    // Determine CPC to charge
    let cpcCharge = campaign.defaultBidCpc;
    if (keywordMatched && campaign.keywords) {
      const kw = campaign.keywords.find((k) => k.keyword === keywordMatched.toLowerCase());
      if (kw) {
        cpcCharge = kw.bidCpc;
        kw.clicks += 1;
        kw.spent += cpcCharge;
      }
    }

    // Update campaign metrics
    campaign.checkAndResetDailySpent();
    campaign.metrics.clicks += 1;
    campaign.spentAmount += cpcCharge;
    campaign.todaySpent += cpcCharge;
    campaign.recalculateMetrics();

    if (campaign.todaySpent >= campaign.dailyBudget) {
      // Daily budget cap reached
      campaign.status = 'PAUSED';
    }

    await campaign.save();

    // Deduct from Vendor Wallet
    const vendor = await VendorProfile.findById(campaign.vendor._id || campaign.vendor);
    if (vendor) {
      vendor.walletBalance = Math.max(0, (vendor.walletBalance || 0) - cpcCharge);
      await vendor.save();

      // Record Ad Spend in financial Ledger
      await Ledger.create({
        vendor: vendor._id,
        type: 'AD_SPEND',
        amount: cpcCharge,
        description: `CPC click charge on Sponsored Ad '${campaign.campaignName}' (${keywordMatched || 'broad'})`,
        balanceAfter: vendor.walletBalance,
        status: 'COMPLETED',
      });
    }

    // Log valid click
    await AdClickLog.create({
      campaign: campaign._id,
      vendor: campaign.vendor._id || campaign.vendor,
      product: productId || campaign.product,
      cpcCharged: cpcCharge,
      keywordMatched: keywordMatched || '',
      ipAddress,
      userAgent,
      user: userId,
      isFraudulent: false,
    });

    res.status(200).json({
      success: true,
      charged: true,
      cpcCharged: cpcCharge,
      message: 'Ad click recorded and billed successfully.',
    });
  } catch (error) {
    next(error);
  }
};
