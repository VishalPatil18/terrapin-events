/**
 * Dashboard Events Page (Stub)
 * TEMS - Terrapin Events Management System
 * 
 * Placeholder for Week 3-4 implementation
 */

'use client';

import { Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function DashboardEventsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Events</h1>
          <p className="mt-2 text-gray-600">
            Manage your events and registrations
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      </div>

      {/* Coming Soon Message */}
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Calendar className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Events Management Coming Soon
        </h2>
        <p className="text-gray-600 max-w-md mx-auto">
          This feature will be available in Week 3-4 implementation. You'll be able to
          create, manage, and track all your events from here.
        </p>
      </div>
    </div>
  );
}
