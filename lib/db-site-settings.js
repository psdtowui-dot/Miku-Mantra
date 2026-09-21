import { MongoClient } from 'mongodb';
import dns from 'dns';
import { PRODUCTS as SEED_PRODUCTS, CATEGORIES as SEED_CATEGORIES, COLLECTIONS as SEED_COLLECTIONS } from './products.js';
import { DEFAULT_FOOTER, DEFAULT_HEADER, DEFAULT_SITE_SETTINGS, FALLBACK_HERO } from './site-defaults.js';

export { DEFAULT_FOOTER, DEFAULT_HEADER, DEFAULT_SITE_SETTINGS, FALLBACK_HERO };

// Server-side in-memory cache with TTL
const _siteCache = new Map();
function siteCacheGet(k) {
  const e = _siteCache.get(k);
  if (!e) return null;
  if (Date.now() > e.exp) { _siteCache.delete(k); return null; }
  return e.v;
}
function siteCacheSet(k, v, ttlMs = 60000) {
  _siteCache.set(k, { v, exp: Date.now() + ttlMs });
}
export function invalidateSiteDataCache(key) {
  if (!key) { _siteCache.clear(); return; }
  for (const k of _siteCache.keys()) {
    if (k.startsWith(key)) _siteCache.delete(k);
  }
}

const DEFAULT_CANONICAL_DOMAIN = 'https://jwellary-site-ten.vercel.app';

let client = null;
let db = null;
let connectPromise = null;

const DIRECT_MONGO_FALLBACK = "mongodb://akashsriv1984_db_user:2M5Edv773XLUmT15@ac-htqrxv1-shard-00-00.7szyylz.mongodb.net:27017,ac-htqrxv1-shard-00-01.7szyylz.mongodb.net:27017,ac-htqrxv1-shard-00-02.7szyylz.mongodb.net:27017/userPortal?ssl=true&replicaSet=atlas-1c5jr9-shard-0&authSource=admin&retryWrites=true&w=majority";

async function getDb() {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return null;
  }
  const directUrl = process.env.MONGO_DIRECT_URL || DIRECT_MONGO_FALLBACK;
  const mongoUrl = process.env.MONGO_DIRECT_URL || process.env.MONGO_URL || process.env.MONGODB_URI || directUrl;
  if (!mongoUrl) return null;

  if (db) return db;

  if (!connectPromise) {
    connectPromise = (async () => {
      try {
        try {
          dns.setServers(['8.8.8.8', '1.1.1.1']);
        } catch (e) {}
        try {
          client = new MongoClient(mongoUrl, {
            connectTimeoutMS: 6000,
            socketTimeoutMS: 6000,
            serverSelectionTimeoutMS: 6000,
          });
          await client.connect();
        } catch (srvErr) {
          if (directUrl && mongoUrl !== directUrl) {
            client = new MongoClient(directUrl, {
              connectTimeoutMS: 6000,
              socketTimeoutMS: 6000,
              serverSelectionTimeoutMS: 6000,
            });
            await client.connect();
          } else {
            throw srvErr;
          }
        }
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
  const cached = siteCacheGet('site_settings');
  if (cached) return cached;

  try {
    const database = await getDb();
    if (database) {
      const doc = await database.collection('site_settings').findOne({ id: 'default' });
      if (doc) {
        const result = {
          ...DEFAULT_SITE_SETTINGS,
          ...doc,
          shipping: {
            ...DEFAULT_SITE_SETTINGS.shipping,
            ...(doc.shipping || {})
          },
          paymentSettings: {
            razorpay: {
              ...DEFAULT_SITE_SETTINGS.paymentSettings?.razorpay,
              ...(doc.paymentSettings?.razorpay || {})
            },
            cod: {
              ...DEFAULT_SITE_SETTINGS.paymentSettings?.cod,
              ...(doc.paymentSettings?.cod || {})
            }
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
        siteCacheSet('site_settings', result, 60000);
        return result;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch site_settings from MongoDB:', err.message);
  }
  siteCacheSet('site_settings', DEFAULT_SITE_SETTINGS, 60000);
  return DEFAULT_SITE_SETTINGS;
}

export async function getHeaderData() {
  const cached = siteCacheGet('header_config');
  if (cached) return cached;
  try {
    const database = await getDb();
    if (database) {
      const doc = await database.collection('header').findOne({ id: 'default' });
      if (doc) {
        const { _id, ...clean } = doc;
        siteCacheSet('header_config', clean, 60000);
        return clean;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch header from MongoDB:', err.message);
  }
  siteCacheSet('header_config', DEFAULT_HEADER, 60000);
  return DEFAULT_HEADER;
}

export async function getFooterData() {
  const cached = siteCacheGet('footer_config');
  if (cached) return cached;
  try {
    const database = await getDb();
    if (database) {
      const doc = await database.collection('footer').findOne({ id: 'default' });
      if (doc) {
        const { _id, ...clean } = doc;
        siteCacheSet('footer_config', clean, 60000);
        return clean;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch footer from MongoDB:', err.message);
  }
  siteCacheSet('footer_config', DEFAULT_FOOTER, 60000);
  return DEFAULT_FOOTER;
}

export async function getHomepageData() {
  const cached = siteCacheGet('homepage_data');
  if (cached) return cached;

  try {
    const database = await getDb();
    if (database) {
      const [products, categories, collections, banners, settings] = await Promise.all([
        database.collection('products').find({}).toArray().catch(() => []),
        database.collection('categories').find({}).toArray().catch(() => []),
        database.collection('collections').find({}).toArray().catch(() => []),
        database.collection('banners').find({ active: { $ne: false } }).sort({ order: 1 }).toArray().catch(() => []),
        getSiteSettings().catch(() => DEFAULT_SITE_SETTINGS)
      ]);

      const result = {
        products: products && products.length > 0 ? products.map(p => { const { _id, ...r } = p; return r; }) : SEED_PRODUCTS,
        categories: categories && categories.length > 0 ? categories.map(c => { const { _id, ...r } = c; return r; }) : SEED_CATEGORIES,
        collections: collections && collections.length > 0 ? collections.map(k => { const { _id, ...r } = k; return r; }) : SEED_COLLECTIONS,
        banners: banners && banners.length > 0 ? banners.map(b => { const { _id, ...r } = b; return r; }) : FALLBACK_HERO,
        transition: banners?.[0]?.transition || 'fade',
        homepageCMS: {
          homepagePromotions: settings.homepagePromotions || [],
          assuranceSection: settings.assuranceSection || DEFAULT_SITE_SETTINGS.assuranceSection,
          assuranceCards: settings.assuranceCards || DEFAULT_SITE_SETTINGS.assuranceCards
        }
      };

      siteCacheSet('homepage_data', result, 60000);
      return result;
    }
  } catch (err) {
    console.warn('Failed to fetch homepage data from MongoDB:', err.message);
  }

  const fallback = {
    products: SEED_PRODUCTS,
    categories: SEED_CATEGORIES,
    collections: SEED_COLLECTIONS,
    banners: FALLBACK_HERO,
    transition: 'fade',
    homepageCMS: {
      homepagePromotions: DEFAULT_SITE_SETTINGS.homepagePromotions,
      assuranceSection: DEFAULT_SITE_SETTINGS.assuranceSection,
      assuranceCards: DEFAULT_SITE_SETTINGS.assuranceCards
    }
  };
  siteCacheSet('homepage_data', fallback, 60000);
  return fallback;
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
