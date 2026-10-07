'use client';
import { useEffect, useState } from 'react';
import { formatINR, getNormalizedSpecs, getNormalizedBenefits } from '@/lib/products';
import {
  Plus, Pencil, Trash2, X, Loader2, Search, Upload,
  Link as LinkIcon, Trash, Check, ArrowLeft, ArrowRight,
  FileText, Sparkles, Settings, Image as ImageIcon, Eye, Award
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import SpecificationsBuilder from '@/components/ui/specifications-builder';
import BenefitsBuilder from '@/components/ui/benefits-builder';

const EMPTY = {
  name: '', slug: '', sku: '', category: 'gold', collection: 'trending',
  gender: 'women', description: '', price: 0, mrp: 0, purity: '',
  metal: '', stone: '', weight: '', size: '', stock: 10,
  images: [], video: '', badge: '', rating: 0, reviews: 0,
  featured: false, bestseller: false, newArrival: false,
  seoTitle: '', seoDescription: '',
  specifications: [],
  productBenefits: []
};

export default function AdminProducts() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [urlInput, setUrlInput] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);

  const load = async () => {
    try {
      const r = await fetch('/api/admin/products', { credentials: 'include' });
      if (r.ok) {
        const d = await r.json();
        setList(d.products || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [prodRes, catsRes, colsRes] = await Promise.all([
        fetch('/api/admin/products', { credentials: 'include' }),
        fetch('/api/admin/categories', { credentials: 'include' }),
        fetch('/api/admin/collections', { credentials: 'include' })
      ]);
      if (prodRes.ok) {
        const d = await prodRes.json();
        setList(d.products || []);
      }
      if (catsRes.ok) {
        const d = await catsRes.json();
        setCategories(d.categories || []);
      }
      if (colsRes.ok) {
        const d = await colsRes.json();
        setCollections(d.collections || []);
      }
    } catch (err) {
      console.error('Failed to load admin products data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openNew = () => {
    setEditing('new');
    setForm({
      ...EMPTY,
      category: categories[0]?.slug || 'gold',
      collection: collections[0]?.slug || 'trending',
      productBenefits: []
    });
    setActiveTab('basic');
  };

  const openEdit = (p) => {
    setEditing(p.id);
    setForm({
      ...EMPTY,
      ...p,
      specifications: getNormalizedSpecs(p),
      productBenefits: getNormalizedBenefits(p),
      images: Array.isArray(p.images) ? [...p.images] : (p.images ? [p.images] : [])
    });
    setActiveTab('basic');
  };

  const handleNameChange = (nameVal) => {
    setForm(f => {
      const updates = { ...f, name: nameVal };
      if (editing === 'new') {
        updates.slug = nameVal
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // remove invalid chars
          .replace(/\s+/g, '-')         // collapse whitespace and replace by -
          .replace(/-+/g, '-');         // collapse dashes
      }
      return updates;
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploadingImage(true);
    const uploadedUrls = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const r = await fetch('/api/admin/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        if (r.ok) {
          const d = await r.json();
          uploadedUrls.push(d.url);
        } else {
          const d = await r.json().catch(() => ({}));
          toast.error(d.error || `Failed to upload ${file.name}`);
        }
      } catch (err) {
        console.error(err);
        toast.error(`Upload error for ${file.name}`);
      }
    }

    if (uploadedUrls.length) {
      setForm(f => ({
        ...f,
        images: [...(f.images || []), ...uploadedUrls]
      }));
      toast.success(`Successfully uploaded ${uploadedUrls.length} file(s)`);
    }
    setUploadingImage(false);
  };

  const addImageUrl = () => {
    if (!urlInput.trim()) return;
    if (!urlInput.startsWith('http://') && !urlInput.startsWith('https://') && !urlInput.startsWith('/')) {
      return toast.error('Please enter a valid URL (starting with http://, https://, or /)');
    }
    setForm(f => ({
      ...f,
      images: [...(f.images || []), urlInput.trim()]
    }));
    setUrlInput('');
    toast.success('Image URL added');
  };

  const deleteImage = (index) => {
    setForm(f => ({
      ...f,
      images: f.images.filter((_, i) => i !== index)
    }));
  };

  const makePrimary = (index) => {
    if (index === 0) return;
    setForm(f => {
      const nextImages = [...(f.images || [])];
      const [item] = nextImages.splice(index, 1);
      nextImages.unshift(item);
      return { ...f, images: nextImages };
    });
  };

  const moveImage = (index, direction) => {
    setForm(f => {
      const nextImages = [...(f.images || [])];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= nextImages.length) return f;
      const temp = nextImages[index];
      nextImages[index] = nextImages[targetIndex];
      nextImages[targetIndex] = temp;
      return { ...f, images: nextImages };
    });
  };

  const save = async () => {
    if (!form.name || !form.slug || !form.price) return toast.error('Name, slug and price are required');
    setSaving(true);

    // Clean specifications: ignore completely empty rows (both label and value are empty)
    const cleanedSpecs = (form.specifications || [])
      .filter(s => s.label?.trim() || s.value?.trim())
      .map((s, idx) => ({
        id: s.id || Math.random().toString(36).substring(2, 9),
        label: s.label?.trim() || '',
        value: s.value?.trim() || '',
        enabled: s.enabled !== false,
        order: idx
      }));

    // Clean product benefits: ignore items with empty title
    const cleanedBenefits = (form.productBenefits || [])
      .filter(b => b.title?.trim())
      .map((b, idx) => ({
        id: b.id || Math.random().toString(36).substring(2, 9),
        title: b.title.trim(),
        icon: b.icon?.trim() || 'ShieldCheck',
        description: b.description?.trim() || '',
        enabled: b.enabled !== false,
        order: b.order !== undefined && b.order !== null && !isNaN(b.order) ? +b.order : idx
      }));

    // Synchronize legacy fields from cleaned specs
    const findSpecValue = (labels) => {
      const spec = cleanedSpecs.find(s => labels.includes(s.label.trim().toLowerCase()));
      return spec ? spec.value : '';
    };

    const metalVal = findSpecValue(['metal', 'metal composition', 'material', 'metalcomposition']);
    const purityVal = findSpecValue(['purity', 'gold purity', 'goldpurity']);
    const stoneVal = findSpecValue(['stone', 'stone details', 'stone/diamond cut details', 'stone/diamond details', 'stonedetails']);
    const weightVal = findSpecValue(['weight', 'weight (g)']);
    const sizeVal = findSpecValue(['size', 'product size', 'productsize']);

    const body = {
      ...form,
      specifications: cleanedSpecs,
      productBenefits: cleanedBenefits,
      metal: metalVal || form.metal || '',
      purity: purityVal || form.purity || '',
      stone: stoneVal || form.stone || '',
      weight: weightVal || form.weight || '',
      size: sizeVal || form.size || '',
      price: +form.price,
      mrp: +form.mrp || +form.price,
      stock: +form.stock || 0,
      rating: Number.isFinite(+form.rating) ? +form.rating : 0,
      reviews: +form.reviews || 0
    };
    const url = editing === 'new' ? '/api/admin/products' : `/api/admin/products/${editing}`;
    const method = editing === 'new' ? 'POST' : 'PUT';
    const r = await fetch(url, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (r.ok) {
      toast.success('Saved');
      setEditing(null);
      load();
    } else {
      const d = await r.json();
      toast.error(d.error || 'Failed');
    }
    setSaving(false);
  };

  const del = async (id) => {
    if (!confirm('Delete this product?')) return;
    const r = await fetch(`/api/admin/products/${id}`, { method: 'DELETE', credentials: 'include' });
    if (r.ok) {
      toast.success('Deleted');
      load();
    }
  };

  const filtered = q ? list.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.sku?.toLowerCase().includes(q.toLowerCase())) : list;

  return (
    <div className="pb-10">
      <div className="flex justify-between items-start xs:items-center flex-col xs:flex-row gap-3">
        <div>
          <div className="font-display text-2xl xs:text-3xl sm:text-4xl text-[#1A1A1A] font-light">Products</div>
          <div className="gold-line w-12 mt-2" />
        </div>
        <button
          onClick={openNew}
          className="flex items-center justify-center gap-2 bg-[#1A1A1A] text-white px-5 py-2.5 text-[11px] tracking-widest uppercase rounded-md hover:bg-[#9C6B30] transition-colors font-semibold w-full xs:w-auto"
        >
          <Plus size={14} /> Add Product
        </button>
      </div>

      <div className="mt-6 relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search products…"
          className="w-full pl-9 pr-4 py-2.5 border border-neutral-200 rounded-md text-sm bg-white focus:outline-none focus:border-[#9C6B30] transition-colors"
        />
      </div>

      <div className="mt-6 bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="animate-spin inline text-[#9C6B30]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-neutral-50 text-[10px] tracking-widest uppercase text-neutral-500 border-b border-neutral-200">
                <tr>
                  <th className="text-left p-3 min-w-[180px]">Product</th>
                  <th className="text-left p-3 min-w-[100px]">Category</th>
                  <th className="text-right p-3 min-w-[90px]">Price</th>
                  <th className="text-center p-3">Stock</th>
                  <th className="text-center p-3 min-w-[120px]">Flags</th>
                  <th className="text-right p-3 min-w-[80px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover border border-neutral-100 shadow-xs shrink-0" />
                        ) : (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border border-neutral-200 bg-neutral-50 flex items-center justify-center text-neutral-400 shrink-0">
                            <ImageIcon size={16} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-medium text-neutral-800 truncate max-w-[160px] sm:max-w-[220px]" title={p.name}>{p.name}</div>
                          <div className="text-[11px] text-neutral-400 font-mono mt-0.5">{p.sku || 'No SKU'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 capitalize text-neutral-600">{p.category}</td>
                    <td className="p-3 text-right font-medium text-neutral-800">{formatINR(p.price)}</td>
                    <td className="p-3 text-center">
                      {(p.stock ?? 0) <= 0 ? (
                        <span className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-700 font-semibold uppercase whitespace-nowrap">0 (OUT OF STOCK)</span>
                      ) : (
                        <span className="font-semibold text-emerald-700 whitespace-nowrap">{p.stock} (IN STOCK)</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex gap-1 justify-center flex-wrap">
                        {p.featured && <span className="text-[9px] px-1.5 py-0.5 bg-[#FAF6EF] text-[#9C6B30] border border-[#9C6B30]/20 rounded font-semibold uppercase">Featured</span>}
                        {p.bestseller && <span className="text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold uppercase">Best</span>}
                        {p.newArrival && <span className="text-[9px] px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-semibold uppercase">New</span>}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 text-neutral-400 hover:text-[#9C6B30] hover:bg-neutral-50 rounded transition-all mr-1"
                        title="Edit Product"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => del(p.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                        title="Delete Product"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {editing && (
          <div
            className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-xs z-50 flex justify-end"
            onClick={(e) => { if (e.target === e.currentTarget) setEditing(null); }}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="bg-white w-full max-w-5xl h-full flex flex-col shadow-2xl border-l border-neutral-100"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-4 xs:px-6 sm:px-8 py-4 sm:py-5 border-b border-neutral-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div>
                  <h3 className="font-display text-xl sm:text-2xl text-neutral-900 font-semibold">
                    {editing === 'new' ? 'New Product' : 'Edit Product'}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5">Configure basic metadata, specifications, and media items.</p>
                </div>
                <button
                  onClick={() => setEditing(null)}
                  className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Tabs Menu */}
              <div className="flex border-b border-neutral-100 bg-[#FAF6EF]/20 px-3 xs:px-6 overflow-x-auto hide-scrollbar scrollbar-none">
                {[
                  { id: 'basic', label: 'Basic Info', icon: FileText },
                  { id: 'pricing', label: 'Pricing & Inventory', icon: Sparkles },
                  { id: 'specs', label: 'Specifications', icon: Settings },
                  { id: 'benefits', label: 'Product Benefits', icon: Award },
                  { id: 'media', label: 'Media Gallery', icon: ImageIcon },
                  { id: 'seo', label: 'SEO Config', icon: Eye }
                ].map(tab => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 sm:gap-2 py-3.5 sm:py-4 px-2.5 sm:px-3 border-b-2 text-[10px] sm:text-xs tracking-wider uppercase font-medium transition-all whitespace-nowrap shrink-0 ${active
                        ? 'border-[#9C6B30] text-[#9C6B30]'
                        : 'border-transparent text-neutral-400 hover:text-neutral-800'
                        }`}
                    >
                      <Icon size={14} className={active ? 'text-[#9C6B30]' : 'text-neutral-400'} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto p-4 xs:p-6 sm:p-8 space-y-4 sm:space-y-6 bg-neutral-50/50">

                {/* 1. Basic Info Tab */}
                {activeTab === 'basic' && (
                  <div className="space-y-4">
                    <div className="bg-white p-4 xs:p-6 rounded-xl border border-neutral-100 shadow-xs space-y-4">
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">General Details</h4>

                      <div>
                        <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Product Name</label>
                        <input
                          value={form.name}
                          onChange={e => handleNameChange(e.target.value)}
                          placeholder="E.g., MikuMantra Solitaire Studs"
                          className="w-full mt-1.5 px-3 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#9C6B30] focus:ring-1 focus:ring-[#9C6B30] transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Slug (URL Route)</label>
                          <input
                            value={form.slug}
                            onChange={e => setForm({ ...form, slug: e.target.value })}
                            placeholder="mikumantra-solitaire-studs"
                            className="w-full mt-1.5 px-3 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#9C6B30] focus:ring-1 focus:ring-[#9C6B30] transition-all font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">SKU Code</label>
                          <input
                            value={form.sku}
                            onChange={e => setForm({ ...form, sku: e.target.value })}
                            placeholder="E.g., GLD-ER-009"
                            className="w-full mt-1.5 px-3 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#9C6B30] focus:ring-1 focus:ring-[#9C6B30] transition-all font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Description</label>
                        <textarea
                          value={form.description}
                          onChange={e => setForm({ ...form, description: e.target.value })}
                          rows={4}
                          placeholder="Describe the gemstone quality, diamond cut details, craftsmanship..."
                          className="w-full mt-1.5 px-3 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#9C6B30] focus:ring-1 focus:ring-[#9C6B30] transition-all"
                        />
                      </div>
                    </div>

                    <div className="bg-white p-4 xs:p-6 rounded-xl border border-neutral-100 shadow-xs space-y-4">
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Classification</h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Category</label>
                          <select
                            value={form.category}
                            onChange={e => setForm({ ...form, category: e.target.value })}
                            className="w-full mt-1.5 px-3 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#9C6B30] transition-all capitalize"
                          >
                            {categories.map(c => (
                              <option key={c.id} value={c.slug}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Collection</label>
                          <select
                            value={form.collection}
                            onChange={e => setForm({ ...form, collection: e.target.value })}
                            className="w-full mt-1.5 px-3 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#9C6B30] transition-all capitalize"
                          >
                            {collections.map(c => (
                              <option key={c.id} value={c.slug}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Target Gender</label>
                          <select
                            value={form.gender}
                            onChange={e => setForm({ ...form, gender: e.target.value })}
                            className="w-full mt-1.5 px-3 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#9C6B30] transition-all"
                          >
                            <option value="women">Women</option>
                            <option value="men">Men</option>
                            <option value="kids">Kids</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Badge Ribbon</label>
                          <input
                            value={form.badge}
                            onChange={e => setForm({ ...form, badge: e.target.value })}
                            placeholder="E.g., Exclusive, Limited Edition"
                            className="w-full mt-1.5 px-3 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#9C6B30] focus:ring-1 focus:ring-[#9C6B30] transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Pricing & Stock Tab */}
                {activeTab === 'pricing' && (
                  <div className="space-y-4">
                    <div className="bg-white p-4 xs:p-6 rounded-xl border border-neutral-100 shadow-xs space-y-4">
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Finance & Inventory</h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Price (₹ Selling Price)</label>
                          <input
                            type="number"
                            value={form.price}
                            onChange={e => setForm({ ...form, price: e.target.value })}
                            className="w-full mt-1.5 px-3 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#9C6B30] focus:ring-1 focus:ring-[#9C6B30] transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">MRP (₹ Original Retail Price)</label>
                          <input
                            type="number"
                            value={form.mrp}
                            onChange={e => setForm({ ...form, mrp: e.target.value })}
                            className="w-full mt-1.5 px-3 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#9C6B30] focus:ring-1 focus:ring-[#9C6B30] transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Available Stock Quantity</label>
                          <input
                            type="number"
                            value={form.stock}
                            onChange={e => setForm({ ...form, stock: e.target.value })}
                            className="w-full mt-1.5 px-3 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#9C6B30] focus:ring-1 focus:ring-[#9C6B30] transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Mock Rating</label>
                          <input
                            type="number"
                            step="0.1"
                            value={form.rating}
                            onChange={e => setForm({ ...form, rating: e.target.value })}
                            className="w-full mt-1.5 px-3 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#9C6B30] focus:ring-1 focus:ring-[#9C6B30] transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-4 xs:p-6 rounded-xl border border-neutral-100 shadow-xs space-y-4">
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Display Promotions</h4>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { id: 'featured', label: 'Featured Piece', desc: 'Main pages feature grid' },
                          { id: 'bestseller', label: 'Bestseller', desc: 'Gives bestseller mark' },
                          { id: 'newArrival', label: 'New Arrival', desc: 'Adds brand-new sticker' }
                        ].map(flag => {
                          const checked = form[flag.id] || false;
                          return (
                            <label
                              key={flag.id}
                              className={`flex flex-col justify-between p-3.5 xs:p-4 rounded-xl border cursor-pointer transition-all ${checked
                                ? 'border-[#9C6B30] bg-[#FAF6EF]/30 shadow-xs'
                                : 'border-neutral-200 bg-white hover:border-neutral-300'
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-neutral-800">{flag.label}</span>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={e => setForm({ ...form, [flag.id]: e.target.checked })}
                                  className="accent-[#9C6B30] h-4 w-4 rounded-md"
                                />
                              </div>
                              <span className="text-[9px] text-neutral-400 mt-2 block leading-relaxed">{flag.desc}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Specifications Tab */}
                {activeTab === 'specs' && (
                  <div className="bg-white p-4 xs:p-6 rounded-xl border border-neutral-100 shadow-xs">
                    <SpecificationsBuilder
                      specifications={form.specifications || []}
                      onChange={specs => setForm({ ...form, specifications: specs })}
                    />
                  </div>
                )}

                {/* 4. Product Benefits Tab */}
                {activeTab === 'benefits' && (
                  <div className="bg-white p-4 xs:p-6 rounded-xl border border-neutral-100 shadow-xs">
                    <BenefitsBuilder
                      productBenefits={form.productBenefits || []}
                      onChange={benefits => setForm({ ...form, productBenefits: benefits })}
                    />
                  </div>
                )}

                {/* 5. Media Tab */}
                {activeTab === 'media' && (
                  <div className="space-y-4">
                    <div className="bg-white p-4 xs:p-6 rounded-xl border border-neutral-100 shadow-xs space-y-4">
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Product Media Gallery</h4>
                      <p className="text-[10px] text-neutral-400 mb-4">First image in the sequence is designated as the primary storefront image.</p>

                      {/* Image List Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
                        {form.images?.map((url, index) => (
                          <div
                            key={url + index}
                            className={`aspect-square relative rounded-xl overflow-hidden border group transition-all ${index === 0 ? 'border-[#9C6B30] ring-2 ring-[#9C6B30]/10' : 'border-neutral-200 hover:border-neutral-300'
                              }`}
                          >
                            <img src={url} className="w-full h-full object-cover" alt={`Product ${index + 1}`} />

                            {index === 0 && (
                              <span className="absolute top-2 left-2 bg-[#9C6B30] text-white text-[9px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full shadow-md z-10">
                                Primary
                              </span>
                            )}

                            {/* Hover Overlay Controls */}
                            <div className="absolute inset-0 bg-neutral-900/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-neutral-200 bg-black/40 px-2 py-0.5 rounded-full font-mono">
                                  #{index + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => deleteImage(index)}
                                  className="p-1 rounded bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
                                  title="Delete Image"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>

                              <div className="flex gap-1.5 justify-center flex-wrap">
                                {index > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => moveImage(index, -1)}
                                    className="p-1 rounded bg-white/20 hover:bg-white/40 text-white cursor-pointer"
                                    title="Move Left"
                                  >
                                    <ArrowLeft size={12} />
                                  </button>
                                )}
                                {index > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => makePrimary(index)}
                                    className="px-2 py-1 rounded bg-[#9C6B30] hover:bg-[#b07d3b] text-white text-[9px] font-semibold tracking-wider uppercase transition-colors cursor-pointer"
                                  >
                                    Primary
                                  </button>
                                )}
                                {index < (form.images?.length - 1) && (
                                  <button
                                    type="button"
                                    onClick={() => moveImage(index, 1)}
                                    className="p-1 rounded bg-white/20 hover:bg-white/40 text-white cursor-pointer"
                                    title="Move Right"
                                  >
                                    <ArrowRight size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Empty state */}
                        {(!form.images || form.images.length === 0) && (
                          <div className="col-span-2 sm:col-span-3 flex flex-col items-center justify-center py-10 text-neutral-400 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                            <ImageIcon size={36} className="text-neutral-300 stroke-[1.2] mb-2" />
                            <span className="text-xs font-medium">No product images uploaded</span>
                          </div>
                        )}
                      </div>

                      {/* Image Addition Channels */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-4 border-t border-neutral-100">
                        {/* File Upload Area */}
                        <div>
                          <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold mb-2 block">Upload Local Files</label>
                          <label className={`flex flex-col items-center justify-center border-2 border-dashed border-neutral-200 rounded-xl p-5 text-center cursor-pointer transition-colors bg-white hover:bg-neutral-50 hover:border-[#9C6B30] min-h-[106px] ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                            {uploadingImage ? (
                              <>
                                <Loader2 className="animate-spin text-[#9C6B30] mb-2" size={20} />
                                <span className="text-xs text-neutral-500 font-medium">Processing images…</span>
                              </>
                            ) : (
                              <>
                                <Upload className="text-[#9C6B30] mb-2 hover:scale-105 transition-transform" size={22} />
                                <span className="text-xs font-semibold text-neutral-700">Choose Images</span>
                                <span className="text-[9px] text-neutral-400 mt-0.5">Supports PNG, JPG, WebP</span>
                              </>
                            )}
                          </label>
                        </div>

                        {/* URL Importer */}
                        <div>
                          <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold mb-2 block">Add via Remote URL</label>
                          <div className="flex flex-col justify-between border border-neutral-200 rounded-xl p-4 bg-white h-[106px]">
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <LinkIcon size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                                <input
                                  value={urlInput}
                                  onChange={e => setUrlInput(e.target.value)}
                                  placeholder="https://example.com/image.jpg"
                                  className="w-full pl-7 pr-2 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30] transition-colors"
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      addImageUrl();
                                    }
                                  }}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={addImageUrl}
                                className="bg-[#1A1A1A] hover:bg-[#9C6B30] text-white text-[10px] font-semibold tracking-wider uppercase px-3 py-2 rounded-lg transition-colors cursor-pointer"
                              >
                                Add
                              </button>
                            </div>
                            <span className="text-[9px] text-neutral-400 leading-tight">Enter remote CDN links or Unsplash assets directly here.</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-neutral-100 shadow-xs space-y-4">
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Video Presentation</h4>
                      <div>
                        <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Video URL (optional)</label>
                        <div className="relative mt-1.5">
                          <LinkIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                          <input
                            value={form.video}
                            onChange={e => setForm({ ...form, video: e.target.value })}
                            placeholder="E.g., YouTube embed or static video MP4 link"
                            className="w-full pl-8 pr-3 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. SEO Config Tab */}
                {activeTab === 'seo' && (
                  <div className="space-y-4">
                    <div className="bg-white p-6 rounded-xl border border-neutral-100 shadow-xs space-y-4">
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Google Search Preview</h4>

                      <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-100 text-left">
                        <div className="text-[11px] text-neutral-500 font-sans truncate">
                          https://mikumantra.in/product/{form.slug || 'product-slug'}
                        </div>
                        <div className="text-[16px] text-blue-800 font-medium font-sans hover:underline cursor-pointer line-clamp-1 mt-0.5">
                          {form.seoTitle || form.name || 'Product Title | MikuMantra Fine Jewellery'}
                        </div>
                        <div className="text-[13px] text-neutral-600 font-sans line-clamp-2 mt-1 leading-relaxed">
                          {form.seoDescription || form.description || 'Add an SEO meta description to display detailed search result snippets on search engine result pages.'}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-neutral-100 shadow-xs space-y-4">
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Metadata Config</h4>

                      <div>
                        <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">SEO Meta Title</label>
                        <input
                          value={form.seoTitle}
                          onChange={e => setForm({ ...form, seoTitle: e.target.value })}
                          placeholder="E.g., MikuMantra Solitaire Earrings | MikuMantra Fine Jewellery"
                          className="w-full mt-1.5 px-3 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#9C6B30] focus:ring-1 focus:ring-[#9C6B30] transition-all"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">SEO Meta Description</label>
                        <textarea
                          value={form.seoDescription}
                          onChange={e => setForm({ ...form, seoDescription: e.target.value })}
                          rows={3}
                          placeholder="Summarize the product specifications and elegance in 150-160 characters..."
                          className="w-full mt-1.5 px-3 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#9C6B30] focus:ring-1 focus:ring-[#9C6B30] transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="p-6 border-t border-neutral-100 sticky bottom-0 bg-white flex justify-end gap-3 z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
                <button
                  onClick={() => setEditing(null)}
                  className="px-5 py-2.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  onClick={save}
                  className="px-6 py-2.5 bg-[#1A1A1A] text-white text-[11px] tracking-widest uppercase rounded hover:bg-[#9C6B30] disabled:opacity-60 transition-colors flex items-center gap-2 cursor-pointer font-semibold"
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin" size={12} /> Saving…
                    </>
                  ) : (
                    'Save Product'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
