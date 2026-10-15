import React, { useState, useEffect } from 'react';
import {
  X,
  Palmtree,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Save,
  Power,
  ShieldAlert,
  Sparkles,
  Info,
  Check,
} from 'lucide-react';
import api from '../api/client';

const NOTICE_PRESETS = [
  {
    title: '🪔 Festival & Holiday Break',
    message: 'Our facility is closed for festival celebrations. All new orders will be fulfilled in order of receipt once operations resume on Monday.',
  },
  {
    title: '📦 Annual Warehouse Stocktaking',
    message: 'We are conducting our annual inventory audit and warehouse stocktaking. Orders will resume dispatch shortly.',
  },
  {
    title: '☀️ Team Offsite & Summer Vacation',
    message: 'Our warehouse and support teams are currently on scheduled offsite leave. We appreciate your patience!',
  },
  {
    title: '🛠️ Facility Upgrades & Maintenance',
    message: 'We are expanding our dispatch sorting automation lines. Order processing will resume with express 24h dispatch next week.',
  },
];

const VacationModeModal = ({
  isOpen,
  onClose,
  currentVacationMode,
  onVacationUpdated,
}) => {
  const [isVacation, setIsVacation] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState('');
  const [disableOrdering, setDisableOrdering] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (currentVacationMode) {
        setIsVacation(Boolean(currentVacationMode.isVacation));
        setNoticeMessage(
          currentVacationMode.noticeMessage ||
            'This store is temporarily on vacation. Orders will resume shortly.'
        );
        setDisableOrdering(
          currentVacationMode.disableOrdering !== undefined
            ? Boolean(currentVacationMode.disableOrdering)
            : true
        );
        setStartDate(
          currentVacationMode.startDate
            ? new Date(currentVacationMode.startDate).toISOString().slice(0, 10)
            : ''
        );
        setEndDate(
          currentVacationMode.endDate
            ? new Date(currentVacationMode.endDate).toISOString().slice(0, 10)
            : ''
        );
      }
    }
  }, [isOpen, currentVacationMode]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const payload = {
        isVacation,
        noticeMessage:
          noticeMessage.trim() ||
          'This store is temporarily on vacation. Orders will resume shortly.',
        disableOrdering,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      };

      const res = await api.put('/vendor/vacation-mode', payload);
      if (res.data?.success) {
        setFeedback({
          type: 'success',
          message: res.data.message || 'Vacation settings updated successfully!',
        });
        if (onVacationUpdated) {
          onVacationUpdated(res.data.data);
        }
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setFeedback({
          type: 'error',
          message: res.data?.message || 'Failed to update vacation mode.',
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Error updating vacation mode.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shrink-0">
              <Palmtree className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  Store Vacation & Holiday Mode
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/25 text-white border border-white/30">
                  Point #59
                </span>
              </div>
              <p className="text-xs text-amber-100 mt-0.5">
                Pause incoming orders without modifying stock, deleting listings, or damaging seller metrics.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl text-xs font-bold flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <span className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              {feedback.message}
            </span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800">
          {/* Main Master Toggle Switch */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900">
                  Vacation Mode Status:
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                    isVacation
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  }`}
                >
                  {isVacation ? '🌴 ON VACATION (PAUSED)' : '🟢 LIVE & ACCEPTING ORDERS'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {isVacation
                  ? 'Shoppers see your holiday banner; order placement is paused.'
                  : 'Your storefront is fully open and accepting orders as normal.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsVacation(!isVacation)}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isVacation ? 'bg-amber-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isVacation ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Customer Warning Preview Alert */}
          {isVacation && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-400/40 space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 text-amber-950 font-black text-xs uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Customer Storefront Warning Banner Preview</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold leading-relaxed">
                <p className="font-bold">🌴 Merchant on Holiday Break:</p>
                <p className="mt-0.5">
                  {noticeMessage ||
                    'This store is temporarily on vacation. Orders will resume shortly.'}
                </p>
                {endDate && (
                  <p className="text-[11px] text-amber-800 font-bold mt-1">
                    🗓️ Expected Operations Resumption: {new Date(endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Quick Notice Presets */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>1-Click Notice Message Templates:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {NOTICE_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setNoticeMessage(p.message)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                    noticeMessage === p.message
                      ? 'bg-amber-50/70 border-amber-400 text-amber-950 font-bold ring-1 ring-amber-300'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <p className="font-bold text-slate-900">{p.title}</p>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {p.message}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Notice Message Field */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
              Custom Customer Notice Message
            </label>
            <textarea
              rows={3}
              value={noticeMessage}
              onChange={(e) => setNoticeMessage(e.target.value)}
              placeholder="Explain why your store is on holiday and when orders will ship..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none leading-relaxed"
            />
          </div>

          {/* Holiday Schedule (Dates) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Vacation Start Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Expected End / Reopening Date
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Ordering Policy Behavior */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-800 block">
              Cart & Checkout Behavior During Vacation
            </label>
            <div className="space-y-2 text-xs">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="orderingBehavior"
                  checked={disableOrdering === true}
                  onChange={() => setDisableOrdering(true)}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="font-bold text-slate-900">
                    Strictly Pause All Checkout (Recommended)
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Disables "Add to Cart" and "Buy Now" on all your products; backend rejects checkout with your notice.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="orderingBehavior"
                  checked={disableOrdering === false}
                  onChange={() => setDisableOrdering(false)}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="font-bold text-slate-900">
                    Accept Orders with Delayed Dispatch Warning
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Customers can still place orders, but are explicitly notified that packages will ship after your reopening date.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Catalog listings remain completely preserved in database.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black shadow-md hover:shadow-amber-500/25 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Settings...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Vacation Status</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VacationModeModal;
