const mongoose = require('mongoose');

const SLA_HOURS = {
  URGENT: { response: 2, resolution: 12 },
  HIGH: { response: 6, resolution: 24 },
  MEDIUM: { response: 24, resolution: 48 },
  LOW: { response: 48, resolution: 72 },
};

const supportTicketMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  senderRole: {
    type: String,
    enum: ['customer', 'agent', 'admin', 'vendor'],
    default: 'customer',
  },
  senderName: {
    type: String,
    default: 'Customer',
  },
  message: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
  },
  attachments: [
    {
      url: { type: String, default: '' },
      fileName: { type: String, default: '' },
      fileSize: { type: Number, default: 0 },
      fileType: { type: String, default: 'application/octet-stream' },
    },
  ],
  isInternalNote: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const supportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      unique: true,
      index: true,
      trim: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer reference is required'],
      index: true,
    },
    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      index: true,
    },
    subOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubOrder',
      default: null,
    },
    subject: {
      type: String,
      required: [true, 'Ticket subject is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'ORDER_STATUS',
        'PAYMENT_BILLING',
        'DELIVERY_COURIER',
        'RETURN_REFUND',
        'PRODUCT_DEFECT',
        'ACCOUNT_SECURITY',
        'GENERAL_INQUIRY',
      ],
      default: 'GENERAL_INQUIRY',
      index: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
      index: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
      index: true,
    },
    sla: {
      firstResponseDeadline: {
        type: Date,
        default: null,
      },
      resolutionDeadline: {
        type: Date,
        default: null,
      },
      firstRespondedAt: {
        type: Date,
        default: null,
      },
      firstResponseBreached: {
        type: Boolean,
        default: false,
        index: true,
      },
      resolutionBreached: {
        type: Boolean,
        default: false,
        index: true,
      },
      resolvedAt: {
        type: Date,
        default: null,
      },
    },
    messages: [supportTicketMessageSchema],
    satisfactionRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    feedbackComment: {
      type: String,
      default: '',
      trim: true,
    },
    resolutionSummary: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

// Pre-save hook: generate unique ticketNumber and compute SLA deadlines
supportTicketSchema.pre('save', function (next) {
  if (!this.ticketNumber) {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    this.ticketNumber = `TCK-${timestamp}-${randomSuffix}`;
  }

  if (!this.sla) {
    this.sla = {};
  }

  const priorityKey = (this.priority || 'MEDIUM').toUpperCase();
  const slaConfig = SLA_HOURS[priorityKey] || SLA_HOURS.MEDIUM;
  const baseTime = this.createdAt ? new Date(this.createdAt).getTime() : Date.now();

  if (!this.sla.firstResponseDeadline) {
    this.sla.firstResponseDeadline = new Date(baseTime + slaConfig.response * 3600 * 1000);
  }
  if (!this.sla.resolutionDeadline) {
    this.sla.resolutionDeadline = new Date(baseTime + slaConfig.resolution * 3600 * 1000);
  }

  // Check breach flags only for active (non-resolved/non-closed) tickets
  const now = new Date();
  const isResolvedOrClosed = ['RESOLVED', 'CLOSED'].includes(this.status);
  if (!isResolvedOrClosed) {
    if (!this.sla.firstRespondedAt && this.sla.firstResponseDeadline && now > this.sla.firstResponseDeadline) {
      this.sla.firstResponseBreached = true;
    }
    if (!this.sla.resolvedAt && this.sla.resolutionDeadline && now > this.sla.resolutionDeadline) {
      this.sla.resolutionBreached = true;
    }
  }

  next();
});

// Helper static to compute SLA by priority
supportTicketSchema.statics.getSlaHours = function (priority) {
  const key = (priority || 'MEDIUM').toUpperCase();
  return SLA_HOURS[key] || SLA_HOURS.MEDIUM;
};

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
