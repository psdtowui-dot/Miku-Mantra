import { getDb } from '@/lib/db';
import { PRODUCTS as SEED_PRODUCTS, CATEGORIES as SEED_CATEGORIES, COLLECTIONS as SEED_COLLECTIONS } from '@/lib/products';

export const revalidate = 3600;

async function getSitemapData() {
  // During build phase, use seed data to avoid build-time database network hangs
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return {
      products: SEED_PRODUCTS,
      categories: SEED_CATEGORIES,
      collections: SEED_COLLECTIONS,
    };
  }

  const directUrl = process.env.MONGO_DIRECT_URL;
  const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI || process.env.MONGO_DIRECT_URL || directUrl;
  if (!mongoUrl) {
    return {
      products: SEED_PRODUCTS,
      categories: SEED_CATEGORIES,
      collections: SEED_COLLECTIONS,
    };
  }

  try {
    const db = await getDb();
    if (!db) {
      return {
        products: SEED_PRODUCTS,
        categories: SEED_CATEGORIES,
        collections: SEED_COLLECTIONS,
      };
    }

    const [products, categories, collections] = await Promise.all([
      db.collection('products').find({
        active: { $ne: false },
        isDemoProduct: { $ne: true },
        status: { $nin: ['deleted', 'inactive', 'archived'] }
      }, { projection: { slug: 1, createdAt: 1 } }).toArray(),
      db.collection('categories').find({ active: { $ne: false } }, { projection: { slug: 1 } }).toArray(),
      db.collection('collections').find({}, { projection: { slug: 1 } }).toArray()
    ]);

    return {
      products: products.length > 0 ? products : SEED_PRODUCTS,
      categories: categories.length > 0 ? categories : SEED_CATEGORIES,
      collections: collections.length > 0 ? collections : SEED_COLLECTIONS,
    };
  } catch (err) {
    console.warn('Sitemap: Failed to query MongoDB directly, falling back to seed data:', err.message);
    return {
      products: SEED_PRODUCTS,
      categories: SEED_CATEGORIES,
      collections: SEED_COLLECTIONS,
    };
  }
}

export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://mikumantra.com';
  const now = new Date();
  const staticUrls = [
    { url: base, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/shop`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/compare`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${base}/wishlist`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
  ];

  const data = await getSitemapData();

  const productUrls = (data.products || []).map(x => ({
    url: `${base}/product/${x.slug}`,
    lastModified: new Date(x.createdAt || Date.now()),
    changeFrequency: 'weekly',
    priority: 0.8
  }));

  const catUrls = (data.categories || []).map(x => ({
    url: `${base}/shop?category=${x.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7
  }));

  const colUrls = (data.collections || []).map(x => ({
    url: `${base}/shop?collection=${x.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6
  }));

  return [...staticUrls, ...productUrls, ...catUrls, ...colUrls];
}

