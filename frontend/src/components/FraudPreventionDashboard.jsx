import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  UserX,
  Lock,
  Globe,
  Smartphone,
  Cpu,
  Layers,
  Sliders,
  Download,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  Plus,
  Trash2,
  Save,
  Activity,
  DollarSign,
  AlertOctagon,
} from 'lucide-react';
import api from '../api/client';
import FraudForensicModal from './FraudForensicModal';

export default function FraudPreventionDashboard() {
  const [activeTab, setActiveTab] = useState('THREAT_RADAR');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [rules, setRules] = useState([]);
  const [settings, setSettings] = useState(null);

  // Filters & Pagination for Incidents
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals & Actions
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [editingRule, setEditingRule] = useState(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');
  const [actionErrorMessage, setActionErrorMessage] = useState('');

  // Blacklist tag inputs
  const [newIpBlacklist, setNewIpBlacklist] = useState('');
  const [newDeviceBlacklist, setNewDeviceBlacklist] = useState('');
  const [newEmailDomain, setNewEmailDomain] = useState('');

  useEffect(() => {
    fetchDashboardOverview();
  }, []);

  useEffect(() => {
    if (activeTab === 'THREAT_RADAR') {
      fetchIncidents();
    } else if (activeTab === 'FRAUD_RULES') {
      fetchRules();
    } else if (activeTab === 'SECURITY_SETTINGS') {
      fetchSettings();
    }
  }, [activeTab, riskFilter, statusFilter, page]);

  const fetchDashboardOverview = async () => {
    try {
      const res = await api.get('/admin/fraud/dashboard');
      if (res.data?.success) {
        setDashboardData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load fraud dashboard metrics:', err);
    }
  };

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 15,
        riskLevel: riskFilter,
        status: statusFilter,
        search: searchQuery || undefined,
      };
      const res = await api.get('/admin/fraud/incidents', { params });
      if (res.data?.success) {
        setIncidents(res.data.data.incidents || []);
        setTotalPages(res.data.data.pagination?.pages || 1);
      }
    } catch (err) {
      console.error('Failed to load fraud incidents:', err);
      setActionErrorMessage('Failed to load incidents from backend.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/fraud/rules');
      if (res.data?.success) {
        setRules(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load fraud rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/fraud/settings');
      if (res.data?.success) {
        setSettings(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load fraud settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRuleStatus = async (ruleId, currentStatus) => {
    try {
      const res = await api.put(`/admin/fraud/rules/${ruleId}`, {
        isEnabled: !currentStatus,
      });
      if (res.data?.success) {
        setRules(prev => prev.map(r => (r._id === ruleId ? res.data.data : r)));
        showToast('Rule status updated successfully!');
      }
    } catch (err) {
      setActionErrorMessage(err.response?.data?.message || 'Failed to toggle rule');
    }
  };

  const handleSaveRule = async e => {
    e.preventDefault();
    if (!editingRule) return;
    try {
      const res = await api.put(`/admin/fraud/rules/${editingRule._id}`, {
        scoreWeight: editingRule.scoreWeight,
        threshold: editingRule.threshold,
        severity: editingRule.severity,
        action: editingRule.action,
        isEnabled: editingRule.isEnabled,
      });
      if (res.data?.success) {
        setRules(prev => prev.map(r => (r._id === editingRule._id ? res.data.data : r)));
        setEditingRule(null);
        showToast(`Rule ${res.data.data.code} updated successfully!`);
      }
    } catch (err) {
      setActionErrorMessage(err.response?.data?.message || 'Failed to update rule');
    }
  };

  const handleToggleShadowBan = async (userId, userEmail) => {
    try {
      const res = await api.post(`/admin/fraud/users/${userId}/shadow-ban`, {
        reason: 'Security incident flag manual intervention',
      });
      if (res.data?.success) {
        showToast(res.data.message);
        fetchIncidents();
        fetchDashboardOverview();
      }
    } catch (err) {
      setActionErrorMessage(err.response?.data?.message || 'Failed to toggle shadow ban');
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      const res = await api.put('/admin/fraud/settings', settings);
      if (res.data?.success) {
        setSettings(res.data.data);
        showToast('Enterprise security thresholds & blacklists saved successfully!');
      }
    } catch (err) {
      setActionErrorMessage(err.response?.data?.message || 'Failed to save settings');
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await api.get('/admin/fraud/export-csv', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Fraud_Incidents_Report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Fraud incident report exported successfully!');
    } catch (err) {
      setActionErrorMessage('Failed to export CSV report');
    }
  };

  const showToast = msg => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(''), 3000);
  };

  const getRiskBadge = (level, score) => {
    switch (level) {
      case 'CRITICAL':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/30">
            CRITICAL • {score}
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/30">
            HIGH • {score}
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
            MEDIUM • {score}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            LOW • {score}
          </span>
        );
    }
  };

  const kpis = dashboardData?.kpis || {};

  return (
    <div className="space-y-6">
      {/* Header Bento Strip */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-rose-950/40 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-black">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Pillar 5 • Feature Point #50</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Enterprise Fraud Detection & Prevention Engine
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Real-time threat intelligence hub with device fingerprinting, IP/VPN proxy filters,
              hourly order velocity limits, geolocation anomaly radar, and automated shadow-banning.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all border border-slate-700"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export RFC-4180 CSV</span>
            </button>
            <button
              onClick={() => {
                fetchDashboardOverview();
                if (activeTab === 'THREAT_RADAR') fetchIncidents();
              }}
              className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700"
              title="Refresh Telemetry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 5-Column KPI Stat Bento Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Scanned Orders
            </span>
            <p className="text-xl font-black text-white mt-1">{kpis.totalScanned || 0}</p>
            <span className="text-[10px] text-slate-500">100% Transactions Scanned</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
              Blocked Threats
            </span>
            <p className="text-xl font-black text-rose-400 mt-1">{kpis.blockedAttacksCount || 0}</p>
            <span className="text-[10px] text-rose-400/70">Critical Anomaly Attacks</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              Shadow-Banned Users
            </span>
            <p className="text-xl font-black text-amber-400 mt-1">{kpis.shadowBannedUsersCount || 0}</p>
            <span className="text-[10px] text-amber-400/70">Restricted Malicious Actors</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] font-bold text-yellow-400 uppercase tracking-wider">
              Pending Reviews
            </span>
            <p className="text-xl font-black text-yellow-400 mt-1">{kpis.pendingReviewCount || 0}</p>
            <span className="text-[10px] text-yellow-400/70">Requires Forensics</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              Loss Averted
            </span>
            <p className="text-xl font-black text-emerald-400 mt-1">
              ₹{(kpis.estimatedLossAverted || 0).toLocaleString('en-IN')}
            </p>
            <span className="text-[10px] text-emerald-400/70">High-Risk Fraud Prevented</span>
          </div>
        </div>
      </div>

      {/* Toast Alert Notifications */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button onClick={() => setActionSuccessMessage('')} className="text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {actionErrorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{actionErrorMessage}</span>
          </div>
          <button onClick={() => setActionErrorMessage('')} className="text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('THREAT_RADAR')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs transition-all ${
            activeTab === 'THREAT_RADAR'
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Live Threat Radar & Incidents</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950/60 font-mono">
            {incidents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('FRAUD_RULES')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs transition-all ${
            activeTab === 'FRAUD_RULES'
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Configurable Fraud Rules</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950/60 font-mono">
            {rules.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('SECURITY_SETTINGS')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs transition-all ${
            activeTab === 'SECURITY_SETTINGS'
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Thresholds & Blacklists</span>
        </button>
      </div>

      {/* TAB 1: LIVE THREAT RADAR & INCIDENTS */}
      {activeTab === 'THREAT_RADAR' && (
        <div className="space-y-4 animate-fade-in">
          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchIncidents()}
                placeholder="Search by IP, Device ID, User, or City..."
                className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={riskFilter}
                onChange={e => {
                  setRiskFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none"
              >
                <option value="ALL">All Risk Levels</option>
                <option value="CRITICAL">Critical Risk (85+)</option>
                <option value="HIGH">High Risk (70+)</option>
                <option value="MEDIUM">Medium Risk (40+)</option>
                <option value="LOW">Low Risk</option>
              </select>

              <select
                value={statusFilter}
                onChange={e => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none"
              >
                <option value="ALL">All Review Statuses</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="CONFIRMED_FRAUD">Confirmed Fraud</option>
                <option value="FALSE_POSITIVE">False Positive</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
          </div>

          {/* Incidents Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
                <Activity className="w-6 h-6 animate-spin text-rose-500" />
                <span>Scanning forensic telemetry & incidents...</span>
              </div>
            ) : incidents.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                No fraud incidents found matching current filters. All systems secure.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] font-black uppercase text-slate-400">
                    <tr>
                      <th className="py-3 px-4">Incident / Ref</th>
                      <th className="py-3 px-4">Customer & Account</th>
                      <th className="py-3 px-4">IP & Device Hardware</th>
                      <th className="py-3 px-4">Distance & Anomaly</th>
                      <th className="py-3 px-4">Risk Evaluation</th>
                      <th className="py-3 px-4">Status & Action</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {incidents.map(inc => (
                      <tr key={inc._id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-mono font-black text-white text-[11px]">
                            {inc.incidentNumber}
                          </p>
                          <span className="text-[10px] text-slate-500">
                            {inc.createdAt ? new Date(inc.createdAt).toLocaleTimeString('en-IN') : ''}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-bold text-white truncate max-w-[140px]">
                            {inc.user?.name || 'Guest Shopper'}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate max-w-[140px]">
                            {inc.user?.email || 'N/A'}
                          </p>
                          {inc.user?.isShadowBanned && (
                            <span className="inline-block mt-0.5 text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              SHADOW-BANNED
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-mono text-white text-[11px]">
                            <Globe className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                            <span>{inc.ipAddress}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-mono text-slate-400 text-[10px] truncate max-w-[160px] mt-0.5">
                            <Smartphone className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                            <span>{inc.deviceId}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1">
                            <span className="text-white font-medium">
                              {inc.geolocation?.ipCity || 'Delhi'}
                            </span>
                            <span className="text-slate-500">➔</span>
                            <span className="text-slate-300">
                              {inc.geolocation?.shippingCity || 'Destination'}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-mono font-bold ${
                              inc.geolocation?.isGeoMismatch ? 'text-rose-400' : 'text-slate-500'
                            }`}
                          >
                            {inc.geolocation?.distanceKm || 0} km{' '}
                            {inc.geolocation?.isGeoMismatch && '• Mismatch'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {getRiskBadge(inc.riskLevel, inc.riskScore)}
                          <p className="text-[10px] text-slate-400 mt-1 font-mono">
                            {inc.triggeredRules?.length || 0} rules triggered
                          </p>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-950 text-slate-300 border border-slate-800">
                            {inc.actionTaken}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">
                            {inc.resolution?.status || 'PENDING'}
                          </p>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedIncident(inc)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] transition-all flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5 text-teal-400" />
                              <span>Forensic</span>
                            </button>

                            {inc.user?._id && (
                              <button
                                onClick={() => handleToggleShadowBan(inc.user._id, inc.user.email)}
                                className={`p-1.5 rounded-xl text-xs transition-all ${
                                  inc.user.isShadowBanned
                                    ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                    : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                                }`}
                                title={inc.user.isShadowBanned ? 'Unban User' : 'Shadow-Ban User'}
                              >
                                <UserX className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-4 py-3 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded-lg bg-slate-800 text-white disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="px-3 py-1 rounded-lg bg-slate-800 text-white disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CONFIGURABLE FRAUD RULES */}
      {activeTab === 'FRAUD_RULES' && (
        <div className="space-y-4 animate-fade-in">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white">Dynamic Rules Matrix</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Adjust scoring weights, trigger thresholds, and enforcement actions per rule.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] font-black uppercase text-slate-400">
                  <tr>
                    <th className="py-3 px-4">Rule Code & Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Score Added</th>
                    <th className="py-3 px-4">Threshold</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {rules.map(rule => (
                    <tr key={rule._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white text-xs">{rule.name}</p>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">{rule.code}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{rule.description}</p>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-300">
                        {rule.category}
                      </td>

                      <td className="py-3.5 px-4 font-black text-rose-400">
                        +{rule.scoreWeight} pts
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {rule.threshold}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-950 text-slate-300 border border-slate-800">
                          {rule.action}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleRuleStatus(rule._id, rule.isEnabled)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black transition-all ${
                            rule.isEnabled
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {rule.isEnabled ? 'ENABLED' : 'DISABLED'}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setEditingRule({ ...rule })}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] transition-all"
                        >
                          Configure
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: THRESHOLDS & BLACKLISTS */}
      {activeTab === 'SECURITY_SETTINGS' && settings && (
        <div className="space-y-6 animate-fade-in">
          {/* Threshold Sliders */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-rose-400" />
              Global Risk Level Classification Thresholds
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div>
                <label className="block text-xs font-bold text-yellow-400 mb-1">
                  Medium Risk Trigger (Default: 40)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.globalThresholds?.mediumRiskThreshold || 40}
                  onChange={e =>
                    setSettings({
                      ...settings,
                      globalThresholds: {
                        ...settings.globalThresholds,
                        mediumRiskThreshold: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-400 mb-1">
                  High Risk Trigger (Default: 70)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.globalThresholds?.highRiskThreshold || 70}
                  onChange={e =>
                    setSettings({
                      ...settings,
                      globalThresholds: {
                        ...settings.globalThresholds,
                        highRiskThreshold: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-rose-400 mb-1">
                  Critical Risk Trigger (Default: 85)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.globalThresholds?.criticalRiskThreshold || 85}
                  onChange={e =>
                    setSettings({
                      ...settings,
                      globalThresholds: {
                        ...settings.globalThresholds,
                        criticalRiskThreshold: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Automated Mitigations Switches */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              Automated Defense Mitigations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <label className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.automatedMitigations?.requireOtpForMediumRisk ?? true}
                  onChange={e =>
                    setSettings({
                      ...settings,
                      automatedMitigations: {
                        ...settings.automatedMitigations,
                        requireOtpForMediumRisk: e.target.checked,
                      },
                    })
                  }
                  className="mt-1 rounded border-slate-700 text-rose-500 focus:ring-0"
                />
                <div>
                  <p className="text-xs font-black text-white">Require OTP Verification</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Trigger SMS OTP security challenge on Medium Risk orders.
                  </p>
                </div>
              </label>

              <label className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.automatedMitigations?.disableCodForHighRisk ?? true}
                  onChange={e =>
                    setSettings({
                      ...settings,
                      automatedMitigations: {
                        ...settings.automatedMitigations,
                        disableCodForHighRisk: e.target.checked,
                      },
                    })
                  }
                  className="mt-1 rounded border-slate-700 text-rose-500 focus:ring-0"
                />
                <div>
                  <p className="text-xs font-black text-white">Force Prepaid Only</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Disable COD and require upfront online payment on High Risk orders.
                  </p>
                </div>
              </label>

              <label className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.automatedMitigations?.autoShadowBanCriticalRisk ?? true}
                  onChange={e =>
                    setSettings({
                      ...settings,
                      automatedMitigations: {
                        ...settings.automatedMitigations,
                        autoShadowBanCriticalRisk: e.target.checked,
                      },
                    })
                  }
                  className="mt-1 rounded border-slate-700 text-rose-500 focus:ring-0"
                />
                <div>
                  <p className="text-xs font-black text-white">Auto Shadow-Ban</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Silently quarantine and shadow-ban users triggering Critical Risk.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Security Blacklists (IPs, Devices, Email Domains) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* IP Blacklist */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-rose-400" />
                IP Address Blacklist
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newIpBlacklist}
                  onChange={e => setNewIpBlacklist(e.target.value)}
                  placeholder="e.g. 198.51.100.1"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newIpBlacklist.trim()) return;
                    setSettings({
                      ...settings,
                      blacklists: {
                        ...settings.blacklists,
                        ipAddresses: [...(settings.blacklists?.ipAddresses || []), newIpBlacklist.trim()],
                      },
                    });
                    setNewIpBlacklist('');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                {(settings.blacklists?.ipAddresses || []).map((ip, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-slate-950 text-slate-300 border border-slate-800"
                  >
                    <span>{ip}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          blacklists: {
                            ...settings.blacklists,
                            ipAddresses: settings.blacklists.ipAddresses.filter((_, i) => i !== idx),
                          },
                        })
                      }
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Device ID Blacklist */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-rose-400" />
                Hardware Device ID Blacklist
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDeviceBlacklist}
                  onChange={e => setNewDeviceBlacklist(e.target.value)}
                  placeholder="e.g. DEV-8F9A10B2..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newDeviceBlacklist.trim()) return;
                    setSettings({
                      ...settings,
                      blacklists: {
                        ...settings.blacklists,
                        deviceIds: [...(settings.blacklists?.deviceIds || []), newDeviceBlacklist.trim()],
                      },
                    });
                    setNewDeviceBlacklist('');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                {(settings.blacklists?.deviceIds || []).map((dev, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-slate-950 text-slate-300 border border-slate-800"
                  >
                    <span>{dev}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          blacklists: {
                            ...settings.blacklists,
                            deviceIds: settings.blacklists.deviceIds.filter((_, i) => i !== idx),
                          },
                        })
                      }
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Save Settings Commit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveSettings}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20"
            >
              <Save className="w-4 h-4" />
              <span>Commit Security Configurations</span>
            </button>
          </div>
        </div>
      )}

      {/* Forensic Inspection Modal */}
      {selectedIncident && (
        <FraudForensicModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onResolved={() => {
            fetchIncidents();
            fetchDashboardOverview();
          }}
        />
      )}

      {/* Edit Rule Configuration Modal */}
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-white">Configure Fraud Rule</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{editingRule.code}</p>
              </div>
              <button
                onClick={() => setEditingRule(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Rule Name & Description
                </label>
                <input
                  type="text"
                  disabled
                  value={editingRule.name}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Risk Score Weight (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingRule.scoreWeight}
                    onChange={e =>
                      setEditingRule({ ...editingRule, scoreWeight: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingRule.threshold}
                    onChange={e =>
                      setEditingRule({ ...editingRule, threshold: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Severity</label>
                  <select
                    value={editingRule.severity}
                    onChange={e => setEditingRule({ ...editingRule, severity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Enforced Action</label>
                  <select
                    value={editingRule.action}
                    onChange={e => setEditingRule({ ...editingRule, action: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  >
                    <option value="FLAG">FLAG</option>
                    <option value="CHALLENGE_OTP">CHALLENGE_OTP</option>
                    <option value="FORCE_PREPAID">FORCE_PREPAID</option>
                    <option value="BLOCK_TRANSACTION">BLOCK_TRANSACTION</option>
                    <option value="SHADOW_BAN">SHADOW_BAN</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
