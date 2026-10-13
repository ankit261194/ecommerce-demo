import React from 'react';
import {
  ShoppingBag,
  ShieldCheck,
  Store,
  Truck,
  Smartphone,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Lock,
  BadgeCheck,
  BookOpen,
  MessageCircle,
  Phone,
} from 'lucide-react';

export const DemoHub = ({ onSelectPortal, uiConfig, onOpenDocs }) => {
  const portals = [
    {
      id: 'customer',
      title: 'Customer Web Storefront & PWA',
      badge: 'Public Marketplace',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: ShoppingBag,
      iconColor: 'text-amber-500 bg-amber-50 border-amber-200',
      description:
        'High-converting, responsive shopping storefront designed for B2C and B2B buyers with category navigation, lightning search, and multi-vendor checkout.',
      features: [
        'Multi-Vendor Split Shopping Cart',
        'Variant SKU & Size/Color Selection',
        'Secret 4-Digit Handover Delivery OTP',
        'Instant Address Checkout (COD & UPI)',
      ],
      credentials: {
        role: 'Customer / Guest',
        access: '1-Click Direct Access (No Password Required)',
      },
      actionText: 'Launch Storefront Demo',
      deviceTarget: 'desktop',
    },
    {
      id: 'superadmin',
      title: 'Super Admin Control Center',
      badge: 'Platform Owner',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: ShieldCheck,
      iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      description:
        'Master administrative suite to monitor global revenue, adjust merchant percentage commissions, approve partner vendors, and customize live marketplace themes.',
      features: [
        'Real-Time Gross Sales & Commission Cuts',
        'Vendor KYC Verification & Suspension',
        '1-Click Demo Wipe & Seed Showroom',
        'Dynamic Theme & Banner Customizer',
      ],
      credentials: {
        role: 'Super Administrator',
        email: 'admin@auramarket.com',
        password: 'Click Launch to auto-login',
      },
      actionText: 'Launch Super Admin Portal',
      deviceTarget: 'desktop',
    },
    {
      id: 'vendor',
      title: 'Vendor / Seller Management Portal',
      badge: 'Merchant Central',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: Store,
      iconColor: 'text-blue-600 bg-blue-50 border-blue-200',
      description:
        'Dedicated dashboard for verified merchant partners to list products, track split orders assigned to their store, print packing slips, and withdraw bank earnings.',
      features: [
        'Inventory Management & Multi-Variant SKUs',
        'Store-Specific Order Splitting Slips',
        'Order Fulfillment Stepper (Pack → Handover)',
        'Wallet Balance & Instant Bank Payouts',
      ],
      credentials: {
        role: 'Apex Tech Hub (Vendor)',
        email: 'apex@auramarket.com',
        password: 'Click Launch to auto-login',
      },
      actionText: 'Launch Vendor Portal',
      deviceTarget: 'desktop',
    },
    {
      id: 'courier',
      title: 'Courier & Logistics Delivery Hub',
      badge: 'Field Partner',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: Truck,
      iconColor: 'text-purple-600 bg-purple-50 border-purple-200',
      description:
        'Logistics rider application to manage parcel pickups from vendor warehouses, navigate to customer drops, collect Cash on Delivery, and verify 4-digit OTPs.',
      features: [
        'Assigned Route & Pickup/Drop Navigation',
        'Cash on Delivery (COD) Cash Management',
        'Secure 4-Digit Customer OTP Verification',
        'Real-Time Delivery Status Handover',
      ],
      credentials: {
        role: 'Vikram Singh (Rider)',
        email: 'courier@express.com',
        password: 'Click Launch to auto-login',
      },
      actionText: 'Launch Courier Hub',
      deviceTarget: 'desktop',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-16">
      {/* CodeCanyon / Envato Master Showcase Header */}
      <header className="bg-[#0f2444] text-white border-b border-blue-900 shadow-md">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center font-black text-slate-950 text-lg shadow">
              A
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-sm tracking-tight">
                  {uiConfig?.storeName || 'AuraMarket'}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                  Demo Showcase
                </span>
                <span className="text-[11px] text-blue-200 font-bold">
                  • Developed by Ankit Chaudhary (8533955333)
                </span>
              </div>
              <p className="text-[10px] text-blue-200 font-medium">
                Multi-Vendor B2B + B2C Marketplace Script (React + Node.js + Flutter)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenDocs}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>📖 Setup Guide / कैसे यूज़ करें</span>
            </button>

            <a
              href="https://wa.me/918533955333?text=Hi%20Ankit,%20I%20want%20to%20purchase%20AuraMarket%20E-Commerce%20Platform"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs flex items-center gap-1.5 shadow"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Buy: 8533955333</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Showcase Section */}
      <section className="bg-gradient-to-b from-white to-slate-50 border-b border-slate-200 py-10 lg:py-14 px-4 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-black uppercase tracking-wider shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Official Commercial Marketplace Demo</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Select a Portal to Test the Demo
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium">
            Just like official CodeCanyon commercial scripts, every user role runs in its own dedicated,
            fully authentic interface. Choose which portal you would like to test below:
          </p>

          {/* Prominent Developer & Purchase Callout Banner */}
          <div className="max-w-3xl mx-auto p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 text-left">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 text-sm sm:text-base">
                  👨‍💻 Developed by Ankit Chaudhary
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                  Author
                </span>
              </div>
              <p className="text-xs text-slate-700 font-semibold">
                अगर purchase करना है तो इस नंबर पर संपर्क करें: <strong className="text-slate-950 font-black">+91 8533955333</strong>
              </p>
              <p className="text-[11px] text-slate-500">
                To purchase complete source code (Web, Android APK, iOS & Backend), contact the author directly.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
              <a
                href="https://wa.me/918533955333?text=Hi%20Ankit,%20I%20want%20to%20purchase%20AuraMarket%20E-Commerce%20Platform"
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>
              <a
                href="tel:8533955333"
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <Phone className="w-4 h-4 text-amber-400" />
                <span>8533955333</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* The 4 Distinct Portal Cards */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {portals.map(portal => {
            const Icon = portal.icon;
            return (
              <div
                key={portal.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 p-6 sm:p-8 flex flex-col justify-between group"
              >
                <div className="space-y-5">
                  {/* Top Bar with Icon & Badge */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className={`p-3.5 rounded-2xl border ${portal.iconColor} shadow-sm`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${portal.badgeColor}`}>
                          {portal.badge}
                        </span>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1">
                          {portal.title}
                        </h2>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {portal.description}
                  </p>

                  {/* Feature Bullets */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Key Portal Features:
                    </span>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
                      {portal.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Credentials Box */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-500 text-[11px] flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-slate-400" /> Demo Access:
                      </span>
                      <span className="font-bold text-slate-900">{portal.credentials.role}</span>
                    </div>
                    {portal.credentials.email && (
                      <p className="text-[11px] text-slate-600 font-mono">
                        User: <strong className="text-slate-900">{portal.credentials.email}</strong>
                      </p>
                    )}
                    <p className="text-[10px] text-amber-700 font-semibold">
                      {portal.credentials.access || portal.credentials.password}
                    </p>
                  </div>
                </div>

                {/* Launch Buttons */}
                <div className="pt-6 border-t border-slate-100 space-y-2 mt-6">
                  <button
                    onClick={() => onSelectPortal(portal.id, 'desktop')}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#0f2444] hover:bg-[#1a3a6b] text-white font-black text-xs shadow-md flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span>{portal.actionText} (Full Desktop)</span>
                    <ArrowRight className="w-4 h-4 text-amber-400" />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectPortal(portal.id, 'mobile')}
                      className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                      <span>Test in iPhone Frame</span>
                    </button>
                    <button
                      onClick={() => onSelectPortal(portal.id, 'tablet')}
                      className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                      <span>iPad View</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Flutter Mobile App Cross-Platform Callout */}
        <div className="mt-8 bg-gradient-to-r from-slate-900 via-slate-850 to-amber-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
              <Smartphone className="w-3 h-3" />
              <span>Native Flutter 3.x Engine</span>
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight">
              Cross-Platform Flutter Mobile Apps (Android & iOS)
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              Native source code included with real-time REST API synchronization, customer cart state, push notification models, and courier rider OTP handover verification.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => onSelectPortal('customer', 'mobile')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <Smartphone className="w-4 h-4" />
              <span>Launch Customer Mobile App</span>
            </button>
            <button
              onClick={() => onSelectPortal('courier', 'mobile')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 flex items-center justify-center gap-2 transition-colors"
            >
              <Truck className="w-4 h-4 text-amber-400" />
              <span>Launch Courier Rider App</span>
            </button>
          </div>
        </div>

        {/* Enterprise Architecture Verification Matrix */}
        <div className="mt-8 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
          <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BadgeCheck className="w-5 h-5 text-emerald-600" />
            Verified Enterprise Multi-Vendor Architecture
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-extrabold text-slate-900 block">1. Multi-Vendor Order Splitting</span>
              <p className="text-slate-500 text-[11px]">
                Orders containing items from multiple stores automatically split into isolated sub-orders with independent shipping tracking and packing slips.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-extrabold text-slate-900 block">2. 4-Digit Handover OTP</span>
              <p className="text-slate-500 text-[11px]">
                Cryptographic 4-digit code generated at customer checkout; parcel is only marked delivered when rider enters matching code into rider portal.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-extrabold text-slate-900 block">3. Double-Entry Financial Ledger</span>
              <p className="text-slate-500 text-[11px]">
                Automatic percentage deduction of platform commission cuts per vendor with real-time balance tracking and bank withdrawal requests.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-extrabold text-slate-900 block">4. Dynamic Branding Engine</span>
              <p className="text-slate-500 text-[11px]">
                Admin can update store name, announcement tickers, and hero banner creatives with instant real-time synchronization across web and mobile.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Prominent Footer with Developer & Purchase Contact */}
      <footer className="mt-14 border-t border-slate-200 bg-white py-10 px-4 text-center text-xs text-slate-600 space-y-4">
        <div className="max-w-xl mx-auto p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <p className="font-black text-slate-900 text-sm">
            Developed by Ankit Chaudhary • Call / WhatsApp: +91 8533955333
          </p>
          <p className="text-xs text-slate-600 font-medium">
            अगर purchase करना है तो इस नंबर पर संपर्क करें (8533955333) — कंप्लीट सोर्स कोड और लाइफटाइम लाइसेंस उपलब्ध।
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <a
              href="https://wa.me/918533955333?text=Hi%20Ankit,%20I%20want%20to%20purchase%20AuraMarket%20E-Commerce%20Platform"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp: 8533955333</span>
            </a>
            <a
              href="tel:8533955333"
              className="px-4 py-2 rounded-xl bg-[#0f2444] hover:bg-[#1a3a6b] text-white font-bold text-xs flex items-center gap-1.5 shadow"
            >
              <Phone className="w-4 h-4 text-amber-400" />
              <span>Call: 8533955333</span>
            </a>
            <button
              onClick={onOpenDocs}
              className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Setup Guide</span>
            </button>
          </div>
        </div>

        <p className="text-slate-400 font-medium">
          © 2026 {uiConfig?.storeName || 'AuraMarket'} • Commercial Multi-Vendor Marketplace Showcase
        </p>
      </footer>
    </div>
  );
};
