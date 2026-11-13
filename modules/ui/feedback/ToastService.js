import { toast } from 'sonner';

/**
 * Standardized notification dispatcher wrapping sonner toast
 * Applies consistent luxury styling, durations, and action handlers.
 */
export const notify = {
  success: (message, options = {}) => {
    return toast.success(message, {
      duration: 3500,
      className: 'font-sans text-sm border-emerald-200 text-emerald-900 bg-emerald-50/90',
      ...options,
    });
  },

  error: (message, options = {}) => {
    return toast.error(message, {
      duration: 4500,
      className: 'font-sans text-sm border-rose-200 text-rose-900 bg-rose-50/90',
      ...options,
    });
  },

  info: (message, options = {}) => {
    return toast.info(message, {
      duration: 3500,
      className: 'font-sans text-sm border-[#9C6B30]/20 text-[#1A1A1A] bg-[#FAF6EF]',
      ...options,
    });
  },

  warning: (message, options = {}) => {
    return toast.warning(message, {
      duration: 4000,
      className: 'font-sans text-sm border-amber-200 text-amber-900 bg-amber-50/90',
      ...options,
    });
  },

  loading: (message, options = {}) => {
    return toast.loading(message, {
      className: 'font-sans text-sm border-[#9C6B30]/30 text-[#1A1A1A] bg-white',
      ...options,
    });
  },

  dismiss: (id) => toast.dismiss(id),
};
