'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, isAdminUser } from '@/lib/use-auth';
import {
  LayoutDashboard, Package, FolderTree, Sparkles, ShoppingCart, Users,
  Ticket, MessageSquare, Image as ImageIcon, LogOut, Loader2, Menu, X,
  History, Settings, ChevronDown, ChevronRight, Layout, SlidersHorizontal,
  Globe, RotateCcw, ShieldCheck, KeyRound, Eye, EyeOff, Shield, UserCheck,
  Lock, ScrollText, CreditCard, Share2, Mail, Send, FileText, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { href: '/admin/products', label: 'Products', icon: Package, permission: 'products.view' },
  { href: '/admin/categories', label: 'Categories', icon: FolderTree, permission: 'products.view' },
  { href: '/admin/collections', label: 'Collections', icon: Sparkles, permission: 'products.view' },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart, permission: 'orders.view' },
  { href: '/admin/returns', label: 'Return Requests', icon: RotateCcw, permission: 'orders.view' },
  { href: '/admin/delivered-history', label: 'Delivered History', icon: History, permission: 'orders.view' },
  { href: '/admin/customers', label: 'Customers', icon: Users, permission: 'customers.view' },
  { href: '/admin/coupons', label: 'Coupons', icon: Ticket, permission: 'products.view' },
  { href: '/admin/reviews', label: 'Reviews', icon: MessageSquare, permission: 'products.view' },
];

const MARKETING_NAV = [
  { href: '/admin/newsletter', label: 'Newsletter Subscribers', icon: Mail, permission: 'customers.view' },
  { href: '/admin/newsletter/settings', label: 'Newsletter Settings', icon: Settings, permission: 'settings.view' },
  { href: '/admin/newsletter/campaigns', label: 'Campaigns', icon: Send, permission: 'settings.view' },
  { href: '/admin/newsletter/templates', label: 'Templates', icon: FileText, permission: 'settings.view' },
  { href: '/admin/newsletter/analytics', label: 'Analytics', icon: BarChart3, permission: 'settings.view' }
];

const ADMIN_MGMT_NAV = [
  { href: '/admin/admins', label: 'Admins', icon: Shield, permission: 'admins.view' },
  { href: '/admin/roles', label: 'Roles', icon: UserCheck, permission: 'roles.view' },
  { href: '/admin/permissions', label: 'Permissions', icon: Lock, permission: 'admins.permissions' },
  { href: '/admin/activity-logs', label: 'Activity Logs', icon: ScrollText, permission: 'activity_logs.view' },
];

const UI_NAV = [
  { href: '/admin/payment-settings', label: 'Payment Gateways', icon: CreditCard, permission: 'settings.view' },
  { href: '/admin/site-settings', label: 'Site & SEO Settings', icon: Globe, permission: 'settings.view' },
  { href: '/admin/homepage', label: 'Promote & Assurance', icon: ShieldCheck, permission: 'settings.view' },
  { href: '/admin/banners', label: 'Banners', icon: ImageIcon, permission: 'settings.view' },
  { href: '/admin/header', label: 'Header', icon: Menu, permission: 'settings.view' },
  { href: '/admin/footer', label: 'Footer', icon: Settings, permission: 'settings.view' },
  { href: '/admin/product-filter', label: 'Product Filter', icon: SlidersHorizontal, permission: 'settings.view' },
  { href: '/admin/social-media', label: 'Social Media', icon: Share2, permission: 'settings.view' },
  { href: '/admin/categories', label: 'Category Showcase', icon: FolderTree, permission: 'settings.view' },
];

function canAccess(user, permissionKey) {
  if (!user) return false;
  if (!permissionKey) return true;
  if (user.roleKey === 'SUPER_ADMIN') return true;
  if (!user.permissions || user.permissions.includes('*')) return true;
  return user.permissions.includes(permissionKey);
}

export default function AdminLayout({ children }) {
  const { user, loading, logout, changePassword, refresh } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [uiExpanded, setUiExpanded] = useState(false);
  const [adminExpanded, setAdminExpanded] = useState(true);
  const [marketingExpanded, setMarketingExpanded] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [siteLogo, setSiteLogo] = useState('/logo.png');

  useEffect(() => {
    setMounted(true);
    fetch('/api/site-settings')
      .then(r => r.json())
      .then(d => {
        if (d?.logo) setSiteLogo(d.logo);
      })
      .catch(() => {});
  }, []);

  // Admin password change modal state
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [adminPwdForm, setAdminPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [adminPwdErrors, setAdminPwdErrors] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [adminPwdSaving, setAdminPwdSaving] = useState(false);
  const [showAdminCur, setShowAdminCur] = useState(false);
  const [showAdminNew, setShowAdminNew] = useState(false);
  const [showAdminConf, setShowAdminConf] = useState(false);

  const isLoginPage = pathname === '/admin/login' || pathname?.startsWith('/admin/login');

  useEffect(() => {
    if (isLoginPage) return;
    if (!loading) {
      if (!user) {
        router.replace('/admin/login?redirect=' + encodeURIComponent(pathname));
      } else if (!isAdminUser(user)) {
        router.replace('/admin/login?error=forbidden&redirect=' + encodeURIComponent(pathname));
      }
    }
  }, [loading, user, router, pathname, isLoginPage]);

  useEffect(() => {
    if (pathname && (pathname.startsWith('/admin/payment-settings') || pathname.startsWith('/admin/site-settings') || pathname.startsWith('/admin/homepage') || pathname.startsWith('/admin/banners') || pathname.startsWith('/admin/header') || pathname.startsWith('/admin/footer') || pathname.startsWith('/admin/product-filter') || pathname.startsWith('/admin/social-media'))) {
      setUiExpanded(true);
    }
    if (pathname && (pathname.startsWith('/admin/admins') || pathname.startsWith('/admin/roles') || pathname.startsWith('/admin/permissions') || pathname.startsWith('/admin/activity-logs'))) {
      setAdminExpanded(true);
    }
    if (pathname && pathname.startsWith('/admin/newsletter')) {
      setMarketingExpanded(true);
    }
  }, [pathname]);

  const handleAdminPasswordSubmit = async (e) => {
    e.preventDefault();
    const errs = { currentPassword: '', newPassword: '', confirmPassword: '' };
    let valid = true;

    if (user?.hasPassword && !adminPwdForm.currentPassword) {
      errs.currentPassword = 'Must enter current admin password';
      valid = false;
    }

    if (!adminPwdForm.newPassword) {
      errs.newPassword = 'Must enter a new password';
      valid = false;
    } else if (adminPwdForm.newPassword.length < 6) {
      errs.newPassword = 'Password must be at least 6 characters';
      valid = false;
    }

    if (!adminPwdForm.confirmPassword) {
      errs.confirmPassword = 'Must confirm new password';
      valid = false;
    } else if (adminPwdForm.newPassword !== adminPwdForm.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
      valid = false;
    }

    setAdminPwdErrors(errs);
    if (!valid) return;

    setAdminPwdSaving(true);
    try {
      const res = await changePassword(adminPwdForm.currentPassword, adminPwdForm.newPassword, adminPwdForm.confirmPassword);
      toast.success(res.message || 'Admin password updated successfully!');
      setAdminPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setAdminPwdErrors({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPwdModal(false);
      await refresh();
    } catch (err) {
      toast.error(err.message || 'Failed to update admin password');
      if (err.message && err.message.toLowerCase().includes('current password')) {
        setAdminPwdErrors(prev => ({ ...prev, currentPassword: err.message }));
      }
    } finally {
      setAdminPwdSaving(false);
    }
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!mounted || loading || !user || !isAdminUser(user)) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0F0F10]">
        <Loader2 className="animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex">
      {/* Mobile Drawer Backdrop Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:sticky top-0 z-50 h-screen w-[85vw] max-w-[320px] lg:w-72 bg-[#0F0F10] text-white flex flex-col transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none`}
      >
        <div className="p-4 xs:p-6 border-b border-white/10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img className="w-[110px] xs:w-[130px] sm:w-[145px] lg:w-[180px] h-auto max-h-12 object-contain" src={siteLogo || "/logo.png"} alt="Logo" />
          </Link>
          <button className="lg:hidden p-1 text-white/70 hover:text-white" onClick={() => setOpen(false)} aria-label="Close sidebar">
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto dark-scrollbar space-y-1">
          {NAV.filter(n => canAccess(user, n.permission)).map(n => {
            const Active = pathname === n.href || (n.href !== '/admin' && pathname?.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-5 xs:px-6 py-3 text-xs sm:text-sm transition ${
                  Active ? 'bg-white/10 text-[#D4AF37] border-l-2 border-[#D4AF37]' : 'text-white/70 hover:bg-white/5'
                }`}
              >
                <n.icon size={16} className="shrink-0" />
                <span className="truncate">{n.label}</span>
              </Link>
            );
          })}

          {/* MARKETING SECTION */}
          {MARKETING_NAV.some(n => canAccess(user, n.permission)) && (
            <div className="pt-2">
              <div className="mx-5 xs:mx-6 my-2 border-t border-white/10" />
              <button
                onClick={() => setMarketingExpanded(!marketingExpanded)}
                className={`w-full flex items-center justify-between px-5 xs:px-6 py-2.5 text-xs sm:text-sm transition ${
                  pathname?.startsWith('/admin/newsletter')
                    ? 'text-[#D4AF37] hover:bg-white/5 font-medium'
                    : 'text-white/70 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Mail size={16} className="shrink-0 text-[#D4AF37]" />
                  <span className="tracking-wide">Marketing</span>
                </div>
                {marketingExpanded ? <ChevronDown size={14} className="opacity-70 shrink-0" /> : <ChevronRight size={14} className="opacity-70 shrink-0" />}
              </button>

              {marketingExpanded && (
                <div className="bg-black/20 py-1 transition-all">
                  {MARKETING_NAV.filter(n => canAccess(user, n.permission)).map((n, idx, arr) => {
                    const Active = pathname === n.href || pathname?.startsWith(n.href);
                    const isLast = idx === arr.length - 1;
                    return (
                      <Link
                        key={n.href}
                        href={n.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center pl-8 xs:pl-10 pr-4 xs:pr-6 py-2 text-xs sm:text-sm transition ${
                          Active
                            ? 'text-[#D4AF37] font-medium bg-white/5 border-l-2 border-[#D4AF37] pl-[30px] xs:pl-[38px]'
                            : 'text-white/60 hover:text-white hover:bg-white/[0.02]'
                        }`}
                      >
                        <span className="text-white/30 font-mono mr-1.5 text-xs shrink-0">{isLast ? '└──' : '├──'}</span>
                        <n.icon size={14} className="mr-2 shrink-0" />
                        <span className="truncate">{n.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ADMIN MANAGEMENT SECTION */}
          {ADMIN_MGMT_NAV.some(n => canAccess(user, n.permission)) && (
            <div className="pt-2">
              <div className="mx-5 xs:mx-6 my-2 border-t border-white/10" />
              <button
                onClick={() => setAdminExpanded(!adminExpanded)}
                className={`w-full flex items-center justify-between px-5 xs:px-6 py-2.5 text-xs sm:text-sm transition ${
                  pathname?.startsWith('/admin/admins') || pathname?.startsWith('/admin/roles') || pathname?.startsWith('/admin/permissions') || pathname?.startsWith('/admin/activity-logs')
                    ? 'text-[#D4AF37] hover:bg-white/5 font-medium'
                    : 'text-white/70 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Shield size={16} className="shrink-0 text-[#D4AF37]" />
                  <span className="tracking-wide">Admin Management</span>
                </div>
                {adminExpanded ? <ChevronDown size={14} className="opacity-70 shrink-0" /> : <ChevronRight size={14} className="opacity-70 shrink-0" />}
              </button>

              {adminExpanded && (
                <div className="bg-black/20 py-1 transition-all">
                  {ADMIN_MGMT_NAV.filter(n => canAccess(user, n.permission)).map((n, idx, arr) => {
                    const Active = pathname === n.href || pathname?.startsWith(n.href);
                    const isLast = idx === arr.length - 1;
                    return (
                      <Link
                        key={n.href}
                        href={n.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center pl-8 xs:pl-10 pr-4 xs:pr-6 py-2 text-xs sm:text-sm transition ${
                          Active
                            ? 'text-[#D4AF37] font-medium bg-white/5 border-l-2 border-[#D4AF37] pl-[30px] xs:pl-[38px]'
                            : 'text-white/60 hover:text-white hover:bg-white/[0.02]'
                        }`}
                      >
                        <span className="text-white/30 font-mono mr-1.5 text-xs shrink-0">{isLast ? '└──' : '├──'}</span>
                        <n.icon size={14} className="mr-2 shrink-0" />
                        <span className="truncate">{n.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* UI SETTINGS SECTION */}
          {UI_NAV.some(n => canAccess(user, n.permission)) && (
            <div className="pt-2">
              <div className="mx-5 xs:mx-6 my-2 border-t border-white/10" />
              <button
                onClick={() => setUiExpanded(!uiExpanded)}
                className={`w-full flex items-center justify-between px-5 xs:px-6 py-2.5 text-xs sm:text-sm transition ${
                  pathname?.startsWith('/admin/payment-settings') || pathname?.startsWith('/admin/banners') || pathname?.startsWith('/admin/header') || pathname?.startsWith('/admin/footer') || pathname?.startsWith('/admin/product-filter') || pathname?.startsWith('/admin/site-settings') || pathname?.startsWith('/admin/homepage')
                    ? 'text-[#D4AF37] hover:bg-white/5 font-medium'
                    : 'text-white/70 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Layout size={16} className="shrink-0" />
                  <span>UI & Settings</span>
                </div>
                {uiExpanded ? <ChevronDown size={14} className="opacity-70 shrink-0" /> : <ChevronRight size={14} className="opacity-70 shrink-0" />}
              </button>

              {uiExpanded && (
                <div className="bg-black/20 py-1 transition-all">
                  {UI_NAV.filter(n => canAccess(user, n.permission)).map((n, idx) => {
                    const Active = pathname === n.href;
                    const isLast = idx === UI_NAV.length - 1;
                    return (
                      <Link
                        key={n.href}
                        href={n.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center pl-8 xs:pl-10 pr-4 xs:pr-6 py-2 text-xs sm:text-sm transition ${
                          Active
                            ? 'text-[#D4AF37] font-medium bg-white/5 border-l-2 border-[#D4AF37] pl-[30px] xs:pl-[38px]'
                            : 'text-white/60 hover:text-white hover:bg-white/[0.02]'
                        }`}
                      >
                        <span className="text-white/30 font-mono mr-1.5 text-xs shrink-0">{isLast ? '└──' : '├──'}</span>
                        <n.icon size={14} className="mr-2 shrink-0" />
                        <span className="truncate">{n.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between gap-1">
            <div className="text-xs text-white/80 truncate font-mono" title={user.email}>{user.email}</div>
            <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-semibold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 font-mono">
              {user.roleKey || (user.role === 'admin' ? 'Super Admin' : user.role)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setAdminPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
              setAdminPwdErrors({ currentPassword: '', newPassword: '', confirmPassword: '' });
              setShowPwdModal(true);
            }}
            className="w-full flex items-center gap-2 text-xs sm:text-sm text-white/70 hover:text-[#D4AF37] transition py-1"
          >
            <KeyRound size={14} className="shrink-0" /> Change Password
          </button>
          <button
            onClick={async () => { await logout(); router.push('/') }}
            className="w-full flex items-center gap-2 text-xs sm:text-sm text-white/70 hover:text-red-400 transition py-1"
          >
            <LogOut size={14} className="shrink-0" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto">
        {/* Mobile Header Bar */}
        <header className="lg:hidden bg-[#0F0F10] text-white border-b border-white/10 px-3.5 py-3 flex items-center justify-between sticky top-0 z-30 shrink-0">
          <button onClick={() => setOpen(true)} className="p-1 hover:text-[#D4AF37] transition-colors" aria-label="Open sidebar">
            <Menu size={20} />
          </button>
          <Link href="/admin" className="flex items-center gap-2">
            <img className="w-[100px] xs:w-[120px] h-auto max-h-10 object-contain" src={siteLogo || "/logo.png"} alt="Logo" />
          </Link>
          <div className="w-6" />
        </header>

        <main className="p-3 xs:p-4 sm:p-6 md:p-8 lg:p-10 flex-1">{children}</main>
      </div>

      {/* Admin Password Change Modal */}
      {showPwdModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#141417] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-white animate-in fade-in zoom-in-95 duration-200 my-auto">
            <button
              onClick={() => setShowPwdModal(false)}
              className="absolute top-4 right-4 p-1.5 text-white/40 hover:text-white rounded-lg transition"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-serif tracking-wide text-white">Change Admin Password</h3>
                <p className="text-xs text-white/50">Update login credentials for {user.email}</p>
              </div>
            </div>

            {!user?.hasPassword && (
              <div className="mb-4 p-3 bg-[#D4AF37]/10 border border-[#D4AF37]/25 rounded-xl text-xs text-[#E8D18C]">
                Your account is currently using Google OAuth. Setting a password will enable standard email & password sign-in as well.
              </div>
            )}

            <form onSubmit={handleAdminPasswordSubmit} className="space-y-4">
              {user?.hasPassword && (
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">Current Password</label>
                  <div className="relative">
                    <input
                      type={showAdminCur ? 'text' : 'password'}
                      value={adminPwdForm.currentPassword}
                      onChange={(e) => {
                        setAdminPwdForm(f => ({ ...f, currentPassword: e.target.value }));
                        if (adminPwdErrors.currentPassword) setAdminPwdErrors(f => ({ ...f, currentPassword: '' }));
                      }}
                      placeholder="Enter your current password"
                      className={`w-full bg-[#1B1B1F] border ${adminPwdErrors.currentPassword ? 'border-red-500/80 focus:border-red-500' : 'border-white/10 focus:border-[#D4AF37]'} rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:outline-hidden transition pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminCur(!showAdminCur)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition"
                    >
                      {showAdminCur ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {adminPwdErrors.currentPassword && (
                    <p className="text-xs text-red-400 mt-1">{adminPwdErrors.currentPassword}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showAdminNew ? 'text' : 'password'}
                    value={adminPwdForm.newPassword}
                    onChange={(e) => {
                      setAdminPwdForm(f => ({ ...f, newPassword: e.target.value }));
                      if (adminPwdErrors.newPassword) setAdminPwdErrors(f => ({ ...f, newPassword: '' }));
                    }}
                    placeholder="At least 6 characters"
                    className={`w-full bg-[#1B1B1F] border ${adminPwdErrors.newPassword ? 'border-red-500/80 focus:border-red-500' : 'border-white/10 focus:border-[#D4AF37]'} rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:outline-hidden transition pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminNew(!showAdminNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition"
                  >
                    {showAdminNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {adminPwdErrors.newPassword && (
                  <p className="text-xs text-red-400 mt-1">{adminPwdErrors.newPassword}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showAdminConf ? 'text' : 'password'}
                    value={adminPwdForm.confirmPassword}
                    onChange={(e) => {
                      setAdminPwdForm(f => ({ ...f, confirmPassword: e.target.value }));
                      if (adminPwdErrors.confirmPassword) setAdminPwdErrors(f => ({ ...f, confirmPassword: '' }));
                    }}
                    placeholder="Re-enter new password"
                    className={`w-full bg-[#1B1B1F] border ${adminPwdErrors.confirmPassword ? 'border-red-500/80 focus:border-red-500' : 'border-white/10 focus:border-[#D4AF37]'} rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:outline-hidden transition pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminConf(!showAdminConf)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition"
                  >
                    {showAdminConf ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {adminPwdErrors.confirmPassword && (
                  <p className="text-xs text-red-400 mt-1">{adminPwdErrors.confirmPassword}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowPwdModal(false)}
                  className="px-4 py-2 text-xs sm:text-sm text-white/60 hover:text-white transition rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminPwdSaving}
                  className="px-5 py-2 text-xs sm:text-sm font-medium bg-gradient-to-r from-[#D4AF37] to-[#AA8010] text-[#0F0F10] rounded-xl hover:opacity-90 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {adminPwdSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
