import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Code2,
  Server,
  Smartphone,
  CreditCard,
  Phone,
  MessageCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Layers,
  Sparkles,
  KeyRound,
  ShieldCheck,
  Terminal,
  Cloud,
  Mail,
  HardDrive,
  Database,
  UploadCloud,
  Check,
  Globe,
  Settings,
  Lock,
  ArrowRight,
  Search,
  BarChart3,
} from 'lucide-react';

export const DocumentationModal = ({ isOpen, onClose }) => {
  const [lang, setLang] = useState('hi'); // 'hi' | 'en'
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'developer' | 'admin' | 'credentials'
  const [copiedId, setCopiedId] = useState(null);

  if (!isOpen) return null;

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderCopyBtn = (text, id) => (
    <button
      onClick={() => copyToClipboard(text, id)}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-[11px] font-mono text-slate-200 border border-slate-700 transition-all flex-shrink-0"
      title={lang === 'hi' ? 'क्लिक करके कॉपी करें' : 'Click to copy command'}
    >
      {copiedId === id ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400 font-bold">{lang === 'hi' ? 'कॉपी हो गया!' : 'Copied!'}</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 text-slate-400" />
          <span>{lang === 'hi' ? 'कॉपी' : 'Copy'}</span>
        </>
      )}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
        
        {/* Header */}
        <div className="px-5 py-4 bg-[#0f2444] text-white flex items-center justify-between border-b border-blue-900 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center text-slate-950 shadow-md flex-shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base md:text-lg font-black tracking-tight text-white flex items-center gap-2">
                {lang === 'hi'
                  ? 'AuraMarket कम्प्लीट सेटअप व डेवलपर गाइड'
                  : 'AuraMarket Master Setup & Developer Guide'}
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                  v2.4
                </span>
              </h2>
              <p className="text-[11px] text-blue-200 font-medium">
                {lang === 'hi'
                  ? 'डेवलपर: अंकित चौधरी • कॉल / WhatsApp: +91 8533955333'
                  : 'Lead Author: Ankit Chaudhary • Call / WhatsApp: +91 8533955333'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher */}
            <div className="flex items-center bg-blue-950/80 p-1 rounded-xl border border-blue-800 text-xs font-bold">
              <button
                onClick={() => setLang('hi')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  lang === 'hi' ? 'bg-amber-400 text-slate-950 font-black' : 'text-blue-200 hover:text-white'
                }`}
              >
                🇮🇳 हिंदी
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  lang === 'en' ? 'bg-amber-400 text-slate-950 font-black' : 'text-blue-200 hover:text-white'
                }`}
              >
                🇺🇸 English
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-5 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center gap-2 overflow-x-auto flex-shrink-0 text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'hover:bg-slate-200 text-slate-700'
            }`}
          >
            {lang === 'hi' ? '🌟 सभी गाइड्स (All)' : '🌟 All Modules'}
          </button>
          <button
            onClick={() => setActiveTab('developer')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'developer'
                ? 'bg-rose-600 text-white shadow-sm font-black'
                : 'hover:bg-rose-100 text-rose-700 bg-rose-50 border border-rose-200'
            }`}
          >
            <span>🛠️</span>
            <span>{lang === 'hi' ? 'डेवलपर की ज़रूरत (VPS, Store Apps, Backups)' : 'Developer Required (VPS, Store Apps, Backups)'}</span>
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'admin'
                ? 'bg-emerald-600 text-white shadow-sm font-black'
                : 'hover:bg-emerald-100 text-emerald-700 bg-emerald-50 border border-emerald-200'
            }`}
          >
            <span>⚡</span>
            <span>{lang === 'hi' ? 'एडमिन जीरो-कोड (SMS, Payments, SMTP, Cloud, SEO)' : 'Admin Zero-Code (SMS, Payments, SMTP, Cloud, SEO)'}</span>
          </button>
          <button
            onClick={() => setActiveTab('credentials')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'credentials'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'hover:bg-slate-200 text-slate-700'
            }`}
          >
            {lang === 'hi' ? '🔑 डेमो लॉगिन (Credentials)' : '🔑 Demo Logins'}
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-7 text-xs sm:text-sm leading-relaxed">
          
          {/* Author Callout Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                <Sparkles className="w-3 h-3" />
                <span>Commercial Multi-Vendor Source Code</span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                {lang === 'hi'
                  ? 'यह पूरा मल्टी-वेंडर ई-कॉमर्स सॉफ्टवेयर अपने ब्रांड पर शुरू करें'
                  : 'Launch Your Own Multi-Vendor E-Commerce Platform'}
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                {lang === 'hi'
                  ? 'React 18 + Node.js Express + MongoDB + Flutter Android/iOS ऐप्स। पूरा सोर्स कोड और लाइफटाइम सपोर्ट उपलब्ध।'
                  : 'Complete React 18, Node.js API, MongoDB, and Flutter Mobile Codebase ready for white-label commercial launch.'}
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <a
                href="https://wa.me/918533955333?text=Hi%20Ankit,%20I%20want%20to%20purchase%20AuraMarket%20E-Commerce%20Platform"
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp (8533955333)</span>
              </a>
              <a
                href="tel:8533955333"
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md whitespace-nowrap"
              >
                <Phone className="w-4 h-4 text-amber-400" />
                <span>Call Now</span>
              </a>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* SECTION: DEVELOPER REQUIRED MODULES */}
          {/* ===================================================================== */}
          {(activeTab === 'all' || activeTab === 'developer') && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b-2 border-rose-200 pb-2">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-rose-100 text-rose-700">🛠️</span>
                  <span>
                    {lang === 'hi'
                      ? 'डेवलपर की ज़रूरत कहाँ होगी? (Developer Required Tasks)'
                      : 'Tasks Requiring a Developer (One-Time Setup)'}
                  </span>
                </h3>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                  {lang === 'hi' ? 'केवल 1 बार का काम' : 'One-Time Setup'}
                </span>
              </div>

              {/* MODULE A: VPS & DOMAIN & SSL */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                      Module A • Developer Required
                    </span>
                    <h4 className="text-sm sm:text-base font-black text-slate-900 mt-1 flex items-center gap-2">
                      <Server className="w-4 h-4 text-rose-600" />
                      {lang === 'hi'
                        ? '1. VPS सर्वर, डोमेन व SSL सर्टिफिकेट सेटअप (Hostinger / AWS / Ubuntu)'
                        : '1. One-Time VPS Server & Domain Deployment (Hostinger / AWS / Ubuntu, Nginx, SSL)'}
                    </h4>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">~30 mins setup</span>
                </div>

                <p className="text-xs text-slate-600">
                  {lang === 'hi'
                    ? 'सुपर एडमिन को अपने डोमेन (जैसे yourstore.com) को सर्वर से जोड़ने, Node.js 20 व MongoDB इंस्टॉल करने, PM2 प्रोसेस मैनेजर चालू करने, Nginx रिवर्स प्रॉक्सी सेट करने और फ्री Certbot SSL चालू करने के लिए डेवलपर की जरूरत होती है।'
                    : 'A developer connects your custom domain to an Ubuntu 22.04 LTS VPS instance, installs Node.js 20 & MongoDB, sets up PM2 for permanent process uptime, configures Nginx reverse proxy, and activates Let\'s Encrypt SSL.'}
                </p>

                {/* Styled Terminal Mockup Screenshot */}
                <div className="rounded-xl overflow-hidden border border-slate-800 shadow-lg bg-slate-950 text-slate-200 font-mono text-xs">
                  <div className="px-3.5 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                      <span className="ml-2 font-bold text-slate-300">root@auramarket-vps:~ (Ubuntu 22.04 LTS)</span>
                    </div>
                    <span className="text-emerald-400 font-semibold">SSH Connected</span>
                  </div>
                  <div className="p-3.5 space-y-2.5 text-[11px]">
                    <div>
                      <div className="text-slate-400 mb-1">
                        {lang === 'hi' ? '# 1. Node.js 20, Nginx व Certbot इंस्टॉल करें:' : '# 1. Install Node.js 20, Nginx & Certbot:'}
                      </div>
                      <div className="flex items-center justify-between gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-amber-400 select-all overflow-x-auto">curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs nginx certbot python3-certbot-nginx</span>
                        {renderCopyBtn('curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs nginx certbot python3-certbot-nginx', 'cmd-vps-install')}
                      </div>
                    </div>

                    <div>
                      <div className="text-slate-400 mb-1">
                        {lang === 'hi' ? '# 2. PM2 प्रोसेस मैनेजर से बैकएंड चालू करें (24/7 Uptime):' : '# 2. Launch Backend via PM2 Daemon (24/7 Uptime):'}
                      </div>
                      <div className="flex items-center justify-between gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-amber-400 select-all overflow-x-auto">pm2 start backend/src/server.js --name auramarket-api</span>
                        {renderCopyBtn('pm2 start backend/src/server.js --name auramarket-api', 'cmd-vps-pm2')}
                      </div>
                      <div className="text-emerald-400 text-[10px] mt-1">✔ [PM2] App auramarket-api launched (PID: 18492, Status: online)</div>
                    </div>

                    <div>
                      <div className="text-slate-400 mb-1">
                        {lang === 'hi' ? '# 3. फ्री Let\'s Encrypt SSL (HTTPS) सर्टिफिकेट चालू करें:' : '# 3. Issue Free Let\'s Encrypt SSL (HTTPS):'}
                      </div>
                      <div className="flex items-center justify-between gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-amber-400 select-all overflow-x-auto">sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com</span>
                        {renderCopyBtn('sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com', 'cmd-vps-certbot')}
                      </div>
                      <div className="text-emerald-400 font-bold text-[10px] mt-1">✔ Congratulations! HTTPS is now active on https://yourdomain.com</div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                  <div className="font-bold text-slate-900">
                    {lang === 'hi' ? '📌 स्टेप्स (Steps):' : '📌 Step-by-Step Procedure:'}
                  </div>
                  {lang === 'hi' ? (
                    <>
                      <div>1. <strong>DNS Pointing:</strong> Hostinger / GoDaddy में <code>@</code> और <code>www</code> को VPS IP एड्रेस पर पॉइंट करें।</div>
                      <div>2. <strong>Dependencies:</strong> Node.js v20 LTS, Nginx और Certbot इंस्टॉल करें।</div>
                      <div>3. <strong>Reverse Proxy:</strong> Nginx में <code>proxy_pass http://127.0.0.1:5000;</code> कॉन्फ़िगर करें।</div>
                      <div>4. <strong>SSL (HTTPS):</strong> <code>sudo certbot --nginx</code> चलाएँ, आटोमेटिक रिन्यूअल सक्रिय हो जाएगा!</div>
                    </>
                  ) : (
                    <>
                      <div>1. <strong>DNS Pointing:</strong> Point <code>@</code> and <code>www</code> DNS A-records in GoDaddy/Hostinger to your VPS IP address.</div>
                      <div>2. <strong>Dependencies:</strong> Install Node.js v20 LTS, Nginx, and Certbot utilities on Ubuntu 22.04.</div>
                      <div>3. <strong>Reverse Proxy:</strong> Configure Nginx virtual host with <code>proxy_pass http://127.0.0.1:5000;</code>.</div>
                      <div>4. <strong>SSL (HTTPS):</strong> Run <code>sudo certbot --nginx</code> for automatic free lifetime HTTPS encryption!</div>
                    </>
                  )}
                </div>
              </div>

              {/* MODULE B: GOOGLE PLAY STORE & APPLE APP STORE */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                      Module B • Developer Required
                    </span>
                    <h4 className="text-sm sm:text-base font-black text-slate-900 mt-1 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-purple-600" />
                      {lang === 'hi'
                        ? '2. Google Play Store व Apple App Store पब्लिशिंग (Flutter App Bundle & iOS)'
                        : '2. Google Play Store & Apple App Store Compilation & Publishing'}
                    </h4>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">Target SDK 34 (Android 14) + iOS</span>
                </div>

                <p className="text-xs text-slate-600">
                  {lang === 'hi'
                    ? 'Play Store पर ऐप अपलोड करने के लिए Java keytool से डिजिटल की (Keystore) बनानी होती है और Flutter से .aab (App Bundle) फाइल कंपाइल करनी होती है। iOS के लिए macOS पर Xcode से Archive बनाकर App Store Connect पर सबमिट किया जाता है।'
                    : 'Google Play Console mandates an Android App Bundle (.aab) signed with a cryptographic Keystore (keytool). Apple requires Xcode on macOS, Developer Certificates, and App Store Connect review.'}
                </p>

                {/* Styled Play Console Mockup Screenshot */}
                <div className="rounded-xl overflow-hidden border border-blue-200 shadow-lg bg-white">
                  <div className="px-3.5 py-2 bg-blue-600 text-white flex items-center justify-between text-[11px] font-bold">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded bg-white/20 text-white text-[10px]">Play Console</span>
                      <span>AuraMarket Store &gt; Production Track</span>
                    </div>
                    <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-full text-[10px]">Ready for Review</span>
                  </div>
                  <div className="p-3.5 bg-slate-50 space-y-2 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
                      <span className="text-2xl">📦</span>
                      <div className="flex-1">
                        <div className="font-mono font-bold text-slate-900 text-xs">app-release.aab (v2.4.0, Version Code: 1)</div>
                        <div className="text-[11px] text-slate-500">Size: 32.4 MB • Target SDK: 34 (Android 14+) • 64-bit arm64-v8a verified</div>
                      </div>
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold text-[11px] rounded-lg border border-blue-200">
                        Uploaded ✔
                      </span>
                    </div>
                  </div>
                </div>

                {/* Android & iOS Compilation Commands with Copy buttons */}
                <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-xs space-y-3">
                  <div>
                    <div className="text-slate-400 mb-1">
                      {lang === 'hi' ? '# 1. Android Keystore डिजिटल की बनाएँ:' : '# 1. Generate Android Signing Keystore:'}
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <span className="text-amber-400 select-all overflow-x-auto">keytool -genkey -v -keystore release-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias auramarket</span>
                      {renderCopyBtn('keytool -genkey -v -keystore release-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias auramarket', 'cmd-keystore')}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-400 mb-1">
                      {lang === 'hi' ? '# 2. Google Play Production .aab बंडल कंपाइल करें:' : '# 2. Compile Google Play Production .aab Bundle:'}
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <span className="text-amber-400 select-all overflow-x-auto">cd mobile_app && flutter build appbundle --release</span>
                      {renderCopyBtn('cd mobile_app && flutter build appbundle --release', 'cmd-aab')}
                    </div>
                    <div className="text-emerald-400 text-[10px] mt-1">✔ Output: build/app/outputs/bundle/release/app-release.aab (Play Store ready!)</div>
                  </div>

                  <div>
                    <div className="text-slate-400 mb-1">
                      {lang === 'hi' ? '# 3. Apple App Store (iOS) .ipa कंपाइल करें:' : '# 3. Compile Apple App Store (iOS) .ipa Archive:'}
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <span className="text-amber-400 select-all overflow-x-auto">cd mobile_app && flutter build ipa --release</span>
                      {renderCopyBtn('cd mobile_app && flutter build ipa --release', 'cmd-ipa')}
                    </div>
                    <div className="text-slate-400 text-[10px] mt-1">
                      {lang === 'hi' ? 'Xcode में खोलें: open ios/Runner.xcworkspace &gt; Product &gt; Archive' : 'Open in Xcode: open ios/Runner.xcworkspace &gt; Product &gt; Archive'}
                    </div>
                  </div>
                </div>
              </div>

              {/* MODULE F: DATABASE AUTO-BACKUPS */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                      Module F • Developer Required
                    </span>
                    <h4 className="text-sm sm:text-base font-black text-slate-900 mt-1 flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-600" />
                      {lang === 'hi'
                        ? '3. डेटाबेस ऑटो-बैकअप व मेंटेनेंस (Nightly mongodump Crontab)'
                        : '3. Automated Database Backups & Maintenance (mongodump Cron)'}
                    </h4>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">Nightly 02:00 AM</span>
                </div>

                <p className="text-xs text-slate-600">
                  {lang === 'hi'
                    ? 'हर रात 2:00 बजे डेटाबेस का कम्प्रेस्ड बैकअप अपने आप बनना चाहिए ताकि कभी सर्वर क्रैश होने पर 1 सेकंड का भी डेटा न खोए। इसके लिए Linux Crontab में mongodump स्क्रिप्ट लगाई जाती है।'
                    : 'A developer schedules a nightly Linux cron job that runs mongodump at 2:00 AM, compresses the database archive, automatically deletes snapshots older than 30 days, and logs status.'}
                </p>

                <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-xs space-y-2.5">
                  <div>
                    <div className="text-slate-400 mb-1">
                      {lang === 'hi' ? '# Crontab में यह लाइन जोड़ें (sudo crontab -e):' : '# Add this scheduled job to crontab (sudo crontab -e):'}
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <span className="text-amber-400 select-all overflow-x-auto">0 2 * * * mongodump --uri="mongodb://127.0.0.1:27017/auramarket" --archive="/var/backups/mongodb/auramarket_$(date +\%F).gz" --gzip</span>
                      {renderCopyBtn('0 2 * * * mongodump --uri="mongodb://127.0.0.1:27017/auramarket" --archive="/var/backups/mongodb/auramarket_$(date +\\%F).gz" --gzip', 'cmd-crontab')}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-400 mb-1">
                      {lang === 'hi' ? '# तुरंत 10-सेकंड में डेटाबेस रीस्टोर करने का कमांड:' : '# Instant 10-Second Database Disaster Recovery Restore:'}
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <span className="text-emerald-400 select-all overflow-x-auto">mongorestore --uri="mongodb://127.0.0.1:27017/auramarket" --archive="/var/backups/mongodb/auramarket_LATEST.gz" --gzip --drop</span>
                      {renderCopyBtn('mongorestore --uri="mongodb://127.0.0.1:27017/auramarket" --archive="/var/backups/mongodb/auramarket_LATEST.gz" --gzip --drop', 'cmd-restore')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* SECTION: ADMIN ZERO-CODE MODULES */}
          {/* ===================================================================== */}
          {(activeTab === 'all' || activeTab === 'admin') && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b-2 border-emerald-200 pb-2">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-emerald-100 text-emerald-700">⚡</span>
                  <span>
                    {lang === 'hi'
                      ? 'बिना डेवलपर के आप खुद क्या कर सकते हैं? (Admin Zero-Code Tasks)'
                      : 'Tasks Super Admin Can Do Without Any Developer (Plug & Play)'}
                  </span>
                </h3>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {lang === 'hi' ? '100% जीरो-कोड' : '100% Zero-Code'}
                </span>
              </div>

              {/* MODULE C: SMS GATEWAYS & OTP */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Module C • Admin Zero-Code
                    </span>
                    <h4 className="text-sm sm:text-base font-black text-slate-900 mt-1 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-blue-600" />
                      {lang === 'hi'
                        ? '1. SMS व डिलीवरी OTP गेटवे सेटअप (Fast2SMS, MSG91, Twilio)'
                        : '1. SMS Gateway & 4-Digit Delivery OTP Setup (Fast2SMS, MSG91, Twilio)'}
                    </h4>
                  </div>
                  <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Live from UI
                  </span>
                </div>

                <p className="text-xs text-slate-600">
                  {lang === 'hi'
                    ? 'Super Admin Dashboard में "🔌 Integrations & API Hub" टैब में जाएँ और "SMS Gateways" चुनें। अपनी Fast2SMS API Key पेस्ट करें और Save कर दें। टेस्ट करने के लिए अपना मोबाइल नंबर डालकर "Send Test SMS" पर क्लिक करें!'
                    : 'Navigate to Super Admin > Integrations & API Hub > SMS Gateways. Choose your provider (Fast2SMS / MSG91 / Twilio), paste your API Key, and click "Send Test SMS" to verify instantly!'}
                </p>

                {/* UI Mockup Card for SMS */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">📱 Super Admin SMS Gateway Card</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">ACTIVE [ON]</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <div className="text-[11px] text-slate-500 font-medium">{lang === 'hi' ? 'प्रोवाइडर:' : 'Provider:'}</div>
                      <div className="font-bold text-slate-900">Fast2SMS (Quick OTP India)</div>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <div className="text-[11px] text-slate-500 font-medium">{lang === 'hi' ? 'API Auth Key:' : 'API Auth Key:'}</div>
                      <div className="font-mono text-slate-700">••••••••••••••••3a8f</div>
                    </div>
                  </div>
                  <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 text-[11px] font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>{lang === 'hi' ? 'टेस्ट SMS सत्यापित: 4-अंकों का गुप्त डिलीवरी OTP (उदा. 4821) 3 सेकंड में प्राप्त होता है।' : 'Test SMS verified: Secret 4-digit handover OTP (e.g. 4821) dispatched in < 3 seconds.'}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  {lang === 'hi' ? (
                    <>
                      <div><strong>Fast2SMS:</strong> fast2sms.com पर जाकर Dev API से API Key लें और पेस्ट करें।</div>
                      <div><strong>MSG91:</strong> DLT AuthKey और Sender ID (जैसे AURAMK) दर्ज करें।</div>
                      <div><strong>Twilio:</strong> Account SID, Auth Token और फ़ोन नंबर डालें।</div>
                    </>
                  ) : (
                    <>
                      <div><strong>Fast2SMS:</strong> Sign up at fast2sms.com, navigate to Dev API, copy Authorization Key, and paste into panel.</div>
                      <div><strong>MSG91:</strong> Enter your MSG91 AuthKey and registered 6-character DLT Header (e.g., AURAMK).</div>
                      <div><strong>Twilio:</strong> Paste Twilio Account SID, Auth Token, and Twilio phone number for global delivery.</div>
                    </>
                  )}
                </div>
              </div>

              {/* MODULE D: PAYMENT GATEWAYS */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Module D • Admin Zero-Code
                    </span>
                    <h4 className="text-sm sm:text-base font-black text-slate-900 mt-1 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      {lang === 'hi'
                        ? '2. पेमेंट गेटवे सेटअप (Razorpay, Stripe, Direct UPI QR, COD)'
                        : '2. Payment Gateways Setup (Razorpay, Stripe, Direct UPI QR, COD)'}
                    </h4>
                  </div>
                  <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Dynamic Checkout
                  </span>
                </div>

                <p className="text-xs text-slate-600">
                  {lang === 'hi'
                    ? 'सुपर एडमिन जिस भी पेमेंट गेटवे का स्विच ON करेगा, चेकआउट पर कस्टमर को वही ऑप्शन दिखेगा। Direct UPI QR चालू करने पर 0% कमीशन पर सीधे आपके बैंक में पैसे ट्रांसफर होंगे!'
                    : 'The shopping cart checkout adapts dynamically to toggled payment gateways in Super Admin. Direct UPI QR offers 0% gateway commission directly to your bank account.'}
                </p>

                {/* UI Mockup for Payment Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">💳 Razorpay (India #1)</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">ON</span>
                    </div>
                    <div className="text-[11px] text-slate-500">Key ID: <code className="font-mono text-slate-800">rzp_live_...</code></div>
                    <div className="text-[11px] text-slate-500">Key Secret: <code className="font-mono text-slate-800">••••••••</code></div>
                    <div className="text-[10px] text-slate-400">dashboard.razorpay.com &gt; Settings &gt; API Keys</div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">📱 Direct UPI QR (0% Fee)</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">ON</span>
                    </div>
                    <div className="text-[11px] text-slate-500">UPI ID: <code className="font-mono text-slate-800">8533955333@paytm</code></div>
                    <div className="text-[11px] text-slate-500">{lang === 'hi' ? 'स्टोर का नाम:' : 'Store Name:'} <span className="font-bold text-slate-800">AuraMarket</span></div>
                    <div className="text-[10px] text-emerald-600 font-bold">✔ {lang === 'hi' ? 'सीधे बैंक खाते में पैसा (0% कटौती)' : 'Instant Bank Credit (0% Deduction)'}</div>
                  </div>
                </div>
              </div>

              {/* MODULE E: EMAIL & SMTP */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Module E • Admin Zero-Code
                    </span>
                    <h4 className="text-sm sm:text-base font-black text-slate-900 mt-1 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-purple-600" />
                      {lang === 'hi'
                        ? '3. ईमेल व SMTP इनवॉइस सेटअप (Gmail App Password / Hostinger Webmail)'
                        : '3. Email & SMTP Invoices Setup (Gmail App Password / Hostinger Webmail)'}
                    </h4>
                  </div>
                  <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Branded HTML Bills
                  </span>
                </div>

                <p className="text-xs text-slate-600">
                  {lang === 'hi'
                    ? 'कस्टमर को ऑर्डर होते ही ब्रांडेड रसीद और इनवॉइस ईमेल करने के लिए आप अपने Gmail में 2-स्टेप वेरिफिकेशन ऑन करके 16-अक्षरों का "App Password" बना लें, और उसे Super Admin के SMTP टैब में पेस्ट कर दें!'
                    : 'Dispatch branded HTML invoices and receipts using Gmail with a 16-character Google App Password or Hostinger Webmail (smtp.hostinger.com, port 587).'}
                </p>

                {/* SMTP Mockup Card */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">✉️ SMTP Server Configuration Card</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">CONNECTED</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <div className="text-[11px] text-slate-500 font-medium">SMTP Host:</div>
                      <div className="font-mono font-bold text-slate-900">smtp.gmail.com (Port: 587)</div>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <div className="text-[11px] text-slate-500 font-medium">{lang === 'hi' ? 'ईमेल एड्रेस:' : 'Email Address:'}</div>
                      <div className="font-mono text-slate-900">orders@yourdomain.com</div>
                    </div>
                  </div>
                  <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 text-[11px] font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>{lang === 'hi' ? 'टेस्ट ईमेल सत्यापित: इनवॉइस रसीद सफलता से भेजी गई।' : 'Test Email verified: Order HTML invoice dispatched successfully.'}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                  {lang === 'hi' ? (
                    <>
                      <div><strong>Gmail Host:</strong> <code>smtp.gmail.com</code> | <strong>Port:</strong> <code>587</code></div>
                      <div><strong>Username:</strong> आपका Gmail एड्रेस (जैसे yourstore@gmail.com)</div>
                      <div><strong>Password:</strong> Google Security &gt; App Passwords से बना 16-अक्षरों का कोड</div>
                    </>
                  ) : (
                    <>
                      <div><strong>Gmail Host:</strong> <code>smtp.gmail.com</code> | <strong>Port:</strong> <code>587</code></div>
                      <div><strong>Username:</strong> Your business Gmail address (e.g. yourstore@gmail.com)</div>
                      <div><strong>Password:</strong> 16-character code from myaccount.google.com/security &gt; App Passwords</div>
                    </>
                  )}
                </div>
              </div>

              {/* MODULE G: CLOUD STORAGE */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Module G • Admin Zero-Code
                    </span>
                    <h4 className="text-sm sm:text-base font-black text-slate-900 mt-1 flex items-center gap-2">
                      <Cloud className="w-4 h-4 text-cyan-600" />
                      {lang === 'hi'
                        ? '4. क्लाउड मीडिया व प्रोडक्ट इमेज स्टोरेज (Local / Cloudinary / AWS S3)'
                        : '4. Cloud Media & Product Image Storage (Local Disk / Cloudinary / AWS S3)'}
                    </h4>
                  </div>
                  <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Unlimited Scale
                  </span>
                </div>

                <p className="text-xs text-slate-600">
                  {lang === 'hi'
                    ? 'प्रोडक्ट इमेज और वेंडर बैनर स्टोर करने के लिए डिफ़ॉल्ट रूप से सर्वर डिस्क (/uploads) चालू रहती है जिसमें कोई अतिरिक्त खर्च नहीं है। अगर लाखों प्रोडक्ट्स हों तो Super Admin में Cloudinary या AWS S3 की कीज डाल दें।'
                    : 'Product pictures and seller banners store directly in server disk (/uploads) by default with zero monthly expense. For high enterprise scale, seamlessly toggle Cloudinary CDN or AWS S3 from Super Admin.'}
                </p>

                {/* Storage UI Mockup */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">☁️ Active Media Storage Provider</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">ACTIVE</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <div className="text-[11px] text-slate-500 font-medium">{lang === 'hi' ? 'लोकल डिस्क (फ़्री):' : 'Local Disk (Free):'}</div>
                      <div className="font-bold text-slate-900">/uploads folder</div>
                      <div className="text-[10px] text-emerald-600 font-semibold">{lang === 'hi' ? '0 अतिरिक्त खर्च' : 'Zero extra cost'}</div>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <div className="text-[11px] text-slate-500 font-medium">Cloudinary CDN:</div>
                      <div className="font-bold text-slate-900">Auto WebP Resize</div>
                      <div className="text-[10px] text-blue-600 font-semibold">Global CDN</div>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <div className="text-[11px] text-slate-500 font-medium">Amazon AWS S3:</div>
                      <div className="font-bold text-slate-900">S3 Bucket Storage</div>
                      <div className="text-[10px] text-purple-600 font-semibold">Enterprise Scale</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* THEME & WHITE-LABEL */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Branding Engine • Zero-Code
                    </span>
                    <h4 className="text-sm sm:text-base font-black text-slate-900 mt-1 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      {lang === 'hi'
                        ? '5. स्टोर का नाम, लोगो, बैनर और फुटर कॉपीराइट बदलना'
                        : '5. White-Label Branding, Logos, Banners & Footer Copyright'}
                    </h4>
                  </div>
                  <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Live Sync
                  </span>
                </div>

                <p className="text-xs text-slate-600">
                  {lang === 'hi'
                    ? 'सुपर एडमिन में ऊपर "Theme & Banner Manager" पर क्लिक करें। स्टोर का नाम, सेल का डिस्काउंट टेक्स्ट और कस्टमर केयर फ़ोन नंबर बदलकर सेव करें — सब कुछ तुरंत लाइव बदल जाता है!'
                    : 'Click "Theme & Banner Manager" inside Super Admin. Change store title, promotional sales banners, and support phone numbers live.'}
                </p>
              </div>

              {/* MODULE H: MASTER E-COMMERCE SEO & WEBMASTER SUITE */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      Module H • Admin Zero-Code SEO
                    </span>
                    <h4 className="text-sm sm:text-base font-black text-slate-900 mt-1 flex items-center gap-2">
                      <Search className="w-4 h-4 text-amber-500" />
                      {lang === 'hi'
                        ? '6. एसईओ (SEO), गूगल सर्च कंसोल, GA4 व साइटमैप सबमिशन'
                        : '6. Master SEO, Google Search Console, GA4 & Sitemap Engine'}
                    </h4>
                  </div>
                  <span className="text-xs text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    Google Page 1
                  </span>
                </div>

                <p className="text-xs text-slate-600">
                  {lang === 'hi'
                    ? 'सुपर एडमिन में "🔍 SEO & Webmaster Hub" टैब से अपने स्टोर का Google Search Console कोड, GA4 ट्रैकिंग आईडी, सोशल शेयरिंग इमेज और स्कीमा मार्कअप बिना कोड छुए सेट करें। सभी प्रोडक्ट्स 24-48 घंटे में गूगल पर सर्च होने लगते हैं।'
                    : 'Manage search engine meta tags, Google Search Console HTML tag verification, Google Analytics 4 (GA4), Open Graph social previews, and Schema.org rich snippets with zero code from Super Admin.'}
                </p>

                {/* Interactive Endpoints & Code Snippets */}
                <div className="space-y-2.5">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="text-[11px] font-bold text-slate-700">
                        {lang === 'hi' ? '1. गूगल सर्च कंसोल में साइटमैप URL:' : '1. Google Search Console Sitemap URL:'}
                      </div>
                      <div className="font-mono text-xs text-blue-700 font-semibold break-all">
                        https://shribalajikripadham.online/ecommerce-demo/sitemap.xml
                      </div>
                    </div>
                    {renderCopyBtn('https://shribalajikripadham.online/ecommerce-demo/sitemap.xml', 'sitemap-url')}
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="text-[11px] font-bold text-slate-700">
                        {lang === 'hi' ? '2. सर्च इंजन Robots.txt लिंक:' : '2. Live Robots.txt URL:'}
                      </div>
                      <div className="font-mono text-xs text-slate-700 font-semibold break-all">
                        https://shribalajikripadham.online/ecommerce-demo/robots.txt
                      </div>
                    </div>
                    {renderCopyBtn('https://shribalajikripadham.online/ecommerce-demo/robots.txt', 'robots-url')}
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="text-[11px] font-bold text-slate-700">
                        {lang === 'hi' ? '3. टर्मिनल से साइटमैप टेस्ट करने की कमांड:' : '3. Test Sitemap Header Command:'}
                      </div>
                      <div className="font-mono text-xs text-emerald-800 font-semibold break-all">
                        curl -I https://shribalajikripadham.online/ecommerce-demo/sitemap.xml
                      </div>
                    </div>
                    {renderCopyBtn('curl -I https://shribalajikripadham.online/ecommerce-demo/sitemap.xml', 'curl-sitemap')}
                  </div>
                </div>

                {/* Steps Mini Card */}
                <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-slate-700 space-y-1.5">
                  <div className="font-bold text-blue-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <span>{lang === 'hi' ? '3-स्टेप्स में 100% गूगल इंडेक्सिंग:' : '3-Step Google Setup Checklist:'}</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1 text-[11px]">
                    <li>{lang === 'hi' ? 'search.google.com/search-console पर HTML tag चुनकर कोड कॉपी करें।' : 'Select HTML Tag method on search.google.com/search-console and copy code.'}</li>
                    <li>{lang === 'hi' ? 'Super Admin के SEO Hub में कोड पेस्ट करके "Save SEO Configuration" दबाएं।' : 'Paste code in Super Admin SEO Hub and click "Save SEO Configuration".'}</li>
                    <li>{lang === 'hi' ? 'Google Search Console में sitemap.xml सबमिट करें — 24 से 48 घंटे में कैटलॉग लाइव!' : 'Submit sitemap.xml in Google Search Console — catalog indexed in 24-48 hours!'}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* SECTION: DEMO CREDENTIALS */}
          {/* ===================================================================== */}
          {(activeTab === 'all' || activeTab === 'credentials') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-amber-500" />
                  <span>
                    {lang === 'hi'
                      ? 'डेमो लॉगिन क्रेडेंशियल्स (Pre-Seeded Logins)'
                      : 'Showroom Demo Login Credentials'}
                  </span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">👑 Super Administrator</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-black px-2 py-0.5 rounded-full">Owner</span>
                  </div>
                  <div className="text-xs text-slate-600 font-mono">admin@auramarket.com</div>
                  <div className="text-xs text-slate-500">{lang === 'hi' ? 'पासवर्ड:' : 'Pass:'} <code className="font-bold text-slate-800">admin123456</code></div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">🏪 Vendor Store #1 (Apex Tech)</span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-black px-2 py-0.5 rounded-full">Seller</span>
                  </div>
                  <div className="text-xs text-slate-600 font-mono">apex@auramarket.com</div>
                  <div className="text-xs text-slate-500">{lang === 'hi' ? 'पासवर्ड:' : 'Pass:'} <code className="font-bold text-slate-800">vendor123456</code></div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">🚚 Courier Partner / Rider</span>
                    <span className="text-[10px] bg-purple-100 text-purple-800 font-black px-2 py-0.5 rounded-full">Delivery</span>
                  </div>
                  <div className="text-xs text-slate-600 font-mono">rider@auramarket.com</div>
                  <div className="text-xs text-slate-500">{lang === 'hi' ? 'पासवर्ड:' : 'Pass:'} <code className="font-bold text-slate-800">rider123456</code></div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">🛒 Shopper / Customer</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full">Buyer</span>
                  </div>
                  <div className="text-xs text-slate-600 font-mono">customer@auramarket.com</div>
                  <div className="text-xs text-slate-500">{lang === 'hi' ? 'पासवर्ड:' : 'Pass:'} <code className="font-bold text-slate-800">customer123456</code></div>
                </div>
              </div>
            </div>
          )}

          {/* Contact Developer Footer */}
          <div className="pt-6 border-t border-slate-200 text-center space-y-2 bg-slate-50 p-6 rounded-2xl">
            <h4 className="text-sm sm:text-base font-black text-slate-900">
              {lang === 'hi' ? 'सॉफ्टवेयर खरीद या सेटअप सहायता के लिए सीधे संपर्क करें' : 'Commercial Purchase & Author Support'}
            </h4>
            <p className="text-xs text-slate-600 max-w-lg mx-auto">
              {lang === 'hi'
                ? 'अंकित चौधरी (Lead Developer) • फ़ोन / WhatsApp: +91 8533955333 • पूरा सोर्स कोड, कस्टमाइजेशन और फ्री 6 महीने टेक्निकल सपोर्ट।'
                : 'Ankit Chaudhary (Lead Developer) • Phone / WhatsApp: +91 8533955333 • Complete Source Code, Commercial License & 6 Months Author Support.'}
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <a
                href="https://wa.me/918533955333?text=Hi%20Ankit,%20I%20need%20support%20with%20AuraMarket"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 shadow"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp: 8533955333</span>
              </a>
              <a
                href="tel:8533955333"
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow"
              >
                <Phone className="w-4 h-4 text-amber-400" />
                <span>Call: 8533955333</span>
              </a>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
