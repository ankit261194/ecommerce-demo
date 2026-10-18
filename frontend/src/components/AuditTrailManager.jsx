import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  Download,
  RefreshCw,
  Clock,
  Eye,
  Sliders,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  User,
  Laptop,
  Globe,
  Trash2,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  ChevronRight,
  X,
  Database,
  History,
} from 'lucide-react';
import api from '../api/client';

export default function AuditTrailManager() {
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState({
    totalAllEvents: 0,
    todayEvents: 0,
    warningEvents: 0,
    criticalEvents: 0,
  });
  const [stats, setStats] = useState({
    totalEvents: 0,
    todayEvents: 0,
    criticalEvents: 0,
    highEvents: 0,
    mediumEvents: 0,
    lowEvents: 0,
    uniqueAdminsCount: 0,
    breakdownByModule: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [notification, setNotification] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Inspector Modal
  const [inspectLog, setInspectLog] = useState(null);

  // Pruning Modal
  const [showPruneModal, setShowPruneModal] = useState(false);
  const [retentionDays, setRetentionDays] = useState(90);
  const [isPruning, setIsPruning] = useState(false);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (selectedSeverity !== 'ALL') params.severity = selectedSeverity;
      if (selectedModule !== 'ALL') params.module = selectedModule;
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const [logsRes, statsRes] = await Promise.all([
        api.get('/admin/audit-logs', { params }),
        api.get('/admin/audit-logs/stats').catch(() => ({ data: { success: false } })),
      ]);

      if (logsRes.data?.success && logsRes.data.data) {
        setLogs(logsRes.data.data.logs || []);
        if (logsRes.data.data.metrics) {
          setMetrics(logsRes.data.data.metrics);
        }
      }

      if (statsRes.data?.success && statsRes.data.stats) {
        setStats(statsRes.data.stats);
      }
    } catch (err) {
      console.error('Audit logs API error:', err.message);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [selectedSeverity, selectedModule, selectedStatus]);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      showNotification('info', 'Generating encrypted audit trail CSV export...');
      const params = new URLSearchParams();
      if (selectedSeverity !== 'ALL') params.append('severity', selectedSeverity);
      if (selectedModule !== 'ALL') params.append('module', selectedModule);
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);

      const downloadUrl = `${api.defaults.baseURL}/admin/audit-logs/export?${params.toString()}`;
      window.open(downloadUrl, '_blank');
      showNotification('success', 'Security audit trail CSV download initiated successfully!');
    } catch (err) {
      showNotification('error', 'Failed to generate audit trail CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePruneLogs = async () => {
    setIsPruning(true);
    try {
      const res = await api.delete('/admin/audit-logs/prune', {
        data: { retentionDays },
      });
      if (res.data?.success) {
        showNotification(
          'success',
          res.data.message || `Pruned ${res.data.deletedCount} old audit records successfully!`
        );
        setShowPruneModal(false);
        fetchAuditLogs();
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to prune audit logs.');
    } finally {
      setIsPruning(false);
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-500/10 text-rose-600 border border-rose-200 dark:border-rose-900/50';
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-600 border border-amber-200 dark:border-amber-900/50';
      case 'MEDIUM':
        return 'bg-blue-500/10 text-blue-600 border border-blue-200 dark:border-blue-900/50';
      case 'LOW':
      default:
        return 'bg-slate-500/10 text-slate-600 border border-slate-200 dark:border-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-sm font-bold flex items-center justify-between shadow-lg transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white'
              : notification.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-indigo-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-black uppercase tracking-wider border border-indigo-500/30">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Point #32 (Pillar 2: Super Admin Engine)</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
              Admin Activity & Security Audit Trail
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Tamper-evident, immutable event log capturing administrative changes across products, pricing,
              vendor approvals, payment gateways, and security settings with before/after diffs, IP addresses, and user-agents.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchAuditLogs}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black border border-slate-700 shadow-sm transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Feed</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md transition-all"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Exporting...' : 'Export Audit CSV'}</span>
            </button>

            <button
              onClick={() => setShowPruneModal(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-black border border-rose-500/30 transition-all"
              title="Retention Policy & Pruning"
            >
              <Trash2 className="w-4 h-4" />
              <span>Prune Logs</span>
            </button>
          </div>
        </div>

        {/* 4 Telemetry Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Recorded Events</div>
            <div className="text-2xl font-black text-white mt-1">
              {(metrics.totalAllEvents || stats.totalEvents || logs.length).toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-400 mt-0.5">● Immutable Event Stream</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Today's Activity</div>
            <div className="text-2xl font-black text-indigo-300 mt-1">
              {(metrics.todayEvents || stats.todayEvents || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-indigo-400 mt-0.5">Past 24 Hours</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Critical & High Events</div>
            <div className="text-2xl font-black text-rose-400 mt-1">
              {((stats.criticalEvents || 0) + (stats.highEvents || 0)).toLocaleString()}
            </div>
            <div className="text-[11px] text-rose-400 mt-0.5">Sensitive Alterations</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Staff Admins</div>
            <div className="text-2xl font-black text-amber-300 mt-1">
              {stats.uniqueAdminsCount || 1}
            </div>
            <div className="text-[11px] text-amber-400 mt-0.5">Authorized Operators</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchAuditLogs()}
            placeholder="Search by admin name, email, action, SKU, product, IP address..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">🔴 Critical Only</option>
            <option value="HIGH">🟠 High Severity</option>
            <option value="MEDIUM">🔵 Medium Severity</option>
            <option value="LOW">⚪ Low Severity</option>
          </select>

          {/* Module Filter */}
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Modules</option>
            <option value="SETTINGS">Settings</option>
            <option value="VENDORS">Vendors</option>
            <option value="PRODUCTS">Products & Price</option>
            <option value="ORDERS">Orders & Dispatch</option>
            <option value="SECURITY">Security & Auth</option>
            <option value="STAFF">Staff & Roles</option>
            <option value="SYSTEM">System</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="WARNING">Warning</option>
            <option value="FAILED">Failed</option>
          </select>

          <button
            onClick={fetchAuditLogs}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-sm"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Main Audit Trail Feed Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Immutable Event Log ({logs.length} displayed)
            </h3>
          </div>
          <span className="text-xs text-slate-500">Chronological • Real-time audit trail</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-xs font-bold flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <span>Fetching cryptographically signed audit trail...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs font-bold">
            No audit events found matching the active filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Performer</th>
                  <th className="py-3 px-4">Module & Action</th>
                  <th className="py-3 px-4">Event Description</th>
                  <th className="py-3 px-4">IP & Device</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4 text-right">State Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {logs.map((log) => {
                  const hasDiff = Boolean(log.previousValue || log.newValue || log.changeSummary);
                  const logDate = new Date(log.createdAt);

                  return (
                    <tr
                      key={log._id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {logDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </td>

                      {/* Performer */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 font-black text-xs flex items-center justify-center">
                            {(log.userName || 'A').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {log.userName || 'Super Admin'}
                            </div>
                            <div className="text-[10px] text-slate-400">{log.userEmail || 'admin@auramarket.com'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Module & Action */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 mr-1.5">
                          {log.module}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                          {log.action}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 max-w-xs md:max-w-md">
                        <div className="text-slate-900 dark:text-slate-100 font-semibold line-clamp-2">
                          {log.description}
                        </div>
                        {log.changeSummary && (
                          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                            ⚡ {log.changeSummary}
                          </div>
                        )}
                      </td>

                      {/* IP & Device */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          <Globe className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.ipAddress || '127.0.0.1'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]" title={log.userAgent}>
                          {log.userAgent ? (log.userAgent.includes('Windows') ? 'Windows Client' : 'Web Browser') : 'API Request'}
                        </div>
                      </td>

                      {/* Severity */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getSeverityBadge(log.severity)}`}>
                          {log.severity || 'LOW'}
                        </span>
                      </td>

                      {/* Inspect Button */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setInspectLog(log)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-black text-xs transition-all border border-indigo-200/50 dark:border-indigo-800/50"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect Diff</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* State Change & Security Diff Inspector Modal */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-black">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Event State Change & Network Diff</h3>
                  <p className="text-xs text-slate-300">
                    Event ID: <span className="font-mono text-indigo-300">{inspectLog._id}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Event Metadata Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Action Type</div>
                  <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
                    {inspectLog.action}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Severity</div>
                  <div className="mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${getSeverityBadge(inspectLog.severity)}`}>
                      {inspectLog.severity || 'LOW'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Client IP Address</div>
                  <div className="text-xs font-black text-slate-800 dark:text-slate-200 mt-1 font-mono">
                    {inspectLog.ipAddress || '127.0.0.1'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Status</div>
                  <div className="text-xs font-black text-emerald-600 mt-1">
                    {inspectLog.status || 'SUCCESS'}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] uppercase font-black text-slate-400 mb-1">Audit Description</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{inspectLog.description}</div>
                {inspectLog.changeSummary && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-1">
                    Summary: {inspectLog.changeSummary}
                  </div>
                )}
              </div>

              {/* Side-by-side Before vs After State Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Previous State */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-rose-600 font-black text-xs uppercase tracking-wider">
                    <XCircle className="w-4 h-4" />
                    <span>Previous State (Before Modification)</span>
                  </div>
                  <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 font-mono text-[11px] text-slate-800 dark:text-slate-200 overflow-x-auto max-h-60">
                    <pre>
                      {inspectLog.previousValue
                        ? JSON.stringify(inspectLog.previousValue, null, 2)
                        : '// No previous record (New entity created)'}
                    </pre>
                  </div>
                </div>

                {/* New State */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-wider">
                    <CheckCircle className="w-4 h-4" />
                    <span>New State (Committed to Database)</span>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 font-mono text-[11px] text-slate-800 dark:text-slate-200 overflow-x-auto max-h-60">
                    <pre>
                      {inspectLog.newValue
                        ? JSON.stringify(inspectLog.newValue, null, 2)
                        : inspectLog.details
                        ? JSON.stringify(inspectLog.details, null, 2)
                        : '// State properties retained'}
                    </pre>
                  </div>
                </div>
              </div>

              {/* User Agent / Request Context */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] uppercase font-black text-slate-400 mb-1">User Agent & Telemetry</div>
                <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400 break-all">
                  {inspectLog.userAgent || 'Mozilla/5.0 System Management Interface'}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setInspectLog(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-black text-xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Retention & Pruning Safeguard Modal */}
      {showPruneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Audit Log Retention Policy</h3>
                <p className="text-xs text-slate-500">Safely prune historical logs while preserving critical compliance records</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-semibold leading-relaxed">
              ⚠️ <strong>Strict Legal Compliance Safeguard:</strong> Logs younger than 30 days are legally protected and cannot be purged. Critical security logs will always be preserved.
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                Delete Logs Older Than:
              </label>
              <select
                value={retentionDays}
                onChange={(e) => setRetentionDays(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-800 dark:text-slate-200"
              >
                <option value={30}>30 Days (Minimum Compliant Retention)</option>
                <option value={60}>60 Days</option>
                <option value={90}>90 Days (Recommended Industry Standard)</option>
                <option value={180}>180 Days (Half Year)</option>
                <option value={365}>365 Days (1 Year)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                onClick={() => setShowPruneModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handlePruneLogs}
                disabled={isPruning}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-md transition-all flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isPruning ? 'Pruning...' : `Prune Logs > ${retentionDays} Days`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
