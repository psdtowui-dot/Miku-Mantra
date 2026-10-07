import { v4 as uuidv4 } from 'uuid';
import { sendOrderShippedEmail } from './email-service';

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
  const source = (order.cancelledBy || '').toLowerCase();
  const isMikuMantra = source === 'admin' || source === 'mikumantra';
  const cancellationAttribution = isMikuMantra ? 'cancelled by MikuMantra' : (source === 'customer' ? 'cancelled by customer' : 'cancelled');
  const reason = order.cancellationReason || (isMikuMantra ? 'Cancelled by MikuMantra' : (source === 'customer' ? 'Cancelled by customer' : 'Order cancelled'));
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
      text: `MikuMantra Order Cancelled\n\nHi ${customerName},\n\nYour order #${orderNumber} has been ${cancellationAttribution}.\n\nCancellation Reason: ${reason}\nOrder Amount: ₹${amount}\n\nRefund Status: ${refundStatus}\n\nThank you,\nMikuMantra`
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
          text: { body: `MikuMantra Order Cancelled: Hi ${customerName}, order #${orderNumber} (₹${amount}) was ${cancellationAttribution}. Refund status: ${refundStatus}` }
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
        ? `MikuMantra: Your COD order #${orderNumber} has been ${cancellationAttribution}. No refund is applicable.`
        : `MikuMantra: Your order #${orderNumber} has been ${cancellationAttribution}. Refund status: ${refundStatus}.`
    },
    sendFn: async () => {
      const url = process.env.SMS_API_URL;
      const key = process.env.SMS_API_KEY;
      if (!url || !key) {
        return { mock: true, provider: 'mock_sms', message: 'Credentials not configured, logged mock notification.' };
      }
      const smsBody = order.payment === 'cod'
        ? `MikuMantra: Your COD order #${orderNumber} has been ${cancellationAttribution}. No refund is applicable.`
        : `MikuMantra: Your order #${orderNumber} has been ${cancellationAttribution}. Refund status: ${refundStatus}.`;
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
 * Send WhatsApp, SMS, and Email notification when order is shipped or tracking details are added/updated.
 */
export async function sendOrderShippedNotification({ order, user, db }) {
  if (!order || !db) return;
  const recipientPhone = order.address?.phone || user?.phone || '';
  const recipientEmail = order.customerEmail || order.guestEmail || user?.email || '';
  const customerName = order.address?.fullName || user?.name || 'Valued Customer';
  const orderNumber = order.orderNumber;
  const carrier = order.courier?.carrier || order.carrier || 'our verified courier partner';
  const trackingNumber = order.courier?.trackingNumber || order.trackingNumber || '';
  const trackingUrl = order.courier?.trackingUrl || order.trackingUrl || '';

  // 1. WhatsApp Notification
  const waBody = `MikuMantra Order Shipped 🚚\n\nHi ${customerName},\n\nYour fine jewellery order #${orderNumber} has been shipped via ${carrier}.${trackingNumber ? `\n\nAWB / Tracking Number: ${trackingNumber}` : ''}${trackingUrl ? `\nTrack your package: ${trackingUrl}` : ''}\n\nYour jewellery is fully transit-insured and packed in tamper-evident security packaging.\n\nThank you for choosing MikuMantra Fine Jewellery.`;

  await sendChannelNotification({
    db,
    orderId: order.id,
    type: 'order_shipped',
    channel: 'whatsapp',
    recipientPhone,
    messagePayload: {
      text: waBody,
      carrier,
      trackingNumber,
      trackingUrl
    },
    sendFn: async () => {
      const url = process.env.WHATSAPP_API_URL;
      const key = process.env.WHATSAPP_API_KEY;
      if (!url || !key) {
        return { mock: true, provider: 'mock_whatsapp', message: 'Credentials not configured, logged mock shipment WhatsApp.' };
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
          text: { body: `MikuMantra: Your order #${orderNumber} has shipped via ${carrier}.${trackingNumber ? ` AWB: ${trackingNumber}.` : ''}${trackingUrl ? ` Track: ${trackingUrl}` : ''}` }
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error?.message || `WhatsApp API HTTP ${res.status}`);
      return data;
    }
  });

  // 2. SMS Notification
  const smsBody = `MikuMantra: Your order #${orderNumber} has shipped via ${carrier}.${trackingNumber ? ` AWB: ${trackingNumber}.` : ''}${trackingUrl ? ` Track: ${trackingUrl}` : ''} Your package is fully insured.`;
  await sendChannelNotification({
    db,
    orderId: order.id,
    type: 'order_shipped',
    channel: 'sms',
    recipientPhone,
    messagePayload: {
      text: smsBody,
      carrier,
      trackingNumber,
      trackingUrl
    },
    sendFn: async () => {
      const url = process.env.SMS_API_URL;
      const key = process.env.SMS_API_KEY;
      if (!url || !key) {
        return { mock: true, provider: 'mock_sms', message: 'Credentials not configured, logged mock shipment SMS.' };
      }
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

  // 3. Email Notification
  if (recipientEmail) {
    await sendChannelNotification({
      db,
      orderId: order.id,
      type: 'order_shipped',
      channel: 'email',
      recipientPhone: recipientEmail,
      messagePayload: {
        toEmail: recipientEmail,
        carrier,
        trackingNumber,
        trackingUrl
      },
      sendFn: async () => {
        return await sendOrderShippedEmail({ toEmail: recipientEmail, order, user });
      }
    });
  }
}

/**
 * Generic helper to send and log channel notification with deduplication and error safety.
 */
async function sendChannelNotification({ db, orderId, type, channel, recipientPhone, messagePayload, sendFn }) {
  try {
    const existing = await db.collection('notifications').findOne({ orderId, type, channel });
    if (existing && (existing.status === 'SENT' || existing.status === 'MOCK_SENT')) {
      // If tracking number exists and matches previous notification, skip duplicate
      if (existing.messagePayload?.trackingNumber && existing.messagePayload.trackingNumber === messagePayload?.trackingNumber) {
        return; // Skip duplicate notification
      }
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

