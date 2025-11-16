import { AppSyncResolverEvent, Context } from 'aws-lambda';
import { UpdateEventInput, Event } from '../../../shared/types/event.types';
import {
  UpdateEventSchema,
  validateInput,
  canEditEvent,
  canReduceCapacity,
} from '../validators/event.validator';
import {
  getEvent,
  updateEvent,
  checkVenueConflict,
  createVenueBooking,
} from '../../../shared/utils/dynamodb.utils';
import {
  publishEventUpdated,
  publishCapacityUpdated,
} from '../../../shared/utils/eventbridge.utils';
import {
  getUserIdFromIdentity,
  getUserGroupsFromIdentity,
} from '../../../shared/types/appsync.types';

interface UpdateEventArgs {
  id: string;
  input: UpdateEventInput;
}

/**
 * Lambda handler for updateEvent mutation
 * Updates an existing event with validation and business rule checks
 */
export async function handler(
  event: AppSyncResolverEvent<UpdateEventArgs>,
  context: Context
): Promise<Event> {
  console.log('UpdateEvent handler invoked', {
    requestId: context.awsRequestId,
    eventId: event.arguments.id,
    input: event.arguments.input,
  });

  try {
    // 1. Validate input
    const validationResult = validateInput(UpdateEventSchema, event.arguments.input);

    if (!validationResult.success) {
      throw new Error(
        JSON.stringify({
          type: 'VALIDATION_ERROR',
          errors: validationResult.errors,
        })
      );
    }

    const input: UpdateEventInput = validationResult.data;
    const eventId = event.arguments.id;

    // 2. Get current event
    const currentEvent = await getEvent(eventId);

    if (!currentEvent) {
      throw new Error(
        JSON.stringify({
          type: 'NOT_FOUND_ERROR',
          message: `Event with ID ${eventId} not found`,
        })
      );
    }

    // 3. Check authorization - only organizer or admin can update
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
          message: 'You do not have permission to update this event',
        })
      );
    }

    // 4. Check if event can be edited
    const canEdit = canEditEvent(
      currentEvent.status,
      currentEvent.startDateTime
    );

    if (!canEdit.valid) {
      throw new Error(
        JSON.stringify({
          type: 'BUSINESS_RULE_ERROR',
          message: canEdit.message,
        })
      );
    }

    // 5. Validate capacity changes
    if (input.capacity !== undefined && input.capacity !== currentEvent.capacity) {
      const canReduce = canReduceCapacity(
        currentEvent.capacity,
        input.capacity,
        currentEvent.registeredCount
      );

      if (!canReduce.valid) {
        throw new Error(
          JSON.stringify({
            type: 'BUSINESS_RULE_ERROR',
            message: canReduce.message,
          })
        );
      }
    }

    // 6. Check for venue conflicts if location is being changed
    if (
      input.location &&
      input.location.building &&
      input.location.room &&
      (input.location.building !== currentEvent.location.building ||
        input.location.room !== currentEvent.location.room ||
        input.startDateTime ||
        input.endDateTime)
    ) {
      const startTime = input.startDateTime || currentEvent.startDateTime;
      const endTime = input.endDateTime || currentEvent.endDateTime;

      const hasConflict = await checkVenueConflict(
        input.location.building,
        input.location.room,
        startTime,
        endTime,
        eventId // Exclude current event from conflict check
      );

      if (hasConflict) {
        throw new Error(
          JSON.stringify({
            type: 'BUSINESS_RULE_ERROR',
            message: `Venue ${input.location.building} ${input.location.room} is not available during the requested time`,
          })
        );
      }
    }

    // 7. Update event
    const updatedEvent = await updateEvent(
      eventId,
      input,
      currentEvent.version
    );

    // 8. Update venue booking if location or time changed
    if (
      input.location ||
      input.startDateTime ||
      input.endDateTime
    ) {
      const location = input.location || currentEvent.location;
      const startTime = input.startDateTime || currentEvent.startDateTime;
      const endTime = input.endDateTime || currentEvent.endDateTime;

      if (location.building && location.room) {
        await createVenueBooking(
          eventId,
          location.building,
          location.room,
          startTime,
          endTime
        );
      }
    }

    // 9. Publish domain events
    await publishEventUpdated(updatedEvent, input);

    // Publish capacity updated event if capacity changed
    if (input.capacity !== undefined && input.capacity !== currentEvent.capacity) {
      await publishCapacityUpdated(
        eventId,
        currentEvent.capacity,
        input.capacity,
        currentEvent.registeredCount
      );
    }

    console.log('Event updated successfully', {
      eventId: updatedEvent.id,
      changes: Object.keys(input),
    });

    return updatedEvent;
  } catch (error) {
    console.error('Error updating event:', error);

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
