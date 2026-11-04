'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect and honor reduced-motion accessibility preference.
 * @returns {boolean} True if the user prefers reduced motion.
 */
export function usePrefersReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mediaQuery.matches);

    const listener = (event) => setPrefersReduced(event.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  return prefersReduced;
}

/**
 * Wraps motion variants to return instant static versions if reduced motion is active.
 * @param {Record<string, any>} variants
 * @param {boolean} prefersReduced
 * @returns {Record<string, any>}
 */
export function sanitizeMotionVariants(variants, prefersReduced) {
  if (!prefersReduced) return variants;
  return {
    initial: { opacity: 1, x: 0, y: 0, scale: 1 },
    animate: { opacity: 1, x: 0, y: 0, scale: 1, transition: { duration: 0 } },
    exit: { opacity: 1, x: 0, y: 0, scale: 1, transition: { duration: 0 } },
  };
}
