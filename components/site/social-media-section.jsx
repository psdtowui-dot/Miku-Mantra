'use client';
import { useState, useEffect } from 'react';
import { Instagram, Facebook, Youtube, Share2, ExternalLink } from 'lucide-react';
import { DEFAULT_SOCIAL_MEDIA_ITEMS, DEFAULT_SOCIAL_MEDIA_SETTINGS } from '@/lib/site-defaults';

const PLATFORM_ICONS = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  pinterest: Share2,
  tiktok: Share2,
  other: Share2
};

export default function SocialMediaSection({ initialItems, initialSettings }) {
  const [items, setItems] = useState(
    initialItems && initialItems.length > 0 ? initialItems : DEFAULT_SOCIAL_MEDIA_ITEMS
  );
  const [settings, setSettings] = useState(
    initialSettings ? { ...DEFAULT_SOCIAL_MEDIA_SETTINGS, ...initialSettings } : DEFAULT_SOCIAL_MEDIA_SETTINGS
  );
  const [hoveredId, setHoveredId] = useState(null);

  // Synchronize state when initialItems or initialSettings change
  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setItems(initialItems);
    }
  }, [initialItems]);

  useEffect(() => {
    if (initialSettings) {
      setSettings(prev => ({ ...DEFAULT_SOCIAL_MEDIA_SETTINGS, ...initialSettings }));
    }
  }, [initialSettings]);

  // Fetch latest public social media data from API in background to ensure freshness
  useEffect(() => {
    let isMounted = true;
    fetch('/api/social-media', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          setItems(data.data);
        }
        if (data?.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
      })
      .catch(err => {
        console.warn('Could not refresh social-media from API:', err.message);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // If disabled via Admin Settings, do not render
  if (settings.showSection === false) {
    return null;
  }

  // Filter only active items and sort by displayOrder
  const activeItems = (items || [])
    .filter(item => item.isActive !== false)
    .sort((a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0))
    .slice(0, settings.maxVisible || 6);

  if (activeItems.length === 0) {
    return null;
  }

  const hoverScale = Number(settings.hoverScale) || 1.10;
  const isAnimationEnabled = settings.hoverAnimation !== false;

  return (
    <section className="pt-14 sm:pt-20 bg-[#fff6ed] overflow-hidden pb-0" aria-label="Social Media Gallery">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 text-center">
        {/* Section Header */}
        <div className="mb-4 sm:mb-8">
          <div className="text-[11px] sm:text-xs tracking-[0.35em] uppercase text-[#9C6B30] mb-2 font-medium">
            {settings.eyebrow || '@mikumantra.jewels'}
          </div>

          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] font-light tracking-tight">
            {settings.title || 'Follow Our World'}
          </h2>

          <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mx-auto my-4" />

          <p className="text-neutral-500 font-light text-xs sm:text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            {settings.subtitle || 'Real stories, real sparkle — tagged on Instagram.'}
          </p>
        </div>

        {/* Desktop Dynamic Hover Gallery (md and above) */}
        <div className="hidden md:flex items-center justify-center gap-3 lg:gap-4 pt-8 pb-20 px-2 overflow-visible">
          {activeItems.map((item) => {
            const isHovered = hoveredId === item.id;
            const isOtherHovered = hoveredId !== null && !isHovered;
            const platformKey = (item.platform || 'instagram').toLowerCase();
            const IconComponent = PLATFORM_ICONS[platformKey] || Instagram;

            return (
              <a
                key={item.id}
                href={item.url}
                target={item.openInNewTab !== false ? '_blank' : '_self'}
                rel="noopener noreferrer"
                onMouseEnter={() => isAnimationEnabled && setHoveredId(item.id)}
                onMouseLeave={() => isAnimationEnabled && setHoveredId(null)}
                style={{
                  transform: isHovered
                    ? `scale(${hoverScale})`
                    : isOtherHovered
                    ? 'scale(0.95)'
                    : 'scale(1)',
                  opacity: isOtherHovered ? 0.82 : 1,
                  zIndex: isHovered ? 25 : 10,
                  transition: 'transform 350ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 350ms ease, box-shadow 350ms ease'
                }}
                className={`group relative flex-1 min-w-0 aspect-square rounded-xl overflow-hidden cursor-pointer select-none bg-neutral-100 ${
                  isHovered
                    ? 'shadow-2xl ring-2 ring-[#D4AF37]/80'
                    : 'shadow-xs border border-neutral-200/80 hover:border-[#D4AF37]/50'
                }`}
              >
                {/* Thumbnail Image */}
                <img
                  src={item.thumbnailUrl || item.image || 'https://images.unsplash.com/photo-1651160670627-2896ddf7822f?crop=entropy&cs=srgb&fm=jpg&q=85'}
                  alt={item.title || `${item.platform || 'Social'} post`}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1651160670627-2896ddf7822f?crop=entropy&cs=srgb&fm=jpg&q=85';
                  }}
                  className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-700 ease-out"
                />

                {/* Subtle permanent platform watermark in top right corner */}
                <div
                  className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center text-white/90 transition-opacity duration-300 ${
                    isHovered ? 'opacity-0' : 'opacity-70 group-hover:opacity-100'
                  }`}
                >
                  <IconComponent size={14} />
                </div>

                {/* Hover Reveal Overlay */}
                <div
                  className={`absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10 flex flex-col justify-between p-3.5 text-left text-white transition-all duration-300 ${
                    isHovered ? 'opacity-100 backdrop-blur-[1px]' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  {/* Top Badge */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-medium bg-[#9C6B30]/80 text-[#FAF6EF]">
                      <IconComponent size={11} />
                      {item.platform || 'Instagram'}
                    </span>
                    <ExternalLink size={13} className="text-[#D4AF37]" />
                  </div>

                  {/* Bottom Caption & CTA */}
                  <div>
                    {item.title ? (
                      <p className="text-xs font-medium leading-snug line-clamp-2 text-neutral-100 mb-1">
                        {item.title}
                      </p>
                    ) : (
                      <p className="text-xs font-serif-luxe italic text-neutral-200 mb-1">
                        {item.platform || 'Instagram'} Feature
                      </p>
                    )}
                    <span className="text-[10px] tracking-wider uppercase text-[#D4AF37] font-semibold flex items-center gap-1">
                      View Post &rarr;
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        {/* Mobile & Tablet Responsive Grid (under md) */}
        <div className="grid md:hidden grid-cols-2 xs:grid-cols-3 gap-2.5 sm:gap-3 py-4">
          {activeItems.map((item) => {
            const platformKey = (item.platform || 'instagram').toLowerCase();
            const IconComponent = PLATFORM_ICONS[platformKey] || Instagram;

            return (
              <a
                key={item.id}
                href={item.url}
                target={item.openInNewTab !== false ? '_blank' : '_self'}
                rel="noopener noreferrer"
                className="group relative aspect-square rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200/80 active:scale-95 transition-transform"
              >
                <img
                  src={item.thumbnailUrl || item.image || 'https://images.unsplash.com/photo-1651160670627-2896ddf7822f?crop=entropy&cs=srgb&fm=jpg&q=85'}
                  alt={item.title || item.platform}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1651160670627-2896ddf7822f?crop=entropy&cs=srgb&fm=jpg&q=85';
                  }}
                  className="w-full h-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 flex flex-col justify-between p-2 text-white">
                  <div className="self-end w-6 h-6 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center text-white/90">
                    <IconComponent size={12} />
                  </div>
                  {item.title && (
                    <p className="text-[10px] font-medium leading-tight line-clamp-1 text-left text-neutral-100">
                      {item.title}
                    </p>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
