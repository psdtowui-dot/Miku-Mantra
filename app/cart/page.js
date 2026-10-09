'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useCart } from '@/lib/cart-store';
import { useAuth, authFetch } from '@/lib/use-auth';
import { formatINR } from '@/lib/products';
import { Minus, Plus, X, ShoppingBag, Truck, ShieldCheck, Gift, ArrowRight, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function CartPage() {
  const { user } = useAuth();
  const { items, setQty, remove, subtotal } = useCart();
  const router = useRouter();
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [gift, setGift] = useState(false);
  const [applying, setApplying] = useState(false);
  const [stockStatus, setStockStatus] = useState({});
  const [validating, setValidating] = useState(true);
  const [shippingConfig, setShippingConfig] = useState({
    freeShippingEnabled: true,
    freeShippingThreshold: 2000,
    standardShippingCharge: 500
  });

  const productListRef = useRef(null);
  const lastScrollTopRef = useRef(0);

  // Scroll handler on product list container to trigger header show/hide
  const handleProductListScroll = (e) => {
    const scrollTop = e.currentTarget.scrollTop;
    const delta = scrollTop - lastScrollTopRef.current;
    const THRESHOLD = 8;

    if (scrollTop <= 15) {
      window.dispatchEvent(new CustomEvent('header-scroll', { detail: { direction: 'up', atTop: true } }));
    } else if (delta > THRESHOLD) {
      window.dispatchEvent(new CustomEvent('header-scroll', { detail: { direction: 'down', atTop: false } }));
    } else if (delta < -THRESHOLD) {
      window.dispatchEvent(new CustomEvent('header-scroll', { detail: { direction: 'up', atTop: false } }));
    }

    lastScrollTopRef.current = scrollTop;
  };

  // Prevent document/body from scrolling on desktop cart page so only the product list scrolls
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth >= 1024 && window.innerHeight >= 600 && items.length > 0) {
        document.documentElement.style.overflow = 'hidden';
      } else if (typeof document !== 'undefined') {
        document.documentElement.style.overflow = '';
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      if (typeof document !== 'undefined') {
        document.documentElement.style.overflow = '';
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [items.length]);

  // Forward desktop wheel events outside the product list to the product list container
  useEffect(() => {
    const handleWheel = (e) => {
      if (window.innerWidth >= 1024 && productListRef.current) {
        if (!productListRef.current.contains(e.target)) {
          productListRef.current.scrollTop += e.deltaY;
        }
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    authFetch('/api/site-settings')
      .then(r => r.json())
      .then(d => {
        if (d && d.shipping) {
          setShippingConfig(d.shipping);
        }
      })
      .catch(err => console.error('Failed to load shipping config:', err));
  }, []);

  const freeEnabled = shippingConfig?.freeShippingEnabled ?? true;
  const threshold = Number(shippingConfig?.freeShippingThreshold ?? 2000);
  const standardCharge = Number(shippingConfig?.standardShippingCharge ?? 500);

  const shipping = subtotal === 0 ? 0 : (freeEnabled && subtotal >= threshold ? 0 : standardCharge);
  const tax = Math.round((subtotal - discount) * 0.03);
  const total = Math.max(0, subtotal - discount + shipping + tax + (gift ? 250 : 0));

  useEffect(() => {
    let unmounted = false;
    async function validateStock() {
      if (!items || items.length === 0) return;
      try {
        const r = await authFetch('/api/cart/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: items.map(i => ({ id: i.id, slug: i.slug, qty: i.qty })) })
        });
        if (r.ok) {
          const d = await r.json();
          if (!unmounted && Array.isArray(d.items)) {
            const map = {};
            d.items.forEach(it => { map[it.id] = it; });
            setStockStatus(map);
          }
        }
      } catch (err) {
        console.error('Failed to validate stock:', err);
      } finally {
        if (!unmounted) setValidating(false);
      }
    }
    validateStock();
    return () => { unmounted = true; };
  }, [items]);

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    setApplying(true);
    try {
      const r = await authFetch('/api/coupons/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: coupon, subtotal }) });
      const d = await r.json();
      if (r.ok) { setDiscount(d.discount); setCouponCode(d.code); toast.success(`${d.code} applied — ${d.type === 'percent' ? d.value + '%' : '₹' + d.value} off`); }
      else { setDiscount(0); setCouponCode(''); toast.error(d.error || 'Invalid coupon'); }
    } finally { setApplying(false); }
  };

  if (items.length === 0) {
    return (
      <main className="bg-white min-h-screen">
        <div className="max-w-lg mx-auto text-center py-16 sm:py-32 px-4 sm:px-6">
          <div className="w-24 h-24 mx-auto rounded-full bg-[#FAF6EF] flex items-center justify-center mb-6 text-[#9C6B30]"><ShoppingBag size={36} /></div>
          <h1 className="font-display text-4xl text-[#1A1A1A] font-light">Your bag awaits</h1>
          <div className="gold-line w-16 mx-auto my-5" />
          <p className="text-neutral-500 mb-8">Discover pieces made to be worn, treasured, and passed on.</p>
          <Link href="/shop" className="inline-flex items-center gap-3 bg-[#1A1A1A] text-white px-8 py-4 text-[11px] tracking-[0.3em] uppercase hover:bg-[#9C6B30] transition">Continue Shopping <ArrowRight size={14} /></Link>
        </div>
      </main>
    );
  }

  const couponKey = user?.id ? `mikumantra_coupon_${user.id}` : 'mikumantra_coupon_guest';
  const giftKey = user?.id ? `mikumantra_gift_${user.id}` : 'mikumantra_gift_guest';

  const goCheckout = () => {
    const hasOut = items.some(i => stockStatus[i.id]?.status === 'out_of_stock');
    const hasInsufficient = items.some(i => stockStatus[i.id]?.status === 'insufficient_stock' || i.qty > (stockStatus[i.id]?.availableStock ?? 999));
    if (hasOut) {
      toast.error('This product is currently out of stock.');
      return;
    }
    if (hasInsufficient) {
      const item = items.find(i => stockStatus[i.id]?.status === 'insufficient_stock');
      const avail = stockStatus[item?.id]?.availableStock;
      toast.error(avail !== undefined ? `Only ${avail} items are available.` : 'Requested quantity exceeds available stock.');
      return;
    }
    // stash coupon in sessionStorage for checkout
    if (couponCode) sessionStorage.setItem(couponKey, JSON.stringify({ code: couponCode, discount, gift }));
    else sessionStorage.removeItem(couponKey);
    if (gift) sessionStorage.setItem(giftKey, '1'); else sessionStorage.removeItem(giftKey);
    router.push('/checkout');
  };


  const hasStockIssue = items.some(i => stockStatus[i.id]?.status === 'out_of_stock' || stockStatus[i.id]?.status === 'insufficient_stock');

  return (
    <main className="bg-white min-h-screen lg:h-[calc(100vh-5rem)] lg:max-h-[calc(100vh-5rem)] lg:overflow-hidden flex flex-col">
      <div className="max-w-[1400px] w-full mx-auto px-4 md:px-8 pt-4 sm:pt-6 pb-2 lg:pb-3 shrink-0">
        <div className="text-center">
          <div className="text-[10px] sm:text-[11px] tracking-[0.35em] uppercase text-[#9C6B30] mb-1.5">Your Selection</div>
          <h1 className="font-display text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-light text-[#1A1A1A] break-words">Shopping Bag</h1>
          <div className="gold-line w-16 mx-auto my-3" />
          <div className="text-xs sm:text-sm text-neutral-500">{items.length} {items.length === 1 ? 'item' : 'items'} · in your shopping bag</div>
        </div>
      </div>

      <div className="max-w-[1400px] w-full mx-auto px-4 md:px-8 pb-6 lg:pb-8 flex-1 min-h-0 flex flex-col">
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-10 flex-1 min-h-0 items-start">
          {/* Left Column: Fixed Progress Bar + Dedicated Scrollable Products List */}
          <div className="lg:col-span-2 flex flex-col lg:h-full lg:min-h-0">
            {/* Free shipping bar fixed above the products */}
            {freeEnabled && subtotal > 0 && (
              <div className="p-3.5 sm:p-4 rounded-xl border border-[#E8E8E8] bg-[#FAF6EF]/60 shadow-xs mb-4 shrink-0">
                <div className="flex items-center justify-between text-xs sm:text-sm font-medium mb-2">
                  <span className="flex items-center gap-2 text-[#1A1A1A]">
                    <Truck size={16} className="text-[#9C6B30] shrink-0" />
                    {subtotal >= threshold ? (
                      <span className="text-[#9C6B30] font-bold">🎉 You got FREE shipping!</span>
                    ) : (
                      <span>Add <strong className="text-[#9C6B30]">₹{(threshold - subtotal).toLocaleString('en-IN')}</strong> more to get <strong className="text-[#9C6B30]">FREE shipping!</strong></span>
                    )}
                  </span>
                  <span className="text-[11px] text-neutral-500 font-mono">
                    {Math.min(100, Math.round((subtotal / threshold) * 100))}%
                  </span>
                </div>
                <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#9C6B30] transition-all duration-300 rounded-full"
                    style={{ width: `${Math.min(100, Math.round((subtotal / threshold) * 100))}%` }}
                  />
                </div>
              </div>
            )}

            {/* Scrollable Container - ONLY section that scrolls */}
            <div
              ref={productListRef}
              onScroll={handleProductListScroll}
              className="cart-products-scroll flex-1 min-h-0 lg:overflow-y-auto pr-1.5 sm:pr-2.5 space-y-3.5 sm:space-y-4"
            >
              <AnimatePresence>
                {items.map(item => {
                  const info = stockStatus[item.id];
                  const isOut = info?.status === 'out_of_stock';
                  const isInsufficient = info?.status === 'insufficient_stock';
                  return (
                    <motion.div key={item.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }} className={`flex gap-2.5 xs:gap-3 sm:gap-5 p-3 sm:p-5 border rounded-xl bg-white transition ${isOut ? 'border-red-300 bg-red-50/10' : isInsufficient ? 'border-amber-300 bg-amber-50/10' : 'border-[#E8E8E8] hover:border-[#D4AF37]'}`}>
                      <Link href={`/product/${item.slug}`} className="w-16 h-16 xs:w-20 xs:h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-lg overflow-hidden bg-[#FAF6EF] shrink-0 relative flex items-center justify-center">
                        {item.image && item.image.trim() ? (
                          <img src={item.image.trim()} alt={item.name || 'Product'} className="w-full h-full object-cover" />
                        ) : (
                          <ShoppingBag size={24} className="text-[#9C6B30]/40" />
                        )}
                        {isOut && <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-[9px] font-semibold uppercase px-1 text-center">Out of stock</span>}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <Link href={`/product/${item.slug}`}><h3 className="font-serif-luxe text-base sm:text-xl text-[#1A1A1A] hover:text-[#9C6B30] break-words">{item.name}</h3></Link>
                            {isOut ? (
                              <div className="text-[11px] font-semibold text-red-600 mt-0.5 sm:mt-1">Out of stock</div>
                            ) : isInsufficient ? (
                              <div className="text-[11px] font-semibold text-amber-700 mt-0.5 sm:mt-1">Only {info.availableStock} item(s) currently available</div>
                            ) : (
                              <div className="text-[11px] sm:text-xs text-neutral-500 mt-0.5 sm:mt-1">In Stock · Ships in 2-3 days</div>
                            )}
                          </div>
                          <button onClick={() => remove(item.id)} className="text-neutral-400 hover:text-[#9C6B30] shrink-0 p-0.5 cursor-pointer"><X size={18} /></button>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 mt-3 sm:mt-4">
                          <div className="flex items-center border border-[#E8E8E8] rounded-full w-fit">
                            <button onClick={() => setQty(item.id, item.qty - 1)} className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center hover:text-[#9C6B30] cursor-pointer"><Minus size={13} /></button>
                            <span className="w-7 sm:w-8 text-center text-xs sm:text-sm font-medium">{item.qty}</span>
                            <button disabled={isOut || (info?.availableStock !== undefined && item.qty >= info.availableStock)} onClick={() => setQty(item.id, item.qty + 1)} className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center hover:text-[#9C6B30] disabled:opacity-40 cursor-pointer"><Plus size={13} /></button>
                          </div>
                          <div className="text-left sm:text-right"><div className="font-display text-lg sm:text-xl text-[#1A1A1A]">{formatINR(item.price * item.qty)}</div>{item.mrp > item.price && <div className="text-[11px] sm:text-xs text-neutral-400 line-through">{formatINR(item.mrp * item.qty)}</div>}</div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Continue Shopping at the bottom of the product list */}
              <div className="pt-2 pb-6">
                <Link href="/shop" className="inline-flex items-center gap-2 text-[#9C6B30] text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] uppercase hover:gap-4 transition-all">
                  ← Continue Shopping
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary - STATIONARY */}
          <aside className="lg:col-span-1 shrink-0">
            <div className="border border-[#E8E8E8] rounded-xl p-4 sm:p-6 bg-[#FAF6EF]/30 shadow-xs">
              <div className="font-display text-xl sm:text-2xl text-[#1A1A1A] mb-1">Order Summary</div>
              <div className="gold-line w-12 mb-4 sm:mb-6" />
              <div className="flex flex-wrap xs:flex-nowrap gap-2 mb-2"><div className="flex-1 min-w-[120px] flex items-center border border-[#E8E8E8] rounded-md bg-white"><Tag size={14} className="ml-2.5 text-[#9C6B30] shrink-0" /><input value={coupon} onChange={e => setCoupon(e.target.value)} placeholder="Enter coupon" className="flex-1 px-2.5 py-2 sm:px-3 sm:py-2.5 text-xs sm:text-sm bg-transparent focus:outline-none min-w-0" /></div><button disabled={applying} onClick={applyCoupon} className="px-3.5 sm:px-5 py-2 sm:py-2.5 bg-[#1A1A1A] text-white text-[10px] sm:text-[11px] tracking-widest uppercase rounded-md hover:bg-[#9C6B30] disabled:opacity-60 shrink-0 cursor-pointer">{applying ? '…' : 'Apply'}</button></div>
              <div className="text-[10px] text-neutral-500 mb-4">Try <span className="text-[#9C6B30]">MIKUMANTRA10</span> or <span className="text-[#9C6B30]">WELCOME2000</span></div>
              <label className="flex items-start gap-3 border border-dashed border-[#E8E8E8] rounded-md p-3 mb-5 cursor-pointer hover:border-[#9C6B30]"><input type="checkbox" checked={gift} onChange={e => setGift(e.target.checked)} className="mt-0.5 accent-[#9C6B30] shrink-0" /><div><div className="text-xs sm:text-sm font-medium flex items-center gap-2"><Gift size={14} className="text-[#9C6B30] shrink-0" /> Signature Gift Wrap</div><div className="text-[11px] sm:text-xs text-neutral-500">Silk pouch, handwritten note. +₹250</div></div></label>
              <div className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between"><span className="text-neutral-500">Subtotal</span><span>{formatINR(subtotal)}</span></div>
                {discount > 0 && <div className="flex justify-between text-[#9C6B30]"><span>Discount ({couponCode})</span><span>− {formatINR(discount)}</span></div>}
                <div className="flex justify-between"><span className="text-neutral-500">Shipping</span><span>{shipping === 0 ? <span className="text-[#9C6B30]">Free</span> : formatINR(shipping)}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Tax (GST)</span><span>{formatINR(tax)}</span></div>
                {gift && <div className="flex justify-between"><span className="text-neutral-500">Gift Wrap</span><span>{formatINR(250)}</span></div>}
              </div>
              <div className="gold-line w-full my-4 sm:my-5" />
              <div className="flex justify-between items-baseline mb-6"><span className="text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] uppercase">Total</span><span className="font-display text-2xl sm:text-3xl text-[#1A1A1A]">{formatINR(total)}</span></div>
              <button disabled={hasStockIssue} onClick={goCheckout} className={`w-full py-3.5 sm:py-4 text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] uppercase transition rounded-md cursor-pointer ${hasStockIssue ? 'bg-neutral-400 text-white cursor-not-allowed opacity-70' : 'bg-[#1A1A1A] text-white hover:bg-[#9C6B30]'}`}>Proceed to Checkout</button>
              <div className="mt-5 space-y-2 text-xs text-neutral-500"><div className="flex items-center gap-2"><Truck size={13} className="text-[#9C6B30] shrink-0" /> Insured, tracked delivery</div><div className="flex items-center gap-2"><ShieldCheck size={13} className="text-[#9C6B30] shrink-0" /> Secure checkout · SGL certified</div></div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
