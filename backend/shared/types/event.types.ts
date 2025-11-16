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

// Re-export EventCategory for backwards compatibility
export { EventCategory } from './common';
