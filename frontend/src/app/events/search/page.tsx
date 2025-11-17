/**
 * Advanced Search Page
 * Week 8 - Event Discovery with Advanced Filters
 * Path: /events/search
 */

'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, SlidersHorizontal, Calendar as CalendarIcon, X } from 'lucide-react';
import Link from 'next/link';
import { SearchBar } from '@/components/events/SearchBar';
import { FilterPanel } from '@/components/events/FilterPanel';
import { EventCard } from '@/components/events/EventCard';
import { DateRangePicker } from '@/components/events/DateRangePicker';
import { Button } from '@/components/ui/Button';
import { useEventSearch } from '@/hooks/events/useEventSearch';
import type { FilterOption } from '@/types/search.types';

export default function SearchPage() {
  const router = useRouter();
  const {
    query,
    setQuery,
    filters,
    setFilters,
    dateRange,
    setDateRange,
    results,
    loading,
    error,
    clearFilters,
  } = useEventSearch();

  const [showFilters, setShowFilters] = React.useState(true);

  const handleEventClick = useCallback(
    (eventId: string) => {
      router.push(`/events/${eventId}`);
    },
    [router]
  );

  // Extract filter options from aggregations
  const categoryOptions: FilterOption[] = React.useMemo(() => {
    if (!results?.aggregations?.categories) {
      return [
        { value: 'ACADEMIC', label: 'Academic' },
        { value: 'SOCIAL', label: 'Social' },
        { value: 'SPORTS', label: 'Sports' },
        { value: 'CAREER', label: 'Career' },
        { value: 'CULTURAL', label: 'Cultural' },
      ];
    }
    return results.aggregations.categories.map((cat) => ({
      value: cat.key,
      label: cat.key,
      count: cat.count,
    }));
  }, [results]);

  const locationOptions: FilterOption[] = React.useMemo(() => {
    if (!results?.aggregations?.locations) {
      return [
        { value: 'Stamp Student Union', label: 'Stamp Student Union' },
        { value: 'McKeldin Library', label: 'McKeldin Library' },
        { value: 'Eppley Recreation Center', label: 'Eppley Recreation Center' },
      ];
    }
    return results.aggregations.locations.map((loc) => ({
      value: loc.key,
      label: loc.key,
      count: loc.count,
    }));
  }, [results]);

  const hasActiveFilters =
    (filters.categories?.length ?? 0) > 0 ||
    (filters.locations?.length ?? 0) > 0 ||
    filters.availability !== 'ALL' ||
    !!dateRange;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3 mb-6">
            <Search className="w-8 h-8 text-red-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Search Events</h1>
              <p className="mt-1 text-sm text-gray-500">
                Find events with advanced search and filters
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="max-w-3xl">
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Search by title, description, organizer..."
              loading={loading}
            />
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>

            <Link href="/events/calendar">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Calendar View
              </Button>
            </Link>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-2 text-red-600"
              >
                <X className="w-4 h-4" />
                Clear All Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* Sidebar Filters */}
          {showFilters && (
            <aside className="w-80 flex-shrink-0 space-y-6">
              {/* Date Range Filter */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Date Range</h3>
                <DateRangePicker
                  startDate={dateRange?.start ? new Date(dateRange.start) : undefined}
                  endDate={dateRange?.end ? new Date(dateRange.end) : undefined}
                  onChange={(start, end) => {
                    if (start && end) {
                      setDateRange({
                        start: start.toISOString(),
                        end: end.toISOString(),
                      });
                    } else {
                      setDateRange(undefined);
                    }
                  }}
                />
              </div>

              {/* Category and Location Filters */}
              <FilterPanel
                filters={filters}
                onFiltersChange={setFilters}
                categoryOptions={categoryOptions}
                locationOptions={locationOptions}
                onClear={clearFilters}
              />
            </aside>
          )}

          {/* Search Results */}
          <main className="flex-1 min-w-0">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-gray-600">
                  {loading ? (
                    'Searching...'
                  ) : results ? (
                    <>
                      <span className="font-semibold text-gray-900">{results.total}</span>{' '}
                      {results.total === 1 ? 'event' : 'events'} found
                      {results.took > 0 && (
                        <span className="ml-2 text-gray-500">
                          ({results.took}ms)
                        </span>
                      )}
                    </>
                  ) : (
                    'Enter a search query or adjust filters'
                  )}
                </p>
              </div>
            </div>

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-6">
                <p className="text-red-800 font-medium">Search failed</p>
                <p className="text-red-600 text-sm mt-2">{error}</p>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && results && results.items.length === 0 && (
              <div className="bg-white rounded-lg p-12 text-center">
                <div className="max-w-md mx-auto">
                  <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No events found
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Try adjusting your search query or filters to find more events
                  </p>
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}

            {/* Results Grid */}
            {!loading && !error && results && results.items.length > 0 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.items.map((event) => (
                    <div key={event.eventId} onClick={() => handleEventClick(event.eventId)}>
                      <EventCard
                        event={{
                          id: event.eventId,
                          title: event.title,
                          description: event.description,
                          startDateTime: event.startDateTime,
                          endDateTime: event.endDateTime,
                          location: {
                            building: event.location,
                            room: event.room,
                          },
                          category: event.category,
                          capacity: event.totalCapacity,
                          registeredCount: event.totalCapacity - event.availableSeats,
                          status: event.status as any,
                          imageUrl: event.imageUrl,
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Load More */}
                {results.nextToken && (
                  <div className="text-center pt-6">
                    <Button variant="outline" size="lg">
                      Load More Events
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Search Tips */}
            {!loading && !results && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-sm font-medium text-blue-900 mb-3">Search Tips</h3>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li>• Use specific keywords like "robotics workshop" or "career fair"</li>
                  <li>• Filter by category to narrow down results</li>
                  <li>• Use date range to find events in specific time periods</li>
                  <li>• Check availability filter to see only events with open seats</li>
                </ul>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
