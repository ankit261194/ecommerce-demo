import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  X,
  CheckCheck,
  Truck,
  ShoppingBag,
  Tag,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Volume2,
  VolumeX,
  ExternalLink,
  Sparkles,
  Zap,
  Clock,
  ChevronRight,
} from 'lucide-react';
import api from '../api/client';

// Synthesize pleasant bell notification chime using standard Web Audio API
export const playNotificationChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;
    
    // Primary Tone (A5 - 880 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    // Harmonic Overtone (E6 - 1318.5 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1318.5, now + 0.08);
    gain2.gain.setValueAtTime(0.1, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.7);
  } catch (_) {
    // Audio context may be restricted by autoplay policy before first gesture
  }
};

export default function NotificationCenterModal({
  isOpen,
  onClose,
  onTrackOrder = null,
  onOpenOffers = null,
}) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'UNREAD' | 'ORDERS' | 'OFFERS'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [simulating, setSimulating] = useState(false);

  // Restore sound preference from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('auramarket_notif_sound');
      if (stored !== null) setSoundEnabled(stored === 'true');
    } catch (_) {}
  }, []);

  const toggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    try {
      localStorage.setItem('auramarket_notif_sound', String(nextVal));
    } catch (_) {}
    if (nextVal) playNotificationChime();
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      if (res.data?.success) {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Could not fetch notifications:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.put(`/notifications/${id}/read`);
      if (res.data?.success) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      console.warn('Mark read error:', err.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await api.put('/notifications/mark-all-read');
      if (res.data?.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.warn('Mark all read error:', err.message);
    }
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.delete(`/notifications/${id}`);
      if (res.data?.success) {
        setNotifications((prev) => prev.filter((n) => n._id !== id));
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      console.warn('Delete notification error:', err.message);
    }
  };

  const handleSimulateAlert = async () => {
    try {
      setSimulating(true);
      const sampleEvents = [
        {
          title: '🚚 Order Out for Delivery!',
          message: 'Express rider Rajesh is arriving in ~25 minutes with your package. Have delivery OTP handy.',
          type: 'OUT_FOR_DELIVERY',
          orderNumber: 'ORD-EXPRESS-2026',
        },
        {
          title: '⚡ Price Drop Alert!',
          message: 'Aura Studio Wireless ANC Headphones dropped by ₹1,500! Buy now before stock runs out.',
          type: 'PRICE_DROP',
          orderNumber: '',
        },
        {
          title: '🎉 Cash on Delivery Order Delivered',
          message: 'Payment of ₹2,499 collected successfully. Your digital tax invoice is ready for download.',
          type: 'ORDER_DELIVERED',
          orderNumber: 'ORD-COMP-8832',
        },
      ];

      const pick = sampleEvents[Math.floor(Math.random() * sampleEvents.length)];
      const res = await api.post('/notifications/simulate', pick);
      if (res.data?.success) {
        setNotifications((prev) => [res.data.data, ...prev]);
        setUnreadCount(res.data.unreadCount);
        if (soundEnabled) playNotificationChime();
      }
    } catch (err) {
      console.warn('Simulate alert error:', err.message);
    } finally {
      setSimulating(false);
    }
  };

  if (!isOpen) return null;

  // Filtered list
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'UNREAD') return !n.isRead;
    if (activeTab === 'ORDERS') {
      return [
        'ORDER_PLACED',
        'ORDER_CONFIRMED',
        'ORDER_SHIPPED',
        'OUT_FOR_DELIVERY',
        'ORDER_DELIVERED',
        'ORDER_CANCELLED',
      ].includes(n.type);
    }
    if (activeTab === 'OFFERS') {
      return ['COUPON', 'PRICE_DROP', 'PROMOTION'].includes(n.type);
    }
    return true;
  });

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'OUT_FOR_DELIVERY':
      case 'ORDER_SHIPPED':
        return <Truck className="w-4 h-4 text-amber-400" />;
      case 'ORDER_DELIVERED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'ORDER_PLACED':
      case 'ORDER_CONFIRMED':
        return <ShoppingBag className="w-4 h-4 text-blue-400" />;
      case 'PRICE_DROP':
      case 'COUPON':
      case 'PROMOTION':
        return <Tag className="w-4 h-4 text-purple-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-amber-400" />;
    }
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Recent';
    const now = new Date();
    const past = new Date(dateString);
    const diffSec = Math.floor((now - past) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex justify-end">
      <div
        className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Notification Center</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30 font-semibold">
                    {unreadCount} Unread
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">Order tracking & real-time alerts</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleSound}
              title={soundEnabled ? 'Mute Sound Alerts' : 'Enable Sound Alerts'}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-amber-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action bar & Simulation trigger */}
        <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={handleSimulateAlert}
            disabled={simulating}
            className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 transition disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3" />
            <span>{simulating ? 'Triggering...' : 'Simulate Live Alert 🔔'}</span>
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-[11px] font-medium text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="px-4 pt-2 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'UNREAD', label: `Unread (${unreadCount})` },
            { id: 'ORDERS', label: 'Orders' },
            { id: 'OFFERS', label: 'Offers' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2 text-xs font-bold transition border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              Loading live alerts...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 rounded-full bg-slate-800/60 text-slate-500 mx-auto flex items-center justify-center mb-3">
                <Bell className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-bold text-slate-300">No Notifications Yet</h4>
              <p className="text-[11px] text-slate-500 mt-1 max-w-[240px] mx-auto">
                {activeTab === 'UNREAD'
                  ? 'You have read all your notifications! Nice and clean.'
                  : 'Orders, courier handovers, and price drop alerts will appear right here in real time.'}
              </p>
              <button
                type="button"
                onClick={handleSimulateAlert}
                className="mt-4 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold rounded-xl hover:bg-amber-500/20 transition"
              >
                Send Test Notification
              </button>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif._id}
                onClick={() => !notif.isRead && handleMarkAsRead(notif._id)}
                className={`p-3.5 rounded-2xl border transition relative group cursor-pointer ${
                  notif.isRead
                    ? 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
                    : 'bg-slate-800/70 border-amber-500/40 text-slate-200 shadow-sm ring-1 ring-amber-500/20 hover:border-amber-400'
                }`}
              >
                {/* Unread dot */}
                {!notif.isRead && (
                  <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-amber-400 shadow-sm" />
                )}

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4
                        className={`text-xs font-bold truncate ${
                          notif.isRead ? 'text-slate-300' : 'text-slate-100'
                        }`}
                      >
                        {notif.title}
                      </h4>
                      {notif.orderNumber && (
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-950 text-amber-400 border border-slate-800">
                          {notif.orderNumber}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(notif.createdAt)}
                      </span>

                      <div className="flex items-center gap-2">
                        {notif.orderNumber && onTrackOrder && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTrackOrder(notif.orderNumber);
                              onClose();
                            }}
                            className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-0.5 underline"
                          >
                            <span>Track</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleDelete(notif._id, e)}
                          title="Delete alert"
                          className="text-slate-600 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
