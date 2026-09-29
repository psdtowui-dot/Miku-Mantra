'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/site/product-card';
import RecentlyViewed from '@/components/site/recently-viewed';
import CompareBar from '@/components/site/compare-bar';
import { getRelated, formatINR, getNormalizedSpecs, getNormalizedBenefits } from '@/lib/products';
import { useCart, useWishlist } from '@/lib/cart-store';
import { useCompare, useRecentlyViewed } from '@/lib/browsing';
import { Heart, Share2, Truck, Minus, Plus, ChevronRight, ChevronDown, ChevronUp, Star, MapPin, Loader2, GitCompare, ShieldCheck } from 'lucide-react';
import BenefitIcon from '@/components/ui/benefit-icon';
import ProductImageZoom from '@/components/site/product-image-zoom';
import { toast } from 'sonner';
import { WAREHOUSE_PINCODE } from '@/lib/constants';

export default function ProductClient({ initialProduct, slug, siteSettings }) {
  const router = useRouter();
  const [p, setP] = useState(initialProduct);
  const [related, setRelated] = useState(getRelated(slug));
  const [loading, setLoading] = useState(!initialProduct);
  const [zoomConfig, setZoomConfig] = useState(siteSettings?.zoomSettings || null);
  const { add } = useCart();
  const { has, toggle } = useWishlist();
  const { has: hasCmp, toggle: toggleCmp } = useCompare();
  const { push: pushRecent } = useRecentlyViewed();
  const [img, setImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState('desc');
  const [pin, setPin] = useState('');
  const [pinResult, setPinResult] = useState('');
  const [checkingPin, setCheckingPin] = useState(false);
  const [reviewData, setReviewData] = useState({ reviews: [], averageRating: 0, totalReviews: 0, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, customerReviewsEnabled: true });
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const reviewsContainerRef = useRef(null);

  useEffect(() => {
    setShowAllReviews(false);
    (async () => {
      try {
        const r = await fetch(`/api/products/${slug}`, { cache: 'no-store' });
        if (r.ok) {
          const d = await r.json();
          if (d.product) setP(d.product);
          if (d.related) setRelated(d.related);
          if (d.zoomSettings) setZoomConfig(d.zoomSettings);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  useEffect(() => {
    if (!zoomConfig) {
      fetch('/api/site-settings', { cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.zoomSettings) setZoomConfig(d.zoomSettings); })
        .catch(() => {});
    }
  }, [zoomConfig]);
  useEffect(() => { if (p?.id) pushRecent(p.id); }, [p?.id]);

  useEffect(() => {
    if (!p?.id && !slug) return;
    const fetchReviews = async () => {
      setLoadingReviews(true);
      try {
        const targetId = p?.id || slug;
        const res = await fetch(`/api/reviews/product/${targetId}`, { cache: 'no-store' });
        if (res.ok) {
          const d = await res.json();
          setReviewData({
            reviews: d.reviews || [],
            averageRating: d.averageRating || 0,
            totalReviews: d.totalReviews || 0,
            breakdown: d.breakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
            customerReviewsEnabled: d.customerReviewsEnabled ?? true
          });
        }
      } catch (err) {
        console.error('Error loading product reviews:', err);
      } finally {
        setLoadingReviews(false);
      }
    };
    fetchReviews();
  }, [p?.id, slug]);

  if (loading && !p) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-[#9C6B30]" /></div>;
  if (!p) return <div className="h-96 flex items-center justify-center text-neutral-400">Product not found</div>;
  const disc = Math.round(((p.mrp - p.price) / p.mrp) * 100);
  const checkPin = async () => {
    const cleanedPin = pin.replace(/[^0-9]/g, '');
    if (!cleanedPin || cleanedPin.length !== 6) {
      setPinResult('Please enter a valid 6-digit Pincode');
      return;
    }
    if (checkingPin) return;
    setCheckingPin(true);
    setPinResult('Checking delivery...');
    try {
      const res = await fetch('/api/check-pincode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePincode: WAREHOUSE_PINCODE,
          destinationPincode: cleanedPin
        })
      });
      if (!res.ok) {
        throw new Error('API failure');
      }
      const d = await res.json();
      if (d.serviceable) {
        const maxDays = d.estimatedDeliveryDays?.max || 5;
        const estDate = new Date();
        estDate.setDate(estDate.getDate() + maxDays);
        const formattedDate = estDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
        setPinResult(`Delivery by ${formattedDate} · Free shipping`);
      } else {
        setPinResult('Sorry, delivery is currently unavailable for this pincode.');
      }
    } catch (err) {
      setPinResult('Delivery check failed. Please try again later.');
    } finally {
      setCheckingPin(false);
    }
  };

  const isOutOfStock = p.stock !== undefined ? p.stock <= 0 : false;
  return (
    <main className="bg-white">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-4 sm:py-6"><nav className="text-xs text-neutral-500 flex items-center gap-1.5 sm:gap-2 flex-wrap break-words"><Link href="/" className="hover:text-[#9C6B30] shrink-0">Home</Link><ChevronRight size={12} className="shrink-0" /><Link href="/shop" className="hover:text-[#9C6B30] shrink-0">Shop</Link><ChevronRight size={12} className="shrink-0" /><Link href={`/shop?category=${p.category}`} className="hover:text-[#9C6B30] capitalize shrink-0">{p.category}</Link><ChevronRight size={12} className="shrink-0" /><span className="text-[#1A1A1A] truncate max-w-[120px] xs:max-w-[200px] sm:max-w-none">{p.name}</span></nav></div>
      <section className="max-w-[1400px] mx-auto px-4 md:px-8 pb-16">
        <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
          <div>
            <ProductImageZoom
              images={p.images || []}
              productName={p.name}
              badge={p.badge}
              discount={disc}
              isOutOfStock={isOutOfStock}
              zoomSettings={zoomConfig || siteSettings?.zoomSettings || {}}
              productZoomOverride={p.zoomMode || 'default'}
              activeImageIndex={img}
              onImageChange={(i) => setImg(i)}
            />
          </div>
          <div>
            <div className="text-[10px] sm:text-[11px] tracking-[0.35em] uppercase text-[#9C6B30] mb-2">{p.metal}</div>
            <h1 className="font-display text-2xl xs:text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] font-light leading-tight break-words">{p.name}</h1>
            <div className="flex items-center gap-2 sm:gap-3 mt-4 flex-wrap">
              <div className="flex items-center gap-1 text-xs sm:text-sm">
                <Star size={14} className={(reviewData.totalReviews > 0 || p.rating > 0) ? "fill-[#D4AF37] stroke-[#D4AF37]" : "text-neutral-300 stroke-neutral-400"} />
                <span className="font-medium">
                  {reviewData.totalReviews > 0 ? reviewData.averageRating.toFixed(1) : (p.rating > 0 ? p.rating : '0.0')}
                </span>
                <span className="text-neutral-500">
                  ({reviewData.totalReviews > 0 ? reviewData.totalReviews : (p.reviews || 0)} {(reviewData.totalReviews || p.reviews) === 1 ? 'review' : 'reviews'})
                </span>
              </div>
              <div className="h-3 w-px bg-neutral-300" />
              <span className="text-xs sm:text-sm text-neutral-500">SKU: {p.sku}</span>
            </div>
            <div className="gold-line w-full my-6" />
            <div className="flex flex-wrap items-baseline gap-2 sm:gap-4"><span className="font-display text-2xl xs:text-3xl sm:text-4xl text-[#1A1A1A]">{formatINR(p.price)}</span>{p.mrp > p.price && <><span className="text-sm sm:text-base text-neutral-400 line-through">{formatINR(p.mrp)}</span><span className="text-[#9C6B30] text-xs sm:text-sm font-medium">Save {disc}%</span></>}</div>
            <div className="text-xs text-neutral-500 mt-1">Inclusive of all taxes{isOutOfStock ? ' · Out of stock' : (p.stock <= 5 && p.stock > 0 ? ` · Only ${p.stock} left` : '')}</div>
            {isOutOfStock && (
              <div className="mt-3 inline-block px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold uppercase tracking-widest rounded-md">
                OUT OF STOCK
              </div>
            )}
            {(() => {
              const activeSpecs = getNormalizedSpecs(p).filter(s => s.enabled && s.value?.trim());
              if (activeSpecs.length === 0) return null;
              return (
                <div className="mt-8 grid grid-cols-1 xs:grid-cols-2 gap-2.5 sm:gap-3 text-sm">
                  {activeSpecs.slice(0, 4).map(s => (
                    <div key={s.id || s.label} className="border border-[#E8E8E8] rounded-lg p-2.5 sm:p-3">
                      <div className="text-[10px] tracking-widest uppercase text-neutral-400">{s.label}</div>
                      <div className="font-medium text-[#1A1A1A] mt-1 text-xs sm:text-sm">{s.value}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
            <div className="mt-6 border border-[#E8E8E8] rounded-lg p-3 sm:p-4"><div className="flex items-center gap-2 text-sm mb-2"><MapPin size={15} className="text-[#9C6B30]" /><span className="font-medium">Check delivery</span></div><div className="flex flex-wrap xs:flex-nowrap gap-2"><input value={pin} onChange={e => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} placeholder="Enter pincode" className="flex-1 min-w-[120px] border border-[#E8E8E8] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#9C6B30]" /><button disabled={checkingPin} onClick={checkPin} className="px-3 sm:px-5 py-2 bg-[#1A1A1A] text-white text-[10px] sm:text-[11px] tracking-wider sm:tracking-widest uppercase rounded-md hover:bg-[#9C6B30] disabled:opacity-50 shrink-0">Check</button></div>{pinResult && <div className="text-xs text-[#9C6B30] mt-2 flex items-center gap-1"><Truck size={12} />{pinResult}</div>}</div>
            <div className="mt-6 flex items-center gap-2 sm:gap-4 flex-wrap">
              <div className="flex items-center border border-[#E8E8E8] rounded-full">
                <button disabled={isOutOfStock} onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center hover:text-[#9C6B30] disabled:opacity-40 disabled:hover:text-current"><Minus size={14} /></button>
                <span className="w-8 sm:w-10 text-center text-sm font-medium">{isOutOfStock ? 0 : qty}</span>
                <button disabled={isOutOfStock || (p.stock !== undefined && qty >= p.stock)} onClick={() => setQty(Math.min(p.stock || 999, qty + 1))} className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center hover:text-[#9C6B30] disabled:opacity-40 disabled:hover:text-current"><Plus size={14} /></button>
              </div>
              <button onClick={() => toggle(p.id)} className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border border-[#E8E8E8] flex items-center justify-center hover:border-[#9C6B30] ${has(p.id) ? 'text-[#9C6B30]' : ''}`}><Heart size={16} fill={has(p.id) ? '#9C6B30' : 'none'} /></button>
              <button onClick={() => { const r = toggleCmp(p.id); if (r.full) toast.error('Compare up to 4 items'); else toast.success(r.added ? 'Added to compare' : 'Removed from compare'); }} className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border border-[#E8E8E8] flex items-center justify-center hover:border-[#9C6B30] ${hasCmp(p.id) ? 'text-[#9C6B30]' : ''}`}><GitCompare size={16} /></button>
              <button onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('Link copied'); }} className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border border-[#E8E8E8] flex items-center justify-center hover:border-[#9C6B30]"><Share2 size={16} /></button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
              <button
                disabled={isOutOfStock}
                onClick={() => {
                  if (isOutOfStock) {
                    toast.error('This product is currently out of stock.');
                    return;
                  }
                  add(p, qty);
                  toast.success('Added to bag');
                }}
                className={`py-3 sm:py-4 border-2 uppercase transition px-1 text-[9px] xs:text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] ${isOutOfStock ? 'bg-neutral-100 border-neutral-300 text-neutral-400 cursor-not-allowed opacity-60' : 'bg-white border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white'}`}
              >
                Add to Bag
              </button>
              <button
                disabled={isOutOfStock}
                onClick={() => {
                  if (isOutOfStock) {
                    toast.error('This product is currently out of stock.');
                    return;
                  }
                  add(p, qty);
                  router.push('/cart');
                }}
                className={`py-3 sm:py-4 uppercase transition px-1 text-[9px] xs:text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] ${isOutOfStock ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed opacity-60' : 'bg-[#1A1A1A] text-white hover:bg-[#9C6B30]'}`}
              >
                Buy Now
              </button>
            </div>

            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-neutral-500">
              <span className="flex items-center gap-1.5 text-neutral-600">
                <ShieldCheck size={14} className="text-emerald-600" />
                100% Secure Checkout
              </span>
              <span>•</span>
              <span className="text-neutral-600">Easy Returns</span>
            </div>
            {(() => {
              const activeBenefits = getNormalizedBenefits(p).filter(b => b.enabled !== false && b.title?.trim());
              if (activeBenefits.length === 0) return null;
              return (
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {activeBenefits.map((b, i) => (
                    <div key={b.id || b.title + i} className="flex items-center gap-3 text-neutral-600">
                      <div className="w-9 h-9 rounded-full bg-[#FAF6EF] flex items-center justify-center text-[#9C6B30] shrink-0">
                        <BenefitIcon icon={b.icon} size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="leading-snug text-neutral-700">{b.title}</div>
                        {b.description?.trim() && (
                          <div className="text-[11px] text-neutral-400 leading-tight mt-0.5">{b.description}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
            <div className="mt-10">
              <div className="flex gap-4 sm:gap-6 border-b border-[#E8E8E8] overflow-x-auto hide-scrollbar">
                {[['desc', 'Description'], ['spec', 'Specifications'], ['rev', 'Reviews']].map(([k, l]) => (
                  <button key={k} onClick={() => setTab(k)} className={`pb-3 text-[10px] sm:text-[11px] tracking-[0.15em] sm:tracking-[0.3em] uppercase transition whitespace-nowrap shrink-0 ${tab === k ? 'text-[#9C6B30] border-b-2 border-[#9C6B30]' : 'text-neutral-500'}`}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="pt-5 text-sm text-neutral-600 leading-relaxed">{tab === 'desc' && <p className="font-serif-luxe text-base sm:text-lg text-[#333] break-words">{p.description}</p>}{tab === 'spec' && (
                <ul className="space-y-2">
                  {getNormalizedSpecs(p)
                    .filter(s => s.enabled && s.value?.trim())
                    .map(s => (
                      <li key={s.id || s.label} className="flex justify-between border-b border-[#E8E8E8] py-2 gap-4 text-xs sm:text-sm">
                        <span className="text-neutral-500 shrink-0">{s.label}</span>
                        <span className="text-[#1A1A1A] font-medium text-right break-words">{s.value}</span>
                      </li>
                    ))}
                  {p.sku && (
                    <li className="flex justify-between border-b border-[#E8E8E8] py-2 text-xs sm:text-sm">
                      <span className="text-neutral-500">SKU</span>
                      <span className="text-[#1A1A1A] font-medium">{p.sku}</span>
                    </li>
                  )}
                </ul>
              )}
                {tab === 'rev' && (
                  <div className="space-y-6 pt-2">
                    {/* Summary & Rating Breakdown Card */}
                    <div className="bg-gradient-to-br from-[#FAF6EF] via-white to-[#FAF6EF]/60 p-5 sm:p-7 rounded-2xl border border-[#E8E8E8] shadow-xs grid sm:grid-cols-12 gap-6 sm:gap-8 items-center">
                      <div className="sm:col-span-5 text-center sm:text-left space-y-2 sm:border-r border-[#E8E8E8] sm:pr-8">
                        <div className="flex items-baseline justify-center sm:justify-start gap-2">
                          <span className="text-4xl sm:text-5xl font-display font-light text-[#1A1A1A]">
                            {reviewData.averageRating > 0 ? reviewData.averageRating.toFixed(1) : '0.0'}
                          </span>
                          <span className="text-sm text-neutral-400 font-light">/ 5.0</span>
                        </div>
                        <div className="flex items-center justify-center sm:justify-start gap-1 text-[#D4AF37]">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              size={18}
                              className={star <= Math.round(reviewData.averageRating) ? 'fill-[#D4AF37] stroke-[#D4AF37]' : 'text-neutral-300 stroke-neutral-300'}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-neutral-500 font-light tracking-wide">
                          Based on {reviewData.totalReviews} verified {reviewData.totalReviews === 1 ? 'review' : 'reviews'}
                        </p>
                      </div>

                      {/* Histogram */}
                      <div className="sm:col-span-7 space-y-2 text-xs">
                        {[5, 4, 3, 2, 1].map(stars => {
                          const cnt = reviewData.breakdown[stars] || 0;
                          const pct = reviewData.totalReviews > 0 ? Math.round((cnt / reviewData.totalReviews) * 100) : 0;
                          return (
                            <div key={stars} className="flex items-center gap-2.5">
                              <span className="w-10 text-neutral-600 font-medium flex items-center gap-1 shrink-0 text-xs">
                                <span>{stars}</span>
                                <Star size={11} className="fill-[#D4AF37] stroke-[#D4AF37]" />
                              </span>
                              <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden border border-neutral-200/50">
                                <div
                                  className="h-full bg-gradient-to-r from-[#C79B3B] to-[#9C6B30] rounded-full transition-all duration-700 ease-out"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="w-16 text-right text-neutral-500 text-[11px] font-mono shrink-0 whitespace-nowrap">
                                {cnt} <span className="text-neutral-400">({pct}%)</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Reviews List */}
                    {loadingReviews ? (
                      <div className="p-8 flex justify-center">
                        <Loader2 className="animate-spin text-[#9C6B30]" size={24} />
                      </div>
                    ) : reviewData.reviews.length === 0 ? (
                      <div className="text-center py-12 px-6 border border-dashed border-[#E8E8E8] rounded-2xl bg-[#FAF6EF]/30 space-y-2">
                        <div className="w-12 h-12 rounded-full bg-white border border-[#E8E8E8] mx-auto flex items-center justify-center text-neutral-400 shadow-2xs">
                          <Star className="text-[#9C6B30]/60" size={22} />
                        </div>
                        <h4 className="font-medium text-neutral-800 text-sm tracking-tight">No reviews yet</h4>
                        <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                          Be the first to review this piece! If you purchased this item, submit your review directly from your delivered order page.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div
                          ref={reviewsContainerRef}
                          tabIndex={showAllReviews ? 0 : undefined}
                          role={showAllReviews ? "region" : undefined}
                          aria-label={showAllReviews ? "Customer reviews list" : undefined}
                          className={`space-y-4 ${
                            showAllReviews
                              ? "max-h-[520px] sm:max-h-[580px] overflow-y-auto overflow-x-hidden pr-2 sm:pr-3 pb-2 reviews-scroll-container focus:outline-none"
                              : ""
                          }`}
                        >
                          {(showAllReviews ? reviewData.reviews : reviewData.reviews.slice(0, 2)).map(r => {
                            const initials = (r.reviewerName || 'Customer')
                              .split(' ')
                              .map(w => w[0])
                              .filter(Boolean)
                              .slice(0, 2)
                              .join('')
                              .toUpperCase() || 'C';

                            return (
                              <div
                                key={r.id}
                                className="border border-[#EAE6DF] hover:border-[#D4AF37]/50 rounded-2xl p-4 sm:p-5 bg-white space-y-3 transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(156,107,48,0.06)]"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#FAF6EF] to-[#F3ECE0] border border-[#E8E8E8] text-[#9C6B30] font-medium text-xs flex items-center justify-center shrink-0 tracking-wider shadow-2xs">
                                      {initials}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-sm text-[#1A1A1A]">{r.reviewerName || 'Customer'}</span>
                                        {r.verifiedPurchase && (
                                          <span className="inline-flex items-center gap-1 text-[10px] tracking-wider uppercase font-semibold text-emerald-700 bg-emerald-50/90 border border-emerald-200/80 px-2 py-0.5 rounded-full shadow-2xs">
                                            <ShieldCheck size={11} className="text-emerald-600" />
                                            Verified Buyer
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex gap-1 text-[#D4AF37] mt-1">
                                        {[1, 2, 3, 4, 5].map(s => (
                                          <Star
                                            key={s}
                                            size={13}
                                            className={s <= r.rating ? 'fill-[#D4AF37] stroke-[#D4AF37]' : 'text-neutral-300 stroke-neutral-300'}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  <span className="text-xs text-neutral-400 font-light shrink-0 pt-0.5">
                                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                                  </span>
                                </div>

                                {r.title && (
                                  <h5 className="font-medium text-sm sm:text-base text-neutral-900 pt-0.5 tracking-tight">{r.title}</h5>
                                )}

                                <p className="text-neutral-600 text-xs sm:text-sm leading-relaxed font-normal">
                                  {r.comment}
                                </p>

                                {Array.isArray(r.images) && r.images.length > 0 && (
                                  <div className="flex gap-2 pt-1.5">
                                    {r.images.map((imgUrl, i) => (
                                      <a
                                        key={i}
                                        href={imgUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="group/img block overflow-hidden rounded-xl border border-[#E8E8E8] hover:border-[#9C6B30] transition shadow-2xs"
                                      >
                                        <img
                                          src={imgUrl}
                                          alt="Customer photo"
                                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover group-hover/img:scale-105 transition-transform duration-300"
                                        />
                                      </a>
                                    ))}
                                  </div>
                                )}

                                {r.adminReply && (
                                  <div className="mt-3.5 p-3.5 sm:p-4 bg-[#FAF6EF]/70 border-l-2 border-[#9C6B30] rounded-r-xl text-xs space-y-1.5">
                                    <div className="font-semibold text-[#9C6B30] flex items-center justify-between flex-wrap gap-1 text-xs tracking-wide">
                                      <span>Response from {typeof r.adminReply === 'object' ? (r.adminReply.repliedBy || 'MikuMantra Atelier') : 'MikuMantra Atelier'}</span>
                                      {typeof r.adminReply === 'object' && r.adminReply.repliedAt && (
                                        <span className="text-[10px] text-neutral-400 font-normal">
                                          {new Date(r.adminReply.repliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-neutral-700 leading-relaxed font-serif-luxe text-xs sm:text-sm">
                                      {typeof r.adminReply === 'object' ? r.adminReply.comment : r.adminReply}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {reviewData.reviews.length > 2 && (
                          <div className="pt-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (showAllReviews && reviewsContainerRef.current) {
                                  reviewsContainerRef.current.scrollTop = 0;
                                }
                                setShowAllReviews(prev => !prev);
                              }}
                              aria-expanded={showAllReviews}
                              className="inline-flex items-center justify-center gap-2.5 px-8 py-3 rounded-full text-xs font-medium tracking-[0.2em] uppercase transition-all duration-300 border border-[#9C6B30] text-[#9C6B30] hover:bg-[#9C6B30] hover:text-white shadow-xs hover:shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#9C6B30]/30 active:scale-[0.98]"
                            >
                              <span>{showAllReviews ? 'Show Less Reviews' : `Show More Reviews (${reviewData.reviews.length - 2} More)`}</span>
                              {showAllReviews ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}</div></div>
          </div>
        </div>
      </section>
      {related.length > 0 && (<section className="max-w-[1400px] mx-auto px-4 md:px-8 pb-24"><div className="text-center mb-10"><div className="text-[11px] tracking-[0.35em] uppercase text-[#9C6B30] mb-2">You may also love</div><h2 className="font-display text-2xl xs:text-3xl md:text-4xl font-light">Related Pieces</h2><div className="gold-line w-16 mx-auto my-4" /></div><div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-6 md:gap-8">{related.map((r, i) => <ProductCard key={r.id} p={r} index={i} />)}</div></section>)}
      <RecentlyViewed exclude={p.id} />
      <CompareBar />
    </main>
  );
}
