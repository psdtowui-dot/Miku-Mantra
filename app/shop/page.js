import ShopClient from './shop-client';
import { getSiteSettings, getCanonicalBaseUrl, toAbsoluteUrl, applyTitleTemplate, getShopProductsDB, getShopFilterGroupsDB } from '@/lib/db-site-settings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ searchParams }) {
  const params = await searchParams;
  const settings = await getSiteSettings();
  const siteUrl = getCanonicalBaseUrl(settings);
  const siteName = settings.siteName || 'MikuMantra Fine Jewellery';

  const category = params?.category;
  const collection = params?.collection;
  const gender = params?.gender;

  let pageSubject = 'Fine Jewellery Shop';
  if (category) {
    pageSubject = `${category.replace('-', ' ')} Jewellery`;
  } else if (collection) {
    pageSubject = `${collection.replace('-', ' ')} Collection`;
  } else if (gender) {
    pageSubject = `${gender} Jewellery`;
  }

  const title = applyTitleTemplate(pageSubject, settings.titleTemplate, siteName);
  const description = `Explore ${pageSubject} at ${siteName}. Handcrafted 22K gold, diamond & bridal jewellery. BIS hallmarked & certified heirlooms.`;
  
  const rawQuery = new URLSearchParams(params || {}).toString();
  const shopUrl = rawQuery ? `${siteUrl}/shop?${rawQuery}` : `${siteUrl}/shop`;

  const ogImage = toAbsoluteUrl(settings.shareBanner || settings.ogImage, siteUrl);

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: { canonical: shopUrl },
    openGraph: {
      title,
      description,
      url: shopUrl,
      siteName,
      type: 'website',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ShopPage() {
  const [initialProducts, initialFilterGroups] = await Promise.all([
    getShopProductsDB(),
    getShopFilterGroupsDB()
  ]);
  const serializedProducts = initialProducts ? JSON.parse(JSON.stringify(initialProducts)) : [];
  const serializedFilters = initialFilterGroups ? JSON.parse(JSON.stringify(initialFilterGroups)) : [];
  return <ShopClient initialProducts={serializedProducts} initialFilterGroups={serializedFilters} />;
}
