import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  ArrowRight,
  RefreshCw,
  Lock,
  Unlock,
  Calendar,
  Sparkles,
  Info,
  DollarSign,
  ChevronRight,
  TrendingUp,
  FileCheck2,
} from 'lucide-react';
import api from '../api/client';

export const VendorEscrowHoldTrackerModal = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState(false);
  const [releasingId, setReleasingId] = useState(null);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'ready' | 'locked' | 'disputed' | 'settled'
  const [notification, setNotification] = useState(null);
  const [data, setData] = useState({
    vendor: {
      storeName: 'Vendor Store',
      walletBalance: 0,
      escrowBalance: 0,
      customHoldDays: 7,
      payoutSchedule: 'WEEKLY_MONDAY',
      earlyReleaseEligible: false,
    },
    summary: {
      lockedEscrowBalance: 0,
      maturedReadyBalance: 0,
      disputedEscrowBalance: 0,
      totalSettledBalance: 0,
      totalPendingSubOrders: 0,
      maturedReadyCount: 0,
      disputedCount: 0,
    },
    upcomingReleases: [],
    subOrders: [],
    config: {
      defaultHoldDays: 7,
      minimumPayoutThreshold: 500,
    },
  });

  const fetchEscrowSummary = async () => {
    setLoading(true);
    try {
      const res = await api.get('/vendor/escrow/summary');
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch vendor escrow summary:', err);
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Could not load escrow ledger. Please check connection.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEscrowSummary();
    }
  }, [isOpen]);

  const handleReleaseAllMatured = async () => {
    if (data.summary.maturedReadyBalance <= 0) return;
    setReleasing(true);
    setNotification(null);
    try {
      const res = await api.post('/vendor/escrow/release-matured', {});
      if (res.data?.success) {
        setNotification({
          type: 'success',
          message: res.data.message || `Successfully transferred ₹${res.data.releasedAmount} to your wallet!`,
        });
        await fetchEscrowSummary();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Failed to release matured escrow funds.',
      });
    } finally {
      setReleasing(false);
    }
  };

  const handleReleaseSingleOrder = async (subOrderId, amount) => {
    setReleasingId(subOrderId);
    setNotification(null);
    try {
      const res = await api.post('/vendor/escrow/release-matured', { subOrderId });
      if (res.data?.success) {
        setNotification({
          type: 'success',
          message: res.data.message || `₹${amount} released to wallet!`,
        });
        await fetchEscrowSummary();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Release request failed.',
      });
    } finally {
      setReleasingId(null);
    }
  };

  if (!isOpen) return null;

  const filteredUpcoming = data.upcomingReleases.filter(item => {
    if (filterTab === 'ready') return item.isMatured;
    if (filterTab === 'locked') return !item.isMatured && !item.isDisputed;
    if (filterTab === 'disputed') return item.isDisputed;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Automated Escrow Hold & Settlement Engine
                </h2>
                <span className="text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                  Point #48
                </span>
                {data.vendor.earlyReleaseEligible && (
                  <span className="text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Power Seller 2-Day Early Release
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated post-delivery customer return-window protection & verified payout release
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchEscrowSummary}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
              title="Refresh ledger"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Toast Notification */}
          {notification && (
            <div
              className={`p-4 rounded-xl text-sm flex items-start justify-between border ${
                notification.type === 'success'
                  ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-200'
                  : 'bg-rose-950/50 border-rose-800/60 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {notification.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                <span>{notification.message}</span>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-slate-400 hover:text-white ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Active Dispute Warning Alert */}
          {data.summary.disputedCount > 0 && (
            <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-200">
                  {data.summary.disputedCount} Sub-Order Escrow Hold(s) Frozen Under Investigation
                </h4>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  An administrative dispute has frozen ₹{data.summary.disputedEscrowBalance.toLocaleString('en-IN')} pending customer return inspection or delivery verification. Payout will unlock once adjudicated by Super Admin.
                </p>
              </div>
            </div>
          )}

          {/* 4 Financial KPI Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Locked Escrow */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Locked in Return Window</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Lock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-white">
                  ₹{data.summary.lockedEscrowBalance.toLocaleString('en-IN')}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Standard {data.vendor.customHoldDays}-day hold period</span>
                </div>
              </div>
            </div>

            {/* KPI 2: Matured Ready for Release */}
            <div className="bg-slate-800/50 border border-emerald-500/30 rounded-xl p-4 relative overflow-hidden bg-gradient-to-br from-slate-800/50 via-slate-800/50 to-emerald-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-400">Ready for Release</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Unlock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-emerald-300">
                  ₹{data.summary.maturedReadyBalance.toLocaleString('en-IN')}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-400/90 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{data.summary.maturedReadyCount} suborder(s) fully matured</span>
                </div>
              </div>
            </div>

            {/* KPI 3: Total Settled to Wallet */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Lifetime Settled</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <FileCheck2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-white">
                  ₹{data.summary.totalSettledBalance.toLocaleString('en-IN')}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Released without dispute</span>
                </div>
              </div>
            </div>

            {/* KPI 4: Live Wallet Balance */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Available Wallet Balance</span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-white">
                  ₹{data.vendor.walletBalance.toLocaleString('en-IN')}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-blue-400">
                  <Info className="w-3.5 h-3.5" />
                  <span>Eligible for instant withdrawal</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Bar */}
          <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <Unlock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">
                  Instant Wallet Release Engine
                </h4>
                <p className="text-xs text-slate-300">
                  {data.summary.maturedReadyBalance > 0
                    ? `₹${data.summary.maturedReadyBalance.toLocaleString('en-IN')} is fully matured and ready to credit your active merchant wallet balance.`
                    : 'No matured funds awaiting release. Orders automatically mature at the end of customer return windows.'}
                </p>
              </div>
            </div>

            <button
              onClick={handleReleaseAllMatured}
              disabled={releasing || data.summary.maturedReadyBalance <= 0}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shrink-0 ${
                data.summary.maturedReadyBalance > 0 && !releasing
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/30'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
              }`}
            >
              {releasing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Crediting Wallet...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Release Matured Escrow to Wallet (Point #48)</span>
                </>
              )}
            </button>
          </div>

          {/* Upcoming Schedule & Orders Ledger */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">
                  Escrow Maturation Schedule & Sub-Orders
                </h3>
                <span className="text-xs font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                  {filteredUpcoming.length}
                </span>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    filterTab === 'all'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Active
                </button>
                <button
                  onClick={() => setFilterTab('ready')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                    filterTab === 'ready'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Ready ({data.summary.maturedReadyCount})
                </button>
                <button
                  onClick={() => setFilterTab('locked')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    filterTab === 'locked'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Locked
                </button>
                <button
                  onClick={() => setFilterTab('disputed')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                    filterTab === 'disputed'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Disputed ({data.summary.disputedCount})
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800 font-medium">
                    <tr>
                      <th className="py-3 px-4">SubOrder & Items</th>
                      <th className="py-3 px-4">Delivery & Hold</th>
                      <th className="py-3 px-4">Matures On</th>
                      <th className="py-3 px-4">Net Earning Held</th>
                      <th className="py-3 px-4">Status & Countdown</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-slate-500">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                          <span>Loading verified escrow ledger...</span>
                        </td>
                      </tr>
                    ) : filteredUpcoming.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-slate-500">
                          <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                          <span>No orders matching the selected escrow filter.</span>
                        </td>
                      </tr>
                    ) : (
                      filteredUpcoming.map(item => (
                        <tr
                          key={item.subOrderId}
                          className="hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">
                              {item.orderNumber}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {item.customerName} • {item.itemsCount} item(s)
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              {item.deliveredAt
                                ? new Date(item.deliveredAt).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                  })
                                : 'Pending Delivery'}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {item.escrowHoldDays}-day window
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {item.escrowReleaseDueDate ? (
                              <div>
                                <div className="font-medium text-slate-200">
                                  {new Date(item.escrowReleaseDueDate).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {new Date(item.escrowReleaseDueDate).toLocaleTimeString('en-IN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-500">Awaiting Delivery</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-white">
                              ₹{item.escrowAmount.toLocaleString('en-IN')}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Platform Cut: ₹{item.platformCommissionHeld}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {item.isDisputed ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Disputed Hold</span>
                              </div>
                            ) : item.isMatured ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Matured • Eligible Now</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {item.daysRemaining !== null
                                    ? `Matures in ${item.daysRemaining}d`
                                    : 'Pending Delivery'}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {item.isMatured ? (
                              <button
                                onClick={() => handleReleaseSingleOrder(item.subOrderId, item.escrowAmount)}
                                disabled={releasingId === item.subOrderId}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white font-medium text-[11px] flex items-center gap-1 ml-auto transition-colors disabled:opacity-50"
                              >
                                {releasingId === item.subOrderId ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Unlock className="w-3 h-3" />
                                )}
                                <span>Release ₹{item.escrowAmount}</span>
                              </button>
                            ) : (
                              <span className="text-slate-500 text-[11px]">Locked</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Policy Information Footer */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                Funds are held in compliance with India Consumer Protection (E-Commerce) Rules, guaranteeing customer return rights before vendor settlement.
              </span>
            </div>
            <div className="text-[11px] text-slate-400 shrink-0">
              Schedule: <strong className="text-slate-200">{data.vendor.payoutSchedule}</strong> • Return Window: <strong className="text-slate-200">{data.vendor.customHoldDays} Days</strong>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Store: <span className="font-semibold text-white">{data.vendor.storeName}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorEscrowHoldTrackerModal;
