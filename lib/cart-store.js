'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth, authFetch } from './use-auth';

const getCartKey = (user) => user?.id ? `mikumantra_cart_${user.id}` : 'mikumantra_cart_guest';

function read(key){ 
  if (typeof window === 'undefined') return []; 
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } 
}

function write(key, val){ 
  if (typeof window === 'undefined') return; 
  localStorage.setItem(key, JSON.stringify(val)); 
  window.dispatchEvent(new CustomEvent('mikumantra:store')); 
}

export function useCart(){
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  // Sync with MongoDB backend when user is logged in
  const syncBackend = useCallback(async (newItems) => {
    if (!user) return;
    try {
      await authFetch('/api/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: newItems })
      });
    } catch (err) {
      console.error('Failed to sync cart with server:', err);
    }
  }, [user]);

  // Initial load and listen to local store events
  useEffect(() => {
    const currentKey = getCartKey(user);
    let localItems = read(currentKey);

    // If user logged in, merge guest cart items into user cart
    if (user) {
      const guestItems = read('mikumantra_cart_guest');
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
        write(currentKey, localItems);
        write('mikumantra_cart_guest', []);
      }
    }

    setItems(localItems);
    setHydrated(true);

    let isMounted = true;
    if (user) {
      authFetch('/api/cart', { cache: 'no-store' })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && isMounted) {
            const serverItems = data.items || [];
            if (serverItems.length > 0 && localItems.length === 0) {
              setItems(serverItems);
              write(currentKey, serverItems);
            } else if (localItems.length > 0) {
              const itemMap = new Map();
              serverItems.forEach(i => itemMap.set(i.id, { ...i }));
              localItems.forEach(l => {
                if (itemMap.has(l.id)) {
                  itemMap.get(l.id).qty = Math.max(itemMap.get(l.id).qty, l.qty);
                } else {
                  itemMap.set(l.id, { ...l });
                }
              });
              const merged = Array.from(itemMap.values());
              setItems(merged);
              write(currentKey, merged);
              syncBackend(merged);
            }
          }
        })
        .catch(() => {});
    }

    const h = () => setItems(read(getCartKey(user)));
    window.addEventListener('mikumantra:store', h);
    return () => {
      isMounted = false;
      window.removeEventListener('mikumantra:store', h);
    };
  }, [user, syncBackend]);

  const add = useCallback((product, qty = 1) => {
    if (!product || (product.stock !== undefined && product.stock <= 0)) {
      return false;
    }
    const currentKey = getCartKey(user);
    const cur = read(currentKey);
    const idx = cur.findIndex(i => i.id === product.id);
    const image = Array.isArray(product.images) ? product.images[0] : (product.image || product.img || '');
    if (idx > -1) {
      cur[idx].qty += qty;
    } else {
      cur.push({ id: product.id, slug: product.slug, name: product.name, price: product.price, mrp: product.mrp, image, qty });
    }
    write(currentKey, cur);
    syncBackend(cur);
    return true;
  }, [user, syncBackend]);

  const remove = useCallback((id) => {
    const currentKey = getCartKey(user);
    const updated = read(currentKey).filter(i => i.id !== id);
    write(currentKey, updated);
    syncBackend(updated);
  }, [user, syncBackend]);

  const setQty = useCallback((id, qty) => {
    const currentKey = getCartKey(user);
    const cur = read(currentKey);
    const idx = cur.findIndex(i => i.id === id);
    if (idx > -1) {
      cur[idx].qty = Math.max(1, qty);
      write(currentKey, cur);
      syncBackend(cur);
    }
  }, [user, syncBackend]);

  const clear = useCallback(() => {
    const currentKey = getCartKey(user);
    write(currentKey, []);
    syncBackend([]);
  }, [user, syncBackend]);

  const count = items.reduce((s, i) => s + (i.qty || 1), 0);
  const subtotal = items.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
  return { items, add, remove, setQty, clear, count, subtotal, hydrated };
}

let wishlistCache = {
  userId: null,
  ids: [],
  products: [],
  hydrated: false
};
const wishlistListeners = new Set();
let wishlistFetchPromise = null;

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
    if (!user) {
      window.dispatchEvent(new CustomEvent('mikumantra:auth-prompt', { 
        detail: { message: 'Please login or create an account to add products to your wishlist.' } 
      }));
      return;
    }
    
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
      if (isAdding) {
        await authFetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId })
        });
      } else {
        await authFetch(`/api/wishlist/${productId}`, {
          method: 'DELETE'
        });
      }
      await fetchWishlistGlobal(userId);
    } catch (err) {
      console.error('Failed to toggle wishlist item:', err);
      fetchWishlistGlobal(userId);
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

