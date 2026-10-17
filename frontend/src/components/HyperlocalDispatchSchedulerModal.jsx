import React, { useState, useEffect } from 'react';
import {
  Zap,
  Clock,
  Bike,
  Package,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Download,
  Settings,
  ChevronRight,
  UserCheck,
  ShieldCheck,
  MapPin,
  X,
  Sliders,
  Phone,
  BarChart3,
  Calendar,
  Compass,
} from 'lucide-react';
import FleetLiveMapRadarModal from './FleetLiveMapRadarModal';

export default function HyperlocalDispatchSchedulerModal({ isOpen, onClose, token }) {
  const [loading, setLoading] = useState(false);
  const [radarData, setRadarData] = useState(null);
  const [config, setConfig] = useState(null);
  const [riders, setRiders] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Filters
  const [dispatchType, setDispatchType] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [slaStatus, setSlaStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedRiderFilter, setSelectedRiderFilter] = useState('');

  // Modals / Drawers
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [manualAssignTask, setManualAssignTask] = useState(null);
  const [selectedRiderForManual, setSelectedRiderForManual] = useState('');
  const [manualReason, setManualReason] = useState('Manual dispatcher optimization');
  const [showFleetMap, setShowFleetMap] = useState(false);

  // Auto-refresh interval
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchRadar = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dispatchType !== 'ALL') params.append('dispatchType', dispatchType);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (slaStatus !== 'ALL') params.append('slaStatus', slaStatus);
      if (selectedRiderFilter) params.append('riderId', selectedRiderFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await fetch(`/api/logistics/dispatch/radar?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setRadarData(data);
      }
    } catch (err) {
      console.error('Failed to load dispatch radar:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/logistics/slots/config', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.data);
      }
    } catch (err) {
      console.error('Failed to load slot config:', err);
    }
  };

  const fetchRiders = async () => {
    try {
      const res = await fetch('/api/logistics/riders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setRiders(data.data);
      }
    } catch (err) {
      console.error('Failed to load fleet riders:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRadar();
      fetchConfig();
      fetchRiders();
    }
  }, [isOpen, dispatchType, statusFilter, slaStatus, selectedRiderFilter]);

  // Periodic heartbeat every 15s if enabled
  useEffect(() => {
    if (!isOpen || !autoRefresh) return;
    const interval = setInterval(() => {
      fetchRadar();
      fetchRiders();
    }, 15000);
    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, dispatchType, statusFilter, slaStatus, selectedRiderFilter]);

  const handleBatchAutoAssign = async () => {
    try {
      setActionLoading(true);
      const res = await fetch('/api/logistics/dispatch/batch-auto-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        fetchRadar();
        fetchRiders();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Batch auto-dispatch failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSingleAutoAssign = async (taskId) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/logistics/dispatch/auto-assign/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        fetchRadar();
        fetchRiders();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Single auto-assign failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualAssignSubmit = async (e) => {
    e.preventDefault();
    if (!manualAssignTask || !selectedRiderForManual) return;
    try {
      setActionLoading(true);
      const res = await fetch('/api/logistics/dispatch/manual-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          taskId: manualAssignTask._id,
          riderId: selectedRiderForManual,
          reason: manualReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setManualAssignTask(null);
        setSelectedRiderForManual('');
        fetchRadar();
        fetchRiders();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Manual assignment failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await fetch('/api/logistics/slots/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Slot configuration saved successfully.' });
        setConfig(data.data);
        setShowSettingsDrawer(false);
        fetchRadar();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update configuration.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    window.open('/api/logistics/dispatch/radar/export-csv', '_blank');
  };

  if (!isOpen) return null;

  const summary = radarData?.summary || {
    activeHyperlocalCount: 0,
    slaAtRiskCount: 0,
    slaBreachedCount: 0,
    unassignedCount: 0,
    onDutyRidersCount: 0,
    totalRidersCount: 0,
    fleetUtilizationPercent: 0,
    activeTransitDeliveries: 0,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-7xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-orange-500/20 text-white">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Hyperlocal Dispatch & Delivery Slot Scheduler
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Point #42
                </span>
                <span className="flex items-center space-x-1 px-2 py-0.5 text-xs rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Live Dispatch Radar</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                1-Hour instant express, dynamic time slot capacity, and automated least-loaded courier dispatch
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                autoRefresh
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
              <span>Auto-Sync 15s</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Export RFC-4180 CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => setShowFleetMap(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition"
              title="Open Live GPS Fleet Map (Point #43)"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              <span>Fleet Live Map</span>
            </button>

            <button
              onClick={() => setShowSettingsDrawer(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Slot Rules</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`px-6 py-2.5 text-xs flex items-center justify-between border-b ${
              message.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Bento KPI Ribbon */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">1-Hour Hyperlocal Active</span>
                <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Zap className="w-4 h-4 animate-pulse" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold text-white tracking-tight">
                {summary.activeHyperlocalCount}
              </div>
              <div className="mt-1 flex items-center text-[11px] text-amber-400">
                <span>⚡ Active instant delivery orders</span>
              </div>
            </div>

            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">At-Risk SLA (&lt; 20m)</span>
                <span className={`p-2 rounded-lg ${summary.slaAtRiskCount > 0 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse' : 'bg-slate-700/40 text-slate-400'}`}>
                  <AlertTriangle className="w-4 h-4" />
                </span>
              </div>
              <div className={`mt-2 text-2xl font-bold tracking-tight ${summary.slaAtRiskCount > 0 ? 'text-rose-400' : 'text-white'}`}>
                {summary.slaAtRiskCount}
              </div>
              <div className="mt-1 flex items-center text-[11px] text-slate-400">
                <span>{summary.slaBreachedCount} breached SLA</span>
              </div>
            </div>

            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">On-Duty Fleet Riders</span>
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Bike className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold text-white tracking-tight">
                {summary.onDutyRidersCount} <span className="text-sm font-normal text-slate-400">/ {summary.totalRidersCount}</span>
              </div>
              <div className="mt-1 flex items-center text-[11px] text-emerald-400">
                <span>🛵 Available for auto-dispatch</span>
              </div>
            </div>

            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Unassigned Tasks</span>
                <span className={`p-2 rounded-lg ${summary.unassignedCount > 0 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-slate-700/40 text-slate-400'}`}>
                  <Package className="w-4 h-4" />
                </span>
              </div>
              <div className={`mt-2 text-2xl font-bold tracking-tight ${summary.unassignedCount > 0 ? 'text-orange-400' : 'text-white'}`}>
                {summary.unassignedCount}
              </div>
              <div className="mt-1 flex items-center text-[11px] text-slate-400">
                <span>Awaiting courier assignment</span>
              </div>
            </div>

            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Fleet Utilization</span>
                <span className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <BarChart3 className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold text-white tracking-tight">
                {summary.fleetUtilizationPercent}%
              </div>
              <div className="mt-1 flex items-center text-[11px] text-cyan-400">
                <span>{summary.activeTransitDeliveries} orders in transit</span>
              </div>
            </div>
          </div>

          {/* Today's Scheduled Slots Utilization Meter */}
          {radarData?.slotUtilization && radarData.slotUtilization.length > 0 && (
            <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                    Today's Delivery Slot Capacity & Utilization
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  Capacities configured per time window
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {radarData.slotUtilization.map((slot) => (
                  <div key={slot.slotKey} className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-200">
                      <span className="truncate">{slot.title}</span>
                      <span className="font-mono text-amber-400">{slot.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          slot.percentage >= 90
                            ? 'bg-rose-500'
                            : slot.percentage >= 60
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${slot.percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1.5 font-mono">
                      <span>{slot.startTime} - {slot.endTime}</span>
                      <span>{slot.booked} / {slot.maxCapacity} booked</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Toolbar & Filters */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
              <button
                onClick={() => setDispatchType('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  dispatchType === 'ALL'
                    ? 'bg-amber-500 text-black font-semibold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                All Dispatch Types
              </button>
              <button
                onClick={() => setDispatchType('1_HOUR_HYPERLOCAL')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  dispatchType === '1_HOUR_HYPERLOCAL'
                    ? 'bg-amber-500 text-black font-semibold'
                    : 'bg-slate-800 text-amber-400 hover:bg-slate-700'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>1-Hour Express</span>
              </button>
              <button
                onClick={() => setDispatchType('SCHEDULED_SLOT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  dispatchType === 'SCHEDULED_SLOT'
                    ? 'bg-amber-500 text-black font-semibold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Scheduled Slots
              </button>

              <select
                value={slaStatus}
                onChange={(e) => setSlaStatus(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All SLA Statuses</option>
                <option value="AT_RISK">⚠️ SLA At Risk (&lt; 20m)</option>
                <option value="BREACHED">🚨 SLA Breached</option>
              </select>

              <select
                value={selectedRiderFilter}
                onChange={(e) => setSelectedRiderFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="">All Riders</option>
                <option value="UNASSIGNED">Unassigned Only</option>
                {riders.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name} ({r.dutyStatus})
                  </option>
                ))}
              </select>
            </div>

            {/* Search and Batch Auto-Assign CTA */}
            <div className="flex items-center space-x-2.5 w-full md:w-auto justify-end">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search order, phone, address..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchRadar()}
                  className="pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 w-52"
                />
              </div>

              <button
                onClick={handleBatchAutoAssign}
                disabled={actionLoading}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-md shadow-orange-500/20 transition disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Run Batch Auto-Assign</span>
              </button>
            </div>
          </div>

          {/* Tasks Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold tracking-wider uppercase text-[11px]">
                    <th className="py-3 px-4">Task &amp; Dispatch Mode</th>
                    <th className="py-3 px-4">Delivery Slot &amp; SLA</th>
                    <th className="py-3 px-4">Customer &amp; Destination</th>
                    <th className="py-3 px-4">Pickup Merchant</th>
                    <th className="py-3 px-4">Assigned Courier</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading && !radarData ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                        <span>Loading live fleet radar telemetry...</span>
                      </td>
                    </tr>
                  ) : radarData?.tasks?.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                        <p className="font-medium text-slate-200">No matching dispatch tasks found</p>
                        <p className="text-xs text-slate-500">All current orders have been processed or filter parameters yielded zero tasks.</p>
                      </td>
                    </tr>
                  ) : (
                    radarData?.tasks?.map((task) => {
                      const isHyperlocal = task.dispatchType === '1_HOUR_HYPERLOCAL' || task.deliverySlot?.is1HourHyperlocal;
                      return (
                        <tr key={task._id} className="hover:bg-slate-800/30 transition">
                          <td className="py-3 px-4 font-mono">
                            <div className="font-semibold text-slate-200">
                              #{task._id.slice(-6).toUpperCase()}
                            </div>
                            <div className="mt-1">
                              {isHyperlocal ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  <Zap className="w-2.5 h-2.5 animate-pulse" />
                                  <span>1-HOUR HYPERLOCAL</span>
                                </span>
                              ) : task.dispatchType === 'SCHEDULED_SLOT' ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>SCHEDULED</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                  STANDARD
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="text-slate-300 font-medium">
                              {task.deliverySlot?.title || 'Standard Window'}
                            </div>
                            {task.slaRemainingMinutes !== null ? (
                              <div className="mt-1 flex items-center space-x-1 text-[11px] font-mono">
                                <span
                                  className={`px-1.5 py-0.5 rounded font-semibold ${
                                    task.isSlaBreached
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                      : task.isSlaAtRisk
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  }`}
                                >
                                  {task.isSlaBreached
                                    ? `Breached (${Math.abs(task.slaRemainingMinutes)}m ago)`
                                    : `${task.slaRemainingMinutes} mins left`}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500">Standard Transit</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-200">
                              {task.dropLocation?.recipientName || 'Customer'}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center space-x-1">
                              <span>{task.dropLocation?.phone}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-xs" title={task.dropLocation?.address}>
                              {task.dropLocation?.address || 'Address'} (PIN: {task.dropLocation?.pincode})
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="text-slate-300 font-medium">
                              {task.pickupLocation?.storeName || 'AuraMarket Hub'}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              PIN: {task.pickupLocation?.pincode || 'Local'}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {task.deliveryPartner ? (
                              <div>
                                <div className="flex items-center space-x-1.5 font-medium text-slate-200">
                                  <Bike className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>{task.deliveryPartner.name}</span>
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center space-x-1">
                                  <Phone className="w-3 h-3 text-slate-500" />
                                  <span>{task.deliveryPartner.phone}</span>
                                </div>
                                {task.autoAssigned && (
                                  <span className="text-[10px] text-emerald-400/90 font-mono">
                                    [Auto-Assigned]
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                <span>UNASSIGNED</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                task.status === 'DELIVERED'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : task.status === 'OUT_FOR_DELIVERY'
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                  : task.status === 'PICKED_UP'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : task.status === 'FAILED'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {task.status}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right space-x-2">
                            {task.otpVerificationLog?.isLocked && (
                              <button
                                onClick={async () => {
                                  try {
                                    await api.post(`/delivery/tasks/${task._id}/unlock-otp`);
                                    fetchRadarData();
                                  } catch (err) {
                                    alert(err.response?.data?.message || 'Failed to unlock OTP');
                                  }
                                }}
                                className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-semibold transition"
                                title="Unlock OTP Attempts (Point #44 Anti-Brute-Force Reset)"
                              >
                                Unlock OTP
                              </button>
                            )}

                            {task.status === 'DELIVERED' && (
                              <button
                                onClick={() => window.open(`/api/delivery/tasks/${task._id}/pod-certificate/print`, '_blank')}
                                className="px-2.5 py-1 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-[11px] font-semibold transition"
                                title="View & Print Official Digital POD Certificate (Point #44)"
                              >
                                POD Cert (#44)
                              </button>
                            )}

                            {!task.deliveryPartner && (
                              <button
                                onClick={() => handleSingleAutoAssign(task._id)}
                                disabled={actionLoading}
                                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-semibold transition"
                              >
                                Auto-Assign
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setManualAssignTask(task);
                                setSelectedRiderForManual(task.deliveryPartner?._id || '');
                              }}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium transition"
                            >
                              {task.deliveryPartner ? 'Reassign' : 'Manual Assign'}
                            </button>
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

        {/* Manual Rider Assignment Modal */}
        {manualAssignTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-5 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  <span>Manual Courier Assignment</span>
                </h3>
                <button
                  onClick={() => setManualAssignTask(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleManualAssignSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Select Active Fleet Courier
                  </label>
                  <select
                    value={selectedRiderForManual}
                    onChange={(e) => setSelectedRiderForManual(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Choose Rider --</option>
                    {riders.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name} ({r.phone}) — {r.activeTasksCount}/{r.maxConcurrentOrders} active ({r.dutyStatus})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Dispatcher Reason / Override Note
                  </label>
                  <input
                    type="text"
                    value={manualReason}
                    onChange={(e) => setManualReason(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setManualAssignTask(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || !selectedRiderForManual}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black shadow disabled:opacity-50"
                  >
                    Confirm Assignment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Slot Rules Drawer */}
        {showSettingsDrawer && config && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
            <div className="bg-slate-900 border-l border-slate-800 w-full max-w-lg h-full p-6 shadow-2xl flex flex-col overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>Delivery Slot &amp; Dispatch Rules</span>
                </h3>
                <button
                  onClick={() => setShowSettingsDrawer(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveConfig} className="mt-5 space-y-5 flex-1">
                {/* 1-Hour Hyperlocal Section */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">⚡ 1-Hour Hyperlocal Dispatch</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.hyperlocal1Hour.enabled}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            hyperlocal1Hour: { ...config.hyperlocal1Hour, enabled: e.target.checked },
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">Express Surcharge (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={config.hyperlocal1Hour.fee}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            hyperlocal1Hour: { ...config.hyperlocal1Hour, fee: Number(e.target.value) },
                          })
                        }
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Max Orders / Hour</label>
                      <input
                        type="number"
                        min="1"
                        value={config.hyperlocal1Hour.maxOrdersPerHour}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            hyperlocal1Hour: {
                              ...config.hyperlocal1Hour,
                              maxOrdersPerHour: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">Operating Start</label>
                      <input
                        type="time"
                        value={config.hyperlocal1Hour.operatingStart}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            hyperlocal1Hour: {
                              ...config.hyperlocal1Hour,
                              operatingStart: e.target.value,
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Operating End</label>
                      <input
                        type="time"
                        value={config.hyperlocal1Hour.operatingEnd}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            hyperlocal1Hour: {
                              ...config.hyperlocal1Hour,
                              operatingEnd: e.target.value,
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Auto-Assignment Rules */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">🛵 Automated Rider Dispatch</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.autoAssignment.enabled}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            autoAssignment: { ...config.autoAssignment, enabled: e.target.checked },
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  <div className="text-xs">
                    <label className="block text-slate-400 mb-1">Max Concurrent Deliveries / Rider</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={config.autoAssignment.maxConcurrentTasksPerRider}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          autoAssignment: {
                            ...config.autoAssignment,
                            maxConcurrentTasksPerRider: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowSettingsDrawer(false)}
                    className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black shadow"
                  >
                    Save Slot Rules
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Point #43: Fleet Live Map Radar Modal */}
        {showFleetMap && (
          <FleetLiveMapRadarModal
            isOpen={showFleetMap}
            onClose={() => setShowFleetMap(false)}
          />
        )}
      </div>
    </div>
  );
}
