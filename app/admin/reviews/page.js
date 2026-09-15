'use client';

import { useEffect, useState } from 'react';
import { 
  Star, Search, Plus, Filter, Trash2, Edit2, CheckCircle2, EyeOff, 
  Loader2, RefreshCw, X, Image as ImageIcon, MessageSquare, Check, ShieldCheck 
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [productFilter, setProductFilter] = useState('ALL');
  const [customerReviewsEnabled, setCustomerReviewsEnabled] = useState(true);
  const [togglingReviews, setTogglingReviews] = useState(false);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    productId: '',
    reviewerName: '',
    reviewerEmail: '',
    rating: 5,
    title: '',
    comment: '',
    image: '',
    status: 'published',
    verifiedPurchase: true
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);
      if (statusFilter !== 'ALL') queryParams.set('status', statusFilter);
      if (productFilter !== 'ALL') queryParams.set('productId', productFilter);

      const [resRev, resProd, resSettings] = await Promise.all([
        fetch(`/api/admin/reviews?${queryParams.toString()}`, { credentials: 'include', cache: 'no-store' }),
        fetch('/api/products', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/site-settings', { credentials: 'include', cache: 'no-store' })
      ]);

      if (resRev.ok) {
        const dataRev = await resRev.json();
        setReviews(dataRev.reviews || []);
      } else {
        toast.error('Failed to load reviews');
      }

      if (resProd.ok) {
        const dataProd = await resProd.json();
        setProducts(dataProd.products || []);
      }

      if (resSettings.ok) {
        const dataSettings = await resSettings.json();
        setCustomerReviewsEnabled(dataSettings.customerReviewsEnabled ?? true);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCustomerReviews = async () => {
    const nextVal = !customerReviewsEnabled;
    setTogglingReviews(true);
    try {
      const res = await fetch('/api/admin/settings/customer-reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled: nextVal, customerReviewsEnabled: nextVal })
      });
      if (res.ok) {
        setCustomerReviewsEnabled(nextVal);
        toast.success(`Customer reviews turned ${nextVal ? 'ON' : 'OFF'}`);
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || d.message || 'Failed to update setting');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error updating setting');
    } finally {
      setTogglingReviews(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, productFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const openAddModal = () => {
    setEditingReview(null);
    setForm({
      productId: products[0]?.id || 'p01',
      reviewerName: '',
      reviewerEmail: '',
      rating: 5,
      title: '',
      comment: '',
      image: '',
      status: 'published',
      verifiedPurchase: true
    });
    setShowModal(true);
  };

  const openEditModal = (review) => {
    setEditingReview(review);
    setForm({
      productId: review.productId || '',
      reviewerName: review.reviewerName || '',
      reviewerEmail: review.reviewerEmail || '',
      rating: review.rating || 5,
      title: review.title || '',
      comment: review.comment || '',
      image: Array.isArray(review.images) && review.images.length > 0 ? review.images[0] : '',
      status: review.status === 'hidden' ? 'hidden' : 'published',
      verifiedPurchase: review.verifiedPurchase ?? true
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.productId) return toast.error('Please select a product');
    if (!form.reviewerName.trim()) return toast.error('Reviewer name is required');
    if (!form.comment.trim()) return toast.error('Review comment is required');

    setSubmitting(true);
    try {
      const url = editingReview ? `/api/admin/reviews/${editingReview.id}` : '/api/admin/reviews';
      const method = editingReview ? 'PUT' : 'POST';

      const r = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const d = await r.json();
      if (r.ok) {
        toast.success(editingReview ? 'Review updated successfully' : 'Review created successfully');
        setShowModal(false);
        loadData();
      } else {
        toast.error(d.error || 'Failed to save review');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error saving review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (review) => {
    const nextStatus = review.status === 'published' ? 'hidden' : 'published';
    try {
      const r = await fetch(`/api/admin/reviews/${review.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (r.ok) {
        toast.success(`Review ${nextStatus === 'published' ? 'published' : 'hidden'}`);
        loadData();
      } else {
        toast.error('Failed to change review status');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error updating status');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this review permanently?')) return;
    try {
      const r = await fetch(`/api/admin/reviews/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (r.ok) {
        toast.success('Review deleted permanently');
        loadData();
      } else {
        toast.error('Failed to delete review');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error deleting review');
    }
  };

  // Summary statistics
  const totalReviews = reviews.length;
  const publishedCount = reviews.filter(r => r.status === 'published' || (r.status === undefined && r.approved !== false)).length;
  const hiddenCount = totalReviews - publishedCount;
  const avgRating = totalReviews > 0
    ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / totalReviews).toFixed(1)
    : '0.0';

  const getProductName = (pid) => {
    const found = products.find(p => p.id === pid || p.slug === pid);
    return found ? found.name : pid;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-2xl font-display font-semibold text-neutral-900 flex items-center gap-2">
            <MessageSquare className="text-[#9C6B30]" size={24} />
            Customer & Admin Reviews
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage customer reviews, toggle publication status, or manually publish curated admin reviews.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-[#9C6B30] text-white text-xs font-semibold uppercase tracking-wider px-5 py-2.5 rounded-lg transition shadow-sm"
        >
          <Plus size={16} />
          Add Review as Admin
        </button>
      </div>

      {/* Global Customer Reviews Setting Toggle */}
      <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-neutral-900">Customer Reviews</span>
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${customerReviewsEnabled ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-neutral-200 text-neutral-700 border border-neutral-300'}`}>
              {customerReviewsEnabled ? 'ON' : 'OFF'}
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            {customerReviewsEnabled
              ? 'ON → Customers can submit reviews after receiving eligible orders.'
              : 'OFF → Customer review functionality is completely disabled. Admin/backend reviews continue to work normally.'}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            disabled={togglingReviews}
            onClick={handleToggleCustomerReviews}
            aria-label="Toggle Customer Reviews"
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${customerReviewsEnabled ? 'bg-[#9C6B30]' : 'bg-neutral-300'}`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${customerReviewsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
          <span className="text-xs font-semibold text-neutral-700 w-8">
            {customerReviewsEnabled ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total Reviews</div>
          <div className="text-2xl font-bold text-neutral-900 mt-1">{totalReviews}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Average Rating</div>
          <div className="text-2xl font-bold text-[#D4AF37] mt-1 flex items-center gap-1.5">
            {avgRating} <Star size={20} className="fill-[#D4AF37] stroke-[#D4AF37]" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Published</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{publishedCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Hidden</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{hiddenCount}</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by reviewer, title, comment, product..."
              className="w-full pl-9 pr-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
            />
          </div>
          <button
            type="submit"
            className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold px-4 py-2 rounded-lg transition"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg">
            {['ALL', 'published', 'hidden'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition ${
                  statusFilter === st ? 'bg-white text-[#9C6B30] shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Product Filter */}
          <select
            value={productFilter}
            onChange={e => setProductFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-700 focus:outline-none focus:border-[#9C6B30] bg-white max-w-[200px]"
          >
            <option value="ALL">All Products</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <button
            onClick={loadData}
            title="Refresh list"
            className="p-2 border border-neutral-200 rounded-lg text-neutral-600 hover:text-[#9C6B30] hover:bg-neutral-50 transition"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="p-12 flex justify-center items-center bg-white rounded-xl border border-neutral-200">
          <Loader2 className="animate-spin text-[#9C6B30]" size={28} />
        </div>
      ) : reviews.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-neutral-200">
          <MessageSquare className="mx-auto text-neutral-300 mb-3" size={40} />
          <p className="text-base font-semibold text-neutral-700">No reviews found</p>
          <p className="text-xs text-neutral-400 mt-1">Try adjusting your search query or filters, or add a review manually.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(r => {
            const isPublished = r.status === 'published' || (r.status === undefined && r.approved !== false);
            return (
              <div
                key={r.id}
                className={`bg-white p-5 rounded-xl border transition ${
                  isPublished ? 'border-neutral-200 shadow-xs' : 'border-amber-200 bg-amber-50/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    {/* Header info */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-neutral-900 text-sm">{r.reviewerName || 'Customer'}</span>
                      {r.reviewerEmail && (
                        <span className="text-xs text-neutral-400">({r.reviewerEmail})</span>
                      )}
                      {r.verifiedPurchase && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                          <ShieldCheck size={12} /> Verified Buyer
                        </span>
                      )}
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isPublished ? 'Published' : 'Hidden'}
                      </span>
                    </div>

                    {/* Product & Stars */}
                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      <div className="flex items-center gap-0.5 text-[#D4AF37]">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            size={14}
                            className={star <= r.rating ? 'fill-[#D4AF37] stroke-[#D4AF37]' : 'text-neutral-300'}
                          />
                        ))}
                        <span className="font-bold ml-1 text-neutral-700">{r.rating}.0</span>
                      </div>
                      <span className="text-neutral-300">•</span>
                      <span className="font-medium text-[#9C6B30]">
                        Product: {getProductName(r.productId)}
                      </span>
                      <span className="text-neutral-300">•</span>
                      <span className="text-neutral-400">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                      </span>
                    </div>

                    {/* Review Title & Comment */}
                    {r.title && (
                      <h4 className="font-semibold text-neutral-900 text-sm mt-1">{r.title}</h4>
                    )}
                    <p className="text-sm text-neutral-600 leading-relaxed font-light">{r.comment}</p>

                    {/* Image Attachment */}
                    {Array.isArray(r.images) && r.images.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {r.images.map((imgUrl, idx) => (
                          <a key={idx} href={imgUrl} target="_blank" rel="noreferrer">
                            <img
                              src={imgUrl}
                              alt="Review attachment"
                              className="w-16 h-16 object-cover rounded-lg border border-neutral-200 hover:opacity-90 transition"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-start pt-1 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                    <button
                      onClick={() => handleToggleStatus(r)}
                      title={isPublished ? 'Hide review' : 'Publish review'}
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                        isPublished
                          ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {isPublished ? <EyeOff size={14} /> : <CheckCircle2 size={14} />}
                      {isPublished ? 'Hide' : 'Publish'}
                    </button>

                    <button
                      onClick={() => openEditModal(r)}
                      title="Edit review"
                      className="p-1.5 border border-neutral-200 rounded-lg text-neutral-600 hover:text-[#9C6B30] hover:bg-neutral-50 transition"
                    >
                      <Edit2 size={14} />
                    </button>

                    <button
                      onClick={() => handleDelete(r.id)}
                      title="Delete review"
                      className="p-1.5 border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Review Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h2 className="text-lg font-bold font-display text-neutral-900">
                {editingReview ? 'Edit Product Review' : 'Create Admin Review'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Target Product *
                </label>
                <select
                  value={form.productId}
                  onChange={e => setForm({ ...form, productId: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30] bg-white"
                  required
                >
                  <option value="">Select a Product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Reviewer Name *
                  </label>
                  <input
                    type="text"
                    value={form.reviewerName}
                    onChange={e => setForm({ ...form, reviewerName: e.target.value })}
                    placeholder="e.g. Ananya S."
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Reviewer Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={form.reviewerEmail}
                    onChange={e => setForm({ ...form, reviewerEmail: e.target.value })}
                    placeholder="customer@example.com"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                  />
                </div>
              </div>

              {/* Rating selection */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Rating Star (1 to 5) *
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setForm({ ...form, rating: star })}
                      className="p-1 hover:scale-110 transition"
                    >
                      <Star
                        size={24}
                        className={star <= form.rating ? 'fill-[#D4AF37] stroke-[#D4AF37]' : 'text-neutral-300'}
                      />
                    </button>
                  ))}
                  <span className="text-sm font-semibold text-neutral-700 ml-2">{form.rating} / 5</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Review Headline / Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Exquisite Craftsmanship & Brilliant Shine"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Review Comment *
                </label>
                <textarea
                  rows={4}
                  value={form.comment}
                  onChange={e => setForm({ ...form, comment: e.target.value })}
                  placeholder="Write the review content..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Product Photo / Attachment Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={form.image}
                  onChange={e => setForm({ ...form, image: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Publication Status
                  </label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-1.5 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-700 focus:outline-none focus:border-[#9C6B30] bg-white"
                  >
                    <option value="published">Published</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>

                <div className="flex items-center mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.verifiedPurchase}
                      onChange={e => setForm({ ...form, verifiedPurchase: e.target.checked })}
                      className="w-4 h-4 accent-[#9C6B30] rounded cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-neutral-700">Display Verified Buyer Badge</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-neutral-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#9C6B30] text-white text-xs font-semibold uppercase tracking-wider px-6 py-2 rounded-lg transition disabled:opacity-50"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {editingReview ? 'Update Review' : 'Create Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
