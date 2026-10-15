import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Check,
  X,
  Trash2,
  Edit2,
  Phone,
  Mail,
  User,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Eye,
  Key,
  Sliders,
  Layers,
} from 'lucide-react';
import api from '../api/client';

export default function VendorStaffManagerModal({
  isOpen,
  onClose,
  currentStaffRole = null, // if logged in as sub-staff, shows role
  onStaffUpdated = () => {},
}) {
  const [staffList, setStaffList] = useState([]);
  const [permissionsCatalog, setPermissionsCatalog] = useState([]);
  const [rolePresets, setRolePresets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Invite / Edit Form
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    staffRoleTitle: 'Order & Dispatch Specialist',
    permissions: ['ORDERS_MANAGE'],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchStaffData = async () => {
    setIsLoading(true);
    try {
      const [staffRes, permRes] = await Promise.allSettled([
        api.get('/vendor/staff'),
        api.get('/vendor/staff/permissions'),
      ]);

      if (staffRes.status === 'fulfilled' && staffRes.value.data?.data) {
        setStaffList(staffRes.value.data.data);
      }
      if (permRes.status === 'fulfilled' && permRes.value.data) {
        setPermissionsCatalog(permRes.value.data.permissions || []);
        setRolePresets(permRes.value.data.presets || []);
      }
    } catch (err) {
      console.error('Failed to load vendor staff data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStaffData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset) => {
    setFormData((prev) => ({
      ...prev,
      staffRoleTitle: preset.roleTitle,
      permissions: preset.permissions,
    }));
  };

  const handleTogglePermission = (key) => {
    setFormData((prev) => {
      const exists = prev.permissions.includes(key);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== key)
          : [...prev.permissions, key],
      };
    });
  };

  const handleOpenInvite = () => {
    setEditingStaffId(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      staffRoleTitle: 'Order & Dispatch Specialist',
      permissions: ['ORDERS_MANAGE'],
    });
    setIsInviteOpen(true);
  };

  const handleOpenEdit = (staff) => {
    setEditingStaffId(staff._id);
    setFormData({
      name: staff.name,
      email: staff.email,
      phone: staff.phone || '',
      password: '',
      staffRoleTitle: staff.staffRoleTitle || 'Store Associate',
      permissions: staff.permissions || ['ORDERS_MANAGE'],
    });
    setIsInviteOpen(true);
  };

  const handleSubmitStaff = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || (!editingStaffId && !formData.password)) {
      showNotification('error', 'Please fill in required staff fields');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingStaffId) {
        const res = await api.put(`/vendor/staff/${editingStaffId}`, formData);
        if (res.data?.success) {
          showNotification('success', res.data.message || 'Staff updated successfully!');
          setIsInviteOpen(false);
          fetchStaffData();
          onStaffUpdated();
        }
      } else {
        const res = await api.post('/vendor/staff', formData);
        if (res.data?.success) {
          showNotification('success', res.data.message || 'Staff invited successfully!');
          setIsInviteOpen(false);
          fetchStaffData();
          onStaffUpdated();
        }
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to save staff member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async (staffId, name) => {
    if (!window.confirm(`Are you sure you want to revoke store access for ${name}?`)) {
      return;
    }

    try {
      const res = await api.delete(`/vendor/staff/${staffId}`);
      if (res.data?.success) {
        showNotification('success', res.data.message || 'Staff member removed');
        fetchStaffData();
        onStaffUpdated();
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to remove staff');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in font-sans">
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
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden relative animate-scale-up">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Point #13 Enterprise
              </span>
              <span className="text-xs font-bold text-slate-400">Granular Sub-Staff RBAC</span>
            </div>
            <h2 className="text-xl font-black text-white flex items-center gap-2.5">
              <Users className="w-6 h-6 text-amber-400" />
              <span>Vendor Sub-Staff Roles & Portal Permissions</span>
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Sub-Staff Info Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-amber-50/50 p-4 rounded-2xl border border-amber-200/60">
            <div className="space-y-0.5">
              <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Store Staff Access Control</span>
              </div>
              <p className="text-xs text-slate-600">
                Invite warehouse associates, dispatchers, and support agents with locked access to sensitive financial payouts & store settings.
              </p>
            </div>

            <button
              onClick={handleOpenInvite}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Invite Sub-Staff</span>
            </button>
          </div>

          {/* Form Modal (Invite / Edit) */}
          {isInviteOpen && (
            <form
              onSubmit={handleSubmitStaff}
              className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-fade-in"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-600" />
                  <span>{editingStaffId ? 'Edit Sub-Staff Permissions' : 'Invite New Sub-Staff Associate'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Personal Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Arjun Mehta"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">Email Address *</label>
                  <input
                    type="email"
                    required
                    disabled={!!editingStaffId}
                    placeholder="e.g. arjun@store.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-amber-500 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">Mobile Phone</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9812345678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">
                    {editingStaffId ? 'New Password (Optional)' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    required={!editingStaffId}
                    minLength={6}
                    placeholder="Min 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Role Presets */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Quick Role Presets:</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {rolePresets.map((preset) => (
                    <button
                      key={preset.roleTitle}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        formData.staffRoleTitle === preset.roleTitle
                          ? 'bg-slate-900 text-amber-400 font-black shadow-sm'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {preset.roleTitle}
                    </button>
                  ))}
                </div>
              </div>

              {/* Granular Permissions Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="text-[11px] font-bold text-slate-700">
                  Granular Portal Tabs & Action Permissions:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {permissionsCatalog.map((perm) => {
                    const isChecked = formData.permissions.includes(perm.key);
                    const isSensitive = perm.key === 'WALLET_FINANCE' || perm.key === 'STORE_SETTINGS';
                    return (
                      <label
                        key={perm.key}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                          isChecked
                            ? isSensitive
                              ? 'bg-rose-50/60 border-rose-300'
                              : 'bg-amber-50 border-amber-300'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePermission(perm.key)}
                          className="mt-0.5 w-4 h-4 rounded text-amber-600 accent-amber-500 cursor-pointer"
                        />
                        <div className="space-y-0.5">
                          <div className="font-bold text-xs text-slate-900 flex items-center gap-1">
                            {perm.label}
                            {isSensitive && (
                              <span className="text-[9px] font-black uppercase text-rose-600 bg-rose-100 px-1 rounded">
                                Restricted
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 leading-tight">
                            {perm.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving Associate...' : editingStaffId ? 'Update Permissions' : 'Send Invite & Activate'}
                </button>
              </div>
            </form>
          )}

          {/* Sub-Staff Directory Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 uppercase font-black tracking-wider">
                <tr>
                  <th className="py-3 px-4">Staff Associate</th>
                  <th className="py-3 px-4">Role Title</th>
                  <th className="py-3 px-4">Granted Permissions</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffList.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400 italic">
                      No sub-staff members registered yet. Click "+ Invite Sub-Staff" to add your team!
                    </td>
                  </tr>
                ) : (
                  staffList.map((staff) => (
                    <tr key={staff._id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900 text-sm flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-900 text-amber-400 font-black text-xs flex items-center justify-center">
                            {staff.name.charAt(0)}
                          </div>
                          <span>{staff.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {staff.email} &bull; {staff.phone || 'No phone'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold inline-block">
                          {staff.staffRoleTitle || 'Store Associate'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {staff.permissions?.map((p) => (
                            <span
                              key={p}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                p === 'WALLET_FINANCE'
                                  ? 'bg-rose-100 text-rose-800'
                                  : p === 'STORE_SETTINGS'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            staff.isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {staff.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(staff)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                            title="Edit Permissions"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(staff._id, staff.name)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                            title="Revoke Access"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-500" />
            <span>Store owner credentials remain secure. Sub-staff cannot access bank accounts or payouts.</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white font-black text-xs hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
