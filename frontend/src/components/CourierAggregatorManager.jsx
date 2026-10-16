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
  ShieldCheck,
  PackageCheck,
  Building2,
  Send,
} from 'lucide-react';
import api from '../api/client';

export default function CourierAggregatorManager() {
  const [activeTab, setActiveTab] = useState('settings'); // 'settings' | 'shipments' | 'sandbox'
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
  });

  // Password editing toggles
  const [editShiprocketPassword, setEditShiprocketPassword] = useState(false);
  const [shiprocketPassword, setShiprocketPassword] = useState('');
  const [editDelhiveryToken, setEditDelhiveryToken] = useState(false);
  const [delhiveryToken, setDelhiveryToken] = useState('');

  // Ping Testing State
  const [testingCourier, setTestingCourier] = useState(null);
  const [testResult, setTestResult] = useState(null);

  // Shipments List State
  const [shipments, setShipments] = useState([]);
  const [shipmentsLoading, setShipmentsLoading] = useState(false);
  const [trackingModalData, setTrackingModalData] = useState(null);

  // Sandbox State
  const [sandboxAwb, setSandboxAwb] = useState('');
  const [sandboxTrackingResult, setSandboxTrackingResult] = useState(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/courier/settings');
      if (res.data?.success && res.data.data) {
        setCourierSettings(res.data.data);
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

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'shipments') {
      fetchShipments();
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
      };

      const res = await api.put('/admin/courier/settings', payload);
      if (res.data?.success) {
        setSaveSuccessMessage('Courier Aggregator API settings & tokens saved successfully!');
        setEditShiprocketPassword(false);
        setEditDelhiveryToken(false);
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-purple-400">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Direct Courier Aggregator API Integration
                <span className="text-xs bg-purple-400/10 text-purple-300 font-semibold px-2 py-0.5 rounded-full border border-purple-400/20">
                  Point #5 (28 Master Features)
                </span>
              </h2>
              <p className="text-sm text-slate-400">
                Shiprocket & Delhivery API token management, 1-click AWB generation, automated pickup scheduling & live tracking.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={fetchSettings}
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

      {/* Sub Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'settings'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
              : 'bg-slate-800/80 text-slate-400 hover:text-white'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Courier API Gateways</span>
        </button>

        <button
          onClick={() => setActiveTab('shipments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'shipments'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
              : 'bg-slate-800/80 text-slate-400 hover:text-white'
          }`}
        >
          <Barcode className="w-4 h-4" />
          <span>Live AWB Shipments ({shipments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sandbox')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'sandbox'
              ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
              : 'bg-slate-800/80 text-slate-400 hover:text-white'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>AWB Live Tracking Sandbox</span>
        </button>
      </div>

      {/* TAB 1: COURIER API GATEWAYS */}
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
                  Default Platform Courier Partner:
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ================= SHIPROCKET CARD ================= */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-orange-500/10 text-orange-400 rounded-2xl border border-orange-500/20 font-black text-sm">
                    SR
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">Shiprocket API Integration</h4>
                    <p className="text-xs text-slate-400">29,000+ PIN Codes with Smart Courier Recommendation</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTestConnection('SHIPROCKET')}
                    disabled={testingCourier === 'SHIPROCKET'}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-orange-400 text-xs font-bold rounded-lg border border-slate-700 transition"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{testingCourier === 'SHIPROCKET' ? 'Testing...' : 'Test Handshake'}</span>
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
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Environment Mode</label>
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
                      <option value="sandbox">Sandbox (Testing Simulator)</option>
                      <option value="live">Live Production API</option>
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
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Registered Account Email</label>
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
                    <label className="text-[11px] font-semibold text-slate-400">Account Password</label>
                    <button
                      type="button"
                      onClick={() => setEditShiprocketPassword(!editShiprocketPassword)}
                      className="text-[10px] text-orange-400 hover:underline"
                    >
                      {editShiprocketPassword ? 'Cancel' : 'Change Password'}
                    </button>
                  </div>
                  {editShiprocketPassword ? (
                    <input
                      type="password"
                      placeholder="Enter new Shiprocket password"
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
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Default Pickup Warehouse</label>
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
                    <h4 className="font-bold text-white text-base">Delhivery One Express</h4>
                    <p className="text-xs text-slate-400">Direct Surface & High-Speed Air Cargo Fleet</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTestConnection('DELHIVERY')}
                    disabled={testingCourier === 'DELHIVERY'}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-red-400 text-xs font-bold rounded-lg border border-slate-700 transition"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{testingCourier === 'DELHIVERY' ? 'Testing...' : 'Test Handshake'}</span>
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
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Environment Mode</label>
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
                      <option value="sandbox">Staging / Sandbox</option>
                      <option value="live">Live Enterprise API</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Client ID / Name</label>
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
                      {editDelhiveryToken ? 'Cancel' : 'Change Token'}
                    </button>
                  </div>
                  {editDelhiveryToken ? (
                    <input
                      type="password"
                      placeholder="Paste new Delhivery API Token"
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
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Primary Pickup Hub Address</label>
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
          </div>
        </div>
      )}

      {/* TAB 2: LIVE SHIPMENTS & AWBS */}
      {activeTab === 'shipments' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Barcode className="w-5 h-5 text-purple-400" />
                <span>Courier Aggregator Dispatch Manifests & AWBs</span>
              </h3>
              <p className="text-xs text-slate-400">
                Track electronic manifests transmitted to Shiprocket and Delhivery gateways.
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
                  <th className="py-3 px-3">Carrier</th>
                  <th className="py-3 px-3">Order No</th>
                  <th className="py-3 px-3">Destination</th>
                  <th className="py-3 px-3">Payment</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {shipments.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-mono font-bold text-purple-400">{s.awbCode}</td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-white text-xs">{s.courierPartner}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">{s.orderNumber}</td>
                    <td className="py-3 px-3 text-slate-300">
                      {s.customerDetails?.city}, {s.customerDetails?.state} ({s.customerDetails?.pincode})
                    </td>
                    <td className="py-3 px-3">
                      {s.packageDetails?.isCod ? (
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-bold">
                          COD ₹{s.packageDetails.codAmount}
                        </span>
                      ) : (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold">
                          PREPAID
                        </span>
                      )}
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
                        }}
                        className="p-1.5 text-slate-400 hover:text-white transition"
                        title="Live Tracking"
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
                ))}
                {shipments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No courier shipments booked yet. Shipments appear here when vendors generate AWBs!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AWB LIVE TRACKING SANDBOX */}
      {activeTab === 'sandbox' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 animate-fade-in">
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

          <div className="flex gap-3 max-w-xl">
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
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition shadow-lg shadow-amber-500/20"
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
                <div className="space-y-2">
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
      )}
    </div>
  );
}
