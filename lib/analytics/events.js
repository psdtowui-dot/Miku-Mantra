/**
 * Centralized Google Analytics 4 (GA4) Event Service
 * Generates strongly typed, fully validated, and standardized GA4 events for MikuMantra.
 *
 * Implements:
 * - page_view
 * - scroll
 * - click
 * - search
 * - sign_up
 * - login
 * - add_to_wishlist
 * - Re-exports all GA4 ecommerce events from ./ecommerce.js
 */

import { pushToDataLayer, clearEcommerceData } from './gtm.js';
import { CURRENCY, GA4_EVENTS } from './types.js';
import { trackingConfig } from './tracking-config.js';
import { formatItem } from './ecommerce.js';

// Re-export all ecommerce functions and helpers for 100% backward compatibility
export {
  formatItem,
  formatItems,
  trackViewItem,
  trackProductView,
  trackViewItemList,
  trackProductListView,
  trackSelectItem,
  trackProductClick,
  trackAddToCart,
  trackRemoveFromCart,
  trackViewCart,
  trackBeginCheckout,
  trackAddShippingInfo,
  trackAddPaymentInfo,
  trackPurchase,
  trackRefund,
  isPurchaseAlreadyTracked,
  markPurchaseAsTracked,
} from './ecommerce.js';

export { pushToDataLayer, clearEcommerceData };

/**
 * 1. Page View Event
 *
 * @param {string} [pagePath] Clean URL path (e.g. /shop, /product/gold-necklace)
 * @param {string} [pageTitle] Document title
 */
export function trackPageView(pagePath, pageTitle) {
  if (typeof window === 'undefined') return false;

  const cleanPath = (pagePath || window.location.pathname).split('?')[0];

  // Exclude administrative routes from analytics
  if (cleanPath.startsWith('/admin') || cleanPath.startsWith('/api')) {
    return false;
  }

  return pushToDataLayer(
    {
      event: GA4_EVENTS.PAGE_VIEW,
      page_location: `${window.location.origin}${cleanPath}`,
      page_path: cleanPath,
      page_title: pageTitle || (typeof document !== 'undefined' ? document.title : '') || 'MikuMantra Fine Jewellery',
    },
    { isEcommerce: false, deduplicate: true }
  );
}

/**
 * 2. Scroll Depth Event (GA4 Standard 90% depth milestone)
 *
 * @param {number} [percentScrolled=90] Percentage of page scrolled
 */
export function trackScroll(percentScrolled = 90) {
  if (typeof window === 'undefined') return false;

  const path = window.location.pathname;
  if (path.startsWith('/admin') || path.startsWith('/api')) {
    return false;
  }

  return pushToDataLayer(
    {
      event: GA4_EVENTS.SCROLL,
      percent_scrolled: percentScrolled,
      page_location: window.location.href,
      page_path: path,
    },
    { isEcommerce: false, deduplicate: true }
  );
}

/**
 * 3. Outbound / CTA Click Event
 *
 * @param {Object} options Click parameters
 * @param {string} options.linkUrl Target URL
 * @param {string} [options.linkText] Text or label of clicked element
 * @param {boolean} [options.outbound=false] Whether link points off-site
 * @param {string} [options.linkId] Optional ID of clicked element
 */
export function trackClick({ linkUrl, linkText = '', outbound = false, linkId = '' }) {
  if (!linkUrl || typeof window === 'undefined') return false;

  const path = window.location.pathname;
  if (path.startsWith('/admin') || path.startsWith('/api')) {
    return false;
  }

  return pushToDataLayer(
    {
      event: GA4_EVENTS.CLICK,
      link_url: linkUrl,
      link_text: String(linkText).slice(0, 100),
      link_id: linkId ? String(linkId).slice(0, 100) : undefined,
      outbound: Boolean(outbound),
      page_location: window.location.href,
      page_path: path,
    },
    { isEcommerce: false, deduplicate: true }
  );
}

/**
 * 4. Search Event
 *
 * @param {string} searchTerm Query string entered by customer
 */
export function trackSearch(searchTerm) {
  const query = (searchTerm || '').trim();
  if (!query) return false;

  return pushToDataLayer(
    {
      event: GA4_EVENTS.SEARCH,
      search_term: query,
    },
    { isEcommerce: false, deduplicate: true }
  );
}

/**
 * 5. Sign Up Event
 *
 * @param {string} [method='Email'] Registration method ('Email' | 'Google' | 'Phone')
 */
export function trackSignUp(method = 'Email') {
  return pushToDataLayer(
    {
      event: GA4_EVENTS.SIGN_UP,
      method: String(method),
      ...(trackingConfig.googleAdsLabels?.signUp && {
        google_ads_conversion_label: trackingConfig.googleAdsLabels.signUp,
      }),
    },
    { isEcommerce: false, deduplicate: true }
  );
}

/**
 * 6. Login Event
 *
 * @param {string} [method='Email'] Login method ('Email' | 'Google' | 'Phone')
 */
export function trackLogin(method = 'Email') {
  return pushToDataLayer(
    {
      event: GA4_EVENTS.LOGIN,
      method: String(method),
    },
    { isEcommerce: false, deduplicate: true }
  );
}

/**
 * 7. Add To Wishlist Event
 *
 * @param {Object} product Product added to wishlist
 */
export function trackAddToWishlist(product) {
  if (!product) return false;

  const item = formatItem(product);
  if (!item) return false;

  return pushToDataLayer(
    {
      event: GA4_EVENTS.ADD_TO_WISHLIST,
      ecommerce: {
        currency: CURRENCY,
        value: item.price,
        items: [item],
      },
    },
    { isEcommerce: true }
  );
}

/**
 * 8. Generate Lead Event (Newsletter Subscription, Concierge Inquiry, Appointment Request)
 *
 * @param {Object} [options={}]
 * @param {string} [options.leadType='Newsletter'] Category/source of lead
 * @param {number} [options.value=0] Optional value of lead
 * @param {string} [options.currency=CURRENCY] Currency code
 */
export function trackGenerateLead(options = {}) {
  const { leadType = 'Newsletter', value = 0, currency = CURRENCY } = options;

  return pushToDataLayer(
    {
      event: GA4_EVENTS.GENERATE_LEAD,
      lead_type: String(leadType),
      value: Number(value) || 0,
      currency: String(currency || CURRENCY),
    },
    { isEcommerce: false, deduplicate: true }
  );
}
