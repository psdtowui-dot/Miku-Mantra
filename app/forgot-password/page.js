'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/use-auth';
import { toast } from 'sonner';
import { Loader2, Mail, KeyRound, Eye, EyeOff, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';

function ForgotPasswordInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const isAdminParam = sp.get('admin') === 'true';

  const { forgotPassword, resetPassword } = useAuth();

  const [isAdmin, setIsAdmin] = useState(isAdminParam);
  const [step, setStep] = useState('request'); // 'request' | 'verify'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [devCode, setDevCode] = useState('');
  const [errors, setErrors] = useState({ email: '', code: '', newPassword: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false);
  const [showNewEye, setShowNewEye] = useState(false);
  const [showConfEye, setShowConfEye] = useState(false);
  const [siteLogo, setSiteLogo] = useState('/logo.png');

  useEffect(() => {
    fetch('/api/site-settings')
      .then(r => r.json())
      .then(d => {
        if (d?.logo) setSiteLogo(d.logo);
      })
      .catch(() => {});
  }, []);

  const handleRequest = async (e) => {
    e.preventDefault();
    const cleanEmail = (email || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail) {
      setErrors(prev => ({ ...prev, email: 'Please enter your email address' }));
      return;
    }
    if (!emailRegex.test(cleanEmail)) {
      setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
      return;
    }
    setErrors(prev => ({ ...prev, email: '' }));
    setBusy(true);
    try {
      const res = await forgotPassword(cleanEmail, { requireAdmin: isAdmin });
      toast.success(res.message || 'Verification code generated!');
      if (res.code) {
        setDevCode(res.code);
        setCode(res.code);
      }
      setStep('verify');
    } catch (err) {
      setErrors(prev => ({ ...prev, email: err.message || 'Failed to request reset code' }));
      toast.error(err.message || 'Failed to request reset code');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    const errs = { email: '', code: '', newPassword: '', confirmPassword: '' };
    let valid = true;

    if (!code || code.trim().length < 6) {
      errs.code = 'Please enter the 6-digit verification code';
      valid = false;
    }
    if (!newPassword) {
      errs.newPassword = 'Must enter a new password';
      valid = false;
    } else if (newPassword.length < 8) {
      errs.newPassword = 'Password must be at least 8 characters';
      valid = false;
    } else if (!/[a-zA-Z]/.test(newPassword) || !/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword)) {
      errs.newPassword = 'Password must contain at least one letter and one number or symbol';
      valid = false;
    }
    if (!confirmPassword) {
      errs.confirmPassword = 'Must confirm your new password';
      valid = false;
    } else if (newPassword !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
      valid = false;
    }

    setErrors(errs);
    if (!valid) return;

    setBusy(true);
    try {
      const res = await resetPassword(email.trim().toLowerCase(), code.trim(), newPassword, confirmPassword);
      toast.success(res.message || 'Password reset successfully! Please sign in.');
      if (isAdmin) {
        router.push('/admin/login');
      } else {
        router.push('/login');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to reset password');
      if (err.message && err.message.toLowerCase().includes('code')) {
        setErrors(prev => ({ ...prev, code: err.message }));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF6EF]/30 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-block mb-4">
          <img className="w-44 h-auto max-h-16 mx-auto object-contain rounded-md" src={siteLogo || "/verification-logo.png"} alt="Brand Logo" />
        </Link>
        <div className="text-[11px] tracking-[0.3em] uppercase text-[#9C6B30] mb-1">
          {isAdmin ? 'Administrator Security' : 'Customer Account Recovery'}
        </div>
        <h2 className="font-display text-3xl font-light text-[#1A1A1A]">
          {step === 'request' ? 'Forgot Password' : 'Set New Password'}
        </h2>
        <div className="gold-line w-12 mx-auto my-3" />
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 border border-[#E8E8E8] rounded-2xl shadow-xl">
          {step === 'request' ? (
            <div>
              <p className="text-xs text-neutral-500 mb-6 text-center leading-relaxed">
                Enter your registered {isAdmin ? 'admin' : ''} email address. We will generate a 6-digit recovery code for your account.
              </p>

              <form onSubmit={handleRequest} className="space-y-4" noValidate>
                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-medium block mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                      }}
                      placeholder={isAdmin ? 'admin@example.com' : 'yourname@gmail.com'}
                      className={`w-full pl-11 pr-4 py-3 border ${errors.email ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-xl text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-[#9C6B30] transition`}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-500 mt-1 pl-1">{errors.email}</p>}
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-500 py-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAdmin}
                      onChange={(e) => setIsAdmin(e.target.checked)}
                      className="rounded text-[#9C6B30] focus:ring-[#9C6B30]"
                    />
                    <span>Reset as Administrator</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3.5 bg-[#1A1A1A] text-white text-[11px] tracking-[0.2em] uppercase hover:bg-[#9C6B30] transition rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer font-medium shadow-sm"
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={15} />}
                  Send Verification Code
                </button>
              </form>
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setStep('request')}
                className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-[#9C6B30] transition mb-4"
              >
                <ArrowLeft size={13} /> Change email
              </button>

              <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
                Enter the 6-digit code for <strong className="text-neutral-800">{email}</strong> and pick your new password.
              </p>

              {devCode && (
                <div className="mb-5 p-3 bg-[#FAF6EF] border border-[#9C6B30]/30 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-[#9C6B30] font-medium">Your 6-digit code:</span>
                  <span className="font-mono text-base font-bold tracking-widest text-[#1A1A1A] bg-white px-2.5 py-0.5 rounded-md border border-[#E8E8E8]">
                    {devCode}
                  </span>
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-4" noValidate>
                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-medium block mb-1">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={code}
                    onChange={e => {
                      const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                      setCode(digits);
                      if (errors.code) setErrors(prev => ({ ...prev, code: '' }));
                    }}
                    placeholder="123456"
                    className={`w-full px-4 py-2.5 text-center font-mono text-lg tracking-widest border ${errors.code ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-xl text-neutral-800 focus:outline-none focus:border-[#9C6B30] transition`}
                  />
                  {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
                </div>

                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-medium block mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewEye ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => {
                        setNewPassword(e.target.value);
                        if (errors.newPassword) setErrors(prev => ({ ...prev, newPassword: '' }));
                      }}
                      placeholder="At least 6 characters"
                      className={`w-full pl-4 pr-10 py-2.5 border ${errors.newPassword ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-xl text-sm text-neutral-800 focus:outline-none focus:border-[#9C6B30] transition`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewEye(!showNewEye)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                    >
                      {showNewEye ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.newPassword && <p className="text-xs text-red-500 mt-1">{errors.newPassword}</p>}
                </div>

                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-medium block mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfEye ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => {
                        setConfirmPassword(e.target.value);
                        if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' }));
                      }}
                      placeholder="Repeat new password"
                      className={`w-full pl-4 pr-10 py-2.5 border ${errors.confirmPassword ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-xl text-sm text-neutral-800 focus:outline-none focus:border-[#9C6B30] transition`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfEye(!showConfEye)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                    >
                      {showConfEye ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3.5 bg-[#1A1A1A] text-white text-[11px] tracking-[0.2em] uppercase hover:bg-[#9C6B30] transition rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer font-medium shadow-sm mt-2"
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Reset Password
                </button>
              </form>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <Link
              href={isAdmin ? "/admin/login" : "/login"}
              className="inline-flex items-center gap-1.5 hover:text-[#9C6B30] transition"
            >
              <ArrowLeft size={13} /> Back to Sign In
            </Link>

            <Link href="/" className="hover:text-[#9C6B30] transition">
              Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="animate-spin text-[#9C6B30]" size={28} />
        </div>
      }
    >
      <ForgotPasswordInner />
    </Suspense>
  );
}
