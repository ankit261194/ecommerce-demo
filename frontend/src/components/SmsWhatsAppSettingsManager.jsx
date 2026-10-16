import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  Save,
  Eye,
  EyeOff,
  ExternalLink,
  Send,
  Zap,
  Globe,
  Settings,
  Bell,
  Check,
} from 'lucide-react';
import api from '../api/client';

export const SmsWhatsAppSettingsManager = () => {
  const [activeTab, setActiveTab] = useState('sms'); // 'sms' | 'whatsapp'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showSecrets, setShowSecrets] = useState({});
  const [notification, setNotification] = useState(null);

  // Test Console Form
  const [testForm, setTestForm] = useState({
    channel: 'sms',
    phone: '9876543210',
    customMessage: 'AuraMarket Diagnostics: Your SMS gateway is active and fully functional!',
  });

  const [settings, setSettings] = useState({
    sms: {
      activeProvider: 'mock',
      fast2sms: { apiKey: '', senderId: 'FSTSMS', route: 'q' },
      msg91: { authKey: '', senderId: 'AURAMK', dltTemplateId: '' },
      twilio: { accountSid: '', authToken: '', fromPhone: '' },
      gupshup: { appId: '', apiKey: '', sourcePhone: '' },
      dltTemplates: {
        otpTemplateId: '1107161829381928',
        orderPlacedTemplateId: '1107161829381929',
        orderDispatchedTemplateId: '1107161829381930',
        orderDeliveredTemplateId: '1107161829381931',
      },
    },
    whatsapp: {
      enabled: true,
      provider: 'meta_cloud_api',
      phoneNumberId: '',
      businessAccountId: '',
      accessToken: '',
      templateNamespace: 'auramarket_commerce_alerts',
      apiVersion: 'v20.0',
      webhookVerifyToken: 'auramarket_wa_verify_2026',
      automatedAlerts: {
        orderConfirmation: true,
        outForDelivery: true,
        deliveryConfirmation: true,
        cartRecovery: true,
      },
    },
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/messaging/settings');
      if (res.data?.success && res.data.data) {
        const d = res.data.data;
        setSettings({
          sms: {
            activeProvider: d.sms?.activeProvider || 'mock',
            fast2sms: {
              apiKey: d.sms?.fast2sms?.apiKeyMasked || (d.sms?.fast2sms?.hasKey ? '••••••••' : ''),
              senderId: d.sms?.fast2sms?.senderId || 'FSTSMS',
              route: d.sms?.fast2sms?.route || 'q',
            },
            msg91: {
              authKey: d.sms?.msg91?.authKeyMasked || (d.sms?.msg91?.hasKey ? '••••••••' : ''),
              senderId: d.sms?.msg91?.senderId || 'AURAMK',
              dltTemplateId: d.sms?.msg91?.dltTemplateId || '',
            },
            twilio: {
              accountSid: d.sms?.twilio?.accountSidMasked || (d.sms?.twilio?.hasAccountSid ? '••••••••' : ''),
              authToken: d.sms?.twilio?.authTokenMasked || (d.sms?.twilio?.hasAuthToken ? '••••••••' : ''),
              fromPhone: d.sms?.twilio?.fromPhone || '',
            },
            gupshup: {
              appId: d.sms?.gupshup?.appId || '',
              apiKey: d.sms?.gupshup?.apiKeyMasked || (d.sms?.gupshup?.hasKey ? '••••••••' : ''),
              sourcePhone: d.sms?.gupshup?.sourcePhone || '',
            },
            dltTemplates: d.sms?.dltTemplates || {
              otpTemplateId: '1107161829381928',
              orderPlacedTemplateId: '1107161829381929',
              orderDispatchedTemplateId: '1107161829381930',
              orderDeliveredTemplateId: '1107161829381931',
            },
          },
          whatsapp: {
            enabled: Boolean(d.whatsapp?.enabled),
            provider: d.whatsapp?.provider || 'meta_cloud_api',
            phoneNumberId: d.whatsapp?.phoneNumberId || '',
            businessAccountId: d.whatsapp?.businessAccountId || '',
            accessToken: d.whatsapp?.accessTokenMasked || (d.whatsapp?.hasAccessToken ? '••••••••' : ''),
            templateNamespace: d.whatsapp?.templateNamespace || 'auramarket_commerce_alerts',
            apiVersion: d.whatsapp?.apiVersion || 'v20.0',
            webhookVerifyToken: d.whatsapp?.webhookVerifyToken || 'auramarket_wa_verify_2026',
            automatedAlerts: d.whatsapp?.automatedAlerts || {
              orderConfirmation: true,
              outForDelivery: true,
              deliveryConfirmation: true,
              cartRecovery: true,
            },
          },
        });
      }
    } catch (err) {
      console.warn('Failed to fetch messaging configurations, using defaults:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const toggleSecret = (field) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setNotification(null);
    try {
      const res = await api.put('/admin/messaging/settings', settings);
      if (res.data?.success) {
        setNotification({
          type: 'success',
          text: '🎉 SMS Gateway and Meta WhatsApp Cloud API settings saved successfully!',
        });
        setTimeout(() => setNotification(null), 5000);
      }
    } catch (err) {
      setNotification({
        type: 'error',
        text: err.response?.data?.message || 'Failed to save messaging configurations.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestDispatch = async (e) => {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);

    try {
      const res = await api.post('/admin/messaging/test-dispatch', {
        channel: testForm.channel,
        phone: testForm.phone,
        customMessage: testForm.customMessage,
        provider: testForm.channel === 'sms' ? settings.sms.activeProvider : 'meta_cloud_api',
      });

      if (res.data?.success) {
        setTestResult({
          success: true,
          channel: res.data.channel,
          latencyMs: res.data.latencyMs,
          messageId: res.data.messageId,
          message: res.data.message,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err.response?.data?.message || err.message || 'Dispatch failed',
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <RotateCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
        <h4 className="text-sm font-bold text-slate-800">Loading Messaging Gateways Controller...</h4>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
              Point #2: Enterprise Messaging Hub
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-300 text-[10px] font-bold">
              Active SMS: {settings.sms.activeProvider.toUpperCase()}
            </span>
          </div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-400" />
            Third-Party SMS & WhatsApp Cloud API Settings
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Configure Twilio, MSG91, Gupshup, Fast2SMS and Meta WhatsApp Business Cloud API with live test diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchSettings}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700"
            title="Reload settings"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
          >
            {saving ? <RotateCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Messaging Configurations</span>
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('sms')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
            activeTab === 'sms'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Smartphone className="w-4 h-4 text-emerald-400" />
          <span>SMS Gateways & DLT Registry</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('whatsapp')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
            activeTab === 'whatsapp'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Meta WhatsApp Business Cloud API</span>
          <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full bg-white/20 text-white">
            v20.0
          </span>
        </button>
      </div>

      {activeTab === 'sms' ? (
        <div className="space-y-6">
          {/* Active Provider Selector */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="font-black text-slate-900 text-sm">Select Primary SMS Transmission Engine</h4>
              <p className="text-xs text-slate-500 font-medium">
                OTP verification, order tracking alerts and vendor SMS will route through this provider.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {[
                { id: 'fast2sms', name: 'Fast2SMS (India)', flag: '🇮🇳' },
                { id: 'msg91', name: 'MSG91 Enterprise', flag: '⚡' },
                { id: 'twilio', name: 'Twilio Global', flag: '🌐' },
                { id: 'gupshup', name: 'Gupshup SMS', flag: '📱' },
                { id: 'mock', name: 'Sandbox Simulator', flag: '🧪' },
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSettings(prev => ({
                    ...prev,
                    sms: { ...prev.sms, activeProvider: p.id },
                  }))}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    settings.sms.activeProvider === p.id
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{p.flag}</span>
                  <span>{p.name}</span>
                  {settings.sms.activeProvider === p.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Providers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fast2SMS */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <span>Fast2SMS</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                    Indian DLT
                  </span>
                </h4>
                <a
                  href="https://www.fast2sms.com/dashboard/dev-api"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <span>Fast2SMS Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Authorization API Key</label>
                <div className="relative">
                  <input
                    type={showSecrets.fast2sms ? 'text' : 'password'}
                    placeholder="Enter Fast2SMS API Key"
                    value={settings.sms.fast2sms.apiKey}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      sms: { ...prev.sms, fast2sms: { ...prev.sms.fast2sms, apiKey: e.target.value } },
                    }))}
                    className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecret('fast2sms')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showSecrets.fast2sms ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Sender ID (6-Char)</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={settings.sms.fast2sms.senderId}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      sms: { ...prev.sms, fast2sms: { ...prev.sms.fast2sms, senderId: e.target.value.toUpperCase() } },
                    }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-900 text-center uppercase focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Route</label>
                  <input
                    type="text"
                    value={settings.sms.fast2sms.route}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      sms: { ...prev.sms, fast2sms: { ...prev.sms.fast2sms, route: e.target.value } },
                    }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-900 text-center focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* MSG91 */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <span>MSG91</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                    Enterprise DLT
                  </span>
                </h4>
                <a
                  href="https://msg91.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <span>MSG91 Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Auth Key</label>
                <div className="relative">
                  <input
                    type={showSecrets.msg91 ? 'text' : 'password'}
                    placeholder="Enter MSG91 Auth Key"
                    value={settings.sms.msg91.authKey}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      sms: { ...prev.sms, msg91: { ...prev.sms.msg91, authKey: e.target.value } },
                    }))}
                    className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecret('msg91')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showSecrets.msg91 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Sender ID</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={settings.sms.msg91.senderId}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      sms: { ...prev.sms, msg91: { ...prev.sms.msg91, senderId: e.target.value.toUpperCase() } },
                    }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-900 text-center uppercase focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">DLT Template ID</label>
                  <input
                    type="text"
                    placeholder="1107xxxxxxxxxxxx"
                    value={settings.sms.msg91.dltTemplateId}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      sms: { ...prev.sms, msg91: { ...prev.sms.msg91, dltTemplateId: e.target.value } },
                    }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Twilio */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <span>Twilio</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200">
                    Worldwide
                  </span>
                </h4>
                <a
                  href="https://console.twilio.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <span>Twilio Console</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Account SID</label>
                <input
                  type="text"
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={settings.sms.twilio.accountSid}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    sms: { ...prev.sms, twilio: { ...prev.sms.twilio, accountSid: e.target.value } },
                  }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Auth Token</label>
                  <div className="relative">
                    <input
                      type={showSecrets.twilio ? 'text' : 'password'}
                      placeholder="Auth Token"
                      value={settings.sms.twilio.authToken}
                      onChange={e => setSettings(prev => ({
                        ...prev,
                        sms: { ...prev.sms, twilio: { ...prev.sms.twilio, authToken: e.target.value } },
                      }))}
                      className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSecret('twilio')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showSecrets.twilio ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Sender Phone</label>
                  <input
                    type="text"
                    placeholder="+1234567890"
                    value={settings.sms.twilio.fromPhone}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      sms: { ...prev.sms, twilio: { ...prev.sms.twilio, fromPhone: e.target.value } },
                    }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Gupshup */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <span>Gupshup SMS</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
                    Carrier Grade
                  </span>
                </h4>
                <a
                  href="https://www.gupshup.io/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <span>Gupshup Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">API Key</label>
                <div className="relative">
                  <input
                    type={showSecrets.gupshup ? 'text' : 'password'}
                    placeholder="Enter Gupshup API Key"
                    value={settings.sms.gupshup.apiKey}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      sms: { ...prev.sms, gupshup: { ...prev.sms.gupshup, apiKey: e.target.value } },
                    }))}
                    className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecret('gupshup')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showSecrets.gupshup ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">App ID</label>
                  <input
                    type="text"
                    placeholder="AuraMarketSMS"
                    value={settings.sms.gupshup.appId}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      sms: { ...prev.sms, gupshup: { ...prev.sms.gupshup, appId: e.target.value } },
                    }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Source Phone</label>
                  <input
                    type="text"
                    placeholder="919876543210"
                    value={settings.sms.gupshup.sourcePhone}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      sms: { ...prev.sms, gupshup: { ...prev.sms.gupshup, sourcePhone: e.target.value } },
                    }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* DLT Template Registry */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div>
              <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                TRAI DLT Template ID Registry (India Compliance)
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Indian telecommunication regulations require pre-approved DLT Template IDs to transmit transactional messages without blocking.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">1. Customer Login OTP</label>
                <input
                  type="text"
                  value={settings.sms.dltTemplates.otpTemplateId}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    sms: { ...prev.sms, dltTemplates: { ...prev.sms.dltTemplates, otpTemplateId: e.target.value } },
                  }))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">2. Order Placed</label>
                <input
                  type="text"
                  value={settings.sms.dltTemplates.orderPlacedTemplateId}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    sms: { ...prev.sms, dltTemplates: { ...prev.sms.dltTemplates, orderPlacedTemplateId: e.target.value } },
                  }))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">3. Out For Delivery</label>
                <input
                  type="text"
                  value={settings.sms.dltTemplates.orderDispatchedTemplateId}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    sms: { ...prev.sms, dltTemplates: { ...prev.sms.dltTemplates, orderDispatchedTemplateId: e.target.value } },
                  }))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">4. Delivery OTP Verified</label>
                <input
                  type="text"
                  value={settings.sms.dltTemplates.orderDeliveredTemplateId}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    sms: { ...prev.sms, dltTemplates: { ...prev.sms.dltTemplates, orderDeliveredTemplateId: e.target.value } },
                  }))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* WhatsApp Cloud API Tab */
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-emerald-200 shadow-md space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-800 font-black text-xl">
                  💬
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">Meta WhatsApp Business Cloud API</h3>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase border border-emerald-300">
                      Official Meta
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    High deliverability notifications, auto-checkout recovery links and delivery confirmations via Graph API v20.0
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.whatsapp.enabled}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    whatsapp: { ...prev.whatsapp, enabled: e.target.checked },
                  }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Phone Number ID</label>
                <input
                  type="text"
                  placeholder="104859203928192"
                  value={settings.whatsapp.phoneNumberId}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    whatsapp: { ...prev.whatsapp, phoneNumberId: e.target.value },
                  }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">WhatsApp Business Account ID (WABA)</label>
                <input
                  type="text"
                  placeholder="982736192837461"
                  value={settings.whatsapp.businessAccountId}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    whatsapp: { ...prev.whatsapp, businessAccountId: e.target.value },
                  }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Meta System User Access Token (Permanent)</label>
                <div className="relative">
                  <input
                    type={showSecrets.waToken ? 'text' : 'password'}
                    placeholder="EAABwzLIX458BA..."
                    value={settings.whatsapp.accessToken}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      whatsapp: { ...prev.whatsapp, accessToken: e.target.value },
                    }))}
                    className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecret('waToken')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showSecrets.waToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Template Namespace / Name</label>
                <input
                  type="text"
                  value={settings.whatsapp.templateNamespace}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    whatsapp: { ...prev.whatsapp, templateNamespace: e.target.value },
                  }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Webhook Verify Token</label>
                <input
                  type="text"
                  value={settings.whatsapp.webhookVerifyToken}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    whatsapp: { ...prev.whatsapp, webhookVerifyToken: e.target.value },
                  }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Automated Triggers */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">
                Automated WhatsApp Event Triggers
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { key: 'orderConfirmation', label: 'Order Confirmation', desc: 'Instant bill & tracking link' },
                  { key: 'outForDelivery', label: 'Out for Delivery', desc: 'Rider ETA & delivery OTP' },
                  { key: 'deliveryConfirmation', label: 'Delivery Verified', desc: 'Doorstep thank-you & receipt' },
                  { key: 'cartRecovery', label: 'Cart Recovery (Point 21)', desc: '1-Click auto-checkout link' },
                ].map(item => (
                  <label key={item.key} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 cursor-pointer hover:bg-slate-100 transition-all">
                    <input
                      type="checkbox"
                      checked={settings.whatsapp.automatedAlerts[item.key]}
                      onChange={e => setSettings(prev => ({
                        ...prev,
                        whatsapp: {
                          ...prev.whatsapp,
                          automatedAlerts: {
                            ...prev.whatsapp.automatedAlerts,
                            [item.key]: e.target.checked,
                          },
                        },
                      }))}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-900">{item.label}</span>
                      <span className="block text-[10px] text-slate-500">{item.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1-Click Interactive Test Dispatch Console */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              1-Click Live Test Dispatcher Console
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Validate your active SMS or WhatsApp credentials by transmitting an instant test ping.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono text-[11px] font-bold">
            Channel: {testForm.channel.toUpperCase()}
          </span>
        </div>

        <form onSubmit={handleTestDispatch} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Select Channel</label>
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setTestForm({ ...testForm, channel: 'sms' })}
                className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${
                  testForm.channel === 'sms' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                SMS Gateway
              </button>
              <button
                type="button"
                onClick={() => setTestForm({ ...testForm, channel: 'whatsapp' })}
                className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${
                  testForm.channel === 'whatsapp' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                WhatsApp Cloud
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Recipient Mobile Number</label>
            <input
              type="text"
              placeholder="e.g. 9876543210"
              value={testForm.phone}
              onChange={e => setTestForm({ ...testForm, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
              required
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={testing}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {testing ? <RotateCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-emerald-400" />}
              <span>Dispatch Test {testForm.channel.toUpperCase()}</span>
            </button>
          </div>
        </form>

        {testResult && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 ${
              testResult.success
                ? 'bg-emerald-50 text-emerald-950 border border-emerald-200'
                : 'bg-rose-50 text-rose-950 border border-rose-200'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold">
                  {testResult.success ? 'Message Dispatched Successfully!' : 'Transmission Failed'}
                </span>
                {testResult.latencyMs && (
                  <span className="font-mono text-emerald-700 font-black">
                    ⚡ {testResult.latencyMs}ms | ID: {testResult.messageId}
                  </span>
                )}
              </div>
              <p className="mt-1 text-slate-700">{testResult.message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmsWhatsAppSettingsManager;
