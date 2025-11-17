/**
 * Search API Client
 * Week 8 - GraphQL Search Integration
 */

import type {
  SearchQuery,
  SearchResult,
  CalendarEventsQuery,
  EventSearchItem,
} from '@/types/search.types';
import { generateClient } from 'aws-amplify/api';
import {
  SEARCH_EVENTS,
  GET_CALENDAR_EVENTS,
  GET_EVENT_BY_SLUG,
  type SearchEventsResult,
  type CalendarEventsResult,
  type GetEventBySlugResult,
} from '@/lib/graphql/search.graphql';

const client = generateClient();

/**
 * Search events with advanced filters
 */
export async function searchEvents(query: SearchQuery): Promise<SearchResult> {
  try {
    const response = (await client.graphql({
      query: SEARCH_EVENTS,
      variables: {
        input: {
          query: query.query,
          filters: query.filters,
          dateRange: query.dateRange,
          sort: query.sort,
          pagination: query.pagination,
        },
      },
    })) as { data: SearchEventsResult };

    const result = response.data.searchEvents;

    return {
      items: result.items.map(item => ({
        id: item.eventId,
        title: item.title,
        description: item.description,
        startDateTime: item.startDateTime,
        endDateTime: item.endDateTime,
        location: item.location,
        category: item.category,
        capacity: item.totalCapacity,
        registeredCount: item.totalCapacity - item.availableSeats,
        waitlistCount: 0, // Default for search results
        organizerId: item.organizerName, // Map organizerName to organizerId temporarily
        status: item.status,
        tags: [], // Default for search results
        imageUrl: "",
        createdAt: "", // Default timestamp
        updatedAt: "", // Default timestamp
      })),
      total: result.total,
      nextToken: result.nextToken,
      took: result.took,
      aggregations: result.aggregations
        ? {
            categories: result.aggregations.categories,
            locations: result.aggregations.locations,
            dateRanges: result.aggregations.dateRanges,
          }
        : undefined,
    };
  } catch (error) {
    console.error('Search API error:', error);
    throw new Error('Failed to search events');
  }
}

/**
 * Get calendar events for a specific month/view
 */
export async function getCalendarEvents(
  query: CalendarEventsQuery
): Promise<EventSearchItem[]> {
  try {
    const response = (await client.graphql({
      query: GET_CALENDAR_EVENTS,
      variables: {
        input: {
          year: query.year,
          month: query.month,
          view: query.view,
          filters: query.filters,
        },
      },
    })) as { data: CalendarEventsResult };

    return response.data.getCalendarEvents.map(item => ({
      id: item.id,
      title: item.title,
      description: '', // Not available in calendar response
      startDateTime: item.startDateTime,
      endDateTime: item.endDateTime,
      location: item.location,
      category: item.category,
      capacity: 0, // Not available in calendar response
      registeredCount: 0, // Calculate from availableSeats if needed
      waitlistCount: 0, // Not available in calendar response
      organizerId: '', // Not available in calendar response
      status: item.status,
      tags: [], // Not available in calendar response
      imageUrl: "",
      createdAt: "",
      updatedAt: "",
    }));
  } catch (error) {
    console.error('Calendar API error:', error);
    throw new Error('Failed to fetch calendar events');
  }
}

/**
 * Get event by slug (shareable URL)
 */
export async function getEventBySlug(slug: string): Promise<EventSearchItem | null> {
  try {
    const response = (await client.graphql({
      query: GET_EVENT_BY_SLUG,
      variables: { slug },
    })) as { data: GetEventBySlugResult };

    const event = response.data.getEventBySlug;
    if (!event) return null;
    
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      location: event.location,
      category: event.category,
      capacity: event.totalCapacity,
      registeredCount: event.totalCapacity - event.availableSeats,
      waitlistCount: 0, // Default for slug lookup
      organizerId: event.organizerName, // Map organizerName to organizerId
      status: event.status,
      tags: [], // Default for slug lookup
      imageUrl: "",
      createdAt: "", // Default timestamp
      updatedAt: "", // Default timestamp
    };
  } catch (error) {
    console.error('Get event by slug error:', error);
    return null;
  }
}
