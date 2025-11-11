/**
 * useEvents Hook
 * Custom React hook for event operations
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  publishEvent,
  searchEvents,
} from '@/lib/api/events.api';
import type {
  Event,
  EventFilter,
  CreateEventInput,
  UpdateEventInput,
} from '@/types/event.types';

interface UseEventsOptions {
  filter?: EventFilter;
  limit?: number;
  autoFetch?: boolean;
}

interface UseEventsReturn {
  events: Event[];
  loading: boolean;
  error: Error | null;
  nextToken: string | null;
  hasMore: boolean;
  fetchEvents: () => Promise<void>;
  fetchMore: () => Promise<void>;
  refresh: () => Promise<void>;
  createNewEvent: (input: CreateEventInput) => Promise<Event>;
  updateExistingEvent: (id: string, input: UpdateEventInput) => Promise<Event>;
  deleteExistingEvent: (id: string) => Promise<void>;
  publishExistingEvent: (id: string) => Promise<Event>;
  searchForEvents: (query: string) => Promise<Event[]>;
}

export function useEvents(options: UseEventsOptions = {}): UseEventsReturn {
  const {
    filter,
    limit = 20,
    autoFetch = true,
  } = options;

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await listEvents(filter, limit);
      setEvents(result.items);
      setNextToken(result.nextToken);
      setHasMore(!!result.nextToken);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch events'));
    } finally {
      setLoading(false);
    }
  }, [filter, limit]);

  const fetchMore = useCallback(async () => {
    if (!nextToken || loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await listEvents(filter, limit, nextToken);
      setEvents((prev) => [...prev, ...result.items]);
      setNextToken(result.nextToken);
      setHasMore(!!result.nextToken);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch more events'));
    } finally {
      setLoading(false);
    }
  }, [filter, limit, nextToken, loading]);

  const refresh = useCallback(async () => {
    setNextToken(null);
    await fetchEvents();
  }, [fetchEvents]);

  const createNewEvent = useCallback(async (input: CreateEventInput): Promise<Event> => {
    try {
      const newEvent = await createEvent(input);
      setEvents((prev) => [newEvent, ...prev]);
      return newEvent;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create event');
      setError(error);
      throw error;
    }
  }, []);

  const updateExistingEvent = useCallback(
    async (id: string, input: UpdateEventInput): Promise<Event> => {
      try {
        const updatedEvent = await updateEvent(id, input);
        setEvents((prev) =>
          prev.map((event) => (event.id === id ? updatedEvent : event))
        );
        return updatedEvent;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update event');
        setError(error);
        throw error;
      }
    },
    []
  );

  const deleteExistingEvent = useCallback(async (id: string): Promise<void> => {
    try {
      await deleteEvent(id);
      setEvents((prev) => prev.filter((event) => event.id !== id));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete event');
      setError(error);
      throw error;
    }
  }, []);

  const publishExistingEvent = useCallback(async (id: string): Promise<Event> => {
    try {
      const publishedEvent = await publishEvent(id);
      setEvents((prev) =>
        prev.map((event) => (event.id === id ? publishedEvent : event))
      );
      return publishedEvent;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to publish event');
      setError(error);
      throw error;
    }
  }, []);

  const searchForEvents = useCallback(async (query: string): Promise<Event[]> => {
    setLoading(true);
    setError(null);

    try {
      const results = await searchEvents(query);
      return results;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to search events');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchEvents();
    }
  }, [autoFetch, fetchEvents]);

  return {
    events,
    loading,
    error,
    nextToken,
    hasMore,
    fetchEvents,
    fetchMore,
    refresh,
    createNewEvent,
    updateExistingEvent,
    deleteExistingEvent,
    publishExistingEvent,
    searchForEvents,
  };
}

/**
 * useEvent Hook
 * Custom hook for single event operations
 */
export function useEvent(eventId: string | null) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchEvent = useCallback(async () => {
    if (!eventId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await getEvent(eventId);
      setEvent(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch event'));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  return {
    event,
    loading,
    error,
    refresh: fetchEvent,
  };
}
