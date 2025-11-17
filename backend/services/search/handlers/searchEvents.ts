import { AppSyncResolverEvent, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
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
 * Implements full-text search with relevance scoring and faceted filtering
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
    const normalizedQuery = normalizeSearchQuery(input.query);
    
    // Default pagination
    const limit = input.pagination?.limit || 20;
    const nextToken = input.pagination?.nextToken;

    // Build filter expression
    const filterExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {
      '#PK': 'PK',
      '#SK': 'SK',
      '#status': 'status',
      '#searchTerms': 'searchTerms',
    };
    const expressionAttributeValues: Record<string, any> = {
      ':pkPrefix': 'EVENT#',
      ':sk': 'METADATA',
      ':status': EventStatus.PUBLISHED,
    };

    // Base filters: only published events
    filterExpressions.push('begins_with(#PK, :pkPrefix)');
    filterExpressions.push('#SK = :sk');
    filterExpressions.push('#status = :status');

    // Full-text search filter
    if (normalizedQuery) {
      filterExpressions.push('contains(#searchTerms, :query)');
      expressionAttributeValues[':query'] = normalizedQuery;
    }

    // Category filter
    if (input.filters?.categories && input.filters.categories.length > 0) {
      expressionAttributeNames['#category'] = 'category';
      filterExpressions.push(
        `#category IN (${input.filters.categories.map((_, i) => `:cat${i}`).join(',')})`
      );
      input.filters.categories.forEach((cat, i) => {
        expressionAttributeValues[`:cat${i}`] = cat;
      });
    }

    // Location filter (building)
    if (input.filters?.locations && input.filters.locations.length > 0) {
      // Use GSI3 for efficient location queries
      const locationResults = await Promise.all(
        input.filters.locations.map(building =>
          queryByLocation(building, input.filters)
        )
      );
      
      // Flatten and deduplicate results
      const allEvents = locationResults.flat();
      const uniqueEvents = deduplicateEvents(allEvents);
      
      // Score and sort
      const scoredEvents = scoreAndSortEvents(uniqueEvents, normalizedQuery, input.sort);
      
      // Paginate
      const paginatedResults = paginateResults(scoredEvents, limit, nextToken);
      
      // Calculate facets
      const facets = calculateFacets(uniqueEvents);
      
      return {
        items: paginatedResults.items,
        total: uniqueEvents.length,
        nextToken: paginatedResults.nextToken,
        facets,
      };
    }

    // Date range filters
    if (input.filters?.startDateAfter) {
      expressionAttributeNames['#startDateTime'] = 'startDateTime';
      filterExpressions.push('#startDateTime >= :startAfter');
      expressionAttributeValues[':startAfter'] = input.filters.startDateAfter;
    }

    if (input.filters?.startDateBefore) {
      expressionAttributeNames['#startDateTime'] = 'startDateTime';
      filterExpressions.push('#startDateTime <= :startBefore');
      expressionAttributeValues[':startBefore'] = input.filters.startDateBefore;
    }

    // Available seats filter
    if (input.filters?.hasAvailableSeats) {
      expressionAttributeNames['#availableSeats'] = 'availableSeats';
      filterExpressions.push('#availableSeats > :zero');
      expressionAttributeValues[':zero'] = 0;
    }

    // Tags filter
    if (input.filters?.tags && input.filters.tags.length > 0) {
      expressionAttributeNames['#tags'] = 'tags';
      const tagConditions = input.filters.tags.map((_, i) => `contains(#tags, :tag${i})`);
      filterExpressions.push(`(${tagConditions.join(' OR ')})`);
      input.filters.tags.forEach((tag, i) => {
        expressionAttributeValues[`:tag${i}`] = tag;
      });
    }

    // Execute scan
    const scanResult = await client.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: filterExpressions.join(' AND '),
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        Limit: limit * 2, // Fetch more to account for relevance filtering
        ExclusiveStartKey: nextToken ? JSON.parse(Buffer.from(nextToken, 'base64').toString()) : undefined,
      })
    );

    const events = (scanResult.Items || []) as Event[];

    // Score events by relevance
    const scoredEvents = scoreAndSortEvents(events, normalizedQuery, input.sort);

    // Take top results
    const topResults = scoredEvents.slice(0, limit);

    // Calculate facets from all results (for filter aggregations)
    const facets = calculateFacets(events);

    // Generate next token if more results available
    const nextTokenValue = scanResult.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(scanResult.LastEvaluatedKey)).toString('base64')
      : undefined;

    console.log('Search completed', {
      query: input.query,
      totalResults: events.length,
      returnedResults: topResults.length,
    });

    return {
      items: topResults,
      total: events.length,
      nextToken: nextTokenValue,
      facets,
    };
  } catch (error) {
    console.error('Error searching events:', error);
    throw error;
  }
}

/**
 * Query events by location using GSI3
 */
async function queryByLocation(
  building: string,
  filters?: any
): Promise<Event[]> {
  const expressionAttributeValues: Record<string, any> = {
    ':pk': `EVENT#LOCATION#${building}`,
  };

  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI3',
      KeyConditionExpression: 'GSI3PK = :pk',
      ExpressionAttributeValues: expressionAttributeValues,
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ...expressionAttributeValues,
        ':status': EventStatus.PUBLISHED,
      },
    })
  );

  return (result.Items || []) as Event[];
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
  const sortField = sort?.field || 'relevance';
  const sortOrder = sort?.order || 'desc';

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
 * Paginate results
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
