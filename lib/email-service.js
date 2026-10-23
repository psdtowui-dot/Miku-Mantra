import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

function loadDiskEnv() {
  try {
    const envPaths = [
      path.join(process.cwd(), '.env'),
      path.join(process.cwd(), '.env.local')
    ];
    for (const p of envPaths) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf8');
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const m = trimmed.match(/^([A-Za-z0-9_]+)=(.*)$/);
            if (m) {
              const k = m[1].trim();
              const v = m[2].trim().replace(/^['"]|['"]$/g, '');
              if (!process.env[k] || !process.env[k].trim()) {
                process.env[k] = v;
              }
            }
          }
        }
      }
    }
  } catch (e) {}
}

/**
 * Global Default System Email Templates.
 * Each template can be customized, toggled, and previewed from the Admin Panel.
 */
export const DEFAULT_EMAIL_TEMPLATES = {
  order_confirmation: {
    id: 'order_confirmation',
    name: 'Customer Order Confirmation',
    category: 'Orders',
    description: 'Sent automatically to the customer immediately upon successful order placement.',
    isEnabled: true,
    subject: 'Order Confirmed: #{orderNumber} - {storeName}',
    previewText: 'Your {storeName} fine jewellery order #{orderNumber} is confirmed. View order summary & details.',
    heading: 'Thank You, {customerName}',
    subheading: '✓ Order Confirmed',
    bodyText: 'Your bespoke jewellery order has been received and confirmed. Our master artisans are now preparing your handcrafted jewellery with supreme precision.',
    ctaText: 'View Order Details ↗',
    ctaUrl: '{orderDetailsUrl}',
    bannerText: '✨ BIS Hallmarked 22K Gold · SGL Certified Diamonds · Insured Express Shipping',
    footerText: 'Need assistance with your heirloom selection? Reach out to our Jaipur atelier concierge at {supportEmail}.',
    placeholders: [
      { key: '{customerName}', description: 'Customer full name', sample: 'Priya Sharma' },
      { key: '{orderNumber}', description: 'Unique order identifier', sample: 'MM-2026-8821' },
      { key: '{orderDate}', description: 'Formatted order placement date', sample: '12 Oct 2026' },
      { key: '{total}', description: 'Total order price formatted', sample: '₹48,500' },
      { key: '{subtotal}', description: 'Items subtotal', sample: '₹45,000' },
      { key: '{discount}', description: 'Discount applied', sample: '₹2,000' },
      { key: '{shipping}', description: 'Shipping charge / Free', sample: 'FREE' },
      { key: '{tax}', description: 'GST / Tax charge', sample: '₹1,350' },
      { key: '{paymentMethod}', description: 'Payment method label', sample: 'Online Payment (Razorpay)' },
      { key: '{paymentStatus}', description: 'Payment status label', sample: 'Paid' },
      { key: '{shippingAddress}', description: 'Customer delivery address', sample: '402, Lotus Grandeur, Jaipur' },
      { key: '{carrier}', description: 'Courier partner name', sample: 'BlueDart Express' },
      { key: '{trackingNumber}', description: 'Courier AWB / tracking number', sample: 'BD-88219034' },
      { key: '{trackingUrl}', description: 'Courier tracking link', sample: 'https://track.bluedart.com' },
      { key: '{orderDetailsUrl}', description: 'Direct link to customer order status page', sample: 'https://mikumantra.com/orders/test' },
      { key: '{storeName}', description: 'Store brand name', sample: 'MikuMantra Fine Jewellery' },
      { key: '{supportEmail}', description: 'Concierge support email', sample: 'support@mikumantra.com' },
      { key: '{siteUrl}', description: 'Store website URL', sample: 'https://mikumantra.com' }
    ]
  },

  order_shipped: {
    id: 'order_shipped',
    name: 'Customer Shipment & Tracking',
    category: 'Orders',
    description: 'Sent to the customer when their order is dispatched with courier and live tracking details.',
    isEnabled: true,
    subject: 'Order #{orderNumber} Shipped via {carrier} - {storeName}',
    previewText: 'Your order #{orderNumber} is on its way via {carrier}. Track your delivery here.',
    heading: 'Your Order Has Shipped!',
    subheading: '🚚 On Its Way to You',
    bodyText: 'Dear {customerName},\n\nYour handcrafted jewellery order #{orderNumber} has shipped via {carrier}. Your jewellery has been packed in tamper-evident security packaging and is fully transit-insured until safely in your hands.',
    ctaText: 'Track Shipment ↗',
    ctaUrl: '{trackingUrl}',
    bannerText: '✨ BIS Hallmarked 22K Gold · SGL Certified Diamonds · Insured Express Shipping',
    footerText: 'For questions regarding your shipment or delivery schedule, please reach out to our Jaipur atelier concierge at {supportEmail}.',
    placeholders: [
      { key: '{customerName}', description: 'Customer full name', sample: 'Priya Sharma' },
      { key: '{orderNumber}', description: 'Unique order identifier', sample: 'MM-2026-8821' },
      { key: '{carrier}', description: 'Courier partner name', sample: 'BlueDart Express' },
      { key: '{trackingNumber}', description: 'Courier AWB / tracking number', sample: 'BD-88219034' },
      { key: '{trackingUrl}', description: 'Courier tracking link', sample: 'https://track.bluedart.com' },
      { key: '{total}', description: 'Total order price formatted', sample: '₹48,500' },
      { key: '{orderDetailsUrl}', description: 'Customer order link', sample: 'https://mikumantra.com/orders/test' },
      { key: '{storeName}', description: 'Store brand name', sample: 'MikuMantra Fine Jewellery' },
      { key: '{supportEmail}', description: 'Concierge support email', sample: 'support@mikumantra.com' },
      { key: '{siteUrl}', description: 'Store website URL', sample: 'https://mikumantra.com' }
    ]
  },

  order_processing: {
    id: 'order_processing',
    name: 'Customer Order Processing',
    category: 'Orders',
    description: 'Sent to the customer when their order is in production, quality inspection, and packaging.',
    isEnabled: true,
    subject: 'Order #{orderNumber} is Processing & Being Prepared - {storeName}',
    previewText: 'Great news! Your order #{orderNumber} is in production and being prepared by our Jaipur artisans.',
    heading: 'Your Jewellery is Being Prepared',
    subheading: '🔨 Processing & Preparation',
    bodyText: 'Dear {customerName},\n\nYour handcrafted fine jewellery order #{orderNumber} has entered processing. Our master artisans in Jaipur are carefully crafting, inspecting, hallmarking, and packaging your pieces with supreme precision.',
    ctaText: 'View Order Status ↗',
    ctaUrl: '{orderDetailsUrl}',
    bannerText: '✨ BIS Hallmarked 22K Gold · SGL Certified Diamonds · Insured Express Shipping',
    footerText: 'Have questions or bespoke requests? Reach out to our Jaipur atelier concierge at {supportEmail}.',
    placeholders: [
      { key: '{customerName}', description: 'Customer full name', sample: 'Priya Sharma' },
      { key: '{orderNumber}', description: 'Unique order identifier', sample: 'MM-2026-8821' },
      { key: '{orderDate}', description: 'Formatted order placement date', sample: '12 Oct 2026' },
      { key: '{status}', description: 'Current order status label', sample: 'Processing' },
      { key: '{total}', description: 'Total order price formatted', sample: '₹48,500' },
      { key: '{orderDetailsUrl}', description: 'Customer order link', sample: 'https://mikumantra.com/orders/test' },
      { key: '{storeName}', description: 'Store brand name', sample: 'MikuMantra Fine Jewellery' },
      { key: '{supportEmail}', description: 'Concierge support email', sample: 'support@mikumantra.com' },
      { key: '{siteUrl}', description: 'Store website URL', sample: 'https://mikumantra.com' }
    ]
  },

  order_out_for_delivery: {
    id: 'order_out_for_delivery',
    name: 'Customer Out for Delivery Alert',
    category: 'Orders',
    description: 'Sent on the day of delivery when the parcel is out with the local delivery executive.',
    isEnabled: true,
    subject: 'Out for Delivery: Your Order #{orderNumber} Arrives Today - {storeName}',
    previewText: 'Your order #{orderNumber} is out for delivery today via {carrier}.',
    heading: 'Your Package Arrives Today!',
    subheading: '📍 Out for Delivery',
    bodyText: 'Dear {customerName},\n\nYour order #{orderNumber} is out for delivery today with our verified logistics partner {carrier}. Please ensure an authorized recipient is available to receive and verify your tamper-evident parcel.',
    ctaText: 'Track Live Delivery ↗',
    ctaUrl: '{trackingUrl}',
    bannerText: '✨ Tamper-Evident Security Seal · Fully Transit Insured',
    footerText: 'Need to coordinate delivery details? Contact our atelier concierge at {supportEmail}.',
    placeholders: [
      { key: '{customerName}', description: 'Customer full name', sample: 'Priya Sharma' },
      { key: '{orderNumber}', description: 'Unique order identifier', sample: 'MM-2026-8821' },
      { key: '{carrier}', description: 'Courier partner name', sample: 'BlueDart Express' },
      { key: '{trackingNumber}', description: 'Courier AWB / tracking number', sample: 'BD-88219034' },
      { key: '{trackingUrl}', description: 'Courier tracking link', sample: 'https://track.bluedart.com' },
      { key: '{total}', description: 'Total order price formatted', sample: '₹48,500' },
      { key: '{orderDetailsUrl}', description: 'Customer order link', sample: 'https://mikumantra.com/orders/test' },
      { key: '{storeName}', description: 'Store brand name', sample: 'MikuMantra Fine Jewellery' },
      { key: '{supportEmail}', description: 'Concierge support email', sample: 'support@mikumantra.com' },
      { key: '{siteUrl}', description: 'Store website URL', sample: 'https://mikumantra.com' }
    ]
  },

  order_delivered: {
    id: 'order_delivered',
    name: 'Customer Delivery Confirmation',
    category: 'Orders',
    description: 'Sent to the customer upon successful delivery of their order.',
    isEnabled: true,
    subject: 'Delivered: Your Order #{orderNumber} Has Arrived - {storeName}',
    previewText: 'Your order #{orderNumber} has been delivered. We hope you cherish your jewellery.',
    heading: 'Your Jewellery Has Arrived!',
    subheading: '✨ Delivered Successfully',
    bodyText: 'Dear {customerName},\n\nYour MikuMantra order #{orderNumber} has been successfully delivered. We hope your new fine jewellery brings you timeless joy. Your authenticity certificates and warranty cards are enclosed within your keepsake presentation box.',
    ctaText: 'View Order & Invoice ↗',
    ctaUrl: '{orderDetailsUrl}',
    bannerText: '💎 Lifetime Authenticity Warranty · Complimentary Jewellery Care Consultation',
    footerText: 'We would love to hear your thoughts on your new piece. For questions or care guidance, contact {supportEmail}.',
    placeholders: [
      { key: '{customerName}', description: 'Customer full name', sample: 'Priya Sharma' },
      { key: '{orderNumber}', description: 'Unique order identifier', sample: 'MM-2026-8821' },
      { key: '{orderDate}', description: 'Formatted order placement date', sample: '12 Oct 2026' },
      { key: '{total}', description: 'Total order price formatted', sample: '₹48,500' },
      { key: '{orderDetailsUrl}', description: 'Customer order link', sample: 'https://mikumantra.com/orders/test' },
      { key: '{storeName}', description: 'Store brand name', sample: 'MikuMantra Fine Jewellery' },
      { key: '{supportEmail}', description: 'Concierge support email', sample: 'support@mikumantra.com' },
      { key: '{siteUrl}', description: 'Store website URL', sample: 'https://mikumantra.com' }
    ]
  },

  order_cancelled: {
    id: 'order_cancelled',
    name: 'Customer Order Cancellation',
    category: 'Orders',
    description: 'Sent to the customer when their order is cancelled.',
    isEnabled: true,
    subject: 'Order Cancellation Notice: #{orderNumber} - {storeName}',
    previewText: 'Notice: Your order #{orderNumber} has been cancelled.',
    heading: 'Order Cancellation Update',
    subheading: '✕ Order Cancelled',
    bodyText: 'Dear {customerName},\n\nYour order #{orderNumber} has been cancelled.\n\nCancellation Reason: {cancellationReason}\n\nRefund Status: {refundStatus}',
    ctaText: 'View Order Details ↗',
    ctaUrl: '{orderDetailsUrl}',
    bannerText: 'Jaipur Atelier Concierge Support',
    footerText: 'If this was in error or you need help selecting an alternative piece, contact {supportEmail}.',
    placeholders: [
      { key: '{customerName}', description: 'Customer full name', sample: 'Priya Sharma' },
      { key: '{orderNumber}', description: 'Unique order identifier', sample: 'MM-2026-8821' },
      { key: '{cancellationReason}', description: 'Reason for cancellation', sample: 'Ordered by mistake' },
      { key: '{refundStatus}', description: 'Status of customer refund', sample: 'Refund Initiated' },
      { key: '{total}', description: 'Total order price formatted', sample: '₹48,500' },
      { key: '{orderDetailsUrl}', description: 'Customer order link', sample: 'https://mikumantra.com/orders/test' },
      { key: '{storeName}', description: 'Store brand name', sample: 'MikuMantra Fine Jewellery' },
      { key: '{supportEmail}', description: 'Concierge support email', sample: 'support@mikumantra.com' },
      { key: '{siteUrl}', description: 'Store website URL', sample: 'https://mikumantra.com' }
    ]
  },

  order_refunded: {
    id: 'order_refunded',
    name: 'Customer Refund Confirmation',
    category: 'Orders',
    description: 'Sent to the customer when a refund has been processed for their order.',
    isEnabled: true,
    subject: 'Refund Processed for Order #{orderNumber} - {storeName}',
    previewText: 'Your refund for order #{orderNumber} has been processed.',
    heading: 'Your Refund Has Been Processed',
    subheading: '₹ Refund Completed',
    bodyText: 'Dear {customerName},\n\nWe have processed your refund of {total} for order #{orderNumber}. The funds have been returned to your original payment method and typically reflect within 3-5 business days depending on your bank.',
    ctaText: 'View Refund Details ↗',
    ctaUrl: '{orderDetailsUrl}',
    bannerText: '✨ Secure Transactions · Dedicated Customer Support',
    footerText: 'For banking assistance or reference enquiries, reach out to {supportEmail}.',
    placeholders: [
      { key: '{customerName}', description: 'Customer full name', sample: 'Priya Sharma' },
      { key: '{orderNumber}', description: 'Unique order identifier', sample: 'MM-2026-8821' },
      { key: '{total}', description: 'Refund amount formatted', sample: '₹48,500' },
      { key: '{orderDetailsUrl}', description: 'Customer order link', sample: 'https://mikumantra.com/orders/test' },
      { key: '{storeName}', description: 'Store brand name', sample: 'MikuMantra Fine Jewellery' },
      { key: '{supportEmail}', description: 'Concierge support email', sample: 'support@mikumantra.com' },
      { key: '{siteUrl}', description: 'Store website URL', sample: 'https://mikumantra.com' }
    ]
  },

  admin_order_notification: {
    id: 'admin_order_notification',
    name: 'Admin New Order Alert',
    category: 'Admin',
    description: 'Sent to store administrators immediately when a new customer order is placed.',
    isEnabled: true,
    subject: '[NEW ORDER] Order #{orderNumber} received - {customerName} ({total})',
    previewText: 'New order #{orderNumber} placed by {customerName} for {total}.',
    heading: 'New Order Received: #{orderNumber}',
    subheading: '🛎 Atelier Order Alert',
    bodyText: 'A new order has been received on {storeName}. Please review customer details, verify inventory, and arrange artisan fulfillment.',
    ctaText: 'View Orders in Admin Portal ↗',
    ctaUrl: '{adminOrderUrl}',
    bannerText: 'Internal Atelier Alert · Store Operations Team',
    footerText: 'Automated administrative notification from {storeName} commerce engine.',
    placeholders: [
      { key: '{customerName}', description: 'Customer full name', sample: 'Priya Sharma' },
      { key: '{customerEmail}', description: 'Customer email address', sample: 'priya.sharma@example.com' },
      { key: '{customerPhone}', description: 'Customer contact number', sample: '+91 98290 12345' },
      { key: '{orderNumber}', description: 'Order identifier', sample: 'MM-2026-8821' },
      { key: '{total}', description: 'Total order value', sample: '₹48,500' },
      { key: '{itemsCount}', description: 'Number of items ordered', sample: '2' },
      { key: '{paymentMethod}', description: 'Payment method label', sample: 'Cash on Delivery (COD)' },
      { key: '{paymentStatus}', description: 'Payment status', sample: 'Pending' },
      { key: '{adminOrderUrl}', description: 'Admin orders management URL', sample: 'https://mikumantra.com/admin/orders' },
      { key: '{storeName}', description: 'Store brand name', sample: 'MikuMantra Fine Jewellery' },
      { key: '{siteUrl}', description: 'Store website URL', sample: 'https://mikumantra.com' }
    ]
  },

  password_reset: {
    id: 'password_reset',
    name: 'Password Reset Verification',
    category: 'Security',
    description: 'Sent to customers or administrators requesting a 6-digit password reset verification code.',
    isEnabled: true,
    subject: '{code} is your {storeName} {portalName} verification code',
    previewText: 'Use verification code {code} to reset your {storeName} password.',
    heading: '{portalName} Verification',
    subheading: '🔒 Security Verification',
    bodyText: 'Hello {recipientName},\n\nWe received a request to reset your password for the {portalName} associated with {toEmail}. Use the verification code below to proceed:',
    ctaText: '',
    ctaUrl: '',
    bannerText: 'Never share this verification code with anyone. Our atelier concierges will never ask for your code.',
    footerText: 'If you did not request a password reset, you can safely disregard this email.\n© {storeName}. All rights reserved.',
    placeholders: [
      { key: '{recipientName}', description: 'User account name', sample: 'Priya' },
      { key: '{toEmail}', description: 'User email address', sample: 'priya@example.com' },
      { key: '{code}', description: '6-digit verification code', sample: '849201' },
      { key: '{portalName}', description: 'Customer Account / Admin Portal', sample: 'Customer Account' },
      { key: '{storeName}', description: 'Store brand name', sample: 'MikuMantra Fine Jewellery' },
      { key: '{supportEmail}', description: 'Concierge support email', sample: 'support@mikumantra.com' },
      { key: '{siteUrl}', description: 'Store website URL', sample: 'https://mikumantra.com' }
    ]
  },

  account_verification: {
    id: 'account_verification',
    name: 'Account Verification',
    category: 'Security',
    description: 'Sent automatically to newly registered customers with a 6-digit email verification code.',
    isEnabled: true,
    subject: '{code} is your {storeName} account verification code',
    previewText: 'Verify your email address to activate your {storeName} customer account.',
    heading: 'Verify Your Email Address',
    subheading: '💎 Welcome to MikuMantra',
    bodyText: 'Dear {customerName},\n\nThank you for beginning your journey with MikuMantra Fine Jewellery. Please enter the 6-digit verification code below to verify your email address and activate your atelier account:',
    ctaText: '',
    ctaUrl: '',
    bannerText: 'Never share this verification code with anyone. Our atelier concierges will never ask for your code.',
    footerText: 'If you did not create an account with MikuMantra, you can safely disregard this email.\n© {storeName}. All rights reserved.',
    placeholders: [
      { key: '{customerName}', description: 'Customer full name', sample: 'Priya Sharma' },
      { key: '{toEmail}', description: 'Customer email address', sample: 'priya@example.com' },
      { key: '{code}', description: '6-digit verification code', sample: '849201' },
      { key: '{storeName}', description: 'Store brand name', sample: 'MikuMantra Fine Jewellery' },
      { key: '{supportEmail}', description: 'Concierge support email', sample: 'support@mikumantra.com' },
      { key: '{siteUrl}', description: 'Store website URL', sample: 'https://mikumantra.com' }
    ]
  },

  welcome_email: {
    id: 'welcome_email',
    name: 'Welcome & Newsletter Circle',
    category: 'Marketing',
    description: 'Sent automatically to new subscribers upon joining the MikuMantra Atelier Circle.',
    isEnabled: true,
    subject: 'Welcome to the MikuMantra Atelier Circle',
    previewText: 'Enjoy ₹2,000 off your first handcrafted jewellery order.',
    heading: 'Welcome to MikuMantra',
    subheading: '💎 Private Circle Membership',
    bodyText: 'Thank you for joining our inner circle. You will receive private previews of our new high jewellery collections and exclusive invitations to bespoke unveilings.',
    ctaText: 'Explore the Collection',
    ctaUrl: '/shop',
    bannerText: '✨ BIS Hallmarked 22K Gold · SGL Certified Diamonds · Insured Express Shipping',
    footerText: 'MikuMantra Fine Jewellery Atelier, Jaipur, India.',
    placeholders: [
      { key: '{subscriberEmail}', description: 'Subscriber email address', sample: 'member@example.com' },
      { key: '{storeName}', description: 'Store brand name', sample: 'MikuMantra Fine Jewellery' },
      { key: '{supportEmail}', description: 'Concierge support email', sample: 'support@mikumantra.com' },
      { key: '{siteUrl}', description: 'Store website URL', sample: 'https://mikumantra.com' },
      { key: '{unsubscribeUrl}', description: 'Unsubscribe preference link', sample: 'https://mikumantra.com/unsubscribe' }
    ]
  }
};

/**
 * Replaces `{placeholder}` tokens in a template string with actual values.
 */
export function interpolate(templateStr = '', vars = {}) {
  if (!templateStr || typeof templateStr !== 'string') return '';
  return templateStr.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    return vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : match;
  });
}

/**
 * Converts line breaks into clean, styled email paragraphs.
 */
export function formatEmailParagraphs(text = '') {
  if (!text) return '';
  return text
    .split(/\r?\n\r?\n/)
    .map(p => {
      const clean = p.trim();
      if (!clean) return '';
      return `<p style="font-size: 15px; line-height: 1.7; color: #333333; margin-top: 0; margin-bottom: 18px;">${clean.replace(/\r?\n/g, '<br />')}</p>`;
    })
    .filter(Boolean)
    .join('');
}

let fallbackClient = null;
let fallbackDb = null;

/**
 * Connects to MongoDB fallback if a caller did not pass `db`.
 */
export async function getDbFallback() {
  if (fallbackDb) {
    try {
      await fallbackDb.command({ ping: 1 }, { maxTimeMS: 1500 });
      return fallbackDb;
    } catch (_) {
      fallbackClient = null;
      fallbackDb = null;
    }
  }
  loadDiskEnv();
  const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
  if (!uri) return null;
  try {
    const { MongoClient } = await import('mongodb');
    fallbackClient = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
    await fallbackClient.connect();
    fallbackDb = fallbackClient.db(process.env.DB_NAME || 'userPortal');
    return fallbackDb;
  } catch (e) {
    return null;
  }
}

/**
 * Fetches an email template by ID from MongoDB, falling back to defaults.
 */
export async function getEmailTemplate(db = null, templateId) {
  const defaultTemplate = DEFAULT_EMAIL_TEMPLATES[templateId] || null;
  const activeDb = db || await getDbFallback();

  if (!activeDb) {
    return defaultTemplate ? { ...defaultTemplate } : null;
  }

  try {
    let doc = await activeDb.collection('email_templates').findOne({ id: templateId });

    // Fallback check for welcome_email in legacy newsletter_templates collection
    if (!doc && templateId === 'welcome_email') {
      const legacyDoc = await activeDb.collection('newsletter_templates').findOne({ id: 'welcome_email' });
      if (legacyDoc) {
        doc = legacyDoc;
      }
    }

    if (!doc) {
      if (defaultTemplate) {
        // Save initial default into MongoDB
        await activeDb.collection('email_templates').updateOne(
          { id: templateId },
          { $set: { ...defaultTemplate, updatedAt: new Date() } },
          { upsert: true }
        );
      }
      return defaultTemplate ? { ...defaultTemplate } : null;
    }

    const { _id, ...cleanDoc } = doc;
    return {
      ...(defaultTemplate || {}),
      ...cleanDoc
    };
  } catch (err) {
    console.warn(`[EMAIL TEMPLATES] Failed to read template ${templateId} from DB:`, err.message);
    return defaultTemplate ? { ...defaultTemplate } : null;
  }
}

/**
 * Fetches all 5 email templates merged with MongoDB records.
 */
export async function getAllEmailTemplates(db = null) {
  const activeDb = db || await getDbFallback();
  const templateKeys = Object.keys(DEFAULT_EMAIL_TEMPLATES);
  const result = [];

  for (const key of templateKeys) {
    const t = await getEmailTemplate(activeDb, key);
    if (t) result.push(t);
  }

  return result;
}

/**
 * Updates an email template in MongoDB.
 */
export async function updateEmailTemplate(db = null, templateId, templateData) {
  const activeDb = db || await getDbFallback();
  const defaultTemplate = DEFAULT_EMAIL_TEMPLATES[templateId] || {};
  const current = await getEmailTemplate(activeDb, templateId) || defaultTemplate;

  const updatedDoc = {
    ...current,
    ...templateData,
    id: templateId,
    updatedAt: new Date()
  };

  delete updatedDoc._id;

  if (activeDb) {
    try {
      await activeDb.collection('email_templates').updateOne(
        { id: templateId },
        { $set: updatedDoc },
        { upsert: true }
      );

      // Two-way sync with newsletter_templates for welcome_email
      if (templateId === 'welcome_email') {
        try {
          await activeDb.collection('newsletter_templates').updateOne(
            { id: 'welcome_email' },
            { $set: updatedDoc },
            { upsert: true }
          );
        } catch (_) {}
      }
    } catch (err) {
      console.error(`[EMAIL TEMPLATES] Failed to save template ${templateId} in DB:`, err);
    }
  }

  return updatedDoc;
}

/**
 * Resets an email template to its default settings.
 */
export async function resetEmailTemplate(db = null, templateId) {
  const defaultTemplate = DEFAULT_EMAIL_TEMPLATES[templateId];
  if (!defaultTemplate) throw new Error(`Unknown template ID: ${templateId}`);

  const activeDb = db || await getDbFallback();
  const resetDoc = {
    ...defaultTemplate,
    updatedAt: new Date()
  };

  if (activeDb) {
    try {
      await activeDb.collection('email_templates').updateOne(
        { id: templateId },
        { $set: resetDoc },
        { upsert: true }
      );
      if (templateId === 'welcome_email') {
        try {
          await activeDb.collection('newsletter_templates').updateOne(
            { id: 'welcome_email' },
            { $set: resetDoc },
            { upsert: true }
          );
        } catch (_) {}
      }
    } catch (err) {
      console.error(`[EMAIL TEMPLATES] Failed to reset template ${templateId} in DB:`, err);
    }
  }

  return resetDoc;
}

/**
 * Retrieves SMTP/Email provider configuration from environment variables.
 */
export function getSmtpConfig(customSettings = null) {
  loadDiskEnv();
  const envUser = (process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER || process.env.SMTP_EMAIL || '').trim();
  const envPass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS || process.env.EMAIL_PASS || '').trim();

  const user = (customSettings?.smtpPass && customSettings?.smtpUser
    ? customSettings.smtpUser.trim()
    : envUser);

  const rawPass = (customSettings?.smtpPass ? customSettings.smtpPass.trim() : envPass);
  const customHost = customSettings?.smtpHost || '';
  const host = (customHost || process.env.SMTP_HOST || (user && user.includes('@gmail.com') ? 'smtp.gmail.com' : (process.env.EMAIL_HOST || 'smtp.gmail.com'))).trim();
  const pass = host.includes('gmail.com') ? rawPass.replace(/\s+/g, '') : rawPass;
  
  const customPort = customSettings?.smtpPort;
  const port = parseInt(customPort || process.env.SMTP_PORT || (host === 'smtp.gmail.com' ? '465' : '587'), 10);
  const secure = process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE === 'true' : port === 465;
  
  const fromName = (customSettings?.fromName || process.env.EMAIL_FROM_NAME || 'MikuMantra').trim();
  const rawFromAddress = (customSettings?.fromEmail || process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_FROM || user || 'hello@mikumantra.com').trim();
  const cleanFromAddress = rawFromAddress.replace(/^"+|"+$/g, '');
  const finalFromAddress = cleanFromAddress.includes('<') ? cleanFromAddress.match(/<([^>]+)>/)?.[1] || cleanFromAddress : cleanFromAddress;

  const from = `"${fromName}" <${finalFromAddress}>`;
  const replyTo = (customSettings?.replyTo || process.env.EMAIL_REPLY_TO || finalFromAddress || 'support@mikumantra.com').trim();

  const resendApiKey = process.env.RESEND_API_KEY || '';

  const isConfigured = Boolean((user && pass) || resendApiKey);
  const provider = resendApiKey ? 'Resend API' : (user && pass ? 'SMTP / Nodemailer' : 'None');

  return {
    isConfigured,
    provider,
    host,
    port,
    secure,
    auth: { user, pass },
    resendApiKey,
    fromName,
    fromAddress: finalFromAddress,
    from,
    replyTo
  };
}

/**
 * Verifies email provider health and connectivity status.
 */
export async function checkEmailProviderStatus(db = null) {
  let customSettings = null;
  if (db) {
    try {
      const doc = await db.collection('newsletter_settings').findOne({ id: 'default' });
      if (doc) customSettings = doc;
    } catch (e) {}
  }

  const config = getSmtpConfig(customSettings);
  if (!config.isConfigured) {
    return {
      isConfigured: false,
      provider: 'Unconfigured',
      from: config.from,
      fromAddress: config.fromAddress,
      fromName: config.fromName,
      replyTo: config.replyTo,
      error: 'Email provider environment variables are not set. Configure SMTP_USER and SMTP_PASS or RESEND_API_KEY in .env.'
    };
  }

  if (config.resendApiKey) {
    return {
      isConfigured: true,
      provider: 'Resend API',
      from: config.from,
      fromAddress: config.fromAddress,
      fromName: config.fromName,
      replyTo: config.replyTo
    };
  }

  try {
    const transporter = createTransporter(customSettings);
    if (!transporter) {
      return {
        isConfigured: false,
        provider: 'SMTP',
        from: config.from,
        fromAddress: config.fromAddress,
        fromName: config.fromName,
        replyTo: config.replyTo,
        error: 'Transporter creation failed.'
      };
    }

    await transporter.verify();
    return {
      isConfigured: true,
      provider: `SMTP (${config.host})`,
      from: config.from,
      fromAddress: config.fromAddress,
      fromName: config.fromName,
      replyTo: config.replyTo,
      verified: true
    };
  } catch (err) {
    return {
      isConfigured: false,
      provider: `SMTP (${config.host})`,
      from: config.from,
      fromAddress: config.fromAddress,
      fromName: config.fromName,
      replyTo: config.replyTo,
      error: `SMTP Verification Error: ${err.message}`
    };
  }
}

/**
 * Creates a Nodemailer transporter instance if credentials exist.
 */
export function createTransporter(customSettings = null) {
  const config = getSmtpConfig(customSettings);
  if (!config.isConfigured) {
    return null;
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    connectionTimeout: 8000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
    tls: {
      rejectUnauthorized: process.env.SMTP_INSECURE_TLS === 'true' ? false : true
    }
  });
}

/**
 * Renders a production-ready, email-client-compatible HTML body for Newsletter Campaigns.
 */
export function renderCampaignHtml({ campaign = {}, template = {}, subscriberEmail = '', unsubscribeUrl = '#' }) {
  const subject = campaign.subject || template.subject || 'MikuMantra Circle Exclusive';
  const previewText = campaign.previewText || template.previewText || '';
  const heading = campaign.heading || template.heading || campaign.name || 'Private Preview';
  const bodyText = template.body || campaign.body || '';
  const ctaText = template.ctaText || campaign.ctaText || '';
  const ctaUrl = template.ctaUrl || campaign.ctaUrl || '';
  const footerText = template.footerText || 'MikuMantra Fine Jewellery Atelier, Jaipur, India.';
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mikumantra.com';

  const bodyParagraphs = formatEmailParagraphs(bodyText);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FAF6EF; color: #1A1A1A;">
  ${previewText ? `<div style="display: none; max-height: 0px; overflow: hidden;">${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF6EF; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" max-width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.06); border: 1px solid #EAE3D2;">
          
          <!-- Atelier Header -->
          <tr>
            <td style="background-color: #0F0F10; padding: 36px 24px; text-align: center; border-bottom: 3px solid #9C6B30;">
              <div style="font-family: Georgia, serif; font-size: 26px; font-weight: bold; letter-spacing: 0.18em; color: #D4AF37; text-transform: uppercase;">
                MikuMantra
              </div>
              <div style="font-size: 9px; letter-spacing: 0.35em; color: #CCCCCC; text-transform: uppercase; margin-top: 6px;">
                House of Fine Jewellery · Private Circle
              </div>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 40px 36px;">
              ${heading ? `
                <h1 style="font-family: Georgia, serif; font-size: 24px; font-weight: 400; color: #1A1A1A; margin-top: 0; margin-bottom: 24px; text-align: center; letter-spacing: 0.02em;">
                  ${heading}
                </h1>
                <div style="width: 40px; height: 2px; background-color: #D4AF37; margin: 0 auto 28px auto;"></div>
              ` : ''}

              <div style="font-size: 15px; line-height: 1.7; color: #333333;">
                ${bodyParagraphs || `<p style="margin: 0;">${bodyText}</p>`}
              </div>

              ${ctaText && ctaUrl ? `
                <div style="text-align: center; margin: 36px 0 20px 0;">
                  <a href="${ctaUrl.startsWith('http') ? ctaUrl : `${siteUrl}${ctaUrl}`}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #1A1A1A; color: #FFFFFF; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; text-decoration: none; padding: 16px 36px; border-radius: 50px; box-shadow: 0 4px 18px rgba(0,0,0,0.15);">
                    ${ctaText}
                  </a>
                </div>
              ` : ''}
            </td>
          </tr>

          <!-- Atelier Assurance Banner -->
          <tr>
            <td style="background-color: #FAF6EF; padding: 20px 36px; border-top: 1px solid #EAE3D2; border-bottom: 1px solid #EAE3D2; text-align: center;">
              <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #9C6B30; margin: 0; font-weight: 600;">
                ✨ BIS Hallmarked 22K Gold · SGL Certified Diamonds · Insured Express Shipping
              </p>
            </td>
          </tr>

          <!-- Footer & Unsubscribe -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 28px 36px; text-align: center;">
              <p style="font-size: 12px; color: #777777; margin: 0 0 12px 0;">
                ${footerText}
              </p>
              <p style="font-size: 11px; color: #999999; margin: 0 0 16px 0;">
                Sent with care to <span style="color: #444444; font-weight: 500;">${subscriberEmail}</span>
              </p>
              <div style="font-size: 11px; color: #888888;">
                If you no longer wish to receive marketing communications, you may 
                <a href="${unsubscribeUrl}" target="_blank" rel="noopener noreferrer" style="color: #9C6B30; text-decoration: underline; font-weight: 600;">
                  unsubscribe anytime here
                </a>.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Sends a single marketing email directly to a recipient.
 */
export async function sendCampaignBatchEmail({
  toEmail,
  subject,
  previewText,
  html,
  text,
  fromName,
  fromEmail,
  replyTo,
  customSettings = null
}) {
  const config = getSmtpConfig(customSettings);
  if (!config.isConfigured) {
    return {
      success: false,
      error: 'EMAIL_NOT_CONFIGURED',
      message: 'SMTP credentials or RESEND_API_KEY missing in environment variables or settings.'
    };
  }

  const effectiveFromName = fromName || config.fromName;
  const effectiveFromAddress = fromEmail || config.fromAddress;
  const effectiveFrom = `"${effectiveFromName}" <${effectiveFromAddress}>`;
  const effectiveReplyTo = replyTo || config.replyTo;

  if (config.resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: effectiveFrom,
          to: [toEmail],
          subject,
          html,
          text: text || subject,
          reply_to: effectiveReplyTo
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Resend API Error ${res.status}`);
      }
      return { success: true, messageId: data.id };
    } catch (err) {
      console.error(`[RESEND ERROR] Failed to send email to ${toEmail}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  try {
    const transporter = createTransporter(customSettings);
    const info = await transporter.sendMail({
      from: effectiveFrom,
      to: toEmail,
      replyTo: effectiveReplyTo,
      subject,
      text: text || subject,
      html
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[SMTP ERROR] Failed to send campaign email to ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sends a test campaign email strictly to the specified test/admin email address.
 */
export async function sendTestCampaignEmail({ toEmail, campaign, template, customSettings = null }) {
  const config = getSmtpConfig(customSettings);
  if (!config.isConfigured) {
    return {
      success: false,
      message: 'Email provider is not configured. Set SMTP_USER and SMTP_PASS or RESEND_API_KEY in .env.'
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mikumantra.com';
  const unsubscribeUrl = `${siteUrl}/unsubscribe?token=TEST_PREVIEW_TOKEN`;
  
  const testSubject = `[TEST PREVIEW] ${campaign.subject || template?.subject || 'Campaign Subject'}`;
  const html = renderCampaignHtml({
    campaign,
    template,
    subscriberEmail: toEmail,
    unsubscribeUrl
  });

  return await sendCampaignBatchEmail({
    toEmail,
    subject: testSubject,
    previewText: campaign.previewText || template?.previewText,
    html,
    fromName: campaign.fromName || config.fromName,
    fromEmail: campaign.fromEmail || config.fromAddress,
    replyTo: campaign.replyTo || config.replyTo,
    customSettings
  });
}

/**
 * Renders HTML for Password Reset Verification Code Email.
 */
export function renderPasswordResetHtml({ code, recipientName, portalName, toEmail, siteUrl, template = null }) {
  const t = template || DEFAULT_EMAIL_TEMPLATES.password_reset;
  const storeName = 'MikuMantra Fine Jewellery';
  const supportEmail = 'support@mikumantra.com';

  const vars = {
    code,
    recipientName: recipientName || 'Valued Collector',
    portalName: portalName || 'Customer Account',
    toEmail: toEmail || '',
    storeName,
    supportEmail,
    siteUrl: siteUrl || 'https://mikumantra.com'
  };

  const subject = interpolate(t.subject, vars);
  const previewText = interpolate(t.previewText, vars);
  const heading = interpolate(t.heading, vars);
  const subheading = interpolate(t.subheading, vars);
  const bodyText = interpolate(t.bodyText, vars);
  const bannerText = interpolate(t.bannerText, vars);
  const footerText = interpolate(t.footerText, vars);

  const bodyParagraphs = formatEmailParagraphs(bodyText);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF6EF; color: #1A1A1A;">
  ${previewText ? `<div style="display: none; max-height: 0px; overflow: hidden;">${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF6EF; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="560" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #EAE3D2;">
          
          <!-- Atelier Header -->
          <tr>
            <td style="background-color: #0F0F10; padding: 30px 24px; text-align: center; border-bottom: 3px solid #9C6B30;">
              <div style="font-family: Georgia, serif; font-size: 24px; font-weight: bold; letter-spacing: 0.18em; color: #D4AF37; text-transform: uppercase;">
                MikuMantra
              </div>
              <div style="font-size: 9px; letter-spacing: 0.35em; color: #CCCCCC; text-transform: uppercase; margin-top: 6px;">
                House of Fine Jewellery · Atelier Concierge
              </div>
            </td>
          </tr>

          <!-- Security Subheading & Heading -->
          <tr>
            <td style="padding: 32px 32px 16px 32px; text-align: center;">
              ${subheading ? `
                <div style="display: inline-block; background-color: #F4EBD9; color: #9C6B30; font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; padding: 6px 16px; border-radius: 50px; margin-bottom: 14px; border: 1px solid #D4AF37;">
                  ${subheading}
                </div>
              ` : ''}
              <h1 style="font-family: Georgia, serif; font-size: 22px; font-weight: 400; color: #1A1A1A; margin: 0 0 10px 0; line-height: 1.3;">
                ${heading}
              </h1>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <div style="font-size: 14px; line-height: 1.6; color: #444444;">
                ${bodyParagraphs}
              </div>

              <!-- Verification Code Highlight Box -->
              <div style="text-align: center; margin: 28px 0;">
                <div style="display: inline-block; background-color: #FAF6EF; border: 2px dashed #D4AF37; border-radius: 12px; padding: 18px 36px;">
                  <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #9C6B30; margin-bottom: 6px; font-weight: 600;">
                    Your Verification Code
                  </div>
                  <div style="font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #1A1A1A; font-family: 'Courier New', Courier, monospace;">
                    ${code}
                  </div>
                </div>
              </div>
            </td>
          </tr>

          <!-- Security Note / Banner -->
          ${bannerText ? `
            <tr>
              <td style="background-color: #FAF8F5; padding: 16px 32px; border-top: 1px solid #EAE3D2; border-bottom: 1px solid #EAE3D2; text-align: center;">
                <p style="font-size: 11px; color: #8A6D3B; margin: 0; line-height: 1.5;">
                  ⚠️ ${bannerText}
                </p>
              </td>
            </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 22px 32px; text-align: center;">
              <p style="font-size: 11px; color: #888888; margin: 0; line-height: 1.6;">
                ${footerText.replace(/\n/g, '<br />')}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Sends a password reset email with a 6-digit verification code.
 */
export async function sendPasswordResetEmail({ toEmail, code, name, isAdmin = false, db = null }) {
  const template = await getEmailTemplate(db, 'password_reset');
  if (template && template.isEnabled === false) {
    console.log(`[EMAIL SYSTEM] Password reset email is disabled by admin setting. Skipping send to ${toEmail}.`);
    return { sent: false, skipped: true, reason: 'DISABLED_BY_ADMIN' };
  }

  const config = getSmtpConfig();
  const recipientName = (name || toEmail.split('@')[0] || 'Valued Member').trim();
  const portalName = isAdmin ? 'Administrator Portal' : 'Customer Account';
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mikumantra.com';

  const html = renderPasswordResetHtml({ code, recipientName, portalName, toEmail, siteUrl, template });
  const vars = {
    code,
    recipientName,
    portalName,
    toEmail,
    storeName: 'MikuMantra Fine Jewellery',
    supportEmail: 'support@mikumantra.com',
    siteUrl
  };
  const subject = interpolate(template?.subject || '{code} is your {storeName} {portalName} verification code', vars);

  if (!config.isConfigured) {
    console.log(`[EMAIL SYSTEM] Password Reset Code for: ${toEmail} - CODE: ${code}`);
    return { sent: false, reason: 'SMTP_NOT_CONFIGURED', code };
  }

  if (config.resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: config.from,
          to: [toEmail],
          subject,
          html,
          text: `Your MikuMantra ${portalName} verification code is: ${code}`,
          reply_to: config.replyTo
        })
      });
      const data = await res.json();
      return { sent: true, messageId: data.id };
    } catch (err) {
      console.error(`[RESEND ERROR] Failed to send password reset code to ${toEmail}:`, err.message);
      return { sent: false, reason: 'SEND_FAILED', error: err.message, code };
    }
  }

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: config.from,
      to: toEmail,
      subject,
      html
    });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EMAIL ERROR] Failed to send password reset email to ${toEmail}:`, err.message);
    return { sent: false, reason: 'SEND_FAILED', error: err.message, code };
  }
}

/**
 * Renders HTML email for new customer account verification OTP.
 */
export function renderAccountVerificationHtml({ code, customerName, toEmail, siteUrl, template = null }) {
  const t = template || DEFAULT_EMAIL_TEMPLATES.account_verification;
  const storeName = 'MikuMantra Fine Jewellery';
  const supportEmail = 'support@mikumantra.com';

  const vars = {
    code,
    customerName: customerName || 'Valued Collector',
    toEmail: toEmail || '',
    storeName,
    supportEmail,
    siteUrl: siteUrl || 'https://mikumantra.com'
  };

  const subject = interpolate(t.subject, vars);
  const previewText = interpolate(t.previewText, vars);
  const heading = interpolate(t.heading, vars);
  const subheading = interpolate(t.subheading, vars);
  const bodyText = interpolate(t.bodyText, vars);
  const bannerText = interpolate(t.bannerText, vars);
  const footerText = interpolate(t.footerText, vars);

  const bodyParagraphs = formatEmailParagraphs(bodyText);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF6EF; color: #1A1A1A;">
  ${previewText ? `<div style="display: none; max-height: 0px; overflow: hidden;">${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF6EF; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="560" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #EAE3D2;">
          
          <!-- Atelier Header -->
          <tr>
            <td style="background-color: #0F0F10; padding: 30px 24px; text-align: center; border-bottom: 3px solid #9C6B30;">
              <div style="font-family: Georgia, serif; font-size: 24px; font-weight: bold; letter-spacing: 0.18em; color: #D4AF37; text-transform: uppercase;">
                MikuMantra
              </div>
              <div style="font-size: 9px; letter-spacing: 0.35em; color: #CCCCCC; text-transform: uppercase; margin-top: 6px;">
                House of Fine Jewellery · Atelier Concierge
              </div>
            </td>
          </tr>

          <!-- Security Subheading & Heading -->
          <tr>
            <td style="padding: 32px 32px 16px 32px; text-align: center;">
              ${subheading ? `
                <div style="display: inline-block; background-color: #F4EBD9; color: #9C6B30; font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; padding: 6px 16px; border-radius: 50px; margin-bottom: 14px; border: 1px solid #D4AF37;">
                  ${subheading}
                </div>
              ` : ''}
              <h1 style="font-family: Georgia, serif; font-size: 22px; font-weight: 400; color: #1A1A1A; margin: 0 0 10px 0; line-height: 1.3;">
                ${heading}
              </h1>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <div style="font-size: 14px; line-height: 1.6; color: #444444;">
                ${bodyParagraphs}
              </div>

              <!-- Verification Code Highlight Box -->
              <div style="text-align: center; margin: 28px 0;">
                <div style="display: inline-block; background-color: #FAF6EF; border: 2px dashed #D4AF37; border-radius: 12px; padding: 18px 36px;">
                  <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #9C6B30; margin-bottom: 6px; font-weight: 600;">
                    Your Verification Code
                  </div>
                  <div style="font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #1A1A1A; font-family: 'Courier New', Courier, monospace;">
                    ${code}
                  </div>
                </div>
              </div>
            </td>
          </tr>

          <!-- Security Note / Banner -->
          ${bannerText ? `
            <tr>
              <td style="background-color: #FAF8F5; padding: 16px 32px; border-top: 1px solid #EAE3D2; border-bottom: 1px solid #EAE3D2; text-align: center;">
                <p style="font-size: 11px; color: #8A6D3B; margin: 0; line-height: 1.5;">
                  ⚠️ ${bannerText}
                </p>
              </td>
            </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 22px 32px; text-align: center;">
              <p style="font-size: 11px; color: #888888; margin: 0; line-height: 1.6;">
                ${footerText.replace(/\n/g, '<br />')}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Sends an account creation verification email with a 6-digit OTP code.
 */
export async function sendAccountVerificationEmail({ toEmail, code, name, db = null, customSettings = null }) {
  const template = await getEmailTemplate(db, 'account_verification');
  if (template && template.isEnabled === false) {
    console.log(`[EMAIL SYSTEM] Account verification email is disabled by admin setting. Skipping send to ${toEmail}.`);
    return { sent: false, skipped: true, reason: 'DISABLED_BY_ADMIN' };
  }

  const config = getSmtpConfig(customSettings);
  const customerName = (name || toEmail.split('@')[0] || 'Valued Member').trim();
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mikumantra.com';

  const html = renderAccountVerificationHtml({ code, customerName, toEmail, siteUrl, template });
  const vars = {
    code,
    customerName,
    toEmail,
    storeName: 'MikuMantra Fine Jewellery',
    supportEmail: 'support@mikumantra.com',
    siteUrl
  };
  const subject = interpolate(template?.subject || '{code} is your {storeName} account verification code', vars);

  if (!config.isConfigured) {
    console.log(`[EMAIL SYSTEM] Account Verification Code for: ${toEmail} - CODE: ${code}`);
    return { sent: false, reason: 'SMTP_NOT_CONFIGURED', code };
  }

  if (config.resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: config.from,
          to: [toEmail],
          subject,
          html,
          text: `Your MikuMantra account verification code is: ${code}`,
          reply_to: config.replyTo
        })
      });
      const data = await res.json();
      return { sent: true, messageId: data.id };
    } catch (err) {
      console.error(`[RESEND ERROR] Failed to send verification code to ${toEmail}:`, err.message);
      return { sent: false, reason: 'SEND_FAILED', error: err.message, code };
    }
  }

  try {
    const transporter = createTransporter(customSettings);
    const info = await transporter.sendMail({
      from: config.from,
      to: toEmail,
      subject,
      html
    });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EMAIL ERROR] Failed to send verification email to ${toEmail}:`, err.message);
    return { sent: false, reason: 'SEND_FAILED', error: err.message, code };
  }
}

/**
 * Renders HTML for Customer Order Shipped Email.
 */
export function renderOrderShippedHtml({ order, user, recipientName, siteUrl, orderDetailsUrl, template = null }) {
  const t = template || DEFAULT_EMAIL_TEMPLATES.order_shipped;
  const orderNumber = order.orderNumber || order.id;
  const carrier = order.courier?.carrier || order.carrier || 'our verified courier partner';
  const trackingNumber = order.courier?.trackingNumber || order.trackingNumber || '';
  const trackingUrl = order.courier?.trackingUrl || order.trackingUrl || '';
  const total = order.amounts?.total ? `₹${order.amounts.total.toLocaleString('en-IN')}` : '';
  const storeName = 'MikuMantra Fine Jewellery';
  const supportEmail = 'support@mikumantra.com';

  const vars = {
    customerName: recipientName,
    orderNumber,
    carrier,
    trackingNumber,
    trackingUrl,
    total,
    orderDetailsUrl,
    storeName,
    supportEmail,
    siteUrl
  };

  const subject = interpolate(t.subject, vars);
  const previewText = interpolate(t.previewText, vars);
  const heading = interpolate(t.heading, vars);
  const subheading = interpolate(t.subheading, vars);
  const bodyText = interpolate(t.bodyText, vars);
  const ctaText = interpolate(t.ctaText, vars);
  const ctaUrl = interpolate(t.ctaUrl, vars) || trackingUrl || orderDetailsUrl;
  const bannerText = interpolate(t.bannerText, vars);
  const footerText = interpolate(t.footerText, vars);

  const bodyParagraphs = formatEmailParagraphs(bodyText);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF6EF; color: #1A1A1A;">
  ${previewText ? `<div style="display: none; max-height: 0px; overflow: hidden;">${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF6EF; padding: 36px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.06); border: 1px solid #EAE3D2;">
          
          <!-- Atelier Header -->
          <tr>
            <td style="background-color: #0F0F10; padding: 32px 24px; text-align: center; border-bottom: 3px solid #9C6B30;">
              <div style="font-family: Georgia, serif; font-size: 26px; font-weight: bold; letter-spacing: 0.18em; color: #D4AF37; text-transform: uppercase;">
                MikuMantra
              </div>
              <div style="font-size: 9px; letter-spacing: 0.35em; color: #CCCCCC; text-transform: uppercase; margin-top: 6px;">
                House of Fine Jewellery · Jaipur Atelier
              </div>
            </td>
          </tr>

          <!-- Shipped Hero -->
          <tr>
            <td style="padding: 36px 32px 20px 32px; text-align: center;">
              ${subheading ? `
                <div style="display: inline-block; background-color: #F4EBD9; color: #9C6B30; font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; padding: 6px 16px; border-radius: 50px; margin-bottom: 16px; border: 1px solid #D4AF37;">
                  ${subheading}
                </div>
              ` : ''}
              <h1 style="font-family: Georgia, serif; font-size: 24px; font-weight: 400; color: #1A1A1A; margin: 0 0 10px 0; line-height: 1.3;">
                ${heading}
              </h1>
            </td>
          </tr>

          <!-- Message Body -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <div style="font-size: 14px; line-height: 1.7; color: #444444;">
                ${bodyParagraphs}
              </div>
            </td>
          </tr>

          <!-- Tracking Card -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <div style="background-color: #FAF6EF; border: 1.5px solid #D4AF37; border-radius: 12px; padding: 22px; text-align: center;">
                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #9C6B30; font-weight: 700; margin-bottom: 8px;">
                  🚚 Logistics & Tracking Information
                </div>
                <div style="font-size: 14px; color: #1A1A1A; margin-bottom: 6px;">
                  Courier: <strong>${carrier}</strong>
                </div>
                ${trackingNumber ? `
                  <div style="font-size: 13px; color: #555555; margin-bottom: 16px;">
                    AWB / Tracking Number: <strong style="font-family: 'Courier New', Courier, monospace; color: #1A1A1A;">${trackingNumber}</strong>
                  </div>
                ` : ''}
                ${ctaText && ctaUrl ? `
                  <div>
                    <a href="${ctaUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #9C6B30; color: #FFFFFF; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; text-decoration: none; padding: 12px 28px; border-radius: 50px; box-shadow: 0 2px 10px rgba(156,107,48,0.25);">
                      ${ctaText}
                    </a>
                  </div>
                ` : ''}
              </div>
            </td>
          </tr>

          <!-- Assurance Banner -->
          ${bannerText ? `
            <tr>
              <td style="background-color: #FAF6EF; padding: 18px 24px; border-top: 1px solid #EAE3D2; border-bottom: 1px solid #EAE3D2; text-align: center;">
                <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #9C6B30; margin: 0; font-weight: 600;">
                  ${bannerText}
                </p>
              </td>
            </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; text-align: center;">
              <p style="font-size: 12px; line-height: 1.6; color: #777777; margin: 0 0 10px 0;">
                ${footerText.replace(/\n/g, '<br />')}
              </p>
              <p style="font-size: 11px; color: #999999; margin: 0;">
                © ${new Date().getFullYear()} ${storeName}. All rights reserved.<br />
                Jaipur Atelier, Rajasthan, India.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Sends Customer Order Shipped Email.
 */
export async function sendOrderShippedEmail({ toEmail, order, user, db = null }) {
  if (!toEmail || !order) return { sent: false, reason: 'MISSING_PARAMS' };

  const template = await getEmailTemplate(db, 'order_shipped');
  if (template && template.isEnabled === false) {
    console.log(`[EMAIL SYSTEM] Order shipped email is disabled by admin setting. Skipping send to ${toEmail}.`);
    return { sent: false, skipped: true, reason: 'DISABLED_BY_ADMIN' };
  }

  const config = getSmtpConfig();
  const recipientName = (order.address?.fullName || user?.name || toEmail.split('@')[0] || 'Valued Collector').trim();
  const carrier = order.courier?.carrier || order.carrier || 'our verified courier partner';
  const trackingNumber = order.courier?.trackingNumber || order.trackingNumber || '';
  const trackingUrl = order.courier?.trackingUrl || order.trackingUrl || '';
  const orderNumber = order.orderNumber || order.id;
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mikumantra.com';
  const orderDetailsUrl = `${siteUrl}/orders/${order.id}`;

  const html = renderOrderShippedHtml({ order, user, recipientName, siteUrl, orderDetailsUrl, template });
  const vars = {
    customerName: recipientName,
    orderNumber,
    carrier,
    trackingNumber,
    trackingUrl,
    total: order.amounts?.total ? `₹${order.amounts.total.toLocaleString('en-IN')}` : '',
    orderDetailsUrl,
    storeName: 'MikuMantra Fine Jewellery',
    supportEmail: 'support@mikumantra.com',
    siteUrl
  };
  const subject = interpolate(template?.subject || 'Order #{orderNumber} Shipped via {carrier} - {storeName}', vars);

  if (!config.isConfigured) {
    return { sent: true, mock: true, message: 'SMTP not configured; shipment email logged.' };
  }

  if (config.resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: config.from,
          to: [toEmail],
          subject,
          html,
          text: `Your order #${orderNumber} has shipped via ${carrier}. Tracking: ${trackingNumber}`,
          reply_to: config.replyTo
        })
      });
      const data = await res.json();
      return { sent: true, messageId: data.id };
    } catch (err) {
      console.error(`[RESEND ERROR] Failed to send order shipped email:`, err.message);
      return { sent: false, error: err.message };
    }
  }

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: config.from,
      to: toEmail,
      subject,
      html
    });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EMAIL ERROR] Failed to send order shipped email:`, err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Status styling presets for customer notification emails.
 */
const STATUS_STYLES = {
  confirmed: {
    label: 'Order Confirmed',
    badgeBg: '#F4EBD9',
    badgeBorder: '#D4AF37',
    badgeText: '#9C6B30',
    icon: '✓'
  },
  placed: {
    label: 'Order Placed',
    badgeBg: '#F4EBD9',
    badgeBorder: '#D4AF37',
    badgeText: '#9C6B30',
    icon: '✓'
  },
  processing: {
    label: 'Processing & In Production',
    badgeBg: '#FEF3C7',
    badgeBorder: '#F59E0B',
    badgeText: '#B45309',
    icon: '🔨'
  },
  packed: {
    label: 'Packed & Ready to Ship',
    badgeBg: '#FEF3C7',
    badgeBorder: '#F59E0B',
    badgeText: '#B45309',
    icon: '📦'
  },
  shipped: {
    label: 'Shipped & In Transit',
    badgeBg: '#EFF6FF',
    badgeBorder: '#3B82F6',
    badgeText: '#1D4ED8',
    icon: '🚚'
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    badgeBg: '#EEF2FF',
    badgeBorder: '#6366F1',
    badgeText: '#4338CA',
    icon: '📍'
  },
  delivered: {
    label: 'Delivered',
    badgeBg: '#ECFDF5',
    badgeBorder: '#10B981',
    badgeText: '#047857',
    icon: '✨'
  },
  cancelled: {
    label: 'Cancelled',
    badgeBg: '#FEF2F2',
    badgeBorder: '#EF4444',
    badgeText: '#B91C1C',
    icon: '✕'
  },
  refunded: {
    label: 'Refund Processed',
    badgeBg: '#F0FDFA',
    badgeBorder: '#14B8A6',
    badgeText: '#0F766E',
    icon: '₹'
  }
};

/**
 * Renders an exquisite, mobile-responsive HTML email for Order Status Updates.
 */
export function renderOrderStatusUpdateHtml({
  order,
  user = null,
  recipientName = 'Valued Collector',
  previousStatus = '',
  newStatus = '',
  courier = null,
  siteUrl = 'https://mikumantra.vercel.app',
  orderDetailsUrl = '',
  template = null
}) {
  const normStatus = String(newStatus || order.status || '').toLowerCase().trim();
  const statusStyle = STATUS_STYLES[normStatus] || STATUS_STYLES.processing;
  const statusLabel = statusStyle.label;

  const orderNumber = order.orderNumber || order.id;
  const placedDate = order.placedAt ? new Date(order.placedAt) : new Date();
  const dateFormatted = placedDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const items = Array.isArray(order.items) ? order.items : [];
  const amounts = order.amounts || {};
  const subtotal = Number(amounts.subtotal || 0);
  const discount = Number(amounts.discount || 0);
  const shipping = Number(amounts.shipping || 0);
  const tax = Number(amounts.tax || 0);
  const total = Number(amounts.total || 0);

  const paymentMethodLabel = order.payment === 'cod'
    ? 'Cash on Delivery (COD)'
    : (order.payment === 'razorpay' ? 'Online Payment (Razorpay)' : (order.payment || 'Online Payment'));
  const paymentStatusLabel = order.paymentStatus === 'paid'
    ? 'Paid'
    : (order.payment === 'cod' ? 'Due on Delivery' : (order.paymentStatus || 'Pending'));

  const activeCourier = courier || order.courier || {};
  const carrier = String(activeCourier.carrier || order.carrier || '').trim();
  const trackingNumber = String(activeCourier.trackingNumber || order.trackingNumber || '').trim();
  const trackingUrl = String(activeCourier.trackingUrl || order.trackingUrl || '').trim();
  
  let estimatedDelivery = '';
  const rawEst = activeCourier.estimatedDelivery || order.estimatedDelivery;
  if (rawEst) {
    if (rawEst instanceof Date) {
      estimatedDelivery = rawEst.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } else if (typeof rawEst === 'string') {
      const parsedDate = new Date(rawEst);
      if (!isNaN(parsedDate.getTime()) && rawEst.includes('T')) {
        estimatedDelivery = parsedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      } else {
        estimatedDelivery = rawEst.trim();
      }
    } else {
      estimatedDelivery = String(rawEst).trim();
    }
  }

  const cancellationReason = String(order.cancellationReason || 'Order cancellation requested').trim();
  const refundStatus = order.payment === 'cod'
    ? 'No refund applicable (Cash on Delivery)'
    : String(order.refundStatus === 'refund_initiated' ? 'Refund Initiated' : (order.refundStatus || 'Refund Initiated')).trim();

  const effectiveOrderUrl = orderDetailsUrl || `${siteUrl}/orders/${order.id}`;

  const vars = {
    customerName: recipientName,
    orderNumber,
    orderDate: dateFormatted,
    status: statusLabel,
    total: `₹${total.toLocaleString('en-IN')}`,
    subtotal: `₹${subtotal.toLocaleString('en-IN')}`,
    discount: discount > 0 ? `₹${discount.toLocaleString('en-IN')}` : '₹0',
    shipping: shipping === 0 ? 'FREE' : `₹${shipping.toLocaleString('en-IN')}`,
    tax: tax > 0 ? `₹${tax.toLocaleString('en-IN')}` : '₹0',
    paymentMethod: paymentMethodLabel,
    paymentStatus: paymentStatusLabel,
    carrier: carrier || 'Verified Courier Partner',
    trackingNumber,
    trackingUrl,
    orderDetailsUrl: effectiveOrderUrl,
    storeName: 'MikuMantra Fine Jewellery',
    supportEmail: 'support@mikumantra.com',
    supportPhone: '+91 98100 00000',
    siteUrl,
    cancellationReason,
    refundStatus
  };

  const subject = interpolate(template?.subject || `Order #${orderNumber} Status: ${statusLabel} - {storeName}`, vars);
  const previewText = interpolate(template?.previewText || `Your order #${orderNumber} is now ${statusLabel}.`, vars);
  const heading = interpolate(template?.heading || `Order ${statusLabel}`, vars);
  const subheading = interpolate(template?.subheading || `${statusStyle.icon} Status: ${statusLabel}`, vars);
  const bodyText = interpolate(template?.bodyText || `Dear ${recipientName},\n\nYour order #${orderNumber} has been updated to "${statusLabel}".`, vars);
  const ctaText = interpolate(template?.ctaText || 'View Order Details ↗', vars);
  const ctaUrl = interpolate(template?.ctaUrl || '{orderDetailsUrl}', vars) || effectiveOrderUrl;
  const bannerText = interpolate(template?.bannerText || '✨ BIS Hallmarked 22K Gold · SGL Certified Diamonds · Insured Express Shipping', vars);
  const footerText = interpolate(template?.footerText || 'For questions or bespoke care assistance, reach out to our Jaipur atelier concierge at {supportEmail}.', vars);

  const bodyParagraphs = formatEmailParagraphs(bodyText);

  // Render product rows with images, titles, quantity, and pricing
  const itemRowsHtml = items.map((it) => {
    let imgSrc = it.image || '';
    if (imgSrc && imgSrc.startsWith('/')) {
      imgSrc = `${siteUrl}${imgSrc}`;
    }
    const itemPrice = Number(it.price) || 0;
    const itemQty = Number(it.qty) || 1;
    const itemSub = Number(it.subtotal) || (itemPrice * itemQty);

    return `
      <tr>
        <td style="padding: 14px 0; border-bottom: 1px solid #EAE3D2; vertical-align: top; width: 64px;">
          ${imgSrc ? `
            <img src="${imgSrc}" alt="${it.name || 'Jewellery'}" width="60" height="60" style="display: block; width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 1px solid #EAE3D2;" />
          ` : `
            <div style="width: 60px; height: 60px; background-color: #FAF6EF; border: 1px solid #EAE3D2; border-radius: 8px; text-align: center; line-height: 60px; font-size: 20px;">💎</div>
          `}
        </td>
        <td style="padding: 14px 12px; border-bottom: 1px solid #EAE3D2; vertical-align: top;">
          <div style="font-size: 13px; font-weight: 600; color: #1A1A1A; margin-bottom: 4px; line-height: 1.4;">
            ${it.name || 'Handcrafted Fine Jewellery'}
          </div>
          <div style="font-size: 12px; color: #777777;">
            Qty: <strong style="color: #333333;">${itemQty}</strong> &nbsp;·&nbsp; ₹${itemPrice.toLocaleString('en-IN')} each
          </div>
        </td>
        <td style="padding: 14px 0; border-bottom: 1px solid #EAE3D2; vertical-align: top; text-align: right; font-size: 13px; font-weight: 700; color: #1A1A1A; white-space: nowrap;">
          ₹${itemSub.toLocaleString('en-IN')}
        </td>
      </tr>
    `;
  }).join('');

  // Render tracking block ONLY when carrier or tracking number exists
  const hasTrackingInfo = Boolean(carrier || trackingNumber || trackingUrl);
  const trackingBlockHtml = hasTrackingInfo ? `
    <tr>
      <td style="padding: 0 32px 24px 32px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF6EF; border: 1.5px solid #D4AF37; border-radius: 12px; padding: 20px; text-align: center;">
          <tr>
            <td>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #9C6B30; font-weight: 700; margin-bottom: 8px;">
                🚚 Logistics &amp; Courier Details
              </div>
              ${carrier ? `
                <div style="font-size: 14px; color: #1A1A1A; margin-bottom: 6px;">
                  Logistics Carrier: <strong>${carrier}</strong>
                </div>
              ` : ''}
              ${trackingNumber ? `
                <div style="font-size: 13px; color: #444444; margin-bottom: 6px;">
                  AWB / Tracking Number: <strong style="font-family: 'Courier New', Courier, monospace; color: #1A1A1A; letter-spacing: 0.05em;">${trackingNumber}</strong>
                </div>
              ` : ''}
              ${estimatedDelivery ? `
                <div style="font-size: 12px; color: #666666; margin-bottom: 10px;">
                  Estimated Delivery: <strong style="color: #1A1A1A;">${estimatedDelivery}</strong>
                </div>
              ` : ''}
              ${trackingUrl ? `
                <div style="margin-top: 12px;">
                  <a href="${trackingUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #9C6B30; color: #FFFFFF; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; text-decoration: none; padding: 10px 22px; border-radius: 50px; box-shadow: 0 2px 8px rgba(156,107,48,0.2);">
                    Track Consignment ↗
                  </a>
                </div>
              ` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  ` : '';

  // Render cancellation & refund notice block if cancelled
  const isCancelled = normStatus === 'cancelled';
  const cancellationBlockHtml = isCancelled ? `
    <tr>
      <td style="padding: 0 32px 24px 32px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FEF2F2; border: 1.5px solid #FCA5A5; border-radius: 12px; padding: 18px;">
          <tr>
            <td>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #B91C1C; font-weight: 700; margin-bottom: 6px;">
                ✕ Cancellation Details
              </div>
              <div style="font-size: 13px; color: #7F1D1D; margin-bottom: 4px;">
                Reason: <strong>${cancellationReason}</strong>
              </div>
              <div style="font-size: 13px; color: #7F1D1D;">
                Refund Status: <strong>${refundStatus}</strong>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF6EF; color: #1A1A1A; -webkit-font-smoothing: antialiased;">
  ${previewText ? `<div style="display: none; max-height: 0px; overflow: hidden;">${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF6EF; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.06); border: 1px solid #EAE3D2;">
          
          <!-- Atelier Header -->
          <tr>
            <td style="background-color: #0F0F10; padding: 30px 24px; text-align: center; border-bottom: 3px solid #9C6B30;">
              <div style="font-family: Georgia, serif; font-size: 26px; font-weight: bold; letter-spacing: 0.18em; color: #D4AF37; text-transform: uppercase;">
                MikuMantra
              </div>
              <div style="font-size: 9px; letter-spacing: 0.35em; color: #CCCCCC; text-transform: uppercase; margin-top: 6px;">
                House of Fine Jewellery · Jaipur Atelier
              </div>
            </td>
          </tr>

          <!-- Hero Status Header -->
          <tr>
            <td style="padding: 36px 32px 20px 32px; text-align: center;">
              <div style="display: inline-block; background-color: ${statusStyle.badgeBg}; color: ${statusStyle.badgeText}; font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; padding: 6px 18px; border-radius: 50px; margin-bottom: 16px; border: 1px solid ${statusStyle.badgeBorder};">
                ${subheading}
              </div>
              <h1 style="font-family: Georgia, serif; font-size: 24px; font-weight: 400; color: #1A1A1A; margin: 0 0 12px 0; line-height: 1.3;">
                ${heading}
              </h1>
              <div style="font-size: 14px; line-height: 1.7; color: #444444; max-width: 500px; margin: 0 auto; text-align: left;">
                ${bodyParagraphs}
              </div>
            </td>
          </tr>

          <!-- Order Summary Metadata Bar -->
          <tr>
            <td style="padding: 0 32px 22px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF6EF; border-radius: 10px; border: 1px solid #EAE3D2; padding: 14px 18px;">
                <tr>
                  <td style="font-size: 12px; color: #777777; width: 33%; vertical-align: top;">
                    Order Number:<br />
                    <strong style="font-size: 13px; color: #1A1A1A; font-family: 'Courier New', Courier, monospace;">#${orderNumber}</strong>
                  </td>
                  <td style="font-size: 12px; color: #777777; width: 33%; text-align: center; vertical-align: top;">
                    Order Date:<br />
                    <strong style="font-size: 13px; color: #1A1A1A;">${dateFormatted}</strong>
                  </td>
                  <td style="font-size: 12px; color: #777777; width: 34%; text-align: right; vertical-align: top;">
                    Updated Status:<br />
                    <strong style="font-size: 13px; color: ${statusStyle.badgeText}; text-transform: uppercase;">${statusLabel}</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Optional Tracking Block -->
          ${trackingBlockHtml}

          <!-- Optional Cancellation Block -->
          ${cancellationBlockHtml}

          <!-- Items Ordered Section -->
          ${items.length > 0 ? `
            <tr>
              <td style="padding: 0 32px 18px 32px;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #9C6B30; margin-bottom: 10px; border-bottom: 1px solid #EAE3D2; padding-bottom: 6px;">
                  Items in This Order
                </div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  ${itemRowsHtml}
                </table>
              </td>
            </tr>
          ` : ''}

          <!-- Pricing & Payment Breakdown -->
          ${total > 0 ? `
            <tr>
              <td style="padding: 0 32px 28px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 13px; line-height: 1.8; color: #555555;">
                  ${subtotal > 0 ? `
                    <tr>
                      <td style="padding: 3px 0;">Items Subtotal</td>
                      <td style="padding: 3px 0; text-align: right; color: #1A1A1A; font-weight: 600;">₹${subtotal.toLocaleString('en-IN')}</td>
                    </tr>
                  ` : ''}
                  ${discount > 0 ? `
                    <tr>
                      <td style="padding: 3px 0; color: #16A34A;">Special Privilege Discount</td>
                      <td style="padding: 3px 0; text-align: right; color: #16A34A; font-weight: 600;">-₹${discount.toLocaleString('en-IN')}</td>
                    </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 3px 0;">Insured Express Shipping</td>
                    <td style="padding: 3px 0; text-align: right; color: #1A1A1A; font-weight: 600;">${shipping === 0 ? 'FREE' : `₹${shipping.toLocaleString('en-IN')}`}</td>
                  </tr>
                  ${tax > 0 ? `
                    <tr>
                      <td style="padding: 3px 0;">Applicable Taxes (GST 3%)</td>
                      <td style="padding: 3px 0; text-align: right; color: #1A1A1A; font-weight: 600;">₹${tax.toLocaleString('en-IN')}</td>
                    </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 10px 0 4px 0; border-top: 1px solid #EAE3D2; font-size: 15px; font-weight: 700; color: #1A1A1A;">Grand Total</td>
                    <td style="padding: 10px 0 4px 0; border-top: 1px solid #EAE3D2; text-align: right; font-size: 16px; font-weight: 700; color: #9C6B30;">₹${total.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 0; font-size: 11px; color: #888888;">Payment Method</td>
                    <td style="padding: 2px 0; text-align: right; font-size: 11px; color: #555555; text-transform: uppercase;">${paymentMethodLabel} (${paymentStatusLabel})</td>
                  </tr>
                </table>
              </td>
            </tr>
          ` : ''}

          <!-- Primary CTA Button -->
          ${ctaText && ctaUrl ? `
            <tr>
              <td style="padding: 0 32px 32px 32px; text-align: center;">
                <a href="${ctaUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #9C6B30; color: #FFFFFF; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.16em; text-decoration: none; padding: 13px 32px; border-radius: 50px; box-shadow: 0 4px 16px rgba(156,107,48,0.25);">
                  ${ctaText}
                </a>
              </td>
            </tr>
          ` : ''}

          <!-- Assurance Banner -->
          ${bannerText ? `
            <tr>
              <td style="background-color: #FAF6EF; padding: 16px 24px; border-top: 1px solid #EAE3D2; border-bottom: 1px solid #EAE3D2; text-align: center;">
                <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #9C6B30; margin: 0; font-weight: 600;">
                  ${bannerText}
                </p>
              </td>
            </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; text-align: center;">
              <p style="font-size: 12px; line-height: 1.6; color: #777777; margin: 0 0 10px 0;">
                ${footerText.replace(/\n/g, '<br />')}
              </p>
              <p style="font-size: 11px; color: #999999; margin: 0;">
                © ${new Date().getFullYear()} MikuMantra Fine Jewellery. All rights reserved.<br />
                Jaipur Atelier, Rajasthan, India. Concierge: support@mikumantra.com
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Plaintext fallback generator for order status update emails.
 */
export function renderOrderStatusUpdateText({
  order,
  user = null,
  recipientName = 'Valued Collector',
  previousStatus = '',
  newStatus = '',
  courier = null,
  siteUrl = 'https://mikumantra.vercel.app',
  orderDetailsUrl = '',
  template = null
}) {
  const normStatus = String(newStatus || order.status || '').toLowerCase().trim();
  const statusStyle = STATUS_STYLES[normStatus] || STATUS_STYLES.processing;
  const statusLabel = statusStyle.label;
  const orderNumber = order.orderNumber || order.id;
  const placedDate = order.placedAt ? new Date(order.placedAt) : new Date();
  const dateFormatted = placedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const total = order.amounts?.total ? `₹${Number(order.amounts.total).toLocaleString('en-IN')}` : '';
  const effectiveOrderUrl = orderDetailsUrl || `${siteUrl}/orders/${order.id}`;

  const activeCourier = courier || order.courier || {};
  const carrier = activeCourier.carrier || order.carrier || '';
  const trackingNumber = activeCourier.trackingNumber || order.trackingNumber || '';
  const trackingUrl = activeCourier.trackingUrl || order.trackingUrl || '';

  const items = Array.isArray(order.items) ? order.items : [];
  const itemsText = items.map(i => `- ${i.name || 'Jewellery'} (Qty: ${i.qty || 1}, ₹${(Number(i.price) || 0).toLocaleString('en-IN')})`).join('\n');

  let trackingText = '';
  if (carrier || trackingNumber || trackingUrl) {
    trackingText = `\nLOGISTICS & TRACKING:\nCarrier: ${carrier || 'Verified Partner'}\nAWB / Tracking Number: ${trackingNumber || 'Pending'}\nTrack Online: ${trackingUrl || effectiveOrderUrl}\n`;
  }

  return `
MIKUMANTRA FINE JEWELLERY - ORDER STATUS UPDATE
--------------------------------------------------
Order Number: #${orderNumber}
Order Date: ${dateFormatted}
Status: ${statusLabel}
Total: ${total}

Dear ${recipientName},

Your order #${orderNumber} status has been updated to "${statusLabel}".
${trackingText}
ITEMS IN YOUR ORDER:
${itemsText || 'Fine handcrafted jewellery'}

View your order details and invoice online:
${effectiveOrderUrl}

Atelier Concierge Contact:
Email: support@mikumantra.com
Phone: +91 98100 00000
Jaipur Atelier, Rajasthan, India
  `.trim();
}

/**
 * Dispatches an Order Status Update notification email to the customer.
 */
export async function sendOrderStatusUpdateEmail({
  toEmail,
  order,
  user = null,
  previousStatus = '',
  newStatus = '',
  courier = null,
  customSettings = null,
  db = null
}) {
  if (!toEmail || !order) {
    return { sent: false, reason: 'MISSING_PARAMS', error: 'Recipient email and order object are required.' };
  }

  const normalizedStatus = String(newStatus || order.status || '').toLowerCase().trim();
  let templateId = 'order_processing';
  if (normalizedStatus === 'confirmed' || normalizedStatus === 'placed') {
    templateId = 'order_confirmation';
  } else if (normalizedStatus === 'processing' || normalizedStatus === 'packed') {
    templateId = 'order_processing';
  } else if (normalizedStatus === 'shipped') {
    templateId = 'order_shipped';
  } else if (normalizedStatus === 'out_for_delivery' || normalizedStatus === 'out for delivery') {
    templateId = 'order_out_for_delivery';
  } else if (normalizedStatus === 'delivered') {
    templateId = 'order_delivered';
  } else if (normalizedStatus === 'cancelled') {
    templateId = 'order_cancelled';
  } else if (normalizedStatus === 'refunded') {
    templateId = 'order_refunded';
  }

  const template = await getEmailTemplate(db, templateId);
  if (template && template.isEnabled === false) {
    console.log(`[EMAIL SYSTEM] Status notification email for '${normalizedStatus}' (${templateId}) is disabled by admin setting. Skipping send to ${toEmail}.`);
    return { sent: false, skipped: true, reason: 'DISABLED_BY_ADMIN' };
  }

  const config = getSmtpConfig(customSettings);
  const recipientName = (order.address?.fullName || user?.name || toEmail.split('@')[0] || 'Valued Collector').trim();
  const orderNumber = order.orderNumber || order.id;
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mikumantra.vercel.app';
  const orderDetailsUrl = `${siteUrl}/orders/${order.id}`;

  const html = renderOrderStatusUpdateHtml({
    order,
    user,
    recipientName,
    previousStatus,
    newStatus: normalizedStatus,
    courier: courier || order.courier,
    siteUrl,
    orderDetailsUrl,
    template
  });

  const text = renderOrderStatusUpdateText({
    order,
    user,
    recipientName,
    previousStatus,
    newStatus: normalizedStatus,
    courier: courier || order.courier,
    siteUrl,
    orderDetailsUrl,
    template
  });

  const carrier = courier?.carrier || order.courier?.carrier || order.carrier || '';
  const trackingNumber = courier?.trackingNumber || order.courier?.trackingNumber || order.trackingNumber || '';
  const trackingUrl = courier?.trackingUrl || order.courier?.trackingUrl || order.trackingUrl || '';

  const vars = {
    customerName: recipientName,
    orderNumber,
    orderDate: order.placedAt ? new Date(order.placedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    status: normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1).replace(/_/g, ' '),
    total: order.amounts?.total ? `₹${Number(order.amounts.total).toLocaleString('en-IN')}` : '',
    subtotal: order.amounts?.subtotal ? `₹${Number(order.amounts.subtotal).toLocaleString('en-IN')}` : '',
    discount: order.amounts?.discount ? `₹${Number(order.amounts.discount).toLocaleString('en-IN')}` : '₹0',
    shipping: order.amounts?.shipping === 0 ? 'FREE' : (order.amounts?.shipping ? `₹${Number(order.amounts.shipping).toLocaleString('en-IN')}` : 'FREE'),
    carrier,
    trackingNumber,
    trackingUrl,
    orderDetailsUrl,
    storeName: 'MikuMantra Fine Jewellery',
    supportEmail: 'support@mikumantra.com',
    supportPhone: '+91 98100 00000',
    siteUrl,
    cancellationReason: order.cancellationReason || 'Order cancellation processed',
    refundStatus: order.payment === 'cod' ? 'No refund applicable (Cash on Delivery)' : (order.refundStatus === 'refund_initiated' ? 'Refund Initiated' : (order.refundStatus || 'Refund Initiated'))
  };

  const defaultSubject = `Order #${orderNumber} Status Updated - ${vars.storeName}`;
  const subject = interpolate(template?.subject || defaultSubject, vars);

  if (!config.isConfigured) {
    console.warn(`[EMAIL SYSTEM] Email provider not configured. Status update email for Order #${orderNumber} (${normalizedStatus}) to ${toEmail} logged as mock.`);
    return { sent: true, mock: true, message: 'SMTP not configured; status notification logged.' };
  }

  if (config.resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: config.from,
          to: [toEmail],
          subject,
          html,
          text,
          reply_to: config.replyTo
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Resend API Error HTTP ${res.status}`);
      }
      return { sent: true, provider: 'Resend', messageId: data.id };
    } catch (err) {
      console.error(`[RESEND ERROR] Failed to send status email to ${toEmail}:`, err.message);
      return { sent: false, error: err.message };
    }
  }

  try {
    const transporter = createTransporter(customSettings);
    if (!transporter) {
      throw new Error('Could not create SMTP transporter instance');
    }
    const info = await transporter.sendMail({
      from: config.from,
      to: toEmail,
      replyTo: config.replyTo,
      subject,
      text,
      html
    });

    return { sent: true, provider: 'SMTP', messageId: info.messageId };
  } catch (err) {
    console.error(`[EMAIL ERROR] Failed to send status email to ${toEmail}:`, err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Renders an exquisite, responsive HTML email for Customer Order Confirmation.
 */
export function renderOrderConfirmationHtml({ order, user, recipientName, siteUrl, orderDetailsUrl, template = null }) {
  const t = template || DEFAULT_EMAIL_TEMPLATES.order_confirmation;
  const orderNumber = order.orderNumber || order.id;
  const placedDate = order.placedAt ? new Date(order.placedAt) : new Date();
  const dateFormatted = placedDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const items = Array.isArray(order.items) ? order.items : [];
  const amounts = order.amounts || {};
  const subtotal = amounts.subtotal || 0;
  const discount = amounts.discount || 0;
  const shipping = amounts.shipping || 0;
  const tax = amounts.tax || 0;
  const giftWrap = amounts.giftWrap || 0;
  const total = amounts.total || 0;
  const coupon = order.coupon || '';

  const paymentMethodLabel = order.payment === 'cod'
    ? 'Cash on Delivery (COD)'
    : (order.payment === 'razorpay' ? 'Online Payment (Razorpay)' : (order.payment || 'Online Payment'));
  const paymentStatusLabel = order.paymentStatus === 'paid'
    ? 'Paid'
    : (order.payment === 'cod' ? 'Due on Delivery' : (order.paymentStatus || 'Pending'));

  const addr = order.address || {};
  const addrFullName = addr.fullName || recipientName;
  const addrPhone = addr.phone || '';
  const addrLine1 = addr.line1 || '';
  const addrLine2 = addr.line2 || '';
  const addrCity = addr.city || '';
  const addrState = addr.state || '';
  const addrPincode = addr.pincode || '';
  const formattedAddress = [addrLine1, addrLine2, [addrCity, addrState].filter(Boolean).join(', '), addrPincode].filter(Boolean).join('<br />');

  const carrier = order.courier?.carrier || order.carrier || '';
  const trackingNumber = order.courier?.trackingNumber || order.trackingNumber || '';
  const trackingUrl = order.courier?.trackingUrl || order.trackingUrl || '';

  const vars = {
    customerName: recipientName,
    orderNumber,
    orderDate: dateFormatted,
    total: `₹${total.toLocaleString('en-IN')}`,
    subtotal: `₹${subtotal.toLocaleString('en-IN')}`,
    discount: discount > 0 ? `₹${discount.toLocaleString('en-IN')}` : '₹0',
    shipping: shipping === 0 ? 'FREE' : `₹${shipping.toLocaleString('en-IN')}`,
    tax: tax > 0 ? `₹${tax.toLocaleString('en-IN')}` : '₹0',
    paymentMethod: paymentMethodLabel,
    paymentStatus: paymentStatusLabel,
    shippingAddress: [addrFullName, addrLine1, addrLine2, addrCity, addrState, addrPincode].filter(Boolean).join(', '),
    carrier,
    trackingNumber,
    trackingUrl,
    orderDetailsUrl,
    storeName: 'MikuMantra Fine Jewellery',
    supportEmail: 'support@mikumantra.com',
    siteUrl
  };

  const subject = interpolate(t.subject, vars);
  const previewText = interpolate(t.previewText, vars);
  const heading = interpolate(t.heading, vars);
  const subheading = interpolate(t.subheading, vars);
  const bodyText = interpolate(t.bodyText, vars);
  const ctaText = interpolate(t.ctaText, vars);
  const ctaUrl = interpolate(t.ctaUrl, vars) || orderDetailsUrl;
  const bannerText = interpolate(t.bannerText, vars);
  const footerText = interpolate(t.footerText, vars);

  const bodyParagraphs = formatEmailParagraphs(bodyText);

  // Items table rows
  const itemRowsHtml = items.map((it) => {
    let imgSrc = it.image || '';
    if (imgSrc && imgSrc.startsWith('/')) {
      imgSrc = `${siteUrl}${imgSrc}`;
    }
    const itemPrice = Number(it.price) || 0;
    const itemQty = Number(it.qty) || 1;
    const itemSub = Number(it.subtotal) || (itemPrice * itemQty);

    return `
      <tr>
        <td style="padding: 16px 0; border-bottom: 1px solid #EAE3D2; vertical-align: top; width: 68px;">
          ${imgSrc ? `
            <img src="${imgSrc}" alt="${it.name || 'Jewellery'}" width="64" height="64" style="display: block; width: 64px; height: 64px; object-fit: cover; border-radius: 8px; border: 1px solid #EAE3D2;" />
          ` : `
            <div style="width: 64px; height: 64px; background-color: #FAF6EF; border: 1px solid #EAE3D2; border-radius: 8px; text-align: center; line-height: 64px; font-size: 20px;">💎</div>
          `}
        </td>
        <td style="padding: 16px 12px; border-bottom: 1px solid #EAE3D2; vertical-align: top;">
          <div style="font-size: 14px; font-weight: 600; color: #1A1A1A; margin-bottom: 4px; line-height: 1.4;">
            ${it.name || 'Handcrafted Fine Jewellery'}
          </div>
          <div style="font-size: 12px; color: #777777;">
            Qty: <strong style="color: #333333;">${itemQty}</strong> &nbsp;·&nbsp; ₹${itemPrice.toLocaleString('en-IN')} each
          </div>
        </td>
        <td style="padding: 16px 0; border-bottom: 1px solid #EAE3D2; vertical-align: top; text-align: right; font-size: 14px; font-weight: 700; color: #1A1A1A; white-space: nowrap;">
          ₹${itemSub.toLocaleString('en-IN')}
        </td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF6EF; color: #1A1A1A; -webkit-font-smoothing: antialiased;">
  ${previewText ? `<div style="display: none; max-height: 0px; overflow: hidden;">${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF6EF; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Container Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.06); border: 1px solid #EAE3D2;">
          
          <!-- Atelier Header -->
          <tr>
            <td style="background-color: #0F0F10; padding: 32px 24px; text-align: center; border-bottom: 3px solid #9C6B30;">
              <div style="font-family: Georgia, serif; font-size: 26px; font-weight: bold; letter-spacing: 0.18em; color: #D4AF37; text-transform: uppercase;">
                MikuMantra
              </div>
              <div style="font-size: 9px; letter-spacing: 0.35em; color: #CCCCCC; text-transform: uppercase; margin-top: 6px;">
                House of Fine Jewellery · Jaipur Atelier
              </div>
            </td>
          </tr>

          <!-- Confirmation Hero -->
          <tr>
            <td style="padding: 36px 32px 24px 32px; text-align: center;">
              ${subheading ? `
                <div style="display: inline-block; background-color: #F4EBD9; color: #9C6B30; font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; padding: 6px 16px; border-radius: 50px; margin-bottom: 16px; border: 1px solid #D4AF37;">
                  ${subheading}
                </div>
              ` : ''}
              <h1 style="font-family: Georgia, serif; font-size: 24px; font-weight: 400; color: #1A1A1A; margin: 0 0 10px 0; line-height: 1.3;">
                ${heading}
              </h1>
              <div style="font-size: 14px; line-height: 1.6; color: #555555; margin: 0 auto; max-width: 480px;">
                ${bodyParagraphs}
              </div>
            </td>
          </tr>

          <!-- Order Metadata Bar -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF6EF; border-radius: 10px; border: 1px solid #EAE3D2; padding: 14px 18px;">
                <tr>
                  <td style="font-size: 12px; color: #777777; width: 50%;">
                    Order Number:<br />
                    <strong style="font-size: 14px; color: #1A1A1A; font-family: 'Courier New', Courier, monospace;">#${orderNumber}</strong>
                  </td>
                  <td style="font-size: 12px; color: #777777; width: 50%; text-align: right;">
                    Order Date:<br />
                    <strong style="font-size: 14px; color: #1A1A1A;">${dateFormatted}</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Ordered Section -->
          <tr>
            <td style="padding: 0 32px 20px 32px;">
              <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #9C6B30; margin-bottom: 12px; border-bottom: 1px solid #EAE3D2; padding-bottom: 8px;">
                Items in Your Order
              </div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                ${itemRowsHtml}
              </table>
            </td>
          </tr>

          <!-- Price Breakdown Section -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 13px; line-height: 1.8; color: #555555;">
                <tr>
                  <td style="padding: 4px 0;">Subtotal</td>
                  <td style="padding: 4px 0; text-align: right; color: #1A1A1A; font-weight: 600;">₹${subtotal.toLocaleString('en-IN')}</td>
                </tr>
                ${discount > 0 ? `
                  <tr>
                    <td style="padding: 4px 0; color: #16A34A;">
                      Discount ${coupon ? `(${coupon})` : ''}
                    </td>
                    <td style="padding: 4px 0; text-align: right; color: #16A34A; font-weight: 600;">
                      - ₹${discount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ` : ''}
                <tr>
                  <td style="padding: 4px 0;">Delivery Charges</td>
                  <td style="padding: 4px 0; text-align: right; color: #1A1A1A; font-weight: 600;">
                    ${shipping === 0 ? '<span style="color: #16A34A;">FREE</span>' : `₹${shipping.toLocaleString('en-IN')}`}
                  </td>
                </tr>
                ${tax > 0 ? `
                  <tr>
                    <td style="padding: 4px 0;">Applicable Taxes (GST 3%)</td>
                    <td style="padding: 4px 0; text-align: right; color: #1A1A1A; font-weight: 600;">₹${tax.toLocaleString('en-IN')}</td>
                  </tr>
                ` : ''}
                ${giftWrap > 0 ? `
                  <tr>
                    <td style="padding: 4px 0;">Signature Velvet Gift Wrap</td>
                    <td style="padding: 4px 0; text-align: right; color: #1A1A1A; font-weight: 600;">₹${giftWrap.toLocaleString('en-IN')}</td>
                  </tr>
                ` : ''}
                <tr>
                  <td style="padding: 12px 0 0 0; border-top: 2px solid #1A1A1A; font-size: 15px; font-weight: 700; color: #1A1A1A;">
                    Final Total
                  </td>
                  <td style="padding: 12px 0 0 0; border-top: 2px solid #1A1A1A; text-align: right; font-size: 18px; font-weight: 700; color: #9C6B30;">
                    ₹${total.toLocaleString('en-IN')}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Shipping & Payment Information -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF8F5; border: 1px solid #EAE3D2; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 20px; width: 50%; vertical-align: top; border-right: 1px solid #EAE3D2;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #9C6B30; font-weight: 700; margin-bottom: 8px;">
                      📍 Shipping Address
                    </div>
                    <div style="font-size: 13px; line-height: 1.5; color: #333333;">
                      <strong>${addrFullName}</strong><br />
                      ${formattedAddress || 'Address on file'}<br />
                      ${addrPhone ? `Phone: ${addrPhone}` : ''}
                    </div>
                  </td>
                  <td style="padding: 20px; width: 50%; vertical-align: top;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #9C6B30; font-weight: 700; margin-bottom: 8px;">
                      💳 Payment & Status
                    </div>
                    <div style="font-size: 13px; line-height: 1.6; color: #333333;">
                      Method: <strong>${paymentMethodLabel}</strong><br />
                      Payment Status: <strong>${paymentStatusLabel}</strong><br />
                      Order Status: <strong style="color: #9C6B30;">${order.status || 'Confirmed'}</strong>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${(carrier || trackingNumber || trackingUrl) ? `
            <!-- Tracking Information (if already assigned) -->
            <tr>
              <td style="padding: 0 32px 28px 32px;">
                <div style="background-color: #FAF6EF; border: 1.5px solid #D4AF37; border-radius: 12px; padding: 20px; text-align: center;">
                  <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #9C6B30; font-weight: 700; margin-bottom: 6px;">
                    🚚 Shipment & Logistics
                  </div>
                  <div style="font-size: 13px; color: #333333; margin-bottom: 8px;">
                    Carrier: <strong>${carrier || 'Verified Logistics'}</strong>
                    ${trackingNumber ? `&nbsp;·&nbsp; AWB: <strong style="font-family: 'Courier New', Courier, monospace;">${trackingNumber}</strong>` : ''}
                  </div>
                  ${trackingUrl ? `
                    <a href="${trackingUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #9C6B30; color: #FFFFFF; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; text-decoration: none; padding: 8px 18px; border-radius: 6px;">
                      Track Shipment ↗
                    </a>
                  ` : ''}
                </div>
              </td>
            </tr>
          ` : ''}

          <!-- View Order CTA Button -->
          ${ctaText && ctaUrl ? `
            <tr>
              <td style="padding: 0 32px 32px 32px; text-align: center;">
                <a href="${ctaUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #1A1A1A; color: #FFFFFF; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em; text-decoration: none; padding: 16px 36px; border-radius: 50px; box-shadow: 0 4px 16px rgba(0,0,0,0.15);">
                  ${ctaText}
                </a>
              </td>
            </tr>
          ` : ''}

          <!-- Atelier Assurance Banner -->
          ${bannerText ? `
            <tr>
              <td style="background-color: #FAF6EF; padding: 18px 24px; border-top: 1px solid #EAE3D2; border-bottom: 1px solid #EAE3D2; text-align: center;">
                <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #9C6B30; margin: 0; font-weight: 600;">
                  ${bannerText}
                </p>
              </td>
            </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; text-align: center;">
              <p style="font-size: 12px; line-height: 1.6; color: #777777; margin: 0 0 10px 0;">
                ${footerText.replace(/\n/g, '<br />')}
              </p>
              <p style="font-size: 11px; color: #999999; margin: 0;">
                © ${new Date().getFullYear()} ${vars.storeName}. All rights reserved.<br />
                Jaipur Atelier, Rajasthan, India.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Plain-text fallback for Customer Order Confirmation.
 */
export function renderOrderConfirmationText({ order, user, recipientName, siteUrl, orderDetailsUrl, template = null }) {
  const orderNumber = order.orderNumber || order.id;
  const placedDate = order.placedAt ? new Date(order.placedAt) : new Date();
  const dateFormatted = placedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const items = Array.isArray(order.items) ? order.items : [];
  const amounts = order.amounts || {};
  const paymentMethodLabel = order.payment === 'cod' ? 'Cash on Delivery (COD)' : (order.payment || 'Online Payment');

  const itemsList = items.map(it => `- ${it.name || 'Product'} x ${it.qty || 1} — ₹${(it.subtotal || ((it.price || 0) * (it.qty || 1))).toLocaleString('en-IN')}`).join('\n');
  const addr = order.address || {};

  return `
MikuMantra Fine Jewellery - Order Confirmed

Dear ${recipientName},

Thank you for choosing MikuMantra. Your order #${orderNumber} has been successfully placed on ${dateFormatted}.

ORDER DETAILS:
Order Number: #${orderNumber}
Order Date: ${dateFormatted}
Status: ${order.status || 'Confirmed'}
Payment Method: ${paymentMethodLabel} (${order.paymentStatus || 'Pending'})

ITEMS ORDERED:
${itemsList}

PRICING SUMMARY:
Subtotal: ₹${(amounts.subtotal || 0).toLocaleString('en-IN')}
${amounts.discount ? `Discount: -₹${amounts.discount.toLocaleString('en-IN')}\n` : ''}Shipping: ${amounts.shipping === 0 ? 'FREE' : `₹${(amounts.shipping || 0).toLocaleString('en-IN')}`}
${amounts.tax ? `Taxes: ₹${amounts.tax.toLocaleString('en-IN')}\n` : ''}${amounts.giftWrap ? `Signature Gift Wrap: ₹${amounts.giftWrap.toLocaleString('en-IN')}\n` : ''}Final Total: ₹${(amounts.total || 0).toLocaleString('en-IN')}

SHIPPING ADDRESS:
${addr.fullName || recipientName}
${addr.line1 || ''} ${addr.line2 || ''}
${addr.city || ''}, ${addr.state || ''} - ${addr.pincode || ''}
Phone: ${addr.phone || ''}

View your order online:
${orderDetailsUrl}

Warm regards,
The MikuMantra Concierge
Jaipur Atelier, Rajasthan, India
  `.trim();
}

/**
 * Sends Customer Order Confirmation Email.
 */
export async function sendOrderConfirmationEmail({ toEmail, order, user, customSettings = null, db = null }) {
  if (!toEmail || !order) {
    return { sent: false, reason: 'MISSING_PARAMS', error: 'Recipient email and order object are required.' };
  }

  const template = await getEmailTemplate(db, 'order_confirmation');
  if (template && template.isEnabled === false) {
    console.log(`[EMAIL SYSTEM] Customer order confirmation email is disabled by admin setting. Skipping send to ${toEmail}.`);
    return { sent: false, skipped: true, reason: 'DISABLED_BY_ADMIN' };
  }

  const config = getSmtpConfig(customSettings);
  const recipientName = (order.address?.fullName || user?.name || toEmail.split('@')[0] || 'Valued Collector').trim();
  const orderNumber = order.orderNumber || order.id;
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mikumantra.vercel.app';
  const orderDetailsUrl = `${siteUrl}/orders/${order.id}`;

  const html = renderOrderConfirmationHtml({ order, user, recipientName, siteUrl, orderDetailsUrl, template });
  const text = renderOrderConfirmationText({ order, user, recipientName, siteUrl, orderDetailsUrl, template });

  const vars = {
    customerName: recipientName,
    orderNumber,
    orderDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    total: order.amounts?.total ? `₹${order.amounts.total.toLocaleString('en-IN')}` : '',
    storeName: 'MikuMantra Fine Jewellery',
    supportEmail: 'support@mikumantra.com',
    siteUrl
  };
  const subject = interpolate(template?.subject || 'Order Confirmed: #{orderNumber} - {storeName}', vars);

  if (!config.isConfigured) {
    console.warn(`[EMAIL SYSTEM] SMTP not configured. Confirmation email for Order #${orderNumber} to ${toEmail} logged.`);
    return { sent: true, mock: true, message: 'SMTP not configured; confirmation email logged.' };
  }

  if (config.resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: config.from,
          to: [toEmail],
          subject,
          html,
          text,
          reply_to: config.replyTo
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Resend API Error ${res.status}`);
      }
      return { sent: true, messageId: data.id };
    } catch (err) {
      console.error(`[RESEND ERROR] Failed to send order confirmation to ${toEmail}:`, err.message);
      return { sent: false, error: err.message };
    }
  }

  try {
    const transporter = createTransporter(customSettings);
    if (!transporter) {
      throw new Error('Could not create SMTP transporter instance');
    }
    const info = await transporter.sendMail({
      from: config.from,
      to: toEmail,
      replyTo: config.replyTo,
      subject,
      text,
      html
    });

    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EMAIL ERROR] Failed to send order confirmation to ${toEmail}:`, err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Renders HTML for Admin Order Notification.
 */
export function renderAdminOrderNotificationHtml({ order, user, customerName, siteUrl, adminOrderUrl, template = null }) {
  const t = template || DEFAULT_EMAIL_TEMPLATES.admin_order_notification;
  const orderNumber = order.orderNumber || order.id;
  const total = order.amounts?.total || 0;
  const formattedTotal = `₹${total.toLocaleString('en-IN')}`;
  const items = Array.isArray(order.items) ? order.items : [];
  const customerEmail = order.customerEmail || order.guestEmail || user?.email || 'N/A';
  const customerPhone = order.address?.phone || user?.phone || 'N/A';
  const paymentMethod = order.payment === 'cod' ? 'Cash on Delivery (COD)' : (order.payment || 'Online Payment');
  const storeName = 'MikuMantra Fine Jewellery';

  const vars = {
    customerName,
    customerEmail,
    customerPhone,
    orderNumber,
    total: formattedTotal,
    itemsCount: items.length,
    paymentMethod,
    paymentStatus: order.paymentStatus || 'Pending',
    adminOrderUrl,
    storeName,
    siteUrl
  };

  const subject = interpolate(t.subject, vars);
  const previewText = interpolate(t.previewText, vars);
  const heading = interpolate(t.heading, vars);
  const subheading = interpolate(t.subheading, vars);
  const bodyText = interpolate(t.bodyText, vars);
  const ctaText = interpolate(t.ctaText, vars);
  const ctaUrl = interpolate(t.ctaUrl, vars) || adminOrderUrl;
  const bannerText = interpolate(t.bannerText, vars);
  const footerText = interpolate(t.footerText, vars);

  const bodyParagraphs = formatEmailParagraphs(bodyText);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF6EF; padding: 24px; color: #1A1A1A; margin: 0;">
  ${previewText ? `<div style="display: none; max-height: 0px; overflow: hidden;">${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}

  <div style="max-width: 580px; margin: 0 auto; background: #FFF; border-radius: 14px; overflow: hidden; border: 1px solid #EAE3D2; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
    <!-- Header -->
    <div style="background-color: #0F0F10; padding: 26px 20px; text-align: center; border-bottom: 3px solid #9C6B30;">
      <div style="font-family: Georgia, serif; font-size: 22px; font-weight: bold; letter-spacing: 0.18em; color: #D4AF37; text-transform: uppercase;">
        MikuMantra
      </div>
      <div style="font-size: 9px; letter-spacing: 0.35em; color: #CCCCCC; text-transform: uppercase; margin-top: 4px;">
        Atelier Commerce Engine · Admin Alert
      </div>
    </div>

    <!-- Content -->
    <div style="padding: 30px 24px;">
      ${subheading ? `
        <div style="display: inline-block; background-color: #F4EBD9; color: #9C6B30; font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; padding: 5px 14px; border-radius: 50px; margin-bottom: 14px; border: 1px solid #D4AF37;">
          ${subheading}
        </div>
      ` : ''}
      <h2 style="color: #1A1A1A; margin-top: 0; margin-bottom: 12px; font-family: Georgia, serif; font-size: 20px;">
        ${heading}
      </h2>
      <div style="font-size: 14px; line-height: 1.6; color: #444444; margin-bottom: 20px;">
        ${bodyParagraphs}
      </div>

      <!-- Order Details Summary Box -->
      <div style="background: #FAF8F5; border: 1px solid #EAE3D2; padding: 18px 20px; border-radius: 10px; margin: 18px 0; font-size: 13px; line-height: 1.8;">
        <div><strong>Customer:</strong> ${customerName} (${customerEmail})</div>
        <div><strong>Phone:</strong> ${customerPhone}</div>
        <div><strong>Total Amount:</strong> <span style="font-size: 15px; font-weight: 700; color: #9C6B30;">${formattedTotal}</span></div>
        <div><strong>Payment:</strong> ${paymentMethod} (${order.paymentStatus || 'pending'})</div>
        <div><strong>Items Count:</strong> ${items.length} item(s)</div>
      </div>

      ${ctaText && ctaUrl ? `
        <div style="margin: 26px 0 10px 0; text-align: center;">
          <a href="${ctaUrl}" style="background: #1A1A1A; color: #FFF; padding: 14px 28px; text-decoration: none; border-radius: 50px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; display: inline-block;">
            ${ctaText}
          </a>
        </div>
      ` : ''}
    </div>

    ${bannerText ? `
      <div style="background-color: #FAF6EF; padding: 14px 20px; border-top: 1px solid #EAE3D2; text-align: center; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #888888;">
        ${bannerText}
      </div>
    ` : ''}

    <div style="padding: 18px 24px; text-align: center; border-top: 1px solid #EAE3D2; font-size: 11px; color: #888888;">
      ${footerText}
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Sends Admin Order Notification Email.
 */
export async function sendAdminOrderNotificationEmail({ toEmail, order, user, customSettings = null, db = null }) {
  if (!toEmail || !order) {
    return { sent: false, reason: 'MISSING_PARAMS' };
  }

  const template = await getEmailTemplate(db, 'admin_order_notification');
  if (template && template.isEnabled === false) {
    console.log(`[EMAIL SYSTEM] Admin order alert is disabled by admin setting. Skipping send to ${toEmail}.`);
    return { sent: false, skipped: true, reason: 'DISABLED_BY_ADMIN' };
  }

  const config = getSmtpConfig(customSettings);
  const customerName = (order.address?.fullName || user?.name || 'Customer').trim();
  const orderNumber = order.orderNumber || order.id;
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mikumantra.vercel.app';
  const adminOrderUrl = `${siteUrl}/admin/orders`;
  const totalAmount = order.amounts?.total || 0;
  const formattedTotal = `₹${totalAmount.toLocaleString('en-IN')}`;
  const paymentMethod = order.payment === 'cod' ? 'Cash on Delivery (COD)' : (order.payment || 'Online Payment');

  const vars = {
    customerName,
    customerEmail: order.customerEmail || order.guestEmail || user?.email || 'N/A',
    customerPhone: order.address?.phone || user?.phone || 'N/A',
    orderNumber,
    total: formattedTotal,
    itemsCount: Array.isArray(order.items) ? order.items.length : 1,
    paymentMethod,
    paymentStatus: order.paymentStatus || 'Pending',
    adminOrderUrl,
    storeName: 'MikuMantra Fine Jewellery',
    siteUrl
  };

  const subject = interpolate(template?.subject || '[NEW ORDER] Order #{orderNumber} received - {customerName} ({total})', vars);
  const html = renderAdminOrderNotificationHtml({ order, user, customerName, siteUrl, adminOrderUrl, template });
  const text = `New order received on MikuMantra!\n\nOrder #${orderNumber}\nCustomer: ${customerName}\nAmount: ${formattedTotal}\nPayment: ${paymentMethod}\n\nView orders in admin portal: ${adminOrderUrl}`;

  if (!config.isConfigured) {
    return { sent: true, mock: true, message: 'SMTP not configured; admin email logged.' };
  }

  if (config.resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: config.from,
          to: [toEmail],
          subject,
          html,
          text,
          reply_to: config.replyTo
        })
      });
      const data = await res.json();
      return { sent: true, messageId: data.id };
    } catch (err) {
      console.error(`[RESEND ERROR] Failed to send admin order alert to ${toEmail}:`, err.message);
      return { sent: false, error: err.message };
    }
  }

  try {
    const transporter = createTransporter(customSettings);
    const info = await transporter.sendMail({
      from: config.from,
      to: toEmail,
      replyTo: config.replyTo,
      subject,
      text,
      html
    });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[ADMIN EMAIL ERROR] Failed to send admin alert to ${toEmail}:`, err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Dispatches a live test email for any template to an admin or test email address.
 */
export async function sendTestEmailTemplate({ toEmail, templateId, customTemplate = null, customSettings = null, db = null }) {
  if (!toEmail) return { success: false, error: 'Recipient email address is required.' };

  const activeTemplate = customTemplate || await getEmailTemplate(db, templateId);
  if (!activeTemplate) return { success: false, error: `Template '${templateId}' not found.` };

  const config = getSmtpConfig(customSettings);
  if (!config.isConfigured) {
    return {
      success: false,
      error: 'SMTP credentials or RESEND_API_KEY are not configured in environment variables or settings.'
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mikumantra.com';

  // Sample order fixture for testing
  const sampleOrder = {
    id: 'test-preview-order',
    orderNumber: 'MM-TEST-8821',
    placedAt: new Date().toISOString(),
    status: 'Confirmed',
    payment: 'razorpay',
    paymentStatus: 'paid',
    coupon: 'WELCOME2000',
    amounts: {
      subtotal: 45000,
      discount: 2000,
      shipping: 0,
      tax: 1350,
      giftWrap: 400,
      total: 44750
    },
    address: {
      fullName: 'Priya Sharma',
      phone: '+91 98290 12345',
      line1: '402, Lotus Grandeur',
      line2: 'Tonk Road',
      city: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302015'
    },
    items: [
      {
        id: 'sample-necklace-1',
        name: 'Lotus Blossom Polki Diamond Necklace (22K Gold)',
        price: 32000,
        qty: 1,
        subtotal: 32000,
        image: '/images/products/necklace-1.jpg'
      },
      {
        id: 'sample-earring-1',
        name: 'Heritage Emerald & Pearl Chandbalis',
        price: 13000,
        qty: 1,
        subtotal: 13000,
        image: '/images/products/earring-1.jpg'
      }
    ],
    courier: {
      carrier: 'BlueDart Express',
      trackingNumber: 'BD-88219034',
      trackingUrl: 'https://track.bluedart.com'
    }
  };

  let html = '';
  let subject = '';

  if (templateId === 'order_confirmation') {
    html = renderOrderConfirmationHtml({
      order: sampleOrder,
      user: { name: 'Priya Sharma', email: toEmail },
      recipientName: 'Priya Sharma',
      siteUrl,
      orderDetailsUrl: `${siteUrl}/orders/test-preview-order`,
      template: activeTemplate
    });
    const vars = {
      customerName: 'Priya Sharma',
      orderNumber: 'MM-TEST-8821',
      storeName: 'MikuMantra Fine Jewellery'
    };
    subject = `[TEST PREVIEW] ${interpolate(activeTemplate.subject, vars)}`;
  } else if (templateId === 'order_shipped') {
    html = renderOrderShippedHtml({
      order: sampleOrder,
      user: { name: 'Priya Sharma', email: toEmail },
      recipientName: 'Priya Sharma',
      siteUrl,
      orderDetailsUrl: `${siteUrl}/orders/test-preview-order`,
      template: activeTemplate
    });
    const vars = {
      customerName: 'Priya Sharma',
      orderNumber: 'MM-TEST-8821',
      carrier: 'BlueDart Express',
      storeName: 'MikuMantra Fine Jewellery'
    };
    subject = `[TEST PREVIEW] ${interpolate(activeTemplate.subject, vars)}`;
  } else if (templateId === 'admin_order_notification') {
    html = renderAdminOrderNotificationHtml({
      order: sampleOrder,
      user: { name: 'Priya Sharma', email: toEmail },
      customerName: 'Priya Sharma',
      siteUrl,
      adminOrderUrl: `${siteUrl}/admin/orders`,
      template: activeTemplate
    });
    const vars = {
      customerName: 'Priya Sharma',
      orderNumber: 'MM-TEST-8821',
      total: '₹44,750',
      storeName: 'MikuMantra Fine Jewellery'
    };
    subject = `[TEST PREVIEW] ${interpolate(activeTemplate.subject, vars)}`;
  } else if (templateId === 'password_reset') {
    html = renderPasswordResetHtml({
      code: '849201',
      recipientName: 'Priya Sharma',
      portalName: 'Customer Account',
      toEmail,
      siteUrl,
      template: activeTemplate
    });
    const vars = {
      code: '849201',
      portalName: 'Customer Account',
      storeName: 'MikuMantra Fine Jewellery'
    };
    subject = `[TEST PREVIEW] ${interpolate(activeTemplate.subject, vars)}`;
  } else if (templateId === 'account_verification') {
    html = renderAccountVerificationHtml({
      code: '849201',
      customerName: 'Priya Sharma',
      toEmail,
      siteUrl,
      template: activeTemplate
    });
    const vars = {
      code: '849201',
      customerName: 'Priya Sharma',
      storeName: 'MikuMantra Fine Jewellery'
    };
    subject = `[TEST PREVIEW] ${interpolate(activeTemplate.subject, vars)}`;
  } else if (templateId === 'welcome_email') {
    html = renderCampaignHtml({
      campaign: {},
      template: {
        subject: activeTemplate.subject,
        previewText: activeTemplate.previewText,
        heading: activeTemplate.heading,
        body: activeTemplate.bodyText || activeTemplate.body,
        ctaText: activeTemplate.ctaText,
        ctaUrl: activeTemplate.ctaUrl,
        footerText: activeTemplate.footerText
      },
      subscriberEmail: toEmail,
      unsubscribeUrl: `${siteUrl}/unsubscribe?token=TEST_TOKEN`
    });
    subject = `[TEST PREVIEW] ${activeTemplate.subject}`;
  } else if (['order_processing', 'order_out_for_delivery', 'order_delivered', 'order_cancelled', 'order_refunded'].includes(templateId)) {
    const statusMap = {
      order_processing: 'processing',
      order_out_for_delivery: 'out_for_delivery',
      order_delivered: 'delivered',
      order_cancelled: 'cancelled',
      order_refunded: 'refunded'
    };
    const testStatus = statusMap[templateId] || 'processing';
    html = renderOrderStatusUpdateHtml({
      order: sampleOrder,
      user: { name: 'Priya Sharma', email: toEmail },
      recipientName: 'Priya Sharma',
      previousStatus: 'confirmed',
      newStatus: testStatus,
      courier: sampleOrder.courier,
      siteUrl,
      orderDetailsUrl: `${siteUrl}/orders/test-preview-order`,
      template: activeTemplate
    });
    const vars = {
      customerName: 'Priya Sharma',
      orderNumber: 'MM-TEST-8821',
      status: testStatus.charAt(0).toUpperCase() + testStatus.slice(1).replace(/_/g, ' '),
      storeName: 'MikuMantra Fine Jewellery',
      carrier: 'BlueDart Express',
      total: '₹44,750',
      cancellationReason: 'Customer request for expedited sizing',
      refundStatus: 'Refund Initiated'
    };
    subject = `[TEST PREVIEW] ${interpolate(activeTemplate.subject, vars)}`;
  } else {
    return { success: false, error: `Unsupported templateId '${templateId}' for test dispatch.` };
  }

  // Deliver test email
  return await sendCampaignBatchEmail({
    toEmail,
    subject,
    previewText: activeTemplate.previewText,
    html,
    fromName: config.fromName,
    fromEmail: config.fromAddress,
    replyTo: config.replyTo,
    customSettings
  });
}

/**
 * Dispatches the official Tax Invoice directly to customer email,
 * complete with the generated PDF attached.
 */
export async function sendOrderInvoiceEmail({
  toEmail,
  order,
  invoicePdfBuffer = null,
  customMessage = '',
  db = null,
  customSettings = null
}) {
  if (!toEmail || !order) {
    return { sent: false, reason: 'MISSING_PARAMS', error: 'Recipient email and order object are required.' };
  }

  const config = getSmtpConfig(customSettings);
  const recipientName = (order.address?.fullName || toEmail.split('@')[0] || 'Valued Collector').trim();
  const orderNumber = order.orderNumber || order.id;
  const invoiceNumber = order.invoiceNumber || `INV-${orderNumber}`;
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mikumantra.vercel.app';
  const orderDetailsUrl = `${siteUrl}/orders/${order.id}`;
  const invoiceDownloadUrl = `${siteUrl}/orders/${order.id}/invoice`;

  const totalFormatted = order.amounts?.total ? `₹${Number(order.amounts.total).toLocaleString('en-IN')}` : '';
  const dateFormatted = new Date(order.placedAt || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const subject = `Official Tax Invoice: #${invoiceNumber} for Order #${orderNumber} - MikuMantra Fine Jewellery`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F6F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1A1A1A;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8F6F0; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E8E5DD; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
          <!-- Gold Top Accent -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #9C6B30 0%, #D4AF37 50%, #9C6B30 100%);"></td>
          </tr>
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 32px 24px 20px; background-color: #121212;">
              <span style="font-size: 10px; letter-spacing: 0.35em; color: #D4AF37; text-transform: uppercase; font-weight: 600; display: block; margin-bottom: 6px;">Tax Invoice & Certificate of Purchase</span>
              <h1 style="color: #FFFFFF; font-size: 22px; font-weight: 300; margin: 0; letter-spacing: 0.05em; font-family: 'Playfair Display', Georgia, serif;">MikuMantra Fine Jewellery</h1>
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 28px;">
              <p style="font-size: 14px; line-height: 1.6; color: #333333; margin: 0 0 16px;">
                Dear <strong>${recipientName}</strong>,
              </p>
              <p style="font-size: 13.5px; line-height: 1.6; color: #555555; margin: 0 0 20px;">
                Please find enclosed the official Tax Invoice for your recent fine jewellery order <strong>#${orderNumber}</strong>. 
                Your digital invoice PDF has been attached to this email for your accounting, warranty, and insurance records.
              </p>
              ${customMessage ? `
              <div style="background-color: #FAF7F2; border-left: 3px solid #9C6B30; padding: 12px 16px; margin: 0 0 20px; font-size: 13px; color: #444444; font-style: italic;">
                "${customMessage}"
              </div>` : ''}

              <!-- Invoice Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FAF9F6; border: 1px solid #ECE7DE; border-radius: 8px; margin: 0 0 24px;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #ECE7DE;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <span style="font-size: 10px; text-transform: uppercase; color: #888888; letter-spacing: 0.1em; display: block;">Invoice Number</span>
                          <strong style="font-size: 14px; color: #9C6B30; font-family: monospace;">${invoiceNumber}</strong>
                        </td>
                        <td align="right">
                          <span style="font-size: 10px; text-transform: uppercase; color: #888888; letter-spacing: 0.1em; display: block;">Date</span>
                          <span style="font-size: 13px; color: #333333;">${dateFormatted}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size: 13px; color: #555555; padding-bottom: 6px;">Order ID:</td>
                        <td align="right" style="font-size: 13px; color: #1A1A1A; font-weight: 600; padding-bottom: 6px;">${orderNumber}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #555555; padding-bottom: 6px;">Payment Method:</td>
                        <td align="right" style="font-size: 13px; color: #1A1A1A; text-transform: uppercase; padding-bottom: 6px;">${order.payment || 'ONLINE'}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #555555; padding-bottom: 6px;">Payment Status:</td>
                        <td align="right" style="font-size: 12px; font-weight: bold; color: ${order.paymentStatus === 'paid' ? '#16a34a' : '#d97706'}; text-transform: uppercase; padding-bottom: 6px;">${order.paymentStatus || 'PENDING'}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; color: #1A1A1A; font-weight: bold; border-top: 1px dashed #DCD5C8; padding-top: 8px;">Total Amount:</td>
                        <td align="right" style="font-size: 16px; color: #9C6B30; font-weight: bold; border-top: 1px dashed #DCD5C8; padding-top: 8px;">${totalFormatted}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action CTAs -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 28px;">
                <tr>
                  <td align="center">
                    <a href="${invoiceDownloadUrl}" target="_blank" style="display: inline-block; background-color: #9C6B30; color: #FFFFFF; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.15em; text-decoration: none; padding: 13px 28px; border-radius: 6px; box-shadow: 0 2px 8px rgba(156,107,48,0.25);">
                      View Invoice Online ↗
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 11.5px; line-height: 1.5; color: #888888; margin: 0; text-align: center;">
                All jewellery pieces are BIS Hallmarked and certified. For bespoke queries or insurance appraisal documentation, reach our atelier concierge at support@mikumantra.com.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #FAF9F6; border-top: 1px solid #ECE7DE; padding: 16px 24px; text-align: center; font-size: 10.5px; color: #999999;">
              © ${new Date().getFullYear()} MikuMantra Atelier · Jaipur, Rajasthan, India · All Rights Reserved
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
TAX INVOICE - MikuMantra Fine Jewellery
=========================================
Invoice: ${invoiceNumber}
Order ID: ${orderNumber}
Date: ${dateFormatted}
Total: ${totalFormatted}

Dear ${recipientName},

Your official tax invoice PDF for order #${orderNumber} is attached to this email.
You may also view and download it anytime at:
${invoiceDownloadUrl}

Need assistance? Contact us at support@mikumantra.com
  `.trim();

  if (!config.isConfigured) {
    console.warn(`[EMAIL SYSTEM] SMTP not configured. Invoice email for Order #${orderNumber} to ${toEmail} logged.`);
    return { sent: true, mock: true, message: 'SMTP not configured; invoice email logged in system.' };
  }

  const effectiveFromName = config.fromName || 'MikuMantra Atelier';
  const effectiveFromAddress = config.fromAddress;
  const effectiveFrom = `"${effectiveFromName}" <${effectiveFromAddress}>`;
  const effectiveReplyTo = config.replyTo;

  const pdfFilename = `Invoice-${orderNumber}.pdf`;

  if (config.resendApiKey) {
    try {
      const attachments = [];
      if (invoicePdfBuffer) {
        attachments.push({
          filename: pdfFilename,
          content: Buffer.isBuffer(invoicePdfBuffer) ? invoicePdfBuffer.toString('base64') : invoicePdfBuffer
        });
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: effectiveFrom,
          to: [toEmail],
          subject,
          html,
          text,
          reply_to: effectiveReplyTo,
          attachments: attachments.length > 0 ? attachments : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Resend API Error ${res.status}`);
      return { sent: true, provider: 'resend', messageId: data.id };
    } catch (err) {
      console.error(`[RESEND INVOICE ERROR] Failed to send invoice to ${toEmail}:`, err.message);
      return { sent: false, error: err.message };
    }
  }

  try {
    const transporter = createTransporter(customSettings);
    const attachments = [];
    if (invoicePdfBuffer) {
      attachments.push({
        filename: pdfFilename,
        content: invoicePdfBuffer
      });
    }

    const info = await transporter.sendMail({
      from: effectiveFrom,
      to: toEmail,
      replyTo: effectiveReplyTo,
      subject,
      text,
      html,
      attachments
    });

    return { sent: true, provider: 'smtp', messageId: info.messageId };
  } catch (err) {
    console.error(`[SMTP INVOICE ERROR] Failed to send invoice email to ${toEmail}:`, err.message);
    return { sent: false, error: err.message };
  }
}

