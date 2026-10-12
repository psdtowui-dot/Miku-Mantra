'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCompare } from '@/lib/browsing';
import { useCart } from '@/lib/cart-store';
import { formatINR, formatRating, getNormalizedSpecs } from '@/lib/products';
import { toast } from 'sonner';
import { GitCompare, X, ShoppingBag, Star, Loader2 } from 'lucide-react';

export default function ComparePage(){
  const { ids, toggle, clear } = useCompare();
  const { add } = useCart();
  const [items,setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (ids.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }
      try {
        const r = await fetch('/api/products', { cache: 'no-store' });
        const d = await r.json();
        const byId = Object.fromEntries((d.products || []).map(p => [p.id, p]));
        setItems(ids.map(i => byId[i]).filter(Boolean));
      } catch (err) {
        console.error('Compare page fetch failed:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [ids]);

  // Collect all unique specification labels from items being compared
  const uniqueLabels = [];
  items.forEach(p => {
    getNormalizedSpecs(p).forEach(s => {
      if (s.enabled && s.value?.trim() && !uniqueLabels.some(l => l.toLowerCase() === s.label.trim().toLowerCase())) {
        uniqueLabels.push(s.label.trim());
      }
    });
  });

  const specs = [
    ['Price', p => formatINR(p.price)],
    ['MRP', p => formatINR(p.mrp)],
    ...uniqueLabels.map(label => [
      label,
      p => {
        const spec = getNormalizedSpecs(p).find(s => s.label.trim().toLowerCase() === label.toLowerCase() && s.enabled);
        return spec ? spec.value : '—';
      }
    ]),
    ['SKU', p => p.sku||'—'],
    ['Category', p => p.category||'—'],
    ['Rating', p => (
      <span className="flex items-center gap-1">
        <Star size={12} className={p.reviews > 0 ? "fill-[#D4AF37] stroke-[#D4AF37]" : "text-neutral-300"}/> 
        <span className="font-medium text-neutral-700">{formatRating(p.rating)}</span>
        <span className="text-neutral-400">({p.reviews || 0})</span>
      </span>
    )],
    ['Stock', p => (p.stock??0)>0 ? (
      <span className="text-emerald-600 font-medium">In stock ({p.stock})</span>
    ) : (
      <span className="text-red-500 font-medium">Out of stock</span>
    )],
  ];

  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-12">
        <div className="text-center mb-10">
          <div className="text-[11px] tracking-[0.35em] uppercase text-[#9C6B30] mb-2">Side by Side</div>
          <h1 className="font-display text-4xl md:text-5xl font-light text-[#1A1A1A]">Compare Pieces</h1>
          <div className="gold-line w-16 mx-auto my-4"/>
          {!loading && items.length > 0 && (
            <div className="text-xs text-neutral-400 tracking-wider uppercase">
              {items.length} of 4 pieces selected
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
            <Loader2 className="animate-spin text-[#9C6B30] mb-2" size={32} />
            <span className="text-[10px] tracking-widest uppercase font-medium">Loading details…</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#FAF6EF] flex items-center justify-center text-[#9C6B30] mb-6 shadow-sm border border-[#D4AF37]/20">
              <GitCompare size={24}/>
            </div>
            <h2 className="font-display text-2xl text-neutral-800 font-light mb-3">Your comparison list is empty</h2>
            <p className="text-sm text-neutral-400 font-light leading-relaxed mb-8">
              Select up to 4 precious pieces to compare their design details, diamond cut specifications, metals, and weights side by side.
            </p>
            <Link 
              href="/shop" 
              className="inline-flex items-center justify-center bg-[#1A1A1A] hover:bg-[#9C6B30] text-white px-8 py-3.5 text-[11px] tracking-[0.3em] uppercase rounded-full shadow-sm transition"
            >
              Browse Collection
            </Link>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              {/* Swipe Cue on Mobile */}
              <div className="md:hidden text-[10px] text-neutral-400 tracking-widest uppercase flex items-center gap-1">
                <span>Swipe horizontally to compare</span>
                <span className="animate-pulse">→</span>
              </div>
              <div className="hidden md:block"></div>
              
              <button 
                onClick={clear} 
                className="text-[10px] tracking-widest uppercase text-neutral-400 hover:text-[#9C6B30] transition border-b border-transparent hover:border-[#9C6B30] pb-0.5"
              >
                Clear All
              </button>
            </div>

            <div className="w-full overflow-x-auto rounded-xl border border-neutral-200/80 bg-white shadow-sm scrollbar-thin">
              <table className="w-full min-w-[720px] table-fixed border-collapse border-spacing-0">
                <colgroup>
                  <col className="w-40 sm:w-48" />
                  {items.map(p => (
                    <col key={p.id} className="w-[200px] sm:w-[260px]" />
                  ))}
                </colgroup>
                
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="bg-neutral-50/50 border-r border-neutral-200"></th>
                    {items.map(p=>(
                      <th key={p.id} className="p-5 border-r border-neutral-200 align-top relative last:border-r-0">
                        <div className="flex flex-col h-full justify-between relative pb-16">
                          <div>
                            {/* Remove button */}
                            <button 
                              onClick={() => toggle(p.id)} 
                              className="absolute top-0 right-0 text-neutral-400 hover:text-red-500 transition-colors p-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-full z-10 shadow-xs"
                              aria-label="Remove product from comparison"
                            >
                              <X size={12}/>
                            </button>
                            
                            {/* Image */}
                            <Link 
                              href={`/product/${p.slug}`} 
                              className="block relative aspect-square rounded-lg overflow-hidden bg-[#FAF6EF] border border-neutral-100 mb-4 group"
                            >
                              <img 
                                src={p.images[0]} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                alt={p.name}
                              />
                            </Link>
                            
                            {/* Product Name */}
                            <Link href={`/product/${p.slug}`} className="block group text-left">
                              <h3 className="font-serif-luxe text-base text-[#1A1A1A] group-hover:text-[#9C6B30] leading-snug line-clamp-2 h-10 mb-2">
                                {p.name}
                              </h3>
                            </Link>
                            
                            {/* Price */}
                            <div className="mt-2 flex items-baseline gap-2 text-left">
                              <span className="font-medium text-sm text-[#1A1A1A]">{formatINR(p.price)}</span>
                              {p.mrp > p.price && (
                                <span className="text-[11px] text-neutral-400 line-through">{formatINR(p.mrp)}</span>
                              )}
                            </div>
                          </div>
                          
                          {/* Add to Bag CTA */}
                          <div className="absolute bottom-0 left-0 right-0">
                            <button 
                              onClick={() => { add(p); toast.success('Added to bag'); }} 
                              className="w-full py-2.5 bg-[#1A1A1A] hover:bg-[#9C6B30] text-white text-[10px] tracking-widest uppercase rounded-lg flex items-center justify-center gap-2 transition"
                            >
                              <ShoppingBag size={12}/> Add to Bag
                            </button>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                
                <tbody>
                  {specs.map(([label, fn], idx)=>(
                    <tr 
                      key={label} 
                      className={`border-b border-neutral-200 last:border-b-0 hover:bg-neutral-50/20 transition-colors`}
                    >
                      <td className="p-4 bg-neutral-50/50 border-r border-neutral-200 text-[10px] tracking-widest uppercase text-neutral-500 font-semibold sticky left-0 z-10">
                        {label}
                      </td>
                      {items.map(p=>(
                        <td key={p.id} className="p-4 border-r border-neutral-200 text-sm text-neutral-700 font-light last:border-r-0">
                          {fn(p)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
