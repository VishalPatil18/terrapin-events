/**
 * Search Events Hook
 * Week 8 - Event Discovery with Debounced Search
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import type {
  SearchQuery,
  SearchResult,
  SearchFilters,
  DateRangeFilter,
} from '@/types/search.types';
import { searchEvents as searchEventsAPI } from '@/lib/api/search.api';

interface UseEventSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  dateRange?: DateRangeFilter;
  setDateRange: (range?: DateRangeFilter) => void;
  results: SearchResult | null;
  loading: boolean;
  error: string | null;
  executeSearch: () => Promise<void>;
  clearFilters: () => void;
}

const DEFAULT_FILTERS: SearchFilters = {
  categories: [],
  locations: [],
  availability: 'ALL',
};

export function useEventSearch(): UseEventSearchReturn {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [dateRange, setDateRange] = useState<DateRangeFilter | undefined>();
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce query input (300ms delay)
  const [debouncedQuery] = useDebounce(query, 300);

  const executeSearch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const searchQuery: SearchQuery = {
        query: debouncedQuery || undefined,
        filters: {
          ...filters,
          categories: filters.categories?.length ? filters.categories : undefined,
          locations: filters.locations?.length ? filters.locations : undefined,
        },
        dateRange,
        sort: {
          field: 'startDateTime',
          order: 'asc',
        },
        pagination: {
          limit: 20,
        },
      };

      const result = await searchEventsAPI(searchQuery);
      setResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, filters, dateRange]);

  // Auto-execute search when debounced query or filters change
  useEffect(() => {
    executeSearch();
  }, [executeSearch]);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setDateRange(undefined);
    setQuery('');
  }, []);

  return {
    query,
    setQuery,
    filters,
    setFilters,
    dateRange,
    setDateRange,
    results,
    loading,
    error,
    executeSearch,
    clearFilters,
  };
}
