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
              if (!process.env[k]) {
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
 * Retrieves SMTP/Email provider configuration from environment variables.
 * Supports multiple common naming conventions (SMTP_*, GMAIL_*, EMAIL_*, RESEND_*).
 */
export function getSmtpConfig(customSettings = null) {
  loadDiskEnv();
  const envUser = (process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER || process.env.SMTP_EMAIL || '').trim();
  const envPass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS || process.env.EMAIL_PASS || '').trim();

  // Explicit SMTP auth credentials vs Display From email header
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

    // Verify SMTP connection
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

  const bodyParagraphs = bodyText
    .split('\n\n')
    .filter(Boolean)
    .map(p => `<p style="font-size: 15px; line-height: 1.7; color: #333333; margin-top: 0; margin-bottom: 20px;">${p.replace(/\n/g, '<br />')}</p>`)
    .join('');

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

  // Handle Resend API if key is set
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

  // Handle SMTP via Nodemailer
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

    console.log(`[CAMPAIGN EMAIL SENT] Delivered to ${toEmail}. MessageId: ${info.messageId}`);
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
 * Sends a password reset email with a 6-digit verification code.
 */
export async function sendPasswordResetEmail({ toEmail, code, name, isAdmin = false }) {
  const config = getSmtpConfig();
  const recipientName = (name || toEmail.split('@')[0] || 'Valued Member').trim();
  const portalName = isAdmin ? 'Administrator Portal' : 'Customer Account';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Code - MikuMantra</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FAF6EF; color: #1A1A1A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF6EF; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="560" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #EAE3D2;">
          <tr>
            <td style="background-color: #FAF6EF; padding: 28px 24px 22px 24px; text-align: center; border-bottom: 2px solid #D4AF37;">
              <h1 style="color: #1A1A1A; font-size: 19px; font-weight: 400; letter-spacing: 0.05em; margin: 0; font-family: Georgia, serif;">
                ${isAdmin ? 'Admin Security Verification' : 'Password Reset Verification'}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 32px;">
              <p style="font-size: 15px; line-height: 1.6; color: #333333; margin-top: 0; margin-bottom: 20px;">
                Hello <strong>${recipientName}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #555555; margin-bottom: 28px;">
                We received a request to reset your password for the <strong>${portalName}</strong> associated with <strong>${toEmail}</strong>. Use the verification code below to proceed:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <div style="display: inline-block; background-color: #FAF6EF; border: 2px dashed #D4AF37; border-radius: 12px; padding: 18px 36px;">
                  <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #9C6B30; margin-bottom: 6px; font-weight: 600;">
                    Your Verification Code
                  </div>
                  <div style="font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #1A1A1A; font-family: 'Courier New', Courier, monospace;">
                    ${code}
                  </div>
                </div>
              </div>
              <p style="font-size: 13px; line-height: 1.6; color: #777777; margin-bottom: 0;">
                If you did not request a password reset, you can safely disregard this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #FAF6EF; padding: 20px 32px; text-align: center; border-top: 1px solid #EAE3D2;">
              <p style="font-size: 11px; color: #888888; margin: 0;">
                © ${new Date().getFullYear()} MikuMantra. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  if (!config.isConfigured) {
    console.log(`[EMAIL SYSTEM] Password Reset Code for: ${toEmail} - CODE: ${code}`);
    return { sent: false, reason: 'SMTP_NOT_CONFIGURED', code };
  }

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: config.from,
      to: toEmail,
      subject: `${code} is your MikuMantra ${isAdmin ? 'Admin ' : ''}verification code`,
      html
    });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EMAIL ERROR] Failed to send email to ${toEmail}:`, err.message);
    return { sent: false, reason: 'SEND_FAILED', error: err.message, code };
  }
}

/**
 * Sends a luxury shipment dispatch notification email.
 */
export async function sendOrderShippedEmail({ toEmail, order, user }) {
  if (!toEmail || !order) return { sent: false, reason: 'MISSING_PARAMS' };

  const config = getSmtpConfig();
  const recipientName = (order.address?.fullName || user?.name || toEmail.split('@')[0] || 'Valued Collector').trim();
  const carrier = order.courier?.carrier || order.carrier || 'our verified courier partner';
  const trackingNumber = order.courier?.trackingNumber || order.trackingNumber || '';
  const trackingUrl = order.courier?.trackingUrl || order.trackingUrl || '';
  const orderNumber = order.orderNumber;
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mikumantra.vercel.app';
  const orderDetailsUrl = `${siteUrl}/orders/${order.id}`;
  const trackOrderUrl = `${siteUrl}/track-order?orderNumber=${encodeURIComponent(orderNumber)}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your MikuMantra Jewellery Order has Shipped</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FAF6EF; color: #1A1A1A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF6EF; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="580" cellspacing="0" cellpadding="0" border="0" style="max-width: 580px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 6px 30px rgba(0,0,0,0.06); border: 1px solid #EAE3D2;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #0F0F10; padding: 32px 24px; text-align: center; border-bottom: 3px solid #D4AF37;">
              <div style="font-family: Georgia, serif; font-size: 24px; font-weight: bold; letter-spacing: 0.15em; color: #D4AF37; text-transform: uppercase;">
                MikuMantra
              </div>
              <div style="font-size: 9px; letter-spacing: 0.35em; color: #CCCCCC; text-transform: uppercase; margin-top: 4px;">
                House of Fine Jewellery · Atelier Dispatch
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 36px 32px;">
              <p style="font-size: 16px; line-height: 1.6; color: #1A1A1A; margin-top: 0; margin-bottom: 16px;">
                Dear <strong>${recipientName}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #4A4A4A; margin-bottom: 24px;">
                Your bespoke handcrafted jewellery from order <strong>#${orderNumber}</strong> has been carefully inspected, sealed in our tamper-evident velvet packaging, and is now in transit.
              </p>

              <!-- Courier Tracking Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF8F5; border: 1.5px solid #D4AF37; border-radius: 12px; margin: 24px 0; overflow: hidden;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #9C6B30; font-weight: 700; margin-bottom: 6px;">
                      🚚 In Transit via ${carrier}
                    </div>
                    ${trackingNumber ? `
                      <div style="font-size: 11px; color: #666666; margin-bottom: 4px;">Tracking Number / AWB:</div>
                      <div style="font-size: 20px; font-weight: 700; font-family: 'Courier New', Courier, monospace; letter-spacing: 2px; color: #1A1A1A; margin-bottom: 18px;">
                        ${trackingNumber}
                      </div>
                    ` : `
                      <div style="font-size: 14px; color: #666666; margin-bottom: 18px; font-style: italic;">
                        Manifest registered with logistics partner.
                      </div>
                    `}

                    <div style="margin-top: 8px;">
                      ${trackingUrl ? `
                        <a href="${trackingUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #9C6B30; color: #FFFFFF; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; text-decoration: none; padding: 14px 28px; border-radius: 8px; box-shadow: 0 4px 14px rgba(156,107,48,0.25); margin: 4px;">
                          Track on ${carrier} ↗
                        </a>
                      ` : ''}
                      <a href="${trackOrderUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #1A1A1A; color: #FFFFFF; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; text-decoration: none; padding: 14px 24px; border-radius: 8px; margin: 4px;">
                        Track Order Online ↗
                      </a>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Assurance Banner -->
              <div style="background-color: #F5F1E8; border-left: 4px solid #9C6B30; padding: 14px 18px; border-radius: 4px; font-size: 12px; color: #5C4321; line-height: 1.5; margin-bottom: 24px;">
                🔒 <strong>Atelier Assurance:</strong> Your fine jewellery is fully transit-insured and sealed in tamper-evident security packaging. Please inspect the seal before accepting the delivery.
              </div>

              <p style="font-size: 13px; color: #666666; line-height: 1.6; margin-bottom: 24px;">
                You may also view live order progress and download your shipping slip anytime in your <a href="${orderDetailsUrl}" style="color: #9C6B30; text-decoration: underline;">MikuMantra Account</a>.
              </p>

              <p style="font-size: 14px; color: #1A1A1A; margin: 0;">
                Warm regards,<br />
                <strong>The MikuMantra Concierge</strong><br />
                <span style="font-size: 12px; color: #888888;">Jaipur Atelier, India</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAF6EF; padding: 20px; text-align: center; border-top: 1px solid #EAE3D2; font-size: 11px; color: #888888;">
              © ${new Date().getFullYear()} MikuMantra Fine Jewellery. All rights reserved.
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
MikuMantra Order Shipped

Dear ${recipientName},

Your jewellery order #${orderNumber} has been shipped via ${carrier}.

${trackingNumber ? `AWB / Tracking Number: ${trackingNumber}\n` : ''}
${trackingUrl ? `Track your shipment: ${trackingUrl}\n` : ''}
Track on MikuMantra: ${trackOrderUrl}

Your jewellery is fully transit-insured and sealed in tamper-evident packaging.

View order details: ${orderDetailsUrl}

Warm regards,
The MikuMantra Concierge
  `.trim();

  if (!config.isConfigured) {
    console.log(`[EMAIL SYSTEM] Order #${orderNumber} Shipped Notification logged for ${toEmail} (Carrier: ${carrier}, AWB: ${trackingNumber || 'N/A'})`);
    return { sent: true, mock: true, message: 'SMTP not configured; shipment email logged.' };
  }

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: config.from,
      to: toEmail,
      subject: `Order #${orderNumber} Shipped via ${carrier} - MikuMantra`,
      text,
      html
    });
    console.log(`[EMAIL SENT] Order #${orderNumber} shipped notification sent to ${toEmail}. MessageId: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EMAIL ERROR] Failed to send order shipped email to ${toEmail}:`, err.message);
    return { sent: false, error: err.message };
  }
}

