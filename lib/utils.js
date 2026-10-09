import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getCancellationLabel(order) {
  if (!order || order.status !== 'cancelled') return '';
  if (order.cancelledBy === 'admin') return 'Cancelled by MikuMantra';
  if (order.cancelledBy === 'customer' || order.cancelledBy === 'user') return 'Cancelled by Customer';
  return 'Order Cancelled';
}

export function getCancellationActor(order) {
  if (!order) return '';
  if (order.cancelledBy === 'admin') return 'MikuMantra (Admin)';
  if (order.cancelledBy === 'customer' || order.cancelledBy === 'user') return 'Customer';
  if (order.cancelledByRole) return order.cancelledByRole === 'admin' ? 'MikuMantra (Admin)' : 'Customer';
  return order.cancelledBy || 'Unavailable';
}
