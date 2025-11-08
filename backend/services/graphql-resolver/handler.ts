import { AppSyncResolverHandler, AppSyncResolverEvent, AppSyncIdentityCognito } from 'aws-lambda';
import { db } from '../../shared/utils/dynamodb';
import { logger } from '../../shared/utils/logger';

// Define the arguments types for different operations
interface CreateEventArgs {
  input: any;
}

interface UpdateEventArgs {
  id: string;
  input: any;
}

interface RegisterArgs {
  eventId: string;
}

interface SearchArgs {
  query: string;
}

type ResolverArgs = CreateEventArgs | UpdateEventArgs | RegisterArgs | SearchArgs | Record<string, never>;

export const handler: AppSyncResolverHandler<ResolverArgs, any> = async (event) => {
  logger.info('GraphQL Resolver invoked', {
    fieldName: event.info.fieldName,
    parentTypeName: event.info.parentTypeName,
  });

  const { fieldName } = event.info;
  const args = event.arguments;

  try {
    switch (fieldName) {
      case 'getCurrentUser':
        return getCurrentUser(event);
      
      case 'createEvent':
        return createEvent((args as CreateEventArgs).input, event);
      
      case 'updateEvent':
        return updateEvent(
          (args as UpdateEventArgs).id, 
          (args as UpdateEventArgs).input, 
          event
        );
      
      case 'registerForEvent':
        return registerForEvent((args as RegisterArgs).eventId, event);
      
      case 'searchEvents':
        return searchEvents((args as SearchArgs).query);
      
      default:
        throw new Error(`Unknown field: ${fieldName}`);
    }
  } catch (error) {
    logger.error('Resolver error', error, { fieldName });
    throw error;
  }
};

async function getCurrentUser(event: AppSyncResolverEvent<ResolverArgs>) {
  if (!event.identity) {
    throw new Error('Unauthorized: No identity found');
  }
  
  const identity = event.identity as AppSyncIdentityCognito;
  const userId = identity.sub;
  
  const user = await db.get(`USER#${userId}`, 'METADATA');
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return user;
}

async function createEvent(input: any, event: AppSyncResolverEvent<ResolverArgs>) {
  if (!event.identity) {
    throw new Error('Unauthorized: No identity found');
  }
  
  const identity = event.identity as AppSyncIdentityCognito;
  const organizerId = identity.sub;
  const eventId = `evt-${Date.now()}`;
  const timestamp = new Date().toISOString();
  
  const eventData = {
    PK: `EVENT#${eventId}`,
    SK: 'METADATA',
    GSI1PK: `CATEGORY#${input.category}`,
    GSI1SK: `DATE#${input.startDateTime}`,
    GSI2PK: `ORGANIZER#${organizerId}`,
    GSI2SK: `EVENT#${eventId}`,
    id: eventId,
    eventId,
    ...input,
    organizerId,
    registeredCount: 0,
    waitlistCount: 0,
    status: 'DRAFT',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  
  await db.put(eventData);
  
  return eventData;
}

async function updateEvent(id: string, input: any, event: AppSyncResolverEvent<ResolverArgs>) {
  if (!event.identity) {
    throw new Error('Unauthorized: No identity found');
  }
  
  const identity = event.identity as AppSyncIdentityCognito;
  const userId = identity.sub;
  
  // Get the existing event
  const existingEvent = await db.get(`EVENT#${id}`, 'METADATA');
  
  if (!existingEvent) {
    throw new Error('Event not found');
  }
  
  // Check authorization
  if (existingEvent.organizerId !== userId) {
    throw new Error('Not authorized to update this event');
  }
  
  // Update the event
  const updates: any = {};
  
  if (input.title) updates.title = input.title;
  if (input.description) updates.description = input.description;
  if (input.startDateTime) updates.startDateTime = input.startDateTime;
  if (input.endDateTime) updates.endDateTime = input.endDateTime;
  if (input.location) updates.location = input.location;
  if (input.category) updates.category = input.category;
  if (input.capacity) updates.capacity = input.capacity;
  if (input.tags) updates.tags = input.tags;
  if (input.imageUrl) updates.imageUrl = input.imageUrl;
  if (input.status) updates.status = input.status;
  
  const updatedEvent = await db.update(`EVENT#${id}`, 'METADATA', updates);
  
  return updatedEvent;
}

async function registerForEvent(eventId: string, event: AppSyncResolverEvent<ResolverArgs>) {
  if (!event.identity) {
    throw new Error('Unauthorized: No identity found');
  }
  
  const identity = event.identity as AppSyncIdentityCognito;
  const userId = identity.sub;
  const registrationId = `reg-${Date.now()}`;
  const timestamp = new Date().toISOString();
  
  // Get the event
  const eventData = await db.get(`EVENT#${eventId}`, 'METADATA');
  
  if (!eventData) {
    throw new Error('Event not found');
  }
  
  // Check if already registered
  const existingRegistration = await db.get(
    `USER#${userId}`,
    `REGISTRATION#${eventId}`
  );
  
  if (existingRegistration) {
    throw new Error('Already registered for this event');
  }
  
  // Determine status based on capacity
  const status = eventData.registeredCount < eventData.capacity 
    ? 'REGISTERED' 
    : 'WAITLISTED';
  
  const waitlistPosition = status === 'WAITLISTED' 
    ? eventData.waitlistCount + 1 
    : undefined;
  
  // Create registration
  const registration = {
    PK: `USER#${userId}`,
    SK: `REGISTRATION#${eventId}`,
    GSI1PK: `EVENT#${eventId}`,
    GSI1SK: `REGISTRATION#${registrationId}`,
    id: registrationId,
    registrationId,
    userId,
    eventId,
    status,
    qrCode: `QR-${registrationId}`,
    waitlistPosition,
    registeredAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  
  await db.put(registration);
  
  // Update event counts
  const countUpdates: any = {};
  
  if (status === 'REGISTERED') {
    countUpdates.registeredCount = eventData.registeredCount + 1;
  } else {
    countUpdates.waitlistCount = eventData.waitlistCount + 1;
  }
  
  await db.update(`EVENT#${eventId}`, 'METADATA', countUpdates);
  
  return registration;
}

async function searchEvents(query: string) {
  // Simple search implementation - in production, use OpenSearch or similar
  const allEvents = await db.query({
    pk: 'EVENT#',
    sk: { begins_with: '' },
  });
  
  const searchTerms = query.toLowerCase().split(' ');
  
  const results = allEvents.filter((event: any) => {
    const searchableText = `${event.title} ${event.description} ${event.tags?.join(' ')}`.toLowerCase();
    return searchTerms.some(term => searchableText.includes(term));
  });
  
  return results;
}
