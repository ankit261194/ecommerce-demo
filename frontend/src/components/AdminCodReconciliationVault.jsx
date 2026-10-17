import React, { useState, useEffect, useMemo } from 'react';
import {
  Coins,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Printer,
  Key,
  Building,
  ArrowRight,
  TrendingUp,
  UserCheck,
  Clock,
  DollarSign,
  X,
  FileText,
  CreditCard,
  Check,
  Lock,
  Unlock,
  Sparkles,
  Phone,
  Truck,
  Plus,
  Download,
  Scale,
  FileSpreadsheet,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import api from '../api/client';

export const AdminCodReconciliationVault = () => {
  const [vaultSummary, setVaultSummary] = useState({
    cashInVault: 0,
    cashInTransit: 0,
    totalSettledToday: 0,
    totalShortages: 0,
    totalExcess: 0,
    totalDepositedToBank: 0,
    pendingHandoversCount: 0,
    verifiedHandoversCount: 0,
    activeRidersWithCashCount: 0,
  });

  const [settlements, setSettlements] = useState([]);
  const [pendingRiders, setPendingRiders] = useState([]);
  const [ridersLimitRadar, setRidersLimitRadar] = useState({ summary: {}, riders: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals State
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [selectedSettlementForVerify, setSelectedSettlementForVerify] = useState(null);
  const [verifyOtpInput, setVerifyOtpInput] = useState('');
  const [verifyAdminRemarks, setVerifyAdminRemarks] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Bank Deposit Modal State
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [selectedSettlementForDeposit, setSelectedSettlementForDeposit] = useState(null);
  const [depositBankName, setDepositBankName] = useState('HDFC Bank - Commercial Current A/C');
  const [depositAccountNumber, setDepositAccountNumber] = useState('50200088991122');
  const [depositReference, setDepositReference] = useState('');
  const [depositNotes, setDepositNotes] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);

  // Initiate Handover Modal State
  const [isInitiateModalOpen, setIsInitiateModalOpen] = useState(false);
  const [selectedRiderForHandover, setSelectedRiderForHandover] = useState(null);
  const [handoverDenominations, setHandoverDenominations] = useState({
    d2000: 0,
    d500: 0,
    d200: 0,
    d100: 0,
    d50: 0,
    d20: 0,
    d10: 0,
    coins: 0,
  });
  const [handoverNotes, setHandoverNotes] = useState('');
  const [isInitiating, setIsInitiating] = useState(false);

  // Point 45: Rider Cash Limit & Lock State Modal
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [selectedRiderForLimit, setSelectedRiderForLimit] = useState(null);
  const [newCashLimit, setNewCashLimit] = useState(10000);
  const [isLimitLockedToggle, setIsLimitLockedToggle] = useState(false);
  const [isUpdatingLimit, setIsUpdatingLimit] = useState(false);

  // Point 45: Dispute Resolution Modal State
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [selectedSettlementForDispute, setSelectedSettlementForDispute] = useState(null);
  const [disputeResolution, setDisputeResolution] = useState('');
  const [disputeAdjustmentAmount, setDisputeAdjustmentAmount] = useState(0);
  const [disputeRecoveryMode, setDisputeRecoveryMode] = useState('SALARY_DEDUCTION');
  const [isResolvingDispute, setIsResolvingDispute] = useState(false);

  // Point 45: Hub Cashier Vault Remittance Drop Modal State
  const [isVaultDropModalOpen, setIsVaultDropModalOpen] = useState(false);
  const [selectedSettlementForVaultDrop, setSelectedSettlementForVaultDrop] = useState(null);
  const [vaultDropSealNumber, setVaultDropSealNumber] = useState('');
  const [vaultDropCashierName, setVaultDropCashierName] = useState('Chief Vault Cashier');
  const [vaultDropLocation, setVaultDropLocation] = useState('CENTRAL-VAULT-MAIN');
  const [isDroppingVault, setIsDroppingVault] = useState(false);

  // Fetch all Vault Data
  const fetchVaultData = async () => {
    setIsLoading(true);
    try {
      const [sumRes, setRes, ridRes, limRes] = await Promise.all([
        api.get('/cod-vault/summary').catch(() => ({ data: { data: {} } })),
        api.get('/cod-vault/settlements').catch(() => ({ data: { data: [] } })),
        api.get('/cod-vault/riders-pending-cash').catch(() => ({ data: { data: [] } })),
        api.get('/cod-vault/riders-limit-monitor').catch(() => ({ data: { data: { summary: {}, riders: [] } } })),
      ]);

      if (sumRes.data?.success && sumRes.data.data) {
        setVaultSummary(sumRes.data.data);
      }
      if (setRes.data?.success && Array.isArray(setRes.data.data)) {
        setSettlements(setRes.data.data);
      }
      if (ridRes.data?.success && Array.isArray(ridRes.data.data)) {
        setPendingRiders(ridRes.data.data);
      }
      if (limRes.data?.success && limRes.data.data) {
        setRidersLimitRadar(limRes.data.data);
      }
    } catch (err) {
      console.warn('COD Vault fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVaultData();
  }, []);

  const showToast = (type, text) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4000);
  };

  // Denomination Live Total Calculation
  const calculatedHandoverTotal = useMemo(() => {
    const d = handoverDenominations;
    return (
      (parseInt(d.d2000 || 0, 10) * 2000) +
      (parseInt(d.d500 || 0, 10) * 500) +
      (parseInt(d.d200 || 0, 10) * 200) +
      (parseInt(d.d100 || 0, 10) * 100) +
      (parseInt(d.d50 || 0, 10) * 50) +
      (parseInt(d.d20 || 0, 10) * 20) +
      (parseInt(d.d10 || 0, 10) * 10) +
      (parseFloat(d.coins || 0))
    );
  }, [handoverDenominations]);

  // Handle Verify OTP
  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    if (!verifyOtpInput || verifyOtpInput.trim().length !== 4) {
      showToast('error', 'Please enter a valid 4-digit Handover OTP.');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await api.post('/cod-vault/handover/verify-otp', {
        reconciliationId: selectedSettlementForVerify.reconciliationId,
        otp: verifyOtpInput.trim(),
        adminRemarks: verifyAdminRemarks,
      });

      if (res.data?.success) {
        showToast('success', res.data.message || 'Handover successfully verified & cash locked into Vault!');
        setIsVerifyModalOpen(false);
        setVerifyOtpInput('');
        setVerifyAdminRemarks('');
        fetchVaultData();
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Verification failed. Incorrect OTP.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Bank Deposit
  const handleBankDepositSubmit = async (e) => {
    e.preventDefault();
    if (!depositBankName || !depositReference) {
      showToast('error', 'Bank Name and UTR / Reference number are required.');
      return;
    }

    setIsDepositing(true);
    try {
      const res = await api.post(`/cod-vault/bank-deposit/${selectedSettlementForDeposit._id}`, {
        bankName: depositBankName,
        accountNumber: depositAccountNumber,
        transactionReference: depositReference,
        notes: depositNotes,
      });

      if (res.data?.success) {
        showToast('success', res.data.message || 'Cash marked as deposited to company bank account!');
        setIsDepositModalOpen(false);
        setDepositReference('');
        fetchVaultData();
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to record bank deposit.');
    } finally {
      setIsDepositing(false);
    }
  };

  // Handle Initiate Handover
  const handleInitiateHandoverSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRiderForHandover) return;

    setIsInitiating(true);
    try {
      const res = await api.post('/cod-vault/handover/initiate', {
        riderId: selectedRiderForHandover.riderId,
        taskIds: (selectedRiderForHandover.tasks || []).map((t) => t.taskId),
        denominations: handoverDenominations,
        notes: handoverNotes,
        hubCode: 'CENTRAL-VAULT',
      });

      if (res.data?.success) {
        showToast(
          'success',
          `Handover initiated! 4-Digit Handover OTP: ${res.data.data?.handoverOtp}`
        );
        setIsInitiateModalOpen(false);
        fetchVaultData();
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to initiate cash handover.');
    } finally {
      setIsInitiating(false);
    }
  };

  // Point 45: Handle Update Rider Cash Limit & Lock State
  const handleUpdateLimitSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRiderForLimit) return;
    setIsUpdatingLimit(true);
    try {
      const riderId = selectedRiderForLimit.riderId || selectedRiderForLimit._id;
      const res = await api.put(`/cod-vault/riders/${riderId}/cash-limit`, {
        cashInHandLimit: Number(newCashLimit),
        isCashLimitLocked: Boolean(isLimitLockedToggle),
      });
      if (res.data?.success) {
        showToast('success', res.data.message || 'Rider cash limit updated successfully!');
        setIsLimitModalOpen(false);
        fetchVaultData();
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to update rider cash limit.');
    } finally {
      setIsUpdatingLimit(false);
    }
  };

  // Point 45: Handle Dispute Resolution & Variance Adjustment
  const handleResolveDisputeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSettlementForDispute) return;
    setIsResolvingDispute(true);
    try {
      const res = await api.post(`/cod-vault/settlements/${selectedSettlementForDispute.reconciliationId}/resolve-dispute`, {
        resolution: disputeResolution,
        adjustmentAmount: Number(disputeAdjustmentAmount) || 0,
        recoveryMode: disputeRecoveryMode,
      });
      if (res.data?.success) {
        showToast('success', res.data.message || 'Dispute resolved & settlement locked into vault!');
        setIsDisputeModalOpen(false);
        setDisputeResolution('');
        fetchVaultData();
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to resolve dispute.');
    } finally {
      setIsResolvingDispute(false);
    }
  };

  // Point 45: Handle Regional Hub Cashier Vault Remittance Drop
  const handleVaultDropSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSettlementForVaultDrop) return;
    setIsDroppingVault(true);
    try {
      const res = await api.post('/cod-vault/handover/vault-drop', {
        reconciliationId: selectedSettlementForVaultDrop.reconciliationId,
        bagSealNumber: vaultDropSealNumber,
        cashierName: vaultDropCashierName,
        vaultLocation: vaultDropLocation,
      });
      if (res.data?.success) {
        showToast('success', res.data.message || 'Cash remittance batch locked into vault!');
        setIsVaultDropModalOpen(false);
        fetchVaultData();
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to record vault drop.');
    } finally {
      setIsDroppingVault(false);
    }
  };

  // Point 45: Export Settlements Audit CSV
  const handleExportCsv = () => {
    window.open('/api/cod-vault/export-csv', '_blank');
  };

  // Filtered settlements list
  const filteredSettlements = useMemo(() => {
    return settlements.filter((s) => {
      const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
      const matchesSearch =
        !searchQuery ||
        s.reconciliationId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.deliveryPartner?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.deliveryPartner?.phone?.includes(searchQuery);
      return matchesStatus && matchesSearch;
    });
  }, [settlements, statusFilter, searchQuery]);

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      {/* Toast Notification */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-black shadow-lg transition-all ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500 text-white shadow-emerald-500/20'
              : 'bg-rose-500 text-white shadow-rose-500/20'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-white" />
            ) : (
              <AlertCircle className="w-4 h-4 text-white" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-gradient from-amber-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-black uppercase tracking-wider">
              <Coins className="w-3.5 h-3.5" />
              <span>Point #45: COD Reconciliation & Remittance Vault</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Automated COD Reconciliation & Cash Remittance Vault
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              Enterprise Cash on Delivery (COD) collection audit system. Manage rider cash-in-hand limits, monitor threshold breaches, process 4-digit handover OTP verification, resolve shortage disputes, and execute cashier vault drops.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
              title="Download RFC-4180 COD Settlements Audit Ledger CSV"
            >
              <Download className="w-4 h-4" />
              <span>Export Audit CSV</span>
            </button>
            <button
              onClick={fetchVaultData}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Vault</span>
            </button>
          </div>
        </div>

        {/* Telemetry Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Physical Cash in Vault</span>
            </div>
            <div className="text-2xl font-black text-white mt-1">
              ₹{vaultSummary.cashInVault.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Verified & held at hub desk</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-3 h-3 text-amber-400" />
              <span>Cash in Transit (Riders)</span>
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              ₹{vaultSummary.cashInTransit.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {vaultSummary.activeRidersWithCashCount} active riders holding cash
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>Net Cash Shortages</span>
            </div>
            <div className="text-2xl font-black text-rose-400 mt-1">
              ₹{vaultSummary.totalShortages.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Unreconciled rider deficit</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-3 h-3 text-indigo-400" />
              <span>Deposited into Bank</span>
            </div>
            <div className="text-2xl font-black text-indigo-300 mt-1">
              ₹{vaultSummary.totalDepositedToBank.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Total credited via bank UTR</div>
          </div>
        </div>
      </div>

      {/* Point 45: Rider Cash-in-Hand (CIH) Threshold & Lockout Radar */}
      {ridersLimitRadar.riders && ridersLimitRadar.riders.length > 0 && (
        <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-4 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-white text-sm flex items-center gap-2">
                  <span>Rider Cash-in-Hand (CIH) Threshold & Lockout Radar</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    Point #45
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Enforces configurable cash holding limits per rider (default ₹10,000). Riders exceeding threshold are flagged and restricted from further COD assignments until vault remittance.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-bold">
                Total on Road:{' '}
                <span className="text-amber-400 font-mono font-black">
                  ₹{(ridersLimitRadar.summary?.totalCashOnRoad || 0).toLocaleString('en-IN')}
                </span>
              </span>
              {(ridersLimitRadar.summary?.breachedRidersCount || 0) > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-black text-xs flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  {ridersLimitRadar.summary.breachedRidersCount} Breached & Locked
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ridersLimitRadar.riders.map((r) => {
              const isBreached = r.status === 'BREACHED_LOCKED';
              const isWarning = r.status === 'WARNING';
              return (
                <div
                  key={r.riderId}
                  className={`p-4 rounded-2xl border transition-all ${
                    isBreached
                      ? 'bg-rose-950/30 border-rose-800/80'
                      : isWarning
                      ? 'bg-amber-950/20 border-amber-800/60'
                      : 'bg-slate-800/50 border-slate-700/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-black text-white text-sm">{r.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">📞 {r.phone || 'N/A'}</div>
                    </div>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        isBreached
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : isWarning
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Cash in Hand:</span>
                      <span className="font-mono font-black text-white">
                        ₹{r.currentCashInHand.toLocaleString('en-IN')}{' '}
                        <span className="text-slate-500">/ ₹{r.cashInHandLimit.toLocaleString('en-IN')}</span>
                      </span>
                    </div>

                    <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isBreached
                            ? 'bg-rose-500'
                            : isWarning
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, r.utilizationPercentage)}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                      <span>{r.unremittedTasksCount} unremitted orders</span>
                      <span className="font-bold">{r.utilizationPercentage}% of limit</span>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-700/50 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {r.isCashLimitLocked ? '🔒 Dispatch Locked' : '🟢 Eligible for COD'}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedRiderForLimit(r);
                        setNewCashLimit(r.cashInHandLimit || 10000);
                        setIsLimitLockedToggle(Boolean(r.isCashLimitLocked));
                        setIsLimitModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold transition-colors"
                    >
                      Adjust Limit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section: Active Riders Carrying COD Cash */}
      {pendingRiders.length > 0 && (
        <div className="bg-amber-50/70 rounded-3xl border border-amber-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="font-black text-slate-900 text-sm">
                  Active Delivery Riders Carrying Shift COD Cash ({pendingRiders.length})
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  Riders with delivered COD parcels whose shift cash has not yet been handed over to the Vault.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingRiders.map((rider) => (
              <div
                key={rider.riderId}
                className="p-4 rounded-2xl bg-white border border-amber-200/80 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-black text-slate-900 text-sm">{rider.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">📞 {rider.phone || 'N/A'}</div>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                    {rider.deliveredOrdersCount} COD Orders
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Cash in Bag</span>
                    <span className="text-base font-black text-amber-950 font-mono">
                      ₹{rider.totalPendingCash.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedRiderForHandover(rider);
                      // Set default denomination matching pending amount
                      const rem = rider.totalPendingCash;
                      const d500Count = Math.floor(rem / 500);
                      const rest = rem % 500;
                      const d100Count = Math.floor(rest / 100);
                      const coins = rest % 100;
                      setHandoverDenominations({
                        d2000: 0,
                        d500: d500Count,
                        d200: 0,
                        d100: d100Count,
                        d50: 0,
                        d20: 0,
                        d10: 0,
                        coins,
                      });
                      setIsInitiateModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1 shadow-sm transition-all"
                  >
                    <span>Receive Handover</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section: Master Settlements Vault Ledger */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <span>COD Settlements & Vault Audit Ledger ({filteredSettlements.length})</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Shift handovers, note denomination breakdowns, OTP verification records & bank deposit UTRs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {['ALL', 'SUBMITTED', 'VERIFIED', 'DEPOSITED_TO_BANK'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}

            <div className="relative ml-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ref or rider..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 w-48"
              />
            </div>
          </div>
        </div>

        {/* Settlements Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Settlement Ref #</th>
                <th className="py-3 px-3">Rider Details</th>
                <th className="py-3 px-3">Cash Counted</th>
                <th className="py-3 px-3">Expected & Discrepancy</th>
                <th className="py-3 px-3">Handover OTP</th>
                <th className="py-3 px-3 text-center">Lifecycle Status</th>
                <th className="py-3 px-3 text-right">Vault Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredSettlements.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400 font-bold">
                    No settlements found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredSettlements.map((s) => {
                  const isMismatch = s.discrepancy !== 0;
                  return (
                    <tr key={s._id} className="hover:bg-slate-50 transition-colors">
                      {/* Ref & Date */}
                      <td className="py-4 px-3">
                        <div className="font-mono font-black text-slate-900">{s.reconciliationId}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(s.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                        {s.notes && <div className="text-[10px] text-slate-500 italic truncate max-w-xs">{s.notes}</div>}
                      </td>

                      {/* Rider */}
                      <td className="py-4 px-3">
                        <div className="font-bold text-slate-900">{s.deliveryPartner?.name || 'Courier Partner'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">📞 {s.deliveryPartner?.phone || 'N/A'}</div>
                      </td>

                      {/* Total Counted */}
                      <td className="py-4 px-3 font-mono font-black text-sm text-slate-900">
                        ₹{s.totalCounted.toLocaleString('en-IN')}
                        <div className="text-[9px] text-slate-400 font-normal">
                          {s.denominations?.d500 ? `500×${s.denominations.d500} ` : ''}
                          {s.denominations?.d200 ? `200×${s.denominations.d200} ` : ''}
                          {s.denominations?.d100 ? `100×${s.denominations.d100} ` : ''}
                        </div>
                      </td>

                      {/* Expected & Discrepancy */}
                      <td className="py-4 px-3">
                        <div className="text-slate-600 font-mono">Expected: ₹{s.totalExpected.toLocaleString('en-IN')}</div>
                        {isMismatch ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black mt-0.5 ${
                              s.discrepancy < 0 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {s.discrepancy < 0
                              ? `⚠️ Short ₹${Math.abs(s.discrepancy).toLocaleString('en-IN')}`
                              : `⚡ Excess +₹${s.discrepancy.toLocaleString('en-IN')}`}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black mt-0.5 bg-emerald-100 text-emerald-800">
                            <Check className="w-3 h-3" /> Exact Match
                          </span>
                        )}
                      </td>

                      {/* Handover OTP */}
                      <td className="py-4 px-3 font-mono font-black text-sm text-indigo-700 tracking-wider">
                        {s.handoverOtp || '—'}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            s.status === 'DISPUTED'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : s.status === 'DEPOSITED_TO_BANK'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : s.status === 'VERIFIED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {s.status === 'DISPUTED' ? (
                            <>
                              <ShieldAlert className="w-3 h-3 text-rose-600" /> Disputed
                            </>
                          ) : s.status === 'DEPOSITED_TO_BANK' ? (
                            <>
                              <Building className="w-3 h-3" /> Bank Deposited
                            </>
                          ) : s.status === 'VERIFIED' ? (
                            <>
                              <Lock className="w-3 h-3" /> In Vault
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" /> Awaiting OTP
                            </>
                          )}
                        </span>
                        {s.cashRemittanceBatch?.batchId && (
                          <div className="text-[9px] text-amber-700 font-mono mt-0.5">
                            Batch: {s.cashRemittanceBatch.batchId}
                          </div>
                        )}
                        {s.bankDeposit?.isDeposited && (
                          <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                            Ref: {s.bankDeposit.transactionReference}
                          </div>
                        )}
                        {s.varianceStatus && s.varianceStatus !== 'NONE' && (
                          <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                            {s.varianceStatus.replace(/_/g, ' ')}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* 1. Print Official Slip */}
                          <a
                            href={`/api/cod-vault/slip/${s.reconciliationId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors inline-flex items-center"
                            title="Print 4x6 / A4 Settlement Slip"
                          >
                            <Printer className="w-4 h-4 text-slate-700" />
                          </a>

                          {/* 2. Verify OTP Action */}
                          {s.status === 'SUBMITTED' && (
                            <button
                              onClick={() => {
                                setSelectedSettlementForVerify(s);
                                setVerifyOtpInput(s.handoverOtp || '');
                                setIsVerifyModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-1 shadow-sm transition-all"
                              title="Verify Rider OTP & Accept Cash"
                            >
                              <Key className="w-3.5 h-3.5" />
                              <span>Verify OTP</span>
                            </button>
                          )}

                          {/* 3. Resolve Dispute Action */}
                          {(s.discrepancy !== 0 || s.status === 'DISPUTED') && (
                            <button
                              onClick={() => {
                                setSelectedSettlementForDispute(s);
                                setDisputeAdjustmentAmount(Math.abs(s.discrepancy));
                                setDisputeResolution(s.dispute?.resolution || `Discrepancy settlement of ₹${Math.abs(s.discrepancy)}`);
                                setDisputeRecoveryMode(s.dispute?.recoveryMode || 'SALARY_DEDUCTION');
                                setIsDisputeModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-1 shadow-sm transition-all"
                              title="Resolve Discrepancy & Dispute (Point #45)"
                            >
                              <Scale className="w-3.5 h-3.5" />
                              <span>Dispute</span>
                            </button>
                          )}

                          {/* 4. Vault Remittance Drop Action */}
                          {s.status === 'VERIFIED' && !s.cashRemittanceBatch?.batchId && (
                            <button
                              onClick={() => {
                                setSelectedSettlementForVaultDrop(s);
                                setVaultDropSealNumber(`SEAL-${Date.now().toString().slice(-6)}`);
                                setVaultDropCashierName('Chief Vault Cashier');
                                setVaultDropLocation('CENTRAL-VAULT-MAIN');
                                setIsVaultDropModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-black text-xs flex items-center gap-1 shadow-sm transition-all"
                              title="Record Hub Cashier Vault Remittance Drop (Point #45)"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              <span>Vault Drop</span>
                            </button>
                          )}

                          {/* 5. Deposit into Bank */}
                          {s.status === 'VERIFIED' && (
                            <button
                              onClick={() => {
                                setSelectedSettlementForDeposit(s);
                                setDepositReference(`UTR-${Date.now().toString().slice(-6)}`);
                                setIsDepositModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1 shadow-sm transition-all"
                              title="Deposit Cash into Bank Account"
                            >
                              <Building className="w-3.5 h-3.5" />
                              <span>Bank Deposit</span>
                            </button>
                          )}
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

      {/* MODAL 1: Verify Handover OTP */}
      {isVerifyModalOpen && selectedSettlementForVerify && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Verify Physical Cash Handover
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Confirm physical notes and enter rider's secret 4-digit code.
                </p>
              </div>
              <button
                onClick={() => setIsVerifyModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                <div className="flex justify-between text-xs font-bold text-indigo-950">
                  <span>Rider:</span>
                  <span>{selectedSettlementForVerify.deliveryPartner?.name || 'Courier Partner'}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-indigo-950">
                  <span>Cash Handed Over:</span>
                  <span className="font-mono text-base font-black text-indigo-700">
                    ₹{selectedSettlementForVerify.totalCounted.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Expected from Orders:</span>
                  <span className="font-mono">₹{selectedSettlementForVerify.totalExpected.toLocaleString('en-IN')}</span>
                </div>
                {selectedSettlementForVerify.discrepancy !== 0 && (
                  <div
                    className={`flex justify-between text-xs font-black pt-1 border-t border-indigo-200 ${
                      selectedSettlementForVerify.discrepancy < 0 ? 'text-rose-700' : 'text-amber-700'
                    }`}
                  >
                    <span>Discrepancy:</span>
                    <span>
                      {selectedSettlementForVerify.discrepancy < 0
                        ? `Shortage: -₹${Math.abs(selectedSettlementForVerify.discrepancy)}`
                        : `Excess: +₹${selectedSettlementForVerify.discrepancy}`}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                  Rider's 4-Digit Handover OTP *
                </label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  value={verifyOtpInput}
                  onChange={(e) => setVerifyOtpInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 4821"
                  className="w-full text-center tracking-widest text-2xl font-mono font-black py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-indigo-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                  Admin Verification Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  value={verifyAdminRemarks}
                  onChange={(e) => setVerifyAdminRemarks(e.target.value)}
                  placeholder="e.g. Physical notes matched, bundled into safe packet #12"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsVerifyModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-600/20"
                >
                  {isVerifying ? 'Verifying...' : 'Accept Cash into Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Record Company Bank Deposit */}
      {isDepositModalOpen && selectedSettlementForDeposit && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Record Bank Deposit
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Transfer verified vault cash into company bank account.
                </p>
              </div>
              <button
                onClick={() => setIsDepositModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBankDepositSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex justify-between items-center text-xs font-bold text-emerald-950">
                <span>Amount to Deposit:</span>
                <span className="font-mono text-base font-black text-emerald-700">
                  ₹{selectedSettlementForDeposit.totalCounted.toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                  Bank Name & Account *
                </label>
                <input
                  type="text"
                  required
                  value={depositBankName}
                  onChange={(e) => setDepositBankName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                  Bank UTR / Transaction Reference *
                </label>
                <input
                  type="text"
                  required
                  value={depositReference}
                  onChange={(e) => setDepositReference(e.target.value)}
                  placeholder="e.g. UTR-9821734912"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                  Deposit Notes / Teller Slip #
                </label>
                <input
                  type="text"
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                  placeholder="e.g. Cashier Counter #3, Koramangala Branch"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDepositing}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20"
                >
                  {isDepositing ? 'Recording...' : 'Confirm Bank Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Interactive Physical Cash Denomination Counter */}
      {isInitiateModalOpen && selectedRiderForHandover && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Rider Physical Cash Handover Counter
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Handover for {selectedRiderForHandover.name} ({selectedRiderForHandover.deliveredOrdersCount} orders)
                </p>
              </div>
              <button
                onClick={() => setIsInitiateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInitiateHandoverSubmit} className="space-y-4">
              {/* Expected vs Counted Live Comparison Strip */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Expected Cash</div>
                  <div className="text-base font-mono font-black text-white mt-0.5">
                    ₹{selectedRiderForHandover.totalPendingCash.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-amber-400 font-bold uppercase">Counted Cash</div>
                  <div className="text-base font-mono font-black text-amber-400 mt-0.5">
                    ₹{calculatedHandoverTotal.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Discrepancy</div>
                  <div
                    className={`text-base font-mono font-black mt-0.5 ${
                      calculatedHandoverTotal - selectedRiderForHandover.totalPendingCash === 0
                        ? 'text-emerald-400'
                        : calculatedHandoverTotal - selectedRiderForHandover.totalPendingCash < 0
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {calculatedHandoverTotal - selectedRiderForHandover.totalPendingCash === 0
                      ? 'Exact'
                      : `₹${(calculatedHandoverTotal - selectedRiderForHandover.totalPendingCash).toLocaleString('en-IN')}`}
                  </div>
                </div>
              </div>

              {/* Denomination Notes Grid */}
              <div className="space-y-2">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                  Currency Notes Breakdown
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { key: 'd500', label: '₹500 Notes', val: 500 },
                    { key: 'd200', label: '₹200 Notes', val: 200 },
                    { key: 'd100', label: '₹100 Notes', val: 100 },
                    { key: 'd50', label: '₹50 Notes', val: 50 },
                    { key: 'd20', label: '₹20 Notes', val: 20 },
                    { key: 'd10', label: '₹10 Notes', val: 10 },
                  ].map((note) => (
                    <div key={note.key} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="font-bold text-slate-700">{note.label}:</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          value={handoverDenominations[note.key] || 0}
                          onChange={(e) =>
                            setHandoverDenominations({
                              ...handoverDenominations,
                              [note.key]: parseInt(e.target.value || 0, 10),
                            })
                          }
                          className="w-16 px-2 py-1 rounded-lg bg-white border border-slate-300 text-xs font-mono font-bold text-right"
                        />
                        <span className="text-[10px] font-mono text-slate-400 w-16 text-right">
                          ₹{((handoverDenominations[note.key] || 0) * note.val).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs mt-2">
                  <span className="font-bold text-slate-700">Coins / Loose Change (₹):</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={handoverDenominations.coins || 0}
                    onChange={(e) =>
                      setHandoverDenominations({
                        ...handoverDenominations,
                        coins: parseFloat(e.target.value || 0),
                      })
                    }
                    className="w-24 px-2 py-1 rounded-lg bg-white border border-slate-300 text-xs font-mono font-bold text-right"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                  Handover Notes
                </label>
                <input
                  type="text"
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="e.g. Shift 1 closing collection"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInitiateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInitiating}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20"
                >
                  {isInitiating ? 'Generating...' : 'Generate 4-Digit Handover OTP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Adjust Rider Cash-in-Hand Limit & Dispatch Lock (Point #45) */}
      {isLimitModalOpen && selectedRiderForLimit && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>Rider Cash Limit & CIH Settings</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    #45
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Update threshold for {selectedRiderForLimit.name} (Phone: {selectedRiderForLimit.phone})
                </p>
              </div>
              <button
                onClick={() => setIsLimitModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateLimitSubmit} className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Current Cash in Hand:</span>
                  <span className="font-mono text-slate-950 font-black">
                    ₹{(selectedRiderForLimit.currentCashInHand || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Current Status:</span>
                  <span className="font-mono font-bold text-amber-600">
                    {selectedRiderForLimit.status || 'NORMAL'}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                  Cash-in-Hand Limit (₹) *
                </label>
                <input
                  type="number"
                  min="1000"
                  step="500"
                  required
                  value={newCashLimit}
                  onChange={(e) => setNewCashLimit(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Default: ₹10,000. Increase for trusted high-volume couriers.
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-xs font-black text-slate-900">COD Dispatch Lockout</div>
                  <div className="text-[10px] text-slate-500">Prevent assigning further COD orders</div>
                </div>
                <input
                  type="checkbox"
                  checked={isLimitLockedToggle}
                  onChange={(e) => setIsLimitLockedToggle(e.target.checked)}
                  className="w-5 h-5 accent-rose-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLimitModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingLimit}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20"
                >
                  {isUpdatingLimit ? 'Saving...' : 'Save Limit Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Resolve Cash Discrepancy & Dispute (Point #45) */}
      {isDisputeModalOpen && selectedSettlementForDispute && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>Resolve Discrepancy & Dispute</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                    #45
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Audit resolution for settlement {selectedSettlementForDispute.reconciliationId}
                </p>
              </div>
              <button
                onClick={() => setIsDisputeModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResolveDisputeSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200 space-y-2 text-xs">
                <div className="flex justify-between font-bold text-slate-700">
                  <span>Rider:</span>
                  <span className="text-slate-950 font-black">
                    {selectedSettlementForDispute.deliveryPartner?.name || 'Courier Partner'}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-slate-700">
                  <span>Discrepancy:</span>
                  <span className="font-mono font-black text-rose-700">
                    {selectedSettlementForDispute.discrepancy < 0
                      ? `Shortage: -₹${Math.abs(selectedSettlementForDispute.discrepancy).toLocaleString('en-IN')}`
                      : `Excess: +₹${selectedSettlementForDispute.discrepancy.toLocaleString('en-IN')}`}
                  </span>
                </div>
                {selectedSettlementForDispute.dispute?.reason && (
                  <div className="pt-1 border-t border-rose-200/60 text-slate-600 italic">
                    Reason: "{selectedSettlementForDispute.dispute.reason}"
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                  Resolution Remarks *
                </label>
                <textarea
                  rows={2}
                  required
                  value={disputeResolution}
                  onChange={(e) => setDisputeResolution(e.target.value)}
                  placeholder="e.g. Shortage recovered via next shift salary deduction"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                  Adjustment Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={disputeAdjustmentAmount}
                  onChange={(e) => setDisputeAdjustmentAmount(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                  Variance Recovery Mode *
                </label>
                <select
                  value={disputeRecoveryMode}
                  onChange={(e) => setDisputeRecoveryMode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                >
                  <option value="SALARY_DEDUCTION">Salary / Payout Deduction</option>
                  <option value="RIDER_ONLINE_PAY">Rider Direct UPI / Online Payment</option>
                  <option value="WAIVED_OFF">Waived Off (Management Discretion)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDisputeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResolvingDispute}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md shadow-rose-600/20"
                >
                  {isResolvingDispute ? 'Resolving...' : 'Complete Dispute Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Regional Hub Cashier Vault Remittance Drop (Point #45) */}
      {isVaultDropModalOpen && selectedSettlementForVaultDrop && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>Hub Cashier Vault Remittance Drop</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    #45
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Package verified physical currency into secured cashier safe bag.
                </p>
              </div>
              <button
                onClick={() => setIsVaultDropModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleVaultDropSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 flex justify-between items-center text-xs font-bold text-amber-950">
                <span>Total Cash to Lock:</span>
                <span className="font-mono text-base font-black text-amber-800">
                  ₹{selectedSettlementForVaultDrop.totalCounted.toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                  Cashier Safe Bag Seal Number *
                </label>
                <input
                  type="text"
                  required
                  value={vaultDropSealNumber}
                  onChange={(e) => setVaultDropSealNumber(e.target.value)}
                  placeholder="e.g. SEAL-892144"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                  Vault Cashier Name *
                </label>
                <input
                  type="text"
                  required
                  value={vaultDropCashierName}
                  onChange={(e) => setVaultDropCashierName(e.target.value)}
                  placeholder="e.g. Chief Vault Cashier"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                  Vault / Hub Location *
                </label>
                <input
                  type="text"
                  required
                  value={vaultDropLocation}
                  onChange={(e) => setVaultDropLocation(e.target.value)}
                  placeholder="e.g. CENTRAL-VAULT-MAIN"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsVaultDropModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDroppingVault}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20"
                >
                  {isDroppingVault ? 'Dropping...' : 'Confirm Remittance Drop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCodReconciliationVault;
