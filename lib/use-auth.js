'use client';
import { useEffect, useState, useCallback } from 'react';

const TAB_TOKEN_KEY = 'mikumantra_tab_token';

export function getTabToken() {
  if (typeof window === 'undefined') return '';
  try {
    return sessionStorage.getItem(TAB_TOKEN_KEY) || localStorage.getItem(TAB_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setTabToken(token) {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      sessionStorage.setItem(TAB_TOKEN_KEY, token);
      localStorage.setItem(TAB_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TAB_TOKEN_KEY);
      localStorage.removeItem(TAB_TOKEN_KEY);
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

const USER_CACHE_KEY = 'mikumantra_user_cache';
function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(USER_CACHE_KEY) || localStorage.getItem(USER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function setStoredUser(u) {
  if (typeof window === 'undefined') return;
  try {
    if (u) {
      sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
    } else {
      sessionStorage.removeItem(USER_CACHE_KEY);
      localStorage.removeItem(USER_CACHE_KEY);
    }
  } catch {}
}

export function isAdminUser(u) {
  if (!u) return false;
  if (u.role === 'admin') return true;
  if (['SUPER_ADMIN', 'ADMIN', 'PRODUCT_MANAGER', 'ORDER_MANAGER', 'CUSTOMER_SUPPORT', 'FINANCE_MANAGER', 'MARKETING_MANAGER'].includes(u.roleKey)) return true;
  if (Array.isArray(u.permissions) && (u.permissions.includes('*') || u.permissions.includes('dashboard.view'))) return true;
  return false;
}

let cache = null;
let listeners = new Set();
let isInitialized = false;
let fetchMePromise = null;
let hasCompletedInitialAuth = false;

async function fetchMe() {
  if (fetchMePromise) return fetchMePromise;
  fetchMePromise = (async () => {
    try {
      const r = await authFetch('/api/auth/me?_t=' + Date.now());
      const d = await r.json().catch(() => null);
      if (r.ok && d && d.user) {
        cache = d.user;
        setStoredUser(cache);
        listeners.forEach(l => l(cache));
      } else if (r.status === 401 || (r.ok && d && d.user === null)) {
        cache = null;
        setStoredUser(null);
        listeners.forEach(l => l(null));
      }
    } catch {
      // Do not wipe out valid user on temporary network blips
    } finally {
      hasCompletedInitialAuth = true;
      fetchMePromise = null;
    }
  })();
  return fetchMePromise;
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState(cache);
  const [loading, setLoading] = useState(!hasCompletedInitialAuth);

  useEffect(() => {
    const l = (u) => { setUser(u); setLoading(false); };
    listeners.add(l);

    if (!isInitialized && typeof window !== 'undefined') {
      isInitialized = true;
      const stored = getStoredUser();
      if (stored) {
        cache = stored;
        setUser(stored);
      }
    }

    fetchMe().then(() => {
      hasCompletedInitialAuth = true;
      setLoading(false);
    });
    return () => listeners.delete(l);
  }, []);

  const login = useCallback(async (email, password, options = {}) => {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, requireAdmin: options.requireAdmin || false })
    });
    const d = await safeJson(r);
    if (!r.ok) throw new Error((d && d.error) || `Authentication failed (${r.status}). Please check your server or connection.`);
    if (d && d.token) {
      setTabToken(d.token);
    }
    cache = d ? d.user : null;
    setStoredUser(cache);
    listeners.forEach(fn => fn(cache));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mikumantra:auth-change', { detail: d ? d.user : null }));
    }
    return d ? d.user : null;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const r = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, password })
    });
    const d = await safeJson(r);
    if (!r.ok) throw new Error((d && d.error) || `Registration failed (${r.status}). Please try again.`);
    if (d && d.token) {
      setTabToken(d.token);
    }
    cache = d ? d.user : null;
    setStoredUser(cache);
    listeners.forEach(fn => fn(cache));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mikumantra:auth-change', { detail: d ? d.user : null }));
    }
    return d ? d.user : null;
  }, []);

  const loginWithGoogle = useCallback(async (payload, options = {}) => {
    let reqBody = { requireAdmin: options.requireAdmin || false };
    if (typeof payload === 'string') {
      reqBody.credential = payload;
    } else if (payload && typeof payload === 'object') {
      if (payload.accessToken) reqBody.accessToken = payload.accessToken;
      if (payload.credential) reqBody.credential = payload.credential;
    }

    const r = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(reqBody)
    });
    const d = await safeJson(r);
    if (!r.ok) throw new Error((d && d.error) || `Google sign-in failed (${r.status}). Please try again.`);
    if (d && d.token) {
      setTabToken(d.token);
    }
    cache = d ? d.user : null;
    setStoredUser(cache);
    listeners.forEach(fn => fn(cache));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mikumantra:auth-change', { detail: d ? d.user : null }));
    }
    return d ? d.user : null;
  }, []);

  const logout = useCallback(async () => {
    await authFetch('/api/auth/logout', { method: 'POST' });
    setTabToken('');
    setStoredUser(null);
    cache = null;
    listeners.forEach(fn => fn(null));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mikumantra:auth-change', { detail: null }));
    }
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword, confirmPassword) => {
    const r = await authFetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
    });
    const d = await safeJson(r);
    if (!r.ok) throw new Error((d && d.error) || `Failed to change password (${r.status}).`);
    await fetchMe();
    return d;
  }, []);

  const forgotPassword = useCallback(async (email, options = {}) => {
    const r = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, requireAdmin: options.requireAdmin || false })
    });
    const d = await safeJson(r);
    if (!r.ok) throw new Error((d && d.error) || `Failed to request password reset (${r.status}).`);
    return d;
  }, []);

  const verifyResetCode = useCallback(async (email, code) => {
    const r = await fetch('/api/auth/verify-reset-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });
    const d = await safeJson(r);
    if (!r.ok) throw new Error((d && d.error) || `Invalid verification code (${r.status}).`);
    return d;
  }, []);

  const resetPassword = useCallback(async (email, code, newPassword, confirmPassword) => {
    const r = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, newPassword, confirmPassword })
    });
    const d = await safeJson(r);
    if (!r.ok) throw new Error((d && d.error) || `Failed to reset password (${r.status}).`);
    return d;
  }, []);

  const refresh = useCallback(async (updatedUser) => {
    if (updatedUser) {
      cache = { ...(cache || {}), ...updatedUser };
      setStoredUser(cache);
      listeners.forEach(fn => fn(cache));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mikumantra:auth-change', { detail: cache }));
      }
    }
    await fetchMe();
  }, []);

  return { user, loading, login, register, loginWithGoogle, logout, refresh, changePassword, forgotPassword, verifyResetCode, resetPassword };
}

