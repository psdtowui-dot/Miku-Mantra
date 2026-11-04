'use client';

import React, { forwardRef } from 'react';
import { normalizeIconSize } from '../../components/IconBase.jsx';

export const GoogleIcon = forwardRef(function GoogleIcon({ size = 20, className = '', ariaLabel = 'Google', ...props }, ref) {
  const px = normalizeIconSize(size);
  return (
    <span className={`global-icon ${className}`}>
      <svg ref={ref} width={px} height={px} viewBox="0 0 24 24" role="img" aria-label={ariaLabel} {...props}>
        <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z" />
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z" />
        <path fill="#FBBC05" d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.2-1.9.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z" />
        <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
      </svg>
    </span>
  );
});

export const VerifiedBadgeIcon = forwardRef(function VerifiedBadgeIcon({ size = 18, color = '#D4AF37', className = '', ariaLabel = 'Verified', ...props }, ref) {
  const px = normalizeIconSize(size);
  return (
    <span className={`global-icon ${className}`}>
      <svg ref={ref} width={px} height={px} viewBox="0 0 24 24" fill="none" role="img" aria-label={ariaLabel} {...props}>
        <circle cx="12" cy="12" r="10" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" />
        <path d="M8.5 12.5L10.5 14.5L15.5 9.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
});

export const BarcodeIcon = forwardRef(function BarcodeIcon({ size = 20, color = 'currentColor', className = '', ariaLabel = 'Barcode', ...props }, ref) {
  const px = normalizeIconSize(size);
  return (
    <span className={`global-icon ${className}`}>
      <svg ref={ref} width={px} height={px} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={ariaLabel} {...props}>
        <path d="M3 5v14M6 5v14M10 5v14M13 5v14M15 5v14M19 5v14M21 5v14" />
      </svg>
    </span>
  );
});

export const IndianRupeeIcon = forwardRef(function IndianRupeeIcon({ size = 20, color = 'currentColor', strokeWidth = 2, className = '', ariaLabel = 'Indian Rupee', ...props }, ref) {
  const px = normalizeIconSize(size);
  return (
    <span className={`global-icon ${className}`}>
      <svg ref={ref} width={px} height={px} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={ariaLabel} {...props}>
        <path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3a4 4 0 0 0 0-8H6" />
      </svg>
    </span>
  );
});

export const Google = GoogleIcon;
export const VerifiedBadge = VerifiedBadgeIcon;
export const Barcode = BarcodeIcon;
export const IndianRupee = IndianRupeeIcon;
