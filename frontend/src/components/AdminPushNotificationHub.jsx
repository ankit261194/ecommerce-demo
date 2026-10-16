import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  Send,
  Smartphone,
  Monitor,
  Tablet,
  Users,
  CheckCircle2,
  AlertCircle,
  Eye,
  BarChart2,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Zap,
  ShoppingBag,
  Flame,
  MousePointerClick,
  Layers,
} from 'lucide-react';
import api from '../api/client';

export default function AdminPushNotificationHub() {
  const [activeTab, setActiveTab] = useState('broadcast'); // 'broadcast' | 'campaigns' | 'subscribers'
  const [previewDevice, setPreviewDevice] = useState('mobile'); // 'mobile' | 'desktop'
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Form State
  const [title, setTitle] = useState('⚡ Mega Festive 50% Flash Sale is LIVE!');
  const [body, setBody] = useState('Exclusive audio & tech accessories discounted for the next 2 hours. Tap to claim before stocks run out!');
  const [targetUrl, setTargetUrl] = useState('/ecommerce-demo/');
  const [image, setImage] = useState('https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80');
  const [targetAudience, setTargetAudience] = useState('all');
  const [action1Title, setAction1Title] = useState('Claim Deal');
  const [action2Title, setAction2Title] = useState('Dismiss');

  // Telemetry & Data State
  const [telemetry, setTelemetry] = useState({
    totalSubscribers: 0,
    activeSubscribers: 0,
    desktopCount: 0,
    mobileCount: 0,
    tabletCount: 0,
  });
  const [campaigns, setCampaigns] = useState([]);
  const [campaignSummary, setCampaignSummary] = useState({
    totalCampaigns: 0,
    totalSent: 0,
    totalDelivered: 0,
    totalClicks: 0,
    overallCtr: 0,
  });
  const [subscribers, setSubscribers] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subsRes, campRes] = await Promise.all([
        api.get('/push-notifications/admin/subscribers?limit=50'),
        api.get('/push-notifications/admin/campaigns'),
      ]);

      if (subsRes.data?.success) {
        setSubscribers(subsRes.data.data || []);
        if (subsRes.data.telemetry) {
          setTelemetry(subsRes.data.telemetry);
        }
      }

      if (campRes.data?.success) {
        setCampaigns(campRes.data.data || []);
        if (campRes.data.summary) {
          setCampaignSummary(campRes.data.summary);
        }
      }
    } catch (err) {
      console.warn('Failed to load push notification hub data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSendBroadcast = async (e) => {
    if (e) e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setFeedback({ type: 'error', message: 'Title and body are required.' });
      return;
    }

    setSending(true);
    setFeedback(null);

    try {
      const res = await api.post('/push-notifications/admin/broadcast', {
        title,
        body,
        targetUrl,
        image,
        targetAudience,
        actions: [
          { action: 'deal', title: action1Title },
          { action: 'dismiss', title: action2Title },
        ],
      });

      if (res.data?.success) {
        setFeedback({
          type: 'success',
          message: `🎉 Broadcast sent successfully! Dispatched to ${res.data.telemetry?.sentCount || 0} devices.`,
        });
        fetchData();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to dispatch broadcast.',
      });
    } finally {
      setSending(false);
    }
  };

  const handleSendTestPush = async () => {
    try {
      const res = await api.post('/push-notifications/admin/test', {});
      if (res.data?.success) {
        setFeedback({ type: 'success', message: 'Test notification triggered successfully.' });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Could not send test push. Ensure an active subscriber exists.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 fill-amber-400" /> True Native Web Push
            </span>
            <span className="text-xs text-slate-400 font-bold">VAPID RFC-8291 Compliant</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Native Push Broadcast Studio & Subscriber Radar
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl font-medium">
            Broadcast instant push alerts to customer devices without app store installation. Send flash sale drops, dynamic price alerts, and real-time delivery milestones.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-slate-700"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
          <button
            type="button"
            onClick={handleSendTestPush}
            className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center gap-2 shadow-md cursor-pointer"
          >
            <BellRing className="w-4 h-4" />
            <span>Send Test Push</span>
          </button>
        </div>
      </div>

      {/* Telemetry Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Total Subscribers</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {telemetry.totalSubscribers}
          </div>
          <div className="text-[11px] text-emerald-600 font-bold mt-1">
            {telemetry.activeSubscribers} Active Devices
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Mobile Reach</span>
            <Smartphone className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {telemetry.mobileCount}
          </div>
          <div className="text-[11px] text-slate-500 font-bold mt-1">
            {telemetry.totalSubscribers > 0
              ? Math.round((telemetry.mobileCount / telemetry.totalSubscribers) * 100)
              : 0}% Android / Mobile
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Desktop Reach</span>
            <Monitor className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {telemetry.desktopCount}
          </div>
          <div className="text-[11px] text-slate-500 font-bold mt-1">
            Chrome / Edge / Safari
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Broadcasts Sent</span>
            <Send className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {campaignSummary.totalCampaigns}
          </div>
          <div className="text-[11px] text-slate-500 font-bold mt-1">
            {campaignSummary.totalDelivered} Total Delivered
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Click-Through Rate</span>
            <MousePointerClick className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {campaignSummary.overallCtr}%
          </div>
          <div className="text-[11px] text-rose-600 font-bold mt-1">
            {campaignSummary.totalClicks} Unique Link Taps
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('broadcast')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'broadcast'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Broadcast Composer</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'campaigns'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Campaign History & CTR ({campaigns.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subscribers')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'subscribers'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Subscriber Devices ({subscribers.length})</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* TAB 1: BROADCAST COMPOSER */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Form: Composer Controls */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Compose Web Push Notification</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Audience Segment
                </label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">🌐 All Subscribers ({telemetry.activeSubscribers} devices)</option>
                  <option value="customers">👤 Registered Logged-In Customers</option>
                  <option value="active_orders">📦 Shoppers with In-Flight Active Orders</option>
                  <option value="abandoned_cart">🛒 Abandoned Cart Shoppers (Urgency Vouchers)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notification Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. ⚡ Flash Deal: 40% OFF Headphones"
                  className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Message Body *
                </label>
                <textarea
                  rows={3}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Short, persuasive message that appears in the customer's lock screen or notification tray."
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  maxLength={240}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Destination URL (Deep Link)
                  </label>
                  <input
                    type="text"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="/ecommerce-demo/"
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Rich Media Banner Image (Optional)
                  </label>
                  <input
                    type="text"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Action Button 1
                  </label>
                  <input
                    type="text"
                    value={action1Title}
                    onChange={(e) => setAction1Title(e.target.value)}
                    placeholder="Claim Deal"
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Action Button 2
                  </label>
                  <input
                    type="text"
                    value={action2Title}
                    onChange={(e) => setAction2Title(e.target.value)}
                    placeholder="Dismiss"
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={sending}
                onClick={handleSendBroadcast}
                className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-amber-400 font-black text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    <span>Broadcasting to Devices...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Broadcast Notification Now</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Live Device Simulation Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Real-Time Device Preview
                </span>
                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      previewDevice === 'mobile'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Android</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      previewDevice === 'desktop'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Desktop</span>
                  </button>
                </div>
              </div>

              {/* Mobile Phone Mockup */}
              {previewDevice === 'mobile' ? (
                <div className="mx-auto max-w-xs bg-slate-950 rounded-3xl p-3 border-4 border-slate-800 shadow-2xl space-y-3">
                  <div className="w-16 h-1 bg-slate-800 rounded-full mx-auto" />
                  <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-3 border border-slate-800 shadow-inner space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center">
                          A
                        </span>
                        <span className="font-bold text-slate-300">AuraMarket • now</span>
                      </div>
                      <span>⚡</span>
                    </div>

                    <h5 className="text-xs font-black text-white leading-tight">
                      {title || 'Notification Title'}
                    </h5>
                    <p className="text-[11px] text-slate-300 leading-snug line-clamp-3">
                      {body || 'Notification message description goes here.'}
                    </p>

                    {image && (
                      <div className="rounded-xl overflow-hidden h-28 bg-slate-800 border border-slate-700">
                        <img src={image} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                      <button
                        type="button"
                        className="flex-1 py-1 text-center text-[11px] font-black text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-all"
                      >
                        {action1Title || 'Open'}
                      </button>
                      <button
                        type="button"
                        className="flex-1 py-1 text-center text-[11px] font-bold text-slate-400 bg-slate-800/40 rounded-lg"
                      >
                        {action2Title || 'Dismiss'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Desktop Notification Card Mockup */
                <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 shadow-2xl space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center flex-shrink-0 shadow-md">
                      A
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-black text-amber-400 uppercase tracking-wider">AuraMarket Desktop Alert</span>
                        <span>Google Chrome</span>
                      </div>
                      <h5 className="text-xs font-black text-white leading-tight">
                        {title || 'Notification Title'}
                      </h5>
                      <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">
                        {body || 'Notification message description goes here.'}
                      </p>
                    </div>
                  </div>

                  {image && (
                    <div className="rounded-xl overflow-hidden h-32 bg-slate-800 border border-slate-700">
                      <img src={image} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      className="px-3 py-1 bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-xs"
                    >
                      {action1Title || 'View Deal'}
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
                    >
                      {action2Title || 'Close'}
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-400 text-center font-medium">
                Simulated presentation across Android Chrome & Windows/macOS notification centers.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CAMPAIGN HISTORY & CTR */}
      {activeTab === 'campaigns' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-900">Past Push Broadcast Campaigns</h4>
            <span className="text-xs text-slate-500 font-bold">Showing last {campaigns.length} broadcasts</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-black border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Campaign Title</th>
                  <th className="py-3 px-4">Audience</th>
                  <th className="py-3 px-4 text-center">Sent</th>
                  <th className="py-3 px-4 text-center">Delivered</th>
                  <th className="py-3 px-4 text-center">Clicks</th>
                  <th className="py-3 px-4 text-center">CTR %</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No push broadcast campaigns sent yet. Use the Composer to launch your first deal alert!
                    </td>
                  </tr>
                ) : (
                  campaigns.map((camp) => {
                    const ctr =
                      camp.successCount > 0
                        ? ((camp.clickCount / camp.successCount) * 100).toFixed(1)
                        : 0;
                    return (
                      <tr key={camp._id} className="hover:bg-slate-50/70 transition-all">
                        <td className="py-3.5 px-4 font-bold text-slate-900 max-w-xs truncate">
                          {camp.title}
                        </td>
                        <td className="py-3.5 px-4 capitalize font-semibold text-slate-600">
                          {camp.targetAudience}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                          {camp.sentCount}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                          {camp.successCount}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-rose-600">
                          {camp.clickCount || 0}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full font-black text-[11px] bg-rose-50 text-rose-700 border border-rose-200">
                            {ctr}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(camp.createdAt).toLocaleDateString()} {new Date(camp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SUBSCRIBER DEVICES */}
      {activeTab === 'subscribers' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-900">Registered Push Subscriber Devices</h4>
            <span className="text-xs text-slate-500 font-bold">{subscribers.length} devices listed</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-black border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Device / OS</th>
                  <th className="py-3 px-4">Customer Email</th>
                  <th className="py-3 px-4">Endpoint Gateway</th>
                  <th className="py-3 px-4 text-center">Notified</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {subscribers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No browser subscriptions registered yet. Enable notifications from the storefront prompt!
                    </td>
                  </tr>
                ) : (
                  subscribers.map((sub) => {
                    const isFCM = sub.endpoint.includes('googleapis');
                    const isApple = sub.endpoint.includes('apple');
                    const isMozilla = sub.endpoint.includes('mozilla');
                    const gateway = isFCM ? 'Google FCM' : isApple ? 'Apple APNs' : isMozilla ? 'Mozilla Push' : 'WebPush Standard';

                    return (
                      <tr key={sub._id} className="hover:bg-slate-50/70 transition-all">
                        <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                          {sub.deviceType === 'mobile' ? (
                            <Smartphone className="w-4 h-4 text-blue-500" />
                          ) : sub.deviceType === 'tablet' ? (
                            <Tablet className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Monitor className="w-4 h-4 text-purple-500" />
                          )}
                          <span className="capitalize">{sub.deviceType}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {sub.customerEmail || (sub.user?.email ? sub.user.email : 'Guest Device')}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                          {gateway}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                          {sub.notificationCount || 0}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              sub.isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {sub.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(sub.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
