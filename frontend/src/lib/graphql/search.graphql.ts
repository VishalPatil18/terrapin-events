/**
 * Search GraphQL Queries
 * Week 7-8 - Event Discovery & Advanced Search
 * 
 * IMPORTANT: These queries match the backend GraphQL schema exactly
 */

// ==================== FRAGMENTS ====================

export const EVENT_FRAGMENT = `
  fragment EventFields on Event {
    id
    title
    description
    startDateTime
    endDateTime
    location {
      name
      building
      room
      address
    }
    category
    capacity
    registeredCount
    waitlistCount
    organizerId
    status
    tags
    imageUrl
    slug
    shareableUrl
    availableSeats
    waitlistAvailable
    createdAt
    updatedAt
  }
`;

export const CALENDAR_EVENT_FRAGMENT = `
  fragment CalendarEventFields on CalendarEvent {
    id
    title
    start
    end
    location
    availableSeats
    category
    status
  }
`;

export const SEARCH_FACETS_FRAGMENT = `
  fragment SearchFacetsFields on SearchFacets {
    categories {
      value
      count
    }
    locations {
      value
      count
    }
    tags {
      value
      count
    }
  }
`;

// ==================== QUERIES ====================

/**
 * Advanced Search Events Query
 * Backend resolver: advancedSearchEvents
 */
export const ADVANCED_SEARCH_EVENTS = `
  ${EVENT_FRAGMENT}
  ${SEARCH_FACETS_FRAGMENT}
  
  query AdvancedSearchEvents($input: SearchQueryInput!) {
    advancedSearchEvents(input: $input) {
      items {
        ...EventFields
      }
      total
      nextToken
      facets {
        ...SearchFacetsFields
      }
    }
  }
`;

/**
 * Get Calendar Events Query
 * Backend resolver: getCalendarEvents
 */
export const GET_CALENDAR_EVENTS = `
  ${CALENDAR_EVENT_FRAGMENT}
  
  query GetCalendarEvents($input: CalendarEventsInput!) {
    getCalendarEvents(input: $input) {
      ...CalendarEventFields
    }
  }
`;

/**
 * Get Event By Slug Query
 * Backend resolver: getEventBySlug
 */
export const GET_EVENT_BY_SLUG = `
  ${EVENT_FRAGMENT}
  
  query GetEventBySlug($slug: String!) {
    getEventBySlug(slug: $slug) {
      ...EventFields
    }
  }
`;

// ==================== TYPE DEFINITIONS ====================

export interface SearchQueryInput {
  query: string;
  filters?: SearchFilters;
  pagination?: PaginationInput;
  sort?: SortInput;
}

export interface SearchFilters {
  categories?: string[];
  locations?: string[];
  startDateAfter?: string;
  startDateBefore?: string;
  hasAvailableSeats?: boolean;
  tags?: string[];
}

export interface PaginationInput {
  limit?: number;
  nextToken?: string;
}

export interface SortInput {
  field: string;
  order: string;
}

export interface CalendarEventsInput {
  year: number;
  month: number;
  view?: 'month' | 'week' | 'day' | 'agenda';
  filters?: CalendarFiltersInput;
}

export interface CalendarFiltersInput {
  categories?: string[];
  locations?: string[];
}

// ==================== RESULT TYPES ====================

export interface AdvancedSearchEventsResult {
  advancedSearchEvents: {
    items: Array<{
      id: string;
      title: string;
      description: string;
      startDateTime: string;
      endDateTime: string;
      location: {
        name: string;
        building: string;
        room?: string;
        address: string;
      };
      category: string;
      capacity: number;
      registeredCount: number;
      waitlistCount: number;
      organizerId: string;
      status: string;
      tags: string[];
      imageUrl?: string;
      slug?: string;
      shareableUrl?: string;
      availableSeats?: number;
      waitlistAvailable?: boolean;
      createdAt: string;
      updatedAt: string;
    }>;
    total: number;
    nextToken?: string;
    facets?: {
      categories: Array<{ value: string; count: number }>;
      locations: Array<{ value: string; count: number }>;
      tags: Array<{ value: string; count: number }>;
    };
  };
}

export interface GetCalendarEventsResult {
  getCalendarEvents: Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    location: string;
    availableSeats: number;
    category: string;
    status: string;
  }>;
}

export interface GetEventBySlugResult {
  getEventBySlug: {
    id: string;
    title: string;
    description: string;
    startDateTime: string;
    endDateTime: string;
    location: {
      name: string;
      building: string;
      room?: string;
      address: string;
    };
    category: string;
    capacity: number;
    registeredCount: number;
    waitlistCount: number;
    organizerId: string;
    status: string;
    tags: string[];
    imageUrl?: string;
    slug?: string;
    shareableUrl?: string;
    availableSeats?: number;
    waitlistAvailable?: boolean;
    createdAt: string;
    updatedAt: string;
  } | null;
}
