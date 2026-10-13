const DeliveryTask = require('../models/DeliveryTask');
const SubOrder = require('../models/SubOrder');
const Order = require('../models/Order');

// @desc    Get All Tasks assigned to Logged-in Courier Rider (or all tasks for Super Admin)
// @route   GET /api/delivery/tasks
exports.getMyDeliveries = async (req, res, next) => {
  try {
    const filter = req.user.role === 'superadmin' ? {} : { deliveryPartner: req.user._id };
    const tasks = await DeliveryTask.find(filter)
      .populate({
        path: 'subOrder',
        populate: [
          { path: 'vendor', select: 'storeName storeLogo pickupAddress' },
          { path: 'customer', select: 'name phone' },
        ],
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: tasks.length, data: tasks });
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
