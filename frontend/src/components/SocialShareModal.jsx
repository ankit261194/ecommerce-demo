import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  MessageCircle,
  Twitter,
  Facebook,
  Linkedin,
  Mail,
  Send,
  QrCode,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import api from '../api/client';

export default function SocialShareModal({
  isOpen,
  onClose,
  product,
}) {
  const [activePlatform, setActivePlatform] = useState('whatsapp'); // 'whatsapp' | 'twitter' | 'facebook' | 'linkedin'
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [metaData, setMetaData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && product?._id) {
      fetchMetadata();
    }
  }, [isOpen, product?._id]);

  const fetchMetadata = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/share/product/${product._id}/meta`);
      if (res.data?.success) {
        setMetaData(res.data);
      }
    } catch (err) {
      console.error('Failed to load social metadata:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://auramarket.com';
  const shareUrl = metaData?.canonicalShareUrl || `${origin}/p/${product._id}?ref=share_social`;
  const dynamicCardUrl = metaData?.dynamicCardUrl || `${origin}/api/share/product/${product._id}/card.svg`;
  const price = product.price ?? 0;
  const rating = product.ratingsAverage || 4.8;
  const reviews = product.ratingsQuantity || 24;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: `Check out ${product.title} on AuraMarket for ₹${price}!`,
          url: shareUrl,
        });
      } catch (e) {
        // user canceled
      }
    } else {
      handleCopy();
    }
  };

  // QR Code URL via public Google Chart API / QR generator
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    shareUrl
  )}&color=0f172a&bgcolor=ffffff`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  Share & Recommend Product
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Rich Preview
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Automatic OpenGraph cards with product price, rating, and discount badge
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* PRODUCT QUICK SUMMARY STRIP */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={product.images?.[0] || product.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=120'}
                alt={product.title}
                className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-white flex-shrink-0"
              />
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                  {product.title}
                </h4>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <span className="text-amber-600 font-black">₹{price.toLocaleString('en-IN')}</span>
                  <span>•</span>
                  <span>★ {rating} ({reviews})</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowQr(!showQr)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-xs font-bold text-slate-700 shadow-xs flex-shrink-0"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-600" />
              <span>{showQr ? 'Hide QR' : 'Show QR'}</span>
            </button>
          </div>

          {/* QR CODE DISPLAY (OPTIONAL) */}
          {showQr && (
            <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center text-center space-y-2.5 animate-in fade-in">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                Scan with Phone Camera to View Product
              </span>
              <div className="p-2.5 bg-white rounded-2xl shadow-xl">
                <img src={qrCodeUrl} alt="Product QR Code" className="w-40 h-40" />
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Instant viral shortlink with social referral tracking
              </p>
            </div>
          )}

          {/* SOCIAL CARD SIMULATOR TABS */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-600" />
                <span>Live OpenGraph Social Card Preview</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                1200 × 630 High Resolution
              </span>
            </div>

            {/* Platform Tab Buttons */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setActivePlatform('whatsapp')}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                  activePlatform === 'whatsapp'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePlatform('twitter')}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                  activePlatform === 'twitter'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Twitter className="w-3.5 h-3.5 text-sky-500" />
                <span>Twitter / X</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePlatform('facebook')}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                  activePlatform === 'facebook'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Facebook className="w-3.5 h-3.5 text-blue-600" />
                <span>Facebook</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePlatform('linkedin')}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                  activePlatform === 'linkedin'
                    ? 'bg-white text-blue-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Linkedin className="w-3.5 h-3.5 text-blue-700" />
                <span>LinkedIn</span>
              </button>
            </div>

            {/* LIVE SIMULATED CARD */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-slate-900">
              {/* Dynamic Vector Card Display */}
              <div className="relative aspect-[1200/630] w-full bg-slate-950 overflow-hidden flex items-center justify-center">
                <img
                  src={dynamicCardUrl}
                  alt={product.title}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Card Meta Footer (Changes based on platform simulator) */}
              <div className="p-3 bg-slate-800 border-t border-slate-700 text-slate-300 text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  {activePlatform === 'whatsapp' ? 'WhatsApp Link Card' : activePlatform === 'twitter' ? 'Twitter Summary Large Image Card' : 'OpenGraph Card'}
                </span>
                <h5 className="font-bold text-white line-clamp-1">
                  {product.title} - Only ₹{price.toLocaleString('en-IN')} | AuraMarket
                </h5>
                <p className="text-[11px] text-slate-400 truncate">
                  {shareUrl}
                </p>
              </div>
            </div>
          </div>

          {/* 1-CLICK INSTANT SOCIAL SHARE BUTTONS */}
          <div className="space-y-2.5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 block">
              1-Click Instant Share To:
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {/* WhatsApp Direct */}
              <a
                href={metaData?.sharingChannels?.whatsapp?.shareUrl || `https://api.whatsapp.com/send?text=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-900 font-extrabold text-xs transition-all shadow-xs active:scale-95"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-4 h-4 fill-current" />
                </div>
                <span>WhatsApp</span>
              </a>

              {/* Telegram */}
              <a
                href={metaData?.sharingChannels?.telegram?.shareUrl || `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-sky-50 hover:bg-sky-100/80 border border-sky-200 text-sky-900 font-extrabold text-xs transition-all shadow-xs active:scale-95"
              >
                <div className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center flex-shrink-0">
                  <Send className="w-4 h-4 fill-current" />
                </div>
                <span>Telegram</span>
              </a>

              {/* Twitter / X */}
              <a
                href={metaData?.sharingChannels?.twitter?.shareUrl || `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 font-extrabold text-xs transition-all shadow-xs active:scale-95"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center flex-shrink-0">
                  <Twitter className="w-4 h-4" />
                </div>
                <span>Twitter / X</span>
              </a>

              {/* Facebook */}
              <a
                href={metaData?.sharingChannels?.facebook?.shareUrl || `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-blue-50 hover:bg-blue-100/80 border border-blue-200 text-blue-900 font-extrabold text-xs transition-all shadow-xs active:scale-95"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                  <Facebook className="w-4 h-4 fill-current" />
                </div>
                <span>Facebook</span>
              </a>

              {/* LinkedIn */}
              <a
                href={metaData?.sharingChannels?.linkedin?.shareUrl || `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 text-indigo-900 font-extrabold text-xs transition-all shadow-xs active:scale-95"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-700 text-white flex items-center justify-center flex-shrink-0">
                  <Linkedin className="w-4 h-4 fill-current" />
                </div>
                <span>LinkedIn</span>
              </a>

              {/* Email */}
              <a
                href={metaData?.sharingChannels?.email?.shareUrl || `mailto:?subject=${encodeURIComponent(product.title)}&body=${encodeURIComponent(shareUrl)}`}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 font-extrabold text-xs transition-all shadow-xs active:scale-95"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <span>Email Friend</span>
              </a>
            </div>
          </div>

          {/* COPY LINK INPUT BOX */}
          <div className="space-y-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 block">
              Shareable Referral Link:
            </span>
            <div className="flex items-center gap-2 bg-slate-100 rounded-2xl p-1.5 border border-slate-200">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="bg-transparent text-xs font-mono font-medium text-slate-800 flex-1 px-2 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-sm active:scale-95 transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Includes OpenGraph, Twitter Cards & JSON-LD Microdata</span>
          </div>
          {typeof navigator !== 'undefined' && navigator.share && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>More Options...</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
