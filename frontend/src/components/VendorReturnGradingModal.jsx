import React, { useState, useRef } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Package,
  ShieldAlert,
  ShieldCheck,
  Video,
  Camera,
  Upload,
  Trash2,
  Boxes,
  ArrowRight,
  Info,
  DollarSign,
  Barcode,
} from 'lucide-react';
import api from '../api/client';

/**
 * Point 47: Vendor Inbound Return Grading & Inventory Restock Modal
 * Vendor Portal modal enabling merchants to:
 * 1. Inspect and grade inbound returned parcels (Grade A, B, C, Scrap)
 * 2. 1-Click Auto-Restock Grade A Resaleable items to live inventory count
 * 3. File Seller Protection Fund (SPF) Claims with unboxing video and photo proofs
 */
export default function VendorReturnGradingModal({
  returnRequest,
  isOpen,
  onClose,
  onSuccess,
}) {
  if (!isOpen || !returnRequest) return null;

  const [inboundReturns, setInboundReturns] = useState([]);
  const [activeReturn, setActiveReturn] = useState(returnRequest);
  const [isLoadingReturns, setIsLoadingReturns] = useState(false);

  useEffect(() => {
    setActiveReturn(returnRequest);
  }, [returnRequest]);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingReturns(true);
      api.get('/vendor/returns')
        .then((res) => {
          if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
            setInboundReturns(res.data.data);
            const isDemo = !returnRequest?._id || !/^[0-9a-fA-F]{24}$/.test(String(returnRequest._id));
            if (isDemo && res.data.data[0]) {
              setActiveReturn(res.data.data[0]);
            }
          }
        })
        .catch((err) => {
          console.warn('Could not load vendor returns list:', err);
        })
        .finally(() => {
          setIsLoadingReturns(false);
        });
    }
  }, [isOpen, returnRequest]);

  const currentReturn = activeReturn || returnRequest;
  const returnId = currentReturn._id || currentReturn.id;
  const item = currentReturn.items?.[0] || {};
  const productTitle = item.product?.title || item.title || 'Returned Item';
  const productImage = item.product?.image || item.image || '';
  const itemSku = item.product?.sku || item.variantSku || 'SKU-RET';
  const itemQty = item.quantity || 1;
  const itemPrice = item.price || currentReturn.refundAmount || 0;
  const reverseWaybill =
    currentReturn.reverseRouting?.reverseWaybill ||
    currentReturn.doorstepInspection?.reverseWaybill ||
    'RTO-INBOUND';

  const existingSpf = currentReturn.reverseRouting?.spfClaim;

  const [conditionGrade, setConditionGrade] = useState(
    returnRequest.reverseRouting?.conditionGrade !== 'UNGRADED' && returnRequest.reverseRouting?.conditionGrade
      ? returnRequest.reverseRouting.conditionGrade
      : 'GRADE_A_RESALEABLE'
  );
  const [restockQuantity, setRestockQuantity] = useState(itemQty);
  const [notes, setNotes] = useState('');

  // SPF Claim State
  const [claimAmount, setClaimAmount] = useState(returnRequest.refundAmount || itemPrice * itemQty);
  const [claimReason, setClaimReason] = useState('');
  const [unboxingVideoUrl, setUnboxingVideoUrl] = useState('');
  const [proofPhotos, setProofPhotos] = useState([]);
  const fileInputRef = useRef(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setProofPhotos((prev) => [...prev, uploadEvent.target.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (index) => {
    setProofPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitGrading = async () => {
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      if (!/^[0-9a-fA-F]{24}$/.test(String(returnId))) {
        setErrorMessage('Demonstration return parcel preview. To submit live database inventory restock or file an official SPF claim, an active store return order must be selected.');
        setIsSubmitting(false);
        return;
      }

      let restockAction = 'RESTOCK';
      let spfClaimData = {};

      if (conditionGrade === 'GRADE_C_DAMAGED') {
        restockAction = 'RAISE_SPF_CLAIM';
        if (!claimReason.trim()) {
          setErrorMessage('Please state the specific reason for raising an SPF Claim.');
          setIsSubmitting(false);
          return;
        }
        spfClaimData = {
          claimAmount: Number(claimAmount) || itemPrice,
          claimReason: claimReason.trim(),
          unboxingVideoUrl: unboxingVideoUrl.trim(),
          proofPhotos,
        };
      } else if (conditionGrade === 'DEFECTIVE_SCRAP') {
        restockAction = 'SCRAP';
      }

      // Try vendorRoutes path first, fallback to returnRoutes path
      let res;
      try {
        res = await api.post(`/vendor/returns/${returnId}/grade-and-restock`, {
          conditionGrade,
          restockAction,
          restockQuantity: Number(restockQuantity),
          spfClaimData,
          notes,
        });
      } catch (e1) {
        res = await api.post(`/returns/${returnId}/grade-and-restock`, {
          conditionGrade,
          restockAction,
          restockQuantity: Number(restockQuantity),
          spfClaimData,
          notes,
        });
      }

      if (res.data?.success) {
        setSuccessResult({
          conditionGrade,
          restockAction,
          message: res.data.message,
          data: res.data.data,
        });
        if (onSuccess) {
          onSuccess(res.data.data);
        }
      } else {
        setErrorMessage(res.data?.message || 'Failed to submit inbound grading.');
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Error recording inbound return grading.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 p-6 text-white relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Point 47 Verified
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/10 text-white/90">
                Merchant Inbound Inspection
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
            <Boxes className="w-6 h-6 text-emerald-400" />
            Inbound Return Grading & Inventory Restock
          </h2>
          <p className="text-xs text-emerald-100/80 mt-1">
            Verify condition of returned merchandise, auto-increment warehouse stock, or escalate an SPF claim.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-3 text-rose-800 dark:text-rose-300 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success View */}
          {successResult ? (
            <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-500/30 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  Grading Finalized
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                  {successResult.conditionGrade === 'GRADE_A_RESALEABLE'
                    ? 'Inventory Auto-Restocked!'
                    : successResult.conditionGrade === 'GRADE_C_DAMAGED'
                    ? 'SPF Claim Raised & Queued!'
                    : 'Item Graded Successfully'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-1">
                  {successResult.message}
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold"
                >
                  Done & Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Parcel Selector if multiple returns exist */}
              {inboundReturns.length > 1 && (
                <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="text-xs font-bold text-teal-900 dark:text-teal-200">
                      Inbound Return Parcels ({inboundReturns.length}):
                    </span>
                  </div>
                  <select
                    value={returnId}
                    onChange={(e) => {
                      const found = inboundReturns.find((r) => (r._id || r.id) === e.target.value);
                      if (found) setActiveReturn(found);
                    }}
                    className="bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 rounded-xl text-xs py-1.5 px-3 font-bold text-slate-800 dark:text-slate-100"
                  >
                    {inboundReturns.map((r) => (
                      <option key={r._id || r.id} value={r._id || r.id}>
                        {r.order?.orderNumber || 'ORD'} ? {r.reverseRouting?.reverseWaybill || 'Waybill'} ({r.items?.[0]?.title?.slice(0, 25) || 'Return Item'}...)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Return Item Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                {productImage ? (
                  <img
                    src={productImage}
                    alt={productTitle}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0">
                    <Package className="w-8 h-8" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                      Waybill: {reverseWaybill}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">SKU: {itemSku}</span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white mt-1 truncate">
                    {productTitle}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Qty: {itemQty} | Customer Return Reason: {returnRequest.reason || 'Not Specified'}
                  </p>
                </div>
              </div>

              {/* Existing SPF Banner if already active */}
              {existingSpf?.isClaimRaised && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Active SPF Claim: {existingSpf.claimStatus}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    Claim Amount: ₹{existingSpf.claimAmount} | Compensation: ₹{existingSpf.compensationAmount || 0}
                  </p>
                </div>
              )}

              {/* Condition Grade Cards */}
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 block">
                  Select Inbound Quality Condition Grade
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Grade A */}
                  <div
                    onClick={() => setConditionGrade('GRADE_A_RESALEABLE')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      conditionGrade === 'GRADE_A_RESALEABLE'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-md shadow-emerald-500/10'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase">
                        Grade A: Resaleable
                      </span>
                      <CheckCircle2
                        className={`w-4 h-4 ${
                          conditionGrade === 'GRADE_A_RESALEABLE' ? 'text-emerald-600' : 'text-slate-300'
                        }`}
                      />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Flawless packaging and tags. Ready for 1-click live inventory auto-restock.
                    </p>
                  </div>

                  {/* Grade B */}
                  <div
                    onClick={() => setConditionGrade('GRADE_B_REFURB')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      conditionGrade === 'GRADE_B_REFURB'
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-md shadow-indigo-500/10'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase">
                        Grade B: Open-Box Refurb
                      </span>
                      <CheckCircle2
                        className={`w-4 h-4 ${
                          conditionGrade === 'GRADE_B_REFURB' ? 'text-indigo-600' : 'text-slate-300'
                        }`}
                      />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Opened box or minor cosmetic wear. Retain for warehouse refurbishment.
                    </p>
                  </div>

                  {/* Grade C */}
                  <div
                    onClick={() => setConditionGrade('GRADE_C_DAMAGED')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      conditionGrade === 'GRADE_C_DAMAGED'
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 shadow-md shadow-rose-500/10'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-rose-700 dark:text-rose-400 uppercase">
                        Grade C: Damaged / Tampered
                      </span>
                      <CheckCircle2
                        className={`w-4 h-4 ${
                          conditionGrade === 'GRADE_C_DAMAGED' ? 'text-rose-600' : 'text-slate-300'
                        }`}
                      />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Customer damage or wrong item. Elevate to Seller Protection Fund (SPF) Claim.
                    </p>
                  </div>

                  {/* Scrap */}
                  <div
                    onClick={() => setConditionGrade('DEFECTIVE_SCRAP')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      conditionGrade === 'DEFECTIVE_SCRAP'
                        ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 shadow-md shadow-amber-500/10'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase">
                        Defective Scrap
                      </span>
                      <CheckCircle2
                        className={`w-4 h-4 ${
                          conditionGrade === 'DEFECTIVE_SCRAP' ? 'text-amber-600' : 'text-slate-300'
                        }`}
                      />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Non-recoverable scrap item. Mark for merchant salvage liquidation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Dynamic Action Section: Grade A Auto-Restock */}
              {conditionGrade === 'GRADE_A_RESALEABLE' && (
                <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      1-Click Live Inventory Auto-Restock
                    </span>
                    <span className="text-xs font-bold text-emerald-600">
                      Product: +{restockQuantity} Units
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Grading as Grade A will immediately increment this product's <code className="font-mono text-emerald-700 bg-emerald-100 dark:bg-emerald-900/60 px-1 rounded">countInStock</code> in the AuraMarket marketplace catalog.
                  </p>

                  <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Units to Restock:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={itemQty * 5}
                      value={restockQuantity}
                      onChange={(e) => setRestockQuantity(e.target.value)}
                      className="w-20 text-center font-bold text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* Dynamic Action Section: Grade C SPF Claim Filing */}
              {conditionGrade === 'GRADE_C_DAMAGED' && (
                <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 space-y-4">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-600" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-rose-800 dark:text-rose-300">
                        Raise Seller Protection Fund (SPF) Claim
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Platform will reimburse your merchant wallet upon review of damage evidence.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Claim Compensation Amount (₹)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={claimAmount}
                        onChange={(e) => setClaimAmount(e.target.value)}
                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Detailed Damage / Tampering Description *
                      </label>
                      <textarea
                        value={claimReason}
                        onChange={(e) => setClaimReason(e.target.value)}
                        placeholder="e.g. Received torn box, missing charging cable, and customer-scratched housing."
                        rows={2}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Unboxing Video Link (CCTV or Cloud URL)
                      </label>
                      <input
                        type="url"
                        value={unboxingVideoUrl}
                        onChange={(e) => setUnboxingVideoUrl(e.target.value)}
                        placeholder="https://drive.google.com/... or https://video.cdn/..."
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>

                    {/* Photo Proofs */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Damage Photo Proofs ({proofPhotos.length})
                        </label>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1"
                        >
                          <Upload className="w-3.5 h-3.5" /> Upload Photos
                        </button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          multiple
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {proofPhotos.map((url, i) => (
                          <div
                            key={i}
                            className="relative group w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700"
                          >
                            <img src={url} alt={`Damage proof ${i + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(i)}
                              className="absolute top-0.5 right-0.5 p-1 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Grading Button */}
              <button
                type="button"
                onClick={handleSubmitGrading}
                disabled={isSubmitting}
                className={`w-full py-3.5 px-4 rounded-2xl text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all ${
                  conditionGrade === 'GRADE_C_DAMAGED'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                }`}
              >
                {isSubmitting ? (
                  <span>Recording Inbound Grading...</span>
                ) : conditionGrade === 'GRADE_A_RESALEABLE' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Grade A & Restock to Inventory</span>
                  </>
                ) : conditionGrade === 'GRADE_C_DAMAGED' ? (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    <span>Submit Seller Protection Fund (SPF) Claim</span>
                  </>
                ) : (
                  <>
                    <Boxes className="w-4 h-4" />
                    <span>Confirm Quality Grade ({conditionGrade})</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
