/**
 * Email Service Business Logic
 * Sends registration notification emails using AWS SES
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { EmailNotificationPayload } from '../../../shared/types/registration.types';

const sesClient = new SESClient({});

const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'noreply@terrapinev ents.umd.edu';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://terrapine vents.umd.edu';

/**
 * Send registration confirmation email
 * @param payload - Email notification payload
 */
export async function sendRegistrationEmail(payload: EmailNotificationPayload): Promise<void> {
  const emailContent = generateEmailContent(payload);

  try {
    await sesClient.send(
      new SendEmailCommand({
        Source: FROM_EMAIL,
        Destination: {
          ToAddresses: [payload.recipientEmail],
        },
        Message: {
          Subject: {
            Data: emailContent.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: emailContent.htmlBody,
              Charset: 'UTF-8',
            },
            Text: {
              Data: emailContent.textBody,
              Charset: 'UTF-8',
            },
          },
        },
      })
    );

    console.log(`Email sent successfully to ${payload.recipientEmail} (type: ${payload.type})`);
  } catch (error) {
    console.error('Error sending email:', error);
    // Don't throw - email failure shouldn't fail the registration
    // Log to CloudWatch for monitoring
  }
}

/**
 * Generate email content based on notification type
 * @param payload - Email notification payload
 * @returns Email subject and body
 */
function generateEmailContent(payload: EmailNotificationPayload): {
  subject: string;
  htmlBody: string;
  textBody: string;
} {
  switch (payload.type) {
    case 'REGISTRATION_CONFIRMED':
      return generateRegistrationConfirmedEmail(payload);
    case 'WAITLIST_ADDED':
      return generateWaitlistAddedEmail(payload);
    case 'WAITLIST_PROMOTED':
      return generateWaitlistPromotedEmail(payload);
    case 'REGISTRATION_CANCELLED':
      return generateRegistrationCancelledEmail(payload);
    default:
      throw new Error(`Unknown email type: ${payload.type}`);
  }
}

/**
 * Registration Confirmed Email Template
 */
function generateRegistrationConfirmedEmail(payload: EmailNotificationPayload): {
  subject: string;
  htmlBody: string;
  textBody: string;
} {
  const eventDate = new Date(payload.eventStartDateTime).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const subject = `✅ Registration Confirmed: ${payload.eventTitle}`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #E21833; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .qr-code { text-align: center; margin: 20px 0; }
    .qr-code img { max-width: 300px; border: 2px solid #E21833; }
    .button { display: inline-block; padding: 12px 24px; background-color: #E21833; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
    .footer { text-align: center; margin-top: 20px; font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 You're Registered!</h1>
    </div>
    <div class="content">
      <p>Hi ${payload.recipientName},</p>
      
      <p>Great news! You're successfully registered for:</p>
      
      <h2 style="color: #E21833;">${payload.eventTitle}</h2>
      <p><strong>When:</strong> ${eventDate}</p>
      
      <div class="qr-code">
        <h3>Your Check-in QR Code</h3>
        <p>Save this QR code for quick check-in at the event:</p>
        <img src="${payload.qrCode}" alt="Check-in QR Code" />
        <p><small>Registration ID: ${payload.registrationId}</small></p>
      </div>
      
      <p><a href="${FRONTEND_URL}/my-registrations" class="button">View My Registrations</a></p>
      
      <p><strong>Important Notes:</strong></p>
      <ul>
        <li>Save this email or screenshot your QR code</li>
        <li>Arrive 10 minutes early for smooth check-in</li>
        <li>You can cancel anytime from your dashboard</li>
      </ul>
      
      <p>See you at the event!</p>
      <p>- Terrapin Events Team</p>
    </div>
    <div class="footer">
      <p>University of Maryland | Terrapin Events Management System</p>
      <p><a href="${FRONTEND_URL}/my-registrations">Manage Registrations</a> | <a href="${FRONTEND_URL}/events/${payload.registrationId}">Event Details</a></p>
    </div>
  </div>
</body>
</html>
  `;

  const textBody = `
✅ REGISTRATION CONFIRMED

Hi ${payload.recipientName},

You're successfully registered for:
${payload.eventTitle}

When: ${eventDate}

Your Registration ID: ${payload.registrationId}

Your QR code for check-in is attached to this email. Save it or screenshot it for quick entry at the event.

Important Notes:
- Arrive 10 minutes early for smooth check-in
- You can cancel anytime from your dashboard at ${FRONTEND_URL}/my-registrations

See you at the event!

- Terrapin Events Team
University of Maryland
  `;

  return { subject, htmlBody, textBody };
}

/**
 * Waitlist Added Email Template
 */
function generateWaitlistAddedEmail(payload: EmailNotificationPayload): {
  subject: string;
  htmlBody: string;
  textBody: string;
} {
  const subject = `📋 You're on the Waitlist: ${payload.eventTitle}`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #FFD200; color: #333; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .position-badge { display: inline-block; padding: 10px 20px; background-color: #FFD200; color: #333; font-size: 1.2em; font-weight: bold; border-radius: 4px; }
    .footer { text-align: center; margin-top: 20px; font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 You're on the Waitlist</h1>
    </div>
    <div class="content">
      <p>Hi ${payload.recipientName},</p>
      
      <p>The event you tried to register for is currently at capacity, but we've added you to the waitlist:</p>
      
      <h2 style="color: #E21833;">${payload.eventTitle}</h2>
      
      <p style="text-align: center;">
        <span class="position-badge">Position #${payload.waitlistPosition}</span>
      </p>
      
      <p><strong>What happens next?</strong></p>
      <ul>
        <li>If someone cancels, you'll be automatically promoted (FIFO - first in, first out)</li>
        <li>You'll receive an email with your QR code when promoted</li>
        <li>You'll have 24 hours to confirm your spot</li>
        <li>We'll keep you updated on your position</li>
      </ul>
      
      <p>Fingers crossed! 🤞</p>
      <p>- Terrapin Events Team</p>
    </div>
    <div class="footer">
      <p>University of Maryland | Terrapin Events Management System</p>
      <p><a href="${FRONTEND_URL}/my-registrations">View Waitlist Status</a></p>
    </div>
  </div>
</body>
</html>
  `;

  const textBody = `
📋 YOU'RE ON THE WAITLIST

Hi ${payload.recipientName},

The event you tried to register for is currently at capacity, but we've added you to the waitlist:

${payload.eventTitle}

Your Position: #${payload.waitlistPosition}

What happens next?
- If someone cancels, you'll be automatically promoted (FIFO - first in, first out)
- You'll receive an email with your QR code when promoted
- You'll have 24 hours to confirm your spot
- We'll keep you updated on your position

Fingers crossed!

- Terrapin Events Team
University of Maryland

View your waitlist status: ${FRONTEND_URL}/my-registrations
  `;

  return { subject, htmlBody, textBody };
}

/**
 * Waitlist Promoted Email Template
 */
function generateWaitlistPromotedEmail(payload: EmailNotificationPayload): {
  subject: string;
  htmlBody: string;
  textBody: string;
} {
  const deadline = payload.promotionDeadline
    ? new Date(payload.promotionDeadline).toLocaleString('en-US', {
        weekday: 'long',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '24 hours';

  const subject = `🎉 You've Been Promoted! ${payload.eventTitle}`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .qr-code { text-align: center; margin: 20px 0; }
    .qr-code img { max-width: 300px; border: 2px solid #28a745; }
    .alert { background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .footer { text-align: center; margin-top: 20px; font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 You've Been Promoted!</h1>
    </div>
    <div class="content">
      <p>Hi ${payload.recipientName},</p>
      
      <p><strong>Great news!</strong> A spot opened up and you've been promoted from the waitlist:</p>
      
      <h2 style="color: #E21833;">${payload.eventTitle}</h2>
      
      <div class="alert">
        <p><strong>⏰ Action Required:</strong> This registration is valid for <strong>24 hours</strong>.</p>
        <p>Deadline: ${deadline}</p>
        <p>If you don't attend or cancel before this time, your spot will go to the next person on the waitlist.</p>
      </div>
      
      <div class="qr-code">
        <h3>Your Check-in QR Code</h3>
        <img src="${payload.qrCode}" alt="Check-in QR Code" />
        <p><small>Registration ID: ${payload.registrationId}</small></p>
      </div>
      
      <p><strong>Your registration is confirmed!</strong> Just show up with your QR code.</p>
      
      <p>See you at the event!</p>
      <p>- Terrapin Events Team</p>
    </div>
    <div class="footer">
      <p>University of Maryland | Terrapin Events Management System</p>
    </div>
  </div>
</body>
</html>
  `;

  const textBody = `
🎉 YOU'VE BEEN PROMOTED!

Hi ${payload.recipientName},

Great news! A spot opened up and you've been promoted from the waitlist:

${payload.eventTitle}

⏰ ACTION REQUIRED: This registration is valid for 24 hours.
Deadline: ${deadline}

If you don't attend or cancel before this time, your spot will go to the next person on the waitlist.

Your QR code for check-in is attached to this email.
Registration ID: ${payload.registrationId}

Your registration is confirmed! Just show up with your QR code.

See you at the event!

- Terrapin Events Team
University of Maryland
  `;

  return { subject, htmlBody, textBody };
}

/**
 * Registration Cancelled Email Template
 */
function generateRegistrationCancelledEmail(payload: EmailNotificationPayload): {
  subject: string;
  htmlBody: string;
  textBody: string;
} {
  const subject = `❌ Registration Cancelled: ${payload.eventTitle}`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #6c757d; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .footer { text-align: center; margin-top: 20px; font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Registration Cancelled</h1>
    </div>
    <div class="content">
      <p>Hi ${payload.recipientName},</p>
      
      <p>Your registration has been cancelled for:</p>
      
      <h2 style="color: #E21833;">${payload.eventTitle}</h2>
      
      <p>We're sorry you can't make it. If you change your mind, you can register again (subject to availability).</p>
      
      <p><a href="${FRONTEND_URL}/events">Browse Other Events</a></p>
      
      <p>Hope to see you at a future event!</p>
      <p>- Terrapin Events Team</p>
    </div>
    <div class="footer">
      <p>University of Maryland | Terrapin Events Management System</p>
    </div>
  </div>
</body>
</html>
  `;

  const textBody = `
❌ REGISTRATION CANCELLED

Hi ${payload.recipientName},

Your registration has been cancelled for:
${payload.eventTitle}

We're sorry you can't make it. If you change your mind, you can register again (subject to availability).

Browse other events: ${FRONTEND_URL}/events

Hope to see you at a future event!

- Terrapin Events Team
University of Maryland
  `;

  return { subject, htmlBody, textBody };
}
