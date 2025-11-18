/**
 * Search API Client
 * Week 7-8 - Advanced Event Search & Discovery
 * 
 * This module provides functions for searching events using the
 * deployed search service Lambda functions via AppSync GraphQL
 */

import type {
  SearchQuery,
  SearchResult,
  CalendarEventsQuery,
  EventSearchItem,
} from '@/types/search.types';
import type { EventCategory, EventStatus } from '@/types/event.types';
import { generateClient, GraphQLResult } from 'aws-amplify/api';
import {
  ADVANCED_SEARCH_EVENTS,
  GET_CALENDAR_EVENTS,
  GET_EVENT_BY_SLUG,
  type AdvancedSearchEventsResult,
  type GetCalendarEventsResult,
  type GetEventBySlugResult,
  type SearchQueryInput,
  type CalendarEventsInput,
} from '@/lib/graphql/search.graphql';

const client = generateClient();

/**
 * Search events with advanced filters using the deployed search Lambda
 * 
 * @param query - Search query with filters, pagination, and sorting
 * @returns Search results with items, total count, facets, and pagination token
 */
export async function searchEvents(query: SearchQuery): Promise<SearchResult> {
  try {
    console.log('Searching events with query:', query);

    // Transform frontend SearchFilters to backend SearchFilters
    const backendFilters = query.filters ? {
      categories: query.filters.categories,
      locations: query.filters.locations,
      startDateAfter: query.dateRange?.start,
      startDateBefore: query.dateRange?.end,
      // Transform availability to hasAvailableSeats
      hasAvailableSeats: query.filters.availability === 'AVAILABLE' ? true : 
                         query.filters.availability === 'WAITLIST' ? false : 
                         undefined,
      tags: [] as string[], // Frontend doesn't have tags filter yet, default to empty
    } : undefined;

    // Build GraphQL input
    const input: SearchQueryInput = {
      query: query.query || '',
      filters: backendFilters,
      pagination: query.pagination ? {
        limit: query.pagination.limit,
        nextToken: query.pagination.nextToken,
      } : undefined,
      sort: query.sort ? {
        field: query.sort.field === 'availableSeats' ? 'startDateTime' : query.sort.field,
        order: query.sort.order,
      } : undefined,
    };

    // Call AppSync GraphQL query
    const response = (await client.graphql({
      query: ADVANCED_SEARCH_EVENTS,
      variables: { input },
    })) as GraphQLResult<AdvancedSearchEventsResult>;

    if (!response.data?.advancedSearchEvents) {
      throw new Error('No search results returned from API');
    }

    const result = response.data.advancedSearchEvents;

    // Transform to frontend format with proper type casting
    const searchResult: SearchResult = {
      items: result.items.map(item => ({
        ...item,
        category: item.category as EventCategory,
        status: item.status as EventStatus,
      })) as EventSearchItem[],
      total: result.total,
      nextToken: result.nextToken,
      took: 0, // Backend doesn't return 'took' in this schema
      aggregations: result.facets ? {
        categories: result.facets.categories.map(f => ({
          key: f.value,
          count: f.count,
        })),
        locations: result.facets.locations.map(f => ({
          key: f.value,
          count: f.count,
        })),
        dateRanges: result.facets.tags.slice(0, 3).map(f => ({
          key: f.value,
          count: f.count,
        })), // Use tags as placeholder for date ranges
      } : undefined,
    };

    console.log('Search completed:', {
      total: searchResult.total,
      itemsReturned: searchResult.items.length,
    });

    return searchResult;
  } catch (error) {
    console.error('Search API error:', error);
    
    // Enhanced error handling with more context
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
      
      // Check for specific error types
      if (error.message.includes('Network')) {
        throw new Error('Network error: Please check your connection and try again');
      } else if (error.message.includes('Unauthorized') || error.message.includes('401')) {
        throw new Error('Authentication error: Please log in again');
      } else if (error.message.includes('GraphQL') || error.message.includes('resolver')) {
        throw new Error('Search service configuration error: The search API may not be properly deployed. Please contact support.');
      } else if (error.message.includes('No search results returned')) {
        throw new Error('Search service error: Unable to retrieve results. The backend service may not be responding.');
      } else {
        throw new Error(`Search failed: ${error.message}`);
      }
    }
    
    // If error is not an Error instance, log the raw error
    console.error('Non-Error exception caught:', JSON.stringify(error, null, 2));
    throw new Error('Failed to search events. The search service may not be properly configured. Please contact support.');
  }
}

/**
 * Get calendar events for a specific month/view
 * 
 * @param query - Calendar query with year, month, view, and filters
 * @returns Array of calendar events
 */
export async function getCalendarEvents(
  query: CalendarEventsQuery
): Promise<EventSearchItem[]> {
  try {
    console.log('Fetching calendar events:', query);

    // Transform to GraphQL input
    const input: CalendarEventsInput = {
      year: query.year,
      month: query.month,
      view: query.view,
      filters: query.filters ? {
        categories: query.filters.categories,
        locations: query.filters.locations,
      } : undefined,
    };

    // Call AppSync GraphQL query
    const response = (await client.graphql({
      query: GET_CALENDAR_EVENTS,
      variables: { input },
    })) as GraphQLResult<GetCalendarEventsResult>;

    if (!response.data?.getCalendarEvents) {
      throw new Error('No calendar events returned from API');
    }

    const calendarEvents = response.data.getCalendarEvents;

    // Transform to EventSearchItem format with proper type casting
    const events: EventSearchItem[] = calendarEvents.map(event => ({
      id: event.id,
      title: event.title,
      description: '', // Not returned by calendar query
      startDateTime: event.start,
      endDateTime: event.end,
      location: {
        name: event.location,
        building: event.location,
        room: undefined,
        address: event.location,
      },
      category: event.category as EventCategory, // Cast string to enum
      capacity: 0, // Not returned by calendar query
      registeredCount: 0,
      waitlistCount: 0,
      organizerId: '',
      status: event.status as EventStatus, // Cast string to enum
      tags: [],
      imageUrl: undefined,
      createdAt: '',
      updatedAt: '',
    }));

    console.log('Calendar events retrieved:', events.length);

    return events;
  } catch (error) {
    console.error('Calendar API error:', error);
    
    if (error instanceof Error) {
      throw new Error(`Failed to fetch calendar events: ${error.message}`);
    }
    
    throw new Error('Failed to fetch calendar events. Please try again.');
  }
}

/**
 * Get event by slug (shareable URL)
 * 
 * @param slug - URL-friendly event slug
 * @returns Event details or null if not found
 */
export async function getEventBySlug(slug: string): Promise<EventSearchItem | null> {
  try {
    console.log('Fetching event by slug:', slug);

    // Call AppSync GraphQL query
    const response = (await client.graphql({
      query: GET_EVENT_BY_SLUG,
      variables: { slug },
    })) as GraphQLResult<GetEventBySlugResult>;

    if (!response.data?.getEventBySlug) {
      console.log('Event not found for slug:', slug);
      return null;
    }

    const event = response.data.getEventBySlug;

    // Transform to EventSearchItem format with proper type casting
    const eventItem: EventSearchItem = {
      id: event.id,
      title: event.title,
      description: event.description,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      location: event.location,
      category: event.category as EventCategory, // Cast string to enum
      capacity: event.capacity,
      registeredCount: event.registeredCount,
      waitlistCount: event.waitlistCount,
      organizerId: event.organizerId,
      status: event.status as EventStatus, // Cast string to enum
      tags: event.tags,
      imageUrl: event.imageUrl,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };

    console.log('Event found:', eventItem.title);

    return eventItem;
  } catch (error) {
    console.error('Get event by slug error:', error);
    
    if (error instanceof Error) {
      // Don't throw for not found, just return null
      if (error.message.includes('not found')) {
        return null;
      }
      throw new Error(`Failed to get event: ${error.message}`);
    }
    
    return null;
  }
}
