import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCw,
  Search,
  Filter,
  Eye,
  Check,
  X,
  User,
  Phone,
  MapPin,
  TrendingDown,
  Lock,
  Layers,
  ArrowRight,
} from 'lucide-react';
import axios from 'axios';

export default function RtoGuardManager() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({
    totalEvaluated: 0,
    totalFlagged: 0,
    highRiskCount: 0,
    mediumRiskCount: 0,
    pendingVerification: 0,
    verifiedCount: 0,
    overriddenCount: 0,
    rejectedCount: 0,
  });
  const [filter, setFilter] = useState('all'); // 'all' | 'high' | 'pending' | 'verified' | 'rejected'
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [notification, setNotification] = useState(null);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/rto-guard/overview', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.data?.success) {
        setStats(res.data.stats || {});
        setData(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch RTO Guard overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleOverride = async (orderId, action) => {
    setActionLoading(orderId);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        '/api/admin/rto-guard/override',
        { orderId, action, notes: `Manual ${action} by Super Admin via RTO Guard Dashboard` },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (res.data?.success) {
        setNotification({
          type: 'success',
          message: res.data.message || `Order ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`,
        });
        fetchOverview();
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || `Failed to ${action} order`,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredOrders = data.filter((ord) => {
    if (filter === 'high' && ord.rtoRiskLevel !== 'HIGH') return false;
    if (filter === 'pending' && ord.rtoVerificationStatus !== 'PENDING') return false;
    if (filter === 'verified' && !['VERIFIED', 'OVERRIDDEN_BY_ADMIN'].includes(ord.rtoVerificationStatus)) return false;
    if (filter === 'rejected' && ord.rtoVerificationStatus !== 'REJECTED') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const numMatch = (ord.orderNumber || '').toLowerCase().includes(q);
      const nameMatch = (ord.customer?.name || ord.shippingAddress?.recipientName || '').toLowerCase().includes(q);
      const phoneMatch = (ord.shippingAddress?.phone || ord.customer?.phone || '').includes(q);
      if (!numMatch && !nameMatch && !phoneMatch) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">RTO Guard & Spam Order Prevention</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-500/20 text-red-400 border border-red-500/30">
                Point #74
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated COD risk score calculation, OTP security challenges, and high-risk spam mitigation
            </p>
          </div>
        </div>

        <button
          onClick={fetchOverview}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-2 self-start sm:self-auto border border-slate-700"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between border ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border-red-500/20 text-red-300'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Telemetry Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Evaluated Orders
          </span>
          <div className="text-2xl font-black text-white">{stats.totalEvaluated}</div>
          <span className="text-[10px] text-slate-500">100% orders analyzed</span>
        </div>

        <div className="bg-slate-900 border border-red-500/20 rounded-2xl p-4 space-y-1 bg-gradient-to-br from-red-500/5 to-transparent">
          <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider block">
            High Risk Flagged
          </span>
          <div className="text-2xl font-black text-red-400">{stats.highRiskCount}</div>
          <span className="text-[10px] text-red-400/80">Risk score 70 - 100</span>
        </div>

        <div className="bg-slate-900 border border-amber-500/20 rounded-2xl p-4 space-y-1 bg-gradient-to-br from-amber-500/5 to-transparent">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
            Pending OTP Challenge
          </span>
          <div className="text-2xl font-black text-amber-400">{stats.pendingVerification}</div>
          <span className="text-[10px] text-amber-400/80">Awaiting customer verification</span>
        </div>

        <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-4 space-y-1 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
            Verified / Cleared
          </span>
          <div className="text-2xl font-black text-emerald-400">
            {stats.verifiedCount + stats.overriddenCount}
          </div>
          <span className="text-[10px] text-emerald-400/80">Safe for merchant dispatch</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search flagged order by #, customer name or phone..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'all' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Flagged
          </button>
          <button
            onClick={() => setFilter('high')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'high' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            High Risk (70+)
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'pending' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Pending OTP
          </button>
          <button
            onClick={() => setFilter('verified')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'verified' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Cleared
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'rejected' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Rejected
          </button>
        </div>
      </div>

      {/* Flagged Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider">
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Customer & Contact</th>
                <th className="py-3 px-4">Amount & Payment</th>
                <th className="py-3 px-4 text-center">Risk Score</th>
                <th className="py-3 px-4">Detected Risk Triggers</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-50 text-emerald-400" />
                    No orders matching the active RTO risk filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const score = ord.rtoRiskScore || 0;
                  const isHigh = ord.rtoRiskLevel === 'HIGH' || score >= 70;
                  const isPending = ord.rtoVerificationStatus === 'PENDING';
                  const isCleared = ['VERIFIED', 'OVERRIDDEN_BY_ADMIN'].includes(ord.rtoVerificationStatus);
                  const isRejected = ord.rtoVerificationStatus === 'REJECTED';

                  return (
                    <tr key={ord._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-white">#{ord.orderNumber}</div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(ord.createdAt).toLocaleDateString('en-IN')}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-200">
                          {ord.customer?.name || ord.shippingAddress?.recipientName}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>{ord.shippingAddress?.phone || ord.customer?.phone}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[180px]">
                          {ord.shippingAddress?.city}, {ord.shippingAddress?.state} - {ord.shippingAddress?.pincode}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-white">₹{ord.totalAmount?.toLocaleString('en-IN')}</div>
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            ord.paymentMethod === 'COD' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {ord.paymentMethod}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                              isHigh
                                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {score}/100
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase">
                            {ord.rtoRiskLevel || 'LOW'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-1 max-w-[260px]">
                          {(ord.rtoRiskReasons || []).slice(0, 2).map((r, i) => (
                            <div key={i} className="text-[10px] text-amber-300 flex items-start gap-1">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5 text-amber-400" />
                              <span className="truncate">{r}</span>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {isPending && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Pending OTP
                          </span>
                        )}
                        {isCleared && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Cleared
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                            Rejected
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isCleared && (
                            <button
                              onClick={() => handleOverride(ord._id, 'APPROVE')}
                              disabled={actionLoading === ord._id}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-colors flex items-center gap-1 shadow-sm"
                              title="Clear RTO Flag & Authorize Dispatch"
                            >
                              <Check className="w-3 h-3" />
                              <span>Clear Flag</span>
                            </button>
                          )}
                          {!isRejected && (
                            <button
                              onClick={() => handleOverride(ord._id, 'REJECT')}
                              disabled={actionLoading === ord._id}
                              className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] transition-colors flex items-center gap-1 shadow-sm"
                              title="Cancel & Block as Fake/Spam"
                            >
                              <X className="w-3 h-3" />
                              <span>Block Spam</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
