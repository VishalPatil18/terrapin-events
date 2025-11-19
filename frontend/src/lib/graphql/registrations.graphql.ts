/**
 * GraphQL Operations for Registrations
 * TEMS - Terrapin Events Management System
 * 
 * Defines all GraphQL queries, mutations, and subscriptions
 * for the registration system.
 */

/**
 * Registration Fragment
 * Core fields returned for all registration operations
 */
export const REGISTRATION_FRAGMENT = /* GraphQL */ `
  fragment RegistrationFields on Registration {
    id
    userId
    eventId
    status
    qrCode
    waitlistPosition
    registeredAt
    attendedAt
    promotionDeadline
  }
`;

/**
 * Registration with Event Details Fragment
 * Includes full event information with registration
 * Note: organizer field removed to avoid null errors until Event.organizer resolver is deployed
 */
export const REGISTRATION_WITH_EVENT_FRAGMENT = /* GraphQL */ `
  fragment RegistrationWithEventFields on Registration {
    ...RegistrationFields
    event {
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
        coordinates {
          latitude
          longitude
        }
      }
      category
      capacity
      registeredCount
      waitlistCount
      status
      imageUrl
    }
  }
  ${REGISTRATION_FRAGMENT}
`;

/**
 * QUERIES
 */

/**
 * Get a single registration by ID
 */
export const GET_REGISTRATION = /* GraphQL */ `
  query GetRegistration($id: ID!) {
    getRegistration(id: $id) {
      ...RegistrationWithEventFields
    }
  }
  ${REGISTRATION_WITH_EVENT_FRAGMENT}
`;

/**
 * List all registrations for the current user
 * Includes full event details for each registration
 */
export const LIST_MY_REGISTRATIONS = /* GraphQL */ `
  query ListMyRegistrations($status: RegistrationStatus, $limit: Int, $nextToken: String) {
    listMyRegistrations(status: $status, limit: $limit, nextToken: $nextToken) {
      items {
        ...RegistrationWithEventFields
      }
      nextToken
    }
  }
  ${REGISTRATION_WITH_EVENT_FRAGMENT}
`;

/**
 * Get upcoming registrations (for dashboard)
 * Filters for REGISTERED and PROMOTION_PENDING statuses
 */
export const GET_UPCOMING_REGISTRATIONS = /* GraphQL */ `
  query GetUpcomingRegistrations {
    listMyRegistrations(limit: 10) {
      items {
        ...RegistrationWithEventFields
      }
    }
  }
  ${REGISTRATION_WITH_EVENT_FRAGMENT}
`;

/**
 * Get registration statistics for dashboard
 */
export const GET_REGISTRATION_STATS = /* GraphQL */ `
  query GetRegistrationStats {
    getRegistrationStats {
      totalRegistrations
      upcomingEvents
      attendedEvents
      waitlistedEvents
      cancelledEvents
    }
  }
`;

/**
 * Check if user is registered for an event
 */
export const CHECK_USER_REGISTRATION = /* GraphQL */ `
  query CheckUserRegistration($eventId: ID!) {
    checkUserRegistration(eventId: $eventId) {
      ...RegistrationFields
    }
  }
  ${REGISTRATION_FRAGMENT}
`;

/**
 * Get event capacity information
 * Used to determine if registration will be waitlisted
 */
export const GET_EVENT_CAPACITY = /* GraphQL */ `
  query GetEventCapacity($eventId: ID!) {
    getEventCapacity(eventId: $eventId) {
      eventId
      capacity
      registeredCount
      waitlistCount
      availableSeats
      isFull
    }
  }
`;

/**
 * MUTATIONS
 */

/**
 * Register for an event
 * Creates a new registration or adds user to waitlist if event is full
 * Uses idempotency key to prevent duplicate registrations
 */
export const REGISTER_FOR_EVENT = /* GraphQL */ `
  mutation RegisterForEvent($eventId: ID!, $idempotencyKey: String) {
    registerForEvent(eventId: $eventId, idempotencyKey: $idempotencyKey) {
      ...RegistrationWithEventFields
    }
  }
  ${REGISTRATION_WITH_EVENT_FRAGMENT}
`;

/**
 * Cancel a registration
 * Automatically promotes next person from waitlist if applicable
 */
export const CANCEL_REGISTRATION = /* GraphQL */ `
  mutation CancelRegistration($registrationId: ID!) {
    cancelRegistration(registrationId: $registrationId) {
      ...RegistrationFields
    }
  }
  ${REGISTRATION_FRAGMENT}
`;

/**
 * Accept waitlist promotion
 * User has 24 hours to accept after being promoted
 */
export const ACCEPT_PROMOTION = /* GraphQL */ `
  mutation AcceptPromotion($registrationId: ID!) {
    acceptPromotion(id: $registrationId) {
      ...RegistrationWithEventFields
    }
  }
  ${REGISTRATION_WITH_EVENT_FRAGMENT}
`;

/**
 * Decline waitlist promotion
 * Promotes next person in waitlist
 */
export const DECLINE_PROMOTION = /* GraphQL */ `
  mutation DeclinePromotion($registrationId: ID!) {
    declinePromotion(id: $registrationId) {
      ...RegistrationFields
    }
  }
  ${REGISTRATION_FRAGMENT}
`;

/**
 * Check in attendee using QR code
 * Organizer/Admin only - marks registration as ATTENDED
 */
export const CHECK_IN_ATTENDEE = /* GraphQL */ `
  mutation CheckInAttendee($registrationId: ID!, $qrCode: String!) {
    checkInAttendee(registrationId: $registrationId, qrCode: $qrCode) {
      ...RegistrationFields
    }
  }
  ${REGISTRATION_FRAGMENT}
`;

/**
 * SUBSCRIPTIONS
 */

/**
 * Subscribe to registration updates for a specific event
 * Useful for organizers to see real-time registrations
 */
export const ON_NEW_REGISTRATION = /* GraphQL */ `
  subscription OnNewRegistration($eventId: ID!) {
    onNewRegistration(eventId: $eventId) {
      ...RegistrationFields
      event {
        id
        title
        registeredCount
        waitlistCount
      }
    }
  }
  ${REGISTRATION_FRAGMENT}
`;

/**
 * Subscribe to registration updates for current user
 * Useful for getting promotion notifications in real-time
 */
export const ON_REGISTRATION_UPDATE = /* GraphQL */ `
  subscription OnRegistrationUpdate($userId: ID!) {
    onRegistrationUpdate(userId: $userId) {
      ...RegistrationWithEventFields
    }
  }
  ${REGISTRATION_WITH_EVENT_FRAGMENT}
`;

/**
 * Subscribe to waitlist promotions
 * Notifies user when they've been promoted from waitlist
 */
export const ON_WAITLIST_PROMOTION = /* GraphQL */ `
  subscription OnWaitlistPromotion($userId: ID!) {
    onWaitlistPromotion(userId: $userId) {
      ...RegistrationWithEventFields
      promotionDeadline
    }
  }
  ${REGISTRATION_WITH_EVENT_FRAGMENT}
`;

/**
 * Export all operations for easy importing
 */
export const registrationQueries = {
  GET_REGISTRATION,
  LIST_MY_REGISTRATIONS,
  GET_UPCOMING_REGISTRATIONS,
  GET_REGISTRATION_STATS,
  CHECK_USER_REGISTRATION,
  GET_EVENT_CAPACITY,
};

export const registrationMutations = {
  REGISTER_FOR_EVENT,
  CANCEL_REGISTRATION,
  ACCEPT_PROMOTION,
  DECLINE_PROMOTION,
  CHECK_IN_ATTENDEE,
};

export const registrationSubscriptions = {
  ON_NEW_REGISTRATION,
  ON_REGISTRATION_UPDATE,
  ON_WAITLIST_PROMOTION,
};
