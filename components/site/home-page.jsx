'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, ShieldCheck, Truck, RefreshCw, Sparkles, Award, Heart, ChevronLeft, ChevronRight, Instagram, Loader2,
  Check, Globe, Lock, Gift, Tag, Star, Clock, Gem
} from 'lucide-react';
import ProductCard from '@/components/site/product-card';

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
import { PRODUCTS as SEED, CATEGORIES as SEED_C, COLLECTIONS as SEED_K } from '@/lib/products';

function Hero({ slides, transitionStyle = 'fade' }) {
  const [i, setI] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  // Preload slide background images to prevent layout flash/flickering
  useEffect(() => {
    slides.forEach((s) => {
      if (s.img) {
        const img = new Image();
        img.src = s.img;
      }
    });
  }, [slides]);

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
            src={s.img}
            alt={s.title}
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

function CategoriesRow({ categories }) {
  return (
    <section className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 py-10 md:py-20">
      <SectionTitle eyebrow="Curated Categories" title="Shop by Category" sub="From everyday layering to once-in-a-lifetime heirlooms." />
      {!categories ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="animate-spin text-[#9C6B30]" size={28} />
        </div>
      ) : (
        <div className="flex flex-wrap justify-center items-center gap-3 xs:gap-4 md:gap-8">
          {categories.map((c, i) => (
            <motion.div key={c.slug} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * .06 }} className="w-[110px] xs:w-[130px] sm:w-[180px] flex-shrink-0">
              <Link href={`/shop?category=${c.slug}`} className="group block">
                <div className="relative aspect-square rounded-full overflow-hidden bg-[#FAF6EF] luxe-shadow">
                  <img src={c.img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={c.name} />
                  <div className="absolute inset-0 ring-1 ring-inset ring-[#D4AF37]/30 rounded-full" />
                </div>
                <div className="text-center mt-3 sm:mt-4"><div className="font-serif-luxe text-base sm:text-lg text-[#1A1A1A] group-hover:text-[#9C6B30] truncate">{c.name}</div><div className="text-[9px] sm:text-[10px] tracking-wider sm:tracking-[0.3em] uppercase text-neutral-400 mt-0.5 sm:mt-1">Shop Now</div></div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}

function CollectionsTabs({ collections, allProducts }) {
  const [active, setActive] = useState(collections[0]?.slug || 'trending');
  const list = allProducts.filter(p => p.collection === active).slice(0, 8);
  return (
    <section className="bg-[#FAF6EF]/40 py-12 sm:py-20">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
        <SectionTitle eyebrow="The MikuMantra Edit" title="Featured Collections" sub="Handpicked by our design house — refreshed every season." />
        <div className="flex justify-center flex-wrap gap-1.5 sm:gap-2 mb-8 sm:mb-10">{collections.map(c => (<button key={c.slug} onClick={() => setActive(c.slug)} className={`px-3.5 py-2 sm:px-5 sm:py-2.5 text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.25em] uppercase rounded-full transition-all ${active === c.slug ? 'bg-[#1A1A1A] text-white' : 'bg-white text-[#1A1A1A] border border-[#E8E8E8] hover:border-[#9C6B30]'}`}>{c.name}</button>))}</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-6 md:gap-8">{list.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}</div>
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
              <img src={b.img} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" alt={b.title} />
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

function Testimonials() {
  const t = [{ n: 'Aanya Kapoor', r: 'The Meher choker was my bridal moment. Received compliments the whole night — it truly felt like a family heirloom in the making.', c: 'Bride, Delhi' }, { n: 'Ishaan Mehta', r: 'Bought the Aureus solitaire for our anniversary. The brilliance is unreal, and the packaging felt like a Cartier boutique.', c: 'Anniversary, Mumbai' }, { n: 'Priyanka Rao', r: 'I wear the Saanvi chain every single day. Feather-light, and the shine is exactly the same six months in.', c: 'Everyday Muse, Bangalore' }];
  return (<section className="py-10 md:py-20 bg-[#1A1A1A] text-white"><div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8"><div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12"><div className="text-[10px] sm:text-[11px] tracking-[0.35em] uppercase text-[#D4AF37] mb-2 sm:mb-3">Voices from the Vault</div><h2 className="font-display text-2xl xs:text-3xl md:text-5xl font-light break-words">Loved by 10,000+ patrons</h2><div className="gold-line w-16 mx-auto my-4 sm:my-5" /></div><div className="grid md:grid-cols-3 gap-4 sm:gap-6">{t.map((x, i) => (<motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * .1 }} className="p-4 xs:p-6 sm:p-8 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur"><div className="flex gap-1 text-[#D4AF37] mb-3 sm:mb-4">{Array(5).fill(0).map((_, k) => <span key={k}>★</span>)}</div><p className="font-serif-luxe text-base sm:text-xl leading-relaxed text-white/90">&ldquo;{x.r}&rdquo;</p><div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-white/10"><div className="font-medium text-sm sm:text-base">{x.n}</div><div className="text-xs text-white/50 mt-0.5">{x.c}</div></div></motion.div>))}</div></div></section>);
}

function InstagramStrip() {
  const imgs = ['https://images.unsplash.com/photo-1651160670627-2896ddf7822f?crop=entropy&cs=srgb&fm=jpg&q=85', 'https://images.unsplash.com/photo-1685970731194-e27b477e87ba?crop=entropy&cs=srgb&fm=jpg&q=85', 'https://images.unsplash.com/photo-1622398925373-3f91b1e275f5?crop=entropy&cs=srgb&fm=jpg&q=85', 'https://images.unsplash.com/photo-1585960622850-ed33c41d6418?crop=entropy&cs=srgb&fm=jpg&q=85', 'https://images.unsplash.com/photo-1610173827043-9db50e0d8ef9?crop=entropy&cs=srgb&fm=jpg&q=85', 'https://images.unsplash.com/photo-1600685890506-593fdf55949b?crop=entropy&cs=srgb&fm=jpg&q=85'];
  return (<section className="py-12 md:py-20"><div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8"><SectionTitle eyebrow="@mikumantra.jewels" title="Follow Our World" sub="Real stories, real sparkle — tagged on Instagram." /><div className="grid grid-cols-3 md:grid-cols-6 gap-2">{imgs.map((im, i) => (<a key={i} href="#" className="relative aspect-square overflow-hidden group"><img src={im} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /><div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"><Instagram className="text-white" size={22} /></div></a>)) }</div></div></section>);
}

function Newsletter() {
  return (<section className="py-24 bg-gradient-to-br from-[#FAF6EF] via-white to-[#FAF6EF]"><div className="max-w-2xl mx-auto text-center px-6"><div className="text-[11px] tracking-[0.35em] uppercase text-[#9C6B30] mb-3">The MikuMantra Circle</div><h2 className="font-display text-4xl md:text-5xl text-[#1A1A1A] font-light">Be the first to know</h2><div className="gold-line w-16 mx-auto my-5" /><p className="text-neutral-500 font-light mb-8">New collections, private previews, and ₹2,000 off your first order.</p><form onSubmit={(e) => { e.preventDefault(); e.currentTarget.reset(); import('sonner').then(({ toast }) => toast.success('Welcome to the MikuMantra Circle')); }} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"><input required type="email" placeholder="Enter your email" className="flex-1 border border-[#E8E8E8] rounded-full px-6 py-3.5 text-sm focus:outline-none focus:border-[#9C6B30]" /><button className="bg-[#1A1A1A] text-white px-8 py-3.5 rounded-full text-[11px] tracking-[0.3em] uppercase hover:bg-[#9C6B30] transition">Subscribe</button></form></div></section>);
}

const FALLBACK_HERO = [{ title: 'The Bridal Edit', kicker: 'Wedding Collection', copy: 'Heirloom polki chokers, uncut diamond haars & maang tikkas — handcrafted over 120+ hours.', cta: 'Discover the Edit', href: '/shop?category=wedding', img: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?crop=entropy&cs=srgb&fm=jpg&q=85' }];

export default function HomePage() {
  const [products, setProducts] = useState(SEED);
  const [categories, setCategories] = useState(SEED_C);
  const [collections, setCollections] = useState(SEED_K);
  const [banners, setBanners] = useState(FALLBACK_HERO);
  const [transition, setTransition] = useState('fade');
  const [homepageCMS, setHomepageCMS] = useState({
    homepagePromotions: [],
    assuranceSection: { enabled: true, eyebrow: 'Our Promise', title: 'The MikuMantra Assurance', description: 'Six generations of craftsmanship, ten values that never change.' },
    assuranceCards: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, c, k, b, cms] = await Promise.all([
          fetch('/api/products', { cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
          fetch('/api/categories', { cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
          fetch('/api/collections', { cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
          fetch('/api/banners', { cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
          fetch('/api/homepage-content', { cache: 'no-store' }).then(r => r.json()).catch(() => ({}))
        ]);
        if (p.products?.length) setProducts(p.products);
        if (c.categories?.length) setCategories(c.categories);
        if (k.collections?.length) setCollections(k.collections);
        if (b.banners?.length) setBanners(b.banners);
        if (b.transition) setTransition(b.transition);
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
  }, []);

  if (loading) {
    return (
      <div className="h-[80vh] w-full flex flex-col items-center justify-center bg-white text-neutral-500">
        <span className="h-auto w-36 pb-2"><img src="/logo.png" alt="MikuMantra" /></span>
        <Loader2 className="animate-spin text-[#9C6B30] mb-2" size={26} />
      </div>
    );
  }

  return (
    <main className="bg-white text-[#333]">
      <Hero slides={banners} transitionStyle={transition} />
      <CategoriesRow categories={categories} />
      <CollectionsTabs collections={collections} allProducts={products} />
      <OfferBanner promotions={homepageCMS.homepagePromotions} />
      <WhyUs assuranceSection={homepageCMS.assuranceSection} assuranceCards={homepageCMS.assuranceCards} />
      <Testimonials />
      <InstagramStrip />
      <Newsletter />
      <RecentlyViewed />
      <CompareBar />
    </main>
  );
}
