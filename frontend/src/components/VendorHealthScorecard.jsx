import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Award,
  Crown,
  Star,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Clock,
  XCircle,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  FileText,
  Send,
  Zap,
  Lock,
  ChevronRight,
  Info,
  Calendar,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function VendorHealthScorecard({ token, onClose }) {
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Appeal form state
  const [appealMetric, setAppealMetric] = useState('OVERALL_SCORE');
  const [appealReason, setAppealReason] = useState('');
  const [appealActionPlan, setAppealActionPlan] = useState('');

  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/vendor/health`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success) {
        setData(result);
      } else {
        setError(result.message || 'Failed to load seller health data');
      }
    } catch (err) {
      setError('Network error while connecting to Seller Health Service');
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/vendor/health/recalculate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success) {
        setSuccessMsg('Health scorecard refreshed with real-time order telemetry!');
        fetchHealthData();
      } else {
        setError(result.message || 'Failed to recalculate health scorecard');
      }
    } catch (err) {
      setError('Network error during recalculation');
    } finally {
      setRecalculating(false);
    }
  };

  const handleAppealSubmit = async (e) => {
    e.preventDefault();
    if (appealReason.trim().length < 10 || appealActionPlan.trim().length < 10) {
      setError('Please provide at least 10 characters for both reason and action plan');
      return;
    }

    setSubmittingAppeal(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/vendor/health/appeal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          metricContested: appealMetric,
          reason: appealReason,
          actionPlan: appealActionPlan,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setSuccessMsg('Appeal and remediation plan submitted for Super Admin review!');
        setShowAppealModal(false);
        setAppealReason('');
        setAppealActionPlan('');
        fetchHealthData();
      } else {
        setError(result.message || 'Failed to submit appeal');
      }
    } catch (err) {
      setError('Network error submitting appeal');
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const getTierBadge = (tier) => {
    switch (tier) {
      case 'PLATINUM':
        return {
          label: 'PLATINUM SELLER',
          icon: Crown,
          bg: 'bg-gradient-to-r from-purple-900/60 to-indigo-900/60 border-purple-500/40 text-purple-200',
          badgeBg: 'bg-purple-600',
          textColor: 'text-purple-400',
        };
      case 'GOLD':
        return {
          label: 'GOLD SELLER',
          icon: Star,
          bg: 'bg-gradient-to-r from-amber-900/60 to-yellow-900/60 border-amber-500/40 text-amber-200',
          badgeBg: 'bg-amber-600',
          textColor: 'text-amber-400',
        };
      case 'SILVER':
        return {
          label: 'SILVER SELLER',
          icon: Award,
          bg: 'bg-gradient-to-r from-slate-800 to-gray-800 border-slate-600 text-slate-200',
          badgeBg: 'bg-slate-600',
          textColor: 'text-slate-400',
        };
      case 'AT_RISK':
        return {
          label: 'AT RISK (WARNING)',
          icon: AlertTriangle,
          bg: 'bg-gradient-to-r from-orange-950/70 to-red-950/70 border-orange-500/50 text-orange-200',
          badgeBg: 'bg-orange-600',
          textColor: 'text-orange-400',
        };
      case 'PROBATION':
        return {
          label: 'PROBATION',
          icon: ShieldAlert,
          bg: 'bg-gradient-to-r from-red-950 to-rose-950 border-red-600 text-red-200',
          badgeBg: 'bg-red-600',
          textColor: 'text-red-400',
        };
      default:
        return {
          label: tier,
          icon: ShieldCheck,
          bg: 'bg-gray-800 border-gray-700 text-gray-300',
          badgeBg: 'bg-gray-600',
          textColor: 'text-gray-400',
        };
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center">
          <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Analyzing Seller Health & SLA...</h3>
          <p className="text-sm text-slate-400">Evaluating dispatch punctuality, cancellation rate and defect metrics.</p>
        </div>
      </div>
    );
  }

  const scorecard = data?.scorecard || {};
  const privileges = data?.privileges || {};
  const penalties = data?.penalties || {};
  const benchmarks = data?.policyBenchmarks || {};
  const appeals = data?.appeals || [];
  const tierConfig = getTierBadge(scorecard.badgeTier);
  const TierIcon = tierConfig.icon;

  const scoreColor =
    scorecard.score >= 90
      ? 'text-emerald-400'
      : scorecard.score >= 75
      ? 'text-amber-400'
      : scorecard.score >= 50
      ? 'text-indigo-400'
      : 'text-rose-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl my-8 overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Seller Health & SLA Performance Scorecard</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${tierConfig.bg}`}>
                  <TierIcon className="w-3.5 h-3.5" />
                  {tierConfig.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time operational metrics for <strong className="text-slate-200">{data?.storeName || 'Your Store'}</strong> • Point 12 Enterprise Engine
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRecalculate}
              disabled={recalculating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin text-emerald-400' : ''}`} />
              {recalculating ? 'Recalculating...' : 'Sync Telemetry'}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-lg"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Notifications / Alerts */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Active Penalties Warning Banner (if any) */}
          {['WARNING', 'RESTRICTED', 'PROBATION', 'SUSPENDED'].includes(penalties.penaltyStatus) && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-rose-300">
                    Operational Notice: {penalties.penaltyStatus} Status Active
                  </h4>
                  <p className="text-xs text-rose-200/80 mt-1 leading-relaxed">
                    {penalties.warningNotes ||
                      'Your operational metrics currently breach platform SLA policies. Active throttling or payout holding is enforced.'}
                  </p>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs">
                    {penalties.dailyOrderCap && (
                      <span className="font-semibold text-rose-300">
                        Order Cap: Max {penalties.dailyOrderCap} orders/day
                      </span>
                    )}
                    {penalties.payoutHoldDays > 0 && (
                      <span className="font-semibold text-rose-300">
                        Payout Delay: {penalties.payoutHoldDays} days extra hold
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowAppealModal(true)}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold whitespace-nowrap transition-colors shadow-sm"
              >
                Submit SLA Appeal
              </button>
            </div>
          )}

          {/* Top Banner: Score Gauge + Tier Privileges */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Health Score Gauge */}
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Health Rating Score</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className={`text-5xl font-extrabold tracking-tight ${scoreColor}`}>
                    {scorecard.score}
                  </span>
                  <span className="text-sm text-slate-500 font-semibold">/ 100 pts</span>
                </div>
              </div>
              <div className="mt-4">
                <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      scorecard.score >= 90
                        ? 'bg-emerald-500'
                        : scorecard.score >= 75
                        ? 'bg-amber-500'
                        : scorecard.score >= 50
                        ? 'bg-indigo-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, scorecard.score))}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium mt-1.5">
                  <span>Critical (&lt;50)</span>
                  <span>Silver (50-74)</span>
                  <span>Gold (75-89)</span>
                  <span>Platinum (90+)</span>
                </div>
              </div>
            </div>

            {/* Current Tier & Privileges Unlocked */}
            <div className="md:col-span-2 p-5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Merchant Privileges & Incentives</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <h3 className="text-lg font-bold text-white">{tierConfig.label} Privileges</h3>
                    {scorecard.badgeTier === 'PLATINUM' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Top Tier
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowAppealModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  SLA Appeal
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Commission Bonus</span>
                  <span className="text-sm font-bold text-emerald-400 mt-0.5 block">
                    {privileges.commissionDiscountPercent > 0 ? `-${privileges.commissionDiscountPercent}% Discount` : 'Standard'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Search Visibility</span>
                  <span className="text-sm font-bold text-indigo-400 mt-0.5 block">
                    {privileges.searchRankBoost}x Priority
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Payout Speed</span>
                  <span className="text-sm font-bold text-amber-400 mt-0.5 block">
                    {privileges.instantPayout ? 'Instant Approval' : 'Standard 24h'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Storefront Badge</span>
                  <span className="text-sm font-bold text-purple-400 mt-0.5 block">
                    {scorecard.badgeTier} Verified
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Core SLA Metrics KPI Matrix */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Core SLA Performance Indicators (Evaluated across {scorecard.totalOrdersEvaluated || 0} Orders)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Metric 1: Late Shipment Rate */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      Late Dispatch Rate (LDR)
                    </span>
                    <span className="text-[10px] text-slate-500">Target: &lt;2.0%</span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className={`text-2xl font-bold ${scorecard.lateShipmentRate <= 2.0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {scorecard.lateShipmentRate}%
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      ({scorecard.lateOrdersCount} orders late)
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${scorecard.lateShipmentRate <= 2.0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      style={{ width: `${Math.min(100, scorecard.lateShipmentRate * 5)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Must dispatch within 48h of order placement.
                  </span>
                </div>
              </div>

              {/* Metric 2: Cancellation Rate */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <XCircle className="w-3.5 h-3.5 text-amber-400" />
                      Cancellation Rate (VCR)
                    </span>
                    <span className="text-[10px] text-slate-500">Target: &lt;1.0%</span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className={`text-2xl font-bold ${scorecard.cancellationRate <= 1.0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {scorecard.cancellationRate}%
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      ({scorecard.cancelledOrdersCount} cancelled)
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${scorecard.cancellationRate <= 1.0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      style={{ width: `${Math.min(100, scorecard.cancellationRate * 10)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Stock-out or merchant cancelled orders.
                  </span>
                </div>
              </div>

              {/* Metric 3: Return Defect Rate */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                      Return Defect Rate (RDR)
                    </span>
                    <span className="text-[10px] text-slate-500">Target: &lt;2.5%</span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className={`text-2xl font-bold ${scorecard.returnRate <= 2.5 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {scorecard.returnRate}%
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      ({scorecard.returnedOrdersCount} returns)
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${scorecard.returnRate <= 2.5 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      style={{ width: `${Math.min(100, scorecard.returnRate * 8)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Damaged, defective or wrong items shipped.
                  </span>
                </div>
              </div>

              {/* Metric 4: On-Time Delivery / Customer Rating */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Star className="w-3.5 h-3.5 text-yellow-400" />
                      Rating & On-Time Rate
                    </span>
                    <span className="text-[10px] text-slate-500">Target: &ge;4.5</span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="text-2xl font-bold text-amber-400">
                      ★ {scorecard.averageRating}
                    </span>
                    <span className="text-xs text-emerald-400 font-medium">
                      ({scorecard.onTimeDeliveryRate}% on-time)
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${(scorecard.averageRating / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Customer review average & courier punctuality.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tier Policy Matrix Benchmark Guide */}
          <div className="p-5 rounded-xl bg-slate-950 border border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Official Platform SLA Tiers & Operational Policies
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500">
                    <th className="pb-2 font-semibold">Tier Badge</th>
                    <th className="pb-2 font-semibold">Min Score</th>
                    <th className="pb-2 font-semibold">Max Late Rate</th>
                    <th className="pb-2 font-semibold">Max Cancellation</th>
                    <th className="pb-2 font-semibold">Max Return Rate</th>
                    <th className="pb-2 font-semibold">Min Rating</th>
                    <th className="pb-2 font-semibold">Commission Perk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  <tr className={scorecard.badgeTier === 'PLATINUM' ? 'bg-purple-950/20 font-bold' : ''}>
                    <td className="py-2.5 text-purple-400 font-bold flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5" /> PLATINUM
                    </td>
                    <td className="py-2.5 text-slate-300">&ge; 90 pts</td>
                    <td className="py-2.5 text-slate-300">&le; 2.0%</td>
                    <td className="py-2.5 text-slate-300">&le; 1.0%</td>
                    <td className="py-2.5 text-slate-300">&le; 2.5%</td>
                    <td className="py-2.5 text-slate-300">&ge; 4.5</td>
                    <td className="py-2.5 text-emerald-400">-2.0% Commission Bonus</td>
                  </tr>
                  <tr className={scorecard.badgeTier === 'GOLD' ? 'bg-amber-950/20 font-bold' : ''}>
                    <td className="py-2.5 text-amber-400 font-bold flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5" /> GOLD
                    </td>
                    <td className="py-2.5 text-slate-300">&ge; 75 pts</td>
                    <td className="py-2.5 text-slate-300">&le; 4.0%</td>
                    <td className="py-2.5 text-slate-300">&le; 2.5%</td>
                    <td className="py-2.5 text-slate-300">&le; 4.0%</td>
                    <td className="py-2.5 text-slate-300">&ge; 4.0</td>
                    <td className="py-2.5 text-emerald-400">-1.0% Commission Bonus</td>
                  </tr>
                  <tr className={scorecard.badgeTier === 'SILVER' ? 'bg-slate-800/20 font-bold' : ''}>
                    <td className="py-2.5 text-slate-300 font-bold flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-slate-400" /> SILVER
                    </td>
                    <td className="py-2.5 text-slate-300">&ge; 50 pts</td>
                    <td className="py-2.5 text-slate-300">&le; 8.0%</td>
                    <td className="py-2.5 text-slate-300">&le; 5.0%</td>
                    <td className="py-2.5 text-slate-300">&le; 6.0%</td>
                    <td className="py-2.5 text-slate-300">&ge; 3.5</td>
                    <td className="py-2.5 text-slate-400">Standard Platform Rate</td>
                  </tr>
                  <tr className={scorecard.badgeTier === 'AT_RISK' ? 'bg-orange-950/20 font-bold' : ''}>
                    <td className="py-2.5 text-orange-400 font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> AT RISK
                    </td>
                    <td className="py-2.5 text-slate-300">&lt; 50 pts</td>
                    <td className="py-2.5 text-orange-400">&gt; 8.0%</td>
                    <td className="py-2.5 text-orange-400">&gt; 5.0%</td>
                    <td className="py-2.5 text-orange-400">&gt; 6.0%</td>
                    <td className="py-2.5 text-slate-300">&lt; 3.5</td>
                    <td className="py-2.5 text-orange-400">Order Throttling (Max 50/day)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* SLA Appeals & Remediation History */}
          <div className="p-5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                SLA Performance Appeals & Formal Remediation History
              </h3>
              <button
                onClick={() => setShowAppealModal(true)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
              >
                + New Appeal Request
              </button>
            </div>

            {appeals.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs">
                No active or previous SLA appeals on file. Your account has maintained standard operational procedures.
              </div>
            ) : (
              <div className="space-y-3">
                {appeals.map((appeal, index) => (
                  <div key={appeal._id || index} className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white uppercase">{appeal.metricContested} Appeal</span>
                        <span className="text-[10px] text-slate-500">
                          {appeal.submittedAt ? new Date(appeal.submittedAt).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          appeal.status === 'APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : appeal.status === 'REJECTED'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {appeal.status}
                      </span>
                    </div>
                    <p className="text-slate-300 mt-2">
                      <strong className="text-slate-400">Reason:</strong> {appeal.reason}
                    </p>
                    <p className="text-slate-300 mt-1">
                      <strong className="text-slate-400">Action Plan:</strong> {appeal.actionPlan}
                    </p>
                    {appeal.adminFeedback && (
                      <div className="mt-2 p-2 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                        <strong className="text-slate-300">Management Feedback:</strong> {appeal.adminFeedback}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex justify-between items-center text-xs text-slate-500">
          <span>
            Last refreshed: {scorecard.lastCalculatedAt ? new Date(scorecard.lastCalculatedAt).toLocaleString() : 'Just now'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
          >
            Close Scorecard
          </button>
        </div>
      </div>

      {/* SLA Appeal Modal */}
      {showAppealModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Submit SLA Performance Appeal</h3>
              </div>
              <button
                onClick={() => setShowAppealModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAppealSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Metric or Policy Contested
                </label>
                <select
                  value={appealMetric}
                  onChange={(e) => setAppealMetric(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="OVERALL_SCORE">Overall Health Score / Badge Tier</option>
                  <option value="LATE_SHIPMENT_RATE">Late Shipment Rate (Courier Delay)</option>
                  <option value="CANCELLATION_RATE">Cancellation Rate (Catalog / Inventory Glitch)</option>
                  <option value="RETURN_RATE">Return Defect Rate (Fraudulent Buyer Returns)</option>
                  <option value="DAILY_CAP_PENALTY">Throttling / Order Cap Penalty Waiver</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Extenuating Circumstances / Detailed Justification
                </label>
                <textarea
                  rows={3}
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  placeholder="Explain the specific root cause (e.g. Courier hub strike, weather blockage, manufacturer delay)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Remediation Action Plan & Prevention Measures
                </label>
                <textarea
                  rows={3}
                  value={appealActionPlan}
                  onChange={(e) => setAppealActionPlan(e.target.value)}
                  placeholder="Describe the concrete actions you have enacted to ensure this variance will not recur..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAppealModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAppeal}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submittingAppeal ? 'Submitting...' : 'Submit Appeal to Management'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
