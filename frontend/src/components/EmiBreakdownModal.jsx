import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Zap,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Percent,
  Sparkles,
  Search,
  Building2,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import api from '../api/client';

export default function EmiBreakdownModal({
  isOpen,
  onClose,
  price = 0,
  productTitle = 'Selected Product',
  productImage = '',
}) {
  const [loading, setLoading] = useState(false);
  const [emiData, setEmiData] = useState(null);
  const [activeTab, setActiveTab] = useState('credit'); // 'credit' | 'debit' | 'cardless' | 'bnpl'
  const [selectedBankCode, setSelectedBankCode] = useState('');
  const [selectedProviderCode, setSelectedProviderCode] = useState('');
  const [binNumber, setBinNumber] = useState('');
  const [detectedBank, setDetectedBank] = useState(null);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  useEffect(() => {
    if (isOpen && price > 0) {
      fetchEmiCalculations();
    }
  }, [isOpen, price]);

  const fetchEmiCalculations = async () => {
    setLoading(true);
    try {
      const res = await api.post('/emi/calculate', { price });
      if (res.data?.success) {
        setEmiData(res.data);
        // Default select first bank / provider
        if (res.data.breakdown?.creditCards?.length > 0) {
          setSelectedBankCode(res.data.breakdown.creditCards[0].bankCode);
        }
        if (res.data.breakdown?.cardlessEmi?.length > 0) {
          setSelectedProviderCode(res.data.breakdown.cardlessEmi[0].providerCode);
        }
      }
    } catch (err) {
      console.error('Failed to calculate EMI plans:', err);
    } finally {
      setLoading(false);
    }
  };

  // Card BIN auto-detection
  const handleBinChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setBinNumber(val);

    if (val.length === 6 && emiData?.breakdown) {
      let matched = null;
      // Search credit cards
      for (const b of emiData.breakdown.creditCards || []) {
        if (b.binPrefixes?.some((prefix) => val.startsWith(prefix))) {
          matched = { ...b, cardType: 'Credit Card' };
          setSelectedBankCode(b.bankCode);
          setActiveTab('credit');
          break;
        }
      }
      // Search debit cards
      if (!matched) {
        for (const b of emiData.breakdown.debitCards || []) {
          if (b.binPrefixes?.some((prefix) => val.startsWith(prefix))) {
            matched = { ...b, cardType: 'Debit Card' };
            setSelectedBankCode(b.bankCode);
            setActiveTab('debit');
            break;
          }
        }
      }
      setDetectedBank(matched);
    } else {
      setDetectedBank(null);
    }
  };

  if (!isOpen) return null;

  const creditCards = emiData?.breakdown?.creditCards || [];
  const debitCards = emiData?.breakdown?.debitCards || [];
  const cardless = emiData?.breakdown?.cardlessEmi || [];
  const payLater = emiData?.breakdown?.payLater || [];

  const currentBankList = activeTab === 'credit' ? creditCards : debitCards;
  const currentBank = currentBankList.find((b) => b.bankCode === selectedBankCode) || currentBankList[0];

  const currentProviderList = activeTab === 'cardless' ? cardless : payLater;
  const currentProvider = currentProviderList.find((p) => p.providerCode === selectedProviderCode) || currentProviderList[0];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  EMI & Flexible Payment Options
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Instant Approval
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                No Cost EMI available on major credit cards, debit cards & Bajaj Finserv
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PRODUCT & PRICING SUMMARY STRIP */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {productImage && (
              <img
                src={productImage}
                alt={productTitle}
                className="w-12 h-12 object-cover rounded-xl border border-slate-200 bg-white shadow-xs"
              />
            )}
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-1 max-w-sm sm:max-w-md">
                {productTitle}
              </h4>
              <p className="text-[11px] font-semibold text-slate-500">
                Cart / Product Value: <span className="text-slate-900 font-extrabold">₹{price.toLocaleString('en-IN')}</span>
              </p>
            </div>
          </div>
          {emiData?.minMonthlyEmi && (
            <div className="flex items-center gap-2 bg-amber-100 border border-amber-300/80 px-3 py-1.5 rounded-xl shadow-xs">
              <Sparkles className="w-4 h-4 text-amber-600 fill-current" />
              <span className="text-xs font-black text-amber-950">
                EMI starts at <span className="text-sm font-black text-amber-700">₹{emiData.minMonthlyEmi.toLocaleString('en-IN')}</span>/mo
              </span>
            </div>
          )}
        </div>

        {/* CARD BIN ELIGIBILITY CHECKER */}
        <div className="px-4 sm:px-6 py-2.5 bg-indigo-50/70 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-indigo-950 font-bold">
            <Search className="w-4 h-4 text-indigo-600" />
            <span>Check Card Eligibility (First 6 Digits):</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="e.g. 401200"
              value={binNumber}
              onChange={handleBinChange}
              maxLength={6}
              className="w-28 px-2.5 py-1 text-xs font-mono font-bold tracking-widest text-slate-800 bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
            />
            {detectedBank ? (
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-800 font-extrabold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {detectedBank.bankName} ({detectedBank.cardType})
              </span>
            ) : binNumber.length === 6 ? (
              <span className="text-amber-700 font-bold">Checking bank rules...</span>
            ) : null}
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 px-4 sm:px-6 overflow-x-auto custom-device-scrollbar">
          <button
            onClick={() => setActiveTab('credit')}
            className={`flex items-center gap-2 py-3 px-4 font-black text-xs sm:text-sm border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'credit'
                ? 'border-amber-600 text-amber-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4 text-amber-600" />
            <span>Credit Card EMI</span>
            <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
              No Cost
            </span>
          </button>

          <button
            onClick={() => setActiveTab('debit')}
            className={`flex items-center gap-2 py-3 px-4 font-black text-xs sm:text-sm border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'debit'
                ? 'border-amber-600 text-amber-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Debit Card EMI</span>
          </button>

          <button
            onClick={() => setActiveTab('cardless')}
            className={`flex items-center gap-2 py-3 px-4 font-black text-xs sm:text-sm border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'cardless'
                ? 'border-amber-600 text-amber-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500 fill-current" />
            <span>Cardless NBFC (Bajaj Finserv)</span>
            <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
              0% Interest
            </span>
          </button>

          <button
            onClick={() => setActiveTab('bnpl')}
            className={`flex items-center gap-2 py-3 px-4 font-black text-xs sm:text-sm border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'bnpl'
                ? 'border-amber-600 text-amber-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Buy Now Pay Later (BNPL)</span>
          </button>
        </div>

        {/* MAIN BODY CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-600">Calculating real-time bank EMI schedules...</p>
            </div>
          ) : emiData && !emiData.isEligible ? (
            <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
              <h4 className="text-base font-extrabold text-amber-950">
                Minimum Purchase Amount for EMI is ₹{emiData.minOrderAmount?.toLocaleString('en-IN') || '2,500'}
              </h4>
              <p className="text-xs text-amber-800 max-w-md mx-auto">
                Add more items to your shopping cart to reach ₹{emiData.minOrderAmount?.toLocaleString('en-IN')} and unlock easy monthly installments with 0% No Cost EMI!
              </p>
            </div>
          ) : (
            <>
              {/* BANK OR PROVIDER SELECTOR */}
              {(activeTab === 'credit' || activeTab === 'debit') && (
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                    Select Your Bank:
                  </label>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {currentBankList.map((bank) => {
                      const isSelected = selectedBankCode === bank.bankCode;
                      return (
                        <button
                          key={bank.bankCode}
                          type="button"
                          onClick={() => setSelectedBankCode(bank.bankCode)}
                          className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-extrabold transition-all ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/80 text-slate-950 ring-2 ring-amber-400/30 shadow-sm scale-105'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: bank.color || '#004c8f' }}
                          />
                          <span>{bank.bankName}</span>
                          {bank.hasNoCostOption && (
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              0%
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(activeTab === 'cardless' || activeTab === 'bnpl') && (
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                    Select Provider:
                  </label>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {currentProviderList.map((prov) => {
                      const isSelected = selectedProviderCode === prov.providerCode;
                      return (
                        <button
                          key={prov.providerCode}
                          type="button"
                          onClick={() => setSelectedProviderCode(prov.providerCode)}
                          className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-extrabold transition-all ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/80 text-slate-950 ring-2 ring-amber-400/30 shadow-sm scale-105'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: prov.color || '#2563eb' }}
                          />
                          <span>{prov.providerName}</span>
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            0% Interest
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TENURE BREAKDOWN TABLE */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                      Available Installment Plans
                    </span>
                    {(currentBank || currentProvider) && (
                      <span className="text-xs font-bold text-slate-500">
                        • {currentBank?.bankName || currentProvider?.providerName}
                      </span>
                    )}
                  </div>
                  {currentBank?.processingFeeWithGst > 0 && (
                    <span className="text-[11px] font-semibold text-slate-500">
                      Bank Processing Fee: ₹{currentBank.processingFee} + 18% GST (₹{currentBank.processingFeeWithGst})
                    </span>
                  )}
                  {currentProvider?.processingFee > 0 && (
                    <span className="text-[11px] font-semibold text-slate-500">
                      Processing Fee: ₹{currentProvider.processingFee}
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Tenure</th>
                        <th className="py-3 px-4">Monthly EMI</th>
                        <th className="py-3 px-4">Interest Rate</th>
                        <th className="py-3 px-4">Instant Discount</th>
                        <th className="py-3 px-4">Total Cost</th>
                        <th className="py-3 px-4 text-right">Plan Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {((activeTab === 'credit' || activeTab === 'debit') ? currentBank?.tenures : currentProvider?.tenures)?.map(
                        (t, idx) => (
                          <tr
                            key={idx}
                            className={`hover:bg-slate-50 transition-colors ${
                              t.isNoCost ? 'bg-emerald-50/30' : ''
                            }`}
                          >
                            <td className="py-3.5 px-4 font-black text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <span>{t.months} Months</span>
                                {t.billingCycleDays && (
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    ({t.billingCycleDays} days cycle)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="text-sm font-black text-slate-950">
                                ₹{t.monthlyEmi.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] text-slate-400 block font-medium">/month</span>
                            </td>
                            <td className="py-3.5 px-4">
                              {t.isNoCost ? (
                                <span className="text-emerald-700 font-black flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> 0% p.a.
                                </span>
                              ) : (
                                <span className="font-bold text-slate-700">
                                  {t.annualInterestRate}% p.a.
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              {t.upfrontDiscount > 0 ? (
                                <span className="font-extrabold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
                                  -₹{t.upfrontDiscount.toLocaleString('en-IN')}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-semibold">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-800">
                              <div>₹{t.totalPayable.toLocaleString('en-IN')}</div>
                              {t.processingFeeWithGst > 0 && (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  + ₹{t.processingFeeWithGst} fee
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {t.isNoCost ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                                  <Sparkles className="w-3 h-3 fill-current" /> No Cost EMI
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200">
                                  Standard EMI
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* HOW NO COST EMI WORKS EXPLAINER BOX */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 space-y-2">
                <div className="flex items-center gap-2 text-emerald-950 font-black text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>How AuraMarket No Cost EMI Works (Zero Hidden Traps)</span>
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                  When you pick a <strong className="font-extrabold">No Cost EMI</strong> plan, AuraMarket provides an{' '}
                  <strong className="font-extrabold">instant upfront cash discount</strong> equal to the total interest your bank will charge over your tenure. Your net effective outflow equals the original item price!
                </p>
              </div>

              {/* FAQ ACCORDION */}
              {emiData?.faqItems?.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    <span>Frequently Asked Questions</span>
                  </h4>
                  <div className="space-y-1.5">
                    {emiData.faqItems.map((faq, idx) => {
                      const isOpen = openFaqIndex === idx;
                      return (
                        <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                            className="w-full flex items-center justify-between p-3 text-left bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800 transition-colors"
                          >
                            <span>{faq.question}</span>
                            {isOpen ? (
                              <ChevronUp className="w-4 h-4 text-slate-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-500" />
                            )}
                          </button>
                          {isOpen && (
                            <div className="p-3 bg-white text-xs text-slate-600 leading-relaxed font-medium border-t border-slate-100">
                              {faq.answer}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500 font-medium">
            Subject to bank credit approval • Final authorization at payment step
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm bg-slate-900 hover:bg-slate-800 text-white shadow-md active:scale-95 transition-all"
          >
            Close & Continue Shopping
          </button>
        </div>

      </div>
    </div>
  );
}
