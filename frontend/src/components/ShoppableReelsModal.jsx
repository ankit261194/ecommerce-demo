import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Heart,
  MessageCircle,
  Share2,
  X,
  ShoppingBag,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Radio,
  CheckCircle2,
  Send,
  Zap,
  ArrowRight
} from 'lucide-react';
import api from '../api/client';

export default function ShoppableReelsModal({
  isOpen,
  onClose,
  onAddToCart,
  onBuyNow
}) {
  const [reels, setReels] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [heartsAnimation, setHeartsAnimation] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [commentsList, setCommentsList] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const videoRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    api.get('/video-shopping/reels')
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          setReels(res.data.data);
          if (res.data.data.length > 0) {
            setCurrentIndex(0);
            setLikeCount(res.data.data[0].likesCount || 0);
            setCommentsList(res.data.data[0].comments || []);
            // Record view
            api.post(`/video-shopping/reels/${res.data.data[0]._id}/view`).catch(() => {});
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen]);

  const currentReel = reels[currentIndex];

  useEffect(() => {
    if (currentReel) {
      setLikeCount(currentReel.likesCount || 0);
      setCommentsList(currentReel.comments || []);
      setIsLiked(false);
      setIsPlaying(true);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
      // Record view
      api.post(`/video-shopping/reels/${currentReel._id}/view`).catch(() => {});
    }
  }, [currentIndex, currentReel?._id]);

  if (!isOpen) return null;

  const handleNextReel = () => {
    if (currentIndex < reels.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0); // loop
    }
  };

  const handlePrevReel = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else {
      setCurrentIndex(reels.length - 1);
    }
  };

  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleLike = () => {
    if (!currentReel) return;
    setIsLiked(true);
    setLikeCount(prev => prev + 1);

    // Floating heart effect
    const heartId = Date.now();
    setHeartsAnimation(prev => [...prev, heartId]);
    setTimeout(() => {
      setHeartsAnimation(prev => prev.filter(h => h !== heartId));
    }, 1500);

    api.post(`/video-shopping/reels/${currentReel._id}/like`).catch(() => {});
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !currentReel) return;

    setIsSubmittingComment(true);
    try {
      const res = await api.post(`/video-shopping/reels/${currentReel._id}/comment`, {
        text: newCommentText.trim(),
        userName: 'Valued Shopper'
      });
      if (res.data?.success) {
        setCommentsList(prev => [...prev, res.data.data]);
        setNewCommentText('');
      }
    } catch (_) {}
    finally {
      setIsSubmittingComment(false);
    }
  };

  const handleShare = () => {
    if (!currentReel) return;
    const text = `Watch "${currentReel.title}" on AuraMarket Shoppable Reels & grab live discounts!`;
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + window.location.href)}`;
    window.open(shareUrl, '_blank');
  };

  const primaryProduct = currentReel?.products?.[0]?.product;
  const productPrice = currentReel?.products?.[0]?.customPrice || primaryProduct?.sellingPrice || 999;
  const productMrp = primaryProduct?.mrp || Math.round(productPrice * 1.4);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 animate-fade-in">
      {/* Background click to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Main 9:16 Vertical Reel Player Container */}
      <div className="relative w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-[420px] sm:aspect-[9/16] bg-black sm:rounded-[36px] overflow-hidden shadow-2xl z-10 flex flex-col justify-between border sm:border-slate-800">
        {/* Loading state */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-white space-y-2">
            <Video className="w-10 h-10 animate-bounce text-rose-500" />
            <span className="text-xs font-bold text-slate-400">Loading Shoppable Stream...</span>
          </div>
        ) : !currentReel ? (
          <div className="flex-1 flex flex-col items-center justify-center text-white space-y-3 p-6 text-center">
            <Video className="w-12 h-12 text-slate-600" />
            <h4 className="font-bold text-sm">No Live Reels Right Now</h4>
            <p className="text-xs text-slate-400">Check back later for exclusive live shopping streams.</p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs"
            >
              Back to Store
            </button>
          </div>
        ) : (
          <>
            {/* Native Video Element */}
            <video
              ref={videoRef}
              src={currentReel.videoUrl}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              onClick={handleTogglePlay}
              className="absolute inset-0 w-full h-full object-cover cursor-pointer"
            />

            {/* Play/Pause Center Indicator */}
            {!isPlaying && (
              <div
                onClick={handleTogglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/30 z-10 cursor-pointer"
              >
                <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center shadow-2xl">
                  <Play className="w-8 h-8 fill-white ml-1" />
                </div>
              </div>
            )}

            {/* Floating Hearts Array */}
            <div className="absolute right-6 bottom-32 z-30 pointer-events-none flex flex-col gap-2">
              {heartsAnimation.map(h => (
                <Heart
                  key={h}
                  className="w-8 h-8 text-rose-500 fill-rose-500 animate-ping transition-all drop-shadow-lg"
                />
              ))}
            </div>

            {/* Top Navigation & Status Bar */}
            <div className="relative z-20 p-4 pt-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                {currentReel.isLive ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[10px] uppercase flex items-center gap-1 shadow-md animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    <span>LIVE</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-white font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <Video className="w-3 h-3 text-rose-400" />
                    <span>Reels</span>
                  </span>
                )}
                <span className="text-[10px] font-bold bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full">
                  👀 {currentReel.viewsCount || 1}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 text-white transition-colors"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right Engagement Actions Rail */}
            <div className="absolute right-3 bottom-28 z-20 flex flex-col items-center gap-3.5 text-white">
              {/* Up / Down Reel Nav */}
              <div className="flex flex-col gap-1 mb-2 bg-black/40 backdrop-blur-md rounded-full p-1 border border-white/10">
                <button
                  onClick={handlePrevReel}
                  className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
                  title="Previous Reel"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextReel}
                  className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
                  title="Next Reel"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Like */}
              <button
                onClick={handleLike}
                className="flex flex-col items-center group active:scale-90 transition-transform"
              >
                <div
                  className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center shadow-lg transition-colors ${
                    isLiked ? 'bg-rose-600 text-white' : 'bg-black/50 text-white group-hover:bg-black/70'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isLiked ? 'fill-white' : 'group-hover:fill-rose-400'}`} />
                </div>
                <span className="text-[10px] font-black mt-1 drop-shadow">
                  {likeCount}
                </span>
              </button>

              {/* Comments */}
              <button
                onClick={() => setShowComments(!showComments)}
                className="flex flex-col items-center group active:scale-90 transition-transform"
              >
                <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center shadow-lg group-hover:bg-black/70 transition-colors">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black mt-1 drop-shadow">
                  {commentsList.length}
                </span>
              </button>

              {/* WhatsApp Share */}
              <button
                onClick={handleShare}
                className="flex flex-col items-center group active:scale-90 transition-transform"
              >
                <div className="w-11 h-11 rounded-full bg-emerald-600/90 backdrop-blur-md flex items-center justify-center shadow-lg group-hover:bg-emerald-500 transition-colors">
                  <Share2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-[10px] font-black mt-1 drop-shadow">Share</span>
              </button>
            </div>

            {/* Bottom Section: Title, Description & Shoppable Product Card */}
            <div className="relative z-20 p-4 bg-gradient-to-t from-black via-black/85 to-transparent space-y-3">
              {/* Title & Caption */}
              <div className="space-y-1 pr-14 text-white">
                <h3 className="font-extrabold text-sm sm:text-base leading-snug drop-shadow-md">
                  {currentReel.title}
                </h3>
                {currentReel.description && (
                  <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed opacity-90 drop-shadow">
                    {currentReel.description}
                  </p>
                )}
              </div>

              {/* Floating "Shop The Look" Card */}
              {primaryProduct && (
                <div className="p-3 rounded-2xl bg-white/95 backdrop-blur-md text-slate-900 border border-white shadow-2xl flex items-center justify-between gap-3 animate-slide-up">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {primaryProduct.images?.[0] ? (
                      <img
                        src={primaryProduct.images[0]}
                        alt={primaryProduct.title}
                        className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                        Featured in Video
                      </span>
                      <h4 className="font-black text-xs text-slate-950 truncate">
                        {primaryProduct.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm font-black text-emerald-600">
                          ₹{productPrice.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[11px] text-slate-400 line-through">
                          ₹{productMrp.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        if (onAddToCart) {
                          onAddToCart(
                            {
                              ...primaryProduct,
                              sellingPrice: productPrice
                            },
                            null,
                            1
                          );
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-black text-xs flex items-center gap-1 shadow-md transition-all active:scale-95"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                      <span>Buy</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Slide-Up Comments Drawer */}
            {showComments && (
              <div className="absolute inset-x-0 bottom-0 top-1/3 bg-slate-900/95 backdrop-blur-md rounded-t-3xl border-t border-slate-800 p-4 z-40 flex flex-col justify-between animate-slide-up">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-black text-white">
                      Live Audience Chat ({commentsList.length})
                    </span>
                  </div>
                  <button
                    onClick={() => setShowComments(false)}
                    className="p-1 rounded-full text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto space-y-2 py-3 text-xs">
                  {commentsList.length === 0 ? (
                    <div className="text-center text-slate-500 py-6">
                      No comments yet. Say something friendly!
                    </div>
                  ) : (
                    commentsList.map((c, i) => (
                      <div key={i} className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-200">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-bold text-rose-300 text-[11px]">{c.userName || 'Shopper'}</span>
                          <span className="text-[9px] text-slate-500">
                            {new Date(c.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">{c.text}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Input */}
                <form onSubmit={handleSendComment} className="flex gap-2 pt-2 border-t border-slate-800">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={e => setNewCommentText(e.target.value)}
                    placeholder="Ask about sizing, delivery, price..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !newCommentText.trim()}
                    className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
