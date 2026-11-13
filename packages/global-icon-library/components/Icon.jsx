'use client';

import React, { forwardRef } from 'react';
import { getIconComponent } from '../registry/iconRegistry.js';
import { IconBase } from './IconBase.jsx';

/**
 * Universal Icon Component
 * 
 * Usage:
 * <Icon name="shopping-bag" size={24} />
 * <Icon name="heart" size={22} color="red" hoverEffect="scale" />
 * <Icon name="user" size="lg" className="custom-icon" />
 */
export const Icon = forwardRef(function Icon(
  {
    name,
    size = 20,
    color,
    strokeWidth = 2,
    className = '',
    ariaLabel,
    hoverEffect = 'none',
    disabled = false,
    themeAuto = false,
    fallback = null,
    ...props
  },
  ref
) {
  if (!name) return null;

  const ResolvedComponent = getIconComponent(name);

  if (!ResolvedComponent) {
    if (fallback) return fallback;
    // Default placeholder fallback
    return (
      <IconBase
        ref={ref}
        size={size}
        color={color || 'currentColor'}
        className={className}
        ariaLabel={ariaLabel || `Icon ${name}`}
        hoverEffect={hoverEffect}
        disabled={disabled}
        themeAuto={themeAuto}
        {...props}
      >
        <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="3 3" />
        <circle cx="12" cy="12" r="3" />
      </IconBase>
    );
  }

  return (
    <ResolvedComponent
      ref={ref}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      className={className}
      ariaLabel={ariaLabel}
      hoverEffect={hoverEffect}
      disabled={disabled}
      themeAuto={themeAuto}
      {...props}
    />
  );
});
