/**
 * Check-In Attendee Lambda Handler
 * Marks attendee as checked-in via QR code scan
 */

import { AppSyncResolverEvent, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { Registration, GraphQLRegistration, RegistrationStatus, CheckInAttendeeInput } from '../../../shared/types/registration.types';
import { getUserIdFromIdentity } from '../../../shared/types/appsync.types';
import { verifyQRCode } from '../business-logic/qr-generator';
import { toGraphQLRegistration } from './helpers';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;

/**
 * Lambda handler for checkInAttendee mutation
 */
export async function handler(
  event: AppSyncResolverEvent<{ input: CheckInAttendeeInput }>,
  context: Context
): Promise<GraphQLRegistration> {
  console.log('CheckInAttendee handler invoked', {
    requestId: context.awsRequestId,
    input: event.arguments.input,
  });

  try {
    const { registrationId, qrCodeData } = event.arguments.input;

    // 1. Get user ID (organizer or admin checking in attendee)
    const checkInBy = getUserIdFromIdentity(event.identity);
    if (!checkInBy) {
      throw new Error(JSON.stringify({
        type: 'AUTHORIZATION_ERROR',
        message: 'User not authenticated',
      }));
    }

    // 2. Verify QR code
    const verification = verifyQRCode(qrCodeData);
    if (!verification.isValid || !verification.data) {
      throw new Error(JSON.stringify({
        type: 'VALIDATION_ERROR',
        message: verification.error || 'Invalid QR code',
      }));
    }

    // 3. Verify QR code matches registration ID
    if (verification.data.registrationId !== registrationId) {
      throw new Error(JSON.stringify({
        type: 'VALIDATION_ERROR',
        message: 'QR code does not match registration',
      }));
    }

    const { userId, eventId } = verification.data;

    // 4. Get registration
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

    // 5. Check registration status
    if (registration.status === RegistrationStatus.CANCELLED) {
      throw new Error(JSON.stringify({
        type: 'BUSINESS_RULE_ERROR',
        message: 'Cannot check in cancelled registration',
      }));
    }

    if (registration.status === RegistrationStatus.WAITLISTED) {
      throw new Error(JSON.stringify({
        type: 'BUSINESS_RULE_ERROR',
        message: 'Cannot check in waitlisted user',
      }));
    }

    if (registration.status === RegistrationStatus.ATTENDED) {
      throw new Error(JSON.stringify({
        type: 'BUSINESS_RULE_ERROR',
        message: 'User already checked in',
      }));
    }

    const timestamp = new Date().toISOString();

    // 6. Update registration to ATTENDED
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `REGISTRATION#${registrationId}`,
        },
        UpdateExpression: 
          'SET #status = :status, attendedAt = :timestamp, updatedAt = :timestamp, ' +
          'GSI1SK = :gsi1sk',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': RegistrationStatus.ATTENDED,
          ':timestamp': timestamp,
          ':gsi1sk': `STATUS#ATTENDED#${timestamp}`,
        },
      })
    );

    // 7. Update EVENT# copy
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `EVENT#${eventId}`,
          SK: `REGISTRATION#${registrationId}`,
        },
        UpdateExpression: 
          'SET #status = :status, attendedAt = :timestamp, updatedAt = :timestamp',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': RegistrationStatus.ATTENDED,
          ':timestamp': timestamp,
        },
      })
    );

    console.log(`User ${userId} checked in for event ${eventId}`);

    // Return GraphQL-compatible format
    const updatedRegistration = {
      ...registration,
      status: RegistrationStatus.ATTENDED,
      attendedAt: timestamp,
      updatedAt: timestamp,
    };
    
    return toGraphQLRegistration(updatedRegistration);

  } catch (error: any) {
    console.error('Check-in error:', error);

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
