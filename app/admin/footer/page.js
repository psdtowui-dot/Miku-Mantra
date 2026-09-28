'use client';
import { useEffect, useState } from 'react';
import { 
  Plus, Trash2, X, Loader2, Upload, Link as LinkIcon, 
  ArrowUp, ArrowDown, Settings, FileText, Image as ImageIcon, 
  Globe, Shield, Heart, Save, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_LINK = { label: 'New Link', url: '#', isActive: true };
const DEFAULT_SECTION = { title: 'New Section', links: [] };
const DEFAULT_SOCIAL = { platform: 'Instagram', url: '#', icon: 'Instagram', isActive: true };

export default function AdminFooter() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('company');
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/footer', { credentials: 'include', cache: 'no-store' });
      if (r.ok) {
        const d = await r.json();
        setForm(d);
      } else {
        toast.error('Failed to load footer data');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error loading footer configuration');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpload = async (e) => {
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
          company: { ...prev.company, logo: d.url }
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

  const handleSave = async () => {
    if (!form.company?.name) return toast.error('Company Name is required');
    setSaving(true);
    try {
      const r = await fetch('/api/admin/footer', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (r.ok) {
        toast.success('Footer settings saved successfully');
        load();
      } else {
        const d = await r.json();
        toast.error(d.error || 'Failed to save settings');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving footer settings');
    }
    setSaving(false);
  };

  // Section managers
  const addSection = () => {
    setForm(prev => ({
      ...prev,
      sections: [...(prev.sections || []), { ...DEFAULT_SECTION, links: [] }]
    }));
    toast.success('New section added');
  };

  const deleteSection = (secIdx) => {
    if (!confirm('Are you sure you want to delete this section and all its links?')) return;
    setForm(prev => ({
      ...prev,
      sections: prev.sections.filter((_, idx) => idx !== secIdx)
    }));
  };

  const moveSection = (index, dir) => {
    const targetIdx = index + dir;
    if (targetIdx < 0 || targetIdx >= form.sections.length) return;
    setForm(prev => {
      const sections = [...prev.sections];
      const temp = sections[index];
      sections[index] = sections[targetIdx];
      sections[targetIdx] = temp;
      return { ...prev, sections };
    });
  };

  // Link managers
  const addLink = (secIdx) => {
    setForm(prev => {
      const sections = [...prev.sections];
      sections[secIdx].links = [...(sections[secIdx].links || []), { ...DEFAULT_LINK }];
      return { ...prev, sections };
    });
  };

  const updateLink = (secIdx, linkIdx, key, val) => {
    setForm(prev => {
      const sections = [...prev.sections];
      const link = { ...sections[secIdx].links[linkIdx], [key]: val };
      sections[secIdx].links[linkIdx] = link;
      return { ...prev, sections };
    });
  };

  const deleteLink = (secIdx, linkIdx) => {
    setForm(prev => {
      const sections = [...prev.sections];
      sections[secIdx].links = sections[secIdx].links.filter((_, idx) => idx !== linkIdx);
      return { ...prev, sections };
    });
  };

  const moveLink = (secIdx, linkIdx, dir) => {
    const targetIdx = linkIdx + dir;
    if (targetIdx < 0 || targetIdx >= form.sections[secIdx].links.length) return;
    setForm(prev => {
      const sections = [...prev.sections];
      const links = [...sections[secIdx].links];
      const temp = links[linkIdx];
      links[linkIdx] = links[targetIdx];
      links[targetIdx] = temp;
      sections[secIdx].links = links;
      return { ...prev, sections };
    });
  };

  // Social links
  const addSocial = () => {
    setForm(prev => ({
      ...prev,
      socialLinks: [...(prev.socialLinks || []), { ...DEFAULT_SOCIAL }]
    }));
  };

  const updateSocial = (idx, key, val) => {
    setForm(prev => {
      const socialLinks = [...prev.socialLinks];
      socialLinks[idx] = { ...socialLinks[idx], [key]: val };
      return { ...prev, socialLinks };
    });
  };

  const deleteSocial = (idx) => {
    setForm(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, i) => i !== idx)
    }));
  };

  // Policy links
  const addPolicy = () => {
    setForm(prev => ({
      ...prev,
      policies: [...(prev.policies || []), { label: 'New Policy', url: '#', isActive: true }]
    }));
  };

  const updatePolicy = (idx, key, val) => {
    setForm(prev => {
      const policies = [...prev.policies];
      policies[idx] = { ...policies[idx], [key]: val };
      return { ...prev, policies };
    });
  };

  const deletePolicy = (idx) => {
    setForm(prev => ({
      ...prev,
      policies: prev.policies.filter((_, i) => i !== idx)
    }));
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
        Failed to load footer settings. Please refresh the page.
      </div>
    );
  }

  return (
    <div className="pb-16 max-w-5xl">
      <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-3 mb-6">
        <div>
          <div className="font-display text-2xl xs:text-3xl sm:text-4xl text-[#1A1A1A]">Footer Settings</div>
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
          { id: 'company', label: 'Company Profile', icon: FileText },
          { id: 'navigation', label: 'Navigation Columns', icon: Settings },
          { id: 'social-policies', label: 'Social & Policies', icon: Shield },
          { id: 'newsletter', label: 'Newsletter & Copyright', icon: Globe },
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 sm:gap-2 py-3.5 sm:py-4 px-3 sm:px-4 border-b-2 text-[10px] sm:text-xs tracking-wider uppercase font-medium transition-all whitespace-nowrap shrink-0 ${
                active 
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
        
        {/* TAB 1: Company Profile */}
        {activeTab === 'company' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Company Name</label>
                <input 
                  value={form.company?.name || ''} 
                  onChange={e => setForm({ ...form, company: { ...form.company, name: e.target.value } })} 
                  placeholder="E.g., MikuMantra Fine Jewellery"
                  className="w-full mt-1.5 px-3 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#9C6B30] focus:ring-1 focus:ring-[#9C6B30] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Footer Logo Image</label>
              <div className="flex gap-4 mt-2 items-center flex-wrap">
                <div className="w-16 h-16 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-center p-2">
                  {form.company?.logo ? (
                    <img src={form.company.logo} className="w-full h-full object-contain" alt="Footer Logo Preview" />
                  ) : (
                    <ImageIcon size={24} className="text-neutral-400" />
                  )}
                </div>
                <div className="flex-1 min-w-[200px]">
                  <input 
                    value={form.company?.logo || ''} 
                    onChange={e => setForm({ ...form, company: { ...form.company, logo: e.target.value } })} 
                    placeholder="Enter image URL or upload file"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                  />
                  <div className="flex gap-2 mt-2">
                    <label className={`flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 hover:border-[#9C6B30] text-[11px] font-semibold tracking-wider uppercase rounded-md cursor-pointer transition-colors bg-white ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                      <Upload size={12} />
                      {uploading ? 'Uploading...' : 'Upload Logo'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Company Description</label>
              <textarea 
                value={form.company?.description || ''} 
                onChange={e => setForm({ ...form, company: { ...form.company, description: e.target.value } })} 
                rows={3}
                placeholder="Brief brand tagline or description for footer..."
                className="w-full mt-1.5 px-3 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#9C6B30]"
              />
            </div>

            <div className="border-t border-neutral-100 pt-6">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Contact Info & Address</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Contact Email</label>
                  <input 
                    value={form.company?.email || ''} 
                    onChange={e => setForm({ ...form, company: { ...form.company, email: e.target.value } })} 
                    placeholder="concierge@mikumantra.jewels"
                    className="w-full mt-1.5 px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Contact Phone</label>
                  <div className="relative flex items-center mt-1.5">
                    <span className="absolute left-3 text-neutral-500 font-semibold text-sm select-none pointer-events-none z-10">
                      +91
                    </span>
                    <input 
                      type="tel"
                      maxLength={10}
                      value={(form.company?.phone || '').toString().replace(/^\+91/, '').replace(/[^0-9]/g, '').slice(0, 10)} 
                      onChange={e => {
                        const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                        setForm({ ...form, company: { ...form.company, phone: digits ? `+91${digits}` : '' } });
                      }} 
                      placeholder="9810000000"
                      className="w-full pl-11 pr-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Website URL</label>
                  <input 
                    value={form.company?.website || ''} 
                    onChange={e => setForm({ ...form, company: { ...form.company, website: e.target.value } })} 
                    placeholder="https://mikumantra.jewels"
                    className="w-full mt-1.5 px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-6 space-y-4">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Tax & Business Registration (For Invoices)</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">GSTIN</label>
                  <input 
                    value={form.company?.gstin || ''} 
                    onChange={e => setForm({ ...form, company: { ...form.company, gstin: e.target.value } })} 
                    placeholder="08MIKUMANT1234Z1"
                    className="w-full mt-1.5 px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">PAN</label>
                  <input 
                    value={form.company?.pan || ''} 
                    onChange={e => setForm({ ...form, company: { ...form.company, pan: e.target.value } })} 
                    placeholder="MIKUM1234P"
                    className="w-full mt-1.5 px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">CIN (Optional)</label>
                  <input 
                    value={form.company?.cin || ''} 
                    onChange={e => setForm({ ...form, company: { ...form.company, cin: e.target.value } })} 
                    placeholder="U36910RJ2026PTC123456"
                    className="w-full mt-1.5 px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Registered Office Address</label>
                <input 
                  value={form.company?.registeredAddress || ''} 
                  onChange={e => setForm({ ...form, company: { ...form.company, registeredAddress: e.target.value } })} 
                  placeholder="Atelier MikuMantra, Phase 2, MG Road, Jaipur 302001"
                  className="w-full mt-1.5 px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>

              <div>
                <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Invoice Terms & Conditions / Footer Note</label>
                <textarea 
                  rows={2}
                  value={form.company?.invoiceTerms || ''} 
                  onChange={e => setForm({ ...form, company: { ...form.company, invoiceTerms: e.target.value } })} 
                  placeholder="e.g. All pieces are BIS Hallmarked and SGL certified. Returns accepted within 15 days."
                  className="w-full mt-1.5 px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Navigation Columns */}
        {activeTab === 'navigation' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Footer Columns</span>
              <button 
                type="button"
                onClick={addSection}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#9C6B30] hover:text-[#b07d3b] bg-[#FAF6EF] px-3 py-1.5 rounded-lg border border-[#9C6B30]/10"
              >
                <Plus size={12} /> Add Column Section
              </button>
            </div>

            <div className="space-y-6">
              {form.sections?.map((section, secIdx) => (
                <div key={secIdx} className="border border-neutral-200 rounded-xl overflow-hidden shadow-xs bg-neutral-50/20">
                  {/* Section header */}
                  <div className="flex items-center justify-between bg-neutral-50 px-4 py-3 border-b border-neutral-200">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="font-mono text-xs text-neutral-400">Column #{secIdx + 1}</span>
                      <input 
                        value={section.title} 
                        onChange={e => {
                          const sections = [...form.sections];
                          sections[secIdx].title = e.target.value;
                          setForm({ ...form, sections });
                        }}
                        className="bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-[#9C6B30] text-sm font-semibold text-neutral-800 focus:outline-none px-1 py-0.5"
                        placeholder="Column Title"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button 
                        type="button" 
                        disabled={secIdx === 0}
                        onClick={() => moveSection(secIdx, -1)}
                        className="p-1 hover:text-[#9C6B30] text-neutral-400 disabled:opacity-30"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button 
                        type="button" 
                        disabled={secIdx === form.sections.length - 1}
                        onClick={() => moveSection(secIdx, 1)}
                        className="p-1 hover:text-[#9C6B30] text-neutral-400 disabled:opacity-30"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => deleteSection(secIdx)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Section Link List */}
                  <div className="p-4 space-y-3 bg-white">
                    <div className="flex justify-between items-center text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                      <span>Links</span>
                      <button 
                        type="button"
                        onClick={() => addLink(secIdx)}
                        className="flex items-center gap-0.5 text-[#9C6B30] hover:text-[#b07d3b]"
                      >
                        <Plus size={10} /> Add Link
                      </button>
                    </div>

                    <div className="space-y-2">
                      {section.links?.map((link, linkIdx) => (
                        <div key={linkIdx} className="grid grid-cols-12 gap-3 items-center border border-neutral-100 p-2.5 rounded-lg bg-neutral-50/50">
                          <div className="col-span-4">
                            <input 
                              value={link.label} 
                              onChange={e => updateLink(secIdx, linkIdx, 'label', e.target.value)}
                              placeholder="Link Label"
                              className="w-full px-2.5 py-1.5 border border-neutral-200 rounded text-xs bg-white focus:outline-none"
                            />
                          </div>
                          <div className="col-span-4">
                            <div className="relative">
                              <LinkIcon size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                              <input 
                                value={link.url} 
                                onChange={e => updateLink(secIdx, linkIdx, 'url', e.target.value)}
                                placeholder="URL (e.g. /shop?category=gold)"
                                className="w-full pl-6 pr-2 py-1.5 border border-neutral-200 rounded text-xs bg-white focus:outline-none"
                              />
                            </div>
                          </div>
                          <div className="col-span-2 flex items-center justify-center">
                            <label className="flex items-center gap-1.5 text-[10px] text-neutral-500 select-none cursor-pointer uppercase tracking-wider font-semibold">
                              <input 
                                type="checkbox" 
                                checked={!!link.isActive}
                                onChange={e => updateLink(secIdx, linkIdx, 'isActive', e.target.checked)}
                                className="accent-[#9C6B30] h-3.5 w-3.5 rounded"
                              />
                              Active
                            </label>
                          </div>
                          <div className="col-span-2 flex justify-end gap-1">
                            <button 
                              type="button" 
                              disabled={linkIdx === 0}
                              onClick={() => moveLink(secIdx, linkIdx, -1)}
                              className="p-1 hover:text-[#9C6B30] text-neutral-400 disabled:opacity-30"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button 
                              type="button" 
                              disabled={linkIdx === section.links.length - 1}
                              onClick={() => moveLink(secIdx, linkIdx, 1)}
                              className="p-1 hover:text-[#9C6B30] text-neutral-400 disabled:opacity-30"
                            >
                              <ArrowDown size={12} />
                            </button>
                            <button 
                              type="button" 
                              onClick={() => deleteLink(secIdx, linkIdx)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {(!section.links || section.links.length === 0) && (
                        <div className="text-center py-4 text-xs text-neutral-400 bg-neutral-50/50 rounded-lg border border-dashed border-neutral-200">
                          No links in this section yet. Click Add Link above to get started.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {(!form.sections || form.sections.length === 0) && (
                <div className="text-center py-10 text-neutral-400 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                  No columns defined. Click Add Column Section above to build the layout.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Social & Policies */}
        {activeTab === 'social-policies' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 divide-y lg:divide-y-0 lg:divide-x divide-neutral-200">
            {/* Social Links Panel */}
            <div className="space-y-4 pr-0 lg:pr-6">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Social Media Profiles</h4>
                <button 
                  type="button"
                  onClick={addSocial}
                  className="flex items-center gap-0.5 text-[10px] font-semibold text-[#9C6B30] hover:text-[#b07d3b]"
                >
                  <Plus size={12} /> Add Platform
                </button>
              </div>

              <div className="space-y-3">
                {form.socialLinks?.map((social, idx) => (
                  <div key={idx} className="border border-neutral-200 rounded-lg p-3 space-y-2 bg-neutral-50/30">
                    <div className="flex gap-2 items-center justify-between">
                      <input 
                        value={social.platform} 
                        onChange={e => updateSocial(idx, 'platform', e.target.value)}
                        placeholder="Platform Name (e.g. Instagram)"
                        className="font-semibold text-xs text-neutral-800 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-[#9C6B30] focus:outline-none flex-1 py-0.5"
                      />
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-[10px] text-neutral-500 select-none cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={!!social.isActive}
                            onChange={e => updateSocial(idx, 'isActive', e.target.checked)}
                            className="accent-[#9C6B30] h-3.5 w-3.5"
                          />
                          Active
                        </label>
                        <button 
                          type="button" 
                          onClick={() => deleteSocial(idx)}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className="text-[9px] tracking-wider uppercase text-neutral-400 block mb-0.5">Icon component name</label>
                        <input 
                          value={social.icon} 
                          onChange={e => updateSocial(idx, 'icon', e.target.value)}
                          placeholder="e.g. Instagram, Youtube, Facebook"
                          className="w-full px-2 py-1 border border-neutral-200 rounded text-xs bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] tracking-wider uppercase text-neutral-400 block mb-0.5">Profile URL</label>
                        <input 
                          value={social.url} 
                          onChange={e => updateSocial(idx, 'url', e.target.value)}
                          placeholder="https://instagram.com/mikumantra"
                          className="w-full px-2 py-1 border border-neutral-200 rounded text-xs bg-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {(!form.socialLinks || form.socialLinks.length === 0) && (
                  <div className="text-center py-6 text-xs text-neutral-400 bg-neutral-50 rounded-lg">
                    No social profiles added yet.
                  </div>
                )}
              </div>
            </div>

            {/* Policies Panel */}
            <div className="space-y-4 pt-6 lg:pt-0 pl-0 lg:pl-8">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Policy Pages (Footer Bottom)</h4>
                <button 
                  type="button"
                  onClick={addPolicy}
                  className="flex items-center gap-0.5 text-[10px] font-semibold text-[#9C6B30] hover:text-[#b07d3b]"
                >
                  <Plus size={12} /> Add Policy
                </button>
              </div>

              <div className="space-y-3">
                {form.policies?.map((policy, idx) => (
                  <div key={idx} className="flex items-center gap-3 border border-neutral-100 p-2.5 rounded-lg bg-neutral-50/50">
                    <div className="w-1/3">
                      <input 
                        value={policy.label} 
                        onChange={e => updatePolicy(idx, 'label', e.target.value)}
                        placeholder="Policy Label"
                        className="w-full px-2.5 py-1.5 border border-neutral-200 rounded text-xs bg-white focus:outline-none"
                      />
                    </div>
                    <div className="flex-1">
                      <input 
                        value={policy.url} 
                        onChange={e => updatePolicy(idx, 'url', e.target.value)}
                        placeholder="URL (e.g. /privacy)"
                        className="w-full px-2.5 py-1.5 border border-neutral-200 rounded text-xs bg-white focus:outline-none font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-[10px] text-neutral-500 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={!!policy.isActive}
                          onChange={e => updatePolicy(idx, 'isActive', e.target.checked)}
                          className="accent-[#9C6B30] h-3.5 w-3.5"
                        />
                        Active
                      </label>
                      <button 
                        type="button" 
                        onClick={() => deletePolicy(idx)}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}

                {(!form.policies || form.policies.length === 0) && (
                  <div className="text-center py-6 text-xs text-neutral-400 bg-neutral-50 rounded-lg">
                    No policy links defined.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Newsletter & Copyright */}
        {activeTab === 'newsletter' && (
          <div className="space-y-6">
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-neutral-800">Footer Newsletter Box</h4>
                  <p className="text-xs text-neutral-500">Enable and configure the email subscription form inside the footer.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={!!form.newsletter?.isActive}
                    onChange={e => setForm({ ...form, newsletter: { ...form.newsletter, isActive: e.target.checked } })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9C6B30]"></div>
                  <span className="ml-3 text-xs font-semibold text-neutral-700 uppercase tracking-wider">Active</span>
                </label>
              </div>

              {form.newsletter?.isActive && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">Newsletter Title</label>
                    <input 
                      value={form.newsletter.title || ''} 
                      onChange={e => setForm({ ...form, newsletter: { ...form.newsletter, title: e.target.value } })}
                      placeholder="Subscribe to Our Newsletter"
                      className="w-full mt-1.5 px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#9C6B30]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold font-mono">Newsletter Description</label>
                    <input 
                      value={form.newsletter.description || ''} 
                      onChange={e => setForm({ ...form, newsletter: { ...form.newsletter, description: e.target.value } })}
                      placeholder="Receive updates, access to exclusive deals, and more."
                      className="w-full mt-1.5 px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#9C6B30]"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-neutral-100 pt-6">
              <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold mb-2 block">Copyright Text</label>
              <input 
                value={form.copyright || ''} 
                onChange={e => setForm({ ...form, copyright: e.target.value })}
                placeholder="MikuMantra Fine Jewellery. All rights reserved."
                className="w-full px-3 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#9C6B30]"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">
                Do not include the © symbol or year. These are dynamically rendered based on the client browser date.
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
