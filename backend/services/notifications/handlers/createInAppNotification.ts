import { Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { nanoid } from 'nanoid';
import {
  NotificationType,
  NotificationPriority,
  CreateInAppNotificationInput,
} from '../types/notification.types';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const eventBridgeClient = new EventBridgeClient({ region: process.env.AWS_REGION || 'us-east-1' });

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME!;

/**
 * Create in-app notification in DynamoDB
 * Publishes to EventBridge for real-time push to connected clients
 * 
 * DynamoDB Schema:
 * PK: USER#{userId}
 * SK: NOTIFICATION#{notificationId}
 * GSI1PK: USER#{userId}
 * GSI1SK: NOTIFICATION#{timestamp}#{notificationId}
 */
export const handler = async (
  request: CreateInAppNotificationInput,
  context: Context
): Promise<{ success: boolean; notificationId?: string; error?: string }> => {
  console.log('Creating in-app notification:', JSON.stringify(request, null, 2));

  const { userId, type, priority, data, metadata } = request;

  try {
    const notificationId = nanoid();
    const timestamp = new Date().toISOString();
    const ttl = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days

    // Prepare notification item
    const notification = {
      PK: `USER#${userId}`,
      SK: `NOTIFICATION#${notificationId}`,
      GSI1PK: `USER#${userId}`,
      GSI1SK: `NOTIFICATION#${timestamp}#${notificationId}`,
      
      notificationId,
      userId,
      type: NotificationType,
      priority,
      
      title: getNotificationTitle(type, data),
      message: getNotificationMessage(type, data),
      actionUrl: data.eventUrl,
      
      read: false,
      readAt: null,
      
      data,
      metadata,
      
      createdAt: timestamp,
      updatedAt: timestamp,
      ttl,
    };

    // Save to DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: notification,
        ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
      })
    );

    // Publish event for real-time notification (AppSync subscription)
    await eventBridgeClient.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: 'tems.notifications',
            DetailType: 'NotificationCreated',
            Detail: JSON.stringify({
              notificationId,
              userId,
              type: NotificationType,
              priority,
              title: notification.title,
              message: notification.message,
              actionUrl: notification.actionUrl,
              createdAt: timestamp,
            }),
            EventBusName: EVENT_BUS_NAME,
          },
        ],
      })
    );

    console.log('In-app notification created:', notificationId);

    return {
      success: true,
      notificationId,
    };
  } catch (error: any) {
    console.error('Error creating in-app notification:', error);

    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Generate notification title based on type
 */
function getNotificationTitle(
  notificationType: NotificationType,
  data: Record<string, any>
): string {
  const titles: Record<NotificationType, string> = {
    [NotificationType.REGISTRATION_CONFIRMATION]: '✅ Registration Confirmed',
    [NotificationType.WAITLIST_ADDED]: '⏳ Added to Waitlist',
    [NotificationType.WAITLIST_PROMOTED]: '🎉 You Got a Spot!',
    [NotificationType.REGISTRATION_CANCELLED]: 'Registration Cancelled',
    [NotificationType.EVENT_UPDATED]: '⚠️ Event Updated',
    [NotificationType.EVENT_CANCELLED]: '❌ Event Cancelled',
    [NotificationType.EVENT_REMINDER_24H]: '⏰ Event Tomorrow',
    [NotificationType.EVENT_REMINDER_1H]: '🚀 Event Starting Soon',
  };

  return titles[notificationType];
}

/**
 * Generate notification message based on type
 */
function getNotificationMessage(
  notificationType: NotificationType,
  data: Record<string, any>
): string {
  const messages: Record<NotificationType, (data: any) => string> = {
    [NotificationType.REGISTRATION_CONFIRMATION]: (d) =>
      `You're registered for ${d.eventTitle} on ${d.eventDate}`,
    
    [NotificationType.WAITLIST_ADDED]: (d) =>
      `You're #${d.waitlistPosition} on the waitlist for ${d.eventTitle}`,
    
    [NotificationType.WAITLIST_PROMOTED]: (d) =>
      `A spot opened up for ${d.eventTitle}! Confirm within 24 hours.`,
    
    [NotificationType.REGISTRATION_CANCELLED]: (d) =>
      `Your registration for ${d.eventTitle} has been cancelled`,
    
    [NotificationType.EVENT_UPDATED]: (d) =>
      `${d.eventTitle} has been updated. Please review the changes.`,
    
    [NotificationType.EVENT_CANCELLED]: (d) =>
      `${d.eventTitle} has been cancelled. Your registration was automatically cancelled.`,
    
    [NotificationType.EVENT_REMINDER_24H]: (d) =>
      `${d.eventTitle} is tomorrow at ${d.eventTime}`,
    
    [NotificationType.EVENT_REMINDER_1H]: (d) =>
      `${d.eventTitle} starts in 1 hour at ${d.eventLocation}`,
  };

  return messages[notificationType](data);
}
