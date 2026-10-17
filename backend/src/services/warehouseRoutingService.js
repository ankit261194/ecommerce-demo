const Warehouse = require('../models/Warehouse');
const WarehouseInventory = require('../models/WarehouseInventory');

// Haversine great-circle distance formula between two GPS coordinates in kilometers
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Approximate geo-coordinates based on Indian 6-digit Pincode zone prefix
function getPincodeCoordinates(pincode) {
  if (!pincode || typeof pincode !== 'string') {
    return { lat: 21.1458, lng: 79.0882, zone: 'CENTRAL', name: 'Nagpur Central Hub' };
  }
  const cleanPin = pincode.trim();
  const prefix2 = cleanPin.substring(0, 2);

  switch (prefix2) {
    case '11':
      return { lat: 28.6139, lng: 77.2090, zone: 'NORTH', name: 'Delhi NCR' };
    case '12':
    case '13':
      return { lat: 30.7333, lng: 76.7794, zone: 'NORTH', name: 'Haryana / Chandigarh' };
    case '14':
    case '15':
    case '16':
      return { lat: 31.6340, lng: 74.8723, zone: 'NORTH', name: 'Punjab' };
    case '17':
    case '18':
    case '19':
      return { lat: 34.0837, lng: 74.7973, zone: 'NORTH', name: 'Himachal / J&K' };
    case '20':
    case '21':
    case '22':
    case '23':
    case '24':
    case '25':
    case '26':
    case '27':
    case '28':
      return { lat: 26.8467, lng: 80.9462, zone: 'NORTH', name: 'Uttar Pradesh / Uttarakhand' };
    case '30':
    case '31':
    case '32':
    case '33':
    case '34':
      return { lat: 26.9124, lng: 75.7873, zone: 'WEST', name: 'Rajasthan' };
    case '36':
    case '37':
    case '38':
    case '39':
      return { lat: 23.0225, lng: 72.5714, zone: 'WEST', name: 'Gujarat' };
    case '40':
    case '41':
    case '42':
    case '43':
    case '44':
      return { lat: 19.0760, lng: 72.8777, zone: 'WEST', name: 'Maharashtra / Mumbai' };
    case '45':
    case '46':
    case '47':
    case '48':
    case '49':
      return { lat: 23.2599, lng: 77.4126, zone: 'CENTRAL', name: 'Madhya Pradesh / Chhattisgarh' };
    case '50':
    case '51':
    case '52':
    case '53':
      return { lat: 17.3850, lng: 78.4867, zone: 'SOUTH', name: 'Telangana / Andhra Pradesh' };
    case '56':
    case '57':
    case '58':
    case '59':
      return { lat: 12.9716, lng: 77.5946, zone: 'SOUTH', name: 'Karnataka / Bengaluru' };
    case '60':
    case '61':
    case '62':
    case '63':
    case '64':
      return { lat: 13.0827, lng: 80.2707, zone: 'SOUTH', name: 'Tamil Nadu / Chennai' };
    case '67':
    case '68':
    case '69':
      return { lat: 8.5241, lng: 76.9366, zone: 'SOUTH', name: 'Kerala' };
    case '70':
    case '71':
    case '72':
    case '73':
    case '74':
      return { lat: 22.5726, lng: 88.3639, zone: 'EAST', name: 'West Bengal / Kolkata' };
    case '75':
    case '76':
    case '77':
      return { lat: 20.2961, lng: 85.8245, zone: 'EAST', name: 'Odisha' };
    case '78':
    case '79':
      return { lat: 26.1445, lng: 91.7362, zone: 'NORTH_EAST', name: 'Assam / North East' };
    case '80':
    case '81':
    case '82':
    case '83':
    case '84':
    case '85':
      return { lat: 25.5941, lng: 85.1376, zone: 'EAST', name: 'Bihar / Jharkhand' };
    default:
      return { lat: 21.1458, lng: 79.0882, zone: 'CENTRAL', name: 'Nagpur Central Hub' };
  }
}

// Calculate Turnaround Time (TAT) and SLA based on transit distance
function calculateTAT(distanceKm) {
  if (distanceKm <= 60) {
    return { estimatedTAT: 'Same-Day / Next-Day', slaHours: 24, speedTier: 'LOCAL_EXPRESS' };
  } else if (distanceKm <= 350) {
    return { estimatedTAT: '1-2 Business Days', slaHours: 48, speedTier: 'REGIONAL_SURFACE' };
  } else if (distanceKm <= 1200) {
    return { estimatedTAT: '2-3 Business Days', slaHours: 72, speedTier: 'ZONAL_SURFACE' };
  } else {
    return { estimatedTAT: '3-5 Business Days', slaHours: 96, speedTier: 'NATIONAL_AIR_SURFACE' };
  }
}

// Estimate dynamic logistics cost based on distance and weight
function estimateShippingCost(distanceKm, totalWeightKg = 1) {
  const baseRate = 35;
  const kmRate = Math.round(distanceKm * 0.05 * Math.max(1, totalWeightKg));
  return Math.min(350, Math.max(49, baseRate + kmRate));
}

/**
 * Intelligent Multi-Warehouse Routing & Stock Allocation Algorithm
 * Evaluates candidate fulfillment centers against customer destination pincode,
 * computes great-circle distance, inspects available inventory across all hubs,
 * and performs single-box vs multi-package split optimization.
 */
async function routeOrderItems({ destinationPincode, coordinates, items = [] }) {
  const startTime = Date.now();

  // 1. Resolve destination coordinates
  let destLat = coordinates?.lat;
  let destLng = coordinates?.lng;
  let resolvedZoneName = '';

  if (!destLat || !destLng) {
    const geo = getPincodeCoordinates(destinationPincode);
    destLat = geo.lat;
    destLng = geo.lng;
    resolvedZoneName = geo.name;
  }

  // 2. Fetch all active fulfillment warehouses
  const warehouses = await Warehouse.find({ status: 'ACTIVE' }).lean();

  if (!warehouses || warehouses.length === 0) {
    return {
      success: false,
      allocated: false,
      message: 'No active fulfillment warehouses available in the network.',
      routingDurationMs: Date.now() - startTime,
    };
  }

  // 3. Compute distance to each warehouse and check explicit pincode serviceability
  const candidateWarehouses = warehouses.map((wh) => {
    const whCoords = wh.address?.location?.coordinates || [77.2090, 28.6139];
    const whLng = whCoords[0];
    const whLat = whCoords[1];

    const rawDistanceKm = haversineDistanceKm(whLat, whLng, destLat, destLng);
    const isExplicitlyServiced = wh.servicedPincodes?.includes(destinationPincode);

    // If warehouse explicitly services this pincode, apply local routing affinity
    const effectiveDistanceKm = isExplicitlyServiced ? Math.min(15, rawDistanceKm) : rawDistanceKm;

    return {
      warehouseId: wh._id.toString(),
      warehouseCode: wh.warehouseCode,
      name: wh.name,
      city: wh.address.city,
      state: wh.address.state,
      pincode: wh.address.pincode,
      rawDistanceKm,
      effectiveDistanceKm,
      isExplicitlyServiced,
      capacity: wh.capacity,
      slaHours: wh.slaHours,
      operatingHours: wh.operatingHours,
      type: wh.type,
    };
  });

  // Sort candidate warehouses by effective distance ascending (closest first)
  candidateWarehouses.sort((a, b) => a.effectiveDistanceKm - b.effectiveDistanceKm);

  // 4. Fetch available inventory for all requested items across candidate warehouses
  const productIds = items.map((i) => i.product || i.productId).filter(Boolean);
  const inventoryRecords = await WarehouseInventory.find({
    warehouse: { $in: candidateWarehouses.map((w) => w.warehouseId) },
    product: { $in: productIds },
  }).lean();

  // Create fast lookup map: `warehouseId:productId` -> availableStock
  const stockMap = new Map();
  for (const inv of inventoryRecords) {
    const key = `${inv.warehouse.toString()}:${inv.product.toString()}`;
    stockMap.set(key, (stockMap.get(key) || 0) + (inv.availableStock || 0));
  }

  // 5. Optimization Pass A: Can any single warehouse fulfill 100% of the cart?
  let singleWarehouseMatch = null;

  for (const candidate of candidateWarehouses) {
    let canFulfillAll = true;
    for (const item of items) {
      const pId = (item.product || item.productId || item._id || '')?.toString();
      if (!pId) continue;
      const key = `${candidate.warehouseId}:${pId}`;
      const stock = stockMap.get(key) || 0;
      if (stock < (item.quantity || 1)) {
        canFulfillAll = false;
        break;
      }
    }

    if (canFulfillAll) {
      singleWarehouseMatch = candidate;
      break; // Found closest single warehouse with complete stock
    }
  }

  if (singleWarehouseMatch) {
    const tat = calculateTAT(singleWarehouseMatch.effectiveDistanceKm);
    const estShippingFee = estimateShippingCost(singleWarehouseMatch.effectiveDistanceKm);

    return {
      success: true,
      allocated: true,
      splitShipment: false,
      routingStrategy: 'SINGLE_WAREHOUSE_OPTIMIZED',
      totalPackages: 1,
      destination: {
        pincode: destinationPincode,
        coordinates: { lat: destLat, lng: destLng },
        zone: resolvedZoneName,
      },
      warehouseAllocations: [
        {
          packageNumber: 1,
          warehouseId: singleWarehouseMatch.warehouseId,
          warehouseCode: singleWarehouseMatch.warehouseCode,
          warehouseName: singleWarehouseMatch.name,
          city: singleWarehouseMatch.city,
          state: singleWarehouseMatch.state,
          distanceKm: singleWarehouseMatch.effectiveDistanceKm,
          estimatedTAT: tat.estimatedTAT,
          slaHours: tat.slaHours,
          speedTier: tat.speedTier,
          estimatedShippingFee: estShippingFee,
          items: items.map((i) => ({
            product: i.product || i.productId,
            sku: i.sku || '',
            title: i.title || 'Product Item',
            quantity: i.quantity,
            allocatedQuantity: i.quantity,
          })),
        },
      ],
      outOfStockShortfalls: [],
      routingDurationMs: Date.now() - startTime,
    };
  }

  // 6. Optimization Pass B: Multi-Warehouse Split Allocation
  // When no single warehouse has all stock, greedily allocate items to closest available hubs
  const warehouseBucketMap = new Map(); // warehouseId -> items[]
  const remainingDemand = items.map((i) => ({
    product: (i.product || i.productId || i._id || '')?.toString(),
    sku: i.sku || '',
    title: i.title || 'Product Item',
    requestedQuantity: i.quantity || 1,
    remainingQuantity: i.quantity || 1,
    allocated: 0,
  }));

  for (const item of remainingDemand) {
    for (const candidate of candidateWarehouses) {
      if (item.remainingQuantity <= 0) break;

      const key = `${candidate.warehouseId}:${item.product}`;
      const available = stockMap.get(key) || 0;

      if (available > 0) {
        const take = Math.min(item.remainingQuantity, available);
        item.remainingQuantity -= take;
        item.allocated += take;
        stockMap.set(key, available - take); // deduct from temporary allocation map

        if (!warehouseBucketMap.has(candidate.warehouseId)) {
          warehouseBucketMap.set(candidate.warehouseId, {
            candidate,
            items: [],
          });
        }

        warehouseBucketMap.get(candidate.warehouseId).items.push({
          product: item.product,
          sku: item.sku,
          title: item.title,
          quantity: take,
          allocatedQuantity: take,
        });
      }
    }
  }

  // Collect any shortfalls
  const outOfStockShortfalls = remainingDemand
    .filter((d) => d.remainingQuantity > 0)
    .map((d) => ({
      product: d.product,
      sku: d.sku,
      title: d.title,
      requested: d.requestedQuantity,
      allocated: d.allocated,
      shortfall: d.remainingQuantity,
    }));

  const warehouseAllocations = [];
  let packageCounter = 1;

  for (const [_, bucket] of warehouseBucketMap.entries()) {
    const tat = calculateTAT(bucket.candidate.effectiveDistanceKm);
    const estShippingFee = estimateShippingCost(bucket.candidate.effectiveDistanceKm);

    warehouseAllocations.push({
      packageNumber: packageCounter++,
      warehouseId: bucket.candidate.warehouseId,
      warehouseCode: bucket.candidate.warehouseCode,
      warehouseName: bucket.candidate.name,
      city: bucket.candidate.city,
      state: bucket.candidate.state,
      distanceKm: bucket.candidate.effectiveDistanceKm,
      estimatedTAT: tat.estimatedTAT,
      slaHours: tat.slaHours,
      speedTier: tat.speedTier,
      estimatedShippingFee: estShippingFee,
      items: bucket.items,
    });
  }

  const isFullyAllocated = outOfStockShortfalls.length === 0;

  return {
    success: true,
    allocated: isFullyAllocated,
    splitShipment: warehouseAllocations.length > 1,
    routingStrategy: warehouseAllocations.length > 1 ? 'MULTI_WAREHOUSE_SPLIT' : 'PARTIAL_WAREHOUSE_ALLOCATED',
    totalPackages: warehouseAllocations.length,
    destination: {
      pincode: destinationPincode,
      coordinates: { lat: destLat, lng: destLng },
      zone: resolvedZoneName,
    },
    warehouseAllocations,
    outOfStockShortfalls,
    routingDurationMs: Date.now() - startTime,
  };
}

/**
 * Adjust stock in a warehouse with an audit log trail
 */
async function adjustWarehouseStock({
  warehouseId,
  productId,
  sku = '',
  quantityDelta,
  reason = 'MANUAL_ADJUSTMENT',
  performedBy = 'SUPER_ADMIN',
}) {
  let inventory = await WarehouseInventory.findOne({
    warehouse: warehouseId,
    product: productId,
    ...(sku ? { sku } : {}),
  });

  if (!inventory) {
    inventory = new WarehouseInventory({
      warehouse: warehouseId,
      product: productId,
      sku,
      availableStock: 0,
      reservedStock: 0,
      auditLog: [],
    });
  }

  const newBalance = Math.max(0, (inventory.availableStock || 0) + quantityDelta);

  inventory.availableStock = newBalance;
  inventory.lastRestockedAt = quantityDelta > 0 ? new Date() : inventory.lastRestockedAt;

  inventory.auditLog.push({
    action: quantityDelta > 0 ? 'RESTOCK' : 'MANUAL_ADJUSTMENT',
    quantityDelta,
    balanceAfter: newBalance,
    reason,
    performedBy,
    timestamp: new Date(),
  });

  await inventory.save();
  return inventory;
}

module.exports = {
  haversineDistanceKm,
  getPincodeCoordinates,
  calculateTAT,
  estimateShippingCost,
  routeOrderItems,
  adjustWarehouseStock,
};
