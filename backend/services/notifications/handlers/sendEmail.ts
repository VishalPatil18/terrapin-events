import { Context } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { sendEmail } from '../lib/email/sesClient';
import { renderTemplate } from '../lib/email/templateRenderer';
import { trackEmailSent, trackEmailFailed } from '../lib/email/deliveryTracker';
import { isRetryable, calculateNextRetry } from '../lib/retry/retryHandler';
import {
  NotificationType,
  NotificationPriority,
  DeliveryStatus,
  SendEmailRequest,
} from '../types/notification.types';

const sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' });
const RETRY_QUEUE_URL = process.env.RETRY_QUEUE_URL!;

/**
 * Send email notification using SES
 * 
 * Flow:
 * 1. Render email template (MJML -> HTML)
 * 2. Send via SES
 * 3. Track delivery status in DynamoDB
 * 4. Queue for retry if failure
 */
export async function handler(
  event: SendEmailRequest,
  context: Context
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  console.log('Sending email notification:', JSON.stringify(event, null, 2));

  const {
    userId,
    email,
    notificationType,
    priority,
    data,
    metadata,
    attempt = 1,
  } = event;

  try {
    // Generate idempotency key
    const idempotencyKey = `${userId}-${notificationType}-${metadata.eventId}-${Date.now()}`;

    // Render email template
    const renderResult = await renderTemplate(
      getTemplateName(notificationType),
      data as any // Type assertion needed as data is more flexible
    );

    if (!renderResult.success) {
      throw new Error(renderResult.error || 'Failed to render template');
    }

    const { html, text } = renderResult;
    const subject = generateSubject(notificationType, data);

    // Send email via SES
    const result = await sendEmail(
      [email],
      subject,
      html!,
      text!,
      {
        replyTo: process.env.SES_REPLY_TO_EMAIL,
      }
    );

    if (!result.success) {
      const errorMessage = typeof result.error === 'string' 
        ? result.error 
        : result.error?.message || 'Failed to send email';
      throw new Error(errorMessage);
    }

    // Track successful delivery
    await trackEmailSent({
      userId,
      notificationType,
      channel: 'email',
      recipient: email,
      subject,
      messageId: result.messageId!,
      attempt,
      metadata,
    });

    console.log('Email sent successfully:', result.messageId);

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error: any) {
    console.error('Error sending email:', error);

    // Track failed delivery
    await trackEmailFailed({
      userId,
      notificationType,
      channel: 'email',
      recipient: email,
      attempt,
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message,
        details: error,
      },
      metadata,
    });

    // Determine if retryable
    const isRetryableError = isRetryable(error);
    const shouldRetry = isRetryableError && attempt < 3;

    if (shouldRetry) {
      // Calculate next retry time
      const nextRetryAt = calculateNextRetry(attempt);

      console.log(`Queueing for retry (attempt ${attempt + 1}) at ${nextRetryAt.toISOString()}`);

      // Send to retry queue
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: RETRY_QUEUE_URL,
          MessageBody: JSON.stringify({
            ...event,
            attempt: attempt + 1,
            nextRetryAt: nextRetryAt.toISOString(),
          }),
          DelaySeconds: Math.min(
            Math.floor((nextRetryAt.getTime() - Date.now()) / 1000),
            900 // Max 15 minutes
          ),
          MessageAttributes: {
            NotificationType: {
              DataType: 'String',
              StringValue: notificationType,
            },
            Attempt: {
              DataType: 'Number',
              StringValue: (attempt + 1).toString(),
            },
            UserId: {
              DataType: 'String',
              StringValue: userId,
            },
          },
        })
      );
    } else {
      console.error(`Email failed after ${attempt} attempts or non-retryable error`);
      // Will go to DLQ after max retries
    }

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Template subject lines
 */
const SUBJECT_TEMPLATES: Record<NotificationType, string> = {
  [NotificationType.REGISTRATION_CONFIRMED]: '✅ Registration Confirmed - {{eventTitle}}',
  [NotificationType.WAITLIST_ADDED]: '⏳ Waitlist Confirmation - {{eventTitle}}',
  [NotificationType.WAITLIST_PROMOTED]: '🎉 You Got In! - {{eventTitle}}',
  [NotificationType.REGISTRATION_CANCELLED]: 'Registration Cancelled - {{eventTitle}}',
  [NotificationType.EVENT_UPDATED]: '⚠️ Event Updated - {{eventTitle}}',
  [NotificationType.EVENT_CANCELLED]: '❌ Event Cancelled - {{eventTitle}}',
  [NotificationType.EVENT_REMINDER_24H]: '⏰ Tomorrow: {{eventTitle}}',
  [NotificationType.EVENT_REMINDER_1H]: '🚀 Starting Soon: {{eventTitle}}',
};

/**
 * Map notification type to template name
 */
function getTemplateName(notificationType: NotificationType): string {
  const mapping: Record<NotificationType, string> = {
    [NotificationType.REGISTRATION_CONFIRMED]: 'registration-confirmation',
    [NotificationType.WAITLIST_ADDED]: 'waitlist-added',
    [NotificationType.WAITLIST_PROMOTED]: 'waitlist-promoted',
    [NotificationType.REGISTRATION_CANCELLED]: 'registration-cancelled',
    [NotificationType.EVENT_UPDATED]: 'event-updated',
    [NotificationType.EVENT_CANCELLED]: 'event-cancelled',
    [NotificationType.EVENT_REMINDER_24H]: 'event-reminder-24h',
    [NotificationType.EVENT_REMINDER_1H]: 'event-reminder-1h',
  };
  return mapping[notificationType];
}

/**
 * Generate email subject from template
 */
function generateSubject(notificationType: NotificationType, data: Record<string, any>): string {
  const template = SUBJECT_TEMPLATES[notificationType];
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
}
