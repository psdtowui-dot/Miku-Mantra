'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Globe, Upload, Save, Loader2, Image as ImageIcon, Link as LinkIcon, Check, Eye, Truck, Star, CreditCard, ArrowRight, RotateCcw, ZoomIn, Columns, Maximize2, Crosshair, Sparkles, CheckCircle2, Sliders } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSiteSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [form, setForm] = useState({
    siteName: '',
    logo: '',
    favicon: '/favicon.ico',
    seoTitle: '',
    titleTemplate: '',
    seoDescription: '',
    keywords: '',
    shareTitle: '',
    shareDescription: '',
    shareBanner: '',
    siteUrl: '',
    customerReviewsEnabled: true,
    shipping: {
      freeShippingEnabled: true,
      freeShippingThreshold: 2000,
      standardShippingCharge: 500
    },
    zoomSettings: {
      enabled: true,
      mode: 'side-by-side',
      zoomLevel: 2.5,
      showCrosshair: true,
      lensSize: 160,
      lensBorderColor: '#D4AF37',
      allowCustomerToggle: true,
      modalZoomEnabled: true
    }
  });

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/site-settings', { credentials: 'include', cache: 'no-store' });
      if (r.ok) {
        const d = await r.json();
        setForm({
          siteName: d.siteName || '',
          logo: d.logo || '/logo.png',
          favicon: d.favicon || '/favicon.ico',
          seoTitle: d.seoTitle || '',
          titleTemplate: d.titleTemplate || '',
          seoDescription: d.seoDescription || '',
          keywords: Array.isArray(d.keywords) ? d.keywords.join(', ') : (d.keywords || ''),
          shareTitle: d.shareTitle || '',
          shareDescription: d.shareDescription || '',
          shareBanner: d.shareBanner || d.ogImage || '',
          siteUrl: d.siteUrl || '',
          customerReviewsEnabled: d.customerReviewsEnabled ?? true,
          shipping: {
            freeShippingEnabled: d.shipping?.freeShippingEnabled ?? true,
            freeShippingThreshold: d.shipping?.freeShippingThreshold ?? 2000,
            standardShippingCharge: d.shipping?.standardShippingCharge ?? 500
          },
          zoomSettings: {
            enabled: d.zoomSettings?.enabled !== false,
            mode: d.zoomSettings?.mode || 'side-by-side',
            zoomLevel: Number(d.zoomSettings?.zoomLevel) || 2.5,
            showCrosshair: d.zoomSettings?.showCrosshair !== false,
            lensSize: Number(d.zoomSettings?.lensSize) || 160,
            lensBorderColor: d.zoomSettings?.lensBorderColor || '#D4AF37',
            allowCustomerToggle: d.zoomSettings?.allowCustomerToggle !== false,
            modalZoomEnabled: d.zoomSettings?.modalZoomEnabled !== false
          }
        });
      } else {
        toast.error('Failed to load site & SEO settings');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error loading configuration');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleUploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const r = await fetch('/api/admin/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (r.ok) {
        const d = await r.json();
        setForm(prev => ({
          ...prev,
          logo: d.url
        }));
        toast.success('Brand logo uploaded successfully! Click Save Changes to apply everywhere.');
      } else {
        const d = await r.json().catch(() => ({}));
        toast.error(d.error || 'Logo upload failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Upload error');
    }
    setUploadingLogo(false);
  };

  const handleUploadFavicon = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFavicon(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const r = await fetch('/api/admin/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (r.ok) {
        const d = await r.json();
        setForm(prev => ({
          ...prev,
          favicon: d.url
        }));
        toast.success('Favicon uploaded successfully! Click Save Changes to apply everywhere.');
      } else {
        const d = await r.json().catch(() => ({}));
        toast.error(d.error || 'Favicon upload failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Upload error');
    }
    setUploadingFavicon(false);
  };

  const handleUploadBanner = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const r = await fetch('/api/admin/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (r.ok) {
        const d = await r.json();
        setForm(prev => ({
          ...prev,
          shareBanner: d.url
        }));
        toast.success('Social preview banner uploaded successfully');
      } else {
        const d = await r.json().catch(() => ({}));
        toast.error(d.error || 'Banner upload failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Upload error');
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.siteName) return toast.error('Website Name is required');
    if (form.shipping) {
      const thresh = Number(form.shipping.freeShippingThreshold);
      const std = Number(form.shipping.standardShippingCharge);
      if (isNaN(thresh) || thresh < 0) return toast.error('Free shipping threshold must be a non-negative number');
      if (isNaN(std) || std < 0) return toast.error('Standard shipping charge must be a non-negative number');
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        ogImage: form.shareBanner,
        twitterImage: form.shareBanner,
        keywords: typeof form.keywords === 'string' ? form.keywords.split(',').map(k => k.trim()).filter(Boolean) : form.keywords
      };
      const r = await fetch('/api/admin/site-settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (r.ok) {
        toast.success('Site SEO & Social Preview settings saved successfully!');
        load();
      } else {
        const d = await r.json().catch(() => ({}));
        toast.error(d.error || 'Failed to save settings');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving settings');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#9C6B30]" size={28} />
      </div>
    );
  }

  const previewDomain = (() => {
    try {
      return new URL(form.siteUrl || 'https://jwellary-site-ten.vercel.app').hostname;
    } catch {
      return 'jwellary-site-ten.vercel.app';
    }
  })();

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 pb-4 sm:pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-display text-neutral-900 font-semibold flex items-center gap-2">
            <Globe className="text-[#9C6B30] shrink-0" size={24} />
            Site & Social Preview SEO Settings
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Manage Open Graph metadata, WhatsApp/Facebook share preview banners, Twitter cards, and search engine titles dynamically.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-[#9C6B30] text-white hover:bg-[#825725] px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors shrink-0 disabled:opacity-50 shadow-xs w-full sm:w-auto"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-2 space-y-6">

          {/* Quick Link: Payment Gateways & Razorpay */}
          <Link
            href="/admin/payment-settings"
            className="flex items-center justify-between p-4 bg-gradient-to-r from-[#FAF6EF] to-white border border-[#9C6B30]/30 rounded-xl hover:border-[#9C6B30] transition group shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#9C6B30]/10 text-[#9C6B30] flex items-center justify-center font-bold">
                <CreditCard size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-neutral-900 group-hover:text-[#9C6B30] flex items-center gap-1.5 transition">
                  Manage Payment Gateways &amp; Razorpay CMS
                  <ArrowRight size={13} className="text-[#9C6B30] transition-transform group-hover:translate-x-1" />
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  Enable/remove Razorpay, manage API keys, and configure Cash on Delivery.
                </div>
              </div>
            </div>
          </Link>

          {/* Section 1: General Branding & URLs */}
          <div className="bg-white p-4 xs:p-6 rounded-xl border border-neutral-200 shadow-xs space-y-4">
            <h2 className="text-xs sm:text-sm font-bold text-neutral-800 uppercase tracking-wider border-b border-neutral-100 pb-2">
              Branding & Base Settings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                  Website / Brand Name *
                </label>
                <input
                  type="text"
                  value={form.siteName}
                  onChange={e => setForm({ ...form, siteName: e.target.value })}
                  placeholder="e.g. MikuMantra Fine Jewellery"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                  Canonical Base URL
                </label>
                <input
                  type="url"
                  value={form.siteUrl}
                  onChange={e => setForm({ ...form, siteUrl: e.target.value })}
                  placeholder="https://yourdomain.com"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>
            </div>

            {/* Global Brand Logo */}
            <div className="pt-3 border-t border-neutral-100">
              <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                Global Brand Logo *
              </label>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="w-24 h-16 rounded-lg border border-neutral-200 bg-neutral-900/90 flex items-center justify-center p-2 shrink-0 shadow-inner overflow-hidden">
                  {form.logo ? (
                    <img
                      src={form.logo}
                      alt="Brand Logo Preview"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <ImageIcon size={22} className="text-neutral-500" />
                  )}
                </div>
                <div className="flex-1 w-full space-y-2">
                  <div className="flex flex-col xs:flex-row gap-2">
                    <input
                      type="text"
                      value={form.logo}
                      onChange={e => setForm({ ...form, logo: e.target.value })}
                      placeholder="e.g. /logo.png or https://..."
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                    />
                    <label className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 shrink-0 border border-neutral-200 transition-colors">
                      {uploadingLogo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      <span>{uploadingLogo ? 'Uploading...' : 'Upload Logo'}</span>
                      <input type="file" accept="image/*" onChange={handleUploadLogo} className="hidden" />
                    </label>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    💡 Changing this logo updates it globally: header navigation (desktop &amp; mobile), footer, admin portal sidebar/header, login/recovery screens, and invoice PDFs.
                  </p>
                </div>
              </div>
            </div>

            {/* Website Favicon (Browser Tab Icon) */}
            <div className="pt-4 border-t border-neutral-100">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block">
                  Website Favicon (Browser Tab Icon)
                </label>
                {form.favicon && form.favicon !== '/favicon.ico' && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm(prev => ({ ...prev, favicon: '/favicon.ico' }));
                      toast.info('Favicon reset to default (/favicon.ico). Remember to Save Changes.');
                    }}
                    className="text-[11px] text-[#9C6B30] hover:text-[#7d5424] font-medium flex items-center gap-1 transition"
                  >
                    <RotateCcw size={12} />
                    Reset to Default
                  </button>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="w-16 h-16 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-center p-2 shrink-0 shadow-inner overflow-hidden relative group">
                  {form.favicon ? (
                    <img
                      src={form.favicon}
                      alt="Favicon Preview"
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        e.target.src = '/favicon.ico';
                      }}
                    />
                  ) : (
                    <Globe size={24} className="text-neutral-400" />
                  )}
                  <span className="absolute bottom-0 inset-x-0 bg-neutral-900/80 text-[8px] text-white text-center py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    TAB ICON
                  </span>
                </div>
                <div className="flex-1 w-full space-y-2">
                  <div className="flex flex-col xs:flex-row gap-2">
                    <input
                      type="text"
                      value={form.favicon || ''}
                      onChange={e => setForm({ ...form, favicon: e.target.value })}
                      placeholder="e.g. /favicon.ico or /uploads/... or https://..."
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                    />
                    <label className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 shrink-0 border border-neutral-200 transition-colors">
                      {uploadingFavicon ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      <span>{uploadingFavicon ? 'Uploading...' : 'Upload Favicon'}</span>
                      <input
                        type="file"
                        accept=".ico,.png,.svg,.webp,image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml,image/webp"
                        onChange={handleUploadFavicon}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-400">
                    <span>💡 Appears in browser tabs, bookmarks, and mobile home screen shortcuts.</span>
                    <span className="text-neutral-500 font-medium">Formats: .ico, .png, .svg, .webp (Recommended: 32×32 or 48×48 px)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Shipping & Delivery Rules */}
          <div className="bg-white p-4 xs:p-6 rounded-xl border border-neutral-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <h2 className="text-xs sm:text-sm font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-2">
                <Truck className="text-[#9C6B30]" size={16} />
                Shipping & Delivery Rules
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-semibold text-neutral-700">Enable Free Shipping</span>
                <input
                  type="checkbox"
                  checked={form.shipping?.freeShippingEnabled ?? true}
                  onChange={e => setForm(prev => ({
                    ...prev,
                    shipping: { ...prev.shipping, freeShippingEnabled: e.target.checked }
                  }))}
                  className="w-4 h-4 accent-[#9C6B30] rounded cursor-pointer"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                  Free Shipping Threshold (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.shipping?.freeShippingThreshold ?? 2000}
                  onChange={e => setForm(prev => ({
                    ...prev,
                    shipping: { ...prev.shipping, freeShippingThreshold: e.target.value === '' ? '' : Number(e.target.value) }
                  }))}
                  placeholder="e.g. 2000"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  Orders equal to or above this subtotal qualify for ₹0 shipping.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                  Standard Shipping Charge (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.shipping?.standardShippingCharge ?? 500}
                  onChange={e => setForm(prev => ({
                    ...prev,
                    shipping: { ...prev.shipping, standardShippingCharge: e.target.value === '' ? '' : Number(e.target.value) }
                  }))}
                  placeholder="e.g. 500"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  Applied when order subtotal is below threshold or free shipping is disabled.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Customer Reviews Settings */}
          <div className="bg-white p-4 xs:p-6 rounded-xl border border-neutral-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-2">
                  <Star className="text-[#D4AF37]" size={16} />
                  Customer Reviews System
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Control whether customer reviews can be submitted on product & order pages.
                </p>
              </div>
              <label className="flex items-center gap-3 cursor-pointer bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200 hover:border-[#9C6B30] transition">
                <span className={`text-xs font-semibold ${form.customerReviewsEnabled ? 'text-emerald-700' : 'text-neutral-500'}`}>
                  Customer Reviews: {form.customerReviewsEnabled ? 'ON' : 'OFF'}
                </span>
                <input
                  type="checkbox"
                  checked={form.customerReviewsEnabled ?? true}
                  onChange={e => setForm(prev => ({ ...prev, customerReviewsEnabled: e.target.checked }))}
                  className="w-4 h-4 accent-[#9C6B30] rounded cursor-pointer"
                />
              </label>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              When turned <strong className="text-emerald-700 font-semibold">ON</strong>, customers with delivered orders can submit verified product reviews. When turned <strong className="text-red-600 font-semibold">OFF</strong>, review forms and submission buttons are hidden globally and backend API submission is blocked. Admin-published reviews will still display.
            </p>
          </div>

          {/* Section: Product Image Zoom Controls & Settings */}
          <div className="bg-white p-4 xs:p-6 rounded-xl border border-neutral-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-2">
                  <ZoomIn className="text-[#9C6B30]" size={17} />
                  Product Image Zoom Controls &amp; Settings
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Control how jewelry products are magnified for customers. Select Side-by-Side Lens Zoom, Inner In-Place Zoom, or allow customers to toggle both.
                </p>
              </div>
              <label className="flex items-center gap-3 cursor-pointer bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200 hover:border-[#9C6B30] transition shrink-0">
                <span className={`text-xs font-semibold ${form.zoomSettings?.enabled !== false ? 'text-emerald-700' : 'text-neutral-500'}`}>
                  Zoom: {form.zoomSettings?.enabled !== false ? 'ACTIVE' : 'OFF'}
                </span>
                <input
                  type="checkbox"
                  checked={form.zoomSettings?.enabled !== false}
                  onChange={e => setForm(prev => ({
                    ...prev,
                    zoomSettings: { ...prev.zoomSettings, enabled: e.target.checked }
                  }))}
                  className="w-4 h-4 accent-[#9C6B30] rounded cursor-pointer"
                />
              </label>
            </div>

            {/* Zoom Functionality Mode Selector */}
            <div>
              <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block mb-2">
                Active Zoom Functionality Mode *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Side-by-Side Lens Zoom */}
                <button
                  type="button"
                  onClick={() => setForm(prev => ({
                    ...prev,
                    zoomSettings: { ...prev.zoomSettings, mode: 'side-by-side' }
                  }))}
                  className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                    form.zoomSettings?.mode === 'side-by-side'
                      ? 'border-[#9C6B30] bg-[#FAF6EF] ring-2 ring-[#9C6B30]/20 shadow-xs'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-[#9C6B30]/10 text-[#9C6B30] flex items-center justify-center">
                      <Columns size={16} />
                    </div>
                    <span className="bg-[#9C6B30] text-white text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full">
                      Recommended
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-neutral-900 mb-1">Side-by-Side Lens</h3>
                    <p className="text-[11px] text-neutral-500 leading-snug">
                      Hover lens with crosshairs on image; magnified detail displays in adjacent side window.
                    </p>
                  </div>
                  {form.zoomSettings?.mode === 'side-by-side' && (
                    <div className="mt-2 text-[10px] font-bold text-[#9C6B30] flex items-center gap-1">
                      <CheckCircle2 size={12} /> Active Mode
                    </div>
                  )}
                </button>

                {/* 2. Inner In-Place Zoom */}
                <button
                  type="button"
                  onClick={() => setForm(prev => ({
                    ...prev,
                    zoomSettings: { ...prev.zoomSettings, mode: 'inner' }
                  }))}
                  className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                    form.zoomSettings?.mode === 'inner'
                      ? 'border-[#9C6B30] bg-[#FAF6EF] ring-2 ring-[#9C6B30]/20 shadow-xs'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-[#9C6B30]/10 text-[#9C6B30] flex items-center justify-center">
                      <Maximize2 size={16} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-neutral-900 mb-1">Inner In-Place</h3>
                    <p className="text-[11px] text-neutral-500 leading-snug">
                      Hover smoothly scales and pans the image directly inside its frame without a separate pane.
                    </p>
                  </div>
                  {form.zoomSettings?.mode === 'inner' && (
                    <div className="mt-2 text-[10px] font-bold text-[#9C6B30] flex items-center gap-1">
                      <CheckCircle2 size={12} /> Active Mode
                    </div>
                  )}
                </button>

                {/* 3. Both / Customer Switcher */}
                <button
                  type="button"
                  onClick={() => setForm(prev => ({
                    ...prev,
                    zoomSettings: { ...prev.zoomSettings, mode: 'both' }
                  }))}
                  className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                    form.zoomSettings?.mode === 'both'
                      ? 'border-[#9C6B30] bg-[#FAF6EF] ring-2 ring-[#9C6B30]/20 shadow-xs'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center">
                      <Sliders size={16} />
                    </div>
                    <span className="bg-neutral-800 text-white text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full">
                      Dual Mode
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-neutral-900 mb-1">Both / Switcher</h3>
                    <p className="text-[11px] text-neutral-500 leading-snug">
                      Enables both zoom styles with an on-screen toggle pill so customers can choose between Side &amp; Inner zoom.
                    </p>
                  </div>
                  {form.zoomSettings?.mode === 'both' && (
                    <div className="mt-2 text-[10px] font-bold text-[#9C6B30] flex items-center gap-1">
                      <CheckCircle2 size={12} /> Active Mode
                    </div>
                  )}
                </button>

                {/* 4. Disabled */}
                <button
                  type="button"
                  onClick={() => setForm(prev => ({
                    ...prev,
                    zoomSettings: { ...prev.zoomSettings, mode: 'disabled' }
                  }))}
                  className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                    form.zoomSettings?.mode === 'disabled'
                      ? 'border-red-400 bg-red-50/50 ring-2 ring-red-300 shadow-xs'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                      <RotateCcw size={16} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-neutral-900 mb-1">Turn Off Zoom</h3>
                    <p className="text-[11px] text-neutral-500 leading-snug">
                      Disables hover magnification entirely across all product pages.
                    </p>
                  </div>
                  {form.zoomSettings?.mode === 'disabled' && (
                    <div className="mt-2 text-[10px] font-bold text-red-600 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Disabled
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Magnification Level & Lens Reticle Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-neutral-100">
              {/* Magnification Level */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block">
                  Magnification Scale: <strong className="text-[#9C6B30]">{form.zoomSettings?.zoomLevel || 2.5}x</strong>
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {[1.5, 2.0, 2.5, 3.0, 4.0].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setForm(prev => ({
                        ...prev,
                        zoomSettings: { ...prev.zoomSettings, zoomLevel: lvl }
                      }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        Number(form.zoomSettings?.zoomLevel) === lvl
                          ? 'bg-[#1A1A1A] text-white shadow-xs'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      }`}
                    >
                      {lvl.toFixed(1)}x {lvl === 2.5 && '★'}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-neutral-400">
                  💡 2.5x is recommended for fine gold and diamond craftsmanship.
                </p>
              </div>

              {/* Lens Size (for Side-by-Side Zoom) */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block">
                  Magnifier Lens Box Size: <strong className="text-[#9C6B30]">{form.zoomSettings?.lensSize || 160} px</strong>
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { label: 'Compact', size: 130 },
                    { label: 'Standard', size: 160 },
                    { label: 'Large', size: 200 }
                  ].map((s) => (
                    <button
                      key={s.size}
                      type="button"
                      onClick={() => setForm(prev => ({
                        ...prev,
                        zoomSettings: { ...prev.zoomSettings, lensSize: s.size }
                      }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        Number(form.zoomSettings?.lensSize) === s.size
                          ? 'bg-[#1A1A1A] text-white shadow-xs'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      }`}
                    >
                      {s.label} ({s.size}px)
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-neutral-400">
                  💡 Dimensions of the square selector box following the cursor on the main product image.
                </p>
              </div>
            </div>

            {/* Crosshairs & Additional Options */}
            <div className="pt-3 border-t border-neutral-100 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Crosshair lines toggle */}
                <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Crosshair size={18} className="text-[#9C6B30] shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-neutral-800">Show Crosshair Reticle Inside Lens</div>
                      <div className="text-[11px] text-neutral-500">Displays precise crossing lines (+) centered in the lens box.</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.zoomSettings?.showCrosshair !== false}
                    onChange={e => setForm(prev => ({
                      ...prev,
                      zoomSettings: { ...prev.zoomSettings, showCrosshair: e.target.checked }
                    }))}
                    className="w-4 h-4 accent-[#9C6B30] rounded cursor-pointer shrink-0"
                  />
                </div>

                {/* Customer toggle button on storefront */}
                <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Sliders size={18} className="text-[#9C6B30] shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-neutral-800">Allow Customer Mode Switcher</div>
                      <div className="text-[11px] text-neutral-500">Shows a luxury toggle pill so visitors can switch between Side and Inner Zoom.</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.zoomSettings?.allowCustomerToggle !== false}
                    onChange={e => setForm(prev => ({
                      ...prev,
                      zoomSettings: { ...prev.zoomSettings, allowCustomerToggle: e.target.checked }
                    }))}
                    className="w-4 h-4 accent-[#9C6B30] rounded cursor-pointer shrink-0"
                  />
                </div>

                {/* Modal Lightbox toggle */}
                <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <ZoomIn size={18} className="text-[#9C6B30] shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-neutral-800">Fullscreen Click-to-Enlarge Modal</div>
                      <div className="text-[11px] text-neutral-500">Enables the magnifying glass button at the bottom right for full lightbox view.</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.zoomSettings?.modalZoomEnabled !== false}
                    onChange={e => setForm(prev => ({
                      ...prev,
                      zoomSettings: { ...prev.zoomSettings, modalZoomEnabled: e.target.checked }
                    }))}
                    className="w-4 h-4 accent-[#9C6B30] rounded cursor-pointer shrink-0"
                  />
                </div>

                {/* Lens Border Color Picker */}
                <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/60 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-neutral-800">Lens &amp; Crosshair Color</div>
                    <div className="text-[11px] text-neutral-500">Luxury accent color of the lens reticle.</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[
                      { name: 'Gold', color: '#D4AF37' },
                      { name: 'Bronze', color: '#9C6B30' },
                      { name: 'Dark', color: '#1A1A1A' },
                      { name: 'Rose', color: '#B76E79' },
                    ].map(c => (
                      <button
                        key={c.color}
                        type="button"
                        onClick={() => setForm(prev => ({
                          ...prev,
                          zoomSettings: { ...prev.zoomSettings, lensBorderColor: c.color }
                        }))}
                        className={`w-6 h-6 rounded-full border-2 transition transform hover:scale-110 cursor-pointer ${
                          form.zoomSettings?.lensBorderColor === c.color ? 'border-neutral-900 ring-2 ring-[#9C6B30]/40 scale-105' : 'border-white'
                        }`}
                        style={{ backgroundColor: c.color }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* LIVE SIMULATOR FOR ADMIN */}
            <div className="pt-4 border-t border-neutral-100 bg-[#FAF6EF]/50 p-4 rounded-xl border border-[#9C6B30]/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#9C6B30]" />
                  Live Zoom Simulator (Test your settings live before saving)
                </span>
                <span className="text-[10px] text-[#9C6B30] font-semibold bg-[#9C6B30]/10 px-2 py-0.5 rounded-full">
                  Mode: {form.zoomSettings?.mode?.toUpperCase() || 'SIDE-BY-SIDE'} · Scale: {form.zoomSettings?.zoomLevel || 2.5}x
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
                {/* Simulator Card with Sample Jewelry */}
                <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-xl overflow-hidden bg-white border border-neutral-200 shadow-sm group cursor-crosshair">
                  <img
                    src="https://images.unsplash.com/photo-1685970731194-e27b477e87ba?crop=entropy&cs=srgb&fm=jpg&q=85"
                    alt="Simulator Diamond"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {form.zoomSettings?.mode === 'side-by-side' && (
                    <div
                      className="absolute top-6 left-6 rounded-xl border-2 pointer-events-none shadow-xs"
                      style={{
                        width: '80px',
                        height: '80px',
                        borderColor: form.zoomSettings?.lensBorderColor || '#D4AF37',
                        backgroundColor: 'rgba(255, 255, 255, 0.25)',
                      }}
                    >
                      {form.zoomSettings?.showCrosshair !== false && (
                        <>
                          <div
                            className="absolute top-1/2 left-0 right-0 h-[1px] -translate-y-1/2"
                            style={{ backgroundColor: form.zoomSettings?.lensBorderColor || '#D4AF37' }}
                          />
                          <div
                            className="absolute left-1/2 top-0 bottom-0 w-[1px] -translate-x-1/2"
                            style={{ backgroundColor: form.zoomSettings?.lensBorderColor || '#D4AF37' }}
                          />
                          <div
                            className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2 border border-white"
                            style={{ backgroundColor: form.zoomSettings?.lensBorderColor || '#D4AF37' }}
                          />
                        </>
                      )}
                    </div>
                  )}
                  <span className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-white/90 text-neutral-700 flex items-center justify-center shadow-xs border border-neutral-200">
                    <ZoomIn size={14} />
                  </span>
                </div>

                {/* Simulated Adjacent Zoom Pane */}
                {form.zoomSettings?.mode === 'side-by-side' && (
                  <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-xl overflow-hidden bg-[#FAF6EF] border border-[#9C6B30]/30 shadow-md relative flex items-center justify-center">
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundImage: `url('https://images.unsplash.com/photo-1685970731194-e27b477e87ba?crop=entropy&cs=srgb&fm=jpg&q=85')`,
                        backgroundSize: `${200 * (form.zoomSettings?.zoomLevel || 2.5)}%`,
                        backgroundPosition: '30% 30%',
                        backgroundRepeat: 'no-repeat'
                      }}
                    />
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-[9px] tracking-widest uppercase px-2 py-0.5 rounded-full font-semibold">
                      {form.zoomSettings?.zoomLevel || 2.5}x PREVIEW
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: SEO Meta Settings */}
          <div className="bg-white p-4 xs:p-6 rounded-xl border border-neutral-200 shadow-xs space-y-4">
            <h2 className="text-xs sm:text-sm font-bold text-neutral-800 uppercase tracking-wider border-b border-neutral-100 pb-2">
              Search Engine (SEO) Meta Tags
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                  Default SEO Title
                </label>
                <input
                  type="text"
                  value={form.seoTitle}
                  onChange={e => setForm({ ...form, seoTitle: e.target.value })}
                  placeholder="e.g. MikuMantra — House of Fine Jewellery"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                  Title Template
                </label>
                <input
                  type="text"
                  value={form.titleTemplate}
                  onChange={e => setForm({ ...form, titleTemplate: e.target.value })}
                  placeholder="e.g. %s | MikuMantra"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                Meta Description
              </label>
              <textarea
                rows={3}
                value={form.seoDescription}
                onChange={e => setForm({ ...form, seoDescription: e.target.value })}
                placeholder="Brief description for search results (approx 150-160 characters)..."
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                Keywords (Comma-separated)
              </label>
              <input
                type="text"
                value={form.keywords}
                onChange={e => setForm({ ...form, keywords: e.target.value })}
                placeholder="jewellery, gold, diamond, bridal, 22K"
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
              />
            </div>
          </div>

          {/* Section 3: Open Graph & Social Share Preview */}
          <div className="bg-white p-4 xs:p-6 rounded-xl border border-neutral-200 shadow-xs space-y-4">
            <h2 className="text-xs sm:text-sm font-bold text-neutral-800 uppercase tracking-wider border-b border-neutral-100 pb-2">
              Social Sharing & Open Graph (WhatsApp, FB, Twitter/X, LinkedIn)
            </h2>

            <div>
              <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                Social Sharing Banner Image (og:image / twitter:image)
              </label>
              <div className="flex flex-col xs:flex-row gap-2">
                <input
                  type="text"
                  value={form.shareBanner}
                  onChange={e => setForm({ ...form, shareBanner: e.target.value })}
                  placeholder="https://images.unsplash.com/... (Direct 1200x630 Image URL)"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
                <label className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 shrink-0 border border-neutral-200 transition-colors">
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  <span>Upload</span>
                  <input type="file" accept="image/*" onChange={handleUploadBanner} className="hidden" />
                </label>
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">Recommended size: 1200 × 630 pixels. Must be an absolute public URL.</p>
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                Social Sharing Title (og:title / twitter:title)
              </label>
              <input
                type="text"
                value={form.shareTitle}
                onChange={e => setForm({ ...form, shareTitle: e.target.value })}
                placeholder="Title shown when link is shared on WhatsApp, Facebook, etc."
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                Social Sharing Description (og:description / twitter:description)
              </label>
              <textarea
                rows={3}
                value={form.shareDescription}
                onChange={e => setForm({ ...form, shareDescription: e.target.value })}
                placeholder="Description shown under title in WhatsApp/Facebook link previews..."
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Live Previews */}
        <div className="space-y-6 lg:sticky top-6">
          {/* Live Browser Tab Preview Simulator */}
          <div className="bg-white p-4 xs:p-6 rounded-xl border border-neutral-200 shadow-xs">
            <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Globe size={16} className="text-[#9C6B30]" />
              Live Browser Tab Preview
            </h2>
            <div className="rounded-xl border border-neutral-200 bg-[#E3E5E8] overflow-hidden shadow-xs">
              {/* Browser window controls and tab header */}
              <div className="flex items-center gap-2 px-3 pt-2.5 pb-0">
                <div className="flex items-center gap-1.5 shrink-0 mr-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EC6A5E] inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F4BF4F] inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#62C554] inline-block" />
                </div>
                {/* Active Tab */}
                <div className="flex-1 max-w-[240px] bg-white rounded-t-lg px-2.5 py-1.5 flex items-center gap-2 shadow-xs border-t border-x border-neutral-200/80">
                  <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                    {form.favicon ? (
                      <img
                        src={form.favicon}
                        alt="Tab Favicon"
                        className="w-4 h-4 object-contain"
                        onError={(e) => { e.target.src = '/favicon.ico'; }}
                      />
                    ) : (
                      <Globe size={13} className="text-[#9C6B30]" />
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-neutral-800 truncate select-none">
                    {form.seoTitle || form.siteName || 'MikuMantra Fine Jewellery'}
                  </span>
                  <span className="text-[11px] text-neutral-400 hover:text-neutral-600 ml-auto cursor-default">×</span>
                </div>
              </div>

              {/* Browser Address Bar */}
              <div className="bg-white px-3 py-2 border-t border-neutral-200 flex items-center gap-2 text-neutral-500">
                <div className="flex-1 bg-neutral-100 rounded-md px-2.5 py-1 flex items-center gap-2 text-[11px] font-mono text-neutral-600 truncate border border-neutral-200/60">
                  <span className="text-emerald-600 text-[10px]">🔒</span>
                  <span className="truncate">
                    {form.siteUrl ? form.siteUrl.replace(/^https?:\/\//, '') : 'mikumantra.vercel.app'}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-neutral-500 mt-2.5 leading-relaxed">
              Real-time preview of how your brand favicon and title look on desktop &amp; mobile browser tabs.
            </p>
          </div>

          {/* Simulated WhatsApp / Facebook Link Card */}
          <div className="bg-white p-4 xs:p-6 rounded-xl border border-neutral-200 shadow-xs">
            <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Eye size={16} className="text-[#9C6B30]" />
              Live Social Share Preview
            </h2>

            <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-md bg-[#F4F4F5]">
              {form.shareBanner ? (
                <div className="aspect-[1.91/1] overflow-hidden bg-neutral-900 relative">
                  <img
                    src={form.shareBanner}
                    alt="Social Banner Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="aspect-[1.91/1] bg-neutral-200 flex items-center justify-center text-neutral-400">
                  <ImageIcon size={32} />
                </div>
              )}

              <div className="p-3.5 bg-white border-t border-neutral-100">
                <div className="text-[10px] text-neutral-400 uppercase font-mono tracking-wider truncate mb-1">
                  {previewDomain}
                </div>
                <div className="font-semibold text-xs text-neutral-900 line-clamp-1 mb-1">
                  {form.shareTitle || form.seoTitle || form.siteName || 'Title Preview'}
                </div>
                <div className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed">
                  {form.shareDescription || form.seoDescription || 'Description preview will appear here when shared.'}
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 leading-relaxed">
              <span className="font-semibold">Note for Social Platforms:</span> WhatsApp and Facebook cache Open Graph previews. Updating the settings here updates server-rendered HTML immediately.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
