import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  Landmark,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
  X,
  Eye,
  FileText,
  UserCheck,
  RotateCw,
  CreditCard,
  Hash,
  Copy,
} from 'lucide-react';
import api from '../api/client';

export default function AdminVendorVerificationHub() {
  const [vendors, setVendors] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    autoVerified: 0,
    manualVerified: 0,
    actionRequired: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Selected vendor for review modal
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState('APPROVE');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  useEffect(() => {
    fetchVerificationList();
  }, [statusFilter]);

  const fetchVerificationList = async () => {
    try {
      setLoading(true);
      setError('');
      const params = { status: statusFilter };
      if (search.trim()) params.search = search.trim();
      const res = await api.get('/admin/vendor-verification', { params });
      if (res.data?.success) {
        setVendors(res.data.data.vendors || []);
        if (res.data.data.stats) {
          setStats(res.data.data.stats);
        }
      }
    } catch (err) {
      console.error('Error fetching admin vendor verifications:', err);
      setError(err.response?.data?.message || 'Failed to load vendor verification dossiers');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchVerificationList();
  };

  const openReviewModal = (vendor, defaultAction = 'APPROVE') => {
    setSelectedVendor(vendor);
    setReviewAction(defaultAction);
    setReviewRemarks('');
    setIsReviewModalOpen(true);
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!selectedVendor) return;
    try {
      setActionSubmitting(true);
      setError('');
      setSuccessMsg('');
      const res = await api.post(`/admin/vendor-verification/${selectedVendor._id}/review`, {
        action: reviewAction,
        remarks: reviewRemarks,
      });
      if (res.data?.success) {
        setSuccessMsg(res.data.message || `Vendor verification updated successfully!`);
        setIsReviewModalOpen(false);
        fetchVerificationList();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleReverify = async (vendorId) => {
    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');
      const res = await api.post(`/admin/vendor-verification/${vendorId}/reverify`, {
        verifyGst: true,
        verifyBank: true,
      });
      if (res.data?.success) {
        setSuccessMsg('Re-verification completed successfully!');
        fetchVerificationList();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to re-verify vendor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shadow-inner">
            <ShieldCheck className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-white tracking-tight">
                Vendor Compliance, GSTIN & Penny-Drop Verification Hub
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Point #35
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Statutory Anti-Fraud Oversight: Direct GSTN registry validation & IMPS ₹1.00 bank penny-drop audits
            </p>
          </div>
        </div>

        <button
          onClick={fetchVerificationList}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-md">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Total Merchants</p>
          <p className="text-2xl font-black text-white mt-1">{stats.total}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Onboarded marketplace sellers</p>
        </div>

        <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-900/40 shadow-md">
          <p className="text-[11px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Fully Compliant
          </p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{stats.verified}</p>
          <p className="text-[10px] text-emerald-500/80 mt-0.5">
            {stats.autoVerified} Auto / {stats.manualVerified} Manual
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-900/40 shadow-md">
          <p className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> Action Required
          </p>
          <p className="text-2xl font-black text-amber-400 mt-1">{stats.actionRequired}</p>
          <p className="text-[10px] text-amber-500/80 mt-0.5">Name mismatch or invalid data</p>
        </div>

        <div className="p-5 rounded-2xl bg-blue-950/20 border border-blue-900/40 shadow-md">
          <p className="text-[11px] font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Pending Review
          </p>
          <p className="text-2xl font-black text-blue-400 mt-1">{stats.pending}</p>
          <p className="text-[10px] text-blue-500/80 mt-0.5">Awaiting verification</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {[
            { id: 'ALL', label: 'All Merchants' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'AUTO_VERIFIED', label: 'Auto-Verified' },
            { id: 'MANUAL_VERIFIED', label: 'Approved' },
            { id: 'ACTION_REQUIRED', label: 'Action Required' },
            { id: 'REJECTED', label: 'Rejected' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search store, GSTIN, legal name..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </form>
      </div>

      {/* Alerts */}
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

      {/* Main Vendor Dossier Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Merchant & Store</th>
                <th className="px-6 py-4">Government GSTIN Verification</th>
                <th className="px-6 py-4">Bank Penny-Drop Status</th>
                <th className="px-6 py-4">Compliance Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    <span>Loading compliance verification records...</span>
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <p className="text-sm font-bold text-slate-400">No merchant verification records match filter</p>
                    <p className="text-xs text-slate-600 mt-1">Try switching filters or search terms</p>
                  </td>
                </tr>
              ) : (
                vendors.map((v) => {
                  const gstinVerified = v.gstinVerification?.status === 'VERIFIED';
                  const bankVerified = v.bankVerification?.status === 'VERIFIED';
                  const compStatus = v.complianceReview?.status || 'PENDING';
                  const score = v.complianceReview?.overallScore || 0;

                  return (
                    <tr key={v._id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Merchant & Store */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={v.storeLogo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100'}
                            alt=""
                            className="w-10 h-10 rounded-xl object-cover bg-slate-800 border border-slate-700"
                          />
                          <div>
                            <p className="font-bold text-white text-sm">{v.storeName}</p>
                            <p className="text-[11px] text-slate-400">{v.businessDetails?.legalName || v.user?.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{v.user?.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* GSTIN Verification */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            {gstinVerified ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Active GSTN
                              </span>
                            ) : v.gstinVerification?.status === 'FAILED' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> Inactive / Failed
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-800 text-slate-400 border border-slate-700">
                                Unverified
                              </span>
                            )}

                            {v.gstinVerification?.nameMatchScore !== undefined && (
                              <span className="text-[10px] text-slate-400 font-bold">
                                {v.gstinVerification.nameMatchScore}% Match
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-xs text-slate-300">
                            {v.gstinVerification?.gstin || v.businessDetails?.gstNumber || 'No GSTIN Provided'}
                          </p>
                          {v.gstinVerification?.stateJurisdiction && (
                            <p className="text-[10px] text-slate-500">{v.gstinVerification.stateJurisdiction}</p>
                          )}
                        </div>
                      </td>

                      {/* Bank Penny-Drop Verification */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            {bankVerified ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> IMPS ₹1.00 Verified
                              </span>
                            ) : v.bankVerification?.status === 'FAILED' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> Bank Rejected
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-800 text-slate-400 border border-slate-700">
                                Unverified
                              </span>
                            )}

                            {v.bankVerification?.nameMatchScore !== undefined && (
                              <span className="text-[10px] text-slate-400 font-bold">
                                {v.bankVerification.nameMatchScore}% Match
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-white font-medium">
                            {v.bankVerification?.beneficiaryName || v.bankDetails?.accountHolder || 'No Account Provided'}
                          </p>
                          {v.bankVerification?.bankName && (
                            <p className="text-[10px] text-slate-500">
                              {v.bankVerification.bankName} ({v.bankVerification.ifscCode})
                            </p>
                          )}
                          {v.bankVerification?.utr && (
                            <p className="text-[10px] font-mono text-cyan-400">UTR: {v.bankVerification.utr}</p>
                          )}
                        </div>
                      </td>

                      {/* Compliance Status */}
                      <td className="px-6 py-4">
                        <div className="space-y-1.5">
                          {compStatus === 'AUTO_VERIFIED' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Auto-Verified
                            </span>
                          )}
                          {compStatus === 'MANUAL_VERIFIED' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Admin Approved
                            </span>
                          )}
                          {compStatus === 'ACTION_REQUIRED' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Action Required
                            </span>
                          )}
                          {compStatus === 'PENDING' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Under Review
                            </span>
                          )}
                          {compStatus === 'REJECTED' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30 inline-flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Rejected
                            </span>
                          )}
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${score}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-500 font-bold">{score}% Match</span>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openReviewModal(v, 'APPROVE')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 font-black text-[11px] uppercase tracking-wider transition-all"
                            title="1-Click Approve Compliance"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openReviewModal(v, 'REJECT')}
                            className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 font-black text-[11px] uppercase tracking-wider transition-all"
                            title="Reject Compliance"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleReverify(v._id)}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                            title="Re-run GSTIN & Bank Verification"
                          >
                            <RotateCw className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {isReviewModalOpen && selectedVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Review Vendor Compliance Dossier</h3>
                  <p className="text-xs text-slate-400">{selectedVendor.storeName}</p>
                </div>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Dossier Grid */}
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">GSTIN Registered</p>
                <p className="font-mono text-sm font-bold text-emerald-400 mt-0.5">
                  {selectedVendor.gstinVerification?.gstin || selectedVendor.businessDetails?.gstNumber || 'N/A'}
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Trade: {selectedVendor.gstinVerification?.legalName || 'N/A'}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Bank Penny-Drop</p>
                <p className="font-mono text-sm font-bold text-emerald-400 mt-0.5">
                  {selectedVendor.bankVerification?.accountNumberMasked || 'N/A'}
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Beneficiary: {selectedVendor.bankVerification?.beneficiaryName || 'N/A'}
                </p>
              </div>
            </div>

            {/* Action Form */}
            <form onSubmit={submitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Compliance Action
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'APPROVE', label: 'Approve Vendor', color: 'emerald' },
                    { id: 'REQUEST_INFO', label: 'Action Required', color: 'amber' },
                    { id: 'REJECT', label: 'Reject Vendor', color: 'rose' },
                  ].map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => setReviewAction(act.id)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                        reviewAction === act.id
                          ? act.color === 'emerald'
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                            : act.color === 'amber'
                            ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                            : 'bg-rose-600 text-white border-rose-500 shadow-md'
                          : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Administrator Review Remarks
                </label>
                <textarea
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  placeholder="Enter audit notes or reason for rejection/approval..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {actionSubmitting ? 'Submitting Review...' : 'Confirm Compliance Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
