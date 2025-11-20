/**
 * Registration API Service
 * TEMS - Terrapin Events Management System
 * 
 * Service layer for all registration-related API calls.
 * Wraps GraphQL operations with proper error handling and type safety.
 */

import { generateClient } from 'aws-amplify/api';
import type { GraphQLResult } from '@aws-amplify/api-graphql';
import {
  Registration,
  RegistrationConnection,
  RegistrationStatus,
  RegisterForEventInput,
  CancelRegistrationInput,
  CheckInAttendeeInput,
  ListRegistrationsInput,
  EventCapacityInfo,
  RegistrationStats,
  generateIdempotencyKey,
} from '@/types/registration.types';
import {
  GET_REGISTRATION,
  LIST_MY_REGISTRATIONS,
  GET_UPCOMING_REGISTRATIONS,
  GET_REGISTRATION_STATS,
  CHECK_USER_REGISTRATION,
  GET_EVENT_CAPACITY,
  REGISTER_FOR_EVENT,
  CANCEL_REGISTRATION,
  ACCEPT_PROMOTION,
  DECLINE_PROMOTION,
  CHECK_IN_ATTENDEE,
} from '@/lib/graphql/registrations.graphql';

// Initialize Amplify GraphQL client
const client = generateClient();

/**
 * Error types for better error handling
 */
export class RegistrationError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'RegistrationError';
  }
}

/**
 * Handle GraphQL errors and convert to RegistrationError
 */
function handleGraphQLError(error: any): never {
  const graphQLError = error?.errors?.[0];
  
  if (graphQLError) {
    const code = graphQLError.extensions?.code || graphQLError.errorType;
    const message = graphQLError.message || 'An error occurred';
    
    throw new RegistrationError(message, code, graphQLError);
  }
  
  throw new RegistrationError(
    error.message || 'An unexpected error occurred',
    'UNKNOWN_ERROR',
    error
  );
}

/**
 * QUERY FUNCTIONS
 */

/**
 * Get a single registration by ID
 */
export async function getRegistration(id: string): Promise<Registration> {
  try {
    const result = (await client.graphql({
      query: GET_REGISTRATION,
      variables: { id },
    })) as GraphQLResult<{ getRegistration: Registration }>;

    if (!result.data?.getRegistration) {
      throw new RegistrationError('Registration not found', 'NOT_FOUND');
    }

    return result.data.getRegistration;
  } catch (error) {
    return handleGraphQLError(error);
  }
}

/**
 * List all registrations for the current user
 */
export async function listMyRegistrations(
  input?: ListRegistrationsInput
): Promise<RegistrationConnection> {
  try {
    const result = (await client.graphql({
      query: LIST_MY_REGISTRATIONS,
      variables: {
        status: input?.status,
        limit: input?.limit || 20,
        nextToken: input?.nextToken,
      },
    })) as GraphQLResult<{ listMyRegistrations: RegistrationConnection }>;

    return result.data?.listMyRegistrations || { items: [], nextToken: null };
  } catch (error) {
    return handleGraphQLError(error);
  }
}

/**
 * Get upcoming registrations (for dashboard)
 */
export async function getUpcomingRegistrations(): Promise<Registration[]> {
  try {
    const result = (await client.graphql({
      query: GET_UPCOMING_REGISTRATIONS,
    })) as GraphQLResult<{ listMyRegistrations: RegistrationConnection }>;

    const items = result.data?.listMyRegistrations?.items || [];
    
    // Filter for upcoming events only
    const now = new Date();
    return items.filter(reg => {
      if (!reg.event) return false;
      const eventStart = new Date(reg.event.startDateTime);
      return eventStart > now && 
             [RegistrationStatus.REGISTERED, RegistrationStatus.PROMOTION_PENDING].includes(reg.status);
    });
  } catch (error) {
    return handleGraphQLError(error);
  }
}

/**
 * Get registration statistics for dashboard
 */
export async function getRegistrationStats(): Promise<RegistrationStats> {
  try {
    const result = (await client.graphql({
      query: GET_REGISTRATION_STATS,
    })) as GraphQLResult<{ getRegistrationStats: RegistrationStats }>;

    return result.data?.getRegistrationStats || {
      totalRegistrations: 0,
      upcomingEvents: 0,
      attendedEvents: 0,
      waitlistedEvents: 0,
      cancelledEvents: 0,
    };
  } catch (error) {
    return handleGraphQLError(error);
  }
}

/**
 * Check if user is registered for an event
 * Returns null if not registered or if registration is cancelled
 */
export async function checkUserRegistration(eventId: string): Promise<Registration | null> {
  try {
    console.log('[API] Checking user registration for event:', eventId);
    const result = (await client.graphql({
      query: CHECK_USER_REGISTRATION,
      variables: { eventId },
      authMode: 'userPool',
    })) as GraphQLResult<{ checkUserRegistration: Registration | null }>;
    
    const registration = result.data?.checkUserRegistration;
    console.log('[API] checkUserRegistration result:', registration);

    // If registration exists but is cancelled, treat as not registered
    if (registration && registration.status === RegistrationStatus.CANCELLED) {
      console.log('[API] Registration is CANCELLED, returning null.');
      return null;
    }

    return registration || null;
  } catch (error: unknown) {
    // Not found is expected, return null instead of throwing
    if ((error as any).errors?.[0]?.extensions?.code === 'NOT_FOUND') {
      return null;
    }
    return handleGraphQLError(error);
  }
}

/**
 * Get event capacity information
 */
export async function getEventCapacity(eventId: string): Promise<EventCapacityInfo> {
  try {
    const result = (await client.graphql({
      query: GET_EVENT_CAPACITY,
      variables: { eventId },
    })) as GraphQLResult<{ getEventCapacity: EventCapacityInfo }>;

    if (!result.data?.getEventCapacity) {
      throw new RegistrationError('Event capacity info not found', 'NOT_FOUND');
    }

    return result.data.getEventCapacity;
  } catch (error) {
    return handleGraphQLError(error);
  }
}

/**
 * MUTATION FUNCTIONS
 */

/**
 * Register for an event
 * Automatically generates idempotency key if not provided
 * Prevents duplicate registrations using the idempotency key
 */
export async function registerForEvent(
  input: RegisterForEventInput,
  userId?: string
): Promise<Registration> {
  try {
    // Generate idempotency key if not provided
    const idempotencyKey = input.idempotencyKey || 
      (userId ? generateIdempotencyKey(userId, input.eventId) : undefined);

    const result = (await client.graphql({
      query: REGISTER_FOR_EVENT,
      variables: {
        eventId: input.eventId,
        idempotencyKey,
      },
    })) as GraphQLResult<{ registerForEvent: Registration }>;

    if (!result.data?.registerForEvent) {
      throw new RegistrationError('Failed to register for event', 'REGISTRATION_FAILED');
    }

    return result.data.registerForEvent;
  } catch (error: any) {
    // Handle specific registration errors
    const code = error.errors?.[0]?.extensions?.code;
    
    if (code === 'EVENT_FULL') {
      throw new RegistrationError(
        'This event is at capacity. You have been added to the waitlist.',
        'EVENT_FULL',
        error
      );
    }
    
    if (code === 'ALREADY_REGISTERED') {
      throw new RegistrationError(
        'You are already registered for this event.',
        'ALREADY_REGISTERED',
        error
      );
    }
    
    if (code === 'EVENT_STARTED') {
      throw new RegistrationError(
        'Registration closed. This event has already started.',
        'EVENT_STARTED',
        error
      );
    }
    
    if (code === 'RATE_LIMIT_EXCEEDED') {
      throw new RegistrationError(
        'Too many registration attempts. Please wait a moment and try again.',
        'RATE_LIMIT_EXCEEDED',
        error
      );
    }
    
    return handleGraphQLError(error);
  }
}

/**
 * Cancel a registration
 * Automatically promotes next person from waitlist if applicable
 */
export async function cancelRegistration(
  input: CancelRegistrationInput
): Promise<Registration> {
  try {
    const result = (await client.graphql({
      query: CANCEL_REGISTRATION,
      variables: {
        registrationId: input.registrationId,
      },
    })) as GraphQLResult<{ cancelRegistration: Registration }>;

    if (!result.data?.cancelRegistration) {
      throw new RegistrationError('Failed to cancel registration', 'CANCELLATION_FAILED');
    }

    return result.data.cancelRegistration;
  } catch (error: any) {
    const code = error.errors?.[0]?.extensions?.code;
    
    if (code === 'EVENT_STARTED') {
      throw new RegistrationError(
        'Cannot cancel registration. Event has already started.',
        'EVENT_STARTED',
        error
      );
    }
    
    if (code === 'ALREADY_CANCELLED') {
      throw new RegistrationError(
        'This registration has already been cancelled.',
        'ALREADY_CANCELLED',
        error
      );
    }
    
    return handleGraphQLError(error);
  }
}

/**
 * Accept waitlist promotion
 * User has 24 hours to accept after being promoted
 */
export async function acceptPromotion(registrationId: string): Promise<Registration> {
  try {
    const result = (await client.graphql({
      query: ACCEPT_PROMOTION,
      variables: { registrationId },
    })) as GraphQLResult<{ acceptPromotion: Registration }>;

    if (!result.data?.acceptPromotion) {
      throw new RegistrationError('Failed to accept promotion', 'ACCEPT_FAILED');
    }

    return result.data.acceptPromotion;
  } catch (error: any) {
    const code = error.errors?.[0]?.extensions?.code;
    
    if (code === 'PROMOTION_EXPIRED') {
      throw new RegistrationError(
        'Promotion window has expired. The spot has been offered to the next person in line.',
        'PROMOTION_EXPIRED',
        error
      );
    }
    
    return handleGraphQLError(error);
  }
}

/**
 * Decline waitlist promotion
 * Promotes next person in waitlist
 */
export async function declinePromotion(registrationId: string): Promise<Registration> {
  try {
    const result = (await client.graphql({
      query: DECLINE_PROMOTION,
      variables: { registrationId },
    })) as GraphQLResult<{ declinePromotion: Registration }>;

    if (!result.data?.declinePromotion) {
      throw new RegistrationError('Failed to decline promotion', 'DECLINE_FAILED');
    }

    return result.data.declinePromotion;
  } catch (error) {
    return handleGraphQLError(error);
  }
}

/**
 * Check in attendee using QR code
 * Organizer/Admin only
 */
export async function checkInAttendee(input: CheckInAttendeeInput): Promise<Registration> {
  try {
    const result = (await client.graphql({
      query: CHECK_IN_ATTENDEE,
      variables: {
        registrationId: input.registrationId,
        qrCode: input.qrCode,
      },
    })) as GraphQLResult<{ checkInAttendee: Registration }>;

    if (!result.data?.checkInAttendee) {
      throw new RegistrationError('Failed to check in attendee', 'CHECKIN_FAILED');
    }

    return result.data.checkInAttendee;
  } catch (error: any) {
    const code = error.errors?.[0]?.extensions?.code;
    
    if (code === 'INVALID_QR_CODE') {
      throw new RegistrationError(
        'Invalid QR code. Please try scanning again.',
        'INVALID_QR_CODE',
        error
      );
    }
    
    if (code === 'ALREADY_CHECKED_IN') {
      throw new RegistrationError(
        'This attendee has already been checked in.',
        'ALREADY_CHECKED_IN',
        error
      );
    }
    
    return handleGraphQLError(error);
  }
}

/**
 * HELPER FUNCTIONS
 */

/**
 * Get registrations by status
 */
export async function getRegistrationsByStatus(
  status: RegistrationStatus
): Promise<Registration[]> {
  const result = await listMyRegistrations({ status });
  return result.items;
}

/**
 * Get active registrations (REGISTERED + PROMOTION_PENDING)
 */
export async function getActiveRegistrations(): Promise<Registration[]> {
  const result = await listMyRegistrations();
  return result.items.filter(reg =>
    [RegistrationStatus.REGISTERED, RegistrationStatus.PROMOTION_PENDING].includes(reg.status)
  );
}

/**
 * Get waitlisted registrations
 */
export async function getWaitlistedRegistrations(): Promise<Registration[]> {
  return getRegistrationsByStatus(RegistrationStatus.WAITLISTED);
}

/**
 * Get past registrations (ATTENDED + NO_SHOW + CANCELLED)
 */
export async function getPastRegistrations(): Promise<Registration[]> {
  const result = await listMyRegistrations();
  return result.items.filter(reg =>
    [RegistrationStatus.ATTENDED, RegistrationStatus.NO_SHOW, RegistrationStatus.CANCELLED].includes(reg.status)
  );
}

/**
 * Check if user can register for event
 * Returns { canRegister: boolean, reason?: string }
 */
export async function canRegisterForEvent(eventId: string): Promise<{
  canRegister: boolean;
  reason?: string;
  existingRegistration?: Registration;
}> {
  // Check if already registered
  const existing = await checkUserRegistration(eventId);
  if (existing) {
    return {
      canRegister: false,
      reason: 'Already registered',
      existingRegistration: existing,
    };
  }
  
  // Check event capacity
  try {
    const capacity = await getEventCapacity(eventId);
    if (capacity.isFull) {
      return {
        canRegister: true, // Can still register but will be waitlisted
        reason: 'Event full - will be waitlisted',
      };
    }
  } catch (error) {
    // If we can't get capacity info, assume we can try to register
    console.error('Error checking event capacity:', error);
  }
  
  return { canRegister: true };
}

/**
 * Export all functions
 */
export const registrationsAPI = {
  // Queries
  getRegistration,
  listMyRegistrations,
  getUpcomingRegistrations,
  getRegistrationStats,
  checkUserRegistration,
  getEventCapacity,
  
  // Mutations
  registerForEvent,
  cancelRegistration,
  acceptPromotion,
  declinePromotion,
  checkInAttendee,
  
  // Helpers
  getRegistrationsByStatus,
  getActiveRegistrations,
  getWaitlistedRegistrations,
  getPastRegistrations,
  canRegisterForEvent,
};
