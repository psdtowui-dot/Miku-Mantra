'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth, authFetch } from './use-auth';
import { toast } from 'sonner';

const getCartKey = (user) => user?.id ? `mikumantra_cart_${user.id}` : 'mikumantra_cart_guest';
const getCouponKey = (user) => user?.id ? `mikumantra_coupon_${user.id}` : 'mikumantra_coupon_guest';

function readCart(key) { 
  if (typeof window === 'undefined') return []; 
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } 
}

function writeCart(key, val) { 
  if (typeof window === 'undefined') return; 
  localStorage.setItem(key, JSON.stringify(val)); 
  setTimeout(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mikumantra:store')); 
    }
  }, 0);
}

function readStoredCoupon(user) {
  if (typeof window === 'undefined') return null;
  const key = getCouponKey(user);
  try {
    const raw = sessionStorage.getItem(key) || localStorage.getItem(key) || sessionStorage.getItem('mikumantra_coupon') || localStorage.getItem('mikumantra_coupon');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && parsed.code ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredCoupon(user, couponObj, { dispatch = true } = {}) {
  if (typeof window === 'undefined') return;
  const key = getCouponKey(user);
  if (!couponObj) {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
    sessionStorage.removeItem('mikumantra_coupon');
    localStorage.removeItem('mikumantra_coupon');
  } else {
    const serialized = JSON.stringify(couponObj);
    sessionStorage.setItem(key, serialized);
    localStorage.setItem(key, serialized);
    sessionStorage.setItem('mikumantra_coupon', serialized);
  }
  if (dispatch) {
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mikumantra:coupon'));
      }
    }, 0);
  }
}

/**
 * Validates a coupon locally against current cart items / subtotal and computes discount.
 * Pure function: does NOT perform side effects, write to storage, or dispatch events.
 */
function evaluateCouponEligibility(coupon, cartItems) {
  if (!coupon || !coupon.code) return null;
  const items = Array.isArray(cartItems) ? cartItems : [];
  if (items.length === 0) {
    return null;
  }

  const subtotal = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
  const minOrder = Number(coupon.minOrder ?? 0);

  if (subtotal < minOrder) {
    return null;
  }

  // Still eligible: recompute discount based on current cart subtotal
  const type = (coupon.type || 'percent').toLowerCase();
  const rawValue = Number(coupon.value || 0);
  let discount = 0;
  if (type === 'percent') {
    discount = Math.round(subtotal * rawValue / 100);
  } else {
    discount = Math.round(rawValue);
  }
  const maxDiscount = Number(coupon.maxDiscount ?? Infinity);
  if (!isNaN(maxDiscount) && maxDiscount > 0) {
    discount = Math.min(discount, maxDiscount);
  }
  discount = Math.min(discount, subtotal);
  discount = Math.max(0, discount);

  return {
    ...coupon,
    discount,
    minOrder
  };
}

export function useCart() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [coupon, setCoupon] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  // Sync cart and coupon with backend MongoDB
  const syncBackend = useCallback(async (newItems, activeCoupon) => {
    if (!user) return;
    try {
      const res = await authFetch('/api/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: newItems,
          coupon: activeCoupon?.code || null
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.couponValid === false && activeCoupon) {
          writeStoredCoupon(user, null, { dispatch: false });
          setCoupon(null);
          toast.error(data.couponError || `Coupon ${activeCoupon.code} removed — minimum purchase requirement no longer met.`, {
            id: 'coupon-invalidated'
          });
        } else if (data.coupon && data.couponValid) {
          writeStoredCoupon(user, data.coupon, { dispatch: false });
          setCoupon(data.coupon);
        }
      }
    } catch (err) {
      console.error('Failed to sync cart with server:', err);
    }
  }, [user]);

  // Initial load, user login sync, guest cart merge & listeners
  useEffect(() => {
    const currentKey = getCartKey(user);
    let localItems = readCart(currentKey);

    // If user logged in, merge guest cart items into user cart
    if (user) {
      const guestItems = readCart('mikumantra_cart_guest');
      if (guestItems.length > 0) {
        const itemMap = new Map();
        localItems.forEach(i => itemMap.set(i.id, { ...i }));
        guestItems.forEach(g => {
          if (itemMap.has(g.id)) {
            itemMap.get(g.id).qty += g.qty;
          } else {
            itemMap.set(g.id, { ...g });
          }
        });
        localItems = Array.from(itemMap.values());
        writeCart(currentKey, localItems);
        writeCart('mikumantra_cart_guest', []);
      }
    }

    setItems(localItems);

    // Revalidate coupon stored locally
    const initialCoupon = readStoredCoupon(user);
    const validCoupon = evaluateCouponEligibility(initialCoupon, localItems);
    setCoupon(validCoupon);
    if (initialCoupon && !validCoupon) {
      writeStoredCoupon(user, null, { dispatch: false });
    } else if (validCoupon && validCoupon.discount !== initialCoupon?.discount) {
      writeStoredCoupon(user, validCoupon, { dispatch: false });
    }
    setHydrated(true);

    let isMounted = true;
    if (user) {
      authFetch('/api/cart', { cache: 'no-store' })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (!data || !isMounted) return;
          const serverItems = Array.isArray(data.items) ? data.items : [];
          let currentList = localItems;

          if (serverItems.length > 0 && localItems.length === 0) {
            currentList = serverItems;
            setItems(serverItems);
            writeCart(currentKey, serverItems);
          } else if (localItems.length > 0 && serverItems.length > 0) {
            const itemMap = new Map();
            serverItems.forEach(i => itemMap.set(i.id, { ...i }));
            localItems.forEach(l => {
              if (itemMap.has(l.id)) {
                itemMap.get(l.id).qty = Math.max(itemMap.get(l.id).qty, l.qty);
              } else {
                itemMap.set(l.id, { ...l });
              }
            });
            currentList = Array.from(itemMap.values());
            setItems(currentList);
            writeCart(currentKey, currentList);
          }

          // Backend returns verified coupon state
          if (data.couponValid === false) {
            writeStoredCoupon(user, null, { dispatch: false });
            setCoupon(null);
          } else if (data.coupon && data.couponValid) {
            const rechecked = evaluateCouponEligibility(data.coupon, currentList);
            setCoupon(rechecked);
            if (rechecked) {
              writeStoredCoupon(user, rechecked, { dispatch: false });
            }
          } else {
            const rechecked = evaluateCouponEligibility(initialCoupon, currentList);
            setCoupon(rechecked);
            if (initialCoupon && !rechecked) {
              writeStoredCoupon(user, null, { dispatch: false });
            }
          }
        })
        .catch(() => {});
    }

    const onStoreChange = () => {
      const nextItems = readCart(getCartKey(user));
      setItems(nextItems);
      const storedCoupon = readStoredCoupon(user);
      const evaluated = evaluateCouponEligibility(storedCoupon, nextItems);
      setCoupon(evaluated);
      if (storedCoupon && !evaluated) {
        writeStoredCoupon(user, null, { dispatch: false });
      } else if (evaluated && evaluated.discount !== storedCoupon?.discount) {
        writeStoredCoupon(user, evaluated, { dispatch: false });
      }
    };

    const onCouponChange = () => {
      const nextCoupon = readStoredCoupon(user);
      const currentItems = readCart(getCartKey(user));
      const evaluated = evaluateCouponEligibility(nextCoupon, currentItems);
      setCoupon(evaluated);
    };

    window.addEventListener('mikumantra:store', onStoreChange);
    window.addEventListener('mikumantra:coupon', onCouponChange);

    return () => {
      isMounted = false;
      window.removeEventListener('mikumantra:store', onStoreChange);
      window.removeEventListener('mikumantra:coupon', onCouponChange);
    };
  }, [user?.id]);

  const add = useCallback((product, qty = 1) => {
    if (!product || (product.stock !== undefined && product.stock <= 0)) {
      return false;
    }
    const currentKey = getCartKey(user);
    const cur = readCart(currentKey);
    const idx = cur.findIndex(i => i.id === product.id);
    const image = Array.isArray(product.images) ? product.images[0] : (product.image || product.img || '');
    if (idx > -1) {
      cur[idx].qty += qty;
    } else {
      cur.push({ id: product.id, slug: product.slug, name: product.name, price: product.price, mrp: product.mrp, image, qty });
    }
    writeCart(currentKey, cur);
    setItems(cur);

    // Revalidate coupon with new items
    const revalidatedCoupon = evaluateCouponEligibility(coupon, cur);
    setCoupon(revalidatedCoupon);
    if (coupon && !revalidatedCoupon) {
      writeStoredCoupon(user, null);
      toast.error(`Coupon ${coupon.code} removed — minimum purchase requirement no longer met.`, {
        id: 'coupon-invalidated'
      });
    } else if (revalidatedCoupon && revalidatedCoupon.discount !== coupon?.discount) {
      writeStoredCoupon(user, revalidatedCoupon);
    }
    syncBackend(cur, revalidatedCoupon);
    return true;
  }, [user, coupon, syncBackend]);

  const remove = useCallback((id) => {
    const currentKey = getCartKey(user);
    const updated = readCart(currentKey).filter(i => i.id !== id);
    writeCart(currentKey, updated);
    setItems(updated);

    // Revalidate coupon after removing product
    const revalidatedCoupon = evaluateCouponEligibility(coupon, updated);
    setCoupon(revalidatedCoupon);
    if (coupon && !revalidatedCoupon) {
      writeStoredCoupon(user, null);
      toast.error(`Coupon ${coupon.code} removed — your cart no longer meets the minimum purchase requirement.`, {
        id: 'coupon-invalidated'
      });
    } else if (revalidatedCoupon && revalidatedCoupon.discount !== coupon?.discount) {
      writeStoredCoupon(user, revalidatedCoupon);
    }
    syncBackend(updated, revalidatedCoupon);
  }, [user, coupon, syncBackend]);

  const setQty = useCallback((id, qty) => {
    const currentKey = getCartKey(user);
    const cur = readCart(currentKey);
    const idx = cur.findIndex(i => i.id === id);
    if (idx > -1) {
      cur[idx].qty = Math.max(1, qty);
      writeCart(currentKey, cur);
      setItems(cur);

      // Revalidate coupon after changing product quantity
      const revalidatedCoupon = evaluateCouponEligibility(coupon, cur);
      setCoupon(revalidatedCoupon);
      if (coupon && !revalidatedCoupon) {
        writeStoredCoupon(user, null);
        toast.error(`Coupon ${coupon.code} removed — your cart no longer meets the minimum purchase requirement.`, {
          id: 'coupon-invalidated'
        });
      } else if (revalidatedCoupon && revalidatedCoupon.discount !== coupon?.discount) {
        writeStoredCoupon(user, revalidatedCoupon);
      }
      syncBackend(cur, revalidatedCoupon);
    }
  }, [user, coupon, syncBackend]);

  const clear = useCallback(async () => {
    const currentKey = getCartKey(user);
    writeCart(currentKey, []);
    writeCart('mikumantra_cart_guest', []);
    setItems([]);
    setCoupon(null);
    writeStoredCoupon(user, null, { dispatch: false });
    await syncBackend([], null);
  }, [user, syncBackend]);

  const removeOrderedItems = useCallback(async (orderedList = []) => {
    const currentKey = getCartKey(user);
    const currentList = readCart(currentKey);
    const orderedItems = Array.isArray(orderedList) ? orderedList : [];

    const orderedMap = new Map();
    for (const oi of orderedItems) {
      const id = String(oi.id || oi.productId || oi.slug || '');
      if (id) {
        orderedMap.set(id, (orderedMap.get(id) || 0) + (Number(oi.qty) || 1));
      }
    }

    const remainingItems = [];
    for (const item of currentList) {
      const id = String(item.id || item.slug || '');
      const ordQty = orderedMap.get(id) || 0;
      if (ordQty > 0) {
        const curQty = Number(item.qty) || 1;
        if (curQty > ordQty) {
          remainingItems.push({ ...item, qty: curQty - ordQty });
          orderedMap.set(id, 0);
        } else {
          orderedMap.set(id, ordQty - curQty);
        }
      } else {
        remainingItems.push(item);
      }
    }

    // Persist remaining items to primary storage and clear guest storage
    writeCart(currentKey, remainingItems);
    writeCart('mikumantra_cart_guest', []);
    setItems(remainingItems);

    if (remainingItems.length === 0) {
      setCoupon(null);
      writeStoredCoupon(user, null, { dispatch: false });
      await syncBackend([], null);
    } else {
      const revalidatedCoupon = evaluateCouponEligibility(coupon, remainingItems);
      setCoupon(revalidatedCoupon);
      if (coupon && !revalidatedCoupon) {
        writeStoredCoupon(user, null, { dispatch: false });
      } else if (revalidatedCoupon) {
        writeStoredCoupon(user, revalidatedCoupon, { dispatch: false });
      }
      await syncBackend(remainingItems, revalidatedCoupon);
    }

    return remainingItems;
  }, [user, coupon, syncBackend]);

  const applyCoupon = useCallback(async (code) => {
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode) {
      toast.error('Please enter a coupon code.');
      return { success: false, error: 'Please enter a coupon code.' };
    }
    const currentSubtotal = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
    try {
      const res = await authFetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode, subtotal: currentSubtotal })
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        const couponObj = {
          code: data.code,
          discount: data.discount,
          type: data.type,
          value: data.value,
          minOrder: data.minOrder || 0,
          maxDiscount: data.maxDiscount || null
        };
        setCoupon(couponObj);
        writeStoredCoupon(user, couponObj);
        syncBackend(items, couponObj);
        toast.success(`${couponObj.code} applied — ${couponObj.type === 'percent' ? couponObj.value + '%' : '₹' + couponObj.value} off`);
        return { success: true, coupon: couponObj };
      } else {
        toast.error(data.error || 'Invalid coupon');
        return { success: false, error: data.error || 'Invalid coupon' };
      }
    } catch (err) {
      console.error('Failed to apply coupon:', err);
      toast.error('Failed to apply coupon.');
      return { success: false, error: 'Failed to apply coupon.' };
    }
  }, [items, user, syncBackend]);

  const removeCoupon = useCallback(() => {
    const prevCode = coupon?.code;
    setCoupon(null);
    writeStoredCoupon(user, null);
    const currentItems = readCart(getCartKey(user));
    syncBackend(currentItems, null);
    if (prevCode) {
      toast.success(`Coupon ${prevCode} removed.`);
    }
  }, [coupon, user, syncBackend]);

  const count = items.reduce((s, i) => s + (i.qty || 1), 0);
  const subtotal = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
  const discount = coupon?.discount || 0;

  return {
    items,
    add,
    remove,
    setQty,
    clear,
    removeOrderedItems,
    count,
    subtotal,
    coupon,
    couponCode: coupon?.code || '',
    discount,
    applyCoupon,
    removeCoupon,
    hydrated
  };
}

let wishlistCache = {
  userId: null,
  ids: [],
  products: [],
  hydrated: false
};
const wishlistListeners = new Set();
let wishlistFetchPromise = null;
const pendingWishlistToggles = new Set();

function notifyWishlistListeners() {
  const snapshot = {
    ...wishlistCache,
    ids: [...wishlistCache.ids],
    products: [...wishlistCache.products]
  };
  wishlistListeners.forEach(fn => fn(snapshot));
}

async function fetchWishlistGlobal(userId) {
  if (!userId) {
    wishlistCache = { userId: null, ids: [], products: [], hydrated: true };
    notifyWishlistListeners();
    return;
  }
  if (wishlistFetchPromise) return wishlistFetchPromise;
  wishlistFetchPromise = (async () => {
    try {
      const r = await authFetch('/api/wishlist', { cache: 'no-store' });
      if (r.ok) {
        const d = await r.json();
        const prods = Array.isArray(d.products) ? d.products : [];
        const validWishlist = Array.isArray(d.wishlist) ? d.wishlist : [];
        const validIds = validWishlist.map(item => item.productId).filter(Boolean);
        wishlistCache = {
          userId,
          ids: validIds,
          products: prods,
          hydrated: true
        };
      }
    } catch (err) {
      console.error('Failed to fetch wishlist:', err);
    } finally {
      wishlistFetchPromise = null;
      notifyWishlistListeners();
    }
  })();
  return wishlistFetchPromise;
}

export function useWishlist() {
  const { user } = useAuth();
  const userId = user?.id || null;
  const [state, setState] = useState(() => {
    if (wishlistCache.userId === userId && wishlistCache.hydrated) {
      return wishlistCache;
    }
    return { ...wishlistCache, userId, hydrated: !userId };
  });

  useEffect(() => {
    const l = (s) => setState(s);
    wishlistListeners.add(l);

    if (userId) {
      if (wishlistCache.userId !== userId || !wishlistCache.hydrated) {
        fetchWishlistGlobal(userId);
      }
    } else {
      if (wishlistCache.userId !== null) {
        wishlistCache = { userId: null, ids: [], products: [], hydrated: true };
        notifyWishlistListeners();
      }
    }

    return () => wishlistListeners.delete(l);
  }, [userId]);

  const toggle = useCallback(async (productId) => {
    if (!productId) return;

    if (!user) {
      window.dispatchEvent(new CustomEvent('mikumantra:auth-prompt', { 
        detail: { message: 'Please login or create an account to add products to your wishlist.' } 
      }));
      return;
    }

    if (pendingWishlistToggles.has(productId)) {
      return;
    }
    pendingWishlistToggles.add(productId);
    
    const isAdding = !wishlistCache.ids.includes(productId);
    const newIds = isAdding 
      ? [...wishlistCache.ids, productId] 
      : wishlistCache.ids.filter(id => id !== productId);

    const newProducts = isAdding
      ? wishlistCache.products
      : wishlistCache.products.filter(p => p.id !== productId && p.slug !== productId);

    // Optimistic UI state update across all instances immediately
    wishlistCache.ids = newIds;
    wishlistCache.products = newProducts;
    notifyWishlistListeners();
    
    try {
      let res;
      if (isAdding) {
        res = await authFetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId })
        });
      } else {
        res = await authFetch(`/api/wishlist/${productId}`, {
          method: 'DELETE'
        });
      }

      if (res && res.ok) {
        if (isAdding) {
          toast.success('Added to wishlist ❤️', { id: 'wishlist-toast', duration: 2500 });
        } else {
          toast.success('Removed from wishlist', { id: 'wishlist-toast', duration: 2500 });
        }
      } else {
        // Rollback optimistic update if server returned an error
        await fetchWishlistGlobal(userId);
      }
    } catch (err) {
      console.error('Failed to toggle wishlist item:', err);
      await fetchWishlistGlobal(userId);
    } finally {
      pendingWishlistToggles.delete(productId);
    }
  }, [user, userId]);

  const has = useCallback((productId) => state.ids.includes(productId), [state.ids]);

  return {
    ids: state.ids,
    wishlistProducts: state.products,
    has,
    toggle,
    count: state.ids.length,
    loading: !state.hydrated
  };
}

