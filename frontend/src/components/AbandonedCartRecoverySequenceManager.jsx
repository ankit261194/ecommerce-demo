import React, { useState, useEffect } from 'react';
import {
  Clock,
  Send,
  MessageSquare,
  Mail,
  Zap,
  TrendingUp,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  ExternalLink,
  Settings,
  ChevronRight,
  ShieldCheck,
  Percent,
  Timer,
  X,
  Smartphone,
  Flame,
  Search,
  Filter,
} from 'lucide-react';
import api from '../api/client';

export const AbandonedCartRecoverySequenceManager = () => {
  // Sequence Config & Analytics state
  const [config, setConfig] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [abandonedCarts, setAbandonedCarts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDripRunning, setIsDripRunning] = useState(false);

  // Modals & Forms
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [selectedCartForNudge, setSelectedCartForNudge] = useState(null);
  const [selectedStageTab, setSelectedStageTab] = useState(1);

  // Filter & Search
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Toast / Action feedback
  const [feedback, setFeedback] = useState(null);

  // Config Form Data
  const [formData, setFormData] = useState(null);

  // Test Dispatch Form Data
  const [testData, setTestData] = useState({
    channel: 'EMAIL',
    target: '',
    stageNumber: 1,
  });

  // Fetch all recovery sequence data
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [configRes, analyticsRes, cartsRes] = await Promise.all([
        api.get('/admin/abandoned-carts/sequences/config'),
        api.get('/admin/abandoned-carts/sequences/analytics'),
        api.get('/admin/abandoned-carts?limit=50'),
      ]);

      if (configRes.data?.success) {
        setConfig(configRes.data.config);
        setFormData(configRes.data.config);
      }

      if (analyticsRes.data?.success) {
        setAnalytics(analyticsRes.data.analytics);
      }

      if (cartsRes.data?.success) {
        setAbandonedCarts(cartsRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load abandoned cart sequences:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Trigger automated recovery drip engine
  const handleRunDripNow = async () => {
    try {
      setIsDripRunning(true);
      const res = await api.post('/admin/abandoned-carts/sequences/run');
      if (res.data?.success) {
        setFeedback({
          type: 'success',
          message: res.data.message || 'Automated recovery drip executed successfully!',
        });
        fetchData();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to execute recovery drip',
      });
    } finally {
      setIsDripRunning(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // Save Config Changes
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/admin/abandoned-carts/sequences/config', formData);
      if (res.data?.success) {
        setConfig(res.data.config);
        setFeedback({
          type: 'success',
          message: 'Drip recovery settings updated successfully!',
        });
        setIsConfigModalOpen(false);
        fetchData();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update configuration',
      });
    }
  };

  // Send Manual Drip Nudge
  const handleSendManualNudge = async (cartId, stage, channel) => {
    try {
      const res = await api.post(`/admin/abandoned-carts/${cartId}/drip-nudge`, {
        stage,
        channel,
      });
      if (res.data?.success) {
        setFeedback({
          type: 'success',
          message: res.data.message || `Stage ${stage} nudge dispatched via ${channel}!`,
        });
        fetchData();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to dispatch manual nudge',
      });
    }
  };

  // Test Dispatch
  const handleSendTestDispatch = async (e) => {
    e.preventDefault();
    if (!testData.target) return;
    try {
      const res = await api.post('/admin/abandoned-carts/sequences/test-dispatch', testData);
      if (res.data?.success) {
        setFeedback({
          type: 'success',
          message: res.data.message || 'Test recovery message dispatched!',
        });
        setIsTestModalOpen(false);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to send test message',
      });
    }
  };

  // Copy Recovery Link to Clipboard
  const handleCopyLink = (token) => {
    const demoBaseUrl = 'https://shribalajikripadham.online/ecommerce-demo';
    const link = `${demoBaseUrl}/#recover-cart?token=${token}`;
    navigator.clipboard.writeText(link);
    setFeedback({
      type: 'success',
      message: '📋 1-Click Recovery Link copied to clipboard!',
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Filtered abandoned carts
  const filteredCarts = abandonedCarts.filter((cart) => {
    if (statusFilter === 'uncontacted' && cart.sequenceStage !== 0) return false;
    if (statusFilter === 'stage1' && cart.sequenceStage !== 1) return false;
    if (statusFilter === 'stage2' && cart.sequenceStage !== 2) return false;
    if (statusFilter === 'stage3' && cart.sequenceStage !== 3) return false;
    if (statusFilter === 'recovered' && cart.status !== 'RECOVERED') return false;

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const matchName = cart.customerName?.toLowerCase().includes(term);
      const matchEmail = cart.customerEmail?.toLowerCase().includes(term);
      const matchPhone = cart.customerPhone?.includes(term);
      if (!matchName && !matchEmail && !matchPhone) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm font-bold shadow-lg animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-600/95 text-white border border-emerald-400'
              : 'bg-rose-600/95 text-white border border-rose-400'
          }`}
        >
          <div className="flex items-center gap-3">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-200" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 p-6 sm:p-8 border border-emerald-800/40 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black tracking-wide uppercase">
              <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Pillar 2 — Point #29 Verified</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              Automated Cart Recovery Sequences
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed font-medium">
              Multi-stage automated recovery engine delivering personalized WhatsApp pings, dynamic
              single-use discount vouchers, and urgency alerts to reclaim lost e-commerce revenue.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRunDripNow}
              disabled={isDripRunning}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg hover:shadow-emerald-500/20 transition-all disabled:opacity-50"
              title="Evaluate active carts and dispatch eligible drip stages immediately"
            >
              <RefreshCw
                className={`w-4 h-4 text-slate-950 ${isDripRunning ? 'animate-spin' : ''}`}
              />
              <span>{isDripRunning ? 'Evaluating Carts...' : 'Run Drip Sequence Now'}</span>
            </button>

            <button
              onClick={() => setIsTestModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm shadow-md transition-all border border-slate-700"
            >
              <Send className="w-4 h-4 text-emerald-400" />
              <span>Test Dispatch</span>
            </button>

            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg transition-all"
            >
              <Settings className="w-4 h-4" />
              <span>Configure Engine</span>
            </button>
          </div>
        </div>

        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Bento Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Carts in Funnel */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border border-slate-800 shadow-xl group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Carts In Pipeline
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{analytics?.totalCarts || 0}</span>
            <span className="text-xs text-slate-400 font-medium">Total Abandoned</span>
          </div>
          <p className="mt-2 text-xs text-emerald-400 font-bold">
            {analytics?.stageFunnel?.stage0_uncontacted || 0} awaiting Stage 1 nudge
          </p>
        </div>

        {/* Metric 2: At-Risk Lost GMV */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border border-slate-800 shadow-xl group hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              At-Risk Lost GMV
            </span>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Flame className="w-5 h-5 text-rose-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">
              ₹{(analytics?.atRiskGMV || 0).toLocaleString()}
            </span>
          </div>
          <p className="mt-2 text-xs text-rose-400 font-medium">
            Potential revenue awaiting recovery
          </p>
        </div>

        {/* Metric 3: Total Recovered GMV */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border border-slate-800 shadow-xl group hover:border-teal-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Recovered Revenue
            </span>
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400">
              ₹{(analytics?.totalRecoveredGMV || 0).toLocaleString()}
            </span>
            <span className="text-xs font-bold text-white">
              ({analytics?.recoveryRate || 0}% Rate)
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, analytics?.recoveryRate || 0)}%` }}
            />
          </div>
        </div>

        {/* Metric 4: Channel Attribution */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border border-slate-800 shadow-xl group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Top Channel Reclaims
            </span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between font-bold">
              <span className="text-emerald-400 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5" /> WhatsApp:
              </span>
              <span className="text-white">
                ₹{(analytics?.channelPerformance?.WHATSAPP?.revenue || 0).toLocaleString()} (
                {analytics?.channelPerformance?.WHATSAPP?.count || 0})
              </span>
            </div>
            <div className="flex items-center justify-between font-bold">
              <span className="text-blue-400 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> Email:
              </span>
              <span className="text-white">
                ₹{(analytics?.channelPerformance?.EMAIL?.revenue || 0).toLocaleString()} (
                {analytics?.channelPerformance?.EMAIL?.count || 0})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Stage Drip Pipeline Visualizer */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-black text-white">Automated Drip Sequence Pipeline</h3>
          </div>
          <span className="text-xs font-bold text-slate-400">
            Engine Status:{' '}
            <span className="text-emerald-400 font-black">
              {config?.isEnabled ? '🟢 ACTIVE & POLLING' : '🔴 PAUSED'}
            </span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(config?.stages || []).map((stage, idx) => {
            const countAtStage =
              stage.stageNumber === 1
                ? analytics?.stageFunnel?.stage1_sent || 0
                : stage.stageNumber === 2
                ? analytics?.stageFunnel?.stage2_sent || 0
                : analytics?.stageFunnel?.stage3_sent || 0;

            return (
              <div
                key={stage.stageNumber}
                className="bg-slate-950/80 rounded-xl p-5 border border-slate-800/80 space-y-3 relative overflow-hidden group hover:border-emerald-500/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    Stage {stage.stageNumber} • {stage.delayHours}h Delay
                  </span>
                  <span className="text-xs font-bold text-white flex items-center gap-1">
                    <Send className="w-3 h-3 text-emerald-400" />
                    {countAtStage} Dispatched
                  </span>
                </div>

                <h4 className="text-sm font-black text-white">{stage.name}</h4>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Channels:</span>
                    <div className="flex items-center gap-1.5">
                      {stage.channels.includes('EMAIL') && (
                        <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                          Email
                        </span>
                      )}
                      {stage.channels.includes('WHATSAPP') && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                          WhatsApp
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Incentive:</span>
                    <span className="font-bold text-amber-300">
                      {stage.offerDiscount
                        ? `${stage.discountPercentage}% OFF Voucher`
                        : 'Gentle Reminder (No Discount)'}
                    </span>
                  </div>

                  {stage.freeShippingOffer && (
                    <span className="inline-block text-[10px] font-bold text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded">
                      + Free Shipping Unlocked
                    </span>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 italic line-clamp-2">
                  "{stage.emailSubject}"
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Control Filters Bar */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Tab buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0">
          {[
            { id: 'all', label: 'All Carts' },
            { id: 'uncontacted', label: 'Uncontacted (Queue)' },
            { id: 'stage1', label: 'Stage 1 Sent' },
            { id: 'stage2', label: 'Stage 2 Sent' },
            { id: 'stage3', label: 'Stage 3 Sent' },
            { id: 'recovered', label: 'Recovered' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customer, phone, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-56 sm:w-64"
          />
        </div>
      </div>

      {/* Abandoned Carts Table */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            Live Abandoned Carts Queue ({filteredCarts.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-400">Loading abandoned carts...</p>
          </div>
        ) : filteredCarts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-bold text-xs">
            No abandoned carts match the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800">
                <tr>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Cart Items</th>
                  <th className="p-4">Cart Total</th>
                  <th className="p-4">Drip Stage</th>
                  <th className="p-4">Reminders</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                {filteredCarts.map((cart) => (
                  <tr key={cart._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white">{cart.customerName}</div>
                      <div className="text-[11px] text-slate-400">{cart.customerEmail}</div>
                      {cart.customerPhone && (
                        <div className="text-[10px] text-emerald-400">{cart.customerPhone}</div>
                      )}
                    </td>

                    <td className="p-4">
                      <span className="font-semibold text-white block">
                        {cart.items?.length || 0} Item(s)
                      </span>
                      <span className="text-[11px] text-slate-400 truncate max-w-xs block">
                        {(cart.items || []).map((i) => `${i.quantity}x ${i.title}`).join(', ')}
                      </span>
                    </td>

                    <td className="p-4 font-black text-white">₹{cart.cartTotal?.toLocaleString()}</td>

                    <td className="p-4">
                      {cart.status === 'RECOVERED' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase">
                          ✓ Recovered
                        </span>
                      ) : cart.sequenceStage === 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold uppercase">
                          Uncontacted
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase">
                          Stage {cart.sequenceStage} Sent
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="text-white font-bold">{cart.reminderCount || 0} Sent</div>
                      {cart.lastReminderSentAt && (
                        <div className="text-[10px] text-slate-500">
                          {new Date(cart.lastReminderSentAt).toLocaleTimeString()}
                        </div>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* 1-Click WhatsApp Drip */}
                        <button
                          onClick={() => handleSendManualNudge(cart._id, 1, 'WHATSAPP')}
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold transition-all"
                          title="Send Stage 1 WhatsApp Nudge"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                        </button>

                        {/* 1-Click Email Nudge */}
                        <button
                          onClick={() => handleSendManualNudge(cart._id, 2, 'EMAIL')}
                          className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold transition-all"
                          title="Send Stage 2 (15% OFF) Email Nudge"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>

                        {/* Copy Link */}
                        <button
                          onClick={() => handleCopyLink(cart.recoveryToken)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all"
                          title="Copy 1-Click Restore Link"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Config Editor Modal */}
      {isConfigModalOpen && formData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-emerald-500" />
                  Drip Sequence Engine Configuration
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Customize multi-stage timings, delivery channels, discount vouchers, and message
                  templates.
                </p>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-6">
              {/* Channel Toggles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                  <input
                    type="checkbox"
                    checked={formData.isEnabled}
                    onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                    className="rounded text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Master Engine</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                  <input
                    type="checkbox"
                    checked={formData.whatsappEnabled}
                    onChange={(e) =>
                      setFormData({ ...formData, whatsappEnabled: e.target.checked })
                    }
                    className="rounded text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>WhatsApp</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                  <input
                    type="checkbox"
                    checked={formData.emailEnabled}
                    onChange={(e) => setFormData({ ...formData, emailEnabled: e.target.checked })}
                    className="rounded text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Email</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                  <input
                    type="checkbox"
                    checked={formData.smsEnabled}
                    onChange={(e) => setFormData({ ...formData, smsEnabled: e.target.checked })}
                    className="rounded text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>SMS</span>
                </label>
              </div>

              {/* Threshold Rules */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Min Cart Value (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minCartValue}
                    onChange={(e) =>
                      setFormData({ ...formData, minCartValue: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Max Reminders / Cart
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.maxRemindersPerCart}
                    onChange={(e) =>
                      setFormData({ ...formData, maxRemindersPerCart: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Auto-Expire After (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.autoExpireDays}
                    onChange={(e) =>
                      setFormData({ ...formData, autoExpireDays: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Stage Sub-Tabs */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                    Stage Customization
                  </h4>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setSelectedStageTab(s)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          selectedStageTab === s
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Stage {s}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.stages &&
                  formData.stages.map((stage, idx) => {
                    if (stage.stageNumber !== selectedStageTab) return null;
                    return (
                      <div key={idx} className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">
                              Stage Name
                            </label>
                            <input
                              type="text"
                              value={stage.name}
                              onChange={(e) => {
                                const updated = [...formData.stages];
                                updated[idx].name = e.target.value;
                                setFormData({ ...formData, stages: updated });
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">
                              Delay (Hours after abandonment)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={stage.delayHours}
                              onChange={(e) => {
                                const updated = [...formData.stages];
                                updated[idx].delayHours = Number(e.target.value);
                                setFormData({ ...formData, stages: updated });
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                            <input
                              type="checkbox"
                              checked={stage.offerDiscount}
                              onChange={(e) => {
                                const updated = [...formData.stages];
                                updated[idx].offerDiscount = e.target.checked;
                                setFormData({ ...formData, stages: updated });
                              }}
                              className="rounded text-emerald-500"
                            />
                            <span>Offer Discount Voucher in this stage</span>
                          </label>

                          {stage.offerDiscount && (
                            <div>
                              <label className="block text-xs font-bold text-slate-300 mb-1">
                                Discount Percentage (%)
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="90"
                                value={stage.discountPercentage}
                                onChange={(e) => {
                                  const updated = [...formData.stages];
                                  updated[idx].discountPercentage = Number(e.target.value);
                                  setFormData({ ...formData, stages: updated });
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                              />
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Email Subject
                          </label>
                          <input
                            type="text"
                            value={stage.emailSubject}
                            onChange={(e) => {
                              const updated = [...formData.stages];
                              updated[idx].emailSubject = e.target.value;
                              setFormData({ ...formData, stages: updated });
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            WhatsApp Template Copy
                          </label>
                          <textarea
                            rows={3}
                            value={stage.whatsappTemplate}
                            onChange={(e) => {
                              const updated = [...formData.stages];
                              updated[idx].whatsappTemplate = e.target.value;
                              setFormData({ ...formData, stages: updated });
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg transition-all"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Dispatch Modal */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                Dry-Run Test Message Dispatch
              </h3>
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendTestDispatch} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Delivery Channel</label>
                <select
                  value={testData.channel}
                  onChange={(e) => setTestData({ ...testData, channel: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-semibold"
                >
                  <option value="EMAIL">Email</option>
                  <option value="WHATSAPP">WhatsApp</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Stage Template</label>
                <select
                  value={testData.stageNumber}
                  onChange={(e) =>
                    setTestData({ ...testData, stageNumber: Number(e.target.value) })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-semibold"
                >
                  <option value="1">Stage 1: 1-Hour Gentle Nudge</option>
                  <option value="2">Stage 2: 24-Hour Sweetener (15% OFF)</option>
                  <option value="3">Stage 3: 72-Hour Urgency Warning</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Recipient {testData.channel === 'EMAIL' ? 'Email Address' : 'Phone Number'} *
                </label>
                <input
                  type={testData.channel === 'EMAIL' ? 'email' : 'text'}
                  required
                  placeholder={
                    testData.channel === 'EMAIL' ? 'admin@auramarket.com' : '+91 98765 43210'
                  }
                  value={testData.target}
                  onChange={(e) => setTestData({ ...testData, target: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-semibold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Send Test Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AbandonedCartRecoverySequenceManager;
