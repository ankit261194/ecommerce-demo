const DarkStore = require('../models/DarkStore');
const AuditLog = require('../models/AuditLog');

// @desc    Get Active Dark Stores for Storefront & Map Geofence (Point 22)
// @route   GET /api/hyperlocal/dark-stores
exports.getActiveDarkStores = async (req, res, next) => {
  try {
    const darkStores = await DarkStore.find({ isActive: true })
      .select('-allocatedProducts')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: darkStores.length,
      data: darkStores,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Validate Customer GPS Location against Hyperlocal Geofences (Point 22)
// @route   POST /api/hyperlocal/check-boundary
exports.checkGpsBoundary = async (req, res, next) => {
  try {
    const { latitude, longitude, pincode } = req.body;

    if (latitude === undefined || longitude === undefined || isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Valid GPS latitude and longitude numbers are required.',
      });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: 'Latitude must be between -90 and 90, and longitude between -180 and 180.',
      });
    }

    const activeStores = await DarkStore.find({ isActive: true });

    if (!activeStores || activeStores.length === 0) {
      return res.status(200).json({
        success: true,
        isHyperlocal: false,
        message: 'No active hyperlocal dark store hubs found in catalog. Standard courier shipping applies.',
      });
    }

    let matchedHub = null;
    let closestHubDistance = Infinity;

    for (const store of activeStores) {
      const validation = store.validateGps(lat, lng);
      if (validation.isDeliverable) {
        matchedHub = {
          ...validation,
          darkStoreId: store._id,
          address: store.address,
          city: store.city,
          pincode: store.pincode,
          contactPhone: store.contactPhone,
        };
        break; // Match first deliverable polygon / circle
      }

      if (validation.distanceKm < closestHubDistance) {
        closestHubDistance = validation.distanceKm;
      }
    }

    if (matchedHub) {
      return res.status(200).json({
        success: true,
        isHyperlocal: true,
        deliveryType: 'QUICK_COMMERCE_15_MIN',
        matchedHub,
        message: `⚡ ${matchedHub.deliveryPromise?.badgeText || '15-30 Mins Hyperlocal Delivery'} available from ${matchedHub.hubName}!`,
      });
    }

    return res.status(200).json({
      success: true,
      isHyperlocal: false,
      deliveryType: 'STANDARD_COURIER',
      closestHubDistanceKm: closestHubDistance !== Infinity ? closestHubDistance : null,
      message: 'Your delivery location is outside the quick-commerce dark store boundary. Standard express shipping applies.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Get all Dark Store Hubs with Capacity and Inventory (Point 22)
// @route   GET /api/hyperlocal/admin/dark-stores
exports.getAdminDarkStores = async (req, res, next) => {
  try {
    const darkStores = await DarkStore.find()
      .populate('allocatedProducts.product', 'title price mrp stock image')
      .sort({ createdAt: -1 });

    const totalCount = darkStores.length;
    const activeCount = darkStores.filter(d => d.status === 'ACTIVE' || d.status === 'SURGE').length;
    const surgeCount = darkStores.filter(d => d.status === 'SURGE' || d.pricing?.isSurgeActive).length;

    res.status(200).json({
      success: true,
      stats: {
        totalCount,
        activeCount,
        surgeCount,
      },
      data: darkStores,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Create New Dark Store with Polygon Coordinates or Radius (Point 22)
// @route   POST /api/hyperlocal/admin/dark-stores
exports.createDarkStore = async (req, res, next) => {
  try {
    const {
      name,
      hubCode,
      city,
      state,
      address,
      pincode,
      contactPhone,
      managerName,
      status,
      operatingHours,
      geofenceType,
      centerLocation,
      radiusKm,
      polygonCoordinates,
      deliveryPromise,
      pricing,
      capacity,
    } = req.body;

    if (!name || !hubCode || !city || !state || !address || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'Name, hubCode, city, state, address, and pincode are required.',
      });
    }

    if (!centerLocation || centerLocation.latitude === undefined || centerLocation.longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Valid centerLocation latitude and longitude are required.',
      });
    }

    // Check unique hubCode
    const existing = await DarkStore.findOne({ hubCode: hubCode.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Dark Store Hub Code "${hubCode.toUpperCase()}" already exists.`,
      });
    }

    if (geofenceType === 'POLYGON' && (!polygonCoordinates || polygonCoordinates.length < 3)) {
      return res.status(400).json({
        success: false,
        message: 'A polygon geofence requires at least 3 vertex coordinates.',
      });
    }

    const darkStore = await DarkStore.create({
      name: name.trim(),
      hubCode: hubCode.toUpperCase().trim(),
      city: city.trim(),
      state: state.trim(),
      address: address.trim(),
      pincode: pincode.trim(),
      contactPhone: contactPhone || '+919876543210',
      managerName: managerName || 'Warehouse Lead',
      status: status || 'ACTIVE',
      operatingHours: operatingHours || { openTime: '06:00', closeTime: '23:30', isOpen24x7: false },
      geofenceType: geofenceType || 'RADIUS_CIRCLE',
      centerLocation: {
        latitude: Number(centerLocation.latitude),
        longitude: Number(centerLocation.longitude),
      },
      radiusKm: radiusKm !== undefined ? Number(radiusKm) : 5,
      polygonCoordinates: polygonCoordinates || [],
      deliveryPromise: deliveryPromise || { minMinutes: 15, maxMinutes: 30, badgeText: '⚡ 15-30 Mins Hyperlocal Delivery' },
      pricing: pricing || { baseDeliveryFee: 29, freeDeliveryThreshold: 499, isSurgeActive: false, surgeFee: 20 },
      capacity: capacity || { maxOrdersPerHour: 120, currentActiveRiders: 14 },
    });

    await AuditLog.create({
      user: req.user._id,
      action: 'DARK_STORE_CREATED',
      entity: 'DarkStore',
      entityId: darkStore._id,
      details: { hubCode: darkStore.hubCode, name: darkStore.name, geofenceType: darkStore.geofenceType },
      ipAddress: req.ip,
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Dark store hub created successfully.',
      data: darkStore,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Update Dark Store Hub & Geofence Coordinates (Point 22)
// @route   PUT /api/hyperlocal/admin/dark-stores/:id
exports.updateDarkStore = async (req, res, next) => {
  try {
    const { id } = req.params;
    let darkStore = await DarkStore.findById(id);

    if (!darkStore) {
      return res.status(404).json({ success: false, message: 'Dark store not found' });
    }

    const fieldsToUpdate = [
      'name',
      'city',
      'state',
      'address',
      'pincode',
      'contactPhone',
      'managerName',
      'status',
      'operatingHours',
      'geofenceType',
      'centerLocation',
      'radiusKm',
      'polygonCoordinates',
      'deliveryPromise',
      'pricing',
      'capacity',
      'isActive',
    ];

    fieldsToUpdate.forEach((field) => {
      if (req.body[field] !== undefined) {
        darkStore[field] = req.body[field];
      }
    });

    if (req.body.hubCode && req.body.hubCode.toUpperCase().trim() !== darkStore.hubCode) {
      const dup = await DarkStore.findOne({ hubCode: req.body.hubCode.toUpperCase().trim(), _id: { $ne: darkStore._id } });
      if (dup) {
        return res.status(400).json({ success: false, message: 'Hub code already taken by another dark store.' });
      }
      darkStore.hubCode = req.body.hubCode.toUpperCase().trim();
    }

    await darkStore.save();

    await AuditLog.create({
      user: req.user._id,
      action: 'DARK_STORE_UPDATED',
      entity: 'DarkStore',
      entityId: darkStore._id,
      details: { hubCode: darkStore.hubCode, status: darkStore.status },
      ipAddress: req.ip,
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: 'Dark store hub updated successfully.',
      data: darkStore,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Toggle Surge Pricing on Dark Store (Point 22)
// @route   POST /api/hyperlocal/admin/dark-stores/:id/toggle-surge
exports.toggleSurgePricing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isSurgeActive, surgeFee, surgeReason } = req.body;

    const darkStore = await DarkStore.findById(id);
    if (!darkStore) {
      return res.status(404).json({ success: false, message: 'Dark store not found' });
    }

    const currentSurge = darkStore.pricing?.isSurgeActive || darkStore.status === 'SURGE';
    const nextSurge = isSurgeActive !== undefined ? Boolean(isSurgeActive) : !currentSurge;

    darkStore.pricing.isSurgeActive = nextSurge;
    if (surgeFee !== undefined) darkStore.pricing.surgeFee = Number(surgeFee);
    if (surgeReason) darkStore.pricing.surgeReason = surgeReason;

    darkStore.status = nextSurge ? 'SURGE' : 'ACTIVE';
    await darkStore.save();

    await AuditLog.create({
      user: req.user._id,
      action: 'DARK_STORE_SURGE_TOGGLED',
      entity: 'DarkStore',
      entityId: darkStore._id,
      details: { isSurgeActive: nextSurge, surgeFee: darkStore.pricing.surgeFee },
      ipAddress: req.ip,
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: nextSurge ? 'Surge pricing enabled for this geofence zone.' : 'Surge pricing disabled.',
      data: {
        hubId: darkStore._id,
        hubCode: darkStore.hubCode,
        status: darkStore.status,
        pricing: darkStore.pricing,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Delete Dark Store (Point 22)
// @route   DELETE /api/hyperlocal/admin/dark-stores/:id
exports.deleteDarkStore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const darkStore = await DarkStore.findById(id);

    if (!darkStore) {
      return res.status(404).json({ success: false, message: 'Dark store not found' });
    }

    await darkStore.deleteOne();

    await AuditLog.create({
      user: req.user._id,
      action: 'DARK_STORE_DELETED',
      entity: 'DarkStore',
      entityId: id,
      details: { hubCode: darkStore.hubCode, name: darkStore.name },
      ipAddress: req.ip,
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: 'Dark store removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};
