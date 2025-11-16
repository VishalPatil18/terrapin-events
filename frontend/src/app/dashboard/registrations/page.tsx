/**
 * My Registrations Dashboard Page
 * TEMS - Terrapin Events Management System
 * 
 * Displays user's event registrations organized by status
 * with statistics and management capabilities.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RegistrationStatus } from '@/types/registration.types';
import { useRegistrations, useRegistrationStats } from '@/hooks/registrations/useRegistrations';
import { RegistrationCard } from '@/components/registrations/RegistrationCard';

type TabType = 'upcoming' | 'waitlist' | 'past';

export default function MyRegistrationsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const { stats, isLoading: statsLoading } = useRegistrationStats();
  
  // Fetch registrations based on active tab
  const upcomingQuery = useRegistrations(RegistrationStatus.REGISTERED);
  const waitlistQuery = useRegistrations(RegistrationStatus.WAITLISTED);
  const pastQuery = useRegistrations();

  /**
   * Get current query based on active tab
   */
  const getCurrentQuery = () => {
    switch (activeTab) {
      case 'upcoming':
        return upcomingQuery;
      case 'waitlist':
        return waitlistQuery;
      case 'past':
        return pastQuery;
      default:
        return upcomingQuery;
    }
  };

  const currentQuery = getCurrentQuery();
  
  /**
   * Filter registrations based on tab
   */
  const getFilteredRegistrations = () => {
    if (activeTab === 'past') {
      // Show only past events (ATTENDED, NO_SHOW, CANCELLED)
      return currentQuery.registrations.filter(reg =>
        [RegistrationStatus.ATTENDED, RegistrationStatus.NO_SHOW, RegistrationStatus.CANCELLED].includes(reg.status)
      );
    }
    
    // For upcoming and waitlist, show as-is
    return currentQuery.registrations;
  };

  const filteredRegistrations = getFilteredRegistrations();

  /**
   * Refresh all queries
   */
  const handleUpdate = () => {
    upcomingQuery.refresh();
    waitlistQuery.refresh();
    pastQuery.refresh();
  };

  /**
   * Tab configuration
   */
  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: 'upcoming', label: 'Upcoming', count: stats?.upcomingEvents || 0 },
    { id: 'waitlist', label: 'Waitlist', count: stats?.waitlistedEvents || 0 },
    { id: 'past', label: 'Past', count: (stats?.attendedEvents || 0) + (stats?.cancelledEvents || 0) },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">
            My Registrations
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your event registrations and view your check-in codes
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Registrations */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Events</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">
                  {statsLoading ? '...' : stats?.totalRegistrations || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Upcoming */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">
                  {statsLoading ? '...' : stats?.upcomingEvents || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Waitlisted */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Waitlisted</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">
                  {statsLoading ? '...' : stats?.waitlistedEvents || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Attended */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Attended</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">
                  {statsLoading ? '...' : stats?.attendedEvents || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200">
          {/* Tab Headers */}
          <div className="border-b border-gray-200">
            <div className="flex space-x-8 px-6" role="tablist">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                >
                  {tab.label}
                  <span className={`
                    ml-2 py-0.5 px-2 rounded-full text-xs font-semibold
                    ${activeTab === tab.id
                      ? 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Loading State */}
            {currentQuery.isLoading && (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="h-48 bg-gray-200 rounded-lg"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {currentQuery.error && (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Failed to Load Registrations
                </h3>
                <p className="text-gray-600 mb-4">
                  {currentQuery.error}
                </p>
                <button
                  onClick={() => currentQuery.refresh()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Empty State */}
            {!currentQuery.isLoading && !currentQuery.error && filteredRegistrations.length === 0 && (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {activeTab === 'upcoming' && 'No Upcoming Events'}
                  {activeTab === 'waitlist' && 'No Waitlisted Events'}
                  {activeTab === 'past' && 'No Past Events'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {activeTab === 'upcoming' && 'You haven\'t registered for any upcoming events yet.'}
                  {activeTab === 'waitlist' && 'You\'re not on any waitlists.'}
                  {activeTab === 'past' && 'You haven\'t attended any events yet.'}
                </p>
                <Link
                  href="/events"
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Browse Events
                </Link>
              </div>
            )}

            {/* Registrations List */}
            {!currentQuery.isLoading && !currentQuery.error && filteredRegistrations.length > 0 && (
              <div className="space-y-4">
                {filteredRegistrations.map(registration => (
                  <RegistrationCard
                    key={registration.id}
                    registration={registration}
                    onUpdate={handleUpdate}
                  />
                ))}

                {/* Load More */}
                {currentQuery.hasMore && (
                  <div className="text-center pt-4">
                    <button
                      onClick={currentQuery.loadMore}
                      disabled={currentQuery.isLoading}
                      className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      {currentQuery.isLoading ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
