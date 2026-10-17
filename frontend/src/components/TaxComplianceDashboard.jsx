import React, { useState, useEffect } from 'react';
import {
  FileText,
  ShieldCheck,
  Building2,
  Calendar,
  Download,
  Printer,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Ban,
  ArrowUpRight,
  TrendingUp,
  Layers,
  Settings,
  Truck,
  Hash,
  ExternalLink,
  Save,
  Check,
  Copy,
  Users,
} from 'lucide-react';
import EInvoiceViewerModal from './EInvoiceViewerModal';

export default function TaxComplianceDashboard({ apiUrl = '/api' }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'gstr1' | 'gstr8' | 'settings'
  const [kpiData, setKpiData] = useState(null);
  const [gatewayHealth, setGatewayHealth] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // GSTR-1 State
  const [gstr1Data, setGstr1Data] = useState(null);
  const [gstr1Loading, setGstr1Loading] = useState(false);

  // GSTR-8 State
  const [gstr8Data, setGstr8Data] = useState(null);
  const [gstr8Loading, setGstr8Loading] = useState(false);

  // Settings State
  const [config, setConfig] = useState({
    isEnabled: true,
    environment: 'SANDBOX',
    irpProvider: 'NIC',
    sellerGstin: '07AAAAA0000A1Z5',
    legalName: 'AuraMarket E-Commerce Solutions Pvt Ltd',
    tradeName: 'AuraMarket Official',
    stateCode: '07',
    stateName: 'Delhi',
    ewayBillThreshold: 50000,
    tds194ORatePercent: 1.0,
    tcs52RatePercent: 1.0,
    cancellationWindowHours: 24,
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Invoice Viewer Modal
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchDashboardData();
    fetchConfig();
  }, []);

  useEffect(() => {
    if (activeTab === 'gstr1' && !gstr1Data) {
      fetchGstr1();
    } else if (activeTab === 'gstr8' && !gstr8Data) {
      fetchGstr8();
    }
  }, [activeTab]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('auramarket_token') || '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/admin/tax/compliance-dashboard`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setKpiData(json.data.kpi);
        setGatewayHealth(json.data.gatewayHealth);
        setRecentInvoices(json.data.recentInvoices || []);
      } else {
        throw new Error(json.message || 'Failed to load compliance radar.');
      }
    } catch (err) {
      setError(err.message || 'Failed to connect to Tax Compliance gateway.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGstr1 = async () => {
    setGstr1Loading(true);
    try {
      const res = await fetch(`${apiUrl}/tax/reports/gstr1`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setGstr1Data(json.data);
      }
    } catch (err) {
      console.error('Failed to load GSTR-1:', err);
    } finally {
      setGstr1Loading(false);
    }
  };

  const fetchGstr8 = async () => {
    setGstr8Loading(true);
    try {
      const res = await fetch(`${apiUrl}/tax/reports/gstr8`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setGstr8Data(json.data);
      }
    } catch (err) {
      console.error('Failed to load GSTR-8:', err);
    } finally {
      setGstr8Loading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${apiUrl}/admin/tax/e-invoicing/settings`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setConfig(json.data);
      }
    } catch (err) {
      console.warn('Could not load settings:', err);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`${apiUrl}/admin/tax/e-invoicing/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(config),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to update configuration.');
      }
      setConfig(json.data);
      setSuccessMsg('Government E-Invoicing & NIC Gateway settings updated successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.message || 'Error updating settings.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleDownloadCsv = (type) => {
    const token = localStorage.getItem('token') || localStorage.getItem('auramarket_token') || '';
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
    const downloadUrl = `${apiUrl}/tax/reports/${type}?format=csv${tokenParam}`;
    window.open(downloadUrl, '_blank');
  };

  const filteredInvoices = recentInvoices.filter((inv) => {
    const matchesSearch =
      searchTerm === '' ||
      inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.irn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.buyerDetails?.legalName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      inv.status === statusFilter ||
      (statusFilter === 'B2B' && inv.supplyType === 'B2B') ||
      (statusFilter === 'B2C' && inv.supplyType === 'B2C');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner & Gateway Health */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">GST & TDS E-Invoicing Hub</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Point #49 Active
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {gatewayHealth?.environment || 'SANDBOX'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Government Tax Compliance, Deterministic IRN Engine, and GSTR-1/8 Automated Returns
              </p>
            </div>
          </div>

          {/* Gateway Status Badge */}
          <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700 text-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <div className="font-bold text-slate-200">
                {gatewayHealth?.irpProvider || 'NIC'} Gateway: Online
              </div>
              <div className="text-[10px] text-slate-400">
                Uptime: {gatewayHealth?.uptimePercent || '99.98'}% | Latency: {gatewayHealth?.averageLatencyMs || '42'}ms
              </div>
            </div>
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition ml-2"
              title="Refresh Radar"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Global KPI Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Invoices</div>
            <div className="text-lg font-bold text-white mt-1">
              {kpiData?.totalInvoices || 0}
              <span className="text-[10px] font-normal text-slate-400 ml-1">
                ({kpiData?.activeInvoices || 0} act)
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <div className="text-[10px] uppercase font-bold text-slate-400">Taxable Value</div>
            <div className="text-lg font-bold text-cyan-300 font-mono mt-1">
              ₹{kpiData?.totalTaxableValue?.toLocaleString('en-IN') || '0.00'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <div className="text-[10px] uppercase font-bold text-slate-400">GST Collected</div>
            <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
              ₹{kpiData?.totalTaxCollected?.toLocaleString('en-IN') || '0.00'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <div className="text-[10px] uppercase font-bold text-slate-400">Section 194O TDS</div>
            <div className="text-lg font-bold text-amber-300 font-mono mt-1">
              ₹{kpiData?.totalTds194OWithheld?.toLocaleString('en-IN') || '0.00'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <div className="text-[10px] uppercase font-bold text-slate-400">Section 52 TCS</div>
            <div className="text-lg font-bold text-violet-300 font-mono mt-1">
              ₹{kpiData?.totalTcs52Collected?.toLocaleString('en-IN') || '0.00'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <div className="text-[10px] uppercase font-bold text-slate-400">e-Way Bills</div>
            <div className="text-lg font-bold text-blue-300 mt-1">
              {kpiData?.ewayBillsCount || 0}
              <span className="text-[10px] font-normal text-slate-400 ml-1">(&gt;₹50k)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <Ban className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          E-Invoices Radar ({recentInvoices.length})
        </button>
        <button
          onClick={() => setActiveTab('gstr1')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === 'gstr1'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          GSTR-1 Monthly Return
        </button>
        <button
          onClick={() => setActiveTab('gstr8')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === 'gstr8'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          GSTR-8 TCS & 194O TDS Ledger
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === 'settings'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          NIC Gateway Settings
        </button>
      </div>

      {/* Tab 1: Overview & Recent E-Invoices */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search invoice, IRN, customer..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none text-slate-700 bg-white"
              >
                <option value="ALL">All Invoices</option>
                <option value="GENERATED">Active / Generated</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="B2B">B2B Only</option>
                <option value="B2C">B2C Only</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Invoice Details</th>
                    <th className="px-4 py-3">Buyer & Place of Supply</th>
                    <th className="px-4 py-3">Tax Breakdown</th>
                    <th className="px-4 py-3 text-right">Grand Total (₹)</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400">
                        No E-Invoices matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv._id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{inv.invoiceNumber}</div>
                          <div className="font-mono text-[10px] text-blue-600 truncate max-w-[140px]" title={inv.irn}>
                            IRN: {inv.irn?.substring(0, 16)}...
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(inv.invoiceDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800 truncate max-w-[150px]">
                            {inv.buyerDetails?.legalName}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {inv.buyerDetails?.state} (Code: {inv.buyerDetails?.stateCode})
                          </div>
                          {inv.buyerDetails?.isB2B && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[9px] font-bold">
                              GSTIN: {inv.buyerDetails?.gstin}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-[11px] font-medium text-slate-700">
                            Taxable: ₹{inv.totalTaxableAmount?.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {inv.taxType === 'INTRA_STATE'
                              ? `CGST: ₹${inv.totalCgst?.toFixed(2)} | SGST: ₹${inv.totalSgst?.toFixed(2)}`
                              : `IGST: ₹${inv.totalIgst?.toFixed(2)}`}
                          </div>
                          {inv.eWayBill?.ewayBillNo && (
                            <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[9px] font-bold">
                              <Truck className="w-2.5 h-2.5" /> e-Way Bill
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-bold font-mono text-slate-900">
                            ₹{inv.grandTotal?.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-amber-700">
                            TDS 194O: ₹{inv.tdsSection194O?.tdsAmount?.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              inv.status === 'GENERATED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedInvoiceId(inv._id);
                                setIsViewerOpen(true);
                              }}
                              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition"
                            >
                              View
                            </button>
                            <a
                              href={`${apiUrl}/tax/e-invoicing/${inv._id}/print`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded hover:bg-blue-50 text-blue-600 transition"
                              title="Print A4 Tax Invoice"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: GSTR-1 Return */}
      {activeTab === 'gstr1' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-sm text-slate-900">
                Form GSTR-1: Outward Supplies & Tax Liability Return
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Statutory sales return under Section 37 for B2B invoices, B2C consignments, and HSN summary
              </p>
            </div>
            <button
              onClick={() => handleDownloadCsv('gstr1')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
            >
              <Download className="w-4 h-4" />
              Export GSTR-1 CSV (Govt Format)
            </button>
          </div>

          {gstr1Loading ? (
            <div className="py-12 text-center text-slate-400">Loading GSTR-1 return dataset...</div>
          ) : gstr1Data ? (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Total Taxable Value</div>
                  <div className="text-base font-bold font-mono text-slate-900 mt-1">
                    ₹{gstr1Data.summary?.totalTaxableValue?.toFixed(2)}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Central Tax (CGST)</div>
                  <div className="text-base font-bold font-mono text-blue-600 mt-1">
                    ₹{gstr1Data.summary?.totalCgst?.toFixed(2)}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">State Tax (SGST)</div>
                  <div className="text-base font-bold font-mono text-blue-600 mt-1">
                    ₹{gstr1Data.summary?.totalSgst?.toFixed(2)}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Integrated Tax (IGST)</div>
                  <div className="text-base font-bold font-mono text-indigo-600 mt-1">
                    ₹{gstr1Data.summary?.totalIgst?.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* B2B Invoices Section */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    4A, 4B, 4C, 6B, 6C - B2B Invoices (Registered Buyers)
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {gstr1Data.tables?.b2b?.length || 0} Invoices
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50/50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2">Buyer GSTIN</th>
                        <th className="px-4 py-2">Receiver Legal Name</th>
                        <th className="px-4 py-2">Invoice No</th>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2">Place of Supply</th>
                        <th className="px-4 py-2 text-right">Taxable Val (₹)</th>
                        <th className="px-4 py-2 text-right">Invoice Val (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(gstr1Data.tables?.b2b || []).length === 0 ? (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-slate-400">
                            No B2B registered invoices recorded for this period.
                          </td>
                        </tr>
                      ) : (
                        gstr1Data.tables.b2b.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-4 py-2 font-mono font-bold text-blue-700">{row.gstin}</td>
                            <td className="px-4 py-2 font-semibold text-slate-800">{row.receiverName}</td>
                            <td className="px-4 py-2 font-mono text-slate-700">{row.invoiceNumber}</td>
                            <td className="px-4 py-2 text-slate-500">{row.invoiceDate}</td>
                            <td className="px-4 py-2 text-slate-600">{row.placeOfSupply}</td>
                            <td className="px-4 py-2 text-right font-mono font-medium">₹{row.taxableValue?.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right font-mono font-bold text-slate-900">
                              ₹{row.invoiceValue?.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* HSN Summary Section */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    Table 12 - HSN-wise Summary of Outward Supplies
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {gstr1Data.tables?.hsnSummary?.length || 0} Distinct HSN Codes
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50/50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2">HSN Code</th>
                        <th className="px-4 py-2">Description</th>
                        <th className="px-4 py-2 text-right">Taxable Value (₹)</th>
                        <th className="px-4 py-2 text-right">CGST (₹)</th>
                        <th className="px-4 py-2 text-right">SGST (₹)</th>
                        <th className="px-4 py-2 text-right">IGST (₹)</th>
                        <th className="px-4 py-2 text-right">Total Tax (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(gstr1Data.tables?.hsnSummary || []).map((h, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-mono font-bold text-slate-900">{h.hsnCode}</td>
                          <td className="px-4 py-2 text-slate-600">{h.description}</td>
                          <td className="px-4 py-2 text-right font-mono font-medium">
                            ₹{h.totalTaxableValue?.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-slate-600">₹{h.cgst?.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-600">₹{h.sgst?.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-600">₹{h.igst?.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-blue-700">
                            ₹{h.totalTax?.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Tab 3: GSTR-8 TCS Return & 194O Ledger */}
      {activeTab === 'gstr8' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-sm text-slate-900">
                Form GSTR-8: E-Commerce Operator TCS Return & Section 194O TDS Ledger
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Section 52 GST TCS collected (1%) and Section 194O Income Tax TDS withheld on merchant payouts
              </p>
            </div>
            <button
              onClick={() => handleDownloadCsv('gstr8')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
            >
              <Download className="w-4 h-4" />
              Export GSTR-8 CSV (Audit Format)
            </button>
          </div>

          {gstr8Loading ? (
            <div className="py-12 text-center text-slate-400">Loading GSTR-8 return dataset...</div>
          ) : gstr8Data ? (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Gross Supplies</div>
                  <div className="text-base font-bold font-mono text-slate-900 mt-1">
                    ₹{gstr8Data.summary?.totalGrossSupplies?.toFixed(2)}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Net Taxable Supplies</div>
                  <div className="text-base font-bold font-mono text-cyan-700 mt-1">
                    ₹{gstr8Data.summary?.netTaxableSupplies?.toFixed(2)}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Total TCS Collected (1%)</div>
                  <div className="text-base font-bold font-mono text-violet-700 mt-1">
                    ₹{gstr8Data.summary?.totalTcsCollected?.toFixed(2)}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">CGST + SGST + IGST TCS</div>
                  <div className="text-xs font-mono text-slate-600 mt-1">
                    C: ₹{gstr8Data.summary?.cgstTcs?.toFixed(2)} | S: ₹{gstr8Data.summary?.sgstTcs?.toFixed(2)} | I: ₹{gstr8Data.summary?.igstTcs?.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Merchant Breakdown Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    Table 4 - Supplies made to Registered / Unregistered Persons (Merchant-Wise)
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {gstr8Data.vendorBreakdown?.length || 0} Merchants
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50/50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2">Merchant Name</th>
                        <th className="px-4 py-2">Merchant GSTIN</th>
                        <th className="px-4 py-2 text-right">Net Taxable (₹)</th>
                        <th className="px-4 py-2 text-right">CGST TCS (0.5%)</th>
                        <th className="px-4 py-2 text-right">SGST TCS (0.5%)</th>
                        <th className="px-4 py-2 text-right">IGST TCS (1%)</th>
                        <th className="px-4 py-2 text-right">Total TCS (₹)</th>
                        <th className="px-4 py-2 text-right">194O TDS (1%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(gstr8Data.vendorBreakdown || []).map((v, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-bold text-slate-900">{v.vendorName}</td>
                          <td className="px-4 py-2.5 font-mono text-blue-700 font-semibold">{v.gstin}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-medium">
                            ₹{v.netTaxableAmount?.toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-600">₹{v.cgstTcs?.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-600">₹{v.sgstTcs?.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-600">₹{v.igstTcs?.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-violet-700">
                            ₹{v.totalTcs?.toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-700">
                            ₹{v.tds194OWithheld?.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Tab 4: NIC Gateway Settings */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveConfig} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h4 className="font-bold text-base text-slate-900">
              National Informatics Centre (NIC) Gateway & Statutory Settings
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure GSTIN credentials, e-Way Bill threshold limits, and Section 194O TDS rates
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Environment Mode</label>
              <select
                value={config.environment}
                onChange={(e) => setConfig({ ...config, environment: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="SANDBOX">Sandbox / NIC Simulation Mode</option>
                <option value="PRODUCTION">Production / Live IRP Production Gateway</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">IRP Provider</label>
              <select
                value={config.irpProvider}
                onChange={(e) => setConfig({ ...config, irpProvider: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="NIC">NIC (National Informatics Centre, Govt of India)</option>
                <option value="CLEAR">ClearTax Enterprise GSP</option>
                <option value="EY">Ernst & Young GSP</option>
                <option value="MASTERCARD">Mastercard Payment & Tax</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Platform Seller GSTIN</label>
              <input
                type="text"
                value={config.sellerGstin}
                onChange={(e) => setConfig({ ...config, sellerGstin: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Legal Business Name</label>
              <input
                type="text"
                value={config.legalName}
                onChange={(e) => setConfig({ ...config, legalName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">e-Way Bill Mandatory Threshold (₹)</label>
              <input
                type="number"
                value={config.ewayBillThreshold}
                onChange={(e) => setConfig({ ...config, ewayBillThreshold: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Standard Central threshold is ₹50,000</span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Statutory Cancellation Window (Hours)</label>
              <input
                type="number"
                value={config.cancellationWindowHours}
                onChange={(e) => setConfig({ ...config, cancellationWindowHours: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Government IRP portal limit is 24 hours</span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Section 194O Income Tax TDS Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={config.tds194ORatePercent}
                onChange={(e) => setConfig({ ...config, tds194ORatePercent: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Default 1.0% on e-commerce merchant payouts</span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Section 52 GST TCS Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={config.tcs52RatePercent}
                onChange={(e) => setConfig({ ...config, tcs52RatePercent: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Default 1.0% (0.5% CGST + 0.5% SGST or 1% IGST)</span>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={savingConfig}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition disabled:opacity-50"
            >
              {savingConfig ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Saving Settings...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Invoice Viewer Modal */}
      {isViewerOpen && (
        <EInvoiceViewerModal
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          invoiceId={selectedInvoiceId}
          apiUrl={apiUrl}
        />
      )}
    </div>
  );
}
