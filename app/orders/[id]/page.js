'use client';
import { useEffect, useState, Suspense, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, authFetch } from '@/lib/use-auth';
import { formatINR, formatRating } from '@/lib/products';
import { CheckCircle2, Package, Truck, Home, Loader2, Download, Clock, X, AlertTriangle, RotateCcw, AlertCircle, Check, ArrowLeft, Star, Edit3, Trash2, Upload, Camera, Image as ImageIcon, Building2, Smartphone, ShieldCheck, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { getCancellationLabel, getCancellationActor } from '@/lib/utils';

const STEPS = [
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'packed', label: 'Packed', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Home },
];

const CANCELLATION_REASONS = [
  'Changed my mind',
  'Ordered by mistake',
  'Product no longer required',
  'Found a better product',
  'Delivery taking too long',
  'Other'
];

const RETURN_REASONS = [
  'Defective or damaged item',
  'Wrong item delivered',
  'Quality issue',
  'Item not as pictured / described',
  'Size or fit issue',
  'Changed my mind',
  'Other'
];

function getReturnStatusBadge(status) {
  switch (status) {
    case 'REQUESTED':
    case 'RETURN_REQUESTED':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'APPROVED':
    case 'RETURN_APPROVED':
      return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'REFUND_DETAILS_SUBMITTED':
      return 'bg-teal-50 text-teal-800 border-teal-200';
    case 'PROCESSING':
      return 'bg-purple-50 text-purple-800 border-purple-200';
    case 'REFUND_INITIATED':
      return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    case 'REFUNDED':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'REJECTED':
      return 'bg-red-50 text-red-800 border-red-200';
    default:
      return 'bg-neutral-100 text-neutral-800 border-neutral-200';
  }
}

function getReturnStatusLabel(status, hasRefundDetails = false) {
  switch (status) {
    case 'REQUESTED':
    case 'RETURN_REQUESTED':
      return 'Return Requested (Awaiting Approval)';
    case 'APPROVED':
    case 'RETURN_APPROVED':
      return hasRefundDetails ? 'Return Approved (Processing Refund)' : 'Return Approved (Action Required: Submit Refund Details)';
    case 'REFUND_DETAILS_SUBMITTED':
      return 'Refund Details Submitted (In Progress)';
    case 'PROCESSING':
      return 'Return In Processing';
    case 'REFUND_INITIATED':
      return 'Refund Initiated';
    case 'REFUNDED':
      return 'Refund Completed';
    case 'REJECTED':
      return 'Return Rejected';
    default:
      return status;
  }
}

function OrderInner() {
  const { id } = useParams();
  const sp = useSearchParams();
  const success = sp.get('success') === '1';
  const actionParam = sp.get('action');
  const itemIdParam = sp.get('itemId');

  const [order, setOrder] = useState(null);
  const [returnRequest, setReturnRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Reviews State
  const [orderReviews, setOrderReviews] = useState([]);
  const [customerReviewsEnabled, setCustomerReviewsEnabled] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTargetItem, setReviewTargetItem] = useState(null);
  const [existingReview, setExistingReview] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '', image: '' });
  const [hoverRating, setHoverRating] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [deletingReview, setDeletingReview] = useState(false);
  const [reviewModalErr, setReviewModalErr] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoInputMode, setPhotoInputMode] = useState('upload'); // 'upload' | 'url'

  const autoOpenedReviewRef = useRef(false);
  const autoOpenedReturnRef = useRef(false);

  const closeReviewModal = () => {
    setShowReviewModal(false);
    setReviewTargetItem(null);
    setReviewModalErr('');
    autoOpenedReviewRef.current = true;
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('action') || url.searchParams.has('itemId')) {
          url.searchParams.delete('action');
          url.searchParams.delete('itemId');
          window.history.replaceState(null, '', url.pathname + (url.search ? url.search : ''));
        }
      } catch (e) {
        console.error('Error cleaning up URL on review modal close:', e);
      }
    }
  };

  const closeReturnModal = () => {
    setShowReturnModal(false);
    setReturnModalErr('');
    autoOpenedReturnRef.current = true;
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('action')) {
          url.searchParams.delete('action');
          window.history.replaceState(null, '', url.pathname + (url.search ? url.search : ''));
        }
      } catch (e) {
        console.error('Error cleaning up URL on return modal close:', e);
      }
    }
  };

  // Live timer ticker for 30-minute return countdown
  const [nowTime, setNowTime] = useState(Date.now());

  // Cancellation Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelStep, setCancelStep] = useState(1);
  const [selectedReason, setSelectedReason] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [modalErr, setModalErr] = useState('');

  // Return Modal State
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnStep, setReturnStep] = useState(1);
  const [returnItems, setReturnItems] = useState({});
  const [selectedReturnReason, setSelectedReturnReason] = useState('');
  const [returnComment, setReturnComment] = useState('');
  const [returnImages, setReturnImages] = useState([]);
  const [uploadingReturnPhoto, setUploadingReturnPhoto] = useState(false);
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [returnModalErr, setReturnModalErr] = useState('');

  // Refund Details Form State (After Return Approval)
  const [refundMethod, setRefundMethod] = useState('upi'); // 'upi' | 'bank_transfer'
  const [refundUpiForm, setRefundUpiForm] = useState({ upiId: '', confirmUpiId: '' });
  const [refundBankForm, setRefundBankForm] = useState({
    accountHolderName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    bankName: ''
  });
  const [submittingRefundDetails, setSubmittingRefundDetails] = useState(false);
  const [refundDetailsErr, setRefundDetailsErr] = useState('');

  // 1-second ticker when order is delivered
  useEffect(() => {
    if (order?.status === 'delivered') {
      const interval = setInterval(() => {
        setNowTime(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [order?.status]);

  const openCancelModal = () => {
    setSelectedReason('');
    setCustomNote('');
    setCancelStep(1);
    setModalErr('');
    setShowCancelModal(true);
  };

  const handleReasonSubmit = (e) => {
    e.preventDefault();
    if (!selectedReason) {
      setModalErr('Please select a reason for cancellation.');
      return;
    }
    if (selectedReason === 'Other' && !customNote.trim()) {
      setModalErr('Please enter your reason for cancellation.');
      return;
    }
    setModalErr('');
    setCancelStep(2);
  };

  const handleConfirmCancel = async () => {
    if (cancelling) return;
    setCancelling(true);
    setModalErr('');

    try {
      const r = await authFetch(`/api/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: selectedReason,
          note: customNote.trim()
        })
      });
      const d = await r.json();
      if (r.ok && d.order) {
        setOrder(d.order);
        setShowCancelModal(false);
        toast.success('Order cancelled successfully.');
      } else {
        setModalErr(d.error || 'Unable to cancel the order right now. Please try again.');
        toast.error(d.error || 'Cancellation failed');
        try {
          const rRefresh = await authFetch(`/api/orders/${order.id}`);
          if (rRefresh.ok) {
            const dRefresh = await rRefresh.json();
            if (dRefresh?.order) {
              setOrder(dRefresh.order);
              if (dRefresh.order.status === 'cancelled') {
                setShowCancelModal(false);
              }
            }
          }
        } catch (_) {}
      }
    } catch (err) {
      console.error(err);
      setModalErr('Unable to cancel the order right now. Please try again.');
      toast.error('Network error');
    } finally {
      setCancelling(false);
    }
  };

  // Return Flow Handlers
  const openReturnModal = () => {
    if (!order) return;
    const initialItems = {};
    (order.items || []).forEach(it => {
      initialItems[it.id] = { selected: true, qty: it.qty, maxQty: it.qty };
    });
    setReturnItems(initialItems);
    setSelectedReturnReason(RETURN_REASONS[0]);
    setReturnComment('');
    setReturnImages([]);
    setUploadingReturnPhoto(false);
    setReturnStep(1);
    setReturnModalErr('');
    setShowReturnModal(true);
  };

  const handleReturnPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      setReturnModalErr('Please select a JPG, PNG, or WebP photo.');
      toast.error('Invalid photo format');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setReturnModalErr('Photo size exceeds 8MB. Please choose a smaller image.');
      toast.error('Photo size exceeds 8MB');
      return;
    }

    if (returnImages.length >= 5) {
      setReturnModalErr('Maximum of 5 product photos allowed.');
      toast.error('Maximum 5 photos allowed');
      return;
    }

    setUploadingReturnPhoto(true);
    setReturnModalErr('');

    try {
      const fd = new FormData();
      fd.append('file', file);

      const r = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: fd
      });

      const d = await r.json();
      if (r.ok && d.url) {
        setReturnImages(prev => [...prev, d.url]);
        toast.success('Product photo uploaded successfully!');
      } else {
        setReturnModalErr(d.error || 'Failed to upload photo. Please try again.');
        toast.error(d.error || 'Photo upload failed');
      }
    } catch (err) {
      console.error(err);
      setReturnModalErr('Network error during photo upload.');
      toast.error('Photo upload error');
    } finally {
      setUploadingReturnPhoto(false);
      e.target.value = '';
    }
  };

  const handleRemoveReturnPhoto = (idxToRemove) => {
    setReturnImages(prev => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleItemToggle = (itemId) => {
    setReturnItems(prev => {
      const cur = prev[itemId] || { selected: false, qty: 1, maxQty: 1 };
      return {
        ...prev,
        [itemId]: { ...cur, selected: !cur.selected }
      };
    });
  };

  const handleQtyChange = (itemId, change) => {
    setReturnItems(prev => {
      const cur = prev[itemId];
      if (!cur) return prev;
      const newQty = Math.max(1, Math.min(cur.maxQty, cur.qty + change));
      return {
        ...prev,
        [itemId]: { ...cur, qty: newQty }
      };
    });
  };

  // Live estimated refund calculation matching calculateReturnRefund backend logic
  const calculateEstimatedRefund = () => {
    if (!order || !order.items) return 0;
    const orderSubtotal = Math.max(1, order.amounts?.subtotal || 1);
    const orderDiscount = Math.max(0, order.amounts?.discount || 0);
    let total = 0;

    for (const it of order.items) {
      const entry = returnItems[it.id];
      if (entry?.selected && entry.qty > 0) {
        const itemSubtotal = (it.price || 0) * entry.qty;
        const itemDiscount = Math.round(itemSubtotal * (orderDiscount / orderSubtotal));
        const net = Math.max(0, itemSubtotal - itemDiscount);
        const tax = Math.round(net * 0.03);
        total += (net + tax);
      }
    }
    return total;
  };

  const handleReturnReviewSubmit = (e) => {
    e.preventDefault();
    const selectedList = Object.entries(returnItems)
      .filter(([_, val]) => val.selected && val.qty > 0);

    if (selectedList.length === 0) {
      setReturnModalErr('Please select at least one item to return.');
      return;
    }
    if (!selectedReturnReason) {
      setReturnModalErr('Please select a return reason.');
      return;
    }
    if (selectedReturnReason === 'Other' && !returnComment.trim()) {
      setReturnModalErr('Please explain your reason for returning.');
      return;
    }

    setReturnModalErr('');
    setReturnStep(2);
  };

  const handleConfirmReturn = async () => {
    if (submittingReturn) return;
    const selectedList = Object.entries(returnItems)
      .filter(([_, val]) => val.selected && val.qty > 0)
      .map(([id, val]) => ({ id, returnQty: val.qty }));

    if (selectedList.length === 0) {
      setReturnModalErr('Please select at least one item to return.');
      return;
    }

    setSubmittingReturn(true);
    setReturnModalErr('');

    try {
      const r = await authFetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          items: selectedList,
          reason: selectedReturnReason,
          comment: returnComment.trim(),
          images: returnImages
        })
      });
      const d = await r.json();
      if (r.ok && d.return) {
        setReturnRequest(d.return);
        closeReturnModal();
        toast.success('Return request submitted successfully. We will review it shortly.');
        const rOrder = await authFetch(`/api/orders/${order.id}`);
        const dOrder = await rOrder.json();
        if (rOrder.ok && dOrder.order) {
          setOrder(dOrder.order);
        }
      } else {
        setReturnModalErr(d.error || 'Failed to submit return request. Please try again.');
        toast.error(d.error || 'Return request failed');
      }
    } catch (err) {
      console.error(err);
      setReturnModalErr('Network error. Please try again.');
      toast.error('Network error');
    } finally {
      setSubmittingReturn(false);
    }
  };

  const handleSubmitRefundDetails = async (e) => {
    e.preventDefault();
    setRefundDetailsErr('');

    if (!returnRequest) return;

    if (refundMethod === 'upi') {
      const uId = refundUpiForm.upiId.trim();
      const cUId = refundUpiForm.confirmUpiId.trim();
      if (!uId) {
        setRefundDetailsErr('Please enter your UPI ID.');
        return;
      }
      const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
      if (!upiRegex.test(uId)) {
        setRefundDetailsErr('Please enter a valid UPI ID (e.g. name@okhdfcbank or 9876543210@paytm).');
        return;
      }
      if (cUId && cUId.toLowerCase() !== uId.toLowerCase()) {
        setRefundDetailsErr('UPI ID and Confirm UPI ID do not match.');
        return;
      }
    } else if (refundMethod === 'bank_transfer') {
      const holder = refundBankForm.accountHolderName.trim();
      const acc = refundBankForm.accountNumber.trim();
      const cAcc = refundBankForm.confirmAccountNumber.trim();
      const ifsc = refundBankForm.ifscCode.trim().toUpperCase();
      const bank = refundBankForm.bankName.trim();

      if (!holder || holder.length < 2) {
        setRefundDetailsErr('Please enter the full account holder name.');
        return;
      }
      if (!acc || !/^\d{9,18}$/.test(acc)) {
        setRefundDetailsErr('Please enter a valid bank account number (9 to 18 digits).');
        return;
      }
      if (cAcc !== acc) {
        setRefundDetailsErr('Account number and Confirm Account number do not match.');
        return;
      }
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifsc || !ifscRegex.test(ifsc)) {
        setRefundDetailsErr('Please enter a valid 11-character IFSC code (e.g. HDFC0001234).');
        return;
      }
      if (!bank || bank.length < 2) {
        setRefundDetailsErr('Please enter the bank name.');
        return;
      }
    }

    setSubmittingRefundDetails(true);
    try {
      const returnId = returnRequest.returnId || returnRequest.id;
      const payload = refundMethod === 'upi'
        ? { method: 'upi', upiId: refundUpiForm.upiId.trim(), confirmUpiId: refundUpiForm.confirmUpiId.trim() }
        : {
            method: 'bank_transfer',
            accountHolderName: refundBankForm.accountHolderName.trim(),
            accountNumber: refundBankForm.accountNumber.trim(),
            confirmAccountNumber: refundBankForm.confirmAccountNumber.trim(),
            ifscCode: refundBankForm.ifscCode.trim().toUpperCase(),
            bankName: refundBankForm.bankName.trim()
          };

      const r = await authFetch(`/api/returns/${returnId}/refund-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const d = await r.json();
      if (r.ok && d.return) {
        setReturnRequest(d.return);
        toast.success(d.message || 'Refund details submitted successfully. Your return will now proceed.');
        const rOrder = await authFetch(`/api/orders/${order.id}`);
        const dOrder = await rOrder.json();
        if (rOrder.ok && dOrder.order) {
          setOrder(dOrder.order);
        }
      } else {
        setRefundDetailsErr(d.error || 'Failed to submit refund details. Please try again.');
        toast.error(d.error || 'Submission failed');
      }
    } catch (err) {
      console.error(err);
      setRefundDetailsErr('Network error submitting refund details.');
      toast.error('Network error');
    } finally {
      setSubmittingRefundDetails(false);
    }
  };

  // Customer Reviews Handlers
  const openReviewModal = (item) => {
    setReviewTargetItem(item);
    const existing = orderReviews.find(r => r.productId === item.id || r.productSlug === item.slug);
    setExistingReview(existing || null);
    if (existing) {
      setReviewForm({
        rating: existing.rating || 5,
        title: existing.title || '',
        comment: existing.comment || '',
        image: Array.isArray(existing.images) && existing.images.length > 0 ? existing.images[0] : (existing.image || '')
      });
    } else {
      setReviewForm({
        rating: 5,
        title: '',
        comment: '',
        image: ''
      });
    }
    setHoverRating(0);
    setReviewModalErr('');
    setPhotoInputMode('upload');
    setShowReviewModal(true);
  };

  const handleLocalPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again if needed
    e.target.value = '';

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setReviewModalErr('Please select a JPG, PNG, or WebP photo.');
      toast.error('Invalid photo format');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setReviewModalErr('Photo size exceeds 8MB. Please choose a smaller image.');
      toast.error('Photo size exceeds 8MB');
      return;
    }

    setUploadingPhoto(true);
    setReviewModalErr('');

    try {
      const fd = new FormData();
      fd.append('file', file);

      const r = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: fd
      });

      const d = await r.json();
      if (r.ok && d.url) {
        setReviewForm(prev => ({ ...prev, image: d.url }));
        toast.success('Photo uploaded and attached successfully!');
      } else {
        setReviewModalErr(d.error || 'Failed to upload photo. Please try again.');
        toast.error(d.error || 'Photo upload failed');
      }
    } catch (err) {
      console.error(err);
      setReviewModalErr('Network error during photo upload.');
      toast.error('Photo upload error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!customerReviewsEnabled) {
      setReviewModalErr('Customer reviews are currently disabled.');
      return;
    }
    if (!reviewForm.comment.trim()) {
      setReviewModalErr('Please share a few words about your experience.');
      return;
    }

    setSubmittingReview(true);
    setReviewModalErr('');

    try {
      if (existingReview) {
        // Update existing review
        const r = await authFetch(`/api/reviews/${existingReview.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rating: reviewForm.rating,
            title: reviewForm.title.trim(),
            comment: reviewForm.comment.trim(),
            image: reviewForm.image.trim()
          })
        });
        const d = await r.json();
        if (r.ok && d.review) {
          toast.success('Your review has been updated!');
          setOrderReviews(prev => prev.map(rev => rev.id === existingReview.id ? d.review : rev));
          closeReviewModal();
        } else {
          setReviewModalErr(d.error || 'Failed to update review.');
          toast.error(d.error || 'Review update failed');
        }
      } else {
        // Create new review
        const r = await authFetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: reviewTargetItem.id || reviewTargetItem.slug,
            productSlug: reviewTargetItem.slug,
            orderId: order.id,
            orderNumber: order.orderNumber,
            rating: reviewForm.rating,
            title: reviewForm.title.trim(),
            comment: reviewForm.comment.trim(),
            image: reviewForm.image.trim()
          })
        });
        const d = await r.json();
        if (r.ok && d.review) {
          toast.success('Thank you! Your review has been submitted.');
          setOrderReviews(prev => [...prev, d.review]);
          closeReviewModal();
        } else {
          setReviewModalErr(d.error || 'Failed to submit review.');
          toast.error(d.error || 'Review submission failed');
        }
      }
    } catch (err) {
      console.error(err);
      setReviewModalErr('Network error. Please try again.');
      toast.error('Network error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!existingReview || deletingReview) return;
    if (!confirm('Are you sure you want to delete your review?')) return;
    setDeletingReview(true);
    try {
      const r = await authFetch(`/api/reviews/${existingReview.id}`, {
        method: 'DELETE'
      });
      if (r.ok) {
        toast.success('Review deleted successfully');
        setOrderReviews(prev => prev.filter(rev => rev.id !== existingReview.id));
        closeReviewModal();
      } else {
        const d = await r.json().catch(() => ({}));
        setReviewModalErr(d.error || 'Failed to delete review');
        toast.error(d.error || 'Failed to delete review');
      }
    } catch (err) {
      console.error(err);
      setReviewModalErr('Network error. Please try again.');
      toast.error('Network error');
    } finally {
      setDeletingReview(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?redirect=/orders/${id}`);
    }
  }, [user, authLoading, id, router]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const r = await authFetch(`/api/orders/${id}`);
        const d = await r.json();
        if (r.ok) {
          setOrder(d.order);
          setReturnRequest(d.returnRequest || null);
          setOrderReviews(d.reviews || []);
          setCustomerReviewsEnabled(d.customerReviewsEnabled ?? true);
        } else {
          if (r.status === 401) {
            router.push(`/login?redirect=/orders/${id}`);
          } else if (r.status === 403) {
            toast.error('Unauthorized access to this order.');
            router.push('/account');
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [id, user, router]);

  // Delivery & Return Eligibility Calculations
  const deliveredTime = (() => {
    if (!order) return null;
    if (order.deliveredAt) return new Date(order.deliveredAt).getTime();
    if (Array.isArray(order.statusHistory)) {
      const h = order.statusHistory.find(x => x.status === 'delivered');
      if (h?.at) return new Date(h.at).getTime();
    }
    return null;
  })();

  const isDelivered = order?.status === 'delivered';
  const RETURN_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
  const msRemaining = deliveredTime ? Math.max(0, (deliveredTime + RETURN_WINDOW_MS) - nowTime) : 0;
  const isReturnWindowOpen = isDelivered && deliveredTime && msRemaining > 0;
  const isReturnWindowExpired = isDelivered && deliveredTime && msRemaining <= 0;

  const hasActiveReturn = !!returnRequest && ['REQUESTED', 'RETURN_REQUESTED', 'APPROVED', 'RETURN_APPROVED', 'REFUND_DETAILS_SUBMITTED', 'PROCESSING', 'REFUND_INITIATED', 'REFUNDED'].includes(returnRequest.returnStatus);
  const canRequestReturn = isDelivered && isReturnWindowOpen && !hasActiveReturn;

  const minutesLeft = Math.floor(msRemaining / 60000);
  const secondsLeft = Math.floor((msRemaining % 60000) / 1000);

  // Auto-open return modal if action=return query parameter exists and return is allowed
  useEffect(() => {
    if (order && actionParam === 'return' && canRequestReturn && !autoOpenedReturnRef.current) {
      autoOpenedReturnRef.current = true;
      openReturnModal();
    }
  }, [order, actionParam, canRequestReturn]);

  // Auto-open review modal if action=review query parameter exists on delivered order
  useEffect(() => {
    if (order && actionParam === 'review' && order.status === 'delivered' && !autoOpenedReviewRef.current) {
      autoOpenedReviewRef.current = true;
      const target = itemIdParam
        ? order.items?.find(it => it.id === itemIdParam || it.slug === itemIdParam)
        : (order.items?.find(it => !orderReviews.some(r => r.productId === it.id || r.productSlug === it.slug)) || order.items?.[0]);

      if (target) {
        openReviewModal(target);
      }
    }
  }, [order, actionParam, itemIdParam, orderReviews]);

  if (authLoading || loading) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-[#9C6B30]" /></div>;
  if (!user) return null;
  if (!order) return <div className="h-96 flex items-center justify-center text-neutral-400">Order not found</div>;

  const historyByStatus = Object.fromEntries((order.statusHistory || []).map(h => [h.status, h]));
  const currentIdx = STEPS.findIndex(s => s.key === order.status);
  const activeIdx = order.status === 'cancelled' ? 0 : (currentIdx === -1 ? 0 : currentIdx);

  // Cancellation eligibility
  const isCancellable = ['confirmed', 'placed', 'processing', 'packed'].includes(order.status) && order.status !== 'cancelled';
  const cancellationDisplayText = getCancellationLabel(order) || 'Cancelled';
  const cancellationActor = getCancellationActor(order);

  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 sm:py-12">
        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8 sm:mb-10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-gradient-to-br from-[#9C6B30]/10 to-[#D4AF37]/20 flex items-center justify-center text-[#9C6B30] mb-4"><CheckCircle2 size={36} className="sm:w-10 sm:h-10" /></div>
            <div className="text-[10px] sm:text-[11px] tracking-[0.35em] uppercase text-[#9C6B30] mb-2">Thank you</div>
            <h1 className="font-display text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-light text-[#1A1A1A] break-words">Your order is confirmed</h1>
            <div className="gold-line w-16 mx-auto my-4" />
            <p className="text-xs sm:text-base text-neutral-500">A confirmation has been sent to your email. Your treasures are being prepared.</p>
          </motion.div>
        )}

        <div className="border border-[#E8E8E8] rounded-xl p-4 sm:p-6 md:p-8">
          <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
            <div>
              <div className="text-[10px] tracking-widest uppercase text-neutral-400">Order Number</div>
              <div className="font-display text-xl sm:text-2xl text-[#1A1A1A]">{order.orderNumber}</div>
              <div className="text-xs text-neutral-500 mt-1">Placed {new Date(order.placedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className={`inline-block px-3 sm:px-4 py-1.5 text-[9px] sm:text-[10px] tracking-widest uppercase rounded-full capitalize font-semibold ${order.status === 'cancelled' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-[#FAF6EF] text-[#9C6B30]'}`}>{order.status === 'cancelled' ? cancellationDisplayText : order.status}</span>
              <a href={`/orders/${order.id}/invoice`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 border border-[#1A1A1A] text-[9px] sm:text-[10px] tracking-widest uppercase rounded-full hover:bg-[#1A1A1A] hover:text-white transition"><FileText size={12} /> Invoice</a>
            </div>
          </div>

          {/* Active Return Status Banner / Details */}
          {returnRequest && (
            <div className="mb-6 p-4 sm:p-6 bg-gradient-to-br from-white to-[#FAF6EF]/40 border border-[#E8E8E8] rounded-xl space-y-4 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[#E8E8E8]">
                <div>
                  <div className="flex items-center gap-2">
                    <RotateCcw size={17} className="text-[#9C6B30]" />
                    <h4 className="font-display text-base sm:text-lg text-[#1A1A1A]">Return Request Summary</h4>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">Return ID: <span className="font-mono font-medium text-neutral-700">{returnRequest.returnId || returnRequest.id}</span></p>
                </div>
                <span className={`inline-block px-3 py-1 text-[10px] font-semibold tracking-wider uppercase rounded-full border ${getReturnStatusBadge(returnRequest.returnStatus)}`}>
                  {getReturnStatusLabel(returnRequest.returnStatus, !!returnRequest.refundDetails)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase tracking-wider">Requested On</span>
                  <span className="font-medium text-neutral-800">{new Date(returnRequest.requestedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase tracking-wider">Refund Amount</span>
                  <span className="font-semibold text-[#9C6B30] text-sm sm:text-base">{formatINR(returnRequest.refundAmount || 0)}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase tracking-wider">Refund Status</span>
                  <span className="font-medium text-neutral-800 uppercase tracking-wider text-[11px]">{returnRequest.refundStatus || 'Pending'}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase tracking-wider">Reason</span>
                  <span className="font-medium text-neutral-800 truncate block">{returnRequest.reason}</span>
                </div>
              </div>

              {/* Status 1: REQUESTED / RETURN_REQUESTED (Awaiting Admin Approval Notice) */}
              {['REQUESTED', 'RETURN_REQUESTED'].includes(returnRequest.returnStatus) && (
                <div className="p-4 bg-amber-50/90 border border-amber-200/90 rounded-xl flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
                    <Clock size={16} />
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-semibold text-amber-900 text-xs sm:text-sm">
                      Your return request has been submitted and is awaiting approval.
                    </h5>
                    <p className="text-[11px] sm:text-xs text-amber-800/90 leading-relaxed">
                      Our concierge team is currently reviewing your return request. Once approved by admin, you will be able to submit your UPI ID or Bank Transfer details here to receive your refund.
                    </p>
                  </div>
                </div>
              )}

              {/* Status 2: APPROVED / RETURN_APPROVED (Refund Details Form - Action Required) */}
              {['APPROVED', 'RETURN_APPROVED'].includes(returnRequest.returnStatus) && !returnRequest.refundDetails && (
                <div className="p-4 sm:p-6 bg-gradient-to-br from-[#FAF6EF] via-white to-amber-50/40 border-2 border-[#9C6B30]/35 rounded-xl space-y-4 shadow-xs">
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E8E8E8]">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
                        <CheckCircle2 size={12} className="text-blue-600" /> Return Approved
                      </div>
                      <h4 className="font-display text-base sm:text-lg text-[#1A1A1A]">
                        Provide Refund Details
                      </h4>
                      <p className="text-xs text-neutral-600 mt-0.5">
                        Your return has been approved! Please choose your preferred refund method below to receive your refund of <strong className="text-[#9C6B30] font-semibold">{formatINR(returnRequest.refundAmount || 0)}</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Method Selection: UPI or Bank Transfer */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-2">
                      Select Refund Method *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => { setRefundMethod('upi'); setRefundDetailsErr(''); }}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          refundMethod === 'upi'
                            ? 'border-[#9C6B30] bg-[#FAF6EF]/90 shadow-2xs ring-1 ring-[#9C6B30]'
                            : 'border-neutral-200 hover:border-neutral-300 bg-white'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          refundMethod === 'upi' ? 'bg-[#9C6B30] text-white' : 'bg-neutral-100 text-neutral-600'
                        }`}>
                          <Smartphone size={18} />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-neutral-900">UPI Transfer</div>
                          <div className="text-[11px] text-neutral-500">Google Pay, PhonePe, Paytm, BHIM</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setRefundMethod('bank_transfer'); setRefundDetailsErr(''); }}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          refundMethod === 'bank_transfer'
                            ? 'border-[#9C6B30] bg-[#FAF6EF]/90 shadow-2xs ring-1 ring-[#9C6B30]'
                            : 'border-neutral-200 hover:border-neutral-300 bg-white'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          refundMethod === 'bank_transfer' ? 'bg-[#9C6B30] text-white' : 'bg-neutral-100 text-neutral-600'
                        }`}>
                          <Building2 size={18} />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-neutral-900">Bank Transfer (NEFT / IMPS)</div>
                          <div className="text-[11px] text-neutral-500">Direct deposit to bank account</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {refundDetailsErr && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                      <AlertTriangle size={15} className="text-red-500 shrink-0" />
                      <span>{refundDetailsErr}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmitRefundDetails} className="space-y-4 pt-1">
                    {refundMethod === 'upi' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">
                            UPI ID (VPA) *
                          </label>
                          <input
                            type="text"
                            required
                            value={refundUpiForm.upiId}
                            onChange={e => {
                              setRefundUpiForm(prev => ({ ...prev, upiId: e.target.value }));
                              setRefundDetailsErr('');
                            }}
                            placeholder="e.g. name@okhdfcbank or 9876543210@paytm"
                            className="w-full px-3 py-2.5 border border-[#E8E8E8] rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:border-[#9C6B30]"
                          />
                          <p className="text-[10px] text-neutral-400 mt-1">Accepted: Google Pay, PhonePe, Paytm, BHIM or any Indian banking UPI handle</p>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">
                            Confirm UPI ID *
                          </label>
                          <input
                            type="text"
                            required
                            value={refundUpiForm.confirmUpiId}
                            onChange={e => {
                              setRefundUpiForm(prev => ({ ...prev, confirmUpiId: e.target.value }));
                              setRefundDetailsErr('');
                            }}
                            placeholder="Re-enter your UPI ID"
                            className="w-full px-3 py-2.5 border border-[#E8E8E8] rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:border-[#9C6B30]"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-1">
                              Account Holder Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={refundBankForm.accountHolderName}
                              onChange={e => {
                                setRefundBankForm(prev => ({ ...prev, accountHolderName: e.target.value }));
                                setRefundDetailsErr('');
                              }}
                              placeholder="Full name as in bank records"
                              className="w-full px-3 py-2.5 border border-[#E8E8E8] rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:border-[#9C6B30]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-1">
                              Bank Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={refundBankForm.bankName}
                              onChange={e => {
                                setRefundBankForm(prev => ({ ...prev, bankName: e.target.value }));
                                setRefundDetailsErr('');
                              }}
                              placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                              className="w-full px-3 py-2.5 border border-[#E8E8E8] rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:border-[#9C6B30]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                          <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-1">
                              Account Number *
                            </label>
                            <input
                              type="text"
                              required
                              value={refundBankForm.accountNumber}
                              onChange={e => {
                                const digits = e.target.value.replace(/[^0-9]/g, '');
                                setRefundBankForm(prev => ({ ...prev, accountNumber: digits }));
                                setRefundDetailsErr('');
                              }}
                              placeholder="9 to 18 digits"
                              className="w-full px-3 py-2.5 border border-[#E8E8E8] rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:border-[#9C6B30] font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-1">
                              Confirm Account Number *
                            </label>
                            <input
                              type="text"
                              required
                              value={refundBankForm.confirmAccountNumber}
                              onChange={e => {
                                const digits = e.target.value.replace(/[^0-9]/g, '');
                                setRefundBankForm(prev => ({ ...prev, confirmAccountNumber: digits }));
                                setRefundDetailsErr('');
                              }}
                              placeholder="Re-enter account number"
                              className="w-full px-3 py-2.5 border border-[#E8E8E8] rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:border-[#9C6B30] font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-1">
                              IFSC Code *
                            </label>
                            <input
                              type="text"
                              required
                              maxLength={11}
                              value={refundBankForm.ifscCode}
                              onChange={e => {
                                setRefundBankForm(prev => ({ ...prev, ifscCode: e.target.value.toUpperCase() }));
                                setRefundDetailsErr('');
                              }}
                              placeholder="e.g. HDFC0001234"
                              className="w-full px-3 py-2.5 border border-[#E8E8E8] rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:border-[#9C6B30] uppercase font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-between flex-wrap gap-3">
                      <div className="text-[11px] text-neutral-500 flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-[#9C6B30]" /> Encrypted & used strictly for refund payout.
                      </div>
                      <button
                        type="submit"
                        disabled={submittingRefundDetails}
                        className="px-6 py-2.5 bg-[#1A1A1A] hover:bg-[#9C6B30] text-white text-[11px] tracking-wider uppercase font-semibold rounded-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {submittingRefundDetails ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        Submit Refund Details
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Status 3: REFUND DETAILS SUBMITTED (Confirmed & Masked Summary) */}
              {(returnRequest.refundDetails || returnRequest.returnStatus === 'REFUND_DETAILS_SUBMITTED') && (
                <div className="p-4 sm:p-5 bg-gradient-to-br from-emerald-50/70 via-white to-[#FAF6EF]/50 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-emerald-100">
                    <div className="flex items-center gap-2 text-emerald-900 font-semibold text-xs sm:text-sm">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span>Refund details submitted successfully. Your return will now proceed.</span>
                    </div>
                    {returnRequest.refundDetails?.method && (
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-semibold uppercase tracking-wider rounded-full">
                        Method: {returnRequest.refundDetails.method === 'upi' ? 'UPI' : 'Bank Transfer'}
                      </span>
                    )}
                  </div>

                  {returnRequest.refundDetails && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      {returnRequest.refundDetails.method === 'upi' ? (
                        <>
                          <div>
                            <span className="text-neutral-400 block text-[10px] uppercase tracking-wider">Payout Channel</span>
                            <span className="font-medium text-neutral-800">UPI Instant Transfer</span>
                          </div>
                          <div>
                            <span className="text-neutral-400 block text-[10px] uppercase tracking-wider">UPI ID (VPA)</span>
                            <span className="font-mono font-semibold text-neutral-900">{returnRequest.refundDetails.upiId}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <span className="text-neutral-400 block text-[10px] uppercase tracking-wider">Account Holder</span>
                            <span className="font-medium text-neutral-800">{returnRequest.refundDetails.accountHolderName}</span>
                          </div>
                          <div>
                            <span className="text-neutral-400 block text-[10px] uppercase tracking-wider">Account Number</span>
                            <span className="font-mono font-semibold text-neutral-900">
                              {returnRequest.refundDetails.accountNumberMasked || (returnRequest.refundDetails.accountNumber ? `XXXX XXXX ${returnRequest.refundDetails.accountNumber.slice(-4)}` : 'XXXX XXXX')}
                            </span>
                          </div>
                          <div>
                            <span className="text-neutral-400 block text-[10px] uppercase tracking-wider">Bank & IFSC</span>
                            <span className="font-medium text-neutral-800">
                              {returnRequest.refundDetails.bankName} • <span className="font-mono">{returnRequest.refundDetails.ifscCode}</span>
                            </span>
                          </div>
                        </>
                      )}
                      <div>
                        <span className="text-neutral-400 block text-[10px] uppercase tracking-wider">Submitted On</span>
                        <span className="font-medium text-neutral-700">
                          {returnRequest.refundDetails.submittedAt ? new Date(returnRequest.refundDetails.submittedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Verified'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {returnRequest.comment && (
                <div className="p-3 bg-white border border-[#E8E8E8] rounded-lg text-xs text-neutral-700">
                  <span className="font-medium text-neutral-900">Your Comment:</span> {returnRequest.comment}
                </div>
              )}

              {returnRequest.rejectionReason && (
                <div className="p-3.5 bg-red-50/80 border border-red-200 rounded-lg text-xs text-red-800 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-red-900">
                    <AlertTriangle size={14} className="text-red-600" /> Return Rejection Reason
                  </div>
                  <p>{returnRequest.rejectionReason}</p>
                </div>
              )}

              {returnRequest.gatewayRefundId && (
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between flex-wrap gap-2">
                  <span className="font-medium">Refund Reference ID:</span>
                  <span className="font-mono text-[11px] font-semibold">{returnRequest.gatewayRefundId}</span>
                </div>
              )}

              {Array.isArray(returnRequest.items) && returnRequest.items.length > 0 && (
                <div className="pt-2 border-t border-[#E8E8E8]">
                  <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium block mb-2">Items Being Returned</span>
                  <div className="space-y-2">
                    {returnRequest.items.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-2.5 rounded-md bg-neutral-50/80 border border-neutral-200/50">
                        <div className="flex items-center gap-2.5">
                          {it.image && <img src={it.image} alt={it.name} className="w-10 h-10 rounded object-cover shrink-0" />}
                          <div>
                            <span className="font-medium text-neutral-800 block truncate max-w-[200px] sm:max-w-xs">{it.name}</span>
                            <span className="text-neutral-500 text-[11px]">Quantity: {it.returnQty || it.qty}</span>
                          </div>
                        </div>
                        <div className="font-semibold text-neutral-900">
                          {it.itemRefundAmount ? formatINR(it.itemRefundAmount) : formatINR((it.price || 0) * (it.returnQty || it.qty))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(returnRequest.images) && returnRequest.images.length > 0 && (
                <div className="pt-2 border-t border-[#E8E8E8]">
                  <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium block mb-2">
                    Uploaded Product Photos ({returnRequest.images.length})
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {returnRequest.images.map((img, i) => (
                      <a key={i} href={img} target="_blank" rel="noopener noreferrer" className="relative group block">
                        <img
                          src={img}
                          alt="Product return verification"
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover border border-[#E8E8E8] group-hover:opacity-90 transition shadow-xs"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 30-Minute Return Window Alert Banner (When Delivered & Eligible) */}
          {canRequestReturn && (
            <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-amber-50/90 via-[#FAF6EF] to-white border border-amber-200 rounded-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
                    <Clock size={17} className="text-[#9C6B30] animate-pulse" />
                    <span>30-Minute Return Policy Active</span>
                  </div>
                  <p className="text-neutral-600 text-xs mt-1">
                    Your order was delivered at {new Date(deliveredTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.
                    In accordance with store policy, return requests are accepted strictly within 30 minutes of delivery.
                  </p>
                  <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1 bg-amber-100/90 text-amber-900 rounded-md font-mono text-xs font-semibold">
                    <span className="text-[10px] tracking-wider uppercase text-neutral-600 font-sans">Window Closes In:</span>
                    <span className="text-[#9C6B30] text-sm">{minutesLeft}m {secondsLeft < 10 ? '0' : ''}{secondsLeft}s</span>
                  </div>
                </div>
                <button
                  onClick={openReturnModal}
                  className="self-start sm:self-center px-5 py-2.5 bg-[#1A1A1A] text-white text-[11px] tracking-wider uppercase rounded-md hover:bg-[#9C6B30] transition font-semibold flex items-center gap-2 cursor-pointer shrink-0 shadow-xs"
                >
                  <RotateCcw size={14} /> Return Order
                </button>
              </div>
            </div>
          )}

          {/* Return Window Expired Notice */}
          {isReturnWindowExpired && !returnRequest && (
            <div className="mb-6 p-3.5 sm:p-4 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center gap-3 text-xs text-neutral-600">
              <Clock size={16} className="text-neutral-400 shrink-0" />
              <div>
                <span className="font-medium text-neutral-800">Return Window Closed:</span> Returns are accepted strictly within 30 minutes of delivery. The 30-minute window for this order has now ended.
              </div>
            </div>
          )}

          {/* Cancellation Info Banner */}
          {order.status === 'cancelled' && (
            <div className="mb-6 p-4 sm:p-5 bg-red-50/70 border border-red-200 rounded-xl space-y-2 text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-red-800 font-semibold text-sm">
                <X size={18} className="shrink-0 text-red-600" />
                {cancellationDisplayText}
              </div>
              <p className="text-neutral-700">
                {cancellationActor ? (
                  <>Cancelled by <span className="font-medium">{cancellationActor}</span></>
                ) : (
                  <span>Order cancelled</span>
                )}
                {order.cancelledAt && <span> on {new Date(order.cancelledAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
              </p>
              {order.cancellationReason && (
                <p className="text-neutral-600">
                  <span className="font-medium text-neutral-800">Reason:</span> {order.cancellationReason}
                  {order.cancellationNote && <span className="italic"> ({order.cancellationNote})</span>}
                </p>
              )}

              {/* Refund Info */}
              <div className="pt-2 mt-2 border-t border-red-200/60 text-xs">
                {order.payment === 'cod' ? (
                  <p className="text-neutral-600">
                    <span className="font-semibold text-neutral-800 font-sans">Refund Status:</span> No refund applicable because this order was Cash on Delivery.
                  </p>
                ) : (
                  <div className="space-y-1 text-neutral-700">
                    <p className="font-semibold text-neutral-900">
                      Refund Amount: <span className="text-[#9C6B30]">{formatINR(order.amounts?.total || 0)}</span>
                    </p>
                    <p>
                      <span className="font-semibold text-neutral-900 font-sans">Refund Status:</span>{' '}
                      <span className="inline-block px-2.5 py-0.5 bg-amber-100 text-amber-800 font-medium rounded text-[10px] uppercase tracking-wider">
                        {order.refundStatus === 'refund_initiated' ? 'Refund Initiated' : (order.refundStatus || 'Refund Initiated')}
                      </span>
                    </p>
                    {order.refundId && <p className="text-[11px] text-neutral-500 font-mono">Refund Ref ID: {order.refundId}</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress bar */}
          {order.status !== 'cancelled' ? (
            <div className="relative grid grid-cols-4 gap-1 sm:gap-2 mb-4">
              <div className="absolute top-4 sm:top-5 left-[12.5%] right-[12.5%] h-[2px] bg-[#E8E8E8] -z-0" />
              <div className="absolute top-4 sm:top-5 left-[12.5%] h-[2px] bg-[#9C6B30] -z-0 transition-all duration-500" style={{ width: `${(activeIdx / (STEPS.length - 1)) * 75}%` }} />
              {STEPS.map((s, i) => {
                const done = i <= activeIdx;
                const h = historyByStatus[s.key];
                return (
                  <div key={s.key} className="flex flex-col items-center text-center relative z-10">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all ${done ? 'bg-[#9C6B30] text-white ring-2 sm:ring-4 ring-[#9C6B30]/15' : 'bg-white border-2 border-[#E8E8E8] text-neutral-400'}`}><s.icon size={14} className="sm:w-4 sm:h-4" /></div>
                    <div className={`text-[8px] xs:text-[9px] sm:text-[10px] tracking-normal xs:tracking-wider sm:tracking-widest uppercase mt-1.5 sm:mt-2 ${done ? 'text-[#9C6B30] font-medium' : 'text-neutral-400'}`}>{s.label}</div>
                    {h && <div className="text-[8px] xs:text-[9px] text-neutral-400 mt-0.5">{new Date(h.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>}
                  </div>
                );
              })}
            </div>
          ) : null}

          {order.status !== 'cancelled' && (
            <div className="text-xs text-neutral-500 mb-6">Estimated delivery: <span className="text-[#1A1A1A] font-medium">{new Date(order.estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
          )}

          {/* Detailed timeline */}
          {(order.statusHistory || []).length > 0 && (
            <div className="border border-[#E8E8E8] rounded-lg p-4 sm:p-5 mb-6 bg-[#FAF6EF]/30">
              <div className="text-[10px] tracking-widest uppercase text-[#9C6B30] mb-4 flex items-center gap-2"><Clock size={12} /> Order Timeline</div>
              <ol className="relative border-l-2 border-[#E8E8E8] ml-2 space-y-4">
                {[...order.statusHistory].reverse().map((h, i) => (
                  <li key={i} className="pl-4 sm:pl-5 relative">
                    <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-[#9C6B30] ring-4 ring-[#FAF6EF]" />
                    <div className="flex items-baseline justify-between flex-wrap gap-2">
                      <div className="font-medium capitalize text-[#1A1A1A] text-xs sm:text-sm">
                        {h.status === 'cancelled' ? cancellationDisplayText : h.status}
                      </div>
                      <div className="text-[11px] sm:text-xs text-neutral-500">{new Date(h.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    {h.note && <div className="text-xs text-neutral-500 mt-0.5">{h.note}</div>}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="border border-[#E8E8E8] rounded-lg p-4">
              <div className="text-[10px] tracking-widest uppercase text-neutral-400 mb-2">Shipping Address</div>
              <div className="font-medium text-sm sm:text-base">{order.address.fullName}</div>
              <div className="text-xs sm:text-sm text-neutral-600 mt-1">{order.address.line1}{order.address.line2 ? ', ' + order.address.line2 : ''}<br />{order.address.city}, {order.address.state} — {order.address.pincode}</div>
              <div className="text-xs text-neutral-500 mt-1">{order.address.phone}</div>
            </div>
            <div className="border border-[#E8E8E8] rounded-lg p-4">
              <div className="text-[10px] tracking-widest uppercase text-neutral-400 mb-2">Payment</div>
              <div className="font-medium capitalize text-sm sm:text-base">{order.payment === 'cod' ? 'Cash on Delivery' : order.payment}</div>
              <div className="text-xs sm:text-sm text-neutral-600 mt-1">{formatINR(order.amounts.total)}</div>
              <div className="text-xs text-neutral-500 mt-1 capitalize">Status: {order.paymentStatus || 'pending'}</div>
            </div>
          </div>

          {/* Customer Reviews Callout Banner when Delivered */}
          {order.status === 'delivered' && (
            <div className="mb-6 p-4 sm:p-5 bg-gradient-to-br from-[#FAF6EF] via-white to-[#FAF6EF]/60 border border-[#E8E8E8] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#9C6B30]/10 flex items-center justify-center text-[#9C6B30] shrink-0 mt-0.5">
                  <Star size={18} className="fill-[#9C6B30]/20 stroke-[#9C6B30]" />
                </div>
                <div>
                  <h4 className="font-display text-sm sm:text-base text-[#1A1A1A]">Customer Reviews</h4>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {customerReviewsEnabled
                      ? 'Share your thoughts on the pieces in this delivered order to guide other jewellery collectors.'
                      : 'Customer reviews are currently paused by the atelier.'}
                  </p>
                </div>
              </div>
              {customerReviewsEnabled && (
                <div className="text-xs text-[#9C6B30] font-medium shrink-0 self-end sm:self-center">
                  {orderReviews.length} of {order.items.length} item(s) reviewed
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            {order.items.map((it, i) => {
              const itemReview = orderReviews.find(r => r.productId === it.id || r.productSlug === it.slug);
              return (
                <div key={i} className="border border-[#E8E8E8] rounded-lg p-3 sm:p-4 transition hover:border-neutral-300">
                  <div className="flex gap-3 sm:gap-4 items-start">
                    <img loading="lazy" src={it.image} alt={it.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Link href={`/product/${it.slug}`} className="font-serif-luxe text-base sm:text-lg hover:text-[#9C6B30] truncate block">
                        {it.name}
                      </Link>
                      <div className="text-xs text-neutral-500 mt-0.5">Quantity: {it.qty}</div>
                      <div className="font-medium text-xs sm:text-sm text-[#1A1A1A] mt-1 sm:hidden">
                        {formatINR(it.price * it.qty)}
                      </div>
                    </div>
                    <div className="font-medium text-xs sm:text-sm shrink-0 hidden sm:block">
                      {formatINR(it.price * it.qty)}
                    </div>
                  </div>

                  {/* Customer Review Section for this item */}
                  {order.status === 'delivered' && (
                    <div className="mt-3 pt-3 border-t border-[#E8E8E8] flex flex-wrap items-center justify-between gap-2">
                      {itemReview ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-amber-50 text-amber-900 border border-amber-200">
                            <span className="flex text-[#D4AF37]">
                              {[1, 2, 3, 4, 5].map(s => (
                                <Star key={s} size={11} className={s <= itemReview.rating ? 'fill-[#D4AF37] stroke-[#D4AF37]' : 'text-neutral-300'} />
                              ))}
                            </span>
                            <span>{formatRating(itemReview.rating)} · Reviewed</span>
                          </span>
                          {itemReview.title && (
                            <span className="text-xs text-neutral-600 font-medium italic truncate max-w-[200px] sm:max-w-xs">
                              &ldquo;{itemReview.title}&rdquo;
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-[11px] text-neutral-500">
                          {customerReviewsEnabled ? 'Have you worn this piece?' : 'Reviews paused'}
                        </div>
                      )}

                      {customerReviewsEnabled && (
                        <button
                          type="button"
                          onClick={() => openReviewModal(it)}
                          className={`px-3 py-1.5 rounded-md text-[11px] tracking-wider uppercase font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                            itemReview
                              ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                              : 'bg-[#1A1A1A] hover:bg-[#9C6B30] text-white shadow-xs'
                          }`}
                        >
                          <Star size={12} className={itemReview ? 'fill-amber-400 stroke-amber-500' : ''} />
                          {itemReview ? 'View / Edit Review' : 'Rate & Review'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 border-t border-[#E8E8E8] pt-4 space-y-1 text-xs sm:text-sm max-w-xs ml-auto">
            <div className="flex justify-between"><span className="text-neutral-500">Subtotal</span><span>{formatINR(order.amounts.subtotal)}</span></div>
            {order.amounts.discount > 0 && <div className="flex justify-between text-[#9C6B30]"><span>Discount</span><span>-{formatINR(order.amounts.discount)}</span></div>}
            <div className="flex justify-between"><span className="text-neutral-500">Shipping</span><span>{order.amounts.shipping === 0 ? 'Free' : formatINR(order.amounts.shipping)}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Tax</span><span>{formatINR(order.amounts.tax)}</span></div>
            <div className="flex justify-between font-display text-lg sm:text-xl pt-2 border-t border-[#E8E8E8]"><span>Total</span><span>{formatINR(order.amounts.total)}</span></div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2.5 sm:gap-3 justify-center">
            <a href={`/orders/${order.id}/invoice`} target="_blank" rel="noreferrer" className="px-4 sm:px-8 py-2.5 sm:py-3 border border-[#1A1A1A] text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] uppercase rounded-md hover:bg-[#1A1A1A] hover:text-white transition flex items-center gap-2"><FileText size={14} /> View Invoice</a>
            <a href={`/api/orders/${order.id}/invoice`} target="_blank" rel="noreferrer" className="px-4 sm:px-8 py-2.5 sm:py-3 bg-[#FAF6EF] text-[#9C6B30] border border-[#9C6B30]/40 text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] uppercase rounded-md hover:bg-[#9C6B30] hover:text-white transition flex items-center gap-2"><Download size={14} /> Download PDF</a>
            <Link href="/shop" className="px-4 sm:px-8 py-2.5 sm:py-3 border border-[#1A1A1A] text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] uppercase rounded-md hover:bg-[#1A1A1A] hover:text-white transition">Continue Shopping</Link>
            <Link href="/account" className="px-4 sm:px-8 py-2.5 sm:py-3 bg-[#1A1A1A] text-white text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] uppercase rounded-md hover:bg-[#9C6B30]">View All Orders</Link>
            {canRequestReturn && (
              <button
                onClick={openReturnModal}
                className="px-4 sm:px-8 py-2.5 sm:py-3 border border-[#9C6B30] text-[#9C6B30] text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] uppercase rounded-md hover:bg-[#9C6B30] hover:text-white transition font-semibold flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw size={14} /> Return Order ({minutesLeft}m left)
              </button>
            )}
            {isCancellable && (
              <button onClick={openCancelModal} className="px-4 sm:px-8 py-2.5 sm:py-3 border border-black text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] uppercase rounded-md hover:bg-red-500 hover:text-white transition font-semibold cursor-pointer">Cancel Order</button>
            )}
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={() => !cancelling && setShowCancelModal(false)}>
          <div className="bg-white text-[#1A1A1A] w-full max-w-lg rounded-xl border border-neutral-200 overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-[#1A1A1A] text-white p-4 sm:p-5 flex justify-between items-center">
              <div>
                <div className="text-[10px] tracking-widest uppercase text-[#9C6B30] font-semibold">Order Cancellation</div>
                <h3 className="font-display text-lg sm:text-xl font-light">Cancel Order #{order.orderNumber}</h3>
              </div>
              <button type="button" disabled={cancelling} onClick={() => setShowCancelModal(false)} className="text-neutral-400 hover:text-white transition p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {modalErr && (
              <div className="mx-4 sm:mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0 text-red-500" />
                <span>{modalErr}</span>
              </div>
            )}

            {cancelStep === 1 ? (
              <form onSubmit={handleReasonSubmit} className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block font-medium text-xs sm:text-sm text-neutral-800 mb-2">
                    Why do you want to cancel this order?
                  </label>
                  <div className="space-y-2">
                    {CANCELLATION_REASONS.map(r => (
                      <label key={r} className="flex items-center gap-3 p-2.5 sm:p-3 border border-[#E8E8E8] rounded-lg hover:border-[#9C6B30] cursor-pointer transition text-xs sm:text-sm">
                        <input
                          type="radio"
                          name="cancellationReason"
                          value={r}
                          checked={selectedReason === r}
                          onChange={() => { setSelectedReason(r); setModalErr(''); }}
                          className="accent-[#9C6B30]"
                        />
                        <span className="text-neutral-700">{r}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {selectedReason === 'Other' && (
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1">Please enter your reason *</label>
                    <textarea
                      rows={3}
                      value={customNote}
                      onChange={e => { setCustomNote(e.target.value); setModalErr(''); }}
                      placeholder="Tell us why you are cancelling..."
                      className="w-full p-2.5 border border-[#E8E8E8] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[#9C6B30]"
                    />
                  </div>
                )}

                <div className="pt-3 border-t border-[#E8E8E8] flex gap-3 justify-end">
                  <button type="button" onClick={() => setShowCancelModal(false)} className="px-4 py-2 sm:py-2.5 text-xs text-neutral-600 hover:text-neutral-900 cursor-pointer">
                    Keep Order
                  </button>
                  <button type="submit" className="px-5 py-2 sm:py-2.5 bg-[#1A1A1A] text-white text-[11px] tracking-wider uppercase rounded-md hover:bg-[#9C6B30] transition font-semibold cursor-pointer">
                    Continue
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 sm:p-6 space-y-4">
                <div className="p-4 bg-[#FAF6EF]/60 border border-[#E8E8E8] rounded-lg space-y-2 text-xs sm:text-sm">
                  <div className="font-semibold text-neutral-900 text-sm">Cancel Order Confirmation</div>
                  <p className="text-neutral-600">Are you sure you want to cancel this order?</p>
                  <div className="pt-2 border-t border-[#E8E8E8] grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase tracking-wider">Order</span>
                      <span className="font-medium text-neutral-800">{order.orderNumber}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase tracking-wider">Amount</span>
                      <span className="font-semibold text-[#9C6B30]">{formatINR(order.amounts.total)}</span>
                    </div>
                    <div className="col-span-2 pt-1">
                      <span className="text-neutral-400 block text-[10px] uppercase tracking-wider">Selected Reason</span>
                      <span className="font-medium text-neutral-800">{selectedReason === 'Other' ? customNote : selectedReason}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E8E8E8] flex gap-3 justify-end">
                  <button type="button" disabled={cancelling} onClick={() => setCancelStep(1)} className="px-4 py-2 sm:py-2.5 text-xs text-neutral-600 hover:text-neutral-900 cursor-pointer">
                    Go Back
                  </button>
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={handleConfirmCancel}
                    className="px-5 py-2 sm:py-2.5 bg-red-600 text-white text-[11px] tracking-wider uppercase rounded-md hover:bg-red-700 transition font-semibold disabled:opacity-60 flex items-center gap-2 cursor-pointer"
                  >
                    {cancelling ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Processing…
                      </>
                    ) : (
                      'Confirm Cancellation'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Return Order Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={() => !submittingReturn && closeReturnModal()}>
          <div className="bg-white text-[#1A1A1A] w-full max-w-xl rounded-xl border border-neutral-200 overflow-hidden shadow-2xl my-6" onClick={e => e.stopPropagation()}>
            <div className="bg-[#1A1A1A] text-white p-4 sm:p-5 flex justify-between items-center">
              <div>
                <div className="text-[10px] tracking-widest uppercase text-[#9C6B30] font-semibold flex items-center gap-1.5">
                  <RotateCcw size={12} /> Return Request
                </div>
                <h3 className="font-display text-lg sm:text-xl font-light">Return Order #{order.orderNumber}</h3>
              </div>
              <button type="button" disabled={submittingReturn} onClick={closeReturnModal} className="text-neutral-400 hover:text-white transition p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Policy countdown header inside modal */}
            <div className="bg-[#FAF6EF] px-4 sm:px-6 py-2.5 border-b border-[#E8E8E8] flex items-center justify-between text-xs text-neutral-600">
              <span className="flex items-center gap-1.5 font-medium text-amber-900">
                <Clock size={13} className="text-[#9C6B30]" /> 30-Minute Policy Window
              </span>
              <span className="font-mono font-semibold text-[#9C6B30]">
                {minutesLeft}m {secondsLeft < 10 ? '0' : ''}{secondsLeft}s remaining
              </span>
            </div>

            {returnModalErr && (
              <div className="mx-4 sm:mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0 text-red-500" />
                <span>{returnModalErr}</span>
              </div>
            )}

            {returnStep === 1 ? (
              <form onSubmit={handleReturnReviewSubmit} className="p-4 sm:p-6 space-y-5">
                {/* Items selection */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block font-medium text-xs sm:text-sm text-neutral-800">
                      Select item(s) to return:
                    </label>
                    <span className="text-[11px] text-neutral-500">Choose items & quantities</span>
                  </div>

                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {(order.items || []).map(it => {
                      const entry = returnItems[it.id] || { selected: false, qty: 1 };
                      return (
                        <div
                          key={it.id}
                          className={`flex items-center gap-3 p-3 border rounded-lg transition ${entry.selected ? 'border-[#9C6B30] bg-[#FAF6EF]/30' : 'border-[#E8E8E8] bg-white opacity-70'}`}
                        >
                          <input
                            type="checkbox"
                            checked={entry.selected}
                            onChange={() => handleItemToggle(it.id)}
                            className="w-4 h-4 accent-[#9C6B30] cursor-pointer shrink-0"
                          />
                          {it.image && (
                            <img src={it.image} alt={it.name} className="w-12 h-12 rounded object-cover shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-serif-luxe text-xs sm:text-sm text-neutral-900 truncate">{it.name}</div>
                            <div className="text-[11px] text-neutral-500">{formatINR(it.price)} each · Purchased: {it.qty}</div>
                          </div>

                          {/* Quantity Selector */}
                          {entry.selected && (
                            <div className="flex items-center border border-[#E8E8E8] rounded-md bg-white shrink-0">
                              <button
                                type="button"
                                onClick={() => handleQtyChange(it.id, -1)}
                                disabled={entry.qty <= 1}
                                className="w-7 h-7 flex items-center justify-center text-xs text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-8 text-center text-xs font-semibold">{entry.qty}</span>
                              <button
                                type="button"
                                onClick={() => handleQtyChange(it.id, 1)}
                                disabled={entry.qty >= it.qty}
                                className="w-7 h-7 flex items-center justify-center text-xs text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Live Estimated Refund display */}
                <div className="p-3.5 bg-[#FAF6EF]/60 border border-[#E8E8E8] rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase tracking-wider">Estimated Refund</span>
                    <span className="text-[11px] text-neutral-400">Includes applicable taxes & adjusted discounts</span>
                  </div>
                  <div className="font-display text-base sm:text-lg font-semibold text-[#9C6B30]">
                    {formatINR(calculateEstimatedRefund())}
                  </div>
                </div>

                {/* Return Reason */}
                <div>
                  <label className="block font-medium text-xs sm:text-sm text-neutral-800 mb-2">
                    Reason for return *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {RETURN_REASONS.map(r => (
                      <label key={r} className={`flex items-center gap-2.5 p-2.5 border rounded-lg hover:border-[#9C6B30] cursor-pointer transition text-xs ${selectedReturnReason === r ? 'border-[#9C6B30] bg-[#FAF6EF]/50 font-medium' : 'border-[#E8E8E8]'}`}>
                        <input
                          type="radio"
                          name="returnReason"
                          value={r}
                          checked={selectedReturnReason === r}
                          onChange={() => { setSelectedReturnReason(r); setReturnModalErr(''); }}
                          className="accent-[#9C6B30]"
                        />
                        <span className="text-neutral-700">{r}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Product Photos / Evidence Upload */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-medium text-xs sm:text-sm text-neutral-800">
                      Product Photos / Evidence <span className="text-neutral-400 text-xs font-normal">(optional, recommended)</span>
                    </label>
                    <span className="text-[11px] text-neutral-500 font-medium">{returnImages.length}/5 uploaded</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mb-2">
                    Upload clear photos of the product and its packaging to help our team verify and approve your return.
                  </p>

                  {/* Uploaded thumbnails */}
                  {returnImages.length > 0 && (
                    <div className="flex flex-wrap gap-2.5 mb-2.5">
                      {returnImages.map((imgUrl, idx) => (
                        <div key={idx} className="relative group w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-[#E8E8E8] bg-neutral-100 shadow-2xs">
                          <img src={imgUrl} alt={`Uploaded proof ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveReturnPhoto(idx)}
                            className="absolute top-1 right-1 p-1 bg-red-600/90 hover:bg-red-700 text-white rounded-full transition cursor-pointer shadow-xs"
                            title="Remove photo"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {returnImages.length < 5 && (
                    <label
                      className={`flex items-center justify-center gap-2 border-2 border-dashed border-neutral-300 rounded-xl p-3 sm:p-4 text-center cursor-pointer transition-all bg-white hover:bg-[#FAF6EF]/50 hover:border-[#9C6B30] ${
                        uploadingReturnPhoto ? 'opacity-60 pointer-events-none' : ''
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        onChange={handleReturnPhotoUpload}
                        disabled={uploadingReturnPhoto}
                        className="hidden"
                      />
                      {uploadingReturnPhoto ? (
                        <div className="flex items-center gap-2 text-xs text-[#9C6B30]">
                          <Loader2 size={16} className="animate-spin" />
                          <span>Uploading photo…</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-neutral-700">
                          <Camera size={16} className="text-[#9C6B30]" />
                          <span className="font-medium">{returnImages.length === 0 ? 'Upload Product Photo' : '+ Add Another Photo'}</span>
                          <span className="text-[10px] text-neutral-400 hidden sm:inline">(JPG, PNG, WebP up to 8MB)</span>
                        </div>
                      )}
                    </label>
                  )}
                </div>

                {/* Comments / Details */}
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Additional Comments {selectedReturnReason === 'Other' ? '*' : '(optional)'}
                  </label>
                  <textarea
                    rows={2}
                    value={returnComment}
                    onChange={e => { setReturnComment(e.target.value); setReturnModalErr(''); }}
                    placeholder="Describe condition of item, package details or notes for return inspection..."
                    className="w-full p-2.5 border border-[#E8E8E8] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[#9C6B30]"
                  />
                </div>

                <div className="pt-3 border-t border-[#E8E8E8] flex gap-3 justify-end items-center">
                  <button type="button" disabled={submittingReturn} onClick={closeReturnModal} className="px-4 py-2 text-xs text-neutral-600 hover:text-neutral-900 cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" className="px-6 py-2.5 bg-[#1A1A1A] text-white text-[11px] tracking-wider uppercase rounded-md hover:bg-[#9C6B30] transition font-semibold cursor-pointer">
                    Continue to Review
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 sm:p-6 space-y-4">
                <div className="p-4 bg-[#FAF6EF]/60 border border-[#E8E8E8] rounded-lg space-y-3 text-xs sm:text-sm">
                  <div className="font-semibold text-neutral-900 text-sm">Review & Confirm Return</div>
                  <p className="text-neutral-600 text-xs">
                    Please confirm the details below. Return requests are accepted within 30 minutes of delivery.
                  </p>

                  <div className="pt-2 border-t border-[#E8E8E8] space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Order Number:</span>
                      <span className="font-medium text-neutral-800">{order.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Estimated Refund:</span>
                      <span className="font-semibold text-[#9C6B30] text-sm">{formatINR(calculateEstimatedRefund())}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Selected Reason:</span>
                      <span className="font-medium text-neutral-800">{selectedReturnReason}</span>
                    </div>
                    {returnComment && (
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Notes:</span>
                        <span className="font-medium text-neutral-800 truncate max-w-[200px]">{returnComment}</span>
                      </div>
                    )}
                    {returnImages.length > 0 && (
                      <div className="pt-1.5 flex justify-between items-center">
                        <span className="text-neutral-500">Photos Attached:</span>
                        <span className="font-medium text-neutral-800">{returnImages.length} {returnImages.length === 1 ? 'photo' : 'photos'}</span>
                      </div>
                    )}
                  </div>

                  {returnImages.length > 0 && (
                    <div className="pt-2 border-t border-[#E8E8E8]">
                      <span className="text-[10px] uppercase tracking-wider text-neutral-400 block mb-1.5">Attached Photos:</span>
                      <div className="flex flex-wrap gap-2">
                        {returnImages.map((img, idx) => (
                          <img key={idx} src={img} alt={`Proof ${idx + 1}`} className="w-12 h-12 rounded object-cover border border-[#E8E8E8]" />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#E8E8E8]">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 block mb-1.5">Items to Return:</span>
                    <div className="space-y-1 text-xs">
                      {Object.entries(returnItems).filter(([_, v]) => v.selected && v.qty > 0).map(([itemId, v]) => {
                        const it = order.items.find(i => i.id === itemId);
                        return (
                          <div key={itemId} className="flex justify-between text-neutral-700">
                            <span className="truncate max-w-[220px] sm:max-w-xs">{it?.name} (x{v.qty})</span>
                            <span className="font-medium">{formatINR((it?.price || 0) * v.qty)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle size={15} className="text-[#9C6B30] shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed">
                    By confirming, you agree to hand over the items with original tags and packaging upon pickup. Once approved by our team, your refund will be processed.
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E8E8E8] flex gap-3 justify-end">
                  <button
                    type="button"
                    disabled={submittingReturn}
                    onClick={() => setReturnStep(1)}
                    className="px-4 py-2 sm:py-2.5 text-xs text-neutral-600 hover:text-neutral-900 cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft size={13} /> Back
                  </button>
                  <button
                    type="button"
                    disabled={submittingReturn}
                    onClick={handleConfirmReturn}
                    className="px-6 py-2 sm:py-2.5 bg-[#9C6B30] text-white text-[11px] tracking-wider uppercase rounded-md hover:bg-[#835928] transition font-semibold disabled:opacity-60 flex items-center gap-2 cursor-pointer"
                  >
                    {submittingReturn ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Submitting…
                      </>
                    ) : (
                      'Confirm & Submit Return'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Review Modal */}
      {showReviewModal && reviewTargetItem && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => !submittingReview && !deletingReview && closeReviewModal()}
        >
          <div
            className="bg-white text-[#1A1A1A] w-full max-w-lg rounded-xl border border-neutral-200 overflow-hidden shadow-2xl my-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-[#1A1A1A] text-white p-4 sm:p-5 flex justify-between items-center">
              <div>
                <div className="text-[10px] tracking-widest uppercase text-[#9C6B30] font-semibold">
                  {existingReview ? 'Update Your Review' : 'Rate & Review Item'}
                </div>
                <h3 className="font-display text-lg sm:text-xl font-light">
                  {existingReview ? 'Edit Review' : 'Customer Review'}
                </h3>
              </div>
              <button
                type="button"
                disabled={submittingReview || deletingReview}
                onClick={closeReviewModal}
                className="text-neutral-400 hover:text-white transition p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Target Item summary */}
            <div className="p-4 sm:px-6 bg-[#FAF6EF]/60 border-b border-[#E8E8E8] flex items-center gap-3">
              <img
                src={reviewTargetItem.image}
                alt={reviewTargetItem.name}
                className="w-12 h-12 rounded object-cover border border-[#E8E8E8] shrink-0"
              />
              <div className="min-w-0">
                <div className="font-serif-luxe text-sm sm:text-base text-[#1A1A1A] truncate">
                  {reviewTargetItem.name}
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  Order #{order.orderNumber}
                </div>
              </div>
            </div>

            {reviewModalErr && (
              <div className="mx-4 sm:mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0 text-red-500" />
                <span>{reviewModalErr}</span>
              </div>
            )}

            <form onSubmit={handleSubmitReview} className="p-4 sm:p-6 space-y-4">
              {/* Star Rating */}
              <div>
                <label className="block text-xs font-medium text-neutral-800 mb-1.5 uppercase tracking-wider">
                  Overall Rating *
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(s => {
                      const active = (hoverRating || reviewForm.rating) >= s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onMouseEnter={() => setHoverRating(s)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => {
                            setReviewForm(prev => ({ ...prev, rating: s }));
                            setReviewModalErr('');
                          }}
                          className="p-1 text-neutral-300 hover:scale-110 transition-transform cursor-pointer focus:outline-none"
                        >
                          <Star
                            size={26}
                            className={active ? 'fill-[#D4AF37] stroke-[#D4AF37]' : 'stroke-neutral-300'}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-xs font-semibold text-[#9C6B30] ml-2">
                    {(() => {
                      const cur = hoverRating || reviewForm.rating;
                      if (cur === 5) return '5.0 / 5 · Exceptional';
                      if (cur === 4) return '4.0 / 5 · Very Good';
                      if (cur === 3) return '3.0 / 5 · Good';
                      if (cur === 2) return '2.0 / 5 · Fair';
                      return '1.0 / 5 · Poor';
                    })()}
                  </span>
                </div>
              </div>

              {/* Review Title */}
              <div>
                <label className="block text-xs font-medium text-neutral-800 mb-1 uppercase tracking-wider">
                  Headline / Title (Optional)
                </label>
                <input
                  type="text"
                  maxLength={150}
                  value={reviewForm.title}
                  onChange={e => {
                    setReviewForm(prev => ({ ...prev, title: e.target.value }));
                    setReviewModalErr('');
                  }}
                  placeholder="e.g. Stunning craftsmanship and diamond sparkle!"
                  className="w-full px-3 py-2 border border-[#E8E8E8] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              {/* Review Comment */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-medium text-neutral-800 uppercase tracking-wider">
                    Detailed Review *
                  </label>
                  <span className="text-[10px] text-neutral-400">
                    {reviewForm.comment.length}/1000
                  </span>
                </div>
                <textarea
                  rows={4}
                  maxLength={1000}
                  required
                  value={reviewForm.comment}
                  onChange={e => {
                    setReviewForm(prev => ({ ...prev, comment: e.target.value }));
                    setReviewModalErr('');
                  }}
                  placeholder="Share your experience with this jewellery piece: its design, finishing, comfort, weight, and luster..."
                  className="w-full px-3 py-2 border border-[#E8E8E8] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              {/* Customer Photo Upload Section */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera size={13} className="text-[#9C6B30]" /> Customer Photo (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setPhotoInputMode(photoInputMode === 'upload' ? 'url' : 'upload')}
                    className="text-[10px] text-[#9C6B30] hover:underline font-medium cursor-pointer"
                  >
                    {photoInputMode === 'upload' ? 'Or paste image link' : 'Upload local photo instead'}
                  </button>
                </div>

                {reviewForm.image ? (
                  <div className="flex items-center gap-3 p-3 bg-[#FAF6EF]/60 border border-[#E8E8E8] rounded-xl">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-[#9C6B30]/30 shrink-0 bg-neutral-100 shadow-xs">
                      <img
                        src={reviewForm.image}
                        alt="Customer piece preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-neutral-800 flex items-center gap-1">
                        <Check size={13} className="text-emerald-600" /> Photo attached
                      </div>
                      <p className="text-[10px] text-neutral-500 truncate mt-0.5 max-w-[200px] sm:max-w-xs font-mono">
                        {reviewForm.image}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <label className="text-[10px] font-semibold text-[#9C6B30] hover:underline cursor-pointer">
                          Change photo
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/jpg"
                            onChange={handleLocalPhotoUpload}
                            className="hidden"
                          />
                        </label>
                        <span className="text-neutral-300">·</span>
                        <button
                          type="button"
                          onClick={() => setReviewForm(prev => ({ ...prev, image: '' }))}
                          className="text-[10px] font-semibold text-red-600 hover:text-red-700 cursor-pointer"
                        >
                          Remove photo
                        </button>
                      </div>
                    </div>
                  </div>
                ) : photoInputMode === 'upload' ? (
                  <div>
                    <label
                      className={`flex flex-col items-center justify-center border-2 border-dashed border-neutral-200 rounded-xl p-4 text-center cursor-pointer transition-all bg-white hover:bg-[#FAF6EF]/40 hover:border-[#9C6B30] ${
                        uploadingPhoto ? 'opacity-60 pointer-events-none' : ''
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        onChange={handleLocalPhotoUpload}
                        className="hidden"
                      />
                      {uploadingPhoto ? (
                        <div className="py-2 flex flex-col items-center gap-1.5">
                          <Loader2 size={20} className="animate-spin text-[#9C6B30]" />
                          <span className="text-xs text-neutral-600 font-medium">Uploading photo from device...</span>
                        </div>
                      ) : (
                        <div className="py-1 flex flex-col items-center gap-1">
                          <div className="w-9 h-9 rounded-full bg-[#FAF6EF] flex items-center justify-center text-[#9C6B30] mb-0.5">
                            <Upload size={16} />
                          </div>
                          <span className="text-xs font-semibold text-neutral-800">
                            Upload photo locally from your device
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            Click to browse JPG, PNG, or WebP (up to 8MB)
                          </span>
                        </div>
                      )}
                    </label>
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      value={reviewForm.image}
                      onChange={e => setReviewForm(prev => ({ ...prev, image: e.target.value }))}
                      placeholder="https://example.com/my-jewellery-photo.jpg"
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[#9C6B30]"
                    />
                    <p className="text-[10px] text-neutral-400 mt-1">
                      Paste an image URL to show off your piece being worn.
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#E8E8E8]">
                {existingReview ? (
                  <button
                    type="button"
                    disabled={deletingReview || submittingReview}
                    onClick={handleDeleteReview}
                    className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                  >
                    {deletingReview ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    Delete Review
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={submittingReview || deletingReview}
                    onClick={closeReviewModal}
                    className="px-4 py-2 border border-[#E8E8E8] text-neutral-700 text-xs uppercase tracking-wider rounded-md hover:bg-neutral-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview || deletingReview}
                    className="px-5 py-2 bg-[#1A1A1A] text-white text-xs uppercase tracking-wider rounded-md hover:bg-[#9C6B30] transition font-medium flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submittingReview ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    {existingReview ? 'Update Review' : 'Submit Review'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default function OrderPage() { return <Suspense fallback={<div className="h-screen" />}><OrderInner /></Suspense>; }
