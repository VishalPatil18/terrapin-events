import { AppSyncResolverEvent, Context } from 'aws-lambda';
import { Event } from '../../../shared/types/event.types';
import { EventStatus } from '../../../shared/types/common';
import { getEvent, updateEventStatus } from '../../../shared/utils/dynamodb.utils';
import { publishEventPublished } from '../../../shared/utils/eventbridge.utils';
import {
  getUserIdFromIdentity,
  getUserGroupsFromIdentity,
} from '../../../shared/types/appsync.types';

/**
 * Lambda handler for publishEvent mutation
 * Transitions event from DRAFT or PENDING_APPROVAL to PUBLISHED
 */
export async function handler(
  event: AppSyncResolverEvent<{ id: string }>,
  context: Context
): Promise<Event> {
  console.log('PublishEvent handler invoked', {
    requestId: context.awsRequestId,
    eventId: event.arguments.id,
  });

  try {
    const eventId = event.arguments.id;

    // 1. Get user ID from AppSync identity
    const userId = getUserIdFromIdentity(event.identity);
    const userGroups = getUserGroupsFromIdentity(event.identity);

    if (!userId) {
      throw new Error(
        JSON.stringify({
          type: 'AUTHORIZATION_ERROR',
          message: 'User not authenticated',
        })
      );
    }

    // 2. Get existing event
    const existingEvent = await getEvent(eventId);

    if (!existingEvent) {
      throw new Error(
        JSON.stringify({
          type: 'NOT_FOUND_ERROR',
          message: 'Event not found',
        })
      );
    }

    // 3. Authorization check
    const isOrganizer = existingEvent.organizerId === userId;
    const isAdmin = userGroups.includes('ADMINISTRATOR') || userGroups.includes('SUPER_ADMIN');

    if (!isOrganizer && !isAdmin) {
      throw new Error(
        JSON.stringify({
          type: 'AUTHORIZATION_ERROR',
          message: 'Only event organizer or administrators can publish events',
        })
      );
    }

    // 4. Validate current status
    if (existingEvent.status === EventStatus.PUBLISHED) {
      throw new Error(
        JSON.stringify({
          type: 'BUSINESS_RULE_ERROR',
          message: 'Event is already published',
        })
      );
    }

    if (existingEvent.status === EventStatus.CANCELLED) {
      throw new Error(
        JSON.stringify({
          type: 'BUSINESS_RULE_ERROR',
          message: 'Cannot publish a cancelled event',
        })
      );
    }

    if (existingEvent.status === EventStatus.COMPLETED) {
      throw new Error(
        JSON.stringify({
          type: 'BUSINESS_RULE_ERROR',
          message: 'Cannot publish a completed event',
        })
      );
    }

    // 5. Validate event is in the future
    const now = new Date();
    const startDate = new Date(existingEvent.startDateTime);

    if (startDate <= now) {
      throw new Error(
        JSON.stringify({
          type: 'BUSINESS_RULE_ERROR',
          message: 'Cannot publish an event that has already started or passed',
        })
      );
    }

    // 6. Update event status to PUBLISHED
    const publishedEvent = await updateEventStatus(eventId, EventStatus.PUBLISHED);

    // 7. Publish domain event
    await publishEventPublished(publishedEvent);

    console.log('Event published successfully', {
      eventId: publishedEvent.id,
      title: publishedEvent.title,
      previousStatus: existingEvent.status,
      newStatus: publishedEvent.status,
    });

    return publishedEvent;
  } catch (error) {
    console.error('Error publishing event:', error);

    // Try to parse error as JSON (for validation and business rule errors)
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
