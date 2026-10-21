const VendorSubscriptionPlan = require('../models/VendorSubscriptionPlan');
const VendorSubscription = require('../models/VendorSubscription');
const VendorProfile = require('../models/VendorProfile');
const Product = require('../models/Product');

/**
 * Seed default subscription tiers if none exist
 */
const seedDefaultPlans = async () => {
  const count = await VendorSubscriptionPlan.countDocuments();
  if (count > 0) return;

  const defaultPlans = [
    {
      name: 'Starter Basic',
      slug: 'starter-basic',
      description: 'Ideal for new sellers launching their catalog on AuraMarket.',
      badge: 'FREE TIER',
      pricing: { monthly: 0, yearly: 0, currency: 'INR' },
      features: {
        maxProducts: 50,
        commissionRatePercent: 12.0,
        featuredStoreBadge: false,
        prioritySupport24x7: false,
        customDomainAllowed: false,
        analyticsRetentionDays: 30,
        posTerminalsIncluded: 1,
        bulkCsvImportLimit: 50,
        marketingCampaignsPerMonth: 1,
      },
      isActive: true,
      isDefault: true,
      orderIndex: 1,
    },
    {
      name: 'Growth Accelerate',
      slug: 'growth-accelerate',
      description: 'Built for scaling merchants needing larger inventory quotas and lower platform fees.',
      badge: 'MOST POPULAR',
      pricing: { monthly: 999, yearly: 9990, currency: 'INR' },
      features: {
        maxProducts: 500,
        commissionRatePercent: 7.5,
        featuredStoreBadge: true,
        prioritySupport24x7: false,
        customDomainAllowed: true,
        analyticsRetentionDays: 90,
        posTerminalsIncluded: 3,
        bulkCsvImportLimit: 1000,
        marketingCampaignsPerMonth: 5,
      },
      isActive: true,
      isDefault: false,
      orderIndex: 2,
    },
    {
      name: 'Enterprise VIP',
      slug: 'enterprise-vip',
      description: 'For high-volume retail leaders requiring unlimited capacity and rock-bottom commissions.',
      badge: 'ENTERPRISE',
      pricing: { monthly: 2999, yearly: 29990, currency: 'INR' },
      features: {
        maxProducts: -1, // Unlimited
        commissionRatePercent: 3.5,
        featuredStoreBadge: true,
        prioritySupport24x7: true,
        customDomainAllowed: true,
        analyticsRetentionDays: 365,
        posTerminalsIncluded: 10,
        bulkCsvImportLimit: 10000,
        marketingCampaignsPerMonth: 20,
      },
      isActive: true,
      isDefault: false,
      orderIndex: 3,
    },
  ];

  await VendorSubscriptionPlan.insertMany(defaultPlans);
};

/**
 * Get all available public / vendor plans
 */
const getPlans = async () => {
  await seedDefaultPlans();
  return await VendorSubscriptionPlan.find({ isActive: true }).sort({ orderIndex: 1 }).lean();
};

/**
 * Get current vendor subscription details and usage quota
 */
const getCurrentSubscription = async (vendorId) => {
  await seedDefaultPlans();

  let subscription = await VendorSubscription.findOne({
    vendor: vendorId,
    status: 'ACTIVE',
  })
    .populate('plan')
    .sort({ createdAt: -1 });

  // Auto-assign default Starter plan if no subscription found
  if (!subscription) {
    const defaultPlan = (await VendorSubscriptionPlan.findOne({ isDefault: true })) ||
      (await VendorSubscriptionPlan.findOne().sort({ orderIndex: 1 }));

    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    subscription = await VendorSubscription.create({
      vendor: vendorId,
      plan: defaultPlan._id,
      billingCycle: 'YEARLY',
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: oneYearFromNow,
      amountPaid: 0,
      currency: 'INR',
      paymentMethod: 'FREE',
      invoiceNumber: `SUB-FREE-${Date.now()}`,
    });

    subscription = await VendorSubscription.findById(subscription._id).populate('plan');
  }

  // Calculate live quota usage
  const totalProducts = await Product.countDocuments({
    vendor: vendorId,
    status: { $ne: 'archived' },
  });

  const maxProducts = subscription.plan?.features?.maxProducts ?? 50;
  const isUnlimited = maxProducts === -1;
  const remainingProducts = isUnlimited ? 999999 : Math.max(0, maxProducts - totalProducts);
  const usagePercentage = isUnlimited
    ? 0
    : Math.min(100, Math.round((totalProducts / Math.max(1, maxProducts)) * 100));

  const now = new Date();
  const msRemaining = Math.max(0, new Date(subscription.currentPeriodEnd).getTime() - now.getTime());
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

  return {
    subscription,
    usage: {
      totalProducts,
      maxProducts,
      isUnlimited,
      remainingProducts,
      usagePercentage,
      isQuotaExceeded: !isUnlimited && totalProducts > maxProducts,
      daysRemaining,
    },
  };
};

/**
 * Subscribe vendor to a new plan or renew
 */
const subscribeVendor = async ({ vendorId, planId, billingCycle = 'MONTHLY', paymentMethod = 'WALLET' }) => {
  await seedDefaultPlans();

  const plan = await VendorSubscriptionPlan.findById(planId);
  if (!plan || !plan.isActive) {
    throw new Error('Selected subscription plan not found or inactive.');
  }

  const vendor = await VendorProfile.findById(vendorId);
  if (!vendor) {
    throw new Error('Vendor profile not found.');
  }

  const cycle = billingCycle.toUpperCase() === 'YEARLY' ? 'YEARLY' : 'MONTHLY';
  const amount = cycle === 'YEARLY' ? plan.pricing.yearly : plan.pricing.monthly;

  // Process payment if paid tier
  if (amount > 0 && paymentMethod === 'WALLET') {
    if ((vendor.walletBalance || 0) < amount) {
      throw new Error(`Insufficient wallet balance (₹${vendor.walletBalance || 0}). Plan cost: ₹${amount}`);
    }

    vendor.walletBalance -= amount;
    await vendor.save();
  }

  // Compute period end
  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  if (cycle === 'YEARLY') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  // Deactivate prior subscriptions
  await VendorSubscription.updateMany(
    { vendor: vendorId, status: 'ACTIVE' },
    { $set: { status: 'EXPIRED' } }
  );

  const invoiceNumber = `SUB-INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const newSub = await VendorSubscription.create({
    vendor: vendorId,
    plan: plan._id,
    billingCycle: cycle,
    status: 'ACTIVE',
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    autoRenew: true,
    amountPaid: amount,
    currency: plan.pricing.currency || 'INR',
    paymentMethod,
    invoiceNumber,
  });

  // Sync vendor profile commission discount and featured status
  vendor.commissionRate = plan.features.commissionRatePercent;
  vendor.isFeatured = plan.features.featuredStoreBadge;
  await vendor.save();

  const populatedSub = await VendorSubscription.findById(newSub._id).populate('plan');

  return {
    subscription: populatedSub,
    invoiceNumber,
    amountPaid: amount,
    periodEnd,
  };
};

/**
 * Cancel auto-renewal
 */
const cancelSubscription = async (vendorId, cancellationReason = 'User requested cancellation') => {
  const activeSub = await VendorSubscription.findOne({ vendor: vendorId, status: 'ACTIVE' });
  if (!activeSub) {
    throw new Error('No active subscription found to cancel.');
  }

  activeSub.autoRenew = false;
  activeSub.cancellationReason = cancellationReason;
  activeSub.cancelledAt = new Date();
  await activeSub.save();

  return activeSub;
};

/**
 * Get vendor subscription invoices
 */
const getVendorInvoices = async (vendorId) => {
  return await VendorSubscription.find({ vendor: vendorId })
    .populate('plan', 'name pricing features')
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Admin MRR / ARR and plan distribution analytics
 */
const getSubscriptionAnalytics = async () => {
  const activeSubs = await VendorSubscription.find({ status: 'ACTIVE' }).populate('plan').lean();

  let totalMRR = 0;
  let totalARR = 0;
  const planDistribution = {};

  for (const sub of activeSubs) {
    const planName = sub.plan?.name || 'Unknown';
    planDistribution[planName] = (planDistribution[planName] || 0) + 1;

    if (sub.billingCycle === 'YEARLY') {
      const yearlyPrice = sub.plan?.pricing?.yearly || 0;
      totalARR += yearlyPrice;
      totalMRR += yearlyPrice / 12;
    } else {
      const monthlyPrice = sub.plan?.pricing?.monthly || 0;
      totalMRR += monthlyPrice;
      totalARR += monthlyPrice * 12;
    }
  }

  return {
    activeSubscribersCount: activeSubs.length,
    monthlyRecurringRevenue: Math.round(totalMRR),
    annualRecurringRevenue: Math.round(totalARR),
    planDistribution,
  };
};

module.exports = {
  seedDefaultPlans,
  getPlans,
  getCurrentSubscription,
  subscribeVendor,
  cancelSubscription,
  getVendorInvoices,
  getSubscriptionAnalytics,
};
