'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Standardized status badge for e-commerce states.
 * 
 * @param {Object} props
 * @param {string} props.status Status string (e.g. 'DELIVERED', 'SHIPPED', 'CANCELLED')
 * @param {string} [props.label] Custom label override
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {string} [props.className]
 */
export function StatusBadge({ status = '', label, size = 'md', className }) {
  const normalized = String(status).toUpperCase().trim();

  // Color mapping based on semantic domain
  const colorMap = {
    // Orders / Shipments
    DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    SHIPPED: 'bg-blue-50 text-blue-700 border-blue-200',
    OUT_FOR_DELIVERY: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    PROCESSING: 'bg-amber-50 text-amber-700 border-amber-200',
    CONFIRMED: 'bg-sky-50 text-sky-700 border-sky-200',
    PLACED: 'bg-neutral-50 text-neutral-700 border-neutral-200',
    PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
    // Returns / Refunds
    APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    // Stock / Inventory
    IN_STOCK: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    LOW_STOCK: 'bg-amber-50 text-amber-700 border-amber-200',
    OUT_OF_STOCK: 'bg-rose-50 text-rose-700 border-rose-200',
    // Reviews
    VERIFIED: 'bg-[#FAF6EF] text-[#9C6B30] border-[#9C6B30]/30',
  };

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 tracking-wider',
    md: 'text-xs px-2.5 py-1 tracking-wide',
    lg: 'text-sm px-3 py-1.5 tracking-wide',
  };

  const displayLabel = label || normalized.replace(/_/g, ' ');
  const colors = colorMap[normalized] || 'bg-neutral-100 text-neutral-700 border-neutral-200';

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium uppercase border rounded-full font-sans transition-colors',
        sizeClasses[size] || sizeClasses.md,
        colors,
        className
      )}
    >
      {displayLabel}
    </span>
  );
}
