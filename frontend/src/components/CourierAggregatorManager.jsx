import React, { useState, useEffect } from 'react';
import {
  Truck,
  CheckCircle,
  AlertTriangle,
  Save,
  RotateCcw,
  Zap,
  MapPin,
  Barcode,
  Search,
  ExternalLink,
  Clock,
  Printer,
  Calendar,
  Layers,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  PackageCheck,
  Building2,
  Send,
  DollarSign,
  Activity,
  Radio,
  Check,
  Flame,
  RefreshCw,
  Play,
  Sliders,
  Sparkles,
} from 'lucide-react';
import api from '../api/client';

export default function CourierAggregatorManager() {
  const [activeTab, setActiveTab] = useState('settings'); // 'settings' | 'fallback' | 'rate_matrix' | 'shipments' | 'sandbox'
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const [saveErrorMessage, setSaveErrorMessage] = useState('');

  // Settings State
  const [courierSettings, setCourierSettings] = useState({
    defaultCourier: 'SHIPROCKET',
    autoGenerateAwb: true,
    autoSchedulePickup: true,
    shiprocket: {
      enabled: true,
      mode: 'sandbox',
      email: 'dispatch@auramarket.com',
      passwordMasked: '••••••••',
      apiKey: 'sr_api_992149182348',
      defaultPickupLocation: 'Primary Warehouse - Delhi NCR Hub',
    },
    delhivery: {
      enabled: true,
      mode: 'sandbox',
      clientName: 'AURAMARKET_EXPRESS',
      apiTokenMasked: '••••••••',
      pickupLocation: 'Delhivery Surface Hub - Bhiwandi / Gurugram',
    },
    bluedart: {
      enabled: false,
      mode: 'sandbox',
      loginId: 'BLUEDART_DELHI',
      licenseKeyMasked: '••••••••',
    },
    webhookSecret: 'whsec_courier_webhook_secret_2026',
    fallbackHierarchy: ['SHIPROCKET', 'DELHIVERY', 'BLUEDART', 'LOCAL_FLEET'],
    autoFallbackEnabled: true,
    rateOptimizationStrategy: 'BALANCED',
    maxTransitDaysThreshold: 5,
  });

  // Password editing toggles
  const [editShiprocketPassword, setEditShiprocketPassword] = useState(false);
  const [shiprocketPassword, setShiprocketPassword] = useState('');
  const [editDelhiveryToken, setEditDelhiveryToken] = useState(false);
  const [delhiveryToken, setDelhiveryToken] = useState('');
  const [editBluedartKey, setEditBluedartKey] = useState(false);
  const [bluedartKey, setBluedartKey] = useState('');

  // Ping Testing State
  const [testingCourier, setTestingCourier] = useState(null);
  const [testResult, setTestResult] = useState(null);

  // Health Radar State (Point #46)
  const [healthData, setHealthData] = useState(null);
  const [isHealthLoading, setIsHealthLoading] = useState(false);

  // Rate Matrix Calculator State (Point #46)
  const [rateQuery, setRateQuery] = useState({
    pickupPincode: '110001',
    deliveryPincode: '400001',
    weightKg: 0.8,
    lengthCm: 20,
    widthCm: 15,
    heightCm: 8,
    declaredValue: 1500,
    isCod: false,
  });
  const [isCalculatingRates, setIsCalculatingRates] = useState(false);
  const [rateComparisonResults, setRateComparisonResults] = useState(null);

  // Fallback Simulation State (Point #46)
  const [simulationState, setSimulationState] = useState({
    simulateFailCarrier: 'SHIPROCKET',
    isSimulating: false,
    result: null,
    error: null,
  });

  // Shipments List State
  const [shipments, setShipments] = useState([]);
  const [shipmentsLoading, setShipmentsLoading] = useState(false);
  const [trackingModalData, setTrackingModalData] = useState(null);
  const [selectedAttemptsModal, setSelectedAttemptsModal] = useState(null);

  // Sandbox & Webhook Simulator State
  const [sandboxAwb, setSandboxAwb] = useState('');
  const [sandboxTrackingResult, setSandboxTrackingResult] = useState(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [webhookSimulator, setWebhookSimulator] = useState({
    carrier: 'SHIPROCKET',
    status: 'IN_TRANSIT',
    location: 'Mumbai Sorting Hub - Vashi Sector 19',
    remarks: 'Consignment scanned and sorted into outbound flight container',
    isSending: false,
    feedback: null,
  });

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/courier/settings');
      if (res.data?.success && res.data.data) {
        setCourierSettings((prev) => ({
          ...prev,
          ...res.data.data,
          fallbackHierarchy: res.data.data.fallbackHierarchy || ['SHIPROCKET', 'DELHIVERY', 'BLUEDART', 'LOCAL_FLEET'],
        }));
      }
    } catch (err) {
      console.warn('Could not load courier settings:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchShipments = async () => {
    setShipmentsLoading(true);
    try {
      const res = await api.get('/admin/courier/shipments');
      if (res.data?.success && res.data.shipments) {
        setShipments(res.data.shipments);
      }
    } catch (err) {
      console.warn('Could not load shipments:', err.message);
    } finally {
      setShipmentsLoading(false);
    }
  };

  const fetchHealthRadar = async () => {
    setIsHealthLoading(true);
    try {
      const res = await api.get('/admin/courier/health-status');
      if (res.data?.success) {
        setHealthData(res.data);
      }
    } catch (err) {
      console.warn('Could not load health radar:', err.message);
    } finally {
      setIsHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'shipments') {
      fetchShipments();
    } else if (activeTab === 'fallback') {
      fetchHealthRadar();
    } else if (activeTab === 'rate_matrix' && !rateComparisonResults) {
      handleCompareRates();
    }
  }, [activeTab]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccessMessage('');
    setSaveErrorMessage('');

    try {
      const payload = {
        defaultCourier: courierSettings.defaultCourier,
        autoGenerateAwb: courierSettings.autoGenerateAwb,
        autoSchedulePickup: courierSettings.autoSchedulePickup,
        webhookSecret: courierSettings.webhookSecret,
        fallbackHierarchy: courierSettings.fallbackHierarchy,
        autoFallbackEnabled: courierSettings.autoFallbackEnabled,
        rateOptimizationStrategy: courierSettings.rateOptimizationStrategy,
        maxTransitDaysThreshold: courierSettings.maxTransitDaysThreshold,
        shiprocket: {
          enabled: courierSettings.shiprocket.enabled,
          mode: courierSettings.shiprocket.mode,
          email: courierSettings.shiprocket.email,
          apiKey: courierSettings.shiprocket.apiKey,
          defaultPickupLocation: courierSettings.shiprocket.defaultPickupLocation,
          password: editShiprocketPassword ? shiprocketPassword : courierSettings.shiprocket.passwordMasked,
        },
        delhivery: {
          enabled: courierSettings.delhivery.enabled,
          mode: courierSettings.delhivery.mode,
          clientName: courierSettings.delhivery.clientName,
          pickupLocation: courierSettings.delhivery.pickupLocation,
          apiToken: editDelhiveryToken ? delhiveryToken : courierSettings.delhivery.apiTokenMasked,
        },
        bluedart: {
          enabled: courierSettings.bluedart.enabled,
          mode: courierSettings.bluedart.mode,
          loginId: courierSettings.bluedart.loginId,
          licenseKey: editBluedartKey ? bluedartKey : courierSettings.bluedart.licenseKeyMasked,
        },
      };

      const res = await api.put('/admin/courier/settings', payload);
      if (res.data?.success) {
        setSaveSuccessMessage('Courier Aggregator & Fallback Engine settings saved successfully!');
        setEditShiprocketPassword(false);
        setEditDelhiveryToken(false);
        setEditBluedartKey(false);
        fetchSettings();
      }
    } catch (err) {
      setSaveErrorMessage(err.response?.data?.message || 'Failed to save courier settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async (courierName) => {
    setTestingCourier(courierName);
    setTestResult(null);
    try {
      const res = await api.post('/admin/courier/test-connection', { courier: courierName });
      if (res.data?.success) {
        setTestResult(res.data);
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err.response?.data?.message || 'Connection test failed',
      });
    } finally {
      setTestingCourier(null);
    }
  };

  const handleTrackAwb = async (awb) => {
    setIsTrackingLoading(true);
    setSandboxTrackingResult(null);
    try {
      const res = await api.get(`/courier/track/${awb}`);
      if (res.data?.success) {
        setSandboxTrackingResult(res.data.tracking);
      }
    } catch (err) {
      setSandboxTrackingResult({ error: err.response?.data?.message || 'Shipment not found' });
    } finally {
      setIsTrackingLoading(false);
    }
  };

  // Move carrier up/down in fallback hierarchy
  const moveCarrierHierarchy = (index, direction) => {
    const list = [...courierSettings.fallbackHierarchy];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    setCourierSettings({ ...courierSettings, fallbackHierarchy: list });
  };

  // Compare rates handler
  const handleCompareRates = async () => {
    setIsCalculatingRates(true);
    try {
      const res = await api.post('/courier/rates/compare', rateQuery);
      if (res.data?.success) {
        setRateComparisonResults(res.data);
      }
    } catch (err) {
      console.error('Rate comparison failed:', err);
    } finally {
      setIsCalculatingRates(false);
    }
  };

  // Interactive Fallback Simulation (Point #46)
  const handleSimulateFallback = async () => {
    setSimulationState((prev) => ({ ...prev, isSimulating: true, result: null, error: null }));
    try {
      // Find a suborder to test with, or use a sample ID
      let testSubOrderId = shipments[0]?.subOrderId;
      if (!testSubOrderId) {
        // Fetch sub-orders if available
        const ordersRes = await api.get('/orders').catch(() => null);
        const sampleOrder = ordersRes?.data?.orders?.[0];
        testSubOrderId = sampleOrder?.subOrders?.[0]?._id || sampleOrder?._id;
      }

      if (!testSubOrderId) {
        setSimulationState((prev) => ({
          ...prev,
          isSimulating: false,
          error: 'No active orders or shipments found to simulate dispatch. Please place a test order first.',
        }));
        return;
      }

      const res = await api.post(`/courier/dispatch-with-fallback/${testSubOrderId}`, {
        simulateFailureCarrier: simulationState.simulateFailCarrier,
      });

      if (res.data?.success) {
        setSimulationState((prev) => ({
          ...prev,
          isSimulating: false,
          result: res.data,
        }));
        fetchShipments();
      }
    } catch (err) {
      setSimulationState((prev) => ({
        ...prev,
        isSimulating: false,
        error: err.response?.data?.message || 'Fallback simulation error occurred',
      }));
    }
  };

  // Webhook milestone dispatch simulation
  const handleSendWebhook = async () => {
    if (!sandboxAwb) {
      alert('Please enter an AWB number first.');
      return;
    }
    setWebhookSimulator((prev) => ({ ...prev, isSending: true, feedback: null }));
    try {
      const res = await api.post(`/courier/webhook/${webhookSimulator.carrier.toLowerCase()}`, {
        awbCode: sandboxAwb,
        status: webhookSimulator.status,
        location: webhookSimulator.location,
        activity: webhookSimulator.remarks,
      });
      if (res.data?.success) {
        setWebhookSimulator((prev) => ({
          ...prev,
          isSending: false,
          feedback: `Webhook delivered successfully! Status updated to '${res.data.shipmentStatus}'.`,
        }));
        handleTrackAwb(sandboxAwb);
        fetchShipments();
      }
    } catch (err) {
      setWebhookSimulator((prev) => ({
        ...prev,
        isSending: false,
        feedback: err.response?.data?.message || 'Webhook simulation failed',
      }));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-purple-400">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex flex-wrap items-center gap-2">
                Multi-Carrier Third-Party Shipping & Fallback Engine
                <span className="text-xs bg-purple-400/10 text-purple-300 font-semibold px-2 py-0.5 rounded-full border border-purple-400/20">
                  Point #46 (Pillar 4)
                </span>
                <span className="text-xs bg-emerald-500/10 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Zero-Downtime Dispatch
                </span>
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">
                Multi-carrier rate comparison, dynamic zone routing & automated cascading fallback (Shiprocket ➔ Delhivery ➔ BlueDart ➔ Local Fleet).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => {
              fetchSettings();
              if (activeTab === 'fallback') fetchHealthRadar();
              if (activeTab === 'shipments') fetchShipments();
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition w-full md:w-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reload
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 px-5 py-2 bg-purple-500 hover:bg-purple-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-purple-500/20 transition w-full md:w-auto whitespace-nowrap"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
          <button onClick={() => setSaveSuccessMessage('')} className="text-xs text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {saveErrorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{saveErrorMessage}</span>
          </div>
          <button onClick={() => setSaveErrorMessage('')} className="text-xs text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Test Result Toast */}
      {testResult && (
        <div
          className={`p-4 rounded-xl text-sm flex items-start justify-between animate-fade-in ${
            testResult.success
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold">
              {testResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{testResult.message}</span>
            </div>
            {testResult.verifiedWarehouse && (
              <p className="text-xs text-slate-400">
                Verified Warehouse Hub: <strong className="text-white">{testResult.verifiedWarehouse}</strong> ({testResult.serviceablePincodes})
              </p>
            )}
          </div>
          <button onClick={() => setTestResult(null)} className="text-xs text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Master Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'settings'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
              : 'bg-slate-800/80 text-slate-400 hover:text-white'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Carrier Gateways & Credentials</span>
        </button>

        <button
          onClick={() => setActiveTab('fallback')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'fallback'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/25 ring-1 ring-purple-400'
              : 'bg-slate-800/80 text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4 text-purple-300" />
          <span>Automated Fallback Cascade (Point #46)</span>
        </button>

        <button
          onClick={() => setActiveTab('rate_matrix')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'rate_matrix'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
              : 'bg-slate-800/80 text-slate-400 hover:text-white'
          }`}
        >
          <DollarSign className="w-4 h-4 text-emerald-300" />
          <span>Live Rate Comparison Matrix (Point #46)</span>
        </button>

        <button
          onClick={() => setActiveTab('shipments')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'shipments'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
              : 'bg-slate-800/80 text-slate-400 hover:text-white'
          }`}
        >
          <Barcode className="w-4 h-4" />
          <span>Multi-Carrier Shipments & Fallback Dossier ({shipments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sandbox')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'sandbox'
              ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
              : 'bg-slate-800/80 text-slate-400 hover:text-white'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Tracking Sandbox & Webhook Simulator</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: COURIER API GATEWAYS & CREDENTIALS */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="space-y-6 animate-fade-in">
          {/* Global Aggregator Routing Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2 border-b border-slate-800 pb-3">
              <Layers className="w-5 h-5 text-purple-400" />
              <span>Default Aggregator Routing Strategy</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Default Platform Primary Carrier:
                </label>
                <select
                  value={courierSettings.defaultCourier}
                  onChange={(e) => setCourierSettings({ ...courierSettings, defaultCourier: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                >
                  <option value="SHIPROCKET">Shiprocket (Automated Multi-Carrier Engine)</option>
                  <option value="DELHIVERY">Delhivery Direct Express (Surface & Air)</option>
                  <option value="BLUEDART">BlueDart Aviation Express</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Automated AWB Generation:</label>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="autoAwb"
                    checked={courierSettings.autoGenerateAwb}
                    onChange={(e) => setCourierSettings({ ...courierSettings, autoGenerateAwb: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-purple-600 focus:ring-0"
                  />
                  <label htmlFor="autoAwb" className="text-xs text-slate-300">
                    Auto-create AWB on vendor order confirmation
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Automated Pickup Scheduling:</label>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="autoPickup"
                    checked={courierSettings.autoSchedulePickup}
                    onChange={(e) => setCourierSettings({ ...courierSettings, autoSchedulePickup: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-purple-600 focus:ring-0"
                  />
                  <label htmlFor="autoPickup" className="text-xs text-slate-300">
                    Auto-schedule rider pickup for next morning
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Aggregator Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ================= SHIPROCKET CARD ================= */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-orange-500/10 text-orange-400 rounded-2xl border border-orange-500/20 font-black text-sm">
                    SR
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">Shiprocket API</h4>
                    <p className="text-xs text-slate-400">29,000+ PIN Codes</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTestConnection('SHIPROCKET')}
                    disabled={testingCourier === 'SHIPROCKET'}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-orange-400 text-xs font-bold rounded-lg border border-slate-700 transition"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{testingCourier === 'SHIPROCKET' ? 'Testing...' : 'Test'}</span>
                  </button>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={courierSettings.shiprocket.enabled}
                      onChange={(e) =>
                        setCourierSettings({
                          ...courierSettings,
                          shiprocket: { ...courierSettings.shiprocket, enabled: e.target.checked },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Mode</label>
                    <select
                      value={courierSettings.shiprocket.mode}
                      onChange={(e) =>
                        setCourierSettings({
                          ...courierSettings,
                          shiprocket: { ...courierSettings.shiprocket, mode: e.target.value },
                        })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                    >
                      <option value="sandbox">Sandbox</option>
                      <option value="live">Live API</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">API Key</label>
                    <input
                      type="text"
                      value={courierSettings.shiprocket.apiKey}
                      onChange={(e) =>
                        setCourierSettings({
                          ...courierSettings,
                          shiprocket: { ...courierSettings.shiprocket, apiKey: e.target.value },
                        })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Account Email</label>
                  <input
                    type="email"
                    value={courierSettings.shiprocket.email}
                    onChange={(e) =>
                      setCourierSettings({
                        ...courierSettings,
                        shiprocket: { ...courierSettings.shiprocket, email: e.target.value },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-semibold text-slate-400">Password</label>
                    <button
                      type="button"
                      onClick={() => setEditShiprocketPassword(!editShiprocketPassword)}
                      className="text-[10px] text-orange-400 hover:underline"
                    >
                      {editShiprocketPassword ? 'Cancel' : 'Change'}
                    </button>
                  </div>
                  {editShiprocketPassword ? (
                    <input
                      type="password"
                      placeholder="New Shiprocket password"
                      value={shiprocketPassword}
                      onChange={(e) => setShiprocketPassword(e.target.value)}
                      className="w-full bg-slate-800 border border-orange-500 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={courierSettings.shiprocket.passwordMasked}
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-500 font-mono"
                    />
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Pickup Warehouse</label>
                  <input
                    type="text"
                    value={courierSettings.shiprocket.defaultPickupLocation}
                    onChange={(e) =>
                      setCourierSettings({
                        ...courierSettings,
                        shiprocket: { ...courierSettings.shiprocket, defaultPickupLocation: e.target.value },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* ================= DELHIVERY CARD ================= */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20 font-black text-sm">
                    DEL
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">Delhivery One</h4>
                    <p className="text-xs text-slate-400">Surface & Air Express</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTestConnection('DELHIVERY')}
                    disabled={testingCourier === 'DELHIVERY'}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-red-400 text-xs font-bold rounded-lg border border-slate-700 transition"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{testingCourier === 'DELHIVERY' ? 'Testing...' : 'Test'}</span>
                  </button>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={courierSettings.delhivery.enabled}
                      onChange={(e) =>
                        setCourierSettings({
                          ...courierSettings,
                          delhivery: { ...courierSettings.delhivery, enabled: e.target.checked },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Mode</label>
                    <select
                      value={courierSettings.delhivery.mode}
                      onChange={(e) =>
                        setCourierSettings({
                          ...courierSettings,
                          delhivery: { ...courierSettings.delhivery, mode: e.target.value },
                        })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                    >
                      <option value="sandbox">Sandbox</option>
                      <option value="live">Live Enterprise</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Client ID</label>
                    <input
                      type="text"
                      value={courierSettings.delhivery.clientName}
                      onChange={(e) =>
                        setCourierSettings({
                          ...courierSettings,
                          delhivery: { ...courierSettings.delhivery, clientName: e.target.value },
                        })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-semibold text-slate-400">Delhivery API Token</label>
                    <button
                      type="button"
                      onClick={() => setEditDelhiveryToken(!editDelhiveryToken)}
                      className="text-[10px] text-red-400 hover:underline"
                    >
                      {editDelhiveryToken ? 'Cancel' : 'Change'}
                    </button>
                  </div>
                  {editDelhiveryToken ? (
                    <input
                      type="password"
                      placeholder="Paste Delhivery API Token"
                      value={delhiveryToken}
                      onChange={(e) => setDelhiveryToken(e.target.value)}
                      className="w-full bg-slate-800 border border-red-500 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={courierSettings.delhivery.apiTokenMasked}
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-500 font-mono"
                    />
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Pickup Hub Address</label>
                  <input
                    type="text"
                    value={courierSettings.delhivery.pickupLocation}
                    onChange={(e) =>
                      setCourierSettings({
                        ...courierSettings,
                        delhivery: { ...courierSettings.delhivery, pickupLocation: e.target.value },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* ================= BLUEDART CARD ================= */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20 font-black text-sm">
                    BD
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">BlueDart Aviation</h4>
                    <p className="text-xs text-slate-400">Priority Cargo Network</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTestConnection('BLUEDART')}
                    disabled={testingCourier === 'BLUEDART'}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-bold rounded-lg border border-slate-700 transition"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{testingCourier === 'BLUEDART' ? 'Testing...' : 'Test'}</span>
                  </button>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={courierSettings.bluedart.enabled}
                      onChange={(e) =>
                        setCourierSettings({
                          ...courierSettings,
                          bluedart: { ...courierSettings.bluedart, enabled: e.target.checked },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Mode</label>
                    <select
                      value={courierSettings.bluedart.mode}
                      onChange={(e) =>
                        setCourierSettings({
                          ...courierSettings,
                          bluedart: { ...courierSettings.bluedart, mode: e.target.value },
                        })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                    >
                      <option value="sandbox">Sandbox</option>
                      <option value="live">Live Enterprise</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Login ID</label>
                    <input
                      type="text"
                      value={courierSettings.bluedart.loginId}
                      onChange={(e) =>
                        setCourierSettings({
                          ...courierSettings,
                          bluedart: { ...courierSettings.bluedart, loginId: e.target.value },
                        })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-semibold text-slate-400">License Key</label>
                    <button
                      type="button"
                      onClick={() => setEditBluedartKey(!editBluedartKey)}
                      className="text-[10px] text-blue-400 hover:underline"
                    >
                      {editBluedartKey ? 'Cancel' : 'Change'}
                    </button>
                  </div>
                  {editBluedartKey ? (
                    <input
                      type="password"
                      placeholder="Paste BlueDart License Key"
                      value={bluedartKey}
                      onChange={(e) => setBluedartKey(e.target.value)}
                      className="w-full bg-slate-800 border border-blue-500 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={courierSettings.bluedart.licenseKeyMasked}
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-500 font-mono"
                    />
                  )}
                </div>

                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 text-[11px] text-slate-400">
                  Aviation SLA: Next-day express air delivery for Metro-to-Metro consignments.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AUTOMATED FALLBACK CASCADE & STRATEGY HUB (POINT #46) */}
      {/* ========================================================================= */}
      {activeTab === 'fallback' && (
        <div className="space-y-6 animate-fade-in">
          {/* Fallback Priority Cascade & Strategy Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-purple-400" />
                  <span>Cascading Multi-Carrier Fallback Hierarchy</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  If the primary carrier API is down, rate-limited, or fails handshake, the system automatically cascades down this hierarchy without blocking orders.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300">Automated Fallback:</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={courierSettings.autoFallbackEnabled}
                    onChange={(e) =>
                      setCourierSettings({ ...courierSettings, autoFallbackEnabled: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>

            {/* Hierarchy Reorderable Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {courierSettings.fallbackHierarchy.map((carrier, index) => {
                const badgeColors = {
                  SHIPROCKET: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
                  DELHIVERY: 'border-red-500/30 bg-red-500/10 text-red-400',
                  BLUEDART: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
                  LOCAL_FLEET: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
                };

                return (
                  <div
                    key={carrier}
                    className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex flex-col justify-between space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Priority Level #{index + 1}
                      </span>
                      {index === 0 && (
                        <span className="text-[9px] bg-purple-500 text-slate-950 font-black px-2 py-0.5 rounded-full">
                          PRIMARY
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl border font-black text-xs ${badgeColors[carrier] || 'text-white'}`}>
                        {carrier.slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{carrier}</div>
                        <div className="text-[10px] text-slate-400">
                          {carrier === 'LOCAL_FLEET'
                            ? 'Emergency Hyperlocal Fleet'
                            : 'Third-Party Aggregator'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
                      <span className="text-[10px] text-slate-400">Adjust Order:</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveCarrierHierarchy(index, -1)}
                          className="p-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:hover:bg-slate-700 text-slate-200 transition"
                          title="Move Higher Priority"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === courierSettings.fallbackHierarchy.length - 1}
                          onClick={() => moveCarrierHierarchy(index, 1)}
                          className="p-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:hover:bg-slate-700 text-slate-200 transition"
                          title="Move Lower Priority"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Optimization Strategy & Thresholds */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Rate & Speed Optimization Strategy:
                </label>
                <select
                  value={courierSettings.rateOptimizationStrategy}
                  onChange={(e) =>
                    setCourierSettings({ ...courierSettings, rateOptimizationStrategy: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400 font-medium"
                >
                  <option value="BALANCED">Balanced (Optimized Cost + Delivery SLA Score)</option>
                  <option value="CHEAPEST">Cheapest Carrier (Strict Minimum Freight Rate)</option>
                  <option value="FASTEST">Fastest Delivery SLA (Aviation & Express Surface)</option>
                  <option value="PREFERRED_CARRIER">Preferred Carrier (Always Try Default First)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Algorithm automatically computes transit days vs cost trade-offs per package dimensions.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Max Transit SLA Threshold (Days):
                </label>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={courierSettings.maxTransitDaysThreshold}
                  onChange={(e) =>
                    setCourierSettings({ ...courierSettings, maxTransitDaysThreshold: Number(e.target.value) })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Carriers quoting transit time exceeding this limit will be disqualified during routing.
                </p>
              </div>
            </div>
          </div>

          {/* Real-Time Carrier Health Radar */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <span>Real-Time Carrier API Latency & Health Radar</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live uptime and endpoint latency pings across integrated multi-carrier gateways.
                </p>
              </div>
              <button
                onClick={fetchHealthRadar}
                disabled={isHealthLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isHealthLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Radar</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {(healthData?.healthStatuses || [
                { courier: 'SHIPROCKET', status: 'HEALTHY', latencyMs: 34, uptimePercentage: 99.96, mode: 'sandbox' },
                { courier: 'DELHIVERY', status: 'HEALTHY', latencyMs: 42, uptimePercentage: 99.92, mode: 'sandbox' },
                { courier: 'BLUEDART', status: 'HEALTHY', latencyMs: 25, uptimePercentage: 99.98, mode: 'sandbox' },
                { courier: 'LOCAL_FLEET', status: 'HEALTHY', latencyMs: 8, uptimePercentage: 100.0, mode: 'internal' },
              ]).map((c) => (
                <div
                  key={c.courier}
                  className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">{c.courier}</span>
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                        c.status === 'HEALTHY'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>API Latency:</span>
                      <span className="font-mono text-emerald-400 font-bold">{c.latencyMs}ms</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Uptime:</span>
                      <span className="font-mono text-white font-bold">{c.uptimePercentage}%</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Mode:</span>
                      <span className="uppercase text-[10px] text-purple-300 font-bold">{c.mode}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Fallback Simulation Test Suite */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Play className="w-5 h-5 text-amber-400" />
                <span>Interactive Cascading Fallback Simulator</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulate third-party courier gateway timeout (HTTP 504) and verify that the fallback engine instantly engages the next carrier in line without customer disruption.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-slate-400 block mb-1">Simulate Gateway Outage on Carrier:</label>
                <select
                  value={simulationState.simulateFailCarrier}
                  onChange={(e) => setSimulationState({ ...simulationState, simulateFailCarrier: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="SHIPROCKET">Shiprocket (Simulate 504 Gateway Timeout)</option>
                  <option value="DELHIVERY">Delhivery (Simulate API Rate-Limit 429)</option>
                  <option value="BLUEDART">BlueDart (Simulate Network Socket Error)</option>
                </select>
              </div>

              <div className="sm:self-end">
                <button
                  type="button"
                  disabled={simulationState.isSimulating}
                  onClick={handleSimulateFallback}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 transition w-full sm:w-auto"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>{simulationState.isSimulating ? 'Executing Cascade...' : 'Simulate & Dispatch Fallback'}</span>
                </button>
              </div>
            </div>

            {simulationState.error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {simulationState.error}
              </div>
            )}

            {simulationState.result && (
              <div className="bg-slate-800/80 rounded-2xl p-5 border border-purple-500/30 space-y-4 animate-fade-in">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-700 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold text-sm text-white">
                      Fallback Cascade Successfully Executed!
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded">
                      AWB: {simulationState.result.awbCode}
                    </span>
                    <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded">
                      Active Carrier: {simulationState.result.activeCarrier}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Cascading Handshake Audit Trail:
                  </h5>
                  <div className="space-y-2">
                    {simulationState.result.attempts?.map((att, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex items-start gap-3 text-xs ${
                          att.success
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                        }`}
                      >
                        <div className="mt-0.5">
                          {att.success ? (
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center font-bold">
                            <span>Attempt #{idx + 1}: Carrier {att.courier}</span>
                            <span className="font-mono text-[10px]">{att.latencyMs}ms</span>
                          </div>
                          <p className="text-[11px] mt-0.5 opacity-90">{att.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LIVE RATE COMPARISON MATRIX & CALCULATOR (POINT #46) */}
      {/* ========================================================================= */}
      {activeTab === 'rate_matrix' && (
        <div className="space-y-6 animate-fade-in">
          {/* Rate Calculator Input Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  <span>Real-Time Volumetric & Deadweight Rate Estimator</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Calculate and compare multi-carrier freight quotes across India with zone multipliers and COD charges.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCompareRates}
                disabled={isCalculatingRates}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 transition"
              >
                <DollarSign className="w-4 h-4" />
                <span>{isCalculatingRates ? 'Comparing Rates...' : 'Compare Carrier Quotes'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Origin Pincode (Warehouse):</label>
                <input
                  type="text"
                  value={rateQuery.pickupPincode}
                  onChange={(e) => setRateQuery({ ...rateQuery, pickupPincode: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Delivery Pincode (Destination):</label>
                <input
                  type="text"
                  value={rateQuery.deliveryPincode}
                  onChange={(e) => setRateQuery({ ...rateQuery, deliveryPincode: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Deadweight (KG):</label>
                <input
                  type="number"
                  step="0.1"
                  value={rateQuery.weightKg}
                  onChange={(e) => setRateQuery({ ...rateQuery, weightKg: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Declared Value (₹):</label>
                <input
                  type="number"
                  value={rateQuery.declaredValue}
                  onChange={(e) => setRateQuery({ ...rateQuery, declaredValue: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Dimensions (L x W x H cm):</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    placeholder="L"
                    value={rateQuery.lengthCm}
                    onChange={(e) => setRateQuery({ ...rateQuery, lengthCm: Number(e.target.value) })}
                    className="w-1/3 bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-white font-mono text-center"
                  />
                  <input
                    type="number"
                    placeholder="W"
                    value={rateQuery.widthCm}
                    onChange={(e) => setRateQuery({ ...rateQuery, widthCm: Number(e.target.value) })}
                    className="w-1/3 bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-white font-mono text-center"
                  />
                  <input
                    type="number"
                    placeholder="H"
                    value={rateQuery.heightCm}
                    onChange={(e) => setRateQuery({ ...rateQuery, heightCm: Number(e.target.value) })}
                    className="w-1/3 bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-white font-mono text-center"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 self-end mb-2">
                <input
                  type="checkbox"
                  id="calcIsCod"
                  checked={rateQuery.isCod}
                  onChange={(e) => setRateQuery({ ...rateQuery, isCod: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                />
                <label htmlFor="calcIsCod" className="text-slate-300 font-semibold cursor-pointer">
                  Cash on Delivery (COD Order)
                </label>
              </div>
            </div>
          </div>

          {/* Rate Comparison Cards */}
          {rateComparisonResults && (
            <div className="space-y-4">
              {/* Query Summary Strip */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div>
                  <span className="text-slate-400">Calculated Zone:</span>{' '}
                  <span className="font-bold text-white">{rateComparisonResults.query?.zoneName}</span> (
                  <span className="font-mono text-emerald-400">{rateComparisonResults.query?.zoneCode}</span> -{' '}
                  {rateComparisonResults.query?.zoneMultiplier}x)
                </div>
                <div>
                  <span className="text-slate-400">Chargeable Weight:</span>{' '}
                  <span className="font-bold text-white">
                    {rateComparisonResults.query?.chargeableWeightKg} KG
                  </span>{' '}
                  <span className="text-slate-500">
                    (Dead: {rateComparisonResults.query?.weightKg}kg / Volumetric:{' '}
                    {rateComparisonResults.query?.volumetricWeightKg}kg)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Optimization Engine:</span>{' '}
                  <span className="font-bold text-purple-400 uppercase">
                    {rateComparisonResults.optimizationStrategy}
                  </span>
                </div>
              </div>

              {/* Matrix Columns */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {rateComparisonResults.comparisons?.map((c) => {
                  const isRecommended = c.courier === rateComparisonResults.recommendedCarrier;
                  const isCheapest = c.courier === rateComparisonResults.cheapestCarrier;
                  const isFastest = c.courier === rateComparisonResults.fastestCarrier;

                  return (
                    <div
                      key={c.courier}
                      className={`rounded-2xl p-5 border flex flex-col justify-between space-y-4 transition ${
                        isRecommended
                          ? 'bg-gradient-to-b from-purple-950/40 to-slate-900 border-purple-500 shadow-xl shadow-purple-950/30 ring-1 ring-purple-500'
                          : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm text-white">{c.courier}</span>
                          {isRecommended && (
                            <span className="text-[9px] bg-purple-500 text-slate-950 font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              RECOMMENDED
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">{c.carrierName}</p>

                        <div className="flex flex-wrap gap-1 pt-1">
                          {isCheapest && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
                              Cheapest Rate
                            </span>
                          )}
                          {isFastest && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold">
                              Fastest Transit
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Pricing Breakdown */}
                      <div className="space-y-1.5 text-xs border-t border-slate-800 pt-3">
                        <div className="flex justify-between text-slate-400">
                          <span>Base Freight:</span>
                          <span className="font-mono text-slate-200">₹{c.freightCharged}</span>
                        </div>
                        {c.codFee > 0 && (
                          <div className="flex justify-between text-slate-400">
                            <span>COD Fee:</span>
                            <span className="font-mono text-slate-200">₹{c.codFee}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-400">
                          <span>Fuel & Taxes (18%):</span>
                          <span className="font-mono text-slate-200">₹{c.fuelAndGst}</span>
                        </div>
                        <div className="flex justify-between text-emerald-400">
                          <span>Platform Discount:</span>
                          <span className="font-mono">-₹{c.carrierDiscount}</span>
                        </div>
                      </div>

                      {/* Total and SLA */}
                      <div className="border-t border-slate-800 pt-3 space-y-1">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-slate-400">Total Charge:</span>
                          <span className="text-xl font-black text-white font-mono">₹{c.finalCharge}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] text-slate-400">
                          <span>Transit SLA:</span>
                          <span className="font-bold text-emerald-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {c.estimatedTransitDays} Day(s)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MULTI-CARRIER SHIPMENTS & FALLBACK AUDIT DOSSIER */}
      {/* ========================================================================= */}
      {activeTab === 'shipments' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Barcode className="w-5 h-5 text-purple-400" />
                <span>Multi-Carrier Dispatch Manifests & Fallback Dossier</span>
              </h3>
              <p className="text-xs text-slate-400">
                Track electronic manifests, active carrier partners, and cascading fallback events.
              </p>
            </div>
            <button
              onClick={fetchShipments}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
            >
              Refresh Shipments
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">AWB No</th>
                  <th className="py-3 px-3">Carrier Partner</th>
                  <th className="py-3 px-3">Routing Engine</th>
                  <th className="py-3 px-3">Order No</th>
                  <th className="py-3 px-3">Destination</th>
                  <th className="py-3 px-3">Charge & SLA</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {shipments.map((s) => {
                  const hasFallback = s.fallbackDetails?.fallbackApplied;

                  return (
                    <tr key={s._id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 font-mono font-bold text-purple-400">{s.awbCode}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-white text-xs">{s.courierPartner}</span>
                      </td>
                      <td className="py-3 px-3">
                        {hasFallback ? (
                          <button
                            type="button"
                            onClick={() => setSelectedAttemptsModal(s)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition"
                          >
                            <Zap className="w-3 h-3 text-amber-400" />
                            <span>Fallback Active ({s.fallbackDetails.originalCourier} ➔ {s.courierPartner})</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Check className="w-3 h-3" />
                            <span>Primary Routing</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">{s.orderNumber}</td>
                      <td className="py-3 px-3 text-slate-300">
                        {s.customerDetails?.city}, {s.customerDetails?.state} ({s.customerDetails?.pincode})
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-white">
                          ₹{s.rateDetails?.finalCharge || 70}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {s.rateDetails?.estimatedTransitDays || 3} days transit
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full font-bold">
                          {s.shipmentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setTrackingModalData(s);
                            handleTrackAwb(s.awbCode);
                            setActiveTab('sandbox');
                            setSandboxAwb(s.awbCode);
                          }}
                          className="p-1.5 text-slate-400 hover:text-white transition"
                          title="Live Tracking & Milestones"
                        >
                          <Search className="w-4 h-4" />
                        </button>
                        <a
                          href={`http://127.0.0.1:5055/api/courier/label/${s.awbCode}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-400 hover:text-purple-400 transition inline-block"
                          title="Print 4x6 Label"
                        >
                          <Printer className="w-4 h-4" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
                {shipments.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No courier shipments booked yet. Shipments appear here when vendors generate AWBs!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fallback Attempts Detail Modal */}
      {selectedAttemptsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h4 className="font-bold text-white text-base">Fallback Handshake Audit Trail</h4>
                <p className="text-xs text-slate-400 font-mono">AWB: {selectedAttemptsModal.awbCode}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAttemptsModal(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {selectedAttemptsModal.fallbackDetails?.attempts?.map((att, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-start gap-3 text-xs ${
                    att.success
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                  }`}
                >
                  <div className="mt-0.5">
                    {att.success ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center font-bold">
                      <span>Attempt #{idx + 1}: Carrier {att.courier}</span>
                      <span className="font-mono text-[10px]">{att.latencyMs}ms</span>
                    </div>
                    <p className="text-[11px] mt-0.5 opacity-90">{att.reason}</p>
                    <span className="text-[9px] text-slate-500 block mt-1">
                      {new Date(att.attemptedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setSelectedAttemptsModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
              >
                Close Audit Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: AWB LIVE TRACKING SANDBOX & WEBHOOK SIMULATOR */}
      {/* ========================================================================= */}
      {activeTab === 'sandbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          {/* Tracking Query Column */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Search className="w-5 h-5 text-amber-400" />
                  <span>Real-Time Courier AWB Tracking Sandbox</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Input any Air Waybill (AWB) number to inspect live multi-carrier status updates.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                placeholder="e.g. SR-78921849 or DEL-44910284"
                value={sandboxAwb}
                onChange={(e) => setSandboxAwb(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={() => handleTrackAwb(sandboxAwb)}
                disabled={isTrackingLoading || !sandboxAwb}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition shadow-lg shadow-amber-500/20 whitespace-nowrap"
              >
                {isTrackingLoading ? 'Querying...' : 'Track AWB'}
              </button>
            </div>

            {sandboxTrackingResult && !sandboxTrackingResult.error && (
              <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700 space-y-5 animate-fade-in">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-700 pb-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Carrier & AWB</span>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white text-lg font-mono">{sandboxTrackingResult.awbCode}</span>
                      <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-bold">
                        {sandboxTrackingResult.courierPartner}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Estimated Delivery</span>
                    <span className="text-xs font-bold text-emerald-400">
                      {sandboxTrackingResult.estimatedDeliveryDate
                        ? new Date(sandboxTrackingResult.estimatedDeliveryDate).toDateString()
                        : 'Within 2-3 Days'}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Shipment Progress:</span>
                    <span className="font-bold text-amber-400">{sandboxTrackingResult.progressPercent}% Completed</span>
                  </div>
                  <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 via-amber-400 to-emerald-400 h-full transition-all duration-500"
                      style={{ width: `${sandboxTrackingResult.progressPercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Milestones History */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Transit History Events</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {sandboxTrackingResult.history?.map((h, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                        <div className="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg mt-0.5">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-xs text-white">{h.status}</span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 mt-0.5">{h.activity}</p>
                          {h.location && <span className="text-[10px] text-slate-500 mt-0.5 block">📍 {h.location}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {sandboxTrackingResult?.error && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {sandboxTrackingResult.error}
              </div>
            )}
          </div>

          {/* Webhook Callback Simulator Column */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Radio className="w-5 h-5 text-purple-400" />
                <span>Third-Party Courier Webhook Simulator</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulate inbound HTTP webhook callbacks from Shiprocket, Delhivery, or BlueDart gateways to verify automated tracking milestone synchronization.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Simulating Gateway:</label>
                <select
                  value={webhookSimulator.carrier}
                  onChange={(e) => setWebhookSimulator({ ...webhookSimulator, carrier: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="SHIPROCKET">Shiprocket Inbound Webhook</option>
                  <option value="DELHIVERY">Delhivery Transit Webhook</option>
                  <option value="BLUEDART">BlueDart Aviation Webhook</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Milestone Status to Trigger:</label>
                <select
                  value={webhookSimulator.status}
                  onChange={(e) => setWebhookSimulator({ ...webhookSimulator, status: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="PICKED_UP">PICKED_UP (Courier Rider Inwarded)</option>
                  <option value="IN_TRANSIT">IN_TRANSIT (Sorted in Transit Hub)</option>
                  <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY (Assigned to Last-Mile Rider)</option>
                  <option value="DELIVERED">DELIVERED (Customer Delivery Complete)</option>
                  <option value="RTO_INITIATED">RTO_INITIATED (Return to Origin)</option>
                  <option value="CANCELLED">CANCELLED (Shipment Cancelled)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Hub Location:</label>
                <input
                  type="text"
                  value={webhookSimulator.location}
                  onChange={(e) => setWebhookSimulator({ ...webhookSimulator, location: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Activity Remarks:</label>
                <textarea
                  rows="2"
                  value={webhookSimulator.remarks}
                  onChange={(e) => setWebhookSimulator({ ...webhookSimulator, remarks: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <button
                type="button"
                onClick={handleSendWebhook}
                disabled={webhookSimulator.isSending || !sandboxAwb}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black shadow-lg shadow-purple-600/20 transition"
              >
                <Send className="w-4 h-4" />
                <span>{webhookSimulator.isSending ? 'Sending Webhook...' : 'Fire Webhook Milestone'}</span>
              </button>

              {webhookSimulator.feedback && (
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs">
                  {webhookSimulator.feedback}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
