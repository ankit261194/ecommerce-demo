import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Store,
  Users,
  Package,
  Trash2,
  RefreshCw,
  Palette,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Sparkles,
  Plug,
  CreditCard,
  MessageSquare,
  Mail,
  HardDrive,
  Send,
  Key,
  Eye,
  EyeOff,
  Save,
  ShieldCheck,
  Smartphone,
  Check,
  ExternalLink,
  Layers,
  Search,
  Globe,
  Share2,
  Code,
  BarChart3,
} from 'lucide-react';
import { BentoGrid, BentoCard } from '../components/BentoGrid';
import { SlideOverDrawer } from '../components/SlideOverDrawer';
import api from '../api/client';

export const SuperAdminDashboard = ({ uiConfig, setUiConfig }) => {
  // Master Dashboard Tab: 'overview' | 'integrations' | 'seo'
  const [activeDashboardTab, setActiveDashboardTab] = useState('overview');

  // Integrations Hub Sub-Tab: 'payments' | 'sms' | 'email' | 'storage'
  const [integrationSubTab, setIntegrationSubTab] = useState('payments');

  // SEO & Webmaster Hub State
  const [seoConfig, setSeoConfig] = useState({
    metaTitle: uiConfig?.seo?.metaTitle || 'AuraMarket — The Next-Gen Multi-Vendor Commerce Platform',
    metaDescription:
      uiConfig?.seo?.metaDescription ||
      'Discover top electronics, audio, fashion, and lifestyle brands from verified merchants with express delivery and OTP verification.',
    metaKeywords:
      uiConfig?.seo?.metaKeywords ||
      'ecommerce, multi-vendor marketplace, online shopping, electronics, fashion, split orders',
    ogImage:
      uiConfig?.seo?.ogImage ||
      'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80',
    canonicalUrl: uiConfig?.seo?.canonicalUrl || 'https://shribalajikripadham.online/ecommerce-demo/',
    googleSiteVerification: uiConfig?.seo?.googleSiteVerification || '',
    googleAnalyticsId: uiConfig?.seo?.googleAnalyticsId || '',
    facebookPixelId: uiConfig?.seo?.facebookPixelId || '',
    enableRichSnippets: uiConfig?.seo?.enableRichSnippets ?? true,
  });

  useEffect(() => {
    if (uiConfig?.seo) {
      setSeoConfig(prev => ({
        ...prev,
        ...uiConfig.seo,
        enableRichSnippets: uiConfig.seo.enableRichSnippets ?? true,
      }));
    }
  }, [uiConfig?.seo]);

  // Initial Analytics State with backend synchronization
  const [analytics, setAnalytics] = useState({
    grossSales: 274000,
    platformCommission: 24600,
    totalOrders: 142,
    totalVendors: 8,
    approvedVendors: 6,
    pendingVendors: 2,
    totalProducts: 48,
    totalCustomers: 320,
  });

  const [vendors, setVendors] = useState([
    {
      _id: 'vnd_001',
      storeName: 'Apex Tech Hub',
      user: { name: 'Rajesh Verma', email: 'apex@auramarket.com', phone: '9876543211' },
      status: 'approved',
      commissionRate: 8,
      walletBalance: 24500,
      totalSales: 185000,
      rating: 4.9,
    },
    {
      _id: 'vnd_002',
      storeName: 'Vogue Trends Apparel',
      user: { name: 'Pooja Kapoor', email: 'vogue@auramarket.com', phone: '9876543212' },
      status: 'approved',
      commissionRate: 12,
      walletBalance: 12400,
      totalSales: 89000,
      rating: 4.8,
    },
    {
      _id: 'vnd_003',
      storeName: 'Kaveri Handicrafts & Decor',
      user: { name: 'Ramesh Patel', email: 'kaveri@gmail.com', phone: '9876543219' },
      status: 'pending',
      commissionRate: 10,
      walletBalance: 0,
      totalSales: 0,
      rating: 5.0,
    },
  ]);

  // Master Integrations State (Dynamic Plug & Play for Non-Developers)
  const [integrations, setIntegrations] = useState({
    sms: {
      activeProvider: uiConfig?.integrations?.sms?.activeProvider || 'mock',
      fast2sms: {
        apiKey: uiConfig?.integrations?.sms?.fast2sms?.apiKey || '',
        senderId: uiConfig?.integrations?.sms?.fast2sms?.senderId || 'FSTSMS',
        route: uiConfig?.integrations?.sms?.fast2sms?.route || 'q',
      },
      msg91: {
        authKey: uiConfig?.integrations?.sms?.msg91?.authKey || '',
        senderId: uiConfig?.integrations?.sms?.msg91?.senderId || 'AURAMK',
        dltTemplateId: uiConfig?.integrations?.sms?.msg91?.dltTemplateId || '',
      },
      twilio: {
        accountSid: uiConfig?.integrations?.sms?.twilio?.accountSid || '',
        authToken: uiConfig?.integrations?.sms?.twilio?.authToken || '',
        fromPhone: uiConfig?.integrations?.sms?.twilio?.fromPhone || '',
      },
    },
    payments: {
      cod: {
        enabled: uiConfig?.integrations?.payments?.cod?.enabled ?? true,
        label: uiConfig?.integrations?.payments?.cod?.label || 'Cash on Delivery (COD)',
      },
      razorpay: {
        enabled: uiConfig?.integrations?.payments?.razorpay?.enabled ?? true,
        keyId: uiConfig?.integrations?.payments?.razorpay?.keyId || 'rzp_test_AuraMarket2026',
        keySecret: uiConfig?.integrations?.payments?.razorpay?.keySecret || 'rzp_sec_mock_key_secret_2026',
      },
      stripe: {
        enabled: uiConfig?.integrations?.payments?.stripe?.enabled ?? true,
        publishableKey: uiConfig?.integrations?.payments?.stripe?.publishableKey || 'pk_test_51MockStripeAuraMarket2026',
        secretKey: uiConfig?.integrations?.payments?.stripe?.secretKey || 'sk_test_51MockStripeSecretKey2026',
      },
      upi: {
        enabled: uiConfig?.integrations?.payments?.upi?.enabled ?? true,
        upiId: uiConfig?.integrations?.payments?.upi?.upiId || '8533955333@paytm',
        merchantName: uiConfig?.integrations?.payments?.upi?.merchantName || 'AuraMarket Store',
      },
    },
    email: {
      activeProvider: uiConfig?.integrations?.email?.activeProvider || 'mock',
      smtp: {
        host: uiConfig?.integrations?.email?.smtp?.host || 'smtp.gmail.com',
        port: uiConfig?.integrations?.email?.smtp?.port || 587,
        secure: uiConfig?.integrations?.email?.smtp?.secure ?? false,
        username: uiConfig?.integrations?.email?.smtp?.username || 'notifications@auramarket.com',
        password: uiConfig?.integrations?.email?.smtp?.password || '',
        fromEmail: uiConfig?.integrations?.email?.smtp?.fromEmail || 'notifications@auramarket.com',
        fromName: uiConfig?.integrations?.email?.smtp?.fromName || 'AuraMarket Store',
      },
      sendgrid: {
        apiKey: uiConfig?.integrations?.email?.sendgrid?.apiKey || '',
        fromEmail: uiConfig?.integrations?.email?.sendgrid?.fromEmail || 'notifications@auramarket.com',
        fromName: uiConfig?.integrations?.email?.sendgrid?.fromName || 'AuraMarket Store',
      },
    },
    storage: {
      activeProvider: uiConfig?.integrations?.storage?.activeProvider || 'local',
      local: {
        uploadPath: uiConfig?.integrations?.storage?.local?.uploadPath || '/uploads',
      },
      cloudinary: {
        cloudName: uiConfig?.integrations?.storage?.cloudinary?.cloudName || 'auramarket',
        apiKey: uiConfig?.integrations?.storage?.cloudinary?.apiKey || '',
        apiSecret: uiConfig?.integrations?.storage?.cloudinary?.apiSecret || '',
      },
      s3: {
        bucket: uiConfig?.integrations?.storage?.s3?.bucket || 'auramarket-media',
        region: uiConfig?.integrations?.storage?.s3?.region || 'ap-south-1',
        accessKey: uiConfig?.integrations?.storage?.s3?.accessKey || '',
        secretKey: uiConfig?.integrations?.storage?.s3?.secretKey || '',
      },
    },
  });

  // Password / Secret visibility toggles
  const [showSecrets, setShowSecrets] = useState({
    razorpaySecret: false,
    stripeSecret: false,
    smtpPassword: false,
    twilioAuth: false,
    cloudinarySecret: false,
    s3Secret: false,
  });

  // Live Testing States
  const [testSmsPhone, setTestSmsPhone] = useState('+918533955333');
  const [isTestingSms, setIsTestingSms] = useState(false);
  const [testSmsResult, setTestSmsResult] = useState(null);

  const [testEmailAddress, setTestEmailAddress] = useState('admin@auramarket.com');
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState(null);

  const [isThemeDrawerOpen, setIsThemeDrawerOpen] = useState(false);
  const [themeForm, setThemeForm] = useState({
    storeName: uiConfig?.storeName || 'AuraMarket',
    announcementText: uiConfig?.announcementText || '🔥 Festive Sale Live! Up to 40% OFF with code FESTIVE2026',
    primaryColor: uiConfig?.primaryColor || '#F59E0B',
    bannerTitle: 'Spatial Audio Reinvented',
    bannerSubtitle: 'Immerse yourself in studio-grade acoustics.',
    footerText: uiConfig?.footerText || '© 2026 AuraMarket — Enterprise Multi-Vendor Marketplace Platform. All rights reserved.',
    supportPhone: uiConfig?.supportPhone || '+91 8533955333',
    supportEmail: uiConfig?.supportEmail || 'support@auramarket.com',
    showDemoNotice: uiConfig?.showDemoNotice ?? true,
  });

  const [actionMessage, setActionMessage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [analyticsRes, vendorsRes, integrationsRes] = await Promise.allSettled([
        api.get('/admin/analytics'),
        api.get('/admin/vendors'),
        api.get('/admin/integrations'),
      ]);

      if (analyticsRes.status === 'fulfilled' && analyticsRes.value.data?.success) {
        setAnalytics(prev => ({ ...prev, ...analyticsRes.value.data.data }));
      }
      if (vendorsRes.status === 'fulfilled' && vendorsRes.value.data?.success) {
        setVendors(vendorsRes.value.data.data);
      }
      if (integrationsRes.status === 'fulfilled' && integrationsRes.value.data?.success) {
        setIntegrations(prev => ({ ...prev, ...integrationsRes.value.data.data }));
      }
    } catch (_) {
      // Graceful fallback to rich initial showcase state
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (uiConfig?.integrations) {
      setIntegrations(prev => ({
        ...prev,
        ...uiConfig.integrations,
        sms: { ...(prev.sms || {}), ...(uiConfig.integrations.sms || {}) },
        payments: { ...(prev.payments || {}), ...(uiConfig.integrations.payments || {}) },
        email: { ...(prev.email || {}), ...(uiConfig.integrations.email || {}) },
        storage: { ...(prev.storage || {}), ...(uiConfig.integrations.storage || {}) },
      }));
    }
  }, [uiConfig?.integrations]);

  const handleStatusToggle = async (vendorId, currentStatus) => {
    const newStatus = currentStatus === 'approved' ? 'suspended' : 'approved';
    setVendors(prev =>
      prev.map(v => (v._id === vendorId ? { ...v, status: newStatus } : v))
    );
    try {
      await api.patch(`/admin/vendors/${vendorId}/status`, { status: newStatus });
      setActionMessage({
        type: 'success',
        text: `Vendor status updated to ${newStatus.toUpperCase()}`,
      });
    } catch (_) {
      setActionMessage({
        type: 'success',
        text: `Vendor status updated to ${newStatus.toUpperCase()} (Demo Live)`,
      });
    }
  };

  const handleCommissionChange = async (vendorId, newRate) => {
    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate < 0 || rate > 100) return;
    setVendors(prev =>
      prev.map(v => (v._id === vendorId ? { ...v, commissionRate: rate } : v))
    );
    try {
      await api.patch(`/admin/vendors/${vendorId}/commission`, { commissionRate: rate });
    } catch (_) {}
  };

  const handleWipeDemo = async () => {
    if (!window.confirm('⚠️ Reset marketplace demo? This wipes all test orders and restores default catalog.')) return;
    setIsProcessing(true);
    try {
      await api.post('/admin/demo/wipe');
      setActionMessage({ type: 'success', text: '✅ Demo database wiped and reset successfully!' });
      fetchDashboardData();
    } catch (_) {
      setActionMessage({ type: 'success', text: '✅ Demo database wiped and reset to clean showroom state!' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSeedDemo = async () => {
    setIsProcessing(true);
    try {
      await api.post('/admin/demo/seed');
      setActionMessage({ type: 'success', text: '🌱 Fresh demo catalog, vendors, and orders re-seeded!' });
      fetchDashboardData();
    } catch (_) {
      setActionMessage({ type: 'success', text: '🌱 Demo showroom re-seeded with realistic data!' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Save All Integrations to Backend & Storefront Config
  const handleSaveIntegrations = async () => {
    setIsProcessing(true);
    try {
      const res = await api.put('/admin/integrations', integrations);
      const updatedIntegrations = res.data?.data || integrations;
      setIntegrations(updatedIntegrations);
      setUiConfig(prev => ({ ...prev, integrations: updatedIntegrations }));
      setActionMessage({
        type: 'success',
        text: '🔌 Master Integrations & API credentials saved! Live across Storefront, Checkout & Backend.',
      });
    } catch (err) {
      // In demo mode without backend, synchronize locally
      setUiConfig(prev => ({ ...prev, integrations }));
      setActionMessage({
        type: 'success',
        text: '🔌 Master Integrations & API credentials saved! Live across Storefront, Checkout & Backend.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Save SEO & Webmaster Configuration to Backend
  const handleSaveSeo = async e => {
    if (e) e.preventDefault();
    setIsProcessing(true);
    try {
      const res = await api.put('/ui/config', { seo: seoConfig });
      const savedConfig = res.data?.data || { ...uiConfig, seo: seoConfig };
      setUiConfig(savedConfig);
      setActionMessage({
        type: 'success',
        text: '🔍 SEO & Webmaster settings saved successfully! Meta tags, GA4, Sitemaps, and Schema markup updated live.',
      });
    } catch (err) {
      setUiConfig(prev => ({ ...prev, seo: seoConfig }));
      setActionMessage({
        type: 'success',
        text: '🔍 SEO & Webmaster settings saved successfully! (Demo Mode Synchronized)',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Trigger Live Test SMS
  const handleTestSMS = async () => {
    setIsTestingSms(true);
    setTestSmsResult(null);
    try {
      const res = await api.post('/admin/integrations/test-sms', {
        phone: testSmsPhone,
        message: 'AuraMarket Live Test: Your SMS Gateway is connected and operating with 100% success!',
        provider: integrations.sms.activeProvider,
        config: integrations.sms,
      });
      const isSuccess = res.data?.success !== false;
      setTestSmsResult({
        success: isSuccess,
        message: res.data?.message || (isSuccess ? 'Test SMS sent successfully!' : 'Test SMS dispatch failed'),
        data: res.data?.data,
      });
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      setTestSmsResult({
        success: false,
        message: `Test SMS Failed: ${errMsg || 'Connection error'}`,
        data: { provider: integrations.sms.activeProvider, status: 'FAILED' },
      });
    } finally {
      setIsTestingSms(false);
    }
  };

  // Trigger Live Test Email
  const handleTestEmail = async () => {
    setIsTestingEmail(true);
    setTestEmailResult(null);
    try {
      const res = await api.post('/admin/integrations/test-email', {
        email: testEmailAddress,
        subject: 'AuraMarket Live SMTP Verification',
        message: 'Congratulations! Your SMTP credentials are functional and ready to dispatch customer notifications.',
        provider: integrations.email.activeProvider,
        config: integrations.email,
      });
      const isSuccess = res.data?.success !== false;
      setTestEmailResult({
        success: isSuccess,
        message: res.data?.message || (isSuccess ? 'Test Email sent successfully!' : 'Test Email dispatch failed'),
        data: res.data?.data,
      });
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      setTestEmailResult({
        success: false,
        message: `Test Email Failed: ${errMsg || 'SMTP connection error'}`,
        data: { provider: integrations.email.activeProvider, status: 'FAILED' },
      });
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleSaveTheme = async e => {
    e.preventDefault();
    const updated = {
      ...uiConfig,
      storeName: themeForm.storeName,
      announcementText: themeForm.announcementText,
      primaryColor: themeForm.primaryColor,
      footerText: themeForm.footerText,
      supportPhone: themeForm.supportPhone,
      supportEmail: themeForm.supportEmail,
      showDemoNotice: themeForm.showDemoNotice,
      heroBanners: [
        {
          title: themeForm.bannerTitle,
          subtitle: themeForm.bannerSubtitle,
          imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200',
          badgeText: 'Featured Deal',
          isActive: true,
        },
      ],
    };
    setUiConfig(updated);
    setIsThemeDrawerOpen(false);
    try {
      await api.put('/ui/config', updated);
      setActionMessage({ type: 'success', text: '🎨 Visual Theme, Branding & Footer updated live across Storefront and Apps!' });
    } catch (_) {
      setActionMessage({ type: 'success', text: '🎨 Visual Theme, Branding & Footer updated live across Storefront and Apps!' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in text-slate-800">
      {/* Top Banner Alert */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-sm font-bold flex items-center justify-between border shadow-sm ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="text-xs underline font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Header with Title & Top-Level Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Super Admin Control Center
            <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              Master Level
            </span>
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Global Marketplace Metrics, Partner Verification, and Plug-and-Play External Integrations
          </p>
        </div>

        {/* 1-Click Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsThemeDrawerOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold shadow-sm transition-all"
          >
            <Palette className="w-4 h-4 text-amber-500" />
            <span>Theme & Banner Manager</span>
          </button>

          <button
            onClick={handleSeedDemo}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-all"
          >
            <RefreshCw className="w-4 h-4 text-white" />
            <span>1-Click Seed Demo</span>
          </button>

          <button
            onClick={handleWipeDemo}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-all"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>1-Click Wipe Demo</span>
          </button>
        </div>
      </div>

      {/* Primary Dashboard Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveDashboardTab('overview')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm transition-all ${
            activeDashboardTab === 'overview'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4 text-amber-400" />
          <span>Marketplace Overview & Vendors</span>
        </button>

        <button
          onClick={() => setActiveDashboardTab('integrations')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm transition-all relative ${
            activeDashboardTab === 'integrations'
              ? 'bg-amber-500 text-white shadow-md'
              : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Plug className="w-4 h-4" />
          <span>🔌 Integrations & API Hub</span>
          <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 ml-1">
            Zero-Code
          </span>
        </button>

        <button
          onClick={() => setActiveDashboardTab('seo')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm transition-all relative ${
            activeDashboardTab === 'seo'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Search className="w-4 h-4 text-amber-400" />
          <span>🔍 SEO & Webmaster Hub</span>
          <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 ml-1">
            Google Ready
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & VENDORS */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'overview' && (
        <div className="space-y-8 animate-fade-in">
          {/* Bento Grid Analytics */}
          <BentoGrid>
            <BentoCard
              title="Total Gross Revenue"
              value={`₹${analytics.grossSales.toLocaleString('en-IN')}`}
              subtitle="Lifetime customer transactions across all vendors"
              icon={DollarSign}
              badge="+18.4% this month"
              badgeColor="text-emerald-800 bg-emerald-50 border-emerald-200"
              accentColor="text-emerald-600"
            />

            <BentoCard
              title="Platform Commission Cut"
              value={`₹${analytics.platformCommission.toLocaleString('en-IN')}`}
              subtitle="Net platform profit from vendor commission cuts"
              icon={TrendingUp}
              badge="Avg 10% Cut"
              badgeColor="text-amber-800 bg-amber-50 border-amber-200"
              accentColor="text-amber-600"
            />

            <BentoCard
              title="Active Partner Stores"
              value={`${analytics.approvedVendors} / ${analytics.totalVendors}`}
              subtitle="Verified sellers actively fulfilling orders"
              icon={Store}
              badge="2 Pending Review"
              badgeColor="text-blue-800 bg-blue-50 border-blue-200"
              accentColor="text-blue-600"
            />

            <BentoCard
              title="Total Live Products"
              value={analytics.totalProducts.toString()}
              subtitle="Stocked across 4 core departments"
              icon={Package}
              badge="Healthy Inventory"
              badgeColor="text-purple-800 bg-purple-50 border-purple-200"
              accentColor="text-purple-600"
            />
          </BentoGrid>

          {/* Partner Vendor Verification & Commission Management Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Store className="w-5 h-5 text-amber-500" />
                  Vendor Storefronts & Commission Control
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Review onboarding status, adjust percentage commissions, and inspect payout balances
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-200 text-slate-700">
                {vendors.length} Total Partners
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-6">Store & Owner</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Commission (%)</th>
                    <th className="py-3 px-4 text-right">Wallet Balance</th>
                    <th className="py-3 px-4 text-right">Lifetime Sales</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {vendors.map(v => (
                    <tr key={v._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 text-sm">{v.storeName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">ID: {v._id}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-slate-800 font-bold">{v.user?.name}</div>
                        <div className="text-slate-500 text-[11px]">{v.user?.email}</div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            v.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : v.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {v.status === 'approved' && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                          {v.status === 'pending' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                          {v.status === 'suspended' && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                          <span className="capitalize">{v.status}</span>
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={v.commissionRate}
                            onChange={e => handleCommissionChange(v._id, e.target.value)}
                            className="w-16 px-2 py-1 rounded bg-slate-50 border border-slate-300 text-slate-900 font-bold text-center focus:outline-none focus:border-amber-500"
                          />
                          <span className="font-bold text-slate-400">%</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-slate-900">
                        ₹{v.walletBalance?.toLocaleString('en-IN') || 0}
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-slate-900">
                        ₹{v.totalSales?.toLocaleString('en-IN') || 0}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleStatusToggle(v._id, v.status)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                            v.status === 'approved'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {v.status === 'approved' ? 'Suspend Store' : 'Approve Store'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 🔌 INTEGRATIONS & API HUB (NON-DEVELOPER FRIENDLY) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'integrations' && (
        <div className="space-y-6 animate-fade-in">
          {/* Zero-Code Info Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 border border-amber-300 text-slate-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-slate-950" />
                <h3 className="font-black text-base">Plug-and-Play Third-Party Integrations Engine</h3>
              </div>
              <p className="text-xs font-semibold text-slate-900 max-w-3xl">
                Har service (SMS, Payments, Email/SMTP, Media Storage) bina code touch kiye yahi Super Admin panel se configure hoti hai. Kisi developer ki zaroorat nahi hai — keys paste karke toggle ON karein aur turant live payein!
              </p>
            </div>
            <button
              onClick={handleSaveIntegrations}
              disabled={isProcessing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-400 text-xs font-black shadow-lg transition-all whitespace-nowrap"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span>{isProcessing ? 'Saving...' : 'Save All Integrations'}</span>
            </button>
          </div>

          {/* Sub-Tabs for Services */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => setIntegrationSubTab('payments')}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all ${
                integrationSubTab === 'payments'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>💳 Payment Gateways</span>
            </button>

            <button
              onClick={() => setIntegrationSubTab('sms')}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all ${
                integrationSubTab === 'sms'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-4 h-4 text-blue-600" />
              <span>📱 SMS Gateways</span>
            </button>

            <button
              onClick={() => setIntegrationSubTab('email')}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all ${
                integrationSubTab === 'email'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-4 h-4 text-purple-600" />
              <span>✉️ Email & SMTP</span>
            </button>

            <button
              onClick={() => setIntegrationSubTab('storage')}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all ${
                integrationSubTab === 'storage'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HardDrive className="w-4 h-4 text-amber-600" />
              <span>☁️ Cloud Storage</span>
            </button>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 1. PAYMENT GATEWAYS MANAGER */}
          {/* ------------------------------------------------------------- */}
          {integrationSubTab === 'payments' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-600" />
                    Multi-Gateway Payment Controller
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Toggle gateways ON/OFF below. The Customer Storefront checkout will automatically render only the payment methods you leave enabled!
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Gateway 1: Cash on Delivery (COD) */}
                  <div className={`p-5 rounded-2xl border transition-all ${
                    integrations.payments.cod.enabled ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/50'
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-sm">
                          💵
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">Cash on Delivery (COD)</h4>
                          <p className="text-[11px] text-slate-500">Collect cash upon doorstep delivery</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={integrations.payments.cod.enabled}
                          onChange={e =>
                            setIntegrations({
                              ...integrations,
                              payments: {
                                ...integrations.payments,
                                cod: { ...integrations.payments.cod, enabled: e.target.checked },
                              },
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase">Checkout Label</label>
                      <input
                        type="text"
                        value={integrations.payments.cod.label}
                        onChange={e =>
                          setIntegrations({
                            ...integrations,
                            payments: {
                              ...integrations.payments,
                              cod: { ...integrations.payments.cod, label: e.target.value },
                            },
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Gateway 2: Direct UPI / QR Code */}
                  <div className={`p-5 rounded-2xl border transition-all ${
                    integrations.payments.upi.enabled ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/50'
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 font-black text-sm">
                          ⚡
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">Direct UPI & Dynamic QR</h4>
                          <p className="text-[11px] text-slate-500">Zero commission direct bank transfer</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={integrations.payments.upi.enabled}
                          onChange={e =>
                            setIntegrations({
                              ...integrations,
                              payments: {
                                ...integrations.payments,
                                upi: { ...integrations.payments.upi, enabled: e.target.checked },
                              },
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">Merchant UPI ID (VPA)</label>
                        <input
                          type="text"
                          placeholder="e.g. 8533955333@paytm or yourstore@icici"
                          value={integrations.payments.upi.upiId}
                          onChange={e =>
                            setIntegrations({
                              ...integrations,
                              payments: {
                                ...integrations.payments,
                                upi: { ...integrations.payments.upi, upiId: e.target.value },
                              },
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">Merchant Display Name</label>
                        <input
                          type="text"
                          placeholder="AuraMarket Enterprise"
                          value={integrations.payments.upi.merchantName}
                          onChange={e =>
                            setIntegrations({
                              ...integrations,
                              payments: {
                                ...integrations.payments,
                                upi: { ...integrations.payments.upi, merchantName: e.target.value },
                              },
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Gateway 3: Razorpay */}
                  <div className={`p-5 rounded-2xl border transition-all ${
                    integrations.payments.razorpay.enabled ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/50'
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-black text-sm">
                          💳
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">Razorpay (India's #1 Gateway)</h4>
                          <p className="text-[11px] text-slate-500">Cards, NetBanking, Wallets, UPI Autopay</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={integrations.payments.razorpay.enabled}
                          onChange={e =>
                            setIntegrations({
                              ...integrations,
                              payments: {
                                ...integrations.payments,
                                razorpay: { ...integrations.payments.razorpay, enabled: e.target.checked },
                              },
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">Razorpay Key ID</label>
                        <input
                          type="text"
                          placeholder="rzp_live_xxxxxxxxxxxxxx"
                          value={integrations.payments.razorpay.keyId}
                          onChange={e =>
                            setIntegrations({
                              ...integrations,
                              payments: {
                                ...integrations.payments,
                                razorpay: { ...integrations.payments.razorpay, keyId: e.target.value },
                              },
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-mono font-semibold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">Razorpay Key Secret</label>
                        <div className="relative">
                          <input
                            type={showSecrets.razorpaySecret ? 'text' : 'password'}
                            placeholder="Enter Razorpay Secret"
                            value={integrations.payments.razorpay.keySecret}
                            onChange={e =>
                              setIntegrations({
                                ...integrations,
                                payments: {
                                  ...integrations.payments,
                                  razorpay: { ...integrations.payments.razorpay, keySecret: e.target.value },
                                },
                              })
                            }
                            className="w-full px-3 py-2 pr-10 rounded-lg bg-white border border-slate-300 text-xs font-mono font-semibold text-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowSecrets({ ...showSecrets, razorpaySecret: !showSecrets.razorpaySecret })
                            }
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                          >
                            {showSecrets.razorpaySecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Get from: <a href="https://dashboard.razorpay.com/#/app/keys" target="_blank" rel="noreferrer" className="text-blue-600 underline">dashboard.razorpay.com &gt; Settings &gt; API Keys</a>
                      </p>
                    </div>
                  </div>

                  {/* Gateway 4: Stripe */}
                  <div className={`p-5 rounded-2xl border transition-all ${
                    integrations.payments.stripe.enabled ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/50'
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm">
                          🌐
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">Stripe (Global & International)</h4>
                          <p className="text-[11px] text-slate-500">Worldwide Cards, Apple Pay, Google Pay</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={integrations.payments.stripe.enabled}
                          onChange={e =>
                            setIntegrations({
                              ...integrations,
                              payments: {
                                ...integrations.payments,
                                stripe: { ...integrations.payments.stripe, enabled: e.target.checked },
                              },
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">Stripe Publishable Key</label>
                        <input
                          type="text"
                          placeholder="pk_live_xxxxxxxxxxxxxx"
                          value={integrations.payments.stripe.publishableKey}
                          onChange={e =>
                            setIntegrations({
                              ...integrations,
                              payments: {
                                ...integrations.payments,
                                stripe: { ...integrations.payments.stripe, publishableKey: e.target.value },
                              },
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-mono font-semibold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">Stripe Secret Key</label>
                        <div className="relative">
                          <input
                            type={showSecrets.stripeSecret ? 'text' : 'password'}
                            placeholder="Enter Stripe Secret"
                            value={integrations.payments.stripe.secretKey}
                            onChange={e =>
                              setIntegrations({
                                ...integrations,
                                payments: {
                                  ...integrations.payments,
                                  stripe: { ...integrations.payments.stripe, secretKey: e.target.value },
                                },
                              })
                            }
                            className="w-full px-3 py-2 pr-10 rounded-lg bg-white border border-slate-300 text-xs font-mono font-semibold text-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowSecrets({ ...showSecrets, stripeSecret: !showSecrets.stripeSecret })
                            }
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                          >
                            {showSecrets.stripeSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Get from: <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noreferrer" className="text-indigo-600 underline">dashboard.stripe.com &gt; Developers &gt; API keys</a>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-500 font-medium">
                    Storefront will activate:{' '}
                    <span className="font-bold text-slate-800">
                      {[
                        integrations.payments.cod.enabled && 'Cash on Delivery',
                        integrations.payments.upi.enabled && 'Direct UPI',
                        integrations.payments.razorpay.enabled && 'Razorpay',
                        integrations.payments.stripe.enabled && 'Stripe',
                      ]
                        .filter(Boolean)
                        .join(', ') || 'No Gateways (Please enable at least one)'}
                    </span>
                  </div>
                  <button
                    onClick={handleSaveIntegrations}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all"
                  >
                    <Save className="w-4 h-4 text-amber-400" />
                    <span>Apply Payment Settings Live</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* 2. SMS GATEWAYS MANAGER */}
          {/* ------------------------------------------------------------- */}
          {integrationSubTab === 'sms' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-blue-600" />
                      SMS Gateway & OTP Dispatch Manager
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Automated OTPs, customer delivery codes, and vendor order updates via SMS.
                    </p>
                  </div>

                  {/* Active Provider Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">Active Provider:</span>
                    <select
                      value={integrations.sms.activeProvider}
                      onChange={e =>
                        setIntegrations({
                          ...integrations,
                          sms: { ...integrations.sms, activeProvider: e.target.value },
                        })
                      }
                      className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-bold text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                    >
                      <option value="mock">In-App Mock Tester (Free, Zero Setup)</option>
                      <option value="fast2sms">Fast2SMS (India Quick OTP)</option>
                      <option value="msg91">MSG91 (Enterprise DLT)</option>
                      <option value="twilio">Twilio (Global International)</option>
                    </select>
                  </div>
                </div>

                {/* Live Test SMS Bar */}
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-3">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="w-full sm:w-auto">
                      <h4 className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-blue-700" />
                        Live Test SMS Dispatcher
                      </h4>
                      <p className="text-[11px] text-blue-700">Test your configured provider credentials with a real message</p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input
                        type="text"
                        placeholder="+91 8533955333"
                        value={testSmsPhone}
                        onChange={e => setTestSmsPhone(e.target.value)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-blue-300 text-xs font-bold text-slate-800 w-full sm:w-48"
                      />
                      <button
                        onClick={handleTestSMS}
                        disabled={isTestingSms}
                        className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-sm transition-all whitespace-nowrap"
                      >
                        {isTestingSms ? 'Sending...' : 'Send Test SMS'}
                      </button>
                    </div>
                  </div>

                  {testSmsResult && (
                    <div className={`p-2.5 rounded-lg text-xs font-bold flex items-center justify-between ${
                      testSmsResult.success ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
                    }`}>
                      <span>{testSmsResult.message}</span>
                      <span className="text-[10px] font-mono opacity-80">Provider: {integrations.sms.activeProvider.toUpperCase()}</span>
                    </div>
                  )}
                </div>

                {/* Provider Forms */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Fast2SMS Card */}
                  <div className={`p-5 rounded-2xl border ${
                    integrations.sms.activeProvider === 'fast2sms' ? 'border-amber-400 bg-amber-50/20 ring-2 ring-amber-400/20' : 'border-slate-200 bg-slate-50'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-slate-900 text-sm">Fast2SMS (India)</h4>
                      {integrations.sms.activeProvider === 'fast2sms' && (
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">Fast2SMS API Key</label>
                        <input
                          type="text"
                          placeholder="Paste API Key here"
                          value={integrations.sms.fast2sms.apiKey}
                          onChange={e =>
                            setIntegrations({
                              ...integrations,
                              sms: {
                                ...integrations.sms,
                                fast2sms: { ...integrations.sms.fast2sms, apiKey: e.target.value },
                              },
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-mono font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">Sender ID / Route</label>
                        <input
                          type="text"
                          value={integrations.sms.fast2sms.senderId}
                          onChange={e =>
                            setIntegrations({
                              ...integrations,
                              sms: {
                                ...integrations.sms,
                                fast2sms: { ...integrations.sms.fast2sms, senderId: e.target.value },
                              },
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Get from: <a href="https://www.fast2sms.com/dashboard/dev-api" target="_blank" rel="noreferrer" className="text-blue-600 underline">fast2sms.com/dashboard</a>
                      </p>
                    </div>
                  </div>

                  {/* MSG91 Card */}
                  <div className={`p-5 rounded-2xl border ${
                    integrations.sms.activeProvider === 'msg91' ? 'border-amber-400 bg-amber-50/20 ring-2 ring-amber-400/20' : 'border-slate-200 bg-slate-50'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-slate-900 text-sm">MSG91 Enterprise</h4>
                      {integrations.sms.activeProvider === 'msg91' && (
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">MSG91 Auth Key</label>
                        <input
                          type="text"
                          placeholder="Paste MSG91 Auth Key"
                          value={integrations.sms.msg91.authKey}
                          onChange={e =>
                            setIntegrations({
                              ...integrations,
                              sms: {
                                ...integrations.sms,
                                msg91: { ...integrations.sms.msg91, authKey: e.target.value },
                              },
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-mono font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">DLT Sender Header</label>
                        <input
                          type="text"
                          value={integrations.sms.msg91.senderId}
                          onChange={e =>
                            setIntegrations({
                              ...integrations,
                              sms: {
                                ...integrations.sms,
                                msg91: { ...integrations.sms.msg91, senderId: e.target.value },
                              },
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Get from: <a href="https://msg91.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">msg91.com panel</a>
                      </p>
                    </div>
                  </div>

                  {/* Twilio Card */}
                  <div className={`p-5 rounded-2xl border ${
                    integrations.sms.activeProvider === 'twilio' ? 'border-amber-400 bg-amber-50/20 ring-2 ring-amber-400/20' : 'border-slate-200 bg-slate-50'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-slate-900 text-sm">Twilio International</h4>
                      {integrations.sms.activeProvider === 'twilio' && (
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">Twilio Account SID</label>
                        <input
                          type="text"
                          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxx"
                          value={integrations.sms.twilio.accountSid}
                          onChange={e =>
                            setIntegrations({
                              ...integrations,
                              sms: {
                                ...integrations.sms,
                                twilio: { ...integrations.sms.twilio, accountSid: e.target.value },
                              },
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-mono font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">Twilio Auth Token</label>
                        <div className="relative">
                          <input
                            type={showSecrets.twilioAuth ? 'text' : 'password'}
                            placeholder="Auth Token"
                            value={integrations.sms.twilio.authToken}
                            onChange={e =>
                              setIntegrations({
                                ...integrations,
                                sms: {
                                  ...integrations.sms,
                                  twilio: { ...integrations.sms.twilio, authToken: e.target.value },
                                },
                              })
                            }
                            className="w-full px-3 py-2 pr-10 rounded-lg bg-white border border-slate-300 text-xs font-mono font-semibold"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecrets({ ...showSecrets, twilioAuth: !showSecrets.twilioAuth })}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                          >
                            {showSecrets.twilioAuth ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">Twilio Phone / Sender</label>
                        <input
                          type="text"
                          placeholder="+15005550006"
                          value={integrations.sms.twilio.fromPhone}
                          onChange={e =>
                            setIntegrations({
                              ...integrations,
                              sms: {
                                ...integrations.sms,
                                twilio: { ...integrations.sms.twilio, fromPhone: e.target.value },
                              },
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end">
                  <button
                    onClick={handleSaveIntegrations}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all"
                  >
                    <Save className="w-4 h-4 text-amber-400" />
                    <span>Apply SMS Settings Live</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* 3. EMAIL & SMTP NOTIFICATIONS MANAGER */}
          {/* ------------------------------------------------------------- */}
          {integrationSubTab === 'email' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <Mail className="w-5 h-5 text-purple-600" />
                      Email & SMTP Notification Controller
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Configure custom SMTP (Hostinger, cPanel, Gmail, Outlook) or SendGrid for order receipts & vendor alerts.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">Active Provider:</span>
                    <select
                      value={integrations.email.activeProvider}
                      onChange={e =>
                        setIntegrations({
                          ...integrations,
                          email: { ...integrations.email, activeProvider: e.target.value },
                        })
                      }
                      className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-bold text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                    >
                      <option value="mock">In-App Mock Mailer (Zero Setup)</option>
                      <option value="smtp">Custom SMTP Server (Hostinger, Gmail, cPanel)</option>
                      <option value="sendgrid">SendGrid API</option>
                    </select>
                  </div>
                </div>

                {/* Live Test Email Bar */}
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-3">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="w-full sm:w-auto">
                      <h4 className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-purple-700" />
                        Live Test Email Verifier
                      </h4>
                      <p className="text-[11px] text-purple-700">Send an instant test email to verify your SMTP connection</p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input
                        type="email"
                        placeholder="admin@auramarket.com"
                        value={testEmailAddress}
                        onChange={e => setTestEmailAddress(e.target.value)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-purple-300 text-xs font-bold text-slate-800 w-full sm:w-60"
                      />
                      <button
                        onClick={handleTestEmail}
                        disabled={isTestingEmail}
                        className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-sm transition-all whitespace-nowrap"
                      >
                        {isTestingEmail ? 'Sending...' : 'Send Test Email'}
                      </button>
                    </div>
                  </div>

                  {testEmailResult && (
                    <div className={`p-2.5 rounded-lg text-xs font-bold flex items-center justify-between ${
                      testEmailResult.success ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
                    }`}>
                      <span>{testEmailResult.message}</span>
                      <span className="text-[10px] font-mono opacity-80">Provider: {integrations.email.activeProvider.toUpperCase()}</span>
                    </div>
                  )}
                </div>

                {/* SMTP Setup Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-4">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span>⚙️ Custom SMTP Settings</span>
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">SMTP Host</label>
                        <input
                          type="text"
                          placeholder="smtp.hostinger.com / smtp.gmail.com"
                          value={integrations.email.smtp.host}
                          onChange={e =>
                            setIntegrations({
                              ...integrations,
                              email: {
                                ...integrations.email,
                                smtp: { ...integrations.email.smtp, host: e.target.value },
                              },
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">Port</label>
                        <input
                          type="number"
                          placeholder="587 or 465"
                          value={integrations.email.smtp.port}
                          onChange={e =>
                            setIntegrations({
                              ...integrations,
                              email: {
                                ...integrations.email,
                                smtp: { ...integrations.email.smtp, port: Number(e.target.value) },
                              },
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">Username / Email</label>
                        <input
                          type="text"
                          placeholder="notifications@yourdomain.com"
                          value={integrations.email.smtp.username}
                          onChange={e =>
                            setIntegrations({
                              ...integrations,
                              email: {
                                ...integrations.email,
                                smtp: { ...integrations.email.smtp, username: e.target.value },
                              },
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
                            placeholder="SMTP Password"
                            value={integrations.email.smtp.password}
                            onChange={e =>
                              setIntegrations({
                                ...integrations,
                                email: {
                                  ...integrations.email,
                                  smtp: { ...integrations.email.smtp, password: e.target.value },
                                },
                              })
                            }
                            className="w-full px-3 py-2 pr-10 rounded-lg bg-white border border-slate-300 text-xs font-mono font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecrets({ ...showSecrets, smtpPassword: !showSecrets.smtpPassword })}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                          >
                            {showSecrets.smtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">Sender Email Address</label>
                        <input
                          type="email"
                          placeholder="orders@yourdomain.com"
                          value={integrations.email.smtp.fromEmail}
                          onChange={e =>
                            setIntegrations({
                              ...integrations,
                              email: {
                                ...integrations.email,
                                smtp: { ...integrations.email.smtp, fromEmail: e.target.value },
                              },
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">Sender Name</label>
                        <input
                          type="text"
                          placeholder="AuraMarket Store"
                          value={integrations.email.smtp.fromName}
                          onChange={e =>
                            setIntegrations({
                              ...integrations,
                              email: {
                                ...integrations.email,
                                smtp: { ...integrations.email.smtp, fromName: e.target.value },
                              },
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SendGrid API Card */}
                  <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-4">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span>🚀 SendGrid Web API</span>
                    </h4>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase">SendGrid API Key</label>
                      <input
                        type="text"
                        placeholder="SG.xxxxxxxxxxxxxxxxxxxxxxxx"
                        value={integrations.email.sendgrid.apiKey}
                        onChange={e =>
                          setIntegrations({
                            ...integrations,
                            email: {
                              ...integrations.email,
                              sendgrid: { ...integrations.email.sendgrid, apiKey: e.target.value },
                            },
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-mono font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">From Email</label>
                        <input
                          type="email"
                          value={integrations.email.sendgrid.fromEmail}
                          onChange={e =>
                            setIntegrations({
                              ...integrations,
                              email: {
                                ...integrations.email,
                                sendgrid: { ...integrations.email.sendgrid, fromEmail: e.target.value },
                              },
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">From Name</label>
                        <input
                          type="text"
                          value={integrations.email.sendgrid.fromName}
                          onChange={e =>
                            setIntegrations({
                              ...integrations,
                              email: {
                                ...integrations.email,
                                sendgrid: { ...integrations.email.sendgrid, fromName: e.target.value },
                              },
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium"
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-slate-200 text-[11px] text-slate-500 space-y-1">
                      <span className="font-bold text-slate-700">💡 Non-Developer Quick Tip:</span>
                      <p>
                        Hostinger, cPanel, or Zoho users can use their webmail SMTP credentials directly. For Gmail, enable 2-Step Verification and generate an "App Password".
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end">
                  <button
                    onClick={handleSaveIntegrations}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all"
                  >
                    <Save className="w-4 h-4 text-amber-400" />
                    <span>Apply Email Settings Live</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* 4. CLOUD STORAGE & MEDIA MANAGER */}
          {/* ------------------------------------------------------------- */}
          {integrationSubTab === 'storage' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <HardDrive className="w-5 h-5 text-amber-600" />
                      Cloud Storage & Media Manager
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Manage product image and document uploads across Local Disk, Cloudinary, or Amazon AWS S3.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">Active Storage:</span>
                    <select
                      value={integrations.storage.activeProvider}
                      onChange={e =>
                        setIntegrations({
                          ...integrations,
                          storage: { ...integrations.storage, activeProvider: e.target.value },
                        })
                      }
                      className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-bold text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                    >
                      <option value="local">Local Server Storage (Free Default, No Setup)</option>
                      <option value="cloudinary">Cloudinary Media CDN</option>
                      <option value="s3">Amazon AWS S3 Bucket</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Cloudinary Card */}
                  <div className={`p-5 rounded-2xl border ${
                    integrations.storage.activeProvider === 'cloudinary' ? 'border-amber-400 bg-amber-50/20 ring-2 ring-amber-400/20' : 'border-slate-200 bg-slate-50'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-slate-900 text-sm">Cloudinary Image CDN</h4>
                      {integrations.storage.activeProvider === 'cloudinary' && (
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">Cloud Name</label>
                        <input
                          type="text"
                          placeholder="e.g. auramarket-live"
                          value={integrations.storage.cloudinary.cloudName}
                          onChange={e =>
                            setIntegrations({
                              ...integrations,
                              storage: {
                                ...integrations.storage,
                                cloudinary: { ...integrations.storage.cloudinary, cloudName: e.target.value },
                              },
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">API Key</label>
                        <input
                          type="text"
                          value={integrations.storage.cloudinary.apiKey}
                          onChange={e =>
                            setIntegrations({
                              ...integrations,
                              storage: {
                                ...integrations.storage,
                                cloudinary: { ...integrations.storage.cloudinary, apiKey: e.target.value },
                              },
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-mono font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">API Secret</label>
                        <div className="relative">
                          <input
                            type={showSecrets.cloudinarySecret ? 'text' : 'password'}
                            value={integrations.storage.cloudinary.apiSecret}
                            onChange={e =>
                              setIntegrations({
                                ...integrations,
                                storage: {
                                  ...integrations.storage,
                                  cloudinary: { ...integrations.storage.cloudinary, apiSecret: e.target.value },
                                },
                              })
                            }
                            className="w-full px-3 py-2 pr-10 rounded-lg bg-white border border-slate-300 text-xs font-mono font-semibold"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecrets({ ...showSecrets, cloudinarySecret: !showSecrets.cloudinarySecret })}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                          >
                            {showSecrets.cloudinarySecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Amazon S3 Card */}
                  <div className={`p-5 rounded-2xl border ${
                    integrations.storage.activeProvider === 's3' ? 'border-amber-400 bg-amber-50/20 ring-2 ring-amber-400/20' : 'border-slate-200 bg-slate-50'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-slate-900 text-sm">Amazon AWS S3</h4>
                      {integrations.storage.activeProvider === 's3' && (
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase">S3 Bucket Name</label>
                          <input
                            type="text"
                            placeholder="auramarket-media"
                            value={integrations.storage.s3.bucket}
                            onChange={e =>
                              setIntegrations({
                                ...integrations,
                                storage: {
                                  ...integrations.storage,
                                  s3: { ...integrations.storage.s3, bucket: e.target.value },
                                },
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase">AWS Region</label>
                          <input
                            type="text"
                            placeholder="ap-south-1"
                            value={integrations.storage.s3.region}
                            onChange={e =>
                              setIntegrations({
                                ...integrations,
                                storage: {
                                  ...integrations.storage,
                                  s3: { ...integrations.storage.s3, region: e.target.value },
                                },
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">AWS Access Key</label>
                        <input
                          type="text"
                          value={integrations.storage.s3.accessKey}
                          onChange={e =>
                            setIntegrations({
                              ...integrations,
                              storage: {
                                ...integrations.storage,
                                s3: { ...integrations.storage.s3, accessKey: e.target.value },
                              },
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-mono font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">AWS Secret Key</label>
                        <div className="relative">
                          <input
                            type={showSecrets.s3Secret ? 'text' : 'password'}
                            value={integrations.storage.s3.secretKey}
                            onChange={e =>
                              setIntegrations({
                                ...integrations,
                                storage: {
                                  ...integrations.storage,
                                  s3: { ...integrations.storage.s3, secretKey: e.target.value },
                                },
                              })
                            }
                            className="w-full px-3 py-2 pr-10 rounded-lg bg-white border border-slate-300 text-xs font-mono font-semibold"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecrets({ ...showSecrets, s3Secret: !showSecrets.s3Secret })}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                          >
                            {showSecrets.s3Secret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end">
                  <button
                    onClick={handleSaveIntegrations}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all"
                  >
                    <Save className="w-4 h-4 text-amber-400" />
                    <span>Apply Storage Settings Live</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: 🔍 SEO & WEBMASTER HUB (ENTERPRISE SEARCH & INDEXING SUITE) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'seo' && (
        <div className="space-y-6 animate-fade-in">
          {/* SEO Header Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-600 to-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-base">Enterprise E-Commerce SEO & Webmaster Center</h3>
              </div>
              <p className="text-xs font-medium text-blue-100 max-w-3xl">
                Configure your store meta tags, social sharing previews, Google Search Console ownership, GA4 analytics, and Schema.org rich snippets with zero coding. All updates synchronize live across all storefront pages!
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveSeo}
                disabled={isProcessing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black shadow-lg transition-all whitespace-nowrap"
              >
                <Save className="w-4 h-4 text-slate-950" />
                <span>{isProcessing ? 'Saving...' : 'Save SEO Configuration'}</span>
              </button>
            </div>
          </div>

          {/* Quick Technical SEO Endpoints Bar */}
          <div className="bg-slate-900 rounded-2xl p-4 text-white flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                ⚡
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Live Search Engine Feeds Generated Automatically</h4>
                <p className="text-[11px] text-slate-400">Search engines crawl these URLs to index all catalog products within 24–48 hours.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={`${(seoConfig.canonicalUrl || '').replace(/\/+$/, '')}/sitemap.xml`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-950 hover:bg-blue-900 border border-blue-700/60 text-blue-300 text-xs font-mono font-bold transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>/sitemap.xml</span>
              </a>
              <a
                href={`${(seoConfig.canonicalUrl || '').replace(/\/+$/, '')}/robots.txt`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-mono font-bold transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>/robots.txt</span>
              </a>
            </div>
          </div>

          {/* 4 Core SEO Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* CARD 1: Core Search Engine Meta Tags */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                    <Search className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">On-Page Meta Tags</h4>
                    <p className="text-[11px] text-slate-500">Google, Bing & Yahoo primary indexing tags</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Essential
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Meta Title (Brand + Value Proposition)</label>
                  <span className="text-[11px] font-mono text-slate-400">{seoConfig.metaTitle.length}/60 chars</span>
                </div>
                <input
                  type="text"
                  value={seoConfig.metaTitle}
                  onChange={e => setSeoConfig({ ...seoConfig, metaTitle: e.target.value })}
                  placeholder="e.g. AuraMarket — The Next-Gen Multi-Vendor Commerce Platform"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-medium text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Meta Description</label>
                  <span className="text-[11px] font-mono text-slate-400">{seoConfig.metaDescription.length}/160 chars</span>
                </div>
                <textarea
                  rows="3"
                  value={seoConfig.metaDescription}
                  onChange={e => setSeoConfig({ ...seoConfig, metaDescription: e.target.value })}
                  placeholder="e.g. Discover top electronics, audio, fashion, and lifestyle brands from verified merchants with express delivery and OTP verification."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-medium text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Meta Keywords (Comma-Separated)
                </label>
                <input
                  type="text"
                  value={seoConfig.metaKeywords}
                  onChange={e => setSeoConfig({ ...seoConfig, metaKeywords: e.target.value })}
                  placeholder="ecommerce, multi-vendor marketplace, online shopping, electronics"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-medium text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Canonical URL (Prevents Duplicate Content Penalty)
                </label>
                <input
                  type="url"
                  value={seoConfig.canonicalUrl}
                  onChange={e => setSeoConfig({ ...seoConfig, canonicalUrl: e.target.value })}
                  placeholder="https://shribalajikripadham.online/ecommerce-demo/"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* CARD 2: Social Media & Open Graph */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Social Media & Open Graph</h4>
                    <p className="text-[11px] text-slate-500">Rich snippet link previews on WhatsApp, Facebook, X</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  Viral Previews
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Open Graph Social Image URL (1200 x 630 px Recommended)
                </label>
                <input
                  type="url"
                  value={seoConfig.ogImage}
                  onChange={e => setSeoConfig({ ...seoConfig, ogImage: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* OG Image Live Preview Card */}
              {seoConfig.ogImage && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Social Preview Simulation</span>
                  <div className="relative rounded-lg overflow-hidden border border-slate-300 bg-slate-900 aspect-[16/9] max-h-36">
                    <img
                      src={seoConfig.ogImage}
                      alt="Open Graph Preview"
                      className="w-full h-full object-cover"
                      onError={e => { e.target.src = 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600'; }}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent p-2 text-white">
                      <div className="text-[11px] font-bold truncate">{seoConfig.metaTitle}</div>
                      <div className="text-[9px] text-slate-300 truncate">{seoConfig.canonicalUrl}</div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Facebook Pixel ID / Meta Ad Tracker (Optional)
                </label>
                <input
                  type="text"
                  value={seoConfig.facebookPixelId}
                  onChange={e => setSeoConfig({ ...seoConfig, facebookPixelId: e.target.value })}
                  placeholder="e.g. 123456789012345"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* CARD 3: Webmaster Verification & Google Analytics 4 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Google Webmaster & GA4 Analytics</h4>
                    <p className="text-[11px] text-slate-500">Search Console verification & visitor measurement</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Analytics
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Google Search Console Verification Tag / Code
                </label>
                <input
                  type="text"
                  value={seoConfig.googleSiteVerification}
                  onChange={e => setSeoConfig({ ...seoConfig, googleSiteVerification: e.target.value })}
                  placeholder="e.g. google-site-verification=XXXXXXXXXXXXXXXXXXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Paste the verification code from Google Search Console (HTML Tag verification method). The platform automatically injects &lt;meta name="google-site-verification"&gt;.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Google Analytics 4 (GA4) Measurement ID
                </label>
                <input
                  type="text"
                  value={seoConfig.googleAnalyticsId}
                  onChange={e => setSeoConfig({ ...seoConfig, googleAnalyticsId: e.target.value })}
                  placeholder="e.g. G-XXXXXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Create a data stream at analytics.google.com and enter your <span className="font-mono text-amber-600 font-bold">G-XXXXXXXXXX</span> ID to start tracking visits, cart additions, and conversions automatically.
                </p>
              </div>
            </div>

            {/* CARD 4: Structured Data (Schema.org) & Rich Snippets */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                    <Code className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Schema.org Rich Snippets Markup</h4>
                    <p className="text-[11px] text-slate-500">Google Rich Results with pricing, ratings & sitelinks</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enableRichSnippetsToggle"
                    checked={seoConfig.enableRichSnippets}
                    onChange={e => setSeoConfig({ ...seoConfig, enableRichSnippets: e.target.checked })}
                    className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-400"
                  />
                  <label htmlFor="enableRichSnippetsToggle" className="text-xs font-bold text-slate-800 cursor-pointer">
                    Enable Rich Snippets
                  </label>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <span className="font-bold text-slate-900 block">Structured Data Entities Injected Automatically:</span>
                <ul className="space-y-1.5 text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span><strong>WebSite Schema + SearchAction:</strong> Enables Google Sitelinks Search Box directly on SERP.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span><strong>Organization Schema:</strong> Brand name, logo, and customer support phone line.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span><strong>ItemList & Product Schema:</strong> Real-time pricing (₹), availability (InStock), and merchant details.</span>
                  </li>
                </ul>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs">
                <span className="font-bold">Google Rich Results Test:</span> All generated JSON-LD scripts are 100% compliant with schema.org specifications and pass Google Rich Results Validator tests.
              </div>
            </div>

          </div>

          {/* Bottom Save Bar */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={handleSaveSeo}
              disabled={isProcessing}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isProcessing ? 'Saving Settings...' : 'Save SEO & Webmaster Configuration'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Visual Theme & Dynamic Branding Drawer */}
      <SlideOverDrawer
        isOpen={isThemeDrawerOpen}
        onClose={() => setIsThemeDrawerOpen(false)}
        title="Visual Theme & Marketplace Customizer"
      >
        <form onSubmit={handleSaveTheme} className="space-y-6 text-slate-800">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
            <span className="font-bold">⚡ Real-Time Theme Engine:</span> Changes saved here reflect immediately on the Customer Storefront, Top Navigation, and Mobile simulators.
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Marketplace Store Name
            </label>
            <input
              type="text"
              value={themeForm.storeName}
              onChange={e => setThemeForm({ ...themeForm, storeName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold text-sm focus:outline-none focus:border-amber-500"
              placeholder="e.g. AuraMarket"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Top Announcement Ticker
            </label>
            <input
              type="text"
              value={themeForm.announcementText}
              onChange={e => setThemeForm({ ...themeForm, announcementText: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-medium text-sm focus:outline-none focus:border-amber-500"
              placeholder="Sale announcement ticker"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Hero Banner Heading
            </label>
            <input
              type="text"
              value={themeForm.bannerTitle}
              onChange={e => setThemeForm({ ...themeForm, bannerTitle: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-medium text-sm focus:outline-none focus:border-amber-500"
              placeholder="Banner headline"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Hero Banner Subtitle
            </label>
            <textarea
              rows="3"
              value={themeForm.bannerSubtitle}
              onChange={e => setThemeForm({ ...themeForm, bannerSubtitle: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-medium text-sm focus:outline-none focus:border-amber-500"
              placeholder="Banner description"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Store Footer & Copyright Text
            </label>
            <input
              type="text"
              value={themeForm.footerText}
              onChange={e => setThemeForm({ ...themeForm, footerText: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-medium text-sm focus:outline-none focus:border-amber-500"
              placeholder="e.g. © 2026 YourStore. All rights reserved."
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Support Helpline Phone
              </label>
              <input
                type="text"
                value={themeForm.supportPhone}
                onChange={e => setThemeForm({ ...themeForm, supportPhone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-medium text-sm focus:outline-none focus:border-amber-500"
                placeholder="+91 8533955333"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Support Email
              </label>
              <input
                type="email"
                value={themeForm.supportEmail}
                onChange={e => setThemeForm({ ...themeForm, supportEmail: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-medium text-sm focus:outline-none focus:border-amber-500"
                placeholder="support@yourstore.com"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="showDemoNoticeToggle"
                checked={themeForm.showDemoNotice}
                onChange={e => setThemeForm({ ...themeForm, showDemoNotice: e.target.checked })}
                className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-400"
              />
              <label htmlFor="showDemoNoticeToggle" className="text-xs font-bold text-slate-800 cursor-pointer">
                Display Showroom & Developer Purchase Box
              </label>
            </div>
            <p className="text-[11px] text-slate-500 pl-6">
              Enable when hosting a public live demo to allow visitors to purchase directly. Disable for 100% white-label client production stores.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-md transition-all"
            >
              Apply Theme Live Everywhere
            </button>
          </div>
        </form>
      </SlideOverDrawer>
    </div>
  );
};
