import { AppSyncResolverEvent, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetItemCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Event } from '../../../shared/types/event.types';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;

// Simple in-memory cache (5 minutes TTL)
const cache = new Map<string, { event: Event | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Lambda handler for getEventBySlug query
 * Retrieves event by URL slug with caching
 */
export async function handler(
  event: AppSyncResolverEvent<{ slug: string }>,
  context: Context
): Promise<Event | null> {
  console.log('GetEventBySlug handler invoked', {
    requestId: context.awsRequestId,
    slug: event.arguments.slug,
  });

  try {
    const slug = event.arguments.slug;

    // Check cache
    const cached = cache.get(slug);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Returning cached event', { slug });
      return cached.event;
    }

    // Step 1: Query slug lookup table to get eventId
    const slugLookup = await client.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND SK = :sk',
        ExpressionAttributeValues: {
          ':pk': `EVENT#SLUG#${slug}`,
          ':sk': 'METADATA',
        },
        Limit: 1,
      })
    );

    if (!slugLookup.Items || slugLookup.Items.length === 0) {
      console.log('Slug not found', { slug });
      
      // Cache null result to prevent repeated lookups
      cache.set(slug, { event: null, timestamp: Date.now() });
      
      return null;
    }

    const eventId = slugLookup.Items[0].eventId;

    // Step 2: Get full event details
    const eventResult = await client.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `EVENT#${eventId}`,
          SK: 'METADATA',
        },
      })
    );

    if (!eventResult.Item) {
      console.log('Event not found', { eventId });
      
      // Cache null result
      cache.set(slug, { event: null, timestamp: Date.now() });
      
      return null;
    }

    const fullEvent = eventResult.Item as Event;

    // Cache the result
    cache.set(slug, { event: fullEvent, timestamp: Date.now() });

    console.log('Event retrieved by slug', {
      slug,
      eventId: fullEvent.id,
      title: fullEvent.title,
    });

    return fullEvent;
  } catch (error) {
    console.error('Error getting event by slug:', error);
    throw error;
  }
}

/**
 * Periodically clean expired cache entries
 * Called by CloudWatch Events (optional)
 */
export function cleanCache() {
  const now = Date.now();
  const expiredKeys: string[] = [];

  cache.forEach((value, key) => {
    if (now - value.timestamp >= CACHE_TTL) {
      expiredKeys.push(key);
    }
  });

  expiredKeys.forEach(key => cache.delete(key));

  console.log('Cache cleaned', {
    expiredCount: expiredKeys.length,
    remainingCount: cache.size,
  });
}
