'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Normalizes size string or number into pixel dimensions
 * @param {number|string} size 
 * @returns {number}
 */
export function normalizeIconSize(size = 20) {
  if (typeof size === 'number') return size;
  const presets = {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
    '2xl': 40,
  };
  return presets[size] || 20;
}

/**
 * Base Icon component with accessibility, responsive sizing, and style inheritance.
 */
export const IconBase = forwardRef(function IconBase(
  {
    as: Component,
    size = 20,
    color,
    strokeWidth = 2,
    className,
    ariaLabel,
    children,
    ...props
  },
  ref
) {
  const pixelSize = normalizeIconSize(size);
  const accessibilityProps = ariaLabel
    ? { role: 'img', 'aria-label': ariaLabel }
    : { 'aria-hidden': true };

  if (Component) {
    return (
      <Component
        ref={ref}
        size={pixelSize}
        color={color}
        strokeWidth={strokeWidth}
        className={cn('inline-block shrink-0 transition-colors', className)}
        {...accessibilityProps}
        {...props}
      />
    );
  }

  return (
    <svg
      ref={ref}
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color || 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('inline-block shrink-0 transition-colors', className)}
      {...accessibilityProps}
      {...props}
    >
      {children}
    </svg>
  );
});
