'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { useAuth } from '@/lib/use-auth';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User as UserIcon, ShieldCheck, KeyRound, Eye, EyeOff, X, ArrowLeft, CheckCircle2 } from 'lucide-react';

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

function LoginInner(){
  const { user, loading, login, register, loginWithGoogle, forgotPassword, resetPassword } = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  const redirect = sp.get('redirect') || '/account';
  const [mode, setMode] = useState(sp.get('mode') === 'register' ? 'register' : 'login');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleRendered, setGoogleRendered] = useState(false);
  const googleBtnContainerRef = useRef(null);

  const [form, setForm] = useState({ name:'', email:'', password:'' });
  const [fieldErrors, setFieldErrors] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');

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
    if (!loading && user) {
      if (user.role === 'admin' && (!redirect || redirect === '/account')) {
        router.replace('/admin');
      } else {
        router.replace(redirect);
      }
      return;
    }
    if (redirect && redirect.startsWith('/admin')) {
      router.replace('/admin/login?redirect=' + encodeURIComponent(redirect));
    }
  }, [loading, user, redirect, router]);

  const handleGoogleCredentialResponse = async (response) => {
    if (!response?.credential) return;
    setGoogleBusy(true);
    setErr('');
    try {
      const u = await loginWithGoogle(response.credential);
      toast.success(`Welcome, ${u.name || 'valued member'}!`);
      if (u?.role === 'admin' && (!sp.get('redirect') || sp.get('redirect') === '/account')) {
        router.push('/admin');
      } else {
        router.push(redirect);
      }
    } catch (ex) {
      console.error('Google sign-in error:', ex);
      setErr(ex.message || 'Google sign-in failed');
      toast.error(ex.message || 'Google sign-in failed');
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

          // Render Google button
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
  }, [mode, clientId]);

  const handleManualGoogleClick = () => {
    if (!clientId) {
      toast.info(
        'Google Sign-In is configured on the app! To connect your Google project, please set your NEXT_PUBLIC_GOOGLE_CLIENT_ID in the .env file.',
        { duration: 6000 }
      );
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
                toast.success(`Welcome, ${u.name || 'valued member'}!`);
                if (u?.role === 'admin' && (!sp.get('redirect') || sp.get('redirect') === '/account')) {
                  router.push('/admin');
                } else {
                  router.push(redirect);
                }
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
      toast.error('Google Identity service is still loading. Please try again in a moment.');
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
        toast.success(`Welcome back${u?.name ? `, ${u.name}` : ''}!`);
        if (u?.role === 'admin' && (!sp.get('redirect') || sp.get('redirect') === '/account')) {
          router.push('/admin');
          return;
        }
      } else {
        const u = await register(form.name.trim(), cleanEmail, form.password);
        toast.success('Account created successfully');
        if (u?.role === 'admin' && (!sp.get('redirect') || sp.get('redirect') === '/account')) {
          router.push('/admin');
          return;
        }
      }
      router.push(redirect);
    } catch(ex){
      setErr(ex.message);
      toast.error(ex.message);
    } finally {
      setBusy(false);
    }
  };

  const handleForgotRequest = async (e) => {
    e.preventDefault();
    const cleanEmail = (forgotEmail || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail) {
      setForgotErrors(prev => ({ ...prev, email: 'Please enter your email address' }));
      return;
    }
    if (!emailRegex.test(cleanEmail)) {
      setForgotErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
      return;
    }
    setForgotErrors(prev => ({ ...prev, email: '' }));
    setForgotBusy(true);
    try {
      const res = await forgotPassword(cleanEmail);
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
      toast.success(res.message || 'Password reset successfully! Please sign in.');
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
    <main className="bg-white min-h-screen">
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
                theme: 'outline',
                size: 'large',
                type: 'standard',
                shape: 'pill',
                text: mode === 'login' ? 'signin_with' : 'signup_with',
                logo_alignment: 'left',
                width: 320,
              });
              setGoogleRendered(true);
            } catch (e) {}
          }
        }}
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-16 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
        <div className="hidden md:block">
          <div className="text-[11px] tracking-[0.35em] uppercase text-[#9C6B30] mb-3">The MikuMantra Circle</div>
          <h1 className="font-display text-5xl font-light text-[#1A1A1A] leading-[1.05]">A house of<br/>fine jewellery.</h1>
          <div className="gold-line w-16 my-6"/>
          <p className="text-neutral-600 font-serif-luxe text-xl leading-relaxed max-w-md">Save your favourites, track orders and unlock private previews — all from your MikuMantra account.</p>
          <ul className="mt-8 space-y-3 text-sm text-neutral-600">
            {['Exclusive access to new arrivals','Order tracking & digital invoices','Wishlist synced across devices','Priority appointments at our atelier'].map(x=>(
              <li key={x} className="flex items-center gap-3"><ShieldCheck size={16} className="text-[#9C6B30]"/> {x}</li>
            ))}
          </ul>
        </div>

        <div className="border border-[#E8E8E8] rounded-2xl p-6 sm:p-10 luxe-shadow bg-white">
          <div className="flex gap-2 mb-6 sm:mb-8 p-1 bg-[#FAF6EF] rounded-full w-fit mx-auto max-w-full overflow-x-auto">
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

          <h2 className="font-display text-3xl sm:text-4xl text-center text-[#1A1A1A] font-light break-words">
            {mode === 'login' ? 'Welcome back' : 'Join MikuMantra'}
          </h2>
          <div className="gold-line w-12 mx-auto my-3 sm:my-4" />
          <p className="text-center text-xs sm:text-sm text-neutral-500 mb-6 sm:mb-8">
            {mode === 'login' ? 'Sign in to continue your journey.' : 'Create your account in seconds.'}
          </p>

          {/* Google Sign In Button */}
          <div className="mb-5 sm:mb-6">
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

            <div className="relative my-5 sm:my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E8E8E8]" />
              </div>
              <span className="relative bg-white px-3 sm:px-4 text-[10px] sm:text-[11px] tracking-[0.2em] sm:tracking-[0.25em] uppercase text-neutral-400 font-medium select-none">
                {mode === 'login' ? 'OR SIGN IN WITH PASSWORD' : 'OR SIGN UP WITH PASSWORD'}
              </span>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4" noValidate>
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
                    className={`w-full pl-11 pr-4 py-3 sm:py-3.5 border ${fieldErrors.name ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-full text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-[#9C6B30] transition`}
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
                  className={`w-full pl-11 pr-4 py-3 sm:py-3.5 border ${fieldErrors.email ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-full text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-[#9C6B30] transition`}
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
                  className={`w-full pl-11 pr-4 py-3 sm:py-3.5 border ${fieldErrors.password ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-full text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-[#9C6B30] transition`}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5 px-2">
                {fieldErrors.password ? (
                  <p className="text-xs text-red-500">{fieldErrors.password}</p>
                ) : <div />}
                {mode === 'login' && (
                  <button
                    type="button"
                    data-testid="login-forgot-password-link"
                    onClick={() => {
                      setForgotEmail(form.email || '');
                      setForgotStep('request');
                      setForgotErrors({ email: '', code: '', newPassword: '', confirmPassword: '' });
                      setShowForgotModal(true);
                    }}
                    className="text-xs text-[#9C6B30] hover:underline font-medium cursor-pointer ml-auto"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
            </div>

            {err && (
              <div className="text-center py-1">
                <p className="text-xs text-red-600 font-medium">{err}</p>
                {mode === 'login' && err.toLowerCase().includes('invalid') && (
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setErr(''); }}
                    className="text-xs text-[#9C6B30] hover:underline font-medium mt-1 inline-block"
                  >
                    First time here? Create your account with this Gmail →
                  </button>
                )}
                {mode === 'register' && err.toLowerCase().includes('already exists') && (
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setErr(''); }}
                    className="text-xs text-[#9C6B30] hover:underline font-medium mt-1 inline-block"
                  >
                    Already have an account? Sign In here →
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 sm:py-4 bg-[#1A1A1A] text-white text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.25em] uppercase hover:bg-[#9C6B30] transition rounded-full flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer font-medium"
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              {mode === 'login' ? 'SIGN IN WITH GMAIL / EMAIL' : 'CREATE ACCOUNT WITH GMAIL / EMAIL'}
            </button>
          </form>

          <div className="text-center mt-6 text-xs sm:text-sm text-neutral-500">
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

          <div className="text-center mt-5 pt-4 border-t border-neutral-100 flex items-center justify-center gap-1.5 text-xs text-neutral-400">
            <span>Staff or Administrator?</span>
            <Link
              href="/admin/login"
              className="text-[#9C6B30] hover:underline font-medium inline-flex items-center gap-1"
            >
              Admin Sign In →
            </Link>
          </div>
        </div>
      </div>

      {/* Forgot / Reset Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-[#E8E8E8] rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 my-auto">
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-neutral-800 rounded-full hover:bg-neutral-100 transition"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {forgotStep === 'request' ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-full bg-[#FAF6EF] border border-[#9C6B30]/30 flex items-center justify-center text-[#9C6B30]">
                    <KeyRound size={20} />
                  </div>
                  <img src={siteLogo || "/verification-logo.png"} alt="Brand Logo" className="h-8 w-auto object-contain rounded" />
                </div>
                <h3 className="font-display text-2xl text-[#1A1A1A] font-light">Forgot Password</h3>
                <div className="gold-line w-10 my-2" />
                <p className="text-xs text-neutral-500 mb-5 leading-relaxed">
                  Enter your registered Gmail or email address. We'll generate a 6-digit verification code so you can safely reset your password.
                </p>

                <form onSubmit={handleForgotRequest} className="space-y-4" noValidate>
                  <div>
                    <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-medium block mb-1">
                      Your Email Address
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={e => {
                          setForgotEmail(e.target.value);
                          if (forgotErrors.email) setForgotErrors(prev => ({ ...prev, email: '' }));
                        }}
                        placeholder="yourname@gmail.com"
                        className={`w-full pl-11 pr-4 py-3 border ${forgotErrors.email ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-full text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-[#9C6B30] transition`}
                      />
                    </div>
                    {forgotErrors.email && <p className="text-xs text-red-500 mt-1 pl-4">{forgotErrors.email}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={forgotBusy}
                    className="w-full py-3.5 bg-[#1A1A1A] text-white text-[11px] tracking-[0.2em] uppercase hover:bg-[#9C6B30] transition rounded-full flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer font-medium shadow-sm"
                  >
                    {forgotBusy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={15} />}
                    Send Verification Code
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => setForgotStep('request')}
                    className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-[#9C6B30] transition"
                  >
                    <ArrowLeft size={13} /> Change email
                  </button>
                  <img src={siteLogo || "/verification-logo.png"} alt="Brand Logo" className="h-7 w-auto object-contain rounded" />
                </div>

                <h3 className="font-display text-2xl text-[#1A1A1A] font-light">Reset Password</h3>
                <div className="gold-line w-10 my-2" />
                <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
                  Enter the 6-digit code for <strong className="text-neutral-800">{forgotEmail}</strong> and specify your new password.
                </p>

                {forgotDevCode && (
                  <div className="mb-4 p-3 bg-[#FAF6EF] border border-[#9C6B30]/30 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-[#9C6B30] font-medium">Your 6-digit code:</span>
                    <span className="font-mono text-base font-bold tracking-widest text-[#1A1A1A] bg-white px-2.5 py-0.5 rounded-md border border-[#E8E8E8]">
                      {forgotDevCode}
                    </span>
                  </div>
                )}

                <form onSubmit={handleForgotReset} className="space-y-4" noValidate>
                  <div>
                    <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-medium block mb-1">
                      6-Digit Verification Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={forgotCode}
                      onChange={e => {
                        const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                        setForgotCode(digits);
                        if (forgotErrors.code) setForgotErrors(prev => ({ ...prev, code: '' }));
                      }}
                      placeholder="e.g. 123456"
                      className={`w-full px-4 py-2.5 text-center font-mono text-lg tracking-widest border ${forgotErrors.code ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-xl text-neutral-800 focus:outline-none focus:border-[#9C6B30] transition`}
                    />
                    {forgotErrors.code && <p className="text-xs text-red-500 mt-1">{forgotErrors.code}</p>}
                  </div>

                  <div>
                    <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-medium block mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showForgotNewEye ? 'text' : 'password'}
                        value={forgotNewPassword}
                        onChange={e => {
                          setForgotNewPassword(e.target.value);
                          if (forgotErrors.newPassword) setForgotErrors(prev => ({ ...prev, newPassword: '' }));
                        }}
                        placeholder="At least 6 characters"
                        className={`w-full pl-4 pr-10 py-2.5 border ${forgotErrors.newPassword ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-xl text-sm text-neutral-800 focus:outline-none focus:border-[#9C6B30] transition`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotNewEye(!showForgotNewEye)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                      >
                        {showForgotNewEye ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {forgotErrors.newPassword && <p className="text-xs text-red-500 mt-1">{forgotErrors.newPassword}</p>}
                  </div>

                  <div>
                    <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-medium block mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showForgotConfEye ? 'text' : 'password'}
                        value={forgotConfirmPassword}
                        onChange={e => {
                          setForgotConfirmPassword(e.target.value);
                          if (forgotErrors.confirmPassword) setForgotErrors(prev => ({ ...prev, confirmPassword: '' }));
                        }}
                        placeholder="Repeat new password"
                        className={`w-full pl-4 pr-10 py-2.5 border ${forgotErrors.confirmPassword ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-xl text-sm text-neutral-800 focus:outline-none focus:border-[#9C6B30] transition`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotConfEye(!showForgotConfEye)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                      >
                        {showForgotConfEye ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {forgotErrors.confirmPassword && <p className="text-xs text-red-500 mt-1">{forgotErrors.confirmPassword}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={forgotBusy}
                    className="w-full py-3.5 bg-[#1A1A1A] text-white text-[11px] tracking-[0.2em] uppercase hover:bg-[#9C6B30] transition rounded-full flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer font-medium shadow-sm mt-2"
                  >
                    {forgotBusy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Reset Password
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

export default function LoginPage(){
  return <Suspense fallback={<div className="h-screen"/>}><LoginInner/></Suspense>;
}
