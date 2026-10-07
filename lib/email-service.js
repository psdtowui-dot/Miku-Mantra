import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

/**
 * Retrieves SMTP configuration from environment variables.
 * Supports multiple common naming conventions (SMTP_*, GMAIL_*, EMAIL_*).
 */
export function getSmtpConfig() {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER || process.env.SMTP_EMAIL || '';
  const rawPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS || process.env.EMAIL_PASS || '';
  const host = process.env.SMTP_HOST || (user && user.includes('@gmail.com') ? 'smtp.gmail.com' : (process.env.EMAIL_HOST || 'smtp.gmail.com'));
  const pass = host.includes('gmail.com') ? rawPass.replace(/\s+/g, '') : rawPass;
  const port = parseInt(process.env.SMTP_PORT || (host === 'smtp.gmail.com' ? '465' : '587'), 10);
  const secure = process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE === 'true' : port === 465;
  const from = process.env.EMAIL_FROM || (user ? `"MikuMantra" <${user}>` : '"MikuMantra" <noreply@mikumantra.com>');

  return {
    isConfigured: Boolean(user && pass),
    host,
    port,
    secure,
    auth: { user, pass },
    from
  };
}

/**
 * Creates a Nodemailer transporter instance if credentials exist.
 */
export function createTransporter() {
  const config = getSmtpConfig();
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
        <!-- Card Container -->
        <table role="presentation" width="100%" max-width="560" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #EAE3D2;">
          
          <!-- Verification Header with Logo -->
          <tr>
            <td style="background-color: #FAF6EF; padding: 28px 24px 22px 24px; text-align: center; border-bottom: 2px solid #D4AF37;">
              <div style="text-align: center; margin-bottom: 12px;">
                <img src="cid:verification-logo" alt="MikuMantra" width="180" style="max-width: 180px; height: auto; display: inline-block; border: 0; font-family: Georgia, serif; font-size: 22px; font-weight: bold; color: #1A1A1A;" />
              </div>
              <h1 style="color: #1A1A1A; font-size: 19px; font-weight: 400; letter-spacing: 0.05em; margin: 0; font-family: Georgia, serif;">
                ${isAdmin ? 'Admin Security Verification' : 'Password Reset Verification'}
              </h1>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px;">
              <p style="font-size: 15px; line-height: 1.6; color: #333333; margin-top: 0; margin-bottom: 20px;">
                Hello <strong>${recipientName}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #555555; margin-bottom: 28px;">
                We received a request to reset your password for the <strong>${portalName}</strong> associated with <strong>${toEmail}</strong>. Use the verification code below to proceed:
              </p>

              <!-- 6-Digit OTP Code Highlight Box -->
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

              <div style="background-color: #FFFDF9; border-left: 3px solid #D4AF37; padding: 12px 16px; border-radius: 4px; margin-bottom: 28px;">
                <p style="font-size: 12px; line-height: 1.5; color: #7A6345; margin: 0;">
                  ⏱️ <strong>Note:</strong> This verification code is valid for <strong>15 minutes</strong>. For your security, never share this code with anyone.
                </p>
              </div>

              <p style="font-size: 13px; line-height: 1.6; color: #777777; margin-bottom: 0;">
                If you did not request a password reset, you can safely disregard this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAF6EF; padding: 20px 32px; text-align: center; border-top: 1px solid #EAE3D2;">
              <p style="font-size: 11px; color: #888888; margin: 0 0 6px 0;">
                © ${new Date().getFullYear()} MikuMantra. All rights reserved.
              </p>
              <p style="font-size: 10px; color: #AAAAAA; margin: 0;">
                This is an automated security transmission. Please do not reply directly to this email.
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

  const text = `
MikuMantra - Password Reset Verification

Hello ${recipientName},

We received a request to reset your password for your MikuMantra account (${toEmail}).

YOUR 6-DIGIT VERIFICATION CODE: ${code}

This code will expire in 15 minutes.
If you did not request this password reset, please ignore this email.

© ${new Date().getFullYear()} MikuMantra.
`.trim();

  if (!config.isConfigured) {
    console.log('\n=============================================================');
    console.log(`[EMAIL SYSTEM] Password Reset Code for: ${toEmail}`);
    console.log(`[EMAIL SYSTEM] CODE: ${code}`);
    console.log(`[EMAIL SYSTEM] Notice: SMTP_USER and SMTP_PASS are not yet set in .env.`);
    console.log(`[EMAIL SYSTEM] To deliver directly to Gmail inboxes, set in .env:`);
    console.log(`               SMTP_USER=your_gmail@gmail.com`);
    console.log(`               SMTP_PASS=your_16_char_google_app_password`);
    console.log('=============================================================\n');

    return {
      sent: false,
      reason: 'SMTP_NOT_CONFIGURED',
      code
    };
  }

  try {
    const transporter = createTransporter();
    const logoPath = path.join(process.cwd(), 'public', 'verification-logo.png');
    const attachments = [];
    if (fs.existsSync(logoPath)) {
      attachments.push({
        filename: 'verification-logo.png',
        path: logoPath,
        cid: 'verification-logo',
        contentDisposition: 'inline'
      });
    }

    const info = await transporter.sendMail({
      from: config.from,
      to: toEmail,
      subject: `${code} is your MikuMantra ${isAdmin ? 'Admin ' : ''}verification code`,
      text,
      html,
      attachments
    });

    console.log(`[EMAIL SENT] Password reset email delivered to ${toEmail}. MessageId: ${info.messageId}`);
    return {
      sent: true,
      messageId: info.messageId
    };
  } catch (err) {
    console.error(`[EMAIL ERROR] Failed to send email to ${toEmail}:`, err.message);
    return {
      sent: false,
      reason: 'SEND_FAILED',
      error: err.message,
      code // Return code as fallback so flow is never blocked
    };
  }
}

/**
 * Sends a luxury shipment dispatch notification email with courier partner and tracking link.
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

