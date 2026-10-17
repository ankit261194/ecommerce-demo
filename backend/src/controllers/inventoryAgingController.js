const Product = require('../models/Product');
const SubOrder = require('../models/SubOrder');
const VendorProfile = require('../models/VendorProfile');
const { recordAuditLog } = require('../utils/auditLogger');

// Helper to resolve vendor profile for owner or sub-staff
const resolveVendorProfile = async req => {
  if (req.vendorProfile) return req.vendorProfile;
  if (!req.user) return null;
  return await VendorProfile.findOne({
    $or: [{ user: req.user._id }, { _id: req.user.vendorProfile }],
  });
};

// @desc    Get Inventory Aging & Dead-Stock Velocity Radar with KPIs & product list
// @route   GET /api/vendor/inventory/aging-radar
// @access  Vendor / Vendor Staff (requireVendorPermission: WAREHOUSE_INVENTORY or PRODUCTS_MANAGE)
exports.getInventoryAgingRadar = async (req, res, next) => {
  try {
    const vendor = await resolveVendorProfile(req);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor store profile not found.' });
    }

    const {
      bracket = 'ALL',
      search = '',
      sortBy = 'age_desc',
      page = 1,
      limit = 50,
    } = req.query;

    const settings = vendor.inventoryVelocitySettings || {
      holdingCostMonthlyRate: 2.0,
      freshThresholdDays: 30,
      slowMovingThresholdDays: 60,
      deadStockThresholdDays: 90,
      slowMovingDiscountPercent: 15,
      deadStockDiscountPercent: 35,
    };

    // 1. Fetch all products owned by vendor
    const productQuery = {
      vendor: vendor._id,
      status: { $ne: 'archived' },
    };

    if (search && search.trim()) {
      const s = search.trim();
      productQuery.$or = [
        { title: { $regex: s, $options: 'i' } },
        { sku: { $regex: s, $options: 'i' } },
        { brand: { $regex: s, $options: 'i' } },
      ];
    }

    const products = await Product.find(productQuery).populate('category', 'name slug icon');

    // 2. Query historical sales in past 90 days for this vendor
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const subOrders = await SubOrder.find({
      vendor: vendor._id,
      createdAt: { $gte: ninetyDaysAgo },
      status: { $nin: ['cancelled', 'returned'] },
    }).select('items createdAt');

    // Build per-product sales velocity ledger
    const now = Date.now();
    const salesMap = {};

    for (const subOrder of subOrders) {
      const orderDate = new Date(subOrder.createdAt).getTime();
      const daysAgo = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));

      for (const item of subOrder.items || []) {
        if (!item.product) continue;
        const pId = item.product.toString();
        if (!salesMap[pId]) {
          salesMap[pId] = {
            unitsSold30d: 0,
            unitsSold60d: 0,
            unitsSold90d: 0,
            revenue30d: 0,
            lastSaleDate: subOrder.createdAt,
          };
        }

        const qty = Number(item.quantity) || 0;
        const linePrice = Number(item.totalPrice) || (Number(item.price) || 0) * qty;

        if (daysAgo <= 30) {
          salesMap[pId].unitsSold30d += qty;
          salesMap[pId].revenue30d += linePrice;
        }
        if (daysAgo <= 60) {
          salesMap[pId].unitsSold60d += qty;
        }
        if (daysAgo <= 90) {
          salesMap[pId].unitsSold90d += qty;
        }

        if (!salesMap[pId].lastSaleDate || orderDate > new Date(salesMap[pId].lastSaleDate).getTime()) {
          salesMap[pId].lastSaleDate = subOrder.createdAt;
        }
      }
    }

    // 3. Compute metrics for every product
    const computedItems = products.map(product => {
      const pId = product._id.toString();
      const sales = salesMap[pId] || {
        unitsSold30d: 0,
        unitsSold60d: 0,
        unitsSold90d: 0,
        revenue30d: 0,
        lastSaleDate: null,
      };

      const ageDays = Math.max(0, Math.floor((now - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
      const daysSinceLastSale = sales.lastSaleDate
        ? Math.max(0, Math.floor((now - new Date(sales.lastSaleDate).getTime()) / (1000 * 60 * 60 * 24)))
        : ageDays;

      const currentStock = Number(product.stock) || 0;
      const sellingPrice = Number(product.sellingPrice) || Number(product.mrp) || 0;
      const mrp = Number(product.mrp) || sellingPrice;

      const dailySalesVelocity = parseFloat((sales.unitsSold30d / 30).toFixed(2));
      const weeklySalesVelocity = parseFloat(((sales.unitsSold30d / 30) * 7).toFixed(1));
      const sellThroughRate = currentStock + sales.unitsSold30d > 0
        ? Math.round((sales.unitsSold30d / (currentStock + sales.unitsSold30d)) * 100)
        : 0;

      const daysOfSupply = dailySalesVelocity > 0
        ? Math.round(currentStock / dailySalesVelocity)
        : (currentStock > 0 ? 999 : 0);

      const tiedUpCapital = currentStock * sellingPrice;
      const monthlyHoldingCost = parseFloat((tiedUpCapital * ((settings.holdingCostMonthlyRate || 2.0) / 100)).toFixed(2));

      // Classify into Aging Radar Brackets
      let itemBracket = 'FRESH';
      let urgency = 'HEALTHY';
      let recommendedDiscount = 0;
      let recommendedAction = 'Maintain Stock';

      const isDeadStock = (ageDays >= settings.deadStockThresholdDays && sales.unitsSold60d === 0 && currentStock > 0) ||
                          (daysSinceLastSale >= settings.deadStockThresholdDays && currentStock > 0);

      const isSlowMoving = !isDeadStock && (
        (ageDays >= settings.slowMovingThresholdDays && currentStock > 0)
      );

      const isNormal = !isDeadStock && !isSlowMoving && (
        ageDays > settings.freshThresholdDays
      );

      if (isDeadStock) {
        itemBracket = 'DEAD_STOCK';
        urgency = 'CRITICAL';
        recommendedDiscount = settings.deadStockDiscountPercent || 35;
        recommendedAction = 'Flash Clearance Liquidation';
      } else if (isSlowMoving) {
        itemBracket = 'SLOW';
        urgency = 'HIGH';
        recommendedDiscount = settings.slowMovingDiscountPercent || 15;
        recommendedAction = 'Early Clearance Price Nudge';
      } else if (isNormal) {
        itemBracket = 'NORMAL';
        urgency = 'MODERATE';
        recommendedDiscount = 10;
        recommendedAction = 'Monitor Velocity / Bundle Offer';
      } else {
        itemBracket = 'FRESH';
        urgency = 'HEALTHY';
        recommendedDiscount = 0;
        recommendedAction = dailySalesVelocity >= 1.0 ? 'High Demand: Restock Soon' : 'Maintain Stock';
      }

      // Projected capital unlocked if liquidated at recommended discount
      const discountedUnitSellingPrice = mrp > 0
        ? Math.round(mrp * (1 - recommendedDiscount / 100))
        : Math.round(sellingPrice * (1 - recommendedDiscount / 100));
      const potentialLiquidationRevenue = currentStock * discountedUnitSellingPrice;

      return {
        _id: product._id,
        title: product.title,
        slug: product.slug,
        sku: product.sku,
        brand: product.brand || 'Generic',
        category: product.category?.name || 'General',
        thumbnail: product.thumbnail || (product.images && product.images[0]) || '',
        mrp,
        sellingPrice,
        stock: currentStock,
        status: product.status,
        isPublished: product.isPublished,
        ageDays,
        daysSinceLastSale,
        lastSaleDate: sales.lastSaleDate,
        unitsSold30d: sales.unitsSold30d,
        unitsSold60d: sales.unitsSold60d,
        unitsSold90d: sales.unitsSold90d,
        revenue30d: sales.revenue30d,
        dailySalesVelocity,
        weeklySalesVelocity,
        sellThroughRate,
        daysOfSupply,
        tiedUpCapital,
        monthlyHoldingCost,
        bracket: itemBracket,
        urgency,
        recommendedDiscount,
        recommendedAction,
        discountedUnitSellingPrice,
        potentialLiquidationRevenue,
        hasClearanceTag: Array.isArray(product.tags) && (product.tags.includes('clearance') || product.tags.includes('dead-stock-clearance')),
      };
    });

    // 4. Portfolio-level Bento Aggregations
    let totalUnitsInStock = 0;
    let totalTiedUpCapital = 0;
    let deadStockCapital = 0;
    let slowMovingCapital = 0;
    let freshCapital = 0;
    let normalCapital = 0;
    let totalEstimatedMonthlyHoldingCost = 0;

    const breakdown = {
      fresh: { count: 0, units: 0, capital: 0, percentage: 0 },
      normal: { count: 0, units: 0, capital: 0, percentage: 0 },
      slow: { count: 0, units: 0, capital: 0, percentage: 0 },
      deadStock: { count: 0, units: 0, capital: 0, percentage: 0 },
    };

    for (const item of computedItems) {
      totalUnitsInStock += item.stock;
      totalTiedUpCapital += item.tiedUpCapital;
      totalEstimatedMonthlyHoldingCost += item.monthlyHoldingCost;

      if (item.bracket === 'DEAD_STOCK') {
        deadStockCapital += item.tiedUpCapital;
        breakdown.deadStock.count += 1;
        breakdown.deadStock.units += item.stock;
        breakdown.deadStock.capital += item.tiedUpCapital;
      } else if (item.bracket === 'SLOW') {
        slowMovingCapital += item.tiedUpCapital;
        breakdown.slow.count += 1;
        breakdown.slow.units += item.stock;
        breakdown.slow.capital += item.tiedUpCapital;
      } else if (item.bracket === 'NORMAL') {
        normalCapital += item.tiedUpCapital;
        breakdown.normal.count += 1;
        breakdown.normal.units += item.stock;
        breakdown.normal.capital += item.tiedUpCapital;
      } else {
        freshCapital += item.tiedUpCapital;
        breakdown.fresh.count += 1;
        breakdown.fresh.units += item.stock;
        breakdown.fresh.capital += item.tiedUpCapital;
      }
    }

    if (totalTiedUpCapital > 0) {
      breakdown.fresh.percentage = Math.round((breakdown.fresh.capital / totalTiedUpCapital) * 100);
      breakdown.normal.percentage = Math.round((breakdown.normal.capital / totalTiedUpCapital) * 100);
      breakdown.slow.percentage = Math.round((breakdown.slow.capital / totalTiedUpCapital) * 100);
      breakdown.deadStock.percentage = Math.round((breakdown.deadStock.capital / totalTiedUpCapital) * 100);
    }

    const capitalAtRisk = deadStockCapital + slowMovingCapital;
    const healthyCapital = freshCapital + normalCapital;
    const inventoryHealthScore = totalTiedUpCapital > 0
      ? Math.round((healthyCapital / totalTiedUpCapital) * 100)
      : 100;

    // Top Fast Movers & Top Dead Stock for quick widgets
    const topFastMovers = [...computedItems]
      .filter(i => i.dailySalesVelocity > 0)
      .sort((a, b) => b.dailySalesVelocity - a.dailySalesVelocity)
      .slice(0, 5);

    const topDeadStock = [...computedItems]
      .filter(i => i.bracket === 'DEAD_STOCK' || i.bracket === 'SLOW')
      .sort((a, b) => b.tiedUpCapital - a.tiedUpCapital)
      .slice(0, 5);

    // 5. Filter by requested bracket
    let filteredItems = computedItems;
    if (bracket !== 'ALL') {
      filteredItems = computedItems.filter(i => i.bracket === bracket);
    }

    // 6. Sorting
    switch (sortBy) {
      case 'age_asc':
        filteredItems.sort((a, b) => a.ageDays - b.ageDays);
        break;
      case 'capital_desc':
        filteredItems.sort((a, b) => b.tiedUpCapital - a.tiedUpCapital);
        break;
      case 'capital_asc':
        filteredItems.sort((a, b) => a.tiedUpCapital - b.tiedUpCapital);
        break;
      case 'velocity_desc':
        filteredItems.sort((a, b) => b.dailySalesVelocity - a.dailySalesVelocity);
        break;
      case 'velocity_asc':
        filteredItems.sort((a, b) => a.dailySalesVelocity - b.dailySalesVelocity);
        break;
      case 'age_desc':
      default:
        filteredItems.sort((a, b) => b.ageDays - a.ageDays);
        break;
    }

    // 7. Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 50);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedItems = filteredItems.slice(startIndex, startIndex + limitNum);

    res.status(200).json({
      success: true,
      summary: {
        totalSkus: products.length,
        totalUnitsInStock,
        totalTiedUpCapital,
        deadStockCapital,
        slowMovingCapital,
        capitalAtRisk,
        estimatedMonthlyHoldingCost: parseFloat(totalEstimatedMonthlyHoldingCost.toFixed(2)),
        inventoryHealthScore,
        breakdown,
        topFastMovers,
        topDeadStock,
      },
      settings,
      data: paginatedItems,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems: filteredItems.length,
        totalPages: Math.ceil(filteredItems.length / limitNum) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Apply Automated or Custom Discount Nudge to a single aging product
// @route   POST /api/vendor/inventory/apply-discount-nudge
// @access  Vendor / Vendor Staff (requireVendorPermission: PRODUCTS_MANAGE)
exports.applyDiscountNudge = async (req, res, next) => {
  try {
    const vendor = await resolveVendorProfile(req);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor store profile not found.' });
    }

    const { productId, discountPercent, enrollClearance = true } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required.' });
    }

    const disc = Number(discountPercent);
    if (isNaN(disc) || disc < 1 || disc > 90) {
      return res.status(400).json({ success: false, message: 'Discount percentage must be between 1% and 90%.' });
    }

    const product = await Product.findOne({ _id: productId, vendor: vendor._id });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or does not belong to your store catalog.',
      });
    }

    const previousSellingPrice = product.sellingPrice;
    const mrp = product.mrp || product.sellingPrice;
    const newSellingPrice = Math.max(1, Math.round(mrp * (1 - disc / 100)));

    product.sellingPrice = newSellingPrice;
    product.mrp = mrp;
    product.savingsAmount = Math.max(0, mrp - newSellingPrice);
    product.discountPercentage = Math.round(((mrp - newSellingPrice) / mrp) * 100);

    if (enrollClearance) {
      if (!Array.isArray(product.tags)) product.tags = [];
      if (!product.tags.includes('clearance')) product.tags.push('clearance');
      if (!product.tags.includes('dead-stock-clearance')) product.tags.push('dead-stock-clearance');
    }

    await product.save();

    // Record audit trail
    await recordAuditLog({
      action: 'APPLY_INVENTORY_DISCOUNT_NUDGE',
      module: 'INVENTORY',
      performedBy: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      targetId: product._id.toString(),
      targetType: 'Product',
      description: `Applied ${disc}% discount nudge on '${product.title}' (Price adjusted from ₹${previousSellingPrice} to ₹${newSellingPrice})`,
      changeSummary: `Price adjusted from ₹${previousSellingPrice} to ₹${newSellingPrice} (${disc}% off)`,
      details: {
        productId: product._id,
        sku: product.sku,
        previousSellingPrice,
        newSellingPrice,
        discountPercentage: disc,
        unlockedPotentialRevenue: product.stock * newSellingPrice,
      },
    });

    res.status(200).json({
      success: true,
      message: `Discount nudge of ${disc}% applied successfully. New price is ₹${newSellingPrice}.`,
      data: {
        product: {
          _id: product._id,
          title: product.title,
          sku: product.sku,
          mrp: product.mrp,
          previousSellingPrice,
          newSellingPrice,
          discountPercentage: product.discountPercentage,
          savingsAmount: product.savingsAmount,
          stock: product.stock,
          tags: product.tags,
        },
        unlockedPotentialRevenue: product.stock * newSellingPrice,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk Apply Discount Nudges across multiple products or an entire aging bracket
// @route   POST /api/vendor/inventory/bulk-apply-discount-nudges
// @access  Vendor / Vendor Staff (requireVendorPermission: PRODUCTS_MANAGE)
exports.bulkApplyDiscountNudges = async (req, res, next) => {
  try {
    const vendor = await resolveVendorProfile(req);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor store profile not found.' });
    }

    const { productIds, discountPercent, enrollClearance = true } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ success: false, message: 'productIds must be a non-empty array of product IDs.' });
    }

    const disc = Number(discountPercent);
    if (isNaN(disc) || disc < 1 || disc > 90) {
      return res.status(400).json({ success: false, message: 'Discount percentage must be between 1% and 90%.' });
    }

    const products = await Product.find({
      _id: { $in: productIds },
      vendor: vendor._id,
    });

    if (products.length === 0) {
      return res.status(404).json({ success: false, message: 'No valid products matching your store catalog were found.' });
    }

    let updatedCount = 0;
    let totalUnlockedRevenue = 0;
    const updatedDetails = [];

    for (const prod of products) {
      const prevPrice = prod.sellingPrice;
      const mrp = prod.mrp || prod.sellingPrice;
      const newPrice = Math.max(1, Math.round(mrp * (1 - disc / 100)));

      prod.sellingPrice = newPrice;
      prod.mrp = mrp;
      prod.savingsAmount = Math.max(0, mrp - newPrice);
      prod.discountPercentage = Math.round(((mrp - newPrice) / mrp) * 100);

      if (enrollClearance) {
        if (!Array.isArray(prod.tags)) prod.tags = [];
        if (!prod.tags.includes('clearance')) prod.tags.push('clearance');
        if (!prod.tags.includes('dead-stock-clearance')) prod.tags.push('dead-stock-clearance');
      }

      await prod.save();
      updatedCount += 1;
      totalUnlockedRevenue += (prod.stock * newPrice);

      updatedDetails.push({
        _id: prod._id,
        sku: prod.sku,
        previousSellingPrice: prevPrice,
        newSellingPrice: newPrice,
      });
    }

    // Record audit trail
    await recordAuditLog({
      action: 'BULK_INVENTORY_DISCOUNT_NUDGE',
      module: 'INVENTORY',
      performedBy: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      targetId: vendor._id.toString(),
      targetType: 'VendorProfile',
      description: `Bulk applied ${disc}% discount nudge across ${updatedCount} products`,
      changeSummary: `Bulk discounted ${updatedCount} products by ${disc}%`,
      details: {
        updatedCount,
        discountPercentage: disc,
        totalUnlockedRevenue,
      },
    });

    res.status(200).json({
      success: true,
      message: `Bulk discount nudge of ${disc}% applied successfully to ${updatedCount} products.`,
      data: {
        updatedCount,
        totalUnlockedRevenue,
        products: updatedDetails,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Inventory Velocity Radar vendor configuration
// @route   GET /api/vendor/inventory/aging-settings
// @access  Vendor / Vendor Staff (requireVendorPermission: WAREHOUSE_INVENTORY or PRODUCTS_MANAGE)
exports.getAgingRadarSettings = async (req, res, next) => {
  try {
    const vendor = await resolveVendorProfile(req);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor store profile not found.' });
    }

    const settings = vendor.inventoryVelocitySettings || {
      holdingCostMonthlyRate: 2.0,
      freshThresholdDays: 30,
      slowMovingThresholdDays: 60,
      deadStockThresholdDays: 90,
      autoNudgeEnabled: false,
      slowMovingDiscountPercent: 15,
      deadStockDiscountPercent: 35,
    };

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Inventory Velocity Radar vendor configuration
// @route   PUT /api/vendor/inventory/aging-settings
// @access  Vendor / Vendor Staff (requireVendorPermission: STORE_SETTINGS or PRODUCTS_MANAGE)
exports.updateAgingRadarSettings = async (req, res, next) => {
  try {
    const vendor = await resolveVendorProfile(req);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor store profile not found.' });
    }

    const {
      holdingCostMonthlyRate,
      freshThresholdDays,
      slowMovingThresholdDays,
      deadStockThresholdDays,
      autoNudgeEnabled,
      slowMovingDiscountPercent,
      deadStockDiscountPercent,
    } = req.body;

    if (!vendor.inventoryVelocitySettings) {
      vendor.inventoryVelocitySettings = {};
    }

    if (holdingCostMonthlyRate !== undefined) {
      const rate = Number(holdingCostMonthlyRate);
      if (isNaN(rate) || rate < 0 || rate > 50) {
        return res.status(400).json({ success: false, message: 'holdingCostMonthlyRate must be between 0% and 50%.' });
      }
      vendor.inventoryVelocitySettings.holdingCostMonthlyRate = rate;
    }

    if (deadStockThresholdDays !== undefined) {
      const days = parseInt(deadStockThresholdDays, 10);
      if (isNaN(days) || days < 30 || days > 365) {
        return res.status(400).json({ success: false, message: 'deadStockThresholdDays must be between 30 and 365 days.' });
      }
      vendor.inventoryVelocitySettings.deadStockThresholdDays = days;
    }

    if (slowMovingThresholdDays !== undefined) {
      const days = parseInt(slowMovingThresholdDays, 10);
      if (isNaN(days) || days < 15 || days > 180) {
        return res.status(400).json({ success: false, message: 'slowMovingThresholdDays must be between 15 and 180 days.' });
      }
      vendor.inventoryVelocitySettings.slowMovingThresholdDays = days;
    }

    if (freshThresholdDays !== undefined) {
      const days = parseInt(freshThresholdDays, 10);
      if (isNaN(days) || days < 7 || days > 60) {
        return res.status(400).json({ success: false, message: 'freshThresholdDays must be between 7 and 60 days.' });
      }
      vendor.inventoryVelocitySettings.freshThresholdDays = days;
    }

    if (slowMovingDiscountPercent !== undefined) {
      const disc = Number(slowMovingDiscountPercent);
      if (isNaN(disc) || disc < 1 || disc > 80) {
        return res.status(400).json({ success: false, message: 'slowMovingDiscountPercent must be between 1% and 80%.' });
      }
      vendor.inventoryVelocitySettings.slowMovingDiscountPercent = disc;
    }

    if (deadStockDiscountPercent !== undefined) {
      const disc = Number(deadStockDiscountPercent);
      if (isNaN(disc) || disc < 5 || disc > 90) {
        return res.status(400).json({ success: false, message: 'deadStockDiscountPercent must be between 5% and 90%.' });
      }
      vendor.inventoryVelocitySettings.deadStockDiscountPercent = disc;
    }

    if (autoNudgeEnabled !== undefined) {
      vendor.inventoryVelocitySettings.autoNudgeEnabled = Boolean(autoNudgeEnabled);
    }

    await vendor.save();

    res.status(200).json({
      success: true,
      message: 'Inventory aging radar settings updated successfully.',
      data: vendor.inventoryVelocitySettings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export RFC-4180 Inventory Aging & Velocity Radar report as CSV
// @route   GET /api/vendor/inventory/aging-radar/export-csv
// @access  Vendor / Vendor Staff (requireVendorPermission: WAREHOUSE_INVENTORY or PRODUCTS_MANAGE)
exports.exportInventoryAgingCSV = async (req, res, next) => {
  try {
    const vendor = await resolveVendorProfile(req);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor store profile not found.' });
    }

    const settings = vendor.inventoryVelocitySettings || {
      holdingCostMonthlyRate: 2.0,
      freshThresholdDays: 30,
      slowMovingThresholdDays: 60,
      deadStockThresholdDays: 90,
      slowMovingDiscountPercent: 15,
      deadStockDiscountPercent: 35,
    };

    const products = await Product.find({
      vendor: vendor._id,
      status: { $ne: 'archived' },
    }).populate('category', 'name');

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const subOrders = await SubOrder.find({
      vendor: vendor._id,
      createdAt: { $gte: ninetyDaysAgo },
      status: { $nin: ['cancelled', 'returned'] },
    }).select('items createdAt');

    const now = Date.now();
    const salesMap = {};
    for (const subOrder of subOrders) {
      const orderDate = new Date(subOrder.createdAt).getTime();
      const daysAgo = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));

      for (const item of subOrder.items || []) {
        if (!item.product) continue;
        const pId = item.product.toString();
        if (!salesMap[pId]) {
          salesMap[pId] = { unitsSold30d: 0, unitsSold60d: 0, lastSaleDate: null };
        }
        const qty = Number(item.quantity) || 0;
        if (daysAgo <= 30) salesMap[pId].unitsSold30d += qty;
        if (daysAgo <= 60) salesMap[pId].unitsSold60d += qty;
        if (!salesMap[pId].lastSaleDate || orderDate > new Date(salesMap[pId].lastSaleDate).getTime()) {
          salesMap[pId].lastSaleDate = subOrder.createdAt;
        }
      }
    }

    const escapeCsv = val => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      'SKU',
      'Product Title',
      'Category',
      'Stock Units',
      'MRP (INR)',
      'Selling Price (INR)',
      'Age (Days)',
      'Days Since Last Sale',
      '30-Day Sales Units',
      'Daily Sales Velocity',
      'Weekly Sales Velocity',
      'Days of Supply',
      'Tied-up Capital (INR)',
      'Estimated Monthly Holding Cost (INR)',
      'Aging Radar Bracket',
      'Urgency Level',
      'Recommended Discount Nudge (%)',
      'Discounted Price (INR)',
      'Projected Liquidation Value (INR)',
      'Recommended Strategic Action',
    ];

    const rows = [headers.join(',')];

    for (const p of products) {
      const pId = p._id.toString();
      const s = salesMap[pId] || { unitsSold30d: 0, unitsSold60d: 0, lastSaleDate: null };
      const ageDays = Math.max(0, Math.floor((now - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
      const daysSinceLastSale = s.lastSaleDate
        ? Math.max(0, Math.floor((now - new Date(s.lastSaleDate).getTime()) / (1000 * 60 * 60 * 24)))
        : ageDays;

      const currentStock = Number(p.stock) || 0;
      const sellingPrice = Number(p.sellingPrice) || Number(p.mrp) || 0;
      const mrp = Number(p.mrp) || sellingPrice;
      const dailySalesVelocity = parseFloat((s.unitsSold30d / 30).toFixed(2));
      const weeklySalesVelocity = parseFloat(((s.unitsSold30d / 30) * 7).toFixed(1));
      const daysOfSupply = dailySalesVelocity > 0
        ? Math.round(currentStock / dailySalesVelocity)
        : (currentStock > 0 ? 999 : 0);
      const tiedUpCapital = currentStock * sellingPrice;
      const monthlyHoldingCost = parseFloat((tiedUpCapital * ((settings.holdingCostMonthlyRate || 2.0) / 100)).toFixed(2));

      let bracket = 'FRESH';
      let urgency = 'HEALTHY';
      let recommendedDiscount = 0;
      let recommendedAction = 'Maintain Stock';

      const isDeadStock = (ageDays >= settings.deadStockThresholdDays && s.unitsSold60d === 0 && currentStock > 0) ||
                          (daysSinceLastSale >= settings.deadStockThresholdDays && currentStock > 0);

      const isSlowMoving = !isDeadStock && (
        (ageDays >= settings.slowMovingThresholdDays && currentStock > 0)
      );

      const isNormal = !isDeadStock && !isSlowMoving && (
        ageDays > settings.freshThresholdDays
      );

      if (isDeadStock) {
        bracket = 'DEAD_STOCK';
        urgency = 'CRITICAL';
        recommendedDiscount = settings.deadStockDiscountPercent || 35;
        recommendedAction = 'Flash Clearance Liquidation';
      } else if (isSlowMoving) {
        bracket = 'SLOW';
        urgency = 'HIGH';
        recommendedDiscount = settings.slowMovingDiscountPercent || 15;
        recommendedAction = 'Early Clearance Price Nudge';
      } else if (isNormal) {
        bracket = 'NORMAL';
        urgency = 'MODERATE';
        recommendedDiscount = 10;
        recommendedAction = 'Monitor Velocity / Bundle Offer';
      } else {
        bracket = 'FRESH';
        urgency = 'HEALTHY';
        recommendedDiscount = 0;
        recommendedAction = dailySalesVelocity >= 1.0 ? 'High Demand: Restock Soon' : 'Maintain Stock';
      }

      const discountedPrice = Math.round(mrp * (1 - recommendedDiscount / 100));
      const projectedLiquidationValue = currentStock * discountedPrice;

      rows.push([
        escapeCsv(p.sku),
        escapeCsv(p.title),
        escapeCsv(p.category?.name || 'General'),
        currentStock,
        mrp,
        sellingPrice,
        ageDays,
        daysSinceLastSale,
        s.unitsSold30d,
        dailySalesVelocity,
        weeklySalesVelocity,
        daysOfSupply,
        tiedUpCapital,
        monthlyHoldingCost,
        escapeCsv(bracket),
        escapeCsv(urgency),
        recommendedDiscount,
        discountedPrice,
        projectedLiquidationValue,
        escapeCsv(recommendedAction),
      ].join(','));
    }

    const csvContent = '\uFEFF' + rows.join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="inventory-aging-radar-${Date.now()}.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};
