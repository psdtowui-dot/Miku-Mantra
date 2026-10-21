'use client';
import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function AdminError({ error, reset }) {
  useEffect(() => {
    console.error('Admin route error caught by boundary:', error);
  }, [error]);

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-4">
          <AlertTriangle size={28} />
        </div>
        <h2 className="text-lg font-semibold text-neutral-900 mb-2">Something went wrong</h2>
        <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
          An unexpected error occurred while loading this section of the admin dashboard.
          {error?.message ? ` (${error.message})` : ''}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#9C6B30] hover:bg-[#855B29] text-white text-xs font-medium rounded-lg transition"
          >
            <RefreshCw size={14} /> Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-medium rounded-lg transition"
          >
            Reload page
          </button>
        </div>
      </div>
    </div>
  );
}
