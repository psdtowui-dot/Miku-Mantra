'use client';
import React, { useState, useEffect } from 'react';
import { X, Truck, ExternalLink, AlertCircle, CheckCircle2, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { COURIER_PRESETS, generateTrackingUrl, getCourierPreset } from '@/lib/courier';

export default function ShipmentModal({ 
  order, 
  isOpen, 
  onClose, 
  onConfirm, 
  isEditOnly = false 
}) {
  const [carrier, setCarrier] = useState('Blue Dart');
  const [customCarrier, setCustomCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [urlManuallyEdited, setUrlManuallyEdited] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Prepopulate when order or isOpen changes
  useEffect(() => {
    if (!order || !isOpen) return;

    const existingCarrier = order.courier?.carrier || order.carrier || 'Blue Dart';
    const isPreset = COURIER_PRESETS.some(p => p.name.toLowerCase() === existingCarrier.toLowerCase() && p.name !== 'Custom / Other');

    if (isPreset) {
      setCarrier(existingCarrier);
      setCustomCarrier('');
    } else if (existingCarrier) {
      setCarrier('Custom / Other');
      setCustomCarrier(existingCarrier);
    } else {
      setCarrier('Blue Dart');
      setCustomCarrier('');
    }

    const existingAwb = order.courier?.trackingNumber || order.trackingNumber || '';
    setTrackingNumber(existingAwb);

    const existingUrl = order.courier?.trackingUrl || order.trackingUrl || '';
    setTrackingUrl(existingUrl);
    setUrlManuallyEdited(Boolean(existingUrl));

    setNotes(order.courier?.notes || '');
    setError('');
  }, [order, isOpen]);

  // Handle Carrier change
  const handleCarrierChange = (newCarrier) => {
    setCarrier(newCarrier);
    const effectiveCarrier = newCarrier === 'Custom / Other' ? customCarrier : newCarrier;
    
    // Auto-update tracking URL if user hasn't typed their own custom URL
    if (!urlManuallyEdited || !trackingUrl) {
      const autoUrl = generateTrackingUrl(effectiveCarrier, trackingNumber);
      setTrackingUrl(autoUrl);
    }
  };

  // Handle Custom Carrier name change
  const handleCustomCarrierChange = (val) => {
    setCustomCarrier(val);
    if (!urlManuallyEdited || !trackingUrl) {
      const autoUrl = generateTrackingUrl(val, trackingNumber);
      setTrackingUrl(autoUrl);
    }
  };

  // Handle AWB change
  const handleAwbChange = (val) => {
    const cleanVal = val.trim();
    setTrackingNumber(cleanVal);
    setError('');

    const effectiveCarrier = carrier === 'Custom / Other' ? customCarrier : carrier;
    if (!urlManuallyEdited || !trackingUrl || trackingUrl.includes(trackingNumber)) {
      const autoUrl = generateTrackingUrl(effectiveCarrier, cleanVal);
      setTrackingUrl(autoUrl);
    }
  };

  // Handle Tracking URL manual change
  const handleUrlChange = (val) => {
    setTrackingUrl(val);
    setUrlManuallyEdited(true);
  };

  // Reset URL to auto template
  const handleResetUrl = () => {
    const effectiveCarrier = carrier === 'Custom / Other' ? customCarrier : carrier;
    const autoUrl = generateTrackingUrl(effectiveCarrier, trackingNumber);
    setTrackingUrl(autoUrl);
    setUrlManuallyEdited(false);
  };

  // Submit with AWB
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const effectiveCarrier = (carrier === 'Custom / Other' ? customCarrier : carrier).trim();
    const cleanAwb = trackingNumber.trim();

    if (!effectiveCarrier) {
      setError('Please select or specify a logistics carrier partner.');
      return;
    }

    setSubmitting(true);
    try {
      await onConfirm({
        status: isEditOnly ? undefined : 'shipped',
        courier: {
          carrier: effectiveCarrier,
          trackingNumber: cleanAwb,
          trackingUrl: trackingUrl.trim(),
          notes: notes.trim(),
          shippedAt: order.courier?.shippedAt || order.shippedAt || new Date().toISOString()
        }
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to update courier tracking');
    } finally {
      setSubmitting(false);
    }
  };

  // Skip tracking / ship without AWB
  const handleSkipTracking = async () => {
    const effectiveCarrier = (carrier === 'Custom / Other' ? customCarrier : carrier).trim() || 'Standard Courier';
    setSubmitting(true);
    try {
      await onConfirm({
        status: 'shipped',
        courier: {
          carrier: effectiveCarrier,
          trackingNumber: '',
          trackingUrl: '',
          notes: notes.trim() || 'Shipped without AWB (manifest pending from carrier).',
          shippedAt: new Date().toISOString()
        }
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to mark as shipped');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !order) return null;

  const effectiveCarrier = carrier === 'Custom / Other' ? customCarrier : carrier;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[110] flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div 
        className="bg-white text-[#1A1A1A] w-full max-w-lg rounded-2xl border border-[#D4AF37]/30 shadow-2xl overflow-hidden flex flex-col my-auto transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0F0F10] text-white p-5 sm:p-6 border-b border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
              <Truck size={20} />
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl text-white font-medium">
                {isEditOnly ? 'Update Courier Tracking' : 'Dispatch & Courier Tracking'}
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Order <span className="font-mono text-[#D4AF37]">#{order.orderNumber}</span> · {order.address?.fullName || 'Customer'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2 text-xs">
              <AlertCircle size={14} className="shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Recipient Destination Preview Banner */}
          <div className="bg-[#FAF8F5] border border-[#EAE3D2] rounded-xl p-3 text-xs text-neutral-600 flex justify-between items-center">
            <div>
              <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider block">Shipment Destination</span>
              <span className="font-medium text-neutral-800">
                {order.address?.city}, {order.address?.state} — {order.address?.pincode}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider block">Payment</span>
              <span className="font-bold text-neutral-900 uppercase">
                {order.payment === 'cod' ? 'Cash on Delivery' : 'Prepaid'}
              </span>
            </div>
          </div>

          {/* 1. Courier Partner */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5 uppercase tracking-wider">
              Courier Partner <span className="text-red-500">*</span>
            </label>
            <select
              value={carrier}
              onChange={(e) => handleCarrierChange(e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-xs sm:text-sm bg-white focus:outline-none focus:border-[#9C6B30] focus:ring-1 focus:ring-[#9C6B30] cursor-pointer"
            >
              {COURIER_PRESETS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Carrier Input (if selected) */}
          {carrier === 'Custom / Other' && (
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5 uppercase tracking-wider">
                Custom Carrier Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customCarrier}
                onChange={(e) => handleCustomCarrierChange(e.target.value)}
                placeholder="e.g., SafeExpress, SpeedPost, Local Courier..."
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs sm:text-sm bg-white focus:outline-none focus:border-[#9C6B30]"
                required
              />
            </div>
          )}

          {/* 2. AWB / Tracking Number */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                AWB / Tracking Number
              </label>
              <span className="text-[10px] text-neutral-400 font-mono">Consignment barcode / code</span>
            </div>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => handleAwbChange(e.target.value)}
              placeholder="e.g., 30491829012 or BD778899"
              className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 font-mono text-xs sm:text-sm bg-white focus:outline-none focus:border-[#9C6B30] tracking-wider"
            />
          </div>

          {/* 3. Tracking URL */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                Live Tracking URL
              </label>
              {urlManuallyEdited && (
                <button
                  type="button"
                  onClick={handleResetUrl}
                  className="text-[10px] text-[#9C6B30] hover:underline"
                >
                  Reset to carrier template
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="url"
                value={trackingUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://www.bluedart.com/tracking?trackNumber=..."
                className="w-full border border-neutral-300 rounded-lg pl-3 pr-8 py-2 text-xs bg-neutral-50/50 font-mono text-neutral-700 focus:bg-white focus:outline-none focus:border-[#9C6B30]"
              />
              {trackingUrl && (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[#9C6B30]"
                  title="Test Tracking URL in new tab"
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              {trackingUrl 
                ? '✓ Customer can click "Track Package" directly to view live transit updates.' 
                : 'Auto-generates as you type the AWB number.'}
            </p>
          </div>

          {/* 4. Notes / Instructions */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5 uppercase tracking-wider">
              Handling / Packaging Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Fragile luxury jewellery package, signature required"
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#9C6B30]"
            />
          </div>

          {/* Notification Alert Banner */}
          <div className="bg-[#FAF6EF] border border-[#D4AF37]/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-neutral-600">
            <ShieldCheck size={16} className="text-[#9C6B30] shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Confirming shipment will trigger automated <strong>SMS, WhatsApp, and Email alerts</strong> to the customer with carrier details and live tracking link.
            </p>
          </div>

          {/* Modal Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 border border-neutral-300 text-neutral-600 hover:bg-neutral-100 rounded-lg font-medium text-xs transition"
            >
              Cancel
            </button>

            {/* Skip Tracking option only available when shipping initially without AWB */}
            {!isEditOnly && (
              <button
                type="button"
                onClick={handleSkipTracking}
                disabled={submitting}
                className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg font-medium text-xs transition"
                title="Ship immediately without AWB (you can add tracking anytime later)"
              >
                Skip Tracking (Ship without AWB)
              </button>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-[#9C6B30] hover:bg-[#855B29] text-white font-semibold text-xs rounded-lg transition-all shadow flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  {isEditOnly ? 'Save Courier Tracking' : 'Confirm & Ship Order'} <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
