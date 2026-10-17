import React, { useState, useEffect } from 'react';
import {
  Store,
  Building,
  Truck,
  CreditCard,
  CheckCircle,
  FileText,
  Upload,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Clock,
  Sparkles,
  ExternalLink,
  Check,
  X,
  FileCheck,
  ChevronRight,
} from 'lucide-react';
import api from '../api/client';

export default function VendorOnboardingWizard({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Slug check states
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugStatus, setSlugStatus] = useState(null); // { available: boolean, message: string }

  // Step 1: Store Identity
  const [step1, setStep1] = useState({
    storeName: '',
    storeSlug: '',
    description: '',
    storeLogo: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=150',
    storeBanner: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
    supportPhone: '',
    supportEmail: '',
  });

  // Step 2: Legal Entity & Tax
  const [step2, setStep2] = useState({
    legalName: '',
    entityType: 'Proprietorship',
    gstNumber: '',
    panNumber: '',
    authorizedSignatoryName: '',
    authorizedSignatoryPhone: '',
    authorizedSignatoryEmail: '',
  });

  // Step 3: Warehouse & Pickup Address
  const [step3, setStep3] = useState({
    warehouseName: 'Primary Fulfillment Hub',
    contactPerson: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
  });

  // Step 4: Bank & KYC Documents
  const [step4, setStep4] = useState({
    accountHolder: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    bankName: '',
    branchName: '',
    accountType: 'CURRENT',
    upiId: '',
    gstCertificate: '',
    panCard: '',
    cancelledCheque: '',
    businessRegistrationProof: '',
    idProof: '',
    agreedToTerms: false,
  });

  // Status & Progress
  const [onboardingStatus, setOnboardingStatus] = useState('DRAFT');
  const [submittedAt, setSubmittedAt] = useState(null);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch initial onboarding state
  const fetchOnboardingState = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/vendor/onboarding');
      if (res.data?.success && res.data.data) {
        const d = res.data.data;
        setOnboardingStatus(d.status || 'DRAFT');
        setSubmittedAt(d.submittedAt || null);

        if (d.store) {
          setStep1(prev => ({
            ...prev,
            storeName: d.store.storeName || '',
            storeSlug: d.store.storeSlug || '',
            description: d.store.description || '',
            storeLogo: d.store.storeLogo || prev.storeLogo,
            storeBanner: d.store.storeBanner || prev.storeBanner,
            supportPhone: d.store.supportPhone || '',
            supportEmail: d.store.supportEmail || '',
          }));
        }

        if (d.businessDetails) {
          setStep2(prev => ({
            ...prev,
            legalName: d.businessDetails.legalName || '',
            entityType: d.businessDetails.entityType || 'Proprietorship',
            gstNumber: d.gstNumber || '',
            panNumber: d.panNumber || '',
            authorizedSignatoryName: d.businessDetails.authorizedSignatoryName || '',
            authorizedSignatoryPhone: d.businessDetails.authorizedSignatoryPhone || '',
            authorizedSignatoryEmail: d.businessDetails.authorizedSignatoryEmail || '',
          }));
        }

        if (d.pickupAddress) {
          setStep3(prev => ({
            ...prev,
            warehouseName: d.pickupAddress.warehouseName || 'Primary Fulfillment Hub',
            contactPerson: d.pickupAddress.contactPerson || '',
            street: d.pickupAddress.street || '',
            city: d.pickupAddress.city || '',
            state: d.pickupAddress.state || '',
            pincode: d.pickupAddress.pincode || '',
            phone: d.pickupAddress.phone || '',
          }));
        }

        if (d.bankDetails) {
          setStep4(prev => ({
            ...prev,
            accountHolder: d.bankDetails.accountHolder || '',
            accountNumber: d.bankDetails.accountNumber || '',
            confirmAccountNumber: d.bankDetails.accountNumber || '',
            ifscCode: d.bankDetails.ifscCode || '',
            bankName: d.bankDetails.bankName || '',
            branchName: d.bankDetails.branchName || '',
            accountType: d.bankDetails.accountType || 'CURRENT',
            upiId: d.bankDetails.upiId || '',
            gstCertificate: d.kycDocuments?.gstCertificate || '',
            panCard: d.kycDocuments?.panCard || '',
            cancelledCheque: d.kycDocuments?.cancelledCheque || '',
            businessRegistrationProof: d.kycDocuments?.businessRegistrationProof || '',
            idProof: d.kycDocuments?.idProof || '',
            agreedToTerms: d.agreedToTerms || false,
          }));
        }

        if (d.status === 'SUBMITTED' || d.status === 'UNDER_REVIEW' || d.status === 'VERIFIED') {
          // Already submitted
        } else {
          setCurrentStep(d.step || 1);
        }
      }
    } catch (err) {
      console.error('Failed to load onboarding state:', err);
      showNotification('error', 'Failed to load seller onboarding progress');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOnboardingState();
  }, []);

  // Handle Slug Check
  const handleCheckSlug = async (slugToCheck) => {
    const slug = (slugToCheck || step1.storeSlug || step1.storeName).toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-');
    if (!slug || slug.length < 3) {
      setSlugStatus({ available: false, message: 'Slug must be at least 3 characters' });
      return;
    }

    setIsCheckingSlug(true);
    try {
      const res = await api.get(`/vendor/onboarding/check-slug?slug=${encodeURIComponent(slug)}`);
      if (res.data?.success) {
        setSlugStatus({ available: res.data.isAvailable, message: res.data.message });
      }
    } catch (err) {
      setSlugStatus({ available: false, message: 'Error verifying slug' });
    } finally {
      setIsCheckingSlug(false);
    }
  };

  // Step 1: Save
  const handleSaveStep1 = async (e) => {
    e.preventDefault();
    if (!step1.storeName.trim()) {
      showNotification('error', 'Please enter your Store Name');
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.post('/vendor/onboarding/step/1', step1);
      if (res.data?.success) {
        showNotification('success', 'Step 1 saved! Moving to Business & Tax details.');
        setCurrentStep(2);
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to save Step 1');
    } finally {
      setIsSaving(false);
    }
  };

  // Step 2: Save
  const handleSaveStep2 = async (e) => {
    e.preventDefault();
    if (!step2.legalName.trim()) {
      showNotification('error', 'Please provide Registered Legal Entity Name');
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.post('/vendor/onboarding/step/2', step2);
      if (res.data?.success) {
        showNotification('success', 'Step 2 saved! Moving to Warehouse Address.');
        setCurrentStep(3);
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to save Step 2');
    } finally {
      setIsSaving(false);
    }
  };

  // Step 3: Save
  const handleSaveStep3 = async (e) => {
    e.preventDefault();
    if (!step3.street.trim() || !step3.city.trim() || !step3.state.trim() || !step3.pincode.trim()) {
      showNotification('error', 'Please provide full street, city, state and 6-digit pincode');
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.post('/vendor/onboarding/step/3', step3);
      if (res.data?.success) {
        showNotification('success', 'Step 3 saved! Proceeding to Bank & Document Vault.');
        setCurrentStep(4);
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to save Step 3');
    } finally {
      setIsSaving(false);
    }
  };

  // Step 4: Submit Application
  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    if (!step4.accountHolder.trim() || !step4.accountNumber.trim() || !step4.ifscCode.trim()) {
      showNotification('error', 'Please provide complete bank account details');
      return;
    }

    if (step4.accountNumber !== step4.confirmAccountNumber) {
      showNotification('error', 'Account number and confirmation do not match');
      return;
    }

    if (!step4.agreedToTerms) {
      showNotification('error', 'You must agree to the Marketplace Vendor Terms & SLA');
      return;
    }

    setIsSaving(true);
    try {
      // First save step 4 bank & kyc docs
      await api.post('/vendor/onboarding/step/4', {
        accountHolder: step4.accountHolder,
        accountNumber: step4.accountNumber,
        ifscCode: step4.ifscCode,
        bankName: step4.bankName,
        branchName: step4.branchName,
        accountType: step4.accountType,
        upiId: step4.upiId,
        kycDocuments: {
          gstCertificate: step4.gstCertificate,
          panCard: step4.panCard,
          cancelledCheque: step4.cancelledCheque,
          businessRegistrationProof: step4.businessRegistrationProof,
          idProof: step4.idProof,
        },
      });

      // Submit application
      const submitRes = await api.post('/vendor/onboarding/submit', {
        agreedToTerms: true,
      });

      if (submitRes.data?.success) {
        showNotification('success', 'Application submitted successfully! Your account is now under review.');
        setOnboardingStatus('SUBMITTED');
        setSubmittedAt(new Date().toISOString());
        if (onComplete) onComplete();
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to submit application');
    } finally {
      setIsSaving(false);
    }
  };

  const stepsList = [
    { number: 1, title: 'Store Identity', icon: Store, desc: 'Branding & Storefront URL' },
    { number: 2, title: 'Legal & Tax', icon: Building, desc: 'GSTIN, PAN & Entity' },
    { number: 3, title: 'Pickup Hub', icon: Truck, desc: 'Warehouse & Logistics' },
    { number: 4, title: 'Bank & Documents', icon: CreditCard, desc: 'Disbursement & KYC' },
  ];

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4 shadow-sm animate-pulse">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
        <p className="text-sm font-bold text-slate-500">Loading Seller Onboarding Wizard...</p>
      </div>
    );
  }

  // Submitted / Under Review State Screen
  if (onboardingStatus === 'SUBMITTED' || onboardingStatus === 'UNDER_REVIEW') {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-xl max-w-3xl mx-auto space-y-8 animate-fade-in text-center font-sans">
        <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
          <Clock className="w-10 h-10 animate-pulse" />
        </div>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 text-amber-800 text-xs font-black uppercase tracking-wider border border-amber-500/20">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>Application Under Review (Point #34)</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Welcome Aboard, {step1.storeName}!
          </h2>
          <p className="text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
            Your 4-step merchant onboarding application and compliance documents have been submitted to the compliance team. Standard review SLA is within <span className="font-bold text-slate-900">24 business hours</span>.
          </p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-left grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-slate-400 font-bold uppercase text-[10px]">Merchant Store</div>
            <div className="font-black text-slate-900 text-sm mt-0.5">{step1.storeName}</div>
            <div className="text-slate-500 font-mono text-[11px]">auramarket.com/store/{step1.storeSlug}</div>
          </div>
          <div>
            <div className="text-slate-400 font-bold uppercase text-[10px]">Legal Entity</div>
            <div className="font-black text-slate-900 text-sm mt-0.5">{step2.legalName || 'Registered Vendor'}</div>
            <div className="text-slate-500 text-[11px]">{step2.entityType} &bull; PAN: {step2.panNumber || 'Provided'}</div>
          </div>
          <div>
            <div className="text-slate-400 font-bold uppercase text-[10px]">Pickup Hub</div>
            <div className="font-black text-slate-900 text-sm mt-0.5">{step3.city}, {step3.state}</div>
            <div className="text-slate-500 text-[11px]">Pincode: {step3.pincode}</div>
          </div>
          <div>
            <div className="text-slate-400 font-bold uppercase text-[10px]">Settlement Account</div>
            <div className="font-black text-slate-900 text-sm mt-0.5">{step4.bankName || 'Bank Account'}</div>
            <div className="text-slate-500 text-[11px]">A/C: *******{step4.accountNumber ? step4.accountNumber.slice(-4) : 'XXXX'} &bull; {step4.ifscCode}</div>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => setOnboardingStatus('DRAFT')}
            className="px-6 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm transition-all"
          >
            Review & Edit Submitted Details
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in font-sans pb-12 max-w-4xl mx-auto">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-semibold transition-all transform animate-bounce-short ${
            notification.type === 'success'
              ? 'bg-slate-900 border-amber-500/40 text-amber-300'
              : 'bg-rose-950 border-rose-500 text-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-amber-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-amber-400" />
              Point #34 (Pillar 3: Vendor Portal)
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              4-Step Fast Track
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span>Self-Service Merchant Onboarding Wizard</span>
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            Set up your storefront, business legal structure, pickup warehouse, and bank account in 4 fast steps to start selling on AuraMarket.
          </p>
        </div>

        {/* Stepper Progress Visualizer */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-slate-800/80">
          {stepsList.map(s => {
            const Icon = s.icon;
            const isCompleted = currentStep > s.number;
            const isCurrent = currentStep === s.number;
            return (
              <button
                key={s.number}
                onClick={() => setCurrentStep(s.number)}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  isCurrent
                    ? 'bg-amber-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                    : isCompleted
                    ? 'bg-slate-900/60 border-emerald-500/30'
                    : 'bg-slate-900/40 border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black ${
                      isCurrent
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : isCompleted
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : s.number}
                  </div>
                  <Icon
                    className={`w-4 h-4 ${
                      isCurrent ? 'text-amber-400' : isCompleted ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  />
                </div>
                <div className="text-xs font-black text-white">{s.title}</div>
                <div className="text-[10px] text-slate-400 truncate">{s.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: STORE IDENTITY & BRANDING */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <form onSubmit={handleSaveStep1} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Store className="w-5 h-5 text-amber-500" />
              <span>Step 1: Store Identity & Branding</span>
            </h2>
            <p className="text-xs text-slate-500">
              Configure your public storefront name, unique web address slug, and contact credentials.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Store Name <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={step1.storeName}
                onChange={e => {
                  const val = e.target.value;
                  setStep1(prev => ({
                    ...prev,
                    storeName: val,
                    storeSlug: prev.storeSlug || val.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                  }));
                }}
                placeholder="e.g., Bharat Artisans & Co."
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-semibold text-slate-900"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Public Storefront URL Slug <span className="text-rose-500">*</span></label>
                <button
                  type="button"
                  onClick={() => handleCheckSlug(step1.storeSlug)}
                  disabled={isCheckingSlug}
                  className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isCheckingSlug ? 'animate-spin' : ''}`} />
                  <span>Check Availability</span>
                </button>
              </div>
              <div className="flex items-center rounded-2xl border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500">
                <span className="bg-slate-50 px-4 py-2.5 text-xs font-mono text-slate-500 border-r border-slate-200 shrink-0">
                  auramarket.com/store/
                </span>
                <input
                  type="text"
                  required
                  value={step1.storeSlug}
                  onChange={e => {
                    const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
                    setStep1(prev => ({ ...prev, storeSlug: slug }));
                    setSlugStatus(null);
                  }}
                  placeholder="bharat-artisans"
                  className="w-full px-4 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none bg-white"
                />
              </div>

              {slugStatus && (
                <div
                  className={`text-xs font-bold flex items-center gap-1.5 mt-1 ${
                    slugStatus.available ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {slugStatus.available ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  <span>{slugStatus.message}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Storefront Bio & Tagline</label>
              <textarea
                rows={3}
                value={step1.description}
                onChange={e => setStep1(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Tell shoppers about your heritage, product specialty, and commitment to authentic quality..."
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-medium text-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Customer Support Phone</label>
              <input
                type="text"
                value={step1.supportPhone}
                onChange={e => setStep1(prev => ({ ...prev, supportPhone: e.target.value }))}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-semibold text-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Customer Support Email</label>
              <input
                type="email"
                value={step1.supportEmail}
                onChange={e => setStep1(prev => ({ ...prev, supportEmail: e.target.value }))}
                placeholder="care@bharatartisans.com"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-semibold text-slate-900"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <span>{isSaving ? 'Saving...' : 'Save & Continue to Step 2'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: LEGAL BUSINESS ENTITY & TAX */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <form onSubmit={handleSaveStep2} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-amber-500" />
              <span>Step 2: Legal Business Entity & Tax Compliance</span>
            </h2>
            <p className="text-xs text-slate-500">
              Provide your government-registered business entity details, GSTIN, and corporate PAN.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Business Structure / Entity Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['Proprietorship', 'Partnership', 'Private Limited', 'Individual'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setStep2(prev => ({ ...prev, entityType: type }))}
                    className={`p-3 rounded-2xl border text-xs font-bold text-center transition-all ${
                      step2.entityType === type
                        ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-sm ring-1 ring-amber-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Registered Legal Entity Name <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={step2.legalName}
                onChange={e => setStep2(prev => ({ ...prev, legalName: e.target.value }))}
                placeholder="e.g., Bharat Artisans Retail Private Limited"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-semibold text-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Business PAN Number</label>
              <input
                type="text"
                maxLength={10}
                value={step2.panNumber}
                onChange={e => setStep2(prev => ({ ...prev, panNumber: e.target.value.toUpperCase() }))}
                placeholder="ABCDE1234F"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-mono font-bold text-slate-900 uppercase"
              />
              <span className="text-[10px] text-slate-400">10-character Indian Permanent Account Number</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">GSTIN (Goods &amp; Services Tax ID)</label>
              <input
                type="text"
                maxLength={15}
                value={step2.gstNumber}
                onChange={e => setStep2(prev => ({ ...prev, gstNumber: e.target.value.toUpperCase() }))}
                placeholder="29ABCDE1234F1Z5"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-mono font-bold text-slate-900 uppercase"
              />
              <span className="text-[10px] text-slate-400">15-character state-assigned GST identification</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Authorized Signatory Name</label>
              <input
                type="text"
                value={step2.authorizedSignatoryName}
                onChange={e => setStep2(prev => ({ ...prev, authorizedSignatoryName: e.target.value }))}
                placeholder="Full Name as on PAN Card"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-semibold text-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Signatory Mobile Phone</label>
              <input
                type="text"
                value={step2.authorizedSignatoryPhone}
                onChange={e => setStep2(prev => ({ ...prev, authorizedSignatoryPhone: e.target.value }))}
                placeholder="+91 98111 22334"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-semibold text-slate-900"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <span>{isSaving ? 'Saving...' : 'Save & Continue to Step 3'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: WAREHOUSE & PICKUP ADDRESS */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <form onSubmit={handleSaveStep3} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-500" />
              <span>Step 3: Warehouse & Courier Dispatch Hub</span>
            </h2>
            <p className="text-xs text-slate-500">
              Where will delivery couriers arrive to pick up customer packages and shipping manifests?
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Warehouse / Facility Label</label>
              <input
                type="text"
                value={step3.warehouseName}
                onChange={e => setStep3(prev => ({ ...prev, warehouseName: e.target.value }))}
                placeholder="e.g., Central Bhiwandi Logistics Center"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-semibold text-slate-900"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Street Address / Industrial Gala <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={step3.street}
                onChange={e => setStep3(prev => ({ ...prev, street: e.target.value }))}
                placeholder="Gala No. 4, Shree Balaji Industrial Estate, Western Express Highway"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-semibold text-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">City / District <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={step3.city}
                onChange={e => setStep3(prev => ({ ...prev, city: e.target.value }))}
                placeholder="e.g., Mumbai"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-semibold text-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">State <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={step3.state}
                onChange={e => setStep3(prev => ({ ...prev, state: e.target.value }))}
                placeholder="e.g., Maharashtra"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-semibold text-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">6-Digit Pincode <span className="text-rose-500">*</span></label>
              <input
                type="text"
                maxLength={6}
                required
                value={step3.pincode}
                onChange={e => setStep3(prev => ({ ...prev, pincode: e.target.value.replace(/[^0-9]/g, '') }))}
                placeholder="400001"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-mono font-bold text-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Dispatch Dispatcher Contact Phone</label>
              <input
                type="text"
                value={step3.phone}
                onChange={e => setStep3(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+91 98200 11223"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-semibold text-slate-900"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <span>{isSaving ? 'Saving...' : 'Save & Continue to Step 4'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: BANK DETAILS & KYC DOCUMENT VAULT */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <form onSubmit={handleSubmitApplication} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-500" />
              <span>Step 4: Bank Settlement Account &amp; KYC Vault</span>
            </h2>
            <p className="text-xs text-slate-500">
              Where will your automated sales payouts be disbursed? Attach your compliance proof documents.
            </p>
          </div>

          {/* Bank Fields */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-4">
            <div className="font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Building className="w-4 h-4 text-amber-600" />
              <span>Disbursement Bank Account</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">Account Beneficiary Holder Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={step4.accountHolder}
                  onChange={e => setStep4(prev => ({ ...prev, accountHolder: e.target.value }))}
                  placeholder="e.g., Bharat Artisans Retail Pvt Ltd"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-semibold text-slate-900 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Account Number <span className="text-rose-500">*</span></label>
                <input
                  type="password"
                  required
                  value={step4.accountNumber}
                  onChange={e => setStep4(prev => ({ ...prev, accountNumber: e.target.value }))}
                  placeholder="Enter full account number"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-mono font-bold text-slate-900 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Confirm Account Number <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={step4.confirmAccountNumber}
                  onChange={e => setStep4(prev => ({ ...prev, confirmAccountNumber: e.target.value }))}
                  placeholder="Re-enter account number"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-mono font-bold text-slate-900 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">IFSC Code <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  maxLength={11}
                  required
                  value={step4.ifscCode}
                  onChange={e => setStep4(prev => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))}
                  placeholder="HDFC0001234"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-mono font-bold text-slate-900 uppercase bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Bank Name &amp; Branch</label>
                <input
                  type="text"
                  value={step4.bankName}
                  onChange={e => setStep4(prev => ({ ...prev, bankName: e.target.value }))}
                  placeholder="HDFC Bank - Fort Branch"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-semibold text-slate-900 bg-white"
                />
              </div>
            </div>
          </div>

          {/* KYC Document Vault */}
          <div className="space-y-3">
            <div className="font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>Compliance Document Vault</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">GST Registration Certificate</span>
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-amber-100 text-amber-800">PDF / Image</span>
                </div>
                <input
                  type="text"
                  value={step4.gstCertificate}
                  onChange={e => setStep4(prev => ({ ...prev, gstCertificate: e.target.value }))}
                  placeholder="Document URL or Reference Link"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 bg-white"
                />
              </div>

              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Business PAN Card Copy</span>
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-blue-100 text-blue-800">PDF / Image</span>
                </div>
                <input
                  type="text"
                  value={step4.panCard}
                  onChange={e => setStep4(prev => ({ ...prev, panCard: e.target.value }))}
                  placeholder="Document URL or Reference Link"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 bg-white"
                />
              </div>

              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Cancelled Cheque / Bank Statement</span>
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Bank Proof</span>
                </div>
                <input
                  type="text"
                  value={step4.cancelledCheque}
                  onChange={e => setStep4(prev => ({ ...prev, cancelledCheque: e.target.value }))}
                  placeholder="Document URL or Reference Link"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 bg-white"
                />
              </div>

              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Signatory Government Photo ID</span>
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-purple-100 text-purple-800">Aadhaar / Passport</span>
                </div>
                <input
                  type="text"
                  value={step4.idProof}
                  onChange={e => setStep4(prev => ({ ...prev, idProof: e.target.value }))}
                  placeholder="Document URL or Reference Link"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Terms Agreement */}
          <div className="bg-amber-500/10 rounded-2xl p-4 border border-amber-500/20 flex items-start gap-3">
            <input
              type="checkbox"
              id="agreedTerms"
              checked={step4.agreedToTerms}
              onChange={e => setStep4(prev => ({ ...prev, agreedToTerms: e.target.checked }))}
              className="mt-1 w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
            />
            <label htmlFor="agreedTerms" className="text-xs font-medium text-slate-700 leading-relaxed">
              I certify that all legal business, GSTIN, and banking information submitted is genuine and authentic. I hereby accept the{' '}
              <span className="font-bold text-slate-900 underline cursor-pointer">AuraMarket Merchant Service Level Agreement (SLA)</span>, 7-day customer return policy, and platform commission terms.
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSaving ? 'Submitting Application...' : 'Submit Application for Verification'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
