'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, authFetch } from '@/lib/use-auth';
import { useWishlist } from '@/lib/cart-store';
import { PRODUCTS, formatINR } from '@/lib/products';
import { User, MapPin, Package, Heart, LogOut, Loader2, Plus, Trash2, ChevronRight, ShieldCheck, Lock, Eye, EyeOff, KeyRound, RotateCcw, Clock, Star, Sparkles, CheckCircle2, Pencil, Truck } from 'lucide-react';
import { toast } from 'sonner';

export default function AccountPage() {
  const { user, loading, logout, refresh, changePassword } = useAuth();
  const router = useRouter();
  const { ids } = useWishlist();
  const [tab, setTab] = useState('profile');
  const [addresses, setAddresses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [returnsList, setReturnsList] = useState([]);
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [reviewsList, setReviewsList] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [addrForm, setAddrForm] = useState({ fullName: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', isDefault: false });
  const [showAddr, setShowAddr] = useState(false);
  const [editingAddrId, setEditingAddrId] = useState(null);
  const [addrSaving, setAddrSaving] = useState(false);
  const addrFormRef = useRef(null);
  const [saving, setSaving] = useState(false);

  const [profileErrors, setProfileErrors] = useState({ name: '', phone: '' });
  const [addrErrors, setAddrErrors] = useState({ fullName: '', phone: '', line1: '', city: '', state: '', pincode: '' });

  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdErrors, setPwdErrors] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  useEffect(() => { if (!loading && !user) router.push('/login?redirect=/account'); }, [loading, user, router]);
  useEffect(() => {
    if (tab === 'wishlist') {
      router.push('/wishlist');
    }
  }, [tab, router]);
  useEffect(() => {
    if (user) {
      setProfileForm(prev => ({
        name: user.name || prev.name || '',
        phone: user.phone || prev.phone || ''
      }));
      loadAddresses();
      loadOrders();
      loadReturns();
      loadReviews();
    }
  }, [user]);

  async function loadAddresses() { const r = await authFetch('/api/addresses'); const d = await r.json(); if (r.ok) setAddresses(d.addresses || []); }
  async function loadOrders() { const r = await authFetch('/api/orders'); const d = await r.json(); if (r.ok) setOrders(d.orders || []); }
  async function loadReturns() {
    setReturnsLoading(true);
    try {
      const r = await authFetch('/api/returns');
      const d = await r.json();
      if (r.ok) setReturnsList(d.returns || []);
    } catch (e) {
      console.error(e);
    } finally {
      setReturnsLoading(false);
    }
  }
  async function loadReviews() {
    setReviewsLoading(true);
    try {
      const r = await authFetch('/api/reviews/mine');
      const d = await r.json();
      if (r.ok) setReviewsList(d.reviews || []);
    } catch (e) {
      console.error(e);
    } finally {
      setReviewsLoading(false);
    }
  }

  async function deleteCustomerReview(id) {
    if (!confirm('Are you sure you want to remove this review?')) return;
    try {
      const r = await authFetch(`/api/reviews/${id}`, { method: 'DELETE' });
      if (r.ok) {
        toast.success('Review removed');
        loadReviews();
      } else {
        const d = await r.json().catch(() => ({}));
        toast.error(d.error || 'Failed to remove review');
      }
    } catch (e) {
      console.error(e);
      toast.error('Network error');
    }
  }

  const validateProfile = () => {
    const errs = { name: '', phone: '' };
    let valid = true;
    if (!(profileForm.name || '').trim()) {
      errs.name = 'Must enter your name';
      valid = false;
    }
    const rawDigits = (profileForm.phone || '').toString().replace(/^\+91/, '').replace(/[^0-9]/g, '').slice(0, 10);
    if (!rawDigits || rawDigits.length !== 10) {
      errs.phone = 'Please enter a valid 10-digit mobile number.';
      valid = false;
    }
    setProfileErrors(errs);
    return valid;
  };

  async function saveProfile(e) {
    e.preventDefault();
    if (!validateProfile()) return;
    const rawDigits = (profileForm.phone || '').toString().replace(/^\+91/, '').replace(/[^0-9]/g, '').slice(0, 10);
    setSaving(true);
    const payload = {
      name: profileForm.name.trim(),
      phone: `+91${rawDigits}`
    };
    try {
      const r = await authFetch('/api/auth/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (r.ok) {
        const savedUser = d.user || payload;
        setProfileForm({
          name: savedUser.name || payload.name,
          phone: savedUser.phone || payload.phone
        });
        await refresh(savedUser);
        toast.success('Profile updated');
      } else {
        if (d.error) setProfileErrors(prev => ({ ...prev, phone: d.error }));
        toast.error(d.error || 'Failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  const validateAddrField = (field, val) => {
    let errText = '';
    const cleanVal = (val || '').trim();
    if (field === 'fullName' && !cleanVal) errText = 'Must enter your name';
    if (field === 'phone') {
      const digits = (val || '').toString().replace(/^\+91/, '').replace(/[^0-9]/g, '').slice(0, 10);
      if (!digits) errText = 'Please enter your Mobile number';
      else if (digits.length !== 10) errText = 'Please enter a valid 10-digit Mobile number';
    }
    if (field === 'line1' && !cleanVal) errText = 'Must enter your address';
    if (field === 'city' && !cleanVal) errText = 'Must enter your city';
    if (field === 'state' && !cleanVal) errText = 'Must enter your state';
    if (field === 'pincode') {
      if (!cleanVal) errText = 'Must enter your Pincode';
      else if (!/^\d{6}$/.test(cleanVal)) errText = 'Please enter a valid 6-digit Pincode';
    }
    setAddrErrors(prev => ({ ...prev, [field]: errText }));
    return !errText;
  };

  const validateAllAddr = () => {
    const fields = ['fullName', 'phone', 'line1', 'city', 'state', 'pincode'];
    let valid = true;
    fields.forEach(f => {
      if (!validateAddrField(f, addrForm[f])) valid = false;
    });
    return valid;
  };

  const handleAddNewAddress = () => {
    setEditingAddrId(null);
    setAddrForm({ fullName: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', isDefault: addresses.length === 0 });
    setAddrErrors({});
    setShowAddr(true);
    setTimeout(() => {
      addrFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const handleEditAddress = (addr) => {
    setEditingAddrId(addr.id);
    setAddrForm({
      fullName: addr.fullName || '',
      phone: addr.phone || '',
      line1: addr.line1 || '',
      line2: addr.line2 || '',
      city: addr.city || '',
      state: addr.state || '',
      pincode: addr.pincode || '',
      isDefault: !!addr.isDefault
    });
    setAddrErrors({});
    setShowAddr(true);
    setTimeout(() => {
      addrFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const handleCancelAddrForm = () => {
    setShowAddr(false);
    setEditingAddrId(null);
    setAddrForm({ fullName: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', isDefault: false });
    setAddrErrors({});
  };

  async function saveAddress(e) {
    e.preventDefault();
    if (!validateAllAddr()) return;
    const rawDigits = (addrForm.phone || '').toString().replace(/^\+91/, '').replace(/[^0-9]/g, '').slice(0, 10);
    const payload = {
      ...addrForm,
      phone: `+91${rawDigits}`
    };
    setAddrSaving(true);
    try {
      if (editingAddrId) {
        const r = await authFetch(`/api/addresses/${editingAddrId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const d = await r.json();
        if (r.ok) {
          handleCancelAddrForm();
          await loadAddresses();
          toast.success('Address updated successfully');
        } else {
          toast.error(d.error || 'Failed to update address');
        }
      } else {
        const r = await authFetch('/api/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const d = await r.json();
        if (r.ok) {
          handleCancelAddrForm();
          await loadAddresses();
          toast.success('Address saved successfully');
        } else {
          toast.error(d.error || 'Failed to save address');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred while saving address');
    } finally {
      setAddrSaving(false);
    }
  }

  async function deleteAddress(id) {
    if (!confirm('Are you sure you want to remove this address?')) return;
    try {
      const r = await authFetch(`/api/addresses/${id}`, { method: 'DELETE' });
      if (r.ok) {
        if (editingAddrId === id) {
          handleCancelAddrForm();
        }
        await loadAddresses();
        toast.success('Address removed');
      } else {
        const d = await r.json().catch(() => ({}));
        toast.error(d.error || 'Failed to remove address');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error');
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const errs = { currentPassword: '', newPassword: '', confirmPassword: '' };
    let valid = true;

    if (user?.hasPassword && !pwdForm.currentPassword) {
      errs.currentPassword = 'Must enter your current password';
      valid = false;
    }

    if (!pwdForm.newPassword) {
      errs.newPassword = 'Must enter a new password';
      valid = false;
    } else if (pwdForm.newPassword.length < 6) {
      errs.newPassword = 'Password must be at least 6 characters';
      valid = false;
    }

    if (!pwdForm.confirmPassword) {
      errs.confirmPassword = 'Must confirm your new password';
      valid = false;
    } else if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
      valid = false;
    }

    setPwdErrors(errs);
    if (!valid) return;

    setPwdSaving(true);
    try {
      const res = await changePassword(pwdForm.currentPassword, pwdForm.newPassword, pwdForm.confirmPassword);
      toast.success(res.message || 'Password updated successfully!');
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwdErrors({ currentPassword: '', newPassword: '', confirmPassword: '' });
      await refresh();
    } catch (err) {
      toast.error(err.message || 'Failed to update password');
      if (err.message && err.message.toLowerCase().includes('current password')) {
        setPwdErrors(prev => ({ ...prev, currentPassword: err.message }));
      }
    } finally {
      setPwdSaving(false);
    }
  };

  async function doLogout() { await logout(); toast.success('Signed out'); router.push('/'); }

  if (loading || !user) return <div className="h-96 flex items-center justify-center text-neutral-400"><Loader2 className="animate-spin" /></div>;

  const wishItems = PRODUCTS.filter(p => ids.includes(p.id));
  const tabs = [
    { k: 'profile', n: 'Profile', i: User },
    { k: 'security', n: 'Password & Security', i: Lock },
    { k: 'orders', n: 'Orders', i: Package },
    { k: 'returns', n: 'Returns & Refunds', i: RotateCcw },
    { k: 'reviews', n: 'My Reviews', i: Star },
    { k: 'addresses', n: 'Addresses', i: MapPin },
    { k: 'wishlist', n: 'Wishlist', i: Heart, href: '/wishlist' }
  ];

  return (
    <main className="bg-[#FAF9F5]/40 min-h-screen">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#F7F3EB] via-[#FAF7F2] to-[#FAF9F5]/40 border-b border-[#EAE3D6] py-10 sm:py-14">
        {/* Soft radial ambient glow */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.08),transparent_70%)]" />
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/80 border border-[#9C6B30]/20 shadow-[0_2px_8px_rgba(156,107,48,0.06)] mb-3 text-[10px] sm:text-[11px] tracking-[0.35em] uppercase text-[#9C6B30] font-medium backdrop-blur-sm">
            <Sparkles size={11} className="text-[#9C6B30]" />
            The MikuMantra Circle
          </div>
          <h1 className="font-display text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-light text-[#1A1A1A] tracking-tight break-words">
            Hello, {user.name ? user.name.split(' ')[0] : 'Member'}
          </h1>
          <div className="gold-line w-20 mx-auto my-3.5 opacity-80" />
          <div className="text-xs sm:text-sm text-neutral-500 font-light flex items-center justify-center gap-2 flex-wrap">
            <span>{user.email}</span>
            <span className="text-neutral-300">·</span>
            <span className="text-[#9C6B30] font-medium">Atelier Member</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 sm:py-12 grid md:grid-cols-4 gap-6 md:gap-8">
        <aside className="md:col-span-1">
          <div className="bg-white rounded-2xl border border-[#EAE3D6] shadow-[0_4px_24px_rgba(26,26,26,0.04)] overflow-hidden sticky top-28">
            <div className="p-5 sm:p-6 bg-gradient-to-b from-[#F9F6F0] via-[#FAF7F2] to-white border-b border-[#EAE3D6] text-center sm:text-left flex flex-col items-center sm:items-start">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-[#8C602B] via-[#B88746] to-[#E5C378] p-[2.5px] shadow-[0_4px_16px_rgba(156,107,48,0.2)]">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-[#9C6B30] to-[#B88746] flex items-center justify-center text-white font-serif-luxe text-2xl sm:text-3xl font-light shadow-inner">
                  {user.name[0]?.toUpperCase() || 'M'}
                </div>
              </div>
              <div className="font-serif-luxe text-lg sm:text-xl font-normal mt-3 text-[#1A1A1A] truncate max-w-full tracking-tight">
                {user.name}
              </div>
              <div className="text-xs text-neutral-500 truncate max-w-full font-light">
                {user.email}
              </div>
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-semibold tracking-[0.2em] uppercase bg-[#FAF5EB] text-[#9C6B30] border border-[#9C6B30]/20">
                <Sparkles size={9} /> Atelier Member
              </div>
            </div>

            <nav className="p-2 sm:p-2.5 space-y-1">
              {tabs.map(t => {
                const isActive = tab === t.k;
                if (t.href) {
                  return (
                    <Link
                      key={t.k}
                      href={t.href}
                      className="w-full flex items-center gap-3 px-3.5 py-3 text-xs sm:text-sm rounded-xl text-neutral-600 hover:text-[#1A1A1A] hover:bg-[#FAF8F5] transition-all duration-200 cursor-pointer group"
                    >
                      <t.i size={16} className="shrink-0 text-neutral-400 group-hover:text-[#9C6B30] transition-colors" />
                      <span className="flex-1 text-left font-normal">{t.n}</span>
                      <ChevronRight size={14} className="opacity-40 group-hover:opacity-80 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  );
                }
                return (
                  <button
                    key={t.k}
                    onClick={() => setTab(t.k)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 text-xs sm:text-sm rounded-xl transition-all duration-200 cursor-pointer group ${isActive
                        ? 'bg-gradient-to-r from-[#FAF5EB] to-[#FAF8F5] text-[#9C6B30] font-medium border-l-[3px] border-l-[#9C6B30] shadow-sm'
                        : 'text-neutral-600 hover:text-[#1A1A1A] hover:bg-[#FAF8F5] border-l-[3px] border-l-transparent'
                      }`}
                  >
                    <t.i size={16} className={`shrink-0 transition-colors ${isActive ? 'text-[#9C6B30]' : 'text-neutral-400 group-hover:text-[#9C6B30]'}`} />
                    <span className="flex-1 text-left">{t.n}</span>
                    <ChevronRight size={14} className={`shrink-0 transition-all ${isActive ? 'text-[#9C6B30] opacity-80' : 'opacity-40 group-hover:opacity-80 group-hover:translate-x-0.5'}`} />
                  </button>
                );
              })}

              <div className="pt-2 border-t border-[#EAE3D6]/70 mt-2">
                <button
                  onClick={doLogout}
                  className="w-full flex items-center gap-3 px-3.5 py-3 text-xs sm:text-sm text-red-600/90 hover:text-red-700 hover:bg-red-50/70 rounded-xl transition cursor-pointer font-medium"
                >
                  <LogOut size={16} className="shrink-0 text-red-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </nav>
          </div>
        </aside>

        <section className="md:col-span-3">
          {tab === 'profile' && (
            <div className="bg-white rounded-2xl border border-[#EAE3D6] p-6 sm:p-8 md:p-10 shadow-[0_4px_28px_rgba(26,26,26,0.03)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                <div>
                  <h2 className="font-serif-luxe text-2xl xs:text-3xl text-[#1A1A1A] font-light tracking-tight">
                    Profile Details
                  </h2>
                  <p className="text-xs text-neutral-500 mt-1 font-light">
                    Manage your personal account identity and contact preferences.
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF5EB] text-[#9C6B30] text-[10px] tracking-[0.2em] uppercase font-semibold border border-[#9C6B30]/20 self-start sm:self-auto">
                  <ShieldCheck size={13} /> Verified Member
                </div>
              </div>

              <div className="h-[1.5px] w-14 bg-gradient-to-r from-[#9C6B30] to-[#E5C378] my-5" />

              <form onSubmit={saveProfile} className="space-y-5 max-w-lg" noValidate>
                <div>
                  <label className="block text-[11px] tracking-[0.2em] uppercase font-medium text-neutral-600 mb-1.5">
                    Full Name <span className="text-neutral-400 font-normal">*</span>
                  </label>
                  <input
                    value={profileForm.name}
                    onChange={e => {
                      setProfileForm({ ...profileForm, name: e.target.value });
                      if (profileErrors.name) setProfileErrors(prev => ({ ...prev, name: '' }));
                    }}
                    placeholder="Your complete name"
                    className={`w-full px-4 py-3 bg-[#FAF8F5]/60 hover:bg-white focus:bg-white border rounded-xl text-sm text-[#1A1A1A] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#9C6B30]/10 ${profileErrors.name ? 'border-red-400 bg-red-50/20 focus:border-red-500' : 'border-[#E2DBD1] focus:border-[#9C6B30]'
                      }`}
                  />
                  {profileErrors.name && <p className="text-xs text-red-500 mt-1.5 font-light">{profileErrors.name}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] tracking-[0.2em] uppercase font-medium text-neutral-600">
                      Email Address
                    </label>
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">Primary Login</span>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      value={user.email}
                      disabled
                      className="w-full px-4 py-3 bg-[#F5F2EB]/50 border border-[#E8E2D8] rounded-xl text-sm text-neutral-500 cursor-not-allowed select-none pr-10"
                    />
                    <Lock size={14} className="absolute right-3.5 text-neutral-400 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1.5 font-light">Email address is associated with your authentication account and cannot be modified.</p>
                </div>

                <div>
                  <label className="block text-[11px] tracking-[0.2em] uppercase font-medium text-neutral-600 mb-1.5">
                    Phone Number <span className="text-neutral-400 font-normal">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3 sm:left-3.5 px-2.5 py-1 rounded-lg bg-[#F0EAE1]/80 border border-[#E2DBD1] text-xs font-semibold text-[#6E5530] select-none pointer-events-none z-10 flex items-center gap-1">
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      value={(profileForm.phone || '').toString().replace(/^\+91/, '').replace(/[^0-9]/g, '').slice(0, 10)}
                      onChange={e => {
                        const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                        setProfileForm({ ...profileForm, phone: digits ? `+91${digits}` : '' });
                        if (profileErrors.phone) setProfileErrors(prev => ({ ...prev, phone: '' }));
                      }}
                      placeholder="10-digit mobile number"
                      className={`w-full pl-[5.25rem] pr-4 py-3 bg-[#FAF8F5]/60 hover:bg-white focus:bg-white border rounded-xl text-sm text-[#1A1A1A] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#9C6B30]/10 ${profileErrors.phone ? 'border-red-400 bg-red-50/20 focus:border-red-500' : 'border-[#E2DBD1] focus:border-[#9C6B30]'
                        }`}
                    />
                  </div>
                  {profileErrors.phone && <p className="text-xs text-red-500 mt-1.5 font-light">{profileErrors.phone}</p>}
                </div>

                <div className="pt-2">
                  <button
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-gradient-to-r from-[#1A1A1A] to-[#2B2620] hover:from-[#9C6B30] hover:to-[#B88746] text-white text-[11px] tracking-[0.25em] uppercase font-medium rounded-full shadow-[0_4px_16px_rgba(26,26,26,0.12)] hover:shadow-[0_6px_22px_rgba(156,107,48,0.28)] active:scale-[0.99] transition-all duration-300 disabled:opacity-60 cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Saving Changes…</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {tab === 'security' && (
            <div className="bg-white rounded-2xl border border-[#EAE3D6] p-6 sm:p-8 md:p-10 shadow-[0_4px_28px_rgba(26,26,26,0.03)]">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-1">
                <div>
                  <h2 className="font-serif-luxe text-2xl xs:text-3xl text-[#1A1A1A] font-light tracking-tight">
                    Password & Security
                  </h2>
                  <p className="text-xs text-neutral-500 mt-1 font-light">
                    Ensure your account stays protected with encrypted credentials.
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF5EB] text-[#9C6B30] text-[10px] tracking-[0.2em] uppercase font-semibold border border-[#9C6B30]/20">
                  <ShieldCheck size={13} />
                  Secure Credentials
                </div>
              </div>

              <div className="h-[1.5px] w-14 bg-gradient-to-r from-[#9C6B30] to-[#E5C378] my-5" />

              {!user?.hasPassword && (
                <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#FAF5EB] to-[#FAF8F5] border border-[#9C6B30]/20 text-[#1A1A1A] text-xs leading-relaxed">
                  <div className="font-medium text-[#9C6B30] mb-1 flex items-center gap-2 text-xs tracking-wider uppercase">
                    <ShieldCheck size={15} /> Google Account Connected
                  </div>
                  <p className="text-neutral-600 font-light">
                    You currently sign in using Google. You can set a password below to also enable standard email and password sign-in.
                  </p>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-5 max-w-lg" noValidate>
                {user?.hasPassword && (
                  <div>
                    <label className="block text-[11px] tracking-[0.2em] uppercase font-medium text-neutral-600 mb-1.5">
                      Current Password <span className="text-neutral-400 font-normal">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPwd ? 'text' : 'password'}
                        value={pwdForm.currentPassword}
                        onChange={e => {
                          setPwdForm({ ...pwdForm, currentPassword: e.target.value });
                          if (pwdErrors.currentPassword) setPwdErrors(prev => ({ ...prev, currentPassword: '' }));
                        }}
                        placeholder="••••••••"
                        className={`w-full pr-11 px-4 py-3 bg-[#FAF8F5]/60 hover:bg-white focus:bg-white border rounded-xl text-sm text-[#1A1A1A] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#9C6B30]/10 ${pwdErrors.currentPassword ? 'border-red-400 bg-red-50/20 focus:border-red-500' : 'border-[#E2DBD1] focus:border-[#9C6B30]'
                          }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition"
                        tabIndex={-1}
                      >
                        {showCurrentPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {pwdErrors.currentPassword && <p className="text-xs text-red-500 mt-1.5 font-light">{pwdErrors.currentPassword}</p>}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] tracking-[0.2em] uppercase font-medium text-neutral-600 mb-1.5">
                    {user?.hasPassword ? 'New Password' : 'Create Password'} <span className="text-neutral-400 font-normal">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPwd ? 'text' : 'password'}
                      value={pwdForm.newPassword}
                      onChange={e => {
                        setPwdForm({ ...pwdForm, newPassword: e.target.value });
                        if (pwdErrors.newPassword) setPwdErrors(prev => ({ ...prev, newPassword: '' }));
                      }}
                      placeholder="At least 6 characters"
                      className={`w-full pr-11 px-4 py-3 bg-[#FAF8F5]/60 hover:bg-white focus:bg-white border rounded-xl text-sm text-[#1A1A1A] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#9C6B30]/10 ${pwdErrors.newPassword ? 'border-red-400 bg-red-50/20 focus:border-red-500' : 'border-[#E2DBD1] focus:border-[#9C6B30]'
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPwd(!showNewPwd)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition"
                      tabIndex={-1}
                    >
                      {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {pwdErrors.newPassword && <p className="text-xs text-red-500 mt-1.5 font-light">{pwdErrors.newPassword}</p>}
                </div>

                <div>
                  <label className="block text-[11px] tracking-[0.2em] uppercase font-medium text-neutral-600 mb-1.5">
                    Confirm New Password <span className="text-neutral-400 font-normal">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPwd ? 'text' : 'password'}
                      value={pwdForm.confirmPassword}
                      onChange={e => {
                        setPwdForm({ ...pwdForm, confirmPassword: e.target.value });
                        if (pwdErrors.confirmPassword) setPwdErrors(prev => ({ ...prev, confirmPassword: '' }));
                      }}
                      placeholder="Repeat new password"
                      className={`w-full pr-11 px-4 py-3 bg-[#FAF8F5]/60 hover:bg-white focus:bg-white border rounded-xl text-sm text-[#1A1A1A] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#9C6B30]/10 ${pwdErrors.confirmPassword ? 'border-red-400 bg-red-50/20 focus:border-red-500' : 'border-[#E2DBD1] focus:border-[#9C6B30]'
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition"
                      tabIndex={-1}
                    >
                      {showConfirmPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {pwdErrors.confirmPassword && <p className="text-xs text-red-500 mt-1.5 font-light">{pwdErrors.confirmPassword}</p>}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={pwdSaving}
                    className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-gradient-to-r from-[#1A1A1A] to-[#2B2620] hover:from-[#9C6B30] hover:to-[#B88746] text-white text-[11px] tracking-[0.25em] uppercase font-medium rounded-full shadow-[0_4px_16px_rgba(26,26,26,0.12)] hover:shadow-[0_6px_22px_rgba(156,107,48,0.28)] active:scale-[0.99] transition-all duration-300 disabled:opacity-60 cursor-pointer"
                  >
                    {pwdSaving ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                    <span>{user?.hasPassword ? (pwdSaving ? 'Updating…' : 'Update Password') : (pwdSaving ? 'Setting…' : 'Set Password')}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {tab === 'orders' && (
            <div className="bg-white rounded-2xl border border-[#EAE3D6] p-6 sm:p-8 md:p-10 shadow-[0_4px_28px_rgba(26,26,26,0.03)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                <div>
                  <h2 className="font-serif-luxe text-2xl xs:text-3xl text-[#1A1A1A] font-light tracking-tight">Your Orders</h2>
                  <p className="text-xs text-neutral-500 mt-1 font-light">Track order status, manage returns, and review delivered jewellery.</p>
                </div>
                <button onClick={loadOrders} className="text-xs text-[#9C6B30] hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto font-medium">
                  <RotateCcw size={12} /> Refresh
                </button>
              </div>

              <div className="h-[1.5px] w-14 bg-gradient-to-r from-[#9C6B30] to-[#E5C378] my-5" />

              {orders.length === 0 ? (
                <div className="text-center py-14 sm:py-18">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-[#FAF5EB] border border-[#9C6B30]/20 flex items-center justify-center text-[#9C6B30] mb-4 shadow-sm">
                    <Package size={28} />
                  </div>
                  <div className="font-serif-luxe text-xl text-neutral-800">No orders yet.</div>
                  <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto font-light">
                    Every acquisition arrives in bespoke MikuMantra velvet packaging with certification of authenticity.
                  </p>
                  <Link href="/shop" className="inline-block mt-5 text-[#9C6B30] border-b border-[#9C6B30] pb-1 text-[11px] tracking-[0.25em] uppercase font-medium hover:text-[#7A501F] transition">
                    Explore The Collection
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map(o => {
                    const delivAt = o.deliveredAt ? new Date(o.deliveredAt).getTime() : null;
                    const isEligibleReturn = !o.returnStatus && o.status === 'delivered' && delivAt && (Date.now() - delivAt <= 30 * 60 * 1000);

                    return (
                      <Link
                        key={o.id}
                        href={`/orders/${o.id}`}
                        className="group block border border-[#EAE3D6] rounded-2xl p-5 sm:p-6 hover:border-[#9C6B30] hover:shadow-[0_8px_24px_rgba(156,107,48,0.08)] transition-all duration-300 bg-white"
                      >
                        <div className="flex justify-between items-start flex-wrap gap-3">
                          <div>
                            <div className="text-[10px] tracking-[0.2em] uppercase text-neutral-400 font-medium">Order Number</div>
                            <div className="font-serif-luxe text-lg sm:text-xl text-[#1A1A1A] font-medium group-hover:text-[#9C6B30] transition-colors">{o.orderNumber}</div>
                            <div className="text-xs text-neutral-500 mt-1 font-light">
                              {new Date(o.placedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · {o.items.length} item(s)
                            </div>
                          </div>

                          <div className="text-right flex flex-col items-end gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                              <span className={`inline-block px-3 py-1 text-[9px] sm:text-[10px] tracking-widest uppercase rounded-full capitalize font-semibold border ${o.status === 'cancelled'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-[#FAF5EB] text-[#9C6B30] border-[#9C6B30]/30'
                                }`}>
                                {o.status}
                              </span>

                              {/* Compact Courier Tracking Badge */}
                              {(o.courier?.carrier || o.carrier) && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-semibold tracking-wider rounded-full bg-[#FAF5EB] text-[#9C6B30] border border-[#D4AF37]/30">
                                  <Truck size={11} className="shrink-0" />
                                  <span>{o.courier?.carrier || o.carrier}:</span>
                                  <span className="font-mono font-bold">
                                    {o.courier?.trackingNumber || o.trackingNumber ? `#${o.courier?.trackingNumber || o.trackingNumber}` : 'Pending AWB'}
                                  </span>
                                  {(o.courier?.trackingUrl || o.trackingUrl) && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        window.open(o.courier?.trackingUrl || o.trackingUrl, '_blank', 'noopener,noreferrer');
                                      }}
                                      className="ml-0.5 text-[#9C6B30] underline hover:text-[#7A501F] font-bold cursor-pointer"
                                      title="Open live carrier tracking portal"
                                    >
                                      [Track]
                                    </button>
                                  )}
                                </span>
                              )}
                              {o.returnStatus && (
                                <span className={`inline-block px-2.5 py-0.5 text-[9px] sm:text-[10px] tracking-wider uppercase rounded-full font-semibold border ${o.returnStatus === 'REQUESTED' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                    o.returnStatus === 'APPROVED' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                      o.returnStatus === 'PROCESSING' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                                        o.returnStatus === 'REFUNDED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                          o.returnStatus === 'REJECTED' ? 'bg-red-50 text-red-800 border-red-200' :
                                            'bg-neutral-100 text-neutral-700 border-neutral-200'
                                  }`}>
                                  Return: {o.returnStatus === 'REQUESTED' ? 'Requested' : o.returnStatus}
                                </span>
                              )}
                              {isEligibleReturn && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase rounded-full bg-amber-50 text-amber-900 border border-amber-300">
                                  <Clock size={10} className="text-[#9C6B30]" /> Return Eligible (30m)
                                </span>
                              )}
                              {o.status === 'delivered' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase rounded-full bg-[#FAF5EB] text-[#9C6B30] border border-[#9C6B30]/30 hover:bg-[#9C6B30] hover:text-white transition">
                                  <Star size={10} className="fill-amber-400 stroke-amber-500" /> Rate & Review
                                </span>
                              )}
                            </div>
                            <div className="font-display text-lg sm:text-xl text-[#1A1A1A] font-semibold mt-0.5">
                              {formatINR(o.amounts.total)}
                            </div>
                          </div>
                        </div>

                        {/* Thumbnails preview */}
                        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#F2ECE3] overflow-x-auto">
                          {o.items.slice(0, 5).map((it, i) => (
                            <div key={i} className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-[#EAE3D6] shrink-0 bg-[#FAF8F5]">
                              <img src={it.image} alt={it.name || 'Jewellery Item'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            </div>
                          ))}
                          {o.items.length > 5 && (
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border border-dashed border-[#D2C8BA] flex items-center justify-center text-xs font-medium text-neutral-500 shrink-0 bg-[#FAF8F5]">
                              +{o.items.length - 5}
                            </div>
                          )}
                          <div className="ml-auto text-[11px] text-[#9C6B30] group-hover:underline flex items-center gap-1 shrink-0 font-medium tracking-wider uppercase">
                            View Details <ChevronRight size={13} />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'returns' && (
            <div className="bg-white rounded-2xl border border-[#EAE3D6] p-6 sm:p-8 md:p-10 shadow-[0_4px_28px_rgba(26,26,26,0.03)]">
              <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-2 pb-1">
                <div>
                  <h2 className="font-serif-luxe text-2xl xs:text-3xl text-[#1A1A1A] font-light tracking-tight">Returns & Refunds</h2>
                  <p className="text-xs text-neutral-500 mt-1 font-light">Returns are accepted within 30 minutes of delivery.</p>
                </div>
                <button onClick={loadReturns} className="text-xs text-[#9C6B30] hover:underline flex items-center gap-1 cursor-pointer font-medium">
                  <RotateCcw size={12} /> Refresh
                </button>
              </div>

              <div className="h-[1.5px] w-14 bg-gradient-to-r from-[#9C6B30] to-[#E5C378] my-5" />

              {returnsLoading ? (
                <div className="py-14 flex justify-center text-[#9C6B30]"><Loader2 className="animate-spin" size={24} /></div>
              ) : returnsList.length === 0 ? (
                <div className="text-center py-14 sm:py-18">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-[#FAF5EB] border border-[#9C6B30]/20 flex items-center justify-center text-[#9C6B30] mb-4 shadow-sm">
                    <RotateCcw size={28} />
                  </div>
                  <div className="font-serif-luxe text-xl text-neutral-800">No return requests found.</div>
                  <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto font-light">
                    You can initiate a return for delivered items within 30 minutes of delivery directly from your order page.
                  </p>
                  <button onClick={() => setTab('orders')} className="inline-block mt-5 text-[#9C6B30] border-b border-[#9C6B30] pb-0.5 text-[11px] tracking-[0.25em] uppercase font-medium hover:text-[#7A501F] transition cursor-pointer">
                    View Your Orders
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {returnsList.map(ret => (
                    <div key={ret.id} className="border border-[#EAE3D6] rounded-2xl p-5 sm:p-6 bg-white hover:border-[#9C6B30]/70 transition shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] tracking-widest uppercase text-neutral-400 font-medium">Return ID</span>
                            <span className="font-mono text-xs font-semibold text-neutral-700">{ret.returnId || ret.id}</span>
                          </div>
                          <div className="font-serif-luxe text-lg sm:text-xl text-[#1A1A1A] mt-0.5 font-medium">Order #{ret.orderNumber}</div>
                          <div className="text-xs text-neutral-500 mt-0.5 font-light">
                            Requested on {new Date(ret.requestedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-3 py-1 text-[9px] sm:text-[10px] tracking-widest uppercase rounded-full font-semibold border ${
                            ret.returnStatus === 'REQUESTED' || ret.returnStatus === 'RETURN_REQUESTED' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                            ret.returnStatus === 'APPROVED' || ret.returnStatus === 'RETURN_APPROVED' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                            ret.returnStatus === 'REFUND_DETAILS_SUBMITTED' ? 'bg-teal-50 text-teal-800 border-teal-200' :
                            ret.returnStatus === 'PROCESSING' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                            ret.returnStatus === 'REFUNDED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            ret.returnStatus === 'REJECTED' ? 'bg-red-50 text-red-800 border-red-200' :
                            'bg-neutral-100 text-neutral-700 border-neutral-200'
                          }`}>
                            {ret.returnStatus === 'REQUESTED' || ret.returnStatus === 'RETURN_REQUESTED' ? 'Requested (Awaiting Approval)' :
                             ret.returnStatus === 'APPROVED' || ret.returnStatus === 'RETURN_APPROVED' ? (ret.refundDetails ? 'Approved (Processing)' : 'Approved (Action Required)') :
                             ret.returnStatus === 'REFUND_DETAILS_SUBMITTED' ? 'Details Submitted' : ret.returnStatus}
                          </span>
                          <div className="font-display text-base sm:text-lg text-[#9C6B30] mt-1 font-semibold">
                            Refund: {formatINR(ret.refundAmount || 0)}
                          </div>
                        </div>
                      </div>

                      {/* Refund Details Action Alert */}
                      {['APPROVED', 'RETURN_APPROVED'].includes(ret.returnStatus) && !ret.refundDetails && (
                        <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between flex-wrap gap-2">
                          <span>Return approved! Please submit your UPI or Bank Account details to receive your refund.</span>
                          <Link href={`/orders/${ret.orderId}`} className="font-semibold text-[#9C6B30] hover:underline flex items-center gap-1">
                            Submit Refund Details <ChevronRight size={12} />
                          </Link>
                        </div>
                      )}

                      {/* Refund Details Submitted Badge */}
                      {(ret.refundDetails || ret.returnStatus === 'REFUND_DETAILS_SUBMITTED') && (
                        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between flex-wrap gap-2">
                          <span className="flex items-center gap-1.5 font-medium">
                            <CheckCircle2 size={13} className="text-emerald-600" /> Refund Details Submitted ({ret.refundDetails?.method === 'upi' ? 'UPI' : 'Bank Transfer'})
                          </span>
                          {ret.refundDetails?.accountNumberMasked && (
                            <span className="font-mono text-neutral-700">{ret.refundDetails.accountNumberMasked}</span>
                          )}
                          {ret.refundDetails?.upiId && (
                            <span className="font-mono text-neutral-700">{ret.refundDetails.upiId}</span>
                          )}
                        </div>
                      )}

                      <div className="p-3 bg-[#FAF8F5] border border-[#EAE3D6] rounded-xl text-xs text-neutral-700">
                        <span className="font-medium text-neutral-900">Reason:</span> {ret.reason}
                        {ret.comment && <span className="text-neutral-500 italic"> — &ldquo;{ret.comment}&rdquo;</span>}
                      </div>

                      {ret.rejectionReason && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                          <span className="font-semibold">Rejection Reason:</span> {ret.rejectionReason}
                        </div>
                      )}

                      {ret.gatewayRefundId && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-mono">
                          Refund Ref: {ret.gatewayRefundId}
                        </div>
                      )}

                      {Array.isArray(ret.items) && ret.items.length > 0 && (
                        <div className="flex gap-2.5 overflow-x-auto pt-1">
                          {ret.items.map((it, idx) => (
                            <div key={idx} className="flex items-center gap-2.5 p-2 border border-[#EAE3D6] rounded-xl shrink-0 bg-[#FAF8F5] text-xs">
                              {it.image && <img src={it.image} alt={it.name} className="w-10 h-10 rounded-lg object-cover" />}
                              <div className="max-w-[150px] truncate">
                                <div className="font-medium truncate text-neutral-800">{it.name}</div>
                                <div className="text-[10px] text-neutral-500">Qty: {it.returnQty || it.qty}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {Array.isArray(ret.images) && ret.images.length > 0 && (
                        <div className="pt-1">
                          <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold mb-1.5">Attached Product Photos ({ret.images.length})</div>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {ret.images.map((img, i) => (
                              <a key={i} href={img} target="_blank" rel="noopener noreferrer" className="block w-14 h-14 rounded-lg overflow-hidden border border-[#EAE3D6] shrink-0 hover:opacity-90 transition">
                                <img src={img} alt="Product condition" className="w-full h-full object-cover" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-2 flex justify-end border-t border-[#F2ECE3]">
                        <Link href={`/orders/${ret.orderId}`} className="text-[11px] uppercase tracking-wider text-[#9C6B30] hover:underline font-semibold flex items-center gap-1">
                          View Order Details <ChevronRight size={13} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'reviews' && (
            <div className="bg-white rounded-2xl border border-[#EAE3D6] p-6 sm:p-8 md:p-10 shadow-[0_4px_28px_rgba(26,26,26,0.03)]">
              <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-2 pb-1">
                <div>
                  <h2 className="font-serif-luxe text-2xl xs:text-3xl text-[#1A1A1A] font-light tracking-tight">My Reviews</h2>
                  <p className="text-xs text-neutral-500 mt-1 font-light">Verified reviews you have shared on purchased jewellery.</p>
                </div>
                <button onClick={loadReviews} className="text-xs text-[#9C6B30] hover:underline flex items-center gap-1 cursor-pointer font-medium">
                  <RotateCcw size={12} /> Refresh
                </button>
              </div>

              <div className="h-[1.5px] w-14 bg-gradient-to-r from-[#9C6B30] to-[#E5C378] my-5" />

              {reviewsLoading ? (
                <div className="py-14 flex justify-center text-[#9C6B30]"><Loader2 className="animate-spin" size={24} /></div>
              ) : reviewsList.length === 0 ? (
                <div className="text-center py-14 sm:py-18">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-[#FAF5EB] border border-[#9C6B30]/20 flex items-center justify-center text-[#9C6B30] mb-4 shadow-sm">
                    <Star size={28} className="fill-[#9C6B30]/20 stroke-[#9C6B30]" />
                  </div>
                  <div className="font-serif-luxe text-xl text-neutral-800">No reviews yet.</div>
                  <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto font-light">
                    Once you receive a delivered order, you can rate and review your pieces directly from the order page.
                  </p>
                  <button onClick={() => setTab('orders')} className="inline-block mt-5 text-[#9C6B30] border-b border-[#9C6B30] pb-0.5 text-[11px] tracking-[0.25em] uppercase font-medium hover:text-[#7A501F] transition cursor-pointer">
                    View Delivered Orders
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviewsList.map(r => (
                    <div key={r.id} className="border border-[#EAE3D6] rounded-2xl p-5 sm:p-6 bg-white hover:border-[#9C6B30]/70 transition shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
                      <div className="flex justify-between items-start flex-wrap gap-3">
                        <div className="flex items-center gap-3.5">
                          {r.productImage && (
                            <img src={r.productImage} alt={r.productName || 'Product'} className="w-14 h-14 rounded-xl object-cover border border-[#EAE3D6] shrink-0 bg-[#FAF8F5]" />
                          )}
                          <div>
                            <Link href={`/product/${r.productSlug || r.productId}`} className="font-serif-luxe text-base sm:text-lg text-[#1A1A1A] hover:text-[#9C6B30] font-medium block">
                              {r.productName || 'Jewellery Item'}
                            </Link>
                            <div className="flex items-center gap-2 flex-wrap text-xs text-neutral-500 mt-0.5 font-light">
                              {r.orderNumber && (
                                <Link href={`/orders/${r.orderId}`} className="hover:text-[#9C6B30] font-mono">
                                  Order #{r.orderNumber}
                                </Link>
                              )}
                              <span>·</span>
                              <span>{r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Verified Buyer
                          </span>
                          <span className={`inline-block px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full border ${r.status === 'hidden' ? 'bg-neutral-100 text-neutral-600 border-neutral-200' : 'bg-[#FAF5EB] text-[#9C6B30] border-[#9C6B30]/30'
                            }`}>
                            {r.status || 'published'}
                          </span>
                        </div>
                      </div>

                      {/* Rating & Review Content */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center gap-1.5 text-[#D4AF37]">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} size={15} className={s <= r.rating ? 'fill-[#D4AF37] stroke-[#D4AF37]' : 'text-neutral-300'} />
                          ))}
                          <span className="text-xs font-semibold text-neutral-800 ml-1">{r.rating}.0 / 5</span>
                        </div>

                        {r.title && (
                          <h4 className="font-medium text-sm sm:text-base text-neutral-900 pt-0.5">{r.title}</h4>
                        )}

                        <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed italic bg-[#FAF8F5] p-3 rounded-xl border border-[#EAE3D6]">
                          &ldquo;{r.comment}&rdquo;
                        </p>

                        {Array.isArray(r.images) && r.images.length > 0 && (
                          <div className="flex gap-2.5 pt-1">
                            {r.images.map((imgUrl, i) => (
                              <a key={i} href={imgUrl} target="_blank" rel="noreferrer">
                                <img src={imgUrl} alt="Review attachment" className="w-14 h-14 rounded-xl object-cover border border-[#EAE3D6] hover:scale-105 transition-transform" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="pt-3 border-t border-[#F2ECE3] flex justify-between items-center text-xs">
                        <Link
                          href={`/orders/${r.orderId}?action=review&itemId=${r.productId}`}
                          className="text-[#9C6B30] hover:underline font-medium flex items-center gap-1"
                        >
                          <Star size={12} className="fill-amber-400 stroke-amber-500" /> Edit in Order
                        </Link>
                        <button
                          type="button"
                          onClick={() => deleteCustomerReview(r.id)}
                          className="text-red-600 hover:text-red-800 flex items-center gap-1 cursor-pointer font-medium"
                        >
                          <Trash2 size={12} /> Remove Review
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'addresses' && (
            <div className="bg-white rounded-2xl border border-[#EAE3D6] p-6 sm:p-8 md:p-10 shadow-[0_4px_28px_rgba(26,26,26,0.03)]">
              <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-2 pb-1">
                <div>
                  <h2 className="font-serif-luxe text-2xl xs:text-3xl text-[#1A1A1A] font-light tracking-tight">Saved Addresses</h2>
                  <p className="text-xs text-neutral-500 mt-1 font-light">Manage your shipping and billing destinations for seamless checkout.</p>
                </div>
                <button
                  onClick={handleAddNewAddress}
                  className="flex items-center gap-1.5 text-[11px] tracking-[0.2em] uppercase px-4 py-2 border border-[#1A1A1A] rounded-full hover:bg-[#1A1A1A] hover:text-white transition shrink-0 cursor-pointer font-medium"
                >
                  <Plus size={13} /> Add New Address
                </button>
              </div>

              <div className="h-[1.5px] w-14 bg-gradient-to-r from-[#9C6B30] to-[#E5C378] my-5" />

              {showAddr && (
                <form ref={addrFormRef} onSubmit={saveAddress} className="grid md:grid-cols-2 gap-4 border border-[#EAE3D6] rounded-2xl p-5 sm:p-6 mb-6 bg-gradient-to-br from-[#FAF8F5] to-white shadow-sm" noValidate>
                  <div className="md:col-span-2 flex items-center justify-between pb-3 border-b border-[#EAE3D6]/70">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#9C6B30]"></span>
                      <h3 className="font-serif-luxe text-lg text-[#1A1A1A] font-light">
                        {editingAddrId ? 'Edit Address' : 'Add New Address'}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelAddrForm}
                      className="text-xs text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] tracking-[0.2em] uppercase font-medium text-neutral-600 mb-1.5">Full Name *</label>
                    <input
                      placeholder="Recipient full name"
                      value={addrForm.fullName}
                      onChange={e => {
                        const val = e.target.value;
                        setAddrForm({ ...addrForm, fullName: val });
                        if (addrErrors.fullName) validateAddrField('fullName', val);
                      }}
                      onBlur={e => validateAddrField('fullName', e.target.value)}
                      className={`w-full px-4 py-3 bg-white border rounded-xl text-sm text-[#1A1A1A] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#9C6B30]/10 ${addrErrors.fullName ? 'border-red-400 bg-red-50/20 focus:border-red-500' : 'border-[#E2DBD1] focus:border-[#9C6B30]'
                        }`}
                    />
                    {addrErrors.fullName && <p className="text-xs text-red-500 mt-1.5 font-light">{addrErrors.fullName}</p>}
                  </div>

                  <div>
                    <label className="block text-[11px] tracking-[0.2em] uppercase font-medium text-neutral-600 mb-1.5">Phone Number *</label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 sm:left-3.5 px-2.5 py-1 rounded-lg bg-[#F0EAE1]/80 border border-[#E2DBD1] text-xs font-semibold text-[#6E5530] select-none pointer-events-none z-10 flex items-center gap-1">
                        <span>🇮🇳</span>
                        <span>+91</span>
                      </div>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        value={(addrForm.phone || '').toString().replace(/^\+91/, '').replace(/[^0-9]/g, '').slice(0, 10)}
                        onChange={e => {
                          const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                          setAddrForm({ ...addrForm, phone: digits ? `+91${digits}` : '' });
                          if (addrErrors.phone) validateAddrField('phone', digits);
                        }}
                        onBlur={e => validateAddrField('phone', e.target.value)}
                        className={`w-full pl-[5.25rem] pr-4 py-3 bg-white border rounded-xl text-sm text-[#1A1A1A] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#9C6B30]/10 ${addrErrors.phone ? 'border-red-400 bg-red-50/20 focus:border-red-500' : 'border-[#E2DBD1] focus:border-[#9C6B30]'
                          }`}
                      />
                    </div>
                    {addrErrors.phone && <p className="text-xs text-red-500 mt-1.5 font-light">{addrErrors.phone}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] tracking-[0.2em] uppercase font-medium text-neutral-600 mb-1.5">Address Line 1 *</label>
                    <input
                      placeholder="House / Flat / Building / Street"
                      value={addrForm.line1}
                      onChange={e => {
                        const val = e.target.value;
                        setAddrForm({ ...addrForm, line1: val });
                        if (addrErrors.line1) validateAddrField('line1', val);
                      }}
                      onBlur={e => validateAddrField('line1', e.target.value)}
                      className={`w-full px-4 py-3 bg-white border rounded-xl text-sm text-[#1A1A1A] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#9C6B30]/10 ${addrErrors.line1 ? 'border-red-400 bg-red-50/20 focus:border-red-500' : 'border-[#E2DBD1] focus:border-[#9C6B30]'
                        }`}
                    />
                    {addrErrors.line1 && <p className="text-xs text-red-500 mt-1.5 font-light">{addrErrors.line1}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] tracking-[0.2em] uppercase font-medium text-neutral-600 mb-1.5">Address Line 2 (Optional)</label>
                    <input
                      placeholder="Apartment, suite, landmark, etc."
                      value={addrForm.line2}
                      onChange={e => setAddrForm({ ...addrForm, line2: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-[#E2DBD1] rounded-xl text-sm text-[#1A1A1A] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#9C6B30]/10 focus:border-[#9C6B30]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] tracking-[0.2em] uppercase font-medium text-neutral-600 mb-1.5">City *</label>
                    <input
                      placeholder="City / District"
                      value={addrForm.city}
                      onChange={e => {
                        const val = e.target.value;
                        setAddrForm({ ...addrForm, city: val });
                        if (addrErrors.city) validateAddrField('city', val);
                      }}
                      onBlur={e => validateAddrField('city', e.target.value)}
                      className={`w-full px-4 py-3 bg-white border rounded-xl text-sm text-[#1A1A1A] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#9C6B30]/10 ${addrErrors.city ? 'border-red-400 bg-red-50/20 focus:border-red-500' : 'border-[#E2DBD1] focus:border-[#9C6B30]'
                        }`}
                    />
                    {addrErrors.city && <p className="text-xs text-red-500 mt-1.5 font-light">{addrErrors.city}</p>}
                  </div>

                  <div>
                    <label className="block text-[11px] tracking-[0.2em] uppercase font-medium text-neutral-600 mb-1.5">State *</label>
                    <input
                      placeholder="State / Province"
                      value={addrForm.state}
                      onChange={e => {
                        const val = e.target.value;
                        setAddrForm({ ...addrForm, state: val });
                        if (addrErrors.state) validateAddrField('state', val);
                      }}
                      onBlur={e => validateAddrField('state', e.target.value)}
                      className={`w-full px-4 py-3 bg-white border rounded-xl text-sm text-[#1A1A1A] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#9C6B30]/10 ${addrErrors.state ? 'border-red-400 bg-red-50/20 focus:border-red-500' : 'border-[#E2DBD1] focus:border-[#9C6B30]'
                        }`}
                    />
                    {addrErrors.state && <p className="text-xs text-red-500 mt-1.5 font-light">{addrErrors.state}</p>}
                  </div>

                  <div>
                    <label className="block text-[11px] tracking-[0.2em] uppercase font-medium text-neutral-600 mb-1.5">Pincode *</label>
                    <input
                      placeholder="6-digit postal code"
                      value={addrForm.pincode}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                        setAddrForm({ ...addrForm, pincode: val });
                        if (addrErrors.pincode) validateAddrField('pincode', val);
                      }}
                      onBlur={e => validateAddrField('pincode', e.target.value)}
                      className={`w-full px-4 py-3 bg-white border rounded-xl text-sm text-[#1A1A1A] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#9C6B30]/10 ${addrErrors.pincode ? 'border-red-400 bg-red-50/20 focus:border-red-500' : 'border-[#E2DBD1] focus:border-[#9C6B30]'
                        }`}
                    />
                    {addrErrors.pincode && <p className="text-xs text-red-500 mt-1.5 font-light">{addrErrors.pincode}</p>}
                  </div>

                  <div className="flex items-center md:items-end pb-3">
                    <label className="flex items-center gap-2.5 text-xs sm:text-sm text-neutral-700 cursor-pointer select-none">
                      <input type="checkbox" checked={addrForm.isDefault} onChange={e => setAddrForm({ ...addrForm, isDefault: e.target.checked })} className="accent-[#9C6B30] w-4 h-4 rounded" />
                      <span>Set as default shipping address</span>
                    </label>
                  </div>

                  <div className="md:col-span-2 flex gap-3 justify-end pt-2">
                    <button type="button" onClick={handleCancelAddrForm} className="px-5 py-2.5 text-xs text-neutral-500 hover:text-neutral-800 transition cursor-pointer">Cancel</button>
                    <button
                      type="submit"
                      disabled={addrSaving}
                      className="px-7 py-2.5 bg-[#1A1A1A] text-white text-[11px] tracking-[0.2em] uppercase rounded-full hover:bg-[#9C6B30] transition cursor-pointer font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {addrSaving && <Loader2 className="animate-spin" size={13} />}
                      {editingAddrId ? 'Update Address' : 'Save Address'}
                    </button>
                  </div>
                </form>
              )}

              {addresses.length === 0 && !showAddr && (
                <div className="text-center py-14 sm:py-18">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-[#FAF5EB] border border-[#9C6B30]/20 flex items-center justify-center text-[#9C6B30] mb-4 shadow-sm">
                    <MapPin size={28} />
                  </div>
                  <div className="font-serif-luxe text-xl text-neutral-800">No addresses saved yet.</div>
                  <p className="text-xs text-neutral-500 mt-1 font-light">Add an address for seamless doorstep delivery of your jewellery.</p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                {addresses.map(a => (
                  <div
                    key={a.id}
                    className={`border rounded-2xl p-5 sm:p-6 relative bg-gradient-to-br transition shadow-[0_2px_12px_rgba(0,0,0,0.02)] ${editingAddrId === a.id
                        ? 'border-[#9C6B30] bg-[#FAF8F5] ring-2 ring-[#9C6B30]/20'
                        : 'border-[#EAE3D6] from-white to-[#FAF8F5]/60 hover:border-[#9C6B30]'
                      }`}
                  >
                    {a.isDefault && (
                      <span className="absolute top-4 right-4 text-[9px] tracking-widest uppercase text-[#9C6B30] bg-[#FAF5EB] border border-[#9C6B30]/30 px-2.5 py-0.5 rounded-full font-semibold">
                        Default
                      </span>
                    )}
                    <div className="font-medium text-[#1A1A1A] text-sm sm:text-base">{a.fullName}</div>
                    <div className="text-xs sm:text-sm text-neutral-600 mt-1.5 leading-relaxed font-light">
                      {a.line1}{a.line2 ? ', ' + a.line2 : ''}<br />{a.city}, {a.state} — {a.pincode}
                    </div>
                    <div className="text-xs text-neutral-500 mt-2 font-light">Phone: {a.phone}</div>

                    <div className="mt-4 pt-3 border-t border-[#EAE3D6]/70 flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => handleEditAddress(a)}
                        className="text-xs text-[#9C6B30] hover:text-[#7A5222] hover:underline flex items-center gap-1.5 cursor-pointer font-medium transition"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAddress(a.id)}
                        className="text-xs text-red-600 hover:text-red-800 hover:underline flex items-center gap-1.5 cursor-pointer font-medium transition"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'wishlist' && (
            <div className="bg-white rounded-2xl border border-[#EAE3D6] p-8 sm:p-12 text-center space-y-3 shadow-[0_4px_28px_rgba(26,26,26,0.03)]">
              <Loader2 className="animate-spin text-[#9C6B30] mx-auto" size={32} />
              <p className="text-sm text-neutral-500 font-serif-luxe">Redirecting to your Wishlist…</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
