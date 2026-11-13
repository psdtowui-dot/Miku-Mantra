'use client';
import Link from 'next/link';
import { Heart, ShoppingBag, Eye, Star, GitCompare, Share2 } from 'lucide-react';
import { useCart, useWishlist } from '@/lib/cart-store';
import { useCompare } from '@/lib/browsing';
import { formatINR, formatRating } from '@/lib/products';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { optimizeImageUrl } from '@/lib/image-utils';

export default function ProductCard({ p, index=0 }){
  const { add } = useCart();
  const { has, toggle } = useWishlist();
  const { has: hasCmp, toggle: toggleCmp } = useCompare();
  const disc = Math.round(((p.mrp-p.price)/p.mrp)*100);
  const isOutOfStock = p.stock !== undefined ? p.stock <= 0 : false;
  const primaryImg = (Array.isArray(p.images) && p.images[0]) || p.image || '/logo.png';
  const secondaryImg = (Array.isArray(p.images) && p.images[1]) || null;

  const handleShare = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const slugOrId = p.slug || p.id || p._id || '';
    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/product/${slugOrId}`
      : `/product/${slugOrId}`;
    const shareData = {
      title: p.name || 'Miku Mantra',
      text: p.name ? `Check out ${p.name} on Miku Mantra` : 'Check out this product on Miku Mantra',
      url: shareUrl,
    };

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement('input');
        input.value = shareUrl;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  };
  return (
    <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:.5,delay:Math.min(index*.05,.4)}} className="group">
      <div className="relative overflow-hidden rounded-xl bg-[#FAF6EF] aspect-[4/5]">
        <Link href={`/product/${p.slug}`}>
          <img width="400" height="500" loading={index < 2 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "auto"} decoding="async" src={optimizeImageUrl(primaryImg, { width: 500, quality: 80 })} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
          {secondaryImg && <img width="400" height="500" loading="lazy" decoding="async" src={optimizeImageUrl(secondaryImg, { width: 500, quality: 80 })} alt="" className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"/>}
        </Link>
        {isOutOfStock ? (
          <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-[#1A1A1A] text-white text-[9px] sm:text-[10px] tracking-normal xs:tracking-wider sm:tracking-[0.2em] uppercase px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-sm z-10 font-semibold shadow-xs">OUT OF STOCK</span>
        ) : (
          p.badge && <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-[#1A1A1A] text-white text-[9px] sm:text-[10px] tracking-normal xs:tracking-wider sm:tracking-[0.2em] uppercase px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-sm max-w-[48%] truncate">{p.badge}</span>
        )}
        {disc>0 && <span className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-[#9C6B30] text-white text-[9px] sm:text-[10px] tracking-normal xs:tracking-wider uppercase px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-sm">-{disc}%</span>}
        <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 sm:gap-2 opacity-90 sm:opacity-0 translate-x-0 sm:translate-x-2 sm:group-hover:opacity-100 sm:group-hover:translate-x-0 transition-all duration-300 z-10">
          <button type="button" aria-label="Add to wishlist" title="Wishlist" onClick={(e)=>{e.preventDefault();toggle(p.id);}} className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white shadow flex items-center justify-center hover:bg-[#9C6B30] hover:text-white transition-colors duration-200 ${has(p.id)?'text-[#9C6B30]':''}`}><Heart size={14} fill={has(p.id)?'#9C6B30':'none'}/></button>
          <button type="button" aria-label="Compare product" title="Compare" onClick={(e)=>{e.preventDefault(); const r = toggleCmp(p.id); if(r.full) toast.error('Compare up to 4 items'); else toast.success(r.added?'Added to compare':'Removed from compare');}} className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white shadow flex items-center justify-center hover:bg-[#9C6B30] hover:text-white transition-colors duration-200 ${hasCmp(p.id)?'text-[#9C6B30]':''}`}><GitCompare size={14}/></button>
          <Link href={`/product/${p.slug}`} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white shadow flex items-center justify-center hover:bg-[#9C6B30] hover:text-white"><Eye size={14}/></Link>
          <button type="button" aria-label="Share product" title="Share" onClick={handleShare} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white shadow flex items-center justify-center hover:bg-[#9C6B30] hover:text-white transition-colors duration-200"><Share2 size={14}/></button>
        </div>
        {isOutOfStock ? (
          <button disabled onClick={(e)=>{e.preventDefault();toast.error('This product is currently out of stock.');}} className="absolute bottom-0 left-0 right-0 bg-neutral-800 text-neutral-400 py-2.5 sm:py-3 text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.25em] uppercase translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex items-center justify-center gap-1.5 sm:gap-2 cursor-not-allowed"><ShoppingBag size={13}/> OUT OF STOCK</button>
        ) : (
          <button onClick={(e)=>{e.preventDefault();add(p);toast.success('Added to cart');}} className="absolute bottom-0 left-0 right-0 bg-[#1A1A1A] text-white py-2.5 sm:py-3 text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.25em] uppercase translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex items-center justify-center gap-1.5 sm:gap-2"><ShoppingBag size={13}/> Add to Bag</button>
        )}
      </div>
      <div className="pt-3 sm:pt-4 text-center px-0.5 sm:px-0">
        <Link href={`/product/${p.slug}`}><h3 className="font-serif-luxe text-base sm:text-lg text-[#1A1A1A] leading-tight hover:text-[#9C6B30] transition break-words line-clamp-2">{p.name}</h3></Link>
        <div className="text-[10px] sm:text-[11px] text-neutral-500 tracking-wider uppercase mt-1 truncate">{p.metal}</div>
        <div className="flex items-center justify-center gap-1 mt-1 text-[10px] sm:text-[11px] text-neutral-500"><Star size={11} className={p.reviews > 0 ? "fill-[#D4AF37] stroke-[#D4AF37]" : "text-neutral-300"}/> <span>{formatRating(p.rating)}</span><span className="opacity-60">({p.reviews || 0})</span></div>
        <div className="mt-1.5 flex flex-wrap items-baseline justify-center gap-1 sm:gap-2">
          <span className="font-medium text-xs sm:text-sm text-[#1A1A1A]">{formatINR(p.price)}</span>
          {p.mrp>p.price && <span className="text-[11px] sm:text-xs text-neutral-400 line-through">{formatINR(p.mrp)}</span>}
        </div>
      </div>
    </motion.div>
  );
}
