'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { formatINR } from '@/lib/products';
import {
  Package, ShoppingCart, Users, TrendingUp, ArrowRight, Loader2,
  Eye, RefreshCw, Gem, CheckCircle2, Clock, Sparkles, ExternalLink,
  ShoppingBag, ArrowUpRight, Search, X, ChevronRight, ShieldCheck,
  CreditCard, Tag, Truck, Award, DollarSign, Store, SlidersHorizontal,
  Compass, ArrowDownRight, Layers
} from 'lucide-react';
import { toast } from 'sonner';
import OrderDetailModal from '@/components/ui/order-detail-modal';

function getInitials(name) {
  if (!name) return 'CL';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const r = await fetch('/api/admin/dashboard', {
        credentials: 'include',
        cache: 'no-store'
      });
      if (r.ok) {
        const json = await r.json();
        setData(json);
        if (isManual) toast.success('Dashboard synchronized with live store');
      } else {
        if (isManual) toast.error('Failed to load dashboard data');
      }
    } catch (err) {
      console.error(err);
      if (isManual) toast.error('Network error loading dashboard');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateOrderStatus = async (id, status) => {
    try {
      const r = await fetch(`/api/admin/orders/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (r.ok) {
        const res = await r.json();
        toast.success('Order status updated');
        if (res.order) setSelectedOrder(res.order);
        loadData();
      } else {
        toast.error('Failed to update status');
      }
    } catch (err) {
      toast.error('Error updating status');
    }
  };

  const { stats = {}, recentOrders = [] } = data || {};
  const totalRevenue = stats.totalRevenue || 0;
  const totalOrders = stats.totalOrders || 0;
  const totalProducts = stats.totalProducts || 0;
  const totalUsers = stats.totalUsers || 0;

  const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const deliveredCount = recentOrders.filter(o => o.status === 'delivered').length;
  const deliveryRate = recentOrders.length > 0 ? Math.round((deliveredCount / recentOrders.length) * 100) : 0;

  // Filtered orders by status & search
  const filteredOrders = useMemo(() => {
    if (!recentOrders) return [];
    return recentOrders.filter(o => {
      // Status filter
      if (statusFilter === 'delivered' && o.status !== 'delivered') return false;
      if (statusFilter === 'confirmed' && o.status !== 'confirmed') return false;
      if (statusFilter === 'transit' && (o.status === 'delivered' || o.status === 'confirmed' || o.status === 'cancelled')) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const orderNum = (o.orderNumber || '').toLowerCase();
        const custName = (o.address?.fullName || o.customerName || '').toLowerCase();
        const custEmail = (o.customerEmail || '').toLowerCase();
        const custPhone = (o.address?.phone || '').toLowerCase();
        return orderNum.includes(q) || custName.includes(q) || custEmail.includes(q) || custPhone.includes(q);
      }
      return true;
    });
  }, [recentOrders, statusFilter, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center mb-5">
          <div className="w-16 h-16 rounded-full border-2 border-[#D4AF37]/20 border-t-[#9C6B30] animate-spin" />
          <Gem className="w-6 h-6 text-[#9C6B30] absolute animate-pulse" />
        </div>
        <p className="font-display text-xl text-[#1A1A1A] tracking-wide">MikuMantra Atelier</p>
        <p className="text-xs text-neutral-400 mt-1 font-light tracking-widest uppercase">Synchronizing Executive Intelligence...</p>
      </div>
    );
  }

  const getStatusBadge = (status, order = {}) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
            Delivered
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-sky-50 text-sky-800 border border-sky-200/90 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.8)]" />
            Confirmed
          </span>
        );
      case 'shipped':
      case 'packed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/90 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
            {status}
          </span>
        );
      case 'cancelled':
        const isCancelledByAdmin = (order?.cancelledBy === 'admin' || order?.cancelledBy === 'mikumantra' || (order?.statusHistory || []).some(h => h.status === 'cancelled' && ((h.note || '').toLowerCase().includes('admin') || (h.note || '').toLowerCase().includes('mikumantra'))));
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200/90 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
            {isCancelledByAdmin ? 'Cancelled by mikumantra' : 'Cancelled by customer'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-neutral-100 text-neutral-700 border border-neutral-200 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
            {status || 'Pending'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. ATELIER HERO EXECUTIVE HEADER */}
      <div className="relative bg-gradient-to-br from-[#121214] via-[#1A1916] to-[#121214] text-white rounded-3xl p-6 sm:p-8 lg:p-10 border border-[#D4AF37]/25 shadow-2xl overflow-hidden">
        {/* Subtle decorative gold radial glows */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#D4AF37]/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#9C6B30]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2.5 mb-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold tracking-[0.25em] uppercase bg-[#D4AF37]/15 text-[#E8D18C] border border-[#D4AF37]/30">
                <Sparkles size={11} className="text-[#D4AF37]" /> MikuMantra Atelier
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Commerce Engine
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-light text-white tracking-tight">
              Executive Dashboard
            </h1>
            <p className="text-white/60 text-xs sm:text-sm font-light mt-2 max-w-xl leading-relaxed">
              Real-time monitoring of boutique sales, customer transactions, inventory health, and high-jewelry fulfillment.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-medium rounded-xl transition duration-200 backdrop-blur-xs disabled:opacity-50"
              title="Synchronize real-time metrics"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin text-[#D4AF37]' : 'text-white/80'} />
              <span>{refreshing ? 'Syncing...' : 'Sync Data'}</span>
            </button>
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-medium rounded-xl transition duration-200 backdrop-blur-xs"
            >
              <span>View Storefront</span>
              <ExternalLink size={12} className="text-white/70" />
            </Link>
            <Link
              href="/admin/products"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#9C6B30] to-[#C79B3B] hover:from-[#8A5E2A] hover:to-[#B58B32] text-white text-xs tracking-wider uppercase font-semibold rounded-xl shadow-lg hover:shadow-xl transition duration-200"
            >
              <Gem size={13} />
              <span>Catalogue</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* 2. CROWN METRICS CARDS (4 Luxury Pillars) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Total Revenue (Hero Pillar) */}
        <div className="relative bg-gradient-to-br from-[#1A1916] via-[#141416] to-[#0D0D0E] text-white rounded-2xl p-6 border border-[#D4AF37]/35 shadow-xl hover:shadow-2xl hover:border-[#D4AF37]/60 transition-all duration-300 flex flex-col justify-between overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-2xl group-hover:bg-[#D4AF37]/20 transition-all" />

          <div className="flex items-start justify-between gap-3 mb-6 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#9C6B30] flex items-center justify-center text-black font-bold shadow-md group-hover:scale-105 transition-transform">
              <TrendingUp size={22} className="text-[#121214]" />
            </div>
            <span className="px-2.5 py-1 rounded-full text-[9px] font-bold tracking-[0.2em] uppercase bg-[#D4AF37]/20 text-[#E8D18C] border border-[#D4AF37]/40">
              Gross Revenue
            </span>
          </div>

          <div className="relative z-10">
            <div className="text-[10px] tracking-[0.2em] uppercase text-white/60 font-semibold mb-1">
              Total Revenue
            </div>
            <div className="font-display text-2xl xs:text-3xl lg:text-4xl text-white font-light tracking-tight break-words">
              {formatINR(totalRevenue)}
            </div>
            <div className="text-[11px] text-[#D4AF37] mt-2.5 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
              <span>Lifetime Atelier Earnings</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Orders */}
        <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-[#E8E6DF] shadow-xs hover:shadow-lg hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between group">
          <div className="flex items-start justify-between gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shadow-2xs group-hover:scale-105 transition-transform">
              <ShoppingBag size={22} />
            </div>
            <span className="px-2.5 py-1 rounded-full text-[9px] font-bold tracking-[0.2em] uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
              Completed
            </span>
          </div>

          <div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-neutral-400 font-semibold mb-1">
              Total Orders
            </div>
            <div className="font-display text-2xl xs:text-3xl lg:text-4xl text-[#1A1A1A] font-light tracking-tight">
              {totalOrders.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-neutral-500 mt-2.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Processed Transactions</span>
            </div>
          </div>
        </div>

        {/* Card 3: Products In Catalog */}
        <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-[#E8E6DF] shadow-xs hover:shadow-lg hover:border-sky-500/40 transition-all duration-300 flex flex-col justify-between group">
          <div className="flex items-start justify-between gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-200/80 flex items-center justify-center text-sky-700 shadow-2xs group-hover:scale-105 transition-transform">
              <Gem size={22} />
            </div>
            <span className="px-2.5 py-1 rounded-full text-[9px] font-bold tracking-[0.2em] uppercase bg-sky-50 text-sky-700 border border-sky-200">
              Catalogue
            </span>
          </div>

          <div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-neutral-400 font-semibold mb-1">
              Active Products
            </div>
            <div className="font-display text-2xl xs:text-3xl lg:text-4xl text-[#1A1A1A] font-light tracking-tight">
              {totalProducts.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-neutral-500 mt-2.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              <span>Gold, Diamond & Bridal</span>
            </div>
          </div>
        </div>

        {/* Card 4: Clientele Base */}
        <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-[#E8E6DF] shadow-xs hover:shadow-lg hover:border-purple-500/40 transition-all duration-300 flex flex-col justify-between group">
          <div className="flex items-start justify-between gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200/80 flex items-center justify-center text-purple-700 shadow-2xs group-hover:scale-105 transition-transform">
              <Users size={22} />
            </div>
            <span className="px-2.5 py-1 rounded-full text-[9px] font-bold tracking-[0.2em] uppercase bg-purple-50 text-purple-700 border border-purple-200">
              Members
            </span>
          </div>

          <div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-neutral-400 font-semibold mb-1">
              Clientele Base
            </div>
            <div className="font-display text-2xl xs:text-3xl lg:text-4xl text-[#1A1A1A] font-light tracking-tight">
              {totalUsers.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-neutral-500 mt-2.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              <span>Registered Accounts</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. EXECUTIVE INTELLIGENCE & SHORTCUT CONCIERGE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left: Performance Intelligence */}
        <div className="lg:col-span-2 bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-[#E8E6DF] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
            <div>
              <h3 className="font-display text-lg text-[#1A1A1A]">Atelier Performance</h3>
              <p className="text-xs text-neutral-400 mt-0.5">Key transaction benchmarks and customer order fulfillment</p>
            </div>
            <span className="px-2.5 py-1 bg-[#FAF5EB] border border-[#D4AF37]/30 text-[#9C6B30] text-[10px] font-semibold tracking-wider uppercase rounded-full">
              Real-Time
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5">
            {/* Metric 1: Average Order Value */}
            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-neutral-200/80">
              <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
                <span className="font-medium uppercase tracking-wider text-[10px]">Average Order Value (AOV)</span>
                <Sparkles size={14} className="text-[#9C6B30]" />
              </div>
              <div className="font-display text-2xl text-[#1A1A1A] font-light">
                {formatINR(aov)}
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">Average spent per customer transaction</p>
            </div>

            {/* Metric 2: Recent Fulfillment Rate */}
            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-neutral-200/80">
              <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
                <span className="font-medium uppercase tracking-wider text-[10px]">Dispatch & Delivery Rate</span>
                <Truck size={14} className="text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <div className="font-display text-2xl text-[#1A1A1A] font-light">
                  {deliveryRate}%
                </div>
                <span className="text-xs text-emerald-700 font-medium">({deliveredCount} Delivered)</span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-1.5 mt-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(deliveryRate, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-[#9C6B30]" />
              <span>All orders protected by MikuMantra Authenticity Guarantee</span>
            </span>
            <Link href="/admin/orders" className="text-[#9C6B30] font-semibold hover:underline flex items-center gap-1">
              <span>View Orders</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* Right: Quick Concierge Shortcuts */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border border-[#E8E6DF] shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-display text-lg text-[#1A1A1A]">Management Concierge</h3>
            <p className="text-xs text-neutral-400 mt-0.5">Direct shortcuts to critical boutique operations</p>
          </div>

          <div className="space-y-2.5 my-4">
            <Link
              href="/admin/products"
              className="flex items-center justify-between p-3 rounded-xl border border-neutral-200/70 hover:border-[#9C6B30] hover:bg-[#FAF9F6] transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#FAF5EB] border border-[#D4AF37]/30 flex items-center justify-center text-[#9C6B30] group-hover:scale-105 transition-transform">
                  <Package size={16} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-neutral-800 group-hover:text-[#9C6B30] transition-colors">Products & Collections</div>
                  <div className="text-[10px] text-neutral-400">{totalProducts} active catalogue items</div>
                </div>
              </div>
              <ChevronRight size={15} className="text-neutral-400 group-hover:text-[#9C6B30] group-hover:translate-x-0.5 transition" />
            </Link>

            <Link
              href="/admin/orders"
              className="flex items-center justify-between p-3 rounded-xl border border-neutral-200/70 hover:border-emerald-600 hover:bg-emerald-50/20 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 group-hover:scale-105 transition-transform">
                  <ShoppingCart size={16} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-neutral-800 group-hover:text-emerald-700 transition-colors">Order Management</div>
                  <div className="text-[10px] text-neutral-400">Dispatch, slips & returns</div>
                </div>
              </div>
              <ChevronRight size={15} className="text-neutral-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition" />
            </Link>

            <Link
              href="/admin/coupons"
              className="flex items-center justify-between p-3 rounded-xl border border-neutral-200/70 hover:border-purple-600 hover:bg-purple-50/20 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 group-hover:scale-105 transition-transform">
                  <Tag size={16} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-neutral-800 group-hover:text-purple-700 transition-colors">Coupons & Campaigns</div>
                  <div className="text-[10px] text-neutral-400">Promotions, discounts & codes</div>
                </div>
              </div>
              <ChevronRight size={15} className="text-neutral-400 group-hover:text-purple-700 group-hover:translate-x-0.5 transition" />
            </Link>
          </div>

          <div className="pt-2">
            <Link
              href="/admin/site-settings"
              className="w-full py-2 px-3 text-center text-xs font-medium text-neutral-600 hover:text-[#9C6B30] transition block"
            >
              Configure Store & SEO Settings →
            </Link>
          </div>
        </div>
      </div>

      {/* 4. RECENT ORDERS REGISTRY (Luxury Table) */}
      <div className="bg-white rounded-3xl border border-[#E8E6DF] shadow-md overflow-hidden">
        {/* Table Top Bar */}
        <div className="p-5 sm:p-7 border-b border-neutral-200/80 bg-gradient-to-r from-[#FAF9F6] via-white to-[#FAF9F6]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-display text-xl sm:text-2xl text-[#1A1A1A] font-normal">
                  Recent Transactions
                </h2>
                <span className="px-2.5 py-0.5 bg-[#FAF5EB] border border-[#D4AF37]/30 text-[#9C6B30] text-[10px] font-semibold uppercase tracking-wider rounded-full">
                  {recentOrders.length} Latest Orders
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-1 font-light">
                Customer acquisitions, order details, and fulfillment tracking.
              </p>
            </div>

            {/* Search & Filter Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search Box */}
              <div className="relative min-w-[220px]">
                <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search order or client..."
                  className="w-full pl-9 pr-8 py-2 bg-white border border-neutral-200 rounded-xl text-xs placeholder:text-neutral-400 focus:outline-none focus:border-[#9C6B30] focus:ring-1 focus:ring-[#9C6B30] transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-0.5"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Status Filter Tabs */}
              <div className="inline-flex p-1 bg-neutral-100 rounded-xl text-xs shrink-0 self-start sm:self-auto">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${
                    statusFilter === 'all'
                      ? 'bg-white text-[#1A1A1A] shadow-xs font-semibold'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  All ({recentOrders.length})
                </button>
                <button
                  onClick={() => setStatusFilter('delivered')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${
                    statusFilter === 'delivered'
                      ? 'bg-white text-emerald-800 shadow-xs font-semibold'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Delivered ({recentOrders.filter(o => o.status === 'delivered').length})
                </button>
                <button
                  onClick={() => setStatusFilter('confirmed')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${
                    statusFilter === 'confirmed'
                      ? 'bg-white text-sky-800 shadow-xs font-semibold'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Confirmed ({recentOrders.filter(o => o.status === 'confirmed').length})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF9F6] text-[10px] tracking-[0.2em] uppercase text-neutral-500 border-b border-neutral-200 font-semibold">
                <th className="p-4 pl-6">Order Number</th>
                <th className="p-4">Client</th>
                <th className="p-4">Jewellery Item</th>
                <th className="p-4">Status</th>
                <th className="p-4">Payment</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4 pr-6 text-center">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-xs sm:text-sm">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center text-neutral-400">
                    <div className="max-w-xs mx-auto flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-400 mb-3">
                        <ShoppingBag size={24} />
                      </div>
                      <p className="font-display text-base text-neutral-700">No Orders Found</p>
                      <p className="text-xs text-neutral-400 mt-1">
                        No transactions match your current search or status filter.
                      </p>
                      {(statusFilter !== 'all' || searchQuery) && (
                        <button
                          onClick={() => { setStatusFilter('all'); setSearchQuery(''); }}
                          className="mt-4 px-4 py-1.5 text-xs text-[#9C6B30] border border-[#9C6B30]/30 rounded-lg hover:bg-[#FAF5EB] transition"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const firstItem = o.items?.[0];
                  const hasMoreItems = (o.items?.length || 0) > 1;
                  const customerName = o.address?.fullName || o.customerName || 'Direct Client';
                  const initials = getInitials(customerName);
                  const dateStr = o.placedAt ? new Date(o.placedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  }) : 'N/A';

                  return (
                    <tr
                      key={o.id}
                      className="hover:bg-[#FAF9F6]/80 transition-colors group cursor-pointer"
                      onClick={() => setSelectedOrder(o)}
                    >
                      {/* Order Number */}
                      <td className="p-4 pl-6">
                        <div className="font-mono font-semibold text-[#9C6B30] hover:underline flex items-center gap-1.5">
                          <span>{o.orderNumber}</span>
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          {dateStr}
                        </div>
                      </td>

                      {/* Client */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#1A1A1A] text-[#D4AF37] font-semibold text-[10px] flex items-center justify-center shrink-0 shadow-2xs border border-[#D4AF37]/30">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-neutral-900 truncate max-w-[150px]" title={customerName}>
                              {customerName}
                            </div>
                            <div className="text-[11px] text-neutral-400 truncate max-w-[150px]" title={o.customerEmail || o.address?.phone}>
                              {o.customerEmail || o.address?.phone || 'Online Checkout'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Item */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {firstItem?.img ? (
                            <img
                              src={firstItem.img}
                              alt=""
                              className="w-10 h-10 rounded-xl object-cover border border-neutral-200/80 bg-neutral-50 shrink-0 shadow-2xs"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-[#FAF5EB] border border-[#D4AF37]/30 flex items-center justify-center text-[#9C6B30] shrink-0 shadow-2xs">
                              <Gem size={16} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-neutral-800 truncate max-w-[150px]" title={firstItem?.name || firstItem?.title}>
                              {firstItem?.name || firstItem?.title || `${o.items?.length || 1} Products`}
                            </div>
                            <div className="text-[10px] text-neutral-400 mt-0.5">
                              {o.items?.length || 1} {o.items?.length === 1 ? 'piece' : 'pieces'}
                              {hasMoreItems && ` (+${o.items.length - 1} more)`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        {getStatusBadge(o.status, o)}
                      </td>

                      {/* Payment */}
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase font-semibold tracking-wider bg-neutral-100 text-neutral-700 border border-neutral-200/80">
                          <CreditCard size={11} className="text-neutral-400" />
                          {o.payment || 'COD'}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="p-4 text-right">
                        <div className="font-display text-sm sm:text-base font-medium text-[#1A1A1A]">
                          {formatINR(o.amounts?.total || 0)}
                        </div>
                      </td>

                      {/* Manage Action */}
                      <td className="p-4 pr-6 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200/90 bg-white text-neutral-700 text-xs font-medium hover:border-[#9C6B30] hover:text-[#9C6B30] hover:bg-[#FAF5EB]/50 transition shadow-2xs"
                          title="View order details and shipping slip"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-4 sm:p-5 bg-[#FAF9F6] border-t border-neutral-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
          <div>
            Showing <span className="font-semibold text-neutral-800">{filteredOrders.length}</span> of{' '}
            <span className="font-semibold text-neutral-800">{recentOrders.length}</span> recent boutique transactions
          </div>
          <Link
            href="/admin/orders"
            className="font-semibold text-[#9C6B30] hover:text-[#7D5422] inline-flex items-center gap-1.5 transition"
          >
            <span>Open Full Orders Registry</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      {/* Interactive Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={handleUpdateOrderStatus}
        />
      )}
    </div>
  );
}
