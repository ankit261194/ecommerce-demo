import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Search,
  MessageCircleQuestion,
  ThumbsUp,
  CheckCircle2,
  ShieldCheck,
  Send,
  Plus,
  X,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

/**
 * Product Customer Q&A Module (Point #16)
 * Searchable public customer questions, verified vendor answers, upvotes, and question submission.
 */
export default function ProductQnASection({ productId, productTitle }) {
  const [questions, setQuestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAsking, setIsAsking] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [askedByName, setAskedByName] = useState('');
  const [isSubmittingQ, setIsSubmittingQ] = useState(false);
  const [submittingSuccess, setSubmittingSuccess] = useState(false);
  const [upvotedQuestions, setUpvotedQuestions] = useState({});

  // Answering a specific question state
  const [answeringQuestionId, setAnsweringQuestionId] = useState(null);
  const [answerText, setAnswerText] = useState('');
  const [answeredByName, setAnsweredByName] = useState('');
  const [isSubmittingAns, setIsSubmittingAns] = useState(false);

  // Fetch questions from API
  useEffect(() => {
    let isMounted = true;
    const fetchQuestions = async () => {
      try {
        const queryParam = searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : '';
        const res = await fetch(`/api/questions/product/${productId}${queryParam}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success) {
            setQuestions(data.data || []);
          }
        }
      } catch (err) {
        console.warn('Q&A API fetch fallback:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (productId) {
      fetchQuestions();
    }
    return () => {
      isMounted = false;
    };
  }, [productId, searchQuery]);

  // Handle Question Upvote
  const handleUpvoteQuestion = async qId => {
    if (upvotedQuestions[qId]) return;

    setUpvotedQuestions(prev => ({ ...prev, [qId]: true }));
    setQuestions(prev =>
      prev.map(q => (q._id === qId ? { ...q, upvotes: (q.upvotes || 0) + 1 } : q))
    );

    try {
      await fetch(`/api/questions/${qId}/upvote`, { method: 'POST' });
    } catch (err) {
      console.warn('Upvote failed:', err);
    }
  };

  // Handle Submit Question
  const handleSubmitQuestion = async e => {
    e.preventDefault();
    if (!questionText.trim()) return;

    setIsSubmittingQ(true);
    try {
      const res = await fetch(`/api/questions/product/${productId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questionText.trim(),
          askedBy: askedByName.trim() || 'Verified Shopper',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setQuestions(prev => [data.data, ...prev]);
          setSubmittingSuccess(true);
          setTimeout(() => {
            setSubmittingSuccess(false);
            setIsAsking(false);
            setQuestionText('');
            setAskedByName('');
          }, 1800);
        }
      }
    } catch (err) {
      console.error('Submit question failed:', err);
    } finally {
      setIsSubmittingQ(false);
    }
  };

  // Handle Submit Answer
  const handleSubmitAnswer = async (e, qId) => {
    e.preventDefault();
    if (!answerText.trim()) return;

    setIsSubmittingAns(true);
    try {
      const res = await fetch(`/api/questions/${qId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer: answerText.trim(),
          answeredBy: answeredByName.trim() || 'Verified Buyer',
          isVendor: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setQuestions(prev =>
            prev.map(q => {
              if (q._id === qId) {
                const updatedAns = [
                  ...(q.answers || []),
                  {
                    answer: answerText.trim(),
                    answeredBy: answeredByName.trim() || 'Verified Buyer',
                    isOfficial: false,
                    isVendor: false,
                    answeredAt: new Date(),
                  },
                ];
                return { ...q, answers: updatedAns };
              }
              return q;
            })
          );
          setAnsweringQuestionId(null);
          setAnswerText('');
          setAnsweredByName('');
        }
      }
    } catch (err) {
      console.error('Answer failed:', err);
    } finally {
      setIsSubmittingAns(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-500" />
            Customer Questions & Answers
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Search answers from official verified merchants and past buyers
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAsking(prev => !prev)}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <MessageCircleQuestion className="w-3.5 h-3.5" />
          <span>{isAsking ? 'Cancel' : 'Ask a Question'}</span>
        </button>
      </div>

      {/* Live Search Input Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Have a question? Search for answers, warranty, specs, compatibility..."
          className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-xs font-semibold focus:ring-2 focus:ring-amber-400 focus:outline-hidden shadow-xs"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700 text-xs font-bold"
          >
            ✕
          </button>
        )}
      </div>

      {/* Ask Question Form */}
      {isAsking && (
        <form
          onSubmit={handleSubmitQuestion}
          className="p-5 rounded-2xl bg-amber-50/80 border-2 border-amber-300 shadow-md space-y-3.5 animate-scale-up"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-black text-xs text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Ask About {productTitle}
            </h4>
            <button
              type="button"
              onClick={() => setIsAsking(false)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <textarea
              required
              rows={2}
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              placeholder="e.g. Does this support Bluetooth 5.3 and fast charging? What is inside the box?"
              className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold focus:ring-2 focus:ring-amber-400 focus:outline-hidden resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <input
              type="text"
              value={askedByName}
              onChange={e => setAskedByName(e.target.value)}
              placeholder="Your Name (e.g. Vikram Malhotra)"
              className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold sm:w-64 focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
            />

            <button
              type="submit"
              disabled={isSubmittingQ}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmittingQ ? (
                <span>Submitting...</span>
              ) : submittingSuccess ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Question Posted!
                </span>
              ) : (
                <>
                  <Send className="w-3 h-3" />
                  <span>Post Question</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Questions & Answers List */}
      <div className="space-y-4">
        {questions.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs space-y-2">
            <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-extrabold text-slate-700">No questions found matching your search</p>
            <p className="text-[11px] text-slate-400">
              Be the first person to ask a question about this item!
            </p>
          </div>
        ) : (
          questions.map(q => {
            const hasUpvoted = upvotedQuestions[q._id];
            const isAnsweringThis = answeringQuestionId === q._id;

            return (
              <div
                key={q._id}
                className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3"
              >
                {/* Question line */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-900 font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      Q:
                    </span>
                    <div>
                      <h4 className="font-black text-sm text-slate-900 leading-snug">
                        {q.question}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        Asked by {q.askedBy || 'Shopper'}
                      </p>
                    </div>
                  </div>

                  {/* Upvote Button */}
                  <button
                    type="button"
                    onClick={() => handleUpvoteQuestion(q._id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all flex-shrink-0 cursor-pointer ${
                      hasUpvoted
                        ? 'bg-amber-50 border-amber-300 text-amber-900 font-black'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <ThumbsUp
                      className={`w-3 h-3 ${hasUpvoted ? 'fill-amber-500 text-amber-600' : ''}`}
                    />
                    <span>{q.upvotes || 0}</span>
                  </button>
                </div>

                {/* Answers List */}
                <div className="space-y-2.5 pl-2 sm:pl-3 border-l-2 border-slate-100">
                  {q.answers && q.answers.length > 0 ? (
                    q.answers.map((ans, aIdx) => (
                      <div key={aIdx} className="space-y-1">
                        <div className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 font-black text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                            A:
                          </span>
                          <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                            {ans.answer}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 pl-7 text-[10px] text-slate-400 font-medium">
                          <span className="font-bold text-slate-700">{ans.answeredBy}</span>
                          {ans.isOfficial && (
                            <span className="inline-flex items-center gap-0.5 text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-black">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                              Official Verified
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic pl-8">
                      No answers yet. Merchant will review and respond soon.
                    </p>
                  )}
                </div>

                {/* Answer trigger or input form */}
                <div className="pt-1 flex items-center justify-between text-xs">
                  {!isAnsweringThis ? (
                    <button
                      type="button"
                      onClick={() => setAnsweringQuestionId(q._id)}
                      className="text-amber-600 hover:text-amber-700 font-black text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Post Answer</span>
                    </button>
                  ) : (
                    <form
                      onSubmit={e => handleSubmitAnswer(e, q._id)}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 mt-2"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span>Write Your Answer:</span>
                        <button
                          type="button"
                          onClick={() => setAnsweringQuestionId(null)}
                          className="text-slate-400 hover:text-slate-700 text-[11px]"
                        >
                          ✕ Cancel
                        </button>
                      </div>
                      <textarea
                        required
                        rows={2}
                        value={answerText}
                        onChange={e => setAnswerText(e.target.value)}
                        placeholder="Provide accurate, helpful details about this product..."
                        className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold focus:ring-2 focus:ring-amber-400 focus:outline-hidden resize-none"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={answeredByName}
                          onChange={e => setAnsweredByName(e.target.value)}
                          placeholder="Your Name / Store Name"
                          className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                        />
                        <button
                          type="submit"
                          disabled={isSubmittingAns}
                          className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-black text-xs hover:bg-slate-800 disabled:opacity-50"
                        >
                          {isSubmittingAns ? 'Posting...' : 'Submit Answer'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
