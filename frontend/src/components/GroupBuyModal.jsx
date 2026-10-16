import React, { useState, useEffect } from 'react';
import {
  Users,
  ShoppingBag,
  Clock,
  Sparkles,
  Share2,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  UserPlus,
  Flame,
  Zap,
  ArrowRight
} from 'lucide-react';
import api from '../api/client';

export default function GroupBuyModal({
  isOpen,
  onClose,
  product,
  onJoinPoolSuccess,
  onStartPoolSuccess
}) {
  const [activePools, setActivePools] = useState([]);
  const [isLoadingPools, setIsLoadingPools] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCreatedPool, setActiveCreatedPool] = useState(null);
  const [customerName, setCustomerName] = useState('Rahul Khanna');
  const [customerPhone, setCustomerPhone] = useState('9876543210');
  const [copiedCode, setCopiedCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const gb = product?.groupBuy || {};
  const discountPct = gb.discountPercentage || 20;
  const soloPrice = product?.sellingPrice || 999;
  const groupPrice = gb.groupPrice || Math.round(soloPrice * (1 - discountPct / 100));
  const savings = soloPrice - groupPrice;
  const teamSize = gb.teamSize || 2;

  useEffect(() => {
    if (!isOpen || !product?._id) return;
    setIsLoadingPools(true);
    setErrorMessage(null);
    setActiveCreatedPool(null);

    api.get(`/group-buy/product/${product._id}/pools`)
      .then(res => {
        if (res.data?.success) {
          setActivePools(res.data.data || []);
        }
      })
      .catch(() => {
        setActivePools([]);
      })
      .finally(() => {
        setIsLoadingPools(false);
      });
  }, [isOpen, product?._id]);

  if (!isOpen || !product) return null;

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleStartNewPool = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await api.post('/group-buy/pools', {
        productId: product._id,
        customerName,
        customerPhone
      });
      if (res.data?.success) {
        setActiveCreatedPool(res.data.data);
        if (onStartPoolSuccess) {
          onStartPoolSuccess(res.data.data);
        }
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Could not start group buy pool');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinPool = async (poolId) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await api.post(`/group-buy/pools/${poolId}/join`, {
        customerName,
        customerPhone
      });
      if (res.data?.success) {
        if (onJoinPoolSuccess) {
          onJoinPoolSuccess(res.data.data);
        }
        onClose();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Could not join group buy pool');
    } finally {
      setIsSubmitting(false);
    }
  };

  const shareText = `Namaste! Join my AuraMarket Team Buy for "${product.title}" and get it for only ₹${groupPrice} (Save ₹${savings})! Join now using Pool Code: ${activeCreatedPool?.poolCode}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[92vh] animate-scale-up">
        {/* Header Banner */}
        <div className="p-5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-slate-950 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors"
          >
            ✕
          </button>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-[10px] font-black uppercase tracking-wider text-slate-950 mb-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>Khareedo Saath Me • Save Extra {discountPct}%</span>
          </div>
          <h3 className="text-xl font-black text-white leading-tight">
            Team Purchase Discount Unlocked!
          </h3>
          <p className="text-amber-100 text-xs font-semibold mt-0.5">
            Buy together with {teamSize - 1} friend(s) within 24 hours to secure exclusive group pricing.
          </p>
        </div>

        {/* Product Comparison Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
          {product.images?.[0] && (
            <img
              src={product.images[0]}
              alt={product.title}
              className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <h4 className="font-extrabold text-xs text-slate-900 truncate">
              {product.title}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-base font-black text-emerald-600">
                ₹{groupPrice.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-slate-400 line-through">
                ₹{soloPrice.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                Save ₹{savings}
              </span>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-4 mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Newly Created Pool Screen */}
          {activeCreatedPool ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-black text-slate-900">
                  Team Pool Created Successfully!
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Your spot is reserved at <span className="font-bold text-emerald-600">₹{groupPrice}</span>. Invite {teamSize - 1} friend(s) to join using your code before the 24h timer expires!
                </p>
              </div>

              {/* Pool Code Box */}
              <div className="p-4 rounded-2xl bg-amber-50 border-2 border-dashed border-amber-300 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                  Your Unique Team Code
                </span>
                <div className="text-2xl font-black font-mono text-slate-950 tracking-widest">
                  {activeCreatedPool.poolCode}
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    onClick={() => handleCopy(activeCreatedPool.poolCode)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-slate-800 font-bold text-xs flex items-center gap-1.5 hover:bg-amber-100 transition-colors"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
              </div>

              {/* WhatsApp Share Button */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span>Invite Friends on WhatsApp to Complete Deal</span>
              </a>

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Done • View My Orders
              </button>
            </div>
          ) : (
            <>
              {/* Option 1: Existing Active Pools */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                    <span>Join an Active Team ({activePools.length} Waiting)</span>
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Instant Group Discount
                  </span>
                </div>

                {isLoadingPools ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    Checking active team pools...
                  </div>
                ) : activePools.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                    No active teams waiting for this item right now. Start the first team below!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activePools.map(pool => (
                      <div
                        key={pool._id}
                        className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-amber-400 shadow-xs flex items-center justify-between gap-3 transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                            {pool.creator?.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              {pool.creator?.name || 'Verified Shopper'}'s Team
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                              <span className="font-bold text-orange-600">
                                🔥 {pool.spotsLeft ?? 1} spot left!
                              </span>
                              <span>•</span>
                              <span className="font-mono">
                                ⏳ {Math.max(1, Math.round(pool.secondsRemaining / 3600))}h left
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleJoinPool(pool._id)}
                          disabled={isSubmitting}
                          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                        >
                          <span>Join @ ₹{groupPrice}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Or Start Your Own
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Option 2: Start a New Team Pool */}
              <div className="space-y-3 p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90">
                <div className="space-y-1">
                  <h5 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-amber-600" />
                    <span>Start a New Team Pool (Be the Team Leader)</span>
                  </h5>
                  <p className="text-[11px] text-slate-600">
                    Create a pool and invite friends. If team is not completed in 24 hours, you get an automatic 100% refund.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">Your Name</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">WhatsApp Phone</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleStartNewPool}
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>{isSubmitting ? 'Starting Pool...' : `Start Team Buy & Lock ₹${groupPrice}`}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
