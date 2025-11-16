/**
 * Register for Event Lambda Handler
 * Creates a registration with capacity management, QR code generation, and waitlist support
 */

import { AppSyncResolverEvent, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { PutEventsCommand, EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { nanoid } from 'nanoid';
import { Registration, RegistrationStatus, RegisterForEventInput } from '../../../shared/types/registration.types';
import { getUserIdFromIdentity } from '../../../shared/types/appsync.types';
import { checkEventCapacity, isUserRegistered, atomicIncrementRegistered, getNextWaitlistPosition } from '../business-logic/capacity-check';
import { generateQRCode } from '../business-logic/qr-generator';
import { addToWaitlist } from '../business-logic/waitlist-manager';
import { checkRateLimit } from '../business-logic/rate-limiter';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const eventBridgeClient = new EventBridgeClient({});

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME!;

/**
 * Lambda handler for registerForEvent mutation
 */
export async function handler(
  event: AppSyncResolverEvent<{ input: RegisterForEventInput }>,
  context: Context
): Promise<Registration> {
  console.log('RegisterForEvent handler invoked', {
    requestId: context.awsRequestId,
    input: event.arguments.input,
  });

  try {
    const { eventId } = event.arguments.input;

    // 1. Get user ID from AppSync identity
    const userId = getUserIdFromIdentity(event.identity);
    if (!userId) {
      throw new Error(JSON.stringify({
        type: 'AUTHORIZATION_ERROR',
        message: 'User not authenticated',
      }));
    }

    // Get user email and name from identity
    const identity = event.identity as any;
    const userEmail = identity.claims?.email || identity.username;
    const userName = identity.claims?.name || identity.claims?.['cognito:username'] || 'User';

    // 2. Check rate limit (5 registrations per minute)
    const rateLimitCheck = await checkRateLimit(userId, 'REGISTER');
    if (!rateLimitCheck.allowed) {
      throw new Error(JSON.stringify({
        type: 'RATE_LIMIT_ERROR',
        message: `Rate limit exceeded. Try again at ${rateLimitCheck.resetAt}`,
        resetAt: rateLimitCheck.resetAt,
      }));
    }

    // 3. Check if event exists and get details
    const eventResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `EVENT#${eventId}`,
          SK: 'METADATA',
        },
      })
    );

    if (!eventResult.Item) {
      throw new Error(JSON.stringify({
        type: 'NOT_FOUND_ERROR',
        message: 'Event not found',
      }));
    }

    const eventData = eventResult.Item;
    const eventTitle = eventData.title;

    // 4. Check if event is cancelled or in past
    if (eventData.status === 'CANCELLED') {
      throw new Error(JSON.stringify({
        type: 'BUSINESS_RULE_ERROR',
        message: 'Cannot register for cancelled event',
      }));
    }

    const eventStartTime = new Date(eventData.startDateTime);
    if (eventStartTime < new Date()) {
      throw new Error(JSON.stringify({
        type: 'BUSINESS_RULE_ERROR',
        message: 'Cannot register for past event',
      }));
    }

    // 5. Check if user is already registered
    const alreadyRegistered = await isUserRegistered(userId, eventId);
    if (alreadyRegistered) {
      throw new Error(JSON.stringify({
        type: 'BUSINESS_RULE_ERROR',
        message: 'User is already registered for this event',
      }));
    }

    // 6. Check capacity
    const capacityCheck = await checkEventCapacity(eventId);
    
    const registrationId = `reg_${nanoid(16)}`;
    const timestamp = new Date().toISOString();

    // 7. If event has capacity, register normally
    if (capacityCheck.hasCapacity) {
      // Generate QR code
      const { qrCode, qrCodeData } = await generateQRCode(registrationId, eventId, userId);

      // Create registration
      const registration: Registration = {
        // DynamoDB Keys
        PK: `USER#${userId}`,
        SK: `REGISTRATION#${registrationId}`,
        GSI1PK: `EVENT#${eventId}`,
        GSI1SK: `STATUS#REGISTERED#${timestamp}`,
        
        // Domain Fields
        id: registrationId,
        userId,
        userEmail,
        userName,
        eventId,
        eventTitle,
        status: RegistrationStatus.REGISTERED,
        qrCode,
        qrCodeData,
        registeredAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      // Save registration
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: registration,
        })
      );

      // Also save with EVENT# as PK for event-centric queries
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            ...registration,
            PK: `EVENT#${eventId}`,
            SK: `REGISTRATION#${registrationId}`,
          },
        })
      );

      // Atomically increment registered count
      await atomicIncrementRegistered(eventId, 1);

      // Publish RegistrationCreated event
      await eventBridgeClient.send(
        new PutEventsCommand({
          Entries: [{
            Source: 'tems.registrations',
            DetailType: 'RegistrationCreated',
            Detail: JSON.stringify({
              registrationId,
              eventId,
              eventTitle,
              userId,
              userEmail,
              userName,
              qrCode,
              timestamp,
            }),
            EventBusName: EVENT_BUS_NAME,
          }],
        })
      );

      console.log(`User ${userId} successfully registered for event ${eventId}`);
      return registration;

    } else {
      // 8. Event is full, add to waitlist
      const position = await getNextWaitlistPosition(eventId);

      // Create registration with WAITLISTED status
      const registration: Registration = {
        PK: `USER#${userId}`,
        SK: `REGISTRATION#${registrationId}`,
        GSI1PK: `EVENT#${eventId}`,
        GSI1SK: `STATUS#WAITLISTED#${timestamp}`,
        
        id: registrationId,
        userId,
        userEmail,
        userName,
        eventId,
        eventTitle,
        status: RegistrationStatus.WAITLISTED,
        waitlistPosition: position,
        registeredAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      // Save registration
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: registration,
        })
      );

      // Add to waitlist
      await addToWaitlist(registrationId, userId, userEmail, userName, eventId, position);

      // Publish WaitlistAdded event
      await eventBridgeClient.send(
        new PutEventsCommand({
          Entries: [{
            Source: 'tems.registrations',
            DetailType: 'WaitlistAdded',
            Detail: JSON.stringify({
              registrationId,
              eventId,
              eventTitle,
              userId,
              userEmail,
              userName,
              position,
              timestamp,
            }),
            EventBusName: EVENT_BUS_NAME,
          }],
        })
      );

      console.log(`User ${userId} added to waitlist position ${position} for event ${eventId}`);
      return registration;
    }

  } catch (error: any) {
    console.error('Register for event error:', error);

    // Parse error if it's JSON
    if (error instanceof Error) {
      try {
        const errorData = JSON.parse(error.message);
        throw new Error(JSON.stringify(errorData));
      } catch {
        // Not a JSON error, throw original
        throw error;
      }
    }

    throw error;
  }
}
