'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import * as Lucide from 'lucide-react';
import { toast } from 'sonner';

export default function Footer({ initialData }) {
  const pathname = usePathname();
  const [data, setData] = useState(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(null);
  const [footerEmail, setFooterEmail] = useState('');
  const [footerSubmitting, setFooterSubmitting] = useState(false);

  const handleFooterSubscribe = async (e) => {
    e.preventDefault();
    const trimmed = (footerEmail || '').trim();
    if (!trimmed) {
      toast.error('Please enter your email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setFooterSubmitting(true);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, source: 'website-footer' })
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        toast.success(resData.message || 'You have successfully joined the MikuMantra Circle.');
        setFooterEmail('');
      } else {
        toast.error(resData.message || resData.error || 'Failed to subscribe. Please try again.');
      }
    } catch (err) {
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setFooterSubmitting(false);
    }
  };

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      setLoading(false);
      return;
    }
    async function fetchFooter() {
      try {
        const r = await fetch('/api/footer', { cache: 'no-store' });
        if (r.ok) {
          const d = await r.json();
          setData(d);
        } else {
          setError('Failed to load footer data');
        }
      } catch (err) {
        console.error(err);
        setError('Network error');
      } finally {
        setLoading(false);
      }
    }
    fetchFooter();
  }, [initialData]);

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const getSocialIcon = (iconName) => {
    const map = {
      Instagram: Lucide.Instagram,
      Facebook: Lucide.Facebook,
      Twitter: Lucide.Twitter,
      Youtube: Lucide.Youtube,
      Linkedin: Lucide.Linkedin || Lucide.LinkedinIcon,
      LinkedinIcon: Lucide.LinkedinIcon || Lucide.Linkedin,
      TwitterIcon: Lucide.TwitterIcon || Lucide.Twitter,
      Mail: Lucide.Mail,
      Phone: Lucide.Phone,
      MapPin: Lucide.MapPin,
    };
    return map[iconName] || Lucide[iconName] || Lucide.Globe;
  };

  // Derive data strictly from backend database/API
  const company = data?.company || {};
  const sections = data?.sections || [];
  const socialLinks = data?.socialLinks || [];
  const policies = data?.policies || [];
  const newsletter = data?.newsletter || { isActive: false };
  const copyright = data?.copyright || '';

  const activeSections = sections.filter(sec => sec.links && sec.links.some(l => l.isActive));
  const activeSocials = socialLinks.filter(soc => soc.isActive);
  const activePolicies = policies.filter(p => p.isActive);

  if (loading) {
    return (
      <footer className="bg-[#4a2536] text-white/80 mt-24 animate-pulse">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 pt-16 pb-8">
          <div className="grid md:grid-cols-5 xs:gap-10 gap-6">
            <div className="md:col-span-2">
              <div className="h-10 w-10 bg-white/20 rounded-full" />
              <div className="h-4 bg-white/20 rounded mt-5 w-3/4" />
              <div className="h-3 bg-white/20 rounded mt-2 w-1/2" />
              <div className="flex items-center gap-3 mt-6">
                {[1, 2, 3, 4].map(n => <div key={n} className="w-9 h-9 rounded-full bg-white/20" />)}
              </div>
            </div>
            {[1, 2, 3].map(c => (
              <div key={c}>
                <div className="h-3 bg-[#D4AF37]/40 rounded w-1/2 mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(l => <div key={l} className="h-3 bg-white/10 rounded w-3/4" />)}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 pt-8 border-t border-white/10 grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map(n => <div key={n} className="h-4 bg-white/10 rounded w-2/3" />)}
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-[#4a2536] text-white/80 mt-24">
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 pt-12 xs:pt-16 pb-8">
        <div className="grid md:grid-cols-5 xs:gap-10 gap-6">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              {company.logo && (
                <img src={company.logo} alt={`${company.name} Logo`} className="w-40 sm:w-36 md:w-44 lg:w-44 h-auto sm:h-14 object-contain" />
              )}
            </div>
            {company.description && (
              <p className="mt-5 text-sm leading-relaxed text-white/60 max-w-sm">{company.description}</p>
            )}

            {/* Social Links */}
            {activeSocials.length > 0 && (
              <div className="flex items-center gap-3 mt-6">
                {activeSocials.map((soc, i) => {
                  const Icon = getSocialIcon(soc.icon);
                  return (
                    <a
                      key={i}
                      href={soc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={soc.platform}
                      className="w-9 h-9 rounded-full border border-white/20 hover:border-[#D4AF37] hover:text-[#D4AF37] flex items-center justify-center transition-colors"
                    >
                      <Icon size={16} />
                    </a>
                  );
                })}
              </div>
            )}

            {/* Newsletter section inside first column if enabled */}
            {newsletter.isActive && (
              <div className="mt-8 max-w-sm">
                <div className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest mb-2">
                  {newsletter.title || 'Newsletter'}
                </div>
                <p className="text-xs text-white/60 mb-3">
                  {newsletter.description || 'Receive updates, access to exclusive deals, and more.'}
                </p>
                <form className="flex gap-2" onSubmit={handleFooterSubscribe}>
                  <input
                    type="email"
                    required
                    value={footerEmail}
                    onChange={(e) => setFooterEmail(e.target.value)}
                    disabled={footerSubmitting}
                    placeholder="Your email address"
                    className="bg-white/10 text-white placeholder-white/40 text-xs px-3 py-2.5 rounded border border-white/20 focus:outline-none focus:border-[#D4AF37] flex-1 disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={footerSubmitting}
                    className="bg-[#D4AF37] text-[#4a2536] hover:bg-white hover:text-[#4a2536] px-4 py-2.5 rounded text-xs uppercase tracking-widest font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center min-w-[90px]"
                  >
                    {footerSubmitting ? <Lucide.Loader2 size={14} className="animate-spin" /> : 'Subscribe'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Navigation Columns */}
          {activeSections.map(col => (
            <div key={col.title}>
              <div className="text-[11px] tracking-[0.3em] uppercase text-[#D4AF37] mb-4">{col.title}</div>
              <ul className="space-y-3 text-sm text-white/70">
                {col.links.filter(l => l.isActive).map((link, linkIdx) => (
                  <li key={linkIdx}>
                    <Link href={link.url} className="hover:text-[#D4AF37]">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact Information */}
        <div className="mt-12 pt-8 border-t border-white/10 grid md:grid-cols-3 gap-6 text-sm text-white/60">
          {company.address && (
            <div className="flex items-center gap-2">
              <Lucide.MapPin size={14} className="text-[#D4AF37] shrink-0" />
              <span>{company.address}</span>
            </div>
          )}
          {company.phone && (
            <div className="flex items-center gap-2">
              <Lucide.Phone size={14} className="text-[#D4AF37] shrink-0" />
              <span>{company.phone}</span>
            </div>
          )}
          {company.email && (
            <div className="flex items-center gap-2">
              <Lucide.Mail size={14} className="text-[#D4AF37] shrink-0" />
              <span>{company.email}</span>
            </div>
          )}
        </div>

        {/* Policies & Copyright */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-white/50">
          {copyright ? <div>© {new Date().getFullYear()} {copyright}</div> : <div />}
          {activePolicies.length > 0 && (
            <div className="flex gap-5">
              {activePolicies.map((policy, pIdx) => (
                <Link key={pIdx} href={policy.url} className="hover:text-white transition-colors">
                  {policy.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
