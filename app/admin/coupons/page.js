'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, Loader2, Tag, Check, Power, Sparkles, Eye } from 'lucide-react';
import { toast } from 'sonner';

function renderFormattedPreview(text) {
  if (!text) return null;
  const parts = text.split(/(\b[A-Z0-9]{3,}\b)/g);
  return parts.map((part, i) => {
    if (/^[A-Z0-9]{3,}$/.test(part) && !/^\d+$/.test(part)) {
      return <span key={i} className="font-semibold text-[#9C6B30]">{part}</span>;
    }
    return part;
  });
}

export default function CouponsPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Customer Coupon Display / Helper Text State
  const [helperText, setHelperText] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [lastSavedText, setLastSavedText] = useState(null);

  // Form State
  const [form, setForm] = useState({
    code: '',
    type: 'percent', // 'percent' or 'flat'
    value: '',
    minOrder: '0',
    active: true
  });

  // Validation Errors
  const [errors, setErrors] = useState({
    code: '',
    value: '',
    minOrder: ''
  });

  const loadCouponSettings = async () => {
    try {
      const res = await fetch('/api/admin/coupons/settings', {
        credentials: 'include',
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.data?.helperText ?? data.helperText ?? '';
        setHelperText(text);
        setLastSavedText(text);
      }
    } catch (err) {
      console.error('Failed to load coupon settings:', err);
    }
  };

  const handleSaveHelperText = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/coupons/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helperText })
      });
      const data = await res.json();
      if (res.ok) {
        const saved = data.data?.helperText ?? data.helperText ?? helperText;
        setHelperText(saved);
        setLastSavedText(saved);
        toast.success('Coupon display text updated successfully.');
      } else {
        toast.error(data.error || 'Unable to save coupon display text. Please try again.');
      }
    } catch (err) {
      console.error('Failed to save coupon display text:', err);
      toast.error('Unable to save coupon display text. Please try again.');
    } finally {
      setSavingSettings(false);
    }
  };

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
    loadCouponSettings();
  }, []);

  const validateField = (field, val, currentType = form.type) => {
    let err = '';
    if (field === 'code') {
      const clean = (val || '').trim();
      if (!clean) err = 'Coupon code is required';
      else if (clean.length < 3) err = 'Coupon code must be at least 3 characters';
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
    setErrors(prev => ({ ...prev, [field]: err }));
    return !err;
  };

  const handleTypeChange = (newType) => {
    setForm(prev => ({ ...prev, type: newType }));
    if (form.value) {
      validateField('value', form.value, newType);
    }
  };

  const handleAddCoupon = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const isCodeValid = validateField('code', form.code);
    const isValueValid = validateField('value', form.value, form.type);
    const isMinOrderValid = validateField('minOrder', form.minOrder);

    if (!isCodeValid || !isValueValid || !isMinOrderValid) {
      toast.error('Please fix the required fields before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
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
      }
    } catch (err) {
      console.error('Error adding coupon:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setSubmitting(false);
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

  return (
    <div>
      <div className="font-display text-2xl xs:text-3xl sm:text-4xl text-[#1A1A1A]">Coupons</div>
      <div className="gold-line w-12 mt-2 mb-6 sm:mb-8" />

      {/* Coupon Creation Form */}
      <form onSubmit={handleAddCoupon} className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-6 mb-8 shadow-sm">
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
            {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
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

      {/* Customer Coupon Display / Helper Text Settings */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-6 mb-8 shadow-sm">
        <div className="text-xs uppercase tracking-widest text-[#9C6B30] font-semibold mb-2 flex items-center gap-1.5">
          <Sparkles size={14} /> Customer Coupon Display
        </div>
        <p className="text-xs text-neutral-500 mb-5">
          Configure the suggestion or helper text displayed directly below the coupon input on the customer cart page.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Input & Save */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block mb-1">
                Helper Text
              </label>
              <input
                type="text"
                placeholder="e.g. Try MIKUMANTRA10 or WELCOME2000"
                value={helperText}
                onChange={e => setHelperText(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-neutral-200 rounded text-sm focus:outline-none focus:border-[#9C6B30] transition-colors"
              />
              <p className="text-[11px] text-neutral-400 mt-1.5">
                Leave empty to hide the helper text completely on the customer cart page. Supports symbols: ₹, %, -, &, !, ., ,, ()
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSaveHelperText}
                disabled={savingSettings}
                className="flex items-center justify-center gap-2 bg-[#1A1A1A] text-white px-6 py-2.5 text-[11px] tracking-widest uppercase rounded hover:bg-[#9C6B30] transition-colors disabled:opacity-50 cursor-pointer font-medium"
              >
                {savingSettings ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Save Settings
              </button>
              {lastSavedText !== null && lastSavedText === helperText && (
                <span className="text-xs text-emerald-600 flex items-center gap-1">
                  <Check size={12} /> Saved in database
                </span>
              )}
            </div>
          </div>

          {/* Right: Live Customer Preview */}
          <div className="lg:col-span-5 bg-[#FAF6EF]/60 border border-[#E8E8E8] rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-widest text-[#9C6B30] font-bold flex items-center gap-1.5">
                <Eye size={13} /> Customer Preview
              </span>
              <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-mono bg-white px-2 py-0.5 rounded border border-neutral-200">
                Live Preview
              </span>
            </div>

            <div className="bg-white rounded-lg p-3 border border-[#E8E8E8] shadow-xs">
              <div className="text-[11px] font-medium text-neutral-600 mb-2">Order Summary</div>
              <div className="flex gap-2 mb-2">
                <div className="flex-1 flex items-center border border-[#E8E8E8] rounded-md px-2.5 py-1.5 text-xs text-neutral-400 bg-neutral-50/50">
                  <Tag size={13} className="text-[#9C6B30] mr-2 shrink-0" />
                  ENTER COUPON
                </div>
                <button type="button" className="px-3 py-1.5 bg-[#1A1A1A] text-white text-[10px] tracking-widest uppercase rounded font-medium opacity-90 cursor-default">
                  Apply
                </button>
              </div>

              {helperText.trim() ? (
                <div className="text-[10px] text-neutral-500 transition-all font-normal">
                  {renderFormattedPreview(helperText)}
                </div>
              ) : (
                <div className="text-[10px] text-neutral-400 italic">
                  (Hidden on cart — no empty space)
                </div>
              )}
            </div>
            <p className="text-[10px] text-neutral-400 mt-2.5">
              Updates in real-time as you type. Click &quot;Save Settings&quot; to apply to the customer storefront.
            </p>
          </div>
        </div>
      </div>

      {/* Coupons List */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-neutral-500 font-medium">
          Existing Coupons ({list.length})
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
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-100 shadow-sm overflow-hidden">
          {list.map(item => (
            <div
              key={item.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-neutral-50/60 transition-colors"
            >
              <div className="flex flex-wrap items-center gap-3 min-w-0">
                {/* Code badge */}
                <span className="font-mono font-bold text-sm bg-[#FAF6EF] text-[#9C6B30] border border-[#9C6B30]/30 px-3 py-1 rounded tracking-wider">
                  {item.code}
                </span>

                {/* Discount value badge */}
                <span className="text-sm font-semibold text-neutral-800">
                  {item.type === 'percent' ? `${item.value}% OFF` : `₹${Number(item.value).toLocaleString('en-IN')} FLAT OFF`}
                </span>

                {/* Min order requirement */}
                <span className="text-xs text-neutral-500">
                  {item.minOrder > 0 ? `Min order: ₹${Number(item.minOrder).toLocaleString('en-IN')}` : 'No min order'}
                </span>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
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
          ))}
        </div>
      )}
    </div>
  );
}
