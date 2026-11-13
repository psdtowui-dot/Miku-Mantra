/**
 * Central Analytics Configuration
 * Holds container IDs, credentials, and runtime flags for GTM, GA4, and Google Ads.
 */

import { CURRENCY, DEFAULT_BRAND } from './types.js';

export const trackingConfig = {
  currency: CURRENCY,
  defaultBrand: DEFAULT_BRAND,

  /**
   * Google Tag Manager Container ID (e.g. GTM-5KLNQX63)
   */
  get gtmId() {
    return (process.env.NEXT_PUBLIC_GTM_ID || 'GTM-5KLNQX63').trim();
  },

  /**
   * Google Analytics 4 Measurement ID (e.g. G-ELMXNPCR2G)
   */
  get ga4MeasurementId() {
    return (
      process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ||
      process.env.GA4_MEASUREMENT_ID ||
      'G-ELMXNPCR2G'
    ).trim();
  },

  /**
   * Google Ads Conversion ID (AW-XXXXXXXXXX)
   */
  get googleAdsId() {
    return (process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '').trim();
  },

  /**
   * Google Ads Conversion Labels for conversion actions
   */
  get googleAdsLabels() {
    return {
      purchase: (process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL_PURCHASE || '').trim(),
      addToCart: (process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL_ADD_TO_CART || '').trim(),
      beginCheckout: (process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL_BEGIN_CHECKOUT || '').trim(),
      signUp: (process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL_SIGN_UP || '').trim(),
    };
  },

  /**
   * Production environment check
   */
  get isProduction() {
    return process.env.NODE_ENV === 'production';
  },

  /**
   * Debug mode check for GTM Preview / Tag Assistant / Local dev
   */
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
