import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Save,
  RotateCw,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Smartphone,
  Monitor,
  ExternalLink,
  Code,
  Layers,
  Sparkles,
  Server,
  ShieldCheck,
  Zap,
  Globe,
  Tag,
  Check,
} from 'lucide-react';
import api from '../api/client';

export const EmailTemplateManager = () => {
  const [activeTab, setActiveTab] = useState('templates'); // 'templates' | 'smtp'
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showSecrets, setShowSecrets] = useState({});
  const [notification, setNotification] = useState(null);

  // SMTP Settings State
  const [settings, setSettings] = useState({
    activeProvider: 'sandbox',
    smtp: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      username: 'notifications@auramarket.com',
      password: '',
      hasPassword: false,
      fromEmail: 'notifications@auramarket.com',
      fromName: 'AuraMarket Store',
    },
    sendgrid: {
      apiKey: '',
      hasApiKey: false,
      fromEmail: 'notifications@auramarket.com',
      fromName: 'AuraMarket Store',
    },
    ses: {
      accessKeyId: '',
      hasAccessKeyId: false,
      secretAccessKey: '',
      hasSecretAccessKey: false,
      region: 'ap-south-1',
      fromEmail: 'notifications@auramarket.com',
      fromName: 'AuraMarket Store',
    },
    brevo: {
      apiKey: '',
      hasApiKey: false,
      fromEmail: 'notifications@auramarket.com',
      fromName: 'AuraMarket Store',
    },
    mailgun: {
      apiKey: '',
      hasApiKey: false,
      domain: 'mg.auramarket.com',
      fromEmail: 'notifications@auramarket.com',
      fromName: 'AuraMarket Store',
    },
    templates: [],
  });

  // Template Studio State
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('welcome');
  const [editorSubject, setEditorSubject] = useState('');
  const [editorBodyHtml, setEditorBodyHtml] = useState('');
  const [editorEnabled, setEditorEnabled] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'
  const [renderedPreviewHtml, setRenderedPreviewHtml] = useState('');
  const [testEmailAddress, setTestEmailAddress] = useState('admin@auramarket.com');

  // Fetch Settings on Mount
  useEffect(() => {
    fetchSettings();
  }, []);

  // Update editor when selected template changes
  useEffect(() => {
    if (settings.templates && settings.templates.length > 0) {
      const activeTpl = settings.templates.find(t => t.templateKey === selectedTemplateKey) || settings.templates[0];
      if (activeTpl) {
        setEditorSubject(activeTpl.subject || '');
        setEditorBodyHtml(activeTpl.bodyHtml || '');
        setEditorEnabled(Boolean(activeTpl.enabled));
        fetchPreview(activeTpl.templateKey, activeTpl.bodyHtml, activeTpl.subject);
      }
    }
  }, [selectedTemplateKey, settings.templates]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/email/settings');
      if (res.data?.success) {
        const d = res.data.data;
        setSettings({
          activeProvider: d.activeProvider || 'sandbox',
          smtp: {
            ...d.smtp,
            password: d.smtp.hasPassword ? '••••••••' : '',
          },
          sendgrid: {
            ...d.sendgrid,
            apiKey: d.sendgrid.hasApiKey ? '••••••••' : '',
          },
          ses: {
            ...d.ses,
            accessKeyId: d.ses.hasAccessKeyId ? '••••••••' : '',
            secretAccessKey: d.ses.hasSecretAccessKey ? '••••••••' : '',
          },
          brevo: {
            ...d.brevo,
            apiKey: d.brevo.hasApiKey ? '••••••••' : '',
          },
          mailgun: {
            ...d.mailgun,
            apiKey: d.mailgun.hasApiKey ? '••••••••' : '',
          },
          templates: d.templates || [],
        });
      }
    } catch (err) {
      console.error('Failed to load email settings:', err);
      showToast('error', 'Failed to load email configurations from server.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreview = async (templateKey, bodyHtml, subject) => {
    try {
      const res = await api.post('/admin/email/preview', {
        templateKey,
        bodyHtml,
        subject,
      });
      if (res.data?.success) {
        setRenderedPreviewHtml(res.data.renderedHtml);
      }
    } catch (err) {
      console.error('Failed to render preview:', err);
    }
  };

  const showToast = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      const payload = {
        activeProvider: settings.activeProvider,
        smtp: settings.smtp,
        sendgrid: settings.sendgrid,
        ses: settings.ses,
        brevo: settings.brevo,
        mailgun: settings.mailgun,
      };

      const res = await api.put('/admin/email/settings', payload);
      if (res.data?.success) {
        showToast('success', 'Email & SMTP server settings updated and active live!');
        fetchSettings();
      }
    } catch (err) {
      console.error('Save error:', err);
      showToast('error', err.response?.data?.message || 'Failed to save email settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      setSavingTemplate(true);
      const res = await api.put(`/admin/email/templates/${selectedTemplateKey}`, {
        subject: editorSubject,
        bodyHtml: editorBodyHtml,
        enabled: editorEnabled,
      });

      if (res.data?.success) {
        showToast('success', `Template '${res.data.template.name}' saved and synced live!`);
        // Update local state
        setSettings(prev => ({
          ...prev,
          templates: prev.templates.map(t =>
            t.templateKey === selectedTemplateKey ? res.data.template : t
          ),
        }));
        fetchPreview(selectedTemplateKey, editorBodyHtml, editorSubject);
      }
    } catch (err) {
      console.error('Save template error:', err);
      showToast('error', err.response?.data?.message || 'Failed to update email template.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleResetTemplates = async () => {
    if (!window.confirm('Reset all 6 transactional templates to factory defaults? Custom HTML edits will be replaced.')) {
      return;
    }
    try {
      setLoading(true);
      const res = await api.post('/admin/email/templates/reset');
      if (res.data?.success) {
        showToast('success', 'All 6 templates restored to default responsive HTML!');
        setSettings(prev => ({ ...prev, templates: res.data.templates }));
        const cur = res.data.templates.find(t => t.templateKey === selectedTemplateKey) || res.data.templates[0];
        if (cur) {
          setEditorSubject(cur.subject);
          setEditorBodyHtml(cur.bodyHtml);
          fetchPreview(cur.templateKey, cur.bodyHtml, cur.subject);
        }
      }
    } catch (err) {
      console.error('Reset error:', err);
      showToast('error', 'Failed to reset email templates.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestDispatch = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const res = await api.post('/admin/email/test-dispatch', {
        email: testEmailAddress,
        provider: settings.activeProvider,
        templateKey: selectedTemplateKey,
      });
      if (res.data?.success) {
        setTestResult({
          success: true,
          message: res.data.message,
          latency: res.data.latencyMs,
          messageId: res.data.messageId,
          subject: res.data.subject,
          from: res.data.fromAddress,
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err.response?.data?.message || 'Email delivery failed. Verify host, port & credentials.',
      });
    } finally {
      setTesting(false);
    }
  };

  // Variable injection into editor
  const handleInsertVariable = (variableTag) => {
    setEditorBodyHtml(prev => prev + ' ' + variableTag + ' ');
    fetchPreview(selectedTemplateKey, editorBodyHtml + ' ' + variableTag, editorSubject);
  };

  const currentTemplate = settings.templates.find(t => t.templateKey === selectedTemplateKey) || {
    name: 'Template',
    variables: ['{{customer_name}}', '{{order_id}}', '{{store_name}}'],
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
        <RotateCw className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-700">Loading Email SMTP & Template Studio...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Alert */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-bold shadow-md transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="opacity-80 hover:opacity-100">
            ×
          </button>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                <Mail className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Visual Email SMTP & Drag-and-Drop HTML Template Studio
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Connect custom SMTP, Gmail, SendGrid, Amazon SES, or Brevo & customize 6 automated transactional emails.
                </p>
              </div>
            </div>
          </div>

          {/* Sub-tab Navigation */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${
                activeTab === 'templates'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>6 Transactional Templates</span>
            </button>
            <button
              onClick={() => setActiveTab('smtp')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${
                activeTab === 'smtp'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Server className="w-4 h-4" />
              <span>SMTP & Delivery Gateways</span>
            </button>
          </div>
        </div>

        {/* Live Test Email Dispatch Bar */}
        <div className="mt-6 p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-purple-700" />
                1-Click Live Test Dispatcher
              </h4>
              <p className="text-[11px] text-purple-700 font-medium">
                Verify server handshake & send sample email via active engine:{' '}
                <span className="font-mono font-bold uppercase">{settings.activeProvider}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="email"
                placeholder="admin@yourdomain.com"
                value={testEmailAddress}
                onChange={e => setTestEmailAddress(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-white border border-purple-300 text-xs font-bold text-slate-800 w-full sm:w-64"
              />
              <button
                onClick={handleTestDispatch}
                disabled={testing}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black text-xs shadow-sm transition-all whitespace-nowrap flex items-center gap-1.5"
              >
                {testing ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{testing ? 'Sending...' : 'Send Test Email'}</span>
              </button>
            </div>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                testResult.success ? 'bg-emerald-100 text-emerald-950' : 'bg-rose-100 text-rose-950'
              }`}
            >
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-700 flex-shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
              {testResult.latency && (
                <div className="flex items-center gap-3 text-[11px] font-mono opacity-90">
                  <span className="bg-white/80 px-2 py-0.5 rounded text-emerald-800">
                    ⚡ {testResult.latency}ms Handshake
                  </span>
                  <span>ID: {testResult.messageId}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: 6 TRANSACTIONAL TEMPLATES STUDIO */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Templates Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 px-1">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Automated Templates
                </span>
                <button
                  onClick={handleResetTemplates}
                  className="text-[11px] font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                  title="Reset to factory responsive designs"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Reset All</span>
                </button>
              </div>

              {settings.templates.map(tpl => {
                const isSelected = tpl.templateKey === selectedTemplateKey;
                return (
                  <button
                    key={tpl.templateKey}
                    onClick={() => setSelectedTemplateKey(tpl.templateKey)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50/60 shadow-sm'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {tpl.templateKey === 'welcome' && '🚀'}
                          {tpl.templateKey === 'order_placed' && '🛍️'}
                          {tpl.templateKey === 'order_dispatched' && '🚚'}
                          {tpl.templateKey === 'order_delivered' && '📦'}
                          {tpl.templateKey === 'refund_approved' && '💰'}
                          {tpl.templateKey === 'password_reset' && '🔐'}
                        </span>
                        <h4 className="text-xs font-black text-slate-900 truncate">{tpl.name}</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{tpl.subject}</p>
                    </div>

                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${
                        tpl.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {tpl.enabled ? 'Active' : 'Off'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Variable Palette */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase">
                <Tag className="w-3.5 h-3.5 text-purple-600" />
                <span>Insert Dynamic Variables</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Click any tag below to insert it at the end of the HTML template.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(currentTemplate.variables || []).map(v => (
                  <button
                    key={v}
                    onClick={() => handleInsertVariable(v)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-purple-100 hover:text-purple-800 border border-slate-200 text-[11px] font-mono font-bold text-slate-700 transition-all flex items-center gap-1"
                  >
                    <span>{v}</span>
                    <Sparkles className="w-2.5 h-2.5 text-purple-500" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Editor & Live Preview Column */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              {/* Template Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <span>Editing: {currentTemplate.name}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">key: {selectedTemplateKey}</p>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={editorEnabled}
                      onChange={e => setEditorEnabled(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Enable Notification</span>
                  </label>

                  <button
                    onClick={handleSaveTemplate}
                    disabled={savingTemplate}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all"
                  >
                    {savingTemplate ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{savingTemplate ? 'Saving...' : 'Save Template'}</span>
                  </button>
                </div>
              </div>

              {/* Subject Input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Email Subject Line
                </label>
                <input
                  type="text"
                  value={editorSubject}
                  onChange={e => {
                    setEditorSubject(e.target.value);
                    fetchPreview(selectedTemplateKey, editorBodyHtml, e.target.value);
                  }}
                  placeholder="e.g. Order Confirmed! #{{order_id}}"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* HTML Editor & Device Preview Split */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-purple-600" />
                    Responsive HTML Code & Live View
                  </span>

                  {/* Device Switcher */}
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      onClick={() => setPreviewDevice('desktop')}
                      className={`p-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all ${
                        previewDevice === 'desktop' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-500'
                      }`}
                      title="Desktop view (640px)"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      <span className="text-[10px]">Desktop</span>
                    </button>
                    <button
                      onClick={() => setPreviewDevice('mobile')}
                      className={`p-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all ${
                        previewDevice === 'mobile' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-500'
                      }`}
                      title="Mobile phone view (375px)"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span className="text-[10px]">Mobile</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {/* HTML Textarea */}
                  <div className="space-y-1">
                    <textarea
                      rows={18}
                      value={editorBodyHtml}
                      onChange={e => {
                        setEditorBodyHtml(e.target.value);
                        fetchPreview(selectedTemplateKey, e.target.value, editorSubject);
                      }}
                      className="w-full p-3 rounded-xl bg-slate-950 text-slate-100 font-mono text-[11px] leading-relaxed border border-slate-800 focus:outline-none focus:border-purple-500 resize-y"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono px-1">
                      <span>HTML5 Responsive Markup</span>
                      <span>{editorBodyHtml.length} characters</span>
                    </div>
                  </div>

                  {/* Live Rendered Iframe */}
                  <div className="flex flex-col items-center justify-start bg-slate-100 p-3 rounded-xl border border-slate-200 overflow-hidden">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-600" />
                      Live Rendered Template Preview ({previewDevice.toUpperCase()})
                    </div>
                    <div
                      className={`transition-all bg-white rounded-xl shadow-md overflow-hidden border border-slate-300 w-full ${
                        previewDevice === 'mobile' ? 'max-w-[375px]' : 'max-w-full'
                      }`}
                      style={{ height: '420px' }}
                    >
                      <iframe
                        title="Live Email Preview"
                        srcDoc={renderedPreviewHtml}
                        className="w-full h-full border-0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SMTP & DELIVERY GATEWAYS */}
      {activeTab === 'smtp' && (
        <div className="space-y-6">
          {/* Active Provider Selector Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-900">Active Email Delivery Engine</h3>
              <p className="text-xs text-slate-500">
                Choose which service handles transactional notifications, OTPs & order receipts.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Active Engine:</span>
              <select
                value={settings.activeProvider}
                onChange={e => setSettings({ ...settings, activeProvider: e.target.value })}
                className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-300 font-black text-xs text-slate-900 focus:outline-none focus:border-purple-500"
              >
                <option value="sandbox">Sandbox Simulator Mailer (Zero Setup, Dev Mode)</option>
                <option value="smtp">Custom SMTP Server (Hostinger, cPanel, Private)</option>
                <option value="gmail">Google Workspace / Gmail (App Password)</option>
                <option value="sendgrid">SendGrid Web API</option>
                <option value="ses">Amazon SES (AWS Cloud)</option>
                <option value="brevo">Brevo / Sendinblue API</option>
                <option value="mailgun">Mailgun API</option>
              </select>
            </div>
          </div>

          {/* Provider Configuration Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Custom SMTP Card */}
            <div
              className={`p-5 rounded-2xl border transition-all ${
                ['smtp', 'gmail'].includes(settings.activeProvider)
                  ? 'border-purple-400 bg-purple-50/20 ring-2 ring-purple-400/20'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚙️</span>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Custom SMTP / Gmail Server</h4>
                    <p className="text-[11px] text-slate-500">Hostinger, cPanel webmail, or Google Workspace</p>
                  </div>
                </div>
                {['smtp', 'gmail'].includes(settings.activeProvider) && (
                  <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    Active
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">SMTP Host</label>
                    <input
                      type="text"
                      placeholder="smtp.gmail.com / smtp.hostinger.com"
                      value={settings.smtp.host}
                      onChange={e =>
                        setSettings({
                          ...settings,
                          smtp: { ...settings.smtp, host: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">Port</label>
                    <input
                      type="number"
                      placeholder="587"
                      value={settings.smtp.port}
                      onChange={e =>
                        setSettings({
                          ...settings,
                          smtp: { ...settings.smtp, port: Number(e.target.value) },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">Username / Email</label>
                    <input
                      type="text"
                      placeholder="notifications@yourdomain.com"
                      value={settings.smtp.username}
                      onChange={e =>
                        setSettings({
                          ...settings,
                          smtp: { ...settings.smtp, username: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">Password</label>
                    <div className="relative">
                      <input
                        type={showSecrets.smtpPassword ? 'text' : 'password'}
                        placeholder="SMTP or App Password"
                        value={settings.smtp.password}
                        onChange={e =>
                          setSettings({
                            ...settings,
                            smtp: { ...settings.smtp, password: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 pr-9 rounded-lg bg-white border border-slate-300 text-xs font-mono font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecrets({ ...showSecrets, smtpPassword: !showSecrets.smtpPassword })}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showSecrets.smtpPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">From Email</label>
                    <input
                      type="email"
                      value={settings.smtp.fromEmail}
                      onChange={e =>
                        setSettings({
                          ...settings,
                          smtp: { ...settings.smtp, fromEmail: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">From Name</label>
                    <input
                      type="text"
                      value={settings.smtp.fromName}
                      onChange={e =>
                        setSettings({
                          ...settings,
                          smtp: { ...settings.smtp, fromName: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SendGrid Web API Card */}
            <div
              className={`p-5 rounded-2xl border transition-all ${
                settings.activeProvider === 'sendgrid'
                  ? 'border-purple-400 bg-purple-50/20 ring-2 ring-purple-400/20'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🚀</span>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">SendGrid Web API</h4>
                    <p className="text-[11px] text-slate-500">Twilio SendGrid v3 REST Delivery</p>
                  </div>
                </div>
                {settings.activeProvider === 'sendgrid' && (
                  <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    Active
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">SendGrid API Key</label>
                  <div className="relative">
                    <input
                      type={showSecrets.sendgridApiKey ? 'text' : 'password'}
                      placeholder="SG.xxxxxxxxxxxxxxxxxxxxxxxx"
                      value={settings.sendgrid.apiKey}
                      onChange={e =>
                        setSettings({
                          ...settings,
                          sendgrid: { ...settings.sendgrid, apiKey: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 pr-9 rounded-lg bg-white border border-slate-300 text-xs font-mono font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecrets({ ...showSecrets, sendgridApiKey: !showSecrets.sendgridApiKey })}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showSecrets.sendgridApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">Verified From Email</label>
                    <input
                      type="email"
                      value={settings.sendgrid.fromEmail}
                      onChange={e =>
                        setSettings({
                          ...settings,
                          sendgrid: { ...settings.sendgrid, fromEmail: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">Sender Name</label>
                    <input
                      type="text"
                      value={settings.sendgrid.fromName}
                      onChange={e =>
                        setSettings({
                          ...settings,
                          sendgrid: { ...settings.sendgrid, fromName: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Amazon SES Card */}
            <div
              className={`p-5 rounded-2xl border transition-all ${
                settings.activeProvider === 'ses'
                  ? 'border-purple-400 bg-purple-50/20 ring-2 ring-purple-400/20'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">☁️</span>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Amazon SES (Simple Email Service)</h4>
                    <p className="text-[11px] text-slate-500">High-volume transactional delivery via AWS</p>
                  </div>
                </div>
                {settings.activeProvider === 'ses' && (
                  <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    Active
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">AWS Access Key ID</label>
                    <input
                      type="text"
                      placeholder="AKIAxxxxxxxxxxxxxxxx"
                      value={settings.ses.accessKeyId}
                      onChange={e =>
                        setSettings({
                          ...settings,
                          ses: { ...settings.ses, accessKeyId: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-mono font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">AWS Secret Key</label>
                    <div className="relative">
                      <input
                        type={showSecrets.sesSecret ? 'text' : 'password'}
                        placeholder="AWS Secret Access Key"
                        value={settings.ses.secretAccessKey}
                        onChange={e =>
                          setSettings({
                            ...settings,
                            ses: { ...settings.ses, secretAccessKey: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 pr-9 rounded-lg bg-white border border-slate-300 text-xs font-mono font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecrets({ ...showSecrets, sesSecret: !showSecrets.sesSecret })}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showSecrets.sesSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">AWS Region</label>
                    <input
                      type="text"
                      placeholder="ap-south-1 / us-east-1"
                      value={settings.ses.region}
                      onChange={e =>
                        setSettings({
                          ...settings,
                          ses: { ...settings.ses, region: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">Verified Identity</label>
                    <input
                      type="email"
                      value={settings.ses.fromEmail}
                      onChange={e =>
                        setSettings({
                          ...settings,
                          ses: { ...settings.ses, fromEmail: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Brevo (Sendinblue) Card */}
            <div
              className={`p-5 rounded-2xl border transition-all ${
                settings.activeProvider === 'brevo'
                  ? 'border-purple-400 bg-purple-50/20 ring-2 ring-purple-400/20'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📫</span>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Brevo (Sendinblue)</h4>
                    <p className="text-[11px] text-slate-500">European GDPR-compliant transactional email</p>
                  </div>
                </div>
                {settings.activeProvider === 'brevo' && (
                  <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    Active
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">Brevo v3 API Key</label>
                  <div className="relative">
                    <input
                      type={showSecrets.brevoApiKey ? 'text' : 'password'}
                      placeholder="xkeysib-xxxxxxxxxxxxxxxxxxxxxxxx"
                      value={settings.brevo.apiKey}
                      onChange={e =>
                        setSettings({
                          ...settings,
                          brevo: { ...settings.brevo, apiKey: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 pr-9 rounded-lg bg-white border border-slate-300 text-xs font-mono font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecrets({ ...showSecrets, brevoApiKey: !showSecrets.brevoApiKey })}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showSecrets.brevoApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">Sender Email</label>
                    <input
                      type="email"
                      value={settings.brevo.fromEmail}
                      onChange={e =>
                        setSettings({
                          ...settings,
                          brevo: { ...settings.brevo, fromEmail: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">Sender Name</label>
                    <input
                      type="text"
                      value={settings.brevo.fromName}
                      onChange={e =>
                        setSettings({
                          ...settings,
                          brevo: { ...settings.brevo, fromName: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button Bar */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-xs shadow-md transition-all"
            >
              {savingSettings ? <RotateCw className="w-4 h-4 animate-spin text-amber-400" /> : <Save className="w-4 h-4 text-amber-400" />}
              <span>{savingSettings ? 'Applying Settings...' : 'Apply Email Gateway Settings Live'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplateManager;
