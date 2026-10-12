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
    tls: {
      rejectUnauthorized: false
    }
  });
}

/**
 * Renders a production-ready, email-client-compatible HTML body for Newsletter Campaigns.
 */
export function renderCampaignHtml({ campaign = {}, template = {}, subscriberEmail = '', unsubscribeUrl = '#' }) {
  const subject = campaign.subject || template.subject || 'MikuMantra Circle Exclusive';
  const previewText = campaign.previewText || template.previewText || '';
  const heading = template.heading || campaign.name || 'Private Preview';
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
