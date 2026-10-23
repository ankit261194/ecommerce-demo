import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  RefreshCw,
  Table,
  Check,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import api from '../api/client';

export default function BulkProductExcelModal({
  isOpen,
  onClose,
  onProductsImported,
  currentProducts = [],
  vendorToken,
}) {
  const [activeTab, setActiveTab] = useState('import'); // 'import' | 'export'
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [pasteMode, setPasteMode] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Sample CSV Template content
  const sampleCsvContent = [
    'Title,SKU,Category,Brand,MRP,SellingPrice,Stock,LowStockThreshold,Description,Image',
    '"Aura Stealth Mechanical Keyboard",APX-KB-STEALTH,"Electronics","Apex Tech",5999,3999,45,5,"RGB Backlit mechanical keyboard with tactile brown switches","https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500"',
    '"Aura Glide Wireless Gaming Mouse",APX-MSE-GLIDE,"Electronics","Apex Tech",3499,1999,60,8,"Ultra-lightweight 16000 DPI rechargeable optical mouse","https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500"',
    '"Aura Studio Monitor Stand",APX-STND-ALU,"Electronics","Apex Studio",2499,1499,30,4,"Aviation-grade aluminum dual arm monitor desk riser","https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500"',
    '"Aura Comfort Ergonomic Chair",APX-CHR-ERGO,"Lifestyle","Apex Comfort",19999,14999,12,3,"Breathable mesh lumbar support executive chair","https://images.unsplash.com/photo-1580481077195-c22822a7f49b?w=500"',
  ].join('\r\n');

  // 1-Click Download Sample CSV Template
  const handleDownloadSampleTemplate = () => {
    try {
      window.open(api.defaults.baseURL + '/vendor/products/sample-template?format=csv', '_blank');
    } catch (_) {
      const blob = new Blob([sampleCsvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'auramarket_bulk_product_template.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Helper for parsing CSV lines robustly
  const parseCSVLine = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        if (inQuotes && line[i + 1] === char) {
          current += char;
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    return values;
  };

  const parseCsvIntoPreview = (content) => {
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) {
      setParsedRows([]);
      return;
    }
    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = parseCSVLine(lines[i]);
      if (vals.length === 0 || (vals.length === 1 && !vals[0])) continue;
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = vals[idx] !== undefined ? vals[idx].trim() : '';
      });
      rows.push(row);
    }
    setParsedRows(rows);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setCsvText(text);
      parseCsvIntoPreview(text);
      setImportResult(null);
    };
    reader.readAsText(file);
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setCsvText(val);
    parseCsvIntoPreview(val);
    setImportResult(null);
  };

  // 1-Click Import Execution
  const handleExecuteImport = async () => {
    if (!csvText.trim()) return;
    setIsProcessing(true);
    setImportResult(null);

    try {
      const res = await api.post('/vendor/products/bulk-upload', { csvData: csvText });
      if (res.data?.success) {
        setImportResult(res.data);
        if (onProductsImported && Array.isArray(res.data.data)) {
          onProductsImported(res.data.data);
        }
        return;
      }
      throw new Error(res.data?.message || 'Bulk upload failed');
    } catch (err) {
      console.error('Bulk upload failed:', err);
      setImportResult({
        success: false,
        message: err.response?.data?.message || err.message || 'Bulk upload failed. Please verify CSV format and server connection.',
        errors: err.response?.data?.errors || [err.message],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 1-Click Export Catalog CSV
  const handleExportCatalog = () => {
    const headers = [
      'Title',
      'SKU',
      'Category',
      'Brand',
      'MRP',
      'SellingPrice',
      'DiscountPercent',
      'Stock',
      'LowStockThreshold',
      'Status',
      'Image',
      'Description',
    ];

    const escapeCSV = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = currentProducts.map(p => {
      const isOut = p.stock <= 0;
      const isLow = p.stock > 0 && p.stock <= (p.lowStockThreshold || 5);
      const status = isOut ? 'OUT_OF_STOCK' : isLow ? 'LOW_STOCK' : 'IN_STOCK';
      const discountPct = p.mrp > p.sellingPrice ? Math.round(((p.mrp - p.sellingPrice) / p.mrp) * 100) : 0;

      return [
        escapeCSV(p.title),
        escapeCSV(p.sku),
        escapeCSV(p.category || 'Electronics'),
        escapeCSV(p.brand || 'Store Brand'),
        p.mrp || p.sellingPrice || 0,
        p.sellingPrice || 0,
        discountPct,
        p.stock || 0,
        p.lowStockThreshold || 5,
        escapeCSV(status),
        escapeCSV(p.image || p.thumbnail || ''),
        escapeCSV(p.description || ''),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `auramarket_catalog_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Bulk Product Excel / CSV Suite</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Point #55
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Supercharge inventory onboarding with 1-click CSV import, validation & instant catalog export
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

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-slate-800 bg-slate-900/40 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`py-3.5 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'import'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload & Import CSV</span>
            {parsedRows.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">
                {parsedRows.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`py-3.5 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'export'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Export Catalog (.CSV)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 text-[10px]">
              {currentProducts.length} Items
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {activeTab === 'import' && (
            <div className="space-y-6">
              {/* Step 1: Template & Download */}
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>Download Official AuraMarket Sample CSV Template</span>
                  </h4>
                  <p className="text-slate-400 text-[11px]">
                    Includes standard columns: Title, SKU, Category, Brand, MRP, SellingPrice, Stock, LowStockThreshold, Description, Image.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSampleTemplate}
                  className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center gap-2 shrink-0 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Download .CSV Template</span>
                </button>
              </div>

              {/* Step 2: Upload or Paste */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                    Select CSV File or Paste Raw Data
                  </label>
                  <button
                    type="button"
                    onClick={() => setPasteMode(!pasteMode)}
                    className="text-amber-400 hover:text-amber-300 font-bold text-[11px] hover:underline"
                  >
                    {pasteMode ? '← Switch to File Uploader' : '✎ Paste Raw CSV Text'}
                  </button>
                </div>

                {!pasteMode ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 bg-slate-800/30 hover:bg-slate-800/50 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2 group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-200">
                        {fileName ? fileName : 'Click to browse or drop your .csv file here'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Supports UTF-8 CSV exports from Excel, Google Sheets, or ERP systems
                      </p>
                    </div>
                  </div>
                ) : (
                  <textarea
                    rows={6}
                    value={csvText}
                    onChange={handleTextChange}
                    placeholder="Paste CSV rows here (including header)..."
                    className="w-full p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700 text-slate-100 font-mono text-[11px] focus:outline-none focus:border-amber-500"
                  />
                )}
              </div>

              {/* Import Results Banner */}
              {importResult && (
                <div
                  className={`p-4 rounded-2xl border ${
                    importResult.errorCount > 0
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  } space-y-2 animate-fadeIn`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>{importResult.message}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black">
                        +{importResult.insertedCount || 0} Added
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-black">
                        ↺ {importResult.updatedCount || 0} Updated
                      </span>
                    </div>
                  </div>
                  {importResult.errors?.length > 0 && (
                    <div className="pt-2 border-t border-amber-500/20 text-[11px] space-y-1">
                      <p className="font-bold text-amber-300">Errors flagged during import:</p>
                      {importResult.errors.map((err, i) => (
                        <p key={i} className="text-amber-400/90 flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>Row {err.row}: {err.error}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Pre-Import Data Preview Table */}
              {parsedRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-2">
                      <Table className="w-4 h-4 text-amber-400" />
                      <span>Parsed Data Preview ({parsedRows.length} Rows)</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Auto-validated before database commit
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/60 max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-800/80 text-slate-300 font-bold sticky top-0 border-b border-slate-700">
                        <tr>
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">Title</th>
                          <th className="px-3 py-2">SKU</th>
                          <th className="px-3 py-2">Category</th>
                          <th className="px-3 py-2">MRP</th>
                          <th className="px-3 py-2">Selling</th>
                          <th className="px-3 py-2">Stock</th>
                          <th className="px-3 py-2">Threshold</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {parsedRows.slice(0, 15).map((row, idx) => {
                          const sell = Number(row.sellingprice || row.price) || 0;
                          const mrp = Number(row.mrp) || Math.round(sell * 1.25);
                          const isInvalid = !row.title && !row.name;

                          return (
                            <tr key={idx} className={isInvalid ? 'bg-rose-950/30' : 'hover:bg-slate-800/40'}>
                              <td className="px-3 py-2 text-slate-500 font-mono">{idx + 1}</td>
                              <td className="px-3 py-2 font-bold text-white max-w-[180px] truncate">
                                {row.title || row.name || (
                                  <span className="text-rose-400 italic">Missing Title</span>
                                )}
                              </td>
                              <td className="px-3 py-2 font-mono text-[10px] text-amber-300">{row.sku || 'AUTO-GEN'}</td>
                              <td className="px-3 py-2">{row.category || 'General'}</td>
                              <td className="px-3 py-2 text-slate-400 line-through">₹{mrp}</td>
                              <td className="px-3 py-2 font-bold text-emerald-400">₹{sell}</td>
                              <td className="px-3 py-2 font-black">{row.stock || 0}</td>
                              <td className="px-3 py-2 text-slate-400">{row.lowstockthreshold || 5}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <Download className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">
                      Export Full Store Inventory ({currentProducts.length} Items)
                    </h4>
                    <p className="text-xs text-slate-400">
                      Generate a clean, standardized UTF-8 CSV containing all product titles, SKUs, inventory counts, discount prices, and stock statuses.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-center">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Total Items</p>
                    <p className="text-base font-black text-white mt-1">{currentProducts.length}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">In Stock</p>
                    <p className="text-base font-black text-emerald-400 mt-1">
                      {currentProducts.filter(p => p.stock > (p.lowStockThreshold || 5)).length}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Low Stock</p>
                    <p className="text-base font-black text-amber-400 mt-1">
                      {currentProducts.filter(p => p.stock > 0 && p.stock <= (p.lowStockThreshold || 5)).length}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Out of Stock</p>
                    <p className="text-base font-black text-rose-400 mt-1">
                      {currentProducts.filter(p => p.stock <= 0).length}
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleExportCatalog}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.01]"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Full Catalog CSV File</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            Close
          </button>

          {activeTab === 'import' && (
            <button
              type="button"
              disabled={isProcessing || parsedRows.length === 0}
              onClick={handleExecuteImport}
              className={`px-6 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-md transition-all ${
                isProcessing || parsedRows.length === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 hover:scale-105'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Importing Catalog...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Import {parsedRows.length} Products Now</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
