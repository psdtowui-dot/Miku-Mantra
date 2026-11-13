/**
 * Server-Side GA4 Measurement Protocol Service
 *
 * Implements reliable, idempotent server-side purchase and refund tracking
 * using MongoDB for transaction deduplication and outbox logging.
 *
 * Exclusively executes in Node.js server environment. Secrets remain private.
 */

import crypto from 'crypto';

const GA4_MP_URL = 'https://www.google-analytics.com/mp/collect';

/**
 * Format items for GA4 server-side payload
 */
function formatServerItems(items = []) {
  if (!Array.isArray(items)) return [];
  return items.map((it, idx) => ({
    item_id: String(it.id || it.slug || it.sku || ''),
    item_name: String(it.name || '').trim(),
    price: Number(it.price || 0),
    quantity: Math.max(1, parseInt(it.qty || it.quantity || 1, 10)),
    index: idx + 1,
  }));
}

/**
 * Generates a privacy-safe fallback client_id if not captured from browser
 */
function generateFallbackClientId(orderId) {
  const hash = crypto.createHash('sha256').update(String(orderId)).digest('hex');
  return `${hash.slice(0, 10)}.${hash.slice(10, 20)}`;
}

/**
 * Send an event to Google Analytics 4 via Measurement Protocol
 *
 * @param {Object} options
 * @param {import('mongodb').Db} options.db MongoDB database instance
 * @param {string} options.eventName Event name ('purchase' | 'refund')
 * @param {string} options.transactionId Unique order number or refund ID
 * @param {Object} options.eventParams Parameters for GA4 event
 * @param {string} [options.clientId] Optional client_id from browser
 * @param {string} [options.sessionId] Optional ga_session_id from browser
 */
export async function sendServerAnalyticsEvent({
  db,
  eventName,
  transactionId,
  eventParams,
  clientId,
  sessionId,
}) {
  if (!db || !eventName || !transactionId) {
    return { success: false, reason: 'missing_required_parameters' };
  }

  const measurementId = process.env.GA4_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;

  const eventDocId = `evt_${eventName}_${transactionId}`;

  // 1. Transaction-level Idempotency Check in MongoDB
  try {
    const existing = await db.collection('analytics_events').findOne({
      transactionId,
      eventName,
      status: 'sent',
    });

    if (existing) {
      return { success: true, skipped: true, reason: 'already_sent' };
    }
  } catch (dbErr) {
    console.warn('[Analytics Server] Idempotency check warning:', dbErr.message);
  }

  // If credentials are not configured, log to outbox and skip network delivery gracefully
  if (!measurementId || !apiSecret) {
    try {
      await db.collection('analytics_events').updateOne(
        { id: eventDocId },
        {
          $set: {
            id: eventDocId,
            transactionId,
            eventName,
            status: 'unconfigured_skipped',
            note: 'GA4_MEASUREMENT_ID or GA4_API_SECRET environment variable not provided',
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
    } catch {}
    return { success: false, reason: 'unconfigured_credentials' };
  }

  // 2. Prepare payload
  const effectiveClientId = clientId || generateFallbackClientId(transactionId);
  const params = {
    ...eventParams,
  };

  if (sessionId) {
    params.ga_session_id = sessionId;
  }

  const payload = {
    client_id: effectiveClientId,
    events: [
      {
        name: eventName,
        params,
      },
    ],
  };

  // 3. Dispatch to GA4 Measurement Protocol
  const endpoint = `${GA4_MP_URL}?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const isSuccess = response.status === 204 || response.status === 200;

    // 4. Update outbox record
    await db.collection('analytics_events').updateOne(
      { id: eventDocId },
      {
        $set: {
          id: eventDocId,
          transactionId,
          eventName,
          status: isSuccess ? 'sent' : 'failed',
          httpStatus: response.status,
          payload,
          sentAt: new Date(),
          updatedAt: new Date(),
        },
        $inc: { attempts: 1 },
      },
      { upsert: true }
    );

    return { success: isSuccess, status: response.status };
  } catch (networkErr) {
    console.error('[Analytics Server] Measurement Protocol network error:', networkErr.message);

    try {
      await db.collection('analytics_events').updateOne(
        { id: eventDocId },
        {
          $set: {
            id: eventDocId,
            transactionId,
            eventName,
            status: 'failed',
            error: networkErr.message,
            updatedAt: new Date(),
          },
          $inc: { attempts: 1 },
        },
        { upsert: true }
      );
    } catch {}

    return { success: false, error: networkErr.message };
  }
}

/**
 * Server-side purchase milestone tracker
 *
 * @param {Object} options
 * @param {import('mongodb').Db} options.db
 * @param {Object} options.order Order record from MongoDB
 * @param {string} [options.clientId]
 * @param {string} [options.sessionId]
 */
export async function trackServerPurchase({ db, order, clientId, sessionId }) {
  if (!order) return;

  const transactionId = String(order.orderNumber || order.id);
  const amounts = order.amounts || {};
  const total = Number(amounts.total || order.total || 0);
  const shipping = Number(amounts.shipping || 0);
  const tax = Number(amounts.tax || 0);
  const items = formatServerItems(order.items || []);

  const eventParams = {
    transaction_id: transactionId,
    value: total,
    currency: 'INR',
    shipping,
    tax,
    items,
  };

  if (order.coupon) {
    eventParams.coupon = String(order.coupon);
  }

  return sendServerAnalyticsEvent({
    db,
    eventName: 'purchase',
    transactionId,
    eventParams,
    clientId,
    sessionId,
  });
}

/**
 * Server-side refund milestone tracker
 *
 * @param {Object} options
 * @param {import('mongodb').Db} options.db
 * @param {string} options.transactionId Order number or refund reference
 * @param {number} options.refundAmount Total refund amount in INR
 * @param {Array} [options.items] Refunded items
 */
export async function trackServerRefund({ db, transactionId, refundAmount, items = [] }) {
  const eventParams = {
    transaction_id: String(transactionId),
    value: Number(refundAmount || 0),
    currency: 'INR',
    items: formatServerItems(items),
  };

  return sendServerAnalyticsEvent({
    db,
    eventName: 'refund',
    transactionId: `rfnd_${transactionId}_${Date.now()}`,
    eventParams,
  });
}
