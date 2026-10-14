'use client';

import { useEffect, useState } from 'react';
import {
  Save, Loader2, RefreshCw, CheckCircle2, Sliders, Type, MessageSquare,
  Palette, Eye, EyeOff, Sparkles, AlertCircle, Plus, Trash2, Mail
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminNewsletterSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [activeTab, setActiveTab] = useState('content');
  const [errors, setErrors] = useState({});

  const isValidEmail = (email) => {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z0-9-]{2,}$/;
    return emailRegex.test(email.trim());
  };

  const validateForm = () => {
    const errs = {};
    const trimmedFromEmail = (form.fromEmail || '').trim();
    if (!trimmedFromEmail) {
      errs.fromEmail = 'Sender email address is required.';
    } else if (!isValidEmail(trimmedFromEmail)) {
      errs.fromEmail = 'Please enter a valid sender email address (e.g. sender@example.com).';
    }

    const trimmedReplyTo = (form.replyTo || '').trim();
    if (trimmedReplyTo && !isValidEmail(trimmedReplyTo)) {
      errs.replyTo = 'Please enter a valid reply-to email address (e.g. support@example.com).';
    }

    return errs;
  };

  const [form, setForm] = useState({
    isEnabled: true,
    eyebrow: 'The MikuMantra Circle',
    title: 'Be the first to know',
    description: 'New collections, private previews, and ₹2,000 off your first order.',
    inputPlaceholder: 'Enter your email',
    buttonText: 'SUBSCRIBE',
    fromName: 'MikuMantra',
    fromEmail: 'akash@unictechnology.com',
    replyTo: 'akashsriv1984@gmail.com',
    privileges: [
      '₹2,000 Off First Order',
      'Private Previews & Access',
      'Zero Spam • Unsubscribe Anytime'
    ],
    successMessage: 'You have successfully joined the MikuMantra Circle.',
    alreadySubscribedMessage: 'This email is already subscribed.',
    invalidEmailMessage: 'Please enter a valid email address.',
    errorMessage: 'An error occurred while subscribing. Please try again.',
    loadingMessage: 'SUBSCRIBING...',
    unsubscribeMessage: 'You have been successfully unsubscribed.',
    design: {
      backgroundColor: '#FAF6EF',
      textColor: '#1A1A1A',
      accentColor: '#9C6B30',
      buttonBackground: '#1A1A1A',
      buttonTextColor: '#FFFFFF'
    }
  });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/newsletter/settings', { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data) {
        setForm(prev => ({
          ...prev,
          ...data,
          privileges: Array.isArray(data.privileges) ? data.privileges : prev.privileges,
          design: {
            ...prev.design,
            ...(data.design || {})
          }
        }));
      }
    } catch (err) {
      toast.error('Failed to load newsletter settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    if (e?.preventDefault) e.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setActiveTab('sender');
      const firstError = validationErrors.fromEmail || validationErrors.replyTo;
      toast.error(firstError);
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      const res = await fetch('/api/admin/newsletter/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Newsletter settings saved successfully!');
        if (data.settings) {
          setForm(prev => ({
            ...prev,
            ...data.settings,
            privileges: Array.isArray(data.settings.privileges) ? data.settings.privileges : prev.privileges,
            design: {
              ...prev.design,
              ...(data.settings.design || {})
            }
          }));
        }
      } else {
        toast.error(data.message || data.error || 'Failed to save settings.');
      }
    } catch (err) {
      toast.error('Network error saving settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVisibility = async (newVal) => {
    const updatedStatus = typeof newVal === 'boolean' ? newVal : !form.isEnabled;
    setTogglingVisibility(true);

    // Optimistically update form state
    setForm(prev => ({ ...prev, isEnabled: updatedStatus }));

    try {
      const validationErrors = validateForm();
      const payload = Object.keys(validationErrors).length === 0
        ? { ...form, isEnabled: updatedStatus }
        : { isEnabled: updatedStatus };

      const res = await fetch('/api/admin/newsletter/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(
          updatedStatus
            ? 'Newsletter section is now VISIBLE on the website.'
            : 'Newsletter section is now HIDDEN from the website.'
        );
        if (data.settings) {
          setForm(prev => ({
            ...prev,
            ...data.settings,
            privileges: Array.isArray(data.settings.privileges) ? data.settings.privileges : prev.privileges,
            design: {
              ...prev.design,
              ...(data.settings.design || {})
            }
          }));
        }
      } else {
        setForm(prev => ({ ...prev, isEnabled: !updatedStatus }));
        toast.error(data.message || data.error || 'Failed to update section visibility.');
      }
    } catch (err) {
      setForm(prev => ({ ...prev, isEnabled: !updatedStatus }));
      toast.error('Network error updating section visibility.');
    } finally {
      setTogglingVisibility(false);
    }
  };

  const handlePrivilegeChange = (index, value) => {
    const updated = [...(form.privileges || [])];
    updated[index] = value;
    setForm(f => ({ ...f, privileges: updated }));
  };

  const addPrivilege = () => {
    setForm(f => ({
      ...f,
      privileges: [...(f.privileges || []), 'New Privilege Highlight']
    }));
  };

  const removePrivilege = (index) => {
    const updated = (form.privileges || []).filter((_, i) => i !== index);
    setForm(f => ({ ...f, privileges: updated }));
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="animate-spin inline text-[#9C6B30]" size={28} />
        <p className="text-xs text-neutral-500 mt-2 font-mono">Loading CMS settings from MongoDB...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="font-display text-2xl xs:text-3xl sm:text-4xl text-[#1A1A1A]">
            Newsletter Settings
          </div>
          <div className="gold-line w-12 mt-2 mb-2" />
          <p className="text-xs sm:text-sm text-neutral-500 font-light">
            Configure dynamic copy, status messages, section visibility, atelier privileges, and design colors for the live website.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Quick Visibility Button in Header */}
          <button
            type="button"
            onClick={() => handleToggleVisibility(!form.isEnabled)}
            disabled={togglingVisibility || saving}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition shadow-xs border ${
              form.isEnabled
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
            } disabled:opacity-60`}
            title={form.isEnabled ? 'Hide section from live website' : 'Show section on live website'}
          >
            {togglingVisibility ? (
              <Loader2 size={14} className="animate-spin" />
            ) : form.isEnabled ? (
              <EyeOff size={14} />
            ) : (
              <Eye size={14} />
            )}
            <span>{form.isEnabled ? 'Hide Section' : 'Show Section'}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving || togglingVisibility}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#9C6B30] text-white rounded-lg text-xs font-semibold hover:bg-[#845826] transition shadow-md disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      {/* SECTION VISIBILITY CONTROL BANNER */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        form.isEnabled 
          ? 'bg-emerald-50/60 border-emerald-200 shadow-2xs' 
          : 'bg-amber-50/50 border-amber-200 shadow-2xs'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className={`p-2.5 rounded-xl shrink-0 ${
              form.isEnabled 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'bg-neutral-200 text-neutral-600'
            }`}>
              {form.isEnabled ? <Eye size={20} /> : <EyeOff size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-neutral-900">
                  Storefront Newsletter Section
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${
                  form.isEnabled 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                    : 'bg-neutral-200 text-neutral-700 border border-neutral-300'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${form.isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
                  {form.isEnabled ? 'CURRENTLY VISIBLE' : 'CURRENTLY HIDDEN'}
                </span>
              </div>
              <p className="text-xs text-neutral-600 mt-1">
                {form.isEnabled
                  ? 'The subscription banner shown in the live preview is visible to visitors on the homepage.'
                  : 'The subscription banner is currently hidden and will not be displayed on the homepage.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => handleToggleVisibility(true)}
              disabled={togglingVisibility || saving || form.isEnabled}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                form.isEnabled
                  ? 'bg-emerald-600 text-white shadow-xs cursor-default ring-2 ring-emerald-500/30'
                  : 'bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 shadow-2xs hover:border-neutral-400'
              }`}
            >
              <Eye size={14} />
              <span>Show Section</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleVisibility(false)}
              disabled={togglingVisibility || saving || !form.isEnabled}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                !form.isEnabled
                  ? 'bg-neutral-800 text-white shadow-xs cursor-default ring-2 ring-neutral-700/30'
                  : 'bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 shadow-2xs hover:border-neutral-400'
              }`}
            >
              <EyeOff size={14} />
              <span>Hide Section</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-neutral-200 shadow-xs">
            <button
              onClick={() => setActiveTab('content')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition ${
                activeTab === 'content' ? 'bg-[#9C6B30] text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Type size={14} /> Content
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition ${
                activeTab === 'messages' ? 'bg-[#9C6B30] text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <MessageSquare size={14} /> Messages
            </button>
            <button
              onClick={() => setActiveTab('sender')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition relative ${
                activeTab === 'sender' ? 'bg-[#9C6B30] text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Mail size={14} />
              <span>Sender Email</span>
              {(errors.fromEmail || errors.replyTo) && (
                <span className={`w-2 h-2 rounded-full ${activeTab === 'sender' ? 'bg-amber-200' : 'bg-red-500 animate-pulse'}`} />
              )}
            </button>
            <button
              onClick={() => setActiveTab('design')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition ${
                activeTab === 'design' ? 'bg-[#9C6B30] text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Palette size={14} /> Design & Colors
            </button>
          </div>

          {/* TAB 1: CONTENT & VISIBILITY */}
          {activeTab === 'content' && (
            <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-5 shadow-xs">
              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-1.5">
                    {form.isEnabled ? <Eye size={15} className="text-emerald-600" /> : <EyeOff size={15} className="text-neutral-500" />}
                    <span>Newsletter Section Visibility</span>
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">Show or hide this newsletter subscription section on the homepage.</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(!form.isEnabled)}
                    disabled={togglingVisibility || saving}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition border shadow-2xs ${
                      form.isEnabled
                        ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                        : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {togglingVisibility ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : form.isEnabled ? (
                      <>
                        <EyeOff size={13} />
                        <span>Hide Section</span>
                      </>
                    ) : (
                      <>
                        <Eye size={13} />
                        <span>Show Section</span>
                      </>
                    )}
                  </button>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!form.isEnabled}
                      onChange={(e) => handleToggleVisibility(e.target.checked)}
                      disabled={togglingVisibility || saving}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9C6B30]"></div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Eyebrow / Subheading
                </label>
                <input
                  type="text"
                  value={form.eyebrow || ''}
                  onChange={(e) => setForm(f => ({ ...f, eyebrow: e.target.value }))}
                  placeholder="The MikuMantra Circle"
                  className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Main Heading
                </label>
                <input
                  type="text"
                  value={form.title || ''}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Be the first to know"
                  className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Description Copy
                </label>
                <textarea
                  rows={3}
                  value={form.description || ''}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="New collections, private previews, and ₹2,000 off your first order."
                  className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                    Email Input Placeholder
                  </label>
                  <input
                    type="text"
                    value={form.inputPlaceholder || ''}
                    onChange={(e) => setForm(f => ({ ...f, inputPlaceholder: e.target.value }))}
                    placeholder="Enter your email"
                    className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                    Subscribe Button Text
                  </label>
                  <input
                    type="text"
                    value={form.buttonText || ''}
                    onChange={(e) => setForm(f => ({ ...f, buttonText: e.target.value }))}
                    placeholder="SUBSCRIBE"
                    className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                  />
                </div>
              </div>

              {/* PRIVILEGE HIGHLIGHT BADGES */}
              <div className="pt-4 border-t border-neutral-100">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600">
                      Privilege Highlight Badges
                    </label>
                    <p className="text-[11px] text-neutral-400">
                      Highlighted badges displayed below the subscribe form on the website.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addPrivilege}
                    className="flex items-center gap-1 text-xs font-medium text-[#9C6B30] hover:text-[#845826]"
                  >
                    <Plus size={14} /> Add Badge
                  </button>
                </div>

                <div className="space-y-2">
                  {(form.privileges || []).map((priv, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-6 text-center text-xs font-mono text-neutral-400">#{idx + 1}</div>
                      <input
                        type="text"
                        value={priv}
                        onChange={(e) => handlePrivilegeChange(idx, e.target.value)}
                        placeholder="e.g. ₹2,000 Off First Order"
                        className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                      />
                      <button
                        type="button"
                        onClick={() => removePrivilege(idx)}
                        className="p-2 text-neutral-400 hover:text-red-500 rounded-lg transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MESSAGES */}
          {activeTab === 'messages' && (
            <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4 shadow-xs">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-1">
                  Success Message
                </label>
                <input
                  type="text"
                  value={form.successMessage || ''}
                  onChange={(e) => setForm(f => ({ ...f, successMessage: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">
                  Already Subscribed Message
                </label>
                <input
                  type="text"
                  value={form.alreadySubscribedMessage || ''}
                  onChange={(e) => setForm(f => ({ ...f, alreadySubscribedMessage: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-red-600 mb-1">
                  Invalid Email Message
                </label>
                <input
                  type="text"
                  value={form.invalidEmailMessage || ''}
                  onChange={(e) => setForm(f => ({ ...f, invalidEmailMessage: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-red-600 mb-1">
                  API / Network Error Message
                </label>
                <input
                  type="text"
                  value={form.errorMessage || ''}
                  onChange={(e) => setForm(f => ({ ...f, errorMessage: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Loading Button Text
                </label>
                <input
                  type="text"
                  value={form.loadingMessage || ''}
                  onChange={(e) => setForm(f => ({ ...f, loadingMessage: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Unsubscribe Confirmation Message
                </label>
                <input
                  type="text"
                  value={form.unsubscribeMessage || ''}
                  onChange={(e) => setForm(f => ({ ...f, unsubscribeMessage: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>
            </div>
          )}

          {/* TAB: SENDER EMAIL IDENTITY */}
          {activeTab === 'sender' && (
            <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-5 shadow-xs">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">Email Infrastructure Sender Identity</h3>
                <p className="text-xs text-neutral-500">
                  Configure the outbound sender display name, email address, and reply-to address used for marketing campaigns and broadcasts.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Sender Display Name
                </label>
                <input
                  type="text"
                  value={form.fromName || ''}
                  onChange={(e) => setForm(f => ({ ...f, fromName: e.target.value }))}
                  placeholder="MikuMantra"
                  className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Sender Email Address (Outbound "From" Address) <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.fromEmail || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm(f => ({ ...f, fromEmail: val }));
                    if (errors.fromEmail && val.trim() && isValidEmail(val)) {
                      setErrors(prev => {
                        const next = { ...prev };
                        delete next.fromEmail;
                        return next;
                      });
                    }
                  }}
                  onBlur={() => {
                    const val = (form.fromEmail || '').trim();
                    if (!val) {
                      setErrors(prev => ({ ...prev, fromEmail: 'Sender email address is required.' }));
                    } else if (!isValidEmail(val)) {
                      setErrors(prev => ({ ...prev, fromEmail: 'Please enter a valid sender email address (e.g. sender@example.com).' }));
                    } else {
                      setErrors(prev => {
                        const next = { ...prev };
                        delete next.fromEmail;
                        return next;
                      });
                    }
                  }}
                  placeholder="akash@unictechnology.com"
                  className={`w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none transition ${
                    errors.fromEmail
                      ? 'border-red-500 bg-red-50/20 text-neutral-900 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                      : 'border-neutral-200 focus:border-[#9C6B30]'
                  }`}
                />
                {errors.fromEmail && (
                  <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1.5 font-medium">
                    <AlertCircle size={13} className="shrink-0 text-red-500" />
                    <span>{errors.fromEmail}</span>
                  </p>
                )}
                <p className="text-[11px] text-neutral-500 mt-2 font-mono bg-neutral-50 p-2 rounded border border-neutral-200">
                  Active Dispatch Header: "{form.fromName || 'MikuMantra'}" &lt;{form.fromEmail || 'akash@unictechnology.com'}&gt;
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600">
                    Reply-To Email Address
                  </label>
                  <span className="text-[10px] text-neutral-400 font-normal uppercase">Optional</span>
                </div>
                <input
                  type="email"
                  value={form.replyTo || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm(f => ({ ...f, replyTo: val }));
                    if (errors.replyTo && (!val.trim() || isValidEmail(val))) {
                      setErrors(prev => {
                        const next = { ...prev };
                        delete next.replyTo;
                        return next;
                      });
                    }
                  }}
                  onBlur={() => {
                    const val = (form.replyTo || '').trim();
                    if (val && !isValidEmail(val)) {
                      setErrors(prev => ({ ...prev, replyTo: 'Please enter a valid reply-to email address (e.g. support@example.com).' }));
                    } else {
                      setErrors(prev => {
                        const next = { ...prev };
                        delete next.replyTo;
                        return next;
                      });
                    }
                  }}
                  placeholder="akashsriv1984@gmail.com"
                  className={`w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none transition ${
                    errors.replyTo
                      ? 'border-red-500 bg-red-50/20 text-neutral-900 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                      : 'border-neutral-200 focus:border-[#9C6B30]'
                  }`}
                />
                {errors.replyTo && (
                  <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1.5 font-medium">
                    <AlertCircle size={13} className="shrink-0 text-red-500" />
                    <span>{errors.replyTo}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DESIGN COLORS */}
          {activeTab === 'design' && (
            <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4 shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                    Section Background Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.design?.backgroundColor || '#FAF6EF'}
                      onChange={(e) => setForm(f => ({ ...f, design: { ...f.design, backgroundColor: e.target.value } }))}
                      className="w-10 h-10 rounded border border-neutral-200 cursor-pointer p-1"
                    />
                    <input
                      type="text"
                      value={form.design?.backgroundColor || '#FAF6EF'}
                      onChange={(e) => setForm(f => ({ ...f, design: { ...f.design, backgroundColor: e.target.value } }))}
                      className="flex-1 px-3 py-2 border border-neutral-200 rounded text-xs font-mono uppercase focus:outline-none focus:border-[#9C6B30]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                    Main Text Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.design?.textColor || '#1A1A1A'}
                      onChange={(e) => setForm(f => ({ ...f, design: { ...f.design, textColor: e.target.value } }))}
                      className="w-10 h-10 rounded border border-neutral-200 cursor-pointer p-1"
                    />
                    <input
                      type="text"
                      value={form.design?.textColor || '#1A1A1A'}
                      onChange={(e) => setForm(f => ({ ...f, design: { ...f.design, textColor: e.target.value } }))}
                      className="flex-1 px-3 py-2 border border-neutral-200 rounded text-xs font-mono uppercase focus:outline-none focus:border-[#9C6B30]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                    Accent Gold/Highlight Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.design?.accentColor || '#9C6B30'}
                      onChange={(e) => setForm(f => ({ ...f, design: { ...f.design, accentColor: e.target.value } }))}
                      className="w-10 h-10 rounded border border-neutral-200 cursor-pointer p-1"
                    />
                    <input
                      type="text"
                      value={form.design?.accentColor || '#9C6B30'}
                      onChange={(e) => setForm(f => ({ ...f, design: { ...f.design, accentColor: e.target.value } }))}
                      className="flex-1 px-3 py-2 border border-neutral-200 rounded text-xs font-mono uppercase focus:outline-none focus:border-[#9C6B30]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                    Button Background Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.design?.buttonBackground || '#1A1A1A'}
                      onChange={(e) => setForm(f => ({ ...f, design: { ...f.design, buttonBackground: e.target.value } }))}
                      className="w-10 h-10 rounded border border-neutral-200 cursor-pointer p-1"
                    />
                    <input
                      type="text"
                      value={form.design?.buttonBackground || '#1A1A1A'}
                      onChange={(e) => setForm(f => ({ ...f, design: { ...f.design, buttonBackground: e.target.value } }))}
                      className="flex-1 px-3 py-2 border border-neutral-200 rounded text-xs font-mono uppercase focus:outline-none focus:border-[#9C6B30]"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                    Button Text Color
                  </label>
                  <div className="flex items-center gap-2 max-w-sm">
                    <input
                      type="color"
                      value={form.design?.buttonTextColor || '#FFFFFF'}
                      onChange={(e) => setForm(f => ({ ...f, design: { ...f.design, buttonTextColor: e.target.value } }))}
                      className="w-10 h-10 rounded border border-neutral-200 cursor-pointer p-1"
                    />
                    <input
                      type="text"
                      value={form.design?.buttonTextColor || '#FFFFFF'}
                      onChange={(e) => setForm(f => ({ ...f, design: { ...f.design, buttonTextColor: e.target.value } }))}
                      className="flex-1 px-3 py-2 border border-neutral-200 rounded text-xs font-mono uppercase focus:outline-none focus:border-[#9C6B30]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Frontend Preview Pane */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-1.5">
              <Eye size={15} className="text-[#9C6B30]" /> Live Preview
            </h3>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${form.isEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-600'}`}>
                {form.isEnabled ? 'Visible' : 'Hidden'}
              </span>
              <button
                type="button"
                onClick={() => handleToggleVisibility(!form.isEnabled)}
                disabled={togglingVisibility || saving}
                title={form.isEnabled ? 'Hide section from live website' : 'Show section on live website'}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition border ${
                  form.isEnabled 
                    ? 'border-neutral-200 hover:border-rose-300 text-neutral-600 hover:text-rose-800 bg-white shadow-2xs'
                    : 'border-emerald-600 text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs'
                }`}
              >
                {togglingVisibility ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : form.isEnabled ? (
                  <>
                    <EyeOff size={12} />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <Eye size={12} />
                    <span>Show</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-md">
            <div className="bg-neutral-900 text-white text-[10px] px-3 py-1.5 font-mono flex items-center justify-between">
              <span>Frontend Newsletter Section</span>
              <span>{form.isEnabled ? 'VISIBLE' : 'HIDDEN'}</span>
            </div>

            {form.isEnabled ? (
              <div
                className="p-8 text-center transition-colors"
                style={{ backgroundColor: form.design?.backgroundColor || '#FAF6EF' }}
              >
                <div
                  className="text-[10px] tracking-[0.3em] uppercase mb-2 font-semibold"
                  style={{ color: form.design?.accentColor || '#9C6B30' }}
                >
                  {form.eyebrow || 'Eyebrow'}
                </div>

                <div
                  className="font-display text-2xl font-light mb-2"
                  style={{ color: form.design?.textColor || '#1A1A1A' }}
                >
                  {form.title || 'Heading Title'}
                </div>

                <div className="gold-line w-12 mx-auto my-3" />

                <p
                  className="text-xs font-light mb-6 opacity-80"
                  style={{ color: form.design?.textColor || '#555555' }}
                >
                  {form.description || 'Description'}
                </p>

                <div className="flex flex-col gap-2 max-w-xs mx-auto">
                  <input
                    disabled
                    readOnly
                    placeholder={form.inputPlaceholder || 'Email'}
                    className="w-full border border-neutral-200 rounded-full px-4 py-2 text-xs text-center bg-white"
                  />
                  <button
                    disabled
                    style={{
                      backgroundColor: form.design?.buttonBackground || '#1A1A1A',
                      color: form.design?.buttonTextColor || '#FFFFFF'
                    }}
                    className="w-full py-2 rounded-full text-[10px] tracking-widest uppercase font-semibold"
                  >
                    {form.buttonText || 'Button'}
                  </button>
                </div>

                {/* Highlights preview */}
                {form.privileges && form.privileges.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-black/5 flex flex-wrap items-center justify-center gap-1.5">
                    {form.privileges.map((priv, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 bg-white/70 rounded-full text-neutral-700 font-medium border border-black/5">
                        <Sparkles size={10} style={{ color: form.design?.accentColor || '#9C6B30' }} />
                        {priv}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-10 text-center bg-neutral-50 text-neutral-500 text-xs space-y-3">
                <EyeOff size={32} className="mx-auto text-neutral-400" />
                <div>
                  <p className="font-semibold text-neutral-800 text-sm">Section is currently HIDDEN</p>
                  <p className="text-[11px] text-neutral-400 mt-1 max-w-xs mx-auto">
                    This newsletter section will not appear on the live storefront homepage.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleVisibility(true)}
                  disabled={togglingVisibility || saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#9C6B30] text-white rounded-lg text-xs font-semibold hover:bg-[#845826] transition shadow-xs"
                >
                  <Eye size={13} />
                  <span>Show Section on Website</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
