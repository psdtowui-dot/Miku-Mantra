import './globals.css'
import Script from 'next/script'
import { Providers } from './providers'
import { Toaster } from 'sonner'
import AIChatMount from '@/components/site/ai-chat-mount'

import { headers } from 'next/headers'
import Navbar from '@/components/site/navbar';
import Footer from '@/components/site/footer';

import { getSiteSettings, getCanonicalBaseUrl, toAbsoluteUrl } from '@/lib/db-site-settings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  try {
    const headersList = await headers();
    const host = headersList.get('host');
    if (host) {
      const protocol = headersList.get('x-forwarded-proto') || (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
      return `${protocol}://${host}`;
    }
  } catch (e) {
    // ignore
  }
  return 'https://jwellary-site-ten.vercel.app';
}

export async function generateMetadata() {
  const settings = await getSiteSettings();
  const siteUrl = getCanonicalBaseUrl(settings);
  const siteName = settings.siteName || 'MikuMantra Fine Jewellery';
  const seoTitle = settings.seoTitle || 'MikuMantra — House of Fine Jewellery';
  const seoDescription = settings.seoDescription || 'Discover handcrafted 22K gold, diamond & bridal jewellery. BIS hallmarked. SGL certified. Timeless heirlooms designed in Jaipur, worn across the world.';
  const shareTitle = settings.shareTitle || seoTitle;
  const shareDescription = settings.shareDescription || seoDescription;

  const rawImage = settings.shareBanner || settings.ogImage || settings.twitterImage;
  const absoluteImageUrl = toAbsoluteUrl(rawImage, siteUrl);
  const titleTemplate = settings.titleTemplate || `%s | ${siteName}`;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: seoTitle,
      template: titleTemplate,
    },
    description: seoDescription,
    keywords: Array.isArray(settings.keywords) ? settings.keywords : (settings.keywords ? String(settings.keywords).split(',') : ['jewellery', 'gold', 'diamond', 'bridal']),
    authors: [{ name: siteName }],
    creator: siteName,
    alternates: { canonical: siteUrl },
    openGraph: {
      title: shareTitle,
      description: shareDescription,
      url: siteUrl,
      siteName: siteName,
      locale: 'en_IN',
      type: 'website',
      images: [
        {
          url: absoluteImageUrl,
          width: 1200,
          height: 630,
          alt: shareTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: shareTitle,
      description: shareDescription,
      images: [absoluteImageUrl],
    },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  };
}

async function fetchHeaderData() {
  try {
    const base = await getBaseUrl();
    const r = await fetch(`${base}/api/header`, { cache: 'no-store' });
    if (!r.ok) throw new Error('failed');
    return await r.json();
  } catch (err) {
    console.error('Failed to pre-fetch header:', err);
    return null;
  }
}

async function fetchFooterData() {
  try {
    const base = await getBaseUrl();
    const r = await fetch(`${base}/api/footer`, { cache: 'no-store' });
    if (!r.ok) throw new Error('failed');
    return await r.json();
  } catch (err) {
    console.error('Failed to pre-fetch footer:', err);
    return null;
  }
}

export default async function RootLayout({ children }) {
  const headerData = await fetchHeaderData();
  const footerData = await fetchFooterData();
  const siteSettingsData = await getSiteSettings();
  const siteUrl = getCanonicalBaseUrl(siteSettingsData);
  const siteName = siteSettingsData.siteName || footerData?.company?.name || 'MikuMantra Fine Jewellery';

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JewelryStore',
    name: siteName,
    url: siteUrl,
    logo: footerData?.company?.logo ? (footerData.company.logo.startsWith('http') ? footerData.company.logo : `${siteUrl}${footerData.company.logo}`) : `${siteUrl}/favicon.ico`,
    address: footerData?.company?.address ? { '@type': 'PostalAddress', streetAddress: footerData.company.address } : undefined,
    telephone: footerData?.company?.phone,
    email: footerData?.company?.email,
  };

  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        <Providers>
          <Navbar initialData={headerData} />
          {children}
          <Footer initialData={footerData} />
        </Providers>
        <AIChatMount />
        <Toaster position="top-center" richColors />
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      </body>
    </html>
  )
}
