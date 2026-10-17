const mongoose = require('mongoose');
const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const Notification = require('../models/Notification');
const mailService = require('../services/mailService');

// SLA Hours config
const SLA_HOURS = {
  URGENT: { response: 2, resolution: 12 },
  HIGH: { response: 6, resolution: 24 },
  MEDIUM: { response: 24, resolution: 48 },
  LOW: { response: 48, resolution: 72 },
};

/**
 * 1. Create Ticket (Customer)
 * POST /api/support/tickets
 */
exports.createTicket = async (req, res) => {
  try {
    const {
      subject,
      category,
      priority = 'MEDIUM',
      orderId,
      order,
      subOrderId,
      subOrder,
      message,
      description,
      attachments = [],
    } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a subject for the support ticket.',
      });
    }

    const priorityKey = (priority || 'MEDIUM').toUpperCase();
    const slaConfig = SLA_HOURS[priorityKey] || SLA_HOURS.MEDIUM;
    const now = new Date();
    const firstResponseDeadline = new Date(now.getTime() + slaConfig.response * 3600 * 1000);
    const resolutionDeadline = new Date(now.getTime() + slaConfig.resolution * 3600 * 1000);

    const ticketNumber = `TCK-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const initialMessageText = (message || description || subject).trim();
    const initialMessages = [
      {
        sender: req.user._id,
        senderRole: req.user.role === 'customer' ? 'customer' : 'admin',
        senderName: req.user.name || 'Customer',
        message: initialMessageText,
        attachments: Array.isArray(attachments) ? attachments : [],
        isInternalNote: false,
        createdAt: now,
      },
    ];

    const ticket = await SupportTicket.create({
      ticketNumber,
      customer: req.user._id,
      order: orderId || order || null,
      subOrder: subOrderId || subOrder || null,
      subject: subject.trim(),
      category: category || 'GENERAL_INQUIRY',
      priority: priorityKey,
      status: 'OPEN',
      sla: {
        firstResponseDeadline,
        resolutionDeadline,
        firstRespondedAt: null,
        firstResponseBreached: false,
        resolutionBreached: false,
        resolvedAt: null,
      },
      messages: initialMessages,
    });

    // Dispatch in-app notification
    try {
      await Notification.create({
        recipient: req.user._id,
        role: 'customer',
        title: `Support Ticket Created: #${ticket.ticketNumber}`,
        message: `Your ticket "${ticket.subject}" has been received. SLA First Response guarantee: within ${slaConfig.response} hours.`,
        type: 'SYSTEM',
        metadata: { ticketId: ticket._id, ticketNumber: ticket.ticketNumber },
      });
    } catch (_) {}

    // Dispatch email notification
    try {
      if (req.user.email) {
        await mailService.sendNotification({
          to: req.user.email,
          subject: `Support Ticket Received: #${ticket.ticketNumber} - AuraMarket`,
          html: `<p>Hello ${req.user.name || 'Customer'},</p>
                 <p>Your support ticket <strong>#${ticket.ticketNumber}</strong> has been created.</p>
                 <p><strong>Subject:</strong> ${ticket.subject}</p>
                 <p><strong>Priority:</strong> ${ticket.priority} (${slaConfig.response}h SLA First Response)</p>
                 <p>Our dedicated support engineers are reviewing your case.</p>`,
        });
      }
    } catch (_) {}

    return res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      data: ticket,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create support ticket',
      error: error.message,
    });
  }
};

/**
 * 2. Get My Tickets (Customer)
 * GET /api/support/tickets/my
 */
exports.getMyTickets = async (req, res) => {
  try {
    const filter = { customer: req.user._id };

    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.priority) {
      filter.priority = req.query.priority;
    }

    const tickets = await SupportTicket.find(filter)
      .populate('order', 'orderNumber totalAmount paymentMethod status createdAt')
      .populate('assignedAgent', 'name email role')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve your support tickets',
      error: error.message,
    });
  }
};

/**
 * 3. Get Ticket By ID or TicketNumber
 * GET /api/support/tickets/:id
 */
exports.getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { $or: [{ _id: id }, { ticketNumber: id }] } : { ticketNumber: id };

    const ticket = await SupportTicket.findOne(query)
      .populate('customer', 'name email phone avatar')
      .populate('assignedAgent', 'name email role avatar')
      .populate('order', 'orderNumber totalAmount paymentMethod status createdAt');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found',
      });
    }

    // Role Security: Customer cannot view another user's ticket (403)
    const isAdminOrAgent = ['superadmin', 'admin', 'subadmin', 'agent'].includes(req.user.role);
    const isAssigned =
      ticket.assignedAgent && ticket.assignedAgent._id.toString() === req.user._id.toString();
    const isOwner =
      ticket.customer &&
      (ticket.customer._id
        ? ticket.customer._id.toString() === req.user._id.toString()
        : ticket.customer.toString() === req.user._id.toString());

    if (!isAdminOrAgent && !isAssigned && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view this ticket.',
      });
    }

    // Dynamic SLA breach update
    const now = new Date();
    let hasBreachChanged = false;
    if (!ticket.sla.firstRespondedAt && ticket.sla.firstResponseDeadline && now > ticket.sla.firstResponseDeadline) {
      if (!ticket.sla.firstResponseBreached) {
        ticket.sla.firstResponseBreached = true;
        hasBreachChanged = true;
      }
    }
    if (!ticket.sla.resolvedAt && ticket.sla.resolutionDeadline && now > ticket.sla.resolutionDeadline) {
      if (!ticket.sla.resolutionBreached) {
        ticket.sla.resolutionBreached = true;
        hasBreachChanged = true;
      }
    }
    if (hasBreachChanged) {
      await ticket.save();
    }

    return res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve ticket',
      error: error.message,
    });
  }
};

/**
 * 4. Add Message Reply
 * POST /api/support/tickets/:id/reply
 */
exports.addMessageReply = async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { $or: [{ _id: id }, { ticketNumber: id }] } : { ticketNumber: id };

    const ticket = await SupportTicket.findOne(query);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found',
      });
    }

    const isAdminOrAgent = ['superadmin', 'admin', 'subadmin', 'agent'].includes(req.user.role);
    const isAssigned =
      ticket.assignedAgent && ticket.assignedAgent.toString() === req.user._id.toString();
    const isOwner =
      ticket.customer && ticket.customer.toString() === req.user._id.toString();

    if (!isAdminOrAgent && !isAssigned && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to reply to this ticket.',
      });
    }

    const { message, attachments = [], isInternalNote = false, status } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide message content.',
      });
    }

    // Sender role resolution
    let senderRole = 'customer';
    if (['superadmin', 'admin', 'subadmin'].includes(req.user.role)) {
      senderRole = 'admin';
    } else if (req.user.role === 'agent' || isAssigned) {
      senderRole = 'agent';
    } else if (req.user.role === 'vendor') {
      senderRole = 'vendor';
    }

    const now = new Date();

    ticket.messages.push({
      sender: req.user._id,
      senderRole,
      senderName: req.user.name || (senderRole === 'customer' ? 'Customer' : 'Support Specialist'),
      message: message.trim(),
      attachments: Array.isArray(attachments) ? attachments : [],
      isInternalNote: Boolean(isInternalNote),
      createdAt: now,
    });

    // SLA tracking: If replied by agent or admin for the first time
    if (['agent', 'admin'].includes(senderRole) && !ticket.sla.firstRespondedAt) {
      ticket.sla.firstRespondedAt = now;
      if (ticket.sla.firstResponseDeadline && now > ticket.sla.firstResponseDeadline) {
        ticket.sla.firstResponseBreached = true;
      }
    }

    // Status management
    if (status) {
      ticket.status = status;
    } else {
      if (['agent', 'admin'].includes(senderRole)) {
        ticket.status = 'WAITING_CUSTOMER';
      } else if (senderRole === 'customer') {
        if (ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') {
          ticket.status = 'IN_PROGRESS';
        }
      }
    }

    await ticket.save();

    return res.status(200).json({
      success: true,
      message: 'Reply added successfully',
      data: ticket,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to add message reply',
      error: error.message,
    });
  }
};

/**
 * 5. Close / Resolve Ticket
 * PUT /api/support/tickets/:id/close
 */
exports.closeTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { $or: [{ _id: id }, { ticketNumber: id }] } : { ticketNumber: id };

    const ticket = await SupportTicket.findOne(query);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found',
      });
    }

    const isAdminOrAgent = ['superadmin', 'admin', 'subadmin', 'agent'].includes(req.user.role);
    const isOwner =
      ticket.customer && ticket.customer.toString() === req.user._id.toString();

    if (!isAdminOrAgent && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to close this ticket.',
      });
    }

    const { satisfactionRating, feedbackComment, resolutionSummary, status } = req.body;

    const targetStatus = status || 'RESOLVED';
    ticket.status = targetStatus;

    const now = new Date();
    if (!ticket.sla.resolvedAt) {
      ticket.sla.resolvedAt = now;
      if (ticket.sla.resolutionDeadline && now > ticket.sla.resolutionDeadline) {
        ticket.sla.resolutionBreached = true;
      }
    }

    if (satisfactionRating !== undefined && satisfactionRating !== null) {
      const ratingNum = Number(satisfactionRating);
      if (ratingNum >= 1 && ratingNum <= 5) {
        ticket.satisfactionRating = ratingNum;
      }
    }

    if (feedbackComment) {
      ticket.feedbackComment = feedbackComment.trim();
    }
    if (resolutionSummary) {
      ticket.resolutionSummary = resolutionSummary.trim();
    }

    await ticket.save();

    return res.status(200).json({
      success: true,
      message: 'Ticket resolved successfully',
      data: ticket,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to close support ticket',
      error: error.message,
    });
  }
};

/**
 * 6. Get Admin Tickets
 * GET /api/support/tickets/admin
 */
exports.getAdminTickets = async (req, res) => {
  try {
    const { priority, status, assignedAgent, category, search, page = 1, limit = 20 } = req.query;

    const filter = {};

    if (priority) filter.priority = priority;
    if (status) filter.status = status;
    if (assignedAgent) filter.assignedAgent = assignedAgent;
    if (category) filter.category = category;

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [{ ticketNumber: searchRegex }, { subject: searchRegex }];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter)
        .populate('customer', 'name email phone avatar')
        .populate('assignedAgent', 'name email role avatar')
        .populate('order', 'orderNumber totalAmount paymentMethod status createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      SupportTicket.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: tickets.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      data: tickets,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin tickets',
      error: error.message,
    });
  }
};

/**
 * 7. Assign Ticket (Admin / Agent)
 * PUT /api/support/tickets/:id/assign
 */
exports.assignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { $or: [{ _id: id }, { ticketNumber: id }] } : { ticketNumber: id };

    const ticket = await SupportTicket.findOne(query);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found',
      });
    }

    const { agentId, assignedAgent } = req.body;
    const targetAgentId = agentId || assignedAgent;

    if (!targetAgentId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an agentId to assign this ticket.',
      });
    }

    ticket.assignedAgent = targetAgentId;
    if (ticket.status === 'OPEN') {
      ticket.status = 'IN_PROGRESS';
    }

    await ticket.save();

    const populated = await SupportTicket.findById(ticket._id)
      .populate('customer', 'name email')
      .populate('assignedAgent', 'name email role');

    return res.status(200).json({
      success: true,
      message: 'Ticket assigned successfully',
      data: populated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to assign ticket',
      error: error.message,
    });
  }
};

/**
 * 8. Update Ticket Status or Priority
 * PUT /api/support/tickets/:id/status
 */
exports.updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { $or: [{ _id: id }, { ticketNumber: id }] } : { ticketNumber: id };

    const ticket = await SupportTicket.findOne(query);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found',
      });
    }

    const { status, priority, resolutionSummary } = req.body;

    if (status) {
      ticket.status = status;
      if (['RESOLVED', 'CLOSED'].includes(status) && !ticket.sla.resolvedAt) {
        ticket.sla.resolvedAt = new Date();
        if (ticket.sla.resolutionDeadline && ticket.sla.resolvedAt > ticket.sla.resolutionDeadline) {
          ticket.sla.resolutionBreached = true;
        }
      }
    }

    if (priority) {
      const priorityKey = priority.toUpperCase();
      ticket.priority = priorityKey;
      // Recompute SLA if not responded yet
      if (!ticket.sla.firstRespondedAt) {
        const slaConfig = SLA_HOURS[priorityKey] || SLA_HOURS.MEDIUM;
        const baseTime = new Date(ticket.createdAt).getTime();
        ticket.sla.firstResponseDeadline = new Date(baseTime + slaConfig.response * 3600 * 1000);
        ticket.sla.resolutionDeadline = new Date(baseTime + slaConfig.resolution * 3600 * 1000);
      }
    }

    if (resolutionSummary) {
      ticket.resolutionSummary = resolutionSummary.trim();
    }

    await ticket.save();

    return res.status(200).json({
      success: true,
      message: 'Ticket updated successfully',
      data: ticket,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update ticket status',
      error: error.message,
    });
  }
};

/**
 * 9. Get Ticket Analytics
 * GET /api/support/tickets/analytics
 */
exports.getTicketAnalytics = async (req, res) => {
  try {
    const now = new Date();

    const [
      totalTickets,
      openTickets,
      resolvedTickets,
      urgentTickets,
      breachedCount,
      ratedTickets,
    ] = await Promise.all([
      SupportTicket.countDocuments(),
      SupportTicket.countDocuments({ status: { $in: ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER'] } }),
      SupportTicket.countDocuments({ status: { $in: ['RESOLVED', 'CLOSED'] } }),
      SupportTicket.countDocuments({ priority: 'URGENT' }),
      SupportTicket.countDocuments({
        $or: [
          { 'sla.firstResponseBreached': true },
          { 'sla.resolutionBreached': true },
          {
            status: { $in: ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER'] },
            'sla.firstRespondedAt': null,
            'sla.firstResponseDeadline': { $lt: now },
          },
          {
            status: { $in: ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER'] },
            'sla.resolvedAt': null,
            'sla.resolutionDeadline': { $lt: now },
          },
        ],
      }),
      SupportTicket.find({ satisfactionRating: { $ne: null } }).select('satisfactionRating'),
    ]);

    let averageSatisfactionRating = 5.0;
    if (ratedTickets.length > 0) {
      const sum = ratedTickets.reduce((acc, t) => acc + (t.satisfactionRating || 0), 0);
      averageSatisfactionRating = parseFloat((sum / ratedTickets.length).toFixed(1));
    }

    // Breakdown by category
    const categoryAgg = await SupportTicket.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const categoryBreakdown = {};
    categoryAgg.forEach((c) => {
      categoryBreakdown[c._id] = c.count;
    });

    return res.status(200).json({
      success: true,
      data: {
        totalTickets,
        openTickets,
        resolvedTickets,
        urgentTickets,
        breachedTickets: breachedCount,
        averageSatisfactionRating,
        categoryBreakdown,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve ticket analytics',
      error: error.message,
    });
  }
};

/**
 * 10. Simulate Agent Reply (Interactive Demo Feature)
 * POST /api/support/tickets/:id/simulate-reply
 */
exports.simulateAgentReply = async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { $or: [{ _id: id }, { ticketNumber: id }] } : { ticketNumber: id };

    const ticket = await SupportTicket.findOne(query);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found',
      });
    }

    const now = new Date();
    const demoReplies = [
      `Hello! Thank you for reaching out to AuraMarket Priority Care. I have reviewed your inquiry regarding "${ticket.subject}" and am already expediting this with our fulfillment & billing desk. You will receive an update shortly!`,
      `Greetings from AuraMarket Tier-1 Support! We have checked your order telemetry and courier handoff logs. Everything is actively tracking and our logistics partner has confirmed priority handling.`,
      `Thank you for contacting us. We have verified your request. Please find the verified confirmation attached to your order record. Let us know if you need any additional assistance!`,
    ];
    const replyText = demoReplies[Math.floor(Math.random() * demoReplies.length)];

    ticket.messages.push({
      sender: null,
      senderRole: 'agent',
      senderName: 'Pooja Verma (Senior Support Specialist)',
      message: replyText,
      attachments: [
        {
          url: 'https://cdn.auramarket.com/support/case-resolution-note.pdf',
          fileName: 'case-resolution-note.pdf',
          fileSize: 45020,
          fileType: 'application/pdf',
        },
      ],
      isInternalNote: false,
      createdAt: now,
    });

    if (!ticket.sla.firstRespondedAt) {
      ticket.sla.firstRespondedAt = now;
      if (ticket.sla.firstResponseDeadline && now > ticket.sla.firstResponseDeadline) {
        ticket.sla.firstResponseBreached = true;
      }
    }

    ticket.status = 'WAITING_CUSTOMER';
    await ticket.save();

    return res.status(200).json({
      success: true,
      message: 'Agent response simulated successfully',
      data: ticket,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to simulate agent reply',
      error: error.message,
    });
  }
};
