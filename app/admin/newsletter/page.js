'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Mail, Search, X, Download, Trash2, CheckCircle2, XCircle,
  Loader2, ChevronLeft, ChevronRight, RefreshCw, Filter, AlertTriangle,
  UserX, ArrowUpRight, Eye, CheckSquare, Square, History, ShieldCheck, HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminNewsletterPage() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFiltered, setTotalFiltered] = useState(0);

  const [stats, setStats] = useState({
    total: 0,
    subscribed: 0,
    unsubscribed: 0,
    newThisMonth: 0,
    growthPercent: 0,
    activeRate: 0
  });

  const [searchVal, setSearchVal] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Subscriber Detail Modal State
  const [detailSubscriber, setDetailSubscriber] = useState(null);

  // Confirmation Modals State
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    type: null, // 'delete' | 'unsubscribe' | 'bulk-delete' | 'bulk-unsubscribe'
    target: null
  });
  const [actionBusy, setActionBusy] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchVal);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchVal]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: search.trim(),
        status: statusFilter
      });

      const res = await fetch(`/api/admin/newsletter?${queryParams.toString()}`, {
        credentials: 'include',
        cache: 'no-store'
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSubscribers(data.data || data.subscribers || []);
        if (data.stats) {
          setStats(data.stats);
        }
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalFiltered(data.pagination.total || 0);
        }
      } else {
        toast.error(data.message || data.error || 'Failed to load subscribers.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error loading subscribers.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Select all logic
  const isAllSelected = subscribers.length > 0 && subscribers.every(s => selectedIds.has(s.id || s.email));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(subscribers.map(s => s.id || s.email)));
    }
  };

  const toggleSelectOne = (idKey) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(idKey)) {
        next.delete(idKey);
      } else {
        next.add(idKey);
      }
      return next;
    });
  };

  // Status toggle handler
  const handleToggleStatus = (subscriber) => {
    const newStatus = subscriber.status === 'subscribed' ? 'unsubscribed' : 'subscribed';
    if (newStatus === 'unsubscribed') {
      setConfirmModal({
        open: true,
        type: 'unsubscribe',
        target: subscriber
      });
    } else {
      executeStatusUpdate(subscriber.id || subscriber.email, 'subscribed');
    }
  };

  const executeStatusUpdate = async (idKey, newStatus) => {
    setUpdatingId(idKey);
    try {
      const res = await fetch(`/api/admin/newsletter/${idKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Subscriber status changed to ${newStatus}.`);
        loadData();
      } else {
        toast.error(data.message || data.error || 'Failed to update status.');
      }
    } catch (err) {
      toast.error('Network error updating status.');
    } finally {
      setUpdatingId(null);
      setConfirmModal({ open: false, type: null, target: null });
    }
  };

  // Bulk actions execution
  const executeBulkAction = async (actionType) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setActionBusy(true);
    try {
      const res = await fetch('/api/admin/newsletter/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids, action: actionType })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Bulk action completed successfully.');
        setSelectedIds(new Set());
        loadData();
      } else {
        toast.error(data.message || 'Failed to complete bulk action.');
      }
    } catch (err) {
      toast.error('Network error performing bulk action.');
    } finally {
      setActionBusy(false);
      setConfirmModal({ open: false, type: null, target: null });
    }
  };

  // Delete subscriber execution
  const executeDelete = async (idKey) => {
    setActionBusy(true);
    try {
      const res = await fetch(`/api/admin/newsletter/${idKey}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Subscriber permanently deleted.');
        setConfirmModal({ open: false, type: null, target: null });
        loadData();
      } else {
        toast.error(data.message || 'Failed to delete subscriber.');
      }
    } catch (err) {
      toast.error('Network error deleting subscriber.');
    } finally {
      setActionBusy(false);
    }
  };

  // CSV Export handler
  const handleExportCSV = async (customIds = null) => {
    setExporting(true);
    try {
      const queryParams = new URLSearchParams({
        search: search.trim(),
        status: statusFilter
      });
      if (Array.isArray(customIds) && customIds.length > 0) {
        queryParams.set('ids', customIds.join(','));
      }

      const res = await fetch(`/api/admin/newsletter/export?${queryParams.toString()}`, {
        credentials: 'include'
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.message || 'Failed to export subscribers.');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `newsletter_subscribers_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Subscribers CSV exported successfully!');
    } catch (err) {
      toast.error('Network error exporting CSV.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="font-display text-2xl xs:text-3xl sm:text-4xl text-[#1A1A1A]">
            Newsletter Subscribers
          </div>
          <div className="gold-line w-12 mt-2 mb-2" />
          <p className="text-xs sm:text-sm text-neutral-500 font-light">
            Manage atelier newsletter subscriptions, filter members, inspect consent, and export subscriber datasets.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs border border-neutral-200 rounded-lg bg-white text-neutral-700 hover:bg-neutral-50 transition"
            title="Refresh list"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => handleExportCSV()}
            disabled={exporting || loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-[#9C6B30] text-white hover:bg-[#855a28] transition shadow-xs disabled:opacity-60"
          >
            {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Total Subscribers</div>
          <div className="text-2xl font-bold text-neutral-900 mt-1">{stats.total.toLocaleString('en-IN')}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Active Subscribed</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{stats.subscribed.toLocaleString('en-IN')}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Unsubscribed</div>
          <div className="text-2xl font-bold text-neutral-600 mt-1">{stats.unsubscribed.toLocaleString('en-IN')}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9C6B30]">New This Month</div>
          <div className="text-2xl font-bold text-[#9C6B30] mt-1">{stats.newThisMonth.toLocaleString('en-IN')}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Growth %</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1 flex items-center gap-1">
            <span>+{stats.growthPercent}%</span>
            <ArrowUpRight size={16} />
          </div>
        </div>
      </div>

      {/* Controls Bar: Search & Status Filters & Bulk Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search subscribers by email..."
              className="w-full pl-9 pr-9 py-2 border border-neutral-200 rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:border-[#9C6B30] transition"
            />
            {searchVal && (
              <button
                onClick={() => setSearchVal('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg self-start md:self-auto">
            {['ALL', 'subscribed', 'unsubscribed'].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                  setSelectedIds(new Set());
                }}
                className={`px-3 py-1.5 rounded-md text-xs capitalize font-medium transition ${
                  statusFilter === st
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {st === 'ALL' ? 'All' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Action Bar (Visible when items selected) */}
        {selectedIds.size > 0 && (
          <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-3 bg-[#FAF6EF] p-2.5 rounded-lg border border-[#9C6B30]/20 animate-in fade-in">
            <div className="text-xs font-medium text-[#9C6B30] flex items-center gap-2">
              <CheckSquare size={15} />
              <span>Selected <strong>{selectedIds.size}</strong> subscriber(s)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportCSV(Array.from(selectedIds))}
                className="px-3 py-1.5 bg-white border border-neutral-200 rounded text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition"
              >
                Export Selected
              </button>
              <button
                onClick={() => setConfirmModal({ open: true, type: 'bulk-unsubscribe', target: null })}
                className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded text-xs font-medium hover:bg-amber-100 transition"
              >
                Bulk Unsubscribe
              </button>
              <button
                onClick={() => setConfirmModal({ open: true, type: 'bulk-delete', target: null })}
                className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition"
              >
                Bulk Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Subscriber Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="animate-spin inline text-[#9C6B30]" size={24} />
            <p className="text-xs text-neutral-500 mt-2 font-mono">Loading subscribers from MongoDB...</p>
          </div>
        ) : subscribers.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="mx-auto text-neutral-300 mb-2" size={32} />
            <div className="text-sm font-medium text-neutral-700">No subscribers found</div>
            <p className="text-xs text-neutral-400 mt-1">
              {search || statusFilter !== 'ALL'
                ? 'Try adjusting your search criteria or status filters.'
                : 'No newsletter subscribers have registered yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-neutral-50 text-[10px] tracking-widest uppercase text-neutral-500 border-b border-neutral-200">
                <tr>
                  <th className="p-3.5 pl-4 w-10 text-center">
                    <button onClick={toggleSelectAll} className="text-neutral-500 hover:text-neutral-900">
                      {isAllSelected ? <CheckSquare size={16} className="text-[#9C6B30]" /> : <Square size={16} />}
                    </button>
                  </th>
                  <th className="text-left p-3.5 min-w-[200px]">Subscriber Email</th>
                  <th className="text-left p-3.5 min-w-[120px]">Status</th>
                  <th className="text-left p-3.5 min-w-[130px]">Source</th>
                  <th className="text-left p-3.5 min-w-[140px]">Subscribed At</th>
                  <th className="text-left p-3.5 min-w-[140px]">Last Updated</th>
                  <th className="text-right p-3.5 pr-4 min-w-[140px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {subscribers.map((item) => {
                  const itemKey = item.id || item._id || item.email;
                  const isUpdating = updatingId === itemKey;
                  const isSelected = selectedIds.has(itemKey);
                  const subDate = item.subscribedAt ? new Date(item.subscribedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
                  const upDate = item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

                  return (
                    <tr key={itemKey} className={`hover:bg-neutral-50/60 transition-colors ${isSelected ? 'bg-[#FAF6EF]/50' : ''}`}>
                      <td className="p-3.5 pl-4 text-center">
                        <button onClick={() => toggleSelectOne(itemKey)} className="text-neutral-400 hover:text-neutral-800">
                          {isSelected ? <CheckSquare size={16} className="text-[#9C6B30]" /> : <Square size={16} />}
                        </button>
                      </td>

                      <td className="p-3.5">
                        <button
                          onClick={() => setDetailSubscriber(item)}
                          className="font-medium text-neutral-900 font-mono text-xs sm:text-sm truncate max-w-[260px] text-left hover:text-[#9C6B30] hover:underline"
                          title="Click to view subscriber details"
                        >
                          {item.email}
                        </button>
                      </td>

                      <td className="p-3.5">
                        {item.status === 'subscribed' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={10} /> Subscribed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-neutral-100 text-neutral-600 border border-neutral-200">
                            <XCircle size={10} /> Unsubscribed
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-neutral-600 font-mono text-xs">
                        {item.source || 'website-newsletter'}
                      </td>

                      <td className="p-3.5 text-neutral-600 text-xs">
                        {subDate}
                      </td>

                      <td className="p-3.5 text-neutral-500 text-xs">
                        {upDate}
                      </td>

                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setDetailSubscriber(item)}
                            className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded transition"
                            title="View details"
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(item)}
                            disabled={isUpdating}
                            className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                              item.status === 'subscribed'
                                ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                            title={item.status === 'subscribed' ? 'Unsubscribe member' : 'Re-subscribe member'}
                          >
                            {isUpdating ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : item.status === 'subscribed' ? (
                              'Unsubscribe'
                            ) : (
                              'Subscribe'
                            )}
                          </button>

                          <button
                            onClick={() => setConfirmModal({ open: true, type: 'delete', target: item })}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition"
                            title="Delete subscriber permanently"
                          >
                            <Trash2 size={14} />
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

        {/* Pagination Footer */}
        {!loading && subscribers.length > 0 && (
          <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-600">
            <div>
              Showing <span className="font-semibold">{subscribers.length}</span> of <span className="font-semibold">{totalFiltered}</span> subscribers
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span>Per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-white border border-neutral-200 rounded px-2 py-1 focus:outline-none text-xs"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1 rounded border border-neutral-200 bg-white hover:bg-neutral-100 disabled:opacity-40 transition"
                  title="Previous page"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-2 font-mono">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1 rounded border border-neutral-200 bg-white hover:bg-neutral-100 disabled:opacity-40 transition"
                  title="Next page"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Subscriber Detail Drawer / Modal */}
      {detailSubscriber && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-neutral-200 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Mail size={18} className="text-[#9C6B30]" />
                <h3 className="text-base font-semibold text-neutral-900">Subscriber Details</h3>
              </div>
              <button onClick={() => setDetailSubscriber(null)} className="text-neutral-400 hover:text-neutral-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-neutral-500 uppercase tracking-wider font-semibold text-[10px]">Subscriber Email</span>
                <div className="font-mono text-sm font-semibold text-neutral-900 mt-0.5">{detailSubscriber.email}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-neutral-500 uppercase tracking-wider font-semibold text-[10px]">Subscription Status</span>
                  <div className="mt-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${detailSubscriber.status === 'subscribed' ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-700'}`}>
                      {detailSubscriber.status}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-neutral-500 uppercase tracking-wider font-semibold text-[10px]">Marketing Consent</span>
                  <div className="mt-1 flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                    <ShieldCheck size={14} /> Granted
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-neutral-500 uppercase tracking-wider font-semibold text-[10px]">Source</span>
                  <div className="font-mono text-neutral-700 mt-0.5">{detailSubscriber.source || 'website-newsletter'}</div>
                </div>

                <div>
                  <span className="text-neutral-500 uppercase tracking-wider font-semibold text-[10px]">Verification Status</span>
                  <div className="font-mono text-emerald-700 font-semibold mt-0.5">{detailSubscriber.verificationStatus || 'verified'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-100">
                <div>
                  <span className="text-neutral-500 uppercase tracking-wider font-semibold text-[10px]">Subscribed At</span>
                  <div className="text-neutral-700 mt-0.5">
                    {detailSubscriber.subscribedAt ? new Date(detailSubscriber.subscribedAt).toLocaleString('en-IN') : '—'}
                  </div>
                </div>

                <div>
                  <span className="text-neutral-500 uppercase tracking-wider font-semibold text-[10px]">Last Updated</span>
                  <div className="text-neutral-700 mt-0.5">
                    {detailSubscriber.updatedAt ? new Date(detailSubscriber.updatedAt).toLocaleString('en-IN') : '—'}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 flex justify-end">
              <button
                onClick={() => setDetailSubscriber(null)}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Unsubscribe / Delete Actions */}
      {confirmModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-neutral-200 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${confirmModal.type?.includes('delete') ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-neutral-900">
                  {confirmModal.type === 'delete' ? 'Delete Subscriber' :
                   confirmModal.type === 'bulk-delete' ? 'Bulk Delete Subscribers' :
                   confirmModal.type === 'bulk-unsubscribe' ? 'Bulk Unsubscribe Members' :
                   'Unsubscribe Subscriber'}
                </h3>
                <p className="text-xs text-neutral-500">Confirmation required</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              {confirmModal.type === 'delete' && (
                <>Are you sure you want to permanently delete <strong className="font-mono text-neutral-900">{confirmModal.target?.email}</strong>? This record will be permanently removed.</>
              )}
              {confirmModal.type === 'unsubscribe' && (
                <>Are you sure you want to change subscription status for <strong className="font-mono text-neutral-900">{confirmModal.target?.email}</strong> to <strong className="text-amber-700 font-semibold">unsubscribed</strong>? The subscriber record will be retained for future resubscription.</>
              )}
              {confirmModal.type === 'bulk-delete' && (
                <>Are you sure you want to permanently delete <strong className="text-red-600 font-semibold">{selectedIds.size}</strong> selected subscriber(s)? This action cannot be undone.</>
              )}
              {confirmModal.type === 'bulk-unsubscribe' && (
                <>Are you sure you want to change status to <strong className="text-amber-700 font-semibold">unsubscribed</strong> for <strong className="font-semibold">{selectedIds.size}</strong> selected member(s)?</>
              )}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmModal({ open: false, type: null, target: null })}
                disabled={actionBusy}
                className="px-4 py-2 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  if (confirmModal.type === 'delete') executeDelete(confirmModal.target.id || confirmModal.target.email);
                  else if (confirmModal.type === 'unsubscribe') executeStatusUpdate(confirmModal.target.id || confirmModal.target.email, 'unsubscribed');
                  else if (confirmModal.type === 'bulk-delete') executeBulkAction('bulk-delete');
                  else if (confirmModal.type === 'bulk-unsubscribe') executeBulkAction('bulk-unsubscribe');
                }}
                disabled={actionBusy}
                className={`px-4 py-2 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5 shadow-xs disabled:opacity-60 ${
                  confirmModal.type?.includes('delete') ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-700 hover:bg-amber-800'
                }`}
              >
                {actionBusy ? <Loader2 size={13} className="animate-spin" /> : null}
                <span>Confirm {confirmModal.type?.includes('delete') ? 'Delete' : 'Unsubscribe'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
