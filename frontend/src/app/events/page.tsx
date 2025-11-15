/**
 * Events List Page
 * Main page for browsing and searching events
 * Path: /events
 */

'use client';

import { useState } from 'react';
import { LayoutGrid, List, Plus } from 'lucide-react';
import Link from 'next/link';
import { EventCard } from '@/components/events/EventCard';
import { EventFilters } from '@/components/events/EventFilters';
import { Button } from '@/components/ui/Button';
import { useEvents } from '@/hooks/events/useEvents';
import { EventFilter } from '@/types/event.types';

type ViewMode = 'grid' | 'list';

export default function EventsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filters, setFilters] = useState<EventFilter>({});
  const [search, setSearch] = useState('');

  const {
    events: allEvents,
    loading: isLoading,
    error,
    hasMore: hasNextPage,
    fetchMore,
  } = useEvents({ filter: filters });

  const isError = !!error;
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  const fetchNextPage = async () => {
    setIsFetchingNextPage(true);
    await fetchMore();
    setIsFetchingNextPage(false);
  };

  // Filter events by search term
  const filteredEvents = search
    ? allEvents.filter((event) =>
        event.title.toLowerCase().includes(search.toLowerCase()) ||
        event.description.toLowerCase().includes(search.toLowerCase())
      )
    : allEvents;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Discover Events
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Find and register for upcoming campus events
              </p>
            </div>
            <Link href="/events/new">
              <Button variant="primary" className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create Event
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <EventFilters
          onFilterChange={setFilters}
          onSearchChange={setSearch}
          className="mb-6"
        />

        {/* View Toggle & Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-600">
            {filteredEvents.length}{' '}
            {filteredEvents.length === 1 ? 'event' : 'events'} found
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[#A20B23] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#A20B23] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="List view"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A20B23]"></div>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium">Failed to load events</p>
            <p className="text-red-600 text-sm mt-2">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && filteredEvents.length === 0 && (
          <div className="bg-white rounded-lg p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No events found
              </h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your filters or search criteria
              </p>
              <Link href="/events/new">
                <Button variant="primary">Create an Event</Button>
              </Link>
            </div>
          </div>
        )}

        {/* Events Grid/List */}
        {!isLoading && !isError && filteredEvents.length > 0 && (
          <>
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                  : 'space-y-4'
              }
            >
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  className={viewMode === 'list' ? 'flex' : ''}
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasNextPage && (
              <div className="mt-8 text-center">
                <Button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  variant="outline"
                  size="lg"
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load More Events'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
