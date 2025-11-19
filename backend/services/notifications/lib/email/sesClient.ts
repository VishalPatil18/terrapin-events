/**
 * TEMS Notification System - SES Client
 * 
 * AWS SES client wrapper for sending emails with delivery tracking.
 * Handles email sending, verification, and error handling.
 * 
 * @module notifications/lib/email/sesClient
 */

import { 
  SESClient, 
  SendEmailCommand,
  SendEmailCommandInput,
  SendEmailCommandOutput,
  VerifyEmailIdentityCommand,
  GetAccountSendingEnabledCommand,
} from '@aws-sdk/client-ses';

const region = process.env.AWS_REGION || 'us-east-1';
const sesClient = new SESClient({ region });

/**
 * Email sending configuration
 */
export interface EmailConfig {
  from: string;
  replyTo?: string;
  configurationSetName?: string;
}

/**
 * Result of email send operation
 */
export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

/**
 * Default email configuration
 */
const DEFAULT_CONFIG: EmailConfig = {
  from: process.env.SES_FROM_EMAIL || 'noreply@terrapine vents.umd.edu',
  replyTo: process.env.SES_REPLY_TO_EMAIL || 'support@terrapinevents.umd.edu',
  configurationSetName: process.env.SES_CONFIGURATION_SET || 'tems-email-tracking',
};

/**
 * Send an email via AWS SES
 * 
 * @param to - Recipient email address(es)
 * @param subject - Email subject
 * @param htmlBody - HTML email body
 * @param textBody - Plain text email body (fallback)
 * @param config - Optional email configuration override
 * @returns SendEmailResult with messageId or error
 */
export async function sendEmail(
  to: string[],
  subject: string,
  htmlBody: string,
  textBody: string,
  config: Partial<EmailConfig> = {}
): Promise<SendEmailResult> {
  const emailConfig = { ...DEFAULT_CONFIG, ...config };

  const params: SendEmailCommandInput = {
    Source: emailConfig.from,
    Destination: {
      ToAddresses: to,
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8',
        },
        Text: {
          Data: textBody,
          Charset: 'UTF-8',
        },
      },
    },
    ReplyToAddresses: emailConfig.replyTo ? [emailConfig.replyTo] : undefined,
    ConfigurationSetName: emailConfig.configurationSetName,
  };

  try {
    const command = new SendEmailCommand(params);
    const response: SendEmailCommandOutput = await sesClient.send(command);

    return {
      success: true,
      messageId: response.MessageId,
    };
  } catch (error: any) {
    console.error('SES sendEmail error:', error);

    // Categorize errors for retry logic
    const retryableErrors = [
      'Throttling',
      'ServiceUnavailable',
      'InternalFailure',
      'RequestTimeout',
    ];

    const isRetryable = retryableErrors.includes(error.name);

    return {
      success: false,
      error: {
        code: error.name || 'UnknownError',
        message: error.message || 'Failed to send email',
        retryable: isRetryable,
      },
    };
  }
}

/**
 * Send multiple emails in batch (up to 50 at a time per SES limits)
 * 
 * @param emails - Array of email send requests
 * @returns Array of results corresponding to each email
 */
export async function sendBatchEmails(
  emails: Array<{
    to: string[];
    subject: string;
    htmlBody: string;
    textBody: string;
  }>
): Promise<SendEmailResult[]> {
  // SES SendBulkEmail has a limit of 50 recipients per call
  // For simplicity, we'll send them individually with Promise.all
  // In production, consider using SendBulkEmailCommand for better performance
  
  const results = await Promise.allSettled(
    emails.map((email) =>
      sendEmail(email.to, email.subject, email.htmlBody, email.textBody)
    )
  );

  return results.map((result) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        success: false,
        error: {
          code: 'BatchSendFailure',
          message: result.reason?.message || 'Failed to send email in batch',
          retryable: true,
        },
      };
    }
  });
}

/**
 * Verify an email address or domain in SES
 * 
 * @param emailOrDomain - Email address or domain to verify
 * @returns Boolean indicating if verification email was sent
 */
export async function verifyEmailIdentity(emailOrDomain: string): Promise<boolean> {
  try {
    const command = new VerifyEmailIdentityCommand({
      EmailAddress: emailOrDomain,
    });
    
    await sesClient.send(command);
    console.log(`Verification email sent to ${emailOrDomain}`);
    return true;
  } catch (error: any) {
    console.error('SES verifyEmailIdentity error:', error);
    return false;
  }
}

/**
 * Check if SES account sending is enabled
 * 
 * @returns Boolean indicating if account can send emails
 */
export async function isAccountSendingEnabled(): Promise<boolean> {
  try {
    const command = new GetAccountSendingEnabledCommand({});
    const response = await sesClient.send(command);
    return response.Enabled || false;
  } catch (error: any) {
    console.error('SES isAccountSendingEnabled error:', error);
    return false;
  }
}

/**
 * Generate a plain text version from HTML
 * Simple implementation - strips HTML tags
 * For production, consider using a library like html-to-text
 * 
 * @param html - HTML content
 * @returns Plain text content
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>.*<\/style>/gm, '')
    .replace(/<script[^>]*>.*<\/script>/gm, '')
    .replace(/<[^>]+>/gm, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Validate email address format
 * 
 * @param email - Email address to validate
 * @returns Boolean indicating if email format is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate multiple email addresses
 * 
 * @param emails - Array of email addresses
 * @returns Array of invalid email addresses (empty if all valid)
 */
export function validateEmails(emails: string[]): string[] {
  return emails.filter((email) => !isValidEmail(email));
}

/**
 * Get SES client instance (for advanced use cases)
 * 
 * @returns SESClient instance
 */
export function getSESClient(): SESClient {
  return sesClient;
}

export default {
  sendEmail,
  sendBatchEmails,
  verifyEmailIdentity,
  isAccountSendingEnabled,
  htmlToText,
  isValidEmail,
  validateEmails,
  getSESClient,
};
