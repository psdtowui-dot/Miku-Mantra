'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/use-auth';
import {
  Send, Plus, Search, X, Loader2, Calendar, Users, Eye, CheckCircle2,
  Clock, AlertTriangle, Trash2, Edit3, Copy, RefreshCw, AlertCircle,
  ShieldCheck, CheckSquare, ExternalLink, Mail, Ban, Save
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminNewsletterCampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showSendConfirmModal, setShowSendConfirmModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showEditSenderModal, setShowEditSenderModal] = useState(false);

  const [activeCampaign, setActiveCampaign] = useState(null);
  const [testEmailInput, setTestEmailInput] = useState('');
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [senderForm, setSenderForm] = useState({
    fromName: 'MikuMantra',
    fromEmail: 'kk1414497@gmail.com',
    replyTo: 'support@mikumantra.com'
  });

  const [form, setForm] = useState({
    name: '',
    subject: '',
    previewText: '',
    fromName: 'MikuMantra',
    fromEmail: 'kk1414497@gmail.com',
    replyTo: 'support@mikumantra.com',
    audience: 'all',
    sendOption: 'save_draft', // 'save_draft' | 'send_now' | 'schedule'
    scheduleDate: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [campRes, healthRes] = await Promise.all([
        authFetch('/api/admin/newsletter/campaigns', { cache: 'no-store' }),
        authFetch('/api/admin/newsletter/health', { cache: 'no-store' })
      ]);

      const campData = await campRes.json().catch(() => null);
      const healthData = await healthRes.json().catch(() => null);

      if (campRes.ok && campData && campData.campaigns) {
        setCampaigns(campData.campaigns);
      }
      if (healthRes.ok && healthData) {
        setHealth(healthData);
        setSenderForm({
          fromName: healthData.fromName || 'MikuMantra',
          fromEmail: healthData.fromAddress || 'kk1414497@gmail.com',
          replyTo: healthData.replyTo || 'support@mikumantra.com'
        });
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

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      name: '',
      subject: '',
      previewText: '',
      fromName: health?.fromName || 'MikuMantra',
      fromEmail: health?.fromAddress || 'kk1414497@gmail.com',
      replyTo: health?.replyTo || 'support@mikumantra.com',
      audience: 'all',
      sendOption: 'save_draft',
      scheduleDate: ''
    });
    setShowCreateModal(true);
  };

  const handleOpenEdit = (camp) => {
    setEditingId(camp.id);
    setForm({
      name: camp.name || '',
      subject: camp.subject || '',
      previewText: camp.previewText || '',
      fromName: camp.fromName || health?.fromName || 'MikuMantra',
      fromEmail: camp.fromEmail || health?.fromAddress || 'kk1414497@gmail.com',
      replyTo: camp.replyTo || health?.replyTo || 'support@mikumantra.com',
      audience: camp.audience || 'all',
      sendOption: camp.status === 'SCHEDULED' ? 'schedule' : 'save_draft',
      scheduleDate: camp.scheduleDate ? new Date(camp.scheduleDate).toISOString().slice(0, 16) : ''
    });
    setShowCreateModal(true);
  };

  const handleSaveSenderEmail = async (e) => {
    e.preventDefault();
    if (!senderForm.fromEmail.trim()) {
      toast.error('Sender email address is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        fromName: senderForm.fromName.trim(),
        fromEmail: senderForm.fromEmail.trim(),
        replyTo: senderForm.replyTo.trim(),
        smtpUser: senderForm.fromEmail.trim(),
        ...(senderForm.smtpPass ? { smtpPass: senderForm.smtpPass.trim() } : {})
      };

      const res = await authFetch('/api/admin/newsletter/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        toast.success('Outbound sender email address updated successfully!');
        setShowEditSenderModal(false);
        await loadData();
      } else {
        toast.error((data && data.message) || 'Failed to update sender email.');
      }
    } catch (err) {
      toast.error('Network error updating sender email.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraftOrSchedule = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.subject.trim()) {
      toast.error('Campaign name and email subject are required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        subject: form.subject,
        previewText: form.previewText,
        fromName: form.fromName,
        fromEmail: form.fromEmail,
        replyTo: form.replyTo,
        audience: form.audience,
        status: form.sendOption === 'schedule' ? 'SCHEDULED' : 'DRAFT',
        scheduleDate: form.sendOption === 'schedule' ? form.scheduleDate : null
      };

      const url = editingId ? `/api/admin/newsletter/campaigns/${editingId}` : '/api/admin/newsletter/campaigns';
      const method = editingId ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(
          payload.status === 'SCHEDULED'
            ? 'Campaign scheduled successfully!'
            : (editingId ? 'Campaign updated draft.' : 'Campaign saved as draft.')
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
    setTestEmailInput(health?.fromAddress || '');
    setShowTestModal(true);
  };

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    if (!testEmailInput.trim()) {
      toast.error('Please enter a recipient test email address.');
      return;
    }

    setSending(true);
    try {
      const campId = activeCampaign.id || 'new';
      const res = await authFetch(`/api/admin/newsletter/campaigns/${campId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: testEmailInput.trim(),
          ...activeCampaign
        })
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        toast.success(data.message || `Test email successfully sent to ${testEmailInput}`);
        setShowTestModal(false);
      } else {
        toast.error((data && (data.message || data.error)) || 'Failed to send test email.');
      }
    } catch (err) {
      toast.error('Network error sending test email.');
    } finally {
      setSending(false);
    }
  };

  const handleOpenSendNowConfirm = (camp) => {
    if (!health?.isConfigured) {
      toast.error('Email provider is not configured in .env. Configure SMTP_USER or RESEND_API_KEY first.');
      return;
    }
    setActiveCampaign(camp);
    setShowSendConfirmModal(true);
  };

  const handleExecuteSendNow = async () => {
    if (!activeCampaign?.id) return;
    setSending(true);
    try {
      const res = await authFetch(`/api/admin/newsletter/campaigns/${activeCampaign.id}/send`, {
        method: 'POST'
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        toast.success(data.message || 'Campaign execution completed!');
        setShowSendConfirmModal(false);
        loadData();
      } else {
        toast.error((data && data.message) || 'Failed to send campaign.');
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
      const res = await authFetch(`/api/admin/newsletter/campaigns/${id}/cancel`, {
        method: 'POST'
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        toast.success('Scheduled campaign cancelled.');
        loadData();
      } else {
        toast.error((data && data.message) || 'Failed to cancel campaign.');
      }
    } catch (err) {
      toast.error('Network error cancelling campaign.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to permanently delete this campaign and its recipient logs?')) return;
    try {
      const res = await authFetch(`/api/admin/newsletter/campaigns/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('Campaign deleted.');
        loadData();
      }
    } catch (err) {
      toast.error('Failed to delete campaign.');
    }
  };

  const handleViewLogs = async (camp) => {
    setActiveCampaign(camp);
    setShowLogsModal(true);
    setLoadingLogs(true);
    try {
      const res = await authFetch(`/api/admin/newsletter/campaigns/${camp.id}/logs`);
      const data = await res.json().catch(() => null);
      if (res.ok && data?.logs) {
        setLogs(data.logs);
      }
    } catch (err) {
      toast.error('Failed to load recipient logs.');
    } finally {
      setLoadingLogs(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="font-display text-2xl xs:text-3xl sm:text-4xl text-[#1A1A1A]">
            Newsletter Campaigns
          </div>
          <div className="gold-line w-12 mt-2 mb-2" />
          <p className="text-xs sm:text-sm text-neutral-500 font-light">
            Compose, test, schedule, and execute real email broadcasts to verified subscribers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2.5 bg-white border border-neutral-200 text-neutral-600 rounded-lg hover:bg-neutral-50 transition"
            title="Refresh Campaigns"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#9C6B30] text-white rounded-lg text-xs font-semibold hover:bg-[#845826] transition shadow-md"
          >
            <Plus size={15} />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {/* Email Provider Infrastructure Health Banner */}
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
              Email Infrastructure Status: {health?.isConfigured ? `ACTIVE (${health.provider})` : 'UNCONFIGURED'}
            </div>
            <div className="text-xs opacity-90 mt-0.5 font-light flex flex-wrap items-center gap-2">
              <span>
                {health?.isConfigured
                  ? `Ready for live dispatch via ${health.from || 'configured sender'}.`
                  : (health?.error || 'SMTP_USER and SMTP_PASS or RESEND_API_KEY environment variables are required in .env.')}
              </span>
              <button
                onClick={() => {
                  setSenderForm({
                    fromName: health?.fromName || 'MikuMantra',
                    fromEmail: health?.fromAddress || 'kk1414497@gmail.com',
                    replyTo: health?.replyTo || 'support@mikumantra.com'
                  });
                  setShowEditSenderModal(true);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#9C6B30] hover:text-[#845826] bg-white px-2 py-0.5 rounded border border-black/10 hover:bg-neutral-50 transition"
              >
                <Edit3 size={11} /> Edit Sender Email
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => handleOpenSendTest({ name: 'System Email Health Verification', subject: 'System Health Check' })}
          className="px-3.5 py-1.5 bg-white border border-black/10 rounded-lg text-xs font-medium hover:bg-black/5 transition shrink-0"
        >
          Send System Health Test Email
        </button>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="animate-spin inline text-[#9C6B30]" size={28} />
            <p className="text-xs text-neutral-500 mt-2 font-mono">Loading campaign records from MongoDB...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Send size={36} className="mx-auto text-neutral-300" />
            <div className="text-sm font-semibold text-neutral-800">No campaigns composed yet</div>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto font-light">
              Click <span className="font-semibold">Create Campaign</span> above to draft your first marketing email or schedule an atelier announcement.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-neutral-50 text-[10px] tracking-widest uppercase text-neutral-500 border-b border-neutral-200">
                <tr>
                  <th className="text-left p-3.5 pl-4">Campaign & Subject</th>
                  <th className="text-left p-3.5">Audience Segment</th>
                  <th className="text-left p-3.5">Status</th>
                  <th className="text-center p-3.5">Recipients</th>
                  <th className="text-left p-3.5">Date</th>
                  <th className="text-right p-3.5 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {campaigns.map((camp) => {
                  const statusUpper = (camp.status || 'DRAFT').toUpperCase();

                  return (
                    <tr key={camp.id} className="hover:bg-neutral-50/60 transition">
                      <td className="p-3.5 pl-4">
                        <div className="font-semibold text-neutral-900">{camp.name}</div>
                        <div className="text-xs text-neutral-500 truncate max-w-[240px] mt-0.5">{camp.subject}</div>
                      </td>
                      <td className="p-3.5 text-neutral-600 capitalize">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-100 rounded-md text-xs font-medium">
                          <Users size={12} className="text-neutral-500" />
                          {camp.audience === 'all' ? 'All Active Subscribers' : camp.audience}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          statusUpper === 'SENT' ? 'bg-emerald-100 text-emerald-800' :
                          statusUpper === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                          statusUpper === 'SENDING' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                          statusUpper === 'PARTIALLY_SENT' ? 'bg-purple-100 text-purple-800' :
                          statusUpper === 'FAILED' ? 'bg-red-100 text-red-800' :
                          statusUpper === 'CANCELLED' ? 'bg-neutral-200 text-neutral-600' :
                          'bg-neutral-100 text-neutral-700'
                        }`}>
                          {statusUpper === 'SENDING' && <Loader2 size={10} className="animate-spin" />}
                          {statusUpper}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-mono text-xs">
                        {camp.sentCount !== undefined ? (
                          <span>{camp.sentCount} / {camp.totalRecipients || '-'}</span>
                        ) : (
                          <span className="text-neutral-400">-</span>
                        )}
                      </td>
                      <td className="p-3.5 text-neutral-500 text-xs">
                        {statusUpper === 'SCHEDULED' && camp.scheduleDate ? (
                          <div className="text-blue-700 font-medium">
                            <Clock size={12} className="inline mr-1" />
                            {new Date(camp.scheduleDate).toLocaleString('en-IN')}
                          </div>
                        ) : (
                          <div>{new Date(camp.createdAt).toLocaleDateString('en-IN')}</div>
                        )}
                      </td>
                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* DRAFT ACTIONS */}
                          {statusUpper === 'DRAFT' && (
                            <>
                              <button
                                onClick={() => handleOpenSendTest(camp)}
                                className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-xs font-semibold transition"
                              >
                                Test
                              </button>
                              <button
                                onClick={() => handleOpenSendNowConfirm(camp)}
                                className="px-3 py-1 bg-[#9C6B30] hover:bg-[#845826] text-white rounded text-xs font-semibold transition shadow-xs flex items-center gap-1"
                              >
                                <Send size={11} /> Send Now
                              </button>
                              <button
                                onClick={() => handleOpenEdit(camp)}
                                className="p-1.5 text-neutral-600 hover:text-neutral-900 rounded"
                                title="Edit Draft"
                              >
                                <Edit3 size={14} />
                              </button>
                            </>
                          )}

                          {/* SCHEDULED ACTIONS */}
                          {statusUpper === 'SCHEDULED' && (
                            <>
                              <button
                                onClick={() => handleOpenSendTest(camp)}
                                className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-xs font-semibold"
                              >
                                Test
                              </button>
                              <button
                                onClick={() => handleCancelScheduled(camp.id)}
                                className="px-2.5 py-1 bg-amber-100 text-amber-800 hover:bg-amber-200 rounded text-xs font-semibold"
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {/* COMPLETED ACTIONS */}
                          {(statusUpper === 'SENT' || statusUpper === 'PARTIALLY_SENT' || statusUpper === 'FAILED') && (
                            <button
                              onClick={() => handleViewLogs(camp)}
                              className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded text-xs font-semibold flex items-center gap-1"
                            >
                              <Eye size={12} /> Recipient Logs
                            </button>
                          )}

                          {/* DELETE */}
                          <button
                            onClick={() => handleDelete(camp.id)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 rounded transition"
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

      {/* MODAL: EDIT SENDER EMAIL IDENTITY */}
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
              Update the outbound sender display name and email address used for marketing broadcasts and system notifications.
            </p>

            <form onSubmit={handleSaveSenderEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Sender Display Name
                </label>
                <input
                  type="text"
                  required
                  value={senderForm.fromName}
                  onChange={(e) => setSenderForm(s => ({ ...s, fromName: e.target.value }))}
                  placeholder="MikuMantra"
                  className="w-full px-3.5 py-2 border border-neutral-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Sender Email Address ("From" Email)
                </label>
                <input
                  type="email"
                  required
                  value={senderForm.fromEmail}
                  onChange={(e) => setSenderForm(s => ({ ...s, fromEmail: e.target.value }))}
                  placeholder="akashsriv1984@gmail.com"
                  className="w-full px-3.5 py-2 border border-neutral-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#9C6B30]"
                />
                <p className="text-[11px] text-neutral-500 mt-1 font-mono bg-neutral-50 p-2 rounded border border-neutral-200">
                  Header Preview: "{senderForm.fromName || 'MikuMantra'}" &lt;{senderForm.fromEmail || 'akashsriv1984@gmail.com'}&gt;
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Reply-To Email Address
                </label>
                <input
                  type="email"
                  required
                  value={senderForm.replyTo}
                  onChange={(e) => setSenderForm(s => ({ ...s, replyTo: e.target.value }))}
                  placeholder="akash@unictechnology.com"
                  className="w-full px-3.5 py-2 border border-neutral-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  SMTP / Google App Password (Optional)
                </label>
                <input
                  type="password"
                  value={senderForm.smtpPass || ''}
                  onChange={(e) => setSenderForm(s => ({ ...s, smtpPass: e.target.value }))}
                  placeholder="Leave blank to use default App Password"
                  className="w-full px-3.5 py-2 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-[#9C6B30]"
                />
                <p className="text-[10px] text-neutral-400 mt-1">
                  If changing Gmail account to a different email address (like <span className="font-mono">akashsriv1984@gmail.com</span>), enter its 16-character App Password here.
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

      {/* MODAL 1: CREATE / EDIT CAMPAIGN */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-neutral-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-semibold text-neutral-900">
                {editingId ? 'Edit Campaign' : 'Compose New Campaign'}
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDraftOrSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Campaign Internal Name
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Diwali Royal Collection 2026"
                  className="w-full px-3.5 py-2 border border-neutral-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Email Subject Line
                </label>
                <input
                  type="text"
                  required
                  value={form.subject}
                  onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="✨ Discover Our Royal Diwali High Jewellery Collection"
                  className="w-full px-3.5 py-2 border border-neutral-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Preview Text Snippet
                </label>
                <input
                  type="text"
                  value={form.previewText}
                  onChange={(e) => setForm(f => ({ ...f, previewText: e.target.value }))}
                  placeholder="Exclusive handcrafted pieces selected for your private collection..."
                  className="w-full px-3.5 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                    From Name
                  </label>
                  <input
                    type="text"
                    value={form.fromName}
                    onChange={(e) => setForm(f => ({ ...f, fromName: e.target.value }))}
                    className="w-full px-3.5 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                    From Email
                  </label>
                  <input
                    type="email"
                    value={form.fromEmail}
                    onChange={(e) => setForm(f => ({ ...f, fromEmail: e.target.value }))}
                    className="w-full px-3.5 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Target Audience Segment
                </label>
                <select
                  value={form.audience}
                  onChange={(e) => setForm(f => ({ ...f, audience: e.target.value }))}
                  className="w-full px-3.5 py-2 border border-neutral-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#9C6B30]"
                >
                  <option value="all">All Active Subscribers (Excludes Unsubscribed)</option>
                  <option value="new">New Subscribers This Month Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Send Mode Option
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, sendOption: 'save_draft' }))}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition ${
                      form.sendOption === 'save_draft' ? 'border-[#9C6B30] bg-[#FAF6EF] text-[#9C6B30]' : 'border-neutral-200 text-neutral-600'
                    }`}
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, sendOption: 'schedule' }))}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition ${
                      form.sendOption === 'schedule' ? 'border-[#9C6B30] bg-[#FAF6EF] text-[#9C6B30]' : 'border-neutral-200 text-neutral-600'
                    }`}
                  >
                    Schedule for Later
                  </button>
                </div>
              </div>

              {form.sendOption === 'schedule' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">
                    Scheduled Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={form.scheduleDate}
                    onChange={(e) => setForm(f => ({ ...f, scheduleDate: e.target.value }))}
                    className="w-full px-3.5 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#9C6B30]"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
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
                    className="px-5 py-2 text-xs font-semibold text-white bg-[#9C6B30] hover:bg-[#845826] rounded-lg transition shadow-md disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                    <span>{form.sendOption === 'schedule' ? 'Schedule Campaign' : 'Save Draft'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SEND TEST EMAIL */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-semibold text-neutral-900">Send Test Email</h3>
              <button onClick={() => setShowTestModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-neutral-600 font-light">
              Send a real preview email strictly to a test address. Subscriber lists will <span className="font-semibold text-neutral-900">NOT</span> be emailed.
            </p>

            <form onSubmit={handleSendTestEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Recipient Test Email
                </label>
                <input
                  type="email"
                  required
                  value={testEmailInput}
                  onChange={(e) => setTestEmailInput(e.target.value)}
                  placeholder="e.g. admin@mikumantra.com"
                  className="w-full px-3.5 py-2 border border-neutral-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#9C6B30]"
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

      {/* MODAL 3: EXPLICIT CONFIRMATION BEFORE SEND NOW */}
      {showSendConfirmModal && activeCampaign && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-neutral-200">
            <div className="flex items-center gap-3 text-amber-700">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
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
              <div><span className="font-semibold text-neutral-500">Target Audience:</span> {activeCampaign.audience || 'All Active Subscribers'}</div>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed font-light">
              This will send real emails through <span className="font-semibold">{health?.provider || 'configured provider'}</span> to eligible active subscribers. Unsubscribed contacts will be automatically filtered out.
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
                <span>Confirm & Send Campaign Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: RECIPIENT LOGS & ANALYTICS */}
      {showLogsModal && activeCampaign && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 border border-neutral-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 shrink-0">
              <div>
                <h3 className="text-base font-semibold text-neutral-900">Recipient Delivery Logs</h3>
                <p className="text-xs text-neutral-500 font-light">{activeCampaign.name} — {activeCampaign.subject}</p>
              </div>
              <button onClick={() => setShowLogsModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {loadingLogs ? (
                <div className="p-12 text-center">
                  <Loader2 className="animate-spin inline text-[#9C6B30]" size={24} />
                </div>
              ) : logs.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-400">
                  No delivery logs recorded for this campaign.
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-neutral-50 text-[10px] uppercase text-neutral-500 border-b border-neutral-200 sticky top-0">
                    <tr>
                      <th className="text-left p-2.5">Recipient Email</th>
                      <th className="text-left p-2.5">Status</th>
                      <th className="text-left p-2.5">Message ID / Error</th>
                      <th className="text-right p-2.5">Sent Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-mono">
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td className="p-2.5 text-neutral-900 font-sans font-medium">{log.email}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            log.status === 'SENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-neutral-500 text-[11px] truncate max-w-[180px]">
                          {log.providerMessageId || log.error || '-'}
                        </td>
                        <td className="p-2.5 text-right text-neutral-400 text-[11px]">
                          {new Date(log.sentAt).toLocaleTimeString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
