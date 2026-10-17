import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Landmark,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  RefreshCw,
  Building2,
  FileText,
  MapPin,
  Calendar,
  CreditCard,
  Hash,
  Copy,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import api from '../api/client';

export default function VendorVerificationManager({ isOpen, onClose, onVerificationUpdated }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedUtr, setCopiedUtr] = useState(false);

  // Form states
  const [gstin, setGstin] = useState('');
  const [legalName, setLegalName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  const handleResetGstin = () => {
    setData((prev) => ({
      ...prev,
      gstinVerification: { ...prev?.gstinVerification, status: 'UNVERIFIED' },
    }));
  };

  const handleResetBank = () => {
    setData((prev) => ({
      ...prev,
      bankVerification: { ...prev?.bankVerification, status: 'UNVERIFIED' },
    }));
  };

  useEffect(() => {
    if (isOpen) {
      fetchVerificationStatus();
    }
  }, [isOpen]);

  const fetchVerificationStatus = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/vendor/verification/status');
      if (res.data?.success) {
        const d = res.data.data;
        setData(d);
        if (d.gstinVerification?.gstin) {
          setGstin(d.gstinVerification.gstin);
        }
        if (d.legalName) {
          setLegalName(d.legalName);
        }
        if (d.bankVerification?.accountHolder) {
          setAccountHolder(d.bankVerification.accountHolder);
        }
        if (d.bankVerification?.ifscCode) {
          setIfscCode(d.bankVerification.ifscCode);
        }
      }
    } catch (err) {
      console.error('Failed to fetch verification status:', err);
      setError(err.response?.data?.message || 'Failed to load verification status');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyGstin = async (e) => {
    e.preventDefault();
    if (!gstin.trim()) {
      setError('Please enter a 15-character GSTIN');
      return;
    }
    try {
      setActionLoading(true);
      setError('');
      setSuccessMsg('');
      const res = await api.post('/vendor/verification/gstin', {
        gstin: gstin.trim().toUpperCase(),
        legalName: legalName.trim(),
      });
      if (res.data?.success) {
        setSuccessMsg(res.data.message || 'GSTIN verified successfully with Government Tax Registry!');
        fetchVerificationStatus();
        if (onVerificationUpdated) onVerificationUpdated();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'GSTIN verification failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyPennyDrop = async (e) => {
    e.preventDefault();
    if (!accountNumber.trim() || !ifscCode.trim()) {
      setError('Account Number and IFSC Code are both required');
      return;
    }
    try {
      setActionLoading(true);
      setError('');
      setSuccessMsg('');
      const res = await api.post('/vendor/verification/bank-penny-drop', {
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        accountHolder: accountHolder.trim(),
      });
      if (res.data?.success) {
        setSuccessMsg(res.data.message || 'Bank account verified via ₹1.00 IMPS penny-drop!');
        fetchVerificationStatus();
        if (onVerificationUpdated) onVerificationUpdated();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Bank penny-drop verification failed');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedUtr(true);
    setTimeout(() => setCopiedUtr(false), 2000);
  };

  if (!isOpen) return null;

  const gstinVerified = data?.gstinVerification?.status === 'VERIFIED';
  const bankVerified = data?.bankVerification?.status === 'VERIFIED';
  const complianceStatus = data?.complianceReview?.status || 'PENDING';
  const overallScore = data?.complianceReview?.overallScore || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl my-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="relative px-8 py-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black text-white tracking-tight">
                  Merchant Trust & Compliance Verification Hub
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Point #35
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-Time Government GSTIN Lookup & Bank ₹1.00 IMPS Penny-Drop Verification Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchVerificationStatus}
              disabled={loading || actionLoading}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all disabled:opacity-50"
              title="Refresh Verification State"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-400 text-xs font-semibold">
              <XCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Overall Compliance Bento Card */}
          <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="text-xs uppercase font-black text-slate-400 tracking-wider">
                  Overall Compliance Status
                </span>
                {complianceStatus === 'AUTO_VERIFIED' && (
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Auto Verified
                  </span>
                )}
                {complianceStatus === 'MANUAL_VERIFIED' && (
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Super Admin Approved
                  </span>
                )}
                {complianceStatus === 'ACTION_REQUIRED' && (
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Action Required
                  </span>
                )}
                {complianceStatus === 'PENDING' && (
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Verification Pending
                  </span>
                )}
                {complianceStatus === 'REJECTED' && (
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" /> Verification Rejected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {complianceStatus === 'AUTO_VERIFIED' || complianceStatus === 'MANUAL_VERIFIED'
                  ? 'Your store is in full regulatory compliance. Fast-track settlements and prime vendor badges enabled.'
                  : 'Complete both real-time Government GSTIN and Penny-Drop Bank verification to enable automatic store approval.'}
              </p>
            </div>

            {/* Overall Score Meter */}
            <div className="flex items-center gap-4 self-stretch md:self-auto bg-slate-900/60 px-5 py-3 rounded-xl border border-slate-700/50">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Entity Match Score</p>
                <p className="text-xl font-black text-white">
                  {overallScore}%{' '}
                  <span className="text-xs font-semibold text-slate-400">
                    ({overallScore >= 70 ? 'High Confidence' : overallScore >= 40 ? 'Moderate' : 'Low'})
                  </span>
                </p>
              </div>
              <div className="w-20 h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    overallScore >= 70 ? 'bg-emerald-500' : overallScore >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${overallScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* Dual Verification Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Government GSTIN Verification Engine */}
            <div className="p-6 rounded-2xl bg-slate-800/20 border border-slate-700/60 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">Government GSTIN Verification</h3>
                      <p className="text-[11px] text-slate-400">Direct statutory lookup via GSTN API</p>
                    </div>
                  </div>
                  {gstinVerified ? (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Active & Verified
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase bg-slate-800 text-slate-400 border border-slate-700">
                      Unverified
                    </span>
                  )}
                </div>

                {/* Form or Info */}
                {!gstinVerified ? (
                  <form onSubmit={handleVerifyGstin} className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        15-Character GSTIN Number
                      </label>
                      <input
                        type="text"
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value.toUpperCase())}
                        placeholder="e.g. 27ABCDE1234F1Z5"
                        maxLength={15}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-indigo-500 transition-colors uppercase placeholder:text-slate-600"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Merchant Legal Entity Name
                      </label>
                      <input
                        type="text"
                        value={legalName}
                        onChange={(e) => setLegalName(e.target.value)}
                        placeholder="e.g. Aura Crafts Retail Pvt Ltd"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Verifying with GSTN Registry...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" /> Verify via Government GSTN
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-3 pt-2">
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/50 space-y-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400">GSTIN Registered</span>
                        <span className="font-mono text-xs font-bold text-emerald-400">
                          {data.gstinVerification.gstin}
                        </span>
                      </div>
                      <div className="flex items-start justify-between">
                        <span className="text-[11px] text-slate-400">Legal Trade Name</span>
                        <span className="text-xs font-bold text-white text-right max-w-[65%]">
                          {data.gstinVerification.legalName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Taxpayer Type</span>
                        <span className="text-xs text-slate-300 font-medium">
                          {data.gstinVerification.taxpayerType} ({data.gstinVerification.constitutionOfBusiness})
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">State Jurisdiction</span>
                        <span className="text-xs text-slate-300 font-medium flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-indigo-400" />
                          {data.gstinVerification.stateJurisdiction}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Registration Date</span>
                        <span className="text-xs text-slate-300 font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {data.gstinVerification.dateOfRegistration}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Fuzzy Name Match</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {data.gstinVerification.nameMatchScore}% ({data.gstinVerification.nameMatchStatus})
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetGstin}
                      className="text-xs text-slate-400 hover:text-indigo-400 underline transition-colors"
                    >
                      Update / Re-verify different GSTIN
                    </button>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 text-[11px] text-blue-300/80 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Statutory compliance adheres to Section 9(5) of the CGST Act for e-commerce operators.</span>
              </div>
            </div>

            {/* 2. Bank Account Penny-Drop Verification */}
            <div className="p-6 rounded-2xl bg-slate-800/20 border border-slate-700/60 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <Landmark className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">Bank Penny-Drop Verification</h3>
                      <p className="text-[11px] text-slate-400">₹1.00 IMPS penny-drop with beneficiary name match</p>
                    </div>
                  </div>
                  {bankVerified ? (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Bank Account Active
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase bg-slate-800 text-slate-400 border border-slate-700">
                      Unverified
                    </span>
                  )}
                </div>

                {/* Form or Info */}
                {!bankVerified ? (
                  <form onSubmit={handleVerifyPennyDrop} className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Bank Account Number
                      </label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 987654321012"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Bank IFSC Code
                      </label>
                      <input
                        type="text"
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                        placeholder="e.g. HDFC0001234"
                        maxLength={11}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition-colors uppercase placeholder:text-slate-600"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Account Holder / Beneficiary Name
                      </label>
                      <input
                        type="text"
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(e.target.value)}
                        placeholder="e.g. Aura Crafts Retail Pvt Ltd"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Processing ₹1.00 IMPS Transfer...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" /> Initiate ₹1.00 Penny-Drop Verification
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-3 pt-2">
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/50 space-y-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400">Beneficiary Bank</span>
                        <span className="text-xs font-bold text-white">{data.bankVerification.bankName}</span>
                      </div>
                      <div className="flex items-start justify-between">
                        <span className="text-[11px] text-slate-400">Confirmed Beneficiary</span>
                        <span className="text-xs font-bold text-emerald-400 text-right">
                          {data.bankVerification.beneficiaryName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Account Masked</span>
                        <span className="font-mono text-xs text-slate-300 font-semibold">
                          {data.bankVerification.accountNumberMasked}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">IFSC & Branch</span>
                        <span className="font-mono text-xs text-slate-300">
                          {data.bankVerification.ifscCode} ({data.bankVerification.branchName})
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">IMPS Reference UTR</span>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                          <span>{data.bankVerification.utr}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(data.bankVerification.utr)}
                            className="text-slate-400 hover:text-white"
                          >
                            {copiedUtr ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Name Match Score</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {data.bankVerification.nameMatchScore}% ({data.bankVerification.nameMatchStatus})
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetBank}
                      className="text-xs text-slate-400 hover:text-emerald-400 underline transition-colors"
                    >
                      Update / Re-verify different Bank Account
                    </button>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-[11px] text-emerald-300/80 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Verified bank accounts receive automated weekly vendor payout settlements via RTGS/NEFT.</span>
              </div>
            </div>
          </div>

          {/* Admin Review Notes (if present) */}
          {data?.complianceReview?.adminRemarks && (
            <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <AlertCircle className="w-4 h-4" />
                <span>Compliance Reviewer Feedback</span>
              </div>
              <p className="text-xs text-slate-300 italic">"{data.complianceReview.adminRemarks}"</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-5 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>256-bit Encrypted Banking & Tax Gateway Integration</span>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition-all"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
