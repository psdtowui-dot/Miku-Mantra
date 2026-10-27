import './globals.css'
import Script from 'next/script'
import { Providers } from './providers'
import { Toaster } from 'sonner'
import AIChatMount from '@/components/site/ai-chat-mount'

import Navbar from '@/components/site/navbar';
import Footer from '@/components/site/footer';

import { getSiteSettings, getHeaderData, getFooterData, getCanonicalBaseUrl, toAbsoluteUrl } from '@/lib/db-site-settings';

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
      icon: [
        { url: settings.favicon || '/favicon.ico' }
      ],
      shortcut: [settings.favicon || '/favicon.ico'],
      apple: [
        { url: settings.favicon || settings.logo || '/favicon.ico' }
      ]
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap" />
        <link rel="preconnect" href="https://checkout.razorpay.com" />
        <link rel="dns-prefetch" href="https://checkout.razorpay.com" />
      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        <Providers>
          <Navbar initialData={headerData} />
          {children}
          <Footer initialData={footerData} />
        </Providers>
        <AIChatMount />
        <Toaster position="top-center" richColors />
        <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" />
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      </body>
    </html>
  )
}
