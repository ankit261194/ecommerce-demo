const CommissionRule = require('../models/CommissionRule');
const { calculateCommission } = require('../utils/commissionEngine');

const DEFAULT_COMMISSION_RULES = [
  {
    name: 'Electronics Category Commission',
    categorySlug: 'electronics',
    ruleType: 'PERCENTAGE',
    percentage: 5,
    fixedFee: 0,
    minCommission: 0,
    maxCommission: 0,
    priority: 10,
    isActive: true,
    description: 'Custom 5% marketplace commission on consumer electronics.',
  },
  {
    name: 'Fashion & Apparel Commission',
    categorySlug: 'fashion',
    ruleType: 'PERCENTAGE',
    percentage: 15,
    fixedFee: 0,
    minCommission: 0,
    maxCommission: 0,
    priority: 10,
    isActive: true,
    description: 'Custom 15% commission on fashion, apparel and footwear.',
  },
  {
    name: 'Groceries & Daily Essentials Commission',
    categorySlug: 'groceries',
    ruleType: 'PERCENTAGE',
    percentage: 3,
    fixedFee: 0,
    minCommission: 0,
    maxCommission: 0,
    priority: 10,
    isActive: true,
    description: 'Custom 3% commission on groceries, staples and essentials.',
  },
  {
    name: 'Global Default Platform Commission',
    categorySlug: 'all',
    ruleType: 'PERCENTAGE',
    percentage: 10,
    fixedFee: 0,
    minCommission: 0,
    maxCommission: 0,
    priority: 1,
    isActive: true,
    description: 'Universal fallback 10% platform commission for general products.',
  },
];

// Seed Helper
exports.seedDefaultCommissionRules = async () => {
  for (const rule of DEFAULT_COMMISSION_RULES) {
    const existing = await CommissionRule.findOne({ categorySlug: rule.categorySlug });
    if (!existing) {
      await CommissionRule.create(rule);
    }
  }
};

exports.DEFAULT_COMMISSION_RULES = DEFAULT_COMMISSION_RULES;

// GET /api/commission/rules
exports.getAllRules = async (req, res) => {
  try {
    const { categorySlug, ruleType, isActive } = req.query;
    const query = {};

    if (categorySlug && categorySlug !== 'ALL') {
      query.categorySlug = categorySlug.toLowerCase();
    }
    if (ruleType && ruleType !== 'ALL') {
      query.ruleType = ruleType;
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    let rules = await CommissionRule.find(query)
      .populate('vendor', 'storeName storeLogo user')
      .populate('category', 'name slug')
      .sort({ priority: -1, createdAt: -1 });

    // Auto-seed if empty
    if (rules.length === 0 && !categorySlug && !ruleType) {
      await exports.seedDefaultCommissionRules();
      rules = await CommissionRule.find(query)
        .populate('vendor', 'storeName storeLogo user')
        .populate('category', 'name slug')
        .sort({ priority: -1, createdAt: -1 });
    }

    return res.status(200).json({
      success: true,
      count: rules.length,
      data: rules,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/commission/rules
exports.createRule = async (req, res) => {
  try {
    const {
      name,
      categorySlug,
      category,
      vendor,
      ruleType,
      percentage,
      fixedFee,
      tieredSlabs,
      minCommission,
      maxCommission,
      priority,
      isActive,
      description,
    } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Rule name is required' });
    }

    if (ruleType === 'TIERED_SLAB') {
      if (!Array.isArray(tieredSlabs) || tieredSlabs.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one slab is required for TIERED_SLAB rule' });
      }
    }

    const newRule = await CommissionRule.create({
      name: name.trim(),
      category: category || null,
      categorySlug: categorySlug ? categorySlug.toLowerCase().trim() : 'all',
      vendor: vendor || null,
      ruleType: ruleType || 'PERCENTAGE',
      percentage: percentage !== undefined ? Number(percentage) : 10,
      fixedFee: fixedFee !== undefined ? Number(fixedFee) : 0,
      tieredSlabs: Array.isArray(tieredSlabs) ? tieredSlabs : [],
      minCommission: minCommission !== undefined ? Number(minCommission) : 0,
      maxCommission: maxCommission !== undefined ? Number(maxCommission) : 0,
      priority: priority !== undefined ? Number(priority) : 1,
      isActive: isActive !== undefined ? isActive : true,
      description: description || '',
    });

    return res.status(201).json({
      success: true,
      message: 'Commission rule created successfully',
      data: newRule,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/commission/rules/:id
exports.updateRule = async (req, res) => {
  try {
    const { id } = req.params;
    const rule = await CommissionRule.findById(id);

    if (!rule) {
      return res.status(404).json({ success: false, message: 'Commission rule not found' });
    }

    const {
      name,
      categorySlug,
      category,
      vendor,
      ruleType,
      percentage,
      fixedFee,
      tieredSlabs,
      minCommission,
      maxCommission,
      priority,
      isActive,
      description,
    } = req.body;

    if (name !== undefined) rule.name = name.trim();
    if (category !== undefined) rule.category = category || null;
    if (categorySlug !== undefined) rule.categorySlug = categorySlug.toLowerCase().trim();
    if (vendor !== undefined) rule.vendor = vendor || null;
    if (ruleType !== undefined) rule.ruleType = ruleType;
    if (percentage !== undefined) rule.percentage = Number(percentage);
    if (fixedFee !== undefined) rule.fixedFee = Number(fixedFee);
    if (tieredSlabs !== undefined) rule.tieredSlabs = tieredSlabs;
    if (minCommission !== undefined) rule.minCommission = Number(minCommission);
    if (maxCommission !== undefined) rule.maxCommission = Number(maxCommission);
    if (priority !== undefined) rule.priority = Number(priority);
    if (isActive !== undefined) rule.isActive = isActive;
    if (description !== undefined) rule.description = description;

    await rule.save();

    return res.status(200).json({
      success: true,
      message: 'Commission rule updated successfully',
      data: rule,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/commission/rules/:id
exports.deleteRule = async (req, res) => {
  try {
    const { id } = req.params;
    const rule = await CommissionRule.findByIdAndDelete(id);

    if (!rule) {
      return res.status(404).json({ success: false, message: 'Commission rule not found' });
    }

    return res.status(200).json({
      success: true,
      message: `Commission rule '${rule.name}' deleted successfully`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/commission/simulate
exports.simulateCommission = async (req, res) => {
  try {
    const { vendorId, categorySlug, amount, defaultVendorRate } = req.body;

    if (amount === undefined || isNaN(amount) || Number(amount) < 0) {
      return res.status(400).json({ success: false, message: 'Valid positive order amount is required' });
    }

    const result = await calculateCommission({
      vendorId: vendorId || null,
      categorySlug: categorySlug || null,
      subTotal: Number(amount),
      defaultVendorRate: defaultVendorRate !== undefined ? Number(defaultVendorRate) : null,
    });

    const parsedAmount = Number(amount);
    const vendorEarning = Math.max(0, parsedAmount - result.amount);

    return res.status(200).json({
      success: true,
      data: {
        orderAmount: parsedAmount,
        platformCommissionCut: result.amount,
        vendorEarning,
        effectiveRatePercent: result.rate,
        appliedRule: {
          id: result.ruleId,
          name: result.ruleName,
          type: result.ruleType,
          fixedFee: result.fixedFee,
          minCommission: result.minCommission,
          maxCommission: result.maxCommission,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/commission/seed
exports.seedRulesEndpoint = async (req, res) => {
  try {
    await exports.seedDefaultCommissionRules();
    const rules = await CommissionRule.find().sort({ priority: -1 });
    return res.status(200).json({
      success: true,
      message: 'Default commission rules seeded successfully',
      data: rules,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
