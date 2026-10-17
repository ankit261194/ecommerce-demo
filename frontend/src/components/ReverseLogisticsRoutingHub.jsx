import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Truck,
  ShieldCheck,
  DollarSign,
  Package,
  Layers,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Video,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  Save,
  Check,
  Building,
  Navigation,
  FileText,
  BadgeAlert,
  ArrowRight,
  Info,
} from 'lucide-react';
import api from '../api/client';

/**
 * Point 47: Reverse Logistics Routing & SPF Claims Command Center
 * Super Admin operations hub providing:
 * 1. RTO Radar & KPI Metrics (Gmv recovered, restock rate, hub allocation)
 * 2. Multi-Hop Reverse Transit Tracking Timeline & Milestone Dispatcher
 * 3. Seller Protection Fund (SPF) Claims Inbox with Video Player & Compensation Payouts
 * 4. Dynamic Routing Policy & Threshold Settings
 */
export default function ReverseLogisticsRoutingHub({ isOpen, onClose }) {
  if (isOpen === false) return null;

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'radar' | 'spf-claims' | 'routing-policy'
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Dashboard Data
  const [dashboardData, setDashboardData] = useState(null);
  const [spfClaims, setSpfClaims] = useState([]);
  const [routingConfig, setRoutingConfig] = useState({
    centralHubThresholdAmount: 5000,
    defaultCarrierPartner: 'AuraMarket Express Reverse',
    autoRestockGradeA: true,
    maxReverseTransitDays: 4,
    centralHubName: 'AuraMarket Central QC & Grading Hub',
    centralHubAddress: {
      recipient: 'Central Returns Intake',
      street: 'Sector 62, Industrial Area',
      city: 'Noida',
      state: 'Uttar Pradesh',
      pincode: '201301',
    },
  });

  // Modal / Action states
  const [selectedClaimForReview, setSelectedClaimForReview] = useState(null);
  const [reviewDecision, setReviewDecision] = useState('APPROVED');
  const [reviewCompensation, setReviewCompensation] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const [selectedReturnForMilestone, setSelectedReturnForMilestone] = useState(null);
  const [newMilestoneStatus, setNewMilestoneStatus] = useState('IN_REVERSE_TRANSIT');
  const [newMilestoneLocation, setNewMilestoneLocation] = useState('Delhi Sorting Hub');
  const [newMilestoneNotes, setNewMilestoneNotes] = useState('');
  const [isSubmittingMilestone, setIsSubmittingMilestone] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [claimStatusFilter, setClaimStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchDashboardData();
    fetchSpfClaims();
    fetchRoutingConfig();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await api.get('/admin/returns/reverse-logistics/dashboard');
      if (res.data?.success) {
        setDashboardData(res.data);
      }
    } catch (err) {
      // Fallback try returnRoutes path
      try {
        const fallbackRes = await api.get('/returns/reverse-logistics/dashboard');
        if (fallbackRes.data?.success) {
          setDashboardData(fallbackRes.data);
        }
      } catch (e) {
        setErrorMessage('Failed to load reverse logistics dashboard telemetry.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSpfClaims = async () => {
    try {
      const res = await api.get('/admin/returns/spf-claims');
      if (res.data?.success) {
        setSpfClaims(res.data.data || []);
      }
    } catch (err) {
      try {
        const fallbackRes = await api.get('/returns/spf-claims');
        if (fallbackRes.data?.success) {
          setSpfClaims(fallbackRes.data.data || []);
        }
      } catch (e) {}
    }
  };

  const fetchRoutingConfig = async () => {
    try {
      const res = await api.get('/admin/returns/routing-config');
      if (res.data?.success && res.data.data) {
        setRoutingConfig(res.data.data);
      }
    } catch (err) {
      try {
        const fallbackRes = await api.get('/returns/routing-config');
        if (fallbackRes.data?.success && fallbackRes.data.data) {
          setRoutingConfig(fallbackRes.data.data);
        }
      } catch (e) {}
    }
  };

  const handleSaveRoutingConfig = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);
    try {
      const res = await api.put('/admin/returns/routing-config', routingConfig);
      if (res.data?.success) {
        setSuccessMessage('Routing policy and grading threshold updated successfully!');
        setRoutingConfig(res.data.data);
      }
    } catch (err) {
      try {
        const fallbackRes = await api.put('/returns/routing-config', routingConfig);
        if (fallbackRes.data?.success) {
          setSuccessMessage('Routing policy updated successfully!');
          setRoutingConfig(fallbackRes.data.data);
        }
      } catch (e) {
        setErrorMessage(err.response?.data?.message || 'Failed to update routing configuration.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewClaimSubmit = async () => {
    if (!selectedClaimForReview) return;
    setIsSubmittingReview(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const claimId = selectedClaimForReview._id || selectedClaimForReview.id;
      const res = await api.post(`/admin/returns/spf-claims/${claimId}/review`, {
        decision: reviewDecision,
        compensationAmount: Number(reviewCompensation) || selectedClaimForReview.reverseRouting?.spfClaim?.claimAmount || 0,
        reviewNotes,
      });

      if (res.data?.success) {
        setSuccessMessage(
          reviewDecision === 'APPROVED'
            ? `SPF Claim approved! ₹${reviewCompensation || selectedClaimForReview.reverseRouting?.spfClaim?.claimAmount} credited to merchant wallet.`
            : 'SPF Claim has been rejected.'
        );
        setSelectedClaimForReview(null);
        fetchSpfClaims();
        fetchDashboardData();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Error reviewing SPF claim.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleRecordMilestoneSubmit = async () => {
    if (!selectedReturnForMilestone) return;
    setIsSubmittingMilestone(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const returnId = selectedReturnForMilestone._id || selectedReturnForMilestone.id;
      const res = await api.patch(`/returns/${returnId}/reverse-routing/milestone`, {
        milestoneStatus: newMilestoneStatus,
        location: newMilestoneLocation,
        notes: newMilestoneNotes,
      });

      if (res.data?.success) {
        setSuccessMessage(`Milestone recorded: ${newMilestoneStatus}`);
        setSelectedReturnForMilestone(null);
        fetchDashboardData();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to record milestone.');
    } finally {
      setIsSubmittingMilestone(false);
    }
  };

  const kpis = dashboardData?.kpis || {
    totalReturns: 0,
    inTransitRtos: 0,
    totalRestockedCount: 0,
    totalRestockedGmv: 0,
    pendingSpfClaims: 0,
    approvedSpfAmount: 0,
  };

  const destinationBreakdown = dashboardData?.destinationBreakdown || {
    RETURN_TO_VENDOR: 0,
    CENTRAL_GRADING_HUB: 0,
    LOCAL_DARK_STORE: 0,
    SCRAP_LIQUIDATION: 0,
  };

  const conditionGradeBreakdown = dashboardData?.conditionGradeBreakdown || {
    GRADE_A_RESALEABLE: 0,
    GRADE_B_REFURB: 0,
    GRADE_C_DAMAGED: 0,
    DEFECTIVE_SCRAP: 0,
  };

  const recentReturns = dashboardData?.recentReturns || [];
  const filteredClaims = spfClaims.filter((c) => {
    if (claimStatusFilter !== 'ALL') {
      return c.reverseRouting?.spfClaim?.claimStatus === claimStatusFilter;
    }
    return true;
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
      {/* Hub Top Bar */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-teal-950 text-white relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Point 47 Verified
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white/90">
                Pillar 4 Reverse Logistics
              </span>
            </div>
            <h1 className="text-2xl font-black flex items-center gap-2 text-white">
              <RotateCcw className="w-7 h-7 text-teal-400" />
              Reverse Logistics Routing & SPF Claims Command Center
            </h1>
            <p className="text-xs text-teal-100/80 mt-1 max-w-2xl">
              Automate return item destination routing (Vendor vs Central QC Hub), trace multi-hop reverse transit milestones, and settle Seller Protection Fund (SPF) claims.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                fetchDashboardData();
                fetchSpfClaims();
              }}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-2 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Radar
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold"
              >
                Close Hub
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-white/10">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/30'
                : 'bg-white/5 hover:bg-white/10 text-white/80'
            }`}
          >
            <Layers className="w-4 h-4" />
            RTO Radar & KPIs
          </button>
          <button
            onClick={() => setActiveTab('radar')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'radar'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/30'
                : 'bg-white/5 hover:bg-white/10 text-white/80'
            }`}
          >
            <Truck className="w-4 h-4" />
            Live Reverse Transit Radar
          </button>
          <button
            onClick={() => setActiveTab('spf-claims')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'spf-claims'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/30'
                : 'bg-white/5 hover:bg-white/10 text-white/80'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            SPF Claims Inbox ({kpis.pendingSpfClaims} Pending)
          </button>
          <button
            onClick={() => setActiveTab('routing-policy')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'routing-policy'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/30'
                : 'bg-white/5 hover:bg-white/10 text-white/80'
            }`}
          >
            <Building className="w-4 h-4" />
            Routing Policy & Hub Rules
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="p-6 pb-0">
        {errorMessage && (
          <div className="p-4 mb-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-3 text-rose-800 dark:text-rose-300 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="p-4 mb-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {/* Tab 1: Overview & KPIs */}
      {activeTab === 'overview' && (
        <div className="p-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                <span>Total RTO Returns</span>
                <RotateCcw className="w-4 h-4 text-teal-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{kpis.totalReturns}</p>
              <p className="text-[11px] text-teal-600 font-semibold mt-1">Lifecycle Tracking Active</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                <span>In-Transit Reverse Fleet</span>
                <Truck className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-2">{kpis.inTransitRtos}</p>
              <p className="text-[11px] text-slate-400 mt-1">Multi-hop transit active</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                <span>Restocked GMV Recovered</span>
                <Package className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                ₹{kpis.totalRestockedGmv.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">{kpis.totalRestockedCount} units auto-restocked</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                <span>SPF Compensation Paid</span>
                <DollarSign className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
                ₹{kpis.approvedSpfAmount.toLocaleString()}
              </p>
              <p className="text-[11px] text-rose-500 font-semibold mt-1">{kpis.pendingSpfClaims} claims awaiting review</p>
            </div>
          </div>

          {/* Breakdown Grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Destination Breakdown */}
            <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-teal-600" />
                Reverse Destination Routing Distribution
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    <span>Return to Vendor (Below Threshold)</span>
                    <span>{destinationBreakdown.RETURN_TO_VENDOR}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-teal-500 h-2 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (destinationBreakdown.RETURN_TO_VENDOR / Math.max(1, kpis.totalReturns)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    <span>Central QC & Grading Hub (High Value ≥ ₹{routingConfig.centralHubThresholdAmount})</span>
                    <span>{destinationBreakdown.CENTRAL_GRADING_HUB}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-indigo-500 h-2 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (destinationBreakdown.CENTRAL_GRADING_HUB / Math.max(1, kpis.totalReturns)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    <span>Local Dark Store (Quick Turnaround)</span>
                    <span>{destinationBreakdown.LOCAL_DARK_STORE}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-amber-500 h-2 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (destinationBreakdown.LOCAL_DARK_STORE / Math.max(1, kpis.totalReturns)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    <span>Scrap & Salvage Liquidation</span>
                    <span>{destinationBreakdown.SCRAP_LIQUIDATION}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-rose-500 h-2 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (destinationBreakdown.SCRAP_LIQUIDATION / Math.max(1, kpis.totalReturns)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Condition Grade Breakdown */}
            <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Inbound Condition Grading Distribution
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-emerald-600 uppercase">Grade A Resaleable</span>
                  <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {conditionGradeBreakdown.GRADE_A_RESALEABLE}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">1-Click Auto-Restocked</p>
                </div>

                <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-indigo-600 uppercase">Grade B Refurb</span>
                  <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {conditionGradeBreakdown.GRADE_B_REFURB}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Minor Box Wear</p>
                </div>

                <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-rose-600 uppercase">Grade C Damaged</span>
                  <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {conditionGradeBreakdown.GRADE_C_DAMAGED}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">SPF Claims Filed</p>
                </div>

                <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Defective Scrap</span>
                  <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {conditionGradeBreakdown.DEFECTIVE_SCRAP}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Liquidation / Salvage</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Returns Stream */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Active Reverse Transit Operations ({recentReturns.length})
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold text-[11px] border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">Waybill / Return ID</th>
                    <th className="p-3">Customer & Order</th>
                    <th className="p-3">Vendor</th>
                    <th className="p-3">Routing Destination</th>
                    <th className="p-3">Current Status</th>
                    <th className="p-3">Condition Grade</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {recentReturns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        No active reverse returns in transit.
                      </td>
                    </tr>
                  ) : (
                    recentReturns.map((ret) => (
                      <tr key={ret._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-mono">
                          <p className="font-bold text-teal-600 dark:text-teal-400">
                            {ret.reverseRouting?.reverseWaybill || ret.doorstepInspection?.reverseWaybill || 'Awaiting Waybill'}
                          </p>
                          <p className="text-[10px] text-slate-400">#{ret._id.slice(-6)}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-bold">{ret.customer?.name || 'Customer'}</p>
                          <p className="text-[11px] text-slate-400">Refund: ₹{ret.refundAmount || 0}</p>
                        </td>
                        <td className="p-3 font-medium">{ret.vendor?.storeName || 'Merchant'}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ret.reverseRouting?.destinationType === 'CENTRAL_GRADING_HUB'
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                                : 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                            }`}
                          >
                            {ret.reverseRouting?.destinationType || 'RETURN_TO_VENDOR'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {ret.reverseRouting?.routingStatus || ret.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-[11px]">
                            {ret.reverseRouting?.conditionGrade || 'UNGRADED'}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => {
                              setSelectedReturnForMilestone(ret);
                              setNewMilestoneStatus('IN_REVERSE_TRANSIT');
                              setNewMilestoneLocation(ret.reverseRouting?.currentLocation || 'Sorting Hub');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold hover:bg-indigo-100 text-[11px]"
                          >
                            Milestone
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Live Multi-Hop Reverse Transit Radar */}
      {activeTab === 'radar' && (
        <div className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Multi-Hop Reverse Transit Milestones
              </h3>
              <p className="text-xs text-slate-500">
                Track each return parcel hop from Customer Doorstep → Local Hub → Reverse Carrier → Central Hub / Vendor Shelf.
              </p>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search waybill, customer, or hub..."
                className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          <div className="space-y-4">
            {recentReturns.map((ret) => (
              <div
                key={ret._id}
                className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-mono font-black text-sm text-teal-600 dark:text-teal-400">
                        {ret.reverseRouting?.reverseWaybill || 'RTO-TRANSIT'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Item: {ret.items?.[0]?.title || 'Order Item'} | Dest: {ret.reverseRouting?.destinationHubName || 'Vendor Warehouse'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
                      {ret.reverseRouting?.routingStatus || ret.status}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedReturnForMilestone(ret);
                        setNewMilestoneStatus('IN_REVERSE_TRANSIT');
                        setNewMilestoneLocation(ret.reverseRouting?.currentLocation || 'Transit Facility');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold"
                    >
                      Record Milestone
                    </button>
                  </div>
                </div>

                {/* Milestone Step Timeline */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Reverse Transit Milestones Dossier
                  </p>
                  <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-teal-500/30">
                    {(ret.reverseRouting?.milestones || []).length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No milestones logged yet.</p>
                    ) : (
                      ret.reverseRouting.milestones.map((ms, idx) => (
                        <div key={idx} className="relative text-xs">
                          <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-teal-500 ring-4 ring-white dark:ring-slate-900" />
                          <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                            <span>{ms.status}</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              {new Date(ms.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-teal-600 font-semibold">{ms.location}</p>
                          {ms.notes && <p className="text-[11px] text-slate-500 mt-0.5">{ms.notes}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: SPF Claims Inbox */}
      {activeTab === 'spf-claims' && (
        <div className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Seller Protection Fund (SPF) Claims Review Desk
              </h3>
              <p className="text-xs text-slate-500">
                Merchants raise SPF claims when customer returns items in damaged, tampered, or missing conditions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Filter:</span>
              {['ALL', 'PENDING_REVIEW', 'APPROVED_COMPENSATED', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setClaimStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    claimStatusFilter === st
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredClaims.length === 0 ? (
              <div className="col-span-2 p-8 text-center text-slate-400 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="font-bold text-xs">No Seller Protection Fund claims matching filter.</p>
              </div>
            ) : (
              filteredClaims.map((claim) => {
                const spf = claim.reverseRouting?.spfClaim || {};
                const isPending = spf.claimStatus === 'PENDING_REVIEW';

                return (
                  <div
                    key={claim._id}
                    className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isPending
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : spf.claimStatus === 'APPROVED_COMPENSATED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {spf.claimStatus}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">#{claim._id.slice(-6)}</span>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                          Claimed: ₹{spf.claimAmount?.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {claim.vendor?.storeName || 'Merchant Store'}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">Item: {claim.items?.[0]?.title || 'Product'}</p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 italic">
                        "{spf.claimReason}"
                      </p>
                    </div>

                    {/* Proof Media Preview */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                        <span>Submitted Proofs</span>
                        {spf.unboxingVideoUrl && (
                          <a
                            href={spf.unboxingVideoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
                          >
                            <Video className="w-3.5 h-3.5" /> Watch Video Proof
                          </a>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {(spf.proofPhotos || []).map((photoUrl, i) => (
                          <img
                            key={i}
                            src={photoUrl}
                            alt={`Claim proof ${i + 1}`}
                            className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                          />
                        ))}
                      </div>
                    </div>

                    {isPending ? (
                      <button
                        onClick={() => {
                          setSelectedClaimForReview(claim);
                          setReviewCompensation(spf.claimAmount || 0);
                          setReviewDecision('APPROVED');
                          setReviewNotes('');
                        }}
                        className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black shadow-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4 text-teal-400" />
                        <span>Review & Adjudicate Claim</span>
                      </button>
                    ) : (
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                        <p className="text-[11px] text-slate-400">
                          Reviewed: {new Date(spf.reviewedAt).toLocaleDateString()}
                        </p>
                        {spf.compensationAmount > 0 && (
                          <p className="font-bold text-emerald-600 mt-0.5">
                            Compensated: ₹{spf.compensationAmount.toLocaleString()} to Vendor Wallet
                          </p>
                        )}
                        {spf.reviewNotes && <p className="text-slate-500 mt-1 italic">"{spf.reviewNotes}"</p>}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Routing Policy & Threshold Settings */}
      {activeTab === 'routing-policy' && (
        <form onSubmit={handleSaveRoutingConfig} className="p-6 space-y-6 max-w-3xl">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Reverse Logistics Routing Thresholds & Policies
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure automatic routing between direct vendor return and the centralized AuraMarket grading facility.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Central QC & Grading Hub Threshold Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                value={routingConfig.centralHubThresholdAmount}
                onChange={(e) =>
                  setRoutingConfig({
                    ...routingConfig,
                    centralHubThresholdAmount: Number(e.target.value),
                  })
                }
                className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
              <p className="text-[11px] text-slate-500">
                Items with refund value $\ge$ this amount are automatically routed to the Central QC Hub for tamper verification.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Default Reverse Logistics Carrier Partner
              </label>
              <select
                value={routingConfig.defaultCarrierPartner}
                onChange={(e) =>
                  setRoutingConfig({
                    ...routingConfig,
                    defaultCarrierPartner: e.target.value,
                  })
                }
                className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="AuraMarket Express Reverse">AuraMarket Express Reverse</option>
                <option value="Delhivery Reverse Logistics">Delhivery Reverse Logistics</option>
                <option value="Shiprocket Return Hub">Shiprocket Return Hub</option>
                <option value="BlueDart Surface Reverse">BlueDart Surface Reverse</option>
              </select>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Central QC Hub Name
              </label>
              <input
                type="text"
                value={routingConfig.centralHubName}
                onChange={(e) =>
                  setRoutingConfig({
                    ...routingConfig,
                    centralHubName: e.target.value,
                  })
                }
                className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <input
                type="checkbox"
                id="autoRestock"
                checked={routingConfig.autoRestockGradeA}
                onChange={(e) =>
                  setRoutingConfig({
                    ...routingConfig,
                    autoRestockGradeA: e.target.checked,
                  })
                }
                className="w-4 h-4 text-teal-600 rounded"
              />
              <label htmlFor="autoRestock" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Automatically increment product inventory count on Grade A Resaleable verification
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black shadow-md flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Reverse Logistics Policy</span>
            </button>
          </div>
        </form>
      )}

      {/* SPF Claim Review Action Modal */}
      {selectedClaimForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-600" />
              Adjudicate Seller Protection Fund (SPF) Claim
            </h3>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1">
              <p>
                <strong>Merchant:</strong> {selectedClaimForReview.vendor?.storeName}
              </p>
              <p>
                <strong>Claimed Amount:</strong> ₹{selectedClaimForReview.reverseRouting?.spfClaim?.claimAmount}
              </p>
              <p>
                <strong>Merchant Reason:</strong> {selectedClaimForReview.reverseRouting?.spfClaim?.claimReason}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Adjudication Decision
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewDecision('APPROVED')}
                    className={`flex-1 py-2 rounded-xl text-xs font-black ${
                      reviewDecision === 'APPROVED'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Approve with Payout
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDecision('REJECTED')}
                    className={`flex-1 py-2 rounded-xl text-xs font-black ${
                      reviewDecision === 'REJECTED'
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Reject Claim
                  </button>
                </div>
              </div>

              {reviewDecision === 'APPROVED' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Settlement Compensation Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={reviewCompensation}
                    onChange={(e) => setReviewCompensation(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Admin Verification Notes
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="e.g. Unboxing video verifies customer physical damage prior to return transit."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedClaimForReview(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReviewClaimSubmit}
                disabled={isSubmittingReview}
                className="px-5 py-2 rounded-xl text-xs font-black bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
              >
                {isSubmittingReview ? 'Disbursing...' : 'Confirm Settlement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Milestone Action Modal */}
      {selectedReturnForMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-indigo-600" />
              Record Reverse Transit Milestone
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Milestone Status
                </label>
                <select
                  value={newMilestoneStatus}
                  onChange={(e) => setNewMilestoneStatus(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="PICKED_UP_FROM_CUSTOMER">PICKED UP FROM CUSTOMER</option>
                  <option value="INWARDED_LOCAL_HUB">INWARDED AT LOCAL HUB</option>
                  <option value="IN_REVERSE_TRANSIT">IN REVERSE TRANSIT (LINE-HAUL)</option>
                  <option value="OUT_FOR_VENDOR_DELIVERY">OUT FOR VENDOR / HUB DELIVERY</option>
                  <option value="RECEIVED_AT_VENDOR_WAREHOUSE">RECEIVED AT DESTINATION WAREHOUSE</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Facility Location
                </label>
                <input
                  type="text"
                  value={newMilestoneLocation}
                  onChange={(e) => setNewMilestoneLocation(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Transit Notes
                </label>
                <textarea
                  value={newMilestoneNotes}
                  onChange={(e) => setNewMilestoneNotes(e.target.value)}
                  placeholder="e.g. Scanned at regional sorting facility gate 4."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedReturnForMilestone(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordMilestoneSubmit}
                disabled={isSubmittingMilestone}
                className="px-5 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                {isSubmittingMilestone ? 'Recording...' : 'Update Milestone'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
