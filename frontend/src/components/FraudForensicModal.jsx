import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  X,
  Globe,
  Smartphone,
  Cpu,
  MapPin,
  Clock,
  UserX,
  FileCheck,
  AlertOctagon,
  Check,
  Activity,
  Layers,
} from 'lucide-react';
import api from '../api/client';

export default function FraudForensicModal({ incident, onClose, onResolved }) {
  const [resolutionStatus, setResolutionStatus] = useState('CONFIRMED_FRAUD');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [unbanUser, setUnbanUser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

  if (!incident) return null;

  const getRiskBadgeColor = (level, score) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'HIGH':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }
  };

  const handleResolve = async () => {
    setIsSubmitting(true);
    setActionMessage({ type: '', text: '' });
    try {
      const res = await api.post(`/admin/fraud/incidents/${incident._id}/resolve`, {
        status: resolutionStatus,
        notes: resolutionNotes,
        unbanUser: resolutionStatus === 'FALSE_POSITIVE' ? true : unbanUser,
      });

      if (res.data?.success) {
        setActionMessage({
          type: 'success',
          text: `Incident marked as ${resolutionStatus} successfully!`,
        });
        setTimeout(() => {
          if (onResolved) onResolved(res.data.data);
          onClose();
        }, 1200);
      }
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update incident forensic status',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-tight">
                  Forensic Dossier: #{incident.incidentNumber}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${getRiskBadgeColor(
                    incident.riskLevel,
                    incident.riskScore
                  )}`}
                >
                  {incident.riskLevel} RISK • SCORE {incident.riskScore}/100
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Timestamp:{' '}
                {incident.createdAt
                  ? new Date(incident.createdAt).toLocaleString('en-IN')
                  : 'N/A'}{' '}
                • Action Enforced: <span className="font-bold text-white">{incident.actionTaken}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {actionMessage.text && (
            <div
              className={`p-4 rounded-2xl text-xs font-bold border flex items-center gap-2 animate-fade-in ${
                actionMessage.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              {actionMessage.type === 'success' ? (
                <Check className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{actionMessage.text}</span>
            </div>
          )}

          {/* User & Order Profile Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Customer Identity
              </span>
              <p className="text-sm font-black text-white mt-1 truncate">
                {incident.user?.name || 'Guest Shopper'}
              </p>
              <p className="text-xs text-slate-400 font-mono truncate">{incident.user?.email || 'N/A'}</p>
              <p className="text-xs text-slate-400 font-mono">{incident.user?.phone || 'N/A'}</p>
              {incident.user?.isShadowBanned && (
                <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <UserX className="w-3 h-3" /> Shadow-Banned
                </span>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Transaction Value & Order
              </span>
              <p className="text-lg font-black text-white mt-1">
                ₹{(incident.cartAmount || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-slate-400 font-mono">
                Order Ref: {incident.order?.orderNumber || incident.order?._id || 'Pre-Flight Scan'}
              </p>
              <p className="text-xs text-slate-400">
                Payment: <span className="font-bold text-white">{incident.order?.paymentMethod || 'N/A'}</span>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Velocity Context
              </span>
              <div className="space-y-1 mt-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Last 1 Hour:</span>
                  <span className="font-black text-white">{incident.velocity?.ordersLast1Hour || 0} orders</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last 24 Hours:</span>
                  <span className="font-black text-white">{incident.velocity?.ordersLast24Hours || 0} orders</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Device Accounts:</span>
                  <span className="font-black text-white">{incident.velocity?.accountsPerDevice || 1} users</span>
                </div>
              </div>
            </div>
          </div>

          {/* Triggered Rules Dossier */}
          <div>
            <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-rose-400" />
              Violated Security Rules ({incident.triggeredRules?.length || 0})
            </h4>
            {incident.triggeredRules && incident.triggeredRules.length > 0 ? (
              <div className="space-y-2">
                {incident.triggeredRules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">{rule.ruleName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                          {rule.ruleCode}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          +{rule.scoreAdded} pts
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{rule.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-xs">
                No active security rules were violated. Baseline transaction heuristics passed.
              </div>
            )}
          </div>

          {/* Device & Geolocation Anomaly Dossier */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Device Dossier */}
            <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-slate-300">
                <Smartphone className="w-4 h-4 text-teal-400" />
                <span>Hardware & Browser Fingerprint</span>
              </div>
              <div className="text-xs space-y-1.5 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Device ID:</span>
                  <span className="font-mono text-white text-[11px] truncate max-w-[180px]">
                    {incident.deviceId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">OS / Platform:</span>
                  <span className="text-white font-medium">{incident.fingerprint?.os || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Browser:</span>
                  <span className="text-white font-medium">{incident.fingerprint?.browser || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Screen Resolution:</span>
                  <span className="text-white font-medium font-mono">{incident.fingerprint?.screenResolution || '1920x1080'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Timezone:</span>
                  <span className="text-white font-medium">{incident.fingerprint?.timezone || 'Asia/Kolkata'}</span>
                </div>
              </div>
            </div>

            {/* Network & Geolocation Dossier */}
            <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-slate-300">
                <Globe className="w-4 h-4 text-indigo-400" />
                <span>Network & Geolocation Telemetry</span>
              </div>
              <div className="text-xs space-y-1.5 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Client IP Address:</span>
                  <span className="font-mono text-white font-bold">{incident.ipAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Estimated IP City/Country:</span>
                  <span className="text-white font-medium">
                    {incident.geolocation?.ipCity || 'Delhi'}, {incident.geolocation?.ipCountry || 'India'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Shipping Destination:</span>
                  <span className="text-white font-medium">
                    {incident.geolocation?.shippingCity || 'N/A'}, {incident.geolocation?.shippingPincode || ''}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Geo Distance Discrepancy:</span>
                  <span
                    className={`font-mono font-bold ${
                      incident.geolocation?.isGeoMismatch ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {incident.geolocation?.distanceKm || 0} km
                    {incident.geolocation?.isGeoMismatch && ' (ANOMALY)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">VPN / Proxy Gateway:</span>
                  <span
                    className={`font-bold ${
                      incident.network?.vpnOrProxy ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {incident.network?.vpnOrProxy ? 'DETECTED' : 'Clean Residential'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Forensic Resolution Panel */}
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
            <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              Administrative Incident Adjudication
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setResolutionStatus('CONFIRMED_FRAUD')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  resolutionStatus === 'CONFIRMED_FRAUD'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-lg shadow-rose-500/10'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 font-black text-xs">
                  <AlertOctagon className="w-4 h-4 text-rose-400" />
                  Confirmed Fraud
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Maintain shadow ban & blacklists</p>
              </button>

              <button
                type="button"
                onClick={() => setResolutionStatus('FALSE_POSITIVE')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  resolutionStatus === 'FALSE_POSITIVE'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 font-black text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  False Positive
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Auto-unban user & clear flag</p>
              </button>

              <button
                type="button"
                onClick={() => setResolutionStatus('RESOLVED')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  resolutionStatus === 'RESOLVED'
                    ? 'bg-teal-500/20 border-teal-500 text-teal-300 shadow-lg shadow-teal-500/10'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 font-black text-xs">
                  <Check className="w-4 h-4 text-teal-400" />
                  Resolved / Closed
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Archive forensic investigation</p>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Resolution Investigation Notes
              </label>
              <textarea
                value={resolutionNotes}
                onChange={e => setResolutionNotes(e.target.value)}
                placeholder="Enter forensic remarks, evidence rationale, or customer verification details..."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none font-sans"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <div className="text-xs text-slate-400">
                Resolution Status:{' '}
                <span className="font-bold text-white">
                  {incident.resolution?.status || 'PENDING_REVIEW'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResolve}
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      Commit Resolution
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
