import { AppSyncResolverEvent, Context } from 'aws-lambda';
import { CreateEventInput, Event } from '../../../shared/types/event.types';
import { EventStatus } from '../../../shared/types/common';
import {
  CreateEventSchema,
  validateInput,
} from '../validators/event.validator';
import {
  generateEventId,
  putEvent,
  createVenueBooking,
  checkVenueConflict,
  createSlugLookup,
} from '../../../shared/utils/dynamodb.utils';
import { publishEventCreated } from '../../../shared/utils/eventbridge.utils';
import { getUserIdFromIdentity } from '../../../shared/types/appsync.types';
import {
  generateSlug,
  generateShareableUrl,
  generateSearchTerms,
  generateLocationPK,
  generateLocationSK,
  calculateAvailableSeats,
} from '../../../shared/utils/slug.utils';

/**
 * Lambda handler for createEvent mutation
 * Creates a new event with validation and conflict detection
 */
export async function handler(
  event: AppSyncResolverEvent<{ input: CreateEventInput }>,
  context: Context
): Promise<Event> {
  console.log('CreateEvent handler invoked', {
    requestId: context.awsRequestId,
    input: event.arguments.input,
  });

  try {
    // 1. Validate input
    const validationResult = validateInput(CreateEventSchema, event.arguments.input);

    if (!validationResult.success) {
      throw new Error(
        JSON.stringify({
          type: 'VALIDATION_ERROR',
          errors: validationResult.errors,
        })
      );
    }

    const input: CreateEventInput = validationResult.data;

    // 2. Get user ID from AppSync identity
    const userId = getUserIdFromIdentity(event.identity);
    if (!userId) {
      throw new Error(
        JSON.stringify({
          type: 'AUTHORIZATION_ERROR',
          message: 'User not authenticated',
        })
      );
    }

    // 3. Check for venue conflicts
    if (input.location.building && input.location.room) {
      const hasConflict = await checkVenueConflict(
        input.location.building,
        input.location.room || '',
        input.startDateTime,
        input.endDateTime
      );

      if (hasConflict) {
        throw new Error(
          JSON.stringify({
            type: 'BUSINESS_RULE_ERROR',
            message: `Venue ${input.location.building} ${input.location.room || ''} is not available during the requested time`,
          })
        );
      }
    }

    // 4. Create event object
    const eventId = generateEventId();
    const timestamp = new Date().toISOString();

    // Week 7: Generate search and discovery fields
    const slug = generateSlug(input.title, input.startDateTime);
    const shareableUrl = generateShareableUrl(slug);
    const searchTerms = generateSearchTerms({
      title: input.title,
      description: input.description,
      location: input.location,
      tags: input.tags || [],
    });
    const GSI3PK = generateLocationPK(input.location.building);
    const GSI3SK = generateLocationSK(input.location.room, eventId);
    const availableSeats = calculateAvailableSeats(input.capacity, 0);

    const newEvent: Event = {
      // DynamoDB keys
      PK: `EVENT#${eventId}`,
      SK: 'METADATA',
      GSI1PK: `EVENT#DATE`,
      GSI1SK: input.startDateTime,
      GSI2PK: `EVENT#CATEGORY#${input.category}`,
      GSI2SK: input.startDateTime,
      GSI3PK, // Week 7: Location-based queries
      GSI3SK, // Week 7: Location-based queries
      // Domain fields
      id: eventId,
      title: input.title,
      description: input.description,
      startDateTime: input.startDateTime,
      endDateTime: input.endDateTime,
      location: input.location,
      category: input.category,
      capacity: input.capacity,
      registeredCount: 0,
      waitlistCount: 0,
      organizerId: userId,
      status: EventStatus.DRAFT,
      tags: input.tags || [],
      imageUrl: input.imageUrl,
      version: 1,
      // Week 7: Search and discovery fields
      slug,
      shareableUrl,
      searchTerms,
      availableSeats,
      waitlistAvailable: false, // No waitlist needed when event is empty
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // 5. Save event to DynamoDB
    const savedEvent = await putEvent(newEvent);

    // 5.5. Week 7: Create slug lookup item
    if (slug) {
      await createSlugLookup(slug, eventId);
    }

    // 6. Create venue booking
    if (input.location.building && input.location.room) {
      await createVenueBooking(
        eventId,
        input.location.building,
        input.location.room,
        input.startDateTime,
        input.endDateTime
      );
    }

    // 7. Publish domain event
    await publishEventCreated(savedEvent);

    console.log('Event created successfully', {
      eventId: savedEvent.id,
      title: savedEvent.title,
    });

    return savedEvent;
  } catch (error) {
    console.error('Error creating event:', error);

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
