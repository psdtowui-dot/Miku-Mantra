'use client';
import { useEffect, useState } from 'react';
import { formatINR } from '@/lib/products';
import { Loader2, Eye, Search, X, Truck, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { POPULAR_COURIERS, getTrackingUrl } from '@/lib/courier';
import OrderDetailModal from '@/components/ui/order-detail-modal';

export default function AdminOrders(){
  const [list,setList] = useState([]);
  const [loading,setLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState(null);
  const [searchVal, setSearchVal] = useState('');
  const [search, setSearch] = useState('');
  const [shipPromptOrder, setShipPromptOrder] = useState(null);

  // Ship Prompt Modal form fields
  const [carrierInput, setCarrierInput] = useState('Blue Dart');
  const [customCarrierInput, setCustomCarrierInput] = useState('');
  const [trackingNumberInput, setTrackingNumberInput] = useState('');
  const [trackingUrlInput, setTrackingUrlInput] = useState('');
  const [courierNotesInput, setCourierNotesInput] = useState('');
  const [submittingShip, setSubmittingShip] = useState(false);

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

  const updateStatus = async(id, status, courier = null)=>{ 
    const payload = { status };
    if (courier) payload.courier = courier;
    const r = await fetch(`/api/admin/orders/${id}`,{ 
      method:'PUT', 
      credentials:'include', 
      headers:{'Content-Type':'application/json'}, 
      body:JSON.stringify(payload)
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
      return data;
    } else {
      const err = await r.json().catch(() => ({}));
      toast.error(err.error || 'Update failed');
    }
  };

  const openShipModal = (order) => {
    setShipPromptOrder(order);
    const existingCarrier = order.courier?.carrier || order.carrier || 'Blue Dart';
    const isKnown = POPULAR_COURIERS.some(c => c.name.toLowerCase() === existingCarrier.toLowerCase() || c.id === existingCarrier.toLowerCase());
    if (isKnown) {
      setCarrierInput(existingCarrier);
      setCustomCarrierInput('');
    } else {
      setCarrierInput('other');
      setCustomCarrierInput(existingCarrier);
    }
    const awb = order.courier?.trackingNumber || order.trackingNumber || '';
    setTrackingNumberInput(awb);
    setTrackingUrlInput(order.courier?.trackingUrl || order.trackingUrl || (awb ? getTrackingUrl(existingCarrier, awb) : ''));
    setCourierNotesInput(order.courier?.notes || '');
  };

  const handleConfirmShipment = async (withTracking = true) => {
    if (!shipPromptOrder) return;
    setSubmittingShip(true);
    try {
      let courierData = null;
      if (withTracking) {
        const carrierName = carrierInput === 'other' ? customCarrierInput.trim() : carrierInput;
        const computedUrl = trackingUrlInput.trim() || getTrackingUrl(carrierName, trackingNumberInput.trim());
        courierData = {
          carrier: carrierName || 'Courier Partner',
          trackingNumber: trackingNumberInput.trim(),
          trackingUrl: computedUrl,
          notes: courierNotesInput.trim()
        };
      }
      await updateStatus(shipPromptOrder.id, 'shipped', courierData);
      setShipPromptOrder(null);
    } finally {
      setSubmittingShip(false);
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition cursor-pointer"
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
                  <th className="text-left p-3 min-w-[130px]">Status</th>
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
                        <div>
                          <select 
                            value={o.status} 
                            onChange={e => {
                              if (e.target.value === 'shipped' && o.status !== 'shipped') {
                                openShipModal(o);
                              } else {
                                updateStatus(o.id, e.target.value);
                              }
                            }} 
                            className="border border-neutral-200 rounded px-2 py-1 text-xs uppercase cursor-pointer bg-white focus:outline-none focus:border-[#9C6B30]"
                          >
                            <option value="confirmed">Confirmed</option>
                            <option value="packed">Packed</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>

                          {/* Courier tracking option ONLY shown when order was shipped */}
                          {o.status === 'shipped' && (
                            (o.courier?.trackingNumber || o.trackingNumber) ? (
                              <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-neutral-600 font-mono">
                                <span className="text-[#9C6B30] font-sans font-semibold uppercase">
                                  {o.courier?.carrier || o.carrier || 'Courier'}:
                                </span>
                                <span className="bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200 font-medium">
                                  {o.courier?.trackingNumber || o.trackingNumber}
                                </span>
                                {(o.courier?.trackingUrl || o.trackingUrl) && (
                                  <a 
                                    href={o.courier?.trackingUrl || o.trackingUrl} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-[#9C6B30] hover:text-[#855B29] inline-flex items-center" 
                                    title="Track Live ↗"
                                  >
                                    <ExternalLink size={11} />
                                  </a>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => openShipModal(o)}
                                className="mt-1 text-[10px] text-[#9C6B30] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                              >
                                <Truck size={11} /> + Add Tracking
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <button 
                        onClick={() => setActiveOrder(o)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF6EF] border border-[#D4AF37]/30 text-[#9C6B30] text-xs font-semibold rounded hover:bg-[#9C6B30] hover:text-white transition-all shadow-xs cursor-pointer"
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

      {/* Shipment Prompt Modal from Table */}
      {shipPromptOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3" onClick={() => setShipPromptOrder(null)}>
          <div 
            className="bg-white rounded-xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-neutral-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Truck size={18} className="text-[#9C6B30]" />
                <h3 className="font-display text-base font-semibold text-neutral-800">
                  {shipPromptOrder.status === 'shipped' ? 'Update Courier Tracking' : 'Mark Order as Shipped'}
                </h3>
              </div>
              <button onClick={() => setShipPromptOrder(null)} className="text-neutral-400 hover:text-neutral-700 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-neutral-600">
              Order <span className="font-mono font-bold text-neutral-800">#{shipPromptOrder.orderNumber}</span> ({shipPromptOrder.address?.fullName})
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                  Courier Partner *
                </label>
                <select
                  value={carrierInput}
                  onChange={(e) => {
                    setCarrierInput(e.target.value);
                    const effective = e.target.value === 'other' ? customCarrierInput : e.target.value;
                    if (trackingNumberInput) setTrackingUrlInput(getTrackingUrl(effective, trackingNumberInput));
                  }}
                  className="w-full text-xs border border-neutral-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:border-[#9C6B30]"
                >
                  {POPULAR_COURIERS.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
                {carrierInput === 'Other Courier' && (
                  <input
                    type="text"
                    placeholder="Enter courier name"
                    value={customCarrierInput}
                    onChange={(e) => {
                      setCustomCarrierInput(e.target.value);
                      if (trackingNumberInput) setTrackingUrlInput(getTrackingUrl(e.target.value, trackingNumberInput));
                    }}
                    className="mt-2 w-full text-xs border border-neutral-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#9C6B30]"
                  />
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                  AWB / Tracking Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1490211029348"
                  value={trackingNumberInput}
                  onChange={(e) => {
                    setTrackingNumberInput(e.target.value);
                    const effective = carrierInput === 'other' ? customCarrierInput : carrierInput;
                    setTrackingUrlInput(getTrackingUrl(effective, e.target.value));
                  }}
                  className="w-full text-xs font-mono border border-neutral-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                  Tracking Portal URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={trackingUrlInput}
                  onChange={(e) => setTrackingUrlInput(e.target.value)}
                  className="w-full text-xs font-mono border border-neutral-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                  Dispatch Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tamper-evident jewellery bag sealed"
                  value={courierNotesInput}
                  onChange={(e) => setCourierNotesInput(e.target.value)}
                  className="w-full text-xs border border-neutral-300 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:border-[#9C6B30]"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => handleConfirmShipment(false)}
                className="text-xs text-neutral-500 hover:text-neutral-800 underline order-2 sm:order-1 cursor-pointer"
              >
                Ship without tracking info
              </button>

              <div className="flex items-center gap-2 order-1 sm:order-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShipPromptOrder(null)}
                  className="px-3 py-2 text-xs border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingShip}
                  onClick={() => handleConfirmShipment(true)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#9C6B30] hover:bg-[#855B29] rounded-md transition shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {submittingShip ? 'Saving...' : 'Confirm & Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
