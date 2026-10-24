import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Settings,
  Calendar,
  Layers,
  ArrowRight,
  UserCheck,
  RotateCcw,
  Sliders,
  DollarSign,
  Search,
  Filter,
  Save,
  Clock,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import api from '../api/client';

export const AdminEscrowSettlementEngine = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('radar'); // 'radar' | 'disputes' | 'config'
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'MATURED' | 'LOCKED' | 'DISPUTED'
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState(null);
  const [batchReleasing, setBatchReleasing] = useState(false);

  // Dispute Modal State
  const [disputeModal, setDisputeModal] = useState({
    isOpen: false,
    mode: 'freeze', // 'freeze' | 'resolve'
    subOrder: null,
    reason: '',
    decision: 'RELEASE_TO_VENDOR', // 'RELEASE_TO_VENDOR' | 'REFUND_TO_CUSTOMER'
    notes: '',
    processing: false,
  });

  const [radarData, setRadarData] = useState({
    platformTreasury: {
      totalPlatformEscrowLockedGMV: 0,
      maturedPendingReleaseGMV: 0,
      activeDisputedGMV: 0,
      totalSettledGMV: 0,
      totalRefundedGMV: 0,
      activeDisputeCount: 0,
      maturedCount: 0,
      totalActiveEscrowPool: 0,
    },
    forecast: [],
    vendorsWithMaturedEscrow: [],
    recentEscrowSubOrders: [],
    config: {
      defaultHoldDays: 7,
      minimumPayoutThreshold: 500,
      powerSellerEarlyRelease: {
        enabled: true,
        minVendorRating: 4.8,
        minCompletedOrders: 50,
        reducedHoldDays: 2,
        maxReturnRatePercent: 2.0,
      },
      autoReleaseEnabled: true,
      autoReleaseScheduleCron: '0 2 * * *',
      disputeFreezeWindowDays: 14,
    },
  });

  // Config Form State
  const [configForm, setConfigForm] = useState({
    defaultHoldDays: 7,
    minimumPayoutThreshold: 500,
    powerSellerEarlyRelease: {
      enabled: true,
      minVendorRating: 4.8,
      minCompletedOrders: 50,
      reducedHoldDays: 2,
      maxReturnRatePercent: 2.0,
    },
    autoReleaseEnabled: true,
    disputeFreezeWindowDays: 14,
  });
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchRadarData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/escrow/radar');
      if (res.data?.success && res.data?.data && !Array.isArray(res.data.data)) {
        setRadarData((prev) => ({ ...prev, ...res.data.data }));
        if (res.data.data.config) {
          setConfigForm({
            defaultHoldDays: res.data.data.config.defaultHoldDays || 7,
            minimumPayoutThreshold: res.data.data.config.minimumPayoutThreshold || 500,
            powerSellerEarlyRelease: res.data.data.config.powerSellerEarlyRelease || {
              enabled: true,
              minVendorRating: 4.8,
              minCompletedOrders: 50,
              reducedHoldDays: 2,
              maxReturnRatePercent: 2.0,
            },
            autoReleaseEnabled: res.data.data.config.autoReleaseEnabled !== false,
            disputeFreezeWindowDays: res.data.data.config.disputeFreezeWindowDays || 14,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load escrow radar:', err);
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Could not load platform escrow treasury data.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRadarData();
  }, []);

  const handleBatchRelease = async () => {
    if (radarData.platformTreasury.maturedPendingReleaseGMV <= 0) return;
    setBatchReleasing(true);
    setNotification(null);
    try {
      const res = await api.post('/admin/escrow/batch-release', {});
      if (res.data?.success) {
        setNotification({
          type: 'success',
          message: res.data.message || '1-Click Batch Escrow Release completed successfully.',
        });
        await fetchRadarData();
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Failed to execute platform batch release.',
      });
    } finally {
      setBatchReleasing(false);
    }
  };

  const handleOpenDispute = (subOrder, mode = 'freeze') => {
    setDisputeModal({
      isOpen: true,
      mode,
      subOrder,
      reason: subOrder.disputeReason || '',
      decision: 'RELEASE_TO_VENDOR',
      notes: '',
      processing: false,
    });
  };

  const handleSubmitDispute = async () => {
    if (!disputeModal.subOrder) return;
    setDisputeModal(prev => ({ ...prev, processing: true }));
    try {
      if (disputeModal.mode === 'freeze') {
        const res = await api.post(`/admin/escrow/${disputeModal.subOrder.subOrderId}/dispute`, {
          reason: disputeModal.reason || 'Administrative fraud investigation hold',
          notes: disputeModal.notes,
        });
        if (res.data?.success) {
          setNotification({
            type: 'success',
            message: `SubOrder #${disputeModal.subOrder.subOrderId} escrow payout frozen under dispute.`,
          });
        }
      } else {
        const res = await api.post(`/admin/escrow/${disputeModal.subOrder.subOrderId}/resolve-dispute`, {
          decision: disputeModal.decision,
          notes: disputeModal.notes,
        });
        if (res.data?.success) {
          setNotification({
            type: 'success',
            message: `Dispute resolved with decision: ${disputeModal.decision}.`,
          });
        }
      }
      setDisputeModal({ isOpen: false, mode: 'freeze', subOrder: null, reason: '', decision: 'RELEASE_TO_VENDOR', notes: '', processing: false });
      await fetchRadarData();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Dispute action failed.',
      });
      setDisputeModal(prev => ({ ...prev, processing: false }));
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    setNotification(null);
    try {
      const res = await api.put('/admin/escrow/config', configForm);
      if (res.data?.success) {
        setNotification({
          type: 'success',
          message: 'Escrow hold and release rules updated successfully!',
        });
        await fetchRadarData();
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Failed to save escrow settings.',
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const recentOrders = Array.isArray(radarData?.recentEscrowSubOrders) ? radarData.recentEscrowSubOrders : [];
  const filteredOrders = recentOrders.filter(order => {
    if (filterStatus === 'MATURED' && !order.isMatured) return false;
    if (filterStatus === 'LOCKED' && (order.isMatured || order.isDisputed)) return false;
    if (filterStatus === 'DISPUTED' && !order.isDisputed) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNumber = order.orderNumber?.toLowerCase().includes(q);
      const matchVendor = order.vendor?.storeName?.toLowerCase().includes(q);
      const matchCustomer = order.customer?.name?.toLowerCase().includes(q);
      return matchNumber || matchVendor || matchCustomer;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Multi-Vendor Escrow Payout Engine & Treasury Radar
              </h1>
              <span className="text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2.5 py-0.5 rounded-full">
                Point #48
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Central treasury settlement command: 7-day post-delivery hold periods, fraud dispute freezing, and 1-click batch payout release.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={fetchRadarData}
            disabled={loading}
            className="p-2.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/60 transition-colors"
            title="Refresh Radar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleBatchRelease}
            disabled={batchReleasing || radarData.platformTreasury.maturedPendingReleaseGMV <= 0}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${
              radarData.platformTreasury.maturedPendingReleaseGMV > 0 && !batchReleasing
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/50'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
            }`}
          >
            {batchReleasing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing Batch Settlement...</span>
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>1-Click Platform Batch Release (Point #48)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between border ${
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
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* 4 Treasury KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Locked Escrow GMV</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">
              ₹{radarData.platformTreasury.totalPlatformEscrowLockedGMV.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>In active return window hold</span>
            </div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400">Matured Pending Release</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Unlock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-300">
              ₹{radarData.platformTreasury.maturedPendingReleaseGMV.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-400/90 mt-1 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{radarData.platformTreasury.maturedCount} suborders eligible for payout</span>
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Active Dispute Holds</span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">
              ₹{radarData.platformTreasury.activeDisputedGMV.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-rose-400 mt-1 flex items-center gap-1.5 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{radarData.platformTreasury.activeDisputeCount} frozen suborders</span>
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Settled GMV</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">
              ₹{radarData.platformTreasury.totalSettledGMV.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
              <span>Transferred to vendor wallets</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('radar')}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'radar'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Escrow Sub-Orders Radar</span>
        </button>
        <button
          onClick={() => setActiveTab('disputes')}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'disputes'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Disputes & Investigations ({radarData.platformTreasury.activeDisputeCount})</span>
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'config'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Escrow Rules & Policy Configuration</span>
        </button>
      </div>

      {/* TAB 1: Radar Table */}
      {activeTab === 'radar' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden space-y-4 p-5">
          {/* Table Header Filter & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by SubOrder #, vendor store, customer..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs self-start">
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  filterStatus === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('MATURED')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  filterStatus === 'MATURED' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Matured ({radarData.platformTreasury.maturedCount})
              </button>
              <button
                onClick={() => setFilterStatus('LOCKED')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  filterStatus === 'LOCKED' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                In Hold Period
              </button>
              <button
                onClick={() => setFilterStatus('DISPUTED')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  filterStatus === 'DISPUTED' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Disputed ({radarData.platformTreasury.activeDisputeCount})
              </button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800 font-medium">
                  <tr>
                    <th className="py-3 px-4">SubOrder #</th>
                    <th className="py-3 px-4">Vendor Store</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Escrow Amount</th>
                    <th className="py-3 px-4">Delivered / Due</th>
                    <th className="py-3 px-4">Escrow Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                        <span>Loading platform escrow ledger...</span>
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-500">
                        <span>No escrow suborders found for current filters.</span>
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map(order => (
                      <tr key={order.subOrderId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-white">
                          {order.orderNumber}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-200">{order.vendor?.storeName || 'Vendor'}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {order.customer?.name || 'Customer'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">₹{order.escrowAmount.toLocaleString('en-IN')}</div>
                          <div className="text-[10px] text-slate-500">Cut: ₹{order.platformCommissionHeld}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            {order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Pending'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Due: {order.escrowReleaseDueDate ? new Date(order.escrowReleaseDueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {order.isDisputed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <AlertTriangle className="w-3 h-3" /> Disputed Hold
                            </span>
                          ) : order.isMatured ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" /> Matured Ready
                            </span>
                          ) : order.escrowStatus === 'RELEASED_TO_WALLET' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              Released
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Clock className="w-3 h-3" /> In Hold Period
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {order.isDisputed ? (
                              <button
                                onClick={() => handleOpenDispute(order, 'resolve')}
                                className="px-2.5 py-1 bg-amber-600/80 hover:bg-amber-600 text-white rounded-lg text-[11px] font-medium transition-colors"
                              >
                                Resolve
                              </button>
                            ) : (
                              order.escrowStatus !== 'RELEASED_TO_WALLET' && (
                                <button
                                  onClick={() => handleOpenDispute(order, 'freeze')}
                                  className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg text-[11px] font-medium border border-rose-500/30 transition-colors"
                                >
                                  Dispute Hold
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Disputes & Adjudication View */}
      {activeTab === 'disputes' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">
                Active Escrow Dispute Adjudication Engine
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Investigate suspected return-fraud, damaged transit packages, or RTO claims before releasing escrow funds.
              </p>
            </div>
            <span className="text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1 rounded-full">
              {radarData.platformTreasury.activeDisputeCount} Active Hold(s)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {radarData.recentEscrowSubOrders
              .filter(o => o.isDisputed)
              .map(order => (
                <div
                  key={order.subOrderId}
                  className="bg-slate-800/50 border border-rose-500/30 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-white text-sm">{order.orderNumber}</div>
                      <div className="text-xs text-slate-400">
                        Store: <strong className="text-slate-200">{order.vendor?.storeName}</strong>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-white bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
                      ₹{order.escrowAmount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="bg-rose-950/30 border border-rose-900/50 rounded-lg p-2.5 text-xs text-rose-200">
                    <strong className="block text-rose-400 text-[10px] uppercase tracking-wider mb-0.5">
                      Freeze Reason:
                    </strong>
                    {order.disputeReason || 'Administrative freeze pending customer return verification'}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-700/50">
                    <button
                      onClick={() => handleOpenDispute(order, 'resolve')}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <span>Adjudicate Dispute</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            {radarData.platformTreasury.activeDisputeCount === 0 && (
              <div className="col-span-2 py-12 text-center text-slate-500 bg-slate-800/20 rounded-xl border border-slate-800">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                <h4 className="text-sm font-semibold text-white">Clean Escrow Health</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Zero active dispute freezes. All vendor settlements are processing smoothly according to hold policies.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Escrow Rules & Policy Configuration */}
      {activeTab === 'config' && (
        <form onSubmit={handleSaveConfig} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white">System-Wide Escrow & Hold Policies</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure standard consumer return protection windows, minimum thresholds, and Power-Seller fast-track terms.
              </p>
            </div>
            <button
              type="submit"
              disabled={savingConfig}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-950/40 transition-colors disabled:opacity-50"
            >
              {savingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Policy Rules</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Standard Hold Window */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Standard Hold Period (Days)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={configForm.defaultHoldDays}
                onChange={e => setConfigForm({ ...configForm, defaultHoldDays: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-500">
                Default 7 days aligns with statutory e-commerce return window across India.
              </p>
            </div>

            {/* Minimum Payout Threshold */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Minimum Payout Threshold (₹)
              </label>
              <input
                type="number"
                min="0"
                value={configForm.minimumPayoutThreshold}
                onChange={e => setConfigForm({ ...configForm, minimumPayoutThreshold: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-500">
                Minimum wallet balance required for vendor self-service payout withdrawals.
              </p>
            </div>

            {/* Dispute Freeze Window */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Dispute Investigation Window (Days)
              </label>
              <input
                type="number"
                min="1"
                value={configForm.disputeFreezeWindowDays}
                onChange={e => setConfigForm({ ...configForm, disputeFreezeWindowDays: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-500">
                Max days an administrative dispute hold remains frozen before requiring mandatory resolution.
              </p>
            </div>

            {/* Auto-Release Enabled Toggle */}
            <div className="space-y-1.5 flex flex-col justify-center">
              <label className="text-xs font-semibold text-slate-300">
                Automated Daily Release Engine
              </label>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="autoReleaseToggle"
                  checked={configForm.autoReleaseEnabled}
                  onChange={e => setConfigForm({ ...configForm, autoReleaseEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700"
                />
                <label htmlFor="autoReleaseToggle" className="text-xs text-slate-300 cursor-pointer">
                  Enable platform automated 2:00 AM cron release for all matured suborders
                </label>
              </div>
            </div>
          </div>

          {/* Power Seller Early Release Card */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Power-Seller Early Release Fast Track</span>
                  <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    Reduced 2-Day Hold
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Top-rated verified merchants bypass the 7-day wait with a fast-track 2-day escrow window.
                </p>
              </div>

              <input
                type="checkbox"
                checked={configForm.powerSellerEarlyRelease?.enabled}
                onChange={e =>
                  setConfigForm({
                    ...configForm,
                    powerSellerEarlyRelease: {
                      ...configForm.powerSellerEarlyRelease,
                      enabled: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Min Vendor Rating</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  value={configForm.powerSellerEarlyRelease?.minVendorRating || 4.8}
                  onChange={e =>
                    setConfigForm({
                      ...configForm,
                      powerSellerEarlyRelease: {
                        ...configForm.powerSellerEarlyRelease,
                        minVendorRating: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Min Completed Orders</label>
                <input
                  type="number"
                  min="1"
                  value={configForm.powerSellerEarlyRelease?.minCompletedOrders || 50}
                  onChange={e =>
                    setConfigForm({
                      ...configForm,
                      powerSellerEarlyRelease: {
                        ...configForm.powerSellerEarlyRelease,
                        minCompletedOrders: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Fast-Track Hold Days</label>
                <input
                  type="number"
                  min="0"
                  max="14"
                  value={configForm.powerSellerEarlyRelease?.reducedHoldDays || 2}
                  onChange={e =>
                    setConfigForm({
                      ...configForm,
                      powerSellerEarlyRelease: {
                        ...configForm.powerSellerEarlyRelease,
                        reducedHoldDays: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Dispute Modal (Freeze or Resolve) */}
      {disputeModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {disputeModal.mode === 'freeze' ? (
                  <>
                    <ShieldAlert className="w-5 h-5 text-rose-400" />
                    <span>Administrative Escrow Dispute Freeze</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                    <span>Adjudicate & Resolve Dispute</span>
                  </>
                )}
              </h3>
              <button
                onClick={() => setDisputeModal({ ...disputeModal, isOpen: false })}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-1 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              <div>SubOrder: <strong className="text-white">{disputeModal.subOrder?.orderNumber}</strong></div>
              <div>Vendor: <strong className="text-white">{disputeModal.subOrder?.vendor?.storeName}</strong></div>
              <div>Escrow Held: <strong className="text-white">₹{disputeModal.subOrder?.escrowAmount?.toLocaleString('en-IN')}</strong></div>
            </div>

            {disputeModal.mode === 'freeze' ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Dispute Reason</label>
                  <input
                    type="text"
                    placeholder="e.g. Suspected return fraud / transit damage / RTO claim"
                    value={disputeModal.reason}
                    onChange={e => setDisputeModal({ ...disputeModal, reason: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Internal Audit Notes</label>
                  <textarea
                    rows="3"
                    placeholder="Provide evidence or context for this freeze..."
                    value={disputeModal.notes}
                    onChange={e => setDisputeModal({ ...disputeModal, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Resolution Decision</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDisputeModal({ ...disputeModal, decision: 'RELEASE_TO_VENDOR' })}
                      className={`p-3 rounded-xl border text-xs font-bold text-left transition-colors ${
                        disputeModal.decision === 'RELEASE_TO_VENDOR'
                          ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
                          : 'border-slate-700 bg-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Release to Vendor</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 font-normal">
                        Credits vendor wallet; claim is dismissed.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDisputeModal({ ...disputeModal, decision: 'REFUND_TO_CUSTOMER' })}
                      className={`p-3 rounded-xl border text-xs font-bold text-left transition-colors ${
                        disputeModal.decision === 'REFUND_TO_CUSTOMER'
                          ? 'border-rose-500 bg-rose-950/40 text-rose-200'
                          : 'border-slate-700 bg-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <RotateCcw className="w-4 h-4 text-rose-400" />
                        <span>Refund Customer</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 font-normal">
                        Credits customer wallet; vendor payout canceled.
                      </p>
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Adjudication Notes</label>
                  <textarea
                    rows="3"
                    placeholder="Enter final review rationale..."
                    value={disputeModal.notes}
                    onChange={e => setDisputeModal({ ...disputeModal, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDisputeModal({ ...disputeModal, isOpen: false })}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitDispute}
                disabled={disputeModal.processing}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                {disputeModal.processing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm {disputeModal.mode === 'freeze' ? 'Freeze' : 'Resolution'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEscrowSettlementEngine;
