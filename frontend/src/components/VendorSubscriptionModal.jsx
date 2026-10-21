import React, { useState, useEffect } from 'react';
import {
  Crown,
  Check,
  Zap,
  ShieldCheck,
  TrendingDown,
  Sparkles,
  X,
  FileText,
  AlertCircle,
  Clock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import api from '../api/client';
import { useLocalization } from '../context/LocalizationContext';

export const VendorSubscriptionModal = ({ isOpen, onClose }) => {
  const { formatPrice } = useLocalization();

  const [billingCycle, setBillingCycle] = useState('MONTHLY');
  const [plans, setPlans] = useState([]);
  const [currentSubData, setCurrentSubData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [activeTab, setActiveTab] = useState('plans'); // 'plans' | 'invoices'
  const [loading, setLoading] = useState(false);
  const [submittingPlanId, setSubmittingPlanId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, currentRes, invoicesRes] = await Promise.all([
        api.get('/vendor/subscription/plans'),
        api.get('/vendor/subscription/current'),
        api.get('/vendor/subscription/invoices'),
      ]);

      if (plansRes.data?.success) setPlans(plansRes.data.data);
      if (currentRes.data?.success) setCurrentSubData(currentRes.data.data);
      if (invoicesRes.data?.success) setInvoices(invoicesRes.data.data);
    } catch (err) {
      console.error('Failed to load subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setFeedback(null);
    }
  }, [isOpen]);

  const handleSubscribe = async (plan) => {
    setSubmittingPlanId(plan._id);
    setFeedback(null);
    try {
      const res = await api.post('/vendor/subscription/subscribe', {
        planId: plan._id,
        billingCycle,
        paymentMethod: 'WALLET',
      });

      if (res.data?.success) {
        setFeedback({
          type: 'success',
          message: res.data.message || `Upgraded to ${plan.name} successfully!`,
        });
        await fetchData();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Subscription upgrade failed.',
      });
    } finally {
      setSubmittingPlanId(null);
    }
  };

  const handleCancelAutoRenew = async () => {
    if (!window.confirm('Are you sure you want to cancel auto-renewal? Your tier remains active until the end of the period.')) {
      return;
    }
    try {
      const res = await api.post('/vendor/subscription/cancel', {
        reason: 'Vendor requested cancellation via portal',
      });
      if (res.data?.success) {
        setFeedback({ type: 'success', message: res.data.message });
        await fetchData();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || err.message });
    }
  };

  if (!isOpen) return null;

  const currentPlan = currentSubData?.subscription?.plan;
  const usage = currentSubData?.usage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-amber-400 text-slate-950 shadow-md">
              <Crown className="w-6 h-6 stroke-[2.5]" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Vendor SaaS Subscription & Tier Plans
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase">
                  Point #53
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Unlock higher product quotas, lower commission cuts, and priority merchant perks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
              <button
                onClick={() => setActiveTab('plans')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === 'plans'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-black'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Plans & Quotas
              </button>
              <button
                onClick={() => setActiveTab('invoices')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === 'invoices'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-black'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Invoices ({invoices.length})
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="m-6 mb-0 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold ${feedback.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'}">
            {feedback.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 stroke-[3]" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Active Plan Quota Radar */}
          {usage && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">
                      Current Active Plan
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                      {currentPlan?.name || 'Starter Basic'}
                    </span>
                    {currentSubData?.subscription?.autoRenew === false && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                        Auto-Renew Off
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-semibold text-slate-300 mt-1">
                    Platform Commission: <span className="text-emerald-400 font-bold">{currentPlan?.features?.commissionRatePercent}%</span> (Standard: 15%)
                    {' • '}
                    Expires in: <span className="text-white font-bold">{usage.daysRemaining} days</span>
                  </p>
                </div>

                {currentSubData?.subscription?.amountPaid > 0 && currentSubData?.subscription?.autoRenew !== false && (
                  <button
                    onClick={handleCancelAutoRenew}
                    className="text-xs text-slate-400 hover:text-rose-400 font-semibold underline underline-offset-4 transition-colors"
                  >
                    Cancel Auto-Renewal
                  </button>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-300">Catalog Product Quota Usage</span>
                  <span className={usage.isQuotaExceeded ? 'text-rose-400 font-black' : 'text-amber-400 font-black'}>
                    {usage.totalProducts} / {usage.isUnlimited ? '∞ Unlimited' : usage.maxProducts} Listed ({usage.usagePercentage}%)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      usage.isQuotaExceeded ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-400 to-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, usage.usagePercentage)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'plans' ? (
            <div className="space-y-6">
              {/* Billing Cycle Toggle */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setBillingCycle('MONTHLY')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    billingCycle === 'MONTHLY'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Monthly Billing
                </button>

                <button
                  onClick={() => setBillingCycle('YEARLY')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    billingCycle === 'YEARLY'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>Annual Billing</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase">
                    Save 20%
                  </span>
                </button>
              </div>

              {/* Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => {
                  const isCurrent = currentPlan?._id === plan._id;
                  const price = billingCycle === 'YEARLY' ? plan.pricing.yearly : plan.pricing.monthly;
                  const isHighlighted = plan.badge === 'MOST POPULAR';

                  return (
                    <div
                      key={plan._id}
                      className={`rounded-3xl p-6 border-2 transition-all flex flex-col justify-between relative ${
                        isHighlighted
                          ? 'border-amber-400 dark:border-amber-500 bg-amber-50/20 dark:bg-amber-950/10 shadow-xl'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                      }`}
                    >
                      {plan.badge && (
                        <span
                          className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${
                            isHighlighted
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-slate-800 text-slate-200'
                          }`}
                        >
                          {plan.badge}
                        </span>
                      )}

                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-black text-slate-900 dark:text-white">
                            {plan.name}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {plan.description}
                          </p>
                        </div>

                        {/* Price */}
                        <div className="py-2 border-y border-slate-100 dark:border-slate-800">
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-slate-900 dark:text-white">
                              {price === 0 ? 'Free' : formatPrice(price)}
                            </span>
                            {price > 0 && (
                              <span className="text-xs text-slate-500 font-semibold">
                                /{billingCycle === 'YEARLY' ? 'year' : 'month'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Feature Checklist */}
                        <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 stroke-[2.5]" />
                            <span>
                              <strong>
                                {plan.features.maxProducts === -1 ? 'Unlimited' : plan.features.maxProducts}
                              </strong>{' '}
                              Products Quota
                            </span>
                          </li>

                          <li className="flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-emerald-500 flex-shrink-0 stroke-[2.5]" />
                            <span>
                              <strong>{plan.features.commissionRatePercent}%</strong> Platform Commission
                            </span>
                          </li>

                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 stroke-[2.5]" />
                            <span>{plan.features.posTerminalsIncluded} Offline POS Terminal(s)</span>
                          </li>

                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 stroke-[2.5]" />
                            <span>{plan.features.bulkCsvImportLimit.toLocaleString()} Bulk CSV Rows/upload</span>
                          </li>

                          {plan.features.featuredStoreBadge && (
                            <li className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400">
                              <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
                              <span>Verified Store VIP Badge</span>
                            </li>
                          )}

                          {plan.features.customDomainAllowed && (
                            <li className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 stroke-[2.5]" />
                              <span>Custom Domain Storefront</span>
                            </li>
                          )}

                          {plan.features.prioritySupport24x7 && (
                            <li className="flex items-center gap-2 font-bold text-indigo-600 dark:text-indigo-400">
                              <ShieldCheck className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                              <span>24/7 Priority SLA Dedicated Support</span>
                            </li>
                          )}
                        </ul>
                      </div>

                      <div className="mt-6">
                        <button
                          onClick={() => handleSubscribe(plan)}
                          disabled={isCurrent || submittingPlanId === plan._id}
                          className={`w-full py-3 px-4 rounded-2xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 ${
                            isCurrent
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                              : isHighlighted
                              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20'
                              : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-slate-900/10'
                          }`}
                        >
                          {submittingPlanId === plan._id ? (
                            <span>Upgrading...</span>
                          ) : isCurrent ? (
                            <>
                              <Check className="w-4 h-4 stroke-[3]" />
                              <span>Current Active Tier</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4" />
                              <span>Upgrade to {plan.name}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Invoices Tab */
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Billing Receipts & Official Tax Invoices
              </h3>

              {invoices.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">
                  No subscription charges recorded yet.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase font-black">
                      <tr>
                        <th className="p-3">Invoice #</th>
                        <th className="p-3">Plan</th>
                        <th className="p-3">Cycle</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Date</th>
                        <th className="p-3 text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {invoices.map((inv) => (
                        <tr key={inv._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                            {inv.invoiceNumber}
                          </td>
                          <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                            {inv.plan?.name}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                              {inv.billingCycle}
                            </span>
                          </td>
                          <td className="p-3 font-black text-slate-900 dark:text-white">
                            {inv.amountPaid === 0 ? 'Free' : formatPrice(inv.amountPaid)}
                          </td>
                          <td className="p-3 text-slate-500">
                            {new Date(inv.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-right">
                            <a
                              href={`/api/vendor/subscription/invoices/${inv._id}/print`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-400 hover:text-slate-950 font-bold transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View Receipt</span>
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default VendorSubscriptionModal;
