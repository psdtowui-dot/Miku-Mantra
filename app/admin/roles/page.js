'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/use-auth';
import {
  UserCheck, Shield, Plus, Pencil, Trash2, X, Loader2,
  Lock, CheckCircle2, ShieldCheck, AlertCircle, Eye, Check
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminRolesPage() {
  const { user: currentUser } = useAuth();

  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [activeRole, setActiveRole] = useState(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    key: '',
    description: '',
    permissions: []
  });
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    permissions: []
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch('/api/admin/roles', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/admin/permissions', { credentials: 'include', cache: 'no-store' })
      ]);
      if (rolesRes.ok) {
        const d = await rolesRes.json();
        setRoles(d.roles || []);
      }
      if (permsRes.ok) {
        const d = await permsRes.json();
        setPermissions(d.permissions || []);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Group permissions by module
  const groupedPermissions = permissions.reduce((acc, p) => {
    acc[p.group] = acc[p.group] || [];
    acc[p.group].push(p);
    return acc;
  }, {});

  const handleNameChange = (nameVal, isCreate = true) => {
    if (isCreate) {
      const suggestedKey = nameVal
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9\s_]/g, '')
        .replace(/\s+/g, '_');
      setCreateForm(prev => ({ ...prev, name: nameVal, key: suggestedKey }));
    } else {
      setEditForm(prev => ({ ...prev, name: nameVal }));
    }
  };

  const togglePermission = (permKey, isCreate = true) => {
    if (isCreate) {
      setCreateForm(prev => {
        const exists = prev.permissions.includes(permKey);
        const newPerms = exists
          ? prev.permissions.filter(p => p !== permKey)
          : [...prev.permissions, permKey];
        return { ...prev, permissions: newPerms };
      });
    } else {
      setEditForm(prev => {
        const exists = prev.permissions.includes(permKey);
        const newPerms = exists
          ? prev.permissions.filter(p => p !== permKey)
          : [...prev.permissions, permKey];
        return { ...prev, permissions: newPerms };
      });
    }
  };

  const toggleAllInGroup = (groupPerms, isCreate = true) => {
    const keys = groupPerms.map(p => p.key);
    const targetPerms = isCreate ? createForm.permissions : editForm.permissions;
    const allSelected = keys.every(k => targetPerms.includes(k));

    if (allSelected) {
      // Unselect all in group
      if (isCreate) {
        setCreateForm(prev => ({ ...prev, permissions: prev.permissions.filter(k => !keys.includes(k)) }));
      } else {
        setEditForm(prev => ({ ...prev, permissions: prev.permissions.filter(k => !keys.includes(k)) }));
      }
    } else {
      // Select all in group
      if (isCreate) {
        setCreateForm(prev => ({ ...prev, permissions: Array.from(new Set([...prev.permissions, ...keys])) }));
      } else {
        setEditForm(prev => ({ ...prev, permissions: Array.from(new Set([...prev.permissions, ...keys])) }));
      }
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) return toast.error('Role name is required');
    if (!createForm.key.trim()) return toast.error('Role key identifier is required');

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Role created successfully');
        setShowCreateModal(false);
        setCreateForm({ name: '', key: '', description: '', permissions: [] });
        loadData();
      } else {
        toast.error(data.error || 'Failed to create role');
      }
    } catch (e) {
      toast.error('Network error creating role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!activeRole) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/roles/${activeRole.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Role updated successfully');
        setShowEditModal(false);
        setActiveRole(null);
        loadData();
      } else {
        toast.error(data.error || 'Failed to update role');
      }
    } catch (e) {
      toast.error('Network error updating role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (role) => {
    if (role.isSystem) {
      return toast.error('System built-in roles cannot be deleted');
    }
    if (role.adminCount > 0) {
      return toast.error(`Cannot delete role "${role.name}": Assigned to ${role.adminCount} administrator(s).`);
    }

    if (!confirm(`Are you sure you want to delete custom role "${role.name}" (${role.key})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/roles/${role.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Role deleted successfully');
        loadData();
      } else {
        toast.error(data.error || 'Failed to delete role');
      }
    } catch (e) {
      toast.error('Network error deleting role');
    }
  };

  const openEdit = (role) => {
    setActiveRole(role);
    setEditForm({
      name: role.name || '',
      description: role.description || '',
      permissions: Array.isArray(role.permissions) ? role.permissions : []
    });
    setShowEditModal(true);
  };

  const openView = (role) => {
    setActiveRole(role);
    setShowViewModal(true);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="font-display text-2xl xs:text-3xl sm:text-4xl text-[#1A1A1A]">Role Management</div>
          <div className="gold-line w-12 mt-2 mb-2 sm:mb-4" />
          <p className="text-xs sm:text-sm text-neutral-500">
            Configure administrative roles and define modular access policies across store features.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 bg-[#1A1A1A] text-white px-5 py-2.5 text-xs sm:text-sm tracking-wider uppercase rounded-lg hover:bg-[#9C6B30] transition-colors shrink-0 shadow-xs"
        >
          <Plus size={16} /> Create Custom Role
        </button>
      </div>

      {/* Roles Grid / Table */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-xl border border-neutral-200 my-6">
          <Loader2 className="animate-spin inline text-[#9C6B30]" size={32} />
          <p className="text-xs text-neutral-500 mt-2 font-mono">Loading roles & permissions...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs my-6">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-neutral-50 text-[10px] tracking-widest uppercase text-neutral-500 border-b border-neutral-200">
                <tr>
                  <th className="text-left p-3.5 min-w-[150px]">Role</th>
                  <th className="text-left p-3.5 min-w-[120px]">Key Identifier</th>
                  <th className="text-left p-3.5 min-w-[180px]">Description</th>
                  <th className="text-center p-3.5 min-w-[100px]">Assigned Admins</th>
                  <th className="text-center p-3.5 min-w-[100px]">Permissions</th>
                  <th className="text-right p-3.5 min-w-[120px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {roles.map((role) => {
                  const isWildcard = role.permissions?.includes('*');
                  const isSuper = role.key === 'SUPER_ADMIN';

                  return (
                    <tr key={role.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="p-3.5 font-medium text-neutral-900">
                        <div className="flex items-center gap-1.5">
                          {isSuper ? (
                            <Shield size={14} className="text-[#9C6B30] shrink-0" />
                          ) : (
                            <UserCheck size={14} className="text-neutral-400 shrink-0" />
                          )}
                          <span>{role.name}</span>
                          {role.isSystem && (
                            <span className="text-[9px] bg-neutral-100 text-neutral-600 px-1.5 py-0.2 rounded font-mono uppercase font-semibold">
                              System
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-neutral-600">
                        {role.key}
                      </td>
                      <td className="p-3.5 text-neutral-600 text-xs max-w-xs truncate" title={role.description}>
                        {role.description || '—'}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-xs font-mono font-medium">
                          {role.adminCount || 0}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        {isWildcard ? (
                          <span className="px-2 py-0.5 rounded bg-[#D4AF37]/15 text-[#9C6B30] text-[10px] font-semibold uppercase tracking-wider">
                            Full Access (*)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 text-xs font-mono">
                            {role.permissions?.length || 0} perms
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right space-x-1">
                        <button
                          onClick={() => openView(role)}
                          className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded hover:bg-neutral-100 transition"
                          title="View Role & Permissions"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => openEdit(role)}
                          disabled={isSuper}
                          className={`p-1.5 rounded transition ${
                            isSuper
                              ? 'opacity-30 cursor-not-allowed text-neutral-400'
                              : 'text-neutral-700 hover:text-[#9C6B30] hover:bg-neutral-100'
                          }`}
                          title={isSuper ? 'Super Admin permissions are fixed' : 'Edit Role'}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(role)}
                          disabled={role.isSystem || role.adminCount > 0}
                          className={`p-1.5 rounded transition ${
                            role.isSystem || role.adminCount > 0
                              ? 'opacity-30 cursor-not-allowed text-neutral-400'
                              : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                          }`}
                          title={
                            role.isSystem
                              ? 'System built-in roles cannot be deleted'
                              : role.adminCount > 0
                              ? 'Role is currently in use'
                              : 'Delete Role'
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE ROLE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl border border-neutral-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/15 flex items-center justify-center text-[#9C6B30]">
                  <Plus size={16} />
                </div>
                <div>
                  <h3 className="text-base font-serif font-semibold text-neutral-900">Create Custom Role</h3>
                  <p className="text-[11px] text-neutral-500">Configure permissions for a new administrative role</p>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-neutral-500 font-semibold mb-1">
                    Role Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => handleNameChange(e.target.value, true)}
                    placeholder="e.g. Catalog Specialist"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-[#9C6B30]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] tracking-widest uppercase text-neutral-500 font-semibold mb-1">
                    Role Identifier Key *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.key}
                    onChange={(e) => setCreateForm({ ...createForm, key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })}
                    placeholder="CATALOG_SPECIALIST"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg font-mono text-xs focus:outline-none focus:border-[#9C6B30]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] tracking-widest uppercase text-neutral-500 font-semibold mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Responsibilities and purpose of this role..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              {/* Permissions Checklist */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">
                    Granular Permissions ({createForm.permissions.length} selected)
                  </label>
                  <span className="text-[11px] text-neutral-400">Click section headers to select/deselect all</span>
                </div>

                <div className="max-h-72 overflow-y-auto border border-neutral-200 rounded-xl p-3 space-y-4 bg-neutral-50/40">
                  {Object.entries(groupedPermissions).map(([groupName, groupPerms]) => {
                    const allSelected = groupPerms.every(p => createForm.permissions.includes(p.key));
                    return (
                      <div key={groupName} className="bg-white border border-neutral-100 rounded-lg p-3 shadow-2xs">
                        <div
                          onClick={() => toggleAllInGroup(groupPerms, true)}
                          className="flex items-center justify-between cursor-pointer pb-2 mb-2 border-b border-neutral-100 select-none"
                        >
                          <span className="font-semibold text-neutral-800 text-xs flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${allSelected ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
                            {groupName}
                          </span>
                          <span className="text-[10px] text-[#9C6B30] hover:underline font-medium">
                            {allSelected ? 'Deselect All' : 'Select All'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {groupPerms.map((p) => {
                            const isChecked = createForm.permissions.includes(p.key);
                            return (
                              <label
                                key={p.key}
                                className="flex items-start gap-2 p-1.5 rounded hover:bg-neutral-50 cursor-pointer select-none"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermission(p.key, true)}
                                  className="mt-0.5 rounded accent-[#9C6B30] h-3.5 w-3.5"
                                />
                                <div>
                                  <div className="text-xs font-medium text-neutral-800">{p.label}</div>
                                  <div className="text-[10px] font-mono text-neutral-400">{p.key}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                  {submitting ? 'Creating...' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ROLE MODAL */}
      {showEditModal && activeRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl border border-neutral-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/15 flex items-center justify-center text-[#9C6B30]">
                  <Pencil size={16} />
                </div>
                <div>
                  <h3 className="text-base font-serif font-semibold text-neutral-900">Edit Role: {activeRole.name}</h3>
                  <p className="text-[11px] text-neutral-500 font-mono">{activeRole.key}</p>
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
                  Role Display Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => handleNameChange(e.target.value, false)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div>
                <label className="block text-[10px] tracking-widest uppercase text-neutral-500 font-semibold mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              {/* Permissions Checklist */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">
                    Assigned Permissions ({editForm.permissions.length} selected)
                  </label>
                  <span className="text-[11px] text-neutral-400">Click section headers to select/deselect all</span>
                </div>

                <div className="max-h-72 overflow-y-auto border border-neutral-200 rounded-xl p-3 space-y-4 bg-neutral-50/40">
                  {Object.entries(groupedPermissions).map(([groupName, groupPerms]) => {
                    const allSelected = groupPerms.every(p => editForm.permissions.includes(p.key));
                    return (
                      <div key={groupName} className="bg-white border border-neutral-100 rounded-lg p-3 shadow-2xs">
                        <div
                          onClick={() => toggleAllInGroup(groupPerms, false)}
                          className="flex items-center justify-between cursor-pointer pb-2 mb-2 border-b border-neutral-100 select-none"
                        >
                          <span className="font-semibold text-neutral-800 text-xs flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${allSelected ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
                            {groupName}
                          </span>
                          <span className="text-[10px] text-[#9C6B30] hover:underline font-medium">
                            {allSelected ? 'Deselect All' : 'Select All'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {groupPerms.map((p) => {
                            const isChecked = editForm.permissions.includes(p.key);
                            return (
                              <label
                                key={p.key}
                                className="flex items-start gap-2 p-1.5 rounded hover:bg-neutral-50 cursor-pointer select-none"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermission(p.key, false)}
                                  className="mt-0.5 rounded accent-[#9C6B30] h-3.5 w-3.5"
                                />
                                <div>
                                  <div className="text-xs font-medium text-neutral-800">{p.label}</div>
                                  <div className="text-[10px] font-mono text-neutral-400">{p.key}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
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

      {/* VIEW ROLE MODAL */}
      {showViewModal && activeRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-xl border border-neutral-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 flex items-center justify-center text-[#9C6B30]">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-serif font-semibold text-neutral-900">{activeRole.name}</h3>
                  <p className="text-[11px] text-neutral-500 font-mono">{activeRole.key}</p>
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
              <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">Description</div>
                <div className="text-neutral-800 mt-1">{activeRole.description || 'No description provided.'}</div>
              </div>

              <div>
                <h4 className="text-[11px] tracking-widest uppercase font-semibold text-neutral-600 mb-2">
                  Permissions Included ({activeRole.permissions?.includes('*') ? 'All' : activeRole.permissions?.length || 0})
                </h4>
                {activeRole.permissions?.includes('*') ? (
                  <div className="p-3 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl text-neutral-800 flex items-center gap-2">
                    <Shield size={16} className="text-[#9C6B30]" />
                    <span>Wildcard Full Access (*) — Possesses unrestricted permissions across all dashboard modules.</span>
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto border border-neutral-100 rounded-xl p-2 bg-neutral-50/50 divide-y divide-neutral-100">
                    {(!activeRole.permissions || activeRole.permissions.length === 0) ? (
                      <div className="p-4 text-center text-neutral-400">No permissions assigned</div>
                    ) : (
                      activeRole.permissions.map((perm) => (
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
