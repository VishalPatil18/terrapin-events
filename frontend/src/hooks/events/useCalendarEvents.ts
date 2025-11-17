/**
 * Calendar Events Hook
 * Week 8 - Calendar View Integration
 */

'use client';

import { useState, useCallback } from 'react';
import type { CalendarEvent, CalendarEventsQuery } from '@/types/search.types';
import { getCalendarEvents as getCalendarEventsAPI } from '@/lib/api/search.api';

interface UseCalendarEventsReturn {
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;
  fetchEvents: (query: CalendarEventsQuery) => Promise<void>;
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
}

export function useCalendarEvents(): UseCalendarEventsReturn {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fetchEvents = useCallback(async (query: CalendarEventsQuery) => {
    setLoading(true);
    setError(null);

    try {
      const result = await getCalendarEventsAPI(query);
      
      // Transform to Calendar format
      const calendarEvents: CalendarEvent[] = result.map((event) => ({
        id: event.eventId,
        title: event.title,
        start: new Date(event.startDateTime),
        end: new Date(event.endDateTime),
        resource: {
          eventId: event.eventId,
          location: event.location,
          availableSeats: event.availableSeats,
          category: event.category,
          status: event.status,
        },
      }));

      setEvents(calendarEvents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch calendar events');
      console.error('Calendar events error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    events,
    loading,
    error,
    fetchEvents,
    currentMonth,
    setCurrentMonth,
  };
}
