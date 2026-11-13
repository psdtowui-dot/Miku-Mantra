'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fadeIn } from '../animations/presets';

/**
 * Standardized Accessible Modal Backdrop
 * Unifies the 33 duplicate backdrop definitions across customer and admin modals.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen Controls modal visibility
 * @param {() => void} [props.onClose] Click-outside handler
 * @param {React.ReactNode} props.children
 * @param {number} [props.zIndex=50] Stack order
 * @param {string} [props.className] Additional styles for the overlay
 * @param {string} [props.containerClassName] Container positioning styles
 */
export function ModalBackdrop({
  isOpen,
  onClose,
  children,
  zIndex = 50,
  className,
  containerClassName,
}) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    if (!isOpen || !onClose) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          style={{ zIndex }}
          className={cn(
            'fixed inset-0 flex items-center justify-center p-3 sm:p-4 overflow-y-auto',
            containerClassName
          )}
        >
          {/* Dimmed Blurred Backdrop */}
          <motion.div
            variants={fadeIn}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn(
              'fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity',
              className
            )}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal Content */}
          <div className="relative z-10 w-full max-w-lg mx-auto pointer-events-auto">
            {children}
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
