const mongoose = require('mongoose');
const DeliveryTask = require('../models/DeliveryTask');
const DeliverySlotConfig = require('../models/DeliverySlotConfig');
const User = require('../models/User');
const Order = require('../models/Order');
const SubOrder = require('../models/SubOrder');
const { recordAuditLog } = require('../utils/auditLogger');

// Helper: Ensure default slot configuration exists
const getOrCreateSlotConfig = async () => {
  let config = await DeliverySlotConfig.findOne();
  if (!config) {
    config = await DeliverySlotConfig.create({
      hyperlocal1Hour: {
        enabled: true,
        fee: 49,
        maxOrdersPerHour: 20,
        operatingStart: '07:00',
        operatingEnd: '22:00',
        slaMinutes: 60,
        badgeText: '⚡ 1-Hour Hyperlocal Express',
        maxDistanceKm: 15,
      },
      autoAssignment: {
        enabled: true,
        maxConcurrentTasksPerRider: 3,
        maxRiderSearchRadiusKm: 20,
        prioritizeProximity: true,
        fallbackToManual: true,
        reassignOnRejectMinutes: 10,
      },
      slots: [
        {
          slotKey: 'morning_09_12',
          title: 'Morning Slot (9:00 AM - 12:00 PM)',
          startTime: '09:00',
          endTime: '12:00',
          type: 'SCHEDULED_SLOT',
          cutoffMinutesBeforeStart: 60,
          maxCapacity: 30,
          fee: 29,
          isActive: true,
        },
        {
          slotKey: 'afternoon_13_16',
          title: 'Afternoon Slot (1:00 PM - 4:00 PM)',
          startTime: '13:00',
          endTime: '16:00',
          type: 'SCHEDULED_SLOT',
          cutoffMinutesBeforeStart: 60,
          maxCapacity: 30,
          fee: 29,
          isActive: true,
        },
        {
          slotKey: 'evening_17_20',
          title: 'Evening Slot (5:00 PM - 8:00 PM)',
          startTime: '17:00',
          endTime: '20:00',
          type: 'SCHEDULED_SLOT',
          cutoffMinutesBeforeStart: 60,
          maxCapacity: 35,
          fee: 29,
          isActive: true,
        },
        {
          slotKey: 'night_20_23',
          title: 'Late Night Express (8:00 PM - 11:00 PM)',
          startTime: '20:00',
          endTime: '23:00',
          type: 'SAME_DAY',
          cutoffMinutesBeforeStart: 45,
          maxCapacity: 25,
          fee: 39,
          isActive: true,
        },
      ],
    });
  }
  return config;
};

// Helper: Haversine distance in km
const haversineKm = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371;
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
};

/**
 * Core Algorithm: Auto-Assign Least-Loaded & Nearest On-Duty Delivery Rider
 */
const autoAssignRiderToTask = async (task, config = null) => {
  if (!config) {
    config = await getOrCreateSlotConfig();
  }

  if (!config.autoAssignment.enabled) {
    return { assigned: false, reason: 'Auto-assignment engine is disabled in logistics settings' };
  }

  // 1. Query on-duty active delivery partners
  const riders = await User.find({
    role: 'delivery',
    isActive: true,
    dutyStatus: 'ON_DUTY',
    isAvailable: true,
  }).select('name phone email avatar dutyStatus isAvailable assignedZone lastLocation maxConcurrentOrders cashInHandLimit isCashLimitLocked');

  if (!riders || riders.length === 0) {
    task.dispatchStatus = 'UNASSIGNED';
    await task.save();
    return { assigned: false, reason: 'No on-duty delivery riders are currently online and available' };
  }

  const maxTasksDefault = config.autoAssignment.maxConcurrentTasksPerRider || 3;
  const eligibleRiders = [];

  for (const rider of riders) {
    // Point 45: Check Cash-in-Hand limit for Cash on Delivery tasks
    if (task.isCod) {
      if (rider.isCashLimitLocked) {
        continue; // Rider is locked out from COD tasks until cash drop
      }
      const unremittedTasks = await DeliveryTask.find({
        deliveryPartner: rider._id,
        isCod: true,
        status: 'DELIVERED',
        $or: [
          { 'codReconciliation.status': { $in: ['PENDING', 'SUBMITTED'] } },
          { codReconciliation: { $exists: false } },
          { 'codReconciliation.status': { $exists: false } },
        ],
      });
      const currentCih = unremittedTasks.reduce((sum, t) => sum + (t.amountCollected || t.amountToCollect || 0), 0);
      const limit = rider.cashInHandLimit || 10000;
      if (currentCih >= limit) {
        continue; // Rider cash-in-hand limit reached
      }
    }

    const maxAllowed = rider.maxConcurrentOrders || maxTasksDefault;
    const activeTasksCount = await DeliveryTask.countDocuments({
      deliveryPartner: rider._id,
      status: { $in: ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'] },
    });

    if (activeTasksCount < maxAllowed) {
      // Calculate distance if task and rider have coordinates
      let distanceKm = 5; // default fallback penalty
      const taskLat = task.dropLocation?.coordinates?.lat || task.pickupLocation?.coordinates?.lat;
      const taskLng = task.dropLocation?.coordinates?.lng || task.pickupLocation?.coordinates?.lng;

      if (taskLat && taskLng && rider.lastLocation?.lat && rider.lastLocation?.lng) {
        const computedDist = haversineKm(taskLat, taskLng, rider.lastLocation.lat, rider.lastLocation.lng);
        if (computedDist !== null) {
          distanceKm = computedDist;
        }
      }

      // Zone match check
      let zoneMatch = false;
      const taskPincode = task.dropLocation?.pincode || task.pickupLocation?.pincode;
      if (rider.assignedZone && taskPincode && rider.assignedZone.includes(taskPincode)) {
        zoneMatch = true;
      }

      // Score: lower is better (load is primary factor, distance secondary, zone bonus)
      const score = activeTasksCount * 10 + distanceKm - (zoneMatch ? 5 : 0);

      eligibleRiders.push({
        rider,
        activeTasksCount,
        maxAllowed,
        distanceKm,
        zoneMatch,
        score,
      });
    }
  }

  if (eligibleRiders.length === 0) {
    task.dispatchStatus = 'UNASSIGNED';
    await task.save();
    return {
      assigned: false,
      reason: 'All online riders have reached maximum concurrent delivery capacity',
    };
  }

  // Sort by score ascending (lowest active tasks & closest distance)
  eligibleRiders.sort((a, b) => a.score - b.score);
  const bestMatch = eligibleRiders[0];
  const chosenRider = bestMatch.rider;

  task.deliveryPartner = chosenRider._id;
  task.dispatchStatus = 'ASSIGNED';
  task.autoAssigned = true;
  task.status = 'ASSIGNED';

  // Compute 1-Hour SLA if hyperlocal
  if (task.dispatchType === '1_HOUR_HYPERLOCAL' || task.deliverySlot?.is1HourHyperlocal) {
    const slaMins = config.hyperlocal1Hour.slaMinutes || 60;
    const target = new Date(Date.now() + slaMins * 60 * 1000);
    task.targetDeliveryTime = target;
    task.slaExpiresAt = target;
  }

  if (!Array.isArray(task.assignmentLog)) {
    task.assignmentLog = [];
  }

  task.assignmentLog.push({
    rider: chosenRider._id,
    riderName: chosenRider.name,
    assignedAt: new Date(),
    method: 'AUTO',
    reason: `Auto-Assigned: Rider load ${bestMatch.activeTasksCount}/${bestMatch.maxAllowed}, estimated distance ${bestMatch.distanceKm} km.`,
  });

  await task.save();

  return {
    assigned: true,
    rider: {
      _id: chosenRider._id,
      name: chosenRider.name,
      phone: chosenRider.phone,
      activeDeliveries: bestMatch.activeTasksCount + 1,
    },
    task,
  };
};

// @desc    Get dynamic delivery slots for customer checkout & storefront
// @route   GET /api/logistics/slots/available
// @access  Public
exports.getAvailableDeliverySlots = async (req, res, next) => {
  try {
    const { date, pincode, lat, lng } = req.query;
    const config = await getOrCreateSlotConfig();

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const selectedDate = date && date.trim() ? date.trim() : todayStr;
    const isToday = selectedDate === todayStr;

    const currentHour = today.getHours();
    const currentMin = today.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMin;

    // 1. Evaluate 1-Hour Hyperlocal Express Slot
    let hyperlocal1HourSlot = null;
    if (config.hyperlocal1Hour.enabled) {
      const [startH, startM] = config.hyperlocal1Hour.operatingStart.split(':').map(Number);
      const [endH, endM] = config.hyperlocal1Hour.operatingEnd.split(':').map(Number);
      const startMinTotal = startH * 60 + (startM || 0);
      const endMinTotal = endH * 60 + (endM || 0);

      const isWithinOperatingHours = currentTotalMinutes >= startMinTotal && currentTotalMinutes <= endMinTotal;

      if (isToday && isWithinOperatingHours) {
        // Count bookings in last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const bookedCount = await DeliveryTask.countDocuments({
          dispatchType: '1_HOUR_HYPERLOCAL',
          createdAt: { $gte: oneHourAgo },
          status: { $nin: ['CANCELLED'] },
        });

        const maxPerHour = config.hyperlocal1Hour.maxOrdersPerHour;
        const remainingCapacity = Math.max(0, maxPerHour - bookedCount);
        const slaMinutes = config.hyperlocal1Hour.slaMinutes || 60;
        const targetDeliveryTime = new Date(Date.now() + slaMinutes * 60 * 1000);

        hyperlocal1HourSlot = {
          slotKey: 'hyperlocal_1hr',
          title: config.hyperlocal1Hour.badgeText,
          description: `Guaranteed delivery within ${slaMinutes} minutes from dispatch`,
          type: 'HYPERLOCAL_1HR',
          isAvailable: remainingCapacity > 0,
          fee: config.hyperlocal1Hour.fee,
          capacity: maxPerHour,
          bookedCount,
          remainingCapacity,
          slaMinutes,
          targetDeliveryTime,
          badge: '⚡ Instant Express',
          countdownMinutesRemaining: 60 - currentMin,
        };
      } else {
        hyperlocal1HourSlot = {
          slotKey: 'hyperlocal_1hr',
          title: config.hyperlocal1Hour.badgeText,
          type: 'HYPERLOCAL_1HR',
          isAvailable: false,
          fee: config.hyperlocal1Hour.fee,
          reason: isToday ? `Operating hours are ${config.hyperlocal1Hour.operatingStart} to ${config.hyperlocal1Hour.operatingEnd}` : '1-Hour Express is only available for same-day delivery',
        };
      }
    }

    // 2. Evaluate Scheduled Slots
    const scheduledSlots = [];
    for (const slot of (config.slots || []).filter(s => s.isActive)) {
      const [slotH, slotM] = slot.startTime.split(':').map(Number);
      const slotStartMinutes = slotH * 60 + (slotM || 0);
      const cutoffTimeMinutes = slotStartMinutes - (slot.cutoffMinutesBeforeStart || 60);

      let isExpired = false;
      if (isToday && currentTotalMinutes > cutoffTimeMinutes) {
        isExpired = true;
      }

      // Check booked count for this slot on this date
      const bookedCount = await DeliveryTask.countDocuments({
        'deliverySlot.slotKey': slot.slotKey,
        'deliverySlot.date': selectedDate,
        status: { $nin: ['CANCELLED'] },
      });

      const remainingCapacity = Math.max(0, slot.maxCapacity - bookedCount);
      let status = 'AVAILABLE';
      if (isExpired) {
        status = 'EXPIRED';
      } else if (remainingCapacity === 0) {
        status = 'EXHAUSTED';
      } else if (remainingCapacity <= 5) {
        status = 'FAST_FILLING';
      }

      scheduledSlots.push({
        slotKey: slot.slotKey,
        title: slot.title,
        startTime: slot.startTime,
        endTime: slot.endTime,
        type: slot.type,
        fee: slot.fee,
        maxCapacity: slot.maxCapacity,
        bookedCount,
        remainingCapacity,
        status,
        isAvailable: !isExpired && remainingCapacity > 0,
        cutoffMinutesBeforeStart: slot.cutoffMinutesBeforeStart,
      });
    }

    res.status(200).json({
      success: true,
      date: selectedDate,
      isToday,
      hyperlocal1Hour: hyperlocal1HourSlot,
      slots: scheduledSlots,
      standardShipping: {
        slotKey: 'standard',
        title: 'Standard Delivery (2-4 Business Days)',
        type: 'STANDARD',
        fee: 0,
        isAvailable: true,
        estimatedDeliveryText: 'Delivered in 2 to 4 business days',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Delivery Slot & Dispatch Engine Configuration
// @route   GET /api/logistics/slots/config
// @access  Super Admin / Logistics Dispatcher
exports.getSlotConfiguration = async (req, res, next) => {
  try {
    const config = await getOrCreateSlotConfig();
    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Delivery Slot & Dispatch Engine Configuration
// @route   PUT /api/logistics/slots/config
// @access  Super Admin
exports.updateSlotConfiguration = async (req, res, next) => {
  try {
    const config = await getOrCreateSlotConfig();
    const { hyperlocal1Hour, autoAssignment, slots } = req.body;

    if (hyperlocal1Hour) {
      if (hyperlocal1Hour.enabled !== undefined) config.hyperlocal1Hour.enabled = Boolean(hyperlocal1Hour.enabled);
      if (hyperlocal1Hour.fee !== undefined) config.hyperlocal1Hour.fee = Math.max(0, Number(hyperlocal1Hour.fee));
      if (hyperlocal1Hour.maxOrdersPerHour !== undefined) config.hyperlocal1Hour.maxOrdersPerHour = Math.max(1, Number(hyperlocal1Hour.maxOrdersPerHour));
      if (hyperlocal1Hour.operatingStart) config.hyperlocal1Hour.operatingStart = hyperlocal1Hour.operatingStart;
      if (hyperlocal1Hour.operatingEnd) config.hyperlocal1Hour.operatingEnd = hyperlocal1Hour.operatingEnd;
      if (hyperlocal1Hour.slaMinutes) config.hyperlocal1Hour.slaMinutes = Math.max(15, Number(hyperlocal1Hour.slaMinutes));
      if (hyperlocal1Hour.badgeText) config.hyperlocal1Hour.badgeText = hyperlocal1Hour.badgeText;
      if (hyperlocal1Hour.maxDistanceKm) config.hyperlocal1Hour.maxDistanceKm = Number(hyperlocal1Hour.maxDistanceKm);
    }

    if (autoAssignment) {
      if (autoAssignment.enabled !== undefined) config.autoAssignment.enabled = Boolean(autoAssignment.enabled);
      if (autoAssignment.maxConcurrentTasksPerRider !== undefined) config.autoAssignment.maxConcurrentTasksPerRider = Math.max(1, Number(autoAssignment.maxConcurrentTasksPerRider));
      if (autoAssignment.maxRiderSearchRadiusKm !== undefined) config.autoAssignment.maxRiderSearchRadiusKm = Math.max(1, Number(autoAssignment.maxRiderSearchRadiusKm));
      if (autoAssignment.prioritizeProximity !== undefined) config.autoAssignment.prioritizeProximity = Boolean(autoAssignment.prioritizeProximity);
      if (autoAssignment.fallbackToManual !== undefined) config.autoAssignment.fallbackToManual = Boolean(autoAssignment.fallbackToManual);
    }

    if (Array.isArray(slots)) {
      config.slots = slots.map(s => ({
        slotKey: s.slotKey,
        title: s.title,
        startTime: s.startTime,
        endTime: s.endTime,
        type: s.type || 'SCHEDULED_SLOT',
        cutoffMinutesBeforeStart: Number(s.cutoffMinutesBeforeStart) || 60,
        maxCapacity: Number(s.maxCapacity) || 30,
        fee: Number(s.fee) || 0,
        isActive: s.isActive !== undefined ? Boolean(s.isActive) : true,
      }));
    }

    await config.save();

    await recordAuditLog({
      action: 'UPDATE_DELIVERY_SLOT_CONFIG',
      module: 'SETTINGS',
      performedBy: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      targetId: config._id.toString(),
      targetType: 'DeliverySlotConfig',
      description: 'Updated delivery slot templates and automated rider dispatch rules',
      changeSummary: 'Updated delivery slots configuration',
      details: {
        hyperlocalEnabled: config.hyperlocal1Hour.enabled,
        autoAssignEnabled: config.autoAssignment.enabled,
        slotsCount: config.slots.length,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Delivery slot & automated dispatch scheduler configuration updated successfully.',
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Live Fleet Dispatch Scheduler Radar (Admin Command Center)
// @route   GET /api/logistics/dispatch/radar
// @access  Super Admin / Logistics Dispatcher
exports.getDispatchRadar = async (req, res, next) => {
  try {
    const { date, dispatchType, status, slaStatus, riderId, search, page = 1, limit = 50 } = req.query;
    const config = await getOrCreateSlotConfig();

    const todayStr = new Date().toISOString().split('T')[0];
    const filterDate = date || todayStr;

    const taskQuery = {};

    if (dispatchType && dispatchType !== 'ALL') {
      taskQuery.dispatchType = dispatchType;
    }

    if (status && status !== 'ALL') {
      taskQuery.status = status;
    }

    if (riderId) {
      if (riderId === 'UNASSIGNED') {
        taskQuery.$or = [
          { deliveryPartner: null },
          { dispatchStatus: 'UNASSIGNED' },
        ];
      } else if (mongoose.Types.ObjectId.isValid(riderId)) {
        taskQuery.deliveryPartner = riderId;
      }
    }

    if (search && search.trim()) {
      const s = search.trim();
      const sRegex = new RegExp(s, 'i');
      taskQuery.$or = [
        { 'dropLocation.recipientName': sRegex },
        { 'dropLocation.phone': sRegex },
        { 'dropLocation.pincode': sRegex },
        { 'dropLocation.city': sRegex },
        { 'pickupLocation.storeName': sRegex },
      ];
    }

    const now = Date.now();

    // Query all tasks for KPI calculations
    const allTasks = await DeliveryTask.find({})
      .populate('deliveryPartner', 'name phone email avatar dutyStatus isAvailable')
      .populate('subOrder', 'status subTotal items')
      .populate('order', 'orderNumber totalAmount paymentMethod');

    // Filter tasks for KPI Bento Ribbon
    const activeHyperlocalTasks = allTasks.filter(
      t => (t.dispatchType === '1_HOUR_HYPERLOCAL' || t.deliverySlot?.is1HourHyperlocal) &&
           !['DELIVERED', 'CANCELLED'].includes(t.status)
    );

    const slaAtRiskTasks = activeHyperlocalTasks.filter(t => {
      if (!t.slaExpiresAt) return false;
      const remainingMs = new Date(t.slaExpiresAt).getTime() - now;
      return remainingMs > 0 && remainingMs <= 20 * 60 * 1000;
    });

    const slaBreachedTasks = activeHyperlocalTasks.filter(t => {
      if (!t.slaExpiresAt) return false;
      return new Date(t.slaExpiresAt).getTime() <= now;
    });

    const unassignedTasks = allTasks.filter(
      t => (!t.deliveryPartner || t.dispatchStatus === 'UNASSIGNED') &&
           !['DELIVERED', 'CANCELLED'].includes(t.status)
    );

    // On-Duty delivery riders
    const onDutyRiders = await User.find({
      role: 'delivery',
      isActive: true,
      dutyStatus: 'ON_DUTY',
    }).select('name phone dutyStatus isAvailable');

    const totalRiders = await User.countDocuments({ role: 'delivery', isActive: true });
    const maxCapacityCapacity = onDutyRiders.length * (config.autoAssignment.maxConcurrentTasksPerRider || 3);
    const activeDeliveriesCount = allTasks.filter(t => ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(t.status)).length;
    const fleetUtilizationPercent = maxCapacityCapacity > 0
      ? Math.min(100, Math.round((activeDeliveriesCount / maxCapacityCapacity) * 100))
      : 0;

    // SLA status filter applied to queried tasks
    let filteredTasks = await DeliveryTask.find(taskQuery)
      .populate('deliveryPartner', 'name phone email avatar dutyStatus isAvailable')
      .populate('subOrder', 'status subTotal items')
      .populate('order', 'orderNumber totalAmount paymentMethod')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    if (slaStatus === 'AT_RISK') {
      filteredTasks = filteredTasks.filter(t => {
        if (!t.slaExpiresAt) return false;
        const diff = new Date(t.slaExpiresAt).getTime() - now;
        return diff > 0 && diff <= 20 * 60 * 1000;
      });
    } else if (slaStatus === 'BREACHED') {
      filteredTasks = filteredTasks.filter(t => {
        if (!t.slaExpiresAt) return false;
        return new Date(t.slaExpiresAt).getTime() <= now;
      });
    }

    // Attach computed SLA info
    const enrichedTasks = filteredTasks.map(t => {
      const taskObj = t.toObject();
      if (t.slaExpiresAt) {
        const remainingMinutes = Math.round((new Date(t.slaExpiresAt).getTime() - now) / 60000);
        taskObj.slaRemainingMinutes = remainingMinutes;
        taskObj.isSlaBreached = remainingMinutes <= 0;
        taskObj.isSlaAtRisk = remainingMinutes > 0 && remainingMinutes <= 20;
      } else {
        taskObj.slaRemainingMinutes = null;
        taskObj.isSlaBreached = false;
        taskObj.isSlaAtRisk = false;
      }
      return taskObj;
    });

    // Compute Today's Slot Utilization Meters
    const slotUtilization = [];
    for (const s of (config.slots || []).filter(sl => sl.isActive)) {
      const booked = allTasks.filter(
        t => t.deliverySlot?.slotKey === s.slotKey &&
             (!t.deliverySlot?.date || t.deliverySlot.date === filterDate) &&
             !['CANCELLED'].includes(t.status)
      ).length;
      const percentage = Math.min(100, Math.round((booked / s.maxCapacity) * 100));

      slotUtilization.push({
        slotKey: s.slotKey,
        title: s.title,
        startTime: s.startTime,
        endTime: s.endTime,
        booked,
        maxCapacity: s.maxCapacity,
        percentage,
        isFull: booked >= s.maxCapacity,
      });
    }

    res.status(200).json({
      success: true,
      summary: {
        activeHyperlocalCount: activeHyperlocalTasks.length,
        slaAtRiskCount: slaAtRiskTasks.length,
        slaBreachedCount: slaBreachedTasks.length,
        unassignedCount: unassignedTasks.length,
        onDutyRidersCount: onDutyRiders.length,
        totalRidersCount: totalRiders,
        fleetUtilizationPercent,
        activeTransitDeliveries: activeDeliveriesCount,
      },
      slotUtilization,
      tasks: enrichedTasks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount: enrichedTasks.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger Automated Rider Assignment for a specific task
// @route   POST /api/logistics/dispatch/auto-assign/:taskId
// @access  Super Admin / Logistics Dispatcher
exports.triggerAutoAssignTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ success: false, message: 'Invalid delivery task ID.' });
    }

    const task = await DeliveryTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Delivery task not found.' });
    }

    const result = await autoAssignRiderToTask(task);

    if (!result.assigned) {
      return res.status(422).json({
        success: false,
        message: result.reason || 'Auto-assignment could not find an available rider.',
      });
    }

    res.status(200).json({
      success: true,
      message: `Rider ${result.rider.name} automatically assigned successfully to Task #${task._id.toString().slice(-6)}.`,
      data: {
        rider: result.rider,
        task: result.task,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Batch Run Automated Dispatch Engine for all pending unassigned tasks
// @route   POST /api/logistics/dispatch/batch-auto-assign
// @access  Super Admin / Logistics Dispatcher
exports.batchAutoAssignTasks = async (req, res, next) => {
  try {
    const config = await getOrCreateSlotConfig();

    // Query unassigned tasks pending delivery
    const pendingTasks = await DeliveryTask.find({
      $or: [
        { deliveryPartner: null },
        { dispatchStatus: 'UNASSIGNED' },
      ],
      status: { $in: ['ASSIGNED'] },
    });

    if (pendingTasks.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No pending unassigned delivery tasks found.',
        data: { processed: 0, assigned: 0, unassigned: 0 },
      });
    }

    let assignedCount = 0;
    let unassignedCount = 0;
    const assignments = [];

    for (const task of pendingTasks) {
      const outcome = await autoAssignRiderToTask(task, config);
      if (outcome.assigned) {
        assignedCount += 1;
        assignments.push({
          taskId: task._id,
          rider: outcome.rider,
        });
      } else {
        unassignedCount += 1;
      }
    }

    await recordAuditLog({
      action: 'BATCH_AUTO_ASSIGN_DISPATCH',
      module: 'LOGISTICS',
      performedBy: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      targetId: 'FLEET_DISPATCH',
      targetType: 'DeliveryTask',
      description: `Ran batch auto-assign: Processed ${pendingTasks.length} tasks, successfully assigned ${assignedCount}, ${unassignedCount} remaining.`,
      changeSummary: `Batch auto-dispatch assigned ${assignedCount} tasks`,
      details: {
        processed: pendingTasks.length,
        assigned: assignedCount,
        unassigned: unassignedCount,
      },
    });

    res.status(200).json({
      success: true,
      message: `Batch dispatch completed: Assigned ${assignedCount} of ${pendingTasks.length} tasks.`,
      data: {
        processed: pendingTasks.length,
        assigned: assignedCount,
        unassigned: unassignedCount,
        assignments,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Manual Rider Assignment Override by Super Admin / Fleet Dispatcher
// @route   POST /api/logistics/dispatch/manual-assign
// @access  Super Admin / Logistics Dispatcher
exports.manualAssignRider = async (req, res, next) => {
  try {
    const { taskId, riderId, reason = 'Manual dispatcher override' } = req.body;

    if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ success: false, message: 'Valid taskId is required.' });
    }
    if (!riderId || !mongoose.Types.ObjectId.isValid(riderId)) {
      return res.status(400).json({ success: false, message: 'Valid riderId is required.' });
    }

    const task = await DeliveryTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Delivery task not found.' });
    }

    const rider = await User.findOne({ _id: riderId, role: 'delivery', isActive: true });
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Active delivery partner not found.' });
    }

    task.deliveryPartner = rider._id;
    task.dispatchStatus = 'ASSIGNED';
    task.autoAssigned = false;
    task.status = 'ASSIGNED';

    if (!Array.isArray(task.assignmentLog)) {
      task.assignmentLog = [];
    }

    task.assignmentLog.push({
      rider: rider._id,
      riderName: rider.name,
      assignedAt: new Date(),
      method: 'MANUAL',
      reason: String(reason).trim(),
    });

    await task.save();

    await recordAuditLog({
      action: 'MANUAL_RIDER_ASSIGNMENT',
      module: 'LOGISTICS',
      performedBy: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      targetId: task._id.toString(),
      targetType: 'DeliveryTask',
      description: `Manually assigned rider ${rider.name} (${rider.phone}) to Task #${task._id.toString().slice(-6)}. Reason: ${reason}`,
      changeSummary: `Manually assigned rider ${rider.name} to task`,
      details: {
        taskId: task._id,
        riderId: rider._id,
        riderName: rider.name,
        reason,
      },
    });

    res.status(200).json({
      success: true,
      message: `Rider ${rider.name} assigned manually to task successfully.`,
      data: {
        task,
        rider: {
          _id: rider._id,
          name: rider.name,
          phone: rider.phone,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get All Active Fleet Delivery Riders with live workload metrics
// @route   GET /api/logistics/riders
// @access  Super Admin / Logistics Dispatcher
exports.getFleetRiders = async (req, res, next) => {
  try {
    const riders = await User.find({ role: 'delivery', isActive: true })
      .select('name email phone avatar dutyStatus isAvailable assignedZone lastLocation maxConcurrentOrders')
      .sort({ dutyStatus: 1, name: 1 });

    const ridersWithWorkload = [];
    for (const r of riders) {
      const activeCount = await DeliveryTask.countDocuments({
        deliveryPartner: r._id,
        status: { $in: ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'] },
      });
      const deliveredCount = await DeliveryTask.countDocuments({
        deliveryPartner: r._id,
        status: 'DELIVERED',
      });

      ridersWithWorkload.push({
        _id: r._id,
        name: r.name,
        phone: r.phone,
        email: r.email,
        avatar: r.avatar,
        dutyStatus: r.dutyStatus || 'ON_DUTY',
        isAvailable: r.isAvailable !== false,
        assignedZone: r.assignedZone || 'All Zones',
        lastLocation: r.lastLocation,
        maxConcurrentOrders: r.maxConcurrentOrders || 3,
        activeTasksCount: activeCount,
        deliveredTasksCount: deliveredCount,
        isCapacityFull: activeCount >= (r.maxConcurrentOrders || 3),
      });
    }

    res.status(200).json({
      success: true,
      count: ridersWithWorkload.length,
      data: ridersWithWorkload,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Rider Duty Status & Live Availability (Rider or Admin)
// @route   PATCH /api/logistics/riders/:id/duty-status
// @access  Delivery Rider (self) or Super Admin
exports.updateRiderDutyStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dutyStatus, isAvailable, assignedZone, lat, lng } = req.body;

    const isSelf = req.user._id.toString() === id;
    const isSuperAdmin = req.user.role === 'superadmin';

    if (!isSelf && !isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to modify another rider duty status.' });
    }

    const rider = await User.findOne({ _id: id, role: 'delivery' });
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Delivery partner account not found.' });
    }

    if (dutyStatus && ['ON_DUTY', 'OFF_DUTY'].includes(dutyStatus)) {
      rider.dutyStatus = dutyStatus;
      rider.isAvailable = dutyStatus === 'ON_DUTY';
    }

    if (isAvailable !== undefined) {
      rider.isAvailable = Boolean(isAvailable);
    }

    if (assignedZone !== undefined) {
      rider.assignedZone = String(assignedZone).trim();
    }

    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      rider.lastLocation = {
        lat: Number(lat),
        lng: Number(lng),
        updatedAt: new Date(),
      };
    }

    await rider.save();

    res.status(200).json({
      success: true,
      message: `Duty status updated to ${rider.dutyStatus} (${rider.isAvailable ? 'Available' : 'Unavailable'}).`,
      data: {
        _id: rider._id,
        name: rider.name,
        dutyStatus: rider.dutyStatus,
        isAvailable: rider.isAvailable,
        assignedZone: rider.assignedZone,
        lastLocation: rider.lastLocation,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export Dispatch Radar Tasks as RFC-4180 CSV with UTF-8 BOM
// @route   GET /api/logistics/dispatch/radar/export-csv
// @access  Super Admin / Logistics Dispatcher
exports.exportDispatchRadarCSV = async (req, res, next) => {
  try {
    const tasks = await DeliveryTask.find({})
      .populate('deliveryPartner', 'name phone')
      .populate('order', 'orderNumber paymentMethod')
      .sort({ createdAt: -1 });

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const headers = [
      'Task ID',
      'Order Ref',
      'Dispatch Type',
      'Delivery Slot',
      'Slot Date',
      'Target Delivery Time',
      'SLA Remaining Mins',
      'Rider Name',
      'Rider Phone',
      'Recipient Name',
      'Recipient Phone',
      'Drop Address',
      'Pincode',
      'Status',
      'COD Amount Due',
      'Created At',
    ];

    const rows = [];
    const now = Date.now();

    for (const t of tasks) {
      let slaRemMins = 'N/A';
      if (t.slaExpiresAt) {
        slaRemMins = Math.round((new Date(t.slaExpiresAt).getTime() - now) / 60000);
      }

      rows.push([
        escapeCsv(t._id),
        escapeCsv(t.order?.orderNumber || 'N/A'),
        escapeCsv(t.dispatchType || 'STANDARD'),
        escapeCsv(t.deliverySlot?.title || 'Standard'),
        escapeCsv(t.deliverySlot?.date || 'N/A'),
        escapeCsv(t.targetDeliveryTime ? new Date(t.targetDeliveryTime).toISOString() : 'N/A'),
        escapeCsv(slaRemMins),
        escapeCsv(t.deliveryPartner?.name || 'UNASSIGNED'),
        escapeCsv(t.deliveryPartner?.phone || 'N/A'),
        escapeCsv(t.dropLocation?.recipientName || 'N/A'),
        escapeCsv(t.dropLocation?.phone || 'N/A'),
        escapeCsv(t.dropLocation?.address || 'N/A'),
        escapeCsv(t.dropLocation?.pincode || 'N/A'),
        escapeCsv(t.status || 'ASSIGNED'),
        escapeCsv(t.isCod ? t.amountToCollect : 0),
        escapeCsv(t.createdAt ? new Date(t.createdAt).toISOString() : ''),
      ].join(','));
    }

    const bom = '\uFEFF';
    const csvContent = bom + headers.join(',') + '\r\n' + rows.join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Hyperlocal_Dispatch_Radar_${Date.now()}.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};
