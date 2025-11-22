/**
 * Date Range Picker Component
 * Week 8 - Date Filtering for Events
 */

'use client';

import React, { useCallback } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface DateRangePickerProps {
  startDate?: Date;
  endDate?: Date;
  onChange: (start: Date | undefined, end: Date | undefined) => void;
}

export function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const handleStartChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const date = e.target.value ? new Date(e.target.value) : undefined;
      onChange(date, endDate);
    },
    [endDate, onChange]
  );

  const handleEndChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const date = e.target.value ? new Date(e.target.value) : undefined;
      onChange(startDate, date);
    },
    [startDate, onChange]
  );

  const handleClear = useCallback(() => {
    onChange(undefined, undefined);
  }, [onChange]);

  const handleQuickSelect = useCallback(
    (days: number) => {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + days);
      onChange(start, end);
    },
    [onChange]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-gray-600" />
          <h4 className="text-sm font-semibold text-gray-900">Date Range</h4>
        </div>
        
        {(startDate || endDate) && (
          <button
            onClick={handleClear}
            className="text-xs text-red-600 hover:text-red-700 font-medium"
          >
            Clear
          </button>
        )}
      </div>

      {/* Quick Select Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleQuickSelect(7)}
          className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
        >
          Next 7 days
        </button>
        <button
          type="button"
          onClick={() => handleQuickSelect(30)}
          className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
        >
          Next 30 days
        </button>
        <button
          type="button"
          onClick={() => handleQuickSelect(90)}
          className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
        >
          Next 3 months
        </button>
      </div>

      {/* Date Inputs */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
            onChange={handleStartChange}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
            onChange={handleEndChange}
            min={startDate ? format(startDate, 'yyyy-MM-dd') : undefined}
            disabled={!startDate}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Selected Range Display */}
      {startDate && endDate && (
        <div className="p-2 bg-gray-50 rounded text-xs text-gray-600">
          <span className="font-medium">Selected:</span>{' '}
          {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}
        </div>
      )}
    </div>
  );
}
