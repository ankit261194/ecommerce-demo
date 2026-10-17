const Warehouse = require('../models/Warehouse');
const WarehouseInventory = require('../models/WarehouseInventory');
const Product = require('../models/Product');
const {
  getPincodeCoordinates,
  routeOrderItems,
  adjustWarehouseStock,
} = require('../services/warehouseRoutingService');

// @desc    Get all warehouses with real-time stock & capacity summary
// @route   GET /api/admin/warehouses
// @access  Private (Super Admin / Admin)
exports.getWarehouses = async (req, res, next) => {
  try {
    const { status, type, search } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { warehouseCode: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { 'address.state': { $regex: search, $options: 'i' } },
        { 'address.pincode': { $regex: search, $options: 'i' } },
      ];
    }

    const warehouses = await Warehouse.find(filter).sort({ createdAt: -1 }).lean();

    // Fetch stock aggregates per warehouse
    const warehouseIds = warehouses.map((w) => w._id);
    const stockAggregates = await WarehouseInventory.aggregate([
      { $match: { warehouse: { $in: warehouseIds } } },
      {
        $group: {
          _id: '$warehouse',
          totalSkus: { $sum: 1 },
          totalAvailableStock: { $sum: '$availableStock' },
          totalReservedStock: { $sum: '$reservedStock' },
        },
      },
    ]);

    const aggregateMap = new Map();
    stockAggregates.forEach((agg) => {
      aggregateMap.set(agg._id.toString(), agg);
    });

    const enriched = warehouses.map((wh) => {
      const agg = aggregateMap.get(wh._id.toString()) || {
        totalSkus: 0,
        totalAvailableStock: 0,
        totalReservedStock: 0,
      };
      return {
        ...wh,
        totalSkus: agg.totalSkus,
        totalAvailableStock: agg.totalAvailableStock,
        totalReservedStock: agg.totalReservedStock,
      };
    });

    res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single warehouse by ID or Code with itemized inventory
// @route   GET /api/admin/warehouses/:id
// @access  Private (Super Admin / Admin)
exports.getWarehouseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const warehouse = await Warehouse.findOne({
      $or: [{ warehouseCode: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    }).lean();

    if (!warehouse) {
      return res.status(404).json({ success: false, message: 'Warehouse fulfillment hub not found.' });
    }

    // Fetch inventory
    const inventory = await WarehouseInventory.find({ warehouse: warehouse._id })
      .populate('product', 'name price images sku category')
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        ...warehouse,
        inventory,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new warehouse fulfillment hub
// @route   POST /api/admin/warehouses
// @access  Private (Super Admin)
exports.createWarehouse = async (req, res, next) => {
  try {
    const {
      name,
      warehouseCode,
      type,
      address,
      contact,
      servicedPincodes,
      servicedZones,
      capacity,
      dispatchCutoffTime,
      slaHours,
      operatingHours,
      isPrimaryDefault,
    } = req.body;

    if (!name || !warehouseCode || !address?.city || !address?.state || !address?.pincode) {
      return res.status(400).json({
        success: false,
        message: 'Name, warehouseCode, address.city, address.state, and address.pincode are required.',
      });
    }

    const cleanCode = warehouseCode.trim().toUpperCase();
    const existing = await Warehouse.findOne({ warehouseCode: cleanCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Warehouse with code '${cleanCode}' already exists.`,
      });
    }

    // Auto-resolve geo-coordinates if omitted
    let location = address.location;
    if (!location?.coordinates || location.coordinates.length !== 2) {
      const geo = getPincodeCoordinates(address.pincode);
      location = {
        type: 'Point',
        coordinates: [geo.lng, geo.lat],
      };
    }

    const warehouse = await Warehouse.create({
      name: name.trim(),
      warehouseCode: cleanCode,
      type: type || 'REGIONAL_DC',
      address: {
        ...address,
        location,
      },
      contact: contact || {},
      servicedPincodes: Array.isArray(servicedPincodes) ? servicedPincodes : [],
      servicedZones: Array.isArray(servicedZones) ? servicedZones : [],
      capacity: capacity || {},
      dispatchCutoffTime: dispatchCutoffTime || '18:00',
      slaHours: slaHours || 24,
      operatingHours: operatingHours || '08:00 - 22:00',
      isPrimaryDefault: Boolean(isPrimaryDefault),
    });

    res.status(201).json({
      success: true,
      message: `Warehouse hub '${warehouse.warehouseCode}' created successfully!`,
      data: warehouse,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update warehouse details
// @route   PUT /api/admin/warehouses/:id
// @access  Private (Super Admin)
exports.updateWarehouse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const warehouse = await Warehouse.findOne({
      $or: [{ warehouseCode: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    });

    if (!warehouse) {
      return res.status(404).json({ success: false, message: 'Warehouse not found.' });
    }

    const {
      name,
      type,
      address,
      contact,
      servicedPincodes,
      servicedZones,
      status,
      capacity,
      dispatchCutoffTime,
      slaHours,
      operatingHours,
      isPrimaryDefault,
    } = req.body;

    if (name) warehouse.name = name.trim();
    if (type) warehouse.type = type;
    if (status) warehouse.status = status;
    if (dispatchCutoffTime) warehouse.dispatchCutoffTime = dispatchCutoffTime.trim();
    if (slaHours) warehouse.slaHours = Number(slaHours);
    if (operatingHours) warehouse.operatingHours = operatingHours;
    if (isPrimaryDefault !== undefined) warehouse.isPrimaryDefault = Boolean(isPrimaryDefault);

    if (contact) {
      warehouse.contact = { ...warehouse.contact.toObject(), ...contact };
    }

    if (capacity) {
      warehouse.capacity = { ...warehouse.capacity.toObject(), ...capacity };
    }

    if (Array.isArray(servicedPincodes)) {
      warehouse.servicedPincodes = servicedPincodes;
    }

    if (Array.isArray(servicedZones)) {
      warehouse.servicedZones = servicedZones;
    }

    if (address) {
      warehouse.address.street = address.street ?? warehouse.address.street;
      warehouse.address.city = address.city ?? warehouse.address.city;
      warehouse.address.state = address.state ?? warehouse.address.state;
      warehouse.address.pincode = address.pincode ?? warehouse.address.pincode;
      if (address.location?.coordinates) {
        warehouse.address.location = address.location;
      }
    }

    await warehouse.save();

    res.status(200).json({
      success: true,
      message: `Warehouse '${warehouse.warehouseCode}' updated successfully!`,
      data: warehouse,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete or archive warehouse
// @route   DELETE /api/admin/warehouses/:id
// @access  Private (Super Admin)
exports.deleteWarehouse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const warehouse = await Warehouse.findOne({
      $or: [{ warehouseCode: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    });

    if (!warehouse) {
      return res.status(404).json({ success: false, message: 'Warehouse not found.' });
    }

    // Set inactive instead of hard deleting to preserve historical shipment tracking
    warehouse.status = 'INACTIVE';
    await warehouse.save();

    res.status(200).json({
      success: true,
      message: `Warehouse '${warehouse.warehouseCode}' archived and set to INACTIVE.`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Manual stock adjustment / receipt in warehouse
// @route   POST /api/admin/warehouses/:id/stock-adjust
// @access  Private (Super Admin)
exports.adjustStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { productId, sku = '', quantityDelta, reason = 'MANUAL_ADJUSTMENT' } = req.body;

    if (!productId || quantityDelta === undefined) {
      return res.status(400).json({
        success: false,
        message: 'productId and quantityDelta (positive or negative number) are required.',
      });
    }

    const warehouse = await Warehouse.findOne({
      $or: [{ warehouseCode: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    });

    if (!warehouse) {
      return res.status(404).json({ success: false, message: 'Warehouse not found.' });
    }

    const updatedInventory = await adjustWarehouseStock({
      warehouseId: warehouse._id,
      productId,
      sku,
      quantityDelta: Number(quantityDelta),
      reason,
      performedBy: req.user ? `${req.user.name} (${req.user.email})` : 'SUPER_ADMIN',
    });

    res.status(200).json({
      success: true,
      message: `Stock adjusted by ${quantityDelta > 0 ? '+' : ''}${quantityDelta} units. Current available stock: ${updatedInventory.availableStock}`,
      data: updatedInventory,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Smart Routing & Nearest Pincode Allocation Simulator
// @route   POST /api/admin/warehouses/route-simulation
// @access  Private (Super Admin / Admin)
exports.simulateRouting = async (req, res, next) => {
  try {
    const { destinationPincode, coordinates, items = [] } = req.body;

    if (!destinationPincode || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'destinationPincode (6 digits) and items array [{ product, quantity }] are required.',
      });
    }

    const routingResult = await routeOrderItems({
      destinationPincode: destinationPincode.trim(),
      coordinates,
      items,
    });

    res.status(200).json({
      success: true,
      data: routingResult,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Network-wide Multi-Warehouse Analytics & Capacity Metrics
// @route   GET /api/admin/warehouses/analytics
// @access  Private (Super Admin / Admin)
exports.getNetworkAnalytics = async (req, res, next) => {
  try {
    const [warehouses, inventoryAggregates] = await Promise.all([
      Warehouse.find().lean(),
      WarehouseInventory.aggregate([
        {
          $group: {
            _id: null,
            totalStockUnits: { $sum: '$availableStock' },
            totalReservedUnits: { $sum: '$reservedStock' },
            totalUniqueSkus: { $sum: 1 },
          },
        },
      ]),
    ]);

    const totalHubs = warehouses.length;
    const activeHubs = warehouses.filter((w) => w.status === 'ACTIVE').length;
    const darkStores = warehouses.filter((w) => w.type === 'DARK_STORE').length;

    let totalPallets = 0;
    let usedPallets = 0;
    let totalDailyCapacity = 0;

    warehouses.forEach((w) => {
      totalPallets += w.capacity?.totalPalletCapacity || 0;
      usedPallets += w.capacity?.usedPalletCapacity || 0;
      totalDailyCapacity += w.capacity?.maxDailyShipments || 0;
    });

    const utilizationPercentage = totalPallets > 0 ? Math.round((usedPallets / totalPallets) * 100) : 0;
    const stockStats = inventoryAggregates[0] || {
      totalStockUnits: 0,
      totalReservedUnits: 0,
      totalUniqueSkus: 0,
    };

    res.status(200).json({
      success: true,
      data: {
        totalHubs,
        activeHubs,
        darkStores,
        networkCapacity: {
          totalPallets,
          usedPallets,
          utilizationPercentage,
          totalDailyCapacity,
        },
        inventoryMetrics: stockStats,
        routingEngineStatus: 'HEALTHY_ACTIVE',
      },
    });
  } catch (error) {
    next(error);
  }
};
