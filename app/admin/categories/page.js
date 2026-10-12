'use client';
import { useEffect, useState } from 'react';
import {
  Plus, Trash2, Edit2, Loader2, X, Upload, Eye, EyeOff,
  ArrowUp, ArrowDown, Sparkles, Layers, Sliders, Settings2,
  ExternalLink, Check, RotateCcw, Link as LinkIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_CATEGORY_SHOWCASE_SETTINGS } from '@/lib/site-defaults';
import { slugify } from '@/lib/products';

const INITIAL_FORM = {
  name: '',
  slug: '',
  img: '',
  link: '',
  buttonText: '',
  order: '',
  active: true,
  openInNewTab: false
};

export default function CategoriesPage() {
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'settings'
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(INITIAL_FORM);
  const [selectedId, setSelectedId] = useState(null);
  const [isSlugCustomized, setIsSlugCustomized] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving] = useState(false);

  // Settings State
  const [settings, setSettings] = useState(DEFAULT_CATEGORY_SHOWCASE_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);

  // Preview interactive state
  const [previewHoveredId, setPreviewHoveredId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/categories', { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setList(data.categories || data.items || []);
        if (data.settings) {
          setSettings({ ...DEFAULT_CATEGORY_SHOWCASE_SETTINGS, ...data.settings });
        }
      } else {
        toast.error('Failed to load categories');
      }
    } catch (err) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate MIME type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a JPG, PNG, or WEBP image.');
      return;
    }

    // Validate extension
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      toast.error('Please upload a JPG, PNG, or WEBP image.');
      return;
    }

    // Validate size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds the 5MB limit.');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to upload image');
    }

    const data = await res.json();
    return data.url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      let finalImgUrl = form.img;

      if (imageFile) {
        finalImgUrl = await uploadFile(imageFile);
      }

      if (!finalImgUrl) {
        toast.error('Please choose a category image.');
        setSaving(false);
        return;
      }

      const trimmedName = (form.name || '').trim();
      const derivedSlug = slugify(form.slug || form.name);

      if (!trimmedName) {
        toast.error('Category name is required.');
        setSaving(false);
        return;
      }
      if (!derivedSlug) {
        toast.error('Category slug is required.');
        setSaving(false);
        return;
      }

      const duplicate = list.find(c => c.slug === derivedSlug && c.id !== selectedId);
      if (duplicate) {
        toast.error(`A category with slug "${derivedSlug}" already exists (${duplicate.name}). Please use a unique slug.`);
        setSaving(false);
        return;
      }

      const bodyData = {
        ...form,
        name: trimmedName,
        slug: derivedSlug,
        link: form.link ? form.link.trim() : `/shop?category=${derivedSlug}`,
        img: finalImgUrl,
        imageUrl: finalImgUrl,
        active: form.active !== false,
        enabled: form.active !== false,
        order: form.order !== '' ? Number(form.order) : list.length + 1,
        displayOrder: form.order !== '' ? Number(form.order) : list.length + 1,
        openInNewTab: !!form.openInNewTab
      };

      if (selectedId) {
        // Edit existing category
        const res = await fetch(`/api/admin/categories/${selectedId}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData)
        });
        if (res.ok) {
          toast.success('Category updated successfully');
          resetForm();
          loadData();
        } else {
          const errData = await res.json();
          toast.error(errData.error || 'Failed to update category');
        }
      } else {
        // Add new category
        const res = await fetch('/api/admin/categories', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData)
        });
        if (res.ok) {
          toast.success('Category added successfully');
          resetForm();
          loadData();
        } else {
          const errData = await res.json();
          toast.error(errData.error || 'Failed to add category');
        }
      }
    } catch (err) {
      toast.error(err.message || 'An error occurred while saving the category.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (category) => {
    const currentActive = category.active !== false && category.enabled !== false;
    const newStatus = !currentActive;
    try {
      const res = await fetch(`/api/admin/categories/${category.id}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newStatus, enabled: newStatus })
      });
      if (res.ok) {
        toast.success(`Category "${category.name}" ${newStatus ? 'enabled' : 'hidden'}`);
        // Optimistically update local state for instant responsiveness
        setList(prev => prev.map(item => (
          item.id === category.id
            ? { ...item, active: newStatus, enabled: newStatus, isActive: newStatus }
            : item
        )));
      } else {
        toast.error('Failed to update category status');
      }
    } catch (err) {
      toast.error('An error occurred while updating category status');
    }
  };

  const handleEdit = (category) => {
    setSelectedId(category.id);
    setIsSlugCustomized(true);
    setForm({
      name: category.name || '',
      slug: category.slug || '',
      img: category.img || category.imageUrl || '',
      link: category.link || `/shop?category=${category.slug || ''}`,
      buttonText: category.buttonText || '',
      order: category.displayOrder ?? category.order ?? '',
      active: category.active !== false && category.enabled !== false,
      openInNewTab: !!category.openInNewTab
    });
    setImageFile(null);
    setImagePreview(category.img || category.imageUrl || '');
    setShowFormModal(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        toast.success('Category deleted');
        if (selectedId === id) resetForm();
        loadData();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to delete category');
      }
    } catch (err) {
      toast.error('An error occurred during deletion');
    }
  };

  // 1-Click Reordering (Move Up / Down)
  const handleReorder = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const updated = [...list];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Recalculate displayOrder
    const reorderedList = updated.map((item, idx) => ({
      ...item,
      order: idx + 1,
      displayOrder: idx + 1
    }));

    setList(reorderedList);

    try {
      const res = await fetch('/api/admin/categories/reorder', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: reorderedList.map(item => ({ id: item.id, displayOrder: item.displayOrder }))
        })
      });
      if (res.ok) {
        toast.success('Category order updated');
      } else {
        toast.error('Failed to save category order');
        loadData();
      }
    } catch (err) {
      toast.error('Error reordering categories');
      loadData();
    }
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setSelectedId(null);
    setIsSlugCustomized(false);
    setImageFile(null);
    setImagePreview('');
    setShowFormModal(false);
  };

  // Save Category Showcase Settings
  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/categories/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        toast.success('Category showcase settings updated successfully.');
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to save showcase settings');
      }
    } catch (err) {
      toast.error('An error occurred while saving showcase settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Categories to show in the live interactive preview
  const previewCategories = list.length > 0 ? list : [
    { id: 'p1', name: 'Gold', img: 'https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?crop=entropy&cs=srgb&fm=jpg&q=85', active: true },
    { id: 'p2', name: 'Diamond', img: 'https://images.unsplash.com/photo-1685970731194-e27b477e87ba?crop=entropy&cs=srgb&fm=jpg&q=85', active: true },
    { id: 'p3', name: 'Wedding', img: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?crop=entropy&cs=srgb&fm=jpg&q=85', active: true },
    { id: 'p4', name: 'Daily Wear', img: 'https://images.unsplash.com/photo-1622398925373-3f91b1e275f5?crop=entropy&cs=srgb&fm=jpg&q=85', active: true },
    { id: 'p5', name: 'Men', img: 'https://images.unsplash.com/photo-1631982690223-8aa4be0a2497?crop=entropy&cs=srgb&fm=jpg&q=85', active: true },
    { id: 'p6', name: 'Women', img: 'https://images.unsplash.com/photo-1610173827043-9db50e0d8ef9?crop=entropy&cs=srgb&fm=jpg&q=85', active: true },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="font-display text-2xl xs:text-3xl sm:text-4xl text-[#1A1A1A]">Category Showcase</div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Manage the categories displayed on the storefront and customize the interactive hover gallery.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {activeTab === 'categories' && (
            <button
              onClick={() => {
                resetForm();
                setShowFormModal(true);
              }}
              className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#9C6B30] text-white px-4 py-2.5 rounded-lg text-xs uppercase tracking-widest font-medium transition cursor-pointer shadow-xs"
            >
              <Plus size={15} /> Add Category
            </button>
          )}
          {activeTab === 'settings' && (
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="flex items-center gap-2 bg-[#9C6B30] hover:bg-[#855822] text-white px-5 py-2.5 rounded-lg text-xs uppercase tracking-widest font-semibold transition cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {savingSettings ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              Save Settings
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 mb-6 gap-6">
        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 text-xs sm:text-sm font-medium tracking-wide uppercase transition relative cursor-pointer ${
            activeTab === 'categories'
              ? 'text-[#9C6B30] font-semibold'
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <span className="flex items-center gap-2">
            <Layers size={16} /> Categories ({list.length})
          </span>
          {activeTab === 'categories' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#9C6B30]" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 text-xs sm:text-sm font-medium tracking-wide uppercase transition relative cursor-pointer ${
            activeTab === 'settings'
              ? 'text-[#9C6B30] font-semibold'
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <span className="flex items-center gap-2">
            <Sliders size={16} /> Showcase & Hover Settings
          </span>
          {activeTab === 'settings' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#9C6B30]" />
          )}
        </button>
      </div>

      {/* ================= TAB 1: CATEGORIES LIST & FORM ================= */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* Create / Edit Category Modal or Accordion */}
          {showFormModal && (
            <div className="bg-white rounded-xl border border-neutral-200 p-5 sm:p-7 shadow-sm mb-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-100">
                <h2 className="text-base sm:text-lg font-medium text-[#1A1A1A] flex items-center gap-2">
                  <Sparkles size={16} className="text-[#9C6B30]" />
                  {selectedId ? 'Edit Category' : 'Add New Category'}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-1 text-neutral-400 hover:text-neutral-700 rounded transition"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block mb-1">
                      Category Name *
                    </label>
                    <input
                      required
                      type="text"
                      value={form.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setForm(f => {
                          const updates = { ...f, name };
                          if (!selectedId && !isSlugCustomized) {
                            updates.slug = slugify(name);
                          }
                          return updates;
                        });
                      }}
                      className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30] transition"
                      placeholder="e.g. Gold"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block">
                        Slug *
                      </label>
                      {form.name && (
                        <button
                          type="button"
                          onClick={() => {
                            const gen = slugify(form.name);
                            setForm(f => ({ ...f, slug: gen }));
                            setIsSlugCustomized(true);
                          }}
                          className="text-[10px] text-[#9C6B30] hover:underline font-medium cursor-pointer"
                        >
                          Generate from name
                        </button>
                      )}
                    </div>
                    <input
                      required
                      type="text"
                      value={form.slug}
                      onChange={(e) => {
                        setIsSlugCustomized(true);
                        const formatted = e.target.value.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '');
                        setForm(f => ({ ...f, slug: formatted }));
                      }}
                      onBlur={() => {
                        setForm(f => ({ ...f, slug: slugify(f.slug) }));
                      }}
                      className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30] transition font-mono text-xs"
                      placeholder="e.g. gold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block mb-1">
                      Storefront Link (URL)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={form.link}
                        onChange={(e) => setForm({ ...form, link: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30] transition pl-9"
                        placeholder={`/shop?category=${form.slug || 'gold'}`}
                      />
                      <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    </div>
                    <span className="text-[11px] text-neutral-400 mt-1 block">
                      Defaults to &quot;/shop?category={form.slug || 'slug'}&quot; if left empty.
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block mb-1">
                      Button Text
                    </label>
                    <input
                      type="text"
                      value={form.buttonText}
                      onChange={(e) => setForm({ ...form, buttonText: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30] transition"
                      placeholder="e.g. SHOP NOW (or leave empty to use default)"
                    />
                    <span className="text-[11px] text-neutral-400 mt-1 block">
                      Leave empty to use global button text (&quot;{settings.buttonText || 'SHOP NOW'}&quot;).
                    </span>
                  </div>
                </div>

                {/* Image Upload Area */}
                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block mb-2">
                    Category Image * (Circular Aspect)
                  </label>

                  <div className="border border-dashed border-neutral-300 rounded-xl p-4 flex flex-col items-center justify-center bg-neutral-50/60">
                    {imagePreview ? (
                      <div className="relative flex flex-col items-center justify-center mb-3">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#D4AF37] shadow-md bg-white">
                          <img
                            src={imagePreview}
                            alt="Category Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview('');
                            setForm({ ...form, img: '' });
                          }}
                          className="mt-2 text-xs text-red-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <X size={12} /> Remove Image
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-4 text-neutral-400 text-center">
                        <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mb-2">
                          <Upload size={20} />
                        </div>
                        <span className="text-xs text-neutral-600 font-medium">Click to upload category image</span>
                        <span className="text-[10px] text-neutral-400 mt-0.5">JPG, JPEG, PNG, WEBP (Max 5MB)</span>
                      </div>
                    )}

                    <label className="cursor-pointer bg-white border border-neutral-300 hover:border-[#9C6B30] hover:text-[#9C6B30] px-4 py-2 text-[11px] tracking-wider uppercase rounded-lg shadow-xs text-neutral-700 font-medium transition mt-1">
                      Choose Image File
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Options: Active and Open in New Tab */}
                <div className="flex flex-wrap items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-neutral-700">
                    <input
                      type="checkbox"
                      checked={form.active !== false}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                      className="accent-[#9C6B30] h-4 w-4 rounded"
                    />
                    <span>Active (Visible on frontend category circle gallery)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-neutral-700">
                    <input
                      type="checkbox"
                      checked={!!form.openInNewTab}
                      onChange={(e) => setForm({ ...form, openInNewTab: e.target.checked })}
                      className="accent-[#9C6B30] h-4 w-4 rounded"
                    />
                    <span>Open link in new tab</span>
                  </label>
                </div>

                {/* Form Buttons */}
                <div className="flex gap-2 justify-end pt-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-neutral-100 text-neutral-700 hover:bg-neutral-200 px-5 py-2.5 text-xs tracking-wider uppercase rounded-lg transition font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-[#9C6B30] text-white px-6 py-2.5 text-xs tracking-wider uppercase rounded-lg transition font-medium disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {saving ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : selectedId ? (
                      'Save Changes'
                    ) : (
                      <>
                        <Plus size={14} /> Add Category
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Current Categories List */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-neutral-800">Current Categories</h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Only categories marked as <span className="text-emerald-700 font-semibold">Active</span> appear on the customer storefront.
                </p>
              </div>
              <span className="text-xs bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-full font-medium">
                {list.filter(c => c.active !== false && c.enabled !== false).length} Active / {list.length} Total
              </span>
            </div>

            {loading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="animate-spin text-[#9C6B30]" size={26} />
              </div>
            ) : list.length === 0 ? (
              <div className="p-12 text-center text-neutral-400">
                No categories created yet. Click &quot;Add Category&quot; to begin.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {list.map((item, index) => {
                  const isActive = item.active !== false && item.enabled !== false;
                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/70 transition ${
                        !isActive ? 'opacity-70 bg-neutral-50/40' : ''
                      }`}
                    >
                      {/* Left: Thumbnail & Info */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-neutral-200 bg-neutral-100 shrink-0 shadow-xs">
                          <img
                            src={item.img || item.imageUrl || '/logo.png'}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              if (e.target.src !== window.location.origin + '/logo.png') {
                                e.target.src = '/logo.png';
                              }
                            }}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-neutral-800 truncate" title={item.name}>
                              {item.name}
                            </span>
                            {isActive ? (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                                Active
                              </span>
                            ) : (
                              <span className="text-[10px] bg-neutral-100 text-neutral-500 border border-neutral-200 px-2 py-0.5 rounded-full font-medium">
                                Hidden
                              </span>
                            )}
                            {item.openInNewTab && (
                              <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded font-medium">
                                New Tab
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1 flex-wrap">
                            <span className="font-mono text-[11px] text-neutral-500">
                              /{item.slug}
                            </span>
                            <span>•</span>
                            <span className="truncate max-w-[200px]" title={item.link || `/shop?category=${item.slug}`}>
                              {item.link || `/shop?category=${item.slug}`}
                            </span>
                            {item.buttonText && (
                              <>
                                <span>•</span>
                                <span className="text-[#9C6B30] font-medium text-[11px]">
                                  CTA: {item.buttonText}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Order controls & Action Buttons */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        {/* Move Up Button */}
                        <button
                          onClick={() => handleReorder(index, 'up')}
                          disabled={index === 0}
                          className="p-1.5 border border-neutral-200 rounded hover:border-[#9C6B30] hover:text-[#9C6B30] disabled:opacity-30 disabled:pointer-events-none transition bg-white cursor-pointer"
                          title="Move Up"
                        >
                          <ArrowUp size={14} />
                        </button>

                        {/* Move Down Button */}
                        <button
                          onClick={() => handleReorder(index, 'down')}
                          disabled={index === list.length - 1}
                          className="p-1.5 border border-neutral-200 rounded hover:border-[#9C6B30] hover:text-[#9C6B30] disabled:opacity-30 disabled:pointer-events-none transition bg-white cursor-pointer"
                          title="Move Down"
                        >
                          <ArrowDown size={14} />
                        </button>

                        <div className="h-4 w-px bg-neutral-200 mx-1" />

                        {/* Toggle Active / Hidden */}
                        <button
                          onClick={() => toggleActive(item)}
                          className={`p-1.5 border rounded transition cursor-pointer ${
                            isActive
                              ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-white'
                              : 'border-neutral-200 text-neutral-400 hover:bg-neutral-100 bg-white'
                          }`}
                          title={isActive ? 'Hide from storefront' : 'Show on storefront'}
                        >
                          {isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 border border-neutral-200 rounded text-neutral-600 hover:text-[#9C6B30] hover:border-[#9C6B30] transition bg-white cursor-pointer"
                          title="Edit Category"
                        >
                          <Edit2 size={14} />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 border border-neutral-200 rounded text-neutral-600 hover:text-red-600 hover:border-red-600 transition bg-white cursor-pointer"
                          title="Delete Category"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: SHOWCASE & HOVER SETTINGS WITH LIVE PREVIEW ================= */}
      {activeTab === 'settings' && (
        <div className="space-y-8">
          {/* Interactive Live Preview Box */}
          <div className="bg-neutral-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl overflow-hidden border border-neutral-800">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-neutral-800">
              <div>
                <span className="text-[10px] tracking-[0.3em] uppercase text-[#D4AF37] font-semibold block mb-0.5">
                  Interactive Live Preview
                </span>
                <h3 className="text-base sm:text-lg font-medium text-white">
                  Hover over the category circles below to preview the effect
                </h3>
              </div>
              <div className="text-xs text-neutral-400 font-mono hidden sm:block">
                Scale: {settings.hoverScale}x · Shrink: {settings.otherItemsScale}x · {settings.transitionDuration}ms
              </div>
            </div>

            {/* Simulated Homepage Section Container */}
            <div className="py-6 sm:py-8 bg-neutral-950/80 rounded-xl px-4 text-center border border-neutral-800/80 overflow-visible">
              <div className="text-[10px] tracking-[0.3em] uppercase text-[#D4AF37] mb-1 font-medium">
                {settings.eyebrow || 'Curated Categories'}
              </div>
              <h4 className="font-display text-2xl sm:text-3xl text-white font-light mb-2">
                {settings.title || 'Shop by Category'}
              </h4>
              <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mx-auto my-3" />
              <p className="text-xs text-neutral-400 max-w-md mx-auto mb-6">
                {settings.subtitle || 'From everyday layering to once-in-a-lifetime heirlooms.'}
              </p>

              {/* Category Circles in Preview */}
              <div className="flex flex-wrap justify-center items-start gap-4 sm:gap-6 md:gap-8 py-4 overflow-visible">
                {previewCategories.map((c) => {
                  const isHovered = settings.hoverEnabled !== false && previewHoveredId === c.id;
                  const isOtherHovered = settings.hoverEnabled !== false && previewHoveredId !== null && !isHovered;
                  const hoverScaleVal = Number(settings.hoverScale) || 1.10;
                  const otherScaleVal = Number(settings.otherItemsScale) || 0.95;
                  const durationVal = Number(settings.transitionDuration) || 300;
                  const opacityVal = Number(settings.hoverOpacity) !== undefined ? Number(settings.hoverOpacity) : 1.0;

                  return (
                    <div
                      key={c.id}
                      onMouseEnter={() => settings.hoverEnabled !== false && setPreviewHoveredId(c.id)}
                      onMouseLeave={() => settings.hoverEnabled !== false && setPreviewHoveredId(null)}
                      className="w-[100px] sm:w-[130px] flex-shrink-0 cursor-pointer select-none"
                    >
                      <div
                        style={{
                          transform: isHovered
                            ? `scale(${hoverScaleVal})`
                            : isOtherHovered
                            ? `scale(${otherScaleVal})`
                            : 'scale(1)',
                          opacity: isOtherHovered ? opacityVal : 1,
                          transition: `transform ${durationVal}ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity ${durationVal}ms ease`,
                          zIndex: isHovered ? 20 : 1
                        }}
                        className={`relative aspect-square rounded-full overflow-hidden bg-neutral-800 transition-all ${
                          settings.hoverShadow && isHovered ? 'shadow-2xl' : 'shadow-md'
                        } ${
                          settings.hoverBorder !== false
                            ? isHovered
                              ? 'ring-2 ring-[#D4AF37]'
                              : 'ring-1 ring-neutral-700'
                            : ''
                        }`}
                      >
                        <img
                          src={c.img || c.imageUrl || '/logo.png'}
                          alt={c.name}
                          className={`w-full h-full object-cover transition-all duration-500 ${
                            settings.imageHoverEffect === 'zoom'
                              ? isHovered ? 'scale-110' : 'scale-100'
                              : settings.imageHoverEffect === 'scale'
                              ? isHovered ? 'scale-105' : 'scale-100'
                              : settings.imageHoverEffect === 'brightness'
                              ? isHovered ? 'brightness-125' : 'brightness-100'
                              : ''
                          }`}
                        />
                        {settings.hoverOverlay && (
                          <div className={`absolute inset-0 bg-[#D4AF37]/15 transition-opacity duration-300 ${
                            isHovered ? 'opacity-100' : 'opacity-0'
                          }`} />
                        )}
                      </div>

                      <div className="text-center mt-3">
                        <div className={`font-serif-luxe text-sm sm:text-base transition-colors ${
                          isHovered ? 'text-[#D4AF37]' : 'text-neutral-200'
                        }`}>
                          {c.name}
                        </div>
                        <div className={`text-[9px] uppercase tracking-wider transition-colors mt-0.5 ${
                          isHovered ? 'text-[#D4AF37]' : 'text-neutral-400'
                        }`}>
                          {c.buttonText || settings.buttonText || 'SHOP NOW'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Settings Configuration Controls */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6 sm:p-8 shadow-xs space-y-8">
            {/* Section Visibility & Text Controls */}
            <div>
              <h3 className="text-base font-semibold text-neutral-800 mb-4 pb-2 border-b border-neutral-100 flex items-center gap-2">
                <Settings2 size={16} className="text-[#9C6B30]" />
                Section Display & Text Content
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block mb-1">
                    Section Eyebrow
                  </label>
                  <input
                    type="text"
                    value={settings.eyebrow || ''}
                    onChange={(e) => setSettings({ ...settings, eyebrow: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                    placeholder="Curated Categories"
                  />
                </div>

                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block mb-1">
                    Section Heading / Title
                  </label>
                  <input
                    type="text"
                    value={settings.title || ''}
                    onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                    placeholder="Shop by Category"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block mb-1">
                    Section Subtitle
                  </label>
                  <input
                    type="text"
                    value={settings.subtitle || ''}
                    onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                    placeholder="From everyday layering to once-in-a-lifetime heirlooms."
                  />
                </div>

                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block mb-1">
                    Default Button Text (CTA)
                  </label>
                  <input
                    type="text"
                    value={settings.buttonText || ''}
                    onChange={(e) => setSettings({ ...settings, buttonText: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                    placeholder="SHOP NOW"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-neutral-800">
                  <input
                    type="checkbox"
                    checked={settings.sectionEnabled !== false}
                    onChange={(e) => setSettings({ ...settings, sectionEnabled: e.target.checked })}
                    className="accent-[#9C6B30] h-4 w-4 rounded"
                  />
                  <span>Show &quot;Shop by Category&quot; Showcase Section on Homepage</span>
                </label>
              </div>
            </div>

            {/* Hover Effects & Animation Controls */}
            <div>
              <h3 className="text-base font-semibold text-neutral-800 mb-4 pb-2 border-b border-neutral-100 flex items-center gap-2">
                <Sparkles size={16} className="text-[#9C6B30]" />
                Interactive Hover Animation Customization
              </h3>

              <div className="space-y-6">
                {/* Hover Enabled Toggle */}
                <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div>
                    <span className="text-xs font-semibold text-neutral-800 block">Hover Scaling Effect</span>
                    <span className="text-[11px] text-neutral-400">
                      When enabled, the hovered category expands smoothly while neighboring categories subtly shrink.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.hoverEnabled !== false}
                      onChange={(e) => setSettings({ ...settings, hoverEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9C6B30]" />
                  </label>
                </div>

                {/* Hover Scale Selector */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">
                      Hovered Category Scale (Enlargement)
                    </label>
                    <span className="text-xs font-mono font-semibold text-[#9C6B30]">
                      {settings.hoverScale || 1.10}x
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[1.05, 1.08, 1.10, 1.15].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setSettings({ ...settings, hoverScale: val })}
                        className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition ${
                          Number(settings.hoverScale) === val
                            ? 'bg-[#1A1A1A] text-white shadow-xs'
                            : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                        }`}
                      >
                        {val}x {val === 1.10 ? '(Default)' : ''}
                      </button>
                    ))}
                    <input
                      type="number"
                      step="0.01"
                      min="1.0"
                      max="1.4"
                      value={settings.hoverScale || 1.10}
                      onChange={(e) => setSettings({ ...settings, hoverScale: parseFloat(e.target.value) || 1.10 })}
                      className="w-20 px-2 py-1.5 border border-neutral-200 rounded-lg text-xs font-mono text-center focus:outline-none focus:border-[#9C6B30]"
                    />
                  </div>
                </div>

                {/* Other Items Scale Selector */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">
                      Other Items Scale (Subtle Shrink)
                    </label>
                    <span className="text-xs font-mono font-semibold text-[#9C6B30]">
                      {settings.otherItemsScale || 0.95}x
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[0.90, 0.94, 0.95, 0.97].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setSettings({ ...settings, otherItemsScale: val })}
                        className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition ${
                          Number(settings.otherItemsScale) === val
                            ? 'bg-[#1A1A1A] text-white shadow-xs'
                            : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                        }`}
                      >
                        {val}x {val === 0.95 ? '(Default)' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transition Duration */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">
                      Animation Transition Duration
                    </label>
                    <span className="text-xs font-mono font-semibold text-[#9C6B30]">
                      {settings.transitionDuration || 300}ms
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[200, 300, 400, 500].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setSettings({ ...settings, transitionDuration: val })}
                        className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition ${
                          Number(settings.transitionDuration) === val
                            ? 'bg-[#1A1A1A] text-white shadow-xs'
                            : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                        }`}
                      >
                        {val}ms {val === 300 ? '(Recommended)' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image Hover Effect */}
                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block mb-2">
                    Inner Image Hover Effect
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: 'zoom', label: 'Subtle Zoom', desc: 'Inner image zooms in 10%' },
                      { id: 'scale', label: 'Gentle Scale', desc: 'Inner image scales 5%' },
                      { id: 'brightness', label: 'Brightness', desc: 'Illuminates image slightly' },
                      { id: 'none', label: 'None', desc: 'No internal image animation' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSettings({ ...settings, imageHoverEffect: opt.id })}
                        className={`p-3 rounded-lg border text-left cursor-pointer transition ${
                          settings.imageHoverEffect === opt.id
                            ? 'border-[#9C6B30] bg-[#FAF6EF] ring-1 ring-[#9C6B30]'
                            : 'border-neutral-200 hover:border-neutral-300 bg-white'
                        }`}
                      >
                        <span className="text-xs font-semibold text-neutral-800 block">{opt.label}</span>
                        <span className="text-[10px] text-neutral-400 mt-0.5 block">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional Visual Effects */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-neutral-700 p-3 rounded-lg border border-neutral-200 bg-neutral-50/50">
                    <input
                      type="checkbox"
                      checked={settings.hoverBorder !== false}
                      onChange={(e) => setSettings({ ...settings, hoverBorder: e.target.checked })}
                      className="accent-[#9C6B30] h-4 w-4 rounded"
                    />
                    <span>Gold Ring / Border</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-neutral-700 p-3 rounded-lg border border-neutral-200 bg-neutral-50/50">
                    <input
                      type="checkbox"
                      checked={!!settings.hoverShadow}
                      onChange={(e) => setSettings({ ...settings, hoverShadow: e.target.checked })}
                      className="accent-[#9C6B30] h-4 w-4 rounded"
                    />
                    <span>Enhanced Drop Shadow</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-neutral-700 p-3 rounded-lg border border-neutral-200 bg-neutral-50/50">
                    <input
                      type="checkbox"
                      checked={!!settings.hoverOverlay}
                      onChange={(e) => setSettings({ ...settings, hoverOverlay: e.target.checked })}
                      className="accent-[#9C6B30] h-4 w-4 rounded"
                    />
                    <span>Subtle Gold Overlay</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Bottom Save Button */}
            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSettings(DEFAULT_CATEGORY_SHOWCASE_SETTINGS)}
                className="text-xs text-neutral-500 hover:text-neutral-800 underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw size={12} /> Reset to Defaults
              </button>

              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="flex items-center gap-2 bg-[#9C6B30] hover:bg-[#855822] text-white px-7 py-3 rounded-lg text-xs uppercase tracking-widest font-semibold transition cursor-pointer disabled:opacity-50 shadow-md"
              >
                {savingSettings ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                Save Showcase Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
