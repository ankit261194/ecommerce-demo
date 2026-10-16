import React, { useRef, useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  Gift,
  Coins,
  Wallet,
  Trophy,
  Loader2,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import api from '../api/client';

export const ScratchCardModal = ({
  isOpen,
  onClose,
  orderId,
  cardData,
  onApplyCouponCode,
  onRewardClaimed,
}) => {
  const canvasRef = useRef(null);
  const [reward, setReward] = useState(cardData || null);
  const [loading, setLoading] = useState(!cardData);
  const [isScratched, setIsScratched] = useState(Boolean(cardData?.isScratched));
  const [isClaimed, setIsClaimed] = useState(Boolean(cardData?.isClaimed));
  const [isClaiming, setIsClaiming] = useState(false);
  const [scratchPercent, setScratchPercent] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [claimSuccessMessage, setClaimSuccessMessage] = useState(null);

  // Initialize or fetch scratch card reward
  useEffect(() => {
    if (!isOpen) return;

    if (cardData) {
      setReward(cardData);
      setIsScratched(Boolean(cardData.isScratched));
      setIsClaimed(Boolean(cardData.isClaimed));
      setLoading(false);
      return;
    }

    setLoading(true);
    setIsClaiming(false);
    setClaimSuccessMessage(null);
    setScratchPercent(0);

    // If orderId is provided: Fetch or generate post-purchase scratch card (Point #72 & Point #16)
    if (orderId) {
      api
        .post('/wallet/scratch-card/generate', { orderId })
        .then((res) => {
          if (res.data?.success && res.data.card) {
            const card = res.data.card;
            setReward(card);
            setIsScratched(Boolean(card.isScratched));
            setIsClaimed(Boolean(card.isClaimed));
          } else {
            fallbackLocalReward();
          }
          setLoading(false);
        })
        .catch(() => {
          // If unauthenticated or network error, fallback gracefully
          fallbackLocalReward();
          setLoading(false);
        });
      return;
    }

    // Fallback: Check if customer already scratched a promo card today in localStorage
    const saved = localStorage.getItem('auramarket_scratch_reward');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setReward(parsed);
        setIsScratched(true);
        setLoading(false);
        return;
      } catch (_) {}
    }

    // Generic promo scratch card endpoint
    api
      .get('/coupons/scratch-card')
      .then((res) => {
        if (res.data?.success && res.data.card) {
          setReward(res.data.card);
        } else {
          fallbackLocalReward();
        }
        setLoading(false);
      })
      .catch(() => {
        fallbackLocalReward();
        setLoading(false);
      });
  }, [isOpen, orderId]);

  const fallbackLocalReward = () => {
    setReward({
      rewardType: 'WALLET_COINS',
      amount: 250,
      badgeText: '+250 COINS',
      title: '🎉 Jackpot: 250 Reward Coins!',
      description: 'Instant +250 Coins credited to your digital rewards wallet.',
      couponCode: 'JACKPOT250',
    });
    setIsScratched(false);
    setIsClaimed(false);
  };

  // Initialize Canvas Overlay when modal is open and not already scratched
  useEffect(() => {
    if (!isOpen || isScratched || loading) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Draw shimmering metallic silver scratch layer
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#94a3b8');
    gradient.addColorStop(0.2, '#cbd5e1');
    gradient.addColorStop(0.5, '#f1f5f9');
    gradient.addColorStop(0.8, '#cbd5e1');
    gradient.addColorStop(1, '#64748b');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative pattern and instruction text
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨ SCRATCH HERE ✨', width / 2, height / 2 - 12);

    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('Swipe mouse or touch to reveal reward', width / 2, height / 2 + 14);
  }, [isOpen, isScratched, loading]);

  const scratch = (clientX, clientY) => {
    if (isScratched) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2, false);
    ctx.fill();

    checkScratchedPercentage(ctx, canvas.width, canvas.height);
  };

  const checkScratchedPercentage = (ctx, width, height) => {
    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      const pixels = imageData.data;
      let transparentCount = 0;
      const totalPixels = pixels.length / 4;

      // Sample every 4th pixel for performance
      for (let i = 3; i < pixels.length; i += 16) {
        if (pixels[i] === 0) {
          transparentCount += 4;
        }
      }

      const percent = Math.round((transparentCount / totalPixels) * 100);
      setScratchPercent(percent);

      if (percent >= 40 && !isScratched) {
        setIsScratched(true);
        if (reward?._id) {
          // Notify backend that card was scratched
          api.post(`/wallet/scratch-card/${reward._id}/scratch`).catch(() => {});
        } else if (reward) {
          localStorage.setItem('auramarket_scratch_reward', JSON.stringify(reward));
        }
      }
    } catch (_) {}
  };

  const handleClaimReward = async () => {
    if (!reward?._id) {
      setIsClaimed(true);
      setClaimSuccessMessage('🎉 Reward claimed successfully!');
      return;
    }

    try {
      setIsClaiming(true);
      const res = await api.post(`/wallet/scratch-card/${reward._id}/claim`);
      if (res.data?.success) {
        setIsClaimed(true);
        setClaimSuccessMessage(res.data.message || '🎉 Reward claimed and credited to your wallet!');
        if (res.data.data) {
          const payload = {
            walletBalance: res.data.data.walletBalance,
            walletCoins: res.data.data.walletCoins,
            balance: res.data.data.walletBalance,
            coins: res.data.data.walletCoins,
            timestamp: Date.now(),
          };
          // Broadcast live wallet update to Navbar and CustomerStorefront
          window.dispatchEvent(
            new CustomEvent('auramarket_wallet_update', {
              detail: payload,
            })
          );
          // Broadcast cross-tab sync via storage event
          try {
            localStorage.setItem('auramarket_wallet_sync', JSON.stringify(payload));
          } catch (_) {}

          if (onRewardClaimed) {
            onRewardClaimed(res.data.data);
          }
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not claim reward. It may already be claimed.';
      setClaimSuccessMessage(msg);
      if (err.response?.status === 400) {
        setIsClaimed(true);
      }
    } finally {
      setIsClaiming(false);
    }
  };

  const handleCopy = () => {
    const code = reward?.couponCode || reward?.code;
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);

    if (onApplyCouponCode) {
      onApplyCouponCode(code);
    }
  };

  const handleOpenWalletDrawer = () => {
    onClose();
    window.dispatchEvent(new CustomEvent('auramarket_open_wallet'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-slate-800 animate-scale-up">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 p-5 text-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-slate-950 fill-current" />
            <div>
              <h3 className="text-base font-black tracking-tight leading-none">
                Post-Purchase Mystery Scratch Card
              </h3>
              <p className="text-[10px] font-bold text-amber-950/80 mt-0.5">
                Point #72: Gamified Loyalty Rewards
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/10 text-slate-950 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 text-center space-y-5">
          {/* Order Badge (if post-purchase) */}
          {orderId && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
              <Gift className="w-3.5 h-3.5 text-amber-600" />
              <span>Reward unlocked for Order #{String(orderId).slice(-6).toUpperCase()}</span>
            </div>
          )}

          <div className="space-y-1">
            <h4 className="text-lg font-black text-slate-900">
              {loading
                ? 'Preparing your scratch card...'
                : isClaimed
                ? '🎉 Reward Claimed & Deposited!'
                : isScratched
                ? '🎉 Congratulations! Reward Revealed'
                : 'Rub to Scratch & Win!'}
            </h4>
            <p className="text-xs text-slate-500 font-medium">
              {isClaimed
                ? 'Your winnings have been credited to your AuraMarket digital wallet.'
                : isScratched
                ? 'Claim your reward now to deposit directly into your wallet or account.'
                : 'Use your cursor or touch to scratch off the silver metallic foil.'}
            </p>
          </div>

          {/* Interactive Scratch Area Card */}
          <div className="relative w-72 h-44 mx-auto rounded-2xl overflow-hidden shadow-lg border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-amber-100/60 flex flex-col items-center justify-center p-4 select-none">
            {/* Secret Reward Card (Underneath) */}
            {reward && (
              <div className="space-y-2 text-center animate-fade-in">
                <span className="inline-block px-3 py-1 bg-amber-500 text-slate-950 text-xs font-black rounded-full shadow-sm">
                  {reward.badgeText ||
                    (reward.rewardType === 'WALLET_COINS'
                      ? `+${reward.amount} COINS`
                      : reward.rewardType === 'WALLET_CASH'
                      ? `₹${reward.amount} CASH`
                      : `${reward.amount}% OFF`)}
                </span>

                <div className="flex items-center justify-center gap-1.5 text-slate-950">
                  {reward.rewardType === 'WALLET_COINS' ? (
                    <Coins className="w-7 h-7 text-amber-500 fill-amber-500 animate-bounce" />
                  ) : reward.rewardType === 'WALLET_CASH' ? (
                    <Wallet className="w-7 h-7 text-emerald-600" />
                  ) : (
                    <Gift className="w-7 h-7 text-purple-600" />
                  )}
                  <span className="text-2xl font-black tracking-wider font-mono">
                    {reward.rewardType === 'WALLET_COINS'
                      ? `+${reward.amount} COINS`
                      : reward.rewardType === 'WALLET_CASH'
                      ? `₹${reward.amount}`
                      : reward.couponCode || 'LUCKY25'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 font-semibold max-w-[220px] leading-tight mx-auto">
                  {reward.title || reward.description}
                </p>
              </div>
            )}

            {/* Interactive Canvas Scratch Layer */}
            {!isScratched && !loading && (
              <canvas
                ref={canvasRef}
                width={288}
                height={176}
                onMouseDown={(e) => {
                  setIsDrawing(true);
                  scratch(e.clientX, e.clientY);
                }}
                onMouseUp={() => setIsDrawing(false)}
                onMouseLeave={() => setIsDrawing(false)}
                onMouseMove={(e) => {
                  if (isDrawing) scratch(e.clientX, e.clientY);
                }}
                onTouchStart={(e) => {
                  setIsDrawing(true);
                  if (e.touches && e.touches[0]) {
                    scratch(e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
                onTouchEnd={() => setIsDrawing(false)}
                onTouchMove={(e) => {
                  if (e.touches && e.touches[0]) {
                    scratch(e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
                className="absolute inset-0 w-full h-full cursor-pointer touch-none"
              />
            )}
          </div>

          {/* Scratched Revealed Actions */}
          {isScratched ? (
            <div className="space-y-3 animate-fade-in">
              {/* Claim Success Banner */}
              {isClaimed ? (
                <div className="space-y-2">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{claimSuccessMessage || 'Reward credited to your Digital Wallet!'}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleOpenWalletDrawer}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      <Wallet className="w-3.5 h-3.5 text-amber-400" />
                      <span>View My Wallet</span>
                    </button>
                    <button
                      onClick={onClose}
                      className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {/* Claim Button for Wallet Rewards */}
                  <button
                    onClick={handleClaimReward}
                    disabled={isClaiming}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isClaiming ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Crediting to Wallet...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Claim Reward to Wallet Now</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* If Coupon: Also offer copy code */}
                  {(reward?.couponCode || reward?.code) && (
                    <button
                      onClick={handleCopy}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-1.5"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied Code: {reward.couponCode || reward.code}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copy Coupon Code ({reward.couponCode || reward.code})</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 font-medium">
              Scratch progress:{' '}
              <span className="font-bold text-amber-600">{scratchPercent}%</span> (Scratch 40% to
              reveal)
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScratchCardModal;
