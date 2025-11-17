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
      items: result.items,
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

    return response.data.getCalendarEvents;
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

    return response.data.getEventBySlug;
  } catch (error) {
    console.error('Get event by slug error:', error);
    return null;
  }
}
