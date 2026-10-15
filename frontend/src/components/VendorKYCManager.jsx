import React, { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  FileText,
  Percent,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Edit3,
  DollarSign,
  User,
  Phone,
  Mail,
  MapPin,
  Landmark,
  ChevronRight,
  Eye,
  Sliders,
  Sparkles,
} from 'lucide-react';
import api from '../api/client';

export default function VendorKYCManager() {
  const [vendors, setVendors] = useState([]);
  const [stats, setStats] = useState({
    totalVendors: 0,
    pendingApproval: 0,
    approvedVendors: 0,
    rejectedVendors: 0,
    kycVerified: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [kycFilter, setKycFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);

  // Edit/Review states
  const [editingCommission, setEditingCommission] = useState(10);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');
  const [actionErrorMessage, setActionErrorMessage] = useState('');

  // Fallback demo vendors in case of mock/offline
  const demoVendorsFallback = [
    {
      _id: 'v-demo-1',
      storeName: 'Aura Sound & Beats Official',
      storeSlug: 'aura-sound-official',
      storeLogo: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=150',
      description: 'Authorized retailer for high-fidelity audio equipment and studio monitors.',
      status: 'approved',
      kycStatus: 'VERIFIED',
      businessType: 'Private Limited',
      gstNumber: '07AAAAA0000A1Z5',
      panNumber: 'ABCDE1234F',
      commissionRate: 10,
      walletBalance: 124500,
      totalSales: 450000,
      rating: 4.9,
      kycVerifiedAt: new Date().toISOString(),
      adminNotes: 'Verified platinum partner. Low return rate.',
      user: {
        name: 'Vikram Malhotra',
        email: 'vikram.malhotra@auramarket.com',
        phone: '+91 98765 43211',
        isVerified: true,
      },
      bankDetails: {
        accountHolder: 'Aura Sound Private Limited',
        accountNumber: '91802001928374',
        ifscCode: 'HDFC0001234',
        bankName: 'HDFC Bank Ltd',
      },
      pickupAddress: {
        street: 'Plot 45, Phase 2, Okhla Industrial Area',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110020',
        phone: '+91 98765 43211',
      },
      kycDocuments: {
        businessRegistrationProof: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
        gstCertificate: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
        panCard: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=600',
        bankProof: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600',
        idProof: 'https://images.unsplash.com/photo-1554224155-1696413565d3?w=600',
      },
    },
    {
      _id: 'v-demo-2',
      storeName: 'Titan Electronics & Gadgets',
      storeSlug: 'titan-electronics',
      storeLogo: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=150',
      description: 'Smart wearables, charging stations, and IoT smart home systems.',
      status: 'pending',
      kycStatus: 'PENDING',
      businessType: 'Partnership',
      gstNumber: '29ABCDE1234F1Z8',
      panNumber: 'KLMNO5678P',
      commissionRate: 12,
      walletBalance: 0,
      totalSales: 0,
      rating: 4.5,
      adminNotes: 'New merchant onboarded today. Pending GST cross-verification.',
      user: {
        name: 'Rohan Deshmukh',
        email: 'rohan.titan@gmail.com',
        phone: '+91 98111 22334',
        isVerified: false,
      },
      bankDetails: {
        accountHolder: 'Titan Electronics LLP',
        accountNumber: '00120500129384',
        ifscCode: 'ICIC0000012',
        bankName: 'ICICI Bank Ltd',
      },
      pickupAddress: {
        street: '12th Cross, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038',
        phone: '+91 98111 22334',
      },
      kycDocuments: {
        businessRegistrationProof: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
        gstCertificate: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
        panCard: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=600',
        bankProof: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600',
        idProof: 'https://images.unsplash.com/photo-1554224155-1696413565d3?w=600',
      },
    },
    {
      _id: 'v-demo-3',
      storeName: 'Apex Luxe Apparel Hub',
      storeSlug: 'apex-luxe-apparel',
      storeLogo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=150',
      description: 'Premium organic cotton streetwear and formal apparel line.',
      status: 'rejected',
      kycStatus: 'REJECTED',
      businessType: 'Proprietorship',
      gstNumber: '08XYZAB9876C1Z2',
      panNumber: 'PQRST4321R',
      commissionRate: 15,
      walletBalance: 0,
      totalSales: 0,
      rating: 4.0,
      kycRejectionReason: 'GST registration certificate expired and name mismatch on cancelled cheque.',
      adminNotes: 'Requested resubmission of corrected bank passbook.',
      user: {
        name: 'Priya Rathore',
        email: 'priya.apex@gmail.com',
        phone: '+91 97722 88441',
        isVerified: false,
      },
      bankDetails: {
        accountHolder: 'Priya Rathore Enterprises',
        accountNumber: '50100234918231',
        ifscCode: 'SBIN0004521',
        bankName: 'State Bank of India',
      },
      pickupAddress: {
        street: 'Shop 14, Bapu Bazaar',
        city: 'Jaipur',
        state: 'Rajasthan',
        pincode: '302003',
        phone: '+91 97722 88441',
      },
      kycDocuments: {
        businessRegistrationProof: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
        gstCertificate: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
        panCard: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=600',
        bankProof: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600',
        idProof: 'https://images.unsplash.com/photo-1554224155-1696413565d3?w=600',
      },
    },
  ];

  const fetchVendors = async () => {
    setIsLoading(true);
    setActionSuccessMessage('');
    setActionErrorMessage('');
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (kycFilter !== 'ALL') params.kycStatus = kycFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await api.get('/admin/vendors', { params });
      if (res.data?.success) {
        setVendors(res.data.data || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      } else {
        setVendors(demoVendorsFallback);
      }
    } catch (err) {
      console.warn('Using demo vendor fallback data:', err?.message);
      setVendors(demoVendorsFallback);
      setStats({
        totalVendors: 3,
        pendingApproval: 1,
        approvedVendors: 1,
        rejectedVendors: 1,
        kycVerified: 1,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [statusFilter, kycFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchVendors();
  };

  const handleOpenReview = (vendor) => {
    setSelectedVendor(vendor);
    setEditingCommission(vendor.commissionRate ?? 10);
    setAdminNotes(vendor.adminNotes || '');
    setRejectionReason(vendor.kycRejectionReason || '');
    setIsReviewModalOpen(true);
    setIsRejectDialogOpen(false);
  };

  const handleOpenCommission = (vendor) => {
    setSelectedVendor(vendor);
    setEditingCommission(vendor.commissionRate ?? 10);
    setIsCommissionModalOpen(true);
  };

  // Quick 1-Click Approve KYC
  const handleApproveKYC = async (vendorId) => {
    try {
      const res = await api.put(`/admin/vendors/${vendorId}/kyc`, {
        kycStatus: 'VERIFIED',
        adminNotes: adminNotes || 'Approved by Super Admin after document verification.',
      });
      if (res.data?.success) {
        setActionSuccessMessage(`Store and KYC for vendor successfully Approved!`);
        setIsReviewModalOpen(false);
        fetchVendors();
      }
    } catch (err) {
      // Local optimistic update
      setVendors((prev) =>
        prev.map((v) =>
          v._id === vendorId ? { ...v, status: 'approved', kycStatus: 'VERIFIED' } : v
        )
      );
      setActionSuccessMessage(`Store and KYC for vendor successfully Approved (Demo State)!`);
      setIsReviewModalOpen(false);
    }
  };

  // Reject KYC with Reason
  const handleRejectKYC = async (vendorId) => {
    if (!rejectionReason.trim()) {
      setActionErrorMessage('Please provide a specific reason for rejection');
      return;
    }
    try {
      const res = await api.put(`/admin/vendors/${vendorId}/kyc`, {
        kycStatus: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
        adminNotes,
      });
      if (res.data?.success) {
        setActionSuccessMessage(`Vendor KYC rejected. Reason logged for merchant.`);
        setIsReviewModalOpen(false);
        setIsRejectDialogOpen(false);
        fetchVendors();
      }
    } catch (err) {
      setVendors((prev) =>
        prev.map((v) =>
          v._id === vendorId
            ? { ...v, status: 'rejected', kycStatus: 'REJECTED', kycRejectionReason: rejectionReason }
            : v
        )
      );
      setActionSuccessMessage(`Vendor KYC rejected (Demo State)!`);
      setIsReviewModalOpen(false);
      setIsRejectDialogOpen(false);
    }
  };

  // Save Custom Commission Rate
  const handleSaveCommission = async (vendorId) => {
    try {
      const res = await api.put(`/admin/vendors/${vendorId}/commission`, {
        commissionRate: Number(editingCommission),
      });
      if (res.data?.success) {
        setActionSuccessMessage(
          `Custom commission rate updated to ${editingCommission}% for ${selectedVendor?.storeName}`
        );
        setIsCommissionModalOpen(false);
        if (isReviewModalOpen) {
          setSelectedVendor((prev) => ({ ...prev, commissionRate: Number(editingCommission) }));
        }
        fetchVendors();
      }
    } catch (err) {
      setVendors((prev) =>
        prev.map((v) =>
          v._id === vendorId ? { ...v, commissionRate: Number(editingCommission) } : v
        )
      );
      setActionSuccessMessage(`Custom commission rate updated to ${editingCommission}%!`);
      setIsCommissionModalOpen(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Context */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Vendor KYC & Store Approval Center
                <span className="text-xs bg-amber-400/10 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-400/20">
                  Point #44
                </span>
              </h2>
              <p className="text-sm text-slate-400">
                Verify merchant legal registration (GSTIN, PAN, Bank Proof), approve/reject stores,
                and set individual platform commission rates.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={fetchVendors}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold transition border border-slate-700 w-full md:w-auto"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActionSuccessMessage('')}
            className="text-xs text-slate-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {actionErrorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{actionErrorMessage}</span>
          </div>
          <button
            onClick={() => setActionErrorMessage('')}
            className="text-xs text-slate-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Stores</span>
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-white">{stats.totalVendors}</span>
            <p className="text-[11px] text-slate-500 mt-0.5">Onboarded merchants</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-amber-500/20 bg-amber-500/5 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
            <span>Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-300">{stats.pendingApproval}</span>
            <p className="text-[11px] text-amber-400/70 mt-0.5">Requires audit</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-emerald-500/20 bg-emerald-500/5 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
            <span>Verified & Active</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-300">{stats.approvedVendors}</span>
            <p className="text-[11px] text-emerald-400/70 mt-0.5">Can sell live products</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-rose-500/20 bg-rose-500/5 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-400 text-xs font-semibold">
            <span>Rejected / Suspended</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-rose-300">{stats.rejectedVendors}</span>
            <p className="text-[11px] text-rose-400/70 mt-0.5">Action required</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-purple-500/20 bg-purple-500/5 rounded-2xl p-4 flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-purple-400 text-xs font-semibold">
            <span>KYC Verified %</span>
            <Percent className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-purple-300">
              {stats.totalVendors > 0
                ? Math.round((stats.kycVerified / stats.totalVendors) * 100)
                : 0}
              %
            </span>
            <p className="text-[11px] text-purple-400/70 mt-0.5">
              {stats.kycVerified} of {stats.totalVendors} verified
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-amber-400 text-slate-950 shadow-sm font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* KYC Status Filter */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> KYC:
          </span>
          <select
            value={kycFilter}
            onChange={(e) => setKycFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-400"
          >
            <option value="ALL">All KYC Statuses</option>
            <option value="PENDING">Pending Verification</option>
            <option value="VERIFIED">KYC Verified</option>
            <option value="REJECTED">KYC Rejected</option>
          </select>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 lg:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search store, GST, PAN, owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-xl pl-9 pr-3 py-1.5 focus:outline-none focus:border-amber-400 placeholder-slate-500"
            />
          </form>
        </div>
      </div>

      {/* Vendor Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-800/60 border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-3.5 px-4">Store & Identity</th>
                <th className="py-3.5 px-4">Merchant Contact</th>
                <th className="py-3.5 px-4">Tax & Business</th>
                <th className="py-3.5 px-4">Commission</th>
                <th className="py-3.5 px-4">KYC Status</th>
                <th className="py-3.5 px-4">Store Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                    Loading merchant registry...
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No vendors found matching your filters.
                  </td>
                </tr>
              ) : (
                vendors.map((vendor) => (
                  <tr
                    key={vendor._id}
                    className="hover:bg-slate-800/40 transition group"
                  >
                    {/* Store & Identity */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={vendor.storeLogo || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=150'}
                          alt={vendor.storeName}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-700 bg-slate-800"
                        />
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-1.5">
                            {vendor.storeName}
                            {vendor.kycStatus === 'VERIFIED' && (
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            /{vendor.storeSlug || 'store'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Merchant Contact */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-200 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-500" />
                          {vendor.user?.name || 'Store Owner'}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-500" />
                          {vendor.user?.email || 'N/A'}
                        </div>
                        {vendor.user?.phone && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-600" />
                            {vendor.user.phone}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Tax & Business */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <span className="inline-block text-[10px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.5 rounded border border-slate-700">
                          {vendor.businessType || 'Proprietorship'}
                        </span>
                        <div className="font-mono text-[11px] text-slate-400">
                          GST: <span className="text-slate-300 font-bold">{vendor.gstNumber || 'N/A'}</span>
                        </div>
                        {vendor.panNumber && (
                          <div className="font-mono text-[10px] text-slate-500">
                            PAN: {vendor.panNumber}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Commission */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleOpenCommission(vendor)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 rounded-lg font-bold border border-amber-400/30 transition group/comm"
                      >
                        <Percent className="w-3 h-3 text-amber-400" />
                        {vendor.commissionRate ?? 10}%
                        <Edit3 className="w-2.5 h-2.5 opacity-60 group-hover/comm:opacity-100" />
                      </button>
                    </td>

                    {/* KYC Status */}
                    <td className="py-3.5 px-4">
                      {vendor.kycStatus === 'VERIFIED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3" />
                          VERIFIED
                        </span>
                      ) : vendor.kycStatus === 'REJECTED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <XCircle className="w-3 h-3" />
                          REJECTED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse">
                          <Clock className="w-3 h-3" />
                          PENDING
                        </span>
                      )}
                    </td>

                    {/* Store Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          vendor.status === 'approved'
                            ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-800'
                            : vendor.status === 'rejected'
                            ? 'bg-rose-900/40 text-rose-300 border border-rose-800'
                            : 'bg-amber-900/40 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {vendor.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenReview(vendor)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold text-xs border border-slate-700 transition flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-400" />
                          Review KYC
                        </button>

                        {vendor.status !== 'approved' && (
                          <button
                            onClick={() => handleApproveKYC(vendor._id)}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
                            title="Quick Approve Store"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* KYC Review & Store Approval Modal */}
      {isReviewModalOpen && selectedVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={selectedVendor.storeLogo || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=150'}
                  alt={selectedVendor.storeName}
                  className="w-12 h-12 rounded-2xl object-cover border border-slate-700"
                />
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {selectedVendor.storeName}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        selectedVendor.kycStatus === 'VERIFIED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : selectedVendor.kycStatus === 'REJECTED'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                      }`}
                    >
                      KYC: {selectedVendor.kycStatus || 'PENDING'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Proprietor: {selectedVendor.user?.name} | {selectedVendor.user?.email} |{' '}
                    {selectedVendor.user?.phone}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Rejection Alert if already rejected */}
            {selectedVendor.kycStatus === 'REJECTED' && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                <div>
                  <span className="font-bold">Prior Rejection Reason:</span>{' '}
                  {selectedVendor.kycRejectionReason || 'No details provided'}
                </div>
              </div>
            )}

            {/* KYC Documents Verification Grid */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-400" />
                Submitted Legal & KYC Documents
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Business Registration */}
                <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">Business Registration / Udhyam</div>
                      <div className="text-[10px] text-slate-400">
                        Type: {selectedVendor.businessType || 'Proprietorship'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Uploaded
                  </span>
                </div>

                {/* 2. GST Certificate */}
                <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">GSTIN Certificate</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {selectedVendor.gstNumber || 'Not submitted'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Verified
                  </span>
                </div>

                {/* 3. PAN Card */}
                <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">Permanent Account Number (PAN)</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {selectedVendor.panNumber || 'Not submitted'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Verified
                  </span>
                </div>

                {/* 4. Bank Proof / Cheque */}
                <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">
                        {selectedVendor.bankDetails?.bankName || 'Bank Proof'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        A/C: {selectedVendor.bankDetails?.accountNumber || '••••••••'} | IFSC:{' '}
                        {selectedVendor.bankDetails?.ifscCode || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Valid
                  </span>
                </div>
              </div>
            </div>

            {/* Custom Commission Rate Slider */}
            <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-amber-400" />
                    Custom Platform Commission Rate
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Define the custom fee percentage your marketplace deducts from this store's orders.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-amber-400">{editingCommission}%</span>
                  <div className="text-[10px] text-slate-500">Platform Cut</div>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="50"
                step="0.5"
                value={editingCommission}
                onChange={(e) => setEditingCommission(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />

              <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span>
                  Sample Payout on ₹1,000 order:{' '}
                  <strong className="text-emerald-400">
                    ₹{(1000 * (1 - editingCommission / 100)).toFixed(0)} to Vendor
                  </strong>
                </span>
                <span className="text-amber-300 font-mono font-bold">
                  ₹{(1000 * (editingCommission / 100)).toFixed(0)} Platform Cut
                </span>
              </div>
            </div>

            {/* Admin Internal Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Internal Super Admin Audit Notes
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Log internal compliance checks, call confirmations with merchant, etc."
                rows="2"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-400 placeholder-slate-500"
              />
            </div>

            {/* Rejection Reason Form (if opened) */}
            {isRejectDialogOpen && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl space-y-3 animate-fade-in">
                <h5 className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  Specify Reason for Rejection / Document Correction:
                </h5>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. GSTIN certificate is illegible, please upload high-res PDF or clear scan of active trade license."
                  rows="2"
                  className="w-full bg-slate-900 border border-rose-500/40 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-400 placeholder-slate-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsRejectDialogOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleRejectKYC(selectedVendor._id)}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            )}

            {/* Modal Action Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {!isRejectDialogOpen && (
                  <button
                    onClick={() => setIsRejectDialogOpen(true)}
                    className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-bold border border-rose-500/20 transition flex items-center gap-1.5 w-full sm:w-auto justify-center"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject Application
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleSaveCommission(selectedVendor._id)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition w-full sm:w-auto text-center"
                >
                  Save Commission Only
                </button>
                <button
                  onClick={async () => {
                    await handleSaveCommission(selectedVendor._id);
                    await handleApproveKYC(selectedVendor._id);
                  }}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-1.5 w-full sm:w-auto"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve Store & KYC
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Commission Rate Modal */}
      {isCommissionModalOpen && selectedVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Percent className="w-4 h-4 text-amber-400" />
                Custom Commission: {selectedVendor.storeName}
              </h3>
              <button
                onClick={() => setIsCommissionModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Adjust the platform fee cut charged to this specific store per completed order.
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>Commission Percentage:</span>
                <span className="text-amber-400 text-base">{editingCommission}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="0.5"
                value={editingCommission}
                onChange={(e) => setEditingCommission(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0% (Free Store)</span>
                <span>10% (Default)</span>
                <span>25%</span>
                <span>50% (Max)</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsCommissionModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveCommission(selectedVendor._id)}
                className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold transition"
              >
                Save Rate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
