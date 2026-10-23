import React, { useState, useEffect } from 'react';
import {
  X,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  RotateCw,
  Building,
  CreditCard,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import api from '../api/client';

export const VendorWalletLedgerModal = ({
  isOpen,
  onClose,
  onOpenWithdrawal,
  onRefreshData,
}) => {
  const [wallet, setWallet] = useState({
    availableBalance: 24500,
    pendingEscrowBalance: 6498,
    lifetimeSales: 185000,
    totalPlatformCommission: 14800,
    totalWithdrawn: 145700,
    totalOrderCredits: 170200,
    commissionRate: 8,
    bankDetails: {
      bankName: 'HDFC Bank Ltd',
      accountNumber: '****4092',
      ifscCode: 'HDFC0001024',
      accountHolder: 'Apex Tech Enterprise',
      upiId: 'apextech@okhdfcbank',
    },
  });
  const [ledger, setLedger] = useState([]);
  const [payoutSplits, setPayoutSplits] = useState([]);
  const [splitStats, setSplitStats] = useState(null);
  const [activeView, setActiveView] = useState('ledger'); // 'ledger' | 'splits'
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const [notification, setNotification] = useState(null);

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (typeFilter !== 'all') params.type = typeFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [walletRes, splitRes] = await Promise.allSettled([
        api.get('/vendor/wallet', { params }),
        api.get('/payout-splits/vendor'),
      ]);

      if (walletRes.status === 'fulfilled' && walletRes.value.data?.success) {
        if (walletRes.value.data.wallet) setWallet(walletRes.value.data.wallet);
        if (Array.isArray(walletRes.value.data.ledger)) setLedger(walletRes.value.data.ledger);
      }

      if (splitRes.status === 'fulfilled' && splitRes.value.data?.success) {
        setPayoutSplits(splitRes.value.data.data || []);
        if (splitRes.value.data.stats) setSplitStats(splitRes.value.data.stats);
} else {
        setPayoutSplits([]);
      }
    } catch (err) {
      console.warn("Failed to load vendor ledger data:", err?.message);
      setLedger([]);
      setPayoutSplits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchWalletData();
    }
  }, [isOpen, typeFilter]);

  const handleSearchSubmit = e => {
    e.preventDefault();
    fetchWalletData();
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const response = await api.get('/vendor/wallet/export-csv', {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vendor_wallet_ledger_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setNotification('Ledger CSV statement downloaded successfully!');
    } catch (_) {
      // Fallback CSV generation in browser
      const headers = ['Transaction ID', 'Date', 'Type', 'Description', 'Amount', 'Balance After', 'Status'];
      const rows = ledger.map(l => [
        `"${l.transactionId}"`,
        `"${new Date(l.createdAt).toLocaleString('en-IN')}"`,
        `"${l.type}"`,
        `"${(l.description || '').replace(/"/g, '""')}"`,
        l.type === 'COMMISSION_DEBIT' || l.type === 'PAYOUT_WITHDRAWAL' ? -l.amount : l.amount,
        l.balanceAfter,
        `"${l.status || 'COMPLETED'}"`,
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vendor_wallet_statement_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setNotification('Statement CSV exported!');
    } finally {
      setExporting(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-5xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Vendor Financial Wallet & Audited Ledger
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                  Point #61
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Real-time withdrawable balance, pending escrow holds, platform commission tracking, and double-entry transaction history.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={exporting}
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              title="Download full audited transaction ledger as CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Notification Alert */}
          {notification && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notification}</span>
            </div>
          )}

          {/* 4 Financial KPI Bento Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Available Balance */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-500/10 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-100">
                  Available for Payout
                </span>
                <div className="text-2xl sm:text-3xl font-black mt-1 tracking-tight">
                  ₹{Number(wallet.availableBalance || 0).toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-emerald-100 font-medium mt-0.5">
                  Cleared & ready for instant bank transfer
                </p>
              </div>

              {onOpenWithdrawal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenWithdrawal();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-black shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Request Payout</span>
                  <ArrowUpRight className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              )}
            </div>

            {/* Card 2: Pending Escrow Clearance */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 text-slate-900 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                    Pending Clearance
                  </span>
                  <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-[10px] font-black" title="Funds released once rider verifies customer OTP on doorstep">
                    ?
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black mt-1 text-amber-950 tracking-tight">
                  ₹{Number(wallet.pendingEscrowBalance || 0).toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-amber-800 font-semibold mt-0.5">
                  Locked in escrow until OTP delivery
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-100/70 border border-amber-300/60 text-[10px] text-amber-900 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Auto-released to wallet upon OTP scan</span>
              </div>
            </div>

            {/* Card 3: Lifetime Sales & Commission */}
            <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 text-slate-900 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Store Lifetime Performance
                </span>
                <div className="text-xl sm:text-2xl font-black mt-1 text-slate-900 tracking-tight">
                  ₹{Number(wallet.lifetimeSales || 0).toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  Gross customer merchandise volume
                </p>
              </div>

              <div className="space-y-1 pt-1 border-t border-slate-200 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold text-[11px]">Platform Fee:</span>
                  <span className="font-black text-rose-600">
                    -₹{Number(wallet.totalPlatformCommission || 0).toLocaleString('en-IN')} ({wallet.commissionRate}%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold text-[11px]">Net Credits:</span>
                  <span className="font-black text-emerald-700">
                    +₹{Number(wallet.totalOrderCredits || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Connected Bank & Settlement Account */}
            <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 text-slate-900 flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Settlement Bank
                  </span>
                  <Building className="w-4 h-4 text-indigo-600" />
                </div>
                <h4 className="text-sm font-black text-slate-900 mt-1">
                  {wallet.bankDetails?.bankName || 'HDFC Bank'}
                </h4>
                <p className="text-xs font-extrabold text-slate-600">
                  A/C {wallet.bankDetails?.accountNumber || '****4092'}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  IFSC: {wallet.bankDetails?.ifscCode || 'HDFC0001024'}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-bold">Total Withdrawn:</span>
                <span className="font-black text-slate-900">
                  ₹{Number(wallet.totalWithdrawn || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Point #22: Navigation Tabs: Audited Ledger vs. Instant Delivery Payout Splits */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setActiveView('ledger')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeView === 'ledger'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <span>Audited Ledger Statement</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('splits')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeView === 'splits'
                  ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/20'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <span>Instant Delivery Payout Splits</span>
              <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full bg-white/20 text-white">
                Point #22
              </span>
            </button>
          </div>

          {activeView === 'splits' ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-0">
              <div className="p-4 bg-emerald-50/70 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                    Automated Instant Escrow Split Ledger ({payoutSplits.length} Settled)
                  </h4>
                </div>
                <span className="text-[11px] font-bold text-emerald-800">
                  ⚡ Auto-credited within 0.1s of Delivery Verification
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">SubOrder #</th>
                      <th className="py-3 px-4">Delivered & Settled At</th>
                      <th className="py-3 px-4 text-right">Gross Total (₹)</th>
                      <th className="py-3 px-4 text-center">Commission (%)</th>
                      <th className="py-3 px-4 text-right">Admin Platform Fee (₹)</th>
                      <th className="py-3 px-4 text-right text-emerald-700">Net Wallet Credit (₹)</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payoutSplits.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400 font-bold">
                          No instant delivery splits yet. Deliveries will appear here automatically.
                        </td>
                      </tr>
                    ) : (
                      payoutSplits.map((split) => (
                        <tr key={split._id} className="hover:bg-slate-50 transition-colors font-medium">
                          <td className="py-3.5 px-4 font-mono font-black text-slate-900">
                            #{split.orderNumber}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                            {new Date(split.settledAt || Date.now()).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-slate-900">
                            ₹{Number(split.grossAmount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-600">
                            {split.commissionRate}%
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-rose-600">
                            -₹{Number(split.adminCommission || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-emerald-700 text-sm">
                            +₹{Number(split.vendorNetPayout || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase border border-emerald-200">
                              {split.status || 'SETTLED'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <>
              {/* Filter & Search Toolbar */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Search Input */}
                <form onSubmit={handleSearchSubmit} className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search transaction ID, order number, or description..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-20 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-black hover:bg-slate-800"
                  >
                    Search
                  </button>
                </form>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 flex-wrap text-xs font-bold">
                  <span className="text-[10px] font-black uppercase text-slate-400 mr-1">Type:</span>
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'ORDER_CREDIT', label: '🟢 Order Credits' },
                    { id: 'COMMISSION_DEBIT', label: '🔴 Platform Fee' },
                    { id: 'PAYOUT_WITHDRAWAL', label: '🟣 Payouts' },
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setTypeFilter(f.id)}
                      className={`px-3 py-1.5 rounded-xl transition-all ${
                        typeFilter === f.id
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={fetchWalletData}
                    className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-100 transition-all ml-1"
                    title="Refresh Ledger"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Double-Entry Transaction Ledger Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Transaction / Ref</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4 text-right">Balance After</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <RotateCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                        <span className="font-bold">Loading transaction ledger...</span>
                      </td>
                    </tr>
                  ) : ledger.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-black text-slate-700">No transactions found</p>
                        <p className="text-[11px] text-slate-400">
                          {typeFilter !== 'all' || searchQuery
                            ? 'Try clearing your search query or filter.'
                            : 'Transactions will appear here as orders and payouts are processed.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    ledger.map(item => {
                      const isCredit = item.type === 'ORDER_CREDIT';
                      const isDebit = item.type === 'COMMISSION_DEBIT';
                      const isPayout = item.type === 'PAYOUT_WITHDRAWAL';
                      const isRefund = item.type === 'REFUND';

                      return (
                        <tr
                          key={item._id || item.transactionId}
                          className="hover:bg-slate-50/80 transition-colors font-medium text-slate-700"
                        >
                          {/* Ref ID */}
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                            <span className="text-xs">{item.transactionId}</span>
                            {item.payoutDetails?.utrNumber && (
                              <span className="block text-[10px] text-slate-400 font-mono">
                                UTR: {item.payoutDetails.utrNumber}
                              </span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                            {new Date(item.createdAt || Date.now()).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                            <span className="block text-[10px] text-slate-400">
                              {new Date(item.createdAt || Date.now()).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </td>

                          {/* Type Badge */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isCredit && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black inline-flex items-center gap-1">
                                <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                                Order Credit
                              </span>
                            )}
                            {isDebit && (
                              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-black inline-flex items-center gap-1">
                                <ArrowUpRight className="w-3 h-3 text-rose-600" />
                                Platform Fee
                              </span>
                            )}
                            {isPayout && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-black inline-flex items-center gap-1">
                                <Building className="w-3 h-3 text-purple-600" />
                                Bank Payout
                              </span>
                            )}
                            {isRefund && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black">
                                Refund Adjustment
                              </span>
                            )}
                          </td>

                          {/* Description */}
                          <td className="py-3.5 px-4 max-w-xs font-semibold text-slate-800">
                            <p className="line-clamp-2">{item.description}</p>
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap font-black">
                            <span
                              className={`text-sm ${
                                isCredit
                                  ? 'text-emerald-700'
                                  : isDebit || isPayout || isRefund
                                  ? 'text-rose-600'
                                  : 'text-slate-900'
                              }`}
                            >
                              {isCredit ? '+' : '-'}₹
                              {Number(item.amount || 0).toLocaleString('en-IN')}
                            </span>
                          </td>

                          {/* Balance After */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap font-extrabold text-slate-900">
                            ₹{Number(item.balanceAfter || 0).toLocaleString('en-IN')}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                item.status === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : item.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-red-100 text-red-900'
                              }`}
                            >
                              {item.status || 'COMPLETED'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Point #61: Real-Time Vendor Financial Wallet & Double-Entry Ledger • Platform commission transparently itemized
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorWalletLedgerModal;
