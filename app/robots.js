export default function robots(){
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://mikumantra.com';
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/account', '/checkout', '/cart', '/wishlist', '/login'] },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
