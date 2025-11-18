/**
 * Calendar View Page
 * Week 8 - Event Discovery via Calendar
 * Path: /events/calendar
 */

'use client';

import React, { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { View } from 'react-big-calendar';
import { Calendar, Filter } from 'lucide-react';
import { EventCalendar } from '@/components/events/EventCalendar';
import { FilterPanel } from '@/components/events/FilterPanel';
import { Button } from '@/components/ui/Button';
import { useCalendarEvents } from '@/hooks/events/useCalendarEvents';
import type { CalendarEvent, SearchFilters, FilterOption } from '@/types/search.types';

export default function CalendarPage() {
  const router = useRouter();
  const { events, loading, error, fetchEvents, currentMonth, setCurrentMonth } =
    useCalendarEvents();

  const [filters, setFilters] = React.useState<SearchFilters>({
    categories: [],
    locations: [],
    availability: 'ALL',
  });
  const [showFilters, setShowFilters] = React.useState(false);

  // Fetch events when month or filters change
  useEffect(() => {
    const query = {
      year: currentMonth.getFullYear(),
      month: currentMonth.getMonth() + 1, // JS months are 0-indexed
      view: 'month' as const,
      filters: {
        categories: filters.categories?.length ? filters.categories : undefined,
        locations: filters.locations?.length ? filters.locations : undefined,
      },
    };

    fetchEvents(query);
  }, [currentMonth, filters, fetchEvents]);

  const handleNavigate = useCallback(
    (date: Date, _view: View) => {
      setCurrentMonth(date);
    },
    [setCurrentMonth]
  );

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      router.push(`/events/${event.id}`);
    },
    [router]
  );

  const handleClearFilters = useCallback(() => {
    setFilters({
      categories: [],
      locations: [],
      availability: 'ALL',
    });
  }, []);

  // Mock filter options - in production, these would come from aggregations
  const categoryOptions: FilterOption[] = [
    { value: 'ACADEMIC', label: 'Academic', count: 12 },
    { value: 'SOCIAL', label: 'Social', count: 8 },
    { value: 'SPORTS', label: 'Sports', count: 5 },
    { value: 'CAREER', label: 'Career', count: 7 },
    { value: 'CULTURAL', label: 'Cultural', count: 6 },
  ];

  const locationOptions: FilterOption[] = [
    { value: 'Stamp Student Union', label: 'Stamp Student Union', count: 15 },
    { value: 'McKeldin Library', label: 'McKeldin Library', count: 10 },
    { value: 'Eppley Recreation Center', label: 'Eppley Recreation Center', count: 8 },
    { value: 'Xfinity Center', label: 'Xfinity Center', count: 5 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-red-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Event Calendar</h1>
                <p className="mt-1 text-sm text-gray-500">
                  View events in calendar format
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* Sidebar Filters */}
          {showFilters && (
            <aside className="w-80 flex-shrink-0">
              <FilterPanel
                filters={filters}
                onFiltersChange={setFilters}
                categoryOptions={categoryOptions}
                locationOptions={locationOptions}
                onClear={handleClearFilters}
              />
            </aside>
          )}

          {/* Calendar */}
          <main className="flex-1 min-w-0">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">Failed to load calendar</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            )}

            <EventCalendar
              events={events}
              onSelectEvent={handleSelectEvent}
              onNavigate={handleNavigate}
              loading={loading}
              height="calc(100vh - 300px)"
            />

            {/* Instructions */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                How to use the calendar
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Click on any event to view details</li>
                <li>• Use the navigation buttons to change months</li>
                <li>• Switch between month, week, day, and agenda views</li>
                <li>
                  • Color coding: <span className="text-blue-600 font-medium">Blue</span> =
                  Available, <span className="text-amber-600 font-medium">Amber</span> =
                  Low seats, <span className="text-red-600 font-medium">Red</span> = Full
                </li>
              </ul>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
