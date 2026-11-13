/**
 * Google Consent Mode v2 & First-Party Consent Management Service
 * Ensures strict compliance with privacy frameworks and Google Consent Mode v2 specifications.
 */

import { CONSENT_STORAGE_KEY, CONSENT_VERSION } from './types.js';

const CONSENT_EVENT_NAME = 'mikumantra:consent-changed';
const OPEN_SETTINGS_EVENT = 'mikumantra:open-privacy-settings';

/**
 * Default initial consent state before user choice
 * All optional categories default to DENIED
 */
export const DEFAULT_CONSENT_STATE = {
  necessary: true,
  analytics: false,
  marketing: false,
};

/**
 * Check if code is running in a browser environment
 */
function isClient() {
  return typeof window !== 'undefined';
}

/**
 * Safe gtag wrapper to ensure window.dataLayer and gtag exist
 */
function safeGtag(...args) {
  if (!isClient()) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };
  window.gtag(...args);
}

/**
 * Read stored consent preferences from first-party localStorage
 */
export function getStoredConsent() {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.version === CONSENT_VERSION) {
      return {
        necessary: true, // Always true
        analytics: Boolean(parsed.analytics),
        marketing: Boolean(parsed.marketing),
        timestamp: parsed.timestamp || Date.now(),
        version: CONSENT_VERSION,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Determine if the visitor has already submitted their consent preference
 */
export function hasUserDecidedConsent() {
  return getStoredConsent() !== null;
}

/**
 * Check if analytics consent is granted
 */
export function hasAnalyticsConsent() {
  const consent = getStoredConsent();
  return Boolean(consent?.analytics);
}

/**
 * Check if marketing consent is granted
 */
export function hasMarketingConsent() {
  const consent = getStoredConsent();
  return Boolean(consent?.marketing);
}

/**
 * Convert internal consent flags to Google Consent Mode v2 dictionary
 */
export function mapToGoogleConsent(preferences) {
  const isAnalyticsGranted = Boolean(preferences?.analytics);
  const isMarketingGranted = Boolean(preferences?.marketing);

  return {
    analytics_storage: isAnalyticsGranted ? 'granted' : 'denied',
    ad_storage: isMarketingGranted ? 'granted' : 'denied',
    ad_user_data: isMarketingGranted ? 'granted' : 'denied',
    ad_personalization: isMarketingGranted ? 'granted' : 'denied',
    functionality_storage: 'granted',
    personalization_storage: isAnalyticsGranted ? 'granted' : 'denied',
    security_storage: 'granted',
  };
}

/**
 * Set Google Consent Mode v2 defaults
 * MUST be called before GTM/GA4 script initializes
 */
export function applyGoogleConsentModeDefaults() {
  if (!isClient()) return;

  const stored = getStoredConsent();
  const consentMapping = mapToGoogleConsent(stored || DEFAULT_CONSENT_STATE);

  safeGtag('consent', 'default', {
    ...consentMapping,
    wait_for_update: 500, // 500ms grace period for GTM container initialization
  });

  // Ensure dataLayer is initialized with default consent state indicator
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'default_consent_initialized',
    consent_mode: consentMapping,
  });
}

/**
 * Update Google Consent Mode v2 and persist user preferences
 */
export function updateConsent(preferences) {
  if (!isClient()) return;

  const sanitized = {
    necessary: true,
    analytics: Boolean(preferences.analytics),
    marketing: Boolean(preferences.marketing),
    timestamp: Date.now(),
    version: CONSENT_VERSION,
  };

  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.warn('[Analytics] Failed to save consent preferences to localStorage:', err);
  }

  const consentMapping = mapToGoogleConsent(sanitized);

  // Send update to Google Consent Mode v2
  safeGtag('consent', 'update', consentMapping);

  // Push update event to dataLayer so GTM triggers can react
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'consent_update',
    consent_preferences: sanitized,
    consent_mode: consentMapping,
  });

  // Dispatch custom browser event for reactive UI components
  window.dispatchEvent(
    new CustomEvent(CONSENT_EVENT_NAME, {
      detail: sanitized,
    })
  );

  return sanitized;
}

/**
 * Subscribe to consent changes across the application
 */
export function onConsentChange(callback) {
  if (!isClient() || typeof callback !== 'function') return () => {};

  const handler = (e) => {
    callback(e.detail);
  };

  window.addEventListener(CONSENT_EVENT_NAME, handler);
  return () => {
    window.removeEventListener(CONSENT_EVENT_NAME, handler);
  };
}

/**
 * Programmatically open the Privacy Settings modal from anywhere (e.g. Footer)
 */
export function openPrivacySettings() {
  if (!isClient()) return;
  window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT));
}

/**
 * Subscribe to open privacy settings requests
 */
export function onOpenPrivacySettings(callback) {
  if (!isClient() || typeof callback !== 'function') return () => {};

  const handler = () => {
    callback();
  };

  window.addEventListener(OPEN_SETTINGS_EVENT, handler);
  return () => {
    window.removeEventListener(OPEN_SETTINGS_EVENT, handler);
  };
}
