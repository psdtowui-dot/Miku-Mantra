import ProductClient from './product-client';
import { getSiteSettings, getProductBySlugDB, getCanonicalBaseUrl, toAbsoluteUrl, applyTitleTemplate } from '@/lib/db-site-settings';

export async function generateMetadata({ params }){
  const { slug } = await params;
  const [p, settings] = await Promise.all([
    getProductBySlugDB(slug),
    getSiteSettings()
  ]);

  const siteName = settings.siteName || 'MikuMantra Fine Jewellery';
  const siteUrl = getCanonicalBaseUrl(settings);

  if (!p) {
    const notFoundTitle = applyTitleTemplate('Product Not Found', settings.titleTemplate, siteName);
    return {
      metadataBase: new URL(siteUrl),
      title: notFoundTitle,
      description: settings.seoDescription
    };
  }

  const title = p.seoTitle
    ? applyTitleTemplate(p.seoTitle, settings.titleTemplate, siteName)
    : applyTitleTemplate(p.name, settings.titleTemplate, siteName);

  const description = p.seoDescription || (p.description || '').slice(0, 160) || settings.seoDescription;
  const productUrl = `${siteUrl}/product/${p.slug || slug}`;

  const rawImages = (p.images && p.images.length > 0) ? p.images : [settings.shareBanner || settings.ogImage];
  const ogImages = rawImages.map(img => ({
    url: toAbsoluteUrl(img, siteUrl),
    width: 1200,
    height: 1200,
    alt: p.name || title
  }));

  const mainImageUrl = toAbsoluteUrl(rawImages[0], siteUrl);

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: { canonical: productUrl },
    openGraph: {
      title,
      description,
      url: productUrl,
      siteName,
      type: 'website',
      images: ogImages,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [mainImageUrl],
    },
  };
}

export default async function Page({ params }){
  const { slug } = await params;
  const [p, settings] = await Promise.all([
    getProductBySlugDB(slug),
    getSiteSettings()
  ]);
  const siteUrl = getCanonicalBaseUrl(settings);
  const productUrl = p ? `${siteUrl}/product/${p.slug || slug}` : '';

  const jsonLd = p ? {
    '@context':'https://schema.org', '@type':'Product',
    name: p.name, description: p.description, sku: p.sku || p.id,
    image: (p.images || []).map(img => toAbsoluteUrl(img, siteUrl)),
    brand: { '@type':'Brand', name: settings.siteName || 'MikuMantra' },
    aggregateRating: p.rating ? { '@type':'AggregateRating', ratingValue: p.rating, reviewCount: p.reviews || 1 } : undefined,
    offers: {
      '@type':'Offer',
      priceCurrency:'INR',
      price: p.price,
      availability: (p.stock ?? 1) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: productUrl
    },
    material: p.metal, weight: p.weight,
  } : null;

  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}}/>}
      <ProductClient initialProduct={p} slug={slug} siteSettings={settings} />
    </>
  );
}
