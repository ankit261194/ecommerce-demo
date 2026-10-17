import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Printer,
  X,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Download,
  ShieldCheck,
  User,
  Phone,
  Barcode,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Package,
} from 'lucide-react';
import api from '../api/client';

export default function VendorDispatchManifestModal({
  isOpen,
  onClose,
  selectedOrderIds = [],
  onSuccess,
}) {
  const [courierPartner, setCourierPartner] = useState('AuraMarket Express');
  const [maskPhone, setMaskPhone] = useState(false);
  const [advanceStatus, setAdvanceStatus] = useState(true);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [remarks, setRemarks] = useState('Handed over in tamper-evident sealed packaging.');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [manifestResult, setManifestResult] = useState(null);

  const courierOptions = [
    'AuraMarket Express',
    'BlueDart Express',
    'Delhivery Logistics',
    'Shadowfax Technologies',
    'DTDC Express',
    'Ekart Logistics',
  ];

  useEffect(() => {
    if (isOpen) {
      setManifestResult(null);
      setError(null);
    }
  }, [isOpen, selectedOrderIds]);

  if (!isOpen) return null;

  const validOrderIds = (selectedOrderIds || []).filter(Boolean);

  const handleGenerateManifest = async () => {
    if (validOrderIds.length === 0) {
      setError('Please select at least one order to generate a dispatch manifest.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/vendor/orders/dispatch-manifest', {
        subOrderIds: validOrderIds,
        courierPartner,
        maskPhone,
        advanceStatus,
        driverName,
        driverPhone,
        vehicleNumber,
        remarks,
      });

      if (response.data?.success && response.data?.data) {
        setManifestResult(response.data.data);
        if (onSuccess) {
          onSuccess(response.data.data);
        }
      } else {
        throw new Error(response.data?.message || 'Failed to generate dispatch manifest.');
      }
    } catch (err) {
      console.error('Error generating dispatch manifest:', err);
      setError(err.response?.data?.message || err.message || 'Error creating dispatch manifest');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintA4Manifest = () => {
    const token = localStorage.getItem('token') || '';
    const printUrl = `${api.defaults.baseURL || '/api'}/vendor/orders/dispatch-manifest?format=html&courierPartner=${encodeURIComponent(
      courierPartner
    )}&maskPhone=${maskPhone}&advanceStatus=false&subOrderIds=${validOrderIds.join(',')}&token=${token}`;

    const printWin = window.open(printUrl, '_blank', 'width=950,height=900,scrollbars=yes');
    if (!printWin) {
      window.print();
    }
  };

  const handleDownloadJSON = () => {
    if (!manifestResult) return;
    const blob = new Blob([JSON.stringify(manifestResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dispatch_manifest_${manifestResult.manifest?.manifestNumber || Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Courier Dispatch Handover Manifest</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Point #39
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {validOrderIds.length} Orders
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Official handover sheet, courier driver sign-off & status transition to Ready for Pickup
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {!manifestResult ? (
            /* Manifest Creation Form */
            <div className="space-y-5">
              {/* Top Controls Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Courier Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-blue-400" />
                    <span>Select Logistics / Courier Partner:</span>
                  </label>
                  <select
                    value={courierPartner}
                    onChange={(e) => setCourierPartner(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {courierOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Handover Settings Toggles */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">Handover Options:</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={maskPhone}
                        onChange={(e) => setMaskPhone(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-500 focus:ring-0 cursor-pointer accent-blue-500"
                      />
                      <span>Mask recipient phone numbers on manifest (Privacy Compliant)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={advanceStatus}
                        onChange={(e) => setAdvanceStatus(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-500 focus:ring-0 cursor-pointer accent-blue-500"
                      />
                      <span>Advance order lifecycle to <strong className="text-teal-400">Ready for Pickup</strong></span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Driver & Consignment Sign-off inputs */}
              <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-slate-300 uppercase tracking-wider">
                  <User className="w-4 h-4 text-amber-400" />
                  <span>Courier Pickup Representative Details (Optional)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Driver / Agent Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Driver Phone</label>
                    <input
                      type="text"
                      placeholder="e.g. 9812345678"
                      value={driverPhone}
                      onChange={(e) => setDriverPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Vehicle / Van Number</label>
                    <input
                      type="text"
                      placeholder="e.g. DL-01-AB-1234"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Handover Notes / Seal Condition</label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Order Consignment Preview Badge */}
              <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-400" />
                  <span>
                    Selected Consignments: <strong className="text-white">{validOrderIds.length} Sub-Orders</strong>
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Ready to batch compile into printable legal dispatch handover
                </span>
              </div>
            </div>
          ) : (
            /* Manifest Generated Result View */
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-emerald-300">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-sm font-black">
                      Manifest Generated Successfully: {manifestResult.manifest?.manifestNumber}
                    </p>
                    <p className="text-xs text-emerald-400/80">
                      Carrier: {manifestResult.manifest?.courierPartner} &bull; Handover Time:{' '}
                      {new Date(manifestResult.manifest?.manifestDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-black border border-emerald-500/40">
                  READY FOR PICKUP
                </span>
              </div>

              {/* Metrics Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Packages</span>
                  <p className="text-xl font-black text-white mt-0.5">{manifestResult.manifest?.totalPackages}</p>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Deadweight</span>
                  <p className="text-xl font-black text-amber-400 mt-0.5">
                    {manifestResult.manifest?.totalWeightKg} <span className="text-xs text-slate-400">KG</span>
                  </p>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">COD To Collect</span>
                  <p className="text-xl font-black text-rose-400 mt-0.5">
                    ₹{Number(manifestResult.manifest?.totalCodAmount || 0).toLocaleString('en-IN')}
                  </p>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {manifestResult.manifest?.totalCodOrders} Orders
                  </span>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Prepaid</span>
                  <p className="text-xl font-black text-emerald-400 mt-0.5">
                    {manifestResult.manifest?.totalPrepaidOrders} <span className="text-xs text-slate-400">Orders</span>
                  </p>
                </div>
              </div>

              {/* Shipments List */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
                <div className="px-4 py-2.5 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>Shipment Consignment Manifest ({manifestResult.shipments?.length || 0} items)</span>
                  <span className="text-[11px] text-slate-400">Carrier: {courierPartner}</span>
                </div>
                <div className="divide-y divide-slate-800/60 max-h-56 overflow-y-auto">
                  {(manifestResult.shipments || []).map((s, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-slate-900/60">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">{s.subOrderNumber}</span>
                          <span className="text-[10px] text-slate-400">({s.orderNumber})</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                              s.isCOD
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {s.paymentMethod}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          {s.recipient?.name} &bull; {s.recipient?.city}, {s.recipient?.state} - {s.recipient?.pincode}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-blue-400 text-[11px] font-bold">{s.awbCode}</p>
                        <p className="text-xs font-black text-white">
                          {s.isCOD ? `Collect ₹${Number(s.amountToCollect).toLocaleString('en-IN')}` : 'Prepaid (₹0)'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
          >
            {manifestResult ? 'Done & Close' : 'Cancel'}
          </button>

          {!manifestResult ? (
            <button
              type="button"
              onClick={handleGenerateManifest}
              disabled={loading || validOrderIds.length === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-black shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 hover:scale-105"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Compiling Manifest...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Compile & Advance to Pickup ({validOrderIds.length})</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadJSON}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Download JSON</span>
              </button>
              <button
                type="button"
                onClick={handlePrintA4Manifest}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 hover:scale-105"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official A4 Manifest</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
