import React, { useState, useRef, useEffect } from 'react';
import {
  PenTool,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck,
  Printer,
  User,
  ShieldCheck,
  Clock,
  MapPin,
  Package,
} from 'lucide-react';
import api from '../api/client';

/**
 * Point #67: Digital Customer Signature Pad on screen
 * HTML5 canvas touch/mouse signature pad, multi-color & stroke thickness controls,
 * signer relationship attribution, base64 capture, and printable Proof of Delivery (POD) slip.
 */
export const CourierSignatureModal = ({ task, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState(task.customerSignature ? 'pod' : 'pad');
  const [signerName, setSignerName] = useState(
    task.signatureDetails?.signerName ||
    task.customer?.name ||
    task.dropLocation?.recipientName ||
    ''
  );
  const [signerRelation, setSignerRelation] = useState(
    task.signatureDetails?.signerRelation || 'Self'
  );
  const [penColor, setPenColor] = useState('#0f172a'); // Midnight Slate
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(Boolean(task.customerSignature));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [acknowledged, setAcknowledged] = useState(true);

  const canvasRef = useRef(null);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Initialize canvas
  useEffect(() => {
    if (activeTab !== 'pad') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    // Set high-DPI resolution
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineWidth = strokeWidth;

    // Fill white background so canvas exports cleanly to PNG
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // If existing signature exists and we are in pad, load it onto canvas
    if (task.customerSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = task.customerSignature;
    }
  }, [activeTab]);

  // Update stroke styles when controls change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = penColor;
    ctx.lineWidth = strokeWidth;
  }, [penColor, strokeWidth]);

  // Coordinate normalizer for touch and mouse
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    lastPosRef.current = coords;
    setIsDrawing(true);
    setHasDrawn(true);
    setErrorMessage('');

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const coords = getCoordinates(e);

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    lastPosRef.current = coords;
  };

  const stopDrawing = (e) => {
    if (isDrawing) {
      if (e) e.preventDefault();
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.closePath();
      }
    }
  };

  const handleClearPad = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
    setErrorMessage('');
  };

  const handleSaveSignature = async () => {
    if (!hasDrawn) {
      setErrorMessage('Please ask the customer to sign inside the signature box.');
      return;
    }
    if (!signerName.trim()) {
      setErrorMessage('Please enter the name of the person signing.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const base64Signature = canvas.toDataURL('image/png');

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const taskId = task.rawId || task._id || task.id;
      const res = await api.post(`/delivery/tasks/${taskId}/signature`, {
        signature: base64Signature,
        signerName: signerName.trim(),
        signerRelation,
      });

      if (res.data.success) {
        if (onSuccess) {
          onSuccess(taskId, base64Signature, signerName.trim(), signerRelation);
        }
        setActiveTab('pod');
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to save customer signature');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintPod = () => {
    window.print();
  };

  const signatureImageUrl = task.customerSignature || (hasDrawn && canvasRef.current ? canvasRef.current.toDataURL('image/png') : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
              <PenTool className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                Digital Customer Signature
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Point #67
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Order #{task.subOrderId || task.id} • {task.customer?.name || task.dropLocation?.recipientName}
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

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('pad')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'pad'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Signature Pad</span>
          </button>
          <button
            onClick={() => setActiveTab('pod')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'pod'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Proof of Delivery (POD) Slip</span>
            {task.customerSignature && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
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

          {activeTab === 'pad' ? (
            <div className="space-y-4">
              {/* Signer Details Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Signer Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="Receiver's full name"
                      className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Relation to Customer
                  </label>
                  <select
                    value={signerRelation}
                    onChange={(e) => setSignerRelation(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="Self">Self (Customer)</option>
                    <option value="Family Member">Family Member</option>
                    <option value="Neighbor">Neighbor</option>
                    <option value="Security Guard">Security Guard / Reception</option>
                    <option value="Colleague">Office Colleague</option>
                    <option value="Other">Other Representative</option>
                  </select>
                </div>
              </div>

              {/* Drawing Controls (Color & Width) */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Ink:</span>
                  {[
                    { label: 'Slate', value: '#0f172a', bg: 'bg-slate-900' },
                    { label: 'Blue', value: '#2563eb', bg: 'bg-blue-600' },
                    { label: 'Green', value: '#059669', bg: 'bg-emerald-600' },
                  ].map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setPenColor(color.value)}
                      className={`w-6 h-6 rounded-full ${color.bg} transition-all flex items-center justify-center ${
                        penColor === color.value ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110' : 'opacity-80'
                      }`}
                      title={color.label}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Stroke:</span>
                  {[
                    { label: 'Fine', width: 2 },
                    { label: 'Normal', width: 3 },
                    { label: 'Bold', width: 5 },
                  ].map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => setStrokeWidth(s.width)}
                      className={`px-2 py-0.5 text-[11px] font-bold rounded-lg transition-all ${
                        strokeWidth === s.width
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleClearPad}
                  className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 border border-slate-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>

              {/* Canvas Pad */}
              <div className="relative border-2 border-dashed border-indigo-200 rounded-2xl bg-white overflow-hidden shadow-inner touch-none">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-44 cursor-crosshair block"
                  style={{ touchAction: 'none' }}
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-300">
                    <PenTool className="w-8 h-8 mb-1 stroke-1" />
                    <span className="text-xs font-medium">Customer signs here with finger or stylus</span>
                  </div>
                )}
                <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-1 pointer-events-none">
                  <span>Sign on the line above</span>
                  <span>AuraMarket Verifiable Touchpad</span>
                </div>
              </div>

              {/* Acknowledgment */}
              <label className="flex items-start gap-2 text-xs font-medium text-slate-600 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 mt-0.5"
                />
                <span>Customer confirms that package was handed over in sealed, intact physical condition.</span>
              </label>

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
                  onClick={handleSaveSignature}
                  disabled={!hasDrawn || !signerName.trim() || !acknowledged || isSubmitting}
                  className={`px-5 py-2 text-xs font-black rounded-xl text-white shadow-md flex items-center gap-1.5 transition-all ${
                    !hasDrawn || !signerName.trim() || !acknowledged || isSubmitting
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : 'Save & Attach Signature'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Verifiable Proof of Delivery (POD) Slip View */
            <div className="space-y-4">
              <div id="printable-pod-slip" className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 print:border-none print:p-0">
                {/* POD Slip Header */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-indigo-600" />
                      <span className="font-black text-sm text-slate-900 tracking-tight">AURAMARKET PROOF OF DELIVERY</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">Digital Verification & Signature Receipt</p>
                  </div>
                  <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>VERIFIED POD</span>
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase block">Sub-Order ID:</span>
                    <span className="font-mono font-bold text-slate-800">{task.subOrderId || task.id}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase block">Signer Relation:</span>
                    <span className="font-bold text-slate-800">{signerRelation}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase block">Recipient Name:</span>
                    <span className="font-bold text-slate-800">{signerName || task.customer?.name || task.dropLocation?.recipientName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase block">Contact Phone:</span>
                    <span className="font-bold text-slate-800">{task.customer?.phone || task.dropLocation?.phone}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase block">Delivery Address:</span>
                    <span className="font-semibold text-slate-700">
                      {task.customer?.address || task.dropLocation?.address}, {task.customer?.city || task.dropLocation?.city} {task.customer?.pincode || task.dropLocation?.pincode}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center gap-2 text-[11px] text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Timestamp: {task.signatureDetails?.signedAt ? new Date(task.signatureDetails.signedAt).toLocaleString('en-IN') : new Date().toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Signature Display Box */}
                <div className="border border-slate-300 rounded-xl p-3 bg-white space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-bold text-slate-700">Signer: {signerName}</span>
                    <span className="text-[10px] font-mono text-slate-400">Digitally Captured</span>
                  </div>
                  {signatureImageUrl ? (
                    <div className="w-full h-32 flex items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-200 overflow-hidden">
                      <img
                        src={signatureImageUrl}
                        alt="Customer Signature"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-24 flex items-center justify-center text-slate-400 text-xs italic">
                      No signature recorded yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons in POD View */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTab('pad')}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl"
                >
                  Edit / Re-Sign
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrintPod}
                    className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    <span>Print POD Slip</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourierSignatureModal;
