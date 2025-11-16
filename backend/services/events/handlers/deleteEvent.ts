import { AppSyncResolverEvent, Context } from 'aws-lambda';
import { Event } from '../../../shared/types/event.types';
import { canCancelEvent } from '../validators/event.validator';
import { getEvent, deleteEvent } from '../../../shared/utils/dynamodb.utils';
import { publishEventCancelled } from '../../../shared/utils/eventbridge.utils';
import { EventStatus } from '../../../shared/types/common';
import {
  getUserIdFromIdentity,
  getUserGroupsFromIdentity,
} from '../../../shared/types/appsync.types';

interface DeleteEventArgs {
  id: string;
  reason?: string;
}

/**
 * Lambda handler for deleteEvent mutation
 * Soft deletes an event by setting status to CANCELLED
 */
export async function handler(
  event: AppSyncResolverEvent<DeleteEventArgs>,
  context: Context
): Promise<Event> {
  console.log('DeleteEvent handler invoked', {
    requestId: context.awsRequestId,
    eventId: event.arguments.id,
    reason: event.arguments.reason,
  });

  try {
    const eventId = event.arguments.id;
    const reason = event.arguments.reason;

    // 1. Get current event
    const currentEvent = await getEvent(eventId);

    if (!currentEvent) {
      throw new Error(
        JSON.stringify({
          type: 'NOT_FOUND_ERROR',
          message: `Event with ID ${eventId} not found`,
        })
      );
    }

    // 2. Check authorization - only organizer or admin can delete
    const userId = getUserIdFromIdentity(event.identity);
    if (!userId) {
      throw new Error(
        JSON.stringify({
          type: 'AUTHORIZATION_ERROR',
          message: 'User not authenticated',
        })
      );
    }

    // Get user roles from identity
    const userGroups = getUserGroupsFromIdentity(event.identity);
    const isAdmin =
      userGroups.includes('ADMINISTRATOR') || userGroups.includes('SUPER_ADMIN');
    const isOrganizer = currentEvent.organizerId === userId;

    if (!isOrganizer && !isAdmin) {
      throw new Error(
        JSON.stringify({
          type: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to delete this event',
        })
      );
    }

    // 3. Check if event can be cancelled
    const canCancel = canCancelEvent(
      currentEvent.status,
      currentEvent.startDateTime
    );

    if (!canCancel.valid) {
      throw new Error(
        JSON.stringify({
          type: 'BUSINESS_RULE_ERROR',
          message: canCancel.message,
        })
      );
    }

    // 4. Soft delete event (set status to CANCELLED)
    await deleteEvent(eventId);

    // 5. Create cancelled event object for return
    const cancelledEvent: Event = {
      ...currentEvent,
      status: EventStatus.CANCELLED,
      updatedAt: new Date().toISOString(),
    };

    // 6. Publish domain event
    await publishEventCancelled(cancelledEvent, reason);

    console.log('Event cancelled successfully', {
      eventId: cancelledEvent.id,
      title: cancelledEvent.title,
      registeredCount: cancelledEvent.registeredCount,
    });

    return cancelledEvent;
  } catch (error) {
    console.error('Error deleting event:', error);

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
