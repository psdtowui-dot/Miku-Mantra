'use client';
import { useEffect, useState } from 'react';
import { formatINR } from '@/lib/products';
import { Loader2, Search, X, CheckCircle2, XCircle, RotateCcw, AlertTriangle, ShieldCheck, DollarSign, PackageCheck, History, Eye, EyeOff, Copy, ArrowRight, Camera, Image as ImageIcon, ExternalLink, CreditCard, Smartphone, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_FILTERS = [
  { key: 'ALL', label: 'All Returns' },
  { key: 'REQUESTED', label: 'Requested' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REFUND_DETAILS_SUBMITTED', label: 'Details Submitted' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'REFUNDED', label: 'Refunded' },
  { key: 'REJECTED', label: 'Rejected' },
];

const REJECTION_REASONS = [
  'Return window expired',
  'Product condition not acceptable',
  'Invalid return reason',
  'Other'
];

export default function AdminReturns() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchVal, setSearchVal] = useState('');
  const [search, setSearch] = useState('');

  // Active detail modal
  const [activeReturn, setActiveReturn] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [showFullAccountNumber, setShowFullAccountNumber] = useState(false);

  // Sub-modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);

  const [rejectionReason, setRejectionReason] = useState(REJECTION_REASONS[0]);
  const [customRejectionNote, setCustomRejectionNote] = useState('');
  const [selectedClassification, setSelectedClassification] = useState('Resellable');

  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const url = `/api/admin/returns?status=${encodeURIComponent(statusFilter)}&search=${encodeURIComponent(search)}`;
      const r = await fetch(url, { credentials: 'include', cache: 'no-store' });
      const d = await r.json();
      const returns = d.returns || [];
      setList(returns);

      if (activeReturn) {
        const cur = returns.find(r => r.id === activeReturn.id);
        if (cur) setActiveReturn(cur);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load return requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchVal);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchVal]);

  useEffect(() => {
    load();
  }, [statusFilter, search]);

  const loadAuditLogs = async (returnId) => {
    setLoadingAudit(true);
    try {
      const r = await fetch(`/api/admin/returns/${returnId}/audit-logs`, { credentials: 'include' });
      const d = await r.json();
      setAuditLogs(d.auditLogs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const openDetailModal = (ret) => {
    setActiveReturn(ret);
    setShowFullAccountNumber(false);
    loadAuditLogs(ret.id);
  };

  // Action Handlers
  const handleApprove = async () => {
    if (!activeReturn || submitting) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/admin/returns/${activeReturn.id}/approve`, {
        method: 'POST',
        credentials: 'include'
      });
      const d = await r.json();
      if (r.ok && d.return) {
        toast.success('Return request approved successfully.');
        setActiveReturn(d.return);
        setShowApproveModal(false);
        load();
        loadAuditLogs(d.return.id);
      } else {
        toast.error(d.error || 'Failed to approve return request.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error during approval.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!activeReturn || submitting) return;
    const finalReason = rejectionReason === 'Other' ? (customRejectionNote.trim() || 'Other') : rejectionReason;
    if (!finalReason) {
      toast.error('Please select or enter a rejection reason.');
      return;
    }

    setSubmitting(true);
    try {
      const r = await fetch(`/api/admin/returns/${activeReturn.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rejectionReason: finalReason })
      });
      const d = await r.json();
      if (r.ok && d.return) {
        toast.success('Return request rejected.');
        setActiveReturn(d.return);
        setShowRejectModal(false);
        load();
        loadAuditLogs(d.return.id);
      } else {
        toast.error(d.error || 'Failed to reject return request.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error during rejection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcessStatus = async (targetStatus) => {
    if (!activeReturn || submitting) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/admin/returns/${activeReturn.id}/process-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: targetStatus })
      });
      const d = await r.json();
      if (r.ok && d.return) {
        toast.success(`Return status updated to ${targetStatus}`);
        setActiveReturn(d.return);
        load();
        loadAuditLogs(d.return.id);
      } else {
        toast.error(d.error || 'Failed to update return status.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInitiateRefund = async () => {
    if (!activeReturn || submitting) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/admin/returns/${activeReturn.id}/refund`, {
        method: 'POST',
        credentials: 'include'
      });
      const d = await r.json();
      if (r.ok && d.return) {
        if (d.return.refundStatus === 'COMPLETED') {
          toast.success('Refund completed successfully!');
        } else {
          toast.error(`Refund failed: ${d.return.refundFailureReason || 'Gateway error'}`);
        }
        setActiveReturn(d.return);
        load();
        loadAuditLogs(d.return.id);
      } else {
        toast.error(d.error || 'Refund initiation failed.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error initiating refund.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInventoryClassification = async () => {
    if (!activeReturn || submitting) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/admin/returns/${activeReturn.id}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ classification: selectedClassification })
      });
      const d = await r.json();
      if (r.ok && d.return) {
        toast.success(d.message || 'Inventory classified successfully.');
        setActiveReturn(d.return);
        setShowInventoryModal(false);
        load();
        loadAuditLogs(d.return.id);
      } else {
        toast.error(d.error || 'Failed to classify inventory.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error during inventory classification.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
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
        return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center flex-wrap gap-4 mb-2">
        <div>
          <h1 className="font-display text-2xl xs:text-3xl sm:text-4xl text-[#1A1A1A]">Return Requests</h1>
          <div className="gold-line w-12 mt-2" />
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="mt-6 mb-6 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none border-b md:border-b-0 border-neutral-200">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === f.key
                  ? 'bg-[#0F0F10] text-[#D4AF37]'
                  : 'text-neutral-600 hover:bg-neutral-200/60'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            placeholder="Search return ID, order number, customer..."
            className="w-full pl-9 pr-10 py-2 border border-neutral-200 rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:border-[#9C6B30] transition-all"
          />
          {searchVal && (
            <button
              onClick={() => setSearchVal('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="animate-spin inline text-[#9C6B30]" size={28} />
          </div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 text-sm">
            No return requests found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead className="bg-neutral-50 text-[10px] tracking-widest uppercase text-neutral-500 border-b border-neutral-200">
                <tr>
                  <th className="p-3.5">Return ID / Order</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Product & Qty</th>
                  <th className="p-3.5">Delivered / Requested</th>
                  <th className="p-3.5 text-right">Refund Amount</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-neutral-700">
                {list.map(r => (
                  <tr key={r.id} className="hover:bg-neutral-50/70 transition">
                    <td className="p-3.5">
                      <div className="font-mono text-xs font-semibold text-neutral-900">{r.returnId || r.id}</div>
                      <div className="text-[11px] text-neutral-500 font-sans">Order #{r.orderNumber}</div>
                      {Array.isArray(r.images) && r.images.length > 0 && (
                        <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-[#9C6B30] bg-[#FAF6EF] px-1.5 py-0.5 rounded border border-[#9C6B30]/30 font-medium">
                          <Camera size={11} /> {r.images.length} {r.images.length === 1 ? 'photo' : 'photos'}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-neutral-900">{r.customerName}</div>
                      <div className="text-[11px] text-neutral-500">{r.customerEmail}</div>
                    </td>
                    <td className="p-3.5">
                      {(r.items || []).map((it, idx) => (
                        <div key={idx} className="text-xs">
                          <span className="font-medium">{it.name}</span>{' '}
                          <span className="text-neutral-500">× {it.returnQty}</span>
                        </div>
                      ))}
                    </td>
                    <td className="p-3.5 text-xs text-neutral-600">
                      <div>Req: {new Date(r.requestedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                      {r.deliveredAt && (
                        <div className="text-[11px] text-neutral-400">Del: {new Date(r.deliveredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-medium text-[#9C6B30]">
                      {formatINR(r.refundAmount || 0)}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-block px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full border ${getStatusBadge(r.returnStatus)}`}>
                          {r.returnStatus}
                        </span>
                        <div>
                          {r.refundDetails || r.refundDetailsStatus === 'SUBMITTED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-semibold tracking-wider uppercase rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 size={10} /> Details: Submitted
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 text-[9px] font-medium tracking-wider uppercase rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
                              Details: Pending
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => openDetailModal(r)}
                        className="px-3 py-1.5 border border-neutral-300 rounded-md text-xs hover:bg-[#0F0F10] hover:text-[#D4AF37] hover:border-[#0F0F10] transition flex items-center gap-1.5 mx-auto font-medium cursor-pointer"
                      >
                        <Eye size={13} /> Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Main Review & Detail Drawer/Modal */}
      {activeReturn && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={() => setActiveReturn(null)}>
          <div className="bg-white text-[#1A1A1A] w-full max-w-3xl rounded-xl border border-neutral-200 overflow-hidden shadow-2xl my-8" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-[#0F0F10] text-white p-5 flex justify-between items-start">
              <div>
                <div className="text-[10px] tracking-widest uppercase text-[#D4AF37] font-semibold">Return Review & Processing</div>
                <h2 className="font-display text-xl sm:text-2xl font-light">Return #{activeReturn.returnId || activeReturn.id}</h2>
                <div className="text-xs text-white/60 mt-0.5">Order #{activeReturn.orderNumber} • Customer: {activeReturn.customerName} ({activeReturn.customerEmail})</div>
              </div>
              <button onClick={() => setActiveReturn(null)} className="text-white/60 hover:text-white transition p-1 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Return Status Banners */}
              <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-xs">
                <div>
                  <span className="text-neutral-500 uppercase tracking-wider text-[10px]">Return Lifecycle Status</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border uppercase ${getStatusBadge(activeReturn.returnStatus)}`}>
                      {activeReturn.returnStatus}
                    </span>
                    <span className="text-neutral-500">• Payment Method: <strong className="uppercase text-neutral-800">{activeReturn.paymentMethod || 'COD'}</strong></span>
                  </div>
                </div>
                <div>
                  <span className="text-neutral-500 uppercase tracking-wider text-[10px]">Calculated Refund</span>
                  <div className="font-display text-xl text-[#9C6B30] font-semibold">{formatINR(activeReturn.refundAmount)}</div>
                </div>
              </div>

              {/* Rejection notice if rejected */}
              {activeReturn.returnStatus === 'REJECTED' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs space-y-1">
                  <div className="font-semibold text-red-800 flex items-center gap-1.5">
                    <XCircle size={16} /> Return Request Rejected
                  </div>
                  <p className="text-neutral-700">Reason: <span className="font-medium text-red-900">{activeReturn.rejectionReason}</span></p>
                  {activeReturn.rejectedAt && (
                    <p className="text-[11px] text-neutral-500">Rejected on {new Date(activeReturn.rejectedAt).toLocaleString('en-IN')}</p>
                  )}
                </div>
              )}

              {/* Items Table */}
              <div>
                <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Returned Products & Quantity</h4>
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-neutral-50 text-[10px] uppercase text-neutral-500 border-b border-neutral-200">
                      <tr>
                        <th className="p-2.5">Product</th>
                        <th className="p-2.5 text-center">Purchased</th>
                        <th className="p-2.5 text-center">Returned Qty</th>
                        <th className="p-2.5 text-right">Unit Price</th>
                        <th className="p-2.5 text-right">Calculated Refund</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {(activeReturn.items || []).map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 flex items-center gap-2">
                            {it.image && <img src={it.image} className="w-8 h-8 rounded object-cover border border-neutral-200" />}
                            <span className="font-medium text-neutral-900">{it.name}</span>
                          </td>
                          <td className="p-2.5 text-center text-neutral-500">{it.purchasedQty || it.returnQty}</td>
                          <td className="p-2.5 text-center font-bold text-[#9C6B30]">{it.returnQty}</td>
                          <td className="p-2.5 text-right">{formatINR(it.price)}</td>
                          <td className="p-2.5 text-right font-medium text-neutral-900">{formatINR(it.itemRefundAmount || (it.price * it.returnQty))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Customer Reason & Comments */}
              <div className="grid md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 border border-neutral-200 rounded-xl bg-neutral-50/50">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold mb-1">Return Reason</div>
                  <div className="font-medium text-neutral-900">{activeReturn.reason}</div>
                  {activeReturn.comment && (
                    <div className="mt-2 text-neutral-600 italic bg-white p-2.5 rounded border border-neutral-200">
                      "{activeReturn.comment}"
                    </div>
                  )}
                </div>
                <div className="p-3.5 border border-neutral-200 rounded-xl bg-neutral-50/50 space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">Timeline Info</div>
                  <div>Delivered At: <span className="font-medium text-neutral-800">{activeReturn.deliveredAt ? new Date(activeReturn.deliveredAt).toLocaleString('en-IN') : 'N/A'}</span></div>
                  <div>Return Requested At: <span className="font-medium text-neutral-800">{new Date(activeReturn.requestedAt).toLocaleString('en-IN')}</span></div>
                </div>
              </div>

              {/* Customer Uploaded Product Photos & Evidence */}
              <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera size={16} className="text-[#9C6B30]" />
                    <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                      Customer Product Photos & Evidence
                    </h4>
                  </div>
                  {Array.isArray(activeReturn.images) && activeReturn.images.length > 0 && (
                    <span className="text-[10px] bg-[#9C6B30]/10 text-[#9C6B30] font-semibold px-2 py-0.5 rounded-full border border-[#9C6B30]/30">
                      {activeReturn.images.length} {activeReturn.images.length === 1 ? 'Photo' : 'Photos'}
                    </span>
                  )}
                </div>

                {Array.isArray(activeReturn.images) && activeReturn.images.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {activeReturn.images.map((imgUrl, i) => (
                      <div key={i} className="group relative border border-neutral-200 rounded-lg overflow-hidden bg-white shadow-xs">
                        <img
                          src={imgUrl}
                          alt={`Customer proof ${i + 1}`}
                          className="w-full h-28 sm:h-32 object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <a
                          href={imgUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-medium gap-1.5 backdrop-blur-[1px]"
                        >
                          <Eye size={13} /> View Full
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-white border border-neutral-200 rounded-lg text-xs text-neutral-500 italic flex items-center gap-2">
                    <ImageIcon size={14} className="text-neutral-400 shrink-0" />
                    <span>No product photos were uploaded by the customer for this return request.</span>
                  </div>
                )}
              </div>

              {/* Customer Refund Payout Details Card */}
              <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/70 space-y-3">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CreditCard size={18} className="text-[#9C6B30]" />
                    <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                      Customer Refund Payout Details
                    </h4>
                  </div>
                  {activeReturn.refundDetails || activeReturn.refundDetailsStatus === 'SUBMITTED' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 size={11} /> Refund Details: Submitted
                    </span>
                  ) : (
                    <span className="inline-block px-2.5 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                      Refund Details: Pending
                    </span>
                  )}
                </div>

                {activeReturn.refundDetails ? (
                  <div className="p-3.5 bg-white border border-neutral-200 rounded-lg space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-medium text-neutral-900 pb-2 border-b border-neutral-100">
                      {activeReturn.refundDetails.method === 'upi' ? (
                        <span className="flex items-center gap-1.5 text-blue-700 font-semibold">
                          <Smartphone size={14} /> Method: UPI Transfer
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-purple-700 font-semibold">
                          <Building2 size={14} /> Method: Direct Bank Transfer (NEFT/IMPS)
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {activeReturn.refundDetails.method === 'upi' ? (
                        <div>
                          <span className="text-[10px] uppercase text-neutral-400 font-medium block">UPI ID (VPA)</span>
                          <span className="font-mono text-sm font-semibold text-neutral-900 select-all">{activeReturn.refundDetails.upiId}</span>
                        </div>
                      ) : (
                        <>
                          <div>
                            <span className="text-[10px] uppercase text-neutral-400 font-medium block">Account Holder Name</span>
                            <span className="font-medium text-neutral-900">{activeReturn.refundDetails.accountHolderName}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-neutral-400 font-medium block">Bank Account Number</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-sm font-semibold text-neutral-900 select-all">
                                {showFullAccountNumber && activeReturn.refundDetails.accountNumber
                                  ? activeReturn.refundDetails.accountNumber
                                  : (activeReturn.refundDetails.accountNumberMasked || (activeReturn.refundDetails.accountNumber ? `XXXX XXXX ${activeReturn.refundDetails.accountNumber.slice(-4)}` : 'XXXX XXXX'))}
                              </span>
                              {activeReturn.refundDetails.accountNumber && (
                                <button
                                  type="button"
                                  onClick={() => setShowFullAccountNumber(!showFullAccountNumber)}
                                  className="p-1 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-md transition cursor-pointer"
                                  title={showFullAccountNumber ? "Hide full account number" : "Show full account number"}
                                >
                                  {showFullAccountNumber ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                              )}
                              {showFullAccountNumber && activeReturn.refundDetails.accountNumber && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(activeReturn.refundDetails.accountNumber);
                                    toast.success('Account number copied to clipboard');
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-[#9C6B30] hover:text-[#7A501F] bg-[#FAF6EF] border border-[#9C6B30]/30 rounded font-medium cursor-pointer transition"
                                  title="Copy full account number"
                                >
                                  <Copy size={11} /> Copy
                                </button>
                              )}
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-neutral-400 font-medium block">Bank Name</span>
                            <span className="font-medium text-neutral-900">{activeReturn.refundDetails.bankName}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-neutral-400 font-medium block">IFSC Code</span>
                            <span className="font-mono font-semibold text-neutral-900 select-all">{activeReturn.refundDetails.ifscCode}</span>
                          </div>
                        </>
                      )}
                      <div>
                        <span className="text-[10px] uppercase text-neutral-400 font-medium block">Submitted At</span>
                        <span className="text-neutral-700">
                          {activeReturn.refundDetails.submittedAt ? new Date(activeReturn.refundDetails.submittedAt).toLocaleString('en-IN') : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white border border-neutral-200 rounded-lg text-xs text-neutral-500 italic">
                    Customer has not submitted refund details yet. The refund payout form becomes available to the customer once this return request is approved.
                  </div>
                )}
              </div>

              {/* Refund Section & Status */}
              <div className="border border-neutral-200 rounded-xl p-4 bg-amber-50/30 space-y-3">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <DollarSign size={18} className="text-[#9C6B30]" />
                    <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Refund Management</h4>
                  </div>
                  <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded uppercase tracking-wider border ${
                    activeReturn.refundStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                    activeReturn.refundStatus === 'FAILED' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    Refund Status: {activeReturn.refundStatus}
                  </span>
                </div>

                {activeReturn.gatewayRefundId && (
                  <div className="text-xs text-neutral-600 font-mono">
                    Gateway Refund Ref ID: <span className="font-semibold text-neutral-900">{activeReturn.gatewayRefundId}</span>
                  </div>
                )}

                {activeReturn.refundFailureReason && (
                  <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200">
                    <strong>Refund Failed:</strong> {activeReturn.refundFailureReason}
                  </div>
                )}

                {/* Refund Buttons */}
                {['APPROVED', 'RETURN_APPROVED', 'REFUND_DETAILS_SUBMITTED', 'PROCESSING', 'REFUND_INITIATED'].includes(activeReturn.returnStatus) && activeReturn.refundStatus !== 'COMPLETED' && (
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      disabled={submitting}
                      onClick={handleInitiateRefund}
                      className="px-4 py-2 bg-[#0F0F10] text-[#D4AF37] hover:bg-black text-xs font-semibold rounded-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="animate-spin" size={14} /> : <ShieldCheck size={14} />}
                      {activeReturn.refundStatus === 'FAILED' ? 'Retry Refund' : 'Initiate Refund'}
                    </button>
                    <span className="text-[11px] text-neutral-500">Idempotent processing via payment gateway.</span>
                  </div>
                )}
              </div>

              {/* Physical Inventory Restocking Controls */}
              <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50 space-y-3">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <PackageCheck size={18} className="text-[#9C6B30]" />
                    <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Physical Inventory Control</h4>
                  </div>
                  <span className="text-xs font-medium text-neutral-600">
                    Status: <strong className="uppercase">{activeReturn.inventoryStatus || 'PENDING'}</strong>
                    {activeReturn.inventoryClassification && <span> ({activeReturn.inventoryClassification})</span>}
                  </span>
                </div>

                {activeReturn.inventoryRestocked ? (
                  <div className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded border border-emerald-200 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    Inventory has been processed and classified as <strong className="font-semibold">{activeReturn.inventoryClassification}</strong>. Stock update completed.
                  </div>
                ) : (
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={() => setShowInventoryModal(true)}
                      className="px-4 py-2 border border-neutral-300 hover:border-neutral-800 text-xs font-medium rounded-md transition bg-white text-neutral-800 cursor-pointer"
                    >
                      Classify & Restock Physical Item
                    </button>
                    <span className="text-[11px] text-neutral-500">Only items marked as <strong>Resellable</strong> return to available inventory.</span>
                  </div>
                )}
              </div>

              {/* Audit Trail Log */}
              <div>
                <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <History size={14} /> Audit Trail & Lifecycle History
                </h4>
                {loadingAudit ? (
                  <Loader2 className="animate-spin text-neutral-400" size={18} />
                ) : auditLogs.length === 0 ? (
                  <div className="text-xs text-neutral-400 italic">No audit records found.</div>
                ) : (
                  <div className="border border-neutral-200 rounded-xl p-4 bg-white max-h-48 overflow-y-auto space-y-3">
                    {auditLogs.map((log, idx) => (
                      <div key={idx} className="text-xs border-b border-neutral-100 last:border-0 pb-2.5 last:pb-0">
                        <div className="flex justify-between items-center text-neutral-900 font-medium">
                          <span className="capitalize">{log.action?.replace(/_/g, ' ')}</span>
                          <span className="text-[10px] text-neutral-400">{new Date(log.timestamp).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">
                          Performed by: <span className="font-mono text-neutral-700">{log.performedBy}</span>
                          {log.oldStatus && log.newStatus && <span> • {log.oldStatus} → {log.newStatus}</span>}
                          {log.reason && <span className="italic"> ({log.reason})</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Action Bar */}
            <div className="bg-neutral-100 p-4 border-t border-neutral-200 flex justify-between items-center flex-wrap gap-3">
              <button onClick={() => setActiveReturn(null)} className="px-4 py-2 border border-neutral-300 text-xs font-medium rounded-md hover:bg-white transition cursor-pointer">
                Close
              </button>

              <div className="flex items-center gap-3">
                {['REQUESTED', 'RETURN_REQUESTED'].includes(activeReturn.returnStatus) && (
                  <>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 text-xs font-semibold rounded-md transition cursor-pointer"
                    >
                      Reject Return
                    </button>
                    <button
                      onClick={() => setShowApproveModal(true)}
                      className="px-5 py-2 bg-[#0F0F10] text-[#D4AF37] hover:bg-black text-xs font-semibold rounded-md transition cursor-pointer"
                    >
                      Approve Return
                    </button>
                  </>
                )}

                {['APPROVED', 'RETURN_APPROVED', 'REFUND_DETAILS_SUBMITTED'].includes(activeReturn.returnStatus) && (
                  <button
                    onClick={() => handleProcessStatus('PROCESSING')}
                    className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 text-xs font-semibold rounded-md transition cursor-pointer"
                  >
                    Move to Processing
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Approval */}
      {showApproveModal && activeReturn && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-neutral-200">
            <h3 className="font-display text-lg font-bold text-neutral-900">Approve Return Request</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Are you sure you want to approve this return request for <strong>Order #{activeReturn.orderNumber}</strong>?
            </p>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
              Refund Amount: <strong className="font-display text-base text-[#9C6B30]">{formatINR(activeReturn.refundAmount)}</strong>
            </div>

            {/* Customer Uploaded Product Photos displayed at approval */}
            {Array.isArray(activeReturn.images) && activeReturn.images.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-neutral-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                    <Camera size={13} className="text-[#9C6B30]" /> Customer Product Photo{activeReturn.images.length > 1 ? 's' : ''} ({activeReturn.images.length})
                  </span>
                  <span className="text-[10px] text-neutral-400">Click to view full size</span>
                </div>
                <div className="flex gap-2.5 overflow-x-auto pb-1 pt-0.5">
                  {activeReturn.images.map((imgUrl, i) => (
                    <a
                      key={i}
                      href={imgUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative block w-20 h-20 rounded-lg overflow-hidden border border-neutral-300 group shrink-0 shadow-xs"
                      title="Click to view full image"
                    >
                      <img
                        src={imgUrl}
                        alt={`Return proof ${i + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] gap-1 transition">
                        <Eye size={12} />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200 text-neutral-500 text-xs italic flex items-center gap-1.5">
                <ImageIcon size={14} className="text-neutral-400 shrink-0" />
                <span>No customer product photos uploaded.</span>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button disabled={submitting} onClick={() => setShowApproveModal(false)} className="px-4 py-2 border border-neutral-300 text-xs rounded-md hover:bg-neutral-50 cursor-pointer">
                Cancel
              </button>
              <button disabled={submitting} onClick={handleApprove} className="px-5 py-2 bg-[#0F0F10] text-[#D4AF37] hover:bg-black text-xs font-semibold rounded-md cursor-pointer flex items-center gap-2">
                {submitting && <Loader2 className="animate-spin" size={14} />} Approve Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog for Rejection */}
      {showRejectModal && activeReturn && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-neutral-200">
            <h3 className="font-display text-lg font-bold text-red-900">Reject Return Request</h3>
            <p className="text-xs text-neutral-600">
              Please select or specify a reason for rejecting the return request for <strong>Order #{activeReturn.orderNumber}</strong>:
            </p>
            <div className="space-y-2 text-xs">
              <select
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                className="w-full p-2.5 border border-neutral-300 rounded-md text-xs focus:outline-none focus:border-[#9C6B30]"
              >
                {REJECTION_REASONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {rejectionReason === 'Other' && (
                <textarea
                  value={customRejectionNote}
                  onChange={e => setCustomRejectionNote(e.target.value)}
                  placeholder="Enter rejection reason details..."
                  className="w-full p-2.5 border border-neutral-300 rounded-md text-xs h-20 focus:outline-none focus:border-[#9C6B30]"
                />
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button disabled={submitting} onClick={() => setShowRejectModal(false)} className="px-4 py-2 border border-neutral-300 text-xs rounded-md hover:bg-neutral-50 cursor-pointer">
                Cancel
              </button>
              <button disabled={submitting} onClick={handleReject} className="px-5 py-2 bg-red-600 text-white hover:bg-red-700 text-xs font-semibold rounded-md cursor-pointer flex items-center gap-2">
                {submitting && <Loader2 className="animate-spin" size={14} />} Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog for Inventory Classification */}
      {showInventoryModal && activeReturn && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-neutral-200">
            <h3 className="font-display text-lg font-bold text-neutral-900">Physical Inventory Classification</h3>
            <p className="text-xs text-neutral-600">
              Classify the condition of the returned physical products upon receipt:
            </p>
            <div className="space-y-2 text-xs">
              {['Resellable', 'Damaged', 'Defective', 'Not Resellable'].map(opt => (
                <label key={opt} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${selectedClassification === opt ? 'border-[#9C6B30] bg-amber-50/50 font-medium' : 'border-neutral-200'}`}>
                  <input
                    type="radio"
                    name="classification"
                    value={opt}
                    checked={selectedClassification === opt}
                    onChange={() => setSelectedClassification(opt)}
                    className="accent-[#9C6B30]"
                  />
                  <div>
                    <div className="text-neutral-900">{opt}</div>
                    <div className="text-[10px] text-neutral-400">
                      {opt === 'Resellable' ? 'Restocks returned items to available inventory.' : 'Does NOT restock to available inventory.'}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button disabled={submitting} onClick={() => setShowInventoryModal(false)} className="px-4 py-2 border border-neutral-300 text-xs rounded-md hover:bg-neutral-50 cursor-pointer">
                Cancel
              </button>
              <button disabled={submitting} onClick={handleInventoryClassification} className="px-5 py-2 bg-[#0F0F10] text-[#D4AF37] hover:bg-black text-xs font-semibold rounded-md cursor-pointer flex items-center gap-2">
                {submitting && <Loader2 className="animate-spin" size={14} />} Save Classification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
