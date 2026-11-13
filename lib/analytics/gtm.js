/**
 * Google Tag Manager (GTM) Core Client Utility
 * Provides safe container loading, window.dataLayer dispatching, ecommerce resets, and PII protection.
 */

import { trackingConfig } from './tracking-config.js';
import { sanitizePayload } from './data-layer.js';

// In-memory deduplication cache
const recentEvents = new Map();
const DEDUP_WINDOW_MS = 1500;

function purgeRecentEvents() {
  const now = Date.now();
  for (const [key, timestamp] of recentEvents.entries()) {
    if (now - timestamp > DEDUP_WINDOW_MS) {
      recentEvents.delete(key);
    }
  }
}

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
 * Returns the effective GTM Container ID
 */
export function getGtmId() {
  return trackingConfig.gtmId;
}

/**
 * Checks if GTM script has executed in the browser
 */
export function isGtmLoaded() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.google_tag_manager && window.google_tag_manager[getGtmId()]);
}

/**
 * Resets the GA4 ecommerce object in the dataLayer to prevent parameter leakage
 */
export function clearEcommerceData() {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: null });
}

/**
 * Safely push an event to window.dataLayer
 *
 * @param {Object} payload Event payload
 * @param {Object} [options]
 * @param {boolean} [options.isEcommerce=false] Whether payload contains ecommerce data
 * @param {boolean} [options.deduplicate=true] Whether to apply rapid duplicate guard
 * @returns {boolean} Whether the event was successfully pushed
 */
export function pushToDataLayer(payload, options = {}) {
  if (typeof window === 'undefined') {
    return false;
  }

  const { isEcommerce = false, deduplicate = true } = options;

  if (!payload || typeof payload !== 'object' || !payload.event) {
    if (trackingConfig.isDebug()) {
      console.warn('[GTM] Invalid payload pushed to dataLayer:', payload);
    }
    return false;
  }

  // Deduplication check
  if (deduplicate) {
    const signature = createEventSignature(payload);
    if (isDuplicate(signature)) {
      if (trackingConfig.isDebug()) {
        console.info('[GTM] Ignored duplicate event signature:', signature);
      }
      return false;
    }
  }

  // Sanitize payload from any potential PII (emails, passwords, tokens, phones, addresses)
  const cleanPayload = sanitizePayload(payload);

  window.dataLayer = window.dataLayer || [];

  // Google GA4 Ecommerce best practice: clear previous ecommerce object before pushing a new ecommerce event
  if (isEcommerce || cleanPayload.ecommerce) {
    window.dataLayer.push({ ecommerce: null });
  }

  // Push sanitized event to dataLayer
  window.dataLayer.push(cleanPayload);

  if (trackingConfig.isDebug()) {
    console.log(`[GTM] Pushed: ${cleanPayload.event}`, cleanPayload);
  }

  return true;
}

/**
 * Send a generic custom event to GTM
 *
 * @param {string} eventName Name of the custom event
 * @param {Object} [params={}] Additional parameters
 */
export function sendCustomEvent(eventName, params = {}) {
  if (!eventName) return false;
  return pushToDataLayer({
    event: eventName,
    ...params,
  });
}
