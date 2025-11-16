/**
 * Event types for frontend - matching backend schema
 */

export enum EventCategory {
  ACADEMIC = 'ACADEMIC',
  SOCIAL = 'SOCIAL',
  SPORTS = 'SPORTS',
  ARTS = 'ARTS',
  TECH = 'TECH',
  CAREER = 'CAREER',
  OTHER = 'OTHER'
}

export enum EventStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  PUBLISHED = 'PUBLISHED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
}

export interface EventCoordinates {
  latitude: number;
  longitude: number;
}

export interface EventLocation {
  name: string;
  building: string;
  room?: string;
  address: string;
  coordinates?: EventCoordinates;
}

export interface Event {
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

export interface CreateEventInput {
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  location: Omit<EventLocation, 'coordinates'> & { 
    coordinates?: { latitude: number; longitude: number } 
  };
  category: EventCategory;
  capacity: number;
  tags?: string[];
  imageUrl?: string;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  startDateTime?: string;
  endDateTime?: string;
  location?: Omit<EventLocation, 'coordinates'> & { 
    coordinates?: { latitude: number; longitude: number } 
  };
  category?: EventCategory;
  capacity?: number;
  tags?: string[];
  imageUrl?: string;
  status?: EventStatus;
}

export interface EventFilter {
  category?: EventCategory;
  status?: EventStatus;
  startDateAfter?: string;
  startDateBefore?: string;
}

export interface EventConnection {
  items: Event[];
  nextToken: string | null;
}

// Helper functions
export function getEventStatusColor(status: EventStatus): string {
  const colors: Record<EventStatus, string> = {
    [EventStatus.DRAFT]: 'gray',
    [EventStatus.PENDING_APPROVAL]: 'yellow',
    [EventStatus.PUBLISHED]: 'green',
    [EventStatus.CANCELLED]: 'red',
    [EventStatus.COMPLETED]: 'blue',
  };
  return colors[status];
}

export function getEventCategoryLabel(category: EventCategory): string {
  const labels: Record<EventCategory, string> = {
    [EventCategory.ACADEMIC]: 'Academic',
    [EventCategory.SOCIAL]: 'Social',
    [EventCategory.SPORTS]: 'Sports',
    [EventCategory.ARTS]: 'Arts & Culture',
    [EventCategory.TECH]: 'Technology',
    [EventCategory.CAREER]: 'Career',
    [EventCategory.OTHER]: 'Other',
  };
  return labels[category];
}

export function getEventStatusLabel(status: EventStatus): string {
  const labels: Record<EventStatus, string> = {
    [EventStatus.DRAFT]: 'Draft',
    [EventStatus.PENDING_APPROVAL]: 'Pending Approval',
    [EventStatus.PUBLISHED]: 'Published',
    [EventStatus.CANCELLED]: 'Cancelled',
    [EventStatus.COMPLETED]: 'Completed',
  };
  return labels[status];
}

export function formatEventDateTime(dateTime: string): string {
  const date = new Date(dateTime);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function isEventFull(event: Event): boolean {
  return event.registeredCount >= event.capacity;
}

export function getAvailableSeats(event: Event): number {
  return Math.max(0, event.capacity - event.registeredCount);
}
