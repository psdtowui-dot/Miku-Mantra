import './globals.css'
import Script from 'next/script'
import { Providers } from './providers'
import { Toaster } from 'sonner'
import AIChatMount from '@/components/site/ai-chat-mount'

import { headers } from 'next/headers'
import Navbar from '@/components/site/navbar';
import Footer from '@/components/site/footer';

import { getSiteSettings, getHeaderData, getFooterData, getCanonicalBaseUrl, toAbsoluteUrl } from '@/lib/db-site-settings';

export const dynamic = 'force-dynamic';

async function getBaseUrl() {
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
  if (process.env.NEXT_PUBLIC_BASE_URL && !process.env.NEXT_PUBLIC_BASE_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  return 'http://localhost:3000';
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
    icons: {
      icon: settings.favicon || settings.logo || '/favicon.ico',
      apple: settings.logo || '/favicon.ico',
    },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  };
}

export default async function RootLayout({ children }) {
  const [headerData, footerData, siteSettingsData] = await Promise.all([
    getHeaderData(),
    getFooterData(),
    getSiteSettings()
  ]);
  const siteUrl = getCanonicalBaseUrl(siteSettingsData);
  const siteName = siteSettingsData.siteName || footerData?.company?.name || 'MikuMantra Fine Jewellery';
  const effectiveLogo = siteSettingsData?.logo || headerData?.logo?.image || footerData?.company?.logo || '/logo.png';
  const fullLogoUrl = effectiveLogo.startsWith('http') ? effectiveLogo : `${siteUrl}${effectiveLogo.startsWith('/') ? '' : '/'}${effectiveLogo}`;

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JewelryStore',
    name: siteName,
    url: siteUrl,
    logo: fullLogoUrl,
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
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      </body>
    </html>
  )
}
