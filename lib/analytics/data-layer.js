/**
 * Safe Google Tag Manager Data Layer Utility
 * Manages window.dataLayer with strict ecommerce reset, deduplication, and PII sanitization.
 */

import { trackingConfig } from './tracking-config.js';

// In-memory cache of recently pushed event signatures to guard against double-firing
const recentEvents = new Map();
const DEDUP_WINDOW_MS = 1500;

/**
 * Clean up aged deduplication entries
 */
function purgeRecentEvents() {
  const now = Date.now();
  for (const [key, timestamp] of recentEvents.entries()) {
    if (now - timestamp > DEDUP_WINDOW_MS) {
      recentEvents.delete(key);
    }
  }
}

/**
 * Patterns of sensitive keys to scrub from dataLayer payloads
 */
const ALLOWED_ECOMMERCE_KEYS = new Set([
  'items',
  'item_id',
  'item_name',
  'item_brand',
  'item_category',
  'item_category2',
  'item_category3',
  'item_category4',
  'item_category5',
  'item_variant',
  'item_list_id',
  'item_list_name',
  'price',
  'quantity',
  'discount',
  'coupon',
  'currency',
  'value',
  'shipping',
  'shipping_tier',
  'payment_type',
  'transaction_id',
  'tax',
  'affiliation',
  'search_term',
  'page_path',
  'page_title',
  'page_location',
  'event',
  'index',
  'ecommerce',
  'consent_mode',
  'consent_preferences',
  'location_id',
]);

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /auth/i,
  /session/i,
  /credit/i,
  /cvv/i,
  /\bpin\b/i,
  /pincode/i,
  /phone/i,
  /address/i,
  /email/i,
];

/**
 * Deep sanitization function to strip PII and sensitive parameters
 */
export function sanitizePayload(data, depth = 0) {
  if (depth > 6) return null;
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizePayload(item, depth + 1));
  }

  if (typeof data === 'object') {
    const cleanObj = {};
    for (const [key, value] of Object.entries(data)) {
      // Check if key is sensitive (unless explicitly allowed as standard ecommerce schema)
      if (!ALLOWED_ECOMMERCE_KEYS.has(key)) {
        const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
        if (isSensitiveKey) {
          continue; // Omit sensitive field
        }
      }

      // Check if string value contains obvious PII like email address or JWT
      if (typeof value === 'string') {
        // Strip email addresses
        if (value.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          continue;
        }
        // Strip JWT-like tokens
        if (/^ey[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(value.trim())) {
          continue;
        }
        cleanObj[key] = value;
      } else {
        cleanObj[key] = sanitizePayload(value, depth + 1);
      }
    }
    return cleanObj;
  }

  return data;
}

/**
 * Generate a signature for deduplication
 */
function createEventSignature(eventData) {
  try {
    const eventName = eventData?.event || 'unknown';
    const ecommerce = eventData?.ecommerce || {};
    const items = Array.isArray(ecommerce?.items) ? ecommerce.items : [];
    const itemKey = items.map((i) => `${i.item_id}:${i.quantity || 1}`).join('|');
    const transactionId = ecommerce?.transaction_id || '';
    const value = ecommerce?.value || '';
    return `${eventName}:${transactionId}:${value}:${itemKey}`;
  } catch {
    return `${eventData?.event || 'event'}:${Date.now()}`;
  }
}

/**
 * Check if the event is a duplicate within the deduplication window
 */
function isDuplicate(signature) {
  purgeRecentEvents();
  const now = Date.now();
  if (recentEvents.has(signature)) {
    const lastTime = recentEvents.get(signature);
    if (now - lastTime < DEDUP_WINDOW_MS) {
      return true;
    }
  }
  recentEvents.set(signature, now);
  return false;
}

/**
 * Safely push an event to window.dataLayer
 *
 * @param {Object} payload Event payload
 * @param {Object} options Configuration options
 * @param {boolean} options.isEcommerce Whether this payload contains ecommerce data
 * @param {boolean} options.deduplicate Whether to apply deduplication protection (default: true)
 */
export function pushToDataLayer(payload, options = {}) {
  if (typeof window === 'undefined') {
    return false;
  }

  const { isEcommerce = false, deduplicate = true } = options;

  if (!payload || typeof payload !== 'object' || !payload.event) {
    if (trackingConfig.isDebug()) {
      console.warn('[DataLayer] Invalid payload pushed to dataLayer:', payload);
    }
    return false;
  }

  // Deduplication check
  if (deduplicate) {
    const signature = createEventSignature(payload);
    if (isDuplicate(signature)) {
      if (trackingConfig.isDebug()) {
        console.info('[DataLayer] Ignored duplicate event signature:', signature);
      }
      return false;
    }
  }

  // Sanitize payload from any potential PII
  const cleanPayload = sanitizePayload(payload);

  window.dataLayer = window.dataLayer || [];

  // Google GA4 Ecommerce best practice: clear previous ecommerce object before pushing a new ecommerce event
  if (isEcommerce || cleanPayload.ecommerce) {
    window.dataLayer.push({ ecommerce: null });
  }

  // Push sanitized event to dataLayer
  window.dataLayer.push(cleanPayload);

  if (trackingConfig.isDebug()) {
    console.log(`[DataLayer] Pushed: ${cleanPayload.event}`, cleanPayload);
  }

  return true;
}

/**
 * Reset ecommerce data layer state
 */
export function clearEcommerceData() {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: null });
}
