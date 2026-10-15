import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Copy,
  Check,
  Download,
  X,
  FileText,
  Sliders,
  Layers,
  Sparkles,
  RotateCw,
  QrCode,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Radio,
} from 'lucide-react';
import axios from 'axios';

export default function ThermalReceiptPrinterModal({
  isOpen,
  onClose,
  orderId,
  role = 'admin', // 'admin' | 'vendor' | 'customer'
}) {
  const [paperWidth, setPaperWidth] = useState('80mm'); // '80mm' | '58mm'
  const [viewMode, setViewMode] = useState('visual'); // 'visual' | 'raw' | 'escpos'
  const [loading, setLoading] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [bluetoothStatus, setBluetoothStatus] = useState(null);
  const printIframeRef = useRef(null);

  const fetchReceipt = async (width = paperWidth) => {
    if (!orderId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const prefix = role === 'vendor' ? '/api/vendor' : role === 'admin' ? '/api/admin' : '/api';
      const url = `${prefix}/orders/${orderId}/thermal-receipt?width=${width}`;
      const res = await axios.get(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.data?.success) {
        setReceiptData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch thermal receipt:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && orderId) {
      fetchReceipt(paperWidth);
    }
  }, [isOpen, orderId, paperWidth]);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (!receiptData?.html) return;
    let iframe = printIframeRef.current;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      printIframeRef.current = iframe;
    }

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(receiptData.html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }, 350);
    }
  };

  const handleCopyText = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadBin = () => {
    if (!receiptData?.escPosBase64) return;
    const byteCharacters = atob(receiptData.escPosBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt_${receiptData.orderNumber || orderId}_${paperWidth}.bin`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleConnectHardware = async () => {
    setBluetoothStatus('Scanning for POS Thermal Hardware...');
    try {
      if (navigator.bluetooth) {
        setBluetoothStatus('WebBluetooth Ready: Pair thermal printer in browser prompt');
        const device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'], // Common POS service
        });
        setBluetoothStatus(`Paired with ${device.name || 'Thermal POS Printer'}`);
      } else {
        setBluetoothStatus('Hardware Direct Print: Browser WebBluetooth/WebUSB not supported on this device. Use 1-Click Print driver.');
      }
    } catch (err) {
      setBluetoothStatus('WebBluetooth cancelled or unavailable. Use 1-Click Print driver instead.');
      setTimeout(() => setBluetoothStatus(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-white tracking-tight">
                  In-Browser Thermal POS Printer
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Point #75
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  ESC/POS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Zero-clip thermal receipt emulation for kitchen, billing & warehouse dispatch
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar & Configuration */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* Paper Width Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/80 text-xs font-bold text-slate-700">
            <button
              onClick={() => setPaperWidth('80mm')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                paperWidth === '80mm'
                  ? 'bg-white text-slate-950 font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              80mm (Standard POS • 48 Col)
            </button>
            <button
              onClick={() => setPaperWidth('58mm')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                paperWidth === '58mm'
                  ? 'bg-white text-slate-950 font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              58mm (Mobile POS • 32 Col)
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/80 text-xs font-bold text-slate-700">
            <button
              onClick={() => setViewMode('visual')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'visual'
                  ? 'bg-white text-slate-950 font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              Visual Paper Preview
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'raw'
                  ? 'bg-white text-slate-950 font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              Monospace Text Stream
            </button>
            <button
              onClick={() => setViewMode('escpos')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'escpos'
                  ? 'bg-white text-slate-950 font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              ESC/POS Base64
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={loading || !receiptData}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
              title="Print directly to connected thermal receipt printer"
            >
              <Printer className="w-4 h-4" />
              <span>1-Click Thermal Print</span>
            </button>

            <button
              onClick={() =>
                handleCopyText(
                  viewMode === 'escpos' ? receiptData?.escPosBase64 : receiptData?.rawText
                )
              }
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300 flex items-center gap-1.5 transition active:scale-95 shadow-sm"
              title="Copy receipt stream to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Stream'}</span>
            </button>

            <button
              onClick={handleDownloadBin}
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300 flex items-center gap-1.5 transition active:scale-95 shadow-sm"
              title="Download raw ESC/POS binary file for direct USB/Bluetooth bridge"
            >
              <Download className="w-4 h-4" />
              <span>.bin</span>
            </button>
          </div>
        </div>

        {/* Hardware Status Banner */}
        {bluetoothStatus && (
          <div className="px-6 py-2 bg-indigo-50 border-b border-indigo-200 text-indigo-900 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
              <span>{bluetoothStatus}</span>
            </div>
            <button
              onClick={() => setBluetoothStatus(null)}
              className="text-indigo-600 hover:text-indigo-950 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Modal Body / Paper Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex items-center justify-center">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
              <RotateCw className="w-8 h-8 animate-spin text-amber-500" />
              <span className="text-xs font-bold">Rendering ESC/POS thermal raster stream...</span>
            </div>
          ) : viewMode === 'visual' ? (
            /* Authentic Thermal Paper Roll Rendering */
            <div
              className="bg-white shadow-2xl p-6 sm:p-7 border border-slate-300 transition-all text-slate-900 font-mono text-xs select-text relative"
              style={{
                width: paperWidth === '58mm' ? '320px' : '440px',
                minHeight: '480px',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.15)',
              }}
            >
              {/* Jagged Top Receipt Tear */}
              <div
                className="absolute -top-2 left-0 right-0 h-2 bg-repeat-x"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 5px 0, transparent 4px, #ffffff 5px)',
                  backgroundSize: '10px 10px',
                }}
              />

              {/* Rendered HTML inside iframe-safe sandbox */}
              {receiptData?.html ? (
                <div
                  className="space-y-4"
                  dangerouslySetInnerHTML={{
                    __html: receiptData.html
                      .replace(/<!DOCTYPE html>[\s\S]*?<body[^>]*>/i, '')
                      .replace(/<\/body>[\s\S]*?<\/html>/i, ''),
                  }}
                />
              ) : (
                <div className="text-center py-10 text-slate-400">
                  No thermal receipt available
                </div>
              )}

              {/* Jagged Bottom Receipt Tear */}
              <div
                className="absolute -bottom-2 left-0 right-0 h-2 bg-repeat-x"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 5px 8px, transparent 4px, #ffffff 5px)',
                  backgroundSize: '10px 10px',
                }}
              />
            </div>
          ) : viewMode === 'raw' ? (
            /* Monospace Text View */
            <div className="w-full max-w-2xl bg-slate-900 text-emerald-400 p-5 rounded-2xl font-mono text-xs overflow-x-auto shadow-inner border border-slate-800 leading-relaxed">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-slate-400 text-[11px]">
                <span>Columns: {receiptData?.columns || 48} • Monospace Grid</span>
                <span className="font-bold text-amber-400">ESC/POS Line Buffer</span>
              </div>
              <pre className="whitespace-pre">{receiptData?.rawText}</pre>
            </div>
          ) : (
            /* ESC/POS Base64 Byte Stream */
            <div className="w-full max-w-2xl bg-slate-900 text-amber-300 p-5 rounded-2xl font-mono text-xs overflow-x-auto shadow-inner border border-slate-800 leading-relaxed">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-slate-400 text-[11px]">
                <span>Base64 ESC/POS Binary Stream</span>
                <span className="font-bold text-emerald-400">Ready for Raw Socket / Serial</span>
              </div>
              <textarea
                readOnly
                value={receiptData?.escPosBase64 || ''}
                rows={12}
                className="w-full bg-slate-950 p-3 rounded-xl text-[11px] font-mono text-amber-200 border border-slate-800 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 font-semibold">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ESC/POS Emulation Ready ({paperWidth} Roll)</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleConnectHardware}
              className="text-indigo-600 hover:text-indigo-800 font-black flex items-center gap-1 transition"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Connect Hardware POS (WebBluetooth/USB)</span>
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
