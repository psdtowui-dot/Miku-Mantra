'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, authFetch } from '@/lib/use-auth';
import { Download, Printer, ArrowLeft, Loader2, FileText, ExternalLink, ShieldCheck } from 'lucide-react';

export default function OrderInvoicePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState(null);
  const [siteSettings, setSiteSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError('');

        const [orderRes, settingsRes] = await Promise.all([
          authFetch(`/api/orders/${id}`),
          fetch('/api/site-settings').catch(() => null)
        ]);

        if (settingsRes && settingsRes.ok) {
          const s = await settingsRes.json();
          if (isMounted) setSiteSettings(s);
        }

        if (orderRes.ok) {
          const d = await orderRes.json();
          if (isMounted) {
            setOrder(d.order);
            // Update document title dynamically
            if (d.order?.orderNumber) {
              document.title = `Tax Invoice #${d.order.orderNumber} | MikuMantra Fine Jewellery`;
            }
          }
        } else {
          if (isMounted) {
            setError(orderRes.status === 401 ? 'Please log in to view this invoice.' : 'Order not found.');
          }
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load invoice');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (id) loadData();
    return () => { isMounted = false; };
  }, [id]);

  const pdfUrl = `/api/orders/${id}/invoice`;

  const handlePrint = () => {
    const iframe = document.getElementById('invoice-pdf-frame');
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        return;
      } catch (e) {
        console.warn('Iframe print failed, falling back to window.open:', e);
      }
    }
    window.open(pdfUrl, '_blank');
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 size={32} className="animate-spin text-[#9C6B30] mb-4" />
        <p className="text-sm font-medium text-neutral-600 tracking-wider uppercase">Loading Tax Invoice...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
          <FileText size={28} />
        </div>
        <h1 className="text-xl font-semibold text-neutral-900 mb-2">Unable to Load Invoice</h1>
        <p className="text-sm text-neutral-500 mb-6 max-w-md">{error || 'The requested order invoice could not be located.'}</p>
        <Link
          href={`/orders/${id}`}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1A1A1A] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#9C6B30] transition"
        >
          <ArrowLeft size={14} /> Back to Order
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1F1F1F] flex flex-col text-neutral-900">
      {/* Top Action Bar */}
      <header className="bg-[#121212] text-white border-b border-white/10 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link
            href={`/orders/${order.id || id}`}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition flex items-center gap-1.5 text-xs font-medium shrink-0"
            title="Return to order details"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back to Order</span>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] tracking-[0.25em] uppercase text-[#D4AF37] font-semibold">Official Tax Invoice</span>
            </div>
            <h1 className="text-sm sm:text-base font-medium text-white truncate flex items-center gap-2">
              Order #{order.orderNumber}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition"
            title="Print invoice"
          >
            <Printer size={15} />
            <span className="hidden xs:inline">Print</span>
          </button>

          <a
            href={pdfUrl}
            download={`Invoice-${order.orderNumber}.pdf`}
            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 bg-[#9C6B30] hover:bg-[#855B29] text-white text-xs font-semibold tracking-wider uppercase rounded-lg transition shadow-sm"
            title="Download PDF file"
          >
            <Download size={15} />
            <span>Download PDF</span>
          </a>

          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition"
            title="Open raw PDF in new browser tab"
          >
            <ExternalLink size={16} />
          </a>
        </div>
      </header>

      {/* Main PDF Viewer Container */}
      <main className="flex-1 flex flex-col p-2 sm:p-4 md:p-6 max-w-6xl w-full mx-auto">
        <div className="flex-1 w-full bg-white rounded-xl shadow-2xl overflow-hidden border border-neutral-800 flex flex-col min-h-[82vh]">
          <iframe
            id="invoice-pdf-frame"
            src={`${pdfUrl}#toolbar=1&navpanes=0`}
            title={`Invoice #${order.orderNumber}`}
            className="w-full flex-1 border-0 rounded-xl"
            style={{ minHeight: '82vh' }}
          />
        </div>
      </main>
    </div>
  );
}
