/**
 * Capacity Check Business Logic
 * Validates event capacity and prevents race conditions using atomic operations
 */

import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { CapacityCheckResult, RegistrationStatus } from '../../../shared/types/registration.types';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;

/**
 * Check if event has available capacity
 * @param eventId - Event ID to check
 * @returns CapacityCheckResult with availability information
 */
export async function checkEventCapacity(eventId: string): Promise<CapacityCheckResult> {
  try {
    // Get event metadata
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
      throw new Error(`Event ${eventId} not found`);
    }

    const event = eventResult.Item;
    const totalCapacity = event.capacity || 0;
    const registeredCount = event.registeredCount || 0;

    const availableSlots = Math.max(0, totalCapacity - registeredCount);
    const hasCapacity = availableSlots > 0;

    return {
      hasCapacity,
      availableSlots,
      totalCapacity,
      registeredCount,
    };
  } catch (error) {
    console.error('Error checking event capacity:', error);
    throw error;
  }
}

/**
 * Check if user is already registered for an event
 * @param userId - User ID
 * @param eventId - Event ID
 * @returns true if user is already registered or on waitlist
 */
export async function isUserRegistered(userId: string, eventId: string): Promise<boolean> {
  try {
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
      })
    );

    return (result.Items?.length || 0) > 0;
  } catch (error) {
    console.error('Error checking user registration:', error);
    throw error;
  }
}

/**
 * Atomically increment registered count
 * This prevents race conditions when multiple users register simultaneously
 * @param eventId - Event ID
 * @param increment - Amount to increment (default: 1, can be negative for decrement)
 * @returns Updated registered count
 */
export async function atomicIncrementRegistered(
  eventId: string,
  increment: number = 1
): Promise<number> {
  try {
    const result = await client.send(
      new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: marshall({
          PK: `EVENT#${eventId}`,
          SK: 'METADATA',
        }),
        UpdateExpression: 'ADD registeredCount :inc SET updatedAt = :timestamp',
        ExpressionAttributeValues: marshall({
          ':inc': increment,
          ':timestamp': new Date().toISOString(),
        }),
        ReturnValues: 'ALL_NEW',
      })
    );

    if (!result.Attributes) {
      throw new Error('Failed to update registered count');
    }
    
    const updated = unmarshall(result.Attributes);
    return updated.registeredCount || 0;
  } catch (error) {
    console.error('Error incrementing registered count:', error);
    throw error;
  }
}

/**
 * Atomically increment waitlist count
 * @param eventId - Event ID
 * @param increment - Amount to increment (default: 1, can be negative for decrement)
 * @returns Updated waitlist count
 */
export async function atomicIncrementWaitlist(
  eventId: string,
  increment: number = 1
): Promise<number> {
  try {
    const result = await client.send(
      new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: marshall({
          PK: `EVENT#${eventId}`,
          SK: 'METADATA',
        }),
        UpdateExpression: 'ADD waitlistCount :inc SET updatedAt = :timestamp',
        ExpressionAttributeValues: marshall({
          ':inc': increment,
          ':timestamp': new Date().toISOString(),
        }),
        ReturnValues: 'ALL_NEW',
      })
    );

    if (!result.Attributes) {
      throw new Error('Failed to update waitlist count');
    }
    
    const updated = unmarshall(result.Attributes);
    return updated.waitlistCount || 0;
  } catch (error) {
    console.error('Error incrementing waitlist count:', error);
    throw error;
  }
}

/**
 * Get current waitlist position for next registrant
 * @param eventId - Event ID
 * @returns Next available waitlist position
 */
export async function getNextWaitlistPosition(eventId: string): Promise<number> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `EVENT#${eventId}`,
          ':sk': 'WAITLIST#',
        },
        ScanIndexForward: false,  // Descending order
        Limit: 1,
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return 1;  // First position
    }

    // Extract position from SK: WAITLIST#00001
    const lastSK = result.Items[0].SK;
    const lastPosition = parseInt(lastSK.split('#')[1], 10);
    return lastPosition + 1;
  } catch (error) {
    console.error('Error getting next waitlist position:', error);
    throw error;
  }
}
