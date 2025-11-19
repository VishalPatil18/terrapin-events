/**
 * Cancel Registration Lambda Handler
 * Cancels a registration and triggers waitlist promotion
 */

import { AppSyncResolverEvent, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { PutEventsCommand, EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { Registration, GraphQLRegistration, RegistrationStatus, CancelRegistrationInput } from '../../../shared/types/registration.types';
import { getUserIdFromIdentity } from '../../../shared/types/appsync.types';
import { atomicIncrementRegistered } from '../business-logic/capacity-check';
import { removeFromWaitlist } from '../business-logic/waitlist-manager';
import { checkRateLimit } from '../business-logic/rate-limiter';
import { toGraphQLRegistration } from './helpers';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const eventBridgeClient = new EventBridgeClient({});

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME!;

/**
 * Lambda handler for cancelRegistration mutation
 */
export async function handler(
  event: AppSyncResolverEvent<{ id: string }>,
  context: Context
): Promise<GraphQLRegistration> {
  console.log('CancelRegistration handler invoked', {
    requestId: context.awsRequestId,
    registrationId: event.arguments.registrationId,
  });

  try {
    const { id: registrationId } = event.arguments;

    // 1. Get user ID from AppSync identity
    const userId = getUserIdFromIdentity(event.identity);
    if (!userId) {
      throw new Error(JSON.stringify({
        type: 'AUTHORIZATION_ERROR',
        message: 'User not authenticated',
      }));
    }

    // Get user email from identity
    const identity = event.identity as any;
    const userEmail = identity.claims?.email || identity.username;

    // 2. Check rate limit (10 cancellations per 5 minutes)
    const rateLimitCheck = await checkRateLimit(userId, 'CANCEL');
    if (!rateLimitCheck.allowed) {
      throw new Error(JSON.stringify({
        type: 'RATE_LIMIT_ERROR',
        message: `Rate limit exceeded. Try again at ${rateLimitCheck.resetAt}`,
        resetAt: rateLimitCheck.resetAt,
      }));
    }

    // 3. Get registration
    const registrationResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `REGISTRATION#${registrationId}`,
        },
      })
    );

    if (!registrationResult.Item) {
      throw new Error(JSON.stringify({
        type: 'NOT_FOUND_ERROR',
        message: 'Registration not found',
      }));
    }

    const registration = registrationResult.Item as Registration;
    const { eventId, status, waitlistPosition } = registration;

    // 4. Check if already cancelled
    if (status === RegistrationStatus.CANCELLED) {
      throw new Error(JSON.stringify({
        type: 'BUSINESS_RULE_ERROR',
        message: 'Registration is already cancelled',
      }));
    }

    // 5. Check if event has passed
    const eventResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `EVENT#${eventId}`,
          SK: 'METADATA',
        },
      })
    );

    if (eventResult.Item) {
      const eventEndTime = new Date(eventResult.Item.endDateTime);
      if (eventEndTime < new Date()) {
        throw new Error(JSON.stringify({
          type: 'BUSINESS_RULE_ERROR',
          message: 'Cannot cancel registration for past event',
        }));
      }
    }

    const timestamp = new Date().toISOString();

    // 6. Handle cancellation based on status
    if (status === RegistrationStatus.WAITLISTED) {
      // WAITLISTED USER CANCELLING - Just remove from waitlist
      
      if (waitlistPosition) {
        await removeFromWaitlist(registrationId, eventId, userId, waitlistPosition);
      }

      // Delete registration
      await docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `USER#${userId}`,
            SK: `REGISTRATION#${registrationId}`,
          },
        })
      );

      // Also delete EVENT# copy
      await docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `EVENT#${eventId}`,
            SK: `REGISTRATION#${registrationId}`,
          },
        })
      );

      console.log(`Waitlist registration ${registrationId} cancelled`);

      // Return GraphQL-compatible format
      return toGraphQLRegistration({
        ...registration,
        status: RegistrationStatus.CANCELLED,
        cancelledAt: timestamp,
        updatedAt: timestamp,
      });

    } else {
      // REGISTERED or PROMOTION_PENDING USER CANCELLING
      
      // Update registration to CANCELLED
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `USER#${userId}`,
            SK: `REGISTRATION#${registrationId}`,
          },
          UpdateExpression: 
            'SET #status = :status, cancelledAt = :timestamp, updatedAt = :timestamp, ' +
            'GSI1SK = :gsi1sk',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':status': RegistrationStatus.CANCELLED,
            ':timestamp': timestamp,
            ':gsi1sk': `STATUS#CANCELLED#${timestamp}`,
          },
        })
      );

      // Update EVENT# copy
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `EVENT#${eventId}`,
            SK: `REGISTRATION#${registrationId}`,
          },
          UpdateExpression: 
            'SET #status = :status, cancelledAt = :timestamp, updatedAt = :timestamp',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':status': RegistrationStatus.CANCELLED,
            ':timestamp': timestamp,
          },
        })
      );

      // Decrement registered count
      await atomicIncrementRegistered(eventId, -1);

      // Publish RegistrationCancelled event (triggers waitlist promotion)
      await eventBridgeClient.send(
        new PutEventsCommand({
          Entries: [{
            Source: 'tems.registrations',
            DetailType: 'RegistrationCancelled',
            Detail: JSON.stringify({
              registrationId,
              eventId,
              userId,
              userEmail,
              timestamp,
            }),
            EventBusName: EVENT_BUS_NAME,
          }],
        })
      );

      console.log(`Registration ${registrationId} cancelled, waitlist promotion triggered`);

      // Return GraphQL-compatible format
      return toGraphQLRegistration({
        ...registration,
        status: RegistrationStatus.CANCELLED,
        cancelledAt: timestamp,
        updatedAt: timestamp,
      });
    }

  } catch (error: any) {
    console.error('Cancel registration error:', error);

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
