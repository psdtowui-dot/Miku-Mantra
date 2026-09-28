'use client';
import React, { useState } from 'react';
import { X, Download, Calendar, User, Mail, Phone, MapPin, Wallet, CreditCard, Clock, FileText, CheckCircle2, Package, Truck, Home, ExternalLink, Copy, Check, Edit2 } from 'lucide-react';
import { formatINR } from '@/lib/products';
import ShippingSlip from './shipping-slip';
import ShipmentModal from './shipment-modal';

const STEPS = [
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'packed', label: 'Packed', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Home },
];

export default function OrderDetailModal({ order, onClose, onUpdateStatus }) {
  const [showShippingSlip, setShowShippingSlip] = React.useState(false);
  const [showShipmentModal, setShowShipmentModal] = React.useState(false);
  const [isEditOnlyShipment, setIsEditOnlyShipment] = React.useState(false);
  const [copiedAwb, setCopiedAwb] = React.useState(false);
  if (!order) return null;

  const address = order.address || {};
  const amounts = order.amounts || {};
  const historyByStatus = Object.fromEntries((order.statusHistory || []).map(h => [h.status, h]));
  const currentIdx = STEPS.findIndex(s => s.key === order.status);
  const activeIdx = order.status === 'cancelled' ? 0 : (currentIdx === -1 ? 0 : currentIdx);

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
                {order.status}
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
                        CANCELLED
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">(Status cannot be changed after cancellation)</span>
                    </div>
                  ) : (
                    <select 
                      value={order.status} 
                      onChange={(e) => {
                        const newStatus = e.target.value;
                        if (newStatus === 'shipped') {
                          setIsEditOnlyShipment(false);
                          setShowShipmentModal(true);
                        } else {
                          onUpdateStatus(order.id, newStatus);
                        }
                      }}
                      className="border border-neutral-200 bg-[#F7F5F0] rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-700 focus:outline-none focus:border-[#9C6B30] cursor-pointer"
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="packed">Packed</option>
                      <option value="shipped">Shipped</option>
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
                  This order was cancelled.
                </div>
                <div className="text-neutral-700 space-y-1">
                  <p>
                    <span className="font-semibold text-neutral-800 font-sans">Cancelled By:</span>{' '}
                    <span className="capitalize font-medium">{order.cancelledBy || 'Customer'}</span>
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

          {/* Dedicated Logistics & Courier Tracking panel */}
          {(order.status === 'shipped' || order.status === 'delivered' || order.courier || order.carrier) && (
            <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#FAF5EB] border border-[#D4AF37]/30 flex items-center justify-center text-[#9C6B30]">
                    <Truck size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold tracking-widest uppercase text-neutral-800">
                      Logistics &amp; Courier Tracking
                    </h3>
                    <p className="text-[11px] text-neutral-400">
                      Live dispatch tracking, logistics partner, and AWB details
                    </p>
                  </div>
                </div>

                {onUpdateStatus && order.status !== 'cancelled' && (
                  <button
                    onClick={() => {
                      setIsEditOnlyShipment(true);
                      setShowShipmentModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#9C6B30] bg-[#FAF6EF] border border-[#D4AF37]/40 rounded-lg hover:bg-[#9C6B30] hover:text-white transition-all shadow-xs cursor-pointer"
                  >
                    <Edit2 size={12} /> Edit Tracking
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs sm:text-sm">
                {/* Carrier Partner */}
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Courier Partner</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2.5 py-1 text-xs font-bold text-neutral-900 bg-neutral-100 border border-neutral-200 rounded-md">
                      {order.courier?.carrier || order.carrier || 'Standard Courier'}
                    </span>
                  </div>
                </div>

                {/* AWB Tracking Number */}
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">AWB / Consignment No.</span>
                  <div className="flex items-center gap-2 mt-1">
                    {order.courier?.trackingNumber || order.trackingNumber ? (
                      <>
                        <span className="font-mono font-bold text-sm tracking-wider text-neutral-900">
                          {order.courier?.trackingNumber || order.trackingNumber}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(order.courier?.trackingNumber || order.trackingNumber);
                            setCopiedAwb(true);
                            setTimeout(() => setCopiedAwb(false), 2000);
                          }}
                          className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded transition cursor-pointer"
                          title="Copy AWB Number"
                        >
                          {copiedAwb ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        </button>
                        {copiedAwb && <span className="text-[10px] text-emerald-600 font-medium">Copied!</span>}
                      </>
                    ) : (
                      <span className="italic text-neutral-400 text-xs">Pending AWB assignment</span>
                    )}
                  </div>
                </div>

                {/* Live Portal Link */}
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Live Tracking Link</span>
                  <div className="mt-1">
                    {order.courier?.trackingUrl || order.trackingUrl ? (
                      <a
                        href={order.courier?.trackingUrl || order.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9C6B30] hover:underline"
                      >
                        Track Package <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="text-neutral-400 text-xs italic">No URL provided</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Extra details (Shipped at date & notes) */}
              {(order.courier?.shippedAt || order.shippedAt || order.courier?.notes) && (
                <div className="pt-2 border-t border-neutral-100 flex flex-col sm:flex-row justify-between gap-2 text-xs text-neutral-500">
                  {(order.courier?.shippedAt || order.shippedAt) && (
                    <div>
                      <span className="font-medium text-neutral-600">Dispatched:</span>{' '}
                      {new Date(order.courier?.shippedAt || order.shippedAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}
                  {order.courier?.notes && (
                    <div className="italic text-neutral-500">
                      "{order.courier.notes}"
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
            <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
              <a 
                href={`/api/orders/${order.id}/invoice`} 
                target="_blank" 
                rel="noreferrer" 
                className="inline-flex items-center justify-center gap-2 px-5 py-3 border border-neutral-800 text-xs font-semibold tracking-widest uppercase rounded-lg hover:bg-neutral-800 hover:text-white transition-all shadow-xs w-full sm:w-auto text-center"
              >
                <Download size={14} /> Open/Download PDF Invoice
              </a>
              <button 
                onClick={() => setShowShippingSlip(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#9C6B30] text-white text-xs font-semibold tracking-widest uppercase rounded-lg hover:bg-[#855B29] transition-all shadow-xs w-full sm:w-auto text-center"
              >
                <FileText size={14} /> Generate Shipping Slip
              </button>
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
                      <div className="font-semibold capitalize text-sm text-neutral-800">{h.status}</div>
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
      {showShipmentModal && (
        <ShipmentModal
          order={order}
          isOpen={showShipmentModal}
          isEditOnly={isEditOnlyShipment}
          onClose={() => setShowShipmentModal(false)}
          onConfirm={async ({ status, courier }) => {
            await onUpdateStatus(order.id, status || order.status, courier);
            setShowShipmentModal(false);
          }}
        />
      )}
    </div>
  );
}
