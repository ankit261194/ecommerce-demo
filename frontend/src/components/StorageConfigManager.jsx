import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Cloud,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  Save,
  Eye,
  EyeOff,
  Zap,
  Globe,
  Sliders,
  Image as ImageIcon,
  ShieldCheck,
  Server,
  Sparkles,
  ExternalLink,
  Cpu,
} from 'lucide-react';
import api from '../api/client';

export const StorageConfigManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState(null);
  const [showSecrets, setShowSecrets] = useState({});
  const [notification, setNotification] = useState(null);

  const [settings, setSettings] = useState({
    activeProvider: 'local',
    local: {
      uploadPath: '/uploads',
      maxFileSizeMb: 10,
    },
    cloudinary: {
      cloudName: 'auramarket',
      apiKey: '',
      apiSecret: '',
      folder: 'auramarket_products',
      hasApiKey: false,
      hasApiSecret: false,
    },
    s3: {
      bucket: 'auramarket-media',
      region: 'ap-south-1',
      accessKey: '',
      secretKey: '',
      cdnUrl: '',
      forcePathStyle: false,
      hasAccessKey: false,
      hasSecretKey: false,
    },
    wasabi: {
      bucket: 'auramarket-wasabi',
      region: 'us-east-1',
      endpoint: 'https://s3.wasabisys.com',
      accessKey: '',
      secretKey: '',
      cdnUrl: '',
      hasAccessKey: false,
      hasSecretKey: false,
    },
    spaces: {
      bucket: 'auramarket-spaces',
      region: 'blr1',
      endpoint: 'https://blr1.digitaloceanspaces.com',
      key: '',
      secret: '',
      cdnUrl: '',
      hasKey: false,
      hasSecret: false,
    },
    r2: {
      accountId: '',
      bucket: 'auramarket-r2',
      accessKey: '',
      secretKey: '',
      publicCustomDomain: '',
      hasAccessKey: false,
      hasSecretKey: false,
    },
    imageOptimization: {
      autoWebp: true,
      quality: 85,
      maxDimension: 1920,
      generateThumbnails: true,
    },
  });

  const [simulatedSavings, setSimulatedSavings] = useState({
    originalKb: 2400,
    optimizedKb: 449,
    savedPercent: 81,
  });

  useEffect(() => {
    fetchStorageSettings();
  }, []);

  useEffect(() => {
    // Recalculate WebP savings when quality changes
    const orig = 2400;
    const factor = (settings.imageOptimization.quality / 100) * 0.22;
    const opt = Math.max(45, Math.round(orig * factor));
    const saved = orig - opt;
    setSimulatedSavings({
      originalKb: orig,
      optimizedKb: opt,
      savedPercent: Math.round((saved / orig) * 100),
    });
  }, [settings.imageOptimization.quality]);

  const fetchStorageSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/storage/settings');
      if (res.data?.success) {
        const d = res.data.data;
        setSettings({
          activeProvider: d.activeProvider || 'local',
          local: d.local || { uploadPath: '/uploads', maxFileSizeMb: 10 },
          cloudinary: {
            ...d.cloudinary,
            apiKey: d.cloudinary.hasApiKey ? '••••••••' : '',
            apiSecret: d.cloudinary.hasApiSecret ? '••••••••' : '',
          },
          s3: {
            ...d.s3,
            accessKey: d.s3.hasAccessKey ? '••••••••' : '',
            secretKey: d.s3.hasSecretKey ? '••••••••' : '',
          },
          wasabi: {
            ...d.wasabi,
            accessKey: d.wasabi.hasAccessKey ? '••••••••' : '',
            secretKey: d.wasabi.hasSecretKey ? '••••••••' : '',
          },
          spaces: {
            ...d.spaces,
            key: d.spaces.hasKey ? '••••••••' : '',
            secret: d.spaces.hasSecret ? '••••••••' : '',
          },
          r2: {
            ...d.r2,
            accessKey: d.r2.hasAccessKey ? '••••••••' : '',
            secretKey: d.r2.hasSecretKey ? '••••••••' : '',
          },
          imageOptimization: d.imageOptimization || {
            autoWebp: true,
            quality: 85,
            maxDimension: 1920,
            generateThumbnails: true,
          },
        });
      }
    } catch (err) {
      console.error('Failed to load storage settings:', err);
      showToast('error', 'Failed to retrieve storage settings from backend.');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const payload = {
        activeProvider: settings.activeProvider,
        local: settings.local,
        cloudinary: settings.cloudinary,
        s3: settings.s3,
        wasabi: settings.wasabi,
        spaces: settings.spaces,
        r2: settings.r2,
        imageOptimization: settings.imageOptimization,
      };

      const res = await api.put('/admin/storage/settings', payload);
      if (res.data?.success) {
        showToast('success', 'Multi-cloud storage & CDN settings saved and active live!');
        fetchStorageSettings();
      }
    } catch (err) {
      console.error('Failed to save storage settings:', err);
      showToast('error', err.response?.data?.message || 'Failed to update storage configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestPing = async (providerToTest) => {
    try {
      setPinging(true);
      setPingResult(null);
      const target = providerToTest || settings.activeProvider;
      const res = await api.post('/admin/storage/test-ping', { provider: target });
      if (res.data?.success) {
        setPingResult({
          success: true,
          provider: res.data.provider,
          bucket: res.data.bucket,
          latency: res.data.latencyMs,
          cdnStatus: res.data.cdnStatus,
          message: res.data.message,
        });
      }
    } catch (err) {
      setPingResult({
        success: false,
        message: err.response?.data?.message || 'Connection ping failed. Check credentials or network connectivity.',
      });
    } finally {
      setPinging(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
        <RotateCw className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-700">Loading Cloud Storage & CDN Configurator...</p>
      </div>
    );
  }

  const providers = [
    { id: 'local', name: 'Local Server Disk', icon: '💾', desc: 'Zero-config local directory storage' },
    { id: 's3', name: 'Amazon AWS S3', icon: '☁️', desc: 'Standard AWS S3 with CloudFront CDN' },
    { id: 'cloudinary', name: 'Cloudinary CDN', icon: '🖼️', desc: 'Auto-transformations & global delivery' },
    { id: 'wasabi', name: 'Wasabi Hot Cloud', icon: '⚡', desc: 'S3-compatible 80% lower cost storage' },
    { id: 'spaces', name: 'DigitalOcean Spaces', icon: '🌊', desc: 'S3-compatible with built-in CDN edge' },
    { id: 'r2', name: 'Cloudflare R2', icon: '🛡️', desc: 'Zero egress bandwidth fees globally' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Alert */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-bold shadow-md transition-all ${
            notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="opacity-80 hover:opacity-100">×</button>
        </div>
      )}

      {/* Main Header & 1-Click Ping Test */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                <HardDrive className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Multi-Cloud Storage & S3 CDN Bucket Configurator
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Connect Amazon S3, Cloudflare R2, Wasabi, DigitalOcean Spaces, Cloudinary or Local Disk with automatic WebP compression.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Active Storage:</span>
            <select
              value={settings.activeProvider}
              onChange={e => setSettings({ ...settings, activeProvider: e.target.value })}
              className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-300 font-black text-xs text-slate-900 focus:outline-none focus:border-amber-500"
            >
              {providers.map(p => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 1-Click Bucket Ping Diagnostics Bar */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-700" />
                1-Click Live Bucket Ping Diagnostics
              </h4>
              <p className="text-[11px] text-amber-700 font-medium">
                Test connectivity, credentials handshake & CDN endpoint for active engine:{' '}
                <span className="font-mono font-bold uppercase">{settings.activeProvider}</span>
              </p>
            </div>

            <button
              onClick={() => handleTestPing(settings.activeProvider)}
              disabled={pinging}
              className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-black text-xs shadow-sm transition-all whitespace-nowrap flex items-center gap-1.5"
            >
              {pinging ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>{pinging ? 'Testing Handshake...' : 'Ping Storage Bucket'}</span>
            </button>
          </div>

          {pingResult && (
            <div
              className={`p-3 rounded-lg text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                pingResult.success ? 'bg-emerald-100 text-emerald-950' : 'bg-rose-100 text-rose-950'
              }`}
            >
              <div className="flex items-center gap-2">
                {pingResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-700 flex-shrink-0" />
                )}
                <span>{pingResult.message}</span>
              </div>
              {pingResult.latency && (
                <div className="flex items-center gap-3 text-[11px] font-mono opacity-90">
                  <span className="bg-white/80 px-2 py-0.5 rounded text-emerald-800">
                    ⚡ {pingResult.latency}ms Ping
                  </span>
                  <span>{pingResult.cdnStatus}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* WebP Image Compression & CDN Acceleration Studio */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Cpu className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Automatic WebP Image Compression & CDN Optimization
              </h3>
              <p className="text-xs text-slate-500">
                Automatically convert merchant product images into lightweight WebP format to load storefront pages 4x faster.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              checked={settings.imageOptimization.autoWebp}
              onChange={e =>
                setSettings({
                  ...settings,
                  imageOptimization: { ...settings.imageOptimization, autoWebp: e.target.checked },
                })
              }
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span>Enable Auto WebP</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Quality Slider */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700">
              <span>WebP Compression Quality</span>
              <span className="font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                {settings.imageOptimization.quality}%
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              value={settings.imageOptimization.quality}
              onChange={e =>
                setSettings({
                  ...settings,
                  imageOptimization: { ...settings.imageOptimization, quality: Number(e.target.value) },
                })
              }
              className="w-full accent-emerald-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>50% (Max Speed)</span>
              <span>85% (Recommended)</span>
              <span>100% (Lossless)</span>
            </div>
          </div>

          {/* Max Dimension */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="block text-xs font-bold text-slate-700">Max Image Resolution Cap</label>
            <select
              value={settings.imageOptimization.maxDimension}
              onChange={e =>
                setSettings({
                  ...settings,
                  imageOptimization: { ...settings.imageOptimization, maxDimension: Number(e.target.value) },
                })
              }
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-900"
            >
              <option value="1280">1280px (Standard HD - Super Fast)</option>
              <option value="1920">1920px (Full HD 1080p - Recommended)</option>
              <option value="2560">2560px (2K QHD High Density)</option>
              <option value="3840">3840px (4K Ultra HD)</option>
            </select>
            <p className="text-[10px] text-slate-500">Larger camera uploads downscaled automatically.</p>
          </div>

          {/* Live Bandwidth Savings Simulator */}
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1.5 flex flex-col justify-center">
            <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
              🚀 Bandwidth Reduction Engine
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-900">{simulatedSavings.savedPercent}%</span>
              <span className="text-xs font-bold text-emerald-700">Bandwidth Saved</span>
            </div>
            <p className="text-[11px] text-emerald-800">
              Sample 2.4 MB JPEG drops to{' '}
              <strong className="font-mono">{simulatedSavings.optimizedKb} KB WebP</strong>!
            </p>
          </div>
        </div>
      </div>

      {/* Cloud Providers Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Amazon AWS S3 Card */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            settings.activeProvider === 's3'
              ? 'border-amber-400 bg-amber-50/20 ring-2 ring-amber-400/20'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">☁️</span>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Amazon AWS S3</h4>
                <p className="text-[11px] text-slate-500">Global scale with CloudFront CDN integration</p>
              </div>
            </div>
            {settings.activeProvider === 's3' && (
              <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Active
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase">Bucket Name</label>
                <input
                  type="text"
                  placeholder="auramarket-media"
                  value={settings.s3.bucket}
                  onChange={e => setSettings({ ...settings, s3: { ...settings.s3, bucket: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase">AWS Region</label>
                <input
                  type="text"
                  placeholder="ap-south-1"
                  value={settings.s3.region}
                  onChange={e => setSettings({ ...settings, s3: { ...settings.s3, region: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase">AWS Access Key</label>
                <input
                  type="text"
                  placeholder="AKIAxxxxxxxxxxxxxxxx"
                  value={settings.s3.accessKey}
                  onChange={e => setSettings({ ...settings, s3: { ...settings.s3, accessKey: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-mono font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase">AWS Secret Key</label>
                <div className="relative">
                  <input
                    type={showSecrets.s3Secret ? 'text' : 'password'}
                    placeholder="AWS Secret Key"
                    value={settings.s3.secretKey}
                    onChange={e => setSettings({ ...settings, s3: { ...settings.s3, secretKey: e.target.value } })}
                    className="w-full px-3 py-2 pr-9 rounded-lg bg-white border border-slate-300 text-xs font-mono font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecrets({ ...showSecrets, s3Secret: !showSecrets.s3Secret })}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showSecrets.s3Secret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase">
                CloudFront CDN Domain Prefix
              </label>
              <input
                type="text"
                placeholder="https://d12345abcdef.cloudfront.net"
                value={settings.s3.cdnUrl}
                onChange={e => setSettings({ ...settings, s3: { ...settings.s3, cdnUrl: e.target.value } })}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* Cloudflare R2 Card */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            settings.activeProvider === 'r2'
              ? 'border-amber-400 bg-amber-50/20 ring-2 ring-amber-400/20'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🛡️</span>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Cloudflare R2 Storage</h4>
                <p className="text-[11px] text-slate-500">Zero egress fees, S3 compatible API</p>
              </div>
            </div>
            {settings.activeProvider === 'r2' && (
              <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Active
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase">Cloudflare Account ID</label>
                <input
                  type="text"
                  placeholder="e.g. 9b7201827461829"
                  value={settings.r2.accountId}
                  onChange={e => setSettings({ ...settings, r2: { ...settings.r2, accountId: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-mono font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase">R2 Bucket Name</label>
                <input
                  type="text"
                  placeholder="auramarket-r2"
                  value={settings.r2.bucket}
                  onChange={e => setSettings({ ...settings, r2: { ...settings.r2, bucket: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase">R2 Access Key ID</label>
                <input
                  type="text"
                  value={settings.r2.accessKey}
                  onChange={e => setSettings({ ...settings, r2: { ...settings.r2, accessKey: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-mono font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase">R2 Secret Access Key</label>
                <div className="relative">
                  <input
                    type={showSecrets.r2Secret ? 'text' : 'password'}
                    placeholder="R2 Secret Key"
                    value={settings.r2.secretKey}
                    onChange={e => setSettings({ ...settings, r2: { ...settings.r2, secretKey: e.target.value } })}
                    className="w-full px-3 py-2 pr-9 rounded-lg bg-white border border-slate-300 text-xs font-mono font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecrets({ ...showSecrets, r2Secret: !showSecrets.r2Secret })}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showSecrets.r2Secret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase">
                Public Custom Domain / Worker URL
              </label>
              <input
                type="text"
                placeholder="https://media.yourdomain.com"
                value={settings.r2.publicCustomDomain}
                onChange={e => setSettings({ ...settings, r2: { ...settings.r2, publicCustomDomain: e.target.value } })}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* DigitalOcean Spaces Card */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            settings.activeProvider === 'spaces'
              ? 'border-amber-400 bg-amber-50/20 ring-2 ring-amber-400/20'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌊</span>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">DigitalOcean Spaces</h4>
                <p className="text-[11px] text-slate-500">S3-compatible with built-in CDN edge</p>
              </div>
            </div>
            {settings.activeProvider === 'spaces' && (
              <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Active
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase">Space Name</label>
                <input
                  type="text"
                  placeholder="auramarket-spaces"
                  value={settings.spaces.bucket}
                  onChange={e => setSettings({ ...settings, spaces: { ...settings.spaces, bucket: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase">Region / Datacenter</label>
                <input
                  type="text"
                  placeholder="blr1 / nyc3"
                  value={settings.spaces.region}
                  onChange={e => setSettings({ ...settings, spaces: { ...settings.spaces, region: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase">SPACES KEY</label>
                <input
                  type="text"
                  value={settings.spaces.key}
                  onChange={e => setSettings({ ...settings, spaces: { ...settings.spaces, key: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-mono font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase">SPACES SECRET</label>
                <div className="relative">
                  <input
                    type={showSecrets.spacesSecret ? 'text' : 'password'}
                    placeholder="Spaces Secret"
                    value={settings.spaces.secret}
                    onChange={e => setSettings({ ...settings, spaces: { ...settings.spaces, secret: e.target.value } })}
                    className="w-full px-3 py-2 pr-9 rounded-lg bg-white border border-slate-300 text-xs font-mono font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecrets({ ...showSecrets, spacesSecret: !showSecrets.spacesSecret })}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showSecrets.spacesSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase">CDN Edge URL</label>
              <input
                type="text"
                placeholder="https://auramarket-spaces.blr1.cdn.digitaloceanspaces.com"
                value={settings.spaces.cdnUrl}
                onChange={e => setSettings({ ...settings, spaces: { ...settings.spaces, cdnUrl: e.target.value } })}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* Wasabi Cloud Storage Card */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            settings.activeProvider === 'wasabi'
              ? 'border-amber-400 bg-amber-50/20 ring-2 ring-amber-400/20'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Wasabi Hot Cloud Storage</h4>
                <p className="text-[11px] text-slate-500">Low latency S3 storage without API request fees</p>
              </div>
            </div>
            {settings.activeProvider === 'wasabi' && (
              <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Active
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase">Bucket Name</label>
                <input
                  type="text"
                  placeholder="auramarket-wasabi"
                  value={settings.wasabi.bucket}
                  onChange={e => setSettings({ ...settings, wasabi: { ...settings.wasabi, bucket: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase">Wasabi Region</label>
                <input
                  type="text"
                  placeholder="us-east-1"
                  value={settings.wasabi.region}
                  onChange={e => setSettings({ ...settings, wasabi: { ...settings.wasabi, region: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase">Access Key</label>
                <input
                  type="text"
                  value={settings.wasabi.accessKey}
                  onChange={e => setSettings({ ...settings, wasabi: { ...settings.wasabi, accessKey: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-mono font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase">Secret Key</label>
                <div className="relative">
                  <input
                    type={showSecrets.wasabiSecret ? 'text' : 'password'}
                    placeholder="Wasabi Secret Key"
                    value={settings.wasabi.secretKey}
                    onChange={e => setSettings({ ...settings, wasabi: { ...settings.wasabi, secretKey: e.target.value } })}
                    className="w-full px-3 py-2 pr-9 rounded-lg bg-white border border-slate-300 text-xs font-mono font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecrets({ ...showSecrets, wasabiSecret: !showSecrets.wasabiSecret })}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showSecrets.wasabiSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase">Endpoint URL</label>
              <input
                type="text"
                placeholder="https://s3.wasabisys.com"
                value={settings.wasabi.endpoint}
                onChange={e => setSettings({ ...settings, wasabi: { ...settings.wasabi, endpoint: e.target.value } })}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-xs shadow-md transition-all"
        >
          {saving ? <RotateCw className="w-4 h-4 animate-spin text-amber-400" /> : <Save className="w-4 h-4 text-amber-400" />}
          <span>{saving ? 'Applying Settings...' : 'Apply Cloud Storage Settings Live'}</span>
        </button>
      </div>
    </div>
  );
};

export default StorageConfigManager;
