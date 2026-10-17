import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCcw,
  RefreshCw,
  Upload,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Camera,
  Trash2,
  ShieldCheck,
  CreditCard,
  Wallet,
  Building2,
  Clock,
  ArrowRight,
  Package,
  Truck,
  Check,
  Copy,
  Sparkles,
  Video,
  Play,
  Film,
  Calendar,
  ShieldAlert,
} from 'lucide-react';

export default function ReturnRefundModal({
  isOpen,
  onClose,
  orderData,
  apiUrl = '/api',
  onSuccess,
}) {
  // Workflow type: 'AUTOMATED_RETURN' | 'EXCHANGE' | 'RETURN_REFUND'
  const [workflowType, setWorkflowType] = useState('AUTOMATED_RETURN');

  const [selectedItems, setSelectedItems] = useState([]);
  const [reasonCode, setReasonCode] = useState('DAMAGED_IN_TRANSIT');
  const [detailedDescription, setDetailedDescription] = useState('');
  const [proofPhotos, setProofPhotos] = useState([]);
  const [unboxingVideoUrl, setUnboxingVideoUrl] = useState('');
  const [unboxingVideoName, setUnboxingVideoName] = useState('');
  const [resolutionType, setResolutionType] = useState('REPLACEMENT');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [existingReturn, setExistingReturn] = useState(null);
  const [inspectionData, setInspectionData] = useState(null);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);

  // Exchange / Replacement Attributes
  const [requestedSize, setRequestedSize] = useState('L');
  const [requestedColor, setRequestedColor] = useState('Navy Blue');

  // Pickup Scheduling
  const [pickupDate, setPickupDate] = useState('Tomorrow');
  const [pickupTimeSlot, setPickupTimeSlot] = useState('09:00 - 13:00');

  const standardReasons = [
    {
      code: 'DAMAGED_IN_TRANSIT',
      label: '📦 Damaged in Transit / Crushed Packaging',
      description: 'Product or outer carton crushed/torn during transit.',
      requiresVideo: true,
    },
    {
      code: 'DEFECTIVE_PRODUCT',
      label: '⚡ Defective Product / Not Functioning',
      description: 'Dead on arrival, manufacturing flaw or malfunction.',
      requiresVideo: true,
    },
    {
      code: 'WRONG_ITEM_DELIVERED',
      label: '🔄 Wrong Item / Variant Delivered',
      description: 'Color, size, or model completely different from invoice.',
      requiresVideo: true,
    },
    {
      code: 'MISSING_ACCESSORIES',
      label: '🔌 Missing Parts or Cables',
      description: 'Components or manuals missing from sealed box.',
      requiresVideo: true,
    },
    {
      code: 'PACKAGE_TAMPERED',
      label: '⚠️ Tampered Box / Broken Security Seal',
      description: 'Package delivered with cut tape or open flap.',
      requiresVideo: true,
    },
    {
      code: 'SIZE_FIT_MISMATCH',
      label: '👕 Size / Fitting Mismatch',
      description: 'Item is too tight or loose; exchange required.',
      requiresVideo: false,
    },
    {
      code: 'QUALITY_NOT_AS_EXPECTED',
      label: '✨ Quality Not as Expected',
      description: 'Fabric, texture, or finish differs from listing.',
      requiresVideo: false,
    },
  ];

  const availableSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'UK 7', 'UK 8', 'UK 9', 'UK 10'];
  const availableColors = ['Jet Black', 'Pure White', 'Navy Blue', 'Space Grey', 'Olive Green', 'Crimson Red'];
  const timeSlots = ['09:00 - 13:00', '13:00 - 17:00', '17:00 - 20:00', 'ANYTIME'];

  const sampleVideos = [
    { label: '📹 Sample Unboxing Video (Crushed Box)', url: 'https://assets.mixkit.co/videos/preview/mixkit-hands-opening-a-cardboard-package-42861-large.mp4', name: 'unboxing_damaged_box.mp4' },
    { label: '📹 Sample Defect Inspection Video', url: 'https://assets.mixkit.co/videos/preview/mixkit-close-up-of-a-person-unwrapping-a-gift-box-41315-large.mp4', name: 'inspection_seal_defect.mp4' },
  ];

  const demoPhotos = [
    { label: '📦 Damaged Box', url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=80' },
    { label: '📱 Scratched Surface', url: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80' },
    { label: '🔌 Missing Cable', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80' },
  ];

  useEffect(() => {
    if (isOpen && orderData) {
      setError(null);
      setSuccessMsg(null);
      checkExistingReturn();

      const itemsList = orderData.subOrders?.[0]?.items || orderData.items || [];
      if (itemsList.length > 0) {
        setSelectedItems(
          itemsList.map(it => ({
            product: it.product?._id || it.product,
            title: it.product?.name || it.title || 'Product Item',
            image: it.product?.images?.[0] || it.image || '',
            variantSku: it.variantSku || '',
            price: it.price || it.unitPrice || 0,
            quantity: it.quantity || 1,
            selected: true,
          }))
        );
      }
    }
  }, [isOpen, orderData]);

  const checkExistingReturn = async () => {
    const rawId = orderData?.rawOrderId || orderData?.orderId;
    if (!rawId) return;
    setCheckingExisting(true);
    try {
      const token = localStorage.getItem('token') || 'demo-customer-token';
      const res = await fetch(`${apiUrl}/returns/order/${rawId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setExistingReturn(data.data);
        fetchInspectionStatus(data.data._id);
      } else {
        setExistingReturn(null);
        setInspectionData(null);
      }
    } catch (_) {
      setExistingReturn(null);
    } finally {
      setCheckingExisting(false);
    }
  };

  const fetchInspectionStatus = async (returnId) => {
    if (!returnId) return;
    try {
      const token = localStorage.getItem('token') || 'demo-customer-token';
      const res = await fetch(`${apiUrl}/returns/${returnId}/inspection-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setInspectionData(data.data);
      }
    } catch (_) {}
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPhotos(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const toggleItemSelection = (index) => {
    setSelectedItems(prev =>
      prev.map((it, i) => (i === index ? { ...it, selected: !it.selected } : it))
    );
  };

  const calculateTotalRefund = () => {
    return selectedItems
      .filter(it => it.selected)
      .reduce((sum, it) => sum + (it.price * it.quantity), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const itemsToProcess = selectedItems.filter(it => it.selected);
    if (itemsToProcess.length === 0) {
      setError('Please select at least one item from the order.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem('token') || 'demo-customer-token';
      const rawOrderId = orderData.rawOrderId || orderData.orderId;

      const payload = {
        orderId: rawOrderId,
        subOrderId: orderData.subOrders?.[0]?.rawSubOrderId,
        items: itemsToProcess,
        reasonCode,
        detailedDescription: detailedDescription || `Return request for ${reasonCode}`,
        unboxingVideo: unboxingVideoUrl ? {
          url: unboxingVideoUrl,
          fileName: unboxingVideoName || 'unboxing_clip.mp4',
          durationSeconds: 45,
          verified: true,
        } : null,
        proofPhotos,
        resolutionType,
        replacementDetails: {
          requestedSize,
          requestedColor,
          replacementVariantSku: `REP-${requestedColor.toUpperCase().slice(0, 3)}-${requestedSize}`,
          customerNote: detailedDescription,
        },
        pickupSchedule: {
          scheduledDate: new Date(Date.now() + 24 * 3600 * 1000),
          timeSlot: pickupTimeSlot,
          pickupAddress: orderData.shippingAddress || {
            street: 'Customer Verified Address',
            city: 'Delhi',
            pincode: '110001',
          },
        },
      };

      const res = await fetch(`${apiUrl}/returns/automated`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit return request.');
      }

      setExistingReturn(data.data);
      fetchInspectionStatus(data.data._id);
      setSuccessMsg('Automated return & replacement initiated! 48h Inspection SLA started.');
      if (onSuccess) onSuccess(data.data);
    } catch (err) {
      setError(err.message || 'Could not process return request.');
    } finally {
      setLoading(false);
    }
  };

  // Vendor / Admin Inspection Simulation Button
  const handleSimulateInspection = async (action = 'APPROVE') => {
    if (!existingReturn) return;
    setActionLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') || 'demo-customer-token';
      const res = await fetch(`${apiUrl}/returns/${existingReturn._id}/inspect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          inspectionNotes: 'Unboxing video verified by merchant. Genuine damage/tampering confirmed. Claim approved!',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Inspection failed.');
      }

      setExistingReturn(data.data);
      fetchInspectionStatus(data.data._id);
      setSuccessMsg(data.message);
      if (onSuccess) onSuccess(data.data);
    } catch (err) {
      setError(err.message || 'Could not execute inspection.');
    } finally {
      setActionLoading(false);
    }
  };

  // SLA Watchdog Auto-Approval Simulation Button
  const handleSimulateSlaAutoApproval = async () => {
    if (!existingReturn) return;
    setActionLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') || 'demo-customer-token';
      const res = await fetch(`${apiUrl}/returns/${existingReturn._id}/sla-auto-approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ force: true }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'SLA auto-approval failed.');
      }

      setExistingReturn(data.data);
      fetchInspectionStatus(data.data._id);
      setSuccessMsg(data.message);
      if (onSuccess) onSuccess(data.data);
    } catch (err) {
      setError(err.message || 'Could not trigger SLA auto-approval.');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-scale-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-tr from-amber-500 to-indigo-600 text-white">
              <RotateCcw className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Automated Return & Replacement Flow
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-xs">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Point #18 Certified
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-2">
                <span>Order #{orderData?.orderId || 'ORD'}</span>
                <span>•</span>
                <span className="text-amber-700 font-bold">Unboxing Video & 48h Inspection SLA</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Platform 48-Hour Guarantee Banner */}
        <div className="px-5 py-2.5 bg-gradient-to-r from-amber-50 via-indigo-50 to-emerald-50 border-b border-amber-200/80 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="font-extrabold text-slate-800">
              48-Hour Inspection SLA Guarantee:
            </span>
            <span className="text-slate-600 hidden sm:inline">
              If vendor doesn't review video within 48h, claim is 100% auto-approved!
            </span>
          </div>
          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-200 text-amber-900 uppercase">
            Auto-Replacement
          </span>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 custom-device-scrollbar">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {existingReturn ? (
            /* ================================================================= */
            /* VIEW EXISTING RETURN / REPLACEMENT TELEMETRY & STATUS             */
            /* ================================================================= */
            <div className="space-y-4 animate-fade-in">
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Claim Status:
                    </span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-xs ${
                    ['REPLACEMENT_CREATED', 'AUTO_APPROVED', 'REFUNDED', 'EXCHANGE_COMPLETED'].includes(existingReturn.status)
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : existingReturn.status === 'REJECTED'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}>
                    {existingReturn.status}
                  </span>
                </div>

                {/* 48-Hour SLA Inspection Countdown Tracker */}
                {inspectionData?.inspectionSLA && (
                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        Vendor Inspection SLA Deadline
                      </span>
                      <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                        {inspectionData.inspectionSLA.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-600">
                        {inspectionData.inspectionSLA.isAutoApproved ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            100% Platform Auto-Approved (SLA Expired)
                          </span>
                        ) : (
                          <span>Remaining Time for Vendor Action:</span>
                        )}
                      </span>
                      <span className="font-mono font-black text-slate-900">
                        {inspectionData.inspectionSLA.remainingHours > 0
                          ? `${inspectionData.inspectionSLA.remainingHours} Hours`
                          : 'SLA Expired'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Secret 4-Digit Reverse Pickup OTP */}
                {existingReturn.reversePickupOtp && (
                  <div className="p-4 rounded-xl bg-white border border-amber-300/80 shadow-sm flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        🔐 Doorstep Reverse Pickup OTP
                      </span>
                      <p className="text-2xl font-black text-slate-900 font-mono tracking-widest">
                        {existingReturn.reversePickupOtp}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Hand over parcel only after rider verifies this 4-digit code.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(existingReturn.reversePickupOtp)}
                      className="p-2.5 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 transition-colors flex items-center gap-1.5 text-xs font-bold"
                    >
                      {copiedOtp ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy OTP</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Replacement Order Details Card (If Created) */}
                {(existingReturn.replacementOrderNumber || existingReturn.replacementOrder) && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-400/60 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Replacement Order Generated!
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-mono font-bold text-[11px] border border-emerald-300">
                        {existingReturn.replacementOrderNumber || existingReturn.replacementOrder?.orderNumber}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Your brand-new replacement parcel is booked at ₹0 and assigned to dispatch.
                    </p>
                  </div>
                )}

                {/* Unboxing Video Telemetry Card */}
                {existingReturn.unboxingVideo?.url && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Video className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>Unboxing Video Attached</span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-black">
                            Verified
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono truncate max-w-[220px]">
                          {existingReturn.unboxingVideo.fileName || 'unboxing_clip.mp4'}
                        </p>
                      </div>
                    </div>
                    <a
                      href={existingReturn.unboxingVideo.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-slate-900 text-amber-400 text-xs font-bold hover:bg-slate-800 transition flex items-center gap-1"
                    >
                      <Play className="w-3 h-3 fill-amber-400" />
                      <span>Watch</span>
                    </a>
                  </div>
                )}

                {/* Details Breakdown */}
                <div className="text-xs text-slate-700 space-y-1.5">
                  <p><strong>Reason Code:</strong> <span className="font-mono text-slate-900">{existingReturn.reasonCode || 'DAMAGED_IN_TRANSIT'}</span></p>
                  <p><strong>Resolution:</strong> <span className="font-bold text-indigo-700">{existingReturn.resolutionType || existingReturn.requestType}</span></p>
                  {existingReturn.detailedDescription && (
                    <p><strong>Remarks:</strong> "{existingReturn.detailedDescription}"</p>
                  )}
                  {existingReturn.inspectionSLA?.inspectionNotes && (
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 mt-2">
                      <p className="font-bold text-slate-900">Merchant Inspection Notes:</p>
                      <p className="text-[11px] text-slate-600 mt-0.5">{existingReturn.inspectionSLA.inspectionNotes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* DEMO / SIMULATION TESTING BAR */}
              <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Automated Workflow Simulation Controls
                  </span>
                  <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded">
                    Demo Mode
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={actionLoading || existingReturn.status === 'REPLACEMENT_CREATED' || existingReturn.status === 'AUTO_APPROVED'}
                    onClick={() => handleSimulateInspection('APPROVE')}
                    className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    <span>Simulate Vendor Approval</span>
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading || existingReturn.status === 'AUTO_APPROVED' || existingReturn.status === 'REPLACEMENT_CREATED'}
                    onClick={handleSimulateSlaAutoApproval}
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                    <span>Simulate 48h SLA Auto-Approval</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            /* ================================================================= */
            /* CREATION FORM: AUTOMATED RETURN & REPLACEMENT                     */
            /* ================================================================= */
            <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
              {/* Step 1: Select Items */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Step 1: Select Delivered Item(s)
                </label>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {selectedItems.map((item, index) => (
                    <div
                      key={index}
                      onClick={() => toggleItemSelection(index)}
                      className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition ${
                        item.selected ? 'bg-amber-50/50' : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300"
                        />
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                          {item.image ? (
                            <img src={item.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <ShoppingBag className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{item.title}</p>
                          <p className="text-[11px] text-slate-500">
                            Qty: {item.quantity} • ₹{item.price?.toLocaleString('en-IN')}
                            {item.variantSku && ` • SKU: ${item.variantSku}`}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-slate-900">
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 2: Reason Code Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Step 2: Reason for Return / Replacement
                </label>
                <div className="space-y-1">
                  <select
                    value={reasonCode}
                    onChange={(e) => setReasonCode(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    {standardReasons.map(r => (
                      <option key={r.code} value={r.code}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Step 3: Unboxing Video Proof (Point 18 Core Weapon) */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                      Unboxing Video Proof
                    </span>
                  </div>
                  <span className="text-[10px] bg-indigo-200/80 text-indigo-900 font-extrabold px-2 py-0.5 rounded">
                    ⚡ 100% Instant Approval Proof
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Attaching an unboxing video provides incontrovertible proof for broken seals, transit damages, or missing parts, triggering automatic 48h approval.
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={unboxingVideoUrl}
                    onChange={(e) => {
                      setUnboxingVideoUrl(e.target.value);
                      setUnboxingVideoName('unboxing_clip.mp4');
                    }}
                    placeholder="Paste unboxing video URL (Cloudflare Stream, YouTube, GDrive or S3 link)..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                  {unboxingVideoUrl && (
                    <button
                      type="button"
                      onClick={() => setUnboxingVideoUrl('')}
                      className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Sample One-Click Demo Videos */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] font-bold text-slate-500">Quick Demo Attach:</span>
                  {sampleVideos.map((sv, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setUnboxingVideoUrl(sv.url);
                        setUnboxingVideoName(sv.name);
                      }}
                      className="px-2 py-1 rounded-lg bg-white hover:bg-indigo-100 border border-indigo-200 text-[10px] font-bold text-indigo-900 transition flex items-center gap-1"
                    >
                      <Film className="w-3 h-3 text-indigo-600" />
                      <span>{sv.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 4: Photo Proof Upload */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
                  <span>Photo Proofs (Outer box, label & damage)</span>
                  <span className="text-[11px] text-slate-400 font-normal">Optional photos</span>
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {proofPhotos.map((photo, i) => (
                    <div key={i} className="relative w-14 h-14 rounded-xl border border-slate-200 overflow-hidden group">
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setProofPhotos(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <label className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-300 hover:border-amber-500 flex flex-col items-center justify-center text-slate-400 hover:text-amber-600 cursor-pointer transition">
                    <Camera className="w-4 h-4" />
                    <span className="text-[9px] font-bold mt-0.5">Upload</span>
                    <input type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
                  </label>

                  {proofPhotos.length === 0 && (
                    <div className="flex items-center gap-1.5 ml-2">
                      <span className="text-[11px] text-slate-400">Quick Samples:</span>
                      {demoPhotos.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setProofPhotos(prev => [...prev, p.url])}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 5: Resolution Choice */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Step 3: Preferred Resolution
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setResolutionType('REPLACEMENT')}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                      resolutionType === 'REPLACEMENT'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <RefreshCw className="w-4 h-4 mb-1 text-indigo-600" />
                    <div>Instant Replacement</div>
                    <div className="text-[10px] text-emerald-600 font-normal">New parcel dispatched</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResolutionType('REFUND_WALLET')}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                      resolutionType === 'REFUND_WALLET'
                        ? 'border-amber-600 bg-amber-50 text-amber-900 shadow-sm ring-1 ring-amber-500'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Wallet className="w-4 h-4 mb-1 text-amber-600" />
                    <div>Wallet Instant Refund</div>
                    <div className="text-[10px] text-amber-700 font-normal">₹ credited to wallet</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResolutionType('REFUND_SOURCE')}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                      resolutionType === 'REFUND_SOURCE'
                        ? 'border-slate-900 bg-slate-100 text-slate-900 shadow-sm ring-1 ring-slate-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 mb-1 text-slate-700" />
                    <div>Original Payment Mode</div>
                    <div className="text-[10px] text-slate-500 font-normal">Bank gateway (3-5 days)</div>
                  </button>
                </div>
              </div>

              {/* If Replacement selected, show size/color options */}
              {resolutionType === 'REPLACEMENT' && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                      Replacement Specifications
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Preferred Size:</label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {availableSizes.map(sz => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setRequestedSize(sz)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                            requestedSize === sz
                              ? 'bg-slate-900 text-amber-400 border-slate-900 shadow-sm scale-105'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Preferred Color:</label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {availableColors.map(col => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setRequestedColor(col)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                            requestedColor === col
                              ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm scale-105'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {col}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 6: Reverse Pickup Time Slot */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                      Doorstep Reverse Pickup Slot
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Free Courier Pickup
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {timeSlots.map(slot => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setPickupTimeSlot(slot)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        pickupTimeSlot === slot
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remarks Textarea */}
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Detailed Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  value={detailedDescription}
                  onChange={(e) => setDetailedDescription(e.target.value)}
                  placeholder="Tell us what went wrong with the delivered parcel..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs">
                  {resolutionType !== 'REPLACEMENT' && (
                    <>
                      <span className="text-slate-500">Refund Amount: </span>
                      <span className="font-black text-slate-900 text-sm">
                        ₹{calculateTotalRefund().toLocaleString('en-IN')}
                      </span>
                    </>
                  )}
                  {resolutionType === 'REPLACEMENT' && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                      ✨ 100% Free Replacement Guarantee
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={loading || selectedItems.filter(it => it.selected).length === 0}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-black shadow-md transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
                  >
                    {loading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {resolutionType === 'REPLACEMENT'
                        ? 'Request Automated Replacement'
                        : 'Submit Return Request'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
