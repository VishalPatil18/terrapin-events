/**
 * Event Calendar Component
 * Week 8 - React Big Calendar Integration
 */

'use client';

import React, { useCallback, useState } from 'react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import type { CalendarEvent } from '@/types/search.types';
import './calendar.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

interface EventCalendarProps {
  events: CalendarEvent[];
  onSelectEvent?: (event: CalendarEvent) => void;
  onNavigate?: (date: Date, view: View) => void;
  loading?: boolean;
  height?: number | string;
}

export function EventCalendar({
  events,
  onSelectEvent,
  onNavigate,
  loading = false,
  height = 600,
}: EventCalendarProps) {
  const [view, setView] = useState<View>('month');

  /**
   * Custom event styling based on availability
   */
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const seats = event.resource?.availableSeats || 0;
    
    // Color coding:
    // Red: No seats available
    // Amber: Low availability (<10 seats)
    // Blue: Available
    const backgroundColor =
      seats === 0
        ? '#ef4444' // red-500
        : seats < 10
        ? '#f59e0b' // amber-500
        : '#3b82f6'; // blue-500

    return {
      style: {
        backgroundColor,
        borderRadius: '8px',
        opacity: 0.9,
        color: 'white',
        border: '0',
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: '500',
        padding: '4px 8px',
      },
    };
  }, []);

  /**
   * Custom toolbar component
   */
  const CustomToolbar = (toolbar: {
    date: Date;
    view: View;
    onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
    onView: (view: View) => void;
  }) => {
    const goToBack = () => {
      toolbar.onNavigate('PREV');
    };

    const goToNext = () => {
      toolbar.onNavigate('NEXT');
    };

    const goToToday = () => {
      toolbar.onNavigate('TODAY');
    };

    const label = () => {
      const date = moment(toolbar.date);
      return (
        <span className="text-lg font-semibold text-gray-900">
          {date.format('MMMM YYYY')}
        </span>
      );
    };

    return (
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={goToBack}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Previous
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Today
          </button>
          <button
            onClick={goToNext}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Next
          </button>
        </div>

        <div>{label()}</div>

        <div className="flex items-center gap-2">
          {(['month', 'week', 'day', 'agenda'] as View[]).map((viewName) => (
            <button
              key={viewName}
              onClick={() => toolbar.onView(viewName)}
              className={`px-3 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                toolbar.view === viewName
                  ? 'bg-red-600 text-white'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {viewName.charAt(0).toUpperCase() + viewName.slice(1)}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const handleNavigate = useCallback(
    (date: Date, newView: View) => {
      onNavigate?.(date, newView);
    },
    [onNavigate]
  );

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      onSelectEvent?.(event);
    },
    [onSelectEvent]
  );

  if (loading) {
    return (
      <div
        className="flex items-center justify-center bg-white rounded-lg shadow-md"
        style={{ height }}
      >
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-red-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6" style={{ height }}>
      <Calendar
        localizer={localizer}
        events={events}
        view={view}
        onView={setView}
        onNavigate={handleNavigate}
        onSelectEvent={handleSelectEvent}
        eventPropGetter={eventStyleGetter}
        components={{
          toolbar: CustomToolbar,
        }}
        style={{ height: '100%' }}
        popup
        selectable
        tooltipAccessor={(event: CalendarEvent) => {
          const seats = event.resource?.availableSeats || 0;
          return `${event.title}\n${event.resource?.location}\n${seats} seats available`;
        }}
      />

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500"></div>
          <span className="text-sm text-gray-600">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-500"></div>
          <span className="text-sm text-gray-600">Low Availability</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500"></div>
          <span className="text-sm text-gray-600">Full</span>
        </div>
      </div>
    </div>
  );
}
