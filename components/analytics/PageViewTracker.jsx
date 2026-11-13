'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackPageView, trackScroll, trackClick } from '@/lib/analytics/events';
import { onConsentChange } from '@/lib/analytics/consent';

/**
 * Strips sensitive search parameters from URL paths to protect customer privacy
 */
function sanitizePath(pathname, searchParams) {
  if (!pathname) return '/';

  // Administrative and API paths must not be tracked as customer analytics
  if (pathname.startsWith('/admin') || pathname.startsWith('/api')) {
    return null;
  }

  // Checkout and account pages should NEVER leak tokens, IDs or customer query params
  if (
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/orders/')
  ) {
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
  const hasTrackedScroll = useRef(false);

  // 1. Route change & Page View Tracking
  useEffect(() => {
    const cleanUrl = sanitizePath(pathname, searchParams);

    // Skip excluded administrative / API routes
    if (!cleanUrl) {
      return;
    }

    // Reset scroll tracking milestone for the new page
    hasTrackedScroll.current = false;

    // Prevent duplicate tracks for the exact same URL (e.g. React Strict Mode)
    if (cleanUrl === lastTrackedUrl.current) {
      return;
    }

    lastTrackedUrl.current = cleanUrl;
    hasTrackedInitial.current = true;

    // Track page_view
    trackPageView(cleanUrl, typeof document !== 'undefined' ? document.title : '');
  }, [pathname, searchParams]);

  // 2. GA4 Scroll Depth Tracking (90% milestone per page view)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (pathname && (pathname.startsWith('/admin') || pathname.startsWith('/api'))) return;

    const handleScroll = () => {
      if (hasTrackedScroll.current) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;

      if (docHeight <= windowHeight) return;

      const scrollPercent = Math.round(((scrollTop + windowHeight) / docHeight) * 100);

      if (scrollPercent >= 90) {
        hasTrackedScroll.current = true;
        trackScroll(90);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [pathname]);

  // 3. Outbound & Critical Action Click Tracking
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (pathname && (pathname.startsWith('/admin') || pathname.startsWith('/api'))) return;

    const handleDocumentClick = (e) => {
      const link = e.target.closest('a');
      if (!link || !link.href) return;

      const href = link.href;
      const isOutbound =
        (href.startsWith('http://') || href.startsWith('https://')) &&
        !href.includes(window.location.host);
      const isAction = href.startsWith('tel:') || href.startsWith('mailto:') || href.includes('wa.me');

      if (isOutbound || isAction) {
        trackClick({
          linkUrl: href,
          linkText: (link.innerText || link.getAttribute('aria-label') || link.title || '').trim(),
          outbound: isOutbound,
          linkId: link.id || undefined,
        });
      }
    };

    document.addEventListener('click', handleDocumentClick, { passive: true });
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [pathname]);

  // 4. Listen for consent grant: if user accepts analytics on initial visit, emit the initial page view
  useEffect(() => {
    const unsubscribe = onConsentChange((prefs) => {
      if (prefs?.analytics && hasTrackedInitial.current) {
        const cleanUrl = sanitizePath(pathname, searchParams);
        if (cleanUrl) {
          trackPageView(cleanUrl, typeof document !== 'undefined' ? document.title : '');
        }
      }
    });
    return unsubscribe;
  }, [pathname, searchParams]);

  return null;
}
