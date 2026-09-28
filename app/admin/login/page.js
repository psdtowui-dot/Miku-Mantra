'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { useAuth } from '@/lib/use-auth';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, ShieldCheck, AlertCircle, ArrowLeft, KeyRound, CheckCircle2, Eye, EyeOff, X } from 'lucide-react';

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

function AdminLoginInner() {
  const { user, loading, login, loginWithGoogle, forgotPassword, resetPassword } = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  const redirect = sp.get('redirect') || '/admin';
  const urlError = sp.get('error');

  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleRendered, setGoogleRendered] = useState(false);
  const [err, setErr] = useState('');
  const googleBtnContainerRef = useRef(null);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState('request'); // 'request' | 'verify'
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotDevCode, setForgotDevCode] = useState('');
  const [forgotErrors, setForgotErrors] = useState({ email: '', code: '', newPassword: '', confirmPassword: '' });
  const [forgotBusy, setForgotBusy] = useState(false);
  const [showForgotNewEye, setShowForgotNewEye] = useState(false);
  const [showForgotConfEye, setShowForgotConfEye] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '998849094985-1ec0iv6a0ih2ulrru88vv3ngvcbcv68c.apps.googleusercontent.com';
  const [siteLogo, setSiteLogo] = useState('/logo.png');

  useEffect(() => {
    fetch('/api/site-settings')
      .then(r => r.json())
      .then(d => {
        if (d?.logo) setSiteLogo(d.logo);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading && user && user.role === 'admin') {
      router.replace(redirect);
    }
  }, [loading, user, router, redirect]);

  useEffect(() => {
    if (urlError === 'forbidden') {
      setErr('Access Denied: Your account does not have administrative privileges. Please log in with a verified admin Gmail account or admin credentials.');
    }
  }, [urlError]);

  const handleGoogleCredentialResponse = async (response) => {
    if (!response?.credential) return;
    setGoogleBusy(true);
    setErr('');
    try {
      // Strictly enforce requireAdmin verification against DB and .env
      const u = await loginWithGoogle(response.credential, { requireAdmin: true });
      if (u && u.role === 'admin') {
        toast.success(`Welcome back, Administrator ${u.name || ''}!`);
        router.push(redirect);
      } else {
        throw new Error('This account is not authorized for administrator access.');
      }
    } catch (ex) {
      console.error('Admin Google sign-in verification failed:', ex);
      setErr(ex.message || 'Administrator verification failed.');
      toast.error(ex.message || 'Administrator verification failed.');
    } finally {
      setGoogleBusy(false);
    }
  };

  useEffect(() => {
    if (!clientId || typeof window === 'undefined') return;

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
            theme: 'filled_black',
            size: 'large',
            type: 'standard',
            shape: 'pill',
            text: 'signin_with',
            logo_alignment: 'left',
            width: 320,
          });
          setGoogleRendered(true);
        } catch (e) {
          console.warn('Failed to render admin Google button:', e);
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
  }, [clientId]);

  const handleManualGoogleClick = () => {
    if (!clientId) {
      toast.error('Google Client ID is missing. Please check .env configuration.');
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
                const u = await loginWithGoogle({ accessToken: resp.access_token }, { requireAdmin: true });
                if (u && u.role === 'admin') {
                  toast.success(`Welcome back, Administrator ${u.name || ''}!`);
                  router.push(redirect);
                } else {
                  throw new Error('This account is not authorized for administrator access.');
                }
              } catch (ex) {
                console.error('Admin Google sign-in verification failed:', ex);
                setErr(ex.message || 'Administrator verification failed.');
                toast.error(ex.message || 'Administrator verification failed.');
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
          toast.info('Please click the Google button to authenticate as Admin.');
        }
      });
    } else {
      setGoogleBusy(false);
      toast.error('Google Authentication service is loading. Please try again in a few seconds.');
    }
  };

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    const em = form.email.trim();
    if (!em || !form.password) {
      setErr('Please enter both admin email and password.');
      return;
    }

    setBusy(true);
    try {
      const u = await login(em, form.password, { requireAdmin: true });
      if (u && u.role === 'admin') {
        toast.success(`Welcome back, ${u.name || 'Admin'}!`);
        router.push(redirect);
      } else {
        throw new Error('Access Denied: This account does not have administrator privileges.');
      }
    } catch (ex) {
      setErr(ex.message || 'Invalid credentials or unauthorized account.');
      toast.error(ex.message || 'Login failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleForgotRequest = async (e) => {
    e.preventDefault();
    const cleanEmail = (forgotEmail || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail) {
      setForgotErrors(prev => ({ ...prev, email: 'Please enter admin email address' }));
      return;
    }
    if (!emailRegex.test(cleanEmail)) {
      setForgotErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
      return;
    }
    setForgotErrors(prev => ({ ...prev, email: '' }));
    setForgotBusy(true);
    try {
      const res = await forgotPassword(cleanEmail, { requireAdmin: true });
      toast.success(res.message || 'Verification code generated!');
      if (res.code) {
        setForgotDevCode(res.code);
        setForgotCode(res.code);
      }
      setForgotStep('verify');
    } catch (err) {
      setForgotErrors(prev => ({ ...prev, email: err.message || 'Failed to request reset code' }));
      toast.error(err.message || 'Failed to request reset code');
    } finally {
      setForgotBusy(false);
    }
  };

  const handleForgotReset = async (e) => {
    e.preventDefault();
    const errs = { email: '', code: '', newPassword: '', confirmPassword: '' };
    let valid = true;

    if (!forgotCode || forgotCode.trim().length < 6) {
      errs.code = 'Please enter the 6-digit verification code';
      valid = false;
    }
    if (!forgotNewPassword) {
      errs.newPassword = 'Must enter a new password';
      valid = false;
    } else if (forgotNewPassword.length < 6) {
      errs.newPassword = 'Password must be at least 6 characters';
      valid = false;
    }
    if (!forgotConfirmPassword) {
      errs.confirmPassword = 'Must confirm your new password';
      valid = false;
    } else if (forgotNewPassword !== forgotConfirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
      valid = false;
    }

    setForgotErrors(errs);
    if (!valid) return;

    setForgotBusy(true);
    try {
      const res = await resetPassword(forgotEmail.trim().toLowerCase(), forgotCode.trim(), forgotNewPassword, forgotConfirmPassword);
      toast.success(res.message || 'Admin password reset successfully! Please authenticate.');
      setForm(prev => ({ ...prev, email: forgotEmail.trim(), password: forgotNewPassword }));
      setShowForgotModal(false);
      setForgotStep('request');
      setForgotCode('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      setForgotDevCode('');
    } catch (err) {
      toast.error(err.message || 'Failed to reset password');
      if (err.message && err.message.toLowerCase().includes('code')) {
        setForgotErrors(prev => ({ ...prev, code: err.message }));
      }
    } finally {
      setForgotBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0A0A0B] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => {
          if (clientId && window.google?.accounts?.id && googleBtnContainerRef.current) {
            try {
              window.google.accounts.id.initialize({
                client_id: clientId,
                callback: handleGoogleCredentialResponse,
                auto_select: false,
                cancel_on_tap_outside: true,
              });
              googleBtnContainerRef.current.innerHTML = '';
              window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
                theme: 'filled_black',
                size: 'large',
                type: 'standard',
                shape: 'pill',
                text: 'signin_with',
                logo_alignment: 'left',
                width: 320,
              });
              setGoogleRendered(true);
            } catch (e) {}
          }
        }}
      />

      {/* Luxury gold glow accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-[#D4AF37]/10 via-[#9C6B30]/5 to-transparent blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <Link href="/" className="inline-block transition-transform hover:scale-105">
            <img className="h-10 w-auto object-contain brightness-110" src={siteLogo || "/logo.png"} alt="Brand Logo" />
          </Link>
        </div>

        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1A1A1A] border border-[#D4AF37]/30 text-[10px] tracking-widest uppercase font-semibold text-[#D4AF37]">
            <ShieldCheck size={13} className="text-[#D4AF37]" />
            Restricted Admin Portal
          </div>
        </div>

        <h2 className="text-center font-display text-2xl sm:text-3xl font-light text-white tracking-wide">
          Admin Sign In
        </h2>
        <p className="mt-2 text-center text-xs text-neutral-400 font-serif-luxe">
          Requires verified administrator email in Database or <code className="text-[#D4AF37] font-mono text-[11px]">.env</code>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-[#121214] border border-white/10 py-8 px-6 sm:px-10 rounded-2xl shadow-2xl backdrop-blur-md">
          {/* Error Banner */}
          {err && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 text-red-400 mt-0.5" />
              <div className="leading-relaxed flex-1">
                <span className="font-semibold text-red-200">Verification Blocked: </span>
                {err}
                {(err.toLowerCase().includes('denied') || err.toLowerCase().includes('not registered as an administrator')) && (
                  <div className="mt-2 pt-2 border-t border-red-800/40">
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-1 text-[#D4AF37] hover:underline font-medium"
                    >
                      Are you a customer? Go to Customer Login →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Google Sign In Section */}
          <div className="space-y-4">
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
                  className="w-full py-3.5 px-4 bg-[#1E1E22] hover:bg-[#25252A] text-white border border-[#D4AF37]/40 hover:border-[#D4AF37] rounded-full text-xs tracking-wider uppercase font-medium transition flex items-center justify-center gap-3 shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {googleBusy ? (
                    <Loader2 size={18} className="animate-spin text-[#D4AF37]" />
                  ) : (
                    <GoogleIcon className="w-5 h-5 shrink-0" />
                  )}
                  <span>Sign in with Gmail as Admin</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 px-3 py-2 bg-black/40 rounded-lg border border-white/5 text-[11px] text-neutral-400">
              <CheckCircle2 size={13} className="text-[#D4AF37] shrink-0" />
              <span>Only Gmail accounts matching verified admin records are granted access.</span>
            </div>

            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <span className="relative bg-[#121214] px-3 text-[10px] tracking-[0.25em] uppercase text-neutral-500 font-medium select-none">
                OR SIGN IN WITH PASSWORD
              </span>
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleCredentialsSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-neutral-400 font-medium mb-1.5">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="admin@example.com"
                    className="w-full pl-11 pr-4 py-3 bg-[#1A1A1E] border border-white/10 focus:border-[#D4AF37] rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] uppercase tracking-wider text-neutral-400 font-medium">
                    Password
                  </label>
                  <button
                    type="button"
                    data-testid="admin-forgot-password-link"
                    onClick={() => {
                      setForgotEmail(form.email || '');
                      setForgotStep('request');
                      setForgotErrors({ email: '', code: '', newPassword: '', confirmPassword: '' });
                      setShowForgotModal(true);
                    }}
                    className="text-[11px] text-[#D4AF37] hover:underline font-medium cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 bg-[#1A1A1E] border border-white/10 focus:border-[#D4AF37] rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={busy || googleBusy}
                className="w-full py-3.5 bg-gradient-to-r from-[#9C6B30] to-[#D4AF37] hover:from-[#b07d3b] hover:to-[#e2bf48] text-black text-xs tracking-widest uppercase font-semibold rounded-xl flex items-center justify-center gap-2 transition shadow-lg cursor-pointer disabled:opacity-50 mt-2"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={15} />}
                Authenticate Admin
              </button>
            </form>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between text-xs text-neutral-400">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-neutral-400 hover:text-[#D4AF37] transition"
            >
              <ArrowLeft size={14} /> Back to Store
            </Link>

            <Link
              href="/login"
              className="text-neutral-400 hover:text-white transition"
            >
              Customer Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Admin Forgot / Reset Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#141417] border border-white/10 rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 my-auto text-white">
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white rounded-lg transition"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {forgotStep === 'request' ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                    <KeyRound size={20} />
                  </div>
                  <img src={siteLogo || "/verification-logo.png"} alt="Brand Logo" className="h-7 w-auto object-contain rounded" />
                </div>
                <h3 className="text-xl font-serif tracking-wide text-white">Admin Password Reset</h3>
                <p className="text-xs text-neutral-400 mt-1 mb-5 leading-relaxed">
                  Enter your verified administrator email address to generate a 6-digit recovery code.
                </p>

                <form onSubmit={handleForgotRequest} className="space-y-4" noValidate>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-neutral-400 font-medium mb-1.5">
                      Admin Email
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => {
                          setForgotEmail(e.target.value);
                          if (forgotErrors.email) setForgotErrors(prev => ({ ...prev, email: '' }));
                        }}
                        placeholder="admin@example.com"
                        className={`w-full pl-11 pr-4 py-3 bg-[#1A1A1E] border ${forgotErrors.email ? 'border-red-500' : 'border-white/10 focus:border-[#D4AF37]'} rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none transition`}
                      />
                    </div>
                    {forgotErrors.email && <p className="text-xs text-red-400 mt-1 pl-1">{forgotErrors.email}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={forgotBusy}
                    className="w-full py-3 bg-gradient-to-r from-[#9C6B30] to-[#D4AF37] hover:from-[#b07d3b] hover:to-[#e2bf48] text-black text-xs tracking-widest uppercase font-semibold rounded-xl flex items-center justify-center gap-2 transition shadow-lg cursor-pointer disabled:opacity-50"
                  >
                    {forgotBusy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={15} />}
                    Generate Reset Code
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => setForgotStep('request')}
                    className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-[#D4AF37] transition"
                  >
                    <ArrowLeft size={13} /> Change email
                  </button>
                  <img src={siteLogo || "/verification-logo.png"} alt="Brand Logo" className="h-7 w-auto object-contain rounded" />
                </div>

                <h3 className="text-xl font-serif tracking-wide text-white">Reset Admin Password</h3>
                <p className="text-xs text-neutral-400 mt-1 mb-4 leading-relaxed">
                  Enter the 6-digit code for <strong className="text-white">{forgotEmail}</strong> and specify your new admin password.
                </p>

                {forgotDevCode && (
                  <div className="mb-4 p-3 bg-[#D4AF37]/10 border border-[#D4AF37]/25 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-[#D4AF37] font-medium">Recovery code:</span>
                    <span className="font-mono text-base font-bold tracking-widest text-[#D4AF37] bg-black/40 px-2.5 py-0.5 rounded-md border border-[#D4AF37]/30">
                      {forgotDevCode}
                    </span>
                  </div>
                )}

                <form onSubmit={handleForgotReset} className="space-y-4" noValidate>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-neutral-400 font-medium mb-1.5">
                      6-Digit Verification Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={forgotCode}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                        setForgotCode(digits);
                        if (forgotErrors.code) setForgotErrors(prev => ({ ...prev, code: '' }));
                      }}
                      placeholder="e.g. 123456"
                      className={`w-full px-4 py-2.5 text-center font-mono text-lg tracking-widest bg-[#1A1A1E] border ${forgotErrors.code ? 'border-red-500' : 'border-white/10 focus:border-[#D4AF37]'} rounded-xl text-white focus:outline-none transition`}
                    />
                    {forgotErrors.code && <p className="text-xs text-red-400 mt-1 pl-1">{forgotErrors.code}</p>}
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-neutral-400 font-medium mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showForgotNewEye ? 'text' : 'password'}
                        value={forgotNewPassword}
                        onChange={(e) => {
                          setForgotNewPassword(e.target.value);
                          if (forgotErrors.newPassword) setForgotErrors(prev => ({ ...prev, newPassword: '' }));
                        }}
                        placeholder="At least 6 characters"
                        className={`w-full pl-4 pr-10 py-2.5 bg-[#1A1A1E] border ${forgotErrors.newPassword ? 'border-red-500' : 'border-white/10 focus:border-[#D4AF37]'} rounded-xl text-sm text-white focus:outline-none transition`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotNewEye(!showForgotNewEye)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                      >
                        {showForgotNewEye ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {forgotErrors.newPassword && <p className="text-xs text-red-400 mt-1 pl-1">{forgotErrors.newPassword}</p>}
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-neutral-400 font-medium mb-1.5">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showForgotConfEye ? 'text' : 'password'}
                        value={forgotConfirmPassword}
                        onChange={(e) => {
                          setForgotConfirmPassword(e.target.value);
                          if (forgotErrors.confirmPassword) setForgotErrors(prev => ({ ...prev, confirmPassword: '' }));
                        }}
                        placeholder="Repeat new password"
                        className={`w-full pl-4 pr-10 py-2.5 bg-[#1A1A1E] border ${forgotErrors.confirmPassword ? 'border-red-500' : 'border-white/10 focus:border-[#D4AF37]'} rounded-xl text-sm text-white focus:outline-none transition`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotConfEye(!showForgotConfEye)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                      >
                        {showForgotConfEye ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {forgotErrors.confirmPassword && <p className="text-xs text-red-400 mt-1 pl-1">{forgotErrors.confirmPassword}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={forgotBusy}
                    className="w-full py-3 bg-gradient-to-r from-[#9C6B30] to-[#D4AF37] hover:from-[#b07d3b] hover:to-[#e2bf48] text-black text-xs tracking-widest uppercase font-semibold rounded-xl flex items-center justify-center gap-2 transition shadow-lg cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {forgotBusy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Update Admin Password
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-[#0A0A0B]">
          <Loader2 className="animate-spin text-[#D4AF37]" size={28} />
        </div>
      }
    >
      <AdminLoginInner />
    </Suspense>
  );
}
