import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Coins,
  TrendingUp,
  ShieldCheck,
  CreditCard,
  Gift,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Sliders,
  DollarSign,
  Download,
  Users,
} from 'lucide-react';
import api from '../api/client';

export default function AdminWalletVault() {
  const [overview, setOverview] = useState({
    totalWalletLiability: 0,
    totalCoinsCirculation: 0,
    totalUsersWithBalance: 0,
    totalTopUpVolume: 0,
    topUpCount: 0,
    totalBonusDisbursed: 0,
    scratchStats: {
      totalIssued: 0,
      totalScratched: 0,
      totalClaimed: 0,
      unclaimedPending: 0,
    },
    recentTransactions: [],
  });
  const [loading, setLoading] = useState(false);
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);

  // Manual Adjustment Form State
  const [adjustForm, setAdjustForm] = useState({
    userId: '',
    type: 'CREDIT',
    currency: 'INR',
    amount: '',
    reason: '',
  });

  const [searchTxn, setSearchTxn] = useState('');

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/wallet/admin/overview');
      if (res.data?.success && res.data.data) {
        setOverview(res.data.data);
      }
    } catch (err) {
      console.warn('Could not fetch admin wallet overview:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustForm.userId || !adjustForm.amount || !adjustForm.reason) {
      setError('Please fill all required adjustment fields.');
      return;
    }

    if (adjustForm.reason.trim().length < 5) {
      setError('Adjustment reason must be at least 5 characters for compliance audit log.');
      return;
    }

    setAdjustLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await api.post('/wallet/admin/adjust', adjustForm);
      if (res.data?.success) {
        setFeedback(res.data.message || 'Wallet adjusted successfully!');
        setAdjustForm({
          userId: '',
          type: 'CREDIT',
          currency: 'INR',
          amount: '',
          reason: '',
        });
        fetchOverview();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to adjust customer wallet.');
    } finally {
      setAdjustLoading(false);
      setTimeout(() => {
        setFeedback(null);
        setError(null);
      }, 4000);
    }
  };

  const exportTxnCsv = () => {
    const txns = overview.recentTransactions || [];
    if (txns.length === 0) return;

    const headers = ['Transaction ID', 'Customer Name', 'Customer Email', 'Type', 'Category', 'Amount', 'Currency', 'Payment Method', 'Balance After', 'Date'];
    const rows = txns.map((t) => [
      t.transactionReference || t._id,
      t.user?.name || 'Customer',
      t.user?.email || '',
      t.type,
      t.category,
      t.amount,
      t.currency,
      t.paymentMethod || 'SYSTEM',
      t.balanceAfter,
      new Date(t.createdAt).toISOString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Wallet_Ledger_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTxns = (overview.recentTransactions || []).filter((t) => {
    if (!searchTxn) return true;
    const q = searchTxn.toLowerCase();
    return (
      t.user?.name?.toLowerCase().includes(q) ||
      t.user?.email?.toLowerCase().includes(q) ||
      t.transactionReference?.toLowerCase().includes(q) ||
      t.title?.toLowerCase().includes(q)
    );
  });

  const claimRate = overview.scratchStats?.totalIssued > 0
    ? Math.round((overview.scratchStats.totalClaimed / overview.scratchStats.totalIssued) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Customer Wallet & Scratch Rewards Vault
              </h2>
              <p className="text-xs text-slate-500">
                Super Admin financial liability monitoring, customer recharge volume & manual adjustments
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchOverview}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportTxnCsv}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {feedback && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in font-bold">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          {feedback}
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2 animate-in fade-in font-bold">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          {error}
        </div>
      )}

      {/* Financial Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Wallet Liability */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Wallet Liability (₹)</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            ₹{Number(overview.totalWalletLiability || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500">
            Held across {overview.totalUsersWithBalance || 0} active customer accounts
          </p>
        </div>

        {/* Total Coins in Circulation */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Coins in Circulation</span>
            <Coins className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-500">
            {Number(overview.totalCoinsCirculation || 0).toLocaleString('en-IN')} 🪙
          </div>
          <p className="text-[11px] text-slate-500">
            1:1 value parity with INR store discounts
          </p>
        </div>

        {/* Total Top-Up Volume */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Top-Up Volume</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">
            ₹{Number(overview.totalTopUpVolume || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500">
            {overview.topUpCount || 0} recharges • +₹{overview.totalBonusDisbursed || 0} bonus
          </p>
        </div>

        {/* Scratch Card Delivery Claim Rate */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Scratch Rewards</span>
            <Gift className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600">
            {claimRate}% <span className="text-xs font-semibold text-slate-400">Claimed</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {overview.scratchStats?.totalClaimed || 0} claimed of {overview.scratchStats?.totalIssued || 0} issued
          </p>
        </div>
      </div>

      {/* Main Two-Column Layout: Customer Adjustment & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Manual Customer Wallet Adjustment Tool */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div>
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              Manual Wallet Adjustment
            </h3>
            <p className="text-xs text-slate-500">
              Credit or debit funds with immutable audit logging
            </p>
          </div>

          <form onSubmit={handleAdjustSubmit} className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Customer User ID or Mongo _id *
              </label>
              <input
                type="text"
                value={adjustForm.userId}
                onChange={(e) => setAdjustForm({ ...adjustForm, userId: e.target.value })}
                placeholder="Paste customer ID"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs outline-hidden focus:border-indigo-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Type *
                </label>
                <select
                  value={adjustForm.type}
                  onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold outline-hidden"
                >
                  <option value="CREDIT">CREDIT (+)</option>
                  <option value="DEBIT">DEBIT (-)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Currency *
                </label>
                <select
                  value={adjustForm.currency}
                  onChange={(e) => setAdjustForm({ ...adjustForm, currency: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold outline-hidden"
                >
                  <option value="INR">Cash (₹)</option>
                  <option value="COINS">Coins (🪙)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Amount ({adjustForm.currency === 'INR' ? '₹' : 'Coins'}) *
              </label>
              <input
                type="number"
                value={adjustForm.amount}
                onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })}
                placeholder="e.g. 250"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold text-sm outline-hidden focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Mandatory Audit Reason (min 5 chars) *
              </label>
              <textarea
                rows={3}
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                placeholder="e.g., Goodwill credit for delayed shipment on order #AUR-1082"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs outline-hidden focus:border-indigo-600"
              />
            </div>

            <button
              type="submit"
              disabled={adjustLoading}
              className={`w-full py-2.5 rounded-xl font-black text-xs text-white shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                adjustForm.type === 'CREDIT'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {adjustLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Processing...
                </>
              ) : (
                `Execute ${adjustForm.type} Adjustment`
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Platform-wide Recent Wallet Transactions */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                Live Platform Transactions Ledger
              </h3>
              <p className="text-xs text-slate-500">
                Latest recharges, spending debits, and scratch card rewards
              </p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTxn}
                onChange={(e) => setSearchTxn(e.target.value)}
                placeholder="Search user, ref ID..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs outline-hidden w-48"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-xl">Customer</th>
                  <th className="py-2.5 px-3">Type / Category</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Method / Ref</th>
                  <th className="py-2.5 px-3 rounded-r-xl">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTxns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No matching wallet transactions found.
                    </td>
                  </tr>
                ) : (
                  filteredTxns.slice(0, 15).map((t) => {
                    const isCredit = t.type === 'CREDIT';
                    return (
                      <tr key={t._id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50 transition">
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {t.user?.name || 'Customer'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {t.user?.email || t.user?._id || 'N/A'}
                          </p>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                            {t.title}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {t.category}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`font-black text-xs ${
                              isCredit ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isCredit ? '+' : '-'}
                            {t.currency === 'COINS' ? `${t.amount} 🪙` : `₹${t.amount}`}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300 block">
                            {t.transactionReference || 'N/A'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {t.paymentMethod || 'SYSTEM'}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                          {new Date(t.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
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
    </div>
  );
}
