'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Heart, ShoppingBag, User, Menu, X, ChevronDown, ChevronRight, ChevronUp, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/use-auth';
import { useCart, useWishlist } from '@/lib/cart-store';
import { motion, AnimatePresence } from 'framer-motion';
import AuthModal from '@/components/site/auth-modal';

export default function Navbar({ initialData }) {
  const pathname = usePathname();
  const router = useRouter();
  const [headerData, setHeaderData] = useState(initialData || null);
  const [scrolled, setScrolled] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const { count } = useCart();
  const { count: wcount } = useWishlist();

  // Mobile accordion state
  const [expandedMobileNav, setExpandedMobileNav] = useState(null);

  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authPromptMsg, setAuthPromptMsg] = useState('');

  useEffect(() => {
    const handleAuthPrompt = (e) => {
      setAuthPromptMsg(e.detail?.message || 'Please login or create an account to add products to your wishlist.');
      setAuthPromptOpen(true);
    };
    window.addEventListener('mikumantra:auth-prompt', handleAuthPrompt);
    return () => window.removeEventListener('mikumantra:auth-prompt', handleAuthPrompt);
  }, []);

  useEffect(() => {
    if (mobile) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = 'var(--removed-body-scrollbar-width, 0px)';
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [mobile]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMobile(false);
    };
    if (mobile) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobile]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -16 },
    show: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.35,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  };

  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await fetch(`/api/products?search=${encodeURIComponent(q.trim())}&limit=6`);
        if (response.ok) {
          const data = await response.json();
          setResults(data.products || []);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error('Search error:', err);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [q]);

  // Fetch header config or synchronize when initialData updates
  useEffect(() => {
    if (initialData) {
      setHeaderData(initialData);
      return;
    }
    let active = true;
    const fetchHeader = async () => {
      try {
        const response = await fetch('/api/header', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          if (active) setHeaderData(data);
        }
      } catch (err) {
        console.error('Failed to load header configuration:', err);
      }
    };
    fetchHeader();
    return () => { active = false; };
  }, [initialData]);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const isScrolled = window.scrollY > 10;
          setScrolled(prev => (prev !== isScrolled ? isScrolled : prev));
          ticking = false;
        });
        ticking = true;
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (pathname?.startsWith('/admin')) {
    return null;
  }



  // Sort navigation items by order
  const activeNavs = (headerData?.navigation || [])
    .filter(n => n.isActive)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const logoSettings = headerData?.logo || null;
  const headerSettings = headerData?.settings || {};

  const announcement = headerData?.announcement || null;
  const isAnnouncementEnabled = !!(
    announcement &&
    (announcement.isEnabled ?? announcement.enabled ?? false)
  );

  return (
    <div className="sticky top-0 z-50">
      {/* Main navbar */}
      <nav className={`bg-[#fbf4eed9] transition-all duration-300 ${scrolled ? 'shadow-[0_4px_24px_-8px_rgba(26,26,26,0.08)] border-b border-neutral-100' : 'border-b border-neutral-200/60'}`}>
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo Link (Aligned Left) */}
            <div className="flex items-center">
              <Link href={logoSettings?.url || "/"} className="flex items-center max-w-[95px] xs:max-w-[120px] sm:max-w-[200px] lg:max-w-[280px]">
                <img
                  src={logoSettings?.image || "/logo.png"}
                  alt={logoSettings?.alt || "Logo"}
                  className="h-7 sm:h-10 object-contain max-w-full"
                  onError={(e) => {
                    if (typeof window !== 'undefined' && e.target.src !== window.location.origin + '/logo.png') {
                      e.target.src = '/logo.png';
                    }
                  }}
                />
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <ul className="hidden lg:flex items-center gap-8 text-[13px] tracking-[0.14em] uppercase text-[#1A1A1A]">
              {activeNavs.map(nav => {
                const sortedSections = nav.dropdown?.sections
                  ? [...nav.dropdown.sections].sort((a, b) => (a.order || 0) - (b.order || 0))
                  : [];
                return (
                  <li key={nav.id} className="group relative">
                    <Link
                      href={nav.url}
                      className="flex items-center gap-1 hover:text-[#9C6B30] transition-colors py-6"
                    >
                      {nav.label}
                      {nav.hasDropdown && <ChevronDown size={12} className="opacity-40" />}
                    </Link>

                    {/* Mega Dropdown menu */}
                    {nav.hasDropdown && (
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-[720px] bg-white border border-[#E8E8E8] rounded-lg p-6 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 luxe-shadow-lg z-50">
                        <div className="grid grid-cols-3 gap-6">
                          {sortedSections.map(sec => {
                            const sortedItems = sec.items
                              ? [...sec.items].filter(it => it.isActive).sort((a, b) => (a.order || 0) - (b.order || 0))
                              : [];
                            return (
                              <div key={sec.id}>
                                <div className="font-display text-xs text-[#9C6B30] mb-3 tracking-wider uppercase font-semibold">
                                  {sec.title}
                                </div>
                                <ul className="space-y-2 text-[12px] tracking-wider text-[#333] normal-case">
                                  {sortedItems.map(it => (
                                    <li key={it.id}>
                                      <Link href={it.url} className="hover:text-[#9C6B30] transition-colors">
                                        {it.label}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })}

                          {/* Empty section space if there are fewer than 2 columns to balance design */}
                          {sortedSections.length === 1 && <div />}
                          {sortedSections.length === 0 && <div className="col-span-2" />}

                          {/* Featured Image Card */}
                          {nav.dropdown?.featured?.isActive && (
                            <Link href={nav.dropdown.featured.url || "#"} className="relative rounded-md overflow-hidden group/img aspect-video">
                              <img
                                src={nav.dropdown.featured.image}
                                alt={nav.dropdown.featured.alt || nav.dropdown.featured.title}
                                loading="lazy"
                                className="w-full h-32 object-cover group-hover/img:scale-105 transition-transform duration-700"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                              <div className="absolute bottom-3 left-3 text-white">
                                <div className="font-display text-sm uppercase tracking-wider">{nav.dropdown.featured.title}</div>
                              </div>
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Desktop & Mobile Action Icons (Grouped Right) */}
            <div className="flex items-center justify-end gap-1.5 xs:gap-2 sm:gap-4 lg:gap-5 text-[#1A1A1A]">
              {headerSettings.searchEnabled && (
                <button onClick={() => setSearchOpen(true)} className="hover:text-[#9C6B30] transition-colors p-1" title="Search">
                  <Search size={19} />
                </button>
              )}
              {headerSettings.wishlistEnabled && (
                <Link href="/wishlist" className="relative hover:text-[#9C6B30] hidden sm:block transition-colors p-1" title="Wishlist">
                  <Heart size={19} />
                  {wcount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#9C6B30] text-white text-[9px] rounded-full h-4 w-4 flex items-center justify-center">
                      {wcount}
                    </span>
                  )}
                </Link>
              )}
              {headerSettings.accountEnabled && (
                <Link href="/account" className="hover:text-[#9C6B30] hidden sm:block transition-colors p-1" title="Account">
                  <User size={19} />
                </Link>
              )}
              {headerSettings.cartEnabled && (
                <Link href="/cart" className="relative hover:text-[#9C6B30] transition-colors p-1" title="Shopping Cart">
                  <ShoppingBag size={19} />
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#9C6B30] text-white text-[9px] rounded-full h-4 w-4 flex items-center justify-center">
                      {count}
                    </span>
                  )}
                </Link>
              )}
              {/* Mobile Hamburger menu icon (last in flex layout for RIGHT actions group) */}
              <button
                className="lg:hidden text-[#1A1A1A] p-2 hover:text-[#9C6B30] relative w-10 h-10 flex flex-col justify-center items-center z-[60] transition-colors"
                onClick={() => setMobile(!mobile)}
                aria-label={mobile ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={mobile}
              >
                <div className="w-5 h-4 flex flex-col justify-between relative">
                  <span className={`w-5 h-0.5 bg-current transition-all duration-300 ease-out origin-center ${mobile ? 'rotate-45 translate-y-[7px]' : ''}`} />
                  <span className={`w-5 h-0.5 bg-current transition-all duration-300 ease-out ${mobile ? 'opacity-0 scale-x-0' : ''}`} />
                  <span className={`w-5 h-0.5 bg-current transition-all duration-300 ease-out origin-center ${mobile ? '-rotate-45 -translate-y-[7px]' : ''}`} />
                </div>
              </button>
            </div>

          </div>
        </div>
      </nav>


      {/* Announcement */}
      {isAnnouncementEnabled && (
        announcement.isSliding ? (
          <div
            className="text-[11px] tracking-[0.2em] uppercase"
            style={{ backgroundColor: announcement.backgroundColor || '#4a2536', color: announcement.textColor || '#FFFFFF' }}
          >
            <div className="overflow-hidden py-3">
              <div className="marquee whitespace-nowrap">
                {[...Array(20)].map((_, i) => (
                  <div key={i} className="flex gap-12 shrink-0">
                    <span>{announcement.announcementText}</span>
                    <span className="opacity-60">•</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="text-[11px] tracking-[0.2em] uppercase py-3 flex justify-center items-center text-center px-4"
            style={{ backgroundColor: announcement.backgroundColor || '#4a2536', color: announcement.textColor || '#FFFFFF' }}
          >
            <span>{announcement.announcementText}</span>
          </div>
        )
      )}

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70]" onClick={() => setSearchOpen(false)}>
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="bg-white max-w-2xl mx-2 sm:mx-auto mt-6 sm:mt-24 rounded-xl p-4 sm:p-6 luxe-shadow-lg" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center border-b border-[#E8E8E8] pb-3">
                <Search size={18} className="text-[#9C6B30] mr-3" />
                <input
                  autoFocus
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && q.trim()) {
                      router.push(`/shop?search=${encodeURIComponent(q.trim())}`);
                      setSearchOpen(false);
                    }
                  }}
                  placeholder="Search for gold, diamond, bridal…"
                  className="w-full bg-transparent outline-none font-serif-luxe text-lg sm:text-xl"
                />
                <button onClick={() => setSearchOpen(false)}><X size={18} /></button>
              </div>
              <div className="mt-4">
                {q.trim() === '' ? (
                  <div>
                    <div className="text-[10px] tracking-[0.3em] uppercase text-[#9C6B30] mb-2">Popular searches</div>
                    <div className="flex flex-wrap gap-2">{['diamond ring', 'bridal set', 'gold chain', 'solitaire', 'mangalsutra'].map(t => (<button key={t} onClick={() => setQ(t)} className="text-xs px-3 py-1.5 border border-[#E8E8E8] rounded-full hover:border-[#9C6B30] hover:text-[#9C6B30]">{t}</button>))}</div>
                  </div>
                ) : (
                  <ul className="divide-y divide-[#E8E8E8]">
                    {searching ? (
                      <li className="py-8 text-center text-sm text-neutral-500 flex items-center justify-center gap-2">
                        <Loader2 className="animate-spin text-[#9C6B30] h-5 w-5" />
                        Searching database...
                      </li>
                    ) : results.length === 0 ? (
                      <li className="py-10 text-center">
                        <div className="font-serif-luxe text-xl text-neutral-800 font-medium">Product not found</div>
                        <p className="text-xs text-neutral-500 mt-1.5">
                          {q.trim() ? (
                            <>No products match &quot;{q.trim()}&quot;. Try checking for typos or searching with different keywords.</>
                          ) : (
                            <>Try searching for keywords like &quot;bridal&quot;, &quot;solitaire&quot;, or &quot;diamond&quot;.</>
                          )}
                        </p>
                      </li>
                    ) : (
                      <>
                        {results.map(r => (
                          <li key={r.id}>
                            <Link
                              href={`/product/${r.slug}`}
                              onClick={() => setSearchOpen(false)}
                              className="flex items-center gap-3 sm:gap-4 py-3 hover:bg-[#FAF6EF] rounded-md px-2"
                            >
                              <img
                                src={r.images && r.images[0] ? r.images[0] : '/logo.png'}
                                className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded shrink-0"
                                alt={r.name}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-serif-luxe text-base sm:text-lg leading-tight truncate">{r.name}</div>
                                <div className="text-xs text-neutral-500 capitalize">
                                  {r.category} · {r.metal || 'Fine Jewellery'}
                                </div>
                              </div>
                              <div className="text-xs sm:text-sm font-medium text-[#9C6B30] shrink-0">
                                ₹{r.price.toLocaleString('en-IN')}
                              </div>
                            </Link>
                          </li>
                        ))}
                        <li className="pt-3 pb-1 text-center">
                          <Link
                            href={`/shop?search=${encodeURIComponent(q.trim())}`}
                            onClick={() => setSearchOpen(false)}
                            className="text-xs text-[#9C6B30] hover:underline font-medium uppercase tracking-wider inline-flex items-center gap-1"
                          >
                            View all results for &quot;{q.trim()}&quot; →
                          </Link>
                        </li>
                      </>
                    )}
                  </ul>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 bg-black/25 backdrop-blur-xs z-50 lg:hidden"
            onClick={() => setMobile(false)}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white h-full w-[85vw] max-w-[300px] p-4 xs:p-6 overflow-y-auto flex flex-col justify-between z-50"
              onClick={e => e.stopPropagation()}
            >
              <div>
                <div className="flex justify-between items-center mb-8 border-b border-neutral-100 pb-4">
                  <Link href={logoSettings?.url || "/"} onClick={() => setMobile(false)} className="inline-block">
                    <img
                      className="w-32 h-auto max-h-12 object-contain"
                      src={logoSettings?.image || "/logo.png"}
                      alt={logoSettings?.alt || "MikuMantra Logo"}
                      onError={(e) => {
                        if (typeof window !== 'undefined' && e.target.src !== window.location.origin + '/logo.png') {
                          e.target.src = '/logo.png';
                        }
                      }}
                    />
                  </Link>
                </div>

                {/* Mobile Accordion Links */}
                <motion.ul
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-1 text-sm tracking-widest uppercase"
                >
                  {activeNavs.map(nav => {
                    const hasDropdown = nav.hasDropdown && nav.dropdown?.sections?.length > 0;
                    const isExpanded = expandedMobileNav === nav.id;
                    const sortedSections = nav.dropdown?.sections
                      ? [...nav.dropdown.sections].sort((a, b) => (a.order || 0) - (b.order || 0))
                      : [];

                    return (
                      <motion.li
                        key={nav.id}
                        variants={itemVariants}
                        className="border-b border-neutral-100 py-3.5"
                      >
                        {hasDropdown ? (
                          <div>
                            <button
                              onClick={() => setExpandedMobileNav(isExpanded ? null : nav.id)}
                              className="flex justify-between items-center w-full text-left font-medium text-neutral-800"
                            >
                              <span>{nav.label}</span>
                              {isExpanded ? <ChevronUp size={16} className="text-neutral-400" /> : <ChevronDown size={16} className="text-neutral-400" />}
                            </button>

                            {/* Accordion expansion */}
                            {isExpanded && (
                              <div className="mt-3 pl-4 space-y-4 normal-case tracking-normal">
                                {sortedSections.map(sec => {
                                  const sortedItems = sec.items
                                    ? [...sec.items].filter(it => it.isActive).sort((a, b) => (a.order || 0) - (b.order || 0))
                                    : [];
                                  return (
                                    <div key={sec.id} className="space-y-2">
                                      <div className="text-[11px] font-bold text-[#9C6B30] uppercase tracking-wider">{sec.title}</div>
                                      <ul className="space-y-2 text-xs text-neutral-600 pl-2">
                                        {sortedItems.map(it => (
                                          <li key={it.id}>
                                            <Link href={it.url} onClick={() => setMobile(false)} className="block hover:text-[#9C6B30] py-1 transition-colors">
                                              {it.label}
                                            </Link>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  );
                                })}

                                {nav.dropdown?.featured?.isActive && (
                                  <Link
                                    href={nav.dropdown.featured.url || "#"}
                                    onClick={() => setMobile(false)}
                                    className="block mt-4 rounded overflow-hidden relative aspect-video"
                                  >
                                    <img src={nav.dropdown.featured.image} alt={nav.dropdown.featured.alt} className="w-full h-24 object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                      <span className="text-white text-xs uppercase font-semibold tracking-wider">{nav.dropdown.featured.title}</span>
                                    </div>
                                  </Link>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Link href={nav.url} onClick={() => setMobile(false)} className="block font-medium text-neutral-800">
                            {nav.label}
                          </Link>
                        )}
                      </motion.li>
                    );
                  })}
                </motion.ul>
              </div>

              {/* Drawer Bottom Actions */}
              <div className="border-t border-neutral-100 pt-6 mt-6 flex justify-around text-neutral-500">
                {headerSettings.wishlistEnabled && (
                  <Link href="/wishlist" onClick={() => setMobile(false)} className="relative flex flex-col items-center gap-1.5 hover:text-[#9C6B30] transition-colors">
                    <Heart size={20} />
                    <span className="text-[10px] tracking-widest uppercase font-semibold">Wishlist</span>
                    {wcount > 0 && <span className="absolute -top-1.5 right-1.5 bg-[#9C6B30] text-white text-[8px] rounded-full h-3.5 w-3.5 flex items-center justify-center">{wcount}</span>}
                  </Link>
                )}
                {headerSettings.accountEnabled && (
                  <Link href="/account" onClick={() => setMobile(false)} className="flex flex-col items-center gap-1.5 hover:text-[#9C6B30] transition-colors">
                    <User size={20} />
                    <span className="text-[10px] tracking-widest uppercase font-semibold">Account</span>
                  </Link>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Prompt Modal with exact same design & options */}
      <AuthModal
        isOpen={authPromptOpen}
        onClose={() => setAuthPromptOpen(false)}
        initialMode="login"
      />

    </div>
  );
}
