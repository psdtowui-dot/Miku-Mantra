import { MongoClient } from 'mongodb';
import dns from 'dns';
import { PRODUCTS as SEED_PRODUCTS, CATEGORIES as SEED_CATEGORIES, COLLECTIONS as SEED_COLLECTIONS } from './products.js';

const DEFAULT_SITE_SETTINGS = {
  siteName: 'MikuMantra Fine Jewellery',
  seoTitle: 'MikuMantra — House of Fine Jewellery',
  titleTemplate: '%s | MikuMantra',
  seoDescription: 'Discover handcrafted 22K gold, diamond & bridal jewellery. BIS hallmarked. SGL certified. Timeless heirlooms designed in Jaipur, worn across the world.',
  keywords: ['jewellery', 'gold', 'diamond', 'bridal', 'wedding', 'solitaire', '22K', 'India', 'MikuMantra', 'fine jewellery'],
  shareTitle: 'MikuMantra — House of Fine Jewellery',
  shareDescription: 'Handcrafted 22K gold, diamond & bridal jewellery. Certified. Hallmarked. Timeless.',
  shareBanner: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?crop=entropy&cs=srgb&fm=jpg&q=85',
  ogImage: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?crop=entropy&cs=srgb&fm=jpg&q=85',
  twitterImage: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?crop=entropy&cs=srgb&fm=jpg&q=85',
  siteUrl: 'https://jwellary-site-ten.vercel.app',
  favicon: '/favicon.ico',
  shipping: {
    freeShippingEnabled: true,
    freeShippingThreshold: 2000,
    standardShippingCharge: 500
  },
  customerReviewsEnabled: true,
  homepagePromotions: [
    {
      id: 'promo_1',
      enabled: true,
      img: 'https://images.unsplash.com/photo-1600685890506-593fdf55949b?crop=entropy&cs=srgb&fm=jpg&q=85',
      eyebrow: 'Limited Time',
      title: 'The Wedding Trunk',
      subtitle: 'Up to 15% off on making charges',
      ctaText: 'Shop the Offer',
      ctaUrl: '/shop?category=wedding',
      order: 1
    },
    {
      id: 'promo_2',
      enabled: true,
      img: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?crop=entropy&cs=srgb&fm=jpg&q=85',
      eyebrow: 'Limited Time',
      title: 'Solitaires under ₹1.5L',
      subtitle: 'GIA certified. Made to promise.',
      ctaText: 'Shop the Offer',
      ctaUrl: '/shop?category=diamond',
      order: 2
    }
  ],
  assuranceSection: {
    enabled: true,
    eyebrow: 'Our Promise',
    title: 'The MikuMantra Assurance',
    description: 'Six generations of craftsmanship, ten values that never change.'
  },
  assuranceCards: [
    { id: 'assur_1', icon: 'ShieldCheck', title: 'BIS Hallmarked', description: 'Every piece government certified.', enabled: true, order: 1 },
    { id: 'assur_2', icon: 'Award', title: 'SGL & GIA Certified', description: 'Independently graded diamonds.', enabled: true, order: 2 },
    { id: 'assur_3', icon: 'Truck', title: 'Complimentary Shipping', description: 'Insured, tracked, delivered.', enabled: true, order: 3 },
    { id: 'assur_4', icon: 'RefreshCw', title: '15-Day Easy Returns', description: 'Full refund, no questions.', enabled: true, order: 4 },
    { id: 'assur_5', icon: 'Sparkles', title: 'Lifetime Care', description: 'Free cleaning & polishing.', enabled: true, order: 5 },
    { id: 'assur_6', icon: 'Heart', title: 'Lifetime Buyback', description: '100% gold value assured.', enabled: true, order: 6 }
  ]
};

const DEFAULT_CANONICAL_DOMAIN = 'https://jwellary-site-ten.vercel.app';

let client = null;
let db = null;
let connectPromise = null;

async function getDb() {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return null;
  }
  const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI;
  if (!mongoUrl) return null;

  if (db) return db;

  if (!connectPromise) {
    connectPromise = (async () => {
      try {
        try {
          dns.setServers(['8.8.8.8', '1.1.1.1']);
        } catch (e) {}
        client = new MongoClient(mongoUrl, {
          connectTimeoutMS: 6000,
          socketTimeoutMS: 6000,
          serverSelectionTimeoutMS: 6000,
        });
        await client.connect();
        db = client.db(process.env.DB_NAME || 'userPortal');
        return db;
      } catch (err) {
        connectPromise = null;
        console.warn('DB Settings Helper: Mongo connection failed, fallback to defaults:', err.message);
        return null;
      }
    })();
  }
  return connectPromise;
}

export function calculateShippingCharge(subtotal, shippingConfig = {}) {
  const { freeShippingEnabled = true, freeShippingThreshold = 2000, standardShippingCharge = 500 } = shippingConfig || {};
  const sub = Number(subtotal) || 0;
  if (sub <= 0) return 0;
  if (freeShippingEnabled && sub >= Number(freeShippingThreshold)) return 0;
  return Number(standardShippingCharge) || 0;
}

export async function getSiteSettings() {
  try {
    const database = await getDb();
    if (database) {
      const doc = await database.collection('site_settings').findOne({ id: 'default' });
      if (doc) {
        return {
          ...DEFAULT_SITE_SETTINGS,
          ...doc,
          shipping: {
            ...DEFAULT_SITE_SETTINGS.shipping,
            ...(doc.shipping || {})
          },
          customerReviewsEnabled: doc.customerReviewsEnabled ?? true,
          homepagePromotions: doc.homepagePromotions ?? DEFAULT_SITE_SETTINGS.homepagePromotions,
          assuranceSection: {
            ...DEFAULT_SITE_SETTINGS.assuranceSection,
            ...(doc.assuranceSection || {})
          },
          assuranceCards: doc.assuranceCards ?? DEFAULT_SITE_SETTINGS.assuranceCards,
          shareBanner: doc.shareBanner || doc.ogImage || DEFAULT_SITE_SETTINGS.shareBanner,
          ogImage: doc.ogImage || doc.shareBanner || DEFAULT_SITE_SETTINGS.ogImage,
          twitterImage: doc.twitterImage || doc.shareBanner || doc.ogImage || DEFAULT_SITE_SETTINGS.twitterImage,
        };
      }
    }
  } catch (err) {
    console.warn('Failed to fetch site_settings from MongoDB:', err.message);
  }
  return DEFAULT_SITE_SETTINGS;
}

export async function getProductBySlugDB(slug) {
  try {
    const database = await getDb();
    if (database) {
      const p = await database.collection('products').findOne({
        $or: [{ slug: slug }, { id: slug }]
      });
      if (p) {
        const { _id, ...cleanProduct } = p;
        return cleanProduct;
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch product ${slug} from MongoDB:`, err.message);
  }

  // Fallback to seed products
  const foundSeed = SEED_PRODUCTS.find(p => p.slug === slug || p.id === slug);
  return foundSeed || null;
}

export function getCanonicalBaseUrl(settings) {
  let url = settings?.siteUrl || process.env.NEXT_PUBLIC_BASE_URL || DEFAULT_CANONICAL_DOMAIN;
  url = url.trim();

  // If localhost or preview domain, override with production Vercel domain in production metadata
  if (url.includes('localhost') || url.includes('emergentagent.com') || !url.startsWith('http')) {
    url = DEFAULT_CANONICAL_DOMAIN;
  }

  return url.replace(/\/$/, '');
}

export function toAbsoluteUrl(urlStr, baseUrl) {
  const base = baseUrl ? baseUrl.replace(/\/$/, '') : DEFAULT_CANONICAL_DOMAIN;
  if (!urlStr || typeof urlStr !== 'string') {
    return `${base}/api/uploads/default-og.jpg`;
  }

  const trimmed = urlStr.trim();
  if (trimmed.startsWith('data:')) return `${base}/favicon.ico`;

  if (trimmed.startsWith('/')) {
    return `${base}${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes('localhost') || parsed.hostname.includes('emergentagent.com')) {
      return `${base}${parsed.pathname}${parsed.search}`;
    }
    return parsed.toString();
  } catch {
    return `${base}/${trimmed.replace(/^\/+/, '')}`;
  }
}

export function applyTitleTemplate(titleText, templateStr, siteName) {
  const name = siteName || 'MikuMantra';
  if (!titleText) return `MikuMantra — House of Fine Jewellery`;

  const template = templateStr || '%s | ' + name;
  if (titleText.includes(name) || titleText.includes('|') || titleText.includes('—')) {
    return titleText;
  }

  if (template.includes('%s')) {
    return template.replace('%s', titleText);
  }

  return `${titleText} | ${name}`;
}
