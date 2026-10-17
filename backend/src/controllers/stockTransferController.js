const StockTransferOrder = require('../models/StockTransferOrder');
const Warehouse = require('../models/Warehouse');
const WarehouseInventory = require('../models/WarehouseInventory');

// @desc    Get all stock transfer orders with filters
// @route   GET /api/admin/stock-transfers
// @access  Private (Super Admin / Admin)
exports.getTransferOrders = async (req, res, next) => {
  try {
    const { status, sourceWarehouse, destinationWarehouse, search } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (sourceWarehouse) filter.sourceWarehouse = sourceWarehouse;
    if (destinationWarehouse) filter.destinationWarehouse = destinationWarehouse;

    if (search) {
      filter.$or = [
        { transferNumber: { $regex: search, $options: 'i' } },
        { 'transitDetails.trackingNumber': { $regex: search, $options: 'i' } },
        { 'transitDetails.vehicleNumber': { $regex: search, $options: 'i' } },
        { 'transitDetails.courierPartner': { $regex: search, $options: 'i' } },
      ];
    }

    const transfers = await StockTransferOrder.find(filter)
      .populate('sourceWarehouse', 'name warehouseCode address')
      .populate('destinationWarehouse', 'name warehouseCode address')
      .populate('items.product', 'title name sku price images')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: transfers.length,
      data: transfers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single stock transfer order by ID or transferNumber
// @route   GET /api/admin/stock-transfers/:id
// @access  Private (Super Admin / Admin)
exports.getTransferOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const transfer = await StockTransferOrder.findOne({
      $or: [{ transferNumber: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    })
      .populate('sourceWarehouse', 'name warehouseCode address contact capacity')
      .populate('destinationWarehouse', 'name warehouseCode address contact capacity')
      .populate('items.product', 'title name sku price images')
      .lean();

    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Stock transfer order not found.' });
    }

    res.status(200).json({
      success: true,
      data: transfer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new inter-warehouse stock transfer order
// @route   POST /api/admin/stock-transfers
// @access  Private (Super Admin / Admin)
exports.createTransferOrder = async (req, res, next) => {
  try {
    const {
      sourceWarehouse,
      destinationWarehouse,
      priority = 'STANDARD',
      items = [],
      notes = '',
    } = req.body;

    if (!sourceWarehouse || !destinationWarehouse) {
      return res.status(400).json({
        success: false,
        message: 'Source and Destination warehouses are both required.',
      });
    }

    if (sourceWarehouse.toString() === destinationWarehouse.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Source and Destination warehouses must be distinct fulfillment hubs.',
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Transfer items array must contain at least one product with requested quantity.',
      });
    }

    let totalUnitsRequested = 0;
    const formattedItems = [];

    for (const item of items) {
      const qty = Number(item.requestedQuantity || item.quantity || 1);
      if (qty <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Requested quantity must be at least 1.',
        });
      }
      totalUnitsRequested += qty;
      formattedItems.push({
        product: item.product || item.productId,
        sku: item.sku || '',
        title: item.title || 'Transfer Item',
        requestedQuantity: qty,
        dispatchedQuantity: qty, // Default plan matches requested
        receivedQuantity: 0,
        damagedQuantity: 0,
        unitCost: Number(item.unitCost || 0),
        binLocation: item.binLocation || '',
      });
    }

    const transferNumber = `STO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;

    const userName = req.user ? `${req.user.name} (${req.user.email})` : 'SUPER_ADMIN';

    const transfer = await StockTransferOrder.create({
      transferNumber,
      sourceWarehouse,
      destinationWarehouse,
      status: 'REQUESTED',
      priority,
      items: formattedItems,
      totalUnitsRequested,
      totalUnitsDispatched: 0,
      totalUnitsReceived: 0,
      notes,
      activityTimeline: [
        {
          status: 'REQUESTED',
          note: `Transfer order initiated for ${totalUnitsRequested} total units across ${formattedItems.length} SKUs.`,
          performedBy: userName,
          timestamp: new Date(),
        },
      ],
      createdBy: userName,
    });

    res.status(201).json({
      success: true,
      message: `Stock Transfer Order '${transfer.transferNumber}' created successfully!`,
      data: transfer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve transfer order & reserve inventory at source warehouse
// @route   POST /api/admin/stock-transfers/:id/approve
// @access  Private (Super Admin / Admin)
exports.approveTransferOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const transfer = await StockTransferOrder.findOne({
      $or: [{ transferNumber: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    });

    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Transfer order not found.' });
    }

    if (transfer.status !== 'REQUESTED' && transfer.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve transfer order with current status '${transfer.status}'.`,
      });
    }

    // Reserve stock at source warehouse
    for (const item of transfer.items) {
      const inv = await WarehouseInventory.findOne({
        warehouse: transfer.sourceWarehouse,
        product: item.product,
      });

      if (!inv || (inv.availableStock || 0) < item.requestedQuantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient inventory at source warehouse for item '${item.title}' (SKU: ${item.sku}). Available: ${inv?.availableStock || 0}, Requested: ${item.requestedQuantity}`,
        });
      }

      inv.reservedStock = (inv.reservedStock || 0) + item.requestedQuantity;
      inv.availableStock = Math.max(0, inv.availableStock - item.requestedQuantity);
      inv.auditLog.push({
        action: 'ORDER_ALLOCATION',
        quantityDelta: -item.requestedQuantity,
        balanceAfter: inv.availableStock,
        reason: `Reserved for inter-warehouse transfer ${transfer.transferNumber}`,
        performedBy: req.user?.email || 'SUPER_ADMIN',
        timestamp: new Date(),
      });
      await inv.save();
    }

    transfer.status = 'APPROVED';
    transfer.activityTimeline.push({
      status: 'APPROVED',
      note: 'Transfer order approved by manager. Stock reserved at source fulfillment hub.',
      performedBy: req.user ? `${req.user.name} (${req.user.email})` : 'SUPER_ADMIN',
      timestamp: new Date(),
    });

    await transfer.save();

    res.status(200).json({
      success: true,
      message: `Transfer Order '${transfer.transferNumber}' approved successfully. Inventory reserved at source.`,
      data: transfer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Dispatch transfer order & decrement stock from source warehouse
// @route   POST /api/admin/stock-transfers/:id/dispatch
// @access  Private (Super Admin / Admin)
exports.dispatchTransferOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      courierPartner = 'BlueDart Surface Logistics',
      trackingNumber = `AWB-${Date.now().toString().slice(-6)}`,
      vehicleNumber = 'DL-01-AB-1234',
      driverName = 'Vikram Singh',
      driverPhone = '+91 98765 00000',
      estimatedArrival,
      dispatchedItems = [],
    } = req.body;

    const transfer = await StockTransferOrder.findOne({
      $or: [{ transferNumber: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    });

    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Transfer order not found.' });
    }

    if (transfer.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: `Only APPROVED transfer orders can be dispatched (current status: ${transfer.status}).`,
      });
    }

    let totalDispatched = 0;

    // Process each item and decrement reserved stock
    for (const item of transfer.items) {
      const match = dispatchedItems.find((d) => d.product?.toString() === item.product.toString());
      const dispatchQty = match ? Number(match.quantity) : item.requestedQuantity;
      item.dispatchedQuantity = dispatchQty;
      totalDispatched += dispatchQty;

      const inv = await WarehouseInventory.findOne({
        warehouse: transfer.sourceWarehouse,
        product: item.product,
      });

      if (inv) {
        inv.reservedStock = Math.max(0, (inv.reservedStock || 0) - dispatchQty);
        inv.auditLog.push({
          action: 'TRANSFER_OUT',
          quantityDelta: -dispatchQty,
          balanceAfter: inv.availableStock,
          reason: `Dispatched in transfer ${transfer.transferNumber} via ${courierPartner}`,
          performedBy: req.user?.email || 'LOGISTICS_DISPATCH',
          timestamp: new Date(),
        });
        await inv.save();
      }
    }

    transfer.totalUnitsDispatched = totalDispatched;
    transfer.status = 'IN_TRANSIT';
    transfer.transitDetails = {
      courierPartner,
      trackingNumber,
      vehicleNumber,
      driverName,
      driverPhone,
      dispatchedAt: new Date(),
      estimatedArrival: estimatedArrival ? new Date(estimatedArrival) : new Date(Date.now() + 48 * 3600000),
      dispatchedBy: req.user ? `${req.user.name} (${req.user.email})` : 'SUPER_ADMIN',
    };

    transfer.activityTimeline.push({
      status: 'IN_TRANSIT',
      note: `Shipment handed over to ${courierPartner} (Tracking: ${trackingNumber}, Vehicle: ${vehicleNumber}). ${totalDispatched} units in transit.`,
      performedBy: req.user ? `${req.user.name} (${req.user.email})` : 'SUPER_ADMIN',
      timestamp: new Date(),
    });

    await transfer.save();

    res.status(200).json({
      success: true,
      message: `Transfer Order '${transfer.transferNumber}' dispatched! Status updated to IN_TRANSIT.`,
      data: transfer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Receive transfer shipment at destination warehouse & increment inventory
// @route   POST /api/admin/stock-transfers/:id/receive
// @access  Private (Super Admin / Admin)
exports.receiveTransferOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { receivedItems = [], remarks = '' } = req.body;

    const transfer = await StockTransferOrder.findOne({
      $or: [{ transferNumber: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    });

    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Transfer order not found.' });
    }

    if (transfer.status !== 'IN_TRANSIT' && transfer.status !== 'DISPATCHED' && transfer.status !== 'PARTIALLY_RECEIVED') {
      return res.status(400).json({
        success: false,
        message: `Cannot receive transfer with current status '${transfer.status}'. Must be IN_TRANSIT.`,
      });
    }

    let totalReceived = 0;

    for (const item of transfer.items) {
      const match = receivedItems.find((r) => r.product?.toString() === item.product.toString());
      const recQty = match !== undefined ? Number(match.receivedQuantity) : item.dispatchedQuantity;
      const damQty = match !== undefined ? Number(match.damagedQuantity || 0) : 0;

      item.receivedQuantity = recQty;
      item.damagedQuantity = damQty;
      totalReceived += recQty;

      // Increment available stock at destination warehouse
      let destInv = await WarehouseInventory.findOne({
        warehouse: transfer.destinationWarehouse,
        product: item.product,
      });

      if (!destInv) {
        destInv = new WarehouseInventory({
          warehouse: transfer.destinationWarehouse,
          product: item.product,
          sku: item.sku,
          title: item.title,
          availableStock: 0,
          reservedStock: 0,
          auditLog: [],
        });
      }

      destInv.availableStock = (destInv.availableStock || 0) + recQty;
      destInv.lastRestockedAt = new Date();
      destInv.auditLog.push({
        action: 'TRANSFER_IN',
        quantityDelta: recQty,
        balanceAfter: destInv.availableStock,
        reason: `Received from inter-warehouse transfer ${transfer.transferNumber}${damQty > 0 ? ` (${damQty} units damaged in transit)` : ''}`,
        performedBy: req.user?.email || 'DESTINATION_RECEIVER',
        timestamp: new Date(),
      });

      await destInv.save();
    }

    transfer.totalUnitsReceived = totalReceived;
    transfer.transitDetails.receivedAt = new Date();
    transfer.transitDetails.receivedBy = req.user ? `${req.user.name} (${req.user.email})` : 'SUPER_ADMIN';

    const isFullyReceived = totalReceived >= transfer.totalUnitsDispatched;
    transfer.status = isFullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';

    transfer.activityTimeline.push({
      status: transfer.status,
      note: `Shipment received at destination hub. ${totalReceived} units accepted into active inventory.${remarks ? ` Notes: ${remarks}` : ''}`,
      performedBy: req.user ? `${req.user.name} (${req.user.email})` : 'SUPER_ADMIN',
      timestamp: new Date(),
    });

    await transfer.save();

    res.status(200).json({
      success: true,
      message: `Transfer Order '${transfer.transferNumber}' received successfully! Added ${totalReceived} units to destination stock.`,
      data: transfer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel transfer order & release reserved stock if applicable
// @route   POST /api/admin/stock-transfers/:id/cancel
// @access  Private (Super Admin / Admin)
exports.cancelTransferOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'Cancelled by administrator' } = req.body;

    const transfer = await StockTransferOrder.findOne({
      $or: [{ transferNumber: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    });

    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Transfer order not found.' });
    }

    if (transfer.status === 'IN_TRANSIT' || transfer.status === 'RECEIVED') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel transfer order in status '${transfer.status}'.`,
      });
    }

    // If it was APPROVED, release the reserved stock back to available stock
    if (transfer.status === 'APPROVED') {
      for (const item of transfer.items) {
        const inv = await WarehouseInventory.findOne({
          warehouse: transfer.sourceWarehouse,
          product: item.product,
        });

        if (inv) {
          inv.reservedStock = Math.max(0, (inv.reservedStock || 0) - item.requestedQuantity);
          inv.availableStock = (inv.availableStock || 0) + item.requestedQuantity;
          inv.auditLog.push({
            action: 'ORDER_CANCELLATION',
            quantityDelta: item.requestedQuantity,
            balanceAfter: inv.availableStock,
            reason: `Released reserved stock upon STO cancellation (${transfer.transferNumber})`,
            performedBy: req.user?.email || 'SUPER_ADMIN',
            timestamp: new Date(),
          });
          await inv.save();
        }
      }
    }

    transfer.status = 'CANCELLED';
    transfer.activityTimeline.push({
      status: 'CANCELLED',
      note: `Transfer cancelled. Reason: ${reason}`,
      performedBy: req.user ? `${req.user.name} (${req.user.email})` : 'SUPER_ADMIN',
      timestamp: new Date(),
    });

    await transfer.save();

    res.status(200).json({
      success: true,
      message: `Transfer Order '${transfer.transferNumber}' cancelled successfully.`,
      data: transfer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Inter-Warehouse Transfer Analytics & Fleet Metrics
// @route   GET /api/admin/stock-transfers/analytics
// @access  Private (Super Admin / Admin)
exports.getTransferAnalytics = async (req, res, next) => {
  try {
    const transfers = await StockTransferOrder.find().lean();

    const totalTransfers = transfers.length;
    const inTransit = transfers.filter((t) => t.status === 'IN_TRANSIT').length;
    const pendingApproval = transfers.filter((t) => t.status === 'REQUESTED').length;
    const completed = transfers.filter((t) => t.status === 'RECEIVED').length;

    let unitsInTransit = 0;
    let unitsReceived = 0;
    let unitsDispatched = 0;

    transfers.forEach((t) => {
      if (t.status === 'IN_TRANSIT') {
        unitsInTransit += t.totalUnitsDispatched || 0;
      }
      unitsReceived += t.totalUnitsReceived || 0;
      unitsDispatched += t.totalUnitsDispatched || 0;
    });

    const accuracyRate =
      unitsDispatched > 0 ? Math.round((unitsReceived / unitsDispatched) * 100) : 100;

    res.status(200).json({
      success: true,
      data: {
        totalTransfers,
        inTransit,
        pendingApproval,
        completed,
        unitsInTransit,
        unitsReceived,
        unitsDispatched,
        accuracyRate,
      },
    });
  } catch (error) {
    next(error);
  }
};
