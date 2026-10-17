import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  LifeBuoy,
  MessageSquare,
  Clock,
  ShieldCheck,
  Send,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Zap,
  Star,
  FileText,
  Search,
  Filter,
  PlusCircle,
  ArrowLeft,
  User,
  Headphones,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Bot,
  RefreshCw,
  Check,
  Package,
  CreditCard,
  Truck,
  RotateCcw,
  ShieldAlert,
  Info,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'ORDER_STATUS', label: 'Order Status & Tracking', icon: Package, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' },
  { id: 'PAYMENT_BILLING', label: 'Payment & Billing Issues', icon: CreditCard, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
  { id: 'DELIVERY_COURIER', label: 'Delivery Delay / Courier', icon: Truck, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' },
  { id: 'RETURN_REFUND', label: 'Return, Refund & Exchange', icon: RotateCcw, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' },
  { id: 'PRODUCT_DEFECT', label: 'Product Defect / Missing Item', icon: AlertTriangle, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40' },
  { id: 'ACCOUNT_SECURITY', label: 'Account Security & Login', icon: ShieldAlert, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40' },
  { id: 'GENERAL_INQUIRY', label: 'General Customer Support', icon: Info, color: 'text-slate-500 bg-slate-50 dark:bg-slate-800' },
];

const PRIORITIES = [
  {
    id: 'URGENT',
    label: 'Urgent Priority',
    responseSla: '2 Hours',
    resolutionSla: '12 Hours',
    badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-300',
    icon: Flame,
    desc: 'Critical payment errors, undelivered urgent medication, missing parcel at doorstep',
  },
  {
    id: 'HIGH',
    label: 'High Priority',
    responseSla: '6 Hours',
    resolutionSla: '24 Hours',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300',
    icon: Zap,
    desc: 'Courier delay, damaged goods, return pickup cancellation',
  },
  {
    id: 'MEDIUM',
    label: 'Medium Priority',
    responseSla: '24 Hours',
    resolutionSla: '48 Hours',
    badgeClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300',
    icon: Clock,
    desc: 'Order tracking questions, invoice updates, delivery address modification',
  },
  {
    id: 'LOW',
    label: 'Low Priority',
    responseSla: '48 Hours',
    resolutionSla: '72 Hours',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300',
    icon: MessageSquare,
    desc: 'General inquiry, coupon questions, feedback or product suggestions',
  },
];

export default function SupportHelpdeskModal({
  isOpen,
  onClose,
  orderData = null,
  apiUrl = '/api',
  initialTab = 'tickets',
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'tickets' | 'new' | 'chat'
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Ticket Form State
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('GENERAL_INQUIRY');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newOrderId, setNewOrderId] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newAttachments, setNewAttachments] = useState([]);

  // Reply Chat State
  const [replyMessage, setReplyMessage] = useState('');
  const [replyAttachments, setReplyAttachments] = useState([]);
  const chatBottomRef = useRef(null);

  // Rating & Feedback State
  const [starRating, setStarRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isRatingSubmitted, setIsRatingSubmitted] = useState(false);

  // Prepopulate order if passed via props
  useEffect(() => {
    if (orderData) {
      const oid = orderData.orderNumber || orderData.orderId || orderData._id || '';
      setNewOrderId(oid);
      if (orderData.status === 'DELIVERED') {
        setNewCategory('RETURN_REFUND');
        setNewSubject(`Inquiry regarding delivered order #${oid}`);
      } else {
        setNewCategory('ORDER_STATUS');
        setNewSubject(`Tracking inquiry for order #${oid}`);
      }
    }
  }, [orderData]);

  // Fetch Tickets on Mount or Open
  useEffect(() => {
    if (isOpen) {
      fetchTickets();
    }
  }, [isOpen, statusFilter]);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (activeTab === 'chat' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedTicket?.messages, activeTab]);

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auramarket_token') || 'demo_customer_token';
      const url = statusFilter === 'ALL'
        ? `${apiUrl}/support/tickets/my`
        : `${apiUrl}/support/tickets/my?status=${statusFilter}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setTickets(data.data || []);
      } else {
        // Fallback demo tickets if offline or unauthenticated
        seedDemoTickets();
      }
    } catch (_) {
      seedDemoTickets();
    } finally {
      setLoading(false);
    }
  };

  const seedDemoTickets = () => {
    const demo = [
      {
        _id: 'tck_demo_1',
        ticketNumber: 'TCK-1792206-891',
        subject: 'Fast Delivery SLA Tracking for Mumbai Metro',
        category: 'DELIVERY_COURIER',
        priority: 'URGENT',
        status: 'IN_PROGRESS',
        sla: {
          firstResponseDeadline: new Date(Date.now() + 1.5 * 3600 * 1000).toISOString(),
          resolutionDeadline: new Date(Date.now() + 10 * 3600 * 1000).toISOString(),
          firstRespondedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          firstResponseBreached: false,
          resolutionBreached: false,
        },
        assignedAgent: {
          name: 'Pooja Verma',
          email: 'pooja.verma@auramarket.com',
          role: 'agent',
        },
        messages: [
          {
            senderRole: 'customer',
            senderName: 'Customer',
            message: 'Need urgent delivery for medical equipment ordered yesterday.',
            createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
            attachments: [],
          },
          {
            senderRole: 'agent',
            senderName: 'Pooja Verma (Senior Specialist)',
            message: 'Hello! Your package is already out for delivery with our priority electric fleet rider Rahul. ETA is under 45 minutes.',
            createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
            attachments: [
              {
                url: 'https://cdn.auramarket.com/support/delivery_manifest_fast.pdf',
                fileName: 'priority_express_manifest.pdf',
                fileSize: 48200,
                fileType: 'application/pdf',
              },
            ],
          },
        ],
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
      {
        _id: 'tck_demo_2',
        ticketNumber: 'TCK-1792205-412',
        subject: 'GST Invoice Download with Tax Seal',
        category: 'PAYMENT_BILLING',
        priority: 'MEDIUM',
        status: 'RESOLVED',
        satisfactionRating: 5,
        feedbackComment: 'Instant response and clear PDF invoice delivered directly to my inbox.',
        sla: {
          firstResponseDeadline: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
          resolutionDeadline: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
          firstRespondedAt: new Date(Date.now() - 15 * 3600 * 1000).toISOString(),
          resolvedAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
          firstResponseBreached: false,
          resolutionBreached: false,
        },
        assignedAgent: {
          name: 'Rohit Sharma',
          email: 'rohit.support@auramarket.com',
          role: 'agent',
        },
        messages: [
          {
            senderRole: 'customer',
            senderName: 'Customer',
            message: 'Could you please generate the downloadable B2B GST tax invoice with corporate seal?',
            createdAt: new Date(Date.now() - 16 * 3600 * 1000).toISOString(),
            attachments: [],
          },
          {
            senderRole: 'agent',
            senderName: 'Rohit Sharma (Billing Support)',
            message: 'Your official GST invoice has been verified and attached below with cryptographic authentication seal AUTH-SEAL-8991.',
            createdAt: new Date(Date.now() - 15 * 3600 * 1000).toISOString(),
            attachments: [
              {
                url: 'https://cdn.auramarket.com/support/sample_tax_invoice.pdf',
                fileName: 'INV-AURA-2026-8991.pdf',
                fileSize: 125000,
                fileType: 'application/pdf',
              },
            ],
          },
        ],
        createdAt: new Date(Date.now() - 16 * 3600 * 1000).toISOString(),
      },
    ];
    setTickets(demo);
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) {
      setError('Please provide both a subject and initial message describing your inquiry.');
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem('auramarket_token') || 'demo_customer_token';
      const payload = {
        subject: newSubject.trim(),
        category: newCategory,
        priority: newPriority,
        orderId: newOrderId.trim() || undefined,
        message: newMessage.trim(),
        attachments: newAttachments,
      };

      const res = await fetch(`${apiUrl}/support/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessMsg(`Ticket #${data.data?.ticketNumber || 'NEW'} created successfully with SLA guarantee!`);
        setNewSubject('');
        setNewMessage('');
        setNewAttachments([]);
        fetchTickets();
        setSelectedTicket(data.data);
        setActiveTab('chat');
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to submit ticket');
      }
    } catch (err) {
      // Local demo fallback
      const priorityConfig = PRIORITIES.find((p) => p.id === newPriority) || PRIORITIES[2];
      const hoursMap = { URGENT: 2, HIGH: 6, MEDIUM: 24, LOW: 48 };
      const hours = hoursMap[newPriority] || 24;

      const fallbackTicket = {
        _id: 'tck_' + Date.now(),
        ticketNumber: `TCK-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        subject: newSubject.trim(),
        category: newCategory,
        priority: newPriority,
        status: 'OPEN',
        sla: {
          firstResponseDeadline: new Date(Date.now() + hours * 3600 * 1000).toISOString(),
          resolutionDeadline: new Date(Date.now() + hours * 2 * 3600 * 1000).toISOString(),
          firstRespondedAt: null,
          firstResponseBreached: false,
          resolutionBreached: false,
        },
        messages: [
          {
            senderRole: 'customer',
            senderName: 'Customer',
            message: newMessage.trim(),
            attachments: newAttachments,
            createdAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
      };

      setTickets([fallbackTicket, ...tickets]);
      setSelectedTicket(fallbackTicket);
      setSuccessMsg(`Ticket #${fallbackTicket.ticketNumber} created successfully!`);
      setNewSubject('');
      setNewMessage('');
      setNewAttachments([]);
      setActiveTab('chat');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;

    setActionLoading(true);
    setError(null);

    const messageText = replyMessage.trim();
    const attachments = [...replyAttachments];
    setReplyMessage('');
    setReplyAttachments([]);

    try {
      const token = localStorage.getItem('auramarket_token') || 'demo_customer_token';
      const res = await fetch(`${apiUrl}/support/tickets/${selectedTicket._id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: messageText,
          attachments,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.data);
        fetchTickets();
      } else {
        throw new Error('Reply failed');
      }
    } catch (_) {
      // Local optimistic update
      const updatedMessages = [
        ...selectedTicket.messages,
        {
          senderRole: 'customer',
          senderName: 'Customer',
          message: messageText,
          attachments,
          createdAt: new Date().toISOString(),
        },
      ];
      const updated = {
        ...selectedTicket,
        status: 'IN_PROGRESS',
        messages: updatedMessages,
      };
      setSelectedTicket(updated);
      setTickets((prev) => prev.map((t) => (t._id === selectedTicket._id ? updated : t)));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulateAgentReply = async () => {
    if (!selectedTicket) return;
    setActionLoading(true);

    try {
      const token = localStorage.getItem('auramarket_token') || 'demo_customer_token';
      const res = await fetch(`${apiUrl}/support/tickets/${selectedTicket._id}/simulate-reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.data);
        fetchTickets();
      } else {
        throw new Error('API simulation error');
      }
    } catch (_) {
      // Simulated response
      const agentReplies = [
        `Hello! Pooja Verma here from AuraMarket Escalations. I have personally investigated ticket #${selectedTicket.ticketNumber}. Our operations team has expedited this and verified full compliance with our 100% satisfaction promise!`,
        `Greetings from AuraMarket Priority Support. We have verified your inquiry with the logistics hub. The parcel tracking telemetry has been refreshed and handover confirmed.`,
        `Thank you for following up! We have approved your resolution and credited any relevant adjustment to your In-App Aura Wallet.`,
      ];
      const randomReply = agentReplies[Math.floor(Math.random() * agentReplies.length)];

      const updatedMessages = [
        ...selectedTicket.messages,
        {
          senderRole: 'agent',
          senderName: 'Pooja Verma (Senior Specialist)',
          message: randomReply,
          attachments: [
            {
              url: 'https://cdn.auramarket.com/support/case_resolution_receipt.pdf',
              fileName: 'case_resolution_receipt.pdf',
              fileSize: 38400,
              fileType: 'application/pdf',
            },
          ],
          createdAt: new Date().toISOString(),
        },
      ];

      const updated = {
        ...selectedTicket,
        status: 'WAITING_CUSTOMER',
        assignedAgent: selectedTicket.assignedAgent || {
          name: 'Pooja Verma',
          email: 'pooja.verma@auramarket.com',
          role: 'agent',
        },
        sla: {
          ...selectedTicket.sla,
          firstRespondedAt: selectedTicket.sla?.firstRespondedAt || new Date().toISOString(),
        },
        messages: updatedMessages,
      };

      setSelectedTicket(updated);
      setTickets((prev) => prev.map((t) => (t._id === selectedTicket._id ? updated : t)));
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveAndRate = async () => {
    if (!selectedTicket) return;
    setActionLoading(true);

    try {
      const token = localStorage.getItem('auramarket_token') || 'demo_customer_token';
      const res = await fetch(`${apiUrl}/support/tickets/${selectedTicket._id}/close`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'RESOLVED',
          satisfactionRating: starRating,
          feedbackComment: feedbackComment.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.data);
        setIsRatingSubmitted(true);
        fetchTickets();
      } else {
        throw new Error('Rating error');
      }
    } catch (_) {
      const updated = {
        ...selectedTicket,
        status: 'RESOLVED',
        satisfactionRating: starRating,
        feedbackComment: feedbackComment.trim(),
        sla: {
          ...selectedTicket.sla,
          resolvedAt: new Date().toISOString(),
        },
      };
      setSelectedTicket(updated);
      setIsRatingSubmitted(true);
      setTickets((prev) => prev.map((t) => (t._id === selectedTicket._id ? updated : t)));
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Attachment Helpers for Demo
  const addSampleAttachment = (type) => {
    let item;
    if (type === 'payment') {
      item = {
        url: 'https://cdn.auramarket.com/support/bank_upi_receipt.png',
        fileName: 'bank_upi_receipt.png',
        fileSize: 452000,
        fileType: 'image/png',
      };
    } else if (type === 'parcel') {
      item = {
        url: 'https://cdn.auramarket.com/support/damaged_box_photo.jpg',
        fileName: 'damaged_box_photo.jpg',
        fileSize: 1048576,
        fileType: 'image/jpeg',
      };
    } else {
      item = {
        url: 'https://cdn.auramarket.com/support/statement_october.pdf',
        fileName: 'statement_october.pdf',
        fileSize: 84000,
        fileType: 'application/pdf',
      };
    }

    if (activeTab === 'new') {
      setNewAttachments([...newAttachments, item]);
    } else {
      setReplyAttachments([...replyAttachments, item]);
    }
  };

  // SLA Time Remaining Calculator
  const getSlaRemainingBadge = (ticket) => {
    if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Resolved
        </span>
      );
    }

    const deadline = ticket.sla?.firstRespondedAt
      ? ticket.sla?.resolutionDeadline
      : ticket.sla?.firstResponseDeadline;

    if (!deadline) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          Standard SLA
        </span>
      );
    }

    const remainingMs = new Date(deadline).getTime() - Date.now();
    const remainingHours = Math.round(remainingMs / (1000 * 3600));

    if (remainingMs < 0 || ticket.sla?.firstResponseBreached || ticket.sla?.resolutionBreached) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1 animate-pulse border border-rose-300">
          <AlertTriangle className="w-3 h-3" /> SLA Escalated
        </span>
      );
    }

    if (remainingHours <= 3) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
          <Clock className="w-3 h-3" /> {remainingHours}h remaining
        </span>
      );
    }

    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-1 border border-emerald-200">
        <Clock className="w-3 h-3 text-emerald-500" /> {remainingHours}h remaining
      </span>
    );
  };

  const filteredTickets = tickets.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.ticketNumber?.toLowerCase().includes(q) ||
      t.subject?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg font-black">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  AuraMarket Priority Care
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase border border-amber-400/30">
                  Point #19 SLA Helpdesk
                </span>
              </div>
              <p className="text-xs text-indigo-200 flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Guaranteed Response Timeframes • Multi-Attachment Threads • Star Ratings
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            title="Close Helpdesk"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Bar */}
        <div className="px-4 sm:px-6 pt-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setActiveTab('tickets')}
              className={`pb-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
                activeTab === 'tickets'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Active Tickets</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-black">
                {tickets.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('new');
                setSelectedTicket(null);
              }}
              className={`pb-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
                activeTab === 'new'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Ticket</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-black">
                2h SLA
              </span>
            </button>

            {selectedTicket && (
              <button
                onClick={() => setActiveTab('chat')}
                className={`pb-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
                  activeTab === 'chat'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Headphones className="w-4 h-4 text-emerald-500" />
                <span className="truncate max-w-[140px] sm:max-w-xs font-mono">
                  {selectedTicket.ticketNumber}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </button>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 pb-2 text-[11px] text-slate-500">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>Support Desk: <strong>Online (Average Wait: 8 mins)</strong></span>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* Banner Messages */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{successMsg}</span>
              </div>
              <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TAB 1: ACTIVE TICKETS LIST */}
          {activeTab === 'tickets' && (
            <div className="space-y-4">
              {/* Search & Status Filter Strip */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by ticket #, subject or category..."
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {['ALL', 'OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                        statusFilter === st
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                  <button
                    onClick={fetchTickets}
                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                    title="Refresh Tickets"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Tickets Listing */}
              {loading ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
                  <p className="text-xs">Fetching your support tickets...</p>
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="py-16 text-center space-y-3 bg-slate-50 dark:bg-slate-850/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <LifeBuoy className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    No Support Tickets Found
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {statusFilter !== 'ALL'
                      ? `You don't have any tickets in '${statusFilter}' status.`
                      : 'Have an inquiry or issue with an order? Open a ticket to receive guaranteed SLA support.'}
                  </p>
                  <button
                    onClick={() => setActiveTab('new')}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow"
                  >
                    Create New Ticket
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTickets.map((ticket) => {
                    const priorityMeta = PRIORITIES.find((p) => p.id === ticket.priority) || PRIORITIES[2];
                    const catMeta = CATEGORIES.find((c) => c.id === ticket.category) || CATEGORIES[6];
                    const CatIcon = catMeta.icon;

                    return (
                      <div
                        key={ticket._id}
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setActiveTab('chat');
                        }}
                        className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/50 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 group-hover:underline">
                              {ticket.ticketNumber}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase ${priorityMeta.badgeClass}`}>
                              {ticket.priority}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-1">
                              <CatIcon className="w-3 h-3" />
                              {catMeta.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {getSlaRemainingBadge(ticket)}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                ticket.status === 'RESOLVED'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : ticket.status === 'IN_PROGRESS'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : ticket.status === 'WAITING_CUSTOMER'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {ticket.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2.5 flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {ticket.subject}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                              {ticket.messages && ticket.messages.length > 0
                                ? ticket.messages[ticket.messages.length - 1].message
                                : 'No messages yet.'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {ticket.messages && ticket.messages.length > 0 && (
                              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                <MessageSquare className="w-3.5 h-3.5" />
                                {ticket.messages.length}
                              </span>
                            )}
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>

                        {ticket.assignedAgent && (
                          <div className="mt-2.5 pt-2 border-t border-slate-50 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                            <span className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-indigo-500" />
                              Assigned Agent: <strong className="text-slate-700 dark:text-slate-300">{ticket.assignedAgent.name}</strong>
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Created {new Date(ticket.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CREATE NEW TICKET */}
          {activeTab === 'new' && (
            <form onSubmit={handleCreateTicket} className="space-y-5 max-w-2xl mx-auto">
              
              {/* Dynamic SLA Guarantee Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 border border-amber-300/40 dark:border-amber-500/30 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-black text-amber-900 dark:text-amber-300">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>AuraMarket SLA Delivery Guarantee</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
                  Based on your chosen priority, our specialized support engineers will respond within{' '}
                  <strong className="text-indigo-600 dark:text-indigo-400">
                    {PRIORITIES.find((p) => p.id === newPriority)?.responseSla || '24 Hours'}
                  </strong>{' '}
                  and guarantee complete resolution within{' '}
                  <strong className="text-indigo-600 dark:text-indigo-400">
                    {PRIORITIES.find((p) => p.id === newPriority)?.resolutionSla || '48 Hours'}
                  </strong>.
                </p>
              </div>

              {/* Category Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  1. Select Inquiry Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => {
                    const CatIcon = cat.icon;
                    const isSelected = newCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setNewCategory(cat.id)}
                        className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-2 ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${cat.color}`}>
                          <CatIcon className="w-4 h-4" />
                        </div>
                        <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                          {cat.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority Selector with SLA Details */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  2. Select Priority Level (SLA Guarantee)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PRIORITIES.map((p) => {
                    const PIcon = p.icon;
                    const isSelected = newPriority === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setNewPriority(p.id)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <PIcon className={`w-4 h-4 ${p.id === 'URGENT' ? 'text-rose-500' : p.id === 'HIGH' ? 'text-amber-500' : 'text-indigo-500'}`} />
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {p.label}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${p.badgeClass}`}>
                            {p.responseSla} Response
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{p.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Linked Order ID */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  3. Related Order Number (Optional)
                </label>
                <input
                  type="text"
                  value={newOrderId}
                  onChange={(e) => setNewOrderId(e.target.value)}
                  placeholder="e.g. ORD-1792206-891 or leave empty"
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  4. Ticket Subject *
                </label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Brief summary of your inquiry..."
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              {/* Message Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  5. Detailed Description *
                </label>
                <textarea
                  rows={4}
                  required
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Please provide complete details, steps taken, dates, and order references..."
                  className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Attachments Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    6. Attachments & Proof Files ({newAttachments.length})
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">Sample quick attach:</span>
                    <button
                      type="button"
                      onClick={() => addSampleAttachment('payment')}
                      className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200"
                    >
                      + Payment SMS
                    </button>
                    <button
                      type="button"
                      onClick={() => addSampleAttachment('parcel')}
                      className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200"
                    >
                      + Box Photo
                    </button>
                  </div>
                </div>

                {newAttachments.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {newAttachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Paperclip className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                            {att.fileName}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewAttachments(newAttachments.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Action */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('tickets')}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md flex items-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {actionLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Creating Ticket...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Submit Support Ticket
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: TICKET THREAD & LIVE CHAT */}
          {activeTab === 'chat' && selectedTicket && (
            <div className="flex flex-col h-[65vh] max-h-[600px] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900">
              
              {/* Ticket Top Strip */}
              <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setActiveTab('tickets')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Back to Tickets"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                        {selectedTicket.ticketNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {selectedTicket.category?.replace('_', ' ')}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          selectedTicket.status === 'RESOLVED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {selectedTicket.status}
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1 mt-0.5">
                      {selectedTicket.subject}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Demo Tool: Simulate Agent Reply */}
                  <button
                    type="button"
                    onClick={handleSimulateAgentReply}
                    disabled={actionLoading}
                    className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-[11px] font-bold border border-purple-200 dark:border-purple-800 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                    title="Simulate immediate response from support specialist Pooja Verma"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                    <span className="hidden sm:inline">Simulate Agent Reply</span>
                    <span className="sm:hidden">Simulate</span>
                  </button>
                </div>
              </div>

              {/* Chat Thread Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Agent Header / SLA Banner inside chat */}
                <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                      PV
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        <span>Pooja Verma</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[10px] font-normal text-slate-400">• Lead Support Engineer</span>
                      </p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                        Active Now • Dedicated SLA Desk
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    {getSlaRemainingBadge(selectedTicket)}
                  </div>
                </div>

                {/* Message Bubbles */}
                {selectedTicket.messages?.map((msg, index) => {
                  const isCustomer = msg.senderRole === 'customer';
                  return (
                    <div
                      key={index}
                      className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400">
                        <span className="font-bold text-slate-600 dark:text-slate-300">
                          {isCustomer ? 'You' : msg.senderName || 'Support Specialist'}
                        </span>
                        <span>•</span>
                        <span>{new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div
                        className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl shadow-sm text-xs leading-relaxed space-y-2 ${
                          isCustomer
                            ? 'bg-indigo-600 text-white rounded-tr-none'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.message}</p>

                        {/* Attachments if any */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="pt-2 border-t border-white/20 dark:border-slate-700/80 space-y-1.5">
                            {msg.attachments.map((att, aIdx) => (
                              <a
                                key={aIdx}
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                className={`p-2 rounded-xl flex items-center justify-between gap-2 text-[11px] transition ${
                                  isCustomer
                                    ? 'bg-indigo-700/80 hover:bg-indigo-800 text-white'
                                    : 'bg-slate-50 dark:bg-slate-750 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <FileText className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate font-semibold">{att.fileName}</span>
                                </div>
                                <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Rating Card when Resolved or Open */}
                {selectedTicket.status === 'RESOLVED' ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                    <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      Case Resolved & Verified
                    </h4>
                    {selectedTicket.satisfactionRating && (
                      <div className="flex items-center justify-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${
                              s <= selectedTicket.satisfactionRating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                    {selectedTicket.feedbackComment && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                        "{selectedTicket.feedbackComment}"
                      </p>
                    )}
                  </div>
                ) : (
                  /* Option to mark resolved & rate */
                  <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-slate-800/60 border border-amber-200/60 dark:border-slate-700 text-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        Is your inquiry resolved? Rate your support experience:
                      </p>
                      <span className="text-[10px] text-slate-500">1-Click Resolution</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setStarRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1 text-slate-300 hover:scale-110 transition-transform"
                          >
                            <Star
                              className={`w-5 h-5 ${
                                star <= (hoverRating || starRating)
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>

                      <input
                        type="text"
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        placeholder="Optional feedback comment..."
                        className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                      />

                      <button
                        type="button"
                        onClick={handleResolveAndRate}
                        disabled={actionLoading}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm shrink-0"
                      >
                        Close & Rate
                      </button>
                    </div>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Bar */}
              {selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'CLOSED' && (
                <div className="p-3 bg-white dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  {replyAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {replyAttachments.map((att, idx) => (
                        <div
                          key={idx}
                          className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-[11px] flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span className="font-semibold">{att.fileName}</span>
                          <button
                            type="button"
                            onClick={() => setReplyAttachments(replyAttachments.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => addSampleAttachment('payment')}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                      title="Attach Payment Proof / Screenshot"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    <input
                      type="text"
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply();
                        }
                      }}
                      placeholder="Type your reply to the support agent..."
                      className="flex-1 px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />

                    <button
                      type="button"
                      onClick={handleSendReply}
                      disabled={!replyMessage.trim() || actionLoading}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-sm flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>256-Bit Encrypted Support Session • ISO 27001 Certified Helpdesk</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
