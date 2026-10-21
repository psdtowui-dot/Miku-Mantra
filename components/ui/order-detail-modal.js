'use client';
import React from 'react';
import { X, Download, Calendar, User, Mail, Phone, MapPin, Wallet, CreditCard, Clock, FileText, CheckCircle2, Package, Truck, Home, Printer, Send, Loader2 } from 'lucide-react';
import { formatINR } from '@/lib/products';
import { getCancellationLabel, getCancellationActor } from '@/lib/utils';
import { toast } from 'sonner';
import ShippingSlip from './shipping-slip';

const STEPS = [
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'packed', label: 'Packed', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Home },
];

export default function OrderDetailModal({ order, onClose, onUpdateStatus }) {
  const [showShippingSlip, setShowShippingSlip] = React.useState(false);
  const [sendingInvoice, setSendingInvoice] = React.useState(false);
  const [showEmailPrompt, setShowEmailPrompt] = React.useState(false);
  const [targetEmail, setTargetEmail] = React.useState(order?.customerEmail || order?.guestEmail || '');
  if (!order) return null;

  const address = order.address || {};
  const amounts = order.amounts || {};
  const historyByStatus = Object.fromEntries((order.statusHistory || []).map(h => [h.status, h]));
  const currentIdx = order.status === 'processing'
    ? 1
    : (order.status === 'out_for_delivery' ? 2 : STEPS.findIndex(s => s.key === order.status));
  const activeIdx = order.status === 'cancelled' ? 0 : (currentIdx === -1 ? 0 : currentIdx);
  const cancellationDisplayText = getCancellationLabel(order) || 'Cancelled';
  const cancellationActor = getCancellationActor(order);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 xs:p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-[#F7F5F0] text-[#1A1A1A] w-full max-w-4xl rounded-xl sm:rounded-2xl border border-neutral-200 overflow-hidden shadow-2xl flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0F0F10] text-white p-4 sm:p-6 flex justify-between items-center border-b border-white/10">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2 xs:gap-3 flex-wrap">
              <span className="text-[9px] xs:text-[10px] tracking-[0.2em] xs:tracking-[0.35em] uppercase text-[#D4AF37] font-semibold">MikuMantra Atelier</span>
              <span className={`px-2 py-0.5 text-[9px] tracking-widest uppercase rounded font-bold ${order.status === 'cancelled' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30'}`}>
                {order.status === 'cancelled' ? cancellationDisplayText : order.status}
              </span>
            </div>
            <h2 className="font-display text-lg xs:text-xl sm:text-2xl font-light mt-1 flex items-center gap-2 flex-wrap">
              Order Details <span className="text-neutral-400 font-mono text-sm sm:text-lg font-normal">#{order.orderNumber}</span>
            </h2>
            <div className="text-[9px] xs:text-[10px] text-neutral-400 mt-0.5 font-mono truncate">
              ID: {order.id}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 xs:p-2 rounded-full transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3.5 xs:p-5 md:p-8 space-y-6 sm:space-y-8">
          {/* Timeline and Quick Status Control */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div>
                <h3 className="text-xs font-semibold tracking-widest uppercase text-neutral-400 flex items-center gap-1.5">
                  <Clock size={14} className="text-[#9C6B30]" /> Order Status &amp; Update
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Placed on {new Date(order.placedAt).toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {onUpdateStatus && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-neutral-500 font-medium">Order Status:</span>
                  {order.status === 'cancelled' ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-red-700 bg-red-50 border border-red-200 rounded">
                        {cancellationDisplayText.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">(Status cannot be changed after cancellation)</span>
                    </div>
                  ) : (
                    <select
                      value={order.status}
                      onChange={(e) => onUpdateStatus(order.id, e.target.value)}
                      className="border border-neutral-200 bg-[#F7F5F0] rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-700 focus:outline-none focus:border-[#9C6B30] cursor-pointer"
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="processing">Processing</option>
                      <option value="packed">Packed</option>
                      <option value="shipped">Shipped</option>
                      <option value="out_for_delivery">Out for Delivery</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  )}
                </div>
              )}
            </div>

            {/* Stepper bar */}
            {order.status !== 'cancelled' ? (
              <div className="relative grid grid-cols-4 gap-1 sm:gap-2 py-3 sm:py-4">
                <div className="absolute top-7 sm:top-9 left-[12.5%] right-[12.5%] h-[2px] bg-[#E8E8E8] -z-0" />
                <div
                  className="absolute top-7 sm:top-9 left-[12.5%] h-[2px] bg-[#9C6B30] -z-0 transition-all duration-500"
                  style={{ width: `${(activeIdx / (STEPS.length - 1)) * 75}%` }}
                />
                {STEPS.map((s, i) => {
                  const done = i <= activeIdx;
                  const h = historyByStatus[s.key];
                  return (
                    <div key={s.key} className="flex flex-col items-center text-center relative z-10">
                      <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all ${done ? 'bg-[#9C6B30] text-white ring-2 sm:ring-4 ring-[#9C6B30]/15' : 'bg-white border-2 border-[#E8E8E8] text-neutral-400'}`}>
                        <s.icon size={14} className="sm:w-4 sm:h-4" />
                      </div>
                      <div className={`text-[8px] xs:text-[9px] sm:text-[10px] tracking-normal xs:tracking-widest uppercase mt-1.5 font-semibold ${done ? 'text-[#9C6B30]' : 'text-neutral-400'}`}>
                        {s.label}
                      </div>
                      {h && (
                        <div className="text-[8px] xs:text-[9px] text-neutral-400 mt-0.5 hidden xs:block">
                          {new Date(h.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-red-50 text-red-800 p-4 sm:p-5 rounded-lg border border-red-200 text-xs sm:text-sm space-y-2">
                <div className="flex items-center gap-2 font-semibold text-red-900 text-sm">
                  <X size={18} className="shrink-0 text-red-600" />
                  {cancellationDisplayText}
                </div>
                <div className="text-neutral-700 space-y-1">
                  <p>
                    <span className="font-semibold text-neutral-800 font-sans">Cancelled By:</span>{' '}
                    <span className="font-medium">{cancellationActor || 'Unavailable'}</span>
                    {order.cancelledAt && <span> on {new Date(order.cancelledAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                  </p>
                  {order.cancellationReason && (
                    <p>
                      <span className="font-semibold text-neutral-800 font-sans">Reason:</span> {order.cancellationReason}
                      {order.cancellationNote && <span className="italic"> ({order.cancellationNote})</span>}
                    </p>
                  )}
                  {order.payment === 'cod' ? (
                    <p className="text-neutral-600">
                      <span className="font-semibold text-neutral-800 font-sans">Refund Status:</span> No refund applicable (Cash on Delivery).
                    </p>
                  ) : (
                    <p className="text-neutral-700">
                      <span className="font-semibold text-neutral-800 font-sans">Refund Status:</span>{' '}
                      <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-800 font-medium rounded text-[10px] uppercase tracking-wider">
                        {order.refundStatus === 'refund_initiated' ? 'Refund Initiated' : (order.refundStatus || 'Refund Initiated')}
                      </span>
                      {order.refundAmount ? <span> ({formatINR(order.refundAmount)})</span> : null}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Customer & Address + Payment Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Customer & Shipping Address */}
            <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-semibold tracking-widest uppercase text-neutral-400 flex items-center gap-1.5">
                <User size={14} className="text-[#9C6B30]" /> Customer &amp; Shipping Address
              </h3>

              <div className="space-y-2.5 text-xs sm:text-sm">
                <div>
                  <span className="text-[11px] text-neutral-400 block">Name</span>
                  <span className="font-medium text-neutral-800">{address.fullName || '—'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <span className="text-[11px] text-neutral-400 block">Email Address</span>
                    <a
                      href={`mailto:${order.customerEmail || order.guestEmail}`}
                      className="font-medium text-[#9C6B30] hover:underline break-all text-xs"
                    >
                      {order.customerEmail || order.guestEmail || '—'}
                    </a>
                  </div>
                  <div>
                    <span className="text-[11px] text-neutral-400 block">Phone Number</span>
                    <a
                      href={`tel:${address.phone}`}
                      className="font-medium text-[#9C6B30] hover:underline text-xs"
                    >
                      {address.phone || '—'}
                    </a>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-neutral-100">
                  <span className="text-[11px] text-neutral-400 block flex items-center gap-1">
                    <MapPin size={12} /> Shipping Destination
                  </span>
                  <p className="text-neutral-600 mt-1 leading-relaxed text-xs sm:text-sm">
                    {address.line1}
                    {address.line2 && <span className="block text-neutral-500">{address.line2}</span>}
                    <span className="block font-medium text-neutral-700">
                      {address.city}, {address.state} — {address.pincode}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-semibold tracking-widest uppercase text-neutral-400 flex items-center gap-1.5">
                <Wallet size={14} className="text-[#9C6B30]" /> Payment &amp; Transactions
              </h3>

              <div className="space-y-2.5 text-xs sm:text-sm">
                <div>
                  <span className="text-[11px] text-neutral-400 block">Payment Method</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {order.payment === 'cod' ? (
                      <>
                        <Wallet size={14} className="text-[#9C6B30]" />
                        <span className="font-semibold uppercase">Cash On Delivery</span>
                      </>
                    ) : (
                      <>
                        <CreditCard size={14} className="text-[#9C6B30]" />
                        <span className="font-semibold uppercase">{order.payment}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] text-neutral-400 block">Payment Status</span>
                    <span className={`inline-block mt-0.5 px-2 py-0.5 text-[10px] uppercase font-bold rounded ${order.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                      {order.paymentStatus || 'pending'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-neutral-400 block">Est. Delivery</span>
                    <span className="font-medium text-neutral-700 text-xs sm:text-sm">
                      {new Date(order.estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {order.razorpayPaymentId && (
                  <div className="pt-2.5 border-t border-neutral-100">
                    <span className="text-[11px] text-neutral-400 block">Razorpay Payment ID</span>
                    <code className="text-xs font-mono text-neutral-600 block bg-neutral-50 px-2 py-1 rounded border border-neutral-200 mt-1 select-all break-all">
                      {order.razorpayPaymentId}
                    </code>
                  </div>
                )}

                {order.coupon && (
                  <div className="pt-2.5 border-t border-neutral-100 flex justify-between items-center">
                    <div>
                      <span className="text-[11px] text-neutral-400 block">Coupon Code</span>
                      <span className="font-semibold text-emerald-700 tracking-wider text-xs uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {order.coupon}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-neutral-400 block">Savings</span>
                      <span className="text-sm font-semibold text-[#9C6B30]">{formatINR(amounts.discount)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Product Items Details */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
            <div className="p-3.5 xs:p-4 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-widest uppercase text-neutral-500">
                Order Items ({order.items?.length || 0})
              </h3>
            </div>

            <div className="divide-y divide-neutral-100">
              {order.items?.map((it, idx) => (
                <div key={idx} className="p-3.5 xs:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex gap-3 xs:gap-4 items-center">
                    {it.image ? (
                      <img
                        src={it.image}
                        alt={it.name}
                        className="w-12 h-12 xs:w-16 xs:h-16 object-cover rounded bg-neutral-50 border border-neutral-200 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 xs:w-16 xs:h-16 rounded bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-400 shrink-0 text-xs">
                        No Image
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-serif-luxe text-sm sm:text-base font-semibold text-neutral-800 hover:text-[#9C6B30] transition-colors truncate max-w-[200px] xs:max-w-[280px]">
                        {it.name}
                      </h4>
                      <p className="text-[11px] text-neutral-500 mt-0.5 font-mono truncate">
                        ID: {it.id}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 xs:gap-8 border-t sm:border-t-0 pt-2.5 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <span className="text-[9px] text-neutral-400 block uppercase">Price</span>
                      <span className="text-xs sm:text-sm font-medium text-neutral-700">{formatINR(it.price)}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] text-neutral-400 block uppercase">Qty</span>
                      <span className="text-xs sm:text-sm font-semibold text-neutral-700 bg-neutral-50 border border-neutral-200 px-2 py-0.5 rounded">
                        {it.qty}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-neutral-400 block uppercase font-bold text-[#9C6B30]">Subtotal</span>
                      <span className="text-xs sm:text-sm font-bold text-[#9C6B30]">{formatINR(it.price * it.qty)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Breakdown & PDF Download */}
          <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
            <div className="w-full md:w-auto space-y-2">
              <div className="flex flex-wrap gap-2 sm:gap-2.5">
                <a
                  href={`/api/orders/${order.id}/invoice`}
                  target="_blank"
                  rel="noreferrer"
                  download={`Invoice-${order.orderNumber}.pdf`}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-[#FAF6EF] text-[#9C6B30] border border-[#9C6B30]/40 text-xs font-semibold tracking-wider uppercase rounded-lg hover:bg-[#9C6B30] hover:text-white transition-all shadow-xs"
                >
                  <Download size={13} /> Download PDF
                </a>
                <button
                  type="button"
                  onClick={() => {
                    const pdfUrl = `/api/orders/${order.id}/invoice`;
                    const w = window.open(pdfUrl, '_blank');
                    if (w) {
                      w.onload = () => {
                        try { w.print(); } catch (e) {}
                      };
                    }
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white text-neutral-700 border border-neutral-200 text-xs font-semibold tracking-wider uppercase rounded-lg hover:border-[#9C6B30] hover:text-[#9C6B30] transition-all shadow-xs"
                  title="Print Tax Invoice"
                >
                  <Printer size={13} /> Print
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmailPrompt(!showEmailPrompt)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-[#1A1A1A] text-white text-xs font-semibold tracking-wider uppercase rounded-lg hover:bg-[#9C6B30] transition-all shadow-xs"
                  title="Email Official Invoice to Customer"
                >
                  <Send size={12} /> Email Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setShowShippingSlip(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#9C6B30] text-white text-xs font-semibold tracking-wider uppercase rounded-lg hover:bg-[#855B29] transition-all shadow-xs"
                >
                  <FileText size={13} /> Shipping Slip
                </button>
              </div>

              {showEmailPrompt && (
                <div className="p-3 bg-white border border-[#D4AF37]/40 rounded-lg shadow-xs flex flex-col sm:flex-row items-center gap-2 text-xs">
                  <span className="font-semibold text-neutral-700 shrink-0">Recipient:</span>
                  <input
                    type="email"
                    value={targetEmail}
                    onChange={e => setTargetEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="flex-1 w-full sm:w-auto px-2.5 py-1.5 border border-neutral-200 rounded text-xs focus:outline-none focus:border-[#9C6B30]"
                  />
                  <button
                    type="button"
                    disabled={sendingInvoice}
                    onClick={async () => {
                      const to = (targetEmail || order.customerEmail || order.guestEmail || '').trim();
                      if (!to || !to.includes('@')) {
                        toast.error('Valid recipient email address is required.');
                        return;
                      }
                      setSendingInvoice(true);
                      try {
                        const res = await fetch(`/api/admin/orders/${order.id}/send-invoice`, {
                          method: 'POST',
                          credentials: 'include',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ toEmail: to })
                        });
                        const data = await res.json().catch(() => ({}));
                        if (res.ok) {
                          toast.success(data.message || `Tax invoice dispatched to ${to}`);
                          setShowEmailPrompt(false);
                        } else {
                          toast.error(data.error || 'Failed to dispatch invoice.');
                        }
                      } catch (err) {
                        toast.error('Network error sending invoice.');
                      } finally {
                        setSendingInvoice(false);
                      }
                    }}
                    className="w-full sm:w-auto px-3.5 py-1.5 bg-[#9C6B30] hover:bg-[#855B29] text-white font-semibold rounded text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {sendingInvoice ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    <span>{sendingInvoice ? 'Sending...' : 'Send'}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-5 w-full md:w-96 shadow-xs space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between text-neutral-500">
                <span>Subtotal</span>
                <span>{formatINR(amounts.subtotal)}</span>
              </div>

              {amounts.discount > 0 && (
                <div className="flex justify-between text-[#9C6B30] font-medium">
                  <span>Discount {order.coupon ? `(${order.coupon})` : ''}</span>
                  <span>-{formatINR(amounts.discount)}</span>
                </div>
              )}

              <div className="flex justify-between text-neutral-500">
                <span>Shipping Insurance</span>
                <span>{amounts.shipping === 0 ? <span className="text-[#9C6B30] font-semibold">FREE</span> : formatINR(amounts.shipping)}</span>
              </div>

              <div className="flex justify-between text-neutral-500">
                <span>Tax (GST 3%)</span>
                <span>{formatINR(amounts.tax)}</span>
              </div>

              {amounts.giftWrap > 0 && (
                <div className="flex justify-between text-neutral-500">
                  <span>Gift Wrap</span>
                  <span>{formatINR(amounts.giftWrap)}</span>
                </div>
              )}

              <div className="border-t border-neutral-200 pt-3 mt-1 flex justify-between items-baseline">
                <span className="font-semibold text-xs tracking-widest uppercase text-neutral-700">Grand Total</span>
                <span className="font-display text-xl sm:text-2xl font-bold text-[#9C6B30]">{formatINR(amounts.total)}</span>
              </div>
            </div>
          </div>

          {/* Timeline History log */}
          {(order.statusHistory || []).length > 0 && (
            <div className="border border-neutral-200 bg-white rounded-xl p-5 md:p-6 shadow-sm">
              <h3 className="text-xs font-semibold tracking-widest uppercase text-neutral-400 flex items-center gap-1.5 mb-4">
                <FileText size={14} className="text-[#9C6B30]" /> Order History Log
              </h3>
              <ol className="relative border-l-2 border-[#E8E8E8] ml-2 space-y-4">
                {[...order.statusHistory].reverse().map((h, idx) => (
                  <li key={idx} className="pl-6 relative">
                    <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-[#9C6B30] ring-4 ring-white" />
                    <div className="flex items-baseline justify-between flex-wrap gap-2">
                      <div className="font-semibold capitalize text-sm text-neutral-800">
                        {h.status === 'cancelled' ? cancellationDisplayText : h.status}
                      </div>
                      <div className="text-xs text-neutral-400 font-mono">
                        {new Date(h.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {h.note && <div className="text-xs text-neutral-500 mt-1 italic">"{h.note}"</div>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
      {showShippingSlip && (
        <ShippingSlip
          order={order}
          onClose={() => setShowShippingSlip(false)}
        />
      )}
    </div>
  );
}
