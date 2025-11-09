/**
 * Dashboard Messages Page (Stub)
 * TEMS - Terrapin Events Management System
 * 
 * Placeholder for future messaging implementation
 */

'use client';

import { MessageSquare } from 'lucide-react';

export default function DashboardMessagesPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
        <p className="mt-2 text-gray-600">
          Communicate with attendees and organizers
        </p>
      </div>

      {/* Coming Soon Message */}
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <MessageSquare className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Messaging Feature Coming Soon
        </h2>
        <p className="text-gray-600 max-w-md mx-auto">
          This feature will be available in a future release. You'll be able to
          send and receive messages, create announcement broadcasts, and manage
          event-related communications.
        </p>
      </div>
    </div>
  );
}
