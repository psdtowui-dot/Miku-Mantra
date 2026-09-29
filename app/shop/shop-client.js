'use client';
import { Suspense, useMemo, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from '@/components/site/product-card';
import CompareBar from '@/components/site/compare-bar';
import { PRODUCTS as SEED, getNormalizedSpecs, DEFAULT_PRODUCT_FILTERS } from '@/lib/products';
import { SlidersHorizontal, X, Loader2, ChevronDown } from 'lucide-react';

function ShopInner() {
  const sp = useSearchParams();
  const router = useRouter();

  const [all, setAll] = useState(SEED);
  const [loading, setLoading] = useState(false);

  // Dynamic Product Filter Groups from Backend API (initialized with default filters for immediate render)
  const [filterGroups, setFilterGroups] = useState(DEFAULT_PRODUCT_FILTERS);
  const [filterLoading, setFilterLoading] = useState(false);
  const [hasLoadedFilters, setHasLoadedFilters] = useState(false);

  // Price Range & Sort state
  const [range, setRange] = useState([0, 1000000]);
  const [sort, setSort] = useState('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [openFilters, setOpenFilters] = useState(false);

  useEffect(() => {
    if (openFilters) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [openFilters]);

  // Load products and dynamic filter config
  useEffect(() => {
    (async () => {
      try {
        const [pRes, filtersRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/product-filters')
        ]);
        if (pRes.ok) {
          const d = await pRes.json();
          if (d.products?.length) setAll(d.products);
        }
        if (filtersRes.ok) {
          const d = await filtersRes.json();
          if (d.groups?.length) {
            setFilterGroups(d.groups);
            const pg = d.groups.find(g => (g.type === 'price' || g.key === 'price') && g.enabled !== false);
            if (pg?.priceConfig) {
              const minB = pg.priceConfig.min ?? 0;
              const maxB = pg.priceConfig.max ?? 1000000;
              setRange([minB, maxB]);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load shop data:', err);
      } finally {
        setLoading(false);
        setFilterLoading(false);
        setHasLoadedFilters(true);
      }
    })();
  }, []);

  // Set URL query parameters helper
  const setParam = (key, val) => {
    const q = new URLSearchParams(sp.toString());
    if (val) {
      q.set(key, val);
    } else {
      q.delete(key);
    }
    router.push(`/shop?${q.toString()}`, { scroll: false });
  };

  // Clear All Filters helper
  const clearAll = () => {
    router.push('/shop', { scroll: false });
    const pg = (filterGroups || []).find(g => (g.type === 'price' || g.key === 'price') && g.enabled !== false);
    const minB = pg?.priceConfig?.min ?? 0;
    const maxB = pg?.priceConfig?.max ?? 1000000;
    setRange([minB, maxB]);
  };

  // Dynamic Product Filtering Engine
  const list = useMemo(() => {
    let result = [...all];

    // Read active enabled filter groups
    const enabledGroups = (filterGroups || []).filter(g => g.enabled !== false);

    if (enabledGroups.length > 0) {
      for (const group of enabledGroups) {
        const key = group.key;

        // Price Filter Handling
        if (group.type === 'price' || key === 'price') {
          result = result.filter(p => p.price >= range[0] && p.price <= range[1]);
          continue;
        }

        // Standard Options Filter Handling
        const selectedVal = sp.get(key);
        if (selectedVal) {
          const selValLower = selectedVal.trim().toLowerCase();

          result = result.filter(p => {
            // 1. Gender filter: STRICT exact match (never use substring includes because 'women' contains 'men')
            if (key === 'gender') {
              const prodGender = (p.gender || '').trim().toLowerCase();
              if (!prodGender) return false;
              return prodGender === selValLower || prodGender === 'unisex';
            }

            // 2. Category filter: STRICT exact match (handling hyphens and spaces)
            if (key === 'category') {
              const prodCat = (p.category || '').trim().toLowerCase();
              return (
                prodCat === selValLower ||
                prodCat.replace(/\s+/g, '-') === selValLower.replace(/\s+/g, '-')
              );
            }

            // 3. Collection filter: STRICT exact match
            if (key === 'collection') {
              const prodCol = (p.collection || '').trim().toLowerCase();
              return (
                prodCol === selValLower ||
                prodCol.replace(/\s+/g, '-') === selValLower.replace(/\s+/g, '-')
              );
            }

            // 4. Stone filter: handles None, Polki, Diamond, etc.
            if (key === 'stone') {
              const prodStone = (p.stone || p.stoneDetails || '').trim().toLowerCase();
              const isNone = !prodStone || prodStone === '—' || prodStone === '-' || prodStone === 'none' || prodStone === 'n/a';
              if (selValLower === 'none') {
                return isNone;
              }
              if (isNone) {
                return false;
              }
              if (prodStone === selValLower || prodStone.includes(selValLower)) return true;
              const terms = selValLower.split(/\s+/).filter(t => t.length > 2);
              if (terms.some(t => prodStone.includes(t))) return true;
              return false;
            }

            // 5. Metal filter: handles Yellow Gold, Rose Gold, White Gold, Platinum
            if (key === 'metal') {
              const prodMetal = (p.metal || p.metalComposition || '').trim().toLowerCase();
              if (!prodMetal) return false;
              return prodMetal === selValLower || prodMetal.includes(selValLower);
            }

            // 6. Generic direct property match
            const directVal = p[key];
            if (directVal !== undefined && directVal !== null) {
              const strVal = String(directVal).trim().toLowerCase();
              if (strVal === selValLower) return true;
              if (strVal.length > 10 && strVal.includes(selValLower)) return true;
            }

            // 7. Specifications array match
            const specs = getNormalizedSpecs(p);
            const matchingSpec = specs.find(s => {
              const specKey = (s.id || '').toLowerCase();
              const specLabel = (s.label || '').toLowerCase();
              return specKey === key.toLowerCase() || specLabel === (group.name || '').toLowerCase();
            });
            if (matchingSpec && matchingSpec.value) {
              const specVal = String(matchingSpec.value).trim().toLowerCase();
              if (specVal === selValLower) return true;
              if (specVal.includes(selValLower)) return true;
            }

            // 8. Fallback tags check (exact tag match)
            if (p.tags && Array.isArray(p.tags) && p.tags.some(t => String(t).trim().toLowerCase() === selValLower)) {
              return true;
            }

            return false;
          });
        }
      }
    } else {
      // Fallback filtering if dynamic filters haven't loaded yet
      const cat = sp.get('category');
      const col = sp.get('collection');
      const gen = sp.get('gender');
      if (cat) result = result.filter(p => (p.category || '').toLowerCase() === cat.toLowerCase());
      if (col) result = result.filter(p => (p.collection || '').toLowerCase() === col.toLowerCase());
      if (gen) result = result.filter(p => (p.gender || '').toLowerCase() === gen.toLowerCase() || (p.gender || '').toLowerCase() === 'unisex');
      result = result.filter(p => p.price >= range[0] && p.price <= range[1]);
    }

    // Sort order
    if (sort === 'price-asc') result.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') result.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sort === 'discount') {
      result.sort((a, b) => {
        const discA = a.mrp > a.price && a.mrp > 0 ? ((a.mrp - a.price) / a.mrp) * 100 : 0;
        const discB = b.mrp > b.price && b.mrp > 0 ? ((b.mrp - b.price) / b.mrp) * 100 : 0;
        if (discB !== discA) return discB - discA;
        const saveA = a.mrp > a.price ? a.mrp - a.price : 0;
        const saveB = b.mrp > b.price ? b.mrp - b.price : 0;
        return saveB - saveA;
      });
    }

    return result;
  }, [all, filterGroups, sp, range, sort]);

  // Page Title computation
  const activeCategory = sp.get('category');
  const activeCollection = sp.get('collection');
  const activeGender = sp.get('gender');
  const title = activeCategory
    ? activeCategory.replace('-', ' ')
    : activeCollection
      ? activeCollection.replace('-', ' ')
      : activeGender
        ? activeGender
        : 'All Jewellery';

  // Filters UI Component
  const Filters = ({ animate = false }) => {
    const listVariants = {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: { staggerChildren: 0.05, delayChildren: 0.15 }
      }
    };

    const itemVariants = {
      hidden: { opacity: 0, x: -16 },
      show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }
    };

    // Filter groups to render (sorted by order, enabled === true)
    const renderGroups = (filterGroups || [])
      .filter(g => g.enabled !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const content = (
      <>
        <div className="flex items-center justify-between mb-6">
          <div className="font-display text-2xl text-[#1A1A1A]">Filter</div>
          <button onClick={clearAll} className="text-[11px] tracking-widest uppercase text-[#9C6B30] hover:underline cursor-pointer font-medium">
            Clear all
          </button>
        </div>

        {filterLoading || (!hasLoadedFilters && renderGroups.length === 0) ? (
          <div className="py-8 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="border-t border-[#E8E8E8] py-4 space-y-2 animate-pulse">
                <div className="h-3 bg-neutral-200 rounded w-20" />
                <div className="h-4 bg-neutral-100 rounded w-32" />
                <div className="h-4 bg-neutral-100 rounded w-24" />
              </div>
            ))}
          </div>
        ) : renderGroups.length === 0 ? (
          <div className="text-xs text-neutral-400 py-6">No filter groups available</div>
        ) : (
          renderGroups.map(group => {
            // Price Filter Section
            if (group.type === 'price' || group.key === 'price') {
              const minVal = group.priceConfig?.min !== undefined ? group.priceConfig.min : 0;
              const maxVal = group.priceConfig?.max !== undefined ? group.priceConfig.max : 1000000;
              const stepVal = group.priceConfig?.step !== undefined ? group.priceConfig.step : 5000;
              const priceOptions = (group.options || []).filter(o => o.enabled !== false);
              const Element = animate ? motion.div : 'div';
              const props = animate ? { variants: itemVariants } : {};

              return (
                <Element key={group.id || group.key} {...props} className="border-t border-[#E8E8E8] py-5">
                  <div className="text-[11px] tracking-[0.3em] uppercase text-[#1A1A1A] mb-3 font-semibold">
                    {group.name}
                  </div>
                  <div className="text-xs text-neutral-500 font-mono flex justify-between items-center mb-1">
                    <span>₹{range[0].toLocaleString('en-IN')}</span>
                    <span>₹{range[1].toLocaleString('en-IN')}</span>
                  </div>
                  <input
                    type="range"
                    min={minVal}
                    max={maxVal}
                    step={stepVal}
                    value={range[1]}
                    onChange={e => setRange([range[0], +e.target.value])}
                    className="w-full mt-2 accent-[#9C6B30] cursor-pointer"
                  />
                  {priceOptions.length > 0 && (
                    <ul className="mt-3 space-y-1.5 pt-2 border-t border-neutral-100">
                      {priceOptions.map(opt => {
                        const selectedVal = sp.get(group.key);
                        const isSelected = selectedVal === opt.value;
                        return (
                          <li key={opt.id || opt.value}>
                            <button
                              onClick={() => {
                                const newSel = isSelected ? '' : opt.value;
                                setParam(group.key, newSel);
                                if (newSel && newSel.includes('-')) {
                                  const parts = newSel.split('-').map(Number);
                                  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                                    setRange([parts[0], parts[1]]);
                                  }
                                }
                              }}
                              className={`text-xs capitalize transition-colors text-left flex items-center justify-between w-full ${isSelected ? 'text-[#9C6B30] font-semibold' : 'text-neutral-600 hover:text-[#9C6B30]'
                                }`}
                            >
                              <span>{opt.name || opt.value}</span>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#9C6B30]" />}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Element>
              );
            }

            // Standard Options Filter Section
            const activeOptions = (group.options || [])
              .filter(o => o.enabled !== false)
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

            if (activeOptions.length === 0) return null;

            const selectedValue = sp.get(group.key);
            const Element = animate ? motion.div : 'div';
            const props = animate ? { variants: itemVariants } : {};

            return (
              <Element key={group.id || group.key} {...props} className="border-t border-[#E8E8E8] py-5">
                <div className="text-[11px] tracking-[0.3em] uppercase text-[#1A1A1A] mb-3 font-semibold">
                  {group.name}
                </div>
                <ul className="space-y-2">
                  {activeOptions.map(opt => {
                    const isSelected = selectedValue === opt.value;
                    return (
                      <li key={opt.id || opt.value}>
                        <button
                          onClick={() => setParam(group.key, isSelected ? '' : opt.value)}
                          className={`text-sm capitalize transition-colors text-left flex items-center justify-between w-full group ${isSelected ? 'text-[#9C6B30] font-semibold' : 'text-neutral-600 hover:text-[#9C6B30]'
                            }`}
                        >
                          <span>{opt.name || opt.value.replace('-', ' ')}</span>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#9C6B30]" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Element>
            );
          })
        )}
      </>
    );

    if (animate) {
      return (
        <motion.div variants={listVariants} initial="hidden" animate="show" className="w-full pb-20">
          {content}
        </motion.div>
      );
    }

    return (
      <aside className="w-full md:w-64 shrink-0 pb-20">
        {content}
      </aside>
    );
  };

  return (
    <main className="bg-white min-h-screen">
      {/* Header Banner */}
      <div className="bg-[#FAF6EF]/60 py-8 sm:py-12 border-b border-[#E8E8E8]">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 text-center">
          <div className="text-[10px] sm:text-[11px] tracking-[0.35em] uppercase text-[#9C6B30] mb-2">MikuMantra Collections</div>
          <h1 className="font-display text-2xl xs:text-3xl sm:text-4xl md:text-5xl capitalize font-light text-[#1A1A1A] break-words">{title}</h1>
          <div className="gold-line w-16 mx-auto my-4" />
          <div className="text-xs sm:text-sm text-neutral-500">{loading ? 'Loading…' : `${list.length} pieces`}</div>
        </div>
      </div>

      {/* Main Listing Layout */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 sm:py-10">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">
          {/* Desktop Filters Sidebar */}
          <div className="hidden lg:block sticky top-28 overflow-y-auto refine-scroll-container shrink-0 pr-2">
            <Filters />
          </div>

          {/* Mobile Filters Drawer */}
          <AnimatePresence>
            {openFilters && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="fixed inset-0 bg-black/25 backdrop-blur-xs z-50 lg:hidden"
                onClick={() => setOpenFilters(false)}
              >
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute left-0 top-0 bottom-0 w-[85vw] max-w-[320px] bg-white p-4 xs:p-6 overflow-y-auto z-50 shadow-2xl"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={() => setOpenFilters(false)}
                      className="p-1 hover:text-[#9C6B30] transition-colors"
                      aria-label="Close filters"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <Filters animate={true} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Grid Area */}
          <div className="flex-1 w-full">
            {/* Toolbar: Mobile Filters Button & Sort By Dropdown */}
            <div className="flex items-center justify-between lg:justify-end gap-2 sm:gap-4 mb-6 pb-4 border-b border-[#E8E8E8]">
              <button
                onClick={() => setOpenFilters(true)}
                className="lg:hidden flex items-center gap-1.5 xs:gap-2 text-xs xs:text-sm border border-[#E8E8E8] rounded-full px-3 xs:px-4 py-2 hover:border-[#9C6B30] transition-colors cursor-pointer shrink-0"
              >
                <SlidersHorizontal size={14} /> Filters
              </button>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-[11px] tracking-[0.25em] uppercase text-neutral-500 hidden sm:block">Sort by</span>
                <div className="relative inline-block text-left z-30">
                  <button
                    onClick={() => setSortOpen(!sortOpen)}
                    className="flex items-center justify-between gap-2 xs:gap-3 border border-[#E8E8E8] hover:border-[#9C6B30] rounded-md px-3 xs:px-4 py-2 text-xs xs:text-sm bg-white min-w-[130px] sm:min-w-[170px] text-left transition-colors focus:outline-none focus:ring-1 focus:ring-[#9C6B30] focus:border-[#9C6B30] cursor-pointer"
                  >
                    <span className="text-neutral-700 font-light truncate">
                      {sort === 'newest' && 'Newest'}
                      {sort === 'rating' && 'Highest Rated'}
                      {sort === 'price-asc' && 'Price: Low to High'}
                      {sort === 'price-desc' && 'Price: High to Low'}
                      {sort === 'discount' && 'High Discount'}
                    </span>
                    <ChevronDown size={14} className={`text-neutral-400 shrink-0 transition-transform duration-300 ${sortOpen ? 'rotate-180 text-[#9C6B30]' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {sortOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute right-0 mt-2 w-[190px] rounded-lg bg-white border border-[#E8E8E8] shadow-lg py-1.5 z-20 focus:outline-none overflow-hidden"
                        >
                          {[
                            { val: 'newest', lab: 'Newest' },
                            { val: 'rating', lab: 'Highest Rated' },
                            { val: 'price-asc', lab: 'Price: Low to High' },
                            { val: 'price-desc', lab: 'Price: High to Low' },
                            { val: 'discount', lab: 'High Discount' }
                          ].map(opt => (
                            <button
                              key={opt.val}
                              onClick={() => {
                                setSort(opt.val);
                                setSortOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-[11px] tracking-wider uppercase transition-colors flex items-center justify-between cursor-pointer ${sort === opt.val
                                ? 'bg-[#FAF6EF] text-[#9C6B30] font-semibold'
                                : 'text-neutral-600 hover:bg-neutral-50 hover:text-[#9C6B30]'
                                }`}
                            >
                              <span>{opt.lab}</span>
                              {sort === opt.val && <div className="w-1.5 h-1.5 rounded-full bg-[#9C6B30]" />}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Product Cards Grid */}
            {loading ? (
              <div className="py-24 text-center">
                <Loader2 className="animate-spin inline text-[#9C6B30]" size={24} />
              </div>
            ) : list.length === 0 ? (
              <div className="text-center py-24">
                <div className="font-serif-luxe text-2xl text-neutral-400">No pieces match your filters.</div>
                <button onClick={clearAll} className="mt-4 text-[#9C6B30] underline text-sm cursor-pointer font-medium">
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-6 md:gap-8">
                {list.map((p, i) => (
                  <ProductCard key={p.id} p={p} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <CompareBar />
    </main>
  );
}

export default function ShopClient() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#9C6B30]" /></div>}>
      <ShopInner />
    </Suspense>
  );
}
