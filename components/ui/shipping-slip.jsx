'use client';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download, Phone, MapPin, Calendar, Package, AlertCircle, Truck, Layers, CheckCircle2 } from 'lucide-react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { formatINR } from '@/lib/products';

export default function ShippingSlip({ order, onClose }) {
  const [mounted, setMounted] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [activeTab, setActiveTab] = useState('both'); // 'both' | 'copy1' | 'copy2'
  const barcodeRef1 = useRef(null);
  const barcodeRef2 = useRef(null);
  const [error, setError] = useState(null);

  // Mount check and body class for print isolation
  useEffect(() => {
    setMounted(true);
    document.body.classList.add('shipping-slip-modal-open');
    return () => {
      setMounted(false);
      document.body.classList.remove('shipping-slip-modal-open');
    };
  }, []);

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
      const barcodeConfig = {
        format: 'CODE128',
        width: 2,
        height: 42,
        displayValue: true,
        fontSize: 10,
        font: 'monospace',
        textMargin: 3,
        margin: 0,
        lineColor: '#000000'
      };

      if (barcodeRef1.current && barcodeValue) {
        JsBarcode(barcodeRef1.current, barcodeValue, barcodeConfig);
      }
      if (barcodeRef2.current && barcodeValue) {
        JsBarcode(barcodeRef2.current, barcodeValue, barcodeConfig);
      }
    } catch (e) {
      console.error('Barcode generation error:', e);
      setError('Could not generate barcode');
    }
  }, [order, mounted]);

  // Clean, isolated print handler: prints ONLY the shipping slips via hidden iframe
  const handlePrint = () => {
    const slip1Elem = document.getElementById('shipping-slip-card-1');
    const slip2Elem = document.getElementById('shipping-slip-card-2');

    const shouldPrint1 = (activeTab === 'both' || activeTab === 'copy1') && slip1Elem;
    const shouldPrint2 = (activeTab === 'both' || activeTab === 'copy2') && slip2Elem;

    if (!shouldPrint1 && !shouldPrint2) return;

    // Collect all stylesheets from parent document
    let stylesHtml = '';
    try {
      Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).forEach(node => {
        stylesHtml += node.outerHTML;
      });
    } catch (e) {
      console.warn('Failed to clone stylesheets for print', e);
    }

    let slipsHtml = '';
    if (shouldPrint1) {
      slipsHtml += `
        <div class="print-page-box print-page-1">
          ${slip1Elem.outerHTML}
        </div>
      `;
    }
    if (shouldPrint1 && shouldPrint2) {
      slipsHtml += `<div class="print-page-break"></div>`;
    }
    if (shouldPrint2) {
      slipsHtml += `
        <div class="print-page-box print-page-2">
          ${slip2Elem.outerHTML}
        </div>
      `;
    }

    // Clean up any lingering iframe
    const oldIframe = document.getElementById('shipping-slip-print-frame');
    if (oldIframe) {
      oldIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'shipping-slip-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Shipping Slips - ${order.orderNumber}</title>
          ${stylesHtml}
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 12mm;
            }
            *, *::before, *::after {
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            }
            .print-page-box {
              display: block !important;
              width: 100% !important;
              max-width: 490px !important;
              margin: 0 auto !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .print-page-1 {
              margin-bottom: 0 !important;
            }
            .print-page-2 {
              margin-top: 0 !important;
            }
            .print-page-break {
              display: block !important;
              page-break-after: always !important;
              break-after: page !important;
              height: 0 !important;
              line-height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
            }
            /* Clean up any UI shadows and ensure dark borders */
            #shipping-slip-card-1, #shipping-slip-card-2 {
              box-shadow: none !important;
              width: 100% !important;
              max-width: 490px !important;
              margin: 0 auto !important;
              border: 2px solid #000000 !important;
            }
            svg {
              max-width: 100% !important;
              height: auto !important;
            }
            img {
              max-width: 100% !important;
              height: auto !important;
            }
          </style>
        </head>
        <body>
          ${slipsHtml}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.error('Iframe print failed, falling back to window print', err);
        window.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 3000);
      }
    }, 250);
  };

  // Intercept Ctrl+P / Cmd+P to invoke clean isolated print
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [activeTab, qrCodeUrl]);

  if (!order || !mounted) return null;

  const address = order.address || {};
  const amounts = order.amounts || {};
  const isCod = (order.payment || '').toLowerCase() === 'cod';

  const renderSingleSlipCard = (copyNum, copyTitle, barcodeRef) => (
    <div
      id={`shipping-slip-card-${copyNum}`}
      className="w-full max-w-[500px] bg-white text-black p-5 rounded-xl border-[2.5px] border-black font-sans text-xs space-y-3.5 shadow-sm"
    >
      
      {/* Header Banner: MikuMantra Branding + Payment Badge */}
      <div className="flex justify-between items-center border-b-[2px] border-black pb-2.5">
        <div>
          <div className="font-serif tracking-widest text-lg font-bold uppercase leading-none text-black">MikuMantra</div>
          <div className="text-[7px] tracking-[0.25em] text-neutral-600 uppercase font-semibold mt-1">House of Fine Jewellery</div>
        </div>
        <div>
          {isCod ? (
            <div className="bg-black text-white px-3.5 py-1.5 text-base font-black tracking-wider border-2 border-black rounded-xs select-none">
              COD
            </div>
          ) : (
            <div className="bg-white text-black px-3.5 py-1.5 text-base font-black tracking-wider border-3 border-black rounded-xs select-none">
              PREPAID
            </div>
          )}
        </div>
      </div>

      {/* Copy Identification Badge Bar */}
      <div className="bg-[#FAF5EB] border border-[#D4AF37]/50 px-3 py-1 rounded flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-wider uppercase text-[#7A501F] flex items-center gap-1.5">
          <Layers size={11} /> SLIP {copyNum} OF 2: {copyTitle}
        </span>
        <span className="text-[9px] text-neutral-500 font-mono">
          {copyNum === 1 ? 'Package Affixed' : 'Transporter Handover'}
        </span>
      </div>

      {/* Section 2: Destination Address (SHIP TO) */}
      <div className="border-b-[2px] border-black pb-3">
        <div className="text-[9px] tracking-wider font-bold uppercase text-neutral-500 mb-1 flex items-center gap-1">
          <MapPin size={10} className="stroke-[3]" /> SHIP TO:
        </div>
        
        {address.fullName ? (
          <div className="space-y-0.5">
            <div className="font-extrabold text-sm sm:text-base uppercase tracking-wide leading-tight text-black">
              {address.fullName}
            </div>
            <div className="text-[11px] text-neutral-800 font-medium leading-tight uppercase">
              {address.line1}
              {address.line2 && <span className="block">{address.line2}</span>}
              <div className="font-bold text-neutral-900 mt-0.5">
                {address.city}, {address.state}
              </div>
            </div>
            <div className="inline-block border-2 border-black px-2 py-0.5 mt-1 font-mono text-xs font-black tracking-wider bg-neutral-50">
              PIN: {address.pincode}
            </div>
          </div>
        ) : (
          <div className="text-xs italic text-neutral-500">No Shipping Address Provided</div>
        )}

        {address.phone && (
          <div className="mt-2 flex items-center gap-2 bg-neutral-100 p-1.5 border border-dashed border-black/30 rounded-xs">
            <Phone size={12} className="shrink-0 stroke-[3]" />
            <span className="font-mono text-xs font-black text-black">
              PHONE: {address.phone}
            </span>
          </div>
        )}
      </div>

      {/* Section 3: Order Metadata */}
      <div className="grid grid-cols-2 gap-2.5 border-b-[2px] border-black pb-2.5 text-[11px]">
        <div className="space-y-1">
          <div>
            <span className="text-[8px] text-neutral-500 uppercase font-bold block">Order Reference</span>
            <span className="font-mono font-bold text-neutral-900 text-xs">{order.orderNumber}</span>
          </div>
          <div>
            <span className="text-[8px] text-neutral-500 uppercase font-bold block">Order Date</span>
            <span className="font-medium text-neutral-800">
              {new Date(order.placedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
        <div className="space-y-1 border-l border-neutral-300 pl-2.5">
          <div>
            <span className="text-[8px] text-neutral-500 uppercase font-bold block">Payment Method</span>
            <span className="font-bold uppercase text-neutral-800">
              {order.payment === 'cod' ? 'Cash On Delivery' : (order.payment || 'PREPAID')}
            </span>
          </div>
          <div>
            <span className="text-[8px] text-neutral-500 uppercase font-bold block">Collectable Amount</span>
            <span className="font-extrabold text-xs sm:text-sm text-[#9C6B30]">
              {isCod ? formatINR(amounts.total) : '₹ 0.00 (PAID)'}
            </span>
          </div>
        </div>
      </div>

      {/* Section 3b: Logistics & Courier Tracking Partner */}
      <div className="grid grid-cols-2 gap-2.5 border-b-[2px] border-black pb-2.5 text-[11px] bg-neutral-50 p-2 rounded-xs">
        <div>
          <span className="text-[8px] text-neutral-500 uppercase font-bold block flex items-center gap-1">
            <Truck size={10} className="stroke-[2.5]" /> Courier Partner
          </span>
          <span className="font-bold text-neutral-900 text-xs mt-0.5 block truncate">
            {order.courier?.carrier || order.carrier || 'Pending Assignment'}
          </span>
        </div>
        <div className="border-l border-neutral-300 pl-2.5">
          <span className="text-[8px] text-neutral-500 uppercase font-bold block">AWB / Tracking Number</span>
          <span className="font-mono font-black text-neutral-900 text-xs tracking-wider mt-0.5 block truncate">
            {order.courier?.trackingNumber || order.trackingNumber || 'Pending Dispatch'}
          </span>
        </div>
      </div>

      {/* Section 4: Package Contents */}
      <div className="border-b-[2px] border-black pb-2.5">
        <div className="text-[9px] tracking-wider font-bold uppercase text-neutral-500 mb-1 flex items-center gap-1">
          <Package size={10} className="stroke-[3]" /> PACKAGE CONTENTS:
        </div>
        
        <div className="border border-neutral-300 rounded overflow-hidden">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="bg-neutral-100 border-b border-neutral-300 font-bold text-neutral-700 text-[10px]">
                <th className="p-1">Product Description</th>
                <th className="p-1 text-center w-10">Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {order.items?.slice(0, 4).map((it, idx) => (
                <tr key={idx} className="hover:bg-neutral-50">
                  <td className="p-1 font-medium text-neutral-800 truncate max-w-[200px]">
                    {it.name}
                  </td>
                  <td className="p-1 text-center font-mono font-bold text-neutral-900">
                    {it.qty}
                  </td>
                </tr>
              ))}
              {(!order.items || order.items.length === 0) && (
                <tr>
                  <td colSpan={2} className="p-1.5 text-center text-neutral-400 italic">
                    No items in package
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 4b: Handover signature box on Copy 2 */}
      {copyNum === 2 && (
        <div className="border border-neutral-400 border-dashed rounded p-2 bg-neutral-50 text-[10px] space-y-1">
          <div className="font-bold text-neutral-800 uppercase text-[9px]">Courier Handover & Receipt Signoff:</div>
          <p className="text-neutral-600 text-[9px] leading-tight">
            Consignment handed over in tamper-evident sealed packaging. Received in sound condition.
          </p>
          <div className="pt-1 flex items-center justify-between text-[9px] font-mono text-neutral-700">
            <span>Pickup Date: _______________</span>
            <span>Courier Signature: _______________</span>
          </div>
        </div>
      )}

      {/* Section 5: Barcode & QR Code Footer Area */}
      <div className="flex justify-between items-center pt-0.5 gap-3">
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60px]">
          {error ? (
            <div className="text-[10px] text-red-500 font-medium flex items-center gap-1">
              <AlertCircle size={12} /> {error}
            </div>
          ) : (
            <svg ref={barcodeRef} className="w-full max-h-[58px]"></svg>
          )}
        </div>

        <div className="shrink-0 flex items-center justify-center border-l border-neutral-300 pl-3">
          {qrCodeUrl ? (
            <div className="flex flex-col items-center">
              <img src={qrCodeUrl} alt="Scan QR" className="w-[68px] h-[68px] object-contain border border-neutral-200 p-0.5 rounded-xs" />
              <span className="text-[7px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5 font-mono">Scan Details</span>
            </div>
          ) : (
            <div className="w-[68px] h-[68px] bg-neutral-100 flex items-center justify-center rounded border border-neutral-200 text-[7px] text-neutral-400 text-center font-bold">
              Loading QR...
            </div>
          )}
        </div>
      </div>

      {/* Footer Guarantee */}
      <div className="text-center pt-1 border-t border-neutral-200 text-[8px] text-neutral-500 uppercase tracking-widest font-semibold">
        {copyNum === 1
          ? 'Package / Consignee Copy • Tamper Evident Transit Insured'
          : 'Courier / Shipper Manifest Copy • Keep with Transit Records'}
      </div>

    </div>
  );

  return createPortal(
    <div
      id="shipping-slip-modal-portal"
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-3 sm:p-5 overflow-y-auto print:p-0 print:bg-white print:backdrop-blur-none"
      onClick={(e) => {
        if (e.target.id === 'shipping-slip-modal-portal') {
          onClose();
        }
      }}
    >
      
      {/* Top action bar - Hidden during print */}
      <div className="w-full max-w-[540px] bg-[#0F0F10] text-white px-5 py-3.5 rounded-t-2xl flex justify-between items-center shadow-lg border-b border-white/10 no-print">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-sm font-semibold tracking-wider text-[#D4AF37]">COURIER SHIPPING SLIPS</h3>
            <span className="px-2 py-0.5 bg-[#9C6B30]/30 border border-[#D4AF37]/40 text-[#E5C378] text-[9px] font-bold uppercase rounded-full">
              2 Slips Generated
            </span>
          </div>
          <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
            Order: {order.orderNumber} • Consignee + Courier Copies
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37] hover:bg-[#bfa032] text-[#0F0F10] font-bold text-xs rounded transition-all shadow cursor-pointer"
            title={activeTab === 'both' ? 'Print both shipping slips (strictly 2 sheets)' : 'Print shipping slip'}
          >
            <Printer size={13} /> {activeTab === 'both' ? 'Print 2 Slips' : (activeTab === 'copy1' ? 'Print Slip 1' : 'Print Slip 2')}
          </button>
          
          <a
            href={`/api/orders/${order.id}/shippingslip`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded border border-neutral-700 transition-all shadow"
            title="Download 2-page PDF with both shipping slips"
          >
            <Download size={13} /> PDF
          </a>

          <button 
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors ml-1 cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Tabs Filter Bar (Screen Only) */}
      <div className="w-full max-w-[540px] bg-neutral-900 border-x border-white/10 px-4 py-2 flex items-center justify-between text-xs text-neutral-300 no-print">
        <span className="text-[11px] text-neutral-400">View Preview:</span>
        <div className="inline-flex rounded-lg bg-neutral-800 p-0.5 border border-neutral-700">
          <button
            type="button"
            onClick={() => setActiveTab('both')}
            className={`px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wider transition ${activeTab === 'both' ? 'bg-[#9C6B30] text-white shadow-xs' : 'text-neutral-400 hover:text-white'}`}
          >
            Both Copies (2)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('copy1')}
            className={`px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wider transition ${activeTab === 'copy1' ? 'bg-[#9C6B30] text-white shadow-xs' : 'text-neutral-400 hover:text-white'}`}
          >
            Slip 1: Package
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('copy2')}
            className={`px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wider transition ${activeTab === 'copy2' ? 'bg-[#9C6B30] text-white shadow-xs' : 'text-neutral-400 hover:text-white'}`}
          >
            Slip 2: Courier
          </button>
        </div>
      </div>

      {/* Printable Area Wrapper */}
      <div className="w-full max-w-[540px] bg-neutral-100 p-4 rounded-b-2xl shadow-xl overflow-y-auto max-h-[75vh] space-y-4 print:max-h-none print:shadow-none print:p-0 print:w-full print:bg-white shipping-slip-printable">
        
        {/* CSS injection for print isolation & strictly generating 2 sheets */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body.shipping-slip-modal-open > *:not(#shipping-slip-modal-portal) {
              display: none !important;
            }
            #shipping-slip-modal-portal {
              display: block !important;
              position: static !important;
              width: 100% !important;
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .no-print {
              display: none !important;
            }
            .shipping-slip-printable {
              display: block !important;
              position: static !important;
              width: 100% !important;
              max-height: none !important;
              overflow: visible !important;
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
            }
            .slip-portal-wrapper-1 {
              display: block !important;
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              max-width: 490px !important;
              margin: 0 auto !important;
            }
            .slip-portal-wrapper-2 {
              display: block !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              max-width: 490px !important;
              margin: 0 auto !important;
            }
          }
          @page {
            size: A4 portrait;
            margin: 8mm 12mm;
          }
        `}} />

        {/* Slip 1: Consignee / Package Copy */}
        <div
          id="slip-wrapper-1"
          className={`slip-portal-wrapper-1 flex justify-center ${activeTab === 'copy2' ? 'hidden print:hidden' : 'block'}`}
        >
          {renderSingleSlipCard(1, 'Consignee / Package Copy (Original)', barcodeRef1)}
        </div>

        {/* Visual Divider between slips on screen */}
        {activeTab === 'both' && (
          <div className="flex items-center gap-3 py-1 no-print">
            <div className="flex-1 border-t-2 border-dashed border-neutral-300" />
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest bg-neutral-200 px-3 py-0.5 rounded-full">
              Slip 2 (Courier Manifest Copy)
            </span>
            <div className="flex-1 border-t-2 border-dashed border-neutral-300" />
          </div>
        )}

        {/* Slip 2: Courier / Transporter Copy */}
        <div
          id="slip-wrapper-2"
          className={`slip-portal-wrapper-2 flex justify-center ${activeTab === 'copy1' ? 'hidden print:hidden' : 'block'}`}
        >
          {renderSingleSlipCard(2, 'Courier / Transporter Copy (Duplicate)', barcodeRef2)}
        </div>

      </div>

    </div>,
    document.body
  );
}
