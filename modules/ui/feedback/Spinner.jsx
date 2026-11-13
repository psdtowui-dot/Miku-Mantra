'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Standardized Luxury Loading Spinner
 * Unifies the 143 duplicate Loader2 definitions across the application.
 * 
 * @param {Object} props
 * @param {'sm'|'md'|'lg'|'xl'|number} [props.size='md']
 * @param {'primary'|'gold'|'dark'|'white'|'muted'} [props.variant='primary']
 * @param {string} [props.label] Accessible text / visible loading caption
 * @param {boolean} [props.center] If true, centers spinner in container
 * @param {string} [props.className] Additional CSS classes
 */
export function Spinner({
  size = 'md',
  variant = 'primary',
  label,
  center = false,
  className,
  ...props
}) {
  const sizeMap = {
    sm: 16,
    md: 20,
    lg: 28,
    xl: 36,
  };
  const pixelSize = typeof size === 'number' ? size : sizeMap[size] || 20;

  const variantMap = {
    primary: 'text-[#9C6B30]',
    gold: 'text-[#D4AF37]',
    dark: 'text-[#1A1A1A]',
    white: 'text-white',
    muted: 'text-neutral-400',
  };

  const spinnerElement = (
    <div
      role="status"
      aria-label={label || 'Loading...'}
      className={cn(
        'inline-flex items-center gap-2',
        center && 'w-full justify-center p-8',
        className
      )}
      {...props}
    >
      <Loader2
        size={pixelSize}
        className={cn('animate-spin shrink-0', variantMap[variant] || variantMap.primary)}
      />
      {label && <span className="text-xs text-neutral-500 font-medium tracking-wide">{label}</span>}
      <span className="sr-only">{label || 'Loading...'}</span>
    </div>
  );

  return spinnerElement;
}
