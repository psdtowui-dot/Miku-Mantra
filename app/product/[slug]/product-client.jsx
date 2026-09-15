'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/site/product-card';
import RecentlyViewed from '@/components/site/recently-viewed';
import CompareBar from '@/components/site/compare-bar';
import { getRelated, formatINR, getNormalizedSpecs, getNormalizedBenefits } from '@/lib/products';
import { useCart, useWishlist } from '@/lib/cart-store';
import { useCompare, useRecentlyViewed } from '@/lib/browsing';
import { Heart, Share2, Truck, Minus, Plus, ChevronRight, Star, Sparkles, MapPin, Loader2, GitCompare } from 'lucide-react';
import BenefitIcon from '@/components/ui/benefit-icon';
import { toast } from 'sonner';
import { WAREHOUSE_PINCODE } from '@/lib/constants';

export default function ProductClient({ initialProduct, slug }) {
  const router = useRouter();
  const [p, setP] = useState(initialProduct);
  const [related, setRelated] = useState(getRelated(slug));
  const [loading, setLoading] = useState(!initialProduct);
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
  const [zoom, setZoom] = useState({ on: false, x: 50, y: 50 });
  const [reviewData, setReviewData] = useState({ reviews: [], averageRating: 0, totalReviews: 0, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, customerReviewsEnabled: true });
  const [loadingReviews, setLoadingReviews] = useState(true);

  useEffect(() => { (async () => { try { const r = await fetch(`/api/products/${slug}`, { cache: 'no-store' }); if (r.ok) { const d = await r.json(); if (d.product) setP(d.product); if (d.related) setRelated(d.related); } } finally { setLoading(false); } })(); }, [slug]);
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
            <div onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setZoom({ on: true, x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }); }} onMouseLeave={() => setZoom(z => ({ ...z, on: false }))} className="relative aspect-square rounded-2xl overflow-hidden bg-[#FAF6EF] luxe-shadow group">
              <img src={p.images[img]} alt={p.name} className="w-full h-full object-cover transition-transform duration-500" style={zoom.on ? { transformOrigin: `${zoom.x}% ${zoom.y}%`, transform: 'scale(1.8)' } : {}} />
              {isOutOfStock ? (
                <span className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-[#1A1A1A] text-white text-[9px] sm:text-[10px] tracking-wider sm:tracking-[0.25em] uppercase px-2 py-1 sm:px-3 sm:py-1.5 font-semibold z-10">OUT OF STOCK</span>
              ) : (
                p.badge && <span className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-[#1A1A1A] text-white text-[9px] sm:text-[10px] tracking-wider sm:tracking-[0.25em] uppercase px-2 py-1 sm:px-3 sm:py-1.5">{p.badge}</span>
              )}
              {disc > 0 && <span className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-[#9C6B30] text-white text-[9px] sm:text-[10px] tracking-wider uppercase px-2 py-1 sm:px-3 sm:py-1.5">-{disc}%</span>}
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2 sm:gap-3">{p.images.map((im, i) => (<button key={i} onClick={() => setImg(i)} className={`aspect-square rounded-lg overflow-hidden border-2 transition ${img === i ? 'border-[#9C6B30]' : 'border-transparent hover:border-[#E8E8E8]'}`}><img loading="lazy" src={im} className="w-full h-full object-cover" /></button>))}<div className="aspect-square rounded-lg border border-dashed border-[#E8E8E8] flex flex-col items-center justify-center text-[7px] xs:text-[8px] sm:text-[9px] tracking-tight xs:tracking-normal sm:tracking-widest uppercase text-neutral-400 gap-0.5"><Sparkles size={13} className="shrink-0" />360° View</div></div>
          </div>
          <div>
            <div className="text-[10px] sm:text-[11px] tracking-[0.35em] uppercase text-[#9C6B30] mb-2">{p.metal}</div>
            <h1 className="font-display text-2xl xs:text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] font-light leading-tight break-words">{p.name}</h1>
            <div className="flex items-center gap-2 sm:gap-3 mt-4 flex-wrap">
              <div className="flex items-center gap-1 text-xs sm:text-sm">
                <Star size={14} className="fill-[#D4AF37] stroke-[#D4AF37]" />
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
            <div className="text-xs text-neutral-500 mt-1">Inclusive of all taxes · EMI from ₹{Math.round(p.price / 12).toLocaleString('en-IN')}/mo{isOutOfStock ? ' · Out of stock' : (p.stock <= 5 && p.stock > 0 ? ` · Only ${p.stock} left` : '')}</div>
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
                    {/* Summary & Rating Breakdown */}
                    <div className="bg-[#FAF6EF]/50 p-4 sm:p-6 rounded-xl border border-[#E8E8E8] grid sm:grid-cols-12 gap-6 items-center">
                      <div className="sm:col-span-5 text-center sm:text-left space-y-1 sm:border-r border-[#E8E8E8] sm:pr-6">
                        <div className="text-3xl sm:text-4xl font-display font-bold text-[#1A1A1A]">
                          {reviewData.averageRating > 0 ? reviewData.averageRating.toFixed(1) : '0.0'}
                        </div>
                        <div className="flex items-center justify-center sm:justify-start gap-1 text-[#D4AF37]">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              size={16}
                              className={star <= Math.round(reviewData.averageRating) ? 'fill-[#D4AF37] stroke-[#D4AF37]' : 'text-neutral-300'}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-neutral-500 font-light pt-1">
                          Based on {reviewData.totalReviews} verified {reviewData.totalReviews === 1 ? 'review' : 'reviews'}
                        </p>
                      </div>

                      {/* Histogram */}
                      <div className="sm:col-span-7 space-y-1.5 text-xs">
                        {[5, 4, 3, 2, 1].map(stars => {
                          const cnt = reviewData.breakdown[stars] || 0;
                          const pct = reviewData.totalReviews > 0 ? Math.round((cnt / reviewData.totalReviews) * 100) : 0;
                          return (
                            <div key={stars} className="flex items-center gap-2">
                              <span className="w-8 text-neutral-600 font-medium">{stars} ★</span>
                              <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
                                <div className="h-full bg-[#9C6B30] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="w-9 text-right text-neutral-400 text-[11px] font-mono">{cnt} ({pct}%)</span>
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
                      <div className="text-center py-10 px-4 border border-dashed border-[#E8E8E8] rounded-xl bg-white space-y-1">
                        <Star className="mx-auto text-neutral-300" size={32} />
                        <h4 className="font-medium text-neutral-800 text-sm">No reviews yet</h4>
                        <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                          Be the first to review this piece! If you purchased this item, submit your review directly from your delivered order page.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {reviewData.reviews.map(r => (
                          <div key={r.id} className="border border-[#E8E8E8] rounded-xl p-4 sm:p-5 bg-white space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm text-[#1A1A1A]">{r.reviewerName || 'Customer'}</span>
                                  {r.verifiedPurchase && (
                                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                                      Verified Buyer
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-1 text-[#D4AF37] mt-1">
                                  {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} size={13} className={s <= r.rating ? 'fill-[#D4AF37] stroke-[#D4AF37]' : 'text-neutral-300'} />
                                  ))}
                                </div>
                              </div>
                              <span className="text-[11px] text-neutral-400 shrink-0">
                                {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                              </span>
                            </div>

                            {r.title && (
                              <h5 className="font-medium text-sm text-neutral-900 pt-1">{r.title}</h5>
                            )}

                            <p className="font-serif-luxe text-sm sm:text-base text-neutral-700 leading-relaxed">
                              &ldquo;{r.comment}&rdquo;
                            </p>

                            {Array.isArray(r.images) && r.images.length > 0 && (
                              <div className="flex gap-2 pt-2">
                                {r.images.map((imgUrl, i) => (
                                  <a key={i} href={imgUrl} target="_blank" rel="noreferrer">
                                    <img src={imgUrl} alt="Customer photo" className="w-16 h-16 object-cover rounded-lg border border-[#E8E8E8]" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
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
