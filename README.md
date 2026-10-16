# AuraMarket — Enterprise Multi-Vendor Marketplace Platform (v2.4)

A production-ready, high-performance Multi-Vendor E-Commerce Platform engineered with Node.js, Express, React 18, Tailwind CSS, and Flutter 3.x.

## 🚀 Live Showroom & Interactive Portals
- **Live Demo URL:** [https://shribalajikripadham.online/ecommerce-demo/](https://shribalajikripadham.online/ecommerce-demo/)
- **Repository:** [https://github.com/ankit261194/ecommerce-demo](https://github.com/ankit261194/ecommerce-demo)
- **Documentation:** Open `documentation/index.html` in any browser for the complete A-to-Z setup guide.

## 👑 4 Independent Portals + Mobile Apps
1. **Customer Web Storefront & PWA:** Multi-vendor cart with isolated sub-order splitting, category filters, instant checkout (COD & UPI), real-time order tracking, and secret 4-digit handover OTP.
2. **Super Admin Control Center:** Lifetime gross revenue metrics, platform commission fee controls, vendor KYC verification, double-entry financial ledger, dynamic theme customizer, and 1-click showroom seed/wipe.
3. **Vendor / Seller Management Portal:** Product catalog with multi-variant SKUs, store-specific order fulfillment slips, status steppers, and bank payout requests.
4. **Courier & Logistics Delivery Hub:** Field task pickup & drop navigation, COD cash collection, and 4-digit OTP customer handover verification.
5. **Flutter Mobile Apps:** Cross-platform native Android & iOS codebases.

---

## 🌟 28 Master Enterprise & Unique Features (100% Production Ready)

1. **Third-Party Payment Gateway GUI Settings Manager:** 1-Click GUI configuration for Razorpay, Stripe, Cashfree, PayPal, PhonePe, Paytm, and COD with test credentials validation.
2. **Third-Party SMS & WhatsApp Cloud API Settings:** Full provider support for Twilio, MSG91, Gupshup, Fast2SMS, and Meta WhatsApp Cloud API v20.0 with live sandbox test dispatch.
3. **Visual Email SMTP & Drag-and-Drop HTML Template Builder:** SMTP setups (Gmail, Amazon SES, SendGrid, Brevo, Mailgun) with 6 rich transactional responsive HTML email templates.
4. **Dynamic Tax & GST Slab Matrix Engine:** 0%, 5%, 12%, 18%, 28% GST slabs with HSN Code mapping and automatic state-to-state switching between CGST+SGST vs. IGST.
5. **Direct Courier Aggregator API Integration:** Shiprocket / Delhivery API token setup, 1-click AWB generation, automated pickup scheduling, thermal label printing & live courier tracking.
6. **Site Maintenance Mode, Multi-Currency & Global Settings:** Instant maintenance switch with countdown timer, multi-currency engine with live exchange rates, custom branding & favicon uploader.
7. **Admin Activity & Security Audit Trail Logs:** Immutable audit log for product edits, pricing changes, vendor approvals, and security updates with IP and timestamp telemetry.
8. **Bulk CSV / Excel Product Import & Export:** High-speed CSV/Excel import parser with line-by-line validation, error preview, and 1-click catalog export.
9. **Bulk 4x6 Thermal Shipping Label & Barcode Sticker Generator:** High-density batch PDF generator for standard 4x6 e-commerce thermal rolls and A4 24-sticker sheets.
10. **Inventory Low-Stock Threshold & Auto-Restock Alerts:** Custom thresholds per SKU, dashboard alerts, automated WhatsApp Red Alert via Meta Cloud API v20.0, and 1-click quick restock.
11. **Vendor-Funded Custom Promotions & BOGO Engine:** Buy 1 Get 1 Free, buy X get Y% off, store-exclusive coupons, vendor-funded discount attribution preserving platform commission, and visual promo banner studio.
12. **Seller Health & SLA Performance Scorecard:** Late shipment rate, cancellation rate, return rate, Gold/Silver/Platinum badges, and automated penalty rules.
13. **Customer Abandoned Cart Automated Recovery Sequences:** 3-stage sequence, exit-intent popup, dynamic 15% recovery coupon, and multi-channel email/SMS alerts.
14. **Dynamic Multi-Facet Attribute Filtering Grid:** Faceted filters for RAM, Storage, Color, Size, Fabric, Battery, Price range slider, and customer ratings.
15. **True Native Web Push Notifications:** Service Worker web push alerts for deals, flash sales & live order updates, broadcast studio & milestone alerts.
16. **Customer Wallet Top-Up (Add Money) & Instant Scratch Card Rewards:** UPI/Cards prepaid wallet recharge & post-delivery digital scratch cards cashback rewards.
17. **Real-Time EMI & Buy Now Pay Later (BNPL) Breakdown Table:** No-cost EMI calculations for major bank cards and NBFCs with dynamic interest schedule.
18. **Dynamic OpenGraph Social Sharing Preview Cards:** Rich social preview metadata with product image, price, and customer rating.
19. **Gift Wrapping, Gift Card & Personalized Message at Checkout:** Gift wrap toggle, greeting cards & personalized notes, 4x6 packing slips, free thresholds, and audit trail.
20. **Interactive Color & Image Swatches with Dynamic SKU Switch:** Clickable color chips & image thumbnails updating gallery image, stock, pricing, and SKU on the storefront product page and quick view modal.
21. **Digital Proof of Delivery (POD) Customer Signature Pad:** Touchscreen signature pad for riders, saved in order history, GPS coordinate stamping, recipient relationship selector, and printable 4x6/A4 POD slip.
22. **Geofenced Hyperlocal Polygon Radius Mapping & Dark Store Hubs:** Custom map geofence for dark stores and quick commerce, geodesic & ray-casting boundary validation, surge pricing toggle, and SLA promise.
23. **Rider COD Cash Collection Handover & Admin Reconciliation Vault:** Daily cash settlement slip, currency note denomination breakdown, 4-digit OTP verification, mismatch auditor, and company bank deposit tracking.
24. **AI Smart Product Listing & SEO Description Generator with Gemini:** Automated SEO titles, bullet points, meta tags, HSN codes, Google SERP interactive preview, and sales copywriting with Google Gemini 1.5 Flash + deterministic conversion engine.
25. **WhatsApp Conversational Shopping Bot & Automated Order Alerts:** Two-way WhatsApp catalog browsing, keyword conversational bot, cart addition, order status lookups, instant COD booking via WhatsApp webhook + outbound automated WhatsApp order alerts for dispatch, OTP handover, and delivery.
26. **Group Buying / Team Purchase Engine ("Khareedo Saath Me - Save Extra 20%"):** Viral Pinduoduo-style social commerce, multi-buyer pools, 24h countdown clock, automatic group discount unlocking, pool invitation link generator, and admin pool telemetry.
27. **Live Video Shopping & Shoppable Reels Stream ("Shop the Look"):** TikTok/Instagram-style vertical reel player with real-time product overlay cards, 1-click cart addition, interactive like & live comment stream, admin video creator studio, and view telemetry.
28. **Smart RTO Fraud Predictor & Fake COD Blocker:** Machine learning & rule-based risk scoring (0-100) evaluating address integrity, bogus keywords, courier non-delivery history, phone/pincode blocklists, automatic COD blocking for high-risk orders, doorstep OTP verification requirement, and reverse-logistics freight savings calculator.

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
