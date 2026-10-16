import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  ShoppingBag,
  Truck,
  Tag,
  ArrowRight,
  Send,
  RefreshCw,
  Search,
  ExternalLink,
} from 'lucide-react';
import api from '../api/client';

const VoiceShoppingAssistantModal = ({
  isOpen,
  onClose,
  onSelectProduct,
  onOpenCart,
  onOpenOrderTracker,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [language, setLanguage] = useState('hi-IN'); // 'hi-IN' | 'en-IN'
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [assistantResponse, setAssistantResponse] = useState(null);
  const [typedInput, setTypedInput] = useState('');

  const recognitionRef = useRef(null);

  // Initialize SpeechRecognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const current = event.resultIndex;
        const text = event.results[current][0].transcript;
        setTranscript(text);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      window.speechSynthesis?.cancel();
    };
  }, [language]);

  // Trigger Speech Synthesis (TTS)
  const speakText = (text, lang) => {
    if (!speechEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      if (transcript.trim()) {
        handleSubmitCommand(transcript.trim());
      }
    } else {
      setTranscript('');
      setAssistantResponse(null);
      window.speechSynthesis?.cancel();
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.warn('Recognition start error:', err);
      }
    }
  };

  // Submit voice or typed command to AI backend
  const handleSubmitCommand = async (commandText) => {
    const queryToSubmit = commandText || transcript || typedInput;
    if (!queryToSubmit || !queryToSubmit.trim()) return;

    setIsLoading(true);
    window.speechSynthesis?.cancel();

    try {
      const res = await api.post('/ai/voice-assistant', {
        query: queryToSubmit.trim(),
        language: language.startsWith('hi') ? 'hi' : 'en',
      });

      if (res.data?.success) {
        setAssistantResponse(res.data);
        speakText(res.data.replyText, res.data.language);
      }
    } catch (err) {
      console.warn('Voice assistant error:', err);
      // Fallback response for offline demo
      const fallbackReply = language.startsWith('hi')
        ? 'Maine aapka request samajh liya hai. Aura Pro ANC headphones aur smartwatches par aaj special discount offer chal raha hai.'
        : 'I have processed your request. Here are the top trending electronics and promotional deals today.';

      const fallbackData = {
        success: true,
        intent: 'SEARCH_PRODUCTS',
        language: language.startsWith('hi') ? 'hi' : 'en',
        replyText: fallbackReply,
        payload: {
          products: [
            {
              _id: 'prod-fallback-1',
              title: 'Aura Pro ANC Wireless Noise-Cancelling Headphones',
              price: 8999,
              mrp: 14999,
              rating: 4.9,
              thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300',
              brand: 'AuraAudio',
            },
            {
              _id: 'prod-fallback-2',
              title: 'AeroWatch S9 Ultra Smartwatch with AMOLED Display',
              price: 4499,
              mrp: 9999,
              rating: 4.8,
              thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300',
              brand: 'ApexWear',
            },
          ],
        },
      };

      setAssistantResponse(fallbackData);
      speakText(fallbackReply, fallbackData.language);
    } finally {
      setIsLoading(false);
      setTypedInput('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 font-black">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-tight">AI Voice Shopping Assistant</h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Point #20
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Search products, check prices, and track deliveries using voice in Hindi or English
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setLanguage('hi-IN')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  language === 'hi-IN' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                हिन्दी
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en-IN')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  language === 'en-IN' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
            </div>

            {/* TTS Audio Speaker Toggle */}
            <button
              type="button"
              onClick={() => {
                setSpeechEnabled(!speechEnabled);
                if (speechEnabled) window.speechSynthesis?.cancel();
              }}
              className={`p-2 rounded-xl border transition-all ${
                speechEnabled
                  ? 'bg-amber-400/10 text-amber-400 border-amber-400/20'
                  : 'bg-slate-800 text-slate-500 border-slate-700'
              }`}
              title={speechEnabled ? 'Voice Reply ON' : 'Voice Reply Muted'}
            >
              {speechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={() => {
                window.speechSynthesis?.cancel();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Central Voice Waveform & Microphone Action Area */}
        <div className="p-6 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-b border-slate-800 flex flex-col items-center justify-center text-center">
          
          {/* Animated Waveform Visualizer */}
          <div className="flex items-center gap-1.5 h-12 mb-4">
            {[4, 8, 14, 20, 12, 18, 6, 16, 22, 10, 14, 6].map((h, i) => (
              <span
                key={i}
                className={`w-1 rounded-full transition-all duration-300 ${
                  isListening
                    ? 'bg-emerald-400 animate-pulse'
                    : isSpeaking
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-slate-700'
                }`}
                style={{
                  height: isListening ? `${Math.min(48, h * 2.2)}px` : isSpeaking ? `${h * 1.5}px` : '6px',
                  animationDelay: `${i * 75}ms`,
                }}
              ></span>
            ))}
          </div>

          {/* Big Glow Microphone Button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
              isListening
                ? 'bg-rose-500 text-white shadow-rose-500/40 ring-4 ring-rose-500/30 scale-105 animate-pulse'
                : 'bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 shadow-amber-500/25 hover:scale-105'
            }`}
          >
            {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          </button>

          <p className="mt-3 text-xs font-bold text-slate-300">
            {isListening
              ? language === 'hi-IN'
                ? 'Sun raha hoon... Boliye'
                : 'Listening... Speak now'
              : language === 'hi-IN'
              ? 'Bolne ke liye mic par tap karein'
              : 'Tap microphone to speak'}
          </p>

          {/* Live Transcript Bubble */}
          {transcript && (
            <div className="mt-3 px-4 py-2 rounded-2xl bg-slate-800/80 border border-slate-700 max-w-lg text-sm font-medium text-amber-300 italic animate-fade-in">
              "{transcript}"
            </div>
          )}
        </div>

        {/* Results & AI Response Area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          
          {isLoading && (
            <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
              <p className="text-xs font-bold">Analyzing voice intent & catalog matching...</p>
            </div>
          )}

          {assistantResponse && !isLoading && (
            <div className="space-y-4 animate-fade-in">
              
              {/* Spoken Reply Bubble */}
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 font-black text-xs">
                  AI
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white leading-relaxed">
                    {assistantResponse.replyText}
                  </p>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mt-1">
                    Intent: {assistantResponse.intent}
                  </span>
                </div>
              </div>

              {/* Action Card: Products List */}
              {assistantResponse.intent === 'SEARCH_PRODUCTS' && assistantResponse.payload?.products?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Matching Recommended Products ({assistantResponse.payload.products.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {assistantResponse.payload.products.map((p) => (
                      <div
                        key={p._id}
                        className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3 hover:border-amber-400/50 transition-all group"
                      >
                        <img
                          src={p.thumbnail}
                          alt={p.title}
                          className="w-16 h-16 rounded-xl object-cover bg-slate-900 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                            {p.title}
                          </h5>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-black text-white">₹{p.price.toLocaleString('en-IN')}</span>
                            {p.mrp > p.price && (
                              <span className="text-xs text-slate-500 line-through">₹{p.mrp}</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectProduct?.(p);
                              onClose();
                            }}
                            className="mt-2 flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300"
                          >
                            <span>View Details</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Card: Order Tracker */}
              {assistantResponse.intent === 'TRACK_ORDER' && assistantResponse.payload && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="w-5 h-5 text-amber-400" />
                      <span className="font-bold text-sm text-white">
                        Order #{assistantResponse.payload.orderNumber}
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
                      {assistantResponse.payload.statusLabel}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">
                    Estimated Doorstep Arrival: <span className="font-bold text-emerald-400">{assistantResponse.payload.estimatedTime}</span>
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenOrderTracker?.(assistantResponse.payload.orderNumber);
                      onClose();
                    }}
                    className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    <span>Open Live Real-Time GPS Tracking Map</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Action Card: Coupons / Deals */}
              {assistantResponse.intent === 'GET_OFFERS' && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-400 block">Recommended Coupon</span>
                    <span className="text-base font-black font-mono text-white">
                      {assistantResponse.payload?.suggestedCode || 'FESTIVE500'}
                    </span>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold">
                    FLAT ₹500 OFF
                  </span>
                </div>
              )}

              {/* Action Card: Cart */}
              {assistantResponse.intent === 'CHECK_CART' && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenCart?.();
                    onClose();
                  }}
                  className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Open Shopping Cart & Checkout</span>
                </button>
              )}

            </div>
          )}

          {/* Quick Voice Prompt Suggestions */}
          {!assistantResponse && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                {language === 'hi-IN' ? '⚡ Try asking in Hindi or Hinglish:' : '⚡ Quick Voice Prompts:'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { label: 'Aura Pro ANC Headphones dikhao', lang: 'hi-IN' },
                  { label: 'Smartwatches under 5000', lang: 'en-IN' },
                  { label: 'Mera order kahan hai track karo', lang: 'hi-IN' },
                  { label: 'Festive season ke offers aur coupons', lang: 'hi-IN' },
                  { label: 'Show casual linen shirts', lang: 'en-IN' },
                  { label: 'Open cart and checkout', lang: 'en-IN' },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTranscript(item.label);
                      handleSubmitCommand(item.label);
                    }}
                    className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-xs font-medium text-slate-300 hover:text-white transition-all flex items-center justify-between group"
                  >
                    <span>"{item.label}"</span>
                    <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-amber-400 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Bottom Typing Fallback Bar */}
        <div className="p-4 bg-slate-900 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmitCommand(typedInput);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                placeholder={
                  language === 'hi-IN'
                    ? 'Type karein ya bole (e.g. Headphones dikhao, order track karo)...'
                    : 'Type or speak a shopping command...'
                }
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
            <button
              type="submit"
              disabled={!typedInput.trim() || isLoading}
              className="p-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 transition-all shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default VoiceShoppingAssistantModal;
