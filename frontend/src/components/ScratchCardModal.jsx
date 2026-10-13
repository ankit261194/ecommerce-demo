import React, { useRef, useState, useEffect } from 'react';
import { X, Sparkles, Copy, Check, Gift, Flame, Trophy } from 'lucide-react';
import api from '../api/client';

export const ScratchCardModal = ({
  isOpen,
  onClose,
  onApplyCouponCode,
}) => {
  const canvasRef = useRef(null);
  const [reward, setReward] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isScratched, setIsScratched] = useState(false);
  const [scratchPercent, setScratchPercent] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load or fetch scratch card reward
  useEffect(() => {
    if (!isOpen) return;

    // Check if customer already scratched a card today in localStorage
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

    setLoading(true);
    setIsScratched(false);
    setScratchPercent(0);

    api.get('/coupons/scratch-card')
      .then(res => {
        if (res.data?.success && res.data.card) {
          setReward(res.data.card);
        } else {
          setReward({
            code: 'SCRATCH20',
            title: 'Lucky Scratch 20% OFF',
            description: 'You unlocked 20% off on your next purchase!',
            badgeText: '20% OFF',
            discountValue: 20,
            discountType: 'PERCENTAGE',
          });
        }
        setLoading(false);
      })
      .catch(() => {
        setReward({
          code: 'SCRATCH20',
          title: 'Lucky Scratch 20% OFF',
          description: 'You unlocked 20% off on your next purchase!',
          badgeText: '20% OFF',
          discountValue: 20,
          discountType: 'PERCENTAGE',
        });
        setLoading(false);
      });
  }, [isOpen]);

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
    gradient.addColorStop(0.3, '#cbd5e1');
    gradient.addColorStop(0.5, '#e2e8f0');
    gradient.addColorStop(0.7, '#cbd5e1');
    gradient.addColorStop(1, '#64748b');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative pattern and instruction text
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨ SCRATCH HERE ✨', width / 2, height / 2 - 12);

    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('Swipe mouse or touch to reveal reward', width / 2, height / 2 + 14);
  }, [isOpen, isScratched, loading]);

  const scratch = (clientX, clientY) => {
    if (isScratched) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2, false);
    ctx.fill();

    // Calculate scratched percentage periodically
    checkScratchedPercentage(ctx, canvas.width, canvas.height);
  };

  const checkScratchedPercentage = (ctx, width, height) => {
    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      const pixels = imageData.data;
      let transparentCount = 0;
      const totalPixels = pixels.length / 4;

      // Sample every 4th pixel for high performance
      for (let i = 3; i < pixels.length; i += 16) {
        if (pixels[i] === 0) {
          transparentCount += 4;
        }
      }

      const percent = Math.round((transparentCount / totalPixels) * 100);
      setScratchPercent(percent);

      if (percent >= 40 && !isScratched) {
        setIsScratched(true);
        if (reward) {
          localStorage.setItem('auramarket_scratch_reward', JSON.stringify(reward));
        }
      }
    } catch (_) {}
  };

  const handleCopy = () => {
    if (!reward?.code) return;
    navigator.clipboard.writeText(reward.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);

    if (onApplyCouponCode) {
      onApplyCouponCode(reward.code);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-slate-800 animate-scale-up">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 p-5 text-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-slate-950 fill-current" />
            <h3 className="text-base font-black tracking-tight">
              AuraMarket Lucky Scratch Reward
            </h3>
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
          <div className="space-y-1">
            <h4 className="text-lg font-black text-slate-900">
              {isScratched ? '🎉 Congratulations! Reward Unlocked' : 'Rub to Scratch & Win!'}
            </h4>
            <p className="text-xs text-slate-500 font-medium">
              {isScratched
                ? 'Your exclusive promo discount is ready for checkout'
                : 'Use your cursor or finger to scratch off the silver coating'}
            </p>
          </div>

          {/* Interactive Scratch Area Card */}
          <div className="relative w-72 h-44 mx-auto rounded-2xl overflow-hidden shadow-lg border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-amber-100/60 flex flex-col items-center justify-center p-4 select-none">
            {/* Secret Reward Card (Underneath) */}
            {reward && (
              <div className="space-y-2 text-center animate-fade-in">
                <span className="inline-block px-3 py-1 bg-amber-500 text-slate-950 text-xs font-black rounded-full shadow-sm">
                  {reward.badgeText || 'SPECIAL OFFER'}
                </span>
                <div className="text-2xl font-black text-slate-950 tracking-wider font-mono">
                  {reward.code}
                </div>
                <p className="text-[11px] text-slate-600 font-semibold max-w-[200px] leading-tight mx-auto">
                  {reward.title}
                </p>
              </div>
            )}

            {/* Interactive Canvas Scratch Layer */}
            {!isScratched && (
              <canvas
                ref={canvasRef}
                width={288}
                height={176}
                onMouseDown={() => setIsDrawing(true)}
                onMouseUp={() => setIsDrawing(false)}
                onMouseLeave={() => setIsDrawing(false)}
                onMouseMove={e => {
                  if (isDrawing) scratch(e.clientX, e.clientY);
                }}
                onTouchStart={() => setIsDrawing(true)}
                onTouchEnd={() => setIsDrawing(false)}
                onTouchMove={e => {
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
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Valid on all orders for next 48 hours</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>1-Click Copy Code ({reward?.code})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 font-medium">
              Scratch progress: <span className="font-bold text-amber-600">{scratchPercent}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScratchCardModal;
