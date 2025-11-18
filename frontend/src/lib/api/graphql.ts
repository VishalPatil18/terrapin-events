import { generateClient } from 'aws-amplify/api';
import type { GraphQLResult } from '@aws-amplify/api-graphql';

const client = generateClient();

// Enums (matching AppSync GraphQL Schema)
export enum EventCategory {
  ACADEMIC = 'ACADEMIC',
  SOCIAL = 'SOCIAL',
  SPORTS = 'SPORTS',
  ARTS = 'ARTS',
  TECH = 'TECH',
  CAREER = 'CAREER',
  OTHER = 'OTHER',
}

export enum EventStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  PUBLISHED = 'PUBLISHED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum UserRole {
  PARTICIPANT = 'PARTICIPANT',
  ORGANIZER = 'ORGANIZER',
  ADMINISTRATOR = 'ADMINISTRATOR',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum RegistrationStatus {
  REGISTERED = 'REGISTERED',
  WAITLISTED = 'WAITLISTED',
  ATTENDED = 'ATTENDED',
  NO_SHOW = 'NO_SHOW',
  CANCELLED = 'CANCELLED',
}

// Type definitions (matching AppSync GraphQL Schema)
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Location {
  name: string;
  building: string;
  room?: string;
  address: string;
  coordinates?: Coordinates;
}

export interface CoordinatesInput {
  latitude: number;
  longitude: number;
}

export interface LocationInput {
  name: string;
  building: string;
  room?: string;
  address: string;
  coordinates?: CoordinatesInput;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  startDateTime: string; // AWSDateTime
  endDateTime: string; // AWSDateTime
  location: Location;
  category: EventCategory;
  capacity: number;
  registeredCount: number;
  waitlistCount: number;
  organizerId: string;
  organizer: User;
  status: EventStatus;
  tags: string[];
  imageUrl?: string;
  createdAt: string; // AWSDateTime
  updatedAt: string; // AWSDateTime
}

export interface EventConnection {
  items: Event[];
  nextToken?: string;
}

export interface User {
  id: string;
  email: string; // AWSEmail
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: string; // AWSDateTime
  updatedAt: string; // AWSDateTime
}

export interface Registration {
  id: string;
  userId: string;
  eventId: string;
  event?: Event; // Related event details - resolved by field resolver
  status: RegistrationStatus;
  qrCode: string;
  waitlistPosition?: number;
  promotionDeadline?: string; // AWSDateTime - 24h deadline for accepting waitlist promotion
  registeredAt: string; // AWSDateTime
  attendedAt?: string; // AWSDateTime
}

export interface EventFilter {
  category?: EventCategory;
  status?: EventStatus;
  startDateAfter?: string; // AWSDateTime
  startDateBefore?: string; // AWSDateTime
}

export interface CreateEventInput {
  title: string;
  description: string;
  startDateTime: string; // AWSDateTime
  endDateTime: string; // AWSDateTime
  location: LocationInput;
  category: EventCategory;
  capacity: number;
  tags?: string[];
  imageUrl?: string;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  startDateTime?: string; // AWSDateTime
  endDateTime?: string; // AWSDateTime
  location?: LocationInput;
  category?: EventCategory;
  capacity?: number;
  tags?: string[];
  imageUrl?: string;
  status?: EventStatus;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
}

// GraphQL Queries
export const queries = {
  getEvent: /* GraphQL */ `
    query GetEvent($id: ID!) {
      getEvent(id: $id) {
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
        status
        tags
        imageUrl
        createdAt
        updatedAt
      }
    }
  `,

  listEvents: /* GraphQL */ `
    query ListEvents($filter: EventFilter, $limit: Int, $nextToken: String) {
      listEvents(filter: $filter, limit: $limit, nextToken: $nextToken) {
        items {
          id
          title
          description
          startDateTime
          endDateTime
          location {
            name
            building
          }
          category
          capacity
          registeredCount
          waitlistCount
          status
          imageUrl
        }
        nextToken
      }
    }
  `,

  getCurrentUser: /* GraphQL */ `
    query GetCurrentUser {
      getCurrentUser {
        id
        email
        firstName
        lastName
        role
        createdAt
        updatedAt
      }
    }
  `,

  listMyRegistrations: /* GraphQL */ `
    query ListMyRegistrations {
      listMyRegistrations {
        id
        eventId
        status
        qrCode
        waitlistPosition
        registeredAt
        attendedAt
      }
    }
  `,
};

// GraphQL Mutations
export const mutations = {
  createEvent: /* GraphQL */ `
    mutation CreateEvent($input: CreateEventInput!) {
      createEvent(input: $input) {
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
        status
        createdAt
      }
    }
  `,

  updateEvent: /* GraphQL */ `
    mutation UpdateEvent($id: ID!, $input: UpdateEventInput!) {
      updateEvent(id: $id, input: $input) {
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
        status
        updatedAt
      }
    }
  `,

  registerForEvent: /* GraphQL */ `
    mutation RegisterForEvent($eventId: ID!) {
      registerForEvent(eventId: $eventId) {
        id
        eventId
        userId
        status
        qrCode
        registeredAt
      }
    }
  `,

  cancelRegistration: /* GraphQL */ `
    mutation CancelRegistration($id: ID!) {
      cancelRegistration(id: $id) {
        id
        status
      }
    }
  `,
};

// Helper Functions
export async function listEvents(variables?: {
  filter?: EventFilter;
  limit?: number;
  nextToken?: string;
}): Promise<EventConnection | undefined> {
  try {
    const result = await client.graphql({
      query: queries.listEvents,
      variables: variables || {},
    }) as GraphQLResult<{ listEvents: EventConnection }>;

    return result.data?.listEvents;
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
}

export async function getEvent(id: string): Promise<Event | undefined> {
  try {
    const result = await client.graphql({
      query: queries.getEvent,
      variables: { id },
    }) as GraphQLResult<{ getEvent: Event }>;

    return result.data?.getEvent;
  } catch (error) {
    console.error('Error fetching event:', error);
    throw error;
  }
}

export async function getCurrentUser(): Promise<User | undefined> {
  try {
    const result = await client.graphql({
      query: queries.getCurrentUser,
    }) as GraphQLResult<{ getCurrentUser: User }>;

    return result.data?.getCurrentUser;
  } catch (error) {
    console.error('Error fetching current user:', error);
    throw error;
  }
}

export async function createEvent(input: CreateEventInput): Promise<Event | undefined> {
  try {
    const result = await client.graphql({
      query: mutations.createEvent,
      variables: { input },
    }) as GraphQLResult<{ createEvent: Event }>;

    return result.data?.createEvent;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
}

export async function registerForEvent(eventId: string): Promise<Registration | undefined> {
  try {
    const result = await client.graphql({
      query: mutations.registerForEvent,
      variables: { eventId },
    }) as GraphQLResult<{ registerForEvent: Registration }>;

    return result.data?.registerForEvent;
  } catch (error) {
    console.error('Error registering for event:', error);
    throw error;
  }
}

export async function updateEvent(id: string, input: UpdateEventInput): Promise<Event | undefined> {
  try {
    const result = await client.graphql({
      query: mutations.updateEvent,
      variables: { id, input },
    }) as GraphQLResult<{ updateEvent: Event }>;

    return result.data?.updateEvent;
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
}

export async function cancelRegistration(id: string): Promise<Registration | undefined> {
  try {
    const result = await client.graphql({
      query: mutations.cancelRegistration,
      variables: { id },
    }) as GraphQLResult<{ cancelRegistration: Registration }>;

    return result.data?.cancelRegistration;
  } catch (error) {
    console.error('Error cancelling registration:', error);
    throw error;
  }
}

export async function listMyRegistrations(): Promise<Registration[] | undefined> {
  try {
    const result = await client.graphql({
      query: queries.listMyRegistrations,
    }) as GraphQLResult<{ listMyRegistrations: Registration[] }>;

    return result.data?.listMyRegistrations;
  } catch (error) {
    console.error('Error fetching registrations:', error);
    throw error;
  }
}
