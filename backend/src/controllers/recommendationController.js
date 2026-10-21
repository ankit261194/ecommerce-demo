const recommendationService = require('../services/recommendationService');
const RecommendationConfig = require('../models/RecommendationConfig');
const AuditLog = require('../models/AuditLog');

/**
 * POST /api/recommendations/interaction
 * Records a customer interaction event (view, add to cart, purchase)
 */
const recordEvent = async (req, res) => {
  try {
    const { productId, interactionType, sessionId } = req.body;
    const user = req.user?._id || null;

    const interaction = await recommendationService.recordInteraction({
      user,
      sessionId: sessionId || req.headers['x-session-id'] || 'guest_session',
      productId,
      interactionType: interactionType || 'VIEW',
    });

    return res.status(201).json({
      success: true,
      data: interaction,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/recommendations/personalized
 * Hybrid personalized product recommendations
 */
const getPersonalized = async (req, res) => {
  try {
    const user = req.user?._id || null;
    const sessionId = req.query.sessionId || req.headers['x-session-id'] || 'guest_session';
    const limit = parseInt(req.query.limit, 10) || 10;

    const products = await recommendationService.getPersonalizedRecommendations({
      user,
      sessionId,
      limit,
    });

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve personalized recommendations: ' + error.message,
    });
  }
};

/**
 * GET /api/recommendations/fbt/:productId
 * Frequently Bought Together bundle with co-purchased accessories
 */
const getFbt = async (req, res) => {
  try {
    const { productId } = req.params;
    const discount = parseFloat(req.query.discount) || 10;

    const bundle = await recommendationService.getFrequentlyBoughtTogether(productId, discount);

    return res.status(200).json({
      success: true,
      data: bundle,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/recommendations/similar/:productId
 * Content-based similar products
 */
const getSimilar = async (req, res) => {
  try {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 8;

    const products = await recommendationService.getSimilarProducts(productId, limit);

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * POST /api/admin/recommendations/recompute
 * Recompute co-occurrence matrix from all multi-item orders
 */
const recomputeMatrix = async (req, res) => {
  try {
    const result = await recommendationService.computeRecommendationMatrix();

    try {
      await AuditLog.create({
        user: req.user?._id,
        action: 'RECOMPUTE_RECOMMENDATIONS',
        module: 'CATALOG',
        details: `Recomputed affinity matrix: ${result.pairsProcessed} pairs processed, ${result.updatedAffinities} affinities updated.`,
      });
    } catch (_) {}

    return res.status(200).json({
      success: true,
      message: 'Product affinity matrix recomputed successfully.',
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Matrix recomputation failed: ' + error.message,
    });
  }
};

/**
 * GET /api/admin/recommendations/analytics
 * Performance analytics of recommendation shelves
 */
const getAnalytics = async (req, res) => {
  try {
    const analytics = await recommendationService.getRecommendationAnalytics();

    return res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch recommendation analytics: ' + error.message,
    });
  }
};

/**
 * GET /api/admin/recommendations/config
 */
const getConfig = async (req, res) => {
  try {
    let config = await RecommendationConfig.findOne();
    if (!config) {
      config = await RecommendationConfig.create({});
    }
    return res.status(200).json({ success: true, data: config });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/admin/recommendations/config
 */
const updateConfig = async (req, res) => {
  try {
    const { algorithmWeights, bundleDiscountPercent, maxRecommendationsPerShelf } = req.body;
    let config = await RecommendationConfig.findOne();
    if (!config) {
      config = new RecommendationConfig();
    }

    if (algorithmWeights) config.algorithmWeights = { ...config.algorithmWeights, ...algorithmWeights };
    if (bundleDiscountPercent !== undefined) config.bundleDiscountPercent = Number(bundleDiscountPercent);
    if (maxRecommendationsPerShelf !== undefined) config.maxRecommendationsPerShelf = Number(maxRecommendationsPerShelf);

    config.lastRecalculatedAt = new Date();
    await config.save();

    return res.status(200).json({
      success: true,
      message: 'Recommendation engine configuration updated.',
      data: config,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  recordEvent,
  getPersonalized,
  getFbt,
  getSimilar,
  recomputeMatrix,
  getAnalytics,
  getConfig,
  updateConfig,
};
