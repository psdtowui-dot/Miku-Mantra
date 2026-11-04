'use client';

import React, { forwardRef } from 'react';

/**
 * Standard icon size normalizer
 * Supports named presets or explicit pixel numbers
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
    '3xl': 48,
  };
  return presets[size] || 20;
}

/**
 * Universal IconBase wrapper providing sizing, accessibility, hover effects, and CSS states
 */
export const IconBase = forwardRef(function IconBase(
  {
    as: Component,
    size = 20,
    color,
    strokeWidth = 2,
    className = '',
    ariaLabel,
    hoverEffect = 'none',
    disabled = false,
    themeAuto = false,
    children,
    ...props
  },
  ref
) {
  const pixelSize = normalizeIconSize(size);
  const accessibilityProps = ariaLabel
    ? { role: 'img', 'aria-label': ariaLabel }
    : { 'aria-hidden': true };

  const classNames = [
    'global-icon',
    className
  ].filter(Boolean).join(' ');

  if (Component) {
    return (
      <span
        className={classNames}
        data-hover={hoverEffect}
        data-disabled={disabled ? 'true' : undefined}
        data-theme-auto={themeAuto ? 'true' : undefined}
      >
        <Component
          ref={ref}
          size={pixelSize}
          color={color}
          strokeWidth={strokeWidth}
          {...accessibilityProps}
          {...props}
        />
      </span>
    );
  }

  return (
    <span
      className={classNames}
      data-hover={hoverEffect}
      data-disabled={disabled ? 'true' : undefined}
      data-theme-auto={themeAuto ? 'true' : undefined}
    >
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
        {...accessibilityProps}
        {...props}
      >
        {children}
      </svg>
    </span>
  );
});
