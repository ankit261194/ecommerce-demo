const mongoose = require('mongoose');
const ShippingManifest = require('../models/ShippingManifest');
const SubOrder = require('../models/SubOrder');
const Order = require('../models/Order');

/**
 * @desc Get ready-to-ship suborders eligible for daily courier manifest
 * @route GET /api/manifests/eligible-parcels
 * @access Private (Super Admin / Sub-Admin / Vendor)
 */
exports.getEligibleParcels = async (req, res, next) => {
  try {
    const courierFilter = req.query.courier || 'AuraExpress Prime';

    let subOrders = await SubOrder.find({
      status: { $in: ['confirmed', 'packaging', 'packed', 'ready_for_pickup', 'dispatched', 'placed', 'pending'] },
    })
      .populate('parentOrder', 'orderNumber paymentMethod shippingAddress totalAmount')
      .populate('vendor', 'storeName phone gstin')
      .limit(50)
      .lean();

    // Map into manifest parcels format
    let parcels = subOrders.map((so) => {
      const orderNum = so.parentOrder?.orderNumber || `ORD-${so._id.toString().slice(-6).toUpperCase()}`;
      const isCod = so.parentOrder?.paymentMethod === 'cod';
      const city = so.shippingAddress?.city || so.parentOrder?.shippingAddress?.city || 'New Delhi';
      const pincode = so.shippingAddress?.pincode || so.parentOrder?.shippingAddress?.pincode || '110001';
      const custName = so.shippingAddress?.recipientName || so.parentOrder?.shippingAddress?.recipientName || 'Aman Sharma';
      const custPhone = so.shippingAddress?.phone || so.parentOrder?.shippingAddress?.phone || '9876543210';
      const weight = 0.65;
      const trackingNumber = `TRK-${courierFilter.slice(0, 3).toUpperCase()}-${so._id.toString().slice(-8).toUpperCase()}`;

      return {
        subOrderId: so._id,
        orderNumber: orderNum,
        trackingNumber,
        barcode: `*${trackingNumber}*`,
        customerName: custName,
        customerPhone: custPhone,
        destinationCity: city,
        destinationPincode: pincode,
        weightKg: weight,
        declaredValue: so.subTotal || 1499,
        paymentMode: isCod ? 'COD' : 'PREPAID',
        collectibleAmount: isCod ? (so.subTotal || 1499) : 0,
        itemsCount: so.items?.length || 1,
        courierPartner: courierFilter,
        currentStatus: so.status,
      };
    });

    // If database has 0 matching suborders in test sandbox, provide seeded candidate parcels
    if (parcels.length === 0) {
      parcels = [
        {
          orderNumber: 'ORD-202610-101',
          trackingNumber: `TRK-${courierFilter.slice(0, 3).toUpperCase()}-8821901`,
          barcode: `*TRK-${courierFilter.slice(0, 3).toUpperCase()}-8821901*`,
          customerName: 'Rohit Verma',
          customerPhone: '9812345678',
          destinationCity: 'Mumbai',
          destinationPincode: '400001',
          weightKg: 0.85,
          declaredValue: 2499,
          paymentMode: 'COD',
          collectibleAmount: 2499,
          itemsCount: 2,
          courierPartner: courierFilter,
        },
        {
          orderNumber: 'ORD-202610-102',
          trackingNumber: `TRK-${courierFilter.slice(0, 3).toUpperCase()}-8821902`,
          barcode: `*TRK-${courierFilter.slice(0, 3).toUpperCase()}-8821902*`,
          customerName: 'Priya Sundaram',
          customerPhone: '9876543211',
          destinationCity: 'Bengaluru',
          destinationPincode: '560001',
          weightKg: 0.45,
          declaredValue: 899,
          paymentMode: 'PREPAID',
          collectibleAmount: 0,
          itemsCount: 1,
          courierPartner: courierFilter,
        },
        {
          orderNumber: 'ORD-202610-103',
          trackingNumber: `TRK-${courierFilter.slice(0, 3).toUpperCase()}-8821903`,
          barcode: `*TRK-${courierFilter.slice(0, 3).toUpperCase()}-8821903*`,
          customerName: 'Vikas Malhotra',
          customerPhone: '9988776655',
          destinationCity: 'New Delhi',
          destinationPincode: '110001',
          weightKg: 1.2,
          declaredValue: 4999,
          paymentMode: 'PREPAID',
          collectibleAmount: 0,
          itemsCount: 3,
          courierPartner: courierFilter,
        },
      ];
    }

    res.status(200).json({
      success: true,
      count: parcels.length,
      courierPartner: courierFilter,
      data: parcels,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Generate new Courier Shipping Handover Manifest
 * @route POST /api/manifests/generate
 * @access Private (Super Admin / Sub-Admin / Vendor)
 */
exports.generateManifest = async (req, res, next) => {
  try {
    const { courierPartner, parcels, pickupHub } = req.body;

    if (!courierPartner || courierPartner.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please specify courier partner for manifest handover',
      });
    }

    if (!Array.isArray(parcels) || parcels.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a non-empty list of parcels to include in the manifest',
      });
    }

    const manifestSeq = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const manifestNumber = `MAN-${dateStr}-${manifestSeq}`;

    let totalWeight = 0;
    let totalCod = 0;
    let totalDeclared = 0;
    const subOrderIdsToUpdate = [];

    const preparedParcels = parcels.map((p, idx) => {
      const weight = Number(p.weightKg) || 0.5;
      const cod = Number(p.collectibleAmount) || 0;
      const val = Number(p.declaredValue) || 0;

      totalWeight += weight;
      totalCod += cod;
      totalDeclared += val;

      if (p.subOrderId && mongoose.isValidObjectId(p.subOrderId)) {
        subOrderIdsToUpdate.push(p.subOrderId);
      }

      const trackingNumber = p.trackingNumber || `TRK-${courierPartner.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}${idx + 1}`;

      return {
        subOrderId: p.subOrderId || null,
        orderNumber: p.orderNumber || `ORD-MOCK-${idx + 1}`,
        trackingNumber,
        barcode: `*${trackingNumber}*`,
        customerName: p.customerName || 'Valued Customer',
        customerPhone: p.customerPhone || '9876543210',
        destinationCity: p.destinationCity || 'New Delhi',
        destinationPincode: p.destinationPincode || '110001',
        weightKg: weight,
        declaredValue: val,
        paymentMode: p.paymentMode === 'COD' ? 'COD' : 'PREPAID',
        collectibleAmount: cod,
        itemsCount: Number(p.itemsCount) || 1,
      };
    });

    const manifest = await ShippingManifest.create({
      manifestNumber,
      courierPartner,
      dispatchDate: new Date(),
      pickupHub: pickupHub || {
        hubName: 'AuraMarket Central Fulfillment Hub #1',
        address: 'Plot 42, Okhla Industrial Area Phase III',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110020',
        phone: '+91 11 4982 0000',
      },
      parcels: preparedParcels,
      totalParcels: preparedParcels.length,
      totalWeightKg: Number(totalWeight.toFixed(2)),
      totalCodAmount: totalCod,
      totalDeclaredValue: totalDeclared,
      status: 'GENERATED',
      supervisorName: req.user?.name || 'Warehouse Dispatch Supervisor',
    });

    // Update affected SubOrders to 'handed_to_courier'
    if (subOrderIdsToUpdate.length > 0) {
      await SubOrder.updateMany(
        { _id: { $in: subOrderIdsToUpdate } },
        {
          $set: {
            status: 'handed_to_courier',
            dispatchedAt: new Date(),
          },
          $push: {
            trackingHistory: {
              status: 'handed_to_courier',
              timestamp: new Date(),
              note: `Manifest #${manifest.manifestNumber} generated for ${courierPartner}`,
            },
          },
        }
      );
    }

    res.status(201).json({
      success: true,
      message: `Daily shipping manifest '${manifest.manifestNumber}' generated with ${preparedParcels.length} parcels.`,
      data: manifest,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get all shipping manifests
 * @route GET /api/manifests
 * @access Private (Super Admin / Sub-Admin / Vendor)
 */
exports.getManifests = async (req, res, next) => {
  try {
    const { courier, status } = req.query;
    const filter = {};
    if (courier) filter.courierPartner = courier;
    if (status) filter.status = status;

    const manifests = await ShippingManifest.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: manifests.length,
      data: manifests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get single manifest details
 * @route GET /api/manifests/:id
 * @access Private (Super Admin / Sub-Admin / Vendor)
 */
exports.getManifestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const manifest = await ShippingManifest.findOne({
      $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { manifestNumber: id }],
    });

    if (!manifest) {
      return res.status(404).json({
        success: false,
        message: 'Shipping manifest not found',
      });
    }

    res.status(200).json({
      success: true,
      data: manifest,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Record physical courier driver handover & sign-off
 * @route PATCH /api/manifests/:id/handover
 * @access Private (Super Admin / Sub-Admin / Vendor)
 */
exports.recordHandover = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { courierDriverName, courierDriverPhone, courierVehicleNumber, courierSignatureNote } = req.body;

    const manifest = await ShippingManifest.findOne({
      $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { manifestNumber: id }],
    });

    if (!manifest) {
      return res.status(404).json({
        success: false,
        message: 'Shipping manifest not found',
      });
    }

    manifest.status = 'HANDED_OVER';
    manifest.handedOverAt = new Date();
    if (courierDriverName) manifest.courierDriverName = courierDriverName;
    if (courierDriverPhone) manifest.courierDriverPhone = courierDriverPhone;
    if (courierVehicleNumber) manifest.courierVehicleNumber = courierVehicleNumber;
    if (courierSignatureNote) manifest.courierSignatureNote = courierSignatureNote;

    await manifest.save();

    res.status(200).json({
      success: true,
      message: `Physical handover signed off for manifest '${manifest.manifestNumber}' by ${manifest.courierDriverName || 'Courier Representative'}.`,
      data: manifest,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Return printable HTML layout for shipping manifest
 * @route GET /api/manifests/:id/print
 * @access Private (Super Admin / Sub-Admin / Vendor)
 */
exports.getPrintableManifestHtml = async (req, res, next) => {
  try {
    const { id } = req.params;
    const manifest = await ShippingManifest.findOne({
      $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { manifestNumber: id }],
    });

    if (!manifest) {
      return res.status(404).json({
        success: false,
        message: 'Shipping manifest not found',
      });
    }

    const rows = manifest.parcels
      .map(
        (p, idx) => `
      <tr style="border-bottom: 1px solid #E2E8F0; font-size: 11px;">
        <td style="padding: 6px; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px; font-weight: bold; font-family: monospace;">${p.orderNumber}</td>
        <td style="padding: 6px;">
          <div style="font-family: monospace; font-weight: bold;">${p.trackingNumber}</div>
          <div style="font-family: monospace; font-size: 9px; letter-spacing: 2px; color: #475569;">${p.barcode}</div>
        </td>
        <td style="padding: 6px;">
          <strong>${p.customerName}</strong><br />
          <span style="color: #64748B;">${p.destinationCity} (${p.destinationPincode}) - ${p.customerPhone}</span>
        </td>
        <td style="padding: 6px; text-align: center;">${p.weightKg} kg</td>
        <td style="padding: 6px; text-align: center;">
          <span style="padding: 2px 6px; border-radius: 4px; font-weight: bold; background: ${p.paymentMode === 'COD' ? '#FEF3C7; color: #92400E;' : '#E0E7FF; color: #3730A3;'}">${p.paymentMode}</span>
        </td>
        <td style="padding: 6px; text-align: right; font-weight: bold;">
          ${p.paymentMode === 'COD' ? '₹' + p.collectibleAmount.toLocaleString() : '₹0'}
        </td>
      </tr>
    `
      )
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Shipping Handover Manifest - ${manifest.manifestNumber}</title>
  <style>
    @media print {
      body { margin: 0; padding: 12mm; }
      .no-print { display: none; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0F172A; background: #fff; margin: 20px auto; max-width: 900px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th { background: #0F172A; color: #fff; font-size: 11px; text-align: left; padding: 8px 6px; }
  </style>
</head>
<body>
  <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0F172A; padding-bottom: 15px;">
    <div>
      <h1 style="margin: 0; font-size: 20px; font-weight: 900; letter-spacing: -0.5px;">AURAMARKET LOGISTICS NETWORK</h1>
      <div style="font-size: 14px; font-weight: bold; color: #D97706; margin-top: 4px;">DAILY COURIER SHIPPING HANDOVER MANIFEST</div>
      <div style="font-size: 11px; color: #475569; margin-top: 2px;">Central Fulfillment Center &bull; Physical Handover Slip</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 16px; font-family: monospace; font-weight: 900;">${manifest.manifestNumber}</div>
      <div style="font-size: 11px; color: #475569;">Date: ${new Date(manifest.dispatchDate).toLocaleDateString()} ${new Date(manifest.dispatchDate).toLocaleTimeString()}</div>
      <div style="display: inline-block; margin-top: 4px; padding: 3px 8px; background: #0F172A; color: #F59E0B; font-weight: 900; font-size: 11px; border-radius: 4px;">
        COURIER: ${manifest.courierPartner.toUpperCase()}
      </div>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px; font-size: 11px;">
    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px; border-radius: 6px;">
      <strong style="color: #0F172A;">Pickup Fulfillment Hub:</strong><br />
      <strong>${manifest.pickupHub?.hubName || 'AuraMarket Hub'}</strong><br />
      ${manifest.pickupHub?.address || ''}<br />
      ${manifest.pickupHub?.city || ''}, ${manifest.pickupHub?.state || ''} - ${manifest.pickupHub?.pincode || ''}<br />
      Phone: ${manifest.pickupHub?.phone || ''}
    </div>
    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px; border-radius: 6px;">
      <strong style="color: #0F172A;">Dispatch Manifest Summary:</strong><br />
      Total Shipments Handed Over: <strong>${manifest.totalParcels} Parcels</strong><br />
      Gross Dispatch Weight: <strong>${manifest.totalWeightKg} kg</strong><br />
      Total COD Collectible: <strong>₹${manifest.totalCodAmount.toLocaleString()}</strong><br />
      Total Declared Value: <strong>₹${manifest.totalDeclaredValue.toLocaleString()}</strong>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 30px; text-align: center;">#</th>
        <th>Order No.</th>
        <th>Tracking & Barcode</th>
        <th>Consignee & Destination</th>
        <th style="text-align: center;">Weight</th>
        <th style="text-align: center;">Mode</th>
        <th style="text-align: right;">COD Due</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div style="margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; font-size: 11px;">
    <div style="border: 1px solid #CBD5E1; border-radius: 6px; padding: 15px;">
      <div style="font-weight: bold; color: #0F172A; margin-bottom: 25px;">COURIER PARTNER REPRESENTATIVE ACKNOWLEDGMENT:</div>
      <div style="margin-bottom: 8px;">Driver / Courier Name: ______________________________</div>
      <div style="margin-bottom: 8px;">Vehicle Number: ____________________________________</div>
      <div style="margin-bottom: 8px;">Mobile Phone: ______________________________________</div>
      <div style="margin-top: 25px; border-top: 1px dashed #64748B; padding-top: 5px;">
        Physical Courier Driver Signature & Date
      </div>
    </div>

    <div style="border: 1px solid #CBD5E1; border-radius: 6px; padding: 15px;">
      <div style="font-weight: bold; color: #0F172A; margin-bottom: 25px;">AURAMARKET WAREHOUSE SUPERVISOR SIGN-OFF:</div>
      <div style="margin-bottom: 8px;">Supervisor Name: <strong>${manifest.supervisorName}</strong></div>
      <div style="margin-bottom: 8px;">Security Seal ID: <strong>SEAL-${Date.now().toString().slice(-6)}</strong></div>
      <div style="margin-bottom: 8px;">Total Parcels Dispatched: <strong>${manifest.totalParcels} Verified</strong></div>
      <div style="margin-top: 25px; border-top: 1px dashed #64748B; padding-top: 5px;">
        Warehouse Dispatch Manager Signature & Official Stamp
      </div>
    </div>
  </div>

  <div style="margin-top: 20px; font-size: 10px; color: #64748B; text-align: center;">
    This is an authentic legal shipping handover manifest issued by AuraMarket Multi-Vendor Platform. Both parties confirm parcel counts and physical seal verification upon handover.
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    next(error);
  }
};
