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
} from 'lucide-react';

export const DocumentationModal = ({ isOpen, onClose }) => {
  const [lang, setLang] = useState('hi'); // 'hi' | 'en'
  const [copiedIndex, setCopiedIndex] = useState(null);

  if (!isOpen) return null;

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
        
        {/* Header */}
        <div className="px-6 py-4.5 bg-[#0f2444] text-white flex items-center justify-between border-b border-blue-900 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center text-slate-950 shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                {lang === 'hi'
                  ? 'AuraMarket कम्प्लीट सेटअप और यूज़ गाइड (A to Z)'
                  : 'AuraMarket Complete Setup & Developer Guide (A to Z)'}
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                  v2.4
                </span>
              </h2>
              <p className="text-[11px] text-blue-200 font-medium">
                {lang === 'hi'
                  ? 'डेवलपर: अंकित चौधरी • कॉल / WhatsApp: 8533955333'
                  : 'Developed by Ankit Chaudhary • Call / WhatsApp: +91 8533955333'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 text-xs sm:text-sm leading-relaxed">
          
          {/* Author & Purchase Callout Box */}
          <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                <Sparkles className="w-3 h-3" />
                <span>Commercial Source Code Available</span>
              </div>
              <h3 className="text-base font-black text-slate-900">
                {lang === 'hi'
                  ? 'यह पूरा मल्टी-वेंडर सिस्टम सोर्स कोड के साथ खरीदें'
                  : 'Purchase Full Multi-Vendor Source Code & License'}
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                {lang === 'hi'
                  ? 'अगर आपको अपनी ई-कॉमर्स कंपनी शुरू करनी है या किसी क्लाइंट के लिए यह वेबसाइट और ऐप चाहिए, तो सीधे डेवलपर अंकित चौधरी से संपर्क करें।'
                  : 'Get the full source code (Web, Android App, iOS App, Node.js Backend) ready to deploy under your brand. Contact author directly.'}
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <a
                href="https://wa.me/918533955333?text=Hi%20Ankit,%20I%20want%20to%20purchase%20AuraMarket%20E-Commerce%20Platform"
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp (8533955333)</span>
              </a>
              <a
                href="tel:8533955333"
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md"
              >
                <Phone className="w-4 h-4 text-amber-400" />
                <span>Call Now</span>
              </a>
            </div>
          </div>

          {/* Module 1: System Overview */}
          <section className="space-y-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
              <Layers className="w-5 h-5 text-amber-500" />
              {lang === 'hi' ? '1. प्रोजेक्ट में क्या-क्या मिलता है? (Overview & Deliverables)' : '1. Deliverables & Ecosystem Architecture'}
            </h3>
            <p className="text-slate-600">
              {lang === 'hi'
                ? 'यह केवल एक वेबसाइट नहीं है, बल्कि पूरा अमेज़न/फ्लिपकार्ट जैसा 4-पोर्टल मल्टी-वेंडर इकोसिस्टम है:'
                : 'AuraMarket is a turnkey 4-role multi-vendor platform with web and native mobile apps:'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">🛒 Customer Storefront (Web + PWA)</span>
                <p className="text-slate-500 text-xs">
                  {lang === 'hi'
                    ? 'कस्टमर के लिए ब्राइट शॉपिंग स्टोर, सर्च बार, कैटेगरी नेवबार, मल्टी-वेंडर स्प्लिट कार्ट, और 4-अंकों का डिलीवरी OTP।'
                    : 'Customer storefront with instant catalog search, multi-vendor split cart, and delivery handover OTP.'}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">👑 Super Admin Master Dashboard</span>
                <p className="text-slate-500 text-xs">
                  {lang === 'hi'
                    ? 'मालिक के लिए कंट्रोल सेंटर — लाइव रेवेन्यू, वेंडर कमीशन %, वेंडर अप्रूवल/ब्लॉक, और 1-क्लिक डेटाबेस सीड/वाइप।'
                    : 'Platform owner master control panel — revenue analytics, vendor KYC, commission %, and 1-click showroom wipe/seed.'}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">🏪 Vendor / Seller Portal</span>
                <p className="text-slate-500 text-xs">
                  {lang === 'hi'
                    ? 'दुकानदारों के लिए डैशबोर्ड — नए प्रोडक्ट जोड़ना, स्टॉक संभालना, पैकिंग स्लिप, और बैंक विथड्रॉल।'
                    : 'Merchant center for sellers to add products, handle store-specific orders, and request wallet payouts.'}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">🚚 Courier Delivery Hub & Rider App</span>
                <p className="text-slate-500 text-xs">
                  {lang === 'hi'
                    ? 'डिलीवरी बॉय के लिए — पिकअप/ड्रॉप मैप रूटिंग, COD कैश कलेक्शन, और कस्टमर का OTP डालकर डिलीवरी कन्फर्म करना।'
                    : 'Delivery partner app for parcel pickups, route navigation, COD collection, and 4-digit OTP handover.'}
                </p>
              </div>
            </div>
          </section>

          {/* Module 2: How to customize Name & Theme */}
          <section className="space-y-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              {lang === 'hi' ? '2. स्टोर का नाम, लोगो और बैनर कैसे बदलें (Customization)' : '2. How to Edit Brand Name, Logo & Theme'}
            </h3>
            <p className="text-slate-600">
              {lang === 'hi'
                ? 'आपको कोड में ज्यादा ढूंढने की ज़रूरत नहीं है! आप 2 आसान तरीकों से सब कुछ बदल सकते हैं:'
                : 'You can update branding either via code or right from the live Super Admin UI:'}
            </p>
            <ul className="space-y-2 text-slate-700 pl-4 list-disc">
              <li>
                <strong>{lang === 'hi' ? 'तरीका 1 (लाइव डैशबोर्ड से):' : 'Method 1 (From Super Admin UI):'}</strong>{' '}
                {lang === 'hi'
                  ? 'डेमो में Super Admin में जाएँ और "Theme & Banner Manager" पर क्लिक करें। वहाँ से नाम, सेल का टेक्स्ट और बैनर बदलकर सेव करें — सब लाइव तुरंत बदल जाएगा!'
                  : 'Launch Super Admin portal and click "Theme & Banner Manager". Edit store name, announcement text, and banners live.'}
              </li>
              <li>
                <strong>{lang === 'hi' ? 'तरीका 2 (सोर्स कोड से):' : 'Method 2 (From Source Code):'}</strong>{' '}
                <code className="bg-slate-100 text-slate-900 px-1.5 py-0.5 rounded font-mono text-xs">
                  frontend/src/App.jsx
                </code>{' '}
                {lang === 'hi'
                  ? 'खोलें और ऊपर uiConfig में storeName, announcementText, और heroBanners को अपने अनुसार एडिट कर दें।'
                  : 'Open App.jsx and modify uiConfig object (storeName, primaryColor, heroBanners).'}
              </li>
            </ul>
          </section>

          {/* Module 3: Backend & Database Setup */}
          <section className="space-y-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
              <Server className="w-5 h-5 text-blue-600" />
              {lang === 'hi' ? '3. बैकएंड और डेटाबेस सेटअप (Backend & Database Setup)' : '3. Backend & MongoDB Configuration'}
            </h3>
            <p className="text-slate-600">
              {lang === 'hi'
                ? 'बैकएंड Node.js और MongoDB पर आधारित है। इसे अपने कंप्यूटर या VPS सर्वर पर ऐसे चलाएँ:'
                : 'The backend is built with Node.js, Express, and MongoDB Mongoose:'}
            </p>
            <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-xs space-y-2 overflow-x-auto">
              <div className="text-slate-400"># 1. backend फोल्डर में जाएँ और पैकेज इंस्टॉल करें:</div>
              <div className="text-amber-400">cd backend</div>
              <div className="text-amber-400">npm install</div>
              <div className="text-slate-400 pt-2"># 2. .env फाइल बनाएँ:</div>
              <div>PORT=5000</div>
              <div>MONGO_URI=mongodb://localhost:27017/auramarket  # या MongoDB Atlas URL</div>
              <div>JWT_SECRET=your_super_secret_jwt_key_2026</div>
              <div className="text-slate-400 pt-2"># 3. बैकएंड सर्वर शुरू करें:</div>
              <div className="text-emerald-400">npm start</div>
            </div>
          </section>

          {/* Module 4: Flutter Mobile App Build */}
          <section className="space-y-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
              <Smartphone className="w-5 h-5 text-purple-600" />
              {lang === 'hi' ? '4. मोबाइल ऐप (Android APK) कैसे बनाएँ (Flutter Build Guide)' : '4. How to Build Native Mobile Apps (Flutter)'}
            </h3>
            <p className="text-slate-600">
              {lang === 'hi'
                ? 'मोबाइल ऐप का पूरा Flutter कोड mobile_app/ फोल्डर में दिया गया है। 1 कमांड में अपनी Android APK फाइल बनाएँ:'
                : 'Complete native Dart Flutter codebase is located inside mobile_app/ folder:'}
            </p>
            <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-xs space-y-2 overflow-x-auto">
              <div className="text-slate-400"># 1. mobile_app फोल्डर में जाएँ:</div>
              <div className="text-amber-400">cd mobile_app</div>
              <div className="text-slate-400"># 2. डिपेंडेंसी लोड करें:</div>
              <div className="text-amber-400">flutter pub get</div>
              <div className="text-slate-400"># 3. Play Store के लिए Release APK तैयार करें:</div>
              <div className="text-emerald-400">flutter build apk --release</div>
              <div className="text-slate-400 pt-1"># तैयार APK फाइल यहाँ मिलेगी: build/app/outputs/flutter-apk/app-release.apk</div>
            </div>
          </section>

          {/* Module 5: Hosting & Deployment */}
          <section className="space-y-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
              <Code2 className="w-5 h-5 text-emerald-600" />
              {lang === 'hi' ? '5. होस्टिंग पर कैसे डिप्लॉय करें (Hosting & Deployment)' : '5. Production Deployment (Hostinger / cPanel)'}
            </h3>
            <p className="text-slate-600">
              {lang === 'hi'
                ? 'यह डेमो 100% सिंगल-फाइल आर्किटेक्चर (standalone index.html) में पैकेज्ड है। इसे किसी भी होस्टिंग (Hostinger, cPanel, GoDaddy) में चलाना बच्चों का खेल है:'
                : 'The showcase demo is 100% self-contained in a standalone index.html (zero path bugs, zero missing assets):'}
            </p>
            <ul className="space-y-1.5 text-slate-700 pl-4 list-disc">
              <li>
                {lang === 'hi'
                  ? 'बस `index.html` को अपने cPanel / Hostinger के `public_html` या किसी भी सब-फोल्डर (जैसे `ecommerce-demo/`) में डाल दें, और साइट तुरंत चालू हो जाएगी!'
                  : 'Simply drop index.html into public_html or any subfolder. Works instantly on Apache/Nginx.'}
              </li>
              <li>
                {lang === 'hi'
                  ? 'GitHub Auto-Deployment: हमने इस प्रोजेक्ट को GitHub से जोड़ रखा है। जब भी कोड पुश होता है, Hostinger 2 सेकंड में खुद अपडेट हो जाता है!'
                  : 'Connected to GitHub webhook auto-deployment. Push to main branch and hosting auto-deploys in 2 seconds.'}
              </li>
            </ul>
          </section>

          {/* Contact Developer Footer */}
          <div className="pt-6 border-t border-slate-200 text-center space-y-2 bg-slate-50 p-6 rounded-2xl">
            <h4 className="text-base font-black text-slate-900">
              {lang === 'hi' ? 'सॉफ्टवेयर खरीद या कस्टमाइजेशन के लिए संपर्क करें' : 'Commercial Inquiries & Customization Support'}
            </h4>
            <p className="text-xs text-slate-600 max-w-lg mx-auto">
              {lang === 'hi'
                ? 'अंकित चौधरी (Lead Developer) • फ़ोन / WhatsApp: 8533955333 • 100% फुल सोर्स कोड और लाइफटाइम लाइसेंस उपलब्ध।'
                : 'Ankit Chaudhary (Lead Developer) • Phone / WhatsApp: +91 8533955333 • Full Source Code & Commercial Support.'}
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <a
                href="https://wa.me/918533955333?text=Hi%20Ankit,%20I%20am%20interested%20in%20AuraMarket%20E-Commerce%20Platform"
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 shadow"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp: 8533955333</span>
              </a>
              <a
                href="tel:8533955333"
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow"
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
