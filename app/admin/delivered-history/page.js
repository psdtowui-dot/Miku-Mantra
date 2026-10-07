'use client';
import { useEffect, useState } from 'react';
import { formatINR } from '@/lib/products';
import { Loader2, Search, Calendar, RefreshCw, Eye, X } from 'lucide-react';
import OrderDetailModal from '@/components/ui/order-detail-modal';

export default function DeliveredHistory() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchVal, setSearchVal] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeOrder, setActiveOrder] = useState(null);

  const updateStatus = async (id, status, courier = null) => {
    const payload = {};
    if (status) payload.status = status;
    if (courier) payload.courier = courier;
    const r = await fetch(`/api/admin/orders/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (r.ok) {
      const data = await r.json();
      if (activeOrder && activeOrder.id === id && data.order) {
        const email = activeOrder.customerEmail;
        setActiveOrder({ ...data.order, customerEmail: email });
      }
      load(search);
    }
  };

  const load = async (query = search) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/delivered-orders?search=${encodeURIComponent(query)}`, { credentials: 'include' });
      const d = await r.json();
      setList(d.orders || []);
    } catch (e) {
      console.error(e);
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

  const getDeliveredDate = (o) => {
    if (o.deliveredAt) return new Date(o.deliveredAt);
    const h = o.statusHistory?.find(x => x.status === 'delivered');
    if (h?.at) return new Date(h.at);
    return new Date(o.placedAt);
  };

  const filteredList = list.filter(o => {
    const delDate = getDeliveredDate(o);
    // Normalize dates to start/end of day
    let matchesStart = true;
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      matchesStart = delDate >= start;
    }

    let matchesEnd = true;
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchesEnd = delDate <= end;
    }

    return matchesStart && matchesEnd;
  });

  return (
    <div>
      <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-3">
        <div>
          <div className="font-display text-2xl xs:text-3xl sm:text-4xl text-[#1A1A1A]">Delivered History</div>
          <div className="gold-line w-12 mt-2" />
        </div>
        <button
          onClick={() => load(search)}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-neutral-200 rounded text-xs hover:border-[#9C6B30] hover:text-[#9C6B30] transition text-neutral-600 bg-white shadow-xs self-start xs:self-auto"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="mt-6 mb-6" />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-neutral-200 p-3.5 xs:p-4 mb-6 flex flex-col md:flex-row gap-3 xs:gap-4 items-stretch md:items-end shadow-xs">
        <div className="flex-1 w-full">
          <label className="text-[10px] tracking-widest uppercase text-neutral-500 flex items-center gap-1 mb-1">
            <Search size={12} />
            Search Orders
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search delivered orders..."
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              className="w-full px-3 pr-10 py-2 border border-neutral-200 rounded text-sm focus:outline-none focus:border-[#9C6B30]"
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
        </div>
        <div className="w-full md:w-48">
          <label className="text-[10px] tracking-widest uppercase text-neutral-500 flex items-center gap-1">
            <Calendar size={12} />
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-neutral-200 rounded text-sm focus:outline-none focus:border-[#9C6B30]"
          />
        </div>
        <div className="w-full md:w-48">
          <label className="text-[10px] tracking-widest uppercase text-neutral-500 flex items-center gap-1">
            <Calendar size={12} />
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-neutral-200 rounded text-sm focus:outline-none focus:border-[#9C6B30]"
          />
        </div>
        <button
          onClick={() => { setSearchVal(''); setStartDate(''); setEndDate(''); }}
          className="text-xs text-neutral-500 hover:text-[#9C6B30] pb-2 px-2 shrink-0 transition self-start md:self-auto"
        >
          Reset Filters
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="animate-spin inline text-[#9C6B30]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-[10px] tracking-widest uppercase text-neutral-500 border-b border-neutral-200">
                <tr>
                  <th className="text-left p-3 min-w-[120px]">Order Info</th>
                  <th className="text-left p-3 min-w-[150px]">Customer</th>
                  <th className="text-left p-3 min-w-[220px]">Items details</th>
                  <th className="text-left p-3 min-w-[180px]">Shipping Address</th>
                  <th className="text-left p-3 min-w-[100px]">Payment</th>
                  <th className="text-left p-3 min-w-[150px]">Delivered Date/Time</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-center p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-neutral-400">
                      No delivered orders found
                    </td>
                  </tr>
                ) : (
                  filteredList.map(o => {
                    const delDate = getDeliveredDate(o);
                    return (
                      <tr key={o.id} className="hover:bg-neutral-50/50 transition-colors">
                        {/* Order Info */}
                        <td className="p-3 align-top">
                          <div className="font-medium text-[#9C6B30]">{o.orderNumber}</div>
                          <div className="text-xs text-neutral-500 mt-1">
                            Ordered: {new Date(o.placedAt).toLocaleDateString('en-IN')}
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="p-3 align-top">
                          <div className="font-medium text-neutral-800">{o.address?.fullName}</div>
                          <div className="text-xs text-neutral-500 mt-1">{o.address?.phone}</div>
                          <div className="text-[10px] text-neutral-400 mt-0.5 truncate max-w-[180px]" title={o.customerEmail || o.guestEmail || 'Registered User'}>
                            {o.customerEmail || o.guestEmail || 'Registered User'}
                          </div>
                        </td>

                        {/* Items Details */}
                        <td className="p-3 align-top">
                          <div className="space-y-3">
                            {o.items?.map((it, idx) => (
                              <div key={idx} className="flex gap-3.5 items-start">
                                {it.image && (
                                  <img
                                    src={it.image}
                                    alt={it.name}
                                    className="w-10 h-10 object-cover rounded bg-neutral-100 border border-neutral-200 shrink-0"
                                  />
                                )}
                                <div className="min-w-0">
                                  <div className="text-xs font-medium text-neutral-800 truncate" title={it.name}>
                                    {it.name}
                                  </div>
                                  <div className="text-[10px] text-neutral-500 mt-0.5">
                                    Qty {it.qty} · {formatINR(it.price)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Shipping Address */}
                        <td className="p-3 align-top text-xs text-neutral-600 leading-relaxed">
                          <div>{o.address?.line1}</div>
                          {o.address?.line2 && <div className="text-neutral-500">{o.address.line2}</div>}
                          <div>
                            {o.address?.city}, {o.address?.state} - {o.address?.pincode}
                          </div>
                        </td>

                        {/* Payment */}
                        <td className="p-3 align-top">
                          <div className="text-xs uppercase font-medium text-neutral-700">{o.payment}</div>
                          <div className={`text-[10px] uppercase font-bold mt-1 inline-block px-1.5 py-0.5 rounded ${o.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {o.paymentStatus}
                          </div>
                          <div className="text-xs text-neutral-500 mt-1 font-semibold">{formatINR(o.amounts?.total || 0)}</div>
                        </td>

                        {/* Delivered Date/Time */}
                        <td className="p-3 align-top text-xs text-neutral-600">
                          {delDate.toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                          <div className="text-neutral-400 mt-0.5">
                            {delDate.toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="p-3 align-top">
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-[10px] rounded uppercase font-bold tracking-wider">
                            {o.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-3 align-top text-center">
                          <button 
                            onClick={() => setActiveOrder(o)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF6EF] border border-[#D4AF37]/30 text-[#9C6B30] text-xs font-semibold rounded hover:bg-[#9C6B30] hover:text-white transition-all shadow-sm"
                          >
                            <Eye size={12} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
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
