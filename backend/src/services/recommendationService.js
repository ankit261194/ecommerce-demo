const Product = require('../models/Product');
const Order = require('../models/Order');
const ProductAffinity = require('../models/ProductAffinity');
const UserInteraction = require('../models/UserInteraction');
const RecommendationConfig = require('../models/RecommendationConfig');

const WEIGHT_MAP = {
  VIEW: 1,
  SEARCH_CLICK: 2,
  WISHLIST: 3,
  ADD_TO_CART: 4,
  PURCHASE: 5,
};

/**
 * Record a user or guest interaction with a product
 */
const recordInteraction = async ({ user, sessionId, productId, interactionType }) => {
  if (!productId || !sessionId || !interactionType) {
    throw new Error('productId, sessionId, and interactionType are required.');
  }

  const weight = WEIGHT_MAP[interactionType] || 1;
  const product = await Product.findById(productId).select('category').lean();

  const interaction = await UserInteraction.create({
    user: user || null,
    sessionId,
    product: productId,
    category: product?.category || null,
    interactionType,
    weight,
    timestamp: new Date(),
  });

  return interaction;
};

/**
 * Get Frequently Bought Together (FBT) items for a given product
 */
const getFrequentlyBoughtTogether = async (productId, discountPercent = 10) => {
  const primaryProductRaw = await Product.findById(productId)
    .select('title slug thumbnail price sellingPrice mrp category subCategory brand ratings stock')
    .lean();

  if (!primaryProductRaw) {
    throw new Error('Product not found.');
  }

  const primaryProduct = {
    ...primaryProductRaw,
    price: primaryProductRaw.sellingPrice || primaryProductRaw.price || 0,
  };

  // 1. Fetch affinities computed from real orders
  let affinities = await ProductAffinity.find({
    productA: productId,
    affinityType: 'BOUGHT_TOGETHER',
  })
    .sort({ affinityScore: -1, coOccurrenceCount: -1 })
    .limit(3)
    .populate({
      path: 'productB',
      select: 'title slug thumbnail price sellingPrice mrp category brand ratings stock isPublished',
    })
    .lean();

  let bundleItems = affinities
    .map(a => a.productB)
    .filter(p => p && p.isPublished !== false && p._id.toString() !== productId)
    .map(p => ({
      ...p,
      price: p.sellingPrice || p.price || 0,
    }));

  // 2. Fallback / Cold-Start: If no co-purchases yet, recommend top-rated complementary items in same/sibling category
  if (bundleItems.length < 2) {
    const fallbackProducts = await Product.find({
      _id: { $ne: productId, $nin: bundleItems.map(b => b._id) },
      isPublished: { $ne: false },
      stock: { $gt: 0 },
    })
      .sort({ 'ratings.average': -1, sellingPrice: 1 })
      .limit(3 - bundleItems.length)
      .select('title slug thumbnail price sellingPrice mrp category brand ratings stock')
      .lean();

    bundleItems = [
      ...bundleItems,
      ...fallbackProducts.map(p => ({
        ...p,
        price: p.sellingPrice || p.price || 0,
      })),
    ];
  }

  // 3. Compute bundled pricing & savings
  const allBundleProducts = [primaryProduct, ...bundleItems];
  const combinedRawPrice = allBundleProducts.reduce((sum, p) => sum + (p.price || 0), 0);
  const bundleDiscount = Number(((combinedRawPrice * discountPercent) / 100).toFixed(2));
  const finalBundlePrice = Number((combinedRawPrice - bundleDiscount).toFixed(2));

  return {
    primaryProduct,
    bundleItems,
    bundleDiscountPercent: discountPercent,
    combinedRawPrice,
    bundleDiscount,
    finalBundlePrice,
    savingsAmount: bundleDiscount,
  };
};

/**
 * Hybrid Personalized Recommendations:
 * Combines user interaction history + collaborative affinity + high-velocity trending items
 */
const getPersonalizedRecommendations = async ({ user, sessionId, limit = 10 }) => {
  const query = {};
  if (user) {
    query.user = user;
  } else if (sessionId) {
    query.sessionId = sessionId;
  }

  // 1. Analyze recent user interactions
  const recentInteractions = await UserInteraction.find(query)
    .sort({ timestamp: -1 })
    .limit(20)
    .populate('product', 'category brand price')
    .lean();

  const interactedProductIds = recentInteractions.map(i => i.product?._id).filter(Boolean);
  const preferredCategoryIds = [...new Set(recentInteractions.map(i => i.product?.category).filter(Boolean))];
  const preferredBrands = [...new Set(recentInteractions.map(i => i.product?.brand).filter(Boolean))];

  let recommendedProducts = [];

  // 2. Find similar items matching preferred categories / brands
  if (preferredCategoryIds.length > 0 || preferredBrands.length > 0) {
    const contentMatched = await Product.find({
      _id: { $nin: interactedProductIds },
      isPublished: { $ne: false },
      stock: { $gt: 0 },
      $or: [
        { category: { $in: preferredCategoryIds } },
        { brand: { $in: preferredBrands } },
      ],
    })
      .sort({ 'ratings.average': -1, price: -1 })
      .limit(limit)
      .select('title slug thumbnail price sellingPrice mrp category brand ratings stock')
      .lean();

    recommendedProducts.push(...contentMatched);
  }

  // 3. Fill remaining slots with high-velocity / top-rated catalog items
  if (recommendedProducts.length < limit) {
    const existingIds = [...interactedProductIds, ...recommendedProducts.map(p => p._id)];
    const fillProducts = await Product.find({
      _id: { $nin: existingIds },
      isPublished: { $ne: false },
      stock: { $gt: 0 },
    })
      .sort({ 'ratings.average': -1, createdAt: -1 })
      .limit(limit - recommendedProducts.length)
      .select('title slug thumbnail price sellingPrice mrp category brand ratings stock')
      .lean();

    recommendedProducts.push(...fillProducts);
  }

  return recommendedProducts.slice(0, limit).map(p => ({
    ...p,
    price: p.sellingPrice || p.price || 0,
  }));
};

/**
 * Content-based Similar Products
 */
const getSimilarProducts = async (productId, limit = 8) => {
  const target = await Product.findById(productId).select('category subCategory brand price sellingPrice').lean();
  if (!target) {
    throw new Error('Product not found.');
  }

  const query = {
    _id: { $ne: productId },
    isPublished: { $ne: false },
    stock: { $gt: 0 },
  };

  if (target.subCategory) {
    query.subCategory = target.subCategory;
  } else if (target.category) {
    query.category = target.category;
  }

  let items = await Product.find(query)
    .sort({ 'ratings.average': -1 })
    .limit(limit)
    .select('title slug thumbnail price sellingPrice mrp category brand ratings stock')
    .lean();

  if (items.length < limit) {
    const fallback = await Product.find({
      _id: { $ne: productId, $nin: items.map(i => i._id) },
      isPublished: { $ne: false },
      stock: { $gt: 0 },
    })
      .sort({ 'ratings.average': -1 })
      .limit(limit - items.length)
      .select('title slug thumbnail price sellingPrice mrp category brand ratings stock')
      .lean();

    items = [...items, ...fallback];
  }

  return items.map(p => ({
    ...p,
    price: p.sellingPrice || p.price || 0,
  }));
};

/**
 * Compute co-occurrence affinity matrix from completed multi-item orders
 */
const computeRecommendationMatrix = async () => {
  // 1. Fetch completed/delivered orders with >= 2 items
  const orders = await Order.find({
    'items.1': { $exists: true }, // At least 2 items
    status: { $nin: ['CANCELLED', 'REFUNDED'] },
  }).select('items.product').lean();

  const pairCounts = {};
  const singleCounts = {};

  for (const order of orders) {
    const productIds = [
      ...new Set(
        order.items
          .map(item => item.product?.toString())
          .filter(Boolean)
      ),
    ];

    for (const pId of productIds) {
      singleCounts[pId] = (singleCounts[pId] || 0) + 1;
    }

    for (let i = 0; i < productIds.length; i++) {
      for (let j = i + 1; j < productIds.length; j++) {
        const idA = productIds[i];
        const idB = productIds[j];

        const key1 = `${idA}_${idB}`;
        const key2 = `${idB}_${idA}`;

        pairCounts[key1] = (pairCounts[key1] || 0) + 1;
        pairCounts[key2] = (pairCounts[key2] || 0) + 1;
      }
    }
  }

  let updatedCount = 0;

  for (const [key, count] of Object.entries(pairCounts)) {
    const [pA, pB] = key.split('_');
    const countA = singleCounts[pA] || count;
    const countB = singleCounts[pB] || count;

    // Jaccard similarity index: intersection / union
    const jaccard = count / (countA + countB - count);
    const score = Number(Math.min(Math.max(jaccard, 0), 1).toFixed(4));

    await ProductAffinity.findOneAndUpdate(
      { productA: pA, productB: pB, affinityType: 'BOUGHT_TOGETHER' },
      {
        coOccurrenceCount: count,
        affinityScore: score,
        bundledDiscountPercent: 10.0,
        lastCalculated: new Date(),
      },
      { upsert: true, new: true }
    );
    updatedCount++;
  }

  return {
    ordersAnalyzed: orders.length,
    pairsProcessed: Object.keys(pairCounts).length,
    updatedAffinities: updatedCount,
  };
};

/**
 * Get recommendation analytics & conversion attribution
 */
const getRecommendationAnalytics = async () => {
  const [totalInteractions, totalAffinities, views, cartAdds, purchases] = await Promise.all([
    UserInteraction.countDocuments(),
    ProductAffinity.countDocuments(),
    UserInteraction.countDocuments({ interactionType: 'VIEW' }),
    UserInteraction.countDocuments({ interactionType: 'ADD_TO_CART' }),
    UserInteraction.countDocuments({ interactionType: 'PURCHASE' }),
  ]);

  const ctrPercent = views > 0 ? Number(((cartAdds / views) * 100).toFixed(2)) : 0;
  const conversionPercent = views > 0 ? Number(((purchases / views) * 100).toFixed(2)) : 0;

  return {
    totalInteractions,
    totalAffinities,
    viewsCount: views,
    cartAddsCount: cartAdds,
    purchasesCount: purchases,
    recommendationCtrPercent: ctrPercent,
    recommendationConversionPercent: conversionPercent,
  };
};

module.exports = {
  recordInteraction,
  getFrequentlyBoughtTogether,
  getPersonalizedRecommendations,
  getSimilarProducts,
  computeRecommendationMatrix,
  getRecommendationAnalytics,
};
