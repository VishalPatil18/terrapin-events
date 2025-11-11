/**
 * GraphQL queries and mutations for Events
 */

// Event Fragment
export const EVENT_FRAGMENT = /* GraphQL */ `
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
      coordinates {
        latitude
        longitude
      }
    }
    category
    capacity
    registeredCount
    waitlistCount
    organizerId
    status
    tags
    imageUrl
    createdAt
    updatedAt
  }
`;

// Queries
export const GET_EVENT = /* GraphQL */ `
  query GetEvent($id: ID!) {
    getEvent(id: $id) {
      ...EventFields
    }
  }
  ${EVENT_FRAGMENT}
`;

export const LIST_EVENTS = /* GraphQL */ `
  query ListEvents($filter: EventFilter, $limit: Int, $nextToken: String) {
    listEvents(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        ...EventFields
      }
      nextToken
    }
  }
  ${EVENT_FRAGMENT}
`;

export const SEARCH_EVENTS = /* GraphQL */ `
  query SearchEvents($query: String!) {
    searchEvents(query: $query) {
      ...EventFields
    }
  }
  ${EVENT_FRAGMENT}
`;

// Mutations
export const CREATE_EVENT = /* GraphQL */ `
  mutation CreateEvent($input: CreateEventInput!) {
    createEvent(input: $input) {
      ...EventFields
    }
  }
  ${EVENT_FRAGMENT}
`;

export const UPDATE_EVENT = /* GraphQL */ `
  mutation UpdateEvent($id: ID!, $input: UpdateEventInput!) {
    updateEvent(id: $id, input: $input) {
      ...EventFields
    }
  }
  ${EVENT_FRAGMENT}
`;

export const DELETE_EVENT = /* GraphQL */ `
  mutation DeleteEvent($id: ID!) {
    deleteEvent(id: $id) {
      ...EventFields
    }
  }
  ${EVENT_FRAGMENT}
`;

export const PUBLISH_EVENT = /* GraphQL */ `
  mutation PublishEvent($id: ID!) {
    publishEvent(id: $id) {
      ...EventFields
    }
  }
  ${EVENT_FRAGMENT}
`;

// Subscriptions
export const ON_EVENT_UPDATE = /* GraphQL */ `
  subscription OnEventUpdate($eventId: ID!) {
    onEventUpdate(eventId: $eventId) {
      ...EventFields
    }
  }
  ${EVENT_FRAGMENT}
`;
