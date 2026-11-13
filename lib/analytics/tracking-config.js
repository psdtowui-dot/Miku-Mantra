/**
 * Central Analytics Configuration
 */

import { CURRENCY, DEFAULT_BRAND } from './types.js';

export const trackingConfig = {
  currency: CURRENCY,
  defaultBrand: DEFAULT_BRAND,
  get gtmId() {
    return (process.env.NEXT_PUBLIC_GTM_ID || '').trim();
  },
  get ga4MeasurementId() {
    return (process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || process.env.GA4_MEASUREMENT_ID || '').trim();
  },
  get isProduction() {
    return process.env.NODE_ENV === 'production';
  },
  isDebug() {
    if (typeof window === 'undefined') return false;
    try {
      return (
        window.location.search.includes('gtm_debug=') ||
        window.location.search.includes('debug_mode=true') ||
        window.localStorage.getItem('mikumantra_analytics_debug') === 'true'
      );
    } catch {
      return false;
    }
  },
};
