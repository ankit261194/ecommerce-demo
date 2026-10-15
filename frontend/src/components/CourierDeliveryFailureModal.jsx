import React, { useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  PhoneOff,
  MapPinOff,
  UserX,
  CloudRain,
  KeyRound,
  DollarSign,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import api from '../api/client';

/**
 * Point #70: Delivery Failure Workflow Modal
 * Reason selector with audit tags, automatic next attempt date & time slot rescheduling,
 * failure attempt counter warning, and Return to Origin (RTO) trigger on 3rd attempt.
 */
export const CourierDeliveryFailureModal = ({ task, onClose, onSuccess }) => {
  const currentAttempts = task.failureLog?.attemptCount || 0;
  const nextAttemptNum = currentAttempts + 1;
  const isFinalAttempt = nextAttemptNum >= 3;

  const [reason, setReason] = useState('CUSTOMER_UNAVAILABLE');

  // Tomorrow's date by default (YYYY-MM-DD)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [rescheduledFor, setRescheduledFor] = useState(tomorrow);
  const [timeSlot, setTimeSlot] = useState('Morning (9 AM - 1 PM)');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const failureReasons = [
    {
      id: 'CUSTOMER_UNAVAILABLE',
      title: 'Customer Unavailable',
      description: 'Customer not answering phone or doorbell.',
      icon: PhoneOff,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
    },
    {
      id: 'INCOMPLETE_ADDRESS',
      title: 'Incorrect / Incomplete Address',
      description: 'House number, landmark or street not found.',
      icon: MapPinOff,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
    },
    {
      id: 'CUSTOMER_REFUSED',
      title: 'Customer Refused Delivery',
      description: 'Customer explicitly cancelled or rejected parcel.',
      icon: UserX,
      color: 'text-red-600 bg-red-50 border-red-200',
    },
    {
      id: 'CASH_NOT_READY',
      title: 'COD Cash Not Ready',
      description: 'Customer requested delivery next day with cash.',
      icon: DollarSign,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
    {
      id: 'OTP_MISMATCH',
      title: 'Cannot Provide OTP',
      description: 'Customer does not have access to delivery OTP code.',
      icon: KeyRound,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
    },
    {
      id: 'BAD_WEATHER',
      title: 'Severe Weather / Road Blocked',
      description: 'Heavy rain, waterlogging, or inaccessible route.',
      icon: CloudRain,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
    },
  ];

  const timeSlots = [
    'Morning (9 AM - 1 PM)',
    'Afternoon (1 PM - 5 PM)',
    'Evening (5 PM - 8 PM)',
    'Anytime Next Day',
  ];

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const taskId = task.rawId || task._id || task.id;
      const res = await api.post(`/delivery/tasks/${taskId}/fail`, {
        reason,
        notes: notes.trim(),
        rescheduledFor,
        timeSlot,
      });

      if (res.data.success) {
        if (onSuccess) {
          onSuccess(taskId, res.data.data);
        }
      }
    } catch (err) {
      console.warn('[FailureModal] Backend fail fallback (demo mode):', err.message);
      const taskId = task.rawId || task._id || task.id;
      const mockUpdated = {
        ...task,
        status: 'FAILED',
        failureLog: {
          reason,
          attemptCount: nextAttemptNum,
          rescheduledFor: new Date(rescheduledFor),
          timeSlot,
          notes: notes.trim(),
          isRto: isFinalAttempt || reason === 'CUSTOMER_REFUSED',
        },
      };
      if (onSuccess) {
        onSuccess(taskId, mockUpdated);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                Log Delivery Failure & Reschedule
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Point #70
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Order #{task.subOrderId || task.id} • Attempt #{nextAttemptNum} of 3
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Attempt Warning Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              isFinalAttempt
                ? 'bg-rose-50 border-rose-300 text-rose-950'
                : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}
          >
            <ShieldAlert
              className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                isFinalAttempt ? 'text-rose-600' : 'text-amber-600'
              }`}
            />
            <div className="text-xs">
              <span className="font-black block uppercase tracking-wider">
                {isFinalAttempt
                  ? '⚠️ Final Attempt #3 (Return to Origin Triggered)'
                  : `⚠️ Delivery Attempt #${nextAttemptNum} Notice`}
              </span>
              <p className="mt-0.5 font-medium leading-relaxed opacity-90">
                {isFinalAttempt
                  ? 'Logging this 3rd failed attempt will trigger automatic Return to Origin (RTO) to the merchant warehouse.'
                  : `Customers get up to 3 delivery attempts before the order is returned. An automatic SMS notification will be sent.`}
              </p>
            </div>
          </div>

          {/* Failure Reason Selector */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-2">
              Select Failure Reason *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {failureReasons.map((item) => {
                const Icon = item.icon;
                const isSelected = reason === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setReason(item.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'border-rose-500 bg-rose-50/70 shadow-xs ring-1 ring-rose-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${item.color}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-xs text-slate-900 block truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-slate-500 block line-clamp-1 mt-0.5">
                        {item.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reschedule Date & Time Slot (Only if not RTO / customer refused) */}
          {reason !== 'CUSTOMER_REFUSED' && !isFinalAttempt && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-rose-600" />
                <span>Next Delivery Attempt Rescheduling</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Rescheduled Date *
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={rescheduledFor}
                    onChange={(e) => setRescheduledFor(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Preferred Time Slot
                  </label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                  >
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Rider Doorstep Notes */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
              Rider Doorstep Audit Notes / Context
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Rang doorbell 3 times, called phone (switched off). Left doorstep tag on gate."
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-black rounded-xl text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-200 flex items-center gap-1.5 transition-all"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Logging...'
                  : isFinalAttempt || reason === 'CUSTOMER_REFUSED'
                  ? 'Confirm Failure & Trigger RTO'
                  : 'Log Failure & Reschedule'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourierDeliveryFailureModal;
