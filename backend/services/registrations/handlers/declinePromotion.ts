/**
 * Decline Promotion Lambda Handler
 * Allows user to decline their promotion from waitlist
 * This will promote the next person in the waitlist
 */

import { AppSyncResolverEvent, Context } from 'aws-lambda';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { PutEventsCommand, EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { marshall } from '@aws-sdk/util-dynamodb';
import { Registration, RegistrationStatus } from '../../../shared/types/registration.types';
import { getUserIdFromIdentity } from '../../../shared/types/appsync.types';
import { promoteFromWaitlist } from '../business-logic/waitlist-manager';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const eventBridgeClient = new EventBridgeClient({});

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME!;

/**
 * Lambda handler for declinePromotion mutation
 * Cancels the registration and promotes next person from waitlist
 */
export async function handler(
  event: AppSyncResolverEvent<{ id: string }>,
  context: Context
): Promise<Registration> {
  console.log('DeclinePromotion handler invoked', {
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
    const timestamp = new Date().toISOString();

    // 2. Get registration
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

    // 3. Verify registration belongs to user
    if (registration.userId !== userId) {
      throw new Error(JSON.stringify({
        type: 'AUTHORIZATION_ERROR',
        message: 'Not authorized to decline this promotion',
      }));
    }

    // 4. Verify status is PROMOTION_PENDING
    if (registration.status !== RegistrationStatus.PROMOTION_PENDING) {
      throw new Error(JSON.stringify({
        type: 'INVALID_STATUS',
        message: `Cannot decline promotion for registration with status: ${registration.status}`,
      }));
    }

    const eventId = registration.eventId;

    // 5. Update registration status to CANCELLED
    await client.send(
      new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: marshall({
          PK: `USER#${userId}`,
          SK: `REGISTRATION#${registrationId}`,
        }),
        UpdateExpression:
          'SET #status = :status, updatedAt = :timestamp ' +
          'REMOVE promotionDeadline',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: marshall({
          ':status': RegistrationStatus.CANCELLED,
          ':timestamp': timestamp,
        }),
      })
    );

    // 6. Promote next person from waitlist
    try {
      await promoteFromWaitlist(eventId);
      console.log(`Promoted next person from waitlist for event ${eventId}`);
    } catch (error) {
      console.error('Error promoting from waitlist:', error);
      // Continue even if promotion fails - user's decline is still processed
    }

    // 7. Publish PromotionDeclined event
    await eventBridgeClient.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: 'tems.registrations',
            DetailType: 'PromotionDeclined',
            Detail: JSON.stringify({
              registrationId,
              eventId,
              userId,
              timestamp,
            }),
            EventBusName: EVENT_BUS_NAME,
          },
        ],
      })
    );

    console.log(`Promotion declined for registration ${registrationId}`);

    // 8. Return updated registration
    const updatedRegistration: Registration = {
      ...registration,
      status: RegistrationStatus.CANCELLED,
      updatedAt: timestamp,
      promotionDeadline: undefined, // Remove deadline
    };

    return updatedRegistration;

  } catch (error: any) {
    console.error('Decline promotion error:', error);

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
