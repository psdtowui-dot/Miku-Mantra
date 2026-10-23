import { calculateShippingCharge } from './db-site-settings.js';

/**
 * Validates a coupon document against the current cart subtotal and conditions.
 *
 * @param {Object} couponDoc - The coupon record from MongoDB or fallback
 * @param {number} subtotal - The current cart subtotal (in INR)
 * @param {Object} [options] - Additional contextual options (items, user, etc.)
 * @returns {Object} { valid: boolean, code: string, discount: number, type: string, value: number, minOrder: number, reason: string|null, message: string|null }
 */
export function validateCouponRules(couponDoc, subtotal, { items = [], user = null } = {}) {
  if (!couponDoc) {
    return {
      valid: false,
      code: null,
      discount: 0,
      minOrder: 0,
      reason: 'COUPON_NOT_FOUND',
      message: 'Coupon does not exist.'
    };
  }

  const code = (couponDoc.code || '').trim().toUpperCase();
  const isActive = couponDoc.active !== false && couponDoc.isActive !== false;
  if (!isActive) {
    return {
      valid: false,
      code,
      discount: 0,
      minOrder: 0,
      reason: 'COUPON_INACTIVE',
      message: `Coupon "${code}" is no longer active.`
    };
  }

  const now = new Date();
  if (couponDoc.startDate && new Date(couponDoc.startDate) > now) {
    return {
      valid: false,
      code,
      discount: 0,
      minOrder: 0,
      reason: 'COUPON_NOT_STARTED',
      message: `Coupon "${code}" is not yet active.`
    };
  }

  if (couponDoc.endDate && new Date(couponDoc.endDate) < now) {
    return {
      valid: false,
      code,
      discount: 0,
      minOrder: 0,
      reason: 'COUPON_EXPIRED',
      message: `Coupon "${code}" has expired.`
    };
  }

  if (couponDoc.expiresAt && new Date(couponDoc.expiresAt) < now) {
    return {
      valid: false,
      code,
      discount: 0,
      minOrder: 0,
      reason: 'COUPON_EXPIRED',
      message: `Coupon "${code}" has expired.`
    };
  }

  if (couponDoc.usageLimit && (couponDoc.usedCount || 0) >= couponDoc.usageLimit) {
    return {
      valid: false,
      code,
      discount: 0,
      minOrder: 0,
      reason: 'USAGE_LIMIT_EXCEEDED',
      message: `Coupon "${code}" has reached its maximum usage limit.`
    };
  }

  const minOrder = Number(couponDoc.minOrder ?? couponDoc.minimumPurchase ?? 0);
  const currentSubtotal = Math.max(0, Number(subtotal) || 0);

  if (currentSubtotal < minOrder) {
    return {
      valid: false,
      code,
      discount: 0,
      minOrder,
      reason: 'MINIMUM_PURCHASE_NOT_MET',
      message: `Coupon ${code} has been removed because your cart total (₹${currentSubtotal.toLocaleString('en-IN')}) is now below the minimum purchase requirement of ₹${minOrder.toLocaleString('en-IN')}.`
    };
  }

  const type = (couponDoc.type || couponDoc.discountType || 'percent').toLowerCase();
  const rawValue = Number(couponDoc.value ?? couponDoc.discountValue ?? 0);
  let discount = 0;

  // Category and Product Scope Enforcement
  const hasCategoryRestriction = Array.isArray(couponDoc.applicableCategories) && couponDoc.applicableCategories.length > 0;
  const hasProductRestriction = Array.isArray(couponDoc.applicableProducts) && couponDoc.applicableProducts.length > 0;

  let eligibleSubtotal = currentSubtotal;
  if (Array.isArray(items) && items.length > 0 && (hasCategoryRestriction || hasProductRestriction)) {
    const eligibleItems = items.filter(it => {
      const matchCat = !hasCategoryRestriction || couponDoc.applicableCategories.includes(it.category);
      const matchProd = !hasProductRestriction || couponDoc.applicableProducts.includes(it.id) || couponDoc.applicableProducts.includes(it.slug);
      return matchCat && matchProd;
    });

    if (eligibleItems.length === 0) {
      return {
        valid: false,
        code,
        discount: 0,
        minOrder,
        reason: 'NO_ELIGIBLE_ITEMS',
        message: `Coupon "${code}" is only applicable to specific items or collections in the atelier.`
      };
    }

    eligibleSubtotal = eligibleItems.reduce((acc, it) => acc + (Number(it.price || 0) * Number(it.qty || 1)), 0);
  }

  if (type === 'percent') {
    discount = Math.round(eligibleSubtotal * rawValue / 100);
  } else {
    discount = Math.round(rawValue);
  }

  const maxDiscount = Number(couponDoc.maxDiscount ?? couponDoc.maximumDiscount ?? Infinity);
  if (!isNaN(maxDiscount) && maxDiscount > 0) {
    discount = Math.min(discount, maxDiscount);
  }

  // Never allow discount to exceed the eligible subtotal
  discount = Math.min(discount, eligibleSubtotal);
  discount = Math.max(0, discount);

  return {
    valid: true,
    code,
    discount,
    type,
    value: rawValue,
    minOrder,
    maxDiscount: isFinite(maxDiscount) ? maxDiscount : null,
    reason: null,
    message: null,
    coupon: {
      id: couponDoc.id,
      code,
      type,
      value: rawValue,
      minOrder,
      maxDiscount: isFinite(maxDiscount) ? maxDiscount : null
    }
  };
}

/**
 * Calculates complete server-side pricing for a cart, including real database prices,
 * coupon validation, shipping charges, GST tax, gift wrap, and final total.
 *
 * @param {Object} params
 * @param {Object} params.db - Connected MongoDB instance
 * @param {Array} params.items - Cart items [{ id, qty, price, ... }]
 * @param {string|null} [params.couponCode] - Applied coupon code (if any)
 * @param {boolean} [params.giftWrap] - Whether gift wrap is selected (+₹250)
 * @param {Object} [params.shippingConfig] - Store shipping settings
 * @param {Object} [params.user] - Current authenticated user
 * @returns {Promise<Object>}
 */
export async function calculateCartPricing({
  db,
  items = [],
  couponCode = null,
  giftWrap = false,
  shippingConfig = null,
  user = null
}) {
  const rawItems = Array.isArray(items) ? items : [];
  const validatedItems = [];
  let subtotal = 0;

  // Batch lookup all products in a single database query to eliminate N+1 latency
  const productMap = new Map();
  if (db && rawItems.length > 0) {
    try {
      const allIds = [];
      const allSlugs = [];
      for (const it of rawItems) {
        const id = it.id || it.productId;
        if (id) {
          allIds.push(id, String(id));
        }
        if (it.slug) allSlugs.push(it.slug);
      }
      const orClauses = [];
      if (allIds.length > 0) orClauses.push({ id: { $in: allIds } });
      if (allSlugs.length > 0) orClauses.push({ slug: { $in: allSlugs } });

      if (orClauses.length > 0) {
        const dbProducts = await db.collection('products').find(
          orClauses.length === 1 ? orClauses[0] : { $or: orClauses }
        ).project({ id: 1, slug: 1, name: 1, price: 1, images: 1, img: 1 }).toArray();

        for (const p of dbProducts) {
          if (p.id) productMap.set(String(p.id), p);
          if (p.slug) productMap.set(String(p.slug), p);
        }
      }
    } catch (err) {
      console.warn('Cart pricing product batch fetch warning:', err.message);
    }
  }

  for (const it of rawItems) {
    const id = it.id || it.productId;
    const qty = Math.max(1, parseInt(it.qty) || 1);
    if (!id) continue;

    let realPrice = Number(it.price) || 0;
    let name = it.name || 'Product';
    let slug = it.slug || id;
    let image = it.image || it.img || '';

    const dbProduct = productMap.get(String(id)) || (it.slug ? productMap.get(String(it.slug)) : null);
    if (dbProduct) {
      realPrice = Number(dbProduct.price) || 0;
      name = dbProduct.name || name;
      slug = dbProduct.slug || slug;
      image = dbProduct.images?.[0] || dbProduct.img || image;
    }

    const itemSubtotal = realPrice * qty;
    subtotal += itemSubtotal;

    validatedItems.push({
      id,
      slug,
      name,
      image,
      price: realPrice,
      qty,
      subtotal: itemSubtotal
    });
  }

  // Coupon Revalidation
  let coupon = null;
  let couponValid = true;
  let couponError = null;
  let discount = 0;

  if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
    const cleanCode = couponCode.trim().toUpperCase();
    let couponDoc = null;

    if (db) {
      try {
        couponDoc = await db.collection('coupons').findOne({
          code: cleanCode,
          $or: [{ active: true }, { isActive: true }]
        });
      } catch (err) {
        console.warn('Cart pricing coupon fetch warning:', err.message);
      }
    }

    if (!couponDoc) {
      couponValid = false;
      couponError = `Coupon "${cleanCode}" is invalid or inactive.`;
      discount = 0;
      coupon = null;
    } else {
      const valResult = validateCouponRules(couponDoc, subtotal, { items: validatedItems, user });
      if (valResult.valid) {
        couponValid = true;
        couponError = null;
        discount = valResult.discount;
        coupon = {
          code: valResult.code,
          discount: valResult.discount,
          type: valResult.type,
          value: valResult.value,
          minOrder: valResult.minOrder
        };
      } else {
        couponValid = false;
        couponError = valResult.message;
        discount = 0;
        coupon = null;
      }
    }
  }

  const shipping = calculateShippingCharge(subtotal, shippingConfig);
  const tax = Math.round(Math.max(0, subtotal - discount) * 0.03);
  const giftWrapFee = giftWrap ? 250 : 0;
  const total = Math.max(0, subtotal - discount + shipping + tax + giftWrapFee);

  return {
    items: validatedItems,
    subtotal,
    discount,
    coupon,
    couponCode: coupon?.code || null,
    couponValid,
    couponError,
    shipping,
    tax,
    giftWrap: giftWrapFee,
    total
  };
}
