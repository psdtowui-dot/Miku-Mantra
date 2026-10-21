'use client';
import { Suspense, useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from '@/components/site/product-card';
import CompareBar from '@/components/site/compare-bar';
import { getNormalizedSpecs } from '@/lib/products';
import { SlidersHorizontal, X, Loader2, ChevronDown } from 'lucide-react';

function normalizeAlphaNum(str) {
  if (!str) return '';
  return String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeTokens(str) {
  if (!str) return [];
  return String(str)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function isOptionSelected(selectedValue, optValue, optName) {
  if (!selectedValue || (!optValue && !optName)) return false;
  const selectedArr = Array.isArray(selectedValue)
    ? selectedValue
    : String(selectedValue).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

  const targets = [optValue, optName].filter(Boolean).map(t => String(t).trim().toLowerCase());

  for (const s1 of selectedArr) {
    const norm1 = s1.replace(/[^a-z0-9]/g, '');
    if (!norm1) continue;

    for (const s2 of targets) {
      if (s1 === s2) return true;
      const norm2 = s2.replace(/[^a-z0-9]/g, '');
      if (norm1 === norm2) return true;
      // Singular / plural equality (e.g. bestseller / bestsellers, arrival / arrivals)
      if (norm1 + 's' === norm2 || norm2 + 's' === norm1) return true;
    }
  }

  return false;
}

function matchesSingleFilter(product, key, selectedVal, group) {
  if (!selectedVal) return true;
  const selValLower = String(selectedVal).trim().toLowerCase();
  const normSel = normalizeAlphaNum(selectedVal);
  if (!normSel) return true;

  // Search query matching across all product metadata
  if (key === 'search' || key === 'q') {
    const textPool = [
      product.name,
      product.category,
      product.subcategory,
      product.collection,
      product.metal,
      product.stone,
      product.sku,
      product.brand,
      product.badge,
      product.description,
      product.shortDesc,
      product.longDesc,
      ...(Array.isArray(product.meta) ? product.meta : []),
      ...(Array.isArray(product.tags) ? product.tags : [])
    ].filter(Boolean).map(v => String(v).toLowerCase()).join(' ');

    const textPoolNorm = normalizeAlphaNum(textPool);
    if (textPoolNorm.includes(normSel) || textPool.includes(selValLower)) return true;

    const selTokens = normalizeTokens(selValLower);
    if (selTokens.length > 0 && selTokens.every(st => textPool.includes(st))) return true;

    return false;
  }

  // 1. None / Empty query matching
  const isNoneQuery = normSel === 'none' || normSel === 'na' || normSel === 'no';

  // 2. Gather candidate values from product for this key
  const candidateValues = [];

  if (product[key] !== undefined && product[key] !== null) {
    candidateValues.push(product[key]);
  }

  // Dynamic specifications array
  const specs = getNormalizedSpecs(product);
  const keyNorm = normalizeAlphaNum(key);
  const groupNameNorm = normalizeAlphaNum(group?.name || '');

  for (const s of specs) {
    const specKey = normalizeAlphaNum(s.id || '');
    const specLabel = normalizeAlphaNum(s.label || '');
    const sVal = s.value;
    if (sVal === undefined || sVal === null) continue;

    if (
      (keyNorm && (specKey === keyNorm || specLabel === keyNorm)) ||
      (groupNameNorm && (specKey === groupNameNorm || specLabel === groupNameNorm))
    ) {
      candidateValues.push(sVal);
    }

    // Key-specific spec mappings
    if (key === 'metal') {
      if (specLabel.includes('plating') || specLabel.includes('finish') || specLabel.includes('material') || specLabel.includes('metal')) {
        candidateValues.push(sVal);
      }
    }
    if (key === 'stone') {
      if (specLabel.includes('stone') || specLabel.includes('gem') || specLabel.includes('crystal') || specLabel.includes('diamond')) {
        candidateValues.push(sVal);
      }
    }
    if (key === 'size') {
      if (specLabel.includes('size') || specLabel.includes('dimension') || specLabel.includes('length')) {
        candidateValues.push(sVal);
      }
    }
    if (key === 'type' || key === 'subcategory') {
      if (specLabel.includes('type')) {
        candidateValues.push(sVal);
      }
    }
  }

  // Related / alternate product properties
  if (key === 'collection') {
    if (product.badge) candidateValues.push(product.badge);
    if (product.bestseller || product.isBestseller) candidateValues.push('best-sellers', 'bestseller', 'bestsellers');
    if (product.newArrival || product.isNew) candidateValues.push('new-arrival', 'newarrival', 'new');
    if (product.featured) candidateValues.push('editors-choice', 'editorschoice', 'featured');
    if (Array.isArray(product.meta)) candidateValues.push(...product.meta);
  }

  if (key === 'category') {
    if (product.subcategory) candidateValues.push(product.subcategory);
    if (Array.isArray(product.categories)) candidateValues.push(...product.categories);
    if (Array.isArray(product.tags)) candidateValues.push(...product.tags);
    if (Array.isArray(product.meta)) candidateValues.push(...product.meta);
  }

  if (key === 'metal') {
    if (product.metalComposition) candidateValues.push(product.metalComposition);
    if (Array.isArray(product.meta)) {
      product.meta.forEach(m => {
        if (/gold|silver|platinum|rose|alloy|brass/i.test(m)) candidateValues.push(m);
      });
    }
  }

  if (key === 'stone') {
    if (product.stoneDetails) candidateValues.push(product.stoneDetails);
    if (Array.isArray(product.meta)) {
      product.meta.forEach(m => {
        if (/stone|crystal|diamond|pearl|emerald|ruby|polki|kundan|zircon|ad/i.test(m)) candidateValues.push(m);
      });
    }
  }

  if (key === 'gender') {
    if (product.gender) candidateValues.push(product.gender);
    if (Array.isArray(product.meta)) candidateValues.push(...product.meta);
  }

  // Handle 'None' check
  if (isNoneQuery) {
    const vals = candidateValues
      .flat()
      .map(v => String(v || '').trim().toLowerCase())
      .filter(Boolean);
    if (vals.length === 0) return true;
    return vals.every(v => v === 'none' || v === 'na' || v === 'n/a' || v === '-' || v === '—' || v === 'no');
  }

  // Gender strict equality (prevents 'women' matching 'men')
  if (key === 'gender') {
    for (const val of candidateValues.flat()) {
      if (!val) continue;
      const valStr = String(val).toLowerCase();
      const valNorm = normalizeAlphaNum(valStr);
      if (normSel === 'women' && (valNorm === 'women' || valStr.includes('women') || valStr.includes('girl'))) return true;
      if (normSel === 'men' && (valNorm === 'men' || (/\bmen\b|\bman\b|\bboys?\b/.test(valStr)))) return true;
      if (valNorm === 'unisex' || valNorm === 'both' || valNorm === 'all') return true;
    }
    return false;
  }

  // Semantic category matching
  if (key === 'category') {
    if (normSel === 'men') {
      if (product.gender === 'men' || product.gender === 'unisex') return true;
      if (Array.isArray(product.tags) && product.tags.some(t => /\bmen\b|\bman\b|\bunisex\b/i.test(t))) return true;
      return false;
    }
    if (normSel === 'women') {
      if (product.gender === 'women' || product.gender === 'unisex' || !product.gender) return true;
      if (Array.isArray(product.tags) && product.tags.some(t => /\bwomen\b|\bgirls?\b|\bunisex\b/i.test(t))) return true;
      return false;
    }

    const directCat = normalizeAlphaNum(product.category || '');
    if (directCat === normSel) return true;
    if (product.subcategory && normalizeAlphaNum(product.subcategory) === normSel) return true;
    if (Array.isArray(product.tags) && product.tags.some(t => normalizeAlphaNum(t) === normSel)) return true;

    const combinedProductInfo = [
      product.name,
      product.shortDesc,
      ...(Array.isArray(product.meta) ? product.meta : []),
      ...candidateValues
    ].join(' ').toLowerCase();

    if (normSel === 'wedding') {
      if (/\b(wedding|bridal|bride|reception|sangeet|mehendi|festiv\w*|traditional|heritage|rajwada)\b/i.test(combinedProductInfo)) {
        return true;
      }
    } else if (normSel === 'dailywear' || normSel === 'daily') {
      if (/\b(daily|minimal|everyday|casual|office|lightweight|daytime|stud|studs|delicate)\b/i.test(combinedProductInfo)) {
        return true;
      }
    } else if (normSel === 'diamond') {
      if (/\b(diamond|diamonds|\bad\b|american diamond|zircon|crystal|crystals|cz)\b/i.test(combinedProductInfo)) {
        return true;
      }
    } else if (normSel === 'gold') {
      if (/\b(gold|yellow gold|antique gold|gold finish|gold plated|gold-tone)\b/i.test(combinedProductInfo)) {
        return true;
      }
    }
  }

  // Semantic metal matching
  if (key === 'metal') {
    const combinedMetalInfo = candidateValues.flat().join(' ').toLowerCase() + ' ' + (product.name || '').toLowerCase();
    if (normSel === 'yellowgold' || normSel === 'gold') {
      if (/\b(yellow gold|antique gold|luxury gold|premium gold|gold finish|gold plated|gold-tone|gold tone|gold-toned|gold)\b/i.test(combinedMetalInfo)) {
        return true;
      }
    } else if (normSel === 'rosegold') {
      if (/\b(rose gold|pink gold)\b/i.test(combinedMetalInfo)) return true;
    } else if (normSel === 'whitegold' || normSel === 'silver') {
      if (/\b(white gold|silver|rhodium)\b/i.test(combinedMetalInfo)) return true;
    } else if (normSel === 'platinum') {
      if (/\b(platinum|rhodium)\b/i.test(combinedMetalInfo)) return true;
    }
  }

  // Semantic stone matching
  if (key === 'stone') {
    const combinedStoneInfo = candidateValues.flat().join(' ').toLowerCase() + ' ' + (product.name || '').toLowerCase();
    if (normSel === 'diamond') {
      if (/\b(diamond|diamonds|\bad\b|american diamond|crystal|crystals|zircon|cz)\b/i.test(combinedStoneInfo)) return true;
    } else if (normSel === 'polki') {
      if (/\b(polki|kundan)\b/i.test(combinedStoneInfo)) return true;
    } else if (normSel === 'emerald') {
      if (/\b(emerald|green stone|green crystal)\b/i.test(combinedStoneInfo)) return true;
    } else if (normSel === 'pearl' || normSel === 'pearls') {
      if (/\bpearls?\b/i.test(combinedStoneInfo)) return true;
    } else if (normSel === 'ruby') {
      if (/\bruby\b/i.test(combinedStoneInfo)) return true;
    } else if (normSel === 'onyx') {
      if (/\b(onyx|black crystal|black stone)\b/i.test(combinedStoneInfo)) return true;
    }
  }

  // Semantic collection matching
  if (key === 'collection') {
    if (normSel === 'bestsellers' || normSel === 'bestseller') {
      if (product.bestseller || product.isBestseller || (product.badge || '').toLowerCase().includes('bestseller')) return true;
    } else if (normSel === 'newarrival' || normSel === 'newarrivals' || normSel === 'new') {
      if (product.newArrival || product.isNew || (product.badge || '').toLowerCase().includes('new')) return true;
    } else if (normSel === 'editorschoice' || normSel === 'featured') {
      if (product.featured || (product.badge || '').toLowerCase().includes('editor') || (product.badge || '').toLowerCase().includes('pick')) return true;
    } else if (normSel === 'trending') {
      if (product.collection === 'trending' || (product.badge || '').toLowerCase().includes('trend')) return true;
    } else if (normSel === 'royalheritage') {
      const text = (product.name + ' ' + (product.meta || []).join(' ')).toLowerCase();
      if (/royal heritage|rajwada/i.test(text)) return true;
    } else if (normSel === 'bridalsets' || normSel === 'bridal') {
      const text = (product.name + ' ' + (product.meta || []).join(' ')).toLowerCase();
      if (/bridal|wedding set/i.test(text)) return true;
    } else if (normSel === 'sangeet') {
      const text = (product.name + ' ' + (product.meta || []).join(' ')).toLowerCase();
      if (/sangeet/i.test(text)) return true;
    }
  }

  // Type matching (from navbar links e.g. type=chain, type=ring)
  if (key === 'type') {
    const combinedTypeInfo = [
      product.name,
      ...candidateValues
    ].join(' ').toLowerCase();

    if (normSel === 'chain') {
      return /\b(chain|chains|link chain|gold-tone chain|necklace)\b/i.test(combinedTypeInfo);
    } else if (normSel === 'ring') {
      return /\brings?\b/i.test(product.name) || specs.some(s => s.label === 'Ring Type' || /\bring type\b/i.test(s.label));
    } else if (normSel === 'earring' || normSel === 'earrings') {
      return /\b(earring|earrings|chandbali|jhumka|stud|studs)\b/i.test(combinedTypeInfo);
    } else if (normSel === 'bracelet') {
      return /\b(bracelet|bracelets|bangle|bangles|kada|cuff)\b/i.test(combinedTypeInfo);
    }
    return false;
  }

  // All other attributes: check candidate values
  const flattened = candidateValues.flat().filter(v => v !== undefined && v !== null && v !== '');

  for (const rawVal of flattened) {
    const candStr = String(rawVal).trim().toLowerCase();
    const candNorm = normalizeAlphaNum(candStr);
    if (!candNorm) continue;

    // Direct equality
    if (candNorm === normSel || candStr === selValLower) return true;

    // Singular / plural equality
    if (candNorm + 's' === normSel || normSel + 's' === candNorm) return true;

    // Substring containment for multi-word attributes
    if (normSel !== 'men' && (candNorm.includes(normSel) || (normSel.length >= 4 && candNorm.includes(normSel)))) return true;

    // Word token matching
    const candTokens = normalizeTokens(candStr);
    const selTokens = normalizeTokens(selValLower);
    if (selTokens.length > 0 && selTokens.every(st => candTokens.includes(st))) {
      if (normSel === 'men' && (candTokens.includes('women') || candTokens.includes('woman') || candTokens.includes('girls') || candTokens.includes('girl'))) {
        // do not match women as men
      } else {
        return true;
      }
    }
    if (normSel !== 'men' && candTokens.includes(normSel)) return true;
    if (normSel === 'men' && candTokens.some(t => t === 'men' || t === 'man' || t === 'boys' || t === 'boy')) {
      if (!candTokens.includes('women') && !candTokens.includes('woman')) return true;
    }
  }

  // Fallback check against product tags
  if (product.tags && Array.isArray(product.tags)) {
    if (product.tags.some(t => {
      const tNorm = normalizeAlphaNum(t);
      return tNorm === normSel || String(t).trim().toLowerCase() === selValLower;
    })) {
      return true;
    }
  }

  return false;
}

function matchesFilterValue(product, key, selectedVal, group) {
  if (!selectedVal) return true;
  if (typeof selectedVal === 'string' && selectedVal.includes(',')) {
    const parts = selectedVal.split(',').map(s => s.trim()).filter(Boolean);
    return parts.some(part => matchesSingleFilter(product, key, part, group));
  }
  if (Array.isArray(selectedVal)) {
    return selectedVal.some(part => matchesSingleFilter(product, key, part, group));
  }
  return matchesSingleFilter(product, key, selectedVal, group);
}

function ShopInner({ initialProducts, initialFilterGroups = [] }) {
  const sp = useSearchParams();

  const [all, setAll] = useState(Array.isArray(initialProducts) ? initialProducts : []);
  const [loading, setLoading] = useState(!Array.isArray(initialProducts) || initialProducts.length === 0);

  // Dynamic Product Filter Groups initialized immediately from server-side prefetch (0ms delay)
  const hasServerFilters = Array.isArray(initialFilterGroups) && initialFilterGroups.length > 0;
  const [filterGroups, setFilterGroups] = useState(hasServerFilters ? initialFilterGroups : []);
  const [filterLoading, setFilterLoading] = useState(!hasServerFilters);
  const [hasLoadedFilters, setHasLoadedFilters] = useState(hasServerFilters);

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

  // Only fetch client-side if data was not provided by SSR
  useEffect(() => {
    const needProducts = !Array.isArray(initialProducts) || initialProducts.length === 0;
    const needFilters = !hasServerFilters;
    if (!needProducts && !needFilters) return;

    let active = true;
    (async () => {
      try {
        const promises = [];
        if (needProducts) promises.push(fetch('/api/products').then(r => r.ok ? r.json() : null));
        if (needFilters) promises.push(fetch('/api/product-filters').then(r => r.ok ? r.json() : null));

        const results = await Promise.all(promises);
        if (!active) return;

        let resIdx = 0;
        if (needProducts) {
          const d = results[resIdx++];
          if (d && Array.isArray(d.products)) {
            const activeOnly = d.products.filter(
              p => p && p.active !== false && p.isDemoProduct !== true && p.status !== 'deleted' && p.status !== 'inactive' && p.status !== 'archived'
            );
            setAll(activeOnly);
          }
        }
        if (needFilters) {
          const d = results[resIdx++];
          if (d && d.groups?.length) {
            setFilterGroups(d.groups);
          }
        }
      } catch (err) {
        console.error('Failed to load shop data:', err);
      } finally {
        if (active) {
          setLoading(false);
          setFilterLoading(false);
          setHasLoadedFilters(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [hasServerFilters, initialProducts]);

  // Derive dynamic filter groups from products if backend filter groups are empty
  const activeFilterGroups = useMemo(() => {
    if (filterGroups && filterGroups.length > 0) {
      return filterGroups;
    }
    if (!hasLoadedFilters || all.length === 0) {
      return [];
    }
    const derived = [];

    // Category
    const cats = [...new Set(all.map(p => p.category).filter(Boolean))];
    if (cats.length > 0) {
      derived.push({
        id: 'derived-category',
        name: 'Category',
        key: 'category',
        type: 'options',
        enabled: true,
        order: 0,
        options: cats.map((c, i) => ({
          id: `opt-cat-${c}`,
          name: c.replace(/[-_]/g, ' '),
          value: c,
          enabled: true,
          order: i
        }))
      });
    }

    // Gender
    const genders = [...new Set(all.map(p => p.gender).filter(Boolean).filter(g => g !== 'unisex'))];
    if (genders.length > 0) {
      derived.push({
        id: 'derived-gender',
        name: 'Gender',
        key: 'gender',
        type: 'options',
        enabled: true,
        order: 1,
        options: genders.map((g, i) => ({
          id: `opt-gen-${g}`,
          name: g.replace(/[-_]/g, ' '),
          value: g,
          enabled: true,
          order: i
        }))
      });
    }

    // Collection
    const cols = [...new Set(all.map(p => p.collection).filter(Boolean))];
    if (cols.length > 0) {
      derived.push({
        id: 'derived-collection',
        name: 'Collection',
        key: 'collection',
        type: 'options',
        enabled: true,
        order: 2,
        options: cols.map((c, i) => ({
          id: `opt-col-${c}`,
          name: c.replace(/[-_]/g, ' '),
          value: c,
          enabled: true,
          order: i
        }))
      });
    }

    // Price
    const prices = all.map(p => p.price || 0).filter(p => p > 0);
    const maxP = prices.length ? Math.max(...prices) : 1000000;
    derived.push({
      id: 'derived-price',
      name: 'Price',
      key: 'price',
      type: 'price',
      enabled: true,
      order: 3,
      priceConfig: { min: 0, max: Math.ceil(maxP / 10000) * 10000, step: 5000 },
      options: []
    });

    return derived;
  }, [filterGroups, hasLoadedFilters, all]);

  // Helper to extract clean dictionary from URLSearchParams or query string
  const getParamsMap = (searchParams) => {
    const params = {};
    if (!searchParams) return params;
    const entries = typeof searchParams.entries === 'function'
      ? searchParams.entries()
      : new URLSearchParams(searchParams).entries();
    for (const [k, v] of entries) {
      if (v) params[k] = v;
    }
    return params;
  };

  const [activeParams, setActiveParams] = useState(() => getParamsMap(sp));

  // Sync state if navigation occurs from outside (e.g. navbar links)
  useEffect(() => {
    setActiveParams(getParamsMap(sp));
  }, [sp]);

  // Sync state on browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setActiveParams(getParamsMap(new URLSearchParams(window.location.search)));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const updateUrl = (paramsObj) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(paramsObj)) {
      if (v !== undefined && v !== null && v !== '') {
        q.set(k, String(v));
      }
    }
    const queryString = q.toString();
    const newUrl = queryString ? `/shop?${queryString}` : '/shop';
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', newUrl);
    }
  };

  const [userChangedPrice, setUserChangedPrice] = useState(false);

  // Sync activeParams with dynamic Range and Sort states
  useEffect(() => {
    const sortParam = activeParams.sort;
    if (sortParam && ['newest', 'rating', 'price-asc', 'price-desc', 'discount'].includes(sortParam)) {
      setSort(sortParam);
    }

    const minParam = activeParams.min;
    const maxParam = activeParams.max;
    const priceParam = activeParams.price;

    const pg = (activeFilterGroups || []).find(g => (g.type === 'price' || g.type === 'range' || g.key === 'price') && g.enabled !== false);
    const minBound = pg?.priceConfig?.min != null ? Number(pg.priceConfig.min) : (pg?.min != null ? Number(pg.min) : 0);
    const maxBound = pg?.priceConfig?.max != null ? Number(pg.priceConfig.max) : (pg?.max != null ? Number(pg.max) : (all.length ? Math.max(...all.map(p => p.price || 0)) : 1000000));

    if (minParam != null || maxParam != null) {
      const minVal = minParam != null ? Number(minParam) : minBound;
      const maxVal = maxParam != null ? Number(maxParam) : maxBound;
      if (!isNaN(minVal) && !isNaN(maxVal)) {
        setRange([minVal, maxVal]);
        return;
      }
    }

    if (priceParam) {
      if (priceParam.includes('-')) {
        const parts = priceParam.split('-').map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          setRange([parts[0], parts[1]]);
          return;
        }
      } else {
        const num = Number(priceParam);
        if (!isNaN(num)) {
          setRange([minBound, num]);
          return;
        }
      }
    }

    // Default range when no price query param is present
    setRange([minBound, maxBound]);
  }, [activeParams, activeFilterGroups, all]);

  // Set URL query parameters helper - runs fully client side with replaceState (0ms buffering)
  const setParam = (key, val) => {
    setActiveParams(prev => {
      const next = { ...prev };
      if (val) {
        next[key] = val;
      } else {
        delete next[key];
        if (key === 'price') {
          delete next.min;
          delete next.max;
        }
      }
      updateUrl(next);
      return next;
    });
  };

  // Toggle filter option helper - supports multi-select or single select
  const toggleParam = (key, val) => {
    setActiveParams(prev => {
      const next = { ...prev };
      const current = next[key];
      if (!current) {
        next[key] = val;
      } else {
        const parts = current.split(',').map(s => s.trim()).filter(Boolean);
        const exists = parts.some(p => isOptionSelected(p, val, val));
        if (exists) {
          const remaining = parts.filter(p => !isOptionSelected(p, val, val));
          if (remaining.length > 0) {
            next[key] = remaining.join(',');
          } else {
            delete next[key];
          }
        } else {
          next[key] = [...parts, val].join(',');
        }
      }
      updateUrl(next);
      return next;
    });
  };

  // Remove specific active filter pill
  const removeFilterParam = (key, valToRemove) => {
    setActiveParams(prev => {
      const next = { ...prev };
      if (!valToRemove || key === 'min' || key === 'max' || key === 'price' || key === 'search' || key === 'q') {
        delete next[key];
        if (key === 'price' || key === 'min' || key === 'max') {
          delete next.min;
          delete next.max;
          delete next.price;
          setUserChangedPrice(false);
          const pg = (activeFilterGroups || []).find(g => (g.type === 'price' || g.type === 'range' || g.key === 'price') && g.enabled !== false);
          const minB = pg?.priceConfig?.min != null ? Number(pg.priceConfig.min) : 0;
          const maxB = pg?.priceConfig?.max != null ? Number(pg.priceConfig.max) : (all.length ? Math.max(...all.map(p => p.price || 0)) : 1000000);
          setRange([minB, maxB]);
        }
      } else {
        const current = next[key];
        if (current) {
          const parts = current.split(',').map(s => s.trim()).filter(Boolean);
          const remaining = parts.filter(p => !isOptionSelected(p, valToRemove, valToRemove));
          if (remaining.length > 0) {
            next[key] = remaining.join(',');
          } else {
            delete next[key];
          }
        }
      }
      updateUrl(next);
      return next;
    });
  };

  // Clear All Filters helper - runs fully client side with replaceState
  const clearAll = () => {
    setActiveParams({});
    setUserChangedPrice(false);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/shop');
    }
    const pg = (activeFilterGroups || []).find(g => (g.type === 'price' || g.type === 'range' || g.key === 'price') && g.enabled !== false);
    const minB = pg?.priceConfig?.min != null ? Number(pg.priceConfig.min) : 0;
    const maxB = pg?.priceConfig?.max != null ? Number(pg.priceConfig.max) : (all.length ? Math.max(...all.map(p => p.price || 0)) : 1000000);
    setRange([minB, maxB]);
    setSort('newest');
  };

  // Debounced URL sync when user slides price range (250ms debounce)
  useEffect(() => {
    if (!userChangedPrice) return;
    const timer = setTimeout(() => {
      const pg = (activeFilterGroups || []).find(g => (g.type === 'price' || g.type === 'range' || g.key === 'price') && g.enabled !== false);
      const minBound = pg?.priceConfig?.min != null ? Number(pg.priceConfig.min) : (pg?.min != null ? Number(pg.min) : 0);
      const maxBound = pg?.priceConfig?.max != null ? Number(pg.priceConfig.max) : (pg?.max != null ? Number(pg.max) : (all.length ? Math.max(...all.map(p => p.price || 0)) : 1000000));

      if (range[0] !== minBound || range[1] !== maxBound) {
        setActiveParams(prev => {
          if (prev.min === String(range[0]) && prev.max === String(range[1])) return prev;
          const next = { ...prev, min: String(range[0]), max: String(range[1]) };
          delete next.price;
          updateUrl(next);
          return next;
        });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [range, userChangedPrice, activeFilterGroups, all]);

  // Fully dynamic product filtering engine
  const list = useMemo(() => {
    // Strictly filter out any inactive, demo, or deleted products
    let result = (all || []).filter(
      p => p && p.active !== false && p.isDemoProduct !== true && p.status !== 'deleted' && p.status !== 'inactive' && p.status !== 'archived'
    );

    const enabledGroups = (activeFilterGroups || []).filter(g => g.enabled !== false);
    const disabledKeys = new Set(
      (activeFilterGroups || [])
        .filter(g => g.enabled === false)
        .map(g => g.key)
    );
    const handledKeys = new Set();

    // 1. Apply configured filter groups
    if (enabledGroups.length > 0) {
      for (const group of enabledGroups) {
        const key = group.key;
        handledKeys.add(key);

        // Price Filter Handling
        if (group.type === 'price' || group.type === 'range' || key === 'price') {
          result = result.filter(p => (p.price || 0) >= range[0] && (p.price || 0) <= range[1]);
          continue;
        }

        // Standard Options Filter Handling
        const selectedVal = activeParams[key];
        if (selectedVal) {
          result = result.filter(p => matchesFilterValue(p, key, selectedVal, group));
        }
      }
    }

    // 2. Generic fallback for any other query param
    const reservedParams = new Set(['sort', 'page', 'min', 'max', 'price']);
    for (const [paramKey, paramVal] of Object.entries(activeParams)) {
      if (reservedParams.has(paramKey) || handledKeys.has(paramKey) || disabledKeys.has(paramKey)) {
        continue;
      }
      if (paramVal) {
        result = result.filter(p => matchesFilterValue(p, paramKey, paramVal));
      }
    }

    // Sort order
    if (sort === 'price-asc') result.sort((a, b) => (a.price || 0) - (b.price || 0));
    else if (sort === 'price-desc') result.sort((a, b) => (b.price || 0) - (a.price || 0));
    else if (sort === 'rating') {
      result.sort((a, b) => {
        const rDiff = (b.rating || 0) - (a.rating || 0);
        if (rDiff !== 0) return rDiff;
        return (b.reviews || 0) - (a.reviews || 0);
      });
    } else if (sort === 'discount') {
      result.sort((a, b) => {
        const discA = a.mrp > a.price && a.mrp > 0 ? ((a.mrp - a.price) / a.mrp) * 100 : 0;
        const discB = b.mrp > b.price && b.mrp > 0 ? ((b.mrp - b.price) / b.mrp) * 100 : 0;
        if (discB !== discA) return discB - discA;
        const saveA = a.mrp > a.price ? a.mrp - a.price : 0;
        const saveB = b.mrp > b.price ? b.mrp - b.price : 0;
        return saveB - saveA;
      });
    } else {
      // Default: newest
      result.sort((a, b) => {
        const aNew = (a.collection === 'new-arrival' || (a.badge || '').toLowerCase().includes('new')) ? 1 : 0;
        const bNew = (b.collection === 'new-arrival' || (b.badge || '').toLowerCase().includes('new')) ? 1 : 0;
        return bNew - aNew;
      });
    }

    return result;
  }, [all, activeFilterGroups, activeParams, range, sort]);

  // Dynamic Page Title computation
  const title = useMemo(() => {
    const sQuery = activeParams.search || activeParams.q;
    if (sQuery) {
      return `Search: "${sQuery}"`;
    }

    const titleParts = [];
    const priorityKeys = ['gender', 'collection', 'category', 'metal', 'stone', 'type'];
    for (const key of priorityKeys) {
      const val = activeParams[key];
      if (!val) continue;

      const group = (activeFilterGroups || []).find(g => g.key === key);
      const parts = String(val).split(',').map(s => s.trim()).filter(Boolean);
      for (const part of parts) {
        const opt = group?.options?.find(o => isOptionSelected(part, o.value, o.name));
        const name = opt?.name || part.replace(/[-_]/g, ' ');
        if (key === 'gender') {
          titleParts.push(`${name}'s`);
        } else {
          titleParts.push(name);
        }
      }
    }

    if (titleParts.length > 0) {
      if (titleParts.length === 1 && activeParams.collection && !activeParams.gender && !activeParams.category) {
        return titleParts[0];
      }
      const joined = titleParts.join(' ');
      return joined.toLowerCase().includes('jewellery') ? joined : `${joined} Jewellery`;
    }

    for (const [key, val] of Object.entries(activeParams)) {
      if (['sort', 'page', 'min', 'max', 'price'].includes(key)) continue;
      if (val) {
        return `${val.replace(/[-_]/g, ' ')} Jewellery`;
      }
    }

    return 'All Jewellery';
  }, [activeFilterGroups, activeParams]);

  // Active Filter Pills computation
  const activePills = useMemo(() => {
    const pills = [];
    const reserved = new Set(['sort', 'page']);

    // Price pill
    const pg = (activeFilterGroups || []).find(g => (g.type === 'price' || g.type === 'range' || g.key === 'price') && g.enabled !== false);
    const minB = pg?.priceConfig?.min != null ? Number(pg.priceConfig.min) : 0;
    const maxB = pg?.priceConfig?.max != null ? Number(pg.priceConfig.max) : (all.length ? Math.max(...all.map(p => p.price || 0)) : 1000000);
    const hasPriceParam = activeParams.min != null || activeParams.max != null || activeParams.price != null;
    const isPriceDifferent = (range[0] > minB) || (range[1] < maxB);

    if (hasPriceParam || isPriceDifferent) {
      pills.push({
        key: 'price',
        val: 'price',
        label: `₹${range[0].toLocaleString('en-IN')} – ₹${range[1].toLocaleString('en-IN')}`,
        groupName: 'Price'
      });
    }

    // Search pill
    if (activeParams.search || activeParams.q) {
      const q = activeParams.search || activeParams.q;
      pills.push({
        key: activeParams.search ? 'search' : 'q',
        val: q,
        label: `"${q}"`,
        groupName: 'Search'
      });
    }

    // Group / Option pills
    for (const [key, rawVal] of Object.entries(activeParams)) {
      if (reserved.has(key) || key === 'min' || key === 'max' || key === 'price' || key === 'search' || key === 'q') continue;
      if (!rawVal) continue;

      const group = (activeFilterGroups || []).find(g => g.key === key);
      const groupName = group?.name || key.charAt(0).toUpperCase() + key.slice(1);
      const parts = String(rawVal).split(',').map(s => s.trim()).filter(Boolean);

      for (const part of parts) {
        const opt = group?.options?.find(o => isOptionSelected(part, o.value, o.name));
        const optLabel = opt?.name || part.replace(/[-_]/g, ' ');
        pills.push({
          key,
          val: part,
          label: optLabel,
          groupName
        });
      }
    }

    return pills;
  }, [activeParams, activeFilterGroups, range, all]);

  // Filters UI Component - 100% Dynamic rendering based on backend state
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
    const renderGroups = (activeFilterGroups || [])
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
            // Price / Range Filter Section
            if (group.type === 'price' || group.type === 'range' || group.key === 'price') {
              const minVal = group.priceConfig?.min != null ? Number(group.priceConfig.min) : (group.min != null ? Number(group.min) : 0);
              const maxVal = group.priceConfig?.max != null ? Number(group.priceConfig.max) : (group.max != null ? Number(group.max) : (all.length ? Math.max(...all.map(p => p.price || 0)) : 1000000));
              const stepVal = group.priceConfig?.step != null ? Number(group.priceConfig.step) : (group.step != null ? Number(group.step) : 5000);
              const priceOptions = (group.options || []).filter(o => o.enabled !== false);
              const Element = animate ? motion.div : 'div';
              const props = animate ? { variants: itemVariants } : {};

              const currentMax = Math.min(Math.max(range[1], minVal), maxVal);

              return (
                <Element key={group.id || group.key} {...props} className="border-t border-[#E8E8E8] py-5">
                  <div className="text-[11px] tracking-[0.3em] uppercase text-[#1A1A1A] mb-3 font-semibold">
                    {group.name}
                  </div>
                  <div className="text-xs text-neutral-500 font-mono flex justify-between items-center mb-1">
                    <span>₹{range[0].toLocaleString('en-IN')}</span>
                    <span>₹{currentMax.toLocaleString('en-IN')}</span>
                  </div>
                  <input
                    type="range"
                    min={minVal}
                    max={maxVal}
                    step={stepVal}
                    value={currentMax}
                    onChange={e => {
                      setUserChangedPrice(true);
                      const newMax = +e.target.value;
                      setRange([range[0], newMax]);
                    }}
                    className="w-full mt-2 accent-[#9C6B30] cursor-pointer"
                  />
                  {priceOptions.length > 0 && (
                    <ul className="mt-3 space-y-1.5 pt-2 border-t border-neutral-100">
                      {priceOptions.map(opt => {
                        const selectedVal = activeParams[group.key];
                        const isSelected = isOptionSelected(selectedVal, opt.value, opt.name);
                        return (
                          <li key={opt.id || opt.value}>
                            <button
                              onClick={() => {
                                setUserChangedPrice(false);
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

            const selectedValue = activeParams[group.key];
            const Element = animate ? motion.div : 'div';
            const props = animate ? { variants: itemVariants } : {};

            return (
              <Element key={group.id || group.key} {...props} className="border-t border-[#E8E8E8] py-5">
                <div className="text-[11px] tracking-[0.3em] uppercase text-[#1A1A1A] mb-3 font-semibold">
                  {group.name}
                </div>
                <ul className="space-y-2">
                  {activeOptions.map(opt => {
                    const isSelected = isOptionSelected(selectedValue, opt.value, opt.name);
                    return (
                      <li key={opt.id || opt.value}>
                        <button
                          onClick={() => toggleParam(group.key, opt.value)}
                          className={`text-sm capitalize transition-colors text-left flex items-center justify-between w-full group ${isSelected ? 'text-[#9C6B30] font-semibold' : 'text-neutral-600 hover:text-[#9C6B30]'
                            }`}
                        >
                          <span>{opt.name || opt.value.replace(/[-_]/g, ' ')}</span>
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
                                setParam('sort', opt.val === 'newest' ? '' : opt.val);
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

            {/* Active Filter Pills Bar */}
            {activePills.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-6 p-3 bg-[#FAF6EF]/60 rounded-lg border border-[#E8E8E8]/70">
                <span className="text-[11px] tracking-wider uppercase text-neutral-500 font-medium mr-1">
                  Active Filters ({activePills.length}):
                </span>
                {activePills.map((pill, idx) => (
                  <span
                    key={`${pill.key}-${pill.val}-${idx}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-white border border-[#9C6B30]/30 text-[#1A1A1A] shadow-xs group"
                  >
                    <span className="text-neutral-500 text-[11px] font-medium">{pill.groupName}:</span>
                    <span className="font-semibold text-[#9C6B30] capitalize">{pill.label}</span>
                    <button
                      onClick={() => removeFilterParam(pill.key, pill.val)}
                      className="hover:text-red-600 text-neutral-400 p-0.5 ml-0.5 cursor-pointer rounded-full transition-colors"
                      aria-label={`Remove filter ${pill.label}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <button
                  onClick={clearAll}
                  className="text-[11px] tracking-wider uppercase text-[#9C6B30] hover:underline font-semibold ml-auto cursor-pointer"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Product Cards Grid */}
            {loading && all.length === 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-6 md:gap-8">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse space-y-3">
                    <div className="rounded-xl bg-[#FAF6EF] aspect-[4/5] w-full" />
                    <div className="h-4 bg-neutral-100 rounded w-3/4 mx-auto" />
                    <div className="h-3 bg-neutral-100 rounded w-1/2 mx-auto" />
                  </div>
                ))}
              </div>
            ) : list.length === 0 ? (
              <div className="text-center py-20 px-4">
                <div className="font-serif-luxe text-2xl sm:text-3xl text-neutral-800 font-medium">Product not found</div>
                <p className="text-sm text-neutral-500 mt-2 max-w-md mx-auto">
                  {activeParams.search || activeParams.q
                    ? `We couldn't find any products matching "${activeParams.search || activeParams.q}". Try checking for spelling errors or searching with other keywords.`
                    : 'We could not find any products matching your selected criteria.'}
                </p>
                <button
                  onClick={clearAll}
                  className="mt-6 inline-flex items-center justify-center px-6 py-2.5 text-xs uppercase tracking-widest font-semibold border border-[#9C6B30] text-[#9C6B30] hover:bg-[#9C6B30] hover:text-white transition-colors cursor-pointer"
                >
                  {activeParams.search || activeParams.q ? 'Clear Search & Filters' : 'Clear Filters'}
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

export default function ShopClient({ initialProducts = [], initialFilterGroups = [] }) {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#9C6B30]" /></div>}>
      <ShopInner initialProducts={initialProducts} initialFilterGroups={initialFilterGroups} />
    </Suspense>
  );
}
