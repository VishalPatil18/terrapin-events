/**
 * Edit Event Page
 * Page for editing existing events
 * Path: /events/[id]/edit
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import { CreateEventForm } from '@/components/events/CreateEventForm';
import { CreateEventFormData, formatDateTimeForInput } from '@/lib/validations/event.validation';
import { useEvent } from '@/hooks/events/useEvents';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const { event, loading: isLoading, error } = useEvent(eventId);
  const isError = !!error;

  const handleSubmit = async (data: CreateEventFormData, isDraft: boolean) => {
    try {
      console.log('Updating event:', eventId, data, 'isDraft:', isDraft);
      
      // TODO: Call update event API
      // await updateEvent(eventId, data);
      
      // For now, just log and redirect
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      router.push(`/events/${eventId}`);
    } catch (error) {
      console.error('Failed to update event:', error);
      throw error;
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
            The event you're trying to edit doesn't exist or has been removed.
          </p>
          <Button onClick={() => router.push('/events')} variant="primary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  // Convert event data to form format
  const defaultValues: Partial<CreateEventFormData> = {
    title: event.title,
    description: event.description,
    category: event.category,
    startDateTime: formatDateTimeForInput(event.startDateTime),
    endDateTime: formatDateTimeForInput(event.endDateTime),
    location: {
      name: event.location.name,
      building: event.location.building,
      room: event.location.room || '',
      address: event.location.address,
      coordinates: event.location.coordinates,
    },
    capacity: event.capacity,
    tags: event.tags || [],
    imageUrl: event.imageUrl || '',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Event</h1>
          <p className="mt-2 text-gray-600">
            Update your event details below
          </p>
        </div>
        <CreateEventForm 
          onSubmit={handleSubmit} 
          defaultValues={defaultValues}
          isEdit={true}
        />
      </div>
    </div>
  );
}
