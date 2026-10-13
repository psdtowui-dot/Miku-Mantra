'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Send, Plus, Search, X, Loader2, Calendar, Users, Eye, CheckCircle2,
  Clock, AlertTriangle, Trash2, Edit3, Copy, RefreshCw, AlertCircle,
  ShieldCheck, CheckSquare, ExternalLink, Mail, Ban, Save, Smartphone,
  Monitor, Sparkles, Filter, ChevronRight, Check, ArrowRight, Info,
  Percent, Hash, Radio
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminNewsletterCampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState(null);
  const [audienceStats, setAudienceStats] = useState({ all: 0, new: 0, total: 0 });

  // Filter & Search states for campaign list
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showSendConfirmModal, setShowSendConfirmModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showEditSenderModal, setShowEditSenderModal] = useState(false);

  // Active items & Sub-states
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [testEmailInput, setTestEmailInput] = useState('');
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState('ALL');

  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Compose Modal Tab & Preview Mode
  const [composeTab, setComposeTab] = useState('setup'); // 'setup' | 'content' | 'audience' | 'preview'
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'

  const [senderForm, setSenderForm] = useState({
    fromName: 'MikuMantra',
    fromEmail: 'akash@unictechnology.com',
    replyTo: 'akashsriv1984@gmail.com',
    smtpPass: ''
  });

  const [form, setForm] = useState({
    name: '',
    subject: '',
    previewText: '',
    heading: '',
    body: '',
    ctaText: 'Explore The Atelier',
    ctaUrl: '/shop',
    fromName: 'MikuMantra',
    fromEmail: 'akash@unictechnology.com',
    replyTo: 'akashsriv1984@gmail.com',
    audience: 'all',
    sendOption: 'save_draft', // 'save_draft' | 'send_now' | 'schedule'
    scheduleDate: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [campRes, healthRes] = await Promise.all([
        fetch('/api/admin/newsletter/campaigns', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/admin/newsletter/health', { credentials: 'include', cache: 'no-store' })
      ]);

      const campData = await campRes.json();
      const healthData = await healthRes.json();

      if (campRes.ok && campData.campaigns) {
        setCampaigns(campData.campaigns);
        if (campData.audienceStats) {
          setAudienceStats(campData.audienceStats);
        }
      }
      if (healthRes.ok) {
        setHealth(healthData);
        setSenderForm(prev => ({
          ...prev,
          fromName: healthData.fromName || 'MikuMantra',
          fromEmail: healthData.fromAddress || 'akash@unictechnology.com',
          replyTo: healthData.replyTo || 'akashsriv1984@gmail.com'
        }));
      }
    } catch (err) {
      toast.error('Failed to load campaigns or email provider status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute Overall KPI Metrics
  const stats = useMemo(() => {
    const total = campaigns.length;
    const sent = campaigns.filter(c => (c.status || '').toUpperCase() === 'SENT').length;
    const drafts = campaigns.filter(c => (c.status || '').toUpperCase() === 'DRAFT').length;
    const scheduled = campaigns.filter(c => (c.status || '').toUpperCase() === 'SCHEDULED').length;
    const failed = campaigns.filter(c => (c.status || '').toUpperCase() === 'FAILED').length;
    const totalDelivered = campaigns.reduce((acc, curr) => acc + (curr.sentCount || 0), 0);

    return { total, sent, drafts, scheduled, failed, totalDelivered };
  }, [campaigns]);

  // Filtered campaigns list
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(camp => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (camp.name || '').toLowerCase().includes(q) ||
        (camp.subject || '').toLowerCase().includes(q) ||
        (camp.previewText || '').toLowerCase().includes(q);

      const statusUpper = (camp.status || 'DRAFT').toUpperCase();
      const matchesStatus = statusFilter === 'ALL' || statusUpper === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [campaigns, searchQuery, statusFilter]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      name: '',
      subject: '',
      previewText: '',
      heading: '',
      body: '',
      ctaText: 'Explore The Atelier',
      ctaUrl: '/shop',
      fromName: health?.fromName || 'MikuMantra',
      fromEmail: health?.fromAddress || 'akash@unictechnology.com',
      replyTo: health?.replyTo || 'akashsriv1984@gmail.com',
      audience: 'all',
      sendOption: 'save_draft',
      scheduleDate: ''
    });
    setComposeTab('setup');
    setShowCreateModal(true);
  };

  const handleOpenEdit = (camp) => {
    setEditingId(camp.id);
    setForm({
      name: camp.name || '',
      subject: camp.subject || '',
      previewText: camp.previewText || '',
      heading: camp.heading || camp.name || '',
      body: camp.body || '',
      ctaText: camp.ctaText || 'Explore The Atelier',
      ctaUrl: camp.ctaUrl || '/shop',
      fromName: camp.fromName || health?.fromName || 'MikuMantra',
      fromEmail: camp.fromEmail || health?.fromAddress || 'akash@unictechnology.com',
      replyTo: camp.replyTo || health?.replyTo || 'akashsriv1984@gmail.com',
      audience: camp.audience || 'all',
      sendOption: camp.status === 'SCHEDULED' ? 'schedule' : 'save_draft',
      scheduleDate: camp.scheduleDate ? new Date(camp.scheduleDate).toISOString().slice(0, 16) : ''
    });
    setComposeTab('setup');
    setShowCreateModal(true);
  };

  const handleDuplicate = async (camp) => {
    try {
      const payload = {
        name: `${camp.name || 'Campaign'} (Copy)`,
        subject: camp.subject || '',
        previewText: camp.previewText || '',
        heading: camp.heading || camp.name || '',
        body: camp.body || '',
        ctaText: camp.ctaText || 'Explore The Atelier',
        ctaUrl: camp.ctaUrl || '/shop',
        fromName: camp.fromName || health?.fromName || 'MikuMantra',
        fromEmail: camp.fromEmail || health?.fromAddress || 'akash@unictechnology.com',
        replyTo: camp.replyTo || health?.replyTo || 'akashsriv1984@gmail.com',
        audience: camp.audience || 'all',
        status: 'DRAFT'
      };

      const res = await fetch('/api/admin/newsletter/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Duplicated "${camp.name}" as new draft.`);
        loadData();
      } else {
        toast.error(data.message || 'Failed to duplicate campaign.');
      }
    } catch (err) {
      toast.error('Network error duplicating campaign.');
    }
  };

  const handleSaveSenderEmail = async (e) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z0-9-]{2,}$/;
    if (!senderForm.fromEmail.trim() || !emailRegex.test(senderForm.fromEmail.trim())) {
      toast.error('Please enter a valid sender email address (e.g. sender@example.com).');
      return;
    }
    if (senderForm.replyTo.trim() && !emailRegex.test(senderForm.replyTo.trim())) {
      toast.error('Please enter a valid reply-to email address.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        fromName: senderForm.fromName.trim(),
        fromEmail: senderForm.fromEmail.trim(),
        replyTo: senderForm.replyTo.trim(),
        ...(senderForm.smtpPass?.trim() ? { smtpUser: senderForm.fromEmail.trim(), smtpPass: senderForm.smtpPass.trim() } : {})
      };

      const res = await fetch('/api/admin/newsletter/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Outbound sender identity updated successfully!');
        setShowEditSenderModal(false);
        await loadData();
      } else {
        toast.error(data.message || 'Failed to update sender email.');
      }
    } catch (err) {
      toast.error('Network error updating sender email.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraftOrSchedule = async (e) => {
    if (e?.preventDefault) e.preventDefault();

    if (!form.name.trim() || !form.subject.trim()) {
      toast.error('Campaign internal name and email subject line are required.');
      setComposeTab('setup');
      return;
    }

    // If user chose Send Now from the modal, confirm recipient count first
    if (form.sendOption === 'send_now') {
      if (!health?.isConfigured) {
        toast.error('Email provider is not configured. Configure SMTP_USER or RESEND_API_KEY first.');
        return;
      }
      const targetCount = form.audience === 'new' ? audienceStats.new : audienceStats.all;
      if (targetCount === 0) {
        toast.error('Cannot broadcast now: 0 eligible active subscribers found for this audience.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        subject: form.subject.trim(),
        previewText: (form.previewText || '').trim(),
        heading: (form.heading || form.name || '').trim(),
        body: (form.body || '').trim(),
        ctaText: (form.ctaText || 'Explore The Atelier').trim(),
        ctaUrl: (form.ctaUrl || '/shop').trim(),
        fromName: form.fromName.trim(),
        fromEmail: form.fromEmail.trim(),
        replyTo: form.replyTo.trim(),
        audience: form.audience,
        status: form.sendOption === 'schedule' ? 'SCHEDULED' : 'DRAFT',
        scheduleDate: form.sendOption === 'schedule' ? form.scheduleDate : null
      };

      const url = editingId ? `/api/admin/newsletter/campaigns/${editingId}` : '/api/admin/newsletter/campaigns';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const savedCampaign = data.campaign || { ...payload, id: editingId };

        if (form.sendOption === 'send_now') {
          // Trigger broadcast confirmation directly
          setShowCreateModal(false);
          setActiveCampaign(savedCampaign);
          setShowSendConfirmModal(true);
          loadData();
          return;
        }

        toast.success(
          payload.status === 'SCHEDULED'
            ? 'Campaign scheduled successfully!'
            : (editingId ? 'Campaign draft updated.' : 'Campaign saved as draft.')
        );
        setShowCreateModal(false);
        loadData();
      } else {
        toast.error(data.message || 'Failed to save campaign.');
      }
    } catch (err) {
      toast.error('Network error saving campaign.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenSendTest = (camp) => {
    setActiveCampaign(camp || form);
    setTestEmailInput(health?.fromAddress || senderForm.fromEmail || '');
    setShowTestModal(true);
  };

  const handleSendTestEmail = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!testEmailInput.trim()) {
      toast.error('Please enter a recipient test email address.');
      return;
    }

    setSending(true);
    try {
      const campId = activeCampaign?.id || 'new';
      const res = await fetch(`/api/admin/newsletter/campaigns/${campId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          toEmail: testEmailInput.trim(),
          ...activeCampaign
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || `Test email successfully sent to ${testEmailInput}`);
        setShowTestModal(false);
      } else {
        toast.error(data.message || data.error || 'Failed to send test email.');
      }
    } catch (err) {
      toast.error('Network error sending test email.');
    } finally {
      setSending(false);
    }
  };

  const handleOpenSendNowConfirm = (camp) => {
    if (!health?.isConfigured) {
      toast.error('Email provider is not configured. Configure SMTP_USER or RESEND_API_KEY first.');
      return;
    }
    const count = camp.audience === 'new' ? audienceStats.new : audienceStats.all;
    if (count === 0) {
      toast.error('No eligible active subscribers found in this audience.');
      return;
    }
    setActiveCampaign(camp);
    setShowSendConfirmModal(true);
  };

  const handleExecuteSendNow = async () => {
    if (!activeCampaign?.id) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/newsletter/campaigns/${activeCampaign.id}/send`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Campaign broadcast dispatched successfully!');
        setShowSendConfirmModal(false);
        loadData();
      } else {
        toast.error(data.message || 'Failed to send campaign broadcast.');
      }
    } catch (err) {
      toast.error('Network error executing campaign broadcast.');
    } finally {
      setSending(false);
    }
  };

  const handleCancelScheduled = async (id) => {
    if (!confirm('Are you sure you want to cancel this scheduled campaign?')) return;
    try {
      const res = await fetch(`/api/admin/newsletter/campaigns/${id}/cancel`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Scheduled campaign cancelled.');
        loadData();
      } else {
        toast.error(data.message || 'Failed to cancel campaign.');
      }
    } catch (err) {
      toast.error('Network error cancelling campaign.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to permanently delete this campaign and its recipient delivery logs?')) return;
    try {
      const res = await fetch(`/api/admin/newsletter/campaigns/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        toast.success('Campaign deleted successfully.');
        loadData();
      } else {
        toast.error('Failed to delete campaign.');
      }
    } catch (err) {
      toast.error('Failed to delete campaign.');
    }
  };

  const handleViewLogs = async (camp) => {
    setActiveCampaign(camp);
    setLogSearch('');
    setLogStatusFilter('ALL');
    setShowLogsModal(true);
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/admin/newsletter/campaigns/${camp.id}/logs`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.logs) {
        setLogs(data.logs);
      }
    } catch (err) {
      toast.error('Failed to load recipient logs.');
    } finally {
      setLoadingLogs(false);
    }
  };

  // Filtered recipient logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const q = logSearch.toLowerCase().trim();
      const matchesEmail = !q || (log.email || '').toLowerCase().includes(q);
      const matchesStatus = logStatusFilter === 'ALL' || log.status === logStatusFilter;
      return matchesEmail && matchesStatus;
    });
  }, [logs, logSearch, logStatusFilter]);

  const logsStats = useMemo(() => {
    const total = logs.length;
    const sent = logs.filter(l => l.status === 'SENT').length;
    const failed = logs.filter(l => l.status === 'FAILED').length;
    const rate = total > 0 ? Math.round((sent / total) * 100) : 0;
    return { total, sent, failed, rate };
  }, [logs]);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="font-display text-2xl xs:text-3xl sm:text-4xl text-[#1A1A1A]">
            Newsletter Campaigns
          </div>
          <div className="gold-line w-12 mt-2 mb-2" />
          <p className="text-xs sm:text-sm text-neutral-500 font-light">
            Compose, preview, test, schedule, and broadcast luxury email campaigns to your verified subscriber circle.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadData}
            className="p-2.5 bg-white border border-neutral-200 text-neutral-600 rounded-lg hover:bg-neutral-50 transition shadow-xs"
            title="Refresh Campaigns"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => setShowEditSenderModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-neutral-200 text-neutral-700 rounded-lg text-xs font-medium hover:bg-neutral-50 transition shadow-xs"
          >
            <Mail size={14} className="text-[#9C6B30]" />
            <span>Sender Email</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#9C6B30] text-white rounded-lg text-xs font-semibold hover:bg-[#845826] transition shadow-md"
          >
            <Plus size={15} />
            <span>Compose Campaign</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Total Campaigns</span>
            <span className="p-1.5 bg-neutral-100 rounded-md text-neutral-600"><Send size={14} /></span>
          </div>
          <div className="text-2xl font-bold text-neutral-900 mt-2">{stats.total}</div>
          <div className="text-[11px] text-neutral-400 mt-1">
            {stats.sent} Sent · {stats.drafts} Drafts · {stats.scheduled} Scheduled
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Total Emails Sent</span>
            <span className="p-1.5 bg-emerald-50 rounded-md text-emerald-600"><CheckCircle2 size={14} /></span>
          </div>
          <div className="text-2xl font-bold text-emerald-950 mt-2">{stats.totalDelivered.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-emerald-700/80 mt-1">
            Recipient dispatches completed
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Active Audience Circle</span>
            <span className="p-1.5 bg-amber-50 rounded-md text-[#9C6B30]"><Users size={14} /></span>
          </div>
          <div className="text-2xl font-bold text-neutral-900 mt-2">{audienceStats.all.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-neutral-400 mt-1">
            +{audienceStats.new} new this month (excluding unsubscribed)
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Delivery Provider</span>
            <span className={`p-1.5 rounded-md ${health?.isConfigured ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              <ShieldCheck size={14} />
            </span>
          </div>
          <div className="text-lg font-bold text-neutral-900 mt-2 truncate">
            {health?.isConfigured ? (health.provider || 'Active Engine') : 'Unconfigured'}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1 truncate">
            {health?.from || senderForm.fromEmail}
          </div>
        </div>
      </div>

      {/* 3. Email Infrastructure Health Banner */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        health?.isConfigured ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}>
        <div className="flex items-start gap-3">
          {health?.isConfigured ? (
            <ShieldCheck size={20} className="text-emerald-600 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={20} className="text-amber-600 mt-0.5 shrink-0" />
          )}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider">
              Email Infrastructure: {health?.isConfigured ? `READY (${health.provider})` : 'NOT READY'}
            </div>
            <div className="text-xs opacity-90 mt-0.5 font-light flex flex-wrap items-center gap-2">
              <span>
                {health?.isConfigured
                  ? `Authenticated outbound dispatcher via "${health.fromName || 'MikuMantra'}" <${health.fromAddress || health.from}>`
                  : (health?.error || 'Configure SMTP_USER & SMTP_PASS in .env or settings.')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleOpenSendTest({ name: 'System Email Health Verification', subject: 'System Health Check' })}
            className="px-3.5 py-1.5 bg-white border border-black/10 rounded-lg text-xs font-medium hover:bg-black/5 transition shadow-2xs"
          >
            Send Provider Test Email
          </button>
        </div>
      </div>

      {/* 4. Campaigns Control Bar (Search & Filter Tabs) */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'ALL', label: 'All', count: stats.total },
              { id: 'SENT', label: 'Sent', count: stats.sent },
              { id: 'DRAFT', label: 'Drafts', count: stats.drafts },
              { id: 'SCHEDULED', label: 'Scheduled', count: stats.scheduled },
              { id: 'FAILED', label: 'Failed', count: stats.failed }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-[#9C6B30] text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-neutral-200/80 text-neutral-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Field */}
          <div className="relative min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns or subject..."
              className="w-full pl-9 pr-8 py-1.5 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Campaigns Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-16 text-center">
            <Loader2 className="animate-spin inline text-[#9C6B30]" size={32} />
            <p className="text-xs text-neutral-500 mt-2 font-mono">Loading campaign broadcasts from MongoDB...</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto text-neutral-400">
              <Send size={24} />
            </div>
            <div className="text-sm font-semibold text-neutral-800">No campaigns found</div>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto font-light">
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try adjusting your search query or status filter.'
                : 'Click "Compose Campaign" to create your first email broadcast for the MikuMantra Circle.'}
            </p>
            {(!searchQuery && statusFilter === 'ALL') && (
              <button
                onClick={handleOpenCreate}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#9C6B30] text-white rounded-lg text-xs font-semibold hover:bg-[#845826] transition shadow-xs"
              >
                <Plus size={14} /> Compose New Campaign
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-neutral-50 text-[10px] tracking-widest uppercase text-neutral-500 border-b border-neutral-200">
                <tr>
                  <th className="text-left p-3.5 pl-4">Campaign & Subject</th>
                  <th className="text-left p-3.5">Target Audience</th>
                  <th className="text-left p-3.5">Status</th>
                  <th className="text-left p-3.5">Recipients Delivered</th>
                  <th className="text-left p-3.5">Schedule / Date</th>
                  <th className="text-right p-3.5 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredCampaigns.map((camp) => {
                  const statusUpper = (camp.status || 'DRAFT').toUpperCase();
                  const targetAudienceEstimate = camp.audience === 'new' ? audienceStats.new : audienceStats.all;

                  return (
                    <tr key={camp.id} className="hover:bg-neutral-50/70 transition">
                      {/* Campaign & Subject */}
                      <td className="p-3.5 pl-4 max-w-[280px]">
                        <div className="font-semibold text-neutral-900 truncate">{camp.name}</div>
                        <div className="text-xs text-neutral-600 truncate mt-0.5 flex items-center gap-1.5">
                          <Mail size={12} className="text-[#9C6B30] shrink-0" />
                          <span className="truncate">{camp.subject}</span>
                        </div>
                        {camp.previewText && (
                          <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                            {camp.previewText}
                          </div>
                        )}
                      </td>

                      {/* Target Audience */}
                      <td className="p-3.5 text-neutral-600">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-100 rounded-md text-xs font-medium text-neutral-700">
                          <Users size={12} className="text-neutral-500" />
                          <span>{camp.audience === 'new' ? 'New Subscribers This Month' : 'All Active Subscribers'}</span>
                        </span>
                        <div className="text-[10px] text-neutral-400 mt-0.5 ml-1 font-mono">
                          Reach: ~{targetAudienceEstimate} contacts
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          statusUpper === 'SENT' ? 'bg-emerald-100 text-emerald-800' :
                          statusUpper === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                          statusUpper === 'SENDING' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                          statusUpper === 'PARTIALLY_SENT' ? 'bg-purple-100 text-purple-800' :
                          statusUpper === 'FAILED' ? 'bg-red-100 text-red-800' :
                          statusUpper === 'CANCELLED' ? 'bg-neutral-200 text-neutral-600' :
                          'bg-neutral-100 text-neutral-700'
                        }`}>
                          {statusUpper === 'SENDING' && <Loader2 size={10} className="animate-spin" />}
                          {statusUpper === 'SENT' && <Check size={11} />}
                          {statusUpper === 'SCHEDULED' && <Clock size={11} />}
                          {statusUpper}
                        </span>
                      </td>

                      {/* Recipients Delivered */}
                      <td className="p-3.5 font-mono text-xs">
                        {statusUpper === 'SENT' || statusUpper === 'PARTIALLY_SENT' ? (
                          <div>
                            <div className="font-semibold text-emerald-900">
                              {camp.sentCount || 0} / {camp.totalRecipients || camp.sentCount || 0}
                            </div>
                            <div className="w-24 bg-neutral-200 h-1.5 rounded-full mt-1 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full"
                                style={{
                                  width: `${camp.totalRecipients ? Math.min(100, Math.round(((camp.sentCount || 0) / camp.totalRecipients) * 100)) : 100}%`
                                }}
                              />
                            </div>
                          </div>
                        ) : statusUpper === 'SCHEDULED' ? (
                          <span className="text-neutral-500 font-sans text-xs">Pending broadcast</span>
                        ) : (
                          <span className="text-neutral-400 font-sans text-xs">Draft ({targetAudienceEstimate} target)</span>
                        )}
                      </td>

                      {/* Schedule / Date */}
                      <td className="p-3.5 text-neutral-500 text-xs">
                        {statusUpper === 'SCHEDULED' && camp.scheduleDate ? (
                          <div className="text-blue-700 font-medium">
                            <Clock size={12} className="inline mr-1" />
                            {new Date(camp.scheduleDate).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </div>
                        ) : camp.sentAt ? (
                          <div>{new Date(camp.sentAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</div>
                        ) : (
                          <div>{new Date(camp.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* DRAFT ACTIONS */}
                          {statusUpper === 'DRAFT' && (
                            <>
                              <button
                                onClick={() => handleOpenSendNowConfirm(camp)}
                                className="px-2.5 py-1 bg-[#9C6B30] hover:bg-[#845826] text-white rounded text-xs font-semibold transition shadow-2xs flex items-center gap-1"
                                title="Broadcast this campaign to all subscribers immediately"
                              >
                                <Send size={11} /> Send Now
                              </button>
                              <button
                                onClick={() => handleOpenSendTest(camp)}
                                className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-xs font-medium transition"
                                title="Send test preview email"
                              >
                                Test
                              </button>
                              <button
                                onClick={() => handleOpenEdit(camp)}
                                className="p-1.5 text-neutral-600 hover:text-neutral-900 rounded hover:bg-neutral-100"
                                title="Edit Draft"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handleDuplicate(camp)}
                                className="p-1.5 text-neutral-500 hover:text-neutral-800 rounded hover:bg-neutral-100"
                                title="Duplicate Campaign"
                              >
                                <Copy size={14} />
                              </button>
                            </>
                          )}

                          {/* SCHEDULED ACTIONS */}
                          {statusUpper === 'SCHEDULED' && (
                            <>
                              <button
                                onClick={() => handleOpenSendTest(camp)}
                                className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-xs font-medium"
                                title="Send test preview"
                              >
                                Test
                              </button>
                              <button
                                onClick={() => handleCancelScheduled(camp.id)}
                                className="px-2 py-1 bg-amber-100 text-amber-800 hover:bg-amber-200 rounded text-xs font-semibold"
                                title="Cancel schedule"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleOpenEdit(camp)}
                                className="p-1.5 text-neutral-600 hover:text-neutral-900 rounded hover:bg-neutral-100"
                                title="Edit Schedule"
                              >
                                <Edit3 size={14} />
                              </button>
                            </>
                          )}

                          {/* SENT / PARTIALLY SENT ACTIONS */}
                          {(statusUpper === 'SENT' || statusUpper === 'PARTIALLY_SENT' || statusUpper === 'FAILED') && (
                            <>
                              <button
                                onClick={() => handleViewLogs(camp)}
                                className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded text-xs font-semibold flex items-center gap-1 shadow-2xs"
                                title="View individual recipient delivery logs"
                              >
                                <Eye size={12} /> Recipient Logs
                              </button>
                              <button
                                onClick={() => handleDuplicate(camp)}
                                className="p-1.5 text-neutral-500 hover:text-neutral-800 rounded hover:bg-neutral-100"
                                title="Duplicate to New Campaign"
                              >
                                <Copy size={14} />
                              </button>
                            </>
                          )}

                          {/* CANCELLED ACTIONS */}
                          {statusUpper === 'CANCELLED' && (
                            <button
                              onClick={() => handleDuplicate(camp)}
                              className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded text-xs font-medium"
                            >
                              Re-draft
                            </button>
                          )}

                          {/* DELETE */}
                          <button
                            onClick={() => handleDelete(camp.id)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 rounded transition hover:bg-red-50"
                            title="Delete Campaign"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: COMPOSE / EDIT CAMPAIGN WITH STEP TABS & LIVE EMAIL PREVIEW     */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-neutral-200 max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-neutral-200 bg-neutral-50/50 shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-neutral-900">
                  {editingId ? 'Edit Campaign Broadcast' : 'Compose Luxury Email Campaign'}
                </h3>
                <p className="text-xs text-neutral-500">
                  Craft an atelier announcement, preview live in real-time, and broadcast to verified subscribers.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stepper Tabs Bar */}
            <div className="flex items-center border-b border-neutral-200 bg-white px-5 shrink-0 overflow-x-auto">
              {[
                { id: 'setup', label: '1. Campaign Setup' },
                { id: 'content', label: '2. Email Content & CTA' },
                { id: 'audience', label: '3. Audience & Sending' },
                { id: 'preview', label: '👁️ Live Email Preview' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setComposeTab(tab.id)}
                  className={`py-3 px-4 text-xs font-semibold border-b-2 transition shrink-0 ${
                    composeTab === tab.id
                      ? 'border-[#9C6B30] text-[#9C6B30]'
                      : 'border-transparent text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto flex-1">
              <form onSubmit={handleSaveDraftOrSchedule} className="space-y-5">
                {/* ----------------- TAB 1: SETUP ----------------- */}
                {composeTab === 'setup' && (
                  <div className="space-y-4 max-w-2xl mx-auto">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                          Campaign Internal Name <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[11px] text-neutral-400">For admin identification</span>
                      </div>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. Diwali Royal High Jewellery 2026"
                        className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                          Email Subject Line <span className="text-red-500">*</span>
                        </label>
                        <span className={`text-[11px] font-mono ${
                          (form.subject.length > 60) ? 'text-amber-600' : 'text-neutral-400'
                        }`}>
                          {form.subject.length} chars (suggested 30-50)
                        </span>
                      </div>
                      <input
                        type="text"
                        required
                        value={form.subject}
                        onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))}
                        placeholder="✨ An Invitation to Royal Splendour | Private Atelier Previews"
                        className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                          Inbox Preview Text Snippet (Preheader)
                        </label>
                        <span className="text-[11px] text-neutral-400 font-mono">
                          {form.previewText.length} chars
                        </span>
                      </div>
                      <input
                        type="text"
                        value={form.previewText}
                        onChange={(e) => setForm(f => ({ ...f, previewText: e.target.value }))}
                        placeholder="e.g. Exclusive handcrafted pieces unveiled for the MikuMantra Circle..."
                        className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                      />
                      <p className="text-[11px] text-neutral-400 mt-1">
                        This text displays next to the subject line in Gmail, Apple Mail, and Outlook inboxes.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                          Sender Display Name
                        </label>
                        <input
                          type="text"
                          value={form.fromName}
                          onChange={(e) => setForm(f => ({ ...f, fromName: e.target.value }))}
                          className="w-full px-3.5 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                          From Email Address
                        </label>
                        <input
                          type="email"
                          value={form.fromEmail}
                          onChange={(e) => setForm(f => ({ ...f, fromEmail: e.target.value }))}
                          className="w-full px-3.5 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs text-neutral-600 font-mono">
                      Active Email Dispatch Header: &quot;{form.fromName}&quot; &lt;{form.fromEmail}&gt;
                    </div>

                    <div className="flex justify-end pt-3">
                      <button
                        type="button"
                        onClick={() => setComposeTab('content')}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#9C6B30] text-white rounded-lg text-xs font-semibold hover:bg-[#845826]"
                      >
                        <span>Next: Email Content & CTA</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                )}

                {/* ----------------- TAB 2: CONTENT & CTA ----------------- */}
                {composeTab === 'content' && (
                  <div className="space-y-4 max-w-2xl mx-auto">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                        Email Headline / Title
                      </label>
                      <input
                        type="text"
                        value={form.heading}
                        onChange={(e) => setForm(f => ({ ...f, heading: e.target.value }))}
                        placeholder={form.name || 'An Invitation to Royal Splendour'}
                        className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                      />
                      <p className="text-[11px] text-neutral-400 mt-1">
                        Featured in bold serif typography at the top of the email card.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                          Email Message Body Copy
                        </label>
                        <span className="text-[11px] text-neutral-400">Separate paragraphs with blank lines</span>
                      </div>
                      <textarea
                        rows={7}
                        value={form.body}
                        onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))}
                        placeholder="Dear Patron,&#10;&#10;We are delighted to invite you to an exclusive unveiling of our festive High Jewellery collection. Handcrafted in our Jaipur atelier with conflict-free gemstones and hallmarked 22K gold, each piece carries centuries of craftsmanship.&#10;&#10;As a distinguished member of the MikuMantra Circle, enjoy early access and private concierge consultations."
                        className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#9C6B30] leading-relaxed font-sans"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                          Call To Action (CTA) Button Text
                        </label>
                        <input
                          type="text"
                          value={form.ctaText}
                          onChange={(e) => setForm(f => ({ ...f, ctaText: e.target.value }))}
                          placeholder="Explore The Royal Collection"
                          className="w-full px-3.5 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                          CTA Destination Link / URL
                        </label>
                        <input
                          type="text"
                          value={form.ctaUrl}
                          onChange={(e) => setForm(f => ({ ...f, ctaUrl: e.target.value }))}
                          placeholder="/shop?category=wedding"
                          className="w-full px-3.5 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3">
                      <button
                        type="button"
                        onClick={() => setComposeTab('setup')}
                        className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-lg text-xs font-medium hover:bg-neutral-50"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setComposeTab('audience')}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#9C6B30] text-white rounded-lg text-xs font-semibold hover:bg-[#845826]"
                      >
                        <span>Next: Audience & Sending</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                )}

                {/* ----------------- TAB 3: AUDIENCE & SENDING ----------------- */}
                {composeTab === 'audience' && (
                  <div className="space-y-5 max-w-2xl mx-auto">
                    {/* Audience Segment Selection */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-2">
                        Target Audience Segment
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label
                          className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                            form.audience === 'all'
                              ? 'border-[#9C6B30] bg-[#FAF6EF]/60 ring-1 ring-[#9C6B30]'
                              : 'border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-neutral-900">All Active Subscribers</span>
                              <input
                                type="radio"
                                name="audience"
                                checked={form.audience === 'all'}
                                onChange={() => setForm(f => ({ ...f, audience: 'all' }))}
                                className="accent-[#9C6B30]"
                              />
                            </div>
                            <p className="text-[11px] text-neutral-500 mt-1">
                              Every verified subscriber who has not unsubscribed.
                            </p>
                          </div>
                          <div className="mt-3 pt-2 border-t border-black/5 flex items-center justify-between text-xs">
                            <span className="text-neutral-500">Reach:</span>
                            <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-mono">
                              {audienceStats.all.toLocaleString('en-IN')} recipients
                            </span>
                          </div>
                        </label>

                        <label
                          className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                            form.audience === 'new'
                              ? 'border-[#9C6B30] bg-[#FAF6EF]/60 ring-1 ring-[#9C6B30]'
                              : 'border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-neutral-900">New Subscribers This Month</span>
                              <input
                                type="radio"
                                name="audience"
                                checked={form.audience === 'new'}
                                onChange={() => setForm(f => ({ ...f, audience: 'new' }))}
                                className="accent-[#9C6B30]"
                              />
                            </div>
                            <p className="text-[11px] text-neutral-500 mt-1">
                              Subscribers who joined the MikuMantra Circle this calendar month.
                            </p>
                          </div>
                          <div className="mt-3 pt-2 border-t border-black/5 flex items-center justify-between text-xs">
                            <span className="text-neutral-500">Reach:</span>
                            <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-mono">
                              {audienceStats.new.toLocaleString('en-IN')} recipients
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Send Mode Selection */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-2">
                        Delivery Mode
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label
                          className={`p-3.5 rounded-xl border cursor-pointer transition text-center ${
                            form.sendOption === 'save_draft'
                              ? 'border-[#9C6B30] bg-[#FAF6EF]/60 ring-1 ring-[#9C6B30]'
                              : 'border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="sendOption"
                            checked={form.sendOption === 'save_draft'}
                            onChange={() => setForm(f => ({ ...f, sendOption: 'save_draft' }))}
                            className="sr-only"
                          />
                          <div className="text-xs font-semibold text-neutral-900">Save as Draft</div>
                          <p className="text-[11px] text-neutral-400 mt-1">Review & edit later</p>
                        </label>

                        <label
                          className={`p-3.5 rounded-xl border cursor-pointer transition text-center ${
                            form.sendOption === 'send_now'
                              ? 'border-red-500 bg-red-50/40 ring-1 ring-red-500 text-red-900'
                              : 'border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="sendOption"
                            checked={form.sendOption === 'send_now'}
                            onChange={() => setForm(f => ({ ...f, sendOption: 'send_now' }))}
                            className="sr-only"
                          />
                          <div className="text-xs font-semibold text-red-900 flex items-center justify-center gap-1">
                            <Send size={12} /> Send Now
                          </div>
                          <p className="text-[11px] text-red-700/80 mt-1">Immediate live broadcast</p>
                        </label>

                        <label
                          className={`p-3.5 rounded-xl border cursor-pointer transition text-center ${
                            form.sendOption === 'schedule'
                              ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500 text-blue-900'
                              : 'border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="sendOption"
                            checked={form.sendOption === 'schedule'}
                            onChange={() => setForm(f => ({ ...f, sendOption: 'schedule' }))}
                            className="sr-only"
                          />
                          <div className="text-xs font-semibold text-blue-900 flex items-center justify-center gap-1">
                            <Clock size={12} /> Schedule
                          </div>
                          <p className="text-[11px] text-blue-700/80 mt-1">Pick date & time</p>
                        </label>
                      </div>
                    </div>

                    {/* Schedule Date & Time Picker */}
                    {form.sendOption === 'schedule' && (
                      <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-blue-900 mb-1">
                          Scheduled Broadcast Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={form.scheduleDate}
                          onChange={(e) => setForm(f => ({ ...f, scheduleDate: e.target.value }))}
                          className="w-full px-3.5 py-2.5 border border-blue-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-blue-500 bg-white"
                        />
                        <p className="text-[11px] text-blue-700 mt-1">
                          The campaign will be queued and sent automatically when the specified time arrives.
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3">
                      <button
                        type="button"
                        onClick={() => setComposeTab('content')}
                        className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-lg text-xs font-medium hover:bg-neutral-50"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setComposeTab('preview')}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#9C6B30] text-white rounded-lg text-xs font-semibold hover:bg-[#845826]"
                      >
                        <span>View Live Email Preview</span>
                        <Eye size={13} />
                      </button>
                    </div>
                  </div>
                )}

                {/* ----------------- TAB 4: LIVE EMAIL PREVIEW ----------------- */}
                {composeTab === 'preview' && (
                  <div className="space-y-4">
                    {/* Device Toggle & Quick Test Button */}
                    <div className="flex items-center justify-between bg-neutral-100 p-2 rounded-xl">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewDevice('desktop')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            previewDevice === 'desktop' ? 'bg-white text-neutral-900 shadow-2xs font-semibold' : 'text-neutral-500 hover:text-neutral-900'
                          }`}
                        >
                          <Monitor size={14} /> Desktop (600px)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewDevice('mobile')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            previewDevice === 'mobile' ? 'bg-white text-neutral-900 shadow-2xs font-semibold' : 'text-neutral-500 hover:text-neutral-900'
                          }`}
                        >
                          <Smartphone size={14} /> Mobile (380px)
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenSendTest(form)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 rounded-lg text-xs font-medium transition shadow-2xs"
                      >
                        <Mail size={13} className="text-[#9C6B30]" /> Send Test to My Inbox
                      </button>
                    </div>

                    {/* Email Container Simulation */}
                    <div className="bg-[#EFEAE1] p-4 sm:p-8 rounded-2xl flex justify-center overflow-x-auto min-h-[500px]">
                      <div
                        className={`bg-white rounded-2xl shadow-xl overflow-hidden border border-[#EAE3D2] transition-all ${
                          previewDevice === 'mobile' ? 'w-[380px]' : 'w-full max-w-[600px]'
                        }`}
                      >
                        {/* Luxury Dark Header */}
                        <div className="bg-[#0F0F10] p-7 text-center border-b-2 border-[#9C6B30]">
                          <div className="font-serif text-2xl font-bold tracking-[0.2em] text-[#D4AF37] uppercase">
                            MikuMantra
                          </div>
                          <div className="text-[9px] tracking-[0.35em] text-neutral-300 uppercase mt-1">
                            House of Fine Jewellery · Private Circle
                          </div>
                        </div>

                        {/* Subject & Preheader Preview Bar */}
                        <div className="bg-neutral-50 px-6 py-2.5 border-b border-neutral-100 text-[11px] text-neutral-500 font-mono">
                          <div><span className="text-neutral-400 font-sans">Subject:</span> {form.subject || 'Your Subject Line'}</div>
                          {form.previewText && (
                            <div className="text-neutral-400 truncate mt-0.5">
                              <span className="font-sans">Snippet:</span> {form.previewText}
                            </div>
                          )}
                        </div>

                        {/* Email Card Body */}
                        <div className="p-7 sm:p-9 space-y-6">
                          {/* Headline */}
                          <div className="text-center">
                            <h2 className="font-serif text-xl sm:text-2xl text-neutral-900 tracking-wide font-normal">
                              {form.heading || form.name || 'Private Preview Invitation'}
                            </h2>
                            <div className="w-10 h-0.5 bg-[#D4AF37] mx-auto mt-4" />
                          </div>

                          {/* Message Paragraphs */}
                          <div className="text-xs sm:text-sm text-neutral-700 leading-relaxed space-y-3 font-sans">
                            {(form.body || 'Dear Patron,\n\nWe are delighted to present our finest handcrafted jewels created by master artisans at our Jaipur atelier.\n\nEnjoy bespoke jewellery previews and complimentary insured delivery across India.')
                              .split('\n\n')
                              .map((paragraph, idx) => (
                                <p key={idx} className="whitespace-pre-line">{paragraph}</p>
                              ))}
                          </div>

                          {/* CTA Button */}
                          <div className="text-center pt-2">
                            <a
                              href="#preview"
                              onClick={(e) => e.preventDefault()}
                              className="inline-block bg-[#1A1A1A] text-white text-[11px] font-bold tracking-[0.2em] uppercase px-8 py-3.5 rounded-full shadow-lg hover:bg-[#333] transition"
                            >
                              {form.ctaText || 'Explore The Atelier'}
                            </a>
                            <div className="text-[10px] text-neutral-400 font-mono mt-2">
                              Destination: {form.ctaUrl || '/shop'}
                            </div>
                          </div>
                        </div>

                        {/* Atelier Trust Strip */}
                        <div className="bg-[#FAF6EF] py-4 px-6 border-t border-b border-[#EAE3D2] text-center">
                          <p className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-[#9C6B30] uppercase m-0">
                            ✨ BIS Hallmarked 22K Gold · SGL Certified Diamonds · Insured Shipping
                          </p>
                        </div>

                        {/* Footer & Unsubscribe Note */}
                        <div className="p-6 text-center text-neutral-500 text-[11px] space-y-2">
                          <p className="m-0">MikuMantra Fine Jewellery Atelier, Jaipur, India.</p>
                          <p className="text-[10px] text-neutral-400 m-0">
                            Sent with care to <span className="text-neutral-700 font-medium">recipient@client.com</span>
                          </p>
                          <div className="text-[10px] text-neutral-400 pt-1">
                            You may <span className="text-[#9C6B30] underline font-medium">unsubscribe anytime here</span>.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-5 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => handleOpenSendTest(form)}
                    className="px-3.5 py-2 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition"
                  >
                    Send Test Email
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 text-xs font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className={`px-5 py-2 text-xs font-semibold text-white rounded-lg transition shadow-md disabled:opacity-60 flex items-center gap-1.5 ${
                        form.sendOption === 'send_now' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#9C6B30] hover:bg-[#845826]'
                      }`}
                    >
                      {saving ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : form.sendOption === 'send_now' ? (
                        <Send size={13} />
                      ) : (
                        <CheckCircle2 size={13} />
                      )}
                      <span>
                        {form.sendOption === 'send_now'
                          ? 'Send Broadcast Now'
                          : form.sendOption === 'schedule'
                          ? 'Schedule Campaign'
                          : 'Save Draft'}
                      </span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SEND TEST EMAIL                                                  */}
      {/* ========================================================================= */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-semibold text-neutral-900">Send Test Email Preview</h3>
              <button onClick={() => setShowTestModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-neutral-600 font-light">
              Dispatch a real preview of <span className="font-semibold text-neutral-800">"{activeCampaign?.subject || 'Campaign'}"</span> directly to your personal inbox. Subscriber lists will <span className="font-semibold text-neutral-900">NOT</span> be emailed.
            </p>

            <form onSubmit={handleSendTestEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Recipient Test Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={testEmailInput}
                  onChange={(e) => setTestEmailInput(e.target.value)}
                  placeholder="admin@mikumantra.com"
                  className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="px-4 py-2 text-xs font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending || !testEmailInput.trim()}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#9C6B30] hover:bg-[#845826] rounded-lg transition shadow-md disabled:opacity-60 flex items-center gap-1.5"
                >
                  {sending ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                  <span>Send Test Email</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EXPLICIT CONFIRMATION BEFORE LIVE SEND                           */}
      {/* ========================================================================= */}
      {showSendConfirmModal && activeCampaign && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-neutral-200">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-neutral-900">Confirm Live Email Broadcast</h3>
                <p className="text-xs text-neutral-500 font-light">Real email delivery will be executed immediately.</p>
              </div>
            </div>

            <div className="bg-[#FAF6EF] p-4 rounded-xl border border-[#EAE3D2] space-y-2 text-xs text-neutral-800">
              <div><span className="font-semibold text-neutral-500">Campaign:</span> {activeCampaign.name}</div>
              <div><span className="font-semibold text-neutral-500">Subject:</span> {activeCampaign.subject}</div>
              <div><span className="font-semibold text-neutral-500">From Address:</span> {activeCampaign.fromEmail || health?.from}</div>
              <div>
                <span className="font-semibold text-neutral-500">Target Audience:</span>{' '}
                <span className="font-bold text-emerald-800">
                  {activeCampaign.audience === 'new' ? 'New Subscribers This Month' : 'All Active Subscribers'} (
                  {(activeCampaign.audience === 'new' ? audienceStats.new : audienceStats.all).toLocaleString('en-IN')} recipients)
                </span>
              </div>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed font-light">
              This will dispatch live emails through <span className="font-semibold">{health?.provider || 'configured email provider'}</span>. All contacts with unsubscribed status or opted-out preferences are automatically excluded.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowSendConfirmModal(false)}
                className="px-4 py-2 text-xs font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteSendNow}
                disabled={sending}
                className="px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition shadow-md disabled:opacity-60 flex items-center gap-1.5"
              >
                {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                <span>Confirm & Send Live Broadcast</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: RECIPIENT DELIVERY LOGS WITH METRICS & SEARCH                   */}
      {/* ========================================================================= */}
      {showLogsModal && activeCampaign && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-neutral-200 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 shrink-0">
              <div>
                <h3 className="text-base font-semibold text-neutral-900">Recipient Delivery Logs</h3>
                <p className="text-xs text-neutral-500 font-light truncate max-w-lg">
                  {activeCampaign.name} — &quot;{activeCampaign.subject}&quot;
                </p>
              </div>
              <button onClick={() => setShowLogsModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <X size={18} />
              </button>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-4 gap-3 py-3 border-b border-neutral-100 shrink-0 text-center">
              <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-100">
                <div className="text-[10px] uppercase font-semibold text-neutral-400">Total Targeted</div>
                <div className="text-base font-bold text-neutral-900 mt-0.5">{logsStats.total}</div>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-100">
                <div className="text-[10px] uppercase font-semibold text-emerald-600">Successfully Sent</div>
                <div className="text-base font-bold text-emerald-900 mt-0.5">{logsStats.sent}</div>
              </div>
              <div className="p-2.5 bg-red-50 rounded-lg border border-red-100">
                <div className="text-[10px] uppercase font-semibold text-red-600">Failed / Bounced</div>
                <div className="text-base font-bold text-red-900 mt-0.5">{logsStats.failed}</div>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                <div className="text-[10px] uppercase font-semibold text-[#9C6B30]">Dispatch Rate</div>
                <div className="text-base font-bold text-[#9C6B30] mt-0.5">{logsStats.rate}%</div>
              </div>
            </div>

            {/* Search & Status Filter Controls */}
            <div className="flex items-center justify-between gap-3 py-3 shrink-0">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Filter logs by recipient email..."
                  className="w-full pl-8 pr-3 py-1.5 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                />
              </div>
              <div className="flex items-center gap-1">
                {['ALL', 'SENT', 'FAILED'].map(st => (
                  <button
                    key={st}
                    onClick={() => setLogStatusFilter(st)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                      logStatusFilter === st
                        ? 'bg-[#9C6B30] text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Logs Table */}
            <div className="overflow-y-auto flex-1 border border-neutral-200 rounded-xl">
              {loadingLogs ? (
                <div className="p-12 text-center">
                  <Loader2 className="animate-spin inline text-[#9C6B30]" size={24} />
                  <p className="text-xs text-neutral-400 mt-2">Loading recipient delivery records...</p>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-12 text-center text-xs text-neutral-400">
                  {logSearch ? 'No logs match your search filter.' : 'No delivery logs recorded for this campaign.'}
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-neutral-50 text-[10px] uppercase text-neutral-500 border-b border-neutral-200 sticky top-0">
                    <tr>
                      <th className="text-left p-2.5 pl-3">Recipient Email</th>
                      <th className="text-left p-2.5">Status</th>
                      <th className="text-left p-2.5">Provider Message ID / Error</th>
                      <th className="text-right p-2.5 pr-3">Dispatch Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-mono">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-neutral-50/60">
                        <td className="p-2.5 pl-3 text-neutral-900 font-sans font-medium">{log.email}</td>
                        <td className="p-2.5 font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.status === 'SENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-neutral-500 text-[11px] truncate max-w-[200px]" title={log.providerMessageId || log.error || '-'}>
                          {log.providerMessageId || log.error || '-'}
                        </td>
                        <td className="p-2.5 pr-3 text-right text-neutral-400 text-[11px]">
                          {new Date(log.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 flex justify-between items-center shrink-0 text-xs text-neutral-400">
              <div>Showing {filteredLogs.length} of {logs.length} logs</div>
              <button
                onClick={() => setShowLogsModal(false)}
                className="px-4 py-1.5 text-xs font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: EDIT SENDER EMAIL IDENTITY                                       */}
      {/* ========================================================================= */}
      {showEditSenderModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-semibold text-neutral-900">Change Sender Email Address</h3>
              <button onClick={() => setShowEditSenderModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-neutral-500 font-light">
              Update the outbound sender display name and email address used for marketing broadcasts and newsletter dispatches.
            </p>

            <form onSubmit={handleSaveSenderEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Sender Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={senderForm.fromName}
                  onChange={(e) => setSenderForm(s => ({ ...s, fromName: e.target.value }))}
                  placeholder="MikuMantra"
                  className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Sender Email Address (&quot;From&quot; Address) <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={senderForm.fromEmail}
                  onChange={(e) => setSenderForm(s => ({ ...s, fromEmail: e.target.value }))}
                  placeholder="sender@mikumantra.com"
                  className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
                <p className="text-[11px] text-neutral-500 mt-1 font-mono bg-neutral-50 p-2 rounded border border-neutral-200">
                  Header Preview: &quot;{senderForm.fromName || 'MikuMantra'}&quot; &lt;{senderForm.fromEmail || 'hello@mikumantra.com'}&gt;
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Reply-To Email Address
                </label>
                <input
                  type="email"
                  value={senderForm.replyTo}
                  onChange={(e) => setSenderForm(s => ({ ...s, replyTo: e.target.value }))}
                  placeholder="support@mikumantra.com"
                  className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  SMTP App Password (Optional)
                </label>
                <input
                  type="password"
                  value={senderForm.smtpPass || ''}
                  onChange={(e) => setSenderForm(s => ({ ...s, smtpPass: e.target.value }))}
                  placeholder="Leave blank to use default App Password"
                  className="w-full px-3.5 py-2 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-[#9C6B30]"
                />
                <p className="text-[10px] text-neutral-400 mt-1">
                  If connecting to a different Google/SMTP account, enter its 16-character App Password here.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowEditSenderModal(false)}
                  className="px-4 py-2 text-xs font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !senderForm.fromEmail.trim()}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#9C6B30] hover:bg-[#845826] rounded-lg transition shadow-md disabled:opacity-60 flex items-center gap-1.5"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  <span>Save Email Address</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
