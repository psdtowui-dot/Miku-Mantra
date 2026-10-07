'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Loader2, X, Upload } from 'lucide-react';
import { toast } from 'sonner';

const INITIAL_FORM = {
  name: '',
  slug: '',
  img: ''
};

export default function CategoriesPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(INITIAL_FORM);
  const [selectedId, setSelectedId] = useState(null);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/categories', { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setList(data.categories || []);
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

      // If a new file is chosen, upload it first
      if (imageFile) {
        finalImgUrl = await uploadFile(imageFile);
      }

      if (!finalImgUrl) {
        toast.error('Please choose a category image.');
        setSaving(false);
        return;
      }

      const bodyData = {
        ...form,
        img: finalImgUrl
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

  const handleEdit = (category) => {
    setSelectedId(category.id);
    setForm({
      name: category.name || '',
      slug: category.slug || '',
      img: category.img || ''
    });
    setImageFile(null);
    setImagePreview(category.img || '');
    
    // Smooth scroll to form
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

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setSelectedId(null);
    setImageFile(null);
    setImagePreview('');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="font-display text-2xl xs:text-3xl sm:text-4xl text-[#1A1A1A]">Categories</div>
      <div className="gold-line w-12 mt-2 mb-6 sm:mb-8" />

      {/* Category Form */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 xs:p-6 mb-8 shadow-xs">
        <h2 className="text-base sm:text-lg font-medium text-[#1A1A1A] mb-4">
          {selectedId ? 'Edit Category' : 'Create Category'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Name</label>
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-neutral-200 rounded text-sm focus:outline-none focus:border-[#9C6B30]"
                placeholder="Gold"
              />
            </div>
            
            <div>
              <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Slug</label>
              <input
                required
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-neutral-200 rounded text-sm focus:outline-none focus:border-[#9C6B30]"
                placeholder="gold"
              />
            </div>
          </div>

          {/* Local Image Upload & Preview */}
          <div>
            <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block mb-2">Category Image</label>
            
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
              disabled={saving}
              className="flex items-center justify-center gap-2 bg-[#1A1A1A] text-white px-5 py-2 text-[11px] tracking-widest uppercase rounded hover:bg-[#9C6B30] transition disabled:opacity-50 w-full sm:w-auto"
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

      {/* Categories List */}
      <div className="mb-10">
        <h2 className="text-base sm:text-lg font-medium text-[#1A1A1A] mb-4">Current Categories</h2>
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-[#9C6B30]" size={24} />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-neutral-200 divide-y overflow-hidden shadow-xs">
            {list.length === 0 ? (
              <div className="p-8 text-center text-neutral-400">No categories created yet.</div>
            ) : (
              list.map((item) => (
                <div key={item.id} className="p-3.5 xs:p-4 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 hover:bg-neutral-50/50 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={item.img} className="w-10 h-10 rounded object-cover border border-neutral-200 bg-neutral-100 shrink-0" alt="" />
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-neutral-800 truncate" title={item.name}>{item.name}</div>
                      <div className="text-xs text-neutral-500 font-mono">{item.slug}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end xs:self-center">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-1.5 border border-neutral-200 rounded text-neutral-600 hover:text-[#9C6B30] hover:border-[#9C6B30] transition bg-white"
                      title="Edit Category"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 border border-neutral-200 rounded text-neutral-600 hover:text-red-600 hover:border-red-600 transition bg-white"
                      title="Delete Category"
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
    </div>
  );
}
