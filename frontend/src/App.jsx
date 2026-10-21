import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { LocalizationProvider } from './context/LocalizationContext';
import { Navbar } from './components/Navbar';
import { DemoToolbar } from './components/DemoToolbar';
import { DocumentationModal } from './components/DocumentationModal';
import { CmsPolicyViewerModal } from './components/CmsPolicyViewerModal';
import { FaqSection } from './components/FaqSection';
import { ExitIntentCartModal } from './components/ExitIntentCartModal';
import { ShoppingBag, Flame, Layers, LayoutGrid, MessageCircle, Phone, BookOpen, ChevronUp, RefreshCw } from 'lucide-react';
import api from './api/client';

// Optimized Lazy-Loaded Portals & Dashboards for Lighthouse 90+ Score
const DemoHub = lazy(() => import('./components/DemoHub').then(m => ({ default: m.DemoHub })));
const CustomerStorefront = lazy(() => import('./pages/CustomerStorefront').then(m => ({ default: m.CustomerStorefront })));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));
const VendorPortal = lazy(() => import('./pages/VendorPortal').then(m => ({ default: m.VendorPortal })));
const CourierDashboard = lazy(() => import('./pages/CourierDashboard').then(m => ({ default: m.CourierDashboard })));
const InstallWizard = lazy(() => import('./components/InstallWizard').then(m => ({ default: m.InstallWizard })));

const PortalLoadingSkeleton = ({ label = 'Loading AuraMarket Portal...' }) => (
  <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-center space-y-4">
    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center animate-spin">
      <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
    </div>
    <div className="space-y-1">
      <p className="text-sm font-black text-slate-800 tracking-tight">{label}</p>
      <p className="text-xs text-slate-400">Streaming optimized portal module...</p>
    </div>
  </div>
);

const MainLayout = () => {
  // 'hub' | 'customer' | 'superadmin' | 'vendor' | 'courier'
  const [activeTab, setActiveTab] = useState('hub');
  const [deviceMode, setDeviceMode] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'

  // Detect direct /install navigation or URL hash
  useEffect(() => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    if (path.includes('install') || hash.includes('install') || search.includes('tab=install')) {
      setActiveTab('install');
    }
  }, []);
  const [isBarCollapsed, setIsBarCollapsed] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [activePolicySlug, setActivePolicySlug] = useState(null);
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const { switchPersona } = useAuth();
  const { cartCount, setIsCartOpen, clearCart } = useCart();

  const [uiConfig, setUiConfig] = useState({
    storeName: 'AuraMarket',
    tagline: 'The Next-Gen Multi-Vendor Commerce Platform',
    primaryColor: '#F59E0B',
    announcementText: '🔥 Festive Sale Live! Up to 40% OFF with code FESTIVE2026',
    showAnnouncement: true,
    footerText: '© 2026 AuraMarket — Enterprise Multi-Vendor Marketplace Platform. All rights reserved.',
    supportPhone: '+1 (800) 555-0199',
    supportEmail: 'support@auramarket.com',
    showDemoNotice: true,
    demoNoticeContact: '+91 8533955333',
    demoWhatsAppUrl: 'https://wa.me/918533955333?text=Hi%20Ankit,%20I%20want%20to%20purchase%20AuraMarket%20E-Commerce%20Platform',
    heroBanners: [
      {
        title: 'Spatial Audio Reinvented',
        subtitle: 'Immerse yourself in studio-grade acoustics with our flagship ANC wireless series.',
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200',
        badgeText: 'Featured Deal',
        isActive: true,
      },
    ],
    integrations: {
      sms: {
        activeProvider: 'mock',
        fast2sms: { apiKey: '', senderId: 'FSTSMS', route: 'q' },
        msg91: { authKey: '', senderId: 'AURAMK', dltTemplateId: '' },
        twilio: { accountSid: '', authToken: '', fromPhone: '' },
      },
      payments: {
        cod: { enabled: true, label: 'Cash on Delivery (COD)' },
        razorpay: { enabled: true, keyId: 'rzp_test_AuraMarket2026', keySecret: 'rzp_sec_mock_key_secret_2026' },
        stripe: { enabled: true, publishableKey: 'pk_test_51MockStripeAuraMarket2026', secretKey: 'sk_test_51MockStripeSecretKey2026' },
        upi: { enabled: true, upiId: '8533955333@paytm', merchantName: 'AuraMarket Store' },
      },
      email: {
        activeProvider: 'mock',
        smtp: {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          username: 'notifications@auramarket.com',
          password: '',
          fromEmail: 'notifications@auramarket.com',
          fromName: 'AuraMarket Store',
        },
        sendgrid: {
          apiKey: '',
          fromEmail: 'notifications@auramarket.com',
          fromName: 'AuraMarket Store',
        },
      },
      storage: {
        activeProvider: 'local',
        local: { uploadPath: '/uploads' },
        cloudinary: { cloudName: 'auramarket', apiKey: '', apiSecret: '' },
        s3: { bucket: 'auramarket-media', region: 'ap-south-1', accessKey: '', secretKey: '' },
      },
    },
    seo: {
      metaTitle: 'AuraMarket — The Next-Gen Multi-Vendor Commerce Platform',
      metaDescription:
        'Discover top electronics, audio, fashion, and lifestyle brands from verified merchants with express delivery and OTP verification.',
      metaKeywords:
        'ecommerce, multi-vendor marketplace, online shopping, electronics, fashion, split orders',
      ogImage:
        'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80',
      canonicalUrl: 'https://shribalajikripadham.online/ecommerce-demo/',
      googleSiteVerification: '',
      googleAnalyticsId: '',
      facebookPixelId: '',
      enableRichSnippets: true,
    },
  });

  // Synchronize dynamic marketplace theme & branding from backend API
  useEffect(() => {
    api.get('/ui/config')
      .then(res => {
        if (res.data?.success && res.data?.data) {
          setUiConfig(prev => ({ ...prev, ...res.data.data }));
        }
      })
      .catch(() => {
        // Fallback to local default UI config if backend offline
      });
  }, []);

  // Technical SEO Engine: Dynamic Head Meta, Open Graph, Twitter Cards, GA4 & JSON-LD
  useEffect(() => {
    const seo = uiConfig?.seo || {};
    const storeName = uiConfig?.storeName || 'AuraMarket';
    const canonical = seo.canonicalUrl || (window.location.origin + window.location.pathname);
    const title = seo.metaTitle || `${storeName} — The Next-Gen Multi-Vendor Commerce Platform`;
    const description =
      seo.metaDescription ||
      'Discover top electronics, audio, fashion, and lifestyle brands from verified merchants with express delivery and OTP verification.';
    const keywords =
      seo.metaKeywords ||
      'ecommerce, multi-vendor marketplace, online shopping, electronics, fashion, split orders';
    const ogImage =
      seo.ogImage ||
      'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80';

    // 1. Dynamic Page Title
    document.title = title;

    // Helper to insert or update meta tags
    const updateMeta = (selectorKey, selectorVal, content) => {
      if (!content && content !== '') return;
      let el = document.querySelector(`meta[${selectorKey}="${selectorVal}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(selectorKey, selectorVal);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // 2. Core Search Engine Meta Tags
    updateMeta('name', 'description', description);
    updateMeta('name', 'keywords', keywords);

    // 3. Canonical Link Tag
    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement('link');
      canonicalTag.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.setAttribute('href', canonical);

    // 4. Open Graph Social Media Tags (WhatsApp, Facebook, LinkedIn)
    updateMeta('property', 'og:title', title);
    updateMeta('property', 'og:description', description);
    updateMeta('property', 'og:image', ogImage);
    updateMeta('property', 'og:type', 'website');
    updateMeta('property', 'og:url', canonical);
    updateMeta('property', 'og:site_name', storeName);

    // 5. Twitter / X Card Tags
    updateMeta('name', 'twitter:card', 'summary_large_image');
    updateMeta('name', 'twitter:title', title);
    updateMeta('name', 'twitter:description', description);
    updateMeta('name', 'twitter:image', ogImage);

    // 6. Google Search Console Verification
    if (seo.googleSiteVerification && seo.googleSiteVerification.trim() !== '') {
      let code = seo.googleSiteVerification.trim();
      const contentMatch = code.match(/content=["']([^"']+)["']/i);
      if (contentMatch) code = contentMatch[1];
      updateMeta('name', 'google-site-verification', code);
    }

    // 7. Google Analytics 4 (GA4) Script Injection
    if (seo.googleAnalyticsId && seo.googleAnalyticsId.trim() !== '') {
      const gaId = seo.googleAnalyticsId.trim();
      let gaScript = document.getElementById('ga4-script-tag');
      if (!gaScript) {
        gaScript = document.createElement('script');
        gaScript.id = 'ga4-script-tag';
        gaScript.async = true;
        document.head.appendChild(gaScript);
      }
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;

      let initScript = document.getElementById('ga4-init-tag');
      if (!initScript) {
        initScript = document.createElement('script');
        initScript.id = 'ga4-init-tag';
        document.head.appendChild(initScript);
      }
      initScript.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${gaId}');
      `;
    } else {
      const gTag = document.getElementById('ga4-script-tag');
      if (gTag) gTag.remove();
      const gInit = document.getElementById('ga4-init-tag');
      if (gInit) gInit.remove();
    }

    // 8. Facebook / Meta Pixel Script Injection
    if (seo.facebookPixelId && seo.facebookPixelId.trim() !== '') {
      const pixelId = seo.facebookPixelId.trim();
      let fbScript = document.getElementById('fb-pixel-tag');
      if (!fbScript) {
        fbScript = document.createElement('script');
        fbScript.id = 'fb-pixel-tag';
        fbScript.innerHTML = `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
          fbq('track', 'PageView');
        `;
        document.head.appendChild(fbScript);
      }
    } else {
      const fbScript = document.getElementById('fb-pixel-tag');
      if (fbScript) fbScript.remove();
    }

    // 9. JSON-LD Structured Data (WebSite + Organization Schema)
    if (seo.enableRichSnippets !== false) {
      let webSiteSchemaTag = document.getElementById('jsonld-website-schema');
      if (!webSiteSchemaTag) {
        webSiteSchemaTag = document.createElement('script');
        webSiteSchemaTag.id = 'jsonld-website-schema';
        webSiteSchemaTag.type = 'application/ld+json';
        document.head.appendChild(webSiteSchemaTag);
      }
      webSiteSchemaTag.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: storeName,
        url: canonical,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${canonical}?search={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      });

      let orgSchemaTag = document.getElementById('jsonld-organization-schema');
      if (!orgSchemaTag) {
        orgSchemaTag = document.createElement('script');
        orgSchemaTag.id = 'jsonld-organization-schema';
        orgSchemaTag.type = 'application/ld+json';
        document.head.appendChild(orgSchemaTag);
      }
      orgSchemaTag.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: storeName,
        url: canonical,
        logo: ogImage,
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: uiConfig?.supportPhone || '+91 8533955333',
          contactType: 'customer service',
        },
      });
    } else {
      const wEl = document.getElementById('jsonld-website-schema');
      if (wEl) wEl.remove();
      const oEl = document.getElementById('jsonld-organization-schema');
      if (oEl) oEl.remove();
    }
  }, [uiConfig?.seo, uiConfig?.storeName, uiConfig?.supportPhone]);

  // Universal Scroll Progress Tracker & Floating Back to Top Button
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (windowHeight > 0) {
        const progress = (totalScroll / windowHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
      } else {
        setScrollProgress(0);
      }
      setShowBackToTop(totalScroll > 240);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderScrollIndicators = () => (
    <>
      {/* Universal Top Reading Progress Indicator */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-slate-200/50 z-50 pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 transition-all duration-75 shadow-sm"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          title="Scroll to top"
          aria-label="Scroll to top"
          className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center border-2 border-white ring-2 ring-amber-500/30"
        >
          <ChevronUp className="w-5 h-5 text-slate-950 stroke-[2.5]" />
        </button>
      )}
    </>
  );

  const handleResetDemo = () => {
    clearCart();
    setActiveTab('hub');
    switchPersona('customer');
    alert('✨ Demo reset to CodeCanyon Showcase Hub state!');
  };

  const handleSelectPortalFromHub = (portalId, mode = 'desktop') => {
    setActiveTab(portalId);
    setDeviceMode(mode);
    if (portalId !== 'install') {
      switchPersona(portalId === 'courier' ? 'delivery' : portalId);
    }
  };

  // Render Inner Content of the Active Portal
  const renderAppContent = (isMobile = false) => (
    <div className="min-h-full flex flex-col bg-slate-50 text-slate-800 pb-20 md:pb-0">
      {/* Top Navbar with Dynamic Branding & Search */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        uiConfig={uiConfig}
        isMobileMode={isMobile}
      />

      {/* Main Panel Content Area with Dynamic Suspense Code-Splitting */}
      <main className="flex-1">
        <Suspense fallback={<PortalLoadingSkeleton label={`Loading ${activeTab}...`} />}>
          {activeTab === 'customer' && (
            <CustomerStorefront searchQuery={searchQuery} uiConfig={uiConfig} />
          )}
          {activeTab === 'superadmin' && (
            <SuperAdminDashboard uiConfig={uiConfig} setUiConfig={setUiConfig} />
          )}
          {activeTab === 'vendor' && <VendorPortal />}
          {activeTab === 'courier' && <CourierDashboard />}
          {activeTab === 'install' && (
            <InstallWizard
              onGoToStore={() => {
                setActiveTab('customer');
                switchPersona('customer');
              }}
              onGoToAdmin={() => {
                setActiveTab('superadmin');
                switchPersona('superadmin');
              }}
              onOpenDocs={() => setIsDocsOpen(true)}
            />
          )}
        </Suspense>
      </main>

      {/* Real Customer Mobile Bottom Navigation Bar (No role clutter!) */}
      {activeTab === 'customer' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-3 py-2 flex items-center justify-around shadow-lg">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex flex-col items-center gap-1 text-[10px] font-bold text-amber-600 font-black"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>Shop</span>
          </button>

          <button
            onClick={() => window.scrollTo({ top: 400, behavior: 'smooth' })}
            className="flex flex-col items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-700"
          >
            <Layers className="w-5 h-5" />
            <span>Categories</span>
          </button>

          <button
            onClick={() => window.scrollTo({ top: 600, behavior: 'smooth' })}
            className="flex flex-col items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-700"
          >
            <Flame className="w-5 h-5" />
            <span>Deals</span>
          </button>

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative flex flex-col items-center gap-1 text-[10px] font-bold text-slate-600"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>Cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow">
                {cartCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('hub')}
            className="flex flex-col items-center gap-1 text-[10px] font-bold text-slate-700 hover:text-amber-600"
          >
            <LayoutGrid className="w-5 h-5 text-amber-500" />
            <span>Portals</span>
          </button>
        </div>
      )}

      {/* Enterprise Multi-Vendor Footer with Dynamic White-Label & Optional Showroom Demo Box */}
      <footer className="border-t border-slate-200 bg-white pt-10 pb-8 px-4 sm:px-6 lg:px-8 text-slate-600">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Optional Commercial Author & Demo Purchase Callout (Configurable from Super Admin) */}
          {(uiConfig.showDemoNotice ?? true) && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 text-center max-w-2xl mx-auto shadow-sm space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                <span>Official Showroom & Commercial License Notice</span>
              </div>
              <p className="font-black text-slate-950 text-sm">
                Developed by Ankit Chaudhary • Direct Author Support: {uiConfig.demoNoticeContact || '+91 8533955333'}
              </p>
              <p className="text-xs text-slate-700 font-semibold">
                For commercial license, custom deployment, or full source code: <strong className="text-slate-950 font-black">{uiConfig.demoNoticeContact || '+91 8533955333'}</strong>
              </p>
              <p className="text-[11px] text-amber-900 font-bold">
                खरीदने या पूछताछ के लिए संपर्क करें (WhatsApp / Call Available)
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <a
                  href={uiConfig.demoWhatsAppUrl || `https://wa.me/918533955333?text=Hi%20Ankit,%20I%20want%20to%20purchase%20${encodeURIComponent(uiConfig.storeName)}%20Platform`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp: {uiConfig.demoNoticeContact || '8533955333'}</span>
                </a>
                <a
                  href={`tel:${(uiConfig.demoNoticeContact || '8533955333').replace(/[^0-9+]/g, '')}`}
                  className="px-4 py-2 rounded-xl bg-[#0f2444] hover:bg-[#1a3a6b] text-white font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <Phone className="w-4 h-4 text-amber-400" />
                  <span>Call: {uiConfig.demoNoticeContact || '8533955333'}</span>
                </a>
                <button
                  onClick={() => setIsDocsOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>Setup Guide</span>
                </button>
              </div>
            </div>
          )}

          {/* Standard White-Label Multi-Vendor Client Storefront Footer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 pt-4 border-t border-slate-100 text-xs text-left">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center font-black text-slate-950 text-base shadow">
                  {uiConfig.storeName ? uiConfig.storeName.charAt(0) : 'A'}
                </div>
                <span className="text-base font-black text-slate-900 tracking-tight">
                  {uiConfig.storeName}
                </span>
              </div>
              <p className="text-slate-500 leading-relaxed font-medium">
                {uiConfig.tagline}
              </p>
              <div className="text-[11px] text-slate-400 space-y-1">
                <p>🔒 256-bit SSL Secure Checkout</p>
                <p>🛡️ Verified Merchant Guarantee</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px]">
                Marketplace
              </h4>
              <ul className="space-y-1.5 text-slate-600 font-medium">
                <li><button onClick={() => { setActiveTab('customer'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-amber-600">All Products</button></li>
                <li><button onClick={() => { setActiveTab('customer'); window.scrollTo({ top: 400, behavior: 'smooth' }); }} className="hover:text-amber-600">Featured Categories</button></li>
                <li><button onClick={() => { setActiveTab('customer'); window.scrollTo({ top: 700, behavior: 'smooth' }); }} className="hover:text-amber-600">Flash Deals & Discounts</button></li>
                <li><button onClick={() => setIsCartOpen(true)} className="hover:text-amber-600">Shopping Cart</button></li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px]">
                Customer Support
              </h4>
              <ul className="space-y-1.5 text-slate-600 font-medium">
                <li>Helpline: <strong className="text-slate-800">{uiConfig.supportPhone}</strong></li>
                <li>Email: <strong className="text-slate-800">{uiConfig.supportEmail}</strong></li>
                <li><span>24/7 Order Tracking with OTP</span></li>
                <li><button onClick={() => setIsFaqModalOpen(true)} className="hover:text-amber-600 font-bold text-amber-700">❓ Help Center & FAQs</button></li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px]">
                Legal & Policies
              </h4>
              <ul className="space-y-1.5 text-slate-600 font-medium">
                <li><button onClick={() => setActivePolicySlug('privacy-policy')} className="hover:text-amber-600 text-left">🔒 Privacy Policy (DPDP)</button></li>
                <li><button onClick={() => setActivePolicySlug('terms-and-conditions')} className="hover:text-amber-600 text-left">⚖️ Terms & Conditions</button></li>
                <li><button onClick={() => setActivePolicySlug('refund-and-cancellation')} className="hover:text-amber-600 text-left">🔄 1-Click Exchange & Refund</button></li>
                <li><button onClick={() => setActivePolicySlug('shipping-and-delivery')} className="hover:text-amber-600 text-left">🚚 Shipping & Delivery SLAs</button></li>
                <li><button onClick={() => setActivePolicySlug('about-us')} className="hover:text-amber-600 text-left">🏢 About AuraMarket</button></li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px]">
                Business Portals
              </h4>
              <ul className="space-y-1.5 text-slate-600 font-medium">
                <li><button onClick={() => { setActiveTab('vendor'); switchPersona('vendor'); }} className="hover:text-amber-600 font-bold">🏪 Vendor Central Portal</button></li>
                <li><button onClick={() => { setActiveTab('courier'); switchPersona('delivery'); }} className="hover:text-amber-600 font-bold">🚚 Courier & Logistics Hub</button></li>
                <li><button onClick={() => { setActiveTab('superadmin'); switchPersona('superadmin'); }} className="hover:text-amber-600 font-bold">👑 Super Admin Center</button></li>
                <li><button onClick={() => setActiveTab('hub')} className="hover:text-amber-600 text-blue-600 font-bold">← All Portals Overview Hub</button></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <p className="font-medium text-center sm:text-left">
              {uiConfig.footerText || `© 2026 ${uiConfig.storeName}. All rights reserved.`}
            </p>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">Node.js + React 18 + Flutter</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );

  // If in Standalone Web Installer mode (/install)
  if (activeTab === 'install') {
    return (
      <Suspense fallback={<PortalLoadingSkeleton label="Loading AuraMarket Web Installer..." />}>
        {renderScrollIndicators()}
        <InstallWizard
          onGoToStore={() => {
            setActiveTab('customer');
            switchPersona('customer');
          }}
          onGoToAdmin={() => {
            setActiveTab('superadmin');
            switchPersona('superadmin');
          }}
          onOpenDocs={() => setIsDocsOpen(true)}
        />
        <DocumentationModal
          isOpen={isDocsOpen}
          onClose={() => setIsDocsOpen(false)}
        />
      </Suspense>
    );
  }

  // If in Demo Hub mode, show the CodeCanyon Master Showcase Landing Page
  if (activeTab === 'hub') {
    return (
      <Suspense fallback={<PortalLoadingSkeleton label="Loading AuraMarket Showcase Hub..." />}>
        {renderScrollIndicators()}
        <DemoHub
          onSelectPortal={handleSelectPortalFromHub}
          uiConfig={uiConfig}
          onOpenDocs={() => setIsDocsOpen(true)}
        />
        <DocumentationModal
          isOpen={isDocsOpen}
          onClose={() => setIsDocsOpen(false)}
        />
      </Suspense>
    );
  }

  // If viewing a specific portal, render with the CodeCanyon top demo toolbar
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {renderScrollIndicators()}
      {/* CodeCanyon Style Top Demo Control Toolbar */}
      <DemoToolbar
        deviceMode={deviceMode}
        setDeviceMode={setDeviceMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        switchPersona={switchPersona}
        onResetDemo={handleResetDemo}
        isBarCollapsed={isBarCollapsed}
        setIsBarCollapsed={setIsBarCollapsed}
        onOpenDocs={() => setIsDocsOpen(true)}
      />

      {/* Interactive Device Viewport Simulator */}
      {deviceMode === 'desktop' && (
        <div className="flex-1 w-full animate-fade-in">
          {renderAppContent(false)}
        </div>
      )}

      {deviceMode === 'tablet' && (
        <div className="flex-1 py-4 sm:py-6 px-3 flex justify-center items-start bg-slate-200/90">
          <div className="w-full max-w-[768px] h-[calc(100vh-85px)] min-h-[580px] rounded-3xl p-3 bg-slate-900 border-4 border-slate-700 shadow-2xl relative flex flex-col animate-scale-up">
            {/* Tablet Status Header */}
            <div className="flex items-center justify-between px-4 py-1.5 text-[11px] font-bold text-slate-400 bg-slate-950/80 rounded-t-xl mb-1 select-none">
              <span className="text-blue-400 font-extrabold flex items-center gap-1.5">
                💻 iPad View (768px)
              </span>
              <span className="text-amber-400 font-extrabold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                ↕ Scroll to Explore Entire Store
              </span>
              <span>100% 🔋</span>
            </div>

            {/* Inner Tablet Canvas with ALWAYS VISIBLE DRAGGABLE SCROLLBAR */}
            <div className="flex-1 rounded-2xl overflow-y-scroll overflow-x-hidden bg-slate-50 shadow-inner custom-device-scrollbar">
              {renderAppContent(false)}
            </div>

            {/* Bottom Home Indicator Bar */}
            <div className="w-36 h-1.5 bg-slate-600 rounded-full mx-auto mt-2" />
          </div>
        </div>
      )}

      {/* Android Smartphone Simulator (Samsung Galaxy / Google Pixel 412px) */}
      {deviceMode === 'android' && (
        <div className="flex-1 py-4 sm:py-6 px-3 flex justify-center items-start bg-slate-200/90">
          <div className="w-full max-w-[412px] h-[calc(100vh-85px)] min-h-[580px] rounded-[36px] p-3 bg-slate-900 border-4 border-slate-700 shadow-2xl relative flex flex-col animate-scale-up">
            {/* Android Status Bar with Centered Camera Punch-Hole */}
            <div className="flex items-center justify-between px-3.5 py-1.5 text-[11px] font-bold text-slate-300 bg-slate-950/90 rounded-t-2xl mb-1 select-none">
              <span className="text-emerald-400 font-extrabold flex items-center gap-1.5">
                🤖 Android • 12:30
              </span>
              {/* Centered Camera Punch-Hole */}
              <div className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-slate-700 shadow-inner flex-shrink-0" />
              <span className="flex items-center gap-1.5 text-slate-300">
                <span>5G</span>
                <span>•</span>
                <span>100% 🔋</span>
              </span>
            </div>

            {/* Inner Android Canvas with ALWAYS VISIBLE DRAGGABLE SCROLLBAR */}
            <div className="flex-1 rounded-2xl overflow-y-scroll overflow-x-hidden bg-slate-50 shadow-inner custom-device-scrollbar">
              {renderAppContent(true)}
            </div>

            {/* Android Bottom Gesture Navigation Pill */}
            <div className="w-24 h-1 bg-slate-500 rounded-full mx-auto mt-2" />
          </div>
        </div>
      )}

      {/* iPhone Smartphone Simulator (iOS 414px) */}
      {deviceMode === 'mobile' && (
        <div className="flex-1 py-4 sm:py-6 px-3 flex justify-center items-start bg-slate-200/90">
          <div className="w-full max-w-[414px] h-[calc(100vh-85px)] min-h-[580px] rounded-3xl p-3 bg-slate-900 border-4 border-slate-700 shadow-2xl relative flex flex-col animate-scale-up">
            {/* Mobile Status Header (Clean & Unobstructed!) */}
            <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-slate-400 bg-slate-950/80 rounded-t-xl mb-1 select-none">
              <span className="text-emerald-400 font-extrabold flex items-center gap-1.5">
                📱 iPhone View (414px)
              </span>
              <span className="text-amber-400 font-extrabold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                ↕ Scroll to Explore Entire Store
              </span>
              <span>5G • 100% 🔋</span>
            </div>

            {/* Inner Mobile Canvas with ALWAYS VISIBLE DRAGGABLE SCROLLBAR */}
            <div className="flex-1 rounded-2xl overflow-y-scroll overflow-x-hidden bg-slate-50 shadow-inner custom-device-scrollbar">
              {renderAppContent(true)}
            </div>

            {/* Bottom Home Indicator Bar */}
            <div className="w-28 h-1.5 bg-slate-600 rounded-full mx-auto mt-2" />
          </div>
        </div>
      )}

      {/* Documentation Modal */}
      <DocumentationModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />

      {/* Dynamic CMS & Legal Policy Pages Modal */}
      <CmsPolicyViewerModal
        isOpen={!!activePolicySlug}
        initialSlug={activePolicySlug || 'privacy-policy'}
        onClose={() => setActivePolicySlug(null)}
      />

      {/* Categorized Interactive FAQ Hub Modal */}
      {isFaqModalOpen && (
        <FaqSection isModal={true} onClose={() => setIsFaqModalOpen(false)} />
      )}

      {/* Point 13: Customer Abandoned Cart Exit-Intent Recovery Modal */}
      <ExitIntentCartModal />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <LocalizationProvider>
          <MainLayout />
        </LocalizationProvider>
      </CartProvider>
    </AuthProvider>
  );
}
