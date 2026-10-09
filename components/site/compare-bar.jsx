'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCompare } from '@/lib/browsing';
import { GitCompare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CompareBar(){
  const { ids, toggle, clear } = useCompare();
  const [items,setItems] = useState([]);
  useEffect(()=>{
    if(ids.length===0){ setItems([]); return; }
    (async()=>{ try{ const r=await fetch('/api/products'); const d=await r.json(); const byId=Object.fromEntries((d.products||[]).map(p=>[p.id,p])); setItems(ids.map(i=>byId[i]).filter(Boolean)); }catch{} })();
  },[ids]);
  return (
    <AnimatePresence>
      {items.length>0 && (
        <motion.div initial={{y:100,opacity:0}} animate={{y:0,opacity:1}} exit={{y:100,opacity:0}} className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-4 left-1/2 -translate-x-1/2 z-40 bg-white border border-[#E8E8E8] rounded-full shadow-xl pl-2.5 pr-1.5 py-1.5 sm:pl-4 sm:pr-2 sm:py-2 flex items-center gap-1.5 xs:gap-2 sm:gap-3 max-w-[calc(100vw-1.5rem)]">
          <GitCompare size={15} className="text-[#9C6B30] shrink-0"/>
          <div className="flex -space-x-2 shrink-0">{items.slice(0,4).map(p=>(<div key={p.id} className="relative group"><img src={(p.images?.[0] && p.images[0].trim()) || '/logo.png'} alt={p.name || 'Jewellery'} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover ring-2 ring-white"/><button onClick={()=>toggle(p.id)} className="absolute -top-1 -right-1 w-4 h-4 bg-[#1A1A1A] text-white rounded-full opacity-80 sm:opacity-0 sm:group-hover:opacity-100 flex items-center justify-center"><X size={9}/></button></div>))}</div>
          <div className="text-xs text-neutral-500 hidden sm:block">{items.length} to compare</div>
          <button onClick={clear} className="text-[11px] sm:text-xs text-neutral-500 hover:text-[#9C6B30] px-1 sm:px-2 cursor-pointer">Clear</button>
          <Link href="/compare" className="bg-[#1A1A1A] hover:bg-[#9C6B30] text-white text-[9px] sm:text-[10px] tracking-wider sm:tracking-widest uppercase px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition shrink-0">Compare</Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
