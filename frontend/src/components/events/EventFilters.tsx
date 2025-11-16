/**
 * EventFilters Component
 * Filter and search controls for event listings
 */

import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { EventCategory, EventFilter } from '@/types/event.types';

export interface EventFiltersProps {
  onFilterChange: (filters: EventFilter) => void;
  onSearchChange: (search: string) => void;
  className?: string;
}

export function EventFilters({
  onFilterChange,
  onSearchChange,
  className = '',
}: EventFiltersProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onSearchChange(value);
  };

  const handleCategoryChange = (category: EventCategory | '') => {
    setSelectedCategory(category);
    onFilterChange({
      category: category || undefined,
      startDateAfter: startDate || undefined,
      startDateBefore: endDate || undefined,
    });
  };

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    onFilterChange({
      category: selectedCategory || undefined,
      startDateAfter: start || undefined,
      startDateBefore: end || undefined,
    });
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setStartDate('');
    setEndDate('');
    setShowAdvanced(false);
    onSearchChange('');
    onFilterChange({});
  };

  const hasActiveFilters = selectedCategory || startDate || endDate || search;

  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search events by title..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A20B23] focus:border-transparent outline-none transition-all"
        />
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-3 mb-3">
        <select
          value={selectedCategory}
          onChange={(e) => handleCategoryChange(e.target.value as EventCategory | '')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A20B23] focus:border-transparent outline-none"
        >
          <option value="">All Categories</option>
          <option value={EventCategory.ACADEMIC}>Academic</option>
          <option value={EventCategory.SOCIAL}>Social</option>
          <option value={EventCategory.SPORTS}>Sports</option>
          <option value={EventCategory.ARTS}>Arts & Culture</option>
          <option value={EventCategory.TECH}>Technology</option>
          <option value={EventCategory.CAREER}>Career</option>
          <option value={EventCategory.OTHER}>Other</option>
        </select>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">
            {showAdvanced ? 'Hide Filters' : 'More Filters'}
          </span>
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 px-4 py-2 text-[#A20B23] hover:bg-red-50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            <span className="text-sm font-medium">Clear All</span>
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="pt-4 border-t border-gray-200 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date From
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleDateChange(e.target.value, endDate)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A20B23] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date To
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleDateChange(startDate, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A20B23] focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {search && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm">
                Search: {search}
              </span>
            )}
            {selectedCategory && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm">
                Category: {selectedCategory}
              </span>
            )}
            {startDate && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm">
                From: {new Date(startDate).toLocaleDateString()}
              </span>
            )}
            {endDate && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm">
                To: {new Date(endDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
