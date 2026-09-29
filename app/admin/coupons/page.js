'use client';
import { useEffect, useState, useMemo } from 'react';
import { Plus, Trash2, Loader2, Tag, Check, Power, Pencil, X, Search, AlertTriangle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function CouponsPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State for creating new coupon
  const [form, setForm] = useState({
    code: '',
    type: 'percent', // 'percent' or 'flat'
    value: '',
    minOrder: '0',
    active: true
  });

  // Validation Errors for creation form
  const [errors, setErrors] = useState({
    code: '',
    value: '',
    minOrder: ''
  });

  // Edit Modal State
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [editForm, setEditForm] = useState({
    code: '',
    type: 'percent',
    value: '',
    minOrder: '0',
    active: true
  });
  const [editErrors, setEditErrors] = useState({
    code: '',
    value: '',
    minOrder: ''
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/coupons', {
        credentials: 'include',
        cache: 'no-store'
      });
      const data = await res.json();
      setList(data.coupons || []);
    } catch (err) {
      console.error('Failed to load coupons:', err);
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  // Validation logic with duplicate check
  const validateField = (field, val, currentType = form.type, editingId = null) => {
    let err = '';
    if (field === 'code') {
      const clean = (val || '').trim().toUpperCase();
      if (!clean) {
        err = 'Coupon code is required';
      } else if (clean.length < 3) {
        err = 'Coupon code must be at least 3 characters';
      } else {
        // Duplicate check against current coupons list
        const exists = list.some(
          c => c.id !== editingId && (c.code || '').trim().toUpperCase() === clean
        );
        if (exists) {
          err = `Coupon code '${clean}' already exists. Codes must be unique.`;
        }
      }
    }
    if (field === 'value') {
      if (val === '' || val === undefined || val === null) {
        err = 'Discount value is required';
      } else {
        const num = Number(val);
        if (isNaN(num) || num <= 0) {
          err = 'Value must be a number greater than 0';
        } else if (currentType === 'percent' && num > 100) {
          err = 'Percentage discount cannot exceed 100%';
        }
      }
    }
    if (field === 'minOrder') {
      if (val !== '' && val !== undefined && val !== null) {
        const num = Number(val);
        if (isNaN(num) || num < 0) {
          err = 'Min order cannot be negative';
        }
      }
    }

    if (editingId) {
      setEditErrors(prev => ({ ...prev, [field]: err }));
    } else {
      setErrors(prev => ({ ...prev, [field]: err }));
    }
    return !err;
  };

  const handleTypeChange = (newType) => {
    setForm(prev => ({ ...prev, type: newType }));
    if (form.value) {
      validateField('value', form.value, newType);
    }
  };

  const handleEditTypeChange = (newType) => {
    setEditForm(prev => ({ ...prev, type: newType }));
    if (editForm.value) {
      validateField('value', editForm.value, newType, editingCoupon?.id);
    }
  };

  const handleAddCoupon = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const isCodeValid = validateField('code', form.code);
    const isValueValid = validateField('value', form.value, form.type);
    const isMinOrderValid = validateField('minOrder', form.minOrder);

    if (!isCodeValid || !isValueValid || !isMinOrderValid) {
      toast.error('Please fix the validation errors before submitting.');
      return;
    }

    const cleanCode = form.code.trim().toUpperCase();
    if (list.some(c => (c.code || '').trim().toUpperCase() === cleanCode)) {
      toast.error(`Coupon code '${cleanCode}' already exists.`);
      setErrors(prev => ({ ...prev, code: `Coupon code '${cleanCode}' already exists.` }));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        code: cleanCode,
        type: form.type,
        value: Number(form.value),
        minOrder: Number(form.minOrder) || 0,
        active: Boolean(form.active)
      };

      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Coupon '${payload.code}' added successfully!`);
        setForm({
          code: '',
          type: 'percent',
          value: '',
          minOrder: '0',
          active: true
        });
        setErrors({ code: '', value: '', minOrder: '' });
        loadCoupons();
      } else {
        toast.error(data.error || 'Failed to add coupon');
        if (data.error && data.error.includes('already exists')) {
          setErrors(prev => ({ ...prev, code: data.error }));
        }
      }
    } catch (err) {
      console.error('Error adding coupon:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (item) => {
    setEditingCoupon(item);
    setEditForm({
      code: item.code || '',
      type: item.type || 'percent',
      value: String(item.value || ''),
      minOrder: String(item.minOrder || 0),
      active: Boolean(item.active)
    });
    setEditErrors({ code: '', value: '', minOrder: '' });
  };

  const closeEditModal = () => {
    setEditingCoupon(null);
    setEditErrors({ code: '', value: '', minOrder: '' });
  };

  const handleSaveEdit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editingCoupon) return;

    const isCodeValid = validateField('code', editForm.code, editForm.type, editingCoupon.id);
    const isValueValid = validateField('value', editForm.value, editForm.type, editingCoupon.id);
    const isMinOrderValid = validateField('minOrder', editForm.minOrder, editForm.type, editingCoupon.id);

    if (!isCodeValid || !isValueValid || !isMinOrderValid) {
      toast.error('Please fix the validation errors before saving.');
      return;
    }

    const cleanCode = editForm.code.trim().toUpperCase();
    const isDup = list.some(
      c => c.id !== editingCoupon.id && (c.code || '').trim().toUpperCase() === cleanCode
    );
    if (isDup) {
      toast.error(`Coupon code '${cleanCode}' already exists.`);
      setEditErrors(prev => ({ ...prev, code: `Coupon code '${cleanCode}' already exists.` }));
      return;
    }

    setEditSubmitting(true);
    try {
      const payload = {
        code: cleanCode,
        type: editForm.type,
        value: Number(editForm.value),
        minOrder: Number(editForm.minOrder) || 0,
        active: Boolean(editForm.active)
      };

      const res = await fetch(`/api/admin/coupons/${editingCoupon.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Coupon '${payload.code}' updated successfully!`);
        closeEditModal();
        loadCoupons();
      } else {
        toast.error(data.error || 'Failed to update coupon');
        if (data.error && data.error.includes('already exists')) {
          setEditErrors(prev => ({ ...prev, code: data.error }));
        }
      }
    } catch (err) {
      console.error('Error updating coupon:', err);
      toast.error('An unexpected error occurred while updating the coupon.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteCoupon = async (id, code) => {
    if (!confirm(`Are you sure you want to delete coupon '${code}'?`)) return;
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        toast.success(`Coupon '${code}' deleted`);
        loadCoupons();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete coupon');
      }
    } catch (err) {
      toast.error('Failed to delete coupon');
    }
  };

  const handleToggleActive = async (item) => {
    try {
      const res = await fetch(`/api/admin/coupons/${item.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !item.active })
      });
      if (res.ok) {
        toast.success(`Coupon '${item.code}' is now ${!item.active ? 'active' : 'inactive'}`);
        loadCoupons();
      } else {
        toast.error('Failed to update coupon status');
      }
    } catch (err) {
      toast.error('Failed to update coupon');
    }
  };

  // Group coupons by uppercase code to detect duplicates if any ever exist
  const codeOccurrences = useMemo(() => {
    const map = {};
    list.forEach(c => {
      const k = (c.code || '').trim().toUpperCase();
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  }, [list]);

  const hasDuplicateCodes = useMemo(() => {
    return Object.values(codeOccurrences).some(count => count > 1);
  }, [codeOccurrences]);

  // Filtered list based on search query
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.trim().toUpperCase();
    return list.filter(c => (c.code || '').toUpperCase().includes(q));
  }, [list, searchQuery]);

  const activeCount = useMemo(() => list.filter(c => c.active).length, [list]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div>
          <div className="font-display text-2xl xs:text-3xl sm:text-4xl text-[#1A1A1A]">Coupons</div>
          <div className="gold-line w-12 mt-2 mb-2" />
        </div>

        {/* Quick Stats Pill */}
        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 bg-white border border-neutral-200 rounded-lg text-neutral-600 font-medium">
            Total: <strong className="text-neutral-900">{list.length}</strong>
          </span>
          <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 font-medium">
            Active: <strong>{activeCount}</strong>
          </span>
          <span className="px-3 py-1 bg-neutral-100 border border-neutral-200 rounded-lg text-neutral-600 font-medium">
            Inactive: <strong>{list.length - activeCount}</strong>
          </span>
        </div>
      </div>

      {/* Duplicate Alert Banner if duplicate codes exist */}
      {hasDuplicateCodes && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs sm:text-sm flex items-start gap-3 shadow-xs">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-amber-950">Duplicate Coupon Codes Detected</div>
            <p className="mt-0.5 text-amber-800">
              Multiple coupons have identical codes in your database. Please delete or edit duplicate codes to ensure customers receive the intended discount during checkout.
            </p>
          </div>
        </div>
      )}

      {/* Coupon Creation Form */}
      <form onSubmit={handleAddCoupon} className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-6 mb-8 shadow-xs">
        <div className="text-xs uppercase tracking-widest text-[#9C6B30] font-semibold mb-4 flex items-center gap-1.5">
          <Tag size={14} /> Create New Coupon
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Coupon Code */}
          <div>
            <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block mb-1">
              Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. FESTIVE20"
              value={form.code}
              onChange={e => {
                const val = e.target.value.toUpperCase();
                setForm(prev => ({ ...prev, code: val }));
                if (errors.code) validateField('code', val);
              }}
              onBlur={e => validateField('code', e.target.value)}
              className={`w-full px-3 py-2 border rounded text-sm uppercase font-mono tracking-wider focus:outline-none focus:border-[#9C6B30] ${
                errors.code ? 'border-red-500 bg-red-50/20' : 'border-neutral-200'
              }`}
            />
            {errors.code && <p className="text-xs text-red-500 mt-1 font-medium">{errors.code}</p>}
          </div>

          {/* Discount Type Checkboxes */}
          <div>
            <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block mb-1">
              Discount Type <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-6 h-10 px-1">
              {/* Percentage Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={form.type === 'percent'}
                  onChange={() => handleTypeChange('percent')}
                  className="accent-[#9C6B30] h-4 w-4 rounded cursor-pointer"
                />
                <span className={`text-xs sm:text-sm font-medium transition-colors ${
                  form.type === 'percent' ? 'text-[#9C6B30] font-semibold' : 'text-neutral-600 hover:text-neutral-900'
                }`}>
                  Percentage (%)
                </span>
              </label>

              {/* Flat Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={form.type === 'flat'}
                  onChange={() => handleTypeChange('flat')}
                  className="accent-[#9C6B30] h-4 w-4 rounded cursor-pointer"
                />
                <span className={`text-xs sm:text-sm font-medium transition-colors ${
                  form.type === 'flat' ? 'text-[#9C6B30] font-semibold' : 'text-neutral-600 hover:text-neutral-900'
                }`}>
                  Flat (₹)
                </span>
              </label>
            </div>
          </div>

          {/* Discount Value */}
          <div>
            <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block mb-1">
              Value ({form.type === 'percent' ? '%' : '₹'}) <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                type="number"
                required
                min="0.01"
                step="any"
                placeholder={form.type === 'percent' ? 'e.g. 15' : 'e.g. 500'}
                value={form.value}
                onChange={e => {
                  const val = e.target.value;
                  setForm(prev => ({ ...prev, value: val }));
                  if (errors.value) validateField('value', val);
                }}
                onBlur={e => validateField('value', e.target.value)}
                className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:border-[#9C6B30] ${
                  errors.value ? 'border-red-500 bg-red-50/20' : 'border-neutral-200'
                }`}
              />
              <span className="absolute right-3 text-neutral-400 font-medium text-xs pointer-events-none">
                {form.type === 'percent' ? '%' : '₹'}
              </span>
            </div>
            {errors.value && <p className="text-xs text-red-500 mt-1">{errors.value}</p>}
          </div>

          {/* Min Order */}
          <div>
            <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block mb-1">
              Min Order (₹)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="0 (No minimum)"
              value={form.minOrder}
              onChange={e => {
                const val = e.target.value;
                setForm(prev => ({ ...prev, minOrder: val }));
                if (errors.minOrder) validateField('minOrder', val);
              }}
              onBlur={e => validateField('minOrder', e.target.value)}
              className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:border-[#9C6B30] ${
                errors.minOrder ? 'border-red-500 bg-red-50/20' : 'border-neutral-200'
              }`}
            />
            {errors.minOrder && <p className="text-xs text-red-500 mt-1">{errors.minOrder}</p>}
          </div>

          {/* Active Status */}
          <div className="flex flex-col justify-center">
            <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block mb-1">
              Active Status
            </label>
            <label className="flex items-center gap-2 h-10 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.active}
                onChange={e => setForm(prev => ({ ...prev, active: e.target.checked }))}
                className="accent-[#9C6B30] h-4 w-4 rounded cursor-pointer"
              />
              <span className="text-xs sm:text-sm text-neutral-700">
                Active (available for customer checkout)
              </span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-5 pt-4 border-t border-neutral-100 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-2 bg-[#1A1A1A] text-white px-6 py-2.5 text-[11px] tracking-widest uppercase rounded hover:bg-[#9C6B30] transition-colors w-full sm:w-auto disabled:opacity-50 cursor-pointer font-medium"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add Coupon
          </button>
        </div>
      </form>

      {/* Coupons List Header & Search */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-wider text-neutral-500 font-medium">
          Existing Coupons ({filteredList.length}{filteredList.length !== list.length ? ` of ${list.length}` : ''})
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search coupons..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:border-[#9C6B30] bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white rounded-xl border border-neutral-200">
          <Loader2 className="animate-spin inline text-[#9C6B30]" size={28} />
          <p className="text-xs text-neutral-400 mt-2">Loading coupons...</p>
        </div>
      ) : list.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-neutral-200">
          <Tag className="mx-auto text-neutral-300 mb-2" size={32} />
          <div className="text-neutral-500 font-medium text-sm">No coupons found</div>
          <p className="text-xs text-neutral-400 mt-1">Create your first coupon above.</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-xl border border-neutral-200 text-xs text-neutral-500">
          No coupons match your search &quot;{searchQuery}&quot;.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-100 shadow-xs overflow-hidden">
          {filteredList.map(item => {
            const isDup = (codeOccurrences[(item.code || '').trim().toUpperCase()] || 0) > 1;
            return (
              <div
                key={item.id}
                className={`p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-neutral-50/60 transition-colors ${
                  isDup ? 'bg-amber-50/40' : ''
                }`}
              >
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 min-w-0">
                  {/* Code badge */}
                  <span className="font-mono font-bold text-sm bg-[#FAF6EF] text-[#9C6B30] border border-[#9C6B30]/30 px-3 py-1 rounded tracking-wider">
                    {item.code}
                  </span>

                  {/* Duplicate warning tag if code appears more than once */}
                  {isDup && (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-red-100 text-red-700 border border-red-300 rounded tracking-wider flex items-center gap-1">
                      <AlertTriangle size={11} /> Duplicate Code
                    </span>
                  )}

                  {/* Discount value badge */}
                  <span className="text-sm font-semibold text-neutral-800">
                    {item.type === 'percent' ? `${item.value}% OFF` : `₹${Number(item.value).toLocaleString('en-IN')} FLAT OFF`}
                  </span>

                  {/* Min order requirement */}
                  <span className="text-xs text-neutral-500">
                    {item.minOrder > 0 ? `Min order: ₹${Number(item.minOrder).toLocaleString('en-IN')}` : 'No min order'}
                  </span>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-center">
                  {/* Active Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(item)}
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 cursor-pointer ${
                      item.active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-neutral-100 text-neutral-500 border-neutral-200 hover:bg-neutral-200'
                    }`}
                    title="Click to toggle active status"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${item.active ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
                    {item.active ? 'Active' : 'Inactive'}
                  </button>

                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="text-neutral-500 hover:text-[#9C6B30] hover:bg-[#FAF6EF] p-1.5 rounded transition-colors cursor-pointer"
                    title="Edit Coupon"
                  >
                    <Pencil size={15} />
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteCoupon(item.id, item.code)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors cursor-pointer"
                    title="Delete Coupon"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Coupon Modal */}
      {editingCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl max-w-lg w-full p-5 sm:p-7 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={closeEditModal}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 p-1 rounded-full hover:bg-neutral-100 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Pencil size={16} className="text-[#9C6B30]" />
              <h2 className="font-display text-xl text-[#1A1A1A]">Edit Coupon</h2>
            </div>
            <p className="text-xs text-neutral-500 mb-5">
              Update details for coupon <strong className="font-mono text-neutral-800">{editingCoupon.code}</strong>. Codes must remain unique across the store.
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Code */}
              <div>
                <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block mb-1">
                  Coupon Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.code}
                  onChange={e => {
                    const val = e.target.value.toUpperCase();
                    setEditForm(prev => ({ ...prev, code: val }));
                    if (editErrors.code) validateField('code', val, editForm.type, editingCoupon.id);
                  }}
                  onBlur={e => validateField('code', e.target.value, editForm.type, editingCoupon.id)}
                  className={`w-full px-3 py-2 border rounded text-sm uppercase font-mono tracking-wider focus:outline-none focus:border-[#9C6B30] ${
                    editErrors.code ? 'border-red-500 bg-red-50/20' : 'border-neutral-200'
                  }`}
                />
                {editErrors.code && <p className="text-xs text-red-500 mt-1 font-medium">{editErrors.code}</p>}
              </div>

              {/* Discount Type */}
              <div>
                <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block mb-1">
                  Discount Type <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-6 h-10 px-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editForm.type === 'percent'}
                      onChange={() => handleEditTypeChange('percent')}
                      className="accent-[#9C6B30] h-4 w-4 rounded cursor-pointer"
                    />
                    <span className={`text-xs sm:text-sm font-medium ${
                      editForm.type === 'percent' ? 'text-[#9C6B30] font-semibold' : 'text-neutral-600'
                    }`}>
                      Percentage (%)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editForm.type === 'flat'}
                      onChange={() => handleEditTypeChange('flat')}
                      className="accent-[#9C6B30] h-4 w-4 rounded cursor-pointer"
                    />
                    <span className={`text-xs sm:text-sm font-medium ${
                      editForm.type === 'flat' ? 'text-[#9C6B30] font-semibold' : 'text-neutral-600'
                    }`}>
                      Flat (₹)
                    </span>
                  </label>
                </div>
              </div>

              {/* Value */}
              <div>
                <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block mb-1">
                  Discount Value ({editForm.type === 'percent' ? '%' : '₹'}) <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="any"
                    value={editForm.value}
                    onChange={e => {
                      const val = e.target.value;
                      setEditForm(prev => ({ ...prev, value: val }));
                      if (editErrors.value) validateField('value', val, editForm.type, editingCoupon.id);
                    }}
                    onBlur={e => validateField('value', e.target.value, editForm.type, editingCoupon.id)}
                    className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:border-[#9C6B30] ${
                      editErrors.value ? 'border-red-500 bg-red-50/20' : 'border-neutral-200'
                    }`}
                  />
                  <span className="absolute right-3 text-neutral-400 font-medium text-xs pointer-events-none">
                    {editForm.type === 'percent' ? '%' : '₹'}
                  </span>
                </div>
                {editErrors.value && <p className="text-xs text-red-500 mt-1">{editErrors.value}</p>}
              </div>

              {/* Min Order */}
              <div>
                <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block mb-1">
                  Min Order (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editForm.minOrder}
                  onChange={e => {
                    const val = e.target.value;
                    setEditForm(prev => ({ ...prev, minOrder: val }));
                    if (editErrors.minOrder) validateField('minOrder', val, editForm.type, editingCoupon.id);
                  }}
                  onBlur={e => validateField('minOrder', e.target.value, editForm.type, editingCoupon.id)}
                  className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:border-[#9C6B30] ${
                    editErrors.minOrder ? 'border-red-500 bg-red-50/20' : 'border-neutral-200'
                  }`}
                />
                {editErrors.minOrder && <p className="text-xs text-red-500 mt-1">{editErrors.minOrder}</p>}
              </div>

              {/* Active Status */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer select-none py-1">
                  <input
                    type="checkbox"
                    checked={editForm.active}
                    onChange={e => setEditForm(prev => ({ ...prev, active: e.target.checked }))}
                    className="accent-[#9C6B30] h-4 w-4 rounded cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm text-neutral-700">
                    Active (available for customer checkout)
                  </span>
                </label>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={editSubmitting}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 text-xs font-medium rounded hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex items-center gap-2 bg-[#1A1A1A] text-white px-5 py-2 text-xs font-medium uppercase tracking-wider rounded hover:bg-[#9C6B30] transition-colors disabled:opacity-50"
                >
                  {editSubmitting && <Loader2 size={13} className="animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
