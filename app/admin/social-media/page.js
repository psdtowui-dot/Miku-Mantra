'use client';
import { useEffect, useState, useRef } from 'react';
import {
  Plus, Trash2, Edit2, Loader2, X, Check, Upload, ExternalLink,
  GripVertical, ArrowUp, ArrowDown, Eye, EyeOff, Sparkles, RefreshCw,
  Sliders, Globe, Image as ImageIcon, CheckCircle2, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const PLATFORMS = [
  { value: 'Instagram', label: 'Instagram', color: 'from-pink-500 to-amber-500' },
  { value: 'Facebook', label: 'Facebook', color: 'from-blue-600 to-blue-800' },
  { value: 'YouTube', label: 'YouTube', color: 'from-red-600 to-red-700' },
  { value: 'Pinterest', label: 'Pinterest', color: 'from-red-500 to-red-600' },
  { value: 'TikTok', label: 'TikTok', color: 'from-neutral-900 to-black' },
  { value: 'Other', label: 'Other', color: 'from-[#9C6B30] to-[#D4AF37]' },
];

const INITIAL_ITEM_FORM = {
  platform: 'Instagram',
  url: '',
  thumbnailUrl: '',
  title: '',
  displayOrder: 1,
  isActive: true,
  openInNewTab: true
};

const DEFAULT_SETTINGS = {
  showSection: true,
  eyebrow: '@mikumantra.jewels',
  title: 'Follow Our World',
  subtitle: 'Real stories, real sparkle — tagged on Instagram.',
  maxVisible: 6,
  hoverAnimation: true,
  hoverScale: 1.10
};

export default function SocialMediaAdminPage() {
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(INITIAL_ITEM_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation modal state
  const [deleteModalItem, setDeleteModalItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [savingOrder, setSavingOrder] = useState(false);

  // Preview hover state
  const [previewHoveredId, setPreviewHoveredId] = useState(null);

  // File input ref
  const fileInputRef = useRef(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/social-media', { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const sorted = (data.items || []).sort((a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0));
        setItems(sorted);
        if (data.settings) {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...data.settings
          });
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to load social media items');
      }
    } catch (err) {
      toast.error('An error occurred loading social media settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle image upload input
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid image type. Only JPG, PNG, WEBP, and SVG are supported.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image size exceeds 8MB limit.');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setForm(prev => ({ ...prev, thumbnailUrl: '' }));
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
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Image upload failed');
    }

    const data = await res.json();
    return data.url;
  };

  const validateItemForm = () => {
    const errs = {};
    if (!form.url || !form.url.trim()) {
      errs.url = 'Social media post URL is required';
    } else {
      try {
        const parsed = new URL(form.url.trim());
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          errs.url = 'URL must start with http:// or https://';
        }
      } catch (_) {
        errs.url = 'Please enter a valid URL (e.g., https://www.instagram.com/p/...)';
      }
    }

    if (!imageFile && !form.thumbnailUrl) {
      errs.thumbnailUrl = 'Please upload or provide a thumbnail image';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleOpenAddModal = () => {
    const nextOrder = items.length > 0 ? Math.max(...items.map(i => Number(i.displayOrder) || 0)) + 1 : 1;
    setEditingId(null);
    setForm({
      ...INITIAL_ITEM_FORM,
      displayOrder: nextOrder
    });
    setFormErrors({});
    setImageFile(null);
    setImagePreview('');
    setShowModal(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingId(item.id);
    setForm({
      platform: item.platform || 'Instagram',
      url: item.url || '',
      thumbnailUrl: item.thumbnailUrl || '',
      title: item.title || '',
      displayOrder: item.displayOrder ?? 1,
      isActive: item.isActive !== false,
      openInNewTab: item.openInNewTab !== false
    });
    setFormErrors({});
    setImageFile(null);
    setImagePreview(item.thumbnailUrl || '');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(INITIAL_ITEM_FORM);
    setFormErrors({});
    setImageFile(null);
    setImagePreview('');
  };

  const handleSubmitItem = async (e) => {
    e.preventDefault();
    if (!validateItemForm()) return;

    setSubmitting(true);
    try {
      let finalThumb = form.thumbnailUrl;
      if (imageFile) {
        finalThumb = await uploadFile(imageFile);
      }

      const payload = {
        platform: form.platform,
        url: form.url.trim(),
        thumbnailUrl: finalThumb,
        title: form.title.trim(),
        displayOrder: Number(form.displayOrder) || 1,
        isActive: !!form.isActive,
        openInNewTab: !!form.openInNewTab
      };

      if (editingId) {
        const res = await fetch(`/api/admin/social-media/${editingId}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          toast.success('Social media post updated successfully');
          handleCloseModal();
          loadData();
        } else {
          const errData = await res.json().catch(() => ({}));
          toast.error(errData.error || 'Failed to update post');
        }
      } else {
        const res = await fetch('/api/admin/social-media', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          toast.success('Social media post added successfully');
          handleCloseModal();
          loadData();
        } else {
          const errData = await res.json().catch(() => ({}));
          toast.error(errData.error || 'Failed to add post');
        }
      }
    } catch (err) {
      toast.error(err.message || 'An error occurred while saving the post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (item) => {
    const newStatus = !item.isActive;
    // Optimistic update
    setItems(prev => prev.map(it => it.id === item.id ? { ...it, isActive: newStatus } : it));
    try {
      const res = await fetch(`/api/admin/social-media/${item.id}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus })
      });
      if (res.ok) {
        toast.success(`Post ${newStatus ? 'enabled' : 'disabled'}`);
      } else {
        toast.error('Failed to update status');
        loadData();
      }
    } catch (_) {
      toast.error('Error updating status');
      loadData();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalItem) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/social-media/${deleteModalItem.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        toast.success('Social media post deleted successfully');
        setDeleteModalItem(null);
        loadData();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to delete post');
      }
    } catch (_) {
      toast.error('Error occurred while deleting post');
    } finally {
      setDeleting(false);
    }
  };

  // Reordering helpers
  const saveNewOrder = async (newItems) => {
    setSavingOrder(true);
    const updatedWithOrder = newItems.map((item, idx) => ({
      ...item,
      displayOrder: idx + 1
    }));
    setItems(updatedWithOrder);

    try {
      const res = await fetch('/api/admin/social-media/reorder', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: updatedWithOrder.map(it => ({ id: it.id, displayOrder: it.displayOrder }))
        })
      });
      if (res.ok) {
        toast.success('Display order updated');
      } else {
        toast.error('Failed to save display order');
        loadData();
      }
    } catch (_) {
      toast.error('Failed to update order');
      loadData();
    } finally {
      setSavingOrder(false);
    }
  };

  const moveItem = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const newItems = [...items];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);
    saveNewOrder(newItems);
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }
    const newItems = [...items];
    const [moved] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, moved);
    setDraggedIndex(null);
    saveNewOrder(newItems);
  };

  // Save Global Section Settings
  const handleSaveSettings = async (e) => {
    e?.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/social-media/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        toast.success('Section settings saved successfully');
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to save section settings');
      }
    } catch (_) {
      toast.error('Error saving section settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const activeItems = items.filter(it => it.isActive);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-gradient-to-br from-[#9C6B30]/15 to-[#D4AF37]/20 text-[#9C6B30]">
              <Sparkles size={20} />
            </span>
            <h1 className="font-display text-2xl sm:text-3xl text-[#1A1A1A] font-medium tracking-tight">Social Media</h1>
          </div>
          <p className="text-sm text-neutral-500 mt-1">
            Manage the social media posts displayed in the &quot;Follow Our World&quot; section.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-600 transition"
            title="Refresh list"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#9C6B30] text-white px-5 py-2.5 rounded-lg text-xs tracking-widest uppercase font-medium transition shadow-xs"
          >
            <Plus size={16} />
            Add Social Media
          </button>
        </div>
      </div>

      {/* Section Settings Accordion / Card */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#FAF6EF] text-[#9C6B30] flex items-center justify-center">
              <Sliders size={16} />
            </div>
            <div>
              <h2 className="text-base font-medium text-[#1A1A1A]">Section Settings &amp; Appearance</h2>
              <p className="text-xs text-neutral-500">Configure how &quot;Follow Our World&quot; appears on the public website</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${settings.showSection ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-neutral-100 text-neutral-500'}`}>
              {settings.showSection ? 'Section Visible' : 'Section Hidden'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="p-4 sm:p-6 space-y-5 bg-[#FCFAF8]/40">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="text-[11px] tracking-wider uppercase text-neutral-600 font-semibold block mb-1.5">
                Eyebrow Text
              </label>
              <input
                type="text"
                value={settings.eyebrow}
                onChange={e => setSettings(prev => ({ ...prev, eyebrow: e.target.value }))}
                placeholder="@mikumantra.jewels"
                className="w-full bg-white border border-neutral-200 rounded-lg px-3.5 py-2 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#9C6B30]"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">Displayed above main heading in small uppercase</span>
            </div>

            <div>
              <label className="text-[11px] tracking-wider uppercase text-neutral-600 font-semibold block mb-1.5">
                Section Heading
              </label>
              <input
                type="text"
                value={settings.title}
                onChange={e => setSettings(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Follow Our World"
                className="w-full bg-white border border-neutral-200 rounded-lg px-3.5 py-2 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#9C6B30]"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">Primary serif title</span>
            </div>

            <div>
              <label className="text-[11px] tracking-wider uppercase text-neutral-600 font-semibold block mb-1.5">
                Subtitle
              </label>
              <input
                type="text"
                value={settings.subtitle}
                onChange={e => setSettings(prev => ({ ...prev, subtitle: e.target.value }))}
                placeholder="Real stories, real sparkle — tagged on Instagram."
                className="w-full bg-white border border-neutral-200 rounded-lg px-3.5 py-2 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#9C6B30]"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">Descriptive tagline under heading</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-3 border-t border-neutral-200/60">
            <div>
              <label className="text-[11px] tracking-wider uppercase text-neutral-600 font-semibold block mb-1.5">
                Max Visible Posts
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={settings.maxVisible}
                onChange={e => setSettings(prev => ({ ...prev, maxVisible: Math.max(1, parseInt(e.target.value) || 1) }))}
                className="w-full bg-white border border-neutral-200 rounded-lg px-3.5 py-2 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#9C6B30]"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">Maximum active thumbnails shown on homepage</span>
            </div>

            <div>
              <label className="text-[11px] tracking-wider uppercase text-neutral-600 font-semibold block mb-1.5">
                Hover Zoom Scale ({settings.hoverScale}x)
              </label>
              <input
                type="range"
                min="1.05"
                max="1.25"
                step="0.01"
                value={settings.hoverScale}
                onChange={e => setSettings(prev => ({ ...prev, hoverScale: parseFloat(e.target.value) }))}
                className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-[#9C6B30] mt-3"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">Recommended: 1.10x for luxury subtle expansion</span>
            </div>

            <div className="flex flex-col justify-end space-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.showSection}
                  onChange={e => setSettings(prev => ({ ...prev, showSection: e.target.checked }))}
                  className="rounded border-neutral-300 text-[#9C6B30] focus:ring-[#9C6B30]"
                />
                <span className="text-xs text-neutral-700 font-medium">Show Section on Homepage</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.hoverAnimation}
                  onChange={e => setSettings(prev => ({ ...prev, hoverAnimation: e.target.checked }))}
                  className="rounded border-neutral-300 text-[#9C6B30] focus:ring-[#9C6B30]"
                />
                <span className="text-xs text-neutral-700 font-medium">Enable Hover Focus Effect</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingSettings}
              className="inline-flex items-center gap-2 bg-[#9C6B30] hover:bg-[#855B29] text-white px-5 py-2 rounded-lg text-xs tracking-wider uppercase font-medium transition shadow-xs disabled:opacity-50"
            >
              {savingSettings && <Loader2 size={14} className="animate-spin" />}
              Save Section Settings
            </button>
          </div>
        </form>
      </div>

      {/* Live Interactive Preview Card */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-sm font-semibold tracking-wider uppercase text-neutral-700">
              Live Preview &bull; Hover Effect Test
            </h2>
          </div>
          <span className="text-xs text-neutral-400">
            Hover over items below to preview dynamic zoom &amp; shrink effect
          </span>
        </div>

        <div className="bg-[#FAF6EF]/60 rounded-xl p-6 sm:p-8 border border-[#E8E8E8]/70 text-center">
          <div className="text-[10px] tracking-[0.35em] uppercase text-[#9C6B30] mb-2 font-medium">
            {settings.eyebrow || '@mikumantra.jewels'}
          </div>
          <h3 className="font-display text-2xl sm:text-3xl text-[#1A1A1A] font-light">
            {settings.title || 'Follow Our World'}
          </h3>
          <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mx-auto my-3" />
          <p className="text-neutral-500 font-light text-xs sm:text-sm mb-6 max-w-lg mx-auto">
            {settings.subtitle || 'Real stories, real sparkle — tagged on Instagram.'}
          </p>

          {activeItems.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 text-xs">
              No active social media posts to preview. Add or enable posts below.
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 sm:gap-3 py-6 px-2 overflow-x-auto overflow-y-visible">
              {activeItems.slice(0, settings.maxVisible || 6).map((item) => {
                const isHovered = previewHoveredId === item.id;
                const isOtherHovered = previewHoveredId !== null && !isHovered;
                const hoverScale = settings.hoverScale || 1.10;

                return (
                  <div
                    key={item.id}
                    onMouseEnter={() => settings.hoverAnimation && setPreviewHoveredId(item.id)}
                    onMouseLeave={() => settings.hoverAnimation && setPreviewHoveredId(null)}
                    style={{
                      transform: isHovered
                        ? `scale(${hoverScale})`
                        : isOtherHovered
                        ? 'scale(0.95)'
                        : 'scale(1)',
                      opacity: isOtherHovered ? 0.85 : 1,
                      zIndex: isHovered ? 30 : 10,
                      transition: 'transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 320ms ease, box-shadow 320ms ease'
                    }}
                    className={`relative flex-1 min-w-[90px] max-w-[170px] aspect-square rounded-xl overflow-hidden cursor-pointer shadow-sm ${
                      isHovered ? 'ring-2 ring-[#D4AF37] shadow-xl' : 'border border-neutral-200/80'
                    }`}
                  >
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title || item.platform}
                      className="w-full h-full object-cover"
                    />
                    <div
                      className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-2.5 text-left text-white transition-opacity duration-300 ${
                        isHovered ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      <span className="text-[9px] uppercase tracking-wider font-semibold text-[#D4AF37]">
                        {item.platform}
                      </span>
                      {item.title && (
                        <p className="text-[11px] font-medium leading-tight truncate mt-0.5">
                          {item.title}
                        </p>
                      )}
                      <span className="text-[9px] text-neutral-300 flex items-center gap-1 mt-1">
                        View <ExternalLink size={10} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Social Media Items Table / Grid */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-medium text-[#1A1A1A]">Gallery Posts ({items.length})</h2>
            <p className="text-xs text-neutral-500">
              Drag posts to reorder, or use the move buttons. Active posts are displayed on the frontend.
            </p>
          </div>
          {savingOrder && (
            <span className="text-xs text-[#9C6B30] flex items-center gap-1.5 font-medium animate-pulse">
              <Loader2 size={14} className="animate-spin" /> Saving order...
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-neutral-400">
            <Loader2 size={28} className="animate-spin text-[#9C6B30] mb-2" />
            <p className="text-xs">Loading social media posts...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-neutral-500">
            <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-3">
              <ImageIcon size={22} />
            </div>
            <p className="text-sm font-medium text-neutral-700">No social media posts yet</p>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
              Click &quot;Add Social Media&quot; to add your first Instagram, Facebook, or YouTube post to the gallery.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="mt-4 inline-flex items-center gap-1.5 bg-[#9C6B30] text-white px-4 py-2 rounded-lg text-xs font-medium"
            >
              <Plus size={14} /> Add First Post
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-200 text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-4 w-20">Thumbnail</th>
                  <th className="py-3 px-4">Platform</th>
                  <th className="py-3 px-4">URL / Post Info</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Order</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {items.map((item, index) => {
                  const platformDef = PLATFORMS.find(p => p.value.toLowerCase() === item.platform?.toLowerCase()) || PLATFORMS[0];
                  const isFirst = index === 0;
                  const isLast = index === items.length - 1;

                  return (
                    <tr
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`hover:bg-[#FAF6EF]/40 transition group ${
                        draggedIndex === index ? 'opacity-40 bg-neutral-100' : ''
                      }`}
                    >
                      {/* Drag Handle & Index */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center text-neutral-400 cursor-grab active:cursor-grabbing group-hover:text-neutral-700">
                          <GripVertical size={16} />
                        </div>
                      </td>

                      {/* Thumbnail Preview */}
                      <td className="py-3 px-4">
                        <div className="w-14 h-14 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100 relative group/img">
                          <img
                            src={item.thumbnailUrl}
                            alt={item.title || 'Thumbnail'}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                          />
                        </div>
                      </td>

                      {/* Platform Badge */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
                          {item.platform}
                        </span>
                      </td>

                      {/* URL & Caption */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium text-[#1A1A1A] truncate text-xs">
                          {item.title || <span className="text-neutral-400 italic">No caption provided</span>}
                        </div>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-[#9C6B30] hover:underline flex items-center gap-1 mt-0.5 truncate"
                          title={item.url}
                        >
                          <span className="truncate">{item.url}</span>
                          <ExternalLink size={11} className="shrink-0" />
                        </a>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition cursor-pointer ${
                            item.isActive
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 border border-neutral-200'
                          }`}
                        >
                          {item.isActive ? <Eye size={12} /> : <EyeOff size={12} />}
                          {item.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Display Order with Move Controls */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1 bg-neutral-50 rounded-lg p-1 border border-neutral-200">
                          <span className="text-xs font-semibold px-2 text-neutral-700 min-w-[20px]">
                            {item.displayOrder}
                          </span>
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={() => moveItem(index, -1)}
                            className="p-1 hover:bg-white rounded text-neutral-500 hover:text-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Move Up"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            disabled={isLast}
                            onClick={() => moveItem(index, 1)}
                            className="p-1 hover:bg-white rounded text-neutral-500 hover:text-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Move Down"
                          >
                            <ArrowDown size={12} />
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-600 hover:text-[#9C6B30] transition"
                            title="Edit Post"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteModalItem(item)}
                            className="p-2 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-600 transition"
                            title="Delete Post"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Social Media Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              key="social-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            <motion.div
              key="social-modal-content"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden z-10 max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#FAF6EF] text-[#9C6B30] flex items-center justify-center">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="font-display text-lg text-[#1A1A1A] font-medium">
                      {editingId ? 'Edit Social Media Post' : 'Add Social Media Post'}
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Configure platform link and thumbnail for the gallery strip
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Form Body */}
              <form onSubmit={handleSubmitItem} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
                {/* Platform Dropdown */}
                <div>
                  <label className="text-[11px] tracking-wider uppercase text-neutral-600 font-semibold block mb-1.5">
                    Platform <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.platform}
                    onChange={e => setForm(prev => ({ ...prev, platform: e.target.value }))}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3.5 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#9C6B30]"
                  >
                    {PLATFORMS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>

                {/* Social Media URL */}
                <div>
                  <label className="text-[11px] tracking-wider uppercase text-neutral-600 font-semibold block mb-1.5">
                    Social Media URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    value={form.url}
                    onChange={e => {
                      setForm(prev => ({ ...prev, url: e.target.value }));
                      if (formErrors.url) setFormErrors(prev => ({ ...prev, url: null }));
                    }}
                    placeholder="https://www.instagram.com/p/XXXXXXXX/"
                    className={`w-full bg-white border rounded-lg px-3.5 py-2.5 text-sm text-[#1A1A1A] focus:outline-none ${
                      formErrors.url ? 'border-red-400 focus:border-red-500' : 'border-neutral-200 focus:border-[#9C6B30]'
                    }`}
                  />
                  {formErrors.url ? (
                    <span className="text-[11px] text-red-500 mt-1 block flex items-center gap-1">
                      <AlertCircle size={12} /> {formErrors.url}
                    </span>
                  ) : (
                    <span className="text-[10px] text-neutral-400 mt-1 block">
                      Direct link to the post, reel, or video on {form.platform}
                    </span>
                  )}
                </div>

                {/* Thumbnail Image Upload */}
                <div>
                  <label className="text-[11px] tracking-wider uppercase text-neutral-600 font-semibold block mb-1.5">
                    Thumbnail Image <span className="text-red-500">*</span>
                  </label>

                  <div className="flex gap-4 items-start">
                    {/* Preview box */}
                    <div className="w-24 h-24 rounded-xl border border-neutral-200 bg-neutral-50 overflow-hidden relative shrink-0 flex items-center justify-center">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon size={28} className="text-neutral-300" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/jpeg,image/png,image/webp,image/svg+xml"
                        onChange={handleImageChange}
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full inline-flex items-center justify-center gap-2 border border-dashed border-neutral-300 hover:border-[#9C6B30] bg-neutral-50 hover:bg-[#FAF6EF]/50 py-3 px-4 rounded-xl text-xs font-medium text-neutral-700 transition cursor-pointer"
                      >
                        <Upload size={14} className="text-[#9C6B30]" />
                        Upload Thumbnail Image
                      </button>

                      <div className="text-[10px] text-neutral-400 leading-tight">
                        Recommended aspect ratio 1:1 (square). JPG, PNG, WEBP up to 8MB.
                      </div>
                    </div>
                  </div>

                  {/* Or direct image URL fallback */}
                  <div className="mt-3">
                    <span className="text-[10px] uppercase text-neutral-400 block mb-1">Or paste direct image URL:</span>
                    <input
                      type="url"
                      value={form.thumbnailUrl}
                      onChange={e => {
                        setForm(prev => ({ ...prev, thumbnailUrl: e.target.value }));
                        setImagePreview(e.target.value);
                        setImageFile(null);
                        if (formErrors.thumbnailUrl) setFormErrors(prev => ({ ...prev, thumbnailUrl: null }));
                      }}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#9C6B30]"
                    />
                  </div>

                  {formErrors.thumbnailUrl && (
                    <span className="text-[11px] text-red-500 mt-1 block flex items-center gap-1">
                      <AlertCircle size={12} /> {formErrors.thumbnailUrl}
                    </span>
                  )}
                </div>

                {/* Caption / Title */}
                <div>
                  <label className="text-[11px] tracking-wider uppercase text-neutral-600 font-semibold block mb-1.5">
                    Caption / Title <span className="text-neutral-400 text-[10px] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Handcrafted Polki Diamond Haar"
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3.5 py-2 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#9C6B30]"
                  />
                  <span className="text-[10px] text-neutral-400 mt-1 block">Displayed on image hover card</span>
                </div>

                {/* Display Order & Toggles Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-neutral-100">
                  <div>
                    <label className="text-[11px] tracking-wider uppercase text-neutral-600 font-semibold block mb-1.5">
                      Display Order
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.displayOrder}
                      onChange={e => setForm(prev => ({ ...prev, displayOrder: e.target.value }))}
                      className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#9C6B30]"
                    />
                  </div>

                  <div className="flex flex-col justify-center pt-3 sm:pt-0">
                    <label className="text-[11px] tracking-wider uppercase text-neutral-600 font-semibold block mb-1">
                      Status
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer mt-1">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={e => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                        className="rounded border-neutral-300 text-[#9C6B30] focus:ring-[#9C6B30]"
                      />
                      <span className="text-xs font-medium text-neutral-700">Active</span>
                    </label>
                  </div>

                  <div className="flex flex-col justify-center pt-3 sm:pt-0">
                    <label className="text-[11px] tracking-wider uppercase text-neutral-600 font-semibold block mb-1">
                      Open Link
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer mt-1">
                      <input
                        type="checkbox"
                        checked={form.openInNewTab}
                        onChange={e => setForm(prev => ({ ...prev, openInNewTab: e.target.checked }))}
                        className="rounded border-neutral-300 text-[#9C6B30] focus:ring-[#9C6B30]"
                      />
                      <span className="text-xs font-medium text-neutral-700">New Tab</span>
                    </label>
                  </div>
                </div>

                {/* Modal Footer Buttons */}
                <div className="pt-4 border-t border-neutral-200 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#9C6B30] text-white px-5 py-2 rounded-lg text-xs tracking-wider uppercase font-medium transition shadow-xs disabled:opacity-50"
                  >
                    {submitting && <Loader2 size={14} className="animate-spin" />}
                    {editingId ? 'Save Changes' : 'Save Social Media'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              key="delete-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deleting && setDeleteModalItem(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            <motion.div
              key="delete-modal-content"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 p-6 z-10 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={22} />
              </div>

              <h3 className="font-display text-lg text-[#1A1A1A] font-medium">Delete Social Media Post</h3>
              <p className="text-xs text-neutral-500 mt-2">
                Are you sure you want to delete this social media post? This action will remove it from the &quot;Follow Our World&quot; section.
              </p>

              {deleteModalItem.thumbnailUrl && (
                <div className="w-20 h-20 rounded-xl overflow-hidden border border-neutral-200 mx-auto my-4">
                  <img
                    src={deleteModalItem.thumbnailUrl}
                    alt="Deleting"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeleteModalItem(null)}
                  className="px-5 py-2.5 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteConfirm}
                  className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-xs tracking-wider uppercase font-medium transition shadow-xs disabled:opacity-50"
                >
                  {deleting && <Loader2 size={14} className="animate-spin" />}
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
