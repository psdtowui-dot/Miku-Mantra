import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import {
  sendCampaignBatchEmail,
  sendTestCampaignEmail,
  renderCampaignHtml,
  getSmtpConfig
} from './email-service';

export const DEFAULT_NEWSLETTER_SETTINGS = {
  id: 'default',
  isEnabled: true,
  eyebrow: 'The MikuMantra Circle',
  title: 'Be the first to know',
  description: 'New collections, private previews, and ₹2,000 off your first order.',
  inputPlaceholder: 'Enter your email',
  buttonText: 'SUBSCRIBE',
  fromName: 'MikuMantra',
  fromEmail: 'kk1414497@gmail.com',
  replyTo: 'support@mikumantra.com',
  successMessage: 'You have successfully joined the MikuMantra Circle.',
  alreadySubscribedMessage: 'This email is already subscribed.',
  invalidEmailMessage: 'Please enter a valid email address.',
  errorMessage: 'An error occurred while subscribing. Please try again.',
  loadingMessage: 'SUBSCRIBING...',
  unsubscribeMessage: 'You have been successfully unsubscribed.',
  privileges: [
    '₹2,000 Off First Order',
    'Private Previews & Access',
    'Zero Spam • Unsubscribe Anytime'
  ],
  design: {
    backgroundColor: '#FAF6EF',
    textColor: '#1A1A1A',
    accentColor: '#9C6B30',
    buttonBackground: '#1A1A1A',
    buttonTextColor: '#FFFFFF'
  }
};

export const DEFAULT_WELCOME_TEMPLATE = {
  id: 'welcome_email',
  name: 'Welcome Email Template',
  subject: 'Welcome to the MikuMantra Atelier Circle',
  previewText: 'Enjoy ₹2,000 off your first handcrafted jewellery order.',
  heading: 'Welcome to MikuMantra',
  body: 'Thank you for joining our inner circle. You will receive private previews of our new high jewellery collections and exclusive invitations to bespoke unveilings.',
  ctaText: 'Explore the Collection',
  ctaUrl: '/shop',
  footerText: 'MikuMantra Fine Jewellery Atelier, Jaipur, India.'
};

/**
 * Retrieves dynamic newsletter CMS configuration from MongoDB.
 */
export async function getNewsletterSettings(db) {
  try {
    const doc = await db.collection('newsletter_settings').findOne({ id: 'default' });
    if (!doc) {
      await db.collection('newsletter_settings').insertOne({
        ...DEFAULT_NEWSLETTER_SETTINGS,
        updatedAt: new Date()
      });
      return { ...DEFAULT_NEWSLETTER_SETTINGS };
    }
    const { _id, ...cleanSettings } = doc;
    return {
      ...DEFAULT_NEWSLETTER_SETTINGS,
      ...cleanSettings,
      privileges: Array.isArray(cleanSettings.privileges) ? cleanSettings.privileges : DEFAULT_NEWSLETTER_SETTINGS.privileges,
      design: {
        ...DEFAULT_NEWSLETTER_SETTINGS.design,
        ...(cleanSettings.design || {})
      }
    };
  } catch (err) {
    console.error('Error fetching newsletter settings:', err);
    return { ...DEFAULT_NEWSLETTER_SETTINGS };
  }
}

/**
 * Updates dynamic newsletter settings in MongoDB.
 */
export async function updateNewsletterSettings(db, newSettings) {
  if (newSettings && newSettings.fromEmail !== undefined) {
    const val = validateEmail(newSettings.fromEmail);
    if (!val.valid) {
      throw new Error(val.message === 'Email address is required.' ? 'Sender email address is required.' : 'Please enter a valid sender email address (e.g. sender@example.com).');
    }
  }

  if (newSettings && newSettings.replyTo !== undefined && newSettings.replyTo !== null && String(newSettings.replyTo).trim() !== '') {
    const val = validateEmail(newSettings.replyTo);
    if (!val.valid) {
      throw new Error('Please enter a valid reply-to email address (e.g. support@example.com).');
    }
  }

  const current = await getNewsletterSettings(db);
  const updatedDoc = {
    ...current,
    ...newSettings,
    privileges: Array.isArray(newSettings.privileges) ? newSettings.privileges : (current.privileges || []),
    design: {
      ...current.design,
      ...(newSettings.design || {})
    },
    updatedAt: new Date()
  };

  await db.collection('newsletter_settings').updateOne(
    { id: 'default' },
    { $set: updatedDoc },
    { upsert: true }
  );

  return updatedDoc;
}

/**
 * Retrieves the Welcome Email Template from MongoDB.
 */
export async function getWelcomeTemplate(db) {
  try {
    const doc = await db.collection('newsletter_templates').findOne({ id: 'welcome_email' });
    if (!doc) {
      await db.collection('newsletter_templates').insertOne({
        ...DEFAULT_WELCOME_TEMPLATE,
        updatedAt: new Date()
      });
      return { ...DEFAULT_WELCOME_TEMPLATE };
    }
    const { _id, ...clean } = doc;
    return { ...DEFAULT_WELCOME_TEMPLATE, ...clean };
  } catch (err) {
    return { ...DEFAULT_WELCOME_TEMPLATE };
  }
}

/**
 * Updates the Welcome Email Template in MongoDB.
 */
export async function updateWelcomeTemplate(db, templateData) {
  const current = await getWelcomeTemplate(db);
  const updatedDoc = {
    ...current,
    ...templateData,
    updatedAt: new Date()
  };

  await db.collection('newsletter_templates').updateOne(
    { id: 'welcome_email' },
    { $set: updatedDoc },
    { upsert: true }
  );

  return updatedDoc;
}

/**
 * Validates and normalizes an email address.
 */
export function validateEmail(rawEmail) {
  if (!rawEmail || typeof rawEmail !== 'string' || !rawEmail.trim()) {
    return { valid: false, message: 'Email address is required.' };
  }

  const email = rawEmail.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z0-9-]{2,}$/;
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Please enter a valid email address.' };
  }

  return { valid: true, email };
}

/**
 * Subscribes a customer to MongoDB using dynamic settings responses.
 */
export async function subscribeCustomer(db, { email: rawEmail, source = 'website-newsletter' }) {
  const settings = await getNewsletterSettings(db);
  const { valid, email, message } = validateEmail(rawEmail);
  if (!valid) {
    return {
      success: false,
      statusCode: 400,
      message: settings.invalidEmailMessage || message
    };
  }

  const existing = await db.collection('newsletter_subscribers').findOne({ email });
  const now = new Date();

  if (existing) {
    if (existing.status === 'subscribed') {
      return {
        success: false,
        statusCode: 200,
        message: settings.alreadySubscribedMessage || 'This email is already subscribed.'
      };
    }

    // Re-subscribe unsubscribed customer
    await db.collection('newsletter_subscribers').updateOne(
      { _id: existing._id },
      {
        $set: {
          status: 'subscribed',
          verificationStatus: 'verified',
          marketingConsent: true,
          updatedAt: now,
          subscribedAt: now,
          source: source || existing.source || 'website-newsletter'
        }
      }
    );

    return {
      success: true,
      statusCode: 200,
      message: settings.successMessage || 'You have successfully joined the MikuMantra Circle.'
    };
  }

  // New subscriber record
  const unsubscribeToken = crypto.randomBytes(24).toString('hex');
  const newSubscriber = {
    id: uuidv4(),
    email,
    status: 'subscribed',
    verificationStatus: 'verified',
    subscribedAt: now,
    updatedAt: now,
    source,
    unsubscribeToken,
    marketingConsent: true
  };

  await db.collection('newsletter_subscribers').insertOne(newSubscriber);

  return {
    success: true,
    statusCode: 200,
    message: settings.successMessage || 'You have successfully joined the MikuMantra Circle.'
  };
}

/**
 * Process token or email for explicit user unsubscription.
 */
export async function processUnsubscribeToken(db, { token = '', email: rawEmail = '' } = {}) {
  let query = {};
  if (token && token.trim()) {
    query.unsubscribeToken = token.trim();
  } else if (rawEmail && rawEmail.trim()) {
    query.email = rawEmail.trim().toLowerCase();
  } else {
    return { success: false, message: 'Unsubscribe token or email is required.' };
  }

  const subscriber = await db.collection('newsletter_subscribers').findOne(query);
  if (!subscriber) {
    return { success: false, message: 'Subscriber record not found or link has expired.' };
  }

  const now = new Date();
  await db.collection('newsletter_subscribers').updateOne(
    { _id: subscriber._id },
    {
      $set: {
        status: 'unsubscribed',
        marketingConsent: false,
        unsubscribedAt: now,
        updatedAt: now
      }
    }
  );

  return {
    success: true,
    email: subscriber.email,
    message: 'You have been successfully unsubscribed from the MikuMantra Circle.'
  };
}

/**
 * Retrieves paginated subscribers with detailed stats & growth rates.
 */
export async function getSubscribers(db, { page = 1, limit = 20, search = '', status = 'ALL' } = {}) {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, Math.min(500, parseInt(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (status && status !== 'ALL') {
    filter.status = status;
  }
  if (search && search.trim()) {
    filter.email = { $regex: search.trim().toLowerCase(), $options: 'i' };
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [totalFiltered, subscribers, totalAll, totalSubscribed, totalUnsubscribed, newThisMonth] = await Promise.all([
    db.collection('newsletter_subscribers').countDocuments(filter),
    db.collection('newsletter_subscribers')
      .find(filter)
      .sort({ subscribedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .toArray(),
    db.collection('newsletter_subscribers').countDocuments({}),
    db.collection('newsletter_subscribers').countDocuments({ status: 'subscribed' }),
    db.collection('newsletter_subscribers').countDocuments({ status: 'unsubscribed' }),
    db.collection('newsletter_subscribers').countDocuments({ subscribedAt: { $gte: startOfMonth } })
  ]);

  const totalPages = Math.ceil(totalFiltered / limitNum) || 1;
  const growthPercent = totalAll > 0 ? Math.round((newThisMonth / Math.max(1, totalAll - newThisMonth)) * 100) : 0;
  const activeRate = totalAll > 0 ? Math.round((totalSubscribed / totalAll) * 100) : 0;

  const cleanSubscribers = subscribers.map(s => {
    const { _id, ...safe } = s;
    return safe;
  });

  return {
    success: true,
    data: cleanSubscribers,
    subscribers: cleanSubscribers,
    stats: {
      total: totalAll,
      subscribed: totalSubscribed,
      unsubscribed: totalUnsubscribed,
      newThisMonth,
      growthPercent,
      activeRate
    },
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: totalFiltered,
      totalPages
    }
  };
}

/**
 * Updates subscriber status in MongoDB.
 */
export async function updateSubscriberStatus(db, id, newStatus) {
  if (!['subscribed', 'unsubscribed'].includes(newStatus)) {
    return { success: false, statusCode: 400, message: 'Status must be either "subscribed" or "unsubscribed".' };
  }

  const target = await db.collection('newsletter_subscribers').findOne({
    $or: [{ id }, { email: (id || '').toLowerCase() }]
  });

  if (!target) {
    return { success: false, statusCode: 404, message: 'Subscriber not found.' };
  }

  const now = new Date();
  await db.collection('newsletter_subscribers').updateOne(
    { _id: target._id },
    { $set: { status: newStatus, marketingConsent: newStatus === 'subscribed', updatedAt: now } }
  );

  const updated = await db.collection('newsletter_subscribers').findOne({ _id: target._id });
  const { _id, ...safe } = updated;

  return {
    success: true,
    statusCode: 200,
    message: 'Subscriber status updated successfully.',
    subscriber: safe
  };
}

/**
 * Bulk action on subscribers.
 */
export async function handleBulkSubscriberAction(db, { ids = [], action = '' }) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { success: false, statusCode: 400, message: 'No subscriber IDs selected.' };
  }

  const now = new Date();

  if (action === 'bulk-unsubscribe') {
    await db.collection('newsletter_subscribers').updateMany(
      { $or: [{ id: { $in: ids } }, { email: { $in: ids } }] },
      { $set: { status: 'unsubscribed', marketingConsent: false, updatedAt: now } }
    );
    return { success: true, message: `Successfully unsubscribed ${ids.length} subscriber(s).` };
  }

  if (action === 'bulk-delete') {
    await db.collection('newsletter_subscribers').deleteMany(
      { $or: [{ id: { $in: ids } }, { email: { $in: ids } }] }
    );
    return { success: true, message: `Successfully deleted ${ids.length} subscriber(s).` };
  }

  return { success: false, statusCode: 400, message: 'Invalid bulk action specified.' };
}

/**
 * Permanently deletes a subscriber record from MongoDB.
 */
export async function deleteSubscriber(db, id) {
  const target = await db.collection('newsletter_subscribers').findOne({
    $or: [{ id }, { email: (id || '').toLowerCase() }]
  });

  if (!target) {
    return { success: false, statusCode: 404, message: 'Subscriber not found.' };
  }

  await db.collection('newsletter_subscribers').deleteOne({ _id: target._id });

  return {
    success: true,
    statusCode: 200,
    message: 'Subscriber deleted successfully.'
  };
}

/**
 * Formats subscriber dataset into CSV string for admin export.
 */
export async function exportSubscribersCSV(db, { search = '', status = 'ALL', ids = [] } = {}) {
  const filter = {};
  if (Array.isArray(ids) && ids.length > 0) {
    filter.$or = [{ id: { $in: ids } }, { email: { $in: ids } }];
  } else {
    if (status && status !== 'ALL') {
      filter.status = status;
    }
    if (search && search.trim()) {
      filter.email = { $regex: search.trim().toLowerCase(), $options: 'i' };
    }
  }

  const subscribers = await db.collection('newsletter_subscribers')
    .find(filter)
    .sort({ subscribedAt: -1 })
    .toArray();

  const headers = ['Email', 'Status', 'Source', 'Subscribed At', 'Updated At'];
  const rows = subscribers.map(s => {
    const subAt = s.subscribedAt ? new Date(s.subscribedAt).toISOString() : '';
    const upAt = s.updatedAt ? new Date(s.updatedAt).toISOString() : '';
    return [
      `"${(s.email || '').replace(/"/g, '""')}"`,
      `"${(s.status || '').replace(/"/g, '""')}"`,
      `"${(s.source || '').replace(/"/g, '""')}"`,
      `"${subAt}"`,
      `"${upAt}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Campaign Management
 */
export async function getCampaigns(db) {
  // Execute any due scheduled campaigns synchronously before returning
  await processScheduledCampaigns(db);

  const list = await db.collection('newsletter_campaigns')
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  return list.map(c => {
    const { _id, ...safe } = c;
    return safe;
  });
}

export async function getCampaignById(db, id) {
  const campaign = await db.collection('newsletter_campaigns').findOne({ id });
  if (!campaign) return null;
  const { _id, ...safe } = campaign;
  return safe;
}

export async function createCampaign(db, campaignData) {
  const isScheduled = Boolean(campaignData.scheduleDate || campaignData.scheduledAt);
  const initialStatus = isScheduled ? 'SCHEDULED' : (campaignData.status ? campaignData.status.toUpperCase() : 'DRAFT');

  const newCampaign = {
    id: uuidv4(),
    name: (campaignData.name || 'Untitled Campaign').trim(),
    subject: (campaignData.subject || '').trim(),
    previewText: (campaignData.previewText || '').trim(),
    fromName: (campaignData.fromName || 'MikuMantra Atelier').trim(),
    fromEmail: (campaignData.fromEmail || 'hello@mikumantra.com').trim(),
    replyTo: (campaignData.replyTo || 'support@mikumantra.com').trim(),
    audience: campaignData.audience || 'all',
    templateId: campaignData.templateId || 'welcome_email',
    status: initialStatus, // DRAFT, SCHEDULED, QUEUED, SENDING, SENT, PARTIALLY_SENT, FAILED, CANCELLED
    scheduleDate: campaignData.scheduleDate || campaignData.scheduledAt || null,
    scheduledAt: campaignData.scheduleDate ? new Date(campaignData.scheduleDate) : (campaignData.scheduledAt ? new Date(campaignData.scheduledAt) : null),
    totalRecipients: 0,
    sentCount: 0,
    failedCount: 0,
    deliveredCount: 0,
    openedCount: 0,
    clickedCount: 0,
    bouncedCount: 0,
    unsubscribedCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await db.collection('newsletter_campaigns').insertOne(newCampaign);
  const { _id, ...clean } = newCampaign;
  return clean;
}

export async function updateCampaign(db, id, updateData) {
  const target = await db.collection('newsletter_campaigns').findOne({ id });
  if (!target) return null;

  if (target.status === 'SENDING' || target.status === 'SENT') {
    throw new Error(`Campaign with status "${target.status}" cannot be edited.`);
  }

  const updatedDoc = {
    ...target,
    ...updateData,
    status: updateData.status ? updateData.status.toUpperCase() : target.status,
    scheduledAt: updateData.scheduleDate ? new Date(updateData.scheduleDate) : target.scheduledAt,
    updatedAt: new Date()
  };

  await db.collection('newsletter_campaigns').updateOne(
    { id },
    { $set: updatedDoc }
  );

  const { _id, ...clean } = updatedDoc;
  return clean;
}

export async function cancelCampaign(db, id) {
  const target = await db.collection('newsletter_campaigns').findOne({ id });
  if (!target) return { success: false, message: 'Campaign not found.' };

  if (target.status !== 'SCHEDULED' && target.status !== 'DRAFT') {
    return { success: false, message: `Only scheduled or draft campaigns can be cancelled. Current status is ${target.status}.` };
  }

  await db.collection('newsletter_campaigns').updateOne(
    { id },
    { $set: { status: 'CANCELLED', updatedAt: new Date() } }
  );

  return { success: true, message: 'Scheduled campaign has been cancelled.' };
}

export async function deleteCampaign(db, id) {
  await db.collection('newsletter_campaign_logs').deleteMany({ campaignId: id });
  const res = await db.collection('newsletter_campaigns').deleteOne({ id });
  return res.deletedCount > 0;
}

/**
 * Triggers REAL email delivery flow for a campaign.
 * Backend enforces eligible subscriber selection and unsubscribed exclusion.
 */
export async function executeCampaignSend(db, campaignId, adminUser = {}) {
  const campaign = await db.collection('newsletter_campaigns').findOne({ id: campaignId });
  if (!campaign) {
    return { success: false, statusCode: 404, message: 'Campaign not found.' };
  }

  if (campaign.status === 'SENDING' || campaign.status === 'SENT') {
    return { success: false, statusCode: 400, message: `Campaign has already been ${campaign.status.toLowerCase()}.` };
  }

  const settings = await getNewsletterSettings(db);
  const config = getSmtpConfig(settings);
  if (!config.isConfigured) {
    await db.collection('newsletter_campaigns').updateOne(
      { id: campaignId },
      { $set: { status: 'FAILED', failureReason: 'Email provider is not configured. Configure SMTP_USER & SMTP_PASS or RESEND_API_KEY.', updatedAt: new Date() } }
    );
    return {
      success: false,
      statusCode: 400,
      message: 'Email provider is not configured. Set SMTP_USER and SMTP_PASS or RESEND_API_KEY in environment variables or settings.'
    };
  }

  // Set Status to QUEUED -> SENDING
  const now = new Date();
  await db.collection('newsletter_campaigns').updateOne(
    { id: campaignId },
    { $set: { status: 'SENDING', startedAt: now, updatedAt: now } }
  );

  // Fetch template data
  const template = await getWelcomeTemplate(db);

  // Query eligible active subscribers ONLY. Exclude status === 'unsubscribed' or marketingConsent === false
  const subscriberQuery = {
    status: 'subscribed',
    marketingConsent: { $ne: false }
  };

  if (campaign.audience === 'new') {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    subscriberQuery.subscribedAt = { $gte: startOfMonth };
  }

  const eligibleSubscribers = await db.collection('newsletter_subscribers').find(subscriberQuery).toArray();

  if (eligibleSubscribers.length === 0) {
    await db.collection('newsletter_campaigns').updateOne(
      { id: campaignId },
      {
        $set: {
          status: 'FAILED',
          failureReason: 'No eligible active subscribers found for the target audience.',
          totalRecipients: 0,
          updatedAt: new Date()
        }
      }
    );
    return {
      success: false,
      statusCode: 400,
      message: 'No eligible active subscribers found in target audience.'
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mikumantra.com';
  let sentCount = 0;
  let failedCount = 0;
  const logsToInsert = [];

  for (const subscriber of eligibleSubscribers) {
    // Generate token if missing
    let token = subscriber.unsubscribeToken;
    if (!token) {
      token = crypto.randomBytes(24).toString('hex');
      await db.collection('newsletter_subscribers').updateOne(
        { _id: subscriber._id },
        { $set: { unsubscribeToken: token } }
      );
    }

    const unsubscribeUrl = `${siteUrl}/unsubscribe?token=${token}`;
    const html = renderCampaignHtml({
      campaign,
      template,
      subscriberEmail: subscriber.email,
      unsubscribeUrl
    });

    const sendResult = await sendCampaignBatchEmail({
      toEmail: subscriber.email,
      subject: campaign.subject,
      previewText: campaign.previewText,
      html,
      fromName: campaign.fromName || settings.fromName || config.fromName,
      fromEmail: campaign.fromEmail || settings.fromEmail || config.fromAddress,
      replyTo: campaign.replyTo || settings.replyTo || config.replyTo,
      customSettings: settings
    });

    const logEntry = {
      id: uuidv4(),
      campaignId,
      subscriberId: subscriber.id || String(subscriber._id),
      email: subscriber.email,
      status: sendResult.success ? 'SENT' : 'FAILED',
      providerMessageId: sendResult.messageId || null,
      error: sendResult.error || null,
      sentAt: new Date(),
      createdAt: new Date()
    };

    logsToInsert.push(logEntry);

    if (sendResult.success) {
      sentCount++;
    } else {
      failedCount++;
    }
  }

  if (logsToInsert.length > 0) {
    await db.collection('newsletter_campaign_logs').insertMany(logsToInsert);
  }

  const finalStatus = (sentCount > 0 && failedCount === 0) ? 'SENT' : (sentCount > 0 ? 'PARTIALLY_SENT' : 'FAILED');

  const finalUpdate = {
    status: finalStatus,
    totalRecipients: eligibleSubscribers.length,
    sentCount,
    failedCount,
    deliveredCount: sentCount,
    sentAt: new Date(),
    updatedAt: new Date()
  };

  await db.collection('newsletter_campaigns').updateOne(
    { id: campaignId },
    { $set: finalUpdate }
  );

  return {
    success: true,
    message: `Campaign execution completed. ${sentCount} sent, ${failedCount} failed out of ${eligibleSubscribers.length} recipient(s).`,
    stats: {
      total: eligibleSubscribers.length,
      sent: sentCount,
      failed: failedCount,
      status: finalStatus
    }
  };
}

/**
 * Scans for due scheduled campaigns and processes them.
 */
export async function processScheduledCampaigns(db) {
  try {
    const dueCampaigns = await db.collection('newsletter_campaigns').find({
      status: 'SCHEDULED',
      scheduledAt: { $lte: new Date() }
    }).toArray();

    for (const campaign of dueCampaigns) {
      console.log(`[SCHEDULED CRON] Triggering automated delivery for scheduled campaign "${campaign.name}" (ID: ${campaign.id})...`);
      await executeCampaignSend(db, campaign.id, { id: 'scheduled_cron', name: 'Scheduled Campaign Runner' });
    }
  } catch (err) {
    console.error('Error processing scheduled campaigns:', err);
  }
}

/**
 * Fetches campaign recipient logs.
 */
export async function getCampaignLogs(db, campaignId) {
  const logs = await db.collection('newsletter_campaign_logs')
    .find({ campaignId })
    .sort({ sentAt: -1 })
    .toArray();

  return logs.map(l => {
    const { _id, ...safe } = l;
    return safe;
  });
}

/**
 * Analytics
 */
export async function getAnalytics(db) {
  const [totalSubscribers, activeSubscribers, unsubscribedCount] = await Promise.all([
    db.collection('newsletter_subscribers').countDocuments({}),
    db.collection('newsletter_subscribers').countDocuments({ status: 'subscribed' }),
    db.collection('newsletter_subscribers').countDocuments({ status: 'unsubscribed' })
  ]);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const newThisMonth = await db.collection('newsletter_subscribers').countDocuments({
    subscribedAt: { $gte: startOfMonth }
  });

  const campaignsCount = await db.collection('newsletter_campaigns').countDocuments({});
  const activeRate = totalSubscribers > 0 ? Math.round((activeSubscribers / totalSubscribers) * 100) : 0;
  const growthPercent = totalSubscribers > 0 ? Math.round((newThisMonth / Math.max(1, totalSubscribers - newThisMonth)) * 100) : 0;

  return {
    totalSubscribers,
    activeSubscribers,
    unsubscribedCount,
    newThisMonth,
    activeRate,
    growthPercent,
    campaignsCount,
    hasCampaignStats: campaignsCount > 0
  };
}
