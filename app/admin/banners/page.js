'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Loader2, X, Check, Upload } from 'lucide-react';
import { toast } from 'sonner';

const TRANSITIONS = [
  { value: 'fade', label: 'FADE' },
  { value: 'slide', label: 'SLIDE' },
  { value: 'zoom', label: 'ZOOM' },
  { value: 'scaleFade', label: 'SCALE + FADE' }
];

const INITIAL_FORM = {
  title: '',
  kicker: '',
  copy: '',
  cta: '',
  href: '',
  img: '',
  order: 1,
  active: true
};

export default function BannerAdminPage() {
  const [banners, setBanners] = useState([]);
  const [transition, setTransition] = useState('fade');
  const [loading, setLoading] = useState(true);
  const [savingTransition, setSavingTransition] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [selectedId, setSelectedId] = useState(null);
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bannersRes, settingsRes] = await Promise.all([
        fetch('/api/admin/banners', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/admin/bannerSettings', { credentials: 'include', cache: 'no-store' })
      ]);
      
      if (bannersRes.ok) {
        const bData = await bannersRes.json();
        // Sort banners by order ascending
        const sorted = (bData.banners || []).sort((a, b) => (a.order || 0) - (b.order || 0));
        setBanners(sorted);
      }
      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        setTransition(sData.transition || 'fade');
      }
    } catch (err) {
      toast.error('Failed to load banner data');
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
      toast.error('Invalid file type. Only JPG, JPEG, PNG, and WEBP are allowed.');
      return;
    }

    // Validate extension
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      toast.error('Invalid file extension. Only .jpg, .jpeg, .png, and .webp are allowed.');
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

  const handleSaveTransition = async () => {
    setSavingTransition(true);
    try {
      const res = await fetch('/api/admin/bannerSettings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transition })
      });
      if (res.ok) {
        toast.success('Transition setting saved');
        loadData();
      } else {
        toast.error('Failed to save transition setting');
      }
    } catch (err) {
      toast.error('An error occurred while saving');
    } finally {
      setSavingTransition(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      let finalImgUrl = form.img;

      // If a new file is chosen, upload it first
      if (imageFile) {
        finalImgUrl = await uploadFile(imageFile);
      }

      if (!finalImgUrl) {
        toast.error('Please choose a banner image.');
        setUploading(false);
        return;
      }

      const bodyData = {
        ...form,
        img: finalImgUrl,
        order: Number(form.order)
      };

      if (selectedId) {
        // Edit existing banner
        const res = await fetch(`/api/admin/banners/${selectedId}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData)
        });
        if (res.ok) {
          toast.success('Banner updated successfully');
          resetForm();
          loadData();
        } else {
          const errData = await res.json();
          toast.error(errData.error || 'Failed to update banner');
        }
      } else {
        // Add new banner
        const res = await fetch('/api/admin/banners', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData)
        });
        if (res.ok) {
          toast.success('Banner added successfully');
          resetForm();
          loadData();
        } else {
          const errData = await res.json();
          toast.error(errData.error || 'Failed to add banner');
        }
      }
    } catch (err) {
      toast.error(err.message || 'An error occurred while saving the banner.');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (banner) => {
    setSelectedId(banner.id);
    setForm({
      title: banner.title || '',
      kicker: banner.kicker || '',
      copy: banner.copy || '',
      cta: banner.cta || '',
      href: banner.href || '',
      img: banner.img || '',
      order: banner.order || 1,
      active: banner.active !== false
    });
    setImageFile(null);
    setImagePreview(banner.img || '');
    
    // Smooth scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    try {
      const res = await fetch(`/api/admin/banners/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        toast.success('Banner deleted');
        if (selectedId === id) resetForm();
        loadData();
      } else {
        toast.error('Failed to delete banner');
      }
    } catch (err) {
      toast.error('An error occurred during deletion');
    }
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setSelectedId(null);
    setImageFile(null);
    setImagePreview('');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="font-display text-2xl xs:text-3xl sm:text-4xl text-[#1A1A1A]">Homepage Banners</div>
      <div className="gold-line w-12 mt-2 mb-6 sm:mb-8" />

      {/* Banner Form */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 xs:p-6 mb-8 shadow-xs">
        <h2 className="text-base sm:text-lg font-medium text-[#1A1A1A] mb-4">
          {selectedId ? 'Edit Banner' : 'Create Banner'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Title</label>
              <input
                required
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-neutral-200 rounded text-sm focus:outline-none focus:border-[#9C6B30]"
                placeholder="The Bridal Edit"
              />
            </div>
            
            <div>
              <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Kicker</label>
              <input
                required
                type="text"
                value={form.kicker}
                onChange={(e) => setForm({ ...form, kicker: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-neutral-200 rounded text-sm focus:outline-none focus:border-[#9C6B30]"
                placeholder="Wedding Collection"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Copy</label>
            <textarea
              required
              rows={3}
              value={form.copy}
              onChange={(e) => setForm({ ...form, copy: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-neutral-200 rounded text-sm focus:outline-none focus:border-[#9C6B30]"
              placeholder="Heirloom polki chokers, uncut diamond haars & maang tikkas..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">CTA Text</label>
              <input
                required
                type="text"
                value={form.cta}
                onChange={(e) => setForm({ ...form, cta: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-neutral-200 rounded text-sm focus:outline-none focus:border-[#9C6B30]"
                placeholder="Discover the Edit"
              />
            </div>
            
            <div>
              <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Link URL</label>
              <input
                required
                type="text"
                value={form.href}
                onChange={(e) => setForm({ ...form, href: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-neutral-200 rounded text-sm focus:outline-none focus:border-[#9C6B30]"
                placeholder="/shop?category=wedding"
              />
            </div>
          </div>

          {/* Local Image Upload & Preview */}
          <div>
            <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block mb-2">Banner Image</label>
            
            <div className="border border-dashed border-neutral-300 rounded-lg p-3 xs:p-4 flex flex-col items-center justify-center bg-neutral-50">
              {imagePreview ? (
                <div className="relative w-full max-h-48 sm:max-h-64 rounded-lg overflow-hidden border border-neutral-200 mb-4 bg-white flex items-center justify-center">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-44 sm:max-h-60 max-w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview('');
                      setForm({ ...form, img: '' });
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 transition"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center py-5 text-neutral-400 text-center">
                  <Upload size={28} className="mb-2 text-neutral-300" />
                  <span className="text-xs">No image selected (JPG, JPEG, PNG, WEBP max 5MB)</span>
                </div>
              )}
              
              <label className="cursor-pointer bg-white border border-neutral-300 hover:border-neutral-400 px-4 py-2 text-[11px] tracking-wider uppercase rounded shadow-xs text-neutral-700 font-medium transition">
                Choose Image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Order</label>
              <input
                required
                type="number"
                min={1}
                value={form.order}
                onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 1 })}
                className="w-full mt-1 px-3 py-2 border border-neutral-200 rounded text-sm focus:outline-none focus:border-[#9C6B30]"
              />
            </div>

            <div className="flex items-center h-[38px] pb-2 sm:pl-2">
              <label className="flex items-center gap-2 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="w-4 h-4 accent-[#9C6B30] border-neutral-300 rounded focus:ring-[#9C6B30]"
                />
                <span className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Active</span>
              </label>
            </div>

            <div className="flex gap-2 justify-end">
              {selectedId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex items-center justify-center gap-2 bg-neutral-200 text-neutral-700 px-5 py-2 text-[11px] tracking-widest uppercase rounded hover:bg-neutral-300 transition w-full sm:w-auto"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={uploading}
                className="flex items-center justify-center gap-2 bg-[#1A1A1A] text-white px-5 py-2 text-[11px] tracking-widest uppercase rounded hover:bg-[#9C6B30] transition disabled:opacity-50 w-full sm:w-auto"
              >
                {uploading ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : selectedId ? (
                  'Save Changes'
                ) : (
                  <>
                    <Plus size={14} /> Add Banner
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Banners List */}
      <div className="mb-10">
        <h2 className="text-base sm:text-lg font-medium text-[#1A1A1A] mb-4">Current Banners</h2>
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-[#9C6B30]" size={24} />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-neutral-200 divide-y overflow-hidden shadow-xs">
            {banners.length === 0 ? (
              <div className="p-8 text-center text-neutral-400">No banners created yet.</div>
            ) : (
              banners.map((item) => (
                <div key={item.id} className="p-3.5 xs:p-4 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 hover:bg-neutral-50/50 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={item.img} className="w-16 h-10 rounded object-cover border border-neutral-200 bg-neutral-100 shrink-0" alt="" />
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-neutral-800 truncate" title={item.title}>{item.title}</div>
                      <div className="text-xs text-neutral-500">
                        {item.kicker} · Order: {item.order} · {item.active ? (
                          <span className="text-green-600 font-semibold">Active</span>
                        ) : (
                          <span className="text-neutral-400">Inactive</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end xs:self-center">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-1.5 border border-neutral-200 rounded text-neutral-600 hover:text-[#9C6B30] hover:border-[#9C6B30] transition bg-white"
                      title="Edit Banner"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 border border-neutral-200 rounded text-neutral-600 hover:text-red-600 hover:border-red-600 transition bg-white"
                      title="Delete Banner"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <hr className="my-8 border-neutral-200" />

      {/* Transition settings */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 xs:p-6 mb-12 shadow-xs">
        <h2 className="text-lg font-medium text-[#1A1A1A] mb-2 uppercase tracking-wider text-[11px] text-neutral-500">
          Banner Transition
        </h2>
        <p className="text-xs text-neutral-400 mb-4">
          Choose the animation effect used when transitioning between homepage banners.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 mb-6">
          {TRANSITIONS.map((t) => {
            const isActive = transition === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTransition(t.value)}
                className={`py-2.5 px-3 border text-xs tracking-widest font-semibold rounded text-center transition-all ${
                  isActive
                    ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-xs'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  {t.label}
                  {isActive && <Check size={14} className="text-[#D4AF37]" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSaveTransition}
            disabled={savingTransition}
            className="flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-[#9C6B30] text-white px-6 py-2.5 text-[11px] tracking-widest uppercase rounded transition disabled:opacity-50 w-full sm:w-auto"
          >
            {savingTransition ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              'Save Transition'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
