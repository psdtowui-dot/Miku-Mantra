'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/use-auth';
import { formatINR } from '@/lib/products';
import {
  Truck,
  Package,
  CheckCircle2,
  Home,
  Search,
  Copy,
  Check,
  ExternalLink,
  Clock,
  ShieldCheck,
  MapPin,
  AlertCircle,
  Loader2,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

const STEPS = [
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'packed', label: 'Packed', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Home },
];

function TrackOrderInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [searchMode, setSearchMode] = useState('order'); // 'order' | 'awb'
  const [orderNumber, setOrderNumber] = useState(sp.get('orderNumber') || sp.get('order') || '');
  const [contact, setContact] = useState(sp.get('contact') || '');
  const [awb, setAwb] = useState(sp.get('awb') || '');
  
  const [loading, setLoading] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedAwb, setCopiedAwb] = useState(false);

  // User's recent orders for quick click
  const [userOrders, setUserOrders] = useState([]);
  const [loadingUserOrders, setLoadingUserOrders] = useState(false);

  // Load user's recent orders if logged in
  useEffect(() => {
    if (user) {
      setLoadingUserOrders(true);
      fetch('/api/orders', { credentials: 'include' })
        .then(r => r.json())
        .then(d => {
          if (d.orders) setUserOrders(d.orders.slice(0, 5));
        })
        .catch(console.error)
        .finally(() => setLoadingUserOrders(false));
    }
  }, [user]);

  const handleCopyAwb = (awbNum) => {
    if (!awbNum) return;
    try {
      navigator.clipboard.writeText(awbNum);
      setCopiedAwb(true);
      toast.success('AWB Number copied to clipboard');
      setTimeout(() => setCopiedAwb(false), 2500);
    } catch (e) {
      toast.info(`AWB: ${awbNum}`);
    }
  };

  const executeTrack = async (searchParamsToUse) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const q = new URLSearchParams(searchParamsToUse).toString();
      const r = await fetch(`/api/orders/track?${q}`, { credentials: 'include' });
      const d = await r.json();
      if (r.ok && d.order) {
        setTrackedOrder(d.order);
        // Scroll smoothly to results
        setTimeout(() => {
          document.getElementById('tracking-result')?.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      } else {
        setTrackedOrder(null);
        setErrorMsg(d.error || 'No matching order found. Please check your tracking information.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error while looking up order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchMode === 'order') {
      if (!orderNumber.trim()) {
        setErrorMsg('Please enter your Order Number');
        return;
      }
      executeTrack({ orderNumber: orderNumber.trim(), contact: contact.trim() });
    } else {
      if (!awb.trim()) {
        setErrorMsg('Please enter your AWB Tracking Number');
        return;
      }
      executeTrack({ awb: awb.trim() });
    }
  };

  // Auto-search if URL parameters are provided
  useEffect(() => {
    const initOrder = sp.get('orderNumber') || sp.get('order');
    const initAwb = sp.get('awb');
    if (initAwb) {
      setSearchMode('awb');
      setAwb(initAwb);
      executeTrack({ awb: initAwb });
    } else if (initOrder) {
      setSearchMode('order');
      setOrderNumber(initOrder);
      executeTrack({ orderNumber: initOrder, contact: sp.get('contact') || '' });
    }
  }, []);

  const getStepIndex = (status) => {
    const idx = STEPS.findIndex(s => s.key === status);
    return idx === -1 ? 0 : idx;
  };

  const activeIdx = trackedOrder ? getStepIndex(trackedOrder.status) : 0;
  const historyByStatus = Object.fromEntries(((trackedOrder?.statusHistory) || []).map(h => [h.status, h]));

  return (
    <main className="bg-[#FAF8F5] min-h-screen py-8 sm:py-14">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Title Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FAF5EB] border border-[#D4AF37]/30 rounded-full text-[#9C6B30] text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-3">
            <Truck size={13} /> Live Dispatch & Courier Tracker
          </div>
          <h1 className="font-serif-luxe text-3xl sm:text-4xl text-[#1A1A1A] font-light tracking-tight">
            Track Your Order
          </h1>
          <div className="h-[1.5px] w-14 bg-gradient-to-r from-[#9C6B30] to-[#E5C378] mx-auto my-3" />
          <p className="text-xs sm:text-sm text-neutral-600 max-w-lg mx-auto font-light">
            Follow your handcrafted jewellery journey from the MikuMantra atelier to your hands with transit insurance and live courier tracking.
          </p>
        </div>

        {/* Quick Active Shipments for Logged-In Customer */}
        {user && userOrders.length > 0 && (
          <div className="mb-6 bg-white border border-[#EAE3D2] rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                <Package size={14} className="text-[#9C6B30]" /> Your Recent Orders
              </span>
              <Link href="/account" className="text-[11px] text-[#9C6B30] hover:underline font-medium">
                View All in Account →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {userOrders.map(o => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    setOrderNumber(o.orderNumber);
                    setSearchMode('order');
                    executeTrack({ orderNumber: o.orderNumber });
                  }}
                  className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 hover:border-[#9C6B30] hover:bg-[#FAF5EB]/50 transition text-left cursor-pointer group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-mono text-xs font-bold text-neutral-900 group-hover:text-[#9C6B30] truncate">
                      {o.orderNumber}
                    </div>
                    <div className="text-[10px] text-neutral-500 capitalize">
                      {o.status} • {new Date(o.placedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-700 group-hover:bg-[#9C6B30] group-hover:text-white transition">
                    Track
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Card */}
        <div className="bg-white border border-[#EAE3D2] rounded-2xl p-5 sm:p-7 shadow-[0_4px_24px_rgba(156,107,48,0.06)] mb-8">
          
          {/* Mode Tabs */}
          <div className="flex border-b border-neutral-200 mb-5">
            <button
              type="button"
              onClick={() => { setSearchMode('order'); setErrorMsg(''); }}
              className={`pb-3 text-xs sm:text-sm font-semibold tracking-wider uppercase transition cursor-pointer border-b-2 mr-6 ${
                searchMode === 'order'
                  ? 'border-[#9C6B30] text-[#9C6B30]'
                  : 'border-transparent text-neutral-400 hover:text-neutral-700'
              }`}
            >
              Search by Order Number
            </button>
            <button
              type="button"
              onClick={() => { setSearchMode('awb'); setErrorMsg(''); }}
              className={`pb-3 text-xs sm:text-sm font-semibold tracking-wider uppercase transition cursor-pointer border-b-2 ${
                searchMode === 'awb'
                  ? 'border-[#9C6B30] text-[#9C6B30]'
                  : 'border-transparent text-neutral-400 hover:text-neutral-700'
              }`}
            >
              Search by AWB / Tracking #
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="space-y-4">
            {searchMode === 'order' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                    Order Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={orderNumber}
                    onChange={e => { setOrderNumber(e.target.value); setErrorMsg(''); }}
                    placeholder="e.g. ORD-2026-..."
                    className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl font-mono text-xs sm:text-sm bg-white focus:outline-none focus:border-[#9C6B30] focus:ring-1 focus:ring-[#9C6B30]"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">Found in your order confirmation SMS / email</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                    Phone Number or Email {user ? '(Optional)' : '*'}
                  </label>
                  <input
                    type="text"
                    value={contact}
                    onChange={e => { setContact(e.target.value); setErrorMsg(''); }}
                    placeholder="e.g. 9812345678 or customer@email.com"
                    className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:border-[#9C6B30] focus:ring-1 focus:ring-[#9C6B30]"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">Used during checkout to verify ownership</p>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Courier AWB / Tracking Consignment Number *
                </label>
                <input
                  type="text"
                  required
                  value={awb}
                  onChange={e => { setAwb(e.target.value); setErrorMsg(''); }}
                  placeholder="e.g. 30491829012 or DEL9988776655"
                  className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl font-mono text-xs sm:text-sm bg-white focus:outline-none focus:border-[#9C6B30] focus:ring-1 focus:ring-[#9C6B30]"
                />
                <p className="text-[10px] text-neutral-400 mt-1">Carrier tracking number provided upon dispatch</p>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle size={15} className="text-red-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={loading}
                className="px-7 py-3 bg-[#1A1A1A] hover:bg-[#9C6B30] text-white text-xs font-semibold uppercase tracking-widest rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                Track Order
              </button>
            </div>
          </form>
        </div>

        {/* Tracking Results */}
        {trackedOrder && (
          <div id="tracking-result" className="bg-white border border-[#EAE3D2] rounded-2xl p-5 sm:p-8 shadow-[0_8px_32px_rgba(156,107,48,0.08)] space-y-6">
            
            {/* Header info bar */}
            <div className="flex justify-between items-start flex-wrap gap-4 pb-5 border-b border-neutral-200">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-neutral-400">Order Reference</span>
                <div className="font-mono text-xl sm:text-2xl font-bold text-neutral-900 mt-0.5">
                  {trackedOrder.orderNumber}
                </div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  Placed on {new Date(trackedOrder.placedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>

              <div className="text-right flex flex-col items-end gap-1.5">
                <span className="px-3.5 py-1 text-[10px] sm:text-[11px] tracking-widest uppercase font-bold rounded-full bg-[#FAF5EB] text-[#9C6B30] border border-[#D4AF37]/40">
                  {trackedOrder.status === 'delivered' ? 'Delivered' : trackedOrder.status === 'shipped' ? 'In Transit' : trackedOrder.status}
                </span>
                {trackedOrder.total > 0 && (
                  <span className="font-display font-semibold text-base text-neutral-900">
                    {formatINR(trackedOrder.total)}
                  </span>
                )}
                {user && (
                  <Link
                    href={`/orders/${trackedOrder.id}`}
                    className="text-[11px] text-[#9C6B30] hover:underline font-medium inline-flex items-center gap-1"
                  >
                    View Full Order Details <ArrowRight size={11} />
                  </Link>
                )}
              </div>
            </div>

            {/* Visual Step Progress */}
            {trackedOrder.status !== 'cancelled' && (
              <div>
                <div className="relative grid grid-cols-4 gap-1 sm:gap-2 mb-3">
                  <div className="absolute top-4 sm:top-5 left-[12.5%] right-[12.5%] h-[2px] bg-neutral-200 -z-0" />
                  <div
                    className="absolute top-4 sm:top-5 left-[12.5%] h-[2px] bg-[#9C6B30] -z-0 transition-all duration-500"
                    style={{ width: `${(activeIdx / (STEPS.length - 1)) * 75}%` }}
                  />
                  {STEPS.map((s, i) => {
                    const done = i <= activeIdx;
                    const h = historyByStatus[s.key];
                    return (
                      <div key={s.key} className="flex flex-col items-center text-center relative z-10">
                        <div
                          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all ${
                            done
                              ? 'bg-[#9C6B30] text-white ring-2 sm:ring-4 ring-[#9C6B30]/15 shadow-sm'
                              : 'bg-white border-2 border-neutral-200 text-neutral-400'
                          }`}
                        >
                          <s.icon size={15} />
                        </div>
                        <div className={`text-[9px] sm:text-[10px] tracking-wider uppercase mt-1.5 font-bold ${done ? 'text-[#9C6B30]' : 'text-neutral-400'}`}>
                          {s.label}
                        </div>
                        {h && (
                          <div className="text-[8px] sm:text-[9px] text-neutral-400 mt-0.5">
                            {new Date(h.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {trackedOrder.estimatedDelivery && (
                  <div className="text-center text-xs text-neutral-500 pt-1">
                    Estimated Delivery: <span className="font-semibold text-neutral-900">{new Date(trackedOrder.estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                )}
              </div>
            )}

            {/* Courier Logistics Card */}
            <div className="rounded-2xl bg-gradient-to-br from-[#FAF8F5] via-white to-[#FAF6EF] border border-[#D4AF37]/40 p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0F0F10] text-[#D4AF37] border border-[#D4AF37]/30 flex items-center justify-center shrink-0 shadow-sm">
                    <Truck size={22} className="stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-widest uppercase text-[#9C6B30] bg-[#FAF5EB] px-2.5 py-0.5 rounded-full border border-[#D4AF37]/30">
                      {trackedOrder.status === 'delivered' ? 'Delivery Completed' : trackedOrder.status === 'shipped' ? 'In Transit' : 'Preparing Shipment'}
                    </span>
                    <h3 className="font-display text-lg text-neutral-900 font-semibold mt-1">
                      Carrier Partner:{' '}
                      <span className="text-[#9C6B30]">
                        {trackedOrder.courier?.carrier || trackedOrder.carrier || 'Pending Assignment'}
                      </span>
                    </h3>

                    {/* AWB with copy button */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs text-neutral-500 font-medium">AWB / Consignment:</span>
                      {(trackedOrder.courier?.trackingNumber || trackedOrder.trackingNumber) ? (
                        <div className="inline-flex items-center gap-1.5 bg-white border border-[#EAE3D2] px-3 py-1 rounded-lg shadow-2xs">
                          <code className="font-mono font-bold text-xs sm:text-sm text-neutral-900 tracking-wider">
                            {trackedOrder.courier?.trackingNumber || trackedOrder.trackingNumber}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopyAwb(trackedOrder.courier?.trackingNumber || trackedOrder.trackingNumber)}
                            className="p-1 text-neutral-400 hover:text-[#9C6B30] rounded transition cursor-pointer"
                            title="Copy AWB Tracking Number"
                          >
                            {copiedAwb ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          </button>
                        </div>
                      ) : (
                        <span className="italic text-xs text-neutral-400">AWB assigned upon courier dispatch</span>
                      )}
                      {copiedAwb && (
                        <span className="text-[11px] text-emerald-600 font-medium">Copied!</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live Portal Button */}
                {(trackedOrder.courier?.trackingUrl || trackedOrder.trackingUrl) ? (
                  <div className="shrink-0">
                    <a
                      href={trackedOrder.courier?.trackingUrl || trackedOrder.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#9C6B30] to-[#B38747] hover:from-[#855B29] hover:to-[#9C6B30] text-white font-semibold text-xs uppercase tracking-widest rounded-xl transition shadow-md hover:shadow-lg w-full sm:w-auto"
                    >
                      Open Carrier Tracking <ExternalLink size={14} />
                    </a>
                  </div>
                ) : (
                  <div className="shrink-0 text-xs text-neutral-500 bg-[#FAF5EB] px-3 py-2 rounded-lg border border-[#D4AF37]/20 flex items-center gap-1.5">
                    <Clock size={13} className="text-[#9C6B30]" />
                    <span>Live portal active upon carrier pickup</span>
                  </div>
                )}
              </div>

              {/* Courier notes */}
              {trackedOrder.courier?.notes && (
                <div className="mt-4 pt-3 border-t border-[#EAE3D2]/70 text-xs text-neutral-600 flex items-center gap-2">
                  <span className="font-semibold text-neutral-700">Courier Note:</span>
                  <span className="italic">{trackedOrder.courier.notes}</span>
                </div>
              )}
            </div>

            {/* Destination & Package Items */}
            <div className="grid md:grid-cols-2 gap-4">
              {trackedOrder.address && (
                <div className="border border-neutral-200 rounded-xl p-4 bg-white">
                  <div className="text-[10px] tracking-widest uppercase font-bold text-neutral-400 mb-2 flex items-center gap-1">
                    <MapPin size={11} /> Delivery Destination
                  </div>
                  {trackedOrder.address.fullName && (
                    <div className="font-semibold text-sm text-neutral-900">{trackedOrder.address.fullName}</div>
                  )}
                  <div className="text-xs text-neutral-600 mt-1">
                    {trackedOrder.address.city}, {trackedOrder.address.state} — {trackedOrder.address.pincode}
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-2 font-mono">
                    Payment Method: <span className="uppercase text-neutral-700 font-bold">{trackedOrder.payment || 'Prepaid'}</span>
                  </div>
                </div>
              )}

              {trackedOrder.items && trackedOrder.items.length > 0 && (
                <div className="border border-neutral-200 rounded-xl p-4 bg-white">
                  <div className="text-[10px] tracking-widest uppercase font-bold text-neutral-400 mb-2 flex items-center gap-1">
                    <Package size={11} /> Consignment Items ({trackedOrder.items.length})
                  </div>
                  <div className="space-y-2">
                    {trackedOrder.items.map((it, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-xs">
                        {it.image && (
                          <img src={it.image} alt={it.name} className="w-10 h-10 rounded-md object-cover border border-neutral-200 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-neutral-900 truncate">{it.name}</div>
                          <div className="text-[10px] text-neutral-500">Qty: {it.qty}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Status Milestones Timeline */}
            {trackedOrder.statusHistory && trackedOrder.statusHistory.length > 0 && (
              <div className="border border-neutral-200 rounded-xl p-4 sm:p-5 bg-neutral-50/50">
                <div className="text-[10px] tracking-widest uppercase font-bold text-[#9C6B30] mb-3 flex items-center gap-1.5">
                  <Clock size={12} /> Dispatch & Movement History
                </div>
                <ol className="relative border-l-2 border-[#E8E8E8] ml-2 space-y-3.5">
                  {[...trackedOrder.statusHistory].reverse().map((h, i) => (
                    <li key={i} className="pl-4 relative">
                      <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-[#9C6B30] ring-4 ring-white" />
                      <div className="flex items-baseline justify-between flex-wrap gap-2">
                        <div className="font-semibold capitalize text-neutral-900 text-xs">
                          {h.status}
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          {new Date(h.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {h.note && <div className="text-xs text-neutral-600 mt-0.5">{h.note}</div>}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Assurance footer */}
            <div className="p-3.5 bg-[#FAF5EB] border border-[#D4AF37]/30 rounded-xl flex items-center gap-2.5 text-xs text-neutral-700">
              <ShieldCheck size={18} className="text-[#9C6B30] shrink-0" />
              <span>
                <strong>Transit Assurance:</strong> All MikuMantra jewellery consignments are insured from our vault until signature upon delivery.
              </span>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-[#9C6B30]" /></div>}>
      <TrackOrderInner />
    </Suspense>
  );
}
