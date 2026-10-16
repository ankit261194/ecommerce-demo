import React, { useState, useEffect } from 'react';
import { Gift, X, Sparkles, Check, Heart, ShieldCheck, EyeOff, Tag } from 'lucide-react';
import api from '../api/client';

export const GiftOptionsModal = ({
  isOpen,
  onClose,
  giftOptions,
  setGiftOptions,
  subtotal = 0,
}) => {
  const [config, setConfig] = useState({
    isEnabled: true,
    basePrice: 49,
    freeThreshold: 1999,
    allowHidePrice: true,
    maxMessageLength: 250,
    designs: [],
    cardThemes: [],
  });
  const [loading, setLoading] = useState(true);

  // Fallback defaults
  const defaultDesigns = [
    {
      id: 'wrap-gold',
      name: 'Royal Gold Velvet',
      price: 49,
      color: '#f59e0b',
      previewImage: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300&q=80',
    },
    {
      id: 'wrap-ruby',
      name: 'Festive Celebration Ruby',
      price: 49,
      color: '#ef4444',
      previewImage: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=300&q=80',
    },
    {
      id: 'wrap-midnight',
      name: 'Midnight Stars Sapphire',
      price: 59,
      color: '#1e3a8a',
      previewImage: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=300&q=80',
    },
    {
      id: 'wrap-eco',
      name: 'Eco-Friendly Botanical Kraft',
      price: 39,
      color: '#15803d',
      previewImage: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=300&q=80',
    },
  ];

  const defaultCardThemes = [
    {
      theme: 'Birthday',
      icon: '🎂',
      defaultMessage: 'Wishing you a very Happy Birthday! May all your dreams and wishes come true.',
    },
    {
      theme: 'Anniversary',
      icon: '💍',
      defaultMessage: 'Happy Anniversary! Celebrating your wonderful journey of love and togetherness.',
    },
    {
      theme: 'Festive / Diwali',
      icon: '🪔',
      defaultMessage: 'Warm festive greetings! Wishing you and your family prosperity, light, and boundless happiness.',
    },
    {
      theme: 'Congratulations',
      icon: '🎉',
      defaultMessage: 'Heartiest congratulations on your remarkable success! So proud of your achievement.',
    },
    {
      theme: 'Thank You',
      icon: '💐',
      defaultMessage: 'A heartfelt thank you for your warmth, generosity, and wonderful support.',
    },
    {
      theme: 'Best Wishes',
      icon: '✨',
      defaultMessage: 'Sending you my warmest thoughts and very best wishes for all your future endeavors.',
    },
  ];

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get('/gift-wrap/config');
        if (res.data?.success && res.data.data) {
          setConfig({
            ...res.data.data,
            designs: res.data.data.designs?.length ? res.data.data.designs : defaultDesigns,
            cardThemes: res.data.data.cardThemes?.length ? res.data.data.cardThemes : defaultCardThemes,
          });
        }
      } catch (err) {
        setConfig((prev) => ({
          ...prev,
          designs: defaultDesigns,
          cardThemes: defaultCardThemes,
        }));
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  if (!isOpen) return null;

  const freeThreshold = config.freeThreshold ?? 1999;
  const isFree = subtotal >= freeThreshold;
  const remainingForFree = Math.max(0, freeThreshold - subtotal);

  const activeDesigns = config.designs?.length ? config.designs : defaultDesigns;
  const activeThemes = config.cardThemes?.length ? config.cardThemes : defaultCardThemes;

  const currentWrap = activeDesigns.find((d) => d.id === giftOptions.wrapId) || activeDesigns[0] || {};
  const currentPrice = isFree ? 0 : (currentWrap.price || config.basePrice || 49);

  const handleSelectDesign = (d) => {
    setGiftOptions((prev) => ({
      ...prev,
      wrapId: d.id,
      wrapName: d.name,
      wrapPrice: isFree ? 0 : d.price,
    }));
  };

  const handleSelectTheme = (t) => {
    setGiftOptions((prev) => ({
      ...prev,
      cardTheme: t.theme,
      message: prev.message && prev.message.trim() !== '' ? prev.message : t.defaultMessage,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Gift Wrap & Personalized Greeting Card
                <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30 font-medium">
                  Point #19
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Premium designer packaging, handcrafted greeting cards & price protection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping / Wrap Banner */}
        <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs">
          {isFree ? (
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>🎉 Congratulations! FREE Premium Gift Wrapping unlocked (Subtotal ₹{subtotal.toLocaleString('en-IN')})</span>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <span className="text-amber-200">
                Add <strong>₹{remainingForFree.toLocaleString('en-IN')}</strong> more to cart for <strong>FREE</strong> Premium Gift Wrapping!
              </span>
              <span className="text-slate-400">Standard: ₹{currentPrice}</span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Main Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-800/60 rounded-xl border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-white">Wrap this order as a Gift</p>
                <p className="text-xs text-slate-400">
                  Includes luxury paper wrap, designer ribbon & personalized card note
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={giftOptions.isGift}
                onChange={(e) =>
                  setGiftOptions((prev) => ({
                    ...prev,
                    isGift: e.target.checked,
                    wrapPrice: e.target.checked ? (isFree ? 0 : (currentWrap.price || 49)) : 0,
                  }))
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {giftOptions.isGift && (
            <div className="space-y-6 animate-fadeIn">
              {/* Step 1: Choose Wrap Design */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  1. Select Designer Gift Wrap Paper
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {activeDesigns.map((d) => {
                    const isSelected = giftOptions.wrapId === d.id;
                    return (
                      <div
                        key={d.id}
                        onClick={() => handleSelectDesign(d)}
                        className={`cursor-pointer rounded-xl border p-2.5 flex flex-col transition-all relative overflow-hidden group ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                            : 'border-slate-800 bg-slate-800/40 hover:border-slate-700'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-amber-500 text-slate-950 rounded-full flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                        <div
                          className="w-full h-20 rounded-lg mb-2 relative overflow-hidden bg-cover bg-center"
                          style={{
                            backgroundImage: `url(${d.previewImage || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300&q=80'})`,
                          }}
                        >
                          <div
                            className="absolute inset-0 opacity-40 mix-blend-multiply"
                            style={{ backgroundColor: d.color || '#f59e0b' }}
                          />
                        </div>
                        <p className="font-semibold text-xs text-white truncate">{d.name}</p>
                        <p className="text-[11px] text-amber-400 mt-0.5">
                          {isFree ? 'FREE' : `+₹${d.price}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Choose Greeting Card Theme */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  2. Choose Greeting Card Occasion & Theme
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {activeThemes.map((t) => {
                    const isSelected = giftOptions.cardTheme === t.theme;
                    return (
                      <button
                        key={t.theme}
                        type="button"
                        onClick={() => handleSelectTheme(t)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/15 text-white'
                            : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-xl">{t.icon}</span>
                        <div className="truncate">
                          <p className="text-xs font-medium truncate">{t.theme}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Personalized Names & Note */}
              <div className="space-y-3 bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  3. Personalized Greeting Message
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">To (Recipient Name)</label>
                    <input
                      type="text"
                      placeholder="e.g., Priya Sharma"
                      value={giftOptions.recipientName || ''}
                      onChange={(e) =>
                        setGiftOptions((prev) => ({ ...prev, recipientName: e.target.value }))
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">From (Your / Sender Name)</label>
                    <input
                      type="text"
                      placeholder="e.g., Aditya & Friends"
                      value={giftOptions.senderName || ''}
                      onChange={(e) =>
                        setGiftOptions((prev) => ({ ...prev, senderName: e.target.value }))
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-slate-400">Greeting Note (Printed on Gift Slip)</label>
                    <span className="text-[10px] text-slate-500">
                      {(giftOptions.message || '').length}/{config.maxMessageLength || 250} chars
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={config.maxMessageLength || 250}
                    placeholder="Write your heartfelt message here..."
                    value={giftOptions.message || ''}
                    onChange={(e) =>
                      setGiftOptions((prev) => ({ ...prev, message: e.target.value }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>
              </div>

              {/* Step 4: Price Protection Checkbox */}
              {config.allowHidePrice !== false && (
                <div className="flex items-center justify-between p-3.5 bg-slate-800/30 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <EyeOff className="w-4 h-4 text-amber-400" />
                    <div>
                      <p className="text-xs font-medium text-white">
                        Conceal item prices on the packing slip
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Line item prices and total amounts will be labeled "Gift Protected" to keep the surprise intact.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={giftOptions.hideInvoicePrice}
                    onChange={(e) =>
                      setGiftOptions((prev) => ({
                        ...prev,
                        hideInvoicePrice: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>
              )}

              {/* Live Slip Preview Preview Card */}
              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2">
                <div className="flex items-center justify-between text-xs text-amber-400 font-semibold border-b border-amber-500/10 pb-2">
                  <span>💌 Postcard Greeting Preview</span>
                  <span>{giftOptions.cardTheme || 'Best Wishes'}</span>
                </div>
                <div className="text-xs text-slate-200 italic font-serif leading-relaxed">
                  "{giftOptions.message || 'Wishing you joy and wonderful moments!'}"
                </div>
                <div className="flex items-center justify-between pt-2 text-[11px] text-slate-400">
                  <span>To: <strong>{giftOptions.recipientName || 'Recipient'}</strong></span>
                  <span>With Love: <strong>{giftOptions.senderName || 'Sender'}</strong></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Gift Wrap Fee</p>
            <p className="text-base font-bold text-white">
              {giftOptions.isGift ? (isFree ? '₹0 (FREE)' : `₹${currentPrice}`) : '₹0'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-lg shadow-amber-500/20 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Apply & Save Gift Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
