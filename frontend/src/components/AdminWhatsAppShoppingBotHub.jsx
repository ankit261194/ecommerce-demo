import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Smartphone,
  Send,
  Sparkles,
  RefreshCw,
  ShoppingBag,
  Truck,
  CheckCircle2,
  AlertCircle,
  Settings,
  PhoneCall,
  History,
  Copy,
  Check,
  Zap,
  Users,
  Search,
  Key,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import api from '../api/client';

export default function AdminWhatsAppShoppingBotHub() {
  const [activeTab, setActiveTab] = useState('simulator'); // 'simulator' | 'settings' | 'conversations' | 'alerts' | 'send-alert'
  const [telemetry, setTelemetry] = useState({
    totalConversations: 0,
    totalOrdersPlacedViaWhatsApp: 0,
    totalAlertsSent: 0,
  });

  const [botConfig, setBotConfig] = useState({
    enabled: true,
    botEnabled: true,
    botName: 'AuraBot Pro',
    greetingMessage: 'Namaste! Welcome to AuraMarket WhatsApp Shopping Concierge.',
    supportPhone: '+91 98765 43210',
    catalogSearchLimit: 4,
    autoCodBookingEnabled: true,
    webhookVerifyToken: 'auramarket_wa_verify_2026',
    automatedAlerts: {
      orderConfirmation: true,
      outForDelivery: true,
      deliveryConfirmation: true,
      cartRecovery: true,
    },
  });

  // Simulator state
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: `Namaste Valued Shopper! 🙏\nWelcome to *AuraMarket WhatsApp Shopping Concierge*.\n\nReply with a keyword or number anytime:\n1️⃣ *CATALOG* — Browse top trending products\n2️⃣ *SEARCH <item>* — Search store (e.g. "SEARCH headphones" or "shoes")\n3️⃣ *CART* — View your active WhatsApp cart\n4️⃣ *TRACK <order#>* — Track live delivery & secret OTP\n5️⃣ *SUPPORT* — Talk to customer support\n\n⚡ *Instant COD Booking*: Reply *"BUY <product_id>"* to order any product directly via Cash on Delivery!`,
      time: '10:00 AM',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [simPhone, setSimPhone] = useState('+91 99887 76655');
  const [simCustomerName, setSimCustomerName] = useState('Rohan Verma');
  const [simLoading, setSimLoading] = useState(false);
  const chatScrollRef = useRef(null);

  // Conversations & Alerts list
  const [conversations, setConversations] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);

  // Manual test alert form
  const [testAlertForm, setTestAlertForm] = useState({
    phone: '+91 99887 76655',
    customerName: 'AuraMarket Shopper',
    message: '🎉 AuraMarket Festive Flash Sale: Extra 20% OFF today on electronics with promo code FESTIVE20! Shop now: https://shribalajikripadham.online/ecommerce-demo/',
  });
  const [sendingAlert, setSendingAlert] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState(null);
  const [copiedKey, setCopiedKey] = useState('');

  useEffect(() => {
    fetchConfigAndTelemetry();
  }, []);

  useEffect(() => {
    if (activeTab === 'conversations') fetchConversations();
    if (activeTab === 'alerts') fetchAlerts();
  }, [activeTab]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, simLoading]);

  const fetchConfigAndTelemetry = async () => {
    try {
      const res = await api.get('/whatsapp-bot/config');
      if (res.data?.success) {
        if (res.data.data.config) setBotConfig(res.data.data.config);
        if (res.data.data.telemetry) setTelemetry(res.data.data.telemetry);
      }
    } catch (_) {}
  };

  const fetchConversations = async () => {
    setLoadingData(true);
    try {
      const res = await api.get('/whatsapp-bot/conversations?limit=30');
      if (res.data?.success) {
        setConversations(res.data.data.conversations || []);
      }
    } catch (_) {}
    finally {
      setLoadingData(false);
    }
  };

  const fetchAlerts = async () => {
    setLoadingData(true);
    try {
      const res = await api.get('/whatsapp-bot/alerts?limit=30');
      if (res.data?.success) {
        setAlerts(res.data.data.alerts || []);
      }
    } catch (_) {}
    finally {
      setLoadingData(false);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputMessage;
    if (!text.trim()) return;

    const userMsg = {
      sender: 'user',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setSimLoading(true);

    try {
      const res = await api.post('/whatsapp-bot/simulate', {
        fromPhone: simPhone,
        customerName: simCustomerName,
        text: text.trim(),
      });

      if (res.data?.success) {
        const botMsg = {
          sender: 'bot',
          text: res.data.data.replyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          intent: res.data.data.intent,
          payload: res.data.data.payload,
        };
        setMessages((prev) => [...prev, botMsg]);
        fetchConfigAndTelemetry();
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: '⚠️ Network connection to AuraBot failed. Please check backend server.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setSimLoading(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/whatsapp-bot/config', botConfig);
      if (res.data?.success) {
        setStatusFeedback({ type: 'success', text: 'WhatsApp Bot settings saved successfully!' });
      }
    } catch (err) {
      setStatusFeedback({ type: 'error', text: 'Failed to update WhatsApp Bot settings.' });
    }
  };

  const handleSendTestAlert = async (e) => {
    e.preventDefault();
    setSendingAlert(true);
    setStatusFeedback(null);

    try {
      const res = await api.post('/whatsapp-bot/send-alert', testAlertForm);
      if (res.data?.success) {
        setStatusFeedback({
          type: 'success',
          text: `WhatsApp message successfully dispatched to ${testAlertForm.phone}!`,
        });
        fetchConfigAndTelemetry();
      }
    } catch (err) {
      setStatusFeedback({
        type: 'error',
        text: err.response?.data?.message || 'Failed to dispatch WhatsApp alert.',
      });
    } finally {
      setSendingAlert(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                Point #25 • Conversational Commerce
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-300 border border-green-500/30 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1" />
                Meta WhatsApp Cloud API v20.0 Ready
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              WhatsApp Conversational Shopping Bot & Alerts Hub
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Enable two-way conversational shopping: customers browse catalogs, search products, track orders, and place instant Cash on Delivery (COD) orders directly via WhatsApp chat.
            </p>
          </div>

          {/* Quick Telemetry KPI Badges */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-slate-900/90 border border-emerald-500/30 p-3 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Sessions</span>
              <span className="text-lg font-black text-white">{telemetry.totalConversations}</span>
            </div>
            <div className="bg-slate-900/90 border border-emerald-500/30 p-3 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">COD Orders</span>
              <span className="text-lg font-black text-emerald-400">
                {telemetry.totalOrdersPlacedViaWhatsApp}
              </span>
            </div>
            <div className="bg-slate-900/90 border border-emerald-500/30 p-3 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Alerts Sent</span>
              <span className="text-lg font-black text-amber-400">{telemetry.totalAlertsSent}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('simulator')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'simulator'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Interactive Chat Simulator</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'settings'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Bot & Webhook Settings</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('conversations')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'conversations'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Conversation Transcripts ({telemetry.totalConversations})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'alerts'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Outbound Alert Logs ({telemetry.totalAlertsSent})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('send-alert')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'send-alert'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Send Test WhatsApp Alert</span>
        </button>
      </div>

      {/* Status Feedback Alert */}
      {statusFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
            statusFeedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
          }`}
        >
          {statusFeedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{statusFeedback.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: INTERACTIVE WHATSAPP SIMULATOR */}
      {/* ========================================================================= */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls & Quick Prompts Panel (4 Cols) */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Simulated Persona Details</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Customize the incoming phone number and customer name to test real keyword routing.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Customer Phone Number
                </label>
                <input
                  type="text"
                  value={simPhone}
                  onChange={(e) => setSimPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={simCustomerName}
                  onChange={(e) => setSimCustomerName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Quick Action Test Pills */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                1-Click Keyword Prompts:
              </label>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSendMessage('HI')}
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-emerald-950/60 text-slate-200 border border-slate-700 hover:border-emerald-500/50 text-left text-xs transition-all flex items-center justify-between"
                >
                  <span className="font-medium">👋 "HI" — Main Menu & Options</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('CATALOG')}
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-emerald-950/60 text-slate-200 border border-slate-700 hover:border-emerald-500/50 text-left text-xs transition-all flex items-center justify-between"
                >
                  <span className="font-medium">🛍️ "CATALOG" — Browse Trending Products</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('SEARCH headphones')}
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-emerald-950/60 text-slate-200 border border-slate-700 hover:border-emerald-500/50 text-left text-xs transition-all flex items-center justify-between"
                >
                  <span className="font-medium">🔍 "SEARCH headphones" — Keyword Search</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('TRACK')}
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-emerald-950/60 text-slate-200 border border-slate-700 hover:border-emerald-500/50 text-left text-xs transition-all flex items-center justify-between"
                >
                  <span className="font-medium">📍 "TRACK" — Order Status & Delivery OTP</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('SUPPORT')}
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-emerald-950/60 text-slate-200 border border-slate-700 hover:border-emerald-500/50 text-left text-xs transition-all flex items-center justify-between"
                >
                  <span className="font-medium">🤝 "SUPPORT" — Contact Concierge Helpline</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs text-emerald-200 leading-relaxed">
              💡 <strong>Instant COD Order Testing:</strong> After searching or browsing the catalog, copy the product ID from the bot reply and send <code>BUY &lt;product_id&gt;</code> to create an instant database order with a 4-digit secret delivery OTP!
            </div>
          </div>

          {/* WhatsApp Interactive Screen Frame (8 Cols) */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[650px]">
            {/* WhatsApp Header Bar */}
            <div className="bg-[#075e54] text-white px-4 py-3 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#075e54] flex items-center justify-center font-black text-base shadow-inner">
                  💬
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight">{botConfig.botName || 'AuraBot Pro'}</h3>
                  <span className="text-[11px] text-emerald-200 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    online • AuraMarket Verified Concierge
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-emerald-100">
                <span className="bg-emerald-800/80 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  Cloud API v20.0
                </span>
                <button
                  type="button"
                  onClick={() => setMessages([])}
                  className="hover:text-white text-emerald-200 text-xs font-semibold"
                >
                  Clear Chat
                </button>
              </div>
            </div>

            {/* Chat Messages Body (Simulated Wallpaper) */}
            <div
              ref={chatScrollRef}
              className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#0b141a] text-slate-100 font-sans text-xs"
              style={{
                backgroundImage: `radial-gradient(#1f2c34 1px, transparent 1px)`,
                backgroundSize: '16px 16px',
              }}
            >
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 shadow-md relative leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-[#005c4b] text-white rounded-tr-none'
                        : 'bg-[#202c33] text-slate-100 rounded-tl-none border border-slate-700/60'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-sans text-xs sm:text-[13px]">
                      {m.text}
                    </div>
                    <div
                      className={`text-[10px] mt-1 text-right flex items-center justify-end gap-1 ${
                        m.sender === 'user' ? 'text-emerald-300' : 'text-slate-400'
                      }`}
                    >
                      <span>{m.time}</span>
                      {m.sender === 'user' && <span className="font-bold text-emerald-400">✓✓</span>}
                    </div>
                  </div>
                </div>
              ))}

              {simLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#202c33] text-slate-300 rounded-2xl rounded-tl-none p-3 shadow-md border border-slate-700/60 flex items-center gap-2 text-xs">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>AuraBot is typing...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Message Input Bar */}
            <div className="p-3 bg-[#202c33] border-t border-slate-700/60 flex items-center gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message or keyword (e.g. CATALOG, SEARCH shoes, TRACK)..."
                className="flex-1 bg-[#2a3942] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                disabled={simLoading || !inputMessage.trim()}
                onClick={() => handleSendMessage()}
                className="p-2.5 rounded-xl bg-[#00a884] hover:bg-[#008f6f] text-white transition-all disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BOT & WEBHOOK CONFIGURATION */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveConfig} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
          <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Meta WhatsApp Cloud API & Bot Engine Settings</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure your official Meta Cloud API v20.0 credentials, verification token, and automated triggers.
              </p>
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Bot Name</label>
              <input
                type="text"
                value={botConfig.botName || ''}
                onChange={(e) => setBotConfig({ ...botConfig, botName: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Support Helpline Phone</label>
              <input
                type="text"
                value={botConfig.supportPhone || ''}
                onChange={(e) => setBotConfig({ ...botConfig, supportPhone: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Webhook Verify Token (Meta Cloud API Handshake)
              </label>
              <input
                type="text"
                value={botConfig.webhookVerifyToken || ''}
                onChange={(e) => setBotConfig({ ...botConfig, webhookVerifyToken: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Catalog Search Result Limit
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={botConfig.catalogSearchLimit || 4}
                onChange={(e) => setBotConfig({ ...botConfig, catalogSearchLimit: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Store Welcome / Greeting Message
            </label>
            <textarea
              rows={3}
              value={botConfig.greetingMessage || ''}
              onChange={(e) => setBotConfig({ ...botConfig, greetingMessage: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Webhook URLs Callout Box */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Official Webhook Callback URL:
            </span>
            <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-lg border border-slate-700 text-xs font-mono text-emerald-300">
              <span>https://shribalajikripadham.online/ecommerce-demo/api/whatsapp-bot/webhook</span>
              <button
                type="button"
                onClick={() => copyToClipboard('https://shribalajikripadham.online/ecommerce-demo/api/whatsapp-bot/webhook', 'webhook_url')}
                className="text-slate-400 hover:text-white ml-2"
              >
                {copiedKey === 'webhook_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Paste this URL into your Meta App Dashboard under WhatsApp &gt; Configuration &gt; Webhook.
            </p>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CONVERSATION SESSIONS LOG */}
      {/* ========================================================================= */}
      {activeTab === 'conversations' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Live Customer Conversation Sessions</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Logged WhatsApp shopper sessions, keyword intent metrics, and instant orders.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchConversations}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {loadingData ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
              Loading conversations...
            </div>
          ) : conversations.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No conversations logged yet. Use the Interactive Chat Simulator to test!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">Customer Phone</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Last Intent</th>
                    <th className="p-3">Messages Count</th>
                    <th className="p-3">Orders Booked</th>
                    <th className="p-3">Last Active</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {conversations.map((c) => (
                    <tr key={c._id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-bold text-white">{c.customerPhone}</td>
                      <td className="p-3">{c.customerName}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {c.lastIntent || 'GREETING'}
                        </span>
                      </td>
                      <td className="p-3 font-semibold">{c.messages?.length || 0} msgs</td>
                      <td className="p-3">
                        <span className="font-bold text-emerald-400">
                          {c.ordersPlacedCount || 0} orders
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">
                        {new Date(c.lastInteractionAt || c.updatedAt).toLocaleTimeString()}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedConversation(c)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold"
                        >
                          View Transcript
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Transcript Modal */}
          {selectedConversation && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4 max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="font-bold text-white text-sm">
                      Transcript: {selectedConversation.customerPhone}
                    </h4>
                    <span className="text-xs text-slate-400">{selectedConversation.customerName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedConversation(null)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-slate-950 rounded-xl text-xs">
                  {(selectedConversation.messages || []).map((m, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-xl ${
                        m.sender === 'user'
                          ? 'bg-emerald-950/60 border border-emerald-500/30 ml-6 text-emerald-100'
                          : 'bg-slate-800 border border-slate-700 mr-6 text-slate-200'
                      }`}
                    >
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                        {m.sender === 'user' ? 'Customer' : 'AuraBot'}:
                      </div>
                      <div className="whitespace-pre-wrap">{m.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: OUTBOUND TRANSACTIONAL ALERT LOGS */}
      {/* ========================================================================= */}
      {activeTab === 'alerts' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Outbound Automated Alert Logs</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time delivery verification logs for Order Confirmations, Delivery Handover OTPs, and Out-for-Delivery dispatches.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchAlerts}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {loadingData ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
              Loading alert logs...
            </div>
          ) : alerts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No alerts logged yet. Send a test alert below to test live delivery!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">Recipient Phone</th>
                    <th className="p-3">Alert Type</th>
                    <th className="p-3">Order Number</th>
                    <th className="p-3">Delivery Status</th>
                    <th className="p-3">Message Content</th>
                    <th className="p-3 text-right">Dispatched At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {alerts.map((a) => (
                    <tr key={a._id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-bold text-white">{a.recipientPhone}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {a.alertType}
                        </span>
                      </td>
                      <td className="p-3 font-mono">{a.orderNumber || 'N/A'}</td>
                      <td className="p-3">
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{a.deliveryStatus}</span>
                        </span>
                      </td>
                      <td className="p-3 max-w-xs truncate text-slate-400" title={a.messageBody}>
                        {a.messageBody}
                      </td>
                      <td className="p-3 text-right text-slate-400">
                        {new Date(a.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SEND TEST WHATSAPP ALERT */}
      {/* ========================================================================= */}
      {activeTab === 'send-alert' && (
        <form onSubmit={handleSendTestAlert} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg max-w-xl mx-auto space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              <span>Send Instant WhatsApp Test Alert</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Test live gateway delivery to any Indian or international phone number.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Recipient Phone Number <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={testAlertForm.phone}
              onChange={(e) => setTestAlertForm({ ...testAlertForm, phone: e.target.value })}
              placeholder="e.g. +91 99887 76655"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Recipient Name</label>
            <input
              type="text"
              value={testAlertForm.customerName}
              onChange={(e) => setTestAlertForm({ ...testAlertForm, customerName: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Message Body <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={testAlertForm.message}
              onChange={(e) => setTestAlertForm({ ...testAlertForm, message: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
            />
          </div>

          <button
            type="submit"
            disabled={sendingAlert}
            className="w-full py-3 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {sendingAlert ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Dispatch Test WhatsApp Alert</span>
          </button>
        </form>
      )}
    </div>
  );
}
