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

  // Demo Fallback Data in case of offline/mock mode
  const demoPayoutsFallback = [
    {
      _id: 'p-demo-1',
      transactionId: 'TXN-PAYOUT-17920401',
      type: 'PAYOUT_WITHDRAWAL',
      amount: 45000,
      status: 'PENDING',
      description: 'Vendor payout request for ₹45000 to bank HDFC Bank Ltd',
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      vendor: {
        _id: 'v-1',
        storeName: 'Aura Sound & Beats Official',
        walletBalance: 124500,
        gstNumber: '07AAAAA0000A1Z5',
        panNumber: 'ABCDE1234F',
        user: {
          name: 'Vikram Malhotra',
          email: 'vikram.malhotra@auramarket.com',
          phone: '+91 98765 43211',
        },
        bankDetails: {
          accountHolder: 'Aura Sound Private Limited',
          accountNumber: '91802001928374',
          ifscCode: 'HDFC0001234',
          bankName: 'HDFC Bank Ltd',
        },
      },
      payoutDetails: {
        paymentMode: 'IMPS',
        bankName: 'HDFC Bank Ltd',
        accountNumber: '91802001928374',
        ifscCode: 'HDFC0001234',
        accountHolder: 'Aura Sound Private Limited',
      },
    },
    {
      _id: 'p-demo-2',
      transactionId: 'TXN-PAYOUT-17920392',
      type: 'PAYOUT_WITHDRAWAL',
      amount: 28500,
      status: 'COMPLETED',
      description: 'Vendor payout request for ₹28500 to bank ICICI Bank Ltd',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      vendor: {
        _id: 'v-2',
        storeName: 'Titan Electronics & Gadgets',
        walletBalance: 42000,
        gstNumber: '29ABCDE1234F1Z8',
        panNumber: 'KLMNO5678P',
        user: {
          name: 'Rohan Deshmukh',
          email: 'rohan.titan@gmail.com',
          phone: '+91 98111 22334',
        },
        bankDetails: {
          accountHolder: 'Titan Electronics LLP',
          accountNumber: '00120500129384',
          ifscCode: 'ICIC0000012',
          bankName: 'ICICI Bank Ltd',
        },
      },
      payoutDetails: {
        utrNumber: 'UTR-ICIC-20261014-98421',
        paymentMode: 'NEFT',
        bankName: 'ICICI Bank Ltd',
        accountNumber: '00120500129384',
        ifscCode: 'ICIC0000012',
        accountHolder: 'Titan Electronics LLP',
        processedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        adminNotes: 'Settled via Corporate Netbanking Batch #401',
      },
    },
    {
      _id: 'p-demo-3',
      transactionId: 'TXN-PAYOUT-17920355',
      type: 'PAYOUT_WITHDRAWAL',
      amount: 15000,
      status: 'REJECTED',
      description: 'Vendor payout request for ₹15000 to bank SBI',
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      vendor: {
        _id: 'v-3',
        storeName: 'Apex Luxe Apparel Hub',
        walletBalance: 15000,
        gstNumber: '08XYZAB9876C1Z2',
        panNumber: 'PQRST4321R',
        user: {
          name: 'Priya Rathore',
          email: 'priya.apex@gmail.com',
          phone: '+91 97722 88441',
        },
        bankDetails: {
          accountHolder: 'Priya Rathore Enterprises',
          accountNumber: '50100234918231',
          ifscCode: 'SBIN0004521',
          bankName: 'State Bank of India',
        },
      },
      payoutDetails: {
        rejectionReason: 'Invalid beneficiary account number. Bank returned NEFT rejection code AC01.',
        processedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        adminNotes: 'Merchant contacted via telephone to correct bank account IFSC.',
      },
    },
  ];

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
      } else {
        setPayouts(demoPayoutsFallback);
      }
    } catch (err) {
      console.warn('Using demo payout fallback data:', err?.message);
      setPayouts(demoPayoutsFallback);
      setStats({
        totalRequests: 3,
        pendingCount: 1,
        pendingAmount: 45000,
        completedCount: 1,
        completedAmount: 28500,
        rejectedCount: 1,
        rejectedAmount: 15000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, [statusFilter, dateRangeFilter]);

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
      // Demo optimistic update
      setPayouts((prev) =>
        prev.map((p) =>
          p._id === selectedPayout._id
            ? {
                ...p,
                status: 'COMPLETED',
                payoutDetails: {
                  ...p.payoutDetails,
                  utrNumber: utrNumber.trim(),
                  paymentMode,
                  adminNotes,
                  processedAt: new Date().toISOString(),
                },
              }
            : p
        )
      );
      setActionSuccessMessage(`Payout #${selectedPayout.transactionId} approved with UTR: ${utrNumber} (Demo State)!`);
      setIsApproveModalOpen(false);
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
      setPayouts((prev) =>
        prev.map((p) =>
          p._id === selectedPayout._id
            ? {
                ...p,
                status: 'REJECTED',
                payoutDetails: {
                  ...p.payoutDetails,
                  rejectionReason,
                  adminNotes,
                  processedAt: new Date().toISOString(),
                },
              }
            : p
        )
      );
      setActionSuccessMessage(
        `Payout #${selectedPayout.transactionId} rejected and ₹${selectedPayout.amount} refunded (Demo State)!`
      );
      setIsRejectModalOpen(false);
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
