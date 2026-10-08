'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertCircle, Loader2, Mail, ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const [loading, setLoading] = useState(false);
  const [emailInput, setEmailInput] = useState(emailParam);
  const [status, setStatus] = useState('idle'); // idle | success | error
  const [message, setMessage] = useState('');

  const handleUnsubscribe = async (customEmail = null) => {
    setLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const payload = {
        token: tokenParam,
        email: customEmail || emailInput || emailParam
      };

      const res = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatus('success');
        setMessage(data.message || 'You have been successfully unsubscribed from the MikuMantra Circle.');
      } else {
        setStatus('error');
        setMessage(data.message || 'Unable to process unsubscription. Please check your email address.');
      }
    } catch (err) {
      setStatus('error');
      setMessage('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tokenParam || emailParam) {
      handleUnsubscribe();
    }
  }, [tokenParam, emailParam]);

  return (
    <div className="min-h-screen bg-[#FAF6EF] text-[#1A1A1A] flex flex-col justify-between p-4 sm:p-8">
      {/* Header Logo */}
      <header className="max-w-xl mx-auto w-full pt-8 text-center">
        <Link href="/" className="inline-block group">
          <div className="font-display text-2xl xs:text-3xl tracking-[0.2em] text-[#1A1A1A] font-light uppercase">
            MikuMantra
          </div>
          <div className="text-[9px] tracking-[0.35em] text-[#9C6B30] uppercase mt-1">
            House of Fine Jewellery · Atelier
          </div>
          <div className="gold-line w-12 mx-auto mt-2" />
        </Link>
      </header>

      {/* Main Unsubscribe Card */}
      <main className="max-w-md mx-auto w-full my-8">
        <div className="bg-white rounded-2xl p-6 sm:p-10 shadow-xl border border-[#EAE3D2] text-center space-y-6">
          {loading ? (
            <div className="py-8 space-y-4">
              <Loader2 size={36} className="animate-spin mx-auto text-[#9C6B30]" />
              <p className="text-sm text-neutral-600 font-light">Processing your unsubscription request...</p>
            </div>
          ) : status === 'success' ? (
            <div className="py-4 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-sm">
                <CheckCircle2 size={30} />
              </div>
              <h2 className="font-display text-xl sm:text-2xl text-[#1A1A1A]">Unsubscribed</h2>
              <p className="text-xs sm:text-sm text-neutral-600 font-light leading-relaxed">
                {message}
              </p>
              <div className="pt-4 border-t border-neutral-100">
                <p className="text-[11px] text-neutral-400 mb-4">
                  Changed your mind? You can resubscribe anytime on our homepage.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1A1A1A] text-white rounded-full text-xs uppercase tracking-widest font-medium hover:bg-[#9C6B30] transition shadow-md"
                >
                  <ArrowLeft size={14} /> Return to Storefront
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="w-12 h-12 rounded-full bg-[#FAF6EF] text-[#9C6B30] flex items-center justify-center mx-auto border border-[#EAE3D2]">
                <Mail size={22} />
              </div>

              <div>
                <h2 className="font-display text-xl sm:text-2xl text-[#1A1A1A]">Unsubscribe from MikuMantra</h2>
                <p className="text-xs text-neutral-500 font-light mt-1">
                  Enter your email address below to unsubscribe from our newsletter previews.
                </p>
              </div>

              {status === 'error' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2 text-left">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{message}</span>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUnsubscribe();
                }}
                className="space-y-3"
              >
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-[#9C6B30] text-center"
                />

                <button
                  type="submit"
                  disabled={loading || !emailInput.trim()}
                  className="w-full py-3 bg-[#1A1A1A] text-white rounded-xl text-xs font-semibold uppercase tracking-widest hover:bg-red-700 transition shadow-md disabled:opacity-50"
                >
                  Confirm Unsubscribe
                </button>
              </form>

              <div className="pt-2 text-[11px] text-neutral-400 flex items-center justify-center gap-1.5">
                <ShieldCheck size={13} className="text-[#9C6B30]" />
                <span>Zero Spam Policy · Instant Token Removal</span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center pb-6 text-xs text-neutral-400">
        © {new Date().getFullYear()} MikuMantra Fine Jewellery Atelier. All rights reserved.
      </footer>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAF6EF] flex items-center justify-center p-4">
        <Loader2 size={32} className="animate-spin text-[#9C6B30]" />
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}
