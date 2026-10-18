import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Download,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Landmark,
  Building2,
  FileSpreadsheet,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  CreditCard,
  Copy,
  Check,
  HelpCircle,
} from 'lucide-react';
import api from '../api/client';

export default function VendorPayoutManager() {
  const [payouts, setPayouts] = useState([]);
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingCount: 0,
    pendingAmount: 0,
    completedCount: 0,
    completedAmount: 0,
    rejectedCount: 0,
    rejectedAmount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('ALL');

  // Modal States
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Form Fields
  const [utrNumber, setUtrNumber] = useState('');
  const [paymentMode, setPaymentMode] = useState('IMPS');
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Status Alerts
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');
  const [actionErrorMessage, setActionErrorMessage] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Sub-tab selection: Manual Withdrawals vs Automated Escrow Splits
  const [activeSubTab, setActiveSubTab] = useState('WITHDRAWALS');
  const [escrowSplits, setEscrowSplits] = useState([]);
  const [escrowStats, setEscrowStats] = useState({
    totalSettlements: 0,
    platformTotalGross: 0,
    platformCommissionRevenue: 0,
    vendorDisbursements: 0,
  });
  const [isEscrowLoading, setIsEscrowLoading] = useState(false);
  const [settlingSubOrderId, setSettlingSubOrderId] = useState(null);

  const fetchEscrowSplits = async () => {
    setIsEscrowLoading(true);
    try {
      const res = await api.get('/payout-splits/admin');
      if (res.data?.success) {
        setEscrowSplits(res.data.data || []);
        if (res.data.platformStats) {
          setEscrowStats(res.data.platformStats);
        }
      }
    } catch (err) {
      console.error('Failed to load escrow splits:', err?.message);
    } finally {
      setIsEscrowLoading(false);
    }
  };

  const handleSettleEscrowSplit = async (subOrderId) => {
    setSettlingSubOrderId(subOrderId);
    try {
      const res = await api.post(`/payout-splits/admin/settle/${subOrderId}`, {
        notes: 'Admin-triggered instant escrow payout settlement.',
      });
      if (res.data?.success) {
        setActionSuccessMessage(`Escrow split for sub-order settled successfully!`);
        fetchEscrowSplits();
      } else {
        setActionErrorMessage(res.data?.message || 'Settlement failed');
      }
    } catch (err) {
      setActionErrorMessage(err.response?.data?.message || err.message || 'Settlement error');
    } finally {
      setSettlingSubOrderId(null);
    }
  };

  const fetchPayouts = async () => {
    setIsLoading(true);
    setActionSuccessMessage('');
    setActionErrorMessage('');
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (dateRangeFilter !== 'ALL') params.dateRange = dateRangeFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await api.get('/admin/payouts', { params });
      if (res.data?.success) {
        setPayouts(res.data.data || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to load payouts';
      setActionErrorMessage(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'WITHDRAWALS') {
      fetchPayouts();
    } else {
      fetchEscrowSplits();
    }
  }, [activeSubTab, statusFilter, dateRangeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPayouts();
  };

  const handleOpenApproveModal = (payout) => {
    setSelectedPayout(payout);
    setUtrNumber(`UTR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setPaymentMode('IMPS');
    setAdminNotes('');
    setIsApproveModalOpen(true);
  };

  const handleOpenRejectModal = (payout) => {
    setSelectedPayout(payout);
    setRejectionReason('');
    setAdminNotes('');
    setIsRejectModalOpen(true);
  };

  const handleOpenDetailModal = (payout) => {
    setSelectedPayout(payout);
    setIsDetailModalOpen(true);
  };

  // 1-Click Approve Payout with UTR
  const handleApprovePayout = async () => {
    if (!selectedPayout) return;
    try {
      const res = await api.put(`/admin/payouts/${selectedPayout._id}/approve`, {
        utrNumber: utrNumber.trim(),
        paymentMode,
        adminNotes: adminNotes.trim(),
      });
      if (res.data?.success) {
        setActionSuccessMessage(`Payout #${selectedPayout.transactionId} approved with UTR: ${utrNumber}!`);
        setIsApproveModalOpen(false);
        fetchPayouts();
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to approve payout';
      setActionErrorMessage(errMsg);
    }
  };

  // Reject Payout and Refund Wallet Balance
  const handleRejectPayout = async () => {
    if (!selectedPayout) return;
    if (!rejectionReason.trim()) {
      setActionErrorMessage('Please provide a specific rejection reason for the vendor');
      return;
    }
    try {
      const res = await api.put(`/admin/payouts/${selectedPayout._id}/reject`, {
        rejectionReason: rejectionReason.trim(),
        adminNotes: adminNotes.trim(),
      });
      if (res.data?.success) {
        setActionSuccessMessage(
          `Payout #${selectedPayout.transactionId} rejected. ₹${selectedPayout.amount} refunded back to vendor's wallet balance.`
        );
        setIsRejectModalOpen(false);
        fetchPayouts();
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to reject payout';
      setActionErrorMessage(errMsg);
    }
  };

  // Export CSV
  const handleExportCSV = async () => {
    try {
      const res = await api.get('/admin/payouts/export-csv', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vendor-payouts-ledger-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      // Fallback in-browser CSV generator
      const headers = ['Transaction ID', 'Store Name', 'Amount', 'Status', 'Payment Mode', 'UTR Number'];
      const rows = payouts.map((p) => [
        p.transactionId,
        `"${p.vendor?.storeName || 'N/A'}"`,
        p.amount,
        p.status,
        p.payoutDetails?.paymentMode || 'IMPS',
        `"${p.payoutDetails?.utrNumber || 'N/A'}"`,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vendor-payouts-ledger-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Vendor Withdrawal / Payout Approval Hub
                <span className="text-xs bg-emerald-400/10 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-400/20">
                  Point #45
                </span>
              </h2>
              <p className="text-sm text-slate-400">
                Review merchant wallet payout requests, verify bank IFSC & beneficiary account,
                approve with banking UTR / transaction IDs, or reject with automatic wallet balance refund.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold transition border border-slate-700 w-full md:w-auto"
            title="Download RFC-4180 CSV Export"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Export CSV
          </button>
          <button
            onClick={fetchPayouts}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold transition border border-slate-700 w-full md:w-auto"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActionSuccessMessage('')}
            className="text-xs text-slate-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {actionErrorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{actionErrorMessage}</span>
          </div>
          <button
            onClick={() => setActionErrorMessage('')}
            className="text-xs text-slate-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Sub-Tab Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab('WITHDRAWALS')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs transition-all ${
            activeSubTab === 'WITHDRAWALS'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
              : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>Manual Bank Withdrawals</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900/60 font-mono">
            {stats.totalRequests || payouts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('ESCROW_SPLITS')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs transition-all ${
            activeSubTab === 'ESCROW_SPLITS'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
              : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Automated Escrow Payout Splits</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
            Point #48 / PayoutSplit
          </span>
        </button>
      </div>

      {activeSubTab === 'WITHDRAWALS' && (
        <>
          {/* KPI Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Payouts Card */}
        <div className="bg-slate-900 border border-amber-500/20 bg-amber-500/5 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
            <span>Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-300">
              ₹{stats.pendingAmount.toLocaleString('en-IN')}
            </span>
            <p className="text-[11px] text-amber-400/70 mt-0.5">
              {stats.pendingCount} requests awaiting disbursement
            </p>
          </div>
        </div>

        {/* Completed Disbursed Card */}
        <div className="bg-slate-900 border border-emerald-500/20 bg-emerald-500/5 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
            <span>Disbursed & Settled</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-300">
              ₹{stats.completedAmount.toLocaleString('en-IN')}
            </span>
            <p className="text-[11px] text-emerald-400/70 mt-0.5">
              {stats.completedCount} payouts successfully transferred
            </p>
          </div>
        </div>

        {/* Rejected / Refunded Card */}
        <div className="bg-slate-900 border border-rose-500/20 bg-rose-500/5 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-400 text-xs font-semibold">
            <span>Rejected & Refunded</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-rose-300">
              ₹{stats.rejectedAmount.toLocaleString('en-IN')}
            </span>
            <p className="text-[11px] text-rose-400/70 mt-0.5">
              {stats.rejectedCount} refunded to vendor wallet
            </p>
          </div>
        </div>

        {/* Total Requests Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>All-Time Payouts</span>
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-white">{stats.totalRequests}</span>
            <p className="text-[11px] text-slate-500 mt-0.5">Lifetime platform withdrawals</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
          {['ALL', 'PENDING', 'COMPLETED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-emerald-400 text-slate-950 shadow-sm font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Date Filter & Search */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <select
            value={dateRangeFilter}
            onChange={(e) => setDateRangeFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-400"
          >
            <option value="ALL">All Time</option>
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
          </select>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 lg:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search TXN, Store, UTR, Bank..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-xl pl-9 pr-3 py-1.5 focus:outline-none focus:border-emerald-400 placeholder-slate-500"
            />
          </form>
        </div>
      </div>

      {/* Payout Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-800/60 border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-3.5 px-4">Transaction & Date</th>
                <th className="py-3.5 px-4">Vendor / Store</th>
                <th className="py-3.5 px-4">Beneficiary Bank Details</th>
                <th className="py-3.5 px-4">Amount (₹)</th>
                <th className="py-3.5 px-4">Disbursement / UTR</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                    Loading withdrawal requests...
                  </td>
                </tr>
              ) : payouts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No withdrawal requests matching your filters.
                  </td>
                </tr>
              ) : (
                payouts.map((payout) => (
                  <tr
                    key={payout._id}
                    className="hover:bg-slate-800/40 transition group"
                  >
                    {/* Transaction & Date */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-200 flex items-center gap-1.5">
                        {payout.transactionId}
                        <button
                          onClick={() => copyToClipboard(payout.transactionId, payout._id)}
                          className="text-slate-500 hover:text-slate-300 transition"
                          title="Copy Transaction ID"
                        >
                          {copiedId === payout._id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {payout.createdAt
                          ? new Date(payout.createdAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : 'Recent'}
                      </div>
                    </td>

                    {/* Vendor / Store */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-sm">
                        {payout.vendor?.storeName || 'Merchant Store'}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-slate-500" />
                        {payout.vendor?.user?.name || 'Owner'} |{' '}
                        {payout.vendor?.user?.phone || 'N/A'}
                      </div>
                    </td>

                    {/* Beneficiary Bank Details */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-200 flex items-center gap-1">
                          <Landmark className="w-3 h-3 text-emerald-400" />
                          {payout.payoutDetails?.bankName ||
                            payout.vendor?.bankDetails?.bankName ||
                            'HDFC Bank'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          A/C:{' '}
                          <span className="text-slate-300">
                            {payout.payoutDetails?.accountNumber ||
                              payout.vendor?.bankDetails?.accountNumber ||
                              '••••••••'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          IFSC:{' '}
                          {payout.payoutDetails?.ifscCode ||
                            payout.vendor?.bankDetails?.ifscCode ||
                            'HDFC0001234'}
                        </div>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4">
                      <span className="text-sm font-black text-emerald-400">
                        ₹{payout.amount?.toLocaleString('en-IN')}
                      </span>
                    </td>

                    {/* Disbursement / UTR */}
                    <td className="py-3.5 px-4">
                      {payout.status === 'COMPLETED' ? (
                        <div className="space-y-0.5">
                          <span className="inline-block text-[10px] font-bold bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                            {payout.payoutDetails?.paymentMode || 'IMPS'}
                          </span>
                          <div className="font-mono text-[11px] text-slate-300 font-bold">
                            {payout.payoutDetails?.utrNumber || 'N/A'}
                          </div>
                        </div>
                      ) : payout.status === 'REJECTED' ? (
                        <div className="text-[11px] text-rose-400 line-clamp-1" title={payout.payoutDetails?.rejectionReason}>
                          {payout.payoutDetails?.rejectionReason || 'Rejected'}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Pending Banking UTR</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {payout.status === 'COMPLETED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3" />
                          SETTLED
                        </span>
                      ) : payout.status === 'REJECTED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <XCircle className="w-3 h-3" />
                          REFUNDED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse">
                          <Clock className="w-3 h-3" />
                          PENDING
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {payout.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleOpenApproveModal(payout)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs transition flex items-center gap-1 shadow-sm"
                              title="Approve & Enter Banking UTR"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleOpenRejectModal(payout)}
                              className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg font-bold text-xs border border-rose-600/30 transition flex items-center gap-1"
                              title="Reject & Refund"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => handleOpenDetailModal(payout)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700 transition"
                        >
                          Audit Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* Sub-Tab 2: Automated Escrow Payout Splits (Point #48 / PayoutSplit) */}
      {activeSubTab === 'ESCROW_SPLITS' && (
        <div className="space-y-6 animate-fade-in">
          {/* Escrow KPI Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs font-semibold text-slate-400">Total Settled Batches</span>
              <div className="text-2xl font-black text-white mt-1">{escrowStats.totalSettlements}</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Automated sub-order splits</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs font-semibold text-slate-400">Platform Gross Sales</span>
              <div className="text-2xl font-black text-amber-400 mt-1">₹{(escrowStats.platformTotalGross || 0).toLocaleString('en-IN')}</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Customer payments processed</p>
            </div>
            <div className="bg-slate-900 border border-emerald-500/20 bg-emerald-500/5 rounded-2xl p-4">
              <span className="text-xs font-semibold text-emerald-400">Platform Commission Cut</span>
              <div className="text-2xl font-black text-emerald-300 mt-1">₹{(escrowStats.platformCommissionRevenue || 0).toLocaleString('en-IN')}</div>
              <p className="text-[11px] text-emerald-400/70 mt-0.5">Platform retained revenue</p>
            </div>
            <div className="bg-slate-900 border border-purple-500/20 bg-purple-500/5 rounded-2xl p-4">
              <span className="text-xs font-semibold text-purple-400">Vendor Net Disbursements</span>
              <div className="text-2xl font-black text-purple-300 mt-1">₹{(escrowStats.vendorDisbursements || 0).toLocaleString('en-IN')}</div>
              <p className="text-[11px] text-purple-400/70 mt-0.5">Disbursed to merchant wallets</p>
            </div>
          </div>

          {/* Escrow Splits Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">Multi-Party Escrow Splits Ledger</h3>
                <p className="text-xs text-slate-400">Real-time sub-order escrow release ledger and automated platform commission split.</p>
              </div>
              <button
                onClick={fetchEscrowSplits}
                disabled={isEscrowLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isEscrowLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="bg-slate-800/60 border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="py-3 px-4">Sub-Order ID</th>
                    <th className="py-3 px-4">Vendor Store</th>
                    <th className="py-3 px-4">Gross Sale</th>
                    <th className="py-3 px-4">Commission Cut</th>
                    <th className="py-3 px-4">Vendor Net</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Settled At</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {isEscrowLoading ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                        Loading escrow splits...
                      </td>
                    </tr>
                  ) : escrowSplits.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-500">
                        <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-400" />
                        No automated escrow payout splits recorded in database yet.
                      </td>
                    </tr>
                  ) : (
                    escrowSplits.map((split) => (
                      <tr key={split._id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-200">
                          {split.subOrder?.orderNumber || (split.subOrder?._id ? `SUB-${split.subOrder._id.slice(-6)}` : `SPLIT-${split._id.slice(-6)}`)}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">
                          {split.vendor?.storeName || 'Merchant Partner'}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-200">
                          ₹{(split.grossAmount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-emerald-400 font-mono">
                          ₹{(split.adminCommission || 0).toLocaleString('en-IN')}
                          <span className="text-[10px] text-slate-500 ml-1">({split.commissionRatePercent || 10}%)</span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-300">
                          ₹{(split.vendorNetPayout || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            split.status === 'SETTLED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : split.status === 'RELEASED'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {split.status || 'SETTLED'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-400">
                          {split.settledAt ? new Date(split.settledAt).toLocaleDateString('en-IN') : 'Completed'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {split.status !== 'SETTLED' && (split.subOrder?._id || split.subOrder) ? (
                            <button
                              onClick={() => handleSettleEscrowSplit(split.subOrder?._id || split.subOrder)}
                              disabled={settlingSubOrderId === (split.subOrder?._id || split.subOrder)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs transition"
                            >
                              {settlingSubOrderId === (split.subOrder?._id || split.subOrder) ? 'Settling...' : 'Release Escrow'}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-500">Auto-Settled</span>
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
      )}

      {/* Approve Payout Modal */}
      {isApproveModalOpen && selectedPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                Approve Vendor Payout Disbursement
              </h3>
              <button
                onClick={() => setIsApproveModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Payout Summary Card */}
            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Beneficiary Store:</span>
                <span className="text-xs font-bold text-white">
                  {selectedPayout.vendor?.storeName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Withdrawal Amount:</span>
                <span className="text-lg font-black text-emerald-400">
                  ₹{selectedPayout.amount?.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-700/60 pt-2">
                <span className="text-[11px] text-slate-400">Bank & IFSC:</span>
                <span className="text-[11px] font-mono text-slate-200">
                  {selectedPayout.payoutDetails?.bankName || selectedPayout.vendor?.bankDetails?.bankName} (
                  {selectedPayout.payoutDetails?.ifscCode || selectedPayout.vendor?.bankDetails?.ifscCode})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Account Number:</span>
                <span className="text-[11px] font-mono font-bold text-amber-300">
                  {selectedPayout.payoutDetails?.accountNumber || selectedPayout.vendor?.bankDetails?.accountNumber}
                </span>
              </div>
            </div>

            {/* Form Inputs */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Payment Transfer Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-400"
                >
                  <option value="IMPS">IMPS (Immediate Payment Service - Real-time)</option>
                  <option value="NEFT">NEFT (National Electronic Funds Transfer)</option>
                  <option value="RTGS">RTGS (Real Time Gross Settlement)</option>
                  <option value="UPI">UPI Direct VPA Transfer</option>
                  <option value="MANUAL_BANK_TRANSFER">Manual Cheque / Corporate Netbanking</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Bank Reference Number / UTR Number
                </label>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="e.g. UTR-HDFC-20261015-89123"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-400 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Internal Admin Audit Notes (Optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Batch #, corporate account debited, or banking reference notes."
                  rows="2"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-400 placeholder-slate-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsApproveModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleApprovePayout}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 transition flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                Confirm & Mark Disbursed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Payout Modal */}
      {isRejectModalOpen && selectedPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-400" />
                Reject Payout Request
              </h3>
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
              <div>
                <strong>Automatic Wallet Refund Guarantee:</strong> When you reject this request,
                the requested ₹{selectedPayout.amount} will be automatically credited back to{' '}
                <strong>{selectedPayout.vendor?.storeName}</strong>'s wallet balance immediately.
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Reason for Rejection (Displayed to Merchant)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Beneficiary account name does not match registered GSTIN legal name, or invalid IFSC code."
                  rows="3"
                  className="w-full bg-slate-800 border border-rose-500/30 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-rose-400 placeholder-slate-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Internal Super Admin Notes (Optional)
                </label>
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal audit log..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectPayout}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-600/20"
              >
                Confirm Rejection & Refund Wallet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Detail Modal */}
      {isDetailModalOpen && selectedPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Landmark className="w-5 h-5 text-blue-400" />
                Payout Audit Log: {selectedPayout.transactionId}
              </h3>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Store Name:</span>
                <span className="font-bold text-white">{selectedPayout.vendor?.storeName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Proprietor:</span>
                <span className="text-slate-200">
                  {selectedPayout.vendor?.user?.name} ({selectedPayout.vendor?.user?.phone})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Amount Requested:</span>
                <span className="font-bold text-emerald-400 text-sm">
                  ₹{selectedPayout.amount?.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Status:</span>
                <span className="font-bold uppercase text-amber-300">{selectedPayout.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Bank Name:</span>
                <span className="text-slate-200">
                  {selectedPayout.payoutDetails?.bankName || selectedPayout.vendor?.bankDetails?.bankName}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Account Number:</span>
                <span className="font-mono font-bold text-slate-200">
                  {selectedPayout.payoutDetails?.accountNumber || selectedPayout.vendor?.bankDetails?.accountNumber}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">IFSC Code:</span>
                <span className="font-mono text-slate-200">
                  {selectedPayout.payoutDetails?.ifscCode || selectedPayout.vendor?.bankDetails?.ifscCode}
                </span>
              </div>
              {selectedPayout.payoutDetails?.utrNumber && (
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">UTR Number:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {selectedPayout.payoutDetails.utrNumber}
                  </span>
                </div>
              )}
              {selectedPayout.payoutDetails?.rejectionReason && (
                <div className="py-2 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20 text-rose-300">
                  <strong>Rejection Reason:</strong> {selectedPayout.payoutDetails.rejectionReason}
                </div>
              )}
              {selectedPayout.payoutDetails?.adminNotes && (
                <div className="py-2 bg-slate-800 p-2.5 rounded-lg text-slate-300">
                  <strong>Admin Notes:</strong> {selectedPayout.payoutDetails.adminNotes}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
