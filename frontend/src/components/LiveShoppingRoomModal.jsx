import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Heart,
  Send,
  ShoppingBag,
  Sparkles,
  Eye,
  Flame,
  Radio,
  Tag,
  Share2,
  Check,
  ChevronRight,
  Package,
} from 'lucide-react';
import api from '../api/client';
import { useCart } from '../context/CartContext';
import { useLocalization } from '../context/LocalizationContext';

export const LiveShoppingRoomModal = ({ isOpen, onClose, streamId }) => {
  const { addToCart } = useCart();
  const { formatPrice } = useLocalization();

  const [stream, setStream] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [likesCount, setLikesCount] = useState(0);
  const [floatingHearts, setFloatingHearts] = useState([]);
  const [isProductDrawerOpen, setIsProductDrawerOpen] = useState(false);
  const [quickBuySuccess, setQuickBuySuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const chatBottomRef = useRef(null);

  const fetchStreamData = async () => {
    setLoading(true);
    try {
      const url = streamId
        ? `/video-shopping/live/${streamId}`
        : '/video-shopping/live';

      const res = await api.get(url);
      if (res.data?.success) {
        const streamData = streamId ? res.data.data : res.data.data?.[0];
        if (streamData) {
          setStream(streamData);
          setChatMessages(streamData.liveChatMessages || []);
          setLikesCount(streamData.metrics?.totalLikes || 420);
        }
      }
    } catch (err) {
      console.error('Failed to load live stream:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStreamData();
      const interval = setInterval(() => {
        // Light polling for live chat sync
        if (stream?._id) {
          api.get(`/video-shopping/live/${stream._id}`).then(res => {
            if (res.data?.success && res.data.data?.liveChatMessages) {
              setChatMessages(res.data.data.liveChatMessages);
            }
          }).catch(() => {});
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, streamId, stream?._id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !stream) return;

    const messageText = inputMessage.trim();
    setInputMessage('');

    try {
      const res = await api.post(`/video-shopping/live/${stream._id}/chat`, {
        message: messageText,
        userName: 'Shopper Live',
      });

      if (res.data?.success) {
        setChatMessages(prev => [...prev, res.data.data]);
      }
    } catch (err) {
      console.error('Failed to post chat:', err);
    }
  };

  const handleLike = async () => {
    if (!stream) return;
    setLikesCount(prev => prev + 1);

    // Add floating heart animation
    const heartId = Date.now() + Math.random();
    setFloatingHearts(prev => [...prev, { id: heartId, left: Math.floor(Math.random() * 60) + 20 }]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== heartId));
    }, 1800);

    try {
      await api.post(`/video-shopping/live/${stream._id}/like`);
    } catch (_) {}
  };

  const handleQuickBuy = async (product) => {
    if (!stream || !product) return;

    addToCart({
      ...product,
      price: Math.round((product.sellingPrice || product.price || 1000) * (1 - (stream.exclusiveDiscountPercent || 15) / 100)),
    });

    try {
      await api.post(`/video-shopping/live/${stream._id}/quick-buy`);
    } catch (_) {}

    setQuickBuySuccess(true);
    setTimeout(() => setQuickBuySuccess(false), 2500);
  };

  if (!isOpen) return null;

  const pinnedProduct = stream?.pinnedProduct;
  const rawPrice = pinnedProduct?.sellingPrice || pinnedProduct?.price || 1999;
  const discountedPrice = Math.round(rawPrice * (1 - (stream?.exclusiveDiscountPercent || 15) / 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md h-full sm:h-[860px] bg-slate-950 sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-800">
        {/* Background Video Player */}
        <div className="absolute inset-0 z-0">
          <video
            src={stream?.playbackUrl || 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-listening-to-music-with-headphones-40994-large.mp4'}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-transparent to-slate-950/90 pointer-events-none" />
        </div>

        {/* Floating Animated Hearts */}
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          {floatingHearts.map(heart => (
            <div
              key={heart.id}
              className="absolute bottom-24 text-rose-500 animate-floatUp opacity-90"
              style={{ left: `${heart.left}%` }}
            >
              <Heart className="w-8 h-8 fill-rose-500 stroke-white stroke-2 drop-shadow-lg" />
            </div>
          ))}
        </div>

        {/* Top Header Controls */}
        <div className="relative z-10 p-4 pt-6 sm:pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 bg-slate-900/80 backdrop-blur-md p-1.5 pr-4 rounded-full border border-white/10 shadow-lg">
            <div className="relative">
              <img
                src={stream?.vendor?.logo || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=100'}
                alt="Store"
                className="w-9 h-9 rounded-full object-cover border-2 border-amber-400"
              />
              <span className="absolute -bottom-1 -right-1 px-1 rounded bg-rose-600 text-[8px] font-black text-white uppercase tracking-wider animate-pulse">
                LIVE
              </span>
            </div>
            <div>
              <p className="text-xs font-black text-white leading-tight">
                {stream?.vendor?.storeName || 'Aura Flagship Store'}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                <Eye className="w-3 h-3 text-rose-400" />
                <span>{stream?.metrics?.concurrentViewers || 148} watching</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsProductDrawerOpen(!isProductDrawerOpen)}
              className="p-2.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white border border-white/10 hover:bg-slate-800 transition-colors shadow-lg relative"
              title="Featured Products Catalog"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                {stream?.catalogProducts?.length || 4}
              </span>
            </button>

            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white border border-white/10 hover:bg-rose-500 transition-colors shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Headline Banner */}
        <div className="relative z-10 px-4 py-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/90 text-white text-[11px] font-black uppercase tracking-wider shadow-md">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Interactive Live Shopping • Point #54</span>
          </div>
          <h3 className="text-sm font-black text-white drop-shadow mt-1 line-clamp-1">
            {stream?.title || 'Studio Runway Flash Drop'}
          </h3>
        </div>

        {/* Middle Space */}
        <div className="flex-1" />

        {/* Live Chat Stream Overlay */}
        <div className="relative z-10 px-4 max-h-48 overflow-y-auto space-y-2 no-scrollbar mask-gradient-top">
          {chatMessages.slice(-15).map((msg, idx) => (
            <div
              key={idx}
              className={`p-2 rounded-2xl text-xs max-w-[85%] backdrop-blur-md transition-all ${
                msg.isVendor
                  ? 'bg-amber-400/95 text-slate-950 font-black shadow-lg border border-amber-300'
                  : 'bg-slate-900/80 text-white border border-white/10 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-black ${msg.isVendor ? 'text-slate-950' : 'text-amber-400'}`}>
                  {msg.userName}
                </span>
                {msg.isVendor && (
                  <span className="px-1 py-0.2 rounded bg-slate-950 text-amber-400 text-[8px] uppercase">
                    Host
                  </span>
                )}
              </div>
              <p className="mt-0.5 leading-snug">{msg.message}</p>
            </div>
          ))}
          <div ref={chatBottomRef} />
        </div>

        {/* Pinned Product Card (The Hero Showcase) */}
        {pinnedProduct && (
          <div className="relative z-10 mx-4 my-2 p-3 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-white/20 shadow-2xl flex items-center justify-between gap-3">
            <img
              src={pinnedProduct.thumbnail || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200'}
              alt={pinnedProduct.title}
              className="w-14 h-14 rounded-xl object-cover border border-white/20 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[9px] font-black uppercase">
                  {stream?.exclusiveDiscountPercent || 15}% OFF IN LIVE
                </span>
              </div>
              <p className="text-xs font-bold text-white truncate mt-0.5">
                {pinnedProduct.title}
              </p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-sm font-black text-amber-400">
                  {formatPrice(discountedPrice)}
                </span>
                <span className="text-[10px] line-through text-slate-400">
                  {formatPrice(rawPrice)}
                </span>
              </div>
            </div>

            <button
              onClick={() => handleQuickBuy(pinnedProduct)}
              disabled={quickBuySuccess}
              className={`px-3 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-lg transition-all flex-shrink-0 ${
                quickBuySuccess
                  ? 'bg-emerald-500 text-white'
                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20'
              }`}
            >
              {quickBuySuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Added!</span>
                </>
              ) : (
                <>
                  <Flame className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Buy Now</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Bottom Interaction Bar (Chat Input + Like + Share) */}
        <div className="relative z-10 p-4 pt-2 pb-6 sm:pb-4 flex items-center gap-2">
          <form onSubmit={handleSendMessage} className="flex-1 relative">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask the host a question..."
              className="w-full bg-slate-900/80 backdrop-blur-md text-white placeholder-slate-400 text-xs rounded-full pl-4 pr-10 py-3 border border-white/10 focus:outline-none focus:border-amber-400 transition-colors shadow-inner"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-amber-400 text-slate-950 disabled:opacity-40 transition-opacity"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          <button
            onClick={handleLike}
            className="p-3 rounded-full bg-slate-900/80 backdrop-blur-md text-white border border-white/10 hover:bg-rose-500/20 hover:border-rose-500 transition-all shadow-lg relative group"
            title="Like Broadcast"
          >
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500 group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 px-1 rounded-full bg-rose-600 text-white text-[8px] font-black">
              {likesCount}
            </span>
          </button>
        </div>

        {/* Featured Products Drawer */}
        {isProductDrawerOpen && (
          <div className="absolute inset-x-0 bottom-0 z-30 bg-slate-900/98 backdrop-blur-xl border-t border-slate-800 rounded-t-3xl p-5 space-y-4 animate-slideUp max-h-[60%] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-black text-white">
                  Featured Products ({stream?.catalogProducts?.length || 0})
                </h4>
              </div>
              <button
                onClick={() => setIsProductDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {(stream?.catalogProducts || []).map((p, idx) => {
                const pRaw = p.sellingPrice || p.price || 1500;
                const pDisc = Math.round(pRaw * (1 - (stream?.exclusiveDiscountPercent || 15) / 100));

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between gap-3"
                  >
                    <img
                      src={p.thumbnail || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200'}
                      alt={p.title}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{p.title}</p>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-xs font-black text-amber-400">{formatPrice(pDisc)}</span>
                        <span className="text-[10px] line-through text-slate-400">{formatPrice(pRaw)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleQuickBuy(p)}
                      className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs hover:bg-amber-300 transition-colors"
                    >
                      Buy in Live
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveShoppingRoomModal;
