import { SNSEvent, Context } from 'aws-lambda';
import { deliveryTracker } from '../lib/email/deliveryTracker';
import { preferencesManager } from '../lib/preferences/preferencesManager';

/**
 * Handle SES complaint notifications via SNS
 * 
 * Triggered when recipient marks email as spam
 * 
 * Actions:
 * - Track complaint in delivery history
 * - Automatically unsubscribe user from email notifications
 * - Log for monitoring and compliance
 */
export const handler = async (event: SNSEvent, context: Context): Promise<void> => {
  console.log('Processing complaint notification:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.Sns.Message);
      const complaint = message.complaint;
      const mail = message.mail;

      console.log('Complaint details:', {
        complaintFeedbackType: complaint.complaintFeedbackType,
        messageId: mail.messageId,
        recipients: complaint.complainedRecipients.map((r: any) => r.emailAddress),
      });

      // Extract user ID from message tags
      const userId = extractUserIdFromTags(mail.tags);

      for (const recipient of complaint.complainedRecipients) {
        await deliveryTracker.trackComplaint({
          messageId: mail.messageId,
          recipient: recipient.emailAddress,
          feedbackType: complaint.complaintFeedbackType,
          userAgent: complaint.userAgent,
          arrivalDate: complaint.arrivalDate,
        });

        // Automatically unsubscribe from email notifications
        if (userId) {
          console.log(`Spam complaint from user ${userId}, unsubscribing from emails`);
          
          try {
            await preferencesManager.updatePreferences(userId, {
              channels: { email: false },
            });

            console.log(`User ${userId} unsubscribed from email notifications due to complaint`);
          } catch (error) {
            console.error(`Failed to unsubscribe user ${userId}:`, error);
          }
        } else {
          console.warn(`Could not determine user ID for recipient ${recipient.emailAddress}`);
        }

        // Log for compliance tracking
        console.warn('COMPLIANCE ALERT: Spam complaint received', {
          recipient: recipient.emailAddress,
          messageId: mail.messageId,
          userId,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error processing complaint notification:', error);
      // Continue processing other records
    }
  }
};

/**
 * Extract user ID from SES message tags
 */
function extractUserIdFromTags(tags: Record<string, any>[]): string | null {
  if (!tags || !Array.isArray(tags)) {
    return null;
  }

  const userIdTag = tags.find((tag) => tag.Name === 'UserId');
  return userIdTag?.Value || null;
}
