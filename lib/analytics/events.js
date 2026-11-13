/**
 * Centralized Google Analytics 4 (GA4) E-Commerce Event Service
 * Generates strongly typed, fully validated, and standardized GA4 ecommerce events for MikuMantra.
 */

import { pushToDataLayer } from './data-layer.js';
import { CURRENCY, DEFAULT_BRAND, GA4_EVENTS } from './types.js';
import { hasAnalyticsConsent } from './consent.js';

/**
 * Format dynamic product data into the standard GA4 Item schema
 *
 * @param {Object} product Product entity from catalogue, cart, or order
 * @param {Object} options Additional item options (e.g. index, list name, quantity)
 * @returns {Object} Normalized GA4 item
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
 * Normalize an array of items
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
 * 1. Page View Event
 *
 * @param {string} pagePath Clean URL path (e.g. /shop, /product/gold-necklace)
 * @param {string} pageTitle Browser title
 */
export function trackPageView(pagePath, pageTitle) {
  if (typeof window === 'undefined') return;

  // Stripping sensitive query strings (tokens, reset codes, etc.)
  const cleanPath = (pagePath || window.location.pathname).split('?')[0];

  pushToDataLayer(
    {
      event: GA4_EVENTS.PAGE_VIEW,
      page_location: `${window.location.origin}${cleanPath}`,
      page_path: cleanPath,
      page_title: pageTitle || document.title || 'MikuMantra Fine Jewellery',
    },
    { isEcommerce: false, deduplicate: true }
  );
}

/**
 * 2. View Item Event (Product Detail View)
 *
 * @param {Object} product Product details
 */
export function trackProductView(product) {
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
 * 3. View Item List Event (Category / Catalog / Search results)
 *
 * @param {Array} products Array of product objects in the list
 * @param {string} listName Name of the listing (e.g. "Bridal Jewellery", "Search: Ring")
 * @param {string} listId Identifier of the listing (e.g. "cat_rings")
 */
export function trackProductListView(products, listName = 'Product Listing', listId = '') {
  if (!Array.isArray(products) || products.length === 0) return;

  // Limit GA4 item array size for list impressions to prevent dataLayer overflow
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
 * 4. Select Item Event (Product click in a list/card)
 *
 * @param {Object} product Clicked product
 * @param {number} index Position of the product in the listing
 * @param {string} listName Name of the listing
 */
export function trackProductClick(product, index = 0, listName = 'Product Listing') {
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
 * 5. Add To Cart Event
 *
 * @param {Object} product Product added
 * @param {number} quantity Quantity added
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
    },
    { isEcommerce: true }
  );
}

/**
 * 6. Remove From Cart Event
 *
 * @param {Object} product Product removed
 * @param {number} quantity Quantity removed
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
 * 7. View Cart Event
 *
 * @param {Array} cartItems Items currently in the cart
 * @param {number} cartValue Total subtotal value of the cart
 */
export function trackViewCart(cartItems, cartValue) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) return;

  const items = formatItems(cartItems);
  const calculatedValue = cartValue !== undefined
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
 * 8. Add To Wishlist Event
 *
 * @param {Object} product Product added to wishlist
 */
export function trackAddToWishlist(product) {
  if (!product) return;

  const item = formatItem(product);
  if (!item) return;

  pushToDataLayer(
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
 * 9. Begin Checkout Event
 *
 * @param {Array} cartItems Items in the checkout
 * @param {number} totalValue Total order subtotal
 * @param {string} coupon Optional coupon code
 */
export function trackBeginCheckout(cartItems, totalValue, coupon = null) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) return;

  const items = formatItems(cartItems, { coupon });
  const value = totalValue !== undefined
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
    },
    { isEcommerce: true }
  );
}

/**
 * 10. Add Shipping Info Event
 *
 * @param {Array} cartItems Items in checkout
 * @param {number} totalValue Value of cart
 * @param {string} shippingTier Shipping method (e.g. "Free Shipping", "Standard Insured")
 * @param {string} coupon Optional coupon code
 */
export function trackAddShippingInfo(cartItems, totalValue, shippingTier = 'Standard Delivery', coupon = null) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) return;

  const items = formatItems(cartItems, { coupon });
  const value = totalValue !== undefined
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
 * 11. Add Payment Info Event
 *
 * @param {Array} cartItems Items in checkout
 * @param {number} totalValue Value of cart
 * @param {string} paymentType Selected payment method (e.g. "Razorpay", "Cash on Delivery")
 * @param {string} coupon Optional coupon code
 */
export function trackAddPaymentInfo(cartItems, totalValue, paymentType = 'Razorpay', coupon = null) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) return;

  const items = formatItems(cartItems, { coupon });
  const value = totalValue !== undefined
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
 * 12. Purchase Event
 * Only triggered on verified order milestone
 *
 * @param {Object} order Order object
 */
export function trackPurchase(order) {
  if (!order || !order.id) return;

  const items = formatItems(order.items || [], { coupon: order.coupon });
  const amounts = order.amounts || {};
  const total = Number(amounts.total || order.total || 0);
  const shipping = Number(amounts.shipping || 0);
  const tax = Number(amounts.tax || 0);

  const payload = {
    transaction_id: String(order.orderNumber || order.id),
    value: total,
    currency: CURRENCY,
    shipping,
    tax,
    items,
  };

  if (order.coupon) {
    payload.coupon = String(order.coupon);
  }

  pushToDataLayer(
    {
      event: GA4_EVENTS.PURCHASE,
      ecommerce: payload,
    },
    { isEcommerce: true, deduplicate: true }
  );
}

/**
 * 13. Refund Event
 * Only triggered on confirmed refund milestone
 *
 * @param {Object} refundData Refund confirmation data
 */
export function trackRefund(refundData) {
  if (!refundData || (!refundData.transactionId && !refundData.orderId)) return;

  const items = formatItems(refundData.items || []);
  const payload = {
    transaction_id: String(refundData.transactionId || refundData.orderId),
    value: Number(refundData.value || refundData.refundAmount || 0),
    currency: CURRENCY,
  };

  if (items.length > 0) {
    payload.items = items;
  }

  pushToDataLayer(
    {
      event: GA4_EVENTS.REFUND,
      ecommerce: payload,
    },
    { isEcommerce: true }
  );
}

/**
 * 14. Search Event
 *
 * @param {string} searchTerm Query string entered by customer
 */
export function trackSearch(searchTerm) {
  const query = (searchTerm || '').trim();
  if (!query) return;

  pushToDataLayer(
    {
      event: GA4_EVENTS.SEARCH,
      search_term: query,
    },
    { isEcommerce: false, deduplicate: true }
  );
}
