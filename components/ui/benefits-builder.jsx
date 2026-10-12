'use client';
import { useState } from 'react';
import { Reorder } from 'framer-motion';
import { 
  Plus, Trash2, GripVertical, Upload, Loader2, 
  ChevronUp, ChevronDown, Check, Sparkles, Image as ImageIcon,
  HelpCircle, Eye
} from 'lucide-react';
import BenefitIcon, { PRESET_BENEFIT_ICONS, BENEFIT_ICON_MAP } from './benefit-icon';
import { toast } from 'sonner';

const POPULAR_SUGGESTIONS = [
  { title: 'BIS Hallmarked', icon: 'ShieldCheck', description: 'Certified purity by BIS' },
  { title: 'SGL Certified', icon: 'Award', description: 'Independently graded diamonds' },
  { title: 'Free Shipping', icon: 'Truck', description: 'Free shipping across India' },
  { title: '15-Day Return', icon: 'RefreshCw', description: '15-day hassle-free return policy' },
  { title: 'Lifetime Buyback', icon: 'Heart', description: '100% gold exchange value guaranteed' },
  { title: 'Free Lifetime Cleaning', icon: 'Sparkles', description: 'Free servicing & ultrasonic cleaning' },
  { title: 'Handmade Luxury', icon: 'Hammer', description: 'Meticulously crafted by master artisans' },
  { title: 'Gift Packaging', icon: 'Gift', description: 'Signature luxury keepsake box' },
  { title: 'Custom Engraving', icon: 'Scissors', description: 'Personalized engraving available' },
  { title: 'Hypoallergenic', icon: 'BadgeCheck', description: 'Nickel-free & sensitive-skin safe' },
];

export default function BenefitsBuilder({ productBenefits = [], onChange }) {
  const [uploadingId, setUploadingId] = useState(null);
  const [activeIconPickerId, setActiveIconPickerId] = useState(null);

  const handleAdd = (template = null) => {
    const newBenefit = {
      id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      title: template?.title || '',
      icon: template?.icon || 'ShieldCheck',
      description: template?.description || '',
      enabled: true,
      order: productBenefits.length
    };
    onChange([...productBenefits, newBenefit]);
  };

  const handleUpdate = (id, field, val) => {
    onChange(productBenefits.map(b => b.id === id ? { ...b, [field]: val } : b));
  };

  const handleDelete = (id) => {
    onChange(productBenefits.filter(b => b.id !== id));
  };

  const handleReorder = (newOrder) => {
    const updated = newOrder.map((b, idx) => ({ ...b, order: idx }));
    onChange(updated);
  };

  const moveBenefit = (index, direction) => {
    const sorted = [...productBenefits].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;
    const temp = sorted[index];
    sorted[index] = sorted[targetIndex];
    sorted[targetIndex] = temp;
    handleReorder(sorted);
  };

  const handleSvgUpload = async (benefitId, file) => {
    if (!file) return;
    setUploadingId(benefitId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      if (res.ok) {
        const d = await res.json();
        handleUpdate(benefitId, 'icon', d.url);
        toast.success('SVG Icon uploaded successfully');
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || 'Failed to upload SVG icon');
      }
    } catch (err) {
      console.error(err);
      toast.error('Upload error');
    } finally {
      setUploadingId(null);
    }
  };

  const sortedBenefits = [...productBenefits].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const enabledCount = sortedBenefits.filter(b => b.enabled !== false && b.title?.trim()).length;

  return (
    <div className="space-y-6">
      {/* Header with Quick Suggestion Badges */}
      <div className="flex justify-between items-start flex-wrap gap-4 border-b border-neutral-100 pb-4">
        <div>
          <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-widest flex items-center gap-2">
            Product Benefits / Highlights
            <span className="text-[10px] bg-[#FAF6EF] text-[#9C6B30] px-2 py-0.5 rounded-full font-semibold">
              {enabledCount} Active
            </span>
          </h4>
          <p className="text-[11px] text-neutral-400 mt-1">
            Dynamic highlights displayed on the product details page. Add custom benefits or pick from presets.
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleAdd()}
          className="flex items-center gap-1.5 bg-[#1A1A1A] text-white px-4 py-2 text-[10px] tracking-widest uppercase rounded-md hover:bg-[#9C6B30] transition-colors font-semibold shadow-xs"
        >
          <Plus size={13} /> Add Benefit
        </button>
      </div>

      {/* Quick Presets / Suggestion Chips */}
      <div className="bg-neutral-50/80 p-3.5 rounded-xl border border-neutral-100">
        <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-2">
          Quick Suggestions (Click to Add):
        </span>
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_SUGGESTIONS.map((sug, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleAdd(sug)}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-[#FAF6EF] hover:border-[#9C6B30]/40 border border-neutral-200 text-neutral-700 hover:text-[#9C6B30] px-2.5 py-1 rounded-full text-xs font-medium transition-all shadow-2xs group"
            >
              <Plus size={10} className="text-neutral-400 group-hover:text-[#9C6B30]" />
              <BenefitIcon icon={sug.icon} size={12} className="text-[#9C6B30]" />
              <span>{sug.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Benefits List */}
      {sortedBenefits.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-neutral-200 rounded-xl bg-neutral-50/40">
          <Sparkles className="mx-auto text-neutral-300 mb-2 stroke-[1.2]" size={32} />
          <p className="text-sm font-medium text-neutral-600">No product benefits configured</p>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            This product will not display any benefits section until at least one benefit is added.
          </p>
          <button
            type="button"
            onClick={() => handleAdd()}
            className="mt-4 inline-flex items-center gap-1.5 bg-[#1A1A1A] text-white hover:bg-[#9C6B30] px-4 py-2 text-[10px] tracking-widest uppercase rounded-md transition-colors font-medium shadow-xs"
          >
            <Plus size={12} /> Add First Benefit
          </button>
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={sortedBenefits}
          onReorder={handleReorder}
          className="space-y-4"
        >
          {sortedBenefits.map((benefit, index) => {
            const isPickerOpen = activeIconPickerId === benefit.id;
            const isUploading = uploadingId === benefit.id;

            return (
              <Reorder.Item
                key={benefit.id}
                value={benefit}
                className={`bg-white rounded-xl border transition-all p-4 shadow-xs ${
                  benefit.enabled !== false 
                    ? 'border-neutral-200 hover:border-neutral-300' 
                    : 'border-neutral-200/60 bg-neutral-50/40 opacity-75'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Drag Handle & Order Controls */}
                  <div className="flex flex-col items-center pt-2 gap-1 select-none">
                    <div 
                      className="cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-700 p-1"
                      title="Drag to reorder"
                    >
                      <GripVertical size={16} />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveBenefit(index, -1)}
                        className="text-neutral-300 hover:text-neutral-600 disabled:opacity-20 p-0.5"
                        title="Move Up"
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        type="button"
                        disabled={index === sortedBenefits.length - 1}
                        onClick={() => moveBenefit(index, 1)}
                        className="text-neutral-300 hover:text-neutral-600 disabled:opacity-20 p-0.5"
                        title="Move Down"
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Icon Preview & Selector Trigger */}
                  <div className="flex flex-col items-center gap-1.5 shrink-0 pt-1">
                    <div 
                      onClick={() => setActiveIconPickerId(isPickerOpen ? null : benefit.id)}
                      className="w-11 h-11 rounded-full bg-[#FAF6EF] border border-[#9C6B30]/30 flex items-center justify-center text-[#9C6B30] cursor-pointer hover:scale-105 transition-transform shadow-xs relative group"
                      title="Click to change icon"
                    >
                      <BenefitIcon icon={benefit.icon} size={18} />
                      <div className="absolute inset-0 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-[9px] font-semibold transition-opacity">
                        Change
                      </div>
                    </div>
                    <span className="text-[9px] text-neutral-400 font-mono">
                      #{index + 1}
                    </span>
                  </div>

                  {/* Main Inputs: Title, Description, Icon Config */}
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      {/* Title */}
                      <div className="md:col-span-7">
                        <label className="text-[10px] tracking-wider uppercase text-neutral-500 font-semibold block mb-1">
                          Benefit Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={benefit.title || ''}
                          onChange={(e) => handleUpdate(benefit.id, 'title', e.target.value)}
                          placeholder="E.g., BIS Hallmarked, SGL Certified, Free Shipping..."
                          className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#9C6B30] focus:ring-1 focus:ring-[#9C6B30] transition-all font-medium text-neutral-800"
                        />
                      </div>

                      {/* Display Order */}
                      <div className="md:col-span-2">
                        <label className="text-[10px] tracking-wider uppercase text-neutral-500 font-semibold block mb-1">
                          Order
                        </label>
                        <input
                          type="number"
                          value={benefit.order ?? index}
                          onChange={(e) => handleUpdate(benefit.id, 'order', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#9C6B30] transition-all text-center font-mono"
                        />
                      </div>

                      {/* Enabled Checkbox */}
                      <div className="md:col-span-3 flex items-center justify-start md:justify-end gap-2 pt-4 md:pt-0">
                        <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer select-none transition-all text-xs font-semibold ${
                          benefit.enabled !== false
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-neutral-100 border-neutral-200 text-neutral-400'
                        }`}>
                          <input
                            type="checkbox"
                            checked={benefit.enabled !== false}
                            onChange={(e) => handleUpdate(benefit.id, 'enabled', e.target.checked)}
                            className="accent-emerald-600 h-3.5 w-3.5 rounded cursor-pointer"
                          />
                          <span>{benefit.enabled !== false ? 'Enabled' : 'Disabled'}</span>
                        </label>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDelete(benefit.id)}
                          className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Benefit"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Optional Description */}
                    <div>
                      <label className="text-[10px] tracking-wider uppercase text-neutral-400 font-semibold block mb-1">
                        Optional Subtitle / Description
                      </label>
                      <input
                        type="text"
                        value={benefit.description || ''}
                        onChange={(e) => handleUpdate(benefit.id, 'description', e.target.value)}
                        placeholder="E.g., Certified 100% purity with authentic laser stamp"
                        className="w-full px-3 py-1.5 border border-neutral-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#9C6B30] transition-all text-neutral-600"
                      />
                    </div>

                    {/* Expanded Icon Selector Panel */}
                    {isPickerOpen && (
                      <div className="mt-3 p-4 bg-[#FAF6EF]/30 border border-[#9C6B30]/20 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider">
                            Select or Upload Icon for &ldquo;{benefit.title || 'Benefit'}&rdquo;
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveIconPickerId(null)}
                            className="text-xs text-neutral-500 hover:text-neutral-900 font-medium"
                          >
                            Done
                          </button>
                        </div>

                        {/* Presets Grid */}
                        <div>
                          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">
                            Jewellery Icon Presets:
                          </span>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {PRESET_BENEFIT_ICONS.map((preset) => {
                              const isSelected = benefit.icon === preset.id;
                              const IconComp = preset.icon;
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => handleUpdate(benefit.id, 'icon', preset.id)}
                                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-white border-[#9C6B30] text-[#9C6B30] ring-1 ring-[#9C6B30] shadow-xs'
                                      : 'bg-white/60 border-neutral-200 hover:border-neutral-300 text-neutral-600'
                                  }`}
                                >
                                  <IconComp size={18} className={isSelected ? 'text-[#9C6B30]' : 'text-neutral-500'} />
                                  <span className="text-[9px] mt-1 line-clamp-1 font-medium">{preset.name.split('/')[0]}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Upload Custom SVG or Enter URL */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#9C6B30]/10">
                          {/* File Upload */}
                          <div>
                            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1.5">
                              Upload Custom SVG Icon File:
                            </span>
                            <label className={`flex items-center justify-center gap-2 border border-dashed border-neutral-300 hover:border-[#9C6B30] rounded-lg p-2.5 bg-white cursor-pointer transition-colors text-xs font-medium text-neutral-700 ${
                              isUploading ? 'opacity-50 pointer-events-none' : ''
                            }`}>
                              <input
                                type="file"
                                accept=".svg,image/svg+xml,image/png"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleSvgUpload(benefit.id, e.target.files[0]);
                                  }
                                }}
                                className="hidden"
                              />
                              {isUploading ? (
                                <>
                                  <Loader2 size={14} className="animate-spin text-[#9C6B30]" />
                                  <span>Uploading SVG…</span>
                                </>
                              ) : (
                                <>
                                  <Upload size={14} className="text-[#9C6B30]" />
                                  <span>Choose .SVG File</span>
                                </>
                              )}
                            </label>
                          </div>

                          {/* Direct SVG URL or Raw Code */}
                          <div>
                            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1.5">
                              Or Custom SVG URL / SVG Code:
                            </span>
                            <input
                              type="text"
                              value={benefit.icon || ''}
                              onChange={(e) => handleUpdate(benefit.id, 'icon', e.target.value)}
                              placeholder="/api/uploads/my-icon.svg or <svg>..."
                              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#9C6B30] font-mono text-neutral-700"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      )}

      {/* Bottom Add Button if list is long */}
      {sortedBenefits.length > 2 && (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => handleAdd()}
            className="flex items-center gap-1.5 bg-neutral-100 hover:bg-[#FAF6EF] text-neutral-700 hover:text-[#9C6B30] border border-neutral-200 hover:border-[#9C6B30]/40 px-4 py-2 text-[10px] tracking-widest uppercase rounded-md transition-all font-semibold"
          >
            <Plus size={12} /> Add Another Benefit
          </button>
        </div>
      )}

      {/* Live Storefront Preview */}
      {enabledCount > 0 && (
        <div className="mt-8 pt-6 border-t border-neutral-100">
          <div className="flex items-center gap-2 mb-3">
            <Eye size={14} className="text-[#9C6B30]" />
            <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
              Storefront Live Preview ({enabledCount} visible benefits)
            </span>
          </div>
          <div className="p-6 bg-white rounded-xl border border-neutral-200 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {sortedBenefits
                .filter(b => b.enabled !== false && b.title?.trim())
                .map((b) => (
                  <div key={b.id || b.title} className="flex items-center gap-3 text-neutral-600">
                    <div className="w-9 h-9 rounded-full bg-[#FAF6EF] flex items-center justify-center text-[#9C6B30] shrink-0 shadow-2xs">
                      <BenefitIcon icon={b.icon} size={16} />
                    </div>
                    <div>
                      <div className="font-medium text-neutral-800 text-sm leading-snug">{b.title}</div>
                      {b.description?.trim() && (
                        <div className="text-[11px] text-neutral-400 leading-tight mt-0.5">{b.description}</div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
