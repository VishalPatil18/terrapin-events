/**
 * Event API Service
 * Provides functions to interact with GraphQL API for event operations
 */

import { generateClient } from 'aws-amplify/api';
import type { GraphQLResult } from '@aws-amplify/api-graphql';
import {
  GET_EVENT,
  LIST_EVENTS,
  SEARCH_EVENTS,
  CREATE_EVENT,
  UPDATE_EVENT,
  DELETE_EVENT,
  PUBLISH_EVENT,
} from '../graphql/events.graphql';
import type {
  Event,
  EventConnection,
  CreateEventInput,
  UpdateEventInput,
  EventFilter,
} from '@/types/event.types';

const client = generateClient();

/**
 * Get Event by ID
 */
export async function getEvent(id: string): Promise<Event | null> {
  try {
    const result = (await client.graphql({
      query: GET_EVENT,
      variables: { id },
    })) as GraphQLResult<{ getEvent: Event }>;

    return result.data?.getEvent || null;
  } catch (error) {
    console.error('Get event error:', error);
    throw error;
  }
}

/**
 * List Events with optional filtering
 */
export async function listEvents(
  filter?: EventFilter,
  limit = 20,
  nextToken?: string
): Promise<EventConnection> {
  try {
    const result = (await client.graphql({
      query: LIST_EVENTS,
      variables: { filter, limit, nextToken },
    })) as GraphQLResult<{ listEvents: EventConnection }>;

    return (
      result.data?.listEvents || {
        items: [],
        nextToken: null,
      }
    );
  } catch (error) {
    console.error('List events error:', error);
    throw error;
  }
}

/**
 * Search Events
 */
export async function searchEvents(query: string): Promise<Event[]> {
  try {
    const result = (await client.graphql({
      query: SEARCH_EVENTS,
      variables: { query },
    })) as GraphQLResult<{ searchEvents: Event[] }>;

    return result.data?.searchEvents || [];
  } catch (error) {
    console.error('Search events error:', error);
    throw error;
  }
}

/**
 * Create Event
 */
export async function createEvent(input: CreateEventInput): Promise<Event> {
  try {
    const result = (await client.graphql({
      query: CREATE_EVENT,
      variables: { input },
    })) as GraphQLResult<{ createEvent: Event }>;

    if (!result.data?.createEvent) {
      throw new Error('Failed to create event');
    }

    return result.data.createEvent;
  } catch (error) {
    console.error('Create event error:', error);
    throw error;
  }
}

/**
 * Update Event
 */
export async function updateEvent(
  id: string,
  input: UpdateEventInput
): Promise<Event> {
  try {
    const result = (await client.graphql({
      query: UPDATE_EVENT,
      variables: { id, input },
    })) as GraphQLResult<{ updateEvent: Event }>;

    if (!result.data?.updateEvent) {
      throw new Error('Failed to update event');
    }

    return result.data.updateEvent;
  } catch (error) {
    console.error('Update event error:', error);
    throw error;
  }
}

/**
 * Delete Event (soft delete)
 */
export async function deleteEvent(id: string): Promise<Event> {
  try {
    const result = (await client.graphql({
      query: DELETE_EVENT,
      variables: { id },
    })) as GraphQLResult<{ deleteEvent: Event }>;

    if (!result.data?.deleteEvent) {
      throw new Error('Failed to delete event');
    }

    return result.data.deleteEvent;
  } catch (error) {
    console.error('Delete event error:', error);
    throw error;
  }
}

/**
 * Publish Event (move from DRAFT to PUBLISHED)
 */
export async function publishEvent(id: string): Promise<Event> {
  try {
    const result = (await client.graphql({
      query: PUBLISH_EVENT,
      variables: { id },
    })) as GraphQLResult<{ publishEvent: Event }>;

    if (!result.data?.publishEvent) {
      throw new Error('Failed to publish event');
    }

    return result.data.publishEvent;
  } catch (error) {
    console.error('Publish event error:', error);
    throw error;
  }
}

/**
 * Helper: Get upcoming events
 */
export async function getUpcomingEvents(limit = 10): Promise<Event[]> {
  const now = new Date().toISOString();
  const result = await listEvents(
    {
      startDateAfter: now,
    },
    limit
  );
  return result.items;
}

/**
 * Helper: Get events by category
 */
export async function getEventsByCategory(
  category: string,
  limit = 20
): Promise<Event[]> {
  const result = await listEvents(
    {
      category: category as any,
    },
    limit
  );
  return result.items;
}

/**
 * Helper: Get published events only
 */
export async function getPublishedEvents(limit = 20): Promise<Event[]> {
  const result = await listEvents(
    {
      status: 'PUBLISHED' as any,
    },
    limit
  );
  return result.items;
}
