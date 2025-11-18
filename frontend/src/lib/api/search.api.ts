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
 * TEMPORARY: Using listEvents until search Lambda is deployed
 */
export async function searchEvents(query: SearchQuery): Promise<SearchResult> {
  try {
    // Import listEvents
    const { listEvents } = await import('./events.api');
    
    // Use listEvents and filter client-side
    const result = await listEvents(undefined, 50);
    
    let filteredItems = result.items;
    
    // Client-side filtering
    if (query.query) {
      const searchTerm = query.query.toLowerCase();
      filteredItems = filteredItems.filter(event =>
        event.title.toLowerCase().includes(searchTerm) ||
        event.description.toLowerCase().includes(searchTerm) ||
        (event.tags && event.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
      );
    }
    
    if (query.filters?.categories?.length) {
      filteredItems = filteredItems.filter(event =>
        query.filters!.categories!.includes(event.category)
      );
    }
    
    if (query.filters?.locations?.length) {
      filteredItems = filteredItems.filter(event =>
        query.filters!.locations!.some(loc => 
          event.location.building.toLowerCase().includes(loc.toLowerCase())
        )
      );
    }
    
    if (query.dateRange) {
      filteredItems = filteredItems.filter(event => {
        const eventDate = new Date(event.startDateTime);
        const start = new Date(query.dateRange!.start);
        const end = new Date(query.dateRange!.end);
        return eventDate >= start && eventDate <= end;
      });
    }
    
    if (query.filters?.hasAvailableSeats) {
      filteredItems = filteredItems.filter(event => {
        const available = event.capacity - event.registeredCount;
        return available > 0;
      });
    }

    return {
      items: filteredItems,
      total: filteredItems.length,
      nextToken: undefined,
      took: 0,
    };
  } catch (error) {
    console.error('Search API error:', error);
    throw new Error('Failed to search events');
  }
}

/**
 * Get calendar events for a specific month/view
 * TEMPORARY: Using listEvents until calendar Lambda is deployed
 */
export async function getCalendarEvents(
  query: CalendarEventsQuery
): Promise<EventSearchItem[]> {
  try {
    // Import listEvents
    const { listEvents } = await import('./events.api');
    
    // Use listEvents and filter client-side
    const result = await listEvents(undefined, 100);
    
    // Filter by month/year
    let filtered = result.items.filter(event => {
      const eventDate = new Date(event.startDateTime);
      return (
        eventDate.getFullYear() === query.year &&
        eventDate.getMonth() === query.month - 1
      );
    });
    
    // Apply category filter
    if (query.filters?.categories?.length) {
      filtered = filtered.filter(event =>
        query.filters!.categories!.includes(event.category)
      );
    }
    
    // Apply location filter
    if (query.filters?.locations?.length) {
      filtered = filtered.filter(event =>
        query.filters!.locations!.some(loc =>
          event.location.building.toLowerCase().includes(loc.toLowerCase())
        )
      );
    }

    return filtered.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      location: event.location,
      category: event.category,
      capacity: event.capacity,
      registeredCount: event.registeredCount,
      waitlistCount: event.waitlistCount,
      organizerId: event.organizerId,
      status: event.status,
      tags: event.tags || [],
      imageUrl: event.imageUrl || "",
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    }));
  } catch (error) {
    console.error('Calendar API error:', error);
    throw new Error('Failed to fetch calendar events');
  }
}

/**
 * Get event by slug (shareable URL)
 * TEMPORARY: Using listEvents until slug lookup Lambda is deployed
 */
export async function getEventBySlug(slug: string): Promise<EventSearchItem | null> {
  try {
    // Import listEvents
    const { listEvents } = await import('./events.api');
    
    // Use listEvents and find by slug
    const result = await listEvents(undefined, 100);
    const event = result.items.find(e => e.slug === slug);
    
    if (!event) return null;
    
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      location: event.location,
      category: event.category,
      capacity: event.capacity,
      registeredCount: event.registeredCount,
      waitlistCount: event.waitlistCount,
      organizerId: event.organizerId,
      status: event.status,
      tags: event.tags || [],
      imageUrl: event.imageUrl || "",
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  } catch (error) {
    console.error('Get event by slug error:', error);
    return null;
  }
}
