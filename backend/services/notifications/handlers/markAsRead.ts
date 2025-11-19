import { Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const eventBridgeClient = new EventBridgeClient({ region: process.env.AWS_REGION || 'us-east-1' });

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME!;

interface MarkAsReadRequest {
  userId: string;
  notificationId: string;
}

interface MarkAsReadResponse {
  success: boolean;
  error?: string;
}

/**
 * Mark notification as read
 * Called from GraphQL mutation when user clicks on notification
 * 
 * Updates:
 * - read: true
 * - readAt: current timestamp
 * - updatedAt: current timestamp
 */
export const handler = async (
  event: { arguments: MarkAsReadRequest },
  context: Context
): Promise<MarkAsReadResponse> {
  const { userId, notificationId } = event.arguments;

  console.log('Marking notification as read:', { userId, notificationId });

  try {
    const timestamp = new Date().toISOString();

    // Update notification in DynamoDB
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `NOTIFICATION#${notificationId}`,
        },
        UpdateExpression: 'SET #read = :true, #readAt = :timestamp, #updatedAt = :timestamp',
        ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK)',
        ExpressionAttributeNames: {
          '#read': 'read',
          '#readAt': 'readAt',
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':true': true,
          ':timestamp': timestamp,
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    // Publish event for real-time update (AppSync subscription)
    await eventBridgeClient.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: 'tems.notifications',
            DetailType: 'NotificationRead',
            Detail: JSON.stringify({
              userId,
              notificationId,
              readAt: timestamp,
            }),
            EventBusName: EVENT_BUS_NAME,
          },
        ],
      })
    );

    console.log('Notification marked as read:', { userId, notificationId });

    return { success: true };
  } catch (error: any) {
    console.error('Error marking notification as read:', error);

    if (error.name === 'ConditionalCheckFailedException') {
      return {
        success: false,
        error: 'Notification not found',
      };
    }

    return {
      success: false,
      error: error.message,
    };
  }
};
