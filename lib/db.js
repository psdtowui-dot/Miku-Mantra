import { MongoClient } from 'mongodb';
import dns from 'dns';

const DIRECT_MONGO_FALLBACK = "mongodb://akashsriv1984_db_user:2M5Edv773XLUmT15@ac-htqrxv1-shard-00-00.7szyylz.mongodb.net:27017,ac-htqrxv1-shard-00-01.7szyylz.mongodb.net:27017,ac-htqrxv1-shard-00-02.7szyylz.mongodb.net:27017/userPortal?ssl=true&replicaSet=atlas-1c5jr9-shard-0&authSource=admin&retryWrites=true&w=majority";

const MONGO_POOL_OPTIONS = {
  tls: true,
  minPoolSize: 10,
  maxPoolSize: 50,
  maxIdleTimeMS: 120000,
  connectTimeoutMS: 5000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 30000,
  compressors: ['zlib'],
  retryWrites: true,
  retryReads: true
};

/**
 * Returns the cached MongoDB client, or creates a pooled connection.
 * Caches instance on globalThis to persist across Next.js dev reloads and serverless scopes.
 */
export async function getMongoClient() {
  if (globalThis._mongoClient) {
    return globalThis._mongoClient;
  }

  if (!globalThis._mongoConnectPromise) {
    globalThis._mongoConnectPromise = (async () => {
      try {
        dns.setServers(['8.8.8.8', '1.1.1.1']);
      } catch (_) {}

      const directUrl = process.env.MONGO_DIRECT_URL || DIRECT_MONGO_FALLBACK;
      const srvUrl = process.env.MONGO_URL || process.env.MONGODB_URI;
      const mongoUrl = process.env.MONGO_DIRECT_URL || directUrl || srvUrl;

      let clientInstance = null;
      try {
        clientInstance = new MongoClient(mongoUrl, MONGO_POOL_OPTIONS);
        await clientInstance.connect();
      } catch (err) {
        if (clientInstance) {
          try { await clientInstance.close(true); } catch (_) {}
          clientInstance = null;
        }
        if (directUrl && mongoUrl !== directUrl) {
          console.warn('[MongoDB] Initial connection failed, falling back to direct replica set...');
          clientInstance = new MongoClient(directUrl, MONGO_POOL_OPTIONS);
          await clientInstance.connect();
        } else {
          throw err;
        }
      }

      globalThis._mongoClient = clientInstance;
      globalThis._mongoDb = clientInstance.db(process.env.DB_NAME || 'userPortal');
      
      // Ensure indexes asynchronously in background without blocking requests
      ensureAppIndexes(globalThis._mongoDb).catch(e => {
        console.warn('[MongoDB] Index creation notice:', e.message);
      });

      return clientInstance;
    })().catch(err => {
      globalThis._mongoConnectPromise = null;
      globalThis._mongoClient = null;
      globalThis._mongoDb = null;
      throw err;
    });
  }

  return globalThis._mongoConnectPromise;
}

/**
 * Returns the connected MongoDB database instance immediately if already connected.
 */
export async function getDb() {
  if (globalThis._mongoDb) {
    return globalThis._mongoDb;
  }
  await getMongoClient();
  return globalThis._mongoDb;
}

/**
 * Synchronous/fast getter if already connected, else null.
 */
export function getDbIfConnected() {
  return globalThis._mongoDb || null;
}

/**
 * Ensures all high-performance indexes exist across MongoDB collections.
 */
export async function ensureAppIndexes(database) {
  if (!database || globalThis._mongoIndexesCreated) return;
  globalThis._mongoIndexesCreated = true;

  try {
    await Promise.allSettled([
      // Sessions
      database.collection('sessions').createIndex({ token: 1 }),
      database.collection('sessions').createIndex({ userId: 1 }),
      database.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),

      // Users
      database.collection('users').createIndex({ id: 1 }, { unique: true }),
      database.collection('users').createIndex({ email: 1 }),
      database.collection('users').createIndex({ role: 1 }),

      // Products
      database.collection('products').createIndex({ id: 1 }),
      database.collection('products').createIndex({ slug: 1 }),
      database.collection('products').createIndex({ category: 1, createdAt: -1 }),
      database.collection('products').createIndex({ collection: 1, createdAt: -1 }),
      database.collection('products').createIndex({ gender: 1, createdAt: -1 }),
      database.collection('products').createIndex({ active: 1, isDemoProduct: 1, status: 1, category: 1, price: 1, createdAt: -1 }),
      database.collection('products').createIndex({ active: 1, isDemoProduct: 1, status: 1, collection: 1, price: 1, createdAt: -1 }),
      database.collection('products').createIndex({ active: 1, isDemoProduct: 1, status: 1, gender: 1, price: 1, createdAt: -1 }),
      database.collection('products').createIndex({ slug: 1, active: 1, isDemoProduct: 1 }),
      database.collection('products').createIndex({ price: 1 }),
      database.collection('products').createIndex({ rating: -1, reviews: -1 }),
      database.collection('products').createIndex({ sku: 1 }),
      database.collection('products').createIndex({ createdAt: -1 }),

      // Orders
      database.collection('orders').createIndex({ id: 1 }),
      database.collection('orders').createIndex({ orderNumber: 1 }),
      database.collection('orders').createIndex({ userId: 1, placedAt: -1 }),
      database.collection('orders').createIndex({ customerEmail: 1, placedAt: -1 }),
      database.collection('orders').createIndex({ status: 1, placedAt: -1 }),
      database.collection('orders').createIndex({ placedAt: -1 }),
      database.collection('orders').createIndex({ 'items.id': 1 }),
      database.collection('orders').createIndex({ 'items.slug': 1 }),

      // Reviews
      database.collection('reviews').createIndex({ productId: 1, status: 1, createdAt: -1 }),
      database.collection('reviews').createIndex({ productSlug: 1, status: 1, createdAt: -1 }),
      database.collection('reviews').createIndex({ userId: 1, createdAt: -1 }),
      database.collection('reviews').createIndex({ orderId: 1, productId: 1 }),

      // Returns
      database.collection('returns').createIndex({ id: 1 }),
      database.collection('returns').createIndex({ userId: 1, createdAt: -1 }),
      database.collection('returns').createIndex({ orderId: 1 }),
      database.collection('returns').createIndex({ status: 1, createdAt: -1 }),

      // Addresses
      database.collection('addresses').createIndex({ userId: 1, createdAt: -1 }),
      database.collection('addresses').createIndex({ id: 1, userId: 1 }),

      // Cart & Wishlist
      database.collection('cart').createIndex({ userId: 1 }),
      database.collection('wishlist').createIndex({ userId: 1, productId: 1 }, { unique: true }),

      // Coupons & Categories & Collections
      database.collection('coupons').createIndex({ code: 1 }),
      database.collection('categories').createIndex({ id: 1 }),
      database.collection('categories').createIndex({ slug: 1 }),
      database.collection('categories').createIndex({ active: 1, enabled: 1, order: 1 }),
      database.collection('collections').createIndex({ id: 1 }),
      database.collection('collections').createIndex({ slug: 1 }),

      // Media / Uploads
      database.collection('uploads').createIndex({ filename: 1 }),

      // Newsletter
      database.collection('newsletter_subscribers').createIndex({ email: 1 }, { unique: true }),
      database.collection('newsletter_subscribers').createIndex({ status: 1 }),
      database.collection('newsletter_subscribers').createIndex({ subscribedAt: -1 }),

      // Logs & Settings
      database.collection('activity_logs').createIndex({ timestamp: -1 }),
      database.collection('admin_activity_logs').createIndex({ timestamp: -1 }),
      database.collection('audit_logs').createIndex({ timestamp: -1 }),
      database.collection('password_resets').createIndex({ email: 1, code: 1 }),
      database.collection('password_resets').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      database.collection('email_verifications').createIndex({ email: 1, code: 1 }),
      database.collection('email_verifications').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
    ]);
  } catch (e) {
    console.warn('[MongoDB] Index creation notice:', e.message);
  }
}
