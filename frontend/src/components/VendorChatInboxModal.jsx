import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  X,
  Search,
  CheckCircle2,
  Clock,
  User,
  ShoppingBag,
  RefreshCw,
  Filter,
  Check,
  CheckCheck,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Archive,
  Store,
} from 'lucide-react';

const CANNED_REPLIES = [
  '✅ Yes, this item is available in stock and ready for immediate dispatch!',
  '🚚 Orders confirmed before 3 PM are handed over to express courier the same day.',
  '🛡️ Yes, this product includes 100% genuine brand warranty valid across India.',
  '🧾 Official GST tax invoice is generated automatically and enclosed in the parcel.',
  '🔄 We offer hassle-free 7-day replacement if there is any transit defect.',
  '💬 Please share your Sub-Order ID and we will check live tracking immediately.',
];

export default function VendorChatInboxModal({
  isOpen,
  onClose,
  vendorToken,
  storeName,
}) {
  const [inquiries, setInquiries] = useState([]);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | unread | open | resolved
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [summary, setSummary] = useState({ totalInquiries: 0, openCount: 0, resolvedCount: 0, totalUnread: 0 });
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const getAuthToken = () => {
    return (
      vendorToken ||
      localStorage.getItem('vendorToken') ||
      localStorage.getItem('token') ||
      localStorage.getItem('auramarket_token')
    );
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSummary = async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await fetch('/api/chat/vendor/summary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setSummary(json.data);
      }
    } catch (err) {
      // silent
    }
  };

  const fetchInquiries = async (silent = false) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      if (!silent) setLoading(true);
      setError(null);

      const url = statusFilter === 'all'
        ? '/api/chat/vendor/inquiries'
        : `/api/chat/vendor/inquiries?status=${statusFilter}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        const list = json.data || [];
        setInquiries(list);

        // Keep selected inquiry updated
        if (selectedInquiry) {
          const current = list.find((i) => i._id === selectedInquiry._id);
          if (current) {
            setSelectedInquiry(current);
            setMessages(current.messages || []);
          }
        } else if (list.length > 0 && !silent) {
          // Select first inquiry by default
          handleSelectInquiry(list[0]);
        }
      }
    } catch (err) {
      if (!silent) setError('Failed to retrieve inquiries.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSelectInquiry = async (inq) => {
    setSelectedInquiry(inq);
    setMessages(inq.messages || []);
    const token = getAuthToken();
    if (!token) return;

    // Fetch detail to mark vendor unread as 0
    try {
      const res = await fetch(`/api/chat/vendor/inquiries/${inq._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setSelectedInquiry(json.data);
        setMessages(json.data.messages || []);
        fetchSummary();
      }
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSummary();
      fetchInquiries();
      const interval = setInterval(() => {
        fetchInquiries(true);
        fetchSummary();
      }, 4000);
      return () => clearInterval(interval);
    } else {
      setSelectedInquiry(null);
      setMessages([]);
      setReplyText('');
      setError(null);
    }
  }, [isOpen, statusFilter]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendReply = async (customText = null) => {
    const textToSend = customText || replyText;
    if (!textToSend || !textToSend.trim() || !selectedInquiry || sending) return;

    const token = getAuthToken();
    if (!token) return;

    try {
      setSending(true);
      setError(null);

      const res = await fetch(`/api/chat/vendor/inquiries/${selectedInquiry._id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: textToSend.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedInquiry(data.data);
        setMessages(data.data.messages || []);
        setReplyText('');
        fetchInquiries(true);
        fetchSummary();
      } else {
        setError(data.message || 'Failed to dispatch reply.');
      }
    } catch (err) {
      setError('Network error sending reply.');
    } finally {
      setSending(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedInquiry) return;
    const token = getAuthToken();
    if (!token) return;

    const newStatus = selectedInquiry.status === 'resolved' ? 'open' : 'resolved';
    try {
      const res = await fetch(`/api/chat/vendor/inquiries/${selectedInquiry._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedInquiry(data.data);
        fetchInquiries(true);
        fetchSummary();
      }
    } catch (err) {
      // ignore
    }
  };

  if (!isOpen) return null;

  const filteredInquiries = inquiries.filter((inq) => {
    if (statusFilter === 'unread') {
      if ((inq.unreadByVendor || 0) <= 0) return false;
    } else if (statusFilter === 'open') {
      if (inq.status !== 'open' && inq.status !== 'in_progress') return false;
    } else if (statusFilter === 'resolved') {
      if (inq.status !== 'resolved') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const customerName = inq.customer?.name?.toLowerCase() || '';
      const productTitle = inq.productSnapshot?.title?.toLowerCase() || '';
      const lastMsg = inq.lastMessage?.toLowerCase() || '';
      return customerName.includes(q) || productTitle.includes(q) || lastMsg.includes(q);
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />

      {/* Main Container */}
      <div className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col h-[750px] max-h-[94vh] animate-scale-up">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-wide">
                  Customer Inquiries & Live Chat Desk
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-400 text-slate-950">
                  Point #14
                </span>
                {summary.totalUnread > 0 && (
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-500 text-white animate-pulse">
                    {summary.totalUnread} Unread
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Live buyer questions for {storeName || 'Merchant Store'} with 1-click canned replies & resolution tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchSummary();
                fetchInquiries();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all flex items-center gap-1.5 text-xs font-bold"
              title="Refresh inbox"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              title="Close chat desk"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs shrink-0 font-bold">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-black block">Total Inquiries</span>
              <span className="text-sm font-black text-slate-900">{summary.totalInquiries}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <Clock className="w-4 h-4 text-amber-500" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-black block">Open / Active</span>
              <span className="text-sm font-black text-amber-600">{summary.openCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-black block">Resolved</span>
              <span className="text-sm font-black text-emerald-600">{summary.resolvedCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-black block">Unread By Store</span>
              <span className="text-sm font-black text-red-600">{summary.totalUnread}</span>
            </div>
          </div>
        </div>

        {/* Dual-Pane Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT PANE: Inquiries List */}
          <div className="w-full sm:w-80 md:w-96 border-r border-slate-200 flex flex-col bg-slate-50/60 shrink-0">
            {/* Search & Filter */}
            <div className="p-3 space-y-2 border-b border-slate-200 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search buyer, product, message..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-100 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-black">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'unread', label: `Unread (${summary.totalUnread || 0})` },
                  { id: 'open', label: 'Open' },
                  { id: 'resolved', label: 'Resolved' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                      statusFilter === tab.id
                        ? 'bg-slate-900 text-amber-400 shadow-xs'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inquiries Thread List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredInquiries.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No inquiries matching filter.
                </div>
              ) : (
                filteredInquiries.map((inq) => {
                  const isSelected = selectedInquiry?._id === inq._id;
                  const hasUnread = (inq.unreadByVendor || 0) > 0;
                  const timeAgo = inq.lastMessageAt
                    ? new Date(inq.lastMessageAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })
                    : '';

                  return (
                    <button
                      key={inq._id}
                      type="button"
                      onClick={() => handleSelectInquiry(inq)}
                      className={`w-full text-left p-3.5 transition-all flex items-start gap-3 relative ${
                        isSelected
                          ? 'bg-amber-50/80 border-l-4 border-amber-500 shadow-2xs'
                          : 'hover:bg-white bg-transparent'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-2xl bg-slate-900 text-amber-400 font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                        {inq.customer?.name ? inq.customer.name.charAt(0).toUpperCase() : 'C'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-black text-xs text-slate-900 truncate">
                            {inq.customer?.name || 'Customer'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold shrink-0">{timeAgo}</span>
                        </div>

                        {/* Product Title */}
                        {inq.productSnapshot?.title && (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 truncate mb-1">
                            <ShoppingBag className="w-3 h-3 shrink-0" />
                            <span className="truncate">{inq.productSnapshot.title}</span>
                          </div>
                        )}

                        <p className="text-xs text-slate-500 font-medium truncate">
                          {inq.lastMessage || 'No messages yet'}
                        </p>

                        <div className="flex items-center justify-between gap-2 mt-1.5">
                          <span
                            className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              inq.status === 'resolved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inq.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {inq.status}
                          </span>

                          {hasUnread && (
                            <span className="w-5 h-5 rounded-full bg-red-500 text-white font-black text-[10px] flex items-center justify-center shadow-xs">
                              {inq.unreadByVendor}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANE: Selected Conversation Thread */}
          {selectedInquiry ? (
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
              {/* Conversation Top Header */}
              <div className="px-6 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-sm text-slate-900">
                        {selectedInquiry.customer?.name || 'Valued Customer'}
                      </h3>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          selectedInquiry.status === 'resolved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : selectedInquiry.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {selectedInquiry.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {selectedInquiry.customer?.email || 'Customer Account'} • {selectedInquiry.customer?.phone || 'Verified Buyer'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleStatus}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs ${
                      selectedInquiry.status === 'resolved'
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {selectedInquiry.status === 'resolved' ? 'Reopen Inquiry' : 'Mark as Resolved'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Product Context Banner */}
              {selectedInquiry.productSnapshot && (
                <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 text-xs shrink-0">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {selectedInquiry.productSnapshot.image && (
                      <img
                        src={selectedInquiry.productSnapshot.image}
                        alt="Product"
                        className="w-9 h-9 rounded-xl object-cover border border-slate-200 bg-white shrink-0"
                      />
                    )}
                    <div className="truncate">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                        Customer Inquiring About:
                      </span>
                      <span className="font-extrabold text-slate-900 truncate block">
                        {selectedInquiry.productSnapshot.title}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {selectedInquiry.productSnapshot.price && (
                      <span className="font-black text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                        ₹{Number(selectedInquiry.productSnapshot.price).toLocaleString('en-IN')}
                      </span>
                    )}
                    {selectedInquiry.productSnapshot.sku && (
                      <span className="text-[10px] text-slate-500 font-bold bg-slate-200/60 px-2 py-0.5 rounded">
                        SKU: {selectedInquiry.productSnapshot.sku}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-slate-50/50">
                {messages.map((msg, index) => {
                  const isVendor = msg.sender === 'vendor';
                  const timeStr = msg.timestamp
                    ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';

                  return (
                    <div
                      key={index}
                      className={`flex items-end gap-2 ${isVendor ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isVendor && (
                        <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-black shrink-0 shadow-2xs">
                          <User className="w-4 h-4" />
                        </div>
                      )}

                      <div
                        className={`max-w-[78%] rounded-2xl p-3.5 shadow-xs text-xs leading-relaxed ${
                          isVendor
                            ? 'bg-slate-900 text-white rounded-br-sm'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <span
                            className={`font-black text-[11px] ${
                              isVendor ? 'text-amber-400' : 'text-slate-900'
                            }`}
                          >
                            {isVendor ? (msg.senderName || storeName) : (msg.senderName || 'Customer')}
                          </span>
                          <span className="text-[10px] text-slate-400">{timeStr}</span>
                        </div>

                        <p className="whitespace-pre-wrap font-medium">{msg.text}</p>

                        {isVendor && (
                          <div className="flex justify-end items-center gap-1 mt-1 text-[10px] text-slate-400">
                            {msg.read ? (
                              <CheckCheck className="w-3.5 h-3.5 text-amber-400 inline" />
                            ) : (
                              <Check className="w-3.5 h-3.5 inline" />
                            )}
                          </div>
                        )}
                      </div>

                      {isVendor && (
                        <div className="w-8 h-8 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center text-xs font-black shrink-0 shadow-2xs">
                          <Store className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* 1-Click Canned Reply Chips */}
              <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 overflow-x-auto flex items-center gap-2 text-[11px] font-bold scrollbar-none shrink-0">
                <span className="text-slate-400 uppercase text-[10px] font-black shrink-0">1-Click Replies:</span>
                {CANNED_REPLIES.map((reply, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendReply(reply)}
                    className="px-2.5 py-1 rounded-xl bg-white hover:bg-amber-100 hover:border-amber-300 border border-slate-200 text-slate-800 whitespace-nowrap shadow-2xs transition-all active:scale-95"
                  >
                    {reply}
                  </button>
                ))}
              </div>

              {/* Composer */}
              <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendReply();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type official store reply to customer... (Press Enter to send)"
                    disabled={sending}
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() || sending}
                    className="px-5 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black rounded-2xl shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
                  >
                    {sending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span className="text-xs">Reply</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center p-8 bg-slate-50/50">
              <MessageSquare className="w-12 h-12 mb-3 text-slate-300" />
              <h4 className="font-black text-slate-800 text-sm">No Conversation Selected</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Select an inquiry from the left panel to review buyer questions, check product specs, and dispatch instant official replies.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
