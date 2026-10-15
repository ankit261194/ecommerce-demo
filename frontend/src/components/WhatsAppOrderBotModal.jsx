import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Phone,
  CheckCheck,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  Package,
  KeyRound,
  AlertTriangle,
  Headphones,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import api from '../api/client';

/**
 * Point #71: 1-Click WhatsApp Order Confirmation & Tracking Bot Engine
 * Features:
 * - 1-Click Open in Official WhatsApp with complete formatted order confirmation
 * - Interactive in-browser WhatsApp Bot Simulator with live natural language intent answering
 * - Quick action command chips (TRACK, OTP, CANCEL, SUPPORT)
 * - Copy WhatsApp notification payload to clipboard
 */
export const WhatsAppOrderBotModal = ({ isOpen, onClose, order }) => {
  if (!isOpen || !order) return null;

  const [orderSummary, setOrderSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [copied, setCopied] = useState(false);

  // Chat simulator state
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef(null);

  const orderNum = order.orderNumber || order.subOrderId || order._id || 'ORD-DEMO';
  const phone = order.shippingAddress?.phone || order.customer?.phone || '9876543210';

  useEffect(() => {
    fetchWhatsAppConfirmation();
  }, [order]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const fetchWhatsAppConfirmation = async () => {
    setLoadingSummary(true);
    try {
      const res = await api.post('/whatsapp/order-confirmation', {
        orderId: order._id || orderNum,
        phone,
      });

      if (res.data?.success) {
        setOrderSummary(res.data.data);
        // Seed initial bot greeting in simulator
        setMessages([
          {
            id: 'bot-1',
            sender: 'bot',
            text: res.data.data.formattedMessage,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          {
            id: 'bot-2',
            sender: 'bot',
            text: `👋 Need fast updates? Reply with *TRACK*, *OTP*, or *SUPPORT* below!`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err) {
      console.warn('[WhatsApp] Fallback local generation:', err.message);
      const fallbackMsg = `*🛍️ AURAMARKET — ORDER CONFIRMED!*\n━━━━━━━━━━━━━━━━━━━━\n📦 *Order ID:* #${orderNum}\n💰 *Amount:* ₹${(order.totalAmount || 1299).toLocaleString('en-IN')}\n🔐 *Secret Handover OTP:* *${order.deliveryOtp || '4821'}*\n━━━━━━━━━━━━━━━━━━━━\n🔗 *Live GPS Tracking:* https://shribalajikripadham.online/ecommerce-demo/#order-track?id=${orderNum}`;
      const waUrl = `https://wa.me/91${phone.replace(/[^0-9]/g, '').slice(-10)}?text=${encodeURIComponent(fallbackMsg)}`;

      setOrderSummary({
        orderNumber: orderNum,
        totalAmount: order.totalAmount || 1299,
        deliveryOtp: order.deliveryOtp || '4821',
        formattedMessage: fallbackMsg,
        whatsappUrl: waUrl,
        trackingUrl: `https://shribalajikripadham.online/ecommerce-demo/#order-track?id=${orderNum}`,
      });

      setMessages([
        {
          id: 'bot-1',
          sender: 'bot',
          text: fallbackMsg,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleSendMessage = async (customText = null) => {
    const textToSend = (customText || inputQuery).trim();
    if (!textToSend) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    try {
      const res = await api.post('/whatsapp/bot-query', {
        query: textToSend,
        phone,
        orderNumber: orderNum,
      });

      if (res.data?.success) {
        setTimeout(() => {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: `bot-${Date.now()}`,
              sender: 'bot',
              text: res.data.data.reply,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }, 500);
      }
    } catch (err) {
      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: `🤖 *AuraMarket Bot Response*\nYour order #${orderNum} is active.\n🔐 Secret Delivery OTP: *${order.deliveryOtp || '4821'}*\nStatus: *Out for Delivery*\n\nType *SUPPORT* for help.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }, 500);
    }
  };

  const handleCopy = () => {
    if (orderSummary?.formattedMessage) {
      navigator.clipboard.writeText(orderSummary.formattedMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const quickChips = [
    { label: '📦 Track Status', query: `TRACK #${orderNum}` },
    { label: '🔐 Get Delivery OTP', query: `OTP #${orderNum}` },
    { label: '❌ Cancel Order', query: `CANCEL #${orderNum}` },
    { label: '💬 Talk to Support', query: 'SUPPORT' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0b141a] rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-emerald-900/40 flex flex-col h-[90vh] max-h-[720px] text-slate-100">
        {/* WhatsApp Header */}
        <div className="px-4 py-3 bg-[#202c33] border-b border-[#2a3942] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center text-white shadow-sm font-bold text-lg">
                <MessageSquare className="w-5 h-5 fill-current" />
              </div>
              <span className="w-3 h-3 rounded-full bg-emerald-400 absolute bottom-0 right-0 border-2 border-[#202c33]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm text-slate-100">AuraMarket WhatsApp Bot</h3>
                <span className="p-0.5 rounded-full bg-[#00a884] text-white">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Point #71
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Official Order Tracking & Notification Engine • Online
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (orderSummary?.whatsappUrl) {
                  window.open(orderSummary.whatsappUrl, '_blank', 'noopener,noreferrer');
                }
              }}
              className="p-2 rounded-xl text-emerald-400 hover:text-white hover:bg-[#111b21] transition-colors"
              title="Open Official WhatsApp"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#111b21] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 1-Click Action Hub Bar */}
        <div className="px-4 py-2.5 bg-[#111b21] border-b border-[#2a3942] flex flex-wrap items-center justify-between gap-2 text-xs flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Order:</span>
            <strong className="text-white font-mono">#{orderNum}</strong>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[11px] border border-emerald-500/30 flex items-center gap-1">
              <KeyRound className="w-3 h-3 text-emerald-400" />
              OTP: {orderSummary?.deliveryOtp || '4821'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-2.5 py-1 rounded-lg bg-[#202c33] hover:bg-[#2a3942] text-slate-200 text-[11px] font-bold flex items-center gap-1 transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Text</span>
                </>
              )}
            </button>

            <a
              href={orderSummary?.whatsappUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 rounded-lg bg-[#00a884] hover:bg-[#008f6f] text-[#0b141a] font-black text-[11px] flex items-center gap-1.5 shadow-sm transition-all"
            >
              <MessageSquare className="w-3 h-3 fill-current" />
              <span>Open in WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Chat History Canvas */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a]"
          style={{
            backgroundImage: `radial-gradient(#1f2c34 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        >
          {loadingSummary ? (
            <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              <span className="text-xs">Preparing WhatsApp Bot stream...</span>
            </div>
          ) : (
            messages.map((msg) => {
              const isBot = msg.sender === 'bot';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm leading-relaxed whitespace-pre-line ${
                      isBot
                        ? 'bg-[#202c33] text-slate-100 rounded-tl-none border border-[#2a3942]'
                        : 'bg-[#005c4b] text-white rounded-tr-none'
                    }`}
                  >
                    <div>{msg.text}</div>
                    <div
                      className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                        isBot ? 'text-slate-400' : 'text-emerald-200'
                      }`}
                    >
                      <span>{msg.time}</span>
                      {!isBot && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-[#202c33] border border-[#2a3942] rounded-2xl rounded-tl-none px-3.5 py-2 text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
                <span className="text-[11px] ml-1">Assistant is typing...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Quick Action Suggestion Chips */}
        <div className="px-3 py-2 bg-[#111b21] border-t border-[#2a3942] flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-shrink-0">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider pl-1">
            Try:
          </span>
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip.query)}
              className="px-2.5 py-1 rounded-full bg-[#202c33] hover:bg-[#2a3942] text-slate-300 hover:text-white text-[11px] font-semibold whitespace-nowrap transition-all border border-[#2a3942]"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-[#202c33] border-t border-[#2a3942] flex items-center gap-2 flex-shrink-0">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
            placeholder="Type 'TRACK', 'OTP', 'CANCEL', or 'SUPPORT'..."
            className="flex-1 bg-[#2a3942] text-slate-100 placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-xl border-none focus:outline-none focus:ring-1 focus:ring-[#00a884]"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputQuery.trim()}
            className="w-10 h-10 rounded-xl bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-40 disabled:hover:bg-[#00a884] text-[#0b141a] flex items-center justify-center transition-all flex-shrink-0"
          >
            <Send className="w-4 h-4 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppOrderBotModal;
