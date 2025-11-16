/**
 * Promote Waitlist Lambda Handler
 * EventBridge handler that promotes first person from waitlist when registration cancelled
 */

import { EventBridgeEvent } from 'aws-lambda';
import { promoteFromWaitlist } from '../business-logic/waitlist-manager';

interface RegistrationCancelledDetail {
  registrationId: string;
  eventId: string;
  userId: string;
  userEmail: string;
  timestamp: string;
}

/**
 * Lambda handler for EventBridge RegistrationCancelled events
 */
export async function handler(
  event: EventBridgeEvent<'RegistrationCancelled', RegistrationCancelledDetail>
) {
  console.log('Promote waitlist handler invoked:', JSON.stringify(event, null, 2));

  try {
    const { eventId } = event.detail;

    console.log(`Processing waitlist promotion for event: ${eventId}`);

    // Promote first person from waitlist (FIFO)
    await promoteFromWaitlist(eventId);

    console.log(`Waitlist promotion completed for event ${eventId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Waitlist promotion completed',
      }),
    };

  } catch (error: any) {
    console.error('Waitlist promotion error:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to promote from waitlist',
        message: error.message,
      }),
    };
  }
}
