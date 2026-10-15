const CommissionRule = require('../models/CommissionRule');

/**
 * Calculates dynamic platform commission based on priority-ordered rules
 * Handles Vendor overrides, Category rules, Slabs, Fixed fees, and Min/Max caps
 */
exports.calculateCommission = async ({
  vendorId = null,
  categorySlug = null,
  subTotal = 0,
  defaultVendorRate = null,
}) => {
  const amount = Math.max(0, Number(subTotal) || 0);

  // Retrieve active rules ordered by priority descending
  const rules = await CommissionRule.find({ isActive: true }).sort({ priority: -1, createdAt: -1 });

  let matchedRule = null;

  for (const rule of rules) {
    // If rule specifies vendor, it must match
    const isVendorSpecific = Boolean(rule.vendor);
    if (isVendorSpecific) {
      if (!vendorId || rule.vendor.toString() !== vendorId.toString()) {
        continue;
      }
    }

    // If rule specifies category, it must match
    const isCategorySpecific = rule.categorySlug && rule.categorySlug.toLowerCase() !== 'all';
    if (isCategorySpecific) {
      if (!categorySlug || rule.categorySlug.toLowerCase() !== categorySlug.toLowerCase()) {
        continue;
      }
    }

    matchedRule = rule;
    break;
  }

  // Fallback to vendorProfile commission rate or 10%
  if (!matchedRule) {
    const rate =
      defaultVendorRate !== null && !isNaN(defaultVendorRate) && Number(defaultVendorRate) >= 0
        ? Number(defaultVendorRate)
        : 10;
    const commission = Math.round((amount * rate) / 100);
    return {
      rate,
      amount: commission,
      ruleName: 'Default Vendor Fallback Rate',
      ruleType: 'PERCENTAGE',
      fixedFee: 0,
      minCommission: 0,
      maxCommission: 0,
    };
  }

  let calculatedCommission = 0;
  let effectiveRate = matchedRule.percentage;

  if (matchedRule.ruleType === 'FIXED_PER_ORDER') {
    calculatedCommission = matchedRule.fixedFee;
    effectiveRate = amount > 0 ? Number(((calculatedCommission / amount) * 100).toFixed(2)) : 0;
  } else if (
    matchedRule.ruleType === 'TIERED_SLAB' &&
    Array.isArray(matchedRule.tieredSlabs) &&
    matchedRule.tieredSlabs.length > 0
  ) {
    const slab =
      matchedRule.tieredSlabs.find(s => amount >= s.minAmount && amount <= s.maxAmount) ||
      matchedRule.tieredSlabs[matchedRule.tieredSlabs.length - 1];

    effectiveRate = slab ? slab.percentage : matchedRule.percentage;
    calculatedCommission = (amount * effectiveRate) / 100 + (matchedRule.fixedFee || 0);
  } else {
    // PERCENTAGE
    calculatedCommission = (amount * matchedRule.percentage) / 100 + (matchedRule.fixedFee || 0);
    effectiveRate = matchedRule.percentage;
  }

  // Apply min / max caps
  if (matchedRule.minCommission > 0 && calculatedCommission < matchedRule.minCommission) {
    calculatedCommission = matchedRule.minCommission;
  }
  if (matchedRule.maxCommission > 0 && calculatedCommission > matchedRule.maxCommission) {
    calculatedCommission = matchedRule.maxCommission;
  }

  calculatedCommission = Math.round(calculatedCommission);

  return {
    rate: effectiveRate,
    amount: calculatedCommission,
    ruleId: matchedRule._id,
    ruleName: matchedRule.name,
    ruleType: matchedRule.ruleType,
    fixedFee: matchedRule.fixedFee || 0,
    minCommission: matchedRule.minCommission || 0,
    maxCommission: matchedRule.maxCommission || 0,
  };
};
