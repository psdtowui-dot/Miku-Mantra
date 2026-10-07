import { v4 as uuidv4 } from 'uuid';

/**
 * Send WhatsApp and SMS notification for new order placement.
 */
export async function sendOrderPlacedNotification({ order, user, db }) {
  if (!order || !db) return;
  const recipientPhone = order.address?.phone || user?.phone || '';
  const customerName = order.address?.fullName || user?.name || 'Valued Customer';
  const orderNumber = order.orderNumber;
  const amount = order.amounts?.total || 0;
  const paymentMethod = order.payment === 'cod' ? 'Cash on Delivery' : (order.payment || 'Online Payment');

  // Send WhatsApp
  await sendChannelNotification({
    db,
    orderId: order.id,
    type: 'order_placed',
    channel: 'whatsapp',
    recipientPhone,
    messagePayload: {
      text: `MikuMantra Order Confirmed\n\nHi ${customerName},\n\nYour order #${orderNumber} has been successfully placed.\n\nOrder Amount: ₹${amount}\nPayment Method: ${paymentMethod}\n\nWe will notify you when your order is processed.\n\nThank you for shopping with MikuMantra.`
    },
    sendFn: async () => {
      const url = process.env.WHATSAPP_API_URL;
      const key = process.env.WHATSAPP_API_KEY;
      if (!url || !key) {
        return { mock: true, provider: 'mock_whatsapp', message: 'Credentials not configured, logged mock notification.' };
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: recipientPhone.replace(/[^0-9]/g, ''),
          type: 'text',
          text: { body: `MikuMantra Order Confirmed: Hi ${customerName}, your order #${orderNumber} (₹${amount}) has been placed.` }
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error?.message || `WhatsApp API HTTP ${res.status}`);
      return data;
    }
  });

  // Send SMS
  await sendChannelNotification({
    db,
    orderId: order.id,
    type: 'order_placed',
    channel: 'sms',
    recipientPhone,
    messagePayload: {
      text: `MikuMantra: Your order #${orderNumber} has been successfully placed. Order amount: ₹${amount}. Thank you for shopping with us.`
    },
    sendFn: async () => {
      const url = process.env.SMS_API_URL;
      const key = process.env.SMS_API_KEY;
      if (!url || !key) {
        return { mock: true, provider: 'mock_sms', message: 'Credentials not configured, logged mock notification.' };
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': key
        },
        body: JSON.stringify({
          to: recipientPhone.replace(/[^0-9]/g, ''),
          message: `MikuMantra: Your order #${orderNumber} has been successfully placed. Order amount: ₹${amount}. Thank you for shopping with us.`
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `SMS API HTTP ${res.status}`);
      return data;
    }
  });

  // Send Push Notification to registered mobile devices
  if (order.userId) {
    await sendPushNotification({
      db,
      userId: order.userId,
      title: 'Order Confirmed! 💎',
      body: `Your order #${orderNumber} (₹${amount}) has been placed.`,
      data: { orderId: order.id, orderNumber, type: 'order_placed' }
    });
  }
}

/**
 * Send WhatsApp and SMS notification for order cancellation.
 */
export async function sendOrderCancelledNotification({ order, user, db }) {
  if (!order || !db) return;
  const recipientPhone = order.address?.phone || user?.phone || '';
  const customerName = order.address?.fullName || user?.name || 'Valued Customer';
  const orderNumber = order.orderNumber;
  const amount = order.amounts?.total || 0;
  const reason = order.cancellationReason || 'Requested by customer';
  const refundStatus = order.payment === 'cod'
    ? 'No refund applicable (Cash on Delivery)'
    : (order.refundStatus === 'refund_initiated' ? 'Refund Initiated' : (order.refundStatus || 'Refund Initiated'));

  // Send WhatsApp
  await sendChannelNotification({
    db,
    orderId: order.id,
    type: 'order_cancelled',
    channel: 'whatsapp',
    recipientPhone,
    messagePayload: {
      text: `MikuMantra Order Cancelled\n\nHi ${customerName},\n\nYour order #${orderNumber} has been cancelled successfully.\n\nCancellation Reason: ${reason}\nOrder Amount: ₹${amount}\n\nRefund Status: ${refundStatus}\n\nThank you,\nMikuMantra`
    },
    sendFn: async () => {
      const url = process.env.WHATSAPP_API_URL;
      const key = process.env.WHATSAPP_API_KEY;
      if (!url || !key) {
        return { mock: true, provider: 'mock_whatsapp', message: 'Credentials not configured, logged mock notification.' };
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: recipientPhone.replace(/[^0-9]/g, ''),
          type: 'text',
          text: { body: `MikuMantra Order Cancelled: Hi ${customerName}, order #${orderNumber} (₹${amount}) was cancelled. Refund status: ${refundStatus}` }
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error?.message || `WhatsApp API HTTP ${res.status}`);
      return data;
    }
  });

  // Send SMS
  await sendChannelNotification({
    db,
    orderId: order.id,
    type: 'order_cancelled',
    channel: 'sms',
    recipientPhone,
    messagePayload: {
      text: order.payment === 'cod'
        ? `MikuMantra: Your COD order #${orderNumber} has been cancelled successfully. No refund is applicable.`
        : `MikuMantra: Your order #${orderNumber} has been cancelled successfully. Refund status: ${refundStatus}.`
    },
    sendFn: async () => {
      const url = process.env.SMS_API_URL;
      const key = process.env.SMS_API_KEY;
      if (!url || !key) {
        return { mock: true, provider: 'mock_sms', message: 'Credentials not configured, logged mock notification.' };
      }
      const smsBody = order.payment === 'cod'
        ? `MikuMantra: Your COD order #${orderNumber} has been cancelled successfully. No refund is applicable.`
        : `MikuMantra: Your order #${orderNumber} has been cancelled successfully. Refund status: ${refundStatus}.`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': key
        },
        body: JSON.stringify({
          to: recipientPhone.replace(/[^0-9]/g, ''),
          message: smsBody
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `SMS API HTTP ${res.status}`);
      return data;
    }
  });

  // Send Push Notification to registered mobile devices
  if (order.userId) {
    await sendPushNotification({
      db,
      userId: order.userId,
      title: 'Order Cancelled',
      body: `Your order #${orderNumber} has been cancelled.`,
      data: { orderId: order.id, orderNumber, type: 'order_cancelled' }
    });
  }
}

/**
 * Send notification for return request creation.
 */
export async function sendReturnRequestedNotification({ returnReq, order, user, db }) {
  if (!returnReq || !order || !db) return;
  const recipientPhone = order.address?.phone || user?.phone || '';
  const customerName = order.address?.fullName || user?.name || 'Valued Customer';
  const orderNumber = order.orderNumber;
  const amount = returnReq.refundAmount || 0;

  await sendChannelNotification({
    db,
    orderId: order.id,
    type: 'return_requested',
    channel: 'whatsapp',
    recipientPhone,
    messagePayload: { text: `Hi ${customerName}, your return request for order #${orderNumber} (Est. Refund ₹${amount}) has been received and is under review.` },
    sendFn: async () => ({ mock: true, message: 'Return requested notification logged.' })
  });

  await sendChannelNotification({
    db,
    orderId: order.id,
    type: 'return_requested',
    channel: 'sms',
    recipientPhone,
    messagePayload: { text: `MikuMantra: Return request for order #${orderNumber} submitted. Est. refund: ₹${amount}. We will update you shortly.` },
    sendFn: async () => ({ mock: true, message: 'Return requested SMS logged.' })
  });
}

/**
 * Send notification for return request approval.
 */
export async function sendReturnApprovedNotification({ returnReq, order, user, db }) {
  if (!returnReq || !order || !db) return;
  const recipientPhone = order.address?.phone || user?.phone || '';
  const customerName = order.address?.fullName || user?.name || 'Valued Customer';
  const orderNumber = order.orderNumber;
  const amount = returnReq.refundAmount || 0;

  await sendChannelNotification({
    db,
    orderId: order.id,
    type: 'return_approved',
    channel: 'whatsapp',
    recipientPhone,
    messagePayload: { text: `Hi ${customerName}, your return request for order #${orderNumber} has been approved! Refund of ₹${amount} will be processed.` },
    sendFn: async () => ({ mock: true, message: 'Return approved notification logged.' })
  });

  await sendChannelNotification({
    db,
    orderId: order.id,
    type: 'return_approved',
    channel: 'sms',
    recipientPhone,
    messagePayload: { text: `MikuMantra: Your return request for order #${orderNumber} is approved. Refund amount: ₹${amount}.` },
    sendFn: async () => ({ mock: true, message: 'Return approved SMS logged.' })
  });
}

/**
 * Send notification for return request rejection.
 */
export async function sendReturnRejectedNotification({ returnReq, order, user, db }) {
  if (!returnReq || !order || !db) return;
  const recipientPhone = order.address?.phone || user?.phone || '';
  const customerName = order.address?.fullName || user?.name || 'Valued Customer';
  const orderNumber = order.orderNumber;
  const reason = returnReq.rejectionReason || 'Not eligible for return';

  await sendChannelNotification({
    db,
    orderId: order.id,
    type: 'return_rejected',
    channel: 'whatsapp',
    recipientPhone,
    messagePayload: { text: `Hi ${customerName}, your return request for order #${orderNumber} was not approved. Reason: ${reason}` },
    sendFn: async () => ({ mock: true, message: 'Return rejected notification logged.' })
  });

  await sendChannelNotification({
    db,
    orderId: order.id,
    type: 'return_rejected',
    channel: 'sms',
    recipientPhone,
    messagePayload: { text: `MikuMantra: Your return request for order #${orderNumber} was rejected. Reason: ${reason}` },
    sendFn: async () => ({ mock: true, message: 'Return rejected SMS logged.' })
  });
}

/**
 * Send notification for refund completion.
 */
export async function sendRefundCompletedNotification({ returnReq, order, user, db }) {
  if (!returnReq || !order || !db) return;
  const recipientPhone = order.address?.phone || user?.phone || '';
  const customerName = order.address?.fullName || user?.name || 'Valued Customer';
  const orderNumber = order.orderNumber;
  const amount = returnReq.refundAmount || 0;
  const refundId = returnReq.gatewayRefundId || returnReq.refundId || '';

  await sendChannelNotification({
    db,
    orderId: order.id,
    type: 'refund_completed',
    channel: 'whatsapp',
    recipientPhone,
    messagePayload: { text: `Hi ${customerName}, your refund of ₹${amount} for order #${orderNumber} has been successfully processed! (Ref: ${refundId})` },
    sendFn: async () => ({ mock: true, message: 'Refund completed notification logged.' })
  });

  await sendChannelNotification({
    db,
    orderId: order.id,
    type: 'refund_completed',
    channel: 'sms',
    recipientPhone,
    messagePayload: { text: `MikuMantra: Refund of ₹${amount} for order #${orderNumber} completed. Refund Ref: ${refundId}.` },
    sendFn: async () => ({ mock: true, message: 'Refund completed SMS logged.' })
  });
}

/**
 * Generic helper to send and log channel notification with deduplication and error safety.
 */
async function sendChannelNotification({ db, orderId, type, channel, recipientPhone, messagePayload, sendFn }) {
  try {
    const existing = await db.collection('notifications').findOne({ orderId, type, channel });
    if (existing && (existing.status === 'SENT' || existing.status === 'MOCK_SENT')) {
      return; // Skip duplicate notification
    }

    let status = 'SENT';
    let providerResp = null;
    let errorMsg = null;

    try {
      providerResp = await sendFn();
      if (providerResp?.mock) {
        status = 'MOCK_SENT';
      }
    } catch (err) {
      status = 'FAILED';
      errorMsg = String(err?.message || err);
      console.error(`[Notifications] Failed to send ${channel} for order ${orderId}:`, errorMsg);
    }

    const notificationDoc = {
      id: uuidv4(),
      orderId,
      type,
      channel,
      recipientPhone,
      messagePayload,
      status,
      errorMsg,
      providerResponse: providerResp,
      createdAt: new Date()
    };

    if (existing) {
      await db.collection('notifications').updateOne({ id: existing.id }, { $set: notificationDoc });
    } else {
      await db.collection('notifications').insertOne(notificationDoc);
    }
  } catch (err) {
    console.error(`[Notifications] Exception during notification tracking:`, err);
  }
}

/**
 * Send FCM push notification to user's registered Android devices.
 */
export async function sendPushNotification({ db, userId, title, body, data = {} }) {
  if (!db || !userId) return;
  try {
    const devices = await db.collection('device_tokens').find({ userId }).toArray();
    if (!devices || devices.length === 0) return;

    for (const dev of devices) {
      await sendChannelNotification({
        db,
        orderId: data.orderId || null,
        type: data.type || 'push_notification',
        channel: 'push',
        recipientPhone: dev.token,
        messagePayload: { title, body, data },
        sendFn: async () => {
          const fcmKey = process.env.FCM_SERVER_KEY;
          if (fcmKey) {
            const res = await fetch('https://fcm.googleapis.com/fcm/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `key=${fcmKey}`
              },
              body: JSON.stringify({
                to: dev.token,
                notification: { title, body },
                data
              })
            });
            return await res.json().catch(() => ({}));
          }
          return { mock: true, provider: 'fcm_mock', message: 'Logged push notification.' };
        }
      });
    }
  } catch (err) {
    console.error('[Notifications] Failed to send push notification:', err);
  }
}

