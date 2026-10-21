'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { formatINR } from '@/lib/products';
import {
  FileText, Search, RefreshCw, Download, Printer, Send,
  Settings, Eye, X, Loader2, CheckCircle2, Clock, AlertCircle,
  Building2, CreditCard, ChevronRight, Filter, Calendar, Mail,
  ExternalLink, ArrowUpDown, ShieldCheck, DollarSign, Wallet
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminInvoicesPage() {
  const [list, setList] = useState([]);
  const [stats, setStats] = useState({ totalInvoices: 0, totalRevenue: 0, totalPaid: 0, totalPending: 0 });
  const [loading, setLoading] = useState(true);
  const [searchVal, setSearchVal] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals state
  const [previewOrder, setPreviewOrder] = useState(null);
  const [emailOrder, setEmailOrder] = useState(null);
  const [emailForm, setEmailForm] = useState({ toEmail: '', message: '' });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsForm, setSettingsForm] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('general');

  // Load Invoices
  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (paymentFilter !== 'ALL') params.set('paymentStatus', paymentFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('limit', '100');

      const res = await fetch(`/api/admin/invoices?${params.toString()}`, { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const d = await res.json();
        setList(d.invoices || []);
        if (d.stats) setStats(d.stats);
      } else {
        toast.error('Failed to load invoices.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error while loading invoices.');
    } finally {
      setLoading(false);
    }
  };

  // Load Invoice Settings
  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/invoice-settings', { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const d = await res.json();
        setSettingsForm(d.settings || {});
      }
    } catch (err) {
      console.error('Failed to load invoice settings:', err);
    }
  };

  // Search debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchVal);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchVal]);

  useEffect(() => {
    loadInvoices();
  }, [search, statusFilter, paymentFilter, startDate, endDate]);

  useEffect(() => {
    loadSettings();
  }, []);

  // Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/invoice-settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm)
      });
      if (res.ok) {
        toast.success('Invoice settings updated successfully.');
        setShowSettingsModal(false);
        loadInvoices();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to update invoice settings.');
      }
    } catch (err) {
      toast.error('Error saving settings: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // Open Email Modal
  const openEmailModal = (inv) => {
    setEmailOrder(inv);
    setEmailForm({
      toEmail: inv.customerEmail || inv.guestEmail || '',
      message: ''
    });
  };

  // Dispatch Email
  const handleSendInvoiceEmail = async (e) => {
    e.preventDefault();
    if (!emailForm.toEmail || !emailForm.toEmail.includes('@')) {
      toast.error('Please specify a valid customer email address.');
      return;
    }
    setSendingEmail(true);
    try {
      const res = await fetch(`/api/admin/orders/${emailOrder.id}/send-invoice`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: emailForm.toEmail,
          message: emailForm.message
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(data.message || `Tax Invoice sent to ${emailForm.toEmail}`);
        setEmailOrder(null);
      } else {
        toast.error(data.error || 'Failed to dispatch invoice email.');
      }
    } catch (err) {
      toast.error('Network error sending invoice: ' + err.message);
    } finally {
      setSendingEmail(false);
    }
  };

  // Direct Print
  const handleDirectPrint = (orderId) => {
    const pdfUrl = `/api/orders/${orderId}/invoice`;
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        try {
          printWindow.print();
        } catch (e) {
          console.warn('Direct print failed, opened in new window:', e);
        }
      };
    }
  };

  const clearFilters = () => {
    setSearchVal('');
    setSearch('');
    setStatusFilter('ALL');
    setPaymentFilter('ALL');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = search || statusFilter !== 'ALL' || paymentFilter !== 'ALL' || startDate || endDate;

  return (
    <div className="space-y-6">
      {/* Top Nav Tabs */}
      <div className="flex border-b border-neutral-200 gap-6">
        <Link
          href="/admin/invoices"
          className="pb-3 text-xs sm:text-sm font-semibold border-b-2 border-[#9C6B30] text-[#9C6B30] flex items-center gap-2"
        >
          <FileText size={15} /> All Invoices
        </Link>
        <Link
          href="/admin/invoices/templates"
          className="pb-3 text-xs sm:text-sm font-semibold border-b-2 border-transparent text-neutral-500 hover:text-neutral-800 flex items-center gap-2 transition"
        >
          <Settings size={15} /> Invoice Template &amp; Information Editor
        </Link>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl xs:text-3xl sm:text-4xl text-[#1A1A1A]">Tax Invoices</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] tracking-wider font-semibold uppercase bg-[#FAF6EF] text-[#9C6B30] border border-[#D4AF37]/30">
              Billing Hub
            </span>
          </div>
          <div className="gold-line w-12 mt-2" />
          <p className="text-xs text-neutral-500 mt-1">
            Generate, review, download, dispatch, and configure official tax invoices for all customer orders.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:flex-auto flex-wrap">
          <Link
            href="/admin/invoices/templates"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-[#9C6B30] hover:bg-[#855B29] text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <Settings size={14} />
            <span>Invoice Template &amp; Edit All Info</span>
          </Link>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-white border border-neutral-200 text-neutral-700 hover:border-[#9C6B30] hover:text-[#9C6B30] text-xs font-semibold rounded-lg shadow-2xs transition"
          >
            <span>Legal &amp; Tax Settings</span>
          </button>
          <button
            onClick={loadInvoices}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-neutral-200 text-neutral-600 hover:text-[#9C6B30] hover:border-[#9C6B30] text-xs font-medium rounded-lg shadow-2xs transition"
            title="Refresh Invoices"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">Total Invoices</span>
            <span className="font-display text-xl sm:text-2xl font-bold text-neutral-900 mt-0.5 block">{stats.totalInvoices}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#FAF6EF] text-[#9C6B30] flex items-center justify-center border border-[#9C6B30]/20">
            <FileText size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">Total Invoiced</span>
            <span className="font-display text-xl sm:text-2xl font-bold text-neutral-900 mt-0.5 block">{formatINR(stats.totalRevenue)}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
            <CreditCard size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 block">Paid Revenue</span>
            <span className="font-display text-xl sm:text-2xl font-bold text-emerald-700 mt-0.5 block">{formatINR(stats.totalPaid)}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 block">Pending / COD</span>
            <span className="font-display text-xl sm:text-2xl font-bold text-amber-700 mt-0.5 block">{formatINR(stats.totalPending)}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
            <Wallet size={18} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="md:col-span-4 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              placeholder="Search by invoice #, order #, customer, city..."
              className="w-full pl-9 pr-9 py-2 border border-neutral-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#9C6B30] transition"
            />
            {searchVal && (
              <button
                onClick={() => setSearchVal('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Payment Status Dropdown */}
          <div className="md:col-span-2">
            <select
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value)}
              className="w-full px-2.5 py-2 border border-neutral-200 rounded-lg text-xs bg-white text-neutral-700 focus:outline-none focus:border-[#9C6B30] cursor-pointer"
            >
              <option value="ALL">Payment: All</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* Order Status Dropdown */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-2 border border-neutral-200 rounded-lg text-xs bg-white text-neutral-700 focus:outline-none focus:border-[#9C6B30] cursor-pointer"
            >
              <option value="ALL">Status: All</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="packed">Packed</option>
              <option value="shipped">Shipped</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Date Range Inputs */}
          <div className="md:col-span-4 flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-2 py-1.5 border border-neutral-200 rounded-lg text-xs text-neutral-600 focus:outline-none focus:border-[#9C6B30]"
              title="From Date"
            />
            <span className="text-neutral-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-2 py-1.5 border border-neutral-200 rounded-lg text-xs text-neutral-600 focus:outline-none focus:border-[#9C6B30]"
              title="To Date"
            />
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-2.5 py-1.5 border border-neutral-200 text-neutral-500 hover:text-red-600 hover:border-red-200 rounded-lg text-xs transition shrink-0"
                title="Reset all filters"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Invoices Data Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-16 text-center">
            <Loader2 className="animate-spin inline text-[#9C6B30]" size={28} />
            <p className="text-xs text-neutral-500 mt-2">Loading official tax invoices...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-neutral-50 text-[10px] tracking-widest uppercase text-neutral-500 border-b border-neutral-200">
                <tr>
                  <th className="text-left p-3.5 min-w-[130px]">Invoice</th>
                  <th className="text-left p-3.5 min-w-[110px]">Order Ref</th>
                  <th className="text-left p-3.5 min-w-[150px]">Customer</th>
                  <th className="text-left p-3.5 min-w-[90px]">Items</th>
                  <th className="text-left p-3.5 min-w-[110px]">Payment</th>
                  <th className="text-left p-3.5 min-w-[100px]">Order Status</th>
                  <th className="text-right p-3.5 min-w-[110px]">Total Amount</th>
                  <th className="text-center p-3.5 min-w-[180px]">Invoice Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-neutral-400">
                      <FileText size={32} className="mx-auto text-neutral-300 mb-2" />
                      <p className="font-medium text-neutral-600">No invoices found matching your criteria</p>
                      <p className="text-xs text-neutral-400 mt-0.5">Try clearing filters or search parameters</p>
                    </td>
                  </tr>
                ) : (
                  list.map(inv => {
                    const isPaid = inv.paymentStatus === 'paid' || inv.payment === 'razorpay';
                    const invoiceDate = new Date(inv.placedAt || Date.now()).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    });

                    return (
                      <tr key={inv.id} className="hover:bg-neutral-50/60 transition-colors">
                        {/* Invoice Column */}
                        <td className="p-3.5">
                          <div className="font-mono font-semibold text-[#9C6B30] text-xs">
                            {inv.invoiceNumber}
                          </div>
                          <div className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                            <Calendar size={11} /> {invoiceDate}
                          </div>
                        </td>

                        {/* Order Ref */}
                        <td className="p-3.5">
                          <Link
                            href={`/orders/${inv.id}`}
                            target="_blank"
                            className="font-medium text-neutral-800 hover:text-[#9C6B30] transition flex items-center gap-1 text-xs"
                            title="View public order page"
                          >
                            <span>#{inv.orderNumber}</span>
                            <ExternalLink size={10} className="text-neutral-400" />
                          </Link>
                          <div className="text-[10px] text-neutral-400 font-mono truncate max-w-[100px]" title={inv.id}>
                            ID: {inv.id.slice(0, 8)}...
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="p-3.5">
                          <div className="font-medium text-neutral-800 text-xs">
                            {inv.address?.fullName || 'Valued Collector'}
                          </div>
                          <div className="text-[11px] text-neutral-500">{inv.address?.phone}</div>
                          <div className="text-[10px] text-neutral-400 truncate max-w-[160px]" title={inv.customerEmail}>
                            {inv.customerEmail || '—'}
                          </div>
                          {inv.address?.city && (
                            <div className="text-[10px] text-neutral-400 mt-0.5">
                              {inv.address.city}, {inv.address.state}
                            </div>
                          )}
                        </td>

                        {/* Items */}
                        <td className="p-3.5 text-xs text-neutral-600">
                          <span className="font-medium">{inv.items?.length || 0} item{(inv.items?.length || 0) === 1 ? '' : 's'}</span>
                          {inv.items?.[0] && (
                            <div className="text-[10px] text-neutral-400 truncate max-w-[110px]" title={inv.items[0].name}>
                              {inv.items[0].name}
                            </div>
                          )}
                        </td>

                        {/* Payment */}
                        <td className="p-3.5">
                          <div className="uppercase text-[10px] font-semibold text-neutral-600">
                            {inv.payment === 'cod' ? 'Cash on Delivery' : inv.payment}
                          </div>
                          <span className={`inline-block mt-0.5 px-2 py-0.5 text-[9px] uppercase font-bold rounded ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {isPaid ? 'PAID' : (inv.paymentStatus || 'PENDING')}
                          </span>
                        </td>

                        {/* Order Status */}
                        <td className="p-3.5">
                          <span className={`inline-block px-2 py-0.5 text-[10px] uppercase font-semibold rounded ${
                            inv.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            inv.status === 'cancelled' ? 'bg-red-50 text-red-700 border border-red-200' :
                            inv.status === 'shipped' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            'bg-neutral-100 text-neutral-700 border border-neutral-200'
                          }`}>
                            {inv.status}
                          </span>
                        </td>

                        {/* Total Amount */}
                        <td className="p-3.5 text-right font-display text-sm font-bold text-neutral-900">
                          {formatINR(inv.amounts?.total || 0)}
                          <div className="text-[10px] text-neutral-400 font-sans font-normal">
                            Tax: {formatINR(inv.amounts?.tax || 0)}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* Preview */}
                            <button
                              onClick={() => setPreviewOrder(inv)}
                              className="p-1.5 rounded-md bg-white border border-neutral-200 hover:border-[#9C6B30] hover:text-[#9C6B30] text-neutral-600 transition shadow-2xs"
                              title="Preview Official Invoice"
                            >
                              <Eye size={13} />
                            </button>

                            {/* Download PDF */}
                            <a
                              href={`/api/orders/${inv.id}/invoice`}
                              target="_blank"
                              rel="noreferrer"
                              download={`Invoice-${inv.orderNumber}.pdf`}
                              className="p-1.5 rounded-md bg-[#FAF6EF] border border-[#D4AF37]/30 hover:bg-[#9C6B30] hover:text-white text-[#9C6B30] transition shadow-2xs"
                              title="Download PDF Invoice"
                            >
                              <Download size={13} />
                            </a>

                            {/* Direct Print */}
                            <button
                              onClick={() => handleDirectPrint(inv.id)}
                              className="p-1.5 rounded-md bg-white border border-neutral-200 hover:border-[#9C6B30] hover:text-[#9C6B30] text-neutral-600 transition shadow-2xs"
                              title="Print Invoice"
                            >
                              <Printer size={13} />
                            </button>

                            {/* Send Email */}
                            <button
                              onClick={() => openEmailModal(inv)}
                              className="p-1.5 rounded-md bg-[#1A1A1A] hover:bg-[#9C6B30] text-white transition shadow-2xs flex items-center gap-1 text-[11px] px-2"
                              title="Email Tax Invoice to Customer"
                            >
                              <Mail size={12} />
                              <span className="hidden sm:inline text-[10px]">Email</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============ PREVIEW INVOICE MODAL ============ */}
      {previewOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6" onClick={() => setPreviewOrder(null)}>
          <div className="bg-white rounded-2xl w-full max-w-4xl border border-neutral-200 overflow-hidden shadow-2xl flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-[#121212] text-white px-5 py-4 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#9C6B30]/20 border border-[#9C6B30]/40 flex items-center justify-center text-[#D4AF37]">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
                    Tax Invoice <span className="text-[#D4AF37] font-mono">#{previewOrder.invoiceNumber}</span>
                  </h3>
                  <div className="text-[10px] text-neutral-400">
                    Order #{previewOrder.orderNumber} · Customer: {previewOrder.address?.fullName}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDirectPrint(previewOrder.id)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1.5 transition"
                  title="Print"
                >
                  <Printer size={13} />
                  <span className="hidden xs:inline">Print</span>
                </button>
                <a
                  href={`/api/orders/${previewOrder.id}/invoice`}
                  download={`Invoice-${previewOrder.orderNumber}.pdf`}
                  className="px-3.5 py-1.5 rounded-lg bg-[#9C6B30] hover:bg-[#855B29] text-white text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Download size={13} />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => setPreviewOrder(null)}
                  className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition ml-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Embedded PDF iframe */}
            <div className="flex-1 bg-neutral-100 p-2 sm:p-4 overflow-hidden min-h-[65vh]">
              <iframe
                src={`/api/orders/${previewOrder.id}/invoice#toolbar=1`}
                className="w-full h-full border border-neutral-300 rounded-lg shadow-inner bg-white"
                style={{ minHeight: '65vh' }}
                title={`Invoice #${previewOrder.invoiceNumber}`}
              />
            </div>
          </div>
        </div>
      )}

      {/* ============ EMAIL INVOICE MODAL ============ */}
      {emailOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4" onClick={() => setEmailOrder(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md border border-neutral-200 overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-[#121212] text-white px-5 py-4 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-[#D4AF37]" />
                <h3 className="text-sm font-semibold text-white">Email Tax Invoice</h3>
              </div>
              <button onClick={() => setEmailOrder(null)} className="text-white/70 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSendInvoiceEmail} className="p-5 space-y-4">
              <div className="bg-[#FAF6EF] border border-[#D4AF37]/30 rounded-lg p-3 text-xs text-neutral-700">
                <div className="font-semibold text-[#9C6B30]">Order #{emailOrder.orderNumber}</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  Invoice <code className="font-mono text-[#9C6B30]">{emailOrder.invoiceNumber}</code> will be attached as a PDF to the email.
                </div>
              </div>

              <div>
                <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                  Recipient Customer Email
                </label>
                <input
                  type="email"
                  required
                  value={emailForm.toEmail}
                  onChange={e => setEmailForm({ ...emailForm, toEmail: e.target.value })}
                  placeholder="customer@example.com"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div>
                <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                  Personalized Atelier Note (Optional)
                </label>
                <textarea
                  rows={3}
                  value={emailForm.message}
                  onChange={e => setEmailForm({ ...emailForm, message: e.target.value })}
                  placeholder="e.g. Thank you for your heirloom commission with MikuMantra..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setEmailOrder(null)}
                  className="px-4 py-2 border border-neutral-200 text-neutral-600 hover:bg-neutral-50 text-xs font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#9C6B30] hover:bg-[#855B29] text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {sendingEmail ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>{sendingEmail ? 'Dispatching...' : 'Send Invoice Email'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ INVOICE SETTINGS MODAL ============ */}
      {showSettingsModal && settingsForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6" onClick={() => setShowSettingsModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl border border-neutral-200 overflow-hidden shadow-2xl flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
            <div className="bg-[#121212] text-white px-6 py-4 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#9C6B30]/20 border border-[#9C6B30]/40 flex items-center justify-center text-[#D4AF37]">
                  <Settings size={16} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-white">Tax Invoice Settings</h3>
                  <p className="text-[10px] text-neutral-400">Configure legal entity, tax numbers, prefix, and bank details for PDF invoices</p>
                </div>
              </div>
              <button onClick={() => setShowSettingsModal(false)} className="text-white/70 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Sub-tabs */}
            <div className="flex border-b border-neutral-200 bg-neutral-50 px-6 pt-2 gap-4">
              <button
                type="button"
                onClick={() => setSettingsTab('general')}
                className={`pb-2.5 text-xs font-semibold border-b-2 transition ${
                  settingsTab === 'general' ? 'border-[#9C6B30] text-[#9C6B30]' : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                Tax & Legal Entity
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('config')}
                className={`pb-2.5 text-xs font-semibold border-b-2 transition ${
                  settingsTab === 'config' ? 'border-[#9C6B30] text-[#9C6B30]' : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                Numbering & Policy Notes
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('bank')}
                className={`pb-2.5 text-xs font-semibold border-b-2 transition ${
                  settingsTab === 'bank' ? 'border-[#9C6B30] text-[#9C6B30]' : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                Bank Transfer Details
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* TAB 1: TAX & LEGAL ENTITY */}
              {settingsTab === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                        Business / Legal Entity Name
                      </label>
                      <input
                        value={settingsForm.legalName || ''}
                        onChange={e => setSettingsForm({ ...settingsForm, legalName: e.target.value })}
                        placeholder="MikuMantra Fine Jewellery Pvt Ltd"
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                        GSTIN
                      </label>
                      <input
                        value={settingsForm.gstin || ''}
                        onChange={e => setSettingsForm({ ...settingsForm, gstin: e.target.value })}
                        placeholder="08AAACM1234F1Z5"
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-[#9C6B30]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                        PAN
                      </label>
                      <input
                        value={settingsForm.pan || ''}
                        onChange={e => setSettingsForm({ ...settingsForm, pan: e.target.value })}
                        placeholder="AAACM1234F"
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-[#9C6B30]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                        CIN (Optional)
                      </label>
                      <input
                        value={settingsForm.cin || ''}
                        onChange={e => setSettingsForm({ ...settingsForm, cin: e.target.value })}
                        placeholder="U36910RJ2026PTC123456"
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-[#9C6B30]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                      Registered Office Address
                    </label>
                    <textarea
                      rows={2}
                      value={settingsForm.registeredAddress || ''}
                      onChange={e => setSettingsForm({ ...settingsForm, registeredAddress: e.target.value })}
                      placeholder="Atelier MikuMantra, Phase 2, MG Road, Jaipur 302001, Rajasthan, India"
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                        Invoicing Support Email
                      </label>
                      <input
                        value={settingsForm.email || ''}
                        onChange={e => setSettingsForm({ ...settingsForm, email: e.target.value })}
                        placeholder="support@mikumantra.com"
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                        Concierge Helpline Phone
                      </label>
                      <input
                        value={settingsForm.phone || ''}
                        onChange={e => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                        placeholder="+91 141 234 5678"
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: NUMBERING & POLICY NOTES */}
              {settingsTab === 'config' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                      Invoice Number Prefix
                    </label>
                    <input
                      value={settingsForm.prefix || ''}
                      onChange={e => setSettingsForm({ ...settingsForm, prefix: e.target.value })}
                      placeholder="INV-"
                      className="w-full max-w-xs px-3 py-2 border border-neutral-200 rounded-lg text-xs font-mono font-semibold focus:outline-none focus:border-[#9C6B30]"
                    />
                    <span className="text-[11px] text-neutral-400 block mt-1">
                      Prepended to order numbers to generate invoice IDs (e.g. <code>INV-MM-2026-8821</code>).
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                      Terms & Conditions / Footer Note
                    </label>
                    <textarea
                      rows={3}
                      value={settingsForm.invoiceTerms || ''}
                      onChange={e => setSettingsForm({ ...settingsForm, invoiceTerms: e.target.value })}
                      placeholder="All pieces are BIS Hallmarked and SGL/GIA certified. Returns accepted within 15 days."
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                      Appraisal / Care Note on Invoice
                    </label>
                    <textarea
                      rows={2}
                      value={settingsForm.notes || ''}
                      onChange={e => setSettingsForm({ ...settingsForm, notes: e.target.value })}
                      placeholder="Complimentary jewellery care consultation available at Jaipur atelier."
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                      Authorized Signatory Title
                    </label>
                    <input
                      value={settingsForm.authorizedSignatory || ''}
                      onChange={e => setSettingsForm({ ...settingsForm, authorizedSignatory: e.target.value })}
                      placeholder="Authorized Signatory"
                      className="w-full max-w-xs px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: BANK DETAILS */}
              {settingsTab === 'bank' && (
                <div className="space-y-4">
                  <p className="text-xs text-neutral-500">
                    Provide optional wire / NEFT payment coordinates to display on official B2B invoices and high-value orders.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                        Bank Name
                      </label>
                      <input
                        value={settingsForm.bankDetails?.bankName || ''}
                        onChange={e => setSettingsForm({
                          ...settingsForm,
                          bankDetails: { ...(settingsForm.bankDetails || {}), bankName: e.target.value }
                        })}
                        placeholder="HDFC Bank Ltd."
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                        Account Number
                      </label>
                      <input
                        value={settingsForm.bankDetails?.accountNumber || ''}
                        onChange={e => setSettingsForm({
                          ...settingsForm,
                          bankDetails: { ...(settingsForm.bankDetails || {}), accountNumber: e.target.value }
                        })}
                        placeholder="50200012345678"
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-[#9C6B30]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                        IFSC Code
                      </label>
                      <input
                        value={settingsForm.bankDetails?.ifsc || ''}
                        onChange={e => setSettingsForm({
                          ...settingsForm,
                          bankDetails: { ...(settingsForm.bankDetails || {}), ifsc: e.target.value.toUpperCase() }
                        })}
                        placeholder="HDFC0000123"
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs font-mono uppercase focus:outline-none focus:border-[#9C6B30]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                        Branch & City
                      </label>
                      <input
                        value={settingsForm.bankDetails?.branch || ''}
                        onChange={e => setSettingsForm({
                          ...settingsForm,
                          bankDetails: { ...(settingsForm.bankDetails || {}), branch: e.target.value }
                        })}
                        placeholder="C-Scheme Branch, Jaipur"
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 border border-neutral-200 text-neutral-600 hover:bg-neutral-50 text-xs font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#9C6B30] hover:bg-[#855B29] text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {savingSettings ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  <span>{savingSettings ? 'Saving Settings...' : 'Save Settings'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
