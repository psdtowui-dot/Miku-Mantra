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

export function useWishlist(){
  const { user } = useAuth();
  const [ids, setIds] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchWishlist = useCallback(async () => {
    if (!user) {
      setIds([]);
      return;
    }
    try {
      const r = await authFetch('/api/wishlist', { cache: 'no-store' });
      if (r.ok) {
        const d = await r.json();
        setIds((d.wishlist || []).map(item => item.productId));
      }
    } catch (err) {
      console.error('Failed to fetch wishlist:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  // Keep state in sync across different components within the tab
  useEffect(() => {
    const h = () => fetchWishlist();
    window.addEventListener('mikumantra:wishlist-sync', h);
    return () => window.removeEventListener('mikumantra:wishlist-sync', h);
  }, [fetchWishlist]);

  const toggle = useCallback(async (productId) => {
    if (!user) {
      // Dispatch custom event to trigger login required modal
      window.dispatchEvent(new CustomEvent('mikumantra:auth-prompt', { 
        detail: { message: 'Please login or create an account to add products to your wishlist.' } 
      }));
      return;
    }
    
    const isAdding = !ids.includes(productId);
    // Optimistic UI state update
    setIds(cur => isAdding ? [...cur, productId] : cur.filter(id => id !== productId));
    
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
      // Notify other hook instances to sync state
      window.dispatchEvent(new CustomEvent('mikumantra:wishlist-sync'));
    } catch (err) {
      console.error('Failed to toggle wishlist item:', err);
      // Revert optimistic update on failure
      fetchWishlist();
    }
  }, [user, ids, fetchWishlist]);

  const has = (productId) => ids.includes(productId);

  return { ids, has, toggle, count: ids.length, loading };
}

