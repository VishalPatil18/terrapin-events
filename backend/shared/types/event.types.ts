import { BaseEntity, EventStatus, EventCategory } from './common';

/**
 * Complete Event entity with all required fields
 * Extends BaseEntity to include DynamoDB keys
 */
export interface Event extends BaseEntity {
  id: string;
  title: string;
  description: string;
  startDateTime: string; // ISO 8601
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
  version: number; // For optimistic locking
  
  slug?: string; // URL-friendly identifier
  shareableUrl?: string; // Full shareable URL
  searchTerms?: string; // Concatenated search text
  availableSeats?: number; // Computed field
  waitlistAvailable?: boolean; // Computed field
  
  GSI3PK?: string; // Format: "EVENT#LOCATION#{building}"
  GSI3SK?: string; // Format: "ROOM#{room}#{eventId}"
}

/**
 * Event location with physical and virtual support
 */
export interface EventLocation {
  name: string;
  building: string;
  room?: string;
  address: string;
  coordinates?: EventCoordinates;
}

/**
 * Geographic coordinates for event location
 */
export interface EventCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Input type for creating a new event
 */
export interface CreateEventInput {
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  location: EventLocation;
  category: EventCategory;
  capacity: number;
  tags?: string[];
  imageUrl?: string;
}

/**
 * Input type for updating an existing event
 */
export interface UpdateEventInput {
  title?: string;
  description?: string;
  startDateTime?: string;
  endDateTime?: string;
  location?: EventLocation;
  category?: EventCategory;
  capacity?: number;
  tags?: string[];
  imageUrl?: string;
  status?: EventStatus;
  
  // Week 7: Auto-generated fields (system-managed, not user input)
  slug?: string;
  shareableUrl?: string;
  searchTerms?: string;
  availableSeats?: number;
  waitlistAvailable?: boolean;
  GSI3PK?: string;
  GSI3SK?: string;
}

/**
 * Filter options for listing events
 */
export interface EventFilter {
  category?: EventCategory;
  status?: EventStatus;
  startDateAfter?: string;
  startDateBefore?: string;
  hasAvailableSeats?: boolean;
  organizerId?: string;
}

/**
 * Paginated event connection for list queries
 */
export interface EventConnection {
  items: Event[];
  nextToken: string | null;
  total?: number;
}

/**
 * Venue booking for conflict detection
 */
export interface VenueBooking extends BaseEntity {
  venueId: string; // Format: "building#room"
  eventId: string;
  startDateTime: string;
  endDateTime: string;
  status: 'ACTIVE' | 'CANCELLED';
}

/**
 * Event domain events for EventBridge
 */
export enum EventDomainEventType {
  EVENT_CREATED = 'EVENT_CREATED',
  EVENT_UPDATED = 'EVENT_UPDATED',
  EVENT_PUBLISHED = 'EVENT_PUBLISHED',
  EVENT_CANCELLED = 'EVENT_CANCELLED',
  EVENT_COMPLETED = 'EVENT_COMPLETED',
  CAPACITY_UPDATED = 'CAPACITY_UPDATED',
}

/**
 * Base interface for domain events
 */
export interface EventDomainEvent {
  eventType: EventDomainEventType;
  eventId: string;
  timestamp: string;
  metadata: Record<string, any>;
}

/**
 * Event created domain event
 */
export interface EventCreatedEvent extends EventDomainEvent {
  eventType: EventDomainEventType.EVENT_CREATED;
  event: Event;
}

/**
 * Event updated domain event
 */
export interface EventUpdatedEvent extends EventDomainEvent {
  eventType: EventDomainEventType.EVENT_UPDATED;
  event: Event;
  changes: Partial<Event>;
}

/**
 * Event published domain event
 */
export interface EventPublishedEvent extends EventDomainEvent {
  eventType: EventDomainEventType.EVENT_PUBLISHED;
  event: Event;
}

/**
 * Event cancelled domain event
 */
export interface EventCancelledEvent extends EventDomainEvent {
  eventType: EventDomainEventType.EVENT_CANCELLED;
  event: Event;
  reason?: string;
}

/**
 * Search query input
 */
export interface SearchQueryInput {
  query: string;
  filters?: SearchFilters;
  pagination?: PaginationInput;
  sort?: SortInput;
}

/**
 * Advanced search filters
 */
export interface SearchFilters {
  categories?: EventCategory[];
  locations?: string[]; // Building names
  startDateAfter?: string;
  startDateBefore?: string;
  hasAvailableSeats?: boolean;
  tags?: string[];
}

/**
 * Pagination input
 */
export interface PaginationInput {
  limit?: number;
  nextToken?: string;
}

/**
 * Sort input
 */
export interface SortInput {
  field: 'startDateTime' | 'createdAt' | 'relevance';
  order: 'asc' | 'desc';
}

/**
 *  Search result with relevance scoring
 */
export interface SearchResult {
  items: Event[];
  total: number;
  nextToken?: string;
  facets?: SearchFacets;
}

/**
 * Search facets for filter aggregations
 */
export interface SearchFacets {
  categories: FacetCount[];
  locations: FacetCount[];
  tags: FacetCount[];
}

/**
 * Facet count
 */
export interface FacetCount {
  value: string;
  count: number;
}

/**
 * Calendar events input
 */
export interface CalendarEventsInput {
  year: number;
  month: number;
  view?: 'month' | 'week' | 'day' | 'agenda';
  filters?: CalendarFiltersInput;
}

/**
 *  Calendar filters
 */
export interface CalendarFiltersInput {
  categories?: EventCategory[];
  locations?: string[];
}

/**
 * Calendar event (simplified for calendar views)
 */
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location: string;
  availableSeats: number;
  category: EventCategory;
  status: EventStatus;
}

// Re-export EventCategory for backwards compatibility
export { EventCategory } from './common';
