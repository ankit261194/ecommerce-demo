import React, { useState, useEffect } from 'react';
import {
  X,
  Wallet,
  Coins,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Gift,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  CreditCard,
  ChevronRight,
  Flame,
} from 'lucide-react';
import api from '../api/client';

export default function WalletDrawer({ isOpen, onClose }) {
  const [walletData, setWalletData] = useState({
    walletBalance: 250,
    walletCoins: 500,
    transactions: [],
  });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL'); // ALL | COINS | CASH | CASHBACK
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState(500);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [coinsToConvert, setCoinsToConvert] = useState(50);

  useEffect(() => {
    if (isOpen) {
      fetchWallet();
    }
  }, [isOpen]);

  const fetchWallet = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/wallet');
      if (res.data?.success && res.data.data) {
        setWalletData(res.data.data);
      }
    } catch (err) {
      // Graceful fallback for mock demo
      console.warn('Could not fetch wallet data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDailyCheckin = async () => {
    setActionLoading(true);
    setFeedbackMsg(null);
    setErrorMsg(null);
    try {
      const res = await api.post('/wallet/daily-checkin');
      if (res.data?.success) {
        setFeedbackMsg(res.data.message || '+50 Reward Coins claimed successfully! 🎉');
        fetchWallet();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Daily check-in already claimed for today!';
      setErrorMsg(msg);
    } finally {
      setActionLoading(false);
      setTimeout(() => {
        setFeedbackMsg(null);
        setErrorMsg(null);
      }, 3500);
    }
  };

  const handleConvertCoins = async () => {
    setActionLoading(true);
    try {
      const res = await api.post('/wallet/redeem-coins', { coins: coinsToConvert });
      if (res.data?.success) {
        setFeedbackMsg(`Successfully converted ${coinsToConvert} Coins to ₹${coinsToConvert} Cash! 💰`);
        setShowConvertModal(false);
        fetchWallet();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to convert coins.');
    } finally {
      setActionLoading(false);
      setTimeout(() => {
        setFeedbackMsg(null);
        setErrorMsg(null);
      }, 3500);
    }
  };

  const handleTopup = async (amt) => {
    setActionLoading(true);
    try {
      const res = await api.post('/wallet/topup', { amount: amt || topupAmount });
      if (res.data?.success) {
        setFeedbackMsg(`₹${amt || topupAmount} added to your wallet successfully! 💳`);
        setShowTopupModal(false);
        fetchWallet();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to top up wallet.');
    } finally {
      setActionLoading(false);
      setTimeout(() => {
        setFeedbackMsg(null);
        setErrorMsg(null);
      }, 3500);
    }
  };

  if (!isOpen) return null;

  const filteredTransactions = (walletData.transactions || []).filter((txn) => {
    if (activeFilter === 'COINS') return txn.currency === 'COINS';
    if (activeFilter === 'CASH') return txn.currency === 'INR';
    if (activeFilter === 'CASHBACK') return txn.category === 'CASHBACK';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end transition-opacity duration-300">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-1.5">
                In-App Wallet & Coins
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400 text-slate-950">
                  REWARDS
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                1 Coin = ₹1 Discount • 5% Cashback
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alerts */}
        {feedbackMsg && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{feedbackMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-5">
          
          {/* Main Dual Balance Card */}
          <div className="rounded-2xl bg-gradient-to-br from-[#0f2444] via-[#163761] to-[#0b1c36] text-white p-5 shadow-xl relative overflow-hidden border border-white/10">
            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Verified Customer Wallet
              </span>
              <button
                onClick={fetchWallet}
                disabled={loading}
                className="text-blue-300 hover:text-white transition p-1"
                title="Refresh balance"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pb-4 border-b border-white/10">
              {/* Cash Balance */}
              <div className="space-y-1">
                <span className="text-[10px] text-blue-300 uppercase font-semibold block">
                  Spendable Cash
                </span>
                <div className="text-2xl font-black text-white tracking-tight flex items-baseline gap-1">
                  <span>₹{Number(walletData.walletBalance || 0).toLocaleString('en-IN')}</span>
                </div>
                <button
                  onClick={() => setShowTopupModal(true)}
                  className="mt-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
                >
                  <Plus className="w-3 h-3" />
                  Add Funds
                </button>
              </div>

              {/* Reward Coins */}
              <div className="space-y-1 pl-3 border-l border-white/10">
                <span className="text-[10px] text-blue-300 uppercase font-semibold block">
                  Reward Coins
                </span>
                <div className="text-2xl font-black text-amber-400 tracking-tight flex items-baseline gap-1.5">
                  <Coins className="w-5 h-5 text-amber-400 inline" />
                  <span>{Number(walletData.walletCoins || 0).toLocaleString('en-IN')}</span>
                </div>
                <button
                  onClick={() => setShowConvertModal(true)}
                  className="mt-1 text-[11px] font-bold text-blue-200 hover:text-white flex items-center gap-1 transition"
                >
                  <ArrowUpRight className="w-3 h-3" />
                  Redeem Coins
                </button>
              </div>
            </div>

            {/* Quick Action Buttons Row */}
            <div className="pt-4 flex items-center gap-2">
              <button
                onClick={handleDailyCheckin}
                disabled={actionLoading}
                className="flex-1 py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Daily Check-in (+50)
              </button>
              <button
                onClick={() => handleTopup(250)}
                disabled={actionLoading}
                className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition flex items-center justify-center gap-1 active:scale-95"
                title="Quick top-up with ₹250"
              >
                +₹250
              </button>
            </div>
          </div>

          {/* Value Proposition Perks */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-xs font-black">
                5%
              </div>
              <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200">Cashback</p>
              <p className="text-[9px] text-slate-500">On every purchase</p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto text-xs font-black">
                1:1
              </div>
              <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200">1 Coin = ₹1</p>
              <p className="text-[9px] text-slate-500">Checkout discount</p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto text-xs font-black">
                0
              </div>
              <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200">No Expiry</p>
              <p className="text-[9px] text-slate-500">Lifelong validity</p>
            </div>
          </div>

          {/* Activity / Transaction Ledger */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Transaction History
              </h4>
              <span className="text-[10px] font-semibold text-slate-400">
                {filteredTransactions.length} records
              </span>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { key: 'ALL', label: 'All' },
                { key: 'COINS', label: 'Coins (🪙)' },
                { key: 'CASH', label: 'Cash (₹)' },
                { key: 'CASHBACK', label: 'Cashback (🎁)' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    activeFilter === f.key
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Transaction List */}
            {filteredTransactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No transactions found under this filter.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTransactions.map((t, idx) => {
                  const isCredit = t.type === 'CREDIT';
                  return (
                    <div
                      key={t._id || idx}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isCredit
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400'
                          }`}
                        >
                          {isCredit ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 dark:text-white leading-tight">
                            {t.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {t.createdAt
                              ? new Date(t.createdAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Just now'}
                            {t.orderNumber && ` • #${t.orderNumber}`}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`font-black text-sm block ${
                            isCredit
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isCredit ? '+' : '-'}
                          {t.currency === 'COINS' ? `${t.amount} 🪙` : `₹${t.amount}`}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {t.currency === 'COINS'
                            ? `bal: ${t.coinsAfter || 0}`
                            : `bal: ₹${t.balanceAfter || 0}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal: Top-Up Wallet */}
        {showTopupModal && (
          <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  Top-Up In-App Wallet
                </h4>
                <button
                  onClick={() => setShowTopupModal(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Select Top-Up Amount (₹):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[250, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setTopupAmount(amt)}
                      className={`py-2 rounded-xl text-xs font-black border transition ${
                        topupAmount === amt
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleTopup(topupAmount)}
                disabled={actionLoading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : `Add ₹${topupAmount} to Wallet`}
              </button>
            </div>
          </div>
        )}

        {/* Modal: Convert Coins to Cash */}
        {showConvertModal && (
          <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-500" />
                  Convert Coins to Spendable Cash
                </h4>
                <button
                  onClick={() => setShowConvertModal(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <p>
                  Available: <strong className="text-amber-500">{walletData.walletCoins || 0} Coins</strong>
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={10}
                    max={Math.max(10, walletData.walletCoins || 10)}
                    step={10}
                    value={coinsToConvert}
                    onChange={(e) => setCoinsToConvert(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0">
                    {coinsToConvert} 🪙
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Rate: 1 Coin = ₹1.00. You will receive <strong>₹{coinsToConvert}</strong> cash balance.
                </p>
              </div>

              <button
                onClick={handleConvertCoins}
                disabled={actionLoading || (walletData.walletCoins || 0) < coinsToConvert}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md transition disabled:opacity-50"
              >
                {actionLoading ? 'Converting...' : `Convert ${coinsToConvert} Coins to ₹${coinsToConvert}`}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
