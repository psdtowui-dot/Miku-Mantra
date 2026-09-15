'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/use-auth';
import { LayoutDashboard, Package, FolderTree, Sparkles, ShoppingCart, Users, Ticket, MessageSquare, Image as ImageIcon, LogOut, Loader2, Menu, X, History, Settings, ChevronDown, ChevronRight, Layout, SlidersHorizontal, Globe, RotateCcw, ShieldCheck } from 'lucide-react';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/categories', label: 'Categories', icon: FolderTree },
  { href: '/admin/collections', label: 'Collections', icon: Sparkles },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/returns', label: 'Return Requests', icon: RotateCcw },
  { href: '/admin/delivered-history', label: 'Delivered History', icon: History },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/coupons', label: 'Coupons', icon: Ticket },
  { href: '/admin/reviews', label: 'Reviews', icon: MessageSquare },
];

const UI_NAV = [
  { href: '/admin/site-settings', label: 'Site & SEO Settings', icon: Globe },
  { href: '/admin/homepage', label: 'Promote & Assurance', icon: ShieldCheck },
  { href: '/admin/banners', label: 'Banners', icon: ImageIcon },
  { href: '/admin/header', label: 'Header', icon: Menu },
  { href: '/admin/footer', label: 'Footer', icon: Settings },
  { href: '/admin/product-filter', label: 'Product Filter', icon: SlidersHorizontal },
];

export default function AdminLayout({ children }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [uiExpanded, setUiExpanded] = useState(false);

  useEffect(() => { if (!loading) { if (!user) { router.push('/login?redirect=' + pathname) } else if (user.role !== 'admin') { router.push('/') } } }, [loading, user, router, pathname]);

  useEffect(() => {
    if (pathname && (pathname.startsWith('/admin/site-settings') || pathname.startsWith('/admin/homepage') || pathname.startsWith('/admin/banners') || pathname.startsWith('/admin/header') || pathname.startsWith('/admin/footer') || pathname.startsWith('/admin/product-filter'))) {
      setUiExpanded(true);
    }
  }, [pathname]);

  if (loading || !user || user.role !== 'admin') return <div className="h-screen flex items-center justify-center bg-[#0F0F10]"><Loader2 className="animate-spin text-[#D4AF37]" /></div>

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
            <img className="w-[110px] xs:w-[130px] sm:w-[145px] lg:w-[180px] h-auto object-contain" src="/logo.png" alt="Logo" />
          </Link>
          <button className="lg:hidden p-1 text-white/70 hover:text-white" onClick={() => setOpen(false)} aria-label="Close sidebar">
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto dark-scrollbar space-y-1">
          {NAV.map(n => {
            const Active = pathname === n.href || (n.href !== '/admin' && pathname?.startsWith(n.href)); return (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 px-5 xs:px-6 py-3 text-xs sm:text-sm transition ${Active ? 'bg-white/10 text-[#D4AF37] border-l-2 border-[#D4AF37]' : 'text-white/70 hover:bg-white/5'}`}><n.icon size={16} className="shrink-0" /><span className="truncate">{n.label}</span></Link>
            )
          })}

          <div>
            <button
              onClick={() => setUiExpanded(!uiExpanded)}
              className={`w-full flex items-center justify-between px-5 xs:px-6 py-3 text-xs sm:text-sm transition ${pathname?.startsWith('/admin/banners') || pathname?.startsWith('/admin/header') || pathname?.startsWith('/admin/footer') || pathname?.startsWith('/admin/product-filter')
                ? 'text-[#D4AF37] hover:bg-white/5'
                : 'text-white/70 hover:bg-white/5'
                }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Layout size={16} className="shrink-0" />
                <span>UI</span>
              </div>
              {uiExpanded ? <ChevronDown size={14} className="opacity-70 shrink-0" /> : <ChevronRight size={14} className="opacity-70 shrink-0" />}
            </button>

            {uiExpanded && (
              <div className="bg-black/20 py-1 transition-all">
                {UI_NAV.map((n, idx) => {
                  const Active = pathname === n.href;
                  const isLast = idx === UI_NAV.length - 1;
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center pl-8 xs:pl-10 pr-4 xs:pr-6 py-2 text-xs sm:text-sm transition ${Active
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
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-white/60 mb-2 truncate">{user.email}</div>
          <button onClick={async () => { await logout(); router.push('/') }} className="w-full flex items-center gap-2 text-xs sm:text-sm text-white/70 hover:text-white"><LogOut size={14} className="shrink-0" /> Sign out</button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Header Bar */}
        <header className="lg:hidden bg-[#0F0F10] text-white border-b border-white/10 px-3.5 py-3 flex items-center justify-between sticky top-0 z-30">
          <button onClick={() => setOpen(true)} className="p-1 hover:text-[#D4AF37] transition-colors" aria-label="Open sidebar">
            <Menu size={20} />
          </button>
          <Link href="/admin" className="flex items-center gap-2">
            <img className="w-[100px] xs:w-[120px] h-auto object-contain" src="/logo.png" alt="Logo" />
          </Link>
          <div className="w-6" />
        </header>

        <main className="p-3 xs:p-4 sm:p-6 md:p-8 lg:p-10 flex-1">{children}</main>
      </div>
    </div>
  );
}
