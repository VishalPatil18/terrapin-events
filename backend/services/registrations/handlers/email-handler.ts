/**
 * Email Notification Lambda Handler
 * EventBridge handler that sends registration emails
 */

import { EventBridgeEvent } from 'aws-lambda';
import { EmailNotificationPayload } from '../../../shared/types/registration.types';
import { sendRegistrationEmail } from '../business-logic/email-service';

// Union type for all possible event detail types
type RegistrationEventDetail = 
  | RegistrationCreatedDetail
  | RegistrationCancelledDetail
  | WaitlistAddedDetail
  | WaitlistPromotedDetail;

interface RegistrationCreatedDetail {
  registrationId: string;
  eventId: string;
  eventTitle: string;
  userId: string;
  userEmail: string;
  userName: string;
  qrCode: string;
  timestamp: string;
}

interface RegistrationCancelledDetail {
  registrationId: string;
  eventId: string;
  userId: string;
  userEmail: string;
  timestamp: string;
}

interface WaitlistAddedDetail {
  registrationId: string;
  eventId: string;
  eventTitle: string;
  userId: string;
  userEmail: string;
  userName: string;
  position: number;
  timestamp: string;
}

interface WaitlistPromotedDetail {
  registrationId: string;
  eventId: string;
  userId: string;
  userEmail: string;
  userName: string;
  qrCode: string;
  promotionDeadline: string;
  timestamp: string;
}

/**
 * Lambda handler for EventBridge registration events
 */
export async function handler(
  event: EventBridgeEvent<string, RegistrationEventDetail>
) {
  console.log('Email notification handler invoked:', JSON.stringify(event, null, 2));

  try {
    const detailType = event['detail-type'];
    const detail = event.detail;

    let emailPayload: EmailNotificationPayload;

    switch (detailType) {
      case 'RegistrationCreated':
        emailPayload = {
          type: 'REGISTRATION_CONFIRMATION',
          recipientEmail: (detail as RegistrationCreatedDetail).userEmail,
          recipientName: (detail as RegistrationCreatedDetail).userName,
          eventTitle: (detail as RegistrationCreatedDetail).eventTitle,
          eventStartDateTime: (detail as RegistrationCreatedDetail).timestamp,  // Should be event start time from DB
          registrationId: detail.registrationId,
          qrCode: (detail as RegistrationCreatedDetail).qrCode,
        };
        break;

      case 'WaitlistAdded':
        emailPayload = {
          type: 'WAITLIST_ADDED',
          recipientEmail: (detail as WaitlistAddedDetail).userEmail,
          recipientName: (detail as WaitlistAddedDetail).userName,
          eventTitle: (detail as WaitlistAddedDetail).eventTitle,
          eventStartDateTime: (detail as WaitlistAddedDetail).timestamp,
          registrationId: detail.registrationId,
          waitlistPosition: (detail as WaitlistAddedDetail).position,
        };
        break;

      case 'WaitlistPromoted':
        emailPayload = {
          type: 'WAITLIST_PROMOTED',
          recipientEmail: (detail as WaitlistPromotedDetail).userEmail,
          recipientName: (detail as WaitlistPromotedDetail).userName,
          eventTitle: 'Event',  // Should fetch from DB
          eventStartDateTime: (detail as WaitlistPromotedDetail).timestamp,
          registrationId: detail.registrationId,
          qrCode: (detail as WaitlistPromotedDetail).qrCode,
          promotionDeadline: (detail as WaitlistPromotedDetail).promotionDeadline,
        };
        break;

      case 'RegistrationCancelled':
        emailPayload = {
          type: 'REGISTRATION_CANCELLED',
          recipientEmail: (detail as RegistrationCancelledDetail).userEmail,
          recipientName: 'User',  // Should fetch from DB
          eventTitle: 'Event',  // Should fetch from DB
          eventStartDateTime: (detail as RegistrationCancelledDetail).timestamp,
          registrationId: detail.registrationId,
        };
        break;

      default:
        console.warn(`Unknown detail type: ${detailType}`);
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: 'Unknown event type',
          }),
        };
    }

    // Send email
    await sendRegistrationEmail(emailPayload);

    console.log(`Email sent successfully for ${detailType}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Email sent successfully',
      }),
    };

  } catch (error: any) {
    console.error('Email notification error:', error);

    // Don't fail the event - log and continue
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to send email',
        message: error.message,
      }),
    };
  }
}
