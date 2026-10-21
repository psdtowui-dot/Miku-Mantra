'use client';
import { useEffect, useState } from 'react';
import {
  ScrollText, Search, X, Loader2, ChevronLeft, ChevronRight,
  Eye, Calendar, User, ShieldAlert, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminActivityLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const limit = 20;

  // Filters
  const [searchVal, setSearchVal] = useState('');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [moduleFilter, setModuleFilter] = useState('ALL');

  // Details Modal
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchVal);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchVal]);

  const loadLogs = async (pg = page, s = search, act = actionFilter, mod = moduleFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pg),
        limit: String(limit),
        search: s,
        action: act,
        module: mod
      });
      const res = await fetch(`/api/admin/activity-logs?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store'
      });
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else {
        toast.error(data.error || 'Failed to load activity logs');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error fetching activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(page, search, actionFilter, moduleFilter);
  }, [page, search, actionFilter, moduleFilter]);

  const formatDate = (val) => {
    if (!val) return '—';
    try {
      const d = new Date(val);
      return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN');
    } catch {
      return '—';
    }
  };

  const getActionBadge = (action) => {
    if (!action || typeof action !== 'string') {
      return 'bg-neutral-50 text-neutral-700 border-neutral-200';
    }
    const act = action.toUpperCase();
    if (act.includes('CREATED') || act.includes('ENABLED') || act.includes('APPROVED')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (act.includes('DELETED') || act.includes('DISABLED') || act.includes('REJECTED') || act.includes('CANCELLED')) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="font-display text-2xl xs:text-3xl sm:text-4xl text-[#1A1A1A]">Admin Activity Logs</div>
          <div className="gold-line w-12 mt-2 mb-2 sm:mb-4" />
          <p className="text-xs sm:text-sm text-neutral-500">
            Immutable audit trail of administrator provisioning, role adjustments, status changes, and permission configurations.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-neutral-200 p-3.5 xs:p-4 my-6 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search by admin name, email, target, or action..."
              className="w-full pl-9 pr-10 py-2 border border-neutral-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#9C6B30] transition-all"
            />
            {searchVal && (
              <button
                onClick={() => setSearchVal('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="w-full py-2 px-3 border border-neutral-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#9C6B30] bg-white transition-all"
            >
              <option value="ALL">All Actions</option>
              <option value="ADMIN_CREATED">Admin Created</option>
              <option value="ADMIN_UPDATED">Admin Updated</option>
              <option value="ADMIN_ENABLED">Admin Enabled</option>
              <option value="ADMIN_DISABLED">Admin Disabled</option>
              <option value="ADMIN_DELETED">Admin Deleted</option>
              <option value="ROLE_CREATED">Role Created</option>
              <option value="ROLE_UPDATED">Role Updated</option>
              <option value="ROLE_DELETED">Role Deleted</option>
              <option value="PERMISSIONS_UPDATED">Permissions Updated</option>
            </select>
          </div>

          {/* Module Filter */}
          <div>
            <select
              value={moduleFilter}
              onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
              className="w-full py-2 px-3 border border-neutral-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#9C6B30] bg-white transition-all"
            >
              <option value="ALL">All Modules</option>
              <option value="ADMINS">Admins</option>
              <option value="ROLES">Roles</option>
              <option value="PERMISSIONS">Permissions</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activity Logs Table */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-xl border border-neutral-200">
          <Loader2 className="animate-spin inline text-[#9C6B30]" size={32} />
          <p className="text-xs text-neutral-500 mt-2 font-mono">Loading activity logs...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-neutral-50 text-[10px] tracking-widest uppercase text-neutral-500 border-b border-neutral-200">
                <tr>
                  <th className="text-left p-3.5 min-w-[130px]">Timestamp</th>
                  <th className="text-left p-3.5 min-w-[140px]">Performed By</th>
                  <th className="text-left p-3.5 min-w-[130px]">Action</th>
                  <th className="text-left p-3.5 min-w-[90px]">Module</th>
                  <th className="text-left p-3.5 min-w-[140px]">Target Entity</th>
                  <th className="text-right p-3.5 min-w-[80px]">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-neutral-400">
                      No activity logs found matching the filters
                    </td>
                  </tr>
                ) : (
                  logs.map((log, idx) => (
                    <tr key={log.id || log._id || `log-${idx}`} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="p-3.5 text-neutral-600 font-mono text-[11px] whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-neutral-900">{log.adminName || 'System'}</div>
                        <div className="text-[11px] text-neutral-400 font-mono truncate max-w-[150px]" title={log.adminEmail || ''}>
                          {log.adminEmail || 'system'}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-mono font-semibold uppercase ${getActionBadge(log.action)}`}>
                          {log.action || 'SYSTEM'}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-xs text-neutral-700">
                        {log.module || 'SYSTEM'}
                      </td>
                      <td className="p-3.5 text-neutral-800 text-xs">
                        <div className="font-medium">{log.targetName || log.targetId || '—'}</div>
                        {log.targetId && log.targetName && (
                          <div className="text-[10px] text-neutral-400 font-mono truncate max-w-[130px]">
                            ID: {log.targetId}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded hover:bg-neutral-100 transition"
                          title="Inspect Event Metadata"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-3.5 border-t border-neutral-200 flex items-center justify-between bg-neutral-50/50">
              <div className="text-xs text-neutral-500 font-mono">
                Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} of {total} log entries
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded border border-neutral-200 bg-white text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-100 transition"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-mono text-neutral-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded border border-neutral-200 bg-white text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-100 transition"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* METADATA INSPECTOR MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-neutral-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/15 flex items-center justify-center text-[#9C6B30]">
                  <ScrollText size={16} />
                </div>
                <div>
                  <h3 className="text-base font-serif font-semibold text-neutral-900">Activity Event Details</h3>
                  <p className="text-[11px] text-neutral-500 font-mono">{selectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">Action</div>
                  <div className="font-semibold text-neutral-800 mt-0.5">{selectedLog.action || '—'}</div>
                </div>
                <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">Module</div>
                  <div className="font-semibold text-neutral-800 mt-0.5">{selectedLog.module || '—'}</div>
                </div>
                <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">Administrator</div>
                  <div className="font-medium text-neutral-800 mt-0.5 truncate">{selectedLog.adminEmail || selectedLog.adminName || 'System'}</div>
                </div>
                <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">Timestamp</div>
                  <div className="font-mono text-[11px] text-neutral-800 mt-0.5">
                    {formatDate(selectedLog.createdAt)}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold mb-1.5">
                  Event Metadata Payload
                </div>
                <pre className="p-3 bg-neutral-900 text-neutral-200 rounded-xl font-mono text-xs overflow-x-auto max-h-60 border border-neutral-800">
                  {JSON.stringify(selectedLog.metadata && typeof selectedLog.metadata === 'object' ? selectedLog.metadata : {}, null, 2)}
                </pre>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 text-xs sm:text-sm font-medium rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
