'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { useAuth } from '@/lib/use-auth';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User as UserIcon, ShieldCheck } from 'lucide-react';

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
  const { login, register, loginWithGoogle } = useAuth();
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

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const handleGoogleCredentialResponse = async (response) => {
    if (!response?.credential) return;
    setGoogleBusy(true);
    setErr('');
    try {
      const u = await loginWithGoogle(response.credential);
      toast.success(`Welcome, ${u.name || 'valued customer'}!`);
      router.push(redirect);
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

    const setupGoogle = () => {
      if (window.google?.accounts?.id && googleBtnContainerRef.current) {
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

    if (window.google?.accounts?.id) {
      setupGoogle();
    } else {
      const t = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(t);
          setupGoogle();
        }
      }, 300);
      return () => clearInterval(t);
    }
  }, [mode, clientId]);

  const handleManualGoogleClick = () => {
    if (!clientId) {
      toast.info(
        'Google Sign-In is configured on the app! To connect your Google project, please set your NEXT_PUBLIC_GOOGLE_CLIENT_ID in the .env file.',
        { duration: 6000 }
      );
      return;
    }
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          toast.info('Please click the Google button above to select your account.');
        }
      });
    } else {
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
        await login(cleanEmail, form.password);
        toast.success('Welcome back');
      } else {
        await register(form.name.trim(), cleanEmail, form.password);
        toast.success('Account created');
      }
      router.push(redirect);
    } catch(ex){
      setErr(ex.message);
      toast.error(ex.message);
    } finally {
      setBusy(false);
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

        <div className="border border-[#E8E8E8] rounded-2xl p-4 xs:p-6 sm:p-8 md:p-10 luxe-shadow">
          <div className="flex gap-1.5 sm:gap-2 mb-6 sm:mb-8 p-1 bg-[#FAF6EF] rounded-full w-fit mx-auto max-w-full overflow-x-auto">
            <button onClick={()=>{ setMode('login'); setFieldErrors({}); setErr(''); }} className={`px-3.5 sm:px-6 py-2 rounded-full text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.25em] uppercase transition shrink-0 ${mode==='login'?'bg-[#1A1A1A] text-white':'text-neutral-500'}`}>Sign In</button>
            <button onClick={()=>{ setMode('register'); setFieldErrors({}); setErr(''); }} className={`px-3.5 sm:px-6 py-2 rounded-full text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.25em] uppercase transition shrink-0 ${mode==='register'?'bg-[#1A1A1A] text-white':'text-neutral-500'}`}>Create Account</button>
          </div>

          <h2 className="font-display text-2xl xs:text-3xl text-center text-[#1A1A1A] font-light break-words">{mode==='login'?'Welcome back':'Join MikuMantra'}</h2>
          <div className="gold-line w-12 mx-auto my-4"/>
          <p className="text-center text-xs sm:text-sm text-neutral-500 mb-6 sm:mb-8">{mode==='login'?'Sign in to continue your journey.':'Create your account in seconds.'}</p>

          {/* Google Sign In / Sign Up Section (active when Google Client ID is configured) */}
          {Boolean(clientId) && (
            <div className="mb-6 space-y-3">
              <div ref={googleBtnContainerRef} className={`w-full flex justify-center ${googleRendered ? 'block' : 'hidden'}`} />
              
              {!googleRendered && (
                <button
                  type="button"
                  onClick={handleManualGoogleClick}
                  disabled={googleBusy || busy}
                  className="w-full py-3 px-4 border border-[#E8E8E8] rounded-full text-xs sm:text-sm font-medium text-neutral-800 hover:bg-[#FAF6EF] hover:border-[#9C6B30]/40 transition flex items-center justify-center gap-3 shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {googleBusy ? (
                    <Loader2 size={16} className="animate-spin text-[#9C6B30]" />
                  ) : (
                    <GoogleIcon className="w-5 h-5 shrink-0" />
                  )}
                  <span>{mode === 'login' ? 'Continue with Google' : 'Create account with Google'}</span>
                </button>
              )}

              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#E8E8E8]" />
                </div>
                <span className="relative bg-white px-3 text-[10px] sm:text-[11px] tracking-widest uppercase text-neutral-400">
                  or use Gmail / Email address
                </span>
              </div>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4" noValidate>
            {mode==='register' && (
              <div>
                <div className="relative">
                  <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"/>
                  <input
                    value={form.name}
                    onChange={e => {
                      setForm({...form, name: e.target.value});
                      if (fieldErrors.name) setFieldErrors(prev => ({...prev, name: ''}));
                    }}
                    placeholder="Full name"
                    className={`w-full pl-11 pr-4 py-3.5 border ${fieldErrors.name ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-full text-sm focus:outline-none focus:border-[#9C6B30]`}
                  />
                </div>
                {fieldErrors.name && <p className="text-xs text-red-500 mt-1 pl-4">{fieldErrors.name}</p>}
              </div>
            )}

            <div>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"/>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => {
                    setForm({...form, email: e.target.value});
                    if (fieldErrors.email) setFieldErrors(prev => ({...prev, email: ''}));
                  }}
                  placeholder="Gmail or Email (e.g. yourname@gmail.com)"
                  className={`w-full pl-11 pr-4 py-3.5 border ${fieldErrors.email ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-full text-sm focus:outline-none focus:border-[#9C6B30]`}
                />
              </div>
              {fieldErrors.email && <p className="text-xs text-red-500 mt-1 pl-4">{fieldErrors.email}</p>}
            </div>

            <div>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"/>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => {
                    setForm({...form, password: e.target.value});
                    if (fieldErrors.password) setFieldErrors(prev => ({...prev, password: ''}));
                  }}
                  placeholder={mode==='login'?'Password':'Create password (min 6 characters)'}
                  className={`w-full pl-11 pr-4 py-3.5 border ${fieldErrors.password ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-full text-sm focus:outline-none focus:border-[#9C6B30]`}
                />
              </div>
              {fieldErrors.password && <p className="text-xs text-red-500 mt-1 pl-4">{fieldErrors.password}</p>}
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

            <button disabled={busy} className="w-full py-3.5 sm:py-4 bg-[#1A1A1A] text-white text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] uppercase hover:bg-[#9C6B30] transition rounded-full flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer">
              {busy && <Loader2 size={14} className="animate-spin"/>}
              {mode==='login'?'Sign In with Gmail / Email':'Create Account with Gmail / Email'}
            </button>
          </form>

          <div className="text-center mt-6 text-xs text-neutral-500">
            {mode==='login' ? <>New to MikuMantra? <button onClick={()=>setMode('register')} className="text-[#9C6B30] hover:underline">Create an account</button></> : <>Already a member? <button onClick={()=>setMode('login')} className="text-[#9C6B30] hover:underline">Sign in</button></>}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage(){
  return <Suspense fallback={<div className="h-screen"/>}><LoginInner/></Suspense>;
}
