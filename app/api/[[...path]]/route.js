import { MongoClient } from 'mongodb'
import dns from 'dns'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import fs from 'fs'
import pathModule from 'path'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { PRODUCTS as SEED_PRODUCTS, CATEGORIES as SEED_CATEGORIES, COLLECTIONS as SEED_COLLECTIONS, DEFAULT_PRODUCT_BENEFITS, DEFAULT_PRODUCT_FILTERS } from '@/lib/products'
import { buildInvoicePDF } from '@/lib/pdf-invoice'
import { buildShippingSlipPDF } from '@/lib/pdf-shippingslip'
import { WAREHOUSE_PINCODE } from '@/lib/constants'
import { sendOrderPlacedNotification, sendOrderCancelledNotification, sendOrderShippedNotification, sendReturnRequestedNotification, sendReturnApprovedNotification, sendReturnRejectedNotification, sendRefundCompletedNotification, sendPushNotification } from '@/lib/notifications'
import { generateTrackingUrl } from '@/lib/courier'
import { sendPasswordResetEmail, checkEmailProviderStatus, sendTestCampaignEmail } from '@/lib/email-service'
import { calculateCartPricing, validateCouponRules } from '@/lib/cart-pricing'
import { seedRbacIfEmpty, resolveUserPermissions, hasPermission, logAdminActivity, validatePrivilegeEscalation, PERMISSIONS, DEFAULT_ROLES } from '@/lib/rbac'
import { invalidateSiteDataCache } from '@/lib/db-site-settings'
import { DEFAULT_SOCIAL_MEDIA_SETTINGS, DEFAULT_SOCIAL_MEDIA_ITEMS, DEFAULT_CATEGORY_SHOWCASE_SETTINGS } from '@/lib/site-defaults'
import {
  subscribeCustomer, getSubscribers, updateSubscriberStatus, deleteSubscriber,
  exportSubscribersCSV, getNewsletterSettings, updateNewsletterSettings,
  getWelcomeTemplate, updateWelcomeTemplate, handleBulkSubscriberAction,
  getCampaigns, getCampaignById, createCampaign, updateCampaign, deleteCampaign,
  cancelCampaign, executeCampaignSend, getCampaignLogs, processUnsubscribeToken,
  getAnalytics
} from '@/lib/newsletter-service'




// Simple in-memory server cache with TTL
const _cache = new Map();
function cacheGet(k) { const e = _cache.get(k); if (!e) return null; if (Date.now() > e.exp) { _cache.delete(k); return null; } return e.v; }
function cacheSet(k, v, ttlMs = 60000) { _cache.set(k, { v, exp: Date.now() + ttlMs }); }
function cacheBust(prefix) {
  for (const k of _cache.keys()) { if (k.startsWith(prefix)) _cache.delete(k); }
  try { invalidateSiteDataCache(prefix); } catch (e) {}
}

let client, db, seeded = false, connectPromise = null, lastEnvMtime = 0, lastSyncedAdmins = ''

const DEFAULT_FOOTER = {
  company: {
    name: 'MikuMantra Fine Jewellery',
    logo: '/logo.png',
    description: 'Handcrafted jewelry & gifts, made with pastel hues and a lot of patience — one order at a time.',
    email: 'concierge@mikumantra.jewels',
    phone: '+91 98100 00000',
    address: 'MikuMantra Atelier, MG Road, Jaipur 302001'
  },
  sections: [
    {
      title: 'Shop',
      links: [
        { label: 'Trending', url: '/shop?category=gold', isActive: true },
        { label: 'New Arrivals', url: '/shop?category=diamond', isActive: true },
        { label: 'Wedding', url: '/shop?category=wedding', isActive: true },
        { label: 'Daily Wear', url: '/shop?category=daily-wear', isActive: true },
        { label: 'Men', url: '/shop?gender=men', isActive: true }
      ]
    },
    {
      title: 'Company',
      links: [
        { label: 'Our Story', url: '#', isActive: true },
        { label: 'Craftsmanship', url: '#', isActive: true },
        { label: 'Journal', url: '#', isActive: true },
        { label: 'Careers', url: '#', isActive: true },
        { label: 'Press', url: '#', isActive: true }
      ]
    },
    {
      title: 'Support',
      links: [
        { label: 'Track Order', url: '#', isActive: true },
        { label: 'Shipping', url: '#', isActive: true },
        { label: 'Returns', url: '#', isActive: true },
        { label: 'Care Guide', url: '#', isActive: true },
        { label: 'Contact', url: '#', isActive: true }
      ]
    }
  ],
  socialLinks: [
    { platform: 'Instagram', url: '#', icon: 'Instagram', isActive: true },
    { platform: 'Facebook', url: '#', icon: 'Facebook', isActive: true },
    { platform: 'Linkedin', url: '#', icon: 'LinkedinIcon', isActive: true },
    { platform: 'Youtube', url: '#', icon: 'Youtube', isActive: true }
  ],
  policies: [
    { label: 'Privacy', url: '#', isActive: true },
    { label: 'Terms', url: '#', isActive: true },
    { label: 'Sitemap', url: '#', isActive: true }
  ],
  newsletter: {
    title: 'Subscribe to Our Newsletter',
    description: 'Receive updates, access to exclusive deals, and more.',
    isActive: false
  },
  copyright: 'MikuMantra Fine Jewellery. All rights reserved.'
};

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
  siteUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://jwellary-site-ten.vercel.app',
  favicon: '/favicon.ico',
  shipping: {
    freeShippingEnabled: true,
    freeShippingThreshold: 2000,
    standardShippingCharge: 500
  },
  paymentSettings: {
    razorpay: {
      enabled: true,
      testMode: true,
      keyId: '',
      keySecret: '',
      webhookSecret: '',
      businessName: 'MikuMantra Fine Jewellery',
      themeColor: '#9C6B30'
    },
    cod: {
      enabled: true
    }
  },
  customerReviewsEnabled: true
};

function calculateShippingCharge(subtotal, shippingConfig = {}) {
  const { freeShippingEnabled = true, freeShippingThreshold = 2000, standardShippingCharge = 500 } = shippingConfig || {};
  const sub = Number(subtotal) || 0;
  if (sub <= 0) return 0;
  if (freeShippingEnabled && sub >= Number(freeShippingThreshold)) return 0;
  return Number(standardShippingCharge) || 0;
}

async function recalculateProductRating(db, productId) {
  if (!db || !productId) return;
  try {
    const prod = await db.collection('products').findOne({ $or: [{ id: productId }, { slug: productId }] });
    const targetIds = [productId];
    if (prod) {
      if (prod.id && !targetIds.includes(prod.id)) targetIds.push(prod.id);
      if (prod.slug && !targetIds.includes(prod.slug)) targetIds.push(prod.slug);
    }

    const publishedReviews = await db.collection('reviews').find({
      $or: [
        { productId: { $in: targetIds } },
        { productSlug: { $in: targetIds } }
      ],
      $and: [
        { $or: [{ status: 'published' }, { status: { $exists: false }, approved: true }] }
      ]
    }).toArray();

    const totalReviews = publishedReviews.length;
    let averageRating = 0;
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (totalReviews > 0) {
      const sum = publishedReviews.reduce((acc, r) => {
        const ratingVal = Math.min(5, Math.max(1, Number(r.rating) || 5));
        breakdown[ratingVal] = (breakdown[ratingVal] || 0) + 1;
        return acc + ratingVal;
      }, 0);
      averageRating = Math.round((sum / totalReviews) * 10) / 10;
    }

    await db.collection('products').updateOne(
      { $or: [{ id: productId }, { slug: productId }] },
      { $set: { rating: averageRating, reviews: totalReviews, breakdown } }
    );

    // Dynamic cache busting
    cacheBust('products:');
    _cache.delete('admin_products');
    _cache.delete('admin_dashboard');
    _cache.delete('homepage_data');
    invalidateSiteDataCache('homepage_data');
    invalidateSiteDataCache('site_settings');
  } catch (err) {
    console.error('Failed to recalculate product rating:', err);
  }
}

async function syncAllProductRatings(db) {
  if (!db) return;
  try {
    const products = await db.collection('products').find({}).toArray();
    for (const p of products) {
      const targetIds = [p.id, p.slug].filter(Boolean);
      const reviews = await db.collection('reviews').find({
        $or: [
          { productId: { $in: targetIds } },
          { productSlug: { $in: targetIds } }
        ],
        $and: [
          { $or: [{ status: 'published' }, { status: { $exists: false }, approved: true }] }
        ]
      }).toArray();

      const totalReviews = reviews.length;
      let averageRating = 0;
      const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      if (totalReviews > 0) {
        const sum = reviews.reduce((acc, r) => {
          const ratingVal = Math.min(5, Math.max(1, Number(r.rating) || 5));
          breakdown[ratingVal] = (breakdown[ratingVal] || 0) + 1;
          return acc + ratingVal;
        }, 0);
        averageRating = Math.round((sum / totalReviews) * 10) / 10;
      }

      await db.collection('products').updateOne(
        { _id: p._id },
        { $set: { rating: averageRating, reviews: totalReviews, breakdown } }
      );
    }
    cacheBust('products:');
    _cache.delete('admin_products');
    _cache.delete('admin_dashboard');
    _cache.delete('homepage_data');
    invalidateSiteDataCache('homepage_data');
    invalidateSiteDataCache('site_settings');
  } catch (err) {
    console.error('Failed to sync all product ratings:', err);
  }
}

async function connectToMongo() {
  const directUrl = process.env.MONGO_DIRECT_URL || "mongodb://akashsriv1984_db_user:2M5Edv773XLUmT15@ac-htqrxv1-shard-00-00.7szyylz.mongodb.net:27017,ac-htqrxv1-shard-00-01.7szyylz.mongodb.net:27017/userPortal?ssl=true&replicaSet=atlas-1c5jr9-shard-0&authSource=admin&retryWrites=true&w=majority";
  const srvUrl = process.env.MONGO_URL || process.env.MONGODB_URI;
  const mongoUrl = process.env.MONGO_DIRECT_URL || directUrl || srvUrl;
  if (!mongoUrl) {
    throw new Error("MONGO_URL environment variable is missing.");
  }
  if (!connectPromise) {
    connectPromise = (async () => {
      try {
        try {
          dns.setServers(['8.8.8.8', '1.1.1.1']);
        } catch (e) {}
        try {
          client = new MongoClient(mongoUrl, { serverSelectionTimeoutMS: 10000 });
          await client.connect();
        } catch (srvErr) {
          if (directUrl && mongoUrl !== directUrl) {
            console.log('MongoDB connection attempt failed, falling back to direct replica set...');
            client = new MongoClient(directUrl, { serverSelectionTimeoutMS: 10000 });
            await client.connect();
          } else {
            throw srvErr;
          }
        }
        db = client.db(process.env.DB_NAME || 'userPortal');
let indexesCreated = false;
async function ensureIndexes(database) {
  if (!database || indexesCreated) return;
  indexesCreated = true;
  try {
    await Promise.allSettled([
      database.collection('sessions').createIndex({ token: 1 }),
      database.collection('users').createIndex({ id: 1 }),
      database.collection('users').createIndex({ email: 1 }),
      database.collection('products').createIndex({ id: 1 }),
      database.collection('products').createIndex({ slug: 1 }),
      database.collection('products').createIndex({ category: 1 }),
      database.collection('products').createIndex({ createdAt: -1 }),
      database.collection('orders').createIndex({ id: 1 }),
      database.collection('orders').createIndex({ orderNumber: 1 }),
      database.collection('orders').createIndex({ placedAt: -1 }),
      database.collection('orders').createIndex({ status: 1 }),
      database.collection('reviews').createIndex({ productId: 1, status: 1 }),
      database.collection('categories').createIndex({ id: 1 }),
      database.collection('collections').createIndex({ id: 1 }),
      database.collection('activity_logs').createIndex({ timestamp: -1 }),
      database.collection('wishlist').createIndex({ userId: 1, productId: 1 }, { unique: true }),
      database.collection('orders').createIndex({ trackingNumber: 1 }),
      database.collection('orders').createIndex({ 'courier.trackingNumber': 1 }),
      database.collection('device_tokens').createIndex({ token: 1 }, { unique: true }),
      database.collection('device_tokens').createIndex({ userId: 1 }),
      database.collection('newsletter_subscribers').createIndex({ email: 1 }, { unique: true }),
      database.collection('newsletter_subscribers').createIndex({ status: 1 }),
      database.collection('newsletter_subscribers').createIndex({ subscribedAt: -1 })
    ]);
  } catch (e) {
    console.warn('Index creation notice:', e.message);
  }
}

        if (!seeded) {
          await seedIfEmpty(db);
          await ensureIndexes(db);
          seeded = true;
        }
        const database = db;
        await syncEnvAdminEmailsWithDatabase(database);
        await seedRbacIfEmpty(database);
        await syncAllProductRatings(database);
        return database;
      } catch (err) {
        connectPromise = null; // Reset connection promise so subsequent requests can retry
        throw err;
      }
    })();
  }
  const database = await connectPromise;
  initEnvFileWatcher(database);
  return database;
}

async function seedIfEmpty(db) {
  const pc = await db.collection('products').countDocuments();
  if (pc === 0) {
    const now = new Date()
    const products = SEED_PRODUCTS.map(p => ({ ...p, stock: 25, featured: ['p01', 'p02', 'p03', 'p05', 'p08'].includes(p.id), bestseller: ['p04', 'p07', 'p11'].includes(p.id), newArrival: p.collection === 'new-arrival', seoTitle: p.name + ' | MikuMantra Fine Jewellery', seoDescription: p.description.slice(0, 155), video: '', productBenefits: p.productBenefits || DEFAULT_PRODUCT_BENEFITS, createdAt: now }))
    await db.collection('products').insertMany(products)
  }
  const cc = await db.collection('categories').countDocuments()
  if (cc === 0) await db.collection('categories').insertMany(SEED_CATEGORIES.map(c => ({ ...c, id: uuidv4(), createdAt: new Date() })))
  const kc = await db.collection('collections').countDocuments()
  if (kc === 0) await db.collection('collections').insertMany(SEED_COLLECTIONS.map(c => ({ ...c, id: uuidv4(), createdAt: new Date() })))
  const bc = await db.collection('banners').countDocuments()
  if (bc === 0) await db.collection('banners').insertMany([
    { id: uuidv4(), title: 'The Bridal Edit', kicker: 'Wedding Collection', copy: 'Heirloom polki chokers, uncut diamond haars & maang tikkas — handcrafted over 120+ hours.', cta: 'Discover the Edit', href: '/shop?category=wedding', img: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?crop=entropy&cs=srgb&fm=jpg&q=85', order: 1, active: true },
    { id: uuidv4(), title: 'Everyday Gold', kicker: '22K · Made to Layer', copy: 'Feather-light chains, huggies and stackable rings for the woman on the go.', cta: 'Shop Gold', href: '/shop?category=gold', img: 'https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?crop=entropy&cs=srgb&fm=jpg&q=85', order: 2, active: true },
    { id: uuidv4(), title: 'A Solitaire, Forever', kicker: 'The Diamond House', copy: 'GIA-certified solitaires and diamond suites cut for maximum brilliance.', cta: 'Explore Diamonds', href: '/shop?category=diamond', img: 'https://images.unsplash.com/photo-1685970731194-e27b477e87ba?crop=entropy&cs=srgb&fm=jpg&q=85', order: 3, active: true },
  ])
  const cpc = await db.collection('coupons').countDocuments()
  if (cpc === 0) await db.collection('coupons').insertMany([
    { id: uuidv4(), code: 'MIKUMANTRA10', type: 'percent', value: 10, minOrder: 0, active: true, createdAt: new Date() },
    { id: uuidv4(), code: 'WELCOME2000', type: 'flat', value: 2000, minOrder: 10000, active: true, createdAt: new Date() },
  ])
  const fc = await db.collection('footer').countDocuments()
  if (fc === 0) {
    await db.collection('footer').insertOne({
      id: 'default',
      ...DEFAULT_FOOTER,
      createdAt: new Date()
    })
  }

  const ssc = await db.collection('site_settings').countDocuments();
  if (ssc === 0) {
    await db.collection('site_settings').insertOne({
      id: 'default',
      ...DEFAULT_SITE_SETTINGS,
      createdAt: new Date()
    });
  }

  const hc = await db.collection('header').countDocuments()
  if (hc === 0) {
    const defaultHeader = {
      id: 'default',
      logo: {
        image: '/logo.png',
        alt: 'MikuMantra Fine Jewellery',
        url: '/'
      },
      navigation: [
        {
          id: 'nav-gold',
          label: 'GOLD',
          url: '/shop?category=gold',
          hasDropdown: true,
          dropdownType: 'mega-menu',
          isActive: true,
          order: 1,
          dropdown: {
            sections: [
              {
                id: 'sec-shop-gold',
                title: 'SHOP GOLD',
                order: 1,
                items: [
                  { id: 'item-all-gold', label: 'All Gold', url: '/shop?category=gold', isActive: true, order: 1 },
                  { id: 'item-gold-women', label: 'For Women', url: '/shop?category=gold&gender=women', isActive: true, order: 2 },
                  { id: 'item-gold-men', label: 'For Men', url: '/shop?category=gold&gender=men', isActive: true, order: 3 },
                  { id: 'item-gold-new', label: 'New Arrivals', url: '/shop?collection=new-arrival&category=gold', isActive: true, order: 4 }
                ]
              },
              {
                id: 'sec-collections-gold',
                title: 'COLLECTIONS',
                order: 2,
                items: [
                  { id: 'item-trending-gold', label: 'Trending', url: '/shop?collection=trending', isActive: true, order: 1 },
                  { id: 'item-bestseller-gold', label: 'Best Sellers', url: '/shop?collection=bestseller', isActive: true, order: 2 },
                  { id: 'item-new-arrival-gold', label: 'New Arrival', url: '/shop?collection=new-arrival', isActive: true, order: 3 },
                  { id: 'item-editors-choice-gold', label: 'Editor\'s Choice', url: '/shop?collection=editors-choice', isActive: true, order: 4 }
                ]
              }
            ],
            featured: {
              image: 'https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?crop=entropy&cs=srgb&fm=jpg&q=85',
              title: 'EXPLORE GOLD',
              url: '/shop?category=gold',
              alt: 'Explore Gold',
              isActive: true
            }
          }
        },
        {
          id: 'nav-diamond',
          label: 'DIAMOND',
          url: '/shop?category=diamond',
          hasDropdown: true,
          dropdownType: 'mega-menu',
          isActive: true,
          order: 2,
          dropdown: {
            sections: [
              {
                id: 'sec-shop-diamond',
                title: 'SHOP DIAMOND',
                order: 1,
                items: [
                  { id: 'item-all-diamond', label: 'All Diamond', url: '/shop?category=diamond', isActive: true, order: 1 },
                  { id: 'item-diamond-women', label: 'For Women', url: '/shop?category=diamond&gender=women', isActive: true, order: 2 },
                  { id: 'item-diamond-men', label: 'For Men', url: '/shop?category=diamond&gender=men', isActive: true, order: 3 },
                  { id: 'item-diamond-new', label: 'New Arrivals', url: '/shop?collection=new-arrival&category=diamond', isActive: true, order: 4 }
                ]
              },
              {
                id: 'sec-collections-diamond',
                title: 'COLLECTIONS',
                order: 2,
                items: [
                  { id: 'item-trending-diamond', label: 'Trending', url: '/shop?collection=trending', isActive: true, order: 1 },
                  { id: 'item-bestseller-diamond', label: 'Best Sellers', url: '/shop?collection=bestseller', isActive: true, order: 2 },
                  { id: 'item-new-arrival-diamond', label: 'New Arrival', url: '/shop?collection=new-arrival', isActive: true, order: 3 }
                ]
              }
            ],
            featured: {
              image: 'https://images.unsplash.com/photo-1685970731194-e27b477e87ba?crop=entropy&cs=srgb&fm=jpg&q=85',
              title: 'EXPLORE DIAMOND',
              url: '/shop?category=diamond',
              alt: 'Explore Diamond',
              isActive: true
            }
          }
        },
        {
          id: 'nav-wedding',
          label: 'WEDDING',
          url: '/shop?category=wedding',
          hasDropdown: true,
          dropdownType: 'mega-menu',
          isActive: true,
          order: 3,
          dropdown: {
            sections: [
              {
                id: 'sec-shop-wedding',
                title: 'SHOP WEDDING',
                order: 1,
                items: [
                  { id: 'item-all-wedding', label: 'All Wedding', url: '/shop?category=wedding', isActive: true, order: 1 },
                  { id: 'item-wedding-sets', label: 'Bridal Sets', url: '/shop?category=wedding&collection=bridal-sets', isActive: true, order: 2 },
                  { id: 'item-wedding-sangeet', label: 'Sangeet Wear', url: '/shop?category=wedding&collection=sangeet', isActive: true, order: 3 }
                ]
              },
              {
                id: 'sec-collections-wedding',
                title: 'COLLECTIONS',
                order: 2,
                items: [
                  { id: 'item-trending-wedding', label: 'Trending', url: '/shop?collection=trending', isActive: true, order: 1 },
                  { id: 'item-wedding-royal', label: 'Royal Heritage', url: '/shop?collection=royal-heritage', isActive: true, order: 2 }
                ]
              }
            ],
            featured: {
              image: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?crop=entropy&cs=srgb&fm=jpg&q=85',
              title: 'EXPLORE WEDDING',
              url: '/shop?category=wedding',
              alt: 'Explore Wedding',
              isActive: true
            }
          }
        },
        {
          id: 'nav-daily-wear',
          label: 'DAILY WEAR',
          url: '/shop?category=daily-wear',
          hasDropdown: true,
          dropdownType: 'mega-menu',
          isActive: true,
          order: 4,
          dropdown: {
            sections: [
              {
                id: 'sec-shop-daily',
                title: 'DAILY WEAR',
                order: 1,
                items: [
                  { id: 'item-all-daily', label: 'All Daily Wear', url: '/shop?category=daily-wear', isActive: true, order: 1 },
                  { id: 'item-daily-chains', label: 'Chains & Necklaces', url: '/shop?category=daily-wear&type=chain', isActive: true, order: 2 },
                  { id: 'item-daily-rings', label: 'Rings & Studs', url: '/shop?category=daily-wear&type=ring', isActive: true, order: 3 }
                ]
              }
            ],
            featured: {
              image: 'https://images.unsplash.com/photo-1693213085235-ea6deadf8cee?crop=entropy&cs=srgb&fm=jpg&q=85',
              title: 'EXPLORE DAILY WEAR',
              url: '/shop?category=daily-wear',
              alt: 'Explore Daily Wear',
              isActive: true
            }
          }
        },
        {
          id: 'nav-men',
          label: 'MEN',
          url: '/shop?gender=men',
          hasDropdown: false,
          isActive: true,
          order: 5
        },
        {
          id: 'nav-women',
          label: 'WOMEN',
          url: '/shop?gender=women',
          hasDropdown: false,
          isActive: true,
          order: 6
        }
      ],
      settings: {
        searchEnabled: true,
        wishlistEnabled: true,
        accountEnabled: true,
        cartEnabled: true
      },
      announcement: {
        announcementText: 'Complimentary Shipping Available on Eligible Orders',
        isEnabled: true,
        isSliding: true,
        backgroundColor: '#1A1A1A',
        textColor: '#FFFFFF',
        updatedAt: new Date()
      },
      isActive: true,
      createdAt: new Date()
    }
    await db.collection('header').insertOne(defaultHeader)
  }

  await seedFiltersIfEmpty(db);
  await seedSocialMediaIfEmpty(db);
  await seedCategoryShowcaseIfEmpty(db);
}

async function seedFiltersIfEmpty(db) {
  const count = await db.collection('product_filters').countDocuments();
  if (count === 0) {
    await db.collection('product_filters').insertMany(DEFAULT_PRODUCT_FILTERS);
  }
}

async function seedSocialMediaIfEmpty(db) {
  if (!db) return;
  try {
    const count = await db.collection('social_media').countDocuments();
    if (count === 0) {
      await db.collection('social_media').insertMany(
        DEFAULT_SOCIAL_MEDIA_ITEMS.map(i => ({
          ...i,
          createdAt: new Date(i.createdAt || Date.now()),
          updatedAt: new Date(i.updatedAt || Date.now())
        }))
      );
    }
    const settingsCount = await db.collection('social_media_settings').countDocuments({ id: 'default' });
    if (settingsCount === 0) {
      await db.collection('social_media_settings').insertOne({
        id: 'default',
        ...DEFAULT_SOCIAL_MEDIA_SETTINGS,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  } catch (err) {
    console.warn('Failed to seedSocialMediaIfEmpty:', err.message);
  }
}

async function seedCategoryShowcaseIfEmpty(db) {
  if (!db) return;
  try {
    const settingsCount = await db.collection('category_showcase_settings').countDocuments({ id: 'default' });
    if (settingsCount === 0) {
      await db.collection('category_showcase_settings').insertOne({
        id: 'default',
        ...DEFAULT_CATEGORY_SHOWCASE_SETTINGS,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    const catCount = await db.collection('categories').countDocuments();
    if (catCount === 0) {
      await db.collection('categories').insertMany(
        SEED_CATEGORIES.map((c, idx) => ({
          ...c,
          id: uuidv4(),
          link: `/shop?category=${c.slug}`,
          buttonText: 'SHOP NOW',
          order: idx + 1,
          displayOrder: idx + 1,
          active: true,
          enabled: true,
          openInNewTab: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }))
      );
    } else {
      // Ensure existing categories have order / displayOrder / link if missing
      const cats = await db.collection('categories').find({}).toArray();
      let hasMissing = false;
      for (let i = 0; i < cats.length; i++) {
        const cat = cats[i];
        const updateFields = {};
        if (cat.order === undefined && cat.displayOrder === undefined) {
          updateFields.order = i + 1;
          updateFields.displayOrder = i + 1;
        }
        if (!cat.link) {
          updateFields.link = `/shop?category=${cat.slug}`;
        }
        if (!cat.buttonText) {
          updateFields.buttonText = 'SHOP NOW';
        }
        if (Object.keys(updateFields).length > 0) {
          await db.collection('categories').updateOne({ id: cat.id }, { $set: updateFields });
          hasMissing = true;
        }
      }
      if (hasMissing) {
        _cache.delete('cats');
        _cache.delete('admin_categories');
        invalidateSiteDataCache('homepage_data');
      }
    }
  } catch (err) {
    console.warn('Failed to seedCategoryShowcaseIfEmpty:', err.message);
  }
}

async function syncCategoryAndCollectionFilterOptions(db) {
  if (!db) return;
  try {
    // 1. Sync Categories from categories collection into product_filters
    const dbCats = await db.collection('categories').find({}).sort({ order: 1, createdAt: 1 }).toArray();
    const existingCatGroup = await db.collection('product_filters').findOne({ key: 'category' });
    if (existingCatGroup) {
      const existingOpts = existingCatGroup.options || [];
      const existingOptsByVal = new Map(existingOpts.map(o => [String(o.value || o.name).toLowerCase(), o]));
      const existingOptsById = new Map(existingOpts.filter(o => o.id).map(o => [String(o.id), o]));

      const catOptions = dbCats.map((c, idx) => {
        const val = c.slug || c.name.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');
        const existingOpt = existingOptsById.get(String(c.id)) || existingOptsByVal.get(val.toLowerCase()) || existingOptsByVal.get(c.name.toLowerCase());
        const isCatActive = c.active !== false && c.enabled !== false;
        const isOptEnabled = existingOpt ? (existingOpt.enabled !== false && isCatActive) : isCatActive;

        return {
          id: c.id || existingOpt?.id || `opt-cat-${val}`,
          name: c.name,
          value: val,
          enabled: isOptEnabled,
          order: existingOpt?.order !== undefined ? existingOpt.order : (c.order !== undefined ? Number(c.order) : idx)
        };
      });

      await db.collection('product_filters').updateOne(
        { key: 'category' },
        { $set: { options: catOptions, updatedAt: new Date() } }
      );
    }

    // 2. Sync Collections from collections collection into product_filters
    const dbCols = await db.collection('collections').find({}).sort({ order: 1, createdAt: 1 }).toArray();
    const existingColGroup = await db.collection('product_filters').findOne({ key: 'collection' });
    if (existingColGroup) {
      const existingOpts = existingColGroup.options || [];
      const existingOptsByVal = new Map(existingOpts.map(o => [String(o.value || o.name).toLowerCase(), o]));
      const existingOptsById = new Map(existingOpts.filter(o => o.id).map(o => [String(o.id), o]));

      const colOptions = dbCols.map((c, idx) => {
        const val = c.slug || c.name.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');
        const existingOpt = existingOptsById.get(String(c.id)) || existingOptsByVal.get(val.toLowerCase()) || existingOptsByVal.get(c.name.toLowerCase());
        const isColActive = c.active !== false && c.enabled !== false;
        const isOptEnabled = existingOpt ? (existingOpt.enabled !== false && isColActive) : isColActive;

        return {
          id: c.id || existingOpt?.id || `opt-col-${val}`,
          name: c.name,
          value: val,
          enabled: isOptEnabled,
          order: existingOpt?.order !== undefined ? existingOpt.order : (c.order !== undefined ? Number(c.order) : idx)
        };
      });

      await db.collection('product_filters').updateOne(
        { key: 'collection' },
        { $set: { options: colOptions, updatedAt: new Date() } }
      );
    }
  } catch (err) {
    console.error('Failed to syncCategoryAndCollectionFilterOptions:', err);
  }
}

const SESSION_COOKIE = 'mikumantra_session', SESSION_DAYS = 30
function hashPassword(password, salt) { const s = salt || crypto.randomBytes(16).toString('hex'); const h = crypto.pbkdf2Sync(password, s, 10000, 64, 'sha512').toString('hex'); return { salt: s, hash: h } }
function verifyPassword(password, salt, hash) { return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex') === hash }

// Helpers for admin email resolution from .env and database
function getEnvAdminEmails() {
  const emails = new Set();

  const addFromStr = (str) => {
    if (!str || typeof str !== 'string') return;
    str.split(',').forEach(item => {
      const clean = item.trim().toLowerCase().replace(/(^['"]|['"]$)/g, '');
      if (clean && clean.includes('@')) {
        emails.add(clean);
      }
    });
  };

  // 1. Read directly from disk files (.env and .env.local) to catch any edits immediately
  try {
    const envPaths = [
      pathModule.join(process.cwd(), '.env'),
      pathModule.join(process.cwd(), '.env.local')
    ];
    for (const p of envPaths) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf8');
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const m = trimmed.match(/^(?:ADMIN_EMAIL|ADMIN_EMAILS)\s*=\s*(.*)$/i);
            if (m && m[1]) {
              addFromStr(m[1]);
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Error reading env files on disk:', e.message);
  }

  // 2. Read from process.env
  addFromStr(process.env.ADMIN_EMAIL);
  addFromStr(process.env.ADMIN_EMAILS);

  // Fallback if empty
  if (emails.size === 0) {
    emails.add('admin@mikumantra.com');
  }

  return Array.from(emails);
}

let fileWatcherInitialized = false;
function initEnvFileWatcher(db) {
  if (fileWatcherInitialized || !db || typeof window !== 'undefined') return;
  fileWatcherInitialized = true;

  const envFiles = [
    pathModule.join(process.cwd(), '.env'),
    pathModule.join(process.cwd(), '.env.local')
  ];

  let debounceTimer = null;
  const onFileChange = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      try {
        console.log('[Auto-Sync] Detected change in .env file, syncing admin emails to database...');
        await syncEnvAdminEmailsWithDatabase(db);
      } catch (e) {
        console.error('[Auto-Sync] Watcher sync error:', e);
      }
    }, 250);
  };

  envFiles.forEach(fp => {
    try {
      if (fs.existsSync(fp)) {
        fs.watch(fp, onFileChange);
      }
    } catch (e) {}
  });
}

async function syncEnvAdminEmailsWithDatabase(db) {
  if (!db) return;
  try {
    const envAdmins = getEnvAdminEmails();
    if (!envAdmins || envAdmins.length === 0) return;

    // 1. Ensure all active .env admin emails have role: 'admin' and syncedFromEnv: true in DB
    for (const em of envAdmins) {
      if (!em) continue;
      const existing = await db.collection('users').findOne({ email: em });
      if (!existing) {
        const { salt, hash } = hashPassword('12341234');
        await db.collection('users').insertOne({
          id: uuidv4(),
          name: 'MikuMantra Admin',
          email: em,
          phone: '',
          role: 'admin',
          roleKey: 'SUPER_ADMIN',
          roleId: 'role_super_admin',
          status: 'active',
          passwordSalt: salt,
          passwordHash: hash,
          createdAt: new Date(),
          updatedAt: new Date(),
          syncedFromEnv: true
        });
        console.log(`[Auto-Sync] Automatically created admin in DB from .env: ${em}`);
      } else if (existing.role !== 'admin' || !existing.syncedFromEnv || !existing.roleKey) {
        await db.collection('users').updateOne(
          { id: existing.id },
          { $set: { role: 'admin', roleKey: existing.roleKey || 'SUPER_ADMIN', roleId: existing.roleId || 'role_super_admin', status: existing.status || 'active', updatedAt: new Date(), syncedFromEnv: true } }
        );
        console.log(`[Auto-Sync] Automatically ensured admin in DB from .env: ${em}`);
      }
    }

    // 2. If any user was previously synced from .env, but is NO LONGER in .env, automatically revoke their admin role in MongoDB unless they have an explicit DB admin roleKey
    const obsoleteEnvAdmins = await db.collection('users').find({
      syncedFromEnv: true,
      email: { $nin: envAdmins }
    }).toArray();

    const adminRoleKeys = ['SUPER_ADMIN', 'ADMIN', 'PRODUCT_MANAGER', 'ORDER_MANAGER', 'CUSTOMER_SUPPORT', 'FINANCE_MANAGER', 'MARKETING_MANAGER'];
    for (const obsoleteUser of obsoleteEnvAdmins) {
      if (obsoleteUser.roleKey && adminRoleKeys.includes(obsoleteUser.roleKey)) {
        await db.collection('users').updateOne(
          { id: obsoleteUser.id },
          { $set: { syncedFromEnv: false, updatedAt: new Date() } }
        );
        continue;
      }
      console.log(`[Auto-Sync] Revoking admin role in DB for deleted .env email: ${obsoleteUser.email}`);
      await db.collection('users').updateOne(
        { id: obsoleteUser.id },
        { $set: { role: 'user', syncedFromEnv: false, updatedAt: new Date() } }
      );
      // Immediately invalidate any active sessions so admin access is terminated
      await db.collection('sessions').deleteMany({ userId: obsoleteUser.id });
    }
  } catch (err) {
    console.error('[Auto-Sync] Error syncing .env admin emails to database:', err);
  }
}

async function isAuthorizedAdminEmail(db, email) {
  if (!email) return false;
  if (db) await syncEnvAdminEmailsWithDatabase(db);
  const em = email.trim().toLowerCase();
  const envAdmins = getEnvAdminEmails();
  if (envAdmins.includes(em)) return true;
  if (!db) return false;
  const adminRoleKeys = ['SUPER_ADMIN', 'ADMIN', 'PRODUCT_MANAGER', 'ORDER_MANAGER', 'CUSTOMER_SUPPORT', 'FINANCE_MANAGER', 'MARKETING_MANAGER'];
  const existingAdmin = await db.collection('users').findOne({
    email: em,
    $or: [
      { role: 'admin' },
      { roleKey: { $in: adminRoleKeys } }
    ]
  });
  return !!existingAdmin;
}

const _userSessionCache = new Map();
function userSessionCacheGet(token) {
  if (!token) return null;
  const entry = _userSessionCache.get(token);
  if (!entry) return null;
  if (Date.now() > entry.exp) {
    _userSessionCache.delete(token);
    return null;
  }
  return entry.user;
}
function userSessionCacheSet(token, user, ttlMs = 30000) {
  if (!token || !user) return;
  _userSessionCache.set(token, { user, exp: Date.now() + ttlMs });
}
function invalidateUserSessionCache(tokenOrUserId) {
  if (!tokenOrUserId) {
    _userSessionCache.clear();
    return;
  }
  for (const [tok, entry] of _userSessionCache.entries()) {
    if (tok === tokenOrUserId || entry.user?.id === tokenOrUserId) {
      _userSessionCache.delete(tok);
    }
  }
}

async function getCurrentUser(db, request) {
  let token = null;
  if (request && request.headers) {
    token = request.headers.get('x-auth-token') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  }
  if (!token && request && request.cookies) {
    try {
      token = typeof request.cookies.get === 'function' ? request.cookies.get(SESSION_COOKIE)?.value : request.cookies[SESSION_COOKIE];
    } catch (e) {}
  }
  if (!token) {
    try {
      const store = await cookies();
      token = store.get(SESSION_COOKIE)?.value;
    } catch (e) {}
  }
  if (!token) return null;

  const cachedUser = userSessionCacheGet(token);
  if (cachedUser) return cachedUser;

  const s = await db.collection('sessions').findOne({ token });
  if (!s || new Date(s.expiresAt) < new Date()) return null;
  const u = await db.collection('users').findOne({ id: s.userId });
  if (!u) return null;

  // Self-healing & dynamic revocation from .env:
  const envAdmins = getEnvAdminEmails();
  const adminRoleKeys = ['SUPER_ADMIN', 'ADMIN', 'PRODUCT_MANAGER', 'ORDER_MANAGER', 'CUSTOMER_SUPPORT', 'FINANCE_MANAGER', 'MARKETING_MANAGER'];
  if (u.email && envAdmins.includes(u.email.toLowerCase())) {
    if (u.role !== 'admin' || !u.syncedFromEnv || !u.roleKey) {
      await db.collection('users').updateOne({ id: u.id }, { $set: { role: 'admin', roleKey: u.roleKey || 'SUPER_ADMIN', roleId: u.roleId || 'role_super_admin', syncedFromEnv: true, status: u.status || 'active' } });
      u.role = 'admin';
      u.roleKey = u.roleKey || 'SUPER_ADMIN';
      u.status = u.status || 'active';
    }
  } else if (u.syncedFromEnv && !envAdmins.includes(u.email.toLowerCase())) {
    // Revoke admin if removed from .env unless they have an assigned DB admin roleKey
    if (!u.roleKey || !adminRoleKeys.includes(u.roleKey)) {
      await db.collection('users').updateOne({ id: u.id }, { $set: { role: 'user', syncedFromEnv: false } });
      u.role = 'user';
    } else {
      await db.collection('users').updateOne({ id: u.id }, { $set: { syncedFromEnv: false } });
    }
  }

  // Ensure any user holding an admin roleKey has role: 'admin'
  if (u.roleKey && adminRoleKeys.includes(u.roleKey) && u.role !== 'admin') {
    u.role = 'admin';
    await db.collection('users').updateOne({ id: u.id }, { $set: { role: 'admin' } });
  }

  const { passwordHash, passwordSalt, _id, ...safe } = u;
  const roleKey = u.roleKey || (u.role === 'admin' ? 'SUPER_ADMIN' : 'USER');
  const status = u.status || 'active';
  const isAdmin = u.role === 'admin' || (u.roleKey && adminRoleKeys.includes(u.roleKey));
  const permissions = isAdmin ? await resolveUserPermissions(db, { ...u, role: 'admin', roleKey }) : [];

  const finalUser = {
    ...safe,
    role: isAdmin ? 'admin' : (u.role || 'user'),
    roleKey,
    status,
    permissions,
    hasPassword: !!passwordHash
  };
  userSessionCacheSet(token, finalUser, 30000);
  return finalUser;
}

async function requireAdmin(db, request) {
  const u = await getCurrentUser(db, request);
  if (!u) return null;
  const adminRoleKeys = ['SUPER_ADMIN', 'ADMIN', 'PRODUCT_MANAGER', 'ORDER_MANAGER', 'CUSTOMER_SUPPORT', 'FINANCE_MANAGER', 'MARKETING_MANAGER'];
  const isAdmin = u.role === 'admin' || (u.roleKey && adminRoleKeys.includes(u.roleKey));
  if (!isAdmin) return null;
  if (u.status === 'disabled') return null;
  return u;
}
function clean(doc) { if (!doc) return doc; const { _id, passwordHash, passwordSalt, ...r } = doc; return r }
function ok(data) { return handleCORS(NextResponse.json(data)) }
function err(msg, code = 400) { return handleCORS(NextResponse.json({ error: msg }, { status: code })) }
function handleCORS(res) { res.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*'); res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH'); res.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-auth-token'); res.headers.set('Access-Control-Allow-Credentials', 'true'); return res }
export async function OPTIONS() { return handleCORS(new NextResponse(null, { status: 200 })) }

function calculateReturnRefund({ order, items }) {
  if (!order || !Array.isArray(order.items) || !Array.isArray(items) || items.length === 0) {
    return { refundAmount: 0, itemsRefund: [] };
  }

  const orderSubtotal = Math.max(1, order.amounts?.subtotal || 1);
  const orderDiscount = Math.max(0, order.amounts?.discount || 0);

  let totalRefundable = 0;
  const itemsRefund = [];

  for (const rItem of items) {
    const origItem = order.items.find(i => i.id === rItem.id);
    if (!origItem) continue;

    const returnQty = Math.min(origItem.qty, Math.max(1, parseInt(rItem.returnQty || rItem.qty) || 1));
    const unitPrice = Number(origItem.price) || 0;
    const itemSubtotal = unitPrice * returnQty;

    // Allocate order-level discount proportionally
    const itemDiscount = Math.round(itemSubtotal * (orderDiscount / orderSubtotal));
    const netItemPrice = Math.max(0, itemSubtotal - itemDiscount);

    // 3% Tax calculation consistent with order tax calculation logic
    const itemTax = Math.round(netItemPrice * 0.03);
    const itemRefundAmount = netItemPrice + itemTax;

    totalRefundable += itemRefundAmount;
    itemsRefund.push({
      id: origItem.id,
      slug: origItem.slug,
      name: origItem.name,
      image: origItem.image || '',
      price: unitPrice,
      purchasedQty: origItem.qty,
      returnQty,
      itemSubtotal,
      itemDiscount,
      itemTax,
      itemRefundAmount
    });
  }

  // Original shipping fee and giftWrap are non-refundable
  const maxPossibleRefund = Math.max(0, (order.amounts?.total || 0) - (order.amounts?.shipping || 0) - (order.amounts?.giftWrap || 0));
  const finalRefundAmount = Math.min(totalRefundable, maxPossibleRefund);

  return {
    refundAmount: finalRefundAmount,
    itemsRefund
  };
}

async function createAuditLog(db, { returnId, orderId, action, performedBy, oldStatus, newStatus, reason, metadata }) {
  try {
    await db.collection('audit_logs').insertOne({
      id: uuidv4(),
      returnId: returnId || null,
      orderId: orderId || null,
      action,
      performedBy: performedBy || 'system',
      timestamp: new Date(),
      oldStatus: oldStatus || null,
      newStatus: newStatus || null,
      reason: reason || null,
      metadata: metadata || {}
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}


async function handleRoute(request, context) {
  try {
    let path = [];
    if (context && context.params) {
      const resolved = await context.params;
      path = resolved?.path || [];
    }
    const pathArr = Array.isArray(path) ? path : [path].filter(Boolean);
    const route = `/${pathArr.join('/')}`;
    const method = request.method;
    const db = await connectToMongo();
    const url = new URL(request.url); const q = url.searchParams;

    if (route === '/' && method === 'GET') return ok({ ok: true, app: 'MikuMantra API' });

    // ============ MOBILE APP CONFIGURATION ============
    if (route === '/app/config' && method === 'GET') {
      const siteSettings = await db.collection('site_settings').findOne({ id: 'default' });
      const footerDoc = await db.collection('footer').findOne({ id: 'default' });
      return ok({
        name: 'MikuMantra',
        appId: 'com.mikumantra.app',
        version: '1.0.0',
        minVersion: '1.0.0',
        forceUpdate: false,
        maintenanceMode: false,
        maintenanceMessage: '',
        updateUrl: 'https://play.google.com/store/apps/details?id=com.mikumantra.app',
        supportPhone: footerDoc?.company?.phone || '+918076108369',
        supportEmail: footerDoc?.company?.email || 'concierge@mikumantra.jewels',
        whatsappSupport: '+918076108369',
        shipping: siteSettings?.shipping || DEFAULT_SITE_SETTINGS.shipping,
        paymentMethods: {
          cod: siteSettings?.paymentSettings?.cod?.enabled !== false,
          razorpay: siteSettings?.paymentSettings?.razorpay?.enabled !== false
        },
        brandColors: {
          primary: '#FAF6EF',
          accent: '#9C6B30',
          dark: '#1A1A1A'
        }
      });
    }

    // ============ ANDROID DIGITAL ASSET LINKS ============
    if ((route === '/.well-known/assetlinks.json' || route === '/assetlinks.json') && method === 'GET') {
      return handleCORS(NextResponse.json([
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: {
            namespace: "android_app",
            package_name: "com.mikumantra.app",
            sha256_cert_fingerprints: [
              "14:6D:E9:7F:0F:7F:02:8F:A4:4E:95:C0:D3:2F:3A:42:01:E6:36:2C:C6:6F:A5:68:55:04:1B:54:27:0C:FB:56"
            ]
          }
        }
      ]));
    }

    // ============ DEVICE TOKEN REGISTRATION (FCM PUSH NOTIFICATIONS) ============
    if (route === '/notifications/device-token' && method === 'POST') {
      const b = await request.json().catch(() => ({}));
      const token = (b.token || b.fcmToken || '').trim();
      const platform = (b.platform || 'android').toLowerCase();
      const deviceId = (b.deviceId || '').trim();
      if (!token) return err('Device push token is required', 400);

      const currentUser = await getCurrentUser(db, request);
      const now = new Date();
      await db.collection('device_tokens').updateOne(
        { token },
        {
          $set: {
            token,
            platform,
            deviceId: deviceId || uuidv4(),
            userId: currentUser?.id || null,
            userEmail: currentUser?.email || null,
            updatedAt: now
          },
          $setOnInsert: { createdAt: now }
        },
        { upsert: true }
      );
      return ok({ ok: true, registered: true });
    }

    if (route.startsWith('/uploads/') && method === 'GET') {
      const filename = route.split('/')[2];
      if (!filename) return err('File name required', 400);
      const fileDoc = await db.collection('uploads').findOne({ filename });
      if (!fileDoc) return err('File not found', 404);
      let buffer = fileDoc.data;
      if (buffer && buffer.buffer) {
        buffer = Buffer.from(buffer.buffer);
      } else if (!Buffer.isBuffer(buffer)) {
        buffer = Buffer.from(buffer);
      }
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': fileDoc.contentType || 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Customer & Authenticated Media Upload (Photos for Reviews & Profiles)
    if (route === '/upload' && method === 'POST') {
      const u = await getCurrentUser(db, request);
      if (!u) return err('Sign in to upload photos', 401);
      try {
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file) return err('No file provided', 400);

        const fileType = (file.type || 'image/jpeg').toLowerCase();
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif', 'image/avif'];
        if (!allowedTypes.includes(fileType)) {
          return err('Invalid photo format. Please upload JPG, PNG, or WebP.', 400);
        }

        const originalName = file.name || 'photo.jpg';
        const ext = pathModule.extname(originalName).toLowerCase() || '.jpg';
        if (!['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'].includes(ext)) {
          return err('Invalid file extension. Allowed: .jpg, .jpeg, .png, .webp', 400);
        }

        if (file.size > 10 * 1024 * 1024) {
          return err('Photo size exceeds 10MB limit.', 400);
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `photo-${Date.now()}-${uuidv4().slice(0, 8)}${ext}`;

        let savedToDb = false;
        try {
          await db.collection('uploads').insertOne({
            filename,
            contentType: fileType,
            data: buffer,
            userId: u.id,
            createdAt: new Date()
          });
          savedToDb = true;
        } catch (dbErr) {
          console.warn('MongoDB upload save failed, falling back to filesystem only:', dbErr.message);
        }

        let savedToFs = false;
        try {
          const uploadsDir = pathModule.join(process.cwd(), 'public', 'uploads');
          if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
          const filePath = pathModule.join(uploadsDir, filename);
          fs.writeFileSync(filePath, buffer);
          savedToFs = true;
        } catch (fsErr) {
          console.warn('Local filesystem write failed:', fsErr.message);
        }

        if (!savedToDb && !savedToFs) {
          return err('Photo upload failed. Could not write to storage.', 500);
        }

        const url = savedToDb ? `/api/uploads/${filename}` : `/uploads/${filename}`;
        return ok({ url, filename });
      } catch (e) {
        console.error('Customer photo upload error:', e);
        return err('Photo upload error: ' + (e.message || 'Unknown error'), 500);
      }
    }

    if (route === '/check-pincode' && method === 'POST') {
      try {
        const body = await request.json();
        const destinationPincode = body.destinationPincode?.trim();
        
        if (!destinationPincode || destinationPincode.length !== 6 || !/^\d+$/.test(destinationPincode)) {
          return err('Enter a valid 6-digit pincode.', 400);
        }
        
        const source = body.sourcePincode || WAREHOUSE_PINCODE;
        
        // Simulate unserviceable pincodes (starting with 0 or 99)
        if (destinationPincode.startsWith('0') || destinationPincode.startsWith('99')) {
          return ok({
            serviceable: false,
            sourcePincode: source,
            destinationPincode,
            freeShipping: false
          });
        }
        
        // Zone-based realistic estimation based on first digit of destination pincode:
        // Region 1 (North: Delhi, HR, PB, HP, JK) -> 2-3 days
        // Region 2 (Local/UP, UK) -> 1-2 days (Local delivery since Noida warehouse starts with 2)
        // Region 3 & 4 (West/Central: RJ, GJ, MH, MP, CG) -> 3-4 days
        // Region 5, 6 & 8 (South/East-Central: KA, KL, TN, AP, TS, BR, JH) -> 4-5 days
        // Region 7 (East/Northeast: WB, OD, NE) -> 5-6 days
        const firstDigit = destinationPincode[0];
        let minDays = 3;
        let maxDays = 5;
        
        if (firstDigit === '1') {
          minDays = 2;
          maxDays = 3;
        } else if (firstDigit === '2') {
          minDays = 1;
          maxDays = 2;
        } else if (firstDigit === '3' || firstDigit === '4') {
          minDays = 3;
          maxDays = 4;
        } else if (firstDigit === '5' || firstDigit === '6' || firstDigit === '8') {
          minDays = 4;
          maxDays = 5;
        } else if (firstDigit === '7') {
          minDays = 5;
          maxDays = 6;
        }
        
        let siteSettings = await db.collection('site_settings').findOne({ id: 'default' });
        const shippingConfig = {
          ...DEFAULT_SITE_SETTINGS.shipping,
          ...((siteSettings && siteSettings.shipping) || {})
        };
        const subtotal = Number(body.subtotal) || 0;
        const shippingCharge = calculateShippingCharge(subtotal, shippingConfig);
        const freeShipping = shippingCharge === 0;

        return ok({
          serviceable: true,
          sourcePincode: source,
          destinationPincode,
          estimatedDeliveryDays: {
            min: minDays,
            max: maxDays
          },
          freeShipping,
          shippingCharge,
          shippingConfig
        });
      } catch (e) {
        return err('Invalid request format.', 400);
      }
    }

    // ============ PUBLIC: PRODUCTS ============
    if (route === '/products' && method === 'GET') {
      const filter = {}
      if (q.get('category')) filter.category = q.get('category')
      if (q.get('collection')) filter.collection = q.get('collection')
      if (q.get('gender')) filter.gender = q.get('gender')
      if (q.get('featured') === '1') filter.featured = true
      if (q.get('bestseller') === '1') filter.bestseller = true
      if (q.get('newArrival') === '1') filter.newArrival = true
      if (q.get('search')) {
        const term = q.get('search').trim();
        filter.$or = [
          { name: { $regex: term, $options: 'i' } },
          { sku: { $regex: term, $options: 'i' } },
          { category: { $regex: term, $options: 'i' } },
          { subcategory: { $regex: term, $options: 'i' } },
          { brand: { $regex: term, $options: 'i' } },
          { tags: { $regex: term, $options: 'i' } },
          { keywords: { $regex: term, $options: 'i' } },
          { description: { $regex: term, $options: 'i' } }
        ];
      }
      const page = Math.max(1, parseInt(q.get('page') || '1'));
      const limit = Math.min(100, Math.max(1, parseInt(q.get('limit') || '100')));
      const skip = (page - 1) * limit;
      const cacheKey = 'products:' + JSON.stringify({ filter, page, limit });
      const cached = cacheGet(cacheKey);
      if (cached) return ok(cached);
      const [list, total] = await Promise.all([
        db.collection('products').find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
        db.collection('products').countDocuments(filter)
      ]);
      const resp = { products: list.map(clean), total, page, totalPages: Math.ceil(total / limit) };
      cacheSet(cacheKey, resp, 30000);
      return ok(resp);
    }
    if (route.startsWith('/products/') && method === 'GET') {
      const slug = route.split('/')[2]
      const p = await db.collection('products').findOne({ slug })
      if (!p) return err('Not found', 404)
      const related = await db.collection('products').find({ category: p.category, id: { $ne: p.id } }).limit(4).toArray()
      return ok({ product: clean(p), related: related.map(clean) })
    }
    if ((route === '/categories' || route === '/category-showcase') && method === 'GET') {
      const c = cacheGet('cats');
      if (c) return ok(c);
      await seedCategoryShowcaseIfEmpty(db);
      const [list, settingsDoc] = await Promise.all([
        db.collection('categories').find({ active: { $ne: false }, enabled: { $ne: false } }).sort({ order: 1, displayOrder: 1, createdAt: 1 }).toArray(),
        db.collection('category_showcase_settings').findOne({ id: 'default' })
      ]);
      const settings = {
        ...DEFAULT_CATEGORY_SHOWCASE_SETTINGS,
        ...(settingsDoc ? clean(settingsDoc) : {})
      };
      const formatted = list.map(c => {
        const cleanItem = clean(c);
        return {
          ...cleanItem,
          id: cleanItem.id,
          name: cleanItem.name,
          slug: cleanItem.slug,
          img: cleanItem.img || cleanItem.imageUrl || '',
          imageUrl: cleanItem.img || cleanItem.imageUrl || '',
          link: cleanItem.link || `/shop?category=${cleanItem.slug}`,
          buttonText: cleanItem.buttonText || settings.buttonText || 'SHOP NOW',
          displayOrder: Number(cleanItem.order ?? cleanItem.displayOrder ?? 0),
          isActive: cleanItem.active !== false && cleanItem.enabled !== false,
          openInNewTab: !!cleanItem.openInNewTab
        };
      });
      const r = {
        success: true,
        data: {
          categories: formatted,
          settings
        },
        categories: formatted,
        settings
      };
      cacheSet('cats', r, 3000);
      return ok(r);
    }
    if (route === '/category-showcase/settings' && method === 'GET') {
      await seedCategoryShowcaseIfEmpty(db);
      const settingsDoc = await db.collection('category_showcase_settings').findOne({ id: 'default' });
      const settings = {
        ...DEFAULT_CATEGORY_SHOWCASE_SETTINGS,
        ...(settingsDoc ? clean(settingsDoc) : {})
      };
      return ok({
        success: true,
        data: { settings },
        settings
      });
    }
    if (route === '/collections' && method === 'GET') { const c = cacheGet('cols'); if (c) return ok(c); const list = await db.collection('collections').find({}).toArray(); const r = { collections: list.map(clean) }; cacheSet('cols', r, 3000); return ok(r) }
    if (route === '/banners' && method === 'GET') {
      const c = cacheGet('bans');
      if (c) return ok(c);
      const [list, settings] = await Promise.all([
        db.collection('banners').find({ active: true }).sort({ order: 1 }).toArray(),
        db.collection('bannerSettings').findOne({ id: 'default' })
      ]);
      const r = { banners: list.map(clean), transition: settings?.transition || 'fade' };
      cacheSet('bans', r, 300000);
      return ok(r);
    }
    if (route === '/social-media' && method === 'GET') {
      const c = cacheGet('social_media_public');
      if (c) return ok(c);
      await seedSocialMediaIfEmpty(db);
      const [items, settingsDoc] = await Promise.all([
        db.collection('social_media').find({ isActive: true }).sort({ displayOrder: 1 }).toArray(),
        db.collection('social_media_settings').findOne({ id: 'default' })
      ]);
      const settings = {
        ...DEFAULT_SOCIAL_MEDIA_SETTINGS,
        ...(settingsDoc || {})
      };
      const r = {
        success: true,
        data: items.map(clean),
        settings: clean(settings)
      };
      cacheSet('social_media_public', r, 60000);
      return ok(r);
    }
    if (route === '/footer' && method === 'GET') {
      const c = cacheGet('footer');
      if (c) return ok(c);
      let footer = await db.collection('footer').findOne({ id: 'default' });
      if (!footer) {
        footer = { id: 'default', ...DEFAULT_FOOTER, createdAt: new Date() };
        await db.collection('footer').insertOne(footer);
      }
      const r = clean(footer);
      cacheSet('footer', r, 300000);
      return ok(r);
    }
    if (route === '/site-settings' && method === 'GET') {
      const c = cacheGet('site_settings');
      if (c) return ok(c);
      let settings = await db.collection('site_settings').findOne({ id: 'default' });
      if (!settings) {
        settings = { id: 'default', ...DEFAULT_SITE_SETTINGS, createdAt: new Date() };
        await db.collection('site_settings').insertOne(settings);
      }
      const rawPay = settings?.paymentSettings || DEFAULT_SITE_SETTINGS.paymentSettings;
      const effectiveKeyId = (rawPay?.razorpay?.keyId && rawPay.razorpay.keyId.trim())
        ? rawPay.razorpay.keyId.trim()
        : (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '');
      const isMockKey = !effectiveKeyId || effectiveKeyId.includes('mock') || !effectiveKeyId.startsWith('rzp_');

      const r = clean({
        ...DEFAULT_SITE_SETTINGS,
        ...settings,
        logo: settings?.logo || DEFAULT_SITE_SETTINGS.logo || '/logo.png',
        shipping: {
          ...DEFAULT_SITE_SETTINGS.shipping,
          ...((settings && settings.shipping) || {})
        },
        couponHelperText: settings?.couponHelperText !== undefined ? settings.couponHelperText : (DEFAULT_SITE_SETTINGS.couponHelperText || ''),
        paymentSettings: {
          razorpay: {
            enabled: rawPay?.razorpay?.enabled !== false,
            testMode: rawPay?.razorpay?.testMode ?? true,
            keyId: effectiveKeyId,
            isMock: isMockKey,
            businessName: rawPay?.razorpay?.businessName || 'MikuMantra Fine Jewellery',
            themeColor: rawPay?.razorpay?.themeColor || '#9C6B30'
          },
          cod: {
            enabled: rawPay?.cod?.enabled !== false
          }
        }
      });
      cacheSet('site_settings', r, 300000);
      return ok(r);
    }
    if (route === '/homepage-content' && method === 'GET') {
      const c = cacheGet('homepage_content');
      if (c) return ok(c);
      let settings = await db.collection('site_settings').findOne({ id: 'default' });
      if (!settings) {
        settings = { id: 'default', ...DEFAULT_SITE_SETTINGS, createdAt: new Date() };
        await db.collection('site_settings').insertOne(settings);
      }
      const r = clean({
        homepagePromotions: settings.homepagePromotions ?? DEFAULT_SITE_SETTINGS.homepagePromotions,
        assuranceSection: {
          ...DEFAULT_SITE_SETTINGS.assuranceSection,
          ...(settings.assuranceSection || {})
        },
        assuranceCards: settings.assuranceCards ?? DEFAULT_SITE_SETTINGS.assuranceCards
      });
      cacheSet('homepage_content', r, 300000);
      return ok(r);
    }
    if (route === '/product-filters' && method === 'GET') {
      const c = cacheGet('product_filters');
      if (c) return ok(c);
      await seedFiltersIfEmpty(db);
      await syncCategoryAndCollectionFilterOptions(db);
      const list = await db.collection('product_filters').find({}).sort({ order: 1 }).toArray();
      const r = { groups: list.map(clean) };
      cacheSet('product_filters', r, 5000);
      return ok(r);
    }

    // ============ AUTH ============
    if (route === '/auth/login' && method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return err('Invalid JSON request body.', 400); }
      const { email, password, requireAdmin } = body || {};
      if (!email || !password) return err('Email and password are required.')
      const em = email.trim().toLowerCase()
      const envAdmins = getEnvAdminEmails()
      const isEnvAdmin = envAdmins.includes(em)

      if (isEnvAdmin) {
        const uCount = await db.collection('users').countDocuments({ email: em })
        if (uCount === 0) {
          const { salt, hash } = hashPassword('12341234')
          await db.collection('users').insertOne({
            id: uuidv4(),
            name: 'MikuMantra Admin',
            email: em,
            phone: '',
            role: 'admin',
            passwordSalt: salt,
            passwordHash: hash,
            createdAt: new Date()
          })
        }
      }

      const u = await db.collection('users').findOne({ email: em })
      if (!u || !verifyPassword(password, u.passwordSalt, u.passwordHash)) return err('Invalid email or password.', 401)

      const isAdmin = await isAuthorizedAdminEmail(db, em)
      if (requireAdmin && !isAdmin) {
        return err(`Access Denied: The account "${em}" is not registered as an administrator in the database or system configuration (.env).`, 403)
      }

      if (u.status === 'disabled') {
        return err('This account has been disabled. Please contact a Super Administrator.', 403)
      }

      // Self-healing: if logged in as admin email from .env or DB, enforce role is 'admin'
      if (isAdmin && u.role !== 'admin') {
        await db.collection('users').updateOne({ id: u.id }, { $set: { role: 'admin' } });
        u.role = 'admin';
      }

      await db.collection('users').updateOne({ id: u.id }, { $set: { lastLoginAt: new Date() } });

      const roleKey = u.roleKey || (u.role === 'admin' ? 'SUPER_ADMIN' : 'USER');
      const status = u.status || 'active';
      const permissions = u.role === 'admin' ? await resolveUserPermissions(db, { ...u, roleKey }) : [];

      const token = uuidv4(); const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400 * 1000)
      await db.collection('sessions').insertOne({ token, userId: u.id, expiresAt, createdAt: new Date() })
      try { const store = await cookies(); store.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: SESSION_DAYS * 86400, secure: false }); } catch (e) {}
      return ok({ user: { id: u.id, name: u.name, email: u.email, phone: u.phone || '', role: u.role || 'user', roleKey, status, permissions, hasPassword: !!u.passwordHash }, token })
    }
    if (route === '/auth/register' && method === 'POST') {
      const { name, email, password, phone } = await request.json()
      if (!name || !email || !password) return err('Name, email and password are required.')
      const em = email.trim().toLowerCase()
      const existing = await db.collection('users').findOne({ email: em })
      if (existing) return err('User with this email already exists.', 409)

      const envAdmins = getEnvAdminEmails()
      const role = envAdmins.includes(em) ? 'admin' : 'user'

      const { salt, hash } = hashPassword(password)
      const userId = uuidv4()
      const newUser = {
        id: userId,
        name: name.trim(),
        email: em,
        phone: phone ? phone.trim() : '',
        role,
        passwordSalt: salt,
        passwordHash: hash,
        createdAt: new Date()
      }

      await db.collection('users').insertOne(newUser)

      const token = uuidv4()
      const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400 * 1000)
      await db.collection('sessions').insertOne({ token, userId, expiresAt, createdAt: new Date() })

      try { const store = await cookies(); store.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: SESSION_DAYS * 86400, secure: false }); } catch (e) {}

      return ok({
        user: {
          id: userId,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          hasPassword: true
        },
        token
      })
    }
    if (route === '/auth/google' && method === 'POST') {
      const { credential, accessToken, requireAdmin } = await request.json()
      if (!credential && !accessToken) return err('Google credential or access token is required.', 400)

      let payload = null
      if (credential) {
        try {
          const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`)
          if (!verifyRes.ok) {
            const errData = await verifyRes.json().catch(() => ({}))
            return err(errData.error_description || 'Invalid Google credential.', 401)
          }
          payload = await verifyRes.json()
        } catch (e) {
          return err('Failed to verify Google account. Please try again.', 500)
        }
      } else if (accessToken) {
        try {
          const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
          })
          if (!userinfoRes.ok) {
            const errData = await userinfoRes.json().catch(() => ({}))
            return err(errData.error_description || 'Invalid Google access token.', 401)
          }
          payload = await userinfoRes.json()
        } catch (e) {
          return err('Failed to verify Google access token. Please try again.', 500)
        }
      }

      if (!payload || !payload.email) {
        return err('Google account did not provide an email address.', 400)
      }

      const expectedClientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '998849094985-1ec0iv6a0ih2ulrru88vv3ngvcbcv68c.apps.googleusercontent.com'
      if (expectedClientId && payload.aud && payload.aud !== expectedClientId) {
        return err('Invalid Google client audience.', 401)
      }

      const em = payload.email.trim().toLowerCase()
      
      // Step 1: Verify admin status against .env and MongoDB database
      const isAdmin = await isAuthorizedAdminEmail(db, em)

      // If logging in specifically for the admin section, strictly verify admin authorization
      if (requireAdmin && !isAdmin) {
        return err(`Access Denied: The Google account "${em}" is not registered as an administrator in the database or system configuration (.env).`, 403)
      }

      const role = isAdmin ? 'admin' : 'user'
      const name = payload.name || em.split('@')[0]
      const avatar = payload.picture || ''
      const googleId = payload.sub

      let u = await db.collection('users').findOne({ email: em })
      if (!u) {
        const userId = uuidv4()
        const newUser = {
          id: userId,
          name: name.trim(),
          email: em,
          phone: '',
          role,
          avatar,
          googleId,
          provider: 'google',
          createdAt: new Date()
        }
        await db.collection('users').insertOne(newUser)
        u = newUser
      } else {
        if (u.status === 'disabled') {
          return err('This account has been disabled. Please contact a Super Administrator.', 403);
        }
        const updateFields = {}
        if (!u.googleId) updateFields.googleId = googleId
        if (!u.avatar && avatar) updateFields.avatar = avatar
        if (isAdmin && u.role !== 'admin') updateFields.role = 'admin'
        if (Object.keys(updateFields).length > 0) {
          await db.collection('users').updateOne({ id: u.id }, { $set: updateFields })
          u = { ...u, ...updateFields }
        }
      }

      await db.collection('users').updateOne({ id: u.id }, { $set: { lastLoginAt: new Date() } });

      const roleKey = u.roleKey || (u.role === 'admin' ? 'SUPER_ADMIN' : 'USER');
      const status = u.status || 'active';
      const permissions = u.role === 'admin' ? await resolveUserPermissions(db, { ...u, roleKey }) : [];

      const token = uuidv4()
      const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400 * 1000)
      await db.collection('sessions').insertOne({ token, userId: u.id, expiresAt, createdAt: new Date() })

      try {
        const store = await cookies()
        store.set(SESSION_COOKIE, token, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: SESSION_DAYS * 86400,
          secure: process.env.NODE_ENV === 'production' || request.url.startsWith('https')
        })
      } catch (e) {}

      return ok({
        user: {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone || '',
          role: u.role || (isAdmin ? 'admin' : 'user'),
          roleKey,
          status,
          permissions,
          avatar: u.avatar || avatar,
          hasPassword: !!u.passwordHash
        },
        token
      })
    }
    if (route === '/admin/auth/verify-email' && method === 'GET') {
      const email = request.nextUrl.searchParams.get('email');
      if (!email) return err('Email is required', 400);
      const em = email.trim().toLowerCase();
      const envAdmins = getEnvAdminEmails();
      const inEnv = envAdmins.includes(em);
      const dbUser = await db.collection('users').findOne({ email: em });
      const inDbAdmin = !!(dbUser && dbUser.role === 'admin');
      return ok({
        email: em,
        isAuthorized: inEnv || inDbAdmin,
        sources: {
          env: inEnv,
          db: inDbAdmin
        }
      });
    }
    if (route === '/auth/me' && method === 'GET') { const user = await getCurrentUser(db, request); return ok({ user }) }
    if (route === '/auth/logout' && method === 'POST') {
      let t = request.headers.get('x-auth-token');
      if (!t) { try { const store = await cookies(); t = store.get(SESSION_COOKIE)?.value; store.delete(SESSION_COOKIE); } catch (e) {} }
      if (t) await db.collection('sessions').deleteOne({ token: t });
      return ok({ ok: true })
    }
    if (route === '/auth/profile' && method === 'PUT') {
      const u = await getCurrentUser(db, request); if (!u) return err('Not authenticated', 401);
      const { name, phone } = await request.json();
      const rawPhone = (phone || '').toString();
      const digits = rawPhone.replace(/[^0-9]/g, '');
      const mobile10 = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
      if (!mobile10 || mobile10.length !== 10) {
        return err('Please enter a valid 10-digit mobile number.', 400);
      }
      const cleanPhone = `+91${mobile10}`;
      await db.collection('users').updateOne(
        { id: u.id },
        { $set: { name: (name || u.name).trim(), phone: cleanPhone, updatedAt: new Date() } }
      );

      // Invalidate server session cache so subsequent /auth/me queries return fresh data immediately
      invalidateUserSessionCache(u.id);
      let t = request.headers.get('x-auth-token') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
      if (!t) { try { const store = await cookies(); t = store.get(SESSION_COOKIE)?.value; } catch (e) {} }
      if (t) invalidateUserSessionCache(t);

      const up = await db.collection('users').findOne({ id: u.id });
      const { passwordHash, passwordSalt, _id, ...safe } = up;
      const roleKey = up.roleKey || (up.role === 'admin' ? 'SUPER_ADMIN' : 'USER');
      const status = up.status || 'active';
      const permissions = up.role === 'admin' ? await resolveUserPermissions(db, { ...up, roleKey }) : [];
      const finalUser = {
        ...safe,
        phone: cleanPhone,
        roleKey,
        status,
        permissions,
        hasPassword: !!passwordHash
      };
      if (t) {
        userSessionCacheSet(t, finalUser, 30000);
      }
      return ok({ user: finalUser });
    }
    if (route === '/auth/change-password' && method === 'POST') {
      const u = await getCurrentUser(db, request);
      if (!u) return err('Not authenticated.', 401);

      const { currentPassword, newPassword, confirmPassword } = await request.json();

      if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
        return err('New password must be at least 6 characters long.', 400);
      }

      if (confirmPassword && newPassword !== confirmPassword) {
        return err('New password and confirm password do not match.', 400);
      }

      const fullUser = await db.collection('users').findOne({ id: u.id });
      if (!fullUser) return err('User not found.', 404);

      if (fullUser.passwordHash) {
        if (!currentPassword) {
          return err('Current password is required.', 400);
        }
        const isMatch = verifyPassword(currentPassword, fullUser.passwordSalt, fullUser.passwordHash);
        if (!isMatch) {
          return err('Current password is incorrect.', 400);
        }
        if (currentPassword === newPassword) {
          return err('New password cannot be the same as your current password.', 400);
        }
      }

      const { salt, hash } = hashPassword(newPassword.trim());
      await db.collection('users').updateOne(
        { id: u.id },
        { $set: { passwordSalt: salt, passwordHash: hash, updatedAt: new Date() } }
      );

      invalidateUserSessionCache(u.id);
      let t = request.headers.get('x-auth-token') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
      if (!t) { try { const store = await cookies(); t = store.get(SESSION_COOKIE)?.value; } catch (e) {} }
      if (t) invalidateUserSessionCache(t);

      return ok({
        success: true,
        message: fullUser.passwordHash ? 'Password changed successfully.' : 'Password set successfully.'
      });
    }

    if (route === '/auth/forgot-password' && method === 'POST') {
      const { email, requireAdmin } = await request.json();
      if (!email || typeof email !== 'string' || !email.trim()) {
        return err('Email address is required.', 400);
      }
      const em = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(em)) {
        return err('Please enter a valid email address.', 400);
      }

      const u = await db.collection('users').findOne({ email: em });
      if (!u) {
        return err('No account was found with this email address.', 404);
      }

      if (requireAdmin) {
        const isAdmin = await isAuthorizedAdminEmail(db, em);
        if (!isAdmin) {
          return err(`Access Denied: "${em}" is not registered as an administrator in the database or system configuration (.env).`, 403);
        }
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await db.collection('password_resets').deleteMany({ email: em });
      await db.collection('password_resets').insertOne({
        id: uuidv4(),
        email: em,
        code,
        expiresAt,
        used: false,
        createdAt: new Date()
      });

      console.log(`[PASSWORD RESET] Code for ${em}: ${code} (expires in 15 mins)`);

      // Send verification code via Nodemailer (Gmail / SMTP)
      const emailResult = await sendPasswordResetEmail({
        toEmail: em,
        code,
        name: u.name,
        isAdmin: Boolean(requireAdmin)
      });

      let message = `A 6-digit verification code has been sent to ${em}. Please check your Gmail or email inbox (and spam folder).`;
      if (!emailResult.sent && emailResult.reason === 'SMTP_NOT_CONFIGURED') {
        message = `Verification code generated for ${em}. To deliver directly to your Gmail inbox, please configure SMTP_USER and SMTP_PASS in .env.`;
      }

      return ok({
        success: true,
        message,
        sent: emailResult.sent,
        code: emailResult.sent ? undefined : code,
        devCode: code,
        email: em
      });
    }

    if (route === '/auth/verify-reset-code' && method === 'POST') {
      const { email, code } = await request.json();
      if (!email || !code) return err('Email and verification code are required.', 400);
      const em = email.trim().toLowerCase();
      const cleanCode = code.toString().trim();

      const record = await db.collection('password_resets').findOne({
        email: em,
        code: cleanCode,
        used: false,
        expiresAt: { $gt: new Date() }
      });

      if (!record) {
        return err('Invalid or expired verification code.', 400);
      }

      return ok({ success: true, valid: true });
    }

    if (route === '/auth/reset-password' && method === 'POST') {
      const { email, code, newPassword, confirmPassword } = await request.json();
      if (!email || !code || !newPassword) {
        return err('Email, verification code, and new password are required.', 400);
      }

      if (typeof newPassword !== 'string' || newPassword.trim().length < 6) {
        return err('New password must be at least 6 characters long.', 400);
      }

      if (confirmPassword && newPassword !== confirmPassword) {
        return err('Passwords do not match.', 400);
      }

      const em = email.trim().toLowerCase();
      const cleanCode = code.toString().trim();

      const resetRecord = await db.collection('password_resets').findOne({
        email: em,
        code: cleanCode,
        used: false,
        expiresAt: { $gt: new Date() }
      });

      if (!resetRecord) {
        return err('Invalid or expired verification code. Please request a new one.', 400);
      }

      const user = await db.collection('users').findOne({ email: em });
      if (!user) {
        return err('User not found.', 404);
      }

      const { salt, hash } = hashPassword(newPassword.trim());
      await db.collection('users').updateOne(
        { id: user.id },
        { $set: { passwordSalt: salt, passwordHash: hash, updatedAt: new Date() } }
      );

      await db.collection('password_resets').updateOne(
        { id: resetRecord.id },
        { $set: { used: true, usedAt: new Date() } }
      );

      await db.collection('sessions').deleteMany({ userId: user.id });

      return ok({
        success: true,
        message: 'Password has been reset successfully. You can now log in.'
      });
    }

    // ============ ADDRESSES ============
    if (route === '/addresses' && method === 'GET') { const u = await getCurrentUser(db, request); if (!u) return err('Not authenticated', 401); const list = await db.collection('addresses').find({ userId: u.id }).sort({ createdAt: -1 }).toArray(); return ok({ addresses: list.map(clean) }) }
    if (route === '/addresses' && method === 'POST') {
      const u = await getCurrentUser(db, request); if (!u) return err('Not authenticated', 401);
      const b = await request.json();
      const rawPhone = (b.phone || '').toString();
      const digits = rawPhone.replace(/[^0-9]/g, '');
      const mobile10 = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
      if (!mobile10 || mobile10.length !== 10) {
        return err('Please enter a valid 10-digit mobile number.', 400);
      }
      const cleanPhone = `+91${mobile10}`;
      const a = { id: uuidv4(), userId: u.id, fullName: (b.fullName || '').trim(), phone: cleanPhone, line1: (b.line1 || '').trim(), line2: (b.line2 || '').trim(), city: (b.city || '').trim(), state: (b.state || '').trim(), pincode: (b.pincode || '').trim(), isDefault: !!b.isDefault, createdAt: new Date() };
      if (a.isDefault) await db.collection('addresses').updateMany({ userId: u.id }, { $set: { isDefault: false } });
      await db.collection('addresses').insertOne(a);
      return ok({ address: clean(a) });
    }
    if (route.startsWith('/addresses/') && (method === 'PUT' || method === 'PATCH')) {
      const u = await getCurrentUser(db, request); if (!u) return err('Not authenticated', 401);
      const id = route.split('/')[2];
      const b = await request.json();
      const rawPhone = (b.phone || '').toString();
      const digits = rawPhone.replace(/[^0-9]/g, '');
      const mobile10 = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
      if (!mobile10 || mobile10.length !== 10) {
        return err('Please enter a valid 10-digit mobile number.', 400);
      }
      const cleanPhone = `+91${mobile10}`;
      const isDefault = !!b.isDefault;
      if (isDefault) {
        await db.collection('addresses').updateMany({ userId: u.id }, { $set: { isDefault: false } });
      }
      const updateData = {
        fullName: (b.fullName || '').trim(),
        phone: cleanPhone,
        line1: (b.line1 || '').trim(),
        line2: (b.line2 || '').trim(),
        city: (b.city || '').trim(),
        state: (b.state || '').trim(),
        pincode: (b.pincode || '').trim(),
        isDefault,
        updatedAt: new Date()
      };
      const res = await db.collection('addresses').updateOne(
        { id, userId: u.id },
        { $set: updateData }
      );
      if (res.matchedCount === 0) return err('Address not found', 404);
      const updated = await db.collection('addresses').findOne({ id, userId: u.id });
      return ok({ address: clean(updated) });
    }
    if (route.startsWith('/addresses/') && method === 'DELETE') { const u = await getCurrentUser(db, request); if (!u) return err('Not authenticated', 401); const id = route.split('/')[2]; await db.collection('addresses').deleteOne({ id, userId: u.id }); return ok({ ok: true }) }

    // ============ WISHLIST ============
    if (route === '/wishlist' && method === 'GET') {
      const u = await getCurrentUser(db, request); if (!u) return err('Not authenticated', 401);
      const list = await db.collection('wishlist').find({ userId: u.id }).sort({ createdAt: -1 }).toArray();
      const rawProductIds = list.map(w => w.productId).filter(Boolean);
      let prods = [];
      if (rawProductIds.length > 0) {
        prods = await db.collection('products').find({
          $or: [
            { id: { $in: rawProductIds } },
            { slug: { $in: rawProductIds } }
          ]
        }).toArray();
      }

      const foundIds = new Set();
      prods.forEach(p => {
        if (p.id) foundIds.add(p.id);
        if (p.slug) foundIds.add(p.slug);
      });

      const validList = list.filter(w => foundIds.has(w.productId));
      const orphanIds = rawProductIds.filter(id => !foundIds.has(id));

      if (orphanIds.length > 0) {
        db.collection('wishlist').deleteMany({ userId: u.id, productId: { $in: orphanIds } }).catch(() => {});
      }

      return ok({ wishlist: validList.map(clean), products: prods.map(clean) });
    }
    if (route === '/wishlist' && method === 'POST') {
      const u = await getCurrentUser(db, request); if (!u) return err('Not authenticated', 401);
      const b = await request.json();
      if (!b.productId) return err('Product ID is required.', 400);
      const p = await db.collection('products').findOne({ $or: [{ id: b.productId }, { slug: b.productId }] });
      if (!p) return err('Product not found.', 404);
      const existing = await db.collection('wishlist').findOne({ userId: u.id, productId: p.id });
      if (existing) return ok({ wishlist: clean(existing) });
      const item = { id: uuidv4(), userId: u.id, productId: p.id, createdAt: new Date() };
      await db.collection('wishlist').insertOne(item);
      return ok({ wishlist: clean(item) });
    }
    if (route.startsWith('/wishlist/') && method === 'DELETE') {
      const u = await getCurrentUser(db, request); if (!u) return err('Not authenticated', 401);
      const productId = route.split('/')[2];
      await db.collection('wishlist').deleteMany({ userId: u.id, productId });
      return ok({ ok: true });
    }

    // ============ DATABASE CART PERSISTENCE & PRICING ============
    if (route === '/cart' && method === 'GET') {
      const u = await getCurrentUser(db, request);
      if (!u) return ok({ items: [], subtotal: 0, discount: 0, coupon: null, couponCode: null, couponValid: true, total: 0 });

      const cartDoc = await db.collection('cart').findOne({ userId: u.id });
      if (!cartDoc || !Array.isArray(cartDoc.items) || cartDoc.items.length === 0) {
        return ok({ items: [], subtotal: 0, discount: 0, coupon: null, couponCode: null, couponValid: true, total: 0 });
      }

      let siteSettings = await db.collection('site_settings').findOne({ id: 'default' });
      const shippingConfig = {
        ...DEFAULT_SITE_SETTINGS.shipping,
        ...((siteSettings && siteSettings.shipping) || {})
      };

      const pricing = await calculateCartPricing({
        db,
        items: cartDoc.items,
        couponCode: cartDoc.coupon || cartDoc.couponCode || null,
        giftWrap: !!cartDoc.giftWrap,
        shippingConfig,
        user: u
      });

      // If coupon was present in DB cart but is now invalid, synchronize DB atomically
      if (cartDoc.coupon && !pricing.couponValid) {
        await db.collection('cart').updateOne(
          { userId: u.id },
          {
            $set: {
              coupon: null,
              couponCode: null,
              discount: 0,
              subtotal: pricing.subtotal,
              total: pricing.total,
              updatedAt: new Date()
            }
          }
        );
      }

      return ok(pricing);
    }

    if (route === '/cart' && method === 'PUT') {
      const u = await getCurrentUser(db, request);
      if (!u) return err('Not authenticated', 401);
      const b = await request.json().catch(() => ({}));
      const items = Array.isArray(b.items) ? b.items : [];
      const incomingCoupon = b.coupon !== undefined ? b.coupon : (b.couponCode !== undefined ? b.couponCode : null);

      let siteSettings = await db.collection('site_settings').findOne({ id: 'default' });
      const shippingConfig = {
        ...DEFAULT_SITE_SETTINGS.shipping,
        ...((siteSettings && siteSettings.shipping) || {})
      };

      const pricing = await calculateCartPricing({
        db,
        items,
        couponCode: incomingCoupon,
        giftWrap: !!b.giftWrap,
        shippingConfig,
        user: u
      });

      await db.collection('cart').updateOne(
        { userId: u.id },
        {
          $set: {
            userId: u.id,
            items: pricing.items,
            coupon: pricing.couponCode,
            couponCode: pricing.couponCode,
            discount: pricing.discount,
            subtotal: pricing.subtotal,
            total: pricing.total,
            giftWrap: !!b.giftWrap,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );

      return ok(pricing);
    }

    if (route === '/cart' && method === 'DELETE') {
      const u = await getCurrentUser(db, request);
      if (!u) return err('Not authenticated', 401);
      await db.collection('cart').deleteOne({ userId: u.id });
      return ok({ items: [], subtotal: 0, discount: 0, coupon: null, couponCode: null, couponValid: true, total: 0 });
    }

    // ============ CART PRICING & REVALIDATION ============
    if (route === '/cart/pricing' && method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const u = await getCurrentUser(db, request);
      let siteSettings = await db.collection('site_settings').findOne({ id: 'default' });
      const shippingConfig = {
        ...DEFAULT_SITE_SETTINGS.shipping,
        ...((siteSettings && siteSettings.shipping) || {})
      };

      const pricing = await calculateCartPricing({
        db,
        items: body.items || [],
        couponCode: body.coupon || body.couponCode || null,
        giftWrap: !!body.giftWrap,
        shippingConfig,
        user: u
      });

      return ok(pricing);
    }

    // ============ COUPONS SETTINGS (public) ============
    if (route === '/coupons/settings' && method === 'GET') {
      const isNoCache = request.headers.get('cache-control')?.includes('no-cache') || request.headers.get('cache-control')?.includes('no-store');
      if (!isNoCache) {
        const cached = cacheGet('coupon_settings');
        if (cached) return ok(cached);
      }
      let settings = await db.collection('site_settings').findOne({ id: 'default' });
      const helperText = settings?.couponHelperText !== undefined
        ? settings.couponHelperText
        : (DEFAULT_SITE_SETTINGS.couponHelperText || 'Try MIKUMANTRA10 or WELCOME2000');
      const res = {
        success: true,
        data: {
          helperText
        },
        helperText
      };
      cacheSet('coupon_settings', res, 5000);
      return ok(res);
    }

    // ============ COUPONS (public validate) ============
    if (route === '/coupons/validate' && method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const code = (body.code || '').trim().toUpperCase();
      const subtotal = Number(body.subtotal) || 0;
      const items = Array.isArray(body.items) ? body.items : [];
      const user = await getCurrentUser(db, request);

      if (!code) return err('Coupon code is required', 400);

      const c = await db.collection('coupons').findOne({
        code,
        $or: [{ active: true }, { isActive: true }]
      });
      if (!c) return err('Invalid coupon', 404);

      const valResult = validateCouponRules(c, subtotal, { items, user, db });
      if (!valResult.valid) {
        return err(valResult.message || `Minimum order ₹${valResult.minOrder} required`, 400);
      }

      return ok({
        code: valResult.code,
        discount: valResult.discount,
        type: valResult.type,
        value: valResult.value,
        minOrder: valResult.minOrder,
        maxDiscount: valResult.maxDiscount,
        valid: true
      });
    }

    // ============ CART VALIDATION ============
    if (route === '/cart/validate' && method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const rawItems = Array.isArray(body.items) ? body.items : (body.productId ? [{ id: body.productId, qty: body.qty || 1 }] : []);
      if (rawItems.length === 0) return ok({ valid: true, items: [] });

      const results = [];
      let allValid = true;

      for (const item of rawItems) {
        const id = item.id || item.productId;
        const qty = parseInt(item.qty) || 1;
        if (!id) continue;

        const dbProduct = await db.collection('products').findOne({
          $or: [
            { id },
            { id: String(id) },
            { slug: id },
            ...(item.slug ? [{ slug: item.slug }] : [])
          ]
        });
        if (!dbProduct) {
          results.push({ id, status: 'out_of_stock', availableStock: 0, message: 'This product is currently out of stock.' });
          allValid = false;
          continue;
        }

        const stock = Math.max(0, parseInt(dbProduct.stock) || 0);
        if (stock <= 0) {
          results.push({ id, name: dbProduct.name, status: 'out_of_stock', availableStock: 0, message: 'This product is currently out of stock.' });
          allValid = false;
        } else if (qty > stock) {
          results.push({ id, name: dbProduct.name, status: 'insufficient_stock', availableStock: stock, message: `Only ${stock} ${stock === 1 ? 'item is' : 'items are'} available.` });
          allValid = false;
        } else {
          results.push({ id, name: dbProduct.name, status: 'ok', availableStock: stock });
        }
      }

      if (!allValid && body.singleCheck) {
        const firstErr = results.find(r => r.status !== 'ok');
        return err(firstErr?.message || 'This product is currently out of stock.', 400);
      }

      return ok({ valid: allValid, items: results });
    }

    // ============ ORDERS ============
    if (route === '/orders' && method === 'POST') {
      const u = await getCurrentUser(db, request);
      if (!u) return err('Please login or create an account before placing your order.', 401);
      const body = await request.json();
      const rawItems = Array.isArray(body.items) ? body.items : [];
      if (rawItems.length === 0) return err('Cart is empty.', 400);

      // Validate shipping address
      const address = body.address || {};
      const fullName = (address.fullName || '').trim();
      const phone = (address.phone || '').trim();
      const line1 = (address.line1 || '').trim();
      const city = (address.city || '').trim();
      const state = (address.state || '').trim();
      const pincode = (address.pincode || '').trim();

      if (!fullName || !phone || !line1 || !city || !pincode) {
        return err('Complete shipping address (Full Name, Phone, Address, City, Pincode) is required.', 400);
      }

      if (!/^\d{6}$/.test(pincode)) {
        return err('Please enter a valid 6-digit numeric pincode.', 400);
      }

      const rawDigits = phone.replace(/[^0-9]/g, '');
      const mobile10 = rawDigits.startsWith('91') && rawDigits.length === 12 ? rawDigits.slice(2) : rawDigits;
      if (mobile10.length !== 10) {
        return err('Please enter a valid 10-digit mobile number.', 400);
      }
      const cleanPhone = `+91${mobile10}`;

      // Re-fetch and validate every product from MongoDB
      const validatedItems = [];
      let calculatedSubtotal = 0;

      for (const item of rawItems) {
        if (!item.id) return err('Invalid product in cart.', 400);
        const qty = parseInt(item.qty);
        if (isNaN(qty) || qty <= 0) return err('Invalid product quantity.', 400);

        const dbProduct = await db.collection('products').findOne({
          $or: [
            { id: item.id },
            { id: String(item.id) },
            { slug: item.id },
            ...(item.slug ? [{ slug: item.slug }] : [])
          ]
        });
        if (!dbProduct) {
          return err(`Product "${item.name || item.id}" is no longer available.`, 400);
        }

        const currentStock = Math.max(0, parseInt(dbProduct.stock) || 0);

        if (currentStock <= 0) {
          return err('This product is currently out of stock.', 400);
        }

        if (currentStock < qty) {
          return err(`Only ${currentStock} items are available.`, 400);
        }

        const realPrice = Number(dbProduct.price) || 0;
        const itemSubtotal = realPrice * qty;
        calculatedSubtotal += itemSubtotal;

        validatedItems.push({
          id: dbProduct.id,
          slug: dbProduct.slug || dbProduct.id,
          name: dbProduct.name,
          image: dbProduct.images?.[0] || dbProduct.img || '',
          price: realPrice,
          qty,
          subtotal: itemSubtotal
        });
      }

      // Recalculate coupon discount server-side using centralized coupon engine
      let calculatedDiscount = 0;
      let couponCode = null;
      let validCouponDoc = null;

      if (body.coupon && typeof body.coupon === 'string' && body.coupon.trim()) {
        const code = body.coupon.trim().toUpperCase();
        const couponDoc = await db.collection('coupons').findOne({
          code,
          $or: [{ active: true }, { isActive: true }]
        });
        if (couponDoc) {
          const valResult = validateCouponRules(couponDoc, calculatedSubtotal, { items: validatedItems, user: u });
          if (valResult.valid) {
            couponCode = valResult.code;
            calculatedDiscount = valResult.discount;
            validCouponDoc = couponDoc;
          }
        }
      }

      let siteSettings = await db.collection('site_settings').findOne({ id: 'default' });
      const chosenPayment = body.payment || 'cod';
      const payConfig = siteSettings?.paymentSettings;
      if (chosenPayment === 'razorpay' && payConfig?.razorpay?.enabled === false) {
        return err('Razorpay payment method is currently disabled by store administrator.', 400);
      }
      if (chosenPayment === 'cod' && payConfig?.cod?.enabled === false) {
        return err('Cash on Delivery payment method is currently disabled by store administrator.', 400);
      }

      const shippingConfig = {
        ...DEFAULT_SITE_SETTINGS.shipping,
        ...((siteSettings && siteSettings.shipping) || {})
      };
      const shipping = calculateShippingCharge(calculatedSubtotal, shippingConfig);
      const tax = Math.round(Math.max(0, calculatedSubtotal - calculatedDiscount) * 0.03);
      const giftWrap = body.giftWrap ? 250 : 0;
      const calculatedTotal = Math.max(0, calculatedSubtotal - calculatedDiscount + shipping + tax + giftWrap);

      const orderNumber = 'MIK-' + Date.now().toString().slice(-8) + '-' + Math.floor(Math.random() * 900 + 100);
      const now = new Date();
      const invoiceNumber = 'INV-' + orderNumber;

      const cleanAddress = {
        fullName,
        phone: cleanPhone,
        line1,
        line2: (address.line2 || '').trim(),
        city,
        state,
        pincode
      };

      const order = {
        id: uuidv4(),
        orderNumber,
        invoiceNumber,
        userId: u.id,
        guestEmail: null,
        items: validatedItems,
        address: cleanAddress,
        payment: body.payment || 'cod',
        paymentStatus: body.payment === 'razorpay' ? 'paid' : 'pending',
        coupon: couponCode,
        giftWrap: !!body.giftWrap,
        amounts: {
          subtotal: calculatedSubtotal,
          discount: calculatedDiscount,
          shipping,
          tax,
          giftWrap,
          total: calculatedTotal
        },
        status: 'confirmed',
        statusHistory: [{ status: 'confirmed', at: now, note: 'Order placed successfully.' }],
        razorpayPaymentId: body.razorpayPaymentId || null,
        razorpayOrderId: body.razorpayOrderId || null,
        placedAt: now,
        estimatedDelivery: new Date(Date.now() + 5 * 86400 * 1000)
      };

      // Atomic Decrement stock in DB with concurrency safety
      const decremented = [];
      let stockError = null;

      for (const it of validatedItems) {
        const updateRes = await db.collection('products').updateOne(
          { id: it.id, stock: { $gte: it.qty } },
          { $inc: { stock: -it.qty } }
        );
        if (updateRes.modifiedCount === 1) {
          decremented.push(it);
        } else {
          const currentP = await db.collection('products').findOne({ id: it.id });
          const avail = Math.max(0, parseInt(currentP?.stock) || 0);
          if (avail <= 0) {
            stockError = 'Sorry, this product is now out of stock.';
          } else {
            stockError = `Sorry, this product is no longer available in the requested quantity. Only ${avail} available.`;
          }
          break;
        }
      }

      if (stockError) {
        // Rollback any items decremented so far
        for (const dec of decremented) {
          await db.collection('products').updateOne(
            { id: dec.id },
            { $inc: { stock: dec.qty } }
          );
        }
        cacheBust('products:');
        return err(stockError, 400);
      }

      await db.collection('orders').insertOne(order);

      // Invalidate / clear the user's cart in database
      await db.collection('cart').deleteOne({ userId: u.id });

      // Increment coupon usage count if applied
      if (validCouponDoc) {
        try {
          await db.collection('coupons').updateOne(
            { _id: validCouponDoc._id },
            { $inc: { usedCount: 1, usageCount: 1 } }
          );
        } catch (couponErr) {
          console.warn('Failed to increment coupon usage:', couponErr.message);
        }
      }

      cacheBust('products:');

      // Trigger WhatsApp & SMS notification for order placement
      await sendOrderPlacedNotification({ order, user: u, db });

      return ok({ order: clean(order) });
    }
    if (route === '/orders' && method === 'GET') { const u = await getCurrentUser(db, request); if (!u) return err('Not authenticated', 401); const list = await db.collection('orders').find({ userId: u.id }).sort({ placedAt: -1 }).toArray(); return ok({ orders: list.map(clean) }) }
    if (route.startsWith('/orders/') && route.endsWith('/invoice') && method === 'GET') {
      const u = await getCurrentUser(db, request); if (!u) return err('Not authenticated', 401);
      const id = route.split('/')[2];
      const order = await db.collection('orders').findOne({ id });
      if (!order) return err('Order not found', 404);
      if (order.userId !== u.id && u.role !== 'admin') return err('Unauthorized', 403);

      const footerDoc = await db.collection('footer').findOne({ id: 'default' });
      const siteSettingsDoc = await db.collection('site_settings').findOne({ id: 'default' });
      const headerDoc = await db.collection('header').findOne({ id: 'default' });

      const logoUrl = siteSettingsDoc?.logo || footerDoc?.company?.logo || headerDoc?.logo?.image || '/logo.png';

      let logoBuffer = null;
      try {
        if (logoUrl.includes('/uploads/')) {
          const filename = logoUrl.split('/uploads/')[1];
          const fileDoc = await db.collection('uploads').findOne({ filename });
          if (fileDoc && fileDoc.data) {
            let buf = fileDoc.data;
            if (buf.buffer) buf = Buffer.from(buf.buffer);
            else if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
            logoBuffer = buf;
          } else {
            const fsPath = pathModule.join(process.cwd(), 'public', 'uploads', filename);
            if (fs.existsSync(fsPath)) {
              logoBuffer = fs.readFileSync(fsPath);
            }
          }
        } else if (logoUrl.startsWith('data:')) {
          const b64 = logoUrl.split(',')[1];
          if (b64) logoBuffer = Buffer.from(b64, 'base64');
        } else if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
          const res = await fetch(logoUrl);
          if (res.ok) {
            logoBuffer = Buffer.from(await res.arrayBuffer());
          }
        } else {
          const localPath = pathModule.join(process.cwd(), 'public', logoUrl.replace(/^\//, ''));
          if (fs.existsSync(localPath)) {
            logoBuffer = fs.readFileSync(localPath);
          } else {
            const defaultLogo = pathModule.join(process.cwd(), 'public', 'logo.png');
            if (fs.existsSync(defaultLogo)) {
              logoBuffer = fs.readFileSync(defaultLogo);
            }
          }
        }
      } catch (err) {
        console.warn('Invoice: Failed to resolve logoBuffer:', err.message);
      }

      const companyConfig = {
        name: footerDoc?.company?.name || siteSettingsDoc?.siteName || 'MikuMantra Fine Jewellery',
        logo: logoUrl,
        logoBuffer,
        address: footerDoc?.company?.address || '',
        email: footerDoc?.company?.email || '',
        phone: footerDoc?.company?.phone || '',
        website: footerDoc?.company?.website || siteSettingsDoc?.siteUrl || '',
        gstin: footerDoc?.company?.gstin || '',
        pan: footerDoc?.company?.pan || '',
        cin: footerDoc?.company?.cin || '',
        registeredAddress: footerDoc?.company?.registeredAddress || '',
        invoiceTerms: footerDoc?.company?.invoiceTerms || ''
      };

      const pdf = await buildInvoicePDF(order, companyConfig);
      return handleCORS(new NextResponse(pdf, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="Invoice-${order.orderNumber}.pdf"` } }));
    }
    if (route.startsWith('/orders/') && route.endsWith('/shippingslip') && method === 'GET') {
      const u = await getCurrentUser(db, request); if (!u) return err('Not authenticated', 401);
      const id = route.split('/')[2];
      const order = await db.collection('orders').findOne({ id });
      if (!order) return err('Order not found', 404);
      if (order.userId !== u.id && u.role !== 'admin') return err('Unauthorized', 403);
      if (order.status === 'cancelled') return err('Order is cancelled. Shipping slip cannot be generated for cancelled orders.', 400);
      const pdf = await buildShippingSlipPDF(order);
      return handleCORS(new NextResponse(pdf, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="MikuMantra-ShippingSlip-${order.orderNumber}.pdf"` } }));
    }
    if (route.startsWith('/orders/') && route.endsWith('/cancel') && method === 'POST') {
      const u = await getCurrentUser(db, request);
      if (!u) return err('Not authenticated', 401);
      const id = route.split('/')[2];
      const body = await request.json().catch(() => ({}));
      const reason = (body.reason || '').trim();
      const note = (body.note || '').trim();

      const ALLOWED_REASONS = [
        'Changed my mind',
        'Ordered by mistake',
        'Product no longer required',
        'Found a better product',
        'Delivery taking too long',
        'Other'
      ];

      if (!reason || !ALLOWED_REASONS.includes(reason)) {
        return err('Please select a valid cancellation reason.', 400);
      }

      if (reason === 'Other' && !note) {
        return err('Please enter your reason for cancellation.', 400);
      }

      const order = await db.collection('orders').findOne({ id });
      if (!order) return err('Order not found', 404);

      if (order.userId !== u.id) {
        return err('Unauthorized access: You can only cancel your own orders.', 403);
      }

      if (order.status === 'cancelled') {
        return err('This order has already been cancelled.', 400);
      }

      if (['shipped', 'delivered'].includes(order.status)) {
        return err('This order can no longer be cancelled because it has already been shipped.', 400);
      }

      const CANCELLABLE_STATUSES = ['confirmed', 'placed', 'processing', 'packed'];
      if (!CANCELLABLE_STATUSES.includes(order.status)) {
        return err(`Orders with status "${order.status}" cannot be cancelled.`, 400);
      }

      const now = new Date();
      const cancellationReasonStr = reason === 'Other' ? (note ? `Other: ${note}` : 'Other') : reason;

      const isPaid = order.paymentStatus === 'paid' || (order.payment !== 'cod' && order.paymentStatus !== 'pending');
      const refundDoc = isPaid ? {
        refundStatus: 'refund_initiated',
        refundAmount: order.amounts?.total || 0,
        refundId: order.razorpayPaymentId ? `ref_${order.razorpayPaymentId}` : `ref_MOCK_${uuidv4().slice(0, 8)}`,
        refundInitiatedAt: now
      } : {
        refundStatus: 'not_applicable'
      };

      const updateResult = await db.collection('orders').updateOne(
        {
          id,
          status: { $in: CANCELLABLE_STATUSES }
        },
        {
          $set: {
            status: 'cancelled',
            cancelledAt: now,
            cancelledBy: 'customer',
            cancelledByUserId: u.id,
            cancelledByRole: 'customer',
            cancellationReason: reason,
            cancellationNote: note,
            ...refundDoc
          },
          $push: {
            statusHistory: {
              status: 'cancelled',
              at: now,
              note: `Cancelled by customer: ${cancellationReasonStr}`
            }
          }
        }
      );

      if (updateResult.modifiedCount === 0) {
        return err('This order can no longer be cancelled or has already been cancelled.', 400);
      }

      if (Array.isArray(order.items)) {
        for (const item of order.items) {
          if (item.id && item.qty > 0) {
            await db.collection('products').updateOne(
              { id: item.id },
              { $inc: { stock: item.qty } }
            );
          }
        }
        cacheBust('products:');
      }

      const updatedOrder = await db.collection('orders').findOne({ id });

      // Trigger WhatsApp & SMS notification for order cancellation
      await sendOrderCancelledNotification({ order: updatedOrder, user: u, db });

      return ok({
        message: 'Order cancelled successfully.',
        order: clean(updatedOrder)
      });
    }

    // ============ PUBLIC ORDER TRACKING ============
    if ((route === '/orders/track' || route === '/track') && method === 'GET') {
      const orderNumber = (q.get('orderNumber') || q.get('order') || '').trim();
      const contact = (q.get('contact') || q.get('phone') || q.get('email') || '').trim();
      const awb = (q.get('awb') || q.get('trackingNumber') || '').trim();

      if (!orderNumber && !awb) {
        return err('Order Number or AWB Tracking Number is required.', 400);
      }

      let order = null;
      if (awb) {
        const escapedAwb = awb.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
        order = await db.collection('orders').findOne({
          $or: [
            { trackingNumber: { $regex: `^${escapedAwb}$`, $options: 'i' } },
            { 'courier.trackingNumber': { $regex: `^${escapedAwb}$`, $options: 'i' } }
          ]
        });
      } else if (orderNumber) {
        const cleanOrderNum = orderNumber.replace(/[^a-zA-Z0-9-]/g, '');
        const orderCandidates = await db.collection('orders').find({
          $or: [
            { orderNumber: { $regex: cleanOrderNum, $options: 'i' } },
            { id: orderNumber }
          ]
        }).toArray();

        if (orderCandidates.length > 0) {
          const currentUser = await getCurrentUser(db, request);
          if (currentUser) {
            order = orderCandidates.find(o => o.userId === currentUser.id) || null;
          }

          if (!order && contact) {
            const rawDigits = contact.replace(/[^0-9]/g, '');
            const phoneEnd = rawDigits.slice(-10);
            const contactLower = contact.toLowerCase();

            order = orderCandidates.find(o => {
              const orderPhoneDigits = (o.address?.phone || '').replace(/[^0-9]/g, '');
              const phoneMatches = phoneEnd && orderPhoneDigits.endsWith(phoneEnd);
              const emailMatches = (o.guestEmail && o.guestEmail.toLowerCase() === contactLower);
              return phoneMatches || emailMatches;
            }) || null;
          } else if (!order && !contact && (currentUser?.role === 'admin' || orderCandidates.length === 1)) {
            order = orderCandidates[0];
          }
        }
      }

      if (!order) {
        return err('No matching order found. Please check your order details and contact number.', 404);
      }

      // Return sanitized order details for public tracking
      const sanitizedOrder = {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        statusHistory: order.statusHistory || [],
        placedAt: order.placedAt,
        estimatedDelivery: order.estimatedDelivery,
        courier: order.courier || null,
        carrier: order.carrier || order.courier?.carrier || null,
        trackingNumber: order.trackingNumber || order.courier?.trackingNumber || null,
        trackingUrl: order.trackingUrl || order.courier?.trackingUrl || null,
        items: (order.items || []).map(i => ({
          id: i.id,
          name: i.name,
          image: i.image,
          qty: i.qty,
          price: i.price,
          subtotal: i.subtotal
        })),
        amounts: order.amounts,
        address: {
          fullName: order.address?.fullName,
          city: order.address?.city,
          state: order.address?.state,
          pincode: order.address?.pincode
        }
      };

      return ok({ order: sanitizedOrder });
    }

    if (route.startsWith('/orders/') && method === 'GET') {
      const u = await getCurrentUser(db, request); if (!u) return err('Not authenticated', 401);
      const id = route.split('/')[2];
      const o = await db.collection('orders').findOne({ id });
      if (!o) return err('Order not found', 404);
      if (o.userId !== u.id && u.role !== 'admin') return err('Unauthorized', 403);
      const returnDoc = await db.collection('returns').findOne({
        orderId: id,
        returnStatus: { $in: ['REQUESTED', 'RETURN_REQUESTED', 'APPROVED', 'RETURN_APPROVED', 'REFUND_DETAILS_SUBMITTED', 'PROCESSING', 'REFUND_INITIATED', 'REFUNDED', 'REJECTED'] }
      });
      let clientReturnDoc = returnDoc ? clean(returnDoc) : null;
      if (clientReturnDoc?.refundDetails && u.role !== 'admin') {
        const { accountNumber, ...safeRefundDetails } = clientReturnDoc.refundDetails;
        clientReturnDoc.refundDetails = safeRefundDetails;
      }
      const orderReviews = await db.collection('reviews').find({ orderId: id }).toArray();
      const siteDoc = await db.collection('site_settings').findOne({ id: 'default' });
      const customerReviewsEnabled = siteDoc?.customerReviewsEnabled ?? true;
      return ok({
        order: clean(o),
        returnRequest: clientReturnDoc,
        reviews: orderReviews.map(clean),
        customerReviewsEnabled
      });
    }

    // ============ USER RETURN REQUESTS ============
    if (route === '/returns' && method === 'POST') {
      const u = await getCurrentUser(db, request);
      if (!u) return err('Not authenticated', 401);

      const body = await request.json().catch(() => ({}));
      const { orderId, items, reason, comment } = body;

      if (!orderId) return err('Order ID is required.', 400);
      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        return err('Return reason is required.', 400);
      }
      if (!Array.isArray(items) || items.length === 0) {
        return err('At least one item must be selected for return.', 400);
      }

      const order = await db.collection('orders').findOne({ id: orderId });
      if (!order) return err('Order not found.', 404);

      if (order.userId !== u.id && u.role !== 'admin') {
        return err('Unauthorized access to this order.', 403);
      }

      if (order.status !== 'delivered') {
        return err('Return request can only be submitted for delivered orders.', 400);
      }

      let deliveredAtTime = order.deliveredAt ? new Date(order.deliveredAt).getTime() : null;
      if (!deliveredAtTime && Array.isArray(order.statusHistory)) {
        const dHist = order.statusHistory.find(h => h.status === 'delivered');
        if (dHist && dHist.at) deliveredAtTime = new Date(dHist.at).getTime();
      }

      if (!deliveredAtTime) {
        return err('Order delivery timestamp is missing. Cannot request return.', 400);
      }

      const now = new Date();
      const diffMs = now.getTime() - deliveredAtTime;
      const MAX_RETURN_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

      if (diffMs > MAX_RETURN_WINDOW_MS) {
        return err('Return window expired. Return requests must be submitted within 30 minutes of delivery.', 400);
      }

      // Check existing active or completed return for duplicate prevention
      const existingReturn = await db.collection('returns').findOne({
        orderId,
        returnStatus: { $in: ['REQUESTED', 'RETURN_REQUESTED', 'APPROVED', 'RETURN_APPROVED', 'REFUND_DETAILS_SUBMITTED', 'PROCESSING', 'REFUND_INITIATED', 'REFUNDED'] }
      });
      if (existingReturn) {
        return err('An active or completed return request already exists for this order.', 400);
      }

      // Validate quantities against purchased quantities
      for (const reqItem of items) {
        const orig = (order.items || []).find(i => i.id === reqItem.id);
        if (!orig) return err(`Product "${reqItem.id}" was not part of this order.`, 400);
        const reqQty = parseInt(reqItem.returnQty || reqItem.qty) || 0;
        if (reqQty <= 0) return err('Return quantity must be greater than zero.', 400);
        if (reqQty > orig.qty) {
          return err(`Cannot return more quantity (${reqQty}) than was purchased (${orig.qty}) for "${orig.name}".`, 400);
        }
      }

      // Calculate server-side refund amount
      const { refundAmount, itemsRefund } = calculateReturnRefund({ order, items });

      const rawImages = Array.isArray(body.images) ? body.images : (body.image ? [body.image] : []);
      const uploadedImages = rawImages.filter(img => typeof img === 'string' && img.trim().length > 0);

      const returnId = 'ret_' + uuidv4();
      const returnDoc = {
        id: returnId,
        returnId,
        orderId,
        orderNumber: order.orderNumber,
        userId: u.id,
        items: itemsRefund,
        reason: reason.trim(),
        comment: (comment || '').trim(),
        images: uploadedImages,
        requestedAt: now,
        deliveredAt: order.deliveredAt,
        returnStatus: 'REQUESTED',
        refundStatus: 'PENDING',
        refundAmount,
        rejectionReason: null,
        rejectedAt: null,
        rejectedBy: null,
        approvedAt: null,
        approvedBy: null,
        refundId: null,
        gatewayRefundId: null,
        refundRequestedAt: null,
        refundProcessedAt: null,
        refundFailureReason: null,
        inventoryStatus: 'PENDING',
        inventoryClassification: null,
        inventoryRestocked: false,
        createdAt: now,
        updatedAt: now
      };

      await db.collection('returns').insertOne(returnDoc);
      await db.collection('orders').updateOne(
        { id: orderId },
        {
          $set: {
            returnStatus: 'REQUESTED',
            returnId,
            refundStatus: 'PENDING',
            updatedAt: now
          }
        }
      );
      await createAuditLog(db, {
        returnId,
        orderId,
        action: 'return_requested',
        performedBy: u.id,
        oldStatus: 'NONE',
        newStatus: 'REQUESTED',
        reason: reason.trim(),
        metadata: { refundAmount, itemsCount: itemsRefund.length, imageCount: uploadedImages.length }
      });

      await sendReturnRequestedNotification({ returnReq: returnDoc, order, user: u, db });

      return ok({ return: clean(returnDoc) });
    }

    if (route === '/returns' && method === 'GET') {
      const u = await getCurrentUser(db, request);
      if (!u) return err('Not authenticated', 401);
      const list = await db.collection('returns').find({ userId: u.id }).sort({ requestedAt: -1 }).toArray();
      const safeList = list.map(clean).map(r => {
        if (r.refundDetails && u.role !== 'admin') {
          const { accountNumber, ...safeRefund } = r.refundDetails;
          return { ...r, refundDetails: safeRefund };
        }
        return r;
      });
      return ok({ returns: safeList });
    }

    // ============ SUBMIT REFUND DETAILS (AFTER RETURN APPROVAL) ============
    if (route.startsWith('/returns/') && route.endsWith('/refund-details') && method === 'POST') {
      const u = await getCurrentUser(db, request);
      if (!u) return err('Not authenticated', 401);

      const parts = route.split('/').filter(Boolean); // ['returns', '<id>', 'refund-details']
      const returnId = parts[1];
      if (!returnId) return err('Return ID is required.', 400);

      const rDoc = await db.collection('returns').findOne({ $or: [{ id: returnId }, { returnId }] });
      if (!rDoc) return err('Return request not found.', 404);

      if (rDoc.userId !== u.id && u.role !== 'admin') {
        return err('Unauthorized access to this return request.', 403);
      }

      // Check that return request is approved
      const isApproved = ['APPROVED', 'RETURN_APPROVED', 'REFUND_DETAILS_SUBMITTED'].includes(rDoc.returnStatus);
      if (!isApproved) {
        return err('Refund details can only be submitted after return request is approved.', 400);
      }

      if (rDoc.refundStatus === 'COMPLETED') {
        return err('Refund has already been completed for this return.', 400);
      }

      const body = await request.json().catch(() => ({}));
      const {
        method: refundMethod,
        upiId,
        confirmUpiId,
        accountHolderName,
        accountNumber,
        confirmAccountNumber,
        ifscCode,
        bankName
      } = body;

      if (!refundMethod || !['upi', 'bank_transfer'].includes(refundMethod)) {
        return err('Invalid refund method. Choose UPI or Bank Transfer.', 400);
      }

      const now = new Date();
      let refundDetailsData = {};

      if (refundMethod === 'upi') {
        const cleanUpi = (upiId || '').trim();
        const cleanConfirmUpi = (confirmUpiId || '').trim();

        if (!cleanUpi) {
          return err('UPI ID is required.', 400);
        }

        // UPI format validation: e.g. name@bank
        const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
        if (!upiRegex.test(cleanUpi)) {
          return err('Please enter a valid UPI ID (e.g. name@okhdfcbank or 9876543210@paytm).', 400);
        }

        if (cleanConfirmUpi && cleanConfirmUpi.toLowerCase() !== cleanUpi.toLowerCase()) {
          return err('UPI ID and Confirm UPI ID do not match.', 400);
        }

        refundDetailsData = {
          method: 'upi',
          upiId: cleanUpi,
          submittedAt: now
        };
      } else if (refundMethod === 'bank_transfer') {
        const cleanHolder = (accountHolderName || '').trim();
        const cleanAcc = (accountNumber || '').toString().trim();
        const cleanConfirmAcc = (confirmAccountNumber || '').toString().trim();
        const cleanIfsc = (ifscCode || '').trim().toUpperCase();
        const cleanBank = (bankName || '').trim();

        if (!cleanHolder || cleanHolder.length < 2) {
          return err('Account holder name is required.', 400);
        }

        if (!cleanAcc || !/^\d{9,18}$/.test(cleanAcc)) {
          return err('Enter a valid bank account number (9 to 18 digits).', 400);
        }

        if (cleanConfirmAcc && cleanConfirmAcc !== cleanAcc) {
          return err('Bank account number and confirmation do not match.', 400);
        }

        // IFSC code format: 4 letters, '0', 6 alphanumeric
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (!cleanIfsc || !ifscRegex.test(cleanIfsc)) {
          return err('Enter a valid 11-character IFSC code (e.g. HDFC0001234).', 400);
        }

        if (!cleanBank || cleanBank.length < 2) {
          return err('Bank name is required.', 400);
        }

        const last4 = cleanAcc.slice(-4);
        const accountNumberMasked = `XXXX XXXX ${last4}`;

        refundDetailsData = {
          method: 'bank_transfer',
          accountHolderName: cleanHolder,
          accountNumber: cleanAcc,
          accountNumberMasked,
          ifscCode: cleanIfsc,
          bankName: cleanBank,
          submittedAt: now
        };
      }

      await db.collection('returns').updateOne(
        { id: rDoc.id },
        {
          $set: {
            returnStatus: 'REFUND_DETAILS_SUBMITTED',
            refundDetailsStatus: 'SUBMITTED',
            refundDetails: refundDetailsData,
            refundDetailsSubmittedAt: now,
            updatedAt: now
          }
        }
      );

      await db.collection('orders').updateOne(
        { id: rDoc.orderId },
        {
          $set: {
            returnStatus: 'REFUND_DETAILS_SUBMITTED',
            updatedAt: now
          }
        }
      );

      await createAuditLog(db, {
        returnId: rDoc.id,
        orderId: rDoc.orderId,
        action: 'refund_details_submitted',
        performedBy: u.id,
        oldStatus: rDoc.returnStatus,
        newStatus: 'REFUND_DETAILS_SUBMITTED',
        metadata: {
          method: refundDetailsData.method,
          accountNumberMasked: refundDetailsData.accountNumberMasked || null,
          upiId: refundDetailsData.upiId || null
        }
      });

      const updatedReturn = await db.collection('returns').findOne({ id: rDoc.id });
      const clientReturn = clean(updatedReturn);
      if (clientReturn.refundDetails && u.role !== 'admin') {
        delete clientReturn.refundDetails.accountNumber;
      }

      return ok({
        message: 'Refund details submitted successfully. Your return will now proceed.',
        return: clientReturn
      });
    }

    if (route.startsWith('/returns/') && method === 'GET') {
      const u = await getCurrentUser(db, request);
      if (!u) return err('Not authenticated', 401);
      const id = route.split('/')[2];
      const rDoc = await db.collection('returns').findOne({ $or: [{ id }, { returnId: id }] });
      if (!rDoc) return err('Return request not found.', 404);
      if (rDoc.userId !== u.id && u.role !== 'admin') return err('Unauthorized access.', 403);
      const safeDoc = clean(rDoc);
      if (safeDoc.refundDetails && u.role !== 'admin') {
        const { accountNumber, ...safeRefund } = safeDoc.refundDetails;
        safeDoc.refundDetails = safeRefund;
      }
      return ok({ return: safeDoc });
    }

    // ============ PAYMENT WEBHOOK ============
    if (route === '/payment/razorpay/webhook' && method === 'POST') {
      try {
        const bodyText = await request.text();
        const signature = request.headers.get('x-razorpay-signature');
        const siteSettings = await db.collection('site_settings').findOne({ id: 'default' });
        const webhookSecret = (siteSettings?.paymentSettings?.razorpay?.webhookSecret && siteSettings.paymentSettings.razorpay.webhookSecret.trim()) || process.env.RAZORPAY_WEBHOOK_SECRET;

        if (webhookSecret && signature) {
          const expectedSig = crypto.createHmac('sha256', webhookSecret).update(bodyText).digest('hex');
          if (signature !== expectedSig) {
            return err('Invalid webhook signature.', 400);
          }
        }

        const event = JSON.parse(bodyText);

        // 1. Payment & Order Success Events
        if (event.event === 'payment.captured' || event.event === 'order.paid') {
          const paymentEntity = event?.payload?.payment?.entity;
          const orderEntity = event?.payload?.order?.entity;
          const rzpPaymentId = paymentEntity?.id;
          const rzpOrderId = paymentEntity?.order_id || orderEntity?.id;

          if (rzpPaymentId || rzpOrderId) {
            const query = {
              $or: [
                ...(rzpOrderId ? [{ razorpayOrderId: rzpOrderId }] : []),
                ...(rzpPaymentId ? [{ razorpayPaymentId: rzpPaymentId }] : [])
              ]
            };
            const orderDoc = await db.collection('orders').findOne(query);
            if (orderDoc) {
              await db.collection('orders').updateOne(
                { id: orderDoc.id },
                {
                  $set: {
                    paymentStatus: 'paid',
                    razorpayPaymentId: rzpPaymentId || orderDoc.razorpayPaymentId,
                    updatedAt: new Date()
                  }
                }
              );
            }
          }
        } else if (event.event === 'payment.failed') {
          const paymentEntity = event?.payload?.payment?.entity;
          const rzpOrderId = paymentEntity?.order_id;
          if (rzpOrderId) {
            const orderDoc = await db.collection('orders').findOne({ razorpayOrderId: rzpOrderId });
            if (orderDoc && orderDoc.paymentStatus !== 'paid') {
              await db.collection('orders').updateOne(
                { id: orderDoc.id },
                {
                  $set: {
                    paymentStatus: 'failed',
                    paymentFailureReason: paymentEntity?.error_description || 'Payment failed via gateway',
                    updatedAt: new Date()
                  }
                }
              );
            }
          }
        }

        // 2. Refund Events
        const payload = event?.payload?.refund?.entity;
        if (payload) {
          const gatewayRefundId = payload.id;
          const returnDoc = await db.collection('returns').findOne({
            $or: [{ gatewayRefundId }, { refundId: payload.receipt }]
          });

          if (returnDoc) {
            if (event.event === 'refund.processed') {
              const now = new Date();
              await db.collection('returns').updateOne(
                { id: returnDoc.id },
                {
                  $set: {
                    refundStatus: 'COMPLETED',
                    returnStatus: 'REFUNDED',
                    refundProcessedAt: now,
                    updatedAt: now
                  }
                }
              );
              const orderDoc = await db.collection('orders').findOne({ id: returnDoc.orderId });
              const userDoc = await db.collection('users').findOne({ id: returnDoc.userId });
              await createAuditLog(db, {
                returnId: returnDoc.id,
                orderId: returnDoc.orderId,
                action: 'refund_completed',
                performedBy: 'razorpay_webhook',
                oldStatus: returnDoc.refundStatus,
                newStatus: 'COMPLETED',
                metadata: { gatewayRefundId }
              });
              await sendRefundCompletedNotification({ returnReq: returnDoc, order: orderDoc, user: userDoc, db });
            } else if (event.event === 'refund.failed') {
              await db.collection('returns').updateOne(
                { id: returnDoc.id },
                {
                  $set: {
                    refundStatus: 'FAILED',
                    refundFailureReason: payload.error_description || 'Gateway refund failed',
                    updatedAt: new Date()
                  }
                }
              );
              await createAuditLog(db, {
                returnId: returnDoc.id,
                orderId: returnDoc.orderId,
                action: 'refund_failed',
                performedBy: 'razorpay_webhook',
                oldStatus: returnDoc.refundStatus,
                newStatus: 'FAILED',
                reason: payload.error_description || 'Gateway refund failed'
              });
            }
          }
        }
        return ok({ received: true });
      } catch (webhookErr) {
        console.error('Webhook error:', webhookErr);
        return err('Webhook processing error', 500);
      }
    }


    // ============ RAZORPAY PAYMENT GATEWAY ============
    if (route === '/payment/razorpay/order' && method === 'POST') {
      const body = await request.json();
      let orderAmount = Number(body.amount);

      const siteSettings = await db.collection('site_settings').findOne({ id: 'default' });
      const rzpConfig = siteSettings?.paymentSettings?.razorpay;
      if (rzpConfig && rzpConfig.enabled === false) {
        return err('Razorpay payment gateway is currently disabled by store administrator.', 400);
      }

      // If items are passed from checkout, enforce server-verified pricing
      if (Array.isArray(body.items) && body.items.length > 0) {
        const u = await getCurrentUser(db, request);
        const shippingConfig = {
          ...DEFAULT_SITE_SETTINGS.shipping,
          ...((siteSettings && siteSettings.shipping) || {})
        };
        const pricing = await calculateCartPricing({
          db,
          items: body.items,
          couponCode: body.coupon || null,
          giftWrap: !!body.giftWrap,
          shippingConfig,
          user: u
        });
        orderAmount = pricing.total;
      }

      if (!orderAmount || isNaN(orderAmount) || orderAmount <= 0) {
        return err('Valid order amount is required.', 400);
      }

      const keyId = (rzpConfig?.keyId && rzpConfig.keyId.trim())
        || process.env.RAZORPAY_KEY_ID
        || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
        || '';
      const keySecret = (rzpConfig?.keySecret && rzpConfig.keySecret.trim())
        || process.env.RAZORPAY_KEY_SECRET
        || '';

      const isRealKeys = keyId && keySecret && !keyId.includes('mock') && keyId.startsWith('rzp_');

      if (isRealKeys) {
        try {
          const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
          const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader
            },
            body: JSON.stringify({
              amount: Math.round(orderAmount * 100), // amount in paise
              currency: 'INR',
              receipt: `rcpt_${uuidv4().slice(0, 10)}`
            })
          });
          const rzpOrder = await rzpRes.json().catch(() => ({}));
          if (!rzpRes.ok) {
            return err(rzpOrder.error?.description || `Razorpay Order API error (status ${rzpRes.status})`, 400);
          }
          return ok({
            id: rzpOrder.id,
            amount: rzpOrder.amount,
            currency: rzpOrder.currency || 'INR',
            key: keyId,
            mock: false
          });
        } catch (apiErr) {
          console.error('Razorpay Orders API call error:', apiErr);
          return err('Failed to initiate payment with Razorpay.', 500);
        }
      }

      // Mock mode fallback when real credentials are not configured
      const id = 'order_MOCK' + Math.random().toString(36).slice(2, 12);
      return ok({
        id,
        amount: Math.round(orderAmount * 100),
        currency: 'INR',
        key: keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_mockkey',
        mock: true
      });
    }

    if (route === '/payment/razorpay/verify' && method === 'POST') {
      const b = await request.json();
      const siteSettings = await db.collection('site_settings').findOne({ id: 'default' });
      const rzpConfig = siteSettings?.paymentSettings?.razorpay;
      const keySecret = (rzpConfig?.keySecret && rzpConfig.keySecret.trim()) || process.env.RAZORPAY_KEY_SECRET || '';

      if (keySecret && b.razorpay_order_id && !b.razorpay_order_id.startsWith('order_MOCK') && b.razorpay_signature) {
        const generatedSignature = crypto
          .createHmac('sha256', keySecret)
          .update(`${b.razorpay_order_id}|${b.razorpay_payment_id}`)
          .digest('hex');

        if (generatedSignature !== b.razorpay_signature) {
          return err('Payment signature verification failed.', 400);
        }
        return ok({ verified: true, paymentId: b.razorpay_payment_id });
      }

      // Fallback / mock mode
      return ok({
        verified: true,
        paymentId: b.razorpay_payment_id || 'pay_MOCK' + Math.random().toString(36).slice(2, 12)
      });
    }

    // ============ AI CHAT (Gemini) ============
    if (route === '/ai/chat' && method === 'POST') {
      const { sessionId, message } = await request.json();
      if (!sessionId || !message) return err('sessionId and message are required.');
      if (!process.env.GEMINI_API_KEY) return err('AI is not configured on the server.', 500);

      // Load session or create
      let chat = await db.collection('chat_sessions').findOne({ sessionId });
      if (!chat) {
        chat = { sessionId, userId: (await getCurrentUser(db, request))?.id || null, messages: [], createdAt: new Date() };
        await db.collection('chat_sessions').insertOne(chat);
      }

      // Build context: fetch products for grounding (limit for token budget)
      const productSample = await db.collection('products').find({}, { projection: { _id: 0, name: 1, slug: 1, category: 1, collection: 1, price: 1, mrp: 1, metal: 1, purity: 1, stone: 1, weight: 1, stock: 1, description: 1 } }).limit(20).toArray();
      const catalogSummary = productSample.map(p => `- ${p.name} (${p.category}, ${p.metal || '\u2014'}, ${p.purity || '\u2014'}, ${p.stone || 'no stone'}, ${p.weight || '\u2014'}) \u2014 \u20b9${p.price?.toLocaleString('en-IN')} \u00b7 /product/${p.slug}`).join('\n');

      const SYSTEM = `You are MikuMantra, a warm, knowledgeable AI concierge for a luxury Indian jewellery house (22K gold, diamond, bridal, daily-wear, men's pieces). Speak with the poise of a Tiffany or Cartier stylist — elegant, concise, never pushy. You help customers with:\n• Product discovery & personalised recommendations (link products using the /product/<slug> paths given below)\n• Jewellery care (cleaning gold, storing diamonds, avoiding tarnish)\n• Sizing (ring, bangle, chain length) with practical measuring tips\n• Gifting occasions (bridal, anniversary, festival, birthday) with budget guidance\n• Metal purity (22K vs 18K), diamond 4Cs, hallmark meaning\nAlways refer to the CURRENT CATALOG below when suggesting products. Use ₹ for prices. Keep replies short (2–4 short paragraphs) with occasional tasteful bullet points. If a user's need is off-topic, gently steer back to jewellery. Never invent SKUs or prices not in the catalog. If unsure, say so and offer to book a personal appointment via the atelier concierge.\n\nCURRENT CATALOG (sample):\n${catalogSummary}\n\nMikuMantra offers: BIS Hallmark, SGL/GIA certification, complimentary shipping on eligible orders, 15-day returns, lifetime buyback.`;

      // Reconstruct Gemini history (only user/model messages, not the system)
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const history = chat.messages.slice(-12).map(m => ({ role: m.role, parts: [{ text: m.content }] }));

      let reply = '';
      try {
        const chatModel = ai.chats.create({ model: 'gemini-2.5-flash', history, config: { systemInstruction: SYSTEM } });
        const resp = await chatModel.sendMessage({ message });
        reply = resp.text || '';
      } catch (gerr) {
        console.error('Gemini error:', gerr);
        return err('The concierge is briefly unavailable. Please try again in a moment.', 502);
      }
      if (!reply) return err('Empty response from AI. Please rephrase your question.', 502);

      // Persist both messages
      const now = new Date();
      await db.collection('chat_sessions').updateOne({ sessionId }, { $push: { messages: { $each: [{ role: 'user', content: message, at: now }, { role: 'model', content: reply, at: new Date() }] } } });
      return ok({ sessionId, reply });
    }

    // ============ SETTINGS ============
    if (route === '/settings/customer-reviews' && method === 'GET') {
      const siteDoc = await db.collection('site_settings').findOne({ id: 'default' });
      const enabled = siteDoc?.customerReviewsEnabled ?? true;
      return ok({ enabled, customerReviewsEnabled: enabled });
    }

    // ============ REVIEWS ============
    if (route === '/reviews/eligibility' && method === 'GET') {
      const u = await getCurrentUser(db, request);
      if (!u) return ok({ eligible: false, reason: 'NOT_LOGGED_IN' });
      const siteDoc = await db.collection('site_settings').findOne({ id: 'default' });
      const customerReviewsEnabled = siteDoc?.customerReviewsEnabled ?? true;
      if (!customerReviewsEnabled) return ok({ eligible: false, reason: 'REVIEWS_DISABLED', customerReviewsEnabled: false });

      const productId = q.get('productId');
      if (!productId) return ok({ eligible: false, reason: 'MISSING_PRODUCT_ID' });

      const prod = await db.collection('products').findOne({
        $or: [{ id: productId }, { slug: productId }, { name: productId }]
      });
      const targetIds = [productId, prod?.id, prod?.slug].filter(Boolean);

      const specificOrderId = q.get('orderId') || q.get('orderNumber');
      let eligibleOrder = null;
      let eligibleItem = null;

      if (specificOrderId) {
        const ord = await db.collection('orders').findOne({
          $or: [{ id: specificOrderId }, { orderNumber: specificOrderId }]
        });
        if (ord) {
          const isOwner = ord.userId === u.id ||
            (u.email && ord.customerEmail && ord.customerEmail.toLowerCase() === u.email.toLowerCase()) ||
            (u.email && ord.customer?.email && ord.customer.email.toLowerCase() === u.email.toLowerCase()) ||
            u.role === 'admin';
          const isDelivered = String(ord.status || '').toLowerCase() === 'delivered' || u.role === 'admin';
          if (isOwner && isDelivered) {
            eligibleOrder = ord;
            eligibleItem = ord.items?.find(it =>
              targetIds.includes(it.id) ||
              targetIds.includes(it.slug) ||
              targetIds.includes(it.productId) ||
              (prod && it.name && it.name.toLowerCase() === prod.name.toLowerCase())
            ) || ord.items?.[0];
          }
        }
      }

      if (!eligibleOrder) {
        const userDeliveredQuery = {
          $or: [
            { userId: u.id },
            ...(u.email ? [{ customerEmail: { $regex: new RegExp(`^${u.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }] : []),
            ...(u.email ? [{ 'customer.email': { $regex: new RegExp(`^${u.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }] : [])
          ],
          status: { $regex: /^delivered$/i }
        };

        const deliveredOrders = await db.collection('orders').find(userDeliveredQuery).sort({ placedAt: -1, createdAt: -1 }).toArray();

        if ((!deliveredOrders || deliveredOrders.length === 0) && u.role !== 'admin') {
          return ok({ eligible: false, reason: 'NO_DELIVERED_ORDER' });
        }

        const existingReviews = await db.collection('reviews').find({
          userId: u.id,
          $or: [
            { productId: { $in: targetIds } },
            { productSlug: { $in: targetIds } }
          ]
        }).toArray();

        const reviewedOrderIds = new Set(existingReviews.map(r => r.orderId || r.orderNumber).filter(Boolean));

        for (const ord of deliveredOrders) {
          if (!reviewedOrderIds.has(ord.id) && !reviewedOrderIds.has(ord.orderNumber)) {
            const item = ord.items?.find(it =>
              targetIds.includes(it.id) ||
              targetIds.includes(it.slug) ||
              targetIds.includes(it.productId) ||
              (prod && it.name && it.name.toLowerCase() === prod.name.toLowerCase())
            );
            if (item) {
              eligibleOrder = ord;
              eligibleItem = item;
              break;
            }
          }
        }

        if (!eligibleOrder && u.role === 'admin') {
          return ok({ eligible: true, orderId: 'admin', orderItemId: prod?.id || productId, customerReviewsEnabled });
        }
      }

      if (!eligibleOrder || !eligibleItem) {
        return ok({ eligible: false, reason: 'ALREADY_REVIEWED' });
      }

      return ok({
        eligible: true,
        orderId: eligibleOrder.id,
        orderNumber: eligibleOrder.orderNumber,
        orderItemId: eligibleItem.id,
        customerReviewsEnabled
      });
    }

    if (route === '/reviews' && method === 'POST') {
      const u = await getCurrentUser(db, request);
      if (!u) return err('Sign in to submit a review', 401);

      const siteDoc = await db.collection('site_settings').findOne({ id: 'default' });
      const customerReviewsEnabled = siteDoc?.customerReviewsEnabled ?? true;
      if (!customerReviewsEnabled) {
        return handleCORS(NextResponse.json({
          success: false,
          error: 'Customer reviews are currently disabled.',
          message: 'Customer reviews are currently disabled.'
        }, { status: 403 }));
      }

      const b = await request.json();
      if (!b.productId) return err('Product ID is required', 400);

      const prod = await db.collection('products').findOne({
        $or: [{ id: b.productId }, { slug: b.productId }, { name: b.productId }]
      });
      const targetIds = [b.productId, prod?.id, prod?.slug].filter(Boolean);

      // 1. Try to find the specific order if orderId or orderNumber was passed
      const targetOrderId = b.orderId || b.orderNumber;
      let matchedOrder = null;

      if (targetOrderId) {
        matchedOrder = await db.collection('orders').findOne({
          $or: [
            { id: targetOrderId },
            { orderNumber: targetOrderId }
          ]
        });

        if (matchedOrder) {
          const isOwner = matchedOrder.userId === u.id ||
            (u.email && matchedOrder.customerEmail && matchedOrder.customerEmail.toLowerCase() === u.email.toLowerCase()) ||
            (u.email && matchedOrder.customer?.email && matchedOrder.customer.email.toLowerCase() === u.email.toLowerCase()) ||
            (u.email && matchedOrder.address?.email && matchedOrder.address.email.toLowerCase() === u.email.toLowerCase());

          const isDelivered = String(matchedOrder.status || '').toLowerCase() === 'delivered' ||
            (Array.isArray(matchedOrder.statusHistory) && matchedOrder.statusHistory.some(h => String(h.status).toLowerCase() === 'delivered'));

          if (!isOwner && u.role !== 'admin') {
            matchedOrder = null; // Unauthorized for this specific order
          } else if (!isDelivered && u.role !== 'admin') {
            return err('Reviews can only be submitted for delivered orders.', 403);
          }
        }
      }

      // 2. If matchedOrder is not set yet, find any delivered order for this user containing the product
      if (!matchedOrder) {
        const userDeliveredQuery = {
          $or: [
            { userId: u.id },
            ...(u.email ? [{ customerEmail: { $regex: new RegExp(`^${u.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }] : []),
            ...(u.email ? [{ 'customer.email': { $regex: new RegExp(`^${u.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }] : [])
          ],
          status: { $regex: /^delivered$/i }
        };

        const deliveredOrders = await db.collection('orders').find(userDeliveredQuery).sort({ placedAt: -1, createdAt: -1 }).toArray();

        // Search for an order containing this item
        for (const ord of deliveredOrders) {
          const hasItem = ord.items?.some(it =>
            targetIds.includes(it.id) ||
            targetIds.includes(it.slug) ||
            targetIds.includes(it.productId) ||
            (prod && it.name && it.name.toLowerCase() === prod.name.toLowerCase())
          );
          if (hasItem) {
            matchedOrder = ord;
            break;
          }
        }

        // If targetOrderId was given and matches one of user's delivered orders, accept it
        if (!matchedOrder && targetOrderId && deliveredOrders.length > 0) {
          matchedOrder = deliveredOrders.find(o => o.id === targetOrderId || o.orderNumber === targetOrderId);
        }

        // If user is admin and still no order found, allow review without order
        if (!matchedOrder && u.role === 'admin') {
          matchedOrder = null; // Admin curated review
        } else if (!matchedOrder) {
          return err('You can only review products from delivered orders', 403);
        }
      }

      // 3. Resolve target item inside order (if order exists)
      const targetItem = matchedOrder?.items?.find(it =>
        targetIds.includes(it.id) ||
        targetIds.includes(it.slug) ||
        targetIds.includes(it.productId) ||
        (prod && it.name && it.name.toLowerCase() === prod.name.toLowerCase())
      ) || matchedOrder?.items?.[0];

      // 4. Duplicate review prevention (per order + product)
      const duplicateQuery = {
        userId: u.id,
        $or: [
          { productId: { $in: targetIds } },
          { productSlug: { $in: targetIds } }
        ]
      };
      if (matchedOrder) {
        duplicateQuery.$and = [{
          $or: [
            { orderId: matchedOrder.id },
            { orderNumber: matchedOrder.orderNumber }
          ].filter(Boolean)
        }];
      }
      const existingReview = await db.collection('reviews').findOne(duplicateQuery);

      if (existingReview) {
        return err('You have already submitted a review for this delivered item. You can edit your review anytime.', 400);
      }

      const ratingVal = Math.min(5, Math.max(1, Number(b.rating) || 5));
      const r = {
        id: uuidv4(),
        productId: prod?.id || targetItem?.productId || targetItem?.id || b.productId,
        productSlug: prod?.slug || targetItem?.slug || b.productSlug || b.productId,
        productName: targetItem?.name || prod?.name || b.productName || 'Fine Jewellery Piece',
        productImage: targetItem?.image || prod?.images?.[0] || b.productImage || '',
        userId: u.id,
        reviewerName: u.name || matchedOrder?.address?.fullName || matchedOrder?.customer?.name || 'Verified Customer',
        reviewerEmail: u.email || matchedOrder?.customerEmail || '',
        orderId: matchedOrder?.id || '',
        orderNumber: matchedOrder?.orderNumber || '',
        rating: ratingVal,
        title: (b.title || '').trim().slice(0, 150),
        comment: (b.comment || '').trim().slice(0, 1000),
        images: b.image ? [b.image] : (Array.isArray(b.images) ? b.images : []),
        status: 'published',
        verifiedPurchase: Boolean(matchedOrder || u.role === 'admin'),
        approved: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('reviews').insertOne(r);
      await recalculateProductRating(db, r.productId);

      return ok({ review: clean(r) });
    }

    if ((route === '/reviews/mine' || route === '/reviews/user') && method === 'GET') {
      const u = await getCurrentUser(db, request);
      if (!u) return err('Sign in to view your reviews', 401);
      const list = await db.collection('reviews').find({ userId: u.id }).sort({ createdAt: -1 }).toArray();
      return ok({ reviews: list.map(clean) });
    }

    if (route.startsWith('/reviews/') && !route.startsWith('/reviews/product/') && method === 'PUT') {
      const u = await getCurrentUser(db, request);
      if (!u) return err('Not authenticated', 401);
      const id = route.split('/')[2];
      const r = await db.collection('reviews').findOne({ id });
      if (!r) return err('Review not found', 404);
      if (r.userId !== u.id && u.role !== 'admin') {
        return err('Unauthorized to edit this review', 403);
      }

      const b = await request.json().catch(() => ({}));
      const updateData = { updatedAt: new Date() };

      if (b.rating !== undefined) updateData.rating = Math.min(5, Math.max(1, Number(b.rating) || 5));
      if (b.title !== undefined) updateData.title = (b.title || '').trim().slice(0, 150);
      if (b.comment !== undefined) updateData.comment = (b.comment || '').trim().slice(0, 1000);
      if (b.image !== undefined) updateData.images = b.image ? [b.image] : [];
      if (b.images !== undefined) updateData.images = Array.isArray(b.images) ? b.images : (b.images ? [b.images] : []);

      await db.collection('reviews').updateOne({ id }, { $set: updateData });
      const updated = await db.collection('reviews').findOne({ id });
      if (r.productId) {
        await recalculateProductRating(db, r.productId);
      }
      return ok({ review: clean(updated) });
    }

    if (route.startsWith('/reviews/') && !route.startsWith('/reviews/product/') && method === 'DELETE') {
      const u = await getCurrentUser(db, request);
      if (!u) return err('Not authenticated', 401);
      const id = route.split('/')[2];
      const r = await db.collection('reviews').findOne({ id });
      if (!r) return err('Review not found', 404);
      if (r.userId !== u.id && u.role !== 'admin') {
        return err('Unauthorized to delete this review', 403);
      }

      await db.collection('reviews').deleteOne({ id });
      if (r.productId) {
        await recalculateProductRating(db, r.productId);
      }
      return ok({ ok: true, success: true });
    }

    if (route.startsWith('/reviews/product/') && method === 'GET') {
      const pid = route.split('/')[3];
      const prod = await db.collection('products').findOne({ $or: [{ id: pid }, { slug: pid }] });
      const targetIds = [pid, prod?.id, prod?.slug].filter(Boolean);

      const siteDoc = await db.collection('site_settings').findOne({ id: 'default' });
      const customerReviewsEnabled = siteDoc?.customerReviewsEnabled ?? true;

      const list = await db.collection('reviews').find({
        productId: { $in: targetIds },
        $or: [{ status: 'published' }, { status: { $exists: false }, approved: true }]
      }).sort({ createdAt: -1 }).toArray();

      const totalReviews = list.length;
      let averageRating = 0;
      const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

      if (totalReviews > 0) {
        const sum = list.reduce((acc, r) => {
          const ratingVal = Math.min(5, Math.max(1, Number(r.rating) || 5));
          breakdown[ratingVal] = (breakdown[ratingVal] || 0) + 1;
          return acc + ratingVal;
        }, 0);
        averageRating = Math.round((sum / totalReviews) * 10) / 10;
      }

      return ok({
        reviews: list.map(clean),
        averageRating,
        totalReviews,
        breakdown,
        customerReviewsEnabled
      });
    }
    // ============ HEADER CONFIGURATION ============
    if (route.startsWith('/header')) {
      if (route === '/header' && method === 'GET') {
        const cacheKey = 'header_config';
        let header = cacheGet(cacheKey);
        if (!header) {
          header = await db.collection('header').findOne({ id: 'default' });
          if (!header) {
            await seedIfEmpty(db);
            header = await db.collection('header').findOne({ id: 'default' });
          }
          cacheSet(cacheKey, header, 300000);
        }
        return ok(clean(header));
      }

      // Admin access validation
      const admin = await requireAdmin(db);
      if (!admin) return err('Admin access required', 403);

      _cache.delete('header_config'); // Bust cache

      const header = await db.collection('header').findOne({ id: 'default' });
      if (!header) return err('Header configuration not found', 404);

      const parts = route.split('/');
      // PUT /api/header
      if (parts.length === 2 && method === 'PUT') {
        const body = await request.json();
        const { id, _id, ...updates } = body;
        await db.collection('header').updateOne({ id: 'default' }, { $set: updates });

        // Synchronize logo across site_settings and footer if updated
        if (updates.logo && updates.logo.image) {
          await db.collection('site_settings').updateOne(
            { id: 'default' },
            { $set: { logo: updates.logo.image, updatedAt: new Date() } },
            { upsert: true }
          );
          await db.collection('footer').updateOne(
            { id: 'default' },
            { $set: { 'company.logo': updates.logo.image, updatedAt: new Date() } },
            { upsert: true }
          );
          _cache.delete('site_settings');
          _cache.delete('footer');
          _cache.delete('homepage_data');
          invalidateSiteDataCache();
          try { revalidatePath('/', 'layout'); } catch (e) {}
        }

        const updated = await db.collection('header').findOne({ id: 'default' });
        return ok(clean(updated));
      }

      // POST /api/header/navigation
      if (parts.length === 3 && parts[2] === 'navigation' && method === 'POST') {
        const body = await request.json();
        const newNav = {
          id: uuidv4(),
          label: body.label || 'New Link',
          url: body.url || '#',
          hasDropdown: !!body.hasDropdown,
          dropdownType: body.dropdownType || 'mega-menu',
          isActive: body.isActive !== false,
          order: parseInt(body.order || (header.navigation?.length || 0) + 1),
          dropdown: body.hasDropdown ? { sections: [], featured: { image: '', title: '', url: '', alt: '', isActive: false } } : null
        };
        await db.collection('header').updateOne({ id: 'default' }, { $push: { navigation: newNav } });
        return ok({ item: newNav });
      }

      // PUT/DELETE /api/header/navigation/:id
      if (parts.length === 4 && parts[2] === 'navigation') {
        const navId = parts[3];
        if (method === 'PUT') {
          const body = await request.json();
          const updatedNavs = (header.navigation || []).map(n => {
            if (n.id === navId) {
              const updatedDropdown = body.hasDropdown
                ? (n.dropdown || { sections: [], featured: { image: '', title: '', url: '', alt: '', isActive: false } })
                : null;
              if (updatedDropdown && body.dropdown?.featured) {
                updatedDropdown.featured = { ...updatedDropdown.featured, ...body.dropdown.featured };
              }
              return {
                ...n,
                label: body.label !== undefined ? body.label : n.label,
                url: body.url !== undefined ? body.url : n.url,
                hasDropdown: body.hasDropdown !== undefined ? !!body.hasDropdown : n.hasDropdown,
                dropdownType: body.dropdownType !== undefined ? body.dropdownType : n.dropdownType,
                isActive: body.isActive !== undefined ? !!body.isActive : n.isActive,
                order: body.order !== undefined ? parseInt(body.order) : n.order,
                dropdown: updatedDropdown
              };
            }
            return n;
          });
          await db.collection('header').updateOne({ id: 'default' }, { $set: { navigation: updatedNavs } });
          return ok({ ok: true });
        }
        if (method === 'DELETE') {
          const updatedNavs = (header.navigation || []).filter(n => n.id !== navId);
          await db.collection('header').updateOne({ id: 'default' }, { $set: { navigation: updatedNavs } });
          return ok({ ok: true });
        }
      }

      // POST /api/header/navigation/:navigationId/sections
      if (parts.length === 5 && parts[2] === 'navigation' && parts[4] === 'sections' && method === 'POST') {
        const navId = parts[3];
        const body = await request.json();
        const newSec = {
          id: uuidv4(),
          title: body.title || 'New Section',
          order: parseInt(body.order || 1),
          items: []
        };
        const updatedNavs = (header.navigation || []).map(n => {
          if (n.id === navId) {
            const dropdown = n.dropdown || { sections: [], featured: { image: '', title: '', url: '', alt: '', isActive: false } };
            dropdown.sections = dropdown.sections || [];
            dropdown.sections.push(newSec);
            return { ...n, dropdown };
          }
          return n;
        });
        await db.collection('header').updateOne({ id: 'default' }, { $set: { navigation: updatedNavs } });
        return ok({ item: newSec });
      }

      // PUT/DELETE /api/header/navigation/:navigationId/sections/:sectionId
      if (parts.length === 6 && parts[2] === 'navigation' && parts[4] === 'sections') {
        const navId = parts[3];
        const sectionId = parts[5];
        if (method === 'PUT') {
          const body = await request.json();
          const updatedNavs = (header.navigation || []).map(n => {
            if (n.id === navId && n.dropdown?.sections) {
              const sections = n.dropdown.sections.map(s => {
                if (s.id === sectionId) {
                  return {
                    ...s,
                    title: body.title !== undefined ? body.title : s.title,
                    order: body.order !== undefined ? parseInt(body.order) : s.order
                  };
                }
                return s;
              });
              return { ...n, dropdown: { ...n.dropdown, sections } };
            }
            return n;
          });
          await db.collection('header').updateOne({ id: 'default' }, { $set: { navigation: updatedNavs } });
          return ok({ ok: true });
        }
        if (method === 'DELETE') {
          const updatedNavs = (header.navigation || []).map(n => {
            if (n.id === navId && n.dropdown?.sections) {
              const sections = n.dropdown.sections.filter(s => s.id !== sectionId);
              return { ...n, dropdown: { ...n.dropdown, sections } };
            }
            return n;
          });
          await db.collection('header').updateOne({ id: 'default' }, { $set: { navigation: updatedNavs } });
          return ok({ ok: true });
        }
      }

      // POST /api/header/navigation/:navigationId/sections/:sectionId/items
      if (parts.length === 7 && parts[2] === 'navigation' && parts[4] === 'sections' && parts[6] === 'items' && method === 'POST') {
        const navId = parts[3];
        const sectionId = parts[5];
        const body = await request.json();
        const newItem = {
          id: uuidv4(),
          label: body.label || 'New Item',
          url: body.url || '#',
          isActive: body.isActive !== false,
          order: parseInt(body.order || 1)
        };
        const updatedNavs = (header.navigation || []).map(n => {
          if (n.id === navId && n.dropdown?.sections) {
            const sections = n.dropdown.sections.map(s => {
              if (s.id === sectionId) {
                const items = s.items || [];
                items.push(newItem);
                return { ...s, items };
              }
              return s;
            });
            return { ...n, dropdown: { ...n.dropdown, sections } };
          }
          return n;
        });
        await db.collection('header').updateOne({ id: 'default' }, { $set: { navigation: updatedNavs } });
        return ok({ item: newItem });
      }

      // PUT/DELETE /api/header/navigation/:navigationId/sections/:sectionId/items/:itemId
      if (parts.length === 8 && parts[2] === 'navigation' && parts[4] === 'sections' && parts[6] === 'items') {
        const navId = parts[3];
        const sectionId = parts[5];
        const itemId = parts[7];
        if (method === 'PUT') {
          const body = await request.json();
          const updatedNavs = (header.navigation || []).map(n => {
            if (n.id === navId && n.dropdown?.sections) {
              const sections = n.dropdown.sections.map(s => {
                if (s.id === sectionId && s.items) {
                  const items = s.items.map(it => {
                    if (it.id === itemId) {
                      return {
                        ...it,
                        label: body.label !== undefined ? body.label : it.label,
                        url: body.url !== undefined ? body.url : it.url,
                        isActive: body.isActive !== undefined ? !!body.isActive : it.isActive,
                        order: body.order !== undefined ? parseInt(body.order) : it.order
                      };
                    }
                    return it;
                  });
                  return { ...s, items };
                }
                return s;
              });
              return { ...n, dropdown: { ...n.dropdown, sections } };
            }
            return n;
          });
          await db.collection('header').updateOne({ id: 'default' }, { $set: { navigation: updatedNavs } });
          return ok({ ok: true });
        }
        if (method === 'DELETE') {
          const updatedNavs = (header.navigation || []).map(n => {
            if (n.id === navId && n.dropdown?.sections) {
              const sections = n.dropdown.sections.map(s => {
                if (s.id === sectionId && s.items) {
                  const items = s.items.filter(it => it.id !== itemId);
                  return { ...s, items };
                }
                return s;
              });
              return { ...n, dropdown: { ...n.dropdown, sections } };
            }
            return n;
          });
          await db.collection('header').updateOne({ id: 'default' }, { $set: { navigation: updatedNavs } });
          return ok({ ok: true });
        }
      }

      return err('Invalid header subroute or method', 404);
    }

    // ============ PUBLIC NEWSLETTER SETTINGS ============
    if ((route === '/newsletter/settings' || route === '/api/newsletter/settings') && method === 'GET') {
      try {
        const cached = cacheGet('newsletter_settings_public');
        if (cached) return ok(cached);
        const settings = await getNewsletterSettings(db);
        cacheSet('newsletter_settings_public', settings, 30000);
        return ok(settings);
      } catch (err) {
        console.error('Public newsletter settings error:', err);
        return ok({});
      }
    }

    // ============ PUBLIC NEWSLETTER SUBSCRIBE ============
    if ((route === '/newsletter/subscribe' || route === '/api/newsletter/subscribe' || route === '/newsletter') && method === 'POST') {
      try {
        const body = await request.json().catch(() => ({}));
        const result = await subscribeCustomer(db, { email: body.email, source: body.source });
        return NextResponse.json(result, { status: result.statusCode || 200 });
      } catch (err) {
        console.error('Public newsletter subscribe error:', err);
        return NextResponse.json({ success: false, message: 'An error occurred while subscribing. Please try again.' }, { status: 500 });
      }
    }

    // ============ PUBLIC NEWSLETTER UNSUBSCRIBE ============
    if ((route === '/newsletter/unsubscribe' || route === '/api/newsletter/unsubscribe') && (method === 'GET' || method === 'POST')) {
      try {
        const body = method === 'POST' ? await request.json().catch(() => ({})) : {};
        const token = q.get('token') || body.token || '';
        const email = q.get('email') || body.email || '';
        const result = await processUnsubscribeToken(db, { token, email });
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      } catch (err) {
        console.error('Public unsubscribe error:', err);
        return NextResponse.json({ success: false, message: 'An error occurred while unsubscribing.' }, { status: 500 });
      }
    }

    // ============ EMAIL / NEWSLETTER INFRASTRUCTURE HEALTH STATUS ============
    if ((route === '/admin/newsletter/health' || route === '/newsletter/health' || route === '/api/admin/newsletter/health') && method === 'GET') {
      try {
        const health = await checkEmailProviderStatus(db);
        return ok(health);
      } catch (e) {
        return ok({ isConfigured: false, provider: 'Error', error: e.message });
      }
    }

    // ============ ADMIN ============
    if (route.startsWith('/admin/')) {
      const admin = await requireAdmin(db, request)
      if (!admin) return err('Admin access required', 403)
      const sub = route.slice(7) // remove /admin/
      // On writes, bust caches
      if (method !== 'GET' && method !== 'OPTIONS') {
        cacheBust('products:');
        cacheBust('admin_');
        _cache.delete('cats');
        _cache.delete('cols');
        _cache.delete('bans');
        _cache.delete('footer');
        _cache.delete('product_filters');
        _cache.delete('site_settings');
        _cache.delete('coupon_settings');
        _cache.delete('header_config');
        _cache.delete('admin_dashboard');
        _cache.delete('social_media_public');
        _cache.delete('newsletter_settings_public');
        cacheBust('social_media');
        cacheBust('coupons');
        invalidateUserSessionCache();
        try { invalidateSiteDataCache(); } catch (e) {}
      }

      // ============ ADMIN NEWSLETTER HEALTH CHECK ============
      if (sub === 'newsletter/health' && method === 'GET') {
        const health = await checkEmailProviderStatus(db);
        return ok(health);
      }

      // ============ ADMIN NEWSLETTER SETTINGS ============
      if (sub === 'newsletter/settings') {
        if (method === 'GET') {
          if (!hasPermission(admin, 'settings.view') && !hasPermission(admin, 'customers.view')) {
            return err('Permission denied', 403);
          }
          const settings = await getNewsletterSettings(db);
          return ok(settings);
        }
        if (method === 'PUT' || method === 'POST') {
          if (!hasPermission(admin, 'settings.edit')) {
            return err('Permission denied: settings.edit required', 403);
          }
          const body = await request.json().catch(() => ({}));
          const updated = await updateNewsletterSettings(db, body);
          _cache.delete('newsletter_settings_public');
          try { revalidatePath('/', 'layout'); } catch (e) {}

          await logAdminActivity(db, {
            admin,
            action: 'NEWSLETTER_SETTINGS_UPDATED',
            module: 'MARKETING',
            targetId: 'default',
            targetName: 'Newsletter Settings',
            metadata: { isEnabled: updated.isEnabled },
            request
          });

          return ok({ success: true, message: 'Newsletter settings saved successfully.', settings: updated });
        }
      }

      // ============ ADMIN NEWSLETTER TEMPLATES ============
      if (sub === 'newsletter/templates') {
        if (method === 'GET') {
          const template = await getWelcomeTemplate(db);
          return ok(template);
        }
        if (method === 'PUT' || method === 'POST') {
          if (!hasPermission(admin, 'settings.edit')) return err('Permission denied', 403);
          const body = await request.json().catch(() => ({}));
          const updated = await updateWelcomeTemplate(db, body);
          return ok({ success: true, message: 'Welcome email template saved successfully.', template: updated });
        }
      }

      // ============ ADMIN NEWSLETTER BULK ACTIONS ============
      if (sub === 'newsletter/bulk' && method === 'POST') {
        if (!hasPermission(admin, 'customers.edit')) return err('Permission denied', 403);
        const body = await request.json().catch(() => ({}));
        const result = await handleBulkSubscriberAction(db, body);
        return ok(result);
      }

      // ============ ADMIN NEWSLETTER CAMPAIGNS ============
      if (sub === 'newsletter/campaigns') {
        if (method === 'GET') {
          const campaigns = await getCampaigns(db);
          return ok({ success: true, campaigns });
        }
        if (method === 'POST') {
          if (!hasPermission(admin, 'settings.edit')) return err('Permission denied', 403);
          const body = await request.json().catch(() => ({}));
          const created = await createCampaign(db, body);
          await logAdminActivity(db, {
            admin,
            action: 'NEWSLETTER_CAMPAIGN_CREATED',
            module: 'MARKETING',
            targetId: created.id,
            targetName: created.name,
            metadata: { status: created.status },
            request
          });
          return ok({ success: true, campaign: created });
        }
      }

      if (sub.startsWith('newsletter/campaigns/')) {
        const remaining = sub.replace('newsletter/campaigns/', '');
        const parts = remaining.split('/');
        const campaignId = parts[0];
        const action = parts[1]; // test, send, cancel, logs, undefined

        if (action === 'test' && method === 'POST') {
          if (!hasPermission(admin, 'settings.edit')) return err('Permission denied', 403);
          const body = await request.json().catch(() => ({}));
          const testEmail = (body.toEmail || body.email || admin.email || '').trim();
          if (!testEmail) return err('Test recipient email address is required.', 400);

          const campaign = await getCampaignById(db, campaignId) || body;
          const template = await getWelcomeTemplate(db);
          const result = await sendTestCampaignEmail({ toEmail: testEmail, campaign, template });

          await logAdminActivity(db, {
            admin,
            action: 'NEWSLETTER_TEST_EMAIL_SENT',
            module: 'MARKETING',
            targetId: campaignId,
            targetName: campaign?.name || 'Test Email',
            metadata: { recipient: testEmail, success: result.success },
            request
          });

          if (!result.success) {
            return err(result.message || result.error || 'Failed to send test email.', 400);
          }
          return ok({ success: true, message: `Test email successfully sent to ${testEmail}.` });
        }

        if (action === 'send' && method === 'POST') {
          if (!hasPermission(admin, 'settings.edit')) return err('Permission denied', 403);
          const result = await executeCampaignSend(db, campaignId, admin);

          await logAdminActivity(db, {
            admin,
            action: 'NEWSLETTER_CAMPAIGN_SENT',
            module: 'MARKETING',
            targetId: campaignId,
            targetName: 'Campaign Broadcast',
            metadata: result.stats || {},
            request
          });

          if (!result.success) {
            return err(result.message, result.statusCode || 400);
          }
          return ok(result);
        }

        if (action === 'cancel' && method === 'POST') {
          if (!hasPermission(admin, 'settings.edit')) return err('Permission denied', 403);
          const result = await cancelCampaign(db, campaignId);
          await logAdminActivity(db, {
            admin,
            action: 'NEWSLETTER_CAMPAIGN_CANCELLED',
            module: 'MARKETING',
            targetId: campaignId,
            targetName: 'Campaign Broadcast',
            request
          });
          return ok(result);
        }

        if (action === 'logs' && method === 'GET') {
          const logs = await getCampaignLogs(db, campaignId);
          return ok({ success: true, logs });
        }

        if (!action && (method === 'PUT' || method === 'PATCH')) {
          if (!hasPermission(admin, 'settings.edit')) return err('Permission denied', 403);
          const body = await request.json().catch(() => ({}));
          const updated = await updateCampaign(db, campaignId, body);
          return ok({ success: true, campaign: updated });
        }

        if (!action && method === 'DELETE') {
          if (!hasPermission(admin, 'settings.edit')) return err('Permission denied', 403);
          await deleteCampaign(db, campaignId);
          await logAdminActivity(db, {
            admin,
            action: 'NEWSLETTER_CAMPAIGN_DELETED',
            module: 'MARKETING',
            targetId: campaignId,
            targetName: 'Campaign Draft',
            request
          });
          return ok({ success: true, message: 'Campaign deleted successfully.' });
        }
      }

      // ============ ADMIN NEWSLETTER ANALYTICS ============
      if (sub === 'newsletter/analytics' && method === 'GET') {
        const analytics = await getAnalytics(db);
        return ok({ success: true, analytics });
      }

      // ============ ADMIN NEWSLETTER SUBSCRIBERS EXPORT ============
      if (sub === 'newsletter/export') {
        if (method === 'GET') {
          if (!hasPermission(admin, 'customers.view') && !hasPermission(admin, 'reports.export') && !hasPermission(admin, 'settings.view')) {
            return err('Permission denied', 403);
          }
          const search = (q.get('search') || '').trim();
          const status = q.get('status') || 'ALL';
          const idsParam = q.get('ids');
          const ids = idsParam ? idsParam.split(',').filter(Boolean) : [];
          const csvData = await exportSubscribersCSV(db, { search, status, ids });
          return new NextResponse(csvData, {
            status: 200,
            headers: {
              'Content-Type': 'text/csv; charset=utf-8',
              'Content-Disposition': `attachment; filename="newsletter_subscribers_${Date.now()}.csv"`
            }
          });
        }
      }

      // ============ ADMIN NEWSLETTER SUBSCRIBERS CRUD ============
      if (sub === 'newsletter') {
        if (method === 'GET') {
          if (!hasPermission(admin, 'customers.view') && !hasPermission(admin, 'settings.view')) {
            return err('Permission denied', 403);
          }
          const page = q.get('page');
          const limit = q.get('limit');
          const search = q.get('search');
          const status = q.get('status');
          const result = await getSubscribers(db, { page, limit, search, status });
          return ok(result);
        }
      }

      if (sub.startsWith('newsletter/')) {
        const subscriberId = sub.replace('newsletter/', '');
        if (subscriberId && !['settings', 'templates', 'bulk', 'campaigns', 'analytics', 'export'].includes(subscriberId)) {
          if (method === 'PUT' || method === 'PATCH') {
            if (!hasPermission(admin, 'customers.edit') && !hasPermission(admin, 'settings.edit')) {
              return err('Permission denied', 403);
            }
            const body = await request.json().catch(() => ({}));
            const result = await updateSubscriberStatus(db, subscriberId, body.status);
            if (!result.success) return err(result.message, result.statusCode || 400);
            return ok(result);
          }

          if (method === 'DELETE') {
            if (!hasPermission(admin, 'customers.delete') && !hasPermission(admin, 'settings.edit')) {
              return err('Permission denied', 403);
            }
            const result = await deleteSubscriber(db, subscriberId);
            if (!result.success) return err(result.message, result.statusCode || 400);
            return ok(result);
          }
        }
      }

      // ============ RBAC: ADMIN MANAGEMENT ============
      if (sub === 'admins' && method === 'GET') {
        if (!hasPermission(admin, 'admins.view')) return err('Permission denied: admins.view required', 403);
        const search = q.get('search') || q.get('q') || '';
        const roleFilter = q.get('role') || '';
        const statusFilter = q.get('status') || '';
        const page = Math.max(1, parseInt(q.get('page') || '1'));
        const limit = Math.max(1, Math.min(100, parseInt(q.get('limit') || '10')));

        const query = { role: 'admin' };
        if (roleFilter && roleFilter !== 'ALL') {
          query.roleKey = roleFilter;
        }
        if (statusFilter && statusFilter !== 'ALL') {
          if (statusFilter === 'active') {
            query.$or = [{ status: 'active' }, { status: { $exists: false } }];
          } else {
            query.status = statusFilter;
          }
        }
        if (search.trim()) {
          const escaped = search.trim().replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
          const reg = { $regex: escaped, $options: 'i' };
          const searchCondition = [{ name: reg }, { email: reg }, { phone: reg }];
          if (query.$or) {
            query.$and = [{ $or: query.$or }, { $or: searchCondition }];
            delete query.$or;
          } else {
            query.$or = searchCondition;
          }
        }

        const total = await db.collection('users').countDocuments(query);
        const list = await db.collection('users')
          .find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray();

        // Fetch all roles to map role details
        const roles = await db.collection('roles').find({}).toArray();
        const roleMap = new Map(roles.map(r => [r.key, r]));

        const enriched = list.map(u => {
          const roleDoc = roleMap.get(u.roleKey) || DEFAULT_ROLES.find(r => r.key === u.roleKey) || { name: u.roleKey || 'Admin', key: u.roleKey || 'ADMIN' };
          return {
            ...clean(u),
            roleKey: u.roleKey || 'SUPER_ADMIN',
            roleName: roleDoc.name || u.roleKey,
            status: u.status || 'active',
            lastLoginAt: u.lastLoginAt || null
          };
        });

        return ok({
          admins: enriched,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1
        });
      }

      if (sub === 'admins' && method === 'POST') {
        if (!hasPermission(admin, 'admins.create')) return err('Permission denied: admins.create required', 403);
        const body = await request.json().catch(() => ({}));
        const { name, email, password, confirmPassword, role = 'ADMIN', status = 'active', phone = '' } = body;

        if (!name || !name.trim()) return err('Name is required', 400);
        if (!email || !email.trim() || !email.includes('@')) return err('A valid email address is required', 400);
        if (!password || password.length < 6) return err('Password must be at least 6 characters', 400);
        if (password !== confirmPassword) return err('Passwords do not match', 400);

        const em = email.trim().toLowerCase();
        const existing = await db.collection('users').findOne({ email: em });
        if (existing) return err(`An account with email "${em}" already exists.`, 409);

        // Role verification
        const targetRole = await db.collection('roles').findOne({ key: role }) ||
                           await db.collection('roles').findOne({ id: role }) ||
                           DEFAULT_ROLES.find(r => r.key === role) ||
                           DEFAULT_ROLES[1];

        // Privilege escalation verification
        const escalationErr = await validatePrivilegeEscalation(db, admin, null, targetRole.key, status);
        if (escalationErr) return err(escalationErr, 403);

        const { salt, hash } = hashPassword(password);
        const newAdmin = {
          id: uuidv4(),
          name: name.trim(),
          email: em,
          phone: phone.trim(),
          role: 'admin',
          roleKey: targetRole.key,
          roleId: targetRole.id,
          status: status || 'active',
          passwordSalt: salt,
          passwordHash: hash,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: null
        };

        await db.collection('users').insertOne(newAdmin);

        await logAdminActivity(db, {
          admin,
          action: 'ADMIN_CREATED',
          module: 'ADMINS',
          targetId: newAdmin.id,
          targetName: newAdmin.email,
          metadata: { name: newAdmin.name, email: newAdmin.email, role: targetRole.key, status: newAdmin.status },
          request
        });

        return ok({ admin: clean(newAdmin), message: `Admin ${newAdmin.name} created successfully.` });
      }

      if (sub.startsWith('admins/')) {
        const parts = sub.split('/');
        const targetId = parts[1];

        if (parts.length === 2 && method === 'GET') {
          if (!hasPermission(admin, 'admins.view')) return err('Permission denied: admins.view required', 403);
          const target = await db.collection('users').findOne({ id: targetId, role: 'admin' });
          if (!target) return err('Admin not found', 404);

          const roleDoc = await db.collection('roles').findOne({ key: target.roleKey }) ||
                          DEFAULT_ROLES.find(r => r.key === target.roleKey);
          const permissions = await resolveUserPermissions(db, target);

          return ok({
            admin: {
              ...clean(target),
              roleName: roleDoc?.name || target.roleKey,
              roleDescription: roleDoc?.description || '',
              permissions,
              status: target.status || 'active'
            }
          });
        }

        if (parts.length === 2 && method === 'PUT') {
          if (!hasPermission(admin, 'admins.edit')) return err('Permission denied: admins.edit required', 403);
          const target = await db.collection('users').findOne({ id: targetId, role: 'admin' });
          if (!target) return err('Admin not found', 404);

          const body = await request.json().catch(() => ({}));
          const { name, phone, role, status, password, confirmPassword } = body;

          // If status is changing, enforce admins.disable permission
          if (status !== undefined && status !== target.status) {
            if (!hasPermission(admin, 'admins.disable')) {
              return err('Permission denied: admins.disable required to toggle administrator status', 403);
            }
          }

          let newRoleKey = target.roleKey;
          let newRoleId = target.roleId;
          if (role) {
            const roleDoc = await db.collection('roles').findOne({ key: role }) ||
                            await db.collection('roles').findOne({ id: role }) ||
                            DEFAULT_ROLES.find(r => r.key === role);
            if (roleDoc) {
              newRoleKey = roleDoc.key;
              newRoleId = roleDoc.id;
            }
          }

          const escalationErr = await validatePrivilegeEscalation(db, admin, targetId, newRoleKey, status);
          if (escalationErr) return err(escalationErr, 403);

          const updateDoc = { updatedAt: new Date() };
          if (name && name.trim()) updateDoc.name = name.trim();
          if (phone !== undefined) updateDoc.phone = phone.trim();
          if (role) {
            updateDoc.roleKey = newRoleKey;
            updateDoc.roleId = newRoleId;
          }
          if (status) {
            updateDoc.status = status;
          }

          if (password) {
            if (password.length < 6) return err('Password must be at least 6 characters', 400);
            if (password !== confirmPassword) return err('Passwords do not match', 400);
            const { salt, hash } = hashPassword(password);
            updateDoc.passwordSalt = salt;
            updateDoc.passwordHash = hash;
          }

          await db.collection('users').updateOne({ id: targetId }, { $set: updateDoc });

          // If disabled, revoke active sessions immediately
          if (status === 'disabled') {
            await db.collection('sessions').deleteMany({ userId: targetId });
            await logAdminActivity(db, {
              admin,
              action: 'ADMIN_DISABLED',
              module: 'ADMINS',
              targetId: target.id,
              targetName: target.email,
              metadata: { previousStatus: target.status, newStatus: 'disabled' },
              request
            });
          } else if (status === 'active' && target.status === 'disabled') {
            await logAdminActivity(db, {
              admin,
              action: 'ADMIN_ENABLED',
              module: 'ADMINS',
              targetId: target.id,
              targetName: target.email,
              metadata: { previousStatus: target.status, newStatus: 'active' },
              request
            });
          }

          await logAdminActivity(db, {
            admin,
            action: 'ADMIN_UPDATED',
            module: 'ADMINS',
            targetId: target.id,
            targetName: target.email,
            metadata: { updatedFields: Object.keys(updateDoc).filter(k => !['passwordSalt', 'passwordHash', 'updatedAt'].includes(k)) },
            request
          });

          const updated = await db.collection('users').findOne({ id: targetId });
          return ok({ admin: clean(updated), message: 'Admin updated successfully' });
        }

        if (parts.length === 2 && method === 'DELETE') {
          if (!hasPermission(admin, 'admins.delete')) return err('Permission denied: admins.delete required', 403);
          const target = await db.collection('users').findOne({ id: targetId, role: 'admin' });
          if (!target) return err('Admin not found', 404);

          if (target.id === admin.id) {
            return err('Administrators cannot delete their own account', 400);
          }

          if (target.roleKey === 'SUPER_ADMIN' && admin.roleKey !== 'SUPER_ADMIN') {
            return err('Only a Super Administrator can delete another Super Administrator', 403);
          }

          if (target.roleKey === 'SUPER_ADMIN') {
            const activeSuperAdminCount = await db.collection('users').countDocuments({
              role: 'admin',
              roleKey: 'SUPER_ADMIN',
              status: { $ne: 'disabled' }
            });
            if (activeSuperAdminCount <= 1) {
              return err('Cannot delete the last remaining active Super Administrator', 400);
            }
          }

          await db.collection('sessions').deleteMany({ userId: target.id });
          await db.collection('users').deleteOne({ id: target.id });

          await logAdminActivity(db, {
            admin,
            action: 'ADMIN_DELETED',
            module: 'ADMINS',
            targetId: target.id,
            targetName: target.email,
            metadata: { deletedAdminEmail: target.email, role: target.roleKey },
            request
          });

          return ok({ ok: true, message: `Admin ${target.name} (${target.email}) deleted successfully.` });
        }
      }

      // ============ RBAC: ROLE MANAGEMENT ============
      if (sub === 'roles' && method === 'GET') {
        if (!hasPermission(admin, 'roles.view') && !hasPermission(admin, 'admins.create') && !hasPermission(admin, 'admins.edit')) {
          return err('Permission denied: roles.view required', 403);
        }
        await seedRbacIfEmpty(db);
        const roles = await db.collection('roles').find({}).sort({ isSystem: -1, name: 1 }).toArray();

        // Enforce user counts per role
        const userCounts = await db.collection('users').aggregate([
          { $match: { role: 'admin' } },
          { $group: { _id: '$roleKey', count: { $sum: 1 } } }
        ]).toArray();
        const countMap = new Map(userCounts.map(c => [c._id, c.count]));

        const enrichedRoles = roles.map(r => ({
          ...clean(r),
          adminCount: countMap.get(r.key) || 0
        }));

        return ok({ roles: enrichedRoles });
      }

      if (sub === 'roles' && method === 'POST') {
        if (!hasPermission(admin, 'roles.create')) return err('Permission denied: roles.create required', 403);
        const body = await request.json().catch(() => ({}));
        const { name, key, description = '', permissions = [] } = body;

        if (!name || !name.trim()) return err('Role name is required', 400);
        const rawKey = key || name;
        const normalizedKey = rawKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
        if (!normalizedKey) return err('Valid role key identifier is required', 400);

        const existingRole = await db.collection('roles').findOne({ key: normalizedKey });
        if (existingRole) return err(`A role with identifier "${normalizedKey}" already exists.`, 409);

        // Privilege escalation safeguard: non-super admin cannot grant permissions they do not hold
        if (admin.roleKey !== 'SUPER_ADMIN') {
          const callerPerms = admin.permissions || [];
          const invalidPerms = permissions.filter(p => !callerPerms.includes(p) && p !== '*');
          if (invalidPerms.length > 0) {
            return err(`Cannot assign permissions you do not possess: ${invalidPerms.join(', ')}`, 403);
          }
        }

        const newRole = {
          id: uuidv4(),
          name: name.trim(),
          key: normalizedKey,
          description: description.trim(),
          permissions: Array.isArray(permissions) ? permissions : [],
          isSystem: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await db.collection('roles').insertOne(newRole);

        await logAdminActivity(db, {
          admin,
          action: 'ROLE_CREATED',
          module: 'ROLES',
          targetId: newRole.id,
          targetName: newRole.name,
          metadata: { name: newRole.name, key: newRole.key, permissionCount: newRole.permissions.length },
          request
        });

        return ok({ role: clean(newRole), message: `Role "${newRole.name}" created successfully.` });
      }

      if (sub.startsWith('roles/')) {
        const parts = sub.split('/');
        const roleId = parts[1];

        if (parts.length === 2 && method === 'GET') {
          if (!hasPermission(admin, 'roles.view')) return err('Permission denied: roles.view required', 403);
          const role = await db.collection('roles').findOne({ id: roleId });
          if (!role) return err('Role not found', 404);
          return ok({ role: clean(role) });
        }

        if (parts.length === 2 && method === 'PUT') {
          if (!hasPermission(admin, 'roles.edit')) return err('Permission denied: roles.edit required', 403);
          const role = await db.collection('roles').findOne({ id: roleId });
          if (!role) return err('Role not found', 404);

          const body = await request.json().catch(() => ({}));
          const { name, description, permissions } = body;

          const updateDoc = { updatedAt: new Date() };
          if (name && name.trim()) updateDoc.name = name.trim();
          if (description !== undefined) updateDoc.description = description.trim();

          if (Array.isArray(permissions)) {
            // Super Admin role must always retain full wildcard access
            if (role.key === 'SUPER_ADMIN') {
              updateDoc.permissions = ['*'];
            } else {
              // Non-super admin escalation check
              if (admin.roleKey !== 'SUPER_ADMIN') {
                const callerPerms = admin.permissions || [];
                const invalidPerms = permissions.filter(p => !callerPerms.includes(p) && p !== '*');
                if (invalidPerms.length > 0) {
                  return err(`Cannot assign permissions you do not possess: ${invalidPerms.join(', ')}`, 403);
                }
              }
              updateDoc.permissions = permissions;
            }
          }

          await db.collection('roles').updateOne({ id: roleId }, { $set: updateDoc });

          await logAdminActivity(db, {
            admin,
            action: 'ROLE_UPDATED',
            module: 'ROLES',
            targetId: role.id,
            targetName: role.name,
            metadata: { updatedFields: Object.keys(updateDoc).filter(k => k !== 'updatedAt') },
            request
          });

          const updated = await db.collection('roles').findOne({ id: roleId });
          return ok({ role: clean(updated), message: `Role "${updated.name}" updated successfully.` });
        }

        if (parts.length === 2 && method === 'DELETE') {
          if (!hasPermission(admin, 'roles.delete')) return err('Permission denied: roles.delete required', 403);
          const role = await db.collection('roles').findOne({ id: roleId });
          if (!role) return err('Role not found', 404);

          if (role.isSystem) {
            return err('System built-in roles cannot be deleted', 400);
          }

          const assignedCount = await db.collection('users').countDocuments({ role: 'admin', roleKey: role.key });
          if (assignedCount > 0) {
            return err(`Cannot delete role "${role.name}": It is currently assigned to ${assignedCount} administrator(s).`, 400);
          }

          await db.collection('roles').deleteOne({ id: role.id });

          await logAdminActivity(db, {
            admin,
            action: 'ROLE_DELETED',
            module: 'ROLES',
            targetId: role.id,
            targetName: role.name,
            metadata: { key: role.key },
            request
          });

          return ok({ ok: true, message: `Role "${role.name}" deleted successfully.` });
        }
      }

      // ============ RBAC: PERMISSION MATRIX ============
      if (sub === 'permissions' && method === 'GET') {
        if (!hasPermission(admin, 'roles.view') && !hasPermission(admin, 'admins.permissions') && !hasPermission(admin, 'admins.view')) {
          return err('Permission denied: permissions view required', 403);
        }
        await seedRbacIfEmpty(db);
        const roles = await db.collection('roles').find({}).sort({ isSystem: -1, name: 1 }).toArray();
        return ok({
          permissions: PERMISSIONS,
          roles: roles.map(clean)
        });
      }

      // ============ RBAC: ACTIVITY LOGS ============
      if (sub === 'activity-logs' && method === 'GET') {
        if (!hasPermission(admin, 'activity_logs.view')) return err('Permission denied: activity_logs.view required', 403);
        const search = q.get('search') || q.get('q') || '';
        const actionFilter = q.get('action') || '';
        const moduleFilter = q.get('module') || '';
        const page = Math.max(1, parseInt(q.get('page') || '1'));
        const limit = Math.max(1, Math.min(100, parseInt(q.get('limit') || '20')));

        const query = {};
        if (actionFilter && actionFilter !== 'ALL') {
          query.action = actionFilter;
        }
        if (moduleFilter && moduleFilter !== 'ALL') {
          query.module = moduleFilter;
        }
        if (search.trim()) {
          const escaped = search.trim().replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
          const reg = { $regex: escaped, $options: 'i' };
          query.$or = [
            { adminName: reg },
            { adminEmail: reg },
            { targetName: reg },
            { action: reg },
            { module: reg }
          ];
        }

        const total = await db.collection('admin_activity_logs').countDocuments(query);
        const list = await db.collection('admin_activity_logs')
          .find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray();

        return ok({
          logs: list.map(clean),
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1
        });
      }

      if (sub === 'settings/customer-reviews' || sub === 'reviews/toggle') {
        if (method === 'GET') {
          let settings = await db.collection('site_settings').findOne({ id: 'default' });
          const enabled = settings?.customerReviewsEnabled ?? true;
          return ok({ enabled, customerReviewsEnabled: enabled });
        }
        if (method === 'PUT' || method === 'POST') {
          const body = await request.json().catch(() => ({}));
          const enabled = body.enabled !== undefined ? Boolean(body.enabled) : (body.customerReviewsEnabled !== undefined ? Boolean(body.customerReviewsEnabled) : true);
          await db.collection('site_settings').updateOne(
            { id: 'default' },
            { $set: { customerReviewsEnabled: enabled, updatedAt: new Date() } },
            { upsert: true }
          );
          _cache.delete('site_settings');
          return ok({ success: true, enabled, customerReviewsEnabled: enabled });
        }
      }

      if (sub.startsWith('product-filters')) {
        _cache.delete('product_filters');
        cacheBust('product_filters');
        const parts = sub.split('/');

        // GET /api/admin/product-filters
        if (parts.length === 1 && method === 'GET') {
          await seedFiltersIfEmpty(db);
          await syncCategoryAndCollectionFilterOptions(db);
          const list = await db.collection('product_filters').find({}).sort({ order: 1 }).toArray();
          return ok({ groups: list.map(clean) });
        }

        // POST /api/admin/product-filters (Create Group)
        if (parts.length === 1 && method === 'POST') {
          const body = await request.json();
          if (!body.name || !body.name.trim()) return err('Group name is required');
          const rawKey = body.key || body.name;
          const key = rawKey.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
          
          const existing = await db.collection('product_filters').findOne({ key });
          if (existing) return err(`A filter group with key "${key}" already exists.`, 409);

          const group = {
            id: uuidv4(),
            name: body.name.trim(),
            key,
            type: body.type || 'options',
            enabled: body.enabled !== false,
            order: parseInt(body.order ?? (await db.collection('product_filters').countDocuments())),
            priceConfig: body.priceConfig ? {
              min: Number(body.priceConfig.min ?? 0),
              max: Number(body.priceConfig.max ?? 1000000),
              step: Number(body.priceConfig.step ?? 5000)
            } : { min: 0, max: 1000000, step: 5000 },
            min: body.priceConfig?.min !== undefined ? Number(body.priceConfig.min) : 0,
            max: body.priceConfig?.max !== undefined ? Number(body.priceConfig.max) : 1000000,
            step: body.priceConfig?.step !== undefined ? Number(body.priceConfig.step) : 5000,
            options: Array.isArray(body.options) ? body.options : [],
            createdAt: new Date()
          };
          await db.collection('product_filters').insertOne(group);
          return ok({ group: clean(group) });
        }

        // PUT /api/admin/product-filters/reorder (Bulk reorder)
        if (parts.length === 2 && parts[1] === 'reorder' && method === 'PUT') {
          const body = await request.json();
          if (Array.isArray(body.groups)) {
            for (const g of body.groups) {
              if (g.id) await db.collection('product_filters').updateOne({ id: g.id }, { $set: { order: parseInt(g.order ?? 0) } });
            }
          }
          if (body.groupId && Array.isArray(body.options)) {
            await db.collection('product_filters').updateOne({ id: body.groupId }, { $set: { options: body.options } });
          }
          _cache.delete('product_filters');
          cacheBust('product_filters');
          return ok({ ok: true });
        }

        // PUT /api/admin/product-filters/:id (Update Group)
        if (parts.length === 2 && method === 'PUT') {
          const id = parts[1];
          const body = await request.json();
          const updateDoc = {};
          if (body.name !== undefined) updateDoc.name = body.name.trim();
          if (body.key !== undefined) updateDoc.key = body.key.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');
          if (body.type !== undefined) updateDoc.type = body.type;
          if (body.enabled !== undefined) updateDoc.enabled = !!body.enabled;
          if (body.order !== undefined) updateDoc.order = parseInt(body.order);
          if (body.priceConfig !== undefined) {
            updateDoc.priceConfig = {
              min: Number(body.priceConfig.min ?? 0),
              max: Number(body.priceConfig.max ?? 1000000),
              step: Number(body.priceConfig.step ?? 5000)
            };
            updateDoc.min = updateDoc.priceConfig.min;
            updateDoc.max = updateDoc.priceConfig.max;
            updateDoc.step = updateDoc.priceConfig.step;
          }
          if (Array.isArray(body.options)) updateDoc.options = body.options;
          updateDoc.updatedAt = new Date();

          await db.collection('product_filters').updateOne({ id }, { $set: updateDoc });
          _cache.delete('product_filters');
          cacheBust('product_filters');
          const updated = await db.collection('product_filters').findOne({ id });
          return ok({ group: clean(updated) });
        }

        // DELETE /api/admin/product-filters/:id (Delete Group)
        if (parts.length === 2 && method === 'DELETE') {
          const id = parts[1];
          await db.collection('product_filters').deleteOne({ id });
          _cache.delete('product_filters');
          cacheBust('product_filters');
          return ok({ ok: true });
        }

        // POST /api/admin/product-filters/:id/options (Add Option)
        if (parts.length === 3 && parts[2] === 'options' && method === 'POST') {
          const id = parts[1];
          const body = await request.json();
          if (!body.name || !body.name.trim()) return err('Option name is required');
          const group = await db.collection('product_filters').findOne({ id });
          if (!group) return err('Filter group not found', 404);

          const val = (body.value || body.name).trim();
          const existingOpt = (group.options || []).find(o => o.value?.toLowerCase() === val.toLowerCase() || o.name?.toLowerCase() === body.name.trim().toLowerCase());
          if (existingOpt) return err('An option with this name or value already exists in this group', 409);

          const newOpt = {
            id: uuidv4(),
            name: body.name.trim(),
            value: val,
            enabled: body.enabled !== false,
            order: parseInt(body.order ?? (group.options?.length || 0))
          };

          await db.collection('product_filters').updateOne({ id }, { $push: { options: newOpt } });

          // If added to Category filter group, also ensure it exists in categories collection
          if (group.key === 'category') {
            const catSlug = val.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
            const catExists = await db.collection('categories').findOne({ $or: [{ slug: catSlug }, { name: body.name.trim() }] });
            if (!catExists) {
              await db.collection('categories').insertOne({
                id: newOpt.id,
                name: body.name.trim(),
                slug: catSlug,
                img: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?crop=entropy&cs=srgb&fm=jpg&q=85',
                active: newOpt.enabled,
                enabled: newOpt.enabled,
                order: newOpt.order,
                createdAt: new Date()
              });
            }
            _cache.delete('cats');
            cacheBust('cats');
          }

          // If added to Collection filter group, also ensure it exists in collections collection
          if (group.key === 'collection') {
            const colSlug = val.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
            const colExists = await db.collection('collections').findOne({ $or: [{ slug: colSlug }, { name: body.name.trim() }] });
            if (!colExists) {
              await db.collection('collections').insertOne({
                id: newOpt.id,
                name: body.name.trim(),
                slug: colSlug,
                active: newOpt.enabled,
                enabled: newOpt.enabled,
                order: newOpt.order,
                createdAt: new Date()
              });
            }
            _cache.delete('cols');
            cacheBust('cols');
          }

          _cache.delete('product_filters');
          cacheBust('product_filters');
          return ok({ option: newOpt });
        }

        // PUT /api/admin/product-filters/:id/options/:optionId (Update Option)
        if (parts.length === 4 && parts[2] === 'options' && method === 'PUT') {
          const id = parts[1];
          const optionId = parts[3];
          const body = await request.json();

          const group = await db.collection('product_filters').findOne({ id });
          if (!group) return err('Filter group not found', 404);

          let updatedOpt = null;
          const updatedOptions = (group.options || []).map(opt => {
            if (opt.id === optionId) {
              updatedOpt = {
                ...opt,
                name: body.name !== undefined ? body.name.trim() : opt.name,
                value: body.value !== undefined ? body.value.trim() : opt.value,
                enabled: body.enabled !== undefined ? !!body.enabled : opt.enabled,
                order: body.order !== undefined ? parseInt(body.order) : opt.order
              };
              return updatedOpt;
            }
            return opt;
          });

          await db.collection('product_filters').updateOne({ id }, { $set: { options: updatedOptions } });

          // If this is Category filter, sync enabled/name changes with categories collection
          if (group.key === 'category' && updatedOpt) {
            const catQuery = { $or: [{ id: optionId }, { slug: updatedOpt.value }, { name: updatedOpt.name }] };
            const catUpdate = {};
            if (body.enabled !== undefined) {
              catUpdate.active = !!body.enabled;
              catUpdate.enabled = !!body.enabled;
            }
            if (body.name !== undefined) catUpdate.name = body.name.trim();
            if (Object.keys(catUpdate).length > 0) {
              await db.collection('categories').updateMany(catQuery, { $set: catUpdate });
            }
            _cache.delete('cats');
            cacheBust('cats');
          }

          // If this is Collection filter, sync enabled/name changes with collections collection
          if (group.key === 'collection' && updatedOpt) {
            const colQuery = { $or: [{ id: optionId }, { slug: updatedOpt.value }, { name: updatedOpt.name }] };
            const colUpdate = {};
            if (body.enabled !== undefined) {
              colUpdate.active = !!body.enabled;
              colUpdate.enabled = !!body.enabled;
            }
            if (body.name !== undefined) colUpdate.name = body.name.trim();
            if (Object.keys(colUpdate).length > 0) {
              await db.collection('collections').updateMany(colQuery, { $set: colUpdate });
            }
            _cache.delete('cols');
            cacheBust('cols');
          }

          _cache.delete('product_filters');
          cacheBust('product_filters');
          return ok({ ok: true });
        }

        // DELETE /api/admin/product-filters/:id/options/:optionId (Delete Option)
        if (parts.length === 4 && parts[2] === 'options' && method === 'DELETE') {
          const id = parts[1];
          const optionId = parts[3];
          const group = await db.collection('product_filters').findOne({ id });
          const targetOpt = (group?.options || []).find(o => o.id === optionId);

          await db.collection('product_filters').updateOne({ id }, { $pull: { options: { id: optionId } } });

          // If category group, also remove or deactivate from categories collection
          if (group?.key === 'category' && targetOpt) {
            await db.collection('categories').deleteMany({ $or: [{ id: optionId }, { slug: targetOpt.value }] });
            _cache.delete('cats');
            cacheBust('cats');
          }

          // If collection group, also remove or deactivate from collections collection
          if (group?.key === 'collection' && targetOpt) {
            await db.collection('collections').deleteMany({ $or: [{ id: optionId }, { slug: targetOpt.value }] });
            _cache.delete('cols');
            cacheBust('cols');
          }

          _cache.delete('product_filters');
          cacheBust('product_filters');
          return ok({ ok: true });
        }
      }

      if (sub === 'footer') {
        if (method === 'GET') {
          let footer = await db.collection('footer').findOne({ id: 'default' });
          if (!footer) {
            footer = { id: 'default', ...DEFAULT_FOOTER, createdAt: new Date() };
            await db.collection('footer').insertOne(footer);
          }
          return ok(clean(footer));
        }
        if (method === 'PUT') {
          const body = await request.json();
          if (!body.company || !body.company.name) {
            return err('Company name is required');
          }
          const { _id, id, ...updates } = body;
          await db.collection('footer').updateOne(
            { id: 'default' },
            { $set: { ...updates, updatedAt: new Date() } },
            { upsert: true }
          );

          // Synchronize logo across site_settings and header if updated
          if (updates.company && updates.company.logo) {
            await db.collection('site_settings').updateOne(
              { id: 'default' },
              { $set: { logo: updates.company.logo, updatedAt: new Date() } },
              { upsert: true }
            );
            await db.collection('header').updateOne(
              { id: 'default' },
              { $set: { 'logo.image': updates.company.logo, updatedAt: new Date() } },
              { upsert: true }
            );
            _cache.delete('site_settings');
            _cache.delete('header_config');
            _cache.delete('homepage_data');
            invalidateSiteDataCache();
            try { revalidatePath('/', 'layout'); } catch (e) {}
          }

          _cache.delete('footer');
          const updated = await db.collection('footer').findOne({ id: 'default' });
          return ok(clean(updated));
        }
      }

      if (sub === 'site-settings') {
        if (method === 'GET') {
          let settings = await db.collection('site_settings').findOne({ id: 'default' });
          if (!settings) {
            settings = { id: 'default', ...DEFAULT_SITE_SETTINGS, createdAt: new Date() };
            await db.collection('site_settings').insertOne(settings);
          }
          const rawPay = settings?.paymentSettings || DEFAULT_SITE_SETTINGS.paymentSettings;
          const keyId = rawPay?.razorpay?.keyId || '';
          const envKeyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
          const hasKeySecret = Boolean((rawPay?.razorpay?.keySecret && rawPay.razorpay.keySecret.trim()) || process.env.RAZORPAY_KEY_SECRET);
          const hasWebhookSecret = Boolean((rawPay?.razorpay?.webhookSecret && rawPay.razorpay.webhookSecret.trim()) || process.env.RAZORPAY_WEBHOOK_SECRET);

          return ok(clean({
            ...DEFAULT_SITE_SETTINGS,
            ...settings,
            logo: settings?.logo || DEFAULT_SITE_SETTINGS.logo || '/logo.png',
            shipping: {
              ...DEFAULT_SITE_SETTINGS.shipping,
              ...((settings && settings.shipping) || {})
            },
            paymentSettings: {
              razorpay: {
                enabled: rawPay?.razorpay?.enabled !== false,
                testMode: rawPay?.razorpay?.testMode ?? true,
                keyId,
                envKeyId,
                hasKeySecret,
                hasWebhookSecret,
                webhookSecret: rawPay?.razorpay?.webhookSecret ? '••••••••' : '',
                businessName: rawPay?.razorpay?.businessName || 'MikuMantra Fine Jewellery',
                themeColor: rawPay?.razorpay?.themeColor || '#9C6B30'
              },
              cod: {
                enabled: rawPay?.cod?.enabled !== false
              }
            }
          }));
        }
        if (method === 'PUT') {
          const body = await request.json();
          const { _id, id, ...updates } = body;
          
          if (updates.shipping) {
            const threshold = Number(updates.shipping.freeShippingThreshold);
            const standard = Number(updates.shipping.standardShippingCharge);
            if (!isNaN(threshold) && threshold < 0) {
              return err('Free shipping threshold cannot be negative', 400);
            }
            if (!isNaN(standard) && standard < 0) {
              return err('Standard shipping charge cannot be negative', 400);
            }
          }

          if (updates.paymentSettings) {
            const currentDoc = await db.collection('site_settings').findOne({ id: 'default' });
            const currentRzp = currentDoc?.paymentSettings?.razorpay || {};
            const newRzp = updates.paymentSettings.razorpay || {};

            let finalKeySecret = currentRzp.keySecret || '';
            if (newRzp.keySecret !== undefined && newRzp.keySecret !== '' && newRzp.keySecret !== '••••••••') {
              finalKeySecret = newRzp.keySecret.trim();
            }

            let finalWebhookSecret = currentRzp.webhookSecret || '';
            if (newRzp.webhookSecret !== undefined && newRzp.webhookSecret !== '' && newRzp.webhookSecret !== '••••••••') {
              finalWebhookSecret = newRzp.webhookSecret.trim();
            }

            updates.paymentSettings = {
              razorpay: {
                enabled: newRzp.enabled !== false,
                testMode: newRzp.testMode ?? true,
                keyId: (newRzp.keyId || '').trim(),
                keySecret: finalKeySecret,
                webhookSecret: finalWebhookSecret,
                businessName: newRzp.businessName || 'MikuMantra Fine Jewellery',
                themeColor: newRzp.themeColor || '#9C6B30'
              },
              cod: {
                enabled: updates.paymentSettings.cod?.enabled !== false
              }
            };

            await logAdminActivity(db, {
              admin,
              action: 'PAYMENT_SETTINGS_UPDATED',
              module: 'SITE_SETTINGS',
              targetId: 'default',
              targetName: 'Payment Gateways Configuration',
              metadata: {
                razorpayEnabled: updates.paymentSettings.razorpay.enabled,
                testMode: updates.paymentSettings.razorpay.testMode,
                codEnabled: updates.paymentSettings.cod.enabled
              },
              request
            });
          }

          await db.collection('site_settings').updateOne(
            { id: 'default' },
            { $set: { ...updates, updatedAt: new Date() } },
            { upsert: true }
          );

          // Synchronize logo across header and footer if updated
          if (updates.logo) {
            await db.collection('header').updateOne(
              { id: 'default' },
              { $set: { 'logo.image': updates.logo, updatedAt: new Date() } },
              { upsert: true }
            );
            await db.collection('footer').updateOne(
              { id: 'default' },
              { $set: { 'company.logo': updates.logo, updatedAt: new Date() } },
              { upsert: true }
            );
            _cache.delete('header_config');
            _cache.delete('footer');
            _cache.delete('homepage_data');
            invalidateSiteDataCache();
          }

          _cache.delete('site_settings');
          try {
            revalidatePath('/', 'layout');
          } catch (revalErr) {
            console.warn('revalidatePath warning:', revalErr.message);
          }
          const updated = await db.collection('site_settings').findOne({ id: 'default' });
          const updatedRawPay = updated?.paymentSettings || DEFAULT_SITE_SETTINGS.paymentSettings;
          return ok(clean({
            ...DEFAULT_SITE_SETTINGS,
            ...updated,
            shipping: {
              ...DEFAULT_SITE_SETTINGS.shipping,
              ...((updated && updated.shipping) || {})
            },
            paymentSettings: {
              razorpay: {
                enabled: updatedRawPay?.razorpay?.enabled !== false,
                testMode: updatedRawPay?.razorpay?.testMode ?? true,
                keyId: updatedRawPay?.razorpay?.keyId || '',
                envKeyId: process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
                hasKeySecret: Boolean((updatedRawPay?.razorpay?.keySecret && updatedRawPay.razorpay.keySecret.trim()) || process.env.RAZORPAY_KEY_SECRET),
                hasWebhookSecret: Boolean((updatedRawPay?.razorpay?.webhookSecret && updatedRawPay.razorpay.webhookSecret.trim()) || process.env.RAZORPAY_WEBHOOK_SECRET),
                webhookSecret: updatedRawPay?.razorpay?.webhookSecret ? '••••••••' : '',
                businessName: updatedRawPay?.razorpay?.businessName || 'MikuMantra Fine Jewellery',
                themeColor: updatedRawPay?.razorpay?.themeColor || '#9C6B30'
              },
              cod: {
                enabled: updatedRawPay?.cod?.enabled !== false
              }
            }
          }));
        }
      }

      if (sub === 'homepage-content') {
        if (method === 'GET') {
          let settings = await db.collection('site_settings').findOne({ id: 'default' });
          if (!settings) {
            settings = { id: 'default', ...DEFAULT_SITE_SETTINGS, createdAt: new Date() };
            await db.collection('site_settings').insertOne(settings);
          }
          return ok(clean({
            homepagePromotions: settings.homepagePromotions ?? DEFAULT_SITE_SETTINGS.homepagePromotions,
            assuranceSection: {
              ...DEFAULT_SITE_SETTINGS.assuranceSection,
              ...(settings.assuranceSection || {})
            },
            assuranceCards: settings.assuranceCards ?? DEFAULT_SITE_SETTINGS.assuranceCards
          }));
        }
        if (method === 'PUT') {
          const body = await request.json();
          const { homepagePromotions, assuranceSection, assuranceCards } = body;
          
          const updates = {};
          if (Array.isArray(homepagePromotions)) updates.homepagePromotions = homepagePromotions;
          if (assuranceSection && typeof assuranceSection === 'object') updates.assuranceSection = assuranceSection;
          if (Array.isArray(assuranceCards)) updates.assuranceCards = assuranceCards;

          await db.collection('site_settings').updateOne(
            { id: 'default' },
            { $set: { ...updates, updatedAt: new Date() } },
            { upsert: true }
          );
          _cache.delete('site_settings');
          _cache.delete('homepage_content');
          try {
            revalidatePath('/', 'layout');
          } catch (revalErr) {
            console.warn('revalidatePath warning:', revalErr.message);
          }
          const updated = await db.collection('site_settings').findOne({ id: 'default' });
          return ok(clean({
            homepagePromotions: updated.homepagePromotions ?? DEFAULT_SITE_SETTINGS.homepagePromotions,
            assuranceSection: {
              ...DEFAULT_SITE_SETTINGS.assuranceSection,
              ...(updated.assuranceSection || {})
            },
            assuranceCards: updated.assuranceCards ?? DEFAULT_SITE_SETTINGS.assuranceCards
          }));
        }
      }

      // ============ ADMIN: SOCIAL MEDIA / FOLLOW OUR WORLD ============
      if (sub.startsWith('social-media')) {
        const parts = sub.split('/');

        // Helper for URL validation
        const isValidUrl = (str) => {
          try {
            const parsed = new URL(str);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
          } catch {
            return false;
          }
        };

        // GET /api/admin/social-media (List all items + settings)
        if (parts.length === 1 && method === 'GET') {
          if (!hasPermission(admin, 'settings.view')) return err('Permission denied: settings.view required', 403);
          await seedSocialMediaIfEmpty(db);
          const [items, settingsDoc] = await Promise.all([
            db.collection('social_media').find({}).sort({ displayOrder: 1, createdAt: -1 }).toArray(),
            db.collection('social_media_settings').findOne({ id: 'default' })
          ]);
          const settings = {
            ...DEFAULT_SOCIAL_MEDIA_SETTINGS,
            ...(settingsDoc || {})
          };
          return ok({
            success: true,
            items: items.map(clean),
            settings: clean(settings)
          });
        }

        // POST /api/admin/social-media (Create new item)
        if (parts.length === 1 && method === 'POST') {
          if (!hasPermission(admin, 'settings.edit')) return err('Permission denied: settings.edit required', 403);
          const body = await request.json();
          const rawUrl = (body.url || '').trim();
          const rawThumb = (body.thumbnailUrl || body.thumbnail || '').trim();

          if (!rawUrl) return err('Social media URL is required', 400);
          if (!isValidUrl(rawUrl)) return err('Please enter a valid URL (e.g. https://www.instagram.com/p/...)', 400);
          if (!rawThumb) return err('Thumbnail image is required', 400);

          const count = await db.collection('social_media').countDocuments();
          const newItem = {
            id: uuidv4(),
            platform: body.platform || 'Instagram',
            url: rawUrl,
            thumbnailUrl: rawThumb,
            title: (body.title || body.caption || '').trim(),
            displayOrder: body.displayOrder !== undefined && body.displayOrder !== '' ? Number(body.displayOrder) : count + 1,
            isActive: body.isActive !== undefined ? !!body.isActive : true,
            openInNewTab: body.openInNewTab !== undefined ? !!body.openInNewTab : true,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          await db.collection('social_media').insertOne(newItem);
          _cache.delete('social_media_public');
          _cache.delete('homepage_data');
          cacheBust('social_media');
          invalidateSiteDataCache();
          try { revalidatePath('/', 'layout'); } catch (e) {}

          await logAdminActivity(db, {
            admin,
            action: 'SOCIAL_MEDIA_CREATED',
            module: 'SOCIAL_MEDIA',
            targetId: newItem.id,
            targetName: newItem.platform + ' Post',
            metadata: { url: newItem.url, platform: newItem.platform },
            request
          });

          return ok({ success: true, item: clean(newItem) });
        }

        // PUT /api/admin/social-media/settings (Update global section settings)
        if (parts.length === 2 && parts[1] === 'settings' && method === 'PUT') {
          if (!hasPermission(admin, 'settings.edit')) return err('Permission denied: settings.edit required', 403);
          const body = await request.json();
          const updateDoc = {};
          if (body.showSection !== undefined) updateDoc.showSection = !!body.showSection;
          if (body.eyebrow !== undefined) updateDoc.eyebrow = String(body.eyebrow).trim();
          if (body.title !== undefined) updateDoc.title = String(body.title).trim();
          if (body.subtitle !== undefined) updateDoc.subtitle = String(body.subtitle).trim();
          if (body.maxVisible !== undefined) updateDoc.maxVisible = Math.max(1, Math.min(24, parseInt(body.maxVisible) || 6));
          if (body.hoverAnimation !== undefined) updateDoc.hoverAnimation = !!body.hoverAnimation;
          if (body.hoverScale !== undefined) updateDoc.hoverScale = Math.max(1.01, Math.min(1.5, Number(body.hoverScale) || 1.10));
          updateDoc.updatedAt = new Date();

          await db.collection('social_media_settings').updateOne(
            { id: 'default' },
            { $set: updateDoc },
            { upsert: true }
          );

          _cache.delete('social_media_public');
          _cache.delete('homepage_data');
          cacheBust('social_media');
          invalidateSiteDataCache();
          try { revalidatePath('/', 'layout'); } catch (e) {}

          const updated = await db.collection('social_media_settings').findOne({ id: 'default' });
          return ok({ success: true, settings: clean({ ...DEFAULT_SOCIAL_MEDIA_SETTINGS, ...updated }) });
        }

        // PATCH /api/admin/social-media/reorder (Bulk reorder displayOrder)
        if (parts.length === 2 && parts[1] === 'reorder' && (method === 'PATCH' || method === 'PUT')) {
          if (!hasPermission(admin, 'settings.edit')) return err('Permission denied: settings.edit required', 403);
          const body = await request.json();
          const items = body.items || body.order || [];
          if (!Array.isArray(items)) return err('Items array is required for reordering', 400);

          const ops = items.map((it, idx) => {
            const id = typeof it === 'string' ? it : it.id;
            const order = typeof it === 'object' && it.displayOrder !== undefined ? Number(it.displayOrder) : idx + 1;
            return {
              updateOne: {
                filter: { id },
                update: { $set: { displayOrder: order, updatedAt: new Date() } }
              }
            };
          });

          if (ops.length > 0) {
            await db.collection('social_media').bulkWrite(ops);
          }

          _cache.delete('social_media_public');
          _cache.delete('homepage_data');
          cacheBust('social_media');
          invalidateSiteDataCache();
          try { revalidatePath('/', 'layout'); } catch (e) {}

          const updatedList = await db.collection('social_media').find({}).sort({ displayOrder: 1 }).toArray();
          return ok({ success: true, items: updatedList.map(clean) });
        }

        // PATCH /api/admin/social-media/:id/status (Toggle active status)
        if (parts.length === 3 && parts[2] === 'status' && (method === 'PATCH' || method === 'PUT')) {
          if (!hasPermission(admin, 'settings.edit')) return err('Permission denied: settings.edit required', 403);
          const id = parts[1];
          const body = await request.json();
          const item = await db.collection('social_media').findOne({ id });
          if (!item) return err('Social media item not found', 404);

          const newStatus = body.isActive !== undefined ? !!body.isActive : !item.isActive;
          await db.collection('social_media').updateOne({ id }, { $set: { isActive: newStatus, updatedAt: new Date() } });

          _cache.delete('social_media_public');
          _cache.delete('homepage_data');
          cacheBust('social_media');
          invalidateSiteDataCache();
          try { revalidatePath('/', 'layout'); } catch (e) {}

          return ok({ success: true, id, isActive: newStatus });
        }

        // PUT /api/admin/social-media/:id (Update single item)
        if (parts.length === 2 && parts[1] !== 'settings' && parts[1] !== 'reorder' && method === 'PUT') {
          if (!hasPermission(admin, 'settings.edit')) return err('Permission denied: settings.edit required', 403);
          const id = parts[1];
          const body = await request.json();
          const existing = await db.collection('social_media').findOne({ id });
          if (!existing) return err('Social media item not found', 404);

          if (body.url) {
            const rawUrl = body.url.trim();
            if (!isValidUrl(rawUrl)) return err('Please enter a valid URL', 400);
          }

          const updateDoc = {};
          if (body.platform !== undefined) updateDoc.platform = body.platform;
          if (body.url !== undefined) updateDoc.url = body.url.trim();
          if (body.thumbnailUrl !== undefined || body.thumbnail !== undefined) {
            updateDoc.thumbnailUrl = (body.thumbnailUrl || body.thumbnail || '').trim();
          }
          if (body.title !== undefined || body.caption !== undefined) {
            updateDoc.title = (body.title || body.caption || '').trim();
          }
          if (body.displayOrder !== undefined) updateDoc.displayOrder = Number(body.displayOrder);
          if (body.isActive !== undefined) updateDoc.isActive = !!body.isActive;
          if (body.openInNewTab !== undefined) updateDoc.openInNewTab = !!body.openInNewTab;
          updateDoc.updatedAt = new Date();

          await db.collection('social_media').updateOne({ id }, { $set: updateDoc });
          _cache.delete('social_media_public');
          _cache.delete('homepage_data');
          cacheBust('social_media');
          invalidateSiteDataCache();
          try { revalidatePath('/', 'layout'); } catch (e) {}

          const updated = await db.collection('social_media').findOne({ id });
          return ok({ success: true, item: clean(updated) });
        }

        // DELETE /api/admin/social-media/:id (Delete item)
        if (parts.length === 2 && parts[1] !== 'settings' && parts[1] !== 'reorder' && method === 'DELETE') {
          if (!hasPermission(admin, 'settings.edit')) return err('Permission denied: settings.edit required', 403);
          const id = parts[1];
          const existing = await db.collection('social_media').findOne({ id });
          if (!existing) return err('Social media item not found', 404);

          await db.collection('social_media').deleteOne({ id });
          _cache.delete('social_media_public');
          _cache.delete('homepage_data');
          cacheBust('social_media');
          invalidateSiteDataCache();
          try { revalidatePath('/', 'layout'); } catch (e) {}

          await logAdminActivity(db, {
            admin,
            action: 'SOCIAL_MEDIA_DELETED',
            module: 'SOCIAL_MEDIA',
            targetId: id,
            targetName: existing.title || existing.platform + ' item',
            metadata: { url: existing.url },
            request
          });

          return ok({ success: true, message: 'Social media post deleted successfully' });
        }
      }

      if (sub === 'dashboard' && method === 'GET') {
        const cached = cacheGet('admin_dashboard');
        if (cached) return ok(cached);
        const [orders, users, products, revenue, totalOrders] = await Promise.all([
          db.collection('orders').find({}).sort({ placedAt: -1 }).limit(10).toArray(),
          db.collection('users').countDocuments(),
          db.collection('products').countDocuments(),
          db.collection('orders').aggregate([{ $group: { _id: null, total: { $sum: '$amounts.total' } } }]).toArray(),
          db.collection('orders').countDocuments()
        ]);
        const r = { stats: { totalOrders, totalUsers: users, totalProducts: products, totalRevenue: revenue[0]?.total || 0 }, recentOrders: orders.map(clean) };
        cacheSet('admin_dashboard', r, 15000);
        return ok(r);
      }

      // Upload media
      if (sub === 'upload' && method === 'POST') {
        try {
          const formData = await request.formData();
          const file = formData.get('file');
          if (!file) return err('No file provided');

          // Image/SVG upload validations
          const fileType = file.type || 'image/jpeg';
          const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
          if (!allowedTypes.includes(fileType)) {
            return err('Invalid MIME type. Only image/jpeg, image/png, image/webp, and image/svg+xml are allowed.', 400);
          }

          const originalName = file.name || 'image.jpg';
          const ext = pathModule.extname(originalName).toLowerCase();
          if (!['.jpg', '.jpeg', '.png', '.webp', '.svg'].includes(ext)) {
            return err('Invalid file extension. Only .jpg, .jpeg, .png, .webp, and .svg are allowed.', 400);
          }

          if (file.size > 5 * 1024 * 1024) {
            return err('File size exceeds the 5MB limit.', 400);
          }

          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const filename = `${uuidv4()}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

          let savedToDb = false;
          try {
            await db.collection('uploads').insertOne({
              filename,
              contentType: fileType,
              data: buffer,
              createdAt: new Date()
            });
            savedToDb = true;
          } catch (dbErr) {
            console.warn('MongoDB upload save failed, falling back to filesystem only:', dbErr.message);
          }

          // Ephemeral local file system save as a fallback
          let savedToFs = false;
          try {
            const uploadsDir = pathModule.join(process.cwd(), 'public', 'uploads');
            if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true });
            }
            const filePath = pathModule.join(uploadsDir, filename);
            fs.writeFileSync(filePath, buffer);
            savedToFs = true;
          } catch (fsErr) {
            console.warn('Local filesystem write failed:', fsErr.message);
          }

          if (!savedToDb && !savedToFs) {
            return err('Upload failed: Could not write to database or filesystem.');
          }

          const url = savedToDb ? `/api/uploads/${filename}` : `/uploads/${filename}`;
          return ok({ url });
        } catch (e) {
          console.error('Upload error:', e);
          return err('Upload failed: ' + e.message, 500);
        }
      }

      // Global Banner settings transitions
      if (sub === 'bannerSettings') {
        if (method === 'GET') {
          const settings = await db.collection('bannerSettings').findOne({ id: 'default' }) || { id: 'default', transition: 'fade' };
          return ok(clean(settings));
        }
        if (method === 'PUT') {
          const b = await request.json();
          const transition = b.transition || 'fade';
          if (!['fade', 'slide', 'zoom', 'scaleFade'].includes(transition)) {
            return err('Invalid transition type', 400);
          }
          await db.collection('bannerSettings').updateOne({ id: 'default' }, { $set: { transition } }, { upsert: true });
          _cache.delete('bans');
          return ok({ transition });
        }
      }

      // Products CRUD
      if (sub === 'products' && method === 'GET') {
        if (!hasPermission(admin, 'products.view')) return err('Permission denied: products.view required', 403);
        const cached = cacheGet('admin_products');
        if (cached) return ok(cached);
        const list = await db.collection('products').find({}).sort({ createdAt: -1 }).toArray();
        const r = { products: list.map(clean) };
        cacheSet('admin_products', r, 60000);
        return ok(r);
      }
      if (sub === 'products' && method === 'POST') {
        if (!hasPermission(admin, 'products.create')) return err('Permission denied: products.create required', 403);
        const b = await request.json();
        const name = (b.name || '').trim();
        const category = (b.category || '').trim();
        const price = Number(b.price);
        const mrp = b.mrp !== undefined && b.mrp !== '' ? Number(b.mrp) : price;
        const stock = b.stock !== undefined ? parseInt(b.stock) : 0;

        if (!name) return err('Product name is required', 400);
        if (!category) return err('Product category is required', 400);
        if (isNaN(price) || price < 0) return err('Price must be a valid non-negative number', 400);
        if (isNaN(mrp) || mrp < price) return err('MRP cannot be less than selling price', 400);
        if (isNaN(stock) || stock < 0) return err('Stock quantity cannot be negative', 400);

        const slug = b.slug ? b.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-') : name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
        const images = Array.isArray(b.images) ? b.images : (b.images || '').split('\n').map(s => s.trim()).filter(Boolean);

        const p = {
          id: uuidv4(),
          slug,
          name,
          category,
          price,
          mrp,
          stock,
          images,
          createdAt: new Date(),
          ...b,
          name,
          category,
          price,
          mrp,
          stock,
          images
        };
        await db.collection('products').insertOne(p);
        cacheBust('products:');
        _cache.delete('admin_products');
        _cache.delete('admin_dashboard');
        return ok({ product: clean(p) });
      }
      if (sub.startsWith('products/') && method === 'PUT') {
        if (!hasPermission(admin, 'products.edit')) return err('Permission denied: products.edit required', 403);
        const id = sub.split('/')[1];
        const b = await request.json();
        const updateData = { ...b, updatedAt: new Date() };

        if (b.name !== undefined && !b.name.trim()) return err('Product name cannot be empty', 400);
        if (b.category !== undefined && !b.category.trim()) return err('Product category cannot be empty', 400);
        if (b.price !== undefined) {
          const price = Number(b.price);
          if (isNaN(price) || price < 0) return err('Price must be a valid non-negative number', 400);
          updateData.price = price;
        }
        if (b.mrp !== undefined && b.mrp !== '') {
          const mrp = Number(b.mrp);
          if (isNaN(mrp) || mrp < (updateData.price || 0)) return err('MRP cannot be less than selling price', 400);
          updateData.mrp = mrp;
        }
        if (b.stock !== undefined) {
          const stock = parseInt(b.stock);
          if (isNaN(stock) || stock < 0) return err('Stock quantity cannot be negative', 400);
          updateData.stock = stock;
        }
        if (b.images && !Array.isArray(b.images)) {
          updateData.images = b.images.split('\n').map(s => s.trim()).filter(Boolean);
        }

        // Ratings & reviews are computed dynamically from actual reviews
        delete updateData.rating;
        delete updateData.reviews;
        delete updateData.breakdown;

        await db.collection('products').updateOne({ id }, { $set: updateData });
        await recalculateProductRating(db, id);
        cacheBust('products:');
        _cache.delete('admin_products');
        _cache.delete('admin_dashboard');
        const up = await db.collection('products').findOne({ id });
        return ok({ product: clean(up) });
      }
      if (sub.startsWith('products/') && method === 'DELETE') {
        if (!hasPermission(admin, 'products.delete')) return err('Permission denied: products.delete required', 403);
        const id = sub.split('/')[1];
        await db.collection('products').deleteOne({ id });
        await db.collection('wishlist').deleteMany({ productId: id });
        cacheBust('products:');
        _cache.delete('admin_products');
        _cache.delete('admin_dashboard');
        return ok({ ok: true });
      }

      // Admin Coupon Display / Helper Text Settings
      if (sub === 'coupons/settings') {
        if (method === 'GET') {
          let settings = await db.collection('site_settings').findOne({ id: 'default' });
          const helperText = settings?.couponHelperText !== undefined
            ? settings.couponHelperText
            : (DEFAULT_SITE_SETTINGS.couponHelperText || 'Try MIKUMANTRA10 or WELCOME2000');
          return ok({
            success: true,
            data: { helperText },
            helperText
          });
        }
        if (method === 'PUT') {
          const b = await request.json().catch(() => ({}));
          const rawText = b.helperText !== undefined ? b.helperText : (b.data?.helperText !== undefined ? b.data.helperText : '');
          const cleanText = typeof rawText === 'string' ? rawText.replace(/<[^>]*>?/gm, '').trim() : '';

          await db.collection('site_settings').updateOne(
            { id: 'default' },
            { $set: { couponHelperText: cleanText, updatedAt: new Date() } },
            { upsert: true }
          );

          _cache.delete('site_settings');
          _cache.delete('coupon_settings');
          _cache.delete('admin_coupons_settings');
          cacheBust('site_settings');
          invalidateSiteDataCache('site_settings');

          return ok({
            success: true,
            data: { helperText: cleanText },
            helperText: cleanText
          });
        }
      }

      // ============ ADMIN: CATEGORIES & CATEGORY SHOWCASE ============
      if (sub.startsWith('categories') || sub.startsWith('category-showcase')) {
        const parts = sub.split('/');

        // 1. GET /api/admin/categories/settings or /api/admin/category-showcase/settings
        if (parts.length === 2 && parts[1] === 'settings' && method === 'GET') {
          if (!hasPermission(admin, 'settings.view') && !hasPermission(admin, 'products.view')) {
            return err('Permission denied', 403);
          }
          await seedCategoryShowcaseIfEmpty(db);
          const settingsDoc = await db.collection('category_showcase_settings').findOne({ id: 'default' });
          const settings = {
            ...DEFAULT_CATEGORY_SHOWCASE_SETTINGS,
            ...(settingsDoc ? clean(settingsDoc) : {})
          };
          return ok({ success: true, settings, data: { settings } });
        }

        // 2. PUT /api/admin/categories/settings or /api/admin/category-showcase/settings
        if (parts.length === 2 && parts[1] === 'settings' && method === 'PUT') {
          if (!hasPermission(admin, 'settings.edit') && !hasPermission(admin, 'products.edit')) {
            return err('Permission denied', 403);
          }
          const body = await request.json().catch(() => ({}));
          const updateDoc = {};
          if (body.sectionEnabled !== undefined) updateDoc.sectionEnabled = !!body.sectionEnabled;
          if (body.eyebrow !== undefined) updateDoc.eyebrow = String(body.eyebrow).trim();
          if (body.title !== undefined) updateDoc.title = String(body.title).trim();
          if (body.subtitle !== undefined) updateDoc.subtitle = String(body.subtitle).trim();
          if (body.buttonText !== undefined) updateDoc.buttonText = String(body.buttonText).trim();
          if (body.hoverEnabled !== undefined) updateDoc.hoverEnabled = !!body.hoverEnabled;
          if (body.hoverScale !== undefined) updateDoc.hoverScale = Math.max(1.0, Math.min(1.5, Number(body.hoverScale) || 1.10));
          if (body.otherItemsScale !== undefined) updateDoc.otherItemsScale = Math.max(0.8, Math.min(1.0, Number(body.otherItemsScale) || 0.95));
          if (body.transitionDuration !== undefined) updateDoc.transitionDuration = Math.max(100, Math.min(1000, Number(body.transitionDuration) || 300));
          if (body.hoverOpacity !== undefined) updateDoc.hoverOpacity = Math.max(0.5, Math.min(1.0, Number(body.hoverOpacity) || 1.0));
          if (body.imageHoverEffect !== undefined) updateDoc.imageHoverEffect = body.imageHoverEffect;
          if (body.hoverBorder !== undefined) updateDoc.hoverBorder = !!body.hoverBorder;
          if (body.hoverBorderWidth !== undefined) updateDoc.hoverBorderWidth = Math.max(1, Math.min(4, Number(body.hoverBorderWidth) || 1));
          if (body.hoverShadow !== undefined) updateDoc.hoverShadow = !!body.hoverShadow;
          if (body.desktopItems !== undefined) updateDoc.desktopItems = Math.max(2, Math.min(8, Number(body.desktopItems) || 6));
          if (body.tabletItems !== undefined) updateDoc.tabletItems = Math.max(2, Math.min(6, Number(body.tabletItems) || 4));
          if (body.mobileItems !== undefined) updateDoc.mobileItems = Math.max(1, Math.min(4, Number(body.mobileItems) || 2));
          if (body.circleSize !== undefined) updateDoc.circleSize = Math.max(80, Math.min(260, Number(body.circleSize) || 170));
          if (body.gap !== undefined) updateDoc.gap = Math.max(8, Math.min(60, Number(body.gap) || 24));
          updateDoc.updatedAt = new Date();

          await db.collection('category_showcase_settings').updateOne(
            { id: 'default' },
            { $set: updateDoc },
            { upsert: true }
          );

          _cache.delete('cats');
          _cache.delete('admin_categories');
          _cache.delete('homepage_data');
          cacheBust('cats');
          invalidateSiteDataCache('homepage_data');
          try { revalidatePath('/', 'layout'); } catch (e) {}

          const updated = await db.collection('category_showcase_settings').findOne({ id: 'default' });
          const settings = {
            ...DEFAULT_CATEGORY_SHOWCASE_SETTINGS,
            ...(updated ? clean(updated) : {})
          };
          return ok({ success: true, settings, data: { settings } });
        }

        // 3. PATCH/PUT /api/admin/categories/reorder or /api/admin/category-showcase/reorder
        if (parts.length === 2 && parts[1] === 'reorder' && (method === 'PATCH' || method === 'PUT')) {
          if (!hasPermission(admin, 'products.edit') && !hasPermission(admin, 'settings.edit')) {
            return err('Permission denied', 403);
          }
          const body = await request.json().catch(() => ({}));
          const items = body.items || body.order || body.orderIds || [];
          if (!Array.isArray(items)) return err('Items array is required for reordering', 400);

          const ops = items.map((it, idx) => {
            const id = typeof it === 'string' ? it : it.id;
            const orderNum = typeof it === 'object' && (it.displayOrder !== undefined || it.order !== undefined)
              ? Number(it.displayOrder ?? it.order)
              : idx + 1;
            return {
              updateOne: {
                filter: { id },
                update: { $set: { order: orderNum, displayOrder: orderNum, updatedAt: new Date() } }
              }
            };
          });

          if (ops.length > 0) {
            await db.collection('categories').bulkWrite(ops);
          }

          await syncCategoryAndCollectionFilterOptions(db);
          _cache.delete('cats');
          _cache.delete('admin_categories');
          _cache.delete('homepage_data');
          _cache.delete('product_filters');
          cacheBust('cats');
          cacheBust('product_filters');
          invalidateSiteDataCache('homepage_data');
          try { revalidatePath('/', 'layout'); } catch (e) {}

          return ok({ success: true, message: 'Categories reordered successfully' });
        }

        // 4. PATCH /api/admin/categories/:id/status
        if (parts.length === 3 && parts[2] === 'status' && (method === 'PATCH' || method === 'PUT')) {
          if (!hasPermission(admin, 'products.edit') && !hasPermission(admin, 'settings.edit')) {
            return err('Permission denied', 403);
          }
          const id = parts[1];
          const body = await request.json().catch(() => ({}));
          const existing = await db.collection('categories').findOne({ id });
          if (!existing) return err('Category not found', 404);

          const newActive = body.active !== undefined ? !!body.active : (body.isActive !== undefined ? !!body.isActive : !existing.active);

          await db.collection('categories').updateOne(
            { id },
            { $set: { active: newActive, enabled: newActive, updatedAt: new Date() } }
          );

          await syncCategoryAndCollectionFilterOptions(db);
          _cache.delete('cats');
          _cache.delete('admin_categories');
          _cache.delete('homepage_data');
          _cache.delete('product_filters');
          cacheBust('cats');
          cacheBust('product_filters');
          invalidateSiteDataCache('homepage_data');
          try { revalidatePath('/', 'layout'); } catch (e) {}

          const up = await db.collection('categories').findOne({ id });
          return ok({ success: true, item: clean(up) });
        }

        // 5. GET /api/admin/categories or /api/admin/category-showcase (List all items)
        if (parts.length === 1 && method === 'GET') {
          if (!hasPermission(admin, 'products.view') && !hasPermission(admin, 'settings.view')) {
            return err('Permission denied', 403);
          }
          await seedCategoryShowcaseIfEmpty(db);
          const [list, settingsDoc] = await Promise.all([
            db.collection('categories').find({}).sort({ order: 1, displayOrder: 1, createdAt: 1 }).toArray(),
            db.collection('category_showcase_settings').findOne({ id: 'default' })
          ]);
          const settings = {
            ...DEFAULT_CATEGORY_SHOWCASE_SETTINGS,
            ...(settingsDoc ? clean(settingsDoc) : {})
          };
          const formatted = list.map((c, idx) => {
            const cleanItem = clean(c);
            return {
              ...cleanItem,
              id: cleanItem.id,
              name: cleanItem.name,
              slug: cleanItem.slug,
              img: cleanItem.img || cleanItem.imageUrl || '',
              imageUrl: cleanItem.img || cleanItem.imageUrl || '',
              link: cleanItem.link || `/shop?category=${cleanItem.slug}`,
              buttonText: cleanItem.buttonText || '',
              displayOrder: Number(cleanItem.order ?? cleanItem.displayOrder ?? (idx + 1)),
              order: Number(cleanItem.order ?? cleanItem.displayOrder ?? (idx + 1)),
              active: cleanItem.active !== false && cleanItem.enabled !== false,
              enabled: cleanItem.active !== false && cleanItem.enabled !== false,
              isActive: cleanItem.active !== false && cleanItem.enabled !== false,
              openInNewTab: !!cleanItem.openInNewTab
            };
          });

          return ok({
            success: true,
            categories: formatted,
            items: formatted,
            settings
          });
        }

        // 6. POST /api/admin/categories or /api/admin/category-showcase (Create category)
        if (parts.length === 1 && method === 'POST') {
          if (!hasPermission(admin, 'products.create') && !hasPermission(admin, 'settings.edit')) {
            return err('Permission denied', 403);
          }
          const b = await request.json().catch(() => ({}));
          if (!b.name || !b.name.trim()) return err('Category name is required', 400);

          const name = b.name.trim();
          const slug = (b.slug || name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')).trim();
          const imgUrl = (b.img || b.imageUrl || '').trim();
          const link = (b.link || `/shop?category=${slug}`).trim();
          const count = await db.collection('categories').countDocuments();
          const orderNum = b.displayOrder !== undefined ? Number(b.displayOrder) : (b.order !== undefined ? Number(b.order) : count + 1);
          const activeStatus = b.active !== false && b.enabled !== false && b.isActive !== false;

          const doc = {
            id: uuidv4(),
            name,
            slug,
            img: imgUrl,
            imageUrl: imgUrl,
            link,
            buttonText: (b.buttonText || '').trim(),
            description: (b.description || '').trim(),
            order: orderNum,
            displayOrder: orderNum,
            active: activeStatus,
            enabled: activeStatus,
            openInNewTab: !!b.openInNewTab,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          await db.collection('categories').insertOne(doc);
          await syncCategoryAndCollectionFilterOptions(db);

          _cache.delete('cats');
          _cache.delete('admin_categories');
          _cache.delete('homepage_data');
          _cache.delete('product_filters');
          cacheBust('cats');
          cacheBust('product_filters');
          invalidateSiteDataCache('homepage_data');
          try { revalidatePath('/', 'layout'); } catch (e) {}

          await logAdminActivity(db, {
            admin,
            action: 'CATEGORY_CREATED',
            module: 'CATEGORIES',
            targetId: doc.id,
            targetName: doc.name,
            metadata: { slug: doc.slug },
            request
          });

          return ok({ success: true, item: clean(doc), category: clean(doc) });
        }

        // 7. PUT /api/admin/categories/:id or /api/admin/category-showcase/:id (Update category)
        if (parts.length === 2 && parts[1] !== 'settings' && parts[1] !== 'reorder' && method === 'PUT') {
          if (!hasPermission(admin, 'products.edit') && !hasPermission(admin, 'settings.edit')) {
            return err('Permission denied', 403);
          }
          const id = parts[1];
          const b = await request.json().catch(() => ({}));
          const existing = await db.collection('categories').findOne({ id });
          if (!existing) return err('Category not found', 404);

          const updateDoc = {};
          if (b.name !== undefined) updateDoc.name = b.name.trim();
          if (b.slug !== undefined) updateDoc.slug = b.slug.trim();
          if (b.img !== undefined || b.imageUrl !== undefined) {
            updateDoc.img = (b.img || b.imageUrl || '').trim();
            updateDoc.imageUrl = updateDoc.img;
          }
          if (b.link !== undefined) updateDoc.link = b.link.trim();
          if (b.buttonText !== undefined) updateDoc.buttonText = b.buttonText.trim();
          if (b.description !== undefined) updateDoc.description = b.description.trim();
          if (b.order !== undefined || b.displayOrder !== undefined) {
            const ord = Number(b.order ?? b.displayOrder);
            updateDoc.order = ord;
            updateDoc.displayOrder = ord;
          }
          if (b.active !== undefined || b.enabled !== undefined || b.isActive !== undefined) {
            const act = b.active !== false && b.enabled !== false && b.isActive !== false;
            updateDoc.active = act;
            updateDoc.enabled = act;
          }
          if (b.openInNewTab !== undefined) updateDoc.openInNewTab = !!b.openInNewTab;
          updateDoc.updatedAt = new Date();

          await db.collection('categories').updateOne({ id }, { $set: updateDoc });
          await syncCategoryAndCollectionFilterOptions(db);

          _cache.delete('cats');
          _cache.delete('admin_categories');
          _cache.delete('homepage_data');
          _cache.delete('product_filters');
          cacheBust('cats');
          cacheBust('product_filters');
          invalidateSiteDataCache('homepage_data');
          try { revalidatePath('/', 'layout'); } catch (e) {}

          const up = await db.collection('categories').findOne({ id });
          return ok({ success: true, item: clean(up), category: clean(up) });
        }

        // 8. DELETE /api/admin/categories/:id or /api/admin/category-showcase/:id (Delete category)
        if (parts.length === 2 && parts[1] !== 'settings' && parts[1] !== 'reorder' && method === 'DELETE') {
          if (!hasPermission(admin, 'products.delete') && !hasPermission(admin, 'settings.edit')) {
            return err('Permission denied', 403);
          }
          const id = parts[1];
          const catDoc = await db.collection('categories').findOne({ id });
          if (!catDoc) return err('Category not found', 404);

          // Check if assigned to products
          const assignedCount = await db.collection('products').countDocuments({
            $or: [
              { category: catDoc.slug },
              { category: catDoc.name }
            ]
          });
          if (assignedCount > 0) {
            return err(`Cannot delete category "${catDoc.name}": ${assignedCount} product(s) are currently assigned to it. Please reassign or delete the products first.`, 400);
          }

          // Clean up unused upload if local
          if (catDoc.img) {
            try {
              const imgUrl = catDoc.img;
              const count = await db.collection('categories').countDocuments({ img: imgUrl, id: { $ne: id } });
              if (count === 0) {
                let filename = '';
                if (imgUrl.includes('/api/uploads/')) filename = imgUrl.split('/api/uploads/')[1];
                else if (imgUrl.includes('/uploads/')) filename = imgUrl.split('/uploads/')[1];
                if (filename) {
                  await db.collection('uploads').deleteOne({ filename });
                  const filePath = pathModule.join(process.cwd(), 'public', 'uploads', filename);
                  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                }
              }
            } catch (delErr) {
              console.warn('Failed to clean up category media:', delErr.message);
            }
          }

          await db.collection('categories').deleteOne({ id });
          await syncCategoryAndCollectionFilterOptions(db);

          _cache.delete('cats');
          _cache.delete('admin_categories');
          _cache.delete('homepage_data');
          _cache.delete('product_filters');
          cacheBust('cats');
          cacheBust('product_filters');
          invalidateSiteDataCache('homepage_data');
          try { revalidatePath('/', 'layout'); } catch (e) {}

          await logAdminActivity(db, {
            admin,
            action: 'CATEGORY_DELETED',
            module: 'CATEGORIES',
            targetId: id,
            targetName: catDoc.name,
            metadata: { slug: catDoc.slug },
            request
          });

          return ok({ ok: true, success: true });
        }
      }

      // Collections, Banners, Coupons CRUD (uniform)
      for (const col of ['collections', 'banners', 'coupons']) {
        if (sub === col && method === 'GET') {
          const cached = cacheGet('admin_' + col);
          if (cached) return ok(cached);
          const list = await db.collection(col).find({}).toArray();
          const r = { [col]: list.map(clean) };
          cacheSet('admin_' + col, r, 60000);
          return ok(r);
        }
        if (sub === col && method === 'POST') {
          const b = await request.json();
          if (col === 'collections') {
            if (!b.name || !b.name.trim()) return err('Collection name is required', 400);
            if (!b.slug || !b.slug.trim()) return err('Collection slug is required', 400);
          }
          if (col === 'coupons') {
            const rawCode = (b.code || '').trim().toUpperCase();
            if (!rawCode) return err('Coupon code is required', 400);
            const existing = await db.collection('coupons').findOne({ code: rawCode });
            if (existing) return err(`Coupon code '${rawCode}' already exists`, 400);

            const type = b.type === 'flat' ? 'flat' : 'percent';
            const numVal = Number(b.value);
            if (isNaN(numVal) || numVal <= 0) return err('Discount value must be a number greater than 0', 400);
            if (type === 'percent' && numVal > 100) return err('Percentage discount cannot exceed 100%', 400);

            const minOrderNum = Math.max(0, Number(b.minOrder) || 0);

            b.code = rawCode;
            b.type = type;
            b.value = numVal;
            b.minOrder = minOrderNum;
            b.active = b.active !== false;
          }
          const doc = { id: uuidv4(), createdAt: new Date(), ...b };
          await db.collection(col).insertOne(doc);
          _cache.delete('admin_' + col);
          if (col === 'collections') {
            await syncCategoryAndCollectionFilterOptions(db);
            _cache.delete('product_filters');
            cacheBust('product_filters');
            _cache.delete('cols');
          }
          return ok({ item: clean(doc) });
        }
        if (sub.startsWith(col + '/') && method === 'PUT') {
          const id = sub.split('/')[1];
          const b = await request.json();
          if (col === 'collections') {
            if (b.name !== undefined && !b.name.trim()) return err('Collection name is required', 400);
            if (b.slug !== undefined && !b.slug.trim()) return err('Collection slug is required', 400);
          }
          if (col === 'coupons') {
            if (b.code !== undefined) {
              const rawCode = (b.code || '').trim().toUpperCase();
              if (!rawCode) return err('Coupon code is required', 400);
              const existing = await db.collection('coupons').findOne({ code: rawCode, id: { $ne: id } });
              if (existing) return err(`Coupon code '${rawCode}' already exists`, 400);
              b.code = rawCode;
            }
            if (b.type !== undefined) {
              b.type = b.type === 'flat' ? 'flat' : 'percent';
            }
            if (b.value !== undefined) {
              const numVal = Number(b.value);
              if (isNaN(numVal) || numVal <= 0) return err('Discount value must be a number greater than 0', 400);
              if (b.type === 'percent' && numVal > 100) return err('Percentage discount cannot exceed 100%', 400);
              b.value = numVal;
            }
            if (b.minOrder !== undefined) {
              b.minOrder = Math.max(0, Number(b.minOrder) || 0);
            }
          }
          await db.collection(col).updateOne({ id }, { $set: b });
          _cache.delete('admin_' + col);
          if (col === 'collections') {
            await syncCategoryAndCollectionFilterOptions(db);
            _cache.delete('product_filters');
            cacheBust('product_filters');
            _cache.delete('cols');
          }
          const up = await db.collection(col).findOne({ id });
          return ok({ item: clean(up) });
        }
        if (sub.startsWith(col + '/') && method === 'DELETE') {
          const id = sub.split('/')[1];
          _cache.delete('admin_' + col);

          if (col === 'banners') {
            try {
              const doc = await db.collection(col).findOne({ id });
              if (doc && doc.img) {
                const imgUrl = doc.img;
                const count = await db.collection(col).countDocuments({ img: imgUrl, id: { $ne: id } });
                if (count === 0) {
                  let filename = '';
                  if (imgUrl.includes('/api/uploads/')) {
                    filename = imgUrl.split('/api/uploads/')[1];
                  } else if (imgUrl.includes('/uploads/')) {
                    filename = imgUrl.split('/uploads/')[1];
                  }
                  if (filename) {
                    await db.collection('uploads').deleteOne({ filename });
                    const filePath = pathModule.join(process.cwd(), 'public', 'uploads', filename);
                    if (fs.existsSync(filePath)) {
                      fs.unlinkSync(filePath);
                    }
                  }
                }
              }
            } catch (delErr) {
              console.warn(`Failed to clean up ${col} media:`, delErr.message);
            }
          }
          await db.collection(col).deleteOne({ id });
          if (col === 'collections') {
            await syncCategoryAndCollectionFilterOptions(db);
            _cache.delete('product_filters');
            cacheBust('product_filters');
            _cache.delete('cols');
          }
          return ok({ ok: true });
        }
      }

      // Orders admin
      if (sub === 'orders' && method === 'GET') {
        if (!hasPermission(admin, 'orders.view')) return err('Permission denied: orders.view required', 403);
        const search = q.get('search')?.trim();
        let query = {};
        
        if (search) {
          const escaped = search.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
          const reg = { $regex: escaped, $options: 'i' };
          
          // Find matching users by email or name to include matching userIds in query
          const matchingUsers = await db.collection('users').find({
            $or: [
              { email: reg },
              { name: reg }
            ]
          }).toArray();
          const matchingUserIds = matchingUsers.map(u => u.id);
          
          query = {
            $or: [
              { id: reg },
              { orderNumber: reg },
              { 'address.fullName': reg },
              { 'address.phone': reg },
              { 'items.name': reg },
              { guestEmail: reg },
              { userId: { $in: matchingUserIds } }
            ]
          };
        }

        const list = await db.collection('orders').find(query).sort({ placedAt: -1 }).toArray();
        const userIds = [...new Set(list.map(o => o.userId).filter(Boolean))];
        const users = await db.collection('users').find({ id: { $in: userIds } }).toArray();
        const userMap = new Map(users.map(u => [u.id, u.email]));
        const enriched = list.map(o => {
          const email = o.userId ? userMap.get(o.userId) : o.guestEmail;
          return { ...o, customerEmail: email || '' };
        });
        return ok({ orders: enriched.map(clean) })
      }
      if (sub === 'delivered-orders' && method === 'GET') {
        if (!hasPermission(admin, 'orders.view')) return err('Permission denied: orders.view required', 403);
        const search = q.get('search')?.trim();
        let query = { status: 'delivered' };
        
        if (search) {
          const escaped = search.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
          const reg = { $regex: escaped, $options: 'i' };
          
          const matchingUsers = await db.collection('users').find({
            $or: [
              { email: reg },
              { name: reg }
            ]
          }).toArray();
          const matchingUserIds = matchingUsers.map(u => u.id);
          
          query = {
            status: 'delivered',
            $and: [
              {
                $or: [
                  { id: reg },
                  { orderNumber: reg },
                  { 'address.fullName': reg },
                  { 'address.phone': reg },
                  { 'items.name': reg },
                  { guestEmail: reg },
                  { userId: { $in: matchingUserIds } }
                ]
              }
            ]
          };
        }

        const list = await db.collection('orders').find(query).sort({ deliveredAt: -1, placedAt: -1 }).toArray();
        const userIds = [...new Set(list.map(o => o.userId).filter(Boolean))];
        const users = await db.collection('users').find({ id: { $in: userIds } }).toArray();
        const userMap = new Map(users.map(u => [u.id, u.email]));
        const enriched = list.map(o => {
          const email = o.userId ? userMap.get(o.userId) : o.guestEmail;
          return { ...o, customerEmail: email || '' };
        });
        return ok({ orders: enriched.map(clean) })
      }
      if (sub.startsWith('orders/') && method === 'PUT') {
        if (!hasPermission(admin, 'orders.update')) return err('Permission denied: orders.update required', 403);
        const id = sub.split('/')[1];
        const b = await request.json();

        const existingOrder = await db.collection('orders').findOne({ id });
        if (!existingOrder) return err('Order not found', 404);

        if (existingOrder.status === 'cancelled') {
          return err('Cancelled orders cannot be updated. Cancelled is a terminal state.', 400);
        }

        const targetStatus = b.status || existingOrder.status;
        const isStatusChanging = b.status && b.status !== existingOrder.status;
        const hasCourierInput = Boolean(
          b.courier !== undefined ||
          b.carrier !== undefined ||
          b.trackingNumber !== undefined ||
          b.trackingUrl !== undefined ||
          b.notes !== undefined
        );

        const notes = {
          packed: 'Order packed & ready to ship.',
          shipped: 'Shipped via courier.',
          delivered: 'Delivered successfully.',
          cancelled: 'Order cancelled.',
          confirmed: 'Order confirmed.'
        };
        const setDoc = {};
        if (b.status) setDoc.status = b.status;
        if (b.status === 'delivered') {
          setDoc.deliveredAt = new Date();
        }

        let courierDoc = null;
        if (hasCourierInput || targetStatus === 'shipped') {
          const rawCarrier = b.courier?.carrier !== undefined ? b.courier.carrier : (b.carrier !== undefined ? b.carrier : (existingOrder.courier?.carrier || existingOrder.carrier || ''));
          const rawTrackingNum = b.courier?.trackingNumber !== undefined ? b.courier.trackingNumber : (b.trackingNumber !== undefined ? b.trackingNumber : (existingOrder.courier?.trackingNumber || existingOrder.trackingNumber || ''));
          let rawTrackingUrl = b.courier?.trackingUrl !== undefined ? b.courier.trackingUrl : (b.trackingUrl !== undefined ? b.trackingUrl : (existingOrder.courier?.trackingUrl || existingOrder.trackingUrl || ''));
          const rawNotes = b.courier?.notes !== undefined ? b.courier.notes : (b.notes !== undefined ? b.notes : (existingOrder.courier?.notes || ''));

          const carrier = (rawCarrier || '').trim();
          const trackingNumber = (rawTrackingNum || '').trim();
          let trackingUrl = (rawTrackingUrl || '').trim();
          if (!trackingUrl && carrier && trackingNumber) {
            trackingUrl = generateTrackingUrl(carrier, trackingNumber);
          }
          const shippedAt = b.courier?.shippedAt ? new Date(b.courier.shippedAt) : (existingOrder.shippedAt || existingOrder.courier?.shippedAt || new Date());

          courierDoc = {
            carrier,
            trackingNumber,
            trackingUrl,
            shippedAt,
            notes: (rawNotes || '').trim()
          };

          setDoc.courier = courierDoc;
          setDoc.carrier = carrier;
          setDoc.trackingNumber = trackingNumber;
          setDoc.trackingUrl = trackingUrl;
          if (!existingOrder.shippedAt) {
            setDoc.shippedAt = shippedAt;
          }
        }

        if (b.status === 'cancelled') {
          if (!hasPermission(admin, 'orders.cancel') && !hasPermission(admin, 'orders.update')) {
            return err('Permission denied: orders.cancel required', 403);
          }
          const now = new Date();
          setDoc.cancelledAt = now;
          setDoc.cancelledBy = 'admin';
          setDoc.cancelledByUserId = admin.id;
          setDoc.cancelledByRole = 'admin';
          setDoc.cancellationReason = b.reason || 'Cancelled by MikuMantra';
          if (b.note) setDoc.cancellationNote = b.note;

          const isPaid = existingOrder.paymentStatus === 'paid' || (existingOrder.payment !== 'cod' && existingOrder.paymentStatus !== 'pending');
          if (isPaid) {
            setDoc.refundStatus = 'refund_initiated';
            setDoc.refundAmount = existingOrder.amounts?.total || 0;
            setDoc.refundId = existingOrder.razorpayPaymentId ? `ref_${existingOrder.razorpayPaymentId}` : `ref_MOCK_${uuidv4().slice(0, 8)}`;
            setDoc.refundInitiatedAt = now;
          } else {
            setDoc.refundStatus = 'not_applicable';
          }
        }

        let historyNote = b.note || (b.status ? notes[b.status] : '') || '';
        if (targetStatus === 'shipped') {
          const carrier = courierDoc?.carrier || existingOrder.carrier || '';
          const trackingNum = courierDoc?.trackingNumber || existingOrder.trackingNumber || '';
          if (carrier && trackingNum) {
            historyNote = b.note || `Shipped via ${carrier} (AWB: ${trackingNum})`;
          } else if (carrier) {
            historyNote = b.note || `Shipped via ${carrier}`;
          }
        } else if (hasCourierInput) {
          const carrier = courierDoc?.carrier || existingOrder.carrier || '';
          const trackingNum = courierDoc?.trackingNumber || existingOrder.trackingNumber || '';
          historyNote = b.note || `Courier tracking updated: ${carrier || 'Courier'}${trackingNum ? ` (AWB: ${trackingNum})` : ''}`;
        }

        const effectiveStatus = b.status || existingOrder.status;
        const updateOps = { $set: setDoc };
        if (historyNote || isStatusChanging) {
          updateOps.$push = {
            statusHistory: {
              status: effectiveStatus,
              at: new Date(),
              note: historyNote
            }
          };
        }

        const updateResult = await db.collection('orders').updateOne(
          { id, status: { $ne: 'cancelled' } },
          updateOps
        );

        if (updateResult.matchedCount === 0) {
          return err('Cancelled orders cannot be updated.', 400);
        }

        if (b.status === 'cancelled' && Array.isArray(existingOrder.items)) {
          for (const item of existingOrder.items) {
            if (item.id && item.qty > 0) {
              await db.collection('products').updateOne(
                { id: item.id },
                { $inc: { stock: item.qty } }
              );
            }
          }
          cacheBust('products:');
        }

        const up = await db.collection('orders').findOne({ id });

        // Trigger notifications if shipped or if courier details updated on a shipped/delivered order
        if (targetStatus === 'shipped' || (existingOrder.status === 'shipped' && hasCourierInput)) {
          const customerUser = up.userId ? await db.collection('users').findOne({ id: up.userId }) : null;
          try {
            await sendOrderShippedNotification({ order: up, user: customerUser, db });
          } catch (notifErr) {
            console.error('[Notification error] Order shipped notification:', notifErr);
          }
        }

        if (b.status === 'cancelled') {
          try {
            await logAdminActivity(db, {
              admin,
              action: 'ORDER_CANCELLED',
              module: 'Orders',
              targetId: existingOrder.id,
              targetName: `Order #${existingOrder.orderNumber}`,
              metadata: {
                cancelledBy: 'admin',
                reason: setDoc.cancellationReason,
                note: setDoc.cancellationNote || null
              },
              request
            });
          } catch (logErr) {
            console.error('Failed to log admin cancellation activity:', logErr);
          }

          try {
            await sendOrderCancelledNotification({ order: up, user: null, db });
          } catch (notifErr) {
            console.error('Failed to send order cancellation notification:', notifErr);
          }
        }

        // Dispatch push notification to customer's mobile devices
        if (up && up.userId && b.status) {
          const statusMessages = {
            packed: { title: 'Order Packed! 📦', body: `Your order #${up.orderNumber} has been packed and is ready for dispatch.` },
            shipped: { title: 'Order Shipped! 🚚', body: `Your order #${up.orderNumber} is on its way${up.carrier ? ' via ' + up.carrier : ''}! Track your delivery.` },
            out_for_delivery: { title: 'Out for Delivery! 🛵', body: `Your order #${up.orderNumber} is out for delivery today!` },
            delivered: { title: 'Order Delivered! 🎉', body: `Your order #${up.orderNumber} has been delivered. Thank you for choosing MikuMantra!` }
          };
          const msg = statusMessages[b.status];
          if (msg) {
            sendPushNotification({
              db,
              userId: up.userId,
              title: msg.title,
              body: msg.body,
              data: { orderId: up.id, orderNumber: up.orderNumber, status: b.status, type: 'order_status_update' }
            }).catch(() => {});
          }
        }

        return ok({ order: clean(up) });
      }


      // Customers
      if (sub === 'customers' && method === 'GET') {
        if (!hasPermission(admin, 'customers.view')) return err('Permission denied: customers.view required', 403);
        const search = q.get('search')?.trim();
        let query = {};
        
        if (search) {
          const escaped = search.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
          const reg = { $regex: escaped, $options: 'i' };
          query = {
            $or: [
              { id: reg },
              { name: reg },
              { email: reg },
              { phone: reg }
            ]
          };
        }
        
        const list = await db.collection('users').find(query).sort({ createdAt: -1 }).toArray();
        return ok({ customers: list.map(clean) })
      }

      // Reviews admin
      if (sub === 'reviews' && method === 'GET') {
        const search = q.get('search')?.trim();
        const statusFilter = q.get('status')?.trim();
        const productIdFilter = q.get('productId')?.trim();
        const ratingFilter = q.get('rating')?.trim();
        const typeFilter = q.get('type')?.trim();
        const repliedFilter = q.get('replied')?.trim();
        const sortBy = q.get('sort')?.trim() || 'newest';

        let query = {};
        if (statusFilter && statusFilter !== 'ALL') {
          if (statusFilter === 'published') {
            query.$or = [{ status: 'published' }, { status: { $exists: false }, approved: true }];
          } else if (statusFilter === 'hidden') {
            query.$or = [{ status: 'hidden' }, { approved: false }];
          }
        }

        if (productIdFilter && productIdFilter !== 'ALL') {
          const prod = await db.collection('products').findOne({ $or: [{ id: productIdFilter }, { slug: productIdFilter }] });
          const targetIds = [productIdFilter, prod?.id, prod?.slug].filter(Boolean);
          query.productId = { $in: targetIds };
        }

        if (ratingFilter && ratingFilter !== 'ALL') {
          const rNum = Number(ratingFilter);
          if (!isNaN(rNum)) query.rating = rNum;
        }

        if (typeFilter && typeFilter !== 'ALL') {
          if (typeFilter === 'customer') {
            query.orderId = { $exists: true, $ne: null };
          } else if (typeFilter === 'admin') {
            query.$or = [{ orderId: { $exists: false } }, { orderId: null }, { userId: 'admin' }];
          }
        }

        if (repliedFilter && repliedFilter !== 'ALL') {
          if (repliedFilter === 'replied') {
            query['adminReply.comment'] = { $exists: true, $ne: '' };
          } else if (repliedFilter === 'unreplied') {
            query.$or = [
              { adminReply: { $exists: false } },
              { adminReply: null },
              { 'adminReply.comment': '' }
            ];
          }
        }

        if (search) {
          const escaped = search.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
          const reg = { $regex: escaped, $options: 'i' };
          const searchCond = [
            { reviewerName: reg },
            { title: reg },
            { comment: reg },
            { productId: reg },
            { productSlug: reg },
            { reviewerEmail: reg },
            { orderNumber: reg },
            { orderId: reg }
          ];

          if (query.$or) {
            query = { $and: [{ $or: query.$or }, { $or: searchCond }] };
          } else {
            query.$or = searchCond;
          }
        }

        let sortObj = { createdAt: -1 };
        if (sortBy === 'oldest') sortObj = { createdAt: 1 };
        else if (sortBy === 'rating_high') sortObj = { rating: -1, createdAt: -1 };
        else if (sortBy === 'rating_low') sortObj = { rating: 1, createdAt: -1 };

        const list = await db.collection('reviews').find(query).sort(sortObj).toArray();
        return ok({ reviews: list.map(clean) });
      }

      if (sub === 'reviews/bulk' && method === 'POST') {
        const b = await request.json().catch(() => ({}));
        const { action, reviewIds } = b;
        if (!Array.isArray(reviewIds) || reviewIds.length === 0) {
          return err('No review IDs provided for bulk action', 400);
        }

        const reviews = await db.collection('reviews').find({ id: { $in: reviewIds } }).toArray();
        const productIds = Array.from(new Set(reviews.map(r => r.productId).filter(Boolean)));

        if (action === 'publish') {
          await db.collection('reviews').updateMany(
            { id: { $in: reviewIds } },
            { $set: { status: 'published', approved: true, updatedAt: new Date() } }
          );
        } else if (action === 'hide') {
          await db.collection('reviews').updateMany(
            { id: { $in: reviewIds } },
            { $set: { status: 'hidden', approved: false, updatedAt: new Date() } }
          );
        } else if (action === 'delete') {
          await db.collection('reviews').deleteMany({ id: { $in: reviewIds } });
        } else {
          return err('Invalid bulk action', 400);
        }

        for (const pid of productIds) {
          await recalculateProductRating(db, pid);
        }

        return ok({ success: true, count: reviews.length, action });
      }

      if (sub === 'reviews' && method === 'POST') {
        const b = await request.json();
        if (!b.productId) return err('Product is required', 400);

        const prod = await db.collection('products').findOne({ $or: [{ id: b.productId }, { slug: b.productId }] });
        const ratingVal = Math.min(5, Math.max(1, Number(b.rating) || 5));
        const reviewStatus = b.status === 'hidden' ? 'hidden' : 'published';

        const r = {
          id: uuidv4(),
          productId: prod?.id || b.productId,
          productSlug: prod?.slug || b.productId,
          productName: prod?.name || 'Fine Jewellery Piece',
          productImage: prod?.images?.[0] || '',
          orderNumber: (b.orderNumber || '').trim(),
          userId: 'admin',
          reviewerName: (b.reviewerName || 'MikuMantra Curator').trim(),
          reviewerEmail: (b.reviewerEmail || 'admin@mikumantra.com').trim(),
          rating: ratingVal,
          title: (b.title || '').trim().slice(0, 150),
          comment: (b.comment || '').trim().slice(0, 1000),
          images: b.image ? [b.image] : (Array.isArray(b.images) ? b.images : []),
          status: reviewStatus,
          verifiedPurchase: Boolean(b.verifiedPurchase),
          approved: reviewStatus === 'published',
          createdAt: b.createdAt ? new Date(b.createdAt) : new Date(),
          updatedAt: new Date()
        };

        if (b.adminReply && typeof b.adminReply === 'string' && b.adminReply.trim()) {
          r.adminReply = {
            comment: b.adminReply.trim(),
            repliedAt: new Date(),
            repliedBy: admin?.name || 'MikuMantra Atelier'
          };
        }

        await db.collection('reviews').insertOne(r);
        await recalculateProductRating(db, r.productId);

        return ok({ review: clean(r) });
      }

      if (sub.startsWith('reviews/') && method === 'PUT') {
        const id = sub.split('/')[1];
        const r = await db.collection('reviews').findOne({ id });
        if (!r) return err('Review not found', 404);

        const b = await request.json();
        const updateData = { updatedAt: new Date() };
        const unsetData = {};

        if (b.status !== undefined) {
          updateData.status = b.status === 'hidden' ? 'hidden' : 'published';
          updateData.approved = updateData.status === 'published';
        }
        if (b.reviewerName !== undefined) updateData.reviewerName = b.reviewerName.trim();
        if (b.reviewerEmail !== undefined) updateData.reviewerEmail = b.reviewerEmail.trim();
        if (b.rating !== undefined) updateData.rating = Math.min(5, Math.max(1, Number(b.rating) || 5));
        if (b.title !== undefined) updateData.title = b.title.trim();
        if (b.comment !== undefined) updateData.comment = b.comment.trim();
        if (b.images !== undefined) updateData.images = Array.isArray(b.images) ? b.images : [b.images];
        if (b.image !== undefined) updateData.images = [b.image];
        if (b.verifiedPurchase !== undefined) updateData.verifiedPurchase = Boolean(b.verifiedPurchase);
        if (b.orderNumber !== undefined) updateData.orderNumber = b.orderNumber.trim();
        if (b.orderId !== undefined) updateData.orderId = b.orderId.trim();

        if (b.adminReply !== undefined) {
          if (b.adminReply === null || b.adminReply === '' || (typeof b.adminReply === 'object' && !b.adminReply?.comment?.trim())) {
            unsetData.adminReply = "";
          } else {
            const replyComment = typeof b.adminReply === 'object' ? (b.adminReply.comment || '') : b.adminReply;
            updateData.adminReply = {
              comment: replyComment.trim(),
              repliedAt: new Date(),
              repliedBy: admin?.name || 'MikuMantra Atelier'
            };
          }
        }

        const updateOp = { $set: updateData };
        if (Object.keys(unsetData).length > 0) {
          updateOp.$unset = unsetData;
        }

        await db.collection('reviews').updateOne({ id }, updateOp);
        const updated = await db.collection('reviews').findOne({ id });
        await recalculateProductRating(db, r.productId);

        return ok({ review: clean(updated) });
      }

      if (sub.startsWith('reviews/') && method === 'DELETE') {
        const id = sub.split('/')[1];
        const r = await db.collection('reviews').findOne({ id });
        if (r) {
          await db.collection('reviews').deleteOne({ id });
          await recalculateProductRating(db, r.productId);
        }
        return ok({ ok: true });
      }

      // Admin Returns Management
      if (sub === 'returns' && method === 'GET') {
        const search = q.get('search')?.trim();
        const statusFilter = q.get('status')?.trim();
        let query = {};

        if (statusFilter && statusFilter !== 'ALL') {
          query.returnStatus = statusFilter;
        }

        if (search) {
          const escaped = search.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
          const reg = { $regex: escaped, $options: 'i' };
          const matchingUsers = await db.collection('users').find({
            $or: [{ email: reg }, { name: reg }, { phone: reg }]
          }).toArray();
          const matchingUserIds = matchingUsers.map(u => u.id);

          query.$or = [
            { id: reg },
            { returnId: reg },
            { orderId: reg },
            { orderNumber: reg },
            { reason: reg },
            { userId: { $in: matchingUserIds } }
          ];
        }

        const list = await db.collection('returns').find(query).sort({ requestedAt: -1 }).toArray();
        const userIds = [...new Set(list.map(r => r.userId).filter(Boolean))];
        const orderIds = [...new Set(list.map(r => r.orderId).filter(Boolean))];

        const [users, orders] = await Promise.all([
          db.collection('users').find({ id: { $in: userIds } }).toArray(),
          db.collection('orders').find({ id: { $in: orderIds } }).toArray()
        ]);

        const userMap = new Map(users.map(u => [u.id, u]));
        const orderMap = new Map(orders.map(o => [o.id, o]));

        const enriched = list.map(r => {
          const userDoc = userMap.get(r.userId);
          const orderDoc = orderMap.get(r.orderId);
          return {
            ...r,
            customerName: userDoc?.name || orderDoc?.address?.fullName || 'Customer',
            customerEmail: userDoc?.email || '',
            customerPhone: userDoc?.phone || orderDoc?.address?.phone || '',
            paymentMethod: orderDoc?.payment || 'cod',
            orderTotal: orderDoc?.amounts?.total || 0
          };
        });

        return ok({ returns: enriched.map(clean) });
      }

      if (sub.startsWith('returns/') && method === 'POST') {
        const parts = sub.split('/'); // ['returns', '<id>', 'approve']
        const id = parts[1];
        const action = parts[2];

        const rDoc = await db.collection('returns').findOne({ $or: [{ id }, { returnId: id }] });
        if (!rDoc) return err('Return request not found.', 404);

        const order = await db.collection('orders').findOne({ id: rDoc.orderId });
        const userDoc = await db.collection('users').findOne({ id: rDoc.userId });

        // Approve Return
        if (action === 'approve') {
          if (rDoc.returnStatus !== 'REQUESTED' && rDoc.returnStatus !== 'RETURN_REQUESTED') {
            return err(`Return request cannot be approved because current status is "${rDoc.returnStatus}".`, 400);
          }

          const now = new Date();
          await db.collection('returns').updateOne(
            { id: rDoc.id },
            {
              $set: {
                returnStatus: 'APPROVED',
                approvedAt: now,
                approvedBy: admin.id,
                updatedAt: now
              }
            }
          );
          await db.collection('orders').updateOne(
            { id: rDoc.orderId },
            { $set: { returnStatus: 'APPROVED', updatedAt: now } }
          );

          await createAuditLog(db, {
            returnId: rDoc.id,
            orderId: rDoc.orderId,
            action: 'return_approved',
            performedBy: admin.id,
            oldStatus: rDoc.returnStatus,
            newStatus: 'APPROVED',
            metadata: { refundAmount: rDoc.refundAmount }
          });

          const updatedReturn = await db.collection('returns').findOne({ id: rDoc.id });
          await sendReturnApprovedNotification({ returnReq: updatedReturn, order, user: userDoc, db });

          return ok({ message: 'Return request approved successfully.', return: clean(updatedReturn) });
        }

        // Reject Return
        if (action === 'reject') {
          if (rDoc.returnStatus !== 'REQUESTED' && rDoc.returnStatus !== 'RETURN_REQUESTED') {
            return err(`Return request cannot be rejected because current status is "${rDoc.returnStatus}".`, 400);
          }

          const body = await request.json().catch(() => ({}));
          const rejectionReason = (body.rejectionReason || body.reason || '').trim();
          if (!rejectionReason) {
            return err('Rejection reason is required.', 400);
          }

          const now = new Date();
          await db.collection('returns').updateOne(
            { id: rDoc.id },
            {
              $set: {
                returnStatus: 'REJECTED',
                refundStatus: 'NOT_APPLICABLE',
                rejectionReason,
                rejectedAt: now,
                rejectedBy: admin.id,
                updatedAt: now
              }
            }
          );
          await db.collection('orders').updateOne(
            { id: rDoc.orderId },
            { $set: { returnStatus: 'REJECTED', updatedAt: now } }
          );

          await createAuditLog(db, {
            returnId: rDoc.id,
            orderId: rDoc.orderId,
            action: 'return_rejected',
            performedBy: admin.id,
            oldStatus: rDoc.returnStatus,
            newStatus: 'REJECTED',
            reason: rejectionReason
          });

          const updatedReturn = await db.collection('returns').findOne({ id: rDoc.id });
          await sendReturnRejectedNotification({ returnReq: updatedReturn, order, user: userDoc, db });

          return ok({ message: 'Return request rejected.', return: clean(updatedReturn) });
        }

        // Move to Processing
        if (action === 'process-status') {
          const body = await request.json().catch(() => ({}));
          const targetStatus = body.status || 'PROCESSING';
          const now = new Date();

          await db.collection('returns').updateOne(
            { id: rDoc.id },
            {
              $set: {
                returnStatus: targetStatus,
                updatedAt: now
              }
            }
          );
          await db.collection('orders').updateOne(
            { id: rDoc.orderId },
            { $set: { returnStatus: targetStatus, updatedAt: now } }
          );

          await createAuditLog(db, {
            returnId: rDoc.id,
            orderId: rDoc.orderId,
            action: 'return_moved_to_processing',
            performedBy: admin.id,
            oldStatus: rDoc.returnStatus,
            newStatus: targetStatus
          });

          const updatedReturn = await db.collection('returns').findOne({ id: rDoc.id });
          return ok({ message: `Return status updated to ${targetStatus}.`, return: clean(updatedReturn) });
        }

        // Initiate / Retry Refund
        if (action === 'refund') {
          if (!hasPermission(admin, 'payments.refund')) return err('Permission denied: payments.refund required', 403);
          if (!['APPROVED', 'RETURN_APPROVED', 'REFUND_DETAILS_SUBMITTED', 'PROCESSING', 'REFUND_INITIATED'].includes(rDoc.returnStatus)) {
            return err(`Refund cannot be initiated for return with status "${rDoc.returnStatus}". Return must be approved first.`, 400);
          }

          if (rDoc.refundStatus === 'COMPLETED') {
            return err('Refund has already been completed. Duplicate refunds are prohibited.', 400);
          }

          const now = new Date();
          const isRetry = rDoc.refundStatus === 'FAILED';

          await createAuditLog(db, {
            returnId: rDoc.id,
            orderId: rDoc.orderId,
            action: isRetry ? 'refund_retried' : 'refund_initiated',
            performedBy: admin.id,
            oldStatus: rDoc.refundStatus,
            newStatus: 'PROCESSING'
          });

          let gatewayRefundId = rDoc.gatewayRefundId;
          let refundStatus = 'COMPLETED';
          let refundFailureReason = null;

          try {
            const currentSettings = await db.collection('site_settings').findOne({ id: 'default' });
            const effectiveKeyId = (currentSettings?.paymentSettings?.razorpay?.keyId && currentSettings.paymentSettings.razorpay.keyId.trim()) || process.env.RAZORPAY_KEY_ID;
            const effectiveKeySecret = (currentSettings?.paymentSettings?.razorpay?.keySecret && currentSettings.paymentSettings.razorpay.keySecret.trim()) || process.env.RAZORPAY_KEY_SECRET;

            const isMockPayment = !order?.razorpayPaymentId || order.razorpayPaymentId.startsWith('pay_MOCK') || order.razorpayPaymentId.startsWith('pay_TEST');
            if (order && order.payment === 'razorpay' && order.razorpayPaymentId && !isMockPayment && effectiveKeySecret && effectiveKeyId) {
              const authHeader = 'Basic ' + Buffer.from(`${effectiveKeyId}:${effectiveKeySecret}`).toString('base64');
              const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${order.razorpayPaymentId}/refund`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': authHeader,
                  'X-Razorpay-Idempotency-Key': rDoc.id
                },
                body: JSON.stringify({
                  amount: rDoc.refundAmount * 100, // in paise
                  notes: { returnId: rDoc.id, orderNumber: order?.orderNumber },
                  receipt: `ref_${rDoc.id}`
                })
              });
              const rzpData = await rzpRes.json().catch(() => ({}));
              if (!rzpRes.ok) {
                throw new Error(rzpData.error?.description || `Razorpay Refund API HTTP ${rzpRes.status}`);
              }
              gatewayRefundId = rzpData.id;
            } else {
              gatewayRefundId = gatewayRefundId || `rfnd_MOCK_${uuidv4().slice(0, 12)}`;
            }
          } catch (gatewayErr) {
            console.error('Refund gateway error:', gatewayErr);
            refundStatus = 'FAILED';
            refundFailureReason = gatewayErr.message || 'Payment gateway refund API call failed.';
          }

          const finalReturnStatus = refundStatus === 'COMPLETED' ? 'REFUNDED' : rDoc.returnStatus;

          await db.collection('returns').updateOne(
            { id: rDoc.id },
            {
              $set: {
                refundStatus,
                returnStatus: finalReturnStatus,
                refundId: `ref_${rDoc.id}`,
                gatewayRefundId,
                refundRequestedAt: rDoc.refundRequestedAt || now,
                refundProcessedAt: refundStatus === 'COMPLETED' ? now : null,
                refundFailureReason,
                updatedAt: now
              }
            }
          );
          await db.collection('orders').updateOne(
            { id: rDoc.orderId },
            { $set: { returnStatus: finalReturnStatus, refundStatus, updatedAt: now } }
          );

          await createAuditLog(db, {
            returnId: rDoc.id,
            orderId: rDoc.orderId,
            action: refundStatus === 'COMPLETED' ? 'refund_completed' : 'refund_failed',
            performedBy: admin.id,
            oldStatus: 'PROCESSING',
            newStatus: refundStatus,
            reason: refundFailureReason,
            metadata: { gatewayRefundId, refundAmount: rDoc.refundAmount }
          });

          const updatedReturn = await db.collection('returns').findOne({ id: rDoc.id });

          if (refundStatus === 'COMPLETED') {
            await sendRefundCompletedNotification({ returnReq: updatedReturn, order, user: userDoc, db });
          }

          return ok({
            message: refundStatus === 'COMPLETED' ? 'Refund processed successfully.' : 'Refund failed.',
            return: clean(updatedReturn)
          });
        }

        // Inventory classification & restocking
        if (action === 'inventory') {
          const body = await request.json().catch(() => ({}));
          const classification = body.classification;
          const ALLOWED_CLASSIFICATIONS = ['Resellable', 'Damaged', 'Defective', 'Not Resellable'];

          if (!classification || !ALLOWED_CLASSIFICATIONS.includes(classification)) {
            return err('Please select a valid inventory classification (Resellable, Damaged, Defective, Not Resellable).', 400);
          }

          if (rDoc.inventoryRestocked) {
            return err('Inventory for this return has already been processed and cannot be restocked twice.', 400);
          }

          const now = new Date();
          let stockRestockedCount = 0;

          if (classification === 'Resellable' && Array.isArray(rDoc.items)) {
            for (const item of rDoc.items) {
              if (item.id && item.returnQty > 0) {
                await db.collection('products').updateOne(
                  { id: item.id },
                  { $inc: { stock: item.returnQty } }
                );
                stockRestockedCount += item.returnQty;
              }
            }
            cacheBust('products:');
          }

          await db.collection('returns').updateOne(
            { id: rDoc.id },
            {
              $set: {
                inventoryStatus: 'PROCESSED',
                inventoryClassification: classification,
                inventoryRestocked: true,
                updatedAt: now
              }
            }
          );

          await createAuditLog(db, {
            returnId: rDoc.id,
            orderId: rDoc.orderId,
            action: 'inventory_updated',
            performedBy: admin.id,
            oldStatus: rDoc.inventoryStatus,
            newStatus: 'PROCESSED',
            reason: `Classified as ${classification}`,
            metadata: { classification, stockRestockedCount }
          });

          const updatedReturn = await db.collection('returns').findOne({ id: rDoc.id });
          return ok({
            message: `Inventory classified as ${classification}.${classification === 'Resellable' ? ` ${stockRestockedCount} item(s) restocked.` : ' Items not returned to available stock.'}`,
            return: clean(updatedReturn)
          });
        }
      }

      if (sub.startsWith('returns/') && method === 'GET') {
        const parts = sub.split('/'); // ['returns', '<id>', 'audit-logs']
        const id = parts[1];
        const subRes = parts[2];
        if (subRes === 'audit-logs') {
          const logs = await db.collection('audit_logs').find({ returnId: id }).sort({ timestamp: -1 }).toArray();
          return ok({ auditLogs: logs.map(clean) });
        }
      }

    }

    return err(`Route ${route} not found`, 404)
  } catch (e) {
    console.error('API Error:', e);
    const msg = String(e?.message || e);
    if (msg.includes('SSL') || msg.includes('topology') || msg.includes('pool') || msg.includes('connection') || msg.includes('timed out') || msg.includes('Primary')) {
      connectPromise = null;
      try { if (client) client.close(); } catch (_) {}
    }
    return err('Internal server error: ' + msg, 500);
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
