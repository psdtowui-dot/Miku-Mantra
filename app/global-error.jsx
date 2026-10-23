'use client';

import { useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('Fatal global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-white font-sans p-6 text-center text-[#1A1A1A]">
        <div className="max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-[#FAF6EF] text-[#9C6B30] flex items-center justify-center mx-auto mb-4 font-bold">
            !
          </div>
          <h2 className="text-xl font-serif text-[#1A1A1A] mb-2">Application Notice</h2>
          <p className="text-xs text-neutral-600 mb-6 leading-relaxed">
            A critical error occurred while rendering the page layout.
          </p>
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-6 py-2.5 rounded-sm text-xs uppercase tracking-widest hover:bg-[#9C6B30] transition-colors cursor-pointer"
          >
            <RotateCcw size={12} /> Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
