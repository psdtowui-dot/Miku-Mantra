import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Centralized helper for displaying order cancellation label.
 * Logic:
 * - If status !== 'cancelled', returns null.
 * - If cancelledBy === 'customer', returns "Cancelled by customer".
 * - If cancelledBy === 'admin' or 'mikumantra', returns "Cancelled by MikuMantra".
 * - If cancelledBy is missing/null, falls back safely to "Cancelled".
 *
 * @param {Object} order
 * @returns {string|null}
 */
export function getCancellationLabel(order) {
  if (!order || order.status !== 'cancelled') {
    return null;
  }

  const source = (order.cancelledBy || '').toLowerCase();
  if (source === 'customer') {
    return 'Cancelled by customer';
  }
  if (source === 'admin' || source === 'mikumantra') {
    return 'Cancelled by MikuMantra';
  }

  return 'Cancelled';
}

/**
 * Returns the human-readable actor who cancelled the order (e.g., 'Customer', 'MikuMantra', or null).
 * @param {Object} order
 * @returns {string|null}
 */
export function getCancellationActor(order) {
  if (!order || order.status !== 'cancelled') {
    return null;
  }

  const source = (order.cancelledBy || '').toLowerCase();
  if (source === 'customer') {
    return 'Customer';
  }
  if (source === 'admin' || source === 'mikumantra') {
    return 'MikuMantra';
  }

  return null;
}

