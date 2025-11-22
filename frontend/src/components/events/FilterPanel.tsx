/**
 * Filter Panel Component
 * Week 8 - Advanced Filtering with Chips
 */

'use client';

import React, { useCallback } from 'react';
import { X, Filter } from 'lucide-react';
import type { SearchFilters, FilterOption } from '@/types/search.types';

interface FilterPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  categoryOptions: FilterOption[];
  locationOptions: FilterOption[];
  onClear?: () => void;
}

export function FilterPanel({
  filters,
  onFiltersChange,
  categoryOptions,
  locationOptions,
  onClear,
}: FilterPanelProps) {
  const handleCategoryToggle = useCallback(
    (category: string) => {
      const currentCategories = filters.categories || [];
      const newCategories = currentCategories.includes(category)
        ? currentCategories.filter((c) => c !== category)
        : [...currentCategories, category];

      onFiltersChange({
        ...filters,
        categories: newCategories,
      });
    },
    [filters, onFiltersChange]
  );

  const handleLocationToggle = useCallback(
    (location: string) => {
      const currentLocations = filters.locations || [];
      const newLocations = currentLocations.includes(location)
        ? currentLocations.filter((l) => l !== location)
        : [...currentLocations, location];

      onFiltersChange({
        ...filters,
        locations: newLocations,
      });
    },
    [filters, onFiltersChange]
  );

  const handleAvailabilityChange = useCallback(
    (availability: 'ALL' | 'AVAILABLE' | 'WAITLIST') => {
      onFiltersChange({
        ...filters,
        availability,
      });
    },
    [filters, onFiltersChange]
  );

  const activeFilterCount =
    (filters.categories?.length || 0) +
    (filters.locations?.length || 0) +
    (filters.availability !== 'ALL' ? 1 : 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          {activeFilterCount > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        
        {activeFilterCount > 0 && (
          <button
            onClick={onClear}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Categories */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Categories
        </label>
        <div className="flex flex-wrap gap-2">
          {categoryOptions.map((option) => {
            const isSelected = filters.categories?.includes(option.value);
            return (
              <button
                key={option.value}
                onClick={() => handleCategoryToggle(option.value)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
                {option.count !== undefined && (
                  <span
                    className={`text-xs ${
                      isSelected ? 'text-red-200' : 'text-gray-500'
                    }`}
                  >
                    ({option.count})
                  </span>
                )}
                {isSelected && <X className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Locations */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Locations
        </label>
        <div className="flex flex-wrap gap-2">
          {locationOptions.map((option) => {
            const isSelected = filters.locations?.includes(option.value);
            return (
              <button
                key={option.value}
                onClick={() => handleLocationToggle(option.value)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
                {option.count !== undefined && (
                  <span
                    className={`text-xs ${
                      isSelected ? 'text-red-200' : 'text-gray-500'
                    }`}
                  >
                    ({option.count})
                  </span>
                )}
                {isSelected && <X className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Availability */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Availability
        </label>
        <div className="space-y-2">
          {[
            { value: 'ALL' as const, label: 'All Events' },
            { value: 'AVAILABLE' as const, label: 'Available Seats' },
            { value: 'WAITLIST' as const, label: 'Waitlist Only' },
          ].map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="radio"
                checked={filters.availability === option.value}
                onChange={() => handleAvailabilityChange(option.value)}
                className="h-4 w-4 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
