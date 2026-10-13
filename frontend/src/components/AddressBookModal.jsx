import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Home,
  Briefcase,
  Building2,
  Plus,
  Check,
  Star,
  Trash2,
  Edit3,
  X,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import api from '../api/client';

export default function AddressBookModal({
  isOpen,
  onClose,
  selectedAddressId,
  onSelectAddress,
}) {
  const [addresses, setAddresses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'add' | 'edit'
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Form State
  const initialFormState = {
    _id: '',
    recipientName: '',
    phone: '',
    alternatePhone: '',
    street: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    type: 'HOME',
    isDefault: false,
  };
  const [formData, setFormData] = useState(initialFormState);
  const [formError, setFormError] = useState('');

  // Fallback default address if backend is unreachable or user is in demo mode
  const fallbackAddress = {
    _id: 'addr_demo_default',
    type: 'HOME',
    recipientName: 'Aman Sharma',
    phone: '9876543214',
    alternatePhone: '9811223344',
    street: 'Flat 402, Green Valley Apartments, Sector 62',
    landmark: 'Near Metro Station Gate 2',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110001',
    isDefault: true,
  };

  // Fetch addresses on modal open
  const loadAddresses = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/auth/addresses');
      if (res.data?.success && Array.isArray(res.data.addresses)) {
        if (res.data.addresses.length > 0) {
          setAddresses(res.data.addresses);
        } else {
          // If empty, offer fallback
          setAddresses([fallbackAddress]);
        }
      } else {
        setAddresses([fallbackAddress]);
      }
    } catch (_) {
      // Fallback to local stored addresses or default demo
      const saved = localStorage.getItem('auramarket_saved_addresses');
      if (saved) {
        try {
          setAddresses(JSON.parse(saved));
        } catch {
          setAddresses([fallbackAddress]);
        }
      } else {
        setAddresses([fallbackAddress]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAddresses();
      setViewMode('list');
      setFormError('');
      setFeedback(null);
    }
  }, [isOpen]);

  // Sync to localStorage as backup
  useEffect(() => {
    if (addresses.length > 0) {
      localStorage.setItem('auramarket_saved_addresses', JSON.stringify(addresses));
    }
  }, [addresses]);

  const showToast = (msg, type = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleOpenAdd = () => {
    setFormData({
      ...initialFormState,
      type: 'HOME',
      isDefault: addresses.length === 0,
    });
    setFormError('');
    setViewMode('add');
  };

  const handleOpenEdit = (addr) => {
    setFormData({
      _id: addr._id,
      recipientName: addr.recipientName || '',
      phone: addr.phone || '',
      alternatePhone: addr.alternatePhone || '',
      street: addr.street || '',
      landmark: addr.landmark || '',
      city: addr.city || '',
      state: addr.state || '',
      pincode: addr.pincode || '',
      type: addr.type || 'HOME',
      isDefault: Boolean(addr.isDefault),
    });
    setFormError('');
    setViewMode('edit');
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setFormError('');

    // Validation
    if (!formData.recipientName.trim()) {
      setFormError('Please enter recipient full name');
      return;
    }
    if (!formData.phone.trim() || formData.phone.length < 10) {
      setFormError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!formData.street.trim()) {
      setFormError('Please enter street address / flat details');
      return;
    }
    if (!formData.city.trim()) {
      setFormError('Please enter city');
      return;
    }
    if (!formData.pincode.trim() || formData.pincode.length < 6) {
      setFormError('Please enter a valid 6-digit pincode');
      return;
    }

    setSubmitting(true);
    try {
      if (viewMode === 'add') {
        const payload = {
          type: formData.type,
          recipientName: formData.recipientName,
          phone: formData.phone,
          alternatePhone: formData.alternatePhone,
          street: formData.street,
          landmark: formData.landmark,
          city: formData.city,
          state: formData.state || 'Delhi',
          pincode: formData.pincode,
          isDefault: formData.isDefault,
        };

        const res = await api.post('/auth/addresses', payload);
        if (res.data?.success && res.data.addresses) {
          setAddresses(res.data.addresses);
          showToast('New address saved to your address book! 🏠');
          // If set as default, also select it
          if (formData.isDefault && onSelectAddress) {
            const added = res.data.addresses.find((a) => a.isDefault) || res.data.addresses[res.data.addresses.length - 1];
            onSelectAddress(added);
          }
        } else {
          // Local fallback
          const newId = 'addr_' + Date.now();
          const newAddr = { ...payload, _id: newId };
          const updated = formData.isDefault
            ? addresses.map((a) => ({ ...a, isDefault: false })).concat(newAddr)
            : [...addresses, newAddr];
          setAddresses(updated);
          showToast('Address added locally! 🏠');
        }
      } else if (viewMode === 'edit') {
        const payload = {
          type: formData.type,
          recipientName: formData.recipientName,
          phone: formData.phone,
          alternatePhone: formData.alternatePhone,
          street: formData.street,
          landmark: formData.landmark,
          city: formData.city,
          state: formData.state || 'Delhi',
          pincode: formData.pincode,
          isDefault: formData.isDefault,
        };

        const res = await api.put(`/auth/addresses/${formData._id}`, payload);
        if (res.data?.success && res.data.addresses) {
          setAddresses(res.data.addresses);
          showToast('Address updated successfully! ✏️');
          if (selectedAddressId === formData._id && onSelectAddress) {
            const updated = res.data.addresses.find((a) => a._id === formData._id);
            if (updated) onSelectAddress(updated);
          }
        } else {
          // Local fallback
          const updated = addresses.map((a) =>
            a._id === formData._id ? { ...a, ...payload } : a
          );
          setAddresses(updated);
          showToast('Address updated! ✏️');
        }
      }
      setViewMode('list');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save address. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetDefault = async (addrId) => {
    try {
      const res = await api.patch(`/auth/addresses/${addrId}/default`);
      if (res.data?.success && res.data.addresses) {
        setAddresses(res.data.addresses);
      } else {
        setAddresses((prev) =>
          prev.map((a) => ({
            ...a,
            isDefault: a._id === addrId,
          }))
        );
      }
      showToast('Set as default delivery address! ⭐');
    } catch (_) {
      setAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          isDefault: a._id === addrId,
        }))
      );
      showToast('Set as default delivery address! ⭐');
    }
  };

  const handleDeleteAddress = async (addrId) => {
    if (addresses.length <= 1) {
      showToast('You must keep at least 1 delivery address in your book.', 'error');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this address?')) return;

    try {
      const res = await api.delete(`/auth/addresses/${addrId}`);
      if (res.data?.success && res.data.addresses) {
        setAddresses(res.data.addresses);
      } else {
        setAddresses((prev) => prev.filter((a) => a._id !== addrId));
      }
      showToast('Address deleted.');
    } catch (_) {
      setAddresses((prev) => prev.filter((a) => a._id !== addrId));
      showToast('Address deleted.');
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'WORK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
            <Briefcase className="w-3 h-3" />
            WORK
          </span>
        );
      case 'OTHER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Building2 className="w-3 h-3" />
            OTHER
          </span>
        );
      case 'HOME':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
            <Home className="w-3 h-3" />
            HOME
          </span>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden text-slate-800">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            {viewMode !== 'list' ? (
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200 shadow-xs">
                <MapPin className="w-5 h-5" />
              </div>
            )}
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-950 flex items-center gap-2">
                {viewMode === 'list' && 'Saved Delivery Addresses'}
                {viewMode === 'add' && 'Add New Delivery Address'}
                {viewMode === 'edit' && 'Edit Delivery Address'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {viewMode === 'list'
                  ? 'Manage your home, office, and other addresses for rapid checkout'
                  : 'Enter precise doorstep coordinates for smooth courier delivery'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {viewMode === 'list' && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Add New</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 ${
              feedback.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-b border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
            }`}
          >
            {feedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            )}
            <span>{feedback.msg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {viewMode === 'list' ? (
            <>
              {/* Mobile "Add Address" Button */}
              <button
                type="button"
                onClick={handleOpenAdd}
                className="w-full sm:hidden py-3 px-4 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-50 text-amber-900 font-black text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4 text-amber-600" />
                <span>+ Add New Address (Home / Work / Other)</span>
              </button>

              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                  <span className="text-xs font-bold">Loading your saved addresses...</span>
                </div>
              ) : addresses.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <MapPin className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">No addresses saved yet</p>
                  <button
                    type="button"
                    onClick={handleOpenAdd}
                    className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs"
                  >
                    Add Your First Address
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {addresses.map((addr) => {
                    const isSelected = selectedAddressId === addr._id;
                    return (
                      <div
                        key={addr._id || addr.street}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between relative ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-400/30 shadow-md'
                            : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                        }`}
                      >
                        <div>
                          {/* Badges Bar */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {getTypeBadge(addr.type)}
                              {addr.isDefault && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
                                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                  DEFAULT
                                </span>
                              )}
                            </div>

                            {/* Actions Dropdown / Icon Buttons */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(addr)}
                                title="Edit Address"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAddress(addr._id)}
                                title="Delete Address"
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Recipient Details */}
                          <div className="space-y-1">
                            <h4 className="text-sm font-black text-slate-900 flex items-center justify-between">
                              <span>{addr.recipientName}</span>
                            </h4>
                            <p className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                              <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              <span>{addr.phone}</span>
                              {addr.alternatePhone && (
                                <span className="text-slate-400 text-[11px]">
                                  (Alt: {addr.alternatePhone})
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-700 leading-relaxed font-normal pt-1">
                              {addr.street}
                            </p>
                            {addr.landmark && (
                              <p className="text-[11px] text-amber-700 font-medium">
                                Landmark: {addr.landmark}
                              </p>
                            )}
                            <p className="text-xs font-bold text-slate-800">
                              {addr.city}, {addr.state || 'Delhi'} -{' '}
                              <span className="font-black text-slate-950 font-mono">
                                {addr.pincode}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Footer Controls */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          {!addr.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleSetDefault(addr._id)}
                              className="text-[11px] font-bold text-slate-500 hover:text-amber-700 flex items-center gap-1 transition-colors"
                            >
                              <Star className="w-3 h-3" />
                              <span>Set Default</span>
                            </button>
                          )}
                          <div className="ml-auto">
                            <button
                              type="button"
                              onClick={() => {
                                if (onSelectAddress) onSelectAddress(addr);
                                onClose();
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs ${
                                isSelected
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  : 'bg-slate-900 hover:bg-slate-800 text-white'
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Selected</span>
                                </>
                              ) : (
                                <span>Deliver Here</span>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* Add or Edit Address Form */
            <form onSubmit={handleSaveAddress} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Address Type Pill Selection */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                  Address Type / Label *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: 'HOME', label: 'Home', icon: Home, color: 'blue' },
                    { type: 'WORK', label: 'Work / Office', icon: Briefcase, color: 'purple' },
                    { type: 'OTHER', label: 'Other', icon: Building2, color: 'emerald' },
                  ].map((item) => {
                    const isPicked = formData.type === item.type;
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: item.type })}
                        className={`p-2.5 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                          isPicked
                            ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                        }`}
                      >
                        <IconComponent className="w-3.5 h-3.5" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recipient & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Recipient Full Name *
                  </label>
                  <input
                    type="text"
                    name="recipientName"
                    required
                    value={formData.recipientName}
                    onChange={handleFormChange}
                    placeholder="e.g. Aman Sharma"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mobile Number (10 Digits) *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    maxLength={10}
                    value={formData.phone}
                    onChange={handleFormChange}
                    placeholder="e.g. 9876543214"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
                  />
                </div>
              </div>

              {/* Street Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Street Address / House / Flat No / Society *
                </label>
                <textarea
                  name="street"
                  required
                  rows={2}
                  value={formData.street}
                  onChange={handleFormChange}
                  placeholder="e.g. Flat 402, Green Valley Apartments, Sector 62"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>

              {/* Landmark & Alternate Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nearby Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    name="landmark"
                    value={formData.landmark}
                    onChange={handleFormChange}
                    placeholder="e.g. Near Metro Station Gate 2"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alternate Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    name="alternatePhone"
                    maxLength={10}
                    value={formData.alternatePhone}
                    onChange={handleFormChange}
                    placeholder="e.g. 9811223344"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
                  />
                </div>
              </div>

              {/* City, State, Pincode */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleFormChange}
                    placeholder="e.g. New Delhi"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">State *</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleFormChange}
                    placeholder="e.g. Delhi"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    6-Digit Pincode *
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    required
                    maxLength={6}
                    value={formData.pincode}
                    onChange={handleFormChange}
                    placeholder="e.g. 110001"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
                  />
                </div>
              </div>

              {/* Make Default Checkbox */}
              <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={formData.isDefault}
                  onChange={handleFormChange}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300"
                />
                <span className="text-xs font-bold text-slate-700">
                  Make this my default shipping address
                </span>
              </label>

              {/* Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{viewMode === 'add' ? 'Save Address' : 'Update Address'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
