import { Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;

interface ListNotificationsRequest {
  userId: string;
  limit?: number;
  nextToken?: string;
  unreadOnly?: boolean;
}

interface Notification {
  notificationId: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  actionUrl?: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
  data?: Record<string, any>;
}

interface ListNotificationsResponse {
  success: boolean;
  notifications?: Notification[];
  nextToken?: string;
  unreadCount?: number;
  error?: string;
}

/**
 * List user notifications with pagination
 * Called from GraphQL query to display notification list
 * 
 * Uses GSI1 for efficient querying:
 * GSI1PK: USER#{userId}
 * GSI1SK: NOTIFICATION#{timestamp}#{notificationId}
 * 
 * Returns most recent notifications first
 */
export const handler = async (
  event: { arguments: ListNotificationsRequest },
  context: Context
): Promise<ListNotificationsResponse> => {
  const { userId, limit = 20, nextToken, unreadOnly = false } = event.arguments;

  console.log('Listing notifications:', { userId, limit, unreadOnly });

  try {
    const params: any = {
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
      },
      Limit: limit,
      ScanIndexForward: false, // Descending order (most recent first)
    };

    // Filter for unread only if requested
    if (unreadOnly) {
      params.FilterExpression = '#read = :false';
      params.ExpressionAttributeNames = { '#read': 'read' };
      params.ExpressionAttributeValues[':false'] = false;
    }

    // Add pagination token if provided
    if (nextToken) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
    }

    // Query notifications
    const result = await docClient.send(new QueryCommand(params));

    // Count unread notifications (separate query)
    const unreadCount = await getUnreadCount(userId);

    // Format response
    const notifications: Notification[] = (result.Items || []).map((item) => ({
      notificationId: item.notificationId,
      type: item.type,
      priority: item.priority,
      title: item.title,
      message: item.message,
      actionUrl: item.actionUrl,
      read: item.read,
      readAt: item.readAt,
      createdAt: item.createdAt,
      data: item.data,
    }));

    // Generate next token if more results available
    let responseNextToken: string | undefined;
    if (result.LastEvaluatedKey) {
      responseNextToken = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
    }

    console.log('Notifications retrieved:', {
      count: notifications.length,
      unreadCount,
      hasMore: !!responseNextToken,
    });

    return {
      success: true,
      notifications,
      nextToken: responseNextToken,
      unreadCount,
    };
  } catch (error: any) {
    console.error('Error listing notifications:', error);

    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get count of unread notifications
 */
async function getUnreadCount(userId: string): Promise<number> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        FilterExpression: '#read = :false',
        ExpressionAttributeNames: { '#read': 'read' },
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':false': false,
        },
        Select: 'COUNT',
      })
    );

    return result.Count || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}
