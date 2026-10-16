import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  Save,
  Eye,
  EyeOff,
  ExternalLink,
  Zap,
  Activity,
  Lock,
  Globe,
  Smartphone,
  Banknote,
  DollarSign,
  HelpCircle,
} from 'lucide-react';
import api from '../api/client';

export const PaymentGatewayManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingGateway, setTestingGateway] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [showSecrets, setShowSecrets] = useState({});
  const [notification, setNotification] = useState(null);

  const [gateways, setGateways] = useState({
    cod: {
      enabled: true,
      label: 'Cash on Delivery (COD)',
      minOrderAmount: 0,
      maxOrderAmount: 50000,
    },
    upi: {
      enabled: true,
      upiId: '8533955333@paytm',
      merchantName: 'AuraMarket Store',
    },
    razorpay: {
      enabled: true,
      mode: 'test',
      keyId: 'rzp_test_AuraMarket2026',
      keySecret: '••••••••2026',
      webhookSecret: '',
    },
    stripe: {
      enabled: true,
      mode: 'test',
      publishableKey: 'pk_test_51MockStripeAuraMarket2026',
      secretKey: '••••••••2026',
      webhookSecret: '',
    },
    cashfree: {
      enabled: false,
      mode: 'test',
      appId: '',
      secretKey: '',
      apiVersion: '2023-08-01',
    },
    paypal: {
      enabled: false,
      mode: 'sandbox',
      clientId: '',
      clientSecret: '',
    },
    phonepe: {
      enabled: false,
      mode: 'uat',
      merchantId: '',
      saltKey: '',
      saltIndex: 1,
    },
    paytm: {
      enabled: false,
      mode: 'staging',
      merchantId: '',
      merchantKey: '',
      website: 'DEFAULT',
    },
  });

  const fetchGateways = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/payments/gateways');
      if (res.data?.success && res.data.data) {
        const d = res.data.data;
        setGateways({
          cod: {
            enabled: Boolean(d.cod?.enabled),
            label: d.cod?.label || 'Cash on Delivery (COD)',
            minOrderAmount: d.cod?.minOrderAmount || 0,
            maxOrderAmount: d.cod?.maxOrderAmount || 50000,
          },
          upi: {
            enabled: Boolean(d.upi?.enabled),
            upiId: d.upi?.upiId || '',
            merchantName: d.upi?.merchantName || '',
          },
          razorpay: {
            enabled: Boolean(d.razorpay?.enabled),
            mode: d.razorpay?.mode || 'test',
            keyId: d.razorpay?.keyId || '',
            keySecret: d.razorpay?.keySecretMasked || (d.razorpay?.hasSecret ? '••••••••' : ''),
            webhookSecret: d.razorpay?.webhookSecret || '',
          },
          stripe: {
            enabled: Boolean(d.stripe?.enabled),
            mode: d.stripe?.mode || 'test',
            publishableKey: d.stripe?.publishableKey || '',
            secretKey: d.stripe?.secretKeyMasked || (d.stripe?.hasSecret ? '••••••••' : ''),
            webhookSecret: d.stripe?.webhookSecret || '',
          },
          cashfree: {
            enabled: Boolean(d.cashfree?.enabled),
            mode: d.cashfree?.mode || 'test',
            appId: d.cashfree?.appId || '',
            secretKey: d.cashfree?.secretKeyMasked || (d.cashfree?.hasSecret ? '••••••••' : ''),
            apiVersion: d.cashfree?.apiVersion || '2023-08-01',
          },
          paypal: {
            enabled: Boolean(d.paypal?.enabled),
            mode: d.paypal?.mode || 'sandbox',
            clientId: d.paypal?.clientId || '',
            clientSecret: d.paypal?.clientSecretMasked || (d.paypal?.hasSecret ? '••••••••' : ''),
          },
          phonepe: {
            enabled: Boolean(d.phonepe?.enabled),
            mode: d.phonepe?.mode || 'uat',
            merchantId: d.phonepe?.merchantId || '',
            saltKey: d.phonepe?.saltKeyMasked || (d.phonepe?.hasSecret ? '••••••••' : ''),
            saltIndex: d.phonepe?.saltIndex || 1,
          },
          paytm: {
            enabled: Boolean(d.paytm?.enabled),
            mode: d.paytm?.mode || 'staging',
            merchantId: d.paytm?.merchantId || '',
            merchantKey: d.paytm?.merchantKeyMasked || (d.paytm?.hasSecret ? '••••••••' : ''),
            website: d.paytm?.website || 'DEFAULT',
          },
        });
      }
    } catch (err) {
      console.warn('Failed to fetch payment gateways, using active defaults:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGateways();
  }, []);

  const toggleShowSecret = (field) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const updateGatewayField = (gatewayKey, field, value) => {
    setGateways(prev => ({
      ...prev,
      [gatewayKey]: {
        ...prev[gatewayKey],
        [field]: value,
      },
    }));
  };

  const handleTestConnection = async (gatewayKey) => {
    setTestingGateway(gatewayKey);
    setTestResults(prev => ({ ...prev, [gatewayKey]: { testing: true } }));

    try {
      const g = gateways[gatewayKey];
      const credentials = {};

      if (gatewayKey === 'razorpay') {
        credentials.keyId = g.keyId;
        credentials.keySecret = g.keySecret;
      } else if (gatewayKey === 'stripe') {
        credentials.publishableKey = g.publishableKey;
        credentials.secretKey = g.secretKey;
      } else if (gatewayKey === 'cashfree') {
        credentials.appId = g.appId;
        credentials.secretKey = g.secretKey;
        credentials.apiVersion = g.apiVersion;
      } else if (gatewayKey === 'paypal') {
        credentials.clientId = g.clientId;
        credentials.clientSecret = g.clientSecret;
      } else if (gatewayKey === 'phonepe') {
        credentials.merchantId = g.merchantId;
        credentials.saltKey = g.saltKey;
        credentials.saltIndex = g.saltIndex;
      } else if (gatewayKey === 'paytm') {
        credentials.merchantId = g.merchantId;
        credentials.merchantKey = g.merchantKey;
      } else if (gatewayKey === 'upi') {
        credentials.upiId = g.upiId;
      }

      const res = await api.post('/admin/payments/test-connection', {
        gateway: gatewayKey,
        mode: g.mode || 'test',
        credentials,
      });

      if (res.data?.success) {
        setTestResults(prev => ({
          ...prev,
          [gatewayKey]: {
            success: true,
            latencyMs: res.data.latencyMs,
            message: res.data.message,
            timestamp: new Date().toLocaleTimeString(),
          },
        }));
      } else {
        setTestResults(prev => ({
          ...prev,
          [gatewayKey]: {
            success: false,
            message: res.data?.message || 'Connection test failed',
          },
        }));
      }
    } catch (err) {
      setTestResults(prev => ({
        ...prev,
        [gatewayKey]: {
          success: false,
          message: err.response?.data?.message || err.message || 'API connection failed',
        },
      }));
    } finally {
      setTestingGateway(null);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setNotification(null);
    try {
      const res = await api.put('/admin/payments/gateways', gateways);
      if (res.data?.success) {
        setNotification({
          type: 'success',
          text: '🎉 Payment gateway configurations saved and applied live across storefront checkouts!',
        });
        setTimeout(() => setNotification(null), 5000);
      }
    } catch (err) {
      setNotification({
        type: 'error',
        text: err.response?.data?.message || 'Failed to save payment gateway settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  const activeCount = Object.values(gateways).filter(g => g.enabled).length;

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <RotateCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
        <h4 className="text-sm font-bold text-slate-800">Loading Payment Gateways Controller...</h4>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
              Point #1: Enterprise Control Center
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-300 text-[10px] font-bold">
              {activeCount} of 8 Gateways Active
            </span>
          </div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-400" />
            Third-Party Payment Gateway GUI Settings Manager
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Configure live API credentials, toggle test/production modes, and verify gateway handshakes with 1-click diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchGateways}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700"
            title="Reload configurations"
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
            <span>Save & Apply Settings Live</span>
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

      {/* Gateways Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gateway 1: Razorpay */}
        <div
          className={`p-6 rounded-3xl border transition-all ${
            gateways.razorpay.enabled
              ? 'bg-white border-blue-200 shadow-md ring-1 ring-blue-500/10'
              : 'bg-slate-50 border-slate-200 opacity-90'
          }`}
        >
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 font-black text-lg">
                💳
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-slate-900 text-sm">Razorpay</h4>
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-black uppercase border border-blue-200">
                    India #1
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">Cards, UPI, NetBanking, EMI & Wallets</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={gateways.razorpay.enabled}
                onChange={e => updateGatewayField('razorpay', 'enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-slate-600 uppercase">Environment Mode</span>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => updateGatewayField('razorpay', 'mode', 'test')}
                  className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${
                    gateways.razorpay.mode === 'test' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Test (Sandbox)
                </button>
                <button
                  type="button"
                  onClick={() => updateGatewayField('razorpay', 'mode', 'live')}
                  className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${
                    gateways.razorpay.mode === 'live' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Live (Production)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Razorpay Key ID</label>
              <input
                type="text"
                placeholder="rzp_test_xxxxxx or rzp_live_xxxxxx"
                value={gateways.razorpay.keyId}
                onChange={e => updateGatewayField('razorpay', 'keyId', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Razorpay Key Secret</label>
              <div className="relative">
                <input
                  type={showSecrets.razorpay ? 'text' : 'password'}
                  placeholder="Enter Razorpay Key Secret"
                  value={gateways.razorpay.keySecret}
                  onChange={e => updateGatewayField('razorpay', 'keySecret', e.target.value)}
                  className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => toggleShowSecret('razorpay')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showSecrets.razorpay ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {testResults.razorpay && (
              <div
                className={`p-3 rounded-xl text-[11px] font-semibold flex items-start gap-2 ${
                  testResults.razorpay.success
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}
              >
                {testResults.razorpay.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{testResults.razorpay.success ? 'Handshake Verified' : 'Test Failed'}</span>
                    {testResults.razorpay.latencyMs && (
                      <span className="font-mono text-[10px] text-emerald-700 font-black">
                        ⚡ {testResults.razorpay.latencyMs}ms
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-slate-600">{testResults.razorpay.message}</p>
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <a
                href="https://dashboard.razorpay.com/#/app/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                <span>Razorpay Dashboard API Keys</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                type="button"
                onClick={() => handleTestConnection('razorpay')}
                disabled={testingGateway === 'razorpay'}
                className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[11px] flex items-center gap-1.5 transition-all"
              >
                {testingGateway === 'razorpay' ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                <span>Test Live Connection</span>
              </button>
            </div>
          </div>
        </div>

        {/* Gateway 2: Stripe */}
        <div
          className={`p-6 rounded-3xl border transition-all ${
            gateways.stripe.enabled
              ? 'bg-white border-indigo-200 shadow-md ring-1 ring-indigo-500/10'
              : 'bg-slate-50 border-slate-200 opacity-90'
          }`}
        >
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-lg">
                🌐
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-slate-900 text-sm">Stripe</h4>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase border border-indigo-200">
                    Global Cards
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">International Visa, Master, Apple & Google Pay</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={gateways.stripe.enabled}
                onChange={e => updateGatewayField('stripe', 'enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-slate-600 uppercase">Environment Mode</span>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => updateGatewayField('stripe', 'mode', 'test')}
                  className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${
                    gateways.stripe.mode === 'test' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Test (Sandbox)
                </button>
                <button
                  type="button"
                  onClick={() => updateGatewayField('stripe', 'mode', 'live')}
                  className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${
                    gateways.stripe.mode === 'live' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Live (Production)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Stripe Publishable Key</label>
              <input
                type="text"
                placeholder="pk_test_xxxxxx or pk_live_xxxxxx"
                value={gateways.stripe.publishableKey}
                onChange={e => updateGatewayField('stripe', 'publishableKey', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Stripe Secret Key</label>
              <div className="relative">
                <input
                  type={showSecrets.stripe ? 'text' : 'password'}
                  placeholder="Enter Stripe Secret Key"
                  value={gateways.stripe.secretKey}
                  onChange={e => updateGatewayField('stripe', 'secretKey', e.target.value)}
                  className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => toggleShowSecret('stripe')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showSecrets.stripe ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {testResults.stripe && (
              <div
                className={`p-3 rounded-xl text-[11px] font-semibold flex items-start gap-2 ${
                  testResults.stripe.success
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}
              >
                {testResults.stripe.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{testResults.stripe.success ? 'Handshake Verified' : 'Test Failed'}</span>
                    {testResults.stripe.latencyMs && (
                      <span className="font-mono text-[10px] text-emerald-700 font-black">
                        ⚡ {testResults.stripe.latencyMs}ms
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-slate-600">{testResults.stripe.message}</p>
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <a
                href="https://dashboard.stripe.com/apikeys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
              >
                <span>Stripe Dashboard API Keys</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                type="button"
                onClick={() => handleTestConnection('stripe')}
                disabled={testingGateway === 'stripe'}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[11px] flex items-center gap-1.5 transition-all"
              >
                {testingGateway === 'stripe' ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                <span>Test Live Connection</span>
              </button>
            </div>
          </div>
        </div>

        {/* Gateway 3: Cashfree */}
        <div
          className={`p-6 rounded-3xl border transition-all ${
            gateways.cashfree.enabled
              ? 'bg-white border-teal-200 shadow-md ring-1 ring-teal-500/10'
              : 'bg-slate-50 border-slate-200 opacity-90'
          }`}
        >
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-700 font-black text-lg">
                🏦
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-slate-900 text-sm">Cashfree Payments</h4>
                  <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 text-[10px] font-black uppercase border border-teal-200">
                    Auto-Splits
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">Fast UPI, 120+ NetBanking banks & Easy Payouts</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={gateways.cashfree.enabled}
                onChange={e => updateGatewayField('cashfree', 'enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-slate-600 uppercase">Environment Mode</span>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => updateGatewayField('cashfree', 'mode', 'test')}
                  className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${
                    gateways.cashfree.mode === 'test' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Test (Sandbox)
                </button>
                <button
                  type="button"
                  onClick={() => updateGatewayField('cashfree', 'mode', 'live')}
                  className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${
                    gateways.cashfree.mode === 'live' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Live (Production)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Cashfree App ID</label>
              <input
                type="text"
                placeholder="Enter Cashfree App ID"
                value={gateways.cashfree.appId}
                onChange={e => updateGatewayField('cashfree', 'appId', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Cashfree Secret Key</label>
              <div className="relative">
                <input
                  type={showSecrets.cashfree ? 'text' : 'password'}
                  placeholder="Enter Cashfree Secret Key"
                  value={gateways.cashfree.secretKey}
                  onChange={e => updateGatewayField('cashfree', 'secretKey', e.target.value)}
                  className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="button"
                  onClick={() => toggleShowSecret('cashfree')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showSecrets.cashfree ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {testResults.cashfree && (
              <div
                className={`p-3 rounded-xl text-[11px] font-semibold flex items-start gap-2 ${
                  testResults.cashfree.success
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}
              >
                {testResults.cashfree.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{testResults.cashfree.success ? 'Handshake Verified' : 'Test Failed'}</span>
                    {testResults.cashfree.latencyMs && (
                      <span className="font-mono text-[10px] text-emerald-700 font-black">
                        ⚡ {testResults.cashfree.latencyMs}ms
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-slate-600">{testResults.cashfree.message}</p>
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <a
                href="https://merchant.cashfree.com/merchants/login"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-teal-600 hover:underline flex items-center gap-1"
              >
                <span>Cashfree Merchant Portal</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                type="button"
                onClick={() => handleTestConnection('cashfree')}
                disabled={testingGateway === 'cashfree'}
                className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 font-bold text-[11px] flex items-center gap-1.5 transition-all"
              >
                {testingGateway === 'cashfree' ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                <span>Test Live Connection</span>
              </button>
            </div>
          </div>
        </div>

        {/* Gateway 4: PhonePe */}
        <div
          className={`p-6 rounded-3xl border transition-all ${
            gateways.phonepe.enabled
              ? 'bg-white border-purple-200 shadow-md ring-1 ring-purple-500/10'
              : 'bg-slate-50 border-slate-200 opacity-90'
          }`}
        >
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 font-black text-lg">
                📱
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-slate-900 text-sm">PhonePe PG</h4>
                  <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-black uppercase border border-purple-200">
                    Highest Success Rate
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">UPI Intent, Cards, QR & NetBanking</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={gateways.phonepe.enabled}
                onChange={e => updateGatewayField('phonepe', 'enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-slate-600 uppercase">Environment Mode</span>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => updateGatewayField('phonepe', 'mode', 'uat')}
                  className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${
                    gateways.phonepe.mode === 'uat' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  UAT (Sandbox)
                </button>
                <button
                  type="button"
                  onClick={() => updateGatewayField('phonepe', 'mode', 'live')}
                  className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${
                    gateways.phonepe.mode === 'live' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Live (Production)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Merchant ID</label>
                <input
                  type="text"
                  placeholder="MERCHANTUAT"
                  value={gateways.phonepe.merchantId}
                  onChange={e => updateGatewayField('phonepe', 'merchantId', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Key Index</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={gateways.phonepe.saltIndex}
                  onChange={e => updateGatewayField('phonepe', 'saltIndex', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-semibold text-slate-900 text-center focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Salt Key</label>
              <div className="relative">
                <input
                  type={showSecrets.phonepe ? 'text' : 'password'}
                  placeholder="Enter PhonePe Salt Key"
                  value={gateways.phonepe.saltKey}
                  onChange={e => updateGatewayField('phonepe', 'saltKey', e.target.value)}
                  className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => toggleShowSecret('phonepe')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showSecrets.phonepe ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {testResults.phonepe && (
              <div
                className={`p-3 rounded-xl text-[11px] font-semibold flex items-start gap-2 ${
                  testResults.phonepe.success
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}
              >
                {testResults.phonepe.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{testResults.phonepe.success ? 'Handshake Verified' : 'Test Failed'}</span>
                    {testResults.phonepe.latencyMs && (
                      <span className="font-mono text-[10px] text-emerald-700 font-black">
                        ⚡ {testResults.phonepe.latencyMs}ms
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-slate-600">{testResults.phonepe.message}</p>
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <a
                href="https://merchant.phonepe.com/"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-purple-600 hover:underline flex items-center gap-1"
              >
                <span>PhonePe Merchant Dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                type="button"
                onClick={() => handleTestConnection('phonepe')}
                disabled={testingGateway === 'phonepe'}
                className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-[11px] flex items-center gap-1.5 transition-all"
              >
                {testingGateway === 'phonepe' ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                <span>Test Live Connection</span>
              </button>
            </div>
          </div>
        </div>

        {/* Gateway 5: PayPal */}
        <div
          className={`p-6 rounded-3xl border transition-all ${
            gateways.paypal.enabled
              ? 'bg-white border-blue-300 shadow-md ring-1 ring-blue-500/10'
              : 'bg-slate-50 border-slate-200 opacity-90'
          }`}
        >
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-800 font-black text-lg">
                🅿️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-slate-900 text-sm">PayPal Express</h4>
                  <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 text-[10px] font-black uppercase border border-sky-200">
                    Worldwide
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">200+ countries, PayPal Wallet & Pay in 4</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={gateways.paypal.enabled}
                onChange={e => updateGatewayField('paypal', 'enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-700"></div>
            </label>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-slate-600 uppercase">Environment Mode</span>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => updateGatewayField('paypal', 'mode', 'sandbox')}
                  className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${
                    gateways.paypal.mode === 'sandbox' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Sandbox
                </button>
                <button
                  type="button"
                  onClick={() => updateGatewayField('paypal', 'mode', 'live')}
                  className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${
                    gateways.paypal.mode === 'live' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Live (Production)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">PayPal Client ID</label>
              <input
                type="text"
                placeholder="Enter PayPal Client ID"
                value={gateways.paypal.clientId}
                onChange={e => updateGatewayField('paypal', 'clientId', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">PayPal Client Secret</label>
              <div className="relative">
                <input
                  type={showSecrets.paypal ? 'text' : 'password'}
                  placeholder="Enter PayPal Secret"
                  value={gateways.paypal.clientSecret}
                  onChange={e => updateGatewayField('paypal', 'clientSecret', e.target.value)}
                  className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <button
                  type="button"
                  onClick={() => toggleShowSecret('paypal')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showSecrets.paypal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {testResults.paypal && (
              <div
                className={`p-3 rounded-xl text-[11px] font-semibold flex items-start gap-2 ${
                  testResults.paypal.success
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}
              >
                {testResults.paypal.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{testResults.paypal.success ? 'Handshake Verified' : 'Test Failed'}</span>
                    {testResults.paypal.latencyMs && (
                      <span className="font-mono text-[10px] text-emerald-700 font-black">
                        ⚡ {testResults.paypal.latencyMs}ms
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-slate-600">{testResults.paypal.message}</p>
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <a
                href="https://developer.paypal.com/dashboard/applications"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-sky-700 hover:underline flex items-center gap-1"
              >
                <span>PayPal Developer Dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                type="button"
                onClick={() => handleTestConnection('paypal')}
                disabled={testingGateway === 'paypal'}
                className="px-3 py-1.5 rounded-lg bg-sky-50 text-sky-800 hover:bg-sky-100 font-bold text-[11px] flex items-center gap-1.5 transition-all"
              >
                {testingGateway === 'paypal' ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                <span>Test Live Connection</span>
              </button>
            </div>
          </div>
        </div>

        {/* Gateway 6: Paytm */}
        <div
          className={`p-6 rounded-3xl border transition-all ${
            gateways.paytm.enabled
              ? 'bg-white border-blue-200 shadow-md ring-1 ring-blue-500/10'
              : 'bg-slate-50 border-slate-200 opacity-90'
          }`}
        >
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-100 flex items-center justify-center text-cyan-800 font-black text-lg">
                🪙
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-slate-900 text-sm">Paytm PG</h4>
                  <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 text-[10px] font-black uppercase border border-cyan-200">
                    Domestic
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">Paytm Wallet, Postpaid, UPI & Cards</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={gateways.paytm.enabled}
                onChange={e => updateGatewayField('paytm', 'enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
            </label>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-slate-600 uppercase">Environment Mode</span>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => updateGatewayField('paytm', 'mode', 'staging')}
                  className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${
                    gateways.paytm.mode === 'staging' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Staging (Test)
                </button>
                <button
                  type="button"
                  onClick={() => updateGatewayField('paytm', 'mode', 'live')}
                  className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${
                    gateways.paytm.mode === 'live' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Production (Live)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Merchant ID (MID)</label>
              <input
                type="text"
                placeholder="Enter Paytm Merchant ID"
                value={gateways.paytm.merchantId}
                onChange={e => updateGatewayField('paytm', 'merchantId', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Merchant Key</label>
              <div className="relative">
                <input
                  type={showSecrets.paytm ? 'text' : 'password'}
                  placeholder="Enter Paytm Merchant Key"
                  value={gateways.paytm.merchantKey}
                  onChange={e => updateGatewayField('paytm', 'merchantKey', e.target.value)}
                  className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => toggleShowSecret('paytm')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showSecrets.paytm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {testResults.paytm && (
              <div
                className={`p-3 rounded-xl text-[11px] font-semibold flex items-start gap-2 ${
                  testResults.paytm.success
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}
              >
                {testResults.paytm.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{testResults.paytm.success ? 'Handshake Verified' : 'Test Failed'}</span>
                    {testResults.paytm.latencyMs && (
                      <span className="font-mono text-[10px] text-emerald-700 font-black">
                        ⚡ {testResults.paytm.latencyMs}ms
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-slate-600">{testResults.paytm.message}</p>
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <a
                href="https://dashboard.paytm.com/"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-cyan-700 hover:underline flex items-center gap-1"
              >
                <span>Paytm Merchant Dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                type="button"
                onClick={() => handleTestConnection('paytm')}
                disabled={testingGateway === 'paytm'}
                className="px-3 py-1.5 rounded-lg bg-cyan-50 text-cyan-800 hover:bg-cyan-100 font-bold text-[11px] flex items-center gap-1.5 transition-all"
              >
                {testingGateway === 'paytm' ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                <span>Test Live Connection</span>
              </button>
            </div>
          </div>
        </div>

        {/* Gateway 7: Direct UPI & Dynamic QR */}
        <div
          className={`p-6 rounded-3xl border transition-all ${
            gateways.upi.enabled
              ? 'bg-white border-purple-200 shadow-md ring-1 ring-purple-500/10'
              : 'bg-slate-50 border-slate-200 opacity-90'
          }`}
        >
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 font-black text-lg">
                ⚡
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-slate-900 text-sm">Direct UPI & Dynamic QR</h4>
                  <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-black uppercase border border-purple-200">
                    0% Commission
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">Zero intermediary fee, instant settlement to bank VPA</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={gateways.upi.enabled}
                onChange={e => updateGatewayField('upi', 'enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Merchant UPI ID (VPA)</label>
              <input
                type="text"
                placeholder="storename@okhdfcbank or 9876543210@paytm"
                value={gateways.upi.upiId}
                onChange={e => updateGatewayField('upi', 'upiId', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Merchant Display Name</label>
              <input
                type="text"
                placeholder="AuraMarket Enterprise"
                value={gateways.upi.merchantName}
                onChange={e => updateGatewayField('upi', 'merchantName', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {testResults.upi && (
              <div
                className={`p-3 rounded-xl text-[11px] font-semibold flex items-start gap-2 ${
                  testResults.upi.success
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}
              >
                {testResults.upi.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{testResults.upi.success ? 'UPI VPA Valid' : 'Invalid UPI'}</span>
                  </div>
                  <p className="mt-0.5 text-slate-600">{testResults.upi.message}</p>
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleTestConnection('upi')}
                disabled={testingGateway === 'upi'}
                className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-[11px] flex items-center gap-1.5 transition-all"
              >
                {testingGateway === 'upi' ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                <span>Verify VPA Format</span>
              </button>
            </div>
          </div>
        </div>

        {/* Gateway 8: Cash on Delivery (COD) */}
        <div
          className={`p-6 rounded-3xl border transition-all ${
            gateways.cod.enabled
              ? 'bg-white border-emerald-200 shadow-md ring-1 ring-emerald-500/10'
              : 'bg-slate-50 border-slate-200 opacity-90'
          }`}
        >
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-lg">
                💵
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-slate-900 text-sm">Cash on Delivery (COD)</h4>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase border border-emerald-200">
                    Doorstep Cash
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">Collect physical tender upon rider delivery</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={gateways.cod.enabled}
                onChange={e => updateGatewayField('cod', 'enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Checkout Label</label>
              <input
                type="text"
                placeholder="Cash on Delivery (COD)"
                value={gateways.cod.label}
                onChange={e => updateGatewayField('cod', 'label', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Min Order Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={gateways.cod.minOrderAmount}
                  onChange={e => updateGatewayField('cod', 'minOrderAmount', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Max Order Amount (₹)</label>
                <input
                  type="number"
                  min="100"
                  value={gateways.cod.maxOrderAmount}
                  onChange={e => updateGatewayField('cod', 'maxOrderAmount', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-[11px] text-slate-500 font-medium">
              <span>Orders above ₹{gateways.cod.maxOrderAmount} will require prepaid checkout</span>
              <span className="font-bold text-emerald-700">Protected by RTO Guard</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentGatewayManager;
