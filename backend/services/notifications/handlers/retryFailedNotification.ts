import { SQSEvent, Context } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { handler as sendEmailHandler } from './sendEmail';
import { SendEmailRequest } from '../types/notification.types';

const sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' });
const DLQ_URL = process.env.DLQ_URL!;

/**
 * Retry failed notifications from SQS queue
 * 
 * Flow:
 * 1. Receive failed notification from retry queue
 * 2. Attempt to send again
 * 3. If still fails and < 3 attempts: requeue with backoff
 * 4. If 3rd attempt fails: move to DLQ
 * 
 * Queue configuration:
 * - Visibility timeout: 180s
 * - Message retention: 24 hours
 * - Max receive count: 3 (then DLQ)
 */
export const handler = async (event: SQSEvent, context: Context): Promise<void> => {
  console.log('Processing retry queue:', {
    messageCount: event.Records.length,
  });

  for (const record of event.Records) {
    try {
      const request: SendEmailRequest = JSON.parse(record.body);
      
      console.log('Retrying notification:', {
        userId: request.userId,
        type: request.notificationType,
        attempt: request.attempt,
      });

      // Attempt to send
      const result = await sendEmailHandler(request, context);

      if (result.success) {
        console.log('Retry successful:', {
          userId: request.userId,
          attempt: request.attempt,
          messageId: result.messageId,
        });
      } else {
        console.error('Retry failed:', {
          userId: request.userId,
          attempt: request.attempt,
          error: result.error,
        });

        // If this was the final attempt, log for DLQ monitoring
        if (request.attempt >= 3) {
          console.error('Max retries reached, message will move to DLQ:', {
            userId: request.userId,
            type: request.notificationType,
            finalAttempt: request.attempt,
          });
        }
      }
    } catch (error) {
      console.error('Error processing retry message:', error);
      // Let SQS handle redelivery
      throw error;
    }
  }
};
