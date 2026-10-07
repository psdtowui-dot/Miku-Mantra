'use client';
import { useEffect, useState } from 'react';
import { formatINR } from '@/lib/products';
import { Loader2, Eye, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import OrderDetailModal from '@/components/ui/order-detail-modal';

export default function AdminOrders(){
  const [list,setList] = useState([]);
  const [loading,setLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState(null);
  const [searchVal, setSearchVal] = useState('');
  const [search, setSearch] = useState('');

  const load = async(query = search)=>{ 
    setLoading(true); 
    try {
      const r = await fetch(`/api/admin/orders?search=${encodeURIComponent(query)}`,{credentials:'include',cache:'no-store'}); 
      const d = await r.json(); 
      const orders = d.orders||[];
      setList(orders); 
      
      // Refresh active order if it is open to reflect any changes
      if (activeOrder) {
        const current = orders.find(o => o.id === activeOrder.id);
        if (current) setActiveOrder(current);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false); 
    }
  };

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchVal);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchVal]);

  // Load when search changes
  useEffect(() => {
    load(search);
  }, [search]);

  const updateStatus = async(id,status)=>{ 
    const r = await fetch(`/api/admin/orders/${id}`,{ 
      method:'PUT', 
      credentials:'include', 
      headers:{'Content-Type':'application/json'}, 
      body:JSON.stringify({status})
    }); 
    if(r.ok){ 
      const data = await r.json();
      toast.success('Updated'); 
      
      // If we are currently viewing this order in the modal, update its details
      if (activeOrder && activeOrder.id === id && data.order) {
        const email = activeOrder.customerEmail;
        setActiveOrder({ ...data.order, customerEmail: email });
      }
      
      load(search); 
    } 
  };

  return (
    <div>
      <div className="font-display text-2xl xs:text-3xl sm:text-4xl text-[#1A1A1A]">Orders</div>
      <div className="gold-line w-12 mt-2 mb-6 sm:mb-8"/>
      
      {/* Search Bar */}
      <div className="mb-6 relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input 
          value={searchVal} 
          onChange={e => setSearchVal(e.target.value)} 
          placeholder="Search orders..." 
          className="w-full pl-9 pr-10 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#9C6B30] transition-all"
        />
        {searchVal && (
          <button 
            onClick={() => setSearchVal('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition"
            title="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
        {loading ? <div className="p-12 text-center"><Loader2 className="animate-spin inline text-[#9C6B30]"/></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-neutral-50 text-[10px] tracking-widest uppercase text-neutral-500 border-b border-neutral-200">
                <tr>
                  <th className="text-left p-3 min-w-[110px]">Order</th>
                  <th className="text-left p-3 min-w-[140px]">Customer</th>
                  <th className="text-left p-3">Items</th>
                  <th className="text-right p-3 min-w-[90px]">Total</th>
                  <th className="text-left p-3 min-w-[80px]">Payment</th>
                  <th className="text-left p-3 min-w-[120px]">Status</th>
                  <th className="text-center p-3 min-w-[110px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {list.length===0 && <tr><td colSpan={7} className="p-8 text-center text-neutral-400">No orders found</td></tr>}
                {list.map(o=>(
                  <tr key={o.id} className="hover:bg-neutral-50/50 transition">
                    <td className="p-3">
                      <div className="font-medium text-[#9C6B30]">{o.orderNumber}</div>
                      <div className="text-[11px] text-neutral-500">{new Date(o.placedAt).toLocaleDateString('en-IN')}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-neutral-800">{o.address?.fullName}</div>
                      <div className="text-[11px] text-neutral-500">{o.address?.phone}</div>
                      <div className="text-[10px] text-neutral-400 truncate max-w-[140px] xs:max-w-[180px]" title={o.customerEmail}>
                        {o.customerEmail}
                      </div>
                    </td>
                    <td className="p-3 text-neutral-700">{o.items?.length || 0}</td>
                    <td className="p-3 text-right font-medium text-neutral-900">{formatINR(o.amounts?.total || 0)}</td>
                    <td className="p-3 uppercase text-[11px] font-medium text-neutral-600">{o.payment}</td>
                    <td className="p-3">
                      {o.status === 'cancelled' ? (
                        <span className="inline-block px-2.5 py-1 text-xs uppercase font-bold text-red-700 bg-red-50 border border-red-200 rounded select-none" title="Status cannot be changed after cancellation">
                          Cancelled
                        </span>
                      ) : (
                        <select 
                          value={o.status} 
                          onChange={e=>updateStatus(o.id,e.target.value)} 
                          className="border border-neutral-200 rounded px-2 py-1 text-xs uppercase cursor-pointer bg-white focus:outline-none focus:border-[#9C6B30]"
                        >
                          <option value="confirmed">Confirmed</option>
                          <option value="packed">Packed</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <button 
                        onClick={() => setActiveOrder(o)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF6EF] border border-[#D4AF37]/30 text-[#9C6B30] text-xs font-semibold rounded hover:bg-[#9C6B30] hover:text-white transition-all shadow-xs"
                      >
                        <Eye size={12} /> View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activeOrder && (
        <OrderDetailModal 
          order={activeOrder} 
          onClose={() => setActiveOrder(null)} 
          onUpdateStatus={updateStatus}
        />
      )}
    </div>
  );
}
