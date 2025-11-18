/**
 * Get Registration Lambda Handler
 * Returns a single registration by ID for the authenticated user
 */

import { AppSyncResolverEvent, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { Registration, GraphQLRegistration } from '../../../shared/types/registration.types';
import { getUserIdFromIdentity } from '../../../shared/types/appsync.types';
import { toGraphQLRegistration } from './helpers';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;

/**
 * Lambda handler for getRegistration query
 */
export async function handler(
  event: AppSyncResolverEvent<{ id: string }>,
  context: Context
): Promise<GraphQLRegistration | null> {
  console.log('GetRegistration handler invoked', {
    requestId: context.awsRequestId,
    registrationId: event.arguments.id,
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

    const registrationId = event.arguments.id;

    // 2. Get registration from DynamoDB
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `REGISTRATION#${registrationId}`,
        },
      })
    );

    if (!result.Item) {
      throw new Error(JSON.stringify({
        type: 'NOT_FOUND',
        message: `Registration ${registrationId} not found`,
      }));
    }

    const registration = result.Item as Registration;

    // 3. Verify the registration belongs to the authenticated user
    if (registration.userId !== userId) {
      throw new Error(JSON.stringify({
        type: 'AUTHORIZATION_ERROR',
        message: 'Not authorized to access this registration',
      }));
    }

    console.log(`Found registration ${registrationId} for user ${userId}`);

    // Return GraphQL-compatible format
    return toGraphQLRegistration(registration);

  } catch (error: any) {
    console.error('Get registration error:', error);

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
