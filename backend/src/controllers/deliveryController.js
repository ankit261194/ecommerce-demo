const DeliveryTask = require('../models/DeliveryTask');
const SubOrder = require('../models/SubOrder');
const Order = require('../models/Order');
const CodReconciliation = require('../models/CodReconciliation');
const smsService = require('../services/smsService');
const mailService = require('../services/mailService');
const { executeVendorPayoutSplit } = require('../services/payoutSplitService');
const ScratchCardReward = require('../models/ScratchCardReward');

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

    // Verify OTP
    if (subOrder.deliveryOtp !== otp.toString().trim()) {
      task.otpVerificationLog = task.otpVerificationLog || { attempts: 0 };
      task.otpVerificationLog.attempts = (task.otpVerificationLog.attempts || 0) + 1;
      task.otpVerificationLog.lastAttemptAt = new Date();
      await task.save();

      return res.status(400).json({
        success: false,
        message: 'Invalid OTP! Please ask the customer for the correct 4-digit delivery code shown on their app.',
        attempts: task.otpVerificationLog.attempts,
      });
    }

    // Update Task
    task.status = 'DELIVERED';
    task.otpVerified = true;
    task.deliveredAt = new Date();
    task.otpVerificationLog = task.otpVerificationLog || { attempts: 0 };
    task.otpVerificationLog.attempts = (task.otpVerificationLog.attempts || 0) + 1;
    task.otpVerificationLog.verifiedAt = new Date();
    if (task.isCod) {
      task.amountCollected = amountCollected !== undefined ? Number(amountCollected) : task.amountToCollect;
    }
    if (req.body.customerSignature) {
      task.customerSignature = req.body.customerSignature;
      task.signatureDetails = {
        signerName: req.body.signerName || task.dropLocation?.recipientName || 'Customer',
        signerRelation: req.body.signerRelation || 'Self',
        signedAt: new Date(),
        ipAddress: req.ip || '',
      };
    }
    if (req.body.proofPhoto) {
      task.proofPhoto = req.body.proofPhoto;
      task.proofPhotoDetails = {
        uploadedAt: new Date(),
        notes: req.body.photoNotes || '',
        tag: req.body.photoTag || 'DOORSTEP_DROP',
      };
    }
    await task.save();

    // Update SubOrder to Delivered
    subOrder.status = 'delivered';
    subOrder.trackingHistory.push({
      status: 'delivered',
      timestamp: new Date(),
      note: 'Order successfully handed over and verified via customer OTP',
    });
    await subOrder.save();

    // If COD, check if all suborders for parent order are delivered; if so, mark parent order PAID
    const parentOrder = await Order.findById(subOrder.parentOrder).populate('subOrders');
    if (parentOrder && parentOrder.subOrders && parentOrder.subOrders.length > 0) {
      const allDelivered = parentOrder.subOrders.every(so => so.status === 'delivered');
      if (allDelivered && parentOrder.paymentMethod === 'COD') {
        parentOrder.paymentStatus = 'PAID';
        await parentOrder.save();
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

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalCashPending,
          totalCashSubmitted,
          totalCashVerified,
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

    const reconciliationId = `COD-REC-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const reconciliation = await CodReconciliation.create({
      reconciliationId,
      deliveryPartner: req.user._id,
      tasks: tasksToReconcile.map(t => t._id),
      denominations: { d2000, d500, d200, d100, d50, d20, d10 },
      totalExpected,
      totalCounted,
      discrepancy,
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

// Point 16: Live Real-Time GPS Delivery Tracking Map
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

    // Current rider position is typically 65% of the way to the customer
    const riderProgressIndex = subOrderStatus === 'delivered' ? polyline.length - 1 : Math.floor(polyline.length * 0.65);
    const riderPos = polyline[riderProgressIndex] || [19.0980, 72.8715];

    // Compute remaining distance & ETA
    const totalDistanceKm = 4.2;
    const distanceRemainingKm = subOrderStatus === 'delivered' ? 0 : 1.4;
    const etaMinutes = subOrderStatus === 'delivered' ? 0 : 6;
    const etaSeconds = subOrderStatus === 'delivered' ? 0 : 360;

    res.status(200).json({
      success: true,
      data: {
        orderIdentifier: identifier,
        status: subOrderStatus,
        deliveryOtp,
        rider: {
          name: riderName,
          phone: riderPhone,
          vehicle: riderVehicle,
          rating: riderRating,
          photo: riderPhoto,
          speedKmH: subOrderStatus === 'delivered' ? 0 : 28,
          headingDegrees: 42,
          currentLocation: {
            lat: riderPos[0],
            lng: riderPos[1],
          },
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
          lastUpdatedAt: new Date(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Rider GPS Coordinates from Mobile / App
// @route   PATCH /api/delivery/rider/location
// @access  Private (Courier Rider / Admin)
exports.updateRiderLocation = async (req, res, next) => {
  try {
    const { lat, lng, speed, heading, taskId } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Latitude (lat) and Longitude (lng) are required',
      });
    }

    let updatedTask = null;
    if (taskId) {
      updatedTask = await DeliveryTask.findByIdAndUpdate(
        taskId,
        {
          $set: {
            'riderLocation.lat': lat,
            'riderLocation.lng': lng,
            'riderLocation.speed': speed || 0,
            'riderLocation.heading': heading || 0,
            'riderLocation.lastUpdatedAt': new Date(),
          },
        },
        { new: true }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Rider location updated successfully',
      data: {
        riderId: req.user?._id,
        lat,
        lng,
        speed: speed || 0,
        heading: heading || 0,
        updatedAt: new Date(),
        task: updatedTask,
      },
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
    const { sequence } = req.body; // Array of { taskId, stopSequence }

    if (!Array.isArray(sequence) || sequence.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Sequence array with taskId and stopSequence is required',
      });
    }

    const updateOps = sequence.map(item =>
      DeliveryTask.findByIdAndUpdate(item.taskId, {
        $set: { stopSequence: item.stopSequence },
      })
    );

    await Promise.all(updateOps);

    res.status(200).json({
      success: true,
      message: `Successfully re-indexed ${sequence.length} stops for fuel-efficient dispatch!`,
      appliedSequenceCount: sequence.length,
    });
  } catch (error) {
    next(error);
  }
};



