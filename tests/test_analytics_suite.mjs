/**
 * Comprehensive Analytics & Consent Mode v2 Test Suite
 * Validates Data Layer, GA4 event builders, Consent Mode v2, PII sanitization, and Deduplication.
 */

import { mapToGoogleConsent, DEFAULT_CONSENT_STATE } from '../lib/analytics/consent.js';
import { sanitizePayload, pushToDataLayer, clearEcommerceData } from '../lib/analytics/data-layer.js';
import {
  formatItem,
  formatItems,
  trackPageView,
  trackProductView,
  trackProductListView,
  trackProductClick,
  trackAddToCart,
  trackRemoveFromCart,
  trackViewCart,
  trackAddToWishlist,
  trackBeginCheckout,
  trackAddShippingInfo,
  trackAddPaymentInfo,
  trackPurchase,
  trackRefund,
  trackSearch,
} from '../lib/analytics/events.js';
import { sendServerAnalyticsEvent, trackServerPurchase, trackServerRefund } from '../lib/analytics/measurement-protocol.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('=== Running Analytics & Consent Management Test Suite ===\n');

// 1. Google Consent Mode v2 Mapping Tests
console.log('1. Testing Google Consent Mode v2 Mappings...');
{
  const defaultMapping = mapToGoogleConsent(DEFAULT_CONSENT_STATE);
  assert(defaultMapping.analytics_storage === 'denied', 'Default analytics_storage is denied');
  assert(defaultMapping.ad_storage === 'denied', 'Default ad_storage is denied');
  assert(defaultMapping.ad_user_data === 'denied', 'Default ad_user_data is denied');
  assert(defaultMapping.ad_personalization === 'denied', 'Default ad_personalization is denied');
  assert(defaultMapping.security_storage === 'granted', 'Security storage is granted');
  assert(defaultMapping.functionality_storage === 'granted', 'Functionality storage is granted');

  const analyticsOnly = mapToGoogleConsent({ necessary: true, analytics: true, marketing: false });
  assert(analyticsOnly.analytics_storage === 'granted', 'Analytics-only sets analytics_storage to granted');
  assert(analyticsOnly.ad_storage === 'denied', 'Analytics-only keeps ad_storage denied');
  assert(analyticsOnly.ad_user_data === 'denied', 'Analytics-only keeps ad_user_data denied');

  const marketingOnly = mapToGoogleConsent({ necessary: true, analytics: false, marketing: true });
  assert(marketingOnly.analytics_storage === 'denied', 'Marketing-only keeps analytics_storage denied');
  assert(marketingOnly.ad_storage === 'granted', 'Marketing-only sets ad_storage to granted');
  assert(marketingOnly.ad_user_data === 'granted', 'Marketing-only sets ad_user_data to granted');

  const allAccepted = mapToGoogleConsent({ necessary: true, analytics: true, marketing: true });
  assert(allAccepted.analytics_storage === 'granted', 'Accept-all sets analytics_storage granted');
  assert(allAccepted.ad_storage === 'granted', 'Accept-all sets ad_storage granted');
  assert(allAccepted.ad_user_data === 'granted', 'Accept-all sets ad_user_data granted');
  assert(allAccepted.ad_personalization === 'granted', 'Accept-all sets ad_personalization granted');
}

// 2. PII Sanitization Tests
console.log('\n2. Testing PII & Sensitive Data Sanitization...');
{
  const dirtyData = {
    event: 'test_event',
    userEmail: 'customer@example.com',
    password: 'supersecretpassword123',
    authToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDcSemACt8x4iTMCda8Yhe3iZaWbvV5XKSTbuAn0M',
    phoneNumber: '+919876543210',
    shippingAddress: {
      line1: '123 Heritage Palace',
      city: 'Jaipur',
      pincode: '302001',
    },
    ecommerce: {
      currency: 'INR',
      value: 45000,
      customerPhone: '9876543210',
      items: [
        {
          item_id: 'prod_123',
          item_name: 'Polki Diamond Choker',
          price: 45000,
        },
      ],
    },
  };

  const clean = sanitizePayload(dirtyData);
  assert(clean.userEmail === undefined, 'Scrubbed userEmail');
  assert(clean.password === undefined, 'Scrubbed password');
  assert(clean.authToken === undefined, 'Scrubbed authToken');
  assert(clean.phoneNumber === undefined, 'Scrubbed phoneNumber');
  assert(clean.shippingAddress === undefined, 'Scrubbed shippingAddress');
  assert(clean.ecommerce.customerPhone === undefined, 'Scrubbed nested customerPhone');
  assert(clean.ecommerce.value === 45000, 'Preserved non-PII ecommerce value');
  assert(clean.ecommerce.items[0].item_name === 'Polki Diamond Choker', 'Preserved non-PII item_name');
}

// 3. Item Normalization Tests
console.log('\n3. Testing Item Normalization Schema...');
{
  const rawProduct = {
    id: 'prod_99',
    slug: 'solitaire-gold-ring',
    name: 'Solitaire Gold Ring',
    price: 32000,
    mrp: 38000,
    category: 'Rings',
    subcategory: 'Solitaire',
    metal: '22K Yellow Gold',
  };

  const item = formatItem(rawProduct, { quantity: 2, index: 1 });
  assert(item.item_id === 'prod_99', 'Item ID mapped correctly');
  assert(item.item_name === 'Solitaire Gold Ring', 'Item name mapped correctly');
  assert(item.price === 32000, 'Price mapped correctly');
  assert(item.quantity === 2, 'Quantity mapped correctly');
  assert(item.discount === 6000, 'Discount computed correctly from MRP');
  assert(item.item_category === 'Rings', 'Category mapped');
  assert(item.item_category2 === 'Solitaire', 'Subcategory mapped');
  assert(item.item_variant === '22K Yellow Gold', 'Variant mapped from metal');
  assert(item.index === 1, 'Index mapped');
}

// 4. Data Layer & Mock Browser Environment Tests
console.log('\n4. Testing Data Layer & Ecommerce Reset...');
{
  // Setup mock window and dataLayer
  global.window = {
    dataLayer: [],
    location: {
      origin: 'https://mikumantra.com',
      pathname: '/shop',
      search: '',
    },
  };
  global.document = {
    title: 'MikuMantra Fine Jewellery',
  };

  // Test push to dataLayer
  const testProduct = {
    id: 'ring-101',
    name: 'Emerald Cut Ring',
    price: 55000,
    category: 'Rings',
  };

  // Track product view
  trackProductView(testProduct);

  // Verify that ecommerce was cleared before pushing
  assert(window.dataLayer.length >= 2, 'Pushed reset and view_item event');
  assert(window.dataLayer[0].ecommerce === null, 'First push clears ecommerce state (ecommerce: null)');
  assert(window.dataLayer[1].event === 'view_item', 'Second push contains view_item event');
  assert(window.dataLayer[1].ecommerce.currency === 'INR', 'Currency is INR');
  assert(window.dataLayer[1].ecommerce.items[0].item_id === 'ring-101', 'Item ID in dataLayer');

  // Test deduplication: immediate duplicate trackProductView should be dropped
  const preLen = window.dataLayer.length;
  trackProductView(testProduct);
  assert(window.dataLayer.length === preLen, 'Deduplication prevented rapid duplicate event');

  // Clear dataLayer for subsequent tests
  window.dataLayer = [];

  // Test Add to Cart
  trackAddToCart(testProduct, 3);
  const addToCartEvent = window.dataLayer.find((e) => e.event === 'add_to_cart');
  assert(Boolean(addToCartEvent), 'add_to_cart event pushed');
  assert(addToCartEvent.ecommerce.value === 165000, 'add_to_cart calculated value is price * qty (165000)');
  assert(addToCartEvent.ecommerce.items[0].quantity === 3, 'add_to_cart quantity is 3');

  // Test View Cart
  window.dataLayer = [];
  trackViewCart([testProduct], 55000);
  const viewCartEvent = window.dataLayer.find((e) => e.event === 'view_cart');
  assert(Boolean(viewCartEvent), 'view_cart event pushed');
  assert(viewCartEvent.ecommerce.value === 55000, 'view_cart value correct');

  // Test Begin Checkout
  window.dataLayer = [];
  trackBeginCheckout([testProduct], 55000, 'GOLD10');
  const checkoutEvent = window.dataLayer.find((e) => e.event === 'begin_checkout');
  assert(Boolean(checkoutEvent), 'begin_checkout event pushed');
  assert(checkoutEvent.ecommerce.coupon === 'GOLD10', 'begin_checkout coupon parameter present');

  // Test Add Shipping Info
  window.dataLayer = [];
  trackAddShippingInfo([testProduct], 55000, 'Complimentary Insured Delivery');
  const shippingEvent = window.dataLayer.find((e) => e.event === 'add_shipping_info');
  assert(Boolean(shippingEvent), 'add_shipping_info event pushed');
  assert(shippingEvent.ecommerce.shipping_tier === 'Complimentary Insured Delivery', 'shipping_tier parameter present');

  // Test Add Payment Info
  window.dataLayer = [];
  trackAddPaymentInfo([testProduct], 55000, 'Razorpay');
  const paymentEvent = window.dataLayer.find((e) => e.event === 'add_payment_info');
  assert(Boolean(paymentEvent), 'add_payment_info event pushed');
  assert(paymentEvent.ecommerce.payment_type === 'Razorpay', 'payment_type parameter present');

  // Test Purchase Event
  window.dataLayer = [];
  const mockOrder = {
    id: 'ord_12345',
    orderNumber: 'MIK-98765432-100',
    amounts: {
      subtotal: 55000,
      discount: 5000,
      shipping: 0,
      tax: 1500,
      total: 51500,
    },
    items: [testProduct],
    coupon: 'GOLD10',
  };
  trackPurchase(mockOrder);
  const purchaseEvent = window.dataLayer.find((e) => e.event === 'purchase');
  assert(Boolean(purchaseEvent), 'purchase event pushed');
  assert(purchaseEvent.ecommerce.transaction_id === 'MIK-98765432-100', 'transaction_id is orderNumber');
  assert(purchaseEvent.ecommerce.value === 51500, 'purchase value matches total');
  assert(purchaseEvent.ecommerce.tax === 1500, 'purchase tax matches');
  assert(purchaseEvent.ecommerce.coupon === 'GOLD10', 'purchase coupon matches');

  // Test Search Event
  window.dataLayer = [];
  trackSearch('diamond earrings');
  const searchEvent = window.dataLayer.find((e) => e.event === 'search');
  assert(Boolean(searchEvent), 'search event pushed');
  assert(searchEvent.search_term === 'diamond earrings', 'search_term matches');
}

// 5. Server-Side Measurement Protocol & Idempotency Tests
console.log('\n5. Testing Server-Side Measurement Protocol & Idempotency...');
{
  const mockStore = new Map();
  const mockDb = {
    collection: (name) => ({
      findOne: async (query) => {
        const key = `${query.transactionId}_${query.eventName}_${query.status}`;
        return mockStore.get(key) || null;
      },
      updateOne: async (filter, update, options) => {
        const docId = filter.id;
        const current = mockStore.get(docId) || {};
        const merged = { ...current, ...(update.$set || {}) };
        mockStore.set(docId, merged);
        if (merged.transactionId && merged.eventName && merged.status) {
          mockStore.set(`${merged.transactionId}_${merged.eventName}_${merged.status}`, merged);
        }
        return { modifiedCount: 1, upsertedCount: 1 };
      },
    }),
  };

  // Test 1: Graceful unconfigured credentials handling without crash
  const unconfiguredRes = await sendServerAnalyticsEvent({
    db: mockDb,
    eventName: 'purchase',
    transactionId: 'MIK-TEST-001',
    eventParams: { value: 10000, currency: 'INR' },
  });
  assert(unconfiguredRes.success === false, 'Handles unconfigured GA4 secret safely');
  assert(unconfiguredRes.reason === 'unconfigured_credentials', 'Identified unconfigured credentials');

  // Verify record written to outbox
  const outboxDoc = mockStore.get('evt_purchase_MIK-TEST-001');
  assert(Boolean(outboxDoc), 'Event recorded in analytics_events collection for outbox logging');

  // Test 2: Idempotency check
  // Simulate previous successful transmission in DB
  mockStore.set('MIK-TEST-002_purchase_sent', { transactionId: 'MIK-TEST-002', eventName: 'purchase', status: 'sent' });
  const duplicateRes = await sendServerAnalyticsEvent({
    db: mockDb,
    eventName: 'purchase',
    transactionId: 'MIK-TEST-002',
    eventParams: { value: 20000, currency: 'INR' },
  });
  assert(duplicateRes.success === true, 'Duplicate check succeeds');
  assert(duplicateRes.skipped === true, 'Duplicate check skipped transmission due to prior transmission');
  assert(duplicateRes.reason === 'already_sent', 'Reason confirms already_sent');
}

console.log(`\n=== Suite Completed: ${passed} passed, ${failed} failed ===`);

if (failed > 0) {
  process.exit(1);
}
