'use client';
import { useEffect, useState } from 'react';
import { useRecentlyViewed } from '@/lib/browsing';
import ProductCard from '@/components/site/product-card';

export default function RecentlyViewed({ exclude }){
  const { ids } = useRecentlyViewed();
  const [items,setItems] = useState([]);
  useEffect(()=>{
    (async()=>{
      const filtered = ids.filter(id=>id!==exclude);
      if(filtered.length===0){ setItems([]); return; }
      try{
        const r = await fetch('/api/products'); const d = await r.json();
        const byId = Object.fromEntries((d.products||[]).map(p=>[p.id,p]));
        setItems(filtered.map(i=>byId[i]).filter(Boolean).slice(0,4));
      }catch{}
    })();
  },[ids, exclude]);
  if(items.length===0) return null;
  return (
    <section className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 pb-24">
      <div className="text-center mb-10">
        <div className="text-[11px] tracking-[0.35em] uppercase text-[#9C6B30] mb-2">From your history</div>
        <h2 className="font-display text-3xl md:text-4xl font-light">Recently Viewed</h2>
        <div className="gold-line w-16 mx-auto my-4"/>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">{items.map((r,i)=><ProductCard key={r.id} p={r} index={i}/>)}</div>
    </section>
  );
}
