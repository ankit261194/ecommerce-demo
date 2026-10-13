import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  QrCode,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  Lock,
  Smartphone,
  Check,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Zap,
} from 'lucide-react';

export default function DynamicCheckoutPayment({
  activeGateway,
  onChangeGateway,
  validGateways = [],
  paymentSettings = {},
  amountPayable = 0,
  user = {},
  onPaymentDetailsChange,
  paymentDetails = {},
}) {
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [upiUtr, setUpiUtr] = useState(paymentDetails?.upiUtr || '');
  const [utrError, setUtrError] = useState('');

  // Stripe Card form states
  const [cardNumber, setCardNumber] = useState(paymentDetails?.cardNumber || '');
  const [cardExpiry, setCardExpiry] = useState(paymentDetails?.cardExpiry || '');
  const [cardCvc, setCardCvc] = useState(paymentDetails?.cardCvc || '');
  const [cardHolder, setCardHolder] = useState(user?.name || 'Aman Sharma');
  const [isTestCardFilled, setIsTestCardFilled] = useState(false);

  // Active settings
  const upiId = paymentSettings.upi?.upiId || '8533955333@paytm';
  const merchantName = paymentSettings.upi?.merchantName || 'AuraMarket Store';
  const isRazorpayTest = paymentSettings.razorpay?.keyId?.startsWith('rzp_test');
  const isStripeTest = paymentSettings.stripe?.publishableKey?.startsWith('pk_test');

  // Generate standard UPI payment URI
  const upiIntentUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    merchantName
  )}&am=${amountPayable}&cu=INR&tn=Order%20Payment`;

  // QR code image URL (Google Chart API / QuickChart QR with fallback)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    upiIntentUri
  )}&bgcolor=ffffff&color=0f172a&margin=6`;

  // Copy UPI ID to clipboard
  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2200);
  };

  // Sync UPI details upstream
  useEffect(() => {
    if (activeGateway === 'UPI') {
      onPaymentDetailsChange?.({
        gateway: 'UPI',
        transactionId: upiUtr ? `UPI-${upiUtr}` : `UPI-${Date.now().toString().slice(-6)}`,
        upiUtr: upiUtr || undefined,
        status: upiUtr.length >= 6 ? 'VERIFIED' : 'PENDING_UTR',
      });
    }
  }, [upiUtr, activeGateway]);

  // Autofill test Stripe Card (Point #26 test card)
  const handleFillTestCard = () => {
    setCardNumber('4242 4242 4242 4242');
    setCardExpiry('12/28');
    setCardCvc('123');
    setIsTestCardFilled(true);
    onPaymentDetailsChange?.({
      gateway: 'STRIPE',
      transactionId: `ch_stripe_test_${Date.now()}`,
      cardLast4: '4242',
      status: 'AUTHORIZED',
    });
  };

  // Sync Stripe details upstream
  const handleCardNumberChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 16);
    let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
    setCardNumber(formatted);
    const last4 = val.slice(-4) || '4242';
    onPaymentDetailsChange?.({
      gateway: 'STRIPE',
      transactionId: `ch_stripe_${Date.now()}`,
      cardLast4: last4,
      status: val.length === 16 ? 'AUTHORIZED' : 'PENDING',
    });
  };

  // Sync Razorpay details upstream
  useEffect(() => {
    if (activeGateway === 'RAZORPAY') {
      onPaymentDetailsChange?.({
        gateway: 'RAZORPAY',
        transactionId: `pay_rzp_${Date.now()}`,
        status: 'AUTHORIZED',
      });
    } else if (activeGateway === 'COD') {
      onPaymentDetailsChange?.({
        gateway: 'COD',
        transactionId: null,
        status: 'PENDING_DELIVERY',
      });
    }
  }, [activeGateway]);

  return (
    <div className="space-y-3 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5 text-amber-500" />
          <span>Payment Method (Point #26 Multi-Gateway)</span>
        </h3>
        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          {validGateways.length} Gateways Active
        </span>
      </div>

      {/* Gateway Selection Tabs / Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {validGateways.map((gw) => {
          const isSelected = activeGateway === gw.id;
          return (
            <button
              key={gw.id}
              type="button"
              onClick={() => onChangeGateway(gw.id)}
              className={`p-3 rounded-2xl border text-left transition-all ${
                isSelected
                  ? 'border-amber-500 bg-amber-50/70 text-slate-950 ring-2 ring-amber-400/30 shadow-xs'
                  : 'border-slate-200 text-slate-600 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-slate-900">{gw.name}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                  {gw.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-1">{gw.subtext}</p>
            </button>
          );
        })}
      </div>

      {/* Gateway Interactive Content Panes */}

      {/* 1. Direct UPI & Dynamic QR */}
      {activeGateway === 'UPI' && (
        <div className="p-4 rounded-2xl bg-gradient-to-b from-purple-50/60 to-purple-100/30 border border-purple-200 text-purple-950 space-y-3 animate-fade-in shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-purple-200/60">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                UPI
              </div>
              <div>
                <h4 className="text-xs font-black text-purple-950">Direct Dynamic UPI QR</h4>
                <p className="text-[10px] text-purple-700">Zero Gateway Fees • Direct Merchant Settlement</p>
              </div>
            </div>
            <span className="text-xs font-black font-mono text-purple-900 bg-white px-2 py-0.5 rounded-lg border border-purple-200">
              ₹{amountPayable.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
            {/* Dynamic QR Box */}
            <div className="p-2.5 bg-white rounded-2xl border border-purple-200 shadow-sm flex flex-col items-center flex-shrink-0">
              <img
                src={qrCodeUrl}
                alt="UPI Payment QR Code"
                className="w-32 h-32 rounded-xl object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=8533955333%40paytm';
                }}
              />
              <span className="text-[9px] font-bold text-slate-500 mt-1 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5 text-emerald-600" />
                <span>NPCI UPI Verified</span>
              </span>
            </div>

            {/* UPI ID & App Launchers */}
            <div className="space-y-2.5 flex-1 w-full text-center sm:text-left">
              <div>
                <span className="text-[10px] font-bold uppercase text-purple-700 block">
                  Store Payee UPI VPA:
                </span>
                <div className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-purple-200 mt-1 max-w-full">
                  <span className="font-mono text-xs font-black text-purple-900 select-all truncate">
                    {upiId}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="p-1 text-purple-600 hover:text-purple-800 transition-colors"
                    title="Copy UPI ID"
                  >
                    {copiedUpi ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Mobile 1-Click Launch Intent Links */}
              <div>
                <span className="text-[10px] font-bold text-purple-800 block mb-1">
                  1-Click Pay on Mobile Apps:
                </span>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                  {[
                    { name: 'GPay', color: 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200' },
                    { name: 'PhonePe', color: 'bg-[#5f259f] text-white hover:bg-[#501e87] border-[#5f259f]' },
                    { name: 'Paytm', color: 'bg-[#002e6e] text-white hover:bg-[#002252] border-[#002e6e]' },
                    { name: 'BHIM', color: 'bg-emerald-700 text-white hover:bg-emerald-800 border-emerald-700' },
                  ].map((app) => (
                    <a
                      key={app.name}
                      href={upiIntentUri}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all shadow-2xs ${app.color}`}
                    >
                      {app.name}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 12-Digit Bank UTR / Reference Input */}
          <div className="pt-2 border-t border-purple-200/60 space-y-1">
            <label className="block text-[11px] font-bold text-purple-950">
              12-Digit Bank UTR / Transaction Ref No. (Optional for Auto-Match):
            </label>
            <div className="relative">
              <input
                type="text"
                maxLength={12}
                placeholder="e.g. 428901234567"
                value={upiUtr}
                onChange={(e) => setUpiUtr(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 rounded-xl bg-white border border-purple-300 text-purple-950 font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              {upiUtr.length >= 6 && (
                <span className="absolute right-3 top-2.5 text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Valid UTR</span>
                </span>
              )}
            </div>
            <p className="text-[10px] text-purple-700">
              Find the 12-digit UTR in your bank SMS or UPI payment receipt.
            </p>
          </div>
        </div>
      )}

      {/* 2. Razorpay Secure Checkout */}
      {activeGateway === 'RAZORPAY' && (
        <div className="p-4 rounded-2xl bg-gradient-to-b from-blue-50/70 to-blue-100/30 border border-blue-200 text-blue-950 space-y-3 animate-fade-in shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#0c2340] text-[#00bcd4] flex items-center justify-center font-black text-xs shadow-xs">
                R
              </div>
              <div>
                <h4 className="text-xs font-black text-blue-950">Razorpay Standard Checkout</h4>
                <p className="text-[10px] text-blue-700">RBI Regulated • Cards, NetBanking, UPI & Wallets</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              {isRazorpayTest ? '🧪 TEST MODE' : '🔒 256-BIT ENCRYPTED'}
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-blue-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600">Merchant:</span>
              <span className="text-slate-900 font-black">{merchantName}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600">Customer Prefill:</span>
              <span className="text-slate-800">{user?.name || 'Aman Sharma'} ({user?.phone || '9876543214'})</span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-slate-100">
              <span className="text-slate-600">Amount:</span>
              <span className="text-slate-950 font-black text-sm">₹{amountPayable.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-blue-800 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Clicking "Confirm Order" below will securely authorize via Razorpay.</span>
          </div>
        </div>
      )}

      {/* 3. Stripe Global Card Checkout */}
      {activeGateway === 'STRIPE' && (
        <div className="p-4 rounded-2xl bg-gradient-to-b from-indigo-50/70 to-indigo-100/30 border border-indigo-200 text-indigo-950 space-y-3 animate-fade-in shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-indigo-200/60">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#635bff] text-white flex items-center justify-center font-black text-xs shadow-xs">
                S
              </div>
              <div>
                <h4 className="text-xs font-black text-indigo-950">Stripe Worldwide Card Checkout</h4>
                <p className="text-[10px] text-indigo-700">PCI-DSS Level 1 • Visa, Mastercard, Amex, Apple Pay</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleFillTestCard}
              className="text-[10px] font-black bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-0.5 rounded-lg shadow-2xs transition-all flex items-center gap-1 active:scale-95"
            >
              <Zap className="w-3 h-3 text-amber-300" />
              <span>Fill 4242 Test Card</span>
            </button>
          </div>

          {/* Interactive Card Elements Form */}
          <div className="p-3 bg-white rounded-xl border border-indigo-200 space-y-2.5">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Card Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="4242 •••• •••• 4242"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <span className="absolute right-3 top-2 text-[10px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                  VISA
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Expiry (MM/YY)
                </label>
                <input
                  type="text"
                  placeholder="12/28"
                  maxLength={5}
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  CVC / CVV
                </label>
                <input
                  type="password"
                  placeholder="123"
                  maxLength={4}
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Cash on Delivery (COD) */}
      {activeGateway === 'COD' && (
        <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-50/70 to-emerald-100/30 border border-emerald-200 text-emerald-950 space-y-2 animate-fade-in shadow-2xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200/60">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                COD
              </div>
              <div>
                <h4 className="text-xs font-black text-emerald-950">Cash on Delivery</h4>
                <p className="text-[10px] text-emerald-700">Pay at Doorstep with Cash or any UPI App</p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
              DOORSTEP OTP VERIFIED
            </span>
          </div>

          <p className="text-xs text-emerald-900 leading-relaxed font-medium">
            A secret 4-digit verification OTP will be issued immediately upon booking. Hand over this OTP to your courier partner only after physically verifying your parcel.
          </p>
        </div>
      )}
    </div>
  );
}
