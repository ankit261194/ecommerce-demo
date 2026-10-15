import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  MessageSquare,
  Send,
  X,
  Store,
  User,
  RefreshCw,
  Check,
  CheckCheck,
  Clock,
  Sparkles,
  ShoppingBag,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

const QUICK_CHIPS = [
  '📦 Is this item currently in stock?',
  '🚚 How soon can this be dispatched?',
  '🛡️ Does this product include official brand warranty?',
  '🧾 Can you provide a GST tax invoice with this purchase?',
  '🔄 What is the replacement process if damaged in transit?',
];

export default function CustomerVendorChatModal({
  isOpen,
  onClose,
  product,
  vendor,
}) {
  const [inquiry, setInquiry] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const getAuthToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('auramarket_token');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch or locate existing inquiry thread
  const fetchInquiryThread = async (silent = false) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      if (!silent) setLoading(true);
      setError(null);

      const res = await fetch('/api/chat/customer/inquiries', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const json = await res.json();
        const vendorId = vendor?._id || product?.vendor?._id || product?.vendor;
        const prodId = product?._id;

        // Find relevant thread for this vendor & product
        const matched = json.data?.find((inq) => {
          const inqVendorId = inq.vendor?._id || inq.vendor;
          const inqProdId = inq.product?._id || inq.product;
          return (
            String(inqVendorId) === String(vendorId) &&
            (!prodId || !inqProdId || String(inqProdId) === String(prodId))
          );
        });

        if (matched) {
          // Fetch full conversation thread to mark vendor messages as read
          const detailRes = await fetch(`/api/chat/customer/inquiries/${matched._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (detailRes.ok) {
            const detailJson = await detailRes.json();
            setInquiry(detailJson.data);
            setMessages(detailJson.data.messages || []);
          } else {
            setInquiry(matched);
            setMessages(matched.messages || []);
          }
        }
      }
    } catch (err) {
      if (!silent) setError('Unable to connect to live chat service.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInquiryThread();
      const interval = setInterval(() => {
        fetchInquiryThread(true);
      }, 4000);
      return () => clearInterval(interval);
    } else {
      setInquiry(null);
      setMessages([]);
      setInputText('');
      setError(null);
    }
  }, [isOpen, product, vendor]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (customText = null) => {
    const textToSend = customText || inputText;
    if (!textToSend || !textToSend.trim() || sending) return;

    const token = getAuthToken();
    if (!token) {
      setError('Please sign in to message this merchant.');
      return;
    }

    try {
      setSending(true);
      setError(null);

      const vendorId = vendor?._id || product?.vendor?._id || product?.vendor;
      const productId = product?._id;

      if (inquiry && inquiry._id) {
        // Send follow-up reply to existing thread
        const res = await fetch(`/api/chat/customer/inquiries/${inquiry._id}/reply`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text: textToSend }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setInquiry(data.data);
          setMessages(data.data.messages || []);
          setInputText('');
        } else {
          setError(data.message || 'Failed to send message.');
        }
      } else {
        // Create initial inquiry thread
        const res = await fetch('/api/chat/inquiries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            vendorId,
            productId,
            text: textToSend,
            subject: product ? `Inquiry about ${product.title}` : `Inquiry for ${vendor?.storeName || 'Merchant'}`,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setInquiry(data.data);
          setMessages(data.data.messages || []);
          setInputText('');
        } else {
          setError(data.message || 'Failed to initiate inquiry.');
        }
      }
    } catch (err) {
      setError('Network error while dispatching message.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  const storeName = vendor?.storeName || product?.vendor?.storeName || 'Official Merchant Store';
  const productTitle = product?.title || 'General Store Inquiry';
  const productPrice = product?.sellingPrice || product?.price;
  const productImg = product?.thumbnail || (product?.images && product.images[0]) || '';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col h-[650px] max-h-[92vh] animate-scale-up">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-white tracking-wide truncate max-w-[200px] sm:max-w-xs">
                  {storeName}
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-400 text-slate-950">
                  Point #14
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5 font-medium">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Verified Merchant • Usually responds in 1 hour</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchInquiryThread()}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              title="Refresh conversation"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              title="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Product Reference Card */}
        {product && (
          <div className="px-5 py-3 bg-amber-50/70 border-b border-amber-200/60 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 overflow-hidden">
              {productImg ? (
                <img
                  src={productImg}
                  alt={productTitle}
                  className="w-10 h-10 rounded-xl object-cover border border-amber-200 shrink-0 bg-white"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-amber-200/60 flex items-center justify-center text-amber-800 shrink-0 font-bold text-xs">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              )}
              <div className="truncate">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">
                  Discussing Product
                </span>
                <p className="font-extrabold text-xs text-slate-900 truncate max-w-md">
                  {productTitle}
                </p>
              </div>
            </div>
            {productPrice && (
              <span className="text-xs font-black text-slate-950 px-2.5 py-1 bg-white border border-amber-200 rounded-lg shrink-0 shadow-xs">
                ₹{Number(productPrice).toLocaleString('en-IN')}
              </span>
            )}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-xs font-bold flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Chat Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-50/50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-sm">
                <MessageSquare className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-sm">Direct Customer-to-Merchant Chat</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Have questions about specifications, availability, warranty, or shipping?
                  Send a message below and {storeName} will reply directly!
                </p>
              </div>

              {/* Quick Inquiry Chips */}
              <div className="w-full pt-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                  Frequently Asked Questions (Click to Ask):
                </span>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {QUICK_CHIPS.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(chip)}
                      className="text-left text-xs font-semibold px-3 py-1.5 rounded-xl bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-700 transition-all shadow-xs active:scale-95"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center my-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-xs">
                  Inquiry Started • Direct Channel
                </span>
              </div>

              {messages.map((msg, index) => {
                const isCustomer = msg.sender === 'customer';
                const timeStr = msg.timestamp
                  ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '';

                return (
                  <div
                    key={index}
                    className={`flex items-end gap-2 ${isCustomer ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isCustomer && (
                      <div className="w-8 h-8 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                        <Store className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-[78%] rounded-2xl p-3.5 shadow-sm text-xs leading-relaxed ${
                        isCustomer
                          ? 'bg-slate-900 text-white rounded-br-sm'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span
                          className={`font-black text-[11px] ${
                            isCustomer ? 'text-amber-400' : 'text-slate-900'
                          }`}
                        >
                          {isCustomer ? 'You' : msg.senderName || storeName}
                        </span>
                        <span className={`text-[10px] ${isCustomer ? 'text-slate-400' : 'text-slate-400'}`}>
                          {timeStr}
                        </span>
                      </div>

                      <p className="whitespace-pre-wrap font-medium">{msg.text}</p>

                      <div className="flex justify-end items-center gap-1 mt-1 text-[10px]">
                        {isCustomer && (
                          <span className="text-slate-400">
                            {msg.read ? (
                              <CheckCheck className="w-3.5 h-3.5 text-amber-400 inline" />
                            ) : (
                              <Check className="w-3.5 h-3.5 inline" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {isCustomer && (
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Canned Quick Actions Bar (if thread already started) */}
        {messages.length > 0 && (
          <div className="px-4 py-1.5 bg-slate-100/70 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px] scrollbar-none">
            <span className="text-slate-400 font-bold shrink-0">Quick Ask:</span>
            {['In stock?', 'Dispatch time?', 'GST invoice?', 'Warranty valid?'].map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setInputText(q)}
                className="px-2.5 py-0.5 rounded-lg bg-white hover:bg-amber-100 border border-slate-200 text-slate-700 font-bold whitespace-nowrap shadow-2xs transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${storeName}... (Press Enter to send)`}
              disabled={sending}
              className="flex-1 bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="px-4 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black rounded-2xl shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
            >
              {sending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">Send</span>
                </>
              )}
            </button>
          </form>
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 mt-1 font-medium">
            <span>Powered by AuraMarket Live Inquiry Protocol</span>
            <span>Real-time polling active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
