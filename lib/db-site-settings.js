import { MongoClient } from 'mongodb';
import dns from 'dns';
import { cache } from 'react';
import { PRODUCTS as SEED_PRODUCTS, CATEGORIES as SEED_CATEGORIES, COLLECTIONS as SEED_COLLECTIONS, DEFAULT_PRODUCT_FILTERS } from './products.js';
import { DEFAULT_FOOTER, DEFAULT_HEADER, DEFAULT_SITE_SETTINGS, FALLBACK_HERO, DEFAULT_SOCIAL_MEDIA_SETTINGS, DEFAULT_SOCIAL_MEDIA_ITEMS, DEFAULT_CATEGORY_SHOWCASE_SETTINGS } from './site-defaults.js';

export { DEFAULT_FOOTER, DEFAULT_HEADER, DEFAULT_SITE_SETTINGS, FALLBACK_HERO, DEFAULT_SOCIAL_MEDIA_SETTINGS, DEFAULT_SOCIAL_MEDIA_ITEMS, DEFAULT_CATEGORY_SHOWCASE_SETTINGS };

// Server-side in-memory cache with TTL
const _siteCache = new Map();
function siteCacheGet(k) {
  const e = _siteCache.get(k);
  if (!e) return null;
  if (Date.now() > e.exp) { _siteCache.delete(k); return null; }
  return e.v;
}
function siteCacheSet(k, v, ttlMs = 5000) {
  _siteCache.set(k, { v, exp: Date.now() + ttlMs });
}
export function invalidateSiteDataCache(key) {
  if (!key) { _siteCache.clear(); return; }
  for (const k of _siteCache.keys()) {
    if (k.startsWith(key)) _siteCache.delete(k);
  }
}

const DEFAULT_CANONICAL_DOMAIN = 'https://jwellary-site-ten.vercel.app';

import { getDb as getSharedDb } from './db.js';

async function getDb() {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return null;
  }
  try {
    return await getSharedDb();
  } catch (err) {
    console.warn('DB Settings Helper: Mongo connection failed, fallback to defaults:', err.message);
    return null;
  }
}

export function calculateShippingCharge(subtotal, shippingConfig = {}) {
  const { freeShippingEnabled = true, freeShippingThreshold = 2000, standardShippingCharge = 500 } = shippingConfig || {};
  const sub = Number(subtotal) || 0;
  if (sub <= 0) return 0;
  if (freeShippingEnabled && sub >= Number(freeShippingThreshold)) return 0;
  return Number(standardShippingCharge) || 0;
}

async function _getSiteSettings() {
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
          returnWindow: {
            ...DEFAULT_SITE_SETTINGS.returnWindow,
            ...(doc.returnWindow || {})
          },
          customerReviewsEnabled: doc.customerReviewsEnabled ?? true,
          zoomSettings: {
            ...DEFAULT_SITE_SETTINGS.zoomSettings,
            ...(doc.zoomSettings || {}),
            desktop: {
              ...DEFAULT_SITE_SETTINGS.zoomSettings.desktop,
              ...(doc.zoomSettings?.desktop || {
                enabled: doc.zoomSettings?.enabled !== false,
                mode: doc.zoomSettings?.mode || 'side-by-side',
                zoomLevel: Number(doc.zoomSettings?.zoomLevel) || 2.5,
                showCrosshair: doc.zoomSettings?.showCrosshair !== false,
                lensSize: Number(doc.zoomSettings?.lensSize) || 160,
                lensBorderColor: doc.zoomSettings?.lensBorderColor || '#D4AF37',
                allowCustomerToggle: doc.zoomSettings?.allowCustomerToggle !== false,
                modalZoomEnabled: doc.zoomSettings?.modalZoomEnabled !== false
              })
            },
            tablet: {
              ...DEFAULT_SITE_SETTINGS.zoomSettings.tablet,
              ...(doc.zoomSettings?.tablet || {})
            },
            mobile: {
              ...DEFAULT_SITE_SETTINGS.zoomSettings.mobile,
              ...(doc.zoomSettings?.mobile || {})
            }
          },
          homepagePromotions: doc.homepagePromotions ?? DEFAULT_SITE_SETTINGS.homepagePromotions,
          assuranceSection: {
            ...DEFAULT_SITE_SETTINGS.assuranceSection,
            ...(doc.assuranceSection || {})
          },
          assuranceCards: doc.assuranceCards ?? DEFAULT_SITE_SETTINGS.assuranceCards,
          shareBanner: doc.shareBanner || doc.ogImage || DEFAULT_SITE_SETTINGS.shareBanner,
          ogImage: doc.ogImage || doc.shareBanner || DEFAULT_SITE_SETTINGS.ogImage,
          twitterImage: doc.twitterImage || doc.shareBanner || doc.ogImage || DEFAULT_SITE_SETTINGS.twitterImage,
          logo: doc.logo || DEFAULT_SITE_SETTINGS.logo || '/logo.png',
        };
        siteCacheSet('site_settings', result, 60000);
        return result;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch site_settings from MongoDB:', err.message);
  }
  siteCacheSet('site_settings', DEFAULT_SITE_SETTINGS, 5000);
  return DEFAULT_SITE_SETTINGS;
}
export const getSiteSettings = cache(_getSiteSettings);

async function _getHeaderData() {
  const cached = siteCacheGet('header_config');
  if (cached) return cached;
  try {
    const database = await getDb();
    if (database) {
      const doc = await database.collection('header').findOne({ id: 'default' });
      if (doc) {
        const { _id, ...clean } = doc;
        clean.logo = {
          ...DEFAULT_HEADER.logo,
          ...(clean.logo || {}),
          image: clean.logo?.image || '/logo.png'
        };
        siteCacheSet('header_config', clean, 5000);
        return clean;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch header from MongoDB:', err.message);
  }
  siteCacheSet('header_config', DEFAULT_HEADER, 5000);
  return DEFAULT_HEADER;
}
export const getHeaderData = cache(_getHeaderData);

async function _getFooterData() {
  const cached = siteCacheGet('footer_config');
  if (cached) return cached;
  try {
    const database = await getDb();
    if (database) {
      const doc = await database.collection('footer').findOne({ id: 'default' });
      if (doc) {
        const { _id, ...clean } = doc;
        clean.company = {
          ...DEFAULT_FOOTER.company,
          ...(clean.company || {}),
          logo: clean.company?.logo || '/logo.png'
        };
        siteCacheSet('footer_config', clean, 5000);
        return clean;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch footer from MongoDB:', err.message);
  }
  siteCacheSet('footer_config', DEFAULT_FOOTER, 5000);
  return DEFAULT_FOOTER;
}
export const getFooterData = cache(_getFooterData);

async function _getHomepageData() {
  const cached = siteCacheGet('homepage_data');
  if (cached) return cached;

  try {
    const database = await getDb();
    if (database) {
      const [products, categories, collections, banners, settings, socialMediaItems, socialSettingsDoc, categorySettingsDoc, newsletterSettingsDoc] = await Promise.all([
        // High-performance projection and limit for homepage featured cards
        database.collection('products').find(
          { active: { $ne: false }, isDemoProduct: { $ne: true }, status: { $nin: ['deleted', 'inactive', 'archived'] } },
          {
            projection: {
              id: 1, slug: 1, name: 1, sku: 1, price: 1, mrp: 1, category: 1,
              collection: 1, gender: 1, metal: 1, images: 1, image: 1, badge: 1,
              stock: 1, rating: 1, reviews: 1, featured: 1, bestseller: 1,
              newArrival: 1, createdAt: 1
            }
          }
        ).sort({ createdAt: -1 }).limit(32).toArray().catch(() => []),

        database.collection('categories').find(
          { active: { $ne: false }, enabled: { $ne: false } },
          { projection: { id: 1, name: 1, slug: 1, img: 1, imageUrl: 1, link: 1, buttonText: 1, order: 1, displayOrder: 1, active: 1, enabled: 1, openInNewTab: 1 } }
        ).sort({ order: 1, displayOrder: 1, createdAt: 1 }).toArray().catch(() => []),

        database.collection('collections').find(
          {},
          { projection: { id: 1, name: 1, slug: 1, image: 1, active: 1 } }
        ).toArray().catch(() => []),

        database.collection('banners').find(
          { active: { $ne: false } },
          { projection: { id: 1, title: 1, kicker: 1, copy: 1, cta: 1, href: 1, img: 1, order: 1, transition: 1, active: 1 } }
        ).sort({ order: 1 }).toArray().catch(() => []),

        getSiteSettings().catch(() => DEFAULT_SITE_SETTINGS),

        database.collection('social_media').find(
          { isActive: true },
          { projection: { id: 1, title: 1, username: 1, platform: 1, url: 1, image: 1, thumbnailUrl: 1, displayOrder: 1, isActive: 1, openInNewTab: 1 } }
        ).sort({ displayOrder: 1 }).toArray().catch(() => []),

        database.collection('social_media_settings').findOne({ id: 'default' }).catch(() => null),
        database.collection('category_showcase_settings').findOne({ id: 'default' }).catch(() => null),
        database.collection('newsletter_settings').findOne({ id: 'default' }).catch(() => null)
      ]);

      const { _id: _socialSettingsId, ...cleanSocialSettings } = socialSettingsDoc || {};
      const { _id: _categorySettingsId, ...cleanCategorySettings } = categorySettingsDoc || {};
      const { _id: _newsletterSettingsId, ...cleanNewsletterSettings } = newsletterSettingsDoc || {};

      const result = {
        products: products && products.length > 0 ? products.map(p => { const { _id, ...r } = p; return r; }) : [],
        categories: categories && categories.length > 0 ? categories.map(c => {
          const { _id, ...r } = c;
          return {
            ...r,
            id: r.id || String(_id),
            name: r.name,
            slug: r.slug,
            img: r.img || r.imageUrl || '',
            link: r.link || `/shop?category=${r.slug}`,
            buttonText: r.buttonText || '',
            displayOrder: Number(r.order ?? r.displayOrder ?? 0),
            isActive: r.active !== false && r.enabled !== false,
            openInNewTab: !!r.openInNewTab
          };
        }) : SEED_CATEGORIES,
        categoryShowcaseSettings: {
          ...DEFAULT_CATEGORY_SHOWCASE_SETTINGS,
          ...cleanCategorySettings
        },
        collections: (() => {
          const raw = collections && collections.length > 0 ? collections.map(k => { const { _id, ...r } = k; return r; }) : SEED_COLLECTIONS;
          const seen = new Set();
          return raw.filter(c => {
            if (!c?.slug || seen.has(c.slug)) return false;
            seen.add(c.slug);
            return true;
          });
        })(),
        banners: banners && banners.length > 0 ? banners.map(b => { const { _id, ...r } = b; return r; }) : FALLBACK_HERO,
        transition: banners?.[0]?.transition || 'fade',
        logo: settings.logo || DEFAULT_SITE_SETTINGS.logo || '/logo.png',
        socialMedia: socialMediaItems && socialMediaItems.length > 0 ? socialMediaItems.map(s => {
          const { _id, ...r } = s;
          const thumb = r.thumbnailUrl || r.image || '';
          return {
            ...r,
            thumbnailUrl: thumb,
            image: thumb
          };
        }) : DEFAULT_SOCIAL_MEDIA_ITEMS,
        socialMediaSettings: {
          ...DEFAULT_SOCIAL_MEDIA_SETTINGS,
          ...cleanSocialSettings
        },
        newsletterSettings: newsletterSettingsDoc ? cleanNewsletterSettings : null,
        homepageCMS: {
          logo: settings.logo || DEFAULT_SITE_SETTINGS.logo || '/logo.png',
          homepagePromotions: settings.homepagePromotions || [],
          assuranceSection: settings.assuranceSection || DEFAULT_SITE_SETTINGS.assuranceSection,
          assuranceCards: settings.assuranceCards || DEFAULT_SITE_SETTINGS.assuranceCards
        }
      };

      const plainResult = JSON.parse(JSON.stringify(result));
      siteCacheSet('homepage_data', plainResult, 5000);
      return plainResult;
    }
  } catch (err) {
    console.warn('Failed to fetch homepage data from MongoDB:', err.message);
  }

  const fallback = {
    products: [],
    categories: SEED_CATEGORIES,
    categoryShowcaseSettings: DEFAULT_CATEGORY_SHOWCASE_SETTINGS,
    collections: SEED_COLLECTIONS,
    banners: FALLBACK_HERO,
    transition: 'fade',
    logo: DEFAULT_SITE_SETTINGS.logo || '/logo.png',
    socialMedia: DEFAULT_SOCIAL_MEDIA_ITEMS,
    socialMediaSettings: DEFAULT_SOCIAL_MEDIA_SETTINGS,
    newsletterSettings: null,
    homepageCMS: {
      logo: DEFAULT_SITE_SETTINGS.logo || '/logo.png',
      homepagePromotions: DEFAULT_SITE_SETTINGS.homepagePromotions,
      assuranceSection: DEFAULT_SITE_SETTINGS.assuranceSection,
      assuranceCards: DEFAULT_SITE_SETTINGS.assuranceCards
    }
  };
  return fallback;
}
export const getHomepageData = cache(_getHomepageData);

async function _getProductBySlugDB(slug) {
  if (!slug) return null;
  const cachedKey = `product_${slug}`;
  const cached = siteCacheGet(cachedKey);
  if (cached) return cached;

  try {
    const database = await getDb();
    if (database) {
      const activeFilter = {
        active: { $ne: false },
        isDemoProduct: { $ne: true },
        status: { $nin: ['deleted', 'inactive', 'archived'] }
      };

      // Fast exact index lookup first
      let p = await database.collection('products').findOne({
        $or: [{ slug: slug }, { id: slug }],
        ...activeFilter
      });

      // Case-insensitive regex fallback only when exact lookup fails
      if (!p) {
        const safeRegex = String(slug).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        p = await database.collection('products').findOne({
          slug: new RegExp('^' + safeRegex + '$', 'i'),
          ...activeFilter
        });
      }

      if (p) {
        const { _id, ...cleanProduct } = p;
        let related = [];
        try {
          related = await database.collection('products').find({
            category: cleanProduct.category,
            id: { $ne: cleanProduct.id },
            ...activeFilter
          }, {
            projection: {
              id: 1, slug: 1, name: 1, sku: 1, price: 1, mrp: 1, category: 1,
              collection: 1, gender: 1, metal: 1, stone: 1, images: 1, image: 1,
              badge: 1, stock: 1, rating: 1, reviews: 1, createdAt: 1
            }
          }).limit(4).toArray();
        } catch (_) {}

        cleanProduct.related = (related || []).map(r => {
          const { _id: rId, ...rClean } = r;
          return rClean;
        });

        siteCacheSet(cachedKey, cleanProduct, 5000);
        return cleanProduct;
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch product ${slug} from MongoDB:`, err.message);
  }

  return null;
}
export const getProductBySlugDB = cache(_getProductBySlugDB);

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

async function _getShopProductsDB() {
  const cached = siteCacheGet('shop_products');
  if (cached) return cached;

  try {
    const database = await getDb();
    if (!database) return [];
    const list = await database.collection('products').find({
      active: { $ne: false },
      isDemoProduct: { $ne: true },
      status: { $nin: ['deleted', 'inactive', 'archived'] }
    }, {
      projection: {
        id: 1, slug: 1, name: 1, sku: 1, price: 1, mrp: 1, category: 1, subcategory: 1,
        collection: 1, gender: 1, metal: 1, stone: 1, images: 1, image: 1, badge: 1,
        stock: 1, rating: 1, reviews: 1, featured: 1, bestseller: 1, newArrival: 1,
        specifications: 1, productBenefits: 1, createdAt: 1,
        meta: 1, description: 1, shortDesc: 1, tags: 1, isBestseller: 1, isNew: 1,
        purity: 1, weight: 1, size: 1
      }
    }).sort({ createdAt: -1 }).toArray();

    const result = list.map(p => {
      const { _id, ...clean } = p;
      return clean;
    });
    siteCacheSet('shop_products', result, 5000);
    return result;
  } catch (e) {
    console.warn('Failed to fetch shop products from DB:', e.message);
    return [];
  }
}
export const getShopProductsDB = cache(_getShopProductsDB);

async function _getShopFilterGroupsDB() {
  const cached = siteCacheGet('shop_filter_groups');
  if (cached) return cached;

  try {
    const database = await getDb();
    if (!database) return DEFAULT_PRODUCT_FILTERS;
    const list = await database.collection('product_filters').find({ enabled: { $ne: false } }).sort({ order: 1 }).toArray();
    const result = (list && list.length > 0)
      ? list.map(f => {
          const { _id, ...clean } = f;
          return clean;
        })
      : DEFAULT_PRODUCT_FILTERS;
    siteCacheSet('shop_filter_groups', result, 5000);
    return result;
  } catch (e) {
    console.warn('Failed to fetch shop filter groups from DB:', e.message);
    return DEFAULT_PRODUCT_FILTERS;
  }
}
export const getShopFilterGroupsDB = cache(_getShopFilterGroupsDB);
