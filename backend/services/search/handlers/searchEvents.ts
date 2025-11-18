import { AppSyncResolverEvent, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import {
  SearchQueryInput,
  SearchResult,
  Event,
  SearchFacets,
  FacetCount,
} from '../../../shared/types/event.types';
import {
  normalizeSearchQuery,
  calculateRelevanceScore,
} from '../../../shared/utils/slug.utils';
import { EventStatus } from '../../../shared/types/common';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;

/**
 * Lambda handler for searchEvents query
 * Implements efficient search using GSIs with optional full-text filtering
 */
export async function handler(
  event: AppSyncResolverEvent<{ input: SearchQueryInput }>,
  context: Context
): Promise<SearchResult> {
  console.log('SearchEvents handler invoked', {
    requestId: context.awsRequestId,
    input: event.arguments.input,
  });

  try {
    const input = event.arguments.input;
    const normalizedQuery = input.query ? normalizeSearchQuery(input.query) : '';
    
    // Default pagination
    const limit = input.pagination?.limit || 20;
    const nextToken = input.pagination?.nextToken;

    // Determine optimal query strategy based on filters
    let events: Event[] = [];
    
    if (input.filters?.locations && input.filters.locations.length > 0) {
      // Strategy 1: Use GSI3 for location-based queries
      events = await queryByLocations(input.filters.locations, input.filters);
    } else if (input.filters?.categories && input.filters.categories.length === 1) {
      // Strategy 2: Use GSI2 for single category queries
      events = await queryByCategory(input.filters.categories[0], input.filters);
    } else {
      // Strategy 3: Use GSI1 for date-based queries (most efficient default)
      events = await queryByDateRange(input.filters);
    }

    // Apply full-text search filter if query provided
    if (normalizedQuery) {
      events = events.filter(evt => 
        evt.searchTerms && evt.searchTerms.toLowerCase().includes(normalizedQuery)
      );
    }

    // Apply additional filters
    events = applyFilters(events, input.filters);

    // Score and sort events by relevance
    const scoredEvents = scoreAndSortEvents(events, normalizedQuery, input.sort);

    // Paginate results
    const paginatedResults = paginateResults(scoredEvents, limit, nextToken);

    // Calculate facets from all matching results
    const facets = calculateFacets(events);

    console.log('Search completed', {
      query: input.query,
      totalResults: events.length,
      returnedResults: paginatedResults.items.length,
    });

    return {
      items: paginatedResults.items,
      total: events.length,
      nextToken: paginatedResults.nextToken,
      facets,
    };
  } catch (error) {
    console.error('Error searching events:', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      tableName: TABLE_NAME,
      input: event.arguments.input,
    });
    
    // Return empty result instead of throwing to prevent GraphQL null errors
    return {
      items: [],
      total: 0,
      nextToken: undefined,
      facets: {
        categories: [],
        locations: [],
        tags: [],
      },
    };
  }
}

/**
 * Query events by date range using GSI1
 * This is the most efficient default strategy
 */
async function queryByDateRange(
  filters?: any
): Promise<Event[]> {
  const now = new Date().toISOString();
  const startDate = filters?.startDateAfter || now;
  const endDate = filters?.startDateBefore || '2099-12-31T23:59:59Z';

  console.log('Querying by date range', { startDate, endDate });

  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK BETWEEN :start AND :end',
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pk': 'EVENT#DATE',
        ':start': startDate,
        ':end': endDate,
        ':status': EventStatus.PUBLISHED,
      },
      Limit: 100, // Get more results for filtering
    })
  );

  return (result.Items || []) as Event[];
}

/**
 * Query events by category using GSI2
 */
async function queryByCategory(
  category: string,
  filters?: any
): Promise<Event[]> {
  const now = new Date().toISOString();
  const startDate = filters?.startDateAfter || now;
  const endDate = filters?.startDateBefore || '2099-12-31T23:59:59Z';

  console.log('Querying by category', { category, startDate, endDate });

  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk AND GSI2SK BETWEEN :start AND :end',
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pk': `EVENT#CATEGORY#${category}`,
        ':start': startDate,
        ':end': endDate,
        ':status': EventStatus.PUBLISHED,
      },
      Limit: 100,
    })
  );

  return (result.Items || []) as Event[];
}

/**
 * Query events by location using GSI3
 */
async function queryByLocations(
  locations: string[],
  filters?: any
): Promise<Event[]> {
  console.log('Querying by locations', { locations });

  const locationResults = await Promise.all(
    locations.map(building =>
      client.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: 'GSI3',
          KeyConditionExpression: 'GSI3PK = :pk',
          FilterExpression: '#status = :status',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':pk': `EVENT#LOCATION#${building}`,
            ':status': EventStatus.PUBLISHED,
          },
          Limit: 100,
        })
      ).then(result => (result.Items || []) as Event[])
    )
  );

  // Flatten and deduplicate
  const allEvents = locationResults.flat();
  return deduplicateEvents(allEvents);
}

/**
 * Apply additional filters to events
 */
function applyFilters(events: Event[], filters?: any): Event[] {
  let filtered = events;

  // Category filter (when multiple categories or not used as primary query)
  if (filters?.categories && filters.categories.length > 0) {
    filtered = filtered.filter(event =>
      filters.categories.includes(event.category)
    );
  }

  // Available seats filter
  if (filters?.hasAvailableSeats) {
    filtered = filtered.filter(event => 
      (event.availableSeats || 0) > 0
    );
  }

  // Tags filter
  if (filters?.tags && filters.tags.length > 0) {
    filtered = filtered.filter(event =>
      filters.tags.some((tag: string) => event.tags.includes(tag))
    );
  }

  return filtered;
}

/**
 * Score and sort events by relevance or date
 */
function scoreAndSortEvents(
  events: Event[],
  query: string,
  sort?: { field: string; order: string }
): Event[] {
  // Calculate relevance scores
  const scoredEvents = events.map(event => ({
    ...event,
    _relevanceScore: query
      ? calculateRelevanceScore(query, event.searchTerms || '', event.title)
      : 0,
  }));

  // Sort
  const sortField = sort?.field || (query ? 'relevance' : 'startDateTime');
  const sortOrder = sort?.order || 'asc';

  scoredEvents.sort((a, b) => {
    let comparison = 0;

    if (sortField === 'relevance') {
      comparison = b._relevanceScore - a._relevanceScore;
    } else if (sortField === 'startDateTime') {
      comparison = new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime();
    } else if (sortField === 'createdAt') {
      comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });

  return scoredEvents;
}

/**
 * Deduplicate events by ID
 */
function deduplicateEvents(events: Event[]): Event[] {
  const seen = new Set<string>();
  return events.filter(event => {
    if (seen.has(event.id)) {
      return false;
    }
    seen.add(event.id);
    return true;
  });
}

/**
 * Paginate results using offset-based pagination
 */
function paginateResults(
  events: Event[],
  limit: number,
  nextToken?: string
): { items: Event[]; nextToken?: string } {
  const startIndex = nextToken ? parseInt(Buffer.from(nextToken, 'base64').toString()) : 0;
  const endIndex = startIndex + limit;
  const items = events.slice(startIndex, endIndex);
  
  const hasMore = endIndex < events.length;
  const newNextToken = hasMore
    ? Buffer.from(endIndex.toString()).toString('base64')
    : undefined;

  return { items, nextToken: newNextToken };
}

/**
 * Calculate facets for filter aggregations
 */
function calculateFacets(events: Event[]): SearchFacets {
  const categories = new Map<string, number>();
  const locations = new Map<string, number>();
  const tags = new Map<string, number>();

  events.forEach(event => {
    // Category facets
    categories.set(event.category, (categories.get(event.category) || 0) + 1);

    // Location facets
    const building = event.location.building;
    locations.set(building, (locations.get(building) || 0) + 1);

    // Tag facets
    event.tags.forEach(tag => {
      tags.set(tag, (tags.get(tag) || 0) + 1);
    });
  });

  return {
    categories: mapToFacetCounts(categories),
    locations: mapToFacetCounts(locations),
    tags: mapToFacetCounts(tags),
  };
}

/**
 * Convert Map to FacetCount array
 */
function mapToFacetCounts(map: Map<string, number>): FacetCount[] {
  return Array.from(map.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}
