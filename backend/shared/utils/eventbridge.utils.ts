import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsCommandInput,
} from '@aws-sdk/client-eventbridge';
import {
  Event,
  EventDomainEvent,
  EventDomainEventType,
  EventCreatedEvent,
  EventUpdatedEvent,
  EventPublishedEvent,
  EventCancelledEvent,
} from '../types/event.types';

const client = new EventBridgeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || 'terrapin-events-dev';
const EVENT_SOURCE = 'com.terrapin.events';

/**
 * Publish domain event to EventBridge
 */
async function publishDomainEvent(event: EventDomainEvent): Promise<void> {
  const params: PutEventsCommandInput = {
    Entries: [
      {
        Source: EVENT_SOURCE,
        DetailType: event.eventType,
        Detail: JSON.stringify(event),
        EventBusName: EVENT_BUS_NAME,
        Time: new Date(event.timestamp),
      },
    ],
  };

  try {
    const response = await client.send(new PutEventsCommand(params));

    if (response.FailedEntryCount && response.FailedEntryCount > 0) {
      console.error('Failed to publish event:', response.Entries);
      throw new Error('Failed to publish domain event to EventBridge');
    }

    console.log(`Published ${event.eventType} event for eventId: ${event.eventId}`);
  } catch (error) {
    console.error('Error publishing domain event:', error);
    throw error;
  }
}

/**
 * Publish EVENT_CREATED domain event
 */
export async function publishEventCreated(event: Event): Promise<void> {
  const domainEvent: EventCreatedEvent = {
    eventType: EventDomainEventType.EVENT_CREATED,
    eventId: event.id,
    timestamp: new Date().toISOString(),
    event,
    metadata: {
      organizerId: event.organizerId,
      category: event.category,
      startDateTime: event.startDateTime,
    },
  };

  await publishDomainEvent(domainEvent);
}

/**
 * Publish EVENT_UPDATED domain event
 */
export async function publishEventUpdated(
  event: Event,
  changes: Partial<Event>
): Promise<void> {
  const domainEvent: EventUpdatedEvent = {
    eventType: EventDomainEventType.EVENT_UPDATED,
    eventId: event.id,
    timestamp: new Date().toISOString(),
    event,
    changes,
    metadata: {
      organizerId: event.organizerId,
      updatedFields: Object.keys(changes),
    },
  };

  await publishDomainEvent(domainEvent);
}

/**
 * Publish EVENT_PUBLISHED domain event
 */
export async function publishEventPublished(event: Event): Promise<void> {
  const domainEvent: EventPublishedEvent = {
    eventType: EventDomainEventType.EVENT_PUBLISHED,
    eventId: event.id,
    timestamp: new Date().toISOString(),
    event,
    metadata: {
      organizerId: event.organizerId,
      category: event.category,
      startDateTime: event.startDateTime,
      capacity: event.capacity,
    },
  };

  await publishDomainEvent(domainEvent);
}

/**
 * Publish EVENT_CANCELLED domain event
 */
export async function publishEventCancelled(
  event: Event,
  reason?: string
): Promise<void> {
  const domainEvent: EventCancelledEvent = {
    eventType: EventDomainEventType.EVENT_CANCELLED,
    eventId: event.id,
    timestamp: new Date().toISOString(),
    event,
    reason,
    metadata: {
      organizerId: event.organizerId,
      registeredCount: event.registeredCount,
      waitlistCount: event.waitlistCount,
    },
  };

  await publishDomainEvent(domainEvent);
}

/**
 * Publish CAPACITY_UPDATED domain event
 */
export async function publishCapacityUpdated(
  eventId: string,
  oldCapacity: number,
  newCapacity: number,
  registeredCount: number
): Promise<void> {
  const domainEvent: EventDomainEvent = {
    eventType: EventDomainEventType.CAPACITY_UPDATED,
    eventId,
    timestamp: new Date().toISOString(),
    metadata: {
      oldCapacity,
      newCapacity,
      registeredCount,
      availableSeats: newCapacity - registeredCount,
    },
  };

  await publishDomainEvent(domainEvent);
}

/**
 * Batch publish multiple domain events
 */
export async function publishDomainEventsBatch(
  events: EventDomainEvent[]
): Promise<void> {
  if (events.length === 0) {
    return;
  }

  const entries = events.map((event) => ({
    Source: EVENT_SOURCE,
    DetailType: event.eventType,
    Detail: JSON.stringify(event),
    EventBusName: EVENT_BUS_NAME,
    Time: new Date(event.timestamp),
  }));

  // EventBridge allows max 10 events per PutEvents call
  const batchSize = 10;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);

    const params: PutEventsCommandInput = {
      Entries: batch,
    };

    try {
      const response = await client.send(new PutEventsCommand(params));

      if (response.FailedEntryCount && response.FailedEntryCount > 0) {
        console.error('Failed to publish some events in batch:', response.Entries);
        throw new Error('Failed to publish some domain events to EventBridge');
      }

      console.log(`Published batch of ${batch.length} domain events`);
    } catch (error) {
      console.error('Error publishing domain events batch:', error);
      throw error;
    }
  }
}
