const Notification = require('../models/Notification');

/**
 * @desc Get current logged-in user's notifications with unread count
 * @route GET /api/notifications
 * @access Private
 */
exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { unreadOnly, type, page = 1, limit = 20 } = req.query;

    const query = { recipient: userId };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }
    if (type) {
      query.type = type;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Check count of user's notifications. If zero and role is customer, seed initial welcome notifications
    const totalExisting = await Notification.countDocuments({ recipient: userId });
    if (totalExisting === 0 && (req.user.role === 'customer' || !req.user.role)) {
      await Notification.create([
        {
          recipient: userId,
          role: 'customer',
          title: '🎉 Welcome to AuraMarket!',
          message: 'Explore 500+ premium multi-vendor products with verified fast delivery and zero-cost OTP verification.',
          type: 'PROMOTION',
          isRead: false,
          actionUrl: '/products',
        },
        {
          recipient: userId,
          role: 'customer',
          title: '🚚 Order Dispatched — Live ETA Available',
          message: 'Your recent order items have been handed over to express delivery hub. Use live tracker to view rider transit route.',
          type: 'OUT_FOR_DELIVERY',
          isRead: false,
          orderNumber: 'ORD-DEMO-2026',
          actionUrl: '/orders',
        },
        {
          recipient: userId,
          role: 'customer',
          title: '🏷️ Exclusive Festive Coupon Inside',
          message: 'Use coupon FESTIVE2026 at checkout for flat 10% instant discount on orders above ₹999.',
          type: 'COUPON',
          isRead: true,
          readAt: new Date(),
          actionUrl: '/offers',
        },
      ]);
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: userId, isRead: false }),
    ]);

    return res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications',
      error: error.message,
    });
  }
};

/**
 * @desc Mark a single notification as read
 * @route PUT /api/notifications/:id/read
 * @access Private
 */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or access denied',
      });
    }

    const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

    return res.status(200).json({
      success: true,
      data: notification,
      unreadCount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message,
    });
  }
};

/**
 * @desc Mark all notifications as read for current user
 * @route PUT /api/notifications/mark-all-read
 * @access Private
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      unreadCount: 0,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message,
    });
  }
};

/**
 * @desc Delete a notification
 * @route DELETE /api/notifications/:id
 * @access Private
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const deleted = await Notification.findOneAndDelete({ _id: id, recipient: userId });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or access denied',
      });
    }

    const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

    return res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
      unreadCount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message,
    });
  }
};

/**
 * @desc Simulate sending an instant order update notification (for demo testing / live simulation)
 * @route POST /api/notifications/simulate
 * @access Private
 */
exports.simulateNotification = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      title = '🚚 Out for Delivery Update',
      message = 'Your order #ORD-AURA-2026 is out for delivery with Express Rider. OTP is required at doorstep.',
      type = 'OUT_FOR_DELIVERY',
      orderNumber = 'ORD-AURA-2026',
      actionUrl = '/orders',
    } = req.body;

    const notification = await Notification.create({
      recipient: userId,
      role: req.user.role || 'customer',
      title,
      message,
      type,
      orderNumber,
      actionUrl,
      isRead: false,
    });

    const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

    return res.status(201).json({
      success: true,
      message: 'Live simulated notification dispatched!',
      data: notification,
      unreadCount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to simulate notification',
      error: error.message,
    });
  }
};
