import { AppSyncResolverEvent, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import {
  CalendarEventsInput,
  CalendarEvent,
  Event,
} from '../../../shared/types/event.types';
import { EventStatus } from '../../../shared/types/common';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;

/**
 * Lambda handler for getCalendarEvents query
 * Retrieves events for calendar views with efficient date-range queries
 */
export async function handler(
  event: AppSyncResolverEvent<{ input: CalendarEventsInput }>,
  context: Context
): Promise<CalendarEvent[]> {
  console.log('GetCalendarEvents handler invoked', {
    requestId: context.awsRequestId,
    input: event.arguments.input,
  });

  try {
    const input = event.arguments.input;

    // Calculate date range based on view
    const dateRange = calculateDateRange(input.year, input.month, input.view);

    // Query GSI1 for date range
    const result = await client.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK BETWEEN :start AND :end',
        ExpressionAttributeValues: {
          ':pk': 'EVENT#DATE',
          ':start': dateRange.start,
          ':end': dateRange.end,
          ':status': EventStatus.PUBLISHED,
        },
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
      })
    );

    let events = (result.Items || []) as Event[];

    // Apply filters if provided
    if (input.filters) {
      events = applyFilters(events, input.filters);
    }

    // Transform to CalendarEvent format
    const calendarEvents = events.map(transformToCalendarEvent);

    console.log('Calendar events retrieved', {
      month: input.month,
      year: input.year,
      count: calendarEvents.length,
    });

    return calendarEvents;
  } catch (error) {
    console.error('Error getting calendar events:', error);
    throw error;
  }
}

/**
 * Calculate date range based on calendar view
 */
function calculateDateRange(
  year: number,
  month: number,
  view?: string
): { start: string; end: string } {
  const viewType = view || 'month';

  switch (viewType) {
    case 'month': {
      // Get first and last day of month
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0, 23, 59, 59);
      
      return {
        start: firstDay.toISOString(),
        end: lastDay.toISOString(),
      };
    }

    case 'week': {
      // Get first day of month's first week and last day of month's last week
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      
      // Extend to full weeks
      const weekStart = new Date(firstDay);
      weekStart.setDate(firstDay.getDate() - firstDay.getDay()); // Previous Sunday
      
      const weekEnd = new Date(lastDay);
      weekEnd.setDate(lastDay.getDate() + (6 - lastDay.getDay())); // Next Saturday
      weekEnd.setHours(23, 59, 59);
      
      return {
        start: weekStart.toISOString(),
        end: weekEnd.toISOString(),
      };
    }

    case 'day': {
      // Get all days in month
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0, 23, 59, 59);
      
      return {
        start: firstDay.toISOString(),
        end: lastDay.toISOString(),
      };
    }

    case 'agenda': {
      // Get next 30 days from start of month
      const firstDay = new Date(year, month - 1, 1);
      const endDay = new Date(firstDay);
      endDay.setDate(endDay.getDate() + 30);
      endDay.setHours(23, 59, 59);
      
      return {
        start: firstDay.toISOString(),
        end: endDay.toISOString(),
      };
    }

    default:
      throw new Error(`Invalid view type: ${viewType}`);
  }
}

/**
 * Apply category and location filters
 */
function applyFilters(
  events: Event[],
  filters: { categories?: string[]; locations?: string[] }
): Event[] {
  let filtered = events;

  // Category filter
  if (filters.categories && filters.categories.length > 0) {
    filtered = filtered.filter(event =>
      filters.categories!.includes(event.category)
    );
  }

  // Location filter
  if (filters.locations && filters.locations.length > 0) {
    filtered = filtered.filter(event =>
      filters.locations!.includes(event.location.building)
    );
  }

  return filtered;
}

/**
 * Transform Event to CalendarEvent (simplified view)
 */
function transformToCalendarEvent(event: Event): CalendarEvent {
  return {
    id: event.id,
    title: event.title,
    start: event.startDateTime,
    end: event.endDateTime,
    location: `${event.location.building}${event.location.room ? ' ' + event.location.room : ''}`,
    availableSeats: event.availableSeats || 0,
    category: event.category,
    status: event.status,
  };
}
