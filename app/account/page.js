'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, authFetch } from '@/lib/use-auth';
import { useWishlist } from '@/lib/cart-store';
import { PRODUCTS, formatINR } from '@/lib/products';
import { User, MapPin, Package, Heart, LogOut, Loader2, Plus, Trash2, ChevronRight, ShieldCheck, Lock, Eye, EyeOff, KeyRound, RotateCcw, Clock, Star, Truck } from 'lucide-react';
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
    if (user) {
      setProfileForm({ name: user.name || '', phone: user.phone || '' });
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
    const r = await authFetch('/api/auth/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const d = await r.json();
    if (r.ok) {
      await refresh();
      toast.success('Profile updated');
    } else {
      if (d.error) setProfileErrors(prev => ({ ...prev, phone: d.error }));
      toast.error(d.error || 'Failed');
    }
    setSaving(false);
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

  async function addAddress(e) {
    e.preventDefault();
    if (!validateAllAddr()) return;
    const rawDigits = (addrForm.phone || '').toString().replace(/^\+91/, '').replace(/[^0-9]/g, '').slice(0, 10);
    const payload = {
      ...addrForm,
      phone: `+91${rawDigits}`
    };
    const r = await authFetch('/api/addresses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const d = await r.json(); if (r.ok) { setShowAddr(false); setAddrForm({ fullName: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', isDefault: false }); setAddrErrors({}); loadAddresses(); toast.success('Address saved'); } else toast.error(d.error || 'Failed');
  }

  async function deleteAddress(id) { const r = await authFetch(`/api/addresses/${id}`, { method: 'DELETE' }); if (r.ok) { loadAddresses(); toast.success('Removed'); } }

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
    { k: 'wishlist', n: 'Wishlist', i: Heart }
  ];

  return (
    <main className="bg-white min-h-screen">
      <div className="bg-[#FAF6EF]/60 py-8 sm:py-12 border-b border-[#E8E8E8]">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 text-center">
          <div className="text-[10px] sm:text-[11px] tracking-[0.35em] uppercase text-[#9C6B30] mb-2">The MikuMantra Circle</div>
          <h1 className="font-display text-2xl xs:text-3xl md:text-5xl font-light text-[#1A1A1A] break-words">Hello, {user.name.split(' ')[0]}</h1>
          <div className="gold-line w-16 mx-auto my-4" />
          <div className="text-xs sm:text-sm text-neutral-500">{user.email}</div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 sm:py-10 grid md:grid-cols-4 gap-6 md:gap-8">
        <aside className="md:col-span-1">
          <div className="border border-[#E8E8E8] rounded-xl overflow-hidden sticky top-32">
            <div className="p-4 sm:p-6 bg-gradient-to-br from-[#FAF6EF] to-white">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-[#9C6B30] to-[#D4AF37] flex items-center justify-center text-white font-display text-xl sm:text-2xl">{user.name[0]?.toUpperCase()}</div>
              <div className="font-serif-luxe text-lg sm:text-xl mt-3 text-[#1A1A1A] truncate">{user.name}</div>
              <div className="text-xs text-neutral-500 mt-0.5 truncate">{user.email}</div>
            </div>
            <nav>
              {tabs.map(t => (
                <button key={t.k} onClick={() => setTab(t.k)} className={`w-full flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-3.5 text-xs sm:text-sm border-t border-[#E8E8E8] transition ${tab === t.k ? 'bg-[#FAF6EF] text-[#9C6B30] font-medium' : 'text-neutral-600 hover:bg-[#FAF6EF]/50'}`}>
                  <t.i size={16} className="shrink-0" /><span className="flex-1 text-left">{t.n}</span><ChevronRight size={14} className="opacity-40 shrink-0" />
                </button>
              ))}
              <button onClick={doLogout} className="w-full flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-3.5 text-xs sm:text-sm border-t border-[#E8E8E8] text-red-600 hover:bg-red-50"><LogOut size={16} className="shrink-0" />Sign Out</button>
            </nav>
          </div>
        </aside>

        <section className="md:col-span-3">
          {tab === 'profile' && (
            <div className="border border-[#E8E8E8] rounded-xl p-4 sm:p-6 md:p-8">
              <div className="font-display text-xl xs:text-2xl sm:text-3xl text-[#1A1A1A] mb-1">Profile Details</div>
              <div className="gold-line w-12 mb-6" />
              <form onSubmit={saveProfile} className="space-y-4 max-w-md" noValidate>
                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500">Full Name</label>
                  <input
                    value={profileForm.name}
                    onChange={e => {
                      setProfileForm({ ...profileForm, name: e.target.value });
                      if (profileErrors.name) setProfileErrors(prev => ({ ...prev, name: '' }));
                    }}
                    className={`w-full mt-1 px-3 sm:px-4 py-2.5 sm:py-3 border ${profileErrors.name ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-md text-sm focus:outline-none focus:border-[#9C6B30]`}
                  />
                  {profileErrors.name && <p className="text-xs text-red-500 mt-1">{profileErrors.name}</p>}
                </div>

                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500">Email</label>
                  <input value={user.email} disabled className="w-full mt-1 px-3 sm:px-4 py-2.5 sm:py-3 border border-[#E8E8E8] rounded-md text-sm bg-neutral-50" />
                </div>

                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500">Phone</label>
                  <div className="relative flex items-center mt-1">
                    <span className="absolute left-3.5 sm:left-4 text-neutral-500 font-semibold text-sm select-none pointer-events-none z-10">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={(profileForm.phone || '').toString().replace(/^\+91/, '').replace(/[^0-9]/g, '').slice(0, 10)}
                      onChange={e => {
                        const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                        setProfileForm({ ...profileForm, phone: digits ? `+91${digits}` : '' });
                        if (profileErrors.phone) setProfileErrors(prev => ({ ...prev, phone: '' }));
                      }}
                      placeholder="Enter your mobile number"
                      className={`w-full pl-12 pr-4 py-2.5 sm:py-3 border ${profileErrors.phone ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-md text-sm focus:outline-none focus:border-[#9C6B30]`}
                    />
                  </div>
                  {profileErrors.phone && <p className="text-xs text-red-500 mt-1">{profileErrors.phone}</p>}
                </div>
                <button disabled={saving} className="px-6 sm:px-8 py-2.5 sm:py-3 bg-[#1A1A1A] text-white text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] uppercase rounded-md hover:bg-[#9C6B30] disabled:opacity-60 cursor-pointer">{saving ? 'Saving…' : 'Save Changes'}</button>
              </form>
            </div>
          )}

          {tab === 'security' && (
            <div className="border border-[#E8E8E8] rounded-xl p-4 sm:p-6 md:p-8">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                <div className="font-display text-xl xs:text-2xl sm:text-3xl text-[#1A1A1A]">Password & Security</div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF6EF] text-[#9C6B30] text-[10px] tracking-wider uppercase font-semibold">
                  <ShieldCheck size={13} />
                  Secure Credentials
                </div>
              </div>
              <div className="gold-line w-12 mb-6" />

              {!user?.hasPassword && (
                <div className="mb-6 p-4 rounded-xl bg-[#FAF6EF] border border-[#9C6B30]/20 text-[#1A1A1A] text-xs leading-relaxed">
                  <div className="font-semibold text-[#9C6B30] mb-1 flex items-center gap-1.5">
                    <ShieldCheck size={15} /> Google Account Connected
                  </div>
                  You currently sign in using Google. You can set a password below to also enable standard email and password sign-in.
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-5 max-w-md" noValidate>
                {user?.hasPassword && (
                  <div>
                    <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-medium block mb-1">
                      Current Password
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
                        className={`w-full pr-10 px-3 sm:px-4 py-2.5 sm:py-3 border ${pwdErrors.currentPassword ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-md text-sm focus:outline-none focus:border-[#9C6B30]`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                        tabIndex={-1}
                      >
                        {showCurrentPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {pwdErrors.currentPassword && <p className="text-xs text-red-500 mt-1">{pwdErrors.currentPassword}</p>}
                  </div>
                )}

                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-medium block mb-1">
                    {user?.hasPassword ? 'New Password' : 'Create Password'}
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
                      className={`w-full pr-10 px-3 sm:px-4 py-2.5 sm:py-3 border ${pwdErrors.newPassword ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-md text-sm focus:outline-none focus:border-[#9C6B30]`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPwd(!showNewPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                      tabIndex={-1}
                    >
                      {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {pwdErrors.newPassword && <p className="text-xs text-red-500 mt-1">{pwdErrors.newPassword}</p>}
                </div>

                <div>
                  <label className="text-[10px] tracking-widest uppercase text-neutral-500 font-medium block mb-1">
                    Confirm New Password
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
                      className={`w-full pr-10 px-3 sm:px-4 py-2.5 sm:py-3 border ${pwdErrors.confirmPassword ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-md text-sm focus:outline-none focus:border-[#9C6B30]`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                      tabIndex={-1}
                    >
                      {showConfirmPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {pwdErrors.confirmPassword && <p className="text-xs text-red-500 mt-1">{pwdErrors.confirmPassword}</p>}
                </div>

                <button
                  type="submit"
                  disabled={pwdSaving}
                  className="px-6 sm:px-8 py-2.5 sm:py-3 bg-[#1A1A1A] text-white text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] uppercase rounded-md hover:bg-[#9C6B30] disabled:opacity-60 cursor-pointer flex items-center gap-2 transition"
                >
                  {pwdSaving ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                  {user?.hasPassword ? (pwdSaving ? 'Updating…' : 'Update Password') : (pwdSaving ? 'Setting…' : 'Set Password')}
                </button>
              </form>
            </div>
          )}

          {tab === 'orders' && (
            <div className="border border-[#E8E8E8] rounded-xl p-4 sm:p-6 md:p-8">
              <div className="font-display text-xl xs:text-2xl sm:text-3xl text-[#1A1A1A] mb-1">Your Orders</div>
              <div className="gold-line w-12 mb-6" />
              {orders.length === 0 ? (
                <div className="text-center py-12 sm:py-16"><div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-full bg-[#FAF6EF] flex items-center justify-center text-[#9C6B30] mb-4"><Package size={24} /></div><div className="font-serif-luxe text-base sm:text-lg text-neutral-500">No orders yet.</div><Link href="/shop" className="inline-block mt-4 text-[#9C6B30] border-b border-[#9C6B30] pb-1 text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] uppercase">Start shopping</Link></div>
              ) : (
                <div className="space-y-4">{orders.map(o => {
                  const delivAt = o.deliveredAt ? new Date(o.deliveredAt).getTime() : null;
                  const isEligibleReturn = !o.returnStatus && o.status === 'delivered' && delivAt && (Date.now() - delivAt <= 30 * 60 * 1000);

                  return (
                    <Link key={o.id} href={`/orders/${o.id}`} className="block border border-[#E8E8E8] rounded-lg p-4 sm:p-5 hover:border-[#9C6B30] transition">
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                          <div className="text-[10px] tracking-widest uppercase text-neutral-400">Order</div>
                          <div className="font-serif-luxe text-base sm:text-lg text-[#1A1A1A]">{o.orderNumber}</div>
                          <div className="text-xs text-neutral-500 mt-1">{new Date(o.placedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · {o.items.length} item(s)</div>
                          {o.status === 'shipped' && (o.courier?.trackingNumber || o.trackingNumber) && (
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAF6EF] text-[#9C6B30] font-sans font-semibold text-[10px] uppercase border border-[#D4AF37]/30">
                                <Truck size={11} /> {o.courier?.carrier || o.carrier || 'Courier'}: <span className="font-mono">{o.courier?.trackingNumber || o.trackingNumber}</span>
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="text-right flex flex-col items-end gap-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            <span className={`inline-block px-3 py-1 text-[9px] sm:text-[10px] tracking-widest uppercase rounded-full capitalize font-semibold ${o.status === 'cancelled' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-[#FAF6EF] text-[#9C6B30]'}`}>{o.status}</span>
                            {o.returnStatus && (
                              <span className={`inline-block px-2.5 py-0.5 text-[9px] sm:text-[10px] tracking-wider uppercase rounded-full font-semibold border ${
                                o.returnStatus === 'REQUESTED' ? 'bg-amber-50 text-amber-800 border-amber-200' :
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
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                <Clock size={10} className="text-[#9C6B30]" /> Return Eligible (30m)
                              </span>
                            )}
                            {o.status === 'delivered' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase rounded-full bg-[#FAF6EF] text-[#9C6B30] border border-[#9C6B30]/30 hover:bg-[#9C6B30] hover:text-white transition">
                                <Star size={10} className="fill-amber-400 stroke-amber-500" /> Rate & Review
                              </span>
                            )}
                          </div>
                          <div className="font-display text-lg sm:text-xl text-[#1A1A1A] mt-0.5">{formatINR(o.amounts.total)}</div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4 overflow-x-auto">{o.items.slice(0, 4).map((it, i) => (<img key={i} src={it.image} className="w-12 h-12 sm:w-14 sm:h-14 rounded-md object-cover shrink-0" />))}</div>
                    </Link>
                  );
                })}</div>
              )}
            </div>
          )}

          {tab === 'returns' && (
            <div className="border border-[#E8E8E8] rounded-xl p-4 sm:p-6 md:p-8">
              <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-2 mb-1">
                <div>
                  <div className="font-display text-xl xs:text-2xl sm:text-3xl text-[#1A1A1A]">Returns & Refunds</div>
                  <p className="text-xs text-neutral-500 mt-1">Returns are accepted within 30 minutes of delivery.</p>
                </div>
                <button onClick={loadReturns} className="text-xs text-[#9C6B30] hover:underline flex items-center gap-1 cursor-pointer">
                  <RotateCcw size={12} /> Refresh
                </button>
              </div>
              <div className="gold-line w-12 mb-6" />

              {returnsLoading ? (
                <div className="py-12 flex justify-center text-[#9C6B30]"><Loader2 className="animate-spin" size={24} /></div>
              ) : returnsList.length === 0 ? (
                <div className="text-center py-12 sm:py-16">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-full bg-[#FAF6EF] flex items-center justify-center text-[#9C6B30] mb-4">
                    <RotateCcw size={24} />
                  </div>
                  <div className="font-serif-luxe text-base sm:text-lg text-neutral-700">No return requests found.</div>
                  <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                    You can initiate a return for delivered items within 30 minutes of delivery directly from your order page.
                  </p>
                  <button onClick={() => setTab('orders')} className="inline-block mt-4 text-[#9C6B30] border-b border-[#9C6B30] pb-0.5 text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] uppercase cursor-pointer">
                    View Your Orders
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {returnsList.map(ret => (
                    <div key={ret.id} className="border border-[#E8E8E8] rounded-xl p-4 sm:p-5 bg-white hover:border-[#9C6B30]/60 transition space-y-3">
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] tracking-widest uppercase text-neutral-400">Return ID</span>
                            <span className="font-mono text-xs font-semibold text-neutral-700">{ret.returnId || ret.id}</span>
                          </div>
                          <div className="font-serif-luxe text-base sm:text-lg text-[#1A1A1A] mt-0.5">Order #{ret.orderNumber}</div>
                          <div className="text-xs text-neutral-500 mt-0.5">
                            Requested on {new Date(ret.requestedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-3 py-1 text-[9px] sm:text-[10px] tracking-widest uppercase rounded-full font-semibold border ${
                            ret.returnStatus === 'REQUESTED' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                            ret.returnStatus === 'APPROVED' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                            ret.returnStatus === 'PROCESSING' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                            ret.returnStatus === 'REFUNDED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            ret.returnStatus === 'REJECTED' ? 'bg-red-50 text-red-800 border-red-200' :
                            'bg-neutral-100 text-neutral-700 border-neutral-200'
                          }`}>
                            {ret.returnStatus === 'REQUESTED' ? 'Requested (Under Review)' : ret.returnStatus}
                          </span>
                          <div className="font-display text-base sm:text-lg text-[#9C6B30] mt-1 font-semibold">
                            Refund: {formatINR(ret.refundAmount || 0)}
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5 bg-[#FAF6EF]/50 rounded-lg text-xs text-neutral-700">
                        <span className="font-medium text-neutral-900">Reason:</span> {ret.reason}
                        {ret.comment && <span className="text-neutral-500 italic"> — "{ret.comment}"</span>}
                      </div>

                      {ret.rejectionReason && (
                        <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                          <span className="font-semibold">Rejection Reason:</span> {ret.rejectionReason}
                        </div>
                      )}

                      {ret.gatewayRefundId && (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 font-mono">
                          Refund Ref: {ret.gatewayRefundId}
                        </div>
                      )}

                      {Array.isArray(ret.items) && ret.items.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pt-1">
                          {ret.items.map((it, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-1.5 border border-neutral-200 rounded-md shrink-0 bg-neutral-50 text-xs">
                              {it.image && <img src={it.image} alt={it.name} className="w-8 h-8 rounded object-cover" />}
                              <div className="max-w-[140px] truncate">
                                <div className="font-medium truncate">{it.name}</div>
                                <div className="text-[10px] text-neutral-500">Qty: {it.returnQty || it.qty}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="pt-2 flex justify-end">
                        <Link href={`/orders/${ret.orderId}`} className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#9C6B30] hover:underline font-semibold flex items-center gap-1">
                          View Order Details <ChevronRight size={12} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'reviews' && (
            <div className="border border-[#E8E8E8] rounded-xl p-4 sm:p-6 md:p-8">
              <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-2 mb-1">
                <div>
                  <div className="font-display text-xl xs:text-2xl sm:text-3xl text-[#1A1A1A]">My Reviews</div>
                  <p className="text-xs text-neutral-500 mt-1">Verified reviews you have shared on purchased jewellery.</p>
                </div>
                <button onClick={loadReviews} className="text-xs text-[#9C6B30] hover:underline flex items-center gap-1 cursor-pointer">
                  <RotateCcw size={12} /> Refresh
                </button>
              </div>
              <div className="gold-line w-12 mb-6" />

              {reviewsLoading ? (
                <div className="py-12 flex justify-center text-[#9C6B30]"><Loader2 className="animate-spin" size={24} /></div>
              ) : reviewsList.length === 0 ? (
                <div className="text-center py-12 sm:py-16">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-full bg-[#FAF6EF] flex items-center justify-center text-[#9C6B30] mb-4">
                    <Star size={24} className="fill-[#9C6B30]/20 stroke-[#9C6B30]" />
                  </div>
                  <div className="font-serif-luxe text-base sm:text-lg text-neutral-700">No reviews yet.</div>
                  <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                    Once you receive a delivered order, you can rate and review your pieces directly from the order page.
                  </p>
                  <button onClick={() => setTab('orders')} className="inline-block mt-4 text-[#9C6B30] border-b border-[#9C6B30] pb-0.5 text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] uppercase cursor-pointer">
                    View Delivered Orders
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviewsList.map(r => (
                    <div key={r.id} className="border border-[#E8E8E8] rounded-xl p-4 sm:p-5 bg-white hover:border-[#9C6B30]/60 transition space-y-3">
                      <div className="flex justify-between items-start flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          {r.productImage && (
                            <img src={r.productImage} alt={r.productName || 'Product'} className="w-14 h-14 rounded-lg object-cover border border-[#E8E8E8] shrink-0" />
                          )}
                          <div>
                            <Link href={`/product/${r.productSlug || r.productId}`} className="font-serif-luxe text-base sm:text-lg text-[#1A1A1A] hover:text-[#9C6B30] font-medium block">
                              {r.productName || 'Jewellery Item'}
                            </Link>
                            <div className="flex items-center gap-2 flex-wrap text-xs text-neutral-500 mt-0.5">
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
                          <span className={`inline-block px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full border ${
                            r.status === 'hidden' ? 'bg-neutral-100 text-neutral-600 border-neutral-200' : 'bg-[#FAF6EF] text-[#9C6B30] border-[#9C6B30]/30'
                          }`}>
                            {r.status || 'published'}
                          </span>
                        </div>
                      </div>

                      {/* Rating & Review Content */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center gap-1.5 text-[#D4AF37]">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} size={14} className={s <= r.rating ? 'fill-[#D4AF37] stroke-[#D4AF37]' : 'text-neutral-300'} />
                          ))}
                          <span className="text-xs font-semibold text-neutral-800 ml-1">{r.rating}.0 / 5</span>
                        </div>

                        {r.title && (
                          <h4 className="font-medium text-sm sm:text-base text-neutral-900 pt-0.5">{r.title}</h4>
                        )}

                        <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed italic">
                          &ldquo;{r.comment}&rdquo;
                        </p>

                        {Array.isArray(r.images) && r.images.length > 0 && (
                          <div className="flex gap-2 pt-2">
                            {r.images.map((imgUrl, i) => (
                              <a key={i} href={imgUrl} target="_blank" rel="noreferrer">
                                <img src={imgUrl} alt="Review attachment" className="w-14 h-14 rounded-md object-cover border border-[#E8E8E8]" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 border-t border-[#E8E8E8] flex justify-between items-center text-xs">
                        <Link
                          href={`/orders/${r.orderId}?action=review&itemId=${r.productId}`}
                          className="text-[#9C6B30] hover:underline font-medium flex items-center gap-1"
                        >
                          <Star size={12} className="fill-amber-400 stroke-amber-500" /> Edit in Order
                        </Link>
                        <button
                          type="button"
                          onClick={() => deleteCustomerReview(r.id)}
                          className="text-red-600 hover:text-red-800 flex items-center gap-1 cursor-pointer"
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
            <div className="border border-[#E8E8E8] rounded-xl p-4 sm:p-6 md:p-8">
              <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-2 mb-1">
                <div className="font-display text-xl xs:text-2xl sm:text-3xl text-[#1A1A1A]">Saved Addresses</div>
                <button onClick={() => setShowAddr(true)} className="flex items-center gap-1.5 text-[10px] sm:text-[11px] tracking-widest uppercase px-3.5 py-1.5 sm:px-4 sm:py-2 border border-[#1A1A1A] rounded-full hover:bg-[#1A1A1A] hover:text-white transition shrink-0"><Plus size={13} /> Add New</button>
              </div>
              <div className="gold-line w-12 mb-6" />
              {showAddr && (
                <form onSubmit={addAddress} className="grid md:grid-cols-2 gap-3 border border-[#E8E8E8] rounded-lg p-4 sm:p-5 mb-5 bg-[#FAF6EF]/40" noValidate>
                  <div>
                    <input
                      placeholder="Full name *"
                      value={addrForm.fullName}
                      onChange={e => {
                        const val = e.target.value;
                        setAddrForm({ ...addrForm, fullName: val });
                        if (addrErrors.fullName) validateAddrField('fullName', val);
                      }}
                      onBlur={e => validateAddrField('fullName', e.target.value)}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border ${addrErrors.fullName ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-md text-sm focus:outline-none focus:border-[#9C6B30]`}
                    />
                    {addrErrors.fullName && <p className="text-xs text-red-500 mt-1">{addrErrors.fullName}</p>}
                  </div>

                  <div>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 sm:left-4 text-neutral-500 font-semibold text-sm select-none pointer-events-none z-10">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="Enter your mobile number *"
                        value={(addrForm.phone || '').toString().replace(/^\+91/, '').replace(/[^0-9]/g, '').slice(0, 10)}
                        onChange={e => {
                          const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                          setAddrForm({ ...addrForm, phone: digits ? `+91${digits}` : '' });
                          if (addrErrors.phone) validateAddrField('phone', digits);
                        }}
                        onBlur={e => validateAddrField('phone', e.target.value)}
                        className={`w-full pl-12 pr-3 sm:pr-4 py-2 sm:py-2.5 border ${addrErrors.phone ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-md text-sm focus:outline-none focus:border-[#9C6B30]`}
                      />
                    </div>
                    {addrErrors.phone && <p className="text-xs text-red-500 mt-1">{addrErrors.phone}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <input
                      placeholder="Address line 1 *"
                      value={addrForm.line1}
                      onChange={e => {
                        const val = e.target.value;
                        setAddrForm({ ...addrForm, line1: val });
                        if (addrErrors.line1) validateAddrField('line1', val);
                      }}
                      onBlur={e => validateAddrField('line1', e.target.value)}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border ${addrErrors.line1 ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-md text-sm focus:outline-none focus:border-[#9C6B30]`}
                    />
                    {addrErrors.line1 && <p className="text-xs text-red-500 mt-1">{addrErrors.line1}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <input
                      placeholder="Address line 2 (optional)"
                      value={addrForm.line2}
                      onChange={e => setAddrForm({ ...addrForm, line2: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-[#E8E8E8] rounded-md text-sm focus:outline-none focus:border-[#9C6B30]"
                    />
                  </div>

                  <div>
                    <input
                      placeholder="City *"
                      value={addrForm.city}
                      onChange={e => {
                        const val = e.target.value;
                        setAddrForm({ ...addrForm, city: val });
                        if (addrErrors.city) validateAddrField('city', val);
                      }}
                      onBlur={e => validateAddrField('city', e.target.value)}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border ${addrErrors.city ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-md text-sm focus:outline-none focus:border-[#9C6B30]`}
                    />
                    {addrErrors.city && <p className="text-xs text-red-500 mt-1">{addrErrors.city}</p>}
                  </div>

                  <div>
                    <input
                      placeholder="State *"
                      value={addrForm.state}
                      onChange={e => {
                        const val = e.target.value;
                        setAddrForm({ ...addrForm, state: val });
                        if (addrErrors.state) validateAddrField('state', val);
                      }}
                      onBlur={e => validateAddrField('state', e.target.value)}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border ${addrErrors.state ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-md text-sm focus:outline-none focus:border-[#9C6B30]`}
                    />
                    {addrErrors.state && <p className="text-xs text-red-500 mt-1">{addrErrors.state}</p>}
                  </div>

                  <div>
                    <input
                      placeholder="Pincode (6 digits) *"
                      value={addrForm.pincode}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                        setAddrForm({ ...addrForm, pincode: val });
                        if (addrErrors.pincode) validateAddrField('pincode', val);
                      }}
                      onBlur={e => validateAddrField('pincode', e.target.value)}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border ${addrErrors.pincode ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-md text-sm focus:outline-none focus:border-[#9C6B30]`}
                    />
                    {addrErrors.pincode && <p className="text-xs text-red-500 mt-1">{addrErrors.pincode}</p>}
                  </div>

                  <label className="flex items-center gap-2 text-xs sm:text-sm text-neutral-600 md:col-span-2">
                    <input type="checkbox" checked={addrForm.isDefault} onChange={e => setAddrForm({ ...addrForm, isDefault: e.target.checked })} className="accent-[#9C6B30]" /> Set as default
                  </label>

                  <div className="md:col-span-2 flex gap-3 justify-end">
                    <button type="button" onClick={() => { setShowAddr(false); setAddrErrors({}); }} className="px-4 py-2 text-xs sm:text-sm text-neutral-500">Cancel</button>
                    <button className="px-5 sm:px-6 py-2 sm:py-2.5 bg-[#1A1A1A] text-white text-[10px] sm:text-[11px] tracking-widest uppercase rounded-md hover:bg-[#9C6B30] cursor-pointer">Save Address</button>
                  </div>
                </form>
              )}
              {addresses.length === 0 && !showAddr && (<div className="text-center py-12 sm:py-16"><div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-full bg-[#FAF6EF] flex items-center justify-center text-[#9C6B30] mb-4"><MapPin size={24} /></div><div className="font-serif-luxe text-base sm:text-lg text-neutral-500">No addresses saved.</div></div>)}
              <div className="grid md:grid-cols-2 gap-4">{addresses.map(a => (
                <div key={a.id} className="border border-[#E8E8E8] rounded-lg p-4 sm:p-5 relative hover:border-[#9C6B30] transition">
                  {a.isDefault && <span className="absolute top-3 right-3 text-[9px] tracking-widest uppercase text-[#9C6B30] bg-[#FAF6EF] px-2 py-0.5 rounded-full">Default</span>}
                  <div className="font-medium text-[#1A1A1A] text-sm sm:text-base">{a.fullName}</div>
                  <div className="text-xs sm:text-sm text-neutral-600 mt-1">{a.line1}{a.line2 ? ', ' + a.line2 : ''}<br />{a.city}, {a.state} — {a.pincode}</div>
                  <div className="text-xs text-neutral-500 mt-2">Phone: {a.phone}</div>
                  <button onClick={() => deleteAddress(a.id)} className="mt-3 text-xs text-red-600 hover:underline flex items-center gap-1"><Trash2 size={12} /> Remove</button>
                </div>
              ))}</div>
            </div>
          )}

          {tab === 'wishlist' && (
            <div className="border border-[#E8E8E8] rounded-xl p-4 sm:p-6 md:p-8">
              <div className="font-display text-xl xs:text-2xl sm:text-3xl text-[#1A1A1A] mb-1">Your Wishlist</div>
              <div className="gold-line w-12 mb-6" />
              {wishItems.length === 0 ? (<div className="text-center py-12 sm:py-16"><Heart size={30} className="mx-auto text-[#9C6B30] mb-3" /><div className="font-serif-luxe text-base sm:text-lg text-neutral-500">Nothing saved yet.</div><Link href="/shop" className="inline-block mt-4 text-[#9C6B30] border-b border-[#9C6B30] pb-1 text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] uppercase">Explore</Link></div>) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6">{wishItems.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}</div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
