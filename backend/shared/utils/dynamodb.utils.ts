import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  QueryCommand,
  QueryCommandInput,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Event, EventFilter, VenueBooking } from '../types/event.types';
import { EventStatus } from '../types/common';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'terrapin-events-dev';

/**
 * Generate unique event ID
 */
export function generateEventId(): string {
  // Using nanoid-like format: evt- prefix + 21 char alphanumeric
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'evt-';
  for (let i = 0; i < 21; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * Convert Event to DynamoDB item
 */
export function eventToDynamoDBItem(event: Partial<Event>): Record<string, any> {
  const timestamp = new Date().toISOString();

  return {
    PK: `EVENT#${event.id}`,
    SK: 'METADATA',
    GSI1PK: `EVENT#DATE`,
    GSI1SK: event.startDateTime,
    GSI2PK: `EVENT#CATEGORY#${event.category}`,
    GSI2SK: event.startDateTime,
    entityType: 'Event',
    id: event.id,
    title: event.title,
    description: event.description,
    startDateTime: event.startDateTime,
    endDateTime: event.endDateTime,
    location: event.location,
    category: event.category,
    capacity: event.capacity,
    registeredCount: event.registeredCount || 0,
    waitlistCount: event.waitlistCount || 0,
    organizerId: event.organizerId,
    status: event.status || EventStatus.DRAFT,
    tags: event.tags || [],
    imageUrl: event.imageUrl,
    version: event.version || 1,
    createdAt: event.createdAt || timestamp,
    updatedAt: timestamp,
  };
}

/**
 * Convert DynamoDB item to Event
 */
export function dynamoDBItemToEvent(item: Record<string, any>): Event {
  return {
    PK: item.PK,
    SK: item.SK,
    GSI1PK: item.GSI1PK,
    GSI1SK: item.GSI1SK,
    GSI2PK: item.GSI2PK,
    GSI2SK: item.GSI2SK,
    id: item.id,
    title: item.title,
    description: item.description,
    startDateTime: item.startDateTime,
    endDateTime: item.endDateTime,
    location: item.location,
    category: item.category,
    capacity: item.capacity,
    registeredCount: item.registeredCount,
    waitlistCount: item.waitlistCount,
    organizerId: item.organizerId,
    status: item.status,
    tags: item.tags,
    imageUrl: item.imageUrl,
    version: item.version,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/**
 * Put event into DynamoDB
 */
export async function putEvent(event: Event): Promise<Event> {
  const item = eventToDynamoDBItem(event);

  await client.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: marshall(item, { removeUndefinedValues: true }),
    })
  );

  return event;
}

/**
 * Get event by ID
 */
export async function getEvent(eventId: string): Promise<Event | null> {
  const response = await client.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        PK: `EVENT#${eventId}`,
        SK: 'METADATA',
      }),
    })
  );

  if (!response.Item) {
    return null;
  }

  return dynamoDBItemToEvent(unmarshall(response.Item));
}

/**
 * Update event with optimistic locking
 */
export async function updateEvent(
  eventId: string,
  updates: Partial<Event>,
  currentVersion: number
): Promise<Event> {
  const timestamp = new Date().toISOString();
  
  // Build update expression dynamically
  const updateExpressionParts: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined && key !== 'id' && key !== 'PK' && key !== 'SK') {
      const attrName = `#${key}`;
      const attrValue = `:${key}`;
      updateExpressionParts.push(`${attrName} = ${attrValue}`);
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = value;
    }
  });

  // Always update version and updatedAt
  updateExpressionParts.push('#version = :newVersion', '#updatedAt = :updatedAt');
  expressionAttributeNames['#version'] = 'version';
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':newVersion'] = currentVersion + 1;
  expressionAttributeValues[':updatedAt'] = timestamp;
  expressionAttributeValues[':currentVersion'] = currentVersion;

  const response = await client.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        PK: `EVENT#${eventId}`,
        SK: 'METADATA',
      }),
      UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
      ConditionExpression: '#version = :currentVersion',
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: marshall(expressionAttributeValues, {
        removeUndefinedValues: true,
      }),
      ReturnValues: 'ALL_NEW',
    })
  );

  if (!response.Attributes) {
    throw new Error('Failed to update event');
  }

  return dynamoDBItemToEvent(unmarshall(response.Attributes));
}

/**
 * Update event status
 */
export async function updateEventStatus(
  eventId: string,
  status: EventStatus
): Promise<Event> {
  const timestamp = new Date().toISOString();

  const response = await client.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        PK: `EVENT#${eventId}`,
        SK: 'METADATA',
      }),
      UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt, #version = #version + :inc',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#updatedAt': 'updatedAt',
        '#version': 'version',
      },
      ExpressionAttributeValues: marshall({
        ':status': status,
        ':updatedAt': timestamp,
        ':inc': 1,
      }),
      ReturnValues: 'ALL_NEW',
    })
  );

  if (!response.Attributes) {
    throw new Error('Failed to update event status');
  }

  return dynamoDBItemToEvent(unmarshall(response.Attributes));
}

/**
 * Delete event (soft delete by setting status to CANCELLED)
 */
export async function deleteEvent(eventId: string): Promise<void> {
  const timestamp = new Date().toISOString();

  await client.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        PK: `EVENT#${eventId}`,
        SK: 'METADATA',
      }),
      UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: marshall({
        ':status': EventStatus.CANCELLED,
        ':updatedAt': timestamp,
      }),
    })
  );
}

/**
 * Query events by date range
 */
export async function queryEventsByDateRange(
  startDate: string,
  endDate?: string,
  limit: number = 20,
  nextToken?: string
): Promise<{ items: Event[]; nextToken?: string }> {
  const queryInput: QueryCommandInput = {
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: marshall({
      ':pk': 'EVENT#DATE',
    }),
    Limit: limit,
  };

  if (endDate) {
    queryInput.KeyConditionExpression += ' AND GSI1SK BETWEEN :start AND :end';
    queryInput.ExpressionAttributeValues = marshall({
      ':pk': 'EVENT#DATE',
      ':start': startDate,
      ':end': endDate,
    });
  } else {
    queryInput.KeyConditionExpression += ' AND GSI1SK >= :start';
    queryInput.ExpressionAttributeValues = marshall({
      ':pk': 'EVENT#DATE',
      ':start': startDate,
    });
  }

  if (nextToken) {
    queryInput.ExclusiveStartKey = JSON.parse(
      Buffer.from(nextToken, 'base64').toString()
    );
  }

  const response = await client.send(new QueryCommand(queryInput));

  const items = (response.Items || []).map((item) => 
    dynamoDBItemToEvent(unmarshall(item))
  );

  let returnToken: string | undefined;
  if (response.LastEvaluatedKey) {
    returnToken = Buffer.from(JSON.stringify(response.LastEvaluatedKey)).toString(
      'base64'
    );
  }

  return { items, nextToken: returnToken };
}

/**
 * Query events by category
 */
export async function queryEventsByCategory(
  category: string,
  limit: number = 20,
  nextToken?: string
): Promise<{ items: Event[]; nextToken?: string }> {
  const queryInput: QueryCommandInput = {
    TableName: TABLE_NAME,
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :pk',
    ExpressionAttributeValues: marshall({
      ':pk': `EVENT#CATEGORY#${category}`,
    }),
    Limit: limit,
  };

  if (nextToken) {
    queryInput.ExclusiveStartKey = JSON.parse(
      Buffer.from(nextToken, 'base64').toString()
    );
  }

  const response = await client.send(new QueryCommand(queryInput));

  const items = (response.Items || []).map((item) => 
    dynamoDBItemToEvent(unmarshall(item))
  );

  let returnToken: string | undefined;
  if (response.LastEvaluatedKey) {
    returnToken = Buffer.from(JSON.stringify(response.LastEvaluatedKey)).toString(
      'base64'
    );
  }

  return { items, nextToken: returnToken };
}

/**
 * Create venue booking for conflict detection
 */
export async function createVenueBooking(
  eventId: string,
  building: string,
  room: string,
  startDateTime: string,
  endDateTime: string
): Promise<void> {
  const venueId = `${building}#${room}`;
  const bookingItem = {
    PK: `VENUE#${venueId}`,
    SK: `BOOKING#${startDateTime}`,
    entityType: 'VenueBooking',
    venueId,
    eventId,
    startDateTime,
    endDateTime,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await client.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: marshall(bookingItem, { removeUndefinedValues: true }),
    })
  );
}

/**
 * Create slug lookup item for URL-based queries
 * Week 7: Enable getEventBySlug queries
 */
export async function createSlugLookup(
  slug: string,
  eventId: string
): Promise<void> {
  const lookupItem = {
    PK: `EVENT#SLUG#${slug}`,
    SK: 'METADATA',
    entityType: 'SlugLookup',
    slug,
    eventId,
    createdAt: new Date().toISOString(),
  };

  await client.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: marshall(lookupItem, { removeUndefinedValues: true }),
    })
  );
}

/**
 * Check for venue conflicts
 */
export async function checkVenueConflict(
  building: string,
  room: string,
  startDateTime: string,
  endDateTime: string,
  excludeEventId?: string
): Promise<boolean> {
  const venueId = `${building}#${room}`;

  const response = await client.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND SK BETWEEN :startKey AND :endKey',
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: marshall({
        ':pk': `VENUE#${venueId}`,
        ':startKey': `BOOKING#${new Date(Date.parse(startDateTime) - 24 * 60 * 60 * 1000).toISOString()}`,
        ':endKey': `BOOKING#${new Date(Date.parse(endDateTime) + 24 * 60 * 60 * 1000).toISOString()}`,
        ':status': 'ACTIVE',
      }),
    })
  );

  if (!response.Items || response.Items.length === 0) {
    return false;
  }

  // Check for actual time overlaps
  const requestStart = new Date(startDateTime).getTime();
  const requestEnd = new Date(endDateTime).getTime();

  for (const item of response.Items) {
    const booking = unmarshall(item) as VenueBooking;

    // Skip if this is the same event (for updates)
    if (excludeEventId && booking.eventId === excludeEventId) {
      continue;
    }

    const bookingStart = new Date(booking.startDateTime).getTime();
    const bookingEnd = new Date(booking.endDateTime).getTime();

    // Check for overlap
    if (requestStart < bookingEnd && requestEnd > bookingStart) {
      return true; // Conflict found
    }
  }

  return false;
}
