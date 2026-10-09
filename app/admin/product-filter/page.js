'use client';
import { useState, useEffect } from 'react';
import { Reorder, AnimatePresence, motion } from 'framer-motion';
import { 
  Plus, Pencil, Trash2, GripVertical, SlidersHorizontal, Loader2, 
  X, Check, AlertTriangle, Layers, ChevronRight, Eye, EyeOff, Search, Settings2
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminProductFilter() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  // Group Modal state
  const [editingGroup, setEditingGroup] = useState(null); // null | 'new' | groupObj
  const [groupForm, setGroupForm] = useState({ name: '', key: '', type: 'options', enabled: true });

  // Option Manager Drawer/Modal state
  const [activeGroupOptions, setActiveGroupOptions] = useState(null); // null | groupObj
  const [editingOption, setEditingOption] = useState(null); // null | 'new' | optObj
  const [optionForm, setOptionForm] = useState({ name: '', value: '', enabled: true });

  // Delete Confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState(null); // null | { type: 'group'|'option', groupId, optionId, name }

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/product-filters', { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const d = await res.json();
        setGroups(d.groups || []);
      } else {
        toast.error('Failed to load filter groups');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching filter groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Sync active group options if groups update
  useEffect(() => {
    if (activeGroupOptions) {
      const refreshed = groups.find(g => g.id === activeGroupOptions.id);
      if (refreshed) setActiveGroupOptions(refreshed);
    }
  }, [groups]);

  // Group Reorder
  const handleGroupReorder = async (newOrder) => {
    const updated = newOrder.map((g, idx) => ({ ...g, order: idx }));
    setGroups(updated);
    try {
      await fetch('/api/admin/product-filters/reorder', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups: updated })
      });
    } catch (err) {
      console.error('Reorder error:', err);
    }
  };

  // Group Save (Create / Update)
  const saveGroup = async () => {
    if (!groupForm.name?.trim()) return toast.error('Filter group name is required');
    const rawKey = groupForm.key || groupForm.name;
    const key = rawKey.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
    if (!key) return toast.error('Valid key is required');

    setSaving(true);
    try {
      const isNew = editingGroup === 'new';
      const url = isNew ? '/api/admin/product-filters' : `/api/admin/product-filters/${editingGroup.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...groupForm,
          key
        })
      });

      if (res.ok) {
        toast.success(isNew ? 'Filter group created' : 'Filter group updated');
        setEditingGroup(null);
        load();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || 'Failed to save filter group');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving group');
    } finally {
      setSaving(false);
    }
  };

  // Group Enable / Disable Toggle
  const toggleGroupStatus = async (group) => {
    try {
      const newStatus = !group.enabled;
      setGroups(groups.map(g => g.id === group.id ? { ...g, enabled: newStatus } : g));
      const res = await fetch(`/api/admin/product-filters/${group.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newStatus })
      });
      if (res.ok) {
        toast.success(`Group "${group.name}" ${newStatus ? 'enabled' : 'disabled'}`);
      } else {
        load(); // revert
      }
    } catch (err) {
      load();
    }
  };

  // Option Reorder
  const handleOptionReorder = async (groupId, newOptionsOrder) => {
    const updatedOpts = newOptionsOrder.map((o, idx) => ({ ...o, order: idx }));
    setGroups(groups.map(g => g.id === groupId ? { ...g, options: updatedOpts } : g));

    try {
      await fetch('/api/admin/product-filters/reorder', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, options: updatedOpts })
      });
    } catch (err) {
      console.error('Option reorder error:', err);
    }
  };

  // Option Save (Create / Update)
  const saveOption = async () => {
    if (!optionForm.name?.trim()) return toast.error('Option name is required');
    if (!activeGroupOptions) return;

    const val = (optionForm.value || optionForm.name).trim();
    setSaving(true);

    try {
      const isNew = editingOption === 'new';
      const url = isNew 
        ? `/api/admin/product-filters/${activeGroupOptions.id}/options` 
        : `/api/admin/product-filters/${activeGroupOptions.id}/options/${editingOption.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: optionForm.name.trim(),
          value: val,
          enabled: optionForm.enabled !== false
        })
      });

      if (res.ok) {
        toast.success(isNew ? 'Option added' : 'Option updated');
        setEditingOption(null);
        load();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || 'Failed to save option');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving option');
    } finally {
      setSaving(false);
    }
  };

  // Option Toggle Status
  const toggleOptionStatus = async (groupId, option) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const newStatus = !option.enabled;
    const updatedOptions = (group.options || []).map(o => o.id === option.id ? { ...o, enabled: newStatus } : o);
    setGroups(groups.map(g => g.id === groupId ? { ...g, options: updatedOptions } : g));

    try {
      const res = await fetch(`/api/admin/product-filters/${groupId}/options/${option.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newStatus })
      });
      if (res.ok) {
        toast.success(`Option "${option.name}" ${newStatus ? 'enabled' : 'disabled'}`);
      } else {
        load();
      }
    } catch (err) {
      load();
    }
  };

  // Confirm Delete Handler
  const executeDelete = async () => {
    if (!deleteConfirm) return;
    const { type, groupId, optionId } = deleteConfirm;
    setSaving(true);

    try {
      if (type === 'group') {
        const res = await fetch(`/api/admin/product-filters/${groupId}`, { method: 'DELETE', credentials: 'include' });
        if (res.ok) {
          toast.success('Filter group deleted');
          if (activeGroupOptions?.id === groupId) setActiveGroupOptions(null);
          load();
        } else {
          toast.error('Failed to delete filter group');
        }
      } else if (type === 'option') {
        const res = await fetch(`/api/admin/product-filters/${groupId}/options/${optionId}`, { method: 'DELETE', credentials: 'include' });
        if (res.ok) {
          toast.success('Option deleted');
          load();
        } else {
          toast.error('Failed to delete option');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Error deleting item');
    } finally {
      setSaving(false);
      setDeleteConfirm(null);
    }
  };

  const filteredGroups = search 
    ? groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()) || g.key.toLowerCase().includes(search.toLowerCase()))
    : groups;

  return (
    <div className="pb-16 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-3 mb-6 sm:mb-8">
        <div>
          <div className="font-display text-2xl xs:text-3xl sm:text-4xl text-[#1A1A1A] font-light">Product Filter</div>
          <p className="text-xs text-neutral-500 mt-1">Manage storefront filter groups, option ordering, and display status.</p>
          <div className="gold-line w-12 mt-2" />
        </div>
        <button
          onClick={() => {
            setEditingGroup('new');
            setGroupForm({ name: '', key: '', type: 'options', enabled: true });
          }}
          className="flex items-center justify-center gap-2 bg-[#1A1A1A] text-white px-5 py-2.5 text-[11px] tracking-widest uppercase rounded-md hover:bg-[#9C6B30] transition-colors cursor-pointer font-semibold shadow-xs w-full xs:w-auto"
        >
          <Plus size={14} /> Add Filter Group
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search filter groups or keys…"
          className="w-full pl-9 pr-4 py-2 border border-neutral-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#9C6B30] transition-colors"
        />
      </div>

      {/* Filter Groups List */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-xl border border-neutral-200">
          <Loader2 className="animate-spin inline text-[#9C6B30]" size={28} />
          <p className="text-xs text-neutral-400 mt-2">Loading filter configuration…</p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-neutral-200">
          <SlidersHorizontal size={36} className="mx-auto text-neutral-300 stroke-[1.2] mb-3" />
          <p className="text-sm font-medium text-neutral-700">No filter groups found</p>
          <button
            onClick={() => {
              setEditingGroup('new');
              setGroupForm({ name: '', key: '', type: 'options', enabled: true });
            }}
            className="mt-4 inline-flex items-center gap-1.5 bg-[#1A1A1A] text-white px-4 py-2 text-[10px] tracking-widest uppercase rounded-md hover:bg-[#9C6B30] transition-colors"
          >
            <Plus size={12} /> Add First Filter Group
          </button>
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={filteredGroups}
          onReorder={handleGroupReorder}
          className="space-y-3"
        >
          {filteredGroups.map((group) => {
            const enabledOptsCount = (group.options || []).filter(o => o.enabled !== false).length;
            const totalOptsCount = group.options?.length || 0;

            return (
              <Reorder.Item
                key={group.id}
                value={group}
                className={`bg-white rounded-xl border p-3.5 sm:p-5 transition-all shadow-2xs hover:shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 select-none ${
                  group.enabled !== false ? 'border-neutral-200' : 'border-neutral-200/60 bg-neutral-50/50 opacity-70'
                }`}
              >
                {/* Drag handle & Group Details */}
                <div className="flex items-center gap-3 xs:gap-4 min-w-0">
                  <div className="cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-700 p-1 shrink-0" title="Drag to reorder">
                    <GripVertical size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-neutral-900 text-sm sm:text-base">{group.name}</span>
                      <span className="text-[10px] font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded border border-neutral-200">
                        key: {group.key}
                      </span>
                      {group.type === 'price' && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                          Price Range
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] sm:text-xs text-neutral-400 mt-1 flex items-center gap-2 xs:gap-3 flex-wrap">
                      <span>{group.type === 'price' ? 'Range Slider' : `${enabledOptsCount}/${totalOptsCount} options active`}</span>
                      <span>•</span>
                      <span className={group.enabled !== false ? 'text-emerald-600 font-medium' : 'text-neutral-400'}>
                        {group.enabled !== false ? 'Enabled on Storefront' : 'Disabled (Hidden)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 xs:gap-2 shrink-0 self-end sm:self-auto flex-wrap">
                  <button
                    onClick={() => setActiveGroupOptions(group)}
                    className="px-2.5 xs:px-3 py-1.5 text-xs bg-[#FAF6EF] text-[#9C6B30] hover:bg-[#9C6B30] hover:text-white border border-[#9C6B30]/30 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Settings2 size={13} /> Options ({totalOptsCount})
                  </button>

                  <button
                    onClick={() => toggleGroupStatus(group)}
                    className={`p-1.5 sm:p-2 rounded-md transition-colors cursor-pointer ${
                      group.enabled !== false
                        ? 'text-emerald-700 hover:bg-emerald-50'
                        : 'text-neutral-400 hover:bg-neutral-100'
                    }`}
                    title={group.enabled !== false ? 'Disable group' : 'Enable group'}
                  >
                    {group.enabled !== false ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>

                  <button
                    onClick={() => {
                      setEditingGroup(group);
                      setGroupForm({ 
                        name: group.name, 
                        key: group.key, 
                        type: group.type || 'options', 
                        enabled: group.enabled !== false,
                        priceConfig: group.priceConfig || { min: 0, max: 1000000, step: 5000 }
                      });
                    }}
                    className="p-1.5 sm:p-2 text-neutral-400 hover:text-[#9C6B30] hover:bg-neutral-50 rounded-md transition-colors cursor-pointer"
                    title="Edit Group"
                  >
                    <Pencil size={15} />
                  </button>

                  <button
                    onClick={() => setDeleteConfirm({ type: 'group', groupId: group.id, name: group.name })}
                    className="p-1.5 sm:p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                    title="Delete Group"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      )}

      {/* Modal: Create / Edit Group */}
      <AnimatePresence>
        {editingGroup && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setEditingGroup(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-neutral-100"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-neutral-100 pb-4 mb-5">
                <h3 className="font-display text-xl text-neutral-900 font-medium">
                  {editingGroup === 'new' ? 'Add Filter Group' : 'Edit Filter Group'}
                </h3>
                <button onClick={() => setEditingGroup(null)} className="p-1 rounded-full text-neutral-400 hover:text-neutral-800">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block mb-1">Group Name</label>
                  <input
                    value={groupForm.name}
                    onChange={e => {
                      const name = e.target.value;
                      setGroupForm(f => ({
                        ...f,
                        name,
                        key: editingGroup === 'new' ? name.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-') : f.key
                      }));
                    }}
                    placeholder="E.g., Occasion, Material, Price"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#9C6B30]"
                  />
                </div>

                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block mb-1">Key / Slug (Database field identifier)</label>
                  <input
                    value={groupForm.key}
                    onChange={e => setGroupForm({ ...groupForm, key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-') })}
                    placeholder="e.g. occasion, material, price"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm font-mono bg-white focus:outline-none focus:border-[#9C6B30]"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">Product attributes or specifications matching this key will automatically filter products.</p>
                </div>

                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block mb-1">Filter Type</label>
                  <select
                    value={groupForm.type}
                    onChange={e => setGroupForm({ ...groupForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#9C6B30]"
                  >
                    <option value="options">Standard Options (Checkboxes / Selectable List)</option>
                    <option value="price">Price Range Slider</option>
                  </select>
                </div>

                {(groupForm.type === 'price' || groupForm.key === 'price') && (
                  <div className="p-3 bg-[#FAF6EF]/50 border border-[#9C6B30]/20 rounded-lg space-y-3">
                    <span className="text-[11px] font-bold text-[#9C6B30] uppercase tracking-wider block">
                      Price Range Slider Bounds
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[9px] uppercase tracking-wider text-neutral-500 font-semibold block">Min Price (₹)</label>
                        <input
                          type="number"
                          value={groupForm.priceConfig?.min ?? 0}
                          onChange={e => setGroupForm({
                            ...groupForm,
                            priceConfig: { ...(groupForm.priceConfig || {}), min: +e.target.value }
                          })}
                          className="w-full px-2 py-1.5 border border-neutral-200 rounded text-xs bg-white focus:outline-none focus:border-[#9C6B30] font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase tracking-wider text-neutral-500 font-semibold block">Max Price (₹)</label>
                        <input
                          type="number"
                          value={groupForm.priceConfig?.max ?? 1000000}
                          onChange={e => setGroupForm({
                            ...groupForm,
                            priceConfig: { ...(groupForm.priceConfig || {}), max: +e.target.value }
                          })}
                          className="w-full px-2 py-1.5 border border-neutral-200 rounded text-xs bg-white focus:outline-none focus:border-[#9C6B30] font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase tracking-wider text-neutral-500 font-semibold block">Step (₹)</label>
                        <input
                          type="number"
                          value={groupForm.priceConfig?.step ?? 5000}
                          onChange={e => setGroupForm({
                            ...groupForm,
                            priceConfig: { ...(groupForm.priceConfig || {}), step: +e.target.value }
                          })}
                          className="w-full px-2 py-1.5 border border-neutral-200 rounded text-xs bg-white focus:outline-none focus:border-[#9C6B30] font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-neutral-700">
                    <input
                      type="checkbox"
                      checked={groupForm.enabled}
                      onChange={e => setGroupForm({ ...groupForm, enabled: e.target.checked })}
                      className="accent-[#9C6B30] h-4 w-4 rounded"
                    />
                    <span>Enabled (Visible on Storefront)</span>
                  </label>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-100 flex justify-end gap-3">
                <button onClick={() => setEditingGroup(null)} className="px-4 py-2 text-xs text-neutral-500 hover:text-neutral-800">
                  Cancel
                </button>
                <button
                  disabled={saving}
                  onClick={saveGroup}
                  className="px-5 py-2 bg-[#1A1A1A] hover:bg-[#9C6B30] text-white text-[11px] tracking-widest uppercase rounded-md transition-colors flex items-center gap-2 font-semibold cursor-pointer disabled:opacity-60"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : 'Save Group'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Drawer / Modal: Manage Options inside Group */}
      <AnimatePresence>
        {activeGroupOptions && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end" onClick={() => setActiveGroupOptions(null)}>
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="bg-white w-full max-w-xl h-full flex flex-col shadow-2xl border-l border-neutral-100"
              onClick={e => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-neutral-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div>
                  <div className="text-[10px] tracking-widest uppercase text-[#9C6B30] font-semibold">Filter Options Manager</div>
                  <h3 className="font-display text-2xl text-neutral-900 font-semibold">{activeGroupOptions.name}</h3>
                  <p className="text-xs text-neutral-400 font-mono mt-0.5">key: {activeGroupOptions.key}</p>
                </div>
                <button onClick={() => setActiveGroupOptions(null)} className="p-2 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50">
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Toolbar */}
              <div className="px-6 py-4 bg-[#FAF6EF]/30 border-b border-neutral-100 flex justify-between items-center">
                <span className="text-xs text-neutral-600 font-medium">
                  {activeGroupOptions.options?.length || 0} Total Options
                </span>
                <button
                  onClick={() => {
                    setEditingOption('new');
                    setOptionForm({ name: '', value: '', enabled: true });
                  }}
                  className="flex items-center gap-1.5 bg-[#1A1A1A] hover:bg-[#9C6B30] text-white px-3.5 py-1.5 text-[10px] tracking-widest uppercase rounded-md transition-colors font-semibold cursor-pointer"
                >
                  <Plus size={12} /> Add Option
                </button>
              </div>

              {/* Options List with Reorder */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-neutral-50/50">
                {(!activeGroupOptions.options || activeGroupOptions.options.length === 0) ? (
                  <div className="text-center py-12 border-2 border-dashed border-neutral-200 rounded-xl bg-white">
                    <p className="text-xs text-neutral-400">No options in this group yet.</p>
                    <button
                      onClick={() => {
                        setEditingOption('new');
                        setOptionForm({ name: '', value: '', enabled: true });
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 bg-[#1A1A1A] text-white px-3.5 py-1.5 text-[10px] tracking-widest uppercase rounded-md"
                    >
                      <Plus size={12} /> Add First Option
                    </button>
                  </div>
                ) : (
                  <Reorder.Group
                    axis="y"
                    values={activeGroupOptions.options}
                    onReorder={(newOpts) => handleOptionReorder(activeGroupOptions.id, newOpts)}
                    className="space-y-2.5"
                  >
                    {activeGroupOptions.options.map((opt) => (
                      <Reorder.Item
                        key={opt.id}
                        value={opt}
                        className={`bg-white rounded-lg border p-3 flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition-shadow select-none ${
                          opt.enabled !== false ? 'border-neutral-200' : 'border-neutral-200 bg-neutral-50/60 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-600 p-1" title="Drag to reorder">
                            <GripVertical size={14} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-neutral-800 text-sm">{opt.name}</span>
                              <span className="text-[9px] font-mono text-neutral-400">({opt.value})</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => toggleOptionStatus(activeGroupOptions.id, opt)}
                            className={`p-1.5 rounded transition-colors cursor-pointer ${
                              opt.enabled !== false ? 'text-emerald-700 hover:bg-emerald-50' : 'text-neutral-400 hover:bg-neutral-100'
                            }`}
                            title={opt.enabled !== false ? 'Disable option' : 'Enable option'}
                          >
                            {opt.enabled !== false ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>

                          <button
                            onClick={() => {
                              setEditingOption(opt);
                              setOptionForm({ name: opt.name, value: opt.value, enabled: opt.enabled !== false });
                            }}
                            className="p-1.5 text-neutral-400 hover:text-[#9C6B30] hover:bg-neutral-50 rounded transition-colors cursor-pointer"
                            title="Edit Option"
                          >
                            <Pencil size={14} />
                          </button>

                          <button
                            onClick={() => setDeleteConfirm({ type: 'option', groupId: activeGroupOptions.id, optionId: opt.id, name: opt.name })}
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Delete Option"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-neutral-100 bg-white flex justify-end">
                <button
                  onClick={() => setActiveGroupOptions(null)}
                  className="px-5 py-2 bg-[#1A1A1A] hover:bg-[#9C6B30] text-white text-[11px] tracking-widest uppercase rounded-md transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Create / Edit Option */}
      <AnimatePresence>
        {editingOption && activeGroupOptions && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setEditingOption(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-neutral-100"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-neutral-100 pb-3 mb-4">
                <h3 className="font-display text-lg text-neutral-900 font-medium">
                  {editingOption === 'new' ? 'Add Option' : 'Edit Option'}
                </h3>
                <button onClick={() => setEditingOption(null)} className="p-1 rounded-full text-neutral-400 hover:text-neutral-800">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block mb-1">Option Name (Display text)</label>
                  <input
                    value={optionForm.name}
                    onChange={e => {
                      const name = e.target.value;
                      setOptionForm(f => ({
                        ...f,
                        name,
                        value: editingOption === 'new' ? name : f.value
                      }));
                    }}
                    placeholder="E.g., Rose Gold, Party, Uncut Polki"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#9C6B30]"
                  />
                </div>

                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block mb-1">Option Value (Product attribute filter value)</label>
                  <input
                    value={optionForm.value}
                    onChange={e => setOptionForm({ ...optionForm, value: e.target.value })}
                    placeholder="E.g. Rose Gold, party, Uncut Polki"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#9C6B30]"
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-neutral-700">
                    <input
                      type="checkbox"
                      checked={optionForm.enabled}
                      onChange={e => setOptionForm({ ...optionForm, enabled: e.target.checked })}
                      className="accent-[#9C6B30] h-4 w-4 rounded"
                    />
                    <span>Enabled</span>
                  </label>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-neutral-100 flex justify-end gap-2">
                <button onClick={() => setEditingOption(null)} className="px-3.5 py-1.5 text-xs text-neutral-500 hover:text-neutral-800">
                  Cancel
                </button>
                <button
                  disabled={saving}
                  onClick={saveOption}
                  className="px-4 py-1.5 bg-[#1A1A1A] hover:bg-[#9C6B30] text-white text-[10px] tracking-widest uppercase rounded-md transition-colors flex items-center gap-1.5 font-semibold cursor-pointer"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : 'Save Option'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Safety Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-neutral-100"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 text-red-600 mb-3">
                <AlertTriangle size={24} />
                <h3 className="font-display text-lg text-neutral-900 font-semibold">
                  Delete {deleteConfirm.type === 'group' ? 'Filter Group' : 'Option'}?
                </h3>
              </div>

              <p className="text-xs text-neutral-600 leading-relaxed">
                Are you sure you want to delete &ldquo;<span className="font-semibold text-neutral-900">{deleteConfirm.name}</span>&rdquo;?
                {deleteConfirm.type === 'group' && ' All options inside this group will also be removed from the storefront.'}
              </p>

              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-xs rounded-md font-medium"
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  onClick={executeDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : 'Confirm Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
