'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Star, Search, Plus, Filter, Trash2, Edit2, CheckCircle2, EyeOff, 
  Loader2, RefreshCw, X, Image as ImageIcon, MessageSquare, Check, ShieldCheck,
  CornerDownRight, ExternalLink, ArrowUpDown, CheckSquare, Square, Reply, ShieldAlert,
  Upload, Camera
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [productFilter, setProductFilter] = useState('ALL');
  const [ratingFilter, setRatingFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [repliedFilter, setRepliedFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');

  // Global setting
  const [customerReviewsEnabled, setCustomerReviewsEnabled] = useState(true);
  const [togglingReviews, setTogglingReviews] = useState(false);

  // Bulk Actions
  const [selectedReviews, setSelectedReviews] = useState(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Add / Edit Review Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    productId: '',
    reviewerName: '',
    reviewerEmail: '',
    orderNumber: '',
    rating: 5,
    title: '',
    comment: '',
    image: '',
    status: 'published',
    verifiedPurchase: true,
    adminReply: ''
  });

  // Store Reply Modal states
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyingReview, setReplyingReview] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [uploadingAdminPhoto, setUploadingAdminPhoto] = useState(false);
  const [adminPhotoInputMode, setAdminPhotoInputMode] = useState('upload'); // 'upload' | 'url'

  const handleAdminPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      toast.error('Please select a JPG, PNG, or WebP photo.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Photo size exceeds 10MB limit.');
      return;
    }

    setUploadingAdminPhoto(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: fd
      });
      const d = await res.json();
      if (res.ok && d.url) {
        setForm(prev => ({ ...prev, image: d.url }));
        toast.success('Photo uploaded successfully!');
      } else {
        toast.error(d.error || 'Photo upload failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Photo upload network error');
    } finally {
      setUploadingAdminPhoto(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);
      if (statusFilter !== 'ALL') queryParams.set('status', statusFilter);
      if (productFilter !== 'ALL') queryParams.set('productId', productFilter);
      if (ratingFilter !== 'ALL') queryParams.set('rating', ratingFilter);
      if (typeFilter !== 'ALL') queryParams.set('type', typeFilter);
      if (repliedFilter !== 'ALL') queryParams.set('replied', repliedFilter);
      if (sortBy) queryParams.set('sort', sortBy);

      const [resRev, resProd, resSettings] = await Promise.all([
        fetch(`/api/admin/reviews?${queryParams.toString()}`, { credentials: 'include', cache: 'no-store' }),
        fetch('/api/products', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/site-settings', { credentials: 'include', cache: 'no-store' })
      ]);

      if (resRev.ok) {
        const dataRev = await resRev.json();
        setReviews(dataRev.reviews || []);
        // Reset selection if reviews change
        setSelectedReviews(new Set());
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
      toast.error('Error loading reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, productFilter, ratingFilter, typeFilter, repliedFilter, sortBy]);

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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  // Toggle single review selection
  const toggleSelectReview = (id) => {
    setSelectedReviews(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select / Deselect all currently visible reviews
  const toggleSelectAll = () => {
    if (selectedReviews.size === reviews.length && reviews.length > 0) {
      setSelectedReviews(new Set());
    } else {
      setSelectedReviews(new Set(reviews.map(r => r.id)));
    }
  };

  // Execute bulk operations
  const handleBulkAction = async (action) => {
    if (selectedReviews.size === 0) return;
    const actionLabel = action === 'publish' ? 'publish' : (action === 'hide' ? 'hide' : 'permanently delete');
    if (action === 'delete' && !confirm(`Are you sure you want to delete ${selectedReviews.size} selected review(s)? This action cannot be undone.`)) {
      return;
    }

    setBulkActionLoading(true);
    try {
      const r = await fetch('/api/admin/reviews/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action,
          reviewIds: Array.from(selectedReviews)
        })
      });
      const d = await r.json();
      if (r.ok) {
        toast.success(`Successfully updated ${selectedReviews.size} review(s)`);
        setSelectedReviews(new Set());
        loadData();
      } else {
        toast.error(d.error || `Failed to ${actionLabel} reviews`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error executing bulk action');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Single review moderation toggles
  const handleToggleStatus = async (review) => {
    const isPub = review.status === 'published' || (review.status === undefined && review.approved !== false);
    const nextStatus = isPub ? 'hidden' : 'published';
    try {
      const r = await fetch(`/api/admin/reviews/${review.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (r.ok) {
        toast.success(`Review status changed to ${nextStatus.toUpperCase()}`);
        loadData();
      } else {
        toast.error('Failed to change review status');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error updating status');
    }
  };

  const handleToggleVerified = async (review) => {
    const nextVerified = !review.verifiedPurchase;
    try {
      const r = await fetch(`/api/admin/reviews/${review.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verifiedPurchase: nextVerified })
      });
      if (r.ok) {
        toast.success(`Verified badge ${nextVerified ? 'enabled' : 'disabled'}`);
        loadData();
      } else {
        toast.error('Failed to update verified badge');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error updating badge');
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

  // Add / Edit Modal
  const openAddModal = () => {
    setEditingReview(null);
    setForm({
      productId: products[0]?.id || 'p01',
      reviewerName: '',
      reviewerEmail: '',
      orderNumber: '',
      rating: 5,
      title: '',
      comment: '',
      image: '',
      status: 'published',
      verifiedPurchase: true,
      adminReply: ''
    });
    setShowModal(true);
  };

  const openEditModal = (review) => {
    setEditingReview(review);
    setForm({
      productId: review.productId || '',
      reviewerName: review.reviewerName || '',
      reviewerEmail: review.reviewerEmail || '',
      orderNumber: review.orderNumber || '',
      rating: review.rating || 5,
      title: review.title || '',
      comment: review.comment || '',
      image: Array.isArray(review.images) && review.images.length > 0 ? review.images[0] : (review.image || ''),
      status: review.status === 'hidden' ? 'hidden' : 'published',
      verifiedPurchase: review.verifiedPurchase ?? true,
      adminReply: typeof review.adminReply === 'object' ? (review.adminReply?.comment || '') : (review.adminReply || '')
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

  // Official Store Reply Modal Handlers
  const openReplyModal = (review) => {
    setReplyingReview(review);
    setReplyText(typeof review.adminReply === 'object' ? (review.adminReply?.comment || '') : (review.adminReply || ''));
    setShowReplyModal(true);
  };

  const handleSaveReply = async (e) => {
    e.preventDefault();
    if (!replyingReview) return;
    if (!replyText.trim()) return toast.error('Please enter a reply or click Delete Response');

    setSubmittingReply(true);
    try {
      const r = await fetch(`/api/admin/reviews/${replyingReview.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminReply: replyText.trim() })
      });
      if (r.ok) {
        toast.success('Atelier response published to review');
        setShowReplyModal(false);
        loadData();
      } else {
        toast.error('Failed to save reply');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error saving reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeleteReply = async () => {
    if (!replyingReview) return;
    if (!confirm('Are you sure you want to remove the store response from this review?')) return;
    setSubmittingReply(true);
    try {
      const r = await fetch(`/api/admin/reviews/${replyingReview.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminReply: null })
      });
      if (r.ok) {
        toast.success('Atelier response removed');
        setShowReplyModal(false);
        loadData();
      } else {
        toast.error('Failed to remove response');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error removing response');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Helper stats
  const totalReviews = reviews.length;
  const publishedCount = reviews.filter(r => r.status === 'published' || (r.status === undefined && r.approved !== false)).length;
  const hiddenCount = totalReviews - publishedCount;
  const customerCount = reviews.filter(r => r.orderId || r.orderNumber).length;
  const repliedCount = reviews.filter(r => r.adminReply && (typeof r.adminReply === 'string' ? r.adminReply.trim() : r.adminReply.comment)).length;
  const avgRating = totalReviews > 0
    ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / totalReviews).toFixed(1)
    : '0.0';

  const getProductName = (pid) => {
    const found = products.find(p => p.id === pid || p.slug === pid);
    return found ? found.name : pid;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-2xl font-display font-semibold text-neutral-900 flex items-center gap-2">
            <MessageSquare className="text-[#9C6B30]" size={26} />
            Reviews Management & Moderation
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Full control over customer reviews, orders verification, official atelier responses, and bulk moderation.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-[#9C6B30] text-white text-xs font-semibold uppercase tracking-wider px-5 py-2.5 rounded-lg transition shadow-xs cursor-pointer"
          >
            <Plus size={16} />
            Add Curated Review
          </button>
        </div>
      </div>

      {/* Global Customer Reviews Setting Toggle */}
      <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-neutral-900">Customer Reviews Portal</span>
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${customerReviewsEnabled ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-neutral-200 text-neutral-700 border border-neutral-300'}`}>
              {customerReviewsEnabled ? 'ACTIVE / ACCEPTING REVIEWS' : 'PAUSED'}
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            {customerReviewsEnabled
              ? 'ON: Customers can review items from delivered orders directly on their order page and account dashboard.'
              : 'OFF: Customer reviews are globally disabled. Customers cannot submit reviews.'}
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
          <span className="text-xs font-semibold text-neutral-700 w-12">
            {customerReviewsEnabled ? 'ENABLED' : 'PAUSED'}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
          <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Total Reviews</div>
          <div className="text-2xl font-bold text-neutral-900 mt-1">{totalReviews}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
          <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Average Rating</div>
          <div className="text-2xl font-bold text-[#D4AF37] mt-1 flex items-center gap-1.5">
            {avgRating} <Star size={18} className="fill-[#D4AF37] stroke-[#D4AF37]" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
          <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Published</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{publishedCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
          <div className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Hidden / Paused</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{hiddenCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs col-span-2 md:col-span-1">
          <div className="text-[11px] font-semibold text-[#9C6B30] uppercase tracking-wider">Store Replied</div>
          <div className="text-2xl font-bold text-[#9C6B30] mt-1">{repliedCount} / {totalReviews}</div>
        </div>
      </div>

      {/* Filters, Search & Bulk Operations */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-neutral-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by customer, order #, comment, product, title..."
                className="w-full pl-9 pr-3 py-2 border border-neutral-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#9C6B30]"
              />
            </div>
            <button
              type="submit"
              className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold px-4 py-2 rounded-lg transition cursor-pointer"
            >
              Search
            </button>
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); setTimeout(loadData, 50); }}
                className="text-xs text-neutral-400 hover:text-neutral-700"
              >
                Clear
              </button>
            )}
          </form>

          {/* Quick Refresh & Select All Controls */}
          <div className="flex items-center gap-3 flex-wrap justify-between sm:justify-end">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 hover:text-[#9C6B30] transition cursor-pointer"
            >
              {selectedReviews.size === reviews.length && reviews.length > 0 ? (
                <CheckSquare size={16} className="text-[#9C6B30]" />
              ) : (
                <Square size={16} className="text-neutral-400" />
              )}
              <span>{selectedReviews.size === reviews.length && reviews.length > 0 ? 'Deselect All' : 'Select All'}</span>
            </button>

            <button
              onClick={loadData}
              title="Refresh list"
              className="p-2 border border-neutral-200 rounded-lg text-neutral-600 hover:text-[#9C6B30] hover:bg-neutral-50 transition cursor-pointer"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Filter Badges Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-neutral-100">
          {/* Status Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 focus:outline-none focus:border-[#9C6B30] bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="published">Published Only</option>
              <option value="hidden">Hidden Only</option>
            </select>
          </div>

          {/* Rating Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-1">Rating</label>
            <select
              value={ratingFilter}
              onChange={e => setRatingFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 focus:outline-none focus:border-[#9C6B30] bg-white"
            >
              <option value="ALL">All Stars (1 - 5)</option>
              <option value="5">5 Stars Only</option>
              <option value="4">4 Stars Only</option>
              <option value="3">3 Stars Only</option>
              <option value="2">2 Stars Only</option>
              <option value="1">1 Star Only</option>
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-1">Source</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 focus:outline-none focus:border-[#9C6B30] bg-white"
            >
              <option value="ALL">All Sources</option>
              <option value="customer">Delivered Orders</option>
              <option value="admin">Curated / Admin</option>
            </select>
          </div>

          {/* Replied Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-1">Store Reply</label>
            <select
              value={repliedFilter}
              onChange={e => setRepliedFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 focus:outline-none focus:border-[#9C6B30] bg-white"
            >
              <option value="ALL">All Reviews</option>
              <option value="replied">Replied by Store</option>
              <option value="unreplied">Needs Store Reply</option>
            </select>
          </div>

          {/* Product Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-1">Product</label>
            <select
              value={productFilter}
              onChange={e => setProductFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 focus:outline-none focus:border-[#9C6B30] bg-white truncate"
            >
              <option value="ALL">All Products</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Sort Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 focus:outline-none focus:border-[#9C6B30] bg-white"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="rating_high">Highest Rating</option>
              <option value="rating_low">Lowest Rating</option>
            </select>
          </div>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedReviews.size > 0 && (
        <div className="sticky top-4 z-40 bg-[#1A1A1A] text-white p-3 sm:px-6 rounded-xl shadow-xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#9C6B30] animate-pulse" />
            <span className="text-xs sm:text-sm font-semibold">
              {selectedReviews.size} review{selectedReviews.size > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              disabled={bulkActionLoading}
              onClick={() => handleBulkAction('publish')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold uppercase tracking-wider rounded-md transition cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 size={13} /> Bulk Publish
            </button>
            <button
              disabled={bulkActionLoading}
              onClick={() => handleBulkAction('hide')}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold uppercase tracking-wider rounded-md transition cursor-pointer flex items-center gap-1.5"
            >
              <EyeOff size={13} /> Bulk Hide
            </button>
            <button
              disabled={bulkActionLoading}
              onClick={() => handleBulkAction('delete')}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold uppercase tracking-wider rounded-md transition cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 size={13} /> Bulk Delete
            </button>
            <button
              disabled={bulkActionLoading}
              onClick={() => setSelectedReviews(new Set())}
              className="text-xs text-neutral-400 hover:text-white px-2 py-1 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="p-12 flex justify-center items-center bg-white rounded-xl border border-neutral-200">
          <Loader2 className="animate-spin text-[#9C6B30]" size={28} />
        </div>
      ) : reviews.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-neutral-200">
          <MessageSquare className="mx-auto text-neutral-300 mb-3" size={40} />
          <p className="text-base font-semibold text-neutral-700">No reviews found matching criteria</p>
          <p className="text-xs text-neutral-400 mt-1">Try changing your filters, search term, or create a curated review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(r => {
            const isPublished = r.status === 'published' || (r.status === undefined && r.approved !== false);
            const isSelected = selectedReviews.has(r.id);
            const hasReply = Boolean(r.adminReply && (typeof r.adminReply === 'string' ? r.adminReply.trim() : r.adminReply.comment));

            return (
              <div
                key={r.id}
                className={`bg-white p-4 sm:p-5 rounded-xl border transition relative ${
                  isSelected ? 'ring-2 ring-[#9C6B30] border-[#9C6B30]' : (isPublished ? 'border-neutral-200 shadow-xs' : 'border-amber-200 bg-amber-50/20')
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Selection Checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleSelectReview(r.id)}
                    className="mt-0.5 p-1 text-neutral-400 hover:text-[#9C6B30] transition cursor-pointer self-start"
                  >
                    {isSelected ? (
                      <CheckSquare size={18} className="text-[#9C6B30]" />
                    ) : (
                      <Square size={18} className="text-neutral-300 hover:text-neutral-500" />
                    )}
                  </button>

                  <div className="space-y-2 flex-1 min-w-0">
                    {/* Header info */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-neutral-900 text-sm">{r.reviewerName || 'Customer'}</span>
                      {r.reviewerEmail && (
                        <span className="text-xs text-neutral-400">({r.reviewerEmail})</span>
                      )}

                      {/* Order Association Link */}
                      {r.orderNumber ? (
                        <Link
                          href={`/admin/orders?search=${encodeURIComponent(r.orderNumber)}`}
                          className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full font-semibold hover:underline"
                        >
                          <ExternalLink size={10} /> Order #{r.orderNumber}
                        </Link>
                      ) : (r.orderId ? (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full font-semibold">
                          Delivered Order
                        </span>
                      ) : (
                        <span className="text-[10px] bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full font-semibold">
                          Admin / Curated
                        </span>
                      ))}

                      {/* Verified Purchase Toggle Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleVerified(r)}
                        title="Click to toggle Verified Buyer badge"
                        className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold border transition cursor-pointer ${
                          r.verifiedPurchase
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-neutral-100 text-neutral-500 border-neutral-200 hover:bg-neutral-200'
                        }`}
                      >
                        <ShieldCheck size={11} className={r.verifiedPurchase ? 'text-emerald-600' : 'text-neutral-400'} />
                        {r.verifiedPurchase ? 'Verified Buyer' : 'Unverified'}
                      </button>

                      {/* Status Badge */}
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isPublished ? 'Published' : 'Hidden'}
                      </span>

                      {hasReply && (
                        <span className="text-[10px] bg-[#FAF6EF] text-[#9C6B30] border border-[#9C6B30]/30 px-2 py-0.5 rounded-full font-semibold">
                          Store Replied
                        </span>
                      )}
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
                        <span className="font-bold ml-1 text-neutral-700">{r.rating}.0 / 5</span>
                      </div>
                      <span className="text-neutral-300">•</span>
                      <Link
                        href={`/product/${r.productSlug || r.productId}`}
                        target="_blank"
                        className="font-medium text-[#9C6B30] hover:underline flex items-center gap-1"
                      >
                        Product: {r.productName || getProductName(r.productId)} <ExternalLink size={11} />
                      </Link>
                      <span className="text-neutral-300">•</span>
                      <span className="text-neutral-400">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                      </span>
                    </div>

                    {/* Review Title & Comment */}
                    {r.title && (
                      <h4 className="font-semibold text-neutral-900 text-sm mt-1">{r.title}</h4>
                    )}
                    <p className="text-sm text-neutral-700 leading-relaxed font-light">{r.comment}</p>

                    {/* Image Attachment */}
                    {Array.isArray(r.images) && r.images.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {r.images.map((imgUrl, idx) => (
                          <a key={idx} href={imgUrl} target="_blank" rel="noreferrer">
                            <img
                              src={imgUrl}
                              alt="Review attachment"
                              className="w-14 h-14 object-cover rounded-lg border border-neutral-200 hover:opacity-90 transition"
                            />
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Store / Atelier Response */}
                    {hasReply && (
                      <div className="mt-3 p-3 bg-[#FAF6EF]/70 border-l-2 border-[#9C6B30] rounded-r-lg text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#9C6B30] flex items-center gap-1.5">
                            <Reply size={12} className="rotate-180" /> Response from {typeof r.adminReply === 'object' ? (r.adminReply.repliedBy || 'MikuMantra Atelier') : 'MikuMantra Atelier'}
                          </span>
                          <button
                            type="button"
                            onClick={() => openReplyModal(r)}
                            className="text-[11px] text-[#9C6B30] hover:underline cursor-pointer"
                          >
                            Edit Reply
                          </button>
                        </div>
                        <p className="text-neutral-700 italic">
                          &ldquo;{typeof r.adminReply === 'object' ? r.adminReply.comment : r.adminReply}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="flex sm:flex-col items-center gap-2 self-start pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100 shrink-0">
                    <button
                      onClick={() => handleToggleStatus(r)}
                      title={isPublished ? 'Hide review from store' : 'Publish review to store'}
                      className={`inline-flex items-center justify-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border transition cursor-pointer w-full ${
                        isPublished
                          ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {isPublished ? <EyeOff size={13} /> : <CheckCircle2 size={13} />}
                      <span>{isPublished ? 'Hide' : 'Publish'}</span>
                    </button>

                    <button
                      onClick={() => openReplyModal(r)}
                      title={hasReply ? 'Edit Atelier Reply' : 'Add Atelier Reply'}
                      className="inline-flex items-center justify-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-[#E8E8E8] text-neutral-700 hover:text-[#9C6B30] hover:bg-neutral-50 transition cursor-pointer w-full"
                    >
                      <Reply size={13} />
                      <span>{hasReply ? 'Reply' : 'Add Reply'}</span>
                    </button>

                    <button
                      onClick={() => openEditModal(r)}
                      title="Edit full review details"
                      className="inline-flex items-center justify-center gap-1 text-xs font-medium px-3 py-1.5 border border-neutral-200 rounded-lg text-neutral-600 hover:text-[#9C6B30] hover:bg-neutral-50 transition cursor-pointer w-full"
                    >
                      <Edit2 size={13} />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDelete(r.id)}
                      title="Permanently delete review"
                      className="inline-flex items-center justify-center gap-1 text-xs font-medium p-1.5 border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition cursor-pointer"
                    >
                      <Trash2 size={13} />
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
                {editingReview ? 'Edit Full Review Details' : 'Create Curated Admin Review'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg transition cursor-pointer"
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
                    <option key={p.id} value={p.id}>{p.name} ({p.sku || p.id})</option>
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

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Associated Order Number (Optional)
                </label>
                <input
                  type="text"
                  value={form.orderNumber}
                  onChange={e => setForm({ ...form, orderNumber: e.target.value })}
                  placeholder="e.g. MIK-85084244-475"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
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
                      className="p-1 hover:scale-110 transition cursor-pointer"
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

              {/* Photo Upload & Preview Section */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera size={13} className="text-[#9C6B30]" /> Product Photo (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setAdminPhotoInputMode(adminPhotoInputMode === 'upload' ? 'url' : 'upload')}
                    className="text-[10px] text-[#9C6B30] hover:underline font-semibold cursor-pointer"
                  >
                    {adminPhotoInputMode === 'upload' ? 'Paste image URL' : 'Upload local file'}
                  </button>
                </div>

                {form.image ? (
                  <div className="flex items-center gap-3 p-3 bg-[#FAF6EF]/60 border border-neutral-200 rounded-xl">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#9C6B30]/30 shrink-0 bg-neutral-100 shadow-xs">
                      <img
                        src={form.image}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-neutral-800 flex items-center gap-1">
                        <Check size={13} className="text-emerald-600" /> Photo attached
                      </div>
                      <p className="text-[10px] text-neutral-500 truncate mt-0.5 max-w-[240px] font-mono">
                        {form.image}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <label className="text-[10px] font-semibold text-[#9C6B30] hover:underline cursor-pointer">
                          Change photo
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/jpg"
                            onChange={handleAdminPhotoUpload}
                            className="hidden"
                          />
                        </label>
                        <span className="text-neutral-300">·</span>
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, image: '' }))}
                          className="text-[10px] font-semibold text-red-600 hover:text-red-700 cursor-pointer"
                        >
                          Remove photo
                        </button>
                      </div>
                    </div>
                  </div>
                ) : adminPhotoInputMode === 'upload' ? (
                  <div>
                    <label
                      className={`flex flex-col items-center justify-center border-2 border-dashed border-neutral-200 rounded-xl p-4 text-center cursor-pointer transition-all bg-white hover:bg-[#FAF6EF]/40 hover:border-[#9C6B30] ${
                        uploadingAdminPhoto ? 'opacity-60 pointer-events-none' : ''
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        onChange={handleAdminPhotoUpload}
                        className="hidden"
                      />
                      {uploadingAdminPhoto ? (
                        <div className="py-2 flex flex-col items-center gap-1.5">
                          <Loader2 size={20} className="animate-spin text-[#9C6B30]" />
                          <span className="text-xs text-neutral-600 font-medium">Uploading photo...</span>
                        </div>
                      ) : (
                        <div className="py-1 flex flex-col items-center gap-1">
                          <div className="w-8 h-8 rounded-full bg-[#FAF6EF] flex items-center justify-center text-[#9C6B30] mb-0.5">
                            <Upload size={15} />
                          </div>
                          <span className="text-xs font-semibold text-neutral-800">
                            Upload photo locally from computer
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            Click to select JPG, PNG, or WebP (up to 10MB)
                          </span>
                        </div>
                      )}
                    </label>
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      value={form.image}
                      onChange={e => setForm({ ...form, image: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                    />
                    <p className="text-[10px] text-neutral-400 mt-1">
                      Paste a direct image link for this review.
                    </p>
                  </div>
                )}
              </div>

              {/* Official Store Reply inside edit modal */}
              <div>
                <label className="block text-xs font-bold text-[#9C6B30] uppercase tracking-wider mb-1">
                  Official Atelier / Store Response (Optional)
                </label>
                <textarea
                  rows={2}
                  value={form.adminReply}
                  onChange={e => setForm({ ...form, adminReply: e.target.value })}
                  placeholder="e.g. Thank you for your review! We are delighted that you love the brilliant clarity..."
                  className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg text-sm focus:outline-none focus:border-[#9C6B30] bg-[#FAF6EF]/40"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-50 p-3.5 rounded-lg border border-neutral-200">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Publication Status
                  </label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-1.5 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-700 focus:outline-none focus:border-[#9C6B30] bg-white"
                  >
                    <option value="published">Published (Visible on site)</option>
                    <option value="hidden">Hidden (Paused from store)</option>
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
                  className="px-4 py-2 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#9C6B30] text-white text-xs font-semibold uppercase tracking-wider px-6 py-2 rounded-lg transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {editingReview ? 'Update Review' : 'Create Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Atelier Response Modal */}
      {showReplyModal && replyingReview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-lg font-bold font-display text-neutral-900 flex items-center gap-2">
                  <Reply size={18} className="text-[#9C6B30]" /> Official Store Response
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Reply to {replyingReview.reviewerName || 'Customer'} on {replyingReview.productName || getProductName(replyingReview.productId)}
                </p>
              </div>
              <button
                onClick={() => setShowReplyModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Customer review summary */}
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs space-y-1">
              <div className="flex items-center gap-1 text-[#D4AF37]">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} size={12} className={s <= replyingReview.rating ? 'fill-[#D4AF37] stroke-[#D4AF37]' : 'text-neutral-300'} />
                ))}
                <span className="text-neutral-700 font-semibold ml-1">{replyingReview.rating}.0 / 5</span>
              </div>
              {replyingReview.title && <div className="font-semibold text-neutral-900">{replyingReview.title}</div>}
              <p className="text-neutral-600 italic leading-relaxed">&ldquo;{replyingReview.comment}&rdquo;</p>
            </div>

            <form onSubmit={handleSaveReply} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#9C6B30] uppercase tracking-wider mb-1">
                  Atelier / Store Reply Message *
                </label>
                <textarea
                  rows={4}
                  required
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Thank you for sharing your experience with our atelier. We take immense pride in handcrafted fine jewellery..."
                  className="w-full px-3 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-neutral-100 pt-3">
                {replyingReview.adminReply ? (
                  <button
                    type="button"
                    disabled={submittingReply}
                    onClick={handleDeleteReply}
                    className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                  >
                    <Trash2 size={13} /> Remove Response
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={submittingReply}
                    onClick={() => setShowReplyModal(false)}
                    className="px-4 py-2 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReply}
                    className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#9C6B30] text-white text-xs font-semibold uppercase tracking-wider px-5 py-2 rounded-lg transition disabled:opacity-50 cursor-pointer"
                  >
                    {submittingReply && <Loader2 size={13} className="animate-spin" />}
                    Publish Response
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
