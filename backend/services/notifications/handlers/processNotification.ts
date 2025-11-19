import { EventBridgeEvent, Context } from 'aws-lambda';
import { handler as sendEmailHandler } from './sendEmail';
import { handler as createInAppNotificationHandler } from './createInAppNotification';
import preferencesManager from '../lib/preferences/preferencesManager';
import doNotDisturbChecker from '../lib/preferences/doNotDisturbChecker';
import {
  NotificationEvent,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from '../types/notification.types';

/**
 * Main notification processor - orchestrates notification sending
 * Triggered by EventBridge events from registration and event services
 * 
 * Flow:
 * 1. Receive domain event from EventBridge
 * 2. Determine notification type and recipients
 * 3. Check user preferences
 * 4. Check Do Not Disturb hours
 * 5. Send via appropriate channels (email, in-app)
 * 6. Track delivery status
 */
export const handler = async (
  event: EventBridgeEvent<string, NotificationEvent>,
  context: Context
): Promise<void> => {
  console.log('Processing notification event:', JSON.stringify(event, null, 2));

  const { detail, 'detail-type': detailType } = event;
  
  try {
    // Map EventBridge detail-type to NotificationType
    const notificationType = mapEventToNotificationType(detailType);
    
    if (!notificationType) {
      console.warn(`Unknown event type: ${detailType}`);
      return;
    }

    // Extract recipients from event detail
    const recipients = extractRecipients(detail, notificationType);
    
    if (!recipients || recipients.length === 0) {
      console.warn('No recipients found for notification');
      return;
    }

    // Process each recipient
    await Promise.allSettled(
      recipients.map(async (recipient) => {
        try {
          // Get user preferences
          const preferences = await preferencesManager.getPreferences(recipient.userId);
          
          // Check if user wants this notification type
          if (!preferences.enabledTypes[notificationType]) {
            console.log(`User ${recipient.userId} has disabled ${notificationType} notifications`);
            return;
          }

          // Determine priority
          const priority = getNotificationPriority(notificationType);

          // Check Do Not Disturb hours (skip for high priority)
          if (priority !== NotificationPriority.HIGH) {
            const dndCheck = doNotDisturbChecker.isInDoNotDisturbPeriod(
              preferences
            );
            
            if (dndCheck.isInDND) {
              console.log(`User ${recipient.userId} is in DND period, scheduling for ${dndCheck.nextAvailableTime}`);
              // TODO: Schedule for later (implement with EventBridge scheduler)
              return;
            }
          }

          // Prepare notification data
          const notificationData = prepareNotificationData(
            notificationType,
            detail,
            recipient
          );

          // Send via enabled channels
          const sendPromises: Promise<any>[] = [];

          // Email notification
          if (preferences.emailEnabled) {
            sendPromises.push(
              sendEmailHandler(
                {
                  userId: recipient.userId,
                  email: recipient.email,
                  notificationType,
                  priority,
                  data: notificationData,
                  metadata: {
                    eventId: detail.eventId,
                    requestId: context.awsRequestId,
                  },
                  attempt: 1,
                },
                context
              )
            );
          }

          // In-app notification
          if (preferences.inAppEnabled) {
            sendPromises.push(
              createInAppNotificationHandler(
                {
                  userId: recipient.userId,
                  type: notificationType, // 👈 must be `type`, not `notificationType`
                  priority,
                  data: notificationData,
                  metadata: {
                    eventId: detail.eventId,
                    requestId: context.awsRequestId,
                  },
                },
                context
              )
            );
          }

          await Promise.allSettled(sendPromises);
        } catch (error) {
          console.error(`Error processing notification for ${recipient.userId}:`, error);
          // Continue processing other recipients
        }
      })
    );

    console.log('Notification processing complete');
  } catch (error) {
    console.error('Error in notification processor:', error);
    throw error;
  }
};

/**
 * Map EventBridge detail-type to NotificationType
 */
function mapEventToNotificationType(detailType: string): NotificationType | null {
  const mapping: Record<string, NotificationType> = {
    UserRegistered: NotificationType.REGISTRATION_CONFIRMATION,
    UserWaitlisted: NotificationType.WAITLIST_ADDED,
    WaitlistPromoted: NotificationType.WAITLIST_PROMOTED,
    RegistrationCancelled: NotificationType.REGISTRATION_CANCELLED,
    EventUpdated: NotificationType.EVENT_UPDATED,
    EventCancelled: NotificationType.EVENT_CANCELLED,
    EventReminder24h: NotificationType.EVENT_REMINDER_24H,
    EventReminder1h: NotificationType.EVENT_REMINDER_1H,
  };

  return mapping[detailType] || null;
}

/**
 * Extract recipients from event detail
 */
function extractRecipients(
  detail: NotificationEvent,
  notificationType: NotificationType
): Array<{ userId: string; email: string; timezone?: string }> {
  const recipients: Array<{ userId: string; email: string; timezone?: string }> = [];

  // For user-specific events
  if ('userId' in detail && 'userEmail' in detail) {
    recipients.push({
      userId: detail.userId,
      email: detail.userEmail,
      timezone: detail.userTimezone,
    });
  }

  // For event-wide notifications (updates, cancellations)
  if ('registeredUsers' in detail && Array.isArray(detail.registeredUsers)) {
    recipients.push(...detail.registeredUsers);
  }

  return recipients;
}

/**
 * Get preference key for notification type
 */
function getPreferenceKey(notificationType: NotificationType): string {
  const mapping: Record<NotificationType, string> = {
    [NotificationType.REGISTRATION_CONFIRMATION]: 'registrations',
    [NotificationType.WAITLIST_ADDED]: 'waitlist',
    [NotificationType.WAITLIST_PROMOTED]: 'waitlist',
    [NotificationType.REGISTRATION_CANCELLED]: 'registrations',
    [NotificationType.EVENT_UPDATED]: 'eventUpdates',
    [NotificationType.EVENT_CANCELLED]: 'eventUpdates',
    [NotificationType.EVENT_REMINDER_24H]: 'reminders',
    [NotificationType.EVENT_REMINDER_1H]: 'reminders',
  };

  return mapping[notificationType];
}

/**
 * Get notification priority
 */
function getNotificationPriority(notificationType: NotificationType): NotificationPriority {
  const highPriority = [
    NotificationType.WAITLIST_PROMOTED,
    NotificationType.EVENT_CANCELLED,
    NotificationType.EVENT_REMINDER_1H,
  ];

  const mediumPriority = [
    NotificationType.REGISTRATION_CONFIRMATION,
    NotificationType.EVENT_UPDATED,
    NotificationType.EVENT_REMINDER_24H,
  ];

  if (highPriority.includes(notificationType)) {
    return NotificationPriority.HIGH;
  }
  
  if (mediumPriority.includes(notificationType)) {
    return NotificationPriority.MEDIUM;
  }

  return NotificationPriority.LOW;
}

/**
 * Prepare notification data for templates
 */
function prepareNotificationData(
  notificationType: NotificationType,
  detail: NotificationEvent,
  recipient: { userId: string; email: string; timezone?: string }
): Record<string, any> {
  const baseData = {
    userName: detail.userName || 'there',
    eventTitle: detail.eventTitle,
    eventDate: detail.eventDate,
    eventTime: detail.eventTime,
    eventLocation: detail.eventLocation,
    eventUrl: `${process.env.FRONTEND_URL}/events/${detail.eventId}`,
    preferencesUrl: `${process.env.FRONTEND_URL}/settings/notifications`,
    unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe?userId=${recipient.userId}`,
    supportUrl: `${process.env.FRONTEND_URL}/support`,
    browseEventsUrl: `${process.env.FRONTEND_URL}/events`,
    currentYear: new Date().getFullYear(),
  };

  // Add type-specific data
  switch (notificationType) {
    case NotificationType.REGISTRATION_CONFIRMATION:
      return {
        ...baseData,
        ticketNumber: detail.ticketNumber,
        registrationId: detail.registrationId,
        qrCodeUrl: detail.qrCodeUrl,
      };

    case NotificationType.WAITLIST_ADDED:
      return {
        ...baseData,
        waitlistPosition: detail.waitlistPosition,
        waitlistId: detail.registrationId,
        createdAt: detail.timestamp,
      };

    case NotificationType.WAITLIST_PROMOTED:
      return {
        ...baseData,
        ticketNumber: detail.ticketNumber,
        registrationId: detail.registrationId,
        qrCodeUrl: detail.qrCodeUrl,
        expiresAt: detail.expiresAt,
        confirmUrl: `${process.env.FRONTEND_URL}/registrations/${detail.registrationId}/confirm`,
        declineUrl: `${process.env.FRONTEND_URL}/registrations/${detail.registrationId}/decline`,
      };

    case NotificationType.REGISTRATION_CANCELLED:
      return {
        ...baseData,
        registrationId: detail.registrationId,
        cancelledAt: detail.timestamp,
        cancelledByUser: detail.cancelledByUser,
        cancellationReason: detail.cancellationReason,
        waitlistPromoted: detail.waitlistPromoted,
        canReregister: detail.canReregister,
        feedbackUrl: `${process.env.FRONTEND_URL}/feedback?eventId=${detail.eventId}`,
      };

    case NotificationType.EVENT_UPDATED:
      return {
        ...baseData,
        changes: detail.changes,
        updateMessage: detail.updateMessage,
        titleChanged: detail.changes?.some((c: any) => c.field === 'title'),
        dateChanged: detail.changes?.some((c: any) => c.field === 'date'),
        timeChanged: detail.changes?.some((c: any) => c.field === 'time'),
        locationChanged: detail.changes?.some((c: any) => c.field === 'location'),
        qrCodeUrl: detail.qrCodeUrl,
        cancelUrl: `${process.env.FRONTEND_URL}/registrations/${detail.registrationId}/cancel`,
      };

    case NotificationType.EVENT_CANCELLED:
      return {
        ...baseData,
        cancelledAt: detail.timestamp,
        cancellationReason: detail.cancellationReason,
        organizerMessage: detail.organizerMessage,
        rescheduled: detail.rescheduled,
        autoReregister: detail.autoReregister,
        newEventDate: detail.newEventDate,
        newEventTime: detail.newEventTime,
        newEventUrl: detail.newEventUrl,
      };

    case NotificationType.EVENT_REMINDER_24H:
    case NotificationType.EVENT_REMINDER_1H:
      return {
        ...baseData,
        ticketNumber: detail.ticketNumber,
        qrCodeUrl: detail.qrCodeUrl,
        eventRoom: detail.eventRoom,
        requirements: detail.requirements,
        parkingInfo: detail.parkingInfo,
        locationMapUrl: detail.locationMapUrl,
        addToCalendarUrl: `${process.env.FRONTEND_URL}/events/${detail.eventId}/calendar`,
        cancelUrl: `${process.env.FRONTEND_URL}/registrations/${detail.registrationId}/cancel`,
        organizerPhone: detail.organizerPhone,
        organizerEmail: detail.organizerEmail,
        eventDescription: detail.eventDescription,
      };

    default:
      return baseData;
  }
}
