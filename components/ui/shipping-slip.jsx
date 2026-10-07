'use client';
import React, { useEffect, useRef, useState } from 'react';
import { X, Printer, Download, Phone, MapPin, Calendar, Package, AlertCircle, Truck } from 'lucide-react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { formatINR } from '@/lib/products';

export default function ShippingSlip({ order, onClose }) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const barcodeRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!order) return;

    // Generate QR Code
    try {
      const qrData = JSON.stringify({
        orderNumber: order.orderNumber,
        customerName: order.address?.fullName,
        phone: order.address?.phone,
        pincode: order.address?.pincode,
        total: order.amounts?.total,
        payment: order.payment,
        status: order.status,
        carrier: order.courier?.carrier || order.carrier || '',
        trackingNumber: order.courier?.trackingNumber || order.trackingNumber || '',
        trackingUrl: order.courier?.trackingUrl || order.trackingUrl || ''
      });

      QRCode.toDataURL(
        qrData,
        {
          width: 120,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        },
        (err, url) => {
          if (err) {
            console.error('QR Code generation error:', err);
          } else {
            setQrCodeUrl(url);
          }
        }
      );
    } catch (e) {
      console.error('Failed to prepare QR code data', e);
    }

    // Generate Barcode using Tracking Number (or Order Number if no AWB yet)
    try {
      const barcodeValue = (order.courier?.trackingNumber || order.trackingNumber || order.orderNumber || '').trim();
      if (barcodeRef.current && barcodeValue) {
        JsBarcode(barcodeRef.current, barcodeValue, {
          format: 'CODE128',
          width: 2,
          height: 45,
          displayValue: true,
          fontSize: 10,
          font: 'monospace',
          textMargin: 4,
          margin: 0,
          lineColor: '#000000'
        });
      }
    } catch (e) {
      console.error('Barcode generation error:', e);
      setError('Could not generate barcode');
    }
  }, [order]);

  if (!order) return null;

  const address = order.address || {};
  const amounts = order.amounts || {};
  const isCod = (order.payment || '').toLowerCase() === 'cod';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:backdrop-blur-none">
      
      {/* Top action bar - Hidden during print */}
      <div className="w-full max-w-[500px] bg-[#0F0F10] text-white px-6 py-4 rounded-t-2xl flex justify-between items-center shadow-lg border-b border-white/10 no-print">
        <div>
          <h3 className="font-display text-sm font-semibold tracking-wider text-[#D4AF37]">COURIER SHIPPING LABEL</h3>
          <p className="text-[10px] text-neutral-400 font-mono mt-0.5">Order: {order.orderNumber}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37] hover:bg-[#bfa032] text-[#0F0F10] font-bold text-xs rounded transition-all shadow"
            title="Print Shipping Label"
          >
            <Printer size={14} /> Print
          </button>
          
          <a
            href={`/api/orders/${order.id}/shippingslip`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded border border-neutral-700 transition-all shadow"
            title="Download PDF"
          >
            <Download size={14} /> PDF
          </a>

          <button 
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors ml-2"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Printable Area Wrapper */}
      <div className="w-full max-w-[500px] bg-white text-black p-6 rounded-b-2xl shadow-xl overflow-hidden print:shadow-none print:p-0 print:w-[100mm] print:max-w-none print:rounded-none shipping-slip-printable">
        
        {/* CSS injection for clean printing */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            /* Hide absolute everything */
            body * {
              visibility: hidden !important;
            }
            /* Show only shipping slip printable content */
            .shipping-slip-printable, .shipping-slip-printable * {
              visibility: visible !important;
            }
            .shipping-slip-printable {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100vw !important;
              height: 100vh !important;
              margin: 0 !important;
              padding: 20px !important;
              box-sizing: border-box !important;
              z-index: 9999999 !important;
              background: white !important;
            }
            .no-print {
              display: none !important;
            }
          }
          @page {
            size: auto;
            margin: 0mm;
          }
        `}} />

        {/* Outer Heavy Border - Standard Shipping Label Look */}
        <div className="border-[3px] border-black p-4 font-sans text-sm space-y-4">
          
          {/* Section 1: Header / Branding + COD/PREPAID Badge */}
          <div className="flex justify-between items-center border-b-[2px] border-black pb-3">
            <div>
              <div className="font-serif tracking-widest text-xl font-bold uppercase leading-none">MikuMantra</div>
              <div className="text-[7px] tracking-[0.25em] text-neutral-600 uppercase font-semibold mt-1">House of Fine Jewellery</div>
            </div>
            <div>
              {isCod ? (
                <div className="bg-black text-white px-4 py-2 text-lg font-black tracking-wider border-2 border-black rounded-sm shadow-sm select-none">
                  COD
                </div>
              ) : (
                <div className="bg-white text-black px-4 py-2 text-lg font-black tracking-wider border-4 border-black rounded-sm shadow-sm select-none">
                  PREPAID
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Shipping Destination Address (To) */}
          <div className="border-b-[2px] border-black pb-4">
            <div className="text-[10px] tracking-wider font-bold uppercase text-neutral-500 mb-1.5 flex items-center gap-1">
              <MapPin size={10} className="stroke-[3]" /> SHIP TO:
            </div>
            
            {address.fullName ? (
              <div className="space-y-1">
                <div className="font-extrabold text-base uppercase tracking-wide leading-tight">
                  {address.fullName}
                </div>
                <div className="text-xs text-neutral-800 font-medium leading-relaxed uppercase">
                  {address.line1}
                  {address.line2 && <span className="block">{address.line2}</span>}
                  <div className="font-bold text-neutral-900 mt-0.5">
                    {address.city}, {address.state}
                  </div>
                </div>
                <div className="inline-block border-2 border-black px-2 py-0.5 mt-2 font-mono text-base font-black tracking-wider bg-neutral-50">
                  PIN: {address.pincode}
                </div>
              </div>
            ) : (
              <div className="text-xs italic text-neutral-500">No Shipping Address Provided</div>
            )}

            {address.phone && (
              <div className="mt-3 flex items-center gap-2 bg-neutral-100 p-2 border border-dashed border-black/30 rounded-sm">
                <Phone size={13} className="shrink-0 stroke-[3]" />
                <span className="font-mono text-sm font-black text-black">
                  PHONE: {address.phone}
                </span>
              </div>
            )}
          </div>

          {/* Section 3: Order Metadata */}
          <div className="grid grid-cols-2 gap-3 border-b-[2px] border-black pb-3 text-xs">
            <div className="space-y-1">
              <div>
                <span className="text-[9px] text-neutral-500 uppercase font-bold block">Order Reference</span>
                <span className="font-mono font-bold text-neutral-900">{order.orderNumber}</span>
              </div>
              <div>
                <span className="text-[9px] text-neutral-500 uppercase font-bold block">Order Date</span>
                <span className="font-medium text-neutral-800">
                  {new Date(order.placedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
            <div className="space-y-1 border-l border-neutral-300 pl-3">
              <div>
                <span className="text-[9px] text-neutral-500 uppercase font-bold block">Payment Method</span>
                <span className="font-bold uppercase text-neutral-800">
                  {order.payment === 'cod' ? 'Cash On Delivery' : (order.payment || 'PREPAID')}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-neutral-500 uppercase font-bold block">Collectable Amount</span>
                <span className="font-extrabold text-sm text-[#9C6B30]">
                  {isCod ? formatINR(amounts.total) : '₹ 0.00 (PAID)'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3b: Logistics & Courier Tracking Partner */}
          <div className="grid grid-cols-2 gap-3 border-b-[2px] border-black pb-3 text-xs bg-neutral-50 p-2.5 rounded-sm">
            <div>
              <span className="text-[9px] text-neutral-500 uppercase font-bold block flex items-center gap-1">
                <Truck size={10} className="stroke-[2.5]" /> Courier Partner
              </span>
              <span className="font-bold text-neutral-900 text-xs mt-0.5 block truncate">
                {order.courier?.carrier || order.carrier || 'Pending Assignment'}
              </span>
            </div>
            <div className="border-l border-neutral-300 pl-3">
              <span className="text-[9px] text-neutral-500 uppercase font-bold block">AWB / Tracking Number</span>
              <span className="font-mono font-black text-neutral-900 text-xs tracking-wider mt-0.5 block truncate">
                {order.courier?.trackingNumber || order.trackingNumber || 'Pending Dispatch'}
              </span>
            </div>
          </div>

          {/* Section 4: Compact Package Items Summary */}
          <div className="border-b-[2px] border-black pb-3">
            <div className="text-[10px] tracking-wider font-bold uppercase text-neutral-500 mb-1.5 flex items-center gap-1">
              <Package size={10} className="stroke-[3]" /> PACKAGE CONTENTS:
            </div>
            
            <div className="border border-neutral-300 rounded overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-neutral-100 border-b border-neutral-300 font-bold text-neutral-700">
                    <th className="p-1.5">Product Description</th>
                    <th className="p-1.5 text-center w-12">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {order.items?.map((it, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50">
                      <td className="p-1.5 font-medium text-neutral-800 line-clamp-1 truncate max-w-[240px]">
                        {it.name}
                      </td>
                      <td className="p-1.5 text-center font-mono font-bold text-neutral-900">
                        {it.qty}
                      </td>
                    </tr>
                  ))}
                  {(!order.items || order.items.length === 0) && (
                    <tr>
                      <td colSpan={2} className="p-2 text-center text-neutral-400 italic">
                        No items in package
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 5: Barcode & QR Code Footer Area */}
          <div className="flex justify-between items-center pt-1 gap-4">
            
            {/* Barcode on the Left */}
            <div className="flex-1 flex flex-col items-center justify-center min-h-[70px]">
              {error ? (
                <div className="text-[10px] text-red-500 font-medium flex items-center gap-1">
                  <AlertCircle size={12} /> {error}
                </div>
              ) : (
                <svg ref={barcodeRef} className="w-full max-h-[65px]"></svg>
              )}
            </div>

            {/* QR Code on the Right */}
            <div className="shrink-0 flex items-center justify-center border-l border-neutral-300 pl-4">
              {qrCodeUrl ? (
                <div className="flex flex-col items-center">
                  <img src={qrCodeUrl} alt="Scan QR" className="w-[75px] h-[75px] object-contain border border-neutral-200 p-0.5 rounded-sm" />
                  <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider mt-1 font-mono">Scan Details</span>
                </div>
              ) : (
                <div className="w-[75px] h-[75px] bg-neutral-100 flex items-center justify-center rounded border border-neutral-200 text-[8px] text-neutral-400 text-center font-bold">
                  Loading QR...
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
