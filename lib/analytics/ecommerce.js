/**
 * GA4 Standard E-Commerce Tracking Service for MikuMantra
 * Implements strict GA4 ecommerce payload specifications, item formatting, currency (INR),
 * and persistent transaction deduplication to prevent duplicate purchase events on page reloads.
 */

import { pushToDataLayer, clearEcommerceData } from './gtm.js';
import { CURRENCY, DEFAULT_BRAND, GA4_EVENTS } from './types.js';
import { trackingConfig } from './tracking-config.js';

const PURCHASE_TRACKED_STORAGE_KEY = 'mikumantra_tracked_purchases_v1';

/**
 * Check if a purchase transaction has already been tracked in this browser session
 *
 * @param {string} transactionId Unique order number / order ID
 * @returns {boolean}
 */
export function isPurchaseAlreadyTracked(transactionId) {
  if (typeof window === 'undefined' || !transactionId) return false;
  try {
    const raw =
      window.sessionStorage.getItem(PURCHASE_TRACKED_STORAGE_KEY) ||
      window.localStorage.getItem(PURCHASE_TRACKED_STORAGE_KEY);
    if (!raw) return false;
    const trackedList = JSON.parse(raw);
    return Array.isArray(trackedList) && trackedList.includes(String(transactionId));
  } catch {
    return false;
  }
}

/**
 * Record a transaction ID as successfully tracked to prevent double firing
 *
 * @param {string} transactionId Unique order number / order ID
 */
export function markPurchaseAsTracked(transactionId) {
  if (typeof window === 'undefined' || !transactionId) return;
  try {
    const raw =
      window.sessionStorage.getItem(PURCHASE_TRACKED_STORAGE_KEY) ||
      window.localStorage.getItem(PURCHASE_TRACKED_STORAGE_KEY) ||
      '[]';
    let trackedList = JSON.parse(raw);
    if (!Array.isArray(trackedList)) trackedList = [];
    if (!trackedList.includes(String(transactionId))) {
      trackedList.push(String(transactionId));
      if (trackedList.length > 50) trackedList = trackedList.slice(-50);
      window.sessionStorage.setItem(PURCHASE_TRACKED_STORAGE_KEY, JSON.stringify(trackedList));
      window.localStorage.setItem(PURCHASE_TRACKED_STORAGE_KEY, JSON.stringify(trackedList));
    }
  } catch (e) {
    if (trackingConfig.isDebug()) {
      console.warn('[Analytics] Could not persist purchase deduplication ID:', e);
    }
  }
}

/**
 * Format dynamic product data into standard GA4 Item schema
 *
 * @param {Object} product Product entity from catalogue, cart, or order
 * @param {Object} [options={}] Additional item options (e.g. index, list name, quantity, coupon)
 * @returns {Object|null} Normalized GA4 item
 */
export function formatItem(product, options = {}) {
  if (!product) return null;

  const price = Number(product.price) || 0;
  const quantity = Math.max(1, parseInt(options.quantity || product.qty || 1, 10));
  const mrp = Number(product.mrp) || 0;
  const discount = mrp > price ? Math.round(mrp - price) : 0;

  const item = {
    item_id: String(product.id || product._id || product.slug || product.sku || ''),
    item_name: String(product.name || '').trim(),
    item_brand: String(product.brand || DEFAULT_BRAND).trim(),
    item_category: String(product.category || '').trim(),
    price,
    quantity,
  };

  if (product.subcategory) {
    item.item_category2 = String(product.subcategory).trim();
  }

  const variant = product.metal || product.variant || product.stone;
  if (variant) {
    item.item_variant = String(variant).trim();
  }

  if (discount > 0) {
    item.discount = discount;
  }

  if (options.coupon) {
    item.coupon = String(options.coupon).trim();
  }

  if (typeof options.index === 'number') {
    item.index = options.index;
  }

  if (options.itemListName) {
    item.item_list_name = String(options.itemListName);
  }

  if (options.itemListId) {
    item.item_list_id = String(options.itemListId);
  }

  return item;
}

/**
 * Normalize an array of items for GA4 ecommerce collections
 *
 * @param {Array} products Array of product objects
 * @param {Object} [options={}] Additional item options
 * @returns {Array} Array of formatted GA4 items
 */
export function formatItems(products = [], options = {}) {
  if (!Array.isArray(products)) return [];
  return products
    .map((p, idx) =>
      formatItem(p, {
        ...options,
        index: options.index !== undefined ? options.index : idx + 1,
      })
    )
    .filter(Boolean);
}

/**
 * 1. View Item List Event (Category / Collection / Search results)
 *
 * @param {Array} products Array of product objects in the list
 * @param {string} listName Name of the listing (e.g. "Bridal Jewellery", "Search: Ring")
 * @param {string} [listId=''] Identifier of the listing
 */
export function trackViewItemList(products, listName = 'Product Listing', listId = '') {
  if (!Array.isArray(products) || products.length === 0) return;

  const items = formatItems(products.slice(0, 30), {
    itemListName: listName,
    itemListId: listId || listName.toLowerCase().replace(/\s+/g, '_'),
  });

  pushToDataLayer(
    {
      event: GA4_EVENTS.VIEW_ITEM_LIST,
      ecommerce: {
        item_list_id: listId || listName.toLowerCase().replace(/\s+/g, '_'),
        item_list_name: listName,
        items,
      },
    },
    { isEcommerce: true }
  );
}

/**
 * 2. Select Item Event (Product card click in a listing)
 *
 * @param {Object} product Clicked product
 * @param {number} [index=0] Position of the product in the listing
 * @param {string} [listName='Product Listing'] Name of the listing
 */
export function trackSelectItem(product, index = 0, listName = 'Product Listing') {
  if (!product) return;

  const item = formatItem(product, {
    index: index + 1,
    itemListName: listName,
  });

  if (!item) return;

  pushToDataLayer(
    {
      event: GA4_EVENTS.SELECT_ITEM,
      ecommerce: {
        item_list_name: listName,
        items: [item],
      },
    },
    { isEcommerce: true }
  );
}

/**
 * 3. View Item Event (Product detail page view)
 *
 * @param {Object} product Product details
 */
export function trackViewItem(product) {
  if (!product) return;

  const item = formatItem(product);
  if (!item) return;

  pushToDataLayer(
    {
      event: GA4_EVENTS.VIEW_ITEM,
      ecommerce: {
        currency: CURRENCY,
        value: item.price * (item.quantity || 1),
        items: [item],
      },
    },
    { isEcommerce: true }
  );
}

/**
 * 4. Add To Cart Event
 *
 * @param {Object} product Product added
 * @param {number} [quantity=1] Quantity added
 */
export function trackAddToCart(product, quantity = 1) {
  if (!product) return;

  const item = formatItem(product, { quantity });
  if (!item) return;

  pushToDataLayer(
    {
      event: GA4_EVENTS.ADD_TO_CART,
      ecommerce: {
        currency: CURRENCY,
        value: item.price * quantity,
        items: [item],
      },
      // Optional Google Ads conversion metadata if configured
      ...(trackingConfig.googleAdsLabels?.addToCart && {
        google_ads_conversion_label: trackingConfig.googleAdsLabels.addToCart,
      }),
    },
    { isEcommerce: true }
  );
}

/**
 * 5. Remove From Cart Event
 *
 * @param {Object} product Product removed
 * @param {number} [quantity=1] Quantity removed
 */
export function trackRemoveFromCart(product, quantity = 1) {
  if (!product) return;

  const item = formatItem(product, { quantity });
  if (!item) return;

  pushToDataLayer(
    {
      event: GA4_EVENTS.REMOVE_FROM_CART,
      ecommerce: {
        currency: CURRENCY,
        value: item.price * quantity,
        items: [item],
      },
    },
    { isEcommerce: true }
  );
}

/**
 * 6. View Cart Event
 *
 * @param {Array} cartItems Items currently in the cart
 * @param {number} [cartValue] Total subtotal value of the cart
 */
export function trackViewCart(cartItems, cartValue) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) return;

  const items = formatItems(cartItems);
  const calculatedValue =
    cartValue !== undefined
      ? Number(cartValue)
      : items.reduce((sum, i) => sum + i.price * (i.quantity || 1), 0);

  pushToDataLayer(
    {
      event: GA4_EVENTS.VIEW_CART,
      ecommerce: {
        currency: CURRENCY,
        value: Math.max(0, calculatedValue),
        items,
      },
    },
    { isEcommerce: true }
  );
}

/**
 * 7. Begin Checkout Event
 *
 * @param {Array} cartItems Items in the checkout
 * @param {number} [totalValue] Total order subtotal
 * @param {string|null} [coupon=null] Optional coupon code
 */
export function trackBeginCheckout(cartItems, totalValue, coupon = null) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) return;

  const items = formatItems(cartItems, { coupon });
  const value =
    totalValue !== undefined
      ? Number(totalValue)
      : items.reduce((sum, i) => sum + i.price * (i.quantity || 1), 0);

  const payload = {
    currency: CURRENCY,
    value: Math.max(0, value),
    items,
  };

  if (coupon) {
    payload.coupon = String(coupon).trim();
  }

  pushToDataLayer(
    {
      event: GA4_EVENTS.BEGIN_CHECKOUT,
      ecommerce: payload,
      ...(trackingConfig.googleAdsLabels?.beginCheckout && {
        google_ads_conversion_label: trackingConfig.googleAdsLabels.beginCheckout,
      }),
    },
    { isEcommerce: true }
  );
}

/**
 * 8. Add Shipping Info Event
 *
 * @param {Array} cartItems Items in checkout
 * @param {number} [totalValue] Value of cart
 * @param {string} [shippingTier='Standard Delivery'] Shipping method
 * @param {string|null} [coupon=null] Optional coupon code
 */
export function trackAddShippingInfo(
  cartItems,
  totalValue,
  shippingTier = 'Standard Delivery',
  coupon = null
) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) return;

  const items = formatItems(cartItems, { coupon });
  const value =
    totalValue !== undefined
      ? Number(totalValue)
      : items.reduce((sum, i) => sum + i.price * (i.quantity || 1), 0);

  const payload = {
    currency: CURRENCY,
    value: Math.max(0, value),
    shipping_tier: String(shippingTier),
    items,
  };

  if (coupon) {
    payload.coupon = String(coupon).trim();
  }

  pushToDataLayer(
    {
      event: GA4_EVENTS.ADD_SHIPPING_INFO,
      ecommerce: payload,
    },
    { isEcommerce: true }
  );
}

/**
 * 9. Add Payment Info Event
 *
 * @param {Array} cartItems Items in checkout
 * @param {number} [totalValue] Value of cart
 * @param {string} [paymentType='Razorpay'] Selected payment method
 * @param {string|null} [coupon=null] Optional coupon code
 */
export function trackAddPaymentInfo(
  cartItems,
  totalValue,
  paymentType = 'Razorpay',
  coupon = null
) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) return;

  const items = formatItems(cartItems, { coupon });
  const value =
    totalValue !== undefined
      ? Number(totalValue)
      : items.reduce((sum, i) => sum + i.price * (i.quantity || 1), 0);

  const payload = {
    currency: CURRENCY,
    value: Math.max(0, value),
    payment_type: String(paymentType),
    items,
  };

  if (coupon) {
    payload.coupon = String(coupon).trim();
  }

  pushToDataLayer(
    {
      event: GA4_EVENTS.ADD_PAYMENT_INFO,
      ecommerce: payload,
    },
    { isEcommerce: true }
  );
}

/**
 * 10. Purchase Event
 * Only triggered on verified backend order confirmation
 * Protected by persistent browser deduplication across reloads, redirects, and back navigation.
 *
 * @param {Object} order Confirmed order object
 * @returns {boolean} Whether the purchase event was tracked
 */
export function trackPurchase(order) {
  if (!order || !order.id) return false;

  // Never track cancelled, failed or unconfirmed orders
  if (order.status === 'cancelled' || order.paymentStatus === 'failed') {
    if (trackingConfig.isDebug()) {
      console.warn('[Analytics] Purchase tracking skipped: Order status is cancelled/failed', order);
    }
    return false;
  }

  const transactionId = String(order.orderNumber || order.id);

  // Guard against duplicate purchase firing (page refresh, gateway redirect, back button)
  if (isPurchaseAlreadyTracked(transactionId)) {
    if (trackingConfig.isDebug()) {
      console.info(`[Analytics] Purchase ${transactionId} already tracked. Skipping duplicate.`);
    }
    return false;
  }

  const items = formatItems(order.items || [], { coupon: order.coupon });
  const amounts = order.amounts || {};
  const total = Number(amounts.total || order.total || 0);
  const shipping = Number(amounts.shipping || 0);
  const tax = Number(amounts.tax || 0);

  const payload = {
    transaction_id: transactionId,
    value: total,
    currency: CURRENCY,
    shipping,
    tax,
    items,
  };

  if (order.coupon) {
    payload.coupon = String(order.coupon);
  }

  const pushed = pushToDataLayer(
    {
      event: GA4_EVENTS.PURCHASE,
      ecommerce: payload,
      ...(trackingConfig.googleAdsLabels?.purchase && {
        google_ads_conversion_label: trackingConfig.googleAdsLabels.purchase,
      }),
    },
    { isEcommerce: true, deduplicate: true }
  );

  if (pushed) {
    markPurchaseAsTracked(transactionId);
  }

  return pushed;
}

/**
 * 11. Refund Event
 *
 * @param {Object} refundData Refund confirmation data
 */
export function trackRefund(refundData) {
  if (!refundData || (!refundData.transactionId && !refundData.orderId)) return false;

  const items = formatItems(refundData.items || []);
  const payload = {
    transaction_id: String(refundData.transactionId || refundData.orderId),
    value: Number(refundData.value || refundData.refundAmount || 0),
    currency: CURRENCY,
  };

  if (items.length > 0) {
    payload.items = items;
  }

  return pushToDataLayer(
    {
      event: GA4_EVENTS.REFUND,
      ecommerce: payload,
    },
    { isEcommerce: true }
  );
}

// Aliases for compatibility
export const trackProductView = trackViewItem;
export const trackProductListView = trackViewItemList;
export const trackProductClick = trackSelectItem;
