import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Database,
  Server,
  ShieldCheck,
  Layers,
  ArrowRight,
  ArrowLeft,
  Lock,
  Unlock,
  RefreshCw,
  Sparkles,
  ExternalLink,
  BookOpen,
  Eye,
  EyeOff,
  Check,
  Copy,
  Cpu,
  HardDrive,
  FileCheck,
  Store,
  Mail,
  User,
  KeyRound,
  Radio,
} from 'lucide-react';
import api from '../api/client';

export const InstallWizard = ({ onGoToStore, onGoToAdmin, onOpenDocs }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialChecking, setInitialChecking] = useState(true);

  // Status & Lock state
  const [installStatus, setInstallStatus] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [unlockSecret, setUnlockSecret] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [showUnlockForm, setShowUnlockForm] = useState(false);

  // Step 1: License Agreement
  const [acceptedLicense, setAcceptedLicense] = useState(true);

  // Step 2: System Requirements
  const [reqChecks, setReqChecks] = useState([]);
  const [reqAllPassed, setReqAllPassed] = useState(false);
  const [reqLoading, setReqLoading] = useState(false);

  // Step 3: Database Settings
  const [dbMode, setDbMode] = useState('uri'); // 'uri' | 'params'
  const [mongoUri, setMongoUri] = useState('mongodb://127.0.0.1:27017/ecommerce_marketplace');
  const [dbParams, setDbParams] = useState({
    host: '127.0.0.1',
    port: '27017',
    dbName: 'ecommerce_marketplace',
    username: '',
    password: '',
    authSource: '',
  });
  const [dbTesting, setDbTesting] = useState(false);
  const [dbTestResult, setDbTestResult] = useState(null);

  // Step 4: Admin & Store Profile
  const [adminProfile, setAdminProfile] = useState({
    adminName: 'Super Admin',
    adminEmail: 'admin@auramarket.com',
    adminPassword: 'admin123456',
    adminPhone: '9876543210',
    platformName: 'AuraMarket',
    defaultCurrency: 'INR',
    supportEmail: 'support@auramarket.com',
    seedMode: 'showroom', // 'showroom' | 'clean'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Step 5: Execution State
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [installStatusText, setInstallStatusText] = useState('');
  const [installSuccessData, setInstallSuccessData] = useState(null);
  const [installError, setInstallError] = useState('');

  // 1. Initial Status Check
  const checkStatus = async () => {
    setInitialChecking(true);
    try {
      const res = await api.get('/install/status');
      if (res.data?.success && res.data?.data) {
        setInstallStatus(res.data.data);
        setIsLocked(res.data.data.isLocked);
      }
    } catch (err) {
      console.warn('Failed to fetch install status:', err.message);
    } finally {
      setInitialChecking(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  // 2. Fetch System Requirements
  const fetchRequirements = async () => {
    setReqLoading(true);
    try {
      const res = await api.get('/install/check-requirements');
      if (res.data?.success && res.data?.data) {
        setReqChecks(res.data.data.checks || []);
        setReqAllPassed(res.data.data.allPassed);
      }
    } catch (err) {
      console.error('Requirements check failed:', err);
    } finally {
      setReqLoading(false);
    }
  };

  useEffect(() => {
    if (currentStep === 2) {
      fetchRequirements();
    }
  }, [currentStep]);

  // 3. Test Database Connection
  const handleTestDatabase = async () => {
    setDbTesting(true);
    setDbTestResult(null);
    try {
      const payload = dbMode === 'uri' ? { mongoUri } : dbParams;
      const res = await api.post('/install/test-db', payload);
      if (res.data?.success) {
        setDbTestResult({
          success: true,
          message: res.data.data?.message || 'Database connection successful!',
          latencyMs: res.data.data?.latencyMs,
          serverVersion: res.data.data?.serverVersion,
        });
      }
    } catch (err) {
      setDbTestResult({
        success: false,
        message: err.response?.data?.message || err.message || 'Database connection failed. Please check host & credentials.',
      });
    } finally {
      setDbTesting(false);
    }
  };

  // 4. Execute Installation
  const handleRunInstallation = async () => {
    setInstalling(true);
    setInstallError('');
    setInstallProgress(10);
    setInstallStatusText('Validating system environment and storage...');

    try {
      setTimeout(() => {
        setInstallProgress(35);
        setInstallStatusText('Establishing database schemas & connection pools...');
      }, 500);

      setTimeout(() => {
        setInstallProgress(65);
        setInstallStatusText('Provisioning Super Admin profile & encryption keys...');
      }, 1000);

      setTimeout(() => {
        setInstallProgress(85);
        setInstallStatusText(
          adminProfile.seedMode === 'showroom'
            ? 'Seeding full multi-vendor showroom catalog & verified demo merchants...'
            : 'Configuring clean enterprise production catalogs...'
        );
      }, 1500);

      const payload = {
        ...adminProfile,
        mongoUri: dbMode === 'uri' ? mongoUri : undefined,
      };

      const res = await api.post('/install/setup', payload);

      if (res.data?.success) {
        setInstallProgress(100);
        setInstallStatusText('Installation finalized successfully! Lock cryptoseal engaged.');
        setInstallSuccessData(res.data.data);
        setIsLocked(true);
      }
    } catch (err) {
      setInstallError(err.response?.data?.message || err.message || 'Installation execution failed.');
    } finally {
      setInstalling(false);
    }
  };

  // 5. Handle Admin Unlock
  const handleUnlockInstallation = async () => {
    setLoading(true);
    setUnlockError('');
    try {
      const res = await api.post('/install/unlock', { secretKey: unlockSecret });
      if (res.data?.success) {
        setIsLocked(false);
        setShowUnlockForm(false);
        setCurrentStep(1);
        checkStatus();
      }
    } catch (err) {
      setUnlockError(err.response?.data?.message || 'Unauthorized: Invalid unlock secret.');
    } finally {
      setLoading(false);
    }
  };

  const stepsList = [
    { number: 1, title: 'Welcome & License' },
    { number: 2, title: 'Server Audit' },
    { number: 3, title: 'Database' },
    { number: 4, title: 'Admin & Store' },
    { number: 5, title: 'Finalize' },
  ];

  if (initialChecking) {
    return (
      <div className="min-h-[600px] flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-slate-400 font-medium text-sm">Inspecting platform installation state...</p>
        </div>
      </div>
    );
  }

  // If already locked and not completed in this immediate session
  if (isLocked && !installSuccessData) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12">
        <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div className="text-center space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              Platform Successfully Installed
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight">System Locked for Production</h1>
            <p className="text-slate-400 text-xs sm:text-sm">
              AuraMarket Multi-Vendor Engine is fully installed and secured. To safeguard production databases and configurations, the Web Setup Wizard is locked.
            </p>
          </div>

          <div className="bg-slate-950/70 rounded-2xl border border-slate-800 p-4 text-xs space-y-2.5">
            <div className="flex items-center justify-between text-slate-400">
              <span>Platform Version:</span>
              <span className="text-slate-200 font-mono font-bold">{installStatus?.lockDetails?.version || '2.5.0-ENTERPRISE'}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Installed Timestamp:</span>
              <span className="text-slate-200 font-mono">
                {installStatus?.lockDetails?.installedAt ? new Date(installStatus.lockDetails.installedAt).toLocaleString() : 'Active'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Node.js Engine:</span>
              <span className="text-slate-200 font-mono">{installStatus?.nodeVersion || process.version}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Database Status:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                Connected
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={onGoToAdmin}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
            >
              <span>Super Admin Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onGoToStore}
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center gap-2 border border-slate-700 transition-all"
            >
              <span>Customer Storefront</span>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="pt-4 border-t border-slate-800/80 text-center space-y-3">
            <button
              onClick={() => setShowUnlockForm(!showUnlockForm)}
              className="text-xs font-semibold text-slate-500 hover:text-amber-400 flex items-center justify-center gap-1.5 mx-auto transition-colors"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>{showUnlockForm ? 'Hide Reconfiguration Tool' : 'Need to re-run setup? Unlock with Secret Key'}</span>
            </button>

            {showUnlockForm && (
              <div className="pt-3 space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800 text-left animate-fade-in">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Admin Unlock Master Secret
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Enter server master secret key..."
                    value={unlockSecret}
                    onChange={e => setUnlockSecret(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={handleUnlockInstallation}
                    disabled={loading || !unlockSecret}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-lg transition-all"
                  >
                    {loading ? 'Unlocking...' : 'Unlock'}
                  </button>
                </div>
                {unlockError && <p className="text-[11px] text-rose-400 font-medium">{unlockError}</p>}
                <p className="text-[10px] text-slate-500">
                  Tip: Default master key is configured in <code className="text-amber-400">INSTALL_OVERRIDE_SECRET</code> or delete <code className="text-amber-400">backend/INSTALLED.lock</code> manually via terminal/cPanel.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur sticky top-0 z-30 px-4 sm:px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black text-lg flex items-center justify-center shadow-lg shadow-amber-500/20">
              A
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-2">
                <span>AuraMarket Web Installer</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase border border-amber-500/20">
                  v2.5 Enterprise
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 hidden sm:block">Automated 1-Click Multi-Vendor Platform Setup Wizard</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenDocs}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Setup Guide</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Wizard Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col justify-center">
        {/* Step Progress Indicators */}
        <div className="mb-8">
          <div className="grid grid-cols-5 gap-2 sm:gap-4 relative">
            {stepsList.map(step => {
              const isCompleted = currentStep > step.number || installSuccessData;
              const isCurrent = currentStep === step.number && !installSuccessData;

              return (
                <div key={step.number} className="flex flex-col items-center gap-2 text-center">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-black transition-all ${
                      isCompleted
                        ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                        : isCurrent
                        ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-500/20 shadow-lg shadow-amber-500/20'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" /> : step.number}
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs font-bold truncate max-w-full ${
                      isCurrent ? 'text-amber-400' : isCompleted ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Wizard Step Card Content */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-10">
          {/* STEP 1: Welcome & License Terms */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Step 1 of 5
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Welcome to AuraMarket Installation
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Thank you for purchasing AuraMarket! This interactive installer will guide you through connecting your database, validating server permissions, setting up your Super Administrator account, and initializing your multi-vendor marketplace in under 60 seconds.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-2">
                    <Store className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-black text-white">Full Multi-Vendor</h4>
                  <p className="text-[11px] text-slate-400">Independent vendor stores, staff delegation, automated commission splits.</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-black text-white">Enterprise Security</h4>
                  <p className="text-[11px] text-slate-400">JWT, RBAC guardrails, fraud risk scoring, and zero-compromise audits.</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-2">
                    <Database className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-black text-white">Zero Setup Overhead</h4>
                  <p className="text-[11px] text-slate-400">Works with MongoDB Atlas, local MongoDB, or zero-config in-memory fallback.</p>
                </div>
              </div>

              {/* License Agreement Box */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Envato / CodeCanyon License Terms</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">Standard / Extended License</span>
                </h4>
                <div className="h-28 overflow-y-auto text-xs text-slate-400 space-y-2 pr-2 font-mono bg-slate-900/50 p-3 rounded-xl border border-slate-800/80">
                  <p>1. By installing this software, you agree to the Envato Regular or Extended License terms.</p>
                  <p>2. You are licensed to use this item on one single end product / domain unless an Extended License is acquired.</p>
                  <p>3. Resale, redistribution, or unauthorized sublicensing of raw platform source files is strictly prohibited.</p>
                  <p>4. All trademarks, brands, and registered copyrights belong to their respective commercial owners.</p>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={acceptedLicense}
                    onChange={e => setAcceptedLicense(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-800 border-slate-700"
                  />
                  <span className="text-xs font-semibold text-slate-300 select-none">
                    I have read and agree to the CodeCanyon terms and licensing agreement
                  </span>
                </label>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setCurrentStep(2)}
                  disabled={!acceptedLicense}
                  className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                >
                  <span>Check Server Requirements</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Server Audit & Requirements */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4" />
                  Step 2 of 5
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Server Environment & Compatibility Audit
                </h2>
                <p className="text-sm text-slate-400">
                  Verifying server runtime, memory thresholds, write permissions, and cryptographic capabilities.
                </p>
              </div>

              {reqLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                  <p className="text-xs text-slate-400">Auditing server dependencies...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reqChecks.map(check => {
                    const isPass = check.status === 'PASS';
                    const isWarn = check.status === 'WARN';

                    return (
                      <div
                        key={check.id}
                        className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white">{check.title}</span>
                            {check.critical && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[9px] font-black uppercase border border-rose-500/20">
                                Required
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">{check.description}</p>
                          <p className="text-[11px] font-mono text-slate-500">
                            Current: <span className="text-slate-300 font-semibold">{check.current}</span> (Recommended: {check.required})
                          </p>
                        </div>

                        <div className="flex items-center self-start sm:self-center">
                          {isPass && (
                            <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" />
                              PASSED
                            </span>
                          )}
                          {isWarn && (
                            <span className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4" />
                              WARNING
                            </span>
                          )}
                          {!isPass && !isWarn && (
                            <span className="px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-black flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4" />
                              FAILED
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    onClick={fetchRequirements}
                    disabled={reqLoading}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${reqLoading ? 'animate-spin' : ''}`} />
                    <span>Re-Check</span>
                  </button>

                  <button
                    onClick={() => setCurrentStep(3)}
                    disabled={!reqAllPassed}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                  >
                    <span>Configure Database</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Database Configuration */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-4 h-4" />
                  Step 3 of 5
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Database Configuration & Connection Test
                </h2>
                <p className="text-sm text-slate-400">
                  Provide your MongoDB cluster credentials. Works seamlessly with MongoDB Atlas, local server, or cPanel Node deployments.
                </p>
              </div>

              {/* Mode Toggle */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 max-w-xs">
                <button
                  onClick={() => setDbMode('uri')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                    dbMode === 'uri' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Connection URI
                </button>
                <button
                  onClick={() => setDbMode('params')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                    dbMode === 'params' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Discrete Fields
                </button>
              </div>

              {dbMode === 'uri' ? (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300">
                    MongoDB Connection URI String <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={mongoUri}
                    onChange={e => {
                      setMongoUri(e.target.value);
                      setDbTestResult(null);
                    }}
                    placeholder="mongodb://username:password@localhost:27017/ecommerce_marketplace"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs sm:text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <p className="text-[11px] text-slate-500">
                    Example: <code className="text-slate-400">mongodb://127.0.0.1:27017/ecommerce_marketplace</code> or MongoDB Atlas <code className="text-slate-400">mongodb+srv://user:pass@cluster0.mongodb.net/marketplace</code>
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-300">Host</label>
                    <input
                      type="text"
                      value={dbParams.host}
                      onChange={e => setDbParams({ ...dbParams, host: e.target.value })}
                      placeholder="127.0.0.1"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-300">Port</label>
                    <input
                      type="text"
                      value={dbParams.port}
                      onChange={e => setDbParams({ ...dbParams, port: e.target.value })}
                      placeholder="27017"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-300">Database Name</label>
                    <input
                      type="text"
                      value={dbParams.dbName}
                      onChange={e => setDbParams({ ...dbParams, dbName: e.target.value })}
                      placeholder="ecommerce_marketplace"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-300">Username (Optional)</label>
                    <input
                      type="text"
                      value={dbParams.username}
                      onChange={e => setDbParams({ ...dbParams, username: e.target.value })}
                      placeholder="db_user"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300">Password (Optional)</label>
                    <input
                      type="password"
                      value={dbParams.password}
                      onChange={e => setDbParams({ ...dbParams, password: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              )}

              {/* Test Connection Button & Result */}
              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  onClick={handleTestDatabase}
                  disabled={dbTesting}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-700 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${dbTesting ? 'animate-spin' : ''}`} />
                  <span>{dbTesting ? 'Testing Connectivity...' : 'Test Database Connection'}</span>
                </button>

                {dbTestResult && (
                  <div
                    className={`p-4 rounded-2xl border text-xs flex items-start gap-3 animate-fade-in ${
                      dbTestResult.success
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {dbTestResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className="font-bold">{dbTestResult.message}</p>
                      {dbTestResult.latencyMs !== undefined && (
                        <p className="text-[11px] font-mono opacity-80">
                          Ping Latency: {dbTestResult.latencyMs}ms • Engine Version: {dbTestResult.serverVersion || 'Active'}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  onClick={() => setCurrentStep(4)}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                >
                  <span>Admin & Store Profile</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Admin & Store Profile */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  Step 4 of 5
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Super Administrator & Marketplace Profile
                </h2>
                <p className="text-sm text-slate-400">
                  Configure your primary administrative owner account and foundational marketplace branding.
                </p>
              </div>

              {/* Admin Account Fields */}
              <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Super Administrator Account</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-300">Full Name</label>
                    <input
                      type="text"
                      value={adminProfile.adminName}
                      onChange={e => setAdminProfile({ ...adminProfile, adminName: e.target.value })}
                      placeholder="Super Admin"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-300">Email Address (Login)</label>
                    <input
                      type="email"
                      value={adminProfile.adminEmail}
                      onChange={e => setAdminProfile({ ...adminProfile, adminEmail: e.target.value })}
                      placeholder="admin@yourdomain.com"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-300">Admin Password (Min 8 chars)</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={adminProfile.adminPassword}
                        onChange={e => setAdminProfile({ ...adminProfile, adminPassword: e.target.value })}
                        placeholder="••••••••••••"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 pr-10 text-xs text-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-300">Mobile Number (For Alerts)</label>
                    <input
                      type="text"
                      value={adminProfile.adminPhone}
                      onChange={e => setAdminProfile({ ...adminProfile, adminPhone: e.target.value })}
                      placeholder="9876543210"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Marketplace Branding */}
              <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Store className="w-4 h-4 text-emerald-400" />
                  <span>Marketplace Profile & Branding</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-300">Platform Name</label>
                    <input
                      type="text"
                      value={adminProfile.platformName}
                      onChange={e => setAdminProfile({ ...adminProfile, platformName: e.target.value })}
                      placeholder="AuraMarket"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-300">Default Currency</label>
                    <select
                      value={adminProfile.defaultCurrency}
                      onChange={e => setAdminProfile({ ...adminProfile, defaultCurrency: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="INR">INR (₹ - Indian Rupee)</option>
                      <option value="USD">USD ($ - US Dollar)</option>
                      <option value="EUR">EUR (€ - Euro)</option>
                      <option value="GBP">GBP (£ - British Pound)</option>
                      <option value="AED">AED (د.إ - UAE Dirham)</option>
                      <option value="SAR">SAR (﷼ - Saudi Riyal)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-300">Support Email</label>
                    <input
                      type="email"
                      value={adminProfile.supportEmail}
                      onChange={e => setAdminProfile({ ...adminProfile, supportEmail: e.target.value })}
                      placeholder="support@auramarket.com"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Seed Mode Selector */}
              <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  <span>Initialization Mode & Demo Data</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      adminProfile.seedMode === 'showroom'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-200 ring-2 ring-amber-500/20'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="seedMode"
                      value="showroom"
                      checked={adminProfile.seedMode === 'showroom'}
                      onChange={() => setAdminProfile({ ...adminProfile, seedMode: 'showroom' })}
                      className="mt-1 text-amber-500 focus:ring-amber-500"
                    />
                    <div className="space-y-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">Full Showroom Demo Data</span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 text-[9px] font-black uppercase">
                          Recommended
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Includes 30+ products across Electronics & Fashion, 3 verified demo merchant stores, courier riders, demo coupons, and flash deals.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      adminProfile.seedMode === 'clean'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-200 ring-2 ring-amber-500/20'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="seedMode"
                      value="clean"
                      checked={adminProfile.seedMode === 'clean'}
                      onChange={() => setAdminProfile({ ...adminProfile, seedMode: 'clean' })}
                      className="mt-1 text-amber-500 focus:ring-amber-500"
                    />
                    <div className="space-y-1 text-left">
                      <span className="text-xs font-black text-white">Clean Production Install</span>
                      <p className="text-[11px] text-slate-400">
                        Creates empty product catalogs and vendor registries. Best for launching live client stores from scratch without demo content.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  onClick={() => setCurrentStep(5)}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                >
                  <span>Review & Install Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Finalize & Installation Execution */}
          {currentStep === 5 && (
            <div className="space-y-6">
              {!installSuccessData ? (
                <>
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      Step 5 of 5
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      Ready to Launch AuraMarket
                    </h2>
                    <p className="text-sm text-slate-400">
                      Review your installation configuration summary before applying persistent setup.
                    </p>
                  </div>

                  {/* Summary Box */}
                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-400">
                      <div>
                        <span className="block text-[11px] text-slate-500">Platform Name:</span>
                        <strong className="text-slate-200 text-sm font-black">{adminProfile.platformName}</strong>
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-500">Default Currency:</span>
                        <strong className="text-slate-200 text-sm font-mono">{adminProfile.defaultCurrency}</strong>
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-500">Admin Email:</span>
                        <strong className="text-slate-200">{adminProfile.adminEmail}</strong>
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-500">Installation Mode:</span>
                        <span className="text-amber-400 font-bold uppercase">
                          {adminProfile.seedMode === 'showroom' ? 'Showroom Demo Data' : 'Clean Production'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Execution Progress & Status */}
                  {installing && (
                    <div className="space-y-3 p-5 rounded-2xl bg-slate-950/80 border border-slate-800">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                        <span className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                          <span>{installStatusText}</span>
                        </span>
                        <span className="font-mono text-amber-400">{installProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all duration-300 shadow-lg shadow-amber-500/50"
                          style={{ width: `${installProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {installError && (
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                      <p>{installError}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                    <button
                      onClick={() => setCurrentStep(4)}
                      disabled={installing}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>

                    <button
                      onClick={handleRunInstallation}
                      disabled={installing}
                      className="px-8 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-sm flex items-center gap-2 shadow-xl shadow-amber-500/25 transition-all"
                    >
                      {installing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Executing Setup...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Execute 1-Click Installation</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                /* SUCCESS SCREEN */
                <div className="space-y-6 text-center py-4 animate-scale-up">
                  <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>

                  <div className="space-y-2">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-black uppercase tracking-wider border border-emerald-500/20 inline-block">
                      🎉 Setup Succeeded
                    </span>
                    <h2 className="text-3xl font-black text-white tracking-tight">
                      AuraMarket is Live & Ready!
                    </h2>
                    <p className="text-sm text-slate-400 max-w-lg mx-auto">
                      Your enterprise multi-vendor marketplace engine has been initialized successfully. The system lock is engaged to safeguard your deployment.
                    </p>
                  </div>

                  {/* Credentials Dossier */}
                  <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left text-xs space-y-2.5">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Administrator Email:</span>
                      <strong className="text-slate-100 font-mono">{installSuccessData.adminEmail}</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Super Admin Portal:</span>
                      <strong className="text-amber-400 font-mono">/admin</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Storefront Portal:</span>
                      <strong className="text-slate-100 font-mono">/</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Lock Cryptoseal:</span>
                      <span className="text-emerald-400 font-bold font-mono">INSTALLED.lock active</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto pt-2">
                    <button
                      onClick={onGoToAdmin}
                      className="py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                    >
                      <span>Enter Super Admin Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={onGoToStore}
                      className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center gap-2 border border-slate-700 transition-all"
                    >
                      <span>Visit Storefront</span>
                      <ExternalLink className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>AuraMarket Enterprise Multi-Vendor Platform © 2026. All rights reserved.</span>
          <span className="text-amber-400 font-mono text-[11px]">Ready for Envato / CodeCanyon Submission</span>
        </div>
      </footer>
    </div>
  );
};
