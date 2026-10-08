'use client';

import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Users, Mail, UserX, Loader2, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminNewsletterAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    totalSubscribers: 0,
    activeSubscribers: 0,
    unsubscribedCount: 0,
    newThisMonth: 0,
    activeRate: 0,
    growthPercent: 0,
    campaignsCount: 0,
    hasCampaignStats: false
  });

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/newsletter/analytics', { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.analytics) {
        setAnalytics(data.analytics);
      }
    } catch (err) {
      toast.error('Failed to load newsletter analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="animate-spin inline text-[#9C6B30]" size={28} />
        <p className="text-xs text-neutral-500 mt-2 font-mono">Calculating subscriber analytics from MongoDB...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <div className="font-display text-2xl xs:text-3xl sm:text-4xl text-[#1A1A1A]">
          Newsletter Analytics
        </div>
        <div className="gold-line w-12 mt-2 mb-2" />
        <p className="text-xs sm:text-sm text-neutral-500 font-light">
          Real-time subscriber acquisition metrics, retention rates, and campaign performance indicators.
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Total Subscribers</div>
          <div className="text-3xl font-bold text-neutral-900 mt-1">{analytics.totalSubscribers.toLocaleString('en-IN')}</div>
          <div className="text-xs text-emerald-600 mt-2 flex items-center gap-1 font-medium">
            <ArrowUpRight size={14} /> +{analytics.newThisMonth} new this month
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Active Rate</div>
          <div className="text-3xl font-bold text-emerald-700 mt-1">{analytics.activeRate}%</div>
          <div className="text-xs text-neutral-500 mt-2">
            {analytics.activeSubscribers} subscribed members
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#9C6B30]">Growth %</div>
          <div className="text-3xl font-bold text-[#9C6B30] mt-1">+{analytics.growthPercent}%</div>
          <div className="text-xs text-neutral-500 mt-2">
            Month-over-month growth
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Unsubscribed</div>
          <div className="text-3xl font-bold text-neutral-600 mt-1">{analytics.unsubscribedCount.toLocaleString('en-IN')}</div>
          <div className="text-xs text-neutral-400 mt-2">
            Total opt-outs
          </div>
        </div>
      </div>

      {/* Campaign Tracking Notice / Metrics */}
      <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-xs space-y-4">
        <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
          <BarChart3 size={16} className="text-[#9C6B30]" /> Email Campaign Dispatch Analytics
        </h3>

        {!analytics.hasCampaignStats ? (
          <div className="p-8 text-center bg-neutral-50 rounded-lg border border-neutral-100">
            <Mail className="mx-auto text-neutral-300 mb-2" size={28} />
            <div className="text-sm font-medium text-neutral-700">No campaign dispatch data available</div>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1">
              Create and dispatch broadcast campaigns from the Campaigns tab to track opens, clicks, and conversion metrics.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-100">
              <div className="text-xs text-neutral-500 uppercase tracking-wider">Sent</div>
              <div className="text-xl font-bold text-neutral-900 mt-1">0</div>
            </div>
            <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-100">
              <div className="text-xs text-neutral-500 uppercase tracking-wider">Delivered</div>
              <div className="text-xl font-bold text-emerald-700 mt-1">0%</div>
            </div>
            <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-100">
              <div className="text-xs text-neutral-500 uppercase tracking-wider">Opened</div>
              <div className="text-xl font-bold text-blue-700 mt-1">0%</div>
            </div>
            <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-100">
              <div className="text-xs text-neutral-500 uppercase tracking-wider">Clicked</div>
              <div className="text-xl font-bold text-[#9C6B30] mt-1">0%</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
