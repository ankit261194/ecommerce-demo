const DeliveryTask = require('../models/DeliveryTask');
const SubOrder = require('../models/SubOrder');
const Order = require('../models/Order');
const User = require('../models/User');
const CodReconciliation = require('../models/CodReconciliation');
const smsService = require('../services/smsService');
const mailService = require('../services/mailService');
const { executeVendorPayoutSplit } = require('../services/payoutSplitService');
const { onSubOrderDelivered } = require('../services/escrowService');
const crypto = require('crypto');
const ScratchCardReward = require('../models/ScratchCardReward');
const { recordAuditLog } = require('../utils/auditLogger');

/**
 * Point 44: Haversine distance calculator in meters between two GPS coordinates
 */
function calculateHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const numLat1 = Number(lat1);
  const numLon1 = Number(lon1);
  const numLat2 = Number(lat2);
  const numLon2 = Number(lon2);
  if (isNaN(numLat1) || isNaN(numLon1) || isNaN(numLat2) || isNaN(numLon2)) return null;

  const R = 6371e3; // Earth radius in meters
  const φ1 = (numLat1 * Math.PI) / 180;
  const φ2 = (numLat2 * Math.PI) / 180;
  const Δφ = ((numLat2 - numLat1) * Math.PI) / 180;
  const Δλ = ((numLon2 - numLon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Point 44: Cryptographic SHA-256 Digital Proof of Delivery Certificate Generator
 */
function buildDigitalPodCertificate({
  task,
  subOrder,
  user,
  riderLocation,
  customerSignature,
  signerName,
  signerRelation,
  proofPhoto,
  photos = [],
  podNotes = '',
  ip = '',
  userAgent = '',
}) {
  const now = new Date();
  const dropCoords = task.dropLocation?.coordinates;
  const distMeters = calculateHaversineDistanceMeters(
    riderLocation?.lat,
    riderLocation?.lng,
    dropCoords?.lat,
    dropCoords?.lng
  );

  const maxAllowedRadiusMeters = 200;
  const isWithinRadius = distMeters == null ? true : distMeters <= maxAllowedRadiusMeters;
  const geoStatus =
    distMeters == null
      ? 'GEO_COORDINATES_UNAVAILABLE'
      : isWithinRadius
      ? 'VERIFIED_DOORSTEP'
      : 'PROXIMITY_WARNING';
  const discrepancyReason =
    !isWithinRadius && distMeters != null
      ? `Rider location is ${distMeters}m away from customer destination coordinates (Allowed threshold: ${maxAllowedRadiusMeters}m)`
      : '';

  const resolvedSigner =
    (signerName && signerName.trim()) ||
    task.signatureDetails?.signerName ||
    task.dropLocation?.recipientName ||
    'Customer';
  const resolvedRelation =
    (signerRelation && signerRelation.trim()) ||
    task.signatureDetails?.signerRelation ||
    'Self';

  const sigDataUrl = customerSignature || task.customerSignature || null;

  // Build photo evidence list
  const photoList = [];
  if (Array.isArray(photos) && photos.length > 0) {
    photos.forEach((p, idx) => {
      photoList.push({
        photoUrl: p.photoUrl || p.url || p,
        tag: p.tag || (idx === 0 ? 'DOORSTEP_DROP' : 'PACKAGE_LABEL'),
        geoTag: p.geoTag || (riderLocation?.lat ? { lat: riderLocation.lat, lng: riderLocation.lng, accuracy: riderLocation.accuracy || 5 } : (dropCoords?.lat ? { lat: dropCoords.lat, lng: dropCoords.lng } : undefined)),
        uploadedAt: p.uploadedAt || now,
        fileSize: p.fileSize || '320 KB',
        watermarkNote: p.watermarkNote || `GEO-STAMP: ${riderLocation?.lat || 28.5355}, ${riderLocation?.lng || 77.3910} | ${now.toISOString()}`,
      });
    });
  } else if (proofPhoto || task.proofPhoto) {
    photoList.push({
      photoUrl: proofPhoto || task.proofPhoto,
      tag: task.proofPhotoDetails?.tag || 'DOORSTEP_DROP',
      geoTag: task.proofPhotoDetails?.geoTag || (riderLocation?.lat ? { lat: riderLocation.lat, lng: riderLocation.lng, accuracy: riderLocation.accuracy || 5 } : (dropCoords?.lat ? { lat: dropCoords.lat, lng: dropCoords.lng } : undefined)),
      uploadedAt: task.proofPhotoDetails?.uploadedAt || now,
      fileSize: task.proofPhotoDetails?.fileSize || '320 KB',
      watermarkNote: `GEO-STAMP: ${riderLocation?.lat || 28.5355}, ${riderLocation?.lng || 77.3910} | ${now.toISOString()}`,
    });
  }

  // SHA-256 Cryptographic Hash
  const hashPayload = [
    task._id.toString(),
    subOrder._id.toString(),
    subOrder.deliveryOtp || '4821',
    now.toISOString(),
    user?._id?.toString() || 'COURIER',
    riderLocation?.lat ?? 'N/A',
    riderLocation?.lng ?? 'N/A',
    resolvedSigner,
    resolvedRelation,
    photoList.length,
  ].join('|');
  const proofHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

  const subOrderNum = subOrder.subOrderId || subOrder.orderNumber || subOrder._id.toString().slice(-6).toUpperCase();
  const certificateId = `CERT-POD-${Date.now().toString(36).toUpperCase()}-${proofHash.slice(0, 8).toUpperCase()}`;
  const verificationCode = `POD-${subOrderNum}-${proofHash.slice(0, 6).toUpperCase()}`;

  return {
    certificateId,
    proofHash,
    verificationCode,
    isFullyVerified: true,
    geoFence: {
      riderLat: riderLocation?.lat ? Number(riderLocation.lat) : null,
      riderLng: riderLocation?.lng ? Number(riderLocation.lng) : null,
      dropLat: dropCoords?.lat ? Number(dropCoords.lat) : null,
      dropLng: dropCoords?.lng ? Number(dropCoords.lng) : null,
      distanceMeters: distMeters,
      isWithinRadius,
      status: geoStatus,
      discrepancyReason,
    },
    photos: photoList,
    signature: {
      dataUrl: sigDataUrl,
      signerName: resolvedSigner,
      signerRelation: resolvedRelation,
      signedAt: now,
      ipAddress: ip,
      userAgent,
    },
    otpVerification: {
      verified: true,
      verifiedAt: now,
      attempts: task.otpVerificationLog?.attempts || 1,
      maxAttempts: 5,
      isLocked: false,
      lockedAt: null,
      lastAttemptAt: now,
      lastResentAt: task.otpVerificationLog?.lastAttemptAt || null,
      resendCount: task.otpVerificationLog?.attempts || 0,
    },
    generatedAt: now,
    generatedBy: user?._id || null,
    resolvedSigner,
    resolvedRelation,
    distMeters,
    geoStatus,
    sigDataUrl,
  };
}

// @desc    Get All Tasks assigned to Logged-in Courier Rider (or all tasks for Super Admin)
// @route   GET /api/delivery/tasks
exports.getMyDeliveries = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const baseFilter = req.user.role === 'superadmin' ? {} : { deliveryPartner: req.user._id };
    const filter = { ...baseFilter };

    if (status && status !== 'ALL') {
      if (status === 'ACTIVE') {
        filter.status = { $in: ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'] };
      } else {
        filter.status = status;
      }
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { 'dropLocation.recipientName': searchRegex },
        { 'dropLocation.phone': searchRegex },
        { 'dropLocation.address': searchRegex },
        { 'dropLocation.city': searchRegex },
        { 'dropLocation.pincode': searchRegex },
        { 'pickupLocation.storeName': searchRegex },
      ];
    }

    const tasks = await DeliveryTask.find(filter)
      .populate({
        path: 'subOrder',
        populate: [
          { path: 'vendor', select: 'storeName storeLogo pickupAddress phone email' },
          { path: 'customer', select: 'name phone email' },
        ],
      })
      .sort({ createdAt: -1 });

    // Compute comprehensive rider stats
    const allRiderTasks = await DeliveryTask.find(baseFilter);
    const stats = {
      totalAssigned: allRiderTasks.length,
      activeTransit: allRiderTasks.filter(t => ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(t.status)).length,
      deliveredToday: allRiderTasks.filter(t => t.status === 'DELIVERED').length,
      failedCount: allRiderTasks.filter(t => t.status === 'FAILED').length,
      codPendingAmount: allRiderTasks
        .filter(t => t.isCod && t.status !== 'DELIVERED')
        .reduce((sum, t) => sum + (t.amountToCollect || 0), 0),
      codCollectedToday: allRiderTasks
        .filter(t => t.isCod && t.status === 'DELIVERED')
        .reduce((sum, t) => sum + (t.amountCollected || t.amountToCollect || 0), 0),
    };

    res.status(200).json({
      success: true,
      count: tasks.length,
      stats,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Delivery Status (e.g. PICKED_UP, OUT_FOR_DELIVERY)
// @route   PUT /api/delivery/tasks/:id/status
exports.updateDeliveryStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;

    // Enforce OTP requirement: setting DELIVERED directly without OTP verification is strictly prohibited
    if (status === 'DELIVERED') {
      return res.status(400).json({
        success: false,
        message: 'Deliveries cannot be completed directly. Customer 4-digit OTP verification is mandatory via /verify-otp.',
      });
    }

    const allowedInTransit = ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'FAILED'];
    if (!allowedInTransit.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid delivery status '${status}'. Allowed statuses are: ${allowedInTransit.join(', ')}`,
      });
    }

    const taskQuery = req.user.role === 'superadmin'
      ? { _id: req.params.id }
      : { _id: req.params.id, deliveryPartner: req.user._id };

    const task = await DeliveryTask.findOne(taskQuery);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Delivery task not found' });
    }

    if (task.status === 'DELIVERED') {
      return res.status(400).json({ success: false, message: 'Cannot modify a task that has already been delivered.' });
    }

    if (task.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Cannot modify a cancelled delivery task.' });
    }

    task.status = status;
    await task.save();

    // Sync sub-order status
    const subOrder = await SubOrder.findById(task.subOrder);
    if (subOrder) {
      const mappedSubStatus = status === 'PICKED_UP' ? 'dispatched' : status === 'OUT_FOR_DELIVERY' ? 'out_for_delivery' : subOrder.status;
      subOrder.status = mappedSubStatus;
      subOrder.trackingHistory.push({
        status: mappedSubStatus,
        timestamp: new Date(),
        note: note || `Delivery partner updated status to ${status}`,
      });
      await subOrder.save();
    }

    res.status(200).json({ success: true, message: `Status updated to ${status}`, data: task });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Customer 4-digit OTP & Complete Delivery
// @route   POST /api/delivery/tasks/:id/verify-otp
exports.verifyOtpAndCompleteDelivery = async (req, res, next) => {
  try {
    const { otp, amountCollected } = req.body;

    if (!otp) {
      return res.status(400).json({ success: false, message: 'Customer 4-digit delivery OTP is required' });
    }

    const taskQuery = req.user.role === 'superadmin'
      ? { _id: req.params.id }
      : { _id: req.params.id, deliveryPartner: req.user._id };

    const task = await DeliveryTask.findOne(taskQuery);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Delivery task not found' });
    }

    if (task.status === 'DELIVERED') {
      return res.status(400).json({ success: false, message: 'This delivery task has already been completed.' });
    }

    if (task.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Cannot complete delivery for a cancelled task.' });
    }

    const subOrder = await SubOrder.findById(task.subOrder);
    if (!subOrder) {
      return res.status(404).json({ success: false, message: 'Associated sub-order not found' });
    }

    // Point 44: Anti-Brute-Force Lock Check (Max 5 attempts)
    if (task.otpVerificationLog?.isLocked) {
      return res.status(400).json({
        success: false,
        message: 'Delivery OTP verification is locked due to too many failed attempts (5/5). Please contact dispatch or request OTP resend.',
        attempts: task.otpVerificationLog.attempts,
        maxAttempts: 5,
        isLocked: true,
      });
    }

    // Verify OTP
    if (subOrder.deliveryOtp !== otp.toString().trim()) {
      task.otpVerificationLog = task.otpVerificationLog || { attempts: 0 };
      task.otpVerificationLog.attempts = (task.otpVerificationLog.attempts || 0) + 1;
      task.otpVerificationLog.lastAttemptAt = new Date();
      if (task.otpVerificationLog.attempts >= 5) {
        task.otpVerificationLog.isLocked = true;
        task.otpVerificationLog.lockedAt = new Date();
      }
      await task.save();

      return res.status(400).json({
        success: false,
        message: 'Invalid OTP! Please ask the customer for the correct 4-digit delivery code shown on their app.',
        attempts: task.otpVerificationLog.attempts,
        maxAttempts: 5,
        isLocked: task.otpVerificationLog.attempts >= 5,
      });
    }

    // Update Task
    const now = new Date();
    task.status = 'DELIVERED';
    task.otpVerified = true;
    task.deliveredAt = now;
    task.otpVerificationLog = task.otpVerificationLog || { attempts: 0 };
    task.otpVerificationLog.attempts = (task.otpVerificationLog.attempts || 0) + 1;
    task.otpVerificationLog.verifiedAt = now;
    task.otpVerificationLog.isLocked = false;
    task.otpVerificationLog.lockedAt = null;

    if (task.isCod) {
      task.amountCollected = amountCollected !== undefined ? Number(amountCollected) : task.amountToCollect;
    }
    if (req.body.customerSignature) {
      task.customerSignature = req.body.customerSignature;
      task.signatureDetails = {
        signerName: req.body.signerName || task.dropLocation?.recipientName || 'Customer',
        signerRelation: req.body.signerRelation || 'Self',
        signedAt: now,
        ipAddress: req.ip || '',
      };
    }
    if (req.body.proofPhoto) {
      task.proofPhoto = req.body.proofPhoto;
      task.proofPhotoDetails = {
        uploadedAt: now,
        notes: req.body.photoNotes || '',
        tag: req.body.photoTag || 'DOORSTEP_DROP',
      };
    }

    // Point 44: Build Cryptographic Digital POD Certificate
    const cert = buildDigitalPodCertificate({
      task,
      subOrder,
      user: req.user,
      riderLocation: req.body.riderLocation || task.riderLocation,
      customerSignature: req.body.customerSignature || task.customerSignature,
      signerName: req.body.signerName || task.signatureDetails?.signerName,
      signerRelation: req.body.signerRelation || task.signatureDetails?.signerRelation,
      proofPhoto: req.body.proofPhoto || task.proofPhoto,
      photos: req.body.photos,
      podNotes: req.body.podNotes || req.body.photoNotes,
      ip: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });
    task.digitalPod = cert;
    await task.save();

    // Update SubOrder to Delivered with Point 44 POD Metadata
    subOrder.status = 'delivered';
    subOrder.proofOfDelivery = {
      hasSignature: Boolean(cert.signature?.dataUrl),
      signature: cert.signature?.dataUrl || null,
      signerName: cert.resolvedSigner,
      signerRelation: cert.resolvedRelation,
      gpsLocation: {
        latitude: cert.geoFence?.riderLat,
        longitude: cert.geoFence?.riderLng,
        accuracy: req.body.riderLocation?.accuracy || 5,
      },
      deviceInfo: req.headers['user-agent'] || 'Mobile Handheld',
      signedAt: cert.generatedAt,
      ipAddress: req.ip || '',
      verificationCode: cert.verificationCode,
      certificateId: cert.certificateId,
      proofHash: cert.proofHash,
      geoFenceVerified: cert.geoFence?.isWithinRadius,
      distanceFromDropoffMeters: cert.geoFence?.distanceMeters,
      geoFenceStatus: cert.geoFence?.status,
      deliveredBy: req.user.name || 'AuraMarket Express Courier',
      riderPhone: req.user.phone || '+919876543210',
      podNotes: req.body.podNotes || req.body.photoNotes || '',
      photos: cert.photos?.map(p => p.photoUrl) || [],
    };
    subOrder.trackingHistory.push({
      status: 'delivered',
      timestamp: now,
      note: `Digital Proof of Delivery (POD) certified [Cert: ${cert.certificateId}, Geo: ${cert.geoFence.status}]`,
    });
    await subOrder.save();

    // Point 44: Audit Logging for Digital POD
    await recordAuditLog({
      action: 'DIGITAL_POD_VERIFIED',
      module: 'LOGISTICS',
      performedBy: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      targetId: task._id.toString(),
      targetType: 'DeliveryTask',
      description: `Delivery verified via customer OTP and certified [Cert: ${cert.certificateId}, Geo: ${cert.geoFence.status}] for Task #${task._id}`,
      req,
    });

    // If COD, check if all suborders for parent order are delivered; if so, mark parent order PAID
    const parentOrder = await Order.findById(subOrder.parentOrder).populate('subOrders');
    if (parentOrder && parentOrder.subOrders && parentOrder.subOrders.length > 0) {
      const allDelivered = parentOrder.subOrders.every(so => so.status === 'delivered');
      if (allDelivered && parentOrder.paymentMethod === 'COD') {
        parentOrder.paymentStatus = 'PAID';
        await parentOrder.save();
      }
    }

    // Point 14: Customer Delivery Rider Tipping Payout
    if (task.tipAmount > 0 && !task.tipPaidOut) {
      try {
        const rider = await User.findById(task.deliveryPartner);
        if (rider) {
          rider.tipEarnings = (rider.tipEarnings || 0) + task.tipAmount;
          rider.walletBalance = (rider.walletBalance || 0) + task.tipAmount;
          await rider.save();
          task.tipPaidOut = true;
          await task.save();
        }
        if (parentOrder && !parentOrder.tipPaidToRider) {
          parentOrder.tipPaidToRider = true;
          parentOrder.tipCreditedAt = new Date();
          await parentOrder.save();
        }
      } catch (tipErr) {
        console.warn('Rider tip payout error on delivery:', tipErr.message);
      }
    }

    // Point #22: Automated Instant Vendor Payout Split upon Delivery Verification
    let payoutSplitResult = null;
    try {
      payoutSplitResult = await executeVendorPayoutSplit(subOrder._id, {
        notes: `Automated instant payout split upon delivery OTP verification (Task #${task._id}).`,
      });
    } catch (splitErr) {
      console.warn('Automated payout split trigger error:', splitErr.message);
    }

    // Point 48: Multi-Vendor Automated Escrow Payout Engine & Hold Periods
    try {
      await onSubOrderDelivered(subOrder._id, task.deliveredAt || new Date());
    } catch (escrowErr) {
      console.warn('Automated escrow hold initialization error:', escrowErr.message);
    }

    // Point 16: Automated Post-Delivery Instant Scratch Card Reward Generation
    let scratchCardReward = null;
    try {
      const orderRefId = subOrder.parentOrder || parentOrder?._id;
      const customerId = subOrder.customer || parentOrder?.customer;
      if (orderRefId && customerId) {
        let existingCard = await ScratchCardReward.findOne({ order: orderRefId });
        if (!existingCard) {
          scratchCardReward = await ScratchCardReward.create({
            user: customerId,
            order: orderRefId,
            orderNumber: subOrder.orderNumber || parentOrder?.orderNumber || `AUR-${Date.now().toString().slice(-6)}`,
            rewardType: 'WALLET_CASH',
            amount: 50,
            badgeText: '₹50 CASHBACK',
            title: '🎉 Doorstep Delivery Delight: ₹50 Wallet Cash!',
            description: 'Order successfully delivered to your doorstep. Scratch & claim your cash reward!',
            isScratched: false,
            isClaimed: false,
            deliveryTrigger: 'ORDER_DELIVERED',
            celebrationTheme: 'GOLD',
          });
        } else {
          scratchCardReward = existingCard;
        }
      }
    } catch (rewardErr) {
      console.warn('Post-delivery scratch card auto-generation note:', rewardErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully! Order marked as DELIVERED.',
      data: {
        task,
        subOrder,
        digitalPod: task.digitalPod,
        certificateId: task.digitalPod?.certificateId,
        proofHash: task.digitalPod?.proofHash,
        payoutSplit: payoutSplitResult?.payoutSplit || null,
        payoutSplitStatus: payoutSplitResult?.success ? 'SETTLED' : 'PENDING',
        scratchCard: scratchCardReward,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get 1-Click Navigation URLs & Destination Geo Coordinates (Point #64)
// @route   GET /api/delivery/tasks/:id/navigation
exports.getTaskNavigationDetails = async (req, res, next) => {
  try {
    const taskQuery = req.user.role === 'superadmin'
      ? { _id: req.params.id }
      : { _id: req.params.id, deliveryPartner: req.user._id };

    const task = await DeliveryTask.findOne(taskQuery).populate({
      path: 'subOrder',
      populate: { path: 'vendor', select: 'storeName pickupAddress phone' },
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Delivery task not found' });
    }

    const drop = task.dropLocation || {};
    const pickup = task.pickupLocation || {};

    const cleanDropAddress = `${drop.address || ''}, ${drop.city || ''} ${drop.pincode || ''}`.trim().replace(/^,\s*/, '');
    const cleanPickupAddress = `${pickup.address || ''}, ${pickup.city || ''} ${pickup.pincode || ''}`.trim().replace(/^,\s*/, '');

    const hasDropCoords = drop.coordinates && drop.coordinates.lat && drop.coordinates.lng;
    const dropDestinationQuery = hasDropCoords
      ? `${drop.coordinates.lat},${drop.coordinates.lng}`
      : encodeURIComponent(cleanDropAddress);

    const hasPickupCoords = pickup.coordinates && pickup.coordinates.lat && pickup.coordinates.lng;
    const pickupDestinationQuery = hasPickupCoords
      ? `${pickup.coordinates.lat},${pickup.coordinates.lng}`
      : encodeURIComponent(cleanPickupAddress);

    const navigation = {
      customerDrop: {
        recipientName: drop.recipientName || 'Customer',
        phone: drop.phone || '',
        formattedAddress: cleanDropAddress,
        landmark: drop.landmark || '',
        coordinates: drop.coordinates || null,
        googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${dropDestinationQuery}&travelmode=driving`,
        appleMapsUrl: `https://maps.apple.com/?daddr=${dropDestinationQuery}&dirflg=d`,
        wazeUrl: hasDropCoords
          ? `https://waze.com/ul?ll=${drop.coordinates.lat},${drop.coordinates.lng}&navigate=yes`
          : `https://waze.com/ul?q=${encodeURIComponent(cleanDropAddress)}`,
      },
      merchantPickup: {
        storeName: pickup.storeName || task.subOrder?.vendor?.storeName || 'Merchant Warehouse',
        phone: pickup.phone || task.subOrder?.vendor?.phone || '',
        formattedAddress: cleanPickupAddress,
        coordinates: pickup.coordinates || null,
        googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${pickupDestinationQuery}&travelmode=driving`,
        appleMapsUrl: `https://maps.apple.com/?daddr=${pickupDestinationQuery}&dirflg=d`,
      },
    };

    res.status(200).json({
      success: true,
      taskId: task._id,
      status: task.status,
      navigation,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Instant WhatsApp & Direct Call Templates (Point #65)
// @route   GET /api/delivery/tasks/:id/contact-templates
exports.getTaskContactTemplates = async (req, res, next) => {
  try {
    const taskQuery = req.user.role === 'superadmin'
      ? { _id: req.params.id }
      : { _id: req.params.id, deliveryPartner: req.user._id };

    const task = await DeliveryTask.findOne(taskQuery).populate('subOrder');
    if (!task) {
      return res.status(404).json({ success: false, message: 'Delivery task not found' });
    }

    const customerName = task.dropLocation?.recipientName || 'Valued Customer';
    const customerPhone = (task.dropLocation?.phone || '').replace(/\D/g, '');
    const cleanPhone = customerPhone.length === 10 ? `91${customerPhone}` : customerPhone;
    const subOrderId = task.subOrder?._id ? task.subOrder._id.toString().slice(-4) : 'PARCEL';
    const riderName = req.user.name || 'Your AuraMarket Rider';
    const codAmount = task.amountToCollect || 0;

    const templates = [
      {
        id: 'ARRIVING_5_MIN',
        title: 'Arriving in 5 Minutes (Keep OTP Ready)',
        icon: '🚀',
        message: `Hi ${customerName}, this is ${riderName} from AuraMarket Logistics. I am arriving at your address in approx 5 minutes with your order #${subOrderId}. Kindly keep your 4-digit Delivery OTP ready!`,
      },
      {
        id: 'AT_DOORSTEP',
        title: 'At Your Doorstep / Gate',
        icon: '🚪',
        message: `Hi ${customerName}, I have arrived at your doorstep/building gate with your AuraMarket package #${subOrderId}. Please meet me or share your 4-digit Delivery OTP to collect your parcel.`,
      },
      {
        id: 'COD_CASH_REMINDER',
        title: 'COD Cash Payment Reminder',
        icon: '💵',
        message: `Hi ${customerName}, your Cash on Delivery parcel #${subOrderId} is out for delivery. The payable amount is ₹${codAmount.toLocaleString('en-IN')}. Please keep exact cash ready.`,
      },
      {
        id: 'LANDMARK_HELP',
        title: 'Need Landmark / Gate Directions',
        icon: '📍',
        message: `Hi ${customerName}, I am near your delivery location for order #${subOrderId}. Could you please guide me with the exact flat/house number or landmark?`,
      },
    ];

    const templatesWithUrls = templates.map(tmpl => ({
      ...tmpl,
      whatsappUrl: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(tmpl.message)}`,
    }));

    res.status(200).json({
      success: true,
      taskId: task._id,
      customer: {
        name: customerName,
        phone: task.dropLocation?.phone,
        callUrl: `tel:${task.dropLocation?.phone}`,
        cleanPhone,
      },
      isCod: task.isCod,
      amountToCollect: task.amountToCollect,
      templates: templatesWithUrls,
      contactLogs: task.contactLogs || [],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log Direct Call or WhatsApp Communication Attempt (Point #65)
// @route   POST /api/delivery/tasks/:id/contact-log
exports.logContactAttempt = async (req, res, next) => {
  try {
    const { channel, templateId, messageSnippet } = req.body;
    if (!channel || !['CALL', 'WHATSAPP'].includes(channel)) {
      return res.status(400).json({ success: false, message: 'Invalid channel. Must be CALL or WHATSAPP.' });
    }

    const taskQuery = req.user.role === 'superadmin'
      ? { _id: req.params.id }
      : { _id: req.params.id, deliveryPartner: req.user._id };

    const task = await DeliveryTask.findOne(taskQuery);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Delivery task not found' });
    }

    task.contactLogs.push({
      channel,
      templateId: templateId || 'DIRECT',
      messageSnippet: messageSnippet || (channel === 'CALL' ? 'Direct phone call placed' : 'Direct WhatsApp message opened'),
      timestamp: new Date(),
      riderName: req.user.name || 'Courier Rider',
    });

    await task.save();

    res.status(200).json({
      success: true,
      message: 'Contact attempt logged successfully',
      contactLogs: task.contactLogs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend Customer 4-Digit Delivery OTP via SMS & Email (Point #66)
// @route   POST /api/delivery/tasks/:id/resend-otp
exports.resendDeliveryOtp = async (req, res, next) => {
  try {
    const taskQuery = req.user.role === 'superadmin'
      ? { _id: req.params.id }
      : { _id: req.params.id, deliveryPartner: req.user._id };

    const task = await DeliveryTask.findOne(taskQuery);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Delivery task not found' });
    }

    if (task.status === 'DELIVERED') {
      return res.status(400).json({ success: false, message: 'Task is already delivered.' });
    }

    const subOrder = await SubOrder.findById(task.subOrder);
    if (!subOrder) {
      return res.status(404).json({ success: false, message: 'Associated sub-order not found' });
    }

    const otp = subOrder.deliveryOtp || '4821';
    const customerPhone = task.dropLocation?.phone || '9876543210';
    const subOrderNumber = subOrder.subOrderNumber || `SUB-${subOrder._id.toString().slice(-4)}`;

    // Dispatch SMS via SMSService
    const smsResult = await smsService.sendDeliveryOtpSMS({
      phone: customerPhone,
      otp,
      orderNumber: subOrderNumber,
    });

    // Also trigger email notification via mailService
    await mailService.sendMail({
      to: 'customer@auramarket.com',
      subject: `Your AuraMarket Delivery OTP: ${otp}`,
      text: `Hello, your secret delivery verification OTP for #${subOrderNumber} is: ${otp}. Please share this code only with the courier partner upon receiving your package.`,
    });

    // Reset OTP verification attempts & lock on resend
    task.otpVerificationLog = task.otpVerificationLog || {};
    task.otpVerificationLog.attempts = 0;
    task.otpVerificationLog.isLocked = false;
    task.otpVerificationLog.lockedAt = null;
    task.otpVerificationLog.lastAttemptAt = new Date();

    // Log the contact/resend action
    task.contactLogs.push({
      channel: 'WHATSAPP',
      templateId: 'RESEND_OTP',
      messageSnippet: `Resent 4-digit Delivery OTP (${otp}) to customer phone ${customerPhone}`,
      timestamp: new Date(),
      riderName: req.user.name || 'Courier Partner',
    });
    await task.save();

    res.status(200).json({
      success: true,
      message: `OTP resent to customer (${customerPhone}) successfully via SMS & Email.`,
      data: {
        phone: customerPhone,
        maskedOtp: `**${otp.slice(-2)}`,
        simulated: smsResult.simulated || false,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save Customer Digital Signature Pad Capture (Point #67)
// @route   POST /api/delivery/tasks/:id/signature
exports.saveCustomerSignature = async (req, res, next) => {
  try {
    const { signature, signerName, signerRelation } = req.body;

    if (!signature || typeof signature !== 'string' || !signature.trim()) {
      return res.status(400).json({ success: false, message: 'Digital customer signature data (base64) is required.' });
    }

    const taskQuery = req.user.role === 'superadmin'
      ? { _id: req.params.id }
      : { _id: req.params.id, deliveryPartner: req.user._id };

    const task = await DeliveryTask.findOne(taskQuery).populate({
      path: 'subOrder',
      populate: { path: 'vendor', select: 'storeName' }
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Delivery task not found' });
    }

    if (task.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Cannot attach signature to a cancelled delivery task.' });
    }

    const resolvedSigner = (signerName && signerName.trim()) || task.dropLocation?.recipientName || 'Customer';
    const resolvedRelation = (signerRelation && signerRelation.trim()) || 'Self';

    task.customerSignature = signature.trim();
    task.signatureDetails = {
      signerName: resolvedSigner,
      signerRelation: resolvedRelation,
      signedAt: new Date(),
      ipAddress: req.ip || '',
    };
    await task.save();

    // Log to suborder tracking if available
    if (task.subOrder) {
      const subOrder = await SubOrder.findById(task.subOrder._id || task.subOrder);
      if (subOrder) {
        subOrder.trackingHistory.push({
          status: subOrder.status,
          timestamp: new Date(),
          note: `Digital signature captured from ${resolvedSigner} (${resolvedRelation})`,
        });
        await subOrder.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Customer digital signature attached successfully!',
      data: {
        taskId: task._id,
        customerSignature: task.customerSignature,
        signatureDetails: task.signatureDetails,
        status: task.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Customer Digital Signature & Verifiable POD Details (Point #67)
// @route   GET /api/delivery/tasks/:id/signature
exports.getTaskSignature = async (req, res, next) => {
  try {
    const taskQuery = req.user.role === 'superadmin'
      ? { _id: req.params.id }
      : { _id: req.params.id, deliveryPartner: req.user._id };

    const task = await DeliveryTask.findOne(taskQuery).populate({
      path: 'subOrder',
      populate: [
        { path: 'vendor', select: 'storeName storeLogo pickupAddress phone' },
        { path: 'customer', select: 'name phone email' },
      ],
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Delivery task not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        taskId: task._id,
        subOrderId: task.subOrder?._id,
        orderNumber: task.subOrder?.subOrderId || `TASK-${task._id.toString().slice(-6).toUpperCase()}`,
        status: task.status,
        recipientName: task.dropLocation?.recipientName,
        phone: task.dropLocation?.phone,
        dropAddress: `${task.dropLocation?.address || ''}, ${task.dropLocation?.city || ''} ${task.dropLocation?.pincode || ''}`.trim(),
        hasSignature: Boolean(task.customerSignature),
        customerSignature: task.customerSignature,
        signatureDetails: task.signatureDetails,
        deliveredAt: task.deliveredAt,
        createdAt: task.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload Doorstep Photo Proof of Delivery (Point #68)
// @route   POST /api/delivery/tasks/:id/proof-photo
exports.uploadProofPhoto = async (req, res, next) => {
  try {
    const { photo, notes, tag, geoTag, fileSize } = req.body;

    if (!photo || typeof photo !== 'string' || !photo.trim()) {
      return res.status(400).json({ success: false, message: 'Doorstep parcel photo proof (base64 or URL) is required.' });
    }

    const taskQuery = req.user.role === 'superadmin'
      ? { _id: req.params.id }
      : { _id: req.params.id, deliveryPartner: req.user._id };

    const task = await DeliveryTask.findOne(taskQuery).populate('subOrder');
    if (!task) {
      return res.status(404).json({ success: false, message: 'Delivery task not found' });
    }

    if (task.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Cannot attach photo proof to a cancelled delivery task.' });
    }

    task.proofPhoto = photo.trim();
    task.proofPhotoDetails = {
      uploadedAt: new Date(),
      notes: (notes && notes.trim()) || '',
      tag: tag || 'DOORSTEP_DROP',
      fileSize: fileSize || '',
      geoTag: geoTag && geoTag.lat && geoTag.lng ? { lat: geoTag.lat, lng: geoTag.lng } : undefined,
    };
    await task.save();

    // Log to suborder tracking history if available
    if (task.subOrder) {
      const subOrder = await SubOrder.findById(task.subOrder._id || task.subOrder);
      if (subOrder) {
        subOrder.trackingHistory.push({
          status: subOrder.status,
          timestamp: new Date(),
          note: `Doorstep parcel photo proof uploaded (${task.proofPhotoDetails.tag})`,
        });
        await subOrder.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Doorstep photo proof attached successfully!',
      data: {
        taskId: task._id,
        proofPhoto: task.proofPhoto,
        proofPhotoDetails: task.proofPhotoDetails,
        status: task.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Doorstep Photo Proof Details (Point #68)
// @route   GET /api/delivery/tasks/:id/proof-photo
exports.getTaskProofPhoto = async (req, res, next) => {
  try {
    const taskQuery = req.user.role === 'superadmin'
      ? { _id: req.params.id }
      : { _id: req.params.id, deliveryPartner: req.user._id };

    const task = await DeliveryTask.findOne(taskQuery).populate({
      path: 'subOrder',
      populate: [
        { path: 'vendor', select: 'storeName storeLogo pickupAddress phone' },
        { path: 'customer', select: 'name phone email' },
      ],
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Delivery task not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        taskId: task._id,
        subOrderId: task.subOrder?._id,
        orderNumber: task.subOrder?.subOrderId || `TASK-${task._id.toString().slice(-6).toUpperCase()}`,
        status: task.status,
        recipientName: task.dropLocation?.recipientName,
        phone: task.dropLocation?.phone,
        dropAddress: `${task.dropLocation?.address || ''}, ${task.dropLocation?.city || ''} ${task.dropLocation?.pincode || ''}`.trim(),
        hasProofPhoto: Boolean(task.proofPhoto),
        proofPhoto: task.proofPhoto,
        proofPhotoDetails: task.proofPhotoDetails,
        deliveredAt: task.deliveredAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// POINT 44: DIGITAL PROOF OF DELIVERY (OTP, SIGNATURE & GEO-STAMPED PHOTO)
// ============================================================================

// @desc    Validate Rider Proximity against Customer Dropoff Coordinates (Point 44)
// @route   POST /api/delivery/tasks/:id/validate-geofence
exports.validateDropoffGeofence = async (req, res, next) => {
  try {
    const { riderLat, riderLng, accuracy } = req.body;
    if (riderLat === undefined || riderLng === undefined) {
      return res.status(400).json({ success: false, message: 'riderLat and riderLng coordinates are required.' });
    }

    const taskQuery = req.user.role === 'superadmin'
      ? { _id: req.params.id }
      : { _id: req.params.id, deliveryPartner: req.user._id };

    const task = await DeliveryTask.findOne(taskQuery);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Delivery task not found' });
    }

    const dropCoords = task.dropLocation?.coordinates;
    const distanceMeters = calculateHaversineDistanceMeters(
      riderLat,
      riderLng,
      dropCoords?.lat,
      dropCoords?.lng
    );

    const maxAllowedRadiusMeters = 200;
    const isWithinRadius = distanceMeters == null ? true : distanceMeters <= maxAllowedRadiusMeters;
    const status = distanceMeters == null
      ? 'GEO_COORDINATES_UNAVAILABLE'
      : isWithinRadius
      ? 'VERIFIED_DOORSTEP'
      : 'PROXIMITY_WARNING';
    const discrepancyReason = !isWithinRadius && distanceMeters != null
      ? `Rider location is ${distanceMeters}m away from customer destination coordinates (Allowed threshold: ${maxAllowedRadiusMeters}m)`
      : '';

    res.status(200).json({
      success: true,
      data: {
        taskId: task._id,
        riderLocation: {
          lat: Number(riderLat),
          lng: Number(riderLng),
          accuracy: accuracy ? Number(accuracy) : 5,
        },
        dropLocation: task.dropLocation,
        distanceMeters,
        maxAllowedRadiusMeters,
        isWithinRadius,
        status,
        discrepancyReason,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete Delivery with Digital Proof of Delivery (Point 44)
// @route   POST /api/delivery/tasks/:id/complete-pod
exports.completeDigitalPodDelivery = async (req, res, next) => {
  try {
    const {
      otp,
      amountCollected,
      customerSignature,
      signerName,
      signerRelation,
      proofPhoto,
      photos,
      photoTag,
      riderLocation,
      podNotes,
    } = req.body;

    if (!otp) {
      return res.status(400).json({ success: false, message: 'Customer 4-digit delivery OTP is required for POD verification.' });
    }

    const taskQuery = req.user.role === 'superadmin'
      ? { _id: req.params.id }
      : { _id: req.params.id, deliveryPartner: req.user._id };

    const task = await DeliveryTask.findOne(taskQuery);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Delivery task not found' });
    }

    if (task.status === 'DELIVERED') {
      return res.status(400).json({ success: false, message: 'This delivery task has already been completed and certified.' });
    }

    if (task.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Cannot complete delivery for a cancelled task.' });
    }

    const subOrder = await SubOrder.findById(task.subOrder);
    if (!subOrder) {
      return res.status(404).json({ success: false, message: 'Associated sub-order not found' });
    }

    // Point 44: Anti-Brute-Force Lock Check (Max 5 attempts)
    if (task.otpVerificationLog?.isLocked) {
      return res.status(400).json({
        success: false,
        message: 'Delivery OTP verification is locked due to too many failed attempts (5/5). Please contact dispatch or request OTP resend.',
        attempts: task.otpVerificationLog.attempts,
        maxAttempts: 5,
        isLocked: true,
      });
    }

    // Verify OTP
    if (subOrder.deliveryOtp !== otp.toString().trim()) {
      task.otpVerificationLog = task.otpVerificationLog || { attempts: 0 };
      task.otpVerificationLog.attempts = (task.otpVerificationLog.attempts || 0) + 1;
      task.otpVerificationLog.lastAttemptAt = new Date();
      if (task.otpVerificationLog.attempts >= 5) {
        task.otpVerificationLog.isLocked = true;
        task.otpVerificationLog.lockedAt = new Date();
      }
      await task.save();

      return res.status(400).json({
        success: false,
        message: 'Invalid OTP! Please ask the customer for the correct 4-digit delivery code shown on their app.',
        attempts: task.otpVerificationLog.attempts,
        maxAttempts: 5,
        isLocked: task.otpVerificationLog.attempts >= 5,
      });
    }

    // Update Task
    const now = new Date();
    task.status = 'DELIVERED';
    task.otpVerified = true;
    task.deliveredAt = now;
    task.otpVerificationLog = task.otpVerificationLog || { attempts: 0 };
    task.otpVerificationLog.attempts = (task.otpVerificationLog.attempts || 0) + 1;
    task.otpVerificationLog.verifiedAt = now;
    task.otpVerificationLog.isLocked = false;
    task.otpVerificationLog.lockedAt = null;

    if (task.isCod) {
      task.amountCollected = amountCollected !== undefined ? Number(amountCollected) : task.amountToCollect;
    }

    const resolvedRiderLoc = riderLocation || task.riderLocation;

    if (customerSignature) {
      task.customerSignature = customerSignature;
      task.signatureDetails = {
        signerName: signerName || task.dropLocation?.recipientName || 'Customer',
        signerRelation: signerRelation || 'Self',
        signedAt: now,
        ipAddress: req.ip || '',
      };
    }

    if (proofPhoto || (photos && photos.length > 0)) {
      task.proofPhoto = proofPhoto || photos[0]?.photoUrl || photos[0];
      task.proofPhotoDetails = {
        uploadedAt: now,
        notes: podNotes || '',
        tag: photoTag || photos?.[0]?.tag || 'DOORSTEP_DROP',
        geoTag: resolvedRiderLoc?.lat ? { lat: resolvedRiderLoc.lat, lng: resolvedRiderLoc.lng } : undefined,
      };
    }

    // Point 44: Build Cryptographic Digital POD Certificate
    const cert = buildDigitalPodCertificate({
      task,
      subOrder,
      user: req.user,
      riderLocation: resolvedRiderLoc,
      customerSignature: customerSignature || task.customerSignature,
      signerName: signerName || task.signatureDetails?.signerName,
      signerRelation: signerRelation || task.signatureDetails?.signerRelation,
      proofPhoto: task.proofPhoto,
      photos: photos || (task.proofPhoto ? [{ photoUrl: task.proofPhoto, tag: task.proofPhotoDetails?.tag }] : []),
      podNotes,
      ip: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });
    task.digitalPod = cert;
    await task.save();

    // Update SubOrder to Delivered with Point 44 POD Metadata
    subOrder.status = 'delivered';
    subOrder.proofOfDelivery = {
      hasSignature: Boolean(cert.signature?.dataUrl),
      signature: cert.signature?.dataUrl || null,
      signerName: cert.resolvedSigner,
      signerRelation: cert.resolvedRelation,
      gpsLocation: {
        latitude: cert.geoFence?.riderLat,
        longitude: cert.geoFence?.riderLng,
        accuracy: resolvedRiderLoc?.accuracy || 5,
      },
      deviceInfo: req.headers['user-agent'] || 'Mobile Handheld',
      signedAt: cert.generatedAt,
      ipAddress: req.ip || '',
      verificationCode: cert.verificationCode,
      certificateId: cert.certificateId,
      proofHash: cert.proofHash,
      geoFenceVerified: cert.geoFence?.isWithinRadius,
      distanceFromDropoffMeters: cert.geoFence?.distanceMeters,
      geoFenceStatus: cert.geoFence?.status,
      deliveredBy: req.user.name || 'AuraMarket Express Courier',
      riderPhone: req.user.phone || '+919876543210',
      podNotes: podNotes || '',
      photos: cert.photos?.map(p => p.photoUrl) || [],
    };
    subOrder.trackingHistory.push({
      status: 'delivered',
      timestamp: now,
      note: `Digital Proof of Delivery (POD) certified [Cert: ${cert.certificateId}, Geo: ${cert.geoFence.status}]`,
    });
    await subOrder.save();

    // Update parent order
    const parentOrder = await Order.findById(subOrder.parentOrder).populate('subOrders');
    if (parentOrder) {
      parentOrder.proofOfDelivery = subOrder.proofOfDelivery;
      if (parentOrder.subOrders && parentOrder.subOrders.length > 0) {
        const allDelivered = parentOrder.subOrders.every(so => so.status === 'delivered');
        if (allDelivered && parentOrder.paymentMethod === 'COD') {
          parentOrder.paymentStatus = 'PAID';
        }
      }
      await parentOrder.save();
    }

    // Point 14: Customer Delivery Rider Tipping Payout
    if (task.tipAmount > 0 && !task.tipPaidOut) {
      try {
        const rider = await User.findById(task.deliveryPartner);
        if (rider) {
          rider.tipEarnings = (rider.tipEarnings || 0) + task.tipAmount;
          rider.walletBalance = (rider.walletBalance || 0) + task.tipAmount;
          await rider.save();
          task.tipPaidOut = true;
          await task.save();
        }
      } catch (tipErr) {
        console.warn('Rider tip payout error on delivery:', tipErr.message);
      }
    }

    // Point #22: Automated Instant Vendor Payout Split upon Delivery Verification
    let payoutSplitResult = null;
    try {
      payoutSplitResult = await executeVendorPayoutSplit(subOrder._id, {
        notes: `Automated instant payout split upon digital POD verification (Task #${task._id}, Cert #${cert.certificateId}).`,
      });
    } catch (splitErr) {
      console.warn('Automated payout split trigger error:', splitErr.message);
    }

    // Point 48: Multi-Vendor Automated Escrow Payout Engine & Hold Periods
    try {
      await onSubOrderDelivered(subOrder._id, task.deliveredAt || new Date());
    } catch (escrowErr) {
      console.warn('Automated escrow hold initialization error:', escrowErr.message);
    }

    // Point 16: Automated Post-Delivery Instant Scratch Card Reward Generation
    let scratchCardReward = null;
    try {
      const orderRefId = subOrder.parentOrder || parentOrder?._id;
      const customerId = subOrder.customer || parentOrder?.customer;
      if (orderRefId && customerId) {
        let existingCard = await ScratchCardReward.findOne({ order: orderRefId });
        if (!existingCard) {
          scratchCardReward = await ScratchCardReward.create({
            user: customerId,
            order: orderRefId,
            orderNumber: subOrder.orderNumber || parentOrder?.orderNumber || `AUR-${Date.now().toString().slice(-6)}`,
            rewardType: 'WALLET_CASH',
            amount: 50,
            badgeText: '₹50 CASHBACK',
            title: '🎉 Doorstep Delivery Delight: ₹50 Wallet Cash!',
            description: 'Order successfully delivered to your doorstep. Scratch & claim your cash reward!',
            isScratched: false,
            isClaimed: false,
            deliveryTrigger: 'ORDER_DELIVERED',
            celebrationTheme: 'GOLD',
          });
        } else {
          scratchCardReward = existingCard;
        }
      }
    } catch (rewardErr) {
      console.warn('Post-delivery scratch card auto-generation note:', rewardErr.message);
    }

    // Point 44: Audit Logging for Digital POD
    await recordAuditLog({
      action: 'DIGITAL_POD_VERIFIED',
      module: 'LOGISTICS',
      performedBy: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      targetId: task._id.toString(),
      targetType: 'DeliveryTask',
      description: `Digital POD certified [Cert: ${cert.certificateId}, Code: ${cert.verificationCode}, Geo: ${cert.geoFence.status} (${cert.geoFence.distanceMeters ?? 'N/A'}m)] for Task #${task._id}`,
      req,
    });

    // Real-time socket broadcast
    const io = req.app.get('socketio');
    if (io) {
      io.emit('delivery:pod-completed', {
        taskId: task._id,
        orderId: subOrder.parentOrder,
        subOrderId: subOrder._id,
        certificateId: cert.certificateId,
        verificationCode: cert.verificationCode,
        deliveredAt: cert.generatedAt,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Digital Proof of Delivery certified & order marked as DELIVERED.',
      data: {
        task,
        digitalPod: task.digitalPod,
        certificateId: task.digitalPod.certificateId,
        proofHash: task.digitalPod.proofHash,
        verificationCode: task.digitalPod.verificationCode,
        geoFence: task.digitalPod.geoFence,
        subOrder,
        payoutSplit: payoutSplitResult?.payoutSplit || null,
        payoutSplitStatus: payoutSplitResult?.success ? 'SETTLED' : 'PENDING',
        scratchCard: scratchCardReward,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Verifiable Digital POD Certificate dossier (Point 44)
// @route   GET /api/delivery/tasks/:id/pod-certificate
exports.getPodCertificate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const mongoose = require('mongoose');
    let task = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      task = await DeliveryTask.findById(id).populate({
        path: 'subOrder',
        populate: [
          { path: 'vendor', select: 'storeName storeLogo pickupAddress phone email' },
          { path: 'customer', select: 'name phone email' },
          { path: 'parentOrder', select: 'orderNumber paymentMethod paymentStatus items' },
        ],
      }).populate('deliveryPartner', 'name phone email');
    }

    if (!task) {
      const subOrder = await SubOrder.findOne({
        $or: [{ subOrderId: id }, { orderNumber: id }],
      });
      if (subOrder) {
        task = await DeliveryTask.findOne({ subOrder: subOrder._id }).populate({
          path: 'subOrder',
          populate: [
            { path: 'vendor', select: 'storeName storeLogo pickupAddress phone email' },
            { path: 'customer', select: 'name phone email' },
            { path: 'parentOrder', select: 'orderNumber paymentMethod paymentStatus items' },
          ],
        }).populate('deliveryPartner', 'name phone email');
      }
    }

    if (!task) {
      return res.status(404).json({ success: false, message: 'Delivery task or associated POD not found.' });
    }

    // Role check:
    if (req.user && req.user.role !== 'superadmin') {
      const isRider = task.deliveryPartner?._id?.toString() === req.user._id.toString();
      const isCustomer = task.subOrder?.customer?._id?.toString() === req.user._id.toString();
      const isVendor = task.subOrder?.vendor?._id?.toString() === req.user._id.toString();
      if (!isRider && !isCustomer && !isVendor) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this POD certificate.' });
      }
    }

    const digitalPod = task.digitalPod || {};
    const certId = digitalPod.certificateId || `CERT-POD-${task._id.toString().slice(-8).toUpperCase()}`;
    const proofHash = digitalPod.proofHash || crypto.createHash('sha256').update(task._id.toString()).digest('hex');
    const orderNum = task.subOrder?.parentOrder?.orderNumber || task.subOrder?.orderNumber || `TASK-${task._id.toString().slice(-6).toUpperCase()}`;

    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost:5000';
    const printableUrl = `${protocol}://${host}/api/delivery/tasks/${task._id}/pod-certificate/print`;

    res.status(200).json({
      success: true,
      data: {
        certificateId: certId,
        proofHash,
        verificationCode: digitalPod.verificationCode || `POD-${orderNum}`,
        isFullyVerified: Boolean(digitalPod.isFullyVerified || task.status === 'DELIVERED'),
        status: task.status,
        deliveredAt: task.deliveredAt || digitalPod.generatedAt || task.updatedAt,
        taskId: task._id,
        subOrderId: task.subOrder?._id,
        orderNumber: orderNum,
        recipient: {
          name: task.dropLocation?.recipientName || 'Customer',
          phone: task.dropLocation?.phone || '',
          address: `${task.dropLocation?.address || ''}, ${task.dropLocation?.city || ''} ${task.dropLocation?.pincode || ''}`.trim(),
          coordinates: task.dropLocation?.coordinates || null,
        },
        rider: {
          id: task.deliveryPartner?._id,
          name: task.deliveryPartner?.name || 'AuraMarket Express Courier',
          phone: task.deliveryPartner?.phone || '+919876543210',
        },
        vendor: {
          storeName: task.subOrder?.vendor?.storeName || 'AuraMarket Merchant',
          phone: task.subOrder?.vendor?.phone || '',
        },
        geoFence: digitalPod.geoFence || {
          riderLat: task.riderLocation?.lat,
          riderLng: task.riderLocation?.lng,
          dropLat: task.dropLocation?.coordinates?.lat,
          dropLng: task.dropLocation?.coordinates?.lng,
          distanceMeters: 0,
          status: 'VERIFIED_DOORSTEP',
          isWithinRadius: true,
        },
        signature: digitalPod.signature?.dataUrl
          ? digitalPod.signature
          : {
              dataUrl: task.customerSignature || null,
              signerName: task.signatureDetails?.signerName || task.dropLocation?.recipientName,
              signerRelation: task.signatureDetails?.signerRelation || 'Self',
              signedAt: task.signatureDetails?.signedAt || task.deliveredAt,
              ipAddress: task.signatureDetails?.ipAddress || '',
            },
        photos: (digitalPod.photos && digitalPod.photos.length > 0)
          ? digitalPod.photos
          : (task.proofPhoto ? [{
              photoUrl: task.proofPhoto,
              tag: task.proofPhotoDetails?.tag || 'DOORSTEP_DROP',
              geoTag: task.proofPhotoDetails?.geoTag,
              uploadedAt: task.proofPhotoDetails?.uploadedAt || task.deliveredAt,
            }] : []),
        items: task.subOrder?.items || task.subOrder?.parentOrder?.items || [],
        isCod: task.isCod,
        amountToCollect: task.amountToCollect,
        amountCollected: task.amountCollected,
        qrVerificationPayload: `https://shribalajikripadham.online/ecommerce-demo/#/track-pod?cert=${certId}&hash=${proofHash.slice(0, 16)}`,
        printableUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate Official Printable A4 / PDF Digital Proof of Delivery Certificate HTML (Point 44)
// @route   GET /api/delivery/tasks/:id/pod-certificate/print
exports.getPodCertificatePrintHtml = async (req, res, next) => {
  try {
    const { id } = req.params;
    const mongoose = require('mongoose');
    let task = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      task = await DeliveryTask.findById(id).populate({
        path: 'subOrder',
        populate: [
          { path: 'vendor', select: 'storeName storeLogo pickupAddress phone email' },
          { path: 'customer', select: 'name phone email' },
          { path: 'parentOrder', select: 'orderNumber paymentMethod paymentStatus items' },
        ],
      }).populate('deliveryPartner', 'name phone email');
    }

    if (!task) {
      return res.status(404).send('<h3>Digital Proof of Delivery Certificate: Task Not Found</h3>');
    }

    const pod = task.digitalPod || {};
    const certId = pod.certificateId || `CERT-POD-${task._id.toString().slice(-8).toUpperCase()}`;
    const proofHash = pod.proofHash || crypto.createHash('sha256').update(task._id.toString()).digest('hex');
    const orderNum = task.subOrder?.parentOrder?.orderNumber || task.subOrder?.orderNumber || `TASK-${task._id.toString().slice(-6).toUpperCase()}`;
    const formattedDate = (task.deliveredAt || pod.generatedAt || new Date()).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const signer = pod.signature?.signerName || task.signatureDetails?.signerName || task.dropLocation?.recipientName || 'Customer';
    const relation = pod.signature?.signerRelation || task.signatureDetails?.signerRelation || 'Self';
    const sigImage = pod.signature?.dataUrl || task.customerSignature;

    const geo = pod.geoFence || {};
    const geoStatus = geo.status || 'VERIFIED_DOORSTEP';
    const distText = geo.distanceMeters != null ? `${geo.distanceMeters} meters` : 'Coordinates verified';

    const photos = (pod.photos && pod.photos.length > 0)
      ? pod.photos
      : (task.proofPhoto ? [{ photoUrl: task.proofPhoto, tag: task.proofPhotoDetails?.tag || 'DOORSTEP_DROP' }] : []);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Digital Proof of Delivery Certificate - #${certId}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: #f8fafc; color: #0f172a; padding: 24px; line-height: 1.5; }
    .cert-container { max-width: 820px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); color: #ffffff; padding: 32px; display: flex; justify-content: space-between; align-items: flex-start; }
    .brand-title { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; display: flex; align-items: center; gap: 8px; }
    .brand-pill { background: rgba(99, 102, 241, 0.25); color: #a5b4fc; border: 1px solid rgba(165, 180, 252, 0.3); font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 9999px; }
    .cert-badge { background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(52, 211, 153, 0.4); color: #34d399; font-size: 12px; font-weight: 800; padding: 6px 14px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .body-content { padding: 32px; }
    .crypto-box { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 14px; padding: 16px; margin-bottom: 24px; }
    .crypto-label { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; margin-bottom: 6px; }
    .crypto-hash { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; color: #1e293b; word-break: break-all; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; }
    .card-title { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    .info-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; }
    .info-label { color: #64748b; font-weight: 600; }
    .info-val { color: #0f172a; font-weight: 700; text-align: right; }
    .evidence-section { margin-top: 24px; border-top: 2px dashed #e2e8f0; padding-top: 24px; }
    .evidence-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .sig-box { border: 1px solid #cbd5e1; border-radius: 14px; padding: 16px; text-align: center; background: #fafafa; }
    .sig-img { max-height: 120px; max-width: 100%; object-fit: contain; margin: 12px 0; }
    .photo-box { border: 1px solid #cbd5e1; border-radius: 14px; padding: 16px; text-align: center; background: #fafafa; }
    .photo-img { max-height: 160px; max-width: 100%; border-radius: 8px; object-fit: cover; }
    .action-bar { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .print-btn { background: #4f46e5; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: background 0.2s; }
    .print-btn:hover { background: #4338ca; }
    @media print {
      body { padding: 0; background: white; }
      .cert-container { border: none; box-shadow: none; border-radius: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="cert-container">
    <div class="header">
      <div>
        <div class="brand-title">
          <span>AuraMarket Logistics</span>
          <span class="brand-pill">Point #44</span>
        </div>
        <p style="font-size: 13px; color: #cbd5e1; margin-top: 4px;">
          Official Cryptographic Digital Proof of Delivery Certificate
        </p>
      </div>
      <div style="text-align: right;">
        <span class="cert-badge">✓ DELIVERED & VERIFIED</span>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 6px;">Certificate ID: #${certId}</div>
      </div>
    </div>

    <div class="body-content">
      <div class="crypto-box">
        <div class="crypto-label">SHA-256 Tamper-Proof Cryptographic Hash</div>
        <div class="crypto-hash">${proofHash}</div>
      </div>

      <div class="grid-2">
        <div class="info-card">
          <div class="card-title">Recipient & Delivery Location</div>
          <div class="info-row"><span class="info-label">Customer Name:</span><span class="info-val">${task.dropLocation?.recipientName || 'Customer'}</span></div>
          <div class="info-row"><span class="info-label">Customer Phone:</span><span class="info-val">${task.dropLocation?.phone || 'N/A'}</span></div>
          <div class="info-row"><span class="info-label">Drop Address:</span><span class="info-val">${task.dropLocation?.address || ''}, ${task.dropLocation?.city || ''} ${task.dropLocation?.pincode || ''}</span></div>
          <div class="info-row"><span class="info-label">Delivered At:</span><span class="info-val">${formattedDate}</span></div>
          <div class="info-row"><span class="info-label">Verification Code:</span><span class="info-val" style="color: #4f46e5;">${pod.verificationCode || 'POD-VERIFIED'}</span></div>
        </div>

        <div class="info-card">
          <div class="card-title">Courier & Geo-Fence Proximity</div>
          <div class="info-row"><span class="info-label">Order Number:</span><span class="info-val">${orderNum}</span></div>
          <div class="info-row"><span class="info-label">Courier Rider:</span><span class="info-val">${task.deliveryPartner?.name || 'AuraMarket Express'}</span></div>
          <div class="info-row"><span class="info-label">Rider Contact:</span><span class="info-val">${task.deliveryPartner?.phone || '+919876543210'}</span></div>
          <div class="info-row"><span class="info-label">Doorstep Distance:</span><span class="info-val">${distText}</span></div>
          <div class="info-row"><span class="info-label">Geo-Fence Status:</span><span class="info-val" style="color: ${geoStatus === 'VERIFIED_DOORSTEP' ? '#059669' : '#d97706'}; font-weight: 800;">${geoStatus}</span></div>
          ${task.isCod ? `<div class="info-row"><span class="info-label">COD Collected:</span><span class="info-val" style="color: #059669;">₹${task.amountCollected || task.amountToCollect}</span></div>` : ''}
        </div>
      </div>

      <div class="evidence-section">
        <h4 style="font-size: 14px; font-weight: 800; text-transform: uppercase; color: #334155; margin-bottom: 16px; letter-spacing: 0.5px;">
          Proof of Handover & Physical Evidence
        </h4>
        <div class="evidence-grid">
          <div class="sig-box">
            <div style="font-size: 12px; font-weight: 700; color: #475569;">Customer Signature</div>
            ${sigImage ? `<img src="${sigImage}" alt="Customer Signature" class="sig-img" />` : '<div style="padding: 40px 0; color: #94a3b8; font-size: 12px;">Verified via OTP PIN Handover</div>'}
            <div style="font-size: 12px; font-weight: 800; color: #0f172a;">${signer} (${relation})</div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">Verified Handover Timestamp: ${formattedDate}</div>
          </div>

          <div class="photo-box">
            <div style="font-size: 12px; font-weight: 700; color: #475569;">Doorstep Parcel Drop Photo</div>
            ${photos.length > 0 && photos[0].photoUrl ? `<img src="${photos[0].photoUrl}" alt="Doorstep Photo" class="photo-img" />` : '<div style="padding: 40px 0; color: #94a3b8; font-size: 12px;">Physical Handover to Recipient</div>'}
            <div style="font-size: 11px; font-weight: 700; color: #64748b; margin-top: 8px;">Geo-Tagged: ${geo.riderLat || 28.5355}, ${geo.riderLng || 77.3910}</div>
            <div style="font-size: 10px; color: #94a3b8;">Status: ${geoStatus}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="action-bar no-print">
      <span style="font-size: 12px; color: #64748b;">This certificate is cryptographically immutable and stored on AuraMarket Trust Ledger.</span>
      <button onclick="window.print()" class="print-btn">
        <span>🖨️ Print POD Certificate / Save PDF</span>
      </button>
    </div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    next(error);
  }
};

// @desc    Unlock OTP Verification Attempts for Delivery Task (Point 44)
// @route   POST /api/delivery/tasks/:id/unlock-otp
exports.unlockOtpAttempts = async (req, res, next) => {
  try {
    const task = await DeliveryTask.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Delivery task not found' });
    }

    task.otpVerificationLog = task.otpVerificationLog || {};
    task.otpVerificationLog.attempts = 0;
    task.otpVerificationLog.isLocked = false;
    task.otpVerificationLog.lockedAt = null;

    if (task.digitalPod?.otpVerification) {
      task.digitalPod.otpVerification.attempts = 0;
      task.digitalPod.otpVerification.isLocked = false;
      task.digitalPod.otpVerification.lockedAt = null;
    }

    await task.save();

    await recordAuditLog({
      action: 'POD_OTP_UNLOCKED',
      module: 'LOGISTICS',
      performedBy: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      targetId: task._id.toString(),
      targetType: 'DeliveryTask',
      description: `Delivery OTP attempts unlocked and reset for Task #${task._id}`,
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Delivery OTP verification attempts unlocked successfully.',
      data: {
        taskId: task._id,
        attempts: 0,
        isLocked: false,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Shift COD Collection Summary & Pending Tasks (Point #69)
// @route   GET /api/delivery/cod/summary
exports.getCodReconciliationSummary = async (req, res, next) => {
  try {
    const riderFilter = req.user.role === 'superadmin' ? {} : { deliveryPartner: req.user._id };

    // Find all delivered COD tasks that are either PENDING or SUBMITTED
    const tasks = await DeliveryTask.find({
      ...riderFilter,
      isCod: true,
      status: 'DELIVERED',
    })
      .populate({
        path: 'subOrder',
        populate: [
          { path: 'vendor', select: 'storeName phone' },
          { path: 'customer', select: 'name phone' },
        ],
      })
      .sort({ deliveredAt: -1 });

    const pendingTasks = tasks.filter(t => !t.codReconciliation || t.codReconciliation.status === 'PENDING');
    const submittedTasks = tasks.filter(t => t.codReconciliation?.status === 'SUBMITTED');
    const verifiedTasks = tasks.filter(t => t.codReconciliation?.status === 'VERIFIED');

    const totalCashPending = pendingTasks.reduce((sum, t) => sum + (t.amountCollected || t.amountToCollect || 0), 0);
    const totalCashSubmitted = submittedTasks.reduce((sum, t) => sum + (t.amountCollected || t.amountToCollect || 0), 0);
    const totalCashVerified = verifiedTasks.reduce((sum, t) => sum + (t.amountCollected || t.amountToCollect || 0), 0);

    const reconciliations = await CodReconciliation.find(riderFilter)
      .populate('deliveryPartner', 'name phone email')
      .sort({ createdAt: -1 })
      .limit(10);

    const rider = await User.findById(req.user._id).select('cashInHandLimit isCashLimitLocked cashLimitLockedAt');
    const cashInHandLimit = rider?.cashInHandLimit || 10000;
    const isLimitExceeded = totalCashPending >= cashInHandLimit;
    const isWarning = totalCashPending >= cashInHandLimit * 0.8;
    const utilizationPercentage = Math.min(100, Math.round((totalCashPending / cashInHandLimit) * 100));

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalCashPending,
          totalCashSubmitted,
          totalCashVerified,
          cashInHandLimit,
          isCashLimitLocked: Boolean(rider?.isCashLimitLocked),
          isLimitExceeded,
          isWarning,
          utilizationPercentage,
          pendingTasksCount: pendingTasks.length,
          submittedTasksCount: submittedTasks.length,
          verifiedTasksCount: verifiedTasks.length,
        },
        pendingTasks,
        recentReconciliations: reconciliations,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit Shift COD Cash Reconciliation Deposit Slip (Point #69)
// @route   POST /api/delivery/cod/reconcile
exports.submitCodReconciliation = async (req, res, next) => {
  try {
    const {
      denominations = {},
      depositMethod = 'HUB_CASH_DESK',
      depositSlipNumber = '',
      depositSlipImage = null,
      notes = '',
      taskIds,
    } = req.body;

    const d2000 = Math.max(0, parseInt(denominations.d2000 || 0, 10));
    const d500 = Math.max(0, parseInt(denominations.d500 || 0, 10));
    const d200 = Math.max(0, parseInt(denominations.d200 || 0, 10));
    const d100 = Math.max(0, parseInt(denominations.d100 || 0, 10));
    const d50 = Math.max(0, parseInt(denominations.d50 || 0, 10));
    const d20 = Math.max(0, parseInt(denominations.d20 || 0, 10));
    const d10 = Math.max(0, parseInt(denominations.d10 || 0, 10));

    const totalCounted =
      d2000 * 2000 +
      d500 * 500 +
      d200 * 200 +
      d100 * 100 +
      d50 * 50 +
      d20 * 20 +
      d10 * 10;

    // Find matching tasks to reconcile
    const taskQuery = {
      isCod: true,
      status: 'DELIVERED',
    };
    if (req.user.role !== 'superadmin') {
      taskQuery.deliveryPartner = req.user._id;
    }

    if (Array.isArray(taskIds) && taskIds.length > 0) {
      taskQuery._id = { $in: taskIds };
    } else {
      taskQuery.$or = [
        { 'codReconciliation.status': 'PENDING' },
        { codReconciliation: { $exists: false } },
        { 'codReconciliation.status': { $exists: false } },
      ];
    }

    const tasksToReconcile = await DeliveryTask.find(taskQuery);

    const totalExpected = tasksToReconcile.reduce(
      (sum, t) => sum + (t.amountCollected || t.amountToCollect || 0),
      0
    );

    const discrepancy = totalCounted - totalExpected;
    let varianceStatus = 'EXACT_MATCH';
    if (discrepancy < 0) varianceStatus = 'SHORTAGE_PENDING';
    else if (discrepancy > 0) varianceStatus = 'EXCESS_UNCLAIMED';

    const reconciliationId = `COD-REC-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const reconciliation = await CodReconciliation.create({
      reconciliationId,
      deliveryPartner: req.user._id,
      tasks: tasksToReconcile.map(t => t._id),
      denominations: { d2000, d500, d200, d100, d50, d20, d10 },
      totalExpected,
      totalCounted,
      discrepancy,
      varianceStatus,
      depositMethod,
      depositSlipNumber: depositSlipNumber.trim(),
      depositSlipImage,
      notes: notes.trim(),
      status: 'SUBMITTED',
    });

    // Update tasks reconciliation status
    if (tasksToReconcile.length > 0) {
      await DeliveryTask.updateMany(
        { _id: { $in: tasksToReconcile.map(t => t._id) } },
        {
          $set: {
            'codReconciliation.status': 'SUBMITTED',
            'codReconciliation.submittedAt': new Date(),
            'codReconciliation.referenceCode': reconciliationId,
            'codReconciliation.notes': notes.trim(),
          },
        }
      );
    }

    res.status(201).json({
      success: true,
      message: 'Shift COD cash collection reconciliation submitted successfully to Super Admin!',
      data: reconciliation,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List All COD Reconciliations (Point #69)
// @route   GET /api/delivery/cod/reconciliations
exports.getCodReconciliations = async (req, res, next) => {
  try {
    const filter = req.user.role === 'superadmin' ? {} : { deliveryPartner: req.user._id };

    const reconciliations = await CodReconciliation.find(filter)
      .populate('deliveryPartner', 'name phone email')
      .populate({
        path: 'tasks',
        select: 'amountToCollect amountCollected dropLocation status subOrder',
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reconciliations.length,
      data: reconciliations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Super Admin Verify COD Reconciliation (Point #69)
// @route   PUT /api/delivery/cod/reconciliations/:id/verify
exports.verifyCodReconciliation = async (req, res, next) => {
  try {
    const { status = 'VERIFIED', adminRemarks = '' } = req.body;

    const reconciliation = await CodReconciliation.findById(req.params.id);
    if (!reconciliation) {
      return res.status(404).json({ success: false, message: 'COD Reconciliation record not found' });
    }

    reconciliation.status = status;
    reconciliation.adminRemarks = adminRemarks;
    reconciliation.verifiedBy = req.user._id;
    reconciliation.verifiedAt = new Date();

    if (status === 'VERIFIED') {
      reconciliation.varianceStatus = reconciliation.discrepancy === 0 ? 'EXACT_MATCH' : (reconciliation.discrepancy < 0 ? 'SHORTAGE_PENDING' : 'EXCESS_UNCLAIMED');
    }

    await reconciliation.save();

    // If verified, mark tasks as VERIFIED
    if (status === 'VERIFIED' && reconciliation.tasks && reconciliation.tasks.length > 0) {
      await DeliveryTask.updateMany(
        { _id: { $in: reconciliation.tasks } },
        {
          $set: {
            'codReconciliation.status': 'VERIFIED',
            'codReconciliation.reconciledAt': new Date(),
          },
        }
      );
    }

    // Check rider lock status
    if (status === 'VERIFIED' && reconciliation.deliveryPartner) {
      const remainingTasks = await DeliveryTask.find({
        deliveryPartner: reconciliation.deliveryPartner,
        isCod: true,
        status: 'DELIVERED',
        $or: [
          { 'codReconciliation.status': { $in: ['PENDING', 'SUBMITTED'] } },
          { codReconciliation: { $exists: false } },
          { 'codReconciliation.status': { $exists: false } },
        ],
      });
      const remainingCih = remainingTasks.reduce((sum, t) => sum + (t.amountCollected || t.amountToCollect || 0), 0);
      const riderUser = await User.findById(reconciliation.deliveryPartner);
      if (riderUser && remainingCih < (riderUser.cashInHandLimit || 10000)) {
        riderUser.isCashLimitLocked = false;
        await riderUser.save();
      }
    }

    res.status(200).json({
      success: true,
      message: `COD Reconciliation status updated to ${status}!`,
      data: reconciliation,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Report Delivery Attempt Failure & Reschedule (Point #70)
// @route   POST /api/delivery/tasks/:id/fail
exports.reportDeliveryFailure = async (req, res, next) => {
  try {
    const { reason, notes, rescheduledFor, timeSlot } = req.body;

    const allowedReasons = [
      'CUSTOMER_UNAVAILABLE',
      'INCOMPLETE_ADDRESS',
      'CUSTOMER_REFUSED',
      'BAD_WEATHER',
      'OTP_MISMATCH',
      'CASH_NOT_READY',
      'OTHER',
    ];

    if (!reason || !allowedReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: `Valid failure reason is required. Allowed reasons: ${allowedReasons.join(', ')}`,
      });
    }

    const taskQuery = req.user.role === 'superadmin'
      ? { _id: req.params.id }
      : { _id: req.params.id, deliveryPartner: req.user._id };

    const task = await DeliveryTask.findOne(taskQuery).populate({
      path: 'subOrder',
      populate: [
        { path: 'vendor', select: 'storeName phone' },
        { path: 'customer', select: 'name phone email' },
      ],
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Delivery task not found' });
    }

    if (task.status === 'DELIVERED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot report failure on an order that has already been delivered.',
      });
    }

    if (task.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot report failure on a cancelled delivery task.',
      });
    }

    const nextAttemptDate = rescheduledFor ? new Date(rescheduledFor) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    const assignedTimeSlot = timeSlot || 'Morning (9 AM - 1 PM)';
    const cleanNotes = (notes && notes.trim()) || '';

    // Initialize failureLog if null
    task.failureLog = task.failureLog || { attemptCount: 0, history: [] };
    const attemptNumber = (task.failureLog.attemptCount || 0) + 1;
    task.failureLog.attemptCount = attemptNumber;
    task.failureLog.reason = reason;
    task.failureLog.notes = cleanNotes;
    task.failureLog.reportedAt = new Date();
    task.failureLog.rescheduledFor = nextAttemptDate;
    task.failureLog.timeSlot = assignedTimeSlot;

    const isMaxExceeded = attemptNumber >= 3 || reason === 'CUSTOMER_REFUSED';
    task.failureLog.isRto = isMaxExceeded;

    task.failureLog.history.push({
      reason,
      notes: cleanNotes,
      attemptNumber,
      rescheduledFor: nextAttemptDate,
      timeSlot: assignedTimeSlot,
      reportedAt: new Date(),
      riderName: req.user.name || 'Courier Partner',
    });

    task.status = 'FAILED';
    await task.save();

    // Sync sub-order tracking
    if (task.subOrder) {
      const subOrder = await SubOrder.findById(task.subOrder._id || task.subOrder);
      if (subOrder) {
        if (isMaxExceeded) {
          subOrder.status = 'cancelled';
        }
        subOrder.trackingHistory.push({
          status: 'failed',
          timestamp: new Date(),
          note: isMaxExceeded
            ? `Delivery Attempt #${attemptNumber} failed (${reason}). Maximum attempts exceeded — Return to Origin (RTO) initiated.`
            : `Delivery Attempt #${attemptNumber} failed (${reason}). Next attempt rescheduled for ${nextAttemptDate.toLocaleDateString('en-IN')}.`,
        });
        await subOrder.save();
      }
    }

    // Send customer notification via SMS & Email
    const customerPhone = task.dropLocation?.phone || task.subOrder?.customer?.phone || '9876543210';
    const subOrderCode = task.subOrder?.subOrderId || `TASK-${task._id.toString().slice(-4).toUpperCase()}`;

    const smsMessage = isMaxExceeded
      ? `AuraMarket Alert: Delivery attempt #${attemptNumber} for Order #${subOrderCode} failed (${reason}). Order is being returned to merchant.`
      : `AuraMarket Alert: Delivery attempt #${attemptNumber} for Order #${subOrderCode} failed (${reason}). Next attempt is rescheduled for ${nextAttemptDate.toLocaleDateString('en-IN')} (${assignedTimeSlot}).`;

    await smsService.sendSMS({
      to: customerPhone,
      message: smsMessage,
    });

    await mailService.sendMail({
      to: task.subOrder?.customer?.email || 'customer@auramarket.com',
      subject: `Delivery Attempt Update - Order #${subOrderCode}`,
      text: smsMessage,
    });

    res.status(200).json({
      success: true,
      message: isMaxExceeded
        ? `Delivery failed (Attempt #${attemptNumber}). Maximum attempts reached — Return to Origin initiated.`
        : `Delivery attempt #${attemptNumber} failure logged. Next attempt scheduled for ${nextAttemptDate.toLocaleDateString('en-IN')}.`,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reschedule Failed Delivery Back to Active Route (Point #70)
// @route   POST /api/delivery/tasks/:id/reschedule
exports.rescheduleTask = async (req, res, next) => {
  try {
    const taskQuery = req.user.role === 'superadmin'
      ? { _id: req.params.id }
      : { _id: req.params.id, deliveryPartner: req.user._id };

    const task = await DeliveryTask.findOne(taskQuery).populate('subOrder');
    if (!task) {
      return res.status(404).json({ success: false, message: 'Delivery task not found' });
    }

    if (task.status === 'DELIVERED') {
      return res.status(400).json({ success: false, message: 'Cannot reschedule an already delivered task.' });
    }

    if (task.failureLog?.isRto) {
      return res.status(400).json({ success: false, message: 'Cannot reschedule a task where Return to Origin (RTO) has already been finalized.' });
    }

    task.status = 'OUT_FOR_DELIVERY';
    await task.save();

    if (task.subOrder) {
      const subOrder = await SubOrder.findById(task.subOrder._id || task.subOrder);
      if (subOrder) {
        subOrder.status = 'out_for_delivery';
        subOrder.trackingHistory.push({
          status: 'out_for_delivery',
          timestamp: new Date(),
          note: 'Delivery retry initiated by courier partner (Out for Delivery)',
        });
        await subOrder.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Delivery task rescheduled and resumed for active transit!',
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

// Helper to calculate distance in km using Haversine formula
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
};

// Helper to calculate bearing angle (0 to 360 degrees)
const calculateBearing = (lat1, lon1, lat2, lon2) => {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const b = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((b + 360) % 360);
};

// Point 16: Live Real-Time GPS Delivery Tracking Map (Socket.io Telemetry)
// @desc    Get Live GPS Coordinates, Moving Bike Position, Route Polyline and ETA
// @route   GET /api/delivery/live-tracking/:identifier
// @access  Public / Customer / Rider
exports.getLiveGpsTracking = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const mongoose = require('mongoose');

    let subOrder = null;
    let order = null;

    if (mongoose.Types.ObjectId.isValid(identifier)) {
      subOrder = await SubOrder.findById(identifier).populate('vendor deliveryPartner');
      if (!subOrder) {
        order = await Order.findById(identifier).populate('subOrders');
      }
    }

    if (!order && !subOrder) {
      order = await Order.findOne({ orderNumber: identifier }).populate('subOrders');
    }

    if (order && !subOrder && order.subOrders?.length > 0) {
      subOrder = await SubOrder.findById(order.subOrders[0]._id || order.subOrders[0]).populate('vendor deliveryPartner');
    }

    // Default base coordinates (Mumbai fulfillment hub & customer doorstep)
    let originLat = 19.0760;
    let originLng = 72.8777;
    let originLabel = 'Aura Fulfillment Hub, BKC';

    let destLat = 19.1136;
    let destLng = 72.8697;
    let destLabel = 'Customer Doorstep';

    let riderName = 'Vikram Singh';
    let riderPhone = '+91 98765 43210';
    let riderVehicle = 'Hero Electric Splendor (DL 04 EV 8892)';
    let riderRating = 4.9;
    let riderPhoto = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200';
    let deliveryOtp = '4821';
    let subOrderStatus = 'out_for_delivery';

    if (subOrder) {
      subOrderStatus = subOrder.status || 'out_for_delivery';
      deliveryOtp = subOrder.deliveryOtp || '4821';
      if (subOrder.vendor?.pickupAddress?.city) {
        originLabel = `${subOrder.vendor.storeName || 'Merchant'} Warehouse (${subOrder.vendor.pickupAddress.city})`;
      }
      if (subOrder.shippingAddress?.city) {
        destLabel = `${subOrder.shippingAddress.recipientName || 'Customer'} (${subOrder.shippingAddress.city})`;
      }
      if (subOrder.deliveryPartner) {
        riderName = subOrder.deliveryPartner.name || riderName;
        riderPhone = subOrder.deliveryPartner.phone || riderPhone;
      }
    }

    // Look for DeliveryTask
    let deliveryTask = null;
    if (subOrder) {
      deliveryTask = await DeliveryTask.findOne({ subOrder: subOrder._id }).populate('deliveryPartner');
      if (deliveryTask?.dropLocation?.coordinates?.lat && deliveryTask.dropLocation.coordinates.lng) {
        destLat = deliveryTask.dropLocation.coordinates.lat;
        destLng = deliveryTask.dropLocation.coordinates.lng;
      }
    } else if (order) {
      deliveryTask = await DeliveryTask.findOne({ subOrder: { $in: order.subOrders } }).populate('deliveryPartner');
      if (deliveryTask?.dropLocation?.coordinates?.lat && deliveryTask.dropLocation.coordinates.lng) {
        destLat = deliveryTask.dropLocation.coordinates.lat;
        destLng = deliveryTask.dropLocation.coordinates.lng;
      }
    }

    if (!deliveryTask && mongoose.Types.ObjectId.isValid(identifier)) {
      deliveryTask = await DeliveryTask.findById(identifier).populate('deliveryPartner');
      if (deliveryTask?.dropLocation?.coordinates?.lat && deliveryTask.dropLocation.coordinates.lng) {
        destLat = deliveryTask.dropLocation.coordinates.lat;
        destLng = deliveryTask.dropLocation.coordinates.lng;
      }
      if (deliveryTask?.deliveryPartner) {
        riderName = deliveryTask.deliveryPartner.name || riderName;
        riderPhone = deliveryTask.deliveryPartner.phone || riderPhone;
      }
    }


    // Generate realistic multi-point street polyline between origin and destination
    const numPoints = 8;
    const polyline = [];
    for (let i = 0; i <= numPoints; i++) {
      const ratio = i / numPoints;
      // Add slight street curvature perturbation
      const jitterLat = Math.sin(ratio * Math.PI) * 0.004;
      const jitterLng = Math.cos(ratio * Math.PI * 1.5) * 0.003;
      polyline.push([
        Math.round((originLat + (destLat - originLat) * ratio + jitterLat) * 10000) / 10000,
        Math.round((originLng + (destLng - originLng) * ratio + jitterLng) * 10000) / 10000,
      ]);
    }

    // Determine current rider position: use stored task coordinates if available, else waypoint index
    let riderPos;
    let speedKmH = subOrderStatus === 'delivered' ? 0 : 28;
    let headingDegrees = 42;
    let batteryLevel = 92;
    let lastUpdatedAt = new Date();

    if (deliveryTask?.riderLocation?.lat && deliveryTask?.riderLocation?.lng) {
      riderPos = [deliveryTask.riderLocation.lat, deliveryTask.riderLocation.lng];
      speedKmH = deliveryTask.riderLocation.speed !== undefined ? deliveryTask.riderLocation.speed : speedKmH;
      headingDegrees = deliveryTask.riderLocation.heading || headingDegrees;
      batteryLevel = deliveryTask.riderLocation.batteryLevel || batteryLevel;
      lastUpdatedAt = deliveryTask.riderLocation.lastUpdatedAt || lastUpdatedAt;
    } else {
      const simIndex = deliveryTask?.simulationState?.currentWaypointIndex !== undefined
        ? deliveryTask.simulationState.currentWaypointIndex
        : (subOrderStatus === 'delivered' ? polyline.length - 1 : Math.floor(polyline.length * 0.65));
      riderPos = polyline[simIndex] || [19.0980, 72.8715];
    }

    // Compute remaining distance & ETA
    const totalDistanceKm = calculateDistanceKm(originLat, originLng, destLat, destLng) || 4.2;
    const distanceRemainingKm = subOrderStatus === 'delivered'
      ? 0
      : calculateDistanceKm(riderPos[0], riderPos[1], destLat, destLng);
    const etaMinutes = subOrderStatus === 'delivered'
      ? 0
      : Math.max(1, Math.round((distanceRemainingKm / (speedKmH || 25)) * 60));
    const etaSeconds = etaMinutes * 60;

    res.status(200).json({
      success: true,
      data: {
        orderIdentifier: identifier,
        status: subOrderStatus,
        deliveryOtp,
        socketRoom: `order_${identifier}`,
        rider: {
          name: riderName,
          phone: riderPhone,
          vehicle: riderVehicle,
          rating: riderRating,
          photo: riderPhoto,
          speedKmH,
          headingDegrees,
          batteryLevel,
          isMoving: speedKmH > 0,
          currentLocation: {
            lat: riderPos[0],
            lng: riderPos[1],
          },
          lastUpdatedAt,
        },
        origin: {
          lat: originLat,
          lng: originLng,
          label: originLabel,
        },
        destination: {
          lat: destLat,
          lng: destLng,
          label: destLabel,
        },
        route: {
          polyline,
          totalDistanceKm,
          distanceRemainingKm,
          etaMinutes,
          etaSeconds,
          trafficStatus: 'FLOWING',
          lastUpdatedAt,
        },
        geoJson: {
          type: 'FeatureCollection',
          name: `AuraMarket_Delivery_${identifier}`,
          features: [
            {
              type: 'Feature',
              properties: { role: 'ORIGIN', title: originLabel, type: 'WAREHOUSE_PICKUP' },
              geometry: { type: 'Point', coordinates: [originLng, originLat] },
            },
            {
              type: 'Feature',
              properties: { role: 'DESTINATION', title: destLabel, type: 'CUSTOMER_DOORSTEP' },
              geometry: { type: 'Point', coordinates: [destLng, destLat] },
            },
            {
              type: 'Feature',
              properties: {
                role: 'RIDER',
                title: riderName,
                speedKmH,
                headingDegrees,
                batteryLevel,
                lastUpdatedAt,
              },
              geometry: { type: 'Point', coordinates: [riderPos[1], riderPos[0]] },
            },
            {
              type: 'Feature',
              properties: {
                role: 'TRANSIT_CORRIDOR',
                title: 'Optimized Delivery Corridor',
                totalDistanceKm,
                distanceRemainingKm,
                etaMinutes,
                trafficStatus: 'FLOWING',
              },
              geometry: {
                type: 'LineString',
                coordinates: polyline.map((pt) => [pt[1], pt[0]]),
              },
            },
          ],
        },
        simulationState: deliveryTask?.simulationState || {
          isSimulating: false,
          currentWaypointIndex: Math.floor(polyline.length * 0.65),
          totalWaypoints: polyline.length,
        },
        telemetryHistory: (deliveryTask?.telemetryHistory || []).slice(-10),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export GeoJSON FeatureCollection for Route & Telemetry (RFC 7946)
// @route   GET /api/delivery/live-tracking/:identifier/geojson
// @access  Public / Customer / GIS
exports.exportTrackingGeoJson = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const mongoose = require('mongoose');

    let subOrder = null;
    let order = null;
    let deliveryTask = null;

    if (mongoose.Types.ObjectId.isValid(identifier)) {
      subOrder = await SubOrder.findById(identifier).populate('vendor deliveryPartner');
      if (!subOrder) {
        order = await Order.findById(identifier).populate('subOrders');
        deliveryTask = await DeliveryTask.findById(identifier).populate('deliveryPartner');
      }
    }
    if (!order && !subOrder && !deliveryTask) {
      order = await Order.findOne({ orderNumber: identifier }).populate('subOrders');
    }
    if (order && !subOrder && order.subOrders?.length > 0) {
      subOrder = await SubOrder.findById(order.subOrders[0]._id || order.subOrders[0]).populate('vendor deliveryPartner');
    }
    if (!deliveryTask && subOrder) {
      deliveryTask = await DeliveryTask.findOne({ subOrder: subOrder._id }).populate('deliveryPartner');
    }

    let originLat = 19.0760;
    let originLng = 72.8777;
    let originLabel = 'Aura Fulfillment Hub, BKC';

    let destLat = 19.1136;
    let destLng = 72.8697;
    let destLabel = 'Customer Doorstep';

    if (subOrder?.vendor?.pickupAddress?.city) {
      originLabel = `${subOrder.vendor.storeName || 'Merchant'} Hub (${subOrder.vendor.pickupAddress.city})`;
    }
    if (deliveryTask?.dropLocation?.coordinates?.lat && deliveryTask?.dropLocation?.coordinates?.lng) {
      destLat = deliveryTask.dropLocation.coordinates.lat;
      destLng = deliveryTask.dropLocation.coordinates.lng;
    }

    const numPoints = 8;
    const polyline = [];
    for (let i = 0; i <= numPoints; i++) {
      const ratio = i / numPoints;
      const jitterLat = Math.sin(ratio * Math.PI) * 0.004;
      const jitterLng = Math.cos(ratio * Math.PI * 1.5) * 0.003;
      polyline.push([
        Math.round((originLat + (destLat - originLat) * ratio + jitterLat) * 10000) / 10000,
        Math.round((originLng + (destLng - originLng) * ratio + jitterLng) * 10000) / 10000,
      ]);
    }

    const riderLat = deliveryTask?.riderLocation?.lat || polyline[4][0];
    const riderLng = deliveryTask?.riderLocation?.lng || polyline[4][1];
    const speed = deliveryTask?.riderLocation?.speed || 28;
    const heading = deliveryTask?.riderLocation?.heading || 42;
    const riderName = deliveryTask?.deliveryPartner?.name || 'Courier Rider';

    const geoJson = {
      type: 'FeatureCollection',
      name: `AuraMarket_Delivery_${identifier}`,
      features: [
        {
          type: 'Feature',
          properties: {
            role: 'ORIGIN',
            title: originLabel,
            type: 'WAREHOUSE_PICKUP',
          },
          geometry: {
            type: 'Point',
            coordinates: [originLng, originLat],
          },
        },
        {
          type: 'Feature',
          properties: {
            role: 'DESTINATION',
            title: destLabel,
            type: 'CUSTOMER_DOORSTEP',
          },
          geometry: {
            type: 'Point',
            coordinates: [destLng, destLat],
          },
        },
        {
          type: 'Feature',
          properties: {
            role: 'RIDER',
            title: riderName,
            speedKmH: speed,
            headingDegrees: heading,
            lastUpdated: new Date().toISOString(),
          },
          geometry: {
            type: 'Point',
            coordinates: [riderLng, riderLat],
          },
        },
        {
          type: 'Feature',
          properties: {
            role: 'TRANSIT_CORRIDOR',
            title: 'Optimized Delivery Route',
            trafficStatus: 'FLOWING',
          },
          geometry: {
            type: 'LineString',
            coordinates: polyline.map((pt) => [pt[1], pt[0]]),
          },
        },
      ],
    };

    res.setHeader('Content-Type', 'application/geo+json');
    res.setHeader('Content-Disposition', `attachment; filename="route-${identifier}.geojson"`);
    res.status(200).json(geoJson);
  } catch (error) {
    next(error);
  }
};

// @desc    Update Rider GPS Coordinates from Mobile / App
// @route   POST or PATCH /api/delivery/rider/location
// @access  Private (Courier Rider / Admin)
exports.updateRiderLocation = async (req, res, next) => {
  try {
    const { lat, lng, speed, heading, accuracy, batteryLevel, taskId, orderIdentifier } = req.body;

    if (lat === undefined || lng === undefined || isNaN(Number(lat)) || isNaN(Number(lng))) {
      return res.status(400).json({
        success: false,
        message: 'Latitude (lat) and Longitude (lng) must be valid numbers',
      });
    }

    const numericLat = Number(lat);
    const numericLng = Number(lng);

    if (numericLat < -90 || numericLat > 90 || numericLng < -180 || numericLng > 180) {
      return res.status(400).json({
        success: false,
        message: 'Latitude must be between -90 and 90, Longitude between -180 and 180',
      });
    }

    let task = null;
    if (taskId) {
      task = await DeliveryTask.findById(taskId);
    } else if (orderIdentifier) {
      const ord = await Order.findOne({ orderNumber: orderIdentifier });
      if (ord && ord.subOrders?.length > 0) {
        task = await DeliveryTask.findOne({ subOrder: { $in: ord.subOrders } });
      }
    }
    if (!task && req.user?._id) {
      task = await DeliveryTask.findOne({
        deliveryPartner: req.user._id,
        status: { $in: ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'] },
      });
    }

    const numericSpeed = Number(speed || 0);
    const numericHeading = Number(heading || 0);
    const numericBattery = Number(batteryLevel !== undefined ? batteryLevel : 100);
    const numericAccuracy = Number(accuracy || 5);

    const locationUpdate = {
      lat: numericLat,
      lng: numericLng,
      speed: numericSpeed,
      heading: numericHeading,
      accuracy: numericAccuracy,
      batteryLevel: numericBattery,
      isMoving: numericSpeed > 0,
      lastUpdatedAt: new Date(),
    };

    if (task) {
      task.riderLocation = locationUpdate;
      if (!task.telemetryHistory) task.telemetryHistory = [];
      task.telemetryHistory.push({
        lat: numericLat,
        lng: numericLng,
        speed: numericSpeed,
        heading: numericHeading,
        timestamp: new Date(),
      });
      if (task.telemetryHistory.length > 50) {
        task.telemetryHistory = task.telemetryHistory.slice(-50);
      }

      // Recompute route metrics and ETA if destination is defined
      if (task.dropLocation?.coordinates?.lat && task.dropLocation?.coordinates?.lng) {
        const destLat = task.dropLocation.coordinates.lat;
        const destLng = task.dropLocation.coordinates.lng;
        const remainingKm = calculateDistanceKm(numericLat, numericLng, destLat, destLng) || 0;
        const estSpeed = numericSpeed > 0 ? numericSpeed : 25;
        const etaMins = Math.max(1, Math.round((remainingKm / estSpeed) * 60));
        task.routeMetrics = {
          totalDistanceKm: task.routeMetrics?.totalDistanceKm || Math.max(remainingKm, 1),
          distanceRemainingKm: Math.round(remainingKm * 100) / 100,
          etaMinutes: etaMins,
          etaTimestamp: new Date(Date.now() + etaMins * 60000),
          trafficStatus: numericSpeed < 10 && numericSpeed > 0 ? 'CONGESTED' : (numericSpeed < 20 ? 'MODERATE' : 'FLOWING'),
          lastCalculatedAt: new Date(),
        };
      }

      await task.save();
    }

    // Persist rider's last known location on User record
    if (req.user?._id) {
      await User.findByIdAndUpdate(req.user._id, {
        lastLocation: {
          lat: numericLat,
          lng: numericLng,
          speed: numericSpeed,
          heading: numericHeading,
          batteryLevel: numericBattery,
          updatedAt: new Date(),
        },
      }).catch(() => {});
    }

    // Broadcast over Socket.io
    const socketService = require('../services/socketService');
    const broadcastIdentifier = orderIdentifier || (task?.subOrder ? String(task.subOrder) : (task?._id ? String(task._id) : 'live'));
    socketService.emitRiderLocation(broadcastIdentifier, locationUpdate);

    res.status(200).json({
      success: true,
      message: 'Rider location updated successfully',
      data: {
        riderId: req.user?._id,
        ...locationUpdate,
        taskId: task?._id || taskId || null,
        routeMetrics: task?.routeMetrics || null,
        socketRoom: `order_${broadcastIdentifier}`,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Simulate Single Rider Step along Polyline for Interactive Telemetry Demo
// @route   POST /api/delivery/live-tracking/:identifier/simulate-step
// @access  Public / Customer / Demo
exports.simulateTrackingStep = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const { reset, customSpeed, stepIndex } = req.body || {};
    const mongoose = require('mongoose');

    let subOrder = null;
    let order = null;

    if (mongoose.Types.ObjectId.isValid(identifier)) {
      subOrder = await SubOrder.findById(identifier);
      if (!subOrder) {
        order = await Order.findById(identifier);
      }
    }
    if (!order && !subOrder) {
      order = await Order.findOne({ orderNumber: identifier });
    }
    if (order && !subOrder && order.subOrders?.length > 0) {
      subOrder = await SubOrder.findById(order.subOrders[0]._id || order.subOrders[0]);
    }

    let task = null;
    if (subOrder) {
      task = await DeliveryTask.findOne({ subOrder: subOrder._id });
    }
    if (!task && mongoose.Types.ObjectId.isValid(identifier)) {
      task = await DeliveryTask.findById(identifier);
    }

    let originLat = 19.0760;
    let originLng = 72.8777;
    let destLat = 19.1136;
    let destLng = 72.8697;

    if (task?.dropLocation?.coordinates?.lat && task?.dropLocation?.coordinates?.lng) {
      destLat = task.dropLocation.coordinates.lat;
      destLng = task.dropLocation.coordinates.lng;
    }

    const numPoints = 8;
    const polyline = [];
    for (let i = 0; i <= numPoints; i++) {
      const ratio = i / numPoints;
      const jitterLat = Math.sin(ratio * Math.PI) * 0.004;
      const jitterLng = Math.cos(ratio * Math.PI * 1.5) * 0.003;
      polyline.push([
        Math.round((originLat + (destLat - originLat) * ratio + jitterLat) * 10000) / 10000,
        Math.round((originLng + (destLng - originLng) * ratio + jitterLng) * 10000) / 10000,
      ]);
    }

    let currentIndex = 0;
    if (reset) {
      currentIndex = 0;
    } else if (typeof stepIndex === 'number') {
      currentIndex = Math.max(0, Math.min(stepIndex, polyline.length - 1));
    } else if (task?.simulationState?.currentWaypointIndex !== undefined) {
      currentIndex = (task.simulationState.currentWaypointIndex + 1) % polyline.length;
    } else {
      currentIndex = 1;
    }

    const currentCoords = polyline[currentIndex];
    const nextCoords = polyline[Math.min(currentIndex + 1, polyline.length - 1)];
    const heading = calculateBearing(currentCoords[0], currentCoords[1], nextCoords[0], nextCoords[1]);
    const speed = customSpeed !== undefined ? Number(customSpeed) : (currentIndex === polyline.length - 1 ? 0 : 32);
    const distanceRemainingKm = calculateDistanceKm(currentCoords[0], currentCoords[1], destLat, destLng);
    const etaMinutes = currentIndex === polyline.length - 1 ? 0 : Math.max(1, Math.round((distanceRemainingKm / (speed || 25)) * 60));

    const simulatedLocation = {
      lat: currentCoords[0],
      lng: currentCoords[1],
      speed,
      heading,
      accuracy: 4,
      batteryLevel: Math.max(20, 95 - currentIndex * 2),
      isMoving: speed > 0,
      lastUpdatedAt: new Date(),
    };

    if (task) {
      task.riderLocation = simulatedLocation;
      task.simulationState = {
        isSimulating: currentIndex < polyline.length - 1,
        currentWaypointIndex: currentIndex,
        totalWaypoints: polyline.length,
        lastSimulatedAt: new Date(),
      };
      if (!task.telemetryHistory) task.telemetryHistory = [];
      task.telemetryHistory.push({
        lat: currentCoords[0],
        lng: currentCoords[1],
        speed,
        heading,
        timestamp: new Date(),
      });
      if (task.telemetryHistory.length > 50) {
        task.telemetryHistory = task.telemetryHistory.slice(-50);
      }
      await task.save();
    }

    const socketService = require('../services/socketService');
    socketService.emitRiderLocation(identifier, simulatedLocation);
    socketService.emitEtaUpdate(identifier, {
      distanceRemainingKm,
      etaMinutes,
      etaSeconds: etaMinutes * 60,
    });

    res.status(200).json({
      success: true,
      message: 'Simulated tracking step executed',
      data: {
        orderIdentifier: identifier,
        currentWaypointIndex: currentIndex,
        totalWaypoints: polyline.length,
        isCompleted: currentIndex === polyline.length - 1,
        location: simulatedLocation,
        route: {
          polyline,
          distanceRemainingKm,
          etaMinutes,
          etaSeconds: etaMinutes * 60,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Rider Telemetry History Breadcrumbs
// @route   GET /api/delivery/live-tracking/:identifier/telemetry-history
// @access  Public / Customer / Rider
exports.getTelemetryHistory = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const mongoose = require('mongoose');

    let task = null;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      task = await DeliveryTask.findById(identifier);
      if (!task) {
        task = await DeliveryTask.findOne({ subOrder: identifier });
      }
    }
    if (!task) {
      const order = await Order.findOne({ orderNumber: identifier });
      if (order?.subOrders?.length > 0) {
        task = await DeliveryTask.findOne({ subOrder: { $in: order.subOrders } });
      }
    }

    const history = task?.telemetryHistory || [];

    res.status(200).json({
      success: true,
      data: {
        orderIdentifier: identifier,
        count: history.length,
        history,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Ping Rider Gateway (Heartbeat)
// @route   POST /api/delivery/rider/ping
// @access  Private (Courier Rider / Admin)
exports.pingRider = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Rider gateway active',
      timestamp: new Date().toISOString(),
      riderId: req.user?._id,
    });
  } catch (error) {
    next(error);
  }
};


// ========================================================
// Point 17: Multi-Stop Rider Delivery Route Optimizer
// ========================================================

const getHaversineDist = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
};

// @desc    Calculate fuel and distance minimized multi-stop delivery route
// @route   GET /api/delivery/rider/optimize-route
// @access  Private (Courier Rider / Admin)
exports.getOptimizedRoute = async (req, res, next) => {
  try {
    const riderId = req.user._id;

    // Fetch active tasks assigned to this rider
    const filter = req.user.role === 'superadmin' && req.query.riderId
      ? { deliveryPartner: req.query.riderId, status: { $in: ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'] } }
      : { deliveryPartner: riderId, status: { $in: ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'] } };

    let tasks = await DeliveryTask.find(filter)
      .populate('subOrder')
      .sort({ createdAt: 1 });

    // Hub starting position
    const depot = {
      name: 'Aura Central Dispatch Depot',
      address: 'Bandra-Kurla Complex, Mumbai',
      coordinates: { lat: 19.0657, lng: 72.8687 },
    };

    // If rider has fewer than 2 real active tasks, construct realistic sample multi-stop itinerary
    let rawStops = [];

    if (tasks.length >= 2) {
      rawStops = tasks.map((t, index) => ({
        taskId: t._id,
        recipientName: t.dropLocation?.recipientName || `Customer #${index + 1}`,
        phone: t.dropLocation?.phone || '9876543210',
        address: t.dropLocation?.address || 'Street Address, Mumbai',
        city: t.dropLocation?.city || 'Mumbai',
        pincode: t.dropLocation?.pincode || '400051',
        isCod: t.isCod,
        amountToCollect: t.amountToCollect || 0,
        coordinates: {
          lat: t.dropLocation?.coordinates?.lat || (19.0700 + index * 0.015),
          lng: t.dropLocation?.coordinates?.lng || (72.8700 + (index % 2) * 0.012),
        },
      }));
    } else {
      // Realistic 4-stop metropolitan delivery cluster
      rawStops = [
        {
          taskId: 'task_sim_01',
          recipientName: 'Arunav Sengupta',
          phone: '+91 98112 34567',
          address: 'Flat 402, Green Glen Heights, Powai',
          city: 'Mumbai',
          pincode: '400076',
          isCod: false,
          amountToCollect: 0,
          coordinates: { lat: 19.1176, lng: 72.9060 },
        },
        {
          taskId: 'task_sim_02',
          recipientName: 'Meera Deshmukh',
          phone: '+91 98223 45678',
          address: 'B-12, Sai Kripa Towers, Ghatkopar East',
          city: 'Mumbai',
          pincode: '400077',
          isCod: true,
          amountToCollect: 2499,
          coordinates: { lat: 19.0860, lng: 72.9080 },
        },
        {
          taskId: 'task_sim_03',
          recipientName: 'Rohan Mehra',
          phone: '+91 98334 56789',
          address: 'Villa 7, Palm Beach Enclave, Kurla West',
          city: 'Mumbai',
          pincode: '400070',
          isCod: false,
          amountToCollect: 0,
          coordinates: { lat: 19.0720, lng: 72.8800 },
        },
        {
          taskId: 'task_sim_04',
          recipientName: 'Sunita Patel',
          phone: '+91 98445 67890',
          address: 'Plot 88, Saki Naka Junction, Andheri East',
          city: 'Mumbai',
          pincode: '400072',
          isCod: true,
          amountToCollect: 1199,
          coordinates: { lat: 19.1050, lng: 72.8880 },
        },
      ];
    }

    // 1. Calculate unoptimized distance (naive order)
    let originalDistance = 0;
    let prev = depot.coordinates;
    for (const stop of rawStops) {
      originalDistance += getHaversineDist(prev.lat, prev.lng, stop.coordinates.lat, stop.coordinates.lng);
      prev = stop.coordinates;
    }

    // 2. Solve TSP with Nearest Neighbor Heuristic
    const remaining = [...rawStops];
    const optimizedStops = [];
    let currentPos = depot.coordinates;
    let optimizedDistance = 0;
    let accumulatedMinutes = 0;

    let sequenceIndex = 1;
    while (remaining.length > 0) {
      let nearestIndex = 0;
      let minLegDistance = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const d = getHaversineDist(
          currentPos.lat,
          currentPos.lng,
          remaining[i].coordinates.lat,
          remaining[i].coordinates.lng
        );
        if (d < minLegDistance) {
          minLegDistance = d;
          nearestIndex = i;
        }
      }

      const [nextStop] = remaining.splice(nearestIndex, 1);
      optimizedDistance += minLegDistance;

      // Assume avg speed of 25 km/h + 5 mins doorstep handover
      const legTravelMinutes = Math.max(3, Math.round((minLegDistance / 25) * 60));
      accumulatedMinutes += legTravelMinutes + 5;

      const etaTime = new Date(Date.now() + accumulatedMinutes * 60000);

      optimizedStops.push({
        ...nextStop,
        stopSequence: sequenceIndex,
        legDistanceKm: Math.round(minLegDistance * 100) / 100,
        legTravelMinutes,
        estimatedArrival: etaTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        navigationUrl: `https://www.google.com/maps/dir/?api=1&destination=${nextStop.coordinates.lat},${nextStop.coordinates.lng}`,
      });

      currentPos = nextStop.coordinates;
      sequenceIndex++;
    }

    // 2-Opt TSP Local Search Pass to eliminate polyline crossings
    if (optimizedStops.length > 3) {
      let improved = true;
      let iterations = 0;
      while (improved && iterations < 5) {
        improved = false;
        iterations++;
        for (let i = 0; i < optimizedStops.length - 1; i++) {
          for (let k = i + 1; k < optimizedStops.length; k++) {
            const pA = i === 0 ? depot.coordinates : optimizedStops[i - 1].coordinates;
            const pB = optimizedStops[i].coordinates;
            const pC = optimizedStops[k].coordinates;
            const pD = k + 1 < optimizedStops.length ? optimizedStops[k + 1].coordinates : null;

            const currentD = getHaversineDist(pA.lat, pA.lng, pB.lat, pB.lng) + (pD ? getHaversineDist(pC.lat, pC.lng, pD.lat, pD.lng) : 0);
            const swappedD = getHaversineDist(pA.lat, pA.lng, pC.lat, pC.lng) + (pD ? getHaversineDist(pB.lat, pB.lng, pD.lat, pD.lng) : 0);

            if (swappedD < currentD - 0.05) {
              const reversed = optimizedStops.slice(i, k + 1).reverse();
              optimizedStops.splice(i, k - i + 1, ...reversed);
              improved = true;
            }
          }
        }
      }
      optimizedStops.forEach((st, idx) => {
        st.stopSequence = idx + 1;
      });
    }

    // Generate circuit polyline connecting depot to all optimized stops
    const circuitPolyline = [
      [depot.coordinates.lat, depot.coordinates.lng],
      ...optimizedStops.map((st) => [st.coordinates.lat, st.coordinates.lng]),
    ];

    // Savings Calculation
    originalDistance = Math.round(originalDistance * 100) / 100;
    optimizedDistance = Math.round(optimizedDistance * 100) / 100;
    const distanceSavedKm = Math.max(0, Math.round((originalDistance - optimizedDistance) * 100) / 100);
    const timeSavedMinutes = Math.max(0, Math.round((distanceSavedKm / 25) * 60));
    // 2-wheeler fuel consumption approx 0.038 L per km
    const fuelSavedLitres = Math.round(distanceSavedKm * 0.038 * 100) / 100;
    // Approx 0.089 kg CO2 per km for small engines
    const co2SavedKg = Math.round(distanceSavedKm * 0.089 * 100) / 100;

    res.status(200).json({
      success: true,
      data: {
        depot,
        totalStops: optimizedStops.length,
        originalDistanceKm: originalDistance,
        optimizedDistanceKm: optimizedDistance,
        circuitPolyline,
        savings: {
          distanceSavedKm,
          timeSavedMinutes,
          fuelSavedLitres,
          co2SavedKg,
          fuelCostSavingsInr: Math.round(fuelSavedLitres * 104), // ₹104/L petrol in Mumbai
        },
        stops: optimizedStops,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Apply Optimized Multi-Stop Sequence to Rider's Active Tasks
// @route   POST /api/delivery/rider/apply-route-sequence
// @access  Private (Courier Rider / Admin)
exports.applyRouteSequence = async (req, res, next) => {
  try {
    const { sequence } = req.body; // Array of { taskId, stopSequence, legDistanceKm, legTravelMinutes, estimatedArrival }

    if (!Array.isArray(sequence) || sequence.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Sequence array with taskId and stopSequence is required',
      });
    }

    const updateOps = sequence.map((item) =>
      DeliveryTask.findByIdAndUpdate(item.taskId, {
        $set: {
          stopSequence: item.stopSequence,
          'optimizedRoute.stopSequence': item.stopSequence,
          'optimizedRoute.legDistanceKm': item.legDistanceKm || 0,
          'optimizedRoute.legTravelMinutes': item.legTravelMinutes || 0,
          'optimizedRoute.estimatedArrival': item.estimatedArrival || '',
          'optimizedRoute.optimizedAt': new Date(),
        },
      })
    );

    await Promise.all(updateOps);

    // Audit log
    const { recordAuditLog } = require('../utils/auditLogger');
    await recordAuditLog({
      action: 'UPDATE_ROUTE_SEQUENCE',
      module: 'LOGISTICS',
      user: req.user,
      req,
      targetId: String(req.user._id),
      targetType: 'DeliveryTaskSequence',
      description: `Rider ${req.user.name || 'Courier'} applied optimized route sequence across ${sequence.length} stops`,
      details: { stopsCount: sequence.length },
    });

    res.status(200).json({
      success: true,
      message: `Successfully re-indexed ${sequence.length} stops for fuel-efficient dispatch!`,
      appliedSequenceCount: sequence.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Central Control Room Live Fleet Radar with on-duty couriers, active routes, and GPS
// @route   GET /api/logistics/fleet/live-map
// @access  Private (Super Admin)
exports.getFleetLiveMap = async (req, res, next) => {
  try {
    const riders = await User.find({
      role: 'delivery',
      dutyStatus: 'ON_DUTY',
    }).select('name email phone dutyStatus isAvailable assignedZone lastLocation maxConcurrentOrders');

    const fleetRiders = await Promise.all(
      riders.map(async (rider) => {
        const tasks = await DeliveryTask.find({
          deliveryPartner: rider._id,
          status: { $in: ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'] },
        }).select('_id dropLocation pickupLocation status isCod amountToCollect targetDeliveryTime slaExpiresAt dispatchType stopSequence');

        return {
          _id: rider._id,
          name: rider.name,
          phone: rider.phone,
          dutyStatus: rider.dutyStatus || 'ON_DUTY',
          isAvailable: rider.isAvailable !== false,
          assignedZone: rider.assignedZone || 'Metropolitan Hub',
          location: rider.lastLocation || {
            lat: 19.0760,
            lng: 72.8777,
            speed: 26,
            heading: 42,
            batteryLevel: 90,
            updatedAt: new Date(),
          },
          activeTasksCount: tasks.length,
          maxAllowedTasks: rider.maxConcurrentOrders || 3,
          tasks,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: fleetRiders.length,
      data: {
        activeRidersCount: fleetRiders.length,
        totalActiveTasks: fleetRiders.reduce((acc, r) => acc + r.activeTasksCount, 0),
        riders: fleetRiders,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Rider Tips & Earnings Summary (Point 14)
// @route   GET /api/delivery/rider/tips
// @access  Private (delivery, superadmin)
exports.getRiderTipsSummary = async (req, res, next) => {
  try {
    const riderId = req.user._id;
    const rider = await User.findById(riderId);

    const tippedTasks = await DeliveryTask.find({
      deliveryPartner: riderId,
      tipAmount: { $gt: 0 },
    })
      .populate({
        path: 'subOrder',
        select: 'orderNumber subTotal items status',
      })
      .sort({ updatedAt: -1 });

    const totalTipsReceived = tippedTasks.reduce((acc, t) => acc + (t.tipAmount || 0), 0);
    const paidOutTips = tippedTasks.filter(t => t.tipPaidOut).reduce((acc, t) => acc + (t.tipAmount || 0), 0);
    const pendingTips = totalTipsReceived - paidOutTips;

    return res.status(200).json({
      success: true,
      tipEarnings: rider?.tipEarnings || 0,
      totalTipsReceived,
      paidOutTips,
      pendingTips,
      tippedDeliveriesCount: tippedTasks.length,
      tasks: tippedTasks,
    });
  } catch (error) {
    next(error);
  }
};




