import { Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const eventBridgeClient = new EventBridgeClient({ region: process.env.AWS_REGION || 'us-east-1' });

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME!;

interface MarkAllAsReadRequest {
  userId: string;
}

interface MarkAllAsReadResponse {
  success: boolean;
  updatedCount?: number;
  error?: string;
}

/**
 * Mark all notifications as read for a user
 * Called from GraphQL mutation when user clicks "Mark all as read"
 * 
 * Uses batch write operations for efficiency
 * Maximum 25 items per batch
 */
export async function handler(
  event: { arguments: MarkAllAsReadRequest },
  context: Context
): Promise<MarkAllAsReadResponse> {
  const { userId } = event.arguments;

  console.log('Marking all notifications as read:', { userId });

  try {
    const timestamp = new Date().toISOString();

    // Query all unread notifications
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        FilterExpression: '#read = :false',
        ExpressionAttributeNames: {
          '#read': 'read',
        },
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': 'NOTIFICATION#',
          ':false': false,
        },
      })
    );

    const unreadNotifications = result.Items || [];

    if (unreadNotifications.length === 0) {
      console.log('No unread notifications found');
      return {
        success: true,
        updatedCount: 0,
      };
    }

    // Batch update in chunks of 25 (DynamoDB limit)
    const batchSize = 25;
    let updatedCount = 0;

    for (let i = 0; i < unreadNotifications.length; i += batchSize) {
      const batch = unreadNotifications.slice(i, i + batchSize);

      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: batch.map((notification) => ({
              PutRequest: {
                Item: {
                  ...notification,
                  read: true,
                  readAt: timestamp,
                  updatedAt: timestamp,
                },
              },
            })),
          },
        })
      );

      updatedCount += batch.length;
    }

    // Publish event for real-time update (AppSync subscription)
    await eventBridgeClient.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: 'tems.notifications',
            DetailType: 'AllNotificationsRead',
            Detail: JSON.stringify({
              userId,
              count: updatedCount,
              readAt: timestamp,
            }),
            EventBusName: EVENT_BUS_NAME,
          },
        ],
      })
    );

    console.log('All notifications marked as read:', { userId, count: updatedCount });

    return {
      success: true,
      updatedCount,
    };
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);

    return {
      success: false,
      error: error.message,
    };
  }
}
