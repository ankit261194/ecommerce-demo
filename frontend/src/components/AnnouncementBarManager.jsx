import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Palette,
  Clock,
  Tag,
  Link as LinkIcon,
  Save,
  RefreshCw,
  Eye,
  Check,
  AlertCircle,
  Copy,
  Sparkles,
  Flame,
  ArrowRight,
  X,
  Sliders,
} from 'lucide-react';
import api from '../api/client';

export default function AnnouncementBarManager({ onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const [formData, setFormData] = useState({
    enabled: true,
    text: '🔥 Festive Sale Live! Get up to 40% OFF with code FESTIVE2026',
    bgColor: '#F59E0B',
    textColor: '#0B0F17',
    couponCode: 'FESTIVE2026',
    actionLink: '/products',
    buttonText: 'Shop Now',
    isDismissible: true,
    countdownEnd: '',
  });

  const colorPresets = [
    { name: 'Electric Amber', bg: '#F59E0B', text: '#0B0F17' },
    { name: 'Obsidian Slate', bg: '#0B0F17', text: '#FFFFFF' },
    { name: 'Emerald Green', bg: '#059669', text: '#FFFFFF' },
    { name: 'Royal Indigo', bg: '#4F46E5', text: '#FFFFFF' },
    { name: 'Festive Crimson', bg: '#E11D48', text: '#FFFFFF' },
    { name: 'Cyber Gold', bg: '#EAB308', text: '#000000' },
  ];

  const quickPresets = [
    {
      label: '🔥 Festive 40% OFF',
      text: '🔥 Festive Mega Sale Live! Save up to 40% OFF with code FESTIVE2026',
      bg: '#F59E0B',
      textCol: '#0B0F17',
      coupon: 'FESTIVE2026',
      button: 'Claim 40% OFF',
      link: '/products',
    },
    {
      label: '🚚 Free Express Shipping',
      text: '⚡ Free Express Courier Delivery on all orders above ₹999 this weekend!',
      bg: '#059669',
      textCol: '#FFFFFF',
      coupon: 'FREESHIP',
      button: 'Shop Catalog',
      link: '/products',
    },
    {
      label: '⏰ Midnight Flash Deal',
      text: '⚡ Midnight Rush! Flat ₹500 instant discount on electronics & audio gear.',
      bg: '#E11D48',
      textCol: '#FFFFFF',
      coupon: 'FESTIVE500',
      button: 'Grab Flash Deal',
      link: '/category/electronics-audio',
    },
    {
      label: '✨ Welcome 20% Voucher',
      text: '🎁 New to AuraMarket? Enjoy flat 20% off on your first order with code AURAFIRST',
      bg: '#4F46E5',
      textCol: '#FFFFFF',
      coupon: 'AURAFIRST',
      button: 'Start Shopping',
      link: '/products',
    },
  ];

  const fetchAnnouncement = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ui/announcement');
      if (res.data?.success && res.data.data) {
        const d = res.data.data;
        setFormData({
          enabled: d.enabled !== undefined ? d.enabled : true,
          text: d.text || '🔥 Festive Sale Live! Get up to 40% OFF with code FESTIVE2026',
          bgColor: d.bgColor || '#F59E0B',
          textColor: d.textColor || '#0B0F17',
          couponCode: d.couponCode || 'FESTIVE2026',
          actionLink: d.actionLink || '/products',
          buttonText: d.buttonText || 'Shop Now',
          isDismissible: d.isDismissible !== undefined ? d.isDismissible : true,
          countdownEnd: d.countdownEnd ? new Date(d.countdownEnd).toISOString().slice(0, 16) : '',
        });
      }
    } catch (_) {
      // Local default state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncement();
  }, []);

  const showNotification = (text, isError = false) => {
    setActionMessage({ text, isError });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const applyColorPreset = (preset) => {
    setFormData((prev) => ({
      ...prev,
      bgColor: preset.bg,
      textColor: preset.text,
    }));
  };

  const applyQuickTemplate = (tpl) => {
    setFormData((prev) => ({
      ...prev,
      text: tpl.text,
      bgColor: tpl.bg,
      textColor: tpl.textCol,
      couponCode: tpl.coupon,
      buttonText: tpl.button,
      actionLink: tpl.link,
      enabled: true,
    }));
    showNotification(`Loaded template: "${tpl.label}"`);
  };

  const handleSetHoursCountdown = (hours) => {
    const target = new Date(Date.now() + hours * 3600000);
    setFormData((prev) => ({
      ...prev,
      countdownEnd: target.toISOString().slice(0, 16),
    }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!formData.text.trim()) {
      showNotification('Announcement text cannot be empty', true);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        countdownEnd: formData.countdownEnd ? new Date(formData.countdownEnd) : null,
      };

      const res = await api.put('/admin/announcement', payload);
      if (res.data?.success) {
        showNotification('📢 Top announcement bar updated successfully! Live on storefront.');
        if (onUpdate) onUpdate(res.data.data);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Error saving announcement settings', true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {actionMessage && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium shadow-lg transition-all animate-fade-in ${
            actionMessage.isError
              ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
          }`}
        >
          {actionMessage.isError ? (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <Check className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Header Banner Hub */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Dynamic Top Announcement Bar Controller
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                  Point #39
                </span>
              </h2>
              <p className="text-sm text-slate-400">
                Configure sticky announcement message, 1-click coupon pills, deal countdown timers, and color styling.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={fetchAnnouncement}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-sm flex items-center gap-2 transition-all border border-slate-700 disabled:opacity-50"
            title="Refresh settings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 stroke-[2.5]" />}
            Save & Publish Live
          </button>
        </div>
      </div>

      {/* Real-Time Live Preview Simulation Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
          <span className="flex items-center gap-1.5 text-amber-400">
            <Eye className="w-4 h-4" />
            Live Customer Storefront Simulation
          </span>
          <span className="text-[11px] font-mono">
            Status: {formData.enabled ? '🟢 Active & Visible' : '⚪ Disabled / Hidden'}
          </span>
        </div>

        {formData.enabled ? (
          <div
            style={{
              backgroundColor: formData.bgColor,
              color: formData.textColor,
            }}
            className="relative rounded-2xl px-4 py-3 text-xs font-semibold shadow-md transition-all flex flex-col sm:flex-row items-center justify-between gap-3 border border-black/10"
          >
            <div className="flex items-center gap-2 text-center sm:text-left flex-wrap justify-center sm:justify-start">
              <span className="p-1 rounded-full bg-black/10 flex items-center justify-center">
                <Flame className="w-3.5 h-3.5 fill-current" />
              </span>
              <span className="font-bold">{formData.text || 'Enter announcement headline...'}</span>

              {formData.countdownEnd && (
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/15 text-[11px] font-mono font-bold tracking-wider">
                  <Clock className="w-3 h-3" />
                  <span>Ends in: 11:59:42</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-center sm:justify-end">
              {formData.couponCode && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/20 text-[11px] font-mono font-extrabold border border-black/10">
                  <Tag className="w-3 h-3" />
                  <span>{formData.couponCode}</span>
                  <Copy className="w-3 h-3 opacity-70" />
                </span>
              )}

              {formData.buttonText && formData.actionLink && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-black text-white font-bold text-[11px] shadow-sm">
                  <span>{formData.buttonText}</span>
                  <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                </span>
              )}

              {formData.isDismissible && (
                <span className="p-1 rounded-full opacity-60">
                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-4 text-center text-xs text-slate-500 font-medium">
            Announcement Bar is currently toggled OFF. Enable it below to show on the storefront.
          </div>
        )}
      </div>

      {/* 1-Click Campaign Templates Chips */}
      <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            1-Click Ready Campaign Templates
          </h3>
          <span className="text-[11px] text-slate-400">Click any preset to instant-fill the form</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          {quickPresets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyQuickTemplate(preset)}
              className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-left transition-all border border-slate-700/80 hover:border-amber-500/40 group space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                  {preset.label}
                </span>
                <span
                  style={{ backgroundColor: preset.bg }}
                  className="w-3 h-3 rounded-full border border-white/20"
                />
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-1">{preset.text}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Content & Controls (2 cols) */}
        <div className="lg:col-span-2 space-y-5 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            Message & Campaign Details
          </h3>

          {/* Master Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <p className="text-sm font-bold text-white">Enable Announcement Bar</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Display this promotional ticker at the very top of Customer Storefront
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* Announcement Message */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Announcement Message <span className="text-amber-500">*</span>
            </label>
            <textarea
              rows="2"
              required
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              placeholder="e.g. 🔥 Festive Sale Live! Get up to 40% OFF with code FESTIVE2026"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 placeholder-slate-500 font-medium"
            />
          </div>

          {/* 1-Click Coupon Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Promo / Coupon Code (1-Click Copy Pill)
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.couponCode}
                  onChange={(e) => setFormData({ ...formData, couponCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. FESTIVE2026"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-amber-500 placeholder-slate-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Leave empty to omit the coupon pill</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Action Button Text
              </label>
              <input
                type="text"
                value={formData.buttonText}
                onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                placeholder="e.g. Shop Now, Claim Code"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 placeholder-slate-500"
              />
            </div>
          </div>

          {/* Action Link & Dismissible */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Target Route / Link URL
              </label>
              <div className="relative">
                <LinkIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.actionLink}
                  onChange={(e) => setFormData({ ...formData, actionLink: e.target.value })}
                  placeholder="e.g. /products, /category/electronics-audio"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 placeholder-slate-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 mt-auto">
              <div>
                <p className="text-xs font-semibold text-white">Dismissible by Customer</p>
                <p className="text-[11px] text-slate-400">Allow closing with 'X' button</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isDismissible}
                  onChange={(e) => setFormData({ ...formData, isDismissible: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>

          {/* Deal Countdown Expiry Timer */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">Urgency Deal Countdown Timer (Optional)</span>
              </div>
              {formData.countdownEnd && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, countdownEnd: '' })}
                  className="text-[11px] font-semibold text-rose-400 hover:underline"
                >
                  Clear Timer
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="datetime-local"
                value={formData.countdownEnd}
                onChange={(e) => setFormData({ ...formData, countdownEnd: e.target.value })}
                className="w-full sm:w-auto bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400">Quick set:</span>
                {[6, 12, 24, 48].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleSetHoursCountdown(h)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] font-semibold text-slate-300 border border-slate-800"
                  >
                    +{h}h
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Styling & Themes (1 col) */}
        <div className="space-y-5 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <Palette className="w-4 h-4 text-amber-400" />
            Color Theme & Styling
          </h3>

          {/* Preset Palettes */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              One-Click Palette Presets
            </label>
            <div className="grid grid-cols-2 gap-2">
              {colorPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyColorPreset(preset)}
                  className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                    formData.bgColor.toLowerCase() === preset.bg.toLowerCase()
                      ? 'border-amber-500 ring-2 ring-amber-500/20 bg-slate-800'
                      : 'border-slate-800 bg-slate-950 hover:bg-slate-850'
                  }`}
                >
                  <span className="text-xs font-semibold text-white">{preset.name}</span>
                  <div className="flex items-center gap-1">
                    <span
                      style={{ backgroundColor: preset.bg }}
                      className="w-3.5 h-3.5 rounded-full border border-white/20"
                    />
                    <span
                      style={{ backgroundColor: preset.text }}
                      className="w-3.5 h-3.5 rounded-full border border-white/20"
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Hex Inputs */}
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Custom Background Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.bgColor}
                  onChange={(e) => setFormData({ ...formData, bgColor: e.target.value })}
                  className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={formData.bgColor}
                  onChange={(e) => setFormData({ ...formData, bgColor: e.target.value })}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500 uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Custom Text Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.textColor}
                  onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                  className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={formData.textColor}
                  onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500 uppercase"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 stroke-[2.5]" />}
              <span>Save & Publish Live</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
