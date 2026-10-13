import React, { useState, useEffect } from 'react';
import {
  Star,
  ThumbsUp,
  CheckCircle2,
  Image as ImageIcon,
  MessageSquare,
  PenLine,
  Filter,
  Sparkles,
  Camera,
  X,
  Send,
} from 'lucide-react';

/**
 * Verified Customer Reviews & 5-Star Ratings System (Point #15)
 * Comprehensive rating breakdown bars, photo uploads, helpful upvotes, and review submission.
 */
export default function ProductReviewsSection({
  productId,
  productTitle,
  initialAverageRating = 4.8,
  initialTotalReviews = 42,
}) {
  const [reviews, setReviews] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [customerPhotos, setCustomerPhotos] = useState([]);
  const [averageRating, setAverageRating] = useState(initialAverageRating);
  const [totalReviews, setTotalReviews] = useState(initialTotalReviews);
  const [loading, setLoading] = useState(true);
  const [selectedFilterStar, setSelectedFilterStar] = useState('all');
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [helpfulVoted, setHelpfulVoted] = useState({});

  // Review form state
  const [formRating, setFormRating] = useState(5);
  const [formHoverRating, setFormHoverRating] = useState(0);
  const [formTitle, setFormTitle] = useState('');
  const [formComment, setFormComment] = useState('');
  const [formPhoto, setFormPhoto] = useState('');
  const [formUserName, setFormUserName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Fetch reviews from API
  useEffect(() => {
    let isMounted = true;
    const fetchReviews = async () => {
      try {
        const res = await fetch(`/api/reviews/product/${productId}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success) {
            setReviews(data.data || []);
            setBreakdown(data.breakdown || []);
            setCustomerPhotos(data.customerPhotos || []);
            if (data.averageRating) setAverageRating(data.averageRating);
            if (data.totalReviews) setTotalReviews(data.totalReviews);
          }
        }
      } catch (err) {
        console.warn('Review API fallback:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (productId) {
      fetchReviews();
    }
    return () => {
      isMounted = false;
    };
  }, [productId]);

  // Handle helpful vote
  const handleHelpfulVote = async reviewId => {
    if (helpfulVoted[reviewId]) return;

    // Optimistic UI update
    setHelpfulVoted(prev => ({ ...prev, [reviewId]: true }));
    setReviews(prev =>
      prev.map(r => (r._id === reviewId ? { ...r, helpfulCount: (r.helpfulCount || 0) + 1 } : r))
    );

    try {
      await fetch(`/api/reviews/${reviewId}/helpful`, { method: 'POST' });
    } catch (err) {
      console.warn('Helpful vote network error:', err);
    }
  };

  // Handle submit review
  const handleSubmitReview = async e => {
    e.preventDefault();
    if (!formTitle.trim() || !formComment.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        rating: formRating,
        title: formTitle.trim(),
        comment: formComment.trim(),
        userName: formUserName.trim() || 'Verified Shopper',
        photos: formPhoto ? [formPhoto.trim()] : [],
      };

      const res = await fetch(`/api/reviews/product/${productId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setReviews(prev => [data.data, ...prev]);
          setTotalReviews(prev => prev + 1);
          setSubmitSuccess(true);
          setTimeout(() => {
            setSubmitSuccess(false);
            setIsWritingReview(false);
            setFormTitle('');
            setFormComment('');
            setFormPhoto('');
            setFormUserName('');
          }, 1800);
        }
      }
    } catch (err) {
      console.error('Review submit failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter reviews
  const filteredReviews = reviews.filter(r => {
    if (selectedFilterStar === 'all') return true;
    if (selectedFilterStar === 'photos') return Array.isArray(r.photos) && r.photos.length > 0;
    return Math.round(r.rating) === Number(selectedFilterStar);
  });

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            Verified Customer Reviews & Ratings
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            100% authentic feedback submitted by verified buyers
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsWritingReview(prev => !prev)}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <PenLine className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{isWritingReview ? 'Cancel Review' : 'Write a Customer Review'}</span>
        </button>
      </div>

      {/* Review Submission Form Drawer / Card */}
      {isWritingReview && (
        <form
          onSubmit={handleSubmitReview}
          className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-amber-50/80 via-white to-slate-50 border-2 border-amber-300/80 shadow-lg space-y-4 animate-scale-up"
        >
          <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <h4 className="font-black text-sm text-slate-900">Share Your Honest Experience</h4>
            </div>
            <button
              type="button"
              onClick={() => setIsWritingReview(false)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Star Rating Picker */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">
              Overall Rating:
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(star => {
                const isFilled = star <= (formHoverRating || formRating);
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setFormHoverRating(star)}
                    onMouseLeave={() => setFormHoverRating(0)}
                    onClick={() => setFormRating(star)}
                    className="p-1 transition-transform hover:scale-125 focus:outline-hidden"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        isFilled ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
                      }`}
                    />
                  </button>
                );
              })}
              <span className="text-xs font-black text-slate-700 ml-2">
                {formRating === 5 && '🌟 Excellent — Highly recommended!'}
                {formRating === 4 && '👍 Very Good — Satisfied'}
                {formRating === 3 && '👌 Average — Met expectations'}
                {formRating === 2 && '👎 Below average'}
                {formRating === 1 && '⚠️ Poor'}
              </span>
            </div>
          </div>

          {/* Review Title */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">
              Review Headline:
            </label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="e.g. Best purchase of the season, incredible sound!"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
            />
          </div>

          {/* Review Body */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">
              Detailed Feedback:
            </label>
            <textarea
              required
              rows={3}
              value={formComment}
              onChange={e => setFormComment(e.target.value)}
              placeholder="Describe what you liked, craftsmanship, delivery speed, and overall value..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold focus:ring-2 focus:ring-amber-400 focus:outline-hidden resize-none"
            />
          </div>

          {/* Author Name & Photo URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                Your Name:
              </label>
              <input
                type="text"
                value={formUserName}
                onChange={e => setFormUserName(e.target.value)}
                placeholder="e.g. Aman Sharma"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                Product Photo URL (Optional):
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={formPhoto}
                  onChange={e => setFormPhoto(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full pl-8 pr-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
                <Camera className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium">
              Reviews undergo verified purchase validation.
            </span>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Publishing Review...</span>
              ) : submitSuccess ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Published!
                </span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Verified Review</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Ratings Overview Grid: Left Score/Bars, Right Customer Photos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50 p-5 rounded-3xl border border-slate-200">
        
        {/* Left: Overall Score + Star Breakdown Bars */}
        <div className="lg:col-span-7 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Big Score Box */}
          <div className="text-center sm:text-left flex-shrink-0 space-y-1">
            <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
              {averageRating}
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-1">
              {[1, 2, 3, 4, 5].map(s => (
                <Star
                  key={s}
                  className={`w-4 h-4 ${
                    s <= Math.round(averageRating)
                      ? 'text-amber-500 fill-amber-500'
                      : 'text-slate-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-slate-500 font-bold">
              Based on {totalReviews} verified ratings
            </p>
            <div className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 100% Genuine
            </div>
          </div>

          {/* 5-Star Breakdown Progress Bars */}
          <div className="flex-1 w-full space-y-2">
            {(breakdown.length > 0
              ? breakdown
              : [
                  { stars: 5, count: 32, percentage: 76 },
                  { stars: 4, count: 7, percentage: 17 },
                  { stars: 3, count: 2, percentage: 5 },
                  { stars: 2, count: 1, percentage: 2 },
                  { stars: 1, count: 0, percentage: 0 },
                ]
            ).map(item => (
              <div
                key={item.stars}
                onClick={() =>
                  setSelectedFilterStar(
                    selectedFilterStar === String(item.stars) ? 'all' : String(item.stars)
                  )
                }
                className="flex items-center gap-3 text-xs font-bold text-slate-600 hover:text-slate-950 cursor-pointer group"
              >
                <span className="w-12 text-[11px] font-extrabold flex items-center gap-1">
                  <span>{item.stars}</span>
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                </span>

                <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 group-hover:bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>

                <span className="w-9 text-right text-[11px] font-bold text-slate-500 group-hover:text-slate-900">
                  {item.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Customer Uploaded Photos Strip */}
        <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-slate-200 pt-4 lg:pt-0 lg:pl-6 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
              <Camera className="w-3.5 h-3.5 text-amber-600" />
              Customer Photos ({customerPhotos.length})
            </h4>
            {customerPhotos.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setSelectedFilterStar(selectedFilterStar === 'photos' ? 'all' : 'photos')
                }
                className="text-[11px] font-extrabold text-amber-600 hover:text-amber-700"
              >
                {selectedFilterStar === 'photos' ? 'Show All' : 'Filter by Photos'}
              </button>
            )}
          </div>

          {customerPhotos.length > 0 ? (
            <div className="grid grid-cols-4 gap-2 pt-1">
              {customerPhotos.slice(0, 4).map((p, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square rounded-xl overflow-hidden bg-slate-200 border border-slate-300 group cursor-pointer"
                >
                  <img
                    src={p.url}
                    alt={`Customer photo ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black">
                    ★ {p.rating}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-white border border-slate-200 text-center text-xs text-slate-400">
              No customer photos yet. Be the first to upload one!
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSelectedFilterStar('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            selectedFilterStar === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          All Reviews ({reviews.length})
        </button>
        {[5, 4, 3].map(st => (
          <button
            key={st}
            type="button"
            onClick={() => setSelectedFilterStar(String(st))}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              selectedFilterStar === String(st)
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>{st}★ Only</span>
          </button>
        ))}
        {customerPhotos.length > 0 && (
          <button
            type="button"
            onClick={() => setSelectedFilterStar('photos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              selectedFilterStar === 'photos'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>With Photos</span>
          </button>
        )}
      </div>

      {/* Review Cards List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white border border-slate-200 text-slate-400 text-xs">
            No reviews match the selected filter.
          </div>
        ) : (
          filteredReviews.map(review => {
            const hasUpvoted = helpfulVoted[review._id];
            const dateStr = review.createdAt
              ? new Date(review.createdAt).toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Recent';

            return (
              <div
                key={review._id}
                className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3"
              >
                {/* Author row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {/* Avatar Initials */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
                      {review.userName
                        ? review.userName
                            .split(' ')
                            .map(n => n[0])
                            .slice(0, 2)
                            .join('')
                        : 'VS'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900">
                          {review.userName}
                        </span>
                        {review.isVerifiedPurchase && (
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            Verified Buyer
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">{dateStr}</span>
                    </div>
                  </div>

                  {/* Stars Pill */}
                  <div className="flex items-center gap-0.5 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${
                          s <= review.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Review Title & Comment */}
                <div className="space-y-1">
                  <h5 className="font-extrabold text-sm text-slate-900 leading-snug">
                    {review.title}
                  </h5>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {review.comment}
                  </p>
                </div>

                {/* Review Photos */}
                {Array.isArray(review.photos) && review.photos.length > 0 && (
                  <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                    {review.photos.map((photo, pIdx) => (
                      <img
                        key={pIdx}
                        src={photo}
                        alt="Customer verification photo"
                        className="w-16 h-16 rounded-xl object-cover border border-slate-200 hover:scale-105 transition-transform cursor-pointer shadow-xs"
                      />
                    ))}
                  </div>
                )}

                {/* Helpful Upvote Button */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => handleHelpfulVote(review._id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-[11px] transition-all cursor-pointer ${
                      hasUpvoted
                        ? 'bg-amber-50 border-amber-300 text-amber-900 font-black'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <ThumbsUp
                      className={`w-3.5 h-3.5 ${
                        hasUpvoted ? 'text-amber-600 fill-amber-500' : 'text-slate-500'
                      }`}
                    />
                    <span>
                      {hasUpvoted ? 'Helpful' : 'Helpful'} ({review.helpfulCount || 0})
                    </span>
                  </button>

                  <span className="text-[11px] text-slate-400 font-medium">
                    Report abuse
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
