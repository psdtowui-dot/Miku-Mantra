'use client';

/**
 * Lightweight client providers root wrapper.
 * Kept minimal to prevent unnecessary bundle overhead on initial load.
 */
export function Providers({ children }) {
  return children;
}
