'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, Shield, SlidersHorizontal, Check, X } from 'lucide-react';
import {
  hasUserDecidedConsent,
  updateConsent,
  onConsentChange,
} from '@/lib/analytics/consent';
import PrivacySettings from './PrivacySettings';

export default function ConsentBanner() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Only display banner if the user hasn't made a prior choice
    if (!hasUserDecidedConsent()) {
      // Short delay for smooth entrance without competing with initial layout paint
      const timer = setTimeout(() => {
        setVisible(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen to any external consent changes (e.g. from footer settings modal) to hide banner
  useEffect(() => {
    const unsubscribe = onConsentChange(() => {
      setVisible(false);
    });
    return unsubscribe;
  }, []);

  if (!mounted) return null;

  const handleAcceptAll = () => {
    updateConsent({
      necessary: true,
      analytics: true,
      marketing: true,
    });
    setVisible(false);
  };

  const handleRejectOptional = () => {
    updateConsent({
      necessary: true,
      analytics: false,
      marketing: false,
    });
    setVisible(false);
  };

  const handleOpenCustomize = () => {
    setShowSettingsModal(true);
  };

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            role="region"
            aria-label="Cookie consent banner"
            className="fixed bottom-0 inset-x-0 z-40 p-3 sm:p-4 md:p-6 pointer-events-none"
          >
            <div className="max-w-[1400px] mx-auto bg-white/95 backdrop-blur-md border border-[#E8E8E8] shadow-2xl rounded-2xl p-4 sm:p-5 md:p-6 pointer-events-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 md:gap-6">
              <div className="flex items-start gap-3 sm:gap-4 max-w-4xl">
                <div className="w-10 h-10 rounded-xl bg-[#FAF6EF] text-[#9C6B30] flex items-center justify-center shrink-0 mt-0.5 border border-[#9C6B30]/20">
                  <Shield size={20} />
                </div>
                <div>
                  <div className="text-[10px] tracking-[0.25em] uppercase text-[#9C6B30] font-semibold mb-0.5">
                    Your Privacy at MikuMantra
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-sans">
                    We use cookies and Google services to enhance your luxury shopping experience, ensure transaction security, and analyze boutique performance. You may choose to accept all cookies, proceed with strictly necessary cookies only, or tailor your preferences via Google Consent Mode v2.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 sm:gap-3 w-full lg:w-auto shrink-0 justify-end">
                <button
                  type="button"
                  onClick={handleOpenCustomize}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs text-neutral-600 hover:text-[#9C6B30] border border-neutral-300 hover:border-[#9C6B30] font-medium tracking-wider uppercase rounded-md transition-colors flex items-center justify-center gap-1.5"
                >
                  <SlidersHorizontal size={13} />
                  <span>Customize</span>
                </button>

                <button
                  type="button"
                  onClick={handleRejectOptional}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs text-neutral-800 bg-white hover:bg-neutral-100 border border-[#1A1A1A] font-medium tracking-wider uppercase rounded-md transition-colors text-center"
                >
                  Reject Optional
                </button>

                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs text-white bg-[#1A1A1A] hover:bg-[#9C6B30] font-medium tracking-wider uppercase rounded-md transition-colors shadow-xs text-center"
                >
                  Accept All
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PrivacySettings
        isOpen={showSettingsModal}
        onClose={() => {
          setShowSettingsModal(false);
          // If consent was decided in modal, ensure banner is dismissed
          if (hasUserDecidedConsent()) {
            setVisible(false);
          }
        }}
      />
    </>
  );
}
