/**
 * Search and Filter Type Definitions
 * Week 8 - Event Discovery Features
 */
import { EventLocation, EventStatus, EventCategory } from '@/types/event.types';

export interface SearchQuery {
  query?: string;
  filters?: SearchFilters;
  dateRange?: DateRangeFilter;
  sort?: SortInput;
  pagination?: PaginationInput;
}

export interface SearchFilters {
  categories?: string[];
  locations?: string[];
  availability?: 'ALL' | 'AVAILABLE' | 'WAITLIST';
  organizers?: string[];
}

export interface DateRangeFilter {
  start: string; // ISO date
  end: string; // ISO date
}

export interface SortInput {
  field: 'startDateTime' | 'title' | 'availableSeats';
  order: 'asc' | 'desc';
}

export interface PaginationInput {
  limit?: number;
  nextToken?: string;
}

export interface EventSearchItem {
    id: string;
    title: string;
    description: string;
    startDateTime: string;
    endDateTime: string;
    location: EventLocation;
    category: EventCategory;
    capacity: number;
    registeredCount: number;
    waitlistCount: number;
    organizerId: string;
    status: EventStatus;
    tags: string[];
    imageUrl?: string;
    createdAt: string;
    updatedAt: string;
}

export interface SearchResult {
  items: EventSearchItem[];
  total: number;
  nextToken?: string;
  took: number; // ms
  aggregations?: SearchAggregations;
}

export interface SearchAggregations {
  categories: AggregationBucket[];
  locations: AggregationBucket[];
  dateRanges: AggregationBucket[];
}

export interface AggregationBucket {
  key: string;
  count: number;
}

// Calendar Types
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: {
    eventId: string;
    location: EventLocation;
    availableSeats: number;
    category: EventCategory;
    status: EventStatus;
  };
}

export interface CalendarEventsQuery {
  year: number;
  month: number;
  view?: 'month' | 'week' | 'day' | 'agenda';
  filters?: CalendarFiltersInput;
}

export interface CalendarFiltersInput {
  categories?: string[];
  locations?: string[];
}

// Search State Types
export interface SearchState {
  query: string;
  filters: SearchFilters;
  dateRange?: DateRangeFilter;
  results: SearchResult | null;
  loading: boolean;
  error: string | null;
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}
