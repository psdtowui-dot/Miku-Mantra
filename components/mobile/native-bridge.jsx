'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { isNative, initStatusBar, hideSplashScreen, registerPushNotifications } from '@/lib/native-utils';
import { WifiOff, RefreshCw } from 'lucide-react';

export default function NativeBridge() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // 1. Initialize native status bar & splash screen
    initStatusBar();
    hideSplashScreen();
    registerPushNotifications();

    // 2. Android Hardware Back Button Handling
    let backListener = null;
    if (isNative()) {
      App.addListener('backButton', ({ canGoBack }) => {
        // If on homepage or root, exit/minimize
        if (pathname === '/' || pathname === '/admin') {
          App.exitApp();
        } else {
          // Navigate back in history
          router.back();
        }
      }).then(l => { backListener = l; });
    }

    // 3. Deep Linking (App Links & custom scheme)
    let urlListener = null;
    if (isNative()) {
      App.addListener('appUrlOpen', (event) => {
        try {
          const url = new URL(event.url);
          const targetPath = url.pathname + url.search;
          if (targetPath) {
            router.push(targetPath);
          }
        } catch (e) {
          // If custom scheme mikumantra://path
          const raw = event.url.replace(/^mikumantra:\/\/?/, '/');
          if (raw) router.push(raw);
        }
      }).then(l => { urlListener = l; });
    }

    // 4. Network Status Monitoring
    const handleNetworkChange = (status) => {
      setIsOnline(status.connected);
    };

    if (isNative()) {
      Network.getStatus().then(status => setIsOnline(status.connected));
      Network.addListener('networkStatusChange', handleNetworkChange);
    } else if (typeof window !== 'undefined') {
      window.addEventListener('online', () => setIsOnline(true));
      window.addEventListener('offline', () => setIsOnline(false));
      setIsOnline(navigator.onLine);
    }

    return () => {
      if (backListener) backListener.remove();
      if (urlListener) urlListener.remove();
    };
  }, [pathname, router]);

  const handleRetry = async () => {
    setIsRetrying(true);
    if (isNative()) {
      const status = await Network.getStatus();
      setIsOnline(status.connected);
    } else {
      setIsOnline(navigator.onLine);
    }
    setTimeout(() => {
      setIsRetrying(false);
      if (isOnline) window.location.reload();
    }, 800);
  };

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[9999] bg-[#1A1A1A] text-white p-4 rounded-xl shadow-2xl border border-neutral-700/60 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom duration-300">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0">
          <WifiOff className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-medium tracking-wide uppercase text-neutral-200">No Internet Connection</h4>
          <p className="text-[11px] text-neutral-400">Please check your mobile network or Wi-Fi.</p>
        </div>
      </div>
      <button
        onClick={handleRetry}
        disabled={isRetrying}
        className="px-3.5 py-1.5 bg-[#FAF6EF] text-[#1A1A1A] text-xs font-medium rounded-lg hover:bg-white transition-colors flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
        <span>Retry</span>
      </button>
    </div>
  );
}
