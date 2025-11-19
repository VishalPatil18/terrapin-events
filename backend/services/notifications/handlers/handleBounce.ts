import { SNSEvent, Context } from 'aws-lambda';
import { deliveryTracker } from '../lib/email/deliveryTracker';
import { preferencesManager } from '../lib/preferences/preferencesManager';

/**
 * Handle SES bounce notifications via SNS
 * 
 * Bounce Types:
 * - Permanent: Invalid email, mailbox doesn't exist
 * - Transient: Mailbox full, server temporarily unavailable
 * - Undetermined: Unknown bounce reason
 * 
 * Actions:
 * - Track bounce in delivery history
 * - For permanent bounces: optionally disable email for user
 * - Log for monitoring and alerting
 */
export const handler = async (event: SNSEvent, context: Context): Promise<void> => {
  console.log('Processing bounce notification:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.Sns.Message);
      const bounce = message.bounce;
      const mail = message.mail;

      console.log('Bounce details:', {
        bounceType: bounce.bounceType,
        bounceSubType: bounce.bounceSubType,
        messageId: mail.messageId,
        recipients: bounce.bouncedRecipients.map((r: any) => r.emailAddress),
      });

      // Extract user ID from message tags
      const userId = extractUserIdFromTags(mail.tags);

      for (const recipient of bounce.bouncedRecipients) {
        await deliveryTracker.trackBounce({
          messageId: mail.messageId,
          recipient: recipient.emailAddress,
          bounceType: bounce.bounceType,
          bounceSubType: bounce.bounceSubType,
          diagnosticCode: recipient.diagnosticCode,
          action: recipient.action,
        });

        // For permanent bounces, consider disabling email notifications
        if (bounce.bounceType === 'Permanent' && userId) {
          console.log(`Permanent bounce for user ${userId}, considering email disable`);
          
          // Optional: Auto-disable email notifications
          // await preferencesManager.updatePreferences(userId, {
          //   channels: { email: false }
          // });
          
          // Or: Mark for manual review
          console.warn(`Manual review needed: User ${userId} has permanent bounce`);
        }
      }
    } catch (error) {
      console.error('Error processing bounce notification:', error);
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
