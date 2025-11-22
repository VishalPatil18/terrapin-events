/**
 * Waitlist Manager Business Logic
 * Manages FIFO waitlist with automatic promotion
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { PutEventsCommand, EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { RegistrationStatus, WaitlistEntry } from '../../../shared/types/registration.types';
import { atomicIncrementWaitlist, atomicIncrementRegistered } from './capacity-check';
import { generateQRCode } from './qr-generator';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const eventBridgeClient = new EventBridgeClient({});

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME!;

/**
 * Add user to waitlist
 * @param registrationId - Registration ID
 * @param userId - User ID
 * @param userEmail - User email
 * @param userName - User name
 * @param eventId - Event ID
 * @param position - Waitlist position
 */
export async function addToWaitlist(
  registrationId: string,
  userId: string,
  userEmail: string,
  userName: string,
  eventId: string,
  position: number
): Promise<WaitlistEntry> {
  try {
    const timestamp = new Date().toISOString();
    
    // Pad position with zeros for proper sorting (WAITLIST#00001)
    const paddedPosition = position.toString().padStart(5, '0');
    
    const waitlistEntry: WaitlistEntry = {
      PK: `EVENT#${eventId}`,
      SK: `WAITLIST#${paddedPosition}`,
      GSI1PK: `USER#${userId}`,
      GSI1SK: `WAITLIST#${eventId}#${paddedPosition}`,
      registrationId,
      userId,
      userEmail,
      userName,
      eventId,
      position,
      joinedAt: timestamp,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: waitlistEntry,
      })
    );

    // Also update the registration record
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `REGISTRATION#${registrationId}`,
        },
        UpdateExpression: 'SET #status = :status, waitlistPosition = :position, updatedAt = :timestamp',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': RegistrationStatus.WAITLISTED,
          ':position': position,
          ':timestamp': timestamp,
        },
      })
    );

    // Increment waitlist count
    await atomicIncrementWaitlist(eventId, 1);

    return waitlistEntry;
  } catch (error) {
    console.error('Error adding to waitlist:', error);
    throw error;
  }
}

/**
 * Promote first person from waitlist (FIFO)
 * Called when someone cancels their registration
 * @param eventId - Event ID
 */
export async function promoteFromWaitlist(eventId: string): Promise<void> {
  try {
    // Get first person on waitlist
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `EVENT#${eventId}`,
          ':sk': 'WAITLIST#',
        },
        ScanIndexForward: true,  // Ascending order (FIFO)
        Limit: 1,
      })
    );

    if (!result.Items || result.Items.length === 0) {
      console.log('No one on waitlist to promote');
      return;
    }

    const waitlistEntry = result.Items[0] as WaitlistEntry;
    const { registrationId, userId, userEmail, userName, position } = waitlistEntry;

    console.log(`Promoting user ${userId} from position ${position}`);

    // Generate QR code for promoted registration
    const { qrCode, qrCodeData } = await generateQRCode(registrationId, eventId, userId);

    // Calculate promotion deadline (24 hours from now)
    const promotionDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Update registration to PROMOTION_PENDING
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `REGISTRATION#${registrationId}`,
        },
        UpdateExpression: 
          'SET #status = :status, qrCode = :qrCode, qrCodeData = :qrCodeData, ' +
          'promotionDeadline = :deadline, REMOVE waitlistPosition SET updatedAt = :timestamp',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': RegistrationStatus.PROMOTION_PENDING,
          ':qrCode': qrCode,
          ':qrCodeData': qrCodeData,
          ':deadline': promotionDeadline,
          ':timestamp': new Date().toISOString(),
        },
      })
    );

    // Remove from waitlist (delete waitlist entry)
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `EVENT#${eventId}`,
          SK: `WAITLIST#${position.toString().padStart(5, '0')}`,
        },
      })
    );

    // Update counters
    await atomicIncrementWaitlist(eventId, -1);
    await atomicIncrementRegistered(eventId, 1);

    // Reorder remaining waitlist entries
    await reorderWaitlist(eventId);

    // Publish WaitlistPromoted event for email notification
    await eventBridgeClient.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: 'tems.registrations',
            DetailType: 'WaitlistPromoted',
            Detail: JSON.stringify({
              registrationId,
              eventId,
              userId,
              userEmail,
              userName,
              qrCode,
              promotionDeadline,
              timestamp: new Date().toISOString(),
            }),
            EventBusName: EVENT_BUS_NAME,
          },
        ],
      })
    );

    console.log(`Successfully promoted user ${userId} from waitlist`);
  } catch (error) {
    console.error('Error promoting from waitlist:', error);
    throw error;
  }
}

/**
 * Reorder waitlist positions after someone is promoted
 * Ensures consecutive positions without gaps
 * @param eventId - Event ID
 */
async function reorderWaitlist(eventId: string): Promise<void> {
  try {
    // Get all waitlist entries
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `EVENT#${eventId}`,
          ':sk': 'WAITLIST#',
        },
        ScanIndexForward: true,  // Ascending order
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return;  // No entries to reorder
    }

    const entries = result.Items as WaitlistEntry[];

    // Update positions sequentially
    for (let i = 0; i < entries.length; i++) {
      const newPosition = i + 1;
      const entry = entries[i];
      
      if (entry.position !== newPosition) {
        // Delete old entry
        await docClient.send(
          new DeleteCommand({
            TableName: TABLE_NAME,
            Key: {
              PK: entry.PK,
              SK: entry.SK,
            },
          })
        );

        // Create new entry with updated position
        const paddedPosition = newPosition.toString().padStart(5, '0');
        const updatedEntry: WaitlistEntry = {
          ...entry,
          SK: `WAITLIST#${paddedPosition}`,
          GSI1SK: `WAITLIST#${eventId}#${paddedPosition}`,
          position: newPosition,
        };

        await docClient.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: updatedEntry,
          })
        );

        // Update registration record
        await docClient.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
              PK: `USER#${entry.userId}`,
              SK: `REGISTRATION#${entry.registrationId}`,
            },
            UpdateExpression: 'SET waitlistPosition = :position, updatedAt = :timestamp',
            ExpressionAttributeValues: {
              ':position': newPosition,
              ':timestamp': new Date().toISOString(),
            },
          })
        );
      }
    }

    console.log(`Reordered ${entries.length} waitlist entries for event ${eventId}`);
  } catch (error) {
    console.error('Error reordering waitlist:', error);
    throw error;
  }
}

/**
 * Remove user from waitlist
 * @param registrationId - Registration ID
 * @param eventId - Event ID
 * @param userId - User ID
 * @param position - Waitlist position
 */
export async function removeFromWaitlist(
  registrationId: string,
  eventId: string,
  userId: string,
  position: number
): Promise<void> {
  try {
    // Delete waitlist entry
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `EVENT#${eventId}`,
          SK: `WAITLIST#${position.toString().padStart(5, '0')}`,
        },
      })
    );

    // Decrement waitlist count
    await atomicIncrementWaitlist(eventId, -1);

    // Reorder remaining entries
    await reorderWaitlist(eventId);

    console.log(`Removed user ${userId} from waitlist position ${position}`);
  } catch (error) {
    console.error('Error removing from waitlist:', error);
    throw error;
  }
}

/**
 * Get user's position on waitlist
 * @param userId - User ID
 * @param eventId - Event ID
 * @returns Waitlist position or null if not on waitlist
 */
export async function getWaitlistPosition(
  userId: string,
  eventId: string
): Promise<number | null> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
        IndexName: 'GSI1',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': `WAITLIST#${eventId}#`,
        },
        Limit: 1,
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    return result.Items[0].position as number;
  } catch (error) {
    console.error('Error getting waitlist position:', error);
    throw error;
  }
}
