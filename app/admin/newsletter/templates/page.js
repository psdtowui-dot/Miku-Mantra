'use client';

import { useEffect, useState } from 'react';
import { Save, Loader2, FileText, Eye, Mail, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminNewsletterTemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [template, setTemplate] = useState({
    subject: 'Welcome to the MikuMantra Atelier Circle',
    previewText: 'Enjoy ₹2,000 off your first handcrafted jewellery order.',
    heading: 'Welcome to MikuMantra',
    body: 'Thank you for joining our inner circle. You will receive private previews of our new high jewellery collections and exclusive invitations to bespoke unveilings.',
    ctaText: 'Explore the Collection',
    ctaUrl: '/shop',
    footerText: 'MikuMantra Fine Jewellery Atelier, Jaipur, India.'
  });

  const loadTemplate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/newsletter/templates', { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data) {
        setTemplate(prev => ({ ...prev, ...data }));
      }
    } catch (err) {
      toast.error('Failed to load welcome email template.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplate();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/newsletter/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(template)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Welcome email template saved!');
      } else {
        toast.error(data.message || 'Failed to save email template.');
      }
    } catch (err) {
      toast.error('Network error saving template.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="animate-spin inline text-[#9C6B30]" size={28} />
        <p className="text-xs text-neutral-500 mt-2 font-mono">Loading email template from MongoDB...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="font-display text-2xl xs:text-3xl sm:text-4xl text-[#1A1A1A]">
            Email Templates & Welcome Automation
          </div>
          <div className="gold-line w-12 mt-2 mb-2" />
          <p className="text-xs sm:text-sm text-neutral-500 font-light">
            Customize the automated welcome email sent to new subscribers upon joining the MikuMantra Circle.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#9C6B30] text-white rounded-lg text-xs font-semibold hover:bg-[#845826] transition shadow-md disabled:opacity-60 self-start sm:self-auto"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          <span>Save Template</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Pane */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4 shadow-xs">
          <h3 className="text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-3 flex items-center gap-2">
            <FileText size={16} className="text-[#9C6B30]" /> Welcome Email Configuration
          </h3>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
              Email Subject Line
            </label>
            <input
              type="text"
              value={template.subject || ''}
              onChange={(e) => setTemplate(t => ({ ...t, subject: e.target.value }))}
              placeholder="Welcome to MikuMantra"
              className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
              Preview Text (Preheader)
            </label>
            <input
              type="text"
              value={template.previewText || ''}
              onChange={(e) => setTemplate(t => ({ ...t, previewText: e.target.value }))}
              placeholder="Enjoy ₹2,000 off your first order"
              className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
              Main Email Heading
            </label>
            <input
              type="text"
              value={template.heading || ''}
              onChange={(e) => setTemplate(t => ({ ...t, heading: e.target.value }))}
              placeholder="Welcome to MikuMantra"
              className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
              Email Body Content
            </label>
            <textarea
              rows={4}
              value={template.body || ''}
              onChange={(e) => setTemplate(t => ({ ...t, body: e.target.value }))}
              placeholder="Thank you for joining our inner circle..."
              className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                CTA Button Text
              </label>
              <input
                type="text"
                value={template.ctaText || ''}
                onChange={(e) => setTemplate(t => ({ ...t, ctaText: e.target.value }))}
                placeholder="Explore the Collection"
                className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                CTA Button URL
              </label>
              <input
                type="text"
                value={template.ctaUrl || ''}
                onChange={(e) => setTemplate(t => ({ ...t, ctaUrl: e.target.value }))}
                placeholder="/shop"
                className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
              Footer Note
            </label>
            <input
              type="text"
              value={template.footerText || ''}
              onChange={(e) => setTemplate(t => ({ ...t, footerText: e.target.value }))}
              placeholder="MikuMantra Fine Jewellery Atelier"
              className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
            />
          </div>
        </div>

        {/* Live Email Preview Pane */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
            <Eye size={16} className="text-[#9C6B30]" /> Email Client Mockup
          </h3>

          <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-lg bg-[#F7F5F0]">
            <div className="bg-neutral-800 text-white p-3 text-xs space-y-1 font-mono">
              <div><strong className="text-neutral-400">Subject:</strong> {template.subject}</div>
              <div className="text-neutral-400 text-[11px] truncate"><strong className="text-neutral-500">Preheader:</strong> {template.previewText}</div>
            </div>

            <div className="p-8 max-w-lg mx-auto bg-white my-6 rounded-lg shadow-sm border border-neutral-100 text-center">
              <div className="text-[11px] tracking-[0.3em] uppercase text-[#9C6B30] mb-2 font-semibold">MikuMantra Atelier</div>
              <h2 className="font-display text-2xl text-neutral-900 mb-4">{template.heading}</h2>
              <div className="gold-line w-12 mx-auto mb-4" />
              <p className="text-xs text-neutral-600 leading-relaxed mb-6 font-light">{template.body}</p>
              
              {template.ctaText && (
                <div className="mb-6">
                  <span className="inline-block bg-[#1A1A1A] text-white px-6 py-2.5 rounded-full text-[10px] tracking-widest uppercase font-medium shadow-xs">
                    {template.ctaText}
                  </span>
                </div>
              )}

              <div className="text-[10px] text-neutral-400 pt-4 border-t border-neutral-100 font-mono">
                {template.footerText}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
