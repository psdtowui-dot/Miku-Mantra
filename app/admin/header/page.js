'use client';
import { useEffect, useState } from 'react';
import {
  Plus, Trash2, X, Loader2, Upload, Link as LinkIcon,
  ArrowUp, ArrowDown, Settings, FileText, Image as ImageIcon,
  Globe, Shield, Heart, Save, Check, Menu, Move, Eye, EyeOff,
  Megaphone
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminHeader() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [uploading, setUploading] = useState(false);
  const [uploadingFeatured, setUploadingFeatured] = useState(false);
  const [form, setForm] = useState(null);

  // Drag and drop states
  const [draggedNavIndex, setDraggedNavIndex] = useState(null);
  const [draggedSecIndex, setDraggedSecIndex] = useState(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);

  // Selected navigation item for mega-menu tab
  const [selectedNavId, setSelectedNavId] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/header', { credentials: 'include', cache: 'no-store' });
      if (r.ok) {
        const d = await r.json();
        if (!d.announcement) {
          d.announcement = {
            announcementText: '',
            isEnabled: false,
            isSliding: false,
            backgroundColor: '#1A1A1A',
            textColor: '#FFFFFF'
          };
        }
        setForm(d);
        if (d.navigation && d.navigation.length > 0) {
          const firstDropdownNav = d.navigation.find(n => n.hasDropdown);
          setSelectedNavId(firstDropdownNav ? firstDropdownNav.id : d.navigation[0].id);
        }
      } else {
        toast.error('Failed to load header data');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error loading header configuration');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleUploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const r = await fetch('/api/admin/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (r.ok) {
        const d = await r.json();
        setForm(prev => ({
          ...prev,
          logo: { ...prev.logo, image: d.url }
        }));
        toast.success('Logo uploaded successfully');
      } else {
        const d = await r.json().catch(() => ({}));
        toast.error(d.error || 'Logo upload failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Upload error');
    }
    setUploading(false);
  };

  const handleUploadFeatured = async (e, navId) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFeatured(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const r = await fetch('/api/admin/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (r.ok) {
        const d = await r.json();
        setForm(prev => {
          const navigation = prev.navigation.map(n => {
            if (n.id === navId) {
              const dropdown = n.dropdown || { sections: [], featured: { image: '', title: '', url: '', alt: '', isActive: false } };
              dropdown.featured = { ...dropdown.featured, image: d.url };
              return { ...n, dropdown };
            }
            return n;
          });
          return { ...prev, navigation };
        });
        toast.success('Featured image uploaded');
      } else {
        const d = await r.json().catch(() => ({}));
        toast.error(d.error || 'Featured image upload failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Upload error');
    }
    setUploadingFeatured(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await fetch('/api/header', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (r.ok) {
        toast.success('Header settings saved successfully');
        load();
      } else {
        const d = await r.json();
        toast.error(d.error || 'Failed to save settings');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving header settings');
    }
    setSaving(false);
  };

  // --- Main Navigation Link Managers ---
  const addNavLink = () => {
    const nextOrder = (form.navigation?.length || 0) + 1;
    const newNav = {
      id: 'nav-' + Math.random().toString(36).slice(2, 9),
      label: 'NEW LINK',
      url: '/shop',
      hasDropdown: false,
      dropdownType: 'mega-menu',
      isActive: true,
      order: nextOrder,
      dropdown: null
    };
    setForm(prev => ({
      ...prev,
      navigation: [...(prev.navigation || []), newNav]
    }));
    setSelectedNavId(newNav.id);
    toast.success('New navigation item added');
  };

  const updateNavLink = (id, key, val) => {
    setForm(prev => {
      const navigation = prev.navigation.map(n => {
        if (n.id === id) {
          const updated = { ...n, [key]: val };
          if (key === 'hasDropdown') {
            if (val && !n.dropdown) {
              updated.dropdown = {
                sections: [],
                featured: { image: '', title: '', url: '', alt: '', isActive: false }
              };
            } else if (!val) {
              updated.dropdown = null;
            }
          }
          return updated;
        }
        return n;
      });
      return { ...prev, navigation };
    });
  };

  const deleteNavLink = (id) => {
    if (!confirm('Are you sure you want to delete this navigation link?')) return;
    setForm(prev => {
      const filtered = prev.navigation.filter(n => n.id !== id);
      // Re-order
      const reordered = filtered.map((n, idx) => ({ ...n, order: idx + 1 }));
      return { ...prev, navigation: reordered };
    });
    toast.success('Link removed');
  };

  // HTML5 Drag and Drop for Navigation
  const handleNavDragStart = (e, index) => {
    setDraggedNavIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleNavDragOver = (e) => e.preventDefault();
  const handleNavDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedNavIndex === null || draggedNavIndex === targetIndex) return;
    setForm(prev => {
      const list = [...prev.navigation];
      const dragged = list[draggedNavIndex];
      list.splice(draggedNavIndex, 1);
      list.splice(targetIndex, 0, dragged);
      const reordered = list.map((item, idx) => ({ ...item, order: idx + 1 }));
      return { ...prev, navigation: reordered };
    });
    setDraggedNavIndex(null);
    toast.success('Navigation links reordered');
  };

  // --- Dropdown Sections Managers ---
  const getSelectedNav = () => {
    return form?.navigation?.find(n => n.id === selectedNavId);
  };

  const addDropdownSection = () => {
    if (!selectedNavId) return;
    setForm(prev => {
      const navigation = prev.navigation.map(n => {
        if (n.id === selectedNavId) {
          const dropdown = n.dropdown || { sections: [], featured: { image: '', title: '', url: '', alt: '', isActive: false } };
          const nextOrder = (dropdown.sections?.length || 0) + 1;
          const newSec = {
            id: 'sec-' + Math.random().toString(36).slice(2, 9),
            title: 'NEW SECTION',
            order: nextOrder,
            items: []
          };
          dropdown.sections = [...(dropdown.sections || []), newSec];
          return { ...n, dropdown };
        }
        return n;
      });
      return { ...prev, navigation };
    });
    toast.success('New section added');
  };

  const updateDropdownSection = (secId, key, val) => {
    setForm(prev => {
      const navigation = prev.navigation.map(n => {
        if (n.id === selectedNavId && n.dropdown?.sections) {
          const sections = n.dropdown.sections.map(s => {
            if (s.id === secId) {
              return { ...s, [key]: val };
            }
            return s;
          });
          return { ...n, dropdown: { ...n.dropdown, sections } };
        }
        return n;
      });
      return { ...prev, navigation };
    });
  };

  const deleteDropdownSection = (secId) => {
    if (!confirm('Delete this section and all its menu items?')) return;
    setForm(prev => {
      const navigation = prev.navigation.map(n => {
        if (n.id === selectedNavId && n.dropdown?.sections) {
          const filtered = n.dropdown.sections.filter(s => s.id !== secId);
          const reordered = filtered.map((s, idx) => ({ ...s, order: idx + 1 }));
          return { ...n, dropdown: { ...n.dropdown, sections: reordered } };
        }
        return n;
      });
      return { ...prev, navigation };
    });
    toast.success('Section deleted');
  };

  // HTML5 Drag and Drop for Dropdown Sections
  const handleSecDragStart = (e, index) => {
    setDraggedSecIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleSecDragOver = (e) => e.preventDefault();
  const handleSecDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedSecIndex === null || draggedSecIndex === targetIndex) return;
    setForm(prev => {
      const navigation = prev.navigation.map(n => {
        if (n.id === selectedNavId && n.dropdown?.sections) {
          const list = [...n.dropdown.sections];
          const dragged = list[draggedSecIndex];
          list.splice(draggedSecIndex, 1);
          list.splice(targetIndex, 0, dragged);
          const reordered = list.map((item, idx) => ({ ...item, order: idx + 1 }));
          return { ...n, dropdown: { ...n.dropdown, sections: reordered } };
        }
        return n;
      });
      return { ...prev, navigation };
    });
    setDraggedSecIndex(null);
    toast.success('Sections reordered');
  };

  // --- Submenu Items Managers ---
  const addSubmenuItem = (secId) => {
    setForm(prev => {
      const navigation = prev.navigation.map(n => {
        if (n.id === selectedNavId && n.dropdown?.sections) {
          const sections = n.dropdown.sections.map(s => {
            if (s.id === secId) {
              const nextOrder = (s.items?.length || 0) + 1;
              const newItem = {
                id: 'item-' + Math.random().toString(36).slice(2, 9),
                label: 'New Link Item',
                url: '#',
                isActive: true,
                order: nextOrder
              };
              return { ...s, items: [...(s.items || []), newItem] };
            }
            return s;
          });
          return { ...n, dropdown: { ...n.dropdown, sections } };
        }
        return n;
      });
      return { ...prev, navigation };
    });
    toast.success('Menu item added');
  };

  const updateSubmenuItem = (secId, itemId, key, val) => {
    setForm(prev => {
      const navigation = prev.navigation.map(n => {
        if (n.id === selectedNavId && n.dropdown?.sections) {
          const sections = n.dropdown.sections.map(s => {
            if (s.id === secId && s.items) {
              const items = s.items.map(it => {
                if (it.id === itemId) {
                  return { ...it, [key]: val };
                }
                return it;
              });
              return { ...s, items };
            }
            return s;
          });
          return { ...n, dropdown: { ...n.dropdown, sections } };
        }
        return n;
      });
      return { ...prev, navigation };
    });
  };

  const deleteSubmenuItem = (secId, itemId) => {
    setForm(prev => {
      const navigation = prev.navigation.map(n => {
        if (n.id === selectedNavId && n.dropdown?.sections) {
          const sections = n.dropdown.sections.map(s => {
            if (s.id === secId && s.items) {
              const filtered = s.items.filter(it => it.id !== itemId);
              const reordered = filtered.map((it, idx) => ({ ...it, order: idx + 1 }));
              return { ...s, items: reordered };
            }
            return s;
          });
          return { ...n, dropdown: { ...n.dropdown, sections } };
        }
        return n;
      });
      return { ...prev, navigation };
    });
    toast.success('Item removed');
  };

  // HTML5 Drag and Drop for Submenu Items
  const handleItemDragStart = (e, index) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleItemDragOver = (e) => e.preventDefault();
  const handleItemDrop = (e, secId, targetIndex) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === targetIndex) return;
    setForm(prev => {
      const navigation = prev.navigation.map(n => {
        if (n.id === selectedNavId && n.dropdown?.sections) {
          const sections = n.dropdown.sections.map(s => {
            if (s.id === secId && s.items) {
              const list = [...s.items];
              const dragged = list[draggedItemIndex];
              list.splice(draggedItemIndex, 1);
              list.splice(targetIndex, 0, dragged);
              const reordered = list.map((item, idx) => ({ ...item, order: idx + 1 }));
              return { ...s, items: reordered };
            }
            return s;
          });
          return { ...n, dropdown: { ...n.dropdown, sections } };
        }
        return n;
      });
      return { ...prev, navigation };
    });
    setDraggedItemIndex(null);
    toast.success('Menu items reordered');
  };

  // Update Featured Card fields
  const updateFeaturedCard = (key, val) => {
    setForm(prev => {
      const navigation = prev.navigation.map(n => {
        if (n.id === selectedNavId) {
          const dropdown = n.dropdown || { sections: [], featured: { image: '', title: '', url: '', alt: '', isActive: false } };
          dropdown.featured = { ...dropdown.featured, [key]: val };
          return { ...n, dropdown };
        }
        return n;
      });
      return { ...prev, navigation };
    });
  };

  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#9C6B30] h-10 w-10" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="p-8 text-center text-red-600 bg-red-50 border border-red-200 rounded-xl">
        Failed to load header settings. Please refresh the page.
      </div>
    );
  }

  const selectedNav = getSelectedNav();

  return (
    <div className="pb-16 max-w-5xl">
      <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-3 mb-6">
        <div>
          <div className="font-display text-2xl xs:text-3xl sm:text-4xl text-[#1A1A1A]">Header Settings</div>
          <div className="gold-line w-12 mt-2" />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-[#1A1A1A] text-white px-5 py-2.5 text-[11px] tracking-widest uppercase rounded-md hover:bg-[#9C6B30] transition-colors disabled:opacity-50 w-full xs:w-auto font-semibold shadow-xs"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Changes
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-neutral-200 bg-white rounded-t-xl px-2 xs:px-4 overflow-x-auto hide-scrollbar scrollbar-none">
        {[
          { id: 'general', label: 'Logo & Settings', icon: FileText },
          { id: 'navigation', label: 'Navigation Links', icon: Menu },
          { id: 'mega-menu', label: 'Mega Dropdowns', icon: Settings },
          { id: 'announcement', label: 'Announcement', icon: Megaphone },
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                // Pre-select first dropdown item if entering mega-menu
                if (tab.id === 'mega-menu' && form.navigation && form.navigation.length > 0) {
                  const hasDropdown = form.navigation.find(n => n.hasDropdown);
                  if (hasDropdown) setSelectedNavId(hasDropdown.id);
                }
              }}
              className={`flex items-center gap-1.5 sm:gap-2 py-3.5 sm:py-4 px-3 sm:px-4 border-b-2 text-[10px] sm:text-xs tracking-wider uppercase font-medium transition-all whitespace-nowrap shrink-0 ${active
                ? 'border-[#9C6B30] text-[#9C6B30]'
                : 'border-transparent text-neutral-400 hover:text-neutral-800'
                }`}
            >
              <Icon size={14} className={active ? 'text-[#9C6B30]' : 'text-neutral-400'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white p-4 xs:p-6 rounded-b-xl border border-t-0 border-neutral-200 shadow-xs space-y-6">

        {/* TAB 1: Logo & General Settings */}
        {activeTab === 'general' && (
          <div className="space-y-8">
            {/* Logo Settings */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b pb-2">Logo Settings</h3>
              <div>
                <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Header Logo Image</label>
                <div className="flex gap-4 mt-2 items-center flex-wrap">
                  <div className="w-48 h-16 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-center p-2">
                    {form.logo?.image ? (
                      <img src={form.logo.image} className="w-full h-full object-contain" alt="Logo Preview" />
                    ) : (
                      <ImageIcon size={24} className="text-neutral-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-[250px]">
                    <input
                      value={form.logo?.image || ''}
                      onChange={e => setForm({ ...form, logo: { ...form.logo, image: e.target.value } })}
                      placeholder="Logo Image path (e.g. /logo.png)"
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                    />
                    <div className="flex gap-2 mt-2">
                      <label className={`flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 hover:border-[#9C6B30] text-[11px] font-semibold tracking-wider uppercase rounded-md cursor-pointer transition-colors bg-white ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                        <Upload size={12} />
                        {uploading ? 'Uploading...' : 'Upload Logo'}
                        <input type="file" accept="image/*" className="hidden" onChange={handleUploadLogo} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Logo Redirect URL</label>
                  <input
                    value={form.logo?.url || ''}
                    onChange={e => setForm({ ...form, logo: { ...form.logo, url: e.target.value } })}
                    placeholder="/"
                    className="w-full mt-1.5 px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Logo Alt Text</label>
                  <input
                    value={form.logo?.alt || ''}
                    onChange={e => setForm({ ...form, logo: { ...form.logo, alt: e.target.value } })}
                    placeholder="MikuMantra Fine Jewellery"
                    className="w-full mt-1.5 px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                  />
                </div>
              </div>
            </div>

            {/* Feature Flags */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b pb-2">Header Settings (Icon Toggles)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-neutral-50/50 p-4 rounded-xl border border-neutral-100">
                {[
                  { key: 'searchEnabled', label: 'Enable Search Icon', desc: 'Allows customers to query products' },
                  { key: 'wishlistEnabled', label: 'Enable Wishlist Icon', desc: 'Saves marked products in user session' },
                  { key: 'accountEnabled', label: 'Enable User Account Icon', desc: 'Admin/Customer profile login links' },
                  { key: 'cartEnabled', label: 'Enable Cart Icon', desc: 'Displays bag with active items counter' },
                ].map(setting => (
                  <div key={setting.key} className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">{setting.label}</h4>
                      <p className="text-[11px] text-neutral-400">{setting.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!form.settings?.[setting.key]}
                        onChange={e => setForm({
                          ...form,
                          settings: { ...form.settings, [setting.key]: e.target.checked }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9C6B30]"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Navigation Links */}
        {activeTab === 'navigation' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Main Navigation Links</span>
              <button
                type="button"
                onClick={addNavLink}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#9C6B30] hover:text-[#b07d3b] bg-[#FAF6EF] px-3 py-1.5 rounded-lg border border-[#9C6B30]/10"
              >
                <Plus size={12} /> Add Link Item
              </button>
            </div>

            {/* Navigation links draggable list */}
            <div className="space-y-3">
              {(form.navigation || []).map((nav, index) => (
                <div
                  key={nav.id}
                  draggable
                  onDragStart={(e) => handleNavDragStart(e, index)}
                  onDragOver={handleNavDragOver}
                  onDrop={(e) => handleNavDrop(e, index)}
                  className="flex flex-col md:flex-row gap-4 items-center justify-between border border-neutral-200 p-4 rounded-xl bg-white hover:border-[#9C6B30] transition-colors group cursor-move shadow-xs"
                >
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <Move size={14} className="text-neutral-400 group-hover:text-[#9C6B30] shrink-0" />
                    <span className="font-mono text-xs text-neutral-400 shrink-0">Order #{index + 1}</span>
                    <input
                      value={nav.label}
                      onChange={e => updateNavLink(nav.id, 'label', e.target.value.toUpperCase())}
                      placeholder="LINK LABEL"
                      className="px-2.5 py-1.5 border border-neutral-200 rounded font-semibold text-xs text-neutral-800 bg-white focus:outline-none focus:border-[#9C6B30] w-36 uppercase"
                    />
                  </div>

                  <div className="flex flex-1 gap-4 items-center justify-end w-full md:w-auto flex-wrap">
                    {/* URL */}
                    <div className="relative w-full md:w-64">
                      <LinkIcon size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        value={nav.url}
                        onChange={e => updateNavLink(nav.id, 'url', e.target.value)}
                        placeholder="Link URL (e.g. /shop?category=gold)"
                        className="w-full pl-7 pr-2.5 py-1.5 border border-neutral-200 rounded text-xs bg-white focus:outline-none focus:border-[#9C6B30]"
                      />
                    </div>

                    {/* Dropdown enable check */}
                    <label className="flex items-center gap-1.5 text-[10px] text-neutral-500 font-semibold uppercase tracking-wider cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!nav.hasDropdown}
                        onChange={e => updateNavLink(nav.id, 'hasDropdown', e.target.checked)}
                        className="accent-[#9C6B30] h-3.5 w-3.5 rounded"
                      />
                      Dropdown
                    </label>

                    {nav.hasDropdown && (
                      <select
                        value={nav.dropdownType || 'mega-menu'}
                        onChange={e => updateNavLink(nav.id, 'dropdownType', e.target.value)}
                        className="px-2 py-1.5 border border-neutral-200 rounded text-xs bg-white focus:outline-none"
                      >
                        <option value="mega-menu">Mega Dropdown</option>
                      </select>
                    )}

                    {/* Active toggle */}
                    <button
                      type="button"
                      onClick={() => updateNavLink(nav.id, 'isActive', !nav.isActive)}
                      className={`p-1.5 rounded transition ${nav.isActive ? 'text-[#9C6B30] hover:bg-[#FAF6EF]' : 'text-neutral-300 hover:bg-neutral-50'}`}
                      title={nav.isActive ? 'Active' : 'Inactive'}
                    >
                      {nav.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => deleteNavLink(nav.id)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {(!form.navigation || form.navigation.length === 0) && (
                <div className="text-center py-10 text-neutral-400 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                  No navigation links configured yet. Click Add Link above to begin.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Mega Dropdowns */}
        {activeTab === 'mega-menu' && (
          <div className="space-y-8">
            {/* Link Selector */}
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80 flex items-center justify-between flex-wrap gap-4">
              <div>
                <span className="text-xs font-semibold text-neutral-700 uppercase tracking-wider block">Configure Mega-Menu Dropdowns</span>
                <span className="text-[11px] text-neutral-400">Select an active link to customize its columns and featured card elements.</span>
              </div>
              <div className="flex gap-2">
                {(form.navigation || []).filter(n => n.hasDropdown).map(nav => (
                  <button
                    key={nav.id}
                    type="button"
                    onClick={() => setSelectedNavId(nav.id)}
                    className={`px-4 py-2 border rounded-lg text-xs font-semibold tracking-wider transition ${selectedNavId === nav.id
                      ? 'border-[#9C6B30] bg-[#FAF6EF] text-[#9C6B30]'
                      : 'border-neutral-200 bg-white text-neutral-500 hover:text-neutral-700'
                      }`}
                  >
                    {nav.label}
                  </button>
                ))}
              </div>
            </div>

            {selectedNav ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Sections & Items Columns */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                      {selectedNav.label} — Columns & Submenus
                    </h4>
                    <button
                      type="button"
                      onClick={addDropdownSection}
                      className="flex items-center gap-1 text-[10px] font-semibold text-[#9C6B30] hover:text-[#b07d3b]"
                    >
                      <Plus size={12} /> Add Column Section
                    </button>
                  </div>

                  {/* Sections Draggable List */}
                  <div className="space-y-6">
                    {selectedNav.dropdown?.sections?.map((section, secIdx) => (
                      <div
                        key={section.id}
                        draggable
                        onDragStart={(e) => handleSecDragStart(e, secIdx)}
                        onDragOver={handleSecDragOver}
                        onDrop={(e) => handleSecDrop(e, secIdx)}
                        className="border border-neutral-200 rounded-xl overflow-hidden shadow-xs bg-neutral-50/20"
                      >
                        {/* Section Bar */}
                        <div className="flex items-center justify-between bg-neutral-50 px-4 py-2.5 border-b border-neutral-200 cursor-move">
                          <div className="flex items-center gap-2 flex-1">
                            <Move size={12} className="text-neutral-400" />
                            <span className="font-mono text-[10px] text-neutral-400">Col #{secIdx + 1}</span>
                            <input
                              value={section.title}
                              onChange={e => updateDropdownSection(section.id, 'title', e.target.value.toUpperCase())}
                              className="bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-[#9C6B30] text-xs font-semibold text-neutral-800 focus:outline-none px-1 py-0.5 uppercase font-sans tracking-wider"
                              placeholder="COLUMN TITLE"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => deleteDropdownSection(section.id)}
                              className="p-1 text-red-500 hover:text-red-700 rounded"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Items list inside Section */}
                        <div className="p-4 space-y-3 bg-white">
                          <div className="flex justify-between items-center text-[9px] text-neutral-400 font-bold uppercase tracking-wider">
                            <span>Links</span>
                            <button
                              type="button"
                              onClick={() => addSubmenuItem(section.id)}
                              className="flex items-center gap-0.5 text-[#9C6B30] hover:text-[#b07d3b]"
                            >
                              <Plus size={10} /> Add Item
                            </button>
                          </div>

                          {/* Items Draggable list */}
                          <div className="space-y-2">
                            {(section.items || []).map((item, itemIdx) => (
                              <div
                                key={item.id}
                                draggable
                                onDragStart={(e) => handleItemDragStart(e, itemIdx)}
                                onDragOver={handleItemDragOver}
                                onDrop={(e) => handleItemDrop(e, section.id, itemIdx)}
                                className="grid grid-cols-12 gap-2 items-center border border-neutral-100 p-2 rounded-lg bg-neutral-50/50 cursor-move"
                              >
                                <div className="col-span-1 flex justify-center">
                                  <Move size={10} className="text-neutral-300" />
                                </div>
                                <div className="col-span-4">
                                  <input
                                    value={item.label}
                                    onChange={e => updateSubmenuItem(section.id, item.id, 'label', e.target.value)}
                                    placeholder="Label (e.g. All Gold)"
                                    className="w-full px-2 py-1 border border-neutral-200 rounded text-xs bg-white focus:outline-none"
                                  />
                                </div>
                                <div className="col-span-5">
                                  <input
                                    value={item.url}
                                    onChange={e => updateSubmenuItem(section.id, item.id, 'url', e.target.value)}
                                    placeholder="URL (e.g. /shop?cat=gold)"
                                    className="w-full px-2 py-1 border border-neutral-200 rounded text-xs bg-white focus:outline-none font-mono"
                                  />
                                </div>
                                <div className="col-span-2 flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => updateSubmenuItem(section.id, item.id, 'isActive', !item.isActive)}
                                    className={`p-1 ${item.isActive ? 'text-[#9C6B30]' : 'text-neutral-300'}`}
                                  >
                                    {item.isActive ? <Eye size={12} /> : <EyeOff size={12} />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteSubmenuItem(section.id, item.id)}
                                    className="p-1 text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}

                            {(!section.items || section.items.length === 0) && (
                              <div className="text-center py-4 text-xs text-neutral-400 bg-neutral-50/30 rounded-lg border border-dashed border-neutral-100">
                                Click Add Item above to append sub-navigation items.
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    ))}

                    {(!selectedNav.dropdown?.sections || selectedNav.dropdown.sections.length === 0) && (
                      <div className="text-center py-10 text-neutral-400 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                        No sections configured yet for {selectedNav.label}. Click Add Column Section above.
                      </div>
                    )}
                  </div>

                </div>

                {/* Featured Card Panel */}
                <div className="space-y-6">
                  <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest border-b pb-2">
                    Featured Image Card
                  </h4>

                  <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/30 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] tracking-widest uppercase text-neutral-500 font-bold">Status</span>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!selectedNav.dropdown?.featured?.isActive}
                          onChange={e => updateFeaturedCard('isActive', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-neutral-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#9C6B30]"></div>
                      </label>
                    </div>

                    <div>
                      <label className="text-[9px] tracking-widest uppercase text-neutral-400 block mb-1">Image Preview</label>
                      <div className="w-full h-32 rounded-lg border border-neutral-200 bg-neutral-50 flex items-center justify-center p-1 relative overflow-hidden group/feat">
                        {selectedNav.dropdown?.featured?.image ? (
                          <img src={selectedNav.dropdown.featured.image} className="w-full h-full object-cover rounded" alt="Featured Card" />
                        ) : (
                          <ImageIcon size={24} className="text-neutral-400" />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] tracking-widest uppercase text-neutral-400 block">Upload Image</label>
                      <input
                        value={selectedNav.dropdown?.featured?.image || ''}
                        onChange={e => updateFeaturedCard('image', e.target.value)}
                        placeholder="Image URL or upload file"
                        className="w-full mt-1 px-2.5 py-1.5 border border-neutral-200 rounded text-xs bg-white focus:outline-none"
                      />
                      <label className={`flex items-center justify-center gap-1.5 mt-2 px-3 py-1.5 border border-neutral-200 hover:border-[#9C6B30] text-[10px] font-bold tracking-wider uppercase rounded-md cursor-pointer transition-colors bg-white ${uploadingFeatured ? 'opacity-50 pointer-events-none' : ''}`}>
                        <Upload size={12} />
                        {uploadingFeatured ? 'Uploading...' : 'Choose File'}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadFeatured(e, selectedNav.id)} />
                      </label>
                    </div>

                    <div>
                      <label className="text-[9px] tracking-widest uppercase text-neutral-400 block">Card Title</label>
                      <input
                        value={selectedNav.dropdown?.featured?.title || ''}
                        onChange={e => updateFeaturedCard('title', e.target.value.toUpperCase())}
                        placeholder="EXPLORE GOLD"
                        className="w-full mt-1 px-2.5 py-1.5 border border-neutral-200 rounded text-xs uppercase"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] tracking-widest uppercase text-neutral-400 block">Link URL</label>
                      <input
                        value={selectedNav.dropdown?.featured?.url || ''}
                        onChange={e => updateFeaturedCard('url', e.target.value)}
                        placeholder="/shop?category=gold"
                        className="w-full mt-1 px-2.5 py-1.5 border border-neutral-200 rounded text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] tracking-widest uppercase text-neutral-400 block">Alt Text</label>
                      <input
                        value={selectedNav.dropdown?.featured?.alt || ''}
                        onChange={e => updateFeaturedCard('alt', e.target.value)}
                        placeholder="Explore Gold Jewellery"
                        className="w-full mt-1 px-2.5 py-1.5 border border-neutral-200 rounded text-xs"
                      />
                    </div>
                  </div>

                </div>

              </div>
            ) : (
              <div className="text-center py-12 text-neutral-400 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                Please configure at least one link with dropdown enabled in the Navigation Links tab first.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Announcement */}
        {activeTab === 'announcement' && (
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b pb-2">Announcement Settings</h3>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Announcement Content</label>
                <input
                  value={form.announcement?.announcementText || ''}
                  onChange={e => setForm({
                    ...form,
                    announcement: { ...(form.announcement || {}), announcementText: e.target.value }
                  })}
                  placeholder="e.g. FREE SHIPPING ON ORDERS ABOVE ₹999"
                  className="w-full mt-1.5 px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-neutral-50/50 p-4 rounded-xl border border-neutral-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">Enable Announcement</h4>
                    <p className="text-[11px] text-neutral-400">Show or hide the announcement bar on the frontend</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!form.announcement?.isEnabled}
                      onChange={e => setForm({
                        ...form,
                        announcement: { ...(form.announcement || {}), isEnabled: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9C6B30]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">Sliding Animation</h4>
                    <p className="text-[11px] text-neutral-400">Enable continuous horizontal sliding effect</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!form.announcement?.isSliding}
                      onChange={e => setForm({
                        ...form,
                        announcement: { ...(form.announcement || {}), isSliding: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9C6B30]"></div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block mb-1.5">Background Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={form.announcement?.backgroundColor || '#000000'}
                      onChange={e => setForm({
                        ...form,
                        announcement: { ...(form.announcement || {}), backgroundColor: e.target.value }
                      })}
                      className="h-10 w-10 border border-neutral-200 rounded-lg cursor-pointer p-0 bg-transparent shrink-0"
                    />
                    <input
                      type="text"
                      maxLength={7}
                      value={form.announcement?.backgroundColor || '#000000'}
                      onChange={e => setForm({
                        ...form,
                        announcement: { ...(form.announcement || {}), backgroundColor: e.target.value }
                      })}
                      placeholder="#000000"
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm font-mono focus:outline-none focus:border-[#9C6B30]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold block mb-1.5">Font Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={form.announcement?.textColor || '#FFFFFF'}
                      onChange={e => setForm({
                        ...form,
                        announcement: { ...(form.announcement || {}), textColor: e.target.value }
                      })}
                      className="h-10 w-10 border border-neutral-200 rounded-lg cursor-pointer p-0 bg-transparent shrink-0"
                    />
                    <input
                      type="text"
                      maxLength={7}
                      value={form.announcement?.textColor || '#FFFFFF'}
                      onChange={e => setForm({
                        ...form,
                        announcement: { ...(form.announcement || {}), textColor: e.target.value }
                      })}
                      placeholder="#FFFFFF"
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm font-mono focus:outline-none focus:border-[#9C6B30]"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
