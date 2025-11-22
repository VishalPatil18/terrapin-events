/**
 * Search Bar Component
 * Week 8 - Debounced Search Input with Autocomplete
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  suggestions?: string[];
  loading?: boolean;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search events...',
  onSubmit,
  suggestions = [],
  loading = false,
}: SearchBarProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      setShowSuggestions(e.target.value.length > 0);
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    onChange('');
    setShowSuggestions(false);
  }, [onChange]);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      onChange(suggestion);
      setShowSuggestions(false);
      onSubmit?.();
    },
    [onChange, onSubmit]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setShowSuggestions(false);
      onSubmit?.();
    },
    [onSubmit]
  );

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 h-5 w-5 text-gray-400" />
          
          <input
            type="text"
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            className="w-full pl-12 pr-12 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            onFocus={() => value && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />

          {loading && (
            <div className="absolute right-12 flex items-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-600 border-r-transparent"></div>
            </div>
          )}

          {value && !loading && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Clear search"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Autocomplete Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">{suggestion}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}
