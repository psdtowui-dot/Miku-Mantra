import './globals.css'
import Script from 'next/script'
import { Providers } from './providers'
import { Toaster } from 'sonner'
import AIChatMount from '@/components/site/ai-chat-mount'

import Navbar from '@/components/site/navbar';
import Footer from '@/components/site/footer';
import AnalyticsProvider from '@/components/analytics/AnalyticsProvider';

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
  const effectiveGtmId = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-5KLNQX63';

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
        {/* Google Consent Mode v2 & Google Tag Manager (GTM-5KLNQX63) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;

              var defaultState = {
                analytics_storage: 'denied',
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
                functionality_storage: 'granted',
                personalization_storage: 'denied',
                security_storage: 'granted',
                wait_for_update: 500
              };

              try {
                var raw = localStorage.getItem('mikumantra_consent_preferences_v2');
                if (raw) {
                  var parsed = JSON.parse(raw);
                  if (parsed && typeof parsed === 'object') {
                    defaultState.analytics_storage = parsed.analytics ? 'granted' : 'denied';
                    defaultState.ad_storage = parsed.marketing ? 'granted' : 'denied';
                    defaultState.ad_user_data = parsed.marketing ? 'granted' : 'denied';
                    defaultState.ad_personalization = parsed.marketing ? 'granted' : 'denied';
                    defaultState.personalization_storage = parsed.analytics ? 'granted' : 'denied';
                  }
                }
              } catch (e) {}

              gtag('consent', 'default', defaultState);
              dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
              gtag('js', new Date());
              dataLayer.push({ event: 'default_consent_initialized', consent_mode: defaultState });
            `,
          }}
        />
        <script async src={`https://www.googletagmanager.com/gtm.js?id=${effectiveGtmId}`} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Inter:wght@300;400;500;600&family=Playfair+Display:wght@400;600;700&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Inter:wght@300;400;500;600&family=Playfair+Display:wght@400;600;700&display=swap" media="print" onLoad="this.media='all'" />
        <noscript>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Inter:wght@300;400;500;600&family=Playfair+Display:wght@400;600;700&display=swap" />
        </noscript>
        <link rel="preconnect" href="https://checkout.razorpay.com" />
        <link rel="dns-prefetch" href="https://checkout.razorpay.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
      </head>
      <body>
        {effectiveGtmId ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${effectiveGtmId}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        ) : null}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        <AnalyticsProvider>
          <Providers>
            <Navbar initialData={headerData} />
            {children}
            <Footer initialData={footerData} />
          </Providers>
        </AnalyticsProvider>
        <AIChatMount />
        <Toaster position="top-center" richColors />
        <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" />
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      </body>
    </html>
  )
}
