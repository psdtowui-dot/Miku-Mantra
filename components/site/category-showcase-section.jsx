'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { DEFAULT_CATEGORY_SHOWCASE_SETTINGS } from '@/lib/site-defaults';

export default function CategoryShowcaseSection({ initialCategories, initialSettings }) {
  const [categories, setCategories] = useState(initialCategories || []);
  const [settings, setSettings] = useState(
    initialSettings ? { ...DEFAULT_CATEGORY_SHOWCASE_SETTINGS, ...initialSettings } : DEFAULT_CATEGORY_SHOWCASE_SETTINGS
  );
  const [hoveredId, setHoveredId] = useState(null);

  // Client-side fetch to ensure categories and settings are always fresh and responsive
  useEffect(() => {
    let isMounted = true;
    fetch('/api/categories', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data?.categories && Array.isArray(data.categories)) {
          setCategories(data.categories);
        } else if (data?.data?.categories && Array.isArray(data.data.categories)) {
          setCategories(data.data.categories);
        }
        if (data?.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        } else if (data?.data?.settings) {
          setSettings(prev => ({ ...prev, ...data.data.settings }));
        }
      })
      .catch(err => {
        console.warn('Could not refresh category showcase from API:', err.message);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Section visibility toggle
  if (settings.sectionEnabled === false) {
    return null;
  }

  // Filter only active categories & sort by displayOrder
  const activeCategories = (categories || [])
    .filter(c => c.isActive !== false && c.active !== false && c.enabled !== false)
    .sort((a, b) => (Number(a.order ?? a.displayOrder ?? 0) - Number(b.order ?? b.displayOrder ?? 0)));

  if (activeCategories.length === 0) {
    return null;
  }

  const isHoverEnabled = settings.hoverEnabled !== false;
  const hoverScale = Number(settings.hoverScale) || 1.10;
  const otherItemsScale = Number(settings.otherItemsScale) || 0.95;
  const transitionDuration = Number(settings.transitionDuration) || 300;
  const hoverOpacity = Number(settings.hoverOpacity) !== undefined ? Number(settings.hoverOpacity) : 1.0;
  const imageHoverEffect = settings.imageHoverEffect || 'zoom';

  return (
    <section className="py-12 sm:py-16 md:py-20 bg-white overflow-hidden" aria-label="Shop by Category">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 text-center">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          {settings.eyebrow && (
            <div className="text-[10px] sm:text-[20px] tracking-[0.35em] uppercase text-[#9C6B30] mb-2 sm:mb-3 font-medium">
              {settings.eyebrow}
            </div>
          )}
          {settings.title && (
            <h2 className="font-display text-2xl xs:text-3xl md:text-5xl text-[#1A1A1A] font-light break-words">
              {settings.title}
            </h2>
          )}
          <div className="gold-line w-16 mx-auto my-4 sm:my-5" />
          {settings.subtitle && (
            <p className="text-xs sm:text-base text-neutral-500 font-light">
              {settings.subtitle}
            </p>
          )}
        </div>

        {/* Dynamic Category Circle Gallery with interactive hover */}
        <div className="flex flex-wrap justify-center items-start gap-4 xs:gap-6 md:gap-8 lg:gap-10 py-4 px-2 overflow-visible">
          {activeCategories.map((c, i) => {
            const isHovered = isHoverEnabled && hoveredId === c.id;
            const isOtherHovered = isHoverEnabled && hoveredId !== null && !isHovered;
            const categoryUrl = c.link || `/shop?category=${c.slug}`;
            const buttonLabel = c.buttonText || settings.buttonText || 'SHOP NOW';

            return (
              <motion.div
                key={c.id || c.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="w-[110px] xs:w-[130px] sm:w-[160px] md:w-[170px] flex-shrink-0"
              >
                <Link
                  href={categoryUrl}
                  target={c.openInNewTab ? '_blank' : '_self'}
                  rel={c.openInNewTab ? 'noopener noreferrer' : undefined}
                  onMouseEnter={() => isHoverEnabled && setHoveredId(c.id)}
                  onMouseLeave={() => isHoverEnabled && setHoveredId(null)}
                  className="group block select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9C6B30] focus-visible:ring-offset-2 rounded-full"
                >
                  {/* Category Circle Container with Hover Scale */}
                  <div
                    style={{
                      transform: isHovered
                        ? `scale(${hoverScale})`
                        : isOtherHovered
                        ? `scale(${otherItemsScale})`
                        : 'scale(1)',
                      opacity: isOtherHovered ? hoverOpacity : 1,
                      transition: `transform ${transitionDuration}ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity ${transitionDuration}ms ease, box-shadow ${transitionDuration}ms ease`,
                      zIndex: isHovered ? 20 : 1
                    }}
                    className={`relative aspect-square rounded-full overflow-hidden bg-[#FAF6EF] transition-all duration-300 ${
                      settings.hoverShadow && isHovered
                        ? 'shadow-2xl'
                        : 'luxe-shadow'
                    } ${
                      settings.hoverBorder !== false
                        ? isHovered
                          ? 'ring-2 ring-[#D4AF37]'
                          : 'ring-1 ring-inset ring-[#D4AF37]/30'
                        : 'ring-1 ring-inset ring-neutral-200/60'
                    }`}
                  >
                    {/* Category Image */}
                    <img
                      src={c.img || c.imageUrl || '/logo.png'}
                      alt={c.name}
                      loading="lazy"
                      className={`w-full h-full object-cover select-none pointer-events-none transition-all duration-500 ease-out ${
                        imageHoverEffect === 'zoom'
                          ? isHovered ? 'scale-110' : 'scale-100'
                          : imageHoverEffect === 'scale'
                          ? isHovered ? 'scale-105' : 'scale-100'
                          : imageHoverEffect === 'brightness'
                          ? isHovered ? 'brightness-110' : 'brightness-100'
                          : ''
                      }`}
                      onError={(e) => {
                        if (e.target.src !== window.location.origin + '/logo.png') {
                          e.target.src = '/logo.png';
                        }
                      }}
                    />

                    {/* Optional Hover Overlay */}
                    {settings.hoverOverlay && (
                      <div
                        className={`absolute inset-0 bg-[#9C6B30]/15 transition-opacity duration-300 pointer-events-none ${
                          isHovered ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                    )}
                  </div>

                  {/* Category Name & Action Button */}
                  <div className="text-center mt-3 sm:mt-4">
                    <div
                      className={`font-serif-luxe text-base sm:text-lg transition-colors duration-300 truncate ${
                        isHovered ? 'text-[#9C6B30]' : 'text-[#1A1A1A] group-hover:text-[#9C6B30]'
                      }`}
                    >
                      {c.name}
                    </div>
                    <div
                      className={`text-[9px] sm:text-[10px] tracking-wider sm:tracking-[0.28em] uppercase transition-colors duration-300 mt-0.5 sm:mt-1 font-medium ${
                        isHovered ? 'text-[#9C6B30]' : 'text-neutral-400 group-hover:text-[#9C6B30]'
                      }`}
                    >
                      {buttonLabel}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
