'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, ShieldCheck, Truck, RefreshCw, Sparkles, Award, Heart, ChevronLeft, ChevronRight, Instagram, Loader2,
  Check, Globe, Lock, Gift, Tag, Star, Clock, Gem, Mail, CheckCircle2
} from 'lucide-react';
import ProductCard from '@/components/site/product-card';
import { optimizeImageUrl } from '@/lib/image-utils';
import { toast } from 'sonner';


const LUCIDE_ICONS_MAP = {
  ShieldCheck,
  Award,
  Truck,
  RefreshCw,
  Sparkles,
  Heart,
  Check,
  Globe,
  Lock,
  Gift,
  Tag,
  Star,
  Clock,
  Gem
};
import RecentlyViewed from '@/components/site/recently-viewed';
import CompareBar from '@/components/site/compare-bar';
import SocialMediaSection from '@/components/site/social-media-section';
import CategoryShowcaseSection from '@/components/site/category-showcase-section';

function Hero({ slides, transitionStyle = 'fade' }) {
  const [i, setI] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  // Preload the next slide on idle after initial render to avoid competing with critical LCP
  useEffect(() => {
    if (!slides || slides.length <= 1) return;
    const nextIdx = (i + 1) % slides.length;
    const nextImgSrc = slides[nextIdx]?.img;
    if (!nextImgSrc) return;

    const optUrl = optimizeImageUrl(nextImgSrc, { width: 1920, quality: 80 });
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(() => {
        const img = new Image();
        img.src = optUrl;
      });
      return () => window.cancelIdleCallback(handle);
    } else {
      const timer = setTimeout(() => {
        const img = new Image();
        img.src = optUrl;
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [i, slides]);

  // Autoplay intervals: synchronized with manual triggers to prevent overlapping / rapid transitions.
  useEffect(() => {
    if (!slides.length) return;
    const t = setInterval(() => {
      setI((x) => (x + 1) % slides.length);
    }, 6000);
    return () => clearInterval(t);
  }, [i, slides.length]);

  const s = slides[i] || slides[0];

  // Premium transitions with custom cubic bezier easing: acceleration starts soft, decelerates smoothly
  const premiumEase = [0.22, 1, 0.36, 1]; // cubic-bezier(0.22, 1, 0.36, 1)

  const transitionConfigs = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.85, ease: premiumEase }
    },
    slide: {
      initial: { x: '100%' },
      animate: { x: 0 },
      exit: { x: '-100%' },
      transition: { duration: 0.85, ease: premiumEase }
    },
    zoom: {
      initial: { scale: 1.05, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      exit: { scale: 1.05, opacity: 0 },
      transition: { duration: 0.85, ease: premiumEase }
    },
    scaleFade: {
      initial: { scale: 1.03, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      exit: { scale: 0.97, opacity: 0 },
      transition: { duration: 0.85, ease: premiumEase }
    }
  };

  const anim = shouldReduceMotion
    ? {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.3 }
    }
    : (transitionConfigs[transitionStyle] || transitionConfigs.fade);

  // Cinematic Parallax-like Zoom for Background Image
  const imageTransition = shouldReduceMotion
    ? {}
    : {
      initial: { scale: 1.02 },
      animate: { scale: 1 },
      transition: { duration: 1.2, ease: premiumEase }
    };

  // Subtle staggered text animations (Kicker -> Title -> Description -> CTA buttons)
  const getTextAnim = (delayTime, yVal = 12) => {
    if (shouldReduceMotion) {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.3 }
      };
    }
    return {
      initial: { opacity: 0, y: yVal },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.7, ease: premiumEase, delay: delayTime }
    };
  };

  if (!slides || slides.length === 0) return null;

  return (
    <section className="relative w-full h-[65vh] min-h-[460px] md:h-[78vh] md:min-h-[560px] overflow-hidden bg-[#1A1A1A]">
      <AnimatePresence mode="sync">
        <motion.div
          key={i}
          {...anim}
          style={{ willChange: 'transform, opacity' }}
          className="absolute inset-0 w-full h-full"
        >
          <motion.img
            src={optimizeImageUrl(s.img, { width: 1920, quality: 80 })}
            alt={s.title}
            width="1920"
            height="1080"
            fetchPriority={i === 0 ? "high" : "auto"}
            loading={i === 0 ? "eager" : "lazy"}
            decoding={i === 0 ? "sync" : "async"}
            className="w-full h-full object-cover object-[center_35%] md:object-center"
            {...imageTransition}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />

          {/* Overlay content positioned slightly below center on mobile/tablet (items-end pb-20) and centered on desktop */}
          <div className="absolute inset-0 z-10 h-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 flex items-end pb-16 md:items-center md:pb-0 pointer-events-none">
            <div className="max-w-xl text-white pointer-events-auto">
              <motion.div {...getTextAnim(0.15, 10)} className="text-[10px] sm:text-[11px] tracking-[0.3em] sm:tracking-[0.4em] uppercase text-[#D4AF37] mb-2 sm:mb-4">
                {s.kicker}
              </motion.div>
              <motion.h1 {...getTextAnim(0.23, 15)} className="font-display text-2xl xs:text-3xl sm:text-5xl md:text-7xl leading-[1.05] font-light break-words">
                {s.title}
              </motion.h1>
              <motion.div {...getTextAnim(0.29, 15)}>
                <div className="gold-line w-24 my-3 sm:my-6" />
                <p className="text-white/80 text-xs sm:text-base md:text-lg leading-relaxed max-w-sm sm:max-w-md font-light">
                  {s.copy}
                </p>
              </motion.div>
              <motion.div {...getTextAnim(0.35, 10)} className="mt-5 sm:mt-8 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                <Link
                  href={s.href || '/shop'}
                  className="group inline-flex items-center justify-center gap-2 bg-white text-[#1A1A1A] px-5 py-3 sm:px-7 sm:py-3.5 text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] uppercase hover:bg-[#D4AF37] hover:text-white transition-all w-full sm:w-auto text-center"
                >
                  {s.cta || 'Shop Now'}{' '}
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/shop"
                  className="inline-flex items-center justify-center px-5 py-3 sm:px-7 sm:py-3.5 text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] uppercase border border-white/40 text-white hover:border-[#D4AF37] hover:text-[#D4AF37] transition w-full sm:w-auto text-center"
                >
                  Shop All
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Indicators */}
      <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            className={`h-[2px] transition-all ${idx === i ? 'w-10 bg-[#D4AF37]' : 'w-6 bg-white/40'}`}
          />
        ))}
      </div>
      <button
        onClick={() => setI((i - 1 + slides.length) % slides.length)}
        className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white items-center justify-center hover:bg-[#D4AF37]"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={() => setI((i + 1) % slides.length)}
        className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white items-center justify-center hover:bg-[#D4AF37]"
      >
        <ChevronRight size={18} />
      </button>
    </section>
  );
}

function SectionTitle({ eyebrow, title, sub }) {
  return (<div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12"><div className="text-[10px] sm:text-[11px] tracking-[0.35em] uppercase text-[#9C6B30] mb-2 sm:mb-3">{eyebrow}</div><h2 className="font-display text-2xl xs:text-3xl md:text-5xl text-[#1A1A1A] font-light break-words">{title}</h2><div className="gold-line w-16 mx-auto my-4 sm:my-5" />{sub && <p className="text-xs sm:text-base text-neutral-500 font-light">{sub}</p>}</div>);
}



function CollectionsTabs({ collections = [], allProducts = [], loading = false }) {
  const uniqueCollections = (collections || []).reduce((acc, c) => {
    if (c && c.slug && !acc.some(existing => existing.slug === c.slug)) {
      acc.push(c);
    }
    return acc;
  }, []);

  const [active, setActive] = useState(uniqueCollections[0]?.slug || 'trending');
  
  // Normalized collection filter with graceful fallback to all active products
  const list = useMemo(() => {
    if (!allProducts || allProducts.length === 0) return [];
    const matched = allProducts.filter(p => {
      const pCol = String(p.collection || '').toLowerCase();
      const pBadge = String(p.badge || '').toLowerCase();
      const act = String(active || '').toLowerCase();
      if (pCol === act || pBadge === act) return true;
      if (act === 'trending' && (p.featured || pCol.includes('trend'))) return true;
      if (act === 'best-sellers' && (p.bestseller || pCol.includes('best'))) return true;
      if (act === 'new-arrival' && (p.newArrival || pCol.includes('new'))) return true;
      return false;
    });
    return matched.length > 0 ? matched.slice(0, 8) : allProducts.slice(0, 8);
  }, [allProducts, active]);

  return (
    <section className="bg-[#FAF6EF]/40 py-12 sm:py-20">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
        <SectionTitle eyebrow="The MikuMantra Edit" title="Featured Collections" sub="Handpicked by our design house — refreshed every season." />
        {uniqueCollections.length > 0 && (
          <div className="flex justify-center flex-wrap gap-1.5 sm:gap-2 mb-8 sm:mb-10">
            {uniqueCollections.map((c, i) => (
              <button
                key={c.id || `${c.slug}-${i}`}
                onClick={() => setActive(c.slug)}
                className={`px-3.5 py-2 sm:px-5 sm:py-2.5 text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.25em] uppercase rounded-full transition-all ${active === c.slug ? 'bg-[#1A1A1A] text-white' : 'bg-white text-[#1A1A1A] border border-[#E8E8E8] hover:border-[#9C6B30]'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
        {loading && list.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-6 md:gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-3">
                <div className="rounded-xl bg-[#FAF6EF] aspect-[4/5] w-full" />
                <div className="h-4 bg-neutral-100 rounded w-3/4 mx-auto" />
                <div className="h-3 bg-neutral-100 rounded w-1/2 mx-auto" />
              </div>
            ))}
          </div>
        ) : list.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-6 md:gap-8">
            {list.map((p, i) => <ProductCard key={p.id || p.slug} p={p} index={i} />)}
          </div>
        ) : (
          <div className="text-center py-12 text-neutral-400 font-serif-luxe text-base">
            Curated treasures arriving shortly.
          </div>
        )}
        <div className="text-center mt-8 sm:mt-12"><Link href="/shop" className="inline-flex items-center gap-2 border-b border-[#9C6B30] text-[#9C6B30] pb-1 text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] uppercase hover:gap-4 transition-all">View Entire Collection <ArrowRight size={14} /></Link></div>
      </div>
    </section>
  );
}

function OfferBanner({ promotions = [] }) {
  const activeBanners = (promotions || []).filter(b => b.enabled !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
  if (!activeBanners || activeBanners.length === 0) return null;

  return (
    <section className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 py-10 md:py-16">
      <div className={`grid gap-4 sm:gap-6 ${activeBanners.length === 1 ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
        {activeBanners.map((b, i) => (
          <motion.div key={b.id || i} initial={{ opacity: 0, scale: .98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="relative h-64 sm:h-80 rounded-2xl overflow-hidden group cursor-pointer luxe-shadow">
            <Link href={b.ctaUrl || '/shop'}>
              <img src={optimizeImageUrl(b.img, { width: 800, quality: 80 })} width="800" height="320" loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" alt={b.title} />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-black/20 to-transparent" />
              <div className="absolute inset-0 p-4 xs:p-6 sm:p-8 md:p-12 flex flex-col justify-end text-white">
                <div className="text-[10px] sm:text-[11px] tracking-[0.35em] uppercase text-[#D4AF37] mb-1.5 sm:mb-2">{b.eyebrow || 'Limited Time'}</div>
                <div className="font-display text-xl xs:text-2xl sm:text-3xl md:text-4xl font-light">{b.title}</div>
                {b.subtitle && <div className="mt-1 sm:mt-2 text-xs sm:text-base text-white/80">{b.subtitle}</div>}
                <div className="mt-4 sm:mt-5 inline-flex items-center gap-2 text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] uppercase w-fit border-b border-[#D4AF37] pb-1 group-hover:gap-4 transition-all">
                  {b.ctaText || 'Shop the Offer'} <ArrowRight size={14} />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function WhyUs({ assuranceSection, assuranceCards = [] }) {
  if (assuranceSection && assuranceSection.enabled === false) return null;

  const activeCards = (assuranceCards || []).filter(c => c.enabled !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
  if (!activeCards || activeCards.length === 0) return null;

  return (
    <section className="py-10 md:py-20 bg-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
        <SectionTitle
          eyebrow={assuranceSection?.eyebrow || 'Our Promise'}
          title={assuranceSection?.title || 'The MikuMantra Assurance'}
          sub={assuranceSection?.description || ''}
        />
        <div className={`grid gap-2.5 sm:gap-6 ${activeCards.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'}`}>
          {activeCards.map((it, idx) => {
            const IconComp = LUCIDE_ICONS_MAP[it.icon] || ShieldCheck;
            return (
              <motion.div key={it.id || idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * .05 }} className="text-center p-2.5 xs:p-3 sm:p-6 rounded-xl border border-[#E8E8E8] hover:border-[#D4AF37] hover:-translate-y-1 transition-all bg-white">
                <div className="w-10 h-10 sm:w-14 sm:h-14 mx-auto rounded-full bg-gradient-to-br from-[#9C6B30]/10 to-[#D4AF37]/20 flex items-center justify-center text-[#9C6B30] mb-2 sm:mb-4">
                  <IconComp size={18} className="sm:w-6 sm:h-6" />
                </div>
                <div className="font-serif-luxe text-base sm:text-lg text-[#1A1A1A] leading-tight">{it.title}</div>
                <div className="text-[11px] sm:text-xs text-neutral-500 mt-1 leading-normal sm:leading-relaxed">{it.description}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}





function Newsletter({ initialSettings }) {
  const [settings, setSettings] = useState(initialSettings || null);
  const [settingsLoading, setSettingsLoading] = useState(!initialSettings);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  useEffect(() => {
    if (initialSettings !== undefined && initialSettings !== null) {
      setSettings(initialSettings);
      setSettingsLoading(false);
    }
  }, [initialSettings]);

  useEffect(() => {
    if (initialSettings) return;
    let isMounted = true;
    fetch('/api/newsletter/settings')
      .then(r => r.json())
      .then(d => {
        if (isMounted) {
          setSettings(d || {});
          setSettingsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setSettingsLoading(false);
      });
    return () => { isMounted = false; };
  }, [initialSettings]);

  if (settingsLoading) return null;
  if (!settings || settings.isEnabled === false || settings.isEnabled === 'false') return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = (email || '').trim();
    if (!trimmed) {
      toast.error(settings.invalidEmailMessage || 'Please enter a valid email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      toast.error(settings.invalidEmailMessage || 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, source: 'website-newsletter' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || settings.successMessage);
        setSubmittedSuccess(true);
        setEmail('');
      } else {
        toast.error(data.message || data.error || settings.errorMessage);
      }
    } catch (err) {
      toast.error(settings.errorMessage || 'Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const design = settings.design || {};
  const privileges = Array.isArray(settings.privileges)
    ? settings.privileges.filter(p => typeof p === 'string' && p.trim().length > 0)
    : [
        '₹2,000 Off First Order',
        'Private Previews & Access',
        'Zero Spam • Unsubscribe Anytime'
      ];

  return (
    <section
      className="py-20 sm:py-24 relative overflow-hidden transition-colors duration-300 mt-14 sm:mt-20"
      style={{ backgroundColor: design.backgroundColor || '#FAF6EF' }}
    >
      {/* Decorative ambient radial lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(212,175,55,0.08),transparent_70%)] pointer-events-none" />

      <div className="max-w-3xl mx-auto text-center px-6 relative z-10">
        {/* Diamond ornament badge */}
        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#9C6B30]/10 text-[#9C6B30] mb-4">
          <Sparkles size={16} />
        </div>

        {settings.eyebrow && (
          <div
            className="text-[11px] sm:text-xs tracking-[0.35em] uppercase mb-3 font-semibold transition-colors duration-300"
            style={{ color: design.accentColor || '#9C6B30' }}
          >
            {settings.eyebrow}
          </div>
        )}

        {settings.title && (
          <h2
            className="font-display text-3xl sm:text-4xl md:text-5xl font-light tracking-tight transition-colors duration-300"
            style={{ color: design.textColor || '#1A1A1A' }}
          >
            {settings.title}
          </h2>
        )}

        <div className="gold-line w-16 mx-auto my-5 opacity-80" />

        {settings.description && (
          <p
            className="text-xs sm:text-sm md:text-base font-light mb-8 max-w-xl mx-auto leading-relaxed transition-colors duration-300"
            style={{ color: design.textColor || '#555555' }}
          >
            {settings.description}
          </p>
        )}

        {submittedSuccess ? (
          <div className="bg-white/90 backdrop-blur-xs border border-[#9C6B30]/30 rounded-2xl p-6 sm:p-8 max-w-md mx-auto shadow-xl space-y-3 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="font-display text-xl text-neutral-900 font-medium">Welcome to the Circle</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              {settings.successMessage || 'You have successfully joined the MikuMantra Circle.'}
            </p>
            <button
              onClick={() => setSubmittedSuccess(false)}
              className="mt-2 text-[11px] font-semibold text-[#9C6B30] hover:underline uppercase tracking-wider"
            >
              Subscribe another email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto">
            <div className="relative flex-1 w-full">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder={settings.inputPlaceholder || ''}
                className="w-full border border-[#E8E8E8] rounded-full pl-11 pr-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9C6B30]/20 focus:border-[#9C6B30] disabled:opacity-60 bg-white/90 backdrop-blur-xs transition shadow-xs"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: design.buttonBackground || '#1A1A1A',
                color: design.buttonTextColor || '#FFFFFF'
              }}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full text-[11px] tracking-[0.25em] uppercase font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center min-w-[150px] shadow-md"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  <span>{settings.loadingMessage || ''}</span>
                </span>
              ) : (
                settings.buttonText || ''
              )}
            </button>
          </form>
        )}

        {/* Privilege Highlights */}
        {privileges && privileges.length > 0 && (
          <div className="mt-10 pt-6 border-t border-black/5 flex flex-wrap items-center justify-center gap-6 text-[11px] font-light text-neutral-500">
            {privileges.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="text-[#9C6B30]" style={{ color: design.accentColor || '#9C6B30' }}>✦</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

const FALLBACK_HERO = [{ title: 'The Bridal Edit', kicker: 'Wedding Collection', copy: 'Heirloom polki chokers, uncut diamond haars & maang tikkas — handcrafted over 120+ hours.', cta: 'Discover the Edit', href: '/shop?category=wedding', img: '/api/uploads/36bd7ee8-7bb1-4584-9900-7336e2396647-0e0f1045-51aa-4451-847b-b610eab258c4-wmremove-transformed.webp' }];

export default function HomePage({ initialData }) {
  const [products, setProducts] = useState(initialData?.products || []);
  const [categories, setCategories] = useState(initialData?.categories || []);
  const [collections, setCollections] = useState(initialData?.collections || []);
  const [banners, setBanners] = useState(initialData?.banners?.length ? initialData.banners : FALLBACK_HERO);
  const [transition, setTransition] = useState(initialData?.transition || 'fade');
  const [homepageCMS, setHomepageCMS] = useState(initialData?.homepageCMS || {
    homepagePromotions: [],
    assuranceSection: { enabled: true, eyebrow: 'Our Promise', title: 'The MikuMantra Assurance', description: 'Six generations of craftsmanship, ten values that never change.' },
    assuranceCards: []
  });
  const [loading, setLoading] = useState(!initialData?.products);

  // Synchronize state when initialData updates (e.g. on navigation or revalidation)
  useEffect(() => {
    if (initialData) {
      if (initialData.products) setProducts(initialData.products);
      if (initialData.categories) setCategories(initialData.categories);
      if (initialData.collections) setCollections(initialData.collections);
      if (initialData.banners?.length) setBanners(initialData.banners);
      if (initialData.transition) setTransition(initialData.transition);
      if (initialData.homepageCMS) setHomepageCMS(initialData.homepageCMS);
      setLoading(false);
    }
  }, [initialData]);

  useEffect(() => {
    // If initialData was already passed, we already have server-fresh data. Only fetch if missing.
    if (initialData) return;

    (async () => {
      try {
        const [p, c, k, b, cms] = await Promise.all([
          fetch('/api/products', { cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
          fetch('/api/categories', { cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
          fetch('/api/collections', { cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
          fetch('/api/banners', { cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
          fetch('/api/homepage-content', { cache: 'no-store' }).then(r => r.json()).catch(() => ({}))
        ]);
        if (p && Array.isArray(p.products)) setProducts(p.products);
        if (c && Array.isArray(c.categories)) setCategories(c.categories);
        if (k && Array.isArray(k.collections)) setCollections(k.collections);
        if (b && Array.isArray(b.banners)) setBanners(b.banners);
        if (b && b.transition) setTransition(b.transition);
        if (cms) {
          setHomepageCMS({
            homepagePromotions: cms.homepagePromotions || [],
            assuranceSection: cms.assuranceSection || { enabled: true, eyebrow: 'Our Promise', title: 'The MikuMantra Assurance', description: 'Six generations of craftsmanship, ten values that never change.' },
            assuranceCards: cms.assuranceCards || []
          });
        }
      } catch (err) {
        console.error('Error loading home-page references:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [initialData]);

  if (loading && !products.length && !banners.length) {
    return (
      <div className="h-[80vh] w-full flex flex-col items-center justify-center bg-white text-neutral-500">
        <span className="h-auto w-36 pb-2">
          <img src={initialData?.logo || initialData?.settings?.logo || '/logo.png'} alt="Brand Logo" className="max-h-12 object-contain mx-auto" />
        </span>
        <Loader2 className="animate-spin text-[#9C6B30] mb-2" size={26} />
      </div>
    );
  }

  return (
    <main className="bg-white text-[#333]">
      <Hero slides={banners} transitionStyle={transition} />
      <CategoryShowcaseSection initialCategories={initialData?.categories} initialSettings={initialData?.categoryShowcaseSettings} />
      <CollectionsTabs collections={collections} allProducts={products} loading={loading} />
      <OfferBanner promotions={homepageCMS.homepagePromotions} />
      <WhyUs assuranceSection={homepageCMS.assuranceSection} assuranceCards={homepageCMS.assuranceCards} />
      <SocialMediaSection initialItems={initialData?.socialMedia} initialSettings={initialData?.socialMediaSettings} />
      <Newsletter initialSettings={initialData?.newsletterSettings} />
      <RecentlyViewed />
      <CompareBar />
    </main>
  );
}
