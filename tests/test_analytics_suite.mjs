/**
 * Comprehensive Analytics & Consent Mode v2 Test Suite
 * Validates Data Layer, GA4 event builders, Consent Mode v2, PII sanitization,
 * Persistent Purchase Deduplication, and all 17 required events.
 */

import { mapToGoogleConsent, DEFAULT_CONSENT_STATE } from '../lib/analytics/consent.js';
import { sanitizePayload, pushToDataLayer, clearEcommerceData } from '../lib/analytics/data-layer.js';
import {
  formatItem,
  formatItems,
  trackPageView,
  trackScroll,
  trackClick,
  trackProductView,
  trackViewItem,
  trackProductListView,
  trackViewItemList,
  trackProductClick,
  trackSelectItem,
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
  trackLogin,
  trackSignUp,
  isPurchaseAlreadyTracked,
  markPurchaseAsTracked,
} from '../lib/analytics/events.js';
import { trackingConfig } from '../lib/analytics/tracking-config.js';
import { sendServerAnalyticsEvent } from '../lib/analytics/measurement-protocol.js';

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

console.log('=== Running Comprehensive Analytics & Consent Management Test Suite ===\n');

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

// 4. Data Layer & All 17 Events Validation
console.log('\n4. Testing Data Layer & All 17 Events...');
{
  const mockStorage = new Map();
  const mockStorageObj = {
    getItem: (key) => mockStorage.get(key) || null,
    setItem: (key, val) => mockStorage.set(key, String(val)),
    removeItem: (key) => mockStorage.delete(key),
    clear: () => mockStorage.clear(),
  };

  // Setup mock window, storage and document
  global.window = {
    dataLayer: [],
    location: {
      origin: 'https://mikumantra.com',
      pathname: '/shop',
      href: 'https://mikumantra.com/shop',
      search: '',
    },
    sessionStorage: mockStorageObj,
    localStorage: mockStorageObj,
  };
  global.document = {
    title: 'MikuMantra Fine Jewellery',
  };

  const testProduct = {
    id: 'ring-101',
    name: 'Emerald Cut Ring',
    price: 55000,
    category: 'Rings',
  };

  // 1. page_view
  window.dataLayer = [];
  trackPageView('/shop', 'Jewellery Shop');
  const pageViewEvent = window.dataLayer.find((e) => e.event === 'page_view');
  assert(Boolean(pageViewEvent), '1. page_view event pushed');
  assert(pageViewEvent.page_path === '/shop', 'page_path matches');

  // Admin route exclusion
  const preLenAdmin = window.dataLayer.length;
  trackPageView('/admin/orders', 'Admin Orders');
  assert(window.dataLayer.length === preLenAdmin, 'Admin route page_view excluded');

  // 2. scroll
  window.dataLayer = [];
  trackScroll(90);
  const scrollEvent = window.dataLayer.find((e) => e.event === 'scroll');
  assert(Boolean(scrollEvent), '2. scroll event pushed');
  assert(scrollEvent.percent_scrolled === 90, 'percent_scrolled is 90');

  // 3. click
  window.dataLayer = [];
  trackClick({ linkUrl: 'https://wa.me/919999999999', linkText: 'Chat on WhatsApp', outbound: true });
  const clickEvent = window.dataLayer.find((e) => e.event === 'click');
  assert(Boolean(clickEvent), '3. click event pushed');
  assert(clickEvent.link_url === 'https://wa.me/919999999999', 'click link_url matches');
  assert(clickEvent.outbound === true, 'click outbound is true');

  // 4. search
  window.dataLayer = [];
  trackSearch('diamond earrings');
  const searchEvent = window.dataLayer.find((e) => e.event === 'search');
  assert(Boolean(searchEvent), '4. search event pushed');
  assert(searchEvent.search_term === 'diamond earrings', 'search_term matches');

  // 5. view_item_list
  window.dataLayer = [];
  trackViewItemList([testProduct], 'Bridal Collection', 'cat_bridal');
  const viewItemListEvent = window.dataLayer.find((e) => e.event === 'view_item_list');
  assert(Boolean(viewItemListEvent), '5. view_item_list event pushed');
  assert(viewItemListEvent.ecommerce.item_list_name === 'Bridal Collection', 'item_list_name matches');
  assert(viewItemListEvent.ecommerce.items.length === 1, 'items array present');

  // 6. select_item
  window.dataLayer = [];
  trackSelectItem(testProduct, 0, 'Bridal Collection');
  const selectItemEvent = window.dataLayer.find((e) => e.event === 'select_item');
  assert(Boolean(selectItemEvent), '6. select_item event pushed');
  assert(selectItemEvent.ecommerce.items[0].item_id === 'ring-101', 'select_item item_id matches');

  // 7. view_item
  window.dataLayer = [];
  trackViewItem(testProduct);
  assert(window.dataLayer[0].ecommerce === null, 'ecommerce: null reset before view_item');
  const viewItemEvent = window.dataLayer.find((e) => e.event === 'view_item');
  assert(Boolean(viewItemEvent), '7. view_item event pushed');
  assert(viewItemEvent.ecommerce.currency === 'INR', 'Currency is INR');
  assert(viewItemEvent.ecommerce.items[0].item_id === 'ring-101', 'Item ID in dataLayer');

  // 8. add_to_cart
  window.dataLayer = [];
  trackAddToCart(testProduct, 3);
  const addToCartEvent = window.dataLayer.find((e) => e.event === 'add_to_cart');
  assert(Boolean(addToCartEvent), '8. add_to_cart event pushed');
  assert(addToCartEvent.ecommerce.value === 165000, 'add_to_cart value is 165000');
  assert(addToCartEvent.ecommerce.items[0].quantity === 3, 'add_to_cart quantity is 3');

  // 9. remove_from_cart
  window.dataLayer = [];
  trackRemoveFromCart(testProduct, 1);
  const removeFromCartEvent = window.dataLayer.find((e) => e.event === 'remove_from_cart');
  assert(Boolean(removeFromCartEvent), '9. remove_from_cart event pushed');
  assert(removeFromCartEvent.ecommerce.value === 55000, 'remove_from_cart value is 55000');

  // 10. view_cart
  window.dataLayer = [];
  trackViewCart([testProduct], 55000);
  const viewCartEvent = window.dataLayer.find((e) => e.event === 'view_cart');
  assert(Boolean(viewCartEvent), '10. view_cart event pushed');
  assert(viewCartEvent.ecommerce.value === 55000, 'view_cart value correct');

  // 11. begin_checkout
  window.dataLayer = [];
  trackBeginCheckout([testProduct], 55000, 'GOLD10');
  const checkoutEvent = window.dataLayer.find((e) => e.event === 'begin_checkout');
  assert(Boolean(checkoutEvent), '11. begin_checkout event pushed');
  assert(checkoutEvent.ecommerce.coupon === 'GOLD10', 'begin_checkout coupon parameter present');

  // 12. add_shipping_info
  window.dataLayer = [];
  trackAddShippingInfo([testProduct], 55000, 'Complimentary Insured Delivery');
  const shippingEvent = window.dataLayer.find((e) => e.event === 'add_shipping_info');
  assert(Boolean(shippingEvent), '12. add_shipping_info event pushed');
  assert(shippingEvent.ecommerce.shipping_tier === 'Complimentary Insured Delivery', 'shipping_tier present');

  // 13. add_payment_info
  window.dataLayer = [];
  trackAddPaymentInfo([testProduct], 55000, 'Razorpay');
  const paymentEvent = window.dataLayer.find((e) => e.event === 'add_payment_info');
  assert(Boolean(paymentEvent), '13. add_payment_info event pushed');
  assert(paymentEvent.ecommerce.payment_type === 'Razorpay', 'payment_type parameter present');

  // 14. purchase (with Persistent Deduplication)
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
  const firstPurchaseRes = trackPurchase(mockOrder);
  assert(firstPurchaseRes === true, '14. purchase event tracked successfully');
  const purchaseEvent = window.dataLayer.find((e) => e.event === 'purchase');
  assert(Boolean(purchaseEvent), 'purchase event found in dataLayer');
  assert(purchaseEvent.ecommerce.transaction_id === 'MIK-98765432-100', 'transaction_id is orderNumber');
  assert(purchaseEvent.ecommerce.value === 51500, 'purchase value matches total');
  assert(purchaseEvent.ecommerce.tax === 1500, 'purchase tax matches');
  assert(purchaseEvent.ecommerce.coupon === 'GOLD10', 'purchase coupon matches');

  // Test persistent deduplication (e.g. reload or redirect)
  const duplicatePurchaseRes = trackPurchase(mockOrder);
  assert(duplicatePurchaseRes === false, 'Persistent deduplication blocked duplicate purchase event');

  // Test cancelled / failed order exclusion
  const cancelledOrder = { ...mockOrder, id: 'ord_fail', orderNumber: 'MIK-CANCELLED', status: 'cancelled' };
  assert(trackPurchase(cancelledOrder) === false, 'Cancelled order rejected from purchase tracking');

  // 15. refund
  window.dataLayer = [];
  trackRefund({
    transactionId: 'MIK-98765432-100',
    refundAmount: 51500,
    items: [testProduct],
  });
  const refundEvent = window.dataLayer.find((e) => e.event === 'refund');
  assert(Boolean(refundEvent), '15. refund event pushed');
  assert(refundEvent.ecommerce.transaction_id === 'MIK-98765432-100', 'refund transaction_id matches');
  assert(refundEvent.ecommerce.value === 51500, 'refund value matches');

  // 16. sign_up
  window.dataLayer = [];
  trackSignUp('Email');
  const signUpEvent = window.dataLayer.find((e) => e.event === 'sign_up');
  assert(Boolean(signUpEvent), '16. sign_up event pushed');
  assert(signUpEvent.method === 'Email', 'sign_up method is Email');

  // 17. login
  window.dataLayer = [];
  trackLogin('Google');
  const loginEvent = window.dataLayer.find((e) => e.event === 'login');
  assert(Boolean(loginEvent), '17. login event pushed');
  assert(loginEvent.method === 'Google', 'login method is Google');
}

// 5. Server-Side Measurement Protocol & Idempotency Tests
console.log('\n5. Testing Server-Side Measurement Protocol & Idempotency...');
{
  const mockStore = new Map();
  const mockDb = {
    collection: () => ({
      findOne: async (query) => {
        const key = `${query.transactionId}_${query.eventName}_${query.status}`;
        return mockStore.get(key) || null;
      },
      updateOne: async (filter, update) => {
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

  const unconfiguredRes = await sendServerAnalyticsEvent({
    db: mockDb,
    eventName: 'purchase',
    transactionId: 'MIK-TEST-001',
    eventParams: { value: 10000, currency: 'INR' },
  });
  assert(unconfiguredRes.success === false, 'Handles unconfigured GA4 secret safely');
  assert(unconfiguredRes.reason === 'unconfigured_credentials', 'Identified unconfigured credentials');

  const outboxDoc = mockStore.get('evt_purchase_MIK-TEST-001');
  assert(Boolean(outboxDoc), 'Event recorded in analytics_events collection for outbox logging');

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
