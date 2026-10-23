import Link from 'next/link';
import { ArrowRight, Compass } from 'lucide-react';

export const metadata = {
  title: 'Page Not Found | MikuMantra Fine Jewellery',
  description: 'The heirloom or page you are looking for is unavailable or has been archived.',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center bg-white px-4 py-16 sm:py-24">
      <div className="max-w-xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FAF6EF] text-[#9C6B30] mb-6">
          <Compass size={28} strokeWidth={1.5} />
        </div>
        <div className="text-[11px] uppercase tracking-[0.35em] text-[#9C6B30] font-semibold mb-3">
          Error 404
        </div>
        <h1 className="font-serif-luxe text-3xl sm:text-5xl text-[#1A1A1A] font-light tracking-wide mb-4">
          Heirloom Not Found
        </h1>
        <div className="gold-line w-16 mx-auto my-4" />
        <p className="text-neutral-600 text-sm sm:text-base leading-relaxed font-light mb-8 max-w-md mx-auto">
          The fine jewellery piece, collection, or atelier page you are searching for is unavailable, moved, or privately archived.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/shop"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#1A1A1A] text-white px-8 py-3.5 rounded-sm text-xs uppercase tracking-[0.2em] font-medium hover:bg-[#9C6B30] transition-colors"
          >
            Explore Catalogue <ArrowRight size={14} />
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-sm text-xs uppercase tracking-[0.2em] font-medium border border-[#D1D5DB] text-[#1A1A1A] hover:border-[#9C6B30] hover:text-[#9C6B30] transition-colors"
          >
            Return to Atelier
          </Link>
        </div>
      </div>
    </main>
  );
}
