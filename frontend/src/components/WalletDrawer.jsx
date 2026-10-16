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
  QrCode,
  Smartphone,
  Building,
  Tag,
  Receipt,
  Printer,
  Copy,
  Check,
  Clock,
  ExternalLink,
  Percent,
} from 'lucide-react';
import api from '../api/client';
import { ScratchCardModal } from './ScratchCardModal';

export default function WalletDrawer({ isOpen, onClose }) {
  const [walletData, setWalletData] = useState({
    walletBalance: 250,
    walletCoins: 500,
    unclaimedScratchCardsCount: 0,
    totalLoaded: 0,
    totalSpent: 0,
    totalRewardsEarned: 0,
    transactions: [],
  });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Navigation Tabs: 'WALLET' | 'SCRATCH_CARDS' | 'LEDGER'
  const [activeTab, setActiveTab] = useState('WALLET');
  const [activeFilter, setActiveFilter] = useState('ALL'); // ALL | TOPUP | SPENDS | REWARDS | COINS

  // Top-up Modal State
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupPacks, setTopupPacks] = useState([
    { id: 'pack_500', amount: 500, bonusCash: 25, bonusCoins: 50, badge: 'POPULAR', tag: '+₹25 Bonus' },
    { id: 'pack_1000', amount: 1000, bonusCash: 75, bonusCoins: 150, badge: 'BEST VALUE', tag: '+₹75 Bonus' },
    { id: 'pack_2000', amount: 2000, bonusCash: 200, bonusCoins: 400, badge: 'HOT DEAL', tag: '+₹200 Bonus' },
    { id: 'pack_5000', amount: 5000, bonusCash: 600, bonusCoins: 1200, badge: 'VIP CLUB', tag: '+₹600 Bonus' },
  ]);
  const [selectedPackId, setSelectedPackId] = useState('pack_1000');
  const [customTopupAmount, setCustomTopupAmount] = useState('1000');
  const [paymentMethod, setPaymentMethod] = useState('UPI'); // UPI | CARD | NETBANKING
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [upiApp, setUpiApp] = useState('PHONEPE'); // PHONEPE | GPAY | PAYTM | BHIM

  // Convert Coins Modal State
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [coinsToConvert, setCoinsToConvert] = useState(50);

  // Scratch Cards State
  const [scratchCards, setScratchCards] = useState([]);
  const [scratchCardsLoading, setScratchCardsLoading] = useState(false);
  const [selectedScratchCard, setSelectedScratchCard] = useState(null);
  const [isScratchModalOpen, setIsScratchModalOpen] = useState(false);

  // Transaction Receipt Modal State
  const [selectedReceiptTxn, setSelectedReceiptTxn] = useState(null);
  const [copiedRef, setCopiedRef] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchWallet();
      fetchScratchCards();
      fetchPresetPacks();
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
      console.warn('Could not fetch wallet data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPresetPacks = async () => {
    try {
      const res = await api.get('/wallet/topup/preset-packs');
      if (res.data?.success && res.data.data?.packs) {
        setTopupPacks(res.data.data.packs);
      }
    } catch (_) {}
  };

  const fetchScratchCards = async () => {
    setScratchCardsLoading(true);
    try {
      const res = await api.get('/wallet/scratch-cards');
      if (res.data?.success && res.data.cards) {
        setScratchCards(res.data.cards);
      }
    } catch (err) {
      console.warn('Could not fetch scratch cards:', err.message);
    } finally {
      setScratchCardsLoading(false);
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

  // Top-Up Calculation Helper
  const getRechargeCalculations = () => {
    const rawAmt = Number(customTopupAmount) || 0;
    let baseBonusCash = 0;
    let baseBonusCoins = 0;

    if (rawAmt >= 5000) {
      baseBonusCash = Math.round(rawAmt * 0.12);
      baseBonusCoins = 1200;
    } else if (rawAmt >= 2000) {
      baseBonusCash = Math.round(rawAmt * 0.10);
      baseBonusCoins = 400;
    } else if (rawAmt >= 1000) {
      baseBonusCash = Math.round(rawAmt * 0.075);
      baseBonusCoins = 150;
    } else if (rawAmt >= 500) {
      baseBonusCash = Math.round(rawAmt * 0.05);
      baseBonusCoins = 50;
    }

    let promoBonusCash = 0;
    let promoBonusCoins = 0;
    if (appliedPromo === 'WALLET10' && rawAmt >= 500) {
      promoBonusCash = Math.min(150, Math.round(rawAmt * 0.10));
    } else if (appliedPromo === 'WELCOME50' && rawAmt >= 500) {
      promoBonusCash = 50;
    } else if (appliedPromo === 'COINBOOST') {
      promoBonusCoins = 250;
    }

    const totalBonusCash = baseBonusCash + promoBonusCash;
    const totalBonusCoins = baseBonusCoins + promoBonusCoins;
    const totalCredited = rawAmt + totalBonusCash;

    return {
      rawAmt,
      totalBonusCash,
      totalBonusCoins,
      totalCredited,
    };
  };

  const handleApplyPromo = () => {
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) return;
    if (['WALLET10', 'WELCOME50', 'COINBOOST'].includes(code)) {
      setAppliedPromo(code);
      setFeedbackMsg(`Promo code '${code}' applied successfully! 🎉`);
    } else {
      setErrorMsg('Invalid promo code. Try WALLET10 or WELCOME50.');
    }
    setTimeout(() => {
      setFeedbackMsg(null);
      setErrorMsg(null);
    }, 3000);
  };

  const handleExecuteTopup = async () => {
    const { rawAmt } = getRechargeCalculations();
    if (!rawAmt || rawAmt < 10) {
      setErrorMsg('Minimum top-up amount is ₹10');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.post('/wallet/topup', {
        amount: rawAmt,
        paymentMethod,
        promoCode: appliedPromo,
        transactionReference: `UPI_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
      });

      if (res.data?.success) {
        setFeedbackMsg(res.data.message || `₹${rawAmt} added to your wallet! 💳`);
        setShowTopupModal(false);
        setAppliedPromo(null);
        setPromoCodeInput('');
        fetchWallet();
        // Cross-window sync
        window.dispatchEvent(new CustomEvent('auramarket_wallet_update', { detail: res.data.data }));
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Top-up failed. Please try again.');
    } finally {
      setActionLoading(false);
      setTimeout(() => {
        setFeedbackMsg(null);
        setErrorMsg(null);
      }, 4000);
    }
  };

  const handleOpenScratchCard = (card) => {
    setSelectedScratchCard(card);
    setIsScratchModalOpen(true);
  };

  const handleRewardClaimedInModal = (data) => {
    fetchWallet();
    fetchScratchCards();
    if (data?.card) {
      setSelectedScratchCard(data.card);
    }
  };

  if (!isOpen) return null;

  const { rawAmt, totalBonusCash, totalBonusCoins, totalCredited } = getRechargeCalculations();

  const filteredTransactions = (walletData.transactions || []).filter((txn) => {
    if (activeFilter === 'TOPUP') return txn.category === 'WALLET_TOPUP' || txn.category === 'ADMIN_CREDIT';
    if (activeFilter === 'SPENDS') return txn.type === 'DEBIT';
    if (activeFilter === 'REWARDS') return txn.category === 'SCRATCH_CARD' || txn.category === 'CASHBACK';
    if (activeFilter === 'COINS') return txn.currency === 'COINS';
    return true;
  });

  const unopenedCards = scratchCards.filter((c) => !c.isScratched || !c.isClaimed);
  const claimedCards = scratchCards.filter((c) => c.isClaimed);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end transition-opacity duration-300">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-1.5">
                Aura Wallet & Scratch Rewards
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-white">
                  VERIFIED
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                100% Secure • Instant Cashback • 1 Coin = ₹1
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

        {/* Global Feedback Notifications */}
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

        {/* Navigation Tabs Bar */}
        <div className="px-4 pt-3 flex items-center border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            onClick={() => setActiveTab('WALLET')}
            className={`flex-1 pb-3 text-xs font-bold border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'WALLET'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            Wallet & Top-Up
          </button>

          <button
            onClick={() => setActiveTab('SCRATCH_CARDS')}
            className={`flex-1 pb-3 text-xs font-bold border-b-2 transition flex items-center justify-center gap-1.5 relative ${
              activeTab === 'SCRATCH_CARDS'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Gift className="w-3.5 h-3.5 text-amber-500" />
            Scratch Cards
            {unopenedCards.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-amber-500 text-slate-950 animate-pulse">
                {unopenedCards.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('LEDGER')}
            className={`flex-1 pb-3 text-xs font-bold border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'LEDGER'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            Passbook
          </button>
        </div>

        {/* Tab 1: Wallet & Top-Up Main View */}
        {activeTab === 'WALLET' && (
          <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-5">
            {/* Main Fintech Gradient Card */}
            <div className="rounded-2xl bg-gradient-to-br from-[#0b162c] via-[#12284c] to-[#081220] text-white p-5 shadow-xl relative overflow-hidden border border-white/10">
              <div className="absolute top-0 right-0 -mr-6 -mt-6 w-36 h-36 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Prepaid Wallet Balance
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
                {/* Spendable Cash */}
                <div className="space-y-1">
                  <span className="text-[10px] text-blue-300 uppercase font-semibold block">
                    Spendable Cash
                  </span>
                  <div className="text-2xl font-black text-white tracking-tight flex items-baseline gap-1">
                    <span>₹{Number(walletData.walletBalance || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <button
                    onClick={() => setShowTopupModal(true)}
                    className="mt-1 text-xs font-black text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Money
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
                    className="mt-1 text-xs font-bold text-blue-200 hover:text-white flex items-center gap-1 transition"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    Redeem Coins
                  </button>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="pt-4 flex items-center gap-2">
                <button
                  onClick={() => setShowTopupModal(true)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-md transition flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Top-Up Wallet
                </button>

                <button
                  onClick={handleDailyCheckin}
                  disabled={actionLoading}
                  className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
                  title="Claim streak bonus"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Check-in (+50)
                </button>
              </div>
            </div>

            {/* Quick Recharge Packs Grid */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  ⚡ Quick Recharge Packs
                </h4>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  Earn Instant Cashback
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {topupPacks.map((pack) => (
                  <button
                    key={pack.id}
                    onClick={() => {
                      setSelectedPackId(pack.id);
                      setCustomTopupAmount(pack.amount.toString());
                      setShowTopupModal(true);
                    }}
                    className="p-3 rounded-xl text-left bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 hover:border-amber-400 dark:hover:border-amber-400 transition group relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        ₹{pack.amount.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/30">
                        {pack.tag}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Get +₹{pack.bonusCash} extra + {pack.bonusCoins} coins
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Lifetime Telemetry Counters */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Loaded</span>
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  ₹{Number(walletData.totalLoaded || 0).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Spent</span>
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  ₹{Number(walletData.totalSpent || 0).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Rewards Won</span>
                <span className="text-sm font-black text-amber-500">
                  ₹{Number(walletData.totalRewardsEarned || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Unclaimed Scratch Cards Alert Banner */}
            {unopenedCards.length > 0 && (
              <div
                onClick={() => setActiveTab('SCRATCH_CARDS')}
                className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/15 to-amber-500/10 border border-amber-400/40 flex items-center justify-between cursor-pointer hover:border-amber-400 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-400/20">
                    🎁
                  </div>
                  <div>
                    <h5 className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      You have {unopenedCards.length} unrevealed scratch card{unopenedCards.length > 1 ? 's' : ''}!
                    </h5>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Doorstep delivery reward unlocked. Scratch to claim cashback.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-500" />
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Scratch Cards View */}
        {activeTab === 'SCRATCH_CARDS' && (
          <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-amber-500" />
                  Your Scratch Card Rewards
                </h4>
                <p className="text-xs text-slate-500">
                  Earned automatically on every completed doorstep delivery
                </p>
              </div>
              <button
                onClick={fetchScratchCards}
                className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-bold"
              >
                <RefreshCw className={`w-3 h-3 ${scratchCardsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {scratchCards.length === 0 ? (
              <div className="py-12 text-center space-y-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto text-2xl">
                  🎁
                </div>
                <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                  No Scratch Cards Yet
                </h5>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Place an order and receive a guaranteed mystery scratch card with cash or coins upon doorstep delivery!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {scratchCards.map((card) => {
                  const isUnopened = !card.isScratched || !card.isClaimed;
                  return (
                    <div
                      key={card._id}
                      onClick={() => handleOpenScratchCard(card)}
                      className={`p-4 rounded-2xl border transition cursor-pointer relative overflow-hidden group ${
                        isUnopened
                          ? 'bg-gradient-to-br from-amber-500/10 via-yellow-400/5 to-amber-500/10 border-amber-400 hover:shadow-lg hover:shadow-amber-500/10'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-80'
                      }`}
                    >
                      {isUnopened && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider animate-pulse">
                          ✨ Unopened
                        </div>
                      )}

                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                            isUnopened
                              ? 'bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 shadow-md shadow-amber-400/20'
                              : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400'
                          }`}
                        >
                          {isUnopened ? '✨' : '✓'}
                        </div>

                        <div className="space-y-1 flex-1">
                          <h5 className="font-black text-xs text-slate-900 dark:text-white leading-tight">
                            {card.title || 'Post-Delivery Mystery Reward'}
                          </h5>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {card.description || 'Delivered order reward'}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-0.5">
                            <span>Order #{card.orderNumber}</span>
                            <span>•</span>
                            <span>{new Date(card.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                          </div>
                        </div>

                        <button
                          className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 ${
                            isUnopened
                              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-sm'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {isUnopened ? 'Scratch' : 'View'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Passbook / Transaction Ledger */}
        {activeTab === 'LEDGER' && (
          <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Wallet Statement
              </h4>
              <span className="text-[10px] font-semibold text-slate-400">
                {filteredTransactions.length} transactions
              </span>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { key: 'ALL', label: 'All' },
                { key: 'TOPUP', label: 'Recharges 💳' },
                { key: 'SPENDS', label: 'Debits 🛒' },
                { key: 'REWARDS', label: 'Rewards 🎁' },
                { key: 'COINS', label: 'Coins 🪙' },
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

            {filteredTransactions.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No transactions found under this category.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTransactions.map((t) => {
                  const isCredit = t.type === 'CREDIT';
                  return (
                    <div
                      key={t._id}
                      onClick={() => setSelectedReceiptTxn(t)}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs hover:border-slate-400 cursor-pointer transition group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isCredit
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400'
                          }`}
                        >
                          {isCredit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 dark:text-white leading-tight">
                            {t.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {new Date(t.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {t.paymentMethod && ` • ${t.paymentMethod}`}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex items-center gap-2">
                        <div>
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
                            {t.currency === 'COINS' ? `bal: ${t.coinsAfter || 0}` : `bal: ₹${t.balanceAfter || 0}`}
                          </span>
                        </div>
                        <Receipt className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal: Comprehensive Top-Up Wallet (UPI, Cards, Netbanking) */}
        {showTopupModal && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-black text-base text-slate-900 dark:text-white">
                    Add Money to Aura Wallet
                  </h4>
                </div>
                <button
                  onClick={() => setShowTopupModal(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Amount Selection & Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select or Enter Amount (₹):
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[500, 1000, 2000, 5000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setCustomTopupAmount(amt.toString())}
                      className={`py-2 px-1 rounded-xl text-xs font-black border transition ${
                        Number(customTopupAmount) === amt
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>

                <div className="relative mt-2">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={customTopupAmount}
                    onChange={(e) => setCustomTopupAmount(e.target.value)}
                    placeholder="Enter amount (min ₹10)"
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-black text-sm outline-hidden focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Promo Code Input */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Have a Promo Code?</span>
                  <span className="text-[10px] text-amber-500 font-bold">Use WALLET10 for 10% extra</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. WALLET10"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold uppercase tracking-wider outline-hidden"
                  />
                  <button
                    onClick={handleApplyPromo}
                    className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800"
                  >
                    Apply
                  </button>
                </div>
                {appliedPromo && (
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Coupon '{appliedPromo}' active: Extra cashback unlocked!
                  </div>
                )}
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Payment Method:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'UPI', label: 'Instant UPI', icon: Smartphone },
                    { id: 'CARD', label: 'Debit/Credit', icon: CreditCard },
                    { id: 'NETBANKING', label: 'Netbanking', icon: Building },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setPaymentMethod(m.id)}
                        className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                          paymentMethod === m.id
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-black'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[11px]">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Method Details Preview */}
              {paymentMethod === 'UPI' && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Preferred UPI App:</span>
                    <span className="text-[10px] text-emerald-600 font-bold">Zero Transaction Fee</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
                    {['PHONEPE', 'GPAY', 'PAYTM', 'BHIM'].map((app) => (
                      <button
                        key={app}
                        onClick={() => setUpiApp(app)}
                        className={`py-1.5 rounded-lg border transition ${
                          upiApp === app
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {app}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Cashback Calculation Summary */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-400/40 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Recharge Amount:</span>
                  <span className="font-bold text-slate-900 dark:text-white">₹{rawAmt}</span>
                </div>
                {totalBonusCash > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                    <span>Cashback Bonus:</span>
                    <span>+₹{totalBonusCash}</span>
                  </div>
                )}
                {totalBonusCoins > 0 && (
                  <div className="flex justify-between text-amber-600 dark:text-amber-400 font-bold">
                    <span>Reward Coins Bonus:</span>
                    <span>+{totalBonusCoins} 🪙</span>
                  </div>
                )}
                <div className="border-t border-amber-400/30 pt-1.5 mt-1 flex justify-between font-black text-sm text-slate-900 dark:text-white">
                  <span>Total Wallet Credit:</span>
                  <span className="text-amber-500 font-black">₹{totalCredited}</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleExecuteTopup}
                disabled={actionLoading || rawAmt < 10}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Pay ₹{rawAmt} & Add ₹{totalCredited} to Wallet
                  </>
                )}
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

        {/* Modal: Printable Transaction Slip Receipt */}
        {selectedReceiptTxn && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="text-center pb-3 border-b border-dashed border-slate-200 dark:border-slate-700">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto mb-2 text-lg">
                  ✓
                </div>
                <h4 className="font-black text-base text-slate-900 dark:text-white">
                  Payment Receipt
                </h4>
                <p className="text-xs text-slate-400">AuraMarket Wallet Transaction</p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Reference:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    {selectedReceiptTxn.transactionReference || selectedReceiptTxn._id.slice(-8)}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedReceiptTxn.transactionReference || selectedReceiptTxn._id);
                        setCopiedRef(true);
                        setTimeout(() => setCopiedRef(false), 2000);
                      }}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      {copiedRef ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Date & Time:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {new Date(selectedReceiptTxn.createdAt).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Type / Method:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {selectedReceiptTxn.category} • {selectedReceiptTxn.paymentMethod || 'SYSTEM'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="font-bold text-emerald-600">SUCCESS</span>
                </div>

                <div className="border-t border-dashed border-slate-200 dark:border-slate-700 pt-2 flex justify-between font-black text-sm">
                  <span>Amount:</span>
                  <span className={selectedReceiptTxn.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}>
                    {selectedReceiptTxn.type === 'CREDIT' ? '+' : '-'}
                    {selectedReceiptTxn.currency === 'COINS' ? `${selectedReceiptTxn.amount} 🪙` : `₹${selectedReceiptTxn.amount}`}
                  </span>
                </div>

                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Closing Balance:</span>
                  <span>
                    {selectedReceiptTxn.currency === 'COINS'
                      ? `${selectedReceiptTxn.coinsAfter || 0} Coins`
                      : `₹${selectedReceiptTxn.balanceAfter || 0}`}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-200"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Slip
                </button>
                <button
                  onClick={() => setSelectedReceiptTxn(null)}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scratch Card Modal Overlay */}
        <ScratchCardModal
          isOpen={isScratchModalOpen}
          onClose={() => {
            setIsScratchModalOpen(false);
            setSelectedScratchCard(null);
          }}
          cardData={selectedScratchCard}
          onRewardClaimed={handleRewardClaimedInModal}
        />

      </div>
    </div>
  );
}
