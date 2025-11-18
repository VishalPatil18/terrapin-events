/**
 * Accept Promotion Lambda Handler
 * Allows user to accept their promotion from waitlist to registered
 * User has 24 hours from promotion to accept, otherwise spot goes to next person
 */

import { AppSyncResolverEvent, Context } from 'aws-lambda';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { PutEventsCommand, EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { marshall } from '@aws-sdk/util-dynamodb';
import { Registration, GraphQLRegistration, RegistrationStatus } from '../../../shared/types/registration.types';
import { getUserIdFromIdentity } from '../../../shared/types/appsync.types';
import { toGraphQLRegistration } from './helpers';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const eventBridgeClient = new EventBridgeClient({});

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME!;

/**
 * Lambda handler for acceptPromotion mutation
 * Changes registration status from PROMOTION_PENDING to REGISTERED
 */
export async function handler(
  event: AppSyncResolverEvent<{ id: string }>,
  context: Context
): Promise<GraphQLRegistration> {
  console.log('AcceptPromotion handler invoked', {
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
        message: 'Not authorized to accept this promotion',
      }));
    }

    // 4. Verify status is PROMOTION_PENDING
    if (registration.status !== RegistrationStatus.PROMOTION_PENDING) {
      throw new Error(JSON.stringify({
        type: 'INVALID_STATUS',
        message: `Cannot accept promotion for registration with status: ${registration.status}`,
      }));
    }

    // 5. Check if deadline has passed
    if (registration.promotionDeadline) {
      const deadline = new Date(registration.promotionDeadline);
      const now = new Date();
      
      if (now > deadline) {
        throw new Error(JSON.stringify({
          type: 'PROMOTION_EXPIRED',
          message: 'Promotion deadline has passed. The spot has been offered to the next person in line.',
        }));
      }
    }

    const eventId = registration.eventId;

    // 6. Update registration status to REGISTERED
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
          ':status': RegistrationStatus.REGISTERED,
          ':timestamp': timestamp,
        }),
      })
    );

    // 7. Publish PromotionAccepted event
    await eventBridgeClient.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: 'tems.registrations',
            DetailType: 'PromotionAccepted',
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

    console.log(`Promotion accepted for registration ${registrationId}`);

    // 8. Return updated registration in GraphQL format
    return toGraphQLRegistration({
      ...registration,
      status: RegistrationStatus.REGISTERED,
      updatedAt: timestamp,
      promotionDeadline: undefined,
    });

  } catch (error: any) {
    console.error('Accept promotion error:', error);

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
