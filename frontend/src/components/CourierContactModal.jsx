import React, { useState } from 'react';
import {
  PhoneCall,
  MessageSquare,
  X,
  Copy,
  Check,
  Send,
  Clock,
  ShieldAlert,
  User,
  DollarSign,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import api from '../api/client';

export const CourierContactModal = ({ task, onClose }) => {
  const [copiedId, setCopiedId] = useState(null);
  const [customMessage, setCustomMessage] = useState('');
  const [contactHistory, setContactHistory] = useState(task?.contactLogs || []);

  if (!task) return null;

  const rawPhone = (task.customer?.phone || '').replace(/\D/g, '');
  const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
  const customerName = task.customer?.name || 'Customer';
  const subOrderId = task.subOrderId || 'PARCEL';
  const codAmount = task.amountToCollect || 0;

  const templates = [
    {
      id: 'ARRIVING_5_MIN',
      title: 'Arriving in 5 Minutes',
      subtitle: 'Alert customer to be ready with OTP',
      icon: '🚀',
      message: `Hi ${customerName}, this is your AuraMarket delivery partner. I will be at your doorstep in approx 5 minutes with order #${subOrderId}. Kindly keep your 4-digit secret Delivery OTP ready!`,
    },
    {
      id: 'AT_DOORSTEP',
      title: 'At Your Doorstep / Gate',
      subtitle: 'Rider has reached building entrance',
      icon: '🚪',
      message: `Hi ${customerName}, I have arrived at your delivery address with package #${subOrderId}. Please meet me or share your 4-digit Delivery OTP to collect your order.`,
    },
    ...(task.isCod
      ? [
          {
            id: 'COD_CASH_REMINDER',
            title: 'COD Cash Payment Reminder',
            subtitle: `Remind customer to prepare ₹${codAmount.toLocaleString('en-IN')}`,
            icon: '💵',
            message: `Hi ${customerName}, your Cash on Delivery package #${subOrderId} is arriving shortly. The total payable amount is ₹${codAmount.toLocaleString('en-IN')}. Please keep exact cash ready.`,
          },
        ]
      : []),
    {
      id: 'LANDMARK_HELP',
      title: 'Need Landmark / Gate Help',
      subtitle: 'Ask for specific navigation instructions',
      icon: '📍',
      message: `Hi ${customerName}, I am near your address for AuraMarket order #${subOrderId}. Could you please guide me to your exact flat/house number or landmark?`,
    },
  ];

  const logAttempt = async (channel, templateId, messageSnippet) => {
    const newLog = {
      channel,
      templateId,
      messageSnippet: messageSnippet?.slice(0, 80) || (channel === 'CALL' ? 'Phone call initiated' : 'WhatsApp opened'),
      timestamp: new Date(),
    };
    setContactHistory(prev => [newLog, ...prev]);

    if (task.rawId) {
      try {
        await api.post(`/delivery/tasks/${task.rawId}/contact-log`, {
          channel,
          templateId,
          messageSnippet,
        });
      } catch (_) {}
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleLaunchWhatsApp = (text, templateId) => {
    logAttempt('WHATSAPP', templateId, text);
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noreferrer');
  };

  const handleCall = () => {
    logAttempt('CALL', 'DIRECT_DIAL', `Direct phone call to +91 ${task.customer?.phone}`);
    window.location.href = `tel:${task.customer?.phone}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-slate-800">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-slate-200 shadow-2xl space-y-6 animate-scale-up max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Customer Contact Hub</h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Point #65
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Instant WhatsApp message templates & direct telephone dialer
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Primary Contact Card */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black flex-shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900">{customerName}</h4>
              <p className="text-xs font-mono font-bold text-slate-600 mt-0.5">+91 {task.customer?.phone}</p>
            </div>
          </div>

          <button
            onClick={handleCall}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all flex-shrink-0"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call Customer</span>
          </button>
        </div>

        {/* 1-Click WhatsApp Quick Message Templates */}
        <div className="space-y-3">
          <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
            ⚡ 1-Click WhatsApp Instant Templates
          </label>

          <div className="space-y-3">
            {templates.map(tmpl => (
              <div
                key={tmpl.id}
                className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 bg-white transition-all space-y-2.5 shadow-xs hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{tmpl.icon}</span>
                    <div>
                      <h5 className="font-black text-slate-900 text-xs">{tmpl.title}</h5>
                      <span className="text-[10px] text-slate-400 font-medium">{tmpl.subtitle}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopy(tmpl.message, tmpl.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all text-xs flex items-center gap-1"
                      title="Copy Message Text"
                    >
                      {copiedId === tmpl.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      onClick={() => handleLaunchWhatsApp(tmpl.message, tmpl.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] flex items-center gap-1 shadow-xs transition-all"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 font-medium bg-slate-50 p-2.5 rounded-xl leading-relaxed border border-slate-100">
                  "{tmpl.message}"
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Custom WhatsApp Message Composer */}
        <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
          <label className="text-xs font-black text-emerald-950 uppercase tracking-wider block">
            ✍️ Custom WhatsApp Message
          </label>

          <textarea
            rows="2"
            value={customMessage}
            onChange={e => setCustomMessage(e.target.value)}
            placeholder={`Type custom update to ${customerName}...`}
            className="w-full p-3 rounded-xl bg-white border border-emerald-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
          />

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">
              {customMessage.length} characters
            </span>
            <button
              onClick={() => {
                if (customMessage.trim()) {
                  handleLaunchWhatsApp(customMessage, 'CUSTOM');
                  setCustomMessage('');
                }
              }}
              disabled={!customMessage.trim()}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Custom WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Recent Communication Attempts Audit Stream */}
        {contactHistory.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
              Recent Communication Audit ({contactHistory.length})
            </span>
            <div className="space-y-1.5 max-h-28 overflow-y-auto">
              {contactHistory.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg"
                >
                  <span className="flex items-center gap-1.5 font-bold">
                    {item.channel === 'CALL' ? (
                      <PhoneCall className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <MessageSquare className="w-3 h-3 text-emerald-600" />
                    )}
                    <span>{item.channel}: {item.templateId || 'Direct'}</span>
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
