'use client';
import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  Save,
  Loader2,
  Upload,
  Eye,
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
  Gem,
  Image as ImageIcon,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

const AVAILABLE_ICONS = [
  { name: 'ShieldCheck', icon: ShieldCheck, label: 'Shield Check' },
  { name: 'Award', icon: Award, label: 'Award Ribbon' },
  { name: 'Truck', icon: Truck, label: 'Delivery Truck' },
  { name: 'RefreshCw', icon: RefreshCw, label: 'Refresh / Return' },
  { name: 'Sparkles', icon: Sparkles, label: 'Sparkles / Care' },
  { name: 'Heart', icon: Heart, label: 'Heart / Buyback' },
  { name: 'Check', icon: Check, label: 'Checkmark' },
  { name: 'Globe', icon: Globe, label: 'Globe' },
  { name: 'Lock', icon: Lock, label: 'Secure Lock' },
  { name: 'Gift', icon: Gift, label: 'Gift' },
  { name: 'Tag', icon: Tag, label: 'Tag' },
  { name: 'Star', icon: Star, label: 'Star' },
  { name: 'Clock', icon: Clock, label: 'Clock' },
  { name: 'Gem', icon: Gem, label: 'Gem' }
];

export default function AdminHomepageCMS() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('promotions'); // 'promotions' | 'assurance'

  const [promotions, setPromotions] = useState([]);
  const [assuranceSection, setAssuranceSection] = useState({
    enabled: true,
    eyebrow: 'Our Promise',
    title: 'The MikuMantra Assurance',
    description: 'Six generations of craftsmanship, ten values that never change.'
  });
  const [assuranceCards, setAssuranceCards] = useState([]);

  // Promotional Banner Modal state
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState(null);
  const [promoForm, setPromoForm] = useState({
    img: '',
    eyebrow: 'Limited Time',
    title: '',
    subtitle: '',
    ctaText: 'Shop the Offer',
    ctaUrl: '/shop',
    enabled: true,
    order: 1
  });

  // Assurance Card Modal state
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState(null);
  const [cardForm, setCardForm] = useState({
    icon: 'ShieldCheck',
    title: '',
    description: '',
    enabled: true,
    order: 1
  });

  const [uploading, setUploading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/homepage-content', { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setPromotions((data.homepagePromotions || []).sort((a, b) => (a.order || 0) - (b.order || 0)));
        if (data.assuranceSection) {
          setAssuranceSection({
            enabled: data.assuranceSection.enabled ?? true,
            eyebrow: data.assuranceSection.eyebrow || 'Our Promise',
            title: data.assuranceSection.title || 'The MikuMantra Assurance',
            description: data.assuranceSection.description || ''
          });
        }
        setAssuranceCards((data.assuranceCards || []).sort((a, b) => (a.order || 0) - (b.order || 0)));
      } else {
        toast.error('Failed to load homepage CMS data');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error loading configuration');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/homepage-content', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homepagePromotions: promotions,
          assuranceSection,
          assuranceCards
        })
      });
      if (res.ok) {
        toast.success('Homepage Promotions & Assurance settings saved successfully!');
        loadData();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || 'Failed to save settings');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving settings');
    }
    setSaving(false);
  };

  const handleUploadBannerImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const r = await fetch('/api/admin/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      if (r.ok) {
        const d = await r.json();
        setPromoForm(prev => ({ ...prev, img: d.url }));
        toast.success('Banner image uploaded successfully');
      } else {
        const d = await r.json().catch(() => ({}));
        toast.error(d.error || 'Image upload failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Upload error');
    }
    setUploading(false);
  };

  // Promo Banner Handlers
  const openNewPromoModal = () => {
    setEditingPromoId(null);
    setPromoForm({
      img: '',
      eyebrow: 'Limited Time',
      title: '',
      subtitle: '',
      ctaText: 'Shop the Offer',
      ctaUrl: '/shop',
      enabled: true,
      order: promotions.length + 1
    });
    setPromoModalOpen(true);
  };

  const openEditPromoModal = (promo) => {
    setEditingPromoId(promo.id);
    setPromoForm({ ...promo });
    setPromoModalOpen(true);
  };

  const savePromoModal = (e) => {
    e.preventDefault();
    if (!promoForm.title.trim()) return toast.error('Banner Title is required');
    if (!promoForm.img.trim()) return toast.error('Banner Image URL is required');

    if (editingPromoId) {
      setPromotions(prev => prev.map(p => p.id === editingPromoId ? { ...promoForm, id: editingPromoId } : p));
    } else {
      const newPromo = { ...promoForm, id: 'promo_' + Date.now() };
      setPromotions(prev => [...prev, newPromo]);
    }
    setPromoModalOpen(false);
    toast.info('Banner updated in draft. Click "Save All Changes" to persist.');
  };

  const deletePromo = (id) => {
    setPromotions(prev => prev.filter(p => p.id !== id));
    toast.info('Banner removed from draft. Click "Save All Changes" to persist.');
  };

  const togglePromoEnabled = (id) => {
    setPromotions(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  };

  // Assurance Card Handlers
  const openNewCardModal = () => {
    setEditingCardId(null);
    setCardForm({
      icon: 'ShieldCheck',
      title: '',
      description: '',
      enabled: true,
      order: assuranceCards.length + 1
    });
    setCardModalOpen(true);
  };

  const openEditCardModal = (card) => {
    setEditingCardId(card.id);
    setCardForm({ ...card });
    setCardModalOpen(true);
  };

  const saveCardModal = (e) => {
    e.preventDefault();
    if (!cardForm.title.trim()) return toast.error('Card Title is required');
    if (!cardForm.description.trim()) return toast.error('Card Description is required');

    if (editingCardId) {
      setAssuranceCards(prev => prev.map(c => c.id === editingCardId ? { ...cardForm, id: editingCardId } : c));
    } else {
      const newCard = { ...cardForm, id: 'assur_' + Date.now() };
      setAssuranceCards(prev => [...prev, newCard]);
    }
    setCardModalOpen(false);
    toast.info('Card updated in draft. Click "Save All Changes" to persist.');
  };

  const deleteCard = (id) => {
    setAssuranceCards(prev => prev.filter(c => c.id !== id));
    toast.info('Card removed from draft. Click "Save All Changes" to persist.');
  };

  const toggleCardEnabled = (id) => {
    setAssuranceCards(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#9C6B30]" size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 pb-4 sm:pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-display text-neutral-900 font-semibold flex items-center gap-2">
            <ShieldCheck className="text-[#9C6B30] shrink-0" size={24} />
            Homepage Promotions & Assurance CMS
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Manage promotional offer banners, "Our Promise" header text, and individual assurance cards dynamically.
          </p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-[#9C6B30] text-white hover:bg-[#825725] px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors shrink-0 disabled:opacity-50 shadow-xs w-full sm:w-auto"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save All Changes
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 gap-4 text-xs font-bold tracking-wider uppercase">
        <button
          onClick={() => setActiveTab('promotions')}
          className={`pb-3 border-b-2 transition-colors ${activeTab === 'promotions' ? 'border-[#9C6B30] text-[#9C6B30]' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
        >
          Promotional Banners ({promotions.length})
        </button>
        <button
          onClick={() => setActiveTab('assurance')}
          className={`pb-3 border-b-2 transition-colors ${activeTab === 'assurance' ? 'border-[#9C6B30] text-[#9C6B30]' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
        >
          Assurance Section & Cards ({assuranceCards.length})
        </button>
      </div>

      {/* TAB 1: PROMOTIONAL BANNERS */}
      {activeTab === 'promotions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-800 uppercase tracking-wider">
              Homepage Promotional Banners
            </h2>
            <button
              onClick={openNewPromoModal}
              className="flex items-center gap-1.5 bg-[#1A1A1A] text-white hover:bg-[#9C6B30] px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              <Plus size={14} /> Add Promotional Banner
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {promotions.map((p, idx) => (
              <div
                key={p.id}
                className={`bg-white rounded-xl border p-4 sm:p-5 shadow-xs space-y-4 transition ${!p.enabled ? 'opacity-60 border-neutral-300 bg-neutral-50' : 'border-neutral-200'}`}
              >
                <div className="relative h-44 rounded-lg overflow-hidden bg-neutral-900">
                  <img src={p.img} alt={p.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 flex flex-col justify-end text-white">
                    <span className="text-[9px] uppercase tracking-widest text-[#D4AF37] font-semibold">{p.eyebrow}</span>
                    <h3 className="font-display text-lg font-light">{p.title}</h3>
                    <p className="text-xs text-white/80">{p.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-100">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={p.enabled}
                        onChange={() => togglePromoEnabled(p.id)}
                        className="accent-[#9C6B30] rounded cursor-pointer"
                      />
                      <span className="font-semibold text-neutral-700">{p.enabled ? 'Enabled' : 'Disabled'}</span>
                    </label>
                    <span className="text-neutral-400 font-mono">Order: {p.order}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditPromoModal(p)}
                      className="p-1.5 text-neutral-600 hover:text-[#9C6B30] hover:bg-neutral-100 rounded"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => deletePromo(p.id)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {promotions.length === 0 && (
            <div className="p-8 text-center bg-white rounded-xl border border-neutral-200 text-neutral-400 text-sm">
              No promotional banners configured. Click "Add Promotional Banner" above to create one.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ASSURANCE SECTION & CARDS */}
      {activeTab === 'assurance' && (
        <div className="space-y-6">
          {/* Section Header Controls */}
          <div className="bg-white p-4 xs:p-6 rounded-xl border border-neutral-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <h2 className="text-xs sm:text-sm font-bold text-neutral-800 uppercase tracking-wider">
                Section Header Settings
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-semibold text-neutral-700">Section Enabled</span>
                <input
                  type="checkbox"
                  checked={assuranceSection.enabled}
                  onChange={e => setAssuranceSection(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="w-4 h-4 accent-[#9C6B30] rounded cursor-pointer"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                  Eyebrow Text *
                </label>
                <input
                  type="text"
                  value={assuranceSection.eyebrow}
                  onChange={e => setAssuranceSection(prev => ({ ...prev, eyebrow: e.target.value }))}
                  placeholder="e.g. Our Promise"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                  Main Section Title *
                </label>
                <input
                  type="text"
                  value={assuranceSection.title}
                  onChange={e => setAssuranceSection(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. The MikuMantra Assurance"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                Section Description / Subtitle
              </label>
              <textarea
                rows={2}
                value={assuranceSection.description}
                onChange={e => setAssuranceSection(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Six generations of craftsmanship, ten values that never change."
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
              />
            </div>
          </div>

          {/* Cards Header & List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-neutral-800 uppercase tracking-wider">
                Assurance Cards ({assuranceCards.length})
              </h2>
              <button
                onClick={openNewCardModal}
                className="flex items-center gap-1.5 bg-[#1A1A1A] text-white hover:bg-[#9C6B30] px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
              >
                <Plus size={14} /> Add Card
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {assuranceCards.map((c) => {
                const iconObj = AVAILABLE_ICONS.find(i => i.name === c.icon) || AVAILABLE_ICONS[0];
                const IconComp = iconObj.icon;
                return (
                  <div
                    key={c.id}
                    className={`bg-white p-4 sm:p-5 rounded-xl border shadow-xs space-y-3 flex flex-col justify-between transition ${!c.enabled ? 'opacity-60 border-neutral-300 bg-neutral-50' : 'border-neutral-200'}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9C6B30]/10 to-[#D4AF37]/20 flex items-center justify-center text-[#9C6B30]">
                          <IconComp size={20} />
                        </div>
                        <span className="text-[10px] text-neutral-400 font-mono">Order: {c.order}</span>
                      </div>
                      <h3 className="font-serif-luxe text-base text-[#1A1A1A]">{c.title}</h3>
                      <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{c.description}</p>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-3 border-t border-neutral-100">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={c.enabled}
                          onChange={() => toggleCardEnabled(c.id)}
                          className="accent-[#9C6B30] rounded cursor-pointer"
                        />
                        <span className="font-semibold text-neutral-700">{c.enabled ? 'Enabled' : 'Disabled'}</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditCardModal(c)}
                          className="p-1.5 text-neutral-600 hover:text-[#9C6B30] hover:bg-neutral-100 rounded"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => deleteCard(c.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {assuranceCards.length === 0 && (
              <div className="p-8 text-center bg-white rounded-xl border border-neutral-200 text-neutral-400 text-sm">
                No assurance cards configured. Click "Add Card" above to create one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* PROMO BANNER MODAL */}
      {promoModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-neutral-900 border-b border-neutral-100 pb-2">
              {editingPromoId ? 'Edit Promotional Banner' : 'Add Promotional Banner'}
            </h3>

            <form onSubmit={savePromoModal} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-neutral-700 uppercase tracking-wider block mb-1">Banner Image *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoForm.img}
                    onChange={e => setPromoForm({ ...promoForm, img: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                  />
                  <label className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-3 py-2 rounded-lg font-semibold uppercase tracking-wider cursor-pointer flex items-center gap-1 shrink-0 border border-neutral-200">
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    <span>Upload</span>
                    <input type="file" accept="image/*" onChange={handleUploadBannerImage} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-neutral-700 uppercase tracking-wider block mb-1">Eyebrow / Small Label</label>
                  <input
                    type="text"
                    value={promoForm.eyebrow}
                    onChange={e => setPromoForm({ ...promoForm, eyebrow: e.target.value })}
                    placeholder="e.g. Limited Time"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-700 uppercase tracking-wider block mb-1">Display Order</label>
                  <input
                    type="number"
                    min="1"
                    value={promoForm.order}
                    onChange={e => setPromoForm({ ...promoForm, order: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-neutral-700 uppercase tracking-wider block mb-1">Main Banner Title *</label>
                <input
                  type="text"
                  value={promoForm.title}
                  onChange={e => setPromoForm({ ...promoForm, title: e.target.value })}
                  placeholder="e.g. The Wedding Trunk"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 uppercase tracking-wider block mb-1">Subtitle / Description</label>
                <input
                  type="text"
                  value={promoForm.subtitle}
                  onChange={e => setPromoForm({ ...promoForm, subtitle: e.target.value })}
                  placeholder="e.g. Up to 15% off on making charges"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-neutral-700 uppercase tracking-wider block mb-1">CTA Button Text</label>
                  <input
                    type="text"
                    value={promoForm.ctaText}
                    onChange={e => setPromoForm({ ...promoForm, ctaText: e.target.value })}
                    placeholder="e.g. Shop the Offer"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-700 uppercase tracking-wider block mb-1">CTA Link / URL</label>
                  <input
                    type="text"
                    value={promoForm.ctaUrl}
                    onChange={e => setPromoForm({ ...promoForm, ctaUrl: e.target.value })}
                    placeholder="e.g. /shop?category=wedding"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={promoForm.enabled}
                  onChange={e => setPromoForm({ ...promoForm, enabled: e.target.checked })}
                  className="accent-[#9C6B30] rounded cursor-pointer"
                />
                <span className="font-semibold text-neutral-800">Banner Enabled</span>
              </label>

              <div className="flex justify-end gap-2 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setPromoModalOpen(false)}
                  className="px-4 py-2 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 rounded-lg font-semibold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#9C6B30] text-white hover:bg-[#825725] rounded-lg font-semibold uppercase tracking-wider"
                >
                  Apply Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSURANCE CARD MODAL */}
      {cardModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-neutral-900 border-b border-neutral-100 pb-2">
              {editingCardId ? 'Edit Assurance Card' : 'Add Assurance Card'}
            </h3>

            <form onSubmit={saveCardModal} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-neutral-700 uppercase tracking-wider block mb-1">Select Icon *</label>
                <select
                  value={cardForm.icon}
                  onChange={e => setCardForm({ ...cardForm, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                >
                  {AVAILABLE_ICONS.map(i => (
                    <option key={i.name} value={i.name}>
                      {i.label} ({i.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-neutral-700 uppercase tracking-wider block mb-1">Card Title *</label>
                <input
                  type="text"
                  value={cardForm.title}
                  onChange={e => setCardForm({ ...cardForm, title: e.target.value })}
                  placeholder="e.g. BIS Hallmarked"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 uppercase tracking-wider block mb-1">Card Description *</label>
                <input
                  type="text"
                  value={cardForm.description}
                  onChange={e => setCardForm({ ...cardForm, description: e.target.value })}
                  placeholder="e.g. Every piece government certified."
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 uppercase tracking-wider block mb-1">Display Order</label>
                <input
                  type="number"
                  min="1"
                  value={cardForm.order}
                  onChange={e => setCardForm({ ...cardForm, order: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={cardForm.enabled}
                  onChange={e => setCardForm({ ...cardForm, enabled: e.target.checked })}
                  className="accent-[#9C6B30] rounded cursor-pointer"
                />
                <span className="font-semibold text-neutral-800">Card Enabled</span>
              </label>

              <div className="flex justify-end gap-2 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setCardModalOpen(false)}
                  className="px-4 py-2 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 rounded-lg font-semibold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#9C6B30] text-white hover:bg-[#825725] rounded-lg font-semibold uppercase tracking-wider"
                >
                  Apply Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
