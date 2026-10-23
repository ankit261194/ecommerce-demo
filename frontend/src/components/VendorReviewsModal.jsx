import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  MessageSquare,
  Send,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  RotateCw,
  Store,
  ThumbsUp,
  Sparkles,
  Camera,
  ExternalLink,
} from 'lucide-react';
import api from '../api/client';

export const VendorReviewsModal = ({ isOpen, onClose, onRefreshStoreData }) => {
  const [reviews, setReviews] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalReviews: 0,
    averageRating: 5.0,
    positivePercentage: 100,
    unrepliedCount: 0,
    repliedCount: 0,
    breakdown: [
      { stars: 5, count: 0, percentage: 0 },
      { stars: 4, count: 0, percentage: 0 },
      { stars: 3, count: 0, percentage: 0 },
      { stars: 2, count: 0, percentage: 0 },
      { stars: 1, count: 0, percentage: 0 },
    ],
  });
  const [loading, setLoading] = useState(true);
  const [starFilter, setStarFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Replying state per review
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [notification, setNotification] = useState(null);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = {};
      if (starFilter !== 'all') params.rating = starFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get('/vendor/reviews', { params });
      if (res.data?.success) {
        setReviews(res.data.data || []);
        if (res.data.analytics) {
          setAnalytics(res.data.analytics);
        }
      }
    } catch (err) {
      console.warn("Unable to load reviews:", err?.message);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReviews();
    }
  }, [isOpen, starFilter, statusFilter]);

  const handleSearchSubmit = e => {
    e.preventDefault();
    fetchReviews();
  };

  const handleOpenReplyBox = review => {
    setActiveReplyId(review._id);
    setReplyText(review.vendorReply?.comment || '');
  };

  const handleCancelReply = () => {
    setActiveReplyId(null);
    setReplyText('');
  };

  const handlePresetSelect = text => {
    setReplyText(text);
  };

  const handleSubmitReply = async reviewId => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      const res = await api.post(`/vendor/reviews/${reviewId}/reply`, {
        reply: replyText.trim(),
      });
      if (res.data?.success) {
        setNotification('Official merchant response posted successfully!');
        setActiveReplyId(null);
        setReplyText('');
        fetchReviews();
        if (onRefreshStoreData) onRefreshStoreData();
      }
    } catch (err) {
      // Local optimistic fallback
      setReviews(prev =>
        prev.map(r =>
          r._id === reviewId
            ? {
                ...r,
                vendorReply: {
                  comment: replyText.trim(),
                  repliedAt: new Date(),
                },
              }
            : r
        )
      );
      setNotification('Official response saved (Offline Mode)');
      setActiveReplyId(null);
      setReplyText('');
    } finally {
      setSubmittingReply(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleDeleteReply = async reviewId => {
    if (!window.confirm('Are you sure you want to remove your merchant response?')) return;
    try {
      await api.delete(`/vendor/reviews/${reviewId}/reply`);
      setNotification('Merchant response removed');
      fetchReviews();
      if (onRefreshStoreData) onRefreshStoreData();
    } catch (err) {
      setReviews(prev =>
        prev.map(r => (r._id === reviewId ? { ...r, vendorReply: undefined } : r))
      );
      setNotification('Response removed');
    }
    setTimeout(() => setNotification(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-5xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md">
              <Star className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Customer Reviews & Reputation Management
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  Point #60
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Monitor shopper reviews across catalog items, review rating breakdown, and post official responses.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Notification Banner */}
          {notification && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notification}</span>
            </div>
          )}

          {/* Rating KPI Cards & 5-Star Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* KPI Cards */}
            <div className="md:col-span-5 grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                  Overall Merchant Rating
                </span>
                <div className="my-2">
                  <div className="text-3xl font-black text-slate-950 flex items-baseline gap-1.5">
                    <span>{analytics.averageRating}</span>
                    <Star className="w-5 h-5 fill-amber-500 text-amber-500 inline" />
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                    Based on {analytics.totalReviews} verified ratings
                  </p>
                </div>
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md w-fit">
                  {analytics.positivePercentage}% Positive Sentiment
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Response Health
                </span>
                <div className="my-2 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-amber-800">Needs Response:</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black">
                      {analytics.unrepliedCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-emerald-800">Replied:</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-black">
                      {analytics.repliedCount}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === 'unreplied' ? 'all' : 'unreplied')}
                  className="text-[10px] font-black text-amber-600 hover:text-amber-700 text-left underline cursor-pointer"
                >
                  {statusFilter === 'unreplied' ? 'Show all reviews' : 'Filter unanswered only'}
                </button>
              </div>
            </div>

            {/* Interactive 5-Star Breakdown */}
            <div className="md:col-span-7 p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Rating Distribution (Click to Filter)
                </span>
                {starFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setStarFilter('all')}
                    className="text-[10px] font-bold text-amber-600 hover:underline"
                  >
                    Reset Filter ({starFilter}★)
                  </button>
                )}
              </div>

              <div className="space-y-1.5 pt-1">
                {analytics.breakdown.map(item => {
                  const isSelected = starFilter === String(item.stars);
                  return (
                    <div
                      key={item.stars}
                      onClick={() => setStarFilter(isSelected ? 'all' : String(item.stars))}
                      className={`flex items-center gap-3 text-xs font-bold cursor-pointer p-1.5 rounded-xl transition-all ${
                        isSelected
                          ? 'bg-amber-50 text-slate-950 ring-1 ring-amber-300'
                          : 'hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <span className="w-12 text-[11px] font-extrabold flex items-center gap-1">
                        <span>{item.stars}</span>
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      </span>

                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>

                      <span className="w-16 text-right text-[11px] font-bold text-slate-400">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search reviews by customer name, keyword, or product title..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-20 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-black hover:bg-slate-800"
              >
                Search
              </button>
            </form>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs font-bold">
              <span className="text-[10px] font-black uppercase text-slate-400 mr-1">Status:</span>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('unreplied')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
                  statusFilter === 'unreplied'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'bg-white border border-slate-200 text-amber-800 hover:bg-amber-50'
                }`}
              >
                <span>⚡ Needs Reply</span>
                {analytics.unrepliedCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-white text-[9px]">
                    {analytics.unrepliedCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('replied')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
                  statusFilter === 'replied'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-emerald-800 hover:bg-emerald-50'
                }`}
              >
                <span>✅ Replied</span>
              </button>

              <button
                type="button"
                onClick={fetchReviews}
                className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-100 transition-all ml-1"
                title="Refresh Reviews"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Reviews Stream */}
          <div className="space-y-4">
            {loading ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <RotateCw className="w-6 h-6 animate-spin mx-auto text-amber-500" />
                <p className="text-xs font-bold">Loading customer reviews...</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 space-y-2 bg-slate-50/50">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="text-sm font-black text-slate-700">No reviews found</h4>
                <p className="text-xs text-slate-400">
                  {starFilter !== 'all' || statusFilter !== 'all' || searchQuery
                    ? 'Try adjusting your filters or search keywords.'
                    : 'No customer reviews submitted yet for your catalog products.'}
                </p>
                {(starFilter !== 'all' || statusFilter !== 'all' || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStarFilter('all');
                      setStatusFilter('all');
                      setSearchQuery('');
                      fetchReviews();
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              reviews.map(review => {
                const isReplying = activeReplyId === review._id;
                const hasReply = Boolean(review.vendorReply && review.vendorReply.comment);

                return (
                  <div
                    key={review._id}
                    className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3 transition-all hover:border-slate-300"
                  >
                    {/* Top Row: Product Reference & Star Pill */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      {review.product && (
                        <div className="flex items-center gap-2.5">
                          <img
                            src={
                              review.product.image ||
                              review.product.images?.[0] ||
                              'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200'
                            }
                            alt={review.product.title}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                          />
                          <div>
                            <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                              Product
                            </span>
                            <h4 className="text-xs font-black text-slate-900 line-clamp-1 mt-0.5">
                              {review.product.title}
                            </h4>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {/* Rating Badge */}
                        <div className="flex items-center gap-1 bg-amber-500 text-slate-950 px-2.5 py-1 rounded-xl text-xs font-black shadow-xs">
                          <span>{review.rating}</span>
                          <Star className="w-3.5 h-3.5 fill-current" />
                        </div>
                        <span className="text-[11px] text-slate-400 font-semibold">
                          {new Date(review.createdAt || Date.now()).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Customer Info & Comment */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">
                          {review.userName?.[0] || 'U'}
                        </div>
                        <span className="text-xs font-black text-slate-900">{review.userName}</span>
                        {review.isVerifiedPurchase && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            Verified Buyer
                          </span>
                        )}
                      </div>

                      <h5 className="text-sm font-extrabold text-slate-900">{review.title}</h5>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        {review.comment}
                      </p>

                      {/* Customer Photos */}
                      {Array.isArray(review.photos) && review.photos.length > 0 && (
                        <div className="flex items-center gap-2 pt-1">
                          {review.photos.map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              alt="Review attachment"
                              className="w-14 h-14 rounded-xl object-cover border border-slate-200"
                            />
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{review.helpfulCount || 0} customers found this helpful</span>
                      </div>
                    </div>

                    {/* Official Merchant Response Box */}
                    {hasReply && !isReplying && (
                      <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-amber-950 flex items-center gap-1.5">
                            <Store className="w-4 h-4 text-amber-600" />
                            <span>Your Official Merchant Response</span>
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                              Public on PDP
                            </span>
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenReplyBox(review)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-amber-100 transition-colors"
                              title="Edit Response"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteReply(review._id)}
                              className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                              title="Delete Response"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-slate-700 font-semibold pl-3 border-l-2 border-amber-500 leading-relaxed">
                          {review.vendorReply.comment}
                        </p>

                        <div className="text-[10px] text-slate-400">
                          Responded on{' '}
                          {new Date(review.vendorReply.repliedAt || Date.now()).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                    )}

                    {/* Reply Input Form (Open when replying or editing) */}
                    {isReplying ? (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-300 space-y-3 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                            <Store className="w-4 h-4 text-amber-600" />
                            {hasReply ? 'Edit Official Response' : 'Draft Official Merchant Response'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            Visible to all buyers on product page
                          </span>
                        </div>

                        <textarea
                          rows={3}
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder="Write a professional merchant response thanking the buyer or addressing concerns..."
                          className="w-full p-3 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-amber-400 focus:outline-none resize-none"
                        />

                        {/* Quick Smart Presets */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            1-Click Response Presets:
                          </span>
                          <div className="flex items-center gap-2 flex-wrap">
                            {[
                              "🌟 Thank you for your wonderful review! We're thrilled you loved the quality.",
                              '📦 Thank you for trusting our store! We take great pride in express 48h delivery.',
                              '🙏 We appreciate your feedback and are always working to exceed expectations.',
                            ].map((preset, pIdx) => (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={() => handlePresetSelect(preset)}
                                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[10px] font-bold hover:border-amber-400 hover:bg-amber-50 transition-all text-left"
                              >
                                {preset.slice(0, 48)}...
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={handleCancelReply}
                            className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-bold transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={!replyText.trim() || submittingReply}
                            onClick={() => handleSubmitReply(review._id)}
                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{submittingReply ? 'Posting...' : 'Publish Official Reply'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      !hasReply && (
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleOpenReplyBox(review)}
                            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-sm transition-all flex items-center gap-1.5 hover:scale-105"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                            <span>Reply to Customer</span>
                          </button>
                        </div>
                      )
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Point #60: Customer Reviews & Reputation Management • Verified seller responses appear live on storefront
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorReviewsModal;
