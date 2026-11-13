'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackPageView } from '@/lib/analytics/events';
import { hasAnalyticsConsent, onConsentChange } from '@/lib/analytics/consent';

/**
 * Strips sensitive search parameters from URL paths to protect customer privacy
 */
function sanitizePath(pathname, searchParams) {
  if (!pathname) return '/';

  // Checkout and account pages should NEVER leak tokens, IDs or customer query params
  if (pathname.startsWith('/checkout') || pathname.startsWith('/account') || pathname.startsWith('/orders/')) {
    return pathname; // Just the clean route
  }

  // Allowed public query parameters that provide value to search / category analytics
  const ALLOWED_PARAMS = ['q', 'search', 'category', 'collection', 'metal', 'stone', 'page'];
  const cleanParams = new URLSearchParams();

  if (searchParams) {
    for (const [key, value] of searchParams.entries()) {
      if (ALLOWED_PARAMS.includes(key.toLowerCase()) && value) {
        cleanParams.set(key, value.slice(0, 100)); // Limit length
      }
    }
  }

  const queryStr = cleanParams.toString();
  return queryStr ? `${pathname}?${queryStr}` : pathname;
}

export default function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedUrl = useRef('');
  const hasTrackedInitial = useRef(false);

  useEffect(() => {
    const cleanUrl = sanitizePath(pathname, searchParams);

    // Prevent duplicate tracks for the same URL (e.g. React Strict Mode)
    if (cleanUrl === lastTrackedUrl.current) {
      return;
    }

    lastTrackedUrl.current = cleanUrl;
    hasTrackedInitial.current = true;

    // Track the page view
    trackPageView(cleanUrl, typeof document !== 'undefined' ? document.title : '');
  }, [pathname, searchParams]);

  // Listen for consent grant: if user accepts analytics on initial visit, emit the initial page view
  useEffect(() => {
    const unsubscribe = onConsentChange((prefs) => {
      if (prefs?.analytics && hasTrackedInitial.current) {
        const cleanUrl = sanitizePath(pathname, searchParams);
        trackPageView(cleanUrl, typeof document !== 'undefined' ? document.title : '');
      }
    });
    return unsubscribe;
  }, [pathname, searchParams]);

  return null;
}
