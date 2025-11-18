/**
 * Check User Registration Lambda Handler
 * Checks if the authenticated user is registered for a specific event
 * Returns the registration if found, null otherwise
 */

import { AppSyncResolverEvent, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Registration, RegistrationStatus } from '../../../shared/types/registration.types';
import { getUserIdFromIdentity } from '../../../shared/types/appsync.types';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;

/**
 * Lambda handler for checkUserRegistration query
 * Returns active registration (REGISTERED, WAITLISTED, or PROMOTION_PENDING) for user and event
 */
export async function handler(
  event: AppSyncResolverEvent<{ eventId: string }>,
  context: Context
): Promise<Registration | null> {
  console.log('CheckUserRegistration handler invoked', {
    requestId: context.awsRequestId,
    eventId: event.arguments.eventId,
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

    const { eventId } = event.arguments;

    // 2. Query for user's registrations for this event
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        FilterExpression: 'eventId = :eventId AND #status IN (:registered, :waitlisted, :pending)',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': 'REGISTRATION#',
          ':eventId': eventId,
          ':registered': RegistrationStatus.REGISTERED,
          ':waitlisted': RegistrationStatus.WAITLISTED,
          ':pending': RegistrationStatus.PROMOTION_PENDING,
        },
        Limit: 1,
      })
    );

    // 3. Return registration if found, null otherwise
    if (!result.Items || result.Items.length === 0) {
      console.log(`No active registration found for user ${userId} and event ${eventId}`);
      return null;
    }

    const registration = result.Items[0] as Registration;
    console.log(`Found registration ${registration.id} with status ${registration.status}`);

    return registration;

  } catch (error: any) {
    console.error('Check user registration error:', error);

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
