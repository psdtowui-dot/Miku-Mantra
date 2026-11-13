'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, BarChart2, Target, Check, RotateCcw } from 'lucide-react';
import {
  getStoredConsent,
  updateConsent,
  onOpenPrivacySettings,
  DEFAULT_CONSENT_STATE,
} from '@/lib/analytics/consent';
import { toast } from 'sonner';

export default function PrivacySettings({ isOpen, onClose }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  // Synchronize with external or internal open triggers
  const showModal = isOpen !== undefined ? isOpen : internalOpen;

  useEffect(() => {
    const unsubscribe = onOpenPrivacySettings(() => {
      const stored = getStoredConsent() || DEFAULT_CONSENT_STATE;
      setAnalytics(Boolean(stored.analytics));
      setMarketing(Boolean(stored.marketing));
      setInternalOpen(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (showModal) {
      const stored = getStoredConsent() || DEFAULT_CONSENT_STATE;
      setAnalytics(Boolean(stored.analytics));
      setMarketing(Boolean(stored.marketing));
    }
  }, [showModal]);

  const handleClose = () => {
    if (onClose) onClose();
    setInternalOpen(false);
  };

  const handleSave = () => {
    updateConsent({
      necessary: true,
      analytics,
      marketing,
    });
    toast.success('Your privacy preferences have been updated.');
    handleClose();
  };

  const handleAcceptAll = () => {
    setAnalytics(true);
    setMarketing(true);
    updateConsent({
      necessary: true,
      analytics: true,
      marketing: true,
    });
    toast.success('All cookie categories accepted.');
    handleClose();
  };

  const handleRejectOptional = () => {
    setAnalytics(false);
    setMarketing(false);
    updateConsent({
      necessary: true,
      analytics: false,
      marketing: false,
    });
    toast.info('Optional cookies declined. Only necessary cookies remain active.');
    handleClose();
  };

  return (
    <AnimatePresence>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-modal-title"
            className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-[#E8E8E8] overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-[#E8E8E8] flex items-center justify-between bg-[#FAF6EF]/60">
              <div>
                <div className="text-[10px] tracking-[0.25em] uppercase text-[#9C6B30] font-medium">
                  Privacy Center
                </div>
                <h2 id="privacy-modal-title" className="font-display text-xl text-[#1A1A1A] font-light">
                  Cookie &amp; Tracking Preferences
                </h2>
              </div>
              <button
                onClick={handleClose}
                aria-label="Close privacy preferences"
                className="w-8 h-8 rounded-full border border-neutral-300 hover:border-[#9C6B30] hover:text-[#9C6B30] flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm text-neutral-600">
              <p className="text-xs text-neutral-500 leading-relaxed">
                MikuMantra uses first-party and Google cookies to provide core e-commerce functionality,
                ensure transaction safety, analyze boutique engagement, and deliver tailored experiences.
                You can customize your preferences below in accordance with Google Consent Mode v2.
              </p>

              {/* Category 1: Strictly Necessary */}
              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <div className="font-medium text-[#1A1A1A] text-sm">
                        Strictly Necessary Cookies
                      </div>
                      <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                        Required for secure login authentication, shopping bag persistence, checkout
                        security, and order verification. Cannot be disabled.
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] tracking-wider uppercase font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                    Always Active
                  </span>
                </div>
              </div>

              {/* Category 2: Performance & Analytics */}
              <div className="p-4 rounded-xl border border-neutral-200 hover:border-[#9C6B30]/40 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-[#9C6B30] flex items-center justify-center shrink-0 mt-0.5">
                      <BarChart2 size={18} />
                    </div>
                    <div>
                      <div className="font-medium text-[#1A1A1A] text-sm">
                        Analytics &amp; Performance
                      </div>
                      <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                        Allows Google Analytics 4 and Tag Manager to measure anonymous visitor journeys,
                        navigation patterns, and popular jewellery collections to help us refine atelier services.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={analytics}
                      onChange={(e) => setAnalytics(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9C6B30]"></div>
                  </label>
                </div>
              </div>

              {/* Category 3: Marketing & Personalization */}
              <div className="p-4 rounded-xl border border-neutral-200 hover:border-[#9C6B30]/40 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Target size={18} />
                    </div>
                    <div>
                      <div className="font-medium text-[#1A1A1A] text-sm">
                        Marketing &amp; Personalization
                      </div>
                      <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                        Enables Google Ads consent parameters (<code className="text-[11px] font-mono">ad_storage</code>, <code className="text-[11px] font-mono">ad_user_data</code>, <code className="text-[11px] font-mono">ad_personalization</code>) to present relevant fine jewellery announcements and measure campaign reach.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={marketing}
                      onChange={(e) => setMarketing(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9C6B30]"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 border-t border-[#E8E8E8] bg-[#FAF6EF]/40 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRejectOptional}
                className="w-full sm:w-auto px-4 py-2.5 text-xs text-neutral-600 hover:text-[#1A1A1A] font-medium tracking-wider uppercase transition-colors"
              >
                Reject Optional
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 sm:flex-initial px-5 py-2.5 bg-white border border-[#1A1A1A] text-[#1A1A1A] hover:bg-neutral-100 text-xs font-medium tracking-wider uppercase rounded-md transition-colors"
                >
                  Save Preferences
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#1A1A1A] hover:bg-[#9C6B30] text-white text-xs font-medium tracking-wider uppercase rounded-md transition-colors shadow-xs"
                >
                  Accept All
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
