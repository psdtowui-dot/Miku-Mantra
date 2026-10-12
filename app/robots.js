export default function robots(){
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://luxe-jewel-store.preview.emergentagent.com';
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/account', '/checkout', '/cart', '/wishlist', '/login'] },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
