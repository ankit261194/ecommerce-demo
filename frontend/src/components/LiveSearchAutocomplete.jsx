import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Clock,
  Flame,
  X,
  TrendingUp,
  Tag,
  Star,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Loader2,
  Mic,
  MicOff,
  Volume2,
  AlertCircle,
} from 'lucide-react';
import api from '../api/client';

export default function LiveSearchAutocomplete({
  searchQuery = '',
  setSearchQuery,
  onSelectProduct,
  onSelectCategory,
  onSelectBrand,
  placeholder = 'Search products, brands, smartphones, electronics...',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceError, setVoiceError] = useState(null);
  const recognitionRef = useRef(null);

  const [suggestions, setSuggestions] = useState({
    products: [],
    categories: [],
    brands: [],
    didYouMean: null,
    correctedQuery: null,
    trendingSearches: [
      'Wireless Headphones',
      'AMOLED Smartwatch',
      'Heavyweight Cotton Hoodie',
      'Nordic Desk Lamp',
      'Tailored Blazer',
    ],
  });

  // Recent Search History (persisted in localStorage)
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem('auramarket_recent_searches');
      return saved ? JSON.parse(saved) : ['Headphones', 'Smartwatch', 'Hoodie'];
    } catch {
      return ['Headphones', 'Smartwatch'];
    }
  });

  const wrapperRef = useRef(null);

  // Save search to history
  const saveSearchToHistory = term => {
    if (!term || !term.trim()) return;
    const clean = term.trim();
    setRecentSearches(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== clean.toLowerCase());
      const updated = [clean, ...filtered].slice(0, 8);
      try {
        localStorage.setItem('auramarket_recent_searches', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  const removeSearchHistoryItem = (term, e) => {
    e.stopPropagation();
    setRecentSearches(prev => {
      const updated = prev.filter(item => item !== term);
      try {
        localStorage.setItem('auramarket_recent_searches', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  const clearAllHistory = e => {
    e.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem('auramarket_recent_searches');
    } catch (_) {}
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = event => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch search suggestions with 180ms debounce
  useEffect(() => {
    if (!searchQuery || !searchQuery.trim()) {
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/products/search/suggestions?q=${encodeURIComponent(searchQuery)}`);
        if (res.data?.success) {
          setSuggestions({
            products: res.data.products || [],
            categories: res.data.categories || [],
            brands: res.data.brands || [],
            trendingSearches: res.data.trendingSearches || [],
            didYouMean: res.data.didYouMean || null,
            correctedQuery: res.data.correctedQuery || null,
          });
        }
      } catch (_) {
        // Fallback or offline graceful handling
      } finally {
        setIsLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Point 10: Storefront Voice Search (Microphone speech-to-text)
  const handleToggleVoiceSearch = e => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError(
        'Voice speech recognition is not supported in this browser. Please type or use Chrome / Edge / Safari.'
      );
      setTimeout(() => setVoiceError(null), 3800);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceError(null);
        setVoiceTranscript('Listening... Speak product, brand or category');
      };

      recognition.onresult = event => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setVoiceTranscript(transcript);
          setSearchQuery(transcript);
        }
      };

      recognition.onerror = event => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setVoiceError('Microphone permission was denied. Please allow microphone access in browser.');
        } else if (event.error !== 'no-speech') {
          setVoiceError(`Voice recognition: ${event.error}`);
        }
        setTimeout(() => setVoiceError(null), 3800);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (searchQuery && searchQuery.trim()) {
          saveSearchToHistory(searchQuery.trim());
          setIsOpen(true);
        }
      };

      recognition.start();
    } catch (err) {
      setIsListening(false);
      setVoiceError('Could not start microphone. Please check permissions.');
      setTimeout(() => setVoiceError(null), 3800);
    }
  };

  const handleSelectTerm = term => {
    setSearchQuery(term);
    saveSearchToHistory(term);
    setIsOpen(false);
  };

  const handleSubmit = e => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      saveSearchToHistory(searchQuery);
    }
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* Search Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center bg-white rounded-xl overflow-hidden shadow-sm border border-white/20 focus-within:ring-2 focus-within:ring-amber-400 focus-within:border-amber-400 transition-all"
      >
        <div className="hidden sm:flex items-center gap-1 px-3 py-2 bg-slate-100 text-slate-700 text-xs font-bold border-r border-slate-200 cursor-pointer flex-shrink-0 select-none">
          <span>All</span>
        </div>

        <input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onFocus={() => setIsOpen(true)}
          onChange={e => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={e => {
            if (e.key === 'Escape') setIsOpen(false);
          }}
          className="w-full px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none"
        />

        {/* Clear input button */}
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setIsOpen(true);
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors mr-0.5"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Point #10: Storefront Voice Search Microphone Button */}
        <button
          type="button"
          onClick={handleToggleVoiceSearch}
          className={`relative p-2 transition-all mr-1 rounded-lg flex items-center justify-center cursor-pointer ${
            isListening
              ? 'bg-rose-500 text-white animate-pulse shadow-md ring-2 ring-rose-400'
              : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
          }`}
          title={isListening ? 'Stop listening' : 'Search with Voice (Microphone)'}
        >
          {isListening ? (
            <>
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-400 animate-ping" />
              <Mic className="w-4 h-4 text-white" />
            </>
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </button>

        {/* Search Submit Button */}
        <button
          type="submit"
          className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2 sm:py-2.5 font-black flex items-center justify-center transition-colors shadow flex-shrink-0 cursor-pointer"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </button>
      </form>

      {/* 🎙️ Voice Search Listening Floating Banner / Waveform (Point #10) */}
      {isListening && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-amber-400/40 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg animate-pulse">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-black text-amber-400 tracking-tight flex items-center gap-1.5">
                  <span>Listening... Speak product, brand or category</span>
                </p>
                <p className="text-[11px] text-slate-300 font-medium truncate max-w-[280px] sm:max-w-md">
                  "{voiceTranscript || 'Say something like: Wireless Headphones'}"
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (recognitionRef.current) recognitionRef.current.stop();
                setIsListening(false);
              }}
              className="text-xs font-bold text-slate-400 hover:text-white bg-slate-800 px-2.5 py-1 rounded-xl transition-all"
            >
              Cancel
            </button>
          </div>

          {/* Animated sound wave bars */}
          <div className="flex items-center justify-center gap-1.5 py-3">
            {[14, 28, 42, 20, 36, 12, 30, 18].map((h, i) => (
              <span
                key={i}
                className="w-1.5 bg-gradient-to-t from-amber-500 to-rose-400 rounded-full animate-bounce"
                style={{
                  height: `${h}px`,
                  animationDelay: `${i * 120}ms`,
                  animationDuration: '650ms',
                }}
              />
            ))}
          </div>

          {/* Quick Voice Demo Simulation Pills (In case mic is muted or testing) */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="text-slate-400 font-bold">Try saying:</span>
            {['Wireless Headphones', 'AMOLED Smartwatch', 'Heavyweight Hoodie', 'Nordic Lamp'].map(prompt => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  setSearchQuery(prompt);
                  saveSearchToHistory(prompt);
                  if (recognitionRef.current) recognitionRef.current.stop();
                  setIsListening(false);
                  setIsOpen(true);
                }}
                className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-slate-300 font-bold transition-all"
              >
                "{prompt}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Voice Error Alert Toast */}
      {voiceError && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-rose-900 text-rose-100 p-3 rounded-2xl shadow-xl border border-rose-700 text-xs font-bold flex items-center justify-between z-50 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{voiceError}</span>
          </div>
          <button
            type="button"
            onClick={() => setVoiceError(null)}
            className="text-rose-300 hover:text-white text-xs font-black ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* 🚀 Dynamic Autocomplete & Search History Flyout (Point #9) */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[80vh] overflow-y-auto">
          {/* Query Mode vs Idle History Mode */}
          {searchQuery.trim() ? (
            <div className="p-3 sm:p-4 space-y-4">
              {/* Point 7: Typo-Tolerance "Did you mean" Banner */}
              {suggestions.didYouMean && (
                <div className="p-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-500 font-semibold">Did you mean:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery(suggestions.didYouMean);
                        saveSearchToHistory(suggestions.didYouMean);
                      }}
                      className="font-extrabold text-amber-900 underline hover:text-amber-950 transition-colors cursor-pointer"
                    >
                      {suggestions.didYouMean}
                    </button>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-200/70 px-2 py-0.5 rounded-full shrink-0">
                    Auto-Correct
                  </span>
                </div>
              )}

              {/* 1. Live Product Suggestions */}
              {suggestions.products.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-black text-slate-400 uppercase tracking-wider px-1">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Matching Products ({suggestions.products.length})
                    </span>
                    <span className="text-[10px] text-amber-600 font-bold">Press Enter to view all</span>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    {suggestions.products.map(p => (
                      <div
                        key={p._id}
                        onClick={() => {
                          saveSearchToHistory(p.title);
                          if (onSelectProduct) {
                            onSelectProduct(p);
                          } else {
                            setSearchQuery(p.title);
                          }
                          setIsOpen(false);
                        }}
                        className="group flex items-center justify-between p-2 rounded-xl hover:bg-amber-50/80 cursor-pointer transition-all border border-transparent hover:border-amber-200/60"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={p.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100'}
                            alt={p.title}
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 group-hover:text-amber-900 truncate">
                              {p.title}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                              <span className="text-amber-600 font-extrabold">{p.brand}</span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                {p.ratingsAverage || 4.8}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pl-2 flex-shrink-0">
                          <div className="text-right">
                            <div className="text-xs font-black text-slate-900">
                              ₹{(p.sellingPrice || 0).toLocaleString('en-IN')}
                            </div>
                            {p.mrp > p.sellingPrice && (
                              <div className="text-[10px] text-slate-400 line-through">
                                ₹{p.mrp.toLocaleString('en-IN')}
                              </div>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Matched Categories & Brands Shortcuts */}
              {(suggestions.categories.length > 0 || suggestions.brands.length > 0) && (
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Quick Filter:
                  </span>
                  {suggestions.categories.map(c => (
                    <button
                      key={c._id || c.slug}
                      type="button"
                      onClick={() => {
                        saveSearchToHistory(c.name);
                        if (onSelectCategory) onSelectCategory(c.slug);
                        setIsOpen(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <Tag className="w-3 h-3 text-amber-500" />
                      <span>Category: {c.name}</span>
                    </button>
                  ))}
                  {suggestions.brands.map(b => (
                    <button
                      key={b.name}
                      type="button"
                      onClick={() => {
                        saveSearchToHistory(b.name);
                        if (onSelectBrand) onSelectBrand(b.name);
                        setIsOpen(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all border border-amber-200/60"
                    >
                      Brand: {b.name} ({b.count})
                    </button>
                  ))}
                </div>
              )}

              {/* No live product results banner */}
              {suggestions.products.length === 0 && !isLoading && (
                <div className="py-6 text-center text-slate-500 space-y-1">
                  <p className="text-xs font-bold text-slate-800">
                    Press <span className="font-black text-amber-600">Enter</span> to search full catalog for "{searchQuery}"
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Or check our trending searches below
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Idle Mode: Show Recent Search History & Trending Searches */
            <div className="p-3 sm:p-4 space-y-4">
              {/* Recent Search History */}
              {recentSearches.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-black text-slate-500 uppercase tracking-wider px-1">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      Recent Searches
                    </span>
                    <button
                      type="button"
                      onClick={clearAllHistory}
                      className="text-[10px] font-bold text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {recentSearches.map(term => (
                      <span
                        key={term}
                        onClick={() => handleSelectTerm(term)}
                        className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-100/90 text-slate-700 hover:text-amber-950 text-xs font-semibold cursor-pointer transition-all border border-slate-200/70"
                      >
                        <Clock className="w-3 h-3 text-slate-400 group-hover:text-amber-600" />
                        <span>{term}</span>
                        <button
                          type="button"
                          onClick={e => removeSearchHistoryItem(term, e)}
                          className="hover:text-rose-600 text-slate-400 p-0.5 rounded-full hover:bg-slate-200/60"
                          title="Remove item"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Searches */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 uppercase tracking-wider px-1">
                  <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                  <span>Trending & Popular Searches</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {suggestions.trendingSearches.map(term => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => handleSelectTerm(term)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50/80 hover:bg-amber-100 text-amber-950 text-xs font-bold transition-all border border-amber-200/70 group"
                    >
                      <TrendingUp className="w-3 h-3 text-amber-600 group-hover:scale-110 transition-transform" />
                      <span>{term}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bottom helper footer */}
          <div className="p-2.5 bg-slate-50 text-[10px] text-slate-400 font-medium flex items-center justify-between px-4">
            <span className="flex items-center gap-1">
              <span>Point #9 Autocomplete & #10 Voice Search Engine</span>
            </span>
            <span>ESC to dismiss</span>
          </div>
        </div>
      )}
    </div>
  );
}
