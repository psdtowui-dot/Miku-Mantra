'use client';
import { useEffect, useState } from 'react';
import {
  CreditCard,
  Save,
  Loader2,
  Check,
  Copy,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Wallet,
  Sparkles,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPaymentSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  const [form, setForm] = useState({
    razorpay: {
      enabled: true,
      testMode: true,
      keyId: '',
      keySecret: '',
      webhookSecret: '',
      businessName: 'MikuMantra Fine Jewellery',
      themeColor: '#9C6B30'
    },
    cod: {
      enabled: true
    }
  });

  const [serverMeta, setServerMeta] = useState({
    envKeyId: '',
    hasKeySecret: false,
    hasWebhookSecret: false,
    siteUrl: ''
  });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/site-settings', { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const rzp = data.paymentSettings?.razorpay || {};
        const cod = data.paymentSettings?.cod || {};

        setForm({
          razorpay: {
            enabled: rzp.enabled !== false,
            testMode: rzp.testMode ?? true,
            keyId: rzp.keyId || '',
            keySecret: '', // always empty on load for security
            webhookSecret: '',
            businessName: rzp.businessName || data.siteName || 'MikuMantra Fine Jewellery',
            themeColor: rzp.themeColor || '#9C6B30'
          },
          cod: {
            enabled: cod.enabled !== false
          }
        });

        setServerMeta({
          envKeyId: rzp.envKeyId || '',
          hasKeySecret: !!rzp.hasKeySecret,
          hasWebhookSecret: !!rzp.hasWebhookSecret,
          siteUrl: data.siteUrl || (typeof window !== 'undefined' ? window.location.origin : '')
        });
      } else {
        toast.error('Failed to load payment gateway settings');
      }
    } catch (err) {
      console.error('Error loading payment settings:', err);
      toast.error('Network error loading configuration');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        paymentSettings: {
          razorpay: {
            enabled: form.razorpay.enabled,
            testMode: form.razorpay.testMode,
            keyId: form.razorpay.keyId.trim(),
            keySecret: form.razorpay.keySecret.trim(),
            webhookSecret: form.razorpay.webhookSecret.trim(),
            businessName: form.razorpay.businessName.trim() || 'MikuMantra Fine Jewellery',
            themeColor: form.razorpay.themeColor || '#9C6B30'
          },
          cod: {
            enabled: form.cod.enabled
          }
        }
      };

      const res = await fetch('/api/admin/site-settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success('Payment gateway settings saved successfully!');
        loadSettings();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || 'Failed to save settings');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Network error saving settings');
    }
    setSaving(false);
  };

  const webhookUrl = `${serverMeta.siteUrl || (typeof window !== 'undefined' ? window.location.origin : '')}/api/payment/razorpay/webhook`;

  const copyWebhookToClipboard = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      toast.success('Webhook URL copied to clipboard');
      setTimeout(() => setCopiedWebhook(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#9C6B30]" size={28} />
      </div>
    );
  }

  const effectiveKeyId = form.razorpay.keyId || serverMeta.envKeyId;
  const isKeyLive = effectiveKeyId.startsWith('rzp_live_');
  const isKeyTest = effectiveKeyId.startsWith('rzp_test_');

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 pb-4 sm:pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-display text-neutral-900 font-semibold flex items-center gap-2">
            <CreditCard className="text-[#9C6B30] shrink-0" size={24} />
            Payment Gateways &amp; Razorpay CMS
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Enable or remove payment methods from customer checkout, manage Razorpay API keys, and toggle environment modes.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-[#9C6B30] text-white hover:bg-[#825725] px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors shrink-0 disabled:opacity-50 shadow-xs w-full sm:w-auto"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Settings
        </button>
      </div>

      {/* Gateway Status Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={`p-4 rounded-xl border flex items-center justify-between transition ${
          form.razorpay.enabled ? 'bg-emerald-50/50 border-emerald-200' : 'bg-neutral-50 border-neutral-200 opacity-80'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
              form.razorpay.enabled ? 'bg-emerald-600 text-white' : 'bg-neutral-300 text-neutral-600'
            }`}>
              <CreditCard size={20} />
            </div>
            <div>
              <div className="font-semibold text-sm text-neutral-900 flex items-center gap-2">
                Razorpay Gateway
                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${
                  !form.razorpay.enabled
                    ? 'bg-neutral-200 text-neutral-600'
                    : isKeyLive
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {!form.razorpay.enabled ? 'Removed / Disabled' : isKeyLive ? 'Live' : 'Test Mode'}
                </span>
              </div>
              <div className="text-xs text-neutral-500 mt-0.5">
                {form.razorpay.enabled ? 'Active on customer checkout' : 'Hidden from customer checkout'}
              </div>
            </div>
          </div>
          <span className={`w-3 h-3 rounded-full ${form.razorpay.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-300'}`} />
        </div>

        <div className={`p-4 rounded-xl border flex items-center justify-between transition ${
          form.cod.enabled ? 'bg-emerald-50/50 border-emerald-200' : 'bg-neutral-50 border-neutral-200 opacity-80'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
              form.cod.enabled ? 'bg-[#9C6B30] text-white' : 'bg-neutral-300 text-neutral-600'
            }`}>
              <Wallet size={20} />
            </div>
            <div>
              <div className="font-semibold text-sm text-neutral-900 flex items-center gap-2">
                Cash on Delivery (COD)
                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${
                  form.cod.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-600'
                }`}>
                  {form.cod.enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <div className="text-xs text-neutral-500 mt-0.5">
                {form.cod.enabled ? 'Pay upon delivery is enabled' : 'Prepaid orders only'}
              </div>
            </div>
          </div>
          <span className={`w-3 h-3 rounded-full ${form.cod.enabled ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
        </div>
      </div>

      {/* RAZORPAY SECTION */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-neutral-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0C2340] rounded-lg flex items-center justify-center text-white font-bold tracking-tight text-xs shadow-xs">
              RZP
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Razorpay Payment Gateway</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Accept Cards (Visa, Mastercard, RuPay), UPI (GPay, PhonePe, Paytm), Netbanking, and Wallets.
              </p>
            </div>
          </div>

          {/* Master Enable/Disable Toggle */}
          <div className="flex items-center gap-3 bg-white px-4 py-2 border rounded-lg shadow-2xs">
            <div className="text-right">
              <div className="text-xs font-bold text-neutral-800">
                {form.razorpay.enabled ? 'Razorpay is ENABLED' : 'Razorpay is REMOVED'}
              </div>
              <div className="text-[10px] text-neutral-500">
                {form.razorpay.enabled ? 'Customers can select Razorpay' : 'Completely hidden from checkout'}
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.razorpay.enabled}
                onChange={e => setForm(prev => ({
                  ...prev,
                  razorpay: { ...prev.razorpay, enabled: e.target.checked }
                }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9C6B30]"></div>
            </label>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* Environment Mode Toggle */}
          <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/70 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                  Gateway Environment
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Toggle between sandbox test transactions and live production payments.
                </p>
              </div>
              <div className="inline-flex rounded-lg border border-neutral-300 bg-white p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setForm(prev => ({
                    ...prev,
                    razorpay: { ...prev.razorpay, testMode: true }
                  }))}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                    form.razorpay.testMode ? 'bg-amber-100 text-amber-900 font-bold shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Test Mode (Sandbox)
                </button>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({
                    ...prev,
                    razorpay: { ...prev.razorpay, testMode: false }
                  }))}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                    !form.razorpay.testMode ? 'bg-emerald-600 text-white font-bold shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Live Mode (Production)
                </button>
              </div>
            </div>
          </div>

          {/* Credentials Form */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                API Credentials
              </h3>
              <a
                href="https://dashboard.razorpay.com/#/access/api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#9C6B30] hover:underline flex items-center gap-1 font-medium"
              >
                Razorpay Dashboard API Keys <ExternalLink size={12} />
              </a>
            </div>

            {/* Key ID */}
            <div>
              <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                Razorpay Key ID *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={form.razorpay.keyId}
                  onChange={e => setForm(prev => ({
                    ...prev,
                    razorpay: { ...prev.razorpay, keyId: e.target.value }
                  }))}
                  placeholder={serverMeta.envKeyId ? `Configured in .env (${serverMeta.envKeyId.slice(0, 12)}...)` : 'e.g. rzp_test_xxxxxxxxxx or rzp_live_xxxxxxxxxx'}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm font-mono focus:outline-none focus:border-[#9C6B30]"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-1">
                <span>Starts with <code>rzp_test_</code> (for testing) or <code>rzp_live_</code> (for live customers).</span>
                {serverMeta.envKeyId && !form.razorpay.keyId && (
                  <span className="text-emerald-700 font-medium">Using fallback from .env</span>
                )}
              </div>
            </div>

            {/* Key Secret */}
            <div>
              <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                Razorpay Key Secret *
              </label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={form.razorpay.keySecret}
                  onChange={e => setForm(prev => ({
                    ...prev,
                    razorpay: { ...prev.razorpay, keySecret: e.target.value }
                  }))}
                  placeholder={serverMeta.hasKeySecret ? '•••••••••••••••••••••••• (Configured — leave blank to keep unchanged)' : 'Paste your Razorpay Key Secret here'}
                  className="w-full pl-3 pr-10 py-2 border border-neutral-200 rounded-lg text-sm font-mono focus:outline-none focus:border-[#9C6B30]"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] mt-1">
                <span className="text-neutral-500">Stored securely and never exposed to the browser or public API.</span>
                {serverMeta.hasKeySecret && !form.razorpay.keySecret && (
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <Check size={12} /> Active Secret Saved
                  </span>
                )}
              </div>
            </div>

            {/* Webhook Secret */}
            <div className="pt-2 border-t border-neutral-100">
              <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                Webhook Secret (Optional — For Automated Refunds &amp; Events)
              </label>
              <div className="relative">
                <input
                  type={showWebhookSecret ? 'text' : 'password'}
                  value={form.razorpay.webhookSecret}
                  onChange={e => setForm(prev => ({
                    ...prev,
                    razorpay: { ...prev.razorpay, webhookSecret: e.target.value }
                  }))}
                  placeholder={serverMeta.hasWebhookSecret ? '•••••••••••••••• (Configured — leave blank to keep unchanged)' : 'Webhook secret configured in Razorpay Dashboard'}
                  className="w-full pl-3 pr-10 py-2 border border-neutral-200 rounded-lg text-sm font-mono focus:outline-none focus:border-[#9C6B30]"
                />
                <button
                  type="button"
                  onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showWebhookSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Webhook Endpoint Box */}
              <div className="mt-3 p-3.5 bg-neutral-50 rounded-lg border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Webhook Callback Endpoint
                  </div>
                  <div className="font-mono text-xs text-neutral-800 truncate mt-0.5 select-all">
                    {webhookUrl}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={copyWebhookToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-200 rounded-md text-xs text-neutral-700 hover:bg-neutral-100 shrink-0 font-medium transition"
                >
                  {copiedWebhook ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  {copiedWebhook ? 'Copied' : 'Copy URL'}
                </button>
              </div>
            </div>
          </div>

          {/* Checkout UI Customization */}
          <div className="pt-4 border-t border-neutral-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                Display Business Name in Checkout Popup
              </label>
              <input
                type="text"
                value={form.razorpay.businessName}
                onChange={e => setForm(prev => ({
                  ...prev,
                  razorpay: { ...prev.razorpay, businessName: e.target.value }
                }))}
                placeholder="e.g. MikuMantra Fine Jewellery"
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                Modal Theme Accent Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.razorpay.themeColor || '#9C6B30'}
                  onChange={e => setForm(prev => ({
                    ...prev,
                    razorpay: { ...prev.razorpay, themeColor: e.target.value }
                  }))}
                  className="w-10 h-9 p-0.5 border border-neutral-200 rounded-lg cursor-pointer bg-white"
                />
                <input
                  type="text"
                  value={form.razorpay.themeColor}
                  onChange={e => setForm(prev => ({
                    ...prev,
                    razorpay: { ...prev.razorpay, themeColor: e.target.value }
                  }))}
                  placeholder="#9C6B30"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm font-mono focus:outline-none focus:border-[#9C6B30]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CASH ON DELIVERY SECTION */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-xs">
              COD
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Cash on Delivery (COD)</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Allow customers to pay via cash or UPI when order is physically delivered.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-neutral-50 px-4 py-2 border rounded-lg">
            <div className="text-right">
              <div className="text-xs font-bold text-neutral-800">
                {form.cod.enabled ? 'COD is ENABLED' : 'COD is DISABLED'}
              </div>
              <div className="text-[10px] text-neutral-500">
                {form.cod.enabled ? 'Customers can choose Cash on Delivery' : 'Only online prepaid orders allowed'}
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.cod.enabled}
                onChange={e => setForm(prev => ({
                  ...prev,
                  cod: { ...prev.cod, enabled: e.target.checked }
                }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9C6B30]"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Save Button Footer */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-[#9C6B30] text-white hover:bg-[#825725] px-6 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 shadow-xs"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Payment Gateway Settings
        </button>
      </div>
    </div>
  );
}
