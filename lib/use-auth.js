'use client';
import { useEffect, useState, useCallback } from 'react';

const TAB_TOKEN_KEY = 'mikumantra_tab_token';

export function getTabToken() {
  if (typeof window === 'undefined') return '';
  try {
    return sessionStorage.getItem(TAB_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setTabToken(token) {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      sessionStorage.setItem(TAB_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TAB_TOKEN_KEY);
    }
  } catch {}
}

export async function authFetch(url, options = {}) {
  const token = getTabToken();
  const headers = new Headers(options.headers || {});
  if (token && !headers.has('x-auth-token') && !headers.has('Authorization')) {
    headers.set('x-auth-token', token);
  }
  const mergedOptions = {
    ...options,
    headers,
    credentials: 'include'
  };
  return fetch(url, mergedOptions);
}

let cache = null;
let listeners = new Set();

async function fetchMe() {
  try {
    const r = await authFetch('/api/auth/me');
    const d = await r.json();
    cache = d.user || null;
  } catch {
    cache = null;
  }
  listeners.forEach(l => l(cache));
}

export function useAuth() {
  const [user, setUser] = useState(cache);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    const l = (u) => { setUser(u); setLoading(false); };
    listeners.add(l);
    if (cache === null) fetchMe().then(() => setLoading(false)); else setLoading(false);
    return () => listeners.delete(l);
  }, []);

  const login = useCallback(async (email, password) => {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Login failed');
    if (d.token) {
      setTabToken(d.token);
    }
    cache = d.user;
    listeners.forEach(fn => fn(cache));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mikumantra:auth-change', { detail: d.user }));
    }
    return d.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const r = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, password })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Registration failed');
    if (d.token) {
      setTabToken(d.token);
    }
    cache = d.user;
    listeners.forEach(fn => fn(cache));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mikumantra:auth-change', { detail: d.user }));
    }
    return d.user;
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    const r = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ credential })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Google sign-in failed');
    if (d.token) {
      setTabToken(d.token);
    }
    cache = d.user;
    listeners.forEach(fn => fn(cache));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mikumantra:auth-change', { detail: d.user }));
    }
    return d.user;
  }, []);

  const logout = useCallback(async () => {
    await authFetch('/api/auth/logout', { method: 'POST' });
    setTabToken('');
    cache = null;
    listeners.forEach(fn => fn(null));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mikumantra:auth-change', { detail: null }));
    }
  }, []);

  const refresh = useCallback(async () => { await fetchMe(); }, []);

  return { user, loading, login, register, loginWithGoogle, logout, refresh };
}

