'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/lib/cart-store';
import { useAuth, authFetch } from '@/lib/use-auth';
import { formatINR } from '@/lib/products';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, Truck, Lock, MapPin, Wallet, ChevronRight, CreditCard, BookmarkCheck, Plus, Check, X, Smartphone, Building2, AlertTriangle, Sparkles } from 'lucide-react';

export default function CheckoutPage() {
  const { items, subtotal, clear, coupon: storeCoupon, discount: storeDiscount, removeCoupon, hydrated, removeOrderedItems } = useCart();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState('address');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [selectedAddrId, setSelectedAddrId] = useState('');
  const [addr, setAddr] = useState({ fullName: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' });
  const [email, setEmail] = useState('');
  const [payment, setPayment] = useState('razorpay');
  const [placing, setPlacing] = useState(false);
  const [mockRazorpayState, setMockRazorpayState] = useState({
    isOpen: false,
    orderId: '',
    amount: 0,
    resolve: null,
    method: 'upi',
    upiApp: 'gpay',
    isProcessing: false,
  });
  const [coupon, setCoupon] = useState(null);
  const [gift, setGift] = useState(false);
  const [addrErrors, setAddrErrors] = useState({ fullName: '', phone: '', line1: '', city: '', state: '', pincode: '' });
  const [savingAddr, setSavingAddr] = useState(false);
  const [isDefaultAddr, setIsDefaultAddr] = useState(false);
  const [saveForFuture, setSaveForFuture] = useState(true);
  const [placingStatus, setPlacingStatus] = useState('');
  const loadedUserIdRef = useRef(null);
  const orderSuccessRef = useRef(false);

  const [shippingConfig, setShippingConfig] = useState({
    freeShippingEnabled: true,
    freeShippingThreshold: 2000,
    standardShippingCharge: 500
  });

  const [paymentConfig, setPaymentConfig] = useState({
    razorpay: { enabled: true, isMock: true },
    cod: { enabled: true }
  });

  useEffect(() => {
    authFetch('/api/site-settings')
      .then(r => r.json())
      .then(d => {
        if (d && d.shipping) {
          setShippingConfig(d.shipping);
        }
        if (d && d.paymentSettings) {
          setPaymentConfig(d.paymentSettings);
          const rzpOn = d.paymentSettings.razorpay?.enabled !== false;
          const codOn = d.paymentSettings.cod?.enabled !== false;
          setPayment(prev => {
            if (prev === 'razorpay' && !rzpOn) return codOn ? 'cod' : '';
            if (prev === 'cod' && !codOn) return rzpOn ? 'razorpay' : '';
            if (!prev) return rzpOn ? 'razorpay' : (codOn ? 'cod' : '');
            return prev;
          });
        }
      })
      .catch(err => console.error('Failed to load site settings:', err));
  }, []);

  const availablePaymentMethods = useMemo(() => {
    const methods = [];
    if (paymentConfig?.razorpay?.enabled !== false) {
      methods.push({
        k: 'razorpay',
        t: 'Razorpay',
        d: 'Credit/Debit Card, UPI, Wallet, Netbanking · Secure',
        I: CreditCard,
        badge: paymentConfig?.razorpay?.isMock ? 'MOCK MODE' : null
      });
    }
    if (paymentConfig?.cod?.enabled !== false) {
      methods.push({
        k: 'cod',
        t: 'Cash on Delivery',
        d: 'Pay when you receive. Cash / UPI accepted.',
        I: Wallet
      });
    }
    return methods;
  }, [paymentConfig]);

  const freeEnabled = shippingConfig?.freeShippingEnabled ?? true;
  const threshold = Number(shippingConfig?.freeShippingThreshold ?? 2000);
  const standardCharge = Number(shippingConfig?.standardShippingCharge ?? 500);

  const discount = coupon?.discount ?? storeDiscount ?? 0;
  const shipping = subtotal === 0 ? 0 : (freeEnabled && subtotal >= threshold ? 0 : standardCharge);
  const tax = Math.round(Math.max(0, subtotal - discount) * 0.03);
  const giftWrap = gift ? 250 : 0;
  const total = Math.max(0, subtotal - discount + shipping + tax + giftWrap);

  const validateAddressField = (field, val) => {
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

  async function loadAddr() {
    setLoadingAddresses(prev => savedAddresses.length === 0);
    try {
      const r = await authFetch('/api/addresses');
      const d = await r.json();
      if (r.ok && Array.isArray(d.addresses)) {
        setSavedAddresses(d.addresses);
        if (d.addresses.length > 0) {
          const current = selectedAddrId
            ? d.addresses.find(a => a.id === selectedAddrId)
            : (d.addresses.find(a => a.isDefault) || d.addresses[0]);
          if (current && !selectedAddrId) {
            setSelectedAddrId(current.id);
            setAddr({
              fullName: current.fullName || '',
              phone: current.phone || '',
              line1: current.line1 || '',
              line2: current.line2 || '',
              city: current.city || '',
              state: current.state || '',
              pincode: current.pincode || ''
            });
            setIsDefaultAddr(Boolean(current.isDefault));
          }
        }
      }
    } catch (e) {
      console.error('Failed to load addresses:', e);
    } finally {
      setLoadingAddresses(false);
    }
  }

  function useSavedAddr(a) {
    setSelectedAddrId(a.id);
    setAddr({
      fullName: a.fullName || '',
      phone: a.phone || '',
      line1: a.line1 || '',
      line2: a.line2 || '',
      city: a.city || '',
      state: a.state || '',
      pincode: a.pincode || ''
    });
    setIsDefaultAddr(Boolean(a.isDefault));
    setAddrErrors({ fullName: '', phone: '', line1: '', city: '', state: '', pincode: '' });
  }

  function handleAddNewAddress() {
    setSelectedAddrId('');
    setAddr({
      fullName: user?.name || '',
      phone: user?.phone || '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: ''
    });
    setIsDefaultAddr(false);
    setAddrErrors({ fullName: '', phone: '', line1: '', city: '', state: '', pincode: '' });
  }

  const handleSaveAddress = async (advanceToPayment = false) => {
    const fields = ['fullName', 'phone', 'line1', 'city', 'state', 'pincode'];
    let valid = true;
    fields.forEach(f => {
      const isFValid = validateAddressField(f, addr[f]);
      if (!isFValid) valid = false;
    });
    if (!valid) {
      toast.error('Please fix the errors in your shipping address.');
      return false;
    }

    const digits = (addr.phone || '').toString().replace(/[^0-9]/g, '');
    const mobile10 = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
    if (!mobile10 || mobile10.length !== 10) {
      validateAddressField('phone', '');
      toast.error('Please enter a valid 10-digit mobile number.');
      return false;
    }
    const cleanPhone = `+91${mobile10}`;

    const payload = {
      fullName: (addr.fullName || '').trim(),
      phone: cleanPhone,
      line1: (addr.line1 || '').trim(),
      line2: (addr.line2 || '').trim(),
      city: (addr.city || '').trim(),
      state: (addr.state || '').trim(),
      pincode: (addr.pincode || '').trim(),
      isDefault: Boolean(isDefaultAddr)
    };

    setSavingAddr(true);
    try {
      if (selectedAddrId) {
        const res = await authFetch(`/api/addresses/${selectedAddrId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          toast.success('Address updated successfully');
          const updatedAddr = data.address || { ...payload, id: selectedAddrId };
          setSavedAddresses(prev => prev.map(a => a.id === selectedAddrId ? { ...a, ...updatedAddr } : a));
          if (advanceToPayment) setStep('payment');
          return true;
        } else {
          toast.error(data.error || 'Failed to update address');
          return false;
        }
      } else {
        const res = await authFetch('/api/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          toast.success('Address saved successfully');
          const created = data.address || { ...payload, id: 'addr_' + Date.now() };
          if (created.id) setSelectedAddrId(created.id);
          setSavedAddresses(prev => [created, ...prev]);
          if (advanceToPayment) setStep('payment');
          return true;
        } else {
          toast.error(data.error || 'Failed to save address');
          return false;
        }
      }
    } catch (err) {
      console.error('Save address error:', err);
      toast.error('An error occurred while saving the address.');
      return false;
    } finally {
      setSavingAddr(false);
    }
  };

  const handleContinueAddress = async () => {
    const fields = ['fullName', 'phone', 'line1', 'city', 'state', 'pincode'];
    let valid = true;
    fields.forEach(f => {
      const isFValid = validateAddressField(f, addr[f]);
      if (!isFValid) valid = false;
    });
    if (!valid) {
      toast.error('Please fix the errors in your shipping address before continuing.');
      return;
    }

    if (user && saveForFuture && !selectedAddrId) {
      await handleSaveAddress(true);
    } else {
      setStep('payment');
    }
  };

  useEffect(() => {
    if (authLoading || !hydrated) return;
    if (orderSuccessRef.current || placing) return;
    if (!user) {
      toast.error('Please login or create an account before placing your order.');
      router.replace('/login?redirect=/checkout');
      return;
    }
    if (items.length === 0) {
      router.push('/cart');
    }
  }, [hydrated, authLoading, user, items, router, placing]);

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      if (loadedUserIdRef.current !== user.id) {
        loadedUserIdRef.current = user.id;
        loadAddr();
      }
    }
  }, [user]);
  useEffect(() => {
    try {
      const couponKey = user?.id ? `mikumantra_coupon_${user.id}` : 'mikumantra_coupon_guest';
      const giftKey = user?.id ? `mikumantra_gift_${user.id}` : 'mikumantra_gift_guest';
      const c = JSON.parse(sessionStorage.getItem(couponKey) || sessionStorage.getItem('mikumantra_coupon') || 'null');
      const activeC = storeCoupon || c;
      if (activeC) setCoupon(activeC);
      if (sessionStorage.getItem(giftKey) === '1' || sessionStorage.getItem('mikumantra_gift') === '1') setGift(true);
    } catch { }
  }, [user, storeCoupon]);

  // Revalidate coupon & cart pricing with backend on mount and upon cart change
  useEffect(() => {
    if (!hydrated || items.length === 0) return;
    const activeCode = coupon?.code || storeCoupon?.code;
    let isMounted = true;

    const timer = setTimeout(() => {
      authFetch('/api/cart/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({ id: i.id, qty: i.qty, price: i.price })),
          coupon: activeCode || null,
          giftWrap: gift
        })
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (!data || !isMounted) return;
          if (data.couponValid === false && (coupon || storeCoupon)) {
            setCoupon(null);
            removeCoupon();
            const couponKey = user?.id ? `mikumantra_coupon_${user.id}` : 'mikumantra_coupon_guest';
            sessionStorage.removeItem(couponKey);
            sessionStorage.removeItem('mikumantra_coupon');
            localStorage.removeItem(couponKey);
            localStorage.removeItem('mikumantra_coupon');
            toast.error(data.couponError || 'Coupon is no longer eligible and has been removed.', {
              id: 'coupon-checkout-invalidated'
            });
          } else if (data.coupon && data.couponValid) {
            setCoupon(data.coupon);
          }
        })
        .catch(err => console.warn('Pricing validation error:', err));
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [hydrated, items, gift, user?.id]);

  async function payWithRazorpay() {
    try {
      setPlacingStatus('Initiating payment…');
      const orderRes = await authFetch('/api/payment/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          amount: total,
          items: items.map(i => ({ id: i.id, qty: i.qty })),
          coupon: coupon?.code || storeCoupon?.code || null,
          giftWrap: gift
        })
      });
      const rzOrder = await orderRes.json();
      if (!orderRes.ok) {
        toast.error(rzOrder.error || 'Failed to initiate payment.');
        return { paid: false };
      }

      const isMock = Boolean(rzOrder.mock) || rzOrder.key?.includes('mock') || Boolean(paymentConfig?.razorpay?.isMock) || Boolean(paymentConfig?.razorpay?.mockMode);
      if (isMock) {
        setPlacingStatus('');
        return new Promise((resolve) => {
          setMockRazorpayState({
            isOpen: true,
            orderId: rzOrder.id || ('order_MOCK' + Math.random().toString(36).slice(2, 10)),
            amount: rzOrder.amount ? (rzOrder.amount / 100) : total,
            resolve,
            method: 'upi',
            upiApp: 'gpay',
            isProcessing: false,
          });
        });
      }

      if (!window.Razorpay) {
        toast.error('Razorpay payment gateway failed to load. Please disable ad-blockers and try again.');
        return { paid: false };
      }

      setPlacingStatus('Opening payment…');
      return new Promise((resolve) => {
        const rzp = new window.Razorpay({
          key: rzOrder.key,
          amount: rzOrder.amount,
          currency: rzOrder.currency || 'INR',
          name: paymentConfig?.razorpay?.businessName || 'MikuMantra Fine Jewellery',
          description: 'Order Payment',
          order_id: rzOrder.id,
          prefill: { name: addr.fullName, email: user?.email || email, contact: addr.phone },
          theme: { color: paymentConfig?.razorpay?.themeColor || '#9C6B30' },
          handler: async (resp) => {
            setPlacingStatus('Verifying payment…');
            try {
              const v = await authFetch('/api/payment/razorpay/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(10000),
                body: JSON.stringify(resp)
              });
              const vd = await v.json();
              resolve({ paid: vd.verified, paymentId: vd.paymentId, orderId: resp.razorpay_order_id, signature: resp.razorpay_signature });
            } catch (verErr) {
              console.error('Verification error:', verErr);
              resolve({ paid: false });
            }
          },
          modal: { ondismiss: () => resolve({ paid: false }) }
        });
        rzp.open();
      });
    } catch (err) {
      console.error('Payment gateway error:', err);
      toast.error(err.name === 'TimeoutError' ? 'Payment gateway timed out. Please try again.' : 'Payment gateway error. Please try again.');
      return { paid: false };
    }
  }

  const handleMockPaymentSuccess = async () => {
    if (!mockRazorpayState.resolve) return;
    setMockRazorpayState(s => ({ ...s, isProcessing: true }));
    setPlacingStatus('Verifying payment with Mock Razorpay…');

    const paymentId = 'pay_MOCK' + Math.random().toString(36).slice(2, 11).toUpperCase();
    const orderId = mockRazorpayState.orderId;
    const signature = 'mock_sig_' + Math.random().toString(36).slice(2, 10);

    try {
      const v = await authFetch('/api/payment/razorpay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature
        })
      });
      const vd = await v.json();
      mockRazorpayState.resolve({
        paid: vd.verified !== false,
        paymentId: vd.paymentId || paymentId,
        orderId,
        signature
      });
    } catch (e) {
      mockRazorpayState.resolve({
        paid: true,
        paymentId,
        orderId,
        signature
      });
    } finally {
      setMockRazorpayState(s => ({ ...s, isOpen: false, isProcessing: false, resolve: null }));
    }
  };

  const handleMockPaymentFailure = () => {
    if (mockRazorpayState.resolve) {
      mockRazorpayState.resolve({ paid: false });
    }
    setMockRazorpayState(s => ({ ...s, isOpen: false, resolve: null }));
    setPlacing(false);
    setPlacingStatus('');
    toast.error('Payment was declined by bank (Mock Simulation)');
  };

  const handleMockPaymentDismiss = () => {
    if (mockRazorpayState.resolve) {
      mockRazorpayState.resolve({ paid: false });
    }
    setMockRazorpayState(s => ({ ...s, isOpen: false, resolve: null }));
    setPlacing(false);
    setPlacingStatus('');
    toast.info('Payment was cancelled');
  };

  async function placeOrder() {
    if (placing) return;
    setPlacing(true);
    setPlacingStatus(payment === 'razorpay' ? 'Preparing payment…' : 'Processing order…');
    try {
      if (!Array.isArray(items) || items.length === 0) {
        toast.error('Cart is empty');
        setPlacing(false);
        setPlacingStatus('');
        return;
      }

      let razorpayPaymentId = null;
      let razorpayOrderId = null;
      let razorpaySignature = null;
      if (payment === 'razorpay') {
        const res = await payWithRazorpay();
        if (!res.paid) {
          toast.error('Payment was not completed');
          setPlacing(false);
          setPlacingStatus('');
          return;
        }
        razorpayPaymentId = res.paymentId;
        razorpayOrderId = res.orderId;
        razorpaySignature = res.signature;
      }

      setPlacingStatus('Confirming your order…');
      const body = {
        items: items.map(i => ({ id: i.id, slug: i.slug, name: i.name, image: i.image, price: i.price, qty: i.qty })),
        address: addr,
        payment,
        email: user ? undefined : email,
        coupon: coupon?.code || storeCoupon?.code || null,
        discount,
        giftWrap: gift,
        razorpayPaymentId,
        razorpayOrderId,
        razorpaySignature
      };

      const r = await authFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify(body)
      });
      const d = await r.json();
      if (!r.ok) {
        console.error('Order API error', r.status, d);
        toast.error(d.error || 'Order placement failed. Please verify your items.');
        setPlacing(false);
        setPlacingStatus('');
        return;
      }

      // Mark order as successfully placed to prevent any cart-redirect race condition
      orderSuccessRef.current = true;
      setPlacingStatus('Redirecting…');
      toast.success('Order placed successfully!');

      const couponKey = user?.id ? `mikumantra_coupon_${user.id}` : 'mikumantra_coupon_guest';
      const giftKey = user?.id ? `mikumantra_gift_${user.id}` : 'mikumantra_gift_guest';

      sessionStorage.removeItem(couponKey);
      sessionStorage.removeItem(giftKey);
      sessionStorage.removeItem('mikumantra_coupon');
      sessionStorage.removeItem('mikumantra_gift');
      localStorage.removeItem(couponKey);
      localStorage.removeItem('mikumantra_coupon');

      // Immediate router transition to order confirmation page
      router.push(`/orders/${d.order.id}?success=1`);

      // Clean up cart store asynchronously in background without blocking navigation
      removeOrderedItems(body.items).catch(e => console.warn('Cart cleanup notice:', e));
    } catch (e) {
      console.error('Place order exception', e);
      toast.error(e.name === 'TimeoutError' ? 'Order request timed out. Please check your order history.' : 'Order placement failed. Please try again.');
      setPlacing(false);
      setPlacingStatus('');
    }
  }

  if (authLoading || !hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-[#9C6B30]" size={36} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-3">
        <Loader2 className="animate-spin text-[#9C6B30]" size={36} />
        <p className="text-sm text-neutral-500 font-sans">Redirecting to login...</p>
      </div>
    );
  }


  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 sm:py-10">
        <div className="text-center mb-6 sm:mb-8"><div className="text-[10px] sm:text-[11px] tracking-[0.35em] uppercase text-[#9C6B30] mb-2">Secure Checkout</div><h1 className="font-display text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-light text-[#1A1A1A] break-words">Complete Your Order</h1><div className="gold-line w-16 mx-auto my-4" /></div>
        <div className="flex justify-center gap-3 sm:gap-8 mb-8 sm:mb-10 text-[10px] sm:text-[11px] tracking-wider sm:tracking-widest uppercase">{[['address', 'Address', MapPin], ['payment', 'Payment', Wallet], ['review', 'Review', ShieldCheck]].map(([k, l, I], i) => (<div key={k} className={`flex items-center gap-1.5 sm:gap-2 ${step === k ? 'text-[#9C6B30]' : 'text-neutral-400'}`}><div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center text-xs ${step === k ? 'border-[#9C6B30] bg-[#FAF6EF]' : 'border-neutral-300'}`}>{i + 1}</div><span className="hidden sm:inline">{l}</span></div>))}</div>

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-10">
          <div className="lg:col-span-2">
            {step === 'address' && (
              <div className="border border-[#E8E8E8] rounded-xl p-4 sm:p-6 md:p-8">
                <div className="font-display text-xl sm:text-2xl mb-1">Shipping Address</div><div className="gold-line w-10 mb-6" />
                {!user && (<div className="mb-6"><label className="text-[10px] tracking-widest uppercase text-neutral-500">Email (for order updates)</label><input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" className="w-full mt-1 px-4 py-3 border border-[#E8E8E8] rounded-md text-sm focus:outline-none focus:border-[#9C6B30]" /><div className="text-xs text-neutral-500 mt-2"><Link href="/login?redirect=/checkout" className="text-[#9C6B30] hover:underline">Sign in</Link> for faster checkout &amp; order tracking.</div></div>)}
                {user && loadingAddresses ? (
                  <div className="mb-6">
                    <div className="text-[10px] tracking-widest uppercase text-neutral-400 mb-3 flex items-center gap-2">
                      <Loader2 size={12} className="animate-spin text-[#9C6B30]" />
                      Loading Saved Addresses...
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="border border-[#E8E8E8] rounded-lg p-4 bg-neutral-50/50 animate-pulse h-24" />
                      <div className="border border-[#E8E8E8] rounded-lg p-4 bg-neutral-50/50 animate-pulse h-24" />
                    </div>
                  </div>
                ) : user && savedAddresses.length > 0 ? (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[10px] tracking-widest uppercase text-neutral-500">Saved Addresses</div>
                      <button
                        type="button"
                        onClick={handleAddNewAddress}
                        className="text-xs text-[#9C6B30] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <Plus size={13} /> Add New Address
                      </button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      {savedAddresses.map(a => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => useSavedAddr(a)}
                          className={`text-left border rounded-lg p-4 transition relative ${selectedAddrId === a.id ? 'border-[#9C6B30] bg-[#FAF6EF]' : 'border-[#E8E8E8] hover:border-[#9C6B30]'}`}
                        >
                          {selectedAddrId === a.id && (
                            <span className="absolute top-3 right-3 text-[10px] tracking-wider uppercase font-semibold text-[#9C6B30] bg-white px-2 py-0.5 rounded border border-[#9C6B30]/30 flex items-center gap-1">
                              <Check size={10} /> Selected
                            </span>
                          )}
                          <div className="font-medium">{a.fullName} {a.isDefault && <span className="text-[10px] text-neutral-400 font-normal">(Default)</span>}</div>
                          <div className="text-sm text-neutral-600 mt-1">{a.line1}, {a.city}, {a.state} — {a.pincode}</div>
                          <div className="text-xs text-neutral-500 mt-1">{a.phone}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <input
                      placeholder="Full name *"
                      value={addr.fullName}
                      onChange={e => {
                        const val = e.target.value;
                        setAddr({ ...addr, fullName: val });
                        if (addrErrors.fullName) validateAddressField('fullName', val);
                      }}
                      onBlur={e => validateAddressField('fullName', e.target.value)}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border ${addrErrors.fullName ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-md text-sm focus:outline-none focus:border-[#9C6B30]`}
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
                        value={(addr.phone || '').toString().replace(/^\+91/, '').replace(/[^0-9]/g, '').slice(0, 10)}
                        onChange={e => {
                          const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                          const full = digits ? `+91${digits}` : '';
                          setAddr({ ...addr, phone: full });
                          if (addrErrors.phone) validateAddressField('phone', full);
                        }}
                        onBlur={e => validateAddressField('phone', e.target.value)}
                        className={`w-full pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 border ${addrErrors.phone ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-md text-sm focus:outline-none focus:border-[#9C6B30]`}
                      />
                    </div>
                    {addrErrors.phone && <p className="text-xs text-red-500 mt-1">{addrErrors.phone}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <input
                      placeholder="Address line 1 *"
                      value={addr.line1}
                      onChange={e => {
                        const val = e.target.value;
                        setAddr({ ...addr, line1: val });
                        if (addrErrors.line1) validateAddressField('line1', val);
                      }}
                      onBlur={e => validateAddressField('line1', e.target.value)}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border ${addrErrors.line1 ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-md text-sm focus:outline-none focus:border-[#9C6B30]`}
                    />
                    {addrErrors.line1 && <p className="text-xs text-red-500 mt-1">{addrErrors.line1}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <input
                      placeholder="Landmark (optional)"
                      value={addr.line2}
                      onChange={e => setAddr({ ...addr, line2: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-[#E8E8E8] rounded-md text-sm focus:outline-none focus:border-[#9C6B30]"
                    />
                  </div>

                  <div>
                    <input
                      placeholder="City *"
                      value={addr.city}
                      onChange={e => {
                        const val = e.target.value;
                        setAddr({ ...addr, city: val });
                        if (addrErrors.city) validateAddressField('city', val);
                      }}
                      onBlur={e => validateAddressField('city', e.target.value)}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border ${addrErrors.city ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-md text-sm focus:outline-none focus:border-[#9C6B30]`}
                    />
                    {addrErrors.city && <p className="text-xs text-red-500 mt-1">{addrErrors.city}</p>}
                  </div>

                  <div>
                    <input
                      placeholder="State *"
                      value={addr.state}
                      onChange={e => {
                        const val = e.target.value;
                        setAddr({ ...addr, state: val });
                        if (addrErrors.state) validateAddressField('state', val);
                      }}
                      onBlur={e => validateAddressField('state', e.target.value)}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border ${addrErrors.state ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-md text-sm focus:outline-none focus:border-[#9C6B30]`}
                    />
                    {addrErrors.state && <p className="text-xs text-red-500 mt-1">{addrErrors.state}</p>}
                  </div>

                  <div>
                    <input
                      placeholder="Pincode (6 digits) *"
                      value={addr.pincode}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                        setAddr({ ...addr, pincode: val });
                        if (addrErrors.pincode) validateAddressField('pincode', val);
                      }}
                      onBlur={e => validateAddressField('pincode', e.target.value)}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border ${addrErrors.pincode ? 'border-red-500 bg-red-50/20' : 'border-[#E8E8E8]'} rounded-md text-sm focus:outline-none focus:border-[#9C6B30]`}
                    />
                    {addrErrors.pincode && <p className="text-xs text-red-500 mt-1">{addrErrors.pincode}</p>}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E8E8E8]/60 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-600">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isDefaultAddr}
                      onChange={e => setIsDefaultAddr(e.target.checked)}
                      className="accent-[#9C6B30] w-4 h-4 rounded cursor-pointer"
                    />
                    <span>Set as default shipping address</span>
                  </label>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E8E8E8]">
                  <Link
                    href="/cart"
                    className="px-4 sm:px-6 py-3 text-[10px] sm:text-[11px] tracking-wider sm:tracking-widest uppercase text-neutral-500 hover:text-[#1A1A1A] transition inline-flex items-center cursor-pointer"
                  >
                    ← Back
                  </Link>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 ml-auto">
                    <button
                      type="button"
                      disabled={savingAddr}
                      onClick={() => handleSaveAddress(false)}
                      className="px-4 sm:px-6 py-2.5 sm:py-3 border border-[#9C6B30] text-[#9C6B30] text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.2em] uppercase rounded-md hover:bg-[#FAF6EF] flex items-center gap-2 cursor-pointer transition disabled:opacity-50 font-medium"
                    >
                      {savingAddr ? <Loader2 size={13} className="animate-spin" /> : <BookmarkCheck size={14} />}
                      {selectedAddrId ? 'Update Address' : 'Save Address'}
                    </button>

                    <button
                      type="button"
                      disabled={savingAddr}
                      onClick={handleContinueAddress}
                      className="px-6 sm:px-8 py-3 sm:py-3.5 bg-[#1A1A1A] text-white text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] uppercase rounded-md hover:bg-[#9C6B30] flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
                    >
                      {savingAddr && <Loader2 size={14} className="animate-spin" />}
                      Continue <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 'payment' && (
              <div className="border border-[#E8E8E8] rounded-xl p-4 sm:p-6 md:p-8">
                <div className="font-display text-xl sm:text-2xl mb-1">Payment Method</div><div className="gold-line w-10 mb-6" />
                <div className="space-y-3">
                  {availablePaymentMethods.length === 0 ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                      No payment methods are currently active. Please contact store support.
                    </div>
                  ) : (
                    availablePaymentMethods.map(p => (
                      <label key={p.k} className={`flex items-start gap-3 sm:gap-4 p-4 sm:p-5 border rounded-lg cursor-pointer transition ${payment === p.k ? 'border-[#9C6B30] bg-[#FAF6EF]/60' : 'border-[#E8E8E8] hover:border-[#9C6B30]'}`}>
                        <input type="radio" checked={payment === p.k} onChange={() => setPayment(p.k)} className="mt-1 accent-[#9C6B30] shrink-0" />
                        <div className="flex-1 min-w-0"><div className="flex flex-wrap items-center gap-2"><p.I size={16} className="text-[#9C6B30] shrink-0" /><div className="font-medium text-[#1A1A1A] text-sm sm:text-base">{p.t}</div>{p.badge && <span className="text-[9px] px-2 py-0.5 bg-amber-100 text-amber-800 rounded uppercase tracking-widest">{p.badge}</span>}</div><div className="text-xs text-neutral-500 mt-1">{p.d}</div></div>
                      </label>
                    ))
                  )}
                </div>
                {payment === 'razorpay' && paymentConfig?.razorpay?.isMock && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
                    Razorpay is currently in MOCK mode. Configure your API keys in the Super Admin Portal to accept live payments.
                  </div>
                )}
                <div className="mt-6 flex justify-between gap-2"><button onClick={() => setStep('address')} className="px-4 sm:px-6 py-3 text-[10px] sm:text-[11px] tracking-wider sm:tracking-widest uppercase text-neutral-500 hover:text-[#1A1A1A] transition cursor-pointer">← Back</button><button onClick={() => setStep('review')} className="px-5 sm:px-8 py-3 sm:py-3.5 bg-[#1A1A1A] text-white text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] uppercase rounded-md hover:bg-[#9C6B30] flex items-center gap-2">Review Order <ChevronRight size={14} /></button></div>
              </div>
            )}

            {step === 'review' && (
              <div className="border border-[#E8E8E8] rounded-xl p-4 sm:p-6 md:p-8">
                <div className="font-display text-xl sm:text-2xl mb-1">Review &amp; Place Order</div><div className="gold-line w-10 mb-6" />
                <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="border border-[#E8E8E8] rounded-lg p-4"><div className="text-[10px] tracking-widest uppercase text-neutral-400 mb-2">Ship to</div><div className="font-medium text-sm sm:text-base">{addr.fullName}</div><div className="text-xs sm:text-sm text-neutral-600 mt-1">{addr.line1}{addr.line2 ? ', ' + addr.line2 : ''}<br />{addr.city}, {addr.state} — {addr.pincode}</div><div className="text-xs text-neutral-500 mt-2">{addr.phone}</div><button onClick={() => setStep('address')} className="mt-3 text-xs text-[#9C6B30] hover:underline">Change</button></div>
                  <div className="border border-[#E8E8E8] rounded-lg p-4"><div className="text-[10px] tracking-widest uppercase text-neutral-400 mb-2">Payment</div><div className="font-medium capitalize text-sm sm:text-base">{payment === 'cod' ? 'Cash on Delivery' : 'Razorpay'}</div><div className="text-xs text-neutral-500 mt-1">{payment === 'cod' ? `Pay ${formatINR(total)} on delivery` : `${formatINR(total)} via secure checkout`}</div><button onClick={() => setStep('payment')} className="mt-3 text-xs text-[#9C6B30] hover:underline">Change</button></div>
                </div>
                <div className="mt-6"><div className="text-[10px] tracking-widest uppercase text-neutral-400 mb-3">Items ({items.length})</div><div className="space-y-3">{items.map(it => (<div key={it.id} className="flex gap-3 sm:gap-4 border border-[#E8E8E8] rounded-lg p-3"><img src={it.image} className="w-14 h-14 sm:w-16 sm:h-16 rounded object-cover shrink-0" /><div className="flex-1 min-w-0"><div className="font-serif-luxe text-base sm:text-lg truncate">{it.name}</div><div className="text-xs text-neutral-500">Qty: {it.qty}</div></div><div className="font-medium text-xs sm:text-sm shrink-0">{formatINR(it.price * it.qty)}</div></div>))}</div></div>
                <div className="mt-6 flex justify-between gap-2"><button onClick={() => setStep('payment')} className="px-4 sm:px-6 py-3 text-[10px] sm:text-[11px] tracking-wider sm:tracking-widest uppercase text-neutral-500 hover:text-[#1A1A1A] transition cursor-pointer">← Back</button><button disabled={placing} onClick={placeOrder} className="px-5 sm:px-10 py-3.5 sm:py-4 bg-[#1A1A1A] text-white text-[10px] sm:text-[11px] tracking-wider sm:tracking-[0.3em] uppercase rounded-md hover:bg-[#9C6B30] disabled:opacity-60 flex items-center gap-2">{placing && <Loader2 size={14} className="animate-spin shrink-0" />}{placing ? (placingStatus || 'Processing…') : (payment === 'razorpay' ? 'Pay & Place Order' : 'Place Order')}</button></div>
              </div>
            )}
          </div>

          <aside className="lg:col-span-1">
            <div className="sticky top-32 border border-[#E8E8E8] rounded-xl p-4 sm:p-6 bg-[#FAF6EF]/30">
              <div className="font-display text-2xl mb-1">Order Summary</div><div className="gold-line w-10 mb-4" />
              {freeEnabled && subtotal > 0 && (
                <div className="mb-4 p-3 rounded-lg border border-[#E8E8E8] bg-white text-xs">
                  <div className="flex items-center gap-1.5 font-medium mb-1.5 text-[#1A1A1A]">
                    <Truck size={14} className="text-[#9C6B30] shrink-0" />
                    {subtotal >= threshold ? (
                      <span className="text-[#9C6B30] font-bold">🎉 You got FREE shipping!</span>
                    ) : (
                      <span>Add <strong className="text-[#9C6B30]">₹{(threshold - subtotal).toLocaleString('en-IN')}</strong> more for <strong className="text-[#9C6B30]">FREE shipping</strong></span>
                    )}
                  </div>
                  <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#9C6B30] transition-all duration-300 rounded-full"
                      style={{ width: `${Math.min(100, Math.round((subtotal / threshold) * 100))}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">{items.map(it => (<div key={it.id} className="flex gap-3 items-center"><img src={it.image} className="w-12 h-12 rounded object-cover" /><div className="flex-1 min-w-0"><div className="text-xs font-medium truncate">{it.name}</div><div className="text-[10px] text-neutral-500">Qty {it.qty}</div></div><div className="text-xs">{formatINR(it.price * it.qty)}</div></div>))}</div>
              <div className="space-y-2 text-sm border-t border-[#E8E8E8] pt-4">
                <div className="flex justify-between"><span className="text-neutral-500">Subtotal</span><span>{formatINR(subtotal)}</span></div>
                {discount > 0 && <div className="flex justify-between text-[#9C6B30]"><span>Discount ({coupon?.code})</span><span>-{formatINR(discount)}</span></div>}
                <div className="flex justify-between"><span className="text-neutral-500">Shipping</span><span>{shipping === 0 ? <span className="text-[#9C6B30]">Free</span> : formatINR(shipping)}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Tax (GST 3%)</span><span>{formatINR(tax)}</span></div>
                {gift && <div className="flex justify-between"><span className="text-neutral-500">Gift Wrap</span><span>{formatINR(250)}</span></div>}
              </div>
              <div className="gold-line w-full my-4" />
              <div className="flex justify-between items-baseline"><span className="text-[11px] tracking-widest uppercase">Total</span><span className="font-display text-2xl">{formatINR(total)}</span></div>
              <div className="mt-5 pt-5 border-t border-[#E8E8E8] space-y-2 text-xs text-neutral-500"><div className="flex items-center gap-2"><Lock size={12} className="text-[#9C6B30]" /> 256-bit secure checkout</div><div className="flex items-center gap-2"><Truck size={12} className="text-[#9C6B30]" /> {shipping === 0 ? 'Free insured shipping' : 'Insured, tracked delivery'}</div><div className="flex items-center gap-2"><ShieldCheck size={12} className="text-[#9C6B30]" /> BIS &amp; SGL certified</div></div>
            </div>
          </aside>
        </div>
      </div>

      {/* MOCK RAZORPAY PAYMENT MODAL DIALOG */}
      {mockRazorpayState.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-neutral-200 animate-in zoom-in-95 duration-150 flex flex-col">
            {/* Razorpay Signature Navy Header */}
            <div className="bg-[#0C2340] text-white p-4 sm:p-5 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs tracking-wider text-white">
                    RZP
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white tracking-wide">
                      {paymentConfig?.razorpay?.businessName || 'MikuMantra Fine Jewellery'}
                    </div>
                    <div className="text-[10px] text-blue-200">
                      Razorpay Trusted Business
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleMockPaymentDismiss}
                  className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  title="Cancel Payment"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Amount and Mock Banner */}
              <div className="mt-3 pt-3 border-t border-white/10 flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-blue-200 block">Amount to Pay</span>
                  <span className="font-display text-2xl font-light text-white">
                    {formatINR(mockRazorpayState.amount || total)}
                  </span>
                </div>
                <span className="bg-amber-400 text-amber-950 text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full">
                  Mock Simulator
                </span>
              </div>
            </div>

            {/* Payment Method Selector Tabs */}
            <div className="grid grid-cols-3 border-b border-neutral-200 bg-neutral-50 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMockRazorpayState(s => ({ ...s, method: 'upi' }))}
                className={`py-2.5 flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  mockRazorpayState.method === 'upi'
                    ? 'border-b-2 border-[#0C2340] text-[#0C2340] bg-white font-bold'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <Smartphone size={14} />
                <span>UPI</span>
              </button>
              <button
                type="button"
                onClick={() => setMockRazorpayState(s => ({ ...s, method: 'card' }))}
                className={`py-2.5 flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  mockRazorpayState.method === 'card'
                    ? 'border-b-2 border-[#0C2340] text-[#0C2340] bg-white font-bold'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <CreditCard size={14} />
                <span>Card</span>
              </button>
              <button
                type="button"
                onClick={() => setMockRazorpayState(s => ({ ...s, method: 'netbanking' }))}
                className={`py-2.5 flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  mockRazorpayState.method === 'netbanking'
                    ? 'border-b-2 border-[#0C2340] text-[#0C2340] bg-white font-bold'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <Building2 size={14} />
                <span>Netbanking</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-4 sm:p-5 space-y-3.5 text-xs text-neutral-700 min-h-[170px] flex flex-col justify-center">
              {/* UPI Tab */}
              {mockRazorpayState.method === 'upi' && (
                <div className="space-y-3">
                  <div className="text-[11px] text-neutral-500 font-medium">Select preferred UPI payment app:</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'gpay', name: 'Google Pay', label: 'GPay' },
                      { id: 'phonepe', name: 'PhonePe', label: 'PhonePe' },
                      { id: 'paytm', name: 'Paytm UPI', label: 'Paytm' }
                    ].map(app => (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => setMockRazorpayState(s => ({ ...s, upiApp: app.id }))}
                        className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                          mockRazorpayState.upiApp === app.id
                            ? 'border-blue-600 bg-blue-50/60 font-bold text-blue-900 ring-1 ring-blue-600'
                            : 'border-neutral-200 bg-white hover:border-neutral-300'
                        }`}
                      >
                        <div className="text-xs font-semibold">{app.label}</div>
                        <div className="text-[10px] text-neutral-500 mt-0.5">{app.name}</div>
                      </button>
                    ))}
                  </div>
                  <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200 text-[11px] text-neutral-600 flex items-center justify-between">
                    <span>Virtual UPI ID:</span>
                    <span className="font-mono text-neutral-800 font-semibold">{addr.phone || '9876543210'}@okhdfcbank</span>
                  </div>
                </div>
              )}

              {/* Card Tab */}
              {mockRazorpayState.method === 'card' && (
                <div className="space-y-2.5">
                  <div className="p-3 bg-gradient-to-r from-neutral-800 to-neutral-900 text-white rounded-xl shadow-xs space-y-2 font-mono">
                    <div className="flex justify-between items-center text-[10px] text-neutral-400">
                      <span>MOCK RAZORPAY TEST CARD</span>
                      <span className="text-amber-400 font-bold">VISA</span>
                    </div>
                    <div className="text-sm tracking-wider">4111 •••• •••• 4444</div>
                    <div className="flex justify-between text-[10px] text-neutral-300">
                      <span>{addr.fullName || 'TEST CUSTOMER'}</span>
                      <span>12 / 28</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-neutral-500 text-center">
                    Simulated test card prefilled. No real debit will occur.
                  </div>
                </div>
              )}

              {/* Netbanking Tab */}
              {mockRazorpayState.method === 'netbanking' && (
                <div className="space-y-2">
                  <div className="text-[11px] text-neutral-500 font-medium">Popular Banks (Simulated):</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank'].map(bank => (
                      <div key={bank} className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-700 font-medium flex items-center gap-1.5">
                        <Check size={12} className="text-emerald-600" />
                        <span>{bank}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="p-4 bg-neutral-50 border-t border-neutral-200 space-y-2">
              <button
                type="button"
                disabled={mockRazorpayState.isProcessing}
                onClick={handleMockPaymentSuccess}
                className="w-full py-3 bg-[#0C2340] hover:bg-[#132c4d] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
              >
                {mockRazorpayState.isProcessing ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Verifying with Mock Gateway...</span>
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    <span>Pay {formatINR(mockRazorpayState.amount || total)} (Simulate Success)</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  disabled={mockRazorpayState.isProcessing}
                  onClick={handleMockPaymentFailure}
                  className="text-[11px] text-red-600 hover:text-red-700 font-medium underline py-1 cursor-pointer"
                >
                  Simulate Payment Failure
                </button>
                <button
                  type="button"
                  disabled={mockRazorpayState.isProcessing}
                  onClick={handleMockPaymentDismiss}
                  className="text-[11px] text-neutral-500 hover:text-neutral-800 font-medium py-1 cursor-pointer"
                >
                  Cancel &amp; Return
                </button>
              </div>
            </div>

            {/* Security Footer */}
            <div className="bg-neutral-100 px-4 py-2 border-t border-neutral-200 text-center text-[10px] text-neutral-500 flex items-center justify-center gap-1.5">
              <Lock size={11} className="text-neutral-400" />
              <span>Razorpay Mock Sandbox · Safe simulation mode</span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
