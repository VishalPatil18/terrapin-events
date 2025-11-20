/**
 * TEMS Notification System - Delivery Tracker
 * 
 * Tracks email delivery status in DynamoDB.
 * Monitors sent, delivered, bounced, and failed notifications.
 * 
 * @module notifications/lib/email/deliveryTracker
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { 
  DeliveryTracking, 
  DeliveryStatus, 
  NotificationChannel 
} from '../../types/notification.types';

const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'terrapin-events-dev';

/**
 * Create a delivery tracking record
 * 
 * @param notificationId - Unique notification ID
 * @param channel - Delivery channel (EMAIL or IN_APP)
 * @param attempt - Attempt number (1, 2, or 3)
 * @param recipient - Email recipient
 * @param subject - Email subject
 * @returns Created delivery tracking record
 */
export async function createDeliveryTracking(
  notificationId: string,
  channel: NotificationChannel,
  attempt: number,
  recipient?: string,
  subject?: string
): Promise<DeliveryTracking> {
  const now = new Date().toISOString();
  
  const tracking: DeliveryTracking = {
    PK: `NOTIFICATION#${notificationId}`,
    SK: `DELIVERY#${channel}#${attempt}`,
    notificationId,
    channel,
    status: DeliveryStatus.PENDING,
    recipient,
    subject,
    sentAt: now,
    attempt,
    createdAt: now,
    updatedAt: now,
  };

  await dynamoDB.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: tracking,
    })
  );

  return tracking;
}

/**
 * Update delivery tracking status
 * 
 * @param notificationId - Notification ID
 * @param channel - Delivery channel
 * @param attempt - Attempt number
 * @param status - New delivery status
 * @param messageId - SES message ID (optional)
 * @param error - Error details (optional)
 */
export async function updateDeliveryStatus(
  notificationId: string,
  channel: NotificationChannel,
  attempt: number,
  status: DeliveryStatus,
  messageId?: string,
  error?: { code: string; message: string; details: any }
): Promise<void> {
  const now = new Date().toISOString();
  
  let updateExpression = 'SET #status = :status, updatedAt = :updatedAt';
  const expressionAttributeNames: Record<string, string> = {
    '#status': 'status',
  };
  const expressionAttributeValues: Record<string, any> = {
    ':status': status,
    ':updatedAt': now,
  };

  // Add timestamp for specific statuses
  if (status === DeliveryStatus.DELIVERED) {
    updateExpression += ', deliveredAt = :deliveredAt';
    expressionAttributeValues[':deliveredAt'] = now;
  } else if (status === DeliveryStatus.BOUNCED) {
    updateExpression += ', bouncedAt = :bouncedAt';
    expressionAttributeValues[':bouncedAt'] = now;
  } else if (status === DeliveryStatus.COMPLAINED) {
    updateExpression += ', complainedAt = :complainedAt';
    expressionAttributeValues[':complainedAt'] = now;
  }

  // Add message ID if provided
  if (messageId) {
    updateExpression += ', messageId = :messageId';
    expressionAttributeValues[':messageId'] = messageId;
  }

  // Add error details if provided
  if (error) {
    updateExpression += ', #error = :error';
    expressionAttributeNames['#error'] = 'error';
    expressionAttributeValues[':error'] = error;
  }

  await dynamoDB.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `NOTIFICATION#${notificationId}`,
        SK: `DELIVERY#${channel}#${attempt}`,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    })
  );
}

/**
 * Mark delivery as sent with SES message ID
 * 
 * @param notificationId - Notification ID
 * @param channel - Delivery channel
 * @param attempt - Attempt number
 * @param messageId - SES message ID
 */
export async function markAsSent(
  notificationId: string,
  channel: NotificationChannel,
  attempt: number,
  messageId: string
): Promise<void> {
  await updateDeliveryStatus(
    notificationId,
    channel,
    attempt,
    DeliveryStatus.SENT,
    messageId
  );
}

/**
 * Mark delivery as delivered
 * 
 * @param notificationId - Notification ID
 * @param messageId - SES message ID
 */
export async function markAsDelivered(
  notificationId: string,
  messageId: string
): Promise<void> {
  // Find the tracking record by messageId
  const tracking = await findTrackingByMessageId(messageId);
  
  if (tracking) {
    await updateDeliveryStatus(
      tracking.notificationId,
      tracking.channel,
      tracking.attempt,
      DeliveryStatus.DELIVERED,
      messageId
    );
  }
}

/**
 * Mark delivery as bounced
 * 
 * @param notificationId - Notification ID
 * @param messageId - SES message ID
 * @param bounceType - Type of bounce
 * @param bounceMessage - Bounce error message
 */
export async function markAsBounced(
  notificationId: string,
  messageId: string,
  bounceType: string,
  bounceMessage: string
): Promise<void> {
  const tracking = await findTrackingByMessageId(messageId);
  
  if (tracking) {
    await updateDeliveryStatus(
      tracking.notificationId,
      tracking.channel,
      tracking.attempt,
      DeliveryStatus.BOUNCED,
      messageId,
      {
        code: bounceType,
        message: bounceMessage,
        details: null,
      }
    );
  }
}

/**
 * Mark delivery as complained (spam report)
 * 
 * @param notificationId - Notification ID
 * @param messageId - SES message ID
 */
export async function markAsComplained(
  notificationId: string,
  messageId: string
): Promise<void> {
  const tracking = await findTrackingByMessageId(messageId);
  
  if (tracking) {
    await updateDeliveryStatus(
      tracking.notificationId,
      tracking.channel,
      tracking.attempt,
      DeliveryStatus.COMPLAINED,
      messageId
    );
  }
}

/**
 * Mark delivery as failed
 * 
 * @param notificationId - Notification ID
 * @param channel - Delivery channel
 * @param attempt - Attempt number
 * @param error - Error details
 */
export async function markAsFailed(
  notificationId: string,
  channel: NotificationChannel,
  attempt: number,
  error: { code: string; message: string; details: any }
): Promise<void> {
  await updateDeliveryStatus(
    notificationId,
    channel,
    attempt,
    DeliveryStatus.FAILED,
    undefined,
    error
  );
}

/**
 * Schedule next retry attempt
 * 
 * @param notificationId - Notification ID
 * @param channel - Delivery channel
 * @param attempt - Current attempt number
 * @param nextRetryAt - ISO timestamp for next retry
 */
export async function scheduleRetry(
  notificationId: string,
  channel: NotificationChannel,
  attempt: number,
  nextRetryAt: string
): Promise<void> {
  await dynamoDB.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `NOTIFICATION#${notificationId}`,
        SK: `DELIVERY#${channel}#${attempt}`,
      },
      UpdateExpression: 'SET nextRetryAt = :nextRetryAt, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':nextRetryAt': nextRetryAt,
        ':updatedAt': new Date().toISOString(),
      },
    })
  );
}

/**
 * Get all delivery attempts for a notification
 * 
 * @param notificationId - Notification ID
 * @returns Array of delivery tracking records
 */
export async function getDeliveryHistory(
  notificationId: string
): Promise<DeliveryTracking[]> {
  const response = await dynamoDB.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `NOTIFICATION#${notificationId}`,
        ':sk': 'DELIVERY#',
      },
    })
  );

  return (response.Items || []) as DeliveryTracking[];
}

/**
 * Find tracking record by SES message ID
 * Helper function to look up delivery tracking by messageId
 * 
 * @param messageId - SES message ID
 * @returns Delivery tracking record or null
 */
async function findTrackingByMessageId(
  messageId: string
): Promise<DeliveryTracking | null> {
  // Note: This requires a GSI on messageId
  // For now, we'll do a scan (not ideal for production)
  // TODO: Add GSI for messageId lookup in serverless.yml
  
  // In production, you would query GSI:
  // const response = await dynamoDB.send(
  //   new QueryCommand({
  //     TableName: TABLE_NAME,
  //     IndexName: 'MessageIdIndex',
  //     KeyConditionExpression: 'messageId = :messageId',
  //     ExpressionAttributeValues: {
  //       ':messageId': messageId,
  //     },
  //   })
  // );
  
  // For now, return null and log warning
  console.warn('findTrackingByMessageId: GSI not implemented, returning null');
  return null;
}

/**
 * Get delivery statistics for a time period
 * 
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 * @returns Delivery statistics
 */
export async function getDeliveryStats(
  startDate: string,
  endDate: string
): Promise<{
  totalSent: number;
  totalDelivered: number;
  totalBounced: number;
  totalFailed: number;
  deliveryRate: number;
}> {
  // This would require aggregation queries
  // For production, consider using DynamoDB Streams to maintain
  // aggregate statistics in a separate table or CloudWatch metrics
  
  return {
    totalSent: 0,
    totalDelivered: 0,
    totalBounced: 0,
    totalFailed: 0,
    deliveryRate: 0,
  };
}

export default {
  createDeliveryTracking,
  updateDeliveryStatus,
  markAsSent,
  markAsDelivered,
  markAsBounced,
  markAsComplained,
  markAsFailed,
  scheduleRetry,
  getDeliveryHistory,
  getDeliveryStats,
};

/**
 * Track successful email send (convenience wrapper)
 */
export async function trackEmailSent(params: {
  userId: string;
  notificationType: string;
  channel: string;
  recipient: string;
  subject: string;
  messageId: string;
  attempt: number;
  metadata: Record<string, any>;
}): Promise<void> {
  const notificationId = `${params.userId}-${params.notificationType}-${params.metadata.eventId}`;
  
  await createDeliveryTracking(
    notificationId,
    NotificationChannel.EMAIL,
    params.attempt,
    params.recipient,
    params.subject
  );
  
  await markAsSent(
    notificationId,
    NotificationChannel.EMAIL,
    params.attempt,
    params.messageId
  );
}

/**
 * Track failed email send (convenience wrapper)
 */
export async function trackEmailFailed(params: {
  userId: string;
  notificationType: string;
  channel: string;
  recipient: string;
  attempt: number;
  error: { code: string; message: string; details: any };
  metadata: Record<string, any>;
}): Promise<void> {
  const notificationId = `${params.userId}-${params.notificationType}-${params.metadata.eventId}`;
  
  await createDeliveryTracking(
    notificationId,
    NotificationChannel.EMAIL,
    params.attempt,
    params.recipient
  );
  
  await markAsFailed(
    notificationId,
    NotificationChannel.EMAIL,
    params.attempt,
    params.error
  );
}

/**
 * Track email bounce (convenience wrapper)
 */
export async function trackBounce(params: {
  messageId: string;
  recipient: string;
  bounceType: string;
  diagnosticCode?: string;
}): Promise<void> {
  // In a real implementation, we'd look up the notification by messageId
  // For now, log the bounce
  console.log('Email bounced:', params);
  
  // Would call markAsBounced with proper notificationId lookup
  // await markAsBounced(notificationId, params.messageId, params.bounceType, params.diagnosticCode || 'Unknown');
}

/**
 * Track email complaint (convenience wrapper)
 */
export async function trackComplaint(params: {
  messageId: string;
  recipient: string;
  feedbackType?: string;
  userAgent?: string;
  arrivalDate?: string;
}): Promise<void> {
  // In a real implementation, we'd look up the notification by messageId
  // For now, log the complaint
  console.log('Email complaint:', params);
  
  // Would call markAsComplained with proper notificationId lookup
  // await markAsComplained(notificationId, params.messageId);
}
