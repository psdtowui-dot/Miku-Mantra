'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText, Settings, Check, CheckCircle2, RefreshCw, Download,
  Printer, Eye, Save, Sparkles, Building2, Palette, Sliders,
  Mail, ShieldCheck, HelpCircle, Loader2, ArrowLeft, ExternalLink,
  ReceiptText, Landmark, Scale, Phone, Globe, MapPin
} from 'lucide-react';
import { toast } from 'sonner';

const COLOR_PRESETS = [
  { label: 'Jaipur Gold (Signature)', hex: '#9C6B30' },
  { label: 'Classic Noir', hex: '#1A1A1A' },
  { label: 'Imperial Emerald', hex: '#0F5132' },
  { label: 'Midnight Sapphire', hex: '#1E3A8A' },
  { label: 'Burgundy Atelier', hex: '#722F37' },
];

export default function AdminInvoiceTemplatesPage() {
  const [catalog, setCatalog] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState('classic_regal');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('company');
  const [previewKey, setPreviewKey] = useState(Date.now());
  const [showLiveModal, setShowLiveModal] = useState(false);

  // Load Templates & Configuration
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/invoice-templates', { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const d = await res.json();
        setCatalog(d.catalog || []);
        setActiveTemplate(d.activeTemplate || 'classic_regal');
        setSettings(d.settings || {});
      } else {
        toast.error('Failed to load invoice templates');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching template settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save Settings
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...settings,
        activeTemplate
      };

      const res = await fetch('/api/admin/invoice-settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success('Invoice information & template saved successfully!');
        setPreviewKey(Date.now());
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to save invoice settings.');
      }
    } catch (err) {
      toast.error('Error saving template: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Switch template layout
  const handleSelectTemplate = (template) => {
    setActiveTemplate(template.id);
    if (settings) {
      setSettings(prev => ({
        ...prev,
        activeTemplate: template.id,
        primaryColor: template.recommendedColor || prev.primaryColor
      }));
    }
    toast.info(`Selected "${template.name}". Click "Save All Changes" to apply.`);
  };

  // Sample PDF URL with live query parameters reflecting all active form state
  const buildSampleUrl = () => {
    if (!settings) return '/api/admin/invoice-templates/sample-pdf';
    const params = new URLSearchParams({
      primaryColor: settings.primaryColor || '#9C6B30',
      invoiceTitle: settings.invoiceTitle || 'TAX INVOICE',
      invoiceSubtitle: settings.invoiceSubtitle || 'ORIGINAL FOR RECIPIENT',
      prefix: settings.prefix || 'INV-',
      showWatermark: String(settings.showWatermark !== false),
      showHsn: String(settings.showHsn !== false),
      hsnCode: settings.hsnCode || '7113',
      showSku: String(settings.showSku !== false),
      showBankDetails: String(settings.showBankDetails !== false),
      showSignatory: String(settings.showSignatory !== false),
      showTerms: String(settings.showTerms !== false),
      legalName: settings.legalName || '',
      address: settings.address || '',
      email: settings.email || '',
      phone: settings.phone || '',
      website: settings.website || '',
      gstin: settings.gstin || '',
      pan: settings.pan || '',
      cin: settings.cin || '',
      notes: settings.notes || '',
      signatoryCompany: settings.signatoryCompany || '',
      authorizedSignatory: settings.authorizedSignatory || '',
      invoiceTerms: settings.invoiceTerms || '',
      bankName: settings.bankDetails?.bankName || '',
      accountNumber: settings.bankDetails?.accountNumber || '',
      ifsc: settings.bankDetails?.ifsc || '',
      branch: settings.bankDetails?.branch || '',
      t: String(previewKey)
    });
    return `/api/admin/invoice-templates/sample-pdf?${params.toString()}`;
  };

  const samplePdfUrl = buildSampleUrl();

  return (
    <div className="space-y-6">
      {/* Top Nav Tabs */}
      <div className="flex border-b border-neutral-200 gap-6">
        <Link
          href="/admin/invoices"
          className="pb-3 text-xs sm:text-sm font-semibold border-b-2 border-transparent text-neutral-500 hover:text-neutral-800 flex items-center gap-2 transition"
        >
          <FileText size={15} /> All Invoices
        </Link>
        <Link
          href="/admin/invoices/templates"
          className="pb-3 text-xs sm:text-sm font-semibold border-b-2 border-[#9C6B30] text-[#9C6B30] flex items-center gap-2"
        >
          <Settings size={15} /> Invoice Template &amp; Information Editor
        </Link>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl xs:text-3xl sm:text-4xl text-[#1A1A1A]">Invoice Template &amp; Info</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] tracking-wider font-semibold uppercase bg-[#FAF6EF] text-[#9C6B30] border border-[#D4AF37]/30">
              Full Edit Suite
            </span>
          </div>
          <div className="gold-line w-12 mt-2" />
          <p className="text-xs text-neutral-500 mt-1">
            Edit company legal name, addresses, GSTIN/PAN/CIN, banking wire details, signatory stamps, and template aesthetics with live PDF preview.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-stretch sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setPreviewKey(Date.now())}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-neutral-200 text-neutral-700 hover:border-[#9C6B30] text-xs font-semibold rounded-lg shadow-2xs transition"
            title="Refresh Live Preview"
          >
            <RefreshCw size={13} />
            <span>Refresh Preview</span>
          </button>
          <button
            type="button"
            onClick={() => setShowLiveModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FAF6EF] border border-[#D4AF37]/40 text-[#9C6B30] hover:bg-[#9C6B30] hover:text-white text-xs font-semibold rounded-lg shadow-2xs transition"
          >
            <Eye size={13} />
            <span>Full Preview</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#9C6B30] hover:bg-[#855B29] text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            <span>{saving ? 'Saving...' : 'Save All Changes'}</span>
          </button>
        </div>
      </div>

      {loading || !settings ? (
        <div className="p-16 text-center bg-white rounded-xl border border-neutral-200">
          <Loader2 className="animate-spin inline text-[#9C6B30]" size={28} />
          <p className="text-xs text-neutral-500 mt-2">Loading invoice editor &amp; templates...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* ============ 1. TEMPLATE SELECTION CARDS ============ */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                1. Select Invoice Template Preset
              </h2>
              <span className="text-[11px] text-neutral-500">
                Active Style: <strong className="text-[#9C6B30] font-semibold capitalize">{activeTemplate.replace(/_/g, ' ')}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {catalog.map(tpl => {
                const isSelected = activeTemplate === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    className={`cursor-pointer rounded-xl border p-4 bg-white shadow-2xs transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#9C6B30] ring-2 ring-[#9C6B30]/20'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div>
                      {/* Top badge & color swatch */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded tracking-wider ${
                          isSelected ? 'bg-[#9C6B30] text-white' : 'bg-neutral-100 text-neutral-600'
                        }`}>
                          {tpl.badge}
                        </span>
                        <div
                          className="w-4 h-4 rounded-full border border-black/10 shadow-inner"
                          style={{ backgroundColor: tpl.recommendedColor }}
                          title={`Preset Color: ${tpl.recommendedColor}`}
                        />
                      </div>

                      <h3 className="font-display text-base font-semibold text-neutral-900">
                        {tpl.name}
                      </h3>
                      <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                        {tpl.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-neutral-400 font-mono">
                        A4 Print Ready
                      </span>
                      <span className={`text-xs font-semibold flex items-center gap-1 ${
                        isSelected ? 'text-[#9C6B30]' : 'text-neutral-400'
                      }`}>
                        {isSelected ? <><CheckCircle2 size={14} /> Selected</> : 'Select'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ============ 2. FULL INFO EDITOR & LIVE PREVIEW GRID ============ */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                2. Edit All Invoice Information &amp; Controls
              </h2>
              <span className="text-[11px] text-neutral-400">
                Updates synchronize directly with customer PDFs and company records
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Comprehensive Edit Tabs (7 cols) */}
              <div className="lg:col-span-7 bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-2xs">
                {/* Navigation Tabs */}
                <div className="flex border-b border-neutral-200 bg-neutral-50 px-3 pt-2 gap-2 overflow-x-auto scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setActiveTab('company')}
                    className={`pb-2.5 px-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
                      activeTab === 'company' ? 'border-[#9C6B30] text-[#9C6B30]' : 'border-transparent text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    <Building2 size={13} />
                    <span>Company &amp; Legal Info</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('banking')}
                    className={`pb-2.5 px-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
                      activeTab === 'banking' ? 'border-[#9C6B30] text-[#9C6B30]' : 'border-transparent text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    <Landmark size={13} />
                    <span>Bank &amp; Payment Wire</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('statutory')}
                    className={`pb-2.5 px-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
                      activeTab === 'statutory' ? 'border-[#9C6B30] text-[#9C6B30]' : 'border-transparent text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    <Scale size={13} />
                    <span>Notes, Signatory &amp; Terms</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('design')}
                    className={`pb-2.5 px-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
                      activeTab === 'design' ? 'border-[#9C6B30] text-[#9C6B30]' : 'border-transparent text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    <Palette size={13} />
                    <span>Styling &amp; Headers</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('email')}
                    className={`pb-2.5 px-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
                      activeTab === 'email' ? 'border-[#9C6B30] text-[#9C6B30]' : 'border-transparent text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    <Mail size={13} />
                    <span>Email Template</span>
                  </button>
                </div>

                <div className="p-5 space-y-5">
                  {/* ==================== TAB: COMPANY & LEGAL INFO ==================== */}
                  {activeTab === 'company' && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                          Company Legal Name (Printed Top-Left)
                        </label>
                        <input
                          value={settings.legalName || ''}
                          onChange={e => setSettings({ ...settings, legalName: e.target.value })}
                          placeholder="MikuMantra Fine Jewellery Pvt Ltd"
                          className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#9C6B30]"
                        />
                        <span className="text-[11px] text-neutral-400 block mt-1">
                          Appears prominently on the top-left invoice header and in the signatory block.
                        </span>
                      </div>

                      <div>
                        <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                          Atelier / Store Address (Printed on Invoice Header)
                        </label>
                        <input
                          value={settings.address || ''}
                          onChange={e => setSettings({ ...settings, address: e.target.value })}
                          placeholder="MikuMantra Atelier, MG Road, Jaipur 302001"
                          className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                          Registered Corporate Office Address (Printed in Legal Footer)
                        </label>
                        <input
                          value={settings.registeredAddress || ''}
                          onChange={e => setSettings({ ...settings, registeredAddress: e.target.value })}
                          placeholder="MikuMantra Atelier, MG Road, Jaipur 302001"
                          className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                            Official Support Email
                          </label>
                          <input
                            type="email"
                            value={settings.email || ''}
                            onChange={e => setSettings({ ...settings, email: e.target.value })}
                            placeholder="sushil@unictechnology.com"
                            className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                            Official Phone / Hotline
                          </label>
                          <input
                            type="text"
                            value={settings.phone || ''}
                            onChange={e => setSettings({ ...settings, phone: e.target.value })}
                            placeholder="+918076108369"
                            className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                          Official Website URL
                        </label>
                        <input
                          type="url"
                          value={settings.website || ''}
                          onChange={e => setSettings({ ...settings, website: e.target.value })}
                          placeholder="https://mikumantra.vercel.app"
                          className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-[#9C6B30]"
                        />
                      </div>

                      {/* Tax & Registration numbers */}
                      <div className="border-t border-neutral-100 pt-4 space-y-3">
                        <label className="text-[10px] tracking-widest uppercase font-bold text-neutral-400 block">
                          Statutory Tax Registrations (Printed under address)
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] tracking-wider uppercase font-semibold text-neutral-500 block mb-1">
                              GSTIN Number
                            </label>
                            <input
                              value={settings.gstin || ''}
                              onChange={e => setSettings({ ...settings, gstin: e.target.value.toUpperCase() })}
                              placeholder="08AAACM1234F1Z5"
                              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs font-mono font-semibold uppercase focus:outline-none focus:border-[#9C6B30]"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] tracking-wider uppercase font-semibold text-neutral-500 block mb-1">
                              PAN Number
                            </label>
                            <input
                              value={settings.pan || ''}
                              onChange={e => setSettings({ ...settings, pan: e.target.value.toUpperCase() })}
                              placeholder="AAACM1234F"
                              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs font-mono font-semibold uppercase focus:outline-none focus:border-[#9C6B30]"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] tracking-wider uppercase font-semibold text-neutral-500 block mb-1">
                              CIN Number (Optional)
                            </label>
                            <input
                              value={settings.cin || ''}
                              onChange={e => setSettings({ ...settings, cin: e.target.value.toUpperCase() })}
                              placeholder="U36910RJ2026PTC123456"
                              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs font-mono uppercase focus:outline-none focus:border-[#9C6B30]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ==================== TAB: BANK & WIRE PAYMENT ==================== */}
                  {activeTab === 'banking' && (
                    <div className="space-y-4">
                      <div className="bg-[#FAF6EF]/50 p-3.5 rounded-lg border border-[#D4AF37]/30 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-neutral-900">Display Bank Details Box</h4>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            Renders a dedicated wire transfer payment coordinates box on the invoice.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.showBankDetails !== false}
                          onChange={e => setSettings({ ...settings, showBankDetails: e.target.checked })}
                          className="h-4 w-4 rounded text-[#9C6B30] focus:ring-[#9C6B30] cursor-pointer"
                        />
                      </div>

                      {settings.showBankDetails !== false && (
                        <div className="space-y-4 pt-1">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                                Bank Name
                              </label>
                              <input
                                value={settings.bankDetails?.bankName || ''}
                                onChange={e => setSettings({
                                  ...settings,
                                  bankDetails: { ...settings.bankDetails, bankName: e.target.value }
                                })}
                                placeholder="HDFC Bank Ltd."
                                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#9C6B30]"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                                Beneficiary / Account Name
                              </label>
                              <input
                                value={settings.bankDetails?.beneficiaryName || ''}
                                onChange={e => setSettings({
                                  ...settings,
                                  bankDetails: { ...settings.bankDetails, beneficiaryName: e.target.value }
                                })}
                                placeholder="MikuMantra Fine Jewellery Pvt Ltd"
                                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                                Account Number
                              </label>
                              <input
                                value={settings.bankDetails?.accountNumber || ''}
                                onChange={e => setSettings({
                                  ...settings,
                                  bankDetails: { ...settings.bankDetails, accountNumber: e.target.value }
                                })}
                                placeholder="50200012345678"
                                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs font-mono font-semibold focus:outline-none focus:border-[#9C6B30]"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                                IFSC Code
                              </label>
                              <input
                                value={settings.bankDetails?.ifsc || ''}
                                onChange={e => setSettings({
                                  ...settings,
                                  bankDetails: { ...settings.bankDetails, ifsc: e.target.value.toUpperCase() }
                                })}
                                placeholder="HDFC0000123"
                                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs font-mono font-semibold uppercase focus:outline-none focus:border-[#9C6B30]"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                                Bank Branch &amp; City
                              </label>
                              <input
                                value={settings.bankDetails?.branch || ''}
                                onChange={e => setSettings({
                                  ...settings,
                                  bankDetails: { ...settings.bankDetails, branch: e.target.value }
                                })}
                                placeholder="C-Scheme Branch, Jaipur"
                                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                                Account Type
                              </label>
                              <input
                                value={settings.bankDetails?.accountType || ''}
                                onChange={e => setSettings({
                                  ...settings,
                                  bankDetails: { ...settings.bankDetails, accountType: e.target.value }
                                })}
                                placeholder="Current Account"
                                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                              UPI ID / VPA (Optional)
                            </label>
                            <input
                              value={settings.bankDetails?.upiId || ''}
                              onChange={e => setSettings({
                                ...settings,
                                bankDetails: { ...settings.bankDetails, upiId: e.target.value }
                              })}
                              placeholder="mikumantra@hdfcbank"
                              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-[#9C6B30]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ==================== TAB: STATUTORY, NOTES & SIGNATORY ==================== */}
                  {activeTab === 'statutory' && (
                    <div className="space-y-5">
                      {/* Atelier Note */}
                      <div>
                        <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                          Advisory / Atelier Note (Printed under Bank Box)
                        </label>
                        <input
                          value={settings.notes || ''}
                          onChange={e => setSettings({ ...settings, notes: e.target.value })}
                          placeholder="Complimentary jewellery care consultation available at Jaipur atelier."
                          className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                        />
                        <span className="text-[11px] text-neutral-400 block mt-1">
                          Example: "Complimentary jewellery care consultation available at Jaipur atelier."
                        </span>
                      </div>

                      {/* HSN Settings */}
                      <div className="border-t border-neutral-100 pt-4 space-y-3">
                        <label className="flex items-center gap-2.5 text-xs text-neutral-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.showHsn !== false}
                            onChange={e => setSettings({ ...settings, showHsn: e.target.checked })}
                            className="rounded text-[#9C6B30] focus:ring-[#9C6B30] h-4 w-4"
                          />
                          <span>Display Statutory HSN / SAC Code in product line items</span>
                        </label>

                        {settings.showHsn !== false && (
                          <div className="pl-6">
                            <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                              Default Fine Jewellery HSN Code
                            </label>
                            <input
                              value={settings.hsnCode || '7113'}
                              onChange={e => setSettings({ ...settings, hsnCode: e.target.value })}
                              placeholder="7113"
                              className="w-32 px-3 py-1.5 border border-neutral-200 rounded-lg text-xs font-mono font-semibold"
                            />
                            <span className="text-[11px] text-neutral-400 block mt-1">
                              HSN 7113 is statutory across India for Articles of Jewellery and precious metals.
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Authorized Signatory */}
                      <div className="border-t border-neutral-100 pt-4 space-y-3">
                        <label className="flex items-center gap-2.5 text-xs text-neutral-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.showSignatory !== false}
                            onChange={e => setSettings({ ...settings, showSignatory: e.target.checked })}
                            className="rounded text-[#9C6B30] focus:ring-[#9C6B30] h-4 w-4"
                          />
                          <span>Display Authorized Signatory Block</span>
                        </label>

                        {settings.showSignatory !== false && (
                          <div className="pl-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                                Signatory Company Prefix
                              </label>
                              <input
                                value={settings.signatoryCompany || ''}
                                onChange={e => setSettings({ ...settings, signatoryCompany: e.target.value })}
                                placeholder="For MikuMantra Fine Jewellery Pvt Ltd"
                                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                                Signatory Title
                              </label>
                              <input
                                value={settings.authorizedSignatory || ''}
                                onChange={e => setSettings({ ...settings, authorizedSignatory: e.target.value })}
                                placeholder="Authorized Signatory"
                                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Terms & Conditions */}
                      <div className="border-t border-neutral-100 pt-4 space-y-3">
                        <label className="flex items-center gap-2.5 text-xs text-neutral-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.showTerms !== false}
                            onChange={e => setSettings({ ...settings, showTerms: e.target.checked })}
                            className="rounded text-[#9C6B30] focus:ring-[#9C6B30] h-4 w-4"
                          />
                          <span>Display Terms &amp; Conditions and Certificate footer declaration</span>
                        </label>

                        {settings.showTerms !== false && (
                          <div className="pl-6">
                            <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                              Terms &amp; Conditions / Hallmark Authenticity Declaration
                            </label>
                            <textarea
                              rows={3}
                              value={settings.invoiceTerms || ''}
                              onChange={e => setSettings({ ...settings, invoiceTerms: e.target.value })}
                              placeholder="All jewellery items are BIS Hallmarked and SGL/GIA certified. Returns accepted within 15 days."
                              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ==================== TAB: STYLING & HEADERS ==================== */}
                  {activeTab === 'design' && (
                    <div className="space-y-5">
                      {/* Primary Color Palette */}
                      <div>
                        <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-2">
                          Accent Theme Color
                        </label>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {COLOR_PRESETS.map(preset => (
                            <button
                              type="button"
                              key={preset.hex}
                              onClick={() => setSettings({ ...settings, primaryColor: preset.hex })}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                                settings.primaryColor?.toLowerCase() === preset.hex.toLowerCase()
                                  ? 'border-[#9C6B30] bg-[#FAF6EF] text-[#9C6B30] font-semibold'
                                  : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                              }`}
                            >
                              <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.hex }} />
                              <span>{preset.label}</span>
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={settings.primaryColor || '#9C6B30'}
                            onChange={e => setSettings({ ...settings, primaryColor: e.target.value })}
                            className="w-9 h-9 p-0.5 rounded border border-neutral-200 cursor-pointer bg-white"
                          />
                          <input
                            type="text"
                            value={settings.primaryColor || '#9C6B30'}
                            onChange={e => setSettings({ ...settings, primaryColor: e.target.value })}
                            className="w-32 px-3 py-1.5 border border-neutral-200 rounded-lg text-xs font-mono font-semibold text-neutral-800 uppercase"
                          />
                          <span className="text-[11px] text-neutral-400">Custom Brand Hex</span>
                        </div>
                      </div>

                      <div className="border-t border-neutral-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                            Document Title
                          </label>
                          <input
                            value={settings.invoiceTitle || ''}
                            onChange={e => setSettings({ ...settings, invoiceTitle: e.target.value })}
                            placeholder="TAX INVOICE"
                            className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#9C6B30]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                            Document Subtitle
                          </label>
                          <input
                            value={settings.invoiceSubtitle || ''}
                            onChange={e => setSettings({ ...settings, invoiceSubtitle: e.target.value })}
                            placeholder="ORIGINAL FOR RECIPIENT"
                            className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#9C6B30]"
                          />
                        </div>
                      </div>

                      <div className="border-t border-neutral-100 pt-4">
                        <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                          Invoice Number Prefix
                        </label>
                        <input
                          value={settings.prefix || ''}
                          onChange={e => setSettings({ ...settings, prefix: e.target.value })}
                          placeholder="INV-"
                          className="w-full max-w-xs px-3 py-2 border border-neutral-200 rounded-lg text-xs font-mono font-semibold focus:outline-none focus:border-[#9C6B30]"
                        />
                        <span className="text-[11px] text-neutral-400 block mt-1">
                          Applied as prefix for generated invoices (e.g. <code>INV-MIK-62295639-159</code>).
                        </span>
                      </div>

                      <div className="border-t border-neutral-100 pt-4 space-y-3">
                        <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block">
                          Visual Options &amp; Stamps
                        </label>

                        <label className="flex items-center gap-2.5 text-xs text-neutral-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.showWatermark !== false}
                            onChange={e => setSettings({ ...settings, showWatermark: e.target.checked })}
                            className="rounded text-[#9C6B30] focus:ring-[#9C6B30] h-4 w-4"
                          />
                          <span>Render diagonal watermark stamp on invoice (e.g. <strong>PAID</strong> in emerald, <strong>CANCELLED</strong> in red)</span>
                        </label>

                        <label className="flex items-center gap-2.5 text-xs text-neutral-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.showSku !== false}
                            onChange={e => setSettings({ ...settings, showSku: e.target.checked })}
                            className="rounded text-[#9C6B30] focus:ring-[#9C6B30] h-4 w-4"
                          />
                          <span>Display Product SKU / Item ID in description column</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* ==================== TAB: EMAIL DISPATCH TEMPLATE ==================== */}
                  {activeTab === 'email' && (
                    <div className="space-y-4">
                      <p className="text-xs text-neutral-500">
                        When an administrator sends an invoice from the Orders or Invoices hub, this email template is sent with the generated PDF attached.
                      </p>

                      <div>
                        <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                          Email Subject Line Template
                        </label>
                        <input
                          value={settings.emailSubject || ''}
                          onChange={e => setSettings({ ...settings, emailSubject: e.target.value })}
                          placeholder="Official Tax Invoice: #{invoiceNumber} for Order #{orderNumber} - {storeName}"
                          className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#9C6B30]"
                        />
                        <div className="text-[11px] text-neutral-400 mt-1 flex flex-wrap gap-1.5">
                          <span className="bg-neutral-100 px-1.5 py-0.5 rounded font-mono text-[10px]">{'{invoiceNumber}'}</span>
                          <span className="bg-neutral-100 px-1.5 py-0.5 rounded font-mono text-[10px]">{'{orderNumber}'}</span>
                          <span className="bg-neutral-100 px-1.5 py-0.5 rounded font-mono text-[10px]">{'{customerName}'}</span>
                          <span className="bg-neutral-100 px-1.5 py-0.5 rounded font-mono text-[10px]">{'{storeName}'}</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                          Default Email Atelier Message
                        </label>
                        <textarea
                          rows={3}
                          value={settings.emailMessage || ''}
                          onChange={e => setSettings({ ...settings, emailMessage: e.target.value })}
                          placeholder="Thank you for your valued patronage with MikuMantra Fine Jewellery. Please find your official tax invoice attached."
                          className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] tracking-widest uppercase font-semibold text-neutral-500 block mb-1">
                          Online Invoice CTA Button Label
                        </label>
                        <input
                          value={settings.emailCtaText || ''}
                          onChange={e => setSettings({ ...settings, emailCtaText: e.target.value })}
                          placeholder="View Invoice Online ↗"
                          className="w-full max-w-xs px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Bottom Action */}
                <div className="px-5 py-3.5 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
                  <span className="text-[11px] text-neutral-500">
                    Changes save to database and reflect immediately across all orders.
                  </span>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#9C6B30] hover:bg-[#855B29] text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    <span>{saving ? 'Saving...' : 'Save All Changes'}</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Live Interactive PDF Preview (5 cols) */}
              <div className="lg:col-span-5 bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-2xs sticky top-4">
                <div className="bg-[#121212] text-white px-4 py-3 flex items-center justify-between border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Eye size={14} className="text-[#D4AF37]" />
                    <span className="text-xs font-semibold tracking-wider uppercase">Live PDF Preview</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <a
                      href={samplePdfUrl}
                      download="MikuMantra-Sample-Invoice.pdf"
                      className="p-1 rounded bg-white/10 hover:bg-white/20 text-white transition text-xs flex items-center gap-1 px-2"
                      title="Download Sample PDF"
                    >
                      <Download size={11} />
                      <span className="text-[10px]">PDF</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        const w = window.open(samplePdfUrl, '_blank');
                        if (w) {
                          w.onload = () => {
                            try { w.print(); } catch (e) {}
                          };
                        }
                      }}
                      className="p-1 rounded bg-white/10 hover:bg-white/20 text-white transition text-xs flex items-center gap-1 px-2"
                      title="Print Sample"
                    >
                      <Printer size={11} />
                      <span className="text-[10px]">Print</span>
                    </button>
                  </div>
                </div>

                {/* PDF Preview Frame */}
                <div className="bg-neutral-100 p-2 min-h-[560px] h-[560px]">
                  <iframe
                    key={previewKey}
                    src={`${samplePdfUrl}#toolbar=0&navpanes=0`}
                    className="w-full h-full border border-neutral-300 rounded shadow-xs bg-white"
                    title="Invoice Template Sample Preview"
                  />
                </div>

                <div className="p-3 bg-neutral-50 border-t border-neutral-200 text-center flex items-center justify-between px-4">
                  <p className="text-[11px] text-neutral-500">
                    Showing live sample with current active styling &amp; details.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPreviewKey(Date.now())}
                    className="text-[11px] font-semibold text-[#9C6B30] hover:underline flex items-center gap-1"
                  >
                    <RefreshCw size={11} /> Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Live Modal */}
      {showLiveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6" onClick={() => setShowLiveModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-4xl border border-neutral-200 overflow-hidden shadow-2xl flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
            <div className="bg-[#121212] text-white px-5 py-4 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-[#D4AF37]" />
                <h3 className="text-sm font-semibold text-white">Full Invoice Template Preview</h3>
              </div>
              <button onClick={() => setShowLiveModal(false)} className="text-white/70 hover:text-white font-bold p-1">
                ✕
              </button>
            </div>
            <div className="flex-1 bg-neutral-100 p-3 min-h-[70vh]">
              <iframe
                src={`${samplePdfUrl}#toolbar=1`}
                className="w-full h-full border border-neutral-300 rounded-lg shadow-inner bg-white"
                style={{ minHeight: '70vh' }}
                title="Full Sample Invoice Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
