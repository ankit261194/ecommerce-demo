import React, { useState } from 'react';
import {
  X,
  Wallet,
  Building,
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock,
  Sparkles,
} from 'lucide-react';
import api from '../api/client';

export const VendorPayoutModal = ({
  isOpen,
  onClose,
  walletBalance = 24500,
  initialBankDetails = {},
  onPayoutSuccess,
}) => {
  const [payoutMode, setPayoutMode] = useState('BANK'); // 'BANK' | 'UPI'
  const [amount, setAmount] = useState('5000');
  const [bankMode, setBankMode] = useState('IMPS'); // 'IMPS' | 'NEFT'

  // Bank Form State
  const [accountHolder, setAccountHolder] = useState(
    initialBankDetails.accountHolder || 'Apex Tech Enterprise'
  );
  const [bankName, setBankName] = useState(
    initialBankDetails.bankName || 'HDFC Bank Ltd'
  );
  const [accountNumber, setAccountNumber] = useState(
    initialBankDetails.accountNumber ? initialBankDetails.accountNumber.replace(/\*/g, '5') : '50100492810234'
  );
  const [ifscCode, setIfscCode] = useState(
    initialBankDetails.ifscCode || 'HDFC0001024'
  );

  // UPI Form State
  const [upiId, setUpiId] = useState(
    initialBankDetails.upiId || 'apextech@okhdfcbank'
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const numAmount = Number(amount) || 0;
  const isAmountValid = numAmount >= 500 && numAmount <= walletBalance;
  const remainingBalance = Math.max(0, walletBalance - numAmount);

  const handlePresetSelect = val => {
    setAmount(String(val));
    setError(null);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!isAmountValid) {
      if (numAmount < 500) {
        setError('Minimum payout withdrawal amount is ₹500');
      } else {
        setError(`Amount exceeds your available balance of ₹${walletBalance.toLocaleString('en-IN')}`);
      }
      return;
    }

    if (payoutMode === 'BANK') {
      if (!accountHolder.trim() || !accountNumber.trim() || !ifscCode.trim()) {
        setError('Please complete all bank account details.');
        return;
      }
    } else {
      if (!upiId.trim() || !upiId.includes('@')) {
        setError('Please enter a valid UPI ID (e.g. yourname@okhdfcbank or 9876543210@paytm).');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        amount: numAmount,
        paymentMode: payoutMode === 'UPI' ? 'UPI' : bankMode,
        bankDetails:
          payoutMode === 'BANK'
            ? {
                accountHolder: accountHolder.trim(),
                bankName: bankName.trim(),
                accountNumber: accountNumber.trim(),
                ifscCode: ifscCode.trim().toUpperCase(),
              }
            : undefined,
        upiId: payoutMode === 'UPI' ? upiId.trim() : undefined,
      };

      const res = await api.post('/vendor/payout', payload);

      if (onPayoutSuccess) {
        onPayoutSuccess({
          amount: numAmount,
          mode: payload.paymentMode,
          recipient:
            payoutMode === 'UPI'
              ? upiId.trim()
              : `${bankName.trim()} (A/C: ****${accountNumber.slice(-4)})`,
          remainingBalance: res.data?.updatedWalletBalance !== undefined ? res.data.updatedWalletBalance : remainingBalance,
          ledger: res.data?.data,
        });
      }

      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit withdrawal request. Please check details.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Request Payout Withdrawal
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                  Point #62
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Direct settlement to verified bank account (IMPS/NEFT) or instant UPI VPA.
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

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Balance Overview Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-700 text-white flex items-center justify-between shadow-md">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-100">
                Available Wallet Balance
              </span>
              <div className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5">
                ₹{Number(walletBalance).toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-emerald-100 font-medium">
                Minimum withdrawal: ₹500 • Platform processing fee: ₹0 (FREE)
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white">
              <ShieldCheck className="w-6 h-6 text-emerald-200" />
            </div>
          </div>

          {/* Amount Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase text-slate-700 tracking-wider">
                Withdrawal Amount (₹)
              </label>
              <span className="text-[11px] font-extrabold text-slate-500">
                Max: ₹{walletBalance.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-black text-slate-400">
                ₹
              </span>
              <input
                type="number"
                min={500}
                max={walletBalance}
                value={amount}
                onChange={e => {
                  setAmount(e.target.value);
                  setError(null);
                }}
                placeholder="5000"
                className="w-full pl-9 pr-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-200 text-lg font-black text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {[1000, 2500, 5000, 10000].map(val => (
                <button
                  key={val}
                  type="button"
                  disabled={val > walletBalance}
                  onClick={() => handlePresetSelect(val)}
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold border transition-all ${
                    numAmount === val
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 disabled:opacity-40'
                  }`}
                >
                  ₹{val.toLocaleString('en-IN')}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handlePresetSelect(walletBalance)}
                className={`px-3 py-1 rounded-xl text-xs font-black border transition-all ${
                  numAmount === walletBalance
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                }`}
              >
                Max (100%)
              </button>
            </div>
          </div>

          {/* Mode Selector (Bank IMPS/NEFT vs Direct UPI) */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-slate-700 tracking-wider">
              Payout Destination Mode
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPayoutMode('BANK')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                  payoutMode === 'BANK'
                    ? 'border-emerald-600 bg-emerald-50/40 text-emerald-950 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Building className={`w-5 h-5 ${payoutMode === 'BANK' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  {payoutMode === 'BANK' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
                <div className="mt-2">
                  <h4 className="text-xs font-black">Bank Transfer</h4>
                  <p className="text-[10px] text-slate-500 font-semibold">IMPS Instant / NEFT</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPayoutMode('UPI')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                  payoutMode === 'UPI'
                    ? 'border-emerald-600 bg-emerald-50/40 text-emerald-950 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <QrCode className={`w-5 h-5 ${payoutMode === 'UPI' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  {payoutMode === 'UPI' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
                <div className="mt-2">
                  <h4 className="text-xs font-black">Instant UPI VPA</h4>
                  <p className="text-[10px] text-slate-500 font-semibold">GPay, PhonePe, Paytm</p>
                </div>
              </button>
            </div>
          </div>

          {/* Conditional Input Fields: BANK vs UPI */}
          {payoutMode === 'BANK' ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-emerald-600" />
                  Beneficiary Bank Account Details
                </span>

                <div className="flex items-center gap-1 text-[10px] font-black">
                  <button
                    type="button"
                    onClick={() => setBankMode('IMPS')}
                    className={`px-2 py-0.5 rounded-md ${
                      bankMode === 'IMPS'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    IMPS (24x7)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBankMode('NEFT')}
                    className={`px-2 py-0.5 rounded-md ${
                      bankMode === 'NEFT'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    NEFT
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    required
                    value={accountHolder}
                    onChange={e => setAccountHolder(e.target.value)}
                    placeholder="e.g. Apex Tech Enterprise"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    placeholder="e.g. HDFC Bank Ltd"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={e => setAccountNumber(e.target.value)}
                    placeholder="e.g. 50100492810234"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    required
                    value={ifscCode}
                    onChange={e => setIfscCode(e.target.value.toUpperCase())}
                    placeholder="e.g. HDFC0001024"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-900 font-mono uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                  Direct UPI Virtual Payment Address (VPA)
                </span>
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  Instant Transfer
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  UPI ID (VPA)
                </label>
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={e => setUpiId(e.target.value)}
                  placeholder="e.g. merchant@okhdfcbank or 8533955333@paytm"
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-black text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-400 font-medium mt-1">
                  Funds will be dispatched directly to your registered UPI handle via NPCI instant settlement.
                </p>
              </div>
            </div>
          )}

          {/* Review Summary Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-bold">Transfer Amount:</span>
              <span className="text-slate-900 font-black">₹{numAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-bold">Processing Fee:</span>
              <span className="text-emerald-700 font-black">₹0 (Free)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-bold">Estimated Settlement:</span>
              <span className="text-indigo-700 font-black flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {payoutMode === 'UPI' ? 'Instant (1-2 Hours)' : 'Within 24 Business Hours'}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200">
              <span className="text-slate-700 font-extrabold">Remaining Wallet Balance:</span>
              <span className="text-slate-900 font-black">
                ₹{remainingBalance.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || !isAmountValid}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
            >
              {loading ? (
                <span>Processing Request...</span>
              ) : (
                <>
                  <span>Confirm Withdrawal</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorPayoutModal;
