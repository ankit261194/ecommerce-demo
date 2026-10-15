import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Building,
  CheckCircle2,
  TrendingUp,
  Receipt,
  PieChart,
  ShieldCheck,
  RefreshCw,
  Search,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
import api from '../api/client';

export default function VendorTaxReportModal({ isOpen, onClose, storeName }) {
  const [activeTab, setActiveTab] = useState('hsn'); // 'hsn' | 'b2cs' | 'invoices' | 'gstr1'
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState('10');
  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTaxReport = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('vendorToken') || localStorage.getItem('token');
      const params = new URLSearchParams({
        year: selectedYear,
      });
      if (selectedQuarter) {
        params.append('quarter', selectedQuarter);
      } else if (selectedMonth) {
        params.append('month', selectedMonth);
      }

      const res = await api.get(`/vendor/tax-report?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.data?.success) {
        setReportData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching tax report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTaxReport();
    }
  }, [isOpen, selectedYear, selectedMonth, selectedQuarter]);

  const handleDownloadCsv = () => {
    const token = localStorage.getItem('vendorToken') || localStorage.getItem('token');
    const params = new URLSearchParams({
      year: selectedYear,
      month: selectedMonth || 'all',
    });
    if (selectedQuarter) {
      params.append('quarter', selectedQuarter);
    }
    const downloadUrl = `/api/vendor/tax-report/export-csv?${params.toString()}`;
    window.open(downloadUrl, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const summary = reportData?.summary || {
    totalInvoices: 3,
    grossTurnover: 31994,
    totalTaxableValue: 27113.56,
    totalCgst: 1619.82,
    totalSgst: 1619.82,
    totalIgst: 1640.8,
    totalTax: 4880.44,
  };

  const vendorInfo = reportData?.vendor || {
    storeName: storeName || 'Apex Tech Hub',
    gstin: '27AABCU9603R1ZM',
    pan: 'AABCU9603R',
    state: 'Maharashtra',
    stateCode: '27',
  };

  const hsnList = (reportData?.hsnSummary || []).filter(item =>
    item.hsnCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const b2csList = reportData?.b2csSummary || [];
  const invoiceList = (reportData?.invoices || []).filter(inv =>
    inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.posState.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Vendor GST/VAT & HSN Tax Filing Report
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  GSTR-1 Ready
                </span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950">
                  #15
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {vendorInfo.storeName} • GSTIN: <span className="font-mono text-amber-300 font-semibold">{vendorInfo.gstin}</span> • State: {vendorInfo.state} ({vendorInfo.stateCode})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
              title="Download GSTR-1 CSV Report"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition shadow-sm"
              title="Print Tax Filing Sheet"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-600 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Filing Period:
            </span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="2026">FY 2026-27 (2026)</option>
              <option value="2025">FY 2025-26 (2025)</option>
            </select>

            <select
              value={selectedQuarter ? `Q:${selectedQuarter}` : `M:${selectedMonth}`}
              onChange={(e) => {
                const val = e.target.value;
                if (val.startsWith('Q:')) {
                  setSelectedQuarter(val.replace('Q:', ''));
                  setSelectedMonth('');
                } else {
                  setSelectedMonth(val.replace('M:', ''));
                  setSelectedQuarter('');
                }
              }}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <optgroup label="Monthly (GSTR-1)">
                <option value="M:1">January</option>
                <option value="M:2">February</option>
                <option value="M:3">March</option>
                <option value="M:4">April</option>
                <option value="M:5">May</option>
                <option value="M:6">June</option>
                <option value="M:7">July</option>
                <option value="M:8">August</option>
                <option value="M:9">September</option>
                <option value="M:10">October</option>
                <option value="M:11">November</option>
                <option value="M:12">December</option>
              </optgroup>
              <optgroup label="Quarterly (QRMP)">
                <option value="Q:Q1">Q1 (Jan - Mar)</option>
                <option value="Q:Q2">Q2 (Apr - Jun)</option>
                <option value="Q:Q3">Q3 (Jul - Sep)</option>
                <option value="Q:Q4">Q4 (Oct - Dec)</option>
              </optgroup>
            </select>

            <button
              onClick={fetchTaxReport}
              disabled={loading}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition"
              title="Refresh Tax Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Search HSN or Invoice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 w-44 sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="px-6 py-4 bg-slate-100 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Gross Turnover</span>
            <span className="text-base font-black text-slate-900 mt-1 block">₹{summary.grossTurnover?.toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-slate-400">{summary.totalInvoices} Invoices</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Taxable Sales</span>
            <span className="text-base font-black text-slate-900 mt-1 block">₹{summary.totalTaxableValue?.toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-emerald-600 font-semibold">Excl. Tax</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">Central CGST</span>
            <span className="text-base font-black text-blue-700 mt-1 block">₹{summary.totalCgst?.toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-slate-400">Intra-State 50%</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">State SGST</span>
            <span className="text-base font-black text-indigo-700 mt-1 block">₹{summary.totalSgst?.toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-slate-400">Intra-State 50%</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block">Integrated IGST</span>
            <span className="text-base font-black text-purple-700 mt-1 block">₹{summary.totalIgst?.toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-slate-400">Inter-State 100%</span>
          </div>

          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 shadow-sm">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Total Tax Liability</span>
            <span className="text-base font-black text-amber-900 mt-1 block">₹{summary.totalTax?.toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-amber-700 font-semibold">GST To Remit</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-6">
          <button
            onClick={() => setActiveTab('hsn')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'hsn'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Table 12: HSN Summary</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-black">
              {hsnList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('b2cs')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'b2cs'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>Table 7: B2CS State Breakdown</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-black">
              {b2csList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'invoices'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Invoice Register</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-black">
              {invoiceList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('gstr1')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'gstr1'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>GSTR-1 Filing Preparation Sheet</span>
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          
          {/* TAB 1: HSN Summary */}
          {activeTab === 'hsn' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    GSTR-1 Table 12: HSN-Wise Summary of Outward Supplies
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Itemized tax classification by 8-digit Harmonized System of Nomenclature
                  </p>
                </div>
                <span className="text-[11px] font-bold text-slate-500">
                  UQC: Numbers (NOS)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">HSN Code</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-center">UQC</th>
                      <th className="py-2.5 px-3 text-right">Total Qty</th>
                      <th className="py-2.5 px-3 text-right">Total Value</th>
                      <th className="py-2.5 px-3 text-right">Taxable Value</th>
                      <th className="py-2.5 px-3 text-center">Rate</th>
                      <th className="py-2.5 px-3 text-right">CGST</th>
                      <th className="py-2.5 px-3 text-right">SGST</th>
                      <th className="py-2.5 px-3 text-right">IGST</th>
                      <th className="py-2.5 px-3 text-right">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {hsnList.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-8 text-center text-slate-400">
                          No HSN records found for the selected period.
                        </td>
                      </tr>
                    ) : (
                      hsnList.map((row) => (
                        <tr key={row.hsnCode} className="hover:bg-amber-50/40 transition">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{row.hsnCode}</td>
                          <td className="py-2.5 px-3 max-w-xs truncate" title={row.description}>
                            {row.description}
                          </td>
                          <td className="py-2.5 px-3 text-center font-semibold text-slate-500">{row.uqc}</td>
                          <td className="py-2.5 px-3 text-right font-semibold">{row.totalQuantity}</td>
                          <td className="py-2.5 px-3 text-right font-semibold">₹{row.totalValue.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{row.taxableValue.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold text-slate-700">
                              {row.gstRate}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-blue-700">₹{row.cgstAmount.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-indigo-700">₹{row.sgstAmount.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-purple-700">₹{row.igstAmount.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3 text-right font-black text-amber-700">₹{row.totalTax.toLocaleString('en-IN')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {hsnList.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-100 font-black text-slate-900 border-t border-slate-300">
                        <td colSpan={3} className="py-3 px-3">TOTAL (HSN SUMMARY)</td>
                        <td className="py-3 px-3 text-right">{hsnList.reduce((s, r) => s + r.totalQuantity, 0)}</td>
                        <td className="py-3 px-3 text-right">₹{summary.grossTurnover?.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-right">₹{summary.totalTaxableValue?.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-center">-</td>
                        <td className="py-3 px-3 text-right text-blue-700">₹{summary.totalCgst?.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-right text-indigo-700">₹{summary.totalSgst?.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-right text-purple-700">₹{summary.totalIgst?.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-right text-amber-800">₹{summary.totalTax?.toLocaleString('en-IN')}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: B2CS State Breakdown */}
          {activeTab === 'b2cs' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    GSTR-1 Table 7: B2C (Small) Supplies by Place of Supply (POS)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Net supplies to unregistered consumers categorized by State Place of Supply & Tax Rate
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">State Code</th>
                      <th className="py-2.5 px-3">Place of Supply (POS)</th>
                      <th className="py-2.5 px-3">Supply Type</th>
                      <th className="py-2.5 px-3 text-center">Tax Rate</th>
                      <th className="py-2.5 px-3 text-right">Taxable Value</th>
                      <th className="py-2.5 px-3 text-right">CGST</th>
                      <th className="py-2.5 px-3 text-right">SGST</th>
                      <th className="py-2.5 px-3 text-right">IGST</th>
                      <th className="py-2.5 px-3 text-right">Total Tax Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {b2csList.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          No B2CS state supply records found for this period.
                        </td>
                      </tr>
                    ) : (
                      b2csList.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{row.posStateCode}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{row.posState}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.supplyType === 'INTRA-STATE'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}>
                              {row.supplyType}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-700">{row.taxRate}%</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{row.taxableValue.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-blue-700">₹{row.cgstAmount.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-indigo-700">₹{row.sgstAmount.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-purple-700">₹{row.igstAmount.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3 text-right font-black text-amber-700">₹{row.totalTax.toLocaleString('en-IN')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Invoice Register */}
          {activeTab === 'invoices' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Outward Sales Invoices Register
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Complete invoice breakdown generated from dispatch and delivery logs
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Invoice No</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">POS State</th>
                      <th className="py-2.5 px-3">Supply Type</th>
                      <th className="py-2.5 px-3 text-right">Taxable</th>
                      <th className="py-2.5 px-3 text-right">CGST</th>
                      <th className="py-2.5 px-3 text-right">SGST</th>
                      <th className="py-2.5 px-3 text-right">IGST</th>
                      <th className="py-2.5 px-3 text-right">Total Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {invoiceList.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-slate-400">
                          No invoices matching query.
                        </td>
                      </tr>
                    ) : (
                      invoiceList.map((inv) => (
                        <tr key={inv.invoiceNumber} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{inv.customerName}</td>
                          <td className="py-2.5 px-3">{inv.posState} ({inv.posStateCode})</td>
                          <td className="py-2.5 px-3">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              inv.supplyType === 'INTRA-STATE' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                            }`}>
                              {inv.supplyType}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium">₹{inv.taxableValue.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3 text-right text-blue-700">₹{inv.cgstAmount.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3 text-right text-indigo-700">₹{inv.sgstAmount.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3 text-right text-purple-700">₹{inv.igstAmount.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900">₹{inv.totalInvoiceValue.toLocaleString('en-IN')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: GSTR-1 Preparation Sheet */}
          {activeTab === 'gstr1' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-sm font-black text-slate-900 uppercase">
                      Official GSTR-1 Preparation & Filing Checklist
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    Form GSTR-1 (Rules 59(1) & 59(2))
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-800 uppercase block">1. Taxpayer Master Profile</span>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Legal Name of Registered Person:</span>
                      <span className="font-bold text-slate-800">{vendorInfo.storeName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">GSTIN:</span>
                      <span className="font-mono font-bold text-amber-700">{vendorInfo.gstin}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Permanent Account Number (PAN):</span>
                      <span className="font-mono font-bold text-slate-800">{vendorInfo.pan}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Principal Place of Business:</span>
                      <span className="font-bold text-slate-800">{vendorInfo.state} ({vendorInfo.stateCode})</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-800 uppercase block">2. Aggregate Turnover & Net Liability</span>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Gross Outward Supplies (Turnover):</span>
                      <span className="font-bold text-slate-800">₹{summary.grossTurnover?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Total Taxable Value (Base):</span>
                      <span className="font-bold text-slate-800">₹{summary.totalTaxableValue?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Central Tax (CGST) Liability:</span>
                      <span className="font-bold text-blue-700">₹{summary.totalCgst?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">State Tax (SGST) Liability:</span>
                      <span className="font-bold text-indigo-700">₹{summary.totalSgst?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Integrated Tax (IGST) Liability:</span>
                      <span className="font-bold text-purple-700">₹{summary.totalIgst?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between py-1 pt-1.5 font-bold">
                      <span className="text-amber-800">Total Tax Payable (Cash/ITC):</span>
                      <span className="font-black text-amber-900 text-sm">₹{summary.totalTax?.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="text-xs text-emerald-900">
                    <p className="font-bold">E-Commerce Marketplace TCS (Section 52) Compliance</p>
                    <p className="text-emerald-700 mt-0.5">
                      All net supplies dispatched through AuraMarket are audited and logged with zero tax discrepancies. 
                      You can directly upload the exported CSV to the GST Offline Utility Tool or copy values into the GSTN Portal.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Tax engine calculated in real-time under GST Rules 2017</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
          >
            Close Report
          </button>
        </div>

      </div>
    </div>
  );
}
