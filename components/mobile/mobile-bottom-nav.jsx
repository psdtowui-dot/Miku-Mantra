'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Heart, ShoppingBag, User } from 'lucide-react';
import { useCart, useWishlist } from '@/lib/cart-store';
import { useAuth } from '@/lib/use-auth';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { count: cartCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { user } = useAuth();

  // Hide on Admin portal pages
  if (pathname && pathname.startsWith('/admin')) {
    return null;
  }

  const navItems = [
    {
      label: 'Home',
      href: '/',
      icon: Home,
      isActive: pathname === '/'
    },
    {
      label: 'Shop',
      href: '/shop',
      icon: Compass,
      isActive: pathname.startsWith('/shop') || pathname.startsWith('/product')
    },
    {
      label: 'Wishlist',
      href: '/wishlist',
      icon: Heart,
      badge: wishlistCount > 0 ? wishlistCount : null,
      isActive: pathname.startsWith('/wishlist')
    },
    {
      label: 'Cart',
      href: '/cart',
      icon: ShoppingBag,
      badge: cartCount > 0 ? cartCount : null,
      isActive: pathname.startsWith('/cart') || pathname.startsWith('/checkout')
    },
    {
      label: user ? 'Account' : 'Sign In',
      href: user ? '/account' : '/login',
      icon: User,
      isActive: pathname.startsWith('/account') || pathname.startsWith('/login')
    }
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#FBF4EE]/95 backdrop-blur-md border-t border-neutral-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] lg:hidden transition-all duration-300 pb-[max(0.35rem,env(safe-area-inset-bottom))]"
      aria-label="Mobile Navigation"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 items-center h-14">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center h-full w-full relative transition-all duration-200 select-none touch-manipulation active:scale-95 ${
                active ? 'text-[#9C6B30]' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    active ? 'scale-110 stroke-[2.2]' : 'stroke-[1.6]'
                  }`}
                />
                {item.badge != null && (
                  <span className="absolute -top-1.5 -right-2 bg-[#9C6B30] text-white text-[9px] xs:text-[10px] font-semibold min-w-3.5 xs:min-w-4 h-3.5 xs:h-4 px-1 rounded-full flex items-center justify-center shadow-sm">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[9px] xs:text-[10px] mt-1 tracking-tight xs:tracking-wider uppercase transition-all duration-200 truncate max-w-full px-0.5 ${
                  active ? 'font-semibold text-[#9C6B30]' : 'font-normal'
                }`}
              >
                {item.label}
              </span>
              {active && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#9C6B30]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
