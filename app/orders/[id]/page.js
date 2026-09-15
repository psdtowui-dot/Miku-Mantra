'use client';
import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/use-auth';
import { formatINR } from '@/lib/products';
import { CheckCircle2, Package, Truck, Home, Loader2, Download, Clock, X, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

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

function OrderInner() {
  const { id } = useParams();
  const sp = useSearchParams();
  const success = sp.get('success') === '1';
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Cancellation Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelStep, setCancelStep] = useState(1);
  const [selectedReason, setSelectedReason] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [modalErr, setModalErr] = useState('');

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
      const r = await fetch(`/api/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
      }
    } catch (err) {
      console.error(err);
      setModalErr('Unable to cancel the order right now. Please try again.');
      toast.error('Network error');
    } finally {
      setCancelling(false);
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
        const r = await fetch(`/api/orders/${id}`, { credentials: 'include' });
        const d = await r.json();
        if (r.ok) {
          setOrder(d.order);
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

  if (authLoading || loading) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-[#9C6B30]" /></div>;
  if (!user) return null;
  if (!order) return <div className="h-96 flex items-center justify-center text-neutral-400">Order not found</div>;

  const historyByStatus = Object.fromEntries((order.statusHistory || []).map(h => [h.status, h]));
  const currentIdx = STEPS.findIndex(s => s.key === order.status);
  const activeIdx = order.status === 'cancelled' ? 0 : (currentIdx === -1 ? 0 : currentIdx);

  // Cancellation eligibility
  const isCancellable = ['confirmed', 'placed', 'processing', 'packed'].includes(order.status) && order.status !== 'cancelled';

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
              <span className={`inline-block px-3 sm:px-4 py-1.5 text-[9px] sm:text-[10px] tracking-widest uppercase rounded-full capitalize font-semibold ${order.status === 'cancelled' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-[#FAF6EF] text-[#9C6B30]'}`}>{order.status}</span>
              <a href={`/api/orders/${order.id}/invoice`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 border border-[#1A1A1A] text-[9px] sm:text-[10px] tracking-widest uppercase rounded-full hover:bg-[#1A1A1A] hover:text-white transition"><Download size={12} /> Invoice</a>
            </div>
          </div>

          {/* Cancellation Info Banner */}
          {order.status === 'cancelled' && (
            <div className="mb-6 p-4 sm:p-5 bg-red-50/70 border border-red-200 rounded-xl space-y-2 text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-red-800 font-semibold text-sm">
                <X size={18} className="shrink-0 text-red-600" />
                Order Cancelled
              </div>
              <p className="text-neutral-700">
                Cancelled by <span className="font-medium capitalize">{order.cancelledBy || 'customer'}</span>
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
                      <div className="font-medium capitalize text-[#1A1A1A] text-xs sm:text-sm">{h.status}</div>
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

          <div className="space-y-3">{order.items.map((it, i) => (
            <div key={i} className="flex gap-3 sm:gap-4 border border-[#E8E8E8] rounded-lg p-3"><img loading="lazy" src={it.image} className="w-16 h-16 sm:w-20 sm:h-20 rounded object-cover shrink-0" /><div className="flex-1 min-w-0"><Link href={`/product/${it.slug}`} className="font-serif-luxe text-base sm:text-lg hover:text-[#9C6B30] truncate block">{it.name}</Link><div className="text-xs text-neutral-500">Quantity: {it.qty}</div></div><div className="font-medium text-xs sm:text-sm shrink-0">{formatINR(it.price * it.qty)}</div></div>
          ))}</div>

          <div className="mt-6 border-t border-[#E8E8E8] pt-4 space-y-1 text-xs sm:text-sm max-w-xs ml-auto">
            <div className="flex justify-between"><span className="text-neutral-500">Subtotal</span><span>{formatINR(order.amounts.subtotal)}</span></div>
            {order.amounts.discount > 0 && <div className="flex justify-between text-[#9C6B30]"><span>Discount</span><span>-{formatINR(order.amounts.discount)}</span></div>}
            <div className="flex justify-between"><span className="text-neutral-500">Shipping</span><span>{order.amounts.shipping === 0 ? 'Free' : formatINR(order.amounts.shipping)}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Tax</span><span>{formatINR(order.amounts.tax)}</span></div>
            <div className="flex justify-between font-display text-lg sm:text-xl pt-2 border-t border-[#E8E8E8]"><span>Total</span><span>{formatINR(order.amounts.total)}</span></div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2.5 sm:gap-3 justify-center">
            <a href={`/api/orders/${order.id}/invoice`} target="_blank" rel="noreferrer" className="px-4 sm:px-8 py-2.5 sm:py-3 border border-[#1A1A1A] text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] uppercase rounded-md hover:bg-[#1A1A1A] hover:text-white transition flex items-center gap-2"><Download size={14} /> Download Invoice</a>
            <Link href="/shop" className="px-4 sm:px-8 py-2.5 sm:py-3 border border-[#1A1A1A] text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] uppercase rounded-md hover:bg-[#1A1A1A] hover:text-white transition">Continue Shopping</Link>
            <Link href="/account" className="px-4 sm:px-8 py-2.5 sm:py-3 bg-[#1A1A1A] text-white text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] uppercase rounded-md hover:bg-[#9C6B30]">View All Orders</Link>
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
              <button disabled={cancelling} onClick={() => setShowCancelModal(false)} className="text-neutral-400 hover:text-white transition p-1 cursor-pointer">
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
    </main>
  );
}

export default function OrderPage() { return <Suspense fallback={<div className="h-screen" />}><OrderInner /></Suspense>; }
