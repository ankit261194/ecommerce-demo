import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Play,
  Pause,
  RotateCw,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Settings,
  X,
  ExternalLink,
  Search,
  Server,
  Zap,
  Filter,
  Eye,
  Copy,
  Check,
  Activity,
  ArrowRight,
  Database,
  Cpu,
} from 'lucide-react';
import api from '../api/client';

export const JobQueueMonitor = () => {
  // State
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [selectedQueue, setSelectedQueue] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshCountdown, setRefreshCountdown] = useState(5);

  // Modals
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedJobDetails, setSelectedJobDetails] = useState(null);
  const [isJobDetailsModalOpen, setIsJobDetailsModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // Notification Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Dispatch Form State
  const [dispatchForm, setDispatchForm] = useState({
    queueName: 'default',
    name: 'test_job',
    priority: 5,
    delay: 0,
    maxAttempts: 3,
    dataJson: '{\n  "echo": "Hello AuraMarket Queue",\n  "simulateDurationMs": 150,\n  "shouldFail": false\n}',
  });

  // Settings Form State
  const [settingsForm, setSettingsForm] = useState({
    concurrency: 3,
    maxRetries: 3,
    pollIntervalMs: 1500,
    autoCleanCompletedDays: 7,
    redis: {
      enabled: false,
      host: '127.0.0.1',
      port: 6379,
      password: '',
      db: 0,
    },
  });

  // Fetch Queues Overview
  const fetchOverview = useCallback(async () => {
    try {
      const res = await api.get('/admin/queues');
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load queue overview:', err);
    }
  }, []);

  // Fetch Jobs List
  const fetchJobs = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const q = selectedQueue === 'all' ? 'all' : selectedQueue;
      const params = {
        page,
        limit: 20,
        status: selectedStatus,
        search: searchQuery.trim(),
      };
      const res = await api.get(`/admin/queues/${q}/jobs`, { params });
      if (res.data?.success) {
        setJobs(res.data.data || []);
        setPagination(res.data.pagination || { total: 0, page: 1, limit: 20, pages: 1 });
      }
    } catch (err) {
      console.error('Failed to load jobs list:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedQueue, selectedStatus, searchQuery]);

  // Fetch Settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get('/admin/queues/settings');
      if (res.data?.success) {
        setSettingsForm(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchOverview();
    fetchJobs(1);
    fetchSettings();
  }, [fetchOverview, fetchJobs, fetchSettings]);

  // Auto-refresh countdown
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          fetchOverview();
          fetchJobs(pagination.page);
          return 5;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchOverview, fetchJobs, pagination.page]);

  // Handle Manual Refresh
  const handleManualRefresh = () => {
    fetchOverview();
    fetchJobs(pagination.page);
    setRefreshCountdown(5);
    showToast('Queues & jobs refreshed', 'info');
  };

  // Dispatch Job Submit
  const handleDispatchSubmit = async (e) => {
    e.preventDefault();
    try {
      let parsedData = {};
      if (dispatchForm.dataJson && dispatchForm.dataJson.trim()) {
        try {
          parsedData = JSON.parse(dispatchForm.dataJson);
        } catch {
          showToast('Invalid JSON format in Job Payload', 'error');
          return;
        }
      }

      const payload = {
        queueName: dispatchForm.queueName,
        name: dispatchForm.name,
        data: parsedData,
        priority: Number(dispatchForm.priority) || 5,
        delay: Number(dispatchForm.delay) || 0,
        maxAttempts: Number(dispatchForm.maxAttempts) || 3,
      };

      const res = await api.post('/admin/queues/dispatch', payload);
      if (res.data?.success) {
        showToast(`Job ${res.data.data.jobId} dispatched successfully!`);
        setIsDispatchModalOpen(false);
        fetchOverview();
        fetchJobs(1);
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    }
  };

  // Pause / Resume Queue
  const toggleQueuePause = async (queueName, isCurrentlyPaused) => {
    try {
      const endpoint = isCurrentlyPaused ? `/admin/queues/${queueName}/resume` : `/admin/queues/${queueName}/pause`;
      const res = await api.post(endpoint);
      if (res.data?.success) {
        showToast(res.data.message);
        fetchOverview();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    }
  };

  // Clean Queue (Purge)
  const handleCleanQueue = async (queueName, type) => {
    if (!window.confirm(`Are you sure you want to clean all ${type} jobs in queue "${queueName}"?`)) {
      return;
    }
    try {
      const res = await api.post(`/admin/queues/${queueName}/clean`, { type });
      if (res.data?.success) {
        showToast(res.data.message);
        fetchOverview();
        fetchJobs(1);
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    }
  };

  // Retry Failed Job
  const handleRetryJob = async (jobId) => {
    try {
      const res = await api.post(`/admin/queues/jobs/${jobId}/retry`);
      if (res.data?.success) {
        showToast(`Job ${jobId} re-queued for execution!`);
        fetchOverview();
        fetchJobs(pagination.page);
        if (selectedJobDetails?.jobId === jobId) {
          setSelectedJobDetails(res.data.data);
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    }
  };

  // Delete Job
  const handleDeleteJob = async (jobId) => {
    if (!window.confirm(`Permanently delete job ${jobId}?`)) return;
    try {
      const res = await api.delete(`/admin/queues/jobs/${jobId}`);
      if (res.data?.success) {
        showToast(`Job ${jobId} deleted successfully`);
        fetchOverview();
        fetchJobs(pagination.page);
        if (isJobDetailsModalOpen && selectedJobDetails?.jobId === jobId) {
          setIsJobDetailsModalOpen(false);
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    }
  };

  // Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/admin/queues/settings', settingsForm);
      if (res.data?.success) {
        showToast('Worker & Queue settings saved successfully');
        setIsSettingsModalOpen(false);
        fetchOverview();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    }
  };

  // Copy helper
  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Open Details Modal
  const openJobDetails = async (job) => {
    try {
      const res = await api.get(`/admin/queues/jobs/${job.jobId}`);
      if (res.data?.success) {
        setSelectedJobDetails(res.data.data);
      } else {
        setSelectedJobDetails(job);
      }
    } catch {
      setSelectedJobDetails(job);
    }
    setIsJobDetailsModalOpen(true);
  };

  // Quick Preset Handlers for Dispatch Form
  const setPreset = (presetName) => {
    if (presetName === 'test_job') {
      setDispatchForm({
        queueName: 'default',
        name: 'test_job',
        priority: 5,
        delay: 0,
        maxAttempts: 3,
        dataJson: '{\n  "echo": "AuraMarket Worker Check",\n  "simulateDurationMs": 150,\n  "shouldFail": false\n}',
      });
    } else if (presetName === 'test_fail') {
      setDispatchForm({
        queueName: 'default',
        name: 'test_job',
        priority: 1,
        delay: 0,
        maxAttempts: 2,
        dataJson: '{\n  "echo": "Intentional Failure Test",\n  "simulateDurationMs": 50,\n  "shouldFail": true\n}',
      });
    } else if (presetName === 'send_email') {
      setDispatchForm({
        queueName: 'email',
        name: 'send_email',
        priority: 3,
        delay: 0,
        maxAttempts: 3,
        dataJson: '{\n  "to": "customer@example.com",\n  "subject": "Order Confirmed #ORD-9921",\n  "html": "<h3>Your order has been confirmed!</h3>"\n}',
      });
    } else if (presetName === 'generate_report') {
      setDispatchForm({
        queueName: 'reports',
        name: 'generate_report',
        priority: 7,
        delay: 0,
        maxAttempts: 3,
        dataJson: '{\n  "reportType": "daily_tax_ledger",\n  "period": "2026-10-17"\n}',
      });
    } else if (presetName === 'maintenance') {
      setDispatchForm({
        queueName: 'maintenance',
        name: 'maintenance_cleanup',
        priority: 9,
        delay: 0,
        maxAttempts: 2,
        dataJson: '{\n  "forceCleanup": true\n}',
      });
    }
  };

  const overview = stats?.overview || {
    totalJobs: 0,
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    deadLetter: 0,
    totalProcessed: 0,
  };

  const redisInfo = stats?.redis || {
    status: 'EMBEDDED_ACTIVE',
    mode: 'High-Performance Embedded Engine',
    host: '127.0.0.1',
    port: 6379,
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold text-white transition-all transform animate-bounce ${
            toast.type === 'error'
              ? 'bg-rose-600 border border-rose-400'
              : toast.type === 'info'
              ? 'bg-sky-600 border border-sky-400'
              : 'bg-emerald-600 border border-emerald-400'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <CheckCircle2 className="w-5 h-5" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 p-6 sm:p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                Pillar 2 • Point 22
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                {redisInfo.status === 'CONNECTED' ? 'Redis + BullMQ Connected' : 'High-Performance Embedded Engine (Active)'}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Layers className="w-8 h-8 text-indigo-400" />
              Enterprise Background Job Queue & Workers
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Asynchronous non-blocking job pipeline for emails, invoice generation, webhooks, and inventory sync with exponential backoff retries and Dead-Letter Queue (DLQ).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Auto refresh badge */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                autoRefresh
                  ? 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700'
              }`}
              title="Click to toggle 5s auto-refresh"
            >
              <RotateCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
              <span>{autoRefresh ? `Auto: ${refreshCountdown}s` : 'Paused'}</span>
            </button>

            {/* Manual Refresh */}
            <button
              onClick={handleManualRefresh}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
              title="Refresh Queue Metrics"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Queue Settings */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all shadow-sm"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Settings</span>
            </button>

            {/* Dispatch Job Button */}
            <button
              onClick={() => setIsDispatchModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-indigo-500/25 transition-all transform active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Dispatch Job</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Active Jobs */}
        <div
          onClick={() => setSelectedStatus('active')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            selectedStatus === 'active'
              ? 'bg-indigo-500/10 border-indigo-500 shadow-md shadow-indigo-500/10'
              : 'bg-white border-slate-200/80 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active</span>
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-indigo-600">{overview.active}</div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Currently processing</p>
        </div>

        {/* Waiting */}
        <div
          onClick={() => setSelectedStatus('waiting')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            selectedStatus === 'waiting'
              ? 'bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/10'
              : 'bg-white border-slate-200/80 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Waiting</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{overview.waiting}</div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Ready in queue</p>
        </div>

        {/* Completed */}
        <div
          onClick={() => setSelectedStatus('completed')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            selectedStatus === 'completed'
              ? 'bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10'
              : 'bg-white border-slate-200/80 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{overview.completed}</div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Successful runs</p>
        </div>

        {/* Failed / DLQ */}
        <div
          onClick={() => setSelectedStatus('failed')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            selectedStatus === 'failed'
              ? 'bg-rose-500/10 border-rose-500 shadow-md shadow-rose-500/10'
              : 'bg-white border-slate-200/80 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Failed (DLQ)</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600">{overview.failed}</div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">{overview.deadLetter} dead letters</p>
        </div>

        {/* Delayed */}
        <div
          onClick={() => setSelectedStatus('delayed')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            selectedStatus === 'delayed'
              ? 'bg-sky-500/10 border-sky-500 shadow-md shadow-sky-500/10'
              : 'bg-white border-slate-200/80 hover:border-sky-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Delayed</span>
            <Clock className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-sky-600">{overview.delayed}</div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Backoff or scheduled</p>
        </div>

        {/* Total Processed */}
        <div
          onClick={() => setSelectedStatus('all')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            selectedStatus === 'all'
              ? 'bg-purple-500/10 border-purple-500 shadow-md shadow-purple-500/10'
              : 'bg-white border-slate-200/80 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">All Jobs</span>
            <Database className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600">{overview.totalJobs}</div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">{overview.totalProcessed} historical</p>
        </div>
      </div>

      {/* Queues Control Strip */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Queue Tab Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider mr-1">
              Queues:
            </span>
            <button
              onClick={() => setSelectedQueue('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedQueue === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({overview.totalJobs})
            </button>

            {(stats?.queues || []).map((q) => (
              <div key={q.queueName} className="flex items-center">
                <button
                  onClick={() => setSelectedQueue(q.queueName)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-l-xl text-xs font-bold transition-all ${
                    selectedQueue === q.queueName
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{q.queueName}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      selectedQueue === q.queueName
                        ? 'bg-indigo-700 text-indigo-100'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {q.total}
                  </span>
                </button>
                <button
                  onClick={() => toggleQueuePause(q.queueName, q.isPaused)}
                  className={`px-2 py-1.5 rounded-r-xl border-l text-[10px] font-black transition-all ${
                    q.isPaused
                      ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600'
                      : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                  }`}
                  title={q.isPaused ? `Resume ${q.queueName} Queue` : `Pause ${q.queueName} Queue`}
                >
                  {q.isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                </button>
              </div>
            ))}
          </div>

          {/* Quick Actions (Purge completed, Purge failed) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCleanQueue(selectedQueue === 'all' ? 'all' : selectedQueue, 'completed')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition-all"
              title="Purge completed jobs to free database memory"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Clean Completed</span>
            </button>
            <button
              onClick={() => handleCleanQueue(selectedQueue === 'all' ? 'all' : selectedQueue, 'failed')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-all"
              title="Purge failed jobs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge Failed</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Job ID, Action Name, or Error..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-sm"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Statuses' },
            { id: 'active', label: 'Active' },
            { id: 'waiting', label: 'Waiting' },
            { id: 'completed', label: 'Completed' },
            { id: 'failed', label: 'Failed (DLQ)' },
            { id: 'delayed', label: 'Delayed' },
          ].map((statusChip) => (
            <button
              key={statusChip.id}
              onClick={() => setSelectedStatus(statusChip.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedStatus === statusChip.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {statusChip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Job ID & Action</th>
                <th className="py-3 px-4">Queue</th>
                <th className="py-3 px-4">Status & Progress</th>
                <th className="py-3 px-4">Attempts</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Scheduled / Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && jobs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 font-medium">
                    <RotateCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    Loading background jobs...
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 font-medium">
                    <Database className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No jobs found for the selected queue and status filter.
                    <div className="mt-3">
                      <button
                        onClick={() => setIsDispatchModalOpen(true)}
                        className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 font-bold text-xs hover:bg-indigo-100 transition-all"
                      >
                        Dispatch a Test Job
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const statusColors = {
                    active: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    waiting: 'bg-amber-50 text-amber-700 border-amber-200',
                    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    failed: 'bg-rose-50 text-rose-700 border-rose-200',
                    delayed: 'bg-sky-50 text-sky-700 border-sky-200',
                    paused: 'bg-slate-100 text-slate-700 border-slate-300',
                  };

                  return (
                    <tr key={job._id || job.jobId} className="hover:bg-slate-50/70 transition-colors">
                      {/* Job ID & Action */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{job.name}</span>
                          {job.isDeadLetter && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-black bg-rose-100 text-rose-800 uppercase tracking-wider">
                              DLQ
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-400 font-mono">
                          <span>{job.jobId}</span>
                          <button
                            onClick={() => handleCopy(job.jobId, job.jobId)}
                            className="p-0.5 hover:text-slate-600 text-slate-400"
                            title="Copy Job ID"
                          >
                            {copiedKey === job.jobId ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Queue Tag */}
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {job.queueName}
                        </span>
                      </td>

                      {/* Status & Progress */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              statusColors[job.status] || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {job.status === 'active' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                            )}
                            {job.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            {job.status === 'failed' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                            {job.status === 'waiting' && <Clock className="w-3 h-3 text-amber-600" />}
                            <span className="capitalize">{job.status}</span>
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 font-bold">
                            {job.progress}%
                          </span>
                        </div>

                        {/* Mini Progress Bar */}
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              job.status === 'failed'
                                ? 'bg-rose-500'
                                : job.status === 'completed'
                                ? 'bg-emerald-500'
                                : 'bg-indigo-500'
                            }`}
                            style={{ width: `${job.progress || 0}%` }}
                          />
                        </div>
                      </td>

                      {/* Attempts */}
                      <td className="py-3 px-4 font-mono text-slate-600">
                        <span className="font-bold text-slate-800">{job.attemptsMade}</span>
                        <span className="text-slate-400"> / {job.maxAttempts}</span>
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {job.durationMs ? `${job.durationMs}ms` : '—'}
                      </td>

                      {/* Scheduled / Created */}
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        <div>{new Date(job.createdAt).toLocaleTimeString()}</div>
                        <div className="text-slate-400 text-[10px]">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Inspect */}
                          <button
                            onClick={() => openJobDetails(job)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
                            title="Inspect Job Execution & Logs"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Retry (if failed) */}
                          {job.status === 'failed' && (
                            <button
                              onClick={() => handleRetryJob(job.jobId)}
                              className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-all"
                              title="Retry failed job from DLQ"
                            >
                              <RotateCw className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteJob(job.jobId)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all"
                            title="Delete Job"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border-t border-slate-200 text-xs">
            <span className="text-slate-500 font-medium">
              Showing page {pagination.page} of {pagination.pages} ({pagination.total} total jobs)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchJobs(pagination.page - 1)}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 disabled:opacity-50 hover:bg-slate-50"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchJobs(pagination.page + 1)}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 disabled:opacity-50 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DISPATCH JOB MODAL */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsDispatchModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Dispatch Background Job</h3>
                <p className="text-xs text-slate-500">Inject asynchronous task into worker queues</p>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="mb-4">
              <label className="block text-[11px] font-black uppercase text-slate-400 mb-2">
                Quick Action Presets
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPreset('test_job')}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all"
                >
                  ⚡ Test Job
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('test_fail')}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 transition-all"
                >
                  ⚠️ Simulated Failure (DLQ)
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('send_email')}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 hover:bg-sky-100 transition-all"
                >
                  ✉️ Send Email
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('generate_report')}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all"
                >
                  📊 Generate Report
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('maintenance')}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 transition-all"
                >
                  🧹 Maintenance Purge
                </button>
              </div>
            </div>

            <form onSubmit={handleDispatchSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Queue Name</label>
                  <select
                    value={dispatchForm.queueName}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, queueName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="default">default</option>
                    <option value="email">email</option>
                    <option value="notifications">notifications</option>
                    <option value="reports">reports</option>
                    <option value="maintenance">maintenance</option>
                    <option value="webhooks">webhooks</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Job Action Name</label>
                  <input
                    type="text"
                    required
                    value={dispatchForm.name}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, name: e.target.value })}
                    placeholder="e.g. test_job, send_email"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={dispatchForm.priority}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400">1 = Highest</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Delay (ms)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={dispatchForm.delay}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, delay: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400">0 = Immediate</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max Retries</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={dispatchForm.maxAttempts}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, maxAttempts: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400">Before DLQ</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Job Payload Data (JSON)
                </label>
                <textarea
                  rows="5"
                  value={dispatchForm.dataJson}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, dataJson: e.target.value })}
                  className="w-full p-3 font-mono text-xs rounded-xl bg-slate-900 text-emerald-400 border border-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-md transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Dispatch Now</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOB DETAILS INSPECTOR MODAL */}
      {isJobDetailsModalOpen && selectedJobDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsJobDetailsModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-2xl ${
                    selectedJobDetails.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-600'
                      : selectedJobDetails.status === 'failed'
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-indigo-50 text-indigo-600'
                  }`}
                >
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">{selectedJobDetails.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 uppercase">
                      {selectedJobDetails.queueName}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">{selectedJobDetails.jobId}</p>
                </div>
              </div>

              {selectedJobDetails.status === 'failed' && (
                <button
                  onClick={() => handleRetryJob(selectedJobDetails.jobId)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition-all"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Retry Job</span>
                </button>
              )}
            </div>

            <div className="space-y-4 text-xs">
              {/* Status and Progress Banner */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Status</span>
                  <div className="font-black text-slate-800 capitalize mt-0.5">
                    {selectedJobDetails.status}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Progress</span>
                  <div className="font-black text-slate-800 mt-0.5">{selectedJobDetails.progress}%</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Attempts</span>
                  <div className="font-black text-slate-800 mt-0.5">
                    {selectedJobDetails.attemptsMade} / {selectedJobDetails.maxAttempts}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Execution Time</span>
                  <div className="font-black text-slate-800 mt-0.5">
                    {selectedJobDetails.durationMs ? `${selectedJobDetails.durationMs}ms` : '—'}
                  </div>
                </div>
              </div>

              {/* Error Stack Trace (if failed) */}
              {selectedJobDetails.error && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-rose-800 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Execution Error & Stack Trace
                    </span>
                    <button
                      onClick={() => handleCopy(selectedJobDetails.error.stack || selectedJobDetails.error.message, 'err')}
                      className="text-[11px] font-bold text-rose-700 hover:underline flex items-center gap-1"
                    >
                      {copiedKey === 'err' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>Copy Trace</span>
                    </button>
                  </div>
                  <div className="font-mono text-[11px] text-rose-900 font-bold mb-1">
                    {selectedJobDetails.error.message}
                  </div>
                  {selectedJobDetails.error.stack && (
                    <pre className="font-mono text-[10px] text-rose-800/80 bg-white/70 p-2.5 rounded-xl overflow-x-auto max-h-36">
                      {selectedJobDetails.error.stack}
                    </pre>
                  )}
                </div>
              )}

              {/* Payload Data */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Input Payload Data</label>
                  <button
                    onClick={() => handleCopy(JSON.stringify(selectedJobDetails.data, null, 2), 'payload')}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                  >
                    {copiedKey === 'payload' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>Copy JSON</span>
                  </button>
                </div>
                <pre className="p-3 font-mono text-xs rounded-xl bg-slate-900 text-slate-200 overflow-x-auto max-h-40">
                  {JSON.stringify(selectedJobDetails.data, null, 2)}
                </pre>
              </div>

              {/* Result Data (if completed) */}
              {selectedJobDetails.result && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Output Result</label>
                    <button
                      onClick={() => handleCopy(JSON.stringify(selectedJobDetails.result, null, 2), 'res')}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      {copiedKey === 'res' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>Copy Result</span>
                    </button>
                  </div>
                  <pre className="p-3 font-mono text-xs rounded-xl bg-slate-900 text-emerald-400 overflow-x-auto max-h-40">
                    {JSON.stringify(selectedJobDetails.result, null, 2)}
                  </pre>
                </div>
              )}

              {/* Execution Milestone Logs */}
              <div>
                <label className="block font-bold text-slate-700 mb-2">
                  Execution Milestone Logs ({selectedJobDetails.logs?.length || 0})
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {(selectedJobDetails.logs || []).map((log, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-2.5 p-2 rounded-xl font-mono text-[11px] border ${
                        log.level === 'error'
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : log.level === 'warn'
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="font-medium">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUEUE SETTINGS MODAL */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsSettingsModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Background Worker Settings</h3>
                <p className="text-xs text-slate-500">Concurrency, retries & Redis connection config</p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Worker Concurrency</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={settingsForm.concurrency}
                    onChange={(e) => setSettingsForm({ ...settingsForm, concurrency: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400">Concurrent jobs per queue</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max Retries</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settingsForm.maxRetries}
                    onChange={(e) => setSettingsForm({ ...settingsForm, maxRetries: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400">Default exponential retries</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Poll Interval (ms)</label>
                  <input
                    type="number"
                    min="500"
                    step="500"
                    value={settingsForm.pollIntervalMs}
                    onChange={(e) => setSettingsForm({ ...settingsForm, pollIntervalMs: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400">Embedded loop frequency</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Retention Days</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={settingsForm.autoCleanCompletedDays}
                    onChange={(e) => setSettingsForm({ ...settingsForm, autoCleanCompletedDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400">Auto-purge completed</span>
                </div>
              </div>

              {/* Redis BullMQ Configuration */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-bold text-slate-800 block">External Redis Integration</span>
                    <span className="text-[11px] text-slate-400">
                      Enable to connect remote Redis / Redis Cloud cluster
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.redis?.enabled || false}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        redis: { ...settingsForm.redis, enabled: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </div>

                {settingsForm.redis?.enabled && (
                  <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block font-bold text-slate-700 mb-1">Redis Host</label>
                        <input
                          type="text"
                          value={settingsForm.redis?.host || '127.0.0.1'}
                          onChange={(e) =>
                            setSettingsForm({
                              ...settingsForm,
                              redis: { ...settingsForm.redis, host: e.target.value },
                            })
                          }
                          className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Port</label>
                        <input
                          type="number"
                          value={settingsForm.redis?.port || 6379}
                          onChange={(e) =>
                            setSettingsForm({
                              ...settingsForm,
                              redis: { ...settingsForm.redis, port: Number(e.target.value) },
                            })
                          }
                          className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Password</label>
                      <input
                        type="password"
                        value={settingsForm.redis?.password || ''}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            redis: { ...settingsForm.redis, password: e.target.value },
                          })
                        }
                        placeholder="••••••••"
                        className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-md transition-all"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobQueueMonitor;
