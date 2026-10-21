'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Script from 'next/script';
import { useAuth } from '@/lib/use-auth';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User as UserIcon, X, ShieldCheck, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function GoogleIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
    </svg>
  );
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login', onSuccess }) {
  const { login, register, verifyRegistration, resendVerification, loginWithGoogle } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mode, setMode] = useState(initialMode);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleRendered, setGoogleRendered] = useState(false);
  const googleBtnContainerRef = useRef(null);

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');

  // Account Email Verification State
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyDevCode, setVerifyDevCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '998849094985-1ec0iv6a0ih2ulrru88vv3ngvcbcv68c.apps.googleusercontent.com';

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    setMode(initialMode);
    setFieldErrors({ name: '', email: '', password: '' });
    setErr('');
    setVerifyError('');
    setVerifyCode('');
  }, [initialMode, isOpen]);

  const handleGoogleCredentialResponse = async (response) => {
    if (!response?.credential) return;
    setGoogleBusy(true);
    setErr('');
    try {
      const u = await loginWithGoogle(response.credential);
      toast.success(`Welcome, ${u.name || 'valued customer'}!`);
      if (onSuccess) onSuccess(u);
      if (onClose) onClose();
    } catch (ex) {
      console.error('Google sign-in error:', ex);
      setErr(ex.message || 'Google sign-in failed');
      toast.error(ex.message || 'Google sign-in failed');
    } finally {
      setGoogleBusy(false);
    }
  };

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    let cancelled = false;

    const setupGoogle = () => {
      if (cancelled || !googleBtnContainerRef.current) return;
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          googleBtnContainerRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            shape: 'pill',
            text: mode === 'login' ? 'signin_with' : 'signup_with',
            logo_alignment: 'left',
            width: 320,
          });
          setGoogleRendered(true);
        } catch (e) {
          console.warn('Failed to render Google button:', e);
          setGoogleRendered(false);
        }
      }
    };

    // Ensure Google script is present
    if (!window.google && !document.getElementById('google-gsi-client')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (!cancelled) setupGoogle();
      };
      document.head.appendChild(script);
    }

    if (window.google?.accounts?.id) {
      setupGoogle();
    } else {
      const t = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(t);
          if (!cancelled) setupGoogle();
        }
      }, 200);
      return () => {
        cancelled = true;
        clearInterval(t);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [isOpen, mode, clientId]);

  const handleManualGoogleClick = () => {
    if (!clientId) {
      toast.info('Google Sign-In is configured on the app! Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in the .env file.');
      return;
    }

    setGoogleBusy(true);
    setErr('');

    // Primary click method: Google OAuth2 popup token client
    if (window.google?.accounts?.oauth2) {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'email profile openid',
          callback: async (resp) => {
            if (resp?.error) {
              console.error('Google OAuth popup error:', resp);
              setGoogleBusy(false);
              if (resp.error === 'access_denied') {
                toast.info('Google sign-in was cancelled.');
              } else {
                toast.error(`Google sign-in error: ${resp.error}`);
              }
              return;
            }
            if (resp?.access_token) {
              try {
                const u = await loginWithGoogle({ accessToken: resp.access_token });
                toast.success(`Welcome, ${u.name || 'valued customer'}!`);
                if (onSuccess) onSuccess(u);
                if (onClose) onClose();
              } catch (ex) {
                setErr(ex.message || 'Google sign-in failed');
                toast.error(ex.message || 'Google sign-in failed');
              } finally {
                setGoogleBusy(false);
              }
            } else {
              setGoogleBusy(false);
            }
          },
          error_callback: (err) => {
            console.error('Google token client error:', err);
            setGoogleBusy(false);
            if (err?.type === 'popup_failed_to_open') {
              toast.error('Google sign-in popup was blocked by your browser. Please allow popups.');
            } else {
              toast.error('Google Sign-In popup could not open. Please verify authorized origins in Google Cloud Console.');
            }
          }
        });

        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (e) {
        console.warn('OAuth2 token client init failed, falling back:', e);
      }
    }

    // Fallback: One Tap prompt
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification) => {
        setGoogleBusy(false);
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          toast.info('Please select your Google account.');
        }
      });
    } else {
      setGoogleBusy(false);
      toast.error('Google Identity service is loading. Please try again in a moment.');
    }
  };

  const validate = () => {
    const errors = { name: '', email: '', password: '' };
    let isValid = true;

    if (mode === 'register' && !(form.name || '').trim()) {
      errors.name = 'Must enter your name';
      isValid = false;
    }

    const cleanEmail = (form.email || '').trim();
    if (!cleanEmail) {
      errors.email = 'Please enter your email address';
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        errors.email = 'Please enter a valid Email address';
        isValid = false;
      }
    }

    if (!form.password) {
      errors.password = 'Please enter your password';
      isValid = false;
    } else if (form.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!validate()) return;

    const cleanEmail = form.email.trim();
    setBusy(true);
    try {
      if (mode === 'login') {
        const u = await login(cleanEmail, form.password);
        if (u?.requiresVerification) {
          setVerifyEmail(cleanEmail);
          setVerifyCode('');
          setVerifyDevCode(u.devCode || '');
          setVerifyError('');
          setResendCooldown(30);
          setMode('register_verify');
          toast.info(u.message || 'Please enter the 6-digit code sent to your email.');
          return;
        }
        toast.success(`Welcome back${u?.name ? `, ${u.name}` : ''}!`);
        if (onSuccess) onSuccess(u);
        if (onClose) onClose();
      } else {
        const res = await register(form.name.trim(), cleanEmail, form.password);
        if (res?.requiresVerification) {
          setVerifyEmail(cleanEmail);
          setVerifyCode('');
          setVerifyDevCode(res.devCode || '');
          setVerifyError('');
          setResendCooldown(30);
          setMode('register_verify');
          toast.success(res.message || 'Verification code sent to your email.');
          return;
        }
        toast.success('Account created successfully');
        if (onSuccess) onSuccess(res);
        if (onClose) onClose();
      }
    } catch (ex) {
      setErr(ex.message);
      toast.error(ex.message);
    } finally {
      setBusy(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setVerifyError('');
    const cleanCode = (verifyCode || '').trim();
    if (!cleanCode || cleanCode.length < 6) {
      setVerifyError('Please enter the 6-digit verification code');
      return;
    }
    setVerifyBusy(true);
    try {
      const u = await verifyRegistration(verifyEmail, cleanCode);
      toast.success('Email verified successfully! Welcome to MikuMantra.');
      if (onSuccess) onSuccess(u);
      if (onClose) onClose();
    } catch (err) {
      setVerifyError(err.message || 'Verification failed. Please check the code.');
      toast.error(err.message || 'Verification failed');
    } finally {
      setVerifyBusy(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setVerifyError('');
    try {
      const res = await resendVerification(verifyEmail);
      toast.success(res.message || 'A new verification code has been sent!');
      if (res.devCode) {
        setVerifyDevCode(res.devCode);
      }
      setResendCooldown(30);
    } catch (err) {
      toast.error(err.message || 'Failed to resend code');
      setVerifyError(err.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/45 backdrop-blur-xs z-[80] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 15, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white max-w-md w-full rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-[#E8E8E8] luxe-shadow relative my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-neutral-700 transition rounded-full hover:bg-neutral-100"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {mode === 'register_verify' ? (
              <div className="animate-in fade-in duration-200">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-full bg-[#FAF5EB] border border-[#9C6B30]/30 text-[#9C6B30] flex items-center justify-center mx-auto mb-4 shadow-[0_4px_16px_rgba(156,107,48,0.12)]">
                    <ShieldCheck size={28} />
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl text-[#1A1A1A] font-light">
                    Verify Your Email
                  </h2>
                  <div className="gold-line w-12 mx-auto my-3" />
                  <p className="text-xs sm:text-sm text-neutral-500 max-w-sm mx-auto leading-relaxed">
                    We've sent a 6-digit verification code to
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FAF5EB] text-[#9C6B30] font-medium text-xs border border-[#9C6B30]/20">
                    <Mail size={13} />
                    <span>{verifyEmail}</span>
                  </div>
                </div>

                {verifyDevCode && (
                  <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-center">
                    <div className="text-[11px] text-amber-800 font-medium">
                      Test Mode / Quick Fill:
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setVerifyCode(verifyDevCode);
                        setVerifyError('');
                      }}
                      className="mt-1 text-xs font-mono font-bold tracking-widest text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1 rounded-md transition cursor-pointer"
                    >
                      Fill Code: {verifyDevCode}
                    </button>
                  </div>
                )}

                <form onSubmit={handleVerifySubmit} className="space-y-4" noValidate>
                  <div>
                    <label className="block text-[10px] tracking-[0.2em] uppercase font-semibold text-neutral-500 text-center mb-2">
                      Enter 6-Digit Verification Code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      autoFocus
                      value={verifyCode}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                        setVerifyCode(val);
                        if (verifyError) setVerifyError('');
                      }}
                      placeholder="••••••"
                      className={`w-full py-3.5 px-4 border text-center font-mono text-2xl tracking-[0.35em] text-[#1A1A1A] bg-[#FAF8F5]/60 focus:bg-white rounded-xl focus:outline-none transition ${
                        verifyError ? 'border-red-400 bg-red-50/20' : 'border-[#E2DBD1] focus:border-[#9C6B30]'
                      }`}
                    />
                    {verifyError && (
                      <p className="text-xs text-red-500 mt-2 text-center font-light">
                        {verifyError}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={verifyBusy || verifyCode.length < 6}
                    className="w-full py-3.5 sm:py-4 bg-[#1A1A1A] hover:bg-[#9C6B30] text-white text-[11px] tracking-[0.25em] uppercase transition rounded-full flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer font-medium shadow-[0_4px_16px_rgba(26,26,26,0.12)] hover:shadow-[0_6px_22px_rgba(156,107,48,0.28)]"
                  >
                    {verifyBusy && <Loader2 size={14} className="animate-spin" />}
                    <span>VERIFY &amp; ACTIVATE ACCOUNT</span>
                  </button>
                </form>

                <div className="mt-5 pt-4 border-t border-[#EAE3D6] text-center space-y-2.5">
                  <div className="text-xs text-neutral-500">
                    Didn't receive the email?{' '}
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendCooldown > 0 || resending}
                      className="text-[#9C6B30] font-medium hover:underline disabled:text-neutral-400 disabled:no-underline cursor-pointer"
                    >
                      {resending
                        ? 'Sending...'
                        : resendCooldown > 0
                        ? `Resend code in ${resendCooldown}s`
                        : 'Resend code'}
                    </button>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setVerifyError('');
                        setVerifyCode('');
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 transition cursor-pointer"
                    >
                      <ArrowLeft size={13} />
                      <span>Change email / Back to registration</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Top Pill Switcher */}
                <div className="flex gap-2 mb-6 p-1 bg-[#FAF6EF] rounded-full w-fit mx-auto max-w-full overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setFieldErrors({}); setErr(''); }}
                    className={`px-5 sm:px-7 py-2 rounded-full text-[11px] tracking-[0.2em] uppercase font-medium transition shrink-0 cursor-pointer ${mode === 'login' ? 'bg-[#1A1A1A] text-white shadow-xs' : 'text-neutral-500 hover:text-neutral-800'}`}
                  >
                    SIGN IN
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setFieldErrors({}); setErr(''); }}
                    className={`px-5 sm:px-7 py-2 rounded-full text-[11px] tracking-[0.2em] uppercase font-medium transition shrink-0 cursor-pointer ${mode === 'register' ? 'bg-[#1A1A1A] text-white shadow-xs' : 'text-neutral-500 hover:text-neutral-800'}`}
                  >
                    CREATE ACCOUNT
                  </button>
                </div>

                <h2 className="font-display text-2xl sm:text-3xl text-center text-[#1A1A1A] font-light">
                  {mode === 'login' ? 'Welcome back' : 'Join MikuMantra'}
                </h2>
                <div className="gold-line w-12 mx-auto my-3" />
                <p className="text-center text-xs sm:text-sm text-neutral-500 mb-6">
                  {mode === 'login' ? 'Sign in to continue your journey.' : 'Create your account in seconds.'}
                </p>

                {/* Google Sign In Button */}
                <div className="mb-5">
                  <div className="w-full flex flex-col items-center justify-center min-h-[44px]">
                    <div
                      ref={googleBtnContainerRef}
                      className={`w-full flex justify-center ${googleRendered && !googleBusy ? 'block' : 'hidden'}`}
                    />

                    {(!googleRendered || googleBusy) && (
                      <button
                        type="button"
                        onClick={handleManualGoogleClick}
                        disabled={googleBusy || busy}
                        className="w-full py-3 px-4 border border-[#E8E8E8] rounded-full text-sm font-medium text-neutral-800 hover:bg-[#FAF6EF]/60 hover:border-[#9C6B30]/40 transition flex items-center justify-center gap-3 shadow-2xs cursor-pointer disabled:opacity-60 bg-white"
                      >
                        {googleBusy ? (
                          <Loader2 size={18} className="animate-spin text-[#9C6B30]" />
                        ) : (
                          <GoogleIcon className="w-5 h-5 shrink-0" />
                        )}
                        <span>{mode === 'login' ? 'Sign in with Google' : 'Sign up with Google'}</span>
                      </button>
                    )}
                  </div>

                  <div className="relative my-5 text-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#E8E8E8]" />
                    </div>
                    <span className="relative bg-white px-3 text-[10px] sm:text-[11px] tracking-[0.2em] uppercase text-neutral-400 font-medium select-none">
                      {mode === 'login' ? 'OR SIGN IN WITH PASSWORD' : 'OR SIGN UP WITH PASSWORD'}
                    </span>
                  </div>
                </div>

                <form onSubmit={submit} className="space-y-3.5" noValidate>
                  {mode === 'register' && (
                    <div>
                      <div className="relative">
                        <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                          value={form.name}
                          onChange={e => {
                            setForm({ ...form, name: e.target.value });
                            if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                          }}
                          placeholder="Full name"
                          className={`w-full pl-11 pr-4 py-3 border ${fieldErrors.name ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-full text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-[#9C6B30] transition`}
                        />
                      </div>
                      {fieldErrors.name && <p className="text-xs text-red-500 mt-1 pl-4">{fieldErrors.name}</p>}
                    </div>
                  )}

                  <div>
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => {
                          setForm({ ...form, email: e.target.value });
                          if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }));
                        }}
                        placeholder="Gmail or Email (e.g. yourname@gmail.com)"
                        className={`w-full pl-11 pr-4 py-3 border ${fieldErrors.email ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-full text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-[#9C6B30] transition`}
                      />
                    </div>
                    {fieldErrors.email && <p className="text-xs text-red-500 mt-1 pl-4">{fieldErrors.email}</p>}
                  </div>

                  <div>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="password"
                        value={form.password}
                        onChange={e => {
                          setForm({ ...form, password: e.target.value });
                          if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' }));
                        }}
                        placeholder={mode === 'login' ? 'Password' : 'Create password (min 6 characters)'}
                        className={`w-full pl-11 pr-4 py-3 border ${fieldErrors.password ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-full text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-[#9C6B30] transition`}
                      />
                    </div>
                    {fieldErrors.password && <p className="text-xs text-red-500 mt-1 pl-4">{fieldErrors.password}</p>}
                  </div>

                  {err && (
                    <div className="text-center py-1">
                      <p className="text-xs text-red-600 font-medium">{err}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-3.5 bg-[#1A1A1A] text-white text-[11px] tracking-[0.25em] uppercase hover:bg-[#9C6B30] transition rounded-full flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer font-medium"
                  >
                    {busy && <Loader2 size={14} className="animate-spin" />}
                    {mode === 'login' ? 'SIGN IN WITH GMAIL / EMAIL' : 'CREATE ACCOUNT WITH GMAIL / EMAIL'}
                  </button>
                </form>

                <div className="text-center mt-5 text-xs text-neutral-500">
                  {mode === 'login' ? (
                    <>
                      New to MikuMantra?{' '}
                      <button
                        type="button"
                        onClick={() => { setMode('register'); setFieldErrors({}); setErr(''); }}
                        className="text-[#9C6B30] hover:underline font-medium cursor-pointer"
                      >
                        Create an account
                      </button>
                    </>
                  ) : (
                    <>
                      Already a member?{' '}
                      <button
                        type="button"
                        onClick={() => { setMode('login'); setFieldErrors({}); setErr(''); }}
                        className="text-[#9C6B30] hover:underline font-medium cursor-pointer"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
