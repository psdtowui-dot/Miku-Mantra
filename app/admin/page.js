'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatINR } from '@/lib/products';
import { Package, ShoppingCart, Users, TrendingUp, ArrowRight, Loader2 } from 'lucide-react';

export default function AdminDashboard(){
  const [data,setData] = useState(null);
  useEffect(()=>{ (async()=>{ const r = await fetch('/api/admin/dashboard',{credentials:'include',cache:'no-store'}); if(r.ok) setData(await r.json()); })(); },[]);
  if(!data) return <Loader2 className="animate-spin text-[#9C6B30]"/>
  const { stats, recentOrders } = data
  const cards = [
    { label:'Total Revenue', value: formatINR(stats.totalRevenue||0), icon: TrendingUp, tint:'from-[#9C6B30] to-[#D4AF37]' },
    { label:'Total Orders', value: stats.totalOrders, icon: ShoppingCart, tint:'from-emerald-600 to-emerald-400' },
    { label:'Products', value: stats.totalProducts, icon: Package, tint:'from-blue-600 to-blue-400' },
    { label:'Customers', value: stats.totalUsers, icon: Users, tint:'from-purple-600 to-purple-400' },
  ]
  return (
    <div>
      <div className="font-display text-2xl xs:text-3xl sm:text-4xl text-[#1A1A1A]">Dashboard</div>
      <div className="gold-line w-12 mt-2 mb-6 sm:mb-8"/>
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">{cards.map((c,i)=>(
        <div key={i} className="bg-white rounded-xl p-3.5 xs:p-5 sm:p-6 border border-neutral-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className={`w-9 h-9 xs:w-11 xs:h-11 rounded-full bg-gradient-to-br ${c.tint} flex items-center justify-center text-white mb-3 xs:mb-4 shrink-0`}><c.icon size={18}/></div>
          <div className="text-[10px] tracking-widest uppercase text-neutral-500 font-medium">{c.label}</div>
          <div className="font-display text-xl xs:text-2xl sm:text-3xl text-[#1A1A1A] mt-1 break-words font-light">{c.value}</div>
        </div>
      ))}</div>
      <div className="mt-8 sm:mt-10 bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-2xs">
        <div className="p-3.5 xs:p-5 border-b border-neutral-200 flex justify-between items-center"><div className="font-display text-lg sm:text-xl">Recent Orders</div><Link href="/admin/orders" className="text-xs text-[#9C6B30] hover:text-[#b07d3b] flex items-center gap-1 font-semibold">View all <ArrowRight size={12}/></Link></div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm"><thead className="bg-neutral-50 text-[10px] tracking-widest uppercase text-neutral-500 border-b border-neutral-200"><tr><th className="text-left p-3 sm:p-4 min-w-[110px]">Order</th><th className="text-left p-3 sm:p-4">Items</th><th className="text-left p-3 sm:p-4">Status</th><th className="text-right p-3 sm:p-4 min-w-[100px]">Total</th></tr></thead>
            <tbody className="divide-y divide-neutral-100">{recentOrders.length===0 && <tr><td colSpan={4} className="p-8 text-center text-neutral-400">No orders yet</td></tr>}
              {recentOrders.map(o=>(<tr key={o.id} className="hover:bg-neutral-50/50 transition-colors"><td className="p-3 sm:p-4"><Link href={`/admin/orders`} className="font-medium text-[#9C6B30] hover:underline">{o.orderNumber}</Link><div className="text-[11px] text-neutral-500">{new Date(o.placedAt).toLocaleDateString('en-IN')}</div></td><td className="p-3 sm:p-4 text-neutral-700">{o.items.length}</td><td className="p-3 sm:p-4"><span className="px-2 py-0.5 bg-neutral-100 text-[10px] sm:text-xs rounded uppercase font-semibold text-neutral-700">{o.status}</span></td><td className="p-3 sm:p-4 text-right font-medium text-neutral-900">{formatINR(o.amounts.total)}</td></tr>))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
