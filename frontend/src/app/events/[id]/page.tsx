/**
 * Event Detail Page
 * Displays full event information with registration
 * Path: /events/[id]
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { EventDetail } from '@/components/events/EventDetail';
import { EventActions } from '@/components/events/EventActions';
import { EventCard } from '@/components/events/EventCard';
import { Button } from '@/components/ui/Button';
import { useEvent } from '@/hooks/events/useEvents';
import { useEvents } from '@/hooks/events/useEvents';
// import { useAuth } from '@/hooks/useAuth'; // Uncomment when auth is ready

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  // Fetch single event
  const { event, loading: isLoading, error, refresh: refreshEvent } = useEvent(eventId);
  const isError = !!error;

  // Fetch related events (same category)
  const { events: allRelatedEvents } = useEvents(
    event ? { filter: { category: event.category } } : { autoFetch: false }
  );
  const relatedEvents = allRelatedEvents
    .filter((e) => e.id !== eventId)
    .slice(0, 3);

  // TODO: Get current user and check permissions
  // const { user } = useAuth();
  // const isOrganizer = user?.id === event?.organizerId;
  // const isAdmin = user?.role === 'ADMIN';
  
  // Placeholder values
  const isOrganizer = false;
  const isAdmin = false;

  const handleEdit = () => {
    router.push(`/events/${eventId}/edit`);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to cancel this event?')) return;
    
    try {
      // TODO: Call delete event API
      console.log('Deleting event:', eventId);
      router.push('/events');
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const handlePublish = async () => {
    try {
      // TODO: Call publish event API
      console.log('Publishing event:', eventId);
    } catch (error) {
      console.error('Failed to publish event:', error);
    }
  };

  const handleApprove = async () => {
    try {
      // TODO: Call approve event API (admin only)
      console.log('Approving event:', eventId);
    } catch (error) {
      console.error('Failed to approve event:', error);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      // TODO: Call reject event API (admin only)
      console.log('Rejecting event:', eventId, 'Reason:', reason);
    } catch (error) {
      console.error('Failed to reject event:', error);
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#A20B23] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (isError || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Event Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            {error instanceof Error ? error.message : 'The event you\'re looking for doesn\'t exist or has been removed.'}
          </p>
          <Button onClick={() => router.push('/events')} variant="primary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content - 3 columns */}
          <div className="lg:col-span-3">
            <EventDetail event={event} onEventUpdate={refreshEvent} />
          </div>

          {/* Sidebar - 1 column */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              {/* Actions for organizers/admins */}
              {(isOrganizer || isAdmin) && (
                <EventActions
                  event={event}
                  isOrganizer={isOrganizer}
                  isAdmin={isAdmin}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onPublish={handlePublish}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              )}
            </div>
          </div>
        </div>

        {/* Related Events */}
        {relatedEvents.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Other events you may like
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedEvents.map((relatedEvent) => (
                <EventCard key={relatedEvent.id} event={relatedEvent} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
