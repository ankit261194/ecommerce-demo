const PincodeZone = require('../models/PincodeZone');

// Heuristic fallback zone resolver for any 6-digit Indian pincode if not explicitly customized
const resolveFallbackZone = (pincode) => {
  const prefix2 = pincode.substring(0, 2);
  const prefix3 = pincode.substring(0, 3);

  // Metro Hubs
  if (['11'].includes(prefix2)) {
    return {
      city: 'Delhi NCR',
      state: 'Delhi',
      zone: 'METRO',
      isDeliverable: true,
      isCodAvailable: true,
      estimatedDays: 1,
      estimatedDeliveryText: 'Next-Day Delivery',
      standardShippingFee: 49,
      expressShippingFee: 99,
      expressAvailable: true,
    };
  }
  if (prefix3 === '400') {
    return {
      city: 'Mumbai',
      state: 'Maharashtra',
      zone: 'METRO',
      isDeliverable: true,
      isCodAvailable: true,
      estimatedDays: 1,
      estimatedDeliveryText: 'Next-Day Delivery',
      standardShippingFee: 49,
      expressShippingFee: 99,
      expressAvailable: true,
    };
  }
  if (prefix3 === '560') {
    return {
      city: 'Bengaluru',
      state: 'Karnataka',
      zone: 'METRO',
      isDeliverable: true,
      isCodAvailable: true,
      estimatedDays: 2,
      estimatedDeliveryText: '2 Business Days',
      standardShippingFee: 49,
      expressShippingFee: 99,
      expressAvailable: true,
    };
  }
  if (prefix3 === '700') {
    return {
      city: 'Kolkata',
      state: 'West Bengal',
      zone: 'METRO',
      isDeliverable: true,
      isCodAvailable: true,
      estimatedDays: 2,
      estimatedDeliveryText: '2 Business Days',
      standardShippingFee: 49,
      expressShippingFee: 99,
      expressAvailable: true,
    };
  }
  if (prefix3 === '600') {
    return {
      city: 'Chennai',
      state: 'Tamil Nadu',
      zone: 'METRO',
      isDeliverable: true,
      isCodAvailable: true,
      estimatedDays: 2,
      estimatedDeliveryText: '2 Business Days',
      standardShippingFee: 49,
      expressShippingFee: 99,
      expressAvailable: true,
    };
  }
  if (prefix3 === '500') {
    return {
      city: 'Hyderabad',
      state: 'Telangana',
      zone: 'METRO',
      isDeliverable: true,
      isCodAvailable: true,
      estimatedDays: 2,
      estimatedDeliveryText: '2 Business Days',
      standardShippingFee: 49,
      expressShippingFee: 99,
      expressAvailable: true,
    };
  }

  // Remote / Difficult terrains (e.g. 19xxxx Jammu & Kashmir, 79xxxx North East, 744xxx Andamans)
  if (['19', '79'].includes(prefix2) || prefix3 === '744') {
    return {
      city: 'Regional Hub',
      state: prefix2 === '19' ? 'Jammu & Kashmir' : prefix2 === '79' ? 'North East Region' : 'Andaman & Nicobar',
      zone: 'REMOTE',
      isDeliverable: true,
      isCodAvailable: false, // Prepaid only in remote/high-risk zones
      estimatedDays: 6,
      estimatedDeliveryText: '5-7 Business Days',
      standardShippingFee: 99,
      expressShippingFee: 199,
      expressAvailable: false,
    };
  }

  // Default Tier-1 / Tier-2
  return {
    city: 'Tier 2 Town',
    state: 'India',
    zone: 'TIER_1',
    isDeliverable: true,
    isCodAvailable: true,
    estimatedDays: 3,
    estimatedDeliveryText: '2-4 Business Days',
    standardShippingFee: 49,
    expressShippingFee: 119,
    expressAvailable: true,
  };
};

/**
 * @desc Public check for 6-digit Pincode Delivery & COD Serviceability
 * @route GET /api/pincodes/check/:pincode or POST /api/pincodes/check
 * @access Public
 */
exports.checkServiceability = async (req, res) => {
  try {
    const rawPincode = req.params.pincode || req.body.pincode || req.query.pincode;

    if (!rawPincode || typeof rawPincode !== 'string' || !/^\d{6}$/.test(rawPincode.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pincode. Please enter a valid 6-digit postal code (e.g., 110001).',
      });
    }

    const pincode = rawPincode.trim();
    let zoneRecord = await PincodeZone.findOne({ pincode });

    if (!zoneRecord) {
      const fallback = resolveFallbackZone(pincode);
      const etaDate = new Date();
      etaDate.setDate(etaDate.getDate() + fallback.estimatedDays);

      return res.status(200).json({
        success: true,
        data: {
          pincode,
          city: fallback.city,
          state: fallback.state,
          district: fallback.city,
          zone: fallback.zone,
          isDeliverable: fallback.isDeliverable,
          isCodAvailable: fallback.isCodAvailable,
          estimatedDays: fallback.estimatedDays,
          estimatedDeliveryText: fallback.estimatedDeliveryText,
          etaDate: etaDate.toISOString().split('T')[0],
          etaFormatted: etaDate.toLocaleDateString('en-IN', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          }),
          standardShippingFee: fallback.standardShippingFee,
          expressShippingFee: fallback.expressShippingFee,
          expressAvailable: fallback.expressAvailable,
          minOrderForFreeShipping: 999,
          isCustomOverride: false,
        },
      });
    }

    if (!zoneRecord.isActive || !zoneRecord.isDeliverable) {
      return res.status(200).json({
        success: true,
        data: {
          pincode,
          city: zoneRecord.city,
          state: zoneRecord.state,
          zone: zoneRecord.zone,
          isDeliverable: false,
          isCodAvailable: false,
          estimatedDays: 0,
          estimatedDeliveryText: 'Service currently unserviceable in this area',
          remarks: zoneRecord.remarks || 'Area temporarily out of delivery coverage',
          isCustomOverride: true,
        },
      });
    }

    const etaInfo = zoneRecord.calculateETA();

    return res.status(200).json({
      success: true,
      data: {
        pincode: zoneRecord.pincode,
        city: zoneRecord.city,
        state: zoneRecord.state,
        district: zoneRecord.district || zoneRecord.city,
        zone: zoneRecord.zone,
        isDeliverable: zoneRecord.isDeliverable,
        isCodAvailable: zoneRecord.isCodAvailable,
        estimatedDays: zoneRecord.estimatedDays,
        estimatedDeliveryText: zoneRecord.estimatedDeliveryText,
        etaDate: etaInfo.etaDate,
        etaFormatted: etaInfo.etaFormatted,
        standardShippingFee: zoneRecord.standardShippingFee,
        expressShippingFee: zoneRecord.expressShippingFee,
        expressAvailable: zoneRecord.expressAvailable,
        minOrderForFreeShipping: zoneRecord.minOrderForFreeShipping || 999,
        remarks: zoneRecord.remarks,
        isCustomOverride: true,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to verify pincode serviceability',
      error: error.message,
    });
  }
};

/**
 * @desc Get all pincodes for Super Admin with search & filter
 * @route GET /api/pincodes
 * @access Private (Super Admin)
 */
exports.getAllPincodes = async (req, res) => {
  try {
    const { search, zone, isDeliverable, isCodAvailable, page = 1, limit = 50 } = req.query;

    const query = {};
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ pincode: searchRegex }, { city: searchRegex }, { state: searchRegex }];
    }
    if (zone) query.zone = zone;
    if (isDeliverable !== undefined) query.isDeliverable = isDeliverable === 'true';
    if (isCodAvailable !== undefined) query.isCodAvailable = isCodAvailable === 'true';

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const [pincodes, total] = await Promise.all([
      PincodeZone.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limitNum),
      PincodeZone.countDocuments(query),
    ]);

    // Summary statistics for dashboard cards
    const stats = await PincodeZone.aggregate([
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          deliverableCount: { $sum: { $cond: ['$isDeliverable', 1, 0] } },
          codCount: { $sum: { $cond: ['$isCodAvailable', 1, 0] } },
          metroCount: { $sum: { $cond: [{ $eq: ['$zone', 'METRO'] }, 1, 0] } },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: pincodes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      stats: stats[0] || { totalCount: total, deliverableCount: 0, codCount: 0, metroCount: 0 },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching pincodes',
      error: error.message,
    });
  }
};

/**
 * @desc Create a new Pincode Serviceability Zone Rule
 * @route POST /api/pincodes
 * @access Private (Super Admin)
 */
exports.createPincode = async (req, res) => {
  try {
    const {
      pincode,
      city,
      state,
      district,
      zone = 'TIER_1',
      isDeliverable = true,
      isCodAvailable = true,
      estimatedDays = 3,
      estimatedDeliveryText,
      standardShippingFee = 49,
      expressShippingFee = 99,
      expressAvailable = true,
      minOrderForFreeShipping = 999,
      remarks,
    } = req.body;

    if (!pincode || !/^\d{6}$/.test(String(pincode).trim())) {
      return res.status(400).json({
        success: false,
        message: 'A valid 6-digit postal pincode is required',
      });
    }

    if (!city || !state) {
      return res.status(400).json({
        success: false,
        message: 'City and State are required fields',
      });
    }

    const existing = await PincodeZone.findOne({ pincode: String(pincode).trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Pincode ${pincode} is already configured. Use update endpoint instead.`,
      });
    }

    const newZone = await PincodeZone.create({
      pincode: String(pincode).trim(),
      city: city.trim(),
      state: state.trim(),
      district: district ? district.trim() : city.trim(),
      zone,
      isDeliverable,
      isCodAvailable,
      estimatedDays,
      estimatedDeliveryText: estimatedDeliveryText || `${estimatedDays} Business Days`,
      standardShippingFee,
      expressShippingFee,
      expressAvailable,
      minOrderForFreeShipping,
      remarks: remarks || '',
    });

    return res.status(201).json({
      success: true,
      message: `Pincode ${pincode} successfully created!`,
      data: newZone,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create pincode zone',
      error: error.message,
    });
  }
};

/**
 * @desc Update an existing Pincode Zone Rule
 * @route PUT /api/pincodes/:id
 * @access Private (Super Admin)
 */
exports.updatePincode = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.pincode && !/^\d{6}$/.test(String(updates.pincode).trim())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pincode format. Must be 6 digits.',
      });
    }

    const updated = await PincodeZone.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Pincode rule not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Pincode ${updated.pincode} updated successfully`,
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update pincode',
      error: error.message,
    });
  }
};

/**
 * @desc Delete a Pincode Rule
 * @route DELETE /api/pincodes/:id
 * @access Private (Super Admin)
 */
exports.deletePincode = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await PincodeZone.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Pincode rule not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Pincode ${deleted.pincode} rule deleted successfully`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete pincode',
      error: error.message,
    });
  }
};

/**
 * @desc Seed default Indian hubs into database
 * @route POST /api/pincodes/seed-defaults
 * @access Private (Super Admin)
 */
exports.seedDefaultPincodes = async (req, res) => {
  try {
    const defaultHubs = [
      {
        pincode: '110001',
        city: 'New Delhi',
        state: 'Delhi',
        district: 'Central Delhi',
        zone: 'METRO',
        isDeliverable: true,
        isCodAvailable: true,
        estimatedDays: 1,
        estimatedDeliveryText: 'Delivery Tomorrow',
        standardShippingFee: 0,
        expressShippingFee: 49,
        expressAvailable: true,
        minOrderForFreeShipping: 499,
        remarks: 'Connaught Place Main Metro Hub',
      },
      {
        pincode: '201301',
        city: 'Noida',
        state: 'Uttar Pradesh',
        district: 'Gautam Buddha Nagar',
        zone: 'METRO',
        isDeliverable: true,
        isCodAvailable: true,
        estimatedDays: 1,
        estimatedDeliveryText: 'Next-Day Delivery',
        standardShippingFee: 40,
        expressShippingFee: 79,
        expressAvailable: true,
        minOrderForFreeShipping: 799,
        remarks: 'NCR East Hub',
      },
      {
        pincode: '122002',
        city: 'Gurugram',
        state: 'Haryana',
        district: 'Gurugram',
        zone: 'METRO',
        isDeliverable: true,
        isCodAvailable: true,
        estimatedDays: 1,
        estimatedDeliveryText: 'Next-Day Delivery',
        standardShippingFee: 40,
        expressShippingFee: 79,
        expressAvailable: true,
        minOrderForFreeShipping: 799,
        remarks: 'Cyber City Hub',
      },
      {
        pincode: '400001',
        city: 'Mumbai',
        state: 'Maharashtra',
        district: 'South Mumbai',
        zone: 'METRO',
        isDeliverable: true,
        isCodAvailable: true,
        estimatedDays: 1,
        estimatedDeliveryText: 'Same/Next Day Express',
        standardShippingFee: 0,
        expressShippingFee: 49,
        expressAvailable: true,
        minOrderForFreeShipping: 499,
        remarks: 'Fort / Nariman Point Hub',
      },
      {
        pincode: '560001',
        city: 'Bengaluru',
        state: 'Karnataka',
        district: 'Bengaluru Urban',
        zone: 'METRO',
        isDeliverable: true,
        isCodAvailable: true,
        estimatedDays: 2,
        estimatedDeliveryText: '1-2 Business Days',
        standardShippingFee: 40,
        expressShippingFee: 89,
        expressAvailable: true,
        minOrderForFreeShipping: 799,
        remarks: 'MG Road Tech Hub',
      },
      {
        pincode: '700001',
        city: 'Kolkata',
        state: 'West Bengal',
        district: 'Kolkata',
        zone: 'METRO',
        isDeliverable: true,
        isCodAvailable: true,
        estimatedDays: 2,
        estimatedDeliveryText: '2 Business Days',
        standardShippingFee: 40,
        expressShippingFee: 89,
        expressAvailable: true,
        minOrderForFreeShipping: 799,
        remarks: 'BBD Bagh Hub',
      },
      {
        pincode: '600001',
        city: 'Chennai',
        state: 'Tamil Nadu',
        district: 'Chennai',
        zone: 'METRO',
        isDeliverable: true,
        isCodAvailable: true,
        estimatedDays: 2,
        estimatedDeliveryText: '2 Business Days',
        standardShippingFee: 40,
        expressShippingFee: 89,
        expressAvailable: true,
        minOrderForFreeShipping: 799,
        remarks: 'Parrys Corner Hub',
      },
      {
        pincode: '190001',
        city: 'Srinagar',
        state: 'Jammu & Kashmir',
        district: 'Srinagar',
        zone: 'SPECIAL',
        isDeliverable: true,
        isCodAvailable: false, // High risk / security: Prepaid only
        estimatedDays: 5,
        estimatedDeliveryText: '4-6 Business Days',
        standardShippingFee: 99,
        expressShippingFee: 199,
        expressAvailable: false,
        minOrderForFreeShipping: 1499,
        remarks: 'Prepaid-Only Security Zone',
      },
      {
        pincode: '799001',
        city: 'Agartala',
        state: 'Tripura',
        district: 'West Tripura',
        zone: 'REMOTE',
        isDeliverable: true,
        isCodAvailable: false, // Remote zone: Prepaid only
        estimatedDays: 6,
        estimatedDeliveryText: '5-7 Days Air Cargo',
        standardShippingFee: 120,
        expressShippingFee: 240,
        expressAvailable: false,
        minOrderForFreeShipping: 1999,
        remarks: 'North-East Hill Zone',
      },
      {
        pincode: '999999',
        city: 'Non-Serviceable Outpost',
        state: 'Remote Sector',
        district: 'Unserviced',
        zone: 'REMOTE',
        isDeliverable: false,
        isCodAvailable: false,
        estimatedDays: 0,
        estimatedDeliveryText: 'Unserviceable Area',
        standardShippingFee: 0,
        expressShippingFee: 0,
        expressAvailable: false,
        remarks: 'Strictly Non-Deliverable Area for Testing',
      },
    ];

    let inserted = 0;
    for (const hub of defaultHubs) {
      await PincodeZone.findOneAndUpdate({ pincode: hub.pincode }, hub, { upsert: true, new: true });
      inserted++;
    }

    return res.status(200).json({
      success: true,
      message: `Successfully seeded ${inserted} core delivery zones!`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to seed default pincodes',
      error: error.message,
    });
  }
};
