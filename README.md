# AuraMarket — Enterprise Multi-Vendor Marketplace Platform (v2.4)

A production-ready, high-performance Multi-Vendor E-Commerce Platform engineered with Node.js, Express, React 18, Tailwind CSS, and Flutter 3.x.

## 🚀 Live Showroom & Interactive Portals
- **Live Demo URL:** [https://shribalajikripadham.online/ecommerce-demo/](https://shribalajikripadham.online/ecommerce-demo/)
- **Repository:** [https://github.com/ankit261194/ecommerce-demo](https://github.com/ankit261194/ecommerce-demo)
- **Documentation:** Open `documentation/index.html` in any browser for the complete A-to-Z setup guide.

## 👑 4 Independent Portals
1. **Customer Web Storefront & PWA:** Multi-vendor cart with isolated sub-order splitting, category filters, instant checkout (COD & UPI), real-time order tracking, and secret 4-digit handover OTP.
2. **Super Admin Control Center:** Lifetime gross revenue metrics, platform commission fee controls, vendor KYC verification, double-entry financial ledger, dynamic theme customizer, and 1-click showroom seed/wipe.
3. **Vendor / Seller Management Portal:** Product catalog with multi-variant SKUs, store-specific order fulfillment slips, status steppers, and bank payout requests.
4. **Courier & Logistics Delivery Hub:** Field task pickup & drop navigation, COD cash collection, and 4-digit OTP customer handover verification.
5. **Flutter Mobile Apps:** Cross-platform native Android & iOS codebases.

## ⚡ Quick Start Guide

### 1. Backend API (Node.js & MongoDB)
```bash
cd backend
npm install
npm start
# Health check: http://localhost:5000/api/health
```

### 2. Frontend Storefront & Portals (React 18 & Vite)
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

### 3. Flutter Mobile Apps (Android & iOS)
```bash
cd mobile_app
flutter pub get
flutter build apk --release
```

## 🔒 Security & Reliability
- **Helmet HTTP Security Headers** enabled for cross-origin APIs.
- **Express Rate Limiting** on general API and authentication routes.
- **Atomic Stock decrements** with rollback protection on cart checkout.
- **Cryptographic 4-digit Delivery OTP** prevents unauthorized delivery completion.
- **Zero-Dependency Fallback:** Auto-launches in-memory database if external MongoDB is offline.

## 👨‍💻 Author & Commercial Support
- **Author:** Ankit Chaudhary
- **Direct Phone / WhatsApp:** +91 8533955333
- **WhatsApp Support:** [https://wa.me/918533955333](https://wa.me/918533955333)
- **License:** Envato CodeCanyon Commercial License
