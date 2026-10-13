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
} from 'lucide-react';

export const DocumentationModal = ({ isOpen, onClose }) => {
  const [lang, setLang] = useState('hi'); // 'hi' | 'en'
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'developer' | 'admin' | 'credentials'
  const [copiedIndex, setCopiedIndex] = useState(null);

  if (!isOpen) return null;

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

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
                हिंदी
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  lang === 'en' ? 'bg-amber-400 text-slate-950 font-black' : 'text-blue-200 hover:text-white'
                }`}
              >
                English
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
            <span>{lang === 'hi' ? 'डेवलपर की ज़रूरत (VPS, Play Store, Backups)' : 'Developer Required (VPS, Play Store, Backups)'}</span>
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
            <span>{lang === 'hi' ? 'एडमिन जीरो-कोड (SMS, Payments, SMTP)' : 'Admin Zero-Code (SMS, Payments, SMTP)'}</span>
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
                  <div className="p-3.5 space-y-1.5 overflow-x-auto text-[11px]">
                    <div className="text-slate-400"># 1. Point Domain A-Records to VPS IP (195.35.x.x)</div>
                    <div className="text-amber-400">curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -</div>
                    <div className="text-amber-400">sudo apt install -y nodejs nginx certbot python3-certbot-nginx</div>
                    <div className="text-slate-400 pt-1"># 2. Start PM2 Process Daemon</div>
                    <div className="text-amber-400">pm2 start backend/src/server.js --name auramarket-api</div>
                    <div className="text-emerald-400">✔ [PM2] App auramarket-api launched (PID: 18492, Status: online)</div>
                    <div className="text-slate-400 pt-1"># 3. Issue Free Let\'s Encrypt SSL (HTTPS)</div>
                    <div className="text-amber-400">sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com</div>
                    <div className="text-emerald-400 font-bold">✔ Congratulations! HTTPS is now active on https://yourdomain.com</div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                  <div className="font-bold text-slate-900">
                    {lang === 'hi' ? '📌 स्टेप्स (Steps):' : '📌 Step-by-Step Procedure:'}
                  </div>
                  <div>1. <strong>DNS Pointing:</strong> Hostinger / GoDaddy me <code>@</code> aur <code>www</code> ko VPS IP address par point karein.</div>
                  <div>2. <strong>Dependencies:</strong> Node.js v20 LTS, Nginx aur Certbot install karein.</div>
                  <div>3. <strong>Reverse Proxy:</strong> Nginx me <code>proxy_pass http://127.0.0.1:5000;</code> config karein.</div>
                  <div>4. <strong>SSL (HTTPS):</strong> <code>sudo certbot --nginx</code> chalaayein, automatic auto-renewal enable ho jayega!</div>
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
                        ? '2. Google Play Store व Apple App Store पब्लिशिंग (Flutter App Bundle)'
                        : '2. Google Play Store & Apple App Store Compilation & Publishing'}
                    </h4>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">Target SDK 34 (Android 14)</span>
                </div>

                <p className="text-xs text-slate-600">
                  {lang === 'hi'
                    ? 'Play Store पर ऐप अपलोड करने के लिए Java keytool से डिजिटल की (Keystore) बनानी होती है और Flutter से .aab (App Bundle) फाइल कंपाइल करनी होती है। iOS के लिए Xcode पर Archive बनाकर App Store Connect पर सबमिट किया जाता है।'
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

                <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-xs space-y-1.5">
                  <div className="text-slate-400"># 1. Keystore generate karein:</div>
                  <div className="text-amber-400">keytool -genkey -v -keystore release-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias auramarket</div>
                  <div className="text-slate-400 pt-1"># 2. Production .aab generate karein:</div>
                  <div className="text-amber-400">cd mobile_app && flutter build appbundle --release</div>
                  <div className="text-emerald-400">✔ Output: build/app/outputs/bundle/release/app-release.aab (Play Store ready!)</div>
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

                <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-xs space-y-1.5">
                  <div className="text-slate-400"># Crontab me ye line add karein (sudo crontab -e):</div>
                  <div className="text-amber-400">0 2 * * * mongodump --uri="mongodb://127.0.0.1:27017/auramarket" --archive="/var/backups/mongodb/auramarket_$(date +\\%F).gz" --gzip</div>
                  <div className="text-slate-400 pt-1"># Instant 10-Second Restore Command:</div>
                  <div className="text-emerald-400">mongorestore --uri="mongodb://127.0.0.1:27017/auramarket" --archive="/var/backups/mongodb/auramarket_LATEST.gz" --gzip --drop</div>
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
                      <div className="text-[11px] text-slate-500 font-medium">Provider:</div>
                      <div className="font-bold text-slate-900">Fast2SMS (Quick OTP India)</div>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <div className="text-[11px] text-slate-500 font-medium">API Auth Key:</div>
                      <div className="font-mono text-slate-700">••••••••••••••••3a8f</div>
                    </div>
                  </div>
                  <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 text-[11px] font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Test SMS verified: Delivery OTPs (e.g. 4821) dispatched in &lt; 3 seconds.</span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <div><strong>Fast2SMS:</strong> fast2sms.com par jaakar Dev API se API Key lein aur paste karein.</div>
                  <div><strong>MSG91:</strong> DLT AuthKey aur Sender ID (jaise AURAMK) daalein.</div>
                  <div><strong>Twilio:</strong> Account SID, Auth Token aur phone number daalein.</div>
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
                    <div className="text-[11px] text-slate-500">Store Name: <span className="font-bold text-slate-800">AuraMarket</span></div>
                    <div className="text-[10px] text-emerald-600 font-bold">✔ Instant Bank Credit (0% Deduction)</div>
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
                        ? '3. ईमेल व SMTP इनवॉइस सेटअप (Gmail App Password / Hostinger)'
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

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                  <div><strong>Gmail Host:</strong> <code>smtp.gmail.com</code> | <strong>Port:</strong> <code>587</code></div>
                  <div><strong>Username:</strong> आपका Gmail एड्रेस (जैसे yourstore@gmail.com)</div>
                  <div><strong>Password:</strong> Google Security &gt; App Passwords से बना 16-अक्षरों का कोड</div>
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
                        ? '4. स्टोर का नाम, लोगो, बैनर और फुटर कॉपीराइट बदलना'
                        : '4. White-Label Branding, Logos, Banners & Footer Copyright'}
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
                  <div className="text-xs text-slate-500">Pass: <code className="font-bold text-slate-800">admin123456</code></div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">🏪 Vendor Store #1 (Apex Tech)</span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-black px-2 py-0.5 rounded-full">Seller</span>
                  </div>
                  <div className="text-xs text-slate-600 font-mono">apex@auramarket.com</div>
                  <div className="text-xs text-slate-500">Pass: <code className="font-bold text-slate-800">vendor123456</code></div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">🚚 Courier Partner / Rider</span>
                    <span className="text-[10px] bg-purple-100 text-purple-800 font-black px-2 py-0.5 rounded-full">Delivery</span>
                  </div>
                  <div className="text-xs text-slate-600 font-mono">rider@auramarket.com</div>
                  <div className="text-xs text-slate-500">Pass: <code className="font-bold text-slate-800">rider123456</code></div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">🛒 Shopper / Customer</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full">Buyer</span>
                  </div>
                  <div className="text-xs text-slate-600 font-mono">customer@auramarket.com</div>
                  <div className="text-xs text-slate-500">Pass: <code className="font-bold text-slate-800">customer123456</code></div>
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