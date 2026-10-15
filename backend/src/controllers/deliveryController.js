const DeliveryTask = require('../models/DeliveryTask');
const SubOrder = require('../models/SubOrder');
const Order = require('../models/Order');

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
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP! Please ask the customer for the correct 4-digit delivery code shown on their app.',
      });
    }

    // Update Task
    task.status = 'DELIVERED';
    task.otpVerified = true;
    task.deliveredAt = new Date();
    if (task.isCod) {
      task.amountCollected = amountCollected !== undefined ? Number(amountCollected) : task.amountToCollect;
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


