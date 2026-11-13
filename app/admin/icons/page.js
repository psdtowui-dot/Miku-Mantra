'use client';

import { useState, useMemo } from 'react';
import {
  Icon,
  getIconsByCategory,
  getAvailableIconNames,
} from '@/packages/global-icon-library';
import {
  Search,
  Copy,
  Check,
  Sparkles,
  Sliders,
  Palette,
  Maximize2,
  Code,
  BookOpen,
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORY_LABELS = {
  all: 'All Icons',
  navigation: 'Navigation',
  ecommerce: 'E-Commerce',
  payment: 'Payment',
  account: 'Account & User',
  admin: 'Admin & UI',
  social: 'Social & Media',
  status: 'Status & Badges',
  actions: 'Actions & Tools',
  custom: 'Custom & Brand SVGs'
};

const COLOR_PRESETS = [
  { name: 'Default', value: 'currentColor', bg: 'bg-stone-500' },
  { name: 'Luxe Gold', value: '#D4AF37', bg: 'bg-[#D4AF37]' },
  { name: 'Heritage Bronze', value: '#9C6B30', bg: 'bg-[#9C6B30]' },
  { name: 'Emerald', value: '#10B981', bg: 'bg-emerald-500' },
  { name: 'Rose', value: '#F43F5E', bg: 'bg-rose-500' },
  { name: 'Indigo', value: '#6366F1', bg: 'bg-indigo-500' },
  { name: 'Slate Dark', value: '#1E293B', bg: 'bg-slate-800' }
];

const SIZE_PRESETS = [
  { label: '16px (sm)', value: 16 },
  { label: '20px (md)', value: 20 },
  { label: '24px (lg)', value: 24 },
  { label: '32px (xl)', value: 32 },
  { label: '40px (2xl)', value: 40 }
];

const HOVER_EFFECTS = [
  { label: 'None', value: 'none' },
  { label: 'Scale (+15%)', value: 'scale' },
  { label: 'Lift (Y-2px)', value: 'lift' },
  { label: 'Glow (Gold)', value: 'glow' },
  { label: 'Spin (180°)', value: 'spin' }
];

export default function IconLibraryDocPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSize, setSelectedSize] = useState(24);
  const [selectedColor, setSelectedColor] = useState('currentColor');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [hoverEffect, setHoverEffect] = useState('scale');
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [activeTab, setActiveTab] = useState('gallery'); // 'gallery' | 'docs' | 'setup'
  const [copiedKey, setCopiedKey] = useState(null);

  // Grouped icons from library
  const categorizedIcons = useMemo(() => {
    return getIconsByCategory();
  }, []);

  // Flattened inventory with category tags
  const allIcons = useMemo(() => {
    const list = [];
    for (const [category, items] of Object.entries(categorizedIcons)) {
      for (const item of items) {
        // Convert PascalCase or name to kebab-case
        const kebab = item.name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
        list.push({
          name: kebab,
          pascalName: item.name,
          category,
          component: item.component
        });
      }
    }
    return list;
  }, [categorizedIcons]);

  // Filtered list
  const filteredIcons = useMemo(() => {
    return allIcons.filter(item => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || item.name.includes(q) || item.pascalName.toLowerCase().includes(q) || item.category.includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [allIcons, activeCategory, searchQuery]);

  // Copy to clipboard helper
  const copyToClipboard = (text, key, label) => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success(label || 'Copied to clipboard!');
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const totalCount = allIcons.length;

  return (
    <div className="min-h-screen bg-stone-50/60 dark:bg-stone-950 p-4 sm:p-6 lg:p-8 space-y-8 font-sans">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-white p-6 sm:p-8 shadow-xl border border-amber-900/30">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              Global Design System Architecture
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold tracking-tight text-white">
              Global Icon Library & Gallery
            </h1>
            <p className="text-sm sm:text-base text-stone-300 max-w-2xl font-light">
              Independent, tree-shakable, framework-agnostic icon system extracted from MikuMantra.
              Supporting dynamic aliases, accessibility primitives, and micro-interactions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-stone-800/80 backdrop-blur border border-stone-700 rounded-xl px-4 py-3 text-center min-w-[100px]">
              <div className="text-2xl font-bold text-amber-400">{totalCount}</div>
              <div className="text-xs text-stone-400 font-medium uppercase tracking-wider">Total Icons</div>
            </div>
            <div className="bg-stone-800/80 backdrop-blur border border-stone-700 rounded-xl px-4 py-3 text-center min-w-[100px]">
              <div className="text-2xl font-bold text-emerald-400">9</div>
              <div className="text-xs text-stone-400 font-medium uppercase tracking-wider">Categories</div>
            </div>
            <div className="bg-stone-800/80 backdrop-blur border border-stone-700 rounded-xl px-4 py-3 text-center min-w-[100px]">
              <div className="text-2xl font-bold text-sky-400">0%</div>
              <div className="text-xs text-stone-400 font-medium uppercase tracking-wider">Regressions</div>
            </div>
          </div>
        </div>

        {/* View Mode Navigation Tabs */}
        <div className="mt-8 flex border-b border-stone-700/80 gap-6">
          <button
            onClick={() => setActiveTab('gallery')}
            className={`pb-3 text-sm font-semibold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'gallery'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Interactive Explorer
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`pb-3 text-sm font-semibold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'docs'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Code className="w-4 h-4" />
            API & Usage Examples
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`pb-3 text-sm font-semibold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'setup'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Installation & Portability
          </button>
        </div>
      </div>

      {/* TAB 1: INTERACTIVE EXPLORER */}
      {activeTab === 'gallery' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 shadow-sm border border-stone-200 dark:border-stone-800 space-y-4">
            {/* Search and Category Quick Filters */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search 145+ icons by name, alias or category..."
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Live Preview Controls */}
              <div className="flex flex-wrap items-center gap-4 text-xs">
                {/* Size Presets */}
                <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
                  <span className="text-stone-500 dark:text-stone-400 px-2 font-medium">Size:</span>
                  {SIZE_PRESETS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setSelectedSize(s.value)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition ${
                        selectedSize === s.value
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-stone-600 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-700'
                      }`}
                    >
                      {s.value}px
                    </button>
                  ))}
                </div>

                {/* Hover Effect Tester */}
                <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
                  <span className="text-stone-500 dark:text-stone-400 px-2 font-medium">Effect:</span>
                  <select
                    value={hoverEffect}
                    onChange={(e) => setHoverEffect(e.target.value)}
                    className="bg-transparent font-medium text-stone-700 dark:text-stone-200 focus:outline-none pr-2 py-1 cursor-pointer"
                  >
                    {HOVER_EFFECTS.map((eff) => (
                      <option key={eff.value} value={eff.value} className="dark:bg-stone-900">
                        {eff.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Color Palettes */}
                <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1.5 rounded-xl">
                  <span className="text-stone-500 dark:text-stone-400 px-2 font-medium">Color:</span>
                  {COLOR_PRESETS.map((col) => (
                    <button
                      key={col.name}
                      onClick={() => setSelectedColor(col.value)}
                      title={col.name}
                      className={`w-5 h-5 rounded-full ${col.bg} transition-all border ${
                        selectedColor === col.value
                          ? 'ring-2 ring-amber-500 ring-offset-1 scale-110'
                          : 'border-black/10 opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                  activeCategory === 'all'
                    ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                }`}
              >
                All Categories ({totalCount})
              </button>
              {Object.keys(categorizedIcons).map((catKey) => {
                const count = categorizedIcons[catKey]?.length || 0;
                return (
                  <button
                    key={catKey}
                    onClick={() => setActiveCategory(catKey)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                      activeCategory === catKey
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                    }`}
                  >
                    {CATEGORY_LABELS[catKey] || catKey} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 px-1">
            <span>
              Showing <strong>{filteredIcons.length}</strong> of {totalCount} icons
              {activeCategory !== 'all' && ` in ${CATEGORY_LABELS[activeCategory]}`}
              {searchQuery && ` matching "${searchQuery}"`}
            </span>
            <span>Click any icon to inspect and copy usage snippet</span>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {filteredIcons.map((item) => {
              const snippet = `<Icon name="${item.name}" size={${selectedSize}} />`;
              const isSelected = selectedIcon?.name === item.name;

              return (
                <div
                  key={`${item.category}-${item.name}`}
                  onClick={() => setSelectedIcon(item)}
                  className={`group relative flex flex-col items-center justify-center p-4 rounded-xl border transition-all cursor-pointer bg-white dark:bg-stone-900 ${
                    isSelected
                      ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md bg-amber-50/20 dark:bg-amber-950/20'
                      : 'border-stone-200/80 dark:border-stone-800 hover:border-amber-300 hover:shadow-sm'
                  }`}
                >
                  {/* Icon Rendering */}
                  <div className="h-14 flex items-center justify-center">
                    <Icon
                      name={item.name}
                      size={selectedSize}
                      color={selectedColor}
                      strokeWidth={strokeWidth}
                      hoverEffect={hoverEffect}
                    />
                  </div>

                  {/* Icon Name & Category */}
                  <div className="w-full text-center mt-2 space-y-0.5">
                    <div className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate group-hover:text-amber-700 dark:group-hover:text-amber-400" title={item.name}>
                      {item.name}
                    </div>
                    <div className="text-[10px] text-stone-400 capitalize truncate">
                      {item.category}
                    </div>
                  </div>

                  {/* Copy Button Overlay on Hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(snippet, item.name, `Copied <Icon name="${item.name}" />`);
                    }}
                    title="Copy JSX snippet"
                    className="absolute top-2 right-2 p-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-500 opacity-0 group-hover:opacity-100 hover:bg-amber-500 hover:text-white transition"
                  >
                    {copiedKey === item.name ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Empty Search State */}
          {filteredIcons.length === 0 && (
            <div className="p-12 text-center bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
              <Search className="w-10 h-10 text-stone-300 mx-auto" />
              <div className="text-base font-semibold text-stone-700 dark:text-stone-200">
                No icons found matching "{searchQuery}"
              </div>
              <p className="text-xs text-stone-400 max-w-sm mx-auto">
                Try searching with a synonym or developer alias like "cart", "user", "close", "google", or select "All Categories".
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
                className="mt-2 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-semibold hover:bg-amber-700 transition"
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* Icon Inspector Drawer / Modal */}
          {selectedIcon && (
            <div className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6 bg-stone-900/40 backdrop-blur-xs flex justify-center">
              <div className="w-full max-w-3xl bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-5 animate-in slide-in-from-bottom duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-stone-100 dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700">
                      <Icon
                        name={selectedIcon.name}
                        size={36}
                        color={selectedColor}
                        strokeWidth={strokeWidth}
                        hoverEffect={hoverEffect}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-stone-900 dark:text-white">
                          {selectedIcon.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          {selectedIcon.category}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        PascalCase: <code>{selectedIcon.pascalName}Icon</code>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedIcon(null)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    ✕
                  </button>
                </div>

                {/* Code Snippets */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  {/* Universal Named Snippet */}
                  <div className="p-3 bg-stone-50 dark:bg-stone-950 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2">
                    <div className="flex items-center justify-between text-stone-500 font-sans font-semibold">
                      <span>Universal &lt;Icon /&gt;</span>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            `<Icon name="${selectedIcon.name}" size={${selectedSize}} />`,
                            'drawer-universal',
                            'Copied Universal JSX!'
                          )
                        }
                        className="text-amber-600 hover:underline flex items-center gap-1 font-mono"
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                    </div>
                    <code className="text-amber-800 dark:text-amber-400 break-all block">
                      &lt;Icon name="{selectedIcon.name}" size={'{'}{selectedSize}{'}'} /&gt;
                    </code>
                  </div>

                  {/* Direct Tree-shakable Snippet */}
                  <div className="p-3 bg-stone-50 dark:bg-stone-950 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2">
                    <div className="flex items-center justify-between text-stone-500 font-sans font-semibold">
                      <span>Tree-shakable Import</span>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            `import { ${selectedIcon.pascalName}Icon } from '@maneet/icons';`,
                            'drawer-import',
                            'Copied Import!'
                          )
                        }
                        className="text-amber-600 hover:underline flex items-center gap-1 font-mono"
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                    </div>
                    <code className="text-emerald-700 dark:text-emerald-400 break-all block">
                      import {'{'} {selectedIcon.pascalName}Icon {'}'} from '@maneet/icons';
                    </code>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: API & USAGE EXAMPLES */}
      {activeTab === 'docs' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 sm:p-8 shadow-sm border border-stone-200 dark:border-stone-800 space-y-8">
          <div>
            <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-2">
              API Specification & Usage Guide
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              The Global Icon Library provides both high-level registry component and zero-overhead tree-shakable primitives.
            </p>
          </div>

          <div className="space-y-6">
            <h3 className="text-base font-semibold text-stone-800 dark:text-stone-200">
              1. Universal &lt;Icon /&gt; Component
            </h3>
            <div className="p-4 bg-stone-950 text-stone-100 rounded-xl font-mono text-xs overflow-x-auto">
              <pre>{`import { Icon } from '@maneet/icons';

// Standard usage
<Icon name="shopping-bag" size={24} />

// With custom color & hover effect
<Icon name="heart" size={20} color="#D4AF37" hoverEffect="scale" />

// Accessible with screen-reader label
<Icon name="user" size="lg" ariaLabel="Customer Profile" />

// Auto dark-mode adaptation
<Icon name="tag" size={18} themeAuto={true} />`}</pre>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-base font-semibold text-stone-800 dark:text-stone-200">
              2. Supported Props
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-stone-700 text-stone-400 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Prop</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Default</th>
                    <th className="py-2.5 px-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-stone-700 dark:text-stone-300">
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold text-amber-600">name</td>
                    <td className="py-2.5 px-3 font-mono">string</td>
                    <td className="py-2.5 px-3 italic">required</td>
                    <td className="py-2.5 px-3">Registry key in kebab-case or alias (e.g. "shopping-bag", "cart", "heart")</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold text-amber-600">size</td>
                    <td className="py-2.5 px-3 font-mono">number | "xs" | "sm" | "md" | "lg" | "xl" | "2xl"</td>
                    <td className="py-2.5 px-3 font-mono">20</td>
                    <td className="py-2.5 px-3">Dimension in pixels or semantic token</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold text-amber-600">color</td>
                    <td className="py-2.5 px-3 font-mono">string</td>
                    <td className="py-2.5 px-3 font-mono">"currentColor"</td>
                    <td className="py-2.5 px-3">Hex code, rgb, or CSS color string</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold text-amber-600">strokeWidth</td>
                    <td className="py-2.5 px-3 font-mono">number</td>
                    <td className="py-2.5 px-3 font-mono">2</td>
                    <td className="py-2.5 px-3">SVG outline stroke weight</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold text-amber-600">hoverEffect</td>
                    <td className="py-2.5 px-3 font-mono">"none" | "scale" | "lift" | "glow" | "spin"</td>
                    <td className="py-2.5 px-3 font-mono">"none"</td>
                    <td className="py-2.5 px-3">Interactive micro-animation on mouse hover</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold text-amber-600">ariaLabel</td>
                    <td className="py-2.5 px-3 font-mono">string</td>
                    <td className="py-2.5 px-3 font-mono">undefined</td>
                    <td className="py-2.5 px-3">Accessibility label. When omitted, automatically sets aria-hidden="true"</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold text-amber-600">themeAuto</td>
                    <td className="py-2.5 px-3 font-mono">boolean</td>
                    <td className="py-2.5 px-3 font-mono">false</td>
                    <td className="py-2.5 px-3">Automatically shifts dark-mode color to soft ivory (#FAF6EF)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INSTALLATION & PORTABILITY */}
      {activeTab === 'setup' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 sm:p-8 shadow-sm border border-stone-200 dark:border-stone-800 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-2">
              Portable Independent Package Architecture
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              The icon library lives in <code>packages/global-icon-library</code> as an independent package named <code>@maneet/icons</code>.
              It can be extracted and imported into any Next.js, React, or Vite project.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
              Importing into Future Projects
            </h3>
            <div className="p-4 bg-stone-950 text-stone-100 rounded-xl font-mono text-xs overflow-x-auto">
              <pre>{`// package.json in any external project:
{
  "dependencies": {
    "@maneet/icons": "file:../packages/global-icon-library"
  }
}

// Or configure jsconfig.json / tsconfig.json:
{
  "compilerOptions": {
    "paths": {
      "@maneet/icons": ["./packages/global-icon-library/index.js"]
    }
  }
}`}</pre>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
              Adding New Custom SVGs
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Add custom brand icons to <code>packages/global-icon-library/icons/custom/index.jsx</code>, or register dynamically at runtime:
            </p>
            <div className="p-4 bg-stone-950 text-stone-100 rounded-xl font-mono text-xs overflow-x-auto">
              <pre>{`import { registerIcon } from '@maneet/icons';

// Register dynamically
registerIcon('custom-badge', MyCustomBadgeComponent);

// Now callable anywhere via:
<Icon name="custom-badge" size={24} />`}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
