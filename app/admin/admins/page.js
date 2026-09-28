'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/use-auth';
import {
  Shield, UserCheck, Plus, Pencil, Trash2, Search, X, Loader2,
  Lock, CheckCircle2, XCircle, Eye, RefreshCw, KeyRound, ChevronLeft,
  ChevronRight, AlertCircle, ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminAdminsPage() {
  const { user: currentUser } = useAuth();

  const [list, setList] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const limit = 10;

  // Filters
  const [searchVal, setSearchVal] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  // Active Admin being edited/viewed
  const [activeAdmin, setActiveAdmin] = useState(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'ADMIN',
    status: 'active',
    password: '',
    confirmPassword: ''
  });
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    role: 'ADMIN',
    status: 'active',
    password: '',
    confirmPassword: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchVal);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchVal]);

  const loadRoles = async () => {
    try {
      const res = await fetch('/api/admin/roles', { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles || []);
      }
    } catch (e) {
      console.error('Failed to load roles:', e);
    }
  };

  const loadAdmins = async (pg = page, s = search, r = roleFilter, st = statusFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pg),
        limit: String(limit),
        q: s,
        role: r,
        status: st
      });
      const res = await fetch(`/api/admin/admins?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store'
      });
      const data = await res.json();
      if (res.ok) {
        setList(data.admins || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else {
        toast.error(data.error || 'Failed to load administrators');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error fetching administrators');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    loadAdmins(page, search, roleFilter, statusFilter);
  }, [page, search, roleFilter, statusFilter]);

  // Actions
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.email.trim()) {
      return toast.error('Name and email are required');
    }
    if (!createForm.password || createForm.password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    if (createForm.password !== createForm.confirmPassword) {
      return toast.error('Passwords do not match');
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Administrator created successfully');
        setShowCreateModal(false);
        setCreateForm({
          name: '',
          email: '',
          phone: '',
          role: 'ADMIN',
          status: 'active',
          password: '',
          confirmPassword: ''
        });
        loadAdmins(1);
      } else {
        toast.error(data.error || 'Failed to create administrator');
      }
    } catch (e) {
      toast.error('Network error creating administrator');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!activeAdmin) return;
    if (editForm.password && editForm.password.length < 6) {
      return toast.error('New password must be at least 6 characters');
    }
    if (editForm.password && editForm.password !== editForm.confirmPassword) {
      return toast.error('Passwords do not match');
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/admins/${activeAdmin.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Administrator updated successfully');
        setShowEditModal(false);
        setActiveAdmin(null);
        loadAdmins(page);
      } else {
        toast.error(data.error || 'Failed to update administrator');
      }
    } catch (e) {
      toast.error('Network error updating administrator');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (admin) => {
    const newStatus = admin.status === 'disabled' ? 'active' : 'disabled';
    const actionLabel = newStatus === 'disabled' ? 'disable' : 'enable';

    if (!confirm(`Are you sure you want to ${actionLabel} administrator ${admin.name} (${admin.email})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/admins/${admin.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Administrator ${admin.name} has been ${newStatus === 'disabled' ? 'disabled' : 'enabled'}.`);
        loadAdmins(page);
      } else {
        toast.error(data.error || `Failed to ${actionLabel} administrator`);
      }
    } catch (e) {
      toast.error('Network error updating administrator status');
    }
  };

  const handleDelete = async (admin) => {
    if (!confirm(`WARNING: Are you sure you want to permanently delete administrator ${admin.name} (${admin.email})? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/admins/${admin.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Administrator deleted successfully');
        loadAdmins(page);
      } else {
        toast.error(data.error || 'Failed to delete administrator');
      }
    } catch (e) {
      toast.error('Network error deleting administrator');
    }
  };

  const openEdit = (admin) => {
    setActiveAdmin(admin);
    setEditForm({
      name: admin.name || '',
      phone: admin.phone || '',
      role: admin.roleKey || 'ADMIN',
      status: admin.status || 'active',
      password: '',
      confirmPassword: ''
    });
    setShowEditModal(true);
  };

  const openView = async (admin) => {
    setActiveAdmin(admin);
    setShowViewModal(true);
    try {
      const res = await fetch(`/api/admin/admins/${admin.id}`, { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setActiveAdmin(data.admin);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isSuperAdminCaller = currentUser?.roleKey === 'SUPER_ADMIN';

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="font-display text-2xl xs:text-3xl sm:text-4xl text-[#1A1A1A]">Administrators</div>
          <div className="gold-line w-12 mt-2 mb-2 sm:mb-4" />
          <p className="text-xs sm:text-sm text-neutral-500">
            Manage administrative personnel, assign roles, enforce security statuses, and control dashboard access.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 bg-[#1A1A1A] text-white px-5 py-2.5 text-xs sm:text-sm tracking-wider uppercase rounded-lg hover:bg-[#9C6B30] transition-colors shrink-0 shadow-xs"
        >
          <Plus size={16} /> Create Admin
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-neutral-200 p-3.5 xs:p-4 my-6 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="w-full pl-9 pr-10 py-2 border border-neutral-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#9C6B30] transition-all"
            />
            {searchVal && (
              <button
                onClick={() => setSearchVal('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="w-full py-2 px-3 border border-neutral-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#9C6B30] bg-white transition-all"
            >
              <option value="ALL">All Roles</option>
              {roles.map(r => (
                <option key={r.key} value={r.key}>{r.name} ({r.key})</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full py-2 px-3 border border-neutral-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#9C6B30] bg-white transition-all"
            >
              <option value="ALL">All Statuses</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Admins Table */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-xl border border-neutral-200">
          <Loader2 className="animate-spin inline text-[#9C6B30]" size={32} />
          <p className="text-xs text-neutral-500 mt-2 font-mono">Loading administrators...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-neutral-50 text-[10px] tracking-widest uppercase text-neutral-500 border-b border-neutral-200">
                <tr>
                  <th className="text-left p-3.5 min-w-[140px]">Administrator</th>
                  <th className="text-left p-3.5 min-w-[120px]">Role</th>
                  <th className="text-left p-3.5 min-w-[90px]">Status</th>
                  <th className="text-left p-3.5 min-w-[110px]">Last Login</th>
                  <th className="text-left p-3.5 min-w-[110px]">Created</th>
                  <th className="text-right p-3.5 min-w-[150px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-neutral-400">
                      No administrators found matching the filters
                    </td>
                  </tr>
                ) : (
                  list.map((admin) => {
                    const isSelf = admin.id === currentUser?.id;
                    const isSuper = admin.roleKey === 'SUPER_ADMIN';
                    const isDisabled = admin.status === 'disabled';

                    return (
                      <tr key={admin.id} className="hover:bg-neutral-50/60 transition-colors">
                        <td className="p-3.5">
                          <div className="font-medium text-neutral-900 flex items-center gap-1.5">
                            {admin.name}
                            {isSelf && (
                              <span className="text-[9px] bg-neutral-200 text-neutral-700 px-1.5 py-0.2 rounded font-mono">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-neutral-500 truncate max-w-[180px] font-mono" title={admin.email}>
                            {admin.email}
                          </div>
                          {admin.phone && (
                            <div className="text-[11px] text-neutral-400">{admin.phone}</div>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase ${
                              isSuper
                                ? 'bg-[#D4AF37]/15 text-[#9C6B30] border border-[#D4AF37]/30'
                                : 'bg-neutral-100 text-neutral-700'
                            }`}
                          >
                            {isSuper && <Shield size={10} />}
                            {admin.roleName || admin.roleKey}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              isDisabled
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {isDisabled ? <XCircle size={10} /> : <CheckCircle2 size={10} />}
                            {admin.status || 'active'}
                          </span>
                        </td>
                        <td className="p-3.5 text-neutral-600 text-[11px]">
                          {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString('en-IN') : 'Never'}
                        </td>
                        <td className="p-3.5 text-neutral-600 text-[11px]">
                          {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td className="p-3.5 text-right space-x-1">
                          {/* View Details / Permissions */}
                          <button
                            onClick={() => openView(admin)}
                            className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded hover:bg-neutral-100 transition"
                            title="View Details & Permissions"
                          >
                            <Eye size={14} />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => openEdit(admin)}
                            disabled={isSuper && !isSuperAdminCaller}
                            className={`p-1.5 rounded transition ${
                              isSuper && !isSuperAdminCaller
                                ? 'opacity-30 cursor-not-allowed text-neutral-400'
                                : 'text-neutral-700 hover:text-[#9C6B30] hover:bg-neutral-100'
                            }`}
                            title="Edit Administrator"
                          >
                            <Pencil size={14} />
                          </button>

                          {/* Enable/Disable Toggle */}
                          <button
                            onClick={() => handleToggleStatus(admin)}
                            disabled={isSelf || (isSuper && !isSuperAdminCaller)}
                            className={`p-1.5 rounded transition ${
                              isSelf || (isSuper && !isSuperAdminCaller)
                                ? 'opacity-30 cursor-not-allowed text-neutral-400'
                                : isDisabled
                                ? 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                                : 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
                            }`}
                            title={isDisabled ? 'Enable Admin' : 'Disable Admin'}
                          >
                            {isDisabled ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(admin)}
                            disabled={isSelf || (isSuper && !isSuperAdminCaller)}
                            className={`p-1.5 rounded transition ${
                              isSelf || (isSuper && !isSuperAdminCaller)
                                ? 'opacity-30 cursor-not-allowed text-neutral-400'
                                : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                            }`}
                            title="Delete Administrator"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-3.5 border-t border-neutral-200 flex items-center justify-between bg-neutral-50/50">
              <div className="text-xs text-neutral-500 font-mono">
                Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} of {total} administrators
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded border border-neutral-200 bg-white text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-100 transition"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-mono text-neutral-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded border border-neutral-200 bg-white text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-100 transition"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE ADMIN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-neutral-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/15 flex items-center justify-center text-[#9C6B30]">
                  <Shield size={16} />
                </div>
                <div>
                  <h3 className="text-base font-serif font-semibold text-neutral-900">Create New Administrator</h3>
                  <p className="text-[11px] text-neutral-500">Provision a new admin account with designated role</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-[10px] tracking-widest uppercase text-neutral-500 font-semibold mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Ramesh Sharma"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-neutral-500 font-semibold mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="admin@example.com"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-[#9C6B30]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-neutral-500 font-semibold mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-[#9C6B30]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-neutral-500 font-semibold mb-1">
                    Administrative Role *
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-[#9C6B30] bg-white"
                  >
                    {roles.map(r => (
                      <option
                        key={r.key}
                        value={r.key}
                        disabled={r.key === 'SUPER_ADMIN' && !isSuperAdminCaller}
                      >
                        {r.name} {r.key === 'SUPER_ADMIN' ? '(Super Admin)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-neutral-500 font-semibold mb-1">
                    Account Status *
                  </label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-[#9C6B30] bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-neutral-500 font-semibold mb-1">
                    Password * (min 6 chars)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-[#9C6B30]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-neutral-500 font-semibold mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={createForm.confirmPassword}
                    onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-[#9C6B30]"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] flex gap-2 items-start">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>The administrator will be granted permissions matching their selected role. Existing passwords use secure PBKDF2 hashing.</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-neutral-600 hover:text-neutral-900 text-xs sm:text-sm font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#1A1A1A] text-white hover:bg-[#9C6B30] text-xs sm:text-sm uppercase tracking-wider font-medium rounded-lg transition disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ADMIN MODAL */}
      {showEditModal && activeAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-neutral-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/15 flex items-center justify-center text-[#9C6B30]">
                  <Pencil size={16} />
                </div>
                <div>
                  <h3 className="text-base font-serif font-semibold text-neutral-900">Edit Administrator</h3>
                  <p className="text-[11px] text-neutral-500 font-mono">{activeAdmin.email}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-[10px] tracking-widest uppercase text-neutral-500 font-semibold mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-neutral-500 font-semibold mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-[#9C6B30]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-neutral-500 font-semibold mb-1">
                    Account Status
                  </label>
                  <select
                    value={editForm.status}
                    disabled={activeAdmin.id === currentUser?.id}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-[#9C6B30] bg-white disabled:opacity-50"
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] tracking-widest uppercase text-neutral-500 font-semibold mb-1">
                  Assigned Role
                </label>
                <select
                  value={editForm.role}
                  disabled={activeAdmin.roleKey === 'SUPER_ADMIN' && !isSuperAdminCaller}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-[#9C6B30] bg-white disabled:opacity-50"
                >
                  {roles.map(r => (
                    <option
                      key={r.key}
                      value={r.key}
                      disabled={r.key === 'SUPER_ADMIN' && !isSuperAdminCaller}
                    >
                      {r.name} ({r.key})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 border border-dashed border-neutral-200 rounded-xl space-y-3 bg-neutral-50/50">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700">
                  <KeyRound size={14} className="text-[#9C6B30]" /> Reset Password (Optional)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase text-neutral-500 mb-1">New Password</label>
                    <input
                      type="password"
                      placeholder="Leave blank to keep current"
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-[#9C6B30] bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-neutral-500 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      placeholder="Confirm password"
                      value={editForm.confirmPassword}
                      onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-[#9C6B30] bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-neutral-600 hover:text-neutral-900 text-xs sm:text-sm font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#1A1A1A] text-white hover:bg-[#9C6B30] text-xs sm:text-sm uppercase tracking-wider font-medium rounded-lg transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS & PERMISSIONS MODAL */}
      {showViewModal && activeAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-xl border border-neutral-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 flex items-center justify-center text-[#9C6B30]">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="text-base font-serif font-semibold text-neutral-900">{activeAdmin.name}</h3>
                  <p className="text-[11px] text-neutral-500 font-mono">{activeAdmin.email}</p>
                </div>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">Role</div>
                  <div className="font-semibold text-neutral-800 mt-0.5">{activeAdmin.roleName || activeAdmin.roleKey}</div>
                </div>
                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">Status</div>
                  <div className="font-semibold text-neutral-800 mt-0.5 capitalize">{activeAdmin.status || 'active'}</div>
                </div>
                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">Last Login</div>
                  <div className="font-mono text-[11px] text-neutral-800 mt-0.5 truncate">
                    {activeAdmin.lastLoginAt ? new Date(activeAdmin.lastLoginAt).toLocaleDateString('en-IN') : 'Never'}
                  </div>
                </div>
                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">Created</div>
                  <div className="font-mono text-[11px] text-neutral-800 mt-0.5 truncate">
                    {activeAdmin.createdAt ? new Date(activeAdmin.createdAt).toLocaleDateString('en-IN') : '—'}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] tracking-widest uppercase font-semibold text-neutral-600 mb-2">
                  Effective Permissions ({activeAdmin.permissions?.length || 0})
                </h4>
                {activeAdmin.permissions?.includes('*') ? (
                  <div className="p-3 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl text-neutral-800 flex items-center gap-2">
                    <Shield size={16} className="text-[#9C6B30]" />
                    <span><strong>Wildcard Full Access (*)</strong> — This Super Administrator has unrestricted permissions across all dashboard modules.</span>
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-neutral-100 rounded-xl p-2 bg-neutral-50/50 divide-y divide-neutral-100">
                    {(!activeAdmin.permissions || activeAdmin.permissions.length === 0) ? (
                      <div className="p-4 text-center text-neutral-400">No granular permissions assigned</div>
                    ) : (
                      activeAdmin.permissions.map((perm) => (
                        <div key={perm} className="py-1.5 px-2 flex items-center gap-2 font-mono text-[11px] text-neutral-700">
                          <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                          <span>{perm}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 text-xs sm:text-sm font-medium rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
