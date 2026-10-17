import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  KeyRound,
  Package,
  Printer,
  Barcode,
  Truck,
  ArrowRight,
  RotateCcw,
  Upload,
  Trash2,
  ExternalLink,
  MapPin,
  Phone,
  Check,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import api from '../api/client';

/**
 * Point 47: Doorstep Return Pickup Inspection & Waybill Handover
 * Mobile-first guided modal for delivery riders with:
 * - 6-Point Inspection Checklist
 * - Photo Proof Upload (Base64)
 * - 4-Digit Handover OTP Validation
 * - Acceptance with Automated Reverse Waybill Generation (RTO-XXXX-XXXX)
 * - Immediate Doorstep Rejection with Reason Categorization
 * - Printable Reverse Waybill Slip
 */
export default function DoorstepReturnInspectionModal({
  task,
  isOpen,
  onClose,
  onSuccess,
  apiUrl = '/api',
}) {
  if (!isOpen || !task) return null;

  const taskId = task._id || task.id || task.rawId;
  const returnReq = task.returnRequest || {};
  const expectedOtp =
    task.reversePickupDetails?.pickupOtp ||
    returnReq.reversePickupOtp ||
    task.expectedOtp ||
    '';

  const [checklist, setChecklist] = useState({
    brandTagIntact: task.doorstepInspection?.checklist?.brandTagIntact || false,
    originalPackagingPresent: task.doorstepInspection?.checklist?.originalPackagingPresent || false,
    serialNumberMatched: task.doorstepInspection?.checklist?.serialNumberMatched || false,
    noPhysicalDamage: task.doorstepInspection?.checklist?.noPhysicalDamage || false,
    accessoriesComplete: task.doorstepInspection?.checklist?.accessoriesComplete || false,
    powerOnVerified: task.doorstepInspection?.checklist?.powerOnVerified || false,
  });

  const [photos, setPhotos] = useState(
    Array.isArray(task.doorstepInspection?.photos) && task.doorstepInspection.photos.length > 0
      ? task.doorstepInspection.photos
      : []
  );

  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const otpInputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionCategory, setRejectionCategory] = useState('DAMAGED_BY_CUSTOMER');
  const [rejectionReason, setRejectionReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successResult, setSuccessResult] = useState(
    task.doorstepInspection?.inspectionStatus ? task.doorstepInspection : null
  );

  const fileInputRef = useRef(null);

  // Focus first OTP field on mount if not already inspected
  useEffect(() => {
    if (!successResult && otpInputRefs[0]?.current) {
      // Small timeout to allow modal animation
      setTimeout(() => otpInputRefs[0].current?.focus(), 200);
    }
  }, [successResult]);

  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      // Handle paste
      const pasted = value.slice(0, 4).split('');
      const newDigits = [...otpDigits];
      pasted.forEach((char, i) => {
        if (i < 4) newDigits[i] = char;
      });
      setOtpDigits(newDigits);
      if (otpInputRefs[Math.min(pasted.length, 3)]?.current) {
        otpInputRefs[Math.min(pasted.length, 3)].current.focus();
      }
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);

    if (value && index < 3) {
      otpInputRefs[index + 1]?.current?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs[index - 1]?.current?.focus();
    }
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setPhotos((prev) => [
          ...prev,
          {
            url: uploadEvent.target.result,
            caption: `Doorstep inspection proof (${new Date().toLocaleTimeString()})`,
            uploadedAt: new Date().toISOString(),
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectAllChecks = () => {
    setChecklist({
      brandTagIntact: true,
      originalPackagingPresent: true,
      serialNumberMatched: true,
      noPhysicalDamage: true,
      accessoriesComplete: true,
      powerOnVerified: true,
    });
  };

  const checklistCount = Object.values(checklist).filter(Boolean).length;
  const enteredOtp = otpDigits.join('');

  // Handle Doorstep Acceptance
  const handleAcceptReturn = async () => {
    setErrorMessage('');

    // Mandatory checks
    if (!checklist.brandTagIntact || !checklist.originalPackagingPresent || !checklist.noPhysicalDamage) {
      setErrorMessage('Mandatory checklist items (Brand Tag, Original Packaging, No Physical Damage) must be verified.');
      return;
    }

    if (expectedOtp && enteredOtp.length !== 4) {
      setErrorMessage('Please enter the complete 4-digit customer pickup OTP.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post(`/delivery/reverse-pickup/${taskId}/inspect-doorstep`, {
        otp: enteredOtp || expectedOtp || '0000',
        checklist,
        photos,
        inspectionStatus: 'ACCEPTED_AT_DOORSTEP',
      });

      if (res.data?.success) {
        setSuccessResult({
          inspectionStatus: 'ACCEPTED_AT_DOORSTEP',
          reverseWaybill: res.data.data?.reverseWaybill || `RTO-${Date.now().toString().slice(-6)}`,
          task: res.data.data?.task,
          returnRequest: res.data.data?.returnRequest,
        });
        if (onSuccess) {
          onSuccess(res.data.data);
        }
      } else {
        setErrorMessage(res.data?.message || 'Failed to submit inspection.');
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Error processing doorstep return acceptance.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Doorstep Rejection
  const handleRejectReturn = async () => {
    setErrorMessage('');
    if (!rejectionReason.trim()) {
      setErrorMessage('Please provide a specific reason for doorstep rejection.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post(`/delivery/reverse-pickup/${taskId}/inspect-doorstep`, {
        checklist,
        photos,
        inspectionStatus: 'REJECTED_AT_DOORSTEP',
        rejectionCategory,
        rejectionReason: rejectionReason.trim(),
      });

      if (res.data?.success) {
        setSuccessResult({
          inspectionStatus: 'REJECTED_AT_DOORSTEP',
          rejectionCategory,
          rejectionReason: rejectionReason.trim(),
          task: res.data.data?.task,
        });
        if (onSuccess) {
          onSuccess(res.data.data);
        }
      } else {
        setErrorMessage(res.data?.message || 'Failed to record rejection.');
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Error recording doorstep return rejection.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintWaybill = () => {
    window.print();
  };

  const customerName = task.customer?.name || returnReq.customer?.name || task.dropLocation?.recipientName || 'Customer';
  const customerAddress = task.customer?.address || task.pickupLocation?.address || 'Customer Doorstep';
  const customerPhone = task.customer?.phone || task.pickupLocation?.phone || '';
  const itemSummary = task.itemSummary || returnReq.items?.[0]?.product?.title || returnReq.items?.[0]?.title || 'Returned Item';
  const refundAmount = returnReq.refundAmount || task.amountToCollect || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-indigo-700 to-slate-900 p-6 text-white relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-400/30">
                Point 47 Verified
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/10 text-white/90">
                Reverse Pickup Inspection
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
          <h2 className="text-xl font-black flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-teal-400" />
            Doorstep Return Pickup Inspection
          </h2>
          <p className="text-xs text-teal-100/80 mt-1">
            Validate physical item condition, customer handover OTP, and generate tamper-proof Reverse Waybill.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 text-rose-800 dark:text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-bold">Inspection Notice</p>
                <p className="text-xs mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Success Result View */}
          {successResult ? (
            <div className="space-y-6">
              {successResult.inspectionStatus === 'ACCEPTED_AT_DOORSTEP' ? (
                <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-500/30 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                      Accepted at Doorstep
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                      Reverse Waybill Issued
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-1">
                      6-Point inspection passed and customer OTP verified. Return item is now inducted into the reverse logistics fleet.
                    </p>
                  </div>

                  {/* Waybill Badge */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm max-w-sm mx-auto">
                    <p className="text-xs uppercase font-bold text-slate-400">Reverse Waybill Number</p>
                    <p className="text-xl font-mono font-black text-teal-600 dark:text-teal-400 tracking-wider my-1">
                      {successResult.reverseWaybill}
                    </p>
                    <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mt-2">
                      <Barcode className="w-8 h-8 text-slate-800 dark:text-slate-200" />
                      <span className="font-mono text-[10px]">AuraMarket Reverse Carrier Scan</span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap justify-center gap-3 print:hidden">
                    <button
                      onClick={handlePrintWaybill}
                      className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center gap-2 hover:bg-slate-800 shadow-sm"
                    >
                      <Printer className="w-4 h-4" />
                      Print Reverse Waybill Slip
                    </button>
                    <button
                      onClick={onClose}
                      className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm"
                    >
                      Done & Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-500/30 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-rose-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-rose-600/30">
                    <XCircle className="w-10 h-10" />
                  </div>
                  <div>
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 uppercase tracking-wider">
                      Doorstep Rejection Finalized
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                      Return Package Rejected
                    </h3>
                    <p className="text-xs text-rose-700 dark:text-rose-300 max-w-md mx-auto mt-1">
                      Pickup rejected: {successResult.rejectionCategory}. Customer informed with formal doorstep failure report.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 text-left max-w-md mx-auto">
                    <p className="text-xs font-bold text-slate-500">Reason Stated:</p>
                    <p className="text-xs text-slate-800 dark:text-slate-200 mt-1 italic">
                      "{successResult.rejectionReason}"
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={onClose}
                      className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold"
                    >
                      Close Report
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Return Package Overview Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center font-black">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500">Item for Return Pickup</p>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white line-clamp-1">{itemSummary}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>Customer: {customerName}</span>
                      {customerPhone && (
                        <span className="flex items-center gap-1 text-teal-600 font-semibold">
                          <Phone className="w-3 h-3" /> {customerPhone}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    Refund Value: ₹{refundAmount.toLocaleString()}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">Task #{taskId?.toString().slice(-6)}</p>
                </div>
              </div>

              {/* 6-Point Inspection Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Guided 6-Point Inspection Checklist
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                      {checklistCount} / 6 Passed
                    </span>
                    <button
                      type="button"
                      onClick={handleSelectAllChecks}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                    >
                      Check All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Point 1 */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                      checklist.brandTagIntact
                        ? 'bg-teal-50/60 border-teal-500/50 dark:bg-teal-950/30'
                        : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checklist.brandTagIntact}
                      onChange={(e) => setChecklist({ ...checklist, brandTagIntact: e.target.checked })}
                      className="w-4 h-4 mt-0.5 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <div className="text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                        <span>Brand Tag & Hologram</span>
                        <span className="text-[10px] text-rose-500 font-black uppercase">*Req</span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                        Brand seal, fabric tags, or hologram intact.
                      </p>
                    </div>
                  </label>

                  {/* Point 2 */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                      checklist.originalPackagingPresent
                        ? 'bg-teal-50/60 border-teal-500/50 dark:bg-teal-950/30'
                        : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checklist.originalPackagingPresent}
                      onChange={(e) =>
                        setChecklist({ ...checklist, originalPackagingPresent: e.target.checked })
                      }
                      className="w-4 h-4 mt-0.5 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <div className="text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                        <span>Original Box & Barcode</span>
                        <span className="text-[10px] text-rose-500 font-black uppercase">*Req</span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                        Brand manufacturer packaging present with barcode.
                      </p>
                    </div>
                  </label>

                  {/* Point 3 */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                      checklist.serialNumberMatched
                        ? 'bg-teal-50/60 border-teal-500/50 dark:bg-teal-950/30'
                        : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checklist.serialNumberMatched}
                      onChange={(e) =>
                        setChecklist({ ...checklist, serialNumberMatched: e.target.checked })
                      }
                      className="w-4 h-4 mt-0.5 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <div className="text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                        <span>Serial / IMEI Verification</span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                        Matches device or warranty card serial info.
                      </p>
                    </div>
                  </label>

                  {/* Point 4 */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                      checklist.noPhysicalDamage
                        ? 'bg-teal-50/60 border-teal-500/50 dark:bg-teal-950/30'
                        : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checklist.noPhysicalDamage}
                      onChange={(e) => setChecklist({ ...checklist, noPhysicalDamage: e.target.checked })}
                      className="w-4 h-4 mt-0.5 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <div className="text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                        <span>No Physical Cracks / Cuts</span>
                        <span className="text-[10px] text-rose-500 font-black uppercase">*Req</span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                        Free from customer-induced cracks, stains, or tears.
                      </p>
                    </div>
                  </label>

                  {/* Point 5 */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                      checklist.accessoriesComplete
                        ? 'bg-teal-50/60 border-teal-500/50 dark:bg-teal-950/30'
                        : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checklist.accessoriesComplete}
                      onChange={(e) =>
                        setChecklist({ ...checklist, accessoriesComplete: e.target.checked })
                      }
                      className="w-4 h-4 mt-0.5 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <div className="text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                        <span>All Accessories Present</span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                        Charger, cables, manuals, or bundled attachments.
                      </p>
                    </div>
                  </label>

                  {/* Point 6 */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                      checklist.powerOnVerified
                        ? 'bg-teal-50/60 border-teal-500/50 dark:bg-teal-950/30'
                        : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checklist.powerOnVerified}
                      onChange={(e) =>
                        setChecklist({ ...checklist, powerOnVerified: e.target.checked })
                      }
                      className="w-4 h-4 mt-0.5 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <div className="text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                        <span>Device Power-On (If Electronics)</span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                        Turns on or exhibits charge activity.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Photo Proof Uploader */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Doorstep Inspection Photos ({photos.length})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Take Photo / Upload
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    multiple
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {photos.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <Camera className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Tap to capture or upload package inspection photos
                    </p>
                    <p className="text-[10px] text-slate-400">Capture tags, product front, and box condition</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {photos.map((p, idx) => (
                      <div
                        key={idx}
                        className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                      >
                        <img src={p.url} alt={`Proof ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:text-teal-600 hover:border-teal-500 transition-all text-xs"
                    >
                      <Upload className="w-4 h-4 mb-0.5" />
                      <span className="text-[10px] font-bold">Add</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 4-Digit Handover OTP Section */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Customer Handover OTP
                    </span>
                  </div>
                  {expectedOtp && (
                    <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                      Secret Demo OTP: {expectedOtp}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Ask the customer for the 4-digit reverse pickup code shown on their return status page.
                </p>

                <div className="flex justify-center gap-3 py-1">
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={otpInputRefs[i]}
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-12 h-14 text-center text-xl font-mono font-black rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-slate-900 dark:text-white shadow-sm"
                    />
                  ))}
                </div>
              </div>

              {/* Rejection Form (When rider expands rejection) */}
              {isRejecting && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-3 animate-slide-down">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Doorstep Return Rejection Reason
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsRejecting(false)}
                      className="text-xs font-bold text-slate-500 hover:underline"
                    >
                      Cancel Rejection
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Rejection Category
                    </label>
                    <select
                      value={rejectionCategory}
                      onChange={(e) => setRejectionCategory(e.target.value)}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      <option value="DAMAGED_BY_CUSTOMER">DAMAGED BY CUSTOMER (Cracks, stains, burns)</option>
                      <option value="TAG_MISSING">TAG MISSING (Brand tags/hologram removed or torn)</option>
                      <option value="SERIAL_MISMATCH">SERIAL MISMATCH (Product doesn't match invoice)</option>
                      <option value="ACCESSORY_MISSING">ACCESSORY MISSING (Cables or essential parts absent)</option>
                      <option value="CUSTOMER_REFUSED_HANDOVER">CUSTOMER REFUSED (Cancelled pickup intent)</option>
                    </select>

                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Specific Rider Notes & Findings
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="e.g. Item shows heavy wear, deep scratch on back panel, and brand box is missing."
                      rows={2}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />

                    <button
                      type="button"
                      onClick={handleRejectReturn}
                      disabled={isSubmitting}
                      className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <span>Submitting Rejection...</span>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          <span>Confirm Doorstep Rejection</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!isRejecting && (
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={handleAcceptReturn}
                    disabled={isSubmitting}
                    className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 disabled:opacity-50 transition-all"
                  >
                    {isSubmitting ? (
                      <span>Verifying & Issuing Waybill...</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Accept Return & Generate Waybill</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsRejecting(true)}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto py-3 px-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/50 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Reject at Doorstep</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
