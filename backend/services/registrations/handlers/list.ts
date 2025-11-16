/**
 * List My Registrations Lambda Handler
 * Returns all registrations for the authenticated user
 */

import { AppSyncResolverEvent, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Registration } from '../../../shared/types/registration.types';
import { getUserIdFromIdentity } from '../../../shared/types/appsync.types';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;

/**
 * Lambda handler for listMyRegistrations query
 */
export async function handler(
  event: AppSyncResolverEvent<{}>,
  context: Context
): Promise<Registration[]> {
  console.log('ListMyRegistrations handler invoked', {
    requestId: context.awsRequestId,
  });

  try {
    // 1. Get user ID from AppSync identity
    const userId = getUserIdFromIdentity(event.identity);
    if (!userId) {
      throw new Error(JSON.stringify({
        type: 'AUTHORIZATION_ERROR',
        message: 'User not authenticated',
      }));
    }

    // 2. Query all registrations for user
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': 'REGISTRATION#',
        },
        ScanIndexForward: false,  // Newest first
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    const registrations = result.Items as Registration[];

    // 3. Sort by registration date (newest first)
    registrations.sort((a, b) => {
      return new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime();
    });

    console.log(`Found ${registrations.length} registrations for user ${userId}`);

    return registrations;

  } catch (error: any) {
    console.error('List registrations error:', error);

    if (error instanceof Error) {
      try {
        const errorData = JSON.parse(error.message);
        throw new Error(JSON.stringify(errorData));
      } catch {
        throw error;
      }
    }

    throw error;
  }
}
