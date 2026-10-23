'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RotateCcw, Home, AlertCircle } from 'lucide-react';

export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <main className="min-h-[70vh] flex items-center justify-center bg-white px-4 py-16 sm:py-24">
      <div className="max-w-md mx-auto text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#FAF6EF] text-[#9C6B30] mb-5">
          <AlertCircle size={26} strokeWidth={1.5} />
        </div>
        <div className="text-[11px] uppercase tracking-[0.35em] text-[#9C6B30] font-semibold mb-2">
          Atelier Notice
        </div>
        <h1 className="font-serif-luxe text-2xl sm:text-4xl text-[#1A1A1A] font-light tracking-wide mb-3">
          Something Went Unexpectedly
        </h1>
        <div className="gold-line w-12 mx-auto my-3" />
        <p className="text-neutral-600 text-xs sm:text-sm leading-relaxed font-light mb-8 max-w-sm mx-auto">
          We encountered a temporary interruption while preparing this page. Your cart and preferences remain safe.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#1A1A1A] text-white px-6 py-3 rounded-sm text-xs uppercase tracking-[0.2em] font-medium hover:bg-[#9C6B30] transition-colors cursor-pointer"
          >
            <RotateCcw size={13} /> Try Again
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-sm text-xs uppercase tracking-[0.2em] font-medium border border-[#D1D5DB] text-[#1A1A1A] hover:border-[#9C6B30] hover:text-[#9C6B30] transition-colors"
          >
            <Home size={13} /> Return Home
          </Link>
        </div>
      </div>
    </main>
  );
}
