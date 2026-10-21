'use client';

import { useEffect, useState } from 'react';
import {
  Save, Loader2, RefreshCw, Send, CheckCircle2,
  AlertCircle, Smartphone, Monitor, Copy, Check,
  ShoppingBag, Truck, BellRing, KeyRound, HeartHandshake,
  ExternalLink, Power, ShieldCheck, Package, Compass, XCircle, Wallet
} from 'lucide-react';
import { toast } from 'sonner';

const TEMPLATE_TABS = [
  {
    id: 'order_confirmation',
    label: 'Order Confirmation',
    sublabel: 'Customer checkout email',
    icon: ShoppingBag,
    category: 'Orders'
  },
  {
    id: 'order_processing',
    label: 'Order Processing',
    sublabel: 'In production & packing',
    icon: Package,
    category: 'Orders'
  },
  {
    id: 'order_shipped',
    label: 'Shipment & Tracking',
    sublabel: 'Dispatch notification',
    icon: Truck,
    category: 'Orders'
  },
  {
    id: 'order_out_for_delivery',
    label: 'Out for Delivery',
    sublabel: 'Day of delivery alert',
    icon: Compass,
    category: 'Orders'
  },
  {
    id: 'order_delivered',
    label: 'Order Delivered',
    sublabel: 'Delivery completion notice',
    icon: CheckCircle2,
    category: 'Orders'
  },
  {
    id: 'order_cancelled',
    label: 'Order Cancelled',
    sublabel: 'Cancellation & refund notice',
    icon: XCircle,
    category: 'Orders'
  },
  {
    id: 'order_refunded',
    label: 'Refund Processed',
    sublabel: 'Refund credit confirmation',
    icon: Wallet,
    category: 'Orders'
  },
  {
    id: 'admin_order_notification',
    label: 'Admin Order Alert',
    sublabel: 'New order notification',
    icon: BellRing,
    category: 'Store Admin'
  },
  {
    id: 'password_reset',
    label: 'Password Reset',
    sublabel: '6-digit OTP verification',
    icon: KeyRound,
    category: 'Security'
  },
  {
    id: 'account_verification',
    label: 'Account Verification',
    sublabel: 'Customer signup OTP code',
    icon: ShieldCheck,
    category: 'Security'
  },
  {
    id: 'welcome_email',
    label: 'Welcome Circle',
    sublabel: 'Newsletter automation',
    icon: HeartHandshake,
    category: 'Marketing'
  }
];

export default function AdminEmailTemplatesPage() {
  const [activeTab, setActiveTab] = useState('order_confirmation');
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'

  // Test email modal state
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // Email health status
  const [providerStatus, setProviderStatus] = useState(null);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/email-templates', { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const list = await res.json();
        const map = {};
        if (Array.isArray(list)) {
          list.forEach(t => { map[t.id] = t; });
        }
        setTemplates(map);
      } else {
        toast.error('Failed to load email templates from server.');
      }
    } catch (err) {
      toast.error('Network error loading templates.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProviderHealth = async () => {
    try {
      const res = await fetch('/api/admin/newsletter/health', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProviderStatus(data);
        if (data.fromAddress) {
          setTestEmail(data.fromAddress);
        }
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchTemplates();
    fetchProviderHealth();
  }, []);

  const currentTemplate = templates[activeTab] || null;

  const handleFieldChange = (field, value) => {
    setTemplates(prev => ({
      ...prev,
      [activeTab]: {
        ...(prev[activeTab] || {}),
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!currentTemplate) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${activeTab}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(currentTemplate)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Template saved successfully!');
        if (data.template) {
          setTemplates(prev => ({ ...prev, [activeTab]: data.template }));
        }
      } else {
        toast.error(data.message || 'Failed to save template.');
      }
    } catch (err) {
      toast.error('Network error while saving template.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset this template to its default atelier settings? All custom edits for this template will be reverted.')) {
      return;
    }
    setResetting(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${activeTab}/reset`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Template reset to defaults!');
        if (data.template) {
          setTemplates(prev => ({ ...prev, [activeTab]: data.template }));
        }
      } else {
        toast.error(data.message || 'Failed to reset template.');
      }
    } catch (err) {
      toast.error('Network error while resetting template.');
    } finally {
      setResetting(false);
    }
  };

  const handleSendTest = async (e) => {
    e?.preventDefault();
    if (!testEmail || !testEmail.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setSendingTest(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${activeTab}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          toEmail: testEmail.trim(),
          template: currentTemplate
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || `Test email sent to ${testEmail}!`);
        setShowTestModal(false);
      } else {
        toast.error(data.message || data.error || 'Failed to send test email.');
      }
    } catch (err) {
      toast.error('Network error while sending test email.');
    } finally {
      setSendingTest(false);
    }
  };

  const copyPlaceholder = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast.success(`Copied ${key} to clipboard`);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Helper to render live preview interpolation with mock variables
  const renderMockPreviewText = (text = '') => {
    if (!text) return '';
    const mocks = {
      customerName: 'Priya Sharma',
      recipientName: 'Priya Sharma',
      orderNumber: 'MM-2026-8821',
      orderDate: '12 Oct 2026',
      total: '₹48,500',
      subtotal: '₹45,000',
      discount: '₹2,000',
      shipping: 'FREE',
      tax: '₹1,350',
      paymentMethod: 'Online Payment (Razorpay)',
      paymentStatus: 'Paid',
      shippingAddress: '402, Lotus Grandeur, Tonk Road, Jaipur',
      carrier: 'BlueDart Express',
      trackingNumber: 'BD-88219034',
      trackingUrl: 'https://track.bluedart.com',
      orderDetailsUrl: 'https://mikumantra.com/orders/test',
      adminOrderUrl: 'https://mikumantra.com/admin/orders',
      code: '849201',
      portalName: 'Customer Account',
      storeName: 'MikuMantra Fine Jewellery',
      supportEmail: 'support@mikumantra.com',
      siteUrl: 'https://mikumantra.com',
      itemsCount: '2',
      customerPhone: '+91 98290 12345',
      customerEmail: 'priya.sharma@example.com',
      subscriberEmail: testEmail || 'priya.sharma@example.com',
      unsubscribeUrl: 'https://mikumantra.com/unsubscribe'
    };

    return text.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, k) => {
      return mocks[k] !== undefined ? mocks[k] : match;
    });
  };

  if (loading) {
    return (
      <div className="p-16 text-center space-y-3">
        <Loader2 className="animate-spin inline text-[#9C6B30]" size={36} />
        <p className="text-xs text-neutral-500 font-mono tracking-wider uppercase">
          Loading Email Templates from MongoDB...
        </p>
      </div>
    );
  }

  if (!currentTemplate) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-neutral-200">
        <AlertCircle size={32} className="text-red-500 mx-auto mb-2" />
        <h3 className="text-base font-semibold text-neutral-900">Template Not Found</h3>
        <p className="text-xs text-neutral-500 mt-1">Unable to load configuration for {activeTab}.</p>
        <button
          onClick={fetchTemplates}
          className="mt-4 px-4 py-2 bg-[#9C6B30] text-white text-xs font-semibold rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl pb-16">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl sm:text-3xl text-[#1A1A1A]">
              Email Templates Control Hub
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-[#FAF6EF] text-[#9C6B30] border border-[#D4AF37]/40">
              <ShieldCheck size={12} /> Atelier Managed
            </span>
          </div>
          <div className="gold-line w-12 mt-2 mb-2" />
          <p className="text-xs sm:text-sm text-neutral-500">
            Control, customize, preview, and test all automated system emails sent across the customer journey.
          </p>
        </div>

        {/* Email Provider Status Badge & Global Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200 text-xs">
            <span className={`w-2 h-2 rounded-full ${providerStatus?.isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-neutral-600 font-medium">
              Provider: <strong className="text-neutral-900">{providerStatus?.provider || 'SMTP'}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowTestModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold transition"
          >
            <Send size={13} />
            <span>Send Test Email</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#9C6B30] hover:bg-[#845826] text-white rounded-xl text-xs font-semibold transition shadow-md shadow-[#9C6B30]/20 disabled:opacity-60"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            <span>Save Template</span>
          </button>
        </div>
      </div>

      {/* Template Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {TEMPLATE_TABS.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          const tData = templates[tab.id];
          const isEnabled = tData?.isEnabled !== false;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-left p-3.5 rounded-xl border transition-all relative ${
                isActive
                  ? 'bg-white border-[#9C6B30] shadow-md ring-2 ring-[#9C6B30]/20'
                  : 'bg-white/80 hover:bg-white border-neutral-200/90 text-neutral-600'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${isActive ? 'bg-[#FAF6EF] text-[#9C6B30]' : 'bg-neutral-100 text-neutral-500'}`}>
                  <TabIcon size={16} />
                </div>
                <span className={`inline-block w-2 h-2 rounded-full ${isEnabled ? 'bg-emerald-500' : 'bg-neutral-300'}`} title={isEnabled ? 'Enabled' : 'Disabled'} />
              </div>
              <div className="font-semibold text-xs sm:text-sm text-neutral-900 truncate">
                {tab.label}
              </div>
              <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                {tab.sublabel}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Two-Column Layout (Editor Left, Live Preview Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Editor Form (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 space-y-5 shadow-xs">
          {/* Template Info & Enable Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-900">
                  {currentTemplate.name || 'Template Editor'}
                </h2>
                <span className="text-[11px] font-mono text-neutral-400">
                  ({currentTemplate.id})
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                {currentTemplate.description}
              </p>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="flex items-center gap-2.5 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200 shrink-0">
              <span className={`text-xs font-semibold ${currentTemplate.isEnabled !== false ? 'text-emerald-700' : 'text-neutral-500'}`}>
                {currentTemplate.isEnabled !== false ? 'Active & Sending' : 'Disabled (Paused)'}
              </span>
              <button
                type="button"
                onClick={() => handleFieldChange('isEnabled', currentTemplate.isEnabled === false)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  currentTemplate.isEnabled !== false ? 'bg-emerald-600' : 'bg-neutral-300'
                }`}
                role="switch"
                aria-checked={currentTemplate.isEnabled !== false}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    currentTemplate.isEnabled !== false ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Subject Line */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                Email Subject Line <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={currentTemplate.subject || ''}
                onChange={(e) => handleFieldChange('subject', e.target.value)}
                placeholder="e.g. Order Confirmed: #{orderNumber} - {storeName}"
                className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-hidden focus:border-[#9C6B30] focus:ring-2 focus:ring-[#9C6B30]/20 transition"
              />
            </div>

            {/* Preview Preheader Text */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                Preheader Preview Text
              </label>
              <input
                type="text"
                value={currentTemplate.previewText || ''}
                onChange={(e) => handleFieldChange('previewText', e.target.value)}
                placeholder="Snippet shown in recipient inbox beside the subject..."
                className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-hidden focus:border-[#9C6B30] focus:ring-2 focus:ring-[#9C6B30]/20 transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Heading */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Main Email Title / Heading
                </label>
                <input
                  type="text"
                  value={currentTemplate.heading || ''}
                  onChange={(e) => handleFieldChange('heading', e.target.value)}
                  placeholder="e.g. Thank You, {customerName}"
                  className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-hidden focus:border-[#9C6B30] focus:ring-2 focus:ring-[#9C6B30]/20 transition"
                />
              </div>

              {/* Eyebrow / Subheading Pill */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Eyebrow Badge / Subheading
                </label>
                <input
                  type="text"
                  value={currentTemplate.subheading || ''}
                  onChange={(e) => handleFieldChange('subheading', e.target.value)}
                  placeholder="e.g. ✓ Order Confirmed"
                  className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-hidden focus:border-[#9C6B30] focus:ring-2 focus:ring-[#9C6B30]/20 transition"
                />
              </div>
            </div>

            {/* Email Body Content */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                  Email Message Body (Introductory Content)
                </label>
                <span className="text-[11px] text-neutral-400">Separate paragraphs with empty line</span>
              </div>
              <textarea
                rows={4}
                value={currentTemplate.bodyText || currentTemplate.body || ''}
                onChange={(e) => {
                  handleFieldChange('bodyText', e.target.value);
                  handleFieldChange('body', e.target.value);
                }}
                placeholder="Write your email body copy..."
                className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-hidden focus:border-[#9C6B30] focus:ring-2 focus:ring-[#9C6B30]/20 transition"
              />
            </div>

            {/* CTA Button Text & URL (if applicable) */}
            {activeTab !== 'password_reset' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                    CTA Button Text
                  </label>
                  <input
                    type="text"
                    value={currentTemplate.ctaText || ''}
                    onChange={(e) => handleFieldChange('ctaText', e.target.value)}
                    placeholder="e.g. View Order Details ↗"
                    className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-hidden focus:border-[#9C6B30] focus:ring-2 focus:ring-[#9C6B30]/20 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                    CTA Button URL
                  </label>
                  <input
                    type="text"
                    value={currentTemplate.ctaUrl || ''}
                    onChange={(e) => handleFieldChange('ctaUrl', e.target.value)}
                    placeholder="e.g. {orderDetailsUrl} or /shop"
                    className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-hidden focus:border-[#9C6B30] focus:ring-2 focus:ring-[#9C6B30]/20 transition"
                  />
                </div>
              </div>
            )}

            {/* Atelier Assurance Banner Note */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                Trust & Assurance Banner Note
              </label>
              <input
                type="text"
                value={currentTemplate.bannerText || ''}
                onChange={(e) => handleFieldChange('bannerText', e.target.value)}
                placeholder="e.g. ✨ BIS Hallmarked 22K Gold · SGL Certified Diamonds"
                className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-hidden focus:border-[#9C6B30] focus:ring-2 focus:ring-[#9C6B30]/20 transition"
              />
            </div>

            {/* Footer / Concierge Note */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                Footer Concierge Note
              </label>
              <textarea
                rows={2}
                value={currentTemplate.footerText || ''}
                onChange={(e) => handleFieldChange('footerText', e.target.value)}
                placeholder="Need assistance? Reach out to support@mikumantra.com"
                className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-hidden focus:border-[#9C6B30] focus:ring-2 focus:ring-[#9C6B30]/20 transition"
              />
            </div>
          </div>

          {/* Dynamic Placeholders Cheat Sheet */}
          <div className="pt-4 border-t border-neutral-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                Available Dynamic Placeholders
              </h3>
              <span className="text-[11px] text-neutral-400">Click any tag to copy</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(currentTemplate.placeholders || []).map((ph) => {
                const isCopied = copiedKey === ph.key;
                return (
                  <button
                    key={ph.key}
                    type="button"
                    onClick={() => copyPlaceholder(ph.key)}
                    className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAF6EF] hover:bg-[#F3EBDB] border border-[#EAE3D2] text-[11px] font-mono text-[#9C6B30] transition"
                    title={`${ph.description} (e.g. ${ph.sample})`}
                  >
                    <span>{ph.key}</span>
                    {isCopied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} className="opacity-40 group-hover:opacity-100" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-100 gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition disabled:opacity-50"
            >
              <RefreshCw size={13} className={resetting ? 'animate-spin' : ''} />
              <span>Reset to Defaults</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowTestModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold transition"
              >
                <Send size={13} />
                <span>Send Test</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-[#9C6B30] hover:bg-[#845826] text-white rounded-xl text-xs font-semibold transition shadow-md shadow-[#9C6B30]/20 disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Interactive Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-3 sticky top-20">
          {/* Preview Controls Bar */}
          <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-neutral-200 shadow-xs">
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
              <span>Interactive Live Preview</span>
            </div>

            <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-lg border border-neutral-200/80">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`p-1.5 rounded-md text-xs transition flex items-center gap-1 ${
                  previewDevice === 'desktop' ? 'bg-white shadow-xs font-semibold text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'
                }`}
                title="Desktop View"
              >
                <Monitor size={14} />
                <span className="hidden sm:inline">Desktop</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`p-1.5 rounded-md text-xs transition flex items-center gap-1 ${
                  previewDevice === 'mobile' ? 'bg-white shadow-xs font-semibold text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'
                }`}
                title="Mobile View"
              >
                <Smartphone size={14} />
                <span className="hidden sm:inline">Mobile</span>
              </button>
            </div>
          </div>

          {/* Email Client Shell */}
          <div className="bg-neutral-900 rounded-2xl p-2 sm:p-3 shadow-xl border border-neutral-800">
            {/* Email Client Header Bar */}
            <div className="bg-neutral-800 text-neutral-200 rounded-xl p-3 text-xs font-mono space-y-1 mb-2 border border-neutral-700/60">
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">Subject:</span>
                <span className="text-[#D4AF37] font-semibold truncate">
                  {renderMockPreviewText(currentTemplate.subject) || 'No Subject'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-neutral-400 truncate">
                <span className="text-neutral-500">From:</span>
                <span>MikuMantra Fine Jewellery &lt;hello@mikumantra.com&gt;</span>
              </div>
              {currentTemplate.previewText && (
                <div className="text-[11px] text-neutral-400 truncate">
                  <span className="text-neutral-500">Preview:</span>{' '}
                  {renderMockPreviewText(currentTemplate.previewText)}
                </div>
              )}
            </div>

            {/* Email Preview Frame */}
            <div
              className={`mx-auto bg-[#FAF6EF] rounded-xl overflow-hidden shadow-inner border border-[#EAE3D2] transition-all duration-300 ${
                previewDevice === 'mobile' ? 'max-w-[340px] text-xs' : 'max-w-full'
              }`}
            >
              {/* Atelier Email Header */}
              <div className="bg-[#0F0F10] p-6 text-center border-b-2 border-[#9C6B30]">
                <div className="font-serif text-xl tracking-[0.2em] font-bold text-[#D4AF37] uppercase">
                  MikuMantra
                </div>
                <div className="text-[8px] tracking-[0.3em] uppercase text-neutral-400 mt-1">
                  House of Fine Jewellery · Jaipur Atelier
                </div>
              </div>

              {/* Main Card Body */}
              <div className="p-5 sm:p-6 bg-white mx-3 my-4 rounded-xl shadow-xs border border-[#EAE3D2]">
                {/* Subheading Badge */}
                {currentTemplate.subheading && (
                  <div className="text-center mb-3">
                    <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[#FAF6EF] text-[#9C6B30] border border-[#D4AF37]/50">
                      {renderMockPreviewText(currentTemplate.subheading)}
                    </span>
                  </div>
                )}

                {/* Main Heading */}
                {currentTemplate.heading && (
                  <h3 className="font-serif text-lg sm:text-xl font-normal text-neutral-900 text-center mb-2 leading-tight">
                    {renderMockPreviewText(currentTemplate.heading)}
                  </h3>
                )}

                {/* Gold Accent Divider */}
                <div className="w-8 h-0.5 bg-[#D4AF37] mx-auto mb-4" />

                {/* Message Body */}
                <div className="text-xs sm:text-sm text-neutral-700 leading-relaxed space-y-2 mb-4">
                  {(currentTemplate.bodyText || currentTemplate.body || '')
                    .split(/\n\n/)
                    .filter(Boolean)
                    .map((paragraph, i) => (
                      <p key={i}>{renderMockPreviewText(paragraph)}</p>
                    ))}
                </div>

                {/* SPECIFIC TEMPLATE PREVIEW MOCKUPS */}

                {/* 1. Order Confirmation Sample Box */}
                {activeTab === 'order_confirmation' && (
                  <div className="space-y-3 my-4 pt-2 border-t border-neutral-100">
                    <div className="bg-[#FAF6EF] p-2.5 rounded-lg border border-[#EAE3D2] flex justify-between text-[11px]">
                      <div>Order: <strong>#MM-2026-8821</strong></div>
                      <div>Date: <strong>12 Oct 2026</strong></div>
                    </div>

                    {/* Sample Items */}
                    <div className="border border-neutral-100 rounded-lg p-2.5 space-y-2 text-[11px]">
                      <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">💎</span>
                          <div>
                            <div className="font-semibold text-neutral-900">Lotus Polki Diamond Necklace</div>
                            <div className="text-neutral-400">Qty: 1 · 22K Hallmarked Gold</div>
                          </div>
                        </div>
                        <span className="font-semibold">₹32,000</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">✨</span>
                          <div>
                            <div className="font-semibold text-neutral-900">Heritage Emerald Chandbalis</div>
                            <div className="text-neutral-400">Qty: 1 · Fine Polki Cut</div>
                          </div>
                        </div>
                        <span className="font-semibold">₹13,000</span>
                      </div>
                    </div>

                    {/* Pricing Summary */}
                    <div className="bg-neutral-50 p-2.5 rounded-lg text-[11px] space-y-1">
                      <div className="flex justify-between text-neutral-500">
                        <span>Subtotal</span>
                        <span>₹45,000</span>
                      </div>
                      <div className="flex justify-between text-emerald-600">
                        <span>Discount (WELCOME2000)</span>
                        <span>- ₹2,000</span>
                      </div>
                      <div className="flex justify-between text-neutral-500">
                        <span>Delivery</span>
                        <span className="text-emerald-600 font-semibold">FREE</span>
                      </div>
                      <div className="flex justify-between font-bold text-neutral-900 pt-1 border-t border-neutral-200">
                        <span>Total Paid</span>
                        <span className="text-[#9C6B30]">₹44,750</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Order Shipped Sample Box */}
                {activeTab === 'order_shipped' && (
                  <div className="my-4 bg-[#FAF6EF] border border-[#D4AF37] rounded-xl p-3 text-center space-y-1 text-xs">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#9C6B30]">
                      Courier Delivery Tracking
                    </div>
                    <div className="text-neutral-800 font-medium">Carrier: BlueDart Express</div>
                    <div className="text-neutral-500 font-mono text-[11px]">AWB: BD-88219034</div>
                  </div>
                )}

                {/* 3. Admin Notification Sample Box */}
                {activeTab === 'admin_order_notification' && (
                  <div className="my-4 bg-[#FAF8F5] border border-neutral-200 rounded-xl p-3 text-xs space-y-1.5">
                    <div><strong>Customer:</strong> Priya Sharma (priya@example.com)</div>
                    <div><strong>Phone:</strong> +91 98290 12345</div>
                    <div><strong>Order Total:</strong> <span className="font-bold text-[#9C6B30]">₹44,750</span></div>
                    <div><strong>Payment:</strong> Online Payment (Razorpay) - Paid</div>
                  </div>
                )}

                {/* 4. Password Reset OTP Box */}
                {activeTab === 'password_reset' && (
                  <div className="my-5 text-center">
                    <div className="inline-block bg-[#FAF6EF] border-2 border-dashed border-[#D4AF37] rounded-xl px-6 py-3">
                      <div className="text-[9px] uppercase tracking-widest text-[#9C6B30] font-bold">
                        Verification Code
                      </div>
                      <div className="text-2xl font-bold font-mono tracking-widest text-neutral-900 mt-1">
                        849201
                      </div>
                    </div>
                  </div>
                )}

                {/* CTA Button */}
                {currentTemplate.ctaText && activeTab !== 'password_reset' && (
                  <div className="text-center my-4">
                    <span className="inline-block px-6 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-widest bg-neutral-900 text-white shadow-md">
                      {renderMockPreviewText(currentTemplate.ctaText)}
                    </span>
                  </div>
                )}
              </div>

              {/* Assurance Banner */}
              {currentTemplate.bannerText && (
                <div className="bg-[#FAF6EF] p-3 text-center border-t border-b border-[#EAE3D2] text-[10px] uppercase tracking-wider font-semibold text-[#9C6B30]">
                  {renderMockPreviewText(currentTemplate.bannerText)}
                </div>
              )}

              {/* Footer Note */}
              <div className="p-4 text-center text-[10px] text-neutral-400 space-y-1">
                <p>{renderMockPreviewText(currentTemplate.footerText)}</p>
                <p>© {new Date().getFullYear()} MikuMantra Fine Jewellery · Jaipur Atelier</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Email Dispatch Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 relative">
            <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2 mb-1">
              <Send size={16} className="text-[#9C6B30]" />
              Send Live Test Email
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              Dispatches a realistic preview of the <strong>{currentTemplate.name}</strong> template directly to your email inbox with sample order data.
            </p>

            <form onSubmit={handleSendTest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  required
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="your-email@gmail.com"
                  className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-hidden focus:border-[#9C6B30] focus:ring-2 focus:ring-[#9C6B30]/20"
                />
              </div>

              <div className="p-3 bg-[#FAF6EF] border border-[#EAE3D2] rounded-xl text-[11px] text-neutral-600 space-y-1">
                <div className="font-semibold text-[#9C6B30]">Email Dispatch Info:</div>
                <div>• Using current form draft content</div>
                <div>• Delivered via configured SMTP / Gmail transporter</div>
                <div>• Subject will be prefixed with [TEST PREVIEW]</div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  disabled={sendingTest}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingTest}
                  className="flex items-center gap-2 px-5 py-2 bg-[#9C6B30] hover:bg-[#845826] text-white text-xs font-semibold rounded-xl transition disabled:opacity-60"
                >
                  {sendingTest ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>{sendingTest ? 'Sending...' : 'Send Test Now'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
