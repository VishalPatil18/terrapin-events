/**
 * Get Event Capacity Lambda Handler
 * Returns capacity information for a specific event
 */

import { AppSyncResolverEvent, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { EventCapacityInfo } from '../../../shared/types/registration.types';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;

/**
 * Lambda handler for getEventCapacity query
 * Returns current capacity, registered count, waitlist count, and available seats
 */
export async function handler(
  event: AppSyncResolverEvent<{ eventId: string }>,
  context: Context
): Promise<EventCapacityInfo> {
  console.log('GetEventCapacity handler invoked', {
    requestId: context.awsRequestId,
    eventId: event.arguments.eventId,
  });

  try {
    const { eventId } = event.arguments;

    // 1. Get event metadata from DynamoDB
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
        type: 'NOT_FOUND',
        message: `Event ${eventId} not found`,
      }));
    }

    const eventData = eventResult.Item;

    // 2. Extract capacity information
    const capacity = eventData.capacity || 0;
    const registeredCount = eventData.registeredCount || 0;
    const waitlistCount = eventData.waitlistCount || 0;

    // 3. Calculate available seats
    const availableSeats = Math.max(0, capacity - registeredCount);
    const isFull = availableSeats === 0;

    const capacityInfo: EventCapacityInfo = {
      eventId,
      capacity,
      registeredCount,
      waitlistCount,
      availableSeats,
      isFull,
    };

    console.log('Event capacity info:', capacityInfo);

    return capacityInfo;

  } catch (error: any) {
    console.error('Get event capacity error:', error);

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
