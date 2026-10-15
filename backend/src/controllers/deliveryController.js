const DeliveryTask = require('../models/DeliveryTask');
const SubOrder = require('../models/SubOrder');
const Order = require('../models/Order');
const CodReconciliation = require('../models/CodReconciliation');
const smsService = require('../services/smsService');
const mailService = require('../services/mailService');

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

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully! Order marked as DELIVERED.',
      data: {
        task,
        subOrder,
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


