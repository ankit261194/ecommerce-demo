import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  X,
  CheckCircle2,
  Download,
  QrCode,
  Truck,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Layers,
  Settings2,
  Copy,
  ExternalLink,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import api from '../api/client';

export default function BulkThermalLabelPrinterModal({
  isOpen,
  onClose,
  selectedOrderIds = [],
  role = 'vendor',
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [labelsData, setLabelsData] = useState(null);
  const [paperSize, setPaperSize] = useState('4x6'); // '4x6' | 'a4_stickers'
  const [maskPhone, setMaskPhone] = useState(false);
  const [showItemsTable, setShowItemsTable] = useState(true);
  const [sellerNote, setSellerNote] = useState('FRAGILE: HANDLE WITH CARE &bull; VERIFY OTP BEFORE HANDOVER');
  const previewRef = useRef(null);

  useEffect(() => {
    if (isOpen && selectedOrderIds && selectedOrderIds.length > 0) {
      fetchBulkLabels();
    } else {
      setLabelsData(null);
      setError(null);
    }
  }, [isOpen, selectedOrderIds, paperSize, maskPhone]);

  const fetchBulkLabels = async () => {
    try {
      setLoading(true);
      setError(null);
      const endpoint = role === 'admin' || role === 'superadmin'
        ? '/admin/orders/bulk-shipping-labels'
        : '/vendor/orders/bulk-shipping-labels';

      const response = await api.post(endpoint, {
        subOrderIds: selectedOrderIds,
        paperSize,
        maskPhone,
      });

      if (response.data && response.data.success) {
        setLabelsData(response.data);
      } else {
        throw new Error(response.data?.message || 'Failed to load shipping labels');
      }
    } catch (err) {
      console.error('Error fetching bulk shipping labels:', err);
      setError(err.response?.data?.message || err.message || 'Error loading thermal labels');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!labelsData || !labelsData.labels || labelsData.labels.length === 0) return;

    const endpoint = role === 'admin' || role === 'superadmin'
      ? '/admin/orders/bulk-shipping-labels'
      : '/vendor/orders/bulk-shipping-labels';

    const token = localStorage.getItem('token') || '';
    const printUrl = `${api.defaults.baseURL || '/api'}${endpoint}?format=html&paperSize=${paperSize}&maskPhone=${maskPhone}&subOrderIds=${selectedOrderIds.join(',')}&token=${token}`;

    const printWin = window.open(printUrl, '_blank', 'width=950,height=900,scrollbars=yes');
    if (!printWin) {
      window.print();
    }
  };

  const handleDownloadJSON = () => {
    if (!labelsData) return;
    const blob = new Blob([JSON.stringify(labelsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auramarket_thermal_manifest_${selectedOrderIds.length}_orders_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const labels = labelsData?.labels || [];
  const summary = labelsData?.manifestSummary || {
    totalOrders: selectedOrderIds.length,
    totalCodOrders: 0,
    totalCodAmount: 0,
    totalPrepaidOrders: 0,
    totalWeightKg: 0,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Bulk 4x6 Thermal Shipping Label & Barcode Generator
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                  Point 9 Pro
                </span>
              </div>
              <p className="text-xs text-slate-400">
                1-Click generation of high-density barcode stickers for thermal roll printers & A4 sheets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchBulkLabels}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1.5"
              title="Refresh labels data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Telemetry Summary Strip */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/70 border border-slate-700">
              <Layers className="w-4 h-4 text-amber-400" />
              <span className="text-slate-300">Selected Orders:</span>
              <strong className="text-white font-mono text-sm">{selectedOrderIds.length}</strong>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/70 border border-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span className="text-slate-300">COD Orders:</span>
              <strong className="text-amber-300 font-mono">
                {summary.totalCodOrders} (₹{Number(summary.totalCodAmount).toLocaleString('en-IN')})
              </strong>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/70 border border-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span className="text-slate-300">Prepaid Orders:</span>
              <strong className="text-emerald-300 font-mono">{summary.totalPrepaidOrders}</strong>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/70 border border-slate-700">
              <Truck className="w-4 h-4 text-indigo-400" />
              <span className="text-slate-300">Total Est. Weight:</span>
              <strong className="text-indigo-300 font-mono">{summary.totalWeightKg} KG</strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Paper Format:</span>
            <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setPaperSize('4x6')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  paperSize === '4x6'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                4x6" Thermal Roll
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('a4_stickers')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  paperSize === 'a4_stickers'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                A4 (4 Stickers/Page)
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body: Controls & Live Multi-Label Preview */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-3 text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Customization Toolbar */}
          <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-5">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white select-none">
                <input
                  type="checkbox"
                  checked={maskPhone}
                  onChange={(e) => setMaskPhone(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-0 w-4 h-4"
                />
                <span>Mask Customer Phone (Privacy Mode)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white select-none">
                <input
                  type="checkbox"
                  checked={showItemsTable}
                  onChange={(e) => setShowItemsTable(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-0 w-4 h-4"
                />
                <span>Show Itemized SKUs & HSN on Label</span>
              </label>
            </div>

            <div className="text-slate-400 italic">
              * Compatible with Zebra, TSC, Dymo, Citizen, Rollo & standard ESC/POS thermal printers
            </div>
          </div>

          {/* Labels Preview Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <span>Printable Manifest Preview</span>
                <span className="text-xs text-slate-400 font-normal">
                  ({labels.length} labels rendered &bull; {paperSize === '4x6' ? '101.6mm x 152.4mm per label' : 'A4 2x2 grid'})
                </span>
              </h4>
              <span className="text-xs text-slate-400 font-mono">
                Batch ID: {`BAT-${Date.now().toString().slice(-6)}`}
              </span>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
                <p className="text-sm">Formatting {selectedOrderIds.length} thermal labels with barcodes...</p>
              </div>
            ) : labels.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-3xl">
                No orders loaded. Please select at least one order to generate shipping labels.
              </div>
            ) : (
              <div
                ref={previewRef}
                className={`grid gap-6 ${
                  paperSize === 'a4_stickers'
                    ? 'grid-cols-1 md:grid-cols-2'
                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                }`}
              >
                {labels.map((d, index) => (
                  <div
                    key={d.subOrderId || index}
                    className="bg-white text-black p-4 rounded-xl border-2 border-slate-900 shadow-xl flex flex-col justify-between font-sans text-[10px] leading-tight select-none hover:shadow-2xl transition-all"
                    style={{ minHeight: '440px' }}
                  >
                    {/* Header */}
                    <div>
                      <div className="flex items-center justify-between border-b-2 border-black pb-1.5 mb-2">
                        <div className="flex items-baseline gap-1">
                          <span className="font-black text-sm tracking-tighter">AuraMarket</span>
                          <span className="text-[8px] font-black bg-black text-white px-1 py-0.5 rounded-xs">
                            EXPRESS
                          </span>
                        </div>
                        <div className="border border-black px-1.5 py-0.5 font-bold uppercase text-[9px] rounded-xs">
                          {d.courierPartner || 'Delhivery Surface'}
                        </div>
                        <div className="bg-black text-white font-mono font-black text-xs px-2 py-0.5 rounded-xs">
                          {d.routingPincode || '110001'}
                        </div>
                      </div>

                      {/* Barcode Visual */}
                      <div className="text-center my-2">
                        <div
                          className="h-9 w-full mx-auto"
                          style={{
                            background:
                              'repeating-linear-gradient(90deg, #000, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 7px, #fff 7px, #fff 8px, #000 8px, #000 11px, #fff 11px, #fff 13px)',
                          }}
                        ></div>
                        <div className="font-mono font-black tracking-widest text-xs mt-1">
                          {d.subOrderNumber} &bull; {d.awbCode}
                        </div>
                      </div>

                      {/* Routing details */}
                      <div className="flex justify-between border-y border-black py-1 my-1.5 text-[9px]">
                        <div>
                          <strong>ROUTING:</strong> {d.routingCode}
                        </div>
                        <div>
                          <strong>WT:</strong> {d.totalWeightKg} KG &bull; {d.packageCount}
                        </div>
                      </div>

                      {/* COD / Prepaid Banner */}
                      {d.isCOD ? (
                        <div className="bg-black text-white text-center font-black py-1.5 text-xs rounded-xs my-1.5">
                          ⚠️ CASH ON DELIVERY: ₹{Number(d.amountToCollect).toLocaleString('en-IN')}
                          <span className="block text-[7px] font-bold tracking-wider mt-0.5">
                            COLLECT EXACT CASH AT DOORSTEP
                          </span>
                        </div>
                      ) : (
                        <div className="border border-dashed border-black text-center font-black py-1 text-[10px] rounded-xs my-1.5">
                          ✓ PREPAID ORDER — DO NOT COLLECT CASH
                        </div>
                      )}

                      {/* Addresses */}
                      <div className="grid grid-cols-2 gap-2 border border-black p-1.5 my-1.5 text-[8.5px]">
                        <div className="flex flex-col justify-between">
                          <div>
                            <div className="font-black text-[7px] text-slate-700">DELIVER TO:</div>
                            <div className="font-black text-[10px] leading-tight text-slate-950">
                              {d.recipient.name}
                            </div>
                            <div className="text-[8px] leading-snug mt-0.5 text-slate-800">
                              {d.recipient.address}
                            </div>
                          </div>
                          <div className="mt-1 font-bold text-[8.5px]">
                            Phone: {d.recipient.phone}
                          </div>
                        </div>

                        <div className="flex flex-col justify-between border-l border-slate-300 pl-2">
                          <div>
                            <div className="font-black text-[7px] text-slate-700">RETURN TO:</div>
                            <div className="font-bold text-[9px] text-slate-900 leading-tight">
                              {d.seller.storeName}
                            </div>
                            <div className="text-[7.5px] font-bold text-slate-600">
                              GST: {d.seller.gstin}
                            </div>
                            <div className="text-[7.5px] leading-tight text-slate-600 mt-0.5">
                              {d.seller.address}
                            </div>
                          </div>
                          <div className="text-[7.5px] text-slate-600 mt-1">
                            Ph: {d.seller.phone}
                          </div>
                        </div>
                      </div>

                      {/* Items table */}
                      {showItemsTable && (
                        <table className="w-full border-collapse border border-black my-1 text-[7.5px]">
                          <thead>
                            <tr className="bg-black text-white">
                              <th className="border border-black p-0.5 text-left">SKU</th>
                              <th className="border border-black p-0.5 text-left">Item Description</th>
                              <th className="border border-black p-0.5 text-center">HSN</th>
                              <th className="border border-black p-0.5 text-center">Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {d.items.slice(0, 3).map((item, idx) => (
                              <tr key={idx}>
                                <td className="border border-black p-0.5 font-mono">{item.sku}</td>
                                <td className="border border-black p-0.5 truncate max-w-[130px]">
                                  {item.title}
                                </td>
                                <td className="border border-black p-0.5 text-center">
                                  {item.hsnCode || '85183000'}
                                </td>
                                <td className="border border-black p-0.5 text-center font-bold">
                                  {item.quantity}
                                </td>
                              </tr>
                            ))}
                            {d.items.length > 3 && (
                              <tr>
                                <td colSpan="4" className="border border-black p-0.5 text-center italic">
                                  + {d.items.length - 3} more items in package
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Bottom row: QR, Inv, OTP */}
                    <div className="border-t border-black pt-1.5 flex items-center justify-between text-[7.5px]">
                      <div className="w-7 h-7 border border-black flex items-center justify-center p-0.5 bg-slate-50">
                        <QrCode className="w-6 h-6 text-black" />
                      </div>

                      <div className="text-center flex-1 px-1">
                        <div>
                          Inv: <strong>{d.invoiceNumber}</strong>
                        </div>
                        <div className="font-bold text-[7px] bg-slate-100 border border-slate-400 px-1 py-0.5 rounded-xs my-0.5">
                          🔒 4-Digit Doorstep OTP Required
                        </div>
                      </div>

                      <div className="text-right font-black text-[10px]">
                        <span>#{index + 1}</span>
                        <span className="block text-[6px] text-slate-500 font-normal">
                          OF {labels.length}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Ready for 100% compliant e-commerce courier dispatch (Delhivery, Shiprocket, BlueDart)</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadJSON}
              disabled={loading || labels.length === 0}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center gap-2 border border-slate-700 disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>Download JSON Manifest</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={loading || labels.length === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>Print {labels.length} Thermal Labels (1-Click)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
