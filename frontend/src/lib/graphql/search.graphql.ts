/**
 * Search GraphQL Queries
 * Week 8 - Event Discovery & Search
 */

// Search Event Item Fragment
export const SEARCH_EVENT_ITEM_FRAGMENT = `
  fragment SearchEventItem on EventSearchItem {
    eventId
    title
    description
    startDateTime
    endDateTime
    location
    room
    category
    organizerName
    availableSeats
    totalCapacity
    status
    imageUrl
    shareableUrl
    relevanceScore
  }
`;

// Search Aggregations Fragment
export const SEARCH_AGGREGATIONS_FRAGMENT = `
  fragment SearchAggregations on SearchAggregations {
    categories {
      key
      count
    }
    locations {
      key
      count
    }
    dateRanges {
      key
      count
    }
  }
`;

// Search Events Query
export const SEARCH_EVENTS = `
  ${SEARCH_EVENT_ITEM_FRAGMENT}
  ${SEARCH_AGGREGATIONS_FRAGMENT}
  
  query SearchEvents($input: SearchQueryInput!) {
    searchEvents(input: $input) {
      items {
        ...SearchEventItem
      }
      total
      nextToken
      took
      aggregations {
        ...SearchAggregations
      }
    }
  }
`;

// Calendar Event Fragment
export const CALENDAR_EVENT_FRAGMENT = `
  fragment CalendarEventItem on CalendarEvent {
    id
    title
    start
    end
    resource {
      eventId
      location
      availableSeats
      category
      status
    }
  }
`;

// Get Calendar Events Query
export const GET_CALENDAR_EVENTS = `
  query GetCalendarEvents($input: CalendarEventsInput!) {
    getCalendarEvents(input: $input) {
      eventId
      title
      startDateTime
      endDateTime
      location
      category
      availableSeats
      status
    }
  }
`;

// Get Event By Slug Query
export const GET_EVENT_BY_SLUG = `
  ${SEARCH_EVENT_ITEM_FRAGMENT}
  
  query GetEventBySlug($slug: String!) {
    getEventBySlug(slug: $slug) {
      ...SearchEventItem
    }
  }
`;

// Type definitions for use with GraphQL
export interface SearchQueryInput {
  query?: string;
  filters?: {
    categories?: string[];
    locations?: string[];
    availability?: 'ALL' | 'AVAILABLE' | 'WAITLIST';
    organizers?: string[];
  };
  dateRange?: {
    start: string;
    end: string;
  };
  sort?: {
    field: 'startDateTime' | 'title' | 'availableSeats';
    order: 'asc' | 'desc';
  };
  pagination?: {
    limit?: number;
    nextToken?: string;
  };
}

export interface SearchEventsResult {
  searchEvents: {
    items: Array<{
      eventId: string;
      title: string;
      description: string;
      startDateTime: string;
      endDateTime: string;
      location: string;
      room?: string;
      category: string;
      organizerName: string;
      availableSeats: number;
      totalCapacity: number;
      status: string;
      imageUrl?: string;
      shareableUrl: string;
      relevanceScore?: number;
    }>;
    total: number;
    nextToken?: string;
    took: number;
    aggregations?: {
      categories: Array<{ key: string; count: number }>;
      locations: Array<{ key: string; count: number }>;
      dateRanges: Array<{ key: string; count: number }>;
    };
  };
}

export interface CalendarEventsInput {
  year: number;
  month: number;
  view?: 'month' | 'week' | 'day' | 'agenda';
  filters?: {
    categories?: string[];
    locations?: string[];
  };
}

export interface CalendarEventsResult {
  getCalendarEvents: Array<{
    eventId: string;
    title: string;
    startDateTime: string;
    endDateTime: string;
    location: string;
    category: string;
    availableSeats: number;
    status: string;
  }>;
}

export interface GetEventBySlugResult {
  getEventBySlug: {
    eventId: string;
    title: string;
    description: string;
    startDateTime: string;
    endDateTime: string;
    location: string;
    room?: string;
    category: string;
    organizerName: string;
    availableSeats: number;
    totalCapacity: number;
    status: string;
    imageUrl?: string;
    shareableUrl: string;
  } | null;
}
